import {reliefWall} from './relief.js';
import {colors,names,kinds,flows,fresh,title,describe,art,shelfObject} from './maker.js?v=worktop3';
import {wallConfig} from '../../wall/config.js';
import {floor} from './tour.js?v=worktop3';
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
const sceneModule=import('./bench.js?v=worktop2').catch(()=>null);
const toolLabel={master:'Set on tray',mould:'Pour mould rubber',core:'Slide in the core',cast:'Pour tinted silicone',peel:'Peel it free',fill:'Pump gel',seal:'Seal and squeeze'};
const gesture={
 master:'Slide your shape onto the silver tray',mould:'Tilt the cup to pour the mould',core:'Slide the core into place',cast:'Tilt the cup to cast the skin',peel:'Pull the mould open',fill:'Press the pump to fill the skin',seal:'Press the plug into place',coreColor:'Rub colour into the centre',bath:'Tilt the cup of melted wax',dip:'Drag down to dip, then lift',cool:'Tap to skip the cooling time',crack:'Press the shell until it cracks',bowl:'Pour the base into the bowl',stir:'Swirl your finger to mix',activate:'Tilt in a little activator',fold:'Pull the slime, then let go',scent:'Tap to finish the blend',jar:'Scoop your slime into the jar'
};
function renderBench(tray,r,stage,count,animate=false){
 tray.dataset.phase=stage;tray.style.setProperty('--tint',colors[r.pigment]);tray.innerHTML=art(r,stage,count);
 if(r.kind!==2&&r.shape===0&&['master','mould'].includes(stage)){const image=new Image();image.src='../../desk/galaxy-steamer-bao.webp';image.alt='';image.className='original-toy';tray.append(image)}
 sceneModule.then(module=>{if(module&&tray.isConnected)module.showBench(tray,r,stage,count,animate)});
}
function make(kind){
 const d=drafts.get(kind)||{r:fresh(kind),index:0,count:0};drafts.set(kind,d);
 const steps=flows[kind],s=steps[d.index],r=d.r;
 const goal=({fill:3,mould:2,cast:2,dip:r.finish+1,fold:3,activate:2})[s.art]||1;
 room.innerHTML='<h2>'+['Squishy studio','Wax cracking studio','Slime kitchen'][kind]+'</h2><div class="bench"><div class="tray"></div><article><div class="step-line"><h3>'+gesture[s.art]+'</h3><small aria-label="Step '+(d.index+1)+' of '+steps.length+'">'+(d.index+1)+' / '+steps.length+'</small></div><div class="choices"></div><div class="buttons"><button class="primary action">'+(toolLabel[s.art]||s.action)+'</button>'+(d.index?'<button class="back">Back one step</button>':'')+'</div><p class="note" role="status"></p><details class="science"><summary>How it works</summary><p>'+s.hint+'</p></details></article></div>';
 const choices=room.querySelector('.choices'),tray=room.querySelector('.tray');
 renderBench(tray,r,s.art,d.count);
 if(s.options)s.options.forEach((o,i)=>{const b=document.createElement('button');b.setAttribute('aria-pressed',r[s.key]===i);if(s.key==='pigment'||s.key==='accent')b.innerHTML='<span class="swatch" style="background:'+colors[i]+'"></span>';if(s.key==='shape'&&kind!==2)b.dataset.shape=String(i);b.append(o);b.onclick=()=>{r[s.key]=i;d.count=0;make(kind);room.querySelectorAll('.choices button')[i].focus()};choices.append(b)});
 if(d.count)room.querySelector('.note').textContent=d.count+' of '+goal+' complete';
 room.querySelector('.back')?.addEventListener('click',()=>{d.index--;d.count=0;make(kind)});
 const next=room.querySelector('.action');
 tray.classList.add('interactive');tray.tabIndex=0;tray.setAttribute('role','button');tray.setAttribute('aria-label',s.action);
 let contact=null;
 tray.onpointerdown=e=>{contact=e.pointerId;tray.setPointerCapture(e.pointerId)};
 tray.onpointerup=e=>{if(contact===e.pointerId)next.click();contact=null};tray.onpointercancel=()=>contact=null;
 tray.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();next.click()}};
 next.onclick=()=>{if(next.disabled||d.busy)return;d.count++;next.disabled=true;pulse(tray);renderBench(tray,r,s.art,d.count,true);
 const status=room.querySelector('.note');status.textContent=d.count<goal?d.count+' of '+goal+' complete. Keep going!':'Ready!';
 if(d.count<goal){status.textContent=s.art==='fill'?['','One pump. The pocket is filling.','Two pumps. Watch the gel rise.'][d.count]:s.art==='dip'?'Coat '+d.count+' is cool. Ready for the next dip.':d.count+' of '+goal+' complete. Keep going!';next.disabled=false;return}
 const token=visit;d.busy=true;choices.querySelectorAll('button').forEach(b=>b.disabled=true);const back=room.querySelector('.back');if(back)back.disabled=true;
 setTimeout(()=>{d.busy=false;d.count=0;d.index++;if(d.index===steps.length){drafts.delete(kind);const stored=save(r);if(token===visit||location.hash==='#'+labels[kind]){play(r,stored?'On your shelf.':'On your shelf for this visit.')}}else if(token===visit||location.hash==='#'+labels[kind]){make(kind);room.querySelector('.action').focus({preventScroll:true})}},750)};
}
function play(r,message=''){
 let presses=0,start=null;room.innerHTML='<h2>'+title(r)+'</h2><div class="bench"><div class="tray interactive" role="button" tabindex="0" aria-label="Play with '+title(r)+'"></div><article><p>'+describe(r)+'</p><div class="buttons"><button class="primary press"></button><button class="reset">Reset toy</button><button class="keep">Keep on my shelf</button><button class="share">Exhibit this design</button><a class="btn" href="#wall">Visit the wall</a></div><p role="status" class="note"></p></article></div>';
 const tray=room.querySelector('.tray'),button=room.querySelector('.press'),note=room.querySelector('.note');
 function draw(){renderBench(tray,r,'play',presses,presses>0);button.textContent=r.kind===1?(presses>=r.finish+3?'Dip again':'Crack the shell'):r.kind===2?'Stretch and fold':'Squeeze';}
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
function tiles(host,items){for(const r of items){const b=document.createElement('button');b.className='tile';b.innerHTML=shelfObject(r)+'<strong>'+title(r)+'</strong><small>'+describe(r)+'</small>';b.onclick=()=>play(r);host.append(b)}}
function myShelf(){room.innerHTML='<h2>My shelf</h2><p>'+ (shelf.length?'Pick a design to play again.':'Your finished designs will appear here. Try a studio sample while the shelf is empty.')+'</p><div class="grid"></div>';tiles(room.querySelector('.grid'),shelf.length?shelf:[fresh(0),{...fresh(1),shape:1,pigment:1},{...fresh(2),finish:2,pigment:2}]);}
function wall(){reliefWall(room,{shelf,api,headers,valid,play,tiles,key})}
function route(){visit++;const page=location.hash.slice(1)||'squishy';document.querySelectorAll('nav a,header a').forEach(a=>{if(a.hash==='#'+page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});if(page==='wall')wall();else if(page==='shelf')myShelf();else if(page==='floor')floor(room,play);else make(Math.max(0,labels.indexOf(page)));if(location.hash)window.scrollTo({top:0})}
window.addEventListener('hashchange',route);document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.hash&&a.hash===location.hash){e.preventDefault();route()}});route();
