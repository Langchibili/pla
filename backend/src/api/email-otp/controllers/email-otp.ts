import { factories } from '@strapi/strapi';
import {
  EmailOtpError,
  sendEmailOtp,
  verifyEmailOtp,
} from '../../../services/emailOtpService';

function sendError(ctx: any, error: unknown): void {
  const status = error instanceof EmailOtpError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Email verification failed';
  if (status === 500) strapi.log.error('[EmailOtp:controller]', error);
  ctx.status = status;
  ctx.body = {
    data: null,
    error: {
      status,
      name: status === 500 ? 'InternalServerError' : 'EmailOtpError',
      message: status === 500 ? 'Email verification failed' : message,
    },
  };
}

export default factories.createCoreController('api::email-otp.email-otp', ({ strapi }) => ({
  async create(ctx: any) {
    return ctx.methodNotAllowed('Use POST /auth/email-otp/send');
  },

  async update(ctx: any) {
    return ctx.methodNotAllowed('OTP records cannot be edited directly');
  },

  async send(ctx: any) {
    try {
      const body = ctx.request.body ?? {};
      await sendEmailOtp(strapi, {
        email: body.email,
        purpose: body.purpose,
        referralCode: body.referral_code,
        deviceHash: body.device_hash,
      });
      return ctx.send({ sent: true });
    } catch (error) {
      return sendError(ctx, error);
    }
  },

  async resend(ctx: any, next: () => Promise<unknown>) {
    return this.send(ctx, next);
  },

  async verify(ctx: any) {
    try {
      const body = ctx.request.body ?? {};
      const result = await verifyEmailOtp(strapi, {
        email: body.email,
        code: body.code,
        purpose: body.purpose,
        ip: ctx.request.ip ?? '',
      });
      return ctx.send(result);
    } catch (error) {
      return sendError(ctx, error);
    }
  },
}));
