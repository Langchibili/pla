import type { Core } from '@strapi/strapi';

export default ({ env }: Core.Config.Shared.ConfigParams) => ({ rest: { defaultLimit: 25, maxLimit: 100, withCount: true }, });
