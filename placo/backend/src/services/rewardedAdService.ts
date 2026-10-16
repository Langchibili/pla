import crypto from 'node:crypto';
import { UID } from './ids';
import { randomCode, sha256Json } from './security';
import { getProfileForUser, changeCoins } from './walletService';
import { resolveSettingsForCountry } from './settingsResolver';

export async function startRewardedAd(strapi:any,userId:number,input:any) {
  const profile = await getProfileForUser(strapi,userId);
  if (!profile || profile.profile_game_status!=='active') throw new Error('An active game profile is required');
  const settings:any = await resolveSettingsForCountry(strapi,profile.country?.id);
  if (!settings.rewarded_ads_enabled) throw new Error('Rewarded ads are disabled in your country');
  const providerCode = String(input.provider_code ?? 'admob');
  const provider = await strapi.db.query(UID.adProvider).findOne({where:{provider_code:providerCode,provider_game_status:'active'}});
  if (!provider) throw new Error('Rewarded-ad provider is unavailable');
  if (provider.server_verification_enabled !== true) throw new Error('Provider must have server-side verification enabled');
  const allowedUnits = Array.isArray(provider.allowed_ad_unit_ids) ? provider.allowed_ad_unit_ids : [];
  const adUnitId = String(input.ad_unit_id ?? '');
  if (!adUnitId || (allowedUnits.length>0 && !allowedUnits.includes(adUnitId))) throw new Error('Unknown ad unit for this provider');
  const now = new Date(); const dayStart = new Date(now); dayStart.setHours(0,0,0,0);
  const dayCount = await strapi.db.query(UID.adImpression).count({where:{player:profile.id,impression_game_status:{$in:['server_verified','rewarded']},createdAt:{$gte:dayStart.toISOString()}}});
  const dailyLimit = Math.min(Number(provider.max_rewards_per_player_day??10),Number(settings.max_rewarded_ads_per_day??10));
  if (dayCount >= dailyLimit) throw new Error('Daily rewarded-ad limit reached');
  const previous = await strapi.db.query(UID.adImpression).findMany({where:{player:profile.id,provider:provider.id},orderBy:{createdAt:'desc'},limit:1});
  if (previous[0]?.createdAt && Date.now()-new Date(previous[0].createdAt).getTime()<Number(provider.minimum_interval_seconds??30)*1000) throw new Error('Please wait before starting another rewarded ad');
  const nonce = crypto.randomBytes(32).toString('hex'); const ttlMs = 10*60*1000;
  const impression = await strapi.db.query(UID.adImpression).create({data:{
    impression_code:randomCode('AD'),player:profile.id,provider:provider.id,ad_unit_id:adUnitId,client_session_hash:typeof input.client_session_id==='string'?crypto.createHash('sha256').update(input.client_session_id).digest('hex'):undefined,
    server_nonce_hash:crypto.createHash('sha256').update(nonce).digest('hex'),impression_game_status:'started',coin_amount_rewarded:0,started_at:now,expires_at:new Date(now.getTime()+ttlMs),impression_metadata:{providerType:provider.provider_type},
  }});
  return {impression_code:impression.impression_code,custom_data:nonce,expires_at:new Date(now.getTime()+ttlMs).toISOString(),provider:provider.provider_type,ad_unit_id:adUnitId};
}

export async function verifyRewardedAdCallback(strapi:any,payload:any) {
  const impressionCode = String(payload.impression_code ?? ''); const nonce = String(payload.custom_data ?? ''); const txn = String(payload.provider_transaction_id ?? '');
  if (!impressionCode || !nonce || !txn) throw new Error('impression_code, custom_data nonce and provider_transaction_id are required');
  const impression = await strapi.db.query(UID.adImpression).findOne({where:{impression_code:impressionCode},populate:{player:{populate:{country:true}},provider:true}});
  if (!impression) throw new Error('Ad impression not found');
  if (impression.impression_game_status==='rewarded') return {duplicate:true,impression};
  if (impression.impression_game_status!=='started' && impression.impression_game_status!=='completed_client_side' && impression.impression_game_status!=='server_verified') throw new Error(`Ad impression cannot be rewarded from ${impression.impression_game_status}`);
  if (new Date(impression.expires_at).getTime()<Date.now()) {
    await strapi.db.query(UID.adImpression).update({where:{id:impression.id},data:{impression_game_status:'expired',rejection_reason:'Provider callback arrived after the impression expiry'}});
    throw new Error('Ad impression has expired');
  }
  const nonceHash=crypto.createHash('sha256').update(nonce).digest('hex');
  if (nonceHash!==impression.server_nonce_hash) throw new Error('Provider custom_data nonce did not match');
  if (String(payload.ad_unit_id??impression.ad_unit_id)!==impression.ad_unit_id) throw new Error('Provider callback ad unit does not match the impression');
  const duplicateTxn=await strapi.db.query(UID.adImpression).findOne({where:{provider_transaction_id:txn}});
  if (duplicateTxn && duplicateTxn.id!==impression.id) throw new Error('Provider transaction has already been used');
  const settings:any=await resolveSettingsForCountry(strapi,impression.player?.country?.id);
  const provider=impression.provider;
  const bronze=Math.max(0,Math.min(Number(provider.bronze_reward_amount??settings.rewarded_ad_bronze_coins??20),Number(settings.rewarded_ad_bronze_coins??20)));
  const diamond=Math.max(0,Math.min(Number(provider.diamond_reward_amount??settings.rewarded_ad_diamond_coins??0),Number(settings.rewarded_ad_diamond_coins??0)));
  // The callback must come from a trusted server-side adapter that verifies the provider's native SSV signature.
  // Neither reward type nor amount is read from the client callback payload.
  const profileId=Number(impression.player?.id??impression.player);
  const callbackHash=sha256Json({txn,impressionCode,nonceHash,adUnitId:impression.ad_unit_id,provider:provider.provider_code});
  await strapi.db.query(UID.adImpression).update({where:{id:impression.id},data:{impression_game_status:'server_verified',provider_transaction_id:txn,provider_callback_hash:callbackHash,verified_at:new Date(),coin_type_rewarded:'bronze',coin_amount_rewarded:bronze}});
  let bronzeLedger:any=null;
  if (bronze>0) {
    const result=await changeCoins(strapi,{profileId,coinType:'bronze',delta:bronze,ledgerType:'rewarded_ad',sourceType:'rewarded_ad',sourceReference:impressionCode,idempotencyKey:`rewarded-ad:${txn}:bronze`,metadata:{provider:provider.provider_code,callbackHash}});
    bronzeLedger=result.ledger;
  }
  if (diamond>0) await changeCoins(strapi,{profileId,coinType:'diamond',delta:diamond,ledgerType:'rewarded_ad',sourceType:'rewarded_ad',sourceReference:impressionCode,idempotencyKey:`rewarded-ad:${txn}:diamond`,metadata:{provider:provider.provider_code,callbackHash}});
  const updated=await strapi.db.query(UID.adImpression).update({where:{id:impression.id},data:{impression_game_status:'rewarded',coin_type_rewarded:diamond>0?'diamond':'bronze',coin_amount_rewarded:bronze+diamond,coin_ledger:bronzeLedger?.id}});
  return {duplicate:false,impression:updated,reward:{bronze,diamond}};
}
