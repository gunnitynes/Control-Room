/* ====================================================================
   THE EAR ATLAS (Know your stuff, next to The Translation Grid)
   One game, twelve kinds of question about what you hear:
   tempo · note · chord · interval · tuning · scale · progression (a sampled Steinway and soft drums)
   instrument · family · where in the world · part of the world (real recordings, data/content.js → ATLAS)
   name that song (the teacher's own clips, kept in this browser)
   ==================================================================== */

/* ---------- the piano: University of Iowa EMS Steinway, one mf sample per key C2–C6 ---------- */
const AT_NN=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const AT_NAME=['C','C♯ / D♭','D','E♭ / D♯','E','F','F♯ / G♭','G','A♭ / G♯','A','B♭ / A♯','B'];
const AT_SHORT=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const pnSrc=m=>`audio/atlas/piano/${AT_NN[m%12]}${Math.floor(m/12)-1}.mp3`;
// events: [{m: midi, at: seconds, d: length, v: velocity, c: cents}]
function pianoPlay(events,dest){
  const ac=audio(),out=gn(ac,1);out.connect(dest||AU.music);const srcs=[];let stopped=false;
  const h={stop(f=.12){stopped=true;const t=ac.currentTime;out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(0,t+f);
    srcs.forEach(s=>{try{s.stop(t+f+.05);}catch(e){}});AU.live.delete(h);setTimeout(()=>{try{out.disconnect();}catch(e){}},f*1000+400);}};
  AU.live.add(h);
  const key=m=>clamp(Math.round(m),36,84);
  Promise.all([...new Set(events.map(e=>key(e.m)))].map(m=>sampleReady(pnSrc(m)).then(b=>[m,b]))).then(list=>{if(stopped)return;
    const B=Object.fromEntries(list),t0=ac.currentTime+.08;
    events.forEach(e=>{const k=key(e.m),s=ac.createBufferSource(),g=gn(ac,0),t=t0+e.at,v=e.v??.8,d=e.d??2;
      s.buffer=B[k];s.playbackRate.value=Math.pow(2,(e.m-k)/12+(e.c||0)/1200);s.connect(g).connect(out);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.004);g.gain.setValueAtTime(v,t+d);g.gain.setTargetAtTime(0,t+d,.15);
      s.start(t);s.stop(t+d+1);srcs.push(s);});
  }).catch(()=>toast('The piano samples could not load'));
  return h;
}
/* ---------- soft but clear drums for the tempo rounds ---------- */
function atGroove(bpm,dest){const ac=audio(),r=rig(dest||AU.music,{rt:.6,damp:.65});r.strip('dr',{gain:.75,send:.05});const d=r.strips.dr.in;
  const style=pick(['straight','four','half']);
  const pats={straight:['x.......x.x.....','....x.......x...','x.x.x.x.x.x.x.x.'],four:['x...x...x...x...','....x.......x...','..x...x...x...x.'],half:['x.........x.....','........x.......','x.x.x.x.x.x.x.x.']}[style];
  seq(r,{bpm,len:16,tracks:[
    {pat:P_(pats[0]),play:t=>DR.kick(ac,d,t,{v:.85,dec:.4})},
    {pat:P_(pats[1]),play:t=>DR.snare(ac,d,t,{v:.55,dec:.12,ndec:.14})},
    {pat:P_(pats[2]),play:(t,v,sd,s)=>DR.nhat(ac,d,t,{v:s%4===0?.55:.32,dec:.04})}]});
  return r;}

/* ---------- the eight kinds of question ---------- */
const AT_CHORDS=[['Major',[0,4,7]],['Minor',[0,3,7]],['Dominant 7th',[0,4,7,10]],['Major 7th',[0,4,7,11]],['Minor 7th',[0,3,7,10]],['Diminished',[0,3,6]],['Augmented',[0,4,8]],['Sus4',[0,5,7]],['Sus2',[0,2,7]]];
const AT_SCALES=[['Major',[0,2,4,5,7,9,11,12]],['Natural minor',[0,2,3,5,7,8,10,12]],['Harmonic minor',[0,2,3,5,7,8,11,12]],['Melodic minor',[0,2,3,5,7,9,11,12]],
  ['Dorian',[0,2,3,5,7,9,10,12]],['Phrygian',[0,1,3,5,7,8,10,12]],['Lydian',[0,2,4,6,7,9,11,12]],['Mixolydian',[0,2,4,5,7,9,10,12]],
  ['Major pentatonic',[0,2,4,7,9,12]],['Minor pentatonic',[0,3,5,7,10,12]],['Blues',[0,3,5,6,7,10,12]],['Whole tone',[0,2,4,6,8,10,12]]];
// progressions: [root offset in the key, quality]; names use Roman numerals
const AT_Q={M:[0,4,7],m:[0,3,7],'7':[0,4,7,10],M7:[0,4,7,11],m7:[0,3,7,10]};
const AT_PROGS=[['I – V – vi – IV','the pop four',[[0,'M'],[7,'M'],[9,'m'],[5,'M']]],['I – vi – IV – V','the 50s doo-wop',[[0,'M'],[9,'m'],[5,'M'],[7,'M']]],
  ['vi – IV – I – V','the sad pop four',[[9,'m'],[5,'M'],[0,'M'],[7,'M']]],['I – IV – V – I','the classic cadence',[[0,'M'],[5,'M'],[7,'M'],[0,'M']]],
  ['ii – V – I','the jazz turnaround',[[2,'m7'],[7,'7'],[0,'M7'],[0,'M7']]],['i – ♭VII – ♭VI – V','the Andalusian cadence',[[0,'m'],[10,'M'],[8,'M'],[7,'M']]],
  ['I – ♭VII – IV – I','the rock mixolydian',[[0,'M'],[10,'M'],[5,'M'],[0,'M']]],['i – iv – v – i','the minor loop',[[0,'m'],[5,'m'],[7,'m'],[0,'m']]],
  ['I – iii – IV – V','the climb',[[0,'M'],[4,'m'],[5,'M'],[7,'M']]],['i – ♭VI – ♭III – ♭VII','the epic minor',[[0,'m'],[8,'M'],[3,'M'],[10,'M']]]];
const AT_FAMS=['Bowed strings','Plucked & struck strings','Woodwind & reeds','Brass','Percussion','Keyboard','Electronic','Voice'];
const AT_REGIONS=['Africa','Asia','Europe','Middle East','Americas','Oceania'];
/* fresh first: the Atlas remembers (in this browser) what it has played, and picks the least-heard clips,
   so a class hears new recordings week after week before anything repeats */
const atSeen=()=>store.get('atlas.seen',{});
function atMark(keys){const S=atSeen();keys.forEach(k=>{S[k]=(S[k]||0)+1;});store.set('atlas.seen',S);}
function atFresh(list,key){const S=atSeen(),n=x=>S[key(x)]||0,min=Math.min(...list.map(n));return pick(list.filter(x=>n(x)===min));}
const atClip=it=>atFresh(it.clips,c=>c.src);
const AT_INTERVALS=['Minor 2nd','Major 2nd','Minor 3rd','Major 3rd','Perfect 4th','Tritone','Perfect 5th','Minor 6th','Major 6th','Minor 7th','Major 7th','Octave'];
const AT_TYPES={
  tempo:{name:'Tempo',q:'How fast is it?',sub:'Guess the BPM. Tap along on your phone if it helps.',col:'--red'},
  note:{name:'Note',q:'Which note is this?',sub:'First you hear a C. Then the mystery note.',col:'--blue'},
  chord:{name:'Chord',q:'What kind of chord?',sub:'Played up one note at a time, then all together.',col:'--yel'},
  interval:{name:'Interval',q:'How far apart?',sub:'Two notes one after the other, then together.',col:'--green'},
  tuning:{name:'Tuning',q:'Sharp, flat or in tune?',sub:'An A, then the same A again. Or is it?',col:'--red'},
  scale:{name:'Scale',q:'Which scale is this?',sub:'Up one note at a time, from the bottom to the top.',col:'--blue'},
  progression:{name:'Progression',q:'Which chord progression?',sub:'Four chords. Listen to how they move.',col:'--yel'},
  instrument:{name:'Instrument',q:'What instrument is this?',sub:'A real recording.',col:'--blue'},
  family:{name:'Family',q:'Which family is this instrument from?',sub:'A real recording. Strings, winds, brass, percussion…',col:'--green'},
  world:{name:'Where in the world',q:'Where does this music come from?',sub:'A real recording.',col:'--yel'},
  region:{name:'Part of the world',q:'Which part of the world is this from?',sub:'A real recording. Pick the region.',col:'--red'},
  song:{name:'Name that song',q:'What song is this?',sub:'From your teacher’s own collection.',col:'--green'},
};
const AT_GLYPH={
  tempo:`<path d="M20 54 L32 8 L44 54 Z" fill="var(--paper)" stroke="var(--ink)" stroke-width="3.5"/><path d="M32 42 L44 18" stroke="var(--ink)" stroke-width="3.5"/><circle cx="44" cy="18" r="4" fill="var(--red)" stroke="var(--ink)" stroke-width="2"/>`,
  note:`<ellipse cx="24" cy="46" rx="10" ry="8" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><path d="M33 46 V10 Q44 14 48 24" fill="none" stroke="var(--ink)" stroke-width="4"/>`,
  chord:`${[46,34,22].map((y,i)=>`<ellipse cx="32" cy="${y}" rx="11" ry="7" fill="var(--${['yel','red','blue'][i]})" stroke="var(--ink)" stroke-width="3"/>`).join('')}`,
  interval:`<circle cx="18" cy="44" r="9" fill="var(--green)" stroke="var(--ink)" stroke-width="3"/><circle cx="46" cy="18" r="9" fill="var(--green)" stroke="var(--ink)" stroke-width="3"/><path d="M24 38 L40 24" stroke="var(--ink)" stroke-width="3" stroke-dasharray="4 4"/>`,
  tuning:`<path d="M8 48 A26 26 0 0 1 56 48" fill="none" stroke="var(--ink)" stroke-width="4"/><path d="M32 48 L42 22" stroke="var(--red)" stroke-width="5"/><circle cx="32" cy="48" r="5" fill="var(--ink)"/>`,
  instrument:`<circle cx="24" cy="42" r="14" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><circle cx="24" cy="42" r="4" fill="var(--ink)"/><path d="M33 32 L54 10" stroke="var(--ink)" stroke-width="6"/><path d="M50 8 L58 16" stroke="var(--ink)" stroke-width="4"/>`,
  world:`<circle cx="32" cy="32" r="24" fill="var(--yel)" stroke="var(--ink)" stroke-width="3.5"/><ellipse cx="32" cy="32" rx="10" ry="24" fill="none" stroke="var(--ink)" stroke-width="3"/><path d="M8 32 H56 M12 20 H52 M12 44 H52" stroke="var(--ink)" stroke-width="2.5"/>`,
  scale:`${[0,1,2,3,4,5].map(i=>`<rect x="${6+i*9}" y="${46-i*7}" width="8" height="${8+i*7}" fill="var(--${['blue','blue','yel','blue','blue','yel'][i]})" stroke="var(--ink)" stroke-width="2.5"/>`).join('')}`,
  progression:`${[0,1,2,3].map(i=>`<rect x="${4+i*15}" y="${[26,14,20,30][i]}" width="12" height="${[30,42,36,26][i]}" fill="var(--${['yel','red','blue','green'][i]})" stroke="var(--ink)" stroke-width="2.5"/>`).join('')}`,
  family:`<circle cx="20" cy="22" r="11" fill="var(--green)" stroke="var(--ink)" stroke-width="3"/><rect x="34" y="11" width="22" height="22" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><polygon points="20,38 32,58 8,58" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/><polygon points="45,38 57,48 45,58 33,48" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/>`,
  region:`<circle cx="32" cy="32" r="24" fill="var(--paper)" stroke="var(--ink)" stroke-width="3.5"/><path d="M32 8 V56 M8 32 H56" stroke="var(--ink)" stroke-width="2.5"/><path d="M32 8 A24 24 0 0 1 56 32 H32 Z" fill="var(--red)" stroke="var(--ink)" stroke-width="3"/>`,
  song:`<circle cx="32" cy="32" r="25" fill="var(--ink)"/><circle cx="32" cy="32" r="16" fill="none" stroke="var(--paper)" stroke-width="1.5" opacity=".5"/><circle cx="32" cy="32" r="8" fill="var(--green)"/><circle cx="32" cy="32" r="2" fill="var(--ink)"/>`,
};
const atGlyph=(t,s=56)=>`<svg class="atglyph" width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true">${AT_GLYPH[t]||''}</svg>`;
const atData=()=>window.ATLAS||{instruments:[],world:[]};
const mySongs=()=>MYCLIPS.list.filter(c=>c.dec===-1);

/* one question of a given kind; returns null when that kind has nothing to ask */
function atQuestion(type,used){
  const fresh=(L,k)=>{const f=L.filter(x=>!used.has(k+x[0]));const q=pick(f.length?f:L);used.add(k+q[0]);return q;};
  const mc=(right,wrong)=>{const opts=shuffle([right,...shuffle(wrong.filter(w=>w!==right)).slice(0,3)]);return {opts,c:opts.indexOf(right)};};
  if(type==='tempo'){let bpm;do{bpm=70+Math.floor(Math.random()*96);}while(used.has('bpm'+Math.round(bpm/6)));used.add('bpm'+Math.round(bpm/6));return {type,bpm};}
  if(type==='note'){const m=60+Math.floor(Math.random()*12);return {type,m};}
  if(type==='chord'){const q=fresh(AT_CHORDS,'c'),root=48+Math.floor(Math.random()*8);return {type,root,name:q[0],iv:q[1],...mc(q[0],AT_CHORDS.map(x=>x[0]))};}
  if(type==='interval'){const k=1+Math.floor(Math.random()*12),root=55+Math.floor(Math.random()*9),near=AT_INTERVALS.filter((x,i)=>Math.abs(i+1-k)<=4&&i+1!==k);return {type,root,k,...mc(AT_INTERVALS[k-1],near.length>=3?near:AT_INTERVALS)};}
  if(type==='tuning'){const c=pick([-38,-28,-20,20,28,38,0,0]);const opts=['Flat','In tune','Sharp'];return {type,cents:c,opts,c:c<0?0:c>0?2:1};}
  if(type==='scale'){const q=fresh(AT_SCALES,'s'),root=48+Math.floor(Math.random()*9);return {type,root,name:q[0],iv:q[1],...mc(q[0],AT_SCALES.map(x=>x[0]))};}
  if(type==='progression'){const q=fresh(AT_PROGS,'p'),key=Math.floor(Math.random()*12);return {type,key,name:q[0],nick:q[1],ch:q[2],...mc(q[0],AT_PROGS.map(x=>x[0]))};}
  if(type==='instrument'||type==='family'){const L=atData().instruments.filter(x=>x.clips&&x.clips.length&&!used.has('i'+x.id));if(!L.length)return null;const it=atFresh(L,x=>'i'+x.id);used.add('i'+it.id);
    if(type==='family'){const fams=[...new Set(atData().instruments.map(x=>x.fam))];return {type,item:it,clip:atClip(it),...mc(it.fam,fams.length>=4?fams:AT_FAMS)};}
    const others=atData().instruments.filter(x=>x.id!==it.id),same=shuffle(others.filter(x=>x.fam===it.fam)).slice(0,1),rest=shuffle(others.filter(x=>!same.includes(x))).slice(0,3-same.length);
    const opts=shuffle([it,...same,...rest]).map(x=>x.name);return {type,item:it,clip:atClip(it),opts,c:opts.indexOf(it.name)};}
  if(type==='region'){const L=atData().world.filter(x=>x.clips&&x.clips.length&&!used.has('w'+x.id));if(!L.length)return null;const it=atFresh(L,x=>'w'+x.id);used.add('w'+it.id);
    return {type,item:it,clip:atClip(it),...mc(it.region,AT_REGIONS)};}
  if(type==='world'){const L=atData().world.filter(x=>x.clips&&x.clips.length&&!used.has('w'+x.id));if(!L.length)return null;const it=atFresh(L,x=>'w'+x.id);used.add('w'+it.id);
    const others=shuffle(atData().world.filter(x=>x.id!==it.id&&x.region!==it.region));const pickd=[];others.forEach(x=>{if(pickd.length<3&&!pickd.some(y=>y.region===x.region))pickd.push(x);});
    while(pickd.length<3&&others.length>pickd.length)pickd.push(others.find(x=>!pickd.includes(x)));
    const opts=shuffle([it,...pickd]).map(x=>x.place);return {type,item:it,clip:atClip(it),opts,c:opts.indexOf(it.place)};}
  if(type==='song'){const S=mySongs();if(S.length<4)return null;const L=S.filter(x=>!used.has('s'+x.id));if(!L.length)return null;const it=pick(L);used.add('s'+it.id);
    const title=x=>x.name.replace(/\.[a-z0-9]+$/i,'');return {type,song:it.id,title:title(it),...mc(title(it),S.map(title))};}
  return null;
}
const AT_MC=new Set(['chord','interval','tuning','scale','progression','instrument','family','world','region','song']);
const AT_REC=new Set(['instrument','family','world','region']);
/* close voicings that move as little as possible from chord to chord, with the root in the bass */
function atProgEvents(r){let prev=[60,64,67];const ev=[],len=1.25;
  r.ch.forEach(([off,q],i)=>{const root=r.key+off,pcs=AT_Q[q].map(x=>(root+x)%12);let best=null;
    for(let lo=52;lo<=64;lo++){const v=pcs.map(pc=>{let m=lo+((pc-lo)%12+12)%12;return m;}).sort((a,b)=>a-b);const cost=v.reduce((a,m,k)=>a+Math.abs(m-(prev[k]??prev[prev.length-1])),0);if(!best||cost<best.cost)best={v,cost};}
    prev=best.v;const t=i*len;ev.push({m:36+((root%12)+12)%12,at:t,d:len-.05,v:.62});best.v.forEach(m=>ev.push({m,at:t,d:len-.05,v:.5}));});
  return ev;}
function atPlay(r){
  if(r.type==='tempo')return atGroove(r.bpm);
  if(r.type==='note')return pianoPlay([{m:60,at:0,d:1.2,v:.75},{m:r.m,at:1.7,d:2.4,v:.85}]);
  if(r.type==='chord'){const ns=r.iv.map(i=>r.root+i),gap=.38;return pianoPlay([...ns.map((m,i)=>({m,at:i*gap,d:1.4,v:.7})),...ns.map(m=>({m,at:ns.length*gap+.4,d:2.6,v:.62}))]);}
  if(r.type==='interval'){const a=r.root,b=r.root+r.k;return pianoPlay([{m:a,at:0,d:1,v:.78},{m:b,at:1.05,d:1,v:.78},{m:a,at:2.3,d:2.4,v:.66},{m:b,at:2.3,d:2.4,v:.66}]);}
  if(r.type==='tuning')return pianoPlay([{m:69,at:0,d:1.3,v:.75},{m:69,at:1.75,d:2.2,v:.75,c:r.cents}]);
  if(r.type==='scale')return pianoPlay(r.iv.map((i,k)=>({m:r.root+i,at:k*.34,d:k===r.iv.length-1?1.6:.42,v:.74})));
  if(r.type==='progression')return pianoPlay(atProgEvents(r));
  if(AT_REC.has(r.type)){const c=r.clip,h={stop(){if(h.s)h.s.stop();}};sampleReady(c.src).then(buf=>{if(G.gs&&G.gs.aud===h)h.s=playSample(buf,AU.music,{gain:.9,maxDur:12});}).catch(()=>toast('Could not load that recording'));return h;}
  if(r.type==='song'){const c=MYCLIPS.list.find(x=>x.id===r.song),h={stop(){if(h.s)h.s.stop();}};if(c)clipBuffer(c).then(buf=>{if(G.gs&&G.gs.aud===h)h.s=playSample(buf,AU.music,{gain:.9,maxDur:12,offset:buf.duration>30?buf.duration*.3:0});}).catch(()=>toast('Could not play that song'));return h;}
  return {stop(){}};
}

/* ---------- the dot map ---------- */
function atMap(pin,{guesses=[]}={}){
  const M=atData().map;if(!M)return '';const k=10,W=M.w*k,H=M.h*k;let dots='';
  M.rows.forEach((hx,r)=>{const bits=BigInt('0x'+hx).toString(2).padStart(M.w,'0');for(let c=0;c<M.w;c++)if(bits[c]==='1')dots+=`<circle cx="${c*k+k/2}" cy="${r*k+k/2}" r="${k*.32}"/>`;});
  const P=(lat,lon)=>[(lon+180)/360*W,(M.lat0-lat)/(M.lat0-M.lat1)*H];
  const pins=guesses.map(g=>{const [x,y]=P(g.lat,g.lon);return `<g class="atgpin c${g.k}"><circle cx="${x}" cy="${y}" r="${k*.9}"/><text x="${x}" y="${y-k*1.4}" text-anchor="middle">${g.n}</text></g>`;}).join('');
  let main='';if(pin){const [x,y]=P(pin.lat,pin.lon);main=`<g class="atpin"><circle class="ring" cx="${x}" cy="${y}" r="${k*4.5}"/><circle cx="${x}" cy="${y}" r="${k*2}"/></g>`;}
  return `<svg class="atmap" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><g class="land">${dots}</g>${pins}${main}</svg>`;
}
/* ---------- a keyboard, for the host's note reveal and the phone's answer pad ---------- */
function atKeys({mark=null,counts=null,sel=null,tag='div'}={}){
  const white=[0,2,4,5,7,9,11],black=[[1,1],[3,2],[6,4],[8,5],[10,6]];
  return `<div class="atkeys">${white.map(n=>`<${tag} class="wk${n===mark?' mark':''}${n===sel?' sel':''}" data-n="${n}"><span>${AT_SHORT[n]}</span>${counts&&counts[n]?`<em>${counts[n]}</em>`:''}</${tag}>`).join('')}
    ${black.map(([n,pos])=>`<${tag} class="bk${n===mark?' mark':''}${n===sel?' sel':''}" data-n="${n}" style="left:calc(${pos}*100%/7 - 100%/28)"><span>${AT_SHORT[n]}</span>${counts&&counts[n]?`<em>${counts[n]}</em>`:''}</${tag}>`).join('')}</div>`;
}

/* ---------- the game ---------- */
// saved settings from before the new kinds of question existed: switch the new ones on, once
(()=>{if(store.get('atlas.v2',false))return;const o=store.get('opt.atlas',null);if(o&&Array.isArray(o.types)){['scale','progression','family','region'].forEach(t=>{if(!o.types.includes(t))o.types.push(t);});store.set('opt.atlas',o);}store.set('atlas.v2',true);})();
game(roundGame({
  id:'atlas',group:'brain',name:'The Ear Atlas',tag:'One giant guessing game: tempo, notes, chords, scales, progressions, instruments of the world, where music comes from, and your own songs.',
  how:['Every round asks something different about what you hear: the tempo, a note, a chord, a scale, a progression, an instrument and its family, a place on the map, a song.','Answer on your phone: tap the tempo, play the note on a keyboard, or pick one of four.','More than 800 real recordings: 130+ instruments and 90 places, played least-heard first. A real Steinway, real drums. Fast right answers score more.'],
  badges:['Scored','Listening','12 kinds of question'],speed:.3,okAt:.95,closeAt:.35,yesWord:'Golden ears!',noWord:'Not this time',
  icon:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="var(--green)" stroke="var(--ink)" stroke-width="3.5"/><ellipse cx="32" cy="32" rx="11" ry="26" fill="none" stroke="var(--ink)" stroke-width="3"/><path d="M6 32 H58" stroke="var(--ink)" stroke-width="3"/><path d="M38 6 Q60 18 50 44" fill="none" stroke="var(--red)" stroke-width="5"/><circle cx="50" cy="46" r="6" fill="var(--yel)" stroke="var(--ink)" stroke-width="3"/></svg>`,
  options:[
    {key:'types',type:'multi',label:'Questions',choices:Object.entries(AT_TYPES).map(([k,t])=>[k,t.name,{tempo:'BPM, with tap tempo',note:'a C, then the mystery note',chord:'major, minor, 7th…',interval:'2nd to octave',tuning:'sharp / flat / in tune',scale:'major, modes, blues…',progression:'pop four, ii–V–I…',instrument:'real recordings',family:'strings, winds, brass…',world:'real recordings + map',region:'Africa, Asia, Europe…',song:'needs 4+ of your songs'}[k]]),def:Object.keys(AT_TYPES).filter(k=>k!=='song'),sub:v=>`${v.types.length} of ${Object.keys(AT_TYPES).length}`},
    {key:'n',label:'Rounds',type:'step',min:4,max:40,step:1,def:12,unit:'rounds'},
    {key:'secs',label:'Answer time',choices:[[15,'15','seconds'],[20,'20','seconds'],[30,'30','seconds'],[0,'OFF','no clock']],def:20},
  ],
  check:v=>v.types.length?'':'Pick at least one kind of question',
  get note(){const d=atData(),n=L=>(L||[]).reduce((a,x)=>a+x.clips.length,0);return `${(d.instruments||[]).length} instruments and ${(d.world||[]).length} places in ${n(d.instruments)+n(d.world)} clips, all real recordings. The Atlas plays the clips this browser has heard least first, so lessons keep sounding new. All from Wikimedia Commons (public domain or Creative Commons, credited on the reveal and in audio/atlas/CREDITS.txt). Piano: University of Iowa Electronic Music Studios. Name that song uses your own clips (below); they stay in this browser.`;},
  setupExtra(v){if(!v.types.includes('song'))return '';const S=mySongs();
    return `<div class="fsec myclips mysongs"><h3><b>♫</b>Your songs<small>${S.length} loaded · need 4 or more · stay in this browser</small></h3>
      <div class="songlist">${S.map(c=>`<div class="songrow"><input value="${esc(c.name.replace(/\.[a-z0-9]+$/i,''))}" data-id="${esc(c.id)}" aria-label="Song title"><button class="ghost" data-del="${esc(c.id)}" aria-label="Remove">×</button></div>`).join('')||'<p class="fine">No songs yet. Add short MP3s: the file name becomes the title, and you can edit it here.</p>'}</div>
      <label class="ghost addsong">+ add songs<input type="file" accept="audio/*" multiple hidden></label></div>`;},
  setupBind(st,redraw){const box=$('.mysongs',st);if(!box)return;
    $('input[type=file]',box).onchange=async e=>{for(const f of e.target.files){if(f.size>40e6){toast(f.name+' is over 40 MB');continue;}await clipDB.put({id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),dec:-1,name:f.name,blob:f,at:Date.now()});}await loadMyClips();redraw();};
    $$('.songrow input',box).forEach(i=>i.onchange=async()=>{const c=MYCLIPS.list.find(x=>x.id===i.dataset.id);if(!c)return;await clipDB.put({...c,name:i.value.trim()||c.name});await loadMyClips();toast('Title saved');});
    $$('[data-del]',box).forEach(b=>b.onclick=async()=>{await clipDB.del(b.dataset.del);await loadMyClips();redraw();});},
  build(o){const used=new Set(),types=o.types.filter(t=>t!=='song'||mySongs().length>=4),out=[];if(!types.length)return [];
    let deck=[];for(let i=0;out.length<o.n&&i<o.n*4;i++){if(!deck.length)deck=shuffle(types.slice());const q=atQuestion(deck.pop(),used);if(q)out.push(q);}
    out.forEach(r=>{if(r.clip)sampleReady(r.clip.src).catch(()=>{});});
    atMark(out.flatMap(r=>r.item?[r.clip.src,(r.type==='world'||r.type==='region'?'w':'i')+r.item.id]:[]));return out;},
  roundInfo:r=>AT_TYPES[r.type].name,
  prepMs:r=>r&&({tempo:1500,note:3600,chord:3800,interval:4600,tuning:3800,scale:3600,progression:5400}[r.type]||1500),prepLabel:'LISTEN',prepSub:'carefully',
  prepText:r=>({big:r?AT_TYPES[r.type].q:'Listen',small:r?AT_TYPES[r.type].sub:''}),
  secs:o=>o.secs,
  onPrep(r){setAud(atPlay(r));},
  leave:stopAud,
  replay(r){setAud(atPlay(r));},replayLabel:'Hear it again',
  head(r,ctx){const s=G.gs,T=AT_TYPES[r.type];return `<div class="athead" style="--c:var(${T.col})">${atGlyph(r.type,64)}<div><span class="lab">Round ${s.i+1} of ${s.rounds.length} · ${esc(T.name)}</span><h2>${esc(T.q)}</h2></div></div>`;},
  stage(m,r,ctx){
    const body=AT_MC.has(r.type)?mcTiles(r,ctx):r.type==='note'?`<div class="atbig">${atKeys()}<p class="fine">The C plays first, then the mystery note.</p></div>`:`<div class="atbig"><div class="atbpm">? <small>BPM</small></div></div>`;
    m.innerHTML=`<div class="atlas t-${r.type}">${this.head(r,ctx)}${body}</div>`;},
  reveal(m,r,ctx){let body='',extra='';const L=ctx.list;
    if(r.type==='tempo')body=`<div class="atbig"><div class="atbpm">${r.bpm} <small>BPM</small></div>${axisPlot({min:60,max:180,log:false,fmt:v=>Math.round(v)+' BPM',marks:[60,80,100,120,140,160,180].map(v=>({v,l:String(v)}))},L,r.bpm,{truthLabel:'the tempo'})}</div>`;
    else if(r.type==='note'){const counts={};L.forEach(x=>{counts[x.a]=(counts[x.a]||0)+1;});body=`<div class="atbig">${atKeys({mark:r.m%12,counts})}<div class="atans">${esc(AT_NAME[r.m%12])}</div></div>`;}
    else{body=mcTiles(r,ctx);
      if(r.type==='chord')extra=`<div class="atinfo"><b>${esc(r.name)}</b><p>${r.iv.map(i=>AT_SHORT[(r.root+i)%12]).join(' · ')}</p></div>`;
      if(r.type==='interval')extra=`<div class="atinfo"><b>${esc(AT_INTERVALS[r.k-1])}</b><p>${r.k} semitone${r.k>1?'s':''} · ${AT_SHORT[r.root%12]} up to ${AT_SHORT[(r.root+r.k)%12]}</p></div>`;
      if(r.type==='tuning')extra=`<div class="atinfo"><b>${r.cents===0?'Perfectly in tune':Math.abs(r.cents)+' cents '+(r.cents<0?'flat':'sharp')}</b><p>100 cents = one semitone</p></div>`;
      if(r.type==='scale')extra=`<div class="atinfo"><b>${esc(r.name)}</b><p>${r.iv.map(i=>AT_SHORT[(r.root+i)%12]).join(' · ')}</p><p>steps: ${r.iv.slice(1).map((x,k)=>({1:'H',2:'W',3:'W+H',4:'2W'}[x-r.iv[k]]||x-r.iv[k])).join(' ')}</p></div>`;
      if(r.type==='progression')extra=`<div class="atinfo"><b>${esc(r.name)}</b><p>${esc(r.nick)}</p><p>in ${AT_SHORT[r.key]}: ${r.ch.map(([o,q])=>AT_SHORT[(r.key+o)%12]+({M:'',m:'m','7':'7',M7:'maj7',m7:'m7'}[q])).join(' – ')}</p></div>`;
      if(r.type==='instrument'||r.type==='family'){const it=r.item;extra=`<div class="atinfo">${r.type==='family'?`<span class="lab">${esc(it.fam)}</span>`:''}<b>${esc(it.name)}</b><p>${esc(it.family)}${it.origin?' · '+esc(it.origin):''}</p>${it.fact?`<p>${esc(it.fact)}</p>`:''}<small class="credit">${esc(r.clip.credit||'')}</small></div>`;}
      if(r.type==='world'||r.type==='region'){const it=r.item;extra=`<div class="atinfo atworld">${atMap(it)}<b>${esc(it.place)}${r.type==='region'?` · ${esc(it.region)}`:''}</b><p>${esc(r.clip.style||it.style||'')}</p><small class="credit">${esc(r.clip.credit||'')}</small></div>`;}
      if(r.type==='song')extra=`<div class="atinfo"><b>${esc(r.title)}</b><p>from your teacher’s collection</p></div>`;}
    m.innerHTML=`<div class="atlas rev t-${r.type}">${this.head(r,ctx)}<div class="atrev${extra?' two':''}">${body}${extra}</div></div>`;if(AT_MC.has(r.type))animateBars(m);},
  ringLabel:r=>r.type==='tempo'?{label:String(r.bpm),sub:'BPM',fill:'--red'}:r.type==='note'?{label:AT_SHORT[r.m%12],fill:'--blue'}:{label:LET[r.c],sub:'is right',fill:COLS[r.c]},
  public:r=>AT_MC.has(r.type)?{type:r.type,opts:r.opts,kind:'atlas'}:{type:r.type},
  valid:(r,a)=>r.type==='tempo'?typeof a==='number'&&a>=30&&a<=300:r.type==='note'?Number.isInteger(a)&&a>=0&&a<12:Number.isInteger(a)&&a>=0&&a<r.opts.length,
  score:(r,a)=>{
    if(r.type==='tempo'){const e=Math.abs(a-r.bpm),half=Math.min(Math.abs(a*2-r.bpm),Math.abs(a/2-r.bpm));let acc=clamp(1-Math.max(0,e-3)/18,0,1);let note=`${Math.round(a)} vs ${r.bpm} BPM`;if(half<=4&&acc<.5){acc=.5;note+=' · half / double time';}return {acc,note};}
    if(r.type==='note'){const d=Math.min((a-r.m%12+12)%12,(r.m%12-a+12)%12);return {acc:d===0?1:d===1?.4:0,note:`${AT_SHORT[a]} vs ${AT_SHORT[r.m%12]}`};}
    return {acc:a===r.c?1:0};},
  publicReveal:r=>r.type==='tempo'?{bpm:r.bpm}:r.type==='note'?{n:r.m%12}:{c:r.c,info:r.type==='instrument'?r.item.name:r.type==='family'?r.item.name+' · '+r.item.fam:r.type==='world'?r.item.place:r.type==='region'?r.item.place+' · '+r.item.region:r.type==='chord'||r.type==='scale'?r.name:r.type==='progression'?r.name+' · '+r.nick:r.type==='interval'?AT_INTERVALS[r.k-1]:''},
  input(root,pub,submit){
    if(pub.type==='tempo'){let bpm=120,taps=[];
      root.innerHTML=`<div class="attempo"><div class="pread"><b class="sv">120</b><span class="sn">BPM</span></div>
        <input type="range" min="60" max="180" step="1" value="120" class="atrange" aria-label="Tempo in BPM">
        <div class="snudge"><button data-d="-1">−1</button><button class="attap">TAP</button><button data-d="1">+1</button></div>
        <p class="lab mut">Tap along with the beat, or slide</p><button class="big go plock">Lock in</button></div>`;
      const upd=()=>{bpm=clamp(Math.round(bpm),60,180);$('.sv',root).textContent=bpm;$('.atrange',root).value=bpm;};
      $('.atrange',root).oninput=e=>{bpm=+e.target.value;upd();};
      $$('.snudge [data-d]',root).forEach(b=>b.onclick=()=>{bpm+=+b.dataset.d;upd();});
      $('.attap',root).onclick=()=>{const t=performance.now();if(taps.length&&t-taps[taps.length-1]>2000)taps=[];taps.push(t);if(taps.length>8)taps.shift();papi.vibe(8);
        if(taps.length>=3){const iv=(taps[taps.length-1]-taps[0])/(taps.length-1);bpm=60000/iv;upd();}};
      $('.plock',root).onclick=()=>submit(bpm);upd();return;}
    if(pub.type==='note'){let sel=null;
      root.innerHTML=`<div class="atnote"><div class="pread"><b class="sv">?</b><span class="sn">tap a key</span></div>${atKeys({tag:'button'})}<button class="big go plock" disabled>Lock in</button></div>`;
      $$('.atkeys button',root).forEach(b=>b.onclick=()=>{sel=+b.dataset.n;$$('.atkeys button',root).forEach(x=>x.classList.toggle('sel',x===b));$('.sv',root).textContent=AT_SHORT[sel];$('.sn',root).textContent=AT_NAME[sel].includes('/')?AT_NAME[sel]:'';$('.plock',root).disabled=false;papi.vibe(10);});
      $('.plock',root).onclick=()=>{if(sel!=null)submit(sel);};return;}
    mcInput(root,pub,submit);
  },
  locked:(box,mine,pub)=>{if(pub.type==='tempo')box.innerHTML=`<div class="bignum">${Math.round(mine)} BPM</div>`;else if(pub.type==='note')box.innerHTML=`<div class="bignum">${esc(AT_SHORT[mine])}</div>`;else mcLocked(box,mine,pub);},
  pReveal:(box,st)=>{const rv=st.rv;if(!rv)return;
    if(st.pub.type==='tempo')box.innerHTML=`<p>The tempo was</p><div class="bignum">${rv.bpm} BPM</div>`;
    else if(st.pub.type==='note')box.innerHTML=`<p>The note was</p><div class="bignum">${esc(AT_SHORT[rv.n])}</div>`;
    else{if(st.cls!=='yes')mcPReveal(box,st);if(rv.info)box.insertAdjacentHTML('beforeend',`<p class="atpinfo">${esc(rv.info)}</p>`);}},
}));
