import { factories } from '@strapi/strapi';
import { requireUserId } from '../../../services/security';
import { getProfileForUser } from '../../../services/walletService';
import { resolveSettingsForCountry } from '../../../services/settingsResolver';
import { validateCustomName } from '../../../services/namePolicy';
export default factories.createCoreController('api::club-manager.club-manager',({strapi})=>({
  async mine(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
    const managers=await strapi.db.query('api::club-manager.club-manager').findMany({
      where:{owner:profile.id,manager_game_status:{$in:['owned','active']}},
      populate:{manager_template:true},orderBy:{createdAt:'asc'},limit:50,
    });
    return ctx.send({data:managers.map((m:any)=>({
      documentId:m.documentId,
      name:m.custom_name||m.default_name,
      is_selected:Boolean(m.is_selected),
      experience_level:m.experience_level,
      archetype:m.manager_template?.manager_archetype??null,
      premium_tier:m.manager_template?.premium_tier??'standard',
      modifiers:m.manager_template?.attribute_modifiers??{},
    }))});
  },
  async rename(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
    const settings:any=await resolveSettingsForCountry(strapi,profile.country?.id);
    if(!settings.custom_manager_naming_enabled) return ctx.forbidden('Custom manager naming is disabled for the MVP');
    const manager=await strapi.db.query('api::club-manager.club-manager').findOne({where:{documentId:String(ctx.params.documentId??''),owner:profile.id}});
    if(!manager) return ctx.notFound('Manager not owned by this account');
    const check=await validateCustomName(strapi,ctx.request.body?.custom_name);
    if(!check.valid) return ctx.badRequest(check.reason??'Name is not allowed');
    const updated=await strapi.db.query('api::club-manager.club-manager').update({where:{id:manager.id},data:{custom_name:String(ctx.request.body.custom_name).trim()}});
    return ctx.send({data:{documentId:updated.documentId,custom_name:updated.custom_name}});
  },
}));
