-- RLS for jobs (replace all job policies with these)
alter table public.jobs enable row level security;

-- clear conflicting policies
drop policy if exists "admins_all_jobs" on public.jobs;
drop policy if exists "admin_select_jobs" on public.jobs;
drop policy if exists "admin_full_access_jobs" on public.jobs;
drop policy if exists "contractors_see_available" on public.jobs;
drop policy if exists "contractors_see_own" on public.jobs;
drop policy if exists "contractors_claim" on public.jobs;
drop policy if exists "contractors_update_own" on public.jobs;
drop policy if exists "service_role_full_access_jobs" on public.jobs;
drop policy if exists "service_role_all_jobs" on public.jobs;

-- service role (edge functions) - full access
create policy "service_role_full_access_jobs"
on public.jobs
for all
using (current_setting('role') = 'service_role')
with check (current_setting('role') = 'service_role');

-- admins via profiles.role = 'admin'
create policy "admins_all_jobs"
on public.jobs
for all
using (public.is_admin())
with check (public.is_admin());

-- contractors: see available jobs in their city (status New)
create policy "contractors_see_available"
on public.jobs
for select
using (
  status = 'New'
  and city in (select c.city from public.contractors c where c.user_id = auth.uid())
);

-- contractors: see own jobs (claimed/assigned)
create policy "contractors_see_own"
on public.jobs
for select
using (
  exists (
    select 1 from public.contractors c
    where c.user_id = auth.uid()
      and (public.jobs.claimed_by = c.id or public.jobs.contractor_id = c.id)
  )
);

-- contractors: can claim a New job in their city
create policy "contractors_claim"
on public.jobs
for update
using (
  status = 'New'
  and claimed_by is null
  and city in (select c.city from public.contractors c where c.user_id = auth.uid())
)
with check (
  status in ('New','Claimed')
  and claimed_by = (select c.id from public.contractors c where c.user_id = auth.uid() limit 1)
);

-- contractors: can update their own jobs (e.g., InProgress -> Submitted)
create policy "contractors_update_own"
on public.jobs
for update
using (
  exists (
    select 1 from public.contractors c
    where c.user_id = auth.uid()
      and (public.jobs.claimed_by = c.id or public.jobs.contractor_id = c.id)
  )
);