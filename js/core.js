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
// outside scripts are pinned AND checked: a changed file on the CDN is refused (checksums from cdnjs, verified 2026-10-22)
const SRI={'peerjs/1.5.4/peerjs.min.js':'sha512-iFU+yF1keEaLDC9HEwPfLMSRaS0unBHE14GEgx6pQKJXjp5v0tvX8xpfp2lgJ62XEjbYp/M5C3CAmej/PWXMyA==','qrcodejs/1.0.0/qrcode.min.js':'sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA=='};
function loadScript(src){return new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=src;sc.async=true;const k=Object.keys(SRI).find(x=>src.endsWith(x));if(k){sc.integrity=SRI[k];sc.crossOrigin='anonymous';}sc.onload=res;sc.onerror=()=>rej(new Error('Could not load '+src));document.head.appendChild(sc);});}
/* relay passwords (TURN) from the owner's Cloudflare Worker (integrations/turn): devices still connect directly when the network
   allows it, and through Cloudflare's relay on port 443 when a school network blocks device-to-device traffic. Cached 20 h.
   For now EVERY connection goes through the relay (school networks block the direct route); ?direct in the address tries direct first. */
const TURN_URL='https://controlroom-turn.gunnitynes.workers.dev';let ICE=null;
async function iceReady(){if(ICE)return ICE;const c=store.get('ice',null);if(c&&Date.now()-c.at<20*3600e3&&c.s&&c.s.length){ICE=c.s;return ICE;}
  for(let k=0;k<3&&!ICE;k++){try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),8000);const j=await (await fetch(TURN_URL,{signal:ctl.signal,cache:'no-store'})).json();clearTimeout(t);
    if(j.iceServers&&j.iceServers.length){ICE=j.iceServers;store.set('ice',{at:Date.now(),s:ICE});}}catch(e){await new Promise(r=>setTimeout(r,800));}}
  return ICE||[];}
const peerCfg=()=>({debug:0,config:{iceServers:ICE&&ICE.length?ICE:[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],...(!QS.has('direct')&&ICE&&ICE.length?{iceTransportPolicy:'relay'}:{})}});   // relay-only needs relay passwords: without them, try anything
async function needPeer(){if(!window.Peer)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js');await iceReady();}
async function needQR(){if(!window.QRCode)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js');}
const CODE_ABC='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode=()=>[...Array(4)].map(()=>CODE_ABC[Math.floor(Math.random()*CODE_ABC.length)]).join('');
const peerId=c=>'controlroom-v1-'+c.toLowerCase();
const joinURL=code=>location.origin+location.pathname+'?room='+code;
function drawQR(box,code,size){if(!box)return;needQR().then(()=>{box.innerHTML='';new QRCode(box,{text:joinURL(code),width:size,height:size,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}).catch(()=>{box.textContent=code;});}
/* a Bauhaus QR: the same scannable code (error correction H, 30 %), drawn as circles and squares in ink and blue,
   red/blue/ink finder eyes, a yellow sun behind (light, so it reads as background) and a little room badge in the middle */
function qrMatrix(text){const d=document.createElement('div');const q=new QRCode(d,{text,width:64,height:64,correctLevel:QRCode.CorrectLevel.H});const m=q._oQRCode,n=m.getModuleCount(),M=[];
  for(let r=0;r<n;r++){const row=[];for(let c=0;c<n;c++)row.push(m.isDark(r,c));M.push(row);}return M;}
function artQR(text,label=''){const M=qrMatrix(text),n=M.length,Q=4,W=n+Q*2,inF=(r,c)=>(r<7&&c<7)||(r<7&&c>=n-7)||(r>=n-7&&c<7);
  const mid=(n-1)/2,hole=Math.max(2,Math.round(n*.11)),inHole=(r,c)=>Math.abs(r-mid)<=hole&&Math.abs(c-mid)<=hole;
  const hash=(r,c)=>((r*73856093)^(c*19349663))>>>0;let dots='';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(!M[r][c]||inF(r,c)||inHole(r,c))continue;const h=hash(r,c),x=c+Q,y=r+Q,col=h%11===0?'var(--red)':h%5===0?'var(--blue)':'var(--ink)';
    dots+=h%4===0?`<rect x="${x+.06}" y="${y+.06}" width=".88" height=".88" fill="${col}"/>`:`<circle cx="${x+.5}" cy="${y+.5}" r=".47" fill="${col}"/>`;}
  const eye=(r,c,col)=>{const x=c+Q,y=r+Q;return `<rect x="${x}" y="${y}" width="7" height="7" fill="var(--ink)"/><rect x="${x+1}" y="${y+1}" width="5" height="5" fill="#fff"/><rect x="${x+2}" y="${y+2}" width="3" height="3" fill="${col}"/>`;};
  const cx=mid+Q+.5,bw=hole*2+1;
  return `<svg class="artqr" viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scan to join">
    <rect width="${W}" height="${W}" fill="#fff"/><circle cx="${W*.86}" cy="${W*.84}" r="${W*.3}" fill="var(--yel)" opacity=".55"/>
    ${dots}${eye(0,0,'var(--red)')}${eye(0,n-7,'var(--blue)')}${eye(n-7,0,'var(--ink)')}
    <rect x="${cx-bw/2}" y="${cx-bw/2}" width="${bw}" height="${bw}" fill="var(--yel)" stroke="var(--ink)" stroke-width=".5"/>
    <text x="${cx}" y="${cx+.1}" text-anchor="middle" dominant-baseline="middle" font-family="Archivo,Arial Narrow,sans-serif" font-weight="900" font-size="${bw*.42}" fill="var(--ink)">${esc(label)}</text></svg>`;}
function splashQR(){const box=$('#spqr');if(!box||!G.code)return;needQR().then(()=>{box.innerHTML=artQR(joinURL(G.code),G.code);const c=$('#spcode');if(c)c.textContent=G.code;}).catch(()=>{});}
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
const ROLE=QS.has('room')||QS.has('pair')||(matchMedia('(max-width:700px)').matches&&!QS.has('host'))?'player':'host';

/* ---------- registry ---------- */
const GROUPS=[
  {id:'brain',name:'Know your stuff',short:'Know',sub:'Fast answers on your phone, big points',col:'--blue'},
  {id:'ears',name:'Train your ears',short:'Ears',sub:'The room listens, the phones answer',col:'--red'},
  {id:'make',name:'Make something',sub:'Creative sprints, generators and party games',short:'Make',col:'--yel'},
];
const GAMES=[];
/* least-shown first: every question module remembers what this browser has already shown (localStorage seen.<deck>)
   and deals the least-shown items first, ties in random order, so nothing comes back until the rest have had their turn */
function seenOrder(deck,list,keyOf){const S=store.get('seen.'+deck,{});return shuffle(list).sort((a,b)=>(S[keyOf(a)]||0)-(S[keyOf(b)]||0));}
function seenMark(deck,items,keyOf){const S=store.get('seen.'+deck,{});items.forEach(x=>{const k=keyOf(x);S[k]=(S[k]||0)+1;});store.set('seen.'+deck,S);}
function game(g){g.col=g.col||(GROUPS.find(x=>x.id===g.group)||{}).col;GAMES.push(g);return g;}
const gameById=id=>GAMES.find(g=>g.id===id);
const ordered=()=>GROUPS.flatMap(gr=>GAMES.filter(g=>g.group===gr.id));
const numOf=g=>pad2(ordered().indexOf(g)+1);

/* =====================================================================
   HOST
   ===================================================================== */
const atRest=()=>G.view==='menu'||G.view==='home';   // the two screens between activities
const G={lobby:new Set(),splash:!QS.has('nosplash'),code:'',peer:null,status:'',players:new Map(),banned:new Set(),view:'home',game:null,gs:null,timers:[]};
function later(fn,ms){const t=setTimeout(fn,ms);G.timers.push(t);return t;}
function clearLater(){G.timers.forEach(clearTimeout);G.timers=[];}
const players=()=>[...G.players.values()];
const online=()=>players().filter(p=>p.conn&&p.conn.open);
const blankP=()=>({gp:0,total:0,streak:0,best:0,right:0,last:null});
function rankBy(key){const list=players().sort((a,b)=>(b[key]||0)-(a[key]||0)||a.name.localeCompare(b.name)),map=new Map();let last=null,rk=0;list.forEach((p,i)=>{if(p[key]!==last){rk=i+1;last=p[key];}map.set(p.id,rk);});return {list,map};}
function award(p,pts){pts=Math.round(pts);p.gp=(p.gp||0)+pts;p.total=(p.total||0)+pts;return pts;}
function saveRoom(){if(!G.code)return;store.set('room',{t:Date.now(),code:G.code,banned:[...G.banned],players:players().map(p=>({id:p.id,name:p.name,total:p.total,sh:p.sh,log:p.log||[],in:p.in||0}))});}
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
      G.code=code||newCode();const peer=new Peer(peerId(G.code),peerCfg());G.peer=peer;
      peer.on('open',()=>{G.status='';saveRoom();startLobby();if(!G.splash)render();else splashQR();res(true);});
      peer.on('error',e=>{
        if(e.type==='unavailable-id'&&left>0){peer.destroy();if(code)setTimeout(()=>tryOpen(left-1),1500);else tryOpen(left-1);return;}
        if(e.type==='peer-unavailable')return;
        G.status='Room problem: '+(e.type||e.message);render();res(false);});
      peer.on('disconnected',()=>{try{peer.reconnect();}catch(e){}});
      peer.on('connection',conn=>{
        conn.on('data',m=>{try{hostData(conn,m);}catch(e){console.error(e);}});
        conn.on('close',()=>{G.lobby.delete(conn);const p=players().find(x=>x.conn===conn);if(p){p.conn=null;if(p.hand){p.hand=0;handsUpdate();}lobbyNames();liveUpdate();if(G.view!=='play')render();}});
        conn.on('error',()=>{});
      });
    };
    tryOpen(code?8:4);
  });
}
async function newRoom(){
  if(!confirm(`Start a new room? Everyone has to scan the new code, and all points are reset.${players().length?'\n\nThe room’s attendance list starts over too: copy it first if you need it (⧉ Copy attendance).':''}`))return;
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
// another teacher's own sheet (pasted web app link, kept in this browser) wins over the built-in one
const attUrl=()=>store.get('att.url','')||(window.ATTENDANCE||{}).url||'';
const attOwn=()=>!!store.get('att.url','');
function attCall(fn,args,url=attUrl()){if(!url)return Promise.reject(new Error('No attendance sheet set'));
  return fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn,...args})})
    .catch(()=>{throw new Error('Can’t reach the attendance sheet (offline, or the script’s new version isn’t deployed yet)');})
    .then(r=>r.text()).then(t=>{let j;try{j=JSON.parse(t);}catch(e){throw new Error('The attendance sheet did not answer (is the new version deployed?)');}if(!j.ok)throw new Error(j.error||'Sheet error');return j;});}
function attLoad(){if(!attUrl())return;
  attCall('classes').then(j=>{ATT.classes=j.classes||[];ATT.err='';if(ATT.cls&&!ATT.classes.includes(ATT.cls))ATT.cls='';return attRoster();})
    .catch(e=>{ATT.classes=null;ATT.err=e.message;}).finally(()=>{if(atRest()&&!G.splash)render();});}
function attRoster(){const c=ATT.cls;if(!c){ATT.names=[];lobbyNames();return Promise.resolve();}
  return attCall('roster',{className:c}).then(j=>{if(ATT.cls!==c)return;ATT.names=(j.names||[]).map(n=>String(n).trim()).filter(Boolean);ATT.err='';lobbyNames();if(atRest())render();})
    .catch(e=>{ATT.err=e.message;if(atRest())render();});}
function attUse(url){if(url)store.set('att.url',url);else store.del('att.url');ATT.classes=null;ATT.cls='';ATT.names=[];ATT.err='';store.set('cls','');lobbyNames();render();attLoad();}
/* another teacher connects their own sheet: three steps and a paste box, checked before it is saved */
function openSheetSetup(){let ov=$('#sheetov');if(!ov){ov=el('div','sheetov');ov.id='sheetov';document.body.appendChild(ov);}
  const close=()=>ov.remove();
  ov.innerHTML=`<div class="sheetcard" role="dialog" aria-label="Connect your own Google Sheet"><button class="guideX" id="shX" aria-label="Close">✕</button>
    <span class="lab">Class list · attendance</span><h2>Your own<br><i>Google Sheet</i></h2>
    <p class="shlead">Your students tap their names on their phones and are checked in on <b>your</b> sheet. Set it up once, about five minutes.</p>
    <ol class="shsteps">
      <li><b>1</b><div><strong>Make the sheet</strong><p>One tab per class (the tab name is the class), student names in column A from row 2. A <em>MasterLog</em> tab is added for you.</p>
        <div class="shmini"><span>Student name</span><span>Ada</span><span>Alan</span><span>Grace</span><i>CLASS-A</i><i>CLASS-B</i><i>MasterLog</i></div></div></li>
      <li><b>2</b><div><strong>Add the script</strong><p>Apps Script is a small code editor built into Google Sheets. You only paste, nothing to write.</p>
        <ol class="shsub">
          <li>Open your sheet in the browser, signed in with the Google account that owns it.</li>
          <li>In the sheet’s top menu choose <kbd>Extensions</kbd> ▸ <kbd>Apps Script</kbd>. A new tab opens with a file called <em>Code.gs</em>.</li>
          <li>Click in the code, select everything (<kbd>⌘A</kbd> on a Mac, <kbd>Ctrl A</kbd> on Windows) and delete it.</li>
          <li>Press the button below, go back to the editor and paste (<kbd>⌘V</kbd> / <kbd>Ctrl V</kbd>).</li>
          <li>Save: the disk icon <kbd>💾</kbd> or <kbd>⌘S</kbd>. If it asks for a project name, type <em>Control Room</em>.</li>
        </ol>
        <button class="big go" id="shCopy">Copy the script</button></div></li>
      <li><b>3</b><div><strong>Deploy it</strong><p>This turns the script into a private link that only Control Room uses.</p>
        <ol class="shsub">
          <li>Top right of the editor: the blue <kbd>Deploy</kbd> button ▸ <kbd>New deployment</kbd>.</li>
          <li>Next to “Select type” click the gear <kbd>⚙</kbd> ▸ <kbd>Web app</kbd>.</li>
          <li>Description: anything (<em>Control Room</em>). <b>Execute as: Me</b>. <b>Who has access: Anyone</b> (not “Anyone with a Google account”).</li>
          <li>Click <kbd>Deploy</kbd>, then <kbd>Authorize access</kbd> and pick your account.</li>
          <li>If Google says <em>“Google hasn’t verified this app”</em>: click <kbd>Advanced</kbd> ▸ <kbd>Go to Control Room (unsafe)</kbd> ▸ <kbd>Allow</kbd>. It is your own script and only works on this sheet.</li>
          <li>Copy the <b>Web app URL</b> (the long link that ends in <em>/exec</em>) with its <kbd>Copy</kbd> button.</li>
        </ol>
        <p class="shtip">Test it: open that link in a new tab. You should see your class names listed, like <code>{"ok":true,"classes":["CLASS-A"]}</code>.</p></div></li>
      <li><b>4</b><div><strong>Paste the link</strong><input id="shUrl" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(store.get('att.url',''))}" spellcheck="false" autocomplete="off">
        <div class="frow"><button class="big go" id="shGo">Connect</button>${attOwn()?'<button class="ghost" id="shCopyUrl">⧉ Copy link</button><button class="ghost" id="shOff">Disconnect</button>':''}</div><p class="shst" id="shSt"></p></div></li>
    </ol>
    <details class="shhelp"><summary>Something not working?</summary><ul>
      <li><b>“Can’t reach the attendance sheet”</b>: in step 3, “Who has access” must be <b>Anyone</b>. Make sure you copied the Web app URL ending in <em>/exec</em>, not the editor’s address.</li>
      <li><b>No classes show up</b>: each class needs its own tab, with the names in column A from row 2. The MasterLog tab is not a class.</li>
      <li><b>“Anyone” isn’t offered</b>: some school Google accounts block it. Use a personal Google account for the sheet.</li>
      <li><b>You changed the script later</b>: <kbd>Deploy</kbd> ▸ <kbd>Manage deployments</kbd> ▸ the pencil <kbd>✎</kbd> ▸ Version: <kbd>New version</kbd> ▸ <kbd>Deploy</kbd>. The link stays the same. (A “New deployment” makes a new link that you would have to paste again.)</li>
      <li><b>Optional</b>: in the editor, pick <em>setup</em> in the menu next to <kbd>▶ Run</kbd> and run it once to make the MasterLog and an example class tab.</li>
    </ul></details>
    <p class="fine">The link is saved in this browser only. Names go from your sheet to this computer and the phones in the room, nowhere else.</p></div>`;
  ov.onclick=e=>{if(e.target===ov)close();};$('#shX').onclick=close;
  const st=(t,bad)=>{const e=$('#shSt');e.textContent=t;e.classList.toggle('bad',!!bad);};
  $('#shCopy').onclick=()=>fetch('integrations/attendance/ControlRoomAttendance.gs').then(r=>{if(!r.ok)throw 0;return r.text();})
    .then(t=>navigator.clipboard.writeText(t)).then(()=>{$('#shCopy').textContent='Copied ✓';toast('Script copied: paste it into Apps Script');})
    .catch(()=>{window.open('integrations/attendance/ControlRoomAttendance.gs','_blank');toast('Copy the script from the page that opened');});
  if($('#shOff'))$('#shOff').onclick=()=>{attUse('');close();toast('Disconnected');};
  if($('#shCopyUrl'))$('#shCopyUrl').onclick=()=>copyText(store.get('att.url',''),'Sheet link copied. Keep it private: paste it only into Control Room.');
  $('#shGo').onclick=()=>{const u=$('#shUrl').value.trim();
    if(/docs\.google\.com\/spreadsheets/.test(u))return st('That is the sheet itself. Paste the Web app URL from step 3 instead (it starts with script.google.com and ends in /exec).',true);
    if(!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(u))return st('Paste the Web app URL from step 3 (it starts with https://script.google.com/).',true);
    st('Checking your sheet…');$('#shGo').disabled=true;
    attCall('classes',{},u).then(j=>{const n=(j.classes||[]).length;st(`Connected: ${n} class${n===1?'':'es'} found.`);attUse(u);setTimeout(close,1200);toast('Your sheet is connected');})
      .catch(e=>st(e.message+'. Check step 3: Execute as Me, access Anyone, then copy the URL again.',true)).finally(()=>{const b=$('#shGo');if(b)b.disabled=false;});};
  setTimeout(()=>$('#shUrl')&&$('#shUrl').focus(),50);}
function attSetClass(c){ATT.cls=c;store.set('cls',c);ATT.names=[];lobbyNames();render();attRoster();}
const attMatch=n=>{const k=String(n||'').trim().toLowerCase();return ATT.names.find(x=>x.toLowerCase()===k)||null;};
const attCount=()=>Object.keys(ATT_DONE).filter(k=>k.startsWith(attDay()+'|'+ATT.cls+'|')).length;
function attCheckIn(p){if(!ATT.cls||!attMatch(p.name))return;const k=attDay()+'|'+ATT.cls+'|'+p.name;if(ATT_DONE[k]){p.att='in';return;}
  if(p.att==='…')return;p.att='…';let tries=0;
  const go=()=>attCall('checkIn',{className:ATT.cls,name:p.name}).then(j=>{ATT_DONE[k]=j.result;store.set('attDone',ATT_DONE);p.att='in';if(atRest())render();})
    .catch(e=>{if(++tries<4)setTimeout(go,3000*tries);else{p.att='fail';console.warn('attendance',p.name,e.message);if(atRest())render();}});
  go();}
// phones that are connected but haven't picked a name yet
function namesMsg(){return {t:'names',cls:ATT.cls,names:ATT.cls?ATT.names.map(n=>({n,here:players().some(p=>p.name===n&&p.conn&&p.conn.open)})):[]};}
function lobbyNames(){G.lobby.forEach(c=>{if(c.open)try{c.send(namesMsg());}catch(e){}});}
/* ---------- CADCAST pairing ----------
   A student's computer opens gunnitynes.github.io/CADCAST/go and shows a QR; their phone (already in this room)
   scans it and asks the host here to vouch for it. The host tells the computer its name and where the patch bay is,
   and lists it as allowed for the CADCAST patch bay (same site, so it reads controlroom.cadcast.allow). */
const CADCAST_BC=window.BroadcastChannel?new BroadcastChannel('cadcast'):null;
const cadcastDesk=()=>'cadcast-desk-'+G.code.toLowerCase();
function cadcastPair(conn,m){
  const p=G.players.get(String(m.id||'').slice(0,40)),pc=String(m.pc||'').replace(/[^a-z0-9]/gi,'').slice(0,24);
  const reply=o=>{try{conn.send({t:'paired',...o});}catch(e){}};
  if(!pc)return reply({ok:false,why:'That code is not a CADCAST computer.'});
  if(!p)return reply({ok:false,why:'Your phone is not in this room yet. Scan the big screen and pick your name first.'});
  const allow=store.get('cadcast.allow',{});allow[pc]={name:p.name,pid:p.id,at:Date.now()};
  for(const k in allow)if(Date.now()-allow[k].at>12*3600e3)delete allow[k];
  store.set('cadcast.allow',allow);if(CADCAST_BC)CADCAST_BC.postMessage({t:'allow',pc,name:p.name});
  let told=false;const tell=()=>{const c=G.peer.connect('cadcast-pc-'+pc,{serialization:'json',reliable:true});
    c.on('open',()=>{told=true;c.send({t:'paired',name:p.name,desk:cadcastDesk()});setTimeout(()=>{try{c.close();}catch(e){}},4000);});c.on('error',()=>{});};
  tell();setTimeout(()=>{if(!told)tell();},3000);
  reply({ok:true,name:p.name});toast(p.name+'’s computer is paired with CADCAST');
  if(G.view==='play'&&G.game&&G.game.onPair)setTimeout(()=>{try{G.game.onPair(p);}catch(e){}},1500);
}
// the student's paired computer (the most recent pairing) and a lasting connection to it, for sending missions and files
function pcFor(p){const a=store.get('cadcast.allow',{});let best=null;for(const [pc,v] of Object.entries(a))if(v.pid===p.id&&(!best||v.at>best.at))best={pc,at:v.at};return best?best.pc:null;}
const PCC=new Map();
function pcSend(p,msg){const pc=pcFor(p);if(!pc||!G.peer||G.peer.destroyed)return false;let e=PCC.get(pc);
  if(!e||e.dead){const conn=G.peer.connect('cadcast-pc-'+pc,{serialization:'json',reliable:true});e={conn,q:[],dead:false};PCC.set(pc,e);
    conn.on('open',()=>{e.q.forEach(m=>{try{conn.send(m);}catch(x){}});e.q=[];});conn.on('close',()=>{e.dead=true;});conn.on('error',()=>{e.dead=true;});
    conn.on('data',m=>pcData(pc,m));}
  if(e.conn.open){try{e.conn.send(msg);}catch(x){e.q.push(msg);}}else e.q.push(msg);return true;}
/* files over the same connection, both ways: base64 chunks small enough for a data channel ({t:'file', fid, i, n, meta, data}),
   sent no faster than the channel drains. The computer (CADCAST/go) speaks the same format. */
const B64=u8=>{let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s);};
const UNB64=t=>{const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;};
async function pcSendFile(p,meta,blob,onProg){const u8=new Uint8Array(await blob.arrayBuffer()),CH=48000,n=Math.max(1,Math.ceil(u8.length/CH)),fid=Math.random().toString(36).slice(2,10);
  for(let i=0;i<n;i++){const pc=pcFor(p),e=pc&&PCC.get(pc);
    for(let k=0;e&&e.conn.dataChannel&&e.conn.dataChannel.bufferedAmount>1.5e6&&k<600;k++)await new Promise(r=>setTimeout(r,50));
    if(!pcSend(p,{t:'file',fid,i,n,meta:i?null:{...meta,size:u8.length,mime:blob.type},data:B64(u8.subarray(i*CH,(i+1)*CH))}))return false;if(onProg)onProg((i+1)/n);}
  return true;}
const PCF=new Map();
function pcData(pc,m){if(!m||typeof m!=='object')return;const a=store.get('cadcast.allow',{})[pc],p=a&&G.players.get(a.pid);if(!p)return;
  if(m.t==='file'){if(!(Number.isInteger(m.n)&&m.n>0&&m.n<=8000&&Number.isInteger(m.i)&&m.i>=0&&m.i<m.n&&typeof m.data==='string'&&m.data.length<70000))return;   // ≤ ~380 MB, sane chunks
    let f=PCF.get(m.fid);if(!f){if(PCF.size>=24)return;PCF.set(m.fid,f={parts:[],got:0,n:m.n,meta:null});}if(m.meta)f.meta=m.meta;
    if(!f.parts[m.i]){f.parts[m.i]=UNB64(m.data);f.got++;}
    if(G.view==='play'&&G.game&&G.game.onPcProg)G.game.onPcProg(p,f.got/f.n,f.meta);
    if(f.got===f.n&&f.meta){PCF.delete(m.fid);const b=new Blob(f.parts,{type:f.meta.mime||''});if(G.view==='play'&&G.game&&G.game.onPcFile)G.game.onPcFile(p,f.meta,b);}
    return;}
  if(G.view==='play'&&G.game&&G.game.onPcMsg)G.game.onPcMsg(p,m);}
/* ---------- the class lobby: a relay address named after the TEACHER (controlroom-lobby-<name>) that tells any device
   which room that teacher has open right now. Student computers (CADCAST/go?t=<name>) ask it, so two teachers teaching
   at the same time never meet. The host asks the teacher's name once; a phone gets it from the QR (&t=). */
const teacherKey=n=>String(n||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').slice(0,40);
// copy to the clipboard (with a fallback for browsers that refuse navigator.clipboard)
/* the screensaver: the Catalyst logo on black (click flips to white, remembered), full screen; Esc (or leaving full screen) brings Control Room back.
   The room keeps running underneath: phones stay connected. */
function openSaver(){if($('#saver'))return;const o=el('div','saver');o.id='saver';o.innerHTML='<i class="saverlogo" role="img" aria-label="Catalyst"></i><p class="saverhint">Click to switch black / white · Esc to come back</p>';
  if(store.get('saver.light',false))o.classList.add('light');o.onclick=()=>{store.set('saver.light',o.classList.toggle('light'));};document.body.appendChild(o);
  const fs=document.documentElement.requestFullscreen;if(fs&&!document.fullscreenElement)document.documentElement.requestFullscreen().then(()=>{o.dataset.fs='1';}).catch(()=>{});}
function closeSaver(){const o=$('#saver');if(!o)return;o.remove();if(document.fullscreenElement&&o.dataset.fs)document.exitFullscreen().catch(()=>{});}
document.addEventListener('fullscreenchange',()=>{const o=$('#saver');if(o&&o.dataset.fs&&!document.fullscreenElement)closeSaver();});   // Esc in full screen is taken by the browser
function copyText(t,done){const ok=()=>{toast(done||'Copied');};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,()=>fb());else fb();
  function fb(){const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();try{document.execCommand('copy');ok();}catch(e){prompt('Copy this link:',t);}a.remove();}}
const teacherName=()=>store.get('teacher','');
const lobbyId=()=>{const k=teacherKey(ROLE==='host'?teacherName():QS.get('t'));return k?'controlroom-lobby-'+k:'';};
const goURL=()=>new URL('../CADCAST/go/?t='+encodeURIComponent(teacherName()).replace(/%20/g,'+'),location.href).href.replace(/^http:\/\/localhost:\d+\//,'https://gunnitynes.github.io/');
/* the teacher link: Control Room set up as this teacher on any computer (name + their sheet link). The settings ride after
   the # (never sent to a server) and are wiped from the address bar as soon as they're applied. Private: it holds the sheet link. */
const teacherLink=()=>{const sh=store.get('att.url','');return new URL('./?host',location.href).href.replace(/^http:\/\/localhost:\d+\//,'https://gunnitynes.github.io/Control-Room/')
  +'#teacher='+encodeURIComponent(teacherName())+(sh?'&sheet='+encodeURIComponent(sh):'');};
function applyTeacherLink(){const h=new URLSearchParams(location.hash.slice(1)),t=h.get('teacher');if(t==null)return;
  const n=t.replace(/\s+/g,' ').trim().slice(0,40),sh=h.get('sheet')||'';if(teacherKey(n))store.set('teacher',n);
  if(/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(sh))store.set('att.url',sh);
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  setTimeout(()=>toast(`Set up as ${n}${sh?' with your Google Sheet':''}`),600);}
function setTeacher(n){n=String(n||'').replace(/\s+/g,' ').trim().slice(0,40);if(!teacherKey(n))return false;store.set('teacher',n);
  if(G.lobbyPeer)try{G.lobbyPeer.destroy();}catch(e){}G.lobbyPeer=null;G.lobbyErr=false;startLobby();render();return true;}
/* asked once when Control Room opens on a computer, changeable in the room panel */
function askTeacher(){if($('#teachov'))return;const ov=el('div','sheetov');ov.id='teachov';document.body.appendChild(ov);
  ov.innerHTML=`<form class="sheetcard teachcard" id="teachForm"><span class="lab">Welcome</span><h2>Who’s<br><i>teaching?</i></h2>
    <p class="shlead">Student computers find <b>your</b> class by your name, so several teachers can run Control Room at the same time.</p>
    <input id="teachIn" maxlength="40" placeholder="Your name" value="${esc(teacherName())}" autocomplete="name">
    <p class="fine">If a colleague has the same first name, add your last name.</p>
    <div class="frow"><button class="big go" type="submit">That’s me</button></div></form>`;
  const f=$('#teachForm');setTimeout(()=>$('#teachIn').focus(),50);
  f.onsubmit=e=>{e.preventDefault();if(setTeacher($('#teachIn').value))ov.remove();else $('#teachIn').focus();};}
// the CADCAST patch bay must run in this same browser: it reads the room code and the paired computers from localStorage
function openMixer(){const w=window.open(new URL('../CADCAST/patch/',location.href).href,'cadcast-patch');if(w)try{w.focus();}catch(e){}else toast('Allow pop-ups for this page to open the mixer');}
function startLobby(){const id=lobbyId();if(!id||!window.Peer||(G.lobbyPeer&&!G.lobbyPeer.destroyed))return;
  const lp=new Peer(id,peerCfg());G.lobbyPeer=lp;
  lp.on('open',()=>{if(G.lobbyErr){G.lobbyErr=false;if(atRest())render();}});
  lp.on('connection',c=>{c.on('data',m=>{if(m&&m.t==='room?')try{c.send({t:'room',code:G.code});}catch(e){}});c.on('error',()=>{});});
  lp.on('error',e=>{if(e.type==='unavailable-id'){if(!G.lobbyErr){G.lobbyErr=true;if(atRest())render();}}if(e.type==='unavailable-id')setTimeout(()=>{if(G.lobbyPeer===lp){lp.destroy();G.lobbyPeer=null;startLobby();}},20000);});   // another host tab holds it
  lp.on('disconnected',()=>{setTimeout(()=>{if(!lp.destroyed)try{lp.reconnect();}catch(e){}},1500);});}
async function lobbyRoom(){const id=lobbyId();if(!id)return null;try{await needPeer();}catch(e){return null;}
  return new Promise(res=>{const p=new Peer(peerCfg());let done=false;const fin=v=>{if(done)return;done=true;res(v);setTimeout(()=>{try{p.destroy();}catch(e){}},500);};
    setTimeout(()=>fin(null),9000);p.on('error',e=>{if(e.type==='peer-unavailable')fin(null);});
    p.on('open',()=>{const c=p.connect(id,{serialization:'json',reliable:true});c.on('open',()=>c.send({t:'room?'}));c.on('data',m=>{if(m&&m.t==='room'&&m.code)fin(String(m.code).toUpperCase());});});});}
function copyAttendance(){const L=players().slice().sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));if(!L.length){toast('Nobody has joined yet');return;}
  const d=new Date(),t=x=>x?new Date(x).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'';
  const head=`Attendance · ${ATT.cls||'Room '+G.code} · ${d.toLocaleDateString([], {weekday:'short',day:'numeric',month:'short',year:'numeric'})} · ${L.length} student${L.length===1?'':'s'}`;
  copyText(head+'\n\n'+L.map(p=>p.name+'\t'+t(p.in)).join('\n'),`${L.length} name${L.length===1?'':'s'} copied: paste into a document or spreadsheet`);}
function resetPoints(){if(!confirm('Reset everyone’s total points to zero?'))return;players().forEach(p=>{p.total=0;p.gp=0;});saveRoom();render();syncAll();}
function uniqueName(name,id,max=30){
  name=String(name||'').replace(/\s+/g,' ').trim().slice(0,max)||'Student';let n=name,k=2;
  const taken=s=>players().some(p=>p.id!==id&&p.name.toLowerCase()===s.toLowerCase());
  while(taken(n))n=name+' '+(k++);return n;
}
function hostData(conn,m){
  if(!m||typeof m!=='object')return;
  if(m.t==='ping'){try{conn.send({t:'pong'});}catch(e){}return;}
  if(m.t==='who'){G.lobby.add(conn);try{conn.send(namesMsg());}catch(e){}return;}
  if(m.t==='pair'){cadcastPair(conn,m);return;}
  if(m.t==='hand'){const p=players().find(x=>x.conn===conn);if(p)setHand(p,!!m.up);return;}
  if(m.t==='vote'){const p=players().find(x=>x.conn===conn);if(p&&G.view==='vote'&&V)voteAct(p,m);return;}
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
    else{p={id,name:listed||uniqueName(m.name,id),sh:G.players.size%4,conn,...blankP(),in:Date.now()};G.players.set(id,p);if(G.view!=='play')sfx.join();}
    attCheckIn(p);lobbyNames();
    sync(p);sendLog(p);saveRoom();tmrJoin(p);
    if(G.view==='play'){G.game.onJoin&&G.game.onJoin(p);liveUpdate();}else if(G.view==='vote'){voteLive();syncAll();}else if(G.view==='pick'){pickLive();sync(p);}else render();
    return;
  }
  if(m.t==='act'){const p=players().find(x=>x.conn===conn);if(!p||G.view!=='play'||!G.game||m.g!==G.game.id)return;G.game.act(p,m.d||{});}
}
function stateFor(p){
  const rk=rankBy('total').map,g=G.game&&!atRest()?G.game:null;
  const m={t:'st',name:p.name,total:p.total||0,rank:rk.get(p.id)||0,of:G.players.size,view:G.view==='play'?'play':G.view==='vote'&&V?'vote':G.view==='pick'&&PK?'pick':'menu',g:g&&G.view!=='vote'&&G.view!=='pick'?g.id:null,gname:g?g.name:''};
  if(G.view==='vote'&&V)m.s=voteState(p);
  else if(G.view==='pick'&&PK)m.s=pickState(p);
  else if(G.view==='play'){try{m.s=G.game.pstate(p);}catch(e){console.error(e);m.s={k:'err'};}}
  return m;
}
function sync(p){if(p.conn&&p.conn.open)try{p.conn.send(stateFor(p));}catch(e){}}
function syncAll(){G.players.forEach(sync);}
function kick(id){const p=G.players.get(id);if(!p)return;G.banned.add(id);if(p.conn)try{p.conn.send({t:'kick'});}catch(e){}G.players.delete(id);saveRoom();render();}
/* ---------- raise your hand: a phone-only button; the host shows it in the header and on the name chips ---------- */
const HAND_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 12.5V6a1.5 1.5 0 0 1 3 0v5.5M10.5 11V4.2a1.5 1.5 0 0 1 3 0V11M13.5 11V5.2a1.5 1.5 0 0 1 3 0V12M16.5 12V8.4a1.5 1.5 0 0 1 3 0v5.4c0 4.4-3 7.7-7.2 7.7-2.9 0-4.7-1.4-6.1-3.7L3.6 14a1.6 1.6 0 0 1 2.6-1.8l1.3 1.6" fill="currentColor" fill-opacity=".25" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const handsUp=()=>players().filter(p=>p.hand).sort((a,b)=>a.hand-b.hand);
function handsHTML(){const H=handsUp();if(!H.length)return '';
  const label=`${esc(H[0].name.split(' ')[0])}${H.length>1?` <em>+${H.length-1}</em>`:''}`;
  return `<button class="handbtn" id="bHands" aria-expanded="${!!G.handsOpen}" title="Raised hands, in order">${HAND_ICON}<b>${label}</b></button>${G.handsOpen?`<div class="handpop"><span class="lab">Hands up · first raised first</span>${H.map((p,i)=>`<button class="handrow c${p.sh}" data-lower="${esc(p.id)}" title="Lower this hand"><b>${i+1}</b>${shape(p.sh,16)}<span>${esc(p.name)}</span><em>${handAgo(p.hand)}</em><i>lower</i></button>`).join('')}<button class="ghost" id="bLowerAll">Lower all hands</button></div>`:''}`;}
const handAgo=t=>{const s=Math.round((Date.now()-t)/1000);return s<60?s+' s':Math.floor(s/60)+' min';};
function setHand(p,up){const was=!!p.hand;p.hand=up?(p.hand||Date.now()):0;if(up&&!was)(sfx.inn||sfx.vote||(()=>{}))();
  if(p.conn&&p.conn.open)try{p.conn.send({t:'hand',up:!!p.hand});}catch(e){}handsUpdate();}
// updates in place: a hand going up must never re-render a running game
function handsUpdate(){const h=$('#hands');if(!handsUp().length)G.handsOpen=false;if(h)h.innerHTML=handsHTML();
  $$('.mchip').forEach(b=>{const p=G.players.get(b.dataset.id);if(!p)return;b.classList.toggle('hand',!!p.hand);const i=b.querySelector('.mhand');if(p.hand&&!i)b.insertAdjacentHTML('beforeend',`<i class="mhand">${HAND_ICON}</i>`);if(!p.hand&&i)i.remove();});}
if(ROLE==='host'){document.addEventListener('click',e=>{const t=e.target.closest('#bHands,[data-lower],#bLowerAll');if(!t)return;e.stopPropagation();
  if(t.id==='bHands')G.handsOpen=!G.handsOpen;else if(t.id==='bLowerAll')handsUp().forEach(p=>setHand(p,false));else{const p=G.players.get(t.dataset.lower);if(p)setHand(p,false);}handsUpdate();},true);
  setInterval(()=>{if(G.handsOpen)handsUpdate();},15000);}
function liveUpdate(){
  const n=$('#nOn');if(n)n.textContent=online().length;
  if(G.view==='play'&&G.game&&G.game.live)G.game.live();
  if(G.view==='vote')voteLive();
  if(G.view==='pick')pickLive();
}

/* ---------- views ---------- */
function topBar(){
  const g=G.game,inG=!atRest()&&G.view!=='vote'&&G.view!=='pick'&&g;
  const mid=inG?`<div class="qno" style="--c:var(${g.col})"><b>${numOf(g)}</b><span>${esc((GROUPS.find(x=>x.id===g.group)||{}).short||'')}</span></div><div class="cat"><div><b>${esc(g.name)}</b><span id="tinfo">${esc(G.view==='play'&&g.topInfo?g.topInfo():g.tag)}</span></div></div>`
    :G.view==='vote'?`<div class="cat"><div><b>Room vote</b><span>the phones decide</span></div></div>`:G.view==='pick'?`<div class="cat"><div><b>The picker</b><span>one student, a group or teams</span></div></div>`:`<div class="tshapes" aria-hidden="true">${shape(0,34,'var(--ink)','var(--red)')}${shape(1,34,'var(--ink)','var(--blue)')}${shape(2,34,'var(--ink)','var(--yel)')}</div>`;
  const room=G.code&&G.view!=='home'?`<div class="mini"><button class="qr" id="miniQR" aria-label="Show the join QR large"></button>${!atRest()?`<div><b>${G.code}</b><span>join any time</span></div>`:''}</div>`:'';
  return `<header class="top">${logo()}<div class="tmid">${mid}<div class="count"><b id="nOn">${online().length}</b><span>students</span></div></div><div class="tright">${room}<button class="catlogo" id="bSaver" title="Screensaver: the Catalyst logo full screen (Esc to come back)" aria-label="Screensaver"></button><div id="hands">${handsHTML()}</div>
    ${G.view==='menu'?`<button class="ghost" id="bVote" title="Let the room vote: on the next module or on your own question">Vote</button><button class="ghost" id="bPick" title="Pick at random: one student, a group or teams">Pick</button>`:''}
    ${tmrBtnHTML()}
    <button class="ghost" id="bMix" title="CADCAST: hear the students’ computers and mix them">Mixer</button>
    <button class="ghost" id="bSfx" aria-pressed="${SFX.on}" title="Interface sound effects">SFX</button>
    <button class="ghost" id="bTheme" title="Paper or night (projector) look">Theme</button>
    ${G.view==='menu'?`<button class="ghost" id="bHome" title="The attendance screen: big join code and who is checked in">Attendance</button>`:G.view!=='home'?`<button class="ghost" id="bMenu">Menu</button>`:''}</div></header>`;
}
function render(){
  if(ROLE!=='host')return;
  document.body.classList.add('hostb');
  const app=$('#app');app.className='host';
  if(G.splash){rSplash(app);return;}
  app.innerHTML=topBar()+`<main class="stage" id="stage"></main>`;
  const st=$('#stage');
  try{if(G.view==='home')rHome(st);else if(G.view==='menu')rMenu(st);else if(G.view==='setup')rSetup(st);else if(G.view==='vote')rVote(st);else if(G.view==='pick')rPick(st);else G.game.render(st);}catch(e){console.error(e);st.innerHTML=`<div class="pcenter"><h2>Oops</h2><p>${esc(e.message)}</p></div>`;}
  $('#bSfx').onclick=e=>{SFX.on=!SFX.on;store.set('sfx.on',SFX.on);e.target.setAttribute('aria-pressed',SFX.on);if(SFX.on)sfx.inn();};
  $('#bTheme').onclick=()=>{toggleTheme();render();};
  if($('#bMenu'))$('#bMenu').onclick=()=>exitGame();if($('#bHome'))$('#bHome').onclick=()=>{G.view='home';render();syncAll();};
  tmrBind();if($('#bVote'))$('#bVote').onclick=openVoteChooser;if($('#bPick'))$('#bPick').onclick=openPicker;
  $('#bMix').onclick=openMixer;
  // the CONTROL ROOM wordmark is the home button
  const home=$('.top .logo');home.setAttribute('role','button');home.tabIndex=0;home.title='Main menu';
  home.onclick=()=>{if(G.view==='menu'){G.view='home';render();syncAll();}else if(G.view==='setup'){G.view='menu';render();syncAll();}else if(G.view==='play'||G.view==='vote'||G.view==='pick')exitGame();};home.onkeydown=e=>{if(e.key==='Enter')home.onclick();};
  const mq=$('#miniQR');if(mq){drawQR(mq,G.code,160);mq.onclick=()=>showBigQR(G.code);}
  const sv=$('#bSaver');if(sv)sv.onclick=openSaver;
}
/* splash: the original Control Room poster — faders breathing like a live mix,
   the four answer shapes orbiting — until the first click or key */
let POSTER=null;
function rSplash(app){
  app.className='splash';
  app.innerHTML=`<canvas id="poster"></canvas><div class="sptt"><div class="kick">Catalyst</div><h1>Control<br><i>Room</i></h1>
    <p>The big screen asks, the phones answer.</p><button class="big go" id="bEnter">Enter <small>click anywhere</small></button></div>

`;
  const c=$('#poster');POSTER={c,ctx:c.getContext('2d')};posterSize();
  const enter=()=>{if(!G.splash)return;G.splash=false;G.view='home';POSTER=null;removeEventListener('keydown',key);try{audio();}catch(e){}sfx.open();render();};
  // only while the splash is up, and never inside a text field (a splash drawn twice must not leave a Space-eating listener behind)
  const key=e=>{if(!G.splash){removeEventListener('keydown',key);return;}if(e.target.closest&&e.target.closest('input,textarea,select'))return;if(e.key===' '||e.key==='Enter'){e.preventDefault();enter();}};
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

function attBoxHTML(){return `<div class="attbox"><label><span class="lab">Class list</span><select id="selCls"><option value="">No list (students type names)</option>${attUrl()?(ATT.classes||(ATT.cls?[ATT.cls]:[])).map(c=>`<option ${c===ATT.cls?'selected':''}>${esc(c)}</option>`).join(''):''}<option disabled>──────────</option><option value="__own">${attOwn()?'⚙ Your Google Sheet: change link…':'＋ Connect your own Google Sheet…'}</option>${attOwn()?'<option value="__copy">⧉ Copy your sheet link</option><option value="__off">✕ Disconnect this sheet</option>':''}${attOwn()&&(window.ATTENDANCE||{}).url?'<option value="__def">↩ Back to the built-in list</option>':''}</select></label>
        <span class="fine">${!attUrl()?'Connect a Google Sheet to show your class on the phones':ATT.err?esc(ATT.err):!ATT.classes?'Loading classes…':ATT.cls?`${ATT.names.length} names on phones · <b>${attCount()}</b> checked in today`:'Pick a class: phones show its names and take attendance'}</span></div>`;}
function attBoxBind(st){  if($('#selCls',st))$('#selCls',st).onchange=e=>{const v=e.target.value;
    if(v==='__own'){e.target.value=ATT.cls;openSheetSetup();return;}
    if(v==='__copy'){e.target.value=ATT.cls;copyText(store.get('att.url',''),'Sheet link copied. Keep it private: paste it only into Control Room.');return;}
    if(v==='__off'){e.target.value=ATT.cls;if(confirm('Disconnect your Google Sheet in this browser? Students will type their names instead.'))attUse('');return;}
    if(v==='__def'){e.target.value=ATT.cls;if(confirm('Stop using your own sheet in this browser and go back to the built-in class list?'))attUse('');return;}
    attSetClass(v);};}

/* THE HOME SCREEN: attendance first (most teachers only take attendance). A big, clear join QR in the middle, the room
   code, the class list and who has checked in; Activities is one click away. */
function rHome(st){const ps=players(),inN=attUrl()&&ATT.cls?attCount():ps.length,on=online().length;
  st.innerHTML=`<div class="home">
    <section class="hatt"><span class="lab">Attendance${ATT.cls?' · '+esc(ATT.cls):''}</span>
      <div class="hqr" id="homeQR" aria-label="Scan to check in"></div>
      <div class="hcode"><span>Scan to check in</span><b>${G.code||'····'}</b><small>${esc(joinURL(G.code||'').replace(/^https?:\/\//,'').replace(/\?room=.*$/,''))} · code ${G.code||''}</small></div>
      <div class="hcount"><b>${inN}</b><span>${attUrl()&&ATT.cls?'checked in today':'in the room'}${on&&on!==inN?` · ${on} online`:''}</span></div></section>
    <aside class="hside">
      <div class="teachbox${G.lobbyErr?' clash':''}"><span class="lab">Teacher</span><div class="tbrow"><b>${esc(teacherName()||'—')}</b><button class="ghost" id="bTeach">${teacherName()?'Not you?':'Set your name'}</button></div>
        ${G.lobbyErr?`<p class="tbwarn">Another Control Room is already open as “${esc(teacherName())}”: add your last name.</p>`:''}</div>
      ${attBoxHTML()}
      <div class="hnames">${ps.length?ps.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<span class="hname c${p.sh}${p.att==='in'?' att':''}${p.conn&&p.conn.open?'':' off'}">${p.att==='in'?'✓ ':''}${esc(p.name)}</span>`).join(''):'<p class="fine">Names appear here as students check in.</p>'}</div>
      <button class="ghost attcopy" id="bAttCopy">⧉ Copy attendance${ps.length?` · ${ps.length}`:''}</button>
      <button class="big go hact" id="bAct">Activities <small>games &amp; tools</small></button></aside></div>`;
  const q=$('#homeQR',st),size=Math.round(Math.min(innerHeight-420,innerWidth*.36,620));   // leaves room for the code and the count under it
  if(G.code){if(G.homeQR&&G.homeQR.code===G.code&&G.homeQR.size===size)q.appendChild(G.homeQR.node);
    else{const n=document.createElement('div');drawQR(n,G.code,size);G.homeQR={code:G.code,size,node:n};q.appendChild(n);}}
  $('#bAct',st).onclick=()=>{G.view='menu';render();syncAll();};$('#bAttCopy',st).onclick=copyAttendance;$('#bTeach',st).onclick=askTeacher;attBoxBind(st);
  if(!teacherName())setTimeout(askTeacher,300);}

function rMenu(st){
  const ps=players(),tot=rankBy('total');
  st.innerHTML=`<div class="menu">
    <aside class="roomp">
      <div class="teachbox${G.lobbyErr?' clash':''}"><span class="lab">Teacher</span><div class="tbrow"><b>${esc(teacherName()||'—')}</b><button class="ghost" id="bTeach">Change</button></div>
        ${G.lobbyErr?`<p class="tbwarn">Another Control Room is already open as “${esc(teacherName())}” (another tab, or a colleague with the same name). Student computers may find that room instead: add your last name.</p>`:''}
        <span class="fine"><a href="${esc(goURL())}" target="_blank" rel="noopener" title="The page for the student computers">CADCAST</a></span>
        <button class="ghost tlink" id="bCopyTeach" title="Your own link: opens Control Room set up as you (name${attOwn()?' and Google Sheet':''}) on any computer">⧉ Copy teacher link</button></div>
      <button class="ghost attcopy" id="bAttCopy" title="Copy the names of everyone who joined this room, with the time they joined">⧉ Copy attendance${ps.length?` · ${ps.length}`:''}</button>
      ${attBoxHTML()}
      <div class="mchips">${ps.length?ps.map(p=>`<button class="mchip c${p.sh}${p.conn&&p.conn.open?'':' off'}${p.att==='in'?' att':p.att==='fail'?' attx':''}${p.hand?' hand':''}" data-id="${esc(p.id)}" title="${p.att==='in'?'Checked in on the attendance sheet · ':p.att==='fail'?'Attendance not recorded · ':''}Click to remove">${shape(p.sh,14)}${esc(p.name)}${p.hand?`<i class="mhand">${HAND_ICON}</i>`:''}</button>`).join(''):`<p class="empty">Waiting for the first phone…</p>`}</div>
      ${tot.list.some(p=>p.total>0)?`<div class="standings"><span class="lab">Room standings</span>${tot.list.slice(0,8).map(p=>`<div class="srow"><b>${tot.map.get(p.id)}</b><span>${esc(p.name)}</span><em>${p.total}</em></div>`).join('')}</div>`:''}
      <div class="frow"><button class="ghost" id="bReset">Reset points</button><button class="ghost" id="bNew">New room</button></div>
    </aside>
    <section class="games">${GROUPS.map(gr=>`<div class="ggroup" style="--c:var(${gr.col})"><div class="ghead"><i></i><b>${esc(gr.name)}</b></div>
      <div class="gtiles">${GAMES.filter(g=>g.group===gr.id).map(g=>`<button class="gt" data-g="${g.id}" style="--c:var(${g.col})"><span class="no">${numOf(g)}</span><span class="ico">${g.icon||''}</span><strong>${esc(g.name)}</strong><p>${esc(g.tag)}</p><span class="meta">${(g.badges||[]).map(b=>`<span>${esc(b)}</span>`).join('')}</span></button>`).join('')}</div></div>`).join('')}</section>
  </div>`;
  $$('.mchip',st).forEach(b=>b.onclick=()=>{if(confirm('Remove '+b.textContent+' from the room?'))kick(b.dataset.id);});
  $$('.gt',st).forEach(b=>b.onclick=()=>{G.game=gameById(b.dataset.g);G.view='setup';render();syncAll();});
  $('#bReset').onclick=resetPoints;$('#bAttCopy').onclick=copyAttendance;$('#bNew').onclick=newRoom;
  $('#bTeach').onclick=askTeacher;$('#bCopyTeach').onclick=()=>copyText(teacherLink(),'Teacher link copied. Keep it private: it opens Control Room as you'+(attOwn()?', with your sheet':''));if(!teacherName())setTimeout(askTeacher,300);
  attBoxBind(st);
}

/* setup: the game's poster on the left, its options on the right */
function optVals(g){const saved=store.get('opt.'+g.id,{}),v={};(g.options||[]).forEach(o=>{let x=saved[o.key]!==undefined?saved[o.key]:o.def;
  // a saved choice that no longer exists (renamed or removed) falls back to the default
  if(o.choices&&o.type!=='multi'&&!o.choices.some(c=>JSON.stringify(c[0])===JSON.stringify(x)))x=o.def;
  if(o.choices&&o.type==='multi'&&Array.isArray(x)){const k=x.filter(y=>o.choices.some(c=>c[0]===y));x=x.length&&!k.length?o.def:k;}   // NONE (an empty pick) stays empty
  v[o.key]=x;});return v;}
function rSetup(st){
  const g=G.game,v=optVals(g);
  const optHTML=(o,k)=>{
    const head=`<h3><b>${pad2(k+1)}</b>${esc(o.label)}${o.sub?`<small>${esc(typeof o.sub==='function'?o.sub(v):o.sub)}</small>`:''}</h3>`;
    if(o.type==='step')return `<div class="fsec">${head}<div class="stepper" data-k="${o.key}"><button data-d="-1" aria-label="Less" ${v[o.key]<=o.min?'disabled':''}>−</button><b>${v[o.key]}<small>${esc(typeof o.unit==='function'?o.unit(v[o.key]):o.unit||'')}</small></b><button data-d="1" aria-label="More" ${v[o.key]>=o.max?'disabled':''}>+</button></div>${o.help?`<p class="fine">${o.help}</p>`:''}</div>`;
    if(o.type==='multi')return `<div class="fsec">${head}<div class="cats" data-k="${o.key}">${o.choices.map(([cv,lab,sm],i)=>`<button class="catc" data-i="${i}" aria-pressed="${v[o.key].includes(cv)}"><b>${pad2(i+1)}</b><strong>${esc(lab)}</strong><span>${esc(sm||'')}</span></button>`).join('')}</div>
      <div class="frow"><button class="ghost" data-all="${o.key}">All</button><button class="ghost" data-none="${o.key}">None</button></div>${o.help?`<p class="fine">${o.help}</p>`:''}</div>`;
    return `<div class="fsec">${head}<div class="seg" data-k="${o.key}">${o.choices.map(([cv,lab,sm],i)=>`<button data-i="${i}" aria-pressed="${JSON.stringify(v[o.key])===JSON.stringify(cv)}">${esc(lab)}${sm?`<small>${esc(sm)}</small>`:''}</button>`).join('')}</div>${o.help?`<p class="fine">${o.help}</p>`:''}</div>`;
  };
  st.innerHTML=`<div class="gsetup" style="--c:var(${g.col})">
    <section class="gintro dots"><div class="bigico">${g.icon||''}</div>
      <div class="gtitle"><div class="no">${numOf(g)}</div><h1>${esc(g.name)}</h1><p class="tag">${esc(g.tag)}</p></div>
      <ol class="how">${(g.how||[]).map(h=>`<li><span>${h}</span></li>`).join('')}</ol></section>
    <section class="form">${(g.options||[]).filter(o=>!o.show||o.show(v)).map(optHTML).join('')}${g.setupExtra?g.setupExtra(v):''}
      <div class="frow"><button class="ghost" id="bBack">← Menu</button><button class="big go" id="bGo">${esc(g.startLabel||'Start')} <small>SPACE</small></button>
      <span class="fine">${online().length?online().length+' online':'Nobody online yet — phones can join any time.'}</span></div>
      ${g.note?`<p class="fine">${g.note}</p>`:''}</section></div>`;
  const save=()=>{store.set('opt.'+g.id,v);rSetup(st);};
  $$('.seg',st).forEach(sg=>{const o=g.options.find(x=>x.key===sg.dataset.k);$$('button',sg).forEach(b=>b.onclick=()=>{v[o.key]=o.choices[+b.dataset.i][0];save();});});
  $$('.stepper',st).forEach(sg=>{const o=g.options.find(x=>x.key===sg.dataset.k);$$('button',sg).forEach(b=>b.onclick=()=>{v[o.key]=clamp(Number(v[o.key])+(+b.dataset.d)*(o.step||1),o.min,o.max);save();});});
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
  G.view='play';G.game=g;G.lastOpts=v;
  try{g.start(v);}catch(e){console.error(e);toast('Could not start: '+e.message);G.view='setup';}
  render();syncAll();
}
function exitGame(force){
  if(G.view==='menu')return;
  if(!force&&G.view==='play'&&G.gs&&!(G.gs.phase==='end')&&!confirm('Leave this game and go back to the menu? Points won so far are kept.'))return;
  if(G.view==='play')try{G.game&&G.game.stop&&G.game.stop();}catch(e){}
  if(typeof V!=='undefined')V=null;
  if(typeof PK!=='undefined')PK=null;
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
      <div class="ffoot">${againBtn()}<button class="big go" id="bMenu2">Back to the menu</button></div></section></div>`;
  $('#bMenu2').onclick=()=>exitGame(true);bindAgain(st);
  confetti($('#conf'));
}
// "Play another round" on every end screen: the same game again with the same settings (fresh questions, scores from zero)
const againBtn=()=>`<button class="big again" id="bAgain">Play another round <small>R</small></button>`;
function playAgain(){const g=G.game;if(!g)return;try{g.stop&&g.stop();}catch(e){}if(typeof V!=='undefined')V=null;sfx.whoosh&&sfx.whoosh();startGame(g,G.lastOpts||optVals(g));}
function bindAgain(st){const b=$('#bAgain',st);if(b)b.onclick=playAgain;}
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
/* Autoplay: after a reveal, a countdown starts the next round by itself. Every round game gets the option, and the
   teacher can flip it any time from the button under Next (or the A key). */
const AUTO_OPT={key:'auto',label:'Autoplay',sub:'the next round starts by itself',choices:[[0,'Off','you click Next'],[6,'6','seconds'],[10,'10','seconds'],[15,'15','seconds']],def:10,
  help:'After each reveal a countdown starts the next round. Switch it on or off any time with the Autoplay button under Next, or press A. Click the ring (or press P) to pause.'};
function autoFlip(g){const s=G.gs;if(!s||!s.opts)return 0;const v=+s.opts.auto||0;if(v)s.autoLast=v;s.opts.auto=v?0:(s.autoLast||10);
  const sv=store.get('opt.'+g.id,{});sv.auto=s.opts.auto;store.set('opt.'+g.id,sv);toast(s.opts.auto?`Autoplay on · ${s.opts.auto} s`:'Autoplay off');return s.opts.auto;}
const autoBtn=s=>{const v=+(s.opts&&s.opts.auto)||0;return `<button class="ghost wide autob${v?' on':''}" id="bAuto" title="Start the next round by itself (A)"><i></i>${v?`Autoplay on · ${v} s`:'Autoplay off'}</button>`;};
function roundGame(spec){
  if(!(spec.options||[]).some(o=>o.key==='auto'))spec.options=[...(spec.options||[]),AUTO_OPT];
  const g=Object.assign({kind:'round',speed:.5,okAt:.99,closeAt:.45,prepMs:0,badges:['Scored']},spec);
  const cur=()=>G.gs.rounds[G.gs.i];
  g.topInfo=()=>{const s=G.gs;if(!s)return g.tag;if(s.phase==='end')return 'Final results';return `Round ${Math.min(s.i+1,s.rounds.length)} of ${s.rounds.length}`+(g.roundInfo?' · '+g.roundInfo(cur(),s.opts):'');};
  g.start=opts=>{
    const rounds=g.build(opts);if(!rounds.length)throw new Error('No rounds to play with these settings');
    G.gs={opts,rounds,i:-1,done:-1,phase:'prep',ans:new Map(),res:new Map(),T:0,openAt:0,prepEnd:0,openEnd:0,prevOrder:[],lastTick:0,paused:false,tmr:0,nextT:0,nextEnd:0};
    goRound(0,true);
  };
  // one main timer per phase (prep → open → reveal → next), so the teacher can pause it from the ring
  function mainTimer(ms,fn){const s=G.gs;clearTimeout(s.tmr);s.tmrFn=fn;s.tmrEnd=now()+ms;s.tmr=setTimeout(()=>{if(G.gs===s&&!s.paused)fn();},ms);}
  function goRound(i,first){
    const s=G.gs;clearLater();clearTimeout(s.tmr);s.paused=false;s.nextT=0;g.leave&&g.leave();s.i=i;s.ans=new Map();s.res=new Map();s.phase='prep';
    const ms=typeof g.prepMs==='function'?g.prepMs(cur(),s.opts):g.prepMs;s.prepEnd=now()+ms;s.prepMsTot=ms;
    g.onPrep&&g.onPrep(cur(),s.opts);
    if(ms>0)mainTimer(ms,()=>{if(s.phase==='prep'&&s.i===i)open();});else{open(first);return;}
    if(!first){render();syncAll();}
  }
  function open(first){
    const s=G.gs;s.phase='open';s.T=(g.secs?g.secs(s.opts,cur()):20)*1000;s.openAt=now();s.openEnd=s.T?s.openAt+s.T:0;s.lastTick=0;
    const i=s.i;if(s.T)mainTimer(s.T,()=>{if(s.phase==='open'&&s.i===i)reveal();});
    g.onOpen&&g.onOpen(cur(),s.opts);sfx.open();if(!first){render();syncAll();}
  }
  function answer(p,d){
    const s=G.gs;if(s.phase!=='open'||d.i!==s.i||s.ans.has(p.id))return;if(g.valid&&!g.valid(cur(),d.a))return;
    s.ans.set(p.id,{a:d.a,ms:now()-s.openAt});sfx.inn();liveUpdate();
    if(online().length&&online().every(x=>s.ans.has(x.id)))later(()=>{if(G.gs===s&&s.phase==='open'&&s.i===d.i)reveal();},900);
  }
  function reveal(){
    const s=G.gs;if(s.phase!=='open')return;clearLater();clearTimeout(s.tmr);s.paused=false;const r=cur();s.prevOrder=rankBy('gp').list.map(p=>p.id);let accSum=0,n=0;
    players().forEach(p=>{
      const a=s.ans.get(p.id);let res=a?(g.score(r,a.a,{ms:a.ms,T:s.T,opts:s.opts})||{acc:0}):{acc:0,note:'No answer this time'};
      const acc=clamp(+res.acc||0,0,1),ok=!!a&&acc>=g.okAt,sf=s.T&&a?1-g.speed*clamp(a.ms/s.T,0,1):1;
      if(ok){p.streak++;p.right++;p.best=Math.max(p.best,p.streak);if([3,5,8,12].includes(p.streak))logAdd(p,{kind:'star',game:g.name,text:`${p.streak} right in a row`});}else p.streak=0;
      let pts=a?Math.round(1000*acc*sf/10)*10:0;if(ok)pts+=Math.min(p.streak-1,5)*100;
      award(p,pts);const cls=!a?'none':ok?'yes':acc>=g.closeAt?'close':'no';p.last={pts,acc,ok,cls};s.res.set(p.id,{...res,acc,pts,cls});
      if(a){accSum+=acc;n++;}
    });
    s.done=s.i;s.phase='reveal';g.onReveal&&g.onReveal(r,s.opts);sfx.reveal(n?100*accSum/n:0);
    // optional countdown to the next question (the game's "auto" option, in seconds)
    startNext();
    render();syncAll();saveRoom();
  }
  function startNext(){const s=G.gs;s.nextT=(+s.opts.auto||0)*1000;if(s.nextT){const i=s.i;s.nextEnd=now()+s.nextT;mainTimer(s.nextT,()=>{if(s.phase==='reveal'&&s.i===i)g.next();});}}
  g.autoFlip=()=>{const s=G.gs;if(!s||s.phase==='end')return;autoFlip(g);
    if(s.phase==='reveal'){clearTimeout(s.tmr);s.paused=false;s.nextT=0;startNext();}render();};
  // click the ring (or press P): pause / resume whichever clock is running
  g.pause=()=>{const s=G.gs;if(!s)return;const can=s.phase==='prep'||(s.phase==='open'&&s.T)||(s.phase==='reveal'&&s.nextT);if(!can&&!s.paused)return;
    if(!s.paused){s.paused=true;s.pauseAt=now();clearTimeout(s.tmr);s.pauseLeft=Math.max(0,s.tmrEnd-now());}
    else{const d=now()-s.pauseAt;s.paused=false;s.prepEnd+=d;if(s.openEnd)s.openEnd+=d;s.openAt+=d;if(s.nextEnd)s.nextEnd+=d;mainTimer(s.pauseLeft,s.tmrFn);}
    if(s.phase==='open'&&s.T){const left=Math.max(0,s.openEnd-(s.paused?s.pauseAt:now()));online().forEach(p=>{try{p.conn.send({t:'clock',left,paused:s.paused});}catch(e){}});}
    toast(s.paused?'Paused. Click the ring to carry on.':'Running again');sfx.tick&&sfx.tick(1);};
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
      <div class="sact">${g.replay?`<button class="ghost wide" id="bReplay">▶ ${esc(g.replayLabel||'Play again')}</button>`:''}${s.phase==='reveal'&&(g.replay||g.leave)?'<button class="ghost wide" id="bStopA">■ Stop the sound</button>':''}<button class="big ${s.phase==='reveal'?'go':''}" id="bNext">${esc(btn)} <small>SPACE</small></button>${autoBtn(s)}${alt}<span class="keys">Space / → next · Q join code</span></div></aside></div>
      ${s.phase==='prep'&&s.prepMsTot>0?'<i class="readbar" id="readbar"></i>':''}`;
    const m=$('#rgm');(s.phase==='reveal'?g.reveal:g.stage).call(g,m,r,ctx);
    const si=$('#sinfo');
    if(s.phase==='reveal'){
      const L=ctx.list,best=L.slice().sort((a,b)=>(b.res?.pts||0)-(a.res?.pts||0))[0],avg=L.length?Math.round(100*L.reduce((a,x)=>a+(x.res?.acc||0),0)/L.length):0;
      si.innerHTML=(g.revealSide?g.revealSide(r,ctx):`<div class="stat"><b>${g.okAt>=.99?Math.round(100*L.filter(x=>x.res&&x.res.cls==='yes').length/Math.max(1,players().length))+'%':avg+'%'}</b><span>${g.okAt>=.99?'got it right':'average accuracy'}</span></div>`)
        +(best&&best.res&&best.res.pts>0?`<div class="fast"><span class="lab">Top score this round</span><b>${esc(best.p.name)}</b><span class="lab">+${best.res.pts}${best.res.note?' · '+esc(best.res.note):''}</span></div>`:`<div class="fast"><span class="lab">Nobody scored</span><b>Stump the room ✓</b></div>`);
    }else si.innerHTML=`<div class="stat"><b id="nAns">${s.ans.size}<span>/${online().length}</span></b><span>answered</span></div><p class="fine">${s.phase==='prep'?(g.prepSide?g.prepSide(r,s.opts):'Get ready…'):(g.openSide?g.openSide(r,s.opts):'Revealed when everyone has answered'+(s.T?' or the clock runs out.':'.'))}</p>`;
    $('#bNext').onclick=g.next;$('#bAuto').onclick=g.autoFlip;if($('#bAlt'))$('#bAlt').onclick=due?g.skip:g.toBoard;if(g.replay)$('#bReplay').onclick=()=>g.replay(r,s.phase,s.opts);if($('#bStopA'))$('#bStopA').onclick=()=>{try{g.leave&&g.leave();}catch(e){}AU_stopAll();toast('Sound stopped');};
    const rc=$('#ring');if(rc){rc.style.cursor='pointer';rc.title='Click to pause or resume the clock (P)';rc.onclick=g.pause;}
    ring($('#ring'),t0=>{const t=s.paused?s.pauseAt:t0;
      const beads=players().map(p=>{const a=s.ans.has(p.id),on=p.conn&&p.conn.open,rs=s.res.get(p.id);
        return {f:s.phase==='reveal'?(rs?{yes:'--green',close:'--yel',no:'--red',none:''}[rs.cls]:''):a?'--ink':'',big:a,a:on?1:.3};});
      if(s.paused&&s.phase!=='reveal'){const fr=s.phase==='prep'?(s.prepMsTot?clamp((s.prepEnd-t)/s.prepMsTot,0,1):0):(s.T?Math.max(0,s.openEnd-t)/s.T:1);return {frac:fr,label:'❚❚',sub:'paused · click',beads};}
      if(s.phase==='prep'){const fr=s.prepMsTot?1-clamp((s.prepEnd-t)/s.prepMsTot,0,1):1;const rb=$('#readbar');if(rb)rb.style.transform=`scaleX(${1-fr})`;return {frac:fr,label:g.prepLabel||'READY',sub:g.prepSub||'get set',beads};}
      if(s.phase==='open'){if(s.openEnd){const left=Math.max(0,s.openEnd-t),sec=Math.ceil(left/1000);if(left>0&&sec<=5&&sec!==s.lastTick){s.lastTick=sec;sfx.tick(sec);}return {frac:left/s.T,hot:left<5000,label:String(sec),sub:'seconds',beads};}return {frac:1,label:'∞',sub:'no clock',beads};}
      const rl=g.ringLabel?g.ringLabel(r):{label:'✓',fill:'--green'};
      if(s.nextT){const left=Math.max(0,s.nextEnd-t);return {frac:left/s.nextT,label:rl.label,sub:s.paused?'paused · click':`next in ${Math.ceil(left/1000)} s`,fill:rl.fill,beads};}
      return {frac:0,label:rl.label,sub:rl.sub||'',fill:rl.fill,beads};
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
  const peer=new Peer(peerCfg());PL.peer=peer;
  clearTimeout(PL.wd);PL.wd=setTimeout(()=>{if(PL.peer===peer&&(!PL.conn||!PL.conn.open))pRetry();},10000);
  peer.on('open',()=>{const conn=peer.connect(peerId(PL.code),{serialization:'json',reliable:true});PL.conn=conn;PL.connCode=PL.code;
    // the room answered the relay but the direct link never opened: the network is blocking device-to-device traffic
    const fail=setTimeout(()=>{if(!conn.open){PL.status='Found room '+PL.code+', but this Wi-Fi blocks the connection to it. Switch Wi-Fi off and use mobile data, or ask your teacher.';pRender();}},12000);
    conn.on('open',()=>{clearTimeout(fail);PL.retry=0;PL.heard=now();PL.status='';conn.send(PL.joined?{t:'hi',id:PL.id,name:PL.name}:{t:'who'});if(!PL.joined)pRender();const q=PL.q;PL.q=[];q.forEach(m=>{try{conn.send(m);}catch(e){}});});
    conn.on('data',m=>{PL.heard=now();pData(m);});
    conn.on('close',()=>{if(PL.kicked)return;PL.hand=false;PL.status='Lost the room — reconnecting…';pRender();pRetry();});});
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
  if(m.t==='hand'){PL.hand=!!m.up;pHandShow();return;}
  if(m.t==='timer'){pTmrMsg(m);return;}
  if(m.t==='paired'){showPaired(m);return;}
  if(m.t==='clock'){if(PL.timer){PL.timer.end=now()+(+m.left||0);PL.timer.frozen=m.paused?(+m.left||0):null;}return;}
  if(m.t==='taken'){PL.joined=false;PL.st=null;store.del('proom');PL.status=m.name+' is already in the room on another phone. Tell your teacher if that isn’t you.';pRender();return;}
  if(m.t==='kick'){PL.kicked=true;PL.st={view:'kicked',why:m.why};try{PL.conn.close();}catch(e){}pRender();return;}
  if(m.t!=='st')return;
  if(PL.pairPc&&PL.joined&&m.view!=='kicked'&&PL.conn&&PL.conn.open){const pc=PL.pairPc;PL.pairPc=null;try{PL.conn.send({t:'pair',id:PL.id,pc});}catch(e){PL.pairPc=pc;}}
  const prev=PL.st;PL.st=m;PL.name=m.name;if(m.name&&m.view!=='kicked'&&store.get('pname','')!==m.name)store.set('pname',m.name);
  const key=m.view+'|'+m.g+'|'+(m.s?m.s.k:'');
  if(prev&&key===PL.key&&m.view==='vote'){const top=$('.pscore');if(top)top.textContent=m.total;pVoteUpdate($('#pbody'),m.s);return;}
  if(prev&&key===PL.key&&m.view==='play'){const g=gameById(m.g);const top=$('.pscore');if(top)top.textContent=m.total;if(g&&g.pupdate)g.pupdate($('#pbody'),m.s,papi);return;}
  if(m.view==='play'&&m.s&&m.s.ph==='reveal'&&navigator.vibrate)navigator.vibrate(m.s.cls==='yes'?[40,40,40]:120);
  pRender();
}
function pRankCard(root,st,label){root.innerHTML=`<div class="pcenter dots"><div class="lab">${esc(label)}</div><div class="rankbig">${st.rank}<sup>${sufx(st.rank)}</sup></div><p>of ${st.of} · <b>${st.gp}</b> points${st.streak>1?` · ${st.streak} in a row`:''}</p></div>`;}
function pHandShow(){const b=$('#pHand');if(!b)return;b.classList.toggle('up',!!PL.hand);b.setAttribute('aria-pressed',String(!!PL.hand));
  let t=$('#pHandTip');if(PL.hand&&!t){document.body.insertAdjacentHTML('beforeend','<div class="phandtip" id="pHandTip">Hand raised · your teacher sees it. Tap the hand again to lower it.</div>');setTimeout(()=>{const x=$('#pHandTip');if(x)x.remove();},3200);}if(!PL.hand&&t)t.remove();}
function pRender(){
  if(ROLE!=='player')return;
  const app=$('#app');app.className='ply';const s=PL.st;
  const top=`<header class="ptop">${logo()}${PL.joined&&s&&s.view!=='kicked'?`<button class="nbbtn" id="nbBtn" aria-label="Your notebook">${NB_ICON}<b class="nbcount">${(PL.log||[]).length}</b></button><button class="phand${PL.hand?' up':''}" id="pHand" aria-pressed="${!!PL.hand}" aria-label="Raise your hand">${HAND_ICON}</button><div class="who"><span>${esc(PL.name)}</span><b class="pscore">${s.total||0}</b></div>`:''}</header>`;
  app.innerHTML=top+`<main class="pbody" id="pbody"></main>`;pTmrPaint();
  if($('#nbBtn'))$('#nbBtn').onclick=openNotebook;
  if($('#pHand'))$('#pHand').onclick=()=>{PL.hand=!PL.hand;pHandShow();papi.vibe(PL.hand?[15,40,15]:10);const m={t:'hand',up:PL.hand};if(PL.conn&&PL.conn.open)try{PL.conn.send(m);}catch(e){}};
  
  const body=$('#pbody');PL.key='';PL.timer=null;PL.clock=null;
  setTimeout(()=>{const gb=$('#pGuide');if(gb)gb.onclick=openGuide;},0);
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
  if(!PL.joined&&PL.code&&(QS.has('room')||QS.has('pair'))&&!PL.names&&!PL.typing&&!/No room/.test(PL.status||'')){
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
  if(PL.synH&&!(s.view==='play'&&s.g==='telephone')&&typeof synStop==='function')synStop();
  if(s.view==='vote'&&s.s){pVote(body,s.s);return;}
  if(s.view==='pick'&&s.s){pPick(body,s.s);return;}
  if(s.view==='play'){
    const g=gameById(s.g);if(!g){body.innerHTML=`<div class="pcenter"><h2>Update</h2><p>Reload this page to get the newest version of the games.</p></div>`;return;}
    try{g.player(body,s.s,papi);}catch(e){console.error(e);body.innerHTML=`<div class="pcenter"><h2>Hmm</h2><p>${esc(e.message)}</p></div>`;}
    if(PL.status)body.insertAdjacentHTML('beforeend',`<p class="pst pfix">${esc(PL.status)}</p>`);
    return;
  }
  body.innerHTML=`<div class="pcenter dots idle"><div class="idlemain"><div class="idlefig">${shape(0,64,'var(--ink)','var(--red)')}${shape(1,64,'var(--ink)','var(--blue)')}${shape(2,64,'var(--ink)','var(--yel)')}</div>
    <h2>${s.g?'Next up':'You’re in'}</h2>${s.g?`<p class="nextg">${esc(s.gname)}</p>`:''}
    <p>${s.g?'The game starts in a moment.':`Look for <b>${esc(s.name)}</b> on the big screen. The next game starts soon.`}</p>
    ${PL.status?`<p class="pst">${esc(PL.status)}</p>`:''}</div>
    <button class="guidebtn" id="pGuide"><b>Guide</b><span>to the Control Room</span><i>→</i></button></div>`;
}
/* the computer that was scanned is now this student's: a short confirmation card over whatever is on screen */
function showPaired(m){let ov=$('#paired');if(!ov){ov=el('div','pairedov');ov.id='paired';document.body.appendChild(ov);}
  ov.innerHTML=m.ok?`<div class="pairedcard"><div class="paircheck">✓</div><span class="lab">Your computer is now</span><div class="pairname">${esc(m.name)}</div><p>It sends your sound to the teacher and gets your files.</p></div>`
    :`<div class="pairedcard bad"><div class="paircheck">!</div><span class="lab">Computer not connected</span><p>${esc(m.why||'Scan its code again.')}</p></div>`;
  if(navigator.vibrate)navigator.vibrate(m.ok?[30,40,30]:200);ov.onclick=()=>ov.remove();clearTimeout(showPaired.t);showPaired.t=setTimeout(()=>ov.remove(),m.ok?4200:7000);}
/* ---------- Add to Home Screen (tap the logo on a phone) ---------- */
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.__bip=e;});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
const NB_ICON='<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="3" y="2" width="16" height="18" fill="var(--yel)" stroke="var(--ink)" stroke-width="2"/><path d="M7 2v18M10 7h6M10 11h6M10 15h4" stroke="var(--ink)" stroke-width="2"/></svg>';
const NB_KINDS=[['brief','Briefs & styles','◆'],['rules','Rules you wrote','✎'],['pick','Picks you kept','●'],['card','Cards you were dealt','▲'],['team','Teams & chains','■'],['finish','Results','★'],['star','Milestones','★']];
/* The notebook: a scrapbook of the lesson, newest first. Every kind of entry is its own object: a ticket for a
   genre brief, a taped index card for a mission, a photo caption with your rules, a starburst for a milestone,
   a ribbon for a result. A coloured band with the game's icon starts each game. */
const nbTime=t=>t?new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
const nbLines=t=>String(t||'').split('\n').map(x=>x.trim()).filter(Boolean);
function nbEntry(e,j){const T=esc,L=nbLines(e.text),tm=nbTime(e.at),tilt=`--tilt:${((j*53)%7-3)*.5}deg`;
  if(e.kind==='brief'){const kv=L.map(l=>{const i=l.indexOf(': ');return i>0?[l.slice(0,i),l.slice(i+2)]:['',l];});const [nm,...sub]=String(e.title||'').split(' · ');
    return `<article class="nbx nbticket" style="${tilt}"><span class="nbk">Brief · ${T(tm)}</span>${nm?`<h4>${T(nm)}</h4>`:''}${sub.length?`<p class="nbsub">${T(sub.join(' · '))}</p>`:''}
      <div class="nbchips">${kv.map(([k,v],i)=>`<span class="c${i%4}">${k?`<small>${T(k)}</small>`:''}<b>${T(v)}</b></span>`).join('')}</div><i class="nbperf"></i></article>`;}
  if(e.kind==='pick'){const m=String(e.text||'').match(/^Kept (.+?): (.+)$/);
    return `<article class="nbx nbpick" style="${tilt}"><span class="nbk">Kept · ${T(tm)}</span><div><small>${T(m?m[1]:'')}</small><b>${T(m?m[2]:e.text)}</b></div><i class="nbstamp">KEPT</i></article>`;}
  if(e.kind==='card'){const rule=L.find(l=>/^Rule: /.test(l)),rest=L.filter(l=>l!==rule),task=rest.pop()||'',lead=rest.join(' ');
    return `<article class="nbx nbcard" style="${tilt}"><i class="nbtape"></i><span class="nbk">${T(e.title||'Card')} · ${T(tm)}</span>${lead?`<p class="nblead">${T(lead)}</p>`:''}<h4>${T(task)}</h4>${rule?`<span class="nbrule">${T(rule.slice(6))}</span>`:''}</article>`;}
  if(e.kind==='rules'){const R=L.map(l=>l.replace(/^\d+\.\s*/,''));
    return `<article class="nbx nbrules" style="${tilt}"><div class="nbphoto"><span>${T(e.title||'The picture')}</span></div><span class="nbk">Your rules · ${T(tm)}</span><ol>${R.map((r,i)=>`<li><b class="c${i%4}">${i+1}</b><span>${T(r)}</span></li>`).join('')}</ol></article>`;}
  if(e.kind==='star'){const n=String(e.text||'').match(/^(\d+)\s+(.*)$/);
    return `<article class="nbx nbstar"><div class="nbburst"><b>${n?T(n[1]):'★'}</b></div><div><span class="nbk">Milestone · ${T(tm)}</span><h4>${T(n?n[2]:e.text)}</h4></div></article>`;}
  if(e.kind==='finish'){const t=String(e.text||''),pl=t.match(/^(\d+)(st|nd|rd|th) of (\d+)/),pc=t.match(/(\d+)% accurate/),ln=t.match(/^Your lineage: (.*?) · (.*)$/);
    if(ln)return `<article class="nbx nbfin lineage"><span class="nbk">Your lineage · ${T(tm)}</span><h4>${T(ln[1])}</h4><div class="nbchain">${ln[2].split(' → ').map((x,i)=>`<span class="c${i%4}">${T(x)}</span>`).join('<i>→</i>')}</div></article>`;
    const big=pl?`${pl[1]}<sup>${pl[2]}</sup>`:pc?`${pc[1]}<sup>%</sup>`:'✓',rest=t.split(' · ').slice(pl||pc?1:0).filter(x=>!(pc&&x.includes('% accurate')));
    return `<article class="nbx nbfin ${pl&&+pl[1]<=3?'p'+pl[1]:''}"><div class="nbmedal"><b>${big}</b>${pl?`<small>of ${T(pl[3])}</small>`:pc?'<small>accurate</small>':''}<i></i><i></i></div><div><span class="nbk">Result · ${T(tm)}</span>${pc&&!pl?`<h4>${T(t.split(' · ')[0])}</h4>`:''}<div class="nbstats2">${rest.map(x=>`<span>${T(x)}</span>`).join('')}</div></div></article>`;}
  return `<article class="nbx nbcard" style="${tilt}"><span class="nbk">${T(e.title||e.kind)} · ${T(tm)}</span><h4>${T(e.text||'')}</h4></article>`;}
function openNotebook(){
  let ov=$('#nb');if(!ov){ov=el('div','nb');ov.id='nb';ov.setAttribute('role','dialog');document.body.appendChild(ov);}
  const L=(PL.log||[]).slice().reverse(),s=PL.st||{};let lastGame=null,out='';
  L.forEach((e,j)=>{if(e.game!==lastGame){lastGame=e.game;const g=GAMES.find(x=>x.name===e.game);
      out+=`<div class="nbband" style="--c:var(${(g&&g.col)||'--ink'})"><span class="nbico">${(g&&g.icon)||''}</span><div><small>${g?numOf(g):''} · ${T_(nbTime(e.at))}</small><b>${esc(e.game||'Control Room')}</b></div></div>`;}
    out+=nbEntry(e,j);});
  ov.innerHTML=`<div class="nbpanel"><button class="guideX" id="nbX" aria-label="Close the notebook">✕</button>
    <header class="nbhero"><div class="nbshapes"><i></i><i></i><i></i></div><span class="lab">The notebook of</span><h2 style="font-size:min(clamp(52px,16vw,96px),${Math.floor(150/Math.max(6,...String(PL.name||'You').split(/\s+/).map(w=>w.length)))}vw)">${esc(PL.name||'You')}</h2>
      <div class="nbstickers"><div class="nbs1"><b>${s.total||0}</b><span>points</span></div><div class="nbs2"><b>${s.rank?ordinal(s.rank):'—'}</b><span>in the room</span></div><div class="nbs3"><b>${L.length}</b><span>${L.length===1?'entry':'entries'}</span></div></div>
      <button class="ghost nbguide" id="nbGuide">Guide to the Control Room →</button></header>
    <div class="nbbody">${out||'<div class="nbempty"><div class="nbshapes small"><i></i><i></i><i></i></div><h3>Empty pages</h3><p>Your briefs, rules, cards, kept picks, milestones and results collect here as the lesson goes on.</p></div>'}<p class="nbend">${L.length?'The first page of today':''}</p></div></div>`;
  const close=()=>ov.remove();$('#nbX').onclick=close;$('#nbGuide').onclick=()=>{close();openGuide();};ov.scrollTop=0;
}
const T_=esc;
function pFrame(){
  pTmrFrame();
  const c=PL.clock;if(c){const left=Math.max(0,c.end-now());$$('.pclk').forEach(e=>e.textContent=fmtClock(left));$$('.pclkbar i').forEach(e=>e.style.width=(100*left/c.T)+'%');}
  const t=PL.timer;if(t){const left=t.frozen!=null?t.frozen:Math.max(0,t.end-now()),b=$('#pBar'),l=$('#pLeft');if(b)b.style.width=(100*left/t.T)+'%';if(l)l.textContent=t.frozen!=null?'paused':Math.ceil(left/1000)+' s';}
  const s=PL.st;if(s&&s.view==='play'){const g=gameById(s.g);if(g&&g.pframe)try{g.pframe($('#pbody'),s.s);}catch(e){}}
}

/* ---------- boot ---------- */
function boot(){
  if(QS.has('guide')){const app=$('#app');app.className='guidepage';app.innerHTML=guideHTML();return;}
  document.addEventListener('keydown',e=>{
    if(ROLE!=='host'||G.splash||e.target.closest('input,textarea,select'))return;
    if($('#saver')){e.preventDefault();if(e.key==='Escape')closeSaver();return;}   // the screensaver swallows every key; Esc ends it
    if(e.key==='Escape'){const o=$('#qrbig');if(o)o.remove();return;}
    if((e.key==='p'||e.key==='P')&&G.view==='play'&&G.game&&G.game.pause){G.game.pause();return;}
    if((e.key==='a'||e.key==='A')&&!e.metaKey&&!e.ctrlKey&&G.view==='play'&&G.game&&G.game.autoFlip&&!(e.target.closest&&e.target.closest('input,textarea,select'))){G.game.autoFlip();return;}
    if((e.key==='r'||e.key==='R')&&!e.metaKey&&!e.ctrlKey&&G.view==='play'&&$('#bAgain')){playAgain();return;}
    if((e.key==='q'||e.key==='Q')&&G.code){const o=$('#qrbig');o?o.remove():showBigQR(G.code);return;}
    if(e.key===' '||e.key==='ArrowRight'||(e.key==='Enter'&&e.target.tagName!=='BUTTON')){
      if(G.view==='setup'){e.preventDefault();startGame(G.game);}
      else if(G.view==='play'&&G.game&&G.game.next){e.preventDefault();G.game.next();}
    }
  });
  if(ROLE==='host'){applyTeacherLink();
    const s=store.get('room',null);
    if(s&&Date.now()-s.t<12*3600e3){s.players.forEach((p,k)=>G.players.set(p.id,{...blankP(),...p,hand:0,sh:p.sh??k%4,conn:null}));G.banned=new Set(s.banned||[]);}
    render();
    if(typeof songReady==='function')songReady().catch(()=>{});
    attLoad();
    openRoom(s&&Date.now()-s.t<12*3600e3?s.code:null).then(async ok=>{if(!ok&&s){try{G.peer&&G.peer.destroy();}catch(e){}await openRoom();}render();});
    addEventListener('beforeunload',e=>{if(G.view==='play'){e.preventDefault();e.returnValue='';}});
  }else{
    if(QS.has('pair')){ // scanned a computer's CADCAST code: log in here, and the computer comes along
      PL.pairPc=String(QS.get('pair')||'').replace(/[^a-z0-9]/gi,'').slice(0,24);
      const go=code=>{PL.code=code;try{history.replaceState(null,'',location.pathname+'?room='+code+(QS.get('as')?'&as='+QS.get('as'):''));}catch(e){}
        if(PL.name&&store.get('proom','')===code)PL.joined=true;PL.status='';pConnect();pRender();};
      const r=String(QS.get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);
      if(r.length===4)go(r);else{PL.status='Finding your class…';pRender();lobbyRoom().then(c=>{if(c)go(c);else{PL.status='Control Room isn’t open on the teacher’s Mac yet. Scan again in a moment.';pRender();}});}
      requestAnimationFrame(frame);return;}
    const u=QS.get('room');PL.code=(u||store.get('proom','')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);
    if(u&&PL.name&&store.get('proom','')===PL.code){PL.joined=true;pConnect();}
    else if(u&&PL.code.length===4)pConnect(); // connect first, so the class list can arrive before the student picks a name
    else if(!u&&isStandalone()&&PL.code.length===4)pConnect(); // opened from the home screen: try the last room
    pRender();
  }
  requestAnimationFrame(frame);
}
