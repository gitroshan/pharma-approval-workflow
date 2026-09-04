import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ApprovalRequest } from '../lib/types';
import { StatusBadge } from './ui';

export function Dashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listRequests()
      .then(setRequests)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading requests…</p>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Requests</h2>
      {requests.length === 0 ? (
        <p className="muted">No requests visible to your role.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => onOpen(r.id)}>
                <td>{r.title}</td>
                <td>{r.category}</td>
                <td>{r.owner?.fullName ?? '—'}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td className="muted">{new Date(r.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
