-- 1) Safe helper that creates ONE job from ONE booking (with safe casts)
create or replace function public.create_job_from_booking(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  b bookings%rowtype;
  v_job_id uuid;
  v_dt timestamptz;
  v_time time;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking % not found', p_booking_id;
  end if;

  -- handle NULL/empty time safely
  v_time :=
    case when b.cleaning_time is null then time '10:00'
         else b.cleaning_time end;

  v_dt :=
    case when b.cleaning_date is null then now()
         else (b.cleaning_date::date + v_time)::timestamptz end;

  -- avoid duplicate per booking
  if exists (select 1 from public.jobs j where j.booking_id = b.id) then
    select id into v_job_id from public.jobs where booking_id = b.id limit 1;
    return v_job_id;
  end if;

  insert into public.jobs(
    booking_id, date, price_cents, payout_cents, city, status, notes
  ) values (
    b.id,
    v_dt,
    b.total_price_cents,
    (b.total_price_cents * 0.7)::int,
    b.property_city,
    'New',
    'Booking #'||b.id||' - '||coalesce(b.customer_name,'')||' - '||coalesce(b.property_address,'')
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

-- 2) Trigger function that calls the helper
create or replace function public.job_from_booking_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  -- Call the helper function to create job
  v_job_id := public.create_job_from_booking(new.id);
  return new;
end;
$$;

-- Drop and recreate trigger
drop trigger if exists trg_job_from_booking on public.bookings;
create trigger trg_job_from_booking
after insert on public.bookings
for each row execute procedure public.job_from_booking_trigger();

-- 3) Backfill all missing jobs for existing bookings
insert into public.jobs(booking_id, date, price_cents, payout_cents, city, status, notes)
select b.id,
       case when b.cleaning_date is null then now()
            else (b.cleaning_date::date +
                  case when b.cleaning_time is null then time '10:00'
                       else b.cleaning_time end)::timestamptz end as date,
       b.total_price_cents,
       (b.total_price_cents * 0.7)::int as payout_cents,
       b.property_city,
       'New' as status,
       'Booking #'||b.id||' - '||coalesce(b.customer_name,'')||' - '||coalesce(b.property_address,'') as notes
from public.bookings b
where not exists (select 1 from public.jobs j where j.booking_id = b.id);

-- 4) Ensure required columns exist on jobs (idempotent)
alter table public.jobs
  add column if not exists booking_id uuid references public.bookings(id) on delete cascade,
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

create unique index if not exists jobs_booking_id_key on public.jobs(booking_id);
update public.jobs set status = 'New' where status is null or status = '';