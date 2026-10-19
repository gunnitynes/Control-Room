/* =====================================================================
   LIVE REMIX — a song the teacher loads, remixed by the whole room at once
   The engine (js/remix-engine.js) analyses the song (tempo, beat grid, bars, key, energy) and plays it beat by beat
   through an FX rack. Every phone holds 4 moves; a move fires on the next beat (or bar), then that button rotates
   to a new move after a cooldown. Songs: the teacher's own (clipDB dec -5) or the Sample Chronologist music folder.
   Nothing is uploaded. Analyses are kept in this browser (localStorage rx.an) so a song loads instantly next time.
   ===================================================================== */
const rxSongs=()=>{const L=typeof MYCLIPS==='undefined'?[]:MYCLIPS.list;return [...L.filter(c=>c.dec===-5),...L.filter(c=>c.dec>=1900).sort((a,b)=>a.name.localeCompare(b.name))];};
const rxTitle=c=>String(c.name).replace(/\.[a-z0-9]+$/i,'');
const rxPick=()=>{const S=rxSongs(),id=store.get('rx.song','');return S.find(c=>c.id===id)||S[0]||null;};
const rxFx=id=>RX_FX.find(f=>f.id===id);
const RX_CATS={time:'Time',tone:'Tone',space:'Space',layer:'Layers'};

game({
  id:'remix',group:'make',name:'Live Remix',tag:'One song, the whole room at the controls. Every phone fires stutters, tape stops, filters and 808s.',
  how:['The song is analysed: tempo, beat grid, bars and key.','Every phone holds four moves. Take turns round the room: on your turn, tap one and it lands on the next beat.','A move you use is replaced by a new one. Or switch to everyone at once for chaos.'],
  badges:['Live','No score','Remix'],kind:'free',
  icon:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="var(--ink)"/><circle cx="32" cy="32" r="17" fill="none" stroke="var(--paper)" stroke-width="1.5" opacity=".5"/><path d="M32 32 L52 14" stroke="var(--red)" stroke-width="5"/><circle cx="32" cy="32" r="6" fill="var(--yel)" stroke="var(--paper)" stroke-width="2"/>${[0,1,2,3].map(i=>`<rect x="${4+i*15}" y="56" width="11" height="6" fill="var(${['--red','--blue','--yel','--green'][i]})"/>`).join('')}</svg>`,
  options:[
    {key:'cats',type:'multi',label:'Moves',choices:Object.entries(RX_CATS).map(([k,l])=>[k,l,RX_FX.filter(f=>f.cat===k).map(f=>f.name.toLowerCase()).slice(0,4).join(', ')+'…']),def:Object.keys(RX_CATS),sub:v=>`${v.cats.length} of 4`},
    {key:'play',label:'Play',choices:[['turns','Take turns','one remixer at a time, round the room'],['free','Everyone at once','with a cooldown per button']],def:'turns'},
    {key:'turn',label:'Turn time',choices:[[5,'5','seconds'],[8,'8','seconds'],[12,'12','seconds']],def:8,show:v=>v.play!=='free',help:'A turn ends when the move is fired, or when the time runs out.'},
    {key:'cool',label:'Button cooldown',choices:[[4,'4','seconds'],[7,'7','seconds'],[12,'12','seconds']],def:7,show:v=>v.play==='free',help:'After a move fires, that button turns into a new move once the cooldown is over.'},
    {key:'from',label:'Start',choices:[['top','From the top','bar 1'],['peak','The big part','where the song is loudest']],def:'top'},
  ],
  note:'Songs stay in this browser and are never uploaded. Pick any song from the Sample Chronologist music folder, or load your own. Steady-tempo songs (dance, hip hop, pop) lock tightest.',
  check(v){return rxPick()?'':'Load a song first';},
  setupExtra(){const S=rxSongs(),cur=rxPick(),own=S.filter(c=>c.dec===-5),chr=S.filter(c=>c.dec>=1900),an=store.get('rx.an',{});
    const opt=c=>`<option value="${esc(c.id)}" ${cur&&c.id===cur.id?'selected':''}>${esc(rxTitle(c))}${an[c.id]?` · ${an[c.id].bpm} BPM`:''}</option>`;
    return `<div class="fsec rxsongs"><h3><b>♫</b>The song<small>stays in this browser, never uploaded</small></h3>
      <div class="rxpick">${S.length?`<select id="rxSel">${own.length?`<optgroup label="Your songs">${own.map(opt).join('')}</optgroup>`:''}${chr.length?`<optgroup label="Sample Chronologist music">${chr.map(opt).join('')}</optgroup>`:''}</select>`:'<p class="fine">No songs yet.</p>'}
        <label class="ghost">+ Load a song<input type="file" id="rxFile" accept="audio/*" multiple hidden></label></div>
      ${cur&&an[cur.id]?`<p class="rxmeta">${an[cur.id].bpm} BPM · ${esc(an[cur.id].key)} · ${an[cur.id].bars} bars · analysed</p>`:cur?'<p class="fine">Analysed when the game starts (a few seconds).</p>':''}</div>`;},
  setupBind(st,redraw){const sel=$('#rxSel',st);if(sel)sel.onchange=()=>{store.set('rx.song',sel.value);redraw();};
    const fi=$('#rxFile',st);if(fi)fi.onchange=async()=>{let last=null;for(const f of fi.files){if(f.size>60e6){toast(f.name+' is over 60 MB');continue;}last='rx:'+f.name;await clipDB.put({id:last,dec:-5,name:f.name,blob:f,at:Date.now()});}
      await loadMyClips();if(last)store.set('rx.song',last);redraw();};},
  topInfo(){const s=G.gs;if(!s)return this.tag;return s.phase==='live'?`${s.A.bpm} BPM · ${s.A.key.name} · live`:({load:'Analysing the song',ready:'Ready to drop',end:'The remix in numbers'})[s.phase]||'';},
  start(o){const c=rxPick();G.gs={o,clip:c,title:rxTitle(c),phase:'load',prog:0,slots:new Map(),feed:[],active:new Map(),count:new Map(),by:new Map(),P:null,order:[],turn:null};
    this.load().catch(e=>{console.error(e);toast('Could not load the song: '+e.message);});},
  async load(){const s=G.gs,ac=audio(),bar=()=>{const p=$('#rxLoad');if(p)p.style.width=Math.round(s.prog*100)+'%';const t=$('#rxStep');if(t)t.textContent=s.step||'';};
    s.step='Decoding';bar();const buf=await new Promise((res,rej)=>s.clip.blob.arrayBuffer().then(b=>ac.decodeAudioData(b,res,rej)));if(G.gs!==s)return;s.buf=buf;
    s.step='Finding the beat';const A=await rxAnalyse(buf,f=>{s.prog=f;bar();});if(G.gs!==s)return;s.A=A;
    const an=store.get('rx.an',{});an[s.clip.id]={bpm:A.bpm,key:A.key.name,bars:A.bars.length};const ks=Object.keys(an);if(ks.length>40)delete an[ks[0]];store.set('rx.an',an);
    // the big part: the loudest 8-bar stretch
    let bi=0,bv=-1;for(let i=0;i+8<=A.energy.length;i++){const v=A.energy.slice(i,i+8).reduce((x,y)=>x+y,0);if(v>bv){bv=v;bi=i;}}s.startBar=s.o.from==='peak'?bi:0;
    s.phase='ready';render();syncAll();},
  pool(){const s=G.gs;return RX_FX.filter(f=>s.o.cats.includes(f.cat));},
  // four moves per phone, all different, spread over the categories
  deal(p){const s=G.gs,pool=this.pool(),have=new Set((s.slots.get(p.id)||[]).map(x=>x.id)),out=[];
    for(let k=0;k<4;k++){const cats=[...new Set(pool.map(f=>f.cat))],cat=cats[k%cats.length],L=pool.filter(f=>f.cat===cat&&!have.has(f.id)&&!out.some(o=>o.id===f.id)),A=L.length?L:pool.filter(f=>!out.some(o=>o.id===f.id));
      out.push({id:pick(A).id,until:0});}
    s.slots.set(p.id,out);},
  newMove(p,k){const s=G.gs,sl=s.slots.get(p.id),pool=this.pool().filter(f=>!sl.some(x=>x.id===f.id));sl[k]={id:pick(pool.length?pool:this.pool()).id,until:s.o.play==='free'?Date.now()+s.o.cool*1000:0};},
  // turns: one remixer at a time, round the room in a fixed order; a turn ends on a move or when its time is up
  turnOrder(){const s=G.gs;online().forEach(p=>{if(!s.order.includes(p.id))s.order.push(p.id);});return s.order.filter(id=>{const p=G.players.get(id);return p&&p.conn&&p.conn.open;});},
  nextTurn(){const s=G.gs;clearTimeout(s.turnT);if(s.phase!=='live'||s.o.play==='free')return;const L=this.turnOrder();if(!L.length){s.turn=null;return;}
    const i=s.turn?L.indexOf(s.turn.pid):-1,pid=L[(i+1)%L.length];s.turn={pid,end:Date.now()+s.o.turn*1000,n:(s.turn?s.turn.n:0)+1};
    s.turnT=setTimeout(()=>{if(G.gs===s)this.nextTurn();},s.o.turn*1000);s.dirty=true;sfx.tick&&sfx.tick();syncAll();},
  upIn(pid){const s=G.gs,L=this.turnOrder();if(!s.turn)return -1;const a=L.indexOf(s.turn.pid),b=L.indexOf(pid);return a<0||b<0?-1:(b-a+L.length)%L.length;},
  onJoin(p){const s=G.gs;if(s&&s.phase==='live'&&!s.slots.has(p.id)){this.deal(p);if(!s.turn)this.nextTurn();sync(p);}},
  go(ph){const s=G.gs;s.phase=ph;
    if(ph==='live'){s.t0=Date.now();online().forEach(p=>this.deal(p));
      s.P=rxPlayer(s.buf,s.A,{startBar:s.startBar});
      s.P.onFx=(f,what)=>{const fx=rxFx(f.id)||f;if(what==='start'){s.active.set(f.id,{...fx,who:f.who});if(fx.kind!=='beat'){s.feed.unshift({...fx,who:f.who,at:Date.now()});s.feed.length=Math.min(s.feed.length,7);}}
        else s.active.delete(f.id);s.dirty=true;};
      this.nextTurn();}
    if(ph==='end'){clearTimeout(s.turnT);s.turn=null;if(s.P){rxStop(s.P);s.P=null;}}
    render();syncAll();},
  next(){const s=G.gs;({load:()=>{},ready:()=>this.go('live'),live:()=>this.go('end'),end:()=>exitGame(true)})[s.phase]();},
  stop(){const s=G.gs;if(s){clearTimeout(s.turnT);if(s.P){rxStop(s.P);s.P=null;}}},
  act(p,d){const s=G.gs;if(s.phase!=='live'||d.t!=='fx'||!s.P)return;const turns=s.o.play!=='free';if(turns&&(!s.turn||s.turn.pid!==p.id))return;
    const sl=s.slots.get(p.id);if(!sl)return;const k=+d.k,m=sl[k];if(!m||Date.now()<m.until)return;
    const fx=rxFx(m.id);if(!fx)return;
    if(!rxFire(s.P,fx,p.name)){s.busy=Date.now();toast('Too many moves queued');return;}
    s.count.set(fx.id,(s.count.get(fx.id)||0)+1);s.by.set(p.id,(s.by.get(p.id)||0)+1);if(fx.kind==='beat'){s.feed.unshift({...fx,who:p.name,at:Date.now(),queued:true});s.feed.length=Math.min(s.feed.length,7);s.dirty=true;}
    this.newMove(p,k);sync(p);if(turns)this.nextTurn();},
  // the deck: bar counter, beat lights, the song's energy map with the playhead, live spectrum, moves in play
  frame(){const s=G.gs;if(!s||s.phase!=='live'||!s.P)return;const P=s.P,A=s.A,ac=P.ac;
    const sb=Math.max(0,P.sb-1),bar=Math.max(0,Math.floor((sb-A.beats.indexOf(A.bars[0]))/4)),beat=((sb-A.beats.indexOf(A.bars[0]))%4+4)%4;
    const bc=$('#rxBar');if(bc)bc.textContent=bar+1;const tbar=$('#rxTbar');if(tbar&&s.turn)tbar.style.width=Math.max(0,Math.min(100,100*(s.turn.end-Date.now())/(s.o.turn*1000)))+'%';$$('.rxbeat i').forEach((e,i)=>e.classList.toggle('on',i===beat));
    $$('.rxmap i').forEach((e,i)=>e.classList.toggle('on',i===bar));
    const cv=$('#rxSpec');if(cv){const x=cv.getContext('2d'),W=cv.width=cv.clientWidth*devicePixelRatio,H=cv.height=cv.clientHeight*devicePixelRatio,d=new Uint8Array(P.an.frequencyBinCount);P.an.getByteFrequencyData(d);
      const n=48,cols=['--red','--blue','--yel','--green'].map(css),ink=css('--ink');x.clearRect(0,0,W,H);
      for(let i=0;i<n;i++){const a=Math.floor(Math.pow(i/n,2)*d.length*.7),b=Math.max(a+1,Math.floor(Math.pow((i+1)/n,2)*d.length*.7));let m=0;for(let j=a;j<b;j++)m=Math.max(m,d[j]);
        const h=(m/255)*H*.95,w=W/n;x.fillStyle=cols[Math.floor(i/n*4)];x.fillRect(i*w+2,H-h,w-4,h);x.strokeStyle=ink;x.lineWidth=2;x.strokeRect(i*w+2,H-h,w-4,h);}}
    if(s.dirty){s.dirty=false;const box=$('#rxActive');if(box){const L=[...s.active.values()];box.innerHTML=L.length?L.map(f=>`<div class="rxtile${f.cat==='space'?' dark':''}" style="--c:var(${RX_CAT[f.cat]||'--ink'})"><b>${esc(f.name)}</b><span>${esc(f.who||'')}</span></div>`).join(''):'<p class="fine">Tap a move on your phone.</p>';}
      const tb=$('#rxTurn');if(tb){const t=s.turn,p=t&&G.players.get(t.pid),L=this.turnOrder(),i=t?L.indexOf(t.pid):-1,nx=[1,2,3].map(k=>L.length>k?G.players.get(L[(i+k)%L.length]):null).filter(Boolean);
        tb.innerHTML=p?`<span class="lab">Turn ${t.n}</span><b class="c${p.sh}">${esc(p.name)}</b><div class="rxtbar"><i id="rxTbar"></i></div>${nx.length?`<span class="rxnext">next: ${nx.map(x=>esc(x.name)).join(' · ')}</span>`:''}`:'<span class="lab">Waiting for phones</span>';}
      const fd=$('#rxFeed');if(fd)fd.innerHTML=s.feed.map(f=>`<li style="--c:var(${RX_CAT[f.cat]})"><b>${esc(f.who||'')}</b><span>${esc(f.name)}</span></li>`).join('');}},
  render(st){const s=G.gs,A=s.A;
    if(s.phase==='load'){st.innerHTML=`<div class="dbig"><span class="lab">Live Remix · ${esc(s.title)}</span><h2>Listening to the song</h2><div class="mxbar"><i id="rxLoad" style="width:${Math.round(s.prog*100)}%"></i></div><p id="rxStep">${esc(s.step||'')}</p></div>`;return;}
    const map=`<div class="rxmap">${A.bars.map((_,i)=>`<i style="--h:${Math.round(8+A.energy[i]*92)}%" class="${i===s.startBar&&s.phase==='ready'?'start':''}"></i>`).join('')}</div>`;
    const stats=`<div class="rxstats"><div><b>${A.bpm}</b><span>BPM</span></div><div><b>${esc(A.key.name)}</b><span>key</span></div><div><b>${A.bars.length}</b><span>bars</span></div><div><b>${Math.floor(A.dur/60)}:${pad2(Math.round(A.dur%60))}</b><span>long</span></div></div>`;
    if(s.phase==='ready'){st.innerHTML=`<div class="remix ph-ready"><div class="rxhead"><span class="lab">Live Remix · analysed</span><h2>${esc(s.title)}</h2>${stats}</div>${map}
      <p class="rxnote">The beat grid, the bars and the key are ready: every move lands on the beat, and the 808, sub and pad play in ${esc(A.key.name)}. ${online().length} phone${online().length===1?'':'s'} in the room.</p>
      <div class="dfoot"><span></span><button class="big go" id="bNext">Drop the needle <small>SPACE</small></button></div></div>`;$('#bNext').onclick=()=>this.next();return;}
    if(s.phase==='end'){const top=[...s.count].sort((a,b)=>b[1]-a[1]).slice(0,5),crew=[...s.by].sort((a,b)=>b[1]-a[1]).slice(0,5),mins=Math.max(1,Math.round((Date.now()-s.t0)/60000));
      st.innerHTML=`<div class="remix ph-end"><div class="rxhead"><span class="lab">Live Remix · ${esc(s.title)}</span><h2>The remix in numbers</h2></div>
        <div class="rxend"><div><h3>Most played moves</h3>${top.map(([id,n])=>{const f=rxFx(id);return `<p style="--c:var(${RX_CAT[f.cat]})"><b>${esc(f.name)}</b><span>×${n}</span></p>`;}).join('')||'<p>No moves this time.</p>'}</div>
          <div><h3>The remixers</h3>${crew.map(([id,n])=>`<p><b>${esc((G.players.get(id)||{}).name||'?')}</b><span>${n} moves</span></p>`).join('')||'<p>—</p>'}</div>
          <div><h3>In total</h3><p><b>${[...s.count.values()].reduce((a,b)=>a+b,0)}</b><span>moves in ${mins} min</span></p></div></div>
        <div class="dfoot"><span></span>${againBtn()}<button class="big go" id="bNext">Back to the menu <small>SPACE</small></button></div></div>`;$('#bNext').onclick=()=>this.next();bindAgain(st);return;}
    st.innerHTML=`<div class="remix ph-live"><div class="rxtop"><div class="rxhead"><span class="lab">Live Remix · ${esc(s.title)}</span>${stats}</div>
        <div class="rxclock"><span class="lab">bar</span><b id="rxBar">1</b><div class="rxbeat"><i></i><i></i><i></i><i></i></div></div></div>${map}
      <div class="rxmid"><canvas id="rxSpec"></canvas><div class="rxside">${s.o.play!=='free'?'<div id="rxTurn" class="rxturn"></div>':''}<span class="lab">In play</span><div id="rxActive" class="rxactive"></div><span class="lab">Last moves</span><ol id="rxFeed" class="rxfeed"></ol></div></div>
      <div class="dfoot"><span class="fine">${online().length} remixers · moves land on the beat</span><button class="big go" id="bNext">Stop the remix <small>SPACE</small></button></div></div>`;
    $('#bNext').onclick=()=>this.next();s.dirty=true;},
  pstate(p){const s=G.gs,sl=s.slots.get(p.id)||[],now=Date.now();
    const turns=s.o.play!=='free',t=s.turn,mine=!!(t&&t.pid===p.id),who=t&&G.players.get(t.pid);
    return {k:s.phase+sl.map(x=>x.id+(x.until>now?'w':'')).join('.')+(turns?'|'+(t?t.n:0):''),ph:s.phase,title:s.title,bpm:s.A&&s.A.bpm,key:s.A&&s.A.key.name,
      turns,mine,who:who?who.name:'',up:turns?this.upIn(p.id):0,left:t?Math.max(0,t.end-now):0,T:s.o.turn*1000,
      moves:sl.map(x=>{const f=rxFx(x.id);return {id:f.id,name:f.name,d:f.d,cat:f.cat,wait:Math.max(0,x.until-now)};})};},
  player(root,st){
    if(st.ph!=='live'){root.innerHTML=`<div class="pcenter dots"><h2>${st.ph==='end'?'That’s the remix':'Get ready'}</h2><p>${st.ph==='load'?'The song is being analysed…':st.ph==='ready'?`${esc(st.title)} · ${st.bpm} BPM · ${esc(st.key)}. Your four moves arrive when the needle drops.`:'Look at the big screen.'}</p></div>`;return;}
    if(!st.moves.length){root.innerHTML=`<div class="pcenter dots"><h2>Your moves are coming</h2></div>`;return;}
    const off=st.turns&&!st.mine,ban=!st.turns?'':st.mine?`<div class="rxban mine"><b>Your turn</b><span>pick one move</span><i style="--l:${st.left}ms"></i></div>`
      :`<div class="rxban"><b>${esc(st.who||'…')}’s turn</b><span>${st.up>0?(st.up===1?'you’re next':`you’re up in ${st.up}`):''}</span></div>`;
    root.innerHTML=`<div class="rxphone${st.turns?' turns':''}${off?' off':''}">${ban}${st.moves.map((m,k)=>`<button class="rxmove${m.wait?' wait':''}${m.cat==='space'?' dark':''}" data-k="${k}" style="--c:var(${RX_CAT[m.cat]});--w:${m.wait}ms" ${m.wait||off?'disabled':''}><span class="lab">${esc(RX_CATS[m.cat])}</span><b>${esc(m.name)}</b><small>${esc(m.d)}</small><i class="rxcool"></i></button>`).join('')}</div>`;
    if(st.mine)papi.vibe([40,60,40]);
    $$('.rxmove',root).forEach(b=>{b.onclick=()=>{papi.send({t:'fx',k:+b.dataset.k});papi.vibe(30);b.classList.add('fired');$$('.rxmove',root).forEach(x=>x.disabled=true);};
      const w=parseFloat(b.style.getPropertyValue('--w'));if(w>0&&!off)setTimeout(()=>{b.classList.remove('wait');b.disabled=false;},w);});},
});
