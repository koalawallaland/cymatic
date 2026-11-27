import {wallConfig} from '../wall/config.js';
const endpoint=wallConfig.supabaseUrl+'/functions/v1/community-keycaps',sessionKey='kwl-wall-visitor-v1',localKey='kwl-community-caps-v1';
const texturePattern=/^[0-9a-f]{192}$/,uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
let session=read(sessionKey,null),authPromise=null;
export const validCast=c=>c&&typeof c.id==='string'&&typeof c.texture==='string'&&uuidPattern.test(c.id)&&texturePattern.test(c.texture);
export const castLabel=c=>'Shared cast '+c.id.slice(0,6).toUpperCase();
export const privateCasts=()=>{const x=read('kwl-caps',[]);return Array.isArray(x)?x.filter(c=>c&&typeof c.img==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(c.img)).slice(0,12):[]};
export const savedCopies=()=>{const x=read(localKey,[]);return Array.isArray(x)?x.filter(validCast).slice(0,12):[]};
export function keepCopy(c){if(!validCast(c))return false;const list=savedCopies().filter(x=>x.id!==c.id);if(list.length>=12)return false;return write(localKey,[{id:c.id,texture:c.texture},...list]);}
export const hasSession=()=>!!(session||read(sessionKey,null));
async function authenticate(create=true){
 if(authPromise)return authPromise;
 authPromise=(async()=>{session=read(sessionKey,session);
 if(session?.access_token&&session.expires_at>Date.now()/1000+60)return session.access_token;
 const headers={apikey:wallConfig.publishableKey,'Content-Type':'application/json'};let r;
 if(session?.refresh_token){r=await fetch(wallConfig.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers,body:JSON.stringify({refresh_token:session.refresh_token}),signal:AbortSignal.timeout(12000)});if(!r.ok)session=null;}
 if(!session){if(!create)throw Error('No active visitor session.');r=await fetch(wallConfig.supabaseUrl+'/auth/v1/signup',{method:'POST',headers,body:JSON.stringify({data:{wall_visitor:true}}),signal:AbortSignal.timeout(12000)});}
 const data=await r.json();if(!r.ok||!data.access_token)throw Error(r.status===429?'Visitor limit reached. Try again later.':'Unable to connect your visitor session.');
 session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Date.now()/1000+data.expires_in};write(sessionKey,session);return session.access_token;
 })();try{return await authPromise}finally{authPromise=null}
}
export async function feed(before){const r=await fetch(endpoint+(before?'?before='+encodeURIComponent(before):''),{signal:AbortSignal.timeout(15000),cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Community tray unavailable.');return {caps:(Array.isArray(d.caps)?d.caps:[]).filter(validCast),next:d.next||null};}
export async function action(body,create=true){const token=await authenticate(create),r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)}),d=await r.json();if(!r.ok){if(r.status===401){session=null;try{localStorage.removeItem(sessionKey)}catch{}}throw Error(d.error||'Unable to save.');}return d;}
export async function sampleCast(source){
 if(typeof source!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(source))throw Error('Invalid local cast.');
 const img=new Image();img.src=source;await img.decode();const c=document.createElement('canvas');c.width=c.height=8;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#332238';g.fillRect(0,0,8,8);g.drawImage(img,0,0,8,8);const p=g.getImageData(0,0,8,8).data;let hex='';for(let i=0;i<p.length;i+=4){for(let j=0;j<3;j++)hex+=Math.round(p[i+j]/17).toString(16)}return hex;
}
export function textureURL(texture){
 if(!texturePattern.test(texture))throw Error('Invalid texture');const small=document.createElement('canvas');small.width=small.height=8;const s=small.getContext('2d');for(let i=0;i<64;i++){const h=texture.slice(i*3,i*3+3);s.fillStyle='#'+h;s.fillRect(i%8,Math.floor(i/8),1,1)}
 const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(small,0,0,96,96);return c.toDataURL('image/png');
}
