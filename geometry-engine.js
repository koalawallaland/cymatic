/* KT / Geometry of the Invisible. Original normalized vector studies.
   Scientific coordinates are dimensionless (CR3BP) or MPa (plane stress).
   No network, audio, personal data, or third-party artwork. */
export const families=[
 {id:'stave',name:'Stave architecture',glyph:'✳',note:'Original radial branches inspired by the visual vocabulary of Icelandic magical staves; not an authenticated historical stave or protective claim.'},
 {id:'seraph',name:'SERAPH / six wings',glyph:'✧',note:'Three pairs of feathered, closed wing contours surrounding an eye. Original procedural interpretation.'},
 {id:'glyph',name:'KT / heart-integral',glyph:'♡',note:'Original flowing glyph studies inspired by the heart/integral juxtaposition and looping calligraphy; not a transcription or a historical script.'},
 {id:'lagrange',name:'Lagrange field',glyph:'∞',note:'Contours of the dimensionless rotating-frame effective potential Ω. L1–L5 are equilibria, not orbits. L4/L5 are linearly stable only for μ < 0.03852 in the ideal model.'},
 {id:'mohr',name:'Mohr stress circle',glyph:'⊙',note:'Plane stress: circle center (σx+σy)/2, radius √(((σx−σy)/2)²+τxy²), rotated point at twice the physical plane angle.'}
];
const T=2*Math.PI, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const polar=(r,a)=>[r*Math.cos(a),r*Math.sin(a)];
const rotate=([x,y],a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
const sample=(fn,n=100)=>Array.from({length:n+1},(_,i)=>fn(i/n));
const circle=(x,y,r,n=96)=>sample(t=>[x+r*Math.cos(T*t),y+r*Math.sin(T*t)],n);
const ellipse=(x,y,rx,ry,a=0)=>sample(t=>{let [u,v]=rotate([rx*Math.cos(T*t),ry*Math.sin(T*t)],a);return[x+u,y+v]});
const curve=(p0,p1,p2,p3)=>sample(t=>{const u=1-t;return [0,1].map(i=>u*u*u*p0[i]+3*u*u*t*p1[i]+3*u*t*t*p2[i]+t*t*t*p3[i])},35);
const chain=(...parts)=>parts.flatMap((p,i)=>i?p.slice(1):p);
function model(){return{paths:[],labels:[],detail:''}}
function add(m,pts,group=0,closed=false){if(pts.length>1)m.paths.push({pts,group,closed});}
function label(m,x,y,text){m.labels.push({x,y,text})}
export function omega(x,y,mu){const r1=Math.max(1e-6,Math.hypot(x+mu,y)),r2=Math.max(1e-6,Math.hypot(x-1+mu,y));return .5*(x*x+y*y)+(1-mu)/r1+mu/r2}
export function equilibrium(mu){
 const f=x=>x-(1-mu)*(x+mu)/Math.abs(x+mu)**3-mu*(x-1+mu)/Math.abs(x-1+mu)**3;
 const zero=(a,b)=>{let fa=f(a);for(let i=0;i<75;i++){const mid=(a+b)/2, fm=f(mid);if(Math.sign(fm)===Math.sign(fa)){a=mid;fa=fm}else b=mid}return(a+b)/2};
 const e=1e-7;
 return [[zero(-mu+e,1-mu-e),0],[zero(1-mu+e,3),0],[zero(-3,-mu-e),0],[.5-mu,Math.sqrt(3)/2],[.5-mu,-Math.sqrt(3)/2]];
}
export function mohr(sx,sy,tau,theta){
 const c=(sx+sy)/2,d=(sx-sy)/2,r=Math.hypot(d,tau),a=2*theta*Math.PI/180;
 return {c,r,s1:c+r,s2:c-r,sigma:c+d*Math.cos(a)+tau*Math.sin(a),tau:tau*Math.cos(a)-d*Math.sin(a)};
}
// Linear edge interpolation; saddle cells use the bilinear-center sign.
function contours(grid,size,level){
 const seg=[],step=2/size;
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){
  const v=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]],p=[[-1+i*step,-1+j*step],[-1+(i+1)*step,-1+j*step],[-1+(i+1)*step,-1+(j+1)*step],[-1+i*step,-1+(j+1)*step]],hit=[];
  for(let k=0;k<4;k++){const l=(k+1)%4,a=v[k]-level,b=v[l]-level;if((a<0)===(b<0))continue;const t=a/(a-b);hit.push([p[k][0]+t*(p[l][0]-p[k][0]),p[k][1]+t*(p[l][1]-p[k][1])])}
  if(hit.length===2)seg.push(hit);
  if(hit.length===4){const same=((v.reduce((a,b)=>a+b,0)/4)<level)===(v[0]<level);if(same)seg.push([hit[0],hit[1]],[hit[2],hit[3]]);else seg.push([hit[3],hit[0]],[hit[1],hit[2]])}
 }
 return seg;
}
export function makeStudy(id,params={}){
 const m=model(),sym=clamp(Math.round(params.sym??8),3,16),density=clamp(Math.round(params.density??6),2,12),phase=(params.phase??0)*Math.PI/180;
 if(id==='stave'){
  add(m,circle(0,0,.20),0,true);add(m,circle(0,0,.12),1,true);add(m,circle(0,0,.85),2,true);
  for(let i=0;i<sym;i++){const a=T*i/sym+phase,transform=p=>p.map(v=>rotate(v,a)),s=(p,g,closed=false)=>add(m,transform(p),g,closed);
   s([[.2,0],[.91,0]],i+3);
   for(let j=0;j<Math.min(density,6);j++){const x=.29+j*.075,w=.047+j*.011;s([[x,-w],[x,w]],i+3)}
   s(chain(curve([.65,-.16],[.72,-.16],[.76,-.09],[.77,0]),curve([.77,0],[.76,.09],[.72,.16],[.65,.16])),i+3);
   for(const sign of [-1,1]){s(curve([.86,0],[.89,sign*.055],[.93,sign*.10],[.95,sign*.10]),i+3)}
   s(circle(.77,0,.055,48),i+3,true)
  }
  m.detail=sym+' branches · '+Math.min(density,6)+' crossbars per branch';
 }else if(id==='seraph'){
  const wingAngles=[-.92,-.10,.78,Math.PI+.92,Math.PI+.10,Math.PI-.78];
  wingAngles.forEach((a,i)=>{const p=pts=>pts.map(v=>rotate(v,a+phase));const wing=j=>{const q=j/density,tip=[.88-.23*q,.07+.25*q],root=[.12,.02+.07*q];return chain(curve(root,[.25,-.08],[.67,-.13],tip),curve(tip,[.74,.30],[.32,.22],root))};for(let j=0;j<density;j++)add(m,p(wing(j)),i+1,true)});
  const eye=chain(curve([-.30,0],[-.14,-.22],[.14,-.22],[.30,0]),curve([.30,0],[.14,.22],[-.14,.22],[-.30,0]));
  add(m,eye,0,true);add(m,circle(0,0,.125),0,true);add(m,circle(0,0,.055),0,true);add(m,circle(0,0,.38),7,true);
  m.detail='Six wings · '+density+' feather contours per wing';
 }else if(id==='glyph'){
  // Open cursive gesture and complementary closed hearts, loops and ligatures.
  const heart=sample(t=>{const a=T*t,x=16*Math.sin(a)**3,y=13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a);return[x/21,-y/21]},120);
  const integral=chain(curve([.19,-.83],[-.03,-1.04],[-.13,-.36],[-.11,-.04]),curve([-.11,-.04],[-.04,.40],[-.23,1.04],[-.42,.78]));
  add(m,integral.map(p=>rotate(p,phase)),0);add(m,heart.map(([x,y])=>rotate([.36*x+.24,.36*y-.28],phase)),1,true);
  for(let j=0;j<Math.min(density,8);j++){const a=phase+j*T/Math.min(density,8);const f=chain(curve([.22,0],[.46,-.52],[.94,-.19],[.74,.13]),curve([.74,.13],[.64,.37],[.32,.19],[.22,0]));add(m,f.map(p=>rotate(p,a)),j+2,true)}
  add(m,ellipse(0,0,.17,.28,phase),4,true);m.detail='Heart, integral gesture and '+Math.min(density,8)+' looping ligatures';
 }else if(id==='lagrange'){
  const mu=clamp(Number(params.mu??.08),.005,.5),scale=1.72,N=100;
  const eq=equilibrium(mu),om=eq.map(([x,y])=>omega(x,y,mu)),min=om[3],max=Math.max(...om.slice(0,3));
  const grid=Array.from({length:N+1},(_,j)=>Array.from({length:N+1},(_,i)=>omega((2*i/N-1)*scale,(2*j/N-1)*scale,mu)));
  // Include levels around the saddle values, not exact critical contours.
  const levels=Array.from({length:density+3},(_,i)=>min+.025+(max-min+.48)*(i/(density+2))**1.42);
  levels.forEach((l,i)=>{for(const seg of contours(grid,N,l))add(m,seg,i)});
  for(const [i,[x,y]] of eq.entries())label(m,x/scale,-y/scale,'L'+(i+1));
  label(m,-mu/scale,0,'m₁');label(m,(1-mu)/scale,0,'m₂');
  m.detail='μ = '+mu.toFixed(3)+' · L4/L5 '+(mu<.03852?'linearly stable':'not linearly stable')+' in the ideal model';
 }else if(id==='mohr'){
  const sx=Number(params.sx??80),sy=Number(params.sy??-20),tau=Number(params.tau??30),theta=Number(params.theta??35),q=mohr(sx,sy,tau,theta);
  const scale=Math.max(20,Math.abs(q.c)+q.r,Math.abs(q.tau))*1.18;
  const x=q.c/scale,r=q.r/scale,px=q.sigma/scale,py=-q.tau/scale;
  add(m,circle(x,0,r,180),0,true);add(m,[[-.95,0],[.95,0]],1);add(m,[[0,-.95],[0,.95]],1);
  add(m,[[x,0],[px,py]],2);add(m,[[x,0],[sx/scale,-tau/scale]],3);add(m,[[px,py],[px,0]],2);
  add(m,circle(px,py,.022,40),2,true);
  label(m,q.s1/scale,0,'σ₁');label(m,q.s2/scale,0,'σ₂');label(m,px,py,'θ');
  m.detail='σ₁ '+q.s1.toFixed(1)+' MPa · σ₂ '+q.s2.toFixed(1)+' MPa · τ(θ) '+q.tau.toFixed(1)+' MPa';
 }
 return m;
}
export function studySVG(m,stroke='#392342'){
 const p=m.paths.map(({pts,closed})=>'<path d="'+pts.map(([x,y],i)=>(i?'L':'M')+(500+x*455).toFixed(2)+' '+(500+y*455).toFixed(2)).join(' ')+(closed?' Z':'')+'"/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000"><g fill="none" stroke="'+stroke+'" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">'+p+'</g></svg>';
}
