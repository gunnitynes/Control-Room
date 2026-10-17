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
const catOf=id=>CATS.find(c=>c.id===id)||{name:'',sub:''};
function buildQuizDeck(o){
  const pool=[],seen=new Set();CATS.filter(c=>o.cats.includes(c.id)).forEach(c=>c.qs.forEach(q=>pool.push({cat:c.id,q})));
  const out=[];
  for(const {cat,q} of shuffle(pool)){
    // same right answer, or the same topic tag (q[3]), counts as the same question
    const keys=[q[2][q[1]].toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,48)];if(q[3])keys.push('#'+q[3]);
    if(keys.some(k=>seen.has(k)))continue;keys.forEach(k=>seen.add(k));
    out.push({cat,text:q[0],...shuffledOpts(q[2],q[1])});if(o.n&&out.length>=o.n)break;
  }
  return out;
}
game(roundGame(mcSpec({
  id:'quiz',group:'brain',name:'The Quiz',tag:'The question on the big screen, the four answers on every phone.',
  how:['The question shows alone for four seconds, then the answers open on the phones.','The answer is revealed when everyone has voted — and you see how the room split.','Fast right answers score more. Streaks add a bonus.'],
  badges:['Scored','300 questions'],
  icon:`<svg viewBox="0 0 64 64"><circle cx="20" cy="20" r="14" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/><rect x="36" y="6" width="22" height="22" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><polygon points="20,38 34,60 6,60" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/><polygon points="47,36 60,49 47,62 34,49" fill="var(--green)" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'cats',type:'multi',label:'Categories',choices:CATS.map(c=>[c.id,c.name,c.sub+' · '+c.qs.length]),def:CATS.map(c=>c.id),sub:v=>`${v.cats.length} of ${CATS.length}`},
    {key:'n',label:'Questions',choices:[[10,'10','qs'],[15,'15','qs'],[20,'20','qs'],[30,'30','qs'],[0,'ALL','of them']],def:15},
    {key:'secs',label:'Answer time',choices:[[10,'10','seconds'],[20,'20','seconds'],[30,'30','seconds'],[45,'45','seconds'],[0,'OFF','no clock']],def:20,help:'Faster right answers score more: 1000 points at once, sliding to 500 at the buzzer, +100 for every answer in a streak (up to +500).'},
  ],
  check:v=>v.cats.length?'':'Pick at least one category',
  prepMs:4000,prepLabel:'READ',prepSub:'the question',
  prepText:()=>({big:'Eyes up',small:'Read the question on the big screen. The answers appear here in a moment.'}),
  secs:o=>o.secs,build:buildQuizDeck,roundInfo:r=>catOf(r.cat).name,
  stage:(m,r,ctx)=>{m.innerHTML=`<div class="mc"><h2 class="qtext${r.text.length>130?' long':''}">${esc(r.text)}</h2>${mcTiles(r,ctx)}</div>`;},
  reveal:(m,r,ctx)=>{m.innerHTML=`<div class="mc reveal"><h2 class="qtext${r.text.length>130?' long':''}">${esc(r.text)}</h2>${mcTiles(r,ctx)}</div>`;animateBars(m);},
})));

/* ---------- THE STUDIO VAULT · audio history & production trivia ---------- */
function buildVaultDeck(o){
  const pool=o.vols.flatMap(v=>(VAULT[v]||[]).map(q=>({vol:v,q}))),out=[],seen=new Set();
  for(const {vol,q} of shuffle(pool)){const keys=q[3]?['#'+q[3]]:[];if(keys.some(k=>seen.has(k)))continue;keys.forEach(k=>seen.add(k));
    out.push({vol,text:q[0],...shuffledOpts(q[2],q[1])});if(o.n&&out.length>=o.n)break;}
  return out;
}
game(roundGame(mcSpec({
  id:'vault',group:'brain',name:'The Studio Vault',tag:'Audio history and production trivia: the stories behind famous records, rooms and machines.',
  how:['A story from studio history goes up on the big screen.','The four possible answers open on every phone — tap one.','The reveal shows how the room split. Fast right answers score more.'],
  badges:['Scored',`${Object.values(VAULT).reduce((a,v)=>a+v.length,0)} questions`],
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="6" width="56" height="52" rx="4" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><circle cx="32" cy="32" r="15" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><circle cx="32" cy="32" r="4" fill="var(--red)" stroke="var(--ink)" stroke-width="2"/><path d="M32 17v6M32 41v6M17 32h6M41 32h6" stroke="var(--ink)" stroke-width="3"/><rect x="50" y="20" width="6" height="24" fill="var(--yel)" stroke="var(--ink)" stroke-width="2"/></svg>`,
  options:[
    {key:'vols',type:'multi',label:'Volumes',choices:Object.keys(VAULT).map(v=>[v,'Volume '+v,VAULT[v].length+' questions']),def:Object.keys(VAULT),sub:v=>`${v.vols.length} of ${Object.keys(VAULT).length}`},
    {key:'n',label:'Questions',choices:[[10,'10','qs'],[15,'15','qs'],[20,'20','qs'],[0,'ALL','of them']],def:15},
    {key:'secs',label:'Answer time',choices:[[15,'15','seconds'],[20,'20','seconds'],[30,'30','seconds'],[0,'OFF','no clock']],def:20},
  ],
  check:v=>v.vols.length?'':'Pick at least one volume',
  prepMs:5000,prepLabel:'READ',prepSub:'the story',
  prepText:()=>({big:'Eyes up',small:'Read the question on the big screen. The answers appear here in a moment.'}),
  secs:o=>o.secs,build:buildVaultDeck,roundInfo:r=>'Volume '+r.vol,
  stage:(m,r,ctx)=>{m.innerHTML=`<div class="mc"><div class="dawtag">The Studio Vault · Vol. ${esc(r.vol)}</div><h2 class="qtext${r.text.length>130?' long':''}">${esc(r.text)}</h2>${mcTiles(r,ctx)}</div>`;},
  reveal:(m,r,ctx)=>{m.innerHTML=`<div class="mc reveal"><div class="dawtag">The Studio Vault · Vol. ${esc(r.vol)}</div><h2 class="qtext${r.text.length>130?' long':''}">${esc(r.text)}</h2>${mcTiles(r,ctx)}</div>`;animateBars(m);},
})));

/* ---------- DAW SHORTCUT SHOWDOWN ---------- */
const keycaps=s=>s.split(/(?=[⌘⇧⌥⌃])|\+/).filter(Boolean).map(k=>`<kbd>${esc(k)}</kbd>`).join('');
game(roundGame(mcSpec({
  id:'shortcuts',group:'brain',name:'Shortcut Showdown',tag:'Rapid-fire keyboard shortcuts. Mouse-clickers become power users.',
  how:['A DAW task flashes up on the big screen.','Pick the right shortcut from four on your phone — fast.','Ten seconds a question. Muscle memory wins.'],
  badges:['Scored','Fast'],kind:'keys',htmlOpts:true,
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="16" width="26" height="26" rx="3" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><rect x="34" y="16" width="26" height="26" rx="3" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><text x="17" y="35" font-size="16" text-anchor="middle" font-weight="900" fill="var(--ink)">⌘</text><text x="47" y="35" font-size="16" text-anchor="middle" font-weight="900" fill="#fff">J</text><rect x="4" y="48" width="56" height="10" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'daw',label:'DAW',choices:[['live','Live','Ableton'],['logic','Logic','Pro'],['protools','Pro Tools','Avid'],['fl','FL','Studio'],['mix','Mix','all of them']],def:'live'},
    {key:'n',label:'Questions',choices:[[8,'8'],[12,'12'],[0,'ALL']],def:12},
    {key:'secs',label:'Answer time',choices:[[6,'6','seconds'],[10,'10','seconds'],[15,'15','seconds']],def:10},
  ],
  note:'Mac default key commands (FL Studio shows Windows Ctrl). Edit or add shortcuts in data/content.js.',
  prepMs:1500,prepLabel:'GO',prepSub:'get ready',speed:.6,
  prepText:()=>({big:'Fingers ready',small:'The task is on the big screen.'}),
  secs:o=>o.secs,
  build:o=>{const sets=o.daw==='mix'?Object.entries(SHORTCUTS):[[o.daw,SHORTCUTS[o.daw]],['any',SHORTCUTS.any]];
    let pool=[];sets.forEach(([k,s])=>s.qs.forEach(q=>pool.push({daw:s.name,text:q[0],...shuffledOpts(q[2],q[1])})));
    pool=shuffle(pool);return o.n?pool.slice(0,o.n):pool;},
  roundInfo:r=>r.daw,
  public:r=>({opts:r.opts.map(keycaps),html:true,kind:'keys'}),
  stage:(m,r,ctx)=>{m.innerHTML=`<div class="mc"><div class="dawtag">${esc(r.daw)}</div><h2 class="qtext">${esc(r.text)}</h2>${mcTiles(r,ctx,{optHTML:o=>`<span class="caps">${keycaps(o)}</span>`})}</div>`;},
  reveal:(m,r,ctx)=>{m.innerHTML=`<div class="mc reveal"><div class="dawtag">${esc(r.daw)}</div><h2 class="qtext">${esc(r.text)}</h2>${mcTiles(r,ctx,{optHTML:o=>`<span class="caps">${keycaps(o)}</span>`})}<div class="bigkeys">${keycaps(r.opts[r.c])}</div></div>`;animateBars(m);},
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
  }
  return `<svg class="vis" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${b}</svg>`;
}
game(roundGame({
  id:'translate',group:'brain',name:'The Translation Grid',tag:'Match the idea to what it looks like — or to what it feels like.',
  how:['Four audio ideas on the left, four pictures or analogies on the right.','On your phone, tap an idea, then tap its partner. Lines connect them.','Every correct pair scores. Speed adds a little on top.'],
  badges:['Scored','Matching'],speed:.3,okAt:.99,closeAt:.5,
  icon:`<svg viewBox="0 0 64 64"><rect x="4" y="6" width="18" height="12" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><rect x="4" y="26" width="18" height="12" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><rect x="4" y="46" width="18" height="12" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><circle cx="52" cy="12" r="7" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><circle cx="52" cy="32" r="7" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/><circle cx="52" cy="52" r="7" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><path d="M22 12 L45 32 M22 32 L45 52 M22 52 L45 12" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'mode',label:'Match to',choices:[['v','Pictures','waveforms, curves'],['a','Analogies','physical metaphors'],['mix','Both','alternate rounds']],def:'mix'},
    {key:'n',label:'Rounds',choices:[[4,'4'],[6,'6'],[8,'8']],def:6},
    {key:'secs',label:'Time per grid',choices:[[30,'30','seconds'],[45,'45','seconds'],[60,'60','seconds']],def:45},
  ],
  prepMs:3000,prepLabel:'LOOK',prepSub:'at the grid',
  prepText:()=>({big:'Study the grid',small:'Match each idea to its partner. The grid opens on your phone in a moment.'}),
  secs:o=>o.secs,
  build:o=>{const out=[];let deck=[];for(let i=0;i<o.n;i++){if(deck.length<4)deck=shuffle(TRANSLATE);const items=deck.splice(0,4);
    const mode=o.mode==='mix'?(i%2?'a':'v'):o.mode;const right=shuffle([0,1,2,3]);out.push({mode,items,right});}return out;},
  roundInfo:r=>r.mode==='v'?'pictures':'analogies',
  rightHTML:(r,k)=>{const it=r.items[r.right[k]];return r.mode==='v'?VIS(it.v):`<span class="anal">“${esc(it.a)}”</span>`;},
  stage(m,r,ctx){
    m.innerHTML=`<div class="tgrid ${ctx.phase==='prep'?'':'open'}"><div class="tcol">${r.items.map((it,i)=>`<div class="tl"><b>${i+1}</b><span>${esc(it.c)}</span></div>`).join('')}</div>
      <div class="tcol">${r.right.map((_,k)=>`<div class="tr c${k}">${shape(k,26)}${this.rightHTML(r,k)}</div>`).join('')}</div></div>`;
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
  input(root,pub,submit){
    const pair=[null,null,null,null];let sel=null;
    root.innerHTML=`<div class="pmatch"><svg class="plines"></svg><div class="pcol">${pub.left.map((c,i)=>`<button class="pl" data-i="${i}"><b>${i+1}</b><span>${esc(c)}</span></button>`).join('')}</div>
      <div class="pcol">${pub.right.map((x,k)=>`<button class="pr c${k}${pub.mode==='a'?' anal':''}" data-k="${k}">${pub.mode==='v'?x:`<span>${esc(x)}</span>`}</button>`).join('')}</div></div>
      <button class="big go pdone" disabled>Lock in</button>`;
    const draw=()=>{const sv=$('.plines',root),box=$('.pmatch',root).getBoundingClientRect();sv.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
      sv.innerHTML=pair.map((k,i)=>{if(k==null)return '';const a=$(`.pl[data-i="${i}"]`,root).getBoundingClientRect(),b=$(`.pr[data-k="${k}"]`,root).getBoundingClientRect();
        return `<line x1="${a.right-box.left}" y1="${a.top+a.height/2-box.top}" x2="${b.left-box.left}" y2="${b.top+b.height/2-box.top}" stroke="var(${COLS[k]})" stroke-width="5" stroke-linecap="round"/>`;}).join('');
      $$('.pl',root).forEach(b=>{const i=+b.dataset.i;b.classList.toggle('sel',sel===i);b.style.setProperty('--pc',pair[i]!=null?`var(${COLS[pair[i]]})`:'var(--paper)');b.classList.toggle('done',pair[i]!=null);});
      $$('.pr',root).forEach(b=>b.classList.toggle('used',pair.includes(+b.dataset.k)));
      $('.pdone',root).disabled=pair.some(x=>x==null);};
    $$('.pl',root).forEach(b=>b.onclick=()=>{sel=+b.dataset.i;draw();});
    $$('.pr',root).forEach(b=>b.onclick=()=>{const k=+b.dataset.k;if(sel==null){sel=pair.findIndex(x=>x==null);if(sel<0)return;}
      const j=pair.indexOf(k);if(j>=0)pair[j]=null;pair[sel]=k;sel=pair.findIndex(x=>x==null);if(sel<0)sel=null;papi.vibe(15);draw();});
    $('.pdone',root).onclick=()=>submit(pair.slice());
    sel=0;requestAnimationFrame(draw);
  },
  locked:(box,mine)=>{box.innerHTML=`<p class="lab">Your pairs</p><div class="pairs">${mine.map((k,i)=>`<span><b>${i+1}</b>→${shape(k,22)}</span>`).join('')}</div>`;},
  pReveal:(box,st)=>{box.innerHTML=`<div class="pairs">${st.rv.pairs.map((k,i)=>`<span class="${st.mine&&st.mine[i]===k?'ok':'bad'}"><b>${i+1}</b>→${shape(k,22)}</span>`).join('')}</div>`;},
}));
