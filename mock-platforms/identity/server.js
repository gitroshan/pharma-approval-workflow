/**
 * Mock Identity / Authority directory — stands in for "internal platform B".
 *
 * Confirms which approval categories a given person is authorised to sign off.
 * The workflow API consults this before allowing a final APPROVE, demonstrating
 * a cross-platform authority check as part of the approval control.
 */
const express = require('express');

const PORT = process.env.PORT || 5102;
const API_KEY = process.env.IDENTITY_API_KEY || 'identity-sample-key';

const AUTHORITIES = {
  'carol@demo.pharma': {
    userId: 'carol',
    email: 'carol@demo.pharma',
    approvalAuthorities: ['SOP', 'PROMOTIONAL_MATERIAL'],
  },
  'admin@demo.pharma': {
    userId: 'admin',
    email: 'admin@demo.pharma',
    approvalAuthorities: ['SOP', 'PROMOTIONAL_MATERIAL', 'BATCH_RECORD'],
  },
};

const app = express();

app.use((req, res, next) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'invalid api key' });
  }
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok', platform: 'identity' }));

app.get('/authorities/:email', (req, res) => {
  const record = AUTHORITIES[req.params.email.toLowerCase()];
  if (!record) return res.status(404).json({ error: 'not found' });
  res.json(record);
});

app.listen(PORT, () => console.log(`[mock-identity] listening on ${PORT}`));
