import { UID } from './ids';

export function normalizeName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en').replace(/[^a-z0-9]/g, '');
}

export async function validateCustomName(strapi: any, candidate: unknown): Promise<{ valid: boolean; reason?: string }> {
  if (typeof candidate !== 'string') return { valid: false, reason: 'Name must be text' };
  const name = candidate.trim();
  if (name.length < 2 || name.length > 24) return { valid: false, reason: 'Name must contain 2–24 characters' };
  if (!/^[\p{L}\p{N} ._'’-]+$/u.test(name)) return { valid: false, reason: 'Name contains unsupported characters' };
  const normalized = normalizeName(name);
  if (!normalized) return { valid: false, reason: 'Name is not valid' };
  const records = await strapi.db.query('api::restricted-name.restricted-name').findMany({
    where: { term_game_status: 'active' },
    select: ['display_term', 'normalized_term', 'matching_mode', 'aliases'],
    limit: 5000,
  });
  for (const record of records) {
    const terms = [record.normalized_term, ...(Array.isArray(record.aliases) ? record.aliases.map(normalizeName) : [])].filter(Boolean);
    if (terms.some((term: string) => normalized === term || (record.matching_mode === 'token' && normalized.includes(term)) || (record.matching_mode === 'fuzzy' && normalized.includes(term)))) {
      return { valid: false, reason: 'This name is reserved or too similar to a protected public name' };
    }
  }
  return { valid: true };
}
