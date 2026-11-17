const panel=document.querySelector('#desk-vibrations');
if(panel){
const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d'),status=panel.querySelector('[data-vibe-status]');
const bounds={west:-120.8,east:-115.2,south:32.0,north:36.3};
const xy=(lon,lat)=>[(lon-bounds.west)/(bounds.east-bounds.west)*canvas.width,(bounds.north-lat)/(bounds.north-bounds.south)*canvas.height];
function base(){
ctx.clearRect(0,0,canvas.width,canvas.height);
ctx.fillStyle='#0a151b';ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.strokeStyle='#28515a';ctx.lineWidth=.6;
for(let x=0;x<canvas.width;x+=26){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
for(let y=0;y<canvas.height;y+=26){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
ctx.fillStyle='#b5e7db';ctx.font='9px monospace';
for(const [name,lon,lat] of [['LA',-118.2437,34.0522],['SD',-117.1611,32.7157],['HD',-117.3242,34.7439],['WW',-117.6334,34.3608]]){const [x,y]=xy(lon,lat);ctx.fillStyle='#e2e9e3';ctx.fillRect(x-1,y-1,3,3);ctx.fillStyle='#b5e7db';ctx.fillText(name,x+4,y-4);}
}
async function refresh(){
base();status.textContent='Fetching recent USGS earthquakes…';
try{
const url='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error('Unavailable');
const data=await res.json();
const events=data.features.filter(f=>{const [lon,lat]=f.geometry.coordinates;return lon>=bounds.west&&lon<=bounds.east&&lat>=bounds.south&&lat<=bounds.north;});
events.forEach(f=>{const [lon,lat]=f.geometry.coordinates,[x,y]=xy(lon,lat),m=Math.max(0,Number(f.properties.mag)||0);ctx.beginPath();ctx.arc(x,y,Math.max(2,2+m*2.2),0,Math.PI*2);ctx.fillStyle=m>=3?'#ff947c':'#c4f7b2';ctx.globalAlpha=.75;ctx.fill();ctx.globalAlpha=1;});
status.textContent=events.length+' reported earthquakes · past 24h · updated '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
}catch(e){status.textContent='USGS feed unavailable · retry later';}
}
panel.querySelector('button').addEventListener('click',refresh);
refresh();setInterval(()=>{if(!document.hidden)refresh()},300000);
}
