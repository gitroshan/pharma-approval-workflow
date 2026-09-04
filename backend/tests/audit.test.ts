import { describe, expect, it } from 'vitest';
import { computeEventHash, GENESIS_HASH } from '../src/services/audit';

describe('audit hash chain', () => {
  const base = {
    actorId: 'u1',
    action: 'SUBMIT',
    requestId: 'r1',
    fromStatus: 'DRAFT',
    toStatus: 'SUBMITTED',
    comment: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('is deterministic for identical input', () => {
    expect(computeEventHash(GENESIS_HASH, base)).toBe(computeEventHash(GENESIS_HASH, base));
  });

  it('changes when the previous hash changes (chaining)', () => {
    expect(computeEventHash(GENESIS_HASH, base)).not.toBe(computeEventHash('deadbeef', base));
  });

  it('changes when any field is tampered with', () => {
    const original = computeEventHash(GENESIS_HASH, base);
    expect(computeEventHash(GENESIS_HASH, { ...base, toStatus: 'APPROVED' })).not.toBe(original);
    expect(computeEventHash(GENESIS_HASH, { ...base, actorId: 'attacker' })).not.toBe(original);
  });

  it('produces a 64-character hex sha256 digest', () => {
    expect(computeEventHash(GENESIS_HASH, base)).toMatch(/^[0-9a-f]{64}$/);
  });
});
