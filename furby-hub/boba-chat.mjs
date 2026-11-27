import {respond} from './boba-dialogue.mjs?v=4';
import {buildBoba} from './boba-renderer.mjs?v=8';
import {initCare} from './boba-care.mjs';
import {initAR} from './boba-ar.mjs?v=8';
import {initSounds} from './boba-sounds.mjs';
import {initVoice} from './boba-voice.mjs?v=4';
const $=id=>document.getElementById(id);
const root=$('boba-corner'), stage=$('boba-stage'), log=$('boba-log'), input=$('boba-input'), status=$('boba-status');
if(root && stage && log && input && status){
  const speech=$('boba-voice'), fallback=$('boba-fallback');
  const bobaVoice=initVoice({toggle:speech,picker:$('boba-voice-picker'),preview:$('boba-voice-preview'),status:$('boba-voice-status')});
  let ar=null,care=null;const sounds=initSounds();
  let rig=null, last='', lastReply='', actionTimer=0;
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
    rig?.play(action);ar?.play(action);sounds.play(action);
    clearTimeout(actionTimer);
    actionTimer=setTimeout(()=>{stage.dataset.action='idle';status.textContent=labels.idle;rig?.play('idle');},2600);
  }
  function speak(text){bobaVoice.speak(text);}
  function send(raw){
    const value=raw.trim().slice(0,200);if(!value)return;
    const reply=respond(value,last);if(!reply)return;
    // Don't echo likely private info or distress disclosures into the transcript.
    say(['private','help'].includes(reply.key)?'Message sent':value,'me');
    last=reply.key;lastReply=reply.text;
    say(reply.text);act(reply.action);speak(reply.text);
  }
  $('boba-form').addEventListener('submit',event=>{event.preventDefault();send(input.value);input.value='';});
  root.querySelectorAll('[data-boba-prompt]').forEach(button=>button.addEventListener('click',()=>{send(button.dataset.bobaPrompt);if(button.dataset.bobaPrompt==='Pet Boba')care?.interact('pet');if(button.dataset.bobaPrompt==='Play fetch')care?.interact('fetch');}));
  stage.addEventListener('click',()=>{send('Pet Boba');care?.interact('pet');});
  care=initCare({act,say,speak});
  ar=initAR({onPet:()=>{send('Pet Boba');care?.interact('pet');},onPaw:()=>send('High five!'),onFetch:()=>{send('Play fetch');care?.interact('fetch');}});
  $('boba-clear').addEventListener('click',()=>{
    bobaVoice.cancel();last='';lastReply='';log.replaceChildren();input.value='';
    say('Woof! I’m virtual Boba. Come sit with me!');act('idle');
  });
  say('Hey, buddy! I’m Boba. Want to chat, play fetch, or give me a paw?');
  // Prefer the articulated 3D dog; the previous realistic portrait is a graceful fallback.
  $('boba-turn-left').addEventListener('click',()=>rig?.turn?.(-Math.PI/4));$('boba-turn-right').addEventListener('click',()=>rig?.turn?.(Math.PI/4));
  let loading=false;
  async function initRig(){
    if(loading)return;loading=true;
    try{
      rig=await buildBoba(stage,{rotateGesture:true});fallback.hidden=true;stage.dataset.rig=rig.kind;
      $('boba-view-status').textContent=rig.kind==='3d'?'3D Boba · drag to turn, tap to pet':'Animated portrait · 3D unavailable on this device';
      $('boba-turn-left').disabled=rig.kind!=='3d';$('boba-turn-right').disabled=rig.kind!=='3d';
      if(stage.dataset.action!=='idle')rig.play(stage.dataset.action);
    }catch{stage.dataset.rig='fallback';}
  }
  if('IntersectionObserver' in window){
    const visibility=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){visibility.disconnect();initRig();}},{rootMargin:'150px'});
    visibility.observe(stage);
  }else initRig();
}
