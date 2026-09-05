import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

const DEMO_ACCOUNTS = [
  ['alice@demo.pharma', 'Submitter (author)'],
  ['bob@demo.pharma', 'Reviewer'],
  ['carol@demo.pharma', 'Approver'],
  ['dave@demo.pharma', 'Auditor'],
  ['admin@demo.pharma', 'Admin'],
];

export function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState('alice@demo.pharma');
  const [password, setPassword] = useState('Passw0rd!');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onLogin(await api.login(email, password));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <form className="card login-box" onSubmit={submit}>
        <h1 style={{ marginTop: 0 }}>Approval Workflow</h1>
        <p className="muted">Sign in to continue</p>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted" style={{ marginTop: '1rem' }}>
          Demo accounts (password <code>Passw0rd!</code>):
        </p>
        <ul className="muted" style={{ paddingLeft: '1.1rem', margin: 0 }}>
          {DEMO_ACCOUNTS.map(([e, role]) => (
            <li key={e}>
              <button type="button" className="link-btn" onClick={() => setEmail(e)}>
                {e}
              </button>{' '}
              — {role}
            </li>
          ))}
        </ul>
      </form>
    </div>
  );
}
