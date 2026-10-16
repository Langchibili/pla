import { factories } from '@strapi/strapi';
import { requireUserId, verifyInternalRequest } from '../../../services/security';
import { createPurchaseIntent, fulfilStorePurchase, listStoreOffers } from '../../../services/storeService';
export default factories.createCoreController('api::store-purchase.store-purchase', ({ strapi }) => ({
  async offers(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    try { return ctx.send({data:await listStoreOffers(strapi,userId,typeof ctx.query.provider==='string'?ctx.query.provider:undefined)}); }
    catch(error:any) { return ctx.badRequest(error?.message??'Unable to load store offers'); }
  },
  async intent(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const key=String(ctx.request.headers['x-idempotency-key']??ctx.request.body?.idempotency_key??'');
    try { return ctx.send({data:await createPurchaseIntent(strapi,userId,ctx.request.body??{},key)}); }
    catch(error:any) { return ctx.badRequest(error?.message??'Unable to create purchase intent'); }
  },
  async fulfil(ctx:any) {
    if(!verifyInternalRequest(ctx,'STORE_VERIFIER_HMAC_SECRET',strapi)) return ctx.unauthorized('Invalid store-verifier signature');
    try { return ctx.send({data:await fulfilStorePurchase(strapi,ctx.request.body??{})}); }
    catch(error:any) { strapi.log.warn(`[store-purchase.fulfil] ${error?.message??error}`); return ctx.badRequest(error?.message??'Purchase verification failed'); }
  },
}));
