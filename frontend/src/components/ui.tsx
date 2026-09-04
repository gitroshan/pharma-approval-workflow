import type { RequestStatus, WorkflowAction } from '../lib/types';

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`badge ${status}`}>{status.replace(/_/g, ' ')}</span>;
}

export const ACTION_LABELS: Record<WorkflowAction, string> = {
  SUBMIT: 'Submit for review',
  WITHDRAW: 'Withdraw',
  START_REVIEW: 'Start review',
  REQUEST_CHANGES: 'Request changes',
  RECOMMEND_APPROVAL: 'Recommend approval',
  RESUBMIT: 'Resubmit',
  APPROVE: 'Approve',
  REJECT: 'Reject',
  CANCEL: 'Cancel',
};

export const DESTRUCTIVE_ACTIONS: WorkflowAction[] = ['REJECT', 'CANCEL', 'REQUEST_CHANGES', 'WITHDRAW'];
