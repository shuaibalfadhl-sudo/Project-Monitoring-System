-- add_weekly_plan_end_date
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- Plans may span an explicit start to end date; start stays NOT NULL (title + start required).
alter table public.weekly_plans add column date_weekly_end date;

