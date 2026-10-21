/* ====================================================================
   THE ROOM TIMER — a countdown in the header, in every view (menu, games, vote, picker).
   The teacher sets it from the Timer button (presets or any minutes); the phones show the same countdown in their
   header, and when it runs out the big screen shouts TIME! and every phone vibrates and shows Time's up.
   host → phone: {t:'timer', left, T, paused, done}   (left/T in ms; left:0,T:0 = no timer)
   ==================================================================== */
'use strict';

const TMR={end:0,T:0,paused:null,done:false};
const tmrLeft=()=>TMR.paused!=null?TMR.paused:TMR.end?Math.max(0,TMR.end-Date.now()):0;
const tmrOn=()=>!!(TMR.end||TMR.paused!=null);
const tmrFmt=ms=>{const s=Math.ceil(ms/1000),m=Math.floor(s/60);return m>=60?`${Math.floor(m/60)}:${pad2(m%60)}:${pad2(s%60)}`:`${m}:${pad2(s%60)}`;};
const TMR_ICON=`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="8" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 13.5V9M9 2.5h6" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/></svg>`;

/* ---------- host */
function tmrMsg(){return {t:'timer',left:tmrLeft(),T:TMR.T,paused:TMR.paused!=null,done:TMR.done,sfx:!!SFX.on};}
function tmrSendAll(){const m=tmrMsg();G.players.forEach(p=>{if(p.conn&&p.conn.open)try{p.conn.send(m);}catch(e){}});}
function tmrJoin(p){if(tmrOn()||TMR.done)try{p.conn.send(tmrMsg());}catch(e){}}
function tmrStart(min){const ms=Math.round(min*60000);if(!(ms>0))return;TMR.T=ms;TMR.end=Date.now()+ms;TMR.paused=null;TMR.done=false;tmrSendAll();tmrPaint();tmrMenuClose();}
function tmrPause(){if(!tmrOn())return;if(TMR.paused!=null){TMR.end=Date.now()+TMR.paused;TMR.paused=null;}else{TMR.paused=tmrLeft();TMR.end=0;}tmrSendAll();tmrPaint();tmrMenu(true);}
function tmrAdd(min){if(!tmrOn())return tmrStart(min);const ms=min*60000;if(TMR.paused!=null)TMR.paused+=ms;else TMR.end+=ms;TMR.T+=ms;tmrSendAll();tmrPaint();tmrMenu(true);}
function tmrStop(){TMR.end=0;TMR.T=0;TMR.paused=null;TMR.done=false;tmrSendAll();tmrPaint();tmrMenuClose();}
function tmrBtnHTML(){const on=tmrOn(),l=tmrLeft();
  return `<button class="ghost tmrbtn${on?' on':''}${on&&l<=10000&&TMR.paused==null?' hot':''}${TMR.paused!=null?' paused':''}" id="bTmr" title="Room timer: the phones count down too">${TMR_ICON}<span id="tmrTxt">${on?tmrFmt(l):'Timer'}</span>${on?`<i class="tmrbar"><i id="tmrBar" style="width:${TMR.T?100*l/TMR.T:0}%"></i></i>`:''}</button>`;}
function tmrBind(){const b=$('#bTmr');if(b)b.onclick=e=>{e.stopPropagation();$('#tmrMenu')?tmrMenuClose():tmrMenu();};}
// redraw just the button (the header is rebuilt by render(); this keeps it current between renders)
function tmrPaint(){const b=$('#bTmr');if(!b)return;const w=document.createElement('div');w.innerHTML=tmrBtnHTML();b.replaceWith(w.firstChild);tmrBind();}
setInterval(()=>{if(ROLE!=='host')return;
  if(TMR.end&&!TMR.done&&Date.now()>=TMR.end){TMR.end=0;TMR.done=true;TMR.paused=null;tmrSendAll();tmrPaint();tmrFire();return;}
  if(!tmrOn())return;const l=tmrLeft(),t=$('#tmrTxt'),bar=$('#tmrBar'),b=$('#bTmr');if(t)t.textContent=tmrFmt(l);if(bar)bar.style.width=(TMR.T?100*l/TMR.T:0)+'%';if(b)b.classList.toggle('hot',l<=10000&&TMR.paused==null);
  const ml=$('#tmrBig');if(ml)ml.textContent=tmrFmt(l);},250);

function tmrMenu(keep){let m=$('#tmrMenu');if(m&&!keep)return;if(!m){m=el('div','tmrmenu');m.id='tmrMenu';document.body.appendChild(m);setTimeout(()=>document.addEventListener('click',tmrOutside),0);}
  const b=$('#bTmr');if(b){const r=b.getBoundingClientRect();m.style.top=(r.bottom+10)+'px';m.style.right=Math.max(8,innerWidth-r.right)+'px';}
  const on=tmrOn(),last=store.get('tmr.last',5);
  m.innerHTML=`<span class="lab">Room timer · phones count down too</span>
    ${on?`<div class="tmrnow"><b id="tmrBig">${tmrFmt(tmrLeft())}</b><span>${TMR.paused!=null?'paused':'left'}</span></div>
      <div class="frow"><button class="big go" id="tmrPause">${TMR.paused!=null?'Resume':'Pause'}</button><button class="ghost" id="tmrPlus">＋1 min</button><button class="ghost" id="tmrStop">Stop</button></div><span class="lab">Or start again</span>`:''}
    <div class="tmrpre">${[1,2,3,5,10,15,20,30].map(n=>`<button data-m="${n}">${n}<small>min</small></button>`).join('')}</div>
    <form class="tmrcus" id="tmrCus"><input id="tmrIn" type="number" min="0.25" max="180" step="0.25" value="${last}" aria-label="Minutes"><span>min</span><button class="big go">Start</button></form>`;
  $$('.tmrpre button',m).forEach(x=>x.onclick=()=>tmrStart(+x.dataset.m));
  $('#tmrCus',m).onsubmit=e=>{e.preventDefault();const v=parseFloat($('#tmrIn',m).value);if(v>0){store.set('tmr.last',v);tmrStart(v);}};
  const ps=$('#tmrPause',m);if(ps)ps.onclick=tmrPause;const pl=$('#tmrPlus',m);if(pl)pl.onclick=()=>tmrAdd(1);const st=$('#tmrStop',m);if(st)st.onclick=tmrStop;}
function tmrOutside(e){const m=$('#tmrMenu');if(!m){document.removeEventListener('click',tmrOutside);return;}if(!m.contains(e.target)&&!e.target.closest('#bTmr'))tmrMenuClose();}
function tmrMenuClose(){const m=$('#tmrMenu');if(m)m.remove();document.removeEventListener('click',tmrOutside);}

// time's up on the phones: one soft, low boop (the big screen stays silent)
function tmrBoop(){try{const ac=audio();const t=ac.currentTime+.05,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(520,t);o.frequency.exponentialRampToValueAtTime(330,t+.25);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.03);g.gain.exponentialRampToValueAtTime(.0008,t+.5);o.connect(g).connect(AU.music||ac.destination);o.start(t);o.stop(t+.55);}catch(e){}}
function tmrFire(){let o=$('#tmrDone');if(o)o.remove();o=el('div','tmrdone');o.id='tmrDone';
  o.innerHTML=`<div class="tmrdcard"><span class="lab">Room timer · ${tmrFmt(TMR.T)}</span><h1>Time!</h1><p>Every phone just got the message.</p><button class="big go" id="tmrOk">OK <small>ESC</small></button></div>`;
  document.body.appendChild(o);const close=()=>{o.remove();TMR.done=false;TMR.T=0;TMR.end=0;TMR.paused=null;tmrSendAll();tmrPaint();};$('#tmrOk',o).onclick=close;o.onclick=e=>{if(e.target===o)close();};}
addEventListener('keydown',e=>{if(ROLE!=='host')return;if(e.key==='Escape'){if($('#tmrDone')){e.stopPropagation();$('#tmrOk').click();}else tmrMenuClose();}},true);

/* ---------- phones */
function pTmrMsg(m){PL.tmr=m.T||m.done?{end:Date.now()+(+m.left||0),T:+m.T||0,paused:m.paused?+m.left:null,done:!!m.done,sfx:!!m.sfx}:null;pTmrPaint();
  if(m.done)pTmrFire();}
function pTmrPill(){const t=PL.tmr;if(!t||t.done||pTmrBigOn())return '';const l=t.paused!=null?t.paused:Math.max(0,t.end-Date.now());
  return `<div class="ptmr${t.paused!=null?' paused':''}" id="pTmr">${TMR_ICON}<b id="pTmrTxt">${tmrFmt(l)}</b></div>`;}
// between games (the phone's idle screen) the countdown fills the screen under the header; in a game it stays a pill
const pTmrBigOn=()=>{const t=PL.tmr,s=PL.st;return !!(t&&!t.done&&PL.joined&&s&&(s.view==='menu'||!s.view));};
function pTmrBig(){let b=$('#pTmrBig');if(!pTmrBigOn()){if(b)b.remove();return;}const h=$('.ptop');
  if(!b){b=el('div','ptmrbig');b.id='pTmrBig';b.innerHTML=`<span class="lab">Your teacher’s timer</span><b id="pTmrBigTxt"></b><i class="ptmrbar"><i id="pTmrBigBar"></i></i><span class="ptmrst" id="pTmrBigSt"></span>`;document.body.appendChild(b);}
  b.style.top=(h?h.getBoundingClientRect().bottom:0)+'px';pTmrFrame();}
function pTmrPaint(){pTmrBig();const h=$('.ptop');if(!h)return;let p=$('#pTmr');const html=pTmrPill();if(!html){if(p)p.remove();return;}if(p)p.outerHTML=html;else{const who=$('.who',h);if(who)who.insertAdjacentHTML('beforebegin',html);else h.insertAdjacentHTML('beforeend',html);}}
function pTmrFrame(){const t=PL.tmr;if(!t||t.done)return;const l=t.paused!=null?t.paused:Math.max(0,t.end-Date.now()),e=$('#pTmrTxt'),p=$('#pTmr'),hot=l<=10000&&t.paused==null;if(e)e.textContent=tmrFmt(l);if(p)p.classList.toggle('hot',hot);
  const B=$('#pTmrBig');if(B){$('#pTmrBigTxt').textContent=tmrFmt(l);$('#pTmrBigBar').style.width=(t.T?100*l/t.T:0)+'%';$('#pTmrBigSt').textContent=t.paused!=null?'paused':'';B.classList.toggle('hot',hot);B.classList.toggle('paused',t.paused!=null);}}
function pTmrFire(){if($('#pTmrDone'))return;try{navigator.vibrate&&navigator.vibrate([500,180,500,180,900]);}catch(e){}tmrBoop();
  const big=$('#pTmrBig');if(big)big.remove();const o=el('div','ptmrdone');o.id='pTmrDone';const hd=$('.ptop');if(hd)o.style.top=hd.getBoundingClientRect().bottom+'px';o.innerHTML=`<div><span class="lab">Your teacher’s timer</span><h1>Time’s<br>up!</h1><p>Tap to close</p></div>`;document.body.appendChild(o);o.onclick=()=>o.remove();}
