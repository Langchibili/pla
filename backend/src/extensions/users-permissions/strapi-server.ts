export default (plugin: any) => {
  Object.assign(plugin.contentTypes.user.schema.attributes, {
    country: { type: 'relation', relation: 'manyToOne', target: 'api::country.country' },
    preferred_currency: { type: 'relation', relation: 'manyToOne', target: 'api::currency.currency' },
    in_game_names: { type: 'json' },
    has_completed_tutorial: { type: 'boolean', default: false },
    push_token: { type: 'string' },
    phone_number: { type: 'string' },
    phone_verified: { type: 'boolean', default: false },
    user_status: {
      type: 'enumeration',
      enum: ['active', 'flagged', 'suspended', 'banned'],
      default: 'active',
      required: true,
    },
    referral_code: { type: 'string', unique: true },
    referred_by: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::users-permissions.user',
    },
    free_plapo_granted: { type: 'boolean', default: false },
    spendable_balance: { type: 'integer', default: 0, min: 0 },
    transferable_balance: { type: 'integer', default: 0, min: 0 },
  });

  return plugin;
};
