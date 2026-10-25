/* =====================================================================
   THE CLASS ALBUM — everyone makes one song together
   Nothing is sent out: each computer (CADCAST/go) only shows a small brief (role, tempo, key, length) and a drop
   zone. Each student is dealt a role and makes exactly N bars of it, exports
   them from the DAW (sample-exact, no recording) and drops the file on the CADCAST page (pcSendFile kind 'part').
   Control Room fits every part to the length (a reverb tail wraps round to the start, half-length loops repeat) and the
   class arranges the song on the big screen: a row per part, a column per section; phones switch their own row.
   The album: an offline render → mix WAV (+ stems, all scaled by the same gain so they sum to the mix), downloaded
   on the big screen.
   ===================================================================== */
const AL_SR=44100;
const AL_ROLES=[
  {id:'drums',name:'Drums',tip:'The beat: kick, snare, hats. Simple enough for everyone to play over.'},
  {id:'bass',name:'Bass',tip:'Follow the root of each chord and lock in with the kick.'},
  {id:'chords',name:'Chords',tip:'The harmony everyone plays over, in your own sound and rhythm: pads, stabs, piano, guitar.'},
  {id:'hook',name:'The hook',tip:'The melody people hum on the way home. Short, catchy, repeated. Stay in the key.'},
  {id:'vox',name:'Vocal chop',tip:'Chop a voice (record yours!) into a rhythm or a tiny melody.'},
  {id:'fx',name:'FX & transitions',tip:'Risers, impacts, sweeps, reversed hits: the moments between sections.'},
  {id:'perc',name:'Percussion',tip:'Shakers, claps, toms, found sounds. Fill the gaps the drums leave.'},
  {id:'pad',name:'Atmosphere',tip:'A long, wide texture under everything. Slow movement, no busy rhythm.'},
  {id:'arp',name:'Arp',tip:'An arpeggio in the key: sixteenths, triplets, your choice.'},
  {id:'counter',name:'Counter-melody',tip:'A second melody that answers the hook. Fewer notes, another range.'},
  {id:'sub',name:'Sub & 808',tip:'Deep low end: an 808 or a sine sub on the roots. Leave space for the bass.'},
  {id:'lead',name:'Lead',tip:'A bold lead for the big moments: synth, guitar, anything that shouts.'},
];
const AL_COL=['--red','--blue','--yel','--green'];
// sections and which roles play in them by default (the class changes it all anyway)
const AL_SECS=['Intro','Verse','Build','Drop','Break','Drop 2','Outro'];
const AL_FILL={drums:'0111010',bass:'0101010',chords:'1111111',hook:'0011010',vox:'0101110',fx:'1010101',perc:'0111010',pad:'1010101',
  arp:'0111011',counter:'0001010',sub:'0001010',lead:'0000010'};
const AL_ADJ=['Paper','Neon','Slow','Electric','Golden','Midnight','Concrete','Velvet','Hollow','Lucky','Static','Borrowed'];
const AL_NOUN=['Weather','Machines','Satellites','Hallways','Signals','Tigers','Lanterns','Echoes','Rooftops','Fireworks','Rivers','Strangers'];
const alKeys=()=>(typeof ASSETS!=='undefined'?ASSETS.KEYS.filter(k=>/major|minor/.test(k.mode)).map(k=>k.name):['A minor']);   // plain major/minor: easier for a whole class
const alFmt=s=>`${Math.floor(s/60)}:${pad2(Math.round(s%60))}`;
const alSafe=s=>String(s).replace(/[\\/:*?"<>|]+/g,'').trim()||'part';

/* ---------- WAV + ZIP writers (16-bit PCM at one gain; store-only zip) */
function alWav(buf,g=1){const ch=buf.numberOfChannels,n=buf.length,b=new ArrayBuffer(44+n*ch*2),v=new DataView(b);
  const w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));w(0,'RIFF');v.setUint32(4,36+n*ch*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);
  v.setUint16(22,ch,true);v.setUint32(24,buf.sampleRate,true);v.setUint32(28,buf.sampleRate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*ch*2,true);
  const d=[...Array(ch)].map((_,c)=>buf.getChannelData(c));let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const x=Math.max(-1,Math.min(1,d[c][i]*g));v.setInt16(o,x<0?x*32768:x*32767,true);o+=2;}
  return new Blob([b],{type:'audio/wav'});}
const AL_CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
async function alZip(files){const parts=[],cen=[];let off=0;const enc=new TextEncoder();
  for(const f of files){const data=new Uint8Array(await f.blob.arrayBuffer()),name=enc.encode(f.name);let c=0xFFFFFFFF;for(let i=0;i<data.length;i++)c=AL_CRC[(c^data[i])&255]^(c>>>8);c=(c^0xFFFFFFFF)>>>0;
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(8,0,true);h.setUint32(14,c,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);
    const e=new DataView(new ArrayBuffer(46));e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint32(16,c,true);e.setUint32(20,data.length,true);e.setUint32(24,data.length,true);e.setUint16(28,name.length,true);e.setUint32(42,off,true);
    parts.push(h,name,data);cen.push(e,name);off+=30+name.length+data.length;}
  const csz=cen.reduce((a,x)=>a+x.byteLength,0),end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,csz,true);end.setUint32(16,off,true);
  return new Blob([...parts,...cen,end],{type:'application/zip'});}

/* ---------- fitting an exported part to exactly N bars */
async function alFit(blob,bpm,bars){const L=Math.round(bars*4*60/bpm*AL_SR),barN=L/bars;
  let src;try{src=await new OfflineAudioContext(2,1,AL_SR).decodeAudioData(await blob.arrayBuffer());}catch(e){return {ok:false,text:'Couldn’t read that file. Export it as MP3 or WAV.'};}
  const n=src.length,out=new AudioBuffer({numberOfChannels:2,length:L,sampleRate:AL_SR}),r=n/L;let text='',peak=0;
  for(let c=0;c<2;c++){const a=src.getChannelData(Math.min(c,src.numberOfChannels-1)),o=out.getChannelData(c);
    if(Math.abs(r-1)<.003||r>1){o.set(a.subarray(0,L));if(r<1.5)for(let i=L;i<n;i++)o[i%L]+=a[i];}              // a tail wraps round to the start, like a loop
    else{const loops=[.5,.25].find(f=>Math.abs(r-f)<.006);if(loops){for(let i=0;i<L;i++)o[i]=a[i%n];}else o.set(a);}   // half/quarter length: loop it; else pad
    for(let i=0;i<L;i++)peak=Math.max(peak,Math.abs(o[i]));}
  const got=n/barN,gb=Math.round(got*10)/10;
  if(peak<.001)return {ok:false,text:'That file is silent. Check what you exported.'};
  if(Math.abs(r-1)<.003)text=`✓ ${bars} bars, spot on`;
  else if(r>1&&r<1.5)text=`✓ ${bars} bars + a ${((n-L)/AL_SR).toFixed(1)} s tail (wrapped round to the start)`;
  else if(r>=1.5)text=`✓ Got ${gb} bars: using the first ${bars}`;
  else if(Math.abs(r-.5)<.006||Math.abs(r-.25)<.006)text=`✓ Got ${Math.round(got)} bars: looped to ${bars}`;
  else return {ok:true,buf:out,peak,warn:true,text:`${gb} bars: the rest is silence. Is your tempo ${bpm} BPM and did you export from bar 1?`};
  return {ok:true,buf:out,peak,text};}

game({
  id:'album',group:'make',name:'The Class Album',tag:'Everyone makes one part of the same song. The class arranges it and takes the track home.',
  how:['Everyone works at the same tempo and key, and gets a role: drums, bass, the hook…','Make your part, export exactly the bars asked for and drop the file on your CADCAST page.','The big screen stacks every part into one song. Arrange it together, then download the mix and stems.'],
  badges:['CADCAST','Whole class','Mix + stems'],kind:'free',
  icon:`<svg viewBox="0 0 64 64"><rect x="6" y="10" width="44" height="44" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/><circle cx="40" cy="32" r="20" fill="var(--ink)"/><circle cx="40" cy="32" r="7" fill="var(--red)" stroke="var(--paper)" stroke-width="2"/>${[0,1,2,3].map(i=>`<rect x="10" y="${15+i*9}" width="${[16,10,20,12][i]}" height="5" fill="var(${['--red','--blue','--green','--paper'][i]})"/>`).join('')}</svg>`,
  options:[
    {key:'bpm',label:'Tempo',choices:[[85,'85'],[95,'95'],[100,'100'],[110,'110'],[120,'120'],[128,'128'],[140,'140']],def:100},
    {key:'key',label:'Key',choices:[['random','Deal one','a random key'],['A minor','A minor'],['C major','C major'],['E minor','E minor'],['F major','F major']],def:'random'},
    {key:'bars',label:'Each part',choices:[[8,'8','bars'],[16,'16','bars']],def:8},
    {key:'mins',label:'Making time',choices:[[15,'15','min'],[20,'20','min'],[30,'30','min'],[45,'45','min'],[0,'Open','no clock'],[-10,'10 s','test run']],def:30},
  ],
  note:'Students hand in through CADCAST (gunnitynes.github.io/CADCAST/go): they drop their exported part on that page. Nothing is sent to the computers. A student without CADCAST can AirDrop the file to you: drag it onto their card.',
  topInfo(){const s=G.gs;if(!s)return this.tag;return `${s.o.bpm} BPM · ${s.key} · ${s.o.bars} bars each`+({make:' · making',arrange:' · arranging',album:''})[s.phase];},
  start(o){const key=o.key==='random'?pick(alKeys()):o.key;
    G.gs={o,key,id:Date.now()%1e9,phase:'make',roles:new Map(),parts:new Map(),prog:new Map(),secs:AL_SECS.slice(),on:new Map(),lvl:new Map(),mute:new Set(),
      titles:new Map(),title:`${pick(AL_ADJ)} ${pick(AL_NOUN)}`,play:null,out:null};
    if(o.mins)startClock(o.mins<0?-o.mins*1000:o.mins*60000,()=>{sfx.alarm();toast('Time! Export your part and drop it on CADCAST.');});this.dealAll();
  },
  stop(){this.halt();stopClock();const s=G.gs;if(s)online().forEach(p=>pcSend(p,{t:'album-end'}));},
  leave(){},
  // ---------- roles: dealt in order of need (drums and bass first), then doubled up
  dealAll(){const s=G.gs,ps=shuffle(online());ps.forEach(p=>{if(!s.roles.has(p.id))this.deal(p);});},
  deal(p,skip){const s=G.gs,count=id=>[...s.roles.values()].filter(r=>r===id).length;
    let best=null;for(const r of AL_ROLES){if(r.id===skip)continue;const c=count(r.id);if(!best||c<best.c)best={r,c};}
    s.roles.set(p.id,best.r.id);this.brief(p);},
  role(pid){return AL_ROLES.find(r=>r.id===G.gs.roles.get(pid))||AL_ROLES[0];},
  roleName(pid){const s=G.gs,id=s.roles.get(pid),same=[...s.roles].filter(([,r])=>r===id).map(([k])=>k);const r=this.role(pid);return same.length>1?`${r.name} ${same.indexOf(pid)+1}`:r.name;},
  // only a few words and the drop zone: no files go out
  brief(p){const s=G.gs;if(s.phase!=='make')return;const r=this.role(p.id);
    pcSend(p,{t:'album',m:{round:s.id,at:Date.now(),title:s.title,role:this.roleName(p.id),tip:r.tip,bpm:s.o.bpm,key:s.key,bars:s.o.bars,files:[],ends:s.clockEnd?Date.now()+clockLeft():0}});},
  onJoin(p){const s=G.gs;if(s.phase==='make'&&!s.roles.has(p.id)){this.deal(p);render();sync(p);}},
  onPair(p){const s=G.gs;if(s.phase==='make'&&s.roles.has(p.id))this.brief(p);this.live();},
  // ---------- hand-in
  onPcProg(p,f,meta){const s=G.gs;if(!meta||meta.kind!=='part'||meta.round!==s.id)return;s.prog.set(p.id,f);this.live();},
  onPcFile(p,meta,blob){const s=G.gs;if(meta.kind!=='part'||meta.round!==s.id)return;s.prog.delete(p.id);this.take(p,blob,meta.name);},
  async take(p,blob,name){const s=G.gs;if(!s.roles.has(p.id))this.deal(p);s.prog.set(p.id,-1);this.live();
    const f=await alFit(blob,s.o.bpm,s.o.bars);if(G.gs!==s)return;s.prog.delete(p.id);
    pcSend(p,{t:'album-got',ok:f.ok&&!f.warn,text:f.ok?(f.warn?f.text:f.text+'. It’s on the big screen.'):f.text});
    if(!f.ok){(s.fail||(s.fail=new Map())).set(p.id,f.text);toast(`${p.name}: ${f.text}`);this.live();return;}s.fail&&s.fail.delete(p.id);
    const had=s.parts.has(p.id);s.parts.set(p.id,{buf:f.buf,text:f.text,warn:!!f.warn,name,at:Date.now()});
    toast(`${f.warn?'!':'✓'} ${p.name}’s ${this.roleName(p.id)} is in${f.warn?': '+f.text:''}`);
    if(!had){const fill=AL_FILL[this.role(p.id).id]||'1111111';s.on.set(p.id,new Set(s.secs.map((_,k)=>k).filter(k=>fill[Math.min(k,fill.length-1)]==='1')));s.lvl.set(p.id,.8);sfx.inn&&sfx.inn();}
    if(s.play)this.reschedule(p.id);
    if(s.phase==='make')this.live();else render();sync(p);},
  // ---------- playback: sections scheduled just ahead, each part through its own gain
  rows(){const s=G.gs;return [...s.parts.keys()].filter(pid=>s.roles.has(pid)).sort((a,b)=>AL_ROLES.findIndex(r=>r.id===s.roles.get(a))-AL_ROLES.findIndex(r=>r.id===s.roles.get(b))||String(a).localeCompare(b));},
  secLen(){const s=G.gs;return s.o.bars*4*60/s.o.bpm;},
  gainOf(pid){const s=G.gs;return s.mute.has(pid)?0:(s.lvl.get(pid)??.8);},
  play(from=0){const s=G.gs;this.halt();if(!s.parts.size)return;const ac=audio(),bus=gn(ac,.9);bus.connect(AU.music);
    const P={ac,bus,next:from,nextAt:ac.currentTime+.15,segs:[],sid:0,src:new Map(),g:new Map(),loop:null,stop:()=>this.halt()};s.play=P;AU.live.add(P);
    P.tick=setInterval(()=>this.pump(),40);this.pump();this.live();},
  halt(){const s=G.gs,P=s&&s.play;if(!P)return;clearInterval(P.tick);P.src.forEach(x=>{try{x.src.stop();}catch(e){}});try{P.bus.disconnect();}catch(e){}AU.live.delete(P);s.play=null;this.live();},
  // sections are scheduled half a second ahead as segments {id, k, at}; a looped section is simply scheduled again
  pump(){const s=G.gs,P=s&&s.play;if(!P)return;const now=P.ac.currentTime,len=this.secLen();
    while(P.next!=null&&P.nextAt-now<.5){const seg={id:++P.sid,k:P.next,at:P.nextAt};P.segs.push(seg);if(P.segs.length>4)P.segs.shift();
      this.rows().forEach(pid=>{if(s.on.get(pid)&&s.on.get(pid).has(seg.k))this.startSrc(pid,seg,0);});
      P.nextAt+=len;P.next=P.loop!=null?P.loop:seg.k+1<s.secs.length?seg.k+1:null;}
    const last=P.segs[P.segs.length-1];if(P.next==null&&(!last||now>last.at+len+.1)){this.halt();}},
  startSrc(pid,seg,off){const s=G.gs,P=s.play,part=s.parts.get(pid);if(!P||!part)return;let g=P.g.get(pid);if(!g){g=gn(P.ac,this.gainOf(pid));g.connect(P.bus);P.g.set(pid,g);}
    const env=gn(P.ac,1),src=P.ac.createBufferSource(),key=pid+':'+seg.id;src.buffer=part.buf;src.connect(env).connect(g);const at=Math.max(P.ac.currentTime+.02,seg.at+off);
    if(off>0){env.gain.setValueAtTime(0,at);env.gain.linearRampToValueAtTime(1,at+.03);}
    src.start(at,Math.min(part.buf.duration-.01,at-seg.at));src.onended=()=>{const x=P.src.get(key);if(x&&x.src===src)P.src.delete(key);};
    const old=P.src.get(key);if(old)try{old.src.stop();}catch(e){}P.src.set(key,{src,env});},
  cur(){const P=G.gs.play;if(!P)return null;const now=P.ac.currentTime,len=this.secLen();return P.segs.find(x=>now>=x.at&&now<x.at+len)||null;},
  // where the playhead is: section + fraction
  pos(){const x=this.cur();return x?{k:x.k,f:(G.gs.play.ac.currentTime-x.at)/this.secLen()}:null;},
  // a cell or level changed while playing: fade or start the part in the running and the already scheduled section
  reschedule(pid){const s=G.gs,P=s.play;if(!P)return;const now=P.ac.currentTime,len=this.secLen();
    (pid?[pid]:this.rows()).forEach(id=>{const g=P.g.get(id);if(g)g.gain.setTargetAtTime(this.gainOf(id),now,.03);
      P.segs.filter(x=>x.at+len>now).forEach(seg=>{const on=s.on.get(id)&&s.on.get(id).has(seg.k),key=id+':'+seg.id,x=P.src.get(key);
        if(on&&!x)this.startSrc(id,seg,Math.max(0,now+.05-seg.at));
        if(!on&&x){const t=Math.max(now,seg.at);x.env.gain.setTargetAtTime(0,t,.02);try{x.src.stop(t+.15);}catch(e){}P.src.delete(key);}});});},
  setLoop(k){const s=G.gs,P=s.play;if(!P){this.play(k);return;}if(P.loop===k){P.loop=null;const last=P.segs[P.segs.length-1];P.next=last&&last.k+1<s.secs.length?last.k+1:null;}
    else{P.loop=k;P.next=k;}this.live();},
  toggle(pid,k){const s=G.gs,set=s.on.get(pid);if(!set||k<0||k>=s.secs.length)return;if(set.has(k))set.delete(k);else set.add(k);this.reschedule(pid);
    const p=G.players.get(pid);if(p)sync(p);this.live();},
  // ---------- the song as a file: one offline render per stem, the mix is their sum
  async renderAll(){const s=G.gs;if(s.out||s.rendering)return;s.rendering=true;render();
    const rows=this.rows(),len=this.secLen(),N=Math.ceil(len*s.secs.length*AL_SR),tail=Math.ceil(.05*AL_SR);
    const stem=async pid=>{const ac=new OfflineAudioContext(2,N+tail,AL_SR),g=ac.createGain();g.gain.value=this.gainOf(pid);g.connect(ac.destination);
      s.secs.forEach((_,k)=>{if(s.on.get(pid)&&s.on.get(pid).has(k)){const x=ac.createBufferSource();x.buffer=s.parts.get(pid).buf;x.connect(g);x.start(k*len);}});return ac.startRendering();};
    const bufs=[];for(const pid of rows){bufs.push(await stem(pid));if(G.gs!==s)return;}
    const mix=new AudioBuffer({numberOfChannels:2,length:N+tail,sampleRate:AL_SR});let peak=0;
    for(let c=0;c<2;c++){const m=mix.getChannelData(c);bufs.forEach(b=>{const d=b.getChannelData(c);for(let i=0;i<m.length;i++)m[i]+=d[i];});for(let i=0;i<m.length;i++)peak=Math.max(peak,Math.abs(m[i]));}
    const gain=peak>0?.89/peak:1,t=alSafe(s.title);   // the mix peaks at −1 dB; stems share its gain, so they add up to it
    const stems=rows.map((pid,i)=>({pid,name:`${t} - Stems/${pad2(i+1)} ${alSafe(this.roleName(pid))} - ${alSafe((G.players.get(pid)||{}).name||'')}.wav`,blob:alWav(bufs[i],gain)}));
    s.out={mix:alWav(mix,gain),stems,dur:mix.duration,title:s.title,names:rows.map(pid=>[(G.players.get(pid)||{}).name||'?',this.roleName(pid)])};s.rendering=false;
    s.out.mixURL=URL.createObjectURL(s.out.mix);s.out.stemURLs=stems.map(x=>URL.createObjectURL(x.blob));
    s.phase='album';sfx.fanfare&&sfx.fanfare();render();syncAll();},
  async zip(){const s=G.gs,O=s.out;if(!O)return;const b=$('#alZip');if(b){b.disabled=true;b.textContent='Packing…';}
    const z=await alZip([{name:`${alSafe(O.title)} - Mix.wav`,blob:O.mix},...O.stems]);const a=document.createElement('a');a.href=URL.createObjectURL(z);a.download=`${alSafe(O.title)} - Class Album.zip`;a.click();
    if(b){b.disabled=false;b.textContent='⬇ Mix + all stems (.zip)';}},
  next(){const s=G.gs;if(s.phase==='make'){if(!s.parts.size){toast('No parts yet: wait for the first export');return;}s.phase='arrange';stopClock();online().forEach(p=>pcSend(p,{t:'album-end'}));render();syncAll();return;}
    if(s.phase==='arrange'){this.halt();this.renderAll();return;}
    exitGame(true);},
  act(p,d){const s=G.gs;
    if(d.t==='cell'&&s.phase==='arrange'&&s.parts.has(p.id))this.toggle(p.id,+d.k);
    if(d.t==='lvl'&&s.parts.has(p.id)){s.lvl.set(p.id,clamp(+d.v||0,0,1));this.reschedule(p.id);this.live();}
    if(d.t==='title'){const t=String(d.v||'').replace(/\s+/g,' ').trim().slice(0,40);if(t){s.titles.set(p.id,t);sfx.card&&sfx.card();this.live();sync(p);}}},
  // ---------- the big screen
  frame(){clockFrame();const s=G.gs;if(!s||s.phase!=='arrange')return;const at=this.pos(),h=$('#alHead');
    if(h){h.style.display=at&&at.k<s.secs.length?'block':'none';if(at)h.style.left=(100*(at.k+at.f)/s.secs.length)+'%';}
    const k=at?at.k:-1;if(k!==this._k){this._k=k;$$('.alsec',$('#alGrid')||document).forEach((e,i)=>e.classList.toggle('now',i===k));}},
  live(){const s=G.gs;if(!s)return;if(s.phase==='make'){const w=$('#alWall');if(w)w.innerHTML=this.wall();const n=$('#alCount');if(n)n.textContent=`${s.parts.size} of ${s.roles.size} parts in`;const b=$('#bNext');if(b)b.disabled=!s.parts.size;return;}
    if(s.phase==='arrange'){const g=$('#alGrid');if(g){g.innerHTML=this.grid();this.bindGrid(g);}const t=$('#alTitles');if(t){t.innerHTML=this.titles();this.bindTitles(t);}const pb=$('#alPlay');if(pb)pb.innerHTML=s.play?'■ Stop':'▶ Play the song';}
  },
  wall(){const s=G.gs;const ids=[...s.roles.keys()].filter(id=>G.players.has(id));
    return ids.map((pid,i)=>{const p=G.players.get(pid),part=s.parts.get(pid),pr=s.prog.get(pid),r=this.role(pid);
      const bad=s.fail&&s.fail.get(pid),st=part?(part.warn?'warn':'in'):pr!=null?'up':bad?'bad':pcFor(p)?'wait':'nopc';
      const lab={in:esc(part&&part.text||''),warn:esc(part&&part.text||''),up:pr<0?'checking…':`arriving ${Math.round(pr*100)}%`,bad:esc(bad||''),wait:'making…',nopc:'no CADCAST: drop their file here'}[st];
      return `<div class="alcard st-${st}" data-pid="${esc(pid)}" style="--c:var(${AL_COL[AL_ROLES.indexOf(r)%4]})"><button class="alrole" data-pid="${esc(pid)}" title="Deal another role">${esc(this.roleName(pid))}</button><b>${esc(p.name)}</b><span>${lab}</span>${part?`<i class="alok">${part.warn?'!':'✓'}</i>`:''}</div>`;}).join('')||'<p class="fine">Nobody has joined yet.</p>';},
  bindWall(st){const w=$('#alWall',st);if(!w)return;
    w.onclick=e=>{const b=e.target.closest('.alrole');if(!b)return;const p=G.players.get(b.dataset.pid);if(!p)return;const s=G.gs;if(s.parts.has(p.id)){toast('Their part is already in');return;}this.deal(p,s.roles.get(p.id));this.live();sync(p);};
    w.ondragover=e=>{const c=e.target.closest('.alcard');if(!c)return;e.preventDefault();$$('.alcard.over',w).forEach(x=>x.classList.remove('over'));c.classList.add('over');};
    w.ondragleave=e=>{const c=e.target.closest('.alcard');if(c)c.classList.remove('over');};
    w.ondrop=e=>{const c=e.target.closest('.alcard');if(!c)return;e.preventDefault();c.classList.remove('over');const p=G.players.get(c.dataset.pid),f=e.dataTransfer.files[0];if(p&&f)this.take(p,f,f.name);};},
  grid(){const s=G.gs,rows=this.rows(),K=s.secs.length;
    return `<div class="alhdr" style="--k:${K}"><span></span><div class="alsecs">${s.secs.map((n,k)=>`<button class="alsec${s.play&&s.play.loop===k?' loop':''}" data-k="${k}"><b>${esc(n)}</b><small>${s.play&&s.play.loop===k?'looping':'bars '+(k*s.o.bars+1)}</small></button>`).join('')}<button class="alsec add" id="alAdd" title="Add a section">+</button></div></div>
      <div class="alrows" style="--k:${K};--n:${Math.max(1,rows.length)}">${rows.map(pid=>{const p=G.players.get(pid)||{name:'?'},r=this.role(pid),on=s.on.get(pid)||new Set(),c=AL_COL[AL_ROLES.indexOf(r)%4],m=s.mute.has(pid);
        return `<div class="alrow${m?' mute':''}" style="--c:var(${c})"><div class="alname"><button class="almute" data-pid="${esc(pid)}" title="Mute">${m?'M':'♪'}</button><b>${esc(this.roleName(pid))}</b><span>${esc(p.name)}</span><i style="--l:${Math.round(100*(s.lvl.get(pid)??.8))}%"></i></div>
          <div class="alcells">${s.secs.map((_,k)=>`<button class="alcell${on.has(k)?' on':''}" data-pid="${esc(pid)}" data-k="${k}"></button>`).join('')}</div></div>`;}).join('')}<div class="alph"><i id="alHead"></i></div></div>`;},
  bindGrid(g){const s=G.gs;
    $$('.alcell',g).forEach(b=>b.onclick=()=>this.toggle(b.dataset.pid,+b.dataset.k));
    $$('.almute',g).forEach(b=>b.onclick=()=>{const id=b.dataset.pid;if(s.mute.has(id))s.mute.delete(id);else s.mute.add(id);this.reschedule(id);this.live();});
    $$('.alsec[data-k]',g).forEach(b=>{b.onclick=()=>this.setLoop(+b.dataset.k);
      b.ondblclick=()=>{const n=prompt('Name this section',s.secs[+b.dataset.k]);if(n&&n.trim()){s.secs[+b.dataset.k]=n.trim().slice(0,14);this.live();syncAll();}};});
    const add=$('#alAdd',g);if(add)add.onclick=()=>{if(s.secs.length>=12){toast('12 sections is the most');return;}s.secs.push(['Drop 3','Bridge','Hook','Breakdown','Finale'][Math.min(4,s.secs.length-7)]||'Extra');
      const k=s.secs.length-1,d=s.secs.indexOf('Drop');s.on.forEach((set,pid)=>{if(set.has(d))set.add(k);});this.live();syncAll();};},
  titles(){const s=G.gs;const L=[...s.titles.values()];return `<span class="lab">The title</span><button class="altitle" id="alTitle" title="Click to type a title">${esc(s.title)}</button>
      <div class="altchips">${L.map(t=>`<button class="${t===s.title?'on':''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')||'<span class="fine">Students can suggest titles. Click one to pick it.</span>'}</div>`;},
  bindTitles(t){const s=G.gs;$$('.altchips button',t).forEach(b=>b.onclick=()=>{s.title=b.dataset.t;this.live();syncAll();});
    const ti=$('#alTitle',t);if(ti)ti.onclick=()=>{const n=prompt('The song title',s.title);if(n&&n.trim()){s.title=n.trim().slice(0,40);this.live();syncAll();}};},
  render(st){const s=G.gs,o=s.o,nIn=s.parts.size;let body='',lbl='',dis=false;
    if(s.phase==='make'){lbl='Arrange the song';dis=!nIn;
      body=`<div class="almake"><div class="altop"><div><span class="lab">The Class Album · ${o.bars} bars each</span><h2>${o.bpm} BPM · ${esc(s.key)}</h2>
          <p>Everyone makes one part of the same song. Roles are on the cards; click a role to deal another.</p></div>${o.mins?clockHTML():''}</div>
        <ol class="cdsteps alsteps"><li><span>Set <b>${o.bpm} BPM</b> and build <b>your role</b> in <b>${esc(s.key)}</b>.</span></li><li><span>Make exactly <b>${o.bars} bars</b>, starting on bar 1.</span></li><li><span>Export <b>bars 1 to ${o.bars+1}</b> as <b>MP3</b> (fastest) or WAV and drop it onto <b>your Class Album box on gunnitynes.github.io/CADCAST/go</b>.</span></li></ol>
        <div class="alwall" id="alWall">${this.wall()}</div></div>`;}
    if(s.phase==='arrange'){lbl=s.rendering?'Making the album…':'Make the album';dis=!!s.rendering;const tot=this.secLen()*s.secs.length;
      body=`<div class="alarr"><div class="altop"><div><span class="lab">Arrange it · ${s.secs.length} sections · ${alFmt(tot)}</span><h2>Who plays where?</h2>
          <p>Students switch their own part on and off per section from their phones. Click a section to play from it, again to loop it. Double-click to rename it.</p></div>
          <div class="altitles" id="alTitles">${this.titles()}</div></div>
        <div class="algrid" id="alGrid">${this.grid()}</div>
        <div class="frow"><button class="big go" id="alPlay">${s.play?'■ Stop':'▶ Play the song'}</button></div></div>`;}
    if(s.phase==='album'){const O=s.out;lbl='Back to the menu';
      body=`<div class="alalbum"><div class="alcover"><div class="alvinyl"><i></i></div><div class="alsleeve"><span class="lab">The Class Album</span><h2>${esc(O.title)}</h2><p>${o.bpm} BPM · ${esc(s.key)} · ${alFmt(O.dur)}</p>
          <ol>${O.names.map(([n,r])=>`<li><b>${esc(n)}</b><span>${esc(r)}</span></li>`).join('')}</ol></div></div>
        <div class="aldl"><button class="big go" id="alPlayMix">▶ Play the album</button><a class="big" href="${O.mixURL}" download="${esc(alSafe(O.title))} - Mix.wav">⬇ The mix (WAV)</a><button class="big" id="alZip">⬇ Mix + all stems (.zip)</button>
<details><summary>Stems one by one</summary>${O.stems.map((x,i)=>`<a href="${O.stemURLs[i]}" download="${esc(x.name.split('/').pop())}">${esc(x.name.split('/').pop())}</a>`).join('')}</details></div></div>`;}
    st.innerHTML=`<div class="album ph-${s.phase}">${body}<div class="dfoot"><span class="fine" id="alCount">${nIn} of ${s.roles.size} parts in</span>${s.phase==='album'?againBtn():''}<button class="big go" id="bNext" ${dis?'disabled':''}>${esc(lbl)} <small>SPACE</small></button></div></div>`;
    $('#bNext').onclick=()=>this.next();bindAgain(st);this.bindWall(st);
    const g=$('#alGrid',st);if(g)this.bindGrid(g);const t=$('#alTitles',st);if(t)this.bindTitles(t);
    const pb=$('#alPlay',st);if(pb)pb.onclick=()=>{if(s.play)this.halt();else this.play(0);this.live();};
    const pm=$('#alPlayMix',st);if(pm)pm.onclick=async()=>{if(s.aud){stopAud();pm.textContent='▶ Play the album';return;}const b=s.out.dec||(s.out.dec=await audio().decodeAudioData(await s.out.mix.arrayBuffer()));setAud(playSample(b,AU.music,{gain:.95,maxDur:1200}));pm.textContent='■ Stop';};
    const z=$('#alZip',st);if(z)z.onclick=()=>this.zip();
    this._k=null;},
  // ---------- phones
  pstate(p){const s=G.gs,part=s.parts.get(p.id),on=s.on.get(p.id);
    return {k:'al'+s.phase+(s.roles.get(p.id)||'')+(part?part.at:'')+(on?[...on].join('.'):'')+s.secs.join('|')+(s.titles.get(p.id)||'')+s.title,ph:s.phase,bpm:s.o.bpm,key:s.key,bars:s.o.bars,
      role:s.roles.has(p.id)?this.roleName(p.id):'',tip:s.roles.has(p.id)?this.role(p.id).tip:'',part:part?{text:part.text,warn:part.warn}:null,pc:!!pcFor(p),
      secs:s.secs,on:on?[...on]:[],lvl:s.lvl.get(p.id)??.8,title:s.title,mine:s.titles.get(p.id)||'',clock:pClock()};},
  player(root,st){pClockStart(st.clock);
    if(st.ph==='make'){root.innerHTML=`<div class="pcol2">${pClockHTML(st.clock)}<span class="lab">Your role</span><h2 class="pbigt alprole">${esc(st.role||'…')}</h2><p>${esc(st.tip)}</p>
        <div class="alpfacts"><span><small>Tempo</small><b>${st.bpm}</b></span><span><small>Key</small><b>${esc(st.key)}</b></span><span><small>Bars</small><b>${st.bars}</b></span></div>
        <p class="cdyou ${st.part&&!st.part.warn?'ok':''}">${st.part?esc(st.part.text):st.pc?`When you’re done, export bars 1 to ${st.bars+1} as MP3 (fastest) or WAV and drop it on your computer’s CADCAST page (the Class Album box).`:'When you’re done, open gunnitynes.github.io/CADCAST/go on your computer, scan it, and drop your part there.'}</p></div>`;return;}
    if(st.ph==='arrange'){if(!st.part){root.innerHTML=`<div class="pcenter dots"><h2>Arranging</h2><p>Your part didn’t make it in. Help the class decide on the big screen, or suggest a title:</p>${this.ptitle(st)}</div>`;this.bindPTitle(root);return;}
      root.innerHTML=`<div class="pcol2 alphone"><span class="lab">Your part · ${esc(st.role)}</span><h2 class="pbigt">Where do you play?</h2>
        <div class="alpcells">${st.secs.map((n,k)=>`<button class="${st.on.includes(k)?'on':''}" data-k="${k}"><b>${esc(n)}</b><span>${st.on.includes(k)?'playing':'silent'}</span></button>`).join('')}</div>
        <label class="alplvl">Your level<input type="range" min="0" max="100" value="${Math.round(st.lvl*100)}" id="alLvl"></label>${this.ptitle(st)}</div>`;
      $$('.alpcells button',root).forEach(b=>b.onclick=()=>{b.classList.toggle('on');b.querySelector('span').textContent=b.classList.contains('on')?'playing':'silent';papi.send({t:'cell',k:+b.dataset.k});papi.vibe(15);});
      const l=$('#alLvl',root);let lt=0;l.oninput=()=>{clearTimeout(lt);lt=setTimeout(()=>papi.send({t:'lvl',v:l.value/100}),60);};this.bindPTitle(root);return;}
    root.innerHTML=`<div class="pcenter dots"><span class="lab">The Class Album</span><h2>${esc(st.title)}</h2><p>Listen on the big screen.</p></div>`;},
  ptitle(st){return `<form class="alptitle" id="alPT"><label>Suggest a title<input maxlength="40" placeholder="${esc(st.title)}" value="${esc(st.mine)}"></label><button class="ghost">${st.mine?'Change':'Suggest'}</button></form>`;},
  bindPTitle(root){const f=$('#alPT',root);if(f)f.onsubmit=e=>{e.preventDefault();const v=$('input',f).value.trim();if(v){papi.send({t:'title',v});papi.vibe(20);$('button',f).textContent='Sent ✓';}};},
});
