// All conversation text is local, scripted, and never sent to a voice service.
const KEY='boba-speaking-voice-v2';
const maleNames=/\b(Alex|Aaron|Tom|Daniel|Oliver|Arthur|Gordon|Jamie|Nathan|Evan|Liam|Lee|Rishi|Russell|Bruce|Ralph|David|Mark|Guy|Ryan|Christopher|Andrew|Brian|Eric|Jasper|Roger|Steffan|Tony|Davis|Jason|Matthew|Michael|James|George|William|Thomas|Cameron|Reed|Sean|Fred|Alistair)\b/i;
const explicitlyFemale=/\b(female|woman|Samantha|Ava|Karen|Victoria|Serena|Fiona|Tessa|Jessica|Allison|Susan|Salli|Joanna|Zira|Jenny|Aria|Emma|Kate|Emily|Salli|Moira)\b/i;
export const previewLine='Hey there, buddy! I’m Boba. I’m so happy to see you. Want to play fetch?';
export function cleanSpeech(text){
  return String(text).normalize('NFKC').replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu,'').replace(/\s+/g,' ').replace(/\bHiii+!*/gi,'Hi!').replace(/\bOoooh[,! ]*/gi,'Oh, ').replace(/\bAaaah[.… ]*/gi,'Ah, ').replace(/\bYaaawn\.?/gi,'I’m sleepy.').replace(/\bFETCH!\b/g,'fetch!').trim();
}
export function voiceScore(v){
 if(v.localService===false||!/^en(?:[-_]|$)/i.test(v.lang||''))return -100;
 const name=(v.name||'')+' '+(v.voiceURI||'');
 if(explicitlyFemale.test(name))return -5;
 if(!maleNames.test(name)&&!/\bmale\b|\bman\b/i.test(name))return 0;
 let score=35;
 if(/enhanced|premium|natural/i.test(name))score+=45;
 if(/\b(Aaron|Alex|Tom|Nathan|Evan|Liam|Daniel|Oliver|Ryan|Guy|Andrew|Brian|Arthur)\b/i.test(name))score+=24;
 if(/^en[-_]US$/i.test(v.lang))score+=10;
 if(/\bFred\b|\bRalph\b|\bBruce\b/i.test(name))score-=28;
 return score;
}
export function initVoice({toggle,picker,preview,status}){
 const synth=window.speechSynthesis;
 let enabled=false,chosen=null,voiceList=[],player=null,bank=null,lastText='',activeToken=0;
 let preferred='auto';try{preferred=localStorage.getItem(KEY)||'auto'}catch{}
 const setStatus=s=>{status.textContent=s;};
 // Preload the small, local synthetic fallback. It is only used when needed or chosen.
 import('./boba-voice-bank.mjs').then(m=>{bank=m.clips;refresh();}).catch(()=>{});
 function cancel(){activeToken++;synth?.cancel();player?.pause();player=null;}
 function refresh(){
   voiceList=(synth?.getVoices?.()||[]).filter(v=>voiceScore(v)>=-5).sort((a,b)=>voiceScore(b)-voiceScore(a)||a.name.localeCompare(b.name));
   if(preferred!=='auto'&&preferred!=='basic'&&!voiceList.some(v=>v.voiceURI===preferred))preferred='auto';
   const automatic=voiceList.find(v=>voiceScore(v)>0)||null;
   chosen=preferred==='auto'?automatic:preferred==='basic'?null:voiceList.find(v=>v.voiceURI===preferred)||null;
   picker.replaceChildren();
   const option=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;picker.append(o);};
   option('auto',automatic?'Warm boy • '+automatic.name:'Automatic • offline boy');
   option('basic','Basic boy • offline');
   for(const v of voiceList)option(v.voiceURI,v.name+(voiceScore(v)>0?' · boy':' · preview'));
   picker.value=preferred;
   const mode=chosen?chosen.name:'Basic offline boy';
   setStatus(mode+' · Tap Listen to hear him.');
   toggle.disabled=false;
   preview.disabled=false;
 }
 function fallback(text,token){
   if(token!==activeToken||!enabled&&text!==previewLine)return;
   const url=bank?.[text]||bank?.[cleanSpeech(text)]||bank?.[previewLine];
   if(!url){setStatus('Voice is loading. Tap Listen again in a moment.');return;}
   player=new Audio(url);player.volume=.85;player.play().catch(()=>setStatus('Tap Listen to allow sound on this device.'));
 }
 function play(text,force=false){
   if(!force&&!enabled)return;
   cancel();lastText=text;const token=activeToken;
   // Refresh voice availability after the initial user gesture without substituting a female default.
   refresh();
   if(chosen&&synth&&typeof SpeechSynthesisUtterance==='function'){
     const utterance=new SpeechSynthesisUtterance(cleanSpeech(text));
     utterance.voice=chosen;utterance.lang=chosen.lang;utterance.rate=.94;utterance.pitch=.96;utterance.volume=.86;
     utterance.onerror=()=>{if(token===activeToken){setStatus('Device voice could not play. Using the offline boy voice.');fallback(text,token);}};
     synth.speak(utterance);
   }else fallback(text,token);
 }
 function render(){toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent=enabled?'🔊 Voice on':'🔇 Voice off';}
 toggle.addEventListener('click',()=>{enabled=!enabled;render();if(enabled)play(lastText||previewLine);else cancel();});
 preview.addEventListener('click',()=>{enabled=true;render();play(previewLine,true);});
 picker.addEventListener('change',()=>{preferred=picker.value;try{localStorage.setItem(KEY,preferred)}catch{};enabled=true;render();play(previewLine,true);});
 synth?.addEventListener?.('voiceschanged',refresh);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else refresh();});
 refresh();render();
 return {speak:play,cancel};
}
