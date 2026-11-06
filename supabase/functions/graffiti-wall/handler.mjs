const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLORS=new Set(['#ff7ab8','#58d8f5','#d8ff3e','#ffffff','#b78cff']);
const REASONS=new Set(['abuse','personal','spam','other']);
export function validateDrawing(value){
  if(!value||value.v!==1||!Array.isArray(value.strokes)||!value.strokes.length||value.strokes.length>100)throw new Error('Add a drawing with up to 100 strokes.');
  let count=0;
  const strokes=value.strokes.map(s=>{
    if(!s||!['spray','marker','sticker'].includes(s.tool)||!COLORS.has(s.color)||!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295||!Array.isArray(s.points)||!s.points.length)throw new Error('Invalid drawing stroke.');
    count+=s.points.length;if(count>2000)throw new Error('This drawing is full. Send it, then start another.');
    const points=s.points.map(p=>{if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>1200||p[1]<0||p[1]>800)throw new Error('Invalid drawing position.');return p.map(n=>Math.round(n*10)/10);});
    return {tool:s.tool,color:s.color,seed:s.seed,points};
  });
  const drawing={v:1,strokes};if(new TextEncoder().encode(JSON.stringify(drawing)).length>42000)throw new Error('This drawing is too large.');return drawing;
}
async function readJSON(req){
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Error('Send a JSON drawing.');
  const reader=req.body?.getReader();if(!reader)throw new Error('Missing drawing.');
  const chunks=[];let length=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>48000){await reader.cancel();throw new Error('Drawing is too large.');}chunks.push(value);}}finally{reader.releaseLock();}
  const data=new Uint8Array(length);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(data));
}
export function createHandler({url,serviceKey,anonKey,origins=['https://koalawallaland.github.io'],fetcher=fetch}){
  return async req=>{
    const origin=req.headers.get('origin');const allowed=!origin||origins.includes(origin);
    const headers={'Content-Type':'application/json','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
    if(allowed&&origin)headers['Access-Control-Allow-Origin']=origin;
    headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';headers['Access-Control-Allow-Headers']='authorization, content-type, if-none-match';
    const answer=(status,data,extra={})=>new Response(data===null?null:JSON.stringify(data),{status,headers:{...headers,...extra}});
    if(!allowed)return answer(403,{error:'Origin not allowed.'});
    if(req.method==='OPTIONS')return answer(204,null,{'Access-Control-Max-Age':'3600'});
    if(!url||!serviceKey||!anonKey)return answer(503,{error:'The shared wall is not configured yet.'});
    const rpc=async(name,args)=>{
      const response=await fetcher(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:serviceKey,...(serviceKey.startsWith('eyJ')?{Authorization:`Bearer ${serviceKey}`}:{ }),'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error('Database unavailable');return response.json();
    };
    try{
      if(req.method==='GET'){
        const params=new URL(req.url).searchParams;let beforeTime=null,beforeId=null;
        if(params.has('before')){const cursor=params.get('before').split('|');if(cursor.length!==2||!UUID.test(cursor[1])||!Number.isFinite(Date.parse(cursor[0])))return answer(400,{error:'Invalid page.'});[beforeTime,beforeId]=cursor;}
        const all=await rpc('wall_feed',{p_before_time:beforeTime,p_before_id:beforeId});
        const posts=all.slice(0,24),last=posts.at(-1),data={posts,next:all.length>24?`${last.created_at}|${last.id}`:null};
        const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data)));
        const etag='"'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')+'"';
        if(req.headers.get('if-none-match')===etag)return answer(304,null,{ETag:etag});
        return answer(200,data,{ETag:etag,'Access-Control-Expose-Headers':'ETag'});
      }
      if(req.method!=='POST')return answer(405,{error:'Method not allowed.'},{Allow:'GET, POST, OPTIONS'});
      const token=req.headers.get('authorization');if(!token?.startsWith('Bearer ')||token.length>6000)return answer(401,{error:'Please reconnect to the wall.'});
      const auth=await fetcher(`${url}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:token},signal:AbortSignal.timeout(8000)});
      if(!auth.ok)return answer(401,{error:'Please reconnect to the wall.'});
      const user=await auth.json();if(!UUID.test(user.id))return answer(401,{error:'Invalid visitor.'});
      let body;try{body=await readJSON(req);}catch(e){return answer(400,{error:e.message});}
      if(!body||typeof body!=='object'||Array.isArray(body))return answer(400,{error:'Invalid request.'});
      let result;
      if(body.action==='submit'){
        let drawing;try{drawing=validateDrawing(body.drawing);}catch(e){return answer(400,{error:e.message});}
        const name=typeof body.name==='string'?body.name.trim():'';
        if(!UUID.test(body.clientId)||!name||name.length>24||/[<>@]|https?:|www\./i.test(name))return answer(400,{error:'Use a short name without links or contact details.'});
        result=await rpc('wall_submit',{p_author:user.id,p_client:body.clientId,p_name:name,p_drawing:drawing});
      }else if(body.action==='report'){
        if(!UUID.test(body.postId)||!REASONS.has(body.reason))return answer(400,{error:'Invalid report.'});
        result=await rpc('wall_report',{p_reporter:user.id,p_post:body.postId,p_reason:body.reason});
      }else return answer(400,{error:'Unknown action.'});
      if(!result.ok)return answer(result.status||400,{error:result.error},result.status===429?{'Retry-After':'600'}:{});
      return answer(200,result);
    }catch{return answer(503,{error:'The shared wall is taking a break. Your drawing is still saved here.'});}
  };
}
