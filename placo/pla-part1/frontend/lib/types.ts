export type CoinType = 'bronze' | 'diamond';

export interface Wallet { bronze_balance: number; diamond_balance: number; wallet_game_status: string }
export interface GameProfile {
  documentId: string; public_handle: string; app_xp: number;
  matches_played: number; wins: number; draws: number; losses: number;
  goals_scored: number; goals_conceded: number;
  country: { name: string; iso_code: string } | null;
  preferred_currency: { code: string; symbol: string } | null;
  wallet: Wallet | null;
}
export interface SquadPlayer {
  documentId: string; slot: string; position: string; squad_role: string;
  is_premium: boolean; attributes: Record<string, number>;
  template: { display_name: string; overall_rating: number; premium_tier: string } | null;
}
export interface Squad {
  club: { documentId: string; club_name: string };
  formation: { formation_code: string; formation_layout: any } | null;
  stadium: string | null; kit: string | null; players: SquadPlayer[];
}
export interface Formation { documentId: string; formation_code: string; formation_name: string; formation_layout: any; formation_game_status: string }
export interface MarketOffer {
  documentId: string; offer_code: string; offer_name: string; offer_type: 'player' | 'manager' | 'stadium' | 'kit';
  price_coin_type: CoinType; price_coins: number; stock_limit: number | null; stock_sold: number;
  player_template?: { display_name: string; position_number: number; overall_rating: number; premium_tier: string } | null;
}
export interface LeaderRow {
  rank: number; player: { documentId: string; handle: string }; country: string | null;
  app_xp: number; matches_played: number; wins: number; draws: number; losses: number; goal_difference: number;
}
export interface MatchRecord {
  documentId: string; match_code: string; match_mode: string; match_status: string;
  home_score: number | null; away_score: number | null;
  home_player?: { public_handle: string }; away_player?: { public_handle: string } | null;
}
export interface IssuedMatch {
  documentId: string; match_code: string; match_mode: string;
  roster_snapshot: any; roster_snapshot_hash: string;
  physics_snapshot: any; physics_snapshot_hash: string;
  rules_snapshot: any; ai_snapshot: any; simulation_seed: string;
  home_player?: { id: number }; away_player?: { id: number } | null;
}
export interface Difficulty { code: string; name: string }
