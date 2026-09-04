import type {
  ApprovalRequest,
  AuditEvent,
  User,
  WorkflowAction,
} from './types';

const TOKEN_KEY = 'approval.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — session-only */
  }
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error?.message || message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  async login(email: string, password: string) {
    const data = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data.user;
  },
  logout() {
    setToken(null);
  },
  me() {
    return request<{ user: User }>('/auth/me').then((r) => r.user);
  },
  listRequests(status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<ApprovalRequest[]>(`/requests${q}`);
  },
  getRequest(id: string) {
    return request<ApprovalRequest>(`/requests/${id}`);
  },
  createRequest(input: {
    title: string;
    description: string;
    category: string;
    dmsDocumentId?: string;
  }) {
    return request<ApprovalRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  performAction(id: string, action: WorkflowAction, comment?: string) {
    return request<ApprovalRequest>(`/requests/${id}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  },
  auditTrail(requestId?: string) {
    const q = requestId ? `?requestId=${encodeURIComponent(requestId)}` : '';
    return request<AuditEvent[]>(`/audit${q}`);
  },
  verifyAudit() {
    return request<{ valid: boolean; count: number; brokenAtSeq?: string }>('/audit/verify');
  },
};

export { ApiError };
