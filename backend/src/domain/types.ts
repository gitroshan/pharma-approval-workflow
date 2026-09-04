/**
 * Domain types shared across the workflow engine, RBAC policy and services.
 *
 * These are deliberately framework-agnostic (no Express, no Prisma imports) so
 * that the core business rules can be unit-tested in isolation and reused if the
 * transport or persistence layer ever changes.
 */

/** Roles a user can hold. A user may hold more than one role. */
export enum Role {
  /** Creates and submits requests (e.g. document author). */
  SUBMITTER = 'SUBMITTER',
  /** Performs first-line review of submitted requests. */
  REVIEWER = 'REVIEWER',
  /** Provides the final, binding approval decision (the signatory). */
  APPROVER = 'APPROVER',
  /** Read-only oversight across all requests and the audit trail. */
  AUDITOR = 'AUDITOR',
  /** User and configuration administration. */
  ADMIN = 'ADMIN',
}

/** Lifecycle states of an approval request. */
export enum RequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/** Actions that can be taken against a request to drive its lifecycle. */
export enum WorkflowAction {
  SUBMIT = 'SUBMIT',
  WITHDRAW = 'WITHDRAW',
  START_REVIEW = 'START_REVIEW',
  REQUEST_CHANGES = 'REQUEST_CHANGES',
  RECOMMEND_APPROVAL = 'RECOMMEND_APPROVAL',
  RESUBMIT = 'RESUBMIT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  CANCEL = 'CANCEL',
}

/** The minimal view of a user the domain layer needs to make decisions. */
export interface ActorContext {
  id: string;
  roles: Role[];
}

/** The minimal view of a request the domain layer needs to make decisions. */
export interface RequestContext {
  id: string;
  status: RequestStatus;
  /** The user who created (owns) the request. */
  ownerId: string;
}

/** Terminal states cannot transition any further. */
export const TERMINAL_STATES: ReadonlySet<RequestStatus> = new Set([
  RequestStatus.APPROVED,
  RequestStatus.REJECTED,
  RequestStatus.CANCELLED,
]);
