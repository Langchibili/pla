/**
 * The boundary between the web shell and the Babylon match engine.
 * The shell only ever passes a frozen MatchConfig in and receives a MatchResult out.
 * Nothing in the engine imports from React/Next, and nothing in the shell imports Babylon.
 */
export type CameraMode = 'side' | 'tv' | 'sideline' | 'ball' | 'goal_to_goal' | 'top_down';

export interface TeamSetup {
  clubName: string;
  formationCode: string | null;
  formation: { players: { shirtNumber: number; role: string; x: number; z: number }[] } | null;
  kit: { code: string; primary: string; secondary: string; trim: string } | null;
  players: {
    playerId: string; slot: string; position: string;
    attributes: Record<string, number>;
    goalkeeperAttributes?: Record<string, number> | null;
    traits: string[]; appearance: Record<string, unknown>;
  }[];
}

export interface MatchConfig {
  matchId: string; matchCode: string; mode: string;
  seed: string;
  /** which side the local human controls */
  controlledSide: 'home' | 'away';
  /** the other side is AI-driven when true (training); online opponents are not implemented in this build */
  opponentIsAI: boolean;
  home: TeamSetup;
  away: TeamSetup;
  physics: any; rules: any; ai: any;
  hashes: { roster: string; physics: string };
  stadium: string | null;
  camera: CameraMode;
  difficulty?: any;
}

export interface MatchMetrics { possession_percent: number; pass_accuracy_percent: number; shots: number; shots_on_target: number; passes_completed: number; passes_attempted: number; fouls: number; corners: number; saves: number }
export interface MatchEventOut { event_sequence: number; event_type: string; simulation_time_seconds: number; period_number: number; team_side: 'home' | 'away' | 'neutral'; actor_player_id?: string; position_payload?: unknown }

export interface MatchResult {
  home_score: number; away_score: number;
  metrics: { home: MatchMetrics; away: MatchMetrics };
  events: MatchEventOut[];
  match_ended_at: string; simulation_build: string;
}

export type EngineEvents = {
  ready: () => void;
  score: (s: { home: number; away: number }) => void;
  clock: (c: { seconds: number; period: number; label: string }) => void;
  goal: (g: { side: 'home' | 'away' }) => void;
  banner: (text: string) => void;
  fps: (fps: number) => void;
  finished: (r: MatchResult) => void;
  error: (message: string) => void;
};

export interface TouchInput {
  move: { x: number; y: number };       // -1..1 virtual stick
  sprint: boolean;
  action: 'pass' | 'shoot' | 'through' | 'lob' | 'cross' | 'tackle' | 'slide' | null;
  actionHeld: boolean;                  // charge while held
  modifier: 'finesse' | null;
}

export interface MatchEngine {
  start(): void;
  pause(): void;
  resume(): void;
  setInput(i: TouchInput): void;
  setCamera(mode: CameraMode): void;
  switchPlayer(): void;
  on<K extends keyof EngineEvents>(ev: K, cb: EngineEvents[K]): () => void;
  dispose(): void;
}

export type EngineFactory = (canvas: HTMLCanvasElement, config: MatchConfig) => Promise<MatchEngine>;
