/**
 * Mock Document Management System (DMS) — stands in for "internal platform A".
 *
 * In a real engagement this would be the client's existing document system; here
 * it is a small in-memory service so the integration path is real HTTP and can
 * be demonstrated end to end. Requests must present a matching x-api-key header.
 */
const express = require('express');

const PORT = process.env.PORT || 5101;
const API_KEY = process.env.DMS_API_KEY || 'dms-sample-key';

const DOCUMENTS = {
  'DOC-1001': { id: 'DOC-1001', title: 'Promotional brochure — Product X (EU)', version: '3.2', status: 'CONTROLLED', owner: 'alice@demo.pharma' },
  'DOC-1002': { id: 'DOC-1002', title: 'SOP-014 Cold-chain handling', version: '1.7', status: 'CONTROLLED', owner: 'alice@demo.pharma' },
  'DOC-1003': { id: 'DOC-1003', title: 'Batch record template BR-22', version: '0.9', status: 'DRAFT', owner: 'eng@demo.pharma' },
};

const app = express();

app.use((req, res, next) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'invalid api key' });
  }
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok', platform: 'dms' }));

app.get('/documents/:id', (req, res) => {
  const doc = DOCUMENTS[req.params.id];
  if (!doc) return res.status(404).json({ error: 'not found' });
  res.json(doc);
});

app.listen(PORT, () => console.log(`[mock-dms] listening on ${PORT}`));
