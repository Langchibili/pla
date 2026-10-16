import crypto from 'node:crypto';
import { UID } from './ids';

const ATTRIBUTES = {
  sprintSpeed:65, acceleration:65, agility:60, balance:60, strength:60, stamina:65, jumping:60,
  dribbling:55, ballControl:55, shortPassing:55, longPassing:50, crossing:45, finishing:45, shotPower:60,
  longShots:45, volleys:40, curve:45, freeKickAccuracy:40, penalties:50, headingAccuracy:50,
  standingTackle:45, slideTackle:40, interceptions:45, marking:45, aggression:55, vision:50, composure:50,
  reactions:55, attackPositioning:50, defendPositioning:45, anticipation:50, decisions:50, workRate:60, weakFoot:50,
  reflexes:30, diving:30, handling:30, kicking:30, throwing:30, gkPositioning:30, oneOnOnes:30,
  commandOfArea:30, aerialReach:30, penaltySaving:30, sweepingSpeed:30,
};

// Goalkeepers must respect the source spec's <=55 cap on outfield attributes.
const KEEPER_ATTRIBUTES = {
  ...ATTRIBUTES, sprintSpeed:48, acceleration:45, agility:50, balance:55, strength:50, stamina:50, jumping:55,
  dribbling:35, ballControl:45, shortPassing:40, longPassing:35, crossing:25, finishing:20, shotPower:50,
  longShots:20, volleys:20, curve:20, freeKickAccuracy:20, penalties:40, headingAccuracy:35, standingTackle:40,
  slideTackle:35, interceptions:40, marking:35, aggression:40, vision:45, composure:55, reactions:55,
  attackPositioning:30, defendPositioning:55, anticipation:55, decisions:55, workRate:55, weakFoot:50,
};

const formations: Array<{ formation_code: string; formation_name: string; lines: number[][] }> = [
  { formation_code: '4-3-3', formation_name: '4-3-3', lines: [[1], [2,3,4,5], [6,8,10], [7,9,11]] },
  { formation_code: '4-4-2', formation_name: '4-4-2', lines: [[1], [2,3,4,5], [6,7,8,11], [9,10]] },
  { formation_code: '4-2-3-1', formation_name: '4-2-3-1', lines: [[1], [2,3,4,5], [6,8], [7,10,11], [9]] },
  { formation_code: '3-5-2', formation_name: '3-5-2', lines: [[1], [3,4,5], [2,6,8,11,7], [9,10]] },
  { formation_code: '4-1-4-1', formation_name: '4-1-4-1', lines: [[1], [2,3,4,5], [6], [7,8,10,11], [9]] },
  { formation_code: '3-4-3', formation_name: '3-4-3', lines: [[1], [3,4,5], [2,6,8,11], [7,9,10]] },
  { formation_code: '5-3-2', formation_name: '5-3-2', lines: [[1], [2,3,4,5,6], [7,8,10], [9,11]] },
];
const positionByNumber: Record<number, string> = { 1:'GK',2:'FB',3:'CB',4:'CB',5:'FB',6:'DM',7:'W',8:'CM',9:'ST',10:'AM',11:'W' };

async function findOrCreate(strapi: any, uid: string, where: Record<string, unknown>, data: Record<string, unknown>) {
  const existing = await strapi.db.query(uid).findOne({ where });
  return existing ?? strapi.db.query(uid).create({ data });
}

export async function seedDefaults(strapi: any) {
  const currency = await findOrCreate(strapi, UID.currency, { code: 'ZMW' }, {
    code: 'ZMW', name: 'Zambian Kwacha', symbol: 'K', rate_to_base: 1, is_base: true, currency_status: 'active',
  });
  const country = await findOrCreate(strapi, UID.country, { iso_code: 'ZM' }, {
    name: 'Zambia', iso_code: 'ZM', dial_code: '+260', default_currency: currency.id, country_status: 'active',
    initial_bronze_coins: 500, initial_diamond_coins: 0, cash_tournaments_allowed: false,
  });
  const ruleset = await findOrCreate(strapi, UID.ruleset, { ruleset_code: 'pla-standard-v1' }, {
    ruleset_code: 'pla-standard-v1', ruleset_name: 'PLA Standard Football Rules', ruleset_version: '1.0.0',
    match_length_minutes: 90, period_count: 2, added_time_enabled: true, offside_enabled: true,
    fouls_enabled: true, cards_enabled: true, substitution_limit: 5,
    restart_rules: { kickoff: true, throwIn: true, goalKick: true, corner: true, freeKick: true, penalty: true, droppedBall: true },
    allowed_modes: ['casual','ranked','training','pla_tournament'], ruleset_game_status: 'active',
  });
  const physics = await findOrCreate(strapi, UID.physics, { profile_code: 'mobile-contextual-v1' }, {
    profile_code: 'mobile-contextual-v1', profile_name: 'Mobile Contextual Physics', profile_version: '1.0.0', realism_preset: 'contextual',
    pitch_spec: { lengthM:105, widthM:68, goalWidthM:7.32, goalHeightM:2.44, penaltySpotM:11, penaltyAreaDepthM:16.5, penaltyAreaWidthM:40.32, wallDistanceM:9.15 },
    ball_spec: { radiusM:0.11, massKg:0.43, inertiaKgM2:0.00347, gravityMps2:9.81, airDensity:1.225, dragCoefficient:0.25, magnusScale:1, spinDecayPerSecond:0.15, groundRestitution:0.57, grassFriction:0.5, rollingResistanceMps2:1.5, substepsPerTick:4, tickRateHz:60 },
    player_motion_spec: { jogMps:3.5, runMps:6, sprintMps:9, longitudinalAccelMps2:7, brakingMps2:11, lateralAccelMps2:10, turnRateDegPerSecond:720, capsuleRadiusM:0.3, capsuleHeightM:1.8, staminaSpeedFloor:0.85 },
    contact_spec: { postRadiusM:0.06, footRestitution:0.5, thighRestitution:0.2, chestRestitution:0.15, headRestitution:0.4, netRestitution:0.05, sweptCollisionEnabled:true },
    camera_spec: { defaultMode:'tv', availableModes:['tv','sideline','ball','goal_to_goal','top_down','set_piece','replay'], springDamping:1, tuning:{} },
    global_scales: { paceScale:1, agilityScale:1, ballSpeedScale:1, staminaScale:1, errorScale:1 }, profile_game_status:'active',
  });
  const curves = await findOrCreate(strapi, UID.curves, { curve_set_code: 'player-attribute-curves-v1' }, {
    curve_set_code:'player-attribute-curves-v1', curve_set_version:'1.0.0',
    curve_definitions:{
      topSpeed:[[1,7.627],[50,8.95],[100,10.3]], accelerationTau:[[1,1.5425],[50,1.175],[100,0.8]],
      accelerationCap:[[1,5.54],[50,7.5],[100,9.5]], agilityLeanDegrees:[[1,30.12],[50,36],[100,42]],
      lateralAcceleration:[[1,5.6],[50,7.1],[100,8.9]], carrySpeedFactor:[[1,0.8],[50,0.9],[100,0.98]],
      firstTouchQuality:[[1,0.31],[50,0.65],[100,0.95]], controlRadiusM:[[1,0.554],[50,0.75],[100,0.95]],
      shotPowerFootSpeedMps:[[1,16.14],[50,20.82],[100,25]], reactionTimeSeconds:[[1,0.2983],[50,0.215],[100,0.13]],
    }, global_scales:{paceScale:1,agilityScale:1,staminaScale:1,errorScale:1}, curve_game_status:'active',
  });
  const ai = await findOrCreate(strapi, UID.aiProfile, { profile_code: 'layered-deterministic-v1' }, {
    profile_code:'layered-deterministic-v1', profile_name:'Layered Deterministic Football AI', profile_version:'1.0.0',
    team_brain_config:{teamDecisionHz:5,playerDecisionHz:15,urgentPlayerDecisionHz:30,reactionDelayMs:[120,350],phases:['build_up','progression','final_third','attacking_transition','defensive_transition','defensive_block']},
    decision_weights:{shoot:1,pass:1,throughBall:1,dribble:1,clearance:0.6,press:1,intercept:1},
    perception_config:{scanHz:4,awarenessConeDeg:140,maxAwarenessDistanceM:35,pressureRadiusM:4},
    role_behaviours:{GK:{positioning:1,distribution:0.7},CB:{lineHold:1,intercept:0.8},FB:{overlap:0.6},DM:{screen:1},CM:{support:1},AM:{chanceCreation:1},W:{width:1},ST:{runBehind:1}},
    keeper_config:{dangerDecisionMs:33,normalDecisionMs:100,reactionSeconds:[0.15,0.35],perceptionSigmaM:[0.1,0.8]},
    referee_config:{leniency:0.5,advantageDelaySeconds:2,reviewLineCrossing:true},
    determinism_config:{fixedTimestep:true,seededRandom:true,stableIterationOrder:true,simulationTickHz:60,ballSubsteps:4},profile_game_status:'active',
  });
  const tactical = await findOrCreate(strapi, 'api::tactical-profile.tactical-profile', { tactical_code:'balanced-default' }, {
    tactical_code:'balanced-default', tactical_name:'Balanced Default', mentality:'balanced', pressing_style:'balanced', build_up_style:'balanced',
    attacking_width:0.55, defensive_line_height:0.5, tempo:0.5, counter_attack_enabled:true, role_instructions:{}, tactical_game_status:'active',
  });

  const formationRecords: Record<string, any> = {};
  for (const f of formations) {
    const positions: any[] = [];
    const lineCount = f.lines.length;
    f.lines.forEach((line, lineIndex) => {
      line.forEach((shirtNo, i) => {
        const spacing = 1 / (line.length + 1);
        positions.push({ shirtNumber:shirtNo, role:positionByNumber[shirtNo], x: Number(((i + 1) * spacing).toFixed(4)), z: Number((0.94 - (lineIndex / Math.max(1, lineCount - 1)) * 0.84).toFixed(4)) });
      });
    });
    const record = await findOrCreate(strapi, UID.formation, { formation_code:f.formation_code }, {
      formation_code:f.formation_code, formation_name:f.formation_name,
      formation_description:`Standard ${f.formation_code} football formation; layout coordinates are normalized 0–1.`,
      formation_layout:{coordinateSystem:'normalized-0-1',attackingDirection:'+z',players:positions}, tactical_tags:['standard','mvp'], formation_version:1, formation_game_status:'active', sort_order:formations.indexOf(f),
    });
    formationRecords[f.formation_code] = record;
  }
  const stadium = await findOrCreate(strapi, 'api::stadium-preset.stadium-preset', { stadium_code:'training-ground' }, {
    stadium_code:'training-ground', stadium_name:'Training Ground', pitch_surface:'dry_grass', pitch_width_m:68, pitch_length_m:105,
    stadium_features:{crowdEnabled:false,standsEnabled:false,advertisingText:'PRO LEAGUE AFRICA',cornerFlags:true,goalsAndNets:true},
    unlock_currency:'none',unlock_price_coins:0,stadium_game_status:'active',
  });
  await findOrCreate(strapi, 'api::kit-preset.kit-preset', { kit_code:'pla-home' }, {
    kit_code:'pla-home',kit_name:'PLA Home',primary_color:'#147A3B',secondary_color:'#FFFFFF',trim_color:'#F4CB34',pattern_key:'plain',kit_game_status:'active',
  });
  await findOrCreate(strapi, 'api::kit-preset.kit-preset', { kit_code:'pla-away' }, {
    kit_code:'pla-away',kit_name:'PLA Away',primary_color:'#FFFFFF',secondary_color:'#17202A',trim_color:'#147A3B',pattern_key:'plain',kit_game_status:'active',
  });
  await findOrCreate(strapi, 'api::stadium-preset.stadium-preset', { stadium_code:'community-park' }, {
    stadium_code:'community-park',stadium_name:'Community Park',pitch_surface:'dry_grass',pitch_width_m:68,pitch_length_m:105,
    stadium_features:{crowdEnabled:false,standsEnabled:false,advertisingText:'PRO LEAGUE AFRICA',cornerFlags:true,goalsAndNets:true},unlock_currency:'none',unlock_price_coins:0,stadium_game_status:'active',
  });
  const premiumStadium = await findOrCreate(strapi, 'api::stadium-preset.stadium-preset', { stadium_code:'city-arena' }, {
    stadium_code:'city-arena',stadium_name:'City Arena',pitch_surface:'dry_grass',pitch_width_m:68,pitch_length_m:105,
    stadium_features:{crowdEnabled:false,standsEnabled:false,advertisingText:'PRO LEAGUE AFRICA',cornerFlags:true,goalsAndNets:true,lightingPreset:'floodlights'},unlock_currency:'diamond',unlock_price_coins:150,stadium_game_status:'active',
  });
  const defaultManager = await findOrCreate(strapi,'api::manager-template.manager-template',{internal_name:'default-manager'}, {
    internal_name:'default-manager',display_name:'Coach One',manager_archetype:'balanced',attribute_modifiers:{tacticalAwareness:50,motivation:50,adaptability:50,trainingQuality:50},tactical_preferences:{mentality:'balanced',pressingStyle:'balanced'},premium_tier:'standard',unlock_currency:'none',unlock_price_coins:0,template_game_status:'active',
  });
  const premiumManager = await findOrCreate(strapi,'api::manager-template.manager-template',{internal_name:'premium-tactician'}, {
    internal_name:'premium-tactician',display_name:'Elite Tactician',manager_archetype:'possession',attribute_modifiers:{tacticalAwareness:82,motivation:78,adaptability:80,trainingQuality:85},tactical_preferences:{mentality:'attacking',pressingStyle:'high_press'},premium_tier:'premium',unlock_currency:'diamond',unlock_price_coins:80,template_game_status:'active',
  });

  const positionSeed = [
    ['Goalkeeper One','GK'],['Right Back','FB'],['Centre Back One','CB'],['Centre Back Two','CB'],['Left Back','FB'],['Defensive Midfielder','DM'],
    ['Right Winger','W'],['Central Midfielder','CM'],['Centre Forward','ST'],['Attacking Midfielder','AM'],['Left Winger','W'],
  ];
  for (let i=0; i<positionSeed.length; i++) {
    const [displayName, pos] = positionSeed[i]; const positionNumber = i + 1;
    await findOrCreate(strapi, UID.playerTemplate, { internal_name:`starter-slot-${positionNumber}` }, {
      internal_name:`starter-slot-${positionNumber}`, display_name:displayName, position_number:positionNumber,
      primary_position:pos, secondary_positions:[], height_cm:positionNumber===1?190:180, weight_kg:positionNumber===1?82:75,
      preferred_foot:positionNumber % 2 === 0 ? 'R' : 'L', attributes:positionNumber===1?KEEPER_ATTRIBUTES:ATTRIBUTES,
      goalkeeper_attributes:positionNumber===1?{reflexes:60,diving:60,handling:58,kicking:50,throwing:55,positioning:60,oneOnOnes:58,commandOfArea:55,aerialReach:62,penaltySaving:55,sweepingSpeed:48}:{},
      traits:[], player_archetype:pos==='GK'?'keeper':pos==='ST'?'striker':pos==='W'?'winger':pos==='CB'?'defender':pos==='FB'?'fullback':pos==='DM'?'defensive_midfielder':pos==='AM'?'attacking_midfielder':'midfielder',
      overall_rating:50,premium_tier:'standard',template_game_status:'active',appearance_defaults:{modelKey:'pla-player-default-v1',skinTone:'default',hairStyle:'short',kitVariant:'default'},
    });
  }

  const premiumStriker = await findOrCreate(strapi, UID.playerTemplate, { internal_name:'premium-striker-card-v1' }, {
    internal_name:'premium-striker-card-v1',display_name:'Elite Striker Card',position_number:9,primary_position:'ST',secondary_positions:['W'],height_cm:185,weight_kg:80,preferred_foot:'R',
    attributes:{...ATTRIBUTES,sprintSpeed:85,acceleration:83,agility:78,balance:78,strength:80,stamina:82,dribbling:82,ballControl:84,shortPassing:72,longPassing:65,crossing:66,finishing:90,shotPower:86,longShots:85,volleys:84,curve:80,headingAccuracy:82,attackPositioning:90,composure:85,reactions:86,anticipation:88,decisions:84,vision:76,weakFoot:75},
    goalkeeper_attributes:{},traits:['speed_dribbler','power_header'],player_archetype:'striker',overall_rating:87,premium_tier:'elite',template_game_status:'active',appearance_defaults:{modelKey:'pla-premium-player-v1',skinTone:'default',hairStyle:'short',kitVariant:'premium'},
  });
  const premiumDefender = await findOrCreate(strapi, UID.playerTemplate, { internal_name:'premium-centreback-card-v1' }, {
    internal_name:'premium-centreback-card-v1',display_name:'Elite Centre Back Card',position_number:4,primary_position:'CB',secondary_positions:['DM'],height_cm:190,weight_kg:88,preferred_foot:'R',
    attributes:{...ATTRIBUTES,sprintSpeed:76,acceleration:74,agility:72,balance:84,strength:91,stamina:86,shortPassing:75,longPassing:73,standingTackle:91,slideTackle:89,interceptions:90,marking:92,aggression:83,defendPositioning:92,headingAccuracy:89,jumping:86,composure:84,reactions:86,anticipation:90,decisions:85,weakFoot:60},
    goalkeeper_attributes:{},traits:['long_throw','power_header'],player_archetype:'defender',overall_rating:88,premium_tier:'elite',template_game_status:'active',appearance_defaults:{modelKey:'pla-premium-player-v1',skinTone:'default',hairStyle:'short',kitVariant:'premium'},
  });
  const premiumPlayerOffer = await findOrCreate(strapi,'api::market-offer.market-offer',{offer_code:'premium-striker-v1'}, {
    offer_code:'premium-striker-v1',offer_name:'Elite Striker Card',offer_type:'player',player_template:premiumStriker.id,price_coin_type:'diamond',price_coins:120,offer_game_status:'active',stock_sold:0,per_player_limit:1,offer_metadata:{feature:'premium_player'},
  });
  await findOrCreate(strapi,'api::market-offer.market-offer',{offer_code:'premium-centreback-v1'}, {
    offer_code:'premium-centreback-v1',offer_name:'Elite Centre Back Card',offer_type:'player',player_template:premiumDefender.id,price_coin_type:'diamond',price_coins:110,offer_game_status:'active',stock_sold:0,per_player_limit:1,offer_metadata:{feature:'premium_player'},
  });
  await findOrCreate(strapi,'api::market-offer.market-offer',{offer_code:'premium-manager-v1'}, {
    offer_code:'premium-manager-v1',offer_name:'Elite Tactician',offer_type:'manager',manager_template:premiumManager.id,price_coin_type:'diamond',price_coins:80,offer_game_status:'active',stock_sold:0,per_player_limit:1,offer_metadata:{feature:'premium_manager'},
  });
  await findOrCreate(strapi,'api::market-offer.market-offer',{offer_code:'city-arena-v1'}, {
    offer_code:'city-arena-v1',offer_name:'City Arena',offer_type:'stadium',stadium_preset:premiumStadium.id,price_coin_type:'diamond',price_coins:150,offer_game_status:'active',stock_sold:0,per_player_limit:1,offer_metadata:{feature:'premium_stadium'},
  });
  await findOrCreate(strapi,'api::coin-product.coin-product',{product_code:'bronze-small'}, {
    product_code:'bronze-small',product_name:'Bronze Coin Pack',product_description:'Bronze Coins for the PLACO marketplace.',bronze_coins:500,diamond_coins:0,bonus_bronze_coins:0,bonus_diamond_coins:0,product_game_status:'active',sort_order:1,
  });
  await findOrCreate(strapi,'api::coin-product.coin-product',{product_code:'bronze-medium'}, {
    product_code:'bronze-medium',product_name:'Bronze Coin Bundle',product_description:'A larger Bronze Coin pack.',bronze_coins:1500,diamond_coins:0,bonus_bronze_coins:100,bonus_diamond_coins:0,product_game_status:'active',sort_order:2,
  });
  await findOrCreate(strapi,'api::coin-product.coin-product',{product_code:'diamond-small'}, {
    product_code:'diamond-small',product_name:'Diamond Coin Pack',product_description:'Diamond Coins for premium player cards and items. Configure the matching platform SKU before listing it.',bronze_coins:0,diamond_coins:50,bonus_bronze_coins:0,bonus_diamond_coins:0,product_game_status:'inactive',sort_order:3,
  });
  await findOrCreate(strapi,UID.adProvider,{provider_code:'admob'}, {
    provider_code:'admob',provider_name:'Google AdMob Rewarded Ads',provider_type:'admob',provider_game_status:'inactive',server_verification_enabled:true,environment_secret_key_name:'AD_SERVER_HMAC_SECRET',allowed_ad_unit_ids:[],bronze_reward_amount:20,diamond_reward_amount:0,max_rewards_per_player_day:10,minimum_interval_seconds:30,provider_metadata:{integrationMode:'server-side-verification-adapter-required'},
  });

  const aiTeam = await findOrCreate(strapi, UID.aiTeam, { team_code:'training-opponent-alpha' }, {
    team_code:'training-opponent-alpha',team_name:'Training XI',team_description:'Balanced baseline AI opponent used for single-player training.',base_team_rating:50,
    base_player_attributes:ATTRIBUTES,roster_template:{formationCode:'4-3-3',players:positionSeed.map(([,role],i)=>({slot:i+1,role,attributes:ATTRIBUTES}))},
    preferred_formation:formationRecords['4-3-3'].id,tactical_profile:tactical.id,ai_behaviour_profile:ai.id,team_game_status:'active',sort_order:0,
  });
  const difficulties = [
    ['easy','Easy',1,320,2.2,1.5,-0.12,0.4,0.60,0.50,-25,1.6,0.65],
    ['medium','Medium',2,260,1.6,1.25,-0.06,0.6,0.75,0.35,-12,1.3,0.58],
    ['hard','Hard',3,200,1.0,1.0,0,0.8,0.90,0.20,0,1.0,0.52],
    ['professional','Professional',4,200,1.0,1.0,0,0.8,0.90,0.20,0,1.0,0.52],
    ['world-class','World Class',5,160,0.7,0.9,0.03,0.9,0.95,0.12,8,0.9,0.50],
    ['legendary','Legendary',6,130,0.5,0.8,0.06,1.0,1.0,0.08,15,0.8,0.48],
  ];
  for (const d of difficulties) {
    await findOrCreate(strapi, UID.difficulty, { difficulty_code:d[0] }, {
      difficulty_code:d[0],difficulty_name:d[1],difficulty_level:d[2],ai_team:aiTeam.id,reaction_time_ms:d[3],decision_temperature_multiplier:d[4],pass_shot_error_multiplier:d[5],
      first_touch_quality_shift:d[6],pressing_intensity_cap:d[7],defensive_line_coordination:d[8],off_ball_run_timing_jitter_seconds:d[9],awareness_adjustment_percent:d[10],
      goalkeeper_perception_multiplier:d[11],tackle_probability_threshold:d[12],team_attribute_overrides:{},difficulty_game_status:'active',
    });
  }

  await findOrCreate(strapi, UID.settings, {}, {
    initial_bronze_coins:500,initial_diamond_coins:0,max_xp_win:100,max_xp_draw:65,max_xp_loss:35,max_xp_training:40,
    xp_base_win:45,xp_base_draw:25,xp_base_loss:10,xp_goal_scored_weight:3,xp_goal_conceded_penalty:1.5,xp_possession_weight:0.15,xp_pass_accuracy_weight:0.08,xp_clean_sheet_bonus:8,xp_goal_difference_weight:2,
    bronze_win_reward:35,bronze_draw_reward:15,bronze_loss_reward:5,training_bronze_reward:0,max_training_rewards_per_day:5,max_rewarded_ads_per_day:10,rewarded_ad_bronze_coins:20,rewarded_ad_diamond_coins:0,
    custom_player_naming_enabled:false,custom_manager_naming_enabled:false,restricted_name_match_mode:'normalized',online_matches_enabled:true,ranked_matches_enabled:true,store_enabled:true,rewarded_ads_enabled:true,cash_tournaments_enabled:false,
    base_currency:currency.id,default_game_ruleset:ruleset.id,default_physics_profile:physics.id,default_ai_behaviour_profile:ai.id,pla_result_callback_enabled:true,match_engine_signing_required:true,store_verification_required:true,ad_server_verification_required:true,
    snapshot_retention_days:180,telemetry_retention_days:90,matchmaking_ticket_ttl_seconds:120,max_active_training_sessions:1,player_upgrade_base_coin_cost:50,player_upgrade_cost_growth:1.35,player_upgrade_attribute_step:1,api_config_revision:1,economy_rules:{diamond_coins_non_farmable:true,xp_is_not_currency:true,purchased_items_non_refundable_after_use:true},
  });

  const famousNames: Array<[string,string[]]> = [
    ['Lionel Messi',['messi','lionelmessi']],['Cristiano Ronaldo',['cristianoronaldo','ronaldo']],['Neymar',['neymarjr']],['Kylian Mbappe',['mbappe','kylianmbappe']],['Erling Haaland',['haaland','erlinghaaland']],
    ['Mohamed Salah',['mosalah']],['Sadio Mane',['sadiomane']],['Didier Drogba',['drogba']],['Samuel Eto’o',['eto','eto’o','eto-o']],['Ronaldinho',['ronaldinho']],['David Beckham',['beckham']],['Zinedine Zidane',['zidane']],
    ['Pele',['pele']],['Diego Maradona',['maradona']],['Ronaldo Nazario',['r9','ronaldonazario']],['Wayne Rooney',['rooney']],['Thierry Henry',['thierryhenry']],['Luka Modric',['modric']],['Kevin De Bruyne',['debruyne']],
    ['Robert Lewandowski',['lewandowski']],['Vinicius Junior',['vinijr','viniciusjr']],['Jude Bellingham',['bellingham']],['Bukayo Saka',['saka']],['Victor Osimhen',['osimhen']],['Alexander Isak',['isak']],['Cesc Fabregas',['fabregas']],
    ['Manchester United',['manutd','manchesterunited']],['Real Madrid',['realmadrid']],['FC Barcelona',['fcbarcelona','barcelona']],['Chelsea FC',['chelseafc']],['Arsenal FC',['arsenalfc']],['Liverpool FC',['liverpoolfc']],
  ];
  for (const [display_term, aliases] of famousNames) {
    const normalized = display_term.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
    await findOrCreate(strapi,'api::restricted-name.restricted-name',{normalized_term:normalized},{
      display_term,normalized_term:normalized,term_category:display_term.includes('FC')||display_term.includes('Real Madrid')?'club':'person',matching_mode:'normalized',aliases,locale:'*',reason:'Protected/famous name; custom naming policy must be checked before acceptance.',term_game_status:'active',
    });
  }
  strapi.log.info(`[PLACO bootstrap] Seeded defaults; currency ${currency.code}, country ${country.iso_code}, ${formations.length} formations and ${difficulties.length} AI difficulties are available.`);
}
