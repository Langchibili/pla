import { factories } from '@strapi/strapi';
import { requireUserId } from '../../../services/security';
import { createMarketPurchase } from '../../../services/storeService';
import { getProfileForUser } from '../../../services/walletService';

export default factories.createCoreController('api::market-offer.market-offer', ({ strapi }) => ({
  async catalog(ctx:any) {
    const filters:any={offer_game_status:'active'};
    const type=typeof ctx.query.offer_type==='string'?ctx.query.offer_type:undefined;
    if(type) filters.offer_type=type;
    const offers=await strapi.db.query('api::market-offer.market-offer').findMany({where:filters,populate:{player_template:true,manager_template:true,stadium_preset:true,kit_preset:true},orderBy:{createdAt:'asc'},limit:100});
    return ctx.send({data:offers.map((o:any)=>({documentId:o.documentId,offer_code:o.offer_code,offer_name:o.offer_name,offer_type:o.offer_type,price_coin_type:o.price_coin_type,price_coins:o.price_coins,stock_limit:o.stock_limit,stock_sold:o.stock_sold,player_template:o.player_template?{display_name:o.player_template.display_name,position_number:o.player_template.position_number,overall_rating:o.player_template.overall_rating,premium_tier:o.player_template.premium_tier}:null,manager_template:o.manager_template?{display_name:o.manager_template.display_name,premium_tier:o.manager_template.premium_tier}:null,stadium_preset:o.stadium_preset?{stadium_name:o.stadium_preset.stadium_name}:null,kit_preset:o.kit_preset?{kit_name:o.kit_preset.kit_name}:null}))});
  },
  async purchase(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const idempotency=String(ctx.request.headers['x-idempotency-key']??ctx.request.body?.idempotency_key??'');
    try { return ctx.send({data:await createMarketPurchase(strapi,userId,String(ctx.params.offerCode??''),idempotency)}); }
    catch(error:any) { strapi.log.warn(`[market-offer.purchase] ${error?.message??error}`); return ctx.badRequest(error?.message??'Unable to buy marketplace item'); }
  },
}));
