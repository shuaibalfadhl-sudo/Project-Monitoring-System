#!/usr/bin/env node
// Creates an empty, correctly named migration file:
//   supabase/migrations/<YYYYMMDDHHMMSS>_<short_description>.sql
// Usage: npm run new-migration add priority to projects
// The number is the current date and time, and always later than the newest existing file (so files apply in order).
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const raw = process.argv.slice(2).join(' ').trim()
const name = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
if (!name) {
  console.error('Usage: npm run new-migration <short description>   e.g. npm run new-migration add priority to projects')
  process.exit(1)
}

const pad = (n) => String(n).padStart(2, '0')
const stampOf = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
const dateOf = (s) =>
  new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14))

const dir = join(process.cwd(), 'supabase', 'migrations')
mkdirSync(dir, { recursive: true })
const newest = readdirSync(dir)
  .map((f) => /^(\d{14})_.*\.sql$/.exec(f)?.[1])
  .filter(Boolean)
  .sort()
  .pop()

let stamp = stampOf(new Date())
if (newest && stamp <= newest) stamp = stampOf(new Date(dateOf(newest).getTime() + 1000)) // clock behind: newest + 1 s

const file = join(dir, `${stamp}_${name}.sql`)
if (existsSync(file)) {
  console.error(`Already exists: ${file}`)
  process.exit(1)
}

writeFileSync(
  file,
  `-- ${name}
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

`,
)
console.log(`created supabase/migrations/${stamp}_${name}.sql`)
