/* =====================================================================
   THE FRANKENHIT — a new hit stitched together from stolen parts
   Every phone owns a slot (drums · bass · chords · melody · extra) and spins it: the slot lands on that part of a random
   song from the teacher's MIDI library (js/midi-engine.js). Every part is re-timed to one tempo and transposed into one
   key (set by the first pitched part), so the monster grooves. Reroll or keep; the big screen loops it live and swaps
   parts on the bar. Then the room guesses where each part was stolen from, and the Frankenhit goes home as a MIDI file.
   ===================================================================== */
const FK_ROLES=['drums','bass','chords','melody','extra'];
const fkName=()=>pick(['The Frankenhit','Stitches','It’s Alive!','Spare Parts','Grave Robbers','Patchwork','Night Lab','Bolt Neck'])+' '+pick(['No. 1','(Club Mix)','Remix','Demo','Take 2','(Lab Version)','']);

game({
  id:'franken',group:'make',name:'The Frankenhit',tag:'Steal a drum beat here, a bassline there. The room stitches famous songs into one monster hit.',
  how:['Every phone owns one part of the band: drums, bass, chords or melody.','Spin it: your part lands on that part of a random famous song, moved into the room’s tempo and key. Reroll or keep it.','When the monster is alive, guess where each part was stolen from. Then everyone takes the MIDI home.'],
  badges:['MIDI library','Whole room','Live'],kind:'free',
  icon:`<svg viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" fill="var(--green)" stroke="var(--ink)" stroke-width="3"/><path d="M8 26 H56 M8 40 H56" stroke="var(--ink)" stroke-width="3"/>${[14,24,34,44].map((x,i)=>`<path d="M${x} 22 v8 M${x+4} 22 v8" stroke="var(--paper)" stroke-width="2.5"/>`).join('')}<path d="M16 40 l6 6 l6 -6 l6 6 l6 -6 l6 6" fill="none" stroke="var(--yel)" stroke-width="3"/><circle cx="22" cy="16" r="3" fill="var(--paper)"/><circle cx="42" cy="16" r="3" fill="var(--paper)"/></svg>`,
  options:[
    {key:'slots',label:'The band',choices:[[4,'4 parts','drums, bass, chords, melody'],[5,'5 parts','plus an extra part']],def:4},
    {key:'bars',label:'Loop',choices:[[4,'4','bars'],[8,'8','bars']],def:4},
    {key:'bpm',label:'Tempo',choices:[[85,'85'],[95,'95'],[105,'105'],[115,'115'],[124,'124']],def:105},
    {key:'rolls',label:'Rerolls',choices:[[3,'3','each'],[6,'6','each'],[0,'∞','unlimited']],def:6},
  ],
  note:'Uses your MIDI library (a folder of .mid files). It stays in this browser: nothing is uploaded. Students without a phone slot guess at the end.',
  check(){return mdPool(['drums']).length>=4?'':'Load your MIDI folder first';},
  setupExtra(){return mdLibPanel();},setupBind(st,redraw){mdLibBind(st,redraw);},
  topInfo(){const s=G.gs;if(!s)return this.tag;return `${s.o.bpm} BPM${s.key?' · '+MD_NOTE[s.key.root]+(s.key.mode==='minor'?' minor':' major'):''} · ${s.o.bars} bars`;},
  start(o){const roles=FK_ROLES.slice(0,o.slots);
    G.gs={o,phase:'build',key:null,title:fkName(),slots:roles.map(role=>({role,pid:null,song:null,clip:null,kept:false,rolls:o.rolls||Infinity,spin:false})),guess:new Map(),qs:null,band:null};
    this.deal();G.gs.band=mdBand({bpm:o.bpm,bars:o.bars});},
  stop(){const s=G.gs;if(s&&s.band)s.band.stop();},leave(){},
  deal(){const s=G.gs,ps=shuffle(online());s.slots.forEach((sl,i)=>{if(!sl.pid||!G.players.has(sl.pid))sl.pid=null;});
    ps.forEach(p=>{if(s.slots.some(sl=>sl.pid===p.id))return;const free=s.slots.find(sl=>!sl.pid);if(free)free.pid=p.id;});},
  onJoin(p){const s=G.gs;if(s.phase==='build'){this.deal();render();}sync(p);},
  // spin a slot: a random song that has this part (and, for pitched parts, the room's key mode), moved into key and tempo
  async spin(i){const s=G.gs,sl=s.slots[i];if(!sl||sl.kept||sl.spin||s.phase!=='build')return;if(sl.song&&sl.rolls<=0){toast('No rerolls left for '+sl.role);return;}
    sl.spin=true;this.live();syncAll();const used=new Set(s.slots.map(x=>x.song&&x.song.id).filter(Boolean)),pitched=sl.role!=='drums';
    let pool=mdPool([sl.role],pitched&&s.key?{mode:s.key.mode==='minor'?1:0}:{}).filter(c=>!used.has(c.id));if(pool.length<3)pool=mdPool([sl.role]).filter(c=>!used.has(c.id));
    let clip=null,S=null;for(let k=0;k<8&&!clip;k++){const c=pick(pool);if(!c)break;try{S=await mdSong(c);}catch(e){continue;}
      if(S.barBeats!==4||!S.roles[sl.role])continue;const f=mdFeel(S),start=mdWindow(S,[sl.role],s.o.bars,f);
      if(pitched&&!s.key)s.key={root:S.key.root,mode:S.key.mode};
      let sh=pitched?mdShift(S.key.root,s.key.root):0;clip=mdClip(S,sl.role,start,s.o.bars,sh,f);
      if(!clip||clip.notes.length<3){clip=null;continue;}
      // keep each part in its home register
      const med=clip.notes.map(x=>x.n).sort((a,b)=>a-b)[clip.notes.length>>1];
      if(sl.role==='bass'&&med>52)clip.notes.forEach(x=>x.n-=12);if(sl.role==='melody'&&med<60)clip.notes.forEach(x=>x.n+=12);}
    await new Promise(r=>setTimeout(r,900));if(G.gs!==s)return;sl.spin=false;
    if(!clip){toast('No '+sl.role+' found: try again');this.live();syncAll();return;}
    if(sl.song)sl.rolls--;sl.song={id:S.id,title:S.title,artist:S.artist};sl.clip=clip;s.band.set(sl.role,clip);try{sfx.card();}catch(e){}
    this.live();syncAll();},
  keep(i){const s=G.gs,sl=s.slots[i];if(!sl||!sl.song)return;sl.kept=!sl.kept;this.live();syncAll();},
  spinAll(){G.gs.slots.forEach((sl,i)=>{if(!sl.kept)this.spin(i);});},
  act(p,d){const s=G.gs,i=s.slots.findIndex(sl=>sl.pid===p.id);
    if(s.phase==='build'&&i>=0){if(d.t==='spin')this.spin(i);if(d.t==='keep')this.keep(i);}
    if(s.phase==='guess'&&d.t==='g'){const g=s.guess.get(p.id)||[];g[+d.k]=+d.a;s.guess.set(p.id,g);this.live();sync(p);}},
  // who stole what: four song titles per part, one of them right
  toGuess(){const s=G.gs,all=mdLib(),names=[...new Set(all.map(mdName))];
    s.qs=s.slots.filter(sl=>sl.song).map(sl=>{const wrong=shuffle(names.filter(n=>n!==sl.song.title)).slice(0,3),opts=shuffle([sl.song.title,...wrong]);return {role:sl.role,opts,c:opts.indexOf(sl.song.title)};});
    s.phase='guess';s.guess=new Map();render();syncAll();},
  reveal(){const s=G.gs;s.phase='reveal';try{sfx.fanfare();}catch(e){}render();syncAll();},
  next(){const s=G.gs;if(s.phase==='build'){if(!s.slots.some(sl=>sl.song)){this.spinAll();return;}this.toGuess();}else if(s.phase==='guess')this.reveal();else exitGame(true);},
  file(){const s=G.gs;return new Blob([mdWrite(s.slots.filter(sl=>sl.clip).map(sl=>({role:sl.role,prog:sl.clip.prog,notes:sl.clip.notes,label:MD_ROLE[sl.role].l})),s.o.bpm,s.title)],{type:'audio/midi'});},
  async sendAll(){const s=G.gs,blob=this.file(),name=alSafe(s.title)+'.mid';let n=0;for(const p of online().filter(p=>pcFor(p))){if(await pcSendFile(p,{kind:'drop',round:Date.now()%1e6,name,label:'The Frankenhit · '+s.o.bpm+' BPM'},blob))n++;}toast(n?`On ${n} computer${n===1?'':'s'}`:'No computers on CADCAST');},
  frame(){const s=G.gs;if(!s||!s.band)return;const w=$('#fkWrap');if(w)w.style.setProperty('--posn',s.band.pos().toFixed(4));},
  live(){const b=$('#fkSlots');if(b){b.innerHTML=this.slotsHTML();this.bindSlots(b);}const n=$('#fkGuessN');if(n)n.textContent=`${G.gs.guess.size} of ${online().length} guessed`;},
  slotsHTML(){const s=G.gs,rev=s.phase==='reveal';
    return s.slots.map((sl,i)=>{const R=MD_ROLE[sl.role],p=sl.pid&&G.players.get(sl.pid),q=s.qs&&s.qs.find(x=>x.role===sl.role);
      const right=q&&[...s.guess.values()].filter(g=>g[s.qs.indexOf(q)]===q.c).length;
      return `<div class="fkslot${sl.spin?' spin':''}${sl.kept?' kept':''}${sl.song?'':' empty'}" style="--c:var(${R.c})" data-i="${i}">
        <div class="fkhd">${shape(R.sh,30,'var(--ink)','var(--c)')}<b>${R.l}</b><span>${p?esc(p.name):'teacher'}</span></div>
        <div class="fkroll">${sl.spin?'<div class="fkreel"><i></i><i></i><i></i></div>':sl.clip?mdRoll(sl.clip,{w:260,h:90}):'<p>Not spun yet</p>'}<i class="fkph"></i></div>
        ${rev&&sl.song?`<div class="fksrc"><span class="lab">Stolen from</span><b>${esc(sl.song.title)}</b>${sl.song.artist?`<span>${esc(sl.song.artist)}</span>`:''}${q?`<em>${right} of ${s.guess.size} guessed it</em>`:''}</div>`
          :s.phase==='build'?`<div class="fkbtns"><button class="ghost fkspin" data-i="${i}" ${sl.kept||sl.spin?'disabled':''}>${sl.song?`Reroll${sl.rolls!==Infinity?` · ${sl.rolls}`:''}`:'Spin'}</button><button class="ghost fkkeep" data-i="${i}" ${sl.song?'':'disabled'}>${sl.kept?'Kept ✓':'Keep'}</button></div>`
          :`<div class="fksrc"><span class="lab">Stolen from</span><b>???</b></div>`}</div>`;}).join('');},
  bindSlots(b){$$('.fkspin',b).forEach(x=>x.onclick=()=>this.spin(+x.dataset.i));$$('.fkkeep',b).forEach(x=>x.onclick=()=>this.keep(+x.dataset.i));},
  render(st){const s=G.gs,o=s.o,lbl={build:s.slots.some(sl=>sl.song)?'Who stole what?':'Spin every part',guess:'Reveal the sources',reveal:'Back to the menu'}[s.phase];
    st.innerHTML=`<div class="franken ph-${s.phase}" id="fkWrap"><div class="fktop"><div><span class="lab">The Frankenhit · ${o.bpm} BPM${s.key?' · '+MD_NOTE[s.key.root]+(s.key.mode==='minor'?' minor':' major'):''}</span>
        <h2>${s.phase==='reveal'?esc(s.title):s.phase==='guess'?'Who stole what?':'It’s alive!'}</h2>
        <p>${s.phase==='build'?'Every part comes from a different famous song. Phones spin, reroll and keep. Changes land on the next loop.':s.phase==='guess'?'On your phones: where was each part stolen from?':'The monster, and its parents.'}</p></div>
        ${s.phase==='build'?`<button class="ghost" id="fkAll">Spin all the open slots</button>`:s.phase==='guess'?`<span class="fine" id="fkGuessN">${s.guess.size} of ${online().length} guessed</span>`:''}</div>
      <div class="fkslots n${s.slots.length}" id="fkSlots">${this.slotsHTML()}</div>
      <div class="dfoot">${s.phase==='reveal'?`<button class="ghost" id="fkDl">⬇ The Frankenhit (MIDI)</button><button class="ghost" id="fkSend">Send it to every computer</button>${againBtn()}`:'<span class="fine">The room’s tempo and key: every part is moved into them</span>'}<button class="big go" id="bNext">${esc(lbl)} <small>SPACE</small></button></div></div>`;
    $('#bNext').onclick=()=>this.next();bindAgain(st);this.bindSlots($('#fkSlots',st));
    const a=$('#fkAll',st);if(a)a.onclick=()=>this.spinAll();
    const dl=$('#fkDl',st);if(dl)dl.onclick=()=>{const u=URL.createObjectURL(this.file()),x=document.createElement('a');x.href=u;x.download=alSafe(s.title)+'.mid';x.click();};
    const sd=$('#fkSend',st);if(sd)sd.onclick=()=>this.sendAll();},
  pstate(p){const s=G.gs,i=s.slots.findIndex(sl=>sl.pid===p.id),sl=s.slots[i],g=s.guess.get(p.id)||[];
    const st={k:'fk'+s.phase+(sl?[sl.song&&sl.song.id,sl.kept,sl.spin,sl.rolls].join('|'):'')+g.join(','),ph:s.phase};
    if(s.phase==='build'){st.slot=sl?{role:sl.role,has:!!sl.song,kept:sl.kept,spin:sl.spin,rolls:sl.rolls===Infinity?-1:sl.rolls}:null;st.parts=s.slots.map(x=>({role:x.role,has:!!x.song,kept:x.kept}));}
    if(s.phase==='guess')st.qs=s.qs.map(q=>({role:q.role,opts:q.opts})),st.mine=g;
    if(s.phase==='reveal'){st.res=s.qs.map((q,k)=>({role:q.role,title:q.opts[q.c],ok:g[k]===q.c}));st.title=s.title;}
    return st;},
  player(root,st){
    if(st.ph==='build'){const sl=st.slot;if(!sl){root.innerHTML=`<div class="pcenter dots"><h2>The lab is busy</h2><p>Every part has a scientist. Watch the monster grow: at the end, everyone guesses where each part came from.</p></div>`;return;}
      const R=MD_ROLE[sl.role];root.innerHTML=`<div class="fkphone" style="--c:var(${R.c})"><span class="lab">Your part</span><div class="fkpico">${shape(R.sh,90,'var(--ink)','var(--c)')}</div><h2>${R.l}</h2>
        ${sl.spin?'<p class="fkpst">Spinning…</p>':sl.kept?'<p class="fkpst">Locked in ✓</p>':sl.has?`<p class="fkpst">Listen on the big screen. Keep it, or reroll${sl.rolls>=0?` (${sl.rolls} left)`:''}.</p>`:'<p class="fkpst">Spin to steal a part from a famous song.</p>'}
        <div class="fkpbtns"><button class="big go" id="fkS" ${sl.kept||sl.spin||(sl.has&&sl.rolls===0)?'disabled':''}>${sl.has?'Reroll':'Spin'}</button>${sl.has?`<button class="big" id="fkK">${sl.kept?'Unlock':'Keep it'}</button>`:''}</div></div>`;
      const sp=$('#fkS',root);if(sp)sp.onclick=()=>{papi.send({t:'spin'});papi.vibe(30);sp.disabled=true;};const kp=$('#fkK',root);if(kp)kp.onclick=()=>{papi.send({t:'keep'});papi.vibe(15);};return;}
    if(st.ph==='guess'){const k=st.qs.findIndex((_,i)=>st.mine[i]==null);if(k<0){root.innerHTML=`<div class="pcenter dots"><h2>All guessed</h2><p>Wait for the reveal on the big screen.</p></div>`;return;}
      const q=st.qs[k],R=MD_ROLE[q.role];root.innerHTML=`<div class="pcol2"><span class="lab">${k+1} of ${st.qs.length} · where is this from?</span><h2 class="pbigt" style="color:var(${R.c})">The ${R.l.toLowerCase()}</h2>
        <div class="fkopts">${q.opts.map((t,i)=>`<button class="fkopt c${i}" data-a="${i}">${shape(i,26)}<b>${esc(t)}</b></button>`).join('')}</div></div>`;
      $$('.fkopt',root).forEach(b=>b.onclick=()=>{papi.send({t:'g',k,a:+b.dataset.a});papi.vibe(15);$$('.fkopt',root).forEach(x=>x.disabled=true);});return;}
    const n=st.res.filter(x=>x.ok).length;
    root.innerHTML=`<div class="pcol2"><span class="lab">${esc(st.title)}</span><h2 class="pbigt">${n} of ${st.res.length} right</h2>${st.res.map(x=>`<div class="fkpres ${x.ok?'ok':''}"><b>${MD_ROLE[x.role].l}</b><span>${esc(x.title)}</span><i>${x.ok?'✓':'✗'}</i></div>`).join('')}</div>`;},
});
