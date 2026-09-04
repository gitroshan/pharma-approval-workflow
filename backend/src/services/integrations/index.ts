/**
 * Integration layer.
 *
 * The RFP scenario connects the workflow app to two existing internal platforms
 * through new APIs. We model that with an ADAPTER pattern: the rest of the app
 * depends only on the interfaces below, never on how a given platform is
 * actually reached. That means the HTTP implementation can be swapped for a
 * client's real endpoint (or a mock in tests) without touching business logic.
 */

/** Platform A — Document Management System. */
export interface DmsDocument {
  id: string;
  title: string;
  version: string;
  status: string;
  owner: string;
}

export interface DmsAdapter {
  /** Fetch metadata for a controlled document by its DMS id. */
  getDocument(documentId: string): Promise<DmsDocument | null>;
}

/** Platform B — Identity / Authority directory. */
export interface AuthorityRecord {
  userId: string;
  email: string;
  /** Categories this person is authorised to give final approval for. */
  approvalAuthorities: string[];
}

export interface IdentityAdapter {
  /** Confirm whether a user is authorised to approve a given category. */
  isAuthorisedToApprove(email: string, category: string): Promise<boolean>;
  getAuthority(email: string): Promise<AuthorityRecord | null>;
}

export interface Integrations {
  dms: DmsAdapter;
  identity: IdentityAdapter;
}
