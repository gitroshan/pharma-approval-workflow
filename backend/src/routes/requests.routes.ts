import { Router } from 'express';
import { z } from 'zod';
import { RequestStatus, WorkflowAction } from '../domain/types';
import { Permission } from '../domain/rbac';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  createRequest,
  getRequest,
  listRequests,
  performAction,
} from '../services/requests';

export const requestsRouter = Router();
requestsRouter.use(authenticate);

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().min(1).max(100),
  dmsDocumentId: z.string().optional(),
});

const actionSchema = z.object({
  action: z.nativeEnum(WorkflowAction),
  comment: z.string().max(2000).optional(),
});

// Create a new request (draft).
requestsRouter.post(
  '/',
  requirePermission(Permission.REQUEST_CREATE),
  async (req, res, next) => {
    try {
      const input = createSchema.parse(req.body);
      const request = await createRequest(req.actor!, input);
      res.status(201).json(request);
    } catch (err) {
      next(err);
    }
  },
);

// List requests visible to the actor (own, or all for oversight roles).
requestsRouter.get('/', async (req, res, next) => {
  try {
    const status = req.query.status
      ? z.nativeEnum(RequestStatus).parse(req.query.status)
      : undefined;
    const requests = await listRequests(req.actor!, { status });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// Read a single request with the actions the actor may take on it.
requestsRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await getRequest(req.actor!, req.params.id));
  } catch (err) {
    next(err);
  }
});

// Drive a lifecycle transition.
requestsRouter.post('/:id/actions', async (req, res, next) => {
  try {
    const { action, comment } = actionSchema.parse(req.body);
    const updated = await performAction(req.actor!, req.params.id, action, comment);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
