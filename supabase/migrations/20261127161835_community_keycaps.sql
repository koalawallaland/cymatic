-- Shared artisan resin casts. A cast is a bounded 8x8 RGB444 texture, never a photo,
-- arbitrary markup, caption, contact information, keyboard arrangement, or typed text.
create table public.community_keycaps (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  texture text not null check (texture ~ '^[0-9a-f]{192}$'),
  status text not null default 'public' check (status in ('public','review','withdrawn')),
  created_at timestamptz not null default now(),
  unique(author_id, texture)
);
create index community_keycaps_feed on public.community_keycaps(created_at desc,id desc) where status='public';
create index community_keycaps_author on public.community_keycaps(author_id,created_at desc);
create table public.community_keycap_reports (
  cap_id uuid not null references public.community_keycaps(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(cap_id,reporter_id)
);
create index community_keycap_reports_rate on public.community_keycap_reports(reporter_id,created_at desc);
alter table public.community_keycaps enable row level security;
alter table public.community_keycap_reports enable row level security;
revoke all on public.community_keycaps,public.community_keycap_reports from public,anon,authenticated;
grant select,insert,update,delete on public.community_keycaps,public.community_keycap_reports to service_role;
-- No browser role can query the underlying tables; service-only access via validated Edge Function.
create function public.keycap_feed(p_before_time timestamptz default null,p_before_id uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'texture',texture,'created_at',created_at) order by created_at desc,id desc),'[]'::jsonb)
  from (select id,texture,created_at from public.community_keycaps where status='public'
    and (p_before_time is null or (created_at,id)<(p_before_time,p_before_id))
    order by created_at desc,id desc limit 25) x;
$$;
create function public.keycap_mine(p_author uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'texture',texture,'status',status,'created_at',created_at) order by created_at desc),'[]'::jsonb)
  from (select id,texture,status,created_at from public.community_keycaps where author_id=p_author order by created_at desc limit 100) x;
$$;
create function public.keycap_submit(p_author uuid,p_texture text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_status text;
begin
  if p_texture is null or p_texture !~ '^[0-9a-f]{192}$' then return jsonb_build_object('ok',false,'status',400,'error','Invalid cast texture.'); end if;
  perform pg_advisory_xact_lock(64158205);
  select id,status into v_id,v_status from public.community_keycaps where author_id=p_author and texture=p_texture;
  if found then
    if v_status<>'public' then return jsonb_build_object('ok',false,'status',409,'error','This exact cast has already been removed.'); end if;
    return jsonb_build_object('ok',true,'id',v_id,'existing',true);
  end if;
  if exists(select 1 from public.wall_bans where user_id=p_author) then
    return jsonb_build_object('ok',false,'status',403,'error','Posting is unavailable for this visitor.');
  end if;
  if (select count(*) from public.community_keycaps where author_id=p_author and created_at>now()-interval '10 minutes')>=3
  or (select count(*) from public.community_keycaps where author_id=p_author and created_at>now()-interval '1 day')>=10
  or (select count(*) from public.community_keycaps where author_id=p_author)>=100 then
    return jsonb_build_object('ok',false,'status',429,'error','Cast sharing limit reached. Please try again later.');
  end if;
  if (select count(*) from public.community_keycaps where created_at>now()-interval '1 day')>=200
  or (select count(*) from public.community_keycaps)>=5000 then
    return jsonb_build_object('ok',false,'status',429,'error','The community collection is full for now.');
  end if;
  insert into public.community_keycaps(author_id,texture) values(p_author,p_texture) returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id,'existing',false);
end $$;
create function public.keycap_withdraw(p_author uuid,p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  update public.community_keycaps set status='withdrawn' where id=p_id and author_id=p_author;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','Cast not found.'); end if;
  return jsonb_build_object('ok',true);
end $$;
create function public.keycap_report(p_reporter uuid,p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_status text; v_author uuid;
begin
  perform pg_advisory_xact_lock(64158205);
  select status,author_id into v_status,v_author from public.community_keycaps where id=p_id;
  if not found or v_status<>'public' or v_author=p_reporter then return jsonb_build_object('ok',false,'status',404,'error','Cast unavailable for reporting.'); end if;
  if exists(select 1 from public.wall_bans where user_id=p_reporter) then return jsonb_build_object('ok',false,'status',403,'error','Reporting is unavailable for this visitor.'); end if;
  if exists(select 1 from public.community_keycap_reports where cap_id=p_id and reporter_id=p_reporter) then return jsonb_build_object('ok',true); end if;
  if (select count(*) from public.community_keycap_reports where reporter_id=p_reporter and created_at>now()-interval '1 hour')>=5
  or (select count(*) from public.community_keycap_reports where reporter_id=p_reporter and created_at>now()-interval '1 day')>=10 then return jsonb_build_object('ok',false,'status',429,'error','Report limit reached.'); end if;
  insert into public.community_keycap_reports(cap_id,reporter_id) values(p_id,p_reporter);
  if (select count(*) from public.community_keycap_reports where cap_id=p_id)>=3 then
    update public.community_keycaps set status='review' where id=p_id and status='public';
  end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.keycap_feed(timestamptz,uuid),public.keycap_mine(uuid),public.keycap_submit(uuid,text),public.keycap_withdraw(uuid,uuid),public.keycap_report(uuid,uuid) from public,anon,authenticated;
grant execute on function public.keycap_feed(timestamptz,uuid),public.keycap_mine(uuid),public.keycap_submit(uuid,text),public.keycap_withdraw(uuid,uuid),public.keycap_report(uuid,uuid) to service_role;
