import {colors,names,kinds,flows,fresh,title,describe,art} from './maker.js';
import {wallConfig} from '../../wall/config.js';
import {floor} from './tour.js';
const room=document.querySelector('#room');
const labels=['squishy','wax','slime'];
const fields=['kind','shape','pigment','finish','filling','accent','charm'];
const limits=[3,3,6,3,3,6,3];
const valid=r=>r&&fields.every((k,i)=>Number.isInteger(r[k])&&r[k]>=0&&r[k]<limits[i]);
const key=r=>fields.map(k=>r[k]).join('');
let shelf=[];try{shelf=JSON.parse(localStorage.getItem('sunnymoo-shelf-v1')||'[]').filter(valid)}catch{}
let visit=0,displays=[],drafts=new Map();
const api=wallConfig.supabaseUrl+'/rest/v1/sunnymoo_displays';
const headers={apikey:wallConfig.publishableKey,'Content-Type':'application/json'};
function clean(r){return Object.fromEntries(fields.map(k=>[k,r[k]]))}
function save(r){shelf=[clean(r),...shelf.filter(item=>key(item)!==key(r))].slice(0,80);try{localStorage.setItem('sunnymoo-shelf-v1',JSON.stringify(shelf));return true}catch{return false}}
function pulse(tray){tray.classList.remove('motion');void tray.offsetWidth;tray.classList.add('motion')}
function make(kind){
 const d=drafts.get(kind)||{r:fresh(kind),index:0,count:0};drafts.set(kind,d);
 const steps=flows[kind],s=steps[d.index],r=d.r;
 const goal=({fill:3,mould:2,cast:2,dip:r.finish+1,fold:3,activate:2})[s.art]||1;
 room.innerHTML='<h2>'+['Squishy studio','Wax cracking studio','Slime kitchen'][kind]+'</h2><div class="bench"><div class="tray">'+art(r,s.art,d.count)+'</div><article><p class="label">STEP '+(d.index+1)+' OF '+steps.length+'</p><h3>'+s.title+'</h3><p>'+s.hint+'</p><div class="choices"></div><div class="buttons"><button class="primary action">'+s.action+'</button>'+(d.index?'<button class="back">Back one step</button>':'')+'</div><p class="note" role="status"></p></article></div>';
 const choices=room.querySelector('.choices'),tray=room.querySelector('.tray');
 if(s.options)s.options.forEach((o,i)=>{const b=document.createElement('button');b.setAttribute('aria-pressed',r[s.key]===i);if(s.key==='pigment'||s.key==='accent')b.innerHTML='<span class="swatch" style="background:'+colors[i]+'"></span>';b.append(o);b.onclick=()=>{r[s.key]=i;d.count=0;make(kind);room.querySelectorAll('.choices button')[i].focus()};choices.append(b)});
 if(d.count)room.querySelector('.note').textContent=d.count+' of '+goal+' complete';
 room.querySelector('.back')?.addEventListener('click',()=>{d.index--;d.count=0;make(kind)});
 const next=room.querySelector('.action');next.onclick=()=>{if(next.disabled)return;d.count++;next.disabled=true;pulse(tray);tray.innerHTML=art(r,s.art,d.count);
 const status=room.querySelector('.note');status.textContent=d.count<goal?d.count+' of '+goal+' complete. Keep going!':'Ready!';
 if(d.count<goal){next.disabled=false;return}
 const token=visit;choices.querySelectorAll('button').forEach(b=>b.disabled=true);const back=room.querySelector('.back');if(back)back.disabled=true;
 setTimeout(()=>{d.count=0;d.index++;if(d.index===steps.length){drafts.delete(kind);const stored=save(r);if(token===visit){play(r,stored?'On your shelf.':'On your shelf for this visit.')}}else if(token===visit){make(kind);room.querySelector('.action').focus({preventScroll:true})}},430)};
}
function play(r,message=''){
 let presses=0,start=null;room.innerHTML='<h2>'+title(r)+'</h2><div class="bench"><div class="tray interactive" role="button" tabindex="0" aria-label="Play with '+title(r)+'"></div><article><p>'+describe(r)+'</p><div class="buttons"><button class="primary press"></button><button class="reset">Reset toy</button><button class="keep">Keep on my shelf</button><button class="share">Exhibit this design</button><a class="btn" href="#wall">Visit the wall</a></div><p role="status" class="note"></p></article></div>';
 const tray=room.querySelector('.tray'),button=room.querySelector('.press'),note=room.querySelector('.note');
 function draw(){tray.innerHTML=art(r,'play',presses);button.textContent=r.kind===1?(presses>=r.finish+3?'Dip again':'Crack the shell'):r.kind===2?'Stretch and fold':'Squeeze';}
 function act(dist=0){presses=r.kind===1&&presses>=r.finish+3?0:presses+1;draw();
 tray.style.setProperty('--wide',r.kind===2?Math.min(1.52,1.2+dist/400+(2-r.filling)*.05):1.18-r.filling*.03);tray.style.setProperty('--flat',r.kind===2?.67+r.filling*.05:.68+r.filling*.06);pulse(tray);
 note.textContent=r.kind===1?(presses===0?'Fresh shell.':presses>=r.finish+3?'The centre is free!':'Crack '+presses+'!'):r.kind===2?['The slime stretches into a ribbon.','Fold it into a soft swirl.'][presses%2]:['Boop! The skin springs back.','The filling moves under your fingers.'][presses%2];
 if(r.kind===1&&presses&&sound){const clip=new Audio('../assets/wax_'+(presses===1?'9120826936':'9113546474')+'.ogg');clip.volume=.25;clip.play().catch(()=>{})}}
 tray.onpointerdown=e=>{start=e.clientX;tray.setPointerCapture(e.pointerId)};tray.onpointerup=e=>{if(start!==null)act(Math.abs(e.clientX-start));start=null};tray.onpointercancel=()=>start=null;tray.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();act()}};
 room.querySelector('.share').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{const response=await fetch(api,{method:'POST',headers,body:JSON.stringify({...clean(r),spot:0})});if(!response.ok&&response.status!==409)throw Error();note.textContent='On display! Find your design under Visitor designs at the wall.'}catch{note.textContent='The exhibit is offline. You can keep this design on your shelf.'}finally{b.disabled=false}};
 button.onclick=()=>act();room.querySelector('.reset').onclick=()=>{presses=0;draw();note.textContent='Ready again.'};room.querySelector('.keep').onclick=()=>{note.textContent=save(r)?'Saved on your shelf.':'Saved for this visit.'};draw();note.textContent=message;
 if(r.kind===1){const b=document.createElement('button');const toggle=()=>{b.textContent=sound?'Crackle sound on':'Crackle sound off';b.setAttribute('aria-pressed',sound)};b.onclick=()=>{sound=!sound;toggle()};toggle();room.querySelector('.buttons').append(b)}
}
let sound=false;
function tiles(host,items){for(const r of items){const b=document.createElement('button');b.className='tile';b.innerHTML=art(r)+'<strong>'+title(r)+'</strong><small>'+describe(r)+'</small>';b.onclick=()=>play(r);host.append(b)}}
function myShelf(){room.innerHTML='<h2>My shelf</h2><p>'+ (shelf.length?'Pick a design to play again.':'Your finished designs will appear here. Try a studio sample while the shelf is empty.')+'</p><div class="grid"></div>';tiles(room.querySelector('.grid'),shelf.length?shelf:[fresh(0),{...fresh(1),shape:1,pigment:1},{...fresh(2),finish:2,pigment:2}]);}
async function wall(){
 const token=visit;let spot=0;const slimes=shelf.filter(r=>r.kind===2);
 room.innerHTML='<h2>Slime wall</h2><p>Tap a patch to play with it. Pick a jar from your shelf to leave a public splat.</p><label>Jar to splat <select></select></label><div class="wall" aria-label="Shared slime wall"></div><div class="buttons"><button class="primary post">Splat here</button><button class="refresh">Refresh wall</button></div><p class="note" role="status"></p><h3>Visitor designs</h3><div class="grid"></div>';
 const select=room.querySelector('select'),board=room.querySelector('.wall'),note=room.querySelector('.note'),post=room.querySelector('.post'),grid=room.querySelector('.grid');
 select.add(new Option('Choose a finished slime',''));slimes.forEach((r,i)=>select.add(new Option(title(r)+' · '+describe(r),String(i))));if(slimes.length)select.value='0';
 function paint(){board.replaceChildren();for(let i=0;i<24;i++){const r=displays.find(v=>v.kind===2&&v.spot===i),b=document.createElement('button');b.setAttribute('aria-pressed',i===spot);b.setAttribute('aria-label','Patch '+(i+1)+(r?' · '+title(r):' · empty'));if(r){b.style.setProperty('--paint',colors[r.pigment]);b.innerHTML='<span></span>'}else b.textContent='+';b.onclick=()=>{spot=i;paint();board.children[i].focus();note.replaceChildren('Patch '+(i+1)+' selected. ');if(r){const open=document.createElement('button');open.textContent='Play with '+title(r);open.onclick=()=>play(r);note.append(open)}};board.append(b)}grid.replaceChildren();tiles(grid,displays.filter((r,i,a)=>a.findIndex(x=>key(x)===key(r))===i));post.disabled=!slimes.length||select.value==='';}
 select.onchange=paint;
 async function load(){note.textContent='Opening the shared wall…';try{const res=await fetch(api+'?select=*&order=id.desc&limit=240',{headers});if(!res.ok)throw Error();const rows=await res.json();if(token!==visit)return;displays=rows.filter(valid);paint();note.textContent=displays.length?'Pick a patch or visit a design below.':'The wall is fresh. Make a slime to leave its first splat.'}catch{if(token===visit)note.textContent='The shared wall is offline. Your shelf is still here.'}}
 post.onclick=async()=>{const r=slimes[Number(select.value)];if(!r)return;post.disabled=true;try{const res=await fetch(api,{method:'POST',headers,body:JSON.stringify({...clean(r),spot})});if(!res.ok&&res.status!==409)throw Error();if(token!==visit)return;await load();if(token===visit&&displays.some(v=>v.spot===spot&&key(v)===key(r)))note.textContent='Splat! Your slime is on the shared wall.'}catch{if(token===visit)note.textContent='Could not place that splat. Your jar is safe on your shelf.'}finally{post.disabled=false}};
 room.querySelector('.refresh').onclick=load;paint();await load();
}
function route(){visit++;const page=location.hash.slice(1)||'squishy';document.querySelectorAll('nav a,header a').forEach(a=>{if(a.hash==='#'+page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});if(page==='wall')wall();else if(page==='shelf')myShelf();else if(page==='floor')floor(room,play);else make(Math.max(0,labels.indexOf(page)));if(location.hash)room.scrollIntoView({block:'start'})}
window.addEventListener('hashchange',route);document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.hash&&a.hash===location.hash){e.preventDefault();route()}});route();
