import type { Core } from '@strapi/strapi';

export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  'users-permissions': { config: { jwt: { expiresIn: '30d' } } },
  upload: { config: { sizeLimit: 10 * 1024 * 1024 } },
});
