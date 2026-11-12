<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Branches and database migrations

The live site runs from `main` on a self-hosted server with its own database. Anything merged into `main` goes live within a couple of minutes, and new migration files are applied to the live database automatically.

## Branches

- Work on `dev` (or a branch merged into `dev`). Never commit or push to `main` directly; `dev` reaches `main` only through a pull request.
- `dev` is tested against the Supabase cloud project (the test database). Never point the app, a script or a command at the live database.

## Database changes

- Every database structure change (table, column, index, function, policy, `GRANT`) is a file in `supabase/migrations/`. A change made only in the dashboard never reaches live.
- Create the file with `npm run new-migration <short description>` (run from the repo root). It names it `YYYYMMDDHHMMSS_<description>.sql`, later than every existing file. Do not name migration files by hand.
- Put the same SQL in the file that was run on the cloud test database.
- Content rules:
  - plain SQL only; no `BEGIN` / `COMMIT` (each file is already applied as one all-or-nothing transaction);
  - no `CREATE INDEX CONCURRENTLY`; no psql `\` commands;
  - new tables need their `GRANT` lines (new tables start with almost no permissions);
  - one logical change per file.
- Never edit, rename or delete a migration file that is already on `main`; fix it with a new file.
- Every new `dev` commit gets a `schema-check` status on GitHub. ✅ means live will match the cloud test database after merging; ❌ means a change on the cloud has no migration file, or a file would fail. Do not merge `dev` into `main` while it is ❌.
