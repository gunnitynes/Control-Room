/* ====================================================================
   TRAIN YOUR EARS — the room listens to the big speakers, phones answer.
   Frequency Detective · Decay Guessr · Frequency Sculptor · Envelope
   Sculptor · Preset Archeologist · Ghost Note · Stereo Stage · Sample
   Chronologist. All audio comes from js/audio.js.
   ==================================================================== */
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
function pSlider(root,{min,max,log=true,fmt,name,marks=[],start=.5,lock='Lock in'},submit){
  let u=start;const val=()=>log?logU(min,max,u):min+(max-min)*u;
  root.innerHTML=`<div class="pslide"><div class="pread"><b class="sv"></b><span class="sn"></span></div>
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
    {key:'src',label:'Source',choices:[['mix','Full mix','the demo band'],['noise','Pink noise','easier']],def:'mix'},
    {key:'q',label:'Filter width',choices:[[2.5,'Wide','easier'],[5,'Narrow','classic'],[9,'Razor','hard']],def:5},
    {key:'n',label:'Rounds',choices:[[5,'5'],[8,'8'],[10,'10']],def:8},
    {key:'secs',label:'Answer time',choices:[[15,'15','seconds'],[25,'25','seconds'],[0,'OFF','no clock']],def:25},
  ],
  prepMs:7000,prepLabel:'HUNT',prepSub:'the filter moves',
  prepText:()=>({big:'Listen',small:'The filter is sweeping. Your slider appears when it stops.'}),
  secs:o=>o.secs,
  build:o=>shuffle([90,160,300,550,1000,1800,3200,5600,9000,12000]).slice(0,o.n).map(b=>({f:Math.round(b*rnd(.85,1.18)),start:pick([120,400,1500,6000])})),
  onPrep(r,o){const ac=audio(),bp=bq(ac,'bandpass',r.start,o.q),mk=gn(ac,o.src==='noise'?3:4.5);bp.connect(mk).connect(AU.music);
    const src=o.src==='noise'?playPink(bp):playDemo(bp,{rt:1.1});
    const n=96,c=new Float32Array(n);let w=Math.log2(r.start);for(let i=0;i<n;i++){const k=i/(n-1);w+=(Math.random()-.5)*.45;c[i]=Math.pow(2,lerp(w,Math.log2(r.f),Math.pow(k,2.2)));}c[n-1]=r.f;
    bp.frequency.setValueCurveAtTime(c,ac.currentTime+.15,6.4);
    setAud({bp,mk,stop(){src.stop();setTimeout(()=>{try{mk.disconnect();}catch(e){}},800);}});},
  leave:stopAud,
  replay(r,ph,o){const ac=audio(),bp=bq(ac,'bandpass',r.f,o.q),mk=gn(ac,o.src==='noise'?3:4.5),dry=gn(ac,0),sum=gn(ac,1);bp.connect(mk).connect(sum);dry.connect(sum);sum.connect(AU.music);
    const inp=gn(ac,1);inp.connect(bp);inp.connect(dry);const src=o.src==='noise'?playPink(inp):playDemo(inp,{rt:1.1});
    if(ph==='reveal'){const t=ac.currentTime+3.5;mk.gain.setValueAtTime(mk.gain.value,t);mk.gain.linearRampToValueAtTime(0,t+1.5);dry.gain.setValueAtTime(0,t);dry.gain.linearRampToValueAtTime(.9,t+1.5);toast('Filtered for 3 s, then the full mix');}
    setAud({stop(){src.stop();setTimeout(()=>{try{sum.disconnect();}catch(e){}},800);}});},
  replayLabel:'Hear it again',
  stage:(m,r,ctx)=>{m.innerHTML=listenStage(ctx.phase==='prep'?'The filter is hunting…':'Where did it stop?',ctx.phase==='prep'?'Follow the sound. It is about to park on one frequency.':'Lock in the frequency on your phone.',`<div class="zones">${FREQ_ZONES.slice(0,7).map(z=>`<span><b>${esc(z[2])}</b>${fmtHz(z[0])}–${fmtHz(z[1])}</span>`).join('')}</div>`);},
  reveal:(m,r,ctx)=>{m.innerHTML=`<div class="axwrap"><h2 class="qtext">It parked at <span class="hl">${fmtHz(r.f)}</span> — the ${esc(zoneOf(r.f).toLowerCase())}.</h2>${axisPlot({min:40,max:16000,fmt:fmtHz,marks:FREQ_MARKS},ctx.list,r.f,{truthLabel:zoneOf(r.f)})}<p class="fine">Press “Hear it again” to hear the band, then the full mix it came from.</p></div>`;},
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
  how:['A short sound plays three times in a mystery reverb.','Slide to the RT60: the seconds it takes the tail to fall 60 dB.','Close guesses score — every room on the slider is a clue.'],
  badges:['Scored','Listening'],speed:.15,okAt:.8,closeAt:.45,yesWord:'Nailed it!',
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="10" width="8" height="44" fill="var(--ink)"/><path d="M14 14 Q30 40 60 52" fill="none" stroke="var(--red)" stroke-width="5"/><path d="M14 30 Q28 46 60 54" fill="none" stroke="var(--blue)" stroke-width="3"/><line x1="4" y1="58" x2="60" y2="58" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'src',label:'Dry sound',choices:[['clap','Clap'],['snare','Snare'],['hey','Voice'],['chord','Guitar chord'],['mix','Mixed','changes every round']],def:'mix'},
    {key:'n',label:'Rounds',choices:[[5,'5'],[7,'7'],[9,'9']],def:7},
    {key:'secs',label:'Answer time',choices:[[15,'15','seconds'],[25,'25','seconds'],[0,'OFF','no clock']],def:15},
  ],
  prepMs:r=>Math.round((Math.max(1.1,r.rt*1.05+.4)*3+.6)*1000),prepLabel:'LISTEN',prepSub:'to the tail',
  prepText:()=>({big:'Listen to the tail',small:'Three hits. Your slider opens after the last one dies away.'}),
  secs:o=>o.secs,
  build:o=>shuffle([.3,.55,.9,1.4,2.1,3.2,4.8,7]).slice(0,o.n).map(b=>({rt:+(b*rnd(.88,1.14)).toFixed(2),src:o.src==='mix'?pick(['clap','snare','hey','chord']):o.src,pre:rnd(.005,.035),damp:rnd(.25,.6)})),
  onPrep(r){setAud(playDecay({rt:r.rt,src:r.src,pre:r.pre,damp:r.damp}));},leave:stopAud,
  replay(r){setAud(playDecay({rt:r.rt,src:r.src,pre:r.pre,damp:r.damp,hits:2}));},
  stage:(m,r,ctx)=>{m.innerHTML=listenStage(ctx.phase==='prep'?'Where are we?':'How long was the tail?',ctx.phase==='prep'?'Close your eyes. Picture the room.':'Slide to the decay time on your phone.',`<div class="zones">${ROOMS.slice(0,7).map((z,i)=>`<span><b>${esc(z[1].replace(/^an? /,''))}</b>${i?ROOMS[i-1][0]:0}–${z[0]} s</span>`).join('')}</div>`);},
  reveal:(m,r,ctx)=>{
    const W=900,H=220,X=t=>40+(W-60)*t/Math.max(8,r.rt*1.3),Y=db=>16+(H-50)*(-db/72);let d='';for(let i=0;i<=100;i++){const t=i/100*Math.max(8,r.rt*1.3);d+=(i?'L':'M')+X(t).toFixed(1)+' '+Y(Math.max(-72,-60*t/r.rt)).toFixed(1);}
    m.innerHTML=`<div class="axwrap"><h2 class="qtext">RT60 = <span class="hl">${fmtS(r.rt)}</span> — about ${esc(roomOf(r.rt))}.</h2>
      <svg class="decaysvg" viewBox="0 0 ${W} ${H}"><line x1="40" y1="${Y(-60)}" x2="${W-20}" y2="${Y(-60)}" stroke="var(--hair)" stroke-width="2" stroke-dasharray="6 6"/><text x="${W-24}" y="${Y(-60)-8}" text-anchor="end" font-family="Space Mono" font-size="14" fill="var(--ink2)">−60 dB</text>
        <path d="${d}" fill="none" stroke="var(--red)" stroke-width="5"/><circle cx="${X(r.rt)}" cy="${Y(-60)}" r="9" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/></svg>
      ${axisPlot({min:.2,max:10,fmt:fmtS,marks:RT_MARKS},ctx.list,r.rt,{truthLabel:roomOf(r.rt)})}</div>`;},
  ringLabel:r=>({label:fmtS(r.rt).replace(' ',''),fill:'--blue'}),
  public:()=>({}),valid:(r,a)=>a>0&&a<30,
  input:(root,pub,submit)=>pSlider(root,{min:.2,max:10,fmt:fmtS,name:s=>roomOf(s),marks:RT_MARKS,start:.45},submit),
  locked:(box,mine)=>{box.innerHTML=`<div class="bignum">${fmtS(mine)}</div><p>${esc(roomOf(mine))}</p>`;},
  score:(r,a)=>{const e=octErr(a,r.rt);return {acc:clamp(1-e/1.2,0,1),note:`${fmtS(a)} vs ${fmtS(r.rt)}`};},
  publicReveal:r=>({rt:r.rt}),
  pReveal:(box,st)=>{box.innerHTML=`<p>It was <b>${fmtS(st.rv.rt)}</b> — ${esc(roomOf(st.rv.rt))}.</p>`;},
}));

/* ---------- FREQUENCY SCULPTOR ---------- */
function eqGraphSVG({bump,cuts=[],W=900,H=260}){
  const X=f=>40+(W-60)*unLog(40,16000,f),bell=(f0,g,q)=>f=>{const x=Math.log2(f/f0)*q*1.4;return g*Math.exp(-x*x);};
  const curve=fn=>{let d='';for(let i=0;i<=200;i++){const f=logU(40,16000,i/200);d+=(i?'L':'M')+X(f).toFixed(1)+' '+(H/2-fn(f)*7).toFixed(1);}return d;};
  return `<svg class="eqsvg" viewBox="0 0 ${W} ${H}">${FREQ_MARKS.map(m=>`<line x1="${X(m.v)}" y1="10" x2="${X(m.v)}" y2="${H-24}" stroke="var(--hair)" stroke-width="1.5"/><text x="${X(m.v)}" y="${H-6}" text-anchor="middle" font-family="Space Mono" font-size="13" fill="var(--ink2)">${m.l}</text>`).join('')}
    <line x1="40" y1="${H/2}" x2="${W-20}" y2="${H/2}" stroke="var(--ink3)" stroke-width="2"/>
    ${cuts.map(c=>`<path d="${curve(bell(c.f,-12,2.5))}" fill="none" stroke="var(${COLS[c.sh%4]})" stroke-width="2" opacity=".55"/>`).join('')}
    ${bump?`<path d="${curve(bell(bump,12,2.5))}" fill="none" stroke="var(--red)" stroke-width="6"/><circle cx="${X(bump)}" cy="${H/2-84}" r="10" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/>`:''}</svg>`;
}
game(roundGame({
  id:'sculptor',noWord:'Missed it',group:'ears',name:'Frequency Sculptor',tag:'Something in the mix sounds wrong. Find it on the EQ and cut it.',
  how:['The mix plays with one ugly resonance boosted (boxy, harsh, muddy…).','Drag an EQ notch on your phone right onto the problem and lock it in.','The closer your cut, the more points. Then hear the room’s fix.'],
  badges:['Scored','Listening'],speed:.15,okAt:.78,closeAt:.45,yesWord:'Fixed it!',
  icon:`<svg viewBox="0 0 64 64"><path d="M4 32 L22 32 Q28 32 30 52 Q32 60 34 52 Q36 32 42 32 L60 32" fill="none" stroke="var(--ink)" stroke-width="4"/><circle cx="32" cy="54" r="7" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/><path d="M44 10 l10 10 M54 10 l-10 10" stroke="var(--ink)" stroke-width="4"/></svg>`,
  options:[
    {key:'n',label:'Rounds',choices:[[4,'4'],[6,'6'],[8,'8']],def:6},
    {key:'secs',label:'Answer time',choices:[[20,'20','seconds'],[30,'30','seconds'],[0,'OFF','no clock']],def:30},
  ],
  prepMs:5000,prepLabel:'LISTEN',prepSub:'for the flaw',
  prepText:()=>({big:'What’s wrong?',small:'Listen for the ugly bit. Your EQ appears in a moment.'}),
  secs:o=>o.secs,
  build:o=>shuffle(EQ_PROBLEMS).slice(0,o.n).map(p=>({...p,f:Math.round(p.f*rnd(.87,1.15))})),
  play(r,cut){const ac=audio(),pk=bq(ac,'peaking',r.f,2.5,12),c=bq(ac,'peaking',cut||1000,2.5,cut?-12:0),g=gn(ac,.7);pk.connect(c).connect(g).connect(AU.music);
    const src=playDemo(pk,{rt:1.1});setAud({stop(){src.stop();setTimeout(()=>{try{g.disconnect();}catch(e){}},800);}});},
  onPrep(r){this.play(r);},leave:stopAud,
  replay(r,ph){const s=G.gs;if(ph!=='reveal'){this.play(r);return;}
    const best=this.answers().sort((a,b)=>(b.res?.acc||0)-(a.res?.acc||0))[0];s.fixOn=!s.fixOn;
    if(s.fixOn&&best){this.play(r,+best.a);toast(`Fixed with ${best.p.name}'s cut at ${fmtHz(+best.a)}`);}else{this.play(r);toast('The flawed mix');}},
  replayLabel:'A/B the fix',
  stage:(m,r,ctx)=>{m.innerHTML=listenStage(ctx.phase==='prep'?'Something is off…':'Find it and cut it',ctx.phase==='prep'?'Boomy? Boxy? Harsh? Listen to where it lives.':'Drag the notch on your phone onto the problem.',eqGraphSVG({}));},
  reveal(m,r,ctx){m.innerHTML=`<div class="axwrap"><h2 class="qtext"><span class="hl">${esc(r.name)}</span> at ${fmtHz(r.f)} — ${esc(r.hint)}.</h2>${eqGraphSVG({bump:r.f,cuts:ctx.list.map(x=>({f:+x.a,sh:x.p.sh}))})}${axisPlot({min:40,max:16000,fmt:fmtHz,marks:FREQ_MARKS},ctx.list,r.f,{truthLabel:r.name})}<p class="fine">“A/B the fix” switches between the flawed mix and the best student’s cut.</p></div>`;G.gs.fixOn=false;},
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
  locked:(box,mine)=>{box.innerHTML=`<div class="bignum">−12 dB @ ${fmtHz(mine)}</div><p>${esc(zoneOf(mine))}</p>`;},
  score:(r,a)=>{const e=octErr(a,r.f);return {acc:clamp(1-e/1.4,0,1),note:`${fmtHz(a)} vs ${fmtHz(r.f)}`};},
  publicReveal:r=>({f:r.f,name:r.name,hint:r.hint}),
  pReveal:(box,st)=>{box.innerHTML=`<p><b>${esc(st.rv.name)}</b> at ${fmtHz(st.rv.f)} — ${esc(st.rv.hint)}.</p>`;},
}));

/* ---------- ENVELOPE SCULPTOR ---------- */
function adsrSVG(E,{W=200,H=90}={}){
  const sus=Math.max(.25,E.hold-E.a-E.d),tot=E.a+E.d+sus+E.r,X=t=>8+(W-16)*Math.pow(t/tot,.75),Y=v=>H-8-(H-18)*v;
  const pts=[[0,0],[E.a,1],[E.a+E.d,E.s],[E.a+E.d+sus,E.s],[tot,0]];
  return `<svg class="adsr" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><line x1="6" y1="${H-8}" x2="${W-6}" y2="${H-8}" stroke="var(--hair)" stroke-width="2"/><path d="${pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('')}" fill="color-mix(in srgb,currentColor 18%,transparent)" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>`;
}
game(roundGame(mcSpec({
  id:'envelope',group:'ears',name:'Envelope Sculptor',tag:'Hear a sound, pick its shape: attack, decay, sustain, release.',
  how:['One synth note plays — same tone every time, only its envelope changes.','Four ADSR shapes appear on your phone. Tap the one you heard.','Fast right answers score more.'],
  badges:['Scored','Listening'],speed:.4,htmlOpts:true,kind:'env',
  icon:`<svg viewBox="0 0 64 64"><path d="M4 56 L16 8 L28 30 L44 30 L60 56" fill="var(--yel)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/><line x1="4" y1="58" x2="60" y2="58" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[{key:'n',label:'Rounds',choices:[[6,'6'],[8,'8'],[10,'10']],def:8},{key:'secs',label:'Answer time',choices:[[12,'12','seconds'],[20,'20','seconds'],[0,'OFF','no clock']],def:20}],
  prepMs:r=>Math.round((r.E.hold+r.E.r*1.6)*1000+900),prepLabel:'LISTEN',prepSub:'to the shape',
  prepText:()=>({big:'Listen',small:'Watch the four shapes on the big screen while it plays.'}),
  secs:o=>o.secs,
  build:o=>shuffle(ENVELOPES).slice(0,o.n).map(E=>{const others=shuffle(ENVELOPES.filter(x=>x!==E)).slice(0,3);const order=shuffle([E,...others]);return {E,opts:order,c:order.indexOf(E)};}),
  onPrep(r){setAud(playEnvelope(r.E));},onOpen(r){later(()=>{if(G.gs&&G.gs.phase==='open')setAud(playEnvelope(r.E));},300);},leave:stopAud,
  replay(r){setAud(playEnvelope(r.E));},
  public:r=>({opts:r.opts.map(E=>adsrSVG(E)),html:true,kind:'env'}),
  stage:(m,r,ctx)=>{m.innerHTML=`<div class="mc"><h2 class="qtext">Which envelope is this?</h2>${mcTiles({...r,opts:r.opts},{...ctx,phase:ctx.phase==='prep'?'open':ctx.phase},{optHTML:E=>adsrSVG(E)})}</div>`;},
  reveal:(m,r,ctx)=>{m.innerHTML=`<div class="mc reveal"><h2 class="qtext"><span class="hl">${esc(r.E.name)}</span> · A ${r.E.a}s · D ${r.E.d}s · S ${Math.round(r.E.s*100)}% · R ${r.E.r}s</h2>${mcTiles(r,ctx,{optHTML:E=>adsrSVG(E)+`<small>${esc(E.name)}</small>`})}</div>`;animateBars(m);},
})));

/* ---------- PRESET ARCHEOLOGIST ---------- */
game(roundGame(mcSpec({
  id:'presets',group:'ears',name:'Preset Archeologist',tag:'Dig up a legendary sound. Which machine made it famous?',
  how:['A classic machine sound plays on the big speakers (recreated live in the browser).','Race to pick the instrument from four on your phone.','The reveal brings the year and the story.'],
  badges:['Scored','Listening','History'],speed:.5,
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="40" width="56" height="18" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/><rect x="4" y="24" width="56" height="16" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><rect x="18" y="6" width="28" height="22" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><circle cx="27" cy="17" r="4" fill="var(--paper)"/><circle cx="37" cy="17" r="4" fill="var(--red)"/></svg>`,
  options:[{key:'n',label:'Rounds',choices:[[6,'6'],[8,'8','all of them']],def:8},{key:'secs',label:'Answer time',choices:[[12,'12','seconds'],[20,'20','seconds']],def:20}],
  note:'These are recreations synthesised in the browser, not the original samples.',
  prepMs:3500,prepLabel:'DIG',prepSub:'listen',
  prepText:()=>({big:'Listen…',small:'Which machine is this? The answers open in a moment.'}),
  secs:o=>o.secs,
  build:o=>shuffle(PRESETS).slice(0,o.n).map(P=>{const decoys=shuffle([...PRESETS.filter(x=>x!==P).map(x=>x.name),...PRESET_DECOYS]).slice(0,3);const order=shuffle([P.name,...decoys]);return {P,opts:order,c:order.indexOf(P.name)};}),
  onPrep(r){setAud(playMachine(r.P.id));},leave:stopAud,replay(r){setAud(playMachine(r.P.id));},
  stage:(m,r,ctx)=>{m.innerHTML=`<div class="mc"><div class="dig"><span></span><span></span><span></span><b>?</b></div><h2 class="qtext">Which machine is this?</h2>${mcTiles(r,ctx)}</div>`;},
  reveal:(m,r,ctx)=>{m.innerHTML=`<div class="mc reveal"><div class="artifact"><b>${r.P.year}</b><div><h3>${esc(r.P.name)}</h3><p>${esc(r.P.what)} · ${esc(r.P.fact)}</p></div></div>${mcTiles(r,ctx)}</div>`;animateBars(m);},
})));

/* ---------- GHOST NOTE ---------- */
const LANE_NAME={kick:'Kick',snare:'Snare',hat:'Hat',clave:'Clave',bass:'Bass',cowbell:'Cowbell',clap:'Clap'};
function gridHTML(lanes,{heat,cur,mine,truth=true}={}){
  return `<div class="g16">${lanes.map(([l,s])=>`<div class="glane"><span class="gname">${esc(LANE_NAME[l]||l)}</span>${[...Array(16)].map((_,i)=>{const on=truth&&s[i]==='x',h=heat?heat[l][i]:0;
    return `<i class="gc ${i%4===0?'beat':''} ${on?'on':''} ${cur===i?'cur':''}" style="--h:${h}">${heat&&h>0?`<em>${Math.round(h*100)}</em>`:''}</i>`;}).join('')}</div>`).join('')}<div class="gnums"><span></span>${[...Array(16)].map((_,i)=>`<b>${i%4===0?i/4+1:'·'}</b>`).join('')}</div></div>`;
}
game(roundGame({
  id:'ghost',noWord:'Not quite',group:'ears',name:'The Ghost Note',tag:'Hear a groove for four bars. Then rebuild it from memory on a 16-step grid.',
  how:['A one-bar count-in, then a syncopated groove loops four times.','The sound stops. An empty 16-step grid appears on your phone.','Tap in every hit you remember. Wrong taps and missed hits both cost.'],
  badges:['Scored','Rhythm'],speed:.2,okAt:.99,closeAt:.6,yesWord:'Perfect!',
  icon:`<svg viewBox="0 0 64 64">${[0,1,2,3].map(r=>[0,1,2,3].map(c=>`<rect x="${4+c*15}" y="${4+r*15}" width="12" height="12" fill="${(r*4+c)%5===0||(r*4+c)%7===3?'var(--red)':'var(--paper)'}" stroke="var(--ink)" stroke-width="2.5"/>`).join('')).join('')}</svg>`,
  options:[
    {key:'level',label:'Difficulty',choices:[[1,'One lane','clave, bass…'],[2,'Two lanes','kick + snare'],[3,'Three lanes','+ hats'],[0,'Climb','gets harder']],def:0},
    {key:'n',label:'Rounds',choices:[[4,'4'],[6,'6'],[8,'8']],def:6},
    {key:'secs',label:'Answer time',choices:[[30,'30','seconds'],[45,'45','seconds'],[0,'OFF','no clock']],def:45},
  ],
  prepMs:r=>Math.round(5*16*60/r.g.bpm/4*1000+700),prepLabel:'LISTEN',prepSub:'memorise it',
  prepText:r=>({big:'Memorise it',small:`${Object.keys(r.g.lanes).map(l=>LANE_NAME[l]).join(' + ')} — one bar of count-in, then four bars.`}),
  secs:o=>o.secs,
  build:o=>{const by=l=>shuffle(GROOVES.filter(g=>g.level===l));if(o.level){let p=by(o.level);while(p.length<o.n)p=p.concat(by(o.level));return p.slice(0,o.n).map(g=>({g}));}
    const out=[];const a=by(1),b=by(2),c=by(3);for(let i=0;i<o.n;i++){const k=i/o.n;out.push({g:(k<.34?a:k<.67?b:c).shift()||pick(GROOVES)});}return out;},
  roundInfo:r=>r.g.name,
  onPrep(r){const s=G.gs;s.cur=-1;setAud(playGroove(r.g,{bars:4,onStep:st=>{if(G.gs!==s)return;s.cur=st<16?-1:(st-16)%16;$$('.gc',$('#rgm')).forEach(c=>c.classList.remove('cur'));if(s.cur>=0)$$('.glane',$('#rgm')).forEach(l=>{const c=l.children[s.cur+1];if(c)c.classList.add('cur');});}}));},
  leave:stopAud,
  replay(r,ph){const s=G.gs;setAud(playGroove(r.g,{bars:2,countIn:false,onStep:st=>{if(G.gs!==s)return;const k=st%16;$$('.gc',$('#rgm')).forEach(c=>c.classList.remove('cur'));$$('.glane',$('#rgm')).forEach(l=>{const c=l.children[k+1];if(c)c.classList.add('cur');});}}));},
  stage:(m,r,ctx)=>{m.innerHTML=`<div class="ghostw"><h2 class="qtext">${ctx.phase==='prep'?'Listen. Memorise.':'Rebuild it on your phone'}</h2>${gridHTML(Object.entries(r.g.lanes),{truth:false})}<p class="fine">${esc(r.g.name)} · ${r.g.bpm} BPM</p></div>`;},
  reveal:(m,r,ctx)=>{const n=Math.max(1,ctx.list.length),heat={};Object.entries(r.g.lanes).forEach(([l])=>{heat[l]=[...Array(16)].map((_,i)=>ctx.list.filter(x=>x.a&&x.a[l]&&x.a[l][i]).length/n);});
    m.innerHTML=`<div class="ghostw rev"><h2 class="qtext"><span class="hl">${esc(r.g.name)}</span> — the real pattern, with how the room remembered it</h2>${gridHTML(Object.entries(r.g.lanes),{heat})}<p class="fine">Filled cells are the real hits; the shading and numbers show what % of the room tapped each step. Press “Play again” to follow along.</p></div>`;},
  ringLabel:()=>({label:'♩',fill:'--red'}),
  public:r=>({lanes:Object.keys(r.g.lanes)}),
  valid:(r,a)=>a&&typeof a==='object',
  input(root,pub,submit){
    const st={};pub.lanes.forEach(l=>st[l]=Array(16).fill(0));
    root.innerHTML=`<div class="pgrid">${pub.lanes.map(l=>`<div class="plane"><span>${esc(LANE_NAME[l]||l)}</span><div class="pcells">${[...Array(16)].map((_,i)=>`<button class="pc ${i%4===0?'beat':''}" data-l="${l}" data-i="${i}"></button>`).join('')}</div></div>`).join('')}
      <div class="pnums"><span></span><div>${[1,2,3,4].map(n=>`<b>${n}</b>`).join('')}</div></div></div><div class="frow pcenterrow"><button class="ghost" id="pClr">Clear</button><button class="big go plock">Lock in</button></div>`;
    $$('.pc',root).forEach(b=>b.onclick=()=>{const l=b.dataset.l,i=+b.dataset.i;st[l][i]^=1;b.classList.toggle('on',!!st[l][i]);papi.vibe(8);});
    $('#pClr',root).onclick=()=>{pub.lanes.forEach(l=>st[l].fill(0));$$('.pc',root).forEach(b=>b.classList.remove('on'));};
    $('.plock',root).onclick=()=>submit(st);
  },
  locked:(box,mine,pub)=>{box.innerHTML=`<div class="minigrid">${pub.lanes.map(l=>`<div>${(mine[l]||[]).map(v=>`<i class="${v?'on':''}"></i>`).join('')}</div>`).join('')}</div>`;},
  score:(r,a)=>{let tp=0,fp=0,fn=0;Object.entries(r.g.lanes).forEach(([l,s])=>{const m=a[l]||[];for(let i=0;i<16;i++){const t=s[i]==='x',u=!!m[i];if(t&&u)tp++;else if(u)fp++;else if(t)fn++;}});
    return {acc:tp?2*tp/(2*tp+fp+fn):0,note:`${tp} hits right · ${fn} missed · ${fp} extra`};},
  publicReveal:r=>({lanes:r.g.lanes}),
  pReveal:(box,st)=>{box.innerHTML=`<div class="minigrid truth">${Object.entries(st.rv.lanes).map(([l,s])=>`<div>${[...s].map((c,i)=>`<i class="${c==='x'?'on':''} ${st.mine&&st.mine[l]&&st.mine[l][i]?(c==='x'?'hit':'extra'):''}"></i>`).join('')}</div>`).join('')}</div><p class="lab">white = the real hits · yellow box = your taps</p>`;},
}));

/* ---------- THE STEREO STAGE ---------- */
const STAGE_INST=['vocal','kick','snare','hats','bass','guitar','pads'];
const STAGE_RULE={vocal:{x:0,tol:.12,y:[0,.35],role:'the lead vocal'},kick:{x:0,tol:.12,y:[0,.5],role:'the kick'},bass:{x:0,tol:.12,y:[0,.6],role:'the bass'},snare:{x:0,tol:.2,y:[0,.55],role:'the snare'},
  hats:{side:[.2,.8],y:[.2,.75],role:'the hi-hats'},guitar:{side:[.3,1],y:[.15,.7],role:'the guitar'},pads:{side:[0,1],y:[.55,1],role:'the pads'}};
const STAGE_MASK=[['guitar','vocal'],['pads','vocal'],['guitar','pads'],['snare','vocal'],['hats','guitar']];
function stageScore(L){
  const pen=[];let s=1;
  STAGE_INST.forEach(n=>{const p=L[n],R=STAGE_RULE[n];if(!p){s-=.15;pen.push(`${DEMO.inst[n]} wasn't placed`);return;}
    if(R.x!=null&&Math.abs(p.x)>R.tol){const d=Math.min(.18,(Math.abs(p.x)-R.tol)*.4);s-=d;pen.push([d,`Keep ${R.role} centred`]);}
    if(R.side&&(Math.abs(p.x)<R.side[0]||Math.abs(p.x)>R.side[1])){const d=.08;s-=d;pen.push([d,`Pan ${R.role} off-centre`]);}
    if(p.y<R.y[0]||p.y>R.y[1]){const d=.07;s-=d;pen.push([d,p.y>R.y[1]?`Bring ${R.role} forward`:`Push ${R.role} further back`]);}});
  STAGE_MASK.forEach(([a,b])=>{const A=L[a],B=L[b];if(!A||!B)return;const d=Math.hypot(A.x-B.x,(A.y-B.y)*.8);if(d<.25){const k=(.25-d)*.5;s-=k;pen.push([k,`${DEMO.inst[a]} masks ${DEMO.inst[b].toLowerCase()} — move them apart`]);}});
  const sides=['hats','guitar'].map(n=>L[n]).filter(Boolean);if(sides.length===2&&Math.sign(sides[0].x)===Math.sign(sides[1].x)&&Math.abs(sides[0].x)>.15){s-=.08;pen.push([.08,'Hats and guitar on the same side — balance the stage']);}
  const notes=pen.filter(Array.isArray).sort((a,b)=>b[0]-a[0]).map(x=>x[1]).concat(pen.filter(x=>!Array.isArray(x)));
  return {acc:clamp(s,0,1),note:notes[0]||'A clean, balanced stage',notes:notes.slice(0,3)};
}
const layoutAudio=L=>Object.fromEntries(STAGE_INST.map(n=>{const p=L[n]||{x:0,y:.3};return [n,{pan:p.x,send:.04+p.y*.55,gain:1-p.y*.35,lp:18000-p.y*12000}];}));
function stageMapHTML(list,avg){
  return `<div class="smap"><div class="smgrid"><span class="lab sl">L</span><span class="lab sr">R</span><span class="lab sb">BACK</span><span class="lab sf">FRONT · listener</span>
    ${list.flatMap(x=>STAGE_INST.map(n=>x.a&&x.a[n]?`<i class="sdot i-${n}" style="left:${50+x.a[n].x*50}%;top:${100-(1-x.a[n].y)*100}%"></i>`:'')).join('')}
    ${avg?STAGE_INST.map(n=>avg[n]?`<b class="stok i-${n}" style="left:${50+avg[n].x*50}%;top:${100-(1-avg[n].y)*100}%">${esc(DEMO.inst[n])}</b>`:'').join(''):''}</div></div>`;
}
const avgLayout=list=>{const out={};STAGE_INST.forEach(n=>{const ps=list.map(x=>x.a&&x.a[n]).filter(Boolean);if(ps.length)out[n]={x:ps.reduce((a,p)=>a+p.x,0)/ps.length,y:ps.reduce((a,p)=>a+p.y,0)/ps.length};});return out;};
game(roundGame({
  id:'stereo',noWord:'Not quite',group:'ears',name:'The Stereo Stage',tag:'Treat the stereo field like a floor plan. Place the band, then hear your mix.',
  how:['A dense band loop plays with every instrument stacked in the centre.','Drag each instrument onto the stage on your phone: left to right, front to back.','Points for a clean, balanced layout with nothing masking — then the room hears the best mix.'],
  badges:['Scored','Mixing'],speed:0,okAt:.85,closeAt:.55,yesWord:'Clean mix!',
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><line x1="32" y1="4" x2="32" y2="60" stroke="var(--hair)" stroke-width="2"/><circle cx="32" cy="46" r="7" fill="var(--red)" stroke="var(--ink)" stroke-width="2.5"/><rect x="10" y="20" width="12" height="12" fill="var(--blue)" stroke="var(--ink)" stroke-width="2.5"/><polygon points="48,16 56,30 40,30" fill="var(--yel)" stroke="var(--ink)" stroke-width="2.5"/></svg>`,
  options:[{key:'n',label:'Rounds',choices:[[1,'1'],[2,'2','mix it twice']],def:1},{key:'secs',label:'Time to place',choices:[[60,'60','seconds'],[90,'90','seconds'],[0,'OFF','no clock']],def:90}],
  prepMs:4000,prepLabel:'HEAR',prepSub:'the pile-up',
  prepText:()=>({big:'Hear the pile-up',small:'Everything is in the middle. Your stage opens in a moment.'}),
  secs:o=>o.secs,build:o=>[...Array(o.n)].map((_,i)=>({i})),
  onPrep(){setAud(playDemo(AU.music,{layout:Object.fromEntries(STAGE_INST.map(n=>[n,{pan:0,send:.05}]))}));},
  leave:stopAud,
  replay(r,ph){const s=G.gs,list=this.answers();if(ph!=='reveal'||!list.length){setAud(playDemo(AU.music,{layout:Object.fromEntries(STAGE_INST.map(n=>[n,{pan:0,send:.05}]))}));toast('Everything centred');return;}
    s.mixMode=((s.mixMode??-1)+1)%3;const best=list.slice().sort((a,b)=>(b.res?.acc||0)-(a.res?.acc||0))[0];
    const L=s.mixMode===0?best.a:s.mixMode===1?avgLayout(list):Object.fromEntries(STAGE_INST.map(n=>[n,{x:0,y:.2}]));
    setAud(playDemo(AU.music,{layout:layoutAudio(L)}));toast(['Best mix: '+best.p.name,'The room’s average mix','Everything centred (before)'][s.mixMode]);},
  replayLabel:'Play: best / average / centred',
  stage:(m,r,ctx)=>{m.innerHTML=`<div class="stagew"><h2 class="qtext">${ctx.phase==='prep'?'Seven instruments, all in one spot':'Build the stage on your phone'}</h2>${stageMapHTML([],Object.fromEntries(STAGE_INST.map((n,i)=>[n,{x:(i-3)*.04,y:.15}])))}</div>`;},
  reveal:(m,r,ctx)=>{const best=ctx.list.slice().sort((a,b)=>(b.res?.acc||0)-(a.res?.acc||0))[0];
    m.innerHTML=`<div class="stagew"><h2 class="qtext">The room’s stage${best?` · best mix by <span class="hl">${esc(best.p.name)}</span>`:''}</h2>${stageMapHTML(ctx.list,avgLayout(ctx.list))}<p class="fine">Small dots: every placement. Labels: the room's average. “Play” cycles the best mix, the average mix and the centred pile-up.</p></div>`;},
  ringLabel:()=>({label:'L·R',fill:'--blue'}),
  public:()=>({inst:STAGE_INST.map(n=>[n,DEMO.inst[n]])}),
  valid:(r,a)=>a&&typeof a==='object',
  input(root,pub,submit){
    const L={};let sel=null;
    root.innerHTML=`<div class="pstage"><div class="psgrid"><span class="lab sl">L</span><span class="lab sr">R</span><span class="lab sb">BACK</span><span class="lab sf">FRONT · you</span></div>
      <div class="ptray">${pub.inst.map(([n,l])=>`<button class="ptok i-${n}" data-n="${n}">${esc(l)}</button>`).join('')}</div><button class="big go plock" disabled>Lock in my stage</button></div>`;
    const grid=$('.psgrid',root),tray=$('.ptray',root);
    const place=(n,x,y)=>{L[n]={x:+clamp(x,-1,1).toFixed(3),y:+clamp(y,0,1).toFixed(3)};const b=$(`.ptok[data-n="${n}"]`,root);if(b.parentNode!==grid)grid.appendChild(b);b.classList.add('placed');b.style.left=(50+L[n].x*50)+'%';b.style.top=((1-L[n].y)*100)+'%';
      $('.plock',root).disabled=Object.keys(L).length<pub.inst.length;};
    const pos=e=>{const b=grid.getBoundingClientRect();return {x:((e.clientX-b.left)/b.width)*2-1,y:1-(e.clientY-b.top)/b.height,inside:e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom};};
    // placed tokens drag inside the stage; tray tokens follow the finger and land on release (or tap one, then tap the stage)
    $$('.ptok',root).forEach(b=>{let x0=0,y0=0;
      b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);x0=e.clientX;y0=e.clientY;b.classList.add('drag');sel=b.dataset.n;$$('.ptok',root).forEach(x=>x.classList.toggle('sel',x===b));});
      b.addEventListener('pointermove',e=>{if(!b.hasPointerCapture(e.pointerId))return;const p=pos(e);
        if(b.parentNode===grid){if(p.inside)place(b.dataset.n,p.x,p.y);}else b.style.transform=`translate(${e.clientX-x0}px,${e.clientY-y0}px)`;});
      b.addEventListener('pointerup',e=>{b.classList.remove('drag');b.style.transform='';const p=pos(e);if(p.inside){place(b.dataset.n,p.x,p.y);papi.vibe(10);}});
    });
    grid.addEventListener('click',e=>{if(e.target.closest('.ptok')||!sel)return;const p=pos(e);place(sel,p.x,p.y);});
    $('.plock',root).onclick=()=>submit(L);
  },
  locked:(box,mine)=>{box.innerHTML=`<div class="smap mini"><div class="smgrid">${STAGE_INST.map(n=>mine[n]?`<b class="stok i-${n}" style="left:${50+mine[n].x*50}%;top:${(1-mine[n].y)*100}%">${esc(DEMO.inst[n].split(' ').pop())}</b>`:'').join('')}</div></div>`;},
  score:(r,a)=>stageScore(a),
  publicReveal:(r,a,res)=>({notes:(res&&res.notes||[]).slice(1)}),
  pReveal:(box,st)=>{if(st.rv&&st.rv.notes.length)box.innerHTML=`<ul class="notes">${st.rv.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`;},
}));

/* ---------- THE SAMPLE CHRONOLOGIST ---------- */
const ERA_YEARS=Object.keys(ERAS).map(Number);
game(roundGame({
  id:'chrono',noWord:'Not quite',group:'ears',name:'The Sample Chronologist',tag:'Four clips, four decades. Put them in order, oldest to newest.',
  how:['Four short clips play one after another — the same kind of idea, produced in four different eras.','On your phone, tap the shapes from oldest to newest.','Every pair you put in the right order scores.'],
  badges:['Scored','Listening','History'],speed:.2,okAt:.99,closeAt:.5,yesWord:'Time lord!',
  icon:`<svg viewBox="0 0 64 64"><line x1="4" y1="48" x2="60" y2="48" stroke="var(--ink)" stroke-width="4"/>${[0,1,2,3].map(i=>`<rect x="${6+i*14}" y="${34-i*8}" width="10" height="${14+i*8}" fill="var(${COLS[i]})" stroke="var(--ink)" stroke-width="2.5"/>`).join('')}</svg>`,
  options:[{key:'n',label:'Rounds',choices:[[3,'3'],[4,'4'],[5,'5']],def:4},{key:'secs',label:'Answer time',choices:[[30,'30','seconds'],[45,'45','seconds'],[0,'OFF','no clock']],def:45}],
  note:'Every clip is produced live in the browser to imitate its decade: 50s mono slapback, 60s hard-panned stereo, 70s disco, 80s gated reverb, 90s 12-bit boom-bap, 2000s loudness war, 2010s sidechain EDM, 2020s trap.',
  prepMs:()=>23000,prepLabel:'LISTEN',prepSub:'four eras',
  prepText:()=>({big:'Four clips',small:'Listen to A, B, C and D. Then put them in order.'}),
  secs:o=>o.secs,
  build:o=>[...Array(o.n)].map(()=>{const pickEras=shuffle(ERA_YEARS).slice(0,4);return {eras:pickEras};}),
  playCard(k){const s=G.gs,r=s.rounds[s.i];setAud(playEra(r.eras[k]));s.playing=k;$$('.ccard').forEach((c,i)=>c.classList.toggle('playing',i===k));},
  onPrep(r){const s=G.gs,i=s.i;[0,1,2,3].forEach(k=>later(()=>{if(G.gs===s&&s.i===i&&s.phase==='prep')this.playCard(k);},300+k*5600));},
  leave(){stopAud();},
  replay(){const s=G.gs;this.playCard(((s.playing??-1)+1)%4);},replayLabel:'Play next clip',
  stage(m,r,ctx){m.innerHTML=`<div class="chrono"><h2 class="qtext">${ctx.phase==='prep'?'Listen to all four':'Oldest to newest — on your phone'}</h2><div class="ccards">${r.eras.map((y,k)=>`<button class="ccard c${k}" data-k="${k}">${shape(k,56,'var(--ink)','var(--c)')}<b>${LET[k]}</b><span>click to play</span></button>`).join('')}</div></div>`;
    $$('.ccard',m).forEach(b=>b.onclick=()=>this.playCard(+b.dataset.k));},
  reveal(m,r,ctx){const order=r.eras.map((y,k)=>[y,k]).sort((a,b)=>a[0]-b[0]),n=Math.max(1,ctx.list.length),exact=ctx.list.filter(x=>x.res&&x.res.acc===1).length;
    m.innerHTML=`<div class="chrono rev"><h2 class="qtext">The timeline · ${Math.round(100*exact/n)}% got the exact order</h2><div class="timeline">${order.map(([y,k])=>`<div class="tcard c${k}" data-k="${k}">${shape(k,40,'var(--ink)','var(--c)')}<b>${ERAS[y].label}</b><p>${esc(ERAS[y].tells)}</p></div>`).join('')}</div></div>`;
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
  publicReveal:r=>({order:r.eras.map((y,k)=>[y,k]).sort((a,b)=>a[0]-b[0]).map(([y,k])=>[k,ERAS[y].label])}),
  pReveal:(box,st)=>{box.innerHTML=`<div class="pslots">${st.rv.order.map(([k,l])=>`<div class="pslot">${shape(k,36,'var(--ink)',`var(${COLS[k]})`)}<small>${esc(l)}</small></div>`).join('<i>→</i>')}</div>`;},
}));
