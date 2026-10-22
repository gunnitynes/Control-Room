/* =====================================================================
   SUPPLY DROP — the teacher's materials, dealt at random to every student computer
   The teacher loads a folder of anything (audio, MIDI, stems, project zips) into this browser (clipDB dec -6).
   Each deal sends every CADCAST-paired computer a random pick (pcSendFile, kind 'drop'); it lands on the
   computer's CADCAST page ready to drag into the DAW. Phones show what arrived and can swap one item per deal.
   ===================================================================== */
const dropPool=()=>(typeof MYCLIPS==='undefined'?[]:MYCLIPS.list).filter(c=>c.dec===-6).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
const dropExt=n=>(String(n).match(/\.([a-z0-9]+)$/i)||[,''])[1].toUpperCase();
const dropKind=n=>{const e=dropExt(n);return /^(WAV|MP3|AIF|AIFF|FLAC|M4A|OGG)$/.test(e)?'audio':/^(MID|MIDI)$/.test(e)?'midi':/^(ZIP|ALS|LOGICX|FLP|RPP|PTX)$/.test(e)?'project':'file';};
const DROP_COL={audio:'--blue',midi:'--red',project:'--green',file:'--yel'};
const dropLabel=c=>c.label||(c.path&&c.path.split('/').slice(-2,-1)[0])||'';
const dropName=c=>String(c.name).replace(/\.[a-z0-9]+$/i,'');

game({
  id:'drop',group:'make',name:'Supply Drop',tag:'Random material from the teacher lands on every student’s computer. Make something with what you got.',
  how:['Your teacher has a crate of material: loops, MIDI, stems, sounds.','Every deal drops a random pick on your computer (through CADCAST). Drag it into your DAW.','Don’t like it? Swap one item once per deal. Then make something with it.'],
  badges:['CADCAST','No score','Materials'],kind:'free',
  icon:`<svg viewBox="0 0 64 64"><path d="M16 6 h32 l-6 14 h-20 z" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><path d="M22 20 L28 34 M42 20 L36 34" stroke="var(--ink)" stroke-width="2.5"/><rect x="18" y="34" width="28" height="24" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/><path d="M18 42 h28 M32 34 v24" stroke="var(--ink)" stroke-width="2.5"/></svg>`,
  options:[
    {key:'n',label:'Items each',choices:[[1,'1','item'],[2,'2','items'],[3,'3','items']],def:1},
    {key:'mode',label:'Deal',choices:[['unique','No repeats','nobody gets the same item while the pool lasts'],['random','Anything goes','fully random'],['same','Same for everyone','one random set for the whole room']],def:'unique'},
    {key:'swap',label:'Swaps',choices:[[1,'One swap','per deal'],[0,'No swaps','keep what you got']],def:1},
  ],
  note:'Your materials stay in this browser and go only to the computers in your room. Files arrive on each student’s CADCAST page (gunnitynes.github.io/CADCAST/go), ready to drag into the DAW.',
  check(){return dropPool().length?'':'Load your materials first';},
  setupExtra(){const P=dropPool(),k={};P.forEach(c=>{const t=dropKind(c.name);k[t]=(k[t]||0)+1;});
    return `<div class="fsec mxsongs"><h3><b>▤</b>Your materials<small>${P.length?`${P.length} items`:'nothing loaded yet'} · stay in this browser</small></h3>
      <div class="chimport"><label class="big go">${P.length?'Load a different folder':'Load your materials folder'}<input type="file" id="drFolder" webkitdirectory multiple hidden></label><span class="chprog" id="drProg"></span>
        <p class="fine">Any files: WAV, MP3, MIDI, stems, project zips. Subfolders are kept as labels (e.g. “Drums”, “Chords”). Up to 100 MB per file.</p></div>
      ${P.length?`<div class="drkinds">${Object.entries(k).map(([t,n])=>`<span style="--c:var(${DROP_COL[t]})"><b>${n}</b>${t}</span>`).join('')}</div><button class="ghost" id="drClear">Remove your materials</button>`:''}</div>`;},
  setupBind(st,redraw){const fo=$('#drFolder',st);
    if(fo)fo.onchange=async()=>{const files=[...fo.files].filter(f=>!/^\./.test(f.name)&&f.size>0);if(!files.length){toast('No files in that folder');return;}const prog=$('#drProg',st);let n=0,big=0;
      for(const c of dropPool())await clipDB.del(c.id);
      for(const f of files){if(f.size>100e6){big++;continue;}const path=f.webkitRelativePath||f.name;await clipDB.put({id:'dr:'+path,dec:-6,name:f.name,path,blob:f,at:Date.now()+n});n++;if(prog)prog.textContent=`Saving ${n} of ${files.length}…`;}
      await loadMyClips();toast(`${n} items saved in this browser${big?` · ${big} over 100 MB skipped`:''}`);redraw();};
    const cl=$('#drClear',st);if(cl)cl.onclick=async()=>{if(!confirm('Remove all your materials from this browser?'))return;for(const c of dropPool())await clipDB.del(c.id);await loadMyClips();redraw();};},
  topInfo(){const s=G.gs;return !s?this.tag:s.round?`Drop ${s.round} · ${s.o.n} item${s.o.n>1?'s':''} each`:'Ready to drop';},
  start(o){G.gs={o,round:0,got:new Map(),status:new Map(),swapped:new Set(),used:new Set(),phase:'ready',landing:false};},
  // what each student gets this round
  deal(){const s=G.gs,pool=dropPool(),ps=online(),n=s.o.n;s.round++;s.got=new Map();s.status=new Map();s.swapped=new Set();
    if(!pool.length)return;
    if(s.o.mode==='same'){const set=shuffle(pool).slice(0,n);ps.forEach(p=>s.got.set(p.id,set.map(c=>c.id)));}
    else if(s.o.mode==='random')ps.forEach(p=>s.got.set(p.id,shuffle(pool).slice(0,n).map(c=>c.id)));
    else{let bag=shuffle(pool.filter(c=>!s.used.has(c.id)));if(bag.length<ps.length*n){s.used=new Set();bag=shuffle(pool);}
      ps.forEach(p=>{const mine=[];while(mine.length<n){if(!bag.length)bag=shuffle(pool);const c=bag.shift();if(!mine.includes(c.id))mine.push(c.id);}mine.forEach(id=>s.used.add(id));s.got.set(p.id,mine);});}
    ps.forEach(p=>this.send(p));},
  send(p,only){const s=G.gs,ids=s.got.get(p.id)||[],r=s.round;
    if(!pcFor(p)){s.status.set(p.id,{st:'nopc'});return;}
    const st={st:'sending',done:0,of:ids.length};s.status.set(p.id,st);
    (async()=>{for(const id of (only?[only]:ids)){const c=dropPool().find(x=>x.id===id);if(!c)continue;
        const ok=await pcSendFile(p,{kind:'drop',round:r,name:c.name,label:dropLabel(c)},c.blob);if(G.gs!==s||s.round!==r)return;if(ok)st.done++;else st.st='fail';this.live();}
      if(st.st!=='fail')st.st='sent';sync(p);this.live();})();},
  go(){const s=G.gs;s.phase='dealt';s.landing=true;this.deal();sfx.whoosh&&sfx.whoosh();render();syncAll();setTimeout(()=>{if(G.gs===s){s.landing=false;}},1500);},
  next(){this.go();},
  onJoin(p){const s=G.gs;if(s&&s.phase==='dealt'&&!s.got.has(p.id)){const pool=dropPool();s.got.set(p.id,shuffle(pool).slice(0,s.o.n).map(c=>c.id));this.send(p);sync(p);render();}},
  onPair(p){const s=G.gs;if(s&&s.phase==='dealt'&&s.got.has(p.id)&&(s.status.get(p.id)||{}).st==='nopc'){this.send(p);sync(p);this.live();}},
  act(p,d){const s=G.gs;if(d.t!=='swap'||s.phase!=='dealt'||!s.o.swap||s.swapped.has(p.id))return;const L=s.got.get(p.id);if(!L)return;const k=Math.max(0,Math.min(L.length-1,+d.k||0));
    const pool=dropPool().filter(c=>!L.includes(c.id)),fresh=pool.filter(c=>!s.used.has(c.id)),c=pick(fresh.length?fresh:pool);if(!c)return;
    L[k]=c.id;s.used.add(c.id);s.swapped.add(p.id);sfx.card&&sfx.card();if(pcFor(p)){const st=s.status.get(p.id)||{};st.st='sending';this.send(p,c.id);}sync(p);render();},
  live(){const box=$('#drWall');if(box)box.innerHTML=this.wall();},
  wall(){const s=G.gs,P=dropPool();return online().map(p=>{const L=(s.got.get(p.id)||[]).map(id=>P.find(c=>c.id===id)).filter(Boolean),st=s.status.get(p.id)||{};
    const lab={sending:`sending ${st.done||0}/${st.of||L.length}…`,sent:'✓ on their computer',fail:'not delivered',nopc:'no CADCAST: on the phone only'}[st.st]||'';
    return `<div class="drcard c${p.sh} st-${st.st||''}${s.landing?' land':''}" style="--d:${Math.random()*0.6}s"><div class="drwho"><b>${esc(p.name)}</b><span>${esc(lab)}</span></div>${L.map(c=>{const t=dropKind(c.name);return `<div class="dritem" style="--c:var(${DROP_COL[t]})"><i>${esc(dropExt(c.name)||'FILE')}</i><b>${esc(dropName(c))}</b>${dropLabel(c)?`<small>${esc(dropLabel(c))}</small>`:''}</div>`;}).join('')}${s.swapped.has(p.id)?'<em>swapped one</em>':''}</div>`;}).join('')||'<p class="fine">Waiting for students…</p>';},
  render(st){const s=G.gs,P=dropPool(),paired=online().filter(p=>pcFor(p)).length;
    if(s.phase==='ready'){st.innerHTML=`<div class="drop ph-ready"><div class="dbig"><div class="drcrate">${[0,1,2].map(i=>`<i style="--i:${i}"></i>`).join('')}</div><span class="lab">Supply Drop</span><h2>The crate is packed</h2>
        <p>${P.length} items. Every student gets ${s.o.n} at random${s.o.mode==='same'?' (the same for everyone)':s.o.mode==='unique'?', no repeats':''}. ${paired} of ${online().length} computer${online().length===1?'':'s'} signed in through CADCAST.</p></div>
      <div class="dfoot"><span class="fine">Students without CADCAST see their items on the phone</span><button class="big go" id="bNext">Drop it <small>SPACE</small></button></div></div>`;$('#bNext').onclick=()=>this.next();return;}
    st.innerHTML=`<div class="drop ph-dealt"><div class="drhead"><span class="lab">Supply Drop ${s.round}</span><h2>Make something with it</h2><p>${s.o.swap?'One swap each, from the phone. ':''}Drag your files from the CADCAST page into your DAW.</p></div>
      <div class="drwall" id="drWall">${this.wall()}</div>
      <div class="dfoot"><span class="fine">${P.length} items in the crate</span><button class="big go" id="bNext">Drop again <small>SPACE</small></button></div></div>`;
    $('#bNext').onclick=()=>this.next();},
  pstate(p){const s=G.gs,P=dropPool(),L=(s.got.get(p.id)||[]).map(id=>P.find(c=>c.id===id)).filter(Boolean),st=s.status.get(p.id)||{};
    return {k:'dr'+s.round+L.map(c=>c.id).join('|')+(st.st||'')+(s.swapped.has(p.id)?'s':''),ph:s.phase,round:s.round,
      items:L.map(c=>({name:dropName(c),ext:dropExt(c.name),kind:dropKind(c.name),label:dropLabel(c)})),st:st.st||'',canSwap:!!s.o.swap&&!s.swapped.has(p.id)};},
  player(root,st){
    if(st.ph==='ready'){root.innerHTML=`<div class="pcenter dots"><div class="drcrate small"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i></div><h2>Supply drop incoming</h2><p>Open <b>gunnitynes.github.io/CADCAST/go</b> on your computer so the files land there.</p></div>`;return;}
    const where=st.st==='sent'?'✓ On your computer: drag it into your DAW.':st.st==='sending'?'Landing on your computer…':st.st==='fail'?'Didn’t reach your computer. Ask your teacher to drop again.':'Your computer isn’t signed in through CADCAST: open gunnitynes.github.io/CADCAST/go and scan its code.';
    root.innerHTML=`<div class="pcol2"><h2 class="pbigt">Your drop</h2>${st.items.map((c,k)=>`<div class="dritem big" style="--c:var(${DROP_COL[c.kind]})"><i>${esc(c.ext||'FILE')}</i><b>${esc(c.name)}</b>${c.label?`<small>${esc(c.label)}</small>`:''}${st.canSwap?`<button class="ghost drswap" data-k="${k}">Swap</button>`:''}</div>`).join('')}
      <p class="drwhere">${esc(where)}</p>${st.canSwap?'<p class="fine">One swap this drop.</p>':''}</div>`;
    $$('.drswap',root).forEach(b=>b.onclick=()=>{papi.send({t:'swap',k:+b.dataset.k});papi.vibe(20);$$('.drswap',root).forEach(x=>x.disabled=true);});},
});
