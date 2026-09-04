import { describe, expect, it } from 'vitest';
import { ActorContext, Role } from '../src/domain/types';
import { Permission, can, canReadRequest, permissionsFor } from '../src/domain/rbac';

const submitter: ActorContext = { id: 'u1', roles: [Role.SUBMITTER] };
const reviewer: ActorContext = { id: 'u2', roles: [Role.REVIEWER] };
const auditor: ActorContext = { id: 'u3', roles: [Role.AUDITOR] };
const admin: ActorContext = { id: 'u4', roles: [Role.ADMIN] };

describe('rbac — capability grants', () => {
  it('submitter can create but not read all or audit', () => {
    expect(can(submitter, Permission.REQUEST_CREATE)).toBe(true);
    expect(can(submitter, Permission.REQUEST_LIST_ALL)).toBe(false);
    expect(can(submitter, Permission.AUDIT_READ)).toBe(false);
  });

  it('only auditor and admin can read the audit trail', () => {
    expect(can(auditor, Permission.AUDIT_READ)).toBe(true);
    expect(can(admin, Permission.AUDIT_READ)).toBe(true);
    expect(can(reviewer, Permission.AUDIT_READ)).toBe(false);
  });

  it('only admin can manage users', () => {
    expect(can(admin, Permission.USER_MANAGE)).toBe(true);
    expect(can(reviewer, Permission.USER_MANAGE)).toBe(false);
  });

  it('multiple roles union their permissions', () => {
    const both: ActorContext = { id: 'u5', roles: [Role.SUBMITTER, Role.AUDITOR] };
    const perms = permissionsFor(both);
    expect(perms.has(Permission.REQUEST_CREATE)).toBe(true);
    expect(perms.has(Permission.AUDIT_READ)).toBe(true);
  });
});

describe('rbac — resource-scoped request reads', () => {
  it('a submitter may read only their own requests', () => {
    expect(canReadRequest(submitter, { ownerId: 'u1' })).toBe(true);
    expect(canReadRequest(submitter, { ownerId: 'someone-else' })).toBe(false);
  });

  it('oversight roles may read any request', () => {
    expect(canReadRequest(reviewer, { ownerId: 'anyone' })).toBe(true);
    expect(canReadRequest(auditor, { ownerId: 'anyone' })).toBe(true);
    expect(canReadRequest(admin, { ownerId: 'anyone' })).toBe(true);
  });
});
