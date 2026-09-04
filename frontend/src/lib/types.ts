export type Role = 'SUBMITTER' | 'REVIEWER' | 'APPROVER' | 'AUDITOR' | 'ADMIN';

export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type WorkflowAction =
  | 'SUBMIT'
  | 'WITHDRAW'
  | 'START_REVIEW'
  | 'REQUEST_CHANGES'
  | 'RECOMMEND_APPROVAL'
  | 'RESUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  roles: Role[];
}

export interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  status: RequestStatus;
  ownerId: string;
  dmsDocumentId?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; fullName: string; email: string };
  availableActions?: WorkflowAction[];
}

export interface AuditEvent {
  id: string;
  seq: string;
  action: string;
  fromStatus?: RequestStatus | null;
  toStatus?: RequestStatus | null;
  comment?: string | null;
  createdAt: string;
  hash: string;
  prevHash: string;
  actor?: { fullName: string; email: string };
}
