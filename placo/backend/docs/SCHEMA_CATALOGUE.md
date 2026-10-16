# PLACO Strapi v5 Schema Catalogue

This catalogue is generated from the current source schemas (44 API content types). Every API content type has `draftAndPublish: false`; lifecycle/controller rules are documented alongside the service-flow guide. Field types and relations below reflect the JSON schema files, not inferred front-end requirements.

## Abuse Report (`abuse-report`)

Player-submitted or automated abuse report for cheating, harassment, exploits, result disputes or suspicious economy activity.

- **Kind:** `collectionType`
- **Database collection:** `abuse_reports`
- **Strapi UID:** `api::abuse-report.abuse-report`
- **Fields:** 12

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `report_code` | string | Report code. | Yes | — | unique |
| `reporter` | relation manyToOne → `api::game-profile.game-profile` | Reporter. | No | — | — |
| `reported_player` | relation manyToOne → `api::game-profile.game-profile` | Reported player. | No | — | — |
| `match` | relation manyToOne → `api::match.match` | Match. | No | — | — |
| `report_type` | enum (cheating, name_violation, harassment, reward_fraud, match_fixing, other) | Report type. | Yes | `other` | — |
| `severity` | enum (low, medium, high, critical) | Severity. | Yes | `medium` | — |
| `description` | text | Description. | No | — | — |
| `evidence_metadata` | JSON | Evidence metadata. | No | `{}` | — |
| `moderation_game_status` | enum (open, under_review, actioned, dismissed) | Moderation game status. | Yes | `open` | — |
| `reviewed_by_admin_user_id` | string | Reviewed by admin user id. | No | — | — |
| `resolution_note` | text | Resolution note. | No | — | — |
| `resolved_at` | datetime | Resolved at. | No | — | — |

## Admn Settings (`admn-settings`)

Global game rules, tuning, XP caps, coin reward policy, feature flags, naming restrictions, security requirements and PLA integration defaults. Overrides resolve from country settings first. Uses the same `admn_settings` naming convention as PLA.

- **Kind:** `singleType`
- **Database collection:** `admn_settings`
- **Strapi UID:** `api::admn-settings.admn-settings`
- **Fields:** 48

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `initial_bronze_coins` | integer | Initial bronze coins. | Yes | `500` | min 0 |
| `initial_diamond_coins` | integer | Initial diamond coins. | Yes | `0` | min 0 |
| `max_xp_win` | integer | Max xp win. | Yes | `100` | min 0 |
| `max_xp_draw` | integer | Max xp draw. | Yes | `65` | min 0 |
| `max_xp_loss` | integer | Max xp loss. | Yes | `35` | min 0 |
| `max_xp_training` | integer | Max xp training. | Yes | `40` | min 0 |
| `xp_base_win` | integer | Xp base win. | No | `45` | min 0 |
| `xp_base_draw` | integer | Xp base draw. | No | `25` | min 0 |
| `xp_base_loss` | integer | Xp base loss. | No | `10` | min 0 |
| `xp_goal_scored_weight` | decimal | Xp goal scored weight. | No | `3` | min 0 |
| `xp_goal_conceded_penalty` | decimal | Xp goal conceded penalty. | No | `1.5` | min 0 |
| `xp_possession_weight` | decimal | Xp possession weight. | No | `0.15` | min 0 |
| `xp_pass_accuracy_weight` | decimal | Xp pass accuracy weight. | No | `0.08` | min 0 |
| `xp_clean_sheet_bonus` | integer | Xp clean sheet bonus. | No | `8` | min 0 |
| `xp_goal_difference_weight` | decimal | Xp goal difference weight. | No | `2` | min 0 |
| `bronze_win_reward` | integer | Bronze win reward. | No | `35` | min 0 |
| `bronze_draw_reward` | integer | Bronze draw reward. | No | `15` | min 0 |
| `bronze_loss_reward` | integer | Bronze loss reward. | No | `5` | min 0 |
| `training_bronze_reward` | integer | Training bronze reward. | No | `0` | min 0 |
| `max_training_rewards_per_day` | integer | Max training rewards per day. | No | `5` | min 0 |
| `max_rewarded_ads_per_day` | integer | Max rewarded ads per day. | No | `10` | min 0 |
| `rewarded_ad_bronze_coins` | integer | Rewarded ad bronze coins. | No | `20` | min 0 |
| `rewarded_ad_diamond_coins` | integer | Rewarded ad diamond coins. | No | `0` | min 0 |
| `custom_player_naming_enabled` | boolean | Custom player naming enabled. | No | `False` | — |
| `custom_manager_naming_enabled` | boolean | Custom manager naming enabled. | No | `False` | — |
| `restricted_name_match_mode` | enum (exact, normalized, fuzzy) | Restricted name match mode. | No | `normalized` | — |
| `online_matches_enabled` | boolean | Online matches enabled. | No | `True` | — |
| `ranked_matches_enabled` | boolean | Ranked matches enabled. | No | `True` | — |
| `store_enabled` | boolean | Store enabled. | No | `True` | — |
| `rewarded_ads_enabled` | boolean | Rewarded ads enabled. | No | `True` | — |
| `cash_tournaments_enabled` | boolean | Cash tournaments enabled. | No | `False` | — |
| `base_currency` | relation oneToOne → `api::currency.currency` | Base currency. | No | — | — |
| `default_game_ruleset` | relation manyToOne → `api::game-ruleset.game-ruleset` | Default game ruleset. | No | — | — |
| `default_physics_profile` | relation manyToOne → `api::physics-profile.physics-profile` | Default physics profile. | No | — | — |
| `default_ai_behaviour_profile` | relation manyToOne → `api::ai-behaviour-profile.ai-behaviour-profile` | Default ai behaviour profile. | No | — | — |
| `pla_result_callback_enabled` | boolean | Pla result callback enabled. | No | `True` | — |
| `match_engine_signing_required` | boolean | Match engine signing required. | No | `True` | — |
| `store_verification_required` | boolean | Store verification required. | No | `True` | — |
| `ad_server_verification_required` | boolean | Ad server verification required. | No | `True` | — |
| `snapshot_retention_days` | integer | Snapshot retention days. | No | `180` | min 1 |
| `telemetry_retention_days` | integer | Telemetry retention days. | No | `90` | min 1 |
| `matchmaking_ticket_ttl_seconds` | integer | Matchmaking ticket ttl seconds. | No | `120` | min 15 |
| `max_active_training_sessions` | integer | Max active training sessions. | No | `1` | min 1 |
| `player_upgrade_base_coin_cost` | integer | Player upgrade base coin cost. | No | `50` | min 1 |
| `player_upgrade_cost_growth` | decimal | Player upgrade cost growth. | No | `1.35` | min 1; max 2 |
| `player_upgrade_attribute_step` | integer | Player upgrade attribute step. | No | `1` | min 1; max 5 |
| `api_config_revision` | integer | Api config revision. | No | `1` | min 1 |
| `economy_rules` | JSON | Economy rules. | No | `{"diamond_coins_non_farmable":true,"xp_is_not_curren…` | — |

## Ai Behaviour Profile (`ai-behaviour-profile`)

Versioned AI behaviour and match decision configuration: team brain, perception delays, role state machines, goalkeeper, referee and determinism settings.

- **Kind:** `collectionType`
- **Database collection:** `ai_behaviour_profiles`
- **Strapi UID:** `api::ai-behaviour-profile.ai-behaviour-profile`
- **Fields:** 11

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `profile_code` | string | Profile code. | Yes | — | unique |
| `profile_name` | string | Profile name. | Yes | — | — |
| `profile_version` | string | Profile version. | No | `1.0.0` | — |
| `team_brain_config` | JSON | Team brain config. | No | `{"teamDecisionHz":5,"playerDecisionHz":15,"urgentPla…` | — |
| `decision_weights` | JSON | Decision weights. | No | `{"shoot":1,"pass":1,"throughBall":1,"dribble":1,"cle…` | — |
| `perception_config` | JSON | Perception config. | No | `{"scanHz":4,"awarenessConeDeg":140,"maxAwarenessDist…` | — |
| `role_behaviours` | JSON | Role behaviours. | No | `{"GK":{},"CB":{},"FB":{},"DM":{},"CM":{},"AM":{},"W"…` | — |
| `keeper_config` | JSON | Keeper config. | No | `{"dangerDecisionMs":33,"normalDecisionMs":100,"react…` | — |
| `referee_config` | JSON | Referee config. | No | `{"leniency":0.5,"advantageDelaySeconds":2,"reviewLin…` | — |
| `determinism_config` | JSON | Determinism config. | No | `{"fixedTimestep":true,"seededRandom":true,"stableIte…` | — |
| `profile_game_status` | enum (draft, active, deprecated) | Profile game status. | Yes | `draft` | — |

## Ai Difficulty Profile (`ai-difficulty-profile`)

Admin-tunable difficulty presets. Adjusts AI reaction, decision temperature, passing/shot error, first touch, pressing, defensive coordination and keeper perception without changing football rules.

- **Kind:** `collectionType`
- **Database collection:** `ai_difficulty_profiles`
- **Strapi UID:** `api::ai-difficulty-profile.ai-difficulty-profile`
- **Fields:** 16

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `difficulty_code` | string | Difficulty code. | Yes | — | unique |
| `difficulty_name` | string | Difficulty name. | Yes | — | — |
| `difficulty_level` | integer | Difficulty level. | Yes | — | min 1; max 10 |
| `ai_team` | relation manyToOne → `api::ai-team.ai-team` | Ai team. | No | — | inversedBy difficulty_profiles |
| `reaction_time_ms` | integer | Reaction time ms. | No | `200` | min 50; max 1000 |
| `decision_temperature_multiplier` | decimal | Decision temperature multiplier. | No | `1` | min 0.1; max 5 |
| `pass_shot_error_multiplier` | decimal | Pass shot error multiplier. | No | `1` | min 0.1; max 5 |
| `first_touch_quality_shift` | decimal | First touch quality shift. | No | `0` | min -1; max 1 |
| `pressing_intensity_cap` | decimal | Pressing intensity cap. | No | `0.8` | min 0; max 1 |
| `defensive_line_coordination` | decimal | Defensive line coordination. | No | `0.9` | min 0; max 1 |
| `off_ball_run_timing_jitter_seconds` | decimal | Off ball run timing jitter seconds. | No | `0.2` | min 0; max 2 |
| `awareness_adjustment_percent` | decimal | Awareness adjustment percent. | No | `0` | min -100; max 100 |
| `goalkeeper_perception_multiplier` | decimal | Goalkeeper perception multiplier. | No | `1` | min 0.1; max 5 |
| `tackle_probability_threshold` | decimal | Tackle probability threshold. | No | `0.52` | min 0; max 1 |
| `team_attribute_overrides` | JSON | Team attribute overrides. | No | `{}` | — |
| `difficulty_game_status` | enum (active, inactive) | Difficulty game status. | Yes | `active` | — |

## Ai Team (`ai-team`)

Reusable training-opponent definition with team strength, base player attributes, roster template, preferred formation and tactical/AI profiles.

- **Kind:** `collectionType`
- **Database collection:** `ai_teams`
- **Strapi UID:** `api::ai-team.ai-team`
- **Fields:** 12

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `team_code` | string | Team code. | Yes | — | unique |
| `team_name` | string | Team name. | Yes | — | — |
| `team_description` | text | Team description. | No | — | — |
| `base_team_rating` | integer | Base team rating. | No | `50` | min 1; max 100 |
| `base_player_attributes` | JSON | Base player attributes. | No | `{"sprintSpeed":65,"acceleration":65,"agility":60,"ba…` | — |
| `roster_template` | JSON | Roster template. | No | `{"formationCode":"4-3-3","players":[]}` | — |
| `preferred_formation` | relation manyToOne → `api::formation.formation` | Preferred formation. | No | — | — |
| `tactical_profile` | relation manyToOne → `api::tactical-profile.tactical-profile` | Tactical profile. | No | — | — |
| `ai_behaviour_profile` | relation manyToOne → `api::ai-behaviour-profile.ai-behaviour-profile` | Ai behaviour profile. | No | — | — |
| `difficulty_profiles` | relation oneToMany → `api::ai-difficulty-profile.ai-difficulty-profile` | Difficulty profiles. | No | — | mappedBy ai_team |
| `team_game_status` | enum (active, inactive) | Team game status. | Yes | `active` | — |
| `sort_order` | integer | Sort order. | No | `0` | — |

## Club (`club`)

The player-owned football club. Stores selected formation, manager, stadium and kit; the game profile owns the club.

- **Kind:** `collectionType`
- **Database collection:** `clubs`
- **Strapi UID:** `api::club.club`
- **Fields:** 11

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `owner` | relation oneToOne → `api::game-profile.game-profile` | Owner. | Yes | — | — |
| `club_name` | string | Club name. | Yes | — | — |
| `club_slug` | string | Club slug. | No | — | unique |
| `club_badge_url` | string | Club badge url. | No | — | — |
| `club_game_status` | enum (active, suspended, archived) | Club game status. | Yes | `active` | — |
| `selected_formation` | relation manyToOne → `api::formation.formation` | Selected formation. | No | — | — |
| `selected_stadium` | relation manyToOne → `api::stadium-preset.stadium-preset` | Selected stadium. | No | — | — |
| `selected_kit` | relation manyToOne → `api::kit-preset.kit-preset` | Selected kit. | No | — | — |
| `club_rating` | decimal | Club rating. | No | `50` | min 0; max 100 |
| `club_metadata` | JSON | Club metadata. | No | `{}` | — |
| `selected_manager` | relation manyToOne → `api::club-manager.club-manager` | Selected manager. | No | — | — |

## Club Manager (`club-manager`)

Manager card owned by a profile and associated with a club. MVP shows the default name; custom naming is controlled by settings and restricted-name policy.

- **Kind:** `collectionType`
- **Database collection:** `club_managers`
- **Strapi UID:** `api::club-manager.club-manager`
- **Fields:** 9

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `owner` | relation manyToOne → `api::game-profile.game-profile` | Owner. | Yes | — | — |
| `manager_template` | relation manyToOne → `api::manager-template.manager-template` | Manager template. | Yes | — | — |
| `club` | relation manyToOne → `api::club.club` | Club. | No | — | — |
| `default_name` | string | Default name. | Yes | — | — |
| `custom_name` | string | Custom name. | No | — | — |
| `manager_game_status` | enum (owned, active, retired) | Manager game status. | Yes | `owned` | — |
| `is_selected` | boolean | Is selected. | No | `False` | — |
| `experience_level` | integer | Experience level. | No | `1` | min 1; max 100 |
| `manager_progression` | JSON | Manager progression. | No | `{}` | — |

## Club Player (`club-player`)

An owned instance of a player card. Stores internal identity, visible P-N slot label, role, attributes snapshot, appearance, development and acquisition source.

- **Kind:** `collectionType`
- **Database collection:** `club_players`
- **Strapi UID:** `api::club-player.club-player`
- **Fields:** 17

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `owner` | relation manyToOne → `api::game-profile.game-profile` | Owner. | Yes | — | — |
| `club` | relation manyToOne → `api::club.club` | Club. | Yes | — | — |
| `player_template` | relation manyToOne → `api::player-template.player-template` | Player template. | Yes | — | — |
| `internal_player_name` | string | Internal player name. | Yes | — | — |
| `display_position_number` | string | Display position number. | Yes | — | — |
| `custom_name` | string | Custom name. | No | — | — |
| `primary_position` | enum (GK, CB, FB, DM, CM, AM, W, ST) | Primary position. | Yes | `CM` | — |
| `squad_role` | enum (starter, substitute, reserve) | Squad role. | No | `reserve` | — |
| `player_game_status` | enum (owned, listed, injured, suspended, retired) | Player game status. | Yes | `owned` | — |
| `is_premium` | boolean | Is premium. | No | `False` | — |
| `player_tier` | enum (standard, premium, elite) | Player tier. | Yes | `standard` | — |
| `current_attributes` | JSON | Mutable attribute snapshot for this owned card (server-controlled). | No | `{"sprintSpeed":65,"acceleration":65,"agility":60,"ba…` | — |
| `appearance_config` | JSON | Appearance config. | No | `{}` | — |
| `player_xp` | integer | Player xp. | No | `0` | min 0 |
| `development_level` | integer | Development level. | No | `1` | min 1; max 100 |
| `acquisition_source` | enum (starter, market, store, reward, admin) | Acquisition source. | No | `starter` | — |
| `last_trained_at` | datetime | Last trained at. | No | — | — |

## Coin Ledger (`coin-ledger`)

Append-only audit of every Bronze/Diamond Coin credit or debit. One idempotency key per movement; balance after movement is stored for reconciliation.

- **Kind:** `collectionType`
- **Database collection:** `coin_ledgers`
- **Strapi UID:** `api::coin-ledger.coin-ledger`
- **Fields:** 11

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `wallet` | relation manyToOne → `api::coin-wallet.coin-wallet` | Wallet. | Yes | — | — |
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `coin_type` | enum (bronze, diamond) | Which independent PLACO Coin balance this ledger entry affects. | Yes | `bronze` | — |
| `amount_delta` | integer | Signed integer movement applied to the balance. | Yes | — | — |
| `balance_after` | integer | Wallet balance after the movement. | Yes | — | min 0 |
| `ledger_type` | enum (welcome_grant, match_reward, training_reward, rewarded_ad, market_purchase, store_purchase, refund, admin_adjustment, reversal) | Ledger type. | Yes | `match_reward` | — |
| `source_type` | string | Source type. | Yes | — | — |
| `source_reference` | string | Source reference. | No | — | — |
| `idempotency_key` | string | Unique retry key that prevents duplicate processing. | Yes | — | unique |
| `ledger_note` | text | Ledger note. | No | — | — |
| `ledger_metadata` | JSON | Ledger metadata. | No | `{}` | — |

## Coin Product (`coin-product`)

Logical coin pack catalogue. Stores coin quantities and bonus quantities only; it does not charge customers or process payments.

- **Kind:** `collectionType`
- **Database collection:** `coin_products`
- **Strapi UID:** `api::coin-product.coin-product`
- **Fields:** 12

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `product_code` | string | Product code. | Yes | — | unique |
| `product_name` | string | Product name. | Yes | — | — |
| `product_description` | text | Product description. | No | — | — |
| `bronze_coins` | integer | Bronze coins. | No | `0` | min 0 |
| `diamond_coins` | integer | Diamond coins. | No | `0` | min 0 |
| `bonus_bronze_coins` | integer | Bonus bronze coins. | No | `0` | min 0 |
| `bonus_diamond_coins` | integer | Bonus diamond coins. | No | `0` | min 0 |
| `google_play_product_id` | string | Google play product id. | No | — | — |
| `apple_store_product_id` | string | Apple store product id. | No | — | — |
| `web_store_product_id` | string | Web store product id. | No | — | — |
| `product_game_status` | enum (active, inactive) | Product game status. | Yes | `active` | — |
| `sort_order` | integer | Sort order. | No | `0` | — |

## Coin Wallet (`coin-wallet`)

A player’s canonical Bronze and Diamond Coin balances with wallet revision and active/locked state.

- **Kind:** `collectionType`
- **Database collection:** `coin_wallets`
- **Strapi UID:** `api::coin-wallet.coin-wallet`
- **Fields:** 6

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `player` | relation oneToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `bronze_balance` | integer | Bronze balance. | Yes | `0` | min 0 |
| `diamond_balance` | integer | Diamond balance. | Yes | `0` | min 0 |
| `wallet_game_status` | enum (active, locked, closed) | Wallet game status. | Yes | `active` | — |
| `last_ledger_at` | datetime | Last ledger at. | No | — | — |
| `wallet_revision` | integer | Wallet revision. | No | `1` | min 1 |

## Country (`country`)

Country catalogue patterned after PLA. Resolves default currency and country-specific game, economy, ads, store and cash-tournament overrides.

- **Kind:** `collectionType`
- **Database collection:** `countries`
- **Strapi UID:** `api::country.country`
- **Fields:** 20

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `name` | string | Name. | Yes | — | unique |
| `iso_code` | string | Iso code. | Yes | — | unique; minLength 2; maxLength 3 |
| `dial_code` | string | Dial code. | No | — | — |
| `default_currency` | relation manyToOne → `api::currency.currency` | Default currency. | No | — | inversedBy countries |
| `country_status` | enum (active, inactive) | Country status. | Yes | `active` | — |
| `initial_bronze_coins` | integer | Initial bronze coins. | No | — | min 0 |
| `initial_diamond_coins` | integer | Initial diamond coins. | No | — | min 0 |
| `max_xp_win_override` | integer | Max xp win override. | No | — | min 0 |
| `max_xp_match_override` | integer | Max xp match override. | No | — | min 0 |
| `max_xp_training_override` | integer | Max xp training override. | No | — | min 0 |
| `bronze_win_reward_override` | integer | Bronze win reward override. | No | — | min 0 |
| `bronze_draw_reward_override` | integer | Bronze draw reward override. | No | — | min 0 |
| `bronze_loss_reward_override` | integer | Bronze loss reward override. | No | — | min 0 |
| `rewarded_ad_bronze_coins_override` | integer | Rewarded ad bronze coins override. | No | — | min 0 |
| `rewarded_ad_diamond_coins_override` | integer | Rewarded ad diamond coins override. | No | — | min 0 |
| `max_rewarded_ads_per_day_override` | integer | Max rewarded ads per day override. | No | — | min 0 |
| `cash_tournaments_allowed` | boolean | Cash tournaments allowed. | No | `False` | — |
| `store_enabled_override` | boolean | Store enabled override. | No | — | — |
| `rewarded_ads_enabled_override` | boolean | Rewarded ads enabled override. | No | — | — |
| `tournament_feature_flags` | JSON | Tournament feature flags. | No | `{}` | — |

## Currency (`currency`)

Currency catalogue patterned after PLA, including ISO code, symbol, base conversion rate and rate freshness. Used to display store prices in the player’s selected country currency.

- **Kind:** `collectionType`
- **Database collection:** `currencies`
- **Strapi UID:** `api::currency.currency`
- **Fields:** 8

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `code` | string | Code. | Yes | — | unique; minLength 3; maxLength 3 |
| `name` | string | Name. | Yes | — | — |
| `symbol` | string | Symbol. | No | — | — |
| `rate_to_base` | decimal | Rate to base. | Yes | `1` | min 1e-07 |
| `rate_updated_at` | datetime | Rate updated at. | No | — | — |
| `is_base` | boolean | Is base. | No | `False` | — |
| `currency_status` | enum (active, inactive) | Currency status. | Yes | `active` | — |
| `countries` | relation oneToMany → `api::country.country` | Countries. | No | — | mappedBy default_currency |

## Formation (`formation`)

Named football formation plus positional coordinates and player-slot mapping consumed by the Babylon.js game.

- **Kind:** `collectionType`
- **Database collection:** `formations`
- **Strapi UID:** `api::formation.formation`
- **Fields:** 8

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `formation_code` | string | Formation code. | Yes | — | unique |
| `formation_name` | string | Formation name. | Yes | — | — |
| `formation_description` | text | Formation description. | No | — | — |
| `formation_layout` | JSON | Formation layout. | Yes | `{"coordinateSystem":"normalized-0-1","players":[]}` | — |
| `tactical_tags` | JSON | Tactical tags. | No | `[]` | — |
| `formation_version` | integer | Formation version. | No | `1` | min 1 |
| `formation_game_status` | enum (active, inactive) | Formation game status. | Yes | `active` | — |
| `sort_order` | integer | Sort order. | No | `0` | — |

## Game Profile (`game-profile`)

PLACO-specific player profile attached to a Strapi Users & Permissions user and optionally linked to the PLA account ID. Tracks XP, record, goal statistics, country and currency.

- **Kind:** `collectionType`
- **Database collection:** `game_profiles`
- **Strapi UID:** `api::game-profile.game-profile`
- **Fields:** 17

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `user` | relation oneToOne → `plugin::users-permissions.user` | User. | Yes | — | — |
| `pla_user_id` | string | Pla user id. | No | — | unique |
| `pla_username` | string | Pla username. | No | — | — |
| `public_handle` | string | Public handle. | No | — | unique |
| `country` | relation manyToOne → `api::country.country` | Country. | No | — | — |
| `preferred_currency` | relation manyToOne → `api::currency.currency` | Preferred currency. | No | — | — |
| `profile_game_status` | enum (active, suspended, restricted, deleted) | Profile game status. | Yes | `active` | — |
| `app_xp` | integer | Non-spendable progression and leaderboard XP. | No | `0` | min 0 |
| `matches_played` | integer | Matches played. | No | `0` | min 0 |
| `wins` | integer | Wins. | No | `0` | min 0 |
| `draws` | integer | Draws. | No | `0` | min 0 |
| `losses` | integer | Losses. | No | `0` | min 0 |
| `goals_scored` | integer | Goals scored. | No | `0` | min 0 |
| `goals_conceded` | integer | Goals conceded. | No | `0` | min 0 |
| `clean_sheets` | integer | Clean sheets. | No | `0` | min 0 |
| `last_match_at` | datetime | Last match at. | No | — | — |
| `onboarding_complete` | boolean | Onboarding complete. | No | `False` | — |

## Game Ruleset (`game-ruleset`)

Versioned match rules: period length, offside, fouls/cards, substitutions, restart rules and official scoring parameters.

- **Kind:** `collectionType`
- **Database collection:** `game_rulesets`
- **Strapi UID:** `api::game-ruleset.game-ruleset`
- **Fields:** 14

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `ruleset_code` | string | Ruleset code. | Yes | — | unique |
| `ruleset_name` | string | Ruleset name. | Yes | — | — |
| `ruleset_version` | string | Ruleset version. | No | `1.0.0` | — |
| `match_length_minutes` | integer | Match length minutes. | No | `90` | min 1; max 120 |
| `period_count` | integer | Period count. | No | `2` | min 1; max 4 |
| `added_time_enabled` | boolean | Added time enabled. | No | `True` | — |
| `offside_enabled` | boolean | Offside enabled. | No | `True` | — |
| `fouls_enabled` | boolean | Fouls enabled. | No | `True` | — |
| `cards_enabled` | boolean | Cards enabled. | No | `True` | — |
| `substitution_limit` | integer | Substitution limit. | No | `5` | min 0; max 15 |
| `restart_rules` | JSON | Restart rules. | No | `{"kickoff":true,"throwIn":true,"goalKick":true,"corn…` | — |
| `referee_profile` | JSON | Referee profile. | No | `{}` | — |
| `allowed_modes` | JSON | Allowed modes. | No | `["casual","ranked","training","pla_tournament"]` | — |
| `ruleset_game_status` | enum (draft, active, deprecated) | Ruleset game status. | Yes | `draft` | — |

## Kit Preset (`kit-preset`)

Reusable kit palette and asset key. Clubs select a kit; the 3D client renders the visual asset.

- **Kind:** `collectionType`
- **Database collection:** `kit_presets`
- **Strapi UID:** `api::kit-preset.kit-preset`
- **Fields:** 8

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `kit_code` | string | Kit code. | Yes | — | unique |
| `kit_name` | string | Kit name. | Yes | — | — |
| `primary_color` | string | Primary color. | No | `#FFFFFF` | — |
| `secondary_color` | string | Secondary color. | No | `#111111` | — |
| `trim_color` | string | Trim color. | No | `#00AA55` | — |
| `pattern_key` | string | Pattern key. | No | — | — |
| `kit_metadata` | JSON | Kit metadata. | No | `{}` | — |
| `kit_game_status` | enum (active, inactive) | Kit game status. | No | `active` | — |

## Leaderboard Entry (`leaderboard-entry`)

Cached per-player ranking row for an all-time or seasonal leaderboard. App XP is the primary ranking metric.

- **Kind:** `collectionType`
- **Database collection:** `leaderboard_entries`
- **Strapi UID:** `api::leaderboard-entry.leaderboard-entry`
- **Fields:** 11

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `leaderboard_code` | string | Leaderboard code. | Yes | — | — |
| `season_key` | string | Season key. | No | `all_time` | — |
| `country` | relation manyToOne → `api::country.country` | Country. | No | — | — |
| `rank_position` | integer | Rank position. | No | — | min 1 |
| `app_xp` | integer | Non-spendable progression and leaderboard XP. | No | `0` | min 0 |
| `matches_played` | integer | Matches played. | No | `0` | min 0 |
| `wins` | integer | Wins. | No | `0` | min 0 |
| `goal_difference` | integer | Goal difference. | No | `0` | — |
| `last_calculated_at` | datetime | Last calculated at. | No | — | — |
| `leaderboard_metadata` | JSON | Leaderboard metadata. | No | `{}` | — |

## Manager Template (`manager-template`)

Reusable default/premium manager card template with tactical modifiers, rating, asset identity and premium tier.

- **Kind:** `collectionType`
- **Database collection:** `manager_templates`
- **Strapi UID:** `api::manager-template.manager-template`
- **Fields:** 9

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `internal_name` | string | Internal name. | Yes | — | unique |
| `display_name` | string | Display name. | Yes | — | — |
| `manager_archetype` | enum (balanced, possession, counter_attack, pressing, defensive, direct, youth_development) | Manager archetype. | Yes | `balanced` | — |
| `attribute_modifiers` | JSON | Attribute modifiers. | No | `{"tacticalAwareness":50,"motivation":50,"adaptabilit…` | — |
| `tactical_preferences` | JSON | Tactical preferences. | No | `{}` | — |
| `premium_tier` | enum (standard, premium, elite) | Premium tier. | No | `standard` | — |
| `unlock_currency` | enum (bronze, diamond, none) | Unlock currency. | No | `bronze` | — |
| `unlock_price_coins` | integer | Unlock price coins. | No | `0` | min 0 |
| `template_game_status` | enum (active, inactive) | Template game status. | No | `active` | — |

## Market Offer (`market-offer`)

PLACO Coin marketplace listing for players, managers, stadiums or kits, including price type/amount, availability window, stock and per-player limits.

- **Kind:** `collectionType`
- **Database collection:** `market_offers`
- **Strapi UID:** `api::market-offer.market-offer`
- **Fields:** 16

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `offer_code` | string | Offer code. | Yes | — | unique |
| `offer_name` | string | Offer name. | Yes | — | — |
| `offer_type` | enum (player, manager, stadium, kit) | Offer type. | Yes | `player` | — |
| `player_template` | relation manyToOne → `api::player-template.player-template` | Player template. | No | — | — |
| `manager_template` | relation manyToOne → `api::manager-template.manager-template` | Manager template. | No | — | — |
| `stadium_preset` | relation manyToOne → `api::stadium-preset.stadium-preset` | Stadium preset. | No | — | — |
| `kit_preset` | relation manyToOne → `api::kit-preset.kit-preset` | Kit preset. | No | — | — |
| `price_coin_type` | enum (bronze, diamond) | Price coin type. | Yes | `bronze` | — |
| `price_coins` | integer | Price coins. | Yes | — | min 0 |
| `offer_game_status` | enum (active, inactive, sold_out, scheduled) | Offer game status. | Yes | `active` | — |
| `stock_limit` | integer | Stock limit. | No | — | min 0 |
| `stock_sold` | integer | Stock sold. | No | `0` | min 0 |
| `available_from` | datetime | Available from. | No | — | — |
| `available_until` | datetime | Available until. | No | — | — |
| `per_player_limit` | integer | Per player limit. | No | — | min 1 |
| `offer_metadata` | JSON | Offer metadata. | No | `{}` | — |

## Market Purchase (`market-purchase`)

Idempotent marketplace purchase record and grant outcome linking a coin debit to the granted player, manager, stadium or kit.

- **Kind:** `collectionType`
- **Database collection:** `market_purchases`
- **Strapi UID:** `api::market-purchase.market-purchase`
- **Fields:** 10

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `purchase_code` | string | Purchase code. | Yes | — | unique |
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `market_offer` | relation manyToOne → `api::market-offer.market-offer` | Market offer. | Yes | — | — |
| `coin_type_paid` | enum (bronze, diamond) | Coin type paid. | Yes | — | — |
| `coins_paid` | integer | Coins paid. | Yes | — | min 0 |
| `purchase_game_status` | enum (created, paid, granted, failed, reversed) | Purchase game status. | Yes | `created` | — |
| `idempotency_key` | string | Unique retry key that prevents duplicate processing. | Yes | — | unique |
| `granted_club_player` | relation manyToOne → `api::club-player.club-player` | Granted club player. | No | — | — |
| `granted_club_manager` | relation manyToOne → `api::club-manager.club-manager` | Granted club manager. | No | — | — |
| `purchase_metadata` | JSON | Purchase metadata. | No | `{}` | — |

## Match (`match`)

Canonical game match for casual, ranked, training or PLA tournament play. Freezes roster/rules/physics/AI snapshots and records authoritative final score/result digest.

- **Kind:** `collectionType`
- **Database collection:** `matches`
- **Strapi UID:** `api::match.match`
- **Fields:** 31

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `match_code` | string | Match code. | Yes | — | unique |
| `match_mode` | enum (casual, ranked, training, pla_tournament) | Match mode. | Yes | `casual` | — |
| `match_status` | enum (created, ready, in_progress, awaiting_verification, verified, rejected, abandoned, cancelled) | Match status. | Yes | `created` | — |
| `home_player` | relation manyToOne → `api::game-profile.game-profile` | Home player. | Yes | — | — |
| `away_player` | relation manyToOne → `api::game-profile.game-profile` | Away player. | No | — | — |
| `home_club` | relation manyToOne → `api::club.club` | Home club. | Yes | — | — |
| `away_club` | relation manyToOne → `api::club.club` | Away club. | No | — | — |
| `home_score` | integer | Home score. | No | — | min 0 |
| `away_score` | integer | Away score. | No | — | min 0 |
| `match_started_at` | datetime | Match started at. | No | — | — |
| `match_ended_at` | datetime | Match ended at. | No | — | — |
| `verified_at` | datetime | Verified at. | No | — | — |
| `game_ruleset` | relation manyToOne → `api::game-ruleset.game-ruleset` | Game ruleset. | No | — | — |
| `physics_profile` | relation manyToOne → `api::physics-profile.physics-profile` | Physics profile. | No | — | — |
| `physics_curve_set` | relation manyToOne → `api::physics-curve-set.physics-curve-set` | Physics curve set. | No | — | — |
| `ai_behaviour_profile` | relation manyToOne → `api::ai-behaviour-profile.ai-behaviour-profile` | Ai behaviour profile. | No | — | — |
| `roster_snapshot` | JSON | Frozen match roster and cosmetic configuration. | Yes | `{}` | — |
| `roster_snapshot_hash` | string | SHA-256 hash of the frozen roster snapshot. | Yes | — | — |
| `rules_snapshot` | JSON | Rules snapshot. | No | `{}` | — |
| `physics_snapshot` | JSON | Frozen physics profile and curve data for deterministic match setup. | No | `{}` | — |
| `physics_snapshot_hash` | string | SHA-256 hash of the frozen physics snapshot. | No | — | — |
| `ai_snapshot` | JSON | Frozen AI tuning for this match. | No | `{}` | — |
| `simulation_seed` | string | Server-issued deterministic simulation seed. | Yes | — | — |
| `simulation_build` | string | Simulation build. | No | — | — |
| `result_metrics` | JSON | Result metrics. | No | `{}` | — |
| `result_digest` | string | Digest of accepted final score and verified match metrics. | No | — | — |
| `result_validation_status` | enum (not_submitted, pending, verified, rejected) | Result validation status. | Yes | `not_submitted` | — |
| `xp_granted` | boolean | Xp granted. | No | `False` | — |
| `coin_rewards_granted` | boolean | Coin rewards granted. | No | `False` | — |
| `finalisation_idempotency_key` | string | Finalisation idempotency key. | No | — | unique |
| `match_metadata` | JSON | Match metadata. | No | `{}` | — |

## Match Event (`match-event`)

Ordered match event stream for goals, cards, substitutions, fouls, kick-off and other simulation events, suitable for replay and audit.

- **Kind:** `collectionType`
- **Database collection:** `match_events`
- **Strapi UID:** `api::match-event.match-event`
- **Fields:** 11

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `match` | relation manyToOne → `api::match.match` | Match. | Yes | — | — |
| `event_sequence` | integer | Event sequence. | Yes | — | min 0 |
| `event_type` | enum (kickoff, goal, own_goal, shot, save, pass, tackle, foul, yellow_card, red_card, offside, corner, free_kick, penalty, substitution, injury, post_hit, bar_hit, line_cross, half_time, full_time, review_marker, other) | Event type. | Yes | `other` | — |
| `simulation_time_seconds` | decimal | Simulation time seconds. | Yes | — | min 0 |
| `period_number` | integer | Period number. | No | `1` | min 1; max 5 |
| `team_side` | enum (home, away, neutral) | Team side. | No | `neutral` | — |
| `actor_player_id` | string | Actor player id. | No | — | — |
| `target_player_id` | string | Target player id. | No | — | — |
| `position_payload` | JSON | Position payload. | No | `{}` | — |
| `event_payload` | JSON | Event payload. | No | `{}` | — |
| `event_hash` | string | Event hash. | No | — | — |

## Match Replay (`match-replay`)

Replay metadata, snapshot/event references, deterministic seed/build information and storage location. Large replay binaries should live in object storage.

- **Kind:** `collectionType`
- **Database collection:** `match_replays`
- **Strapi UID:** `api::match-replay.match-replay`
- **Fields:** 11

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `match` | relation manyToOne → `api::match.match` | Match. | Yes | — | — |
| `replay_code` | string | Replay code. | Yes | — | unique |
| `replay_uri` | string | Replay uri. | No | — | — |
| `replay_format_version` | string | Replay format version. | No | `1.0.0` | — |
| `simulation_seed` | string | Server-issued deterministic simulation seed. | Yes | — | — |
| `roster_snapshot_hash` | string | SHA-256 hash of the frozen roster snapshot. | Yes | — | — |
| `event_stream_hash` | string | Event stream hash. | Yes | — | — |
| `replay_blob_hash` | string | Replay blob hash. | No | — | — |
| `replay_game_status` | enum (pending, available, purged, invalid) | Replay game status. | Yes | `pending` | — |
| `retention_until` | datetime | Retention until. | No | — | — |
| `replay_metadata` | JSON | Replay metadata. | No | `{}` | — |

## Match Result Verification (`match-result-verification`)

Trusted result-submission record: HMAC signature digest, submission ID, roster/config hash checks, accepted payload and validation decisions.

- **Kind:** `collectionType`
- **Database collection:** `match_result_verifications`
- **Strapi UID:** `api::match-result-verification.match-result-verification`
- **Fields:** 13

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `match` | relation manyToOne → `api::match.match` | Match. | Yes | — | — |
| `result_submission_id` | string | Result submission id. | Yes | — | unique |
| `result_validation_status` | enum (received, verified, rejected) | Result validation status. | Yes | `received` | — |
| `signature_key_id` | string | Signature key id. | No | — | — |
| `signature_digest` | string | Signature digest. | Yes | — | — |
| `received_at` | datetime | Received at. | Yes | — | — |
| `verified_at` | datetime | Verified at. | No | — | — |
| `submitted_result` | JSON | Submitted result. | Yes | — | — |
| `computed_result_digest` | string | Computed result digest. | No | — | — |
| `roster_hash_match` | boolean | Roster hash match. | No | `False` | — |
| `snapshot_hash_match` | boolean | Snapshot hash match. | No | `False` | — |
| `event_sequence_valid` | boolean | Event sequence valid. | No | `False` | — |
| `validation_errors` | JSON | Validation errors. | No | `[]` | — |

## Match Telemetry (`match-telemetry`)

Compact match telemetry summary including shots, passes, possession, foul and other aggregate metrics; avoid storing every simulation tick here.

- **Kind:** `collectionType`
- **Database collection:** `match_telemetry`
- **Strapi UID:** `api::match-telemetry.match-telemetry`
- **Fields:** 10

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `match` | relation manyToOne → `api::match.match` | Match. | Yes | — | — |
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | No | — | — |
| `team_side` | enum (home, away, neutral) | Team side. | No | `neutral` | — |
| `telemetry_schema_version` | string | Telemetry schema version. | No | `1.0.0` | — |
| `telemetry_payload` | JSON | Telemetry payload. | Yes | `{}` | — |
| `client_fps_avg` | decimal | Client fps avg. | No | — | min 0; max 240 |
| `simulation_ticks` | integer | Simulation ticks. | No | — | min 0 |
| `event_count` | integer | Event count. | No | `0` | min 0 |
| `payload_hash` | string | Payload hash. | No | — | — |
| `received_at` | datetime | Received at. | No | — | — |

## Matchmaking Ticket (`matchmaking-ticket`)

Queue request for casual/ranked online play; includes mode, region/rating information, expiry, ticket code and matching lifecycle.

- **Kind:** `collectionType`
- **Database collection:** `matchmaking_tickets`
- **Strapi UID:** `api::matchmaking-ticket.matchmaking-ticket`
- **Fields:** 13

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `ticket_code` | string | Ticket code. | Yes | — | unique |
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `club` | relation manyToOne → `api::club.club` | Club. | Yes | — | — |
| `match_mode` | enum (casual, ranked, pla_tournament) | Match mode. | Yes | `casual` | — |
| `region_code` | string | Region code. | No | — | — |
| `country` | relation manyToOne → `api::country.country` | Country. | No | — | — |
| `rating_at_queue` | integer | Rating at queue. | No | `0` | min 0 |
| `search_range` | integer | Search range. | No | `200` | min 0 |
| `ticket_game_status` | enum (queued, paired, cancelled, expired) | Ticket game status. | Yes | `queued` | — |
| `idempotency_key` | string | Unique retry key that prevents duplicate processing. | Yes | — | unique |
| `match` | relation manyToOne → `api::match.match` | Match. | No | — | — |
| `expires_at` | datetime | Expires at. | Yes | — | — |
| `queued_at` | datetime | Queued at. | No | — | — |

## Notification (`notification`)

Per-player in-app notification with type, body, metadata, read timestamp and optional idempotency key.

- **Kind:** `collectionType`
- **Database collection:** `notifications`
- **Strapi UID:** `api::notification.notification`
- **Fields:** 8

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `title` | string | Title. | Yes | — | — |
| `body` | text | Body. | Yes | — | — |
| `notification_type` | string | Notification type. | Yes | — | — |
| `payload` | JSON | Payload. | No | `{}` | — |
| `read_at` | datetime | Read at. | No | — | — |
| `idempotency_key` | string | Unique retry key that prevents duplicate processing. | No | — | unique |
| `delivery_game_status` | enum (pending, sent, failed) | Delivery game status. | Yes | `sent` | — |

## Physics Curve Set (`physics-curve-set`)

Versioned piecewise attribute-to-physical-parameter curves and global scale knobs used by the client simulation.

- **Kind:** `collectionType`
- **Database collection:** `physics_curve_sets`
- **Strapi UID:** `api::physics-curve-set.physics-curve-set`
- **Fields:** 6

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `curve_set_code` | string | Curve set code. | Yes | — | unique |
| `curve_set_version` | string | Curve set version. | Yes | — | — |
| `curve_definitions` | JSON | Curve definitions. | Yes | `{"topSpeed":[[1,7.627],[50,8.95],[100,10.3]],"accele…` | — |
| `global_scales` | JSON | Global scales. | No | `{"paceScale":1,"agilityScale":1,"staminaScale":1,"er…` | — |
| `curve_game_status` | enum (draft, active, deprecated) | Curve game status. | Yes | `draft` | — |
| `notes` | text | Notes. | No | — | — |

## Physics Profile (`physics-profile`)

Versioned simulation constants: pitch, ball, locomotion, collision/contact, environment, camera and realism scale values.

- **Kind:** `collectionType`
- **Database collection:** `physics_profiles`
- **Strapi UID:** `api::physics-profile.physics-profile`
- **Fields:** 13

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `profile_code` | string | Profile code. | Yes | — | unique |
| `profile_name` | string | Profile name. | Yes | — | — |
| `profile_version` | string | Profile version. | Yes | `1.0.0` | — |
| `realism_preset` | enum (arcade, contextual, weighty) | Realism preset. | No | `contextual` | — |
| `pitch_spec` | JSON | Pitch spec. | No | `{"lengthM":105,"widthM":68,"goalWidthM":7.32,"goalHe…` | — |
| `ball_spec` | JSON | Ball spec. | No | `{"radiusM":0.11,"massKg":0.43,"inertiaKgM2":0.00347,…` | — |
| `player_motion_spec` | JSON | Player motion spec. | No | `{"jogMps":3.5,"runMps":6,"sprintMps":9,"longitudinal…` | — |
| `contact_spec` | JSON | Contact spec. | No | `{"postRadiusM":0.06,"footRestitution":0.5,"thighRest…` | — |
| `camera_spec` | JSON | Camera spec. | No | `{"defaultMode":"tv","availableModes":["tv","sideline…` | — |
| `global_scales` | JSON | Global scales. | No | `{"paceScale":1,"agilityScale":1,"ballSpeedScale":1,"…` | — |
| `profile_game_status` | enum (draft, active, deprecated) | Profile game status. | Yes | `draft` | — |
| `effective_from` | datetime | Effective from. | No | — | — |
| `notes` | text | Notes. | No | — | — |

## Pla Fixture Link (`pla-fixture-link`)

Trust link between a PLA fixture/tournament and one canonical PLACO match. Contains PLA IDs, participants, assigned match and result-sync state.

- **Kind:** `collectionType`
- **Database collection:** `pla_fixture_links`
- **Strapi UID:** `api::pla-fixture-link.pla-fixture-link`
- **Fields:** 17

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `pla_fixture_id` | string | Pla fixture id. | Yes | — | unique |
| `pla_tournament_id` | string | Pla tournament id. | Yes | — | — |
| `pla_stage_id` | string | Pla stage id. | No | — | — |
| `home_pla_user_id` | string | Home pla user id. | Yes | — | — |
| `away_pla_user_id` | string | Away pla user id. | Yes | — | — |
| `home_player` | relation manyToOne → `api::game-profile.game-profile` | Home player. | Yes | — | — |
| `away_player` | relation manyToOne → `api::game-profile.game-profile` | Away player. | Yes | — | — |
| `fixture_game_status` | enum (assigned, ready, in_progress, result_pending, result_sent, cancelled, rejected) | Fixture game status. | Yes | `assigned` | — |
| `match` | relation oneToOne → `api::match.match` | Match. | No | — | — |
| `assignment_idempotency_key` | string | Assignment idempotency key. | Yes | — | unique |
| `pla_signed_payload_hash` | string | Pla signed payload hash. | Yes | — | — |
| `match_rules` | JSON | Match rules. | No | `{}` | — |
| `scheduled_at` | datetime | Scheduled at. | No | — | — |
| `result_sent_at` | datetime | Result sent at. | No | — | — |
| `last_sync_error` | text | Last sync error. | No | — | — |
| `cash_prize_managed_by_pla` | boolean | Cash prize managed by pla. | No | `True` | — |
| `fixture_metadata` | JSON | Fixture metadata. | No | `{}` | — |

## Pla Outbox Event (`pla-outbox-event`)

Durable outgoing PLA event for verified match results. Retries with backoff and idempotency; avoids losing a result when PLA is unavailable.

- **Kind:** `collectionType`
- **Database collection:** `pla_outbox_events`
- **Strapi UID:** `api::pla-outbox-event.pla-outbox-event`
- **Fields:** 13

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `event_code` | string | Event code. | Yes | — | unique |
| `event_type` | enum (fixture_accepted, match_started, match_verified, match_rejected, player_profile_sync) | Event type. | Yes | `match_verified` | — |
| `pla_fixture_link` | relation manyToOne → `api::pla-fixture-link.pla-fixture-link` | Pla fixture link. | No | — | — |
| `match` | relation manyToOne → `api::match.match` | Match. | No | — | — |
| `event_payload` | JSON | Event payload. | Yes | — | — |
| `event_payload_hash` | string | Event payload hash. | Yes | — | — |
| `delivery_game_status` | enum (pending, sending, delivered, retryable_error, dead_letter) | Delivery game status. | Yes | `pending` | — |
| `attempt_count` | integer | Attempt count. | No | `0` | min 0 |
| `next_attempt_at` | datetime | Next attempt at. | No | — | — |
| `last_attempt_at` | datetime | Last attempt at. | No | — | — |
| `delivered_at` | datetime | Delivered at. | No | — | — |
| `last_error` | text | Last error. | No | — | — |
| `idempotency_key` | string | Unique retry key that prevents duplicate processing. | Yes | — | unique |

## Player Development Record (`player-development-record`)

Audit of permanent or seasonal player progression, upgrades, level changes and resulting attribute changes.

- **Kind:** `collectionType`
- **Database collection:** `player_development_records`
- **Strapi UID:** `api::player-development-record.player-development-record`
- **Fields:** 11

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `club_player` | relation manyToOne → `api::club-player.club-player` | Club player. | Yes | — | — |
| `development_type` | enum (training, level_up, attribute_upgrade, premium_unlock, admin_adjustment, reversal) | Development type. | Yes | `training` | — |
| `attributes_before` | JSON | Attributes before. | No | `{}` | — |
| `attributes_after` | JSON | Attributes after. | No | `{}` | — |
| `coin_type_spent` | enum (bronze, diamond, none) | Coin type spent. | No | `none` | — |
| `coins_spent` | integer | Coins spent. | No | `0` | min 0 |
| `xp_spent` | integer | Xp spent. | No | `0` | min 0 |
| `development_game_status` | enum (pending, completed, failed) | Development game status. | Yes | `pending` | — |
| `idempotency_key` | string | Unique retry key that prevents duplicate processing. | Yes | — | unique |
| `development_metadata` | JSON | Development metadata. | No | `{}` | — |

## Player Template (`player-template`)

Admin-defined player archetype with internal name, unique template identity, slot/position, body measurements, all 1–100 technical/physical/mental attributes, goalkeeper attributes, traits and premium tier.

- **Kind:** `collectionType`
- **Database collection:** `player_templates`
- **Strapi UID:** `api::player-template.player-template`
- **Fields:** 17

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `internal_name` | string | Internal name. | Yes | — | unique |
| `display_name` | string | Display name. | Yes | — | — |
| `position_number` | integer | Position number. | Yes | — | min 1; max 99 |
| `primary_position` | enum (GK, CB, FB, DM, CM, AM, W, ST) | Primary position. | Yes | `CM` | — |
| `secondary_positions` | JSON | Secondary positions. | No | `[]` | — |
| `height_cm` | integer | Height cm. | No | `180` | min 160; max 205 |
| `weight_kg` | integer | Weight kg. | No | `75` | min 55; max 100 |
| `preferred_foot` | enum (L, R) | Preferred foot. | Yes | `R` | — |
| `attributes` | JSON | Default 1–100 player attribute map. | Yes | `{"sprintSpeed":65,"acceleration":65,"agility":60,"ba…` | — |
| `goalkeeper_attributes` | JSON | Keeper-only 1–100 attribute map. | No | `{"reflexes":30,"diving":30,"handling":30,"kicking":3…` | — |
| `traits` | JSON | Traits. | No | `[]` | — |
| `player_archetype` | enum (keeper, defender, fullback, defensive_midfielder, midfielder, attacking_midfielder, winger, striker) | Player archetype. | No | `midfielder` | — |
| `overall_rating` | integer | Overall rating. | No | `50` | min 1; max 100 |
| `premium_tier` | enum (standard, premium, elite) | Premium tier. | No | `standard` | — |
| `template_game_status` | enum (active, inactive, retired) | Template game status. | No | `active` | — |
| `asset_bundle_key` | string | Asset bundle key. | No | — | — |
| `appearance_defaults` | JSON | Appearance defaults. | No | `{"modelKey":"player-default-v1","skinTone":"default"…` | — |

## Player Training Record (`player-training-record`)

Training-session record tying a drill/type and player to a score, improvements or reward result.

- **Kind:** `collectionType`
- **Database collection:** `player_training_records`
- **Strapi UID:** `api::player-training-record.player-training-record`
- **Fields:** 9

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `club_player` | relation manyToOne → `api::club-player.club-player` | Club player. | Yes | — | — |
| `training_session` | relation manyToOne → `api::training-session.training-session` | Training session. | No | — | — |
| `training_focus` | enum (pace, shooting, passing, dribbling, defending, goalkeeping, stamina, balanced) | Training focus. | Yes | `balanced` | — |
| `performance_score` | decimal | Performance score. | No | — | min 0; max 100 |
| `attribute_deltas` | JSON | Attribute deltas. | No | `{}` | — |
| `xp_earned` | integer | Xp earned. | No | `0` | min 0 |
| `completed_at` | datetime | Completed at. | No | — | — |
| `record_idempotency_key` | string | Record idempotency key. | Yes | — | unique |

## Restricted Name (`restricted-name`)

Normalised terms and aliases that should not be allowed for custom player/manager/club naming because they are famous people, clubs or protected names.

- **Kind:** `collectionType`
- **Database collection:** `restricted_names`
- **Strapi UID:** `api::restricted-name.restricted-name`
- **Fields:** 8

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `display_term` | string | Display term. | Yes | — | — |
| `normalized_term` | string | Normalized term. | Yes | — | unique |
| `term_category` | enum (person, footballer, club, manager, brand, other) | Term category. | Yes | `person` | — |
| `matching_mode` | enum (exact, normalized, token, fuzzy) | Matching mode. | Yes | `normalized` | — |
| `aliases` | JSON | Aliases. | No | `[]` | — |
| `locale` | string | Locale. | No | `*` | — |
| `reason` | text | Reason. | No | — | — |
| `term_game_status` | enum (active, inactive) | Term game status. | Yes | `active` | — |

## Rewarded Ad Impression (`rewarded-ad-impression`)

One rewarded-ad attempt, including nonce/hash, expiry, provider transaction ID, verification state and reward outcome. Reward amounts are resolved server-side.

- **Kind:** `collectionType`
- **Database collection:** `rewarded_ad_impressions`
- **Strapi UID:** `api::rewarded-ad-impression.rewarded-ad-impression`
- **Fields:** 17

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `impression_code` | string | Impression code. | Yes | — | unique |
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `provider` | relation manyToOne → `api::rewarded-ad-provider.rewarded-ad-provider` | Provider. | Yes | — | — |
| `ad_unit_id` | string | Ad unit id. | Yes | — | — |
| `client_session_hash` | string | Client session hash. | No | — | — |
| `server_nonce_hash` | string | Server nonce hash. | Yes | — | unique |
| `impression_game_status` | enum (started, completed_client_side, server_verified, rewarded, rejected, expired) | Impression game status. | Yes | `started` | — |
| `provider_transaction_id` | string | Provider transaction id. | No | — | unique |
| `provider_callback_hash` | string | Provider callback hash. | No | — | — |
| `coin_type_rewarded` | enum (bronze, diamond) | Coin type rewarded. | No | `bronze` | — |
| `coin_amount_rewarded` | integer | Coin amount rewarded. | No | `0` | min 0 |
| `coin_ledger` | relation manyToOne → `api::coin-ledger.coin-ledger` | Coin ledger. | No | — | — |
| `started_at` | datetime | Started at. | Yes | — | — |
| `verified_at` | datetime | Verified at. | No | — | — |
| `expires_at` | datetime | Expires at. | Yes | — | — |
| `rejection_reason` | string | Rejection reason. | No | — | — |
| `impression_metadata` | JSON | Impression metadata. | No | `{}` | — |

## Rewarded Ad Provider (`rewarded-ad-provider`)

Provider configuration (AdMob or other rewarded-ad networks), server-verification requirement, ad units, reward caps, daily limits and secret variable name.

- **Kind:** `collectionType`
- **Database collection:** `rewarded_ad_providers`
- **Strapi UID:** `api::rewarded-ad-provider.rewarded-ad-provider`
- **Fields:** 12

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `provider_code` | string | Provider code. | Yes | — | unique |
| `provider_name` | string | Provider name. | Yes | — | — |
| `provider_type` | enum (admob, unity_ads, applovin, iron_source, custom) | Provider type. | Yes | `admob` | — |
| `provider_game_status` | enum (active, inactive) | Provider game status. | Yes | `inactive` | — |
| `server_verification_enabled` | boolean | Server verification enabled. | No | `True` | — |
| `environment_secret_key_name` | string | Environment secret key name. | No | — | — |
| `allowed_ad_unit_ids` | JSON | Allowed ad unit ids. | No | `[]` | — |
| `bronze_reward_amount` | integer | Bronze reward amount. | No | `20` | min 0 |
| `diamond_reward_amount` | integer | Diamond reward amount. | No | `0` | min 0 |
| `max_rewards_per_player_day` | integer | Max rewards per player day. | No | `10` | min 0 |
| `minimum_interval_seconds` | integer | Minimum interval seconds. | No | `30` | min 0 |
| `provider_metadata` | JSON | Provider metadata. | No | `{}` | — |

## Stadium Preset (`stadium-preset`)

Basic or premium stadium configuration, size/material/light/backdrop/advertising-board assets and unlock tier.

- **Kind:** `collectionType`
- **Database collection:** `stadium_presets`
- **Strapi UID:** `api::stadium-preset.stadium-preset`
- **Fields:** 11

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `stadium_code` | string | Stadium code. | Yes | — | unique |
| `stadium_name` | string | Stadium name. | Yes | — | — |
| `visual_asset_key` | string | Visual asset key. | No | — | — |
| `pitch_surface` | enum (dry_grass, wet_grass, heavy_grass, artificial) | Pitch surface. | No | `dry_grass` | — |
| `pitch_width_m` | decimal | Pitch width m. | No | `68` | min 60; max 75 |
| `pitch_length_m` | decimal | Pitch length m. | No | `105` | min 95; max 115 |
| `lighting_profile` | JSON | Lighting profile. | No | `{}` | — |
| `stadium_features` | JSON | Stadium features. | No | `{"crowdEnabled":false,"standsEnabled":false,"adverti…` | — |
| `unlock_currency` | enum (bronze, diamond, none) | Unlock currency. | No | `bronze` | — |
| `unlock_price_coins` | integer | Unlock price coins. | No | `0` | min 0 |
| `stadium_game_status` | enum (active, inactive) | Stadium game status. | No | `active` | — |

## Store Product Offer (`store-product-offer`)

Country-specific display listing of an App Store / Google Play product SKU and price/currency. No card charge or store payment is processed by Strapi.

- **Kind:** `collectionType`
- **Database collection:** `store_product_offers`
- **Strapi UID:** `api::store-product-offer.store-product-offer`
- **Fields:** 11

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `coin_product` | relation manyToOne → `api::coin-product.coin-product` | Coin product. | Yes | — | — |
| `country` | relation manyToOne → `api::country.country` | Country. | Yes | — | — |
| `currency` | relation manyToOne → `api::currency.currency` | Currency. | Yes | — | — |
| `store_provider` | enum (google_play, apple_app_store, web_store, other) | Store provider. | Yes | `google_play` | — |
| `provider_product_id` | string | Provider product id. | Yes | — | — |
| `display_price` | decimal | Display price. | Yes | — | min 0 |
| `display_price_label` | string | Display price label. | No | — | — |
| `offer_game_status` | enum (active, inactive) | Offer game status. | Yes | `active` | — |
| `effective_from` | datetime | Effective from. | No | — | — |
| `effective_until` | datetime | Effective until. | No | — | — |
| `offer_metadata` | JSON | Offer metadata. | No | `{}` | — |

## Store Purchase (`store-purchase`)

Purchase intent and server-verified store receipt reference. Prevents client claims from being enough to credit coins.

- **Kind:** `collectionType`
- **Database collection:** `store_purchases`
- **Strapi UID:** `api::store-purchase.store-purchase`
- **Fields:** 17

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `purchase_code` | string | Purchase code. | Yes | — | unique |
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `coin_product` | relation manyToOne → `api::coin-product.coin-product` | Coin product. | Yes | — | — |
| `store_product_offer` | relation manyToOne → `api::store-product-offer.store-product-offer` | Store product offer. | No | — | — |
| `store_provider` | enum (google_play, apple_app_store, web_store, other) | Store provider. | Yes | `google_play` | — |
| `provider_purchase_id` | string | Provider purchase id. | No | — | — |
| `provider_transaction_id` | string | Provider transaction id. | No | — | unique |
| `purchase_game_status` | enum (intent_created, awaiting_receipt, verifying, fulfilled, rejected, refunded, cancelled) | Purchase game status. | Yes | `intent_created` | — |
| `display_price` | decimal | Display price. | No | — | min 0 |
| `currency` | relation manyToOne → `api::currency.currency` | Currency. | No | — | — |
| `receipt_hash` | string | Receipt hash. | No | — | — |
| `verification_reference` | string | Verification reference. | No | — | — |
| `bronze_coins_granted` | integer | Bronze coins granted. | No | `0` | min 0 |
| `diamond_coins_granted` | integer | Diamond coins granted. | No | `0` | min 0 |
| `idempotency_key` | string | Unique retry key that prevents duplicate processing. | Yes | — | unique |
| `verified_at` | datetime | Verified at. | No | — | — |
| `purchase_metadata` | JSON | Purchase metadata. | No | `{}` | — |

## Tactical Profile (`tactical-profile`)

Team-level formation/tactical presets such as build-up, press intensity, defensive line, width, transition and marking behaviour.

- **Kind:** `collectionType`
- **Database collection:** `tactical_profiles`
- **Strapi UID:** `api::tactical-profile.tactical-profile`
- **Fields:** 11

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `tactical_code` | string | Tactical code. | Yes | — | unique |
| `tactical_name` | string | Tactical name. | Yes | — | — |
| `mentality` | enum (very_defensive, defensive, balanced, attacking, very_attacking) | Mentality. | No | `balanced` | — |
| `pressing_style` | enum (low_block, mid_block, high_press, counter_press, balanced) | Pressing style. | No | `balanced` | — |
| `build_up_style` | enum (short_passing, balanced, direct, long_ball) | Build up style. | No | `balanced` | — |
| `attacking_width` | decimal | Attacking width. | No | `0.5` | min 0; max 1 |
| `defensive_line_height` | decimal | Defensive line height. | No | `0.5` | min 0; max 1 |
| `tempo` | decimal | Tempo. | No | `0.5` | min 0; max 1 |
| `counter_attack_enabled` | boolean | Counter attack enabled. | No | `True` | — |
| `role_instructions` | JSON | Role instructions. | No | `{}` | — |
| `tactical_game_status` | enum (active, inactive) | Tactical game status. | Yes | `active` | — |

## Training Session (`training-session`)

Training encounter against a configured AI team/difficulty. Stores requested drill, match reference, daily-limit/reward state and completion data.

- **Kind:** `collectionType`
- **Database collection:** `training_sessions`
- **Strapi UID:** `api::training-session.training-session`
- **Fields:** 15

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `session_code` | string | Session code. | Yes | — | unique |
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `ai_team` | relation manyToOne → `api::ai-team.ai-team` | Ai team. | Yes | — | — |
| `difficulty_profile` | relation manyToOne → `api::ai-difficulty-profile.ai-difficulty-profile` | Difficulty profile. | Yes | — | — |
| `game_ruleset` | relation manyToOne → `api::game-ruleset.game-ruleset` | Game ruleset. | No | — | — |
| `physics_profile` | relation manyToOne → `api::physics-profile.physics-profile` | Physics profile. | No | — | — |
| `player_club` | relation manyToOne → `api::club.club` | Player club. | No | — | — |
| `training_game_status` | enum (created, ready, in_progress, completed, abandoned, expired) | Training game status. | Yes | `created` | — |
| `match` | relation oneToOne → `api::match.match` | Match. | No | — | — |
| `started_at` | datetime | Started at. | No | — | — |
| `completed_at` | datetime | Completed at. | No | — | — |
| `training_day_key` | string | Training day key. | No | — | — |
| `rewards_granted` | boolean | Rewards granted. | No | `False` | — |
| `session_metadata` | JSON | Session metadata. | No | `{}` | — |
| `idempotency_key` | string | Unique retry key that prevents duplicate processing. | No | — | unique |

## Xp Ledger (`xp-ledger`)

Append-only XP award record, calculation breakdown and idempotency key. XP is progression/ranking data, not PLAPO or spendable coin currency.

- **Kind:** `collectionType`
- **Database collection:** `xp_ledgers`
- **Strapi UID:** `api::xp-ledger.xp-ledger`
- **Fields:** 8

| Field | Type / relation | Purpose | Required | Default | Constraints / notes |
|---|---|---|---:|---|---|
| `player` | relation manyToOne → `api::game-profile.game-profile` | Player. | Yes | — | — |
| `match` | relation manyToOne → `api::match.match` | Match. | No | — | — |
| `xp_delta` | integer | Xp delta. | Yes | — | — |
| `balance_after` | integer | Wallet balance after the movement. | Yes | — | min 0 |
| `xp_reason` | enum (match_win, match_draw, match_loss, training, admin_adjustment, season_bonus, reversal) | Xp reason. | Yes | `match_win` | — |
| `idempotency_key` | string | Unique retry key that prevents duplicate processing. | Yes | — | unique |
| `calculation_breakdown` | JSON | Calculation breakdown. | No | `{}` | — |
| `created_by_system` | string | Created by system. | No | `placo` | — |

