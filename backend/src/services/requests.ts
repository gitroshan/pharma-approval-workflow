/**
 * Request service — the application-level orchestration for approval requests.
 *
 * This is where the pure domain rules (workflow + RBAC), persistence (Prisma),
 * the audit trail, and the external integrations come together. Each state
 * change and its audit record are written in a single database transaction, so
 * the trail can never drift out of sync with the data it describes.
 *
 * The domain layer keeps its own enums (so it stays framework-agnostic and
 * unit-testable without a database). Those enums share identical string values
 * with the Prisma-generated enums; the two tiny helpers below convert between
 * them explicitly at the persistence boundary.
 */
import { RequestStatus as DbStatus } from '@prisma/client';
import { prisma } from '../db';
import { RequestStatus, WorkflowAction } from '../domain/types';
import type { ActorContext } from '../domain/types';
import { Permission, can, canReadRequest } from '../domain/rbac';
import { availableActions, evaluateTransition } from '../domain/workflow';
import { BadRequest, Forbidden, NotFound } from '../errors';
import { recordAudit } from './audit';
import { httpIntegrations } from './integrations/http';
import type { Integrations } from './integrations';

const toDb = (s: RequestStatus): DbStatus => s as unknown as DbStatus;
const toDomain = (s: DbStatus): RequestStatus => s as unknown as RequestStatus;

export interface CreateRequestInput {
  title: string;
  description: string;
  category: string;
  dmsDocumentId?: string;
}

const integrations: Integrations = httpIntegrations;

export async function createRequest(
  actor: ActorContext & { email: string },
  input: CreateRequestInput,
) {
  // If a source document is referenced, confirm it exists in the DMS.
  if (input.dmsDocumentId) {
    const doc = await integrations.dms.getDocument(input.dmsDocumentId);
    if (!doc) throw BadRequest(`DMS document ${input.dmsDocumentId} not found`);
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.request.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        dmsDocumentId: input.dmsDocumentId ?? null,
        ownerId: actor.id,
        status: DbStatus.DRAFT,
      },
    });
    await recordAudit(tx, {
      actorId: actor.id,
      action: 'REQUEST_CREATED',
      requestId: request.id,
      toStatus: DbStatus.DRAFT,
      metadata: { category: input.category, dmsDocumentId: input.dmsDocumentId ?? null },
    });
    return request;
  });
}

export async function getRequest(actor: ActorContext, id: string) {
  const request = await prisma.request.findUnique({
    where: { id },
    include: { owner: { select: { id: true, fullName: true, email: true } } },
  });
  if (!request) throw NotFound('Request not found');
  if (!canReadRequest(actor, request)) throw Forbidden();
  return {
    ...request,
    availableActions: availableActions(
      { id: request.id, status: toDomain(request.status), ownerId: request.ownerId },
      actor,
    ),
  };
}

export async function listRequests(actor: ActorContext, opts: { status?: RequestStatus }) {
  const seeAll = can(actor, Permission.REQUEST_LIST_ALL);
  return prisma.request.findMany({
    where: {
      ...(seeAll ? {} : { ownerId: actor.id }),
      ...(opts.status ? { status: toDb(opts.status) } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: { owner: { select: { id: true, fullName: true, email: true } } },
  });
}

/**
 * Perform a lifecycle action. The workflow engine is the sole authority on
 * whether the transition is legal; for final APPROVAL we additionally consult
 * the Identity platform to confirm the approver's authority for the category.
 */
export async function performAction(
  actor: ActorContext & { email: string },
  id: string,
  action: WorkflowAction,
  comment?: string,
) {
  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) throw NotFound('Request not found');

  const decision = evaluateTransition(
    { id: request.id, status: toDomain(request.status), ownerId: request.ownerId },
    actor,
    action,
  );
  if (!decision.allowed) throw Forbidden(decision.reason);

  // Cross-platform authority check on final approval.
  if (action === WorkflowAction.APPROVE) {
    const authorised = await integrations.identity.isAuthorisedToApprove(
      actor.email,
      request.category,
    );
    if (!authorised) {
      throw Forbidden(
        `Identity platform does not grant ${actor.email} approval authority for category ${request.category}.`,
      );
    }
  }

  const nextDb = toDb(decision.nextStatus);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.request.update({
      where: { id },
      data: { status: nextDb },
    });
    await recordAudit(tx, {
      actorId: actor.id,
      action,
      requestId: id,
      fromStatus: request.status,
      toStatus: nextDb,
      comment: comment ?? null,
    });
    return updated;
  });
}
