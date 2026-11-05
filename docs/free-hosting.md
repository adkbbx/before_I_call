# Diskless hosting

Before I Call can keep analytics and daily API budgets in a private Postgres
schema while its Render web service uses Free compute. Local development still
uses SQLite. Set `ANALYTICS_DATABASE_URL` only on the server, with the restricted
runtime connection created by `scripts/migrate_storage.py`.

The `before_i_call` schema is separate from GTM Shortlist. Anonymous Supabase
clients receive no access. Runtime queries use TLS, transaction-scoped settings,
and transaction-scoped write locks. A database failure blocks paid call admission
rather than resetting its budget or falling back to temporary local storage.

## Migration

1. Run `scripts/migrate_storage.py --admin-env PATH --runtime-env PATH` to create
   the private schema and a restricted connection. Keep both env files private.
2. Run `scripts/check_postgres_storage.py` with the same arguments. It tests a
   disposable schema and removes that schema afterward.
3. Deploy this revision while retaining the original SQLite disk.
4. Run `scripts/backup_live_storage.py --render-env PATH --output PATH` to stop
   SQLite writes and save a complete backup. Existing data remains on the disk.
5. Run `scripts/migrate_storage.py` again with `--backup PATH`. It compares every
   imported row with the source before committing and refuses to overwrite
   different existing destination data.
6. Add the runtime `ANALYTICS_DATABASE_URL` to Render and redeploy. Verify health,
   private backup contents, analytics, and ordinary app routes.
7. Only after verifying the transfer, remove the original disk and select Free
   compute. Keep the private backup outside Render.

If the transfer fails before switching storage, send an authenticated POST to
`/api/analytics/migration/unfreeze`. After the switch, rollback requires removing
the Postgres setting, restoring the SQLite disk if needed, and unfreezing it.
Do not return to the old snapshot after new Postgres writes without reconciling
those writes first.

The admin-only backup route supports both stores. Its response must never be
published. Free Render services sleep on idle and share the workspace's monthly
free hours. External AI usage is billed independently of hosting.
