// Original Sunnymoo touch material exhibit. No photographic assets or user data.
import {fresh,colors,title} from './maker.js?v=worktop3';
export const materials=[
 {name:'Bubblegum',caption:'Long, elastic ribbons',hue:'#fb77b8',finish:0,filling:1,pigment:0},
 {name:'Blue cloud',caption:'Soft, velvety folds',hue:'#19c6eb',finish:1,filling:0,pigment:4},
 {name:'Electric lime',caption:'Thick, glossy impressions',hue:'#cef91c',finish:0,filling:2,pigment:3},
 {name:'Lavender marsh',caption:'Deep, slow-moving dents',hue:'#b495ed',finish:1,filling:2,pigment:1},
 {name:'Oil slick',caption:'Iridescent, reflective folds',hue:'#382d61',finish:0,filling:1,pigment:1,chrome:true}
];
export const calm=()=>document.documentElement.dataset.calm==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;
export function vatRecipe(m){return {...fresh(2),finish:m.finish,filling:m.filling,pigment:m.pigment,signature:materials.indexOf(m)}}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rgb=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16));
const W=360,H=220;
const smooth=(v)=>v*v*(3-2*v);
function hatch(x,y){return Math.sin(x*.088+2*Math.sin(y*.073))+Math.sin(y*.14+x*.075)*.55+Math.sin(x*.05-y*.19)*.35}
// Heightfield normals with a specular lobe, displacement, variable recovery and
// a drawn elastic membrane. Intended as an expressive material simulation, not a rheology solver.
export function mountSlime(host,r,material){
 const m=material||{name:title(r),hue:colors[r.pigment],finish:r.finish,filling:r.filling};
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas.className='slime-surface';canvas.tabIndex=0;canvas.setAttribute('role','application');canvas.setAttribute('aria-label',m.name+' interactive slime. Drag, pinch or tap. Use arrow keys to knead, or space to poke.');
 host.replaceChildren(canvas);const ctx=canvas.getContext('2d',{alpha:false});
 let alive=true,frame=0,last=0,dirty=true,reset=0,gesture='',pts=new Map(),ribbons=[],cursor={x:W/2,y:H/2};
 const base=new Float32Array(W*H),dist=new Float32Array(W*H),vel=new Float32Array(W*H),field=new Float32Array(W*H);
 const image=ctx.createImageData(W,H),pix=image.data;
 const [red,green,blue]=rgb(m.hue),soft=m.finish===1,beads=m.finish===2,slow=m.filling===2;
 function seed(){
  reset++;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   let id=y*W+x,n=hatch(x+reset*11,y+reset*9),f=Math.sin(x*.042+y*.037+Math.sin(y*.055)*2);
   base[id]=6*Math.tanh(n*1.55)+3.5*f+Math.sin(y*.29+Math.cos(x*.06)*3)*1.1;
   if(beads)base[id]+=1.5*Math.sin(x*1.5)*Math.sin(y*1.3);
   dist[id]=vel[id]=0;
  }
  ribbons=[];dirty=true;
 }
 seed();
 function poke(p,dx,dy,strength=1){
  const radius=soft?28:24,loX=Math.max(1,Math.floor(p.x-radius)),hiX=Math.min(W-2,Math.ceil(p.x+radius)),loY=Math.max(1,Math.floor(p.y-radius)),hiY=Math.min(H-2,Math.ceil(p.y+radius));
  for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){
   const d=Math.hypot(x-p.x,y-p.y)/radius;if(d>=1)continue;
   const i=y*W+x,bump=Math.exp(-d*d*5),rim=Math.exp(-Math.pow((d-.58)*6,2));
   const drag=clamp((dx*(x-p.x)+dy*(y-p.y))/radius*.15,-3,3)*bump;
   dist[i]=clamp(dist[i]+(-4.2*bump+2.3*rim+drag)*strength,-26,17);
   vel[i]=clamp(vel[i]+(-.52*bump+.27*rim)*strength,-1.9,1.9);
  }
  dirty=true;
 }
 function render(now){
  for(let i=0;i<field.length;i++)field[i]=base[i]+dist[i];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const id=y*W+x,j=id*4;
   const l=field[y*W+Math.max(0,x-1)],rr=field[y*W+Math.min(W-1,x+1)],t=field[Math.max(0,y-1)*W+x],b=field[Math.min(H-1,y+1)*W+x];
   const nx=(l-rr)*.28,ny=(t-b)*.28,norm=1/Math.hypot(nx,ny,1),X=nx*norm,Y=ny*norm,Z=norm;
   const lam=clamp((X*-.42+Y*-.54+Z*.73)*1.08,.02,1),spec=Math.pow(clamp(X*-.3+Y*-.38+Z*.87,0,1),soft?17:30);
   const rim=Math.pow(1-Z,1.5),shade=.41+lam*.61+Math.max(-.14,field[id]*.008),shiny=spec*(soft?37:100)+rim*19;
   let R=red,G=green,B=blue;
   if(m.chrome){const h=(X*.8+Y*.33+x/W*.18+field[id]*.028)*6.28;const sheen=Math.pow(clamp(spec*1.6+rim*.55,0,1),.8);R=45+(30+54*Math.sin(h+1.9))*sheen;G=35+(45+50*Math.sin(h+4.1))*sheen;B=79+(52+35*Math.sin(h))*sheen; }
   pix[j]=clamp(R*shade+shiny,0,255);pix[j+1]=clamp(G*shade+shiny,0,255);pix[j+2]=clamp(B*shade+shiny,0,255);pix[j+3]=255;
  }
  ctx.putImageData(image,0,0);
  for(const s of ribbons){
   const a=s.a,b=s.b,life=s.live?1:clamp(1-(now-s.time)/750,0,1);
   if(life<=0)continue;
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),scale=clamp(len/100,0,1),nx=-dy/(len||1),ny=dx/(len||1),width=5+scale*20;
   ctx.save();ctx.globalAlpha=life*.85;
   const g=ctx.createLinearGradient(a.x+nx*width,a.y+ny*width,a.x-nx*width,a.y-ny*width);
   g.addColorStop(0,'#ffffffba');g.addColorStop(.18,m.hue+'b0');g.addColorStop(.53,m.hue+'28');g.addColorStop(.86,m.hue+'ac');g.addColorStop(1,'#ffffff93');
   ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(a.x+nx*7,a.y+ny*7);ctx.quadraticCurveTo((a.x+b.x)/2+nx*width,(a.y+b.y)/2+ny*width,b.x+nx*9,b.y+ny*9);ctx.lineTo(b.x-nx*9,b.y-ny*9);ctx.quadraticCurveTo((a.x+b.x)/2-nx*width,(a.y+b.y)/2-ny*width,a.x-nx*7,a.y-ny*7);ctx.closePath();ctx.fill();ctx.restore();
  }
 }
 function tick(now){
  if(!alive||!host.isConnected)return;
  frame=requestAnimationFrame(tick);
  if(now-last<32)return;last=now;
  let active=pts.size>0||dirty||ribbons.length>0;
  if(!active)return;
  let moving=0;
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
   const i=y*W+x,d=dist[i];let v=vel[i]+(dist[i-1]+dist[i+1]+dist[i-W]+dist[i+W]-4*d)*.13-d*(slow?.004:.01);
   v*=soft?.84:.94;vel[i]=v;dist[i]=d+v;
   moving=Math.max(moving,Math.abs(v),Math.abs(d)*.045);
  }
  ribbons=ribbons.filter(s=>s.live||now-s.time<750);
  render(now);dirty=moving>.028;
 }
 const point=e=>{const b=canvas.getBoundingClientRect();return {x:clamp((e.clientX-b.left)*W/b.width,1,W-2),y:clamp((e.clientY-b.top)*H/b.height,1,H-2)}};
 function say(txt){host.closest('.exhibit-stage')?.querySelector('.touch-status')?.replaceChildren(txt)}
 canvas.onpointerdown=e=>{if(pts.size>=2)return;const p=point(e);canvas.setPointerCapture(e.pointerId);pts.set(e.pointerId,{...p,start:p});poke(p,0,0,1.7);say('Press · leave an impression');};
 canvas.onpointermove=e=>{
  const prev=pts.get(e.pointerId);if(!prev)return;const p=point(e),dx=p.x-prev.x,dy=p.y-prev.y;pts.set(e.pointerId,{...p,start:prev.start});if(Math.hypot(dx,dy)<1)return;
  for(let j=1,n=Math.min(10,Math.ceil(Math.hypot(dx,dy)/8));j<=n;j++)poke({x:prev.x+dx*j/n,y:prev.y+dy*j/n},dx,dy,.7);
  if(!calm()){const ends=[...pts.values()];const a=ends.length===2?ends[0]:prev.start,b=ends.length===2?ends[1]:p;if(Math.hypot(a.x-b.x,a.y-b.y)>19){ribbons=ribbons.filter(s=>!s.live);ribbons.push({a,b,live:true,time:performance.now()})}}
  say(pts.size===2?'Stretch · a thin membrane forms':'Knead · pull the material into ribbons');
 };
 function release(e){if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);for(const s of ribbons){s.live=false;s.time=performance.now()}say('Release · the surface slowly settles');dirty=true;}
 canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=release;
 canvas.onkeydown=e=>{const moves={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16],' ':[0,0],Enter:[0,0]};if(!moves[e.key])return;e.preventDefault();const [dx,dy]=moves[e.key];cursor={x:clamp(cursor.x+dx,20,W-20),y:clamp(cursor.y+dy,20,H-20)};poke(cursor,dx,dy,2);say('Knead · leave a new impression')};
 render(performance.now());frame=requestAnimationFrame(tick);
 return {reset(){seed();render(performance.now());say('Fresh surface · ready to play')},destroy(){alive=false;cancelAnimationFrame(frame)},press(){poke({x:W/2,y:H/2},0,0,2);say('Press · leave an impression')}};
}
export function vatMarkup(name,caption,hue,chrome=false){return '<div class="vat-preview'+(chrome?' metallic':'')+'" style="--vat:'+hue+'"><i></i><b></b></div><span class="vat-name">'+name+'</span><span class="vat-caption">'+caption+'</span>'}
export function sensoryVat(area,r,m,keep,back){
 area.innerHTML='<div class="exhibit-head"><div><span class="eyebrow">MATERIAL EXPLORATION</span><h3></h3><p></p></div><button class="exit-vat">All vats</button></div><div class="exhibit-stage"><div class="glow-orb orb-a"></div><div class="glow-orb orb-b"></div><div class="pedestal"><div class="bowl-ring"><div class="slime-bed"></div></div><div class="bowl-foot"></div></div><div class="exhibit-instruction"><span class="status-light"></span><span class="touch-status" role="status">Touch the surface · poke, pull or stretch</span></div></div><div class="instrument-controls"><button class="primary press-vat">Press</button><button class="reset-vat">Fresh surface</button><button class="keep-vat">Keep recipe</button></div><p class="note" role="status"></p>';
 area.querySelector('h3').textContent=m.name;area.querySelector('.exhibit-head p').textContent=m.caption||'Knead, poke and stretch your batch.';area.querySelector('.exhibit-stage').classList.toggle('chrome-room',!!m.chrome);
 const controller=mountSlime(area.querySelector('.slime-bed'),r,m);
 area.querySelector('.exit-vat').onclick=()=>{controller.destroy();back()};
 area.querySelector('.press-vat').onclick=()=>controller.press();
 area.querySelector('.reset-vat').onclick=()=>controller.reset();
 area.querySelector('.keep-vat').onclick=()=>{const saved=keep(r);area.querySelector('.note').textContent=(saved?'Recipe saved to your shelf.':'Recipe kept on your shelf for this visit.')+' Your current surface is just for this visit.'};
 return controller;
}
