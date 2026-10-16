import { factories } from '@strapi/strapi';
import { requireUserId } from '../../../services/security';
import { UID } from '../../../services/ids';
import { getProfileForUser } from '../../../services/walletService';
export default factories.createCoreController('api::club.club',({strapi})=>({
  async mine(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
    const club=await strapi.db.query(UID.club).findOne({where:{owner:profile.id,club_game_status:'active'}});
    return ctx.send({data:club?{documentId:club.documentId,club_name:club.club_name}:null});
  },
  async chooseFormation(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
    const club=await strapi.db.query(UID.club).findOne({where:{documentId:String(ctx.params.documentId??''),owner:profile.id}});
    if(!club) return ctx.notFound('Club not found for this player');
    const code=String(ctx.request.body?.formation_code??'');
    const formation=await strapi.db.query(UID.formation).findOne({where:{formation_code:code,formation_game_status:'active'}});
    if(!formation) return ctx.badRequest('Formation is not available');
    const lineup=await strapi.db.query(UID.clubPlayer).findMany({where:{club:club.id,player_game_status:'owned'},select:['id','display_position_number','primary_position','squad_role'],orderBy:{display_position_number:'asc'},limit:30});
    const slotMap:Record<string,any>={}; for(const p of lineup) slotMap[String(p.display_position_number).replace('P-','')]=p;
    const points=formation.formation_layout?.players??[];
    const unmatched=points.filter((p:any)=>!slotMap[String(p.shirtNumber)]);
    if(unmatched.length) return ctx.badRequest('Your active squad is missing one or more numbered lineup slots required by this formation');
    const updated=await strapi.db.query(UID.club).update({where:{id:club.id},data:{selected_formation:formation.id}});
    return ctx.send({data:{club:updated.documentId,formation_code:formation.formation_code,formation_layout:formation.formation_layout,assigned_slots:points.map((p:any)=>({shirtNumber:p.shirtNumber,playerDocumentId:slotMap[String(p.shirtNumber)].documentId??String(slotMap[String(p.shirtNumber)].id),position:p.role,x:p.x,z:p.z}))}});
  },
  async chooseManager(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
    const club=await strapi.db.query(UID.club).findOne({where:{documentId:String(ctx.params.documentId??''),owner:profile.id}});
    if(!club) return ctx.notFound('Club not found for this player');
    const manager=await strapi.db.query('api::club-manager.club-manager').findOne({where:{documentId:String(ctx.request.body?.manager_document_id??''),owner:profile.id,manager_game_status:{$in:['owned','active']}}});
    if(!manager) return ctx.badRequest('Manager is not owned by this player');
    await strapi.db.query('api::club-manager.club-manager').updateMany({where:{owner:profile.id},data:{is_selected:false}});
    await strapi.db.query('api::club-manager.club-manager').update({where:{id:manager.id},data:{is_selected:true,manager_game_status:'active',club:club.id}});
    const updated=await strapi.db.query(UID.club).update({where:{id:club.id},data:{selected_manager:manager.id}});
    return ctx.send({data:{club:updated.documentId,manager_document_id:manager.documentId,default_name:manager.custom_name||manager.default_name}});
  },
  async chooseStadium(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
    const club=await strapi.db.query(UID.club).findOne({where:{documentId:String(ctx.params.documentId??''),owner:profile.id}});
    if(!club) return ctx.notFound('Club not found for this player');
    const stadiumCode=String(ctx.request.body?.stadium_code??'');
    const stadium=await strapi.db.query('api::stadium-preset.stadium-preset').findOne({where:{stadium_code:stadiumCode,stadium_game_status:'active'}});
    if(!stadium) return ctx.badRequest('Stadium preset is not available');
    if(stadium.unlock_currency!=='none' && Number(stadium.unlock_price_coins)>0) {
      const owned=await strapi.db.query('api::market-purchase.market-purchase').findMany({where:{player:profile.id,purchase_game_status:'granted'},populate:{market_offer:{populate:{stadium_preset:true}}},limit:500});
      const hasUnlock=owned.some((p:any)=>p.market_offer?.offer_type==='stadium' && Number(p.market_offer?.stadium_preset?.id)===Number(stadium.id));
      if(!hasUnlock) return ctx.forbidden('You need to unlock this stadium in the marketplace first');
    }
    const updated=await strapi.db.query(UID.club).update({where:{id:club.id},data:{selected_stadium:stadium.id}});
    return ctx.send({data:{club:updated.documentId,stadium_code:stadium.stadium_code,stadium_name:stadium.stadium_name}});
  },
  async chooseKit(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
    const club=await strapi.db.query(UID.club).findOne({where:{documentId:String(ctx.params.documentId??''),owner:profile.id}});
    if(!club) return ctx.notFound('Club not found for this player');
    const kitCode=String(ctx.request.body?.kit_code??'');
    const kit=await strapi.db.query('api::kit-preset.kit-preset').findOne({where:{kit_code:kitCode,kit_game_status:'active'}});
    if(!kit) return ctx.badRequest('Kit preset is not available');
    const updated=await strapi.db.query(UID.club).update({where:{id:club.id},data:{selected_kit:kit.id}});
    return ctx.send({data:{club:updated.documentId,kit_code:kit.kit_code,kit_name:kit.kit_name}});
  },
  async squad(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
    const club=await strapi.db.query(UID.club).findOne({where:{documentId:String(ctx.params.documentId??''),owner:profile.id},populate:{selected_formation:true,selected_stadium:true,selected_kit:true}});
    if(!club) return ctx.notFound('Club not found');
    const players=await strapi.db.query(UID.clubPlayer).findMany({where:{club:club.id,player_game_status:'owned'},populate:{player_template:true},orderBy:{display_position_number:'asc'},limit:30});
    return ctx.send({data:{club:{documentId:club.documentId,club_name:club.club_name},formation:club.selected_formation?{formation_code:club.selected_formation.formation_code,formation_layout:club.selected_formation.formation_layout}:null,stadium:club.selected_stadium?.stadium_code??null,kit:club.selected_kit?.kit_code??null,players:players.map((p:any)=>({documentId:p.documentId,slot:p.display_position_number,position:p.primary_position,squad_role:p.squad_role,player_game_status:p.player_game_status,is_premium:p.is_premium,attributes:p.current_attributes,template:p.player_template?{display_name:p.player_template.display_name,overall_rating:p.player_template.overall_rating,premium_tier:p.player_template.premium_tier}:null}))}});
  },
}));
