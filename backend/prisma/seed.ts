// Seeds 1 admin, 6 agents and ~160 submissions with realistic status histories.
// Safe to run more than once: users are upserted and the seeded agents' submissions are recreated.
// Run with `npm run db:seed` (or `npm run db:reset` for a clean database).
import 'dotenv/config';
import {
  PrismaClient,
  type Prisma,
  type SampleCondition,
  type SubmissionStatus,
  type TestResult,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const ADMIN = {
  fullName: 'Anita Sharma',
  email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').toLowerCase(),
  password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
};
const AGENT_PASSWORD = process.env.SEED_AGENT_PASSWORD ?? 'Agent@12345';

const AGENTS = [
  {
    fullName: 'Ravi Kumar',
    email: 'agent1@example.com',
    phone: '9876543210',
    isActive: true,
    count: 34,
  },
  {
    fullName: 'Priya Nair',
    email: 'agent2@example.com',
    phone: '9876543211',
    isActive: true,
    count: 30,
  },
  {
    fullName: 'Arjun Mehta',
    email: 'agent3@example.com',
    phone: '9876543212',
    isActive: true,
    count: 28,
  },
  {
    fullName: 'Sneha Reddy',
    email: 'agent4@example.com',
    phone: '9876543213',
    isActive: true,
    count: 32,
  },
  {
    fullName: 'Vikram Singh',
    email: 'agent5@example.com',
    phone: '9876543214',
    isActive: true,
    count: 26,
  },
  // Inactive: shows that deactivated agents can't log in but their history stays.
  {
    fullName: 'Meera Iyer',
    email: 'agent6@example.com',
    phone: '9876543215',
    isActive: false,
    count: 12,
  },
];

// ---------------------------------------------------------------------------
// Deterministic random numbers (mulberry32), so every run produces the same data.
// ---------------------------------------------------------------------------
let state = 42;
function random(): number {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
}

function between(min: number, max: number): number {
  return min + random() * (max - min);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1]![0];
}

const roundTo50 = (value: number) => Math.round(value / 50) * 50;

// ---------------------------------------------------------------------------
// Realistic values
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  'Aarav',
  'Diya',
  'Kabir',
  'Ananya',
  'Rohan',
  'Isha',
  'Aditya',
  'Kavya',
  'Nikhil',
  'Pooja',
  'Rahul',
  'Saanvi',
  'Karthik',
  'Lakshmi',
  'Manish',
  'Neha',
  'Suresh',
  'Divya',
  'Harish',
  'Tanvi',
];
const LAST_NAMES = [
  'Patel',
  'Rao',
  'Gupta',
  'Menon',
  'Das',
  'Joshi',
  'Pillai',
  'Verma',
  'Bose',
  'Chopra',
  'Naidu',
  'Kapoor',
  'Shetty',
  'Mishra',
  'Agarwal',
];

const LOCATIONS = [
  ['Hyderabad', 18],
  ['Bengaluru', 16],
  ['Chennai', 12],
  ['Mumbai', 12],
  ['Pune', 10],
  ['Delhi', 9],
  ['Kolkata', 6],
  ['Ahmedabad', 5],
  ['Jaipur', 4],
  ['Kochi', 4],
  ['Lucknow', 3],
  ['Visakhapatnam', 3],
] as const;

// Order sizes shaped so the amount histogram has a realistic curve.
const AMOUNT_RANGES: readonly (readonly [readonly [number, number], number])[] = [
  [[500, 1000], 10],
  [[1000, 5000], 30],
  [[5000, 10000], 25],
  [[10000, 25000], 20],
  [[25000, 50000], 10],
  [[50000, 75000], 5],
] as const;

const FINAL_STATUSES = [
  ['COMPLETED', 30],
  ['BILLING_PAYMENT_DONE', 20],
  ['BILLING_PAYMENT_NOT_DONE', 25],
  ['REJECTED', 10],
  ['NOT_FILLED_COMPLETELY', 15],
] as const satisfies readonly (readonly [SubmissionStatus, number])[];

const CONDITIONS = [
  ['GOOD', 70],
  ['OPEN', 18],
  ['DAMAGED', 12],
] as const satisfies readonly (readonly [SampleCondition, number])[];

// Damaged and open samples fail more often, so the "condition vs result" chart shows a real pattern.
const RESULTS_BY_CONDITION: Record<SampleCondition, readonly (readonly [TestResult, number])[]> = {
  GOOD: [
    ['PASS', 80],
    ['FAIL', 12],
    ['CANNOT_BE_DECIDED', 8],
  ],
  OPEN: [
    ['PASS', 50],
    ['FAIL', 30],
    ['CANNOT_BE_DECIDED', 20],
  ],
  DAMAGED: [
    ['PASS', 15],
    ['FAIL', 55],
    ['CANNOT_BE_DECIDED', 30],
  ],
};

const SEND_BACK_NOTES = [
  'Customer phone number is missing, please add it.',
  'Location is incomplete, add the area or landmark.',
  'Total amount does not match the invoice, please recheck.',
  'Sample condition needs a remark explaining the damage.',
];
const REJECTION_REASONS = [
  'Sample damaged beyond testing; customer informed.',
  'Duplicate of an earlier submission for the same customer.',
  'Customer cancelled the order before testing.',
  'Sample could not be identified from the label.',
];
const REMARKS = [
  'Seal was broken on arrival.',
  'Container cracked during transport.',
  'Result unclear, retest recommended.',
  'Sample volume was below the required minimum.',
];

type HistoryRow = {
  fromStatus: SubmissionStatus | null;
  toStatus: SubmissionStatus;
  changedById: string;
  note?: string;
  changedAt: Date;
};

function buildSubmission(
  agentId: string,
  adminId: string,
  now: number,
): Prisma.SubmissionCreateInput {
  const finalStatus = weighted(FINAL_STATUSES);
  const condition = weighted(CONDITIONS);
  const result = weighted(RESULTS_BY_CONDITION[condition]);
  const [min, max] = weighted(AMOUNT_RANGES);
  const total = Math.max(500, roundTo50(between(min, max)));
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);

  // Spread over the last 90 days (including today), during working hours.
  const createdAt = new Date(now - between(0.3, 90) * DAY);
  createdAt.setHours(Math.floor(between(9, 18)), Math.floor(between(0, 60)), 0, 0);
  // Keep every timestamp in the past, with room for later status changes.
  if (createdAt.getTime() > now - 2 * HOUR) createdAt.setTime(createdAt.getTime() - DAY);
  let clock = createdAt.getTime();
  // Each status change happens after the previous one (at least a minute later), never in the future.
  const later = () => {
    clock = Math.max(clock + 60_000, Math.min(clock + between(4 * HOUR, 4 * DAY), now - HOUR));
    return new Date(clock);
  };

  const partial = Math.min(total - 50, roundTo50(total * between(0, 0.8)));
  const paidInFullAtSubmit = random() < 0.4;
  const history: HistoryRow[] = [];
  let amountPaid = paidInFullAtSubmit ? total : partial;
  let rejectionReason: string | undefined;
  let completedAt: Date | undefined;

  // Every submission starts in a billing status chosen by the amount due.
  const firstStatus: SubmissionStatus =
    amountPaid === total ? 'BILLING_PAYMENT_DONE' : 'BILLING_PAYMENT_NOT_DONE';
  history.push({
    fromStatus: null,
    toStatus: firstStatus,
    changedById: agentId,
    changedAt: createdAt,
  });

  if (finalStatus === 'BILLING_PAYMENT_NOT_DONE' && firstStatus === 'BILLING_PAYMENT_DONE') {
    amountPaid = partial;
    history[0]!.toStatus = 'BILLING_PAYMENT_NOT_DONE';
  }

  if (
    (finalStatus === 'BILLING_PAYMENT_DONE' || finalStatus === 'COMPLETED') &&
    amountPaid < total
  ) {
    amountPaid = total;
    history.push({
      fromStatus: 'BILLING_PAYMENT_NOT_DONE',
      toStatus: 'BILLING_PAYMENT_DONE',
      changedById: agentId,
      note: 'Payment recorded',
      changedAt: later(),
    });
  }

  const current = () => history[history.length - 1]!.toStatus;

  if (finalStatus === 'COMPLETED') {
    completedAt = later();
    history.push({
      fromStatus: current(),
      toStatus: 'COMPLETED',
      changedById: adminId,
      changedAt: completedAt,
    });
  } else if (finalStatus === 'NOT_FILLED_COMPLETELY') {
    history.push({
      fromStatus: current(),
      toStatus: 'NOT_FILLED_COMPLETELY',
      changedById: adminId,
      note: pick(SEND_BACK_NOTES),
      changedAt: later(),
    });
  } else if (finalStatus === 'REJECTED') {
    rejectionReason = pick(REJECTION_REASONS);
    history.push({
      fromStatus: current(),
      toStatus: 'REJECTED',
      changedById: adminId,
      note: rejectionReason,
      changedAt: later(),
    });
  }

  const needsRemark = condition === 'DAMAGED' || result === 'CANNOT_BE_DECIDED';
  const collectedOn =
    random() < 0.7 ? new Date(createdAt.getTime() - Math.floor(between(0, 3)) * DAY) : undefined;
  collectedOn?.setUTCHours(0, 0, 0, 0);

  return {
    agent: { connect: { id: agentId } },
    createdBy: { connect: { id: agentId } },
    customerName: `${firstName} ${lastName}`,
    location: weighted(LOCATIONS),
    customerPhone: random() < 0.6 ? `9${Math.floor(between(100_000_000, 999_999_999))}` : null,
    customerEmail: random() < 0.4 ? `${firstName}.${lastName}@example.com`.toLowerCase() : null,
    totalAmount: total,
    amountPaid,
    sampleCondition: condition,
    result,
    collectedOn,
    remarks: needsRemark && random() < 0.8 ? pick(REMARKS) : null,
    status: current(),
    rejectionReason,
    submittedAt: createdAt,
    completedAt,
    createdAt,
    updatedAt: history[history.length - 1]!.changedAt,
    statusHistory: { create: history },
  };
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }

  const admin = await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: {
      fullName: ADMIN.fullName,
      role: 'ADMIN',
      adminId: null,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordHash: await bcrypt.hash(ADMIN.password, SALT_ROUNDS),
    },
    create: {
      fullName: ADMIN.fullName,
      email: ADMIN.email,
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(ADMIN.password, SALT_ROUNDS),
    },
  });

  const now = Date.now();
  let submissionCount = 0;

  for (const seedAgent of AGENTS) {
    const passwordHash = await bcrypt.hash(AGENT_PASSWORD, SALT_ROUNDS);
    const fields = {
      fullName: seedAgent.fullName,
      phone: seedAgent.phone,
      isActive: seedAgent.isActive,
      role: 'AGENT' as const,
      adminId: admin.id,
    };
    const agent = await prisma.user.upsert({
      where: { email: seedAgent.email },
      update: { ...fields, passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      create: { ...fields, email: seedAgent.email, passwordHash },
    });

    // Recreate this agent's submissions; status history is removed with them (ON DELETE CASCADE).
    await prisma.submission.deleteMany({ where: { agentId: agent.id } });
    for (let i = 0; i < seedAgent.count; i++) {
      await prisma.submission.create({ data: buildSubmission(agent.id, admin.id, now) });
      submissionCount++;
    }
  }

  process.stdout.write(
    [
      `Seeded 1 admin, ${AGENTS.length} agents and ${submissionCount} submissions.`,
      '',
      'Test logins (local development only):',
      `  Admin: ${ADMIN.email} / ${ADMIN.password}`,
      `  Agent: ${AGENTS[0]!.email} / ${AGENT_PASSWORD}`,
      `  Inactive agent (login is blocked): ${AGENTS[5]!.email} / ${AGENT_PASSWORD}`,
      '',
    ].join('\n'),
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
