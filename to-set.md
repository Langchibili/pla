ProLeague Africa (PLA) backend setup checklist
================================================

Never put real credentials in this file or commit them to source control. Set
secret values in the deployment environment or backend/.env. The backend
environment template is backend/.env.example.

1. Strapi Admin -> Content Manager -> Admn Settings
--------------------------------------------------
- frontend_mode: choose "native" to require the app, or "web" to allow browser
  access.
- base_currency: select the platform's base currency. It is used when country
  settings do not supply a currency.
- default_payment_gateway: select the configured provider, either "pawapay"
  or "lenco".
- overideOtpCode: remove or replace the development/test OTP before production.
  Do not share the configured code.
- Review the default Plapo award, scoring, match deadlines/postponements,
  submission review confidence, transfer switch, screenshot retention, and
  referral reward/cap settings. Set them to the operating rules for PLA.
- Enable affiliate rewards only after setting the reward points and conditions.

2. Strapi Admin -> Content Manager -> Country
---------------------------------------------
- For every active country, set default_currency. Users' local tournament
  prize-pool display uses this currency.
- Review country-specific overrides for initial_free_plapo, match scoring,
  deadlines, transfer availability, payment gateway, and affiliate rewards.
  Blank values fall back to Admn Settings.

3. Strapi Admin -> Content Manager -> Currency, Game, and Tournament
--------------------------------------------------------------------
- Create and activate each currency with its correct three-letter code and
  symbol; assign each country's default currency.
- For every Game, set its score_service_key, in-game ID label/format, and
  optional in_game_id_example and screenshotExample media.
- For every Tournament, set opentoall. When false, select eligible countries
  in countries; if that relation is empty, the existing country field is used.
- Set a tournament's prize-pool currency and amounts when it has a prize pool.

4. Backend environment and external services
--------------------------------------------
Required for a production Strapi deployment:
- APP_KEYS, API_TOKEN_SALT, ADMIN_JWT_SECRET, TRANSFER_TOKEN_SALT, JWT_SECRET,
  and ENCRYPTION_KEY: generate unique, strong secrets and keep them stable
  across restarts. Never use the example values.
- DATABASE_CLIENT and the matching database connection settings
  (DATABASE_URL, or DATABASE_HOST, DATABASE_PORT, DATABASE_NAME,
  DATABASE_USERNAME, DATABASE_PASSWORD; configure SSL where required).
- HOST and PORT as required by the host/platform.

Currency conversion:
- EXCHANGE_RATE_API_KEY: set a valid ExchangeRate-API key in the backend
  environment. It is needed to convert tournament prize pools into a user's
  country currency. Do not place the value in frontend variables.
- Enable the authenticated currency.convertPrice permission for the
  users-permissions Authenticated role in Strapi Users & Permissions.

Email and notifications:
- Configure Strapi's Email provider and SMTP_HOST, SMTP_PORT, SMTP_SECURE,
  SMTP_USERNAME, SMTP_PASSWORD, EMAIL_FROM, and EMAIL_REPLY_TO.
- Configure SMSGATEWAYURL, SMSGATEWAYAPIKEY, SMSGATEWAYAPIUSERNAME, and
  SMSGATEWAYAPICALLERID if SMS delivery is used.

Match scoring and real-time updates:
- Configure SCORE_SERVICE_URL, SCORE_SERVICE_API_KEY,
  SCORE_SERVICE_WEBHOOK_URL, WEBHOOK_SECRET, and PUBLIC_URL for screenshot
  scoring callbacks and media access.
- Configure SOCKET_SERVER_URL and SOCKET_INTERNAL_TOKEN when the separate
  socket relay is deployed. The token must match on both services.

Payments (configure the selected provider only):
- Pawapay: PAWAPAY_BASE_URL, PAWAPAY_API_TOKEN, and PAWAPAY_WEBHOOK_SECRET.
- Lenco: LENCO_BASE_URL, LENCO_SECRET_KEY, and LENCO_ACCOUNT_ID.
- Register the corresponding provider webhook URLs with the provider and
  verify the webhook secrets before enabling live payments.

Before launch, verify the configured currencies, country assignments, email
delivery, OTP production behavior, score-service callbacks, payment webhooks,
and the public URLs from outside the deployment network.


tournament settings json example
{
  "format": "round_robin",
  "prizePool": {
    "enabled": true,
    "distribution": [
      {
        "place": 1,
        "percent": 50
      },
      {
        "place": 2,
        "percent": 25
      },
      {
        "place": 3,
        "percent": 15
      },
      {
        "place": 4,
        "percent": 10
      }
    ]
  },
  "demo_fixture": true,
  "players_per_match": 2
}