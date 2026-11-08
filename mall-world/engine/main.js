// Rendering and Player foundation adapted from Toby D's MIT Backrooms simulator.
import * as THREE from 'three';import {World,EYE} from './world.js';import {Player} from './player.js';
const $=id=>document.getElementById(id);let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'default'})}catch(e){$('introText').textContent='This browser could not start 3D graphics. Try opening in Safari with WebGL available.';$('enter').disabled=true;throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1:1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMappingExposure=1.25;$('view').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#191a27');scene.fog=new THREE.Fog('#262331',32,110);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,200);const world=new World(scene,1337,renderer.capabilities.getMaxAnisotropy());const player=new Player(camera,renderer.domElement,world);player.attach();
scene.add(new THREE.HemisphereLight('#f0d9e6','#6d6b65',1.8));const light=new THREE.PointLight('#f8e9de',12,12);scene.add(light);
const mobile=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;let active=false;
function pause(){active=false;player.locked=false;player.keys.clear();$('intro').hidden=false;$('touch').hidden=true;if(document.pointerLockElement)document.exitPointerLock()}
function enter(){active=true;$('intro').hidden=true;if(mobile){player.locked=true;$('touch').hidden=false}else {player.lock();setTimeout(()=>{if(active&&!document.pointerLockElement){pause();$('introText').textContent='Mouse capture was unavailable. Tap Enter again, or use a touch device.'}},700)}}
$('enter').onclick=enter;$('pause').onclick=pause;document.addEventListener('pointerlockchange',()=>{if(!mobile&&!document.pointerLockElement&&active)pause()});
$('nightmare').onchange=()=>world.setNightmare($('nightmare').checked);
const positions={atrium:[0,16],toilets:[18,0],hotel:[-20,0],tokyo:[0,-30]};
$('destination').onchange=()=>{const p=positions[$('destination').value];player.pos.set(p[0],EYE,p[1]);player.vel.set(0,0,0);player.keys.clear();player.yaw=0};
let moving=null,looking=null;
const pad=$('move'),look=$('look');
pad.onpointerdown=e=>{moving={id:e.pointerId,x:e.clientX,y:e.clientY};pad.setPointerCapture(e.pointerId);e.preventDefault()};
pad.onpointermove=e=>{if(!moving||moving.id!==e.pointerId)return;const dx=e.clientX-moving.x,dy=e.clientY-moving.y;for(const k of ['KeyW','KeyS','KeyA','KeyD'])player.keys.delete(k);if(dy< -12)player.keys.add('KeyW');if(dy>12)player.keys.add('KeyS');if(dx< -12)player.keys.add('KeyA');if(dx>12)player.keys.add('KeyD');$('thumb').style.transform='translate('+Math.max(-35,Math.min(35,dx))+'px,'+Math.max(-35,Math.min(35,dy))+'px)'};
function release(){moving=null;player.keys.clear();$('thumb').style.transform='none'}pad.onpointerup=release;pad.onpointercancel=release;
look.onpointerdown=e=>{looking={id:e.pointerId,x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId)};
look.onpointermove=e=>{if(!looking||looking.id!==e.pointerId)return;player.yaw-=(e.clientX-looking.x)*.004;player.pitch-=(e.clientY-looking.y)*.004;player.pitch=Math.max(-1.3,Math.min(1.3,player.pitch));looking.x=e.clientX;looking.y=e.clientY};
look.onpointerup=look.onpointercancel=()=>looking=null;
addEventListener('blur',()=>{release();looking=null});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const clock=new THREE.Clock();let lastZone='';
let frame=0;function animate(){frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(active){player.update(dt);world.updateFlicker(clock.elapsedTime)}else{camera.position.copy(player.pos);camera.rotation.set(player.pitch,player.yaw,0)}
light.position.copy(camera.position);let zone=player.pos.z< -24?'TOKYO / NIGHT GALLERY':player.pos.x>16?'TOILET WORLD':player.pos.x< -16?'HOTEL LOBBY':'THE ATRIUM';if(zone!==lastZone){$('zone').textContent=zone;lastZone=zone}renderer.render(scene,camera)}animate();
$('enter').disabled=false;$('introText').textContent=mobile?'Left thumb to walk. Drag the right side to look.':'WASD to walk. Mouse to look. Escape to pause.';

renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);pause();$('introText').textContent='3D graphics paused. Tap Reload to reconnect.';$('enter').disabled=false;$('enter').textContent='Reload';$('enter').onclick=()=>location.reload()});
