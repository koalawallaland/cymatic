// Supabase Edge Function: shared-keycaps. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in deployment.
const cors={'Access-Control-Allow-Origin':'https://koalawallaland.github.io','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'content-type','Content-Type':'application/json','Cache-Control':'no-store'};
const json=(status,value)=>new Response(JSON.stringify(value),{status,headers:cors});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.headers.get('origin') && req.headers.get('origin')!=='https://koalawallaland.github.io')return json(403,{error:'Origin denied'});
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return json(503,{error:'Gallery not configured'});
 const rpc=async(name,body)=>{const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error('Database unavailable');return r.json()};
 try{
 if(req.method==='GET')return json(200,{caps:await rpc('keycap_feed',{})});
 if(req.method!=='POST')return json(405,{error:'Method not allowed'});
 if(Number(req.headers.get('content-length'))>100000)return json(413,{error:'Image too large'});
 const body=await req.text();if(body.length>100000)return json(413,{error:'Image too large'});
 const b=JSON.parse(body);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>60||typeof b.img!=='string'||b.img.length>90000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(b.img))return json(400,{error:'Invalid cap'});
 return json(200,await rpc('keycap_submit',{p_client:b.id,p_name:b.name.trim(),p_image:b.img}));
 }catch{return json(503,{error:'Gallery unavailable; local saves remain safe'})}
});
