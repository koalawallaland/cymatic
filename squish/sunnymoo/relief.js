import {fresh,title} from './maker.js?v=worktop3';
const inks=['#ff169d','#9229ec','#04bdaa','#ddff04','#1762de','#ff6724'];
const labels=['Hot pink','Grape','Lagoon','Citron','Cobalt','Tangerine'];
const fields=['kind','shape','pigment','finish','filling','accent','charm'];
const ns='http://www.w3.org/2000/svg';
function svgNode(tag,attrs){const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el}
function rope(points,hue){
 const g=svgNode('g',{});let xy=[];for(let i=0;i<points.length;i+=2)xy.push([points[i]*7.2,points[i+1]*4.8]);
 let d='M'+xy[0].join(' ');for(let i=1;i<xy.length;i++){const p=xy[i],q=xy[i+1];d+=q?' Q'+p.join(' ')+' '+[(p[0]+q[0])/2,(p[1]+q[1])/2].join(' '):' L'+p.join(' ')}
 const layers=[['#25162b',20,2,5,.62],[hue,20,0,0,1],['#21143b',11,1.5,3,.16], [hue,12,-1,-2,1],['#ffffff',3,-3,-5,.57],['#ffffff',1,-3,-6,.8]];
 for(const [color,width,x,y,opacity] of layers)g.append(svgNode('path',{d,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',opacity,transform:'translate('+x+' '+y+')'}));
 return g
}
export function reliefWall(host,{shelf,api,headers,valid,play,tiles,key}){
 const shell=document.createElement('section');host.replaceChildren(shell);host=shell;
 const endpoint=api.replace(/sunnymoo_displays$/,'sunnymoo_ribbons');
 host.innerHTML='<h2>Slime wall</h2><div class="relief"><svg viewBox="0 0 720 480" preserveAspectRatio="none" aria-label="Slime wall. Press and drag to lay a ribbon. Use the loop button for a keyboard alternative."><g class="old"></g><g class="ribbons"></g><g class="wet"></g></svg><i class="neon" aria-hidden="true">Sunnymoo</i></div><p class="wall-help">Press and drag to lay a rope of slime. Lift your finger to see where it settles.</p><div class="wall-kit"><label>Slime jar <select></select></label><fieldset><legend>Wall dye</legend><div class="dyes"></div></fieldset></div><div class="buttons"><button class="loop">Lay a loop</button><button class="undo">Lift last rope</button><button class="primary post">Share last rope</button><button class="refresh">Refresh wall</button></div><p class="note" role="status"></p><h3>Visitor designs</h3><div class="grid"></div>';
 const pick=s=>host.querySelector(s),surface=pick('.relief svg'),select=pick('select'),note=pick('.note');
 const slimes=shelf.filter(r=>r.kind===2),sample={...fresh(2),pigment:3,accent:3};let dye=3,drafts=[],drawing=null,pointer=null,saving=false,shared=[],legacy=[],version=0;
 select.add(new Option('Studio sample · clear gloss','-1'));slimes.forEach((r,i)=>select.add(new Option(title(r),String(i))));if(slimes.length)select.value='0';
 function recipe(){return {...(slimes[Number(select.value)]||sample),accent:dye}}
 function draw(){const wet=pick('.wet');wet.replaceChildren();for(const row of drafts.concat(drawing?[drawing]:[]))wet.append(rope(row.xy,inks[row.r.accent]));pick('.post').disabled=pick('.undo').disabled=!drafts.length||saving}
 labels.forEach((label,i)=>{const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.setAttribute('aria-pressed',i===dye);b.style.setProperty('--dye',inks[i]);b.onclick=()=>{dye=i;[...b.parentElement.children].forEach((e,j)=>e.setAttribute('aria-pressed',i===j))};pick('.dyes').append(b)});
 function pos(e){const b=surface.getBoundingClientRect();return [Math.round(Math.min(100,Math.max(0,(e.clientX-b.left)/b.width*100))),Math.round(Math.min(100,Math.max(0,(e.clientY-b.top)/b.height*100)))]}
 surface.onpointerdown=e=>{if(pointer!==null||saving)return;pointer=e.pointerId;surface.setPointerCapture(pointer);drawing={r:recipe(),xy:pos(e)};draw()};
 surface.onpointermove=e=>{if(e.pointerId!==pointer||!drawing)return;const p=pos(e),a=drawing.xy;if(Math.hypot(p[0]-a.at(-2),p[1]-a.at(-1))<1.2)return;if(a.length>=64){drawing.xy=a.filter((_,i)=>Math.floor(i/2)%2===0||i>=a.length-2)}drawing.xy.push(...p);draw()};
 surface.onpointerup=e=>{if(e.pointerId!==pointer||!drawing)return;let a=drawing.xy;if(a.length===2)a.push(a[0],Math.min(100,a[1]+3));drafts.push(drawing);drawing=null;pointer=null;draw();note.textContent='Your rope is resting here. Share it to leave it for other visitors.'};
 surface.onpointercancel=()=>{drawing=null;pointer=null;draw()};
 pick('.loop').onclick=()=>{let x=28+(drafts.length*19)%47,y=31+(drafts.length*13)%40;drafts.push({r:recipe(),xy:[x,y,x-6,y+2,x-8,y+10,x-3,y+16,x+6,y+14,x+8,y+5,x+2,y,x,y]});draw();note.textContent='A loop is ready to share.'};
 pick('.undo').onclick=()=>{drafts.pop();draw();note.textContent='Lifted the last loose rope.'};
 function exhibit(){const group=pick('.ribbons'),old=pick('.old');group.replaceChildren();old.replaceChildren();const used=new Set();
 for(const r of legacy){if(r.kind!==2||used.has(r.spot))continue;used.add(r.spot);const x=8+(r.spot%6)*16,y=16+Math.floor(r.spot/6)*21;old.append(rope([x,y,x+2,y+2,x-1,y+7,x,y+10],inks[r.pigment]))}
 for(const row of [...shared].reverse()){const g=rope(row.xy,inks[row.r.accent]);group.append(g)}
 const grid=pick('.grid');grid.replaceChildren();const all=[...shared.map(s=>s.r),...legacy];tiles(grid,all.filter((r,i)=>all.findIndex(o=>key(o)===key(r))===i))}
 async function load(){const seq=++version;try{const get=async(url)=>{const res=await fetch(url+'?select=*&order=id.desc&limit=160',{headers});if(!res.ok)throw Error();return res.json()};const [old,rows]=await Promise.all([get(api),get(endpoint)]);if(seq!==version||!surface.isConnected)return;legacy=old.filter(valid);shared=rows.map(row=>({r:Object.fromEntries(fields.map((k,i)=>[k,row.recipe[i]])),xy:row.xy})).filter(row=>valid(row.r)&&Array.isArray(row.xy));exhibit()}catch{if(surface.isConnected)note.textContent='The shared wall is offline. You can still shape a rope here.'}}
 pick('.post').onclick=async()=>{const row=drafts.at(-1);if(!row||saving)return;saving=true;draw();try{const res=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({recipe:fields.map(k=>row.r[k]),xy:row.xy})});if(!res.ok&&res.status!==409)throw Error();drafts=drafts.filter(r=>r!==row);shared.unshift(row);exhibit();note.textContent='Your rope is on the shared wall.';await load()}catch{note.textContent='Could not share this rope. It is still here to try again.'}finally{saving=false;draw()}};
 pick('.refresh').onclick=load;draw();load()
}
