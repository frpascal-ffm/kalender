create table company(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  brand_primary text,
  logo_url text,
  emergency_phone text,
  created_at timestamptz default now()
);

create table partner(
  id uuid primary key default gen_random_uuid(),
  company_id uuid references company(id) on delete cascade,
  name text not null,
  slug text not null,
  is_active bool default true,
  use_passcode bool default false,
  passcode_hash text,
  created_at timestamptz default now(),
  unique(company_id, slug)
);

create type user_role as enum('owner','dispatcher');
create table user_profile(
  id uuid primary key,
  company_id uuid references company(id) on delete cascade,
  email text unique not null,
  role user_role not null,
  created_at timestamptz default now()
);

create table vehicle(
  id uuid primary key default gen_random_uuid(),
  company_id uuid references company(id) on delete cascade,
  name text not null,
  is_active bool default true,
  capabilities jsonb,
  created_at timestamptz default now()
);

create table settings(
  company_id uuid primary key references company(id) on delete cascade,
  booking_window_hours int default 24,
  buffer_minutes int default 15,
  service_day_start int default 6,
  service_day_end int default 20,
  max_daily_bookings_per_partner int default 99999
);

create type booking_status as enum('requested','confirmed','cancelled');
create table booking(
  id uuid primary key default gen_random_uuid(),
  company_id uuid references company(id) on delete cascade,
  partner_id uuid references partner(id),
  status booking_status default 'requested',
  pickup_at timestamptz not null,
  duration_min int default 60,
  buffer_min int default 15,
  case_number text unique,
  is_return_ride bool default false,
  parent_booking_id uuid,
  assigned_vehicle_id uuid references vehicle(id),
  patient_first_name text,
  patient_last_name text,
  birth_date text,
  station text,
  flags jsonb,
  special_notes text,
  pickup_address text,
  dropoff_address text,
  created_by_user_id uuid,
  created_from_ip text,
  created_at timestamptz default now()
);

create table event_log(
  id uuid primary key default gen_random_uuid(),
  company_id uuid references company(id) on delete cascade,
  actor_type text,
  actor_id text,
  action text,
  entity text,
  meta jsonb,
  ip text,
  created_at timestamptz default now()
);

-- enable RLS
alter table company enable row level security;
alter table partner enable row level security;
alter table user_profile enable row level security;
alter table vehicle enable row level security;
alter table settings enable row level security;
alter table booking enable row level security;
alter table event_log enable row level security;

-- company user policies
create policy company_user_select on company for select using (current_setting('app.role', true) in ('owner','dispatcher') and id::text = current_setting('app.company_id', true));
create policy company_user_select_partner on partner for select using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true));
create policy company_user_mod_partner on partner for all using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true)) with check (company_id::text = current_setting('app.company_id', true));

create policy company_user_select_profile on user_profile for select using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true));
create policy company_user_mod_profile on user_profile for all using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true)) with check (company_id::text = current_setting('app.company_id', true));

create policy company_user_select_vehicle on vehicle for select using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true));
create policy company_user_mod_vehicle on vehicle for all using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true)) with check (company_id::text = current_setting('app.company_id', true));

create policy company_user_select_settings on settings for select using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true));
create policy company_user_mod_settings on settings for all using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true)) with check (company_id::text = current_setting('app.company_id', true));

create policy company_user_select_booking on booking for select using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true));
create policy company_user_mod_booking on booking for all using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true)) with check (company_id::text = current_setting('app.company_id', true));

create policy company_user_select_log on event_log for select using (current_setting('app.role', true) in ('owner','dispatcher') and company_id::text = current_setting('app.company_id', true));
create policy company_user_insert_log on event_log for insert with check (company_id::text = current_setting('app.company_id', true));

-- partner token policy on booking insert only
create policy partner_insert_booking on booking for insert using (
  current_setting('app.role', true) = 'partner'
  and company_id::text = current_setting('app.company_id', true)
  and partner_id::text = current_setting('app.partner_id', true)
) with check (
  company_id::text = current_setting('app.company_id', true)
  and partner_id::text = current_setting('app.partner_id', true)
);

-- availability rpc
create or replace function availability(p_company uuid, p_date date, p_start int, p_end int)
returns table(slot timestamptz) language sql stable as $$
  with cfg as (
    select service_day_start, service_day_end, buffer_minutes
    from settings where company_id = p_company
  ),
  slots as (
    select generate_series(
      date_trunc('day', p_date::timestamptz) + make_interval(hours => p_start),
      date_trunc('day', p_date::timestamptz) + make_interval(hours => p_end) - interval '15 minute',
      interval '15 minute'
    ) as slot
  ),
  active_vehicles as (
    select count(*) as cnt from vehicle where company_id = p_company and is_active
  ),
  busy as (
    select slot
    from slots s
    join booking b on b.company_id = p_company
    and tstzrange(b.pickup_at - make_interval(mins => b.buffer_min), b.pickup_at + make_interval(mins => b.duration_min + b.buffer_min)) @> s.slot
  ),
  free as (
    select slot from slots where slot not in (select slot from busy)
  )
  select slot from free;
$$;

grant execute on function availability(uuid, date, int, int) to authenticated;
