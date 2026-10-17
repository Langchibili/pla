import crypto from 'node:crypto';
import { UID } from './ids';

const USER_UID = 'plugin::users-permissions.user';
const ROLE_UID = 'plugin::users-permissions.role';
const PLA_USER_PATH = '/users/me?populate[country][populate][default_currency]=true&populate[preferred_currency]=true';

type UnknownRecord = Record<string, unknown>;

export class PlaAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function record(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as UnknownRecord;
  if (candidate.data && typeof candidate.data === 'object') return record(candidate.data);
  if (candidate.attributes && typeof candidate.attributes === 'object') {
    return { ...candidate, ...(candidate.attributes as UnknownRecord) };
  }
  return candidate;
}

function externalId(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const result = String(value).trim();
  return result.length > 0 && result.length <= 128 ? result : '';
}

function configuredPlaApiUrl(): string {
  const configured = (process.env.PLA_API_URL ?? 'http://localhost:1377/api').trim().replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new PlaAuthError(503, 'PLA authentication is not configured correctly');
  }
  if (!['http:', 'https:'].includes(url.protocol)
    || url.username
    || url.password
    || url.search
    || url.hash
    || (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new PlaAuthError(503, 'PLA authentication is not configured correctly');
  }
  return configured;
}

async function fetchPlaUser(token: string): Promise<UnknownRecord> {
  const url = `${configuredPlaApiUrl()}${PLA_USER_PATH}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: controller.signal,
    });
  } catch {
    throw new PlaAuthError(503, 'Could not verify your PLA account right now');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) throw new PlaAuthError(401, 'Your PLA session has expired. Please sign in again.');
  if (response.status === 403) throw new PlaAuthError(403, 'This PLA account cannot access PLACO.');
  if (!response.ok) throw new PlaAuthError(503, 'Could not verify your PLA account right now');

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PlaAuthError(502, 'PLA returned an invalid account response');
  }
  const user = record(payload);
  if (!user) throw new PlaAuthError(502, 'PLA returned an invalid account response');
  return user;
}

async function findGameCountry(strapi: any, plaUser: UnknownRecord) {
  const plaCountry = record(plaUser.country);
  const code = typeof plaCountry?.iso_code === 'string' ? plaCountry.iso_code.trim().toLowerCase() : '';
  const name = typeof plaCountry?.name === 'string' ? plaCountry.name.trim().toLowerCase() : '';
  if (!code || !name) {
    throw new PlaAuthError(422, 'Your PLA country is not currently available in PLACO.');
  }

  const matchingCountries = (await strapi.db.query(UID.country).findMany({
    where: { country_status: 'active' },
    select: ['id', 'name', 'iso_code'],
    populate: { default_currency: true },
  })).filter((candidate: UnknownRecord) =>
    typeof candidate.iso_code === 'string' && candidate.iso_code.trim().toLowerCase() === code);
  const namedMatches = matchingCountries.length > 1
    ? matchingCountries.filter((candidate: UnknownRecord) =>
      typeof candidate.name === 'string' && candidate.name.trim().toLowerCase() === name)
    : matchingCountries;
  const country = namedMatches.length === 1 ? namedMatches[0] : null;
  if (!country) throw new PlaAuthError(422, 'Your PLA country is not currently available in PLACO.');

  const plaCurrency = record(plaUser.preferred_currency);
  const preferredCode = typeof plaCurrency?.code === 'string'
    ? plaCurrency.code.trim().toUpperCase()
    : '';
  let currency = preferredCode
    ? await strapi.db.query(UID.currency).findOne({
      where: { code: preferredCode, currency_status: 'active' },
    })
    : null;
  currency ??= country.default_currency ?? null;
  return { country, currency };
}

export async function exchangePlaToken(strapi: any, suppliedToken: unknown): Promise<{ jwt: string }> {
  if (typeof suppliedToken !== 'string' || suppliedToken.length < 16 || suppliedToken.length > 8192) {
    throw new PlaAuthError(400, 'A valid PLA session token is required');
  }

  const plaUser = await fetchPlaUser(suppliedToken);
  if (plaUser.blocked === true
    || plaUser.confirmed === false
    || ['suspended', 'banned'].includes(String(plaUser.user_status ?? '').toLowerCase())) {
    throw new PlaAuthError(403, 'This PLA account cannot access PLACO.');
  }
  const plaUserId = externalId(plaUser.id ?? plaUser.documentId);
  const email = typeof plaUser.email === 'string' ? plaUser.email.trim().toLowerCase() : '';
  const plaUsername = typeof plaUser.username === 'string' ? plaUser.username.trim().slice(0, 120) : '';
  if (!plaUserId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PlaAuthError(502, 'PLA returned incomplete account details');
  }

  const { country, currency } = await findGameCountry(strapi, plaUser);
  const users = strapi.db.query(USER_UID);
  let user = await users.findOne({ where: { pla_external_user_id: plaUserId } });

  if (user && (user.blocked || (user.user_status && user.user_status !== 'active'))) {
    throw new PlaAuthError(403, 'This PLACO account cannot access the game.');
  }

  const userData: UnknownRecord = {};
  if (user && user.email?.toLowerCase() !== email) {
    const emailOwner = await users.findOne({ where: { email } });
    if (emailOwner && emailOwner.id !== user.id) {
      throw new PlaAuthError(409, 'This PLA email is already used by another PLACO account.');
    }
    userData.email = email;
  }
  if (plaUsername) userData.pla_external_username = plaUsername;
  if (country) userData.country = country.id;
  if (currency) userData.preferred_currency = currency.id;

  if (user) {
    if (Object.keys(userData).length > 0) {
      await users.update({ where: { id: user.id }, data: userData });
    }
  } else {
    const emailOwner = await users.findOne({ where: { email } });
    if (emailOwner) {
      throw new PlaAuthError(409, 'A PLACO account already uses this email. Contact support to link it safely to PLA.');
    }
    const role = await strapi.db.query(ROLE_UID).findOne({
      where: { type: 'authenticated' },
      select: ['id'],
    });
    if (!role) throw new PlaAuthError(503, 'PLACO player access is not configured');

    const username = `pla-${crypto.createHash('sha256').update(plaUserId).digest('hex').slice(0, 24)}`;
    const password = crypto.randomBytes(48).toString('hex');
    try {
      user = await strapi.plugin('users-permissions').service('user').add({
        username,
        email,
        password,
        confirmed: true,
        blocked: false,
        role: role.id,
        user_status: 'active',
        pla_external_user_id: plaUserId,
        ...userData,
      });
    } catch (error) {
      user = await users.findOne({ where: { pla_external_user_id: plaUserId } });
      if (!user) {
        const conflictingUser = await users.findOne({ where: { email } });
        if (conflictingUser) {
          throw new PlaAuthError(409, 'A PLACO account already uses this email. Contact support to link it safely to PLA.');
        }
        throw error;
      }
    }
  }

  const profile = await strapi.db.query(UID.profile).findOne({ where: { user: user.id } });
  if (profile?.pla_user_id && profile.pla_user_id !== plaUserId) {
    throw new PlaAuthError(409, 'This PLACO profile is already linked to another PLA account.');
  }
  if (profile) {
    const profileData: UnknownRecord = {
      pla_user_id: plaUserId,
      ...(plaUsername ? { pla_username: plaUsername } : {}),
      ...(country ? { country: country.id } : {}),
      ...(currency ? { preferred_currency: currency.id } : {}),
    };
    await strapi.db.query(UID.profile).update({ where: { id: profile.id }, data: profileData });
  }

  const jwt = await strapi.plugin('users-permissions').service('jwt').issue({ id: user.id });
  return { jwt };
}
