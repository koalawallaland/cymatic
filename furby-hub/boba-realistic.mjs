// Recovered Boba art, animated as a lightweight 2D articulated texture rig.
// This does not pretend to be a recovered skinned 3D mesh. It works without WebGL.
const FRONT = new URL('./boba-front.webp',import.meta.url).href;
const SIDE = new URL('./boba-side.webp',import.meta.url).href;
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const bell=(x,m,w)=>Math.exp(-(((x-m)/w)**2));
function loadImage(src) {
  return new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;
  });
}
// Localized joint influences in normalized image space; the rest of the coat
// deforms continuously so the original fine fur and facial detail are retained.
export function deform(x,y,pose,action,t,energy) {
  const side=pose==='side';
  const head= (1-smooth(.24,.55,y))*(side?1-smooth(.35,.67,x):1);
  const center=side?.23:.47;
  const headTilt=energy*(action==='cuddle'?-.12:action==='paw'? .09:action==='quiet'?-.04:action==='treat'?Math.sin(t*8)*.022:Math.sin(t*3)*.025);
  const hx=x-center, hy=y-.28;
  let dx=head*(-hy*headTilt),dy=head*(hx*headTilt);
  const muzzle=bell(x,center,.095)*bell(y,.27,.065);
  if(action==='talk'||action==='treat')dy+=muzzle*energy*Math.sin(t*13)*.008;
  const leftPaw=bell(x,side?.28:.27,.115)*smooth(.72,.96,y);
  const rightPaw=bell(x,side?.58:.66,.13)*smooth(.72,.96,y);
  if(action==='paw') {dy-=leftPaw*energy*.12;dx-=leftPaw*energy*.045;}
  if(action==='walk'||action==='fetch'){
    const stride=Math.sin(t*13);
    dy-=energy*.065*(leftPaw*Math.max(stride,0)+rightPaw*Math.max(-stride,0));
    dx+=energy*.028*stride*(leftPaw-rightPaw);
  }
  if(side&&(action==='wag'||action==='walk'||action==='fetch')){
    const tail=smooth(.63,.89,x)*(1-smooth(.30,.60,y));
    dx+=tail*energy*Math.sin(t*13)*.038;
    dy+=tail*energy*Math.cos(t*13)*.023;
  }
  return [x+dx,y+dy];
}
function triangle(ctx,image,s,d) {
  const [a,b,c]=s,[p,q,r]=d;
  const den=a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]);
  if(!den)return;
  const coeff=i=>[
    (p[i]*(b[1]-c[1])+q[i]*(c[1]-a[1])+r[i]*(a[1]-b[1]))/den,
    (p[i]*(c[0]-b[0])+q[i]*(a[0]-c[0])+r[i]*(b[0]-a[0]))/den,
    (p[i]*(b[0]*c[1]-c[0]*b[1])+q[i]*(c[0]*a[1]-a[0]*c[1])+r[i]*(a[0]*b[1]-b[0]*a[1]))/den
  ];
  const [m11,m21,tx]=coeff(0),[m12,m22,ty]=coeff(1);
  // Overlap triangle edges by a fraction of a pixel to suppress antialias seams.
  const cx=(p[0]+q[0]+r[0])/3,cy=(p[1]+q[1]+r[1])/3;
  const extend=v=>{const x=v[0]-cx,y=v[1]-cy,l=Math.hypot(x,y)||1;return [v[0]+.55*x/l,v[1]+.55*y/l];};
  ctx.save();ctx.beginPath();ctx.moveTo(...extend(p));ctx.lineTo(...extend(q));ctx.lineTo(...extend(r));ctx.closePath();ctx.clip();
  ctx.transform(m11,m12,m21,m22,tx,ty);ctx.drawImage(image,0,0);ctx.restore();
}
function mesh(ctx,image,w,h,pose,action,t,energy){
  const nx=8,ny=12, iw=image.naturalWidth,ih=image.naturalHeight;
  const vertices=[];
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
    const u=x/nx,v=y/ny;
    const [dx,dy]=deform(u,v,pose,action,t,energy);
    vertices.push({s:[u*iw,v*ih],d:[dx*w,dy*h]});
  }
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const a=vertices[y*(nx+1)+x],b=vertices[y*(nx+1)+x+1],c=vertices[(y+1)*(nx+1)+x],d=vertices[(y+1)*(nx+1)+x+1];
    triangle(ctx,image,[a.s,b.s,d.s],[a.d,b.d,d.d]);
    triangle(ctx,image,[a.s,d.s,c.s],[a.d,d.d,c.d]);
  }
}
export async function buildBoba(host) {
  const front=await loadImage(FRONT);
  // The optional side pose supports the curl of his tail and the walking motion.
  let side=null;loadImage(SIDE).then(img=>{side=img;}).catch(()=>{});
  const canvas=document.createElement('canvas');
  canvas.className='boba-realistic-canvas';canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)throw Error('Canvas is not available');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let width=0,height=0,scale=1,frame=0,last=0,visible=true,action='idle',start=performance.now();
  function size(){
    const box=host.getBoundingClientRect();width=box.width;height=box.height;
    scale=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    draw(performance.now());
  }
  function draw(now){
    if(!width||!height)return;
    const t=Math.max(0,(now-start)/1000);
    const active=action!=='idle'&&t<2.65;
    const reduced=motion.matches;
    const energy=active&&!reduced?Math.min(smooth(0,.23,t),1-smooth(2.15,2.65,t)):0;
    const sidePose=active&&side&&['walk','fetch','wag'].includes(action);
    const img=sidePose?side:front,pose=sidePose?'side':'front';
    const ratio=img.naturalWidth/img.naturalHeight;
    const h=Math.min(height*.74,width*.80/ratio),w=h*ratio;
    const base=height*.865;
    const moving=action==='walk'||action==='fetch';
    const quiet=action==='rest'||action==='sit'||action==='quiet';
    const breath=reduced?0:Math.sin(now*.002)*.009;
    const bounce=moving?Math.abs(Math.sin(t*6.5))*height*.035*energy:action==='wag'?Math.sin(t*8)*height*.009*energy:0;
    const shift=moving?Math.sin(t*3.1)*width*.07*energy:0;
    const compression=quiet?energy*.045:0;
    ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);
    // A soft contact shadow anchors the dog on the daycare rug.
    ctx.save();ctx.translate(width/2+shift,base-2);
    ctx.scale(1, .26);const gradient=ctx.createRadialGradient(0,0,0,0,0,w*.48);
    gradient.addColorStop(0,'rgba(92,62,119,.27)');gradient.addColorStop(1,'rgba(92,62,119,0)');
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,w*.48,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.translate(width/2+shift,base-bounce);
    ctx.scale(1+breath*.7,1+breath-compression);
    ctx.translate(-w/2,-h);
    if(energy>.02)mesh(ctx,img,w,h,pose,action,t,energy);
    else ctx.drawImage(img,0,0,w,h);
    ctx.restore();
    if(active&&action==='fetch'){
      const radius=height*.037,x=width*.83-energy*Math.abs(Math.sin(t*4))*width*.035,y=base-radius;
      const grad=ctx.createRadialGradient(x-radius*.35,y-radius*.35,1,x,y,radius);
      grad.addColorStop(0,'#faffc0');grad.addColorStop(1,'#a3c745');
      ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff9';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x-radius*.4,y,radius*.65,-1.2,1.2);ctx.stroke();
    }
  }
  function loop(now){frame=0;if(!visible||motion.matches)return;
    if(now-last>41){last=now;draw(now);}
    frame=requestAnimationFrame(loop);
  }
  function run(){if(!visible)return;if(!frame&&!motion.matches)frame=requestAnimationFrame(loop);else if(motion.matches)draw(performance.now());}
  host.append(canvas);size();
  if('ResizeObserver' in window)new ResizeObserver(size).observe(host);else addEventListener('resize',size);
  if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible&&frame){cancelAnimationFrame(frame);frame=0;}else run();}).observe(host);
  motion.addEventListener?.('change',()=>{if(frame){cancelAnimationFrame(frame);frame=0;}run();});
  run();
  return {play(next){action=next;start=performance.now();draw(start);run();}};
}
