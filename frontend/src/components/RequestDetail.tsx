import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ApprovalRequest, User, WorkflowAction } from '../lib/types';
import { ACTION_LABELS, DESTRUCTIVE_ACTIONS, StatusBadge } from './ui';

export function RequestDetail({
  id,
  user,
  onBack,
}: {
  id: string;
  user: User;
  onBack: () => void;
}) {
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .getRequest(id)
      .then(setRequest)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  useEffect(load, [load]);

  async function act(action: WorkflowAction) {
    setBusy(true);
    setError(null);
    try {
      await api.performAction(id, action, comment || undefined);
      setComment('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !request) return <div className="error">{error}</div>;
  if (!request) return <p className="muted">Loading…</p>;

  const canAudit = user.roles.includes('AUDITOR') || user.roles.includes('ADMIN');

  return (
    <div className="card">
      <button className="link-btn" onClick={onBack}>
        ← Back to list
      </button>
      <div className="row" style={{ marginTop: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>{request.title}</h2>
        <div className="spacer" />
        <StatusBadge status={request.status} />
      </div>
      <p className="muted">
        {request.category}
        {request.dmsDocumentId ? ` · DMS: ${request.dmsDocumentId}` : ''} · owner{' '}
        {request.owner?.fullName ?? request.ownerId}
      </p>
      <p>{request.description}</p>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

      <h3>Actions available to you</h3>
      {request.availableActions && request.availableActions.length > 0 ? (
        <>
          <label>
            Comment (recorded in the audit trail)
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          </label>
          <div className="row">
            {request.availableActions.map((a) => (
              <button
                key={a}
                className={DESTRUCTIVE_ACTIONS.includes(a) ? 'danger' : 'primary'}
                disabled={busy}
                onClick={() => act(a)}
              >
                {ACTION_LABELS[a]}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">No actions available to you in the current state.</p>
      )}
      {error && <div className="error">{error}</div>}

      {canAudit && <RequestAudit requestId={id} />}
    </div>
  );
}

function RequestAudit({ requestId }: { requestId: string }) {
  const [events, setEvents] = useState<{ seq: string; action: string; createdAt: string; actor?: { fullName: string } }[]>(
    [],
  );
  useEffect(() => {
    api.auditTrail(requestId).then(setEvents).catch(() => setEvents([]));
  }, [requestId]);
  if (events.length === 0) return null;
  return (
    <>
      <h3 style={{ marginTop: '1.5rem' }}>Audit trail for this request</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Action</th>
            <th>By</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.seq}>
              <td className="muted">{e.seq}</td>
              <td>{e.action}</td>
              <td>{e.actor?.fullName ?? '—'}</td>
              <td className="muted">{new Date(e.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
