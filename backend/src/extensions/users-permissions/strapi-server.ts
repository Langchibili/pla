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

  const updateUser = plugin.controllers.user.update;
  plugin.controllers.user.update = async (ctx: any) => {
    const userId = Number(ctx.state.user?.id);
    if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();
    if (Number(ctx.params.id) !== userId) return ctx.forbidden();

    const body = ctx.request.body?.data ?? ctx.request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return ctx.badRequest('A profile update object is required');
    }

    const allowed = new Set([
      'country',
      'preferred_currency',
      'in_game_names',
      'push_token',
      'has_completed_tutorial',
    ]);
    if (Object.keys(body).some((key) => !allowed.has(key))) {
      return ctx.badRequest('The profile update contains unsupported fields');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'has_completed_tutorial')
      && typeof body.has_completed_tutorial !== 'boolean') {
      return ctx.badRequest('has_completed_tutorial must be a boolean');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'in_game_names')
      && body.in_game_names !== null
      && (typeof body.in_game_names !== 'object' || Array.isArray(body.in_game_names))) {
      return ctx.badRequest('in_game_names must be an object');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'push_token')
      && body.push_token !== null
      && (typeof body.push_token !== 'string' || body.push_token.length > 4096)) {
      return ctx.badRequest('push_token is invalid');
    }
    for (const field of ['country', 'preferred_currency']) {
      if (Object.prototype.hasOwnProperty.call(body, field)
        && body[field] !== null
        && (!Number.isSafeInteger(Number(body[field])) || Number(body[field]) < 1)) {
        return ctx.badRequest(`${field} must be a valid record id`);
      }
    }

    ctx.request.body = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowed.has(key)),
    );
    return updateUser.call(plugin.controllers.user, ctx);
  };

  return plugin;
};
