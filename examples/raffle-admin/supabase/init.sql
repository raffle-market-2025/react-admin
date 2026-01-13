-- =========================
-- 0) Extensions (if needed)
-- =========================
-- gen_random_uuid is in pgcrypto
create extension if not exists pgcrypto;

-- =========================
-- 1) Types
-- =========================
do $$ begin
  create type public.app_role as enum ('viewer', 'operator', 'admin', 'superadmin');
exception when duplicate_object then null;
end $$;

-- =========================
-- 2) Base tables
-- =========================

-- Countries: alpha-2 primary key, alpha-3 unique
create table if not exists public.countries (
  alpha2 text primary key check (char_length(alpha2) = 2),
  alpha3 text unique not null check (char_length(alpha3) = 3)
);

-- User profile: 1:1 with auth.users (or null during preprovisioning)
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  wallet_address text unique, -- "0x..." lowercased recommended
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_users_wallet on public.app_users(wallet_address);

-- Global superadmin role (exactly superadmin)
create table if not exists public.user_global_roles (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  role public.app_role not null check (role = 'superadmin')
);

-- Country-scoped roles (no superadmin here)
create table if not exists public.user_country_roles (
  user_id uuid references public.app_users(id) on delete cascade,
  country2 text references public.countries(alpha2) on delete restrict,
  role public.app_role not null check (role in ('viewer','operator','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, country2)
);

create index if not exists idx_ucr_country on public.user_country_roles(country2);
create index if not exists idx_ucr_user on public.user_country_roles(user_id);

-- Raffle metadata (off-chain) for country filtering
create table if not exists public.raffle_meta (
  raffle_id bigint primary key,
  raffle_address text not null,
  country2 text not null references public.countries(alpha2),
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_raffle_meta_country on public.raffle_meta(country2);
create index if not exists idx_raffle_meta_address on public.raffle_meta(raffle_address);

-- Operational status per raffle
create table if not exists public.raffle_ops (
  raffle_id bigint primary key references public.raffle_meta(raffle_id) on delete cascade,
  cleanup_done boolean not null default false,
  prizes_sent boolean not null default false,
  note text,
  updated_by uuid references public.app_users(id),
  updated_at timestamptz not null default now()
);

-- Audit log
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_user_id uuid references public.app_users(id),
  action text not null,
  country2 text references public.countries(alpha2),
  raffle_id bigint,
  tx_hash text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_created on public.audit_log(created_at desc);
create index if not exists idx_audit_action on public.audit_log(action);

-- =========================
-- 3) Updated_at trigger
-- =========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger trg_app_users_updated
  before update on public.app_users
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_user_country_roles_updated
  before update on public.user_country_roles
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_raffle_ops_updated
  before update on public.raffle_ops
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

-- =========================
-- 4) Seed countries
-- =========================
insert into public.countries(alpha2, alpha3) values
('UA','UKR'),
('US','USA'),
('GB','GBR'),
('CA','CAN'),
('AU','AUS'),
('DE','DEU'),
('FR','FRA'),
('ES','ESP'),
('IT','ITA'),
('PL','POL'),
('NL','NLD'),
('SE','SWE'),
('NO','NOR'),
('DK','DNK'),
('FI','FIN'),
('IE','IRL'),
('CH','CHE'),
('AT','AUT'),
('BE','BEL'),
('CZ','CZE'),
('SK','SVK'),
('HU','HUN'),
('RO','ROU'),
('BG','BGR'),
('GR','GRC'),
('TR','TUR'),
('IL','ISR'),
('AE','ARE'),
('SA','SAU'),
('IN','IND'),
('CN','CHN'),
('JP','JPN'),
('KR','KOR'),
('BR','BRA'),
('MX','MEX'),
('AR','ARG'),
('CL','CHL'),
('CO','COL'),
('PE','PER'),
('ZA','ZAF'),
('EG','EGY'),
('NG','NGA'),
('KE','KEN'),
('SG','SGP'),
('HK','HKG'),
('TW','TWN'),
('TH','THA'),
('VN','VNM'),
('MY','MYS'),
('ID','IDN'),
('PH','PHL'),
('NZ','NZL')
on conflict do nothing;

-- =========================
-- 5) RLS enable
-- =========================
alter table public.countries enable row level security;
alter table public.app_users enable row level security;
alter table public.user_global_roles enable row level security;
alter table public.user_country_roles enable row level security;
alter table public.raffle_meta enable row level security;
alter table public.raffle_ops enable row level security;
alter table public.audit_log enable row level security;

-- countries: readable to authenticated (or public)
drop policy if exists countries_select_all on public.countries;
create policy countries_select_all
on public.countries for select
using (true);

-- =========================
-- 6) Helper functions for RLS
-- =========================
create or replace function public.is_superadmin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_global_roles ugr
    join public.app_users au on au.id = ugr.user_id
    where au.auth_user_id = auth.uid()
      and ugr.role = 'superadmin'
  );
$$;

-- role ordering helper (viewer < operator < admin)
create or replace function public.role_rank(r public.app_role)
returns int
language sql
immutable
as $$
  select case r
    when 'viewer' then 1
    when 'operator' then 2
    when 'admin' then 3
    when 'superadmin' then 4
    else 0
  end;
$$;

create or replace function public.has_country_role(_country2 text, _min_role public.app_role)
returns boolean
language sql
stable
as $$
  select public.is_superadmin()
  or exists (
    select 1
    from public.user_country_roles ucr
    join public.app_users au on au.id = ucr.user_id
    where au.auth_user_id = auth.uid()
      and ucr.country2 = _country2
      and public.role_rank(ucr.role) >= public.role_rank(_min_role)
  );
$$;

-- current app_user.id for authed session
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
as $$
  select au.id
  from public.app_users au
  where au.auth_user_id = auth.uid()
  limit 1;
$$;

-- =========================
-- 7) Policies
-- =========================

-- app_users
drop policy if exists app_users_select_self_or_super on public.app_users;
create policy app_users_select_self_or_super
on public.app_users for select
using (
  auth_user_id = auth.uid()
  or public.is_superadmin()
);

-- inserts/updates/deletes only superadmin via UI.
drop policy if exists app_users_write_super_only on public.app_users;
create policy app_users_write_super_only
on public.app_users for all
using (public.is_superadmin())
with check (public.is_superadmin());

-- user_global_roles: only superadmin can manage; user can read own
drop policy if exists ugr_select_super_or_self on public.user_global_roles;
create policy ugr_select_super_or_self
on public.user_global_roles for select
using (
  public.is_superadmin()
  or exists (
    select 1
    from public.app_users au
    where au.id = user_id and au.auth_user_id = auth.uid()
  )
);

drop policy if exists ugr_write_super_only on public.user_global_roles;
create policy ugr_write_super_only
on public.user_global_roles for all
using (public.is_superadmin())
with check (public.is_superadmin());

-- user_country_roles: only superadmin manages; user can read own
drop policy if exists ucr_select_super_or_self on public.user_country_roles;
create policy ucr_select_super_or_self
on public.user_country_roles for select
using (
  public.is_superadmin()
  or exists (
    select 1
    from public.app_users au
    where au.id = user_id and au.auth_user_id = auth.uid()
  )
);

drop policy if exists ucr_write_super_only on public.user_country_roles;
create policy ucr_write_super_only
on public.user_country_roles for all
using (public.is_superadmin())
with check (public.is_superadmin());

-- raffle_meta: view is scoped; writes only superadmin (admin panel)
drop policy if exists raffle_meta_select_scoped on public.raffle_meta;
create policy raffle_meta_select_scoped
on public.raffle_meta for select
using (public.has_country_role(country2, 'viewer'));

drop policy if exists raffle_meta_write_super_only on public.raffle_meta;
create policy raffle_meta_write_super_only
on public.raffle_meta for all
using (public.is_superadmin())
with check (public.is_superadmin());

-- raffle_ops: select scoped; insert/update allowed for operator+
drop policy if exists raffle_ops_select_scoped on public.raffle_ops;
create policy raffle_ops_select_scoped
on public.raffle_ops for select
using (
  exists (
    select 1
    from public.raffle_meta rm
    where rm.raffle_id = raffle_ops.raffle_id
      and public.has_country_role(rm.country2, 'viewer')
  )
);

drop policy if exists raffle_ops_insert_operator on public.raffle_ops;
create policy raffle_ops_insert_operator
on public.raffle_ops for insert
with check (
  exists (
    select 1
    from public.raffle_meta rm
    where rm.raffle_id = raffle_ops.raffle_id
      and public.has_country_role(rm.country2, 'operator')
  )
);

drop policy if exists raffle_ops_update_operator on public.raffle_ops;
create policy raffle_ops_update_operator
on public.raffle_ops for update
using (
  exists (
    select 1
    from public.raffle_meta rm
    where rm.raffle_id = raffle_ops.raffle_id
      and public.has_country_role(rm.country2, 'operator')
  )
)
with check (
  exists (
    select 1
    from public.raffle_meta rm
    where rm.raffle_id = raffle_ops.raffle_id
      and public.has_country_role(rm.country2, 'operator')
  )
);

drop policy if exists raffle_ops_delete_super on public.raffle_ops;
create policy raffle_ops_delete_super
on public.raffle_ops for delete
using (public.is_superadmin());

-- audit_log: insert operator+ scoped; read scoped
drop policy if exists audit_insert_operator_scoped on public.audit_log;
create policy audit_insert_operator_scoped
on public.audit_log for insert
with check (
  public.is_superadmin()
  or (country2 is not null and public.has_country_role(country2, 'operator'))
);

drop policy if exists audit_select_scoped on public.audit_log;
create policy audit_select_scoped
on public.audit_log for select
using (
  public.is_superadmin()
  or (country2 is not null and public.has_country_role(country2, 'viewer'))
);

-- =========================
-- 8) Strict "bind wallet once" via RPC
-- =========================

-- We want:
-- - Caller must be authenticated (auth.uid() not null)
-- - The caller must have an app_users row with matching auth_user_id
-- - wallet_address can be set ONLY if it is currently NULL
-- - address uniqueness is already enforced by UNIQUE constraint
-- - normalize to lowercase
-- - return updated row

create or replace function public.bind_wallet_once(_wallet text)
returns public.app_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_user public.app_users;
  v_wallet text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_wallet := lower(trim(_wallet));
  if v_wallet is null or v_wallet = '' then
    raise exception 'wallet_empty';
  end if;

  -- light format check
  if v_wallet !~ '^0x[0-9a-f]{40}$' then
    raise exception 'wallet_bad_format';
  end if;

  select *
  into v_user
  from public.app_users
  where auth_user_id = v_uid
  limit 1;

  if v_user.id is null then
    raise exception 'profile_missing';
  end if;

  if v_user.wallet_address is not null then
    raise exception 'wallet_already_bound';
  end if;

  update public.app_users
  set wallet_address = v_wallet
  where id = v_user.id
  returning * into v_user;

  return v_user;
end $$;

-- Allow authenticated users to call RPC
revoke all on function public.bind_wallet_once(text) from public;
grant execute on function public.bind_wallet_once(text) to authenticated;

-- =========================
-- 9) Optional: helper view for UI
-- =========================
-- Flatten permissions per user for frontend convenience (still RLS-protected by base tables)
create or replace view public.my_permissions as
select
  (select public.is_superadmin()) as is_superadmin,
  au.wallet_address as wallet_address
from public.app_users au
where au.auth_user_id = auth.uid()
limit 1;

grant select on public.my_permissions to authenticated;