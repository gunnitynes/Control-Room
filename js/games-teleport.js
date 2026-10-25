/* =====================================================================
   GENRE TELEPORTER — a famous song beamed into another genre. Name it through the disguise.
   Each round takes a song from the teacher's MIDI library (js/midi-engine.js): its melody stays, its harmony is read
   (chord per two beats from the chords + bass parts), and everything else is rebuilt by a genre machine: new drums,
   a bassline in the genre's rhythm, the chords in the genre's comping style, the genre's tempo and feel ("half" plays
   the song at half speed over a fast beat, like trap or drum & bass). Phones pick the song from four; the reveal plays
   the original. Scored like every quiz (speed counts).
   ===================================================================== */
// drums: 16 steps per bar · k kick, s snare/clap/rim, h hats, o open hat / perc; bass: 16 steps, x root, o octave up, f fifth
const TP_GENRES={
  trap:{name:'Trap',bpm:140,feel:2,c:'--red',k:'x......x..x.....',s:'........x.......',sv:'clap',h:'x.x.x.x.xxxx.x.x',o:'',bass:'x......x..x.....',bv:'sub',comp:'pad',cv:'pad',lead:'bell'},
  reggaeton:{name:'Reggaeton',bpm:95,feel:1,c:'--yel',k:'x...x...x...x...',s:'...x..x....x..x.',sv:'rim',h:'..x...x...x...x.',o:'',bass:'x.....x.x.......',bv:'bass',comp:'stab',cv:'pluck',lead:'lead'},
  dnb:{name:'Drum & Bass',bpm:174,feel:2,c:'--blue',k:'x.........x.....',s:'....x.......x...',sv:'snare',h:'x.x.x.x.x.x.x.x.',o:'',bass:'x.......x.......',bv:'sub',comp:'pad',cv:'pad',lead:'ep'},
  house:{name:'House',bpm:124,feel:1,c:'--green',k:'x...x...x...x...',s:'....x.......x...',sv:'clap',h:'',o:'..x...x...x...x.',bass:'..x...x...x...x.',bv:'bass',comp:'stab',cv:'piano',lead:'lead'},
  lofi:{name:'Lo-fi',bpm:78,feel:1,swing:.33,c:'--blue',k:'x......x..x.....',s:'....x.......x...',sv:'rim',h:'x.x.x.x.x.x.x.x.',o:'',bass:'x.....x...x.....',bv:'bass',comp:'pad',cv:'ep',lead:'ep'},
  bossa:{name:'Bossa Nova',bpm:128,feel:1,c:'--yel',k:'x..x..x.x..x..x.',s:'x..x..x...x..x..',sv:'rim',h:'xxxxxxxxxxxxxxxx',hv:'shaker',o:'',bass:'x.....f.x.....f.',bv:'bass',comp:'syncopate',cv:'pluck',lead:'vocal'},
  reggae:{name:'Reggae',bpm:76,feel:1,c:'--green',k:'........x.......',s:'........x.......',sv:'rim',h:'x.x.x.x.x.x.x.x.',o:'',bass:'x..x....x.x.....',bv:'bass',comp:'skank',cv:'organ',lead:'lead'},
  disco:{name:'Disco',bpm:118,feel:1,c:'--red',k:'x...x...x...x...',s:'....x.......x...',sv:'snare',h:'x.x.x.x.x.x.x.x.',o:'..x...x...x...x.',bass:'x.o.x.o.x.o.x.o.',bv:'bass',comp:'pad',cv:'strings',lead:'lead'},
  rock:{name:'Hard Rock',bpm:150,feel:1,c:'--red',k:'x.x...x.xx....x.',s:'....x.......x...',sv:'snare',h:'x.x.x.x.x.x.x.x.',o:'',bass:'x.x.x.x.x.x.x.x.',bv:'bass',comp:'power',cv:'power',lead:'lead'},
  polka:{name:'Polka',bpm:120,feel:1,c:'--yel',k:'x.......x.......',s:'....x.......x...',sv:'snare',h:'',o:'',bass:'x.......f.......',bv:'bass',comp:'oompah',cv:'organ',lead:'organ'},
};
// the song's harmony: one chord every two source beats, from the chords + bass (+ extra) parts
function tpHarmony(S,start,bars,f=1){const src=['chords','bass','extra'].map(r=>S.roles[r]).filter(Boolean),W=bars*4/2,out=[];
  for(let w=0;w<W;w++){const a=start+w*2/f,b=a+2/f,h=new Array(12).fill(0);let low=null;
    src.forEach(p=>p.notes.forEach(x=>{if(x.t>=b||x.t+x.d<=a)return;const ov=Math.min(b,x.t+x.d)-Math.max(a,x.t);h[x.n%12]+=ov;if(p===S.roles.bass&&(low==null||x.n<low))low=x.n;}));
    let best=null;for(let r=0;r<12;r++)for(const m of [[0,4,7],[0,3,7]]){const sc=m.reduce((s,i)=>s+h[(r+i)%12],0)-.4*h.reduce((s,v,i)=>s+(m.some(k=>(r+k)%12===i)?0:v),0)+(low!=null&&low%12===r?1.5:0);if(!best||sc>best.sc)best={sc,r,m};}
    out.push(best&&best.sc>0?best:(out[out.length-1]||{r:S.key.root,m:S.key.mode==='minor'?[0,3,7]:[0,4,7]}));}
  return out;}
// build the four layers of a teleported song, in the genre's beats
function tpRender(S,gid,bars=4){const G0=TP_GENRES[gid],f=G0.feel,sf=mdFeel(S),start=mdWindow(S,['melody','chords','bass'],bars,sf),H=tpHarmony(S,start,bars,sf),L=bars*4*f;
  const chordAt=gb=>H[Math.min(H.length-1,Math.floor(gb/f/2))],steps=(pat,fn)=>{for(let bar=0;bar<L/4;bar++)[...pat].forEach((c,i)=>{if(c!=='.')fn(bar*4+i/4,c);});};
  const drums=[];const hit=(pat,n,v)=>steps(pat||'',(t,c)=>drums.push({t,d:.1,n,v}));
  hit(G0.k,36,118);hit(G0.s,{clap:39,rim:37,snare:38}[G0.sv]||38,105);hit(G0.h,G0.hv==='shaker'?70:42,70);hit(G0.o,46,78);
  if(gid==='trap')for(let bar=0;bar<L/4;bar+=2)[3.5,3.625,3.75,3.875].forEach(x=>drums.push({t:bar*4+x,d:.05,n:42,v:60}));   // hat rolls
  if(gid==='rock')for(let bar=0;bar<L/4;bar+=4)drums.push({t:bar*4,d:.2,n:49,v:110});
  const bass=[];steps(G0.bass,(t,c)=>{const ch=chordAt(t),root=36+((ch.r-36)%12+12)%12,n=c==='o'?root+12:c==='f'?root+7:root;bass.push({t,d:G0.bv==='sub'?.9:.22,n:G0.bv==='sub'?n-12:n,v:105});});
  const comp=[],voice=ch=>ch.m.map(i=>55+((ch.r+i-55)%12+12)%12).sort((a,b)=>a-b),win=2*f;
  const add=(t,d,v=80)=>{const ch=chordAt(t);voice(ch).forEach(n=>comp.push({t,d,n,v}));};
  ({pad:()=>{for(let t=0;t<L;t+=win)add(t,win*.95,70);},stab:()=>{for(let t=0;t<L;t+=1)add(t+.5,.25,85);},skank:()=>{for(let t=0;t<L;t+=1)if(t%2===1)add(t,.25,90);},
    power:()=>{for(let t=0;t<L;t+=.5){const ch=chordAt(t),r=40+((ch.r-40)%12+12)%12;[r,r+7,r+12].forEach(n=>comp.push({t,d:.4,n,v:95}));}},
    syncopate:()=>{for(let bar=0;bar<L/4;bar++)[0,.75,1.5,2.5,3.25].forEach(x=>add(bar*4+x,.4,80));},oompah:()=>{for(let t=1;t<L;t+=2)add(t,.4,85);}})[G0.comp]();
  const mel=mdClip(S,'melody',start,bars,0,sf);if(mel){const med=mel.notes.map(x=>x.n).sort((a,b)=>a-b)[mel.notes.length>>1]||72;const oc=Math.round((74-med)/12)*12;mel.notes.forEach(x=>{x.t*=f;x.d*=f;x.n+=oc;});}
  return {bpm:G0.bpm,bars:bars*f,swing:G0.swing||0,layers:{drums:{role:'drums',notes:drums},bass:{role:'bass',notes:bass,voice:G0.bv},chords:{role:'chords',notes:comp,voice:G0.cv,vel:.8},melody:mel?{role:'melody',notes:mel.notes,voice:G0.lead,vel:1.1}:null}};}
function tpPlay(R){const B=mdBand({bpm:R.bpm,bars:R.bars,swing:R.swing});Object.entries(R.layers).forEach(([k,c])=>{if(c)B.setNow(k,c);});return B;}
function tpOriginal(S,bars=4){const sf=mdFeel(S),start=mdWindow(S,['melody','chords','bass'],bars,sf),B=mdBand({bpm:S.bpm*sf,bars});['drums','bass','chords','melody'].forEach(r=>{const c=mdClip(S,r,start,bars,0,sf);if(c)B.setNow(r,c);});return B;}

game(roundGame(mcSpec({
  id:'teleport',group:'ears',name:'Genre Teleporter',tag:'A famous song beamed into trap, bossa nova or polka. Can you still name it?',
  how:['A famous song gets teleported into another genre: new drums, new bass, new feel. Only the tune survives.','Name the song on your phone, from four. Faster scores more.','The reveal plays the original, so you hear what changed.'],
  badges:['Scored','Listening','MIDI library'],kind:'text',
  icon:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="none" stroke="var(--ink)" stroke-width="3" stroke-dasharray="6 5"/><circle cx="32" cy="32" r="14" fill="var(--blue)" stroke="var(--ink)" stroke-width="3"/><path d="M32 4 v8 M32 52 v8 M4 32 h8 M52 32 h8" stroke="var(--red)" stroke-width="4"/><path d="M27 26 l10 6 -10 6z" fill="var(--yel)" stroke="var(--ink)" stroke-width="2"/></svg>`,
  options:[
    {key:'n',label:'Rounds',choices:[[5,'5'],[8,'8'],[12,'12']],def:8},
    {key:'gen',type:'multi',label:'Genres',choices:Object.entries(TP_GENRES).map(([k,g])=>[k,g.name,g.bpm+' BPM'+(g.feel===2?' · half time':'')]),def:Object.keys(TP_GENRES),sub:v=>`${(v.gen||[]).length} of ${Object.keys(TP_GENRES).length}`},
    {key:'secs',label:'Answer time',choices:[[20,'20','seconds'],[30,'30','seconds'],[45,'45','seconds']],def:30},
  ],
  note:'Uses your MIDI library: songs need a melody plus chords or bass. Everything is rebuilt by the genre machines in this browser.',
  check(){return mdPool(['melody','bass']).length>=8?'':'Load your MIDI folder first';},
  setupExtra(){return mdLibPanel();},setupBind(st,redraw){mdLibBind(st,redraw);},
  prepMs:2600,prepLabel:'BEAM',prepSub:'teleporting',
  prepText:r=>({big:'Teleporting…',small:'to '+TP_GENRES[r.g].name}),
  secs:o=>o.secs,
  build:o=>{const gens=(o.gen&&o.gen.length?o.gen:Object.keys(TP_GENRES)),pool=seenOrder('teleport',mdPool(['melody','bass']),c=>c.id).slice(0,o.n),names=[...new Set(mdLib().map(mdName))];
    seenMark('teleport',pool,c=>c.id);let gd=[];
    return pool.map(c=>{if(!gd.length)gd=shuffle(gens);const t=mdName(c),opts=shuffle([t,...shuffle(names.filter(n=>n!==t)).slice(0,3)]);return {id:c.id,g:gd.pop(),text:'Which song is this?',opts,c:opts.indexOf(t)};});},
  roundInfo:r=>TP_GENRES[r.g].name,
  // the music: built when the round starts (the song is read from the library), kept playing through the answers
  onPrep(r){this.tpPlay(r,false);},onReveal(r){this.tpPlay(r,true);},leave:stopAud,
  replay(r,ph){this.tpPlay(r,ph==='reveal');},replayLabel:'Play it again',
  async tpPlay(r,orig){const tok=(this._tok=(this._tok||0)+1);stopAud();const c=mdLib().find(x=>x.id===r.id);if(!c)return;
    try{const S=await mdSong(c);if(this._tok!==tok)return;setAud(orig?tpOriginal(S):tpPlay(tpRender(S,r.g)));}catch(e){toast('Could not read that song');}},
  stage:(m,r,ctx)=>{const g=TP_GENRES[r.g];m.innerHTML=`<div class="mc tpstage" style="--c:var(${g.c})"><div class="tpbeam"><span class="lab">Teleported to</span><b>${esc(g.name)}</b><small>${g.bpm} BPM${g.feel===2?' · half time':''}</small><i></i><i></i><i></i></div>
    <h2 class="qtext">Which song is this?</h2>${mcTiles(r,ctx)}</div>`;},
  reveal:(m,r,ctx)=>{const g=TP_GENRES[r.g];m.innerHTML=`<div class="mc reveal tpstage" style="--c:var(${g.c})"><div class="tpbeam back"><span class="lab">Back from ${esc(g.name)}: the original</span><b>${esc(r.opts[r.c])}</b><i></i><i></i><i></i></div>
    <h2 class="qtext">Which song was it?</h2>${mcTiles(r,ctx)}</div>`;animateBars(m);},
})));
