import { UID } from './ids';
import { getProfileForUser, changeCoins } from './walletService';
import { resolveSettingsForCountry } from './settingsResolver';

const ALLOWED_ATTRIBUTES = new Set([
  'sprintSpeed','acceleration','agility','balance','strength','stamina','jumping','dribbling','ballControl',
  'shortPassing','longPassing','crossing','finishing','shotPower','longShots','volleys','curve','freeKickAccuracy',
  'penalties','headingAccuracy','standingTackle','slideTackle','interceptions','marking','aggression','vision',
  'composure','reactions','attackPositioning','defendPositioning','anticipation','decisions','workRate','weakFoot',
  'reflexes','diving','handling','kicking','throwing','gkPositioning','oneOnOnes','commandOfArea','aerialReach',
  'penaltySaving','sweepingSpeed',
]);
const CORE_BUDGET = ['sprintSpeed','acceleration','agility','dribbling'];

export async function upgradePlayerAttribute(strapi: any, userId: number, playerDocumentId: string, attributeInput: unknown, coinTypeInput: unknown, idempotencyKey: string) {
  if (!idempotencyKey || idempotencyKey.length > 160) throw new Error('X-Idempotency-Key header is required');
  const attribute = String(attributeInput ?? '').trim();
  if (!ALLOWED_ATTRIBUTES.has(attribute)) throw new Error('Unknown or non-upgradeable player attribute');
  const coinType = coinTypeInput === 'diamond' ? 'diamond' : coinTypeInput === 'bronze' ? 'bronze' : null;
  if (!coinType) throw new Error('coin_type must be bronze or diamond');

  const profile = await getProfileForUser(strapi, userId);
  if (!profile || profile.profile_game_status !== 'active') throw new Error('An active PLACO game profile is required');
  const prior = await strapi.db.query(UID.development).findOne({ where: { idempotency_key: idempotencyKey }, populate: { player: true, club_player: { select: ['id', 'documentId'] } } });
  if (prior) {
    if (Number(prior.player?.id ?? prior.player) !== Number(profile.id)) throw new Error('Idempotency key belongs to another player');
    if (String(prior.club_player?.documentId ?? '') !== String(playerDocumentId)) throw new Error('Idempotency key was used for a different player card');
    if (prior.development_metadata?.attribute !== attribute || prior.coin_type_spent !== coinType) throw new Error('Idempotency key was already used for a different attribute or coin type');
    if (prior.development_game_status === 'completed') return { duplicate: true, development: prior };
  }

  let development = prior;
  let ownedPlayer: any;
  if (!development) {
    ownedPlayer = await strapi.db.query(UID.clubPlayer).findOne({
      where: { documentId: playerDocumentId, owner: profile.id, player_game_status: 'owned' },
      populate: { player_template: true, club: true },
    });
    if (!ownedPlayer) throw new Error('Owned player card not found');
    const settings: any = await resolveSettingsForCountry(strapi, profile.country?.id);
    const before = { ...(ownedPlayer.current_attributes ?? ownedPlayer.player_template?.attributes ?? {}) };
    const current = Number(before[attribute]);
    if (!Number.isFinite(current) || current < 1 || current >= 100) throw new Error('This attribute is already at its maximum or is not available for this player');
    if (ownedPlayer.primary_position !== 'GK' && ['reflexes','diving','handling','kicking','throwing','gkPositioning','oneOnOnes','commandOfArea','aerialReach','penaltySaving','sweepingSpeed'].includes(attribute)) {
      throw new Error('Goalkeeper-only attributes can only be upgraded for a goalkeeper');
    }
    const step = Math.max(1, Math.min(5, Number(settings.player_upgrade_attribute_step ?? 1)));
    const next = Math.min(100, current + step);
    const after = { ...before, [attribute]: next };
    const budget = CORE_BUDGET.reduce((sum, key) => sum + Number(after[key] ?? 0), 0);
    if (ownedPlayer.player_tier !== 'elite' && budget > 360) throw new Error('This upgrade would exceed the standard player stat budget');
    const baseCost = Math.max(1, Number(settings.player_upgrade_base_coin_cost ?? 50));
    const growth = Math.max(1, Math.min(2, Number(settings.player_upgrade_cost_growth ?? 1.35)));
    const cost = Math.max(1, Math.ceil(baseCost * Math.pow(growth, Math.max(0, current - 50) / 10)));
    development = await strapi.db.query(UID.development).create({ data: {
      player: profile.id, club_player: ownedPlayer.id, development_type: 'attribute_upgrade', attributes_before: before, attributes_after: after,
      coin_type_spent: coinType, coins_spent: cost, xp_spent: 0, idempotency_key: idempotencyKey, development_game_status: 'pending',
      development_metadata: { attribute, value_before: current, value_after: next, step, next_development_level: Math.min(100, Number(ownedPlayer.development_level ?? 1) + 1), cost_formula: { baseCost, growth }, source: 'player_upgrade_endpoint' },
    } });
  } else {
    const ownedCardId = Number(development.club_player?.id ?? development.club_player);
    ownedPlayer = await strapi.db.query(UID.clubPlayer).findOne({ where: { id: ownedCardId, owner: profile.id }, populate: { player_template: true, club: true } });
    if (!ownedPlayer) throw new Error('Owned player card not found for this development record');
    if (development.development_metadata?.attribute !== attribute || development.coin_type_spent !== coinType) throw new Error('Pending idempotency key must be retried with the same attribute and coin type');
  }

  // Repeating this block after a partial failure is safe: the coin debit and exact after-snapshot are idempotent.
  await changeCoins(strapi, {
    profileId: profile.id, coinType: development.coin_type_spent as 'bronze' | 'diamond', delta: -Number(development.coins_spent),
    ledgerType: 'player_upgrade', sourceType: 'player_development', sourceReference: String(development.documentId ?? development.id),
    idempotencyKey: `player-upgrade:${idempotencyKey}:debit`, note: `Upgrade ${attribute}`,
    metadata: { developmentId: development.documentId ?? development.id, playerCardId: ownedPlayer.documentId ?? ownedPlayer.id },
  });
  const metadata = development.development_metadata ?? {};
  const currentLevel = Number(ownedPlayer.development_level ?? 1);
  const nextLevel = Math.min(100, Number(metadata.next_development_level ?? currentLevel));
  const updatedPlayer = await strapi.db.query(UID.clubPlayer).update({ where: { id: ownedPlayer.id }, data: {
    current_attributes: development.attributes_after, development_level: nextLevel, player_tier: ownedPlayer.player_tier ?? 'standard', primary_position: ownedPlayer.primary_position, player_xp: Number(ownedPlayer.player_xp ?? 0) + Number(metadata.xp_bonus ?? 0), last_trained_at: new Date(),
  } });
  const completed = await strapi.db.query(UID.development).update({ where: { id: development.id }, data: { development_game_status: 'completed' } });
  return { duplicate: false, player: { documentId: updatedPlayer.documentId, slot: updatedPlayer.display_position_number, attributes: updatedPlayer.current_attributes, development_level: updatedPlayer.development_level }, development: completed, cost: { coin_type: coinType, coins: Number(development.coins_spent) } };
}
