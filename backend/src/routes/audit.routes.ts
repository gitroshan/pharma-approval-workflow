import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { Permission } from '../domain/rbac';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { verifyAuditChain } from '../services/audit';

export const auditRouter = Router();
auditRouter.use(authenticate, requirePermission(Permission.AUDIT_READ));

// Paginated audit trail, optionally filtered by request.
auditRouter.get('/', async (req, res, next) => {
  try {
    const q = z
      .object({
        requestId: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
        cursorSeq: z.coerce.number().int().optional(),
      })
      .parse(req.query);

    const events = await prisma.auditEvent.findMany({
      where: {
        ...(q.requestId ? { requestId: q.requestId } : {}),
        ...(q.cursorSeq ? { seq: { lt: BigInt(q.cursorSeq) } } : {}),
      },
      orderBy: { seq: 'desc' },
      take: q.limit,
      include: { actor: { select: { id: true, fullName: true, email: true } } },
    });

    // BigInt is not JSON-serialisable by default.
    res.json(
      events.map((e) => ({ ...e, seq: e.seq.toString() })),
    );
  } catch (err) {
    next(err);
  }
});

// Verify the integrity of the hash-chained audit trail.
auditRouter.get('/verify', async (_req, res, next) => {
  try {
    res.json(await verifyAuditChain(prisma));
  } catch (err) {
    next(err);
  }
});
