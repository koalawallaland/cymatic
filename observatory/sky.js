// Cymatic Studio · Listening Sky. No microphone, tracking or background geolocation.
const $ = (id) => document.getElementById(id);
const RAD=Math.PI/180, DEG=180/Math.PI, R=6371000;
const places={
  beverly:{name:"Beverly Hills",lat:34.0736,lon:-118.4004,elevation:90},
  helendale:{name:"Helendale",lat:34.7439,lon:-117.3248,elevation:750},
  wrightwood:{name:"Wrightwood",lat:34.3608,lon:-117.6334,elevation:1820},
  sandiego:{name:"San Diego",lat:32.7157,lon:-117.1611,elevation:20}
};
const softStorage={
  read(key,fallback){try{const s=localStorage.getItem(key);return s?JSON.parse(s):fallback}catch{return fallback}},
  save(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch{/* local storage optional */}}
};
const state={
  site:"beverly",geo:places.beverly,planets:[],satellites:[],aircraft:[],tle:[],records:[],
  satelliteModule:null,astronomyModule:null,satMeta:null,flightMeta:null,flightFeed:null,
  drawObjects:[],pendingPin:null,logMode:false,lastFetch:0,
  layers:{planets:true,satellites:true,aircraft:true,anomalies:true}
};
const layerIds={planets:"togglePlanets",satellites:"toggleSatellites",aircraft:"toggleAircraft",anomalies:"toggleAnomalies"};
const colors={planets:"#ffe6a5",satellites:"#9aece5",aircraft:"#a5c5ff",anomalies:"#ffa0d9"};
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas=$("sky"),ctx=canvas.getContext("2d");
let metrics={w:0,h:0,cx:0,cy:0,r:0};

function status(id,label,detail){const x=$(id);x.replaceChildren();const b=document.createElement("strong");b.textContent=label;x.append(b,document.createTextNode(detail))}
function formatTime(d){if(!d||!Number.isFinite(new Date(d).getTime()))return "unknown";return new Date(d).toLocaleString(undefined,{dateStyle:"short",timeStyle:"medium"})}
function ageMs(iso){const n=new Date(iso).getTime();return Number.isFinite(n)?Math.max(0,Date.now()-n):Infinity}
function ageLabel(iso){const t=ageMs(iso);if(!Number.isFinite(t))return "unavailable";if(t<60000)return Math.round(t/1000)+" sec ago";if(t<3600000)return Math.floor(t/60000)+" min ago";return Math.floor(t/3600000)+" hr ago"}
function currentSite(){return state.site==="custom"?state.geo:places[state.site]}
function clamp(x,a,b){return Math.min(b,Math.max(a,x))}
function normalizeAz(v){return ((v%360)+360)%360}
function angularDistance(a,b){const u=a.alt*RAD,v=b.alt*RAD;return Math.acos(clamp(Math.sin(u)*Math.sin(v)+Math.cos(u)*Math.cos(v)*Math.cos((a.az-b.az)*RAD),-1,1))*DEG}

function startLocation(){
 const saved=softStorage.read("cymatic_sky_location",null);
 if(saved && (places[saved.site]||saved.site==="custom"&&Number.isFinite(saved.lat)&&Number.isFinite(saved.lon)&&Math.abs(saved.lat)<=90&&Math.abs(saved.lon)<=180)){
   state.site=saved.site;
   state.geo=places[saved.site]||{name:"Custom coordinates",lat:saved.lat,lon:saved.lon,elevation:0};
 }
 $("location").value=state.site;
 $("latitude").value=state.geo.lat;
 $("longitude").value=state.geo.lon;
 $("customControls").hidden=state.site!=="custom";
 $("location").addEventListener("change",()=>{
   const v=$("location").value; state.site=v;
   if(v!=="custom")state.geo=places[v];
   else state.geo={name:"Custom coordinates",lat:Number($("latitude").value),lon:Number($("longitude").value),elevation:0};
   applyPlace();
 });
 $("applyLocation").addEventListener("click",()=>{
   const lat=Number($("latitude").value),lon=Number($("longitude").value);
   if(!$("latitude").value||!$("longitude").value||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){
     status("flightStatus","Coordinates","Enter valid latitude −90 to 90 and longitude −180 to 180");return;
   }
   state.site="custom";state.geo={name:"Custom coordinates",lat,lon,elevation:0};applyPlace();
 });
 $("useLocation").addEventListener("click",()=>{
   if(!navigator.geolocation){status("flightStatus","Device location","Not supported by this browser");return}
   navigator.geolocation.getCurrentPosition(({coords})=>{
      state.site="custom";$("location").value="custom";$("latitude").value=coords.latitude.toFixed(5);$("longitude").value=coords.longitude.toFixed(5);
      state.geo={name:"Device position",lat:coords.latitude,lon:coords.longitude,elevation:Number.isFinite(coords.altitude)?coords.altitude:0};applyPlace();
   },()=>status("flightStatus","Device location","Permission denied or position unavailable"),{enableHighAccuracy:false,timeout:10000});
 });
 function applyPlace(){
   $("location").value=state.site;$("customControls").hidden=state.site!=="custom";
   softStorage.save("cymatic_sky_location",{site:state.site,lat:state.geo.lat,lon:state.geo.lon});
   state.drawObjects=[];state.pendingPin=null;state.logMode=false;state.aircraft=[];
   updatePositions();renderLog();refresh(true);
 }
}
function setupToggles(){
 state.layers={...state.layers,...softStorage.read("cymatic_sky_layers",{})};
 for(const [name,id] of Object.entries(layerIds)){
  $(id).checked=state.layers[name]!==false;
  state.layers[name]=$(id).checked;
  $(id).addEventListener("change",()=>{state.layers[name]=$(id).checked;softStorage.save("cymatic_sky_layers",state.layers);paint();renderLog()});
 }
}
function computePlanets(){
 const A=state.astronomyModule;if(!A)return;
 const obs=new A.Observer(state.geo.lat,state.geo.lon,state.geo.elevation||0), now=new Date();
 const names=["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune"];
 state.planets=[];
 for(const name of names)try{
  const eq=A.Equator(A.Body[name],now,obs,true,true);
  const pos=A.Horizon(now,obs,eq.ra,eq.dec,"normal");
  if(pos.altitude>0)state.planets.push({kind:"planets",name,az:normalizeAz(pos.azimuth),alt:pos.altitude,source:"Astronomy Engine · computed",time:now.toISOString()});
 }catch(err){console.warn("Planet computation",name,err)}
 status("planetStatus","Planets",state.planets.length+" above horizon · calculated now");
}
function parseTle(tle){
 const S=state.satelliteModule;if(!S)return[];
 const rows=tle.split(/\r?\n/).map(s=>s.trimEnd()).filter(Boolean),out=[],seen=new Set();
 for(let i=0;i<rows.length-1;i++)if(rows[i].startsWith("1 ")&&rows[i+1].startsWith("2 ")){
  try{const sat=S.twoline2satrec(rows[i],rows[i+1]),id=rows[i].slice(2,7).trim();
   if(!seen.has(id)&&sat.error===0){out.push({sat,name:rows[i-1]?.startsWith("0 ")?rows[i-1].slice(2).trim():(rows[i-1]?.startsWith("1 ")?id:rows[i-1]||id),id});seen.add(id)}
  }catch{/* skip invalid TLE */}i++;
 }
 return out;
}
function computeSatellites(){
 const S=state.satelliteModule;
 state.satellites=[];
 if(!S||!state.tle.length)return;
 const date=new Date(),gmst=S.gstime(date);
 const observer={latitude:state.geo.lat*RAD,longitude:state.geo.lon*RAD,height:(state.geo.elevation||0)/1000};
 for(const item of state.tle){
  try{const propagated=S.propagate(item.sat,date);if(!propagated.position||!Number.isFinite(propagated.position.x))continue;
   const ecf=S.eciToEcf(propagated.position,gmst),look=S.ecfToLookAngles(observer,ecf);
   if(look.elevation>0)state.satellites.push({kind:"satellites",name:item.name,id:item.id,az:normalizeAz(look.azimuth*DEG),alt:look.elevation*DEG,range:look.rangeSat,source:"CelesTrak orbital elements · SGP4 predicted",time:date.toISOString()});
  }catch{/* outdated/decayed element */}
 }
 state.satellites.sort((a,b)=>b.alt-a.alt);
 const age=ageMs(state.satMeta?.fetchedAt);
 status("satelliteStatus","Satellites",state.satellites.length+" above horizon · orbital data "+ageLabel(state.satMeta?.fetchedAt)+(age>72*3600000?" (stale)":""));
}
function bearingAndAltitude(air,where){
 const lat1=where.lat*RAD,lat2=Number(air.lat)*RAD,dLat=(Number(air.lat)-where.lat)*RAD,dLon=(Number(air.lon)-where.lon)*RAD;
 if(!Number.isFinite(lat2)||!Number.isFinite(dLon))return null;
 const a=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
 const distance=2*R*Math.asin(clamp(Math.sqrt(a),0,1));
 const y=Math.sin(dLon)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
 const feet=Number(air.alt_geom??air.alt_baro);
 if(!Number.isFinite(feet)||distance>200000||Number(air.seen_pos||0)>60)return null;
 const height=feet*0.3048-(where.elevation||0)-distance*distance/(2*R);
 return {az:normalizeAz(Math.atan2(y,x)*DEG),alt:Math.atan2(height,Math.max(distance,1))*DEG,distance:Math.round(distance/1000)};
}
function computeAircraft(){
 state.aircraft=[];
 const feed=state.flightFeed,when=state.flightMeta?.fetchedAt;
 if(!feed||ageMs(when)>3*60000){
   status("flightStatus","Aircraft",feed?"Snapshot "+ageLabel(when)+" · old positions hidden":"Awaiting a usable feed");
   return;
 }
 for(const air of (feed.ac||[])){
   const p=bearingAndAltitude(air,state.geo);
   if(!p||p.alt<0)continue;
   const name=String(air.flight||air.r||air.hex||"Unknown aircraft").trim();
   state.aircraft.push({kind:"aircraft",name,az:p.az,alt:p.alt,distance:p.distance,id:String(air.hex||""),speed:air.gs,track:air.track,source:state.flightMeta.source||"ADS-B",time:when});
 }
 status("flightStatus","Aircraft",state.aircraft.length+" above horizon · "+ageLabel(when)+" ("+(state.flightMeta.source||"ADS-B")+")");
}
function updatePositions(){
 computePlanets();computeSatellites();computeAircraft();paint();
}
async function getJSON(url){
 const r=await fetch(url+(url.includes("?")?"&":"?")+"v="+Date.now(),{cache:"no-store"});
 if(!r.ok)throw Error("HTTP "+r.status);return r.json();
}
async function fetchSnapshots(){
 const [sat,meta,flights]=await Promise.allSettled([
   fetch("./data/visual.tle?v="+Date.now(),{cache:"no-store"}).then(r=>{if(!r.ok)throw Error(r.status);return r.text()}),
   getJSON("./data/satellites-meta.json"),getJSON("./data/aircraft.json")
 ]);
 if(meta.status==="fulfilled")state.satMeta=meta.value;
 if(sat.status==="fulfilled"&&sat.value.includes("\n1 ")){
   state.tle=parseTle(sat.value);
 }else if(!state.tle.length){state.tle=[];status("satelliteStatus","Satellites","No elements yet · awaiting scheduled sync")}
 const group=flights.status==="fulfilled" ? flights.value?.locations?.[state.site]:null;
 if(group?.ac && Array.isArray(group.ac)){
   state.flightFeed=group;state.flightMeta={source:(group.source||"ADS-B")+" snapshot",fetchedAt:group.fetchedAt};
 }else{state.flightFeed=null;state.flightMeta=null}
 return {satOk:state.tle.length>0,flightOk:!!state.flightFeed};
}
async function tryDirectSatellites(){
 if(state.tle.length)return;
 try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7500);
   let res;try{res=await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle",{signal:controller.signal})}finally{clearTimeout(timer)}
   if(!res.ok)throw Error("HTTP "+res.status);
   const t=await res.text();const parsed=parseTle(t);
   if(!parsed.length)throw Error("Empty satellite set");
   state.tle=parsed;state.satMeta={fetchedAt:new Date().toISOString()};
 }catch{if(!state.tle.length)status("satelliteStatus","Satellites","Feed blocked or unavailable; scheduled cache pending")}
}
async function tryDirectAircraft(){
 const where=state.geo,lat=where.lat.toFixed(4),lon=where.lon.toFixed(4);
 try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
   let res;try{res=await fetch("https://api.airplanes.live/v2/point/"+lat+"/"+lon+"/100",{signal:controller.signal,cache:"no-store"})}finally{clearTimeout(timer)}
   if(!res.ok)throw Error("HTTP "+res.status);
   const data=await res.json();
   if(!Array.isArray(data.ac))throw Error("No aircraft array");
   state.flightFeed={ac:data.ac};state.flightMeta={source:"Airplanes.live direct",fetchedAt:new Date((Number(data.now)||Date.now()/1000)*1000).toISOString()};
   return true;
 }catch{return false}
}
let fetching=false;
async function refresh(force=false){
 if(fetching||!force&&Date.now()-state.lastFetch<45000)return;
 fetching=true;state.lastFetch=Date.now();$("refresh").disabled=true;
 status("satelliteStatus","Satellites","Checking orbital feed…");status("flightStatus","Aircraft","Checking live aircraft…");
 const site=state.site;
 try{
   const snapshots=await fetchSnapshots();
   // A direct response takes priority; scheduled same-origin snapshots cover CORS-blocked services.
   const direct=await tryDirectAircraft();
   if(!direct&&!snapshots.flightOk)status("flightStatus","Aircraft",state.site==="custom"?"Direct feed unavailable for custom location":"No snapshot yet · sync pending");
   if(!snapshots.satOk)await tryDirectSatellites();
   if(site===state.site)updatePositions();
 }catch(err){console.warn("Observatory refresh",err);if(site===state.site)updatePositions()}
 finally{fetching=false;$("refresh").disabled=false}
}
function visibleRecords(){return state.records.filter(x=>x.site===state.site)}
function allObjects(){
 const result=[];
 for(const key of ["planets","satellites","aircraft"])if(state.layers[key])result.push(...state[key]);
 if(state.layers.anomalies)for(const s of visibleRecords())result.push({kind:"anomalies",name:"Echo · "+s.motion,az:s.az,alt:s.alt,source:"Private observer report",time:s.time,note:s.note,site:s.site,id:s.id,match:s.match});
 return result;
}
function resize(){
 const bounds=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
 const width=Math.round(bounds.width*dpr),height=Math.round(bounds.height*dpr);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
 ctx.setTransform(dpr,0,0,dpr,0,0);
 metrics={w:bounds.width,h:bounds.height,cx:bounds.width/2,cy:bounds.height/2,r:Math.min(bounds.width,bounds.height)*.42};
}
function project(az,alt){
 const {cx,cy,r}=metrics;const dist=(90-clamp(alt,0,90))*r/90,a=az*RAD;
 return{x:cx+Math.sin(a)*dist,y:cy-Math.cos(a)*dist};
}
function paint(){
 if(!ctx)return;
 resize();
 const {w,h,cx,cy,r}=metrics;
 ctx.clearRect(0,0,w,h);
 const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
 bg.addColorStop(0,"#282749");bg.addColorStop(.65,"#18192f");bg.addColorStop(1,"#0b1121");
 ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=bg;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle="#a783cbbb";ctx.stroke();
 for(const altitude of [30,60]){
  const rr=r*(90-altitude)/90;
  ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);ctx.strokeStyle="#bbaad32d";ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle="#bcb3d4";ctx.font='10px "Space Mono",monospace';ctx.fillText(altitude+"°",cx+8,cy-rr+14);
 }
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.sin(a)*r,cy-Math.cos(a)*r);
  ctx.strokeStyle=i%3===0?"#ccc1e75c":"#aaa2d127";ctx.stroke();
 }
 ctx.font='700 13px "Space Mono",monospace';ctx.fillStyle="#eee9ff";ctx.textAlign="center";
 for(const [label,az] of [["N",0],["E",90],["S",180],["W",270]]){const p=project(az,-9);ctx.fillText(label,p.x,p.y+4)}
 ctx.textAlign="left";
 const stamp=Date.now(),onScreen=[];
 for(const o of allObjects()){
  if(!Number.isFinite(o.az)||!Number.isFinite(o.alt)||o.alt<0)continue;
  const p=project(o.az,o.alt),color=colors[o.kind];
  const size=o.kind==="anomalies"?7:o.kind==="planets"?(["Sun","Moon"].includes(o.name)?6:4.5):o.kind==="aircraft"?4:3;
  ctx.save();ctx.shadowBlur=o.kind==="anomalies"?(reduced?10:18+Math.sin(stamp/550)*5):10;
  ctx.shadowColor=color;ctx.fillStyle=color;ctx.strokeStyle=color;
  if(o.kind==="aircraft"){
   ctx.translate(p.x,p.y);ctx.rotate((o.track??o.az)*RAD);ctx.beginPath();ctx.moveTo(0,-size-2);ctx.lineTo(size,size);ctx.lineTo(0,2);ctx.lineTo(-size,size);ctx.closePath();ctx.fill();
  }else{
   ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill();
   if(o.kind==="anomalies"){ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.stroke()}
  }
  ctx.restore();
  if(o.kind==="planets"||o.kind==="anomalies"||o.name.toUpperCase().includes("ISS")){
   ctx.fillStyle="#fbf2ff";ctx.font='10px "Space Mono",monospace';
   ctx.fillText(o.name,p.x+size+5,p.y-6);
  }
  onScreen.push({...o,x:p.x,y:p.y});
 }
 state.drawObjects=onScreen;
 $("skyClock").textContent=new Date().toLocaleTimeString()+" · "+state.geo.name+" · "+state.geo.lat.toFixed(2)+"°, "+state.geo.lon.toFixed(2)+"°";
}
function pointerPoint(e){
 const b=canvas.getBoundingClientRect();
 return{x:(e.clientX-b.left),y:(e.clientY-b.top)};
}
function pointToSky(p){
 const dx=p.x-metrics.cx,dy=p.y-metrics.cy,d=Math.hypot(dx,dy);
 if(d>metrics.r)return null;
 return {az:normalizeAz(Math.atan2(dx,-dy)*DEG),alt:clamp(90*(1-d/metrics.r),0,90)};
}
function inspector(obj){
 const container=$("inspector");container.replaceChildren();
 const fields=[["Type",obj.kind==="anomalies"?"Observer-reported · unclassified":obj.kind],
  ["Object",obj.name],["Azimuth",obj.az.toFixed(1)+"° clockwise from north"],["Altitude",obj.alt.toFixed(1)+"° above horizon"],
  ["Data time",formatTime(obj.time)],["Source",obj.source]];
 if(Number.isFinite(obj.range))fields.push(["Slant range",Math.round(obj.range)+" km"]);
 if(Number.isFinite(obj.distance))fields.push(["Ground distance",obj.distance+" km"]);
 if(obj.note)fields.push(["Description",obj.note]);
 if(obj.match)fields.push(["Possible match",obj.match]);
 const dl=document.createElement("dl");
 for(const [a,b] of fields){const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=a;dd.textContent=b;dl.append(dt,dd)}
 container.append(dl);
}
function closeLog(){state.logMode=false;state.pendingPin=null;canvas.style.cursor="crosshair";document.querySelector(".plot-hint").textContent="N ↑ · E → · edge = horizon · center = overhead"}
function startLog(){
 state.logMode=true;state.pendingPin=null;canvas.style.cursor="cell";
 document.querySelector(".plot-hint").textContent="✧ Click / tap the position of the sighting · Esc to cancel";
 canvas.scrollIntoView({behavior:reduced?"auto":"smooth",block:"center"});
}
function findMatch(spot){
 const candidates=[...state.planets,...state.satellites,...state.aircraft.filter(()=>ageMs(state.flightMeta?.fetchedAt)<120000)];
 let nearest=null,distance=Infinity;
 for(const o of candidates){const d=angularDistance(spot,o);if(d<distance){distance=d;nearest=o}}
 return nearest&&distance<=4?("Nearby "+nearest.kind.slice(0,-1)+": "+nearest.name+" ("+distance.toFixed(1)+"° angular separation; not confirmation)"):"No close match in available layers at recording time; coverage is incomplete";
}
function setupLog(){
 state.records=softStorage.read("cymatic_sky_reports_v1",[]).filter(x=>Number.isFinite(x.az)&&Number.isFinite(x.alt)&&typeof x.site==="string");
 $("log").addEventListener("click",startLog);
 canvas.addEventListener("click",e=>{
  const p=pointerPoint(e),pos=pointToSky(p);if(!pos)return;
  if(state.logMode){
   state.pendingPin=pos;
   $("chosenDirection").textContent=pos.az.toFixed(1)+"° azimuth · "+pos.alt.toFixed(1)+"° elevation · "+state.geo.name;
   if(typeof $("sightingDialog").showModal==="function")$("sightingDialog").showModal();
   else $("sightingDialog").setAttribute("open","");
   return;
  }
  let nearest=null,best=Infinity;
  for(const obj of state.drawObjects){
   const d=Math.hypot(obj.x-p.x,obj.y-p.y);
   if(d<best){best=d;nearest=obj}
  }
  if(nearest&&best<22)inspector(nearest);
 });
 $("cancelSighting").addEventListener("click",()=>{$("sightingDialog").close();closeLog()});
 $("sightingDialog").addEventListener("close",closeLog);
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&state.logMode&&!$("sightingDialog").open)closeLog()});
 $("sightingForm").addEventListener("submit",e=>{
   e.preventDefault();
   if(!state.pendingPin)return;
   const data=new FormData(e.currentTarget),note=String(data.get("note")||"").trim();
   if(!note)return;
   const record={id:crypto.randomUUID?.()||String(Date.now()),site:state.site,siteName:state.geo.name,latitude:state.geo.lat,longitude:state.geo.lon,
     az:state.pendingPin.az,alt:state.pendingPin.alt,note:note.slice(0,1200),motion:String(data.get("motion")),color:String(data.get("color")),
     time:new Date().toISOString(),match:findMatch(state.pendingPin)};
   state.records.unshift(record);softStorage.save("cymatic_sky_reports_v1",state.records);renderLog();paint();
   $("sightingDialog").close();e.currentTarget.reset();closeLog();inspector({...record,name:"Echo · "+record.motion,kind:"anomalies",source:"Private observer report"});
 });
 $("export").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify({format:"cymatic-sky-observations-v1",exportedAt:new Date().toISOString(),records:state.records},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="cymatic-sky-observations-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
}
function renderLog(){
 const list=$("sightings");list.replaceChildren();
 $("logEmpty").hidden=state.records.length>0;
 status("echoStatus","Echo",visibleRecords().length+" local records in "+state.geo.name);
 for(const rec of state.records.slice(0,40)){
  const li=document.createElement("li"),b=document.createElement("b"),s=document.createElement("small"),desc=document.createElement("div"),del=document.createElement("button");
  b.textContent="✧ "+rec.siteName+" · "+rec.motion;
  s.textContent=formatTime(rec.time)+" · "+rec.az.toFixed(0)+"° az / "+rec.alt.toFixed(0)+"° alt";
  desc.textContent=rec.note;
  del.type="button";del.textContent="Remove";del.setAttribute("aria-label","Remove observation from "+formatTime(rec.time));
  del.addEventListener("click",()=>{if(!confirm("Remove this local observation?"))return;state.records=state.records.filter(x=>x.id!==rec.id);softStorage.save("cymatic_sky_reports_v1",state.records);renderLog();paint()});
  li.append(del,b,s,desc);list.append(li);
 }
}
async function boot(){
 startLocation();setupToggles();setupLog();
 $("refresh").addEventListener("click",()=>refresh(true));
 const deps=await Promise.allSettled([
   import("https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/+esm"),
   import("https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/+esm")
 ]);
 if(deps[0].status==="fulfilled") {
   const pkg=deps[0].value;
   state.astronomyModule=pkg.Equator?pkg:(pkg.default?.Equator?pkg.default:null);
 }
 if(!state.astronomyModule)status("planetStatus","Planets","Calculation library unavailable (network)");
 if(deps[1].status==="fulfilled"){
   const pkg=deps[1].value;
   state.satelliteModule=pkg.twoline2satrec?pkg:(pkg.default?.twoline2satrec?pkg.default:null);
 }
 if(!state.satelliteModule)status("satelliteStatus","Satellites","Prediction library unavailable (network)");
 await refresh(true);updatePositions();
 if(!state.astronomyModule)status("planetStatus","Planets","Calculation module blocked");
 if(!state.satelliteModule)status("satelliteStatus","Satellites","Prediction module blocked");
 setInterval(()=>{updatePositions()},20000);
 setInterval(()=>{refresh()},120000);
 window.addEventListener("resize",paint,{passive:true});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden){updatePositions();refresh()}});
 if(!reduced)setInterval(()=>{if(!document.hidden&&state.layers.anomalies&&visibleRecords().length)paint()},150);
}
boot().catch(err=>{console.error(err);status("planetStatus","Observatory","Could not initialize; reload to retry")});
