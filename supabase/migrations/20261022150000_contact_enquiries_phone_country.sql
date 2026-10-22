-- Contact form: add phone (optional) and country/location (required on the form).
-- Safe to run more than once.
alter table public.contact_enquiries add column if not exists phone text check (phone is null or char_length(phone) <= 40);
alter table public.contact_enquiries add column if not exists country text check (country is null or char_length(country) <= 120);
grant insert (phone, country) on public.contact_enquiries to anon;
