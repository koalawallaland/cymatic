// Original articulated, volumetric Samoyed. Coordinates are in scene units;
// each coat tuft is real mesh geometry, not a camera-facing photo.
import * as THREE from '../squish/vendor/three.module.js';
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const pi=Math.PI;
function rng(seed=1138){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
const random=rng();
const c=(hex)=>new THREE.Color(hex);
const paint=(color,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0});
const cream=paint('#e4d8cd'),muzzleMat=paint('#f5eee5'),innerEar=paint('#be9d96',.96),black=paint('#302b2c',.36),noseMat=paint('#292326',.32),iris=paint('#382b26',.28),mouth=paint('#4c3938',.88),toe=paint('#ded2c9',.84);
const furMat=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1,metalness:0});
const globe=new THREE.SphereGeometry(1,24,16);
const group=(parent,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};
function oval(parent,mat,xyz,radii,rotation=null){const m=new THREE.Mesh(globe,mat);m.position.set(...xyz);m.scale.set(...radii);if(rotation)m.rotation.set(...rotation);parent.add(m);return m;}
function curve(parent,pts,material,radius=.009){const path=new THREE.CatmullRomCurve3(pts.map(p=>v(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(path,24,radius,6,false),material);parent.add(m);return m;}
// Coat: curved leaf-like locks. The base is an ellipsoid undercoat; overlapping
// tiny tapered, directional tufts catch light from every viewing angle.
function coat(parent,xyz,radii,opts={}){
 const g=group(parent,...xyz);if(opts.rotation)g.rotation.set(...opts.rotation);
 const [rx,ry,rz]=radii;
 oval(g,opts.base||cream,[0,0,0],radii);
 const count=Math.round((opts.n??1600)*.85), length=(opts.length??.065)*.82, width=(opts.width??.013)*1.17, lift=(opts.lift??.32)*.72;
 const flow=v(...(opts.flow||[0,-.88,-.45])).normalize();
 const roots=[],colors=[],idx=[],normals=[];
 const rootColor=c(opts.root||'#e5dacf'),tipColor=c(opts.tip||'#fffaf2');
 for(let i=0;i<count;i++){
   const z=random()*2-1,a=random()*2*pi,r=Math.sqrt(Math.max(0,1-z*z));
   const d=v(r*Math.cos(a),z,r*Math.sin(a));
   if(opts.exclude?.(d))continue;
   const p=v(d.x*rx,d.y*ry,d.z*rz),n=v(d.x/rx,d.y/ry,d.z/rz).normalize();
   const tug=flow.clone().addScaledVector(n,-flow.dot(n));
   if(tug.lengthSq()<.03)tug.set(d.x>=0?1:-1,0,0).addScaledVector(n,-n.x*(d.x>=0?1:-1));
   tug.normalize();
   const s=v().crossVectors(n,tug).normalize();tug.addScaledVector(s,(random()-.5)*.48).normalize();
   const l=length*(.65+random()*.75),w=width*(.65+random()*.75);
   // Root buried in the undercoat, then a curved wedge following hair growth.
   const b=p.clone().addScaledVector(n,-.003),m=p.clone().addScaledVector(tug,l*.43).addScaledVector(n,l*lift*.94),t=p.clone().addScaledVector(tug,l).addScaledVector(n,l*lift);
   const apex=m.clone().addScaledVector(n,w*.27);
   const vertices=[b.clone().addScaledVector(s,-w*.68),b.clone().addScaledVector(s,w*.68),m.clone().addScaledVector(s,-w*.31),apex,m.clone().addScaledVector(s,w*.31),t];
   const shade=.92+random()*.17;
   const root=rootColor.clone().multiplyScalar(shade),mid=root.clone().lerp(tipColor,.68),tip=tipColor.clone().multiplyScalar(.96+random()*.07);
   const base=roots.length/3;
   vertices.forEach((a,j)=>{roots.push(a.x,a.y,a.z);const col=j<2?root:j===5?tip:mid;colors.push(col.r,col.g,col.b);const nn=n.clone().addScaledVector(tug,.12).addScaledVector(s,j===2?-.22:j===4?.22:0).normalize();normals.push(nn.x,nn.y,nn.z);});
   idx.push(base,base+1,base+3,base,base+3,base+2,base+1,base+4,base+3,base+2,base+3,base+5,base+3,base+4,base+5);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(roots,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeBoundingSphere();
 g.add(new THREE.Mesh(geo,furMat));return g;
}
function ear(parent,side){
 const e=group(parent,side*.14,.17,-.045);e.rotation.z=-side*.13;e.rotation.y=side*.12;
 const shape=new THREE.Shape();shape.moveTo(-.082,-.039);shape.quadraticCurveTo(-.092,.025,-.045,.090);shape.quadraticCurveTo(.005,.174,.018,.169);shape.quadraticCurveTo(.069,.114,.081,.027);shape.quadraticCurveTo(.084,-.020,-.032,-.043);shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:.036,bevelEnabled:true,bevelSegments:4,bevelThickness:.015,bevelSize:.013,steps:1,curveSegments:18});
 const mesh=new THREE.Mesh(geo,cream);mesh.position.z=-.022;e.add(mesh);
 const inside=new THREE.Shape();inside.moveTo(-.049,-.014);inside.quadraticCurveTo(-.04,.064,.011,.126);inside.quadraticCurveTo(.04,.080,.051,.010);inside.quadraticCurveTo(.018,-.025,-.049,-.014);inside.closePath();
 const pink=new THREE.Mesh(new THREE.ShapeGeometry(inside,18),innerEar);pink.position.z=.039;e.add(pink);
 coat(e,[-.051,.025,.012],[.032,.075,.032],{n:250,length:.028,width:.008,flow:[side*.12,1,.1],tip:'#fff9ed'});
 coat(e,[.054,.026,.01],[.032,.077,.032],{n:250,length:.028,width:.008,flow:[side*.12,1,.1],tip:'#fff9ed'});
 return e;
}
function dogModel(scene){
 const root=group(scene),torso=group(root);
 // Broad back, tuck and full chest ruff. Legs remain separate articulated joints.
 coat(torso,[0,.625,-.16],[.247,.265,.49],{n:2300,length:.075,width:.014,flow:[0,-.82,-.57]});
 coat(torso,[0,.65,-.49],[.255,.265,.244],{n:1200,length:.078,width:.013,flow:[0,-.90,-.30]});
 coat(torso,[0,.75,.22],[.305,.368,.307],{n:3200,length:.120,width:.018,lift:.30,flow:[0,-.98,-.08]});
 coat(torso,[0,.66,.355],[.243,.295,.207],{n:1700,length:.105,width:.017,flow:[0,-1,.09],tip:'#fff9ee'});
 const head=group(torso,0,1.02,.372);
 coat(head,[0,.075,.028],[.197,.183,.190],{n:1600,length:.033,width:.009,flow:[0,-.88,-.38],exclude:d=>d.z>.52&&d.y<.22});
 coat(head,[-.145,.005,.048],[.102,.150,.127],{n:850,length:.059,width:.014,flow:[-.26,-.96,-.16]});
 coat(head,[.145,.005,.048],[.102,.150,.127],{n:850,length:.059,width:.014,flow:[.26,-.96,-.16]});
 coat(head,[0,-.075,.05],[.20,.122,.139],{n:700,length:.045,width:.013,flow:[0,-1,0]});
 ear(head,-1);ear(head,1);
 // Gradually tapered fox-like muzzle, not a spherical toy snout.
 coat(head,[0,.019,.174],[.126,.105,.136],{n:650,length:.018,width:.006,lift:.23,flow:[0,-.4,.9],tip:'#fffdf5',base:muzzleMat});
 oval(head,muzzleMat,[0,-.026,.25],[.090,.068,.088]);
 oval(head,muzzleMat,[0,-.058,.201],[.110,.052,.095]);
 // Rounded triangular black nose with nostrils.
 const noseShape=new THREE.Shape();noseShape.moveTo(-.058,.018);noseShape.quadraticCurveTo(-.061,.039,-.028,.041);noseShape.quadraticCurveTo(0,.044,.028,.041);noseShape.quadraticCurveTo(.061,.039,.058,.018);noseShape.quadraticCurveTo(.049,-.014,.018,-.029);noseShape.quadraticCurveTo(0,-.04,-.018,-.029);noseShape.quadraticCurveTo(-.049,-.014,-.058,.018);
 const noseGeom=new THREE.ExtrudeGeometry(noseShape,{depth:.019,bevelEnabled:true,bevelThickness:.008,bevelSize:.009,bevelSegments:3,steps:1,curveSegments:16});
 const nose=new THREE.Mesh(noseGeom,noseMat);nose.position.set(0,.002,.314);nose.scale.set(.82,.85,1);head.add(nose);
 for(const s of [-1,1])oval(head,black,[s*.024,.012,.342],[.017,.008,.004],[0,s*.15,s*.15]);
 curve(head,[[0,-.027,.334],[0,-.046,.331],[0,-.061,.316]],mouth,.005);
 for(const s of [-1,1]){
   curve(head,[[0,-.061,.316],[s*.037,-.067,.305],[s*.066,-.060,.271],[s*.091,-.039,.218]],mouth,.004);
   for(let k=0;k<5;k++){const x=s*(.056+(k%3)*.014),y=-.012-Math.floor(k/3)*.014,z=.287-(k%3)*.007;oval(head,toe,[x,y,z],[.0035,.0035,.0025]);}
 }
 const eyes=[];
 for(const s of [-1,1]){
   const e=group(head,s*.105,.095,.195);e.rotation.y=s*.34;e.rotation.z=s*-.14;
   oval(e,black,[0,0,0],[.037,.021,.015]);
   const eye=oval(e,iris,[0,0,.008],[.024,.018,.011]);oval(e,black,[0,0,.016],[.014,.016,.007]);
   oval(e,paint('#fffef7',.3),[-.008,.008,.022],[.006,.005,.0025]);
   eyes.push(e);
   coat(head,[s*.115,.132,.139],[.060,.029,.042],{n:180,length:.021,width:.008,flow:[s*.20,-1,.25],tip:'#fffaf0'});
 }
 const paws=[];
 for(const s of [-1,1]){
   const front=group(root,s*.158,.61,.245);
   coat(front,[0,-.115,0],[.105,.235,.105],{n:700,length:.067,width:.012,flow:[0,-1,-.11]});
   coat(front,[0,-.379,.01],[.066,.208,.069],{n:480,length:.036,width:.008,flow:[0,-1,-.06]});
   coat(front,[0,-.554,.037],[.084,.052,.098],{n:275,length:.014,width:.007,flow:[0,-.25,1],tip:'#fff9ee',base:muzzleMat});
   for(let i=-1;i<=1;i++)oval(front,toe,[i*.044,-.567,.104],[.028,.026,.038]);
   paws.push({g:front,front:true,side:s,z:.245,y:.61});
   const rear=group(root,s*.173,.62,-.46);
   coat(rear,[0,-.11,0],[.135,.207,.169],{n:780,length:.074,width:.013,flow:[0,-1,-.2]});
   coat(rear,[0,-.333,-.04],[.071,.168,.085],{n:450,length:.039,width:.009,flow:[0,-1,.2]});
   coat(rear,[0,-.498,.009],[.063,.105,.069],{n:280,length:.023,width:.008,flow:[0,-1,.13]});
   coat(rear,[0,-.562,.036],[.079,.052,.092],{n:240,length:.014,width:.007,flow:[0,-.25,1],base:muzzleMat});
   for(let i=-1;i<=1;i++)oval(rear,toe,[i*.041,-.576,.099],[.027,.024,.035]);
   paws.push({g:rear,front:false,side:s,z:-.46,y:.62});
 }
 const tail=group(torso,0,.78,-.555);
 const tailShapes=[
 [[0,.045,-.07],[.103,.116,.12],[.20,0,0]],
 [[.025,.135,-.09],[.124,.145,.14],[.10,0,0]],
 [[.08,.205,-.01],[.139,.14,.153],[-.45,0,-.12]],
 [[.125,.216,.123],[.142,.12,.168],[-.65,.10,-.35]],
 [[.183,.16,.225],[.127,.112,.151],[-.45,.25,-.45]],
 [[.21,.102,.268],[.095,.095,.126],[-.30,.40,-.40]]
 ];
 tailShapes.forEach(([xyz,r,rotation],i)=>coat(tail,xyz,r,{n:i===0?440:760,length:.088,width:.019,lift:.28,flow:[.18,-.60,.78],rotation,tip:'#fff8ef'}));
 const ball=oval(scene,paint('#c7d644',.62),[.52,.08,.33],[.07,.07,.07]);ball.visible=false;
 return {root,torso,head,paws,tail,eyes,ball};
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function buildBoba3D(host,{rotateGesture=true}={}){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.setClearColor(0,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.domElement.className='boba-3d-canvas';renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.9,.9,.9,-.9,.01,30);
 scene.add(new THREE.HemisphereLight(0xfffbf4,0xb7a7aa,2.05));
 const key=new THREE.DirectionalLight(0xfff2e4,2.55);key.position.set(3,5,4);scene.add(key);
 const fill=new THREE.DirectionalLight(0xe1e9ff,1.25);fill.position.set(-3,2,1);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xffe7d6,1.30);rim.position.set(0,3,-3);scene.add(rim);
 const model=dogModel(scene);
 // Contact shadow on the invisible floor also works over rear-camera video.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
 const ctx=shadowCanvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,4,64,64,62);grad.addColorStop(0,'rgba(43,32,43,.33)');grad.addColorStop(.5,'rgba(43,32,43,.20)');grad.addColorStop(1,'rgba(43,32,43,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
 const map=new THREE.CanvasTexture(shadowCanvas),shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.6),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));shadow.rotation.x=-pi/2;shadow.position.set(0,.007,-.12);scene.add(shadow);
 let yaw=.45, pitch=.19, distance=3, action='idle',start=performance.now(),raf=0,visible=true,disposed=false,w=0,h=0,lastFrame=0;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 function cameraPose(){camera.position.set(Math.sin(yaw)*distance, .65+Math.sin(pitch)*distance,Math.cos(yaw)*distance);camera.lookAt(0,.67,0);}
 function size(){
  const r=host.getBoundingClientRect();w=r.width;h=r.height;if(!w||!h)return;
  const aspect=w/h,half=Math.max(.83,.77/aspect);
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);cameraPose();renderer.render(scene,camera);
 }
 function draw(now){
  if(!w||!h)return;
  const t=Math.max(0,(now-start)/1000),active=action!=='idle'&&t<2.7,fx=active?(motion.matches?1:Math.min(1,t*5,Math.max(0,(2.7-t)*3.5))):0,move=active&&['walk','fetch','wag'].includes(action),quiet=active&&['sit','quiet','rest'].includes(action);
  const wave=motion.matches?0:Math.sin(now*.002);
  model.root.position.set(move?Math.sin(t*5)*.07*fx:0,move?Math.abs(Math.sin(t*9))*.022*fx:0,0);
  model.torso.scale.set(1+wave*.006,1+wave*.009,1+wave*.004);
  model.head.rotation.z=fx*(action==='cuddle'?-.12:action==='paw'?.09:0)+wave*.015;
  model.head.rotation.x=fx*(quiet?.09:action==='treat'?Math.sin(t*10)*.075:action==='talk'?Math.sin(t*10)*.035:0);
  model.head.rotation.y=fx*(move?Math.sin(t*6)*.06:0);
  model.tail.rotation.y=motion.matches?0:Math.sin(now*(active?.013:.0045))*(active&&!quiet?.27:.075);
  model.tail.rotation.z=motion.matches?0:Math.sin(now*.006)*.04;
  for(const paw of model.paws){
    paw.g.position.y=paw.y;paw.g.position.z=paw.z;
    paw.g.rotation.x=(move&&action!=='wag'?Math.sin(t*10)*.32*(paw.front=== (paw.side>0)?1:-1):quiet?.10:0)*fx;
    if(active&&action==='paw'&&paw.front&&paw.side===1){paw.g.rotation.x=-.88*fx;paw.g.position.y+=.09*fx;}
  }
  const blink=(now%4400)>4250&&!motion.matches?Math.max(.15,Math.abs((now%4400)-4325)/75):1;model.eyes.forEach(e=>e.scale.y=blink);
  model.ball.visible=active&&action==='fetch';if(model.ball.visible)model.ball.position.set(.50+Math.sin(t*4)*.1,.075+Math.max(0,Math.sin(t*7))*.07*fx,.34);
  cameraPose();renderer.render(scene,camera);
 }
 function loop(now){raf=0;if(!visible||disposed)return;if(now-lastFrame>36){lastFrame=now;if(!document.body.classList.contains('boba-ar-open')||host.closest('#boba-ar'))draw(now);}if(!motion.matches)raf=requestAnimationFrame(loop);}
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
 return {kind:'3d',play(next){action=next;start=performance.now();draw(start);run();},turn,reset(){yaw=.45;pitch=.19;draw(performance.now());},dispose(){disposed=true;resize.disconnect();io.disconnect();if(raf)cancelAnimationFrame(raf);renderer.dispose();renderer.domElement.remove();}};
}
// Exportable group tree used by offline asset checks; the actual daycare builds the same model.
export function makeBobaModel(){const scene=new THREE.Scene();const model=dogModel(scene);scene.updateMatrixWorld(true);return model.root;}
