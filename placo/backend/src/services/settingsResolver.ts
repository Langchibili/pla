import { UID } from './ids';
const SETTINGS_FIELDS = [
  'initial_bronze_coins','initial_diamond_coins','max_xp_win','max_xp_draw','max_xp_loss','max_xp_training','xp_base_win','xp_base_draw','xp_base_loss',
  'xp_goal_scored_weight','xp_goal_conceded_penalty','xp_possession_weight','xp_pass_accuracy_weight','xp_clean_sheet_bonus','xp_goal_difference_weight',
  'bronze_win_reward','bronze_draw_reward','bronze_loss_reward','training_bronze_reward','max_training_rewards_per_day','max_rewarded_ads_per_day',
  'rewarded_ad_bronze_coins','rewarded_ad_diamond_coins','custom_player_naming_enabled','custom_manager_naming_enabled','restricted_name_match_mode',
  'online_matches_enabled','ranked_matches_enabled','store_enabled','rewarded_ads_enabled','cash_tournaments_enabled','pla_result_callback_enabled',
  'match_engine_signing_required','store_verification_required','ad_server_verification_required','snapshot_retention_days','telemetry_retention_days',
  'matchmaking_ticket_ttl_seconds','max_active_training_sessions','player_upgrade_base_coin_cost','player_upgrade_cost_growth','player_upgrade_attribute_step','economy_rules',
] as const;
export async function resolveSettingsForCountry(strapi: any, countryId?: number | null) {
  const [settings, country] = await Promise.all([
    strapi.db.query(UID.settings).findOne({ populate: { base_currency: true, default_game_ruleset: true, default_physics_profile: true, default_ai_behaviour_profile: true } }),
    countryId ? strapi.db.query(UID.country).findOne({ where: { id: countryId }, populate: { default_currency: true } }) : Promise.resolve(null),
  ]);
  const resolved: Record<string, any> = {};
  for (const field of SETTINGS_FIELDS) {
    const countryOverride = field === 'max_xp_win' ? country?.max_xp_win_override
      : (field === 'max_xp_draw' || field === 'max_xp_loss') ? country?.max_xp_match_override
      : field === 'max_xp_training' ? country?.max_xp_training_override : undefined;
    resolved[field] = countryOverride !== null && countryOverride !== undefined ? countryOverride : settings?.[field];
  }
  resolved.max_xp_win = country?.max_xp_win_override ?? settings?.max_xp_win ?? 100;
  resolved.max_xp_draw = country?.max_xp_match_override ?? settings?.max_xp_draw ?? 65;
  resolved.max_xp_loss = country?.max_xp_match_override ?? settings?.max_xp_loss ?? 35;
  resolved.max_xp_training = country?.max_xp_training_override ?? settings?.max_xp_training ?? 40;
  resolved.initial_bronze_coins = country?.initial_bronze_coins ?? settings?.initial_bronze_coins ?? 500;
  resolved.initial_diamond_coins = country?.initial_diamond_coins ?? settings?.initial_diamond_coins ?? 0;
  resolved.rewarded_ad_bronze_coins = country?.rewarded_ad_bronze_coins_override ?? settings?.rewarded_ad_bronze_coins ?? 20;
  resolved.rewarded_ad_diamond_coins = country?.rewarded_ad_diamond_coins_override ?? settings?.rewarded_ad_diamond_coins ?? 0;
  resolved.max_rewarded_ads_per_day = country?.max_rewarded_ads_per_day_override ?? settings?.max_rewarded_ads_per_day ?? 10;
  resolved.bronze_win_reward = country?.bronze_win_reward_override ?? settings?.bronze_win_reward ?? 35;
  resolved.bronze_draw_reward = country?.bronze_draw_reward_override ?? settings?.bronze_draw_reward ?? 15;
  resolved.bronze_loss_reward = country?.bronze_loss_reward_override ?? settings?.bronze_loss_reward ?? 5;
  resolved.store_enabled = country?.store_enabled_override ?? settings?.store_enabled ?? true;
  resolved.rewarded_ads_enabled = country?.rewarded_ads_enabled_override ?? settings?.rewarded_ads_enabled ?? true;
  resolved.cash_tournaments_enabled = country?.cash_tournaments_allowed ?? settings?.cash_tournaments_enabled ?? false;
  resolved.base_currency = country?.default_currency ?? settings?.base_currency ?? null;
  resolved.country = country ?? null;
  return resolved;
}
