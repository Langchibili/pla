import { factories } from '@strapi/strapi';
import { verifyInternalRequest } from '../../../services/security';
import { assignPlaFixture, flushPlaOutbox } from '../../../services/plaIntegrationService';
export default factories.createCoreController('api::pla-fixture-link.pla-fixture-link', ({ strapi }) => ({
  async assign(ctx:any) {
    if(!verifyInternalRequest(ctx,'PLA_INTEGRATION_HMAC_SECRET',strapi)) return ctx.unauthorized('Invalid PLA integration signature');
    try { return ctx.send({data:await assignPlaFixture(strapi,ctx.request.body??{})}); }
    catch(error:any) { strapi.log.warn(`[pla-fixture.assign] ${error?.message??error}`); return ctx.badRequest(error?.message??'Unable to assign PLA fixture'); }
  },
  async flushOutbox(ctx:any) {
    if(!verifyInternalRequest(ctx,'PLA_INTEGRATION_HMAC_SECRET',strapi)) return ctx.unauthorized('Invalid PLA integration signature');
    try { return ctx.send({data:await flushPlaOutbox(strapi,Number(ctx.request.body?.limit??20))}); }
    catch(error:any) { strapi.log.error('[pla-fixture.flushOutbox]',error); ctx.status=503; ctx.body={error:{status:503,name:'ServiceUnavailableError',message:error?.message??'PLA outbox delivery is not configured'}}; return; }
  },
}));
