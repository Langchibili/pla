import crypto from 'node:crypto';

type StrapiLogger = { log: { warn: (message: string) => void } };
export function safeEqualHex(expected: string, supplied: string): boolean {
  const a = Buffer.from(expected.replace(/^sha256=/, ''), 'hex');
  const b = Buffer.from(supplied.replace(/^sha256=/, ''), 'hex');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}
export function signatureFor(secret: string, timestamp: string, method: string, path: string, body: unknown): string {
  const canonical = `${timestamp}.${method.toUpperCase()}.${path}.${JSON.stringify(body ?? {})}`;
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}
export function verifyInternalRequest(ctx: any, secretName: string, strapi?: StrapiLogger): boolean {
  const secret = process.env[secretName]?.trim();
  if (!secret) { strapi?.log.warn(`[security] Required secret ${secretName} is not configured`); return false; }
  const timestamp = String(ctx.request.headers['x-placo-timestamp'] ?? '');
  const supplied = String(ctx.request.headers['x-placo-signature'] ?? '');
  if (!/^\d{10,13}$/.test(timestamp) || !supplied) return false;
  const ts = Number(timestamp.length === 13 ? timestamp : `${timestamp}000`);
  const skewSeconds = Number(process.env.INTERNAL_SIGNATURE_MAX_SKEW_SECONDS ?? 300);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > skewSeconds * 1000) return false;
  const expected = signatureFor(secret, timestamp, ctx.method, ctx.path, ctx.request.body ?? {});
  return safeEqualHex(expected, supplied);
}
export function sha256Json(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value ?? {})).digest('hex');
}
export function randomCode(prefix: string): string { return `${prefix.toUpperCase()}-${crypto.randomUUID()}`; }
export function requireUserId(ctx: any): number | null {
  const id = Number(ctx.state?.user?.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
