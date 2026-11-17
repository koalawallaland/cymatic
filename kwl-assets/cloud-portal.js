(()=>{
"use strict";
const trigger=document.querySelector(".kw .cloud-float");
if(!trigger)return;
const W=1100,H=660;
const dialog=document.createElement("dialog");dialog.id="cloud-studio-dialog";dialog.setAttribute("aria-labelledby","cloud-studio-title");
dialog.innerHTML=[
'<div class="cloud-panel"><div class="cloud-head"><div class="cloud-brand"><span class="cloud-meta">Cymatic Studio · little sky atelier</span><h2 id="cloud-studio-title">cloud visualizer ✧</h2></div>',
'<button class="cloud-close" type="button" data-cd-close>✕ Close</button></div>',
'<div class="cloud-workspace"><div class="cloud-canvas-frame" aria-label="A pastel cloud sky with koala-shaped clouds, a rhinestone wing, and a sketching surface.">',
'<canvas id="cloud-sky-canvas" width="1100" height="660" aria-hidden="true"></canvas><canvas id="cloud-ink-canvas" width="1100" height="660" aria-label="Touch drawing canvas"></canvas></div>',
'<div class="cloud-controls" aria-label="Cloud sketch tools">',
'<button type="button" data-cd-sky>☁ Change sky</button>',
'<button type="button" data-cd-tool="draw" aria-pressed="true">✎ Draw</button>',
'<button type="button" data-cd-tool="erase" aria-pressed="false">⌁ Erase</button><span class="cloud-divider" aria-hidden="true"></span>',
'<button type="button" data-cd-color="#ff85db" style="background:#ff85db" aria-label="Pink highlighter" aria-pressed="true"></button>',
'<button type="button" data-cd-color="#c49fff" style="background:#c49fff" aria-label="Lilac highlighter" aria-pressed="false"></button>',
'<button type="button" data-cd-color="#fffaff" style="background:#fffaff" aria-label="Pearl white highlighter" aria-pressed="false"></button>',
'<button type="button" data-cd-upload>＋ Sky photo</button><button type="button" data-cd-clear>Clear ink</button>',
'<button type="button" class="cloud-save" data-cd-save>↓ Save PNG</button>',
'<input type="file" hidden accept="image/png,image/jpeg,image/webp,image/avif" data-cd-input></div>',
'<p class="cloud-hint" data-cd-status aria-live="polite">Self-hosted sketch prototype · no ChatGPT login · your photos and drawings stay in this tab.</p></div></div>'
].join("");
document.body.append(dialog);
const sky=dialog.querySelector("#cloud-sky-canvas"),ink=dialog.querySelector("#cloud-ink-canvas");
const b=sky.getContext("2d"),c=ink.getContext("2d"),status=dialog.querySelector("[data-cd-status]"),input=dialog.querySelector("[data-cd-input]");
let theme=0,paint="#ff85db",tool="draw",drag=false,last=null,photo=null,photoUrl=null,scrollBefore="",initialized=false;
const themes=[
["#8dbcf5","#b5c7f5","#f5c2e5","#fff0e4"],
["#c2b9f5","#e5ccff","#f8d7ed","#fff3fa"],
["#9994d4","#c6b3eb","#edb4db","#ffdeeb"],
["#94b6f0","#e0addf","#ffcebe","#ffe5c3"]
];
function tell(s){status.textContent=s}
function rnd(seed){let x=seed>>>0;return()=>((x=(1664525*x+1013904223)>>>0)/4294967296)}
function puff(x,y,rx,ry,a){
 b.save();b.globalAlpha=a;const r=b.createRadialGradient(x-rx*.16,y-ry*.18,1,x,y,Math.max(rx,ry));
 r.addColorStop(0,"#fff");r.addColorStop(.32,"#fffaff");r.addColorStop(.64,"#e8e2ffb9");r.addColorStop(1,"#ffffff00");
 b.fillStyle=r;b.beginPath();b.ellipse(x,y,rx,ry,0,0,Math.PI*2);b.fill();b.restore()
}
function fluffy(x,y,rx,ry,n,seed,a){
 const r=rnd(seed);for(let i=0;i<n;i++){
 const angle=r()*6.283,dist=Math.sqrt(r())*.9;
 puff(x+Math.cos(angle)*rx*dist,y+Math.sin(angle)*ry*dist,rx*(.18+r()*.17),ry*(.2+r()*.23),a*(.17+r()*.34))
 }}
function neon(path,stroke,width,blur){
 b.save();b.lineCap="round";b.lineJoin="round";b.shadowColor=stroke;b.strokeStyle=stroke;b.shadowBlur=blur;b.lineWidth=width+8;b.globalAlpha=.25;b.stroke(path);
 b.globalAlpha=.95;b.lineWidth=width;b.shadowBlur=blur*.7;b.stroke(path);
 b.globalAlpha=.78;b.strokeStyle="#fff8ff";b.lineWidth=1.2;b.shadowBlur=2;b.stroke(path);b.restore()
}
function glint(x,y,s){
 b.save();b.strokeStyle="#fff";b.lineWidth=1.2;b.globalAlpha=.9;b.shadowColor="#fff";b.shadowBlur=10;
 b.beginPath();b.moveTo(x-s,y);b.lineTo(x+s,y);b.moveTo(x,y-s);b.lineTo(x,y+s);b.stroke();b.restore()
}
function drawKoala(){
 fluffy(350,285,190,130,110,721,.75);fluffy(213,202,78,98,50,119,.81);fluffy(482,199,79,98,50,820,.83);
 fluffy(350,430,175,121,99,113,.69);fluffy(254,522,94,65,40,4,.6);fluffy(463,511,92,61,42,43,.6);
 const o=new Path2D();o.moveTo(242,324);o.bezierCurveTo(160,294,171,199,207,178);o.bezierCurveTo(239,150,281,169,300,194);o.bezierCurveTo(333,176,395,179,426,196);o.bezierCurveTo(467,154,516,163,536,209);o.bezierCurveTo(561,273,534,307,491,328);o.bezierCurveTo(508,382,474,461,423,482);o.bezierCurveTo(360,512,290,497,260,470);o.bezierCurveTo(213,431,218,363,242,324);neon(o,"#f5a1f7",3.1,16);
 const e=new Path2D();e.moveTo(218,244);e.quadraticCurveTo(194,197,235,188);e.quadraticCurveTo(256,184,272,207);e.moveTo(470,209);e.quadraticCurveTo(501,184,519,215);e.quadraticCurveTo(532,233,508,256);neon(e,"#d0aaff",2,10);
 const n=new Path2D();n.moveTo(341,314);n.bezierCurveTo(340,282,368,276,386,304);n.bezierCurveTo(393,332,377,357,361,359);n.bezierCurveTo(345,350,338,335,341,314);neon(n,"#f7a2eb",2.6,9);
 const smile=new Path2D();smile.moveTo(319,389);smile.quadraticCurveTo(357,408,398,380);neon(smile,"#d2aaff",2,9);
 glint(288,324,4);glint(415,320,4)
}
function gem(x,y,s,i){
 b.save();b.translate(x,y);b.rotate(Math.PI/4);b.shadowBlur=8;b.shadowColor="#fff";
 b.fillStyle=i%3===0?"#ffe2ff":i%3===1?"#e7deff":"#fff";b.fillRect(-s/2,-s/2,s,s);b.strokeStyle="#fff";b.lineWidth=.8;b.strokeRect(-s/2,-s/2,s,s);b.restore()
}
function wing(){
 const pts=[[683,391],[718,335],[756,278],[798,243],[860,214],[919,200],[882,239],[931,253],[866,292],[911,318],[843,346],[864,380],[802,374],[772,414],[732,410],[683,391]];
 const p=new Path2D();p.moveTo(...pts[0]);for(let i=1;i<pts.length-1;i++){const v=pts[i],next=pts[i+1];p.quadraticCurveTo(v[0],v[1],(v[0]+next[0])/2,(v[1]+next[1])/2)}p.lineTo(...pts[0]);p.closePath();
 neon(p,"#ebc0ff",2.6,15);
 for(let i=0;i<pts.length-1;i++){const a=pts[i],d=pts[i+1],dist=Math.hypot(d[0]-a[0],d[1]-a[1]),n=Math.max(2,Math.floor(dist/9));
 for(let j=0;j<n;j++){let t=j/n;gem(a[0]+t*(d[0]-a[0]),a[1]+t*(d[1]-a[1]),4.8,i+j)}}
 const vein=new Path2D();vein.moveTo(710,384);vein.quadraticCurveTo(792,275,884,236);neon(vein,"#fff9ff",1.3,5);
 glint(920,200,7);glint(866,292,6);glint(732,410,5)
}
function render(){
 b.clearRect(0,0,W,H);
 if(photo){const f=Math.max(W/photo.naturalWidth,H/photo.naturalHeight),w=photo.naturalWidth*f,h=photo.naturalHeight*f;b.drawImage(photo,(W-w)/2,(H-h)/2,w,h);b.fillStyle="#fbd3ff1f";b.fillRect(0,0,W,H)}
 else{const grad=b.createLinearGradient(0,0,W*.3,H);themes[theme].forEach((a,i)=>grad.addColorStop(i/3,a));b.fillStyle=grad;b.fillRect(0,0,W,H);
 const light=b.createRadialGradient(780,550,10,780,550,650);light.addColorStop(0,"#fff9ea88");light.addColorStop(1,"#fff6ff00");b.fillStyle=light;b.fillRect(0,0,W,H)}
 fluffy(120,95,185,62,90,166,.25);fluffy(1000,115,190,65,100,178,.3);fluffy(1090,548,221,83,115,429,.31);fluffy(100,550,220,65,115,254,.29);
 drawKoala();wing();const r=rnd(253);for(let i=0;i<31;i++)glint(r()*W,r()*H,1+r()*2)
}
function pointer(e){const rect=ink.getBoundingClientRect();return{x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height}}
function stroke(a,z){
 c.save();c.globalCompositeOperation=tool==="erase"?"destination-out":"source-over";c.lineCap="round";c.lineJoin="round";c.lineWidth=tool==="erase"?30:7;c.strokeStyle=paint;
 if(tool==="draw"){c.shadowColor=paint;c.shadowBlur=15}
 c.beginPath();c.moveTo(a.x,a.y);c.lineTo(z.x,z.y);c.stroke();c.restore()
}
ink.addEventListener("pointerdown",e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();drag=true;last=pointer(e);ink.setPointerCapture(e.pointerId);stroke(last,{x:last.x+.08,y:last.y+.08})});
ink.addEventListener("pointermove",e=>{if(!drag)return;e.preventDefault();const z=pointer(e);stroke(last,z);last=z});
["pointerup","pointercancel","lostpointercapture"].forEach(ev=>ink.addEventListener(ev,()=>{drag=false;last=null}));
dialog.querySelector("[data-cd-sky]").addEventListener("click",()=>{photo=null;theme=(theme+1)%themes.length;render();tell("A different sky ✧")});
dialog.querySelectorAll("[data-cd-tool]").forEach(t=>t.addEventListener("click",()=>{tool=t.dataset.cdTool;dialog.querySelectorAll("[data-cd-tool]").forEach(b=>b.setAttribute("aria-pressed",String(b===t)))}));
dialog.querySelectorAll("[data-cd-color]").forEach(t=>t.addEventListener("click",()=>{
 paint=t.dataset.cdColor;tool="draw";dialog.querySelectorAll("[data-cd-color]").forEach(b=>b.setAttribute("aria-pressed",String(b===t)));
 dialog.querySelectorAll("[data-cd-tool]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.cdTool==="draw")))
}));
dialog.querySelector("[data-cd-clear]").addEventListener("click",()=>{c.clearRect(0,0,W,H);tell("Ink cleared, clouds untouched ♡")});
dialog.querySelector("[data-cd-upload]").addEventListener("click",()=>input.click());
input.addEventListener("change",()=>{
 const f=input.files&&input.files[0];if(!f)return;
 if(!f.type.startsWith("image/")||f.size>12*1024*1024){tell("Choose an image under 12 MB.");return}
 const url=URL.createObjectURL(f),im=new Image();im.onload=()=>{if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=url;photo=im;render();tell("Your sky photo stays in this tab ♡")};
 im.onerror=()=>{URL.revokeObjectURL(url);tell("Couldn't read that photo; try PNG or JPEG.")};im.src=url;input.value=""
});
dialog.querySelector("[data-cd-save]").addEventListener("click",()=>{
 try{const out=document.createElement("canvas");out.width=W;out.height=H;const cc=out.getContext("2d");cc.drawImage(sky,0,0);cc.drawImage(ink,0,0);
 out.toBlob(blob=>{if(!blob){tell("Couldn't export this sky.");return}
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="cymatic-cloud-sketch.png";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);tell("PNG saved ✧")
 },"image/png")}catch(e){console.warn(e);tell("Couldn't export on this browser.")}
});
function close(){if(typeof dialog.close==="function")dialog.close();else{dialog.removeAttribute("open");finish()}}
function finish(){document.body.style.overflow=scrollBefore;trigger.focus({preventScroll:true})}
function open(){scrollBefore=document.body.style.overflow;if(!initialized){render();initialized=true}if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");document.body.style.overflow="hidden";dialog.querySelector("[data-cd-close]").focus()}
dialog.querySelector("[data-cd-close]").addEventListener("click",close);
dialog.addEventListener("close",finish);dialog.addEventListener("click",e=>{if(e.target===dialog)close()});
trigger.addEventListener("click",open);
window.addEventListener("pagehide",()=>{if(photoUrl)URL.revokeObjectURL(photoUrl)});
})();