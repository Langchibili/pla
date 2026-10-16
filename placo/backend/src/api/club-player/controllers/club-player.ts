import { factories } from '@strapi/strapi';
import { requireUserId } from '../../../services/security';
import { getProfileForUser } from '../../../services/walletService';
import { resolveSettingsForCountry } from '../../../services/settingsResolver';
import { validateCustomName } from '../../../services/namePolicy';
import { upgradePlayerAttribute } from '../../../services/playerDevelopmentService';
import { UID } from '../../../services/ids';
export default factories.createCoreController('api::club-player.club-player',({strapi})=>({
  async develop(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const idempotencyKey=String(ctx.request.headers['x-idempotency-key']??'');
    try {
      const result=await upgradePlayerAttribute(strapi,userId,String(ctx.params.documentId??''),ctx.request.body?.attribute,ctx.request.body?.coin_type,idempotencyKey);
      return ctx.send({data:result});
    } catch(error:any) { return ctx.badRequest(error?.message??'Unable to upgrade player attribute'); }
  },
  async rename(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
    const settings:any=await resolveSettingsForCountry(strapi,profile.country?.id);
    if(!settings.custom_player_naming_enabled) return ctx.forbidden('Custom player naming is disabled for the MVP');
    const record=await strapi.db.query(UID.clubPlayer).findOne({where:{documentId:String(ctx.params.documentId??''),owner:profile.id}});
    if(!record) return ctx.notFound('Player not owned by this account');
    const name=ctx.request.body?.custom_name; const check=await validateCustomName(strapi,name);
    if(!check.valid) return ctx.badRequest(check.reason??'Name is not allowed');
    const updated=await strapi.db.query(UID.clubPlayer).update({where:{id:record.id},data:{custom_name:String(name).trim()}});
    return ctx.send({data:{documentId:updated.documentId,custom_name:updated.custom_name,display_position_number:updated.display_position_number}});
  },
}));
