import { factories } from '@strapi/strapi';
import { requireUserId } from '../../../services/security';
import { getProfileForUser, getWalletForProfile } from '../../../services/walletService';
import { initializeProfile } from '../../../services/profileService';
import { resolveSettingsForCountry } from '../../../services/settingsResolver';
import { exchangePlaToken, PlaAuthError } from '../../../services/plaAuthService';

export default factories.createCoreController('api::game-profile.game-profile', ({ strapi }) => ({
  async exchangePla(ctx:any) {
    try {
      const result = await exchangePlaToken(strapi, ctx.request.body?.pla_jwt);
      return ctx.send(result);
    } catch (error:any) {
      const status = error instanceof PlaAuthError ? error.status : 500;
      if (status === 500) strapi.log.error('[game-profile.exchangePla]', error);
      ctx.status = status;
      ctx.body = {
        data: null,
        error: {
          status,
          name: status === 500 ? 'InternalServerError' : 'PlaAuthError',
          message: status === 500 ? 'PLA sign-in could not be completed' : error.message,
        },
      };
    }
  },
  async mine(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('PLACO profile not initialised');
    const wallet=await getWalletForProfile(strapi,profile.id);
    return ctx.send({data:{documentId:profile.documentId,public_handle:profile.public_handle,profile_game_status:profile.profile_game_status,app_xp:profile.app_xp,
      matches_played:profile.matches_played,wins:profile.wins,draws:profile.draws,losses:profile.losses,goals_scored:profile.goals_scored,goals_conceded:profile.goals_conceded,
      country:profile.country?{name:profile.country.name,iso_code:profile.country.iso_code}:null,preferred_currency:profile.preferred_currency?{code:profile.preferred_currency.code,symbol:profile.preferred_currency.symbol}:null,
      wallet:wallet?{bronze_balance:wallet.bronze_balance,diamond_balance:wallet.diamond_balance,wallet_game_status:wallet.wallet_game_status}:null}});
  },
  async initialise(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const body=ctx.request.body??{};
    try {
      const result=await initializeProfile(strapi,userId,{public_handle:typeof body.public_handle==='string'?body.public_handle:undefined,club_name:typeof body.club_name==='string'?body.club_name:undefined});
      return ctx.send({data:result});
    } catch(error:any) { strapi.log.error('[game-profile.initialise]',error); return ctx.badRequest(error?.message??'Unable to initialise game profile'); }
  },
  async publicSummary(ctx:any) {
    const key=String(ctx.params.documentId??'');
    const profile=await strapi.db.query('api::game-profile.game-profile').findOne({where:{documentId:key,profile_game_status:'active'},populate:{country:{select:['name','iso_code']}}});
    if(!profile) return ctx.notFound('Player profile not found');
    return ctx.send({data:{documentId:profile.documentId,public_handle:profile.public_handle,app_xp:profile.app_xp,matches_played:profile.matches_played,wins:profile.wins,draws:profile.draws,losses:profile.losses,goals_scored:profile.goals_scored,goals_conceded:profile.goals_conceded,country:profile.country?{name:profile.country.name,iso_code:profile.country.iso_code}:null}});
  },
}));
