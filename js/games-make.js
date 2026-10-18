/* ====================================================================
   MAKE SOMETHING — creative sprints, generators and party games.
   Constraint Generator · Genre Cross-Pollinator · Soundabout Roundabout ·
   Metaphor Translation · Parameter Telephone (listed under Train your ears)
   ==================================================================== */

/* ---------- a shared countdown (host big clock + phone clock) ---------- */
function startClock(ms,onEnd){const s=G.gs;s.clockEnd=ms?now()+ms:0;s.clockT=ms;s.clockTick=0;s.clockCb=onEnd;const end=s.clockEnd;if(ms>0)later(()=>{if(G.gs===s&&s.clockEnd===end){s.clockEnd=0;onEnd&&onEnd();}},ms);}
function extendClock(ms){const s=G.gs;if(!s||!s.clockEnd)return;const left=s.clockEnd-now()+ms,T=s.clockT+ms;startClock(left,s.clockCb);s.clockT=T;syncAll();}
function stopClock(){if(G.gs)G.gs.clockEnd=0;}
const clockLeft=()=>{const s=G.gs;return s&&s.clockEnd?Math.max(0,s.clockEnd-now()):null;};
const clockHTML=(cls='')=>`<div class="clock ${cls}"><b id="clk">${G.gs&&G.gs.clockEnd?fmtClock(clockLeft()):'—'}</b><i class="clkbar"><i id="clkbar"></i></i></div>`;
function clockFrame(){const s=G.gs;if(!s||!s.clockEnd)return;const left=clockLeft(),e=$('#clk'),b=$('#clkbar');if(e)e.textContent=fmtClock(left);if(b)b.style.width=(100*left/s.clockT)+'%';
  const sec=Math.ceil(left/1000);if(left>0&&sec<=5&&sec!==s.clockTick){s.clockTick=sec;sfx.tick(sec);}}
const pClock=()=>{const l=clockLeft();return l==null?null:{left:l,T:G.gs.clockT};};
const pClockHTML=c=>c?`<div class="pclock"><b class="pclk">${fmtClock(c.left)}</b><i class="pclkbar"><i></i></i></div>`:'';
function pClockStart(c){PL.clock=c?{end:now()+c.left,T:c.T}:null;}
const durChoices=[[5,'5','min'],[10,'10','min'],[20,'20','min'],[30,'30','min'],[45,'45','min']];

/* =====================================================================
   SLOT MACHINES (Constraint Generator + Genre Cross-Pollinator)
   Phones pull the lever together: every tap charges it, and when the
   room has pulled hard enough, the reels spin.
   ===================================================================== */
function slotGame(spec){
  const g=Object.assign({kind:'free',badges:['Generator','No score']},spec);
  g.topInfo=()=>{const s=G.gs;return !s?g.tag:s.phase==='sprint'?'Sprint running':s.phase==='solo'?'Everyone spins on their phone':s.spins?`Spin ${s.spins}`:'Phones tap to spin';};
  g.start=o=>{const reels=g.reels(o).map(r=>({...r,val:null,locked:false}));
    G.gs={o,phase:o.mode==='room'?'slots':'solo',reels,spinning:false,charge:0,spins:0,lastT:now(),ind:new Map()};};
  /* ---- "everyone spins": each student has their own reels, max 3 spins, one lock after each spin ---- */
  const maxSpins=()=>Math.min(3,G.gs.reels.length);
  const me=p=>{const s=G.gs;let m=s.ind.get(p.id);if(!m){m={vals:s.reels.map(()=>null),locked:s.reels.map(()=>false),spins:0,need:'spin',seq:0};s.ind.set(p.id,m);}return m;};
  g.soloAct=(p,d)=>{const s=G.gs;if(s.phase!=='solo'&&s.phase!=='sprint')return;const m=me(p);
    if(d.t==='spin'&&m.need==='spin'){m.spins++;m.seq++;s.reels.forEach((r,k)=>{if(!m.locked[k])m.vals[k]=pick(r.items.filter(x=>x!==m.vals[k]));});sfx.spin();
      if(m.spins>=maxSpins()){m.locked=m.locked.map(()=>true);m.need='done';}else m.need='lock';}
    else if(d.t==='lock'&&m.need==='lock'){const k=d.k|0;if(k<0||k>=s.reels.length||m.locked[k]||!m.vals[k])return;m.locked[k]=true;sfx.vote();
      logAdd(p,{kind:'pick',game:g.name,text:`Kept ${s.reels[k].title}: ${m.vals[k]}`});
      if(m.locked.every(Boolean))m.need='done';else m.need='spin';}
    else return;
    if(m.need==='done'&&!m.logged){m.logged=true;sfx.land(0);logAdd(p,{kind:'brief',game:g.name,title:g.title?g.title(s.reels.map((r,k)=>({val:m.vals[k]}))):'',text:s.reels.map((r,k)=>`${r.title}: ${m.vals[k]}`).join('\n')});}
    sync(p);if(G.view==='play')render();};
  const need=()=>Math.max(4,Math.round(online().length*1.5));
  g.spin=()=>{const s=G.gs;if(s.spinning||s.phase!=='slots')return;s.spinning=true;s.charge=0;s.spins++;
    const els=$$('.reel'),strips=[];
    s.reels.forEach((r,k)=>{if(r.locked)return;const pickV=pick(r.items.filter(x=>x!==r.val));const fill=shuffle(r.items).slice(0,14);r.next=pickV;
      const win=els[k]&&$('.rwin',els[k]);if(!win)return;const strip=el('div','rstrip',[r.val||'?',...fill,pickV].map(v=>`<div class="ritem">${esc(v)}</div>`).join(''));win.innerHTML='';win.appendChild(strip);strips.push([k,strip]);});
    syncAll();setTopInfo();
    const tk=setInterval(sfx.spin,70);
    strips.forEach(([k,strip],j)=>{const dur=1300+j*550;requestAnimationFrame(()=>{const h=strip.firstChild.getBoundingClientRect().height;strip.style.transition=`transform ${dur}ms cubic-bezier(.12,.6,.2,1.02)`;strip.style.transform=`translateY(${-h*(strip.children.length-1)}px)`;});
      setTimeout(()=>{sfx.land(k);s.reels[k].val=s.reels[k].next;const R=$$('.reel')[k];if(R)R.classList.add('landed');},dur);});
    const total=1300+(strips.length-1)*550+150;setTimeout(()=>{clearInterval(tk);s.spinning=false;if(G.gs===s){render();syncAll();}},Math.max(300,total));
    if(!strips.length){clearInterval(tk);s.spinning=false;}
  };
  g.next=()=>{const s=G.gs;if(s.phase==='slots')g.spin();else if(s.phase==='solo')g.sprint();else if(s.phase==='sprint'){stopClock();s.phase=s.o.mode==='room'?'slots':'solo';render();syncAll();}};
  g.sprint=()=>{const s=G.gs;s.phase='sprint';sfx.whoosh();
    if(s.o.mode==='room')online().forEach(p=>logAdd(p,{kind:'brief',game:g.name,title:g.title&&s.reels.every(r=>r.val)?g.title(s.reels):'',text:s.reels.map(r=>`${r.title}: ${r.val}`).join('\n')}));
    startClock((s.o.mins||20)*60000,()=>{sfx.alarm();toast('Time! Pencils down.');syncAll();});render();syncAll();};
  g.act=(p,d)=>{const s=G.gs;if(d.t==='spin'||d.t==='lock'){g.soloAct(p,d);return;}if(d.t==='pull'&&s.phase==='slots'&&!s.spinning){s.charge+=1;sfx.spin();if(s.charge>=need())g.spin();else{const m=$('#charge');if(m)m.style.width=(100*s.charge/need())+'%';online().forEach(sync);}}};
  g.frame=t=>{const s=G.gs;const dt=(t-s.lastT)/1000;s.lastT=t;if(s.charge>0&&!s.spinning){s.charge=Math.max(0,s.charge-dt*.6);const m=$('#charge');if(m)m.style.width=(100*s.charge/need())+'%';}clockFrame();};
  g.stop=()=>{};
  g.render=st=>{
    const s=G.gs,done=s.reels.every(r=>r.val);
    if(s.o.mode!=='room'&&(s.phase==='solo'||s.phase==='sprint')){
      const ps=players().filter(p=>s.ind.has(p.id)||(p.conn&&p.conn.open)),fin=ps.filter(p=>s.ind.has(p.id)&&s.ind.get(p.id).need==='done').length;
      const card=p=>{const m=s.ind.get(p.id)||{vals:s.reels.map(()=>null),locked:s.reels.map(()=>false),spins:0,need:'spin'};const ttl=g.title&&m.need==='done'?g.title(s.reels.map((r,k)=>({val:m.vals[k]}))):'';
        return `<div class="scard2 ${m.need}"><div class="sc2h">${shape(p.sh,20,'var(--ink)',`var(${COLS[p.sh]})`)}<b>${esc(p.name)}</b><em>${m.need==='done'?'✓ done':m.need==='lock'?'choosing…':`spin ${m.spins+1} of ${maxSpins()}`}</em></div>
          ${ttl?`<div class="sc2t">${esc(ttl.split(' · ')[0])}</div>`:''}<ol>${s.reels.map((r,k)=>`<li class="c${k} ${m.locked[k]?'lk':m.vals[k]?'roll':''}"><span>${esc(r.title)}</span><b>${esc(m.vals[k]||'—')}</b></li>`).join('')}</ol></div>`;};
      const sprint=s.phase==='sprint';
      st.innerHTML=`<div class="solo dots"><div class="solohead">${sprint?`<span class="lab">${esc(g.name)} · everyone has their own brief</span>${clockHTML('mid')}`:`<div><h2>${fin===ps.length&&ps.length?'Everyone’s brief':'Spin on your phones'}</h2><p class="fine">Tap to spin · keep one result after each spin · ${maxSpins()} spins each. Finished: <b>${fin}</b> of ${ps.length}</p></div>`}</div>
        <div class="sowall ${fin===ps.length&&ps.length?'final':''}">${ps.map(card).join('')||'<p class="empty">Waiting for phones…</p>'}</div>
        <div class="dfoot">${sprint?`<button class="ghost" id="bBack">← Back to the spins</button><button class="ghost" id="bPlus">+5 min</button>`:`<div class="sprintgo"><span class="lab">Sprint</span><div class="seg" id="segD">${durChoices.map(([mm,l])=>`<button data-m="${mm}" aria-pressed="${(s.o.mins||20)===mm}">${l}<small>min</small></button>`).join('')}</div></div>`}<span></span>
          ${sprint?'':`<button class="big go" id="bSprint">Start the sprint <small>SPACE</small></button>`}</div></div>`;
      if(sprint){$('#bBack').onclick=()=>{stopClock();s.phase='solo';render();syncAll();};$('#bPlus').onclick=()=>extendClock(300000);}
      else{$$('#segD button',st).forEach(b=>b.onclick=()=>{s.o.mins=+b.dataset.m;$$('#segD button',st).forEach(x=>x.setAttribute('aria-pressed',x===b));});$('#bSprint').onclick=g.sprint;}
      return;}
    if(s.phase==='sprint'){st.innerHTML=`<div class="sprint dots"><div class="sprhead"><span class="lab">${esc(g.name)} · the brief</span>${clockHTML('huge')}</div>
      ${g.title&&done?`<h2 class="mashname">${esc(g.title(s.reels))}</h2>`:''}<div class="brief">${s.reels.map((r,k)=>`<div class="bcard c${k}"><span class="lab">${esc(r.title)}</span><b>${esc(r.val||'—')}</b></div>`).join('')}</div>
      <div class="frow"><button class="ghost" id="bBack">← Back to the slots</button><button class="ghost" id="bPlus">+5 min</button><span class="fine">Space ends the sprint</span></div></div>`;
      $('#bBack').onclick=()=>{stopClock();s.phase='slots';render();syncAll();};$('#bPlus').onclick=()=>extendClock(300000);return;}
    st.innerHTML=`<div class="slots dots"><div class="reels">${s.reels.map((r,k)=>`<div class="reel c${k} ${r.val?'landed':''}"><div class="rhead"><b>${pad2(k+1)}</b><span>${esc(r.title)}</span></div><div class="rwin"><div class="rstrip"><div class="ritem">${esc(r.val||'?')}</div></div></div>
        <button class="ghost rlock" data-k="${k}" aria-pressed="${r.locked}">${r.locked?'Locked':'Lock'}</button></div>`).join('')}</div>
      ${g.title&&done?`<h2 class="mashname">${esc(g.title(s.reels))}</h2>`:''}
      <div class="slotbar"><div class="lever"><span class="lab">Phones tap to spin</span><i class="chargebar"><i id="charge" style="width:${100*s.charge/need()}%"></i></i><span class="fine">${need()} taps spin the reels</span></div>
        <button class="big" id="bSpin">Spin <small>SPACE</small></button>
        <div class="sprintgo"><span class="lab">Sprint</span><div class="seg" id="segD">${durChoices.map(([m,l])=>`<button data-m="${m}" aria-pressed="${(s.o.mins||20)===m}">${l}<small>min</small></button>`).join('')}</div><button class="big go" id="bSprint" ${done?'':'disabled'}>Start sprint</button></div></div></div>`;
    $$('.rlock',st).forEach(b=>b.onclick=()=>{const r=s.reels[+b.dataset.k];r.locked=!r.locked;b.setAttribute('aria-pressed',r.locked);b.textContent=r.locked?'Locked':'Lock';});
    $('#bSpin').onclick=g.spin;
    $$('#segD button',st).forEach(b=>b.onclick=()=>{s.o.mins=+b.dataset.m;$$('#segD button',st).forEach(x=>x.setAttribute('aria-pressed',x===b));});
    $('#bSprint').onclick=g.sprint;
  };
  g.pstate=p=>{const s=G.gs,done=s.reels.every(r=>r.val);
    if(s.o.mode!=='room'){const m=me(p);return {k:s.phase+m.seq+m.need+m.locked.filter(Boolean).length,ph:s.phase,solo:true,reels:s.reels.map((r,k)=>({t:r.title,v:m.vals[k],lk:m.locked[k],items:r.items})),
      spins:m.spins,max:maxSpins(),need:m.need,seq:m.seq,title:g.title&&m.need==='done'?g.title(s.reels.map((r,k)=>({val:m.vals[k]}))):'',clock:pClock()};}
    return {k:s.phase+s.spins+(s.spinning?'s':''),ph:s.phase,spinning:s.spinning,reels:s.reels.map(r=>[r.title,r.val]),title:g.title&&done?g.title(s.reels):'',charge:Math.round(100*s.charge/need()),clock:pClock()};};
  g.player=(root,st)=>{
    if(st.solo){soloPlayer(root,st);return;}
    const cards=`<div class="pbrief">${st.reels.map(([t,v],k)=>`<div class="bcard c${k}"><span class="lab">${esc(t)}</span><b>${esc(v||'?')}</b></div>`).join('')}</div>`;
    if(st.ph==='sprint'){pClockStart(st.clock);root.innerHTML=`<div class="pcol2">${pClockHTML(st.clock)}${st.title?`<h2 class="pmash">${esc(st.title)}</h2>`:''}${cards}<p class="fine">Make it. The clock is on the big screen too.</p></div>`;return;}
    root.innerHTML=`<div class="pcol2">${st.title?`<h2 class="pmash">${esc(st.title)}</h2>`:''}${cards}
      <button class="leverbtn" ${st.spinning?'disabled':''}><span>${st.spinning?'Spinning…':'TAP'}</span><i class="pcharge"><i style="width:${st.charge}%"></i></i></button>
      <p class="fine">Everyone taps together — the more phones, the faster it spins.</p></div>`;
    const b=$('.leverbtn',root);b.onclick=()=>{papi.send({t:'pull'});papi.vibe(12);b.classList.remove('yank');void b.offsetWidth;b.classList.add('yank');};
  };
  g.pupdate=(root,st)=>{const c=$('.pcharge i',root);if(c)c.style.width=st.charge+'%';};
  return g;
}
/* the phone side of "everyone spins": reels roll (animated) to what the host rolled, then you keep one */
function soloPlayer(root,st){
  pClockStart(st.clock);let seen=PL.slotSeen||{seq:0,lk:st.reels.map(()=>false)};if(st.seq<seen.seq||seen.lk.length!==st.reels.length)seen={seq:0,lk:st.reels.map(()=>false)};const fresh=st.seq>seen.seq;const openBefore=fresh?(seen.seq?seen.lk.map(x=>!x):st.reels.map(()=>true)):null;
  PL.slotSeen={seq:st.seq,lk:st.reels.map(r=>r.lk)};
  const head=st.ph==='sprint'?pClockHTML(st.clock):`<p class="lab">Spin ${Math.min(st.spins+(st.need==='spin'?1:0),st.max)} of ${st.max}</p>`;
  const msg={spin:st.spins?'Tap to spin the reels you haven’t kept':'Tap to spin your reels',lock:'Keep one — tap the result you want',done:'Your brief'}[st.need];
  root.innerHTML=`<div class="pcol2 psolo">${head}${st.title?`<h2 class="pmash">${esc(st.title)}</h2>`:''}<p class="soloMsg">${esc(msg)}</p>
    <div class="preels">${st.reels.map((r,k)=>`<button class="preel c${k} ${r.lk?'lk':''}" data-k="${k}" ${st.need==='lock'&&!r.lk?'':'disabled'}><span class="lab">${esc(r.t)}${r.lk?' · kept':''}</span><div class="pwin"><div class="pstrip"><b>${esc(r.v||'?')}</b></div></div>${st.need==='lock'&&!r.lk?'<em>Keep this</em>':''}</button>`).join('')}</div>
    ${st.need==='spin'?'<button class="leverbtn small"><span>TAP</span></button>':st.need==='done'?`<p class="fine">${st.ph==='sprint'?'Make it!':'Look at the big screen. Your teacher starts the sprint.'}</p>`:''}</div>`;
  const tap=$('.leverbtn',root);if(tap)tap.onclick=()=>{tap.disabled=true;tap.classList.add('yank');papi.send({t:'spin'});papi.vibe(15);};
  $$('.preel',root).forEach(b=>b.onclick=()=>{if(b.disabled)return;papi.send({t:'lock',k:+b.dataset.k});papi.vibe(20);$$('.preel',root).forEach(x=>x.disabled=true);});
  if(fresh){// roll each unkept reel to its new value, one after the other
    let j=0;
    st.reels.forEach((r,k)=>{if(!openBefore[k])return;const w=$$('.pwin',root)[k];if(!w)return;const strip=el('div','pstrip roll',[...shuffle(r.items).slice(0,12),r.v].map(v=>`<b>${esc(v)}</b>`).join(''));w.innerHTML='';w.appendChild(strip);
      const dur=700+j*350;j++;requestAnimationFrame(()=>{const h=strip.firstChild.getBoundingClientRect().height;strip.style.transition=`transform ${dur}ms cubic-bezier(.12,.6,.2,1.02)`;strip.style.transform=`translateY(${-h*(strip.children.length-1)}px)`;});
      setTimeout(()=>papi.vibe(8),dur);});}
}
game(slotGame({
  id:'constraints',group:'make',name:'Constraint Generator',tag:'Three reels, one brief for the whole room: tool, source, structure.',
  how:['Everyone spins on their own phone: tap to spin the three reels — tool, source, structure.','After each spin, keep one result. Three spins, so you end up with your own three rules.','The big screen shows everyone’s brief. Start the sprint and make something under your rules.'],
  icon:`<svg viewBox="0 0 64 64">${[0,1,2].map(i=>`<rect x="${4+i*18}" y="10" width="16" height="36" fill="var(${COLS[i]})" stroke="var(--ink)" stroke-width="3"/>`).join('')}<rect x="2" y="50" width="56" height="8" fill="var(--ink)"/><line x1="60" y1="8" x2="60" y2="34" stroke="var(--ink)" stroke-width="3"/><circle cx="60" cy="8" r="4" fill="var(--red)" stroke="var(--ink)" stroke-width="2"/></svg>`,
  options:[{key:'mode',label:'Spinning',choices:[['solo','Everyone spins','3 spins each, keep one per spin'],['room','Whole room','one shared brief, phones tap together']],def:'solo'},{key:'mins',label:'Default sprint length',choices:durChoices,def:20}],
  reels:()=>[{key:'tool',title:'Tool',items:CONSTRAINTS.tool},{key:'source',title:'Source material',items:CONSTRAINTS.source},{key:'structure',title:'Structure',items:CONSTRAINTS.structure}],
}));
/* portmanteau: "Doo-wop" × "Hardstyle" → "Doo-style" */
function mash(a,b){const A=a.replace(/^\d{4}s /,'').split(/[\s-]/)[0],B=b.split(/\s/).pop();const cut=w=>{const m=w.match(/^[^aeiouy]*[aeiouy]+[^aeiouy]?/i);return m?m[0]:w.slice(0,3);};
  const tail=B.length>5?B.slice(Math.floor(B.length/2)-1):B;return (cut(A)+tail.toLowerCase()).replace(/^./,c=>c.toUpperCase());}
game(slotGame({
  id:'genres',group:'make',name:'Genre Cross-Pollinator',tag:'Roll two genres that should never meet — and make them meet.',
  how:['Everyone spins on their own phone: Genre A, Genre B and any extra reels.','After each spin, keep one result — three spins, then the machine names your hybrid.','The big screen shows everyone’s hybrid. Start the sprint and make it.'],
  icon:`<svg viewBox="0 0 64 64"><circle cx="24" cy="32" r="18" fill="var(--red)" stroke="var(--ink)" stroke-width="3" opacity=".9"/><circle cx="40" cy="32" r="18" fill="var(--blue)" stroke="var(--ink)" stroke-width="3" style="mix-blend-mode:multiply"/><path d="M32 18 Q40 32 32 46 Q24 32 32 18" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[{key:'mode',label:'Spinning',choices:[['solo','Everyone spins','3 spins each, keep one per spin'],['room','Whole room','one shared brief, phones tap together']],def:'solo'},{key:'extra',label:'Extra reels',choices:[[0,'None','just A × B'],[1,'+ Tempo'],[2,'+ Setting'],[3,'+ Everything','tempo, setting, ingredient']],def:2},{key:'mins',label:'Default sprint length',choices:durChoices,def:20}],
  reels:o=>{const r=[{title:'Genre A',items:GENRES.a},{title:'Genre B',items:GENRES.b}];if(o.extra===1||o.extra===3)r.push({title:'Tempo',items:GENRES.tempo});if(o.extra>=2)r.push({title:'Setting',items:GENRES.setting});if(o.extra===3)r.push({title:'Secret ingredient',items:GENRES.ingredient});return r;},
  title:reels=>`${mash(reels[0].val,reels[1].val)} · ${reels[0].val} × ${reels[1].val}`,
}));

/* =====================================================================
   SOUNDABOUT ROUNDABOUT — a track travels round the room; every stop deals a fresh prompt card
   ===================================================================== */
const RB_KINDS=Object.keys(ROUNDABOUT);
const RB_ALL=RB_KINDS.flatMap(kind=>ROUNDABOUT[kind].map(text=>({kind,text})));
// one shuffled deck per browser: a card is not dealt again until every card has been used,
// and a single deal spreads across the kinds so neighbours get different sorts of idea
function rbDeal(n){let used=new Set(store.get('rb.used',[]));const out=[];
  for(let i=0;i<n;i++){let left=RB_ALL.filter(c=>!used.has(c.text)&&!out.includes(c));if(!left.length){used=new Set();left=RB_ALL.filter(c=>!out.includes(c));}
    const seen=new Set(out.slice(-(RB_KINDS.length-1)).map(c=>c.kind)),fresh=left.filter(c=>!seen.has(c.kind)),c=pick(fresh.length?fresh:left);out.push(c);used.add(c.text);}
  store.set('rb.used',[...used]);return out;}
game({
  id:'roundabout',group:'make',name:'Soundabout Roundabout',tag:'Start a track, pass it round the room. Every stop deals a new prompt card.',
  how:['Everyone starts a short sketch on their own machine.','When the timer ends, move one seat on (or pass the project file). The track in front of you is now yours to grow.','A prompt card lands on your phone: a fun, specific idea to try. Add it, then pass the track on again.'],
  badges:['Sprint','No score','Prompt cards'],kind:'free',
  icon:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="21" fill="none" stroke="var(--ink)" stroke-width="4" stroke-dasharray="26 7"/><path d="M50 14 L54 26 L42 25 Z" fill="var(--red)" stroke="var(--ink)" stroke-width="2.5"/><path d="M14 50 L10 38 L22 39 Z" fill="var(--blue)" stroke="var(--ink)" stroke-width="2.5"/><rect x="25" y="25" width="14" height="14" fill="var(--yel)" stroke="var(--ink)" stroke-width="3" transform="rotate(12 32 32)"/></svg>`,
  options:[
    {key:'sketch',label:'First sketch',type:'step',min:1,max:30,step:1,def:8,unit:'min'},
    {key:'stop',label:'Time at each stop',type:'step',min:1,max:30,step:1,def:6,unit:'min'},
    {key:'rounds',label:'Stops',type:'step',min:1,max:20,step:1,def:3,unit:n=>n===1?'stop':'stops',help:'How many times each track moves on before the listening party.'},
    {key:'deal',label:'Cards',choices:[['each','Everyone different','a card per phone'],['room','One for the room','the same card on the big screen']],def:'each'},
  ],
  note:`${RB_ALL.length} prompt cards in ${RB_KINDS.length} kinds (${RB_KINDS.join(', ')}). A card is not dealt again until every card has been used (counted in this browser). Edit them in data/content.js → ROUNDABOUT.`,
  topInfo(){const s=G.gs;return s?({brief:'Ready',sketch:'First sketch',pass:'Pass it on!',card:`Stop ${s.round} · your card`,build:`Stop ${s.round} of ${s.o.rounds}`,done:'Listening party'})[s.phase]:this.tag;},
  start(o){G.gs={o,phase:'brief',round:0,cards:new Map(),room:null,done:new Set(),swapped:new Set()};},
  logCard(p,c){logAdd(p,{kind:'card',game:this.name,title:`Stop ${G.gs.round} · ${c.kind}`,text:c.text});},
  draw(){const s=G.gs,ps=online();s.done=new Set();s.swapped=new Set();sfx.card();
    if(s.o.deal==='room'){s.room=rbDeal(1)[0];s.cards=new Map();ps.forEach(p=>this.logCard(p,s.room));}
    else{const d=rbDeal(ps.length);s.room=null;s.cards=new Map(ps.map((p,i)=>[p.id,d[i]]));ps.forEach(p=>this.logCard(p,s.cards.get(p.id)));}},
  cardFor(p){const s=G.gs;if(s.room)return s.room;if(s.phase!=='card'&&s.phase!=='build')return null;
    if(!s.cards.has(p.id)){const c=rbDeal(1)[0];s.cards.set(p.id,c);this.logCard(p,c);} // a late joiner gets a card too
    return s.cards.get(p.id);},
  go(ph){const s=G.gs;s.phase=ph;stopClock();clearLater();
    if(ph==='sketch')startClock(s.o.sketch*60000,()=>{sfx.alarm();this.go('pass');});
    if(ph==='pass'){s.round++;sfx.whoosh();startClock(30000,()=>this.go('card'));}
    if(ph==='card')this.draw();
    if(ph==='build')startClock(s.o.stop*60000,()=>{sfx.alarm();this.go(s.round<s.o.rounds?'pass':'done');});
    if(ph==='done')sfx.fanfare();
    render();syncAll();},
  next(){const s=G.gs;({brief:()=>this.go('sketch'),sketch:()=>this.go('pass'),pass:()=>this.go('card'),card:()=>this.go('build'),build:()=>this.go(s.round<s.o.rounds?'pass':'done'),done:()=>exitGame(true)})[s.phase]();},
  frame(){clockFrame();},
  act(p,d){const s=G.gs;
    if(d.t==='got'&&(s.phase==='card'||s.phase==='build')){s.done.add(p.id);sfx.vote();sync(p);const e=$('#nDone');if(e)e.textContent=s.done.size;}
    if(d.t==='swap'&&s.phase==='card'&&!s.room&&!s.swapped.has(p.id)){s.swapped.add(p.id);const c=rbDeal(1)[0];s.cards.set(p.id,c);this.logCard(p,c);sfx.card();sync(p);render();}},
  render(st){
    const s=G.gs,o=s.o;
    const wall=()=>`<div class="rbwall">${online().map(p=>{const c=this.cardFor(p);return c?`<div class="rbc c${p.sh}${s.done.has(p.id)?' got':''}"><span class="lab">${esc(p.name)} · ${esc(c.kind)}</span><p>${esc(c.text)}</p></div>`:'';}).join('')}</div>`;
    const bodies={
      brief:`<div class="dbig"><span class="lab">Before the first stop</span><h2>Start a sketch</h2><p>${o.sketch} minute${o.sketch>1?'s':''}: a loop, a beat, a sound you love. Then it goes on a journey round the room, ${o.rounds} stop${o.rounds>1?'s':''} long.</p></div>`,
      sketch:`<div class="dbig"><span class="lab">First sketch</span>${clockHTML('huge')}<p>Start something worth passing on.</p></div>`,
      pass:`<div class="dbig rot"><div class="arrows"><i></i><i></i><i></i><i></i></div><h2>Pass it on!</h2><p>Move one seat on, or send your project file to the next person. The track in front of you is now yours to grow.</p>${clockHTML()}</div>`,
      card:s.room?`<div class="dbig"><span class="lab">Stop ${s.round} of ${o.rounds} · ${esc(s.room.kind)}</span><div class="scard"><b>${esc(s.room.text)}</b></div><p><b id="nDone">${s.done.size}</b> of ${online().length} ready</p><div class="frow"><button class="ghost" id="bRedraw">Draw another card</button></div></div>`
        :`<div class="rbcards"><div class="rbhead"><span class="lab">Stop ${s.round} of ${o.rounds} · everyone has their own card</span><h2>Check your phone</h2><p><b id="nDone">${s.done.size}</b> of ${online().length} ready</p></div>${wall()}</div>`,
      build:`<div class="dbig"><span class="lab">Stop ${s.round} of ${o.rounds}</span>${clockHTML('huge')}${s.room?`<div class="scard small"><b>${esc(s.room.text)}</b></div>`:'<p>Your card is on your phone.</p>'}</div>`,
      done:`<div class="dbig"><span class="lab">Listening party</span><h2>Play them back</h2><p>Go round the room: play each track and tell its journey. Which card took it somewhere nobody expected?</p></div>`,
    };
    const lbl={brief:'Start the sketch',sketch:'Time: pass it on',pass:'Deal the cards',card:'Start the clock',build:s.round<o.rounds?'Pass it on again':'Listening party',done:'Back to the menu'}[s.phase];
    const seq=['sketch',...[...Array(o.rounds)].flatMap(()=>['pass','card','build']),'done'],at=s.phase==='brief'?-1:s.phase==='sketch'?0:s.phase==='done'?seq.length-1:1+(s.round-1)*3+['pass','card','build'].indexOf(s.phase);
    st.innerHTML=`<div class="destruct roundabout dots ph-${s.phase}">${bodies[s.phase]}<div class="dfoot"><div class="steps2">${seq.map((p,i)=>`<i class="${i<at?'past':i===at?'cur':''}" title="${p}"></i>`).join('')}</div><button class="big go" id="bNext">${esc(lbl)} <small>SPACE</small></button></div></div>`;
    $('#bNext').onclick=()=>this.next();if($('#bRedraw'))$('#bRedraw').onclick=()=>{s.room=rbDeal(1)[0];s.done=new Set();online().forEach(p=>this.logCard(p,s.room));sfx.card();render();syncAll();};
  },
  pstate(p){const s=G.gs,c=this.cardFor(p);return {k:s.phase+s.round+(c?c.text.length:0)+(s.done.has(p.id)?'d':'')+(s.swapped.has(p.id)?'s':''),ph:s.phase,round:s.round,rounds:s.o.rounds,card:c,done:s.done.has(p.id),canSwap:!s.room&&s.phase==='card'&&!s.swapped.has(p.id),clock:pClock()};},
  player(root,st){pClockStart(st.clock);
    const T={brief:['Get ready','Start a sketch when the timer starts.'],sketch:['Sketch!','Start something worth passing on.'],pass:['Pass it on!','Move one seat on, or pass your project file. Your card arrives in a moment.'],card:['Your card','Read it, then make it happen in the track in front of you.'],build:['Make it happen',''],done:['Listening party','Play your track back to the room.']}[st.ph];
    root.innerHTML=`<div class="pcol2 ${st.ph==='pass'?'rotating':''}">${pClockHTML(st.clock)}<h2 class="pbigt">${esc(T[0])}</h2>${T[1]?`<p>${esc(T[1])}</p>`:''}
      ${st.card?`<div class="scard rbphone"><span class="lab">Stop ${st.round} of ${st.rounds} · ${esc(st.card.kind)}</span><b>${esc(st.card.text)}</b></div>`:''}
      ${st.ph==='card'?`<button class="big go" id="pGot" ${st.done?'disabled':''}>${st.done?'Ready ✓':'Got it'}</button>${st.canSwap?'<button class="ghost" id="pSwap">Different card (once)</button>':''}`:''}</div>`;
    if($('#pGot',root))$('#pGot',root).onclick=()=>{papi.send({t:'got'});papi.vibe(20);};
    if($('#pSwap',root))$('#pSwap',root).onclick=()=>{papi.send({t:'swap'});papi.vibe(15);};
    if(st.ph==='pass')papi.vibe([60,60,60]);
  },
});

/* =====================================================================
   METAPHOR TRANSLATION — a picture becomes three production rules
   ===================================================================== */
function paintScene(c,art){
  const W=c.width=1600,H=c.height=900,x=c.getContext('2d'),R=Math.random,rg=(cx,cy,r,a,b)=>{const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,a);g.addColorStop(1,b);return g;},lg=(y0,y1,stops)=>{const g=x.createLinearGradient(0,y0,0,y1);stops.forEach(([o,c])=>g.addColorStop(o,c));return g;};
  const P={
    garage(){x.fillStyle=lg(0,H,[[0,'#0d1016'],[1,'#1c1f24']]);x.fillRect(0,0,W,H);
      for(let i=0;i<7;i++){const k=i/7,w=lerp(260,30,k),cx=W/2+(i%2?1:-1)*lerp(700,90,k),h=lerp(H,180,k);x.fillStyle=`rgb(${lerp(70,40,k)},${lerp(72,42,k)},${lerp(76,46,k)})`;x.fillRect(cx-w/2,H/2-h/2,w,h);}
      for(let i=0;i<6;i++){const k=i/6,cy=lerp(60,H/2-40,k),r=lerp(240,30,k);x.fillStyle=rg(W/2,cy,r,'rgba(255,150,40,.85)','rgba(255,150,40,0)');x.fillRect(0,0,W,H);}
      x.strokeStyle='rgba(230,190,60,.6)';x.lineWidth=6;for(let i=-6;i<=6;i++){x.beginPath();x.moveTo(W/2+i*20,H/2+40);x.lineTo(W/2+i*260,H);x.stroke();}},
    greenhouse(){x.fillStyle=lg(0,H,[[0,'#d9c48a'],[1,'#7a6a3a']]);x.fillRect(0,0,W,H);
      for(let i=0;i<260;i++){x.save();x.translate(R()*W,H*.25+R()*H*.8);x.rotate(R()*6);x.fillStyle=`hsla(${80+R()*60},${40+R()*30}%,${20+R()*30}%,.85)`;x.beginPath();x.ellipse(0,0,20+R()*70,8+R()*20,0,0,7);x.fill();x.restore();}
      x.strokeStyle='rgba(255,255,240,.55)';x.lineWidth=5;for(let i=0;i<=10;i++){x.beginPath();x.moveTo(i*W/10,H);x.lineTo(i*W/10,H*.35);x.quadraticCurveTo(W/2,-H*.2,W-i*W/10,H*.35);x.stroke();}for(let j=1;j<6;j++){x.beginPath();x.moveTo(0,H-j*110);x.lineTo(W,H-j*110);x.stroke();}
      x.fillStyle='rgba(255,200,120,.18)';x.fillRect(0,0,W,H);},
    neon(){x.fillStyle='#08070d';x.fillRect(0,0,W,H);x.filter='blur(18px)';[['#ff2bd6',520,300,'OPEN'],['#20e6ff',1050,230,'24H']].forEach(([c,cx,cy,t])=>{x.fillStyle=c;x.font='900 220px Archivo';x.fillText(t,cx-260,cy+80);});x.filter='blur(4px)';
      [['#ff2bd6',520,300,'OPEN'],['#20e6ff',1050,230,'24H']].forEach(([c,cx,cy,t])=>{x.strokeStyle=c;x.lineWidth=6;x.font='900 220px Archivo';x.strokeText(t,cx-260,cy+80);});x.filter='blur(30px)';
      x.fillStyle='rgba(255,43,214,.35)';x.fillRect(200,560,700,340);x.fillStyle='rgba(32,230,255,.3)';x.fillRect(850,560,600,340);x.filter='none';
      x.strokeStyle='rgba(200,220,255,.25)';x.lineWidth=2;for(let i=0;i<400;i++){const a=R()*W,b=R()*H;x.beginPath();x.moveTo(a,b);x.lineTo(a-8,b+40);x.stroke();}},
    ice(){x.fillStyle=lg(0,H,[[0,'#e8f6ff'],[1,'#5d9ec9']]);x.fillRect(0,0,W,H);
      for(let i=0;i<40;i++){x.fillStyle=`rgba(${200+R()*55},${230+R()*25},255,${.15+R()*.3})`;x.beginPath();x.ellipse(R()*W,R()*H,60+R()*260,40+R()*160,R()*3,0,7);x.fill();}
      for(let i=0;i<70;i++){const cx=R()*W,cy=R()*H,r=6+R()*28;x.fillStyle=rg(cx-r*.3,cy-r*.3,r,'rgba(255,255,255,.95)','rgba(120,180,220,.2)');x.beginPath();x.arc(cx,cy,r,0,7);x.fill();}
      x.fillStyle='rgba(60,120,170,.4)';for(let i=0;i<12;i++){const cx=R()*W;x.beginPath();x.moveTo(cx-10,0);x.quadraticCurveTo(cx,H*R(),cx+10,0);x.fill();}},
    desert(){x.fillStyle=lg(0,H*.55,[[0,'#fffbe9'],[1,'#f5d9a0']]);x.fillRect(0,0,W,H*.55);x.fillStyle=lg(H*.55,H,[[0,'#e2b46b'],[1,'#b77c3a']]);x.fillRect(0,H*.55,W,H*.45);
      x.fillStyle=rg(W*.7,H*.18,260,'rgba(255,255,255,1)','rgba(255,255,255,0)');x.fillRect(0,0,W,H);x.fillStyle='#3a3530';x.beginPath();x.moveTo(W/2-6,H*.55);x.lineTo(W/2+6,H*.55);x.lineTo(W*.95,H);x.lineTo(W*.05,H);x.fill();
      x.fillStyle='#f2e3b0';for(let i=0;i<12;i++){const k=i/12,y=lerp(H*.56,H,Math.pow(k,1.6)),w=lerp(2,26,k),h=lerp(4,60,k);x.fillRect(W/2-w/2,y,w,h);}
      x.fillStyle='rgba(255,255,255,.25)';for(let i=0;i<8;i++)x.fillRect(0,H*.5+i*8,W,2);},
    fog(){x.fillStyle=lg(0,H,[[0,'#9aa1a6'],[1,'#c8cdd0']]);x.fillRect(0,0,W,H);
      [[380,520],[640,560],[1180,500]].forEach(([cx,w],i)=>{x.fillStyle=`rgba(70,74,78,${.5-i*.08})`;x.beginPath();x.moveTo(cx-w/2,H);x.quadraticCurveTo(cx-w*.2,H*.55,cx-w*.32,H*.25);x.lineTo(cx+w*.32,H*.25);x.quadraticCurveTo(cx+w*.2,H*.55,cx+w/2,H);x.fill();});
      x.fillStyle='#ff2a2a';[[380,H*.24],[640,H*.24],[1180,H*.24]].forEach(([a,b])=>{x.beginPath();x.arc(a,b,7,0,7);x.fill();});
      for(let i=0;i<9;i++){x.fillStyle=`rgba(225,229,232,${.25+R()*.3})`;x.fillRect(0,H*(.3+i*.08)+R()*30,W,40+R()*90);}x.filter='blur(30px)';x.drawImage(c,0,0);x.filter='none';},
    pool(){x.fillStyle='#d8d2c4';x.fillRect(0,0,W,H);x.fillStyle='#7fc8c2';x.beginPath();x.moveTo(200,250);x.lineTo(1400,250);x.lineTo(1580,900);x.lineTo(20,900);x.fill();
      x.strokeStyle='rgba(30,80,80,.35)';x.lineWidth=3;for(let i=0;i<=20;i++){x.beginPath();x.moveTo(200+i*60,250);x.lineTo(20+i*78,900);x.stroke();}for(let j=0;j<12;j++){const y=250+j*55;x.beginPath();x.moveTo(200-j*15,y);x.lineTo(1400+j*15,y);x.stroke();}
      x.strokeStyle='#3a3a3a';x.lineWidth=4;x.beginPath();x.moveTo(500,420);x.lineTo(620,560);x.lineTo(600,700);x.lineTo(760,880);x.stroke();
      for(let i=0;i<60;i++){x.fillStyle=`hsl(${25+R()*30},60%,${30+R()*20}%)`;x.beginPath();x.ellipse(200+R()*1200,600+R()*300,12,6,R()*3,0,7);x.fill();}
      x.fillStyle='#ff4fa1';x.font='900 90px Archivo';x.save();x.translate(900,520);x.rotate(-.05);x.fillText('NO DIVING',0,0);x.restore();},
    fireworks(){x.fillStyle=lg(0,H,[[0,'#05061a'],[.6,'#121640'],[.62,'#cfd8ef'],[1,'#8e9bc0']]);x.fillRect(0,0,W,H);
      [[400,200,'#ff4b4b'],[900,140,'#ffd34b'],[1250,260,'#4bd6ff'],[700,330,'#9f6bff']].forEach(([cx,cy,c])=>{x.strokeStyle=c;x.lineWidth=3;for(let i=0;i<60;i++){const a=i/60*Math.PI*2,r=80+R()*90;x.globalAlpha=.85;x.beginPath();x.moveTo(cx+Math.cos(a)*20,cy+Math.sin(a)*20);x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);x.stroke();}
        x.globalAlpha=.35;x.filter='blur(8px)';x.beginPath();x.ellipse(cx,H*.62+(H*.62-cy)*.35,150,40,0,0,7);x.fillStyle=c;x.fill();x.filter='none';x.globalAlpha=1;});
      x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=2;for(let i=0;i<30;i++){x.beginPath();x.moveTo(R()*W,H*.62+R()*H*.38);x.lineTo(R()*W,H*.62+R()*H*.38);x.stroke();}},
  };
  (P[art]||P.fog)();
}
game({
  id:'metaphor',group:'make',name:'Metaphor Translation',tag:'An image on the big screen. Translate it into three production rules. The room votes.',
  how:['A picture appears: a parking garage at night, melting ice, neon in the rain…','On your phone, write three concrete production rules that would make it sound like that.','Everyone votes for the translation that nails the mood. Votes are points.'],
  badges:['Scored by votes','Writing'],kind:'free',
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="8" width="38" height="30" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><circle cx="16" cy="18" r="5" fill="var(--yel)"/><path d="M4 38 L18 26 L28 34 L42 22 L42 38 Z" fill="var(--green)" stroke="var(--ink)" stroke-width="2.5"/><path d="M46 44 q4 -8 8 0 t8 0" fill="none" stroke="var(--red)" stroke-width="4"/><path d="M38 52 q4 -8 8 0 t8 0" fill="none" stroke="var(--ink)" stroke-width="4"/></svg>`,
  options:[{key:'n',label:'Pictures',choices:[[1,'1'],[2,'2'],[3,'3']],def:2},{key:'secs',label:'Writing time',choices:[[120,'2','min'],[180,'3','min'],[300,'5','min']],def:180},{key:'vsecs',label:'Voting time',choices:[[45,'45','sec'],[60,'60','sec'],[90,'90','sec']],def:60}],
  note:'The pictures are painted live by the app. You can also add your own images on the next screen, or list photos in data/content.js (SCENES → src).',
  topInfo(){const s=G.gs;return !s?this.tag:s.phase==='brief'?'Pick the pictures':`Picture ${s.i+1} of ${s.scenes.length} · ${({show:'look',write:'write',vote:'vote',result:'results'})[s.phase]||''}`;},
  start(o){G.gs={o,phase:'brief',scenes:shuffle(SCENES).slice(0,o.n),custom:[],i:-1,subs:new Map(),votes:new Map(),hidden:new Set()};},
  go(ph){const s=G.gs;s.phase=ph;stopClock();clearLater();
    if(ph==='show'){s.i++;s.subs=new Map();s.votes=new Map();s.hidden=new Set();sfx.whoosh();later(()=>{if(G.gs===s&&s.phase==='show')this.go('write');},9000);}
    if(ph==='write')startClock(s.o.secs*1000,()=>this.go('vote'));
    if(ph==='vote'){if(!s.subs.size){toast('No translations came in');}startClock(s.o.vsecs*1000,()=>this.go('result'));s.order=shuffle([...s.subs.keys()]);}
    if(ph==='result')this.score();
    render();syncAll();},
  score(){const s=G.gs,tally=new Map();s.votes.forEach(id=>tally.set(id,(tally.get(id)||0)+1));s.tally=tally;const max=Math.max(0,...tally.values());
    s.subs.forEach((v,id)=>{const p=G.players.get(id);if(!p||s.hidden.has(id))return;const nv=tally.get(id)||0;award(p,100+nv*250+(max>0&&nv===max?300:0));if(max>0&&nv===max)logAdd(p,{kind:"star",game:this.name,text:`Top translation of “${s.scenes[s.i].title}” · ${nv} vote${nv===1?"":"s"}`});});sfx.reveal(70);saveRoom();},
  next(){const s=G.gs;({brief:()=>this.go('show'),show:()=>this.go('write'),write:()=>this.go('vote'),vote:()=>this.go('result'),result:()=>s.i+1<s.scenes.length?this.go('show'):(s.phase='end',sfx.fanfare(),render(),syncAll()),end:()=>exitGame(true)})[s.phase]();},
  frame(){clockFrame();},
  act(p,d){const s=G.gs;
    if(d.t==='sub'&&s.phase==='write'&&Array.isArray(d.rules)){const rules=d.rules.map(x=>String(x||'').trim().slice(0,90)).filter(Boolean).slice(0,3);if(!rules.length)return;if(!s.subs.has(p.id))logAdd(p,{kind:'rules',game:this.name,title:s.scenes[s.i]?s.scenes[s.i].title:'',text:rules.map((r,k)=>`${k+1}. ${r}`).join('\n')});s.subs.set(p.id,rules);sfx.inn();const e=$('#nSubs');if(e)e.textContent=s.subs.size;sync(p);
      if(online().every(x=>s.subs.has(x.id)))later(()=>{if(G.gs===s&&s.phase==='write')this.go('vote');},1200);}
    if(d.t==='vote'&&s.phase==='vote'&&s.subs.has(d.id)&&d.id!==p.id){s.votes.set(p.id,d.id);sfx.vote();const e=$('#nVotes');if(e)e.textContent=s.votes.size;sync(p);}},
  imgHTML(sc){return sc.src?`<img class="scimg" src="${esc(sc.src)}" alt="">`:`<canvas class="scimg" data-art="${esc(sc.art)}"></canvas>`;},
  render(st){
    const s=G.gs;
    if(s.phase==='end'){rPodium(st,{title:'Best translators'});return;}
    if(s.phase==='brief'){
      st.innerHTML=`<div class="mbrief dots"><h2 class="qtext">Pictures for this game</h2><div class="mthumbs">${s.scenes.map((sc,i)=>`<figure>${this.imgHTML(sc)}<figcaption>${esc(sc.title)}</figcaption><button class="ghost" data-x="${i}">Remove</button></figure>`).join('')}
        <label class="mdrop"><input type="file" accept="image/*" multiple hidden><b>+ Add your own</b><span>drop or choose image files — a title is asked for each</span></label></div>
        <div class="frow"><button class="ghost" id="bShuffle">Different pictures</button><span></span><button class="big go" id="bNext" ${s.scenes.length?'':'disabled'}>Show the first picture <small>SPACE</small></button></div></div>`;
      $$('[data-x]',st).forEach(b=>b.onclick=()=>{s.scenes.splice(+b.dataset.x,1);render();});
      $('#bShuffle').onclick=()=>{s.scenes=shuffle(SCENES).slice(0,s.o.n);render();};
      const add=files=>{[...files].forEach(f=>{if(!f.type.startsWith('image/'))return;const t=prompt('A title for this picture?',f.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' '))||'Untitled';s.scenes.push({title:t,src:URL.createObjectURL(f)});});render();};
      const inp=$('.mdrop input',st);inp.onchange=()=>add(inp.files);const dz=$('.mdrop',st);dz.ondragover=e=>{e.preventDefault();dz.classList.add('over');};dz.ondragleave=()=>dz.classList.remove('over');dz.ondrop=e=>{e.preventDefault();add(e.dataTransfer.files);};
      $('#bNext').onclick=()=>this.next();
    }else{
      const sc=s.scenes[s.i],subs=[...s.subs.entries()];
      let side='';
      if(s.phase==='show')side=`<h2>${esc(sc.title)}</h2><p>Look. Feel it. What would it sound like?</p>`;
      if(s.phase==='write')side=`<span class="lab">Translate it into three production rules</span>${clockHTML('mid')}<div class="stat"><b id="nSubs">${s.subs.size}</b><span>of ${online().length} sent in</span></div><div class="chips">${METAPHOR_CHIPS.slice(0,8).map(c=>`<span>${esc(c)}</span>`).join('')}</div>`;
      if(s.phase==='vote'||s.phase==='result'){const ordered=s.phase==='result'?subs.slice().sort((a,b)=>(s.tally.get(b[0])||0)-(s.tally.get(a[0])||0)):s.order.map(id=>[id,s.subs.get(id)]);
        side=`${s.phase==='vote'?`<span class="lab">Vote on your phone · <b id="nVotes">${s.votes.size}</b> in</span>${clockHTML('mid')}`:'<span class="lab">Results</span>'}
        <div class="mcards">${ordered.map(([id,rules],k)=>{const p=G.players.get(id),v=s.tally?s.tally.get(id)||0:0;return `<div class="mcard ${s.hidden.has(id)?'hid':''} ${s.phase==='result'&&k===0&&v?'win':''}" data-id="${esc(id)}"><b>${s.phase==='result'?esc(p?p.name:'?'):'#'+(k+1)}</b>${s.phase==='result'?`<em>${v} vote${v===1?'':'s'}</em>`:''}<ol>${rules.map(r=>`<li>${esc(r)}</li>`).join('')}</ol></div>`;}).join('')||'<p class="fine">No translations.</p>'}</div>${s.phase==='vote'?'<p class="fine">Click a card to hide it from the vote.</p>':''}`;}
      const lbl={show:'Start writing',write:'Close writing — vote',vote:'Show the results',result:s.i+1<s.scenes.length?'Next picture':'Final standings'}[s.phase];
      st.innerHTML=`<div class="meta ph-${s.phase}"><div class="mimg">${this.imgHTML(sc)}<div class="mtitle">${esc(sc.title)}</div></div><aside class="mside">${side}<button class="big go" id="bNext">${esc(lbl)} <small>SPACE</small></button></aside></div>`;
      $('#bNext').onclick=()=>this.next();
      if(s.phase==='vote')$$('.mcard',st).forEach(c=>c.onclick=()=>{const id=c.dataset.id;s.hidden.has(id)?s.hidden.delete(id):s.hidden.add(id);if(s.hidden.has(id))[...s.votes].forEach(([v,t])=>{if(t===id)s.votes.delete(v);});render();syncAll();});
    }
    $$('canvas.scimg',st).forEach(c=>paintScene(c,c.dataset.art));
  },
  pstate(p){const s=G.gs;const base={k:s.phase+s.i+(s.subs.has(p.id)?'s':'')+(s.votes.has(p.id)?'v'+s.votes.get(p.id):'')+(s.hidden?s.hidden.size:0),ph:s.phase,i:s.i,n:s.scenes.length,title:s.scenes[s.i]?s.scenes[s.i].title:'',clock:pClock(),gp:p.gp,rank:rankBy('gp').map.get(p.id),of:G.players.size};
    if(s.phase==='write')return {...base,sent:s.subs.get(p.id)||null,chips:METAPHOR_CHIPS};
    if(s.phase==='vote')return {...base,cards:s.order.filter(id=>!s.hidden.has(id)).map((id,k)=>({id,k:k+1,rules:s.subs.get(id),mine:id===p.id})),voted:s.votes.get(p.id)};
    if(s.phase==='result')return {...base,got:s.tally.get(p.id)||0};
    return base;},
  player(root,st){pClockStart(st.clock);
    if(st.ph==='brief'||st.ph==='show'){root.innerHTML=`<div class="pcenter dots"><div class="lab">${st.ph==='show'?`Picture ${st.i+1} of ${st.n}`:'Get ready'}</div><h2 class="pul">Look up</h2><p>${st.ph==='show'?esc(st.title):'A picture is about to appear on the big screen.'}</p></div>`;return;}
    if(st.ph==='write'){
      if(st.sent){root.innerHTML=`<div class="pcol2">${pClockHTML(st.clock)}<h2 class="pbigt">Sent ✓</h2><ol class="prules">${st.sent.map(r=>`<li>${esc(r)}</li>`).join('')}</ol><p class="fine">Wait for the vote.</p></div>`;return;}
      const draft=PL.draft&&PL.draft.i===st.i?PL.draft.r:['','',''];PL.draft={i:st.i,r:draft};
      root.innerHTML=`<div class="pcol2 pwrite">${pClockHTML(st.clock)}<p class="lab">${esc(st.title)}</p><h2 class="pbigt">Three rules</h2>${[0,1,2].map(i=>`<input class="prule" maxlength="90" placeholder="Rule ${i+1}" value="${esc(draft[i])}">`).join('')}
        <div class="pchips">${shuffle(st.chips).slice(0,8).map(c=>`<button class="pchip">${esc(c)}</button>`).join('')}</div><button class="big go" id="pSend">Send</button></div>`;
      const ins=$$('.prule',root);ins.forEach((x,i)=>x.oninput=()=>{draft[i]=x.value;});
      $$('.pchip',root).forEach(b=>b.onclick=()=>{const i=draft.findIndex(v=>!v.trim());if(i<0)return;draft[i]=b.textContent;ins[i].value=draft[i];});
      $('#pSend',root).onclick=()=>{if(!draft.some(v=>v.trim())){ins[0].focus();return;}papi.send({t:'sub',rules:draft});papi.vibe(20);};return;}
    if(st.ph==='vote'){root.innerHTML=`<div class="pcol2">${pClockHTML(st.clock)}<h2 class="pbigt">Vote</h2><p>Which translation sounds most like the picture?</p><div class="pmcards">${st.cards.filter(c=>!c.mine).map(c=>`<button class="pmcard ${st.voted===c.id?'on':''}" data-id="${esc(c.id)}"><b>#${c.k}</b><ol>${c.rules.map(r=>`<li>${esc(r)}</li>`).join('')}</ol></button>`).join('')||'<p>Nothing to vote on.</p>'}</div></div>`;
      $$('.pmcard',root).forEach(b=>b.onclick=()=>{papi.send({t:'vote',id:b.dataset.id});papi.vibe(15);});return;}
    if(st.ph==='result'){root.innerHTML=`<div class="pcenter dots"><div class="lab">Your translation got</div><div class="rankbig">${st.got}</div><p>vote${st.got===1?'':'s'} · ${st.gp} pts this game</p></div>`;return;}
    pRankCard(root,{...st,streak:0},'Final result');
  },
});

/* =====================================================================
   PARAMETER TELEPHONE — design a patch, the next person recreates it by
   ear and twists one knob, and so on. Then hear how far it drifted.
   ===================================================================== */
function knobSVG(v){const a0=135,a1=405,ang=a0+v*270,R=26,c=32,pt=a=>[c+R*Math.cos(a*Math.PI/180),c+R*Math.sin(a*Math.PI/180)];
  const arc=(x,y)=>{const [sx,sy]=pt(x),[ex,ey]=pt(y);return `M${sx.toFixed(1)} ${sy.toFixed(1)}A${R} ${R} 0 ${y-x>180?1:0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;};const [kx,ky]=pt(ang);
  return `<svg viewBox="0 0 64 64"><path d="${arc(a0,a1)}" fill="none" stroke="var(--hair)" stroke-width="5" stroke-linecap="round"/>${v>.005?`<path d="${arc(a0,ang)}" fill="none" stroke="var(--c,var(--red))" stroke-width="5" stroke-linecap="round"/>`:''}<circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="4.5" fill="var(--c,var(--red))" stroke="var(--ink)" stroke-width="1.5"/><circle cx="32" cy="32" r="2.5" fill="var(--ink)"/></svg>`;}
function patchBars(p,ref){return `<div class="pbars">${PATCH_KNOBS.map(({k,l})=>`<i title="${l}"><b style="height:${Math.round(p[k]*100)}%"></b>${ref?`<s style="bottom:${Math.round(ref[k]*100)}%"></s>`:''}<span>${l.slice(0,3)}</span></i>`).join('')}</div>`;}
function synStop(){if(PL.synH){try{PL.synH.h.stop();}catch(e){}PL.synH=null;}AU_stopAll();}
game({
  id:'telephone',group:'ears',name:'Parameter Telephone',tag:'Design a synth sound. The next person recreates it by ear — and twists one knob.',
  how:['Headphones on! Everyone listens on their own phone, and the differences are small.','Everyone designs a patch on their phone’s eight-knob synth.','Each round you get someone else’s sound — no settings, just ears. Recreate it, then change exactly one knob and pass it on.','At the end, each chain plays from first to last on the big screen. Points for how close your copies were.'],
  badges:['Scored','Sound design','Uses phone speakers'],kind:'free',
  icon:`<svg viewBox="0 0 64 64"><circle cx="16" cy="20" r="11" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><path d="M16 20 L22 12" stroke="var(--red)" stroke-width="4"/><circle cx="48" cy="44" r="11" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><path d="M48 44 L40 50" stroke="var(--blue)" stroke-width="4"/><path d="M26 26 Q40 22 40 34" fill="none" stroke="var(--ink)" stroke-width="3" stroke-dasharray="4 4"/></svg>`,
  options:[{key:'gens',label:'Generations',choices:[[3,'3','make + 2 copies'],[4,'4'],[5,'5']],def:3},{key:'csecs',label:'Design time',choices:[[60,'1','min'],[90,'1.5','min'],[120,'2','min']],def:90},{key:'rsecs',label:'Recreate time',choices:[[120,'2','min'],[180,'3','min'],[240,'4','min']],def:180},
    {key:'test',label:'Test mode',choices:[[0,'Off','real players only'],[1,'Bots','two bots join the chain']],def:0}],
  note:'Students listen on their own phones, so ask everyone to put headphones on before you start. Play loops until pressed again, and every knob turn is heard at once. Needs at least two players, or turn on Test mode: two bots join the chain so you can try it with one phone.',
  check:v=>online().length>=2||(v&&v.test&&online().length>=1)?'':'At least two phones need to be in the room (or turn on Test mode)',
  topInfo(){const s=G.gs;return !s?this.tag:s.phase==='brief'?'Ready':s.phase==='create'?'Generation 1 · design':s.phase==='recreate'?`Generation ${s.r+1} of ${s.gens} · recreate`:s.phase==='reveal'?`Chain ${s.c+1} of ${s.N}`:'Final';},
  start(o){const bots=o.test?['Bot Moog','Bot Buchla']:[],botNames={};bots.forEach((n,i)=>botNames['bot:'+i]=n);
    const ids=shuffle([...online().map(p=>p.id),...Object.keys(botNames)]),N=ids.length;G.gs={o,phase:'brief',ids,N,gens:Math.min(o.gens,N),r:0,c:0,chains:ids.map(()=>[]),subs:new Set(),botNames};},
  isBot(id){return !!(G.gs.botNames||{})[id];},
  nameOf(id){const s=G.gs;return (G.players.get(id)||{name:(s.botNames||{})[id]||'?'}).name;},
  chainFor(j,r){const s=G.gs;return ((j-r)%s.N+s.N)%s.N;},
  go(ph){const s=G.gs;s.phase=ph;stopClock();clearLater();s.subs=new Set();
    if(ph==='create')startClock(s.o.csecs*1000,()=>this.close());
    if(ph==='recreate')startClock(s.o.rsecs*1000,()=>this.close());
    if((ph==='create'||ph==='recreate')&&s.botNames)Object.keys(s.botNames).forEach((id,i)=>later(()=>{if(G.gs===s&&s.phase===ph){s.subs.add(id);sfx.inn();render();}},2500+i*1800));
    if(ph==='reveal'){s.c=0;sfx.fanfare();}
    render();syncAll();},
  close(){const s=G.gs;// anyone who didn't submit: fill in so every chain stays whole
    s.ids.forEach((id,j)=>{const c=this.chainFor(j,s.r),ch=s.chains[c];if(ch[s.r])return;const prev=ch[s.r-1];
      if(this.isBot(id)){if(!prev){ch[s.r]={by:id,p:randomPatch(),bot:true};return;}
        // a bot copies by ear: close on every knob, never exact — then twists one knob
        const copy=Object.fromEntries(PATCH_KNOBS.map(({k})=>[k,Math.round(clamp(prev.p[k]+(Math.random()-.5)*.18,0,1)*100)/100])),tw={...copy},k=pick(PATCH_KNOBS).k;
        tw[k]=Math.round(clamp(tw[k]+(Math.random()<.5?-1:1)*(.25+Math.random()*.3),0,1)*100)/100;
        ch[s.r]={by:id,p:tw,copy,acc:clamp(1-patchDist(copy,prev.p)*2.2,0,1),bot:true};return;}
      if(!prev)ch[s.r]={by:id,p:randomPatch(),auto:true};else{const p={...prev.p},k=pick(PATCH_KNOBS).k;p[k]=Math.round(Math.random()*100)/100;ch[s.r]={by:id,p,copy:prev.p,acc:0,auto:true};}});
    if(s.r>0)s.ids.forEach((id,j)=>{const it=s.chains[this.chainFor(j,s.r)][s.r];const pl=G.players.get(id);if(pl&&!it.auto&&it.acc!=null){award(pl,Math.round(it.acc*1000/10)*10);logAdd(pl,{kind:'finish',game:this.name,text:`Generation ${s.r+1} copy · ${Math.round(it.acc*100)}% accurate`});}});
    if(s.r+1<s.gens){s.r++;this.go('recreate');}else this.go('reveal');saveRoom();},
  next(){const s=G.gs;if(s.phase==='brief')this.go('create');else if(s.phase==='create'||s.phase==='recreate')this.close();else if(s.phase==='reveal'){if(s.c+1<s.N){s.c++;stopAud();render();syncAll();}else{s.phase='end';stopAud();sfx.fanfare();render();syncAll();}}else exitGame(true);},
  stop(){stopAud();},
  frame(){clockFrame();},
  act(p,d){const s=G.gs,j=s.ids.indexOf(p.id);if(j<0||d.t!=='sub'||d.r!==s.r||(s.phase!=='create'&&s.phase!=='recreate'))return;
    const c=this.chainFor(j,s.r),ch=s.chains[c],clean=o=>Object.fromEntries(PATCH_KNOBS.map(({k})=>[k,clamp(+(o&&o[k])||0,0,1)]));
    if(ch[s.r]&&!ch[s.r].auto)return;
    if(s.r===0)ch[0]={by:p.id,p:clean(d.p)};else{const copy=clean(d.copy),tw=clean(d.p),acc=clamp(1-patchDist(copy,ch[s.r-1].p)*2.2,0,1);ch[s.r]={by:p.id,p:tw,copy,acc};}
    s.subs.add(p.id);sfx.inn();const e=$('#nSubs');if(e)e.textContent=s.subs.size;sync(p);
    if(s.ids.every(id=>s.subs.has(id)||this.isBot(id)||!(G.players.get(id)||{}).conn))later(()=>{if(G.gs===s&&(s.phase==='create'||s.phase==='recreate'))this.close();},1200);},
  playChain(){const s=G.gs,ch=s.chains[s.c];let t=0;ch.forEach((g,k)=>{later(()=>{if(G.gs!==s||s.phase!=='reveal')return;setAud(playPatch(g.p));$$('.gen').forEach((x,i)=>x.classList.toggle('playing',i===k));},t);t+=4600;});},
  render(st){
    const s=G.gs,P=id=>this.nameOf(id);
    if(s.phase==='end'){rPodium(st,{title:'Golden ears'});return;}
    if(s.phase==='reveal'){const ch=s.chains[s.c],o=ch[0];
      st.innerHTML=`<div class="tele dots"><div class="rtop"><span class="lab">Chain ${s.c+1} of ${s.N} · started by ${esc(P(o.by))}</span><h2>How far did it drift?</h2></div>
        <div class="gens">${ch.map((g,k)=>`<div class="gen ${k?'':'orig'}"><span class="lab">${k?'Copy '+k:'Original'}</span><b>${esc(P(g.by))}${g.auto?' <em>(auto)</em>':''}</b>${patchBars(g.p,k?o.p:null)}<p class="fine">${k?`drift from original ${Math.round(patchDist(g.p,o.p)*100)}% · copy accuracy ${Math.round((g.acc||0)*100)}%`:'the starting sound'}</p></div>`).join('<i class="garrow">→</i>')}</div>
        <div class="dfoot"><button class="ghost" id="bPlay">▶ Play the chain, first to last</button><span></span><button class="big go" id="bNext">${s.c+1<s.N?'Next chain':'Final standings'} <small>SPACE</small></button></div></div>`;
      $('#bPlay').onclick=()=>this.playChain();$('#bNext').onclick=()=>this.next();later(()=>this.playChain(),600);return;}
    const head={brief:`<h2>Design a sound</h2><p>Everyone gets an eight-knob synth on their phone. ${s.N} players → ${s.N} chains, ${s.gens} generations each.</p>`,
      create:`<span class="lab">Generation 1 · design your patch</span>${clockHTML('huge')}`,
      recreate:`<span class="lab">Generation ${s.r+1} of ${s.gens} · recreate by ear, then twist ONE knob</span>${clockHTML('huge')}`}[s.phase];
    st.innerHTML=`<div class="tele dots"><div class="rtop">${head}</div>${s.phase!=='brief'?`<div class="stat center"><b id="nSubs">${s.subs.size}</b><span>of ${s.N} sent on</span></div>`:''}
      <div class="ring2">${s.ids.map((id,j)=>`<span class="c${j%4}">${shape(j,22,'var(--ink)','var(--c)')}${esc(P(id))}${s.subs.has(id)?' ✓':''}</span>`).join('<i>→</i>')}</div>
      <div class="dfoot"><span></span><button class="big go" id="bNext">${s.phase==='brief'?'Start designing':'Close this round'} <small>SPACE</small></button></div></div>`;
    $('#bNext').onclick=()=>this.next();
  },
  pstate(p){const s=G.gs,j=s.ids.indexOf(p.id),base={k:s.phase+s.r+s.c+(s.subs.has(p.id)?'s':''),ph:s.phase,r:s.r,gens:s.gens,clock:pClock(),gp:p.gp,rank:rankBy('gp').map.get(p.id),of:G.players.size};
    if(j<0)return {...base,watch:true};
    if(s.phase==='recreate'){const prev=s.chains[this.chainFor(j,s.r)][s.r-1];return {...base,mystery:prev?prev.p:PATCH_DEFAULT,sent:s.subs.has(p.id)};}
    if(s.phase==='create')return {...base,sent:s.subs.has(p.id)};
    if(s.phase==='reveal'){const mine=s.chains.flatMap(ch=>ch).filter(g=>g.by===p.id&&g.acc!=null);return {...base,acc:mine.length?Math.round(100*mine.reduce((a,g)=>a+g.acc,0)/mine.length):null};}
    return base;},
  player(root,st){pClockStart(st.clock);if(PL.synH&&(st.sent||!/create|recreate/.test(st.ph)||(PL.syn&&PL.syn.key!=='tp'+st.ph+st.r)))synStop();
    if(st.watch){root.innerHTML=`<div class="pcenter"><h2>Watching</h2><p>This game started before you joined — join the next one!</p></div>`;return;}
    if(st.ph==='brief'){root.innerHTML=`<div class="pcenter dots"><h2 class="pul">Headphones on</h2><p>You’ll design a synth sound on your phone. Plug in your headphones now: the differences between sounds are small.</p></div>`;return;}
    if(st.ph==='reveal'||st.ph==='end'){root.innerHTML=`<div class="pcenter dots"><div class="lab">Your copies were</div><div class="rankbig">${st.acc??'—'}<sup>%</sup></div><p>accurate · ${st.gp} pts · watch the big screen</p></div>`;return;}
    if(st.sent){root.innerHTML=`<div class="pcol2">${pClockHTML(st.clock)}<h2 class="pbigt">Sent on ✓</h2><p>Waiting for the others…</p></div>`;return;}
    // the synth: knobs, play buttons, and in a recreate round the copy → twist steps
    const key='tp'+st.ph+st.r,S=PL.syn&&PL.syn.key===key?PL.syn:(PL.syn={key,p:{...PATCH_DEFAULT},step:st.ph==='create'?'design':'copy',copy:null,tw:null});
    const draw=()=>{
      const twisting=S.step==='twist';
      root.innerHTML=`<div class="psynth">${pClockHTML(st.clock)}<p class="lab">${st.ph==='create'?'Design a sound — make it yours':twisting?'Now change ONE knob — your twist':'Recreate the mystery sound by ear'}</p><p class="phones">🎧 Headphones on · press Play and turn the knobs while it loops</p>
        <div class="pknobs">${PATCH_KNOBS.map(({k,l,fmt},i)=>`<div class="pknob c${i%4} ${twisting&&S.tw&&S.tw!==k?'off':''}" data-k="${k}">${knobSVG(S.p[k])}<b>${l}</b><span>${esc(fmt(S.p[k]))}</span></div>`).join('')}</div>
        <div class="frow pcenterrow">${st.ph==='recreate'?`<button class="ghost ${PL.synH&&PL.synH.which==='my'?'on':''}" id="pMy">${PL.synH&&PL.synH.which==='my'?'■ Stop':'▶ Mystery'}</button>`:''}<button class="ghost ${PL.synH&&PL.synH.which==='mine'?'on':''}" id="pMine">${PL.synH&&PL.synH.which==='mine'?'■ Stop':'▶ '+(st.ph==='create'?'Play':'Mine')}</button></div>
        <button class="big go" id="pGo">${st.ph==='create'?'Send it on':twisting?(S.tw?'Send it on':'Turn one knob first'):'Lock my copy'}</button></div>`;
      $$('.pknob',root).forEach(n=>{const k=n.dataset.k;let y0=0,v0=0;
        n.addEventListener('pointerdown',e=>{if(twisting&&S.tw&&S.tw!==k)return;n.setPointerCapture(e.pointerId);y0=e.clientY;v0=S.p[k];if(twisting)S.tw=k;});
        n.addEventListener('pointermove',e=>{if(!n.hasPointerCapture(e.pointerId))return;S.p[k]=Math.round(clamp(v0+(y0-e.clientY)/160,0,1)*100)/100;if(PL.synH&&PL.synH.which==='mine')PL.synH.h.set(S.p);$('svg',n).outerHTML=knobSVG(S.p[k]);$('span',n).textContent=PATCH_KNOBS.find(x=>x.k===k).fmt(S.p[k]);});
        n.addEventListener('pointerup',()=>{if(twisting)draw();});});
      // play buttons loop until pressed again; turning a knob changes "Mine" while you listen
      const toggle=which=>{const was=PL.synH&&PL.synH.which;synStop();if(was!==which){PL.synH={which,h:playPatch(which==='my'?st.mystery:S.p,null,{loops:0})};}draw();};
      if($('#pMy',root))$('#pMy',root).onclick=()=>toggle('my');
      $('#pMine',root).onclick=()=>toggle('mine');
      $('#pGo',root).onclick=()=>{synStop();
        if(st.ph==='create'){papi.send({t:'sub',r:0,p:S.p});return;}
        if(S.step==='copy'){S.copy={...S.p};S.step='twist';draw();return;}
        if(!S.tw)return;papi.send({t:'sub',r:st.r,copy:S.copy,p:S.p});};
    };draw();
  },
});
// Parameter Telephone sits with the ear-training games, in slot 10 just before Meter Lab
(()=>{const i=GAMES.findIndex(g=>g.id==='telephone');if(i<0)return;const [tel]=GAMES.splice(i,1);const m=GAMES.findIndex(g=>g.id==='meterlab');GAMES.splice(m<0?GAMES.length:m,0,tel);})();
