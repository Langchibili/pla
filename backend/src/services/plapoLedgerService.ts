const LEDGER_UID = 'api::plapo-ledger.plapo-ledger';

const SPEND_ORDER = ['free', 'earned', 'received', 'purchased'];

async function sourceBalances(strapi: any, userId: number): Promise<Record<string, number>> {
  const rows = await strapi.db.query(LEDGER_UID).findMany({
    where: { user: userId, plapo_ledger_status: 'posted' },
    select: ['amount', 'plapo_source'],
  });
  const balances: Record<string, number> = { free: 0, earned: 0, received: 0, purchased: 0 };
  for (const row of rows) {
    const source = row.plapo_source;
    if (source in balances) balances[source] += Number(row.amount) || 0;
  }
  return balances;
}

export async function createTournamentEntryWithPlapoCharge(
  strapi: any,
  params: {
    userId: number;
    tournamentId: number;
    amount: number;
    idempotencyKey: string;
    entryData: Record<string, unknown>;
  },
): Promise<{ entry: any; charged: boolean; balance: number }> {
  const amount = Math.trunc(Number(params.amount));
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Entry fee must be a non-negative Plapo amount');

  return strapi.db.transaction(async () => {
    const existingDebit = await strapi.db.query(LEDGER_UID).findOne({
      where: { idempotency_key: { $startsWith: `${params.idempotencyKey}:` } },
      select: ['id'],
    });
    if (existingDebit) throw new Error('This tournament entry was already charged');

    const balances = await sourceBalances(strapi, params.userId);
    const balance = Object.values(balances).reduce((total, value) => total + value, 0);
    if (balance < amount) throw new Error('Your Plapo balance is too low for this entry fee');

    let remaining = amount;
    for (const source of SPEND_ORDER) {
      const available = Math.max(0, balances[source] ?? 0);
      const debit = Math.min(remaining, available);
      if (!debit) continue;
      await strapi.db.query(LEDGER_UID).create({
        data: {
          user: params.userId,
          amount: -debit,
          ledger_type: 'entry_fee',
          plapo_source: source,
          plapo_ledger_status: 'posted',
          tournament: params.tournamentId,
          idempotency_key: `${params.idempotencyKey}:${source}`,
          note: 'Tournament entry fee',
        },
      });
      remaining -= debit;
      if (!remaining) break;
    }

    const entry = await strapi.documents('api::tournament-entry.tournament-entry').create({
      data: params.entryData,
    });
    return { entry, charged: amount > 0, balance: balance - amount };
  });
}

export async function grantInitialPlapo(
  strapi: any,
  userId: number,
  amount: number,
): Promise<void> {
  const points = Math.max(0, Math.trunc(Number(amount) || 0));
  if (!points) return;
  const idempotencyKey = `signup-bonus:${userId}`;
  const existing = await strapi.db.query(LEDGER_UID).findOne({
    where: { idempotency_key: idempotencyKey },
    select: ['id'],
  });
  if (existing) return;

  await strapi.db.query(LEDGER_UID).create({
    data: {
      user: userId,
      amount: points,
      ledger_type: 'signup_bonus',
      plapo_source: 'free',
      plapo_ledger_status: 'posted',
      idempotency_key: idempotencyKey,
      note: 'Initial signup Plapo',
    },
  });
}
