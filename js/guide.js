/* ====================================================================
   GUIDE TO THE CONTROL ROOM
   A poster-style tour, built from the game registry so it never goes stale: every module with its icon,
   how the phone plays it (little phone screens), its variations (from its options) and a lesson idea
   (data/content.js → GUIDE). Opens from a phone once connected, or on its own at ?guide.
   ==================================================================== */
// tiny phone screens, one per way of playing (60 × 100)
const GUIDE_PLAY=(()=>{const I='var(--ink)',P='var(--paper)';
  const sh=(i,x,y,s)=>i===0?`<circle cx="${x}" cy="${y}" r="${s}" fill="var(--red)" stroke="${I}" stroke-width="2"/>`:i===1?`<rect x="${x-s}" y="${y-s}" width="${s*2}" height="${s*2}" fill="var(--blue)" stroke="${I}" stroke-width="2"/>`
    :i===2?`<polygon points="${x},${y-s} ${x+s},${y+s*.8} ${x-s},${y+s*.8}" fill="var(--yel)" stroke="${I}" stroke-width="2"/>`:`<polygon points="${x},${y-s} ${x+s},${y} ${x},${y+s} ${x-s},${y}" fill="var(--green)" stroke="${I}" stroke-width="2"/>`;
  const frame=b=>`<svg viewBox="0 0 60 100" class="gph"><rect x="2" y="2" width="56" height="96" rx="8" fill="${P}" stroke="${I}" stroke-width="3"/><rect x="22" y="6" width="16" height="3" rx="1.5" fill="${I}"/>${b}</svg>`;
  return {
    tap4:{label:'Tap one of four',svg:frame([0,1,2,3].map(i=>`<rect x="8" y="${16+i*19}" width="44" height="16" fill="color-mix(in srgb,var(--${['red','blue','yel','green'][i]}) 30%,#fff)" stroke="${I}" stroke-width="2"/>${sh(i,17,24+i*19,4.5)}`).join(''))},
    slider:{label:'Slide to the answer',svg:frame(`<text x="30" y="40" text-anchor="middle" font-family="Archivo" font-weight="900" font-size="16" fill="var(--red)">1k</text><rect x="9" y="56" width="42" height="5" fill="var(--hair)" stroke="${I}" stroke-width="1.5"/><rect x="9" y="56" width="26" height="5" fill="var(--red)"/><circle cx="35" cy="58.5" r="6" fill="${P}" stroke="${I}" stroke-width="2.5"/><rect x="9" y="76" width="42" height="12" fill="var(--green)" stroke="${I}" stroke-width="2"/>`)},
    keys:{label:'Play the note',svg:frame(`<rect x="7" y="34" width="46" height="40" fill="#fff" stroke="${I}" stroke-width="2"/>${[1,2,3,4,5,6].map(i=>`<line x1="${7+i*6.57}" y1="34" x2="${7+i*6.57}" y2="74" stroke="${I}" stroke-width="1.2"/>`).join('')}${[0,1,3,4,5].map(i=>`<rect x="${11.5+i*6.57}" y="34" width="4" height="24" fill="${I}"/>`).join('')}<rect x="20.1" y="34" width="6.57" height="40" fill="var(--blue)" opacity=".85"/>`)},
    knobs:{label:'Turn the knobs',svg:frame([0,1,2,3,4,5,6,7].map(i=>{const x=16+(i%4)*9.5,y=36+Math.floor(i/4)*22,a=-2.3+((i*37)%10)/10*4.6;return `<circle cx="${x}" cy="${y}" r="4.2" fill="#fff" stroke="${I}" stroke-width="1.6"/><line x1="${x}" y1="${y}" x2="${(x+Math.sin(a)*4).toFixed(1)}" y2="${(y-Math.cos(a)*4).toFixed(1)}" stroke="var(--${['red','blue','yel','green'][i%4]})" stroke-width="2"/>`;}).join('')+`<rect x="9" y="80" width="42" height="10" fill="var(--green)" stroke="${I}" stroke-width="2"/>`)},
    tempo:{label:'Tap the tempo',svg:frame(`<text x="30" y="32" text-anchor="middle" font-family="Archivo" font-weight="900" font-size="15" fill="var(--red)">104</text><circle cx="30" cy="58" r="15" fill="var(--yel)" stroke="${I}" stroke-width="2.5"/><text x="30" y="62" text-anchor="middle" font-family="Archivo" font-weight="900" font-size="9" fill="${I}">TAP</text><rect x="9" y="82" width="42" height="9" fill="var(--green)" stroke="${I}" stroke-width="2"/>`)},
    order:{label:'Put them in order',svg:frame(`${[0,1,2,3].map(i=>`<rect x="${7+i*12}" y="28" width="10" height="10" fill="#fff" stroke="${I}" stroke-width="1.5"/>`).join('')}${sh(2,12,33,3.5)}${sh(0,24,33,3.5)}<path d="M10 46 h40" stroke="${I}" stroke-width="1.5" stroke-dasharray="2 2"/>${[1,3].map((i,k)=>sh(i,20+k*20,64,7)).join('')}`)},
    match:{label:'Match the cards',svg:frame(`<rect x="9" y="16" width="42" height="34" fill="#fff" stroke="${I}" stroke-width="2"/><path d="M13 44 L22 22 L30 36 L38 28 L47 44" fill="none" stroke="var(--red)" stroke-width="2.5"/>${[0,1,2,3].map(i=>`<rect x="${8+i*11}" y="60" width="9" height="9" fill="#fff" stroke="${I}" stroke-width="1.2"/>${sh(i,12.5+i*11,64.5,2.8)}`).join('')}<rect x="9" y="80" width="42" height="9" fill="var(--green)" stroke="${I}" stroke-width="2"/>`)},
    reels:{label:'Spin and keep',svg:frame(`${[0,1,2].map(i=>`<rect x="8" y="${16+i*15}" width="44" height="12" fill="color-mix(in srgb,var(--${['red','blue','yel'][i]}) 35%,#fff)" stroke="${I}" stroke-width="2"/>`).join('')}<circle cx="30" cy="76" r="12" fill="var(--red)" stroke="${I}" stroke-width="2.5"/><text x="30" y="80" text-anchor="middle" font-family="Archivo" font-weight="900" font-size="8" fill="#fff">TAP</text>`)},
    mission:{label:'Take a mission',svg:frame(`<rect x="7" y="16" width="46" height="44" fill="#fff" stroke="${I}" stroke-width="2.5"/><rect x="11" y="22" width="30" height="3" fill="${I}"/><rect x="11" y="30" width="38" height="5" fill="${I}"/><rect x="11" y="38" width="30" height="5" fill="${I}"/><rect x="11" y="49" width="34" height="6" fill="var(--blue)"/><rect x="9" y="68" width="42" height="10" fill="var(--green)" stroke="${I}" stroke-width="2"/><rect x="16" y="82" width="28" height="7" fill="#fff" stroke="${I}" stroke-width="1.5"/>`)},
    card:{label:'Get a card',svg:frame(`<rect x="8" y="22" width="44" height="40" fill="${I}" transform="rotate(-4 30 42)"/><rect x="10" y="30" width="36" height="4" fill="#fff" transform="rotate(-4 30 42)"/><rect x="10" y="38" width="30" height="4" fill="#fff" transform="rotate(-4 30 42)"/><rect x="10" y="46" width="24" height="4" fill="#fff" transform="rotate(-4 30 42)"/><rect x="9" y="74" width="42" height="11" fill="var(--green)" stroke="${I}" stroke-width="2"/>`)},
    write:{label:'Write it down',svg:frame(`${[0,1,2].map(i=>`<rect x="8" y="${20+i*14}" width="44" height="10" fill="#fff" stroke="${I}" stroke-width="1.6"/><rect x="11" y="${24+i*14}" width="${[26,18,30][i]}" height="2.5" fill="${I}"/>`).join('')}<rect x="9" y="70" width="42" height="11" fill="var(--green)" stroke="${I}" stroke-width="2"/>`)},
    vote:{label:'Vote for the best',svg:frame(`${[0,1].map(i=>`<rect x="8" y="${16+i*28}" width="44" height="24" fill="${i?'#fff':'var(--yel)'}" stroke="${I}" stroke-width="2"/><rect x="12" y="${22+i*28}" width="28" height="3" fill="${I}"/><rect x="12" y="${29+i*28}" width="22" height="3" fill="${I}"/>`).join('')}<text x="45" y="34" font-family="Archivo" font-weight="900" font-size="12" fill="${I}">✓</text>`)},
    eq:{label:'Cut the frequency',svg:frame(`<rect x="7" y="22" width="46" height="40" fill="#fff" stroke="${I}" stroke-width="2"/><path d="M8 38 H24 Q30 38 32 56 Q34 38 40 38 H52" fill="none" stroke="var(--red)" stroke-width="2.5"/><circle cx="32" cy="56" r="3.5" fill="var(--red)" stroke="${I}" stroke-width="1.5"/><rect x="9" y="72" width="42" height="11" fill="var(--green)" stroke="${I}" stroke-width="2"/>`)},
    env:{label:'Spot the shape',svg:frame([0,1,2,3].map(i=>`<rect x="${7+(i%2)*24}" y="${16+Math.floor(i/2)*34}" width="22" height="30" fill="color-mix(in srgb,var(--${['red','blue','yel','green'][i]}) 25%,#fff)" stroke="${I}" stroke-width="1.6"/><path d="${['M10 40 L13 22 L18 30 L24 30 L27 40','M10 40 L20 22 L26 40','M10 40 L11 22 L14 40','M10 40 L16 24 L22 24 L27 40'][i]}" transform="translate(${(i%2)*24} ${Math.floor(i/2)*34})" fill="none" stroke="${I}" stroke-width="2"/>`).join(''))},
  };})();
const GUIDE_SKIP=new Set(['n','secs','rounds','mins','auto','sketch','stop','csecs','rsecs','gens','leg','legs','test']);
function guideVariations(g){const out=[];(g.options||[]).forEach(o=>{if(GUIDE_SKIP.has(o.key)||o.type==='step'||!o.choices)return;
  o.choices.forEach(c=>{const l=String(c[1]);if(/^\d+$/.test(l)||/^(off|on|none|manual)$/i.test(l))return;out.push(l);});});return [...new Set(out)].slice(0,9);}
function guideHTML(){
  const G0=window.GUIDE||{},games=ordered();
  const card=g=>{const d=G0[g.id]||{},plays=(d.play||[]).map(k=>GUIDE_PLAY[k]).filter(Boolean),vars=guideVariations(g);
    return `<article class="gcard" style="--c:var(${g.col})"><div class="gcno">${numOf(g)}</div><div class="gcico">${g.icon||''}</div>
      <h3>${esc(g.name)}</h3><p class="gctag">${esc(g.tag)}</p>
      <div class="gcplay">${plays.map(p=>`<figure>${p.svg}<figcaption>${esc(p.label)}</figcaption></figure>`).join('')}</div>
      ${vars.length?`<div class="gcvars">${vars.map(v=>`<span>${esc(v)}</span>`).join('')}</div>`:''}
      ${d.lesson?`<p class="gclesson"><b>★</b>${esc(d.lesson)}</p>`:''}</article>`;};
  const used=new Set(Object.values(G0).flatMap(d=>d.play||[]));
  return `<div class="guide">
    <header class="ghero"><div class="ghshapes"><i></i><i></i><i></i></div><span class="lab">The guide to</span><h1>The Control<br><i>Room</i></h1>
      <div class="ghstats"><span><b>${games.length}</b> games</span><span><b>${GROUPS.length}</b> rooms of play</span><span><b>1</b> phone each</span></div></header>
    <section class="gsec"><h2>Get in</h2><div class="gjoin">
      <div><b>1</b><svg viewBox="0 0 64 48"><rect x="6" y="4" width="52" height="32" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/><rect x="24" y="10" width="16" height="16" fill="var(--ink)"/><rect x="2" y="38" width="60" height="6" fill="var(--ink)"/></svg><span>Scan your computer’s code</span></div>
      <div><b>2</b><svg viewBox="0 0 64 48"><rect x="8" y="8" width="48" height="32" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/><rect x="16" y="18" width="32" height="5" fill="var(--ink)"/><rect x="16" y="27" width="20" height="4" fill="var(--ink)"/></svg><span>Tap your name</span></div>
      <div><b>3</b><svg viewBox="0 0 64 48"><circle cx="16" cy="24" r="11" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/><rect x="38" y="13" width="22" height="22" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><path d="M27 24 H38" stroke="var(--ink)" stroke-width="4"/></svg><span>Phone, computer and sound connect</span></div>
    </div></section>
    <section class="gsec"><h2>Your phone can…</h2><div class="ghands">${[...used].filter(k=>GUIDE_PLAY[k]).map(k=>`<figure>${GUIDE_PLAY[k].svg}<figcaption>${esc(GUIDE_PLAY[k].label)}</figcaption></figure>`).join('')}</div></section>
    ${GROUPS.map(gr=>{const list=games.filter(g=>g.group===gr.id);return list.length?`<section class="gsec ggroup" style="--c:var(${gr.col})"><h2><i></i>${esc(gr.name)}<small>${esc(gr.sub)}</small></h2><div class="gcards">${list.map(card).join('')}</div></section>`:'';}).join('')}
    <section class="gsec"><h2>Always with you</h2><div class="gextras">
      <div style="--c:var(--red)"><b>Room vote</b><span>The whole class picks the next game. Most votes wins.</span></div>
      <div style="--c:var(--yel)"><b>Notebook</b><span>Every brief, rule, card and milestone you collect.</span></div>
      <div style="--c:var(--green)"><b>Sit out</b><span>Busy? Skip a round. Jump back in any time.</span></div>
      <div style="--c:var(--red)"><b>Your sound</b><span>Your computer can play to the teacher’s desk.</span></div>
      <div style="--c:var(--blue)"><b>Home screen</b><span>Tap the logo to keep Control Room one tap away.</span></div>
    </div></section>
    <footer class="gfoot"><div class="ghshapes small"><i></i><i></i><i></i></div><p>One room. One big screen. Everybody plays.</p></footer>
  </div>`;
}
function openGuide(){let ov=$('#guideov');if(!ov){ov=el('div','guideov');ov.id='guideov';document.body.appendChild(ov);}
  ov.innerHTML=`<button class="guideX" id="guideX" aria-label="Close the guide">✕</button>${guideHTML()}`;ov.scrollTop=0;
  // the phone's back gesture closes the guide instead of leaving the room
  history.pushState({guide:1},'');const close=()=>{removeEventListener('popstate',close);ov.remove();};
  addEventListener('popstate',close);$('#guideX').onclick=()=>history.back();}
