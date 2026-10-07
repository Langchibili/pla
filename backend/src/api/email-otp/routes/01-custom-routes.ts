export default {
  routes: [
    {
      method: 'POST',
      path: '/auth/email-otp/send',
      handler: 'email-otp.send',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/auth/email-otp/resend',
      handler: 'email-otp.resend',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/auth/email-otp/verify',
      handler: 'email-otp.verify',
      config: { auth: false },
    },
  ],
};
