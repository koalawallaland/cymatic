-- Shared, anonymous-to-viewers keycap gallery. Deploy with Supabase CLI.
create table if not exists public.shared_keycaps (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null unique,
 name text not null check (char_length(name) between 1 and 60),
 image text not null check (length(image) between 100 and 90000 and image like 'data:image/jpeg;base64,%'),
 status text not null default 'public' check (status in ('public','hidden')),
 created_at timestamptz not null default now()
);
create index if not exists shared_keycaps_feed on public.shared_keycaps(created_at desc) where status='public';
alter table public.shared_keycaps enable row level security;
revoke all on public.shared_keycaps from anon,authenticated;
grant all on public.shared_keycaps to service_role;
create or replace function public.keycap_feed()
returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'img',image,'at',extract(epoch from created_at)*1000) order by created_at desc),'[]'::jsonb)
 from (select id,name,image,created_at from public.shared_keycaps where status='public' order by created_at desc limit 24) t;
$$;
create or replace function public.keycap_submit(p_client uuid,p_name text,p_image text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 perform pg_advisory_xact_lock(774110);
 select id into v_id from public.shared_keycaps where client_id=p_client;
 if found then return jsonb_build_object('ok',true,'id',v_id); end if;
 if (select count(*) from public.shared_keycaps where created_at > now()-interval '1 hour') >= 40 then
 return jsonb_build_object('ok',false,'error','Gallery is busy; your cap is still saved locally.'); end if;
 insert into public.shared_keycaps(client_id,name,image) values(p_client,p_name,p_image) returning id into v_id;
 return jsonb_build_object('ok',true,'id',v_id);
end $$;
revoke all on function public.keycap_feed(),public.keycap_submit(uuid,text,text) from public,anon,authenticated;
grant execute on function public.keycap_feed(),public.keycap_submit(uuid,text,text) to service_role;
