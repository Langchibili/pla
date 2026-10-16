import { factories } from '@strapi/strapi';
import { requireUserId, verifyInternalRequest } from '../../../services/security';
import { startMatchForUser, finaliseVerifiedMatch } from '../../../services/matchService';
import { UID } from '../../../services/ids';

export default factories.createCoreController('api::match.match', ({ strapi }) => ({
  async start(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    try { return ctx.send({data:await startMatchForUser(strapi,String(ctx.params.documentId??''),userId)}); }
    catch(error:any) { return ctx.badRequest(error?.message??'Unable to start match'); }
  },
  async engineFinalise(ctx:any) {
    if(!verifyInternalRequest(ctx,'MATCH_ENGINE_HMAC_SECRET',strapi)) return ctx.unauthorized('Invalid or expired match-engine signature');
    try { return ctx.send({data:await finaliseVerifiedMatch(strapi,ctx.request.body??{},String(ctx.request.headers['x-placo-signature']??''))}); }
    catch(error:any) { strapi.log.warn(`[match.engineFinalise] ${error?.message??error}`); return ctx.badRequest(error?.message??'Match result was rejected'); }
  },
  async mine(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await strapi.db.query(UID.profile).findOne({where:{user:userId}}); if(!profile) return ctx.notFound('Game profile not found');
    const requested=Number(ctx.query.limit??20); const limit=Number.isSafeInteger(requested)?Math.max(1,Math.min(50,requested)):20;
    const records=await strapi.db.query(UID.match).findMany({where:{$or:[{home_player:profile.id},{away_player:profile.id}]},
      select:['documentId','match_code','match_mode','match_status','home_score','away_score','match_started_at','match_ended_at','verified_at','result_validation_status'],
      populate:{home_player:{select:['documentId','public_handle']},away_player:{select:['documentId','public_handle']}},orderBy:{createdAt:'desc'},limit});
    return ctx.send({data:records});
  },
}));
