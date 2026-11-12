<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Branches and database migrations

The live site runs from `main` on a self-hosted server with its own database. Anything merged into `main` goes live within a couple of minutes, and new migration files are applied to the live database automatically. `dev` is tested on Vercel against the Supabase cloud project (vnrvpgkjpxiqfwfxrcdb), which is the test database.

If anything in a task conflicts with these rules, stop and ask the human first.

## Branches and merging

- Always work on `dev` (`git checkout dev`, `git pull`). Never commit or push directly to `main`; changes reach `main` only through a pull request from `dev`.
- You may open a pull request from `dev` into `main` and report its `schema-check` status.
- You may merge that pull request **only** when the human explicitly tells you to in the conversation (for example "merge to main now"), **and** only if `schema-check` is ✅ MATCH. Never merge on your own initiative, never as part of "finishing a task", and never while `schema-check` is ❌ or still pending.
- After merging, tell the human that the live site updates within about 2 minutes.
- Never force-push, and never try to bypass the `main` branch rules.

## Databases

- Never run commands or SQL against any database yourself, and never point the app, a script or a command at the live database.
- The only database you may refer to is the Supabase cloud test project, and only by giving SQL to the human to run there.

## Database changes: the routine

Whenever a task needs a database change (a new or changed table, column, index, function, policy or `GRANT`):

1. Create the migration file with this command, from the repo root. Never name migration files yourself:

   ```
   npm run new-migration <short description in plain words>
   ```

   It prints the new file's path: `supabase/migrations/YYYYMMDDHHMMSS_<description>.sql`, numbered later than every existing file.
2. Write the SQL into that file, under the comment lines it already contains (content rules below).
3. Show the human the exact SQL and ask them to run the **same** SQL in the Supabase cloud dashboard's SQL Editor. Wait for their confirmation before continuing.
4. Write the app code that uses the change.
5. Commit the migration file **together with** that code on `dev`, with a clear message, and push to `dev`.
6. Tell the human to check the `schema-check` status on GitHub for that commit (it appears within a few minutes):
   - ✅ MATCH: live will match the cloud test database after merging; a pull request `dev` → `main` may be opened.
   - ❌: something on the cloud has no migration file, or a file would fail. Read the message and fix it with a **new** migration file on `dev`.

## Migration file content rules

- Plain SQL only. No `BEGIN;` / `COMMIT;` (each file is already applied as one all-or-nothing transaction).
- No `CREATE INDEX CONCURRENTLY`; no psql `\` commands.
- One logical change per file.
- A new table gets only basic default permissions. If the app's signed-in users must read or write it, add explicit `GRANT` lines (for example `GRANT SELECT, INSERT ON public.<table> TO authenticated;`) and the row-level security policies it needs.
- A database change must be **both** run on the cloud **and** saved as a migration file. A change made only in the dashboard, or only in a file, breaks the live site after the merge.

## Never

- Edit, rename or delete a file in `supabase/migrations/` that is already on `main`. Fix mistakes with a new file.
- Push to `main`, force-push, or bypass the `schema-check`.
