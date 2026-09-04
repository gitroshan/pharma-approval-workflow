/**
 * Audit service — append-only, hash-chained event log.
 *
 * Every security- or lifecycle-relevant event is recorded here. Each record
 * carries the hash of the previous record plus a hash of its own canonical
 * content, so any later tampering (edit or deletion) breaks the chain and is
 * detectable via `verifyAuditChain()`.
 *
 * The application NEVER updates or deletes rows in this table.
 */
import { createHash } from 'crypto';
// Type-only import: erased at compile time, so this module carries no runtime
// dependency on a generated Prisma client and its pure functions are testable
// in isolation.
import type { Prisma, PrismaClient, RequestStatus } from '@prisma/client';

export const GENESIS_HASH = '0'.repeat(64);

export interface AuditInput {
  actorId: string;
  action: string;
  requestId?: string | null;
  fromStatus?: RequestStatus | null;
  toStatus?: RequestStatus | null;
  comment?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Pure, deterministic hash of an event given the previous hash. Field order is
 * fixed so the digest is reproducible during verification.
 */
export function computeEventHash(
  prevHash: string,
  e: {
    actorId: string;
    action: string;
    requestId?: string | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    comment?: string | null;
    createdAt: Date;
  },
): string {
  const canonical = JSON.stringify({
    prevHash,
    actorId: e.actorId,
    action: e.action,
    requestId: e.requestId ?? null,
    fromStatus: e.fromStatus ?? null,
    toStatus: e.toStatus ?? null,
    comment: e.comment ?? null,
    createdAt: e.createdAt.toISOString(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Append an event to the audit trail. Accepts a transaction client so the audit
 * write commits atomically with the state change it records.
 */
export async function recordAudit(db: Db, input: AuditInput) {
  const last = await db.auditEvent.findFirst({
    orderBy: { seq: 'desc' },
    select: { hash: true },
  });
  const prevHash = last?.hash ?? GENESIS_HASH;
  const createdAt = new Date();
  const hash = computeEventHash(prevHash, { ...input, createdAt });

  return db.auditEvent.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      requestId: input.requestId ?? null,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      comment: input.comment ?? null,
      metadata: input.metadata ?? undefined,
      prevHash,
      hash,
      createdAt,
    },
  });
}

export interface ChainVerification {
  valid: boolean;
  count: number;
  brokenAtSeq?: string;
}

/** Recompute the whole chain and report the first point of divergence, if any. */
export async function verifyAuditChain(db: PrismaClient): Promise<ChainVerification> {
  const events = await db.auditEvent.findMany({ orderBy: { seq: 'asc' } });
  let prevHash = GENESIS_HASH;
  for (const e of events) {
    if (e.prevHash !== prevHash) {
      return { valid: false, count: events.length, brokenAtSeq: e.seq.toString() };
    }
    const expected = computeEventHash(prevHash, e);
    if (expected !== e.hash) {
      return { valid: false, count: events.length, brokenAtSeq: e.seq.toString() };
    }
    prevHash = e.hash;
  }
  return { valid: true, count: events.length };
}
