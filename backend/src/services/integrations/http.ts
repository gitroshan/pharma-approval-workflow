/**
 * HTTP-backed implementations of the integration adapters, plus a small,
 * resilient fetch helper (timeout + typed errors). These talk to the two mock
 * platform services in `mock-platforms/`; against a real client they would be
 * pointed at the real endpoints via environment configuration.
 */
import { config } from '../../config';
import {
  AuthorityRecord,
  DmsAdapter,
  DmsDocument,
  IdentityAdapter,
  Integrations,
} from './index';

export class IntegrationError extends Error {
  constructor(
    public platform: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

async function getJson<T>(
  platform: string,
  url: string,
  apiKey: string,
  timeoutMs = 5000,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'x-api-key': apiKey, accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new IntegrationError(platform, res.status, `${platform} returned ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof IntegrationError) throw err;
    throw new IntegrationError(platform, 0, `${platform} unreachable: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export class HttpDmsAdapter implements DmsAdapter {
  constructor(
    private baseUrl = config.DMS_BASE_URL,
    private apiKey = config.DMS_API_KEY,
  ) {}

  getDocument(documentId: string): Promise<DmsDocument | null> {
    return getJson<DmsDocument>(
      'DMS',
      `${this.baseUrl}/documents/${encodeURIComponent(documentId)}`,
      this.apiKey,
    );
  }
}

export class HttpIdentityAdapter implements IdentityAdapter {
  constructor(
    private baseUrl = config.IDENTITY_BASE_URL,
    private apiKey = config.IDENTITY_API_KEY,
  ) {}

  async getAuthority(email: string): Promise<AuthorityRecord | null> {
    return getJson<AuthorityRecord>(
      'IDENTITY',
      `${this.baseUrl}/authorities/${encodeURIComponent(email)}`,
      this.apiKey,
    );
  }

  async isAuthorisedToApprove(email: string, category: string): Promise<boolean> {
    const record = await this.getAuthority(email);
    return Boolean(record?.approvalAuthorities.includes(category));
  }
}

export const httpIntegrations: Integrations = {
  dms: new HttpDmsAdapter(),
  identity: new HttpIdentityAdapter(),
};
