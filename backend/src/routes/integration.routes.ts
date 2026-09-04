import { Router } from 'express';
import { Permission } from '../domain/rbac';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { NotFound } from '../errors';
import { httpIntegrations } from '../services/integrations/http';

export const integrationRouter = Router();
integrationRouter.use(authenticate, requirePermission(Permission.INTEGRATION_READ));

// Proxy lookup of a controlled document from the external DMS platform.
integrationRouter.get('/dms/documents/:id', async (req, res, next) => {
  try {
    const doc = await httpIntegrations.dms.getDocument(req.params.id);
    if (!doc) throw NotFound('Document not found in DMS');
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// Look up a person's approval authorities from the external Identity platform.
integrationRouter.get('/identity/authorities/:email', async (req, res, next) => {
  try {
    const record = await httpIntegrations.identity.getAuthority(req.params.email);
    if (!record) throw NotFound('No authority record found');
    res.json(record);
  } catch (err) {
    next(err);
  }
});
