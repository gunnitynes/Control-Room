/* ====================================================================
   TRAIN YOUR EARS — the room listens to the big speakers, phones answer.
   Frequency Detective · Decay Guessr · Frequency Sculptor · Envelope
   Sculptor · Preset Archeologist · Ghost Note · Stereo Stage · Sample
   Chronologist. All audio comes from js/audio.js.
   ==================================================================== */
/* the demo song: wait for it to load, then play — unless the round has moved on */
function withSong(fn){if(AU.song){fn();return;}toast('Loading the demo song…');const s=G.gs,i=s&&s.i,ph=s&&s.phase;
  songReady().then(()=>{if(G.gs===s&&s.i===i&&(s.phase==='prep'||s.phase==='open'||s.phase===ph))fn();}).catch(()=>toast('Could not load the demo song (audio/demosong.mp3)'));}
// hand out song parts so no part repeats until all have been used
function dealSong(list,n){let deck=[];return [...Array(n)].map(()=>{if(!deck.length)deck=shuffle(list);return deck.pop();});}
const songTag=ex=>ex?` <span class="songtag">from the song · ${esc(ex.name)} · ${Math.floor(ex.at/60)}:${pad2(Math.floor(ex.at%60))}</span>`:'';
function stopAud(){const s=G.gs;if(s&&s.aud){try{s.aud.stop();}catch(e){}s.aud=null;}}
function setAud(h){stopAud();if(G.gs)G.gs.aud=h;return h;}
const octErr=(a,b)=>Math.abs(Math.log2(a/b));
const logU=(min,max,u)=>min*Math.pow(max/min,u);
const unLog=(min,max,v)=>Math.log(v/min)/Math.log(max/min);
const FREQ_ZONES=[[20,60,'Sub'],[60,250,'Bass'],[250,500,'Low mids'],[500,2000,'Mids'],[2000,4000,'Upper mids'],[4000,6000,'Presence'],[6000,20000,'Air']];
const zoneOf=f=>(FREQ_ZONES.find(z=>f>=z[0]&&f<z[1])||FREQ_ZONES[6])[2];
const FREQ_MARKS=[63,125,250,500,1000,2000,4000,8000,16000].map(v=>({v,l:fmtHz(v).replace(' ','')}));
const pinkBuf=()=>{const ac=audio();if(AU.pink)return AU.pink;const sr=ac.sampleRate,b=ac.createBuffer(1,sr*4,sr),d=b.getChannelData(0);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for(let i=0;i<d.length;i++){const w=Math.random()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926;}return AU.pink=b;};
function playPink(dest){const ac=audio(),s=ac.createBufferSource();s.buffer=pinkBuf();s.loop=true;const g=gn(ac,1);s.connect(g).connect(dest);s.start();const h={stop(){try{g.gain.setTargetAtTime(0,ac.currentTime,.03);s.stop(ac.currentTime+.2);}catch(e){}AU.live.delete(h);}};AU.live.add(h);return h;}

/* ---------- phone: a big slider (log or linear) ---------- */
function pSlider(root,{min,max,log=true,fmt,name,marks=[],start=.5,lock='Lock in',bigName=false},submit){
  let u=start;const val=()=>log?logU(min,max,u):min+(max-min)*u;
  root.innerHTML=`<div class="pslide${bigName?' bigname':''}"><div class="pread"><b class="sv"></b><span class="sn"></span></div>
    <div class="strack"><i class="sfill"></i>${marks.map(m=>`<i class="smark" style="left:${100*(log?unLog(min,max,m.v):(m.v-min)/(max-min))}%"><span>${esc(m.l)}</span></i>`).join('')}<i class="sknob"></i></div>
    <div class="snudge"><button data-d="-1">◀</button><span class="lab">drag, or nudge</span><button data-d="1">▶</button></div>
    <button class="big go plock">${esc(lock)}</button></div>`;
  const tr=$('.strack',root),upd=()=>{$('.sfill',root).style.width=(u*100)+'%';$('.sknob',root).style.left=(u*100)+'%';$('.sv',root).textContent=fmt(val());$('.sn',root).textContent=name?name(val()):'';};
  const setX=x=>{const b=tr.getBoundingClientRect();u=clamp((x-b.left)/b.width,0,1);upd();};
  tr.addEventListener('pointerdown',e=>{tr.setPointerCapture(e.pointerId);setX(e.clientX);});
  tr.addEventListener('pointermove',e=>{if(tr.hasPointerCapture(e.pointerId))setX(e.clientX);});
  $$('.snudge button',root).forEach(b=>b.onclick=()=>{u=clamp(u+(+b.dataset.d)/96,0,1);upd();});
  $('.plock',root).onclick=()=>submit(+val().toPrecision(4));upd();
}
/* ---------- host: everyone's guesses on one axis ---------- */
function axisPlot({min,max,log=true,fmt,marks=[]},list,truth,{truthLabel=''}={}){
  const X=v=>100*(log?unLog(min,max,clamp(v,min,max)):(clamp(v,min,max)-min)/(max-min)),bins={};
  const best=list.slice().sort((a,b)=>(b.res?.acc||0)-(a.res?.acc||0)).slice(0,3).map(x=>x.p.id);
  return `<div class="axplot"><div class="axline"></div>${marks.map(m=>`<i class="axmark" style="left:${X(m.v)}%"><span>${esc(m.l)}</span></i>`).join('')}
    ${truth!=null?`<div class="axtruth" style="left:${X(truth)}%"><b>${esc(fmt(truth))}</b>${truthLabel?`<span>${esc(truthLabel)}</span>`:''}</div>`:''}
    ${list.map(x=>{const v=+x.a,b=Math.round(X(v)/2.2);const row=bins[b]=(bins[b]||0)+1;return `<div class="axdot c${x.p.sh} ${best.includes(x.p.id)?'best':''}" style="left:${X(v)}%;bottom:${30+row*22}px" title="${esc(x.p.name)} · ${esc(fmt(v))}">${shape(x.p.sh,18,'var(--ink)','var(--c)')}${best.includes(x.p.id)?`<span>${esc(x.p.name)}</span>`:''}</div>`;}).join('')}</div>`;
}
const listenStage=(title,sub,extra='')=>`<div class="listen"><div class="ear"><i></i><i></i><i></i>${shape(0,90,'var(--ink)','var(--red)')}</div><h2>${esc(title)}</h2><p>${esc(sub)}</p>${extra}</div>`;

/* ---------- FREQUENCY DETECTIVE ---------- */
game(roundGame({
  id:'detective',noWord:'Way off',group:'ears',name:'Frequency Detective',tag:'A narrow filter roams the mix and parks somewhere. Name the frequency.',
  how:['A sharp band-pass filter sweeps through a full mix, then stops.','Slide to the frequency you hear isolated and lock it in.','Points for how close you get — measured in octaves, like your ears.'],
  badges:['Scored','Listening'],speed:.15,okAt:.8,closeAt:.45,yesWord:'Spot on!',
  icon:`<svg viewBox="0 0 64 64"><path d="M4 50 Q20 50 26 24 Q32 4 38 24 Q44 50 60 50" fill="none" stroke="var(--ink)" stroke-width="4"/><circle cx="32" cy="20" r="9" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/><line x1="4" y1="58" x2="60" y2="58" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'src',label:'Source',choices:[['song','Demo song','a new part every round'],['noise','Pink noise','easier'],['mix','Synth band','built-in']],def:'song'},
    {key:'q',label:'Filter width',choices:[[2.5,'Wide','easier'],[5,'Narrow','classic'],[9,'Razor','hard']],def:5},
    {key:'n',label:'Rounds',choices:[[5,'5'],[8,'8'],[10,'10']],def:8},
    {key:'secs',label:'Answer time',choices:[[15,'15','seconds'],[25,'25','seconds'],[0,'OFF','no clock']],def:25},
  ],
  prepMs:3500,prepLabel:'HUNT',prepSub:'the filter moves',
  prepText:()=>({big:'Listen',small:'The filter is sweeping. Your slider appears when it stops.'}),
  secs:o=>o.secs,
  build:o=>{const ex=dealSong(SONG.excerpts,o.n);return shuffle([90,160,300,550,1000,1800,3200,5600,9000,12000]).slice(0,o.n).map((b,k)=>({f:Math.round(b*rnd(.85,1.18)),start:pick([120,400,1500,6000]),ex:o.src==='song'?ex[k]:null}));},
  onPrep(r,o){const ac=audio(),bp=bq(ac,'bandpass',r.start,o.q),mk=gn(ac,o.src==='noise'?3:4.5);bp.connect(mk).connect(AU.music);
    let src={stop(){}};if(o.src==='song')withSong(()=>{src=playExcerpt(r.ex,bp);});else src=o.src==='noise'?playPink(bp):playDemo(bp,{rt:1.1});
    const n=64,c=new Float32Array(n);let w=Math.log2(r.start);for(let i=0;i<n;i++){const k=i/(n-1);w+=(Math.random()-.5)*.45;c[i]=Math.pow(2,lerp(w,Math.log2(r.f),Math.pow(k,2.2)));}c[n-1]=r.f;
    bp.frequency.setValueCurveAtTime(c,ac.currentTime+.1,3.15);
    // the song is bass-heavy: lift the gain as the filter climbs so high bands aren't faint (≈ +2.7 dB/octave)
    if(o.src==='song'){const gc=c.map(f=>4.5*Math.pow(f/1000,.45));mk.gain.setValueCurveAtTime(gc,ac.currentTime+.1,3.15);}
    setAud({bp,mk,stop(){src.stop();setTimeout(()=>{try{mk.disconnect();}catch(e){}},800);}});},
  leave:stopAud,
  replay(r,ph,o){const ac=audio(),bp=bq(ac,'bandpass',r.f,o.q),mk=gn(ac,o.src==='noise'?3:o.src==='song'?4.5*Math.pow(r.f/1000,.45):4.5),dry=gn(ac,0),sum=gn(ac,1);bp.connect(mk).connect(sum);dry.connect(sum);sum.connect(AU.music);
    const inp=gn(ac,1);inp.connect(bp);inp.connect(dry);let src={stop(){}};if(o.src==='song')withSong(()=>{src=playExcerpt(r.ex,inp);});else src=o.src==='noise'?playPink(inp):playDemo(inp,{rt:1.1});
    if(ph==='reveal'){const t=ac.currentTime+3.5;mk.gain.setValueAtTime(mk.gain.value,t);mk.gain.linearRampToValueAtTime(0,t+1.5);dry.gain.setValueAtTime(0,t);dry.gain.linearRampToValueAtTime(.9,t+1.5);toast('Filtered for 3 s, then the full mix');}
    setAud({stop(){src.stop();setTimeout(()=>{try{sum.disconnect();}catch(e){}},800);}});},
  replayLabel:'Hear it again',
  stage:(m,r,ctx)=>{m.innerHTML=listenStage(ctx.phase==='prep'?'The filter is hunting…':'Where did it stop?',ctx.phase==='prep'?'Follow the sound. It is about to park on one frequency.':'Lock in the frequency on your phone.',`<div class="zones">${FREQ_ZONES.slice(0,7).map(z=>`<span><b>${esc(z[2])}</b>${fmtHz(z[0])}–${fmtHz(z[1])}</span>`).join('')}</div>`);},
  reveal:(m,r,ctx)=>{m.innerHTML=`<div class="axwrap"><h2 class="qtext">It parked at <span class="hl">${fmtHz(r.f)}</span> — the ${esc(zoneOf(r.f).toLowerCase())}.${songTag(r.ex)}</h2>${axisPlot({min:40,max:16000,fmt:fmtHz,marks:FREQ_MARKS},ctx.list,r.f,{truthLabel:zoneOf(r.f)})}<p class="fine">Press “Hear it again” to hear the band, then the full mix it came from.</p></div>`;},
  ringLabel:r=>({label:fmtHz(r.f).replace(' ',''),fill:'--red'}),
  public:()=>({}),valid:(r,a)=>a>=20&&a<=20000,
  input:(root,pub,submit)=>pSlider(root,{min:40,max:16000,fmt:fmtHz,name:f=>zoneOf(f),marks:FREQ_MARKS},submit),
  locked:(box,mine)=>{box.innerHTML=`<div class="bignum">${fmtHz(mine)}</div><p>${esc(zoneOf(mine))}</p>`;},
  score:(r,a)=>{const e=octErr(a,r.f);return {acc:clamp(1-e/1.5,0,1),note:`${fmtHz(a)} vs ${fmtHz(r.f)} · ${e.toFixed(2)} octaves off`};},
  publicReveal:r=>({f:r.f}),
  pReveal:(box,st)=>{box.innerHTML=`<p>The filter was at <b>${fmtHz(st.rv.f)}</b> (${esc(zoneOf(st.rv.f))}).</p>`;},
  revealSide:(r,ctx)=>{const L=ctx.list,med=L.length?L.map(x=>+x.a).sort((a,b)=>a-b)[Math.floor(L.length/2)]:0;return `<div class="stat"><b>${L.length?fmtHz(med):'—'}</b><span>the room's median guess</span></div>`;},
}));

/* ---------- DECAY GUESSR ---------- */
const ROOMS=[[.4,'a vocal booth'],[.7,'a small studio'],[1,'a living room'],[1.5,'a classroom'],[2.2,'a concert hall'],[3.5,'a big church'],[5.5,'a cathedral'],[99,'a concrete cave']];
const roomOf=s=>ROOMS.find(r=>s<r[0])[1];
const RT_MARKS=[.25,.5,1,2,4,8].map(v=>({v,l:v+'s'}));
game(roundGame({
  id:'decay',noWord:'Way off',group:'ears',name:'The Decay Guessr',tag:'A dry sound in a mystery space. How long until it dies away?',
  how:['A short sound plays twice in a mystery reverb.','Slide to the RT60: the seconds it takes the tail to fall 60 dB.','Close guesses score — every room on the slider is a clue.'],
  badges:['Scored','Listening'],speed:.15,okAt:.8,closeAt:.45,yesWord:'Nailed it!',
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="10" width="8" height="44" fill="var(--ink)"/><path d="M14 14 Q30 40 60 52" fill="none" stroke="var(--red)" stroke-width="5"/><path d="M14 30 Q28 46 60 54" fill="none" stroke="var(--blue)" stroke-width="3"/><line x1="4" y1="58" x2="60" y2="58" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'src',label:'Dry sound',choices:[['song','Song chops','a different hit every round'],['mix','Synth sounds','clap, snare, voice, chord']],def:'song'},
    {key:'n',label:'Rounds',choices:[[5,'5'],[7,'7'],[9,'9']],def:7},
    {key:'secs',label:'Answer time',choices:[[15,'15','seconds'],[25,'25','seconds'],[0,'OFF','no clock']],def:15},
  ],
  prepMs:r=>Math.round((decayGap(r.rt)*2+.3)*1000),prepLabel:'LISTEN',prepSub:'to the tail',
  prepText:()=>({big:'Listen to the tail',small:'Two hits. Your slider opens after the second one dies away.'}),
  secs:o=>o.secs,
  build:o=>{// spread the chop types: kick, snare, stab, melodic in turn, each a different moment of the song
    const kinds=shuffle([...new Set(SONG.chops.map(c=>c.name))]),by=Object.fromEntries(kinds.map(k=>[k,shuffle(SONG.chops.filter(c=>c.name===k))]));
    return shuffle([.3,.55,.9,1.4,2.1,3.2,4.8,7]).slice(0,o.n).map((b,i)=>({rt:+(b*rnd(.88,1.14)).toFixed(2),src:o.src==='song'?null:pick(['clap','snare','hey','chord']),
      chop:o.src==='song'?by[kinds[i%kinds.length]][Math.floor(i/kinds.length)%3]:null,pre:rnd(.005,.035),damp:rnd(.25,.6)}));},
  decaySrc:r=>r.chop?(ac,d,t)=>songChop(ac,d,t,r.chop):r.src,
  onPrep(r){const go=()=>setAud(playDecay({rt:r.rt,src:this.decaySrc(r),pre:r.pre,damp:r.damp}));r.chop?withSong(go):go();},leave:stopAud,
  replay(r){const go=()=>setAud(playDecay({rt:r.rt,src:this.decaySrc(r),pre:r.pre,damp:r.damp,hits:1}));r.chop?withSong(go):go();},
  stage:(m,r,ctx)=>{m.innerHTML=listenStage(ctx.phase==='prep'?'Where are we?':'How long was the tail?',ctx.phase==='prep'?'Close your eyes. Picture the room.':'Slide to the decay time on your phone.',`<div class="zones rooms">${ROOMS.slice(0,7).map((z,i)=>`<span><b>${esc(z[1].replace(/^an? /,''))}</b><em>${i?ROOMS[i-1][0]:0}–${z[0]}<small> s</small></em></span>`).join('')}</div>`);},
  reveal:(m,r,ctx)=>{
    const W=900,H=220,X=t=>40+(W-60)*t/Math.max(8,r.rt*1.3),Y=db=>16+(H-50)*(-db/72);let d='';for(let i=0;i<=100;i++){const t=i/100*Math.max(8,r.rt*1.3);d+=(i?'L':'M')+X(t).toFixed(1)+' '+Y(Math.max(-72,-60*t/r.rt)).toFixed(1);}
    m.innerHTML=`<div class="axwrap"><h2 class="qtext">RT60 = <span class="hl">${fmtS(r.rt)}</span> — about ${esc(roomOf(r.rt))}.${r.chop?` <span class="songtag">the dry sound: ${esc(r.chop.name.toLowerCase())} at ${Math.floor(r.chop.at/60)}:${pad2(Math.floor(r.chop.at%60))} in the song</span>`:''}</h2>
      <svg class="decaysvg" viewBox="0 0 ${W} ${H}"><line x1="40" y1="${Y(-60)}" x2="${W-20}" y2="${Y(-60)}" stroke="var(--hair)" stroke-width="2" stroke-dasharray="6 6"/><text x="${W-24}" y="${Y(-60)-8}" text-anchor="end" font-family="Space Mono" font-size="14" fill="var(--ink2)">−60 dB</text>
        <path d="${d}" fill="none" stroke="var(--red)" stroke-width="5"/><circle cx="${X(r.rt)}" cy="${Y(-60)}" r="9" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/></svg>
      ${axisPlot({min:.2,max:10,fmt:fmtS,marks:RT_MARKS},ctx.list,r.rt,{truthLabel:roomOf(r.rt)})}</div>`;},
  ringLabel:r=>({label:fmtS(r.rt).replace(' ',''),fill:'--blue'}),
  public:()=>({}),valid:(r,a)=>a>0&&a<30,
  input:(root,pub,submit)=>pSlider(root,{min:.2,max:10,fmt:fmtS,name:s=>roomOf(s),marks:RT_MARKS,start:.45,bigName:true},submit),
  locked:(box,mine)=>{box.innerHTML=`<div class="bignum">${fmtS(mine)}</div><p>${esc(roomOf(mine))}</p>`;},
  score:(r,a)=>{const e=octErr(a,r.rt);return {acc:clamp(1-e/1.2,0,1),note:`${fmtS(a)} vs ${fmtS(r.rt)}`};},
  publicReveal:r=>({rt:r.rt}),
  pReveal:(box,st)=>{box.innerHTML=`<p>It was <b>${fmtS(st.rv.rt)}</b> — ${esc(roomOf(st.rv.rt))}.</p>`;},
}));

/* ---------- FREQUENCY SCULPTOR ---------- */
// the flaw: a strong, fairly narrow resonance — loud enough that nobody can miss it
const EQ_BOOST=24,EQ_Q=4;
function eqGraphSVG({bump,cuts=[],W=900,H=260}){
  const X=f=>40+(W-60)*unLog(40,16000,f),bell=(f0,g,q)=>f=>{const x=Math.log2(f/f0)*q*1.4;return g*Math.exp(-x*x);};
  const curve=fn=>{let d='';for(let i=0;i<=200;i++){const f=logU(40,16000,i/200);d+=(i?'L':'M')+X(f).toFixed(1)+' '+(H/2-fn(f)*5).toFixed(1);}return d;};
  return `<svg class="eqsvg" viewBox="0 0 ${W} ${H}">${FREQ_MARKS.map(m=>`<line x1="${X(m.v)}" y1="10" x2="${X(m.v)}" y2="${H-24}" stroke="var(--hair)" stroke-width="1.5"/><text x="${X(m.v)}" y="${H-6}" text-anchor="middle" font-family="Space Mono" font-size="13" fill="var(--ink2)">${m.l}</text>`).join('')}
    <line x1="40" y1="${H/2}" x2="${W-20}" y2="${H/2}" stroke="var(--ink3)" stroke-width="2"/>
    ${cuts.map(c=>`<path d="${curve(bell(c.f,-EQ_BOOST,EQ_Q))}" fill="none" stroke="var(${COLS[c.sh%4]})" stroke-width="2" opacity=".55"/>`).join('')}
    ${bump?`<path d="${curve(bell(bump,EQ_BOOST,EQ_Q))}" fill="none" stroke="var(--red)" stroke-width="6"/><circle cx="${X(bump)}" cy="${H/2-EQ_BOOST*5}" r="10" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/>`:''}</svg>`;
}
game(roundGame({
  id:'sculptor',noWord:'Missed it',group:'ears',name:'Frequency Sculptor',tag:'Something in the mix sounds wrong. Find it on the EQ and cut it.',
  how:['The mix plays with one ugly resonance boosted hard: +24 dB (boxy, harsh, muddy…).','Drag an EQ notch on your phone right onto the problem and lock it in.','The closer your cut, the more points. Then hear the room’s fix.'],
  badges:['Scored','Listening'],speed:.15,okAt:.78,closeAt:.45,yesWord:'Fixed it!',
  icon:`<svg viewBox="0 0 64 64"><path d="M4 32 L22 32 Q28 32 30 52 Q32 60 34 52 Q36 32 42 32 L60 32" fill="none" stroke="var(--ink)" stroke-width="4"/><circle cx="32" cy="54" r="7" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/><path d="M44 10 l10 10 M54 10 l-10 10" stroke="var(--ink)" stroke-width="4"/></svg>`,
  options:[
    {key:'src',label:'Source',choices:[['song','Demo song','a new part every round'],['mix','Synth band','built-in']],def:'song'},
    {key:'n',label:'Rounds',choices:[[4,'4'],[6,'6'],[8,'8']],def:6},
    {key:'secs',label:'Answer time',choices:[[20,'20','seconds'],[30,'30','seconds'],[0,'OFF','no clock']],def:30},
  ],
  prepMs:5000,prepLabel:'LISTEN',prepSub:'for the flaw',
  prepText:()=>({big:'What’s wrong?',small:'Listen for the ugly bit. Your EQ appears in a moment.'}),
  secs:o=>o.secs,
  build:o=>{const ex=dealSong(SONG.excerpts,o.n);return shuffle(EQ_PROBLEMS).slice(0,o.n).map((p,k)=>({...p,f:Math.round(p.f*rnd(.87,1.15)),ex:o.src==='song'?ex[k]:null}));},
  // one chain, switchable while it plays: 'flaw' (the boost), 'clean' (no boost), or a student's cut on top of the boost
  play(r,mode='flaw'){const ac=audio(),pk=bq(ac,'peaking',r.f,EQ_Q,EQ_BOOST),c=bq(ac,'peaking',1000,EQ_Q,0),g=gn(ac,.42);pk.connect(c).connect(g).connect(AU.music);
    let src={stop(){}};const h=setAud({stop(){src.stop();setTimeout(()=>{try{g.disconnect();}catch(e){}},800);},
      mode(m){const t=ac.currentTime;pk.gain.setTargetAtTime(m==='clean'?0:EQ_BOOST,t,.02);if(typeof m==='number'){c.frequency.setValueAtTime(m,t);c.gain.setTargetAtTime(-EQ_BOOST,t,.02);}else c.gain.setTargetAtTime(0,t,.02);}});
    h.mode(mode);G.gs.sculpt=h;
    if(r.ex)withSong(()=>{if(G.gs&&G.gs.aud===h)src=playExcerpt(r.ex,pk);});else src=playDemo(pk,{rt:1.1});},
  onPrep(r){this.play(r);},leave:stopAud,
  replay(r,ph){const s=G.gs;if(ph!=='reveal'){this.play(r);return;}
    const best=this.answers().sort((a,b)=>(b.res?.acc||0)-(a.res?.acc||0))[0];
    const modes=[['flaw',`Flawed: +${EQ_BOOST} dB at ${fmtHz(r.f)}`],['clean','Clean: the boost removed']].concat(best?[[+best.a,`Fixed with ${best.p.name}’s cut at ${fmtHz(+best.a)}`]]:[]);
    s.abI=((s.abI??-1)+1)%modes.length;const [m,label]=modes[s.abI];
    if(s.sculpt&&s.aud===s.sculpt)s.sculpt.mode(m);else this.play(r,m);
    toast(label);const b=$('#bReplay');if(b)b.innerHTML=`▶ A/B · now: ${esc(label.split(':')[0].split(' with')[0])}`;},
  replayLabel:'A/B the mix',
  stage:(m,r,ctx)=>{m.innerHTML=listenStage(ctx.phase==='prep'?'Something is off…':'Find it and cut it',ctx.phase==='prep'?'Boomy? Boxy? Harsh? Listen to where it lives.':'Drag the notch on your phone onto the problem.',eqGraphSVG({}));},
  reveal(m,r,ctx){m.innerHTML=`<div class="axwrap"><h2 class="qtext"><span class="hl">${esc(r.name)}</span> at ${fmtHz(r.f)} — ${esc(r.hint)}.${songTag(r.ex)}</h2>${eqGraphSVG({bump:r.f,cuts:ctx.list.map(x=>({f:+x.a,sh:x.p.sh}))})}${axisPlot({min:40,max:16000,fmt:fmtHz,marks:FREQ_MARKS},ctx.list,r.f,{truthLabel:r.name})}<p class="fine">“A/B the mix” switches instantly while it plays: flawed → clean → the best student’s cut.</p></div>`;G.gs.abI=-1;},
  ringLabel:r=>({label:fmtHz(r.f).replace(' ',''),fill:'--red'}),
  public:()=>({}),valid:(r,a)=>a>=20&&a<=20000,
  input(root,pub,submit){
    let f=1000;root.innerHTML=`<div class="peq"><div class="pread"><b class="sv"></b><span class="sn"></span></div><div class="eqpad"><svg viewBox="0 0 300 180" preserveAspectRatio="none"><path class="eqc" fill="none" stroke="var(--red)" stroke-width="4"/>${FREQ_MARKS.map(m=>`<line x1="${300*unLog(40,16000,m.v)}" y1="0" x2="${300*unLog(40,16000,m.v)}" y2="180" stroke="var(--hair)" stroke-width="1"/>`).join('')}<line x1="0" y1="60" x2="300" y2="60" stroke="var(--ink3)" stroke-width="1.5"/></svg><i class="eqdot"></i>
      <div class="eqlabels">${FREQ_MARKS.filter((_,i)=>i%2===0).map(m=>`<span style="left:${100*unLog(40,16000,m.v)}%">${m.l}</span>`).join('')}</div></div><p class="lab mut">Drag the notch left and right</p><button class="big go plock">Cut here</button></div>`;
    const pad=$('.eqpad',root),upd=()=>{const u=unLog(40,16000,f);let d='';for(let i=0;i<=120;i++){const x=i/120,ff=logU(40,16000,x),k=Math.log2(ff/f)*3.5,y=60+70*Math.exp(-k*k);d+=(i?'L':'M')+(x*300).toFixed(1)+' '+y.toFixed(1);}
      $('.eqc',root).setAttribute('d',d);const dot=$('.eqdot',root);dot.style.left=(u*100)+'%';dot.style.top=(130/180*100)+'%';$('.sv',root).textContent=fmtHz(f);$('.sn',root).textContent=zoneOf(f);};
    const setX=x=>{const b=pad.getBoundingClientRect();f=logU(40,16000,clamp((x-b.left)/b.width,0,1));upd();};
    pad.addEventListener('pointerdown',e=>{pad.setPointerCapture(e.pointerId);setX(e.clientX);});pad.addEventListener('pointermove',e=>{if(pad.hasPointerCapture(e.pointerId))setX(e.clientX);});
    $('.plock',root).onclick=()=>submit(Math.round(f));upd();
  },
  locked:(box,mine)=>{box.innerHTML=`<div class="bignum">−${EQ_BOOST} dB @ ${fmtHz(mine)}</div><p>${esc(zoneOf(mine))}</p>`;},
  score:(r,a)=>{const e=octErr(a,r.f);return {acc:clamp(1-e/1.4,0,1),note:`${fmtHz(a)} vs ${fmtHz(r.f)}`};},
  publicReveal:r=>({f:r.f,name:r.name,hint:r.hint}),
  pReveal:(box,st)=>{box.innerHTML=`<p><b>${esc(st.rv.name)}</b> at ${fmtHz(st.rv.f)} — ${esc(st.rv.hint)}.</p>`;},
}));

/* ---------- ENVELOPE SCULPTOR ---------- */
// options must look clearly different: compare attack, decay, sustain, release and length on a log scale
const envVec=E=>[Math.log10(E.a+.01),Math.log10(E.d+.01),E.s*1.5,Math.log10(E.r+.01),Math.log10(E.hold)];
const envDist=(A,B)=>Math.hypot(...envVec(A).map((v,i)=>v-envVec(B)[i]));
function pickDistinctEnvs(E){const out=[];for(const x of shuffle(ENVELOPES.filter(x=>x!==E))){if(envDist(x,E)>.7&&out.every(y=>envDist(x,y)>.7))out.push(x);if(out.length===3)break;}
  for(const x of shuffle(ENVELOPES.filter(x=>x!==E&&!out.includes(x)))){if(out.length===3)break;out.push(x);}return out;}
// Drawn from envPts (the same shape the sound plays), on real time: every option in a round shares the axis T,
// so a long tail looks long next to a short one. Ticks mark each second.
function adsrSVG(E,{W=340,H=96,T}={}){T=T||envLen(E);const X=t=>8+(W-16)*t/T,Y=v=>H-8-(H-18)*v,pts=envPts(E);
  const ticks=Array.from({length:Math.floor(T)+1},(_,i)=>`<line x1="${X(i).toFixed(1)}" y1="${H-8}" x2="${X(i).toFixed(1)}" y2="${H-1}" stroke="currentColor" stroke-opacity=".55" stroke-width="3"/>`).join('');
  return `<svg class="adsr" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><line x1="6" y1="${H-8}" x2="${W-6}" y2="${H-8}" stroke="currentColor" stroke-opacity=".35" stroke-width="2"/>${ticks}<path d="${pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('')}Z" fill="color-mix(in srgb,currentColor 18%,transparent)" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>`;
}
game(roundGame(mcSpec({
  id:'envelope',group:'ears',name:'Envelope Sculptor',tag:'Hear a sound, pick its shape: attack, decay, sustain, release.',
  how:['One note plays once — the same steady tone every round, only its loudness shape changes (or switch the sound to a frozen moment of the demo song).','Four shapes appear on your phone, all on the same time scale (a tick per second). Tap the one you heard.','Fast right answers score more.'],
  badges:['Scored','Listening'],speed:.4,htmlOpts:true,kind:'env',
  icon:`<svg viewBox="0 0 64 64"><path d="M4 56 L16 8 L28 30 L44 30 L60 56" fill="var(--yel)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/><line x1="4" y1="58" x2="60" y2="58" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[{key:'src',label:'Sound',choices:[['mix','Synth tone','the same tone every time'],['song','Frozen song','a moment of the song held still']],def:'mix'},
    {key:'n',label:'Rounds',choices:[[6,'6'],[8,'8'],[10,'10']],def:8},{key:'secs',label:'Answer time',choices:[[12,'12','seconds'],[20,'20','seconds'],[0,'OFF','no clock']],def:20}],
  prepMs:r=>Math.round(envLen(r.E)*1000+900),prepLabel:'LISTEN',prepSub:'to the shape',
  prepText:()=>({big:'Listen',small:'Watch the four shapes on the big screen while it plays.'}),
  secs:o=>o.secs,
  build:o=>{const fz=dealSong(SONG.freeze,o.n);return shuffle(ENVELOPES).slice(0,o.n).map((E,k)=>{const others=pickDistinctEnvs(E);const order=shuffle([E,...others]);return {E,opts:order,c:order.indexOf(E),T:Math.max(...order.map(envLen)),fz:o.src==='song'?fz[k]:null};});},
  sound(r){if(r.fz)withSong(()=>setAud(playFreeze(r.fz,r.E)));else setAud(playEnvelope(r.E));},
  onPrep(r){this.sound(r);},leave:stopAud,
  replay(r){this.sound(r);},
  public:r=>({opts:r.opts.map(E=>adsrSVG(E,{T:r.T})),html:true,kind:'env'}),
  // the shapes show while it plays; class env-open stops them animating in a second time when answers open
  stage:(m,r,ctx)=>{m.innerHTML=`<div class="mc env-${ctx.phase}"><h2 class="qtext">Which envelope is this?</h2>${mcTiles({...r,opts:r.opts},{...ctx,phase:ctx.phase==='prep'?'open':ctx.phase},{optHTML:E=>adsrSVG(E,{T:r.T})})}</div>`;},
  reveal:(m,r,ctx)=>{m.innerHTML=`<div class="mc reveal"><h2 class="qtext"><span class="hl">${esc(r.E.name)}</span> · A ${r.E.a}s · D ${r.E.d}s · S ${Math.round(r.E.s*100)}%${r.E.s>0?` · R ${r.E.r}s`:''}${r.fz?` <span class="songtag">the sound: the song frozen at ${Math.floor(r.fz.at/60)}:${pad2(Math.floor(r.fz.at%60))} (${esc(r.fz.name.toLowerCase())})</span>`:''}</h2>${mcTiles(r,ctx,{optHTML:E=>adsrSVG(E,{T:r.T})+`<small>${esc(E.name)}</small>`})}</div>`;animateBars(m);},
})));

/* ---------- PRESET ARCHEOLOGIST ---------- */
// one clip of a machine: a real recording, or the real TR-808 one-shots played as a groove
function presetPlay(c){if(c.kit)return play808();const h={inner:null,stopped:false,stop(f){h.stopped=true;if(h.inner)h.inner.stop(f);AU.live.delete(h);}};AU.live.add(h);
  sampleReady(c.src).then(buf=>{if(!h.stopped)h.inner=playSample(buf,AU.music,{gain:.9,maxDur:12});}).catch(()=>toast('Could not load that recording'));return h;}
game(roundGame(mcSpec({
  id:'presets',group:'ears',name:'Preset Archeologist',tag:'Dig up a legendary sound. Which machine made it famous?',
  how:['A real recording of a classic machine plays on the big speakers: drum machines, synths, organs, toys, effects and game chips.','Name the machine, its kind or its decade on your phone, from four.','The reveal brings the year and the story. Every game digs up different machines.'],
  badges:['Scored','Listening','History'],speed:.5,
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="40" width="56" height="18" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/><rect x="4" y="24" width="56" height="16" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><rect x="18" y="6" width="28" height="22" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><circle cx="27" cy="17" r="4" fill="var(--paper)"/><circle cx="37" cy="17" r="4" fill="var(--red)"/></svg>`,
  options:[
    {key:'types',type:'multi',label:'Questions',choices:[['machine','Which machine?','name it from four'],['kind','What kind of machine?','drum machine, mono synth, organ…'],['decade','Which decade?','when it came out']],def:['machine','kind','decade'],sub:v=>`${v.types.length} of 3`},
    {key:'n',label:'Rounds',choices:[[6,'6'],[8,'8'],[10,'10'],[12,'12'],[16,'16']],def:10},
    {key:'secs',label:'Answer time',choices:[[12,'12','seconds'],[20,'20','seconds'],[30,'30','seconds']],def:20}],
  check:v=>v.types.length?'':'Pick at least one kind of question',
  get note(){const P=window.PRESETS||[];return `${P.length} machines in ${P.reduce((a,x)=>a+x.clips.length,0)} real recordings (Wikimedia Commons and Freesound, credits on every reveal and in audio/presets/CREDITS.txt). The game plays the machines and clips this browser has heard least first, so every lesson digs somewhere new.`;},
  prepMs:3500,prepLabel:'DIG',prepSub:'listen',
  prepText:r=>({big:'Listen…',small:r&&r.type==='kind'?'What kind of machine is this?':r&&r.type==='decade'?'When did this machine come out?':'Which machine is this? The answers open in a moment.'}),
  secs:o=>o.secs,
  build:o=>{const L=(window.PRESETS||[]).filter(x=>x.clips&&x.clips.length);if(!L.length)return [];
    const seen=store.get('presets.seen',{}),n=k=>seen[k]||0,used=new Set(),out=[];let deck=[];
    for(let k=0;k<o.n;k++){if(!deck.length)deck=shuffle(o.types.slice());const type=deck.pop();
      const pool=L.filter(x=>!used.has(x.id)),src=pool.length?pool:L,min=Math.min(...src.map(x=>n('m'+x.id)));
      const P=pick(src.filter(x=>n('m'+x.id)===min));used.add(P.id);
      const cmin=Math.min(...P.clips.map(c=>n(c.src||c.kit))),clip=pick(P.clips.filter(c=>n(c.src||c.kit)===cmin));
      let right,others;
      if(type==='kind'){right=P.kind;others=shuffle([...new Set(L.map(x=>x.kind))].filter(x=>x!==right)).slice(0,3);}
      else if(type==='decade'){const d=Math.floor(P.year/10)*10;right=d+'s';const near=[d-30,d-20,d-10,d+10,d+20].filter(x=>x>=1930&&x<=2000).map(x=>x+'s');others=shuffle(near).slice(0,3);}
      else{right=P.name;const same=shuffle(L.filter(x=>x!==P&&x.kind===P.kind)).slice(0,1).map(x=>x.name);
        others=[...same,...shuffle([...L.filter(x=>x!==P&&!same.includes(x.name)).map(x=>x.name),...PRESET_DECOYS])].filter((x,i,a)=>a.indexOf(x)===i).slice(0,3);}
      const opts=type==='decade'?[right,...others].sort():shuffle([right,...others]);
      seen['m'+P.id]=n('m'+P.id)+1;seen[clip.src||clip.kit]=n(clip.src||clip.kit)+1;
      out.push({P,clip,type,opts,c:opts.indexOf(right)});}
    store.set('presets.seen',seen);out.forEach(r=>{if(r.clip.src)sampleReady(r.clip.src).catch(()=>{});});return out;},
  roundInfo:r=>({machine:'Which machine',kind:'What kind',decade:'Which decade'})[r.type],
  onPrep(r){setAud(presetPlay(r.clip));},leave:stopAud,replay(r){setAud(presetPlay(r.clip));},replayLabel:'Dig it up again',
  stage:(m,r,ctx)=>{m.innerHTML=`<div class="mc"><div class="dig"><span></span><span></span><span></span><b>?</b></div><h2 class="qtext">${({machine:'Which machine is this?',kind:'What kind of machine is this?',decade:'When did this machine come out?'})[r.type]}</h2>${mcTiles(r,ctx)}</div>`;},
  reveal:(m,r,ctx)=>{m.innerHTML=`<div class="mc reveal"><div class="artifact"><b>${r.P.year}</b><div><h3>${esc(r.P.name)}</h3><p><span class="lab">${esc(r.P.kind)}</span> ${esc(r.P.fact)}</p></div></div>${mcTiles(r,ctx)}
      <p class="credit">Sound: ${esc(r.clip.credit||'')}</p></div>`;animateBars(m);},
  publicReveal:r=>({c:r.c,info:r.P.name+' · '+r.P.year}),
})));

/* ---------- METER LAB ----------
   The Meter Lab project (meterlab/index.html) runs inside the big screen in
   embed mode: its own rhythm engine, sounds and animated figures. Control Room
   asks it for Rhythm Arcade "hear it" questions; the phones answer them. */
const ML={frame:null,ready:false,want:null};
function mlFrame(){
  if(ML.frame&&ML.frame.isConnected)return ML.frame;
  const f=el('iframe','mlframe');f.src='meterlab/index.html?embed&v=2';f.setAttribute('allow','autoplay');f.title='Meter Lab';f.hidden=true;
  f.onload=()=>{const t=setInterval(()=>{const api=f.contentWindow&&f.contentWindow.MLAPI;if(api){clearInterval(t);ML.ready=true;api.theme(document.documentElement.dataset.theme==='night');if(ML.want){const w=ML.want;ML.want=null;w(api);}}},100);};
  document.body.appendChild(f);ML.frame=f;return f;
}
function mlApi(fn){const f=mlFrame();const api=ML.ready&&f.contentWindow&&f.contentWindow.MLAPI;if(api)fn(api);else ML.want=fn;}
// the figure is a fixed frame laid over its slot; clip it to the part of the slot its scrolling panel shows
function mlPlace(){const f=ML.frame,slot=$('#mlslot');if(!f)return;if(!slot){f.hidden=true;return;}const b=slot.getBoundingClientRect();
  const box=(slot.closest('.mlres,#rgm,.stage')||document.body).getBoundingClientRect();
  const t=Math.max(0,box.top-b.top),bt=Math.max(0,b.bottom-box.bottom),l=Math.max(0,box.left-b.left),rt=Math.max(0,b.right-box.right);
  f.hidden=b.height-t-bt<30||b.width-l-rt<30;
  Object.assign(f.style,{left:b.left+'px',top:b.top+'px',width:b.width+'px',height:b.height+'px',clipPath:`inset(${t}px ${rt}px ${bt}px ${l}px)`});}
// Question styles: HEAR it (sound + the listening booth), SEE it (the moving figure with its labels hidden, no sound),
// HEAR + SEE (both). The figure tells the rhythm as shapes: hops, arcs, wheels, a necklace, a drum score.
const MLSTYLE={hear:{tag:'Hear it',word:'LISTEN',big:'Listen',small:'Feel the groove on the big speakers. The answers open in a moment.'},
  see:{tag:'See it',word:'WATCH',big:'Watch',small:'No sound this time: read the moving figure on the big screen.'},
  both:{tag:'Hear + see',word:'LOOK',big:'Watch and listen',small:'The figure moves with the sound. Use both.'}};
const MLSEE={meter:'Count the hops: one per beat. Then count the dots inside a hop: 2 means simple, 3 means compound.',
  grouping:'Read the hops: short blue hops are 2s, tall red hops are 3s. Read them left to right.',
  poly:'Count how many times each ball crosses its arc before they meet again.',
  polymeter:'Count the teeth on the wheel: one tooth per step. The dark teeth are the hits.',
  pattern:'Read the necklace: count the beads around the ring and the gaps between the big ones.',
  swing:'Watch where the shapes land against the dashed rings: on the rings is straight, late is swung.'};
const mlOptHTML=o=>o.mini?`<span class="mlmini">${[...o.mini].map(c=>`<i class="${c==='1'?'on':''}"></i>`).join('')}</span>`:`<b class="mlbig">${esc(o.big)}</b>${o.small?`<small>${esc(o.small)}</small>`:''}`;
game(roundGame({
  id:'meterlab',group:'ears',name:'Meter Lab',tag:'Hear a groove, name its meter, grouping, polyrhythm, pattern or swing.',
  how:['A groove loops on the big speakers while Meter Lab’s figure says LISTEN.','Name what you hear on your phone — time signature, grouping, ratio, loop length, pattern or swing.','The reveal shows the moving figure and explains the answer. Fast right answers score more.'],
  badges:['Scored','Rhythm','Meter Lab'],speed:.4,
  icon:`<svg viewBox="0 0 64 64"><circle cx="20" cy="40" r="14" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/><rect x="34" y="8" width="24" height="24" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><path d="M36 58 L58 58 L47 38Z" fill="var(--yel)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/><path d="M6 12 q8 -8 16 0 t16 0" fill="none" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'topics',type:'multi',label:'Topics',choices:[['meter','Meter','time signatures, beats, simple or compound'],['grouping','Grouping','additive bars: 2s and 3s'],['poly','Polyrhythm','two voices, two ratios'],['polymeter','Polymeter','loops of different lengths'],['pattern','Pattern','Euclidean and famous rhythms'],['swing','Swing','straight, swung, early or late']],def:['meter','grouping','poly','polymeter','pattern','swing'],sub:v=>`${v.topics.length} of 6`},
    {key:'style',label:'Question style',choices:[['mix','Mixed','hear, see, both'],['hear','Hear it','sound only'],['see','See it','read the figure, no sound'],['both','Hear + see','figure and sound']],def:'mix',help:'See it shows Meter Lab’s moving figure (the hops, the arcs, the wheels, the necklace, the drum score) with its labels hidden: students read the rhythm from the shapes.'},
    {key:'level',label:'Level',choices:[[1,'I','warm-up'],[2,'II','groove'],[3,'III','odd']],def:1},
    {key:'n',label:'Rounds',choices:[[6,'6'],[8,'8'],[10,'10'],[12,'12'],[16,'16']],def:8},
    {key:'secs',label:'Answer time',choices:[[20,'20','seconds'],[30,'30','seconds'],[0,'OFF','no clock']],def:30},
  ],
  check:v=>v.topics.length?'':'Pick at least one topic',
  note:'Powered by Meter Lab (meterlab/index.html). <a href="meterlab/" target="_blank" rel="noopener">Open the full Meter Lab workstation</a> in a new tab for teaching.',
  prepMs:5000,prepLabel:'LISTEN',prepSub:'to the groove',
  prepText:r=>{const m=MLSTYLE[(r&&r.style)||'hear'];return {big:m.big,small:m.small};},
  secs:o=>o.secs,
  build:o=>{let deck=[];return [...Array(o.n)].map(()=>{if(!deck.length)deck=o.style&&o.style!=='mix'?[o.style]:shuffle(['hear','see','both']);return {q:null,style:deck.pop()};});},
  // questions come from Meter Lab itself, so each round asks for one as it starts
  onPrep(r,o){mlApi(api=>{if(!r.q){const q=api.question(o.level,o.topics);let opts=q.options;
      if(opts.length>4){const right=opts.find(x=>x.id===q.answer);opts=shuffle([right,...shuffle(opts.filter(x=>x!==right)).slice(0,3)]);}
      r.q=q;r.opts=opts;r.c=opts.findIndex(x=>x.id===q.answer);}
    const st=r.style||'hear';this.prepLabel=MLSTYLE[st].word;this.prepSub=st==='hear'?'to the groove':st==='see'?'the figure':'and listen';
    if(st==='hear')api.listen('LISTEN');else api.see();api.mute(st==='see');api.play();render();syncAll();});},
  leave(){mlApi(api=>api.stop());},
  stop(){mlApi(api=>{api.stop();api.mute(false);});if(ML.frame)ML.frame.hidden=true;},
  // after the reveal: the sound stops and a results window comes up; the teacher moves on
  replay(r,ph){mlApi(api=>{api.mute(ph!=='reveal'&&r.style==='see');api.play();});},replayLabel:'Hear the groove',
  // the reveal: the sound stops, the answer's own figure keeps moving (labels on) next to the results
  onReveal(){G.gs.mlWin=true;mlApi(api=>{api.mute(true);api.reveal();api.play();});},
  frame(){mlPlace();},resize(){mlPlace();},
  roundInfo:r=>r.q?(MLTOPIC[r.q.topic]||r.q.topic):'',
  stage(m,r,ctx){const q=r.q;
    const st=r.style||'hear';
    m.innerHTML=`<div class="mlwrap st-${st}"><div class="mlhead"><span class="dawtag">Meter Lab · ${esc(q?MLTOPIC[q.topic]:'loading')}</span><span class="mlstyle s-${st}">${esc(MLSTYLE[st].tag)}</span><h2 class="qtext">${q?esc(q.prompt):'Loading Meter Lab…'}</h2>${q&&ctx.phase!=='prep'?`<p class="fine">${esc(st==='hear'?q.hint:MLSEE[q.topic]||q.hint)}</p>`:''}</div>
      <div class="mlslot" id="mlslot"></div>${q?mcTiles({opts:r.opts,c:r.c},ctx,{optHTML:mlOptHTML}):''}</div>`;mlPlace();},
  reveal(m,r,ctx){const q=r.q;if(!q){m.innerHTML='';return;}const s=G.gs;
    if(s.mlWin){
      const ps=players().map(p=>({p,res:s.res.get(p.id)||{cls:'none',pts:0}}));const got=ps.filter(x=>x.res.cls==='yes').sort((a,b)=>b.res.pts-a.res.pts),miss=ps.filter(x=>x.res.cls!=='yes');
      const right=r.opts[r.c];const chip=x=>`<li class="c${x.p.sh}">${shape(x.p.sh,20,'var(--ink)','var(--c)')}<span>${esc(x.p.name)}</span>${x.res.pts?`<em>+${x.res.pts}</em>`:x.res.cls==='none'?'<em>no answer</em>':''}</li>`;
      m.innerHTML=`<div class="mlres"><div class="mlrhead"><span class="dawtag">Meter Lab · ${esc(MLTOPIC[q.topic])} · ${esc(MLSTYLE[r.style||'hear'].tag)} · results</span><h2 class="qtext">${esc(q.prompt)}</h2></div>
        <div class="mlrbody"><div class="mlrleft"><div class="mlanswer"><span class="lab">The answer</span><div class="tile c${r.c} yes">${shape(r.c,40)}<div class="tx">${mlOptHTML(right)}</div></div><p class="mlexplain">${q.explain}</p></div>
          <div class="mlslot mlrfig" id="mlslot"></div></div>
        <div class="mlcols"><div class="mlcol ok"><h3><b>${got.length}</b> got it</h3><ul>${got.map(chip).join('')||'<li class="none">Nobody this time</li>'}</ul></div>
          <div class="mlcol no"><h3><b>${miss.length}</b> missed it</h3><ul>${miss.map(chip).join('')||'<li class="none">Everyone got it ✓</li>'}</ul></div></div></div>
        <div class="frow"><button class="ghost" id="bFigure">▶ Hear it with the figure</button></div></div>`;
      $('#bFigure').onclick=()=>mlApi(api=>{api.mute(false);api.play();});mlPlace();return;}
    m.innerHTML=`<div class="mlwrap reveal mc"><div class="mlhead"><span class="dawtag">Meter Lab · ${esc(MLTOPIC[q.topic])}</span><h2 class="qtext">${esc(q.prompt)}</h2><p class="mlexplain">${q.explain}</p></div>
      <div class="mlslot" id="mlslot"></div>${mcTiles({opts:r.opts,c:r.c},ctx,{optHTML:mlOptHTML})}</div>`;animateBars(m);mlPlace();},
  public:r=>({opts:r.q?r.opts.map(mlOptHTML):[],html:true,kind:'ml'}),
  valid:(r,a)=>!!r.q&&Number.isInteger(a)&&a>=0&&a<r.opts.length,
  input:mcInput,locked:mcLocked,pReveal:mcPReveal,
  score:(r,a)=>({acc:a===r.c?1:0}),publicReveal:r=>({c:r.c}),
  ringLabel:r=>({label:LET[r.c]||'✓',sub:'is right',fill:COLS[r.c]||'--green'}),
}));
const MLTOPIC={meter:'Meter',grouping:'Grouping',poly:'Polyrhythm',polymeter:'Polymeter',pattern:'Pattern',swing:'Swing'};

/* ---------- THE SAMPLE CHRONOLOGIST ---------- */
/* Real recordings by decade (data/content.js → ERA_DECADES), plus the teacher's own clips,
   kept in this browser only (IndexedDB). Decades with nothing real fall back to the
   synthesised re-creations in js/audio.js (ERAS). */
const ERA_SYNTH={1950:1955,1960:1965,1970:1977,1980:1985,1990:1994,2000:2004,2010:2013,2020:2022};
const decLabel=d=>(ERA_DECADES[d]&&ERA_DECADES[d].label)||d+'s';
const MYCLIPS={list:[],ready:null};
const clipDB=(()=>{let dbp=null;const db=()=>dbp||(dbp=new Promise((res,rej)=>{const q=indexedDB.open('controlroom-clips',1);q.onupgradeneeded=()=>q.result.createObjectStore('clips',{keyPath:'id'});q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);}));
  const tx=(mode,fn)=>db().then(d=>new Promise((res,rej)=>{const t=d.transaction('clips',mode),st=t.objectStore('clips'),r=fn(st);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error);}));
  return {all:()=>tx('readonly',st=>st.getAll()),put:c=>tx('readwrite',st=>st.put(c)),del:id=>tx('readwrite',st=>st.delete(id))};})();
function loadMyClips(){return MYCLIPS.ready=clipDB.all().then(l=>{MYCLIPS.list=(l||[]).sort((a,b)=>a.dec-b.dec||a.at-b.at);return MYCLIPS.list;}).catch(()=>MYCLIPS.list=[]);}
if(ROLE==='host'&&window.indexedDB)loadMyClips();
function clipBuffer(c){if(c.src)return sampleReady(c.src);const k='my:'+c.id;if(AU.smp[k])return AU.smp[k];
  return AU.smp[k]=c.blob.arrayBuffer().then(b=>new Promise((res,rej)=>audio().decodeAudioData(b,res,rej))).catch(e=>{delete AU.smp[k];throw e;});}
/* your own songs play a different moment each time: up to 6 windows spread across the song (8 % to 88 %),
   the least-played window first (localStorage chrono.win = {clip id: [plays per window]}) */
const CH_LEN=7;
const chWins=()=>store.get('chrono.win',{});
const chPlays=id=>(chWins()[id]||[]).reduce((a,b)=>a+b,0);
function chWindow(c,dur){const n=Math.max(1,Math.min(6,Math.floor((dur-CH_LEN)/12))),W=chWins(),cnt=(W[c.id]||[]).slice(0,n);while(cnt.length<n)cnt.push(0);
  const min=Math.min(...cnt),k=pick(cnt.map((x,i)=>x===min?i:-1).filter(i=>i>=0));cnt[k]++;W[c.id]=cnt;store.set('chrono.win',W);
  const span=Math.max(0,dur-CH_LEN);return n===1?Math.min(span,dur*.3):Math.min(span,dur*(.08+.8*k/(n-1)));}
function erasPool(o){const pool={};
  if(o.src!=='synth'){Object.entries(ERA_DECADES).forEach(([d,e])=>{if(e.clips.length)pool[d]=e.clips.map(c=>({...c,kind:'real'}));});
    MYCLIPS.list.filter(c=>c.dec>=1900).forEach(c=>{(pool[c.dec]=pool[c.dec]||[]).push({id:c.id,blob:c.blob,title:c.name.replace(/\.[a-z0-9]+$/i,''),credit:'From your own collection · kept in this browser',kind:'mine'});});}
  if(o.src==='synth'||Object.keys(pool).length<4)Object.entries(ERA_SYNTH).forEach(([d,y])=>{if(!pool[d])pool[d]=[{synth:y,title:'Re-created in the browser',kind:'synth'}];});
  return pool;}
game(roundGame({
  id:'chrono',noWord:'Not quite',group:'ears',name:'The Sample Chronologist',tag:'Four real recordings, four decades. Put them in order, oldest to newest.',
  how:['Four short clips play one after another, each recorded in a different decade.','On your phone, tap the shapes from oldest to newest.','Listen for the tells: horn or microphone, hiss, bandwidth, stereo, loudness. Every pair in the right order scores.'],
  badges:['Scored','Listening','History'],speed:.2,okAt:.99,closeAt:.5,yesWord:'Time lord!',
  icon:`<svg viewBox="0 0 64 64"><line x1="4" y1="48" x2="60" y2="48" stroke="var(--ink)" stroke-width="4"/>${[0,1,2,3].map(i=>`<rect x="${6+i*14}" y="${34-i*8}" width="10" height="${14+i*8}" fill="var(${COLS[i]})" stroke="var(--ink)" stroke-width="2.5"/>`).join('')}</svg>`,
  options:[{key:'src',label:'Sound',choices:[['real','Real recordings','plus your own clips'],['synth','Re-created','same idea, 1950s–2020s']],def:'real'},
    {key:'n',label:'Rounds',choices:[[3,'3'],[4,'4'],[5,'5']],def:4},{key:'secs',label:'Answer time',choices:[[30,'30','seconds'],[45,'45','seconds'],[0,'OFF','no clock']],def:45}],
  note:'Real recordings are public domain or Creative Commons, from Wikimedia Commons (credits in audio/eras/CREDITS.txt). The 1960s–1990s are still under copyright, so add your own clips for those decades below. They stay in this browser and are never uploaded. Decades with no real clip use the browser re-creation.',
  setupExtra(v){if(v.src==='synth')return '';const mine=MYCLIPS.list,decs=Object.keys(ERA_DECADES).map(Number);
    const yours=mine.filter(c=>c.dec>=1900).length;
    return `<div class="fsec myclips"><h3><b>+</b>Your own music<small>${yours} songs · stay in this browser, never uploaded</small></h3>
      <div class="chimport"><label class="big go">Load a music folder<input type="file" id="chFolder" webkitdirectory multiple hidden></label>
        <p class="fine">Pick a folder with one subfolder per decade (1900s, 1910s … 2020s), or songs with the year in the name, like “Artist – Title (1958).mp3”. MP3, M4A, WAV, WebM.</p>
        <span class="chprog" id="chProg"></span>${yours?'<button class="ghost" id="chClear">Remove all your songs</button>':''}</div><div class="mydecs">${decs.map(d=>{const e=ERA_DECADES[d],m=mine.filter(c=>c.dec===d);
      return `<div class="mydec ${e.clips.length+m.length?'':'empty'}"><b>${esc(e.label)}</b><span>${e.clips.length} built in${m.length?` · ${m.length} yours`:''}</span>${m.length>4?'':m.map(c=>`<em title="${esc(c.name)}">${esc(c.name.replace(/\.[a-z0-9]+$/i,''))}<button data-del="${esc(c.id)}" aria-label="Remove">×</button></em>`).join('')}<label class="ghost">+ add<input type="file" accept="audio/*" multiple hidden data-dec="${d}"></label></div>`;}).join('')}</div>
      <p class="fine">Whole songs are fine: each one plays a different 7-second moment every time, up to six per song.</p></div>`;},
  setupBind(st,redraw){
    // a whole folder at once: the decade comes from a "1970s" folder in the path, else the year in the file name
    const fo=$('#chFolder',st);if(fo)fo.onchange=async()=>{const files=[...fo.files].filter(f=>/\.(mp3|m4a|aac|wav|webm|ogg|oga|flac)$/i.test(f.name));const prog=$('#chProg',st);let n=0,skip=0;
      for(const f of files){const path=f.webkitRelativePath||f.name,m=path.match(/(?:^|\/)(\d{3})0s(?:\/|$)/),y=m?+(m[1]+'0'):+((f.name.match(/\b(1[89]\d\d|20[0-2]\d)\b/)||[])[1]||0);
        const dec=Math.floor(y/10)*10;if(!ERA_DECADES[dec]){skip++;continue;}
        await clipDB.put({id:'ch:'+path,dec,name:f.name,blob:f,at:Date.now()+n});n++;if(prog)prog.textContent=`Saving ${n} of ${files.length}…`;}
      await loadMyClips();toast(`${n} songs saved in this browser${skip?` · ${skip} without a decade skipped`:''}`);redraw();};
    const cl=$('#chClear',st);if(cl)cl.onclick=async()=>{if(!confirm('Remove all your songs from this browser?'))return;for(const c of MYCLIPS.list.filter(c=>c.dec>=1900))await clipDB.del(c.id);await loadMyClips();redraw();};
    $$('.myclips input[type=file][data-dec]',st).forEach(inp=>inp.onchange=async()=>{const dec=+inp.dataset.dec;
      for(const f of inp.files){if(f.size>40e6){toast(f.name+' is over 40 MB');continue;}await clipDB.put({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),dec,name:f.name,blob:f,at:Date.now()});}
      await loadMyClips();toast('Saved in this browser');redraw();});
    $$('.myclips [data-del]',st).forEach(b=>b.onclick=async()=>{await clipDB.del(b.dataset.del);await loadMyClips();redraw();});},
  // the order buttons open on the phones with the first clip; the clock covers the listening plus the answer time
  prepMs:()=>1200,prepLabel:'READY',prepSub:'four decades',
  prepText:()=>({big:'Four clips',small:'Clip A starts in a moment. Tap the order as you listen.'}),
  secs:o=>o.secs?o.secs+31:0,
  build(o){const pool=erasPool(o),decs=Object.keys(pool).map(Number),used=new Set();
    return [...Array(o.n)].map(()=>{const pick4=shuffle(decs).slice(0,4);
      const items=pick4.map(d=>{const fresh=pool[d].filter(c=>!used.has(c)),L=fresh.length?fresh:pool[d],lo=Math.min(...L.map(x=>x.kind==='mine'?chPlays(x.id):0)),c=pick(L.filter(x=>(x.kind==='mine'?chPlays(x.id):0)===lo));used.add(c);if(!c.synth)clipBuffer(c).catch(()=>{});return {dec:d,clip:c};});
      return {eras:pick4,items};});},
  playCard(k){const s=G.gs,r=s.rounds[s.i],it=r.items[k],c=it.clip,i=s.i;s.playing=k;$$('.ccard').forEach((x,j)=>x.classList.toggle('playing',j===k));
    if(c.synth){setAud(playEra(c.synth));return;}
    stopAud();clipBuffer(c).then(buf=>{if(G.gs!==s||s.i!==i||s.playing!==k)return;if(c.kind==='mine'&&it.off==null)it.off=chWindow(c,buf.duration);setAud(playSample(buf,AU.music,{gain:c.gain||.9,maxDur:CH_LEN,offset:it.off||0}));})
      .catch(()=>{toast('Could not play clip '+LET[k]);if(ERA_SYNTH[it.dec])setAud(playEra(ERA_SYNTH[it.dec]));});},
  onOpen(r){const s=G.gs,i=s.i;[0,1,2,3].forEach(k=>later(()=>{if(G.gs===s&&s.i===i&&s.phase==='open')this.playCard(k);},200+k*7600));},
  leave(){stopAud();},
  replay(){const s=G.gs;this.playCard(((s.playing??-1)+1)%4);},replayLabel:'Play next clip',
  stage(m,r,ctx){m.innerHTML=`<div class="chrono"><h2 class="qtext">${ctx.phase==='prep'?'Four clips coming up':'Listen, then order them oldest to newest on your phone'}</h2><div class="ccards">${r.eras.map((y,k)=>`<button class="ccard c${k}" data-k="${k}">${shape(k,56,'var(--ink)','var(--c)')}<b>${LET[k]}</b><span>click to play</span></button>`).join('')}</div></div>`;
    $$('.ccard',m).forEach(b=>b.onclick=()=>this.playCard(+b.dataset.k));},
  reveal(m,r,ctx){const order=r.items.map((it,k)=>[it,k]).sort((a,b)=>a[0].dec-b[0].dec),n=Math.max(1,ctx.list.length),exact=ctx.list.filter(x=>x.res&&x.res.acc===1).length;
    m.innerHTML=`<div class="chrono rev"><h2 class="qtext">The timeline · ${Math.round(100*exact/n)}% got the exact order</h2><div class="timeline">${order.map(([it,k])=>{const c=it.clip,e=ERA_DECADES[it.dec]||{};
      return `<div class="tcard c${k}" data-k="${k}">${shape(k,40,'var(--ink)','var(--c)')}<b>${esc(decLabel(it.dec))}</b>${c.kind!=='synth'?`<strong>${esc(c.title)}</strong>`:''}<p>${esc(c.kind==='synth'?(ERAS[c.synth]||{}).tells||'':e.tells||'')}</p><small class="credit">${esc(c.kind==='synth'?'Re-created in the browser':c.credit||'')}</small></div>`;}).join('')}</div></div>`;
    $$('.tcard',m).forEach(b=>b.onclick=()=>this.playCard(+b.dataset.k));},
  ringLabel:()=>({label:'⟶',fill:'--yel'}),
  public:()=>({}),valid:(r,a)=>Array.isArray(a)&&a.length===4&&new Set(a).size===4,
  input(root,pub,submit){
    const ord=[];const draw=()=>{root.innerHTML=`<div class="porder"><p class="lab">Tap oldest first</p><div class="pslots">${[0,1,2,3].map(i=>`<div class="pslot">${ord[i]!=null?shape(ord[i],44,'var(--ink)',`var(${COLS[ord[i]]})`):`<span>${i+1}</span>`}</div>`).join('<i>→</i>')}</div>
      <div class="pchoices">${[0,1,2,3].map(k=>`<button class="pchoice c${k}" data-k="${k}" ${ord.includes(k)?'disabled':''}>${shape(k,48,'var(--ink)','var(--c)')}<b>${LET[k]}</b></button>`).join('')}</div>
      <div class="frow pcenterrow"><button class="ghost" id="pUndo" ${ord.length?'':'disabled'}>Undo</button><button class="big go plock" ${ord.length===4?'':'disabled'}>Lock in</button></div></div>`;
      $$('.pchoice',root).forEach(b=>b.onclick=()=>{ord.push(+b.dataset.k);papi.vibe(10);draw();});$('#pUndo',root).onclick=()=>{ord.pop();draw();};$('.plock',root).onclick=()=>submit(ord.slice());};draw();
  },
  locked:(box,mine)=>{box.innerHTML=`<div class="pslots">${mine.map(k=>`<div class="pslot">${shape(k,40,'var(--ink)',`var(${COLS[k]})`)}</div>`).join('<i>→</i>')}</div>`;},
  score:(r,a)=>{const pos={};a.forEach((k,i)=>pos[k]=i);let ok=0;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){if((r.eras[i]<r.eras[j])===(pos[i]<pos[j]))ok++;}return {acc:ok/6,note:`${ok} of 6 pairs in the right order`};},
  publicReveal:r=>({order:r.eras.map((y,k)=>[y,k]).sort((a,b)=>a[0]-b[0]).map(([y,k])=>[k,decLabel(y)])}),
  pReveal:(box,st)=>{box.innerHTML=`<div class="pslots">${st.rv.order.map(([k,l])=>`<div class="pslot">${shape(k,36,'var(--ink)',`var(${COLS[k]})`)}<small>${esc(l)}</small></div>`).join('<i>→</i>')}</div>`;},
}));
