/** Authorisation middleware built on the pure RBAC policy. */
import { NextFunction, Request, Response } from 'express';
import { Permission, can } from '../domain/rbac';
import { Forbidden, Unauthorized } from '../errors';

/** Require that the authenticated actor holds a given permission. */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.actor) return next(Unauthorized());
    if (!can(req.actor, permission)) return next(Forbidden());
    next();
  };
}
