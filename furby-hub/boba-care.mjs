export const activities=[
 {id:'pet',icon:'💗',name:'Gentle pets',badge:'Gentle Friend',action:'cuddle',steps:3,task:'Give Boba three gentle pats. Pause and let him choose to stay.',button:'Give a gentle pat',question:'What if a real dog turns away?',choices:['Give them space','Keep hugging'],answer:0,tip:'Dogs use their bodies to tell us how they feel. Let them walk away whenever they want.'},
 {id:'water',icon:'💧',name:'Fresh water',badge:'Water Helper',action:'treat',steps:1,task:'Fill Boba’s pretend water bowl.',button:'Fill the bowl',question:'When should a dog have fresh water?',choices:['Only at dinner','Throughout the day'],answer:1,tip:'Dogs need access to clean, fresh water. Ask an adult to help wash and refill the bowl.'},
 {id:'brush',icon:'🪮',name:'Brush fluff',badge:'Fluff Specialist',action:'cuddle',steps:3,task:'Brush Boba’s fluffy coat using gentle strokes.',button:'Brush gently',question:'What should you do if you find a tangled patch?',choices:['Pull harder','Ask an adult for help'],answer:1,tip:'A Samoyed has a thick double coat. Gentle brushing helps; never pull hard on tangles.'},
 {id:'fetch',icon:'🎾',name:'Play fetch',badge:'Fetch Friend',action:'fetch',steps:3,task:'Toss the tennis ball three times in our pretend playroom.',button:'Toss the ball',question:'If Boba looks tired, what should you do?',choices:['Offer water and a rest','Keep throwing'],answer:0,tip:'Playing together is great fun. Dogs need a chance to rest and drink, too.'},
 {id:'walk',icon:'🦮',name:'Safe walk',badge:'Safe Walker',action:'walk',steps:1,task:'Get a pretend leash ready and take a short walk with Boba.',button:'Go for a walk',question:'Who should help you walk a big dog outside?',choices:['Nobody','A trusted grown-up'],answer:1,tip:'Take a grown-up along, use a leash where needed, and ask before approaching another dog.'},
 {id:'rest',icon:'🌙',name:'Quiet time',badge:'Calm Companion',action:'rest',steps:1,task:'Help Boba settle down for a little rest.',button:'Make a cozy bed',question:'What should you do when a real dog is sleeping?',choices:['Let them sleep','Wake them to play'],answer:0,tip:'Quiet time is care, too! Give sleeping dogs their own cozy space.'},
 {id:'food',icon:'🥣',name:'Smart snacks',badge:'Snack Expert',action:'treat',steps:1,task:'Choose a pretend dog treat for Boba.',button:'Offer a dog treat',question:'Who should help choose food and treats for a real dog?',choices:['A grown-up','Anyone with candy'],answer:0,tip:'Dogs need dog-safe food and suitable portions. Ask a grown-up before feeding anything new.'}
];
export function readCare(raw){
 let parsed={};try{parsed=JSON.parse(raw)||{}}catch{}
 const earned=Array.isArray(parsed.earned)?[...new Set(parsed.earned.filter(x=>activities.some(a=>a.id===x)))]:[];
 const theme=['classic','sky','garden','stars'].includes(parsed.theme)?parsed.theme:'classic';
 return {earned,theme:theme==='classic'||earned.length>=({sky:2,garden:4,stars:7}[theme]||99)?theme:'classic'};
}
const KEY='boba-care-passbook-v1', $=id=>document.getElementById(id);
export function initCare({act,say,speak}){
 const root=$('boba-care');if(!root)return null;
 let data=readCare(null);try{data=readCare(localStorage.getItem(KEY))}catch{}
 let current=null,count=0,answering=false;
 const tile=$('boba-care-tiles'), challenge=$('boba-care-challenge'), progress=$('boba-care-progress'), feedback=$('boba-care-feedback');
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}};
 function announce(msg){feedback.textContent=msg;}
 function render(){
   progress.textContent=data.earned.length+' / '+activities.length+' friendship badges';
   $('boba-care-meter').value=data.earned.length;
   $('boba-stage').dataset.theme=data.theme;
   tile.replaceChildren();
   for(const a of activities){
     const b=document.createElement('button');b.type='button';b.className='boba-care-tile';b.dataset.activity=a.id;b.setAttribute('aria-pressed',String(current?.id===a.id));b.textContent=a.icon+' '+a.name+(data.earned.includes(a.id)?' ✓':'');b.addEventListener('click',()=>select(a.id));tile.append(b);
   }
   $('boba-badges').textContent=data.earned.length?activities.filter(a=>data.earned.includes(a.id)).map(a=>a.icon+' '+a.badge).join(' · '):'Your first badge is waiting!';
   root.querySelectorAll('[data-boba-theme]').forEach(b=>{const unlocked=data.earned.length>=Number(b.dataset.unlock);b.disabled=!unlocked;b.setAttribute('aria-pressed',String(data.theme===b.dataset.bobaTheme));});
 }
 function select(id){current=activities.find(a=>a.id===id);if(!current)return;count=0;answering=false;challenge.hidden=false;render();drawTask();announce('');}
 function drawTask(){
   $('boba-task-title').textContent=current.icon+' '+current.name;
   $('boba-task-copy').textContent=current.task;
   $('boba-task-step').textContent=current.button+(current.steps>1?' ('+count+'/'+current.steps+')':'');
   $('boba-task-step').hidden=false;$('boba-task-quiz').hidden=true;
 }
 function step(){
   if(!current||answering||count>=current.steps)return;
   count++;
   act(current.action);
   if(count<current.steps){$('boba-task-step').textContent=current.button+' ('+count+'/'+current.steps+')';announce('Lovely and gentle! '+count+' of '+current.steps);return;}
   answering=true;$('boba-task-step').hidden=true;$('boba-task-quiz').hidden=false;
   $('boba-question').textContent=current.question;
   const answers=$('boba-answers');answers.replaceChildren();
   current.choices.forEach((label,i)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>answer(i));answers.append(b);});
   announce('Nice caring! Now try a little dog-care question.');
 }
 function answer(i){
   if(!answering||!current)return;
   if(i!==current.answer){announce('Good try! '+current.tip+' Try the other answer.');return;}
   const a=current,newBadge=!data.earned.includes(a.id);
   if(newBadge){data.earned.push(a.id);save();}
   const msg=(newBadge?'You earned '+a.badge+'! ':'Great work, friend! ')+a.tip;
   announce(msg);say('Thank you, friend! '+a.tip);speak('Thank you, friend! '+a.tip);
   answering=false;current=null;challenge.hidden=true;render();
 }
 function interact(id){if(current?.id===id&&!answering)step();else if(current?.id!==id){select(id);step();}}
 $('boba-task-step').addEventListener('click',step);
 $('boba-task-close').addEventListener('click',()=>{current=null;answering=false;challenge.hidden=true;announce('');render();});
 root.querySelectorAll('[data-boba-theme]').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;data.theme=b.dataset.bobaTheme;save();render();announce('New playroom style!');}));
 render();
 return {interact,select};
}
