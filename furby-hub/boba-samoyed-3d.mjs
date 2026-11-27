// Footage-inspired likeness pass; private video stays out of the published site.
// Front likeness is observed; side and rear anatomy are hand-shaped.
// Original articulated, volumetric Samoyed. Coordinates are in scene units;
// each coat strand is real mesh geometry, not a camera-facing photo.
// Proportions and fetch posture revised against Boba's owner-supplied video.
import * as THREE from '../squish/vendor/three.module.js';
import {createSoftwareRenderer} from './boba-soft3d.mjs?v=8';
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const pi=Math.PI;
function rng(seed=1138){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
let random=rng();
const c=(hex)=>new THREE.Color(hex);
const paint=(color,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0});
const cream=paint('#f1f1ed'),muzzleMat=paint('#f6f4ee'),innerEar=paint('#cebbc1',.96),black=paint('#16171a',.44),noseMat=paint('#171719',.40),iris=paint('#272020',.35),mouth=paint('#292329',.88),toe=paint('#e9e5df',.84);
const furMat=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.FrontSide,roughness:1,metalness:0});
const globe=new THREE.SphereGeometry(1,32,22),smallGlobe=new THREE.SphereGeometry(1,18,14);
let lowDetail=false;
const group=(parent,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};
function oval(parent,mat,xyz,radii,rotation=null){const m=new THREE.Mesh(lowDetail?smallGlobe:globe,mat);m.position.set(...xyz);m.scale.set(...radii);if(rotation)m.rotation.set(...rotation);parent.add(m);return m;}
function curve(parent,pts,material,radius=.009){const path=new THREE.CatmullRomCurve3(pts.map(p=>v(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(path,24,radius,6,false),material);parent.add(m);return m;}
// Coat: curved leaf-like locks. The base is an ellipsoid undercoat; overlapping
// tiny tapered, directional tufts catch light from every viewing angle.
function coat(parent,xyz,radii,opts={}){
 const g=group(parent,...xyz);if(opts.rotation)g.rotation.set(...opts.rotation);
 const [rx,ry,rz]=radii;
 oval(g,opts.base||cream,[0,0,0],radii);
 const count=Math.round((opts.n??1600)*(lowDetail?.58:1.27)), length=(opts.length??.065)*1.02, width=(opts.width??.013)*(lowDetail?.86:.52), lift=(opts.lift??.32)*.90;
 const flow=v(...(opts.flow||[0,-.88,-.45])).normalize();
 const roots=[],colors=[],idx=[],normals=[];
 const rootColor=c(opts.root||'#e9e9e7'),tipColor=c(opts.tip||'#fefdfc');
 for(let i=0;i<count;i++){
   const z=random()*2-1,a=random()*2*pi,r=Math.sqrt(Math.max(0,1-z*z));
   const d=v(r*Math.cos(a),z,r*Math.sin(a));
   if(opts.exclude?.(d))continue;
   const p=v(d.x*rx,d.y*ry,d.z*rz),n=v(d.x/rx,d.y/ry,d.z/rz).normalize();
   const tug=flow.clone().addScaledVector(n,-flow.dot(n));
   if(tug.lengthSq()<.03)tug.set(d.x>=0?1:-1,0,0).addScaledVector(n,-n.x*(d.x>=0?1:-1));
   tug.normalize();
   const s=v().crossVectors(n,tug).normalize();tug.addScaledVector(s,(random()-.5)*.60).normalize();
   const l=length*(.55+random()*.95),w=width*(.55+random()*.85);
   // Root buried in the undercoat, then a curved wedge following hair growth.
   const b=p.clone().addScaledVector(n,-.001),m=p.clone().addScaledVector(tug,l*.43).addScaledVector(n,l*lift*.96),t=p.clone().addScaledVector(tug,l).addScaledVector(n,l*lift*1.10);
   const apex=m.clone().addScaledVector(n,w*.27);
   const vertices=[b.clone().addScaledVector(s,-w*.68),b.clone().addScaledVector(s,w*.68),m.clone().addScaledVector(s,-w*.31),apex,m.clone().addScaledVector(s,w*.31),t];
   const shade=.975+random()*.05;
   const root=rootColor.clone().multiplyScalar(shade),mid=root.clone().lerp(tipColor,.68),tip=tipColor.clone().multiplyScalar(.985+random()*.025);
   const base=roots.length/3;
   vertices.forEach((a,j)=>{roots.push(a.x,a.y,a.z);const col=j<2?root:j===5?tip:mid;colors.push(col.r,col.g,col.b);const nn=n.clone().addScaledVector(tug,.12).addScaledVector(s,j===2?-.09:j===4?.09:0).normalize();normals.push(nn.x,nn.y,nn.z);});
   // Correct outward winding: s = n cross growth direction. Reversed faces
   // were flipped by WebGL's two-sided material and produced dirty gray patches.
   idx.push(base,base+3,base+1,base,base+2,base+3,base+1,base+3,base+4,base+2,base+5,base+3,base+3,base+5,base+4);
 }
 // A second fine guard-hair layer breaks the silhouette, especially on the ruff and plume.
 // Narrow tapered ribbons use the same batched mesh and are omitted on the software path.
 if(!lowDetail&&opts.guard){
   const guardCount=Math.round(count*.22);
   for(let i=0;i<guardCount;i++){
    const yy=random()*2-1,a=random()*2*pi,rr=Math.sqrt(1-yy*yy);
    const d=v(rr*Math.cos(a),yy,rr*Math.sin(a));if(opts.exclude?.(d))continue;
    const n=v(d.x/rx,d.y/ry,d.z/rz).normalize(),p=v(d.x*rx,d.y*ry,d.z*rz);
    const tangent=flow.clone().addScaledVector(n,-flow.dot(n));
    if(tangent.lengthSq()<.01)tangent.set(0,0,1).addScaledVector(n,-n.z);
    if(tangent.lengthSq()<.01)continue;tangent.normalize();
    const side=v().crossVectors(n,tangent).normalize();tangent.addScaledVector(side,(random()-.5)*.35).normalize();
    const l=length*(.92+random()*.52),w=.0013+random()*.0013;
    const b=p.clone().addScaledVector(n,.002);
    const m=p.clone().addScaledVector(tangent,l*.52).addScaledVector(n,l*lift*1.22);
    const t=p.clone().addScaledVector(tangent,l).addScaledVector(n,l*lift*1.07);
    const vertices=[b.clone().addScaledVector(side,-w),b.clone().addScaledVector(side,w),m.clone().addScaledVector(side,-w*.45),m.clone().addScaledVector(side,w*.45),t];
    const root=rootColor.clone().lerp(tipColor,.32),mid=tipColor.clone().multiplyScalar(.96+random()*.035),base=roots.length/3;
    for(let j=0;j<5;j++){const q=vertices[j],col=j<2?root:mid;roots.push(q.x,q.y,q.z);normals.push(n.x,n.y,n.z);colors.push(col.r,col.g,col.b);}
    idx.push(base,base+2,base+1,base+1,base+2,base+3,base+2,base+4,base+3);
   }
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(roots,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeBoundingSphere();
 g.add(new THREE.Mesh(geo,furMat));return g;
}
function ear(parent,side){
 const e=group(parent,side*.154,.162,-.065);e.rotation.z=-side*.19;e.rotation.y=side*.23;e.scale.set(.70,.63,.88);
 // Soft tapered ear: rounded across its thickness, rather than a flat extrusion.
 const pos=[],inds=[],rows=16,around=24;
 for(let i=0;i<=rows;i++){
   const t=i/rows,fade=Math.max(.018,Math.pow(Math.sin(pi*(.08+.92*t)),.34));
   const width=.089*(1-.68*t)*fade,depth=.042*(1-.76*t)*fade;
   for(let j=0;j<=around;j++){
     const a=j/around*2*pi;pos.push(.014*t+Math.cos(a)*width,-.036+t*.209,Math.sin(a)*depth);
   }
 }
 for(let i=0;i<rows;i++)for(let j=0;j<around;j++){
   const a=i*(around+1)+j,b=a+around+1;inds.push(a,b,a+1,b,b+1,a+1);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(inds);geo.computeVertexNormals();
 e.add(new THREE.Mesh(geo,cream));oval(e,innerEar,[.006,.048,.030],[.034,.053,.006],[.10,0,-.08]);
 coat(e,[-.051,.025,.012],[.032,.075,.032],{n:250,length:.028,width:.008,flow:[side*.12,1,.1],tip:'#fff9ed'});
 coat(e,[.054,.026,.01],[.032,.077,.032],{n:250,length:.028,width:.008,flow:[side*.12,1,.1],tip:'#fff9ed'});
 return e;
}
function dogModel(scene){
 random=rng();
 const root=group(scene),torso=group(root);
 // Broad back, tuck and full chest ruff. Legs remain separate articulated joints.
 coat(torso,[0,.625,-.16],[.268,.282,.485],{n:2300,length:.075,width:.014,flow:[0,-.82,-.57]});
 coat(torso,[0,.65,-.49],[.275,.275,.244],{n:1200,length:.078,width:.013,flow:[0,-.90,-.30]});
 coat(torso,[0,.75,.22],[.345,.38,.32],{n:3650,guard:true,length:.128,width:.015,lift:.34,flow:[0,-.98,-.08]});
 coat(torso,[0,.66,.355],[.278,.307,.223],{n:1900,guard:true,length:.120,width:.015,flow:[0,-1,.09],tip:'#fff9ee'});
 const head=group(torso,0,1.009,.399);
 coat(head,[0,.075,.028],[.215,.176,.195],{n:1800,length:.045,width:.008,flow:[0,-.88,-.38],exclude:d=>d.z>.42&&d.y<.29});
 coat(head,[-.147,.010,.050],[.122,.161,.133],{n:1050,guard:true,length:.095,width:.012,flow:[-.26,-.96,-.16]});
 coat(head,[.147,.010,.050],[.122,.161,.133],{n:1050,guard:true,length:.095,width:.012,flow:[.26,-.96,-.16]});
 coat(head,[0,-.075,.05],[.218,.13,.14],{n:900,length:.067,width:.011,flow:[0,-1,0]});
 ear(head,-1);ear(head,1);
 // Gradually tapered fox-like muzzle, not a spherical toy snout.
 coat(head,[0,.016,.185],[.116,.091,.145],{n:650,length:.018,width:.006,lift:.23,flow:[0,-.4,.9],tip:'#fffdf5',base:muzzleMat});
 oval(head,muzzleMat,[0,-.014,.276],[.081,.061,.082]);
 const jaw=group(head,0,-.051,.187);oval(jaw,muzzleMat,[0,-.012,.038],[.092,.048,.105]);oval(jaw,mouth,[0,.020,.058],[.078,.015,.095]);
 // Rounded triangular black nose with nostrils.
 const noseShape=new THREE.Shape();noseShape.moveTo(-.058,.018);noseShape.quadraticCurveTo(-.061,.039,-.028,.041);noseShape.quadraticCurveTo(0,.044,.028,.041);noseShape.quadraticCurveTo(.061,.039,.058,.018);noseShape.quadraticCurveTo(.049,-.014,.018,-.029);noseShape.quadraticCurveTo(0,-.04,-.018,-.029);noseShape.quadraticCurveTo(-.049,-.014,-.058,.018);
 const noseGeom=new THREE.ExtrudeGeometry(noseShape,{depth:.019,bevelEnabled:true,bevelThickness:.008,bevelSize:.009,bevelSegments:3,steps:1,curveSegments:16});
 const nose=new THREE.Mesh(noseGeom,noseMat);nose.position.set(0,-.004,.340);nose.scale.set(.73,.78,1);head.add(nose);
 for(const s of [-1,1])oval(head,black,[s*.022,.006,.365],[.014,.007,.004],[0,s*.15,s*.15]);
 curve(head,[[0,-.027,.361],[0,-.043,.353],[0,-.052,.335]],mouth,.0035);
 for(const s of [-1,1]){
   curve(head,[[0,-.052,.335],[s*.035,-.060,.321],[s*.071,-.053,.280],[s*.096,-.031,.214]],mouth,.0038);
   for(let k=0;k<5;k++){const x=s*(.056+(k%3)*.014),y=-.012-Math.floor(k/3)*.014,z=.287-(k%3)*.007;oval(head,toe,[x,y,z],[.0035,.0035,.0025]);}
 }
 const eyes=[];
 for(const s of [-1,1]){
   const e=group(head,s*.099,.080,.204);e.rotation.y=s*.36;e.rotation.z=s*.22;
   oval(e,black,[0,0,0],[.031,.014,.012]);
   oval(e,iris,[0,0,.006],[.018,.012,.008]);oval(e,black,[0,0,.011],[.012,.011,.005]);
   oval(e,paint('#fffef7',.3),[-.006,.005,.016],[.0038,.0028,.0018]);
   eyes.push(e);
   coat(head,[s*.107,.115,.162],[.054,.023,.037],{n:250,length:.028,width:.006,flow:[s*.20,-1,.25],tip:'#fffaf0'});
 }
 const paws=[];
 for(const s of [-1,1]){
   const front=group(root,s*.158,.61,.245);
   coat(front,[0,-.115,0],[.105,.235,.105],{n:700,length:.067,width:.012,flow:[0,-1,-.11]});
   coat(front,[0,-.379,.01],[.069,.208,.071],{n:480,length:.036,width:.008,flow:[0,-1,-.06]});
   coat(front,[0,-.554,.037],[.073,.044,.098],{n:350,length:.025,width:.006,flow:[0,-.25,1],tip:'#fff9ee',base:muzzleMat});
   for(let i=-1;i<=1;i++)oval(front,toe,[i*.035,-.571,.096],[.021,.016,.026]);
   paws.push({g:front,front:true,side:s,z:.245,y:.61});
   const rear=group(root,s*.173,.62,-.46);
   coat(rear,[0,-.11,0],[.135,.207,.169],{n:780,length:.074,width:.013,flow:[0,-1,-.2]});
   coat(rear,[0,-.333,-.04],[.071,.168,.085],{n:450,length:.039,width:.009,flow:[0,-1,.2]});
   coat(rear,[0,-.498,.009],[.063,.105,.069],{n:280,length:.023,width:.008,flow:[0,-1,.13]});
   coat(rear,[0,-.562,.036],[.070,.044,.092],{n:310,length:.023,width:.006,flow:[0,-.25,1],base:muzzleMat});
   for(let i=-1;i<=1;i++)oval(rear,toe,[i*.032,-.579,.094],[.020,.016,.025]);
   paws.push({g:rear,front:false,side:s,z:-.46,y:.62});
 }
 const tail=group(torso,0,.78,-.555);
 const tailShapes=[
 [[0,.055,-.07],[.096,.118,.12],[.20,0,0]],
 [[.020,.147,-.08],[.113,.135,.14],[.10,0,0]],
 [[.062,.213,.01],[.117,.118,.174],[-.45,0,-.12]],
 [[.117,.219,.151],[.113,.103,.182],[-.65,.10,-.35]],
 [[.175,.17,.271],[.100,.091,.148],[-.45,.25,-.45]],
 [[.213,.106,.365],[.071,.068,.117],[-.30,.40,-.40]]
 ];
 tailShapes.forEach(([xyz,r,rotation],i)=>coat(tail,xyz,r,{n:i===0?500:900,guard:true,length:.137,width:.013,lift:.42,flow:[.36,-.40,.91],rotation,tip:'#fff8ef'}));
 const ball=group(scene);ball.visible=false;
 const ballMat=paint('#b8c841',.93),seamMat=paint('#e9e9c6',.93);
 oval(ball,ballMat,[0,0,0],[.068,.068,.068]);
 // Raised, curved tennis-ball seam.
 const seamPoints=[];for(let i=0;i<=48;i++){const a=i/48*pi*2,y=Math.sin(a*2)*.026,r=Math.sqrt(.0685**2-y*y);seamPoints.push([r*Math.cos(a),y,r*Math.sin(a)]);}
 curve(ball,seamPoints,seamMat,.0022);
 return {root,torso,head,paws,tail,eyes,ball,jaw};
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function buildBoba3D(host,{rotateGesture=true}={}){
 let renderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{renderer=createSoftwareRenderer();}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.setClearColor(0,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 renderer.domElement.className='boba-3d-canvas';renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.9,.9,.9,-.9,.01,30);
 scene.add(new THREE.HemisphereLight(0xfffcf7,0xc6ccdb,1.55));
 const key=new THREE.DirectionalLight(0xfff8ef,1.85);key.position.set(3,5,4);scene.add(key);
 const fill=new THREE.DirectionalLight(0xe7efff,.75);fill.position.set(-3,2,1);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xfff0e2,.83);rim.position.set(0,3,-3);scene.add(rim);
 lowDetail=!!renderer.isSoftware;const model=dogModel(scene);lowDetail=false;
 // Contact shadow on the invisible floor also works over rear-camera video.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
 const ctx=shadowCanvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,4,64,64,62);grad.addColorStop(0,'rgba(43,32,43,.33)');grad.addColorStop(.5,'rgba(43,32,43,.20)');grad.addColorStop(1,'rgba(43,32,43,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
 const map=new THREE.CanvasTexture(shadowCanvas),shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.6),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));shadow.rotation.x=-pi/2;shadow.position.set(0,.007,-.12);scene.add(shadow);
 let yaw=.18, pitch=.14, distance=3, action='idle',start=performance.now(),raf=0,visible=true,disposed=false,w=0,h=0,lastFrame=0;
 let touchX=0,touchY=0,lastTouch=-Infinity;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 function cameraPose(){camera.position.set(Math.sin(yaw)*distance, .65+Math.sin(pitch)*distance,Math.cos(yaw)*distance);camera.lookAt(0,.67,0);}
 function size(){
  const r=host.getBoundingClientRect();w=r.width;h=r.height;if(!w||!h)return;
  const aspect=w/h,half=Math.max(.91,.86/aspect);
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);cameraPose();renderer.render(scene,camera);
 }
 function draw(now){
  if(!w||!h)return;
  if(action!=='idle'&&now-start>2700&&!motion.matches)action='idle';
  const t=Math.max(0,(now-start)/1000),active=action!=='idle'&&t<2.7,fx=active?(motion.matches?1:Math.min(1,t*5,Math.max(0,(2.7-t)*3.5))):0,move=active&&['walk','fetch','wag'].includes(action),quiet=active&&['sit','quiet','rest'].includes(action);
  const wave=motion.matches?0:Math.sin(now*.002);
  // Boba's reference approach: soft springy trot, alternating diagonal paws,
  // small head dip and chest bounce, with a calmer ball-carrying return.
  const fetching=active&&action==='fetch',trotting=move&&action!=='wag',gait=t*11.8;
  const carrying=fetching&&(t>.85||motion.matches);
  model.jaw.rotation.x=carrying?.26*fx:0;
  const returnPhase=fetching?Math.max(0,Math.min(1,(t-.85)/1.15)):0;
  model.root.position.set(trotting?Math.sin(gait*.5)*.025*fx:0,trotting?Math.abs(Math.sin(gait))*.024*fx:0,fetching?(-.18+.20*returnPhase)*fx:0);
  model.torso.scale.set(1+wave*.006,1+wave*.009,1+wave*.004);
  model.head.rotation.z=fx*(action==='cuddle'?-.12:action==='paw'?.09:0)+wave*.015;
  model.head.rotation.x=fx*(quiet?.09:action==='treat'?Math.sin(t*10)*.075:action==='talk'?Math.sin(t*10)*.035:fetching&&t<.85?Math.sin(t/.85*pi)*.20:trotting?Math.sin(gait)*.025:0);
  const lean=clamp(1-(now-lastTouch)/1450,0,1);
  model.head.rotation.y=fx*(move?Math.sin(t*6)*.06:0)+touchX*.30*lean;
  model.head.rotation.z-=touchX*.16*lean;
  model.head.rotation.x+=(touchY*.14-.08)*lean;
  model.tail.rotation.y=motion.matches?0:Math.sin(now*(active?.013:.0045))*(active&&!quiet?.27:.075);
  model.tail.rotation.z=motion.matches?0:Math.sin(now*.006)*.04;
  for(const paw of model.paws){
    paw.g.position.y=paw.y;paw.g.position.z=paw.z;
    const stride=Math.sin(gait)*(paw.front===(paw.side>0)?1:-1);
    paw.g.rotation.x=(trotting?stride*.29:quiet?.10:0)*fx;
    if(trotting)paw.g.position.y+=Math.max(0,stride)*.035*fx;
    if(active&&action==='paw'&&paw.front&&paw.side===1){paw.g.rotation.x=-.88*fx;paw.g.position.y+=.09*fx;}
  }
  const blink=(now%4400)>4250&&!motion.matches?Math.max(.15,Math.abs((now%4400)-4325)/75):1;model.eyes.forEach(e=>e.scale.y=blink*(1-lean*.42));
  model.ball.visible=fetching;
  if(fetching){
    if(t<.85&&!motion.matches){model.ball.position.set(.32*(1-t/.85),.066+Math.sin(t/.85*pi)*.065,.70);}
    else {model.head.updateWorldMatrix(true,false);model.ball.position.copy(model.head.localToWorld(v(0,-.115,.352)));}
  }
  cameraPose();renderer.render(scene,camera);
 }
 function loop(now){raf=0;if(!visible||disposed)return;if(now-lastFrame>(renderer.isSoftware?(action==='idle'?240:90):36)){lastFrame=now;if(!document.body.classList.contains('boba-ar-open')||host.closest('#boba-ar'))draw(now);}if(!motion.matches)raf=requestAnimationFrame(loop);}
 const run=()=>{if(!visible||disposed)return;if(motion.matches)draw(performance.now());else if(!raf)raf=requestAnimationFrame(loop);};
 function turn(delta){yaw+=delta;draw(performance.now());run();}
 let drag=null,suppress=false;
 if(rotateGesture){
  host.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,rotating:false};});
  host.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.rotating&&Math.hypot(dx,dy)>12){drag.rotating=true;suppress=true;host.setPointerCapture?.(e.pointerId);}if(drag.rotating){yaw-=(e.clientX-drag.lastX)*.012;pitch=clamp(pitch+(e.clientY-drag.lastY)*.003,-.10,.60);draw(performance.now());}drag.lastX=e.clientX;drag.lastY=e.clientY;});
  function end(){drag=null;}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(event,end);
  host.addEventListener('click',e=>{if(suppress){suppress=false;e.stopImmediatePropagation();e.preventDefault();}},{capture:true});
 }
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;if(raf)cancelAnimationFrame(raf);raf=0;});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{visible=true;size();run();});
 host.append(renderer.domElement);const resize=new ResizeObserver(size);resize.observe(host);
 const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible&&raf){cancelAnimationFrame(raf);raf=0;}else run();});io.observe(host);
 motion.addEventListener?.('change',()=>{if(raf)cancelAnimationFrame(raf);raf=0;run();});size();run();
 return {kind:'3d',software:!!renderer.isSoftware,stroke(x,y){touchX=clamp(2*x-1,-1,1);touchY=clamp(2*y-1,-1,1);lastTouch=performance.now();run();},play(next){action=next;start=performance.now();draw(start);run();},turn,reset(){yaw=.18;pitch=.14;draw(performance.now());},dispose(){disposed=true;resize.disconnect();io.disconnect();if(raf)cancelAnimationFrame(raf);renderer.dispose();renderer.domElement.remove();}};
}
// Exportable group tree used by offline asset checks; the actual daycare builds the same model.
export function makeBobaModel(software=false){const scene=new THREE.Scene();lowDetail=software;const model=dogModel(scene);lowDetail=false;scene.updateMatrixWorld(true);return model.root;}
