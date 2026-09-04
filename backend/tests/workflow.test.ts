import { describe, expect, it } from 'vitest';
import {
  ActorContext,
  RequestContext,
  RequestStatus,
  Role,
  WorkflowAction,
} from '../src/domain/types';
import { availableActions, evaluateTransition } from '../src/domain/workflow';

const owner: ActorContext = { id: 'u-owner', roles: [Role.SUBMITTER] };
const reviewer: ActorContext = { id: 'u-reviewer', roles: [Role.REVIEWER] };
const approver: ActorContext = { id: 'u-approver', roles: [Role.APPROVER] };
const admin: ActorContext = { id: 'u-admin', roles: [Role.ADMIN] };

const req = (status: RequestStatus, ownerId = owner.id): RequestContext => ({
  id: 'r-1',
  status,
  ownerId,
});

describe('workflow state machine — happy path', () => {
  it('owner submits a draft', () => {
    const r = evaluateTransition(req(RequestStatus.DRAFT), owner, WorkflowAction.SUBMIT);
    expect(r).toEqual({ allowed: true, nextStatus: RequestStatus.SUBMITTED });
  });

  it('reviewer starts review then recommends approval', () => {
    expect(evaluateTransition(req(RequestStatus.SUBMITTED), reviewer, WorkflowAction.START_REVIEW))
      .toEqual({ allowed: true, nextStatus: RequestStatus.IN_REVIEW });
    expect(evaluateTransition(req(RequestStatus.IN_REVIEW), reviewer, WorkflowAction.RECOMMEND_APPROVAL))
      .toEqual({ allowed: true, nextStatus: RequestStatus.PENDING_APPROVAL });
  });

  it('approver approves a pending request', () => {
    expect(evaluateTransition(req(RequestStatus.PENDING_APPROVAL), approver, WorkflowAction.APPROVE))
      .toEqual({ allowed: true, nextStatus: RequestStatus.APPROVED });
  });

  it('reviewer can request changes and owner can resubmit', () => {
    expect(evaluateTransition(req(RequestStatus.IN_REVIEW), reviewer, WorkflowAction.REQUEST_CHANGES))
      .toEqual({ allowed: true, nextStatus: RequestStatus.CHANGES_REQUESTED });
    expect(evaluateTransition(req(RequestStatus.CHANGES_REQUESTED), owner, WorkflowAction.RESUBMIT))
      .toEqual({ allowed: true, nextStatus: RequestStatus.SUBMITTED });
  });
});

describe('workflow — role gating', () => {
  it('a reviewer cannot submit on behalf of the owner', () => {
    const r = evaluateTransition(req(RequestStatus.DRAFT), reviewer, WorkflowAction.SUBMIT);
    expect(r.allowed).toBe(false);
  });

  it('a submitter cannot approve', () => {
    const r = evaluateTransition(req(RequestStatus.PENDING_APPROVAL), owner, WorkflowAction.APPROVE);
    expect(r.allowed).toBe(false);
  });
});

describe('workflow — separation of duties', () => {
  it('an author who is also a reviewer cannot review their own request', () => {
    const authorReviewer: ActorContext = { id: owner.id, roles: [Role.SUBMITTER, Role.REVIEWER] };
    const r = evaluateTransition(req(RequestStatus.SUBMITTED), authorReviewer, WorkflowAction.START_REVIEW);
    expect(r.allowed).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/separation of duties/i);
  });

  it('an author who is also an approver cannot approve their own request', () => {
    const authorApprover: ActorContext = { id: owner.id, roles: [Role.SUBMITTER, Role.APPROVER] };
    const r = evaluateTransition(req(RequestStatus.PENDING_APPROVAL), authorApprover, WorkflowAction.APPROVE);
    expect(r.allowed).toBe(false);
  });
});

describe('workflow — illegal transitions', () => {
  it('cannot approve a draft', () => {
    expect(evaluateTransition(req(RequestStatus.DRAFT), approver, WorkflowAction.APPROVE).allowed).toBe(false);
  });

  it('terminal states reject all actions', () => {
    for (const status of [RequestStatus.APPROVED, RequestStatus.REJECTED, RequestStatus.CANCELLED]) {
      for (const action of Object.values(WorkflowAction)) {
        expect(evaluateTransition(req(status), admin, action).allowed).toBe(false);
      }
    }
  });
});

describe('workflow — admin cancel override', () => {
  it('admin can cancel a non-terminal request they do not own', () => {
    const r = evaluateTransition(req(RequestStatus.IN_REVIEW), admin, WorkflowAction.CANCEL);
    expect(r).toEqual({ allowed: true, nextStatus: RequestStatus.CANCELLED });
  });

  it('admin cannot approve (segregated duty, no override)', () => {
    expect(evaluateTransition(req(RequestStatus.PENDING_APPROVAL), admin, WorkflowAction.APPROVE).allowed)
      .toBe(false);
  });
});

describe('availableActions', () => {
  it('lists only what the actor may do now', () => {
    expect(availableActions(req(RequestStatus.DRAFT), owner).sort()).toEqual(
      [WorkflowAction.SUBMIT, WorkflowAction.CANCEL].sort(),
    );
    expect(availableActions(req(RequestStatus.PENDING_APPROVAL), approver)).toEqual(
      expect.arrayContaining([WorkflowAction.APPROVE, WorkflowAction.REJECT]),
    );
    expect(availableActions(req(RequestStatus.APPROVED), admin)).toEqual([]);
  });
});
