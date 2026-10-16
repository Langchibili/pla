import { factories } from '@strapi/strapi';
import { xpLeaderboard } from '../../../services/matchService';
export default factories.createCoreController('api::leaderboard-entry.leaderboard-entry', ({ strapi }) => ({
  async topXp(ctx:any) {
    const countryId=ctx.query.country_id?Number(ctx.query.country_id):undefined;
    if(countryId!==undefined && (!Number.isSafeInteger(countryId)||countryId<1)) return ctx.badRequest('country_id must be a positive integer');
    try { return ctx.send({data:await xpLeaderboard(strapi,{countryId,limit:Number(ctx.query.limit??50)})}); }
    catch(error:any) { strapi.log.error('[leaderboard-entry.topXp]',error); return ctx.internalServerError('Unable to load leaderboard'); }
  },
}));
