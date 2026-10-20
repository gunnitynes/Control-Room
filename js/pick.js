/* ====================================================================
   THE PICKER — pick at random: one student, a group, or the whole room in teams.
   G.view==='pick', state in PK. One student / a group: a spotlight hops over the name wall, slows down and lands
   (fair mode: nobody twice until everyone has had a turn, PK.done). Teams: everyone is shuffled and dealt, one name
   at a time, into teams named after a colour and a shape. Phones follow: "You're up!" or their team.
   ==================================================================== */
'use strict';

let PK=null;
const PK_SH=['Circle','Square','Triangle','Diamond'],PK_CO=[['Red','--red'],['Blue','--blue'],['Yellow','--yel'],['Green','--green']];
// up to 8 teams, every one a different colour + shape
const pkTeam=k=>{const sh=k%4,co=(k+Math.floor(k/4))%4;return {sh,c:PK_CO[co][1],name:PK_CO[co][0]+' '+PK_SH[sh]};};
const pkPool=()=>online().slice().sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));

function openPicker(){clearLater();AU_stopAll();
  const keep=PK||{};PK={mode:store.get('pick.mode','one'),n:store.get('pick.n',3),teams:store.get('pick.teams',2),fair:store.get('pick.fair',true),
    done:keep.done||new Set(),phase:'set',res:null,id:0};
  G.view='pick';G.gs=null;render();syncAll();}
function pickClose(){PK=null;clearLater();exitGame(true);}

/* ---------- picking */
function pickGo(){if(!PK||PK.phase==='spin')return;const pool=pkPool();
  if(!pool.length){toast('Nobody is in the room yet');return;}
  PK.id++;PK.res=null;$('#pkOver')&&($('#pkOver').hidden=true);
  if(PK.mode==='teams')return pickTeams(pool);
  const want=PK.mode==='one'?1:Math.min(PK.n,pool.length);
  let cand=PK.fair?pool.filter(p=>!PK.done.has(p.id)):pool;
  if(cand.length<want){PK.done=new Set();cand=pool;toast('Everyone has had a turn: starting over');}
  const chosen=shuffle(cand).slice(0,want);
  PK.phase='spin';PK.res={kind:PK.mode,ids:[]};syncAll();render();
  // land them one at a time: the spotlight hops, slows down, lands; the next one starts from there
  const ids=pool.map(p=>p.id);let k=0;
  const landOne=()=>{const target=chosen[k],hops=k?6+Math.floor(Math.random()*4):Math.min(22,Math.max(10,ids.length+Math.floor(Math.random()*6)));let i=((ids.indexOf(target.id)-hops)%ids.length+ids.length)%ids.length;let h=0;   // start so the last hop is the chosen one: the same length every time   // about 4 s for the first, quicker for the rest of a group
    const hop=()=>{const id=ids[i%ids.length];$$('.pkchip').forEach(e=>e.classList.toggle('spot',e.dataset.id===id));try{sfx.spin();}catch(e){}
      if(h>=hops&&id===target.id){$(`.pkchip[data-id="${CSS.escape(id)}"]`)?.classList.add('picked');PK.res.ids.push(id);if(PK.fair)PK.done.add(id);try{sfx.inn();}catch(e){}
        k++;if(k<chosen.length){later(landOne,380);}else later(pickFinish,500);return;}
      i++;h++;later(hop,(k?40:50)+Math.pow(Math.min(1,h/Math.max(1,hops)),2.6)*(k?190:300));};
    hop();};
  later(landOne,250);}
function pickTeams(pool){const T=Math.max(2,Math.min(8,PK.teams,pool.length)),order=shuffle(pool),teams=[...Array(T)].map((_,k)=>({...pkTeam(k),ids:[]}));
  PK.phase='spin';PK.res={kind:'teams',teams};syncAll();render();
  let i=0;const deal=()=>{if(!PK||PK.res.teams!==teams)return;if(i>=order.length){later(pickFinish,400);return;}
    const p=order[i],t=teams[i%T];t.ids.push(p.id);i++;pickDrawTeams();try{sfx.card();}catch(e){}later(deal,Math.max(70,420-order.length*12));};
  later(deal,400);}
function pickFinish(){if(!PK)return;PK.phase='done';syncAll();render();   // redraw: the buttons come back, teams get their copy button
  if(PK.res.kind==='teams'){try{sfx.fanfare();}catch(e){}return;}
  const names=PK.res.ids.map(id=>(G.players.get(id)||{}).name||'?'),ov=$('#pkOver');if(!ov)return;ov.hidden=false;ov.className='vover won';
  ov.innerHTML=`<canvas id="conf"></canvas><div class="pkwin"><span class="vkick">${names.length>1?`Your group of ${names.length}`:'You’re up'}</span>
    <div class="pkwnames n${Math.min(names.length,4)}">${PK.res.ids.map((id,k)=>{const p=G.players.get(id)||{sh:k};return `<div class="pkwn c${p.sh%4}">${shape(p.sh%4,54,'var(--ink)',`var(${PK_CO[p.sh%4][1]})`)}<b>${esc(p.name||'?')}</b></div>`;}).join('')}</div>
    <div class="frow"><button class="big go" id="pkAgain">Pick again <small>SPACE</small></button><button class="ghost" id="pkOk">OK</button></div></div>`;
  $('#pkAgain').onclick=pickGo;$('#pkOk').onclick=()=>{ov.hidden=true;PK.phase='set';syncAll();render();};
  // the longest name sets the size
  $$('.pkwn b',ov).forEach(b=>{let f=parseFloat(getComputedStyle(b).fontSize);while(f>22&&b.scrollWidth>b.clientWidth+1){f-=3;b.style.fontSize=f+'px';}});
  try{sfx.fanfare();}catch(e){}confetti($('#conf'));}

/* ---------- the big screen */
function rPick(st){const pool=pkPool(),m=PK.mode,teamsOn=m==='teams'&&PK.res&&PK.res.kind==='teams';
  const sz=pool.length&&m==='teams'?`about ${Math.floor(pool.length/Math.max(2,PK.teams))}${pool.length%PK.teams?'–'+Math.ceil(pool.length/PK.teams):''} each`:'';
  st.innerHTML=`<div class="picker">
    <aside class="pkctl"><span class="vkick"><i></i>Pick at random</span><h1>Who’s<br><em>next?</em></h1>
      <div class="seg pkmode">${[['one','One student'],['group','A group'],['teams','Teams']].map(([k,l])=>`<button data-m="${k}" aria-pressed="${m===k}">${l}</button>`).join('')}</div>
      ${m==='group'?`<div class="pkstep"><span class="lab">Group size</span><div><button data-d="-1">−</button><b>${PK.n}</b><button data-d="1">＋</button></div></div>`:''}
      ${m==='teams'?`<div class="pkstep"><span class="lab">Number of teams</span><div><button data-d="-1">−</button><b>${PK.teams}</b><button data-d="1">＋</button></div><span class="fine">${sz}</span></div>`:''}
      ${m!=='teams'?`<label class="pkfair"><input type="checkbox" id="pkFair" ${PK.fair?'checked':''}><span><b>Fair turns</b> nobody twice until everyone has had a turn${PK.done.size?` · ${PK.done.size} of ${pool.length} picked <button class="linkbtn" id="pkReset">start over</button>`:''}</span></label>`:''}
      <button class="big go pkgo" id="pkGo" ${PK.phase==='spin'?'disabled':''}>${m==='teams'?'Make teams':'Pick'} <small>SPACE</small></button>
      ${teamsOn&&PK.phase==='done'?`<button class="ghost" id="pkCopy">⧉ Copy the teams</button>`:''}
      <button class="ghost" id="pkBack">← Menu</button></aside>
    <section class="pkstage" id="pkStage">${teamsOn?'<div class="pkteams" id="pkTeams"></div>':`<div class="pkwall" id="pkWall"></div>`}</section>
    <div class="vover" id="pkOver" hidden></div></div>`;
  $$('.pkmode button',st).forEach(b=>b.onclick=()=>{if(PK.phase==='spin')return;PK.mode=b.dataset.m;store.set('pick.mode',PK.mode);PK.res=null;PK.phase='set';render();syncAll();});
  $$('.pkstep button',st).forEach(b=>b.onclick=()=>{if(PK.phase==='spin')return;const d=+b.dataset.d;if(m==='group'){PK.n=Math.max(2,Math.min(12,PK.n+d));store.set('pick.n',PK.n);}else{PK.teams=Math.max(2,Math.min(8,PK.teams+d));store.set('pick.teams',PK.teams);}PK.res=null;render();});
  const fr=$('#pkFair',st);if(fr)fr.onchange=()=>{PK.fair=fr.checked;store.set('pick.fair',PK.fair);};
  const rs=$('#pkReset',st);if(rs)rs.onclick=e=>{e.preventDefault();PK.done=new Set();render();};
  $('#pkGo',st).onclick=pickGo;$('#pkBack',st).onclick=pickClose;
  const cp=$('#pkCopy',st);if(cp)cp.onclick=()=>copyText(PK.res.teams.map(t=>t.name+'\n'+t.ids.map(id=>'  '+((G.players.get(id)||{}).name||'?')).join('\n')).join('\n\n'),'Teams copied');
  if(teamsOn)pickDrawTeams();else pickDrawWall();}
function pickDrawWall(){const w=$('#pkWall');if(!w||!PK)return;const pool=pkPool(),res=PK.res&&PK.res.kind!=='teams'?PK.res.ids:[];
  w.innerHTML=pool.length?pool.map(p=>`<div class="pkchip c${p.sh%4}${PK.fair&&PK.done.has(p.id)&&!res.includes(p.id)?' used':''}${res.includes(p.id)?' picked':''}" data-id="${esc(p.id)}" style="--c:var(${PK_CO[p.sh%4][1]})">${shape(p.sh%4,26,'var(--ink)','var(--c)')}<b>${esc(p.name)}</b></div>`).join('')
    :`<div class="pkempty"><b>Nobody here yet</b><span>Students join by scanning the room code.</span></div>`;}
function pickDrawTeams(){const box=$('#pkTeams');if(!box||!PK||!PK.res)return;const T=PK.res.teams;
  box.style.setProperty('--n',Math.min(T.length,4));
  box.innerHTML=T.map(t=>`<div class="pkteam" style="--c:var(${t.c})"><div class="pkth">${shape(t.sh,40,'var(--ink)','var(--c)')}<b>${esc(t.name)}</b><span>${t.ids.length}</span></div>
    <ol>${t.ids.map((id,k)=>`<li class="${k===t.ids.length-1&&PK.phase==='spin'?'new':''}">${esc((G.players.get(id)||{}).name||'?')}</li>`).join('')}</ol></div>`).join('');}
// someone joins or leaves while the picker is open: refresh the wall (never mid-spin)
function pickLive(){if(G.view==='pick'&&PK&&PK.phase!=='spin'&&!(PK.res&&PK.res.kind==='teams'))pickDrawWall();}

/* ---------- phones */
function pickState(p){const r=PK.res,s={k:'pk'+PK.id+PK.phase+PK.mode,ph:PK.phase,mode:PK.mode};
  if(PK.phase==='done'&&r){if(r.kind==='teams'){const t=r.teams.find(t=>t.ids.includes(p.id));if(t)s.team={name:t.name,sh:t.sh,c:t.c,mates:t.ids.filter(id=>id!==p.id).map(id=>(G.players.get(id)||{}).name||'?')};}
    else{s.me=r.ids.includes(p.id);s.names=r.ids.map(id=>(G.players.get(id)||{}).name||'?');}}
  return s;}
function pPick(root,s){
  if(s.ph==='spin'){root.innerHTML=`<div class="pcenter dots"><div class="idlefig pkspin">${shape(0,54,'var(--ink)','var(--red)')}${shape(1,54,'var(--ink)','var(--blue)')}${shape(2,54,'var(--ink)','var(--yel)')}</div><h2>${s.mode==='teams'?'Making teams…':'Who will it be?'}</h2><p>Eyes on the big screen.</p></div>`;return;}
  if(s.ph==='done'&&s.team){root.innerHTML=`<div class="pkpteam" style="--c:var(${s.team.c})"><span class="lab">Your team</span><div class="pkpico">${shape(s.team.sh,110,'var(--ink)','var(--c)')}</div><h2>${esc(s.team.name)}</h2>
      ${s.team.mates.length?`<p class="lab">With</p><ul>${s.team.mates.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:'<p>Just you.</p>'}</div>`;papi.vibe([30,40,30]);return;}
  if(s.ph==='done'&&s.me){root.innerHTML=`<div class="pkpme"><span class="lab">The picker chose</span><h2>You’re<br>up!</h2>${s.names.length>1?`<p>Your group: ${s.names.map(esc).join(', ')}</p>`:''}</div>`;papi.vibe([60,60,60,60,200]);return;}
  if(s.ph==='done'){root.innerHTML=`<div class="pcenter dots"><h2>Not you this time</h2><p>${s.names&&s.names.length?`Picked: <b>${s.names.map(esc).join(', ')}</b>`:''}</p></div>`;return;}
  root.innerHTML=`<div class="pcenter dots"><div class="idlefig">${shape(0,54,'var(--ink)','var(--red)')}${shape(1,54,'var(--ink)','var(--blue)')}${shape(2,54,'var(--ink)','var(--yel)')}</div><h2>The picker</h2><p>Your teacher is about to pick at random. Watch the big screen.</p></div>`;}

addEventListener('keydown',e=>{if(ROLE!=='host'||G.view!=='pick'||!PK||e.target.closest('input,textarea,select')||$('#saver'))return;
  if(e.key===' '||e.key==='Enter'){e.preventDefault();pickGo();}if(e.key==='Escape'&&PK.phase!=='spin'){const o=$('#pkOver');if(o&&!o.hidden){o.hidden=true;PK.phase='set';syncAll();pickDrawWall();}}});
