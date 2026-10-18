/* ====================================================================
   CONTROL ROOM — core
   One page, two roles. The teacher's computer is the HOST: it opens one
   room for the whole lesson, shows the main menu and runs whichever game
   is picked. Phones are PLAYERS (?room=CODE): they join once and follow
   the host from game to game. PeerJS only introduces the browsers; after
   that every message goes device to device.

   A game is an object registered with game({...}). Most scored games are
   built with roundGame(spec), which owns the round loop
   (prep → open → reveal → leaderboard → … → podium) so a game only has to
   describe its prompt, its phone input and how an answer scores.
   ==================================================================== */
'use strict';

/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,k)=>a+(b-a)*k;
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const pad2=n=>String(n).padStart(2,'0');
const store={get(k,d){try{const v=localStorage.getItem('controlroom.'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('controlroom.'+k,JSON.stringify(v));}catch(e){}},del(k){try{localStorage.removeItem('controlroom.'+k);}catch(e){}}};
const QS=new URLSearchParams(location.search);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const COLS=['--red','--blue','--yel','--green'];
const LET='ABCD';
function ordinal(n){const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
const sufx=n=>ordinal(n).replace(/\d+/,'');
const fmtHz=f=>f>=1000?(f/1000).toFixed(f>=10000?0:1).replace(/\.0$/,'')+' kHz':Math.round(f)+' Hz';
const fmtS=s=>s<10?s.toFixed(1)+' s':Math.round(s)+' s';
const fmtClock=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+pad2(s%60);};
const now=()=>performance.now();
let toastT=0;function toast(t){let e=$('.toast');if(!e){e=el('div','toast');document.body.appendChild(e);}e.textContent=t;e.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,2800);}
function loadScript(src){return new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=src;sc.async=true;sc.onload=res;sc.onerror=()=>rej(new Error('Could not load '+src));document.head.appendChild(sc);});}
async function needPeer(){if(!window.Peer)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js');}
async function needQR(){if(!window.QRCode)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js');}
const CODE_ABC='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode=()=>[...Array(4)].map(()=>CODE_ABC[Math.floor(Math.random()*CODE_ABC.length)]).join('');
const peerId=c=>'controlroom-v1-'+c.toLowerCase();
const joinURL=code=>location.origin+location.pathname+'?room='+code;
function drawQR(box,code,size){if(!box)return;needQR().then(()=>{box.innerHTML='';new QRCode(box,{text:joinURL(code),width:size,height:size,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}).catch(()=>{box.textContent=code;});}
function showBigQR(code){
  let ov=$('#qrbig');if(!ov){ov=el('div','qrbig');ov.id='qrbig';ov.setAttribute('role','dialog');document.body.appendChild(ov);ov.onclick=()=>ov.remove();}
  ov.innerHTML=`<div><figure id="qrbigImg"></figure><b>${esc(code)}</b><small>Scan to join · click anywhere to close</small></div>`;drawQR($('#qrbigImg'),code,720);
}
/* the four answer shapes: A circle · B square · C triangle · D diamond */
function shape(i,s=34,stroke='var(--ink)',fill='var(--paper)'){
  const sw=Math.max(2,s/12),h=s/2,r=h-sw;
  const body=[`<circle cx="${h}" cy="${h}" r="${r}"/>`,`<rect x="${sw}" y="${sw}" width="${s-2*sw}" height="${s-2*sw}"/>`,
    `<polygon points="${h},${sw*1.2} ${s-sw},${s-sw} ${sw},${s-sw}"/>`,`<polygon points="${h},${sw} ${s-sw},${h} ${h},${s-sw} ${sw},${h}"/>`][i%4];
  return `<svg class="shape" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true"><g fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round">${body}</g></svg>`;
}
/* the wordmark: CONTROL in ink over ROOM in red */
function logo(){return `<div class="logo"><span class="lg"><b>Control</b><b>Room</b></span></div>`;}
if(store.get('theme','paper')==='night')document.documentElement.dataset.theme='night';
function toggleTheme(){const n=document.documentElement.dataset.theme==='night'?'paper':'night';if(n==='night')document.documentElement.dataset.theme='night';else delete document.documentElement.dataset.theme;store.set('theme',n);}
const ROLE=QS.has('room')||(matchMedia('(max-width:700px)').matches&&!QS.has('host'))?'player':'host';

/* ---------- registry ---------- */
const GROUPS=[
  {id:'brain',name:'Know your stuff',short:'Know',sub:'Fast answers on your phone, big points',col:'--blue'},
  {id:'ears',name:'Train your ears',short:'Ears',sub:'The room listens, the phones answer',col:'--red'},
  {id:'make',name:'Make something',sub:'Creative sprints, generators and party games',short:'Make',col:'--yel'},
];
const GAMES=[];
function game(g){g.col=g.col||(GROUPS.find(x=>x.id===g.group)||{}).col;GAMES.push(g);return g;}
const gameById=id=>GAMES.find(g=>g.id===id);
const ordered=()=>GROUPS.flatMap(gr=>GAMES.filter(g=>g.group===gr.id));
const numOf=g=>pad2(ordered().indexOf(g)+1);

/* =====================================================================
   HOST
   ===================================================================== */
const G={lobby:new Set(),splash:!QS.has('nosplash'),code:'',peer:null,status:'',players:new Map(),banned:new Set(),view:'menu',game:null,gs:null,timers:[]};
function later(fn,ms){const t=setTimeout(fn,ms);G.timers.push(t);return t;}
function clearLater(){G.timers.forEach(clearTimeout);G.timers=[];}
const players=()=>[...G.players.values()];
const online=()=>players().filter(p=>p.conn&&p.conn.open);
const blankP=()=>({gp:0,total:0,streak:0,best:0,right:0,last:null});
function rankBy(key){const list=players().sort((a,b)=>(b[key]||0)-(a[key]||0)||a.name.localeCompare(b.name)),map=new Map();let last=null,rk=0;list.forEach((p,i)=>{if(p[key]!==last){rk=i+1;last=p[key];}map.set(p.id,rk);});return {list,map};}
function award(p,pts){pts=Math.round(pts);p.gp=(p.gp||0)+pts;p.total=(p.total||0)+pts;return pts;}
function saveRoom(){if(!G.code)return;store.set('room',{t:Date.now(),code:G.code,banned:[...G.banned],players:players().map(p=>({id:p.id,name:p.name,total:p.total,sh:p.sh,log:p.log||[]}))});}
/* the session notebook: every student's own record of the lesson — briefs and styles they
   spun, picks they kept, rules they wrote, cards they were dealt, and milestones (streaks,
   finishing places). Kept on the host, pushed to that student's phone. */
function logAdd(p,e){if(!p)return;p.log=p.log||[];p.log.push({...e,at:Date.now()});if(p.log.length>300)p.log.shift();sendLog(p);saveRoom();}
function sendLog(p){if(p.conn&&p.conn.open)try{p.conn.send({t:'log',log:p.log||[]});}catch(e){}}

async function openRoom(code){
  G.status='Opening the room…';render();
  try{await needPeer();}catch(e){G.status='Could not reach the room service. Check the internet connection.';render();return false;}
  return new Promise(res=>{
    const tryOpen=left=>{
      G.code=code||newCode();const peer=new Peer(peerId(G.code),{debug:0});G.peer=peer;
      peer.on('open',()=>{G.status='';saveRoom();if(!G.splash)render();res(true);});
      peer.on('error',e=>{
        if(e.type==='unavailable-id'&&left>0){peer.destroy();if(code)setTimeout(()=>tryOpen(left-1),1500);else tryOpen(left-1);return;}
        if(e.type==='peer-unavailable')return;
        G.status='Room problem: '+(e.type||e.message);render();res(false);});
      peer.on('disconnected',()=>{try{peer.reconnect();}catch(e){}});
      peer.on('connection',conn=>{
        conn.on('data',m=>{try{hostData(conn,m);}catch(e){console.error(e);}});
        conn.on('close',()=>{G.lobby.delete(conn);const p=players().find(x=>x.conn===conn);if(p){p.conn=null;lobbyNames();liveUpdate();if(G.view!=='play')render();}});
        conn.on('error',()=>{});
      });
    };
    tryOpen(code?8:4);
  });
}
async function newRoom(){
  if(!confirm('Start a new room? Everyone has to scan the new code, and all points are reset.'))return;
  exitGame(true);G.players.forEach(p=>{try{p.conn&&p.conn.send({t:'kick',why:'closed'});}catch(e){}});
  G.players.clear();G.banned.clear();store.del('room');try{G.peer&&G.peer.destroy();}catch(e){}G.peer=null;G.code='';render();await openRoom();render();
}
/* ---------- class list + attendance ----------
   The teacher picks a class; its names come from the attendance Google Sheet (data/content.js →
   ATTENDANCE.url, the sheet's Apps Script web app). Phones show those names, and picking one checks
   the student in on the sheet in the background, once per class per day. No class = typed names. */
const ATT={classes:null,cls:store.get('cls',''),names:[],err:''};
const attDay=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
const ATT_DONE=Object.fromEntries(Object.entries(store.get('attDone',{})).filter(([k])=>k.startsWith(attDay()+'|')));
function attCall(fn,args){const url=(window.ATTENDANCE||{}).url;if(!url)return Promise.reject(new Error('No attendance sheet set'));
  return fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn,...args})})
    .catch(()=>{throw new Error('Can’t reach the attendance sheet (offline, or the script’s new version isn’t deployed yet)');})
    .then(r=>r.text()).then(t=>{let j;try{j=JSON.parse(t);}catch(e){throw new Error('The attendance sheet did not answer (is the new version deployed?)');}if(!j.ok)throw new Error(j.error||'Sheet error');return j;});}
function attLoad(){if(!(window.ATTENDANCE||{}).url)return;
  attCall('classes').then(j=>{ATT.classes=j.classes||[];ATT.err='';if(ATT.cls&&!ATT.classes.includes(ATT.cls))ATT.cls='';return attRoster();})
    .catch(e=>{ATT.classes=null;ATT.err=e.message;}).finally(()=>{if(G.view==='menu'&&!G.splash)render();});}
function attRoster(){const c=ATT.cls;if(!c){ATT.names=[];lobbyNames();return Promise.resolve();}
  return attCall('roster',{className:c}).then(j=>{if(ATT.cls!==c)return;ATT.names=(j.names||[]).map(n=>String(n).trim()).filter(Boolean);ATT.err='';lobbyNames();if(G.view==='menu')render();})
    .catch(e=>{ATT.err=e.message;if(G.view==='menu')render();});}
function attSetClass(c){ATT.cls=c;store.set('cls',c);ATT.names=[];lobbyNames();render();attRoster();}
const attMatch=n=>{const k=String(n||'').trim().toLowerCase();return ATT.names.find(x=>x.toLowerCase()===k)||null;};
const attCount=()=>Object.keys(ATT_DONE).filter(k=>k.startsWith(attDay()+'|'+ATT.cls+'|')).length;
function attCheckIn(p){if(!ATT.cls||!attMatch(p.name))return;const k=attDay()+'|'+ATT.cls+'|'+p.name;if(ATT_DONE[k]){p.att='in';return;}
  if(p.att==='…')return;p.att='…';let tries=0;
  const go=()=>attCall('checkIn',{className:ATT.cls,name:p.name}).then(j=>{ATT_DONE[k]=j.result;store.set('attDone',ATT_DONE);p.att='in';if(G.view==='menu')render();})
    .catch(e=>{if(++tries<4)setTimeout(go,3000*tries);else{p.att='fail';console.warn('attendance',p.name,e.message);if(G.view==='menu')render();}});
  go();}
// phones that are connected but haven't picked a name yet
function namesMsg(){return {t:'names',cls:ATT.cls,names:ATT.cls?ATT.names.map(n=>({n,here:players().some(p=>p.name===n&&p.conn&&p.conn.open)})):[]};}
function lobbyNames(){G.lobby.forEach(c=>{if(c.open)try{c.send(namesMsg());}catch(e){}});}
function resetPoints(){if(!confirm('Reset everyone’s total points to zero?'))return;players().forEach(p=>{p.total=0;p.gp=0;});saveRoom();render();syncAll();}
function uniqueName(name,id,max=30){
  name=String(name||'').replace(/\s+/g,' ').trim().slice(0,max)||'Player';let n=name,k=2;
  const taken=s=>players().some(p=>p.id!==id&&p.name.toLowerCase()===s.toLowerCase());
  while(taken(n))n=name+' '+(k++);return n;
}
function hostData(conn,m){
  if(!m||typeof m!=='object')return;
  if(m.t==='ping'){try{conn.send({t:'pong'});}catch(e){}return;}
  if(m.t==='who'){G.lobby.add(conn);try{conn.send(namesMsg());}catch(e){}return;}
  if(m.t==='hi'){
    const id=String(m.id||'').slice(0,40);if(!id)return;
    if(G.banned.has(id)){try{conn.send({t:'kick'});}catch(e){}setTimeout(()=>conn.close(),300);return;}
    G.lobby.delete(conn);
    let p=G.players.get(id);const listed=!p&&attMatch(m.name);
    if(listed){ // a name from the class list: one phone each, and a new device takes over an offline seat (points kept)
      const q=players().find(x=>x.name===listed);
      if(q&&q.conn&&q.conn.open){try{conn.send({t:'taken',name:listed});conn.send(namesMsg());}catch(e){}G.lobby.add(conn);return;}
      if(q){G.players.delete(q.id);q.id=id;G.players.set(id,q);p=q;}
    }
    if(p){if(p.conn&&p.conn!==conn)try{p.conn.close();}catch(e){}p.conn=conn;}
    else{p={id,name:listed||uniqueName(m.name,id),sh:G.players.size%4,conn,...blankP()};G.players.set(id,p);if(G.view!=='play')sfx.join();}
    attCheckIn(p);lobbyNames();
    sync(p);sendLog(p);saveRoom();
    if(G.view==='play'){G.game.onJoin&&G.game.onJoin(p);liveUpdate();}else render();
    return;
  }
  if(m.t==='act'){const p=players().find(x=>x.conn===conn);if(!p||G.view!=='play'||!G.game||m.g!==G.game.id)return;G.game.act(p,m.d||{});}
}
function stateFor(p){
  const rk=rankBy('total').map,g=G.game&&G.view!=='menu'?G.game:null;
  const m={t:'st',name:p.name,total:p.total||0,rank:rk.get(p.id)||0,of:G.players.size,view:G.view==='play'?'play':'menu',g:g?g.id:null,gname:g?g.name:''};
  if(G.view==='play'){try{m.s=G.game.pstate(p);}catch(e){console.error(e);m.s={k:'err'};}}
  return m;
}
function sync(p){if(p.conn&&p.conn.open)try{p.conn.send(stateFor(p));}catch(e){}}
function syncAll(){G.players.forEach(sync);}
function kick(id){const p=G.players.get(id);if(!p)return;G.banned.add(id);if(p.conn)try{p.conn.send({t:'kick'});}catch(e){}G.players.delete(id);saveRoom();render();}
function liveUpdate(){
  const n=$('#nOn');if(n)n.textContent=online().length;
  if(G.view==='play'&&G.game&&G.game.live)G.game.live();
}

/* ---------- views ---------- */
function topBar(){
  const g=G.game,inG=G.view!=='menu'&&g;
  const mid=inG?`<div class="qno" style="--c:var(${g.col})"><b>${numOf(g)}</b><span>${esc((GROUPS.find(x=>x.id===g.group)||{}).short||'')}</span></div><div class="cat"><div><b>${esc(g.name)}</b><span id="tinfo">${esc(G.view==='play'&&g.topInfo?g.topInfo():g.tag)}</span></div></div>`
    :`<div class="cat"><div><b>Main menu</b><span>${GAMES.length} games · pick one</span></div></div>`;
  const room=G.code&&G.view!=='menu'?`<div class="mini"><button class="qr" id="miniQR" aria-label="Show the join QR large"></button><div><b>${G.code}</b><span>join any time</span></div></div>`:'';
  return `<header class="top">${logo()}<div class="tmid">${mid}</div><div class="tright">${room}<div class="count"><b id="nOn">${online().length}</b><span>online</span></div>
    <button class="ghost" id="bSfx" aria-pressed="${SFX.on}" title="Interface sound effects">SFX</button>
    <button class="ghost" id="bTheme" title="Paper or night (projector) look">Theme</button>
    ${G.view!=='menu'?`<button class="ghost" id="bMenu">Menu</button>`:''}</div></header>`;
}
function render(){
  if(ROLE!=='host')return;
  document.body.classList.add('hostb');
  const app=$('#app');app.className='host';
  if(G.splash){rSplash(app);return;}
  app.innerHTML=topBar()+`<main class="stage" id="stage"></main>`;
  const st=$('#stage');
  try{if(G.view==='menu')rMenu(st);else if(G.view==='setup')rSetup(st);else G.game.render(st);}catch(e){console.error(e);st.innerHTML=`<div class="pcenter"><h2>Oops</h2><p>${esc(e.message)}</p></div>`;}
  $('#bSfx').onclick=e=>{SFX.on=!SFX.on;store.set('sfx',SFX.on);e.target.setAttribute('aria-pressed',SFX.on);if(SFX.on)sfx.inn();};
  $('#bTheme').onclick=()=>{toggleTheme();render();};
  if($('#bMenu'))$('#bMenu').onclick=()=>exitGame();
  // the CONTROL ROOM wordmark is the home button
  const home=$('.top .logo');home.setAttribute('role','button');home.tabIndex=0;home.title='Main menu';
  home.onclick=()=>{if(G.view==='setup'){G.view='menu';render();syncAll();}else if(G.view==='play')exitGame();};home.onkeydown=e=>{if(e.key==='Enter')home.onclick();};
  const mq=$('#miniQR');if(mq){drawQR(mq,G.code,160);mq.onclick=()=>showBigQR(G.code);}
}
/* splash: the original Control Room poster — faders breathing like a live mix,
   the four answer shapes orbiting — until the first click or key */
let POSTER=null;
function rSplash(app){
  app.className='splash';
  app.innerHTML=`<canvas id="poster"></canvas><div class="sptt"><div class="kick">Production class · a sister to Meter Lab</div><h1>Control<br><i>Room</i></h1>
    <p>${GAMES.length} games for one room. The big screen asks, the phones answer.</p><button class="big go" id="bEnter">Enter <small>click anywhere</small></button></div>
`;
  const c=$('#poster');POSTER={c,ctx:c.getContext('2d')};posterSize();
  const enter=()=>{if(!G.splash)return;G.splash=false;POSTER=null;removeEventListener('keydown',key);try{audio();}catch(e){}sfx.open();render();};
  const key=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();enter();}};
  app.onclick=enter;addEventListener('keydown',key);
}
function posterSize(){if(!POSTER)return;const r=POSTER.c.getBoundingClientRect(),d=devicePixelRatio||1;POSTER.c.width=r.width*d;POSTER.c.height=r.height*d;POSTER.ctx.setTransform(d,0,0,d,0,0);POSTER.w=r.width;POSTER.h=r.height;}
function posterDraw(now){
  if(!POSTER.c.isConnected){POSTER=null;return;}
  const {ctx,w,h}=POSTER,t=now/1000,ink=css('--ink');ctx.clearRect(0,0,w,h);
  const cols=COLS.map(css);
  // faders: eight channel strips, levels breathing like a live mix
  const fx=w*.52,fw=w*.42,top=h*.08,bot=h*.6;
  for(let k=0;k<8;k++){const x=fx+k*fw/8+fw/16,lv=.5+.42*Math.sin(t*.7+k*1.3)*Math.sin(t*.23+k);
    ctx.strokeStyle=ink;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bot);ctx.stroke();
    const y=bot-(bot-top)*lv,fwd=Math.min(40,w*.022);ctx.fillStyle=cols[k%4];ctx.fillRect(x-fwd/2,y-fwd*.3,fwd,fwd*.6);ctx.lineWidth=3;ctx.strokeRect(x-fwd/2,y-fwd*.3,fwd,fwd*.6);}
  // the four answer shapes, orbiting
  const S=Math.min(w,h)*.25,R=S*.46; // a tight circular orbit, so neighbours overlap a little
  // centred over the CONTROL ROOM title, sitting just above it
  const t1=$('.sptt h1'),tb=t1&&t1.getBoundingClientRect(),cb=POSTER.c.getBoundingClientRect();
  const cx=tb?tb.left-cb.left+tb.width/2:w*.27,cy=tb?Math.max(R+S*.45,tb.top-cb.top-S*.25-R-S*.4):h*.3;
  [0,1,2,3].forEach(i=>{const a=t*.25+i*Math.PI/2,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R,s=S*(.75+.06*Math.sin(t+i));
    ctx.save();ctx.translate(x,y);ctx.rotate(i===1?t*.2:i===3?Math.PI/4:0);ctx.fillStyle=cols[i];ctx.strokeStyle=ink;ctx.lineWidth=Math.max(4,S*.025);ctx.beginPath();
    if(i===0)ctx.arc(0,0,s/2,0,Math.PI*2);else if(i===1||i===3)ctx.rect(-s/2.6,-s/2.6,s/1.3,s/1.3);else{ctx.moveTo(0,-s/2);ctx.lineTo(s/2,s/2.4);ctx.lineTo(-s/2,s/2.4);ctx.closePath();}
    ctx.fill();ctx.stroke();ctx.restore();});
}
function setTopInfo(){const t=$('#tinfo');if(t&&G.game&&G.game.topInfo)t.textContent=G.game.topInfo();}

function rMenu(st){
  const ps=players(),tot=rankBy('total');
  st.innerHTML=`<div class="menu">
    <aside class="roomp">
      <span class="lab mut">Scan to join · one room for the whole lesson</span>
      <button class="qr" id="roomQR" aria-label="Show the join QR full screen"></button>
      <div class="code">${G.code||'····'}</div>
      <div class="url">${G.code?esc(joinURL(G.code).replace(/^https?:\/\//,'')):esc(G.status||'Opening the room…')}</div>
      ${(window.ATTENDANCE||{}).url?`<div class="attbox"><label><span class="lab">Class list</span><select id="selCls"><option value="">No list (students type names)</option>${(ATT.classes||(ATT.cls?[ATT.cls]:[])).map(c=>`<option ${c===ATT.cls?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
        <span class="fine">${ATT.err?esc(ATT.err):!ATT.classes?'Loading classes…':ATT.cls?`${ATT.names.length} names on phones · <b>${attCount()}</b> checked in today`:'Pick a class: phones show its names and take attendance'}</span></div>`:''}
      <div class="rhead2"><b>${ps.length}</b><span>${ps.length===1?'player':'players'} in the room</span></div>
      <div class="mchips">${ps.length?ps.map(p=>`<button class="mchip c${p.sh}${p.conn&&p.conn.open?'':' off'}${p.att==='in'?' att':p.att==='fail'?' attx':''}" data-id="${esc(p.id)}" title="${p.att==='in'?'Checked in on the attendance sheet · ':p.att==='fail'?'Attendance not recorded · ':''}Click to remove">${shape(p.sh,14)}${esc(p.name)}</button>`).join(''):`<p class="empty">Waiting for the first phone…</p>`}</div>
      ${tot.list.some(p=>p.total>0)?`<div class="standings"><span class="lab">Room standings</span>${tot.list.slice(0,8).map(p=>`<div class="srow"><b>${tot.map.get(p.id)}</b><span>${esc(p.name)}</span><em>${p.total}</em></div>`).join('')}</div>`:''}
      <div class="frow"><button class="ghost" id="bReset">Reset points</button><button class="ghost" id="bNew">New room</button></div>
    </aside>
    <section class="games">${GROUPS.map(gr=>`<div class="ggroup" style="--c:var(${gr.col})"><div class="ghead"><i></i><b>${esc(gr.name)}</b><span>${esc(gr.sub)}</span></div>
      <div class="gtiles">${GAMES.filter(g=>g.group===gr.id).map(g=>`<button class="gt" data-g="${g.id}" style="--c:var(${g.col})"><span class="no">${numOf(g)}</span><span class="ico">${g.icon||''}</span><strong>${esc(g.name)}</strong><p>${esc(g.tag)}</p><span class="meta">${(g.badges||[]).map(b=>`<span>${esc(b)}</span>`).join('')}</span></button>`).join('')}</div></div>`).join('')}</section>
  </div>`;
  if(G.code){drawQR($('#roomQR'),G.code,480);$('#roomQR').onclick=()=>showBigQR(G.code);}
  $$('.mchip',st).forEach(b=>b.onclick=()=>{if(confirm('Remove '+b.textContent+' from the room?'))kick(b.dataset.id);});
  $$('.gt',st).forEach(b=>b.onclick=()=>{G.game=gameById(b.dataset.g);G.view='setup';render();syncAll();});
  $('#bReset').onclick=resetPoints;$('#bNew').onclick=newRoom;
  if($('#selCls'))$('#selCls').onchange=e=>attSetClass(e.target.value);
}

/* setup: the game's poster on the left, its options on the right */
function optVals(g){const saved=store.get('opt.'+g.id,{}),v={};(g.options||[]).forEach(o=>{v[o.key]=saved[o.key]!==undefined?saved[o.key]:o.def;});return v;}
function rSetup(st){
  const g=G.game,v=optVals(g);
  const optHTML=(o,k)=>{
    const head=`<h3><b>${pad2(k+1)}</b>${esc(o.label)}${o.sub?`<small>${esc(typeof o.sub==='function'?o.sub(v):o.sub)}</small>`:''}</h3>`;
    if(o.type==='multi')return `<div class="fsec">${head}<div class="cats" data-k="${o.key}">${o.choices.map(([cv,lab,sm],i)=>`<button class="catc" data-i="${i}" aria-pressed="${v[o.key].includes(cv)}"><b>${pad2(i+1)}</b><strong>${esc(lab)}</strong><span>${esc(sm||'')}</span></button>`).join('')}</div>
      <div class="frow"><button class="ghost" data-all="${o.key}">All</button><button class="ghost" data-none="${o.key}">None</button></div>${o.help?`<p class="fine">${o.help}</p>`:''}</div>`;
    return `<div class="fsec">${head}<div class="seg" data-k="${o.key}">${o.choices.map(([cv,lab,sm],i)=>`<button data-i="${i}" aria-pressed="${JSON.stringify(v[o.key])===JSON.stringify(cv)}">${esc(lab)}${sm?`<small>${esc(sm)}</small>`:''}</button>`).join('')}</div>${o.help?`<p class="fine">${o.help}</p>`:''}</div>`;
  };
  st.innerHTML=`<div class="gsetup" style="--c:var(${g.col})">
    <section class="gintro dots"><div class="bigico">${g.icon||''}</div>
      <div class="gtitle"><div class="no">${numOf(g)}</div><h1>${esc(g.name)}</h1><p class="tag">${esc(g.tag)}</p></div>
      <ol class="how">${(g.how||[]).map(h=>`<li><span>${h}</span></li>`).join('')}</ol></section>
    <section class="form">${(g.options||[]).map(optHTML).join('')}${g.setupExtra?g.setupExtra(v):''}
      <div class="frow"><button class="ghost" id="bBack">← Menu</button><button class="big go" id="bGo">${esc(g.startLabel||'Start')} <small>SPACE</small></button>
      <span class="fine">${online().length?online().length+' online':'Nobody online yet — phones can join any time.'}</span></div>
      ${g.note?`<p class="fine">${g.note}</p>`:''}</section></div>`;
  const save=()=>{store.set('opt.'+g.id,v);rSetup(st);};
  $$('.seg',st).forEach(sg=>{const o=g.options.find(x=>x.key===sg.dataset.k);$$('button',sg).forEach(b=>b.onclick=()=>{v[o.key]=o.choices[+b.dataset.i][0];save();});});
  $$('.cats',st).forEach(sg=>{const o=g.options.find(x=>x.key===sg.dataset.k);$$('button',sg).forEach(b=>b.onclick=()=>{const cv=o.choices[+b.dataset.i][0],s=new Set(v[o.key]);s.has(cv)?s.delete(cv):s.add(cv);v[o.key]=o.choices.map(c=>c[0]).filter(x=>s.has(x));save();});});
  $$('[data-all]',st).forEach(b=>b.onclick=()=>{const o=g.options.find(x=>x.key===b.dataset.all);v[o.key]=o.choices.map(c=>c[0]);save();});
  $$('[data-none]',st).forEach(b=>b.onclick=()=>{v[b.dataset.none]=[];save();});
  $('#bBack').onclick=()=>{G.view='menu';render();syncAll();};
  $('#bGo').onclick=()=>startGame(g,v);
  if(g.setupBind)g.setupBind(st,()=>rSetup(st));
}
function startGame(g,v){
  v=v||optVals(g);
  if(g.check){const why=g.check(v);if(why){toast(why);return;}}
  clearLater();AU_stopAll();G.gs=null;
  players().forEach(p=>Object.assign(p,{gp:0,streak:0,best:0,right:0,last:null}));
  G.view='play';G.game=g;
  try{g.start(v);}catch(e){console.error(e);toast('Could not start: '+e.message);G.view='setup';}
  render();syncAll();
}
function exitGame(force){
  if(G.view==='menu')return;
  if(!force&&G.view==='play'&&G.gs&&!(G.gs.phase==='end')&&!confirm('Leave this game and go back to the menu? Points won so far are kept.'))return;
  try{G.game&&G.game.stop&&G.game.stop();}catch(e){}
  clearLater();AU_stopAll();G.view='menu';G.gs=null;saveRoom();render();syncAll();
}

/* ---------- the ring: a clock as an arc, players as beads ---------- */
const RINGS=new Set();
function ring(c,fn){if(!c)return;const r={c,ctx:c.getContext('2d'),fn};ringSize(r);RINGS.add(r);return r;}
function ringSize(r){const b=r.c.getBoundingClientRect(),d=devicePixelRatio||1;r.c.width=Math.max(1,b.width*d);r.c.height=Math.max(1,b.height*d);r.ctx.setTransform(d,0,0,d,0,0);r.w=b.width;r.h=b.height;}
function ringDraw(r,t){
  if(!r.c.isConnected){RINGS.delete(r);return;}
  const s=r.fn(t)||{},{ctx,w,h}=r,cx=w/2,cy=h/2,R=Math.min(w,h)*.36;ctx.clearRect(0,0,w,h);
  const ink=css('--ink'),hair=css('--hair'),paper=css('--paper');
  ctx.lineCap='butt';ctx.lineWidth=R*.2;ctx.strokeStyle=hair;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
  const frac=clamp(s.frac??0,0,1);if(frac>0){ctx.strokeStyle=s.hot?css('--red'):ink;ctx.beginPath();ctx.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+Math.PI*2*frac);ctx.stroke();}
  if(s.fill){ctx.fillStyle=css(s.fill);ctx.beginPath();ctx.arc(cx,cy,R*.78,0,Math.PI*2);ctx.fill();}
  const label=String(s.label??'');ctx.fillStyle=s.fill&&s.fill!=='--yel'?'#fff':ink;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`900 ${label.length>3?R*.42:label.length>2?R*.6:R*.95}px Archivo`;ctx.fillText(label,cx,cy-R*.06);
  if(s.sub){ctx.font=`700 ${Math.max(9,R*.11)}px "Space Mono"`;ctx.fillText(String(s.sub).toUpperCase(),cx,cy+R*.5);}
  const beads=s.beads||[],n=beads.length,BR=R*1.3;
  beads.forEach((b,i)=>{const a=-Math.PI/2+i/n*Math.PI*2,x=cx+Math.cos(a)*BR,y=cy+Math.sin(a)*BR,z=clamp(R*.09,3,9);
    ctx.globalAlpha=b.a??1;ctx.lineWidth=2;ctx.strokeStyle=ink;ctx.fillStyle=b.f?(b.f[0]==='-'?css(b.f):b.f):paper;
    ctx.beginPath();ctx.arc(x,y,b.big?z*1.15:z,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.globalAlpha=1;});
}
addEventListener('resize',()=>{RINGS.forEach(ringSize);posterSize();if(G.game&&G.game.resize)G.game.resize();});
function frame(t){if(ROLE==='host'){if(POSTER)posterDraw(t);RINGS.forEach(r=>ringDraw(r,t));if(G.view==='play'&&G.game&&G.game.frame)try{G.game.frame(t);}catch(e){console.error(e);}}else pFrame(t);requestAnimationFrame(frame);}

/* ---------- leaderboard + podium (shared by every scored game) ---------- */
function rBoard(st,{title='Leaderboard',after='',next='Next round',onNext}={}){
  const {list:r,map:rk}=rankBy('gp'),prev=(G.gs&&G.gs.prevOrder)||[],top=r.slice(0,8);
  const max=Math.max(1,...r.map(p=>p.gp));
  st.innerHTML=`<div class="board dots"><div class="bhead"><h2>${esc(title)}</h2><span>${esc(after)}</span></div><div class="rows" id="rows"></div>
    <div class="bfoot"><span class="lab">${r.length>8?`+ ${r.length-8} more on their phones`:''}</span><button class="big go" id="bNext">${esc(next)} <small>SPACE</small></button></div></div>`;
  const box=$('#rows'),H=box.clientHeight,rh=Math.min(84,H/8),old=new Map(prev.map((id,i)=>[id,i]));
  top.forEach((p,i)=>{
    const was=old.has(p.id)?old.get(p.id):8,gain=p.last?p.last.pts||0:0,mv=old.has(p.id)?old.get(p.id)-i:0;
    const row=el('div',`row c${p.sh}`,`<span class="rk">${rk.get(p.id)}</span><span class="nm">${shape(p.sh,24)}<span>${esc(p.name)}</span>${p.streak>=3?`<em>${p.streak}× streak</em>`:''}</span><div class="lane"><i class="fill" style="width:${100*Math.max(0,p.gp-gain)/max}%"></i></div><span class="sc"><span>${p.gp-gain}</span>${mv>0?`<i class="mv up">▲${mv}</i>`:mv<0?`<i class="mv dn">▼${-mv}</i>`:''}</span>`);
    row.style.height=rh+'px';row.style.top=Math.min(was,8)*rh+'px';if(was>=8)row.style.opacity=0;box.appendChild(row);
    setTimeout(()=>{row.style.top=i*rh+'px';row.style.opacity=1;row.querySelector('.fill').style.width=(100*p.gp/max)+'%';countUp(row.querySelector('.sc span'),p.gp-gain,p.gp);},350);
  });
  $('#bNext').onclick=onNext||(()=>G.game.next());
}
function countUp(e,a,b){const t0=now(),d=900;const f=n=>{const k=clamp((n-t0)/d,0,1);e.textContent=Math.round(a+(b-a)*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f);};requestAnimationFrame(f);}
function rPodium(st,{title='Top of the room',line=p=>`${p.gp} pts`}={}){
  const {list:r,map:rk}=rankBy('gp'),pod=[r[1],r[0],r[2]];
  st.innerHTML=`<div class="final"><section class="podium dots"><canvas id="conf"></canvas><h2>${esc(title)}</h2>
    <div class="steps">${pod.map((p,k)=>p?`<div class="step c${[1,0,2][k]}"><span class="who">${esc(p.name)}</span><span class="pts">${esc(line(p))}</span><div class="blk">${rk.get(p.id)}</div></div>`:'<div class="step"></div>').join('')}</div></section>
    <section class="flist"><h3>Everyone · this game</h3><div class="fl">${r.map(p=>`<div class="fr"><b>${rk.get(p.id)}</b><span>${esc(p.name)}</span><em>${p.gp}</em></div>`).join('')}</div>
      <div class="ffoot"><button class="big go" id="bMenu2">Back to the menu</button></div></section></div>`;
  $('#bMenu2').onclick=()=>exitGame(true);
  confetti($('#conf'));
}
function confetti(c){
  const r=c.getBoundingClientRect(),d=devicePixelRatio||1;c.width=r.width*d;c.height=r.height*d;const ctx=c.getContext('2d');ctx.scale(d,d);
  const cols=COLS.map(css),ink=css('--ink');
  const bits=[...Array(90)].map(()=>({x:Math.random()*r.width,y:-Math.random()*r.height,v:1.5+Math.random()*3,a:Math.random()*6,s:8+Math.random()*14,k:Math.floor(Math.random()*4),w:(Math.random()-.5)*.1}));
  const t0=now();
  const f=n=>{if(!c.isConnected)return;ctx.clearRect(0,0,r.width,r.height);const late=n-t0>2200;
    bits.forEach(b=>{if(late)b.y+=b.v;b.a+=b.w;if(b.y>r.height+20&&n-t0<9000)b.y=-20;if(!late)return;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.fillStyle=cols[b.k];ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();
      if(b.k===0)ctx.arc(0,0,b.s/2,0,7);else if(b.k===2){ctx.moveTo(0,-b.s/2);ctx.lineTo(b.s/2,b.s/2);ctx.lineTo(-b.s/2,b.s/2);ctx.closePath();}else ctx.rect(-b.s/2,-b.s/2,b.s,b.s);ctx.fill();ctx.stroke();ctx.restore();});
    requestAnimationFrame(f);};requestAnimationFrame(f);
}

/* =====================================================================
   ROUND FRAMEWORK
   spec: build(opts)→rounds · secs(opts,r) · prepMs · public(r)→what phones get
         stage(main,r,ctx) · reveal(main,r,ctx) · input(root,pub,submit,api)
         score(r,answer,{ms,T})→{acc 0..1, note} · optional hooks below
   Points: 1000 × accuracy × speed factor (spec.speed = how much a slow
   answer loses, 0..1), +100 per streak step up to +500.
   ===================================================================== */
function roundGame(spec){
  const g=Object.assign({kind:'round',speed:.5,okAt:.99,closeAt:.45,prepMs:0,badges:['Scored']},spec);
  const cur=()=>G.gs.rounds[G.gs.i];
  g.topInfo=()=>{const s=G.gs;if(!s)return g.tag;if(s.phase==='end')return 'Final results';return `Round ${Math.min(s.i+1,s.rounds.length)} of ${s.rounds.length}`+(g.roundInfo?' · '+g.roundInfo(cur(),s.opts):'');};
  g.start=opts=>{
    const rounds=g.build(opts);if(!rounds.length)throw new Error('No rounds to play with these settings');
    G.gs={opts,rounds,i:-1,done:-1,phase:'prep',ans:new Map(),res:new Map(),T:0,openAt:0,prepEnd:0,openEnd:0,prevOrder:[],lastTick:0};
    goRound(0,true);
  };
  function goRound(i,first){
    const s=G.gs;clearLater();g.leave&&g.leave();s.i=i;s.ans=new Map();s.res=new Map();s.phase='prep';
    const ms=typeof g.prepMs==='function'?g.prepMs(cur(),s.opts):g.prepMs;s.prepEnd=now()+ms;s.prepMsTot=ms;
    g.onPrep&&g.onPrep(cur(),s.opts);
    if(ms>0)later(()=>{if(G.gs===s&&s.phase==='prep'&&s.i===i)open();},ms);else{open(first);return;}
    if(!first){render();syncAll();}
  }
  function open(first){
    const s=G.gs;s.phase='open';s.T=(g.secs?g.secs(s.opts,cur()):20)*1000;s.openAt=now();s.openEnd=s.T?s.openAt+s.T:0;s.lastTick=0;
    const i=s.i;if(s.T)later(()=>{if(G.gs===s&&s.phase==='open'&&s.i===i)reveal();},s.T);
    g.onOpen&&g.onOpen(cur(),s.opts);sfx.open();if(!first){render();syncAll();}
  }
  function answer(p,d){
    const s=G.gs;if(s.phase!=='open'||d.i!==s.i||s.ans.has(p.id))return;if(g.valid&&!g.valid(cur(),d.a))return;
    s.ans.set(p.id,{a:d.a,ms:now()-s.openAt});sfx.inn();liveUpdate();
    if(online().length&&online().every(x=>s.ans.has(x.id)))later(()=>{if(G.gs===s&&s.phase==='open'&&s.i===d.i)reveal();},900);
  }
  function reveal(){
    const s=G.gs;if(s.phase!=='open')return;clearLater();const r=cur();s.prevOrder=rankBy('gp').list.map(p=>p.id);let accSum=0,n=0;
    players().forEach(p=>{
      const a=s.ans.get(p.id);let res=a?(g.score(r,a.a,{ms:a.ms,T:s.T,opts:s.opts})||{acc:0}):{acc:0,note:'No answer this time'};
      const acc=clamp(+res.acc||0,0,1),ok=!!a&&acc>=g.okAt,sf=s.T&&a?1-g.speed*clamp(a.ms/s.T,0,1):1;
      if(ok){p.streak++;p.right++;p.best=Math.max(p.best,p.streak);if([3,5,8,12].includes(p.streak))logAdd(p,{kind:'star',game:g.name,text:`${p.streak} right in a row`});}else p.streak=0;
      let pts=a?Math.round(1000*acc*sf/10)*10:0;if(ok)pts+=Math.min(p.streak-1,5)*100;
      award(p,pts);const cls=!a?'none':ok?'yes':acc>=g.closeAt?'close':'no';p.last={pts,acc,ok,cls};s.res.set(p.id,{...res,acc,pts,cls});
      if(a){accSum+=acc;n++;}
    });
    s.done=s.i;s.phase='reveal';g.onReveal&&g.onReveal(r,s.opts);sfx.reveal(n?100*accSum/n:0);
    render();syncAll();saveRoom();
  }
  g.next=()=>{
    const s=G.gs;if(!s)return;
    if(s.phase==='prep')open();
    else if(s.phase==='open')reveal();
    else if(s.phase==='reveal'){if(boardDue())g.toBoard();else g.skip();}
    else if(s.phase==='board'){if(s.done+1<s.rounds.length)goRound(s.done+1);else g.finish();}
    else if(s.phase==='end')exitGame(true);
  };
  // the leaderboard only comes up when the teacher asks for it; after the last round Next goes to the podium
  const boardDue=()=>false;
  g.toBoard=()=>{const s=G.gs;g.leave&&g.leave();s.phase='board';sfx.board();render();syncAll();};
  g.skip=()=>{const s=G.gs;g.leave&&g.leave();if(s.done+1<s.rounds.length)goRound(s.done+1);else g.finish();};
  g.finish=()=>{const s=G.gs;s.phase='end';sfx.fanfare();const rk=rankBy('gp');
    players().filter(p=>p.gp>0||p.right>0).forEach(p=>logAdd(p,{kind:'finish',game:g.name,text:`${ordinal(rk.map.get(p.id))} of ${G.players.size} · ${p.gp} pts · ${p.right}/${s.rounds.length} right${p.best>1?` · best streak ${p.best}`:''}`}));
    render();syncAll();};
  const ownStop=spec.stop; // a module's own stop hook (e.g. hiding an embedded frame) still runs
  g.stop=()=>{g.leave&&g.leave();ownStop&&ownStop.call(g);};
  g.act=(p,d)=>{if(d.t==='ans')answer(p,d);else if(g.onAct)g.onAct(p,d);};
  g.live=()=>{const s=G.gs;if(!s)return;const a=$('#nAns');if(a)a.innerHTML=`${[...s.ans.keys()].length}<span>/${online().length}</span>`;
    if(s.phase==='open')online().forEach(sync);};
  g.answers=()=>{const s=G.gs;return players().map(p=>({p,a:s.ans.has(p.id)?s.ans.get(p.id).a:undefined,ms:s.ans.has(p.id)?s.ans.get(p.id).ms:0,res:s.res.get(p.id)})).filter(x=>x.a!==undefined);};
  g.render=st=>{
    const s=G.gs,r=cur();
    if(s.phase==='board')return rBoard(st,{after:`after ${s.done+1} of ${s.rounds.length}`,next:s.done+1<s.rounds.length?'Next round':'Reveal the podium'});
    if(s.phase==='end')return rPodium(st);
    const ctx={phase:s.phase,opts:s.opts,s,list:g.answers()};
    const last=s.done+1>=s.rounds.length,due=boardDue();
    const btn={prep:g.prepBtn||'Open answers now',open:'Reveal now',reveal:last?'Reveal the podium':'Next round'}[s.phase];
    const alt=s.phase==='reveal'?`<button class="ghost wide" id="bAlt">Show the leaderboard</button>`:'';
    st.innerHTML=`<div class="rg ph-${s.phase}"><section class="rgm dots" id="rgm"></section>
      <aside class="side"><div class="ringbox"><canvas id="ring"></canvas></div><div class="sinfo" id="sinfo"></div>
      <div class="sact">${g.replay?`<button class="ghost wide" id="bReplay">▶ ${esc(g.replayLabel||'Play again')}</button>`:''}<button class="big ${s.phase==='reveal'?'go':''}" id="bNext">${esc(btn)} <small>SPACE</small></button>${alt}<span class="keys">Space / → next · Q join code</span></div></aside></div>
      ${s.phase==='prep'&&s.prepMsTot>0?'<i class="readbar" id="readbar"></i>':''}`;
    const m=$('#rgm');(s.phase==='reveal'?g.reveal:g.stage).call(g,m,r,ctx);
    const si=$('#sinfo');
    if(s.phase==='reveal'){
      const L=ctx.list,best=L.slice().sort((a,b)=>(b.res?.pts||0)-(a.res?.pts||0))[0],avg=L.length?Math.round(100*L.reduce((a,x)=>a+(x.res?.acc||0),0)/L.length):0;
      si.innerHTML=(g.revealSide?g.revealSide(r,ctx):`<div class="stat"><b>${g.okAt>=.99?Math.round(100*L.filter(x=>x.res&&x.res.cls==='yes').length/Math.max(1,players().length))+'%':avg+'%'}</b><span>${g.okAt>=.99?'got it right':'average accuracy'}</span></div>`)
        +(best&&best.res&&best.res.pts>0?`<div class="fast"><span class="lab">Top score this round</span><b>${esc(best.p.name)}</b><span class="lab">+${best.res.pts}${best.res.note?' · '+esc(best.res.note):''}</span></div>`:`<div class="fast"><span class="lab">Nobody scored</span><b>Stump the room ✓</b></div>`);
    }else si.innerHTML=`<div class="stat"><b id="nAns">${s.ans.size}<span>/${online().length}</span></b><span>answered</span></div><p class="fine">${s.phase==='prep'?(g.prepSide?g.prepSide(r,s.opts):'Get ready…'):(g.openSide?g.openSide(r,s.opts):'Revealed when everyone has answered'+(s.T?' or the clock runs out.':'.'))}</p>`;
    $('#bNext').onclick=g.next;if($('#bAlt'))$('#bAlt').onclick=due?g.skip:g.toBoard;if(g.replay)$('#bReplay').onclick=()=>g.replay(r,s.phase,s.opts);
    ring($('#ring'),t=>{
      const beads=players().map(p=>{const a=s.ans.has(p.id),on=p.conn&&p.conn.open,rs=s.res.get(p.id);
        return {f:s.phase==='reveal'?(rs?{yes:'--green',close:'--yel',no:'--red',none:''}[rs.cls]:''):a?'--ink':'',big:a,a:on?1:.3};});
      if(s.phase==='prep'){const fr=s.prepMsTot?1-clamp((s.prepEnd-t)/s.prepMsTot,0,1):1;const rb=$('#readbar');if(rb)rb.style.transform=`scaleX(${1-fr})`;return {frac:fr,label:g.prepLabel||'READY',sub:g.prepSub||'get set',beads};}
      if(s.phase==='open'){if(s.openEnd){const left=Math.max(0,s.openEnd-t),sec=Math.ceil(left/1000);if(left>0&&sec<=5&&sec!==s.lastTick){s.lastTick=sec;sfx.tick(sec);}return {frac:left/s.T,hot:left<5000,label:String(sec),sub:'seconds',beads};}return {frac:1,label:'∞',sub:'no clock',beads};}
      const rl=g.ringLabel?g.ringLabel(r):{label:'✓',fill:'--green'};return {frac:0,label:rl.label,sub:rl.sub||'',fill:rl.fill,beads};
    });
  };
  g.pstate=p=>{
    const s=G.gs,r=cur(),rk=rankBy('gp').map;
    const base={ph:s.phase,i:s.i,n:s.i+1,tot:s.rounds.length,gp:p.gp,rank:rk.get(p.id)||0,of:G.players.size,streak:p.streak};
    if(s.phase==='prep')return {...base,k:'prep'+s.i,txt:g.prepText?g.prepText(r,s.opts):{big:'Eyes up',small:'Watch the big screen.'}};
    if(s.phase==='open'){const a=s.ans.get(p.id);return {...base,k:'open'+s.i+(a?'a':''),pub:g.public(r,s.opts),mine:a?a.a:null,left:s.T?Math.max(0,s.openEnd-now()):null,T:s.T,count:`${s.ans.size} of ${online().length} answered`};}
    if(s.phase==='reveal'){const res=s.res.get(p.id)||{},a=s.ans.get(p.id);return {...base,k:'rev'+s.i,cls:res.cls||'none',pts:res.pts||0,acc:res.acc||0,note:res.note||'',mine:a?a.a:null,pub:g.public(r,s.opts),rv:g.publicReveal?g.publicReveal(r,a&&a.a,res,s.opts):null};}
    return {...base,k:s.phase+s.i};
  };
  g.player=(root,st,api)=>{
    if(st.ph==='prep'){root.innerHTML=`<div class="pcenter dots"><div class="lab">${esc(g.name)} · round ${st.n} of ${st.tot}</div><h2 class="pul">${esc(st.txt.big)}</h2><p>${esc(st.txt.small||'')}</p></div>`;return;}
    if(st.ph==='open'){
      if(st.mine==null){
        root.innerHTML=`<div class="pq"><div><div class="pqh"><b>${st.n}/${st.tot}</b><span class="sp">${esc(g.name)}</span><span id="pLeft"></span></div>${st.left!=null?'<div class="ptime"><i id="pBar"></i></div>':''}</div><div class="pin" id="pin"></div></div>`;
        PL.timer=st.left!=null?{end:now()+st.left,T:st.T}:null;
        g.input($('#pin',root),st.pub,a=>{api.send({t:'ans',i:st.i,a});st.mine=a;if(navigator.vibrate)navigator.vibrate(25);g.player(root,st,api);},api);
      }else{
        root.innerHTML=`<div class="pcenter dots"><div class="lab">Locked in</div><div id="plk" class="plk"></div><p id="pWait">${esc(st.count)}</p></div>`;
        if(g.locked)g.locked($('#plk',root),st.mine,st.pub);
      }
      return;
    }
    if(st.ph==='reveal'){
      const lab={yes:g.yesWord||'Yes!',close:'Close!',no:g.noWord||'Nope',none:'Too slow'}[st.cls];
      root.innerHTML=`<div class="res r-${st.cls}"><h2>${lab}</h2>${st.pts?`<div class="pts">+${st.pts}</div>`:''}${st.note?`<p>${esc(st.note)}</p>`:''}${st.streak>1&&st.cls==='yes'?`<p><b>${st.streak} in a row</b> — streak bonus on</p>`:''}<div id="prv" class="prv"></div><p>You're <b>${ordinal(st.rank)}</b> of ${st.of} · ${st.gp} pts</p></div>`;
      if(g.pReveal)g.pReveal($('#prv',root),st);
      return;
    }
    pRankCard(root,st,st.ph==='end'?'Final result':`After ${st.n} of ${st.tot}`);
  };
  g.pupdate=(root,st)=>{const w=$('#pWait',root);if(w&&st.count)w.textContent=st.count;};
  return g;
}

/* =====================================================================
   PLAYER (phone)
   ===================================================================== */
const PID_KEY='pid'+(QS.get('as')||'');
const PL={id:store.get(PID_KEY,null),name:store.get('pname',''),code:'',peer:null,conn:null,st:null,status:'',joined:false,kicked:false,retry:0,q:[],key:'',timer:null};
if(!PL.id){PL.id=Math.random().toString(36).slice(2,10)+Date.now().toString(36);store.set(PID_KEY,PL.id);}
const papi={send(d){const m={t:'act',g:PL.st&&PL.st.g,d};if(PL.conn&&PL.conn.open){try{PL.conn.send(m);}catch(e){PL.q.push(m);}}else PL.q.push(m);},vibe(p){if(navigator.vibrate)navigator.vibrate(p);}};
async function pConnect(){
  if(PL.kicked)return;
  PL.status='Connecting to '+PL.code+'…';pRender();
  try{await needPeer();}catch(e){PL.status='No internet connection?';pRender();return;}
  if(PL.peer&&!PL.peer.destroyed)PL.peer.destroy();
  const peer=new Peer({debug:0});PL.peer=peer;
  clearTimeout(PL.wd);PL.wd=setTimeout(()=>{if(PL.peer===peer&&(!PL.conn||!PL.conn.open))pRetry();},10000);
  peer.on('open',()=>{const conn=peer.connect(peerId(PL.code),{serialization:'json',reliable:true});PL.conn=conn;PL.connCode=PL.code;
    const fail=setTimeout(()=>{if(!conn.open){PL.status='No room '+PL.code+' found. Check the code on the big screen.';pRender();}},9000);
    conn.on('open',()=>{clearTimeout(fail);PL.retry=0;PL.heard=now();PL.status='';conn.send(PL.joined?{t:'hi',id:PL.id,name:PL.name}:{t:'who'});if(!PL.joined)pRender();const q=PL.q;PL.q=[];q.forEach(m=>{try{conn.send(m);}catch(e){}});});
    conn.on('data',m=>{PL.heard=now();pData(m);});
    conn.on('close',()=>{if(PL.kicked)return;PL.status='Lost the room — reconnecting…';pRender();pRetry();});});
  peer.on('error',e=>{if(e.type==='peer-unavailable'){PL.status='No room '+PL.code+' found. Check the code on the big screen.';pRender();if(PL.joined)pRetry();return;}PL.status='Connection problem ('+(e.type||'?')+') — retrying…';pRender();pRetry();});
}
// heartbeat: a reloaded host page doesn't always close the old channel, so 12 s of silence means reconnect
setInterval(()=>{if(ROLE!=='player'||!PL.joined||PL.kicked||!PL.conn||!PL.conn.open)return;
  try{PL.conn.send({t:'ping'});}catch(e){}
  if(now()-(PL.heard||0)>12000){PL.status='Lost the room — reconnecting…';pRender();PL.heard=now();PL.retry=0;pConnect();}},4000);
function pRetry(){clearTimeout(PL.rt);PL.rt=setTimeout(()=>{if(!PL.conn||!PL.conn.open)pConnect();},Math.min(8000,1000*(++PL.retry)));}
document.addEventListener('visibilitychange',()=>{if(ROLE==='player'&&document.visibilityState==='visible'&&PL.joined&&(!PL.conn||!PL.conn.open)){PL.retry=0;pConnect();}});
function pData(m){
  if(!m||typeof m!=='object'||m.t==='pong')return;
  if(m.t==='log'){const had=(PL.log||[]).length;PL.log=Array.isArray(m.log)?m.log:[];const b=$('.nbcount');if(b){b.textContent=PL.log.length;if(PL.log.length>had){const n=$('#nbBtn');if(n){n.classList.remove('ping');void n.offsetWidth;n.classList.add('ping');}}}if($('#nb'))openNotebook();return;}
  if(m.t==='names'){PL.names=m;if(!PL.joined)pRender();return;}
  if(m.t==='taken'){PL.joined=false;PL.st=null;store.del('proom');PL.status=m.name+' is already in the room on another phone. Tell your teacher if that isn’t you.';pRender();return;}
  if(m.t==='kick'){PL.kicked=true;PL.st={view:'kicked',why:m.why};try{PL.conn.close();}catch(e){}pRender();return;}
  if(m.t!=='st')return;
  const prev=PL.st;PL.st=m;PL.name=m.name;
  const key=m.view+'|'+m.g+'|'+(m.s?m.s.k:'');
  if(prev&&key===PL.key&&m.view==='play'){const g=gameById(m.g);const top=$('.pscore');if(top)top.textContent=m.total;if(g&&g.pupdate)g.pupdate($('#pbody'),m.s,papi);return;}
  if(m.view==='play'&&m.s&&m.s.ph==='reveal'&&navigator.vibrate)navigator.vibrate(m.s.cls==='yes'?[40,40,40]:120);
  pRender();
}
function pRankCard(root,st,label){root.innerHTML=`<div class="pcenter dots"><div class="lab">${esc(label)}</div><div class="rankbig">${st.rank}<sup>${sufx(st.rank)}</sup></div><p>of ${st.of} · <b>${st.gp}</b> points${st.streak>1?` · ${st.streak} in a row`:''}</p></div>`;}
function pRender(){
  if(ROLE!=='player')return;
  const app=$('#app');app.className='ply';const s=PL.st;
  const top=`<header class="ptop">${logo()}${PL.joined&&s&&s.view!=='kicked'?`<button class="nbbtn" id="nbBtn" aria-label="Your notebook">${NB_ICON}<b class="nbcount">${(PL.log||[]).length}</b></button><div class="who"><span>${esc(PL.name)}</span><b class="pscore">${s.total||0}</b></div>`:''}</header>`;
  app.innerHTML=top+`<main class="pbody" id="pbody"></main>`;
  if($('#nbBtn'))$('#nbBtn').onclick=openNotebook;
  const body=$('#pbody');PL.key='';PL.timer=null;PL.clock=null;
  if(!PL.joined&&PL.names&&PL.names.names.length&&!PL.typing){
    const L=PL.names.names.slice().sort((a,b)=>a.n.localeCompare(b.n));
    body.innerHTML=`<div class="pjoin pwho"><h1>Who<br><i>are you?</i></h1><p class="lab">${esc(PL.names.cls)} · room ${esc(PL.code)}</p>
      <div class="pnames">${L.map((x,i)=>`<button class="pname c${i%4}" data-n="${esc(x.n)}" ${x.here?'disabled':''}>${esc(x.n)}${x.here?'<small>in the room</small>':''}</button>`).join('')}</div>
      ${PL.status?`<p class="pst err">${esc(PL.status)}</p>`:''}
      <button class="linkbtn" id="pType">My name isn’t on the list</button></div>`;
    $$('.pname',body).forEach(b=>b.onclick=()=>{PL.name=b.dataset.n;PL.status='';store.set('pname',PL.name);store.set('proom',PL.code);PL.joined=true;papi.vibe(15);
      if(PL.conn&&PL.conn.open){PL.conn.send({t:'hi',id:PL.id,name:PL.name});pRender();}else pConnect();});
    $('#pType').onclick=()=>{PL.typing=true;pRender();};
    return;
  }
  if(!PL.joined&&PL.code&&QS.has('room')&&!PL.names&&!PL.typing&&!/No room/.test(PL.status||'')){
    body.innerHTML=`<div class="pcenter"><h2 class="pul">Room ${esc(PL.code)}</h2><p>${esc(PL.status||'Connecting…')}</p><button class="linkbtn" id="pType">Type my name instead</button></div>`;
    $('#pType').onclick=()=>{PL.typing=true;pRender();};return;
  }
  if(!PL.joined){
    body.innerHTML=`<form class="pjoin" id="fJoin"><h1>Control<br><i>Room</i></h1>
      <label><span class="lab">Room code</span><input class="code" id="iCode" maxlength="4" autocomplete="off" autocapitalize="characters" value="${esc(PL.code)}" placeholder="ABCD" required></label>
      <label><span class="lab">Your name</span><input id="iName" maxlength="18" autocomplete="nickname" value="${esc(PL.name)}" placeholder="First name" required></label>
      <button class="big go" type="submit">Join</button>
      ${PL.status?`<p class="pst err">${esc(PL.status)}</p>`:''}
      <p class="fine">You join once for the whole lesson. Your phone follows the big screen from game to game.${!QS.has('room')?' · <a href="?host">Host on this device</a>':''}</p></form>`;
    $('#fJoin').onsubmit=e=>{e.preventDefault();const c=$('#iCode').value.toUpperCase().replace(/[^A-Z0-9]/g,''),n=$('#iName').value.trim();
      if(c.length!==4){PL.status='Room codes have 4 characters.';pRender();return;}if(!n){$('#iName').focus();return;}
      PL.code=c;PL.name=n.slice(0,30);store.set('pname',PL.name);store.set('proom',PL.code);PL.joined=true;if(PL.conn&&PL.conn.open&&PL.connCode===c){PL.conn.send({t:'hi',id:PL.id,name:PL.name});pRender();}else pConnect();};
    if(PL.code&&!PL.name)setTimeout(()=>$('#iName')&&$('#iName').focus(),50);
    return;
  }
  if(!s){body.innerHTML=`<div class="pcenter"><h2 class="pul">…</h2><p>${esc(PL.status||'Connecting…')}</p></div>`;return;}
  if(s.view==='kicked'){body.innerHTML=`<div class="pcenter"><h2>${s.why==='closed'?'Room closed':'Removed'}</h2><p>${s.why==='closed'?'The host started a new room. Scan the new code to join again.':'The host removed you from this room.'}</p></div>`;return;}
  PL.key=s.view+'|'+s.g+'|'+(s.s?s.s.k:'');
  if(s.view==='play'){
    const g=gameById(s.g);if(!g){body.innerHTML=`<div class="pcenter"><h2>Update</h2><p>Reload this page to get the newest version of the games.</p></div>`;return;}
    try{g.player(body,s.s,papi);}catch(e){console.error(e);body.innerHTML=`<div class="pcenter"><h2>Hmm</h2><p>${esc(e.message)}</p></div>`;}
    if(PL.status)body.insertAdjacentHTML('beforeend',`<p class="pst pfix">${esc(PL.status)}</p>`);
    return;
  }
  body.innerHTML=`<div class="pcenter dots idle"><div class="idlefig">${shape(0,64,'var(--ink)','var(--red)')}${shape(1,64,'var(--ink)','var(--blue)')}${shape(2,64,'var(--ink)','var(--yel)')}</div>
    <h2>${s.g?'Next up':'You’re in'}</h2>${s.g?`<p class="nextg">${esc(s.gname)}</p>`:''}
    <p>${s.g?'The game starts in a moment.':`Look for <b>${esc(s.name)}</b> on the big screen. The next game starts soon.`}</p>
    ${s.total?`<p class="lab">Room total · ${s.total} pts · ${ordinal(s.rank)} of ${s.of}</p>`:''}${PL.status?`<p class="pst">${esc(PL.status)}</p>`:''}</div>`;
}
const NB_ICON='<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="3" y="2" width="16" height="18" fill="var(--yel)" stroke="var(--ink)" stroke-width="2"/><path d="M7 2v18M10 7h6M10 11h6M10 15h4" stroke="var(--ink)" stroke-width="2"/></svg>';
const NB_KINDS=[['brief','Briefs & styles','◆'],['rules','Rules you wrote','✎'],['pick','Picks you kept','●'],['card','Cards you were dealt','▲'],['team','Teams & chains','■'],['finish','Results','★'],['star','Milestones','★']];
function openNotebook(){
  let ov=$('#nb');if(!ov){ov=el('div','nb');ov.id='nb';ov.setAttribute('role','dialog');document.body.appendChild(ov);}
  const L=(PL.log||[]).slice().reverse(),s=PL.st||{};
  const sec=([k,label,ic])=>{const items=L.filter(e=>e.kind===k||(k==='finish'&&e.kind==='finish'));if(!items.length)return '';
    return `<section class="nbsec"><h3><i>${ic}</i>${esc(label)}<em>${items.length}</em></h3>${items.map(e=>`<article><span class="lab">${esc(e.game||'')}${e.at?' · '+new Date(e.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):''}</span>${e.title?`<b>${esc(e.title)}</b>`:''}<p>${esc(e.text||'').replace(/\n/g,'<br>')}</p></article>`).join('')}</section>`;};
  const body=NB_KINDS.filter(k=>k[0]!=='star').map(sec).join('')+sec(NB_KINDS.find(k=>k[0]==='star'));
  ov.innerHTML=`<div class="nbpanel"><header><div><span class="lab">This session</span><h2>Your notebook</h2></div><button class="ghost" id="nbX">Close</button></header>
    <div class="nbstats"><div><b>${s.total||0}</b><span>points</span></div><div><b>${s.rank?ordinal(s.rank):'—'}</b><span>in the room</span></div><div><b>${L.length}</b><span>entries</span></div></div>
    <div class="nbbody">${body||'<p class="nbempty">Nothing yet. Your briefs, rules, kept picks and milestones collect here as the lesson goes on.</p>'}</div></div>`;
  $('#nbX').onclick=()=>ov.remove();ov.onclick=e=>{if(e.target===ov)ov.remove();};
}
function pFrame(){
  const c=PL.clock;if(c){const left=Math.max(0,c.end-now());$$('.pclk').forEach(e=>e.textContent=fmtClock(left));$$('.pclkbar i').forEach(e=>e.style.width=(100*left/c.T)+'%');}
  const t=PL.timer;if(t){const left=Math.max(0,t.end-now()),b=$('#pBar'),l=$('#pLeft');if(b)b.style.width=(100*left/t.T)+'%';if(l)l.textContent=Math.ceil(left/1000)+' s';}
  const s=PL.st;if(s&&s.view==='play'){const g=gameById(s.g);if(g&&g.pframe)try{g.pframe($('#pbody'),s.s);}catch(e){}}
}

/* ---------- boot ---------- */
function boot(){
  document.addEventListener('keydown',e=>{
    if(ROLE!=='host'||G.splash||e.target.closest('input,textarea,select'))return;
    if(e.key==='Escape'){const o=$('#qrbig');if(o)o.remove();return;}
    if((e.key==='q'||e.key==='Q')&&G.code){const o=$('#qrbig');o?o.remove():showBigQR(G.code);return;}
    if(e.key===' '||e.key==='ArrowRight'||(e.key==='Enter'&&e.target.tagName!=='BUTTON')){
      if(G.view==='setup'){e.preventDefault();startGame(G.game);}
      else if(G.view==='play'&&G.game&&G.game.next){e.preventDefault();G.game.next();}
    }
  });
  if(ROLE==='host'){
    const s=store.get('room',null);
    if(s&&Date.now()-s.t<12*3600e3){s.players.forEach((p,k)=>G.players.set(p.id,{...blankP(),...p,sh:p.sh??k%4,conn:null}));G.banned=new Set(s.banned||[]);}
    render();
    if(typeof songReady==='function')songReady().catch(()=>{});
    attLoad();
    openRoom(s&&Date.now()-s.t<12*3600e3?s.code:null).then(async ok=>{if(!ok&&s){try{G.peer&&G.peer.destroy();}catch(e){}await openRoom();}render();});
    addEventListener('beforeunload',e=>{if(G.view==='play'){e.preventDefault();e.returnValue='';}});
  }else{
    const u=QS.get('room');PL.code=(u||store.get('proom','')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);
    if(u&&PL.name&&store.get('proom','')===PL.code){PL.joined=true;pConnect();}
    else if(u&&PL.code.length===4)pConnect(); // connect first, so the class list can arrive before the student picks a name
    pRender();
  }
  requestAnimationFrame(frame);
}
