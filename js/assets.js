/* ====================================================================
   CONTROL ROOM — assets: small MIDI and audio files made on the spot
   Used by the Constraint Generator: every mission comes with a file to work with.
   A recipe {kind, seed, bpm, key} always builds the same file, so the host only sends recipes and
   each student's computer (gunnitynes.github.io/CADCAST/go, which loads this file) builds them locally.
   MIDI: chords · bass · drums · arp · motif        Audio (WAV): beat · texture · hit · riser · chop
   ==================================================================== */
// stand-ins for the few core.js helpers audio.js uses, when loaded without core.js (the student computer page)
window.store=window.store||{get:(k,d)=>d,set(){},del(){}};
window.clamp=window.clamp||((v,a,b)=>Math.min(b,Math.max(a,v)));
window.pick=window.pick||(a=>a[Math.floor(Math.random()*a.length)]);
window.shuffle=window.shuffle||(a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;});

const ASSETS=(()=>{
  // ---------- seeded randomness: the same seed gives the same file everywhere
  const rng=seed=>{let a=(seed>>>0)||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
  const pk=(r,a)=>a[Math.floor(r()*a.length)];

  // ---------- harmony
  const SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],mixolydian:[0,2,4,5,7,9,10]};
  const KEYS=[{name:'A minor',root:57,mode:'minor'},{name:'C major',root:60,mode:'major'},{name:'D minor',root:62,mode:'minor'},{name:'E minor',root:64,mode:'minor'},
    {name:'F major',root:65,mode:'major'},{name:'G major',root:55,mode:'major'},{name:'D dorian',root:62,mode:'dorian'},{name:'G mixolydian',root:55,mode:'mixolydian'},
    {name:'B♭ major',root:58,mode:'major'},{name:'F♯ minor',root:54,mode:'minor'}];
  const PROGS={major:[[0,4,5,3],[0,5,3,4],[1,4,0,0],[0,3,0,4],[5,3,0,4]],minor:[[0,5,2,6],[0,3,4,0],[0,6,5,4],[0,2,6,3],[0,5,3,4]],
    dorian:[[0,3,0,3],[0,1,0,6],[0,6,3,0]],mixolydian:[[0,6,3,0],[0,3,6,0],[0,4,6,3]]};
  const deg=(key,d,oct=0)=>{const sc=SCALES[key.mode],n=sc.length,o=Math.floor(d/n);return key.root+sc[((d%n)+n)%n]+12*(o+oct);};
  const triad=(key,d,seven)=>[0,2,4].concat(seven?[6]:[]).map(s=>deg(key,d+s));
  const keyOf=name=>KEYS.find(k=>k.name===name)||KEYS[0];

  // ---------- MIDI file writer (format 1, one track; channel 10 for drums)
  function midi(bpm,notes,name){
    const ppq=480,ev=[];notes.forEach(o=>{const on=Math.max(0,Math.round(o.t*ppq)),off=Math.max(on+1,Math.round((o.t+o.d)*ppq)),ch=o.ch||0;
      ev.push([on,0x90|ch,o.n&127,Math.max(1,Math.min(127,Math.round(o.v||96)))],[off,0x80|ch,o.n&127,0]);});
    ev.sort((a,b)=>a[0]-b[0]||(a[1]&0xf0)-(b[1]&0xf0));
    const vlq=n=>{const b=[n&0x7f];while(n>>=7)b.unshift((n&0x7f)|0x80);return b;},us=Math.round(6e7/bpm),nm=[...name].map(c=>c.charCodeAt(0)&0x7f);
    const d=[0,0xff,0x03,...vlq(nm.length),...nm,0,0xff,0x51,3,(us>>16)&255,(us>>8)&255,us&255,0,0xff,0x58,4,4,2,24,8];
    let last=0;ev.forEach(e=>{d.push(...vlq(e[0]-last),e[1],e[2],e[3]);last=e[0];});d.push(0,0xff,0x2f,0);
    const L=d.length;return new Uint8Array([0x4d,0x54,0x68,0x64,0,0,0,6,0,1,0,1,(ppq>>8)&255,ppq&255,0x4d,0x54,0x72,0x6b,(L>>>24)&255,(L>>16)&255,(L>>8)&255,L&255,...d]);}
  // ---------- WAV writer (16-bit PCM)
  function wav(buf){const ch=buf.numberOfChannels,sr=buf.sampleRate,n=buf.length,b=new ArrayBuffer(44+n*ch*2),v=new DataView(b);
    const w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));w(0,'RIFF');v.setUint32(4,36+n*ch*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);
    v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*ch*2,true);
    const data=[...Array(ch)].map((_,c)=>buf.getChannelData(c));let o=44,peak=0;for(const a of data)for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(a[i]));const g=peak>0?.89/peak:1;   // every file peaks at −1 dB
    for(let i=0;i<n;i++)for(let c=0;c<ch;c++){v.setInt16(o,Math.max(-1,Math.min(1,data[c][i]*g))*32767,true);o+=2;}return new Uint8Array(b);}
  async function render(sec,draw){const sr=44100,ac=new OfflineAudioContext(2,Math.ceil(sr*sec),sr);
    if(!AU.noise){const nb=ac.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;AU.noise=nb;}
    const bus=ac.createGain();bus.gain.value=.85;const comp=ac.createDynamicsCompressor();comp.threshold.value=-10;comp.ratio.value=4;bus.connect(comp).connect(ac.destination);
    await draw(ac,bus);return ac.startRendering();}
  const room=(ac,dest,rt=1.2,wet=.18)=>{const v=ac.createConvolver();v.buffer=makeIR(ac,rt,{damp:.55});const g=gn(ac,wet);v.connect(g).connect(dest);return v;};

  // ---------- the recipes: notes for MIDI kinds, a render for audio kinds
  const DRUMS={four:['x...x...x...x...','....x.......x...','..x...x...x...x.'],break:['x.....x...x.....','....x.......x..x','x.x.x.x.x.x.x.x.'],
    half:['x.........x.....','........x.......','x.x.x.x.x.x.x.x.'],trap:['x......x..x.....','........x.......','xxxxxxxxxxx.xxxx'],shuffle:['x.....x.x.......','....x.......x...','x.xx.xx.xx.xx.x.']};
  const K={
    chords:{label:'Chord progression',ext:'mid',build(r,key,bpm){const P=pk(r,PROGS[key.mode]),seven=r()<.5,stab=r()<.4,out=[];
        P.forEach((dg,b)=>{const ns=triad(key,dg,seven).map(n=>n<55?n+12:n);if(stab)[0,1.5,3].forEach(t=>ns.forEach(n=>out.push({t:b*4+t,d:.4,n,v:84})));else ns.forEach((n,i)=>out.push({t:b*4+i*.02,d:3.9,n,v:76}));});
        return {notes:out,beats:16,info:`${P.map(d=>['I','II','III','IV','V','VI','VII'][d]).join(' – ')}${seven?' (7ths)':''}${stab?' · stabs':''}`};}},
    bass:{label:'Bassline',ext:'mid',build(r,key,bpm){const P=pk(r,PROGS[key.mode]),pat=pk(r,['x..x..x.x..x..x.','x.......x.x.....','x..x.x..x..x.x..','x...x..xx...x..x']),out=[];
        for(let b=0;b<4;b++){const root=deg(key,P[b],-2);[...pat].forEach((c,i)=>{if(c==='x')out.push({t:b*4+i/4,d:.22,n:i%8===6&&r()<.5?root+12:root,v:100});});}
        return {notes:out,beats:16,info:`4 bars, follows ${P.map(d=>['I','II','III','IV','V','VI','VII'][d]).join('–')}`};}},
    drums:{label:'Drum pattern',ext:'mid',build(r,key,bpm){const st=pk(r,Object.keys(DRUMS)),[k,s,h]=DRUMS[st],out=[];
        for(let bar=0;bar<2;bar++)for(let i=0;i<16;i++){const t=bar*4+i/4;if(k[i]==='x')out.push({t,d:.1,n:36,v:110,ch:9});if(s[i]==='x')out.push({t,d:.1,n:bar&&i===15?39:38,v:i===15?70:105,ch:9});
          if(h[i]==='x')out.push({t:t+(st==='shuffle'&&i%2?.08:0),d:.05,n:i===14&&r()<.5?46:42,v:i%4===0?90:62,ch:9});}
        if(st==='trap')[3.25,3.375,3.5,3.625,3.75,3.875].forEach((t,j)=>out.push({t:4+t,d:.05,n:42,v:50+j*8,ch:9}));
        return {notes:out,beats:8,info:`2 bars, ${st} feel (General MIDI drums)`};}},
    arp:{label:'Arpeggio',ext:'mid',build(r,key,bpm){const P=pk(r,PROGS[key.mode]),shape=pk(r,['up','down','updown','random']),out=[];
        for(let b=0;b<4;b++){let ns=triad(key,P[b],true).map(n=>n+12);ns=ns.concat(ns.map(n=>n+12));if(shape==='down')ns.reverse();if(shape==='updown')ns=ns.concat(ns.slice(1,-1).reverse());
          for(let i=0;i<16;i++)out.push({t:b*4+i/4,d:.2,n:shape==='random'?pk(r,ns):ns[i%ns.length],v:i%4===0?96:72});}
        return {notes:out,beats:16,info:`16ths, ${shape}, over ${P.map(d=>['I','II','III','IV','V','VI','VII'][d]).join('–')}`};}},
    motif:{label:'Melody seed',ext:'mid',build(r,key,bpm){const out=[];let t=0,d=pk(r,[0,2,4,7]);const rh=pk(r,[[1,.5,.5,1,1],[.75,.75,.5,1,1],[.5,.5,1,.5,1.5],[1.5,.5,1,1]]);
        const notes=rh.map(len=>{const n={t,d:len*.9,n:deg(key,d,1),v:92};t+=len;d+=pk(r,[-2,-1,1,1,2,3,-3]);return n;});out.push(...notes);
        notes.forEach((n,i)=>out.push({...n,t:n.t+4,n:i===notes.length-1?deg(key,0,1):n.n}));   // bar 2: the same line, landing home
        return {notes:out,beats:8,info:'2 bars: an idea, then the same idea coming home'};}},
    beat:{label:'Drum loop',ext:'wav',audio:true,async build(r,key,bpm){const st=pk(r,Object.keys(DRUMS)),[k,s,h]=DRUMS[st],sd=60/bpm/4,bars=2;
        const buf=await render(bars*16*sd+.6,(ac,bus)=>{const v=room(ac,bus,.7,.12);const dr=gn(ac,1);dr.connect(bus);dr.connect(v);
          for(let bar=0;bar<bars;bar++)for(let i=0;i<16;i++){const t=.02+(bar*16+i)*sd;if(k[i]==='x')DR.kick(ac,dr,t,{v:1,dec:.4});if(s[i]==='x')DR.snare(ac,dr,t,{v:.8});if(h[i]==='x')DR.nhat(ac,dr,t+(st==='shuffle'&&i%2?sd*.33:0),{v:i%4===0?.7:.45,dec:.04});}});
        return {buf,info:`2 bars at ${bpm} BPM, ${st} feel`};}},
    texture:{label:'Texture',ext:'wav',audio:true,async build(r,key,bpm){const dg=pk(r,[0,3,5]),ns=triad(key,dg,true).map(n=>n-12),len=8;
        const buf=await render(len+2,(ac,bus)=>{const v=room(ac,bus,3,.45);const g=gn(ac,.7);g.connect(bus);g.connect(v);VO.pad(ac,g,.05,{notes:ns,len,v:.8,cut:900+r()*1600,a:2,r:1.6,det:14});});
        return {buf,info:`8 s pad on ${['I','II','III','IV','V','VI','VII'][dg]} of ${key.name}`};}},
    hit:{label:'One-shot',ext:'wav',audio:true,async build(r,key,bpm){const type=pk(r,['metal','boom','glass','clap']);
        const buf=await render(2.2,(ac,bus)=>{const v=room(ac,bus,1.6,.35);const g=gn(ac,1);g.connect(bus);g.connect(v);
          if(type==='metal'){DR.cowbell(ac,g,.02,{v:1});DR.hat(ac,g,.02,{v:.8,open:true});}
          else if(type==='boom'){DR.kick(ac,g,.02,{v:1,dec:1.3,f0:38,drive:.8});DR.tom(ac,g,.02,{v:.6,f:90,dec:.8});}
          else if(type==='glass'){VO.bellv(ac,g,.02,{n:deg(key,0,2),v:.9,dec:1.6});VO.bellv(ac,g,.03,{n:deg(key,4,2),v:.5,dec:1.2});}
          else{DR.clap(ac,g,.02,{v:1,dec:.4});DR.snare(ac,g,.02,{v:.5,dec:.2});}});
        return {buf,info:`a ${type} hit, tuned to ${key.name}`};}},
    riser:{label:'Riser',ext:'wav',audio:true,async build(r,key,bpm){const len=16*60/bpm;
        const buf=await render(len+.4,(ac,bus)=>{const s=ac.createBufferSource();s.buffer=AU.noise;s.loop=true;const f=bq(ac,'bandpass',300,3),g=gn(ac,0);
          f.frequency.setValueAtTime(250,0);f.frequency.exponentialRampToValueAtTime(9000,len);g.gain.setValueAtTime(0,0);g.gain.linearRampToValueAtTime(.9,len);g.gain.linearRampToValueAtTime(0,len+.05);
          s.connect(f).connect(g).connect(bus);s.start(0);s.stop(len+.1);
          const o=osc(ac,'sawtooth',hz(deg(key,0,-1))),og=gn(ac,0);o.frequency.exponentialRampToValueAtTime(hz(deg(key,0,1)),len);og.gain.linearRampToValueAtTime(.12,len);o.connect(og).connect(bus);o.start(0);o.stop(len);});
        return {buf,info:`4 bars at ${bpm} BPM, lands on the downbeat`};}},
    chop:{label:'Song chop',ext:'wav',audio:true,async build(r,key,bpm){
        if(!window.SONG||!SONG.src)throw new Error('no demo song');
        const base=(window.CR_BASE||'')+SONG.src,bytes=await (await fetch(base)).arrayBuffer();
        const tmp=new OfflineAudioContext(2,44100,44100),song=await tmp.decodeAudioData(bytes);
        const ex=pk(r,SONG.excerpts),bar=60/SONG.bpm*4,len=bar*Math.min(2,ex.bars||2);
        const buf=await render(len,(ac,bus)=>{const s=ac.createBufferSource();s.buffer=song;s.connect(bus);s.start(0,ex.at,len);});
        return {buf,info:`2 bars of the demo song at ${SONG.bpm} BPM (warp it to yours)`};}},
  };
  const KINDS=Object.keys(K),MIDI_KINDS=KINDS.filter(k=>!K[k].audio),AUDIO_KINDS=KINDS.filter(k=>K[k].audio);
  const slug=s=>String(s).replace(/♭/g,'b').replace(/♯/g,'s').replace(/[^A-Za-z0-9]+/g,'').slice(0,18);
  // a recipe → {name, mime, bytes, info, label, kind}
  async function make(rc){const k=K[rc.kind];if(!k)throw new Error('unknown asset '+rc.kind);const r=rng(rc.seed),key=keyOf(rc.key);
    const name=`CR${rc.round?'_r'+rc.round:''}_${slug(k.label)}_${slug(key.name)}_${rc.bpm}bpm${rc.who?'_'+slug(rc.who):''}.${k.ext}`;
    if(k.audio){const o=await k.build(r,key,rc.bpm);return {kind:rc.kind,label:k.label,name,mime:'audio/wav',bytes:wav(o.buf),info:o.info};}
    const o=k.build(r,key,rc.bpm);return {kind:rc.kind,label:k.label,name,mime:'audio/midi',bytes:midi(rc.bpm,o.notes,`Control Room · ${k.label}`),info:o.info,notes:o.notes,beats:o.beats};}
  // a quick listen: MIDI through the Telephone-style synth voices, audio as it is
  function preview(file,dest){const ac=audio();const out=gn(ac,.8);out.connect(dest||AU.music);const h={stop(){try{out.disconnect();}catch(e){}AU.live.delete(h);}};AU.live.add(h);
    if(file.mime==='audio/wav'){ac.decodeAudioData(file.bytes.slice().buffer).then(b=>{const s=ac.createBufferSource();s.buffer=b;s.connect(out);s.start();});return h;}
    const t0=ac.currentTime+.05,bpm=+((file.name.match(/_(\d+)bpm/)||[])[1]||100),spb=60/bpm;
    (file.notes||[]).forEach(n=>{const t=t0+n.t*spb;if(n.ch===9){(n.n===36?DR.kick:n.n===38||n.n===39?DR.snare:DR.nhat)(ac,out,t,{v:n.v/127});}
      else if(n.n<48)VO.bass(ac,out,t,{n:n.n,len:n.d*spb,v:n.v/127});else VO.ep(ac,out,t,{n:n.n,len:n.d*spb,v:n.v/140});});
    return h;}
  return {KEYS,KINDS,MIDI_KINDS,AUDIO_KINDS,K,make,preview,midi,wav,rng};
})();
