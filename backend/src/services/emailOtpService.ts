import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import {
  attachAffiliateAttribution,
  createReferralCode,
} from './referralService';

const OTP_UID = 'api::email-otp.email-otp';
const USER_UID = 'plugin::users-permissions.user';
const OTP_LIFETIME_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export class EmailOtpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') throw new EmailOtpError('Email is required', 400);
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new EmailOtpError('Enter a valid email address', 400);
  }
  return email;
}

function otpHash(email: string, purpose: string, code: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new EmailOtpError('Email OTP is not configured', 503);
  return createHash('sha256').update(`${secret}:${email}:${purpose}:${code}`).digest('hex');
}

function validDeviceHash(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
    ? value.toLowerCase()
    : undefined;
}

async function sendOtpEmail(strapi: any, email: string, code: string): Promise<void> {
  await strapi.plugin('email').service('email').send({
    to: email,
    from: process.env.EMAIL_FROM,
    replyTo: process.env.EMAIL_REPLY_TO,
    subject: 'Your ProLeague Africa verification code',
    text: `Your ProLeague Africa verification code is ${code}. It expires in five minutes.`,
    html: `<p>Your ProLeague Africa verification code is <strong>${code}</strong>.</p><p>It expires in five minutes.</p>`,
  });
}

export async function sendEmailOtp(
  strapi: any,
  params: {
    email: unknown;
    purpose: unknown;
    referralCode?: unknown;
    deviceHash?: unknown;
  },
): Promise<void> {
  const email = normalizeEmail(params.email);
  const purpose = params.purpose === 'signup' ? 'signup' : params.purpose === 'login' ? 'login' : null;
  if (!purpose) throw new EmailOtpError('Purpose must be login or signup', 400);

  const referralCode = typeof params.referralCode === 'string'
    ? params.referralCode.trim().toUpperCase()
    : undefined;
  if (purpose === 'signup' && referralCode) {
    const affiliate = await strapi.db.query(USER_UID).findOne({
      where: { referral_code: referralCode },
      select: ['id'],
    });
    if (!affiliate) throw new EmailOtpError('Referral code is invalid', 400);
  }

  const existingUser = await strapi.db.query(USER_UID).findOne({
    where: { email },
    select: ['id', 'user_status'],
  });
  if (purpose === 'signup' && existingUser) {
    throw new EmailOtpError('An account with this email already exists', 409);
  }
  if (purpose === 'login' && !existingUser) {
    throw new EmailOtpError('No account found for this email', 404);
  }
  if (existingUser?.user_status && existingUser.user_status !== 'active') {
    throw new EmailOtpError('This account cannot sign in', 403);
  }

  const existingOtp = await strapi.db.query(OTP_UID).findOne({
    where: { email, purpose },
  });
  if (existingOtp && Date.now() - new Date(existingOtp.last_sent_at).getTime() < RESEND_COOLDOWN_MS) {
    throw new EmailOtpError('Wait one minute before requesting another code', 429);
  }

  const code = String(randomInt(100000, 1000000));
  const now = new Date();
  const otpData = {
    email,
    purpose,
    code_hash: otpHash(email, purpose, code),
    expires_at: new Date(now.getTime() + OTP_LIFETIME_MS),
    attempts: 0,
    last_sent_at: now,
    referral_code: purpose === 'signup' ? referralCode : undefined,
    device_hash: purpose === 'signup' ? validDeviceHash(params.deviceHash) : undefined,
  };

  const savedOtp = existingOtp
    ? await strapi.db.query(OTP_UID).update({ where: { id: existingOtp.id }, data: otpData })
    : await strapi.db.query(OTP_UID).create({ data: otpData });

  try {
    await sendOtpEmail(strapi, email, code);
  } catch (error) {
    await strapi.db.query(OTP_UID).delete({ where: { id: savedOtp.id } });
    strapi.log.error('[EmailOtp:send]', error);
    throw new EmailOtpError('Unable to send verification email', 503);
  }
}

async function nextReferralCode(strapi: any): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const referralCode = createReferralCode();
    const existing = await strapi.db.query(USER_UID).findOne({
      where: { referral_code: referralCode },
      select: ['id'],
    });
    if (!existing) return referralCode;
  }
  throw new EmailOtpError('Could not create referral code', 503);
}

function safeUser(user: any) {
  return {
    id: user.id,
    documentId: user.documentId,
    username: user.username,
    email: user.email,
    referral_code: user.referral_code,
    user_status: user.user_status,
    has_completed_tutorial: user.has_completed_tutorial,
    spendable_balance: user.spendable_balance,
    transferable_balance: user.transferable_balance,
  };
}

export async function verifyEmailOtp(
  strapi: any,
  params: { email: unknown; code: unknown; purpose: unknown; ip: string },
): Promise<{ jwt: string; user: Record<string, unknown> }> {
  const email = normalizeEmail(params.email);
  const purpose = params.purpose === 'signup' ? 'signup' : params.purpose === 'login' ? 'login' : null;
  if (!purpose) throw new EmailOtpError('Purpose must be login or signup', 400);
  if (typeof params.code !== 'string' || !/^\d{6}$/.test(params.code)) {
    throw new EmailOtpError('Enter the six-digit verification code', 400);
  }

  const otp = await strapi.db.query(OTP_UID).findOne({ where: { email, purpose } });
  if (!otp || new Date(otp.expires_at).getTime() <= Date.now()) {
    if (otp) await strapi.db.query(OTP_UID).delete({ where: { id: otp.id } });
    throw new EmailOtpError('The verification code is invalid or expired', 400);
  }
  if (Number(otp.attempts) >= MAX_ATTEMPTS) {
    await strapi.db.query(OTP_UID).delete({ where: { id: otp.id } });
    throw new EmailOtpError('Too many incorrect attempts. Request a new code.', 429);
  }

  const expectedHash = Buffer.from(otp.code_hash, 'hex');
  const receivedHash = Buffer.from(otpHash(email, purpose, params.code), 'hex');
  if (expectedHash.length !== receivedHash.length || !timingSafeEqual(expectedHash, receivedHash)) {
    const attempts = Number(otp.attempts) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await strapi.db.query(OTP_UID).delete({ where: { id: otp.id } });
      throw new EmailOtpError('Too many incorrect attempts. Request a new code.', 429);
    }
    await strapi.db.query(OTP_UID).update({ where: { id: otp.id }, data: { attempts } });
    throw new EmailOtpError('The verification code is incorrect', 400);
  }
  await strapi.db.query(OTP_UID).delete({ where: { id: otp.id } });

  let user = await strapi.db.query(USER_UID).findOne({ where: { email } });
  if (purpose === 'signup') {
    if (user) throw new EmailOtpError('An account with this email already exists', 409);
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
      select: ['id'],
    });
    if (!role) throw new EmailOtpError('Player role is not configured', 503);

    const userService = strapi.plugin('users-permissions').service('user');
    user = await userService.add({
      username: email,
      email,
      password: randomBytes(48).toString('hex'),
      confirmed: true,
      blocked: false,
      role: role.id,
      user_status: 'active',
      referral_code: await nextReferralCode(strapi),
      free_plapo_granted: false,
    });

    await attachAffiliateAttribution(strapi, user, {
      referralCode: otp.referral_code,
      deviceHash: otp.device_hash,
      ip: params.ip,
    });
  }

  if (!user) throw new EmailOtpError('No account found for this email', 404);
  if (user.user_status && user.user_status !== 'active') {
    throw new EmailOtpError('This account cannot sign in', 403);
  }

  const jwt = await strapi.plugin('users-permissions').service('jwt').issue({ id: user.id });
  return { jwt, user: safeUser(user) };
}
