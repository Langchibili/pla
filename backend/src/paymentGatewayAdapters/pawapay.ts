import { createHmac, timingSafeEqual } from 'crypto';
import type {
  IPaymentGateway,
  InitiatePaymentParams,
  InitiatePaymentResult,
  InitiatePayoutParams,
  InitiatePayoutResult,
  VerifyWebhookResult,
} from './IPaymentGateway';

const BASE_URL = process.env.PAWAPAY_BASE_URL || 'https://api.pawapay.io';

function requestHeaders(): Record<string, string> {
  const token = process.env.PAWAPAY_API_TOKEN;
  if (!token) throw new Error('PAWAPAY_API_TOKEN is not configured');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function requestPawapay(path: string, body: Record<string, unknown>): Promise<Record<string, any>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json() as Record<string, any>;
  if (!response.ok) throw new Error(`PawaPay request failed: ${result.message || response.statusText}`);
  return result;
}

class PawapayAdapter implements IPaymentGateway {
  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const result = await requestPawapay('/deposits', {
      depositId: params.reference,
      amount: params.amount.toFixed(2),
      currency: params.currency,
      payer: { type: 'MSISDN', address: { value: params.phone } },
      statementDescription: params.narration || 'ProLeague Africa Plapo purchase',
    });
    return {
      gatewayReference: result.depositId || params.reference,
      status: result.status || 'ACCEPTED',
      raw: result,
    };
  }

  async initiatePayout(params: InitiatePayoutParams): Promise<InitiatePayoutResult> {
    const result = await requestPawapay('/payouts', {
      payoutId: params.reference,
      amount: params.amount.toFixed(2),
      currency: params.currency,
      recipient: { type: 'MSISDN', address: { value: params.phone } },
      statementDescription: params.narration || 'ProLeague Africa prize payout',
    });
    return {
      gatewayReference: result.payoutId || params.reference,
      status: result.status === 'COMPLETED' ? 'completed' : 'processing',
      raw: result,
    };
  }

  verifyWebhook(headers: Record<string, string>, rawBody: string): VerifyWebhookResult {
    const signature = headers['x-pawapay-signature'];
    const secret = process.env.PAWAPAY_WEBHOOK_SECRET;
    if (!signature || !secret) return { valid: false, event: '', data: {} };
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBytes = Buffer.from(expected);
    const suppliedBytes = Buffer.from(signature);
    if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
      return { valid: false, event: '', data: {} };
    }
    try {
      const payload = JSON.parse(rawBody);
      return { valid: true, event: String(payload.status ?? ''), data: payload };
    } catch {
      return { valid: false, event: '', data: {} };
    }
  }

  isCollectionSuccess(event: string): boolean { return event === 'COMPLETED'; }
  isCollectionFailed(event: string): boolean { return event === 'FAILED' || event === 'REJECTED'; }
  isPayoutCompleted(event: string): boolean { return event === 'COMPLETED'; }
  isPayoutFailed(event: string): boolean { return event === 'FAILED' || event === 'REJECTED'; }
  extractReference(data: Record<string, unknown>): string | null {
    return (data.depositId as string) || (data.payoutId as string) || (data.reference as string) || null;
  }
}

export default new PawapayAdapter();
