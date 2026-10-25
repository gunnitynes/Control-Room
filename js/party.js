/* ====================================================================
   THE LISTENING PARTY — students upload finished work (files or whole folders) from their CADCAST page, alone or as a
   group; the teacher reviews it under Review in the header: by group, play or download. Files come as private links
   (the Worker keeps them 24 h, see integrations/turn/worker.js) or, without file storage, straight over the relay.
   Links are remembered in this browser for 24 h; files that came straight over the relay live until the page reloads.
   ==================================================================== */
'use strict';

const PARTY={list:[],open:false,seen:0,audio:null};
try{const L=JSON.parse(localStorage.getItem('controlroom.party')||'[]');PARTY.list=L.filter(e=>e.url&&Date.now()-e.at<23.5*3600e3);PARTY.seen=PARTY.list.length;}catch(e){}
const partySave=()=>{try{localStorage.setItem('controlroom.party',JSON.stringify(PARTY.list.filter(e=>e.url).map(({blob,burl,...e})=>e)));}catch(e){}};
const pClean=(t,n)=>String(t||'').replace(/[\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,n);
const partyKind=n=>{const e=(String(n).match(/\.([a-z0-9]+)$/i)||[,''])[1].toUpperCase();return {ext:e.slice(0,4)||'FILE',audio:/^(WAV|MP3|AIF|AIFF|FLAC|M4A|OGG)$/.test(e),col:/^(WAV|MP3|AIF|AIFF|FLAC|M4A|OGG)$/.test(e)?'--blue':/^(MID|MIDI)$/.test(e)?'--red':/^(ZIP|ALS|LOGICX|FLP|RPP|PTX)$/.test(e)?'--green':'--yel'};};
const partySize=b=>b>1e6?(b/1e6).toFixed(1)+' MB':Math.max(1,Math.round(b/1e3))+' KB';

// a file has arrived (core pcData): keep it, thank the computer, tell the teacher
function partyAdd(pc,p,meta,src){const uid=pClean(meta.uid,24)||Math.random().toString(36).slice(2,10);
  if(!PARTY.list.some(e=>e.uid===uid)){
    PARTY.list.push({uid,pid:p.id,who:p.name,group:pClean(meta.group,40),name:pClean(meta.name,120)||'file',path:pClean(meta.path,200),size:+meta.size||(src.blob?src.blob.size:0),mime:pClean(meta.mime,60),url:src.url||'',blob:src.blob||null,at:Date.now()});
    partySave();sfx.vote&&sfx.vote();}
  pcSendPc(pc,{t:'party-got',uid});
  const n=$('#bReview');if(n)n.innerHTML=partyBtnHTML();if(PARTY.open)partyDraw();}
const partyBtnHTML=()=>{const n=PARTY.list.length,fresh=n-PARTY.seen;return `Review${n?` <em class="${fresh>0?'new':''}">${fresh>0?'+'+fresh:n}</em>`:''}`;};
const partySrc=e=>e.url||(e.burl||(e.burl=e.blob?URL.createObjectURL(e.blob):''));

function openReview(){PARTY.open=true;PARTY.seen=PARTY.list.length;let ov=$('#review');if(!ov){ov=el('div','reviewov');ov.id='review';document.body.appendChild(ov);}
  partyDraw();const n=$('#bReview');if(n)n.innerHTML=partyBtnHTML();
  ov.onkeydown=null;document.addEventListener('keydown',partyKey,true);}
function closeReview(){PARTY.open=false;partyStop();const ov=$('#review');if(ov)ov.remove();document.removeEventListener('keydown',partyKey,true);const n=$('#bReview');if(n)n.innerHTML=partyBtnHTML();}
function partyKey(e){if(e.key==='Escape'){e.stopPropagation();closeReview();}}
function partyStop(){if(PARTY.audio){PARTY.audio.pause();PARTY.audio=null;}$$('.rvplay.on').forEach(b=>{b.classList.remove('on');b.textContent='▶';});const np=$('#rvNow');if(np)np.innerHTML='';}
// play one file, or a group's files one after another
function partyPlay(list,k=0){partyStop();const e=list[k];if(!e)return;const a=new Audio(partySrc(e));PARTY.audio=a;a.play().catch(()=>toast('Could not play '+e.name));
  const b=$(`.rvplay[data-u="${e.uid}"]`);if(b){b.classList.add('on');b.textContent='■';}
  const np=$('#rvNow');if(np)np.innerHTML=`<span class="lab">Now playing</span><b>${esc(e.name)}</b><span>${esc(e.group||e.who)}</span>`;
  a.onended=()=>{if(PARTY.audio===a){if(list[k+1])partyPlay(list,k+1);else partyStop();}};}
function partyDraw(){const ov=$('#review');if(!ov)return;const L=PARTY.list.slice().sort((a,b)=>b.at-a.at);
  const groups=new Map();L.forEach(e=>{const k=e.group?'g:'+e.group.toLowerCase():'s:'+e.pid;if(!groups.has(k))groups.set(k,{title:e.group||e.who,isGroup:!!e.group,who:new Set(),files:[]});const g=groups.get(k);g.who.add(e.who);g.files.push(e);});
  const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':Math.floor(m/60)+' h ago';};
  ov.innerHTML=`<div class="rvhead"><div><span class="lab">The Listening party · ${L.length} file${L.length===1?'':'s'} from ${groups.size} ${groups.size===1?'group or student':'groups and students'}</span><h1>Review</h1></div>
      <p class="fine">Students upload from their CADCAST page (the Listening party button). Files are kept for 24 hours.</p><button class="ghost" id="rvClose">Close <small>ESC</small></button></div>
    <div class="rvgrid">${[...groups.values()].map((g,gi)=>{const audio=g.files.filter(e=>partyKind(e.name).audio);return `<section class="rvg" style="--c:var(${['--red','--blue','--yel','--green'][gi%4]})">
      <div class="rvgh"><div><b>${esc(g.title)}</b><span>${g.isGroup?esc([...g.who].join(' · ')):'on their own'}</span></div>${audio.length?`<button class="ghost rvall" data-g="${gi}">▶ Play all ${audio.length}</button>`:''}</div>
      ${g.files.map(e=>{const k=partyKind(e.name);return `<div class="rvf"><i style="--c:var(${k.col})">${esc(k.ext)}</i><div><b>${esc(e.name)}</b><span>${esc(e.path&&e.path!==e.name?e.path.replace(/\/[^/]*$/,'')+' · ':'')}${partySize(e.size)} · ${g.isGroup?esc(e.who)+' · ':''}${ago(e.at)}</span></div>
        ${k.audio?`<button class="ghost rvplay" data-u="${esc(e.uid)}" title="Play">▶</button>`:'<span></span>'}<a class="ghost" href="${esc(partySrc(e))}" download="${esc(e.name)}" target="_blank" rel="noopener" title="Download">⬇</a></div>`;}).join('')}</section>`;}).join('')
      ||'<div class="rvempty"><h2>Nothing yet</h2><p>On their computer, students open <b>gunnitynes.github.io/CADCAST/go</b>, click <b>Listening party</b> and drop their files or folder. Working in a group? They type the group name first.</p></div>'}</div>
    <div class="rvnow" id="rvNow"></div>`;
  $('#rvClose',ov).onclick=closeReview;
  const all=[...groups.values()];
  $$('.rvall',ov).forEach(b=>b.onclick=()=>partyPlay(all[+b.dataset.g].files.filter(e=>partyKind(e.name).audio)));
  $$('.rvplay',ov).forEach(b=>b.onclick=()=>{if(b.classList.contains('on')){partyStop();return;}const e=PARTY.list.find(x=>x.uid===b.dataset.u);if(e)partyPlay([e]);});}
