/* Nymphoala duet arranger.
   Only user-selected local backing and vocal score files are used. No copyrighted audio
   or precomposed melody is distributed with this page. */
(function (global) {
'use strict';
function install(o) {
  const $ = (id) => document.getElementById(id);
  const file = $('nymphoFile'), play = $('nymphoPlay'), growl = $('nymphoGrowl'),
    ah = $('nymphoAh'), record = $('nymphoRec'), clear = $('nymphoClear'),
    offset = $('nymphoOffset'), offsetOut = $('nymphoOffsetOut'), status = $('nymphoTime'),
    score = $('nymphoScore'), scoreMap = $('nymphoMap'), femaleTrack = $('nymphoFemaleTrack'),
    maleTrack = $('nymphoMaleTrack'), importBtn = $('nymphoImport'),
    exportBtn = $('nymphoExport'), rate = $('nymphoRate'), rateOut = $('nymphoRateOut');
  const audio = new Audio();
  audio.preload = 'metadata';
  const now = {female:null, male:null}, held = {female:false,male:false};
  let url = null, tick = null, name = '', cues = [], recording = false,
      open = new Map(), midi = null, restoring = false;
  // Preserve the visitor's private backing in their browser only. No MP3 is published
  // or uploaded to GitHub; a one-time selection is remembered on this device.
  const BACKING_DB = 'kwl-nymphoala-private-backing';
  const db = () => new Promise((resolve,reject) => {
    const req=indexedDB.open(BACKING_DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore('audio');
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  async function backingRecord(value, mode='readwrite') {
    const d=await db();
    return new Promise((resolve,reject)=>{
      const tx=d.transaction('audio',mode),req=mode==='readonly'
        ? tx.objectStore('audio').get('last')
        : tx.objectStore('audio').put(value,'last');
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
      tx.oncomplete=()=>d.close();
      tx.onerror=()=>{d.close();};
    });
  }
  function useBacking(blob, filename) {
    if(url)URL.revokeObjectURL(url);
    url=URL.createObjectURL(blob);
    audio.src=url;
    audio.load();
    name=filename||'Local backing track';
    load();
    play.disabled=false;growl.disabled=false;ah.disabled=false;
    record.disabled=false;score.disabled=false;
  }
  async function restoreBacking(){
    restoring=true;
    try{
      const saved=await backingRecord(null,'readonly');
      if(file.files?.length)return; // a new selection must win over a late restore
      if(saved?.blob instanceof Blob && saved.blob.size){
        useBacking(saved.blob,saved.name);
        drawStatus('Saved backing restored · ');
      } else drawStatus('Select your backing track once · ');
    }catch(err){
      console.debug('Local Nymphoala backing cannot be restored',err);
      drawStatus('Select your backing track · ');
    }finally{restoring=false;}
  }
  const role = (t) => t === 'kn' || t === 'growl' ? 'male' : 'female';
  const fmt = (sec) => {
    if (!Number.isFinite(sec) || sec < 0) sec = 0;
    return Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2,'0');
  };
  const safe = (c) => Array.isArray(c) && c.length >= 3
    && Number.isFinite(+c[0]) && Number.isFinite(+c[1]) && +c[0] >= 0
    && +c[1] > +c[0] && +c[1] < 3600 && ['kv','kn','ah','growl'].includes(c[2]);
  const normalize = (cs) => cs.filter(safe).map((c) =>
    [+c[0], +c[1], c[2], Number.isFinite(+c[3]) ? Math.max(24,Math.min(108,+c[3])) : (role(c[2])==='male'?50:76)]
  ).sort((a,b)=>a[0]-b[0]);
  const storage = () => 'kwl-nymphoala-cues:' + name;
  function drawStatus(prefix) {
    status.textContent = (prefix||'')+(audio.src ? fmt(audio.currentTime)+' / '+fmt(audio.duration||0) : 'Choose local backing')+
      (name ? ' · '+name : '')+' · '+cues.length+' vocal cues'+
      (!cues.length?' · no vocal score (no fake auto-melody)':'');
  }
  function save() {
    cues = normalize(cues);
    if (name) try { localStorage.setItem(storage(),JSON.stringify(cues)); } catch (_) {}
    clear.disabled = !cues.length;
    exportBtn.disabled = !cues.length;
    drawStatus();
  }
  function load() {
    cues=[];
    try { cues = normalize(JSON.parse(localStorage.getItem(storage())||'[]')); } catch (_) {}
    clear.disabled=!cues.length;
    exportBtn.disabled=!cues.length;
    resetVoices();
    drawStatus();
  }
  function off(which) {
    if (which === 'female') {
      const v=o.getFemale(); if(v){v.off();v.vib(0,5.6);}
      o.koe.classList.remove('nympho-female');
      o.mouth(null);
    } else {
      const k=o.getMale(); if(k){k.off();k.growl(false);}
      o.koe.classList.remove('nympho-male');
    }
    now[which]=null;
  }
  function resetVoices() {off('female');off('male');}
  function on(which, note) {
    const midi = Math.max(24,Math.min(108,Number(note)|| (which==='male'?50:76)));
    if(which==='male'){
      const k=o.getMale();if(!k)return;
      // Pitch-fold the harsh vocal line into the koala engine's low bellow range.
      // Preserve the contour without turning Dani's growls into the high joey whistle.
      let bellow=midi;
      while(bellow>58)bellow-=12;
      while(bellow<38)bellow+=12;
      k.growl(true); k.on(bellow,false);
      o.koe.classList.add('nympho-male');
      o.bubble('ガオ','koala growl');
    } else {
      const v=o.getFemale(); if(!o.femaleReady()||!v)return;
      const key=v.pick('a')||[...v.keys][0];
      if(!key)return;
      v.on(key,o.hz(midi),false,false);v.vib(22,5.6);
      o.koe.classList.add('nympho-female');o.mouth('a');
      o.bubble('あ','KT sings');
    }
  }
  function refresh() {
    if(audio.paused)return;
    const t = audio.currentTime*Number(rate.value)+Number(offset.value);
    drawStatus(recording?'● recording · ':'');
    for(const which of ['female','male']){
      if(held[which])continue;
      let active=null;
      for(const c of cues) {
        if(c[0]>t)break;
        if(t<c[1] && role(c[2])===which)active=c;
      }
      if(active!==now[which]){
        off(which);
        if(active)on(which,active[3]);
        now[which]=active;
      }
    }
  }
  function mark(type, note, source='keyboard') {
    if(!recording||audio.paused)return;
    unmark(source);
    const which=role(type);
    held[which]=true;
    open.set(source,[+audio.currentTime.toFixed(3),null,type,note||0]);
  }
  function unmark(source='keyboard') {
    const cue=open.get(source);
    if(!cue)return;
    open.delete(source);
    const end=+audio.currentTime.toFixed(3);
    if(end-cue[0]>.065){
      cue[1]=end;
      const which=role(cue[2]);
      cues=cues.filter(c=>role(c[2])!==which||c[1]<=cue[0]||c[0]>=end);
      cues.push(cue);cues.sort((a,b)=>a[0]-b[0]);
    }
    held[role(cue[2])]=false;
    now[role(cue[2])]=null;
  }
  function finishRecording() {
    if(!recording)return;
    for(const source of [...open.keys()])unmark(source);
    recording=false;o.setRecording(false);
    record.textContent='● REC CUES';record.setAttribute('aria-pressed','false');
    save();
  }
  function stop() {
    finishRecording();
    audio.pause();try{audio.currentTime=0;}catch(_){}
    if(tick)clearInterval(tick);tick=null;
    resetVoices();held.female=false;held.male=false;open.clear();
    o.koe.classList.remove('nympho-mode');
    if(o.getMaleGain() && o.context())
      o.getMaleGain().gain.setTargetAtTime(.9,o.context().currentTime,.05);
    play.textContent='▶ NYMPHOALA';play.setAttribute('aria-pressed','false');
    drawStatus();
  }
  async function start() {
    if(!audio.src){status.textContent='Choose your instrumental MP3 first. Tap Play to open Files.';return false;}
    o.stopOther();
    // Start the local backing directly from the button click, BEFORE any potentially
    // expensive voice-bank initialization. Safari otherwise expires the user gesture.
    audio.volume=.8;
    let playback;
    try{playback=audio.play();await playback;}catch(err){
      status.textContent='Backing playback blocked. Tap Play again.';
      console.warn('Backing playback blocked',err);return false;
    }
    // The instrumental starts even if the vocalist is still initializing.
    play.textContent='■ STOP NYMPHOALA';play.setAttribute('aria-pressed','true');
    o.koe.classList.add('nympho-mode');
    try{
      await o.start();
      if(!o.femaleReady())await o.loadFemale();
      if(o.activateFemale)o.activateFemale();
      if(!o.femaleReady()){
        status.textContent='Backing playing; KT voice recordings unavailable';
      }
    }catch(err){
      console.warn('Nymphoala voice bank unavailable, backing continues',err);
      status.textContent='Backing playing; vocal engine unavailable';
    }
    const ctx=o.context();
    if(ctx?.state==='suspended')try{await ctx.resume();}catch(_){}
    if(o.getMaleGain()&&o.context())
      o.getMaleGain().gain.setTargetAtTime(.65,o.context().currentTime,.05);
    resetVoices();
    play.textContent='■ STOP NYMPHOALA';play.setAttribute('aria-pressed','true');
    if(tick)clearInterval(tick);
    tick=setInterval(refresh,25);
    refresh();return true;
  }
  function parseMidi(buffer) {
    const b=new Uint8Array(buffer), view=new DataView(buffer);
    let pos=0;
    const u8=()=>b[pos++];
    const u16=()=>{const v=view.getUint16(pos);pos+=2;return v;};
    const u32=()=>{const v=view.getUint32(pos);pos+=4;return v;};
    const tag=()=>String.fromCharCode(u8(),u8(),u8(),u8());
    const variable=()=>{let n=0,c=0;do{if(pos>=b.length)throw Error('Incomplete MIDI');c=u8();n=(n<<7)|(c&127);}while(c&128);return n;};
    if(tag()!=='MThd')throw Error('Not a MIDI file');
    const header=u32(),format=u16(),count=u16(),division=u16();pos=8+header;
    if((division&32768)||division===0)throw Error('SMPTE timing not supported');
    const tracks=[],tempo=[{tick:0,micro:500000}];
    for(let ix=0;ix<count;ix++){
      if(tag()!=='MTrk')throw Error('Missing MIDI track');
      const trackLen=u32(),end=pos+trackLen;let tick=0,running=0,name='Track '+(ix+1);
      const notes=[],active=new Map();
      while(pos<end){
        tick+=variable();
        let command=u8();
        if(command<128){pos--;command=running;} else if(command<240){running=command;}
        if(command===255){
          const mt=u8(),len=variable(),begin=pos;pos+=len;
          if(mt===81&&len===3)tempo.push({tick,micro:(b[begin]<<16)|(b[begin+1]<<8)|b[begin+2]});
          if(mt===3)name=new TextDecoder().decode(b.slice(begin,begin+len));
          continue;
        }
        if(command===240||command===247){pos+=variable();continue;}
        const kind=command&240,channel=command&15;
        if(kind===192||kind===208){u8();continue;}
        const a=u8(),v=u8(),key=channel+':'+a;
        if(kind===144&&v>0){
          if(!active.has(key))active.set(key,[]);
          active.get(key).push(tick);
        } else if(kind===128||(kind===144&&v===0)){
          const starts=active.get(key);
          if(starts&&starts.length){const from=starts.pop();if(tick>from)notes.push({from,to:tick,note:a});}
        }
      }
      pos=end;
      tracks.push({name,notes});
    }
    tempo.sort((a,b)=>a.tick-b.tick);
    function seconds(t) {
      let prev=0,micro=500000,sec=0;
      for(const e of tempo){
        if(e.tick>t)break;
        sec+=(e.tick-prev)*micro/(division*1e6);
        prev=e.tick;micro=e.micro;
      }
      return sec+(t-prev)*micro/(division*1e6);
    }
    return tracks.map((tr,index)=>({name:tr.name,index,notes:tr.notes.map(n=>[seconds(n.from),seconds(n.to),n.note])})).filter(t=>t.notes.length);
  }
  function populate() {
    for(const sel of [femaleTrack,maleTrack]){
      sel.innerHTML='';
      const none=document.createElement('option');none.value='';none.textContent='— select vocal track —';sel.appendChild(none);
      for(const tr of midi){
        const opt=document.createElement('option');
        opt.value=String(tr.index);opt.textContent=tr.name+' · '+tr.notes.length+' notes';
        sel.appendChild(opt);
      }
    }
    const f=midi.find(tr=>/female|liv|soprano|clean|melody|lead vocal/i.test(tr.name));
    const m=midi.find(tr=>/dani|male|harsh|growl|scream|death vocal/i.test(tr.name));
    if(f)femaleTrack.value=String(f.index);
    if(m)maleTrack.value=String(m.index);
    scoreMap.hidden=false;
    status.textContent='Choose the two VOCAL tracks, then import. Instrument tracks are not vocals.';
  }
  file.addEventListener('change',()=>{
    const f=file.files&&file.files[0];if(!f)return;
    stop();
    useBacking(f,f.name);
    // Once the user selects a file, attempt immediate playback so the
    // primary flow is Play → pick file → hear the track.
    start().then(ok=>{
      if(!ok)status.textContent='Backing selected. Tap Play Nymphoala once more to start it.';
    });
    backingRecord({blob:f,name:f.name}).catch(err=>
      console.debug('Backing can be played but could not be saved',err)
    );
  });
  audio.addEventListener('loadedmetadata',()=>drawStatus());
  audio.addEventListener('seeked',()=>{resetVoices();refresh();});
  audio.addEventListener('ended',stop);
  play.addEventListener('click',()=>{
    if(!audio.src){
      status.textContent='Step 1 of 2: choose your instrumental MP3 from Files. Then playback starts.';
      // Open the native file picker during this direct user gesture.
      file.click();
      return;
    }
    if(audio.paused)start();else stop();
  });
  // Switching to another showcase must stop the duet's backing as well.
  for (const id of ['autoQueen','autoDuet']) {
    const b=$(id);if(b)b.addEventListener('click',()=>{if(!audio.paused)stop();},true);
  }
  record.addEventListener('click',async()=>{
    if(recording){finishRecording();return;}
    if(audio.paused && !(await start()))return;
    resetVoices();recording=true;o.setRecording(true);
    record.textContent='■ STOP REC';record.setAttribute('aria-pressed','true');
  });
  clear.addEventListener('click',()=>{cues=[];save();resetVoices();});
  offset.addEventListener('input',()=>{offsetOut.textContent=(+offset.value>=0?'+':'')+(+offset.value).toFixed(2)+'s';resetVoices();});
  rate.addEventListener('input',()=>{rateOut.textContent=(+rate.value).toFixed(3)+'×';resetVoices();});
  for(const [button,which,type,note] of [[growl,'male','growl',50],[ah,'female','ah',76]]){
    const up=()=>{if(!held[which])return;unmark(which);held[which]=false;off(which);};
    button.addEventListener('pointerdown',async(e)=>{
      e.preventDefault();
      try{button.setPointerCapture(e.pointerId);}catch(_){}
      try{await o.start();if(which==='female'&&!o.femaleReady())await o.loadFemale();}catch(_){return;}
      held[which]=true;on(which,note);mark(type,note,which);
    });
    button.addEventListener('pointerup',up);
    button.addEventListener('pointercancel',up);
    button.addEventListener('lostpointercapture',up);
  }
  score.addEventListener('change',async()=>{
    const f=score.files&&score.files[0];if(!f)return;
    try {
      if(/\.json$/i.test(f.name)){
        const data=JSON.parse(await f.text());
        const cs=Array.isArray(data)?data:data.cues;
        if(!Array.isArray(cs))throw Error('Expected a cue array');
        cues=normalize(cs);midi=null;scoreMap.hidden=true;save();
      } else {
        midi=parseMidi(await f.arrayBuffer());
        if(!midi.length)throw Error('No note tracks found');
        populate();
      }
    }catch(err){status.textContent='Score import failed: '+err.message;console.warn(err);}
  });
  importBtn.addEventListener('click',()=>{
    if(!midi)return;
    const f=midi.find(tr=>String(tr.index)===femaleTrack.value);
    const m=midi.find(tr=>String(tr.index)===maleTrack.value);
    if(!f&&!m){status.textContent='Select at least one VOCAL track';return;}
    if(f&&m&&f.index===m.index){status.textContent='Female and growl need separate MIDI tracks';return;}
    const loaded=[];
    if(f)for(const [a,b,n] of f.notes)loaded.push([a,b,'kv',n]);
    if(m)for(const [a,b,n] of m.notes)loaded.push([a,b,'kn',n]);
    cues=normalize(loaded);save();
    scoreMap.hidden=true;
    status.textContent='Imported '+cues.length+' pitched cues · adjust sync and speed to align with backing';
  });
  exportBtn.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({version:2,cues},null,2)],{type:'application/json'});
    const u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download='nymphoala-vocal-cues.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(u),3000);
  });
  drawStatus('Tap Play to choose your backing MP3 · ');
  restoreBacking();
  return {mark,unmark,stop,get recording(){return recording;}};
}
global.createNymphoalaDuet=install;
})(window);
