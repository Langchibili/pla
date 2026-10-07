// Adds ProLeagueAfrica fields to the built-in user.
// spendable_balance / transferable_balance are caches of the plapo_ledger sum;
// only the ledger service should write them.
module.exports = (plugin) => {
  Object.assign(plugin.contentTypes.user.schema.attributes, {
  "country": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "api::country.country"
  },
  "preferred_currency": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "api::currency.currency"
  },
  "in_game_names": {
    "type": "json"
  },
  "has_completed_tutorial": {
    "type": "boolean",
    "default": false
  },
  "push_token": {
    "type": "string"
  },
  "user_status": {
    "type": "enumeration",
    "enum": [
      "active",
      "flagged",
      "suspended",
      "banned"
    ],
    "default": "active",
    "required": true
  },
  "phone_number": {
    "type": "string"
  },
  "phone_verified": {
    "type": "boolean",
    "default": false
  },
  "referral_code": {
    "type": "string",
    "unique": true
  },
  "referred_by": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "plugin::users-permissions.user"
  },
  "free_plapo_granted": {
    "type": "boolean",
    "default": false
  },
  "spendable_balance": {
    "type": "integer",
    "default": 0,
    "min": 0
  },
  "transferable_balance": {
    "type": "integer",
    "default": 0,
    "min": 0
  }
});
  return plugin;
};
