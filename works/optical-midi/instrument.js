const $=id=>document.getElementById(id),canvas=$('display'),ctx=canvas.getContext('2d');
const TAU=Math.PI*2, clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), mix=(a,b,t)=>a+(b-a)*t;
const modes=[
 ['Nodal field','✳'],['Light lattice','◇'],['Chromatic matrix','⠿'],['Warped checker','▧'],['Dot relief','⠚'],['Nested facets','⬡'],['Radial checker','◉'],['Moiré rings','◎'],['Spirograph','✺'],['Interference weave','⋈']
];
const defs=[
 ['freq','Frequency',40,1200,220,1,'Hz'],['sym','Symmetry',2,16,6,1,''],['warp','Warp',0,100,36,1,'%'],['phase','Phase',0,360,0,1,'°'],['density','Density',8,48,26,1,''],['hue','Hue',0,360,205,1,'°'],['speed','Speed',0,100,18,1,'%']
];
const values=Object.fromEntries(defs.map(([k,,,,v])=>[k,v])),controls={},keys=new Map(),active=new Map();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let mode=0,phaseTime=0,last=0,motion=!reduced.matches,velocity=.55,played=57,midiAccess=null,palette='cobalt',raf=0,visible=true,energy=0;
const colors={cobalt:['#080b19','#5795e8','#c2d7f2'],ink:['#e7dccb','#302837','#73665d'],pink:['#200d21','#e94ca8','#f7b8df'],pearl:['#16142a','#a7abed','#f0b9da'],chroma:['#1d1724','#e0c3a6','#f4b7da']};
function shade(i=0,alpha=1){const h=(values.hue+i+360)%360;return palette==='chroma'? `hsla(${h},72%,65%,${alpha})`:palette==='cobalt'?`hsla(${h},76%,65%,${alpha})`:palette==='pink'?`hsla(${h+125},76%,68%,${alpha})`:palette==='pearl'?`hsla(${h+35},52%,76%,${alpha})`: `rgba(43,35,49,${alpha})`;}
// SERAPH is a permanent, clean foreground layer. The exact outline from
// KT's original spectral sticker is preserved, including its restored heart; no grain, strobing or noise.
const eyeImg=new Image(),eyeColor=document.createElement('canvas'),eyeRim=document.createElement('canvas');
eyeColor.width=eyeRim.width=360;eyeColor.height=eyeRim.height=443;
const ec=eyeColor.getContext('2d'),er=eyeRim.getContext('2d');
let eyeReady=false;
eyeImg.onload=()=>{eyeReady=true;refresh()};
eyeImg.src='./seraph-eye-heart-mask.png';
function eyeColorAt(offset,alpha=1,saturation=82,lightness=68){
 const h=(values.hue+offset+(palette==='pink'?125:palette==='pearl'?35:0)+3600)%360;
 if(palette==='ink')return 'rgba(48,36,49,'+alpha+')';
 if(palette==='pearl'){saturation=Math.min(saturation,64);lightness=Math.max(lightness,78)}
 return 'hsla('+h+','+saturation+'%,'+lightness+'%,'+alpha+')';
}
function drawSeraph(w,t,pitch){
 if(!eyeReady)return;
 const ink=palette==='ink',mw=eyeColor.width,mh=eyeColor.height;
 // The eye is fixed in space. Only its smooth iridescent illumination changes.
 const angle=.7+.22*Math.sin(t*.34)+pitch*.12,ax=Math.cos(angle)*mw*.55,ay=Math.sin(angle)*mh*.55;
 ec.clearRect(0,0,mw,mh);ec.drawImage(eyeImg,0,0,mw,mh);ec.globalCompositeOperation='source-in';
 const grad=ec.createLinearGradient(mw/2-ax,mh/2-ay,mw/2+ax,mh/2+ay);
 if(ink){grad.addColorStop(0,'#241c2d');grad.addColorStop(.5,'#55465e');grad.addColorStop(1,'#241c2d')}
 else{[-38,17,76,141,205,270].forEach((h,i)=>grad.addColorStop(i/5,eyeColorAt(h+pitch*22+Math.sin(t*.25)*14,1,76,80+(i%2)*7)))}
 ec.fillStyle=grad;ec.fillRect(0,0,mw,mh);ec.globalCompositeOperation='source-over';
 er.clearRect(0,0,mw,mh);er.drawImage(eyeImg,0,0,mw,mh);er.globalCompositeOperation='source-in';er.fillStyle=ink?'#f7eddb':'#080b18';er.fillRect(0,0,mw,mh);er.globalCompositeOperation='source-over';
 const H=w*.745,W=H*mw/mh,x=-W/2,y=-H/2;
 // A narrow isolation edge keeps the original linework legible over every
 // backdrop, while the open spaces in the eye still reveal the moving field.
 ctx.save();ctx.globalAlpha=.93;
 for(let i=0;i<8;i++){const a=i*TAU/8;ctx.drawImage(eyeRim,x+Math.cos(a)*3.6,y+Math.sin(a)*3.6,W,H)}
 ctx.globalAlpha=1;ctx.shadowColor=ink?'rgba(98,67,92,.22)':eyeColorAt(25,.48,70,71);ctx.shadowBlur=ink?3:9+energy*3;ctx.drawImage(eyeColor,x,y,W,H);ctx.restore();
}
function draw(){
 const pattern=mode;
 const w=canvas.width,c=w/2,R=w*.465,t=values.phase*Math.PI/180+phaseTime,n=values.density,s=values.sym,warp=values.warp/100,pitch=Math.log2(values.freq/110),amp=.67+.22*velocity;
 const [bg,fg,hi]=colors[palette];ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=bg;ctx.fillRect(0,0,w,w);ctx.save();ctx.translate(c,c);ctx.lineJoin='round';ctx.lineCap='round';
 // Slow analytical standing waves approximate the changing surface of a
 // driven plate / shallow liquid. All vertices share one coherent field:
 // motion is displacement rather than random pixels or a flickering overlay.
 const a=clamp(Math.round(s+pitch),2,18),b=clamp(Math.round(n/6+pitch),1,12);
 const drive=.25+.75*warp,ks=Math.PI*(2+s*.32),kt=Math.PI*(2+n*.065+Math.max(0,pitch)*.45);
 const swell=Math.sin(t*.73)*.30+Math.sin(t*.39+1)*.15;
 const displacement=R*(.014+.050*drive+.018*energy);
 const bend=(x,y)=>{
  const X=x/R,Y=y/R,r=Math.hypot(X,Y),edge=Math.max(0,1-Math.max(Math.abs(X),Math.abs(Y))*.46);
  const u=Math.sin(ks*X+t*.78)*Math.cos(kt*Y-t*.37);
  const v=Math.cos(kt*X-t*.43)*Math.sin(ks*Y+t*.66);
  const radial=Math.sin((3+Math.max(0,pitch)*2)*Math.PI*r-t*1.08)*.43;
  return [x+displacement*edge*(u+radial*X+swell*X),y+displacement*edge*(v+radial*Y+swell*Y)]
 };
 const line=(pts,col,width=1,close=false)=>{ctx.beginPath();pts.forEach(([x,y],i)=>{const [X,Y]=bend(x,y);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y)});if(close)ctx.closePath();ctx.strokeStyle=col;ctx.lineWidth=width;ctx.stroke()};
 const polygon=(pts,col)=>{ctx.beginPath();pts.forEach(([x,y],i)=>{const [X,Y]=bend(x,y);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y)});ctx.closePath();ctx.fillStyle=col;ctx.fill()};
 const rotate=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
 const wash=ctx.createRadialGradient(0,0,0,0,0,R*1.5);wash.addColorStop(0,eyeColorAt(25,.11,45,50));wash.addColorStop(1,'transparent');ctx.fillStyle=wash;ctx.fillRect(-c,-c,w,w);
 ctx.save();ctx.globalAlpha=.78;
 if(pattern===0){
  // Chladni-style nodal lines, traced with interpolated marching squares.
  // Two spatial modes gradually exchange energy, so the geometry breathes.
  const cells=64,side=2*R,step=side/cells,grid=[];
  const weight=.73+.25*Math.sin(t*.62),freqShift=.13*Math.sin(t*.43);
  for(let j=0;j<=cells;j++){let row=[];for(let i=0;i<=cells;i++){const X=i/cells*Math.PI,Y=j/cells*Math.PI;row.push(Math.cos(a*X+freqShift)*Math.cos(b*Y)+weight*Math.cos(b*X)*Math.cos(a*Y+warp*.55*Math.sin(t*.71)));}grid.push(row)}
  for(const level of [-.76,-.38,0,.38,.76]){
   ctx.beginPath();
   for(let j=0;j<cells;j++)for(let i=0;i<cells;i++){
    const px=-R+i*step,py=-R+j*step;if(Math.hypot(px+step*.5,py+step*.5)>R)continue;
    const vv=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]],pp=[[px,py],[px+step,py],[px+step,py+step],[px,py+step]],hits=[];
    for(let k=0;k<4;k++){const l=(k+1)%4,u=vv[k]-level,v=vv[l]-level;if((u<0)===(v<0))continue;const f=u/(u-v);hits.push(bend(mix(pp[k][0],pp[l][0],f),mix(pp[k][1],pp[l][1],f)))}
    for(let k=0;k+1<hits.length;k+=2){ctx.moveTo(...hits[k]);ctx.lineTo(...hits[k+1])}
   }
   ctx.strokeStyle=shade(level*85+pitch*14,level===0?.98:.58);ctx.lineWidth=level===0?2.2:1.3;ctx.stroke();
  }
 }else if(pattern===1){
  const gap=R/(n*.34),ang=Math.PI/4;
  for(let j=-n;j<=n;j++)for(let i=-n;i<=n;i++){const x=i*gap,y=j*gap;let [X,Y]=rotate(x,y,ang);if(Math.hypot(X,Y)>R)continue;const pulse=.5+.5*Math.sin(i*.4+j*.4+t*.72+pitch);const len=gap*(.27+.15*pulse)*amp;for(const q of [ang,ang+Math.PI/2]){const dx=Math.cos(q)*len,dy=Math.sin(q)*len;line([[X-dx,Y-dy],[X,Y],[X+dx,Y+dy]],shade(20*Math.sin((i+j)*.4)+pitch*9,.76),1.7)}}
 }else if(pattern===2||pattern===4){
  const count=n,step=R*2/count;for(let j=0;j<count;j++)for(let i=0;i<count;i++){const x=-R+(i+.5)*step,y=-R+(j+.5)*step;const v=Math.sin(x/R*s*.6+t*.6)*Math.cos(y/R*(s*.5+pitch)-t*.4);const r=pattern===2?step*(.24+.10*v*warp):step*(.19+.15*(.5+.5*v));const [X,Y]=bend(x,y);ctx.beginPath();ctx.ellipse(X,Y,r,Math.max(1,r*(pattern===4?1-.4*warp*Math.abs(v):1)),0,0,TAU);ctx.fillStyle=pattern===2?shade((i*7+j*(s+2))*9+v*15,.80):shade(pitch*24+v*22,.66);ctx.fill();}
 }else if(pattern===3){
  const count=n,step=2*R/count,pt=(i,j)=>[-R+i*step,-R+j*step];
  for(let j=0;j<count;j++)for(let i=0;i<count;i++)if((i+j)%2===0)polygon([pt(i,j),pt(i+.5,j),pt(i+1,j),pt(i+1,j+.5),pt(i+1,j+1),pt(i+.5,j+1),pt(i,j+1),pt(i,j+.5)],shade(pitch*12+(i+j)*1.7,.80));
 }else if(pattern===5){
  const sides=Math.max(3,Math.min(8,s)),centers=1+Math.floor(s/2);for(let k=0;k<centers;k++){const a=k*TAU/centers+t*.045,cx=Math.cos(a)*R*.38,cy=Math.sin(a)*R*.38;for(let j=1;j<=n;j++){const r=R*.58*j/n*(1+.04*Math.sin(t+j*.3)),ang=a+warp*j*.027+t*.035,pts=[];for(let i=0;i<sides;i++){const q=ang+i*TAU/sides,z=ang+(i+1)*TAU/sides,x=cx+r*Math.cos(q),y=cy+r*Math.sin(q),X=cx+r*Math.cos(z),Y=cy+r*Math.sin(z);for(let k=0;k<5;k++)pts.push([mix(x,X,k/5),mix(y,Y,k/5)])}line(pts,shade(j*3+k*17+pitch*9,.63),1.2,true)}}
 }else if(pattern===6){
  const rings=Math.max(5,Math.round(n*.65)),sectors=s*4;for(let j=0;j<rings;j++)for(let i=0;i<sectors;i++)if((i+j)%2===0){const r1=R*j/rings,r2=R*(j+1)/rings;const arc=k=>TAU*(k/sectors+warp*.23*(j/rings)**2)+t*.04;const a=arc(i),b=arc(i+1),pts=[];for(let k=0;k<=5;k++){const q=mix(a,b,k/5);pts.push([r2*Math.cos(q),r2*Math.sin(q)])}for(let k=5;k>=0;k--){const q=mix(a,b,k/5);pts.push([r1*Math.cos(q),r1*Math.sin(q)])}polygon(pts,shade(j*3+pitch*12,.78))}
 }else if(pattern===7){
  const count=n+10;for(const sign of [-1,1])for(let i=1;i<=count;i++){const r=R*i/count,pts=[];for(let k=0;k<120;k++){const a=k*TAU/120;pts.push([sign*R*.12*warp*Math.cos(t*.6)+r*Math.cos(a),sign*R*.10*warp*Math.sin(t*.6)+r*(1-.16*warp)*Math.sin(a)])}line(pts,shade(sign*25+i*2+pitch*10,.63),i%5===0?1.7:1,true)}
 }else if(pattern===8){
  const f=2+s,inner=(s+Math.round(pitch)+1)/(s+6),distance=R*(.11+.27*warp);for(let j=0;j<Math.max(4,n/4);j++){const pts=[];for(let i=0;i<=720;i++){const a=i/720*TAU*6,phase=t*.15+j*.065;pts.push([(R*.70-R*.36*inner)*Math.cos(a+phase)+distance*Math.cos(f*a+phase),(R*.70-R*.36*inner)*Math.sin(a+phase)-distance*Math.sin(f*a+phase)])}line(pts,shade(j*12+pitch*10,.84),1.5)}
  for(let i=0;i<n*2;i++){const a=i*TAU/(n*2),x=R*Math.cos(a),y=R*Math.sin(a),X=R*Math.cos(a*s+t*.08),Y=R*Math.sin(a*s+t*.08);line(Array.from({length:13},(_,j)=>[mix(x,X,j/12),mix(y,Y,j/12)]),shade(i*4,.27),.8)}
 }else{
  for(const sign of [-1,1])for(let j=0;j<n;j++){const pts=[];for(let i=0;i<=120;i++){const x=-R+2*R*i/120,y=-R+2*R*j/(n-1)+warp*R*.13*Math.sin(x/R*s+sign*t*.6+j*.31+pitch);pts.push(rotate(x,y,sign*Math.PI/4))}ctx.save();ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.clip();line(pts,shade(sign*45+j*4,.72),1.45);ctx.restore()}
 }
 ctx.restore();
 drawSeraph(w,t,pitch);
 ctx.restore();
 $('mode-name').textContent='SERAPH / '+modes[mode][0].toUpperCase();
}
function frame(time){if(!motion||!visible||document.hidden){raf=0;return}if(time-last>=40){const dt=Math.min(100,last?time-last:0);phaseTime+=dt*values.speed*.000055;energy=mix(energy,active.size?velocity:0,Math.min(1,dt/180));last=time;draw()}raf=requestAnimationFrame(frame)}
function refresh(){draw();if(motion&&visible&&!raf){last=0;raf=requestAnimationFrame(frame)}}
function update(k,v,redraw=true){const d=defs.find(x=>x[0]===k);v=clamp(Number(v),d[2],d[3]);values[k]=Math.round(v);const c=controls[k];c.input.value=values[k];c.out.value=values[k]+d[6];c.dial.style.setProperty('--angle',(-135+(v-d[2])/(d[3]-d[2])*270)+'deg');if(k==='freq')noteText();if(redraw)refresh()}
function noteText(){const hz=values.freq,n=Math.round(69+12*Math.log2(hz/440));const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];$('note-display').textContent=names[(n%12+12)%12]+(Math.floor(n/12)-1)+' · '+hz+' Hz'}
defs.forEach(d=>{const [k,label,min,max,v,step,unit]=d,wrap=document.createElement('div');wrap.className='knob';wrap.innerHTML=`<label for="knob-${k}">${label}</label><div class="dial" aria-hidden="true" title="Drag up or down"></div><output for="knob-${k}"></output><input type="range" id="knob-${k}" min="${min}" max="${max}" value="${v}" step="${step}">`;const dial=wrap.querySelector('.dial'),input=wrap.querySelector('input'),out=wrap.querySelector('output');controls[k]={dial,input,out};input.addEventListener('input',()=>update(k,input.value));let start=null;dial.addEventListener('pointerdown',e=>{dial.setPointerCapture(e.pointerId);start={y:e.clientY,v:values[k]}});dial.addEventListener('pointermove',e=>{if(start)update(k,start.v+(start.y-e.clientY)*(max-min)/140)});for(const event of ['pointerup','pointercancel','lostpointercapture'])dial.addEventListener(event,()=>start=null);$('knobs').append(wrap);out.value=v+unit;dial.style.setProperty('--angle',(-135+(v-min)/(max-min)*270)+'deg')});
modes.forEach(([name,glyph],i)=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<span class="glyph" aria-hidden="true">${glyph}</span><span>${name}</span>`;b.setAttribute('aria-pressed',String(i===mode));b.addEventListener('click',()=>{mode=i;[...$('presets').children].forEach((el,j)=>el.setAttribute('aria-pressed',String(j===i)));refresh()});$('presets').append(b)});
$('palette').addEventListener('change',e=>{palette=e.target.value;refresh()});$('reset').addEventListener('click',()=>{phaseTime=0;defs.forEach(d=>update(d[0],d[4],false));velocity=.55;energy=0;refresh()});
$('motion').addEventListener('click',()=>{motion=!motion;$('motion').setAttribute('aria-pressed',String(motion));$('motion').textContent='Motion: '+(motion?'on':'off');if(!motion&&raf){cancelAnimationFrame(raf);raf=0}refresh()});
reduced.addEventListener('change',e=>{if(e.matches&&motion)$('motion').click();if(e.matches&&platePlaying){platePlaying=false;renderPlate()}});
// MIDI controls only the visual surface. No audio context or noise source.
function noteOn(n,vel,source){if(active.has(source))noteOff(source);played=n;velocity=vel/127;energy=velocity;active.set(source,{n});const hz=440*2**((n-69)/12);update('freq',Math.round(hz),false);keys.get(n)?.classList.add('active');refresh()}
function noteOff(source){const voice=active.get(source);if(!voice)return;active.delete(source);if(![...active.values()].some(v=>v.n===voice.n))keys.get(voice.n)?.classList.remove('active');if(!motion&&!active.size)energy=0;if(visible)refresh()}
function releaseAll(){for(const k of [...active.keys()])noteOff(k)}
const keyboard='awsedftgyhujk';const white=[0,2,4,5,7,9,11,12],black=[1,3,6,8,10];for(let i=0;i<13;i++){let b=document.createElement('button');b.type='button';b.className='key'+(black.includes(i)?' black':'');b.textContent=keyboard[i].toUpperCase();const n=60+i;b.setAttribute('aria-label','Play MIDI note '+n);if(black.includes(i)){const pos=white.filter(x=>x<i).length;b.style.left=(pos/8*100-3.85)+'%'}keys.set(n,b);b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);noteOn(n,100,'p'+e.pointerId)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>noteOff('p'+e.pointerId));b.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();noteOn(n,100,'focus'+n)}});b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();noteOff('focus'+n)}});$('keys').append(b)}
window.addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,select,textarea,button,a')||!visible)return;const i=keyboard.indexOf(e.key.toLowerCase());if(i>=0){e.preventDefault();noteOn(60+i,100,'k'+i)}});
window.addEventListener('keyup',e=>{const i=keyboard.indexOf(e.key.toLowerCase());if(i>=0)noteOff('k'+i)});window.addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();if(raf){cancelAnimationFrame(raf);raf=0}}else refresh()});
function midiMessage(e){const [status,a,b]=e.data,kind=status&0xf0,source='m'+(e.currentTarget?.id||e.target?.id||'input')+':'+(status&15)+':'+a;if(kind===0x90&&b>0&&visible)noteOn(a,b,source);else if(kind===0x80||(kind===0x90&&b===0))noteOff(source);else if(kind===0xb0&&a>=20&&a<=26){const d=defs[a-20];update(d[0],mix(d[2],d[3],b/127))}else if(kind===0xb0&&(a===120||a===123))releaseAll()}
function connectInputs(){const inputs=[...midiAccess.inputs.values()];inputs.forEach(i=>i.onmidimessage=midiMessage);$('midi-status').textContent=inputs.length?'MIDI connected: '+inputs.map(i=>i.name||'controller').join(', '):'MIDI available; plug in a controller.'}
$('midi').addEventListener('click',async()=>{if(!navigator.requestMIDIAccess){$('midi-status').textContent='Web MIDI is unavailable in this browser. The on-screen and computer keys work without it.';return}try{midiAccess=await navigator.requestMIDIAccess({sysex:false});connectInputs();midiAccess.onstatechange=()=>{releaseAll();connectInputs()};$('midi').textContent='MIDI connected'}catch{$('midi-status').textContent='MIDI access was not granted. Use the keys below.'}});
let editions=[],plate=0,platePlaying=false,plateRenderId=0;
function renderPlate(){
 if(!editions.length)return;
 const e=editions[plate],image=$('plate-image'),video=$('plate-video'),request=++plateRenderId;
 const poster='plates/'+e.poster,source='plates/'+e.animation,playing=platePlaying&&!visible;
 image.src=poster;image.alt=e.name+' — SERAPH art';image.hidden=playing;video.hidden=!playing;
 video.poster=poster;video.muted=true;video.playsInline=true;video.autoplay=playing;
 if(playing){
  if(video.getAttribute('src')!==source)video.src=source;
  // Muted inline autoplay works on compatible mobile browsers. If playback
  // is denied, keep the still visible and leave the manual play control.
  video.play().catch(()=>{if(request===plateRenderId&&platePlaying&&!visible){platePlaying=false;renderPlate()}});
 }else{video.pause();if(visible&&video.hasAttribute('src')){video.removeAttribute('src');video.load()}}
 $('plate-number').textContent=String(plate+1).padStart(2,'0')+' / '+editions.length;
 $('plate-title').textContent=e.name;$('edition-name').textContent=e.name;$('edition-description').textContent=e.description;
 $('plate-play').textContent=playing?'Pause animation':'Play animation';$('plate-play').setAttribute('aria-pressed',String(playing));
 [...$('thumbs').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===plate)));
}
async function loadPlates(){try{editions=await (await fetch('editions.json?v=duo-1')).json();$('plate-count').textContent=editions.length;editions.forEach((e,i)=>{const b=document.createElement('button');const img=new Image();img.src='plates/'+e.poster;img.loading='lazy';img.alt='';b.append(img,document.createTextNode(String(i+1).padStart(2,'0')+' '+e.name));b.addEventListener('click',()=>{plate=i;renderPlate()});$('thumbs').append(b)});renderPlate()}catch{$('edition-name').textContent='Plates could not load';$('edition-description').textContent='Refresh the page to try again.'}}
function switchTab(showInstrument){const enteringPlates=visible&&!showInstrument;visible=showInstrument;$('instrument').hidden=!showInstrument;$('plates').hidden=showInstrument;$('tab-instrument').setAttribute('aria-pressed',String(showInstrument));$('tab-plates').setAttribute('aria-pressed',String(!showInstrument));if(showInstrument){platePlaying=false;renderPlate();refresh()}else{if(enteringPlates)platePlaying=!reduced.matches;releaseAll();if(raf){cancelAnimationFrame(raf);raf=0}renderPlate()}}
$('tab-instrument').addEventListener('click',()=>switchTab(true));$('tab-plates').addEventListener('click',()=>switchTab(false));$('plate-prev').addEventListener('click',()=>{if(editions.length){plate=(plate+editions.length-1)%editions.length;renderPlate()}});$('plate-next').addEventListener('click',()=>{if(editions.length){plate=(plate+1)%editions.length;renderPlate()}});$('plate-play').addEventListener('click',()=>{platePlaying=!platePlaying;renderPlate()});
$('play-seraph').addEventListener('click',()=>{switchTab(true);$('instrument').scrollIntoView({block:'start',behavior:'auto'});});
$('motion').setAttribute('aria-pressed',String(motion));$('motion').textContent='Motion: '+(motion?'on':'off');loadPlates();noteText();refresh();if(location.hash==='#plates')switchTab(false);
