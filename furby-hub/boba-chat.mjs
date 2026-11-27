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
  function findVoice(){
    const voices=synth?.getVoices?.()||[];
    voice=voices.find(v=>v.localService&&/^en/i.test(v.lang)&&/Samantha|Ava|Karen|Google US English/i.test(v.name))
      || voices.find(v=>v.localService&&/^en/i.test(v.lang))||null;
    speech.disabled=!voice;
    if(!voice){speech.setAttribute('aria-pressed','false');speech.textContent='Voice unavailable';}
    else if(speech.getAttribute('aria-pressed')!=='true')speech.textContent='Voice off';
  }
  function speak(text){
    if(!voice||speech.getAttribute('aria-pressed')!=='true')return;
    synth.cancel();
    const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.87;utterance.pitch=1.18;
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
