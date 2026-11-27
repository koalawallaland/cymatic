// Canvas rasterizer for the same genuine 3D geometry when WebGL is disabled.
// Orthographic projection, per-pixel depth testing, and vertex lighting.
import * as THREE from '../squish/vendor/three.module.js';
const mat=new THREE.Matrix4(),normalMat=new THREE.Matrix3();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const luminance=(r,g,b)=>.2126*r+.7152*g+.0722*b;
const gamma=x=>Math.round(clamp(Math.sqrt(Math.max(0,x))*255,0,255));
export function createSoftwareRenderer(){
 const domElement=document.createElement('canvas'),ctx=domElement.getContext('2d',{alpha:true});
 if(!ctx)throw Error('Software 3D needs Canvas 2D');
 const layer=document.createElement('canvas'),lctx=layer.getContext('2d',{alpha:true});
 let w=1,h=1,rgba=new Uint8ClampedArray(4),depth=new Float32Array(1),pixels=null;
 const key=new THREE.Vector3(.44,.78,.45).normalize(),fill=new THREE.Vector3(-.75,.42,.34).normalize();
 function setSize(width,height){const scale=Math.min(1,420/Math.max(width,height));w=Math.max(1,Math.round(width*scale));h=Math.max(1,Math.round(height*scale));if(pixels&&domElement.width===w&&domElement.height===h)return;domElement.width=layer.width=w;domElement.height=layer.height=h;
   pixels=lctx.createImageData(w,h);rgba=pixels.data;depth=new Float32Array(w*h);}
 function render(scene,camera){
   if(!pixels)return;
   scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
   rgba.fill(0);depth.fill(Infinity);
   const view=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
   let shadow=null;
   scene.traverseVisible(mesh=>{
     if(!mesh.isMesh)return;
     if(mesh.material.map){shadow=mesh;return;}
     const g=mesh.geometry,m=mesh.material;
     const positions=g.attributes.position?.array,normals=g.attributes.normal?.array,colors=g.attributes.color?.array;
     if(!positions||!normals)return;
     mat.multiplyMatrices(view,mesh.matrixWorld);normalMat.getNormalMatrix(mesh.matrixWorld);
     const a=mat.elements,n=normalMat.elements,N=positions.length/3;
     const sx=new Float32Array(N),sy=new Float32Array(N),sz=new Float32Array(N),red=new Float32Array(N),green=new Float32Array(N),blue=new Float32Array(N);
     const mr=m.color?.r??1,mg=m.color?.g??1,mb=m.color?.b??1;
     for(let i=0,j=0;i<N;i++,j+=3){
       const x=positions[j],y=positions[j+1],z=positions[j+2];
       sx[i]=(.5+.5*(a[0]*x+a[4]*y+a[8]*z+a[12]))*w;
       sy[i]=(.5-.5*(a[1]*x+a[5]*y+a[9]*z+a[13]))*h;
       sz[i]=a[2]*x+a[6]*y+a[10]*z+a[14];
       let nx=n[0]*normals[j]+n[3]*normals[j+1]+n[6]*normals[j+2],ny=n[1]*normals[j]+n[4]*normals[j+1]+n[7]*normals[j+2],nz=n[2]*normals[j]+n[5]*normals[j+1]+n[8]*normals[j+2];
       const inv=1/(Math.hypot(nx,ny,nz)||1);nx*=inv;ny*=inv;nz*=inv;
       const lambert=.57+.36*Math.max(0,nx*key.x+ny*key.y+nz*key.z)+.19*Math.max(0,nx*fill.x+ny*fill.y+nz*fill.z)+.13*Math.max(0,ny);
       red[i]=gamma((colors?colors[j]:mr)*lambert);green[i]=gamma((colors?colors[j+1]:mg)*lambert);blue[i]=gamma((colors?colors[j+2]:mb)*lambert);
     }
     const inds=g.index?.array, len=inds?inds.length:N;
     const doubleSide=m.side===THREE.DoubleSide;
     for(let f=0;f<len;f+=3){
       const ia=inds?inds[f]:f,ib=inds?inds[f+1]:f+1,ic=inds?inds[f+2]:f+2;
       const ax=sx[ia],ay=sy[ia],bx=sx[ib],by=sy[ib],cx=sx[ic],cy=sy[ic];
       const ex=bx-ax,ey=by-ay,fx=cx-ax,fy=cy-ay,area=ex*fy-ey*fx;
       if(Math.abs(area)<.025||(!doubleSide&&area>0))continue;
       const minX=clamp(Math.ceil(Math.min(ax,bx,cx)-.5),0,w-1),maxX=clamp(Math.floor(Math.max(ax,bx,cx)-.5),0,w-1);
       const minY=clamp(Math.ceil(Math.min(ay,by,cy)-.5),0,h-1),maxY=clamp(Math.floor(Math.max(ay,by,cy)-.5),0,h-1);
       if(minX>maxX||minY>maxY)continue;
       const inv=1/area,za=sz[ia],dzb=sz[ib]-za,dzc=sz[ic]-za;
       const ra=red[ia],drb=red[ib]-ra,drc=red[ic]-ra,ga=green[ia],dgb=green[ib]-ga,dgc=green[ic]-ga,ba=blue[ia],dbb=blue[ib]-ba,dbc=blue[ic]-ba;
       for(let yy=minY;yy<=maxY;yy++){
         const py=yy+.5-ay;
         for(let xx=minX;xx<=maxX;xx++){
           const px=xx+.5-ax,u=(px*fy-py*fx)*inv,v=(ex*py-ey*px)*inv;
           if(u<-.001||v<-.001||u+v>1.001)continue;
           const p=yy*w+xx,z=za+u*dzb+v*dzc;
           if(z>=depth[p])continue;depth[p]=z;
           const q=p*4;rgba[q]=ra+u*drb+v*drc;rgba[q+1]=ga+u*dgb+v*dgc;rgba[q+2]=ba+u*dbb+v*dbc;rgba[q+3]=255;
         }
       }
     }
   });
   ctx.clearRect(0,0,w,h);
   if(shadow){
    const target=new THREE.Vector3().setFromMatrixPosition(shadow.matrixWorld).project(camera);
    const x=(target.x*.5+.5)*w,y=(.5-target.y*.5)*h;
    ctx.save();ctx.translate(x,y);ctx.scale(1,.26);const radius=w*.30,grad=ctx.createRadialGradient(0,0,0,0,0,radius);grad.addColorStop(0,'rgba(45,34,50,.25)');grad.addColorStop(1,'rgba(45,34,50,0)');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.restore();
   }
   lctx.putImageData(pixels,0,0);ctx.drawImage(layer,0,0);
 }
 return {domElement,setSize,render,setClearColor(){},setPixelRatio(){},dispose(){},isSoftware:true};
}
