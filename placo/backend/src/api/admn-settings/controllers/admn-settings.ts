import { factories } from '@strapi/strapi';
import { requireUserId } from '../../../services/security';
import { getProfileForUser } from '../../../services/walletService';
import { resolveSettingsForCountry } from '../../../services/settingsResolver';

export default factories.createCoreController('api::admn-settings.admn-settings',({strapi})=>({
  async publicConfig(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId);
    const settings:any=await resolveSettingsForCountry(strapi,profile?.country?.id);
    return ctx.send({data:{
      currency:settings.base_currency?{code:settings.base_currency.code,symbol:settings.base_currency.symbol}:null,
      initial_bronze_coins:settings.initial_bronze_coins,initial_diamond_coins:settings.initial_diamond_coins,
      max_xp_win:settings.max_xp_win,max_xp_draw:settings.max_xp_draw,max_xp_loss:settings.max_xp_loss,max_xp_training:settings.max_xp_training,
      bronze_win_reward:settings.bronze_win_reward,bronze_draw_reward:settings.bronze_draw_reward,bronze_loss_reward:settings.bronze_loss_reward,
      rewarded_ads_enabled:settings.rewarded_ads_enabled,max_rewarded_ads_per_day:settings.max_rewarded_ads_per_day,
      rewarded_ad_bronze_coins:settings.rewarded_ad_bronze_coins,rewarded_ad_diamond_coins:settings.rewarded_ad_diamond_coins,
      custom_player_naming_enabled:settings.custom_player_naming_enabled,custom_manager_naming_enabled:settings.custom_manager_naming_enabled,
      online_matches_enabled:settings.online_matches_enabled,ranked_matches_enabled:settings.ranked_matches_enabled,store_enabled:settings.store_enabled,
      cash_tournaments_enabled:settings.cash_tournaments_enabled,api_config_revision:settings.api_config_revision,
      physics:{profile_code:settings.default_physics_profile?.profile_code??null},ruleset:{ruleset_code:settings.default_game_ruleset?.ruleset_code??null},
    }});
  },
}));
