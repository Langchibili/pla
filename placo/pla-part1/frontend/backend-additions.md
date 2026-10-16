# Small backend additions the frontend expects

1. `GET /me/club` (auth: true) — the permissions matrix gives no generic `club.find`, so add:

```ts
// api/club/controllers/club.ts  (inside the controller object)
async mine(ctx:any) {
  const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
  const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
  const club=await strapi.db.query(UID.club).findOne({where:{owner:profile.id,club_game_status:'active'}});
  return ctx.send({data: club?{documentId:club.documentId,club_name:club.club_name}:null});
},
// api/club/routes/01-custom-routes.ts
{ method:'GET', path:'/me/club', handler:'club.mine', config:{auth:true,policies:[]} },
```
Then add `api::club.club.mine` to the Authenticated allowlist in `apiPermissionSeeder.ts`.

2. Env for Next (server only): `MATCH_ENGINE_HMAC_SECRET` (same value as Strapi), optional `STRAPI_INTERNAL_URL`.

3. Online (human vs human) play needs a realtime relay, which does not exist yet; the UI queues and shows the match, but the engine currently only simulates the opponent as AI.
