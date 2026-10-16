import type { Core } from '@strapi/strapi';
import { seedDefaults } from './services/bootstrapSeeder';
import { synchronisePlacoApiPermissions } from './services/apiPermissionSeeder';

export default {
  async register() {},
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedDefaults(strapi);
    if (process.env.PLACO_SYNC_API_PERMISSIONS === 'true') {
      await synchronisePlacoApiPermissions(strapi as any);
    }
  },
  async destroy() {},
};
