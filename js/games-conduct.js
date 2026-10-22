/* =====================================================================
   THE CONDUCTOR — a laptop orchestra on CADCAST
   Every student builds a loop (at least 4 bars) at the room's tempo and key and streams it through CADCAST. The DAWs
   stay together with Ableton Link; the Mixer (CADCAST patch bay, open in this same browser) lines the streams up in a
   sync check (it listens to everyone's metronome), then one student at a time conducts: their phone brings each
   computer in or out of the mix on the next bar. The big screen draws the arrangement as a score; the Mixer records
   every piece. Control Room ↔ Mixer: BroadcastChannel 'cr-mixer' ({t:'hello?'|'sync'|'cond'|'gate'|'rec'} →
   {t:'mixer'|'syncing'|'synced'|'bar'|'gated'|'recdone'}).
   ===================================================================== */
const CD_KEYS=['C minor','D minor','E minor','F minor','G minor','A minor','C major','D major','F major','G major','A major','B♭ major'];
const cdCh=window.BroadcastChannel?new BroadcastChannel('cr-mixer'):null;
const cdTell=m=>{try{cdCh&&cdCh.postMessage(m);}catch(e){}};
// a computer (pc id) belongs to the student it was paired with
const cdPid=pc=>{const a=store.get('cadcast.allow',{})[pc];return a&&a.pid;};
const cdFmt=s=>`${Math.floor(s/60)}:${pad2(Math.round(s%60))}`;

game({
  id:'conductor',group:'make',name:'The Conductor',tag:'A laptop orchestra. Everyone plays a loop, one student conducts the whole room from their phone.',
  how:['Everyone builds a loop of at least 4 bars at the room’s tempo and key, with Ableton Link on, playing through CADCAST.','A quick sync check lines every computer up on the beat.','One at a time you conduct: your phone brings each player in or out on the next bar. Every piece is recorded.'],
  badges:['CADCAST','Ableton Link','Live'],kind:'free',
  icon:`<svg viewBox="0 0 64 64"><path d="M10 54 L46 12" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/><circle cx="48" cy="10" r="5" fill="var(--red)" stroke="var(--ink)" stroke-width="2.5"/>${[0,1,2,3].map(i=>`<rect x="${26+i*9}" y="${52-[10,18,6,14][i]}" width="7" height="${[10,18,6,14][i]}" fill="var(${['--blue','--yel','--green','--red'][i]})" stroke="var(--ink)" stroke-width="2"/>`).join('')}</svg>`,
  options:[
    {key:'bpm',label:'Tempo',choices:[[80,'80'],[90,'90'],[100,'100'],[110,'110'],[120,'120'],[128,'128']],def:100,help:'Everyone sets this tempo in their DAW (with Link on, one change reaches everyone).'},
    {key:'key',label:'Key',choices:[['random','Deal one','a random key'],['C minor','C minor'],['A minor','A minor'],['F major','F major']],def:'random'},
    {key:'mins',label:'Each piece',type:'step',min:1,max:6,step:1,def:2,unit:'min'},
  ],
  note:'Needs the Mixer open in this browser (the Mixer button, top right) and the student computers on CADCAST (gunnitynes.github.io/CADCAST/go). Ableton Live: switch LINK on (top left) so every computer shares tempo and bar.',
  topInfo(){const s=G.gs;if(!s)return this.tag;return ({brief:`${s.o.bpm} BPM · ${s.key}`,sync:'Sync check',conduct:`Piece ${s.pieces.length+1} · ${s.cond?s.cond.name:''} conducts`,between:'Listen back',party:'The concert'})[s.phase]||'';},
  start(o){const key=o.key==='random'?pick(CD_KEYS):o.key;G.gs={o,key,phase:'brief',strips:[],mixer:false,bar:-1,order:[],cond:null,inMix:new Set(),score:new Map(),pieces:[],synced:null,startBar:0};
    this.listen();cdTell({t:'hello?'});this.poll=setInterval(()=>{if(G.gs&&G.gs.o===o)cdTell({t:'hello?'});},2500);},
  stop(){const s=G.gs;clearInterval(this.poll);if(s){cdTell({t:'cond',on:false});cdTell({t:'rec',on:false});}if(cdCh)cdCh.onmessage=null;stopClock();},
  leave(){},
  listen(){if(!cdCh)return;cdCh.onmessage=e=>{const s=G.gs,m=e.data||{};if(!s||G.game!==this)return;
    if(m.t==='mixer'){const was=s.mixer;s.mixer=true;s.strips=m.strips||[];if(m.bar!=null)s.bar=m.bar;if(!was||s.phase!=='conduct')render();else this.live();syncAll();}
    if(m.t==='syncing'){s.syncEnd=Date.now()+m.secs*1000;render();}
    if(m.t==='synced'){s.synced=m;s.strips=m.strips||s.strips;sfx.fanfare();render();syncAll();}
    if(m.t==='bar'){s.bar=m.n;if(s.phase==='conduct'){this.extend();this.live();}}
    if(m.t==='gated'){const pid=cdPid(m.pc);if(pid){s.pending&&s.pending.delete(pid);const sc=s.score.get(pid)||[];if(m.on)sc.push([Math.max(m.bar,s.bar),null]);else{const o=sc.find(x=>x[1]==null);if(o)o[1]=Math.max(m.bar,o[0]+1);}s.score.set(pid,sc);this.live();syncAll();}}
    if(m.t==='recdone'&&s.waitRec&&(!m.id||m.id===s.waitRec.id)){const P=s.waitRec;s.waitRec=null;P.blob=m.blob;P.dur=m.dur;render();}};},
  // the players: students whose computer is streaming into the Mixer
  players(){const s=G.gs,seen=new Set();return s.strips.map(x=>({...x,pid:cdPid(x.pc)})).filter(x=>x.pid&&G.players.has(x.pid)&&!seen.has(x.pid)&&seen.add(x.pid)).map(x=>({...x,p:G.players.get(x.pid)}));},
  nextConductor(){const s=G.gs;online().forEach(p=>{if(!s.order.includes(p.id))s.order.push(p.id);});const L=s.order.filter(id=>{const p=G.players.get(id);return p&&p.conn&&p.conn.open;});
    if(!L.length)return null;const i=s.cond?L.indexOf(s.cond.id):-1;return G.players.get(L[(i+1)%L.length]);},
  go(ph){const s=G.gs;s.phase=ph;stopClock();
    if(ph==='sync'){s.synced=null;cdTell({t:'sync',bpm:s.o.bpm,secs:8});}
    if(ph==='conduct'){s.cond=this.nextConductor();s.inMix=new Set();s.pending=new Set();s.score=new Map();s.startBar=Math.max(0,s.bar);
      cdTell({t:'cond',on:true,bpm:s.o.bpm});const id=Date.now();s.piece={id,cond:s.cond?s.cond.name:'?',condId:s.cond&&s.cond.id,blob:null};cdTell({t:'rec',on:true,id});
      startClock(s.o.mins*60000,()=>{sfx.alarm();this.go('between');});}
    if(ph==='between'){const P=s.piece;P.score=new Map([...s.score].map(([k,v])=>[k,v.map(x=>[x[0]-s.startBar,(x[1]??s.bar+1)-s.startBar])]));P.bars=Math.max(1,s.bar+1-s.startBar);P.names=new Map(this.players().map(x=>[x.pid,x.p.name]));
      s.pieces.push(P);s.waitRec=P;cdTell({t:'rec',on:false,id:P.id});cdTell({t:'cond',on:false});}
    render();syncAll();},
  next(){const s=G.gs;({brief:()=>this.go(s.mixer?'sync':'brief'),sync:()=>this.go('conduct'),conduct:()=>this.go('between'),between:()=>this.go('conduct'),party:()=>exitGame(true)})[s.phase]();},
  act(p,d){const s=G.gs;if(s.phase!=='conduct'||d.t!=='gate'||!s.cond||p.id!==s.cond.id)return;const x=this.players().find(y=>y.pid===d.pid);if(!x)return;
    const on=!s.inMix.has(d.pid);if(on)s.inMix.add(d.pid);else s.inMix.delete(d.pid);s.pending.add(d.pid);cdTell({t:'gate',pc:x.pc,on});sfx.inn&&sfx.inn();sync(p);this.live();},
  extend(){},
  // the score: a row per player, a column per bar, filled where they played
  scoreHTML(score,names,bars,live){const s=G.gs,rows=[...names].map(([pid,name])=>[pid,name]);const N=Math.max(bars,8),W=Math.min(N,48),from=Math.max(0,N-W);
    return `<div class="cdscore" style="--w:${W}">${rows.map(([pid,name])=>{const p=G.players.get(pid),sc=score.get(pid)||[];
      return `<div class="cdrow c${p?p.sh:0}${live&&s.inMix.has(pid)?' on':''}${live&&s.pending&&s.pending.has(pid)?' wait':''}"><b>${esc(name)}</b><div class="cdbars">${[...Array(W)].map((_,k)=>{const b=from+k,f=sc.some(([a,z])=>b>=a&&b<(z==null?Infinity:z));return `<i class="${f?'f':''}${live&&b===bars-1?' now':''}"></i>`;}).join('')}</div></div>`;}).join('')||'<p class="fine">Nobody is streaming yet.</p>'}</div>`;},
  live(){const s=G.gs;if(s.phase!=='conduct')return;const box=$('#cdScore');if(!box)return;const names=new Map(this.players().map(x=>[x.pid,x.p.name]));
    const sc=new Map([...s.score].map(([k,v])=>[k,v.map(x=>[x[0]-s.startBar,x[1]==null?null:x[1]-s.startBar])]));box.innerHTML=this.scoreHTML(sc,names,Math.max(1,s.bar+1-s.startBar),true);
    const b=$('#cdBar');if(b)b.textContent=Math.max(1,s.bar+1-s.startBar);},
  frame(){clockFrame();},
  async playPiece(P){if(!P.blob)return;stopAud();try{const buf=P.buf||(P.buf=await P.blob.arrayBuffer().then(b=>new Promise((res,rej)=>audio().decodeAudioData(b,res,rej))));setAud(playSample(buf,AU.music,{gain:.95,maxDur:600}));}catch(e){toast('Could not play that piece');}},
  render(st){const s=G.gs,o=s.o,PL_=this.players(),nOn=online().length;
    const mixerNote=s.mixer?'':`<div class="cdwarn"><b>Open the Mixer</b><span>The Conductor plays through the Mixer in this browser.</span><button class="ghost" id="cdMix">Open the Mixer</button></div>`;
    const comps=`<div class="cdcomps">${s.strips.map(x=>{const pid=cdPid(x.pc),p=pid&&G.players.get(pid);return `<span class="${x.live?'live':''}">${esc(p?p.name:x.name)}<i>${x.live?'streaming':'connecting'}${x.sync?(x.sync.ok?` · +${x.sync.ms} ms`:' · no clicks'):''}</i></span>`;}).join('')||'<span class="fine">No computers streaming yet</span>'}</div>`;
    let body='',lbl='';
    if(s.phase==='brief'){lbl=s.mixer?'Sync check':'Waiting for the Mixer';
      body=`<div class="cdbrief"><div class="cdbig"><span class="lab">The Conductor · a laptop orchestra</span><h2>${o.bpm} BPM · ${esc(s.key)}</h2></div>
        <ol class="cdsteps"><li><b>Ableton Live:</b> switch <b>LINK</b> on (top left) and set the tempo to <b>${o.bpm}</b>.</li><li>Build a loop of <b>at least 4 bars</b> in <b>${esc(s.key)}</b>. Keep it looping.</li><li>Play it into CADCAST (gunnitynes.github.io/CADCAST/go, plugged in).</li><li>When everyone is ready: the sync check. Turn on Live’s <b>metronome</b> for it.</li></ol>${mixerNote}${comps}</div>`;}
    if(s.phase==='sync'){lbl='Start conducting';const left=s.syncEnd?Math.max(0,Math.ceil((s.syncEnd-Date.now())/1000)):0;
      body=`<div class="cdbrief"><div class="cdbig"><span class="lab">Sync check</span><h2>${s.synced?'Lined up':'Metronome on, everyone playing'}</h2><p>${s.synced?(s.synced.error?'The sync check failed: '+esc(s.synced.error):`Every stream is delayed to land on the same ${s.synced.bar?'bar':'beat'}. Turn the metronome off and keep your loop playing.`):`The Mixer listens to everyone’s click for 8 seconds${left?` (${left})`:''} and lines the streams up.`}</p></div>${comps}
        ${s.synced?'':`<button class="ghost" id="cdResync">Listen again</button>`}</div>`;}
    if(s.phase==='conduct'){lbl='End this piece';
      body=`<div class="cdlive"><div class="cdtop"><div><span class="lab">Piece ${s.pieces.length+1} · ${o.bpm} BPM · ${esc(s.key)}</span><h2><span class="cdcond">${esc(s.cond?s.cond.name:'—')}</span> conducts</h2></div><div class="cdclock"><span class="lab">bar</span><b id="cdBar">1</b>${clockHTML()}</div></div>
        <div id="cdScore">${this.scoreHTML(new Map(),new Map(PL_.map(x=>[x.pid,x.p.name])),1,true)}</div><p class="fine">Changes land on the next bar. Everyone else: keep your loop playing.</p></div>`;}
    if(s.phase==='between'){const P=s.pieces[s.pieces.length-1];lbl='Next conductor';
      body=`<div class="cdlive"><div class="cdtop"><div><span class="lab">Piece ${s.pieces.length} · conducted by</span><h2><span class="cdcond">${esc(P.cond)}</span></h2></div><div class="cdclock"><span class="lab">bars</span><b>${P.bars}</b></div></div>
        ${this.scoreHTML(P.score,P.names,P.bars,false)}<div class="frow"><button class="big go" id="cdPlay" ${P.blob?'':'disabled'}>${P.blob?`▶ Listen back · ${cdFmt(P.dur)}`:'Saving the recording…'}</button><button class="ghost" id="cdParty">The concert: all pieces</button></div></div>`;}
    if(s.phase==='party'){lbl='Back to the menu';
      body=`<div class="cdlive"><div class="cdbig"><span class="lab">The concert</span><h2>${s.pieces.length} piece${s.pieces.length===1?'':'s'}</h2></div><div class="cdpieces">${s.pieces.map((P,i)=>`<div class="cdpiece"><button class="rbplay" data-i="${i}" ${P.blob?'':'disabled'}>▶</button><b>Piece ${i+1}</b><span>conducted by ${esc(P.cond)} · ${P.bars} bars${P.dur?' · '+cdFmt(P.dur):''}</span>${P.blob?`<a class="ghost" download="Piece ${i+1} - ${esc(P.cond)}.webm" href="${URL.createObjectURL(P.blob)}">⬇</a>`:''}</div>`).join('')}</div></div>`;}
    st.innerHTML=`<div class="conductor ph-${s.phase}">${body}<div class="dfoot"><span class="fine">${PL_.length} streaming · ${nOn} student${nOn===1?'':'s'}</span>${s.phase==='party'?againBtn():''}<button class="big go" id="bNext" ${s.phase==='brief'&&!s.mixer?'disabled':''}>${esc(lbl)} <small>SPACE</small></button></div></div>`;
    $('#bNext').onclick=()=>this.next();bindAgain(st);
    const om=$('#cdMix',st);if(om)om.onclick=()=>{if(typeof openMixer==='function')openMixer();};
    const rs=$('#cdResync',st);if(rs)rs.onclick=()=>{s.synced=null;cdTell({t:'sync',bpm:o.bpm,secs:8});};
    const pl=$('#cdPlay',st);if(pl)pl.onclick=()=>this.playPiece(s.pieces[s.pieces.length-1]);
    const pa=$('#cdParty',st);if(pa)pa.onclick=()=>{stopAud();s.phase='party';render();syncAll();};
    $$('.cdpiece .rbplay',st).forEach(b=>b.onclick=()=>this.playPiece(s.pieces[+b.dataset.i]));
    if(s.phase==='conduct')this.live();},
  pstate(p){const s=G.gs,conducting=s.phase==='conduct'&&s.cond&&s.cond.id===p.id,pl=this.players();
    return {k:s.phase+(s.cond?s.cond.id:'')+(conducting?[...s.inMix].join('.')+[...(s.pending||[])].join(','):(s.inMix.has(p.id)?'in':'out')),ph:s.phase,bpm:s.o.bpm,key:s.key,cond:s.cond?s.cond.name:'',conducting,
      in:s.inMix.has(p.id),streaming:pl.some(x=>x.pid===p.id),tiles:conducting?pl.map(x=>({pid:x.pid,name:x.p.name,sh:x.p.sh,in:s.inMix.has(x.pid),wait:!!(s.pending&&s.pending.has(x.pid))})):[],clock:pClock()};},
  player(root,st){pClockStart(st.clock);
    if(st.ph==='brief'||st.ph==='sync'){root.innerHTML=`<div class="pcol2"><h2 class="pbigt">${st.bpm} BPM · ${esc(st.key)}</h2><p>Ableton Live: <b>LINK</b> on, tempo <b>${st.bpm}</b>. Build a loop of <b>at least 4 bars</b> in ${esc(st.key)} and keep it playing into CADCAST.</p>
      ${st.ph==='sync'?'<div class="rbbig on"><i></i>Metronome on</div><p>The Mixer is listening to your click. Turn it off when the big screen says lined up.</p>':''}<p class="cdyou ${st.streaming?'ok':''}">${st.streaming?'✓ Your computer is streaming':'Your computer isn’t streaming yet: open gunnitynes.github.io/CADCAST/go and plug in.'}</p></div>`;return;}
    if(st.ph==='conduct'&&st.conducting){root.innerHTML=`<div class="cdphone">${pClockHTML(st.clock)}<div class="rxban mine"><b>You conduct</b><span>tap a player: in or out on the next bar</span></div>
      <div class="cdtiles">${st.tiles.map(t=>`<button class="cdtile c${t.sh}${t.in?' in':''}${t.wait?' wait':''}" data-pid="${esc(t.pid)}"><b>${esc(t.name)}</b><span>${t.wait?(t.in?'coming in…':'going out…'):t.in?'playing':'silent'}</span></button>`).join('')||'<p>Nobody is streaming yet.</p>'}</div></div>`;
      $$('.cdtile',root).forEach(b=>b.onclick=()=>{papi.send({t:'gate',pid:b.dataset.pid});papi.vibe(20);b.classList.add('wait');});return;}
    if(st.ph==='conduct'){root.innerHTML=`<div class="pcenter dots"><span class="lab">${esc(st.cond)} conducts</span><div class="cdstate ${st.in?'in':''}">${st.in?'You’re in':'Not yet'}</div><p>${st.streaming?'Keep your loop playing. The conductor brings you in and out.':'Your computer isn’t streaming, so you can’t be brought in.'}</p></div>`;return;}
    root.innerHTML=`<div class="pcenter dots"><h2>${st.ph==='party'?'The concert':'Listen back'}</h2><p>Look at the big screen.</p></div>`;},
});
