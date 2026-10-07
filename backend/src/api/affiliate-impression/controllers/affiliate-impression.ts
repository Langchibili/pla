import { factories } from '@strapi/strapi';
import {
  hasAffiliateImpression,
  recordAffiliateImpression,
} from '../../../services/referralService';

export default factories.createCoreController(
  'api::affiliate-impression.affiliate-impression',
  () => ({
    async track(ctx: any) {
      const body = ctx.request.body ?? {};
      const referralCode = body.referral_code ?? body.referralCode;
      if (typeof referralCode !== 'string' || !referralCode.trim()) {
        return ctx.badRequest('referral_code is required');
      }

      const tracked = await recordAffiliateImpression(strapi, {
        referralCode,
        ip: ctx.request.ip ?? '',
        deviceHash: typeof body.device_hash === 'string' ? body.device_hash : undefined,
        userAgent: ctx.request.headers['user-agent'],
        referralUrl: ctx.request.headers.referer,
      });

      if (!tracked) return ctx.notFound('Referral code not found');
      return ctx.send({ tracked: true });
    },

    async check(ctx: any) {
      const body = ctx.request.body ?? {};
      const deviceHash = typeof body.device_hash === 'string' ? body.device_hash : undefined;
      const found = await hasAffiliateImpression(strapi, ctx.request.ip ?? '', deviceHash);
      return ctx.send({ found });
    },
  }),
);
