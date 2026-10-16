# Installation and package inventory

## Runtime baseline

Use a Strapi v5-compatible Node LTS runtime (Node 24 LTS is a sensible deployment default; this scaffold's `engines` allows Node `>=22.12.0 <27`). Use MySQL 8.0+; MySQL 8.4 is recommended for new installations. Run the selected Strapi v5 minor with its supported Node version, and lock resolved dependency versions in your deployment lockfile. The version ranges below are scaffold ranges, **not a claim that each patch is the newest available**.

## Complete direct dependency list

### Runtime `dependencies`

| Package | Range | Purpose |
|---|---|---|
| `@strapi/strapi` | `^5.0.0` | Strapi v5 server, Content API, document/database APIs and admin backend. |
| `@strapi/plugin-users-permissions` | `^5.0.0` | User authentication, JWTs and role permissions; user extension adds country/currency and PLA ID linkage. |
| `@strapi/plugin-upload` | `^5.0.0` | Strapi media upload plugin, for admin-managed media if enabled. |
| `@strapi/plugin-i18n` | `^5.0.0` | Internationalisation foundation for future/localized content. |
| `mysql2` | `^3.14.0` | MySQL client used by Strapi's MySQL database connector. |
| `react` | `^18.3.1` | Strapi Admin frontend runtime dependency. |
| `react-dom` | `^18.3.1` | Strapi Admin DOM renderer. |
| `react-router-dom` | `^6.30.1` | Strapi Admin routing dependency used by the generated Strapi package layout. |
| `styled-components` | `^6.1.19` | Strapi Admin styling dependency. |

### Development `devDependencies`

| Package | Range | Purpose |
|---|---|---|
| `@strapi/typescript-utils` | `^5.0.0` | Strapi-maintained TypeScript tsconfig/types/utilities. |
| `@types/node` | `^22.15.30` | Node.js type declarations for TypeScript. |
| `typescript` | `^5.8.3` | TypeScript compiler, type checking and type generation support. |

The project uses Node's built-in `crypto`, `fetch`, `AbortController`, `timers`, and `process` APIs; no separate packages are required for these. No payment SDK, ad SDK, Babylon.js runtime, physics library or socket server is included because direct billing and rendering/simulation belong to the store/game client or a separate trusted match authority.

## Commands

```bash
cp .env.example .env
npm install
npm run check:schemas
npm run ts:check
npm run build
NODE_ENV=production npm start
```

For a production build:

```bash
npm run check:schemas
npm run ts:check
npm run build
NODE_ENV=production npm start
```

`npm run postinstall` executes the local JSON schema check. The check does not replace a full boot/build/type-check against the exact Strapi v5 version chosen for deployment.

## Required environment variables

- Strapi: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`.
- MySQL: `DATABASE_CLIENT=mysql`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, optional `DATABASE_SSL`, pool limits.
- Independent integration secrets: `MATCH_ENGINE_HMAC_SECRET`, `PLA_INTEGRATION_HMAC_SECRET`, `STORE_VERIFIER_HMAC_SECRET`, `AD_SERVER_HMAC_SECRET`. Each should be at least 32 random bytes, independently generated and held server-side only.
- PLA: `PLA_BASE_URL`, `PLA_RESULT_PATH`.
- Currency display conversion: `EXCHANGE_RATE_API_KEY`, optionally `EXCHANGE_RATE_API_BASE`. If this is not configured and the desired source and target currencies differ, conversion intentionally fails closed with HTTP 503.
- Signature age: `MATCH_RESULT_MAX_AGE_SECONDS`, `INTERNAL_SIGNATURE_MAX_SKEW_SECONDS`.
- Optional store verifier: `STORE_RECEIPT_VERIFIER_URL`, `STORE_RECEIPT_VERIFIER_TOKEN` (server-to-server credentials only; integrate this verifier before production purchases).
- Replay storage: `REPLAY_STORAGE_BASE_URL` (location/index only; configure object storage outside MySQL for binary replay files).

## Install/deployment notes

1. Create `placo` DB and grant its service user schema-management privileges for initial Strapi startup.
2. Set `PUBLIC_URL`, `HOST`, `PORT`, and trusted `CORS_ORIGINS` to your actual deployed origins.
3. Run the schema checker, then compile/build. Resolve type/API differences using the exact Strapi minor that will run in production; this generated scaffold intentionally avoids assuming an arbitrary patch version.
4. Set Content API permissions according to `PERMISSIONS_MATRIX.md`. Only enable public read access for the intended curated endpoints.
5. Set the bootstrap defaults active; check that the default currency and country, settings singleton, physics/rules/AI profiles and formations have been seeded.
6. Run integration tests with a real trusted match verifier, a store receipt verifier and an ad provider server verification callback before opening competitive matches or paid/rewarded coin grants.

## Upstream references

- Strapi TypeScript: https://docs.strapi.io/cms/typescript
- Strapi v5 model schemas: https://docs-v5.strapi.io/cms/backend-customization/models
- Strapi v5 TypeScript/document API guidance: https://docs-v5.strapi.io/cms/typescript/documents-and-entries
- Strapi configuration: https://docs.strapi.io/cms/configurations
- Strapi v5 installation: https://docs-v5.strapi.io/cms/installation/cli
