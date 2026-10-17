-- Studio records for lavibachchis.com (agreements, invoices, signed PDFs, settings, numbering, activity log).
-- The studio itself still runs on Google Apps Script and still sends its emails from Lavi's Google account;
-- only the records live here. Apps Script talks to this database with the project's secret key.
--
-- Safe to run more than once: everything is "create if missing".
-- Nothing here is readable with the public (anon/publishable) key: row level security is on and there are
-- no policies, so only the secret key (server side, in Apps Script) can read or write.

-- ---------------------------------------------------------------------------------------------------------
-- Agreements: one row per agreement. The readable columns are a register you can sort and filter in the
-- Table Editor; "data" is the full record (every version, signature and event). Please don't edit "id" or "data".
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.agreements (
  id          text primary key,
  ref         text not null unique,
  status      text not null,
  client      text,
  company     text,
  email       text,
  type        text,
  fee         numeric(12, 2),
  currency    text,
  version     integer,
  created     date,
  signed      date,
  starts      date,
  ends        date,
  test        boolean not null default false,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
comment on table public.agreements is 'Studio agreements. Readable columns are the register; data is the full record. Do not edit id or data.';

create table if not exists public.invoices (
  id             text primary key,
  number         text not null unique,
  agreement_ref  text,
  client         text,
  description    text,
  amount         numeric(12, 2),
  currency       text,
  issued         date,
  due            date,
  status         text not null,
  paid_on        date,
  test           boolean not null default false,
  agreement_id   text,
  key            text,
  data           jsonb not null,
  updated_at     timestamptz not null default now()
);
comment on table public.invoices is 'Studio invoices. Readable columns are the register; data is the full record. Do not edit id, key or data.';
create index if not exists invoices_agreement_id_idx on public.invoices (agreement_id);

create table if not exists public.activity_log (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  ref     text,
  event   text not null,
  detail  text
);
comment on table public.activity_log is 'Everything the studio did: sign-ins, emails sent, invoices issued, errors.';
create index if not exists activity_log_at_idx on public.activity_log (at desc);

-- Business, bank and invoice settings (one row, key = 'studio'), edited from the studio's Settings page.
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
comment on table public.settings is 'Studio settings (business address, payment details, invoice options). Edit them in the studio.';

-- Reference numbers (LB-A-2026-001, LB-INV-2026-0001 ...). Never reused.
create table if not exists public.counters (
  key    text primary key,
  value  integer not null
);
comment on table public.counters is 'Last reference number used, per kind and year. Never lower a value.';

-- Next number for a counter, atomically (two requests can never get the same number).
-- floor lets the first call start after numbers already used in the old Google setup.
create or replace function public.next_number(counter_key text, floor_value integer default 0)
returns integer
language sql
security invoker
set search_path = public
as $$
  insert into public.counters as c (key, value) values (counter_key, greatest(floor_value, 0) + 1)
  on conflict (key) do update set value = greatest(c.value, floor_value) + 1
  returning value;
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Lock everything down: no access with the public key, secret key only.
-- ---------------------------------------------------------------------------------------------------------
alter table public.agreements   enable row level security;
alter table public.invoices     enable row level security;
alter table public.activity_log enable row level security;
alter table public.settings     enable row level security;
alter table public.counters     enable row level security;

revoke all on public.agreements, public.invoices, public.activity_log, public.settings, public.counters from anon, authenticated;
revoke execute on function public.next_number(text, integer) from public, anon, authenticated;
grant execute on function public.next_number(text, integer) to service_role;
grant all on public.agreements, public.invoices, public.activity_log, public.settings, public.counters to service_role;

-- Keep updated_at current.
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists agreements_touch on public.agreements;
create trigger agreements_touch before update on public.agreements for each row execute function public.touch_updated_at();
drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch before update on public.invoices for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------------------
-- Signed agreement PDFs: private storage bucket (PDF only, up to 10 MB each).
-- ---------------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signed-agreements', 'signed-agreements', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;
