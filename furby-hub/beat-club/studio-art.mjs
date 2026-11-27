// Original modular Bubble Beat performers. No external artwork required.
export const PARTS={
 look:{pop:'Pop performer',classic:'Original plush'},
 shape:{bean:'Soft oval',orb:'Moon round',cube:'Marshmallow',cat:'Kitten',cloud:'Cloud puff',star:'Star drop',droplet:'Rain drop',diamond:'Diamond'},
 ears:{none:'No ears',bunny:'Bunny',cat:'Kitty',antenna:'Antennae',horns:'Little horns',bear:'Bear',elf:'Elf',fins:'Sea fins'},
 hair:{none:'No hair',swoop:'Side swoop',bob:'Bob',pigtails:'Pigtails',spikes:'Spiky',curls:'Cloud curls',fringe:'Straight bangs',long:'Long hair',buns:'Twin buns'},
 eyes:{sparkle:'Starry',round:'Round',sleepy:'Sleepy',heart:'Hearts',wink:'Wink',happy:'Happy',fierce:'Determined',dot:'Dot eyes',half:'Half-lidded',anime:'Shiny anime'},
 mouth:{smile:'Smile',cat:'Kitty',o:'Singing',fang:'Tiny fangs',flat:'Straight',smirk:'Smirk',grin:'Big grin',tongue:'Silly'},
 accessory:{none:'None',bow:'Ribbon',headphones:'Headphones',crown:'Crown',flower:'Flower',halo:'Halo',glasses:'Glasses',cap:'Cap',beret:'Beret',starclip:'Star clips',visor:'Visor',bonnet:'Bonnet'},
 mark:{none:'Clean',heart:'Heart',star:'Star',spots:'Sprinkles',stripe:'Stripes',freckles:'Freckles',blush:'Soft blush',bandage:'Bandage'},
 clothes:{hoodie:'Hoodie',plain:'Plain tee',sailor:'Sailor',overalls:'Overalls',dress:'Party dress',jacket:'Bomber',tux:'Tiny tux',sweater:'Sweater',tutu:'Tutu',space:'Space suit'},
 back:{none:'None',wings:'Angel wings',bat:'Bat wings',tail:'Fluffy tail',ribbon:'Big ribbon',cape:'Cape',sparkles:'Sparkles'},
 pose:{relax:'Relaxed',wave:'Wave',dance:'Dance',hands:'Hands together'}
};
export const NEW_LOOK={look:'pop',hair:'swoop',clothes:'hoodie',back:'none',pose:'relax',eyeColor:'#30204e',hairColor:'#8f73d9',outfitColor:'#a7f5eb',outline:'#423355',strokes:[]};
const defaults={shape:'bean',ears:'bunny',eyes:'sparkle',mouth:'smile',accessory:'bow',mark:'heart',color:'#ffabd4',accent:'#a7f5eb',...NEW_LOOK};
export const CLASSIC={shape:['bean','cloud','star','cube','cat','orb'],ears:['bunny','cat','antenna','horns','none'],eyes:['sparkle','round','sleepy','heart','wink','happy'],mouth:['smile','cat','o','fang','flat'],accessory:['none','bow','headphones','crown','flower','halo','glasses'],mark:['heart','star','spots','stripe','none']};
export const COLOR_FIELDS={color:'Body',accent:'Details',hairColor:'Hair',eyeColor:'Eyes',outfitColor:'Clothes',outline:'Outline'};
export const PALETTES=[
 {name:'Strawberry soda',colors:['#ffaed5','#9af4e3','#936cd9','#432753','#e7c9ff','#4a355d']},
 {name:'Peach milk',colors:['#ffbd9e','#fff0b0','#e98c86','#663e55','#fff2d5','#603c51']},
 {name:'Moon jelly',colors:['#aeb7ff','#b6fbff','#7475bb','#362c68','#d9c6f5','#42345f']},
 {name:'Mint cloud',colors:['#a7eed1','#fff4a9','#50bcae','#244d52','#d8edfa','#314c50']},
 {name:'Licorice',colors:['#74718d','#fcbcdf','#443c69','#24213a','#a58aca','#322d49']},
 {name:'Bubblegum',colors:['#f79ad8','#caff8c','#ff66bd','#5f2760','#a0dbff','#593159']},
 {name:'Galaxy',colors:['#857bdf','#70f1ff','#524bc1','#312b52','#aeacec','#312c58']},
 {name:'Honey bear',colors:['#f5c071','#fff1b5','#ab744e','#563b39','#e9a5a6','#634238']}
];
export const SWATCHES=['#fff9f1','#fff1b5','#ffd194','#ffa99e','#ffabd4','#f67cba','#d9b5ff','#aeb7ff','#8bd7ff','#a7f5eb','#a7eed1','#b9ef8f','#e6d6ce','#9a9ab1','#60577d','#30204e','#181622','#f55e72','#eaa856','#78c3c0','#59365d'];
const okColor=(x,f)=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x)?x:f;
export function normalizeStrokes(value){if(!Array.isArray(value))return[];return value.slice(0,48).flatMap(s=>{if(!s||!Array.isArray(s.points))return[];const points=s.points.slice(0,180).filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)).map(p=>[Math.round(Math.max(0,Math.min(180,p[0]))*10)/10,Math.round(Math.max(0,Math.min(216,p[1]))*10)/10]);if(!points.length)return[];return[{color:okColor(s.color,'#423355'),width:Math.max(1,Math.min(12,Number(s.width)||3)),points}]})}
export function normalizeAppearance(c,legacy=false){const o={};for(const [key,options]of Object.entries(PARTS)){if(key==='look'){o.look=Object.hasOwn(options,c.look)?c.look:legacy?'classic':'pop';continue}o[key]=Object.hasOwn(options,c[key])?c[key]:defaults[key]}for(const key of Object.keys(COLOR_FIELDS))o[key]=okColor(c[key],defaults[key]);o.strokes=normalizeStrokes(c.strokes);return o}
export function legacyAppearance(c){const o={...c};for(const [key,arr] of Object.entries(CLASSIC))if(!arr.includes(o[key]))o[key]=arr.includes(defaults[key])?defaults[key]:arr[0];return o}
function blend(a,b,t){const expand=h=>{h=h.slice(1);return h.length===3?h.split('').map(v=>v+v).join(''):h};a=expand(a);b=expand(b);return '#'+[0,2,4].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('')}
export function strokePath(s){const p=s.points;if(!p.length)return'';return 'M'+p.map(q=>q.join(',')).join(' L')+(p.length===1?' l.01,.01':'')}
function star(x,y,r,fill,ink,w=2.6){let pts=[];for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5,z=i%2?r*.48:r;pts.push((x+Math.cos(a)*z).toFixed(1)+','+(y+Math.sin(a)*z).toFixed(1))}return '<polygon points="'+pts.join(' ')+'" fill="'+fill+'" stroke="'+ink+'" stroke-width="'+w+'"/>'}
export function popArt(raw){
 const c={...defaults,...normalizeAppearance(raw)},B=c.color,A=c.accent,H=c.hairColor,O=c.outfitColor,I=c.outline,E=c.eyeColor;
 const BS=blend(B,I,.17),BL=blend(B,'#ffffff',.40),HS=blend(H,I,.23),OS=blend(O,I,.18),OL=blend(O,'#ffffff',.35),AS=blend(A,I,.22);
 const path=(d,f,sw=3)=>'<path d="'+d+'" fill="'+f+'" stroke="'+I+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round"/>';
 const ellipse=(x,y,rx,ry,f,sw=3)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+f+'" stroke="'+I+'" stroke-width="'+sw+'"/>';
 const line=(d,color=I,w=2.4)=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>';
 const shine=(d,color='#fff',w=4)=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+w+'" stroke-linecap="round" opacity=".7"/>';
 const heart=(x,y,r,f)=>path('M'+x+' '+(y+r*.85)+' Q'+(x-r*1.3)+' '+(y-r*.15)+' '+(x-r*.75)+' '+(y-r*.65)+' Q'+(x-r*.2)+' '+(y-r)+' '+x+' '+(y-r*.2)+' Q'+(x+r*.2)+' '+(y-r)+' '+(x+r*.75)+' '+(y-r*.65)+' Q'+(x+r*1.3)+' '+(y-r*.15)+' '+x+' '+(y+r*.85)+'Z',f,2);
 const heads={bean:'M51 43 Q89 28 127 45 Q151 57 151 86 L150 100 Q145 128 90 132 Q37 128 30 104 Q25 78 34 62 Q40 51 51 43Z',orb:'M90 36 C127 36 154 56 154 87 C154 119 129 134 90 134 C51 134 26 119 26 87 C26 56 52 36 90 36Z',cube:'M49 42 Q90 37 132 42 Q150 44 153 63 V107 Q151 132 125 133 H55 Q28 132 27 107 V65 Q27 45 49 42Z',cat:'M29 78 L26 43 Q26 34 35 40 L64 54 Q91 46 116 54 L145 40 Q154 34 154 43 L151 78 Q157 99 148 114 Q133 134 90 134 Q47 134 32 114 Q20 99 29 78Z',cloud:'M30 67 Q17 47 41 43 Q44 20 72 33 Q99 15 117 35 Q144 26 152 49 Q171 57 154 79 Q165 109 141 123 Q121 140 90 133 Q54 142 34 124 Q10 109 26 85 Q12 75 30 67Z',star:'M88 24 Q91 21 95 29 L108 48 L141 42 Q152 40 149 51 L137 72 L159 99 Q167 112 151 113 L122 116 L99 139 Q90 146 84 139 L62 116 L28 113 Q14 111 21 99 L42 72 L31 51 Q28 40 41 42 L73 48Z',droplet:'M89 27 Q91 23 94 30 Q105 50 132 64 Q155 79 151 104 Q147 133 90 135 Q33 135 29 104 Q25 79 48 64 Q75 50 89 27Z',diamond:'M82 32 Q90 26 99 32 L145 66 Q158 76 152 93 L127 124 Q118 135 90 135 Q62 135 53 124 L28 93 Q22 76 35 66Z'};
 let back='',ear='',hairBack='',hairFront='',body='',face='',access='',extra='';
 if(c.back==='wings')back=path('M60 151 Q17 106 8 125 Q4 153 28 158 Q10 173 43 180 L60 166 M120 151 Q163 106 172 125 Q176 153 152 158 Q170 173 137 180 L120 166',BL)+line('M17 135 Q33 144 50 159 M163 135 Q147 144 130 159',AS,2);
 if(c.back==='bat')back=path('M61 158 Q30 120 8 131 Q23 146 15 168 Q34 155 43 182 L65 173 M119 158 Q150 120 172 131 Q157 146 165 168 Q146 155 137 182 L115 173',H);
 if(c.back==='tail')back=path('M120 174 Q171 168 157 140 Q182 145 173 173 Q166 193 124 192Z',A)+shine('M161 158 Q165 174 147 182');
 if(c.back==='ribbon')back=path('M93 151 Q30 119 20 142 Q12 179 63 167 L45 200 L71 187 L90 162 Q141 192 156 166 Q172 133 127 137Z',A);
 if(c.back==='cape')back=path('M59 134 Q29 154 24 201 Q57 187 89 200 Q122 188 156 201 Q151 153 121 134Z',H);
 if(c.back==='sparkles')back=star(22,115,9,A,I)+star(156,137,12,A,I)+star(151,48,6,A,I)+star(32,183,7,A,I);
 switch(c.ears){
 case'bunny': ear=path('M50 57 Q16 7 36 6 Q57 2 72 49Z',B)+path('M110 49 Q124 2 145 6 Q164 8 130 57Z',B)+path('M51 46 Q29 10 37 13 Q45 11 63 48Z',A,1.7)+path('M117 48 Q135 11 143 13 Q151 10 129 46Z',A,1.7);break;
 case'cat':ear=path('M35 66 Q19 22 26 19 Q37 15 64 49 M116 49 Q143 15 154 19 Q161 22 145 66',B)+path('M32 31 L43 56 L56 51 M148 31 L137 56 L124 51',A,2);break;
 case'antenna':ear=line('M64 47 Q52 30 44 19 M116 47 Q128 30 136 19',I,5)+ellipse(42,17,9,9,A)+ellipse(138,17,9,9,A)+shine('M38 14 l2 -2','#fff',2.4)+shine('M134 14 l2 -2','#fff',2.4);break;
 case'horns':ear=path('M39 64 Q13 50 28 19 Q30 40 59 43Z',A)+path('M141 64 Q167 50 152 19 Q150 40 121 43Z',A);break;
 case'bear':ear=ellipse(35,47,20,21,B)+ellipse(145,47,20,21,B)+ellipse(35,47,11,12,A,2)+ellipse(145,47,11,12,A,2);break;
 case'elf':ear=path('M35 76 Q8 44 5 68 Q9 96 38 99 M145 76 Q172 44 175 68 Q171 96 142 99',B)+line('M13 70 Q23 83 34 87 M167 70 Q157 83 146 87');break;
 case'fins':ear=path('M33 71 Q8 46 7 72 L17 87 L5 96 Q23 111 36 92 M147 71 Q172 46 173 72 L163 87 L175 96 Q157 111 144 92',A)+line('M15 70 L35 84 M13 97 L35 87 M165 70 L145 84 M167 97 L145 87');break}
 switch(c.hair){
 case'long': hairBack=path('M31 69 Q19 126 25 150 Q40 173 59 159 L66 91 L115 91 Q115 145 124 161 Q151 174 158 150 Q162 118 149 65 Q147 31 90 30 Q33 27 31 69Z',H);break;
 case'bob':hairBack=path('M31 66 Q16 105 25 129 Q30 141 50 138 L130 138 Q149 142 155 129 Q163 105 149 66 Q147 28 90 29 Q34 29 31 66Z',H);break;
 case'pigtails':hairBack=path('M38 61 Q9 44 13 94 Q17 112 6 133 Q33 145 49 111 L55 66 M142 61 Q171 44 167 94 Q163 112 174 133 Q147 145 131 111 L125 66',H)+ellipse(34,62,9,6,A,2)+ellipse(146,62,9,6,A,2);break;
 case'buns':hairBack=ellipse(46,31,22,20,H)+ellipse(134,31,22,20,H)+shine('M34 25 Q45 14 55 23')+shine('M124 25 Q135 14 145 23');break}
 const torso=path('M69 134 Q90 126 111 134 L120 170 Q105 182 90 181 Q75 182 60 170Z',O);
 // The leg and arm rig is kept distinct from the head for clean dance animation.
 let leg=path('M70 172 L85 173 L83 193 Q88 202 76 204 H60 Q55 199 60 194 L66 188Z',B)+path('M95 173 L110 172 L114 188 L121 194 Q126 201 120 204 H104 Q92 203 97 193Z',B)+path('M58 194 Q68 191 82 194 L84 202 Q71 208 57 203Z',A)+path('M96 194 Q110 191 122 194 L124 203 Q109 208 96 202Z',A);
 const arms={
 relax:[path('M64 139 Q44 148 40 167 Q40 174 49 173 Q55 172 58 161 L67 153Z',B),path('M116 139 Q136 148 140 167 Q140 174 131 173 Q125 172 122 161 L113 153Z',B)],
 wave:[path('M64 139 Q44 148 40 167 Q40 174 49 173 Q55 172 58 161 L67 153Z',B),path('M115 141 Q137 138 142 116 Q144 110 149 115 Q153 119 152 130 Q146 152 122 156Z',B)],
 dance:[path('M64 140 Q49 142 34 127 Q28 122 27 129 Q28 142 48 153 L62 155Z',B),path('M116 139 Q131 141 146 127 Q152 122 153 129 Q152 142 132 153 L118 155Z',B)],
 hands:[path('M62 138 Q47 156 63 168 L82 171 Q91 168 83 162 L67 156 L69 148Z',B),path('M118 138 Q133 156 117 168 L98 171 Q89 168 97 162 L113 156 L111 148Z',B)]
 };
 let costume='';
 switch(c.clothes){
 case'hoodie':costume=path('M68 134 Q58 140 59 150 L67 177 H113 L121 150 Q122 140 112 134 L90 146Z',O)+path('M70 135 Q90 159 110 135 L103 132 L90 139 L77 132Z',OL,2)+line('M80 147 L79 157 M100 147 L101 157',I,2)+path('M76 164 Q90 157 104 164 L106 174 H74Z',OS,1.8);break;
 case'sailor':costume=path('M66 135 L114 135 L121 174 H59Z',O)+path('M66 135 L90 151 L114 135 L108 130 H72Z',A)+path('M90 150 Q75 141 75 150 Q76 159 90 153 Q104 159 105 150 Q105 141 90 150Z',H,2)+line('M68 168 H112',OL,3);break;
 case'overalls':costume=path('M69 134 Q90 129 111 134 L119 176 H61Z',OL)+path('M68 136 L78 136 L82 148 H98 L102 136 H112 L113 158 L118 177 H62 L67 158Z',O)+ellipse(79,148,3,3,A,1.4)+ellipse(101,148,3,3,A,1.4)+path('M82 155 H98 V167 Q90 172 82 167Z',OS,1.7);break;
 case'dress':costume=path('M70 134 H110 L106 152 L128 182 Q90 196 52 182 L74 152Z',O)+path('M71 151 H109 L113 156 Q90 160 67 156Z',A,1.8)+shine('M66 174 Q90 181 114 174',OL,2);break;
 case'tutu':costume=path('M70 134 H110 L110 156 Q141 165 131 181 Q90 193 49 181 Q39 165 70 156Z',O)+path('M67 154 H113 L117 160 H63Z',A,2)+line('M63 169 L59 179 M77 170 L75 183 M90 171 V184 M103 170 L105 183 M117 169 L121 179',OS,1.5);break;
 case'jacket':costume=path('M64 134 L116 134 L121 176 H59Z',O)+path('M79 134 H101 L100 176 H80Z',OL,2)+line('M90 138 V175',I,2)+line('M65 164 L74 163 M106 163 L115 164',AS,3)+star(107,149,5,A,I,1.5);break;
 case'tux':costume=path('M64 135 H116 L121 176 H59Z',H)+path('M76 134 L90 163 L104 134Z','#fff4ed',2)+path('M90 142 L79 136 V148Z',A,1.8)+path('M90 142 L101 136 V148Z',A,1.8)+ellipse(90,168,2,2,A,1);break;
 case'sweater':costume=path('M65 134 H115 L121 176 H59Z',O)+path('M69 135 Q90 145 111 135 L109 142 Q90 150 71 142Z',OS,2)+line('M65 168 H115',A,3)+star(90,158,8,A,I,1.6);break;
 case'space':costume=path('M64 133 H116 L121 176 H59Z',OL)+path('M73 141 H107 V164 H73Z',O,2)+ellipse(82,149,3,3,A,1.4)+ellipse(91,149,3,3,H,1.4)+line('M80 157 H100',I,2)+path('M61 169 H119 L117 179 H63Z',A,2);break;
 default:costume=torso+shine('M72 142 L80 140',OL,3);
 }
 body=leg+arms[c.pose].join('')+costume;
 const head=path(heads[c.shape],B)+ (['bean','orb','cube','cat'].includes(c.shape)?'<path d="M42 112 Q90 138 138 112 Q128 130 90 130 Q52 130 42 112Z" fill="'+BS+'" opacity=".55" stroke="none"/>':'')+(['star','diamond','droplet'].includes(c.shape)?'':shine('M43 63 Q53 48 73 46',BL,5));
 switch(c.hair){
 case'swoop':hairFront=path('M32 71 Q25 26 63 29 Q91 17 131 31 Q153 42 150 67 Q128 60 119 46 Q99 75 68 65 Q81 56 90 48 Q65 75 32 71Z',H)+shine('M43 44 Q67 29 92 33',blend(H,'#fff',.5),4);break;
 case'bob':case'long':hairFront=path('M30 78 Q23 31 70 29 Q123 21 146 47 Q156 63 150 86 L131 68 Q119 58 113 43 Q89 70 47 64 L30 78Z',H)+shine('M43 48 Q65 32 85 36',blend(H,'#fff',.5),4);break;
 case'pigtails':case'buns':hairFront=path('M33 70 Q25 34 61 30 Q91 21 119 32 Q151 40 148 69 Q124 66 113 50 Q104 66 89 70 Q80 65 68 51 Q55 65 33 70Z',H)+shine('M43 45 Q65 33 83 35');break;
 case'spikes':hairFront=path('M31 70 L25 42 L43 45 L49 25 L64 39 L83 11 L93 35 L115 18 L118 37 L144 26 L140 45 L155 49 L148 70 Q123 57 106 51 Q91 66 80 54 Q53 73 31 70Z',H)+shine('M48 42 l7 3 M82 35 l2 -7');break;
 case'curls':hairFront=path('M31 67 Q12 50 35 40 Q33 17 58 24 Q73 9 90 24 Q112 9 125 27 Q151 22 149 43 Q169 55 145 69 Q131 83 110 66 Q96 84 79 67 Q57 82 31 67Z',H)+line('M44 43 q13-8 15 4 M80 37 q14-6 18 6 M122 45 q12-8 15 3',HS,2.5);break;
 case'fringe':hairFront=path('M31 68 Q25 26 88 27 Q149 26 150 68 L129 66 L124 60 L120 68 L100 68 L97 61 L92 68 L71 68 L67 60 L62 68Z',H)+line('M58 38 L56 60 M94 36 L93 59 M126 42 L131 59',HS,2.5);break}
 function eye(x,style){const y=86,white='#fff9f9',e=style==='anime'?12:10; if(style==='sleepy')return line('M'+(x-11)+' 84 Q'+x+' 96 '+(x+11)+' 84',I,4)+line('M'+(x-11)+' 84 l-3 -3',I,2);if(style==='happy')return line('M'+(x-11)+' 91 Q'+x+' 73 '+(x+11)+' 91',I,4);if(style==='dot')return ellipse(x,y,5.5,7,E,1.7);if(style==='heart')return heart(x,y,10,E)+shine('M'+(x-4)+' '+(y-4)+' l2 -2',white,2);if(style==='half')return ellipse(x,y,11,10,white,2.5)+ellipse(x+1,y+2,6.6,7,E,1)+path('M'+(x-12)+' 82 Q'+x+' 78 '+(x+12)+' 82 L'+(x+11)+' 87 H'+(x-11)+'Z',BS,1.7);if(style==='fierce')return ellipse(x,y+2,11,13,E,2)+ellipse(x-3,y-2,3.5,4,white,0)+line('M'+(x-13)+' 73 L'+(x+10)+' 78',I,3.5);return ellipse(x,y,e,style==='anime'?17:14,E,2.2)+ellipse(x-3,y-5,style==='anime'?5:4,5,white,0)+ellipse(x+4,y+7,2.5,3,blend(E,'#fff',.7),0)+(style==='sparkle'?star(x+4,y+2,4.7,white,white,.5):'')}
 const mouth={smile:line('M79 109 Q90 121 101 109',I,3.5),cat:line('M78 110 Q85 118 90 110 Q95 118 102 110',I,3.4),o:ellipse(90,111,8,10,I,2)+ellipse(90,116,4,2.6,'#ff95bc',0),fang:path('M77 107 Q90 122 103 107Z',I,2)+path('M80 109 L84 115 L88 110 M92 110 L96 115 L100 109','#fff8f8',.8),flat:line('M83 111 H97',I,3.3),smirk:line('M80 112 Q94 116 101 105',I,3.5),grin:path('M75 106 Q90 110 105 106 Q103 123 90 123 Q77 123 75 106Z','#fff9f1',2.6)+line('M90 108 V119',I,1),tongue:line('M80 106 Q90 112 100 106',I,3)+path('M85 109 Q83 124 91 124 Q97 124 96 109Z','#f780b3',2)};
 face=eye(68,c.eyes==='wink'?'happy':c.eyes)+eye(112,c.eyes==='wink'?'sparkle':c.eyes)+ '<g class="idle-mouth">'+mouth[c.mouth]+'</g><g class="hit-mouth" style="display:none">'+mouth.o+'</g>';
 if(c.mark!=='none')face+=ellipse(48,103,8,4,blend(B,'#ec6d9a',.7),0)+ellipse(132,103,8,4,blend(B,'#ec6d9a',.7),0);
 if(c.mark==='heart')face+=heart(48,106,5,A)+heart(132,106,5,A);
 if(c.mark==='star')face+=star(48,105,6,A,I,1.4)+star(132,105,6,A,I,1.4);
 if(c.mark==='spots'||c.mark==='freckles')for(const [x,y]of [[43,104],[50,108],[56,103],[124,103],[130,108],[137,104]])face+=ellipse(x,y,2,2,c.mark==='spots'?A:BS,0);
 if(c.mark==='stripe')face+=line('M44 99 l6 4 M44 107 l6 3 M136 99 l-6 4 M136 107 l-6 3',AS,2.5);
 if(c.mark==='bandage')face+=path('M42 104 l15-7 5 10 -15 7Z','#ffe6bf',1.5)+line('M48 102 l3 7 M52 100 l3 7',I,1);
 switch(c.accessory){
 case'bow':access=path('M89 49 Q65 24 56 38 Q51 52 58 62 Q67 68 89 52 Q111 68 122 62 Q129 52 124 38 Q115 24 89 49Z',A)+ellipse(90,51,7,7,'#fff2ac',2);break;
 case'headphones':access=line('M30 83 Q22 25 90 22 Q158 25 150 83',I,11)+line('M35 67 Q35 31 90 30 Q145 31 145 67',A,6)+path('M22 75 Q29 69 36 76 L40 101 Q33 111 23 104 L19 87Z',A)+path('M158 75 Q151 69 144 76 L140 101 Q147 111 157 104 L161 87Z',A);break;
 case'crown':access=path('M56 46 L49 19 L70 31 L90 12 L110 31 L131 19 L124 46Z','#fff0a4')+ellipse(90,36,5,5,A,2)+shine('M61 42 H78');break;
 case'flower':access=path('M134 37 Q123 20 118 33 Q101 31 104 44 Q106 57 119 54 Q127 72 136 56 Q150 63 151 49 Q154 35 134 37Z',A)+ellipse(129,47,6,6,'#fff2a5',2);break;
 case'halo':access=ellipse(90,20,37,9,'none',5).replace('stroke="'+I+'"','stroke="#ffec95"')+ellipse(90,20,31,4,'none',2).replace('stroke="'+I+'"','stroke="#fffbee"');break;
 case'glasses':access=path('M51 75 Q63 73 83 76 Q87 99 75 104 H62 Q49 101 48 86Z','none',3.6)+path('M97 76 Q117 73 129 75 L132 86 Q131 101 118 104 H105 Q93 99 97 76Z','none',3.6)+line('M84 84 Q90 80 96 84',I,3.5);break;
 case'cap':access=path('M37 51 Q32 13 90 9 Q126 7 141 43 L142 48Z',O)+path('M35 49 Q90 42 144 47 Q161 49 146 57 Q98 62 49 58Z',A)+path('M79 15 Q90 11 99 15 L104 45 H76Z',OL,1.8);break;
 case'beret':access=path('M44 42 Q27 21 56 10 Q84 0 123 13 Q148 26 136 39 Q100 51 44 42Z',O)+line('M95 11 L103 3',I,3.5)+shine('M52 24 Q72 11 99 16');break;
 case'starclip':access=star(46,56,12,A,I,2)+star(132,56,10,'#fff4a4',I,2);break;
 case'visor':access=path('M42 72 Q90 62 138 72 L133 90 Q90 100 47 90Z',A,3)+shine('M57 77 L78 74','#fff',3);break;
 case'bonnet':access=path('M32 72 Q15 43 43 25 Q89 3 137 25 Q165 43 148 72 L137 61 Q134 35 90 33 Q45 35 42 61Z',OL)+path('M41 57 Q27 58 30 78 L38 90 L45 76 M139 57 Q153 58 150 78 L142 90 L135 76',A,2)+line('M39 87 Q40 111 68 126 M141 87 Q140 111 112 126',I,2);break}
 const doodles=c.strokes.map(s=>'<path d="'+strokePath(s)+'" stroke="'+s.color+'" stroke-width="'+s.width+'" stroke-linecap="round" stroke-linejoin="round" fill="none"/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 216" aria-hidden="true"><ellipse cx="90" cy="207" rx="57" ry="6.8" fill="#392747" opacity=".18"/><g class="pop-rig">'+back+hairBack+ear+body+'<g class="pop-head">'+head+hairFront+face+access+'</g><g class="drawing-layer">'+doodles+'</g></g></svg>'
}
