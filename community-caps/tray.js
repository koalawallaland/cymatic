import {feed,validCast,textureURL,castLabel,savedCopies,keepCopy} from './api.js';
const link=document.querySelector('[data-community-tray-link]'),board=document.querySelector('keycap-board');
link?.addEventListener('click',e=>e.stopPropagation());
const setStatus=text=>{if(link)link.title=text};
function getLayout(){try{return JSON.parse(localStorage.getItem('kwl-board')||'{}')||{}}catch{return {}}}
async function init(){
 if(!board)return;await customElements.whenDefined('keycap-board');const tray=board.querySelector('[data-tray-default]');if(!tray||typeof board.wire!=='function')return;
 const layout=getLayout(),existing=new Set();
 function add(c,copy=false,latest=false){
  if(!validCast(c)||existing.has(c.id)||board.querySelector('[data-id="community:'+CSS.escape(c.id)+'"]'))return;
  existing.add(c.id);const b=document.createElement('button');b.type='button';b.className='cap artisan community-artisan';b.setAttribute('data-astro-cid-hgaugm5o','');b.dataset.w='1';b.dataset.id='community:'+c.id;b.style.setProperty('--w','1');b.title=castLabel(c)+(latest?' · from the public collection':' · local copy');b.setAttribute('aria-label',castLabel(c)+' keycap');const top=document.createElement('span');top.className='top';top.setAttribute('data-astro-cid-hgaugm5o','');top.style.background='center / cover url("'+textureURL(c.texture)+'")';b.append(top);
  const dest=layout[b.dataset.id];let target=tray;if(typeof dest==='string'&&dest.startsWith('s:')){const socket=board.querySelector('.socket[data-code="'+CSS.escape(dest.slice(2))+'"]');if(socket&&!socket.querySelector('.cap')&&socket.dataset.w==='1')target=socket}
  else if(typeof dest==='string'&&dest.startsWith('t:'))target=board.querySelector('[data-tray-name="'+CSS.escape(dest.slice(2))+'"]')||tray;
  if(target===tray)tray.prepend(b);else target.append(b);board.wire(b);
  if(!copy)b.addEventListener('pointerdown',()=>{if(!keepCopy(c))setStatus('Local copy limit reached; open the community collection.')},{once:true});
 }
 for(const c of savedCopies())add(c,true);
 async function refresh(){try{const remote=(await feed()).caps;for(const c of remote.slice(0,3))add(c,false,true);setStatus(remote.length?remote.length+' recent shared casts · open the community collection':'No public casts yet. Share the first from the resin lab.');if(link)link.dataset.state=remote.length?'live':'empty'}catch{setStatus('Shared caps temporarily unavailable. Your local caps are safe.');if(link)link.dataset.state='offline'}}
 await refresh();window.addEventListener('pageshow',e=>{if(e.persisted)refresh()});
}
init();
