import { factories } from '@strapi/strapi';
import { requireUserId } from '../../../services/security';
import { startTrainingSession } from '../../../services/trainingService';

export default factories.createCoreController('api::training-session.training-session', ({ strapi }) => ({
  async start(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const key=String(ctx.request.headers['x-idempotency-key']??ctx.request.body?.idempotency_key??'');
    try { return ctx.send({data:await startTrainingSession(strapi,userId,ctx.request.body??{},key)}); }
    catch(error:any) { strapi.log.warn(`[training-session.start] ${error?.message??error}`); return ctx.badRequest(error?.message??'Unable to start training'); }
  },
}));
