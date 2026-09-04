import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AuditEvent } from '../lib/types';

export function AuditTrail() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [integrity, setIntegrity] = useState<{ valid: boolean; count: number } | null>(null);

  useEffect(() => {
    api.auditTrail().then(setEvents).catch((e) => setError((e as Error).message));
    api.verifyAudit().then(setIntegrity).catch(() => setIntegrity(null));
  }, []);

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>Audit trail</h2>
        <div className="spacer" />
        {integrity && (
          <span className={`badge ${integrity.valid ? 'APPROVED' : 'REJECTED'}`}>
            {integrity.valid ? `Chain verified · ${integrity.count} events` : 'CHAIN BROKEN'}
          </span>
        )}
      </div>
      <p className="muted">Append-only, hash-chained. Tampering with any row breaks verification.</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Action</th>
            <th>Transition</th>
            <th>By</th>
            <th>When</th>
            <th>Hash</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.seq}>
              <td className="muted">{e.seq}</td>
              <td>{e.action}</td>
              <td className="muted">
                {e.fromStatus || '—'} → {e.toStatus || '—'}
              </td>
              <td>{e.actor?.fullName ?? '—'}</td>
              <td className="muted">{new Date(e.createdAt).toLocaleString()}</td>
              <td className="hash" title={e.hash}>
                {e.hash.slice(0, 10)}…
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
