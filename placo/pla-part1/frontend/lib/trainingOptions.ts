/**
 * Codes must match the seeded AiTeam.ai_team_code / DifficultyLevel.difficulty_code rows in Strapi.
 * Edit these two lists to match your seeders (they are the only place the shell hardcodes them).
 */
export const AI_TEAMS = [
  { code: 'pla-academy', name: 'PLA Academy' },
  { code: 'pla-select', name: 'PLA Select' },
  { code: 'pla-legends', name: 'PLA Legends' },
];
export const DIFFICULTIES = [
  { code: 'easy', name: 'Easy' },
  { code: 'medium', name: 'Medium' },
  { code: 'hard', name: 'Hard' },
];

export const matchKey = (id: string) => `placo.match.${id}`;
