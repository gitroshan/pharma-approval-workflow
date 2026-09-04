/**
 * Role-based access control (RBAC) policy for resource-level operations.
 *
 * The workflow engine (workflow.ts) governs *lifecycle transitions*. This
 * module governs *access* — who may create, read, list, and administer
 * resources, plus who may read the audit trail. Keeping both as pure functions
 * means the full authorization surface is declarative and testable.
 */

import { Role } from './types';
import type { ActorContext } from './types';

export enum Permission {
  REQUEST_CREATE = 'request:create',
  /** Read a single request the actor is entitled to see. */
  REQUEST_READ = 'request:read',
  /** List all requests across the organisation (oversight roles). */
  REQUEST_LIST_ALL = 'request:list:all',
  /** Read the immutable audit trail. */
  AUDIT_READ = 'audit:read',
  /** Manage users and role assignments. */
  USER_MANAGE = 'user:manage',
  /** Call the external-platform integration endpoints. */
  INTEGRATION_READ = 'integration:read',
}

/** Static capability grants per role. */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUBMITTER]: [
    Permission.REQUEST_CREATE,
    Permission.REQUEST_READ,
    Permission.INTEGRATION_READ,
  ],
  [Role.REVIEWER]: [
    Permission.REQUEST_READ,
    Permission.REQUEST_LIST_ALL,
    Permission.INTEGRATION_READ,
  ],
  [Role.APPROVER]: [
    Permission.REQUEST_READ,
    Permission.REQUEST_LIST_ALL,
    Permission.INTEGRATION_READ,
  ],
  [Role.AUDITOR]: [
    Permission.REQUEST_READ,
    Permission.REQUEST_LIST_ALL,
    Permission.AUDIT_READ,
  ],
  [Role.ADMIN]: [
    Permission.REQUEST_READ,
    Permission.REQUEST_LIST_ALL,
    Permission.AUDIT_READ,
    Permission.USER_MANAGE,
    Permission.INTEGRATION_READ,
  ],
};

/** The set of permissions an actor holds, unioned across all their roles. */
export function permissionsFor(actor: ActorContext): Set<Permission> {
  const perms = new Set<Permission>();
  for (const role of actor.roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) perms.add(p);
  }
  return perms;
}

/** True if the actor holds the given permission through any of their roles. */
export function can(actor: ActorContext, permission: Permission): boolean {
  return permissionsFor(actor).has(permission);
}

/**
 * Resource-scoped read check for a single request.
 *
 * A SUBMITTER may only read requests they own. Oversight roles (REVIEWER,
 * APPROVER, AUDITOR, ADMIN) may read any request. This prevents an author from
 * enumerating other teams' submissions while still allowing reviewers to work.
 */
export function canReadRequest(
  actor: ActorContext,
  request: { ownerId: string },
): boolean {
  if (can(actor, Permission.REQUEST_LIST_ALL)) return true;
  if (can(actor, Permission.REQUEST_READ) && actor.id === request.ownerId) return true;
  return false;
}
