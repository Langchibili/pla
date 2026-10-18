const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'src', 'api');
const errors = [];
const warnings = [];
const schemas = [];
for (const slug of fs.readdirSync(root)) {
  const schemaPath = path.join(root, slug, 'content-types', slug, 'schema.json');
  if (!fs.existsSync(schemaPath)) continue;
  let schema;
  try { schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8')); }
  catch (error) { errors.push(`${schemaPath}: invalid JSON: ${error.message}`); continue; }
  if (!schema.info?.singularName || !schema.info?.displayName) errors.push(`${slug}: schema is missing info.singularName/displayName`);
  if (!schema.collectionName) errors.push(`${slug}: collectionName is missing`);
  if (!schema.attributes || typeof schema.attributes !== 'object') errors.push(`${slug}: attributes are missing`);
  if (Object.prototype.hasOwnProperty.call(schema.attributes ?? {}, 'status')) errors.push(`${slug}: generic reserved field "status" is not allowed; use a domain-specific field`);
  if (schema.collectionName === 'admin_settings') errors.push(`${slug}: use collectionName "admn_settings" to match PLA convention`);
  for (const [field, attr] of Object.entries(schema.attributes ?? {})) {
    if (attr.type === 'relation' && attr.target && attr.target.startsWith('api::')) {
      const targetUid = attr.target.slice(5);
      const targetSlug = targetUid.split('.')[0];
      const targetSchema = path.join(root, targetSlug, 'content-types', targetSlug, 'schema.json');
      if (!fs.existsSync(targetSchema)) errors.push(`${slug}.${field}: relation target ${attr.target} has no schema in src/api`);
    }
    if (attr.type === 'relation' && attr.target === 'plugin::users-permissions.user' && !fs.existsSync(path.resolve(__dirname, '..', 'src', 'extensions', 'users-permissions', 'content-types', 'user', 'schema.json'))) {
      warnings.push(`${slug}.${field}: user extension schema not found`);
    }
  }
  schemas.push({ slug, schema });
}
if (!schemas.length) errors.push('No Strapi API schemas were found');
const required = ['admn-settings','country','currency','game-profile','club','club-player','player-template','formation','physics-profile','physics-curve-set','ai-behaviour-profile','ai-team','ai-difficulty-profile','training-session','matchmaking-ticket','match','match-result-verification','xp-ledger','coin-wallet','coin-ledger','coin-product','store-product-offer','store-purchase','market-offer','market-purchase','rewarded-ad-provider','rewarded-ad-impression','pla-fixture-link','pla-outbox-event','restricted-name','leaderboard-entry'];
for (const slug of required) if (!schemas.some(x => x.slug === slug)) errors.push(`Required schema missing: ${slug}`);
if (!schemas.some(x => x.slug === 'admn-settings' && x.schema.kind === 'singleType' && x.schema.collectionName === 'admn_settings')) errors.push('PLA admin settings compatibility schema must be singleType with collectionName admn_settings');
if (schemas.some(x => x.schema.attributes?.plapo)) errors.push('PLACO backend should not store PLA Plapo as its game currency');
const userExtensionPath = path.resolve(__dirname, '..', 'src', 'extensions', 'users-permissions', 'content-types', 'user', 'schema.json');
if (fs.existsSync(userExtensionPath)) {
  try {
    const userSchema = JSON.parse(fs.readFileSync(userExtensionPath, 'utf8'));
    const requiredUserAttributes = ['username', 'email', 'provider', 'password', 'resetPasswordToken', 'confirmationToken', 'confirmed', 'blocked', 'role'];
    const missingUserAttributes = requiredUserAttributes.filter(attribute => !userSchema.attributes?.[attribute]);
    if (missingUserAttributes.length) {
      errors.push(`Users & Permissions user extension must preserve core attributes: ${missingUserAttributes.join(', ')}`);
    }
  } catch (error) {
    errors.push(`${userExtensionPath}: invalid JSON: ${error.message}`);
  }
} else {
  errors.push('Users & Permissions user extension schema is missing');
}
console.log(`Validated ${schemas.length} Strapi content-type schemas.`);
if (warnings.length) { console.warn(`Warnings (${warnings.length}):\n- ${warnings.join('\n- ')}`); }
if (errors.length) { console.error(`Errors (${errors.length}):\n- ${errors.join('\n- ')}`); process.exitCode = 1; }
else console.log('Schema JSON, naming, required-domain coverage, and internal relation targets are valid.');
