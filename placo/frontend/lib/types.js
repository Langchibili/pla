/**
 * @typedef {'bronze' | 'diamond'} CoinType
 * @typedef {{ bronze_balance: number, diamond_balance: number, wallet_game_status: string }} Wallet
 * @typedef {{
 *   documentId: string, public_handle: string, app_xp: number,
 *   matches_played: number, wins: number, draws: number, losses: number,
 *   goals_scored: number, goals_conceded: number,
 *   country: { name: string, iso_code: string } | null,
 *   preferred_currency: { code: string, symbol: string } | null, wallet: Wallet | null
 * }} GameProfile
 * @typedef {{
 *   documentId: string, slot: string, position: string, squad_role: string,
 *   is_premium: boolean, attributes: Record<string, number>,
 *   template: { display_name: string, overall_rating: number, premium_tier: string } | null
 * }} SquadPlayer
 * @typedef {{
 *   club: { documentId: string, club_name: string },
 *   formation: { formation_code: string, formation_layout: object } | null,
 *   stadium: string | null, kit: string | null, players: SquadPlayer[]
 * }} Squad
 * @typedef {{
 *   documentId: string, formation_code: string, formation_name: string,
 *   formation_layout: object, formation_game_status: string
 * }} Formation
 * @typedef {{
 *   documentId: string, offer_code: string, offer_name: string,
 *   offer_type: 'player' | 'manager' | 'stadium' | 'kit',
 *   price_coin_type: CoinType, price_coins: number,
 *   stock_limit: number | null, stock_sold: number,
 *   player_template?: { display_name: string, position_number: number, overall_rating: number, premium_tier: string } | null
 * }} MarketOffer
 * @typedef {{
 *   rank: number, player: { documentId: string, handle: string }, country: string | null,
 *   app_xp: number, matches_played: number, wins: number, draws: number,
 *   losses: number, goal_difference: number
 * }} LeaderRow
 * @typedef {{
 *   documentId: string, match_code: string, match_mode: string, match_status: string,
 *   home_score: number | null, away_score: number | null,
 *   home_player?: { public_handle: string }, away_player?: { public_handle: string } | null
 * }} MatchRecord
 * @typedef {{
 *   documentId: string, match_code: string, match_mode: string,
 *   roster_snapshot: object, roster_snapshot_hash: string,
 *   physics_snapshot: object, physics_snapshot_hash: string,
 *   rules_snapshot: object, ai_snapshot: object, simulation_seed: string,
 *   home_player?: { id: number }, away_player?: { id: number } | null
 * }} IssuedMatch
 * @typedef {{ code: string, name: string }} Difficulty
 * @typedef {{
 *   documentId: string, name: string, is_selected: boolean, experience_level: number,
 *   archetype: string | null, premium_tier: string, modifiers: Record<string, number>
 * }} Manager
 */
export {};
