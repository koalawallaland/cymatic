-- Shop waitlist. Visitors can add an email with the public key.
-- Nobody can read, change or delete the list with it: only the service role can.
create table public.shop_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (
    char_length(email) between 6 and 254
    and email = lower(email)
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  source text not null default 'shop' check (char_length(source) between 1 and 24),
  created_at timestamptz not null default now()
);
create unique index shop_waitlist_email on public.shop_waitlist(email);

alter table public.shop_waitlist enable row level security;
revoke all on public.shop_waitlist from anon, authenticated;
grant insert (email, source) on public.shop_waitlist to anon, authenticated;
grant all on public.shop_waitlist to service_role;

create policy shop_waitlist_join on public.shop_waitlist
  for insert to anon, authenticated
  with check (true);
