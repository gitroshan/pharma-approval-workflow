/**
 * Workflow state machine.
 *
 * A single, declarative transition table drives the entire request lifecycle.
 * Every rule encodes three things a regulated approval process cares about:
 *
 *   1. Which lifecycle transition is legal (from-state -> action -> to-state).
 *   2. Which role is permitted to perform it.
 *   3. Separation-of-duties constraints (ownership rules) — e.g. an author may
 *      not review or approve their own request.
 *
 * The engine is a set of PURE functions with no I/O. That makes the rules
 * exhaustively unit-testable (see tests/workflow.test.ts) and keeps the
 * source of truth for "what is allowed" in one auditable place.
 */

import {
  RequestStatus,
  Role,
  TERMINAL_STATES,
  WorkflowAction,
} from './types';
import type { ActorContext, RequestContext } from './types';

interface TransitionRule {
  action: WorkflowAction;
  from: RequestStatus;
  to: RequestStatus;
  /** Actor must hold at least one of these roles. */
  requiredRoles: Role[];
  /** Actor must be the owner of the request. */
  ownerOnly?: boolean;
  /** Actor must NOT be the owner (separation of duties). */
  segregateFromOwner?: boolean;
}

/**
 * The complete, canonical transition table. Nothing outside this array is a
 * legal transition. Reviewers and approvers are always segregated from the
 * request owner so that no single person can author and sign off the same item.
 */
export const TRANSITIONS: readonly TransitionRule[] = [
  {
    action: WorkflowAction.SUBMIT,
    from: RequestStatus.DRAFT,
    to: RequestStatus.SUBMITTED,
    requiredRoles: [Role.SUBMITTER],
    ownerOnly: true,
  },
  {
    action: WorkflowAction.WITHDRAW,
    from: RequestStatus.SUBMITTED,
    to: RequestStatus.DRAFT,
    requiredRoles: [Role.SUBMITTER],
    ownerOnly: true,
  },
  {
    action: WorkflowAction.START_REVIEW,
    from: RequestStatus.SUBMITTED,
    to: RequestStatus.IN_REVIEW,
    requiredRoles: [Role.REVIEWER],
    segregateFromOwner: true,
  },
  {
    action: WorkflowAction.REQUEST_CHANGES,
    from: RequestStatus.IN_REVIEW,
    to: RequestStatus.CHANGES_REQUESTED,
    requiredRoles: [Role.REVIEWER],
    segregateFromOwner: true,
  },
  {
    action: WorkflowAction.RECOMMEND_APPROVAL,
    from: RequestStatus.IN_REVIEW,
    to: RequestStatus.PENDING_APPROVAL,
    requiredRoles: [Role.REVIEWER],
    segregateFromOwner: true,
  },
  {
    action: WorkflowAction.RESUBMIT,
    from: RequestStatus.CHANGES_REQUESTED,
    to: RequestStatus.SUBMITTED,
    requiredRoles: [Role.SUBMITTER],
    ownerOnly: true,
  },
  {
    action: WorkflowAction.APPROVE,
    from: RequestStatus.PENDING_APPROVAL,
    to: RequestStatus.APPROVED,
    requiredRoles: [Role.APPROVER],
    segregateFromOwner: true,
  },
  {
    action: WorkflowAction.REJECT,
    from: RequestStatus.PENDING_APPROVAL,
    to: RequestStatus.REJECTED,
    requiredRoles: [Role.APPROVER],
    segregateFromOwner: true,
  },
  // Owner may cancel while the item is still theirs to control.
  {
    action: WorkflowAction.CANCEL,
    from: RequestStatus.DRAFT,
    to: RequestStatus.CANCELLED,
    requiredRoles: [Role.SUBMITTER],
    ownerOnly: true,
  },
  {
    action: WorkflowAction.CANCEL,
    from: RequestStatus.CHANGES_REQUESTED,
    to: RequestStatus.CANCELLED,
    requiredRoles: [Role.SUBMITTER],
    ownerOnly: true,
  },
];

export type TransitionResult =
  | { allowed: true; nextStatus: RequestStatus }
  | { allowed: false; reason: string };

function hasAnyRole(actor: ActorContext, roles: Role[]): boolean {
  return actor.roles.some((r) => roles.includes(r));
}

/**
 * Evaluate whether `actor` may perform `action` on `request`.
 *
 * ADMINs get a narrow, explicit override: they may CANCEL any non-terminal
 * request (an operational safety valve), but they cannot approve, reject or
 * review — those remain segregated duties by design.
 */
export function evaluateTransition(
  request: RequestContext,
  actor: ActorContext,
  action: WorkflowAction,
): TransitionResult {
  if (TERMINAL_STATES.has(request.status)) {
    return { allowed: false, reason: `Request is in terminal state ${request.status}.` };
  }

  // Explicit, auditable admin override for cancellation only.
  if (
    action === WorkflowAction.CANCEL &&
    hasAnyRole(actor, [Role.ADMIN]) &&
    !TERMINAL_STATES.has(request.status)
  ) {
    return { allowed: true, nextStatus: RequestStatus.CANCELLED };
  }

  const rule = TRANSITIONS.find(
    (t) => t.action === action && t.from === request.status,
  );

  if (!rule) {
    return {
      allowed: false,
      reason: `Action ${action} is not valid from state ${request.status}.`,
    };
  }

  if (!hasAnyRole(actor, rule.requiredRoles)) {
    return {
      allowed: false,
      reason: `Action ${action} requires one of roles: ${rule.requiredRoles.join(', ')}.`,
    };
  }

  if (rule.ownerOnly && actor.id !== request.ownerId) {
    return { allowed: false, reason: 'Only the request owner may perform this action.' };
  }

  if (rule.segregateFromOwner && actor.id === request.ownerId) {
    return {
      allowed: false,
      reason: 'Separation of duties: the request owner may not perform this action.',
    };
  }

  return { allowed: true, nextStatus: rule.to };
}

/**
 * List every action `actor` may currently take on `request`.
 * Used by the API/UI to render only the controls a user is entitled to use.
 */
export function availableActions(
  request: RequestContext,
  actor: ActorContext,
): WorkflowAction[] {
  return Object.values(WorkflowAction).filter(
    (action) => evaluateTransition(request, actor, action).allowed,
  );
}
