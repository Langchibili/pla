import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    adminPermissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::permission'
    >;
    adminUserOwner: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    kind: Schema.Attribute.Enumeration<['content-api', 'admin']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'content-api'>;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    apiToken: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON & Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    apiTokens: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordTokenExpiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAbuseReportAbuseReport extends Struct.CollectionTypeSchema {
  collectionName: 'abuse_reports';
  info: {
    description: 'Moderation and anti-cheat queue for suspicious match telemetry, names, suspected tampering, abuse and provider reward fraud.';
    displayName: 'Abuse Report';
    pluralName: 'abuse-reports';
    singularName: 'abuse-report';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    evidence_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::abuse-report.abuse-report'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'manyToOne', 'api::match.match'>;
    moderation_game_status: Schema.Attribute.Enumeration<
      ['open', 'under_review', 'actioned', 'dismissed']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'open'>;
    publishedAt: Schema.Attribute.DateTime;
    report_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    report_type: Schema.Attribute.Enumeration<
      [
        'cheating',
        'name_violation',
        'harassment',
        'reward_fraud',
        'match_fixing',
        'other',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'other'>;
    reported_player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    >;
    reporter: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    >;
    resolution_note: Schema.Attribute.Text;
    resolved_at: Schema.Attribute.DateTime;
    reviewed_by_admin_user_id: Schema.Attribute.String;
    severity: Schema.Attribute.Enumeration<
      ['low', 'medium', 'high', 'critical']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'medium'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAdmnSettingsAdmnSettings extends Struct.SingleTypeSchema {
  collectionName: 'admn_settings';
  info: {
    description: 'Global game, economy, safety and tuning defaults resolved after country-specific overrides.';
    displayName: 'Admn Settings';
    pluralName: 'admn-settings-entries';
    singularName: 'admn-settings';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    ad_server_verification_required: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    api_config_revision: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    base_currency: Schema.Attribute.Relation<
      'oneToOne',
      'api::currency.currency'
    >;
    bronze_draw_reward: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<15>;
    bronze_loss_reward: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<5>;
    bronze_win_reward: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<35>;
    cash_tournaments_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    custom_manager_naming_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    custom_player_naming_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    default_ai_behaviour_profile: Schema.Attribute.Relation<
      'manyToOne',
      'api::ai-behaviour-profile.ai-behaviour-profile'
    >;
    default_game_ruleset: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-ruleset.game-ruleset'
    >;
    default_physics_profile: Schema.Attribute.Relation<
      'manyToOne',
      'api::physics-profile.physics-profile'
    >;
    economy_rules: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        diamond_coins_non_farmable: true;
        purchased_items_non_refundable_after_use: true;
        xp_is_not_currency: true;
      }>;
    initial_bronze_coins: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<500>;
    initial_diamond_coins: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::admn-settings.admn-settings'
    > &
      Schema.Attribute.Private;
    match_engine_signing_required: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    matchmaking_ticket_ttl_seconds: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 15;
        },
        number
      > &
      Schema.Attribute.DefaultTo<120>;
    max_active_training_sessions: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    max_rewarded_ads_per_day: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<10>;
    max_training_rewards_per_day: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<5>;
    max_xp_draw: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<65>;
    max_xp_loss: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<35>;
    max_xp_training: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<40>;
    max_xp_win: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<100>;
    online_matches_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    pla_result_callback_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    player_upgrade_attribute_step: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    player_upgrade_base_coin_cost: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<50>;
    player_upgrade_cost_growth: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1.35>;
    publishedAt: Schema.Attribute.DateTime;
    ranked_matches_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    restricted_name_match_mode: Schema.Attribute.Enumeration<
      ['exact', 'normalized', 'fuzzy']
    > &
      Schema.Attribute.DefaultTo<'normalized'>;
    rewarded_ad_bronze_coins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<20>;
    rewarded_ad_diamond_coins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    rewarded_ads_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    snapshot_retention_days: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<180>;
    store_enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    store_verification_required: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    telemetry_retention_days: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<90>;
    training_bronze_reward: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    xp_base_draw: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<25>;
    xp_base_loss: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<10>;
    xp_base_win: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<45>;
    xp_clean_sheet_bonus: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<8>;
    xp_goal_conceded_penalty: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1.5>;
    xp_goal_difference_weight: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<2>;
    xp_goal_scored_weight: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<3>;
    xp_pass_accuracy_weight: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0.08>;
    xp_possession_weight: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0.15>;
  };
}

export interface ApiAiBehaviourProfileAiBehaviourProfile
  extends Struct.CollectionTypeSchema {
  collectionName: 'ai_behaviour_profiles';
  info: {
    description: 'Versioned AI behavior policy covering layered team/player brains, decision weights, perception, role anchors, keeper and referee logic, deterministic RNG and action timing.';
    displayName: 'Ai Behaviour Profile';
    pluralName: 'ai-behaviour-profiles';
    singularName: 'ai-behaviour-profile';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    decision_weights: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        clearance: 0.6;
        dribble: 1;
        intercept: 1;
        pass: 1;
        press: 1;
        shoot: 1;
        throughBall: 1;
      }>;
    determinism_config: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        ballSubsteps: 4;
        fixedTimestep: true;
        seededRandom: true;
        simulationTickHz: 60;
        stableIterationOrder: true;
      }>;
    keeper_config: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        dangerDecisionMs: 33;
        normalDecisionMs: 100;
        perceptionSigmaM: [0.1, 0.8];
        reactionSeconds: [0.15, 0.35];
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::ai-behaviour-profile.ai-behaviour-profile'
    > &
      Schema.Attribute.Private;
    perception_config: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        awarenessConeDeg: 140;
        maxAwarenessDistanceM: 35;
        pressureRadiusM: 4;
        scanHz: 4;
      }>;
    profile_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    profile_game_status: Schema.Attribute.Enumeration<
      ['draft', 'active', 'deprecated']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    profile_name: Schema.Attribute.String & Schema.Attribute.Required;
    profile_version: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1.0.0'>;
    publishedAt: Schema.Attribute.DateTime;
    referee_config: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        advantageDelaySeconds: 2;
        leniency: 0.5;
        reviewLineCrossing: true;
      }>;
    role_behaviours: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        AM: {};
        CB: {};
        CM: {};
        DM: {};
        FB: {};
        GK: {};
        ST: {};
        W: {};
      }>;
    team_brain_config: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        phases: [
          'build_up',
          'progression',
          'final_third',
          'attacking_transition',
          'defensive_transition',
          'defensive_block',
        ];
        playerDecisionHz: 15;
        reactionDelayMs: [120, 350];
        teamDecisionHz: 5;
        urgentPlayerDecisionHz: 30;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAiDifficultyProfileAiDifficultyProfile
  extends Struct.CollectionTypeSchema {
  collectionName: 'ai_difficulty_profiles';
  info: {
    description: 'Difficulty-specific AI overrides: harder levels improve reaction/decision/execution, not football laws or hidden rubber-banding.';
    displayName: 'Ai Difficulty Profile';
    pluralName: 'ai-difficulty-profiles';
    singularName: 'ai-difficulty-profile';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    ai_team: Schema.Attribute.Relation<'manyToOne', 'api::ai-team.ai-team'>;
    awareness_adjustment_percent: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: -100;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    decision_temperature_multiplier: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 0.1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    defensive_line_coordination: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0.9>;
    difficulty_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    difficulty_game_status: Schema.Attribute.Enumeration<
      ['active', 'inactive']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    difficulty_level: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      >;
    difficulty_name: Schema.Attribute.String & Schema.Attribute.Required;
    first_touch_quality_shift: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: -1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    goalkeeper_perception_multiplier: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 0.1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::ai-difficulty-profile.ai-difficulty-profile'
    > &
      Schema.Attribute.Private;
    off_ball_run_timing_jitter_seconds: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0.2>;
    pass_shot_error_multiplier: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 0.1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    pressing_intensity_cap: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0.8>;
    publishedAt: Schema.Attribute.DateTime;
    reaction_time_ms: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 1000;
          min: 50;
        },
        number
      > &
      Schema.Attribute.DefaultTo<200>;
    tackle_probability_threshold: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0.52>;
    team_attribute_overrides: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{}>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAiTeamAiTeam extends Struct.CollectionTypeSchema {
  collectionName: 'ai_teams';
  info: {
    description: 'Admin-authored AI opponent team for training mode, with roster template references and base player/team quality.';
    displayName: 'Ai Team';
    pluralName: 'ai-teams';
    singularName: 'ai-team';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    ai_behaviour_profile: Schema.Attribute.Relation<
      'manyToOne',
      'api::ai-behaviour-profile.ai-behaviour-profile'
    >;
    base_player_attributes: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        acceleration: 65;
        aerialReach: 30;
        aggression: 55;
        agility: 60;
        anticipation: 50;
        attackPositioning: 50;
        balance: 60;
        ballControl: 55;
        commandOfArea: 30;
        composure: 50;
        crossing: 45;
        curve: 45;
        decisions: 50;
        defendPositioning: 45;
        diving: 30;
        dribbling: 55;
        finishing: 45;
        freeKickAccuracy: 40;
        gkPositioning: 30;
        handling: 30;
        headingAccuracy: 50;
        interceptions: 45;
        jumping: 60;
        kicking: 30;
        longPassing: 50;
        longShots: 45;
        marking: 45;
        oneOnOnes: 30;
        penalties: 50;
        penaltySaving: 30;
        reactions: 55;
        reflexes: 30;
        shortPassing: 55;
        shotPower: 60;
        slideTackle: 40;
        sprintSpeed: 65;
        stamina: 65;
        standingTackle: 45;
        strength: 60;
        sweepingSpeed: 30;
        throwing: 30;
        vision: 50;
        volleys: 40;
        weakFoot: 50;
        workRate: 60;
      }>;
    base_team_rating: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<50>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    difficulty_profiles: Schema.Attribute.Relation<
      'oneToMany',
      'api::ai-difficulty-profile.ai-difficulty-profile'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::ai-team.ai-team'
    > &
      Schema.Attribute.Private;
    preferred_formation: Schema.Attribute.Relation<
      'manyToOne',
      'api::formation.formation'
    >;
    publishedAt: Schema.Attribute.DateTime;
    roster_template: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        formationCode: '4-3-3';
        players: [];
      }>;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tactical_profile: Schema.Attribute.Relation<
      'manyToOne',
      'api::tactical-profile.tactical-profile'
    >;
    team_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    team_description: Schema.Attribute.Text;
    team_game_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    team_name: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiClubManagerClubManager extends Struct.CollectionTypeSchema {
  collectionName: 'club_managers';
  info: {
    description: 'Manager instance selected/owned by one PLACO profile; MVP display name is templated unless naming is enabled.';
    displayName: 'Club Manager';
    pluralName: 'club-managers';
    singularName: 'club-manager';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    club: Schema.Attribute.Relation<'manyToOne', 'api::club.club'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    custom_name: Schema.Attribute.String;
    default_name: Schema.Attribute.String & Schema.Attribute.Required;
    experience_level: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    is_selected: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::club-manager.club-manager'
    > &
      Schema.Attribute.Private;
    manager_game_status: Schema.Attribute.Enumeration<
      ['owned', 'active', 'retired']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'owned'>;
    manager_progression: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    manager_template: Schema.Attribute.Relation<
      'manyToOne',
      'api::manager-template.manager-template'
    > &
      Schema.Attribute.Required;
    owner: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiClubPlayerClubPlayer extends Struct.CollectionTypeSchema {
  collectionName: 'club_players';
  info: {
    description: 'Owned player-card instance. MVP shows labels like P-1/P-9; backend keeps unique internal/default names for future customisation.';
    displayName: 'Club Player';
    pluralName: 'club-players';
    singularName: 'club-player';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    acquisition_source: Schema.Attribute.Enumeration<
      ['starter', 'market', 'store', 'reward', 'admin']
    > &
      Schema.Attribute.DefaultTo<'starter'>;
    appearance_config: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    club: Schema.Attribute.Relation<'manyToOne', 'api::club.club'> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    current_attributes: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        acceleration: 65;
        aerialReach: 30;
        aggression: 55;
        agility: 60;
        anticipation: 50;
        attackPositioning: 50;
        balance: 60;
        ballControl: 55;
        commandOfArea: 30;
        composure: 50;
        crossing: 45;
        curve: 45;
        decisions: 50;
        defendPositioning: 45;
        diving: 30;
        dribbling: 55;
        finishing: 45;
        freeKickAccuracy: 40;
        gkPositioning: 30;
        handling: 30;
        headingAccuracy: 50;
        interceptions: 45;
        jumping: 60;
        kicking: 30;
        longPassing: 50;
        longShots: 45;
        marking: 45;
        oneOnOnes: 30;
        penalties: 50;
        penaltySaving: 30;
        reactions: 55;
        reflexes: 30;
        shortPassing: 55;
        shotPower: 60;
        slideTackle: 40;
        sprintSpeed: 65;
        stamina: 65;
        standingTackle: 45;
        strength: 60;
        sweepingSpeed: 30;
        throwing: 30;
        vision: 50;
        volleys: 40;
        weakFoot: 50;
        workRate: 60;
      }>;
    custom_name: Schema.Attribute.String;
    development_level: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    display_position_number: Schema.Attribute.String &
      Schema.Attribute.Required;
    internal_player_name: Schema.Attribute.String & Schema.Attribute.Required;
    is_premium: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    last_trained_at: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::club-player.club-player'
    > &
      Schema.Attribute.Private;
    owner: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    player_game_status: Schema.Attribute.Enumeration<
      ['owned', 'listed', 'injured', 'suspended', 'retired']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'owned'>;
    player_template: Schema.Attribute.Relation<
      'manyToOne',
      'api::player-template.player-template'
    > &
      Schema.Attribute.Required;
    player_tier: Schema.Attribute.Enumeration<
      ['standard', 'premium', 'elite']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'standard'>;
    player_xp: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    primary_position: Schema.Attribute.Enumeration<
      ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'CM'>;
    publishedAt: Schema.Attribute.DateTime;
    squad_role: Schema.Attribute.Enumeration<
      ['starter', 'substitute', 'reserve']
    > &
      Schema.Attribute.DefaultTo<'reserve'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiClubClub extends Struct.CollectionTypeSchema {
  collectionName: 'clubs';
  info: {
    description: 'User-owned football club; links squad, manager, formation, stadium and kit presets.';
    displayName: 'Club';
    pluralName: 'clubs';
    singularName: 'club';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    club_badge_url: Schema.Attribute.String;
    club_game_status: Schema.Attribute.Enumeration<
      ['active', 'suspended', 'archived']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    club_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    club_name: Schema.Attribute.String & Schema.Attribute.Required;
    club_rating: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<50>;
    club_slug: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::club.club'> &
      Schema.Attribute.Private;
    owner: Schema.Attribute.Relation<
      'oneToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    selected_formation: Schema.Attribute.Relation<
      'manyToOne',
      'api::formation.formation'
    >;
    selected_kit: Schema.Attribute.Relation<
      'manyToOne',
      'api::kit-preset.kit-preset'
    >;
    selected_manager: Schema.Attribute.Relation<
      'manyToOne',
      'api::club-manager.club-manager'
    >;
    selected_stadium: Schema.Attribute.Relation<
      'manyToOne',
      'api::stadium-preset.stadium-preset'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCoinLedgerCoinLedger extends Struct.CollectionTypeSchema {
  collectionName: 'coin_ledgers';
  info: {
    description: 'Append-only wallet transaction ledger for earned, spent, granted, reversed and admin-adjusted PLACO Coins.';
    displayName: 'Coin Ledger';
    pluralName: 'coin-ledgers';
    singularName: 'coin-ledger';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    amount_delta: Schema.Attribute.Integer & Schema.Attribute.Required;
    balance_after: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    coin_type: Schema.Attribute.Enumeration<['bronze', 'diamond']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'bronze'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    idempotency_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    ledger_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    ledger_note: Schema.Attribute.Text;
    ledger_type: Schema.Attribute.Enumeration<
      [
        'welcome_grant',
        'match_reward',
        'training_reward',
        'rewarded_ad',
        'market_purchase',
        'store_purchase',
        'refund',
        'admin_adjustment',
        'reversal',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'match_reward'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::coin-ledger.coin-ledger'
    > &
      Schema.Attribute.Private;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    source_reference: Schema.Attribute.String;
    source_type: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    wallet: Schema.Attribute.Relation<
      'manyToOne',
      'api::coin-wallet.coin-wallet'
    > &
      Schema.Attribute.Required;
  };
}

export interface ApiCoinProductCoinProduct extends Struct.CollectionTypeSchema {
  collectionName: 'coin_products';
  info: {
    description: 'Catalog package for in-game coins. Contains coin counts and platform product identifiers; all monetary checkout is performed by the store.';
    displayName: 'Coin Product';
    pluralName: 'coin-products';
    singularName: 'coin-product';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    apple_store_product_id: Schema.Attribute.String;
    bonus_bronze_coins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    bonus_diamond_coins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    bronze_coins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    diamond_coins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    google_play_product_id: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::coin-product.coin-product'
    > &
      Schema.Attribute.Private;
    product_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    product_description: Schema.Attribute.Text;
    product_game_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    product_name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    web_store_product_id: Schema.Attribute.String;
  };
}

export interface ApiCoinWalletCoinWallet extends Struct.CollectionTypeSchema {
  collectionName: 'coin_wallets';
  info: {
    description: 'Server-owned bronze/diamond coin balances. No client write permissions; all changes require ledger entries and idempotency keys.';
    displayName: 'Coin Wallet';
    pluralName: 'coin-wallets';
    singularName: 'coin-wallet';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bronze_balance: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    diamond_balance: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    last_ledger_at: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::coin-wallet.coin-wallet'
    > &
      Schema.Attribute.Private;
    player: Schema.Attribute.Relation<
      'oneToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    wallet_game_status: Schema.Attribute.Enumeration<
      ['active', 'locked', 'closed']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    wallet_revision: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
  };
}

export interface ApiCountryCountry extends Struct.CollectionTypeSchema {
  collectionName: 'countries';
  info: {
    description: 'Country registry patterned after PLA: local currency plus optional overrides for gameplay, rewards, pricing and feature availability.';
    displayName: 'Country';
    pluralName: 'countries';
    singularName: 'country';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bronze_draw_reward_override: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    bronze_loss_reward_override: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    bronze_win_reward_override: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    cash_tournaments_allowed: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    country_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    default_currency: Schema.Attribute.Relation<
      'manyToOne',
      'api::currency.currency'
    >;
    dial_code: Schema.Attribute.String;
    initial_bronze_coins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    initial_diamond_coins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    iso_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 3;
        minLength: 2;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::country.country'
    > &
      Schema.Attribute.Private;
    max_rewarded_ads_per_day_override: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    max_xp_match_override: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    max_xp_training_override: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    max_xp_win_override: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    rewarded_ad_bronze_coins_override: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    rewarded_ad_diamond_coins_override: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    rewarded_ads_enabled_override: Schema.Attribute.Boolean;
    store_enabled_override: Schema.Attribute.Boolean;
    tournament_feature_flags: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{}>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCurrencyCurrency extends Struct.CollectionTypeSchema {
  collectionName: 'currencies';
  info: {
    description: 'Fiat currency codes and cached conversion metadata; display-price conversion only, not a payment processor.';
    displayName: 'Currency';
    pluralName: 'currencies';
    singularName: 'currency';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 3;
        minLength: 3;
      }>;
    countries: Schema.Attribute.Relation<'oneToMany', 'api::country.country'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    is_base: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::currency.currency'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    rate_to_base: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    rate_updated_at: Schema.Attribute.DateTime;
    symbol: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFormationFormation extends Struct.CollectionTypeSchema {
  collectionName: 'formations';
  info: {
    description: 'Versioned tactical formation and coordinates/roles for all 11 pitch slots. Coordinates are normalized 0\u20131 and mirrored by the client when needed.';
    displayName: 'Formation';
    pluralName: 'formations';
    singularName: 'formation';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    formation_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    formation_description: Schema.Attribute.Text;
    formation_game_status: Schema.Attribute.Enumeration<
      ['active', 'inactive']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    formation_layout: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<{
        coordinateSystem: 'normalized-0-1';
        players: [];
      }>;
    formation_name: Schema.Attribute.String & Schema.Attribute.Required;
    formation_version: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::formation.formation'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tactical_tags: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiGameProfileGameProfile extends Struct.CollectionTypeSchema {
  collectionName: 'game_profiles';
  info: {
    description: 'PLACO game identity linked to the Strapi user and optionally mapped to PLA identity; stores XP and aggregate football stats.';
    displayName: 'Game Profile';
    pluralName: 'game-profiles';
    singularName: 'game-profile';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    app_xp: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    clean_sheets: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    country: Schema.Attribute.Relation<'manyToOne', 'api::country.country'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    draws: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    goals_conceded: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    goals_scored: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    last_match_at: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Private;
    losses: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    matches_played: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    onboarding_complete: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    pla_user_id: Schema.Attribute.String & Schema.Attribute.Unique;
    pla_username: Schema.Attribute.String;
    preferred_currency: Schema.Attribute.Relation<
      'manyToOne',
      'api::currency.currency'
    >;
    profile_game_status: Schema.Attribute.Enumeration<
      ['active', 'suspended', 'restricted', 'deleted']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    public_handle: Schema.Attribute.String & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
    wins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface ApiGameRulesetGameRuleset extends Struct.CollectionTypeSchema {
  collectionName: 'game_rulesets';
  info: {
    description: 'Versioned match rule configuration: periods, clock, offside/fouls, substitutions, restart logic and permitted modes.';
    displayName: 'Game Ruleset';
    pluralName: 'game-rulesets';
    singularName: 'game-ruleset';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    added_time_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    allowed_modes: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<
        ['casual', 'ranked', 'training', 'pla_tournament']
      >;
    cards_enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    fouls_enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::game-ruleset.game-ruleset'
    > &
      Schema.Attribute.Private;
    match_length_minutes: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 120;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<90>;
    offside_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    period_count: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 4;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<2>;
    publishedAt: Schema.Attribute.DateTime;
    referee_profile: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    restart_rules: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        corner: true;
        droppedBall: true;
        freeKick: true;
        goalKick: true;
        kickoff: true;
        penalty: true;
        throwIn: true;
      }>;
    ruleset_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    ruleset_game_status: Schema.Attribute.Enumeration<
      ['draft', 'active', 'deprecated']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    ruleset_name: Schema.Attribute.String & Schema.Attribute.Required;
    ruleset_version: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1.0.0'>;
    substitution_limit: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 15;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<5>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiKitPresetKitPreset extends Struct.CollectionTypeSchema {
  collectionName: 'kit_presets';
  info: {
    description: 'Admin-managed home/away kit colors and asset keys.';
    displayName: 'Kit Preset';
    pluralName: 'kit-presets';
    singularName: 'kit-preset';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    kit_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    kit_game_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.DefaultTo<'active'>;
    kit_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    kit_name: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::kit-preset.kit-preset'
    > &
      Schema.Attribute.Private;
    pattern_key: Schema.Attribute.String;
    primary_color: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'#FFFFFF'>;
    publishedAt: Schema.Attribute.DateTime;
    secondary_color: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'#111111'>;
    trim_color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#00AA55'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLeaderboardEntryLeaderboardEntry
  extends Struct.CollectionTypeSchema {
  collectionName: 'leaderboard_entries';
  info: {
    description: 'Materialized ranking row by app XP with deterministic tie breakers and optional season/region/PLA public profile grouping.';
    displayName: 'Leaderboard Entry';
    pluralName: 'leaderboard-entries';
    singularName: 'leaderboard-entry';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    app_xp: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    country: Schema.Attribute.Relation<'manyToOne', 'api::country.country'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    goal_difference: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    last_calculated_at: Schema.Attribute.DateTime;
    leaderboard_code: Schema.Attribute.String & Schema.Attribute.Required;
    leaderboard_metadata: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{}>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::leaderboard-entry.leaderboard-entry'
    > &
      Schema.Attribute.Private;
    matches_played: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    rank_position: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    season_key: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'all_time'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    wins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface ApiManagerTemplateManagerTemplate
  extends Struct.CollectionTypeSchema {
  collectionName: 'manager_templates';
  info: {
    description: 'Admin-authored manager archetypes and tactical bonuses, not licensed-person identities.';
    displayName: 'Manager Template';
    pluralName: 'manager-templates';
    singularName: 'manager-template';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    attribute_modifiers: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        adaptability: 50;
        motivation: 50;
        tacticalAwareness: 50;
        trainingQuality: 50;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    display_name: Schema.Attribute.String & Schema.Attribute.Required;
    internal_name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::manager-template.manager-template'
    > &
      Schema.Attribute.Private;
    manager_archetype: Schema.Attribute.Enumeration<
      [
        'balanced',
        'possession',
        'counter_attack',
        'pressing',
        'defensive',
        'direct',
        'youth_development',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'balanced'>;
    premium_tier: Schema.Attribute.Enumeration<
      ['standard', 'premium', 'elite']
    > &
      Schema.Attribute.DefaultTo<'standard'>;
    publishedAt: Schema.Attribute.DateTime;
    tactical_preferences: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{}>;
    template_game_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.DefaultTo<'active'>;
    unlock_currency: Schema.Attribute.Enumeration<
      ['bronze', 'diamond', 'none']
    > &
      Schema.Attribute.DefaultTo<'bronze'>;
    unlock_price_coins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMarketOfferMarketOffer extends Struct.CollectionTypeSchema {
  collectionName: 'market_offers';
  info: {
    description: 'Coin-priced marketplace offer for a player, manager or stadium. Diamond and bronze balances remain distinct and cannot be interchanged.';
    displayName: 'Market Offer';
    pluralName: 'market-offers';
    singularName: 'market-offer';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    available_from: Schema.Attribute.DateTime;
    available_until: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    kit_preset: Schema.Attribute.Relation<
      'manyToOne',
      'api::kit-preset.kit-preset'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::market-offer.market-offer'
    > &
      Schema.Attribute.Private;
    manager_template: Schema.Attribute.Relation<
      'manyToOne',
      'api::manager-template.manager-template'
    >;
    offer_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    offer_game_status: Schema.Attribute.Enumeration<
      ['active', 'inactive', 'sold_out', 'scheduled']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    offer_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    offer_name: Schema.Attribute.String & Schema.Attribute.Required;
    offer_type: Schema.Attribute.Enumeration<
      ['player', 'manager', 'stadium', 'kit']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'player'>;
    per_player_limit: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    player_template: Schema.Attribute.Relation<
      'manyToOne',
      'api::player-template.player-template'
    >;
    price_coin_type: Schema.Attribute.Enumeration<['bronze', 'diamond']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'bronze'>;
    price_coins: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    stadium_preset: Schema.Attribute.Relation<
      'manyToOne',
      'api::stadium-preset.stadium-preset'
    >;
    stock_limit: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    stock_sold: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMarketPurchaseMarketPurchase
  extends Struct.CollectionTypeSchema {
  collectionName: 'market_purchases';
  info: {
    description: 'Idempotent marketplace purchase and grant record, tying a single coin debit to the resulting owned item.';
    displayName: 'Market Purchase';
    pluralName: 'market-purchases';
    singularName: 'market-purchase';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    coin_type_paid: Schema.Attribute.Enumeration<['bronze', 'diamond']> &
      Schema.Attribute.Required;
    coins_paid: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    granted_club_manager: Schema.Attribute.Relation<
      'manyToOne',
      'api::club-manager.club-manager'
    >;
    granted_club_player: Schema.Attribute.Relation<
      'manyToOne',
      'api::club-player.club-player'
    >;
    idempotency_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::market-purchase.market-purchase'
    > &
      Schema.Attribute.Private;
    market_offer: Schema.Attribute.Relation<
      'manyToOne',
      'api::market-offer.market-offer'
    > &
      Schema.Attribute.Required;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    purchase_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    purchase_game_status: Schema.Attribute.Enumeration<
      ['created', 'paid', 'granted', 'failed', 'reversed']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'created'>;
    purchase_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMatchEventMatchEvent extends Struct.CollectionTypeSchema {
  collectionName: 'match_events';
  info: {
    description: 'Timestamped authoritative match event stream for goals, cards, substitutions, shots, referee decisions and replay markers.';
    displayName: 'Match Event';
    pluralName: 'match-events';
    singularName: 'match-event';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    actor_player_id: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    event_hash: Schema.Attribute.String;
    event_payload: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    event_sequence: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    event_type: Schema.Attribute.Enumeration<
      [
        'kickoff',
        'goal',
        'own_goal',
        'shot',
        'save',
        'pass',
        'tackle',
        'foul',
        'yellow_card',
        'red_card',
        'offside',
        'corner',
        'free_kick',
        'penalty',
        'substitution',
        'injury',
        'post_hit',
        'bar_hit',
        'line_cross',
        'half_time',
        'full_time',
        'review_marker',
        'other',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'other'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::match-event.match-event'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'manyToOne', 'api::match.match'> &
      Schema.Attribute.Required;
    period_number: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    position_payload: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    simulation_time_seconds: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    target_player_id: Schema.Attribute.String;
    team_side: Schema.Attribute.Enumeration<['home', 'away', 'neutral']> &
      Schema.Attribute.DefaultTo<'neutral'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMatchReplayMatchReplay extends Struct.CollectionTypeSchema {
  collectionName: 'match_replays';
  info: {
    description: 'Replay index for approved deterministic event replays; store large replay blobs in object storage and save a URI plus cryptographic hashes here.';
    displayName: 'Match Replay';
    pluralName: 'match-replays';
    singularName: 'match-replay';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    event_stream_hash: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::match-replay.match-replay'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'manyToOne', 'api::match.match'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    replay_blob_hash: Schema.Attribute.String;
    replay_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    replay_format_version: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1.0.0'>;
    replay_game_status: Schema.Attribute.Enumeration<
      ['pending', 'available', 'purged', 'invalid']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    replay_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    replay_uri: Schema.Attribute.String;
    retention_until: Schema.Attribute.DateTime;
    roster_snapshot_hash: Schema.Attribute.String & Schema.Attribute.Required;
    simulation_seed: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMatchResultVerificationMatchResultVerification
  extends Struct.CollectionTypeSchema {
  collectionName: 'match_result_verifications';
  info: {
    description: 'Audit record for trusted match-engine result assertions, signature verification, replay/snapshot hash checks and rejection reasons.';
    displayName: 'Match Result Verification';
    pluralName: 'match-result-verifications';
    singularName: 'match-result-verification';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    computed_result_digest: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    event_sequence_valid: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::match-result-verification.match-result-verification'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'manyToOne', 'api::match.match'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    received_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    result_submission_id: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    result_validation_status: Schema.Attribute.Enumeration<
      ['received', 'verified', 'rejected']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'received'>;
    roster_hash_match: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    signature_digest: Schema.Attribute.String & Schema.Attribute.Required;
    signature_key_id: Schema.Attribute.String;
    snapshot_hash_match: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    submitted_result: Schema.Attribute.JSON & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    validation_errors: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    verified_at: Schema.Attribute.DateTime;
  };
}

export interface ApiMatchTelemetryMatchTelemetry
  extends Struct.CollectionTypeSchema {
  collectionName: 'match_telemetry';
  info: {
    description: 'Compact aggregated in-match telemetry for balance calibration and suspicious-result review, avoiding large per-frame uploads.';
    displayName: 'Match Telemetry';
    pluralName: 'match-telemetry-records';
    singularName: 'match-telemetry';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    client_fps_avg: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 240;
          min: 0;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    event_count: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::match-telemetry.match-telemetry'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'manyToOne', 'api::match.match'> &
      Schema.Attribute.Required;
    payload_hash: Schema.Attribute.String;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    >;
    publishedAt: Schema.Attribute.DateTime;
    received_at: Schema.Attribute.DateTime;
    simulation_ticks: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    team_side: Schema.Attribute.Enumeration<['home', 'away', 'neutral']> &
      Schema.Attribute.DefaultTo<'neutral'>;
    telemetry_payload: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<{}>;
    telemetry_schema_version: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1.0.0'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMatchMatch extends Struct.CollectionTypeSchema {
  collectionName: 'matches';
  info: {
    description: 'Canonical online, ranked, training or PLA fixture match. Stores immutable roster/rules/physics snapshots and the authoritative final score/metrics.';
    displayName: 'Match';
    pluralName: 'matches';
    singularName: 'match';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    ai_behaviour_profile: Schema.Attribute.Relation<
      'manyToOne',
      'api::ai-behaviour-profile.ai-behaviour-profile'
    >;
    ai_snapshot: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    away_club: Schema.Attribute.Relation<'manyToOne', 'api::club.club'>;
    away_player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    >;
    away_score: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    coin_rewards_granted: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    finalisation_idempotency_key: Schema.Attribute.String &
      Schema.Attribute.Unique;
    game_ruleset: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-ruleset.game-ruleset'
    >;
    home_club: Schema.Attribute.Relation<'manyToOne', 'api::club.club'> &
      Schema.Attribute.Required;
    home_player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    home_score: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::match.match'> &
      Schema.Attribute.Private;
    match_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    match_ended_at: Schema.Attribute.DateTime;
    match_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    match_mode: Schema.Attribute.Enumeration<
      ['casual', 'ranked', 'training', 'pla_tournament']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'casual'>;
    match_started_at: Schema.Attribute.DateTime;
    match_status: Schema.Attribute.Enumeration<
      [
        'created',
        'ready',
        'in_progress',
        'awaiting_verification',
        'verified',
        'rejected',
        'abandoned',
        'cancelled',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'created'>;
    physics_curve_set: Schema.Attribute.Relation<
      'manyToOne',
      'api::physics-curve-set.physics-curve-set'
    >;
    physics_profile: Schema.Attribute.Relation<
      'manyToOne',
      'api::physics-profile.physics-profile'
    >;
    physics_snapshot: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    physics_snapshot_hash: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    result_digest: Schema.Attribute.String;
    result_metrics: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    result_validation_status: Schema.Attribute.Enumeration<
      ['not_submitted', 'pending', 'verified', 'rejected']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'not_submitted'>;
    roster_snapshot: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<{}>;
    roster_snapshot_hash: Schema.Attribute.String & Schema.Attribute.Required;
    rules_snapshot: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    simulation_build: Schema.Attribute.String;
    simulation_seed: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    verified_at: Schema.Attribute.DateTime;
    xp_granted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface ApiMatchmakingTicketMatchmakingTicket
  extends Struct.CollectionTypeSchema {
  collectionName: 'matchmaking_tickets';
  info: {
    description: 'Short-lived queue ticket for online versus matchmaking. Filters on mode, region and rating; paired ticket IDs are consumed idempotently.';
    displayName: 'Matchmaking Ticket';
    pluralName: 'matchmaking-tickets';
    singularName: 'matchmaking-ticket';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    club: Schema.Attribute.Relation<'manyToOne', 'api::club.club'> &
      Schema.Attribute.Required;
    country: Schema.Attribute.Relation<'manyToOne', 'api::country.country'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expires_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    idempotency_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::matchmaking-ticket.matchmaking-ticket'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'manyToOne', 'api::match.match'>;
    match_mode: Schema.Attribute.Enumeration<
      ['casual', 'ranked', 'pla_tournament']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'casual'>;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    queued_at: Schema.Attribute.DateTime;
    rating_at_queue: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    region_code: Schema.Attribute.String;
    search_range: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<200>;
    ticket_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    ticket_game_status: Schema.Attribute.Enumeration<
      ['queued', 'paired', 'cancelled', 'expired']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'queued'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiNotificationNotification
  extends Struct.CollectionTypeSchema {
  collectionName: 'notifications';
  info: {
    description: 'In-app notification delivery for match invites/results, rewards, store receipts and PLA fixture changes.';
    displayName: 'Notification';
    pluralName: 'notifications';
    singularName: 'notification';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    delivery_game_status: Schema.Attribute.Enumeration<
      ['pending', 'sent', 'failed']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'sent'>;
    idempotency_key: Schema.Attribute.String & Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::notification.notification'
    > &
      Schema.Attribute.Private;
    notification_type: Schema.Attribute.String & Schema.Attribute.Required;
    payload: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    read_at: Schema.Attribute.DateTime;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPhysicsCurveSetPhysicsCurveSet
  extends Struct.CollectionTypeSchema {
  collectionName: 'physics_curve_sets';
  info: {
    description: 'Versioned piecewise-linear attribute-to-physics curves. Match snapshots freeze curve version and hash at kickoff.';
    displayName: 'Physics Curve Set';
    pluralName: 'physics-curve-sets';
    singularName: 'physics-curve-set';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    curve_definitions: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<{
        accelerationTau: [[1, 1.5425], [50, 1.175], [100, 0.8]];
        firstTouchQuality: [[1, 0.31], [50, 0.65], [100, 0.95]];
        lateralAcceleration: [[1, 5.6], [50, 7.1], [100, 8.9]];
        topSpeed: [[1, 7.627], [50, 8.95], [100, 10.3]];
      }>;
    curve_game_status: Schema.Attribute.Enumeration<
      ['draft', 'active', 'deprecated']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    curve_set_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    curve_set_version: Schema.Attribute.String & Schema.Attribute.Required;
    global_scales: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        agilityScale: 1;
        errorScale: 1;
        paceScale: 1;
        staminaScale: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::physics-curve-set.physics-curve-set'
    > &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPhysicsProfilePhysicsProfile
  extends Struct.CollectionTypeSchema {
  collectionName: 'physics_profiles';
  info: {
    description: 'Versioned physics constants consumed by Babylon.js: pitch, ball forces/spin, contacts, ground, locomotion, tackling, keeper and camera defaults.';
    displayName: 'Physics Profile';
    pluralName: 'physics-profiles';
    singularName: 'physics-profile';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    ball_spec: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        airDensity: 1.225;
        dragCoefficient: 0.25;
        grassFriction: 0.5;
        gravityMps2: 9.81;
        groundRestitution: 0.57;
        inertiaKgM2: 0.00347;
        magnusScale: 1;
        massKg: 0.43;
        radiusM: 0.11;
        rollingResistanceMps2: 1.5;
        spinDecayPerSecond: 0.15;
        substepsPerTick: 4;
        tickRateHz: 60;
      }>;
    camera_spec: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        availableModes: [
          'tv',
          'sideline',
          'ball',
          'goal_to_goal',
          'top_down',
          'set_piece',
          'replay',
        ];
        defaultMode: 'tv';
        springDamping: 1;
        tuning: {};
      }>;
    contact_spec: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        chestRestitution: 0.15;
        footRestitution: 0.5;
        headRestitution: 0.4;
        netRestitution: 0.05;
        postRadiusM: 0.06;
        sweptCollisionEnabled: true;
        thighRestitution: 0.2;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    effective_from: Schema.Attribute.DateTime;
    global_scales: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        agilityScale: 1;
        ballSpeedScale: 1;
        errorScale: 1;
        paceScale: 1;
        staminaScale: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::physics-profile.physics-profile'
    > &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text;
    pitch_spec: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        goalHeightM: 2.44;
        goalWidthM: 7.32;
        lengthM: 105;
        penaltyAreaDepthM: 16.5;
        penaltyAreaWidthM: 40.32;
        penaltySpotM: 11;
        wallDistanceM: 9.15;
        widthM: 68;
      }>;
    player_motion_spec: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        brakingMps2: 11;
        capsuleHeightM: 1.8;
        capsuleRadiusM: 0.3;
        jogMps: 3.5;
        lateralAccelMps2: 10;
        longitudinalAccelMps2: 7;
        runMps: 6;
        sprintMps: 9;
        staminaSpeedFloor: 0.85;
        turnRateDegPerSecond: 720;
      }>;
    profile_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    profile_game_status: Schema.Attribute.Enumeration<
      ['draft', 'active', 'deprecated']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    profile_name: Schema.Attribute.String & Schema.Attribute.Required;
    profile_version: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'1.0.0'>;
    publishedAt: Schema.Attribute.DateTime;
    realism_preset: Schema.Attribute.Enumeration<
      ['arcade', 'contextual', 'weighty']
    > &
      Schema.Attribute.DefaultTo<'contextual'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPlaFixtureLinkPlaFixtureLink
  extends Struct.CollectionTypeSchema {
  collectionName: 'pla_fixture_links';
  info: {
    description: 'Idempotent cross-backend mapping between a PLA tournament fixture and one PLACO match. PLA owns standings and cash-prize eligibility/payouts.';
    displayName: 'Pla Fixture Link';
    pluralName: 'pla-fixture-links';
    singularName: 'pla-fixture-link';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    assignment_idempotency_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    away_pla_user_id: Schema.Attribute.String & Schema.Attribute.Required;
    away_player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    cash_prize_managed_by_pla: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    fixture_game_status: Schema.Attribute.Enumeration<
      [
        'assigned',
        'ready',
        'in_progress',
        'result_pending',
        'result_sent',
        'cancelled',
        'rejected',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'assigned'>;
    fixture_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    home_pla_user_id: Schema.Attribute.String & Schema.Attribute.Required;
    home_player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    last_sync_error: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::pla-fixture-link.pla-fixture-link'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'oneToOne', 'api::match.match'>;
    match_rules: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    pla_fixture_id: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    pla_signed_payload_hash: Schema.Attribute.String &
      Schema.Attribute.Required;
    pla_stage_id: Schema.Attribute.String;
    pla_tournament_id: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    result_sent_at: Schema.Attribute.DateTime;
    scheduled_at: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPlaOutboxEventPlaOutboxEvent
  extends Struct.CollectionTypeSchema {
  collectionName: 'pla_outbox_events';
  info: {
    description: 'Durable outbox to send signed verified results and lifecycle events to PLA with retries and idempotent event keys.';
    displayName: 'Pla Outbox Event';
    pluralName: 'pla-outbox-events';
    singularName: 'pla-outbox-event';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    attempt_count: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    delivered_at: Schema.Attribute.DateTime;
    delivery_game_status: Schema.Attribute.Enumeration<
      ['pending', 'sending', 'delivered', 'retryable_error', 'dead_letter']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    event_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    event_payload: Schema.Attribute.JSON & Schema.Attribute.Required;
    event_payload_hash: Schema.Attribute.String & Schema.Attribute.Required;
    event_type: Schema.Attribute.Enumeration<
      [
        'fixture_accepted',
        'match_started',
        'match_verified',
        'match_rejected',
        'player_profile_sync',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'match_verified'>;
    idempotency_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    last_attempt_at: Schema.Attribute.DateTime;
    last_error: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::pla-outbox-event.pla-outbox-event'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'manyToOne', 'api::match.match'>;
    next_attempt_at: Schema.Attribute.DateTime;
    pla_fixture_link: Schema.Attribute.Relation<
      'manyToOne',
      'api::pla-fixture-link.pla-fixture-link'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPlayerDevelopmentRecordPlayerDevelopmentRecord
  extends Struct.CollectionTypeSchema {
  collectionName: 'player_development_records';
  info: {
    description: 'Append-only player progression audit record for upgrades, skill-point changes, premium unlocks or recovery from admin corrections.';
    displayName: 'Player Development Record';
    pluralName: 'player-development-records';
    singularName: 'player-development-record';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    attributes_after: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    attributes_before: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    club_player: Schema.Attribute.Relation<
      'manyToOne',
      'api::club-player.club-player'
    > &
      Schema.Attribute.Required;
    coin_type_spent: Schema.Attribute.Enumeration<
      ['bronze', 'diamond', 'none']
    > &
      Schema.Attribute.DefaultTo<'none'>;
    coins_spent: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    development_game_status: Schema.Attribute.Enumeration<
      ['pending', 'completed', 'failed']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    development_metadata: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{}>;
    development_type: Schema.Attribute.Enumeration<
      [
        'training',
        'level_up',
        'attribute_upgrade',
        'premium_unlock',
        'admin_adjustment',
        'reversal',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'training'>;
    idempotency_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::player-development-record.player-development-record'
    > &
      Schema.Attribute.Private;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    xp_spent: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface ApiPlayerTemplatePlayerTemplate
  extends Struct.CollectionTypeSchema {
  collectionName: 'player_templates';
  info: {
    description: 'Admin-created player archetype/card with default identity, position slot, physical measurements and the full 1\u2013100 attribute set.';
    displayName: 'Player Template';
    pluralName: 'player-templates';
    singularName: 'player-template';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    appearance_defaults: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        hairStyle: 'short';
        kitVariant: 'default';
        modelKey: 'player-default-v1';
        skinTone: 'default';
      }>;
    asset_bundle_key: Schema.Attribute.String;
    attributes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<{
        acceleration: 65;
        aerialReach: 30;
        aggression: 55;
        agility: 60;
        anticipation: 50;
        attackPositioning: 50;
        balance: 60;
        ballControl: 55;
        commandOfArea: 30;
        composure: 50;
        crossing: 45;
        curve: 45;
        decisions: 50;
        defendPositioning: 45;
        diving: 30;
        dribbling: 55;
        finishing: 45;
        freeKickAccuracy: 40;
        gkPositioning: 30;
        handling: 30;
        headingAccuracy: 50;
        interceptions: 45;
        jumping: 60;
        kicking: 30;
        longPassing: 50;
        longShots: 45;
        marking: 45;
        oneOnOnes: 30;
        penalties: 50;
        penaltySaving: 30;
        reactions: 55;
        reflexes: 30;
        shortPassing: 55;
        shotPower: 60;
        slideTackle: 40;
        sprintSpeed: 65;
        stamina: 65;
        standingTackle: 45;
        strength: 60;
        sweepingSpeed: 30;
        throwing: 30;
        vision: 50;
        volleys: 40;
        weakFoot: 50;
        workRate: 60;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    display_name: Schema.Attribute.String & Schema.Attribute.Required;
    goalkeeper_attributes: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        aerialReach: 30;
        commandOfArea: 30;
        diving: 30;
        handling: 30;
        kicking: 30;
        oneOnOnes: 30;
        penaltySaving: 30;
        positioning: 30;
        reflexes: 30;
        sweepingSpeed: 30;
        throwing: 30;
      }>;
    height_cm: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 205;
          min: 160;
        },
        number
      > &
      Schema.Attribute.DefaultTo<180>;
    internal_name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::player-template.player-template'
    > &
      Schema.Attribute.Private;
    overall_rating: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<50>;
    player_archetype: Schema.Attribute.Enumeration<
      [
        'keeper',
        'defender',
        'fullback',
        'defensive_midfielder',
        'midfielder',
        'attacking_midfielder',
        'winger',
        'striker',
      ]
    > &
      Schema.Attribute.DefaultTo<'midfielder'>;
    position_number: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 99;
          min: 1;
        },
        number
      >;
    preferred_foot: Schema.Attribute.Enumeration<['L', 'R']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'R'>;
    premium_tier: Schema.Attribute.Enumeration<
      ['standard', 'premium', 'elite']
    > &
      Schema.Attribute.DefaultTo<'standard'>;
    primary_position: Schema.Attribute.Enumeration<
      ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'CM'>;
    publishedAt: Schema.Attribute.DateTime;
    secondary_positions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    template_game_status: Schema.Attribute.Enumeration<
      ['active', 'inactive', 'retired']
    > &
      Schema.Attribute.DefaultTo<'active'>;
    traits: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    weight_kg: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 55;
        },
        number
      > &
      Schema.Attribute.DefaultTo<75>;
  };
}

export interface ApiPlayerTrainingRecordPlayerTrainingRecord
  extends Struct.CollectionTypeSchema {
  collectionName: 'player_training_records';
  info: {
    description: 'Player-level training drill outcome, skill focus, coach/AI session reference and progression deltas.';
    displayName: 'Player Training Record';
    pluralName: 'player-training-records';
    singularName: 'player-training-record';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    attribute_deltas: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    club_player: Schema.Attribute.Relation<
      'manyToOne',
      'api::club-player.club-player'
    > &
      Schema.Attribute.Required;
    completed_at: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::player-training-record.player-training-record'
    > &
      Schema.Attribute.Private;
    performance_score: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    record_idempotency_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    training_focus: Schema.Attribute.Enumeration<
      [
        'pace',
        'shooting',
        'passing',
        'dribbling',
        'defending',
        'goalkeeping',
        'stamina',
        'balanced',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'balanced'>;
    training_session: Schema.Attribute.Relation<
      'manyToOne',
      'api::training-session.training-session'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    xp_earned: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface ApiRestrictedNameRestrictedName
  extends Struct.CollectionTypeSchema {
  collectionName: 'restricted_names';
  info: {
    description: 'Curated and expandable blocked names/aliases for famous people, clubs, player personas or protected names; MVP custom naming remains disabled.';
    displayName: 'Restricted Name';
    pluralName: 'restricted-names';
    singularName: 'restricted-name';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    aliases: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    display_term: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::restricted-name.restricted-name'
    > &
      Schema.Attribute.Private;
    matching_mode: Schema.Attribute.Enumeration<
      ['exact', 'normalized', 'token', 'fuzzy']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'normalized'>;
    normalized_term: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    reason: Schema.Attribute.Text;
    term_category: Schema.Attribute.Enumeration<
      ['person', 'footballer', 'club', 'manager', 'brand', 'other']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'person'>;
    term_game_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRewardedAdImpressionRewardedAdImpression
  extends Struct.CollectionTypeSchema {
  collectionName: 'rewarded_ad_impressions';
  info: {
    description: 'One rewarded-ad attempt with a server nonce, provider callback identity, replay prevention and final coin reward ledger reference.';
    displayName: 'Rewarded Ad Impression';
    pluralName: 'rewarded-ad-impressions';
    singularName: 'rewarded-ad-impression';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    ad_unit_id: Schema.Attribute.String & Schema.Attribute.Required;
    client_session_hash: Schema.Attribute.String;
    coin_amount_rewarded: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    coin_ledger: Schema.Attribute.Relation<
      'manyToOne',
      'api::coin-ledger.coin-ledger'
    >;
    coin_type_rewarded: Schema.Attribute.Enumeration<['bronze', 'diamond']> &
      Schema.Attribute.DefaultTo<'bronze'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expires_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    impression_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    impression_game_status: Schema.Attribute.Enumeration<
      [
        'started',
        'completed_client_side',
        'server_verified',
        'rewarded',
        'rejected',
        'expired',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'started'>;
    impression_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::rewarded-ad-impression.rewarded-ad-impression'
    > &
      Schema.Attribute.Private;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    provider: Schema.Attribute.Relation<
      'manyToOne',
      'api::rewarded-ad-provider.rewarded-ad-provider'
    > &
      Schema.Attribute.Required;
    provider_callback_hash: Schema.Attribute.String;
    provider_transaction_id: Schema.Attribute.String & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    rejection_reason: Schema.Attribute.String;
    server_nonce_hash: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    started_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    verified_at: Schema.Attribute.DateTime;
  };
}

export interface ApiRewardedAdProviderRewardedAdProvider
  extends Struct.CollectionTypeSchema {
  collectionName: 'rewarded_ad_providers';
  info: {
    description: 'Provider configuration for AdMob/Unity/AppLovin/IronSource/custom rewarded ads; secrets remain in environment/secret storage, never in this content type.';
    displayName: 'Rewarded Ad Provider';
    pluralName: 'rewarded-ad-providers';
    singularName: 'rewarded-ad-provider';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    allowed_ad_unit_ids: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    bronze_reward_amount: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<20>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    diamond_reward_amount: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    environment_secret_key_name: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::rewarded-ad-provider.rewarded-ad-provider'
    > &
      Schema.Attribute.Private;
    max_rewards_per_player_day: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<10>;
    minimum_interval_seconds: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<30>;
    provider_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    provider_game_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'inactive'>;
    provider_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    provider_name: Schema.Attribute.String & Schema.Attribute.Required;
    provider_type: Schema.Attribute.Enumeration<
      ['admob', 'unity_ads', 'applovin', 'iron_source', 'custom']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'admob'>;
    publishedAt: Schema.Attribute.DateTime;
    server_verification_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiStadiumPresetStadiumPreset
  extends Struct.CollectionTypeSchema {
  collectionName: 'stadium_presets';
  info: {
    description: 'Selectable lightweight stadium/pitch visual preset; MVP presets omit crowds/seating for mobile performance.';
    displayName: 'Stadium Preset';
    pluralName: 'stadium-presets';
    singularName: 'stadium-preset';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    lighting_profile: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::stadium-preset.stadium-preset'
    > &
      Schema.Attribute.Private;
    pitch_length_m: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 115;
          min: 95;
        },
        number
      > &
      Schema.Attribute.DefaultTo<105>;
    pitch_surface: Schema.Attribute.Enumeration<
      ['dry_grass', 'wet_grass', 'heavy_grass', 'artificial']
    > &
      Schema.Attribute.DefaultTo<'dry_grass'>;
    pitch_width_m: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 75;
          min: 60;
        },
        number
      > &
      Schema.Attribute.DefaultTo<68>;
    publishedAt: Schema.Attribute.DateTime;
    stadium_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    stadium_features: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        advertisingText: 'PRO LEAGUE AFRICA';
        crowdEnabled: false;
        standsEnabled: false;
      }>;
    stadium_game_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.DefaultTo<'active'>;
    stadium_name: Schema.Attribute.String & Schema.Attribute.Required;
    unlock_currency: Schema.Attribute.Enumeration<
      ['bronze', 'diamond', 'none']
    > &
      Schema.Attribute.DefaultTo<'bronze'>;
    unlock_price_coins: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    visual_asset_key: Schema.Attribute.String;
  };
}

export interface ApiStoreProductOfferStoreProductOffer
  extends Struct.CollectionTypeSchema {
  collectionName: 'store_product_offers';
  info: {
    description: 'Country/currency specific display-price offer mapped to a store product SKU. A price quote is not a charge and never issues coins.';
    displayName: 'Store Product Offer';
    pluralName: 'store-product-offers';
    singularName: 'store-product-offer';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    coin_product: Schema.Attribute.Relation<
      'manyToOne',
      'api::coin-product.coin-product'
    > &
      Schema.Attribute.Required;
    country: Schema.Attribute.Relation<'manyToOne', 'api::country.country'> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Relation<'manyToOne', 'api::currency.currency'> &
      Schema.Attribute.Required;
    display_price: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    display_price_label: Schema.Attribute.String;
    effective_from: Schema.Attribute.DateTime;
    effective_until: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::store-product-offer.store-product-offer'
    > &
      Schema.Attribute.Private;
    offer_game_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    offer_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    provider_product_id: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    store_provider: Schema.Attribute.Enumeration<
      ['google_play', 'apple_app_store', 'web_store', 'other']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'google_play'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiStorePurchaseStorePurchase
  extends Struct.CollectionTypeSchema {
  collectionName: 'store_purchases';
  info: {
    description: 'Purchase-intent and receipt-verification state machine. Fulfilment only follows a trusted platform-store receipt verification; no payment gateway runs here.';
    displayName: 'Store Purchase';
    pluralName: 'store-purchases';
    singularName: 'store-purchase';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bronze_coins_granted: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    coin_product: Schema.Attribute.Relation<
      'manyToOne',
      'api::coin-product.coin-product'
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Relation<'manyToOne', 'api::currency.currency'>;
    diamond_coins_granted: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    display_price: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    idempotency_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::store-purchase.store-purchase'
    > &
      Schema.Attribute.Private;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    provider_purchase_id: Schema.Attribute.String;
    provider_transaction_id: Schema.Attribute.String & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    purchase_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    purchase_game_status: Schema.Attribute.Enumeration<
      [
        'intent_created',
        'awaiting_receipt',
        'verifying',
        'fulfilled',
        'rejected',
        'refunded',
        'cancelled',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'intent_created'>;
    purchase_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    receipt_hash: Schema.Attribute.String;
    store_product_offer: Schema.Attribute.Relation<
      'manyToOne',
      'api::store-product-offer.store-product-offer'
    >;
    store_provider: Schema.Attribute.Enumeration<
      ['google_play', 'apple_app_store', 'web_store', 'other']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'google_play'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    verification_reference: Schema.Attribute.String;
    verified_at: Schema.Attribute.DateTime;
  };
}

export interface ApiTacticalProfileTacticalProfile
  extends Struct.CollectionTypeSchema {
  collectionName: 'tactical_profiles';
  info: {
    description: 'Manager/team tactical preset for mentality, pressing, build-up, width, line height, tempo and role instructions.';
    displayName: 'Tactical Profile';
    pluralName: 'tactical-profiles';
    singularName: 'tactical-profile';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    attacking_width: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0.5>;
    build_up_style: Schema.Attribute.Enumeration<
      ['short_passing', 'balanced', 'direct', 'long_ball']
    > &
      Schema.Attribute.DefaultTo<'balanced'>;
    counter_attack_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    defensive_line_height: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0.5>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tactical-profile.tactical-profile'
    > &
      Schema.Attribute.Private;
    mentality: Schema.Attribute.Enumeration<
      ['very_defensive', 'defensive', 'balanced', 'attacking', 'very_attacking']
    > &
      Schema.Attribute.DefaultTo<'balanced'>;
    pressing_style: Schema.Attribute.Enumeration<
      ['low_block', 'mid_block', 'high_press', 'counter_press', 'balanced']
    > &
      Schema.Attribute.DefaultTo<'balanced'>;
    publishedAt: Schema.Attribute.DateTime;
    role_instructions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    tactical_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    tactical_game_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    tactical_name: Schema.Attribute.String & Schema.Attribute.Required;
    tempo: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0.5>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTrainingSessionTrainingSession
  extends Struct.CollectionTypeSchema {
  collectionName: 'training_sessions';
  info: {
    description: 'A single-player training fixture against a selected AI team and difficulty; reward caps prevent unlimited daily XP/coin farming.';
    displayName: 'Training Session';
    pluralName: 'training-sessions';
    singularName: 'training-session';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    ai_team: Schema.Attribute.Relation<'manyToOne', 'api::ai-team.ai-team'> &
      Schema.Attribute.Required;
    completed_at: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    difficulty_profile: Schema.Attribute.Relation<
      'manyToOne',
      'api::ai-difficulty-profile.ai-difficulty-profile'
    > &
      Schema.Attribute.Required;
    game_ruleset: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-ruleset.game-ruleset'
    >;
    idempotency_key: Schema.Attribute.String & Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::training-session.training-session'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'oneToOne', 'api::match.match'>;
    physics_profile: Schema.Attribute.Relation<
      'manyToOne',
      'api::physics-profile.physics-profile'
    >;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    player_club: Schema.Attribute.Relation<'manyToOne', 'api::club.club'>;
    publishedAt: Schema.Attribute.DateTime;
    rewards_granted: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    session_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    session_metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    started_at: Schema.Attribute.DateTime;
    training_day_key: Schema.Attribute.String;
    training_game_status: Schema.Attribute.Enumeration<
      ['created', 'ready', 'in_progress', 'completed', 'abandoned', 'expired']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'created'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiXpLedgerXpLedger extends Struct.CollectionTypeSchema {
  collectionName: 'xp_ledgers';
  info: {
    description: 'Append-only record of app XP changes; XP ranks leaderboards and cannot be spent as a coin currency.';
    displayName: 'Xp Ledger';
    pluralName: 'xp-ledgers';
    singularName: 'xp-ledger';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    balance_after: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    calculation_breakdown: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{}>;
    created_by_system: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'placo'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    idempotency_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::xp-ledger.xp-ledger'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'manyToOne', 'api::match.match'>;
    player: Schema.Attribute.Relation<
      'manyToOne',
      'api::game-profile.game-profile'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    xp_delta: Schema.Attribute.Integer & Schema.Attribute.Required;
    xp_reason: Schema.Attribute.Enumeration<
      [
        'match_win',
        'match_draw',
        'match_loss',
        'training',
        'admin_adjustment',
        'season_bonus',
        'reversal',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'match_win'>;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    country: Schema.Attribute.Relation<'manyToOne', 'api::country.country'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    pla_external_user_id: Schema.Attribute.String & Schema.Attribute.Unique;
    pla_external_username: Schema.Attribute.String;
    preferred_currency: Schema.Attribute.Relation<
      'manyToOne',
      'api::currency.currency'
    >;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::abuse-report.abuse-report': ApiAbuseReportAbuseReport;
      'api::admn-settings.admn-settings': ApiAdmnSettingsAdmnSettings;
      'api::ai-behaviour-profile.ai-behaviour-profile': ApiAiBehaviourProfileAiBehaviourProfile;
      'api::ai-difficulty-profile.ai-difficulty-profile': ApiAiDifficultyProfileAiDifficultyProfile;
      'api::ai-team.ai-team': ApiAiTeamAiTeam;
      'api::club-manager.club-manager': ApiClubManagerClubManager;
      'api::club-player.club-player': ApiClubPlayerClubPlayer;
      'api::club.club': ApiClubClub;
      'api::coin-ledger.coin-ledger': ApiCoinLedgerCoinLedger;
      'api::coin-product.coin-product': ApiCoinProductCoinProduct;
      'api::coin-wallet.coin-wallet': ApiCoinWalletCoinWallet;
      'api::country.country': ApiCountryCountry;
      'api::currency.currency': ApiCurrencyCurrency;
      'api::formation.formation': ApiFormationFormation;
      'api::game-profile.game-profile': ApiGameProfileGameProfile;
      'api::game-ruleset.game-ruleset': ApiGameRulesetGameRuleset;
      'api::kit-preset.kit-preset': ApiKitPresetKitPreset;
      'api::leaderboard-entry.leaderboard-entry': ApiLeaderboardEntryLeaderboardEntry;
      'api::manager-template.manager-template': ApiManagerTemplateManagerTemplate;
      'api::market-offer.market-offer': ApiMarketOfferMarketOffer;
      'api::market-purchase.market-purchase': ApiMarketPurchaseMarketPurchase;
      'api::match-event.match-event': ApiMatchEventMatchEvent;
      'api::match-replay.match-replay': ApiMatchReplayMatchReplay;
      'api::match-result-verification.match-result-verification': ApiMatchResultVerificationMatchResultVerification;
      'api::match-telemetry.match-telemetry': ApiMatchTelemetryMatchTelemetry;
      'api::match.match': ApiMatchMatch;
      'api::matchmaking-ticket.matchmaking-ticket': ApiMatchmakingTicketMatchmakingTicket;
      'api::notification.notification': ApiNotificationNotification;
      'api::physics-curve-set.physics-curve-set': ApiPhysicsCurveSetPhysicsCurveSet;
      'api::physics-profile.physics-profile': ApiPhysicsProfilePhysicsProfile;
      'api::pla-fixture-link.pla-fixture-link': ApiPlaFixtureLinkPlaFixtureLink;
      'api::pla-outbox-event.pla-outbox-event': ApiPlaOutboxEventPlaOutboxEvent;
      'api::player-development-record.player-development-record': ApiPlayerDevelopmentRecordPlayerDevelopmentRecord;
      'api::player-template.player-template': ApiPlayerTemplatePlayerTemplate;
      'api::player-training-record.player-training-record': ApiPlayerTrainingRecordPlayerTrainingRecord;
      'api::restricted-name.restricted-name': ApiRestrictedNameRestrictedName;
      'api::rewarded-ad-impression.rewarded-ad-impression': ApiRewardedAdImpressionRewardedAdImpression;
      'api::rewarded-ad-provider.rewarded-ad-provider': ApiRewardedAdProviderRewardedAdProvider;
      'api::stadium-preset.stadium-preset': ApiStadiumPresetStadiumPreset;
      'api::store-product-offer.store-product-offer': ApiStoreProductOfferStoreProductOffer;
      'api::store-purchase.store-purchase': ApiStorePurchaseStorePurchase;
      'api::tactical-profile.tactical-profile': ApiTacticalProfileTacticalProfile;
      'api::training-session.training-session': ApiTrainingSessionTrainingSession;
      'api::xp-ledger.xp-ledger': ApiXpLedgerXpLedger;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
