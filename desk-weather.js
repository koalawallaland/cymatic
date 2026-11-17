const root=document.querySelector('#desk-weather');
if(root){
const status=root.querySelector('[data-weather-status]');
const metrics=root.querySelector('[data-weather-metrics]');
const places={beverly:{name:'Beverly Hills',lat:34.0736,lon:-118.4004},helendale:{name:'Helendale',lat:34.7439,lon:-117.3242},wrightwood:{name:'Wrightwood',lat:34.3608,lon:-117.6334},sandiego:{name:'San Diego',lat:32.7157,lon:-117.1611}};
const select=root.querySelector('select');
const compass=d=>['N','NE','E','SE','S','SW','W','NW'][Math.round(d/45)%8];
async function refresh(){
const place=places[select.value]||places.beverly;
status.textContent='Reading weather station model…';
try{
const url=new URL('https://api.open-meteo.com/v1/forecast');
Object.entries({latitude:place.lat,longitude:place.lon,current:'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,weather_code',hourly:'wind_speed_10m,wind_gusts_10m',temperature_unit:'fahrenheit',wind_speed_unit:'mph',timezone:'America/Los_Angeles',forecast_days:1}).forEach(([k,v])=>url.searchParams.set(k,v));
const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
if(!res.ok)throw Error('Weather service unavailable');
const data=await res.json();const w=data.current;
const fmt=v=>Number.isFinite(v)?Math.round(v):'—';
metrics.replaceChildren();
for(const [label,value] of [['Temperature',fmt(w.temperature_2m)+'°F'],['Wind',fmt(w.wind_speed_10m)+' mph '+compass(w.wind_direction_10m)],['Gusts',fmt(w.wind_gusts_10m)+' mph'],['Humidity',fmt(w.relative_humidity_2m)+'%'],['Pressure',fmt(w.surface_pressure)+' hPa'],['Feels like',fmt(w.apparent_temperature)+'°F']]){
const item=document.createElement('span');item.textContent=label+': '+value;metrics.append(item);
}
const observed=new Date(w.time).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
status.textContent=place.name+' · model time '+observed+' · updated every 5 min';
root.querySelector('[data-wind-note]').textContent=(w.wind_direction_10m>=25&&w.wind_direction_10m<=135)?'Easterly component detected; direction alone does not confirm a Santa Ana event.':'Wind direction does not currently indicate a classic easterly Santa Ana flow at this point.';
}catch(err){status.textContent='Live weather unavailable. Try again or use the NWS link.';metrics.replaceChildren();root.querySelector('[data-wind-note]').textContent='';}
}
select.addEventListener('change',refresh);root.querySelector('[data-weather-refresh]').addEventListener('click',refresh);
refresh();setInterval(()=>{if(!document.hidden)refresh()},300000);
}
