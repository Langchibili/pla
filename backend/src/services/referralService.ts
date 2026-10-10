import { createHash, randomBytes } from 'crypto';
import { resolveSettingsForCountry } from './settingsResolver';

import { createUserNotification } from './appNotificationService';

const USER_UID = 'plugin::users-permissions.user';
const IMPRESSION_UID = 'api::affiliate-impression.affiliate-impression';
const REFERRAL_UID = 'api::referral.referral';
const LEDGER_UID = 'api::plapo-ledger.plapo-ledger';

export function buildIpSignature(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export function createReferralCode(): string {
  return `PLA${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function recordAffiliateImpression(
  strapi: any,
  params: {
    referralCode: string;
    ip: string;
    deviceHash?: string;
    userAgent?: string;
    referralUrl?: string;
  },
): Promise<boolean> {
  const referralCode = params.referralCode.trim().toUpperCase();
  if (!referralCode) return false;
  const deviceHash = /^[a-f0-9]{64}$/i.test(params.deviceHash ?? '')
    ? params.deviceHash!.toLowerCase()
    : undefined;
  if (!params.ip && !deviceHash) return false;
  const signatureSource = params.ip || deviceHash;
  if (!signatureSource) return false;

  const affiliate = await strapi.db.query(USER_UID).findOne({
    where: { referral_code: referralCode },
    select: ['id'],
  });
  if (!affiliate) return false;

  const signatureHash = buildIpSignature(signatureSource);
  const identityConditions: Record<string, unknown>[] = deviceHash
    ? [
      { device_hash: deviceHash },
      ...(params.ip
        ? [{ signature_hash: buildIpSignature(params.ip), device_hash: { $null: true } }]
        : []),
    ]
    : [{ signature_hash: signatureHash }];
  const currentImpression = await strapi.db.query(IMPRESSION_UID).findOne({
    where: {
      $or: identityConditions,
      converted: false,
      expires_at: { $gt: new Date() },
    },
  });

  if (currentImpression) return true;

  await strapi.db.query(IMPRESSION_UID).create({
    data: {
      signature_hash: signatureHash,
      device_hash: deviceHash,
      referral_code: referralCode,
      affiliate_owner: affiliate.id,
      converted: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      user_agent: params.userAgent?.slice(0, 255),
      referral_url: params.referralUrl?.slice(0, 255),
    },
  });

  return true;
}

export async function hasAffiliateImpression(
  strapi: any,
  ip: string,
  deviceHash?: string,
): Promise<boolean> {
  const normalizedDeviceHash = /^[a-f0-9]{64}$/i.test(deviceHash ?? '')
    ? deviceHash!.toLowerCase()
    : undefined;
  const conditions: Record<string, unknown>[] = normalizedDeviceHash
    ? [
      { device_hash: normalizedDeviceHash },
      ...(ip
        ? [{ signature_hash: buildIpSignature(ip), device_hash: { $null: true } }]
        : []),
    ]
    : ip
      ? [{ signature_hash: buildIpSignature(ip) }]
      : [];
  if (!conditions.length) return false;

  const impression = await strapi.db.query(IMPRESSION_UID).findOne({
    where: {
      $or: conditions,
      converted: false,
      expires_at: { $gt: new Date() },
    },
    select: ['id'],
  });

  return Boolean(impression);
}

export async function attachAffiliateAttribution(
  strapi: any,
  user: { id: number; documentId: string; referral_code?: string },
  params: { referralCode?: string; deviceHash?: string; ip: string },
): Promise<void> {
  let affiliate: { id: number } | null = null;
  let impression: { id: number; affiliate_owner?: { id: number } | null } | null = null;

  const referralCode = params.referralCode?.trim().toUpperCase();
  if (referralCode) {
    affiliate = await strapi.db.query(USER_UID).findOne({
      where: { referral_code: referralCode },
      select: ['id'],
    });
    if (!affiliate) throw new Error('Referral code is invalid');

    const deviceHash = /^[a-f0-9]{64}$/i.test(params.deviceHash ?? '')
      ? params.deviceHash!.toLowerCase()
      : undefined;
    const matchConditions: Record<string, unknown>[] = deviceHash
      ? [
        { device_hash: deviceHash },
        ...(params.ip
          ? [{ signature_hash: buildIpSignature(params.ip), device_hash: { $null: true } }]
          : []),
      ]
      : params.ip
        ? [{ signature_hash: buildIpSignature(params.ip) }]
        : [];
    if (matchConditions.length) {
      impression = await strapi.db.query(IMPRESSION_UID).findOne({
        where: {
          referral_code: referralCode,
          $or: matchConditions,
          converted: false,
          expires_at: { $gt: new Date() },
        },
        select: ['id'],
      });
    }
  } else {
    const deviceHash = /^[a-f0-9]{64}$/i.test(params.deviceHash ?? '')
      ? params.deviceHash!.toLowerCase()
      : undefined;
    if (!params.ip && !deviceHash) return;
    const matchConditions: Record<string, unknown>[] = deviceHash
      ? [
        { device_hash: deviceHash },
        ...(params.ip
          ? [{ signature_hash: buildIpSignature(params.ip), device_hash: { $null: true } }]
          : []),
      ]
      : params.ip
        ? [{ signature_hash: buildIpSignature(params.ip) }]
        : [];

    impression = await strapi.db.query(IMPRESSION_UID).findOne({
      where: {
        $or: matchConditions,
        converted: false,
        expires_at: { $gt: new Date() },
      },
      populate: { affiliate_owner: { select: ['id'] } },
    });
    affiliate = impression?.affiliate_owner ?? null;
  }

  if (!affiliate || affiliate.id === user.id) return;

  await strapi.documents(USER_UID).update({
    documentId: user.documentId,
    data: { referred_by: affiliate.id },
  });

  const existingReferral = await strapi.db.query(REFERRAL_UID).findOne({
    where: { referred_user: user.id },
    select: ['id'],
  });
  if (!existingReferral) {
    await strapi.db.query(REFERRAL_UID).create({
      data: {
        referrer: affiliate.id,
        referred_user: user.id,
        referral_status: 'pending',
        reward_plapo: 0,
      },
    });
  }

  if (impression) {
    await strapi.db.query(IMPRESSION_UID).update({
      where: { id: impression.id },
      data: { converted: true, converted_user: user.id },
    });
  }
}

export async function awardReferralAfterTournamentEntry(
  strapi: any,
  referredUserId: number,
): Promise<void> {
  const referredUser = await strapi.db.query(USER_UID).findOne({
    where: { id: referredUserId },
    select: ['id', 'user_status', 'confirmed'],
    populate: { country: { select: ['id'] } },
  });
  if (!referredUser) return;

  const referral = await strapi.db.query(REFERRAL_UID).findOne({
    where: { referred_user: referredUserId, referral_status: 'pending' },
    populate: { referrer: { populate: { country: { select: ['id'] } } } },
  });
  const referrerId = referral?.referrer?.id;
  if (!referral || !referrerId || referrerId === referredUserId) return;

  const settings = await resolveSettingsForCountry(strapi, referral.referrer.country?.id);
  if (!settings.affiliate_system_enabled || Number(settings.affiliate_reward_points) <= 0) return;
  const conditions = settings.affiliate_reward_conditions;
  if (conditions?.operator !== 'all' || !Array.isArray(conditions.conditions)) return;

  const entryCount = await strapi.db
    .query('api::tournament-entry.tournament-entry')
    .count({ where: { user: referredUserId } });
  const conditionPassed = conditions.conditions.every((condition: any) => {
    if (condition?.type === 'trigger') return condition.value === 'tournament_entry_created';
    if (condition?.type === 'minimum_tournament_entries') {
      return entryCount >= Math.max(1, Number(condition.value) || 1);
    }
    if (condition?.type === 'account_status') return referredUser.user_status === condition.value;
    if (condition?.type === 'email_verified') return condition.value !== true || referredUser.confirmed === true;
    return false;
  });
  if (!conditionPassed) return;

  const monthlyCap = Number(settings.referral_monthly_cap);
  if (monthlyCap <= 0) return;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthlyRewards = await strapi.db.query(REFERRAL_UID).count({
    where: {
      referrer: referrerId,
      referral_status: 'rewarded',
      rewarded_at: { $gte: monthStart },
    },
  });
  if (monthlyRewards >= monthlyCap) return;

  const idempotencyKey = `referral:first-tournament-entry:${referredUserId}`;
  const existingCredit = await strapi.db.query(LEDGER_UID).findOne({
    where: { idempotency_key: idempotencyKey },
    select: ['id'],
  });

  if (!existingCredit) {
    try {
      await strapi.db.query(LEDGER_UID).create({
        data: {
          user: referrerId,
          amount: Number(settings.affiliate_reward_points),
          ledger_type: 'referral_reward',
          plapo_source: 'earned',
          plapo_ledger_status: 'posted',
          idempotency_key: idempotencyKey,
          note: `Referral reward for player ${referredUserId}'s first tournament entry`,
        },
      });
    } catch (error) {
      const duplicate = await strapi.db.query(LEDGER_UID).findOne({
        where: { idempotency_key: idempotencyKey },
        select: ['id'],
      });
      if (!duplicate) throw error;
    }
  }

  await strapi.db.query(REFERRAL_UID).update({
    where: { id: referral.id },
    data: {
      referral_status: 'rewarded',
      reward_plapo: Number(settings.affiliate_reward_points),
      rewarded_at: new Date(),
    },
  });
  await createUserNotification(strapi, {
    userId: Number(referrerId),
    title: 'You earned referral Plapo',
    body: `${Number(settings.affiliate_reward_points)} Plapo was added to your balance.`,
    type: 'referral_reward',
    data: { route: '/wallet' },
    idempotencyKey: `referral-reward-notification:${referredUserId}`,
  });
}
