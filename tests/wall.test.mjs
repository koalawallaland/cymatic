import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createHandler,validateDrawing} from '../supabase/functions/graffiti-wall/handler.mjs';

const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key);`);
await db.exec(await readFile(new URL('../supabase/migrations/202611060001_shared_wall.sql',import.meta.url),'utf8'));
const users=Array.from({length:12},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
for(const id of users)await db.query('insert into auth.users values($1)',[id]);
const drawing={v:1,strokes:[{tool:'marker',color:'#ff7ab8',seed:123,points:[[10,20],[120,140]]}]};
const origin='https://koalawallaland.github.io';
const tokens=new Map(users.map((id,i)=>[`visitor-${i}`,id]));
let outage=false;
const fakeFetch=async(url,options)=>{
  if(outage)throw Error('offline');
  if(url.endsWith('/auth/v1/user')){const id=tokens.get(options.headers.Authorization?.slice(7));return Response.json(id?{id}:{error:'Invalid JWT'},{status:id?200:401});}
  assert.equal(options.headers.apikey,'server-only');assert.equal(options.headers.Authorization,undefined);
  const args=JSON.parse(options.body),name=url.split('/').at(-1);
  const values=Object.values(args),params=Object.keys(args).map((key,i)=>`${key}=>$${i+1}`).join(',');
  const result=await db.query(`select public.${name}(${params}) as value`,values);
  return Response.json(result.rows[0].value);
};
const handler=createHandler({url:'https://project.example',serviceKey:'server-only',anonKey:'public-key',fetcher:fakeFetch});
const request=(body,user=0,extra={})=>handler(new Request('https://project.example/functions/v1/graffiti-wall',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:`Bearer visitor-${user}`,...extra},body:JSON.stringify(body)}));
const submit=(user=0,id=crypto.randomUUID())=>request({action:'submit',clientId:id,name:'Test visitor',drawing},user);
const feed=(headers={})=>handler(new Request('https://project.example/functions/v1/graffiti-wall',{headers:{Origin:origin,...headers}}));

test('bounded drawing input rejects malformed and executable content',()=>{
  assert.deepEqual(validateDrawing(drawing),drawing);
  for(const bad of [null,{v:1,strokes:[]},{v:1,strokes:[{...drawing.strokes[0],points:[[NaN,1]]}]},{v:1,strokes:[{...drawing.strokes[0],points:[[1201,1]]}]},{v:1,strokes:[{...drawing.strokes[0],color:'url(javascript:alert(1))'}]},{v:1,strokes:[{...drawing.strokes[0],points:Array(2001).fill([0,0])}]}])assert.throws(()=>validateDrawing(bad));
});
test('public read, strict CORS and JWT authentication',async()=>{
  assert.equal((await feed()).status,200);
  assert.equal((await handler(new Request('https://api.example',{method:'OPTIONS',headers:{Origin:origin}}))).status,204);
  assert.equal((await feed({Origin:'https://unrelated.example'})).status,403);
  assert.equal((await request({action:'submit'},{},{Authorization:''})).status,401);
  assert.equal((await request({action:'submit'},0,{Authorization:'Bearer forged'})).status,401);
  assert.equal((await request(null)).status,400);
});
test('idempotency, atomic posting limits, and no trust in supplied author',async()=>{
  const id=crypto.randomUUID();const a=await submit(0,id);assert.equal(a.status,200);
  assert.equal((await submit(0,id)).status,200);
  assert.equal((await submit()).status,200);assert.equal((await submit()).status,200);assert.equal((await submit()).status,429);
  assert.equal((await submit(0,id)).status,200);
  const result=await request({action:'submit',clientId:crypto.randomUUID(),name:'Another visitor',drawing,authorId:users[0]},1);
  const post=(await result.json()).id;
  assert.equal((await db.query('select author_id from public.wall_posts where id=$1',[post])).rows[0].author_id,users[1]);
});
test('daily quota survives rolling short windows',async()=>{
  for(let i=0;i<10;i++){if(i%3===0)await db.query("update public.wall_posts set created_at=now()-interval '11 minutes' where author_id=$1",[users[5]]);assert.equal((await submit(5)).status,200);}
  await db.query("update public.wall_posts set created_at=now()-interval '11 minutes' where author_id=$1",[users[5]]);
  assert.equal((await submit(5)).status,429);
});
test('three distinct reports hide a drawing; duplicates are idempotent',async()=>{
  const post=(await (await submit(2)).json()).id;
  const initial=await feed(),etag=initial.headers.get('etag');
  assert.equal((await feed({'If-None-Match':etag})).status,304);
  for(const i of [3,3,4,6])assert.equal((await request({action:'report',postId:post,reason:'abuse'},i)).status,200);
  const row=(await db.query('select status,report_count from public.wall_posts where id=$1',[post])).rows[0];assert.equal(row.status,'review');assert.equal(row.report_count,3);
  const refreshed=await feed({'If-None-Match':etag});assert.equal(refreshed.status,200);assert.ok(!(await refreshed.json()).posts.some(p=>p.id===post));
  await db.query("update public.wall_posts set status='public' where id=$1",[post]);assert.ok((await (await feed()).json()).posts.some(p=>p.id===post));
  await db.query("update public.wall_posts set status='hidden' where id=$1",[post]);assert.ok(!(await (await feed()).json()).posts.some(p=>p.id===post));
});
test('bans, report rate limits, and XSS names are rejected',async()=>{
  await db.query('insert into public.wall_bans(user_id) values($1)',[users[7]]);assert.equal((await submit(7)).status,403);
  assert.equal((await request({action:'submit',clientId:crypto.randomUUID(),name:'<script>alert(1)</script>',drawing},8)).status,400);
  const posts=(await (await feed()).json()).posts;
  for(const p of posts.slice(0,5))assert.equal((await request({action:'report',postId:p.id,reason:'spam'},8)).status,200);
  assert.equal((await request({action:'report',postId:posts[5].id,reason:'spam'},8)).status,429);
});
test('table and RPC access are denied to direct anonymous and visitor clients',async()=>{
  for(const role of ['anon','authenticated']){
    const r=await db.query("select has_table_privilege($1,'public.wall_posts','insert') as allowed,has_function_privilege($1,'public.wall_submit(uuid,uuid,text,jsonb)','execute') as rpc",[role]);assert.equal(r.rows[0].allowed,false);assert.equal(r.rows[0].rpc,false);
  }
});
test('pagination has no duplicates and hidden work never enters the feed',async()=>{
  await db.query(`insert into public.wall_posts(author_id,client_id,name,drawing,created_at) select $1,gen_random_uuid(),'Older visitor',$2::jsonb,now()-interval '2 days'-n*interval '1 second' from generate_series(1,40) n`,[users[9],JSON.stringify(drawing)]);
  const a=await (await feed()).json();assert.equal(a.posts.length,24);assert.ok(a.next);
  const b=await (await handler(new Request(`https://api.example?before=${encodeURIComponent(a.next)}`,{headers:{Origin:origin}}))).json();
  assert.ok(b.posts.length);assert.equal(new Set([...a.posts,...b.posts].map(p=>p.id)).size,a.posts.length+b.posts.length);
});
test('global posting cap limits account-rotation abuse and backend failures are safe',async()=>{
  await db.query(`insert into public.wall_posts(author_id,client_id,name,drawing) select $1,gen_random_uuid(),'Load test',$2::jsonb from generate_series(1,200)`,[users[10],JSON.stringify(drawing)]);
  assert.equal((await submit(11)).status,429);
  outage=true;assert.equal((await feed()).status,503);outage=false;
});
test.after(async()=>db.close());
