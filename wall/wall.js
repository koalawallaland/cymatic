import {wallConfig} from './config.js';
import {bricks,renderDrawing} from './render.js';
const $=id=>document.getElementById(id),canvas=$('wall'),ctx=canvas.getContext('2d');
const configured=Boolean(wallConfig.supabaseUrl&&wallConfig.publishableKey);
const api=`${wallConfig.supabaseUrl}/functions/v1/graffiti-wall`;
const background=document.createElement('canvas');background.width=1200;background.height=800;const backgroundCtx=background.getContext('2d');bricks(backgroundCtx);
const draftKey='kwl-wall-draft-v2',sessionKey='kwl-wall-visitor-v1';
let tool='spray',color='#ff7ab8',active=null,posting=false,feedBusy=false,refreshAgain=false,reportId=null,next=null,etag=null,posts=[],viewingOlder=false;
let draft={id:crypto.randomUUID(),v:1,strokes:[]},session=null;
try{const saved=JSON.parse(localStorage.getItem(draftKey)||'null');if(saved?.v===1&&Array.isArray(saved.strokes))draft=saved;session=JSON.parse(localStorage.getItem(sessionKey)||'null');}catch{}
const say=text=>{$('notice').textContent=text;};
function redraw(){ctx.clearRect(0,0,1200,800);ctx.drawImage(background,0,0);renderDrawing(ctx,draft);}
function save(){try{localStorage.setItem(draftKey,JSON.stringify(draft));}catch{say('This browser cannot save your draft after closing. Keep this page open until you publish.');}$('send').disabled=posting||!configured||!draft.strokes.length;}
function mutate(){draft.id=crypto.randomUUID();save();redraw();}
const point=e=>{const b=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1200,Math.round((e.clientX-b.left)/b.width*12000)/10)),Math.max(0,Math.min(800,Math.round((e.clientY-b.top)/b.height*8000)/10))];};
const points=()=>draft.strokes.reduce((n,s)=>n+s.points.length,0);
function begin(p){
  if(posting||draft.strokes.length>=100||points()>=2000){say('This drawing is full. Publish it, then start another.');return;}
  const random=new Uint32Array(1);crypto.getRandomValues(random);active={tool,color,seed:random[0],points:[p]};draft.strokes.push(active);mutate();
}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||posting)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);begin(point(e));if(tool==='sticker')active=null;});
canvas.addEventListener('pointermove',e=>{if(!active||posting)return;const p=point(e),last=active.points.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])<5)return;if(points()>=2000){active=null;say('Your drawing is full. It’s ready to publish.');return;}active.points.push(p);mutate();});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>{active=null;save();});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;document.querySelectorAll('[data-color]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
$('undo').onclick=()=>{if(!posting){draft.strokes.pop();mutate();}};
$('clear').onclick=()=>{if(!posting){draft.strokes=[];mutate();say('Your draft is clear. Everyone else’s drawings are unchanged.');}};
$('heart').onclick=()=>{if(posting)return;const previous=tool;tool='sticker';begin([600,400]);active=null;tool=previous;};
try{const old=localStorage.getItem('kwl-wall');if(old?.startsWith('data:image/')){$('legacy-image').src=old;$('legacy').hidden=false;}}catch{}
async function auth(){
  if(session?.access_token&&session.expires_at>Date.now()/1000+60)return session.access_token;
  const headers={apikey:wallConfig.publishableKey,'Content-Type':'application/json'};
  let response;
  if(session?.refresh_token){response=await fetch(`${wallConfig.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers,body:JSON.stringify({refresh_token:session.refresh_token}),signal:AbortSignal.timeout(12000)});if(!response.ok)session=null;}
  if(!session)response=await fetch(`${wallConfig.supabaseUrl}/auth/v1/signup`,{method:'POST',headers,body:JSON.stringify({data:{wall_visitor:true}}),signal:AbortSignal.timeout(12000)});
  const data=await response.json();if(!response.ok||!data.access_token)throw new Error(response.status===429?'Visitor limit reached. Please try again later.':'Anonymous visitors are not enabled yet. Please try again later.');
  session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Date.now()/1000+data.expires_in};
  try{localStorage.setItem(sessionKey,JSON.stringify(session));}catch{}
  return session.access_token;
}
async function write(body){
  const token=await auth(),response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(!response.ok){if(response.status===401){session=null;try{localStorage.removeItem(sessionKey);}catch{}}throw new Error(data.error||'Couldn’t save. Your drawing is still here.');}return data;
}
function gallery(){
  const cards=posts.map(p=>{const card=document.createElement('article');card.className='drawing';card.dataset.postId=p.id;
    const art=document.createElement('canvas');art.width=360;art.height=240;art.setAttribute('aria-label',`Drawing by ${p.name}`);const c=art.getContext('2d');c.scale(.3,.3);bricks(c);renderDrawing(c,p.drawing);
    const name=document.createElement('p');name.textContent=p.name;const time=document.createElement('time');time.dateTime=p.created_at;time.textContent=new Date(p.created_at).toLocaleString();
    const report=document.createElement('button');report.type='button';report.textContent='Report drawing';report.setAttribute('aria-label',`Report drawing by ${p.name}`);report.onclick=()=>{reportId=p.id;$('report-notice').textContent='';$('report-dialog').showModal();};
    card.append(art,name,time,report);return card;
  });bricks(backgroundCtx);for(const p of [...posts].reverse())renderDrawing(backgroundCtx,p.drawing);$('gallery').replaceChildren(...cards);$('feed-state').textContent=posts.length?`${posts.length} shared drawing${posts.length===1?'':'s'} shown.`:'The wall is waiting for its first drawing. ♡';$('more').hidden=!next;redraw();
}
async function load(older=false){
  if(!configured){$('connection').textContent='Shared saving is being connected. Drawing still works here.';$('feed-state').textContent='Shared drawings will appear once the backend is connected.';return;}
  if(feedBusy){if(!older)refreshAgain=true;return;}feedBusy=true;$('refresh').disabled=true;$('more').disabled=true;
  try{
    const headers={};if(!older&&etag)headers['If-None-Match']=etag;
    const response=await fetch(api+(older&&next?`?before=${encodeURIComponent(next)}`:''),{headers,signal:AbortSignal.timeout(15000)});
    if(response.status!==304){const data=await response.json();if(!response.ok)throw new Error(data.error);if(!older)etag=response.headers.get('etag');posts=data.posts;viewingOlder=older;next=data.next;gallery();}
    $('connection').textContent='Connected · published drawings are shared with everyone.';
  }catch{$('connection').textContent='Can’t reach the shared wall. Your draft is safe here.';$('feed-state').textContent='Try Refresh wall to reconnect.';}
  finally{feedBusy=false;$('refresh').disabled=false;$('more').disabled=false;if(refreshAgain){refreshAgain=false;queueMicrotask(()=>load());}}
}
$('refresh').onclick=()=>{etag=null;load();};$('more').onclick=()=>load(true);
$('publish-form').onsubmit=async e=>{
  e.preventDefault();if(posting||!configured||!draft.strokes.length)return;active=null;posting=true;save();$('send').textContent='Publishing…';say('Saving your drawing to the shared wall…');
  try{await write({action:'submit',clientId:draft.id,name:$('name').value.trim(),drawing:{v:1,strokes:draft.strokes}});draft={id:crypto.randomUUID(),v:1,strokes:[]};etag=null;await load();say('Published! Your drawing is now shared with everyone.');}
  catch(error){say(error.message||'Couldn’t save. Your drawing is still here; try again.');}
  finally{posting=false;$('send').textContent='Publish my drawing';save();redraw();}
};
$('cancel-report').onclick=()=>$('report-dialog').close();
$('report-form').onsubmit=async e=>{e.preventDefault();const b=$('report-form').querySelector('button[type=submit]');b.disabled=true;$('report-notice').textContent='Sending report…';try{const data=await write({action:'report',postId:reportId,reason:$('reason').value});posts=posts.filter(p=>p.id!==reportId);gallery();say('Report received. Katie can review it.');$('report-dialog').close();}catch(error){$('report-notice').textContent=error.message;}finally{b.disabled=false;}};
redraw();save();load();setInterval(()=>{if(!document.hidden&&!viewingOlder)load();},60000);
