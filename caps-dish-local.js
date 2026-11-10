/* Local-only cap collection: GitHub Pages has no shared write backend.
   Displays casts saved by lab/index.html on this browser; no visitor data is transmitted. */
(()=>{'use strict';
const KEY='kwl-caps';
function show(){
 const dish=document.querySelector('[data-tray-name="pink eye dish"]');
 if(!dish)return;
 dish.querySelectorAll('[data-local-cast]').forEach(e=>e.remove());
 let caps=[];try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(x))caps=x.filter(v=>v&&typeof v.img==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(v.img)).slice(0,8)}catch(_){}
 if(!caps.length)return;
 if(getComputedStyle(dish).position==='static')dish.style.position='relative';
 const layer=document.createElement('div');layer.dataset.localCast='';layer.setAttribute('aria-label','Your locally saved resin keycaps');Object.assign(layer.style,{position:'absolute',inset:'17% 16%',pointerEvents:'none',zIndex:'3'});
 caps.forEach((cap,i)=>{
 const img=document.createElement('img');img.src=cap.img;img.alt='';img.title=(String(cap.name||'Resin keycap').slice(0,60))+' — saved on this device';
 const angle=i*2.399963;const radius=Math.sqrt((i+.5)/Math.max(caps.length,1))*.34;
 Object.assign(img.style,{position:'absolute',left:(50+Math.cos(angle)*radius*100)+'%',top:(50+Math.sin(angle)*radius*100)+'%',width:'29%',height:'29%',objectFit:'cover',borderRadius:'19%',border:'1px solid #ffffffa8',boxShadow:'0 2px 5px #53243a70',transform:'translate(-50%,-50%) rotate('+((i%5-2)*12)+'deg)'});
 layer.appendChild(img);
 });dish.appendChild(layer);
 dish.setAttribute('aria-label','Pink eye dish with '+caps.length+' locally saved resin keycaps');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show);else show();
window.addEventListener('storage',e=>{if(e.key===KEY)show()});
window.addEventListener('pageshow',show);
})();