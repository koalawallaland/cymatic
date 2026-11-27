create table public.sunnymoo_ribbons (
 id bigint generated always as identity primary key,
 recipe smallint[] not null check (array_ndims(recipe)=1 and array_lower(recipe,1)=1 and cardinality(recipe)=7 and array_position(recipe,null) is null and recipe[1]=2 and recipe[2] between 0 and 2 and recipe[3] between 0 and 5 and recipe[4] between 0 and 2 and recipe[5] between 0 and 2 and recipe[6] between 0 and 5 and recipe[7] between 0 and 2),
 xy smallint[] not null check (array_ndims(xy)=1 and array_lower(xy,1)=1 and cardinality(xy) between 4 and 64 and cardinality(xy)%2=0 and array_position(xy,null) is null and 0 <= all(xy) and 100 >= all(xy)),
 unique(recipe,xy)
);
alter table public.sunnymoo_ribbons enable row level security;
revoke all on public.sunnymoo_ribbons from public,anon,authenticated;
grant select on public.sunnymoo_ribbons to anon,authenticated;
grant insert(recipe,xy) on public.sunnymoo_ribbons to anon,authenticated;
create policy view_ribbons on public.sunnymoo_ribbons for select to anon,authenticated using(true);
create policy add_ribbons on public.sunnymoo_ribbons for insert to anon,authenticated with check(true);
