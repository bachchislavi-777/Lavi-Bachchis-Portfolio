-- Contact form enquiries from lavibachchis.com/uk/contact/ and /us/contact/.
-- The website (public) can only ADD a row. Nobody can read, change or delete rows with the public key:
-- you read them in Supabase → Table Editor → contact_enquiries (or later in the studio, with the secret key).
--
-- Safe to run more than once.

create table if not exists public.contact_enquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  region      text not null check (region in ('uk', 'us')),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  business    text check (business is null or char_length(business) <= 300),
  message     text not null check (char_length(message) between 1 and 5000),
  page        text check (page is null or char_length(page) <= 200),
  status      text not null default 'new' check (status in ('new', 'replied', 'won', 'not a fit', 'spam'))
);
comment on table public.contact_enquiries is 'Website contact form. Public key can insert only. Change status as you reply.';

alter table public.contact_enquiries enable row level security;

-- Public key: insert only, and only as a fresh "new" enquiry.
drop policy if exists "website can add enquiries" on public.contact_enquiries;
create policy "website can add enquiries"
  on public.contact_enquiries
  for insert
  to anon
  with check (status = 'new');

-- Column-level grants: the public key may only fill these columns (no id/created_at/status tampering).
revoke all on public.contact_enquiries from anon, authenticated;
grant insert (region, name, email, business, message, page) on public.contact_enquiries to anon;

create index if not exists contact_enquiries_created_at_idx on public.contact_enquiries (created_at desc);
