-- enable_realtime_for_weekly_plans
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- weekly_plans changes must reach other open pages through Supabase Realtime.
alter publication supabase_realtime add table public.weekly_plans;

