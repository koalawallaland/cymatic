/* Optional, original synthesized desk sound effects. No external audio files. */
(()=>{
 const root=document.querySelector('keycap-board');
 if(!root)return;
 const toggle=document.createElement('button');
 toggle.type='button';toggle.textContent='✧ little sounds off';
 toggle.setAttribute('aria-label','Toggle magical desk sounds');
 toggle.setAttribute('aria-pressed','false');
 toggle.style.cssText='position:fixed;right:12px;bottom:calc(66px + env(safe-area-inset-bottom));z-index:10000;background:#fff1fa;color:#573d62;border:1px solid #caa9d4;border-radius:20px;padding:7px 11px;font:600 12px system-ui;box-shadow:0 2px 8px #30203833;cursor:pointer';
 document.body.append(toggle);
 let enabled=false,ctx,last=0;
 toggle.addEventListener('click',()=>{
  enabled=!enabled;toggle.setAttribute('aria-pressed',String(enabled));
  toggle.textContent=enabled?'✧ little sounds on':'✧ little sounds off';
  if(enabled){try{ctx ||= new (window.AudioContext||window.webkitAudioContext)();ctx.resume().catch(()=>{});}catch{}}
 });
 function chirp(type){
  if(!enabled)return;
  const now=performance.now();if(now-last<115)return;last=now;
  try{
   ctx ||= new (window.AudioContext||window.webkitAudioContext)();
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
   const t=ctx.currentTime+.005,o=ctx.createOscillator(),g=ctx.createGain();
   const bubble=type==='bubble',f=bubble?330+Math.random()*170:1050+Math.random()*360,d=bubble?.15:.35;
   o.type=bubble?'sine':'triangle';o.frequency.setValueAtTime(f,t);
   o.frequency.exponentialRampToValueAtTime(bubble?f*1.7:f*.65,t+d);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(bubble?.035:.022,t+.012);
   g.gain.exponentialRampToValueAtTime(.0001,t+d);
   o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+d+.01);
   o.onended=()=>{o.disconnect();g.disconnect();};
  }catch{}
 }
 // Keycap board and tray: bubble on interaction; sparkles on drops/placement.
 root.addEventListener('pointerup',e=>{
  if(e.target.closest('button,[role="button"],.keycap,.cap,.key'))chirp('bubble');
 },{passive:true});
 root.addEventListener('keyup',e=>{
  if(e.key==='Enter'||e.key===' ')chirp('bubble');
 });
 root.addEventListener('drop',()=>chirp('star'));
 // Mirror and navigational portals get a quieter twinkle on activation.
 document.addEventListener('click',e=>{
  const el=e.target.closest('a,button');if(!el||el===toggle||root.contains(el))return;
  const hint=((el.getAttribute('href')||'')+' '+(el.getAttribute('aria-label')||'')+' '+(el.textContent||'')).toLowerCase();
  if(/mirror|portal|mall.world|resin.lab|experiment/.test(hint))chirp('star');
 });
})();
