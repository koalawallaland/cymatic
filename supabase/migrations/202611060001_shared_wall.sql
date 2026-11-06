create table public.wall_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id),
  client_id uuid not null,
  name text not null check (char_length(name) between 1 and 24),
  drawing jsonb not null check (jsonb_typeof(drawing) = 'object' and octet_length(drawing::text) <= 48000),
  status text not null default 'public' check (status in ('public','review','hidden')),
  report_count integer not null default 0,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(author_id, client_id)
);
create index wall_posts_feed on public.wall_posts(created_at desc, id desc) where status = 'public';
create index wall_posts_author on public.wall_posts(author_id, created_at desc);
create table public.wall_reports (
  post_id uuid not null references public.wall_posts(id),
  reporter_id uuid not null references auth.users(id),
  reason text not null check (reason in ('abuse','personal','spam','other')),
  created_at timestamptz not null default now(),
  primary key(post_id, reporter_id)
);
create index wall_reports_rate on public.wall_reports(reporter_id, created_at desc);
create table public.wall_bans (
  user_id uuid primary key references auth.users(id),
  reason text not null default 'Owner moderation',
  created_at timestamptz not null default now()
);
alter table public.wall_posts enable row level security;
alter table public.wall_reports enable row level security;
alter table public.wall_bans enable row level security;
revoke all on public.wall_posts, public.wall_reports, public.wall_bans from anon, authenticated;
grant all on public.wall_posts, public.wall_reports, public.wall_bans to service_role;

-- Only the Edge Function may call these. It supplies the verified Auth user ID.
-- The same transaction lock protects quota checks and writes from parallel requests.
create function public.wall_submit(p_author uuid,p_client uuid,p_name text,p_drawing jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform pg_advisory_xact_lock(64158204);
  select id into v_id from public.wall_posts where author_id=p_author and client_id=p_client;
  if found then return jsonb_build_object('ok',true,'id',v_id); end if;
  if exists(select 1 from public.wall_bans where user_id=p_author) then
    return jsonb_build_object('ok',false,'status',403,'error','Posting is unavailable for this visitor.');
  end if;
  if (select count(*) from public.wall_posts where author_id=p_author and created_at>now()-interval '10 minutes') >= 3
     or (select count(*) from public.wall_posts where author_id=p_author and created_at>now()-interval '1 day') >= 10 then
    return jsonb_build_object('ok',false,'status',429,'error','Take a little break. Limit: 3 drawings per 10 minutes and 10 per day.');
  end if;
  if (select count(*) from public.wall_posts where created_at>now()-interval '1 day') >= 200
     or (select count(*) from public.wall_posts) >= 5000 then
    return jsonb_build_object('ok',false,'status',429,'error','The wall is full for now. Please try another day.');
  end if;
  insert into public.wall_posts(author_id,client_id,name,drawing) values(p_author,p_client,p_name,p_drawing) returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end $$;

create function public.wall_report(p_reporter uuid,p_post uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_post public.wall_posts; v_count integer;
begin
  perform pg_advisory_xact_lock(64158204);
  if exists(select 1 from public.wall_bans where user_id=p_reporter) then
    return jsonb_build_object('ok',false,'status',403,'error','Reporting is unavailable for this visitor.');
  end if;
  select * into v_post from public.wall_posts where id=p_post;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','Drawing not found.'); end if;
  if exists(select 1 from public.wall_reports where post_id=p_post and reporter_id=p_reporter) then
    return jsonb_build_object('ok',true,'hidden',v_post.status<>'public');
  end if;
  if (select count(*) from public.wall_reports where reporter_id=p_reporter and created_at>now()-interval '1 hour') >= 5
     or (select count(*) from public.wall_reports where reporter_id=p_reporter and created_at>now()-interval '1 day') >= 10 then
    return jsonb_build_object('ok',false,'status',429,'error','Report limit reached. Please try later.');
  end if;
  insert into public.wall_reports(post_id,reporter_id,reason) values(p_post,p_reporter,p_reason);
  select count(*) into v_count from public.wall_reports where post_id=p_post and (v_post.reviewed_at is null or created_at>v_post.reviewed_at);
  update public.wall_posts set report_count=v_count,
    status=case when status='public' and v_count>=3 then 'review' else status end where id=p_post;
  return jsonb_build_object('ok',true,'hidden',v_count>=3 or v_post.status<>'public');
end $$;

create function public.wall_feed(p_before_time timestamptz default null,p_before_id uuid default null)
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'drawing',drawing,'created_at',created_at)
    order by created_at desc,id desc),'[]'::jsonb)
  from (select id,name,drawing,created_at from public.wall_posts
    where status='public' and (p_before_time is null or (created_at,id)<(p_before_time,p_before_id))
    order by created_at desc,id desc limit 25) p;
$$;
revoke all on function public.wall_submit(uuid,uuid,text,jsonb),public.wall_report(uuid,uuid,text),public.wall_feed(timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.wall_submit(uuid,uuid,text,jsonb),public.wall_report(uuid,uuid,text),public.wall_feed(timestamptz,uuid) to service_role;
