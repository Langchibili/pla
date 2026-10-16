import type { Core } from '@strapi/strapi';

export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1344),
  app: { keys: env.array('APP_KEYS') },
  url: env('PUBLIC_URL', ''),
  webhooks: { populateRelations: false },
});
