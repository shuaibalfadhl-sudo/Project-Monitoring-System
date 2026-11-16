-- weekly_plan_optional_fields
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- Title and the week are the only required fields; module and assignee may be empty.
alter table public.weekly_plans alter column assigned_personnel drop not null;
alter table public.weekly_plans alter column module drop not null;
alter table public.weekly_plans alter column date_weekly set not null;
