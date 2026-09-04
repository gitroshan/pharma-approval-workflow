/** Authentication middleware: validates the bearer token and attaches the actor. */
import { NextFunction, Request, Response } from 'express';
import { ActorContext } from '../domain/types';
import { Unauthorized } from '../errors';
import { verifyToken } from '../services/auth';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: ActorContext & { email: string };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(Unauthorized());
  }
  try {
    const claims = verifyToken(header.slice('Bearer '.length));
    req.actor = { id: claims.sub, email: claims.email, roles: claims.roles };
    next();
  } catch {
    next(Unauthorized('Invalid or expired token'));
  }
}
