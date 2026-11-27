// One renderer follows the active worktop as recipes and rooms change.
import * as T from 'three';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {refineReferenceItems} from '../reference-details.mjs';
import {canvasRenderer} from './canvas-renderer.js';
import {colors} from './maker.js';
let renderer,scene,camera,pivot,prop,stream,batch,mould,observer,frame,canvas,host,recipe,phase,count;
let library,loading,stamp=0,start=0,contact=null,touchY=0,moveY=0,move=0,twist=0,parts=[],shell=[];
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const makeMat=(color,roughness=.3,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
function mesh(parent,geometry,material,x=0,y=0,z=0){const obj=new T.Mesh(geometry,material);obj.position.set(x,y,z);parent.add(obj);return obj}
function box(parent,x,y,z,w,h,d,color){return mesh(parent,new T.BoxGeometry(w,h,d),makeMat(color),x,y,z)}
function ball(parent,x,y,z,w,h,d,material){const o=mesh(parent,new T.SphereGeometry(1,w<.1?9:28,w<.1?6:16),material,x,y,z);o.scale.set(w,h,d);return o}
function cylinder(parent,x,y,z,a,b,h,m){return mesh(parent,new T.CylinderGeometry(a,b,h,48),m,x,y,z)}
function ring(parent,x,y,z,r,t,m){const o=mesh(parent,new T.TorusGeometry(r,t,12,64),m,x,y,z);o.rotation.x=Math.PI/2;return o}
function free(group){group.traverse(o=>{if(o.isMesh&&!o.userData.borrowed)o.geometry.dispose();if(o.isMesh){for(const m of [].concat(o.material))m.dispose()}});group.removeFromParent()}
function init(){
 canvas=document.createElement('canvas');canvas.className='bench-view';canvas.setAttribute('aria-hidden','true');
 try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'})}catch{renderer=canvasRenderer(canvas)}renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 scene=new T.Scene();camera=new T.PerspectiveCamera(33,1,.1,45);
 const env=document.createElement('canvas');env.width=512;env.height=256;const ctx=env.getContext('2d');
 ctx.fillStyle='#41304e';ctx.fillRect(0,0,512,256);ctx.fillStyle='#fae9ff';ctx.fillRect(32,24,105,95);ctx.fillStyle='#ff92cb';ctx.fillRect(250,73,95,58);ctx.fillStyle='#adf4ff';ctx.fillRect(431,16,24,135);ctx.fillStyle='#dcd0cb';ctx.fillRect(0,182,512,74);
 const envTex=new T.CanvasTexture(env);envTex.mapping=T.EquirectangularReflectionMapping;envTex.colorSpace=T.SRGBColorSpace;scene.environment=envTex;
 scene.add(new T.HemisphereLight(0xfff4ff,0x6a3964,2.1));for(const [x,y,z,c,i] of [[-4,6,3,0xffffff,3],[4,2,-1,0x99dfff,2],[-3,1,-2,0xff69bb,2]]){let l=new T.DirectionalLight(c,i);l.position.set(x,y,z);scene.add(l)}
 const chrome=makeMat('#d9cde2',.19,.87),metal=makeMat('#c0a2bf',.32,.72);
 box(scene,0,-.65,0,15,.25,8,'#c9a9bf').renderOrder=-8;
 for(let j=0;j<9;j++)for(let i=0;i<14;i++){const tile=box(scene,(i-6.5)*.8,-.507,(j-4)*.8,.792,.06,.792,(i+j)%2?'#c6a2c1':'#e3c1cf');tile.renderOrder=-7}
 for(const side of [-1,1]){box(scene,side*2.85,.72,-2.55,2.5,.1,.55,'#a78da6');for(let j=0;j<5;j++){const x=side*(1.79+j*.46),h=.46+(j%2)*.16;const bottle=makeMat(colors[(j+(side===1?1:0))%6],.22,.13);cylinder(scene,x,.79+h/2,-2.53,.16,.18,h,bottle);cylinder(scene,x,.81+h,-2.53,.09,.105,.12,chrome);cylinder(scene,x,.93,-2.53,.174,.174,.13,makeMat('#fff0ec'))}}
 
 cylinder(scene,0,-.39,0,1.96,1.88,.23,metal).renderOrder=-5;cylinder(scene,0,-.263,0,1.8,1.8,.033,makeMat('#edd0e2',.45,.2)).renderOrder=-4;ring(scene,0,-.27,0,1.88,.066,chrome).renderOrder=-3;
 for(const side of [-1,1]){for(let j=0;j<3;j++){const x=side*(2.08+j*.48),z=-1.45-j*.15,h=.66+(j%2)*.16;const jar=makeMat(colors[(j+(side===1?2:0))%6],.14,.18);cylinder(scene,x,-.5+h/2,z,.23,.23,h,jar);cylinder(scene,x,-.47+h,z,.24,.24,.12,chrome);ring(scene,x,-.32,z,.22,.03,metal)}}
 const shadow=ball(scene,0,-.233,0,1.26,.018,.73,makeMat('#ad859e',.9));shadow.renderOrder=-2;shadow.material.transparent=true;shadow.material.opacity=.35;
 observer=new ResizeObserver(resize);start=performance.now()-1400;
}
function resize(){if(!host?.isConnected)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(.8,2.6,w/h<1.12?6.9:5.55);camera.lookAt(0,.68,0);camera.updateProjectionMatrix();renderer.render(scene,camera)}
async function models(){if(library)return library;if(!loading)loading=(async()=>{const result=await fetch('../assets/models.gltf.gz');if(!result.ok)throw Error();const raw=await new Response(result.body.pipeThrough(new DecompressionStream('gzip'))).text();const gltf=await new GLTFLoader().parseAsync(raw,'');const list=gltf.scene.getObjectByName('SquishyItems').children.filter(x=>x.isMesh||x.getObjectByProperty('isMesh',true));const names=await (await fetch('../assets/catalog.json')).json();list.forEach((x,i)=>x.name=names[i]);refineReferenceItems(list);library=list;return list})().catch(()=>{loading=null;return []});return loading}
const workPhases=new Set(['mould','core','cast','peel']);
const pourPhases=new Set(['mould','cast','fill','stir','activate','bath','dip']);
function build(){
 if(batch)free(batch);batch=new T.Group();scene.add(batch);pivot=new T.Group();batch.add(pivot);pivot.position.y=-.23;
 const r=recipe,slime=r.kind===2,hue=colors[r.pigment],soft=new T.MeshPhysicalMaterial({color:hue,roughness:r.finish===1?.35:.17,clearcoat:1,clearcoatRoughness:.14,iridescence:r.finish===2?.7:.16,metalness:.03});
 shell=[];parts=[];mould=null;
 const visibleWax=r.kind===1&&!['master','coreColor'].includes(phase)&&count<r.finish+3;
 const real=!slime&&r.shape<2&&library?.find(m=>m.name===(r.shape===0?'Galaxy Steamer Bao':'Purple Kitty Squish'));
 if(real){const obj=real.clone(true),g=new T.Group();g.add(obj);const bounds=new T.Box3().setFromObject(obj),sz=bounds.getSize(new T.Vector3());obj.position.sub(bounds.getCenter(new T.Vector3()));const k=2.1/Math.max(sz.x,sz.y,sz.z);g.scale.setScalar(k);g.rotation.y=Math.PI;g.position.y=sz.y*k/2;pivot.add(g);
 obj.traverse(o=>{if(!o.isMesh)return;o.userData.borrowed=true;const replace=m=>{const m2=m.clone();m2.metalness=0;m2.roughness=.36;if(!['master','mould'].includes(phase)&&m2.color&&m2.color.getHSL({}).l>.35)m2.color.lerp(new T.Color(r.kind===1?colors[r.accent]:hue),.4);return m2};o.material=Array.isArray(o.material)?o.material.map(replace):replace(o.material)});soft.dispose();
 }else{const lump=ball(pivot,0,.45,0,1.16,.49,.88,soft);if(!slime&&r.shape===1){for(const side of [-1,1])mesh(pivot,new T.ConeGeometry(.24,.6,16),soft,side*.64,.93,0)}if(slime||r.shape===2){for(let j=0;j<5;j++){const a=j*1.256;ball(pivot,Math.cos(a)*.65,.26,Math.sin(a)*.52,.53,.27,.45,soft)}}else{for(let j=0;j<7;j++){const a=j*2*Math.PI/7;const fold=ball(pivot,Math.cos(a)*.26,.87,Math.sin(a)*.24,.14,.17,.33,soft);fold.rotation.y=-a+.6}}if(slime&&r.finish===2||r.kind===0&&r.filling===2){for(let j=0;j<46;j++){let a=j*2.4,b=(j+.5)/46,rad=Math.sqrt(1-b*b);ball(pivot,Math.cos(a)*rad*1.14,.45+b*.47,Math.sin(a)*rad*.86,.055,.055,.055,makeMat(colors[j%6],.43))}}if(slime&&r.charm&&['jar','play'].includes(phase)){const charm=new T.Shape();for(let j=0;j<10;j++){const a=Math.PI/2+j*Math.PI/5,rad=j%2?.12:.25;const x=Math.cos(a)*rad,y=Math.sin(a)*rad;j?charm.lineTo(x,y):charm.moveTo(x,y)}charm.closePath();mesh(pivot,new T.ExtrudeGeometry(charm,{depth:.05,bevelThickness:.025,bevelSize:.02,bevelSegments:2}),makeMat(r.charm===1?'#ffda62':'#ffa5da'),.28,.79,.49)}}
 if(visibleWax){const wax=makeMat(hue,.26,.04);for(let j=0;j<12;j++){if(phase==='play'&&count>0&&j%4<count)continue;const piece=mesh(pivot,new T.SphereGeometry(1,8,18,j*Math.PI/6,Math.PI/6-.012),wax,0,.48,0);piece.scale.set(1.14,.68,.9);shell.push(piece)}}
 if(r.kind===0&&['core','cast','peel','fill'].includes(phase)){
 const hollow=pivot.children[0];hollow?.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material)){m.transparent=true;m.opacity=r.finish===1?.47:.31;m.depthWrite=false}});
 const inner=makeMat(phase==='fill'?hue:'#ede5ef',phase==='fill'?.14:.47);const level=phase==='fill'?.18+Math.min(3,count)*.2:.72;
 ball(pivot,0,level*.51,0,.72,level*.51,.57,inner);
 if(phase==='fill'&&r.filling===2)for(let i=0;i<16;i++){const a=i*2.4;ball(pivot,.55*Math.cos(a),.18+(i%4)*level*.15,Math.sin(a)*.43,.06,.06,.06,makeMat(colors[i%6]))}
 }
 if(workPhases.has(phase)){mould=new T.Group();batch.add(mould);for(const s of [-1,1]){const mat=new T.MeshPhysicalMaterial({color:'#8cdac9',transparent:true,opacity:.54,roughness:.35,depthWrite:false});const block=mesh(mould,new T.BoxGeometry(.42,.88,1.99),mat,s*1.05,.22,0);parts.push(block)}}
 prop=new T.Group();batch.add(prop);const silver=makeMat('#e6dfee',.18,.87);
 if(pourPhases.has(phase)){cylinder(prop,0,0,0,.27,.21,.55,makeMat(phase==='fill'?'#b9ebf1':'#f3cde7',.16,.44));ring(prop,0,.28,0,.27,.03,silver);cylinder(prop,0,.265,0,.236,.236,.015,makeMat(hue));cylinder(prop,0,-.39,0,.08,.028,.28,silver);prop.rotation.z=-.46;prop.position.set(-1.02,1.59,.21)}
 if(['fold','scent','jar','bowl','stir','activate','bath','dip'].includes(phase)){const bmat=new T.MeshPhysicalMaterial({color:'#b3d6e0',transparent:true,opacity:.39,roughness:.13,metalness:.22,side:T.DoubleSide,depthWrite:false});mesh(batch,new T.LatheGeometry([new T.Vector2(.76,0),new T.Vector2(1.16,.22),new T.Vector2(1.32,.66)],56),bmat,0,-.23,0);ring(batch,0,.43,0,1.32,.033,silver)}
 stream=cylinder(batch,-.76,.85,.18,.045,.066,.8,makeMat(phase==='mould'?'#a3ddd4':hue,.13));stream.visible=false;
 resize();
}
function tick(now){if(!host?.isConnected)return;const t=Math.min(1,(now-start)/950),pulse=reduced?0:Math.sin(Math.max(0,t)*Math.PI);const hand=contact===null?0:.16;const stretch=contact!==null&&['fold','play','stir'].includes(phase)?Math.abs(move)*.45:0;
 pivot.rotation.y=twist;pivot.position.x=phase==='master'&&contact!==null?move*.72:0;pivot.scale.set(1+pulse*.13+hand+stretch,1-pulse*.18-hand-stretch*.42,1+pulse*.12);if(phase==='fill')pivot.scale.multiplyScalar(.74+Math.min(count,3)*.09);if(phase==='dip')pivot.position.y=-.23-pulse*.25-Math.max(0,moveY)*.4;else pivot.position.y=-.23;
 if(prop){prop.rotation.z=-.46-pulse*.55-Math.abs(move)*.95;prop.position.x=-1.02+move*.7;prop.position.y=1.59-moveY*.48}stream.visible=pourPhases.has(phase)&&(pulse>.15||contact!==null);if(parts.length)for(let i=0;i<parts.length;i++)parts[i].position.x=(i?1:-1)*(1.05+(phase==='peel'?pulse*.4:0));renderer.render(scene,camera);
 if(t<1)frame=requestAnimationFrame(tick)}
function wake(){cancelAnimationFrame(frame);frame=requestAnimationFrame(tick)}
export function showBench(tray,r,stage,progress=0,animate=false){
 try{if(!renderer)init();if(host!==tray){if(host)observer.unobserve(host);host=tray;observer.observe(host);contact=null;move=0;twist=0;
 tray.addEventListener('pointerdown',e=>{contact=e.clientX;touchY=e.clientY;moveY=0;move=0;wake()});tray.addEventListener('pointermove',e=>{if(contact===null)return;moveY=Math.max(-1,Math.min(1,(e.clientY-touchY)/72));move=Math.max(-1,Math.min(1,(e.clientX-contact)/90));twist=move*.9;wake()});for(const name of ['pointerup','pointercancel','lostpointercapture'])tray.addEventListener(name,()=>{contact=null;moveY=0;move=0;wake()});}
 recipe=r;phase=stage;count=progress;const id=++stamp;tray.append(canvas);build();if(animate)start=performance.now();wake();
 if(!library&&r.kind!==2&&r.shape<2)models().then(list=>{if(list.length&&id===stamp&&host.isConnected){build();wake()}});
 }catch{canvas?.remove()}
}
