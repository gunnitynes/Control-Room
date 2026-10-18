/* ====================================================================
   THE ROOM VOTE — the teacher opens a ballot, every phone votes, the
   big screen counts it live and crowns a winner.
   openVote(spec) is the whole system; voteGames() is its first use:
   "What do we play next?" over every module.
   spec: {title, sub, kind:'game'|'text', opts:[{v, l, s?, c?}],
          win:{go:label, fn(opt)}}   (c = a colour token like '--red')
   ==================================================================== */
'use strict';

let V=null;
function openVote(spec){
  clearLater();AU_stopAll();
  V={...spec,id:Date.now().toString(36),votes:new Map(),phase:'open',winner:null,tied:[],secret:store.get('vote.secret',false)};
  G.view='vote';G.gs=null;render();syncAll();try{sfx.open();}catch(e){}
}
function voteGames(){
  openVote({title:'What do we play next?',sub:'Every module is on the ballot. Most votes wins.',kind:'game',
    opts:ordered().map(g=>({v:g.id,l:g.name,s:g.tag,c:g.col})),
    win:{go:'Set it up',fn:o=>{G.game=gameById(o.v);G.view='setup';render();syncAll();}}});
}
/* only people still in the room count */
function voteTally(){const t=new Map(V.opts.map(o=>[o.v,0]));V.votes.forEach((v,pid)=>{if(G.players.has(pid)&&t.has(v))t.set(v,t.get(v)+1);});return t;}
const voteCast=()=>[...V.votes.keys()].filter(id=>G.players.has(id)).length;
const voteIcon=(o,kind)=>kind==='game'?((gameById(o.v)||{}).icon||''):shape(V?V.opts.indexOf(o)%4:0,40);

function voteState(p){
  const s={k:V.id+'|'+V.phase,title:V.title,kind:V.kind,ph:V.phase,mine:V.votes.get(p.id)||null,n:voteCast(),of:online().length,
    opts:V.opts.map(o=>({v:o.v,l:o.l,c:o.c,g:V.kind==='game'?((GROUPS.find(x=>x.id===(gameById(o.v)||{}).group)||{}).short||''):''}))};
  if(V.phase==='won'&&V.winner){const t=voteTally();s.win={v:V.winner.v,l:V.winner.l,n:t.get(V.winner.v),tie:V.tied.length>1};}
  return s;
}
function voteAct(p,d){
  if(!V||V.phase!=='open')return;
  const v=d.v==null?null:String(d.v);
  if(v===null)V.votes.delete(p.id);else if(V.opts.some(o=>o.v===v))V.votes.set(p.id,v);else return;
  try{sfx.inn();}catch(e){}
  voteLive(v);syncAll();
}

/* ---------- host: the ballot on the big screen ---------- */
function rVote(st){
  const t=voteTally(),groups=V.kind==='game'?GROUPS.map(gr=>({gr,opts:V.opts.filter(o=>(gameById(o.v)||{}).group===gr.id)})):[{gr:null,opts:V.opts}];
  st.innerHTML=`<div class="vote${V.secret?' secret':''}" id="vote">
    <header class="vhead"><div class="vtt"><span class="vkick"><i></i>Room vote · on your phones now</span><h1>${esc(V.title)}</h1><p>${esc(V.sub||'')}</p></div>
      <div class="vmeter"><div class="vnum"><b id="vN">${voteCast()}</b><span>of <em id="vOf">${online().length}</em><br>voted</span></div><div class="vbar"><i id="vBar"></i></div></div>
      <div class="vbtns"><button class="big go" id="vClose">Close the vote</button>
        <div class="frow"><button class="ghost" id="vSecret" aria-pressed="${V.secret}" title="Hide the counts until the vote closes">Secret ballot</button><button class="ghost" id="vCancel">Cancel</button></div></div></header>
    <div class="vgrid">${groups.map(({gr,opts})=>`<section class="vcol" style="--c:var(${gr?gr.col:'--ink'})">${gr?`<div class="vgh"><i></i><b>${esc(gr.name)}</b></div>`:''}
      <div class="vtiles">${opts.map(o=>`<div class="vt" data-v="${esc(o.v)}" style="--c:var(${o.c||(gr?gr.col:'--red')})"><div class="vfill"></div>
        <span class="vno">${V.kind==='game'?numOf(gameById(o.v)):pad2(V.opts.indexOf(o)+1)}</span><span class="vico">${voteIcon(o,V.kind)}</span>
        <strong>${esc(o.l)}</strong><b class="vcount">${t.get(o.v)||''}</b><span class="vlead">Leading</span></div>`).join('')}</div></section>`).join('')}</div>
    <div class="vover" id="vOver" hidden></div></div>`;
  $('#vClose').onclick=voteClose;
  $('#vCancel').onclick=()=>{V=null;exitGame(true);};
  $('#vSecret').onclick=e=>{V.secret=!V.secret;store.set('vote.secret',V.secret);e.currentTarget.setAttribute('aria-pressed',V.secret);$('#vote').classList.toggle('secret',V.secret);voteLive();};
  voteLive();
  if(V.phase==='won')voteShowWinner(false);
}
/* update the tiles in place, so a new vote bumps a tile instead of redrawing the room */
function voteLive(bump){
  if(!V||G.view!=='vote')return;
  const t=voteTally(),max=Math.max(1,...t.values()),top=Math.max(...t.values()),n=voteCast(),of=Math.max(online().length,n);
  const N=$('#vN');if(N)N.textContent=n;const O=$('#vOf');if(O)O.textContent=of;const B=$('#vBar');if(B)B.style.width=(of?100*n/of:0)+'%';
  $$('.vt').forEach(e=>{const c=t.get(e.dataset.v)||0;e.querySelector('.vcount').textContent=c||'';
    e.style.setProperty('--h',(c?Math.max(8,c/max*100):0)+'%');e.classList.toggle('has',c>0);e.classList.toggle('lead',top>0&&c===top&&V.phase==='open');
    if(bump&&e.dataset.v===bump){e.classList.remove('bump');void e.offsetWidth;e.classList.add('bump');}});
}
function voteClose(){
  if(!V||V.phase!=='open')return;
  const t=voteTally(),top=Math.max(0,...t.values());
  V.phase='count';syncAll();
  const ov=$('#vOver');ov.hidden=false;ov.className='vover count';
  if(!top){V.phase='won';V.winner=null;V.tied=[];ov.innerHTML=`<div class="vwin none"><span class="vkick">Nobody voted</span><h2>The room is undecided</h2><div class="frow"><button class="big go" id="vAgain">Open it again</button><button class="ghost" id="vMenu">Menu</button></div></div>`;
    $('#vAgain').onclick=()=>openVote({...V,votes:undefined});$('#vMenu').onclick=()=>{V=null;exitGame(true);};syncAll();return;}
  V.tied=V.opts.filter(o=>t.get(o.v)===top);
  $('#vote').classList.add('closed','reveal');$('#vote').classList.remove('secret');voteLive();
  let k=3;ov.innerHTML=`<div class="vcd"><b id="vCd">3</b><span>counting the votes</span></div>`;try{sfx.tick(3);}catch(e){}
  const step=()=>{k--;if(k>0){$('#vCd').textContent=k;try{sfx.tick(k);}catch(e){}later(step,800);return;}
    ov.hidden=true;V.tied.length>1?voteTieBreak():voteDecide(V.tied[0]);};
  later(step,800);
}
/* a tie: the spotlight hops between the tied modules, slows down and lands */
function voteTieBreak(){
  const ids=V.tied.map(o=>o.v),pickO=pick(V.tied),land=ids.indexOf(pickO.v),hops=ids.length*4+land;
  $('#vote').classList.add('tie');const lab=$('#vOver');lab.hidden=false;lab.className='vover tieban';lab.innerHTML=`<div class="vtieb">Tie! ${V.tied.length} modules · the spotlight decides</div>`;
  let i=0;const hop=()=>{$$('.vt').forEach(e=>e.classList.toggle('spot',e.dataset.v===ids[i%ids.length]));try{sfx.spin();}catch(e){}
    if(i>=hops){later(()=>{lab.hidden=true;$('#vote').classList.remove('tie');voteDecide(pickO);},700);return;}
    i++;later(hop,90+Math.pow(i/hops,2.2)*520);};
  later(hop,600);
}
function voteDecide(o){V.winner=o;V.phase='won';syncAll();voteShowWinner(true);}
function voteShowWinner(fresh){
  const o=V.winner;if(!o)return;const t=voteTally(),n=t.get(o.v),all=voteCast();
  $$('.vt').forEach(e=>{e.classList.toggle('win',e.dataset.v===o.v);e.classList.remove('spot','lead');});
  const g=V.kind==='game'?gameById(o.v):null,ov=$('#vOver');ov.hidden=false;ov.className='vover won';
  ov.innerHTML=`<canvas id="conf"></canvas><div class="vwin" style="--c:var(${o.c||'--red'})"><span class="vkick">The room chose${V.tied.length>1?' · after a tie':''}</span>
    <div class="vwico">${voteIcon(o,V.kind)}</div>${g?`<span class="vwno">${numOf(g)}</span>`:''}<h2>${esc(o.l)}</h2>${o.s?`<p>${esc(o.s)}</p>`:''}
    <div class="vwn"><b>${n}</b><span>of ${all} vote${all===1?'':'s'}</span></div>
    <div class="frow">${V.win?`<button class="big go" id="vGo">${esc(V.win.go)} →</button>`:''}<button class="ghost" id="vAgain">Vote again</button><button class="ghost" id="vMenu">Menu</button></div></div>`;
  if(V.win)$('#vGo').onclick=()=>{const w=V.win,ow=V.winner;V=null;clearLater();w.fn(ow);};
  $('#vAgain').onclick=()=>{const {title,sub,kind,opts,win}=V;openVote({title,sub,kind,opts,win});};
  $('#vMenu').onclick=()=>{V=null;exitGame(true);};
  if(fresh){try{sfx.fanfare();}catch(e){}}
  confetti($('#conf'));
}
addEventListener('keydown',e=>{if(ROLE!=='host'||G.view!=='vote'||!V||e.target.closest('input,textarea,select'))return;
  if(e.key==='Enter'){e.preventDefault();if(V.phase==='open')voteClose();else if(V.phase==='won'&&$('#vGo'))$('#vGo').click();}});

/* ---------- phone: the ballot ---------- */
function pVote(root,s){
  if(s.ph==='won'){
    if(!s.win){root.innerHTML=`<div class="pcenter dots"><h2>No winner</h2><p>Nobody voted. Watch the big screen.</p></div>`;return;}
    const mine=s.mine===s.win.v,g=s.kind==='game'?gameById(s.win.v):null,o=s.opts.find(x=>x.v===s.win.v)||{};
    root.innerHTML=`<div class="pvwon" style="--c:var(${o.c||'--red'})"><span class="lab">The room chose</span><div class="pvwico">${g?g.icon:shape(0,80)}</div><h2>${esc(s.win.l)}</h2>
      <p class="pvwn"><b>${s.win.n}</b> vote${s.win.n===1?'':'s'}${s.win.tie?' · won the tie':''}</p>
      <p class="pvyou ${mine?'yes':''}">${mine?'✓ Your pick won':s.mine?`You voted ${esc((s.opts.find(x=>x.v===s.mine)||{}).l||'')}`:'You didn’t vote'}</p></div>`;
    if(mine)papi.vibe([40,40,40]);return;
  }
  if(s.ph==='count'){root.innerHTML=`<div class="pcenter dots"><div class="idlefig">${shape(0,54,'var(--ink)','var(--red)')}${shape(1,54,'var(--ink)','var(--blue)')}${shape(2,54,'var(--ink)','var(--yel)')}</div><h2>Counting…</h2><p>Eyes on the big screen.</p></div>`;return;}
  const grp=[...new Set(s.opts.map(o=>o.g))];
  root.innerHTML=`<div class="pvote"><div class="pvhead"><span class="lab">Room vote</span><h2>${esc(s.title)}</h2><p>Tap one. Change your mind until the vote closes.</p></div>
    ${grp.map(gn=>`${gn?`<div class="pvgh">${esc(gn)}</div>`:''}<div class="pvtiles">${s.opts.filter(o=>o.g===gn).map(o=>{const g=s.kind==='game'?gameById(o.v):null;
      return `<button class="pvt" data-v="${esc(o.v)}" style="--c:var(${o.c||'--red'})" aria-pressed="false"><span class="pvico">${g?g.icon:shape(s.opts.indexOf(o)%4,34)}</span><strong>${esc(o.l)}</strong><i class="pvchk">✓</i></button>`;}).join('')}</div>`).join('')}
    <div class="pvfoot"><span id="pvMine"></span><b id="pvN"></b></div></div>`;
  $$('.pvt',root).forEach(b=>b.onclick=()=>{const v=b.dataset.v,cur=PL.st&&PL.st.s&&PL.st.s.mine;const nv=cur===v?null:v;
    if(PL.st&&PL.st.s)PL.st.s.mine=nv;pVoteUpdate(root,PL.st.s);papi.vibe(nv?20:8);pSendVote(nv);});
  pVoteUpdate(root,s);
}
function pSendVote(v){const m={t:'vote',v};if(PL.conn&&PL.conn.open)try{PL.conn.send(m);}catch(e){}}
function pVoteUpdate(root,s){
  if(!root||s.ph!=='open')return;
  $$('.pvt',root).forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===s.mine));
  const o=s.opts.find(x=>x.v===s.mine),m=$('#pvMine',root),n=$('#pvN',root);
  if(m)m.innerHTML=o?`Your vote <b>${esc(o.l)}</b>`:'Pick a module';if(n)n.textContent=`${s.n}/${Math.max(s.of,s.n)} voted`;
  root.querySelector('.pvfoot').classList.toggle('set',!!o);
}
