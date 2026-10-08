import crypto from 'crypto';
import type {
  IPaymentGateway,
  InitiatePaymentParams,
  InitiatePaymentResult,
  InitiatePayoutParams,
  InitiatePayoutResult,
  VerifyWebhookResult,
} from './IPaymentGateway';

const BASE_URL = process.env.LENCO_BASE_URL || 'https://api.lenco.co/access/v2';

function authHeaders(): Record<string, string> {
  const secretKey = process.env.LENCO_SECRET_KEY;
  if (!secretKey) throw new Error('LENCO_SECRET_KEY is not configured');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` };
}

async function requestLenco(path: string, method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<Record<string, any>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json() as Record<string, any>;
  if (!response.ok || result?.status === false) {
    throw new Error(`Lenco request failed: ${result?.message || response.statusText}`);
  }
  return result;
}

class LencoAdapter implements IPaymentGateway {
  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    if (params.paymentType === 'card') return this.initiateCardPayment(params);
    const result = await requestLenco('/collections/mobile-money', 'POST', {
      amount: params.amount.toFixed(2),
      reference: params.reference,
      phone: params.phone,
      operator: params.operator || 'mtn',
      country: (params.country || 'zm').toLowerCase(),
      bearer: 'merchant',
    });
    const data = result.data || {};
    return {
      gatewayReference: data.id || data.lencoReference || params.reference,
      status: data.status || 'pending',
      raw: data,
    };
  }

  private async encryptCardPayload(payload: Record<string, unknown>): Promise<string> {
    const keyResponse = await requestLenco('/encryption-key', 'GET');
    const jwk = keyResponse.data?.publicKey;
    if (!jwk) throw new Error('Lenco did not return a card encryption key');
    const protectedHeader = Buffer.from(JSON.stringify({
      alg: 'RSA-OAEP-256',
      enc: 'A256GCM',
      cty: 'application/json',
      kid: jwk.kid,
    })).toString('base64url');
    const contentKey = crypto.randomBytes(32);
    const encryptedKey = crypto.publicEncrypt({
      key: crypto.createPublicKey({ key: jwk, format: 'jwk' }),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    }, contentKey);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', contentKey, iv);
    cipher.setAAD(Buffer.from(protectedHeader));
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    return [
      protectedHeader,
      encryptedKey.toString('base64url'),
      iv.toString('base64url'),
      ciphertext.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
    ].join('.');
  }

  private async initiateCardPayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    if (!params.card || !params.customer) throw new Error('Card details and cardholder name are required');
    const encryptedPayload = await this.encryptCardPayload({
      reference: params.reference,
      email: params.email,
      amount: params.amount.toFixed(2),
      currency: params.currency || 'ZMW',
      bearer: 'merchant',
      customer: params.customer,
      billing: {
        streetAddress: params.billing?.streetAddress || '',
        city: params.billing?.city || '',
        state: params.billing?.state || '',
        postalCode: params.billing?.postalCode || '',
        country: params.billing?.country || (params.country || 'zm').toUpperCase(),
      },
      card: {
        number: params.card.number.replace(/\s/g, ''),
        expiryMonth: params.card.expiryMonth,
        expiryYear: params.card.expiryYear,
        cvv: params.card.cvv,
      },
      ...(params.redirectUrl ? { redirectUrl: params.redirectUrl } : {}),
    });
    const result = await requestLenco('/collections/card', 'POST', { encryptedPayload });
    const data = result.data || {};
    return {
      gatewayReference: data.id || data.lencoReference || params.reference,
      status: data.status || 'pending',
      redirectUrl: data.status === '3ds-auth-required' ? data.meta?.authorization?.redirect || '' : '',
      raw: data,
    };
  }

  async initiatePayout(params: InitiatePayoutParams): Promise<InitiatePayoutResult> {
    const accountId = process.env.LENCO_ACCOUNT_ID;
    if (!accountId) throw new Error('LENCO_ACCOUNT_ID is not configured');
    const mobileMoney = params.method !== 'bank_account';
    const path = mobileMoney ? '/transfers/mobile-money' : '/transfers/bank-account';
    const body: Record<string, unknown> = {
      accountId,
      amount: params.amount.toFixed(2),
      reference: params.reference,
      narration: params.narration || `Prize payout ${params.reference}`,
      country: (params.country || 'zm').toLowerCase(),
    };
    if (mobileMoney) {
      body.phone = params.phone;
      body.operator = params.operator || 'mtn';
    } else {
      body.accountNumber = params.accountNumber || '';
      body.bankId = params.bankId || '';
    }
    const result = await requestLenco(path, 'POST', body);
    const data = result.data || {};
    return {
      gatewayReference: data.id || data.lencoReference || params.reference,
      status: data.status === 'successful' ? 'completed' : 'processing',
      raw: data,
    };
  }

  verifyWebhook(headers: Record<string, string>, rawBody: string): VerifyWebhookResult {
    const signature = headers['x-lenco-signature'];
    const secretKey = process.env.LENCO_SECRET_KEY;
    if (!signature || !secretKey) return { valid: false, event: '', data: {} };
    const hashKey = crypto.createHash('sha256').update(secretKey).digest('hex');
    const expected = crypto.createHmac('sha512', hashKey).update(rawBody).digest('hex');
    const expectedBytes = Buffer.from(expected);
    const suppliedBytes = Buffer.from(signature);
    if (expectedBytes.length !== suppliedBytes.length || !crypto.timingSafeEqual(expectedBytes, suppliedBytes)) {
      return { valid: false, event: '', data: {} };
    }
    try {
      const payload = JSON.parse(rawBody);
      return { valid: true, event: String(payload.event || ''), data: payload.data || {} };
    } catch {
      return { valid: false, event: '', data: {} };
    }
  }

  isCollectionSuccess(event: string): boolean {
    return event === 'collection.successful' || event === 'collection.settled';
  }
  isCollectionFailed(event: string): boolean { return event === 'collection.failed'; }
  isPayoutCompleted(event: string): boolean { return event === 'transfer.successful'; }
  isPayoutFailed(event: string): boolean { return event === 'transfer.failed'; }
  extractReference(data: Record<string, unknown>): string | null {
    return (data.reference as string) || (data.clientReference as string) || (data.transactionReference as string) || null;
  }
}

export default new LencoAdapter();
