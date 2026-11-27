// A small painter for the same scene on devices where WebGL is unavailable.
import * as T from 'three';
export function canvasRenderer(canvas){
 const ctx=canvas.getContext('2d'),matrix=new T.Matrix4(),v=new T.Vector3(),light=new T.Vector3(-.38,.8,.43).normalize();
 const normalMatrix=new T.Matrix3(),normal=new T.Vector3(),color=new T.Color(),palette=new WeakMap();
 let w=0,h=0,ratio=1;const textures=new WeakMap();
 function sample(tex,uv,a,b,c){if(!tex?.image||!uv)return null;let pixels=textures.get(tex);if(!pixels){try{const thumb=document.createElement('canvas');thumb.width=thumb.height=64;const temp=thumb.getContext('2d');temp.drawImage(tex.image,0,0,64,64);pixels=temp.getImageData(0,0,64,64).data;textures.set(tex,pixels)}catch{return null}}
 const u=(uv.getX(a)+uv.getX(b)+uv.getX(c))/3,v=(uv.getY(a)+uv.getY(b)+uv.getY(c))/3;
 const at=(Math.floor(((u%1+1)%1)*64)+64*Math.floor((((tex.flipY?1-v:v)%1+1)%1)*64))*4;
 return [pixels[at],pixels[at+1],pixels[at+2]];
 }
 function paint(material,level){let bank=palette.get(material);if(!bank){bank=[];palette.set(material,bank)}if(!bank[level]){color.copy(material.color);const shine=(level/32)**7*(material.metalness||0)*.7;color.multiplyScalar(.55+level/32*.66).addScalar(shine);bank[level]=color.getStyle()}return bank[level]}
 return {software:true,setPixelRatio(value){ratio=Math.min(1.25,value)},setSize(width,height){w=width;h=height;canvas.width=w*ratio;canvas.height=h*ratio},render(scene,camera){
 if(!w||!h)return;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 camera.updateMatrixWorld();scene.updateMatrixWorld();const faces=[];
 scene.traverseVisible(o=>{if(!o.isMesh)return;const geometry=o.geometry,p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index;const material=Array.isArray(o.material)?o.material[0]:o.material;
 if(!material?.color||!p)return;matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(o.matrixWorld);normalMatrix.getNormalMatrix(o.matrixWorld);
 const points=new Float32Array(p.count*4);
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(matrix);const j=i*4;points[j]=(v.x*.5+.5)*w;points[j+1]=(.5-v.y*.5)*h;points[j+2]=v.z;if(n){normal.fromBufferAttribute(n,i).applyNormalMatrix(normalMatrix);points[j+3]=Math.max(0,normal.dot(light))}}
 const total=index?index.count:p.count;
 for(let i=0;i<total;i+=3){const a=(index?index.getX(i):i)*4,b=(index?index.getX(i+1):i+1)*4,c=(index?index.getX(i+2):i+2)*4;
 if(points[a+2]>1||points[b+2]>1||points[c+2]>1)continue;
 const ax=points[a],ay=points[a+1],bx=points[b],by=points[b+1],cx=points[c],cy=points[c+1];
 if((bx-ax)*(cy-ay)-(by-ay)*(cx-ax)>=0)continue;
 if(Math.max(ax,bx,cx)<0||Math.min(ax,bx,cx)>w||Math.max(ay,by,cy)<0||Math.min(ay,by,cy)>h)continue;
 const tone=Math.round((points[a+3]+points[b+3]+points[c+3])*32/3);let fill=paint(material,tone);const rgb=sample(material.map,geometry.attributes.uv,a/4,b/4,c/4);if(rgb){const light=.74+tone/32*.3;fill='rgb('+rgb.map(v=>Math.min(255,Math.round(v*light))).join(',')+')'}faces.push([(points[a+2]+points[b+2]+points[c+2])/3,ax,ay,bx,by,cx,cy,fill,material.opacity,o.renderOrder])}
 });
 faces.sort((a,b)=>a[9]-b[9]||b[0]-a[0]);ctx.lineWidth=.46;ctx.lineJoin='round';
 for(const [,x,y,x2,y2,x3,y3,fill,alpha] of faces){ctx.globalAlpha=alpha;ctx.fillStyle=ctx.strokeStyle=fill;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.lineTo(x3,y3);ctx.closePath();ctx.fill();if(alpha>.9)ctx.stroke()}ctx.globalAlpha=1;
 }};
}
