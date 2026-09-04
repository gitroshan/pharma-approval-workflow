/**
 * Seed script — creates demo users (one per role) and a couple of sample
 * requests so the application is explorable immediately after `docker compose up`.
 *
 * All demo accounts share the password:  Passw0rd!
 */
import { Role, RequestStatus } from '@prisma/client';
import { prisma } from './db';
import { hashPassword } from './services/auth';
import { recordAudit } from './services/audit';
import { logger } from './logger';

const DEMO_PASSWORD = 'Passw0rd!';

const users = [
  { email: 'alice@demo.pharma', fullName: 'Alice Author', roles: [Role.SUBMITTER] },
  { email: 'bob@demo.pharma', fullName: 'Bob Reviewer', roles: [Role.REVIEWER] },
  { email: 'carol@demo.pharma', fullName: 'Carol Approver', roles: [Role.APPROVER] },
  { email: 'dave@demo.pharma', fullName: 'Dave Auditor', roles: [Role.AUDITOR] },
  { email: 'admin@demo.pharma', fullName: 'Admin User', roles: [Role.ADMIN] },
];

async function main() {
  logger.info('Seeding database...');
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const created: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { roles: u.roles, fullName: u.fullName, passwordHash, isActive: true },
      create: { email: u.email, fullName: u.fullName, roles: u.roles, passwordHash },
    });
    created[u.email] = user.id;
  }

  // Only seed sample requests on an empty table.
  const existing = await prisma.request.count();
  if (existing === 0) {
    const draft = await prisma.request.create({
      data: {
        title: 'SOP-014: Cold-chain handling revision',
        description:
          'Revision of the cold-chain handling SOP to reflect the new 2–8°C excursion policy.',
        category: 'SOP',
        status: RequestStatus.DRAFT,
        ownerId: created['alice@demo.pharma'],
      },
    });
    await recordAudit(prisma, {
      actorId: created['alice@demo.pharma'],
      action: 'REQUEST_CREATED',
      requestId: draft.id,
      toStatus: RequestStatus.DRAFT,
    });

    const pending = await prisma.request.create({
      data: {
        title: 'Promotional brochure — Product X (EU)',
        description: 'Medical/legal/regulatory review of the Q4 promotional brochure for Product X.',
        category: 'PROMOTIONAL_MATERIAL',
        status: RequestStatus.PENDING_APPROVAL,
        ownerId: created['alice@demo.pharma'],
        dmsDocumentId: 'DOC-1001',
      },
    });

    const steps: Array<[string, RequestStatus | null, RequestStatus, string]> = [
      ['REQUEST_CREATED', null, RequestStatus.DRAFT, 'alice@demo.pharma'],
      ['SUBMIT', RequestStatus.DRAFT, RequestStatus.SUBMITTED, 'alice@demo.pharma'],
      ['START_REVIEW', RequestStatus.SUBMITTED, RequestStatus.IN_REVIEW, 'bob@demo.pharma'],
      ['RECOMMEND_APPROVAL', RequestStatus.IN_REVIEW, RequestStatus.PENDING_APPROVAL, 'bob@demo.pharma'],
    ];
    for (const [action, from, to, actorEmail] of steps) {
      await recordAudit(prisma, {
        actorId: created[actorEmail],
        action,
        requestId: pending.id,
        fromStatus: from,
        toStatus: to,
      });
    }
  }

  logger.info('Seed complete. Demo login password: %s', DEMO_PASSWORD);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  logger.error({ err }, 'Seed failed');
  await prisma.$disconnect();
  process.exit(1);
});
