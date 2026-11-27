import {respond} from './boba-dialogue.mjs';
import {buildBoba} from './boba-realistic.mjs';
const $=id=>document.getElementById(id);
const root=$('boba-corner'), stage=$('boba-stage'), log=$('boba-log'), input=$('boba-input'), status=$('boba-status');
if(root && stage && log && input && status){
  const speech=$('boba-voice'), fallback=$('boba-fallback');
  const synth=window.speechSynthesis;
  let rig=null, last='', lastReply='', actionTimer=0, voice=null;
  const labels={idle:'Ready for a visit',wag:'Happy tail wag!',cuddle:'Fluffy cuddles',paw:'Paw up!',fetch:'Fetch!',treat:'Nom nom!',walk:'Pitter-patter!',sit:'Good dog!',rest:'Sleepy puppy',talk:'Woof woof!',quiet:'Quiet little paw'};
  function say(text,who='dog'){
    const p=document.createElement('p');
    p.className='boba-msg '+who;
    const tag=document.createElement('strong');
    tag.textContent=who==='dog'?'BOBA':'YOU';
    p.append(tag,document.createTextNode(text));
    log.append(p);while(log.children.length>40)log.firstElementChild.remove();
    log.scrollTop=log.scrollHeight;
  }
  function act(action){
    stage.dataset.action=action;status.textContent=labels[action]||labels.idle;
    rig?.play(action);
    clearTimeout(actionTimer);
    actionTimer=setTimeout(()=>{stage.dataset.action='idle';status.textContent=labels.idle;rig?.play('idle');},2600);
  }
  // Prefer a natural on-device male English voice; never fall back silently to a female voice.
  const maleNames=/\b(Alex|Aaron|Tom|Daniel|Oliver|Arthur|Gordon|Jamie|Nathan|Evan|Liam|Lee|Rishi|Russell|Bruce|Ralph|David|Mark|Guy|Ryan|Christopher|Andrew|Brian|Eric|Jasper|Roger|Steffan|Tony|Davis|Jason|Matthew|Michael|James|George|William|Thomas|Cameron|Reed|Sean|Fred)\b/i;
  function maleVoiceScore(v){
    if(!v.localService||!/^en(?:[-_]|$)/i.test(v.lang)||/\bfemale\b|\bwoman\b/i.test(v.name))return -1;
    if(!maleNames.test(v.name)&&!/\bmale\b|\bman\b/i.test(v.name))return -1;
    let score=30;
    if(/\b(Aaron|Alex|Tom|Nathan|Evan|Liam|Daniel|Oliver|Ryan|Guy|Andrew|Brian)\b/i.test(v.name))score+=16;
    if(/enhanced|premium|natural|neural/i.test(v.name))score+=35;
    if(/^en[-_]US$/i.test(v.lang))score+=12;
    if(/\bFred\b|\bRalph\b/i.test(v.name))score-=25;
    return score;
  }
  const voicePicker=document.createElement('select');
  voicePicker.setAttribute('aria-label',"Choose Boba's boy voice");
  voicePicker.title="Choose Boba's boy voice";
  voicePicker.style.cssText='font:inherit;font-size:12px;max-width:100%;color:#f4f1ff;background:#261c43;border:1px solid #8679ab;border-radius:12px;padding:7px 9px';
  voicePicker.hidden=true;
  speech.insertAdjacentElement('afterend',voicePicker);
  function findVoice(){
    const choices=(synth?.getVoices?.()||[]).map(v=>({v,score:maleVoiceScore(v)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score).map(x=>x.v);
    const previous=voice?.voiceURI;
    voice=choices.find(v=>v.voiceURI===previous)||choices[0]||null;
    voicePicker.replaceChildren(...choices.map(v=>{
      const option=document.createElement('option');
      option.value=v.voiceURI;option.textContent=v.name;return option;
    }));
    voicePicker.hidden=choices.length<2;
    if(voice)voicePicker.value=voice.voiceURI;
    voicePicker.onchange=()=>{
      voice=choices.find(v=>v.voiceURI===voicePicker.value)||voice;
      if(speech.getAttribute('aria-pressed')==='true')speak('Woof! Hi there, buddy!');
    };
    speech.disabled=!voice;
    if(!voice){speech.setAttribute('aria-pressed','false');speech.textContent='Boy voice unavailable';speech.title='Install a male English speaking voice in your device settings.';}
    else {speech.title='Boba speaks using a private on-device boy voice.';if(speech.getAttribute('aria-pressed')!=='true')speech.textContent='Voice off';}
  }
  function speak(text){
    if(!voice||speech.getAttribute('aria-pressed')!=='true')return;
    synth.cancel();
    const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.96;utterance.pitch=.97;
    synth.speak(utterance);
  }
  function send(raw){
    const value=raw.trim().slice(0,200);if(!value)return;
    const reply=respond(value,last);if(!reply)return;
    // Don't echo likely private info or distress disclosures into the transcript.
    say(['private','help'].includes(reply.key)?'Message sent':value,'me');
    last=reply.key;lastReply=reply.text;
    say(reply.text);act(reply.action);speak(reply.text);
  }
  $('boba-form').addEventListener('submit',event=>{event.preventDefault();send(input.value);input.value='';});
  root.querySelectorAll('[data-boba-prompt]').forEach(button=>button.addEventListener('click',()=>send(button.dataset.bobaPrompt)));
  stage.addEventListener('click',()=>send('Pet Boba'));
  $('boba-clear').addEventListener('click',()=>{
    if(voice)synth.cancel();last='';lastReply='';log.replaceChildren();input.value='';
    say('Woof! I’m virtual Boba. Come sit with me!');act('idle');
  });
  speech.addEventListener('click',()=>{
    if(!voice)return;const on=speech.getAttribute('aria-pressed')!=='true';
    speech.setAttribute('aria-pressed',String(on));speech.textContent=on?'Voice on':'Voice off';
    if(!on)synth.cancel();else speak(lastReply||'Woof! I’m virtual Boba.');
  });
  findVoice();synth?.addEventListener?.('voiceschanged',findVoice);
  say('Woof! I’m virtual Boba. Want to chat, play fetch, or give me a paw?');
  // Load the recovered photo-like 2D character; no WebGL, camera, or microphone.
  let loading=false;
  async function initRig(){
    if(loading)return;loading=true;
    try{
      rig=await buildBoba(stage);fallback.hidden=true;stage.dataset.rig='ready';
      if(stage.dataset.action!=='idle')rig.play(stage.dataset.action);
    }catch{stage.dataset.rig='fallback';}
  }
  if('IntersectionObserver' in window){
    const visibility=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){visibility.disconnect();initRig();}},{rootMargin:'150px'});
    visibility.observe(stage);
  }else initRig();
}
