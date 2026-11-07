export function createKitchenAudio(enabled){
 let context,unlocked=true,pouring=false,closed=false;
 const pour=new Audio(new URL('../desk/audio/pour-over.mp3',import.meta.url).href),simmer=new Audio(new URL('../desk/audio/kettle-simmer.mp3',import.meta.url).href),fades=new Map();
 pour.preload='auto';pour.loop=true;pour.volume=0;simmer.preload='auto';simmer.loop=true;simmer.volume=0;
 function ramp(audio,target,seconds=.2,pause=false){clearInterval(fades.get(audio));const initial=audio.volume,start=performance.now();const timer=setInterval(()=>{const t=Math.min(1,(performance.now()-start)/(seconds*1000));audio.volume=Math.max(0,Math.min(1,initial+(target-initial)*t));if(t===1){clearInterval(timer);fades.delete(audio);if(pause&&target===0)audio.pause();}},20);fades.set(audio,timer);}
 function sync(){if(closed)return;const on=enabled()&&!document.hidden&&unlocked;if(!on){ramp(simmer,0,.12,true);if(pouring)stopPour();return;}if(simmer.paused)simmer.play().then(()=>ramp(simmer,pouring?.035:.09,.5)).catch(()=>{});else ramp(simmer,pouring?.035:.09,.3);}
 function unlock(){unlocked=true;sync();}
 function tap(kind){if(!enabled()||closed)return;unlocked=true;try{context ||=new(window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime,freq={switch:720,lift:350,glass:1580,sip:460,paper:180}[kind]||350;oscillator.type=kind==='switch'?'triangle':'sine';oscillator.frequency.setValueAtTime(freq,now);oscillator.frequency.exponentialRampToValueAtTime(freq*.7,now+.12);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(kind==='glass'?.025:.018,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+.18);oscillator.connect(gain).connect(context.destination);oscillator.start();oscillator.stop(now+.2);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}catch{}sync();}
 function startPour(){if(pouring||!enabled()||closed)return;pouring=true;unlocked=true;clearInterval(fades.get(pour));pour.currentTime=.02;pour.volume=0;pour.play().then(()=>{if(pouring&&enabled())ramp(pour,.4,.09);else pour.pause();}).catch(()=>{});sync();}
 function stopPour(){pouring=false;ramp(pour,0,.18,true);syncSimmer();}
 function syncSimmer(){if(!closed&&unlocked&&enabled()&&!simmer.paused)ramp(simmer,.09,.4);}
 const observe=()=>{document.querySelector('[data-scene]')?.setAttribute('data-kitchen-pouring',String(!pour.paused));document.querySelector('[data-scene]')?.setAttribute('data-kitchen-simmer',String(!simmer.paused));};
 for(const audio of[pour,simmer]){audio.addEventListener('playing',observe);audio.addEventListener('pause',observe);}
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('pointerup',unlock);document.addEventListener('keydown',unlock,{once:true});document.addEventListener('visibilitychange',sync);
 sync();const interval=setInterval(sync,500);
 return{tap,startPour,stopPour,close(){closed=true;clearInterval(interval);for(const t of fades.values())clearInterval(t);fades.clear();pour.pause();simmer.pause();context?.close().catch(()=>{});document.removeEventListener('visibilitychange',sync);document.removeEventListener('pointerdown',unlock,{capture:true});document.removeEventListener('pointerup',unlock);document.removeEventListener('keydown',unlock);}};
}

