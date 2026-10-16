import { factories } from '@strapi/strapi';
import { requireUserId } from '../../../services/security';
import { enqueuePlayer, cancelTicket } from '../../../services/matchmakingService';

export default factories.createCoreController('api::matchmaking-ticket.matchmaking-ticket', ({ strapi }) => ({
  async enqueue(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const idempotency=String(ctx.request.headers['x-idempotency-key']??ctx.request.body?.idempotency_key??'');
    try { return ctx.send({data:await enqueuePlayer(strapi,userId,ctx.request.body??{},idempotency)}); }
    catch(error:any) { strapi.log.warn(`[matchmaking.enqueue] ${error?.message??error}`); return ctx.badRequest(error?.message??'Unable to enter matchmaking'); }
  },
  async cancel(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    try { return ctx.send({data:await cancelTicket(strapi,userId,String(ctx.params.ticketCode??''))}); }
    catch(error:any) { return ctx.badRequest(error?.message??'Unable to cancel ticket'); }
  },
}));
