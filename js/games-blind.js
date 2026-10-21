/* =====================================================================
   BLIND ORCHESTRA — the class covers a famous song without knowing which one
   A random song from the teacher's MIDI library (js/midi-engine.js) is cut into its parts. Each CADCAST computer gets
   ONE part as a MIDI file (kind 'drop') plus the Class Album hand-in box ({t:'album'}, head 'Blind Orchestra'). Nobody is
   told the song. Students produce their part with their own sounds, export it and drop it back (kind 'part', fitted by
   alFit from games-album.js). Then every part plays together, the phones guess the song, and the reveal A/Bs the
   orchestra with the original MIDI.
   ===================================================================== */
const BO_TIPS={drums:'The beat. Make it yours: any kit, any sound, but keep the pattern.',bass:'The low end. Pick a bass sound you love and keep the notes.',
  chords:'The harmony. Choose the instrument and the feel: pads, keys, guitar, anything.',melody:'The tune everyone would hum. Make it sing with your own sound.',extra:'A supporting part. Give it a sound that sits around the others.'};

game({
  id:'blind',group:'make',name:'Blind Orchestra',tag:'Every computer gets one part of a famous song. Nobody knows which song until it all plays together.',
  how:['Your computer receives one part of a secret song as MIDI: the drums, the bass, the chords or the melody.','Produce it with your own sounds. Export it and drop it on your CADCAST page.','All the parts play together. Can you name the song your class just covered?'],
  badges:['CADCAST','MIDI library','Mystery'],kind:'free',
  icon:`<svg viewBox="0 0 64 64"><rect x="6" y="18" width="52" height="28" rx="14" fill="var(--ink)"/><circle cx="22" cy="32" r="8" fill="var(--paper)"/><circle cx="42" cy="32" r="8" fill="var(--paper)"/><path d="M30 32 h4" stroke="var(--paper)" stroke-width="3"/>${[0,1,2,3].map(i=>`<rect x="${10+i*12}" y="50" width="8" height="${[8,12,6,10][i]}" fill="var(${['--red','--blue','--yel','--green'][i]})" stroke="var(--ink)" stroke-width="2"/>`).join('')}<text x="32" y="13" text-anchor="middle" font-family="Archivo" font-weight="900" font-size="12" fill="var(--red)">???</text></svg>`,
  options:[
    {key:'bars',label:'Part length',choices:[[8,'8','bars'],[16,'16','bars']],def:8},
    {key:'bpm',label:'Tempo',choices:[['song','The song’s own','its original tempo'],[90,'90'],[100,'100'],[110,'110'],[120,'120']],def:'song'},
    {key:'mins',label:'Making time',choices:[[20,'20','min'],[30,'30','min'],[45,'45','min'],[0,'Open','no clock'],[-10,'10 s','test run']],def:30},
  ],
  note:'Needs the student computers on CADCAST (each gets its part as a MIDI file and hands back audio) and your MIDI library in this browser. Students without CADCAST: drag their file onto their card.',
  check(){return mdPool(['drums','bass','melody']).length>=3?'':'Load your MIDI folder first';},
  setupExtra(){return mdLibPanel();},setupBind(st,redraw){mdLibBind(st,redraw);},
  topInfo(){const s=G.gs;if(!s||!s.S)return this.tag;return `${s.bpm} BPM · ${s.S.key.name} · ${s.o.bars} bars`+({brief:' · the secret song',make:' · making',listen:' · listening',reveal:''})[s.phase];},
  async start(o){G.gs={o,phase:'brief',S:null,peek:false,id:Date.now()%1e9,roles:new Map(),takes:new Map(),prog:new Map(),fail:new Map(),guess:new Map(),opts:null,band:null,play:null};await this.newSong();},
  stop(){this.halt();stopClock();const s=G.gs;if(s&&s.phase==='make')online().forEach(p=>pcSend(p,{t:'album-end'}));},leave(){},
  async newSong(){const s=G.gs;s.S=null;render();const pool=mdPool(['drums','bass','melody']);
    for(let k=0;k<10&&!s.S;k++){const c=pick(pool);if(!c)break;try{const S=await mdSong(c);if(S.barBeats===4&&Object.keys(S.roles).length>=4)s.S=S;}catch(e){}}
    if(!s.S){toast('No usable song found in the library');return;}
    s.f=mdFeel(s.S);s.bpm=s.o.bpm==='song'?Math.round(s.S.bpm*s.f):s.o.bpm;s.start=mdWindow(s.S,Object.keys(s.S.roles),s.o.bars,s.f);this.dealRoles();render();syncAll();},
  partsOf(){return FK_ROLES.filter(r=>G.gs.S.roles[r]);},
  dealRoles(){const s=G.gs,R=this.partsOf();s.roles=new Map();shuffle(online()).forEach((p,k)=>s.roles.set(p.id,R[k%R.length]));},
  roleOf(pid){return G.gs.roles.get(pid);},
  clip(role){const s=G.gs;return mdClip(s.S,role,s.start,s.o.bars,0,s.f);},
  // hand out: the part as MIDI + the hand-in box on every computer
  handOut(p){const s=G.gs,role=this.roleOf(p.id);if(!role||!pcFor(p))return;const c=this.clip(role),name=`Blind Orchestra - ${MD_ROLE[role].l} - ${s.bpm} BPM.mid`;
    pcSendFile(p,{kind:'drop',round:s.id,name,label:`${MD_ROLE[role].l} · ${s.bpm} BPM · ${s.o.bars} bars`,head:'Blind Orchestra · your part',title:'Your part: '+MD_ROLE[role].l},new Blob([mdWrite([{role,prog:c.prog,notes:c.notes,label:MD_ROLE[role].l}],s.bpm,'Blind Orchestra')],{type:'audio/midi'}));
    pcSend(p,{t:'album',m:{round:s.id,at:Date.now(),head:'Blind Orchestra',title:'',role:MD_ROLE[role].l,tip:BO_TIPS[role]+' The song is a secret.',bpm:s.bpm,key:s.S.key.name,bars:s.o.bars,files:[],ends:s.clockEnd?Date.now()+clockLeft():0}});},
  go(ph){const s=G.gs;s.phase=ph;
    if(ph==='make'){if(s.o.mins)startClock(s.o.mins<0?-s.o.mins*1000:s.o.mins*60000,()=>{sfx.alarm();toast('Time! Export your part and drop it on CADCAST.');});online().forEach(p=>this.handOut(p));}
    if(ph==='listen'){stopClock();online().forEach(p=>pcSend(p,{t:'album-end'}));const all=[...new Set(mdLib().map(mdName))].filter(t=>t!==s.S.title);s.opts=shuffle([s.S.title,...shuffle(all).slice(0,3)]);s.guess=new Map();this.playOrch();}
    if(ph==='reveal'){try{sfx.fanfare();}catch(e){}}
    render();syncAll();},
  next(){const s=G.gs;if(!s.S)return;({brief:()=>this.go('make'),make:()=>this.go('listen'),listen:()=>this.go('reveal'),reveal:()=>exitGame(true)})[s.phase]();},
  onJoin(p){const s=G.gs;if(!s.S)return;if(!s.roles.has(p.id)){const R=this.partsOf(),cnt=R.map(r=>[...s.roles.values()].filter(x=>x===r).length);s.roles.set(p.id,R[cnt.indexOf(Math.min(...cnt))]);}if(s.phase==='make')this.handOut(p);render();sync(p);},
  onPair(p){if(G.gs.phase==='make')this.handOut(p);this.live();},
  onPcProg(p,f,meta){const s=G.gs;if(!meta||meta.kind!=='part'||meta.round!==s.id)return;s.prog.set(p.id,f);this.live();},
  onPcFile(p,meta,blob){const s=G.gs;if(meta.kind!=='part'||meta.round!==s.id)return;s.prog.delete(p.id);this.take(p,blob);},
  async take(p,blob){const s=G.gs;s.prog.set(p.id,-1);this.live();const f=await alFit(blob,s.bpm,s.o.bars);if(G.gs!==s)return;s.prog.delete(p.id);
    pcSend(p,{t:'album-got',ok:f.ok&&!f.warn,text:f.ok?(f.warn?f.text:f.text+'. It’s in the orchestra.'):f.text});
    if(!f.ok){s.fail.set(p.id,f.text);toast(`${p.name}: ${f.text}`);this.live();return;}s.fail.delete(p.id);s.takes.set(p.id,{buf:f.buf,text:f.text,warn:!!f.warn});try{sfx.inn();}catch(e){}this.live();sync(p);},
  // the orchestra: every handed-in part looping together; parts nobody handed in are played from the MIDI
  halt(){const s=G.gs;if(!s)return;if(s.play){s.play.forEach(x=>{try{x.stop();}catch(e){}});s.play=null;}if(s.band){s.band.stop();s.band=null;}const b=$('#boNow');if(b)b.textContent='';},
  playOrch(){const s=G.gs;this.halt();const ac=audio(),t=ac.currentTime+.2,have=new Set();s.play=[];
    s.takes.forEach((tk,pid)=>{const src=ac.createBufferSource();src.buffer=tk.buf;src.loop=true;const g=gn(ac,.8);src.connect(g).connect(AU.music);src.start(t);s.play.push(src);have.add(this.roleOf(pid));});
    const miss=this.partsOf().filter(r=>!have.has(r));if(miss.length){s.band=mdBand({bpm:s.bpm,bars:s.o.bars});s.band.t0=t;s.band.next=0;miss.forEach(r=>s.band.setNow(r,this.clip(r)));}
    s.now='orch';this.live();},
  playOrig(){const s=G.gs;this.halt();s.band=mdBand({bpm:s.bpm,bars:s.o.bars});this.partsOf().forEach(r=>s.band.setNow(r,this.clip(r)));s.now='orig';this.live();},
  act(p,d){const s=G.gs;if(d.t==='g'&&s.phase==='listen'){s.guess.set(p.id,+d.a);this.live();sync(p);}},
  async zip(){const s=G.gs,L=[...s.takes].map(([pid,tk])=>({pid,tk}));if(!L.length){toast('No parts handed in');return;}
    const N=L[0].tk.buf.length,mix=new AudioBuffer({numberOfChannels:2,length:N,sampleRate:AL_SR});let peak=0;
    for(let c=0;c<2;c++){const m=mix.getChannelData(c);L.forEach(({tk})=>{const d=tk.buf.getChannelData(c);for(let i=0;i<N;i++)m[i]+=d[i];});for(let i=0;i<N;i++)peak=Math.max(peak,Math.abs(m[i]));}
    const g=peak>0?.89/peak:1,t=alSafe('Blind Orchestra - '+s.S.title);
    const z=await alZip([{name:t+' - Mix.wav',blob:alWav(mix,g)},...L.map(({pid,tk},i)=>({name:`${t} - Parts/${pad2(i+1)} ${MD_ROLE[this.roleOf(pid)].l} - ${alSafe((G.players.get(pid)||{}).name||'')}.wav`,blob:alWav(tk.buf,g)})),{name:t+' - original parts.mid',blob:new Blob([mdWrite(this.partsOf().map(r=>{const c=this.clip(r);return {role:r,prog:c.prog,notes:c.notes,label:MD_ROLE[r].l};}),s.bpm,s.S.title)])}]);
    const a=document.createElement('a');a.href=URL.createObjectURL(z);a.download=t+'.zip';a.click();},
  live(){const s=G.gs;if(!s)return;const w=$('#boWall');if(w)w.innerHTML=this.wall();const n=$('#boGuessN');if(n)n.textContent=`${s.guess.size} of ${online().length} guessed`;
    $$('.boplay').forEach(b=>b.classList.toggle('on',s.now===b.dataset.p&&!!(s.play||s.band)));},
  wall(){const s=G.gs;return [...s.roles.keys()].filter(id=>G.players.has(id)).map(pid=>{const p=G.players.get(pid),r=this.roleOf(pid),R=MD_ROLE[r],tk=s.takes.get(pid),pr=s.prog.get(pid),bad=s.fail.get(pid);
      const st=tk?(tk.warn?'warn':'in'):pr!=null?'up':bad?'bad':s.phase==='brief'?'wait':pcFor(p)?'wait':'nopc';
      const lab={in:esc(tk&&tk.text||''),warn:esc(tk&&tk.text||''),up:pr<0?'checking…':`arriving ${Math.round(pr*100)}%`,bad:esc(bad||''),wait:s.phase==='brief'?'ready':'making…',nopc:'no CADCAST: drop their file here'}[st];
      return `<div class="alcard st-${st}" data-pid="${esc(pid)}" style="--c:var(${R.c})"><span class="alrole">${R.l}</span><b>${esc(p.name)}</b><span>${lab}</span>${tk?`<i class="alok">${tk.warn?'!':'✓'}</i>`:''}</div>`;}).join('')||'<p class="fine">Nobody has joined yet.</p>';},
  bindWall(st){const w=$('#boWall',st);if(!w)return;
    w.ondragover=e=>{const c=e.target.closest('.alcard');if(!c)return;e.preventDefault();c.classList.add('over');};w.ondragleave=e=>{const c=e.target.closest('.alcard');if(c)c.classList.remove('over');};
    w.ondrop=e=>{const c=e.target.closest('.alcard');if(!c)return;e.preventDefault();c.classList.remove('over');const p=G.players.get(c.dataset.pid),f=e.dataTransfer.files[0];if(p&&f)this.take(p,f);};},
  render(st){const s=G.gs,o=s.o;if(!s.S){st.innerHTML=`<div class="dbig"><span class="lab">Blind Orchestra</span><h2>Choosing a secret song…</h2></div>`;return;}
    const R=this.partsOf(),nIn=s.takes.size;let body='',lbl='';
    if(s.phase==='brief'||s.phase==='make'){lbl=s.phase==='brief'?'Hand out the parts':'Play the orchestra';
      body=`<div class="botop"><div><span class="lab">Blind Orchestra · ${s.bpm} BPM · ${esc(s.S.key.name)} · ${o.bars} bars</span><h2>${s.phase==='brief'?'A secret song':'Make your part'}</h2>
          <p>${s.phase==='brief'?`Cut into ${R.length} parts: ${R.map(r=>MD_ROLE[r].l.toLowerCase()).join(', ')}. Each computer gets one as MIDI. Nobody is told the song.`:'Produce your part with your own sounds. Export it and drop it on your CADCAST page.'}</p></div>
          <div class="bosecret"><span class="lab">The song (only you)</span><b>${s.peek?esc(s.S.title)+(s.S.artist?` · ${esc(s.S.artist)}`:''):'••••••••'}</b><div class="frow"><button class="ghost" id="boPeek">${s.peek?'Hide':'Peek'}</button>${s.phase==='brief'?'<button class="ghost" id="boNew">Another song</button><button class="ghost" id="boHear">▶ Hear it</button>':''}</div></div>${s.phase==='make'&&s.clockEnd?clockHTML():''}</div>
        <div class="alwall" id="boWall">${this.wall()}</div>`;}
    if(s.phase==='listen'){lbl='Reveal the song';
      body=`<div class="botop"><div><span class="lab">Blind Orchestra · ${nIn} of ${s.roles.size} parts handed in</span><h2>What did we just play?</h2><p>Every part together${nIn<R.length?' (parts nobody handed in play from the MIDI)':''}. Guess the song on your phone.</p></div>
        <div class="bobtns"><button class="big boplay on" data-p="orch" id="boOrch">▶ The orchestra</button><span class="fine" id="boGuessN">${s.guess.size} of ${online().length} guessed</span></div></div><div class="boeq">${R.map(r=>`<i style="--c:var(${MD_ROLE[r].c})"></i>`).join('')}</div>`;}
    if(s.phase==='reveal'){const right=[...s.guess.values()].filter(a=>s.opts[a]===s.S.title).length;lbl='Back to the menu';
      body=`<div class="boreveal"><span class="lab">You just covered</span><h1>${esc(s.S.title)}</h1>${s.S.artist?`<p class="boart">${esc(s.S.artist)}</p>`:''}<p>${right} of ${s.guess.size} guessed it.</p>
        <div class="frow"><button class="big boplay" data-p="orch" id="boOrch">▶ The orchestra</button><button class="big boplay" data-p="orig" id="boOrig">▶ The original (MIDI)</button><button class="ghost" id="boStop">■ Stop</button><button class="ghost" id="boZip">⬇ Mix + parts (.zip)</button></div></div>`;}
    st.innerHTML=`<div class="blindo ph-${s.phase}">${body}<div class="dfoot"><span class="fine">${nIn} of ${s.roles.size} parts in</span>${s.phase==='reveal'?againBtn():''}<button class="big go" id="bNext">${esc(lbl)} <small>SPACE</small></button></div></div>`;
    $('#bNext').onclick=()=>this.next();bindAgain(st);this.bindWall(st);
    const pk=$('#boPeek',st);if(pk)pk.onclick=()=>{s.peek=!s.peek;render();};const nw=$('#boNew',st);if(nw)nw.onclick=()=>{this.halt();this.newSong();};
    const hr=$('#boHear',st);if(hr)hr.onclick=()=>{if(s.band){this.halt();return;}this.playOrig();};
    const or=$('#boOrch',st);if(or)or.onclick=()=>this.playOrch();const og=$('#boOrig',st);if(og)og.onclick=()=>this.playOrig();const sp=$('#boStop',st);if(sp)sp.onclick=()=>this.halt();
    const z=$('#boZip',st);if(z)z.onclick=()=>this.zip();this.live();},
  frame(){clockFrame();},
  pstate(p){const s=G.gs,r=s.S&&this.roleOf(p.id),tk=s.takes.get(p.id);
    return {k:'bo'+s.phase+(r||'')+(tk?'t':'')+(s.guess.get(p.id)??''),ph:s.phase,role:r?MD_ROLE[r].l:'',c:r?MD_ROLE[r].c:'--ink',sh:r?MD_ROLE[r].sh:0,bpm:s.bpm,bars:s.o.bars,pc:!!pcFor(p),
      took:tk?tk.text:'',opts:s.phase==='listen'?s.opts:null,mine:s.guess.get(p.id),title:s.phase==='reveal'?s.S.title:'',ok:s.phase==='reveal'&&s.opts&&s.opts[s.guess.get(p.id)]===s.S.title,clock:pClock()};},
  player(root,st){pClockStart(st.clock);
    if(st.ph==='brief'||st.ph==='make'){root.innerHTML=`<div class="fkphone" style="--c:var(${st.c})">${pClockHTML(st.clock)}<span class="lab">Your part of a secret song</span><div class="fkpico">${shape(st.sh,90,'var(--ink)','var(--c)')}</div><h2>${esc(st.role||'…')}</h2>
        <p class="fkpst">${st.ph==='brief'?'Get your DAW ready: the MIDI lands on your computer in a moment.':st.took?esc(st.took):st.pc?`Your part is on your computer’s CADCAST page. Make it your own, then export ${st.bars} bars at ${st.bpm} BPM and drop it there.`:'Open gunnitynes.github.io/CADCAST/go on your computer and scan it: your part lands there.'}</p></div>`;return;}
    if(st.ph==='listen'){if(st.mine!=null){root.innerHTML=`<div class="pcenter dots"><h2>Guessed</h2><p>${esc(st.opts[st.mine])}. Wait for the reveal.</p></div>`;return;}
      root.innerHTML=`<div class="pcol2"><span class="lab">What did we just play?</span><h2 class="pbigt">Name the song</h2><div class="fkopts">${st.opts.map((t,i)=>`<button class="fkopt c${i}" data-a="${i}">${shape(i,26)}<b>${esc(t)}</b></button>`).join('')}</div></div>`;
      $$('.fkopt',root).forEach(b=>b.onclick=()=>{papi.send({t:'g',a:+b.dataset.a});papi.vibe(15);$$('.fkopt',root).forEach(x=>x.disabled=true);});return;}
    root.innerHTML=`<div class="pcenter dots"><span class="lab">You just covered</span><h2>${esc(st.title)}</h2><p>${st.mine==null?'You didn’t guess.':st.ok?'✓ You guessed it!':'Not this time.'}</p></div>`;},
});
