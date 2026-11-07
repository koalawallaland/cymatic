import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {waxBounds} from './bounds.mjs';
import {refineReferenceItems,referenceNames} from './reference-details.mjs';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const palette = {Pink:'#ff96c8',Blue:'#96c8ff',Purple:'#be96fa',Mint:'#96ebc8',Yellow:'#ffe678',Rainbow:'#fff5fa'};
const rainbow = ['#ff96b4','#ffc882','#fff08c','#96ebbe','#96c8ff','#c3a0fa'];
let color='Pink', sound=true, audio, selected, items=[], model, shell=null, cracked=false;
let pieces=[], flying=[], pressedAt=0, squeezeTime=-10000, lastTime=0, squishes=0;
let renderer, barRenderer, barScene, barCamera;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35,1,.05,100);
camera.position.set(3.7,2.5,6.8); camera.lookAt(0,.1,0);
scene.add(new THREE.HemisphereLight(0xffedfa,0x5b4569,2.8));
const light=new THREE.DirectionalLight(0xffefdf,3.2);light.position.set(3,5,5);scene.add(light);
const rim=new THREE.DirectionalLight(0xc7c9ff,2);rim.position.set(-4,2,-3);scene.add(rim);
const pivot=new THREE.Group();scene.add(pivot);
const floor=new THREE.Mesh(new THREE.CylinderGeometry(2.05,2.1,.16,64),new THREE.MeshStandardMaterial({color:0xbfa1bf,roughness:.62}));
floor.position.y=-1.48;scene.add(floor);
const ring=new THREE.Mesh(new THREE.TorusGeometry(2.05,.025,8,80),new THREE.MeshBasicMaterial({color:0xffb0d6}));ring.rotation.x=Math.PI/2;ring.position.y=-1.39;scene.add(ring);

const say=text=>{$('status').textContent=text;};
const sounds=['9113546532','9113546474','9113547940'].map(id=>new Audio(`assets/wax_${id}.ogg`));
const bigCrack=new Audio('assets/wax_9120826936.ogg');
function playCrack(first=false){if(!sound)return;const a=first?bigCrack:sounds[Math.floor(Math.random()*sounds.length)];a.currentTime=0;a.volume=.42;a.playbackRate=1.1+Math.random()*.3;a.play().catch(()=>{});}
function splat(){
  if(!sound)return;
  try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();
    const length=Math.floor(audio.sampleRate*.18),b=audio.createBuffer(1,length,audio.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/length,2);
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    source.buffer=b;filter.type='lowpass';filter.frequency.setValueAtTime(900,audio.currentTime);filter.frequency.exponentialRampToValueAtTime(100,audio.currentTime+.16);gain.gain.value=.22;
    source.connect(filter).connect(gain).connect(audio.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }catch{}
}
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♪ sound on':'♪ sound off';$('sound').setAttribute('aria-pressed',String(sound));if(!sound)[bigCrack,...sounds].forEach(a=>a.pause());};
for(const [name,value] of Object.entries(palette)){
  const b=document.createElement('button');b.type='button';b.className='color';b.style.background=name==='Rainbow'?`conic-gradient(${rainbow.join(',')},${rainbow[0]})`:value;
  b.setAttribute('aria-label',`${name} wax`);b.setAttribute('aria-pressed',String(name===color));
  b.onclick=()=>{color=name;document.querySelectorAll('.color').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};$('colors').append(b);
}
function releaseShell(){
  for(const p of [...pieces,...flying]){p.removeFromParent();p.geometry.dispose();p.material.dispose();}
  pieces=[];flying=[];if(shell){shell.removeFromParent();shell=null;}cracked=false;
  $('reset').disabled=true;$('dip').disabled=!model;$('squeeze').textContent='Squeeze ♡';
}
function select(item){
  releaseShell();if(model)pivot.remove(model);selected=item;model=new THREE.Group();
  const clone=item.clone(true);model.add(clone);model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(clone),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  clone.position.sub(center);const scale=2.65/Math.max(size.x,size.y,size.z);model.scale.setScalar(scale);model.position.y=-1.39+size.y*scale/2;model.updateMatrixWorld(true);
  pivot.add(model);pivot.scale.set(1,1,1);pivot.rotation.set(0,Math.PI,0);squeezeTime=-10000;
  camera.position.set(...(referenceNames.has(item.name)?[1.1,1.25,8.2]:[3.7,2.5,6.8]));camera.lookAt(0,.1,0);
  $('name').textContent=item.name;$('counter').textContent='soft & ready';
  say('Soft and ready. Tap to squish, or choose a wax color and dip.');
  $('squeeze').disabled=false;$('dip').disabled=false;
  document.querySelectorAll('[data-item]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.item===item.name)));
  try{localStorage.setItem('kwl-squish-choice',item.name);}catch{}
}
function dip(){
  if(!model)return;releaseShell();shell=new THREE.Group();pivot.add(shell);
  pivot.scale.set(1,1,1);squeezeTime=-10000;
  const box=waxBounds(pivot,model),size=box.getSize(new THREE.Vector3());
  // WaxServer uses a rounded coat around multipart toys; preserve that behavior.
  const shellCenter=box.getCenter(new THREE.Vector3());
  const rx=Math.max(size.x/2,.55)*1.15,ry=Math.max(size.y/2,.55)*1.15,rz=Math.max(size.z/2,.55)*1.15;
  for(let y=0;y<10;y++)for(let x=0;x<11;x++){
    const geometry=new THREE.SphereGeometry(1,5,4,x/11*Math.PI*2,Math.PI*2/11,y/10*Math.PI,Math.PI/10);
    geometry.scale(rx,ry,rz);const center=geometry.boundingBox||(geometry.computeBoundingBox(),geometry.boundingBox);
    const c=center.getCenter(new THREE.Vector3());geometry.translate(-c.x,-c.y,-c.z);
    const material=new THREE.MeshPhysicalMaterial({color:color==='Rainbow'?rainbow[(x+y)%6]:palette[color],roughness:.24,metalness:0,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false,clearcoat:.8});
    const p=new THREE.Mesh(geometry,material);p.position.copy(c).add(shellCenter);p.userData.center=c.clone();shell.add(p);pieces.push(p);
  }
  $('counter').textContent='110 wax pieces';$('reset').disabled=false;$('dip').disabled=true;$('squeeze').textContent='Crack the wax ✧';
  say(`${color} wax is set. Give it a squeeze for the first big crack.`);
}
function squeeze(){
  if(!model)return;
  const now=performance.now();if(now-pressedAt<180)return;pressedAt=now;
  if(!shell){squishes++;squeezeTime=now;splat();$('counter').textContent=`${squishes} happy squeeze${squishes===1?'':'s'}`;say('Squeeeze… and let it slowly rise back.');return;}
  if(!cracked){
    cracked=true;playCrack(true);pieces.forEach(p=>{p.scale.setScalar(.955);p.position.addScaledVector(p.userData.center,.025);});
    $('squeeze').textContent='Pop the pieces ♡';say('CRACK! A little mosaic of wax. Keep squeezing to pop the pieces off.');return;
  }
  playCrack();const count=Math.min(pieces.length,12+Math.floor(Math.random()*7));
  for(let i=0;i<count;i++){
    const index=Math.floor(Math.random()*pieces.length),p=pieces.splice(index,1)[0];
    p.userData.velocity=p.userData.center.clone().normalize().multiplyScalar(1.5+Math.random()*2);p.userData.velocity.y+=2.5;
    p.userData.spin=new THREE.Vector3(Math.random()*4,Math.random()*4,Math.random()*4);p.userData.life=0;flying.push(p);
  }
  $('counter').textContent=`${pieces.length} wax pieces left`;
  if(!pieces.length){const old=shell;for(const p of flying)pivot.attach(p);old.removeFromParent();shell=null;cracked=false;$('dip').disabled=false;$('reset').disabled=true;$('squeeze').textContent='Squeeze ♡';say('All revealed! Your soft friend is ready to squish again.');$('counter').textContent='freshly unwrapped ♡';}
  else say(`${pieces.length} pieces to go. Pop, pop, pop…`);
}
$('dip').onclick=dip;$('squeeze').onclick=squeeze;
$('reset').onclick=()=>{releaseShell();$('counter').textContent='soft & ready';say('Wax removed. Ready for another squeeze.');};
$('view').addEventListener('pointerup',squeeze);
$('view').addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)squeeze();}});
$('search').addEventListener('input',()=>{const text=$('search').value.trim().toLowerCase();let shown=0;document.querySelectorAll('[data-item]').forEach(b=>{b.hidden=!b.dataset.item.toLowerCase().includes(text);if(!b.hidden)shown++;});$('empty').hidden=shown>0;});
function resize(){if(!renderer)return;const w=$('stage').clientWidth,h=$('stage').clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function render(now){
  requestAnimationFrame(render);if(!renderer)return;
  const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
  const elapsed=now-squeezeTime;let depth=0;
  if(elapsed>=0&&elapsed<1690)depth=elapsed<90?elapsed/90*.62:.62*(1-(elapsed-90)/1600)**2;
  if(reduced)depth=0;
  pivot.scale.set(1+depth*.55,1-depth,1+depth*.55);pivot.position.y=-depth*1.39;
  for(let i=flying.length-1;i>=0;i--){const p=flying[i];p.userData.life+=dt;p.position.addScaledVector(p.userData.velocity,dt);p.userData.velocity.y-=5*dt;p.rotation.x+=p.userData.spin.x*dt;p.rotation.z+=p.userData.spin.z*dt;p.material.opacity=Math.max(0,.65*(1-p.userData.life/1.5));
    if(p.userData.life>1.5){p.removeFromParent();p.geometry.dispose();p.material.dispose();flying.splice(i,1);}
  }
  renderer.render(scene,camera);
  if(barRenderer&&document.querySelector('details').open){const w=$('bar').clientWidth;if(w&&barRenderer.domElement.width!==Math.round(w*barRenderer.getPixelRatio())){barRenderer.setSize(w,220,false);barCamera.aspect=w/220;barCamera.updateProjectionMatrix();}barRenderer.render(barScene,barCamera);}
}
async function start(){
  try{
    renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;resize();new ResizeObserver(resize).observe($('stage'));requestAnimationFrame(render);
    const response=await fetch('assets/models.gltf.gz');
    if(!response.ok)throw new Error('Models unavailable');
    const decoded=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text();
    const gltf=await new GLTFLoader().parseAsync(decoded,'');
    // Roblox plastic has no metallic response; the export omits this glTF field.
    gltf.scene.traverse(o=>{if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.metalness=0;m.roughness=.5;}});
    const group=gltf.scene.getObjectByName('SquishyItems');
    if(!group)throw new Error('Collection missing');
    items=group.children.filter(x=>x.getObjectByProperty('isMesh',true)||x.isMesh);
    // Loader sanitizes names; restore the exact display names from the export.
    const original=await (await fetch('assets/catalog.json')).json();
    for(let i=0;i<items.length;i++)items[i].name=original[i];
    refineReferenceItems(items);
    $('total').textContent=`${items.length} friends`;
    for(const item of items){const b=document.createElement('button');b.type='button';b.textContent=item.name;b.dataset.item=item.name;b.setAttribute('aria-pressed','false');b.onclick=()=>select(item);$('collection').append(b);}
    let saved;try{saved=localStorage.getItem('kwl-squish-choice');}catch{}
    select(items.find(i=>i.name===saved)||items.find(i=>i.name==='Butter Squishy')||items[0]);$('loading').hidden=true;
    const bar=gltf.scene.getObjectByName('WaxBar');
    if(bar){barScene=new THREE.Scene();barScene.add(new THREE.HemisphereLight(0xfff1fa,0x83709c,3));const l=light.clone();barScene.add(l);
      const b=bar.clone(true),holder=new THREE.Group();holder.add(b);const box=new THREE.Box3().setFromObject(b),size=box.getSize(new THREE.Vector3());b.position.sub(box.getCenter(new THREE.Vector3()));holder.scale.setScalar(4/Math.max(size.x,size.y,size.z));holder.rotation.y=Math.PI;barScene.add(holder);
      barCamera=new THREE.PerspectiveCamera(40,1,.1,100);barCamera.position.set(3,2.1,5.5);barCamera.lookAt(0,0,0);
      barRenderer=new THREE.WebGLRenderer({canvas:$('bar'),antialias:true,alpha:true});barRenderer.setPixelRatio(Math.min(devicePixelRatio,2));barRenderer.setSize(300,220,false);
    }
  }catch(error){console.error(error);$('loading').textContent='The squishies couldn’t load. Please refresh to try again.';say('Please use a browser with 3D graphics enabled.');}
}
start();
