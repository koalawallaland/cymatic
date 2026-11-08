// Adapted environment for Toby D's MIT-licensed Backrooms movement/rendering engine.
import * as THREE from 'three';
import {createTextures} from './textures.js';
export const CELL=4,EYE=1.6;
export class World{
constructor(scene,seed,anisotropy){
this.scene=scene;this.colliders=[];this.nightmares=[];const tex=createTextures(anisotropy);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
this.walnut=mat('#503b32');this.wall=mat('#a89ca9',{map:tex.wall});this.tile=mat('#a8b8b3',{roughness:.25});this.metal=mat('#9a939f',{metalness:.65,roughness:.3});this.carpet=mat('#a99aa6',{map:tex.floor});this.cream=mat('#dfd4c1');this.dark=mat('#292832');this.pink=mat('#bb91ab');this.chartreuse=mat('#a8b87b');
this.box=(x,y,z,w,h,d,m,solid=false)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);scene.add(mesh);if(solid)this.colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});return mesh};
const B=this.box;
const room=(x,z,w,d,floor,ceiling=4.5)=>{B(x,-.12,z,w,.24,d,floor);B(x,ceiling,z,w,.18,d,mat('#655f69'));for(let a=x-w/2+4;a<x+w/2;a+=8)for(let b=z-d/2+4;b<z+d/2;b+=8){B(a,ceiling-.14,b,2.2,.08,.65,mat('#f1e8d6',{emissive:'#e3c5b3',emissiveIntensity:1.2}));const l=new THREE.PointLight('#f4d9c4',22,15,1.8);l.position.set(a,ceiling-.4,b);if(a===x-w/2+4&&b===z-d/2+4){l.position.set(x,ceiling-.5,z);l.intensity=100;l.distance=45;scene.add(l)}}};
room(0,0,32,48,this.cream,6);room(29,2,26,28,this.tile);room(-29,2,26,28,this.carpet);room(0,-41,48,34,this.dark,7);
const wall=(x,z,w,d,m=this.wall,h=4.5)=>{B(x,h/2,z,w,h,d,m,true);B(x,.16,z,w+.02,.32,d+.02,this.walnut)};
wall(-16,-14,.4,20);wall(-16,17,.4,14);wall(16,-14,.4,20);wall(16,17,.4,14);
wall(0,24,32,.4);wall(-10,-24,12,.4);wall(10,-24,12,.4);
wall(42,2,.4,28);wall(29,-12,26,.4);wall(29,16,26,.4);
wall(-42,2,.4,28);wall(-29,-12,26,.4);wall(-29,16,26,.4);
wall(-24,-41,.4,34);wall(24,-41,.4,34);wall(-14,-24,20,.4);wall(14,-24,20,.4);wall(0,-58,48,.4,this.dark,7);
// Shopfront rhythm, recessed glass windows, walnut surrounds and illuminated signs.
const glass=mat('#697a7e',{metalness:.3,roughness:.18,transparent:true,opacity:.55});
for(let z=-17;z<=17;z+=9){for(const side of [-1,1]){if(Math.abs(z)<5)continue;const x=side*15.6;B(x,2,z,.12,3.5,6.8,glass);B(x,3.9,z,.3,.3,7,this.walnut);this.sign(side<0?'AFTER HOURS':'CRYNET / ARCHIVE',x-side*.25,3.3,z,side<0?Math.PI/2:-Math.PI/2,4.3)}}
for(const x of [-9,9])for(const z of [-15,8]){B(x,.32,z,3,.6,1.2,this.walnut,true);B(x,.68,z,3,.18,1.2,this.pink);this.plant(x,z+2.4)}
B(0,.06,0,7,.02,32,this.carpet);
this.sign('MALL WORLD',0,4.8,-23.7,0,8);
this.sign('TOILET WORLD →',11,3.2,-4.1,0,6);
this.sign('← HOTEL',-10,3.2,-4.1,0,5);
this.sign('TOKYO / OBSERVATION LOUNGE',0,3.4,-24.3,0,7);
// Toilet maze: actual cubicles, doors at wrong heights and physical ceramic fixtures.
for(let row=0;row<3;row++)for(let i=0;i<4;i++){
const x=21+i*4.6,z=-7+row*8;
B(x-1.9,.95,z,.12,1.9,4.6,this.tile,true);B(x,1.1,z-2.25,3.8,2.2,.12,this.tile,true);
B(x+.7,1.0,z+2.2,2.2,1.3,.1,(i+row)%2?this.pink:this.walnut,true);
this.toilet(x,z-1);
}
this.sign('PRIVACY / NEXT STALL',29,3.4,-11.7,0,7);
// Hotel reception and guest-door corridors.
B(-30,.6,-6,12,1.2,2,this.walnut,true);B(-30,1.25,-6,12,.12,2.2,this.cream);
this.sign('PARK HYATT / DREAM LOBBY',-29,3.3,-11.7,0,9);
for(let i=0;i<4;i++){const z=-5+i*5;B(-41.7,1.4,z,.13,2.8,2.4,this.walnut);this.sign('0'+(i+1),-41.5,2.2,z,Math.PI/2,1.1)}
for(const x of [-35,-24]){B(x,.35,9,4,.7,2,this.pink,true);B(x,.9,9.8,4,1, .3,this.pink);this.plant(x,13)}
// Tokyo lounge: gallery plinths, glazing and distinct skyline silhouettes.
for(let i=0;i<3;i++){B(-15+i*15,.4,-37,2,.8,2,this.cream,true);const art=new THREE.Mesh(new THREE.TorusKnotGeometry(.65,.13,72,10),this.metal);art.position.set(-15+i*15,1.8,-37);scene.add(art)}
B(0,3,-56.8,46,6,.1,glass);
this.sign('MORI / NIGHT GALLERY',0,5.2,-27,Math.PI,8);
const skyline=mat('#272938');for(let i=0;i<22;i++){const h=6+(i*7%17);B(-65+i*6,h/2,-86-(i%3)*9,4,h,4,skyline)}
const towerMat=mat('#ba7d88');for(const side of [-1,1]){const beam=B(-12+side*2.5,13,-74,.55,26,.55,towerMat);beam.rotation.z=side*.16}
for(let y=4;y<25;y+=4)B(-12,y,-74,6-y*.15,.4,2,towerMat);
B(-12,28,-74,.3,7,.3,this.pink);
B(13,18,-79,1,36,1,this.metal);B(13,30,-79,5,1.2,5,this.cream);B(13,34,-79,3,.6,3,this.pink);B(13,40,-79,.22,10,.22,this.metal);
this.sign('TOKYO TOWER',-12,4,-59,0,5);this.sign('TOKYO SKYTREE',13,4,-59,0,5);
// Optional abstract body-wall nightmare geometry, hidden until chosen.
for(let i=0;i<18;i++){const head=new THREE.Mesh(new THREE.SphereGeometry(.35,12,10),this.pink);head.scale.set(1,1.5,.5);head.position.set(41.7,.8+(i%3)*.95,-9+Math.floor(i/3)*4.5);head.visible=false;scene.add(head);this.nightmares.push(head)}
}
sign(text,x,y,z,rotation,width){const c=document.createElement('canvas');c.width=1024;c.height=128;const g=c.getContext('2d');g.fillStyle='#2a2530';g.fillRect(0,0,1024,128);g.fillStyle='#d3dda7';g.font='42px sans-serif';g.textAlign='center';g.fillText(text,512,80);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/8),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;this.scene.add(m)}
plant(x,z){this.box(x,.4,z,.85,.8,.85,this.walnut,true);const leaf=new THREE.Mesh(new THREE.SphereGeometry(.75,10,8),this.chartreuse);leaf.scale.set(.7,1.5,.7);leaf.position.set(x,1.6,z);this.scene.add(leaf)}
toilet(x,z){this.box(x,.28,z,.7,.56,.85,this.cream,true);const bowl=new THREE.Mesh(new THREE.TorusGeometry(.39,.11,10,24),this.cream);bowl.rotation.x=Math.PI/2;bowl.scale.y=1.25;bowl.position.set(x,.6,z);this.scene.add(bowl);this.box(x,.85,z-.55,.78,.9,.3,this.cream,true)}
isCellBlocked(){return false}
update(){}
updateFlicker(t){this.nightmares.forEach((m,i)=>{m.scale.z=.5+Math.sin(t*.7+i)*.08})}
setNightmare(on){this.nightmares.forEach(m=>m.visible=on)}
}