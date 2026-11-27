const $=id=>document.getElementById(id),canvas=$('display'),ctx=canvas.getContext('2d');
const TAU=Math.PI*2, clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), mix=(a,b,t)=>a+(b-a)*t;
const modes=[
 ['SERAPH eye','◉'],['Nodal field','✳'],['Light lattice','◇'],['Chromatic matrix','⠿'],['Warped checker','▧'],['Dot relief','⠚'],['Nested facets','⬡'],['Radial checker','◉'],['Moiré rings','◎'],['Spirograph','✺'],['Interference weave','⋈']
];
const defs=[
 ['freq','Frequency',40,1200,220,1,'Hz'],['sym','Symmetry',2,16,6,1,''],['warp','Warp',0,100,36,1,'%'],['phase','Phase',0,360,0,1,'°'],['density','Density',8,48,26,1,''],['hue','Hue',0,360,205,1,'°'],['speed','Speed',0,100,18,1,'%']
];
const values=Object.fromEntries(defs.map(([k,,,,v])=>[k,v])),controls={},keys=new Map(),active=new Map();
let mode=0,phaseTime=0,last=0,motion=false,sound=false,velocity=.55,played=57,audio=null,midiAccess=null,palette='cobalt',raf=0,visible=true;
const colors={cobalt:['#080b19','#5795e8','#c2d7f2'],ink:['#e7dccb','#302837','#73665d'],pink:['#200d21','#e94ca8','#f7b8df'],pearl:['#16142a','#a7abed','#f0b9da'],chroma:['#1d1724','#e0c3a6','#f4b7da']};
function shade(i=0,alpha=1){const h=(values.hue+i+360)%360;return palette==='chroma'? `hsla(${h},72%,65%,${alpha})`:palette==='cobalt'?`hsla(${h},76%,65%,${alpha})`:palette==='pink'?`hsla(${h+125},76%,68%,${alpha})`:palette==='pearl'?`hsla(${h+35},52%,76%,${alpha})`: `rgba(43,35,49,${alpha})`;}
// SERAPH: the mask is sampled from KT's original spectral sticker, preserving the
// hand-drawn halo, lashes, pupil cut-outs, five dots and tear. The instrument
// synthesizes its diffraction field live rather than replaying a sticker video.
const eyeImg=new Image(),eyeMask=document.createElement('canvas'),eyeColor=document.createElement('canvas'),eyeRim=document.createElement('canvas');
eyeMask.width=eyeColor.width=eyeRim.width=360;eyeMask.height=eyeColor.height=eyeRim.height=443;
const em=eyeMask.getContext('2d'),ec=eyeColor.getContext('2d'),er=eyeRim.getContext('2d');
let eyeReady=false;
eyeImg.onload=()=>{eyeReady=true;if(mode===0)refresh()};
eyeImg.src='./seraph-eye-mask.png';
function eyeColorAt(offset,alpha=1,saturation=82,lightness=68){
 const h=(values.hue+offset+(palette==='pink'?125:palette==='pearl'?35:0)+3600)%360;
 if(palette==='ink')return 'rgba(48,36,49,'+alpha+')';
 if(palette==='pearl'){saturation=Math.min(saturation,64);lightness=Math.max(lightness,78)}
 return 'hsla('+h+','+saturation+'%,'+lightness+'%,'+alpha+')';
}
function drawSeraph(c,w,t,n,s,warp,pitch,amp){
 const inkMode=palette==='ink',R=w*.435,energy=active.size?velocity:velocity*.48;
 // A soft, phase-linked standing-wave field. The background is intentionally
 // quiet enough to keep the original eye readable at every parameter setting.
 const glow=ctx.createRadialGradient(0,0,w*.025,0,0,w*.55);
 glow.addColorStop(0,inkMode?'#f7eddf':eyeColorAt(38,.20,48,35));glow.addColorStop(1,'transparent');
 ctx.fillStyle=glow;ctx.fillRect(-c,-c,w,w);
 const rings=Math.round(n*.68+5),petals=Math.round(s);
 for(let j=1;j<=rings;j++){
  const k=j/rings,r=R*k;
  ctx.beginPath();
  for(let i=0;i<=150;i++){
   const a=i/150*TAU;
   const wave=1+warp*.18*Math.cos(petals*a+t+k*6+pitch*2)+.035*Math.sin(a*(petals+2)-t*1.3+k*18);
   const x=Math.cos(a+t*.045)*r*wave,y=Math.sin(a+t*.045)*r*wave;
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.strokeStyle=eyeColorAt(k*130+pitch*12+Math.sin(t+k*7)*20,(j%5===0?.29:.10)+energy*.06);ctx.lineWidth=j%5===0?1.4:.72;ctx.stroke();
 }
 // Radial harmonic teeth: symmetry and note frequency determine the petal count
 // and pitch-dependent ripple spacing. No audio or microphone is required.
 ctx.save();ctx.rotate(t*.06);
 for(let i=0;i<petals*4;i++){
  const a=i*TAU/(petals*4),r1=R*(.91+.035*Math.sin(t+i*.8+pitch)),r2=R*1.03;
  ctx.beginPath();ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);
  ctx.strokeStyle=eyeColorAt(i*360/(petals*4)+pitch*16,i%4===0?.64:.25);ctx.lineWidth=i%4===0?1.8:.8;ctx.stroke();
 }
 ctx.restore();
 if(!eyeReady){ctx.fillStyle=inkMode?'#302837':'#e9cced';ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText('LOADING SERAPH / KT',0,0);return}
 const mw=eyeMask.width,mh=eyeMask.height;
 em.clearRect(0,0,mw,mh);
 // Mild lenticular bending; the original silhouette remains recognizable.
 const shift=warp*11,fx=2.3+Math.abs(pitch)*.3;
 for(let y=0;y<eyeImg.height;y+=3){
  const hh=Math.min(3,eyeImg.height-y),dy=y/eyeImg.height*mh,dh=hh/eyeImg.height*mh;
  const dx=shift*(.65*Math.sin(dy/mh*TAU*fx+t)+.35*Math.sin(dy/mh*TAU*1.1-t*.8));
  em.drawImage(eyeImg,0,y,eyeImg.width,hh,dx,dy,mw,dh+.3);
 }
 // Draw an original-art-shaped iridescent mask. Its internal interference
 // is driven by the same note and CC controls as the geometric instruments.
 ec.clearRect(0,0,mw,mh);ec.drawImage(eyeMask,0,0);ec.globalCompositeOperation='source-in';
 const angle=t*.65+pitch*.58,ax=Math.cos(angle)*mw*.52,ay=Math.sin(angle)*mh*.52;
 const spectral=ec.createLinearGradient(mw/2-ax,mh/2-ay,mw/2+ax,mh/2+ay);
 if(inkMode){spectral.addColorStop(0,'#2c1e32');spectral.addColorStop(.52,'#5d425e');spectral.addColorStop(1,'#231b2a')}
 else{
  const offsets=[-65,0,68,135,208,290];
  offsets.forEach((off,i)=>spectral.addColorStop(i/(offsets.length-1),eyeColorAt(off+pitch*40,1,74,i%2===0?79:61)));
 }
 ec.fillStyle=spectral;ec.fillRect(0,0,mw,mh);
 ec.globalCompositeOperation='source-atop';
 const count=Math.round(n*1.35+Math.abs(pitch)*5);
 for(let j=0;j<count;j++){
  ec.beginPath();const base=j*mh/(count-1),freq=2.4+Math.max(0,pitch)*1.1;
  for(let i=0;i<=90;i++){
   const x=i*mw/90,y=base+mh*.045*Math.sin(x/mw*TAU*freq+t+j*.26)+warp*mh*.035*Math.cos(x/mw*s+t*.7+j*.3);
   if(i===0)ec.moveTo(x,y);else ec.lineTo(x,y);
  }
  ec.strokeStyle=inkMode?'rgba(245,231,224,.19)':eyeColorAt(j*6+pitch*30+150,.22+energy*.20,86,94);ec.lineWidth=j%5===0?2.3:.95;ec.stroke();
 }
 ec.globalCompositeOperation='source-over';
 // Spectrally split shadows behind the exact mask, not a rectangle of artwork.
 er.clearRect(0,0,mw,mh);er.drawImage(eyeMask,0,0);er.globalCompositeOperation='source-in';er.fillStyle=inkMode?'#a795a5':eyeColorAt(-75+pitch*25,1,88,56);er.fillRect(0,0,mw,mh);er.globalCompositeOperation='source-over';
 const H=w*.80*(1+.025*energy),W=H*mw/mh,x=-W/2,y=-H/2,split=3+warp*12+energy*4;
 ctx.save();
 ctx.shadowColor=inkMode?'rgba(49,30,43,.28)':eyeColorAt(25+pitch*18,.8,92,72);ctx.shadowBlur=inkMode?8:17+energy*10;
 ctx.globalAlpha=inkMode?.42:.82;ctx.drawImage(eyeRim,x-split*Math.cos(angle),y-split*Math.sin(angle),W,H);
 ctx.shadowBlur=0;ctx.globalAlpha=inkMode?.34:.77;ctx.drawImage(eyeRim,x+split*Math.cos(angle)*.7,y+split*Math.sin(angle)*.7,W,H);
 ctx.globalAlpha=1;ctx.shadowColor=inkMode?'#f3dfe9':'rgba(5,3,14,.8)';ctx.shadowBlur=4;
 ctx.drawImage(eyeColor,x,y,W,H);
 ctx.restore();
}
function draw(){
 const pattern=mode-1;
 const w=canvas.width,c=w/2,R=w*.435,t=values.phase*Math.PI/180+phaseTime, n=values.density,s=values.sym,warp=values.warp/100,pitch=Math.log2(values.freq/110),amp=.62+.38*velocity;
 const [bg,fg,hi]=colors[palette];ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=bg;ctx.fillRect(0,0,w,w);ctx.save();ctx.translate(c,c);ctx.lineJoin='round';ctx.lineCap='round';
 const line=(pts,col,width=1)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=col;ctx.lineWidth=width;ctx.stroke()};
 const polygon=(pts,col)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=col;ctx.fill()};
 const rotate=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
 if(mode===0){drawSeraph(c,w,t,n,s,warp,pitch,amp);
 }else if(pattern===0){ // sampled zero contours of superposed orthogonal standing waves
  const step=4,a=clamp(Math.round(s+pitch),2,18),b=clamp(Math.round(n/6+pitch),1,12);
  for(let y=-R;y<=R;y+=step)for(let x=-R;x<=R;x+=step){const r=Math.hypot(x,y)/R;if(r>1)continue;const X=(x/R+1)*Math.PI/2,Y=(y/R+1)*Math.PI/2;const f=Math.cos(a*X)*Math.cos(b*Y)+Math.cos(b*X)*Math.cos(a*Y+warp*Math.sin(t+x/R));const d=Math.abs(f);if(d<.20){ctx.fillStyle=shade(36*r+pitch*12,(1-d/.20)*amp*.8);ctx.fillRect(x,y,step*.85,step*.85);}}
 }else if(pattern===1){ // individually glinting diamond lattice, no strobes
  const gap=R/(n*.38), ang=Math.PI/4+t*.16;
  for(let j=-n;j<=n;j++)for(let i=-n;i<=n;i++){const x=i*gap,y=j*gap;let [X,Y]=rotate(x,y,ang);const r=Math.hypot(X,Y)/R;if(r>1)continue;const pulse=.26+.74*(.5+.5*Math.sin(i*.8+j*.6+t+pitch));const len=gap*(.18+.46*pulse)*amp;ctx.strokeStyle=shade(18*Math.sin(i+j)+pitch*9,.32+.43*pulse);ctx.lineWidth=1.8;for(const q of [ang,ang+Math.PI/2]){ctx.beginPath();ctx.moveTo(X-Math.cos(q)*len,Y-Math.sin(q)*len);ctx.lineTo(X+Math.cos(q)*len,Y+Math.sin(q)*len);ctx.stroke()}ctx.beginPath();ctx.fillStyle=hi;ctx.globalAlpha=.28+.35*pulse;ctx.arc(X,Y,1.8,0,TAU);ctx.fill();ctx.globalAlpha=1;}
 }else if(pattern===2||pattern===4){ // color-sequence dot plane and optically warped dot surface
  const count=n,step=R*2/count;for(let j=0;j<count;j++)for(let i=0;i<count;i++){let x=-R+(i+.5)*step,y=-R+(j+.5)*step;const v=Math.sin(x/R*s*.6+t)*Math.cos(y/R*(s*.5+pitch));const r=pattern===2?step*(.24+.12*v*warp):step*(.12+.34*(.5+.5*v));y+=pattern===4?step*warp*.8*Math.sin(x/R*s+t):0;ctx.beginPath();ctx.ellipse(x,y,r,Math.max(1,r*(pattern===4?1-.65*warp*Math.abs(v):1)),0,0,TAU);ctx.fillStyle=pattern===2?shade(((i*7+j*(s+2)+Math.round(v*12))%12)*30,amp):shade(pitch*24+v*20,.24+.7*(.5+.5*v));ctx.fill();}
 }else if(pattern===3){ // continuous coordinate-warp checker, unlike original composition
  const count=n,step=2*R/count,pt=(i,j)=>{const x=-R+i*step,y=-R+j*step;return [x+step*warp*1.6*Math.sin(y/R*s+t)*Math.sin(i/count*Math.PI),y+step*warp*1.5*Math.sin(x/R*(s*.7+pitch)+t)*Math.sin(j/count*Math.PI)]};
  for(let j=0;j<count;j++)for(let i=0;i<count;i++)if((i+j)%2===0)polygon([pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1)],shade(pitch*12+(i+j)*1.7,.85));
 }else if(pattern===5){ // spiraling polygonal facets
  const sides=Math.max(3,Math.min(8,s)),centers=1+Math.floor(s/2);for(let k=0;k<centers;k++){const a=k*TAU/centers+t*.15,cx=Math.cos(a)*R*.38,cy=Math.sin(a)*R*.38;for(let j=1;j<=n;j++){const r=R*.58*j/n, ang=a+warp*j*.027+t*.1;const pts=Array.from({length:sides+1},(_,i)=>[cx+r*Math.cos(ang+i*TAU/sides),cy+r*Math.sin(ang+i*TAU/sides)]);line(pts,shade(j*3+k*17+pitch*9,.54),1.1);}}
 }else if(pattern===6){ // annular radial checker, variable sector progression
  const rings=Math.max(5,Math.round(n*.65)), sectors=s*4;for(let j=0;j<rings;j++)for(let i=0;i<sectors;i++)if((i+j)%2===0){const r1=R*j/rings,r2=R*(j+1)/rings;const arc=k=>TAU*(k/sectors+warp*.23*(j/rings)**2)+t*.14;const a=arc(i),b=arc(i+1);ctx.beginPath();ctx.arc(0,0,r2,a,b);ctx.arc(0,0,r1,b,a,true);ctx.closePath();ctx.fillStyle=shade(j*3+pitch*12,.87);ctx.fill();}
 }else if(pattern===7){ // two ring fields, independently displaced
  const count=n+10;for(const sign of [-1,1])for(let i=1;i<=count;i++){const r=R*i/count;ctx.beginPath();ctx.ellipse(sign*R*.12*warp*Math.cos(t),sign*R*.10*warp*Math.sin(t),r,r*(1-.16*warp),sign*(t*.15+warp*.25),0,TAU);ctx.strokeStyle=shade(sign*25+i*2+pitch*10,.55);ctx.lineWidth=i%5===0?1.7:1;ctx.stroke();}
 }else if(pattern===8){ // hypotrochoid and string-art chords
  const f=2+s,inner=(s+Math.round(pitch)+1)/(s+6),distance=R*(.11+.27*warp);for(let j=0;j<Math.max(4,n/4);j++){const pts=[];for(let i=0;i<=1000;i++){const a=i/1000*TAU*6;const phase=t*.4+j*.065;pts.push([(R*.70-R*.36*inner)*Math.cos(a+phase)+distance*Math.cos(f*a+phase),(R*.70-R*.36*inner)*Math.sin(a+phase)-distance*Math.sin(f*a+phase)]);}line(pts,shade(j*12+pitch*10,.78),1.35)}
  for(let i=0;i<n*2;i++){const a=i*TAU/(n*2);line([[R*Math.cos(a),R*Math.sin(a)],[R*Math.cos(a*s+t*.22),R*Math.sin(a*s+t*.22)]],shade(i*4,.23),.75)}
 }else{ // interleaved sinusoidal grids with woven depth
  for(const sign of [-1,1])for(let j=0;j<n;j++){const pts=[];for(let i=0;i<=160;i++){const x=-R+2*R*i/160,y=-R+2*R*j/(n-1)+warp*R*.13*Math.sin(x/R*s+sign*t+j*.31+pitch);pts.push(rotate(x,y,sign*Math.PI/4+t*.07))}ctx.save();ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.clip();line(pts,shade(sign*45+j*4,.68),1.35);ctx.restore();}
 }ctx.restore();
 $('mode-name').textContent=String(mode+1).padStart(2,'0')+' / '+modes[mode][0].toUpperCase();
}
function frame(time){if(!motion||!visible||document.hidden){raf=0;return}if(time-last>=40){phaseTime+=Math.min(100,last?time-last:0)*values.speed*.000055;last=time;draw()}raf=requestAnimationFrame(frame)}
function refresh(){draw();if(motion&&visible&&!raf){last=0;raf=requestAnimationFrame(frame)}}
function update(k,v){const d=defs.find(x=>x[0]===k);v=clamp(Number(v),d[2],d[3]);values[k]=Math.round(v);const c=controls[k];c.input.value=values[k];c.out.value=values[k]+d[6];c.dial.style.setProperty('--angle',(-135+(v-d[2])/(d[3]-d[2])*270)+'deg');if(k==='freq')noteText();refresh()}
function noteText(){const hz=values.freq,n=Math.round(69+12*Math.log2(hz/440));const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];$('note-display').textContent=names[(n%12+12)%12]+(Math.floor(n/12)-1)+' · '+hz+' Hz'}
defs.forEach(d=>{const [k,label,min,max,v,step,unit]=d,wrap=document.createElement('div');wrap.className='knob';wrap.innerHTML=`<label for="knob-${k}">${label}</label><div class="dial" aria-hidden="true" title="Drag up or down"></div><output for="knob-${k}"></output><input type="range" id="knob-${k}" min="${min}" max="${max}" value="${v}" step="${step}">`;const dial=wrap.querySelector('.dial'),input=wrap.querySelector('input'),out=wrap.querySelector('output');controls[k]={dial,input,out};input.addEventListener('input',()=>update(k,input.value));let start=null;dial.addEventListener('pointerdown',e=>{dial.setPointerCapture(e.pointerId);start={y:e.clientY,v:values[k]}});dial.addEventListener('pointermove',e=>{if(start)update(k,start.v+(start.y-e.clientY)*(max-min)/140)});for(const event of ['pointerup','pointercancel','lostpointercapture'])dial.addEventListener(event,()=>start=null);$('knobs').append(wrap);out.value=v+unit;dial.style.setProperty('--angle',(-135+(v-min)/(max-min)*270)+'deg')});
modes.forEach(([name,glyph],i)=>{const b=document.createElement('button');b.type='button';if(i===0)b.classList.add('seraph-preset');b.innerHTML=`<span class="glyph" aria-hidden="true">${glyph}</span><span>${name}</span>`;b.setAttribute('aria-pressed',String(i===mode));b.addEventListener('click',()=>{mode=i;[...$('presets').children].forEach((el,j)=>el.setAttribute('aria-pressed',String(j===i)));refresh()});$('presets').append(b)});
$('palette').addEventListener('change',e=>{palette=e.target.value;refresh()});$('reset').addEventListener('click',()=>{phaseTime=0;defs.forEach(d=>update(d[0],d[4]));velocity=.55;refresh()});
$('motion').addEventListener('click',()=>{motion=!motion;$('motion').setAttribute('aria-pressed',String(motion));$('motion').textContent='Motion: '+(motion?'on':'off');if(!motion&&raf){cancelAnimationFrame(raf);raf=0}refresh()});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');reduced.addEventListener('change',e=>{if(e.matches&&motion)$('motion').click();if(e.matches&&platePlaying){platePlaying=false;renderPlate()}});
$('sound').addEventListener('click',async()=>{sound=!sound;if(sound){try{audio??=new (window.AudioContext||window.webkitAudioContext)();await audio.resume()}catch{sound=false}}else releaseAll();$('sound').textContent='Sound: '+(sound?'on':'off');$('sound').setAttribute('aria-pressed',String(sound))});
function noteOn(n,vel,source){if(active.has(source))noteOff(source);played=n;velocity=vel/127;const hz=440*2**((n-69)/12);update('freq',Math.round(hz));const voice={n,osc:null,gain:null};if(sound&&audio&&audio.state==='running'){const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=hz;gain.gain.value=0;gain.gain.setTargetAtTime(.09*velocity,audio.currentTime,.015);osc.connect(gain).connect(audio.destination);osc.start();voice.osc=osc;voice.gain=gain;}active.set(source,voice);keys.get(n)?.classList.add('active');refresh()}
function noteOff(source){const voice=active.get(source);if(!voice)return;active.delete(source);if(voice.osc){voice.gain.gain.setTargetAtTime(0,audio.currentTime,.03);voice.osc.stop(audio.currentTime+.18)}if(![...active.values()].some(v=>v.n===voice.n))keys.get(voice.n)?.classList.remove('active');if(mode===0&&visible)refresh()}
function releaseAll(){for(const k of [...active.keys()])noteOff(k)}
const keyboard='awsedftgyhujk';const white=[0,2,4,5,7,9,11,12],black=[1,3,6,8,10];for(let i=0;i<13;i++){let b=document.createElement('button');b.type='button';b.className='key'+(black.includes(i)?' black':'');b.textContent=keyboard[i].toUpperCase();const n=60+i;b.setAttribute('aria-label','Play MIDI note '+n);if(black.includes(i)){const pos=white.filter(x=>x<i).length;b.style.left=(pos/8*100-3.85)+'%'}keys.set(n,b);b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);noteOn(n,100,'p'+e.pointerId)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>noteOff('p'+e.pointerId));b.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();noteOn(n,100,'focus'+n)}});b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();noteOff('focus'+n)}});$('keys').append(b)}
window.addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,select,textarea,button,a')||!visible)return;const i=keyboard.indexOf(e.key.toLowerCase());if(i>=0){e.preventDefault();noteOn(60+i,100,'k'+i)}});
window.addEventListener('keyup',e=>{const i=keyboard.indexOf(e.key.toLowerCase());if(i>=0)noteOff('k'+i)});window.addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();if(raf){cancelAnimationFrame(raf);raf=0}}else refresh()});
function midiMessage(e){const [status,a,b]=e.data,kind=status&0xf0,source='m'+(e.currentTarget?.id||e.target?.id||'input')+':'+(status&15)+':'+a;if(kind===0x90&&b>0&&visible)noteOn(a,b,source);else if(kind===0x80||(kind===0x90&&b===0))noteOff(source);else if(kind===0xb0&&a>=20&&a<=26){const d=defs[a-20];update(d[0],mix(d[2],d[3],b/127))}else if(kind===0xb0&&(a===120||a===123))releaseAll()}
function connectInputs(){const inputs=[...midiAccess.inputs.values()];inputs.forEach(i=>i.onmidimessage=midiMessage);$('midi-status').textContent=inputs.length?'MIDI connected: '+inputs.map(i=>i.name||'controller').join(', '):'MIDI available; plug in a controller.'}
$('midi').addEventListener('click',async()=>{if(!navigator.requestMIDIAccess){$('midi-status').textContent='Web MIDI is unavailable in this browser. The on-screen and computer keys work without it.';return}try{midiAccess=await navigator.requestMIDIAccess({sysex:false});connectInputs();midiAccess.onstatechange=()=>{releaseAll();connectInputs()};$('midi').textContent='MIDI connected'}catch{$('midi-status').textContent='MIDI access was not granted. Use the keys below.'}});
let editions=[],plate=0,platePlaying=false;
function renderPlate(){if(!editions.length)return;const e=editions[plate];const image=$('plate-image'),video=$('plate-video');image.src='plates/'+e.poster;image.hidden=platePlaying;video.hidden=!platePlaying;if(platePlaying){const source='plates/'+e.animation;if(video.getAttribute('src')!==source)video.src=source;video.play().catch(()=>{platePlaying=false;renderPlate()})}else{video.pause();video.removeAttribute('src');video.load()};$('plate-image').alt=e.name+' — SERAPH art';$('plate-number').textContent=String(plate+1).padStart(2,'0')+' / '+editions.length;$('plate-title').textContent=e.name;$('edition-name').textContent=e.name;$('edition-description').textContent=e.description;$('plate-play').textContent=platePlaying?'Pause animation':'Play animation';$('plate-play').setAttribute('aria-pressed',String(platePlaying));[...$('thumbs').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===plate)))}
async function loadPlates(){try{editions=await (await fetch('editions.json')).json();editions.forEach((e,i)=>{const b=document.createElement('button');const img=new Image();img.src='plates/'+e.poster;img.loading='lazy';img.alt='';b.append(img,document.createTextNode(String(i+1).padStart(2,'0')+' '+e.name));b.addEventListener('click',()=>{plate=i;renderPlate()});$('thumbs').append(b)});renderPlate()}catch{$('edition-name').textContent='Plates could not load';$('edition-description').textContent='Refresh the page to try again.'}}
function switchTab(showInstrument){visible=showInstrument;$('instrument').hidden=!showInstrument;$('plates').hidden=showInstrument;$('tab-instrument').setAttribute('aria-pressed',String(showInstrument));$('tab-plates').setAttribute('aria-pressed',String(!showInstrument));if(showInstrument){platePlaying=false;renderPlate();refresh()}else{releaseAll();if(raf){cancelAnimationFrame(raf);raf=0}renderPlate()}}
$('tab-instrument').addEventListener('click',()=>switchTab(true));$('tab-plates').addEventListener('click',()=>switchTab(false));$('plate-prev').addEventListener('click',()=>{if(editions.length){plate=(plate+editions.length-1)%editions.length;renderPlate()}});$('plate-next').addEventListener('click',()=>{if(editions.length){plate=(plate+1)%editions.length;renderPlate()}});$('plate-play').addEventListener('click',()=>{platePlaying=!platePlaying;renderPlate()});
$('play-seraph').addEventListener('click',()=>{switchTab(true);$('presets').firstElementChild.click();$('instrument').scrollIntoView({block:'start',behavior:'auto'});});
loadPlates();noteText();refresh();if(location.hash==='#plates')switchTab(false);

