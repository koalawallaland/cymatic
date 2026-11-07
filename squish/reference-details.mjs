import * as THREE from './vendor/three.module.js';

export const referenceNames = new Set(['Galaxy Steamer Bao','Squishy Strawberry','Pink Axolotl','Strawberry Butter']);
const cached = new Map();
const fract = n => n-Math.floor(n);
const hash = (x,y,z=0) => fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);
function noise(x,y,z) {
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const ease=t=>t*t*(3-2*t),a=ease(fract(x)),b=ease(fract(y)),c=ease(fract(z));
  const mix=(x,y,t)=>x+(y-x)*t;
  return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),a),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),a),b),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),a),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),a),b),c);
}
function texture(kind) {
  if(cached.has(kind))return cached.get(kind);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d'),image=c.createImageData(512,512);
  const colors=kind==='galaxy'?[[239,187,143],[221,145,193],[190,153,224],[141,181,222],[154,207,182]]:null;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const u=x/512*Math.PI*2,v=y/511*Math.PI,sx=Math.sin(v)*Math.cos(u),sy=Math.cos(v),sz=Math.sin(v)*Math.sin(u);
    const broad=noise(sx*3+8,sy*3+8,sz*3+8),fine=hash(x%511,y),index=(y*512+x)*4;
    let rgb;
    if(colors){const phase=(broad*3.6+noise(sx*6+3,sy*6+3,sz*6+3)*.8)%colors.length,i=Math.floor(phase),t=phase-i;rgb=colors[i].map((n,k)=>n+(colors[(i+1)%colors.length][k]-n)*t);}
    else if(kind==='pink')rgb=[240,166,205].map(n=>n+(broad-.5)*24);
    else rgb=[225,42,35].map(n=>n+(broad-.5)*14);
    const grain=(fine-.5)*(kind==='red'?13:30),sparkle=kind!=='red'&&fine>.988?(fine-.988)/.012*65:0;
    for(let k=0;k<3;k++)image.data[index+k]=Math.max(0,Math.min(255,rgb[k]+grain+sparkle));image.data[index+3]=255;
  }
  c.putImageData(image,0,0);
  if(kind!=='red')for(let i=0;i<135;i++){
    const x=hash(i,42)*512,y=hash(i,83)*512,r=hash(i,99)*1.3+.35;
    c.fillStyle='rgba(255,248,255,.72)';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
    if(i%11===0){c.strokeStyle='rgba(255,255,255,.65)';c.lineWidth=.65;c.beginPath();c.moveTo(x-r*2,y);c.lineTo(x+r*2,y);c.moveTo(x,y-r*2);c.lineTo(x,y+r*2);c.stroke();}
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;map.anisotropy=4;
  const bumpCanvas=document.createElement('canvas');bumpCanvas.width=bumpCanvas.height=256;
  const b=bumpCanvas.getContext('2d'),pixels=b.createImageData(256,256);
  for(let i=0;i<256*256;i++){const value=100+hash(i%256,Math.floor(i/256))*50;pixels.data.set([value,value,value,255],i*4);}b.putImageData(pixels,0,0);
  const bump=new THREE.CanvasTexture(bumpCanvas);bump.wrapS=THREE.RepeatWrapping;
  const result={map,bump};cached.set(kind,result);return result;
}
function finish(kind) {
  const t=texture(kind);
  return new THREE.MeshPhysicalMaterial({color:0xffffff,map:t.map,bumpMap:t.bump,bumpScale:kind==='red'?.009:.008,roughness:kind==='red'?.68:.57,metalness:0,clearcoat:kind==='galaxy'?.3:.12,clearcoatRoughness:.45,sheen:kind==='pink'?.35:0,sheenColor:0xffd6ed});
}
function surfaceUV(mesh) {
  // The Roblox primitive UVs repeat in narrow strips. Unwrap the existing
  // surface once so cloud color and fine glitter follow the whole shape.
  const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  const positions=geometry.attributes.position,uv=new Float32Array(positions.count*2);
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),r=Math.hypot(x,y,z)||1;
    uv[i*2]=Math.atan2(z,x)/(Math.PI*2)+.5;uv[i*2+1]=Math.acos(Math.max(-1,Math.min(1,y/r)))/Math.PI;
  }
  for(let i=0;i<positions.count;i+=3){const u=[uv[i*2],uv[(i+1)*2],uv[(i+2)*2]];if(Math.max(...u)-Math.min(...u)>.5)for(let j=0;j<3;j++)if(uv[(i+j)*2]<.5)uv[(i+j)*2]+=1;}
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));mesh.geometry=geometry;
}
const baseName=o=>o.name.replace(/_\d+$/,'');
function colorMaterial(mesh,color,roughness=.6) {
  mesh.material=mesh.material.clone();mesh.material.color.set(color);mesh.material.roughness=roughness;mesh.material.metalness=0;
}
function butterLabel(item) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#d93453';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 174px Arial, sans-serif';ctx.fillText('BUTTER',512,139);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  for(const side of [-1,1]){const label=new THREE.Mesh(new THREE.PlaneGeometry(1.58,.395),material);label.name='Butter wrapper lettering';label.position.set(0,-.035,side*.405);if(side<0)label.rotation.y=Math.PI;item.add(label);}
  const positions=[];
  for(const side of [-1,1])for(const end of [-1,1]){
    positions.push(end*1.18,-.23,side*.403,end*.98,0,side*.403,end*.98,0,side*.403,end*1.18,.23,side*.403);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const folds=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xd6789f,transparent:true,opacity:.7}));folds.name='Wrapper end folds';item.add(folds);
}
function reshapeStrawberry(item, material) {
  const seeds=[];
  const radiusAt=y=>{const ny=Math.max(-.999,Math.min(.999,(y+.035)/.83));return Math.sqrt(1-ny*ny)*(.78+.18*ny);};
  for(const child of [...item.children]){
    const name=baseName(child);
    if(['Slice','Top','Tip'].includes(name))item.remove(child);
    if(name==='Seed'){
      const y=child.position.y,angle=Math.atan2(child.position.z,child.position.x),r=radiusAt(y);
      const surface=new THREE.Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r);seeds.push(surface);
      const slope=(radiusAt(y+.005)-radiusAt(y-.005))/.01;
      const normal=new THREE.Vector3(Math.cos(angle),-slope,Math.sin(angle)).normalize();
      child.position.copy(surface).addScaledVector(normal,-.023);
      child.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);child.scale.set(.058,.085,.025);
    }
  }
  const geometry=new THREE.SphereGeometry(1,112,80),position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
    const ny=position.getY(i),y=ny*.83-.035,angle=Math.atan2(position.getZ(i),position.getX(i));
    const r=Math.sqrt(Math.max(0,1-ny*ny))*(.78+.18*ny),point=new THREE.Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r);
    let dent=0;
    for(const seed of seeds){const dx=point.x-seed.x,dy=(point.y-seed.y)*.76,dz=point.z-seed.z,d2=dx*dx+dy*dy+dz*dz;if(d2<.025)dent+=.029*Math.exp(-d2/.0027);}
    if(r>.01){point.x*=1-dent/r;point.z*=1-dent/r;}position.setXYZ(i,point.x,point.y,point.z);
  }
  geometry.computeVertexNormals();const skin=new THREE.Mesh(geometry,material);skin.name='Reference berry skin';item.add(skin);
}
function smoothSmile(item) {
  const old=item.children.filter(o=>baseName(o)==='Smile');
  if(old.length<3)return;
  const points=old.map(o=>o.position.clone()).sort((a,b)=>a.x-b.x);
  for(const o of old)item.remove(o);
  const curve=new THREE.CatmullRomCurve3(points),geometry=new THREE.TubeGeometry(curve,48,.026,8,false);
  const smile=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x190e1d,roughness:.32}));smile.name='Smooth reference smile';item.add(smile);
}
export function refineReferenceItems(items) {
  for(const item of items){
    if(!referenceNames.has(item.name)||item.userData.referenceStyled)continue;
    item.userData.referenceStyled=true;
    const pink=item.name==='Pink Axolotl'?finish('pink'):null;
    const galaxy=item.name==='Galaxy Steamer Bao'?finish('galaxy'):null;
    const red=item.name==='Squishy Strawberry'?finish('red'):null;
    if(red)reshapeStrawberry(item,red);
    item.traverse(mesh=>{
      if(!mesh.isMesh)return;const name=baseName(mesh);
      if(galaxy){
        if(['Body','Knot','Pleat'].includes(name)){surfaceUV(mesh);mesh.material=galaxy;}
        if(['Cloud','Star'].includes(name))mesh.visible=false;
        if(name==='Basket')colorMaterial(mesh,'#c77b2b',.68);
        if(name==='BasketRim')colorMaterial(mesh,'#da8b32',.64);
        if(name==='BasketBand')colorMaterial(mesh,'#b46a24',.7);
      }
      if(pink){
        if(['Head','Body','Arm','Foot','Tail'].includes(name)){surfaceUV(mesh);mesh.material=pink;}
        if(['Gill','TailFin'].includes(name))colorMaterial(mesh,'#d84da9',.58);
        if(name==='Blush')colorMaterial(mesh,'#ec55a4',.62);
      }
      if(red){
        if(['Slice','Top','Tip'].includes(name)){surfaceUV(mesh);mesh.material=red;}
        if(name==='Seed')colorMaterial(mesh,'#a91b1d',.8);
        if(name==='SeedShine')mesh.visible=false;
        if(['Leaf','LeafMid'].includes(name))colorMaterial(mesh,'#5bb634',.73);
        if(name==='Stem')colorMaterial(mesh,'#4a9c30',.7);
      }
      if(item.name==='Strawberry Butter'){
        if(name.startsWith('Stick'))colorMaterial(mesh,'#f6afcd',.74);
        if(name==='Seam')colorMaterial(mesh,'#e798b9',.82);
        if(['Berry','Seed','Leaf','Stem'].includes(name)&&Math.abs(mesh.position.z)>.33){const side=Math.sign(mesh.position.z);mesh.position.z=side*.4+(mesh.position.z-side*.4)*.2;mesh.scale.z*=.2;}
        if(name==='Berry')colorMaterial(mesh,'#de3335',.65);
        if(name==='Leaf')colorMaterial(mesh,'#5ca438',.75);
      }
      if((galaxy||pink)&&['Eye','Smile'].includes(name))colorMaterial(mesh,'#190e1d',.24);
      if((galaxy||pink)&&name==='EyeShine')colorMaterial(mesh,'#fff8ff',.4);
    });
    if(item.name==='Strawberry Butter')butterLabel(item);
    if(galaxy||pink)smoothSmile(item);
  }
}
