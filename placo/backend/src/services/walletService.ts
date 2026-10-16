import { UID, type CoinType } from './ids';

const BALANCE_FIELD: Record<CoinType, 'bronze_balance' | 'diamond_balance'> = {
  bronze: 'bronze_balance',
  diamond: 'diamond_balance',
};

export async function getProfileForUser(strapi: any, userId: number) {
  return strapi.db.query(UID.profile).findOne({
    where: { user: userId },
    populate: { country: { populate: { default_currency: true } }, preferred_currency: true },
  });
}

export async function getOrCreateWallet(strapi: any, profileId: number) {
  let wallet = await strapi.db.query(UID.wallet).findOne({ where: { player: profileId } });
  if (!wallet) {
    wallet = await strapi.db.query(UID.wallet).create({
      data: { player: profileId, bronze_balance: 0, diamond_balance: 0, wallet_game_status: 'active', wallet_revision: 1 },
    });
  }
  return wallet;
}

/**
 * All coin balance mutations pass through this function. Idempotency is mandatory.
 * Callers must never accept a coin delta supplied by a public game client.
 */
export async function changeCoins(
  strapi: any,
  input: {
    profileId: number;
    coinType: CoinType;
    delta: number;
    ledgerType: string;
    sourceType: string;
    sourceReference?: string;
    idempotencyKey: string;
    note?: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (!Number.isSafeInteger(input.profileId) || input.profileId < 1) throw new Error('Invalid profile ID');
  if (!Number.isSafeInteger(input.delta) || input.delta === 0) throw new Error('Coin delta must be a non-zero integer');
  if (!input.idempotencyKey || input.idempotencyKey.length > 180) throw new Error('A valid idempotency key is required');

  return strapi.db.transaction(async ({ trx }: any) => {
    const prior = await strapi.db.query(UID.coinLedger).findOne({ where: { idempotency_key: input.idempotencyKey } });
    if (prior) return { duplicate: true, ledger: prior };

    const wallet = await getOrCreateWallet(strapi, input.profileId);
    // Lock the balance row so concurrent rewards/spends do not overwrite each other.
    await trx('coin_wallets').where({ id: wallet.id }).forUpdate().first();
    const current = await strapi.db.query(UID.wallet).findOne({ where: { id: wallet.id } });
    if (!current || current.wallet_game_status !== 'active') throw new Error('Wallet is not active');
    const balanceField = BALANCE_FIELD[input.coinType];
    const nextBalance = Number(current[balanceField] ?? 0) + input.delta;
    if (!Number.isSafeInteger(nextBalance) || nextBalance < 0) throw new Error('Insufficient coin balance');

    await strapi.db.query(UID.wallet).update({
      where: { id: wallet.id },
      data: { [balanceField]: nextBalance, last_ledger_at: new Date(), wallet_revision: Number(current.wallet_revision ?? 1) + 1 },
    });
    const ledger = await strapi.db.query(UID.coinLedger).create({
      data: {
        wallet: wallet.id,
        player: input.profileId,
        coin_type: input.coinType,
        amount_delta: input.delta,
        balance_after: nextBalance,
        ledger_type: input.ledgerType,
        source_type: input.sourceType,
        source_reference: input.sourceReference,
        idempotency_key: input.idempotencyKey,
        ledger_note: input.note,
        ledger_metadata: input.metadata ?? {},
      },
    });
    return { duplicate: false, wallet: { ...current, [balanceField]: nextBalance }, ledger };
  });
}

export async function getWalletForProfile(strapi: any, profileId: number) {
  return strapi.db.query(UID.wallet).findOne({ where: { player: profileId }, populate: { player: { select: ['id', 'documentId'] } } });
}
