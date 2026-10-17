export default [
  'strapi::logger',
  'strapi::errors',
  { name: 'strapi::security', config: { contentSecurityPolicy: { useDefaults: true, directives: { 'connect-src': ["'self'", 'https:'], 'img-src': ["'self'", 'data:', 'blob:', 'https:'], 'media-src': ["'self'", 'data:', 'blob:'] } } } },
  { name: 'strapi::cors', config: { origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3013,http://localhost:8081,http://localhost:19006').split(',').map((x) => x.trim()).filter(Boolean), headers: ['Content-Type','Authorization','Origin','Accept','X-Idempotency-Key','X-PLACO-Timestamp','X-PLACO-Signature'] } },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
