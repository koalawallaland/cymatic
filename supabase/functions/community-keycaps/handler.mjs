const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validTexture=x=>typeof x==='string'&&/^[0-9a-f]{192}$/.test(x);
async function bodyJSON(req){
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw Error('Expected JSON.');
 const reader=req.body?.getReader();if(!reader)throw Error('Missing request.');
 let chunks=[],size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();throw Error('Request too large.');}chunks.push(value)}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let i=0;for(const c of chunks){bytes.set(c,i);i+=c.length;}const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid request.');return value;
}
export function createHandler({url,serviceKey,anonKey,fetcher=fetch,origins=['https://koalawallaland.github.io']}){
 return async req=>{
 const origin=req.headers.get('origin'),allowed=!origin||origins.includes(origin),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'authorization, content-type'};
 if(allowed&&origin)headers['Access-Control-Allow-Origin']=origin;
 const answer=(status,data,extra={})=>new Response(data===null?null:JSON.stringify(data),{status,headers:{...headers,...extra}});
 if(!allowed)return answer(403,{error:'Origin not allowed.'});
 if(req.method==='OPTIONS')return answer(204,null,{'Access-Control-Max-Age':'3600'});
 if(!url||!serviceKey||!anonKey)return answer(503,{error:'Community tray unavailable.'});
 const rpc=async(name,args)=>{const r=await fetcher(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:serviceKey,...(serviceKey.startsWith('eyJ')?{Authorization:'Bearer '+serviceKey}:{}),'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Database unavailable.');return r.json()};
 try{
 if(req.method==='GET'){
  const raw=new URL(req.url).searchParams.get('before');let time=null,id=null;
  if(raw!==null){const a=raw.split('|');if(a.length!==2||!UUID.test(a[1])||!Number.isFinite(Date.parse(a[0])))return answer(400,{error:'Invalid page.'});[time,id]=a;}
  const all=await rpc('keycap_feed',{p_before_time:time,p_before_id:id}),caps=all.slice(0,24),last=caps.at(-1);
  return answer(200,{caps,next:all.length>24?last.created_at+'|'+last.id:null});
 }
 if(req.method!=='POST')return answer(405,{error:'Method not allowed.'});
 const token=req.headers.get('authorization');if(!token?.startsWith('Bearer ')||token.length>6000)return answer(401,{error:'Reconnect before sharing.'});
 const a=await fetcher(url+'/auth/v1/user',{headers:{apikey:anonKey,Authorization:token},signal:AbortSignal.timeout(8000)});if(!a.ok)return answer(401,{error:'Reconnect before sharing.'});const user=await a.json();if(!UUID.test(user.id))return answer(401,{error:'Invalid visitor.'});
 let body;try{body=await bodyJSON(req)}catch(e){return answer(400,{error:e.message});}
 let result;
 if(body.action==='submit'){if(!validTexture(body.texture)||Object.keys(body).some(k=>!['action','texture'].includes(k)))return answer(400,{error:'Only a bounded cast texture can be shared.'});result=await rpc('keycap_submit',{p_author:user.id,p_texture:body.texture});}
 else if(body.action==='mine'){return answer(200,{caps:await rpc('keycap_mine',{p_author:user.id})});}
 else if(body.action==='withdraw'||body.action==='report'){if(!UUID.test(body.id))return answer(400,{error:'Invalid cast.'});result=await rpc(body.action==='withdraw'?'keycap_withdraw':'keycap_report',body.action==='withdraw'?{p_author:user.id,p_id:body.id}:{p_reporter:user.id,p_id:body.id});}
 else return answer(400,{error:'Unknown action.'});
 if(!result?.ok)return answer(result?.status||400,{error:result?.error||'Request failed.'});
 return answer(200,result);
 }catch{return answer(503,{error:'The shared tray is temporarily unavailable. Your local casts are unchanged.'});}
 };
}
