import { factories } from '@strapi/strapi';
import { requireUserId, verifyInternalRequest } from '../../../services/security';
import { startRewardedAd, verifyRewardedAdCallback } from '../../../services/rewardedAdService';
export default factories.createCoreController('api::rewarded-ad-impression.rewarded-ad-impression', ({ strapi }) => ({
  async start(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    try { return ctx.send({data:await startRewardedAd(strapi,userId,ctx.request.body??{})}); }
    catch(error:any) { return ctx.badRequest(error?.message??'Unable to start rewarded ad'); }
  },
  async providerCallback(ctx:any) {
    if(!verifyInternalRequest(ctx,'AD_SERVER_HMAC_SECRET',strapi)) return ctx.unauthorized('Invalid ad-verification service signature');
    try { return ctx.send({data:await verifyRewardedAdCallback(strapi,ctx.request.body??{})}); }
    catch(error:any) { strapi.log.warn(`[rewarded-ad.callback] ${error?.message??error}`); return ctx.badRequest(error?.message??'Ad reward could not be verified'); }
  },
}));
