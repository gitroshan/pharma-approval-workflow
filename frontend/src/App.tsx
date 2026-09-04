import { useEffect, useState } from 'react';
import { api, getToken } from './lib/api';
import type { User } from './lib/types';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { NewRequest } from './components/NewRequest';
import { RequestDetail } from './components/RequestDetail';
import { AuditTrail } from './components/AuditTrail';

type View =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'detail'; id: string }
  | { name: 'audit' };

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>({ name: 'list' });

  // Restore an existing session on load.
  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => api.logout())
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="center muted">Loading…</div>;
  if (!user) return <Login onLogin={setUser} />;

  const canCreate = user.roles.includes('SUBMITTER');
  const canAudit = user.roles.includes('AUDITOR') || user.roles.includes('ADMIN');

  function logout() {
    api.logout();
    setUser(null);
    setView({ name: 'list' });
  }

  return (
    <>
      <header className="app-header">
        <h1>Approval Workflow</h1>
        <div className="row">
          <button onClick={() => setView({ name: 'list' })}>Requests</button>
          {canCreate && <button onClick={() => setView({ name: 'new' })}>New request</button>}
          {canAudit && <button onClick={() => setView({ name: 'audit' })}>Audit</button>}
          <span className="who">
            {user.email}
            {user.roles.map((r) => (
              <span className="role-pill" key={r}>
                {r}
              </span>
            ))}
          </span>
          <button onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="container">
        {view.name === 'list' && <Dashboard onOpen={(id) => setView({ name: 'detail', id })} />}
        {view.name === 'new' && (
          <NewRequest
            onCreated={(id) => setView({ name: 'detail', id })}
            onCancel={() => setView({ name: 'list' })}
          />
        )}
        {view.name === 'detail' && (
          <RequestDetail id={view.id} user={user} onBack={() => setView({ name: 'list' })} />
        )}
        {view.name === 'audit' && <AuditTrail />}
      </main>
    </>
  );
}
