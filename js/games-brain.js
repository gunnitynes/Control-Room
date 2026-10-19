/* ====================================================================
   KNOW YOUR STUFF — The Quiz · DAW Shortcut Showdown · The Translation Grid
   ==================================================================== */

/* ---------- multiple choice, shared by several games ---------- */
function mcTiles(r,ctx,{optHTML}={}){
  const rev=ctx.phase==='reveal',votes=[0,0,0,0];ctx.list.forEach(x=>{if(x.a!=null&&votes[x.a]!=null)votes[x.a]++;});const max=Math.max(1,...votes);
  return `<div class="tiles ${ctx.phase==='prep'?'hidden':rev?'':'in'}">${r.opts.map((o,i)=>`<div class="tile c${i} ${rev?(i===r.c?'yes':'no'):''}"><i class="bar" data-w="${100*votes[i]/max}"></i>${shape(i,40)}<div class="tx">${optHTML?optHTML(o,i):esc(o)}</div><span class="votes">${votes[i]}</span>${rev&&i===r.c?'<span class="stamp">Right</span>':''}</div>`).join('')}</div>`;
}
function animateBars(m){requestAnimationFrame(()=>requestAnimationFrame(()=>$$('.bar',m).forEach(b=>b.style.width=b.dataset.w+'%')));}
function mcInput(root,pub,submit){
  root.innerHTML=`<div class="opts${pub.kind?' k-'+pub.kind:''}">${pub.opts.map((o,i)=>`<button class="opt c${i}" data-i="${i}">${shape(i,30)}<span>${pub.html?o:esc(o)}</span></button>`).join('')}</div>`;
  $$('.opt',root).forEach(b=>b.onclick=()=>submit(+b.dataset.i));
}
function mcLocked(box,mine,pub){box.innerHTML=`<div class="lockcard c${mine}">${shape(mine,40)}<span>${pub.html?pub.opts[mine]:esc(pub.opts[mine])}</span></div>`;}
function mcPReveal(box,st){if(st.cls==='yes'||!st.rv)return;box.innerHTML=`<p>The answer was</p><div class="lockcard c${st.rv.c}">${shape(st.rv.c,34)}<span>${st.pub.html?st.pub.opts[st.rv.c]:esc(st.pub.opts[st.rv.c])}</span></div>`;}
function mcSpec(spec){return Object.assign({
  public:r=>({opts:r.opts,html:!!spec.htmlOpts,kind:spec.kind}),
  input:mcInput,locked:mcLocked,pReveal:mcPReveal,
  score:(r,a)=>({acc:a===r.c?1:0}),
  publicReveal:r=>({c:r.c}),
  valid:(r,a)=>Number.isInteger(a)&&a>=0&&a<4,
  ringLabel:r=>({label:LET[r.c],sub:'is right',fill:COLS[r.c]}),
},spec);}
function shuffledOpts(opts,c){const order=shuffle([0,1,2,3]);return {opts:order.map(k=>opts[k]),c:order.indexOf(c)};}

/* ---------- 01 · THE QUIZ ---------- */
// three banks (data/quiz-questions.js): The Workbench, The Machine Room, The Studio Vault, each in categories.
// A bank's categories are the multi option c_<bank id>; an unknown bank (an old saved setup) falls back to the first.
const bankOf=id=>BANKS.find(b=>b.id===id)||BANKS[0],bankN=b=>b.cats.reduce((a,c)=>a+c.qs.length,0);
/* picture questions (data/quiz-pics.js, built by tools/quizpics): each photo asks its name, and where it applies its type
   (dynamic / condenser / ribbon, compressor / reverb…) or its maker. Wrong answers come from the same kind of gear, fresh every game. */
const PIC_Q={name:{mic:'Which microphone is this?',box:'Which piece of studio gear is this?',desk:'Which console is this?',tape:'Which tape machine is this?',synth:'Which synth is this?',keys:'Which instrument is this?',drum:'Which machine is this?',sampler:'Which sampler is this?',conn:'Which connector is this?',studio:'What is this?',room:'What is this?'},
  type:{mic:'What kind of microphone is this?',box:'What does this box do?',desk:'What is this?',tape:'What is this?'},maker:'Who made this?'};
const PIC_TYPES={mic:['Dynamic','Condenser','Ribbon','Tube condenser'],box:['Compressor','EQ','Reverb','Tape echo','Mic preamp + EQ','Pitch shifter / multi-effect','Exciter','Rotating speaker','Channel rack']};
(()=>{const P=window.QUIZ_PICS||[],M=(window.BANKS||[]).find(b=>b.id==='machine');if(!M)return;
  P.forEach(p=>{const c=M.cats.find(x=>x.id===p.cat);if(!c)return;c.qs.push({pic:p,ask:'name'});
    if(p.type&&PIC_TYPES[p.kind])c.qs.push({pic:p,ask:'type'});
    if(p.maker&&new Set(P.filter(x=>x.maker&&x.cat===p.cat).map(x=>x.maker)).size>=4)c.qs.push({pic:p,ask:'maker'});});})();
const allPics=()=>window.QUIZ_PICS||[];
function picQ({pic:p,ask}){const P=allPics(),uniq=a=>[...new Set(a)];let right,pool;
  if(ask==='type'){right=p.type;pool=PIC_TYPES[p.kind];}
  else if(ask==='maker'){right=p.maker;pool=uniq(P.filter(x=>x.maker&&x.cat===p.cat).map(x=>x.maker));}
  else{right=p.name;pool=P.filter(x=>x.kind===p.kind).map(x=>x.name);if(pool.length<4)pool=pool.concat(P.filter(x=>x.cat===p.cat).map(x=>x.name));}
  const wrong=shuffle(uniq(pool).filter(x=>x!==right)).slice(0,3),opts=[right,...wrong];
  const text=ask==='maker'?PIC_Q.maker:(PIC_Q[ask]||PIC_Q.name)[p.kind]||'What is this?';
  return {q:[text,0,opts,'pic-'+p.id],img:p.src,credit:p.credit,fact:p.fact};}
const qpic=r=>r.img?`<figure class="qpic"><img src="${esc(r.img)}" alt=""></figure>`:'';
const qcatOf=(bank,id)=>bankOf(bank).cats.find(c=>c.id===id)||{name:'',sub:''};
const qtag=r=>`<div class="dawtag">${esc(bankOf(r.bank).name)} · ${esc(qcatOf(r.bank,r.cat).name)}</div>`;
function buildQuizDeck(o){
  const b=bankOf(o.bank),pick=o['c_'+b.id]||b.cats.map(c=>c.id),pool=[],seen=new Set(),out=[];
  b.cats.filter(c=>pick.includes(c.id)).forEach(c=>c.qs.forEach(q=>pool.push({cat:c.id,q})));
  const qkey=it=>it.q.pic?'pic:'+it.q.pic.id+':'+it.q.ask:it.q[0];
  for(const it of seenOrder('quiz',pool,qkey)){const cat=it.cat,P=it.q.pic?picQ(it.q):null,q=P?P.q:it.q;
    // same right answer, or the same topic tag (q[3]), counts as the same question
    const keys=[q[2][q[1]].toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,48)];if(q[3])keys.push('#'+q[3]);
    if(keys.some(k=>seen.has(k)))continue;keys.forEach(k=>seen.add(k));
    out.push({bank:b.id,cat,sk:qkey(it),text:q[0],...shuffledOpts(q[2],q[1]),...(P?{img:P.img,credit:P.credit,fact:P.fact}:{})});if(o.n&&out.length>=o.n)break;
  }
  seenMark('quiz',out,r=>r.sk);return shuffle(out);
}
game(roundGame(mcSpec({
  id:'quiz',group:'brain',name:'The Quiz',tag:'Big-screen questions, phone answers. Three banks of production know-how.',
  how:['Pick a bank: The Workbench (how to do it: mixing, recording, mastering, the business), The Machine Room (how the gear works) or The Studio Vault (the stories behind records, producers and pioneers). Then pick its categories.','The question shows alone for a few seconds, then the answers open on the phones.','Fast right answers score more. Streaks add a bonus.'],
  badges:['Scored',`${BANKS.reduce((a,b)=>a+bankN(b),0)} questions`],
  icon:`<svg viewBox="0 0 64 64"><circle cx="20" cy="20" r="14" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/><rect x="36" y="6" width="22" height="22" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><polygon points="20,38 34,60 6,60" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/><polygon points="47,36 60,49 47,62 34,49" fill="var(--green)" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'bank',label:'Question bank',choices:BANKS.map(b=>[b.id,b.name,`${b.sub.split(':')[0]} · ${bankN(b)} qs`]),def:BANKS[0].id},
    ...BANKS.map(b=>({key:'c_'+b.id,type:'multi',label:'Categories',show:v=>bankOf(v.bank)===b,choices:b.cats.map(c=>[c.id,c.name,c.sub+' · '+c.qs.length]),def:b.cats.map(c=>c.id),sub:v=>`${(v['c_'+b.id]||[]).length} of ${b.cats.length}`})),
    {key:'n',label:'Questions',choices:[[10,'10','qs'],[15,'15','qs'],[20,'20','qs'],[30,'30','qs'],[0,'ALL','of them']],def:15},
    AUTO_OPT,
    {key:'secs',label:'Answer time',choices:[[10,'10','seconds'],[20,'20','seconds'],[30,'30','seconds'],[45,'45','seconds'],[0,'OFF','no clock']],def:20,help:'Faster right answers score more: 1000 points at once, sliding to 500 at the buzzer, +100 for every answer in a streak (up to +500).'},
  ],
  check:v=>(v['c_'+bankOf(v.bank).id]||[]).length?'':'Pick at least one category',
  prepMs:r=>r&&r.text.length>130?5000:4000,prepLabel:'READ',prepSub:'the question',
  prepText:()=>({big:'Eyes up',small:'Read the question on the big screen. The answers appear here in a moment.'}),
  secs:o=>o.secs,build:buildQuizDeck,roundInfo:r=>bankOf(r.bank).name+' · '+qcatOf(r.bank,r.cat).name,
  stage:(m,r,ctx)=>{m.innerHTML=r.img?`<div class="mc haspic">${qtag(r)}<div class="qrow">${qpic(r)}<h2 class="qtext">${esc(r.text)}</h2></div>${mcTiles(r,ctx)}</div>`
    :`<div class="mc">${qtag(r)}<h2 class="qtext${r.text.length>130?' long':''}">${esc(r.text)}</h2>${mcTiles(r,ctx)}</div>`;},
  // the reveal: the question shrinks to a line, the right answer takes its place, big
  reveal:(m,r,ctx)=>{const ans=r.opts[r.c];m.innerHTML=`<div class="mc reveal${r.img?' haspic':''}">${qtag(r)}${r.img?`<div class="qrow">${qpic(r)}<div class="qside"><p class="qsmall">${esc(r.text)}</p>`:`<p class="qsmall">${esc(r.text)}</p>`}
    <div class="bigans c${r.c}${ans.length>60?' long':ans.length>32?' mid':''}">${shape(r.c,64,'var(--ink)','var(--paper)')}<span>${esc(ans)}</span></div>${r.img?`${r.fact?`<p class="qfact">${esc(r.fact)}</p>`:''}<p class="qcredit">${esc(r.credit||'')}</p></div></div>`:''}${mcTiles(r,ctx)}</div>`;animateBars(m);},
})));


/* ---------- DAW SHORTCUT SHOWDOWN ---------- */
// every modifier gets its own key: "⇧⌘J" → ⇧ ⌘ J, "Ctrl+Shift+S" → Ctrl Shift S
// F keys: some shortcuts have a second key (Pro Tools ⌥1–4 for the edit modes); on a Mac laptop the F row needs fn
const scAlt=(r,i)=>r.alts&&r.alts[i]?`<small class="kalt">or ${keycaps(r.alts[i])}</small>`:'';
const scFn=r=>r.opts.some(o=>/(^|[+⌘⇧⌥⌃])F\d{1,2}$/.test(o))?`<p class="fnhint"><b>No F keys?</b> On a Mac laptop hold <kbd>fn</kbd> and press the F key. Or switch on “Use F1, F2 … as standard function keys” in System Settings ▸ Keyboard.</p>`:'';
const keycaps=s=>String(s).split('+').flatMap(part=>{const keys=[];let rest=part.trim();while(/^[⌘⇧⌥⌃]/.test(rest)){keys.push(rest[0]);rest=rest.slice(1).trim();}if(rest)keys.push(rest);return keys;}).map(k=>`<kbd>${esc(k)}</kbd>`).join('');
game(roundGame(mcSpec({
  id:'shortcuts',group:'brain',name:'Shortcut Showdown',tag:'Rapid-fire keyboard shortcuts. Mouse-clickers become power users.',
  how:['A DAW task flashes up on the big screen.','Pick the right shortcut from four on your phone — fast.','Ten seconds a question. Muscle memory wins.'],
  badges:['Scored','Fast'],kind:'keys',htmlOpts:true,
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="16" width="26" height="26" rx="3" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><rect x="34" y="16" width="26" height="26" rx="3" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><text x="17" y="35" font-size="16" text-anchor="middle" font-weight="900" fill="var(--ink)">⌘</text><text x="47" y="35" font-size="16" text-anchor="middle" font-weight="900" fill="#fff">J</text><rect x="4" y="48" width="56" height="10" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'daw',label:'DAW',choices:[['live','Live','Ableton'],['logic','Logic','Pro'],['protools','Pro Tools','Avid'],['fl','FL','Studio'],['mix','Mix','all of them']],def:'live'},
    {key:'n',label:'Questions',choices:[[8,'8'],[12,'12'],[20,'20'],[0,'ALL']],def:12},
    {key:'secs',label:'Answer time',choices:[[6,'6','seconds'],[10,'10','seconds'],[15,'15','seconds']],def:10},
  ],
  note:'140 Mac default key commands (FL Studio shows Windows Ctrl). Shortcuts this computer has shown least come first. F-key questions show a second key where there is one, and a tip for laptops without F keys.',
  prepMs:1500,prepLabel:'GO',prepSub:'get ready',speed:.6,
  prepText:()=>({big:'Fingers ready',small:'The task is on the big screen.'}),
  secs:o=>o.secs,
  build:o=>{const sets=o.daw==='mix'?Object.entries(SHORTCUTS):[[o.daw,SHORTCUTS[o.daw]],['any',SHORTCUTS.any]];
    const pool=[];sets.forEach(([k,s])=>s.qs.forEach(q=>pool.push({daw:s.name,q})));
    const key=x=>x.daw+':'+x.q[0],L=seenOrder('shortcuts',pool,key),out=(o.n?L.slice(0,o.n):L);seenMark('shortcuts',out,key);   // least-shown first
    // shuffle the four answers, keeping each one's alternative (e.g. ⌥2 for F2) with it
    return shuffle(out).map(({daw,q})=>{const P=shuffle(q[2].map((o,i)=>({o,a:q[3]?q[3][i]:'',ok:i===q[1]})));return {daw,text:q[0],opts:P.map(x=>x.o),alts:P.map(x=>x.a),c:P.findIndex(x=>x.ok)};});},
  roundInfo:r=>r.daw,
  public:r=>({opts:r.opts.map((o,i)=>keycaps(o)+scAlt(r,i)),html:true,kind:'keys'}),
  stage:(m,r,ctx)=>{m.innerHTML=`<div class="mc"><div class="dawtag">${esc(r.daw)}</div><h2 class="qtext">${esc(r.text)}</h2>${mcTiles(r,ctx,{optHTML:(o,i)=>`<span class="caps">${keycaps(o)}${scAlt(r,i)}</span>`})}${scFn(r)}</div>`;},
  reveal:(m,r,ctx)=>{m.innerHTML=`<div class="mc reveal"><div class="dawtag">${esc(r.daw)}</div><h2 class="qtext">${esc(r.text)}</h2>${mcTiles(r,ctx,{optHTML:(o,i)=>`<span class="caps">${keycaps(o)}${scAlt(r,i)}</span>`})}<div class="bigkeys">${keycaps(r.opts[r.c])}${r.alts&&r.alts[r.c]?`<span class="bkor">or</span>${keycaps(r.alts[r.c])}`:''}</div>${scFn(r)}</div>`;animateBars(m);},
})));

/* ---------- THE TRANSLATION GRID ---------- */
/* pictures of audio ideas, drawn as small SVGs (160×90) */
function VIS(key){
  const W=160,H=90,ink='var(--ink)',red='var(--red)',blue='var(--blue)',hair='var(--hair)';
  const path=(fn,n=120,x0=6,x1=W-6)=>{let d='';for(let i=0;i<=n;i++){const u=i/n,x=x0+(x1-x0)*u,y=fn(u);d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);}return d;};
  const axis=`<line x1="6" y1="${H-8}" x2="${W-6}" y2="${H-8}" stroke="${hair}" stroke-width="2"/>`;
  const mid=H/2,sine=(u,f=2,a=28,ph=0)=>mid-a*Math.sin(2*Math.PI*f*u+ph);
  const P=(d,c=ink,w=3.5,extra='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const eq=fn=>axis+`<line x1="6" y1="40" x2="${W-6}" y2="40" stroke="${hair}" stroke-width="1.5" stroke-dasharray="4 4"/>`+P(path(fn),red);
  const env=(a,d,s,r)=>{const tot=a+d+.8+r,X=t=>8+(W-16)*t/tot,Y=v=>H-10-(H-22)*v;return axis+P(`M${X(0)} ${Y(0)}L${X(a)} ${Y(1)}L${X(a+d)} ${Y(s)}L${X(a+d+.8)} ${Y(s)}L${X(tot)} ${Y(0)}`,red);};
  const tf=fn=>`<rect x="30" y="6" width="${H-14}" height="${H-14}" fill="none" stroke="${hair}" stroke-width="2"/><line x1="30" y1="${H-8}" x2="${30+H-14}" y2="6" stroke="${hair}" stroke-width="1.5" stroke-dasharray="3 4"/>`+P(path(u=>H-8-(H-14)*fn(u),80,30,30+H-14),red);
  const scope=pts=>`<circle cx="${W/2}" cy="${mid}" r="38" fill="none" stroke="${hair}" stroke-width="2"/><line x1="${W/2}" y1="${mid-38}" x2="${W/2}" y2="${mid+38}" stroke="${hair}" stroke-width="1"/><line x1="${W/2-38}" y1="${mid}" x2="${W/2+38}" y2="${mid}" stroke="${hair}" stroke-width="1"/>`+pts;
  // a polar pickup pattern seen from above (front = up); grid only when grid=1
  const polar=(fn,grid=1,rot=0,c=red)=>{const R=38,cx=W/2,cy=mid;let d='';for(let i=0;i<=120;i++){const th=i/120*2*Math.PI,r=R*fn(th),x=cx+r*Math.sin(th+rot),y=cy-r*Math.cos(th+rot);d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);}
    return (grid?`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${hair}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${R/2}" fill="none" stroke="${hair}" stroke-width="1"/><line x1="${cx}" y1="${cy-R-4}" x2="${cx}" y2="${cy+R+4}" stroke="${hair}" stroke-width="1"/><polygon points="${cx},${cy-R-2} ${cx-5},${cy-R+6} ${cx+5},${cy-R+6}" fill="${ink}"/>`:'')+P(d+'Z',c,3);};
  // a console button with its label
  const btn=(t,c)=>`<rect x="${W/2-40}" y="${mid-24}" width="80" height="48" rx="8" fill="#fff" stroke="${ink}" stroke-width="4"/><circle cx="${W/2+30}" cy="${mid-14}" r="4" fill="${c}"/><text x="${W/2}" y="${mid+9}" font-size="${t.length>3?18:26}" font-weight="900" text-anchor="middle" fill="${ink}" font-family="Archivo">${t}</text>`;
  const imp=(xs)=>axis+xs.map(([x,h])=>`<line x1="${x}" y1="${H-8}" x2="${x}" y2="${H-8-h}" stroke="${ink}" stroke-width="3"/>`).join('');
  let b='';
  switch(key){
    case 'lowpass':b=eq(u=>u<.55?40:40+Math.pow((u-.55)/.45,1.6)*38);break;
    case 'highpass':b=eq(u=>u>.45?40:40+Math.pow((.45-u)/.45,1.6)*38);break;
    case 'bell':b=eq(u=>40-26*Math.exp(-Math.pow((u-.5)/.09,2)));break;
    case 'notch':b=eq(u=>40+44*Math.exp(-Math.pow((u-.55)/.025,2)));break;
    case 'phase':b=P(path(u=>sine(u,2,26)),blue,2.5,'opacity=".8"')+P(path(u=>sine(u,2,26,Math.PI)),red,2.5,'opacity=".8"')+P(`M6 ${mid}L${W-6} ${mid}`,ink,4.5);break;
    case 'softclip':b=P(path(u=>mid-30*Math.tanh(2.2*Math.sin(4*Math.PI*u))/Math.tanh(2.2)),red);break;
    case 'hardclip':b=P(path(u=>mid-clamp(44*Math.sin(4*Math.PI*u),-24,24)),red);break;
    case 'duck':b=axis+[.08,.33,.58,.83].map(x=>`<polygon points="${6+x*148},${H-6} ${12+x*148},${H-16} ${18+x*148},${H-6}" fill="${ink}"/>`).join('')+P(path(u=>{const k=(u*4)%1;return 14+40*Math.exp(-k*7)*1;}),red);break;
    case 'comp':b=tf(u=>u<.5?u:.5+(u-.5)*.3);break;
    case 'limit':b=tf(u=>Math.min(u,.62));break;
    case 'gate':b=tf(u=>u<.4?0:u);break;
    case 'comb':b=axis+P(path(u=>12+66*Math.pow(Math.abs(Math.cos(Math.PI*u*7)),.6)),red);break;
    case 'crush':b=P(path(u=>mid-Math.round(Math.sin(4*Math.PI*u)*3)/3*30,160),red);break;
    case 'delay':b=imp([[16,64],[52,44],[88,28],[124,16]]);break;
    case 'reverb':{const xs=[[14,66]];for(let i=0;i<46;i++){const x=22+i*2.8;xs.push([x,Math.max(2,50*Math.exp(-i/14)*(.5+Math.random()*.5))]);}b=imp(xs);break;}
    case 'predelay':{const xs=[[14,66]];for(let i=0;i<30;i++){const x=64+i*2.8;xs.push([x,Math.max(2,46*Math.exp(-i/10)*(.5+Math.random()*.5))]);}b=imp(xs)+`<text x="38" y="20" font-size="11" text-anchor="middle" fill="${ink}" font-family="Space Mono">gap</text><line x1="20" y1="26" x2="60" y2="26" stroke="${ink}" stroke-width="1.5"/>`;break;}
    case 'tremolo':b=P(path(u=>mid-(14+14*Math.sin(2*Math.PI*2*u))*Math.sin(2*Math.PI*16*u),300),red,2.5);break;
    case 'vibrato':b=P(path(u=>mid-26*Math.sin(2*Math.PI*(9*u+.9*Math.sin(2*Math.PI*2*u))),300),red,2.5);break;
    case 'mono':b=scope(P(`M${W/2} ${mid-32}L${W/2} ${mid+32}`,red,5));break;
    case 'wide':{let d='';for(let i=0;i<70;i++){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*32;d+=`<circle cx="${(W/2+Math.cos(a)*r).toFixed(1)}" cy="${(mid+Math.sin(a)*r*.9).toFixed(1)}" r="2.2" fill="${red}"/>`;}b=scope(d);break;}
    case 'swing':b=`<line x1="6" y1="${mid}" x2="${W-6}" y2="${mid}" stroke="${hair}" stroke-width="2"/>`+[0,1,2,3,4,5,6,7].map(i=>{const x=12+i*18.5+(i%2?7:0);return `<line x1="${12+i*18.5}" y1="${mid-16}" x2="${12+i*18.5}" y2="${mid+16}" stroke="${hair}" stroke-width="1.5"/><circle cx="${x}" cy="${mid}" r="6" fill="${i%2?red:ink}"/>`;}).join('');break;
    case 'pluckenv':b=env(.02,.5,0,.3);break;
    case 'padenv':b=env(1.4,.5,.8,1.4);break;
    case 'square':b=P(path(u=>mid-(Math.sin(2*Math.PI*2*u)>=0?26:-26),400),red);break;
    case 'sine':b=P(path(u=>sine(u,2,26)),red);break;
    case 'saw':b=P(path(u=>mid+26-52*((u*3)%1),600),red);break;
    // ---- filters & EQ
    case 'bandpass':b=eq(u=>40+40*Math.min(1,Math.pow(Math.abs(u-.5)/.42,1.5)));break;
    case 'lowshelf':b=eq(u=>40-22/(1+Math.exp((u-.38)*22)));break;
    case 'highshelf':b=eq(u=>40-22/(1+Math.exp(-(u-.62)*22)));break;
    case 'resonance':b=eq(u=>Math.min(84,40-26*Math.exp(-Math.pow((u-.55)/.045,2))+(u>.55?Math.pow((u-.55)/.45,1.3)*48:0)));break;
    case 'tilt':b=eq(u=>58-36*u)+`<circle cx="${W/2}" cy="40" r="4" fill="${ink}"/>`;break;
    case 'deess':b=eq(u=>40+26*Math.exp(-Math.pow((u-.8)/.06,2)))+`<text x="${W*.8}" y="20" font-size="15" font-weight="700" text-anchor="middle" fill="${ink}" font-family="Space Mono">sss</text>`;break;
    case 'multiband':b=axis+[[6,52,24],[54,106,44],[106,154,14]].map(([x0,x1,h],i)=>`<rect x="${x0+3}" y="${H-8-h}" width="${x1-x0-6}" height="${h}" fill="${i===1?red:blue}" opacity="${i===1?1:.55}"/>`).join('')+`<line x1="54" y1="6" x2="54" y2="${H-8}" stroke="${ink}" stroke-width="2" stroke-dasharray="4 3"/><line x1="106" y1="6" x2="106" y2="${H-8}" stroke="${ink}" stroke-width="2" stroke-dasharray="4 3"/>`;break;
    // ---- dynamics
    case 'expander':b=tf(u=>u<.5?Math.max(0,.5-(.5-u)*2.2):u);break;
    case 'transient':b=P(path(u=>{const k=(u*2)%1;return mid-(14*Math.exp(-k*4)+30*Math.exp(-k*28))*Math.sin(2*Math.PI*40*u);},500),red,2);break;
    case 'headroom':b=`<rect x="50" y="36" width="40" height="${H-44}" fill="${blue}"/><rect x="50" y="12" width="40" height="${H-20}" fill="none" stroke="${ink}" stroke-width="3"/><line x1="40" y1="12" x2="100" y2="12" stroke="${red}" stroke-width="4"/><text x="104" y="17" font-size="11" font-weight="700" fill="${ink}" font-family="Space Mono">0 dB</text><line x1="96" y1="14" x2="96" y2="34" stroke="${ink}" stroke-width="2"/><text x="104" y="30" font-size="10" fill="${ink}" font-family="Space Mono">room</text>`;break;
    // ---- modulation
    case 'chorus':b=P(path(u=>sine(u,2,24)),ink,2.2)+P(path(u=>sine(u,2.12,24,.5)),red,2.2)+P(path(u=>sine(u,1.9,24,-.4)),blue,2.2);break;
    case 'flanger':b=axis+P(path(u=>12+66*Math.pow(Math.abs(Math.cos(Math.PI*u*(3+9*u))),.6),300),red)+`<text x="${W-10}" y="16" font-size="14" text-anchor="end" fill="${ink}" font-family="Space Mono">→</text>`;break;
    case 'phaser':b=eq(u=>40+34*[.18,.42,.64,.84].reduce((m,c)=>Math.max(m,Math.exp(-Math.pow((u-c)/.045,2))),0))+`<text x="${W-10}" y="18" font-size="14" text-anchor="end" fill="${ink}" font-family="Space Mono">↔</text>`;break;
    case 'autopan':b=P(path(u=>mid-6-22*(.5+.5*Math.sin(2*Math.PI*2*u))),blue,3)+P(path(u=>mid+6+22*(.5+.5*Math.sin(2*Math.PI*2*u))-44),red,3)+`<text x="8" y="16" font-size="12" font-weight="700" fill="${blue}" font-family="Space Mono">L</text><text x="8" y="${H-6}" font-size="12" font-weight="700" fill="${red}" font-family="Space Mono">R</text>`;break;
    case 'ringmod':b=P(path(u=>mid-30*Math.sin(2*Math.PI*3*u)*Math.sin(2*Math.PI*19*u),500),red,2.2);break;
    case 'pitchup':b=P(path(u=>sine(u,2,24)),hair,3)+P(path(u=>sine(u,4,24)),red,3)+`<text x="${W-8}" y="16" font-size="16" font-weight="700" text-anchor="end" fill="${ink}" font-family="Space Mono">↑</text>`;break;
    // ---- time & space
    case 'slapback':b=imp([[18,64],[46,44]]);break;
    case 'pingpong':b=`<line x1="6" y1="${mid}" x2="${W-6}" y2="${mid}" stroke="${hair}" stroke-width="2"/>`+[[16,36,1],[44,28,-1],[72,22,1],[100,16,-1],[128,10,1]].map(([x,h,d])=>`<line x1="${x}" y1="${mid}" x2="${x}" y2="${mid-d*h}" stroke="${d>0?blue:red}" stroke-width="4"/>`).join('')+`<text x="${W-8}" y="14" font-size="12" font-weight="700" text-anchor="end" fill="${blue}" font-family="Space Mono">L</text><text x="${W-8}" y="${H-4}" font-size="12" font-weight="700" text-anchor="end" fill="${red}" font-family="Space Mono">R</text>`;break;
    case 'gatedverb':{const xs=[[14,66]];for(let i=0;i<26;i++)xs.push([22+i*2.8,Math.max(2,40*(.6+Math.random()*.4))]);b=imp(xs)+`<line x1="96" y1="10" x2="96" y2="${H-8}" stroke="${red}" stroke-width="3" stroke-dasharray="4 3"/>`;break;}
    case 'reverseverb':{const xs=[];for(let i=0;i<40;i++){const x=14+i*2.8;xs.push([x,Math.max(2,46*Math.exp(-(39-i)/12)*(.5+Math.random()*.5))]);}xs.push([132,66]);b=imp(xs);break;}
    case 'early':b=imp([[14,66],[24,34],[31,26],[40,30],[47,20],[58,22],[66,14]]);break;
    case 'haas':b=`<line x1="6" y1="${mid}" x2="${W-6}" y2="${mid}" stroke="${hair}" stroke-width="2"/><line x1="60" y1="${mid}" x2="60" y2="${mid-34}" stroke="${blue}" stroke-width="5"/><line x1="76" y1="${mid}" x2="76" y2="${mid+34}" stroke="${red}" stroke-width="5"/><text x="68" y="${mid-38}" font-size="10" text-anchor="middle" fill="${ink}" font-family="Space Mono">20 ms</text><text x="44" y="16" font-size="12" font-weight="700" fill="${blue}" font-family="Space Mono">L</text><text x="86" y="${H-6}" font-size="12" font-weight="700" fill="${red}" font-family="Space Mono">R</text>`;break;
    // ---- waves & synthesis
    case 'triangle':b=P(path(u=>{const k=(u*2.5)%1;return mid-26*(k<.5?4*k-1:3-4*k);},400),red);break;
    case 'noise':{let d='';for(let i=0;i<=120;i++)d+=(i?'L':'M')+(6+i*1.23).toFixed(1)+' '+(mid-(Math.random()*2-1)*30).toFixed(1);b=P(d,red,1.8);break;}
    case 'pulse':b=P(path(u=>mid-((u*3)%1<.2?26:-26),600),red);break;
    case 'fm':b=P(path(u=>mid-26*Math.sin(2*Math.PI*3*u+3*Math.sin(2*Math.PI*9*u)),500),red,2.4);break;
    case 'fold':b=P(path(u=>{let x=2.4*Math.sin(2*Math.PI*2*u);while(x>1||x<-1)x=x>1?2-x:-2-x;return mid-28*x;},500),red,2.6);break;
    case 'harmonics':b=axis+[1,2,3,4,5,6,7,8].map(n=>`<line x1="${8+n*17}" y1="${H-8}" x2="${8+n*17}" y2="${H-8-66/n}" stroke="${n===1?red:ink}" stroke-width="5"/>`).join('');break;
    case 'arp':b=axis+[0,1,2,3,0,1,2,3].map((k,i)=>`<rect x="${8+i*18}" y="${H-20-k*15}" width="15" height="9" fill="${red}" stroke="${ink}" stroke-width="1.5"/>`).join('');break;
    case 'glide':b=`<rect x="10" y="60" width="50" height="10" fill="${red}" stroke="${ink}" stroke-width="1.5"/><rect x="100" y="22" width="50" height="10" fill="${red}" stroke="${ink}" stroke-width="1.5"/>`+P('M60 65 C80 65 80 27 100 27',ink,2.5,'stroke-dasharray="5 4"');break;
    case 'granular':{let d='';for(let i=0;i<34;i++){const x=10+Math.random()*140,y=mid+(Math.random()*2-1)*24,w=6+Math.random()*10;d+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(w/2).toFixed(1)}" ry="${(2+Math.random()*4).toFixed(1)}" fill="${i%3?red:blue}" opacity=".8"/>`;}b=d;break;}
    // ---- microphones
    case 'omni':b=polar(()=>1);break;
    case 'cardioid':b=polar(th=>.5*(1+Math.cos(th)));break;
    case 'supercard':b=polar(th=>Math.abs(.37+.63*Math.cos(th)));break;
    case 'fig8':b=polar(th=>Math.abs(Math.cos(th)));break;
    case 'shotgun':b=polar(th=>Math.max(.08*Math.abs(Math.cos(th)),Math.pow(Math.max(0,Math.cos(th)),7)));break;
    case 'phantom':b=btn('+48V',red);break;
    case 'pad':b=btn('−10 dB',blue);break;
    case 'polarity':b=btn('Ø',ink);break;
    // ---- stereo
    case 'antiphase':b=scope(P(`M${W/2-32} ${mid}L${W/2+32} ${mid}`,red,5));break;
    case 'panleft':b=`<circle cx="${W/2}" cy="${mid+4}" r="28" fill="#fff" stroke="${ink}" stroke-width="3.5"/><line x1="${W/2}" y1="${mid+4}" x2="${(W/2-19.8).toFixed(1)}" y2="${(mid+4+19.8).toFixed(1)}" stroke="${red}" stroke-width="5" stroke-linecap="round"/><text x="${W/2-44}" y="${H-4}" font-size="13" font-weight="700" fill="${ink}" font-family="Space Mono">L</text><text x="${W/2+36}" y="${H-4}" font-size="13" font-weight="700" fill="${ink}" font-family="Space Mono">R</text>`;break;
    case 'midside':b=polar(th=>.5*(1+Math.cos(th)),1,0)+polar(th=>Math.abs(Math.cos(th)),0,Math.PI/2,blue);break;
    // ---- editing & digital
    case 'fadein':b=axis+P(path(u=>mid-28*Math.min(1,u*1.6)*Math.sin(2*Math.PI*9*u),400),red,2)+P(`M6 ${mid}L${6+148/1.6} ${mid-30}L${W-6} ${mid-30}`,ink,2,'stroke-dasharray="4 3"');break;
    case 'crossfade':b=axis+P(`M10 14L${W-10} ${H-10}`,blue,4)+P(`M10 ${H-10}L${W-10} 14`,red,4);break;
    case 'quantize':b=[0,1,2,3,4,5,6,7,8].map(i=>`<line x1="${8+i*18}" y1="8" x2="${8+i*18}" y2="${H-8}" stroke="${hair}" stroke-width="2"/>`).join('')+[[2,-5],[4,6],[6,-4],[8,3]].map(([g,off],i)=>`<rect x="${8+g*18-6+off}" y="${22+i*14}" width="12" height="9" fill="none" stroke="${ink}" stroke-width="1.5" stroke-dasharray="2 2"/><rect x="${8+g*18-6}" y="${22+i*14}" width="12" height="9" fill="${red}"/>`).join('');break;
    case 'alias':b=P(path(u=>sine(u,9,26),400),hair,2)+P(path(u=>sine(u,1,26,Math.PI),200),red,2.5)+Array.from({length:11},(_,i)=>{const u=i/10,x=6+148*u,y=sine(u,9,26);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${ink}"/>`;}).join('');break;
    case 'samplerate':b=`<line x1="6" y1="${mid}" x2="${W-6}" y2="${mid}" stroke="${hair}" stroke-width="2"/>`+P(path(u=>sine(u,1.5,28)),hair,2)+Array.from({length:17},(_,i)=>{const u=i/16,x=6+148*u,y=sine(u,1.5,28);return `<line x1="${x.toFixed(1)}" y1="${mid}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${ink}" stroke-width="2"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${red}"/>`;}).join('');break;
    case 'dcoffset':b=`<line x1="6" y1="${mid}" x2="${W-6}" y2="${mid}" stroke="${ink}" stroke-width="2"/>`+P(path(u=>sine(u,2,22)-16),red);break;
    case 'reverse':b=axis+P(path(u=>mid-30*Math.pow(u,2.4)*Math.sin(2*Math.PI*14*u),500),red,2)+P(`M${W-6} 12L${W-6} ${H-12}`,ink,3);break;
  }
  return `<svg class="vis" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${b}</svg>`;
}
const TG_TOPICS=[['eq','Filters & EQ','curves and shelves'],['dyn','Dynamics','compressors, gates, clipping'],['mod','Modulation','chorus, flanger, tremolo'],['space','Time & space','delays and reverbs'],
  ['synth','Waves & synthesis','oscillators, envelopes, synths'],['mic','Mics & console','pickup patterns, buttons'],['stereo','Stereo & phase','width, panning, phase'],['digital','Digital & editing','samples, fades, timing']];
game(roundGame({
  id:'translate',group:'brain',name:'The Translation Grid',tag:'Match the idea to what it looks like — or to what it feels like.',
  how:['Four audio ideas go up on the big screen, each with its colour and shape.','Your phone deals four cards, pictures or analogies, one at a time. Tap the shape of the idea each card belongs to.','Every correct pair scores. The reveal draws the lines. Speed adds a little on top.'],
  badges:['Scored','Matching'],speed:.3,okAt:.99,closeAt:.5,
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="6" width="18" height="12" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><rect x="4" y="26" width="18" height="12" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><rect x="4" y="46" width="18" height="12" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><circle cx="52" cy="12" r="7" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><circle cx="52" cy="32" r="7" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/><circle cx="52" cy="52" r="7" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><path d="M22 12 L45 32 M22 32 L45 52 M22 52 L45 12" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'mode',label:'Match to',choices:[['v','Pictures','waveforms, curves'],['a','Analogies','physical metaphors'],['mix','Both','alternate rounds']],def:'mix'},
    {key:'tg',type:'multi',label:'Topics',choices:TG_TOPICS.map(([k,n,sub])=>[k,n,`${sub} · ${TRANSLATE.filter(x=>x.t===k).length}`]),def:TG_TOPICS.map(x=>x[0]),sub:v=>`${(v.tg||[]).length} of ${TG_TOPICS.length}`},
    {key:'n',label:'Rounds',choices:[[4,'4'],[6,'6'],[8,'8'],[12,'12']],def:6},
    {key:'secs',label:'Time per grid',choices:[[30,'30','seconds'],[45,'45','seconds'],[60,'60','seconds']],def:45},
  ],
  prepMs:3000,prepLabel:'LOOK',prepSub:'at the grid',
  prepText:()=>({big:'Study the grid',small:'Match each idea to its partner. The grid opens on your phone in a moment.'}),
  secs:o=>o.secs,
  build:o=>{const pool0=TRANSLATE.filter(x=>(o.tg||[]).includes(x.t)),pool=pool0.length>=4?pool0:TRANSLATE,seen={};
    const fresh=()=>seenOrder('translate',pool,x=>x.c);   // cards this browser has shown least come first
    const out=[];let deck=[];for(let i=0;i<o.n;i++){if(deck.length<4)deck=deck.concat(fresh().filter(x=>!deck.includes(x)));const items=shuffle(deck.splice(0,4));
    const mode=o.mode==='mix'?(i%2?'a':'v'):o.mode;const right=shuffle([0,1,2,3]);out.push({mode,items,right});}seenMark('translate',out.flatMap(r=>r.items),x=>x.c);return out;},
  roundInfo:r=>r.mode==='v'?'pictures':'analogies',
  rightHTML:(r,k)=>{const it=r.items[r.right[k]];return r.mode==='v'?VIS(it.v):`<span class="anal">“${esc(it.a)}”</span>`;},
  // the big screen keeps the ideas; the pictures / analogies go to the phones
  stage(m,r,ctx){
    m.innerHTML=`<div class="tgbig ph-${ctx.phase}"><p class="lab">${ctx.phase==='prep'?'Study the four ideas':'Match each card on your phone to one of these'}</p>
      <div class="tgconcepts">${r.items.map((it,i)=>`<div class="tgc c${i}">${shape(i,72,'var(--ink)','var(--c)')}<b>${esc(it.c)}</b></div>`).join('')}</div>
      <p class="fine">The ${r.mode==='v'?'pictures':'analogies'} are on your phones.</p></div>`;
  },
  reveal(m,r,ctx){
    const n=Math.max(1,ctx.list.length);
    m.innerHTML=`<div class="tgrid open rev"><svg class="tlines" id="tlines"></svg><div class="tcol">${r.items.map((it,i)=>{const k=r.right.indexOf(i),ok=ctx.list.filter(x=>x.a&&x.a[i]===k).length;
      return `<div class="tl" data-i="${i}"><b>${i+1}</b><span>${esc(it.c)}</span><em>${Math.round(100*ok/n)}%</em></div>`;}).join('')}</div>
      <div class="tcol">${r.right.map((_,k)=>`<div class="tr c${k}" data-k="${k}">${shape(k,26)}${this.rightHTML(r,k)}</div>`).join('')}</div></div>`;
    requestAnimationFrame(()=>{const sv=$('#tlines'),box=sv.getBoundingClientRect();sv.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
      sv.innerHTML=r.items.map((_,i)=>{const k=r.right.indexOf(i),a=$(`.tl[data-i="${i}"]`,m).getBoundingClientRect(),b=$(`.tr[data-k="${k}"]`,m).getBoundingClientRect();
        return `<line x1="${a.right-box.left}" y1="${a.top+a.height/2-box.top}" x2="${b.left-box.left}" y2="${b.top+b.height/2-box.top}" stroke="var(${COLS[k]})" stroke-width="6" stroke-linecap="round" class="draw"/>`;}).join('');});
  },
  public(r){return {mode:r.mode,left:r.items.map(it=>it.c),right:r.right.map((_,k)=>r.mode==='v'?VIS(r.items[r.right[k]].v):r.items[r.right[k]].a)};},
  valid:(r,a)=>Array.isArray(a)&&a.length===4,
  score:(r,a)=>{let ok=0;a.forEach((k,i)=>{if(r.right[k]===i)ok++;});return {acc:ok/4,note:`${ok} of 4 pairs right`};},
  publicReveal:r=>({pairs:r.items.map((_,i)=>r.right.indexOf(i))}),
  revealSide:(r,ctx)=>{const n=ctx.list.length,perfect=ctx.list.filter(x=>x.res&&x.res.acc===1).length;return `<div class="stat"><b>${perfect}</b><span>perfect grids of ${n}</span></div>`;},
  // phone: one card at a time, big; tap the shape of the idea it belongs to. pair[idea] = card
  input(root,pub,submit){
    const n=pub.right.length,pair=Array(n).fill(null);let k=0;
    const owner=kk=>pair.indexOf(kk),nextOpen=()=>{for(let j=1;j<=n;j++){const kk=(k+j)%n;if(owner(kk)<0)return kk;}return k;};
    const draw=()=>{const done=pair.every(x=>x!=null);
      root.innerHTML=`<div class="tgphone"><div class="tgstrip">${pub.right.map((_,kk)=>{const i=owner(kk);return `<button class="tgdot ${kk===k?'cur':''} ${i>=0?'set c'+i:''}" data-k="${kk}" aria-label="Card ${kk+1}">${i>=0?shape(i,20,'var(--ink)','var(--c)'):kk+1}</button>`;}).join('')}</div>
        <div class="tgcard ${pub.mode==='v'?'vis':'anal'}"><span class="lab">Card ${k+1} of ${n}</span>${pub.mode==='v'?pub.right[k]:`<b>“${esc(pub.right[k])}”</b>`}</div>
        <p class="lab tgq">Which idea on the big screen?</p>
        <div class="tgpick">${pair.map((by,i)=>`<button class="tgp c${i} ${by===k?'on':''} ${by!=null&&by!==k?'used':''}" data-i="${i}" aria-label="Idea ${i+1}">${shape(i,44,'var(--ink)','var(--c)')}</button>`).join('')}</div>
        <button class="big go plock" ${done?'':'disabled'}>${done?'Lock in':`${pair.filter(x=>x!=null).length} of ${n} matched`}</button></div>`;
      $$('.tgdot',root).forEach(b=>b.onclick=()=>{k=+b.dataset.k;draw();});
      $$('.tgp',root).forEach(b=>b.onclick=()=>{const i=+b.dataset.i,prev=owner(k);if(prev>=0)pair[prev]=null;pair[i]=k;papi.vibe(15);k=nextOpen();draw();});
      $('.plock',root).onclick=()=>{if(pair.every(x=>x!=null))submit(pair.slice());};};
    draw();
  },
  locked:(box,mine)=>{box.innerHTML=`<p class="lab">Your matches</p><div class="pairs">${mine.map((k,i)=>({k,i})).sort((a,b)=>a.k-b.k).map(({k,i})=>`<span><b>Card ${k+1}</b>→${shape(i,22)}</span>`).join('')}</div>`;},
  pReveal:(box,st)=>{box.innerHTML=`<div class="pairs">${st.rv.pairs.map((k,i)=>({k,i})).sort((a,b)=>a.k-b.k).map(({k,i})=>`<span class="${st.mine&&st.mine[i]===k?'ok':'bad'}"><b>Card ${k+1}</b>→${shape(i,22)}</span>`).join('')}</div>`;},
}));
