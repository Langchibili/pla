import crypto from 'node:crypto';
import { UID } from './ids';
import { randomCode, sha256Json } from './security';
import { getProfileForUser, changeCoins } from './walletService';
import { resolveSettingsForCountry } from './settingsResolver';

export async function listStoreOffers(strapi:any,userId:number,provider?:string) {
  const profile = await getProfileForUser(strapi,userId);
  if (!profile) throw new Error('Game profile not found');
  const settings:any = await resolveSettingsForCountry(strapi,profile.country?.id);
  if (!settings.store_enabled) throw new Error('Store is disabled in your country');
  if (!profile.country?.id) throw new Error('Set your country before retrieving local store prices');
  const selectedCurrencyId = profile.preferred_currency?.id ?? profile.country?.default_currency?.id;
  if (!selectedCurrencyId) throw new Error('No preferred or country default currency is configured');
  const offers = await strapi.db.query('api::store-product-offer.store-product-offer').findMany({
    where:{country:profile.country.id,currency:selectedCurrencyId,offer_game_status:'active',...(provider?{store_provider:provider}:{})},
    populate:{coin_product:true,currency:true,country:true},orderBy:{createdAt:'asc'},limit:100,
  });
  return offers.filter((offer:any)=>offer.coin_product?.product_game_status==='active' && (!offer.effective_from || new Date(offer.effective_from).getTime()<=Date.now()) && (!offer.effective_until || new Date(offer.effective_until).getTime()>=Date.now()))
    .map((offer:any)=>({offer_code:offer.documentId,provider:offer.store_provider,provider_product_id:offer.provider_product_id,display_price:offer.display_price,display_price_label:offer.display_price_label,currency:{code:offer.currency?.code,symbol:offer.currency?.symbol},product:{product_code:offer.coin_product?.product_code,product_name:offer.coin_product?.product_name,bronze_coins:offer.coin_product?.bronze_coins,diamond_coins:offer.coin_product?.diamond_coins,bonus_bronze_coins:offer.coin_product?.bonus_bronze_coins,bonus_diamond_coins:offer.coin_product?.bonus_diamond_coins}}));
}

export async function createPurchaseIntent(strapi:any,userId:number,input:any,idempotencyKey:string) {
  const profile = await getProfileForUser(strapi,userId);
  if (!profile || profile.profile_game_status!=='active') throw new Error('An active game profile is required');
  if (!idempotencyKey || idempotencyKey.length>180) throw new Error('X-Idempotency-Key header is required');
  const settings:any = await resolveSettingsForCountry(strapi,profile.country?.id);
  if (!settings.store_enabled) throw new Error('Store is disabled in your country');
  const old = await strapi.db.query(UID.purchase).findOne({where:{idempotency_key:idempotencyKey},populate:{player:true,coin_product:true,store_product_offer:true}});
  if (old) {
    if (Number(old.player?.id ?? old.player) !== Number(profile.id)) throw new Error('Idempotency key belongs to another player');
    const requestedOffer = String(input.offer_document_id ?? input.offer_code ?? '');
    const priorOffer = old.store_product_offer;
    if (requestedOffer && priorOffer && requestedOffer !== String(priorOffer.documentId) && requestedOffer !== String(priorOffer.provider_product_id)) throw new Error('Idempotency key was already used for a different store offer');
    return {duplicate:true,purchase:old};
  }
  const offerKey=String(input.offer_document_id ?? input.offer_code ?? '');
  const selectedCurrencyId = profile.preferred_currency?.id ?? profile.country?.default_currency?.id;
  if (!selectedCurrencyId) throw new Error('No preferred or country default currency is configured');
  const offer = await strapi.db.query('api::store-product-offer.store-product-offer').findOne({where:{$or:[{documentId:offerKey},{provider_product_id:offerKey}]},populate:{coin_product:true,currency:true,country:true}});
  if (!offer || offer.offer_game_status!=='active' || offer.country?.id!==profile.country?.id || offer.currency?.id!==selectedCurrencyId) throw new Error('Active store offer for your selected country and currency was not found');
  if (offer.coin_product?.product_game_status!=='active') throw new Error('Coin product is not available');
  const provider = String(input.store_provider ?? offer.store_provider);
  if (provider!==offer.store_provider) throw new Error('Store provider does not match this offer');
  const purchase = await strapi.db.query(UID.purchase).create({data:{
    purchase_code:randomCode('PUR'),player:profile.id,coin_product:offer.coin_product.id,store_product_offer:offer.id,store_provider:provider,
    purchase_game_status:'awaiting_receipt',display_price:offer.display_price,currency:offer.currency?.id,provider_purchase_id:undefined,
    idempotency_key:idempotencyKey,purchase_metadata:{providerProductId:offer.provider_product_id,offerDocumentId:offer.documentId,countryCode:profile.country?.iso_code},
  }});
  return {duplicate:false,purchase,checkout:{store_provider:provider,provider_product_id:offer.provider_product_id,purchase_code:purchase.purchase_code,display_price:offer.display_price,currency_code:offer.currency?.code}};
}

export async function fulfilStorePurchase(strapi:any,payload:any) {
  const purchaseCode = String(payload.purchase_code ?? '');
  const providerTransactionId = String(payload.provider_transaction_id ?? '');
  if (!purchaseCode || !providerTransactionId || payload.verified !== true) throw new Error('Verified purchase code, provider transaction ID and verified=true are required from the trusted store verifier');
  const purchase = await strapi.db.query(UID.purchase).findOne({where:{purchase_code:purchaseCode},populate:{player:true,coin_product:true}});
  if (!purchase) throw new Error('Store purchase intent was not found');
  if (purchase.purchase_game_status==='fulfilled') return {duplicate:true,purchase};
  if (!['awaiting_receipt','intent_created','verifying'].includes(purchase.purchase_game_status)) throw new Error(`Cannot fulfil a purchase in state ${purchase.purchase_game_status}`);
  const usedTxn = await strapi.db.query(UID.purchase).findOne({where:{provider_transaction_id:providerTransactionId}});
  if (usedTxn && usedTxn.id!==purchase.id) throw new Error('Store transaction ID is already linked to another purchase');
  const product = purchase.coin_product;
  if (!product) throw new Error('Coin product configuration is missing');
  const profileId = Number(purchase.player?.id ?? purchase.player);
  const bronze = Number(product.bronze_coins??0)+Number(product.bonus_bronze_coins??0);
  const diamond = Number(product.diamond_coins??0)+Number(product.bonus_diamond_coins??0);
  await strapi.db.query(UID.purchase).update({where:{id:purchase.id},data:{purchase_game_status:'verifying',provider_transaction_id:providerTransactionId,receipt_hash:typeof payload.receipt_hash==='string'?payload.receipt_hash:undefined,verification_reference:typeof payload.verification_reference==='string'?payload.verification_reference:undefined}});
  if (bronze>0) await changeCoins(strapi,{profileId,coinType:'bronze',delta:bronze,ledgerType:'store_purchase',sourceType:'store_purchase',sourceReference:purchaseCode,idempotencyKey:`store:${purchaseCode}:bronze`,metadata:{provider:purchase.store_provider,transactionId:providerTransactionId}});
  if (diamond>0) await changeCoins(strapi,{profileId,coinType:'diamond',delta:diamond,ledgerType:'store_purchase',sourceType:'store_purchase',sourceReference:purchaseCode,idempotencyKey:`store:${purchaseCode}:diamond`,metadata:{provider:purchase.store_provider,transactionId:providerTransactionId}});
  const updated = await strapi.db.query(UID.purchase).update({where:{id:purchase.id},data:{purchase_game_status:'fulfilled',bronze_coins_granted:bronze,diamond_coins_granted:diamond,verified_at:new Date(),purchase_metadata:{...(purchase.purchase_metadata??{}),receiptPayloadHash:sha256Json(payload)}}});
  return {duplicate:false,purchase:updated,granted:{bronze,diamond}};
}

export async function createMarketPurchase(strapi:any,userId:number,offerCode:string,idempotencyKey:string) {
  const profile = await getProfileForUser(strapi,userId);
  if (!profile || profile.profile_game_status!=='active') throw new Error('An active game profile is required');
  if (!idempotencyKey || idempotencyKey.length>180) throw new Error('X-Idempotency-Key header is required');
  const old = await strapi.db.query(UID.marketPurchase).findOne({where:{idempotency_key:idempotencyKey},populate:{player:true,market_offer:true,granted_club_player:true,granted_club_manager:true}});
  if (old && Number(old.player?.id ?? old.player) !== Number(profile.id)) throw new Error('Idempotency key belongs to another player');
  if (old?.market_offer && String(old.market_offer.offer_code) !== String(offerCode)) throw new Error('Idempotency key was already used for a different marketplace offer');
  if (old?.purchase_game_status==='granted') return {duplicate:true,purchase:old};
  let purchase = old;
  const offer = await strapi.db.query(UID.offer).findOne({where:{offer_code:offerCode,offer_game_status:'active'}});
  if (!offer) throw new Error('Active marketplace offer not found');
  if (offer.available_from && new Date(offer.available_from).getTime()>Date.now()) throw new Error('Marketplace offer is not available yet');
  if (offer.available_until && new Date(offer.available_until).getTime()<Date.now()) throw new Error('Marketplace offer has expired');
  if (offer.stock_limit!==null && offer.stock_limit!==undefined && Number(offer.stock_sold)>=Number(offer.stock_limit)) throw new Error('Marketplace offer is sold out');
  const alreadyOwned = await strapi.db.query(UID.marketPurchase).count({where:{player:profile.id,market_offer:offer.id,purchase_game_status:'granted'}});
  if (offer.per_player_limit && alreadyOwned>=Number(offer.per_player_limit)) throw new Error('You have reached the purchase limit for this offer');
  const club = await strapi.db.query(UID.club).findOne({where:{owner:profile.id,club_game_status:'active'}});
  if (!club) throw new Error('Active club not found');
  if (!purchase) purchase = await strapi.db.query(UID.marketPurchase).create({data:{
    purchase_code:randomCode('MKT'),player:profile.id,market_offer:offer.id,coin_type_paid:offer.price_coin_type,coins_paid:offer.price_coins,purchase_game_status:'created',idempotency_key:idempotencyKey,purchase_metadata:{offerType:offer.offer_type},
  }});
  if (purchase.purchase_game_status==='granted') return {duplicate:true,purchase};
  if (Number(offer.price_coins)>0) {
    await changeCoins(strapi,{profileId:profile.id,coinType:offer.price_coin_type as any,delta:-Number(offer.price_coins),ledgerType:'market_purchase',sourceType:'market_offer',sourceReference:offer.offer_code,idempotencyKey:`market:${idempotencyKey}:debit`,note:`Purchase ${offer.offer_name}`,metadata:{purchaseCode:purchase.purchase_code}});
  }
  await strapi.db.query(UID.marketPurchase).update({where:{id:purchase.id},data:{purchase_game_status:'paid'}});
  let grantedClubPlayer:any = null; let grantedClubManager:any = null;
  if (offer.offer_type==='player') {
    if (!offer.player_template) throw new Error('This player offer is missing its player template');
    const template = typeof offer.player_template==='object' ? offer.player_template : await strapi.db.query(UID.playerTemplate).findOne({where:{id:offer.player_template}});
    const existingGrant = await strapi.db.query(UID.marketPurchase).findOne({where:{id:purchase.id},populate:{granted_club_player:true}});
    if (existingGrant?.granted_club_player) grantedClubPlayer=existingGrant.granted_club_player;
    else {
      grantedClubPlayer = await strapi.db.query(UID.clubPlayer).create({data:{owner:profile.id,club:club.id,player_template:template.id,
        internal_player_name:`${template.internal_name}-owner-${profile.id}-${crypto.randomUUID().slice(0,6)}`,display_position_number:`P-${template.position_number}`,primary_position:template.primary_position,
        squad_role:'reserve',player_game_status:'owned',is_premium:template.premium_tier!=='standard',player_tier:template.premium_tier??'standard',current_attributes:template.attributes,appearance_config:template.appearance_defaults,
        acquisition_source:'market',development_level:1}});
      await strapi.db.query(UID.marketPurchase).update({where:{id:purchase.id},data:{granted_club_player:grantedClubPlayer.id}});
    }
  } else if (offer.offer_type==='manager') {
    const template = typeof offer.manager_template==='object' ? offer.manager_template : await strapi.db.query('api::manager-template.manager-template').findOne({where:{id:offer.manager_template}});
    if (!template) throw new Error('This manager offer is missing its manager template');
    const existingGrant = await strapi.db.query(UID.marketPurchase).findOne({where:{id:purchase.id},populate:{granted_club_manager:true}});
    if (existingGrant?.granted_club_manager) grantedClubManager=existingGrant.granted_club_manager;
    else {
      grantedClubManager = await strapi.db.query('api::club-manager.club-manager').create({data:{owner:profile.id,club:club.id,manager_template:template.id,default_name:template.display_name,manager_game_status:'owned',is_selected:false,experience_level:1}});
      await strapi.db.query(UID.marketPurchase).update({where:{id:purchase.id},data:{granted_club_manager:grantedClubManager.id}});
    }
  } else if (offer.offer_type==='stadium') {
    const stadium = typeof offer.stadium_preset==='object' ? offer.stadium_preset : await strapi.db.query('api::stadium-preset.stadium-preset').findOne({where:{id:offer.stadium_preset}});
    if (!stadium) throw new Error('This stadium offer is missing its stadium preset');
    await strapi.db.query(UID.club).update({where:{id:club.id},data:{selected_stadium:stadium.id}});
  } else if (offer.offer_type==='kit') {
    const kit = typeof offer.kit_preset==='object' ? offer.kit_preset : await strapi.db.query('api::kit-preset.kit-preset').findOne({where:{id:offer.kit_preset}});
    if (!kit) throw new Error('This kit offer is missing its kit preset');
    await strapi.db.query(UID.club).update({where:{id:club.id},data:{selected_kit:kit.id}});
  }
  const updated = await strapi.db.query(UID.marketPurchase).update({where:{id:purchase.id},data:{purchase_game_status:'granted',granted_club_player:grantedClubPlayer?.id,granted_club_manager:grantedClubManager?.id}});
  await strapi.db.query(UID.offer).update({where:{id:offer.id},data:{stock_sold:Number(offer.stock_sold??0)+1}});
  return {duplicate:false,purchase:updated,granted_item:{player:grantedClubPlayer?.documentId??null,manager:grantedClubManager?.documentId??null,type:offer.offer_type}};
}
