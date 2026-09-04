import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { Role } from '../domain/types';
import { Unauthorized } from '../errors';
import { issueToken, verifyPassword } from '../services/auth';
import { recordAudit } from '../services/audit';
import { authenticate } from '../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      throw Unauthorized('Invalid credentials');
    }
    const roles = user.roles as unknown as Role[];
    const token = issueToken({ sub: user.id, email: user.email, roles });
    await recordAudit(prisma, {
      actorId: user.id,
      action: 'USER_LOGIN',
      metadata: { ip: req.ip },
    });
    res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, roles },
    });
  } catch (err) {
    next(err);
  }
});

// Returns the currently authenticated principal.
authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.actor });
});
