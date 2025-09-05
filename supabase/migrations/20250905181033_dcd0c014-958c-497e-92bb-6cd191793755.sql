-- Ensure jobs has booking_id and is unique per booking
alter table public.jobs
  add column if not exists booking_id uuid references public.bookings(id) on delete cascade;

create unique index if not exists jobs_booking_id_key on public.jobs(booking_id);

-- Ensure these columns exist (names used by UI)
alter table public.jobs
  add column if not exists date timestamptz,
  add column if not exists price_cents integer,
  add column if not exists payout_cents integer,
  add column if not exists city text,
  add column if not exists status text,
  add column if not exists notes text,
  add column if not exists claimed_by uuid references public.contractors(id),
  add column if not exists claimed_at timestamptz,
  add column if not exists contractor_id uuid references public.contractors(id),
  add column if not exists submitted_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists admin_approved_at timestamptz,
  add column if not exists admin_rejected_at timestamptz,
  add column if not exists rejection_reason text;

-- Normalize any null/empty statuses
update public.jobs set status = 'New' where status is null or status = '';

-- Create a safe trigger (so any booking path creates one job, without duplicates)
create or replace function public.job_from_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Avoid duplicate job per booking
  if exists (select 1 from public.jobs j where j.booking_id = new.id) then
    return new;
  end if;

  insert into public.jobs(
    booking_id,
    date,
    price_cents,
    payout_cents,
    city,
    status,
    notes
  ) values (
    new.id,
    coalesce(
      (new.cleaning_date::date + coalesce(new.cleaning_time::time, time '10:00'))::timestamptz,
      now()
    ),
    new.total_price_cents,
    (new.total_price_cents * 0.7)::int,
    new.property_city,
    'New',
    concat('Booking #', new.id, ' - ', new.customer_name, ' - ', new.property_address)
  );

  return new;
end;
$$;

drop trigger if exists trg_job_from_booking on public.bookings;
create trigger trg_job_from_booking
after insert on public.bookings
for each row execute procedure public.job_from_booking();

-- RLS for jobs (replace ALL existing job policies)
alter table public.jobs enable row level security;

-- Drop previous, conflicting policies
drop policy if exists "admin_select_jobs" on public.jobs;
drop policy if exists "admins_select_jobs" on public.jobs;
drop policy if exists "admin_full_access_jobs" on public.jobs;
drop policy if exists "contractors_select_jobs" on public.jobs;
drop policy if exists "contractors_select_local_jobs" on public.jobs;
drop policy if exists "contractors_update_claimed_jobs" on public.jobs;
drop policy if exists "contractors_claim_jobs" on public.jobs;
drop policy if exists "contractors_claim_jobs_new" on public.jobs;
drop policy if exists "contractors_update_owned_jobs" on public.jobs;
drop policy if exists "service_role_full_access_jobs" on public.jobs;

-- 2.1 Admins: full access via profiles.role = 'admin'
create policy "admins_all_jobs"
on public.jobs
for all
using (public.is_admin())
with check (public.is_admin());

-- 2.2 Contractors can SEE 'New' jobs in their city (available jobs)
create policy "contractors_see_available"
on public.jobs
for select
using (
  status = 'New'
  and city in (
    select c.city from public.contractors c
    where c.user_id = auth.uid()
  )
);

-- 2.3 Contractors can SEE jobs they own (claimed or assigned)
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

-- 2.4 Contractors can CLAIM a job (set claimed_by) when currently unclaimed & New
create policy "contractors_claim"
on public.jobs
for update
using (
  status = 'New'
  and claimed_by is null
  and city in (
    select c.city from public.contractors c where c.user_id = auth.uid()
  )
)
with check (
  status in ('New','Claimed')
  and claimed_by = (select c.id from public.contractors c where c.user_id = auth.uid() limit 1)
);

-- 2.5 Contractors can UPDATE their own jobs (e.g., InProgress → Submitted)
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

-- Service role access for edge functions
create policy "service_role_all_jobs"
on public.jobs
for all
using (current_setting('role'::text) = 'service_role'::text)
with check (current_setting('role'::text) = 'service_role'::text);