# PLACO permissions sync add-on

Merge these paths into the root of the existing PLACO Strapi v5 backend:

- `src/services/apiPermissionSeeder.ts`
- `src/index.ts` (contains the conditional permission-sync call)
- `docs/RUN_PERMISSIONS_SYNC.md`
- `docs/PERMISSIONS_MATRIX.md`

Then follow `docs/RUN_PERMISSIONS_SYNC.md`. Back up the database before running.
No extra npm package is required. Start Strapi once with `PLACO_SYNC_API_PERMISSIONS=true`, wait for the completion log, stop the process, unset the flag, and restart normally.
