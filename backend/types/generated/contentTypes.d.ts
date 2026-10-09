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

export interface ApiAdmnSettingsAdmnSettings extends Struct.SingleTypeSchema {
  collectionName: 'admn_settings';
  info: {
    displayName: 'Admn Settings';
    pluralName: 'admn-settings-entries';
    singularName: 'admn-settings';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    affiliate_conditions_template: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        conditions: [
          {
            type: 'trigger';
            value: 'tournament_entry_created';
          },
          {
            type: 'minimum_tournament_entries';
            value: 1;
          },
          {
            type: 'account_status';
            value: 'active';
          },
          {
            type: 'email_verified';
            value: true;
          },
        ];
        operator: 'all';
      }>;
    affiliate_reward_conditions: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        conditions: [
          {
            type: 'trigger';
            value: 'tournament_entry_created';
          },
          {
            type: 'minimum_tournament_entries';
            value: 1;
          },
          {
            type: 'account_status';
            value: 'active';
          },
          {
            type: 'email_verified';
            value: true;
          },
        ];
        operator: 'all';
      }>;
    affiliate_reward_points: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<25>;
    affiliate_system_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    base_currency: Schema.Attribute.Relation<
      'oneToOne',
      'api::currency.currency'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    default_match_time_limit_hours: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<48>;
    default_payment_gateway: Schema.Attribute.Enumeration<
      ['pawapay', 'lenco']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pawapay'>;
    draw_points: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    frontend_mode: Schema.Attribute.Enumeration<['native', 'web']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'native'>;
    initial_free_plapo: Schema.Attribute.Integer &
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
    loss_points: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    max_postponements_per_match: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    min_ocr_confidence: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0.8>;
    overideOtpCode: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'121212'>;
    postponement_response_hours: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<6>;
    publishedAt: Schema.Attribute.DateTime;
    rates_refresh_minutes: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 5;
        },
        number
      > &
      Schema.Attribute.DefaultTo<360>;
    referral_monthly_cap: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<20>;
    score_on_forfeit: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'2:0'>;
    screenshot_retention_days: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<180>;
    single_submission_grace_hours: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    suspended_match_points: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<0>;
    suspended_match_score: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'0:0'>;
    transfers_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    win_points: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<3>;
  };
}

export interface ApiAffiliateImpressionAffiliateImpression
  extends Struct.CollectionTypeSchema {
  collectionName: 'affiliate_impressions';
  info: {
    description: 'First-touch referral impressions matched during email OTP registration.';
    displayName: 'Affiliate Impression';
    pluralName: 'affiliate-impressions';
    singularName: 'affiliate-impression';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    affiliate_owner: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    converted: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    converted_user: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    device_hash: Schema.Attribute.String;
    expires_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::affiliate-impression.affiliate-impression'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    referral_code: Schema.Attribute.String & Schema.Attribute.Required;
    referral_url: Schema.Attribute.String;
    signature_hash: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user_agent: Schema.Attribute.String;
  };
}

export interface ApiAffiliateSettingsAffiliateSettings
  extends Struct.SingleTypeSchema {
  collectionName: 'affiliate_settings';
  info: {
    displayName: 'Affiliate Settings';
    pluralName: 'affiliate-settings-records';
    singularName: 'affiliate-settings';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    conditions_template: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<{
        conditions: [
          {
            type: 'trigger';
            value: 'tournament_entry_created';
          },
          {
            type: 'minimum_tournament_entries';
            value: 1;
          },
          {
            type: 'account_status';
            value: 'active';
          },
          {
            type: 'email_verified';
            value: true;
          },
        ];
        description: 'Every listed condition must pass before the referrer earns Plapo.';
        operator: 'all';
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::affiliate-settings.affiliate-settings'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCountryCountry extends Struct.CollectionTypeSchema {
  collectionName: 'countries';
  info: {
    displayName: 'Country';
    pluralName: 'countries';
    singularName: 'country';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    affiliate_reward_conditions: Schema.Attribute.JSON;
    affiliate_reward_points: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    affiliate_system_enabled: Schema.Attribute.Boolean;
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
    default_match_time_limit_hours: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    default_payment_gateway: Schema.Attribute.Enumeration<['pawapay', 'lenco']>;
    dial_code: Schema.Attribute.String;
    draw_points: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    initial_free_plapo: Schema.Attribute.Integer &
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
    loss_points: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    max_postponements_per_match: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    min_ocr_confidence: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    postponement_response_hours: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    rates_refresh_minutes: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 5;
        },
        number
      >;
    referral_monthly_cap: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    score_on_forfeit: Schema.Attribute.String;
    screenshot_retention_days: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    single_submission_grace_hours: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    suspended_match_points: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    suspended_match_score: Schema.Attribute.String;
    tournaments: Schema.Attribute.Relation<
      'oneToMany',
      'api::tournament.tournament'
    >;
    transfers_enabled: Schema.Attribute.Boolean;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    win_points: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
  };
}

export interface ApiCurrencyCurrency extends Struct.CollectionTypeSchema {
  collectionName: 'currencies';
  info: {
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
    name: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    rate_to_base: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<1>;
    rate_updated_at: Schema.Attribute.DateTime;
    symbol: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDeviceRegistryDeviceRegistry
  extends Struct.CollectionTypeSchema {
  collectionName: 'device_registries';
  info: {
    displayName: 'Device Registry';
    pluralName: 'device-registries';
    singularName: 'device-registry';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    device_hash: Schema.Attribute.String & Schema.Attribute.Required;
    device_registry_status: Schema.Attribute.Enumeration<
      ['clean', 'flagged', 'under_review', 'cleared', 'banned']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'clean'>;
    first_seen_at: Schema.Attribute.DateTime;
    flag_reason: Schema.Attribute.String;
    last_seen_at: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::device-registry.device-registry'
    > &
      Schema.Attribute.Private;
    platform: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiEmailOtpEmailOtp extends Struct.CollectionTypeSchema {
  collectionName: 'email_otp_verifications';
  info: {
    displayName: 'Email OTP Verification';
    pluralName: 'email-otps';
    singularName: 'email-otp';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    countryId: Schema.Attribute.Integer;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceHash: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::email-otp.email-otp'
    > &
      Schema.Attribute.Private;
    otpAttempts: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
    otpCode: Schema.Attribute.String & Schema.Attribute.Required;
    otpEmail: Schema.Attribute.Email & Schema.Attribute.Required;
    otpExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    otpLastSentAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    otpPurpose: Schema.Attribute.Enumeration<['login', 'signup']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'login'>;
    publishedAt: Schema.Attribute.DateTime;
    referralCode: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiGameScoreZoneGameScoreZone
  extends Struct.CollectionTypeSchema {
  collectionName: 'game_score_zones';
  info: {
    displayName: 'Game Score Zone';
    pluralName: 'game-score-zones';
    singularName: 'game-score-zone';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    allowed_zone: Schema.Attribute.Enumeration<
      [
        'top_left',
        'top_center',
        'top_right',
        'middle_left',
        'center',
        'middle_right',
        'bottom_left',
        'bottom_center',
        'bottom_right',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'top_center'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    game: Schema.Attribute.Relation<'manyToOne', 'api::game.game'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::game-score-zone.game-score-zone'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    required_orientation: Schema.Attribute.Enumeration<
      ['landscape', 'portrait']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'landscape'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiGameGame extends Struct.CollectionTypeSchema {
  collectionName: 'games';
  info: {
    displayName: 'Game';
    pluralName: 'games';
    singularName: 'game';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    game_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'inactive'>;
    in_game_id_format: Schema.Attribute.String;
    in_game_id_label: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::game.game'> &
      Schema.Attribute.Private;
    logo: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    parser_version: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    result_type: Schema.Attribute.Enumeration<
      ['head_to_head', 'rounds', 'team_score', 'placement_kills']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'head_to_head'>;
    score_max: Schema.Attribute.Integer;
    score_min: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    score_service_key: Schema.Attribute.String & Schema.Attribute.Required;
    score_zones: Schema.Attribute.Relation<
      'oneToMany',
      'api::game-score-zone.game-score-zone'
    >;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    tournament_configs: Schema.Attribute.Relation<
      'oneToMany',
      'api::tournament-config.tournament-config'
    >;
    tournaments: Schema.Attribute.Relation<
      'oneToMany',
      'api::tournament.tournament'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMatchEventMatchEvent extends Struct.CollectionTypeSchema {
  collectionName: 'match_events';
  info: {
    displayName: 'Match Event';
    pluralName: 'match-events';
    singularName: 'match-event';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    actor: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    event_type: Schema.Attribute.Enumeration<
      [
        'unavailable',
        'postpone_request',
        'postpone_accept',
        'postpone_counter',
        'postpone_decline',
        'postpone_lapsed',
        'forfeit',
        'dispute_opened',
        'admin_override',
      ]
    > &
      Schema.Attribute.Required;
    idempotency_key: Schema.Attribute.String & Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::match-event.match-event'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'manyToOne', 'api::match.match'>;
    match_event_status: Schema.Attribute.Enumeration<
      ['open', 'accepted', 'countered', 'declined', 'lapsed', 'applied']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'open'>;
    parent_event: Schema.Attribute.Relation<
      'manyToOne',
      'api::match-event.match-event'
    >;
    proposed_slots: Schema.Attribute.JSON;
    proposed_time: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    reason_code: Schema.Attribute.Enumeration<
      ['technical_difficulty', 'emergency', 'other']
    >;
    response_due_at: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMatchSubmissionMatchSubmission
  extends Struct.CollectionTypeSchema {
  collectionName: 'match_submissions';
  info: {
    displayName: 'Match Submission';
    pluralName: 'match-submissions';
    singularName: 'match-submission';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    extracted_json: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::match-submission.match-submission'
    > &
      Schema.Attribute.Private;
    match: Schema.Attribute.Relation<'manyToOne', 'api::match.match'>;
    match_submission_status: Schema.Attribute.Enumeration<
      ['pending', 'processing', 'valid', 'invalid', 'needs_review', 'rejected']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    ocr_confidence: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    rejection_reason: Schema.Attribute.String;
    score_job_id: Schema.Attribute.String;
    score_zone_found: Schema.Attribute.String;
    screenshot: Schema.Attribute.Media<'images'>;
    screenshot_hash: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiMatchMatch extends Struct.CollectionTypeSchema {
  collectionName: 'matches';
  info: {
    displayName: 'Match';
    pluralName: 'matches';
    singularName: 'match';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    admin_ruling_note: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dispute_note: Schema.Attribute.Text;
    dispute_opened_by: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    dispute_status: Schema.Attribute.Enumeration<['none', 'open', 'resolved']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'none'>;
    events: Schema.Attribute.Relation<
      'oneToMany',
      'api::match-event.match-event'
    >;
    is_bye: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::match.match'> &
      Schema.Attribute.Private;
    match_code: Schema.Attribute.String & Schema.Attribute.Unique;
    match_deadline: Schema.Attribute.DateTime;
    match_status: Schema.Attribute.Enumeration<
      [
        'scheduled',
        'postponed',
        'awaiting_confirmation',
        'in_dispute',
        'invalid',
        'completed',
        'forfeited',
        'suspended',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'scheduled'>;
    original_deadline: Schema.Attribute.DateTime;
    player1_entry: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament-entry.tournament-entry'
    >;
    player1_score: Schema.Attribute.Integer;
    player2_entry: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament-entry.tournament-entry'
    >;
    player2_score: Schema.Attribute.Integer;
    postponement_count: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    previous_match_codes: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    resolved_at: Schema.Attribute.DateTime;
    result_source: Schema.Attribute.Enumeration<
      [
        'both_submissions',
        'single_submission',
        'forfeit',
        'admin_ruling',
        'suspension',
        'bye',
      ]
    >;
    submissions: Schema.Attribute.Relation<
      'oneToMany',
      'api::match-submission.match-submission'
    >;
    tournament: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament.tournament'
    >;
    tournament_stage: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament-stage.tournament-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    winner_entry: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament-entry.tournament-entry'
    >;
  };
}

export interface ApiPaymentPayment extends Struct.CollectionTypeSchema {
  collectionName: 'payments';
  info: {
    displayName: 'Payment';
    pluralName: 'payments';
    singularName: 'payment';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    amount: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    checkout_url: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Relation<'manyToOne', 'api::currency.currency'>;
    idempotency_key: Schema.Attribute.String & Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::payment.payment'
    > &
      Schema.Attribute.Private;
    merchant_reference: Schema.Attribute.String & Schema.Attribute.Unique;
    paid_at: Schema.Attribute.DateTime;
    payment_status: Schema.Attribute.Enumeration<
      ['pending', 'succeeded', 'failed', 'refunded']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    plapo_credited: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    plapo_package: Schema.Attribute.Relation<
      'manyToOne',
      'api::plapo-package.plapo-package'
    >;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_reference: Schema.Attribute.String & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    webhook_payload: Schema.Attribute.JSON;
  };
}

export interface ApiPlapoLedgerPlapoLedger extends Struct.CollectionTypeSchema {
  collectionName: 'plapo_ledgers';
  info: {
    displayName: 'Plapo Ledger';
    pluralName: 'plapo-ledgers';
    singularName: 'plapo-ledger';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    amount: Schema.Attribute.Integer & Schema.Attribute.Required;
    counterparty: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    idempotency_key: Schema.Attribute.String & Schema.Attribute.Unique;
    ledger_type: Schema.Attribute.Enumeration<
      [
        'signup_bonus',
        'purchase',
        'entry_fee',
        'referral_reward',
        'transfer_out',
        'transfer_in',
        'prize',
        'refund',
        'promo',
        'admin_adjustment',
      ]
    > &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::plapo-ledger.plapo-ledger'
    > &
      Schema.Attribute.Private;
    note: Schema.Attribute.String;
    payment: Schema.Attribute.Relation<'manyToOne', 'api::payment.payment'>;
    plapo_ledger_status: Schema.Attribute.Enumeration<['posted', 'reversed']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'posted'>;
    plapo_source: Schema.Attribute.Enumeration<
      ['free', 'purchased', 'earned', 'received']
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    tournament: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament.tournament'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiPlapoPackagePlapoPackage
  extends Struct.CollectionTypeSchema {
  collectionName: 'plapo_packages';
  info: {
    displayName: 'Plapo Package';
    pluralName: 'plapo-packages';
    singularName: 'plapo-package';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bonus_plapo: Schema.Attribute.Integer &
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
    currency: Schema.Attribute.Relation<'manyToOne', 'api::currency.currency'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::plapo-package.plapo-package'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    plapo_amount: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    plapo_package_status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    price: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPrizePayoutPrizePayout extends Struct.CollectionTypeSchema {
  collectionName: 'prize_payouts';
  info: {
    displayName: 'Prize Payout';
    pluralName: 'prize-payouts';
    singularName: 'prize-payout';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    amount: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    approved_at: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Relation<'manyToOne', 'api::currency.currency'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::prize-payout.prize-payout'
    > &
      Schema.Attribute.Private;
    paid_at: Schema.Attribute.DateTime;
    payout_reference: Schema.Attribute.String;
    place: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    prize_payout_status: Schema.Attribute.Enumeration<
      ['calculated', 'approved', 'paid', 'failed', 'cancelled']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'calculated'>;
    publishedAt: Schema.Attribute.DateTime;
    tournament: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament.tournament'
    >;
    tournament_entry: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament-entry.tournament-entry'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiReferralReferral extends Struct.CollectionTypeSchema {
  collectionName: 'referrals';
  info: {
    displayName: 'Referral';
    pluralName: 'referrals';
    singularName: 'referral';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::referral.referral'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    referral_status: Schema.Attribute.Enumeration<
      ['pending', 'installed', 'rewarded']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    referred_user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    referrer: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    reward_plapo: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    rewarded_at: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTournamentConfigTournamentConfig
  extends Struct.CollectionTypeSchema {
  collectionName: 'tournament_configs';
  info: {
    displayName: 'Tournament Config';
    pluralName: 'tournament-configs';
    singularName: 'tournament-config';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    game: Schema.Attribute.Relation<'manyToOne', 'api::game.game'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tournament-config.tournament-config'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    settings_json: Schema.Attribute.JSON & Schema.Attribute.Required;
    tournaments: Schema.Attribute.Relation<
      'oneToMany',
      'api::tournament.tournament'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTournamentEntryTournamentEntry
  extends Struct.CollectionTypeSchema {
  collectionName: 'tournament_entries';
  info: {
    displayName: 'Tournament Entry';
    pluralName: 'tournament-entries';
    singularName: 'tournament-entry';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    anon_label: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    current_stage: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament-stage.tournament-stage'
    >;
    draws: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    final_position: Schema.Attribute.Integer;
    goals_against: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    goals_for: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    in_game_name: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tournament-entry.tournament-entry'
    > &
      Schema.Attribute.Private;
    losses: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    matches_as_player1: Schema.Attribute.Relation<
      'oneToMany',
      'api::match.match'
    >;
    matches_as_player2: Schema.Attribute.Relation<
      'oneToMany',
      'api::match.match'
    >;
    matches_played: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    points: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    tournament: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament.tournament'
    >;
    tournament_entry_status: Schema.Attribute.Enumeration<
      [
        'registered',
        'active',
        'advanced',
        'eliminated',
        'withdrawn',
        'refunded',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'registered'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    wins: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface ApiTournamentStageTournamentStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'tournament_stages';
  info: {
    displayName: 'Tournament Stage';
    pluralName: 'tournament-stages';
    singularName: 'tournament-stage';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    advance_count: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ends_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tournament-stage.tournament-stage'
    > &
      Schema.Attribute.Private;
    match_time_limit_hours: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    matches: Schema.Attribute.Relation<'oneToMany', 'api::match.match'>;
    min_matches_per_player: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    stage_name: Schema.Attribute.String & Schema.Attribute.Required;
    stage_order: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    stage_type: Schema.Attribute.Enumeration<['league', 'knockout']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'league'>;
    starts_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    tournament: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament.tournament'
    >;
    tournament_stage_status: Schema.Attribute.Enumeration<
      ['scheduled', 'in_progress', 'completed']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'scheduled'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTournamentTournament extends Struct.CollectionTypeSchema {
  collectionName: 'tournaments';
  info: {
    displayName: 'Tournament';
    pluralName: 'tournaments';
    singularName: 'tournament';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    banner: Schema.Attribute.Media<'images'>;
    config_snapshot: Schema.Attribute.JSON;
    country: Schema.Attribute.Relation<'manyToOne', 'api::country.country'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    ends_at: Schema.Attribute.DateTime;
    entries: Schema.Attribute.Relation<
      'oneToMany',
      'api::tournament-entry.tournament-entry'
    >;
    entry_fee_plapo: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    game: Schema.Attribute.Relation<'manyToOne', 'api::game.game'>;
    has_prize_pool: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tournament.tournament'
    > &
      Schema.Attribute.Private;
    max_players: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 2;
        },
        number
      >;
    min_players: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 2;
        },
        number
      >;
    prize_payouts: Schema.Attribute.Relation<
      'oneToMany',
      'api::prize-payout.prize-payout'
    >;
    prize_pool_currency: Schema.Attribute.Relation<
      'manyToOne',
      'api::currency.currency'
    >;
    prize_pool_current_amount: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    prize_pool_initial_amount: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    registration_closes_at: Schema.Attribute.DateTime;
    registration_opens_at: Schema.Attribute.DateTime;
    requires_entry_fee: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    slug: Schema.Attribute.UID<'title'>;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'api::tournament-stage.tournament-stage'
    >;
    starts_at: Schema.Attribute.DateTime;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    tournament_config: Schema.Attribute.Relation<
      'manyToOne',
      'api::tournament-config.tournament-config'
    >;
    tournament_status: Schema.Attribute.Enumeration<
      [
        'draft',
        'published',
        'registration_open',
        'registration_closed',
        'in_progress',
        'completed',
        'cancelled',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
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
    free_plapo_granted: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    has_completed_tutorial: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    in_game_names: Schema.Attribute.JSON;
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
    phone_number: Schema.Attribute.String;
    phone_verified: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    preferred_currency: Schema.Attribute.Relation<
      'manyToOne',
      'api::currency.currency'
    >;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    push_token: Schema.Attribute.String;
    referral_code: Schema.Attribute.String & Schema.Attribute.Unique;
    referred_by: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    spendable_balance: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    transferable_balance: Schema.Attribute.Integer &
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
    user_status: Schema.Attribute.Enumeration<
      ['active', 'flagged', 'suspended', 'banned']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
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
      'api::admn-settings.admn-settings': ApiAdmnSettingsAdmnSettings;
      'api::affiliate-impression.affiliate-impression': ApiAffiliateImpressionAffiliateImpression;
      'api::affiliate-settings.affiliate-settings': ApiAffiliateSettingsAffiliateSettings;
      'api::country.country': ApiCountryCountry;
      'api::currency.currency': ApiCurrencyCurrency;
      'api::device-registry.device-registry': ApiDeviceRegistryDeviceRegistry;
      'api::email-otp.email-otp': ApiEmailOtpEmailOtp;
      'api::game-score-zone.game-score-zone': ApiGameScoreZoneGameScoreZone;
      'api::game.game': ApiGameGame;
      'api::match-event.match-event': ApiMatchEventMatchEvent;
      'api::match-submission.match-submission': ApiMatchSubmissionMatchSubmission;
      'api::match.match': ApiMatchMatch;
      'api::payment.payment': ApiPaymentPayment;
      'api::plapo-ledger.plapo-ledger': ApiPlapoLedgerPlapoLedger;
      'api::plapo-package.plapo-package': ApiPlapoPackagePlapoPackage;
      'api::prize-payout.prize-payout': ApiPrizePayoutPrizePayout;
      'api::referral.referral': ApiReferralReferral;
      'api::tournament-config.tournament-config': ApiTournamentConfigTournamentConfig;
      'api::tournament-entry.tournament-entry': ApiTournamentEntryTournamentEntry;
      'api::tournament-stage.tournament-stage': ApiTournamentStageTournamentStage;
      'api::tournament.tournament': ApiTournamentTournament;
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
