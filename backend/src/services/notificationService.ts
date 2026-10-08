export async function sendEmailNotification(
  strapi: any,
  params: { email: string; subject: string; text: string; html?: string },
): Promise<void> {
  if (!params.email) throw new Error('Email recipient is required');
  await strapi.plugin('email').service('email').send({
    to: params.email,
    from: process.env.EMAIL_FROM,
    replyTo: process.env.EMAIL_REPLY_TO,
    subject: params.subject,
    text: params.text,
    ...(params.html ? { html: params.html } : {}),
  });
}

export async function sendSmsToPhone(phoneNumber: string, message: string): Promise<void> {
  const gatewayUrl = process.env.SMSGATEWAYURL;
  const apiKey = process.env.SMSGATEWAYAPIKEY;
  const username = process.env.SMSGATEWAYAPIUSERNAME;
  const senderId = process.env.SMSGATEWAYAPICALLERID;
  if (!gatewayUrl || !apiKey || !username || !senderId) {
    throw new Error('SMS gateway is not configured');
  }
  if (!phoneNumber || !message) throw new Error('Phone number and message are required');

  const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}/send-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      username,
      recipients: [phoneNumber],
      message,
      from: senderId,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`SMS gateway returned HTTP ${response.status}`);
}

export async function sendSmsNotification(
  phoneNumber: string | null | undefined,
  message: string,
): Promise<void> {
  if (!phoneNumber) return;
  await sendSmsToPhone(phoneNumber, message);
}
