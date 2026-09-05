import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';

const CATEGORIES = ['SOP', 'PROMOTIONAL_MATERIAL', 'BATCH_RECORD'];

export function NewRequest({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [dmsDocumentId, setDmsDocumentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.createRequest({
        title,
        description,
        category,
        dmsDocumentId: dmsDocumentId || undefined,
      });
      onCreated(created.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>New request</h2>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
      </label>
      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label>
        DMS document id (optional — try DOC-1001)
        <input value={dmsDocumentId} onChange={(e) => setDmsDocumentId(e.target.value)} placeholder="DOC-1001" />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
      </label>
      {error && <div className="error">{error}</div>}
      <div className="row">
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create draft'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
