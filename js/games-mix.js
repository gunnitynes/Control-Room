/* =====================================================================
   THE MIX ROOM — one song in stems, every phone a fader, the whole room mixes
   Stems come from a folder the teacher loads in this browser (IndexedDB clipDB, dec -4, one song per folder):
   commercial multitracks never go in the repo. A section of the song loops on the big speakers; the phones pull
   the faders (several people on one stem = their average); the reveal compares the room's balance with the
   original (every stem at 0 dB, centred) and lets the room A/B the two.
   ===================================================================== */
const MX_EXT=/\.(mp3|m4a|aac|wav|aif|aiff|flac|ogg|oga|webm)$/i;
const mxSongs=()=>{const m=new Map();(typeof MYCLIPS==='undefined'?[]:MYCLIPS.list).filter(c=>c.dec===-4).forEach(c=>{if(!m.has(c.song))m.set(c.song,[]);m.get(c.song).push(c);});
  m.forEach(L=>L.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})));return m;};
const mxSong=()=>{const S=mxSongs(),want=store.get('mix.song','');return S.has(want)?want:([...S.keys()][0]||'');};
const mxName=f=>String(f).replace(MX_EXT,'').replace(/^\s*\d+\s*[-_.]\s*/,'').trim()||f;
// a fader at 0.8 is 0 dB (the original); the top is about +6 dB, the bottom is silence
const mxDb=v=>v<=0.005?-Infinity:60*Math.log10(v/0.8);
const mxGain=v=>v<=0.005?0:Math.pow(v/0.8,3);
const mxFmt=v=>{const d=mxDb(v);return d===-Infinity?'−∞':(d>=0?'+':'')+d.toFixed(1)+' dB';};
const MX_COLS=['--red','--blue','--yel','--green'];
// how close the room's balance is to the original: overall loudness doesn't count, only the stems against each other
function mxMatch(levels,pans,withPan){const d=levels.map(l=>Math.max(-40,Math.min(6,mxDb(l.v))));const mean=d.reduce((a,b)=>a+b,0)/d.length;
  let err=d.reduce((a,x)=>a+Math.abs(x-mean),0)/d.length;if(withPan)err+=pans.reduce((a,p)=>a+Math.abs(p)*8,0)/pans.length;
  return {pct:Math.round(100*Math.max(0,Math.min(1,1-err/15))),rel:d.map(x=>x-mean)};}

game({
  id:'mixroom',group:'ears',name:'The Mix Room',tag:'One song in stems, every phone a fader. Mix it together, then hear how close you got.',
  how:['The original plays on the big speakers. Then the faders get scrambled.','Every phone becomes a fader for one part of the song (several people on one part share it).','Mix it back together as a room. The reveal shows how close your balance got to the original, and you can switch between the two.'],
  badges:['Live','No score','Stems'],kind:'free',
  icon:`<svg viewBox="0 0 64 64">${[0,1,2,3].map(i=>`<line x1="${12+i*13}" y1="8" x2="${12+i*13}" y2="56" stroke="var(--ink)" stroke-width="3"/><rect x="${6+i*13}" y="${[34,16,40,24][i]}" width="12" height="9" fill="var(${MX_COLS[i]})" stroke="var(--ink)" stroke-width="2.5"/>`).join('')}</svg>`,
  options:[
    {key:'at',label:'Section',choices:[[0.04,'Start','from the top'],[0.25,'¼ in','often the first verse'],[0.5,'Middle','often a chorus'],[0.72,'¾ in','late in the song']],def:0.25},
    {key:'len',label:'Loop',choices:[[30,'30','seconds'],[45,'45','seconds'],[60,'60','seconds']],def:45},
    {key:'mins',label:'Mixing time',type:'step',min:1,max:10,step:1,def:3,unit:'min'},
    {key:'ctl',label:'Phones control',choices:[['level','Level','a fader each'],['both','Level + pan','a fader and a pan knob']],def:'level'},
  ],
  note:'Stems stay in this browser and are never uploaded. One folder per song, one audio file per part (MP3 is fine and loads fastest). Parts that sum to the original mix work best.',
  check(){return mxSong()?'':'Load a stems folder first';},
  setupExtra(){const S=mxSongs(),cur=mxSong();
    return `<div class="fsec mxsongs"><h3><b>♫</b>Your stems<small>${S.size} song${S.size===1?'':'s'} · stay in this browser, never uploaded</small></h3>
      <div class="chimport"><label class="big go">Load a stems folder<input type="file" id="mxFolder" webkitdirectory multiple hidden></label><span class="chprog" id="mxProg"></span>
        <p class="fine">Pick one song’s folder of stems (or a folder of song folders). Each subfolder becomes one song.</p></div>
      ${S.size?`<div class="mxlist">${[...S].map(([song,L])=>`<button class="mxsong${song===cur?' on':''}" data-song="${esc(song)}"><b>${esc(song)}</b><span>${L.length} stems</span><i data-del="${esc(song)}" title="Remove from this browser">×</i></button>`).join('')}</div>`:''}</div>`;},
  setupBind(st,redraw){const fo=$('#mxFolder',st);
    if(fo)fo.onchange=async()=>{const files=[...fo.files].filter(f=>MX_EXT.test(f.name));if(!files.length){toast('No audio files in that folder');return;}const prog=$('#mxProg',st);let n=0;
      for(const f of files){const parts=(f.webkitRelativePath||f.name).split('/'),song=parts.length>2?parts[parts.length-2]:(parts.length===2?parts[0]:'My song');
        await clipDB.put({id:'mx:'+song+'/'+f.name,dec:-4,song,name:f.name,blob:f,at:Date.now()+n});n++;if(prog)prog.textContent=`Saving ${n} of ${files.length}…`;}
      await loadMyClips();toast(`${n} stems saved in this browser`);redraw();};
    $$('.mxsong',st).forEach(b=>b.onclick=async e=>{const del=e.target.dataset&&e.target.dataset.del;
      if(del){e.stopPropagation();if(!confirm('Remove '+del+' from this browser?'))return;for(const c of MYCLIPS.list.filter(c=>c.dec===-4&&c.song===del))await clipDB.del(c.id);await loadMyClips();redraw();return;}
      store.set('mix.song',b.dataset.song);redraw();});},
  topInfo(){const s=G.gs;if(!s)return this.tag;return ({load:'Loading the stems',orig:'The original',mix:`Mix ${s.round}: the room at the faders`,reveal:`Mix ${s.round}: how close?`})[s.phase]||'';},
  start(o){const song=mxSong(),L=mxSongs().get(song)||[];
    G.gs={o,song,stems:L.map((c,i)=>({i,name:mxName(c.name),clip:c})),phase:'load',prog:0,round:0,assign:new Map(),vals:new Map(),scr:[],ab:'room',a:null};
    this.load().catch(e=>{console.error(e);toast('Could not load the stems: '+e.message);});},
  // decode each stem and keep only the looping section (a full 5-minute stem would fill the memory)
  async load(){const s=G.gs,ac=audio();let at=0;
    for(const st of s.stems){if(G.gs!==s)return;const full=await new Promise((res,rej)=>st.clip.blob.arrayBuffer().then(b=>ac.decodeAudioData(b,res,rej)));
      if(!at){at=Math.max(0,Math.min(full.duration-s.o.len-0.5,full.duration*s.o.at));s.at=at;}
      const sr=full.sampleRate,a=Math.floor(at*sr),n=Math.min(full.length-a,Math.floor(s.o.len*sr)),buf=ac.createBuffer(2,n,sr),fade=Math.floor(0.02*sr);
      for(let c=0;c<2;c++){const src=full.getChannelData(Math.min(c,full.numberOfChannels-1)),dst=buf.getChannelData(c);dst.set(src.subarray(a,a+n));
        for(let i=0;i<fade;i++){const k=i/fade;dst[i]*=k;dst[n-1-i]*=k;}}
      st.buf=buf;s.prog++;const p=$('#mxLoad');if(p)p.style.width=Math.round(100*s.prog/s.stems.length)+'%';}
    if(G.gs!==s)return;this.play();this.go('orig');},
  // the graph: every stem loops in sync through its own gain, pan and meter
  play(){const s=G.gs,ac=audio(),t=ac.currentTime+0.15,bus=gn(ac,0.85);bus.connect(AU.music);s.a={bus,t};
    s.stems.forEach(st=>{const src=ac.createBufferSource();src.buffer=st.buf;src.loop=true;const g=gn(ac,1),p=ac.createStereoPanner(),an=ac.createAnalyser();an.fftSize=512;
      src.connect(g).connect(p).connect(bus);p.connect(an);src.start(t);Object.assign(st,{src,g,p,an});});
    s.meterBuf=new Float32Array(512);},
  stop(){const s=G.gs;if(!s||!s.a)return;s.stems.forEach(st=>{try{st.src.stop();}catch(e){}});try{s.a.bus.disconnect();}catch(e){}s.a=null;},
  leave(){this.stop();},
  // the level and pan of each stem: the average of everyone holding it (or its scrambled start)
  levels(){const s=G.gs;return s.stems.map(st=>{const vs=[],ps=[];s.assign.forEach((L,pid)=>{if(L.includes(st.i)&&G.players.has(pid)){const x=(s.vals.get(pid)||{})[st.i];if(x){vs.push(x.v);ps.push(x.pan||0);}}});
    const sc=s.scr[st.i]||{v:0.8,pan:0};return {v:vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:sc.v,pan:ps.length?ps.reduce((a,b)=>a+b,0)/ps.length:sc.pan,n:vs.length};});},
  apply(){const s=G.gs;if(!s||!s.a)return;const ac=audio(),L=this.levels(),orig=s.phase==='orig'||(s.phase==='reveal'&&s.ab==='orig');
    s.stems.forEach((st,i)=>{st.g.gain.setTargetAtTime(orig?1:mxGain(L[i].v),ac.currentTime,0.03);st.p.pan.setTargetAtTime(orig?0:L[i].pan,ac.currentTime,0.03);});},
  // stems are shared out: with fewer phones than stems a phone gets several faders
  deal(){const s=G.gs,ps=online(),N=s.stems.length;s.assign=new Map();s.vals=new Map();
    if(!ps.length)return;
    if(ps.length>=N)ps.forEach((p,k)=>s.assign.set(p.id,[k%N]));
    else ps.forEach((p,k)=>s.assign.set(p.id,s.stems.map(x=>x.i).filter(j=>j%ps.length===k)));
    s.assign.forEach((L,pid)=>{const o={};L.forEach(j=>o[j]={...s.scr[j]});s.vals.set(pid,o);});},
  scramble(){const s=G.gs;s.scr=s.stems.map(()=>{let v;do{v=0.15+Math.random()*0.85;}while(Math.abs(v-0.8)<0.12);return {v,pan:s.o.ctl==='both'?Math.round((Math.random()*1.6-0.8)*10)/10:0};});},
  onJoin(p){const s=G.gs;if(!s||s.phase!=='mix'||s.assign.has(p.id))return;const cnt=s.stems.map(st=>[...s.assign.values()].filter(L=>L.includes(st.i)).length),j=cnt.indexOf(Math.min(...cnt));
    s.assign.set(p.id,[j]);s.vals.set(p.id,{[j]:{...this.levels()[j]}});sync(p);render();},
  go(ph){const s=G.gs;s.phase=ph;stopClock();
    if(ph==='mix'){s.round++;s.ab='room';this.scramble();this.deal();startClock(s.o.mins*60000,()=>{sfx.alarm();this.go('reveal');});}
    if(ph==='reveal'){s.ab='room';s.res=mxMatch(this.levels(),this.levels().map(l=>l.pan),s.o.ctl==='both');sfx.fanfare();}
    this.apply();render();syncAll();},
  next(){const s=G.gs;({load:()=>{},orig:()=>this.go('mix'),mix:()=>this.go('reveal'),reveal:()=>this.go('mix')})[s.phase]();},
  act(p,d){const s=G.gs;if(s.phase!=='mix'||d.t!=='v')return;const L=s.assign.get(p.id);if(!L||!L.includes(d.i))return;
    const o=s.vals.get(p.id)||{};o[d.i]={v:Math.max(0,Math.min(1,+d.v||0)),pan:Math.max(-1,Math.min(1,+d.pan||0))};s.vals.set(p.id,o);this.apply();},
  frame(){clockFrame();const s=G.gs;if(!s||!s.a||(s.phase!=='mix'&&s.phase!=='orig'&&s.phase!=='reveal'))return;const L=this.levels(),orig=s.phase==='orig'||(s.phase==='reveal'&&s.ab==='orig');
    s.stems.forEach((st,i)=>{const el=document.querySelector(`.mxs[data-i="${i}"]`);if(!el)return;const v=orig?0.8:L[i].v;
      el.querySelector('.mxcap').style.bottom=(v*100)+'%';el.querySelector('.mxdb').textContent=orig?'0 dB':mxFmt(v);
      st.an.getFloatTimeDomainData(s.meterBuf);let m=0;for(let k=0;k<s.meterBuf.length;k+=4){const x=Math.abs(s.meterBuf[k]);if(x>m)m=x;}
      el.querySelector('.mxm i').style.height=Math.max(0,Math.min(100,(20*Math.log10(m||1e-6)+60)/60*100))+'%';
      const pn=el.querySelector('.mxpan');if(pn)pn.style.left=(50+(orig?0:L[i].pan)*45)+'%';
      if(s.phase==='mix'){const dots=el.querySelector('.mxdots');if(dots){const who=[];s.assign.forEach((A,pid)=>{if(A.includes(i)){const pl=G.players.get(pid),x=(s.vals.get(pid)||{})[i];if(pl&&x)who.push([pl,x.v]);}});
        dots.innerHTML=who.map(([pl,v])=>`<i class="c${pl.sh}" style="bottom:${v*100}%" title="${esc(pl.name)}"></i>`).join('');}}});
    const live=document.getElementById('mxPct');if(live&&s.phase==='mix')live.textContent='';},
  render(st){const s=G.gs,o=s.o,ctl=o.ctl==='both';
    if(s.phase==='load'){st.innerHTML=`<div class="dbig"><span class="lab">The Mix Room · ${esc(s.song)}</span><h2>Loading the stems</h2><div class="mxbar"><i id="mxLoad" style="width:${Math.round(100*s.prog/Math.max(1,s.stems.length))}%"></i></div><p>${s.stems.length} parts, a ${o.len}-second loop.</p></div>`;return;}
    const L=this.levels(),holders=i=>{const n=[];s.assign.forEach((A,pid)=>{if(A.includes(i)){const pl=G.players.get(pid);if(pl)n.push(pl.name);}});return n;};
    const strip=(stm,i)=>{const h=holders(i),rel=s.res&&s.res.rel[i];
      return `<div class="mxs c${i%4}" data-i="${i}"><div class="mxname"><b>${esc(stm.name)}</b><span>${s.phase==='mix'?(h.length?esc(h.join(', ')):'nobody'):''}</span></div>
        ${ctl?`<div class="mxpanrow"><i class="mxpan"></i></div>`:''}
        <div class="mxtrack"><div class="mxm"><i></i></div><div class="mxlane"><i class="mx0" title="0 dB: the original"></i><div class="mxdots"></div><i class="mxcap"></i></div></div>
        <div class="mxdb">${mxFmt(L[i].v)}</div>${s.phase==='reveal'?`<div class="mxdiff ${Math.abs(rel)<2?'ok':''}">${Math.abs(rel)<2?'✓ spot on':(rel>0?'▲ ':'▼ ')+Math.abs(rel).toFixed(1)+' dB '+(rel>0?'too loud':'too quiet')}</div>`:''}</div>`;};
    const head={orig:()=>`<span class="lab">The Mix Room · ${esc(s.song)}</span><h2>The original</h2><p>Every part at its own level. Listen to the balance: in a moment the faders get scrambled.</p>`,
      mix:()=>`<span class="lab">Mix ${s.round} · ${esc(s.song)}</span><h2>Mix it back</h2><p>Your fader is on your phone. Several of you on one part? You share it: it sits where your average is.</p>${clockHTML()}`,
      reveal:()=>`<span class="lab">Mix ${s.round} · how close?</span><h2 class="mxpct">${s.res.pct}%</h2><p>${s.res.pct>=85?'Golden ears: that’s the record.':s.res.pct>=65?'Close. A couple of parts are off.':'A brave new mix. Now hear the original.'}</p>
        <div class="seg mxab"><button data-ab="room" aria-pressed="${s.ab==='room'}">The room’s mix</button><button data-ab="orig" aria-pressed="${s.ab==='orig'}">The original</button></div>`}[s.phase];
    const lbl={orig:'Scramble the faders',mix:'Stop: how close?',reveal:'Scramble again'}[s.phase];
    st.innerHTML=`<div class="mixroom ph-${s.phase}"><div class="mxhead">${head()}</div><div class="mxstrips">${s.stems.map(strip).join('')}</div>
      <div class="dfoot"><span class="fine">${s.phase==='mix'?`${online().length} on the faders`:`${o.len}-second loop`}</span>${s.phase==='reveal'?againBtn():''}<button class="big go" id="bNext">${esc(lbl)} <small>SPACE</small></button></div></div>`;
    $('#bNext').onclick=()=>this.next();bindAgain(st);
    $$('.mxab button',st).forEach(b=>b.onclick=()=>{s.ab=b.dataset.ab;this.apply();render();});},
  pstate(p){const s=G.gs,A=s.assign.get(p.id)||[],L=this.levels();
    return {k:s.phase+s.round+A.join('.'),ph:s.phase,round:s.round,song:s.song,ctl:s.o.ctl,clock:pClock(),
      stems:A.map(i=>({i,name:s.stems[i].name,init:(s.vals.get(p.id)||{})[i]||{v:0.8,pan:0},room:L[i].v,rel:s.res?s.res.rel[i]:0})),pct:s.res?s.res.pct:0};},
  player(root,st){pClockStart(st.clock);
    if(st.ph==='load'||st.ph==='orig'){root.innerHTML=`<div class="pcenter dots"><h2>Listen</h2><p>${st.ph==='load'?'The stems are loading…':`The original ${esc(st.song)}. Remember the balance.`}</p></div>`;return;}
    if(st.ph==='reveal'){root.innerHTML=`<div class="pcol2"><h2 class="pbigt">${st.pct}% close</h2>${st.stems.map(x=>`<div class="mxpres"><b>${esc(x.name)}</b><span>${Math.abs(x.rel)<2?'✓ spot on':(x.rel>0?'too loud by ':'too quiet by ')+Math.abs(x.rel).toFixed(1)+' dB'}</span></div>`).join('')}<p>Listen to the original on the big screen.</p></div>`;return;}
    if(!st.stems.length){root.innerHTML=`<div class="pcenter dots"><h2>Listen</h2><p>Every part has a fader already. You’re the producer: tell them what to change.</p></div>`;return;}
    const vals=PL.mx&&PL.mx.k===st.k?PL.mx.v:(PL.mx={k:st.k,v:Object.fromEntries(st.stems.map(x=>[x.i,{...x.init}]))}).v;
    root.innerHTML=`<div class="mxphone n${st.stems.length}">${pClockHTML(st.clock)}<div class="mxfaders">${st.stems.map((x,k)=>`<div class="mxpf c${x.i%4}" data-i="${x.i}"><b>${esc(x.name)}</b>
      ${st.ctl==='both'?`<div class="mxpk"><input type="range" min="-1" max="1" step="0.05" value="${vals[x.i].pan}" aria-label="Pan"><span>L · pan · R</span></div>`:''}
      <div class="mxft"><i class="mxf0"></i><i class="mxfcap" style="bottom:${vals[x.i].v*100}%"></i></div><span class="mxfdb">${mxFmt(vals[x.i].v)}</span></div>`).join('')}</div></div>`;
    let last=0,pend=null;const send=i=>{const now=Date.now(),go=()=>{last=Date.now();pend=null;papi.send({t:'v',i,v:vals[i].v,pan:vals[i].pan});};if(now-last>45)go();else{clearTimeout(pend);pend=setTimeout(go,50);}};
    $$('.mxpf',root).forEach(el=>{const i=+el.dataset.i,tr=$('.mxft',el),cap=$('.mxfcap',tr),db=$('.mxfdb',el);
      const set=y=>{const r=tr.getBoundingClientRect();let v=1-(y-r.top)/r.height;v=Math.max(0,Math.min(1,v));if(Math.abs(v-0.8)<0.02)v=0.8;vals[i].v=v;cap.style.bottom=(v*100)+'%';db.textContent=mxFmt(v);send(i);};
      tr.onpointerdown=e=>{tr.setPointerCapture(e.pointerId);set(e.clientY);papi.vibe(5);};tr.onpointermove=e=>{if(e.buttons||e.pointerType==='touch')if(tr.hasPointerCapture(e.pointerId))set(e.clientY);};
      const pk=$('.mxpk input',el);if(pk)pk.oninput=()=>{vals[i].pan=+pk.value;send(i);};});},
});
