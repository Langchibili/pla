const COUNTRY_SETTINGS_UID = 'api::country.country';
const ADMIN_SETTINGS_UID = 'api::admn-settings.admn-settings';

const SETTINGS_FIELDS = [
  'initial_free_plapo',
  'score_on_forfeit',
  'suspended_match_score',
  'suspended_match_points',
  'win_points',
  'draw_points',
  'loss_points',
  'default_match_time_limit_hours',
  'postponement_response_hours',
  'max_postponements_per_match',
  'single_submission_grace_hours',
  'min_ocr_confidence',
  'referral_monthly_cap',
  'transfers_enabled',
  'rates_refresh_minutes',
  'screenshot_retention_days',
  'default_payment_gateway',
  'affiliate_system_enabled',
  'affiliate_reward_points',
  'affiliate_reward_conditions',
] as const;

export async function resolveSettingsForCountry(strapi: any, countryId?: number | null) {
  const adminSettings = await strapi.db.query(ADMIN_SETTINGS_UID).findOne({
    populate: { base_currency: true },
  });
  const country = countryId
    ? await strapi.db.query(COUNTRY_SETTINGS_UID).findOne({
      where: { id: countryId },
      populate: { default_currency: true },
    })
    : null;

  const resolved: Record<string, any> = {};
  for (const field of SETTINGS_FIELDS) {
    const countryValue = country?.[field];
    resolved[field] = countryValue !== null && countryValue !== undefined
      ? countryValue
      : adminSettings?.[field];
  }

  resolved.base_currency = country?.default_currency ?? adminSettings?.base_currency ?? null;
  resolved.payment_gateway = resolved.default_payment_gateway || 'pawapay';
  resolved.country = country ?? null;
  return resolved;
}
