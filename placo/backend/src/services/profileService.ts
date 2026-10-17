import crypto from 'node:crypto';
import { UID } from './ids';
import { resolveSettingsForCountry } from './settingsResolver';
import { getOrCreateWallet, changeCoins } from './walletService';

function safeClubSlug(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || `club-${crypto.randomUUID().slice(0, 8)}`;
}

export async function initializeProfile(strapi: any, userId: number, input: { public_handle?: string; club_name?: string }) {
  const existing = await strapi.db.query(UID.profile).findOne({ where: { user: userId }, populate: { country: { populate: { default_currency: true } }, preferred_currency: true } });
  if (existing?.onboarding_complete) return { created: false, profile: existing };

  const user = await strapi.db.query(UID.user).findOne({
    where: { id: userId },
    populate: { country: { populate: { default_currency: true } }, preferred_currency: true },
  });
  if (!user) throw new Error('Authenticated user was not found');
  const countryId = existing?.country?.id ?? user.country?.id ?? null;
  const settings = await resolveSettingsForCountry(strapi, countryId);
  const currencyId = existing?.preferred_currency?.id ?? user.preferred_currency?.id ?? user.country?.default_currency?.id ?? settings.base_currency?.id ?? null;
  const requestedHandle = typeof input.public_handle === 'string' && input.public_handle.trim() ? input.public_handle.trim().slice(0, 32) : '';
  const handle = existing?.public_handle || requestedHandle || `player-${crypto.randomUUID().slice(0, 8)}`;
  const profile = existing ?? await strapi.db.query(UID.profile).create({
    data: {
      user: userId, pla_user_id: user.pla_external_user_id || undefined, pla_username: user.pla_external_username || undefined, public_handle: handle,
      country: countryId || undefined, preferred_currency: currencyId || undefined,
      profile_game_status: 'active', app_xp: 0, matches_played: 0, wins: 0, draws: 0, losses: 0,
      goals_scored: 0, goals_conceded: 0, clean_sheets: 0, onboarding_complete: false,
    },
  });
  if (existing && (!existing.pla_user_id || !existing.pla_username || !existing.country || !existing.preferred_currency)) {
    await strapi.db.query(UID.profile).update({ where: { id: existing.id }, data: {
      pla_user_id: existing.pla_user_id || user.pla_external_user_id || undefined,
      pla_username: existing.pla_username || user.pla_external_username || undefined,
      country: existing.country?.id ?? countryId ?? undefined,
      preferred_currency: existing.preferred_currency?.id ?? currencyId ?? undefined,
    } });
  }

  const formation = await strapi.db.query(UID.formation).findOne({ where: { formation_code: '4-3-3', formation_game_status: 'active' } });
  const stadium = await strapi.db.query('api::stadium-preset.stadium-preset').findOne({ where: { stadium_code: 'training-ground', stadium_game_status: 'active' } });
  const kit = await strapi.db.query('api::kit-preset.kit-preset').findOne({ where: { kit_code: 'pla-home', kit_game_status: 'active' } });
  const requestedClubName = typeof input.club_name === 'string' ? input.club_name.trim().slice(0, 40) : '';
  const clubName = requestedClubName || 'New Club';
  let club = await strapi.db.query(UID.club).findOne({ where: { owner: profile.id, club_game_status: 'active' } });
  if (!club) {
    club = await strapi.db.query(UID.club).create({
      data: {
        owner: profile.id, club_name: clubName, club_slug: `${safeClubSlug(clubName)}-${String(profile.id)}`,
        club_game_status: 'active', club_rating: 50,
        selected_formation: formation?.id, selected_stadium: stadium?.id, selected_kit: kit?.id,
      },
    });
  } else if (!club.selected_formation || !club.selected_stadium || !club.selected_kit) {
    club = await strapi.db.query(UID.club).update({ where: { id: club.id }, data: {
      selected_formation: club.selected_formation?.id ?? formation?.id,
      selected_stadium: club.selected_stadium?.id ?? stadium?.id,
      selected_kit: club.selected_kit?.id ?? kit?.id,
    } });
  }

  const templates = await strapi.db.query(UID.playerTemplate).findMany({
    where: { template_game_status: 'active', internal_name: { $startsWith: 'starter-slot-' } }, orderBy: { position_number: 'asc' }, limit: 11,
  });
  if (templates.length < 11) throw new Error('PLACO seed data is incomplete: 11 active starter player templates are required');
  for (const template of templates) {
    const position = Number(template.position_number);
    const playerExists = await strapi.db.query(UID.clubPlayer).findOne({ where: { owner: profile.id, club: club.id, player_template: template.id } });
    if (!playerExists) await strapi.db.query(UID.clubPlayer).create({
      data: {
        owner: profile.id, club: club.id, player_template: template.id,
        internal_player_name: `${template.internal_name}-owner-${profile.id}`,
        display_position_number: `P-${position}`, primary_position: template.primary_position,
        squad_role: position <= 11 ? 'starter' : 'reserve', player_game_status: 'owned',
        is_premium: template.premium_tier !== 'standard', player_tier: template.premium_tier ?? 'standard',
        current_attributes: template.attributes, appearance_config: template.appearance_defaults,
        acquisition_source: 'starter', development_level: 1,
      },
    });
  }

  const managerTemplate = await strapi.db.query('api::manager-template.manager-template').findOne({ where: { internal_name: 'default-manager' } });
  if (managerTemplate) {
    let ownedManager = await strapi.db.query('api::club-manager.club-manager').findOne({ where: { owner: profile.id, club: club.id, manager_template: managerTemplate.id } });
    if (!ownedManager) ownedManager = await strapi.db.query('api::club-manager.club-manager').create({ data: {
      owner: profile.id, club: club.id, manager_template: managerTemplate.id, default_name: managerTemplate.display_name,
      manager_game_status: 'active', is_selected: true, experience_level: 1, manager_progression: {},
    } });
    const clubWithManager = await strapi.db.query(UID.club).findOne({ where: { id: club.id }, populate: { selected_manager: true } });
    if (!clubWithManager?.selected_manager) await strapi.db.query(UID.club).update({ where: { id: club.id }, data: { selected_manager: ownedManager.id } });
  }

  await getOrCreateWallet(strapi, profile.id);
  const initialBronze = Math.max(0, Number(settings.initial_bronze_coins ?? 500));
  const initialDiamond = Math.max(0, Number(settings.initial_diamond_coins ?? 0));
  if (initialBronze > 0) await changeCoins(strapi, { profileId: profile.id, coinType: 'bronze', delta: initialBronze, ledgerType: 'welcome_grant', sourceType: 'profile_initialisation', sourceReference: String(profile.documentId ?? profile.id), idempotencyKey: `welcome:${profile.documentId ?? profile.id}:bronze` });
  if (initialDiamond > 0) await changeCoins(strapi, { profileId: profile.id, coinType: 'diamond', delta: initialDiamond, ledgerType: 'welcome_grant', sourceType: 'profile_initialisation', sourceReference: String(profile.documentId ?? profile.id), idempotencyKey: `welcome:${profile.documentId ?? profile.id}:diamond` });
  await strapi.db.query(UID.profile).update({ where: { id: profile.id }, data: { onboarding_complete: true } });
  const [finalProfile, finalWallet, finalClub] = await Promise.all([
    strapi.db.query(UID.profile).findOne({ where: { id: profile.id }, populate: { country: { populate: { default_currency: true } }, preferred_currency: true } }),
    strapi.db.query(UID.wallet).findOne({ where: { player: profile.id } }),
    strapi.db.query(UID.club).findOne({ where: { id: club.id }, populate: { selected_formation: true, selected_stadium: true, selected_kit: true, selected_manager: true } }),
  ]);
  return { created: !existing, profile: { ...finalProfile, club: finalClub, wallet: finalWallet } };
}
