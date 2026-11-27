export const colors=['#ff88b1','#a58aeb','#7cd5bc','#ffc960','#8ebfea','#ef9979'];
export const names=['Berry','Lilac','Mint','Sunshine','Sky','Peach'];
export const kinds=['Squishy','Wax crackle','Slime'];
const shapes=['Bao','Kitten','Puddle'];
const textures=['Glossy','Butter','Floam'];
const fills=['Flowing gel','Thick gel','Beaded gel'];
const skins=['Clear','Milky','Pearl'];
const scents=['Unscented','Peach','Vanilla'];
const charms=['Plain','Star','Flower'];
const outlines=[
'M71 157 Q76 119 112 98 Q125 90 136 72 Q142 79 149 80 Q155 64 158 63 Q164 77 174 83 Q222 94 249 145 Q271 200 225 211 Q158 231 92 211 Q58 203 71 157Z',
'M78 132 L82 73 Q84 66 92 72 L123 94 Q159 82 193 94 L225 70 Q232 66 233 77 L237 136 Q263 204 211 214 Q151 229 103 210 Q64 200 78 132Z',
'M49 171 Q63 151 89 152 Q92 111 128 122 Q149 83 181 109 Q219 104 220 143 Q265 138 270 174 Q273 199 247 204 Q224 225 187 210 Q158 232 127 213 Q78 227 72 204 Q36 201 49 171Z'];
const step=(title,hint,art,action,key,options)=>({title,hint,art,action,key,options});
const palette=names;
export const flows=[
[
step('Choose a master','A master is the original shape. The mould takes an impression of its outside.','master','Seat the master','shape',shapes),
step('Pour the mould','Fill the space around the master with virtual mould rubber. Once cured, the two halves open and the master lifts out.','mould','Pour and cure the mould'),
step('Make the skin','Choose a finish for the soft casting silicone. The inner core leaves a hollow pocket for filling.','core','Fit the inner core','finish',skins),
step('Tint and cast','Tint the skin, mix the two silicone parts and pour into the gap around the core.','cast','Pour the skin','pigment',palette),
step('Peel the skin free','Curing changes the liquid into stretchy rubber. Skip ahead, open the mould and slide the core out through the neck.','peel','Cure and demould'),
step('Fill the pocket','A flowing gel slides quickly. Thick gel moves slowly. Beads make little bumps you can see.','fill','Pump in the filling','filling',fills),
step('Seal the opening','Seat the matching plug, let the silicone bond cure, then gently squeeze to check the seal.','seal','Seal and test')
],[
step('Shape the soft centre','Choose the shape of a soft centre that can give way when you press it.','master','Shape the centre','shape',shapes),
step('Tint the centre','Pick the colour that will peek through the cracks.','coreColor','Tint the centre','accent',palette),
step('Prepare the wax bath','The studio warmer melts the wax. Pick a shell colour for the first dip.','bath','Melt the wax','pigment',palette),
step('Dip, drain and cool','Lift the centre so extra wax drips back. More cooled coats make a thicker shell.','dip','Dip and cool one coat','finish',['One coat','Two coats','Three coats']),
step('Cool the shell','As the wax cools it turns solid. The soft centre can still bend underneath.','cool','Finish cooling'),
step('Try the first crack','Press gently. The centre bends farther than the solid coat can, so a crack opens.','crack','Crack and shelve it')
],[
step('Choose a texture','Glossy slime stays smooth. Butter slime gets soft clay. Floam gets tiny foam beads.','bowl','Pour the glue base','finish',textures),
step('Tint the glue','Mix colour into the base before it thickens.','stir','Stir in colour','pigment',palette),
step('Link the chains','Activator helps the long chains in glue connect. Try a soft, stretchy or firm batch. More links usually make a firmer slime.','activate','Add activator and stir','filling',['Soft','Stretchy','Firm']),
step('Fold in the texture','Fold slowly so the base comes together. Your chosen texture goes in here.','fold','Fold the batch'),
step('Pick a scent','Choose an imaginary scent for the label on your jar.','scent','Finish the blend','shape',scents),
step('Fill your jar','Choose a charm and scoop your finished slime into its 8 oz play jar.','jar','Charm and jar it','charm',charms)
]];
export function fresh(kind){return {kind,shape:0,pigment:0,finish:0,filling:0,accent:3,charm:0}}
export function title(r){return names[r.pigment]+' '+(r.kind===2?textures[r.finish]:shapes[r.shape])+(r.kind===1?' crackle':r.kind===2?' slime':' squishy')}
export function describe(r){return r.kind===0?skins[r.finish]+' skin · '+fills[r.filling]:r.kind===1?(r.finish+1)+' wax coat'+(r.finish?'s':'')+' · '+names[r.accent]+' centre':scents[r.shape]+' · '+['Soft','Stretchy','Firm'][r.filling]+' · '+charms[r.charm]}
const bits=Array.from({length:24},(_,i)=>'<circle cx="'+(100+((i*41)%109))+'" cy="'+(143+((i*23)%52))+'" r="'+(3+i%3)+'" fill="'+['#fff7dd','#ffb3d7','#ac9be0'][i%3]+'"/>').join('');
let serial=0;
export function art(r,phase='play',progress=0){
 const id='sun'+(++serial),shape=outlines[r.kind===2?2:r.shape],wax=r.kind===1,slime=r.kind===2;
 const mould=['mould','core','cast','peel'].includes(phase),bowl=['bowl','stir','activate','fold','scent','bath','dip'].includes(phase);
 const pouring=['cast','mould','fill','activate','stir','dip'].includes(phase),center=wax&&(['master','coreColor'].includes(phase)||progress>=r.finish+3);
 const hue=center?colors[r.accent]:colors[r.pigment],liquid=['fill','seal','play'].includes(phase);
 const pumping=phase==='fill', pouringMould=phase==='mould';
 const level=pumping?207-Math.min(progress,3)*39:193-Math.min(progress,2)*47;
 const thick=phase==='cast'||phase==='core'||phase==='peel'||(r.kind===0&&liquid);
 const cracks=wax&&!center&&(phase==='crack'||progress>0);
 return '<svg viewBox="0 0 320 250" aria-hidden="true"><defs><radialGradient id="'+id+'" cx="32%" cy="20%" r="83%"><stop stop-color="#fff5f6"/><stop offset=".36" stop-color="'+hue+'"/><stop offset="1" stop-color="'+hue+'" stop-opacity=".76"/></radialGradient><clipPath id="c'+id+'"><path d="'+shape+'"/></clipPath></defs><ellipse cx="161" cy="217" rx="111" ry="11" fill="#49635d" opacity=".2"/>'+
 (mould?'<rect x="44" y="80" width="232" height="141" rx="24" fill="#ae9fcd" stroke="#635273" stroke-width="4"/><path d="M48 148h225" stroke="#736389" stroke-dasharray="7 4"/>':'')+
 '<g class="toy"><path d="'+shape+'" fill="url(#'+id+')" fill-opacity="'+(r.kind===0&&r.finish===0&&thick?.72:1)+'" stroke="#6b5066" stroke-width="'+(wax?3+r.finish:3)+'"/>'+
 (thick?'<path d="'+shape+'" transform="translate(21 24) scale(.87)" fill="'+(pumping?'#f9f5f1':liquid?hue:'#ecf4e8')+'" stroke="#876e86" stroke-dasharray="5 4"/>':'')+
 ((pumping||pouringMould)&&progress?'<g clip-path="url(#c'+id+')"><path d="M52 '+level+'q40 -9 82 0t85 0t65 -2v135H52z" fill="'+(pumping?hue:'#a78fc2')+'" opacity=".88"/></g>':'')+
 (((slime&&r.finish===2)||(r.kind===0&&r.filling===2&&liquid))?'<g clip-path="url(#c'+id+')">'+bits+'</g>':'')+
 (slime&&r.finish===1?'<path d="M88 174q45-43 90-15t54 7m-129 28q30-23 64-10t49-4" stroke="#fff7db" fill="none" stroke-width="7" opacity=".8"/>':'')+
 (r.kind===0&&r.finish===2?'<path d="m119 125 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="white"/>':'')+
 (r.kind!==2&&!mould?'<g fill="#463546"><ellipse cx="134" cy="166" rx="4" ry="5"/><ellipse cx="183" cy="166" rx="4" ry="5"/></g><path d="M151 175q7 8 15 0" stroke="#463546" stroke-width="3" fill="none"/>':'')+
 (cracks?'<g stroke="'+colors[r.accent]+'" stroke-width="'+(3+progress*2)+'" fill="none" clip-path="url(#c'+id+')"><path d="m101 86 30 44-12 20 32 26-13 44m-19-70-25 8-29-12m86 30 23-19 23 7 51-36"/>'+(progress>1?'<path d="m203 83-13 32 11 17-27 25 16 34 31 22"/>':'')+'</g>':'')+
 (slime&&r.charm&&['jar','play'].includes(phase)?'<text x="160" y="171" text-anchor="middle" font-size="35">'+['','⭐','🌼'][r.charm]+'</text>':'')+'</g>'+
 (bowl?'<path d="M45 160q13 75 115 71t115-71q-106 35-230 0Z" fill="#b5ddec" fill-opacity=".73" stroke="#4d677d" stroke-width="4"/>':'')+
 (phase==='jar'?'<path d="M79 130v74q0 20 21 20h119q22 0 22-20v-74" fill="#fff" fill-opacity=".18" stroke="#78596d" stroke-width="5"/><rect x="75" y="112" width="170" height="20" rx="6" fill="#f5ead7" stroke="#795768" stroke-width="3"/>':'')+
 (pouring?'<g class="stream"><path d="m104 45 45 26 12 64" fill="none" stroke="'+hue+'" stroke-width="9" stroke-linecap="round"/><path d="m70 29 36-13 22 45-40 12z" fill="#e9f8f9" stroke="#546370" stroke-width="3"/></g>':'')+
 (phase==='seal'?'<rect x="147" y="71" width="20" height="13" rx="5" fill="#765e80"/>':'')+'</svg>';
}
