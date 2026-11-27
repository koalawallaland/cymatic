create table public.sunnymoo_displays (
  id bigint generated always as identity primary key,
  kind smallint not null check (kind between 0 and 2),
  shape smallint not null check (shape between 0 and 2),
  pigment smallint not null check (pigment between 0 and 5),
  finish smallint not null check (finish between 0 and 2),
  filling smallint not null check (filling between 0 and 2),
  accent smallint not null check (accent between 0 and 5),
  charm smallint not null check (charm between 0 and 2),
  spot smallint not null check (spot between 0 and 23),
  unique(kind,shape,pigment,finish,filling,accent,charm,spot)
);
alter table public.sunnymoo_displays enable row level security;
revoke all on public.sunnymoo_displays from public, anon, authenticated;
grant select on public.sunnymoo_displays to anon, authenticated;
grant insert(kind,shape,pigment,finish,filling,accent,charm,spot) on public.sunnymoo_displays to anon, authenticated;
create policy view_displays on public.sunnymoo_displays for select to anon, authenticated using(true);
create policy place_design on public.sunnymoo_displays for insert to anon, authenticated with check(true);
