-- make_weekly_plan_module_a_module_reference
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- weekly_plans.module becomes the id of the module the task belongs to.
-- Text values cannot be mapped to module ids, so the old column is dropped;
-- existing rows lose their module text but keep every other column.
-- The column stays nullable because module is optional on a plan.
alter table public.weekly_plans drop column module;
alter table public.weekly_plans
  add column module uuid references public.project_modules(id) on delete cascade;

create index weekly_plans_module_idx on public.weekly_plans (module);
