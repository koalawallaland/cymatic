import {buildBoba} from './boba-renderer.mjs?v=5';
export function initAR({onPet,onPaw,onFetch}){
 const $=id=>document.getElementById(id);
 const dialog=$('boba-ar'),launch=$('boba-ar-launch'),video=$('boba-ar-video'),world=$('boba-ar-world'),dog=$('boba-ar-dog'),hint=$('boba-ar-hint'),size=$('boba-ar-size');
 if(!dialog||!launch)return null;
 let rig=null,loading=null,stream=null,generation=0,placing=false,petStart=null,lastPet=0,priorFocus=null,open=false;
 const say=t=>{hint.textContent=t};
 function stopCamera(){generation++;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}video.srcObject=null;world.dataset.camera='off';}
 function close(){open=false;stopCamera();placing=false;petStart=null;dialog.hidden=true;document.body.classList.remove('boba-ar-open');priorFocus?.focus();if(dialog.open)dialog.close();}
 async function camera(){
   stopCamera();const token=generation;
   if(!navigator.mediaDevices?.getUserMedia){say('Camera is unavailable here. You can still play in preview mode.');return;}
   say('Ask a grown-up before allowing the camera.');
   try{
     const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
     if(token!==generation||!open){next.getTracks().forEach(t=>t.stop());return;}
     stream=next;video.srcObject=stream;await video.play();
     if(token!==generation||!open)return;
     world.dataset.camera='on';say('Tap Move Boba, then tap a spot. Stroke his fluffy coat to pet him!');
   }catch(err){if(token===generation){stopCamera();say('Camera unavailable or permission declined. Try Safari/Chrome, or enjoy preview mode.');}}
 }
 function pet(){
   if(!open||placing||Date.now()-lastPet<650)return;
   lastPet=Date.now();rig?.play('cuddle');dog.dataset.action='cuddle';onPet();
   say('💗 Boba loved that gentle pat! Try another, or give him a break.');
   dog.classList.remove('boba-petted');void dog.offsetWidth;dog.classList.add('boba-petted');
 }
 function position(x,y){const r=world.getBoundingClientRect();const cx=Math.max(20,Math.min(80,100*(x-r.left)/r.width));const cy=Math.max(40,Math.min(83,100*(y-r.top)/r.height));dog.style.left=cx+'%';dog.style.top=cy+'%';}
 function setPlace(on){placing=on;$('boba-ar-place').setAttribute('aria-pressed',String(on));say(on?'Tap an open spot to place Boba. Stay still and watch your surroundings.':'Pet Boba gently with your finger.');}
 launch.addEventListener('click',()=>{
   if(open)return;open=true;priorFocus=document.activeElement;dialog.hidden=false;
   if(typeof dialog.showModal==='function')dialog.showModal();document.body.classList.add('boba-ar-open');
   placing=false;$('boba-ar-place').setAttribute('aria-pressed','false');say('Preview mode. Turn on the camera with a grown-up to see Boba in your room.');
   if(!loading){loading=buildBoba(dog,{rotateGesture:false}).then(r=>{rig=r;$('boba-ar-fallback').hidden=true;dog.dataset.rig=r.kind;$('boba-ar-turn').disabled=r.kind!=='3d';$('boba-ar-mode').textContent=r.kind==='3d'?'3D camera play · stay in a safe spot':'Portrait camera play · stay in a safe spot';}).catch(()=>{loading=null;});}
   $('boba-ar-close').focus();
 });
 $('boba-ar-close').addEventListener('click',close);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 dialog.addEventListener('close',()=>{if(open)close()});
 $('boba-ar-camera').addEventListener('click',()=>{if(stream){stopCamera();say('Camera off. You can still play in preview mode.');}else camera();});
 $('boba-ar-place').addEventListener('click',()=>setPlace(!placing));
 $('boba-ar-turn').addEventListener('click',()=>{rig?.turn?.(Math.PI/3);say('There’s Boba from another angle! Stroke his coat to pet him.');});
 $('boba-ar-center').addEventListener('click',()=>{dog.style.left='50%';dog.style.top='73%';setPlace(false);});
 size.addEventListener('input',()=>dog.style.setProperty('--ar-dog-width',size.value+'%'));
 world.addEventListener('pointerdown',e=>{if(placing){position(e.clientX,e.clientY);setPlace(false);}});
 dog.addEventListener('pointerdown',e=>{if(placing)return;e.stopPropagation();petStart={x:e.clientX,y:e.clientY};dog.setPointerCapture?.(e.pointerId);pet();});
 dog.addEventListener('pointermove',e=>{if(!petStart||placing)return;if(Math.hypot(e.clientX-petStart.x,e.clientY-petStart.y)>23){petStart={x:e.clientX,y:e.clientY};pet();}});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])dog.addEventListener(ev,()=>petStart=null);
 $('boba-ar-pet').addEventListener('click',pet);
 $('boba-ar-paw').addEventListener('click',()=>{rig?.play('paw');onPaw();say('🐾 High five!');});
 $('boba-ar-fetch').addEventListener('click',()=>{rig?.play('fetch');onFetch();say('🎾 Fetch! Give Boba a break after playing.');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&open){stopCamera();say('Camera paused when you left. Turn it on again when ready.');}});
 window.addEventListener('pagehide',stopCamera);
 return {play(action){if(open)rig?.play(action);}};
}
