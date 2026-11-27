export function initSounds(){
 const $=id=>document.getElementById(id),toggle=$('boba-sound'),volume=$('boba-volume'),file=$('boba-sound-file'),status=$('boba-sound-status'),remove=$('boba-sound-remove');
 if(!toggle||!volume||!file)return {play(){}};
 let url='',player=null,last=0,on=false,db=null;
 const display=t=>status.textContent=t;
 function setEnabled(enabled){on=enabled;toggle.setAttribute('aria-pressed',String(on));toggle.textContent=on?'🔊 Dog sounds on':'🔇 Dog sounds off';if(!on)player?.pause();}
 function setClip(blob){
   player?.pause();if(url)URL.revokeObjectURL(url);
   url=URL.createObjectURL(blob);player=new Audio(url);player.preload='none';
   toggle.disabled=false;remove.disabled=false;display('Boba’s recording is ready. Turn sounds on to hear it.');
 }
 async function openDB(){
   if(!('indexedDB' in window))return;
   await new Promise(resolve=>{const req=indexedDB.open('boba-personal-sound',1);req.onupgradeneeded=()=>req.result.createObjectStore('clips');req.onerror=resolve;req.onsuccess=()=>{db=req.result;const get=db.transaction('clips').objectStore('clips').get('boba');get.onsuccess=()=>{if(get.result instanceof Blob&&!url)setClip(get.result);resolve();};get.onerror=resolve;};});
 }
 function saveClip(blob){if(!db)return;try{const store=db.transaction('clips','readwrite').objectStore('clips');if(blob)store.put(blob,'boba');else store.delete('boba');}catch{}}
 function play(action='talk'){
   if(!on||!player||!['talk','wag','fetch','paw'].includes(action)||Date.now()-last<2500)return;
   last=Date.now();player.volume=Number(volume.value)/100;player.currentTime=0;player.play().catch(()=>display('Tap Dog sounds on again to allow audio.'));
 }
 toggle.addEventListener('click',()=>{setEnabled(!on);if(on)play();});
 volume.addEventListener('input',()=>{if(player)player.volume=Number(volume.value)/100;});
 file.addEventListener('change',()=>{
   const blob=file.files?.[0];file.value='';if(!blob)return;
   if(!blob.type.startsWith('audio/')||blob.size>8*1024*1024){display('Choose a short audio file (MP3, M4A or WAV; up to 8 MB).');return;}
   const probe=new Audio(),temp=URL.createObjectURL(blob);
   probe.onloadedmetadata=()=>{URL.revokeObjectURL(temp);if(!Number.isFinite(probe.duration)||probe.duration>15){display('Choose a clip 15 seconds or shorter, with only Boba’s sounds.');return;}setEnabled(false);setClip(blob);saveClip(blob);};
   probe.onerror=()=>{URL.revokeObjectURL(temp);display('This audio could not play. Please try MP3 or WAV.');};probe.src=temp;
 });
 remove.addEventListener('click',()=>{setEnabled(false);player?.pause();if(url)URL.revokeObjectURL(url);url='';player=null;toggle.disabled=true;remove.disabled=true;saveClip(null);display('Choose a short recording of Boba to add his real voice.');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)player?.pause();});
 openDB().catch(()=>{});
 return {play};
}
