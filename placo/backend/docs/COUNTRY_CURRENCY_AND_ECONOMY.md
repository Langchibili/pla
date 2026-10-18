# Country, currency, PLACO coin and XP policy

## PLA-compatible country and currency patterns

The `country` and `currency` content types emulate the supplied PLA naming and fallback behaviour, including:

- `country`: unique name, ISO code, dial code, one default currency, `country_status`, and nullable country overrides for starter coin grants, XP caps, Bronze Coin reward levels, rewarded-ad coin caps, store/ad availability and cash-tournament allowance.
- `currency`: unique 3-letter code, name, symbol, `rate_to_base`, `rate_updated_at`, `is_base`, `currency_status`, and inverse countries relation.
- Nigeria is seeded as an active country (`NG`, `+234`) with active NGN (`Nigerian Naira`, `N`, non-base) to match PLA's currency configuration. PLA currently has `rate_to_base=0` for NGN, so PLACO permits zero to mean no cached rate is configured. Price conversion still uses the configured server-side exchange-rate provider and fails closed when no live rate is available; it does not treat zero as a usable conversion rate.
- `admn-settings`: singleton global defaults, intentionally spelled this way with collection `admn_settings` to match PLA's existing backend conventions.
- `settingsResolver.ts`: country override wins when the field is set; otherwise global `admn_settings` applies. Base currency resolves from country default currency then global base currency.
- `currencyConversion.ts`: exchange-rate cache TTL 1 hour, request timeout 10 seconds, validates provider result and fails closed with a service-unavailable error if current conversion is unavailable. Rate lookup is for display pricing only and is not a store transaction.

The user's selected currency takes precedence over the country's default currency in store-offer display selection; a missing local price/offer should fail closed instead of inventing a price. Keep the exchange-rate API key on the server.

## Keep these units separate

| Data | Purpose | Spendable? |
|---|---|---:|
| `bronze` Coin | Everyday gameplay/market rewards and player/item purchases | Yes, according to offer policy |
| `diamond` Coin | Premium items/cards and premium marketplace uses | Yes; default ad grant is zero and it is not farmable by default |
| `app_xp` | Skill progression and primary XP leaderboard rank | No |
| `plapo` | PLA's in-app currency, owned by PLA domain | Not stored or operated by PLACO |
| Country fiat currency (e.g. ZMW) | Local display price for store products | Not a PLACO wallet currency |

The wallet has two integer balances only. A wallet credit/debit must use `walletService.changeCoins`, which creates an immutable ledger record with a unique idempotency key and balance-after value. Do not mutate wallet balance directly from the client or generic Content API CRUD. Ledger rows cannot be edited/deleted through lifecycle hooks.

## XP formula and admin limits

The current service is configured from `admn_settings` and country overrides:

`raw XP = base outcome XP + goals scored × goal weight − goals conceded × conceded-goal penalty + (possession% − 50) × possession weight + pass-accuracy% × accuracy weight + clean-sheet bonus + goal difference × goal-difference weight`

Result is rounded, floored at zero and clamped to the outcome cap (`max_xp_win`, `max_xp_draw`, `max_xp_loss`); training uses `max_xp_training`. Seed defaults are win/draw/loss/training caps of 100/65/35/40. XP calculation values, bonuses, max caps and Bronze coin match rewards are admin settings. Country `max_xp_win_override`, `max_xp_match_override` (draw/loss), and `max_xp_training_override` can supersede global limits.

These weights are starting values to calibrate, not final economy-balancing claims. A results verifier should only send server-validated possession/pass metrics and accepted goals/events. Prevent an unlimited farming loop by limiting training rewards per player/day and by idempotent match IDs.

Player-card development is server-priced: `/club-players/:documentId/develop` accepts an attribute name and `coin_type`, but never a requested numeric stat value or price. The backend computes step/cost from `player_upgrade_attribute_step`, `player_upgrade_base_coin_cost` and `player_upgrade_cost_growth`, enforces the stat budget, writes a pending/completed development audit record and performs an idempotent coin debit. Seed defaults are base 50 coins, growth factor 1.35 and one attribute point per upgrade. These defaults must be tuned before release.

## Ad reward defaults and limits

- Default rewarded-ad reward is 20 Bronze Coins and 0 Diamond Coins (country/provider caps may reduce it).
- A daily per-player cap and a minimum wait interval apply; an issued server nonce expires after 10 minutes.
- Provider config defaults to inactive, so it cannot issue rewards until server-side verification is implemented, configured and deliberately enabled.
- The callback's client fields do not choose coin type/amount. Provider-specific server-side verification must validate native SSV signature and canonical transaction ID before calling the internal callback route.

## Store economy

`coin-product` is only a logical bundle definition. `store-product-offer` maps a store SKU to a country, currency and display price. Apple/Google/platform checkout occurs outside Strapi; the backend creates an intent and only credits coins after a trusted receipt-verification service calls the signed fulfilment route. Do not accept `verified: true` from a user-facing client. Configure test products and server receipts before activating any offer.
