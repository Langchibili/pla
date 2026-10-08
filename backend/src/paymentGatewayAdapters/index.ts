import type { IPaymentGateway } from './IPaymentGateway';
import pawapayAdapter from './pawapay';
import lencoAdapter from './lenco';

const adapters: Record<string, IPaymentGateway> = {
  pawapay: pawapayAdapter,
  lenco: lencoAdapter,
};

export function getPaymentGateway(gatewayName?: string | null): IPaymentGateway {
  const key = (gatewayName || 'pawapay').toLowerCase();
  const adapter = adapters[key];
  if (!adapter) throw new Error(`Unsupported payment gateway: ${key}`);
  return adapter;
}

export type { IPaymentGateway };
export type {
  InitiatePaymentParams,
  InitiatePaymentResult,
  InitiatePayoutParams,
  InitiatePayoutResult,
  VerifyWebhookResult,
} from './IPaymentGateway';
