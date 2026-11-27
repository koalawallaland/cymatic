import {fresh,colors,names,title,art} from './maker.js';
const rooms=['Texture vats','Ripple lake','Slime falls','Wobble mirrors','Sound garden','Splat sling'];
const activities=[
 null,
 ['Step across the lake. Each footprint sends a ripple over the slime.','Take a step','Footprints'],
 ['Stand under the tap and send a ribbon of slime down the chute.','Open the tap','Showers'],
 ['Stretch your reflection or squash it flat.','Change reflection','Reflections'],
 ['Choose a sound and tap to hear it. Sound starts only when you play.','Play a note','Notes'],
 ['Choose how far to pull the sling, then launch a blob at the target.','Launch slime','Splats']
];
export function floor(host,play){
 let current=0,count=0,setting=1,ctx;
 host.innerHTML='<h2>Play floor</h2><div class="tabs"></div><div class="activity"></div>';
 const tabs=host.querySelector('.tabs'),area=host.querySelector('.activity');
 function show(){[...tabs.children].forEach((b,i)=>b.setAttribute('aria-pressed',current===i));
 if(!current){area.innerHTML='<h3>25 texture vats</h3><p>Try a studio batch. Each vat opens a slime you can stretch and keep.</p><div class="grid"></div>';const grid=area.querySelector('.grid');
 for(let i=0;i<25;i++){const r={...fresh(2),pigment:i%6,finish:Math.floor(i/6)%3,filling:Math.floor(i/3)%3,shape:Math.floor(i/9),charm:Math.floor(i/12)};const b=document.createElement('button');b.className='tile';b.innerHTML=art(r)+'<strong>'+title(r)+'</strong><small>Vat '+(i+1)+' · '+['soft','stretchy','firm'][r.filling]+'</small>';b.onclick=()=>play(r,'From the Sunnymoo studio vats.');grid.append(b)}return}
 const [hint,verb,unit]=activities[current];area.innerHTML='<h3>'+rooms[current]+'</h3><div class="bench"><div class="tray"></div><article><p>'+hint+'</p><div class="knob"></div><button class="primary">'+verb+'</button><p class="note" role="status"></p></article></div>';
 if(current>=4){const label=document.createElement('label');label.textContent=current===4?'Garden voice ':'Pull distance ';const sel=document.createElement('select');(current===4?['Bubble','Bell','Hum']:['Near','Middle','Far']).forEach((n,i)=>sel.add(new Option(n,''+i)));sel.value=''+setting;sel.onchange=()=>{setting=Number(sel.value);draw()};label.append(sel);area.querySelector('.knob').append(label)}
 const tray=area.querySelector('.tray');
 function draw(){const hue=colors[(count+current)%6],pos=48+(count*53)%220;let picture='';
 if(current===1){picture='<path d="M0 139Q80 111 156 142T320 136V250H0Z" fill="#96c7df"/>';for(let j=Math.max(0,count-5);j<count;j++){const x=45+(j*53)%225,y=150+j%3*19;picture+='<g transform="translate('+x+' '+y+') rotate('+(j%2?12:-12)+')"><ellipse ry="13" rx="28" fill="none" stroke="#f3ffff"/><ellipse rx="7" ry="12" fill="#4c8b9c"/></g>'}}
 if(current===2){picture='<path d="M92 39H161v30" fill="none" stroke="#657483" stroke-width="18"/><ellipse cx="160" cy="208" rx="93" ry="18" fill="'+hue+'"/>';if(count)picture+='<path class="stream" d="M150 65q-11 43 0 75t-13 63q26 16 48-1-19-41-12-72t-5-65z" fill="'+hue+'"/>'}
 if(current===3){picture='<rect x="57" y="18" width="206" height="214" rx="90" fill="#e7edff" stroke="#aa7b99" stroke-width="10"/><g transform="translate(160 140) scale('+[.9,1.4,.65][count%3]+' '+[1,.65,1.4][count%3]+')"><ellipse cy="0" rx="54" ry="45" fill="'+hue+'"/><path d="M-19-4h5m27 0h5m-24 13q8 9 15 0" fill="none" stroke="#4d3546" stroke-width="4" stroke-linecap="round"/></g>'}
 if(current===4){picture='<path d="M0 200q90-45 157-8t180-2v68H0Z" fill="#80bfa2"/>';for(let j=0;j<3;j++){const x=68+j*92,y=105+(j+count)%3*17;picture+='<path d="M'+x+' 203V'+y+'" stroke="#43896b" stroke-width="6"/><circle cx="'+x+'" cy="'+y+'" r="'+(j===setting?25:17)+'" fill="'+colors[j]+'"/>'}}
 if(current===5){picture='<circle cx="227" cy="101" r="50" fill="#ffc5d6"/><circle cx="227" cy="101" r="31" fill="#f8e1ae"/><circle cx="227" cy="101" r="14" fill="#ec83a8"/><path d="M65 211v-59l-23-25m23 25 24-28" fill="none" stroke="#98644d" stroke-width="10"/><path d="M42 125q24 '+(setting*10+12)+' 47-1" fill="none" stroke="#574260" stroke-width="4"/>';if(count)picture+='<ellipse cx="'+(145+setting*40)+'" cy="'+(115+(count%3)*4)+'" rx="21" ry="11" fill="'+hue+'"/>'}
 tray.innerHTML='<svg viewBox="0 0 320 250" aria-hidden="true">'+picture+'</svg>';area.querySelector('.note').textContent=unit+' · '+count}
 area.querySelector('.primary').onclick=()=>{count++;if(current===4){try{ctx||=new AudioContext();ctx.resume().catch(()=>{});const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=['sine','triangle','sine'][setting];osc.frequency.value=[260,390,175][setting]*(1+(count%4)/5);gain.gain.setValueAtTime(.09,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.38);osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.4)}catch{}}draw()};draw()}
 rooms.forEach((name,i)=>{const b=document.createElement('button');b.textContent=name;b.onclick=()=>{current=i;count=0;show()};tabs.append(b)});show()
}
