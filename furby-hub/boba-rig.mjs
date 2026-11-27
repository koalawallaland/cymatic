// Articulated Boba recovered from Cymatic-Hologram-Companion.html.
// The body, muzzle, tail and four paws retain the original joint layout.
export function buildBoba(THREE, host) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0,0);
  renderer.domElement.setAttribute('aria-hidden','true');
  const camera = new THREE.OrthographicCamera(-.85,.85,.85,-.85,.01,20);
  camera.position.set(1.55,1.12,2.7);
  camera.lookAt(0,.40,0);
  scene.add(new THREE.HemisphereLight(0xfff9fc,0x9a86c9,2.1));
  const light = new THREE.DirectionalLight(0xfff6ea,2.2);
  light.position.set(2,4,3); scene.add(light);
  const rim = new THREE.DirectionalLight(0xc0d8ff,1.5);
  rim.position.set(-3,1,-2); scene.add(rim);
  const tint = color => new THREE.MeshStandardMaterial({color,roughness:.75});
  const [ivory,blush,nose,collar,shadow,white] = ['#fff4f7','#c88794','#241f28','#a195bd','#eee9fb','#ffffff'].map(tint);
  const sphere = new THREE.SphereGeometry(1,24,16);
  function oval(parent,material,x,y,z,a,b,c) {
    const node = new THREE.Mesh(sphere,material);
    node.position.set(x,y,z); node.scale.set(a,b,c); parent.add(node); return node;
  }
  function joint(parent,x,y,z) {const node=new THREE.Group(); node.position.set(x,y,z); parent.add(node); return node;}
  const boba=joint(scene,0,0,0);
  const dog=joint(boba,0,.36,0);
  oval(dog,ivory,0,0,-.072,.234,.222,.387);
  oval(dog,ivory,0,.071,.186,.251,.282,.176);
  const muzzle=joint(dog,0,.223,.261);
  oval(muzzle,ivory,0,.007,0,.163,.145,.157);
  oval(muzzle,ivory,0,-.059,.111,.102,.067,.119);
  oval(muzzle,nose,0,-.036,.212,.061,.043,.037);
  const tongue=oval(muzzle,blush,0,-.11,.158,.036,.023,.036);
  oval(dog,collar,0,-.005,.279,.162,.058,.111);
  const eyes=[];
  for(const side of [-1,1]){
    eyes.push(oval(muzzle,nose,side*.071,.018,.131,.024,.025,.015));
    oval(muzzle,ivory,side*.115,.123,-.018,.062,.116,.047).rotation.z=-side*.25;
    oval(muzzle,blush,side*.122,.141,.019,.029,.062,.019).rotation.z=-side*.25;
    // Tiny eye highlights and fuller chest fluff complement the original rig.
    oval(muzzle,white,side*.071-.006,.026,.144,.006,.006,.003);
    for(let i=0;i<3;i++) oval(dog,i%2?shadow:ivory,side*(.16-i*.025),.13-i*.071,.28,.083,.098,.08).rotation.z=side*.25;
  }
  const tail=joint(dog,0,.115,-.349);
  for(let i=0;i<7;i++){
    const angle=i*.39;
    oval(tail,ivory,.071*Math.sin(angle),.148*Math.sin(angle),-.14*Math.cos(angle),.086,.083,.087);
  }
  const paws=[];
  for(const x of [-.145,.145]) for(const z of [-.277,.152]){
    const paw=joint(boba,x,.32,z);
    oval(paw,ivory,0,-.111,0,.081,.182,.086);
    oval(paw,ivory,0,-.269,.022,.086,.054,.101);
    paws.push(paw);
  }
  const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.065,-.09,.194),new THREE.Vector3(-.032,-.114,.207),new THREE.Vector3(0,-.105,.217),new THREE.Vector3(.032,-.114,.207),new THREE.Vector3(.065,-.09,.194)]);
  muzzle.add(new THREE.Mesh(new THREE.TubeGeometry(smile,20,.006,6,false),nose));
  oval(dog,new THREE.MeshStandardMaterial({color:'#ffdb91',metalness:.5,roughness:.3}),0,-.045,.393,.042,.042,.014);
  const ball = oval(scene,tint('#fa8dc8'),.43,.075,.2,.075,.075,.075); ball.visible=false;
  let action='idle', start=0, frame=0, visible=true, disposed=false;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function size(){
    const {width,height}=host.getBoundingClientRect();
    if(!width||!height)return;
    const aspect=width/height;
    const h=aspect<1?.75/aspect:.75;
    camera.left=-h*aspect;camera.right=h*aspect;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);renderer.render(scene,camera);
  }
  const observer=new ResizeObserver(size); observer.observe(host);
  function render(now){
    frame=0;if(disposed||!visible)return;
    const t=(now-start)/1000;
    const active=t<2.6&&action!=='idle';
    const phase=active?t:0;
    const reduced=motion.matches;
    const amount=reduced?0:1;
    const bounce=active&&['fetch','walk','wag'].includes(action);
    const quiet=active&&['quiet','rest','sit'].includes(action);
    const talking=active&&['talk','treat'].includes(action);
    boba.rotation.y=amount*(bounce?Math.sin(phase*5)*.25:Math.sin(now*.0012)*.035);
    boba.position.x=amount*(bounce?Math.sin(phase*5)*.16:0);
    boba.position.y=amount*(bounce?Math.abs(Math.sin(phase*8))*.07:0);
    dog.position.y=.36-(quiet?.07:0)*amount;
    muzzle.rotation.z=amount*(active&&action==='cuddle'?.15:active&&action==='paw'?-.12:Math.sin(now*.0017)*.045);
    muzzle.rotation.x=amount*(active&&action==='treat'?Math.sin(phase*9)*.18:quiet?.12:0);
    tail.rotation.y=amount*Math.sin(now*(active&&!quiet?.024:.009))*(active&&!quiet?.67:.25);
    paws.forEach((paw,i)=>{paw.rotation.x=amount*(bounce?Math.sin(phase*10)*.48*(i===0||i===3?1:-1):quiet?.14:0);});
    if(active&&action==='paw'){paws[3].rotation.x=-.65;paws[3].position.y=.44;}else paws[3].position.y=.32;
    tongue.scale.y=.023*(talking&&amount?1+Math.abs(Math.sin(phase*14))*.8:1);
    eyes.forEach(eye=>{eye.scale.y=.025;});
    ball.visible=active&&action==='fetch';
    renderer.render(scene,camera);
    if(!reduced)frame=requestAnimationFrame(render);
  }
  function run(){if(!frame&&!disposed&&visible){if(motion.matches)render(performance.now());else frame=requestAnimationFrame(render);}}
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)run();else if(frame){cancelAnimationFrame(frame);frame=0;}});
  intersection.observe(host);
  host.append(renderer.domElement);size();run();
  motion.addEventListener('change',()=>{if(frame){cancelAnimationFrame(frame);frame=0;}run();});
  function play(next){action=next;start=performance.now();run();}
  return {play};
}
