/* ====================================================================
   MIDI ENGINE — the teacher's MIDI library, shared by The Frankenhit, Blind Orchestra and Genre Teleporter.
   The library lives in this browser only (clipDB dec -7, never in the repo). Each file is read here:
     parse → parts per (track, channel) [type 0 files keep every instrument in one track]
     → roles: drums · bass · chords · melody · extra
       drums: channel 10, else a drum-ish track name, else the part that plays most like a kit (a small logistic model
       trained on 1,600 songs of the library where channel 10 is the answer: 95.5 % right as the single pick per song)
     → key (Krumhansl), tempo, the busiest stretch of N bars → clips in beats, played by the WebAudio voices.
   An index of every song (roles, key, tempo) is kept in localStorage midi.idx so the modules can deal songs instantly.
   ==================================================================== */
'use strict';

/* ---------- reading a Standard MIDI File */
function mdParse(buf){const b=new Uint8Array(buf),dv=new DataView(b.buffer,b.byteOffset,b.byteLength);let p=0;
  const str=n=>{let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(b[p+i]);p+=n;return s;},u32=()=>{const v=dv.getUint32(p);p+=4;return v;},u16=()=>{const v=dv.getUint16(p);p+=2;return v;};
  const vlq=()=>{let v=0,c;do{c=b[p++];v=(v<<7)|(c&127);}while(c&128&&p<b.length);return v;};
  // find MThd (some files carry a RIFF wrapper)
  const h=(()=>{for(let i=0;i<Math.min(b.length-4,4096);i++)if(b[i]===0x4d&&b[i+1]===0x54&&b[i+2]===0x68&&b[i+3]===0x64)return i;return -1;})();if(h<0)throw new Error('not a MIDI file');p=h+4;
  const hl=u32(),fmt=u16(),nt=u16(),div=u16();p=h+8+hl;if(div&0x8000)throw new Error('SMPTE timing');
  const tracks=[];let tempo=500000,num=4,den=4,tempoSet=false;
  for(let k=0;k<nt&&p<b.length-8;k++){while(p<b.length-8&&str(4)!=='MTrk'){p-=3;}const len=u32(),end=Math.min(b.length,p+len);let t=0,rs=0;const ev=[];let name='';
    while(p<end){t+=vlq();let st=b[p];if(st&0x80){p++;rs=st<0xf0?st:rs;}else st=rs;
      if(st===0xff){const ty=b[p++],l=vlq();if(ty===0x51&&!tempoSet&&l===3){tempo=(b[p]<<16)|(b[p+1]<<8)|b[p+2];tempoSet=true;}
        else if(ty===0x58&&l>=2&&t===0){num=b[p];den=1<<b[p+1];}else if(ty===0x03&&!name){name=new TextDecoder('latin1').decode(b.subarray(p,p+l)).replace(/\0/g,'').trim();}p+=l;continue;}
      if(st===0xf0||st===0xf7){const l=vlq();p+=l;continue;}
      const hi=st&0xf0,ch=st&15;
      if(hi===0xc0||hi===0xd0){ev.push([t,hi,ch,b[p++],0]);continue;}
      ev.push([t,hi,ch,b[p],b[p+1]]);p+=2;}
    p=end;tracks.push({name,ev});}
  return {fmt,tpq:div,tracks,bpm:Math.round(6e7/tempo*10)/10,num,den,seq:(tracks[0]&&tracks[0].name)||''};}
// notes per (track, channel), in beats
function mdParts(M){const P=new Map(),tpq=M.tpq;
  M.tracks.forEach((tr,ti)=>{const open=new Map(),prog={};
    tr.ev.forEach(([t,hi,ch,a,v])=>{const key=ti+':'+ch;
      if(hi===0xc0){prog[ch]=a;const x=P.get(key);if(x&&x.prog==null)x.prog=a;return;}
      if(hi===0x90&&v>0){if(!P.has(key))P.set(key,{ti,ch,name:tr.name,prog:prog[ch]??null,notes:[]});const k=ch*128+a;if(!open.has(k))open.set(k,[]);open.get(k).push([t,v]);return;}
      if(hi===0x80||(hi===0x90&&v===0)){const k=ch*128+a,s=open.get(k);if(s&&s.length){const [t0,vel]=s.shift();P.get(key).notes.push({t:t0/tpq,d:Math.max(.02,(t-t0)/tpq),n:a,v:vel});}}});
    open.forEach((s,k)=>s.forEach(([t0,vel])=>{const ch=Math.floor(k/128),x=P.get(ti+':'+ch);if(x)x.notes.push({t:t0/tpq,d:.25,n:k%128,v:vel});}));});
  return [...P.values()].filter(x=>x.notes.length>=8).map(x=>(x.notes.sort((a,b)=>a.t-b.t),x));}

/* ---------- which part is which */
const MD_W=[1.849,2.868,-3.054,1.375,-.991,6.313,.023,.707,-5.872,-2.403,2.743,1.862],MD_B=-1.689;   // drum model (features below)
function mdDrumScore(p){const ns=p.notes,ps=ns.map(x=>x.n),n=ps.length,ds=ns.map(x=>x.d);
  const cnt=a=>{const m=new Map();a.forEach(x=>m.set(x,(m.get(x)||0)+1));return m;},pc=cnt(ps),dc=cnt(ds.map(d=>Math.round(d*96)));
  const kit=ps.filter(q=>q>=35&&q<60).length/n,core=ps.filter(q=>[35,36,38,40,42,44,46].includes(q)).length/n,distinct=pc.size;
  const dmode=Math.max(...dc.values())/n,med=[...ds].sort((a,b)=>a-b)[n>>1];
  const top3=[...pc.values()].sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0)/n;
  const st=cnt(ns.map(x=>Math.round(x.t*96))),stack=[...st.values()].filter(c=>c>1).length/Math.max(1,st.size);
  let iv=0;for(let i=1;i<n;i++)iv+=Math.abs(ps[i]-ps[i-1]);iv/=Math.max(1,n-1);
  const pcs=new Array(12).fill(0);ps.forEach(q=>pcs[q%12]++);let kf=0;for(let r=0;r<12;r++)kf=Math.max(kf,[0,2,4,5,7,9,11].reduce((a,s)=>a+pcs[(r+s)%12],0));kf/=n;
  const mean=ps.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(ps.reduce((a,b)=>a+(b-mean)**2,0)/n);
  const f=[kit,core,distinct/30,dmode,Math.min(med,4),top3,stack,iv/12,kf,p.prog!=null&&p.prog>=32&&p.prog<=39?1:0,p.prog==null?1:0,sd/12];
  return 1/(1+Math.exp(-(f.reduce((a,x,i)=>a+x*MD_W[i],0)+MD_B)));}
function mdStats(p){const ns=p.notes,ps=ns.map(x=>x.n).sort((a,b)=>a-b),med=ps[ps.length>>1];
  const by=new Map();ns.forEach(x=>{const k=Math.round(x.t*24);by.set(k,(by.get(k)||0)+1);});const poly=[...by.values()].filter(c=>c>1).length/Math.max(1,by.size);
  return {med,poly,n:ns.length,span:ns.length?ns[ns.length-1].t-ns[0].t:0};}
const MD_RX={drums:/drum|kit|perc|snare|kick|hi.?hat|cymbal|tom\b|batter/i,bass:/bass(?!oon)/i,melody:/melod|vocal|voice|vox|lead|sing|solo|tune|tema|theme/i,chords:/chord|piano|organ|pad|string|guitar|gtr|rhythm|keys|synth|harm|comp/i};
function mdRoles(parts){const R={},left=new Set(parts);
  const ch10=parts.filter(p=>p.ch===9);
  if(ch10.length){R.drums={...ch10[0],notes:ch10.flatMap(p=>p.notes).sort((a,b)=>a.t-b.t),name:'Drums'};ch10.forEach(p=>left.delete(p));}
  else{const named=parts.find(p=>MD_RX.drums.test(p.name));const best=named||parts.map(p=>[p,mdDrumScore(p)]).sort((a,b)=>b[1]-a[1]).filter(x=>x[1]>=.5).map(x=>x[0])[0];
    if(best){R.drums=best;left.delete(best);}}
  const S=new Map([...left].map(p=>[p,mdStats(p)]));
  const take=(role,fn)=>{const c=[...left].filter(fn);if(!c.length)return;R[role]=c[0];left.delete(c[0]);};
  const byName=rx=>p=>rx.test(p.name);
  take('bass',p=>byName(MD_RX.bass)(p)||(p.prog!=null&&p.prog>=32&&p.prog<=39));
  if(!R.bass){const c=[...left].filter(p=>S.get(p).med<55&&S.get(p).poly<.35).sort((a,b)=>S.get(a).med-S.get(b).med);if(c.length){R.bass=c[0];left.delete(c[0]);}}
  take('melody',p=>byName(MD_RX.melody)(p)&&S.get(p).poly<.5);
  if(!R.melody){const c=[...left].filter(p=>S.get(p).med>=57&&S.get(p).poly<.35).sort((a,b)=>(S.get(b).med*.04+Math.log(S.get(b).n))-(S.get(a).med*.04+Math.log(S.get(a).n)));if(c.length){R.melody=c[0];left.delete(c[0]);}}
  const ch=[...left].filter(p=>S.get(p).poly>=.35).sort((a,b)=>(byName(MD_RX.chords)(b)?1:0)-(byName(MD_RX.chords)(a)?1:0)||S.get(b).n-S.get(a).n);
  if(ch.length){R.chords=ch[0];left.delete(ch[0]);}
  const ex=[...left].sort((a,b)=>S.get(b).n-S.get(a).n);if(ex.length)R.extra=ex[0];
  return R;}
// key: Krumhansl–Kessler profiles over duration-weighted pitch classes
const MD_KMAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],MD_KMIN=[6.33,2.68,3.52,5.38,2.6,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
const MD_NOTE=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
function mdKey(parts){const h=new Array(12).fill(0);parts.forEach(p=>p.notes.forEach(x=>h[x.n%12]+=Math.min(x.d,4)));
  const corr=(prof,r)=>{const xs=h.map((_,i)=>h[(i+r)%12]),mx=xs.reduce((a,b)=>a+b,0)/12,my=prof.reduce((a,b)=>a+b,0)/12;let s=0,sx=0,sy=0;for(let i=0;i<12;i++){s+=(xs[i]-mx)*(prof[i]-my);sx+=(xs[i]-mx)**2;sy+=(prof[i]-my)**2;}return s/Math.sqrt(sx*sy||1);};
  let best={r:0,m:'major',c:-2};for(let r=0;r<12;r++){const a=corr(MD_KMAJ,r),b=corr(MD_KMIN,r);if(a>best.c)best={r,m:'major',c:a};if(b>best.c)best={r,m:'minor',c:b};}
  return {root:best.r,mode:best.m,name:MD_NOTE[best.r]+(best.m==='minor'?' minor':' major')};}

/* ---------- songs: parse + roles + key, cached */
const MD_CACHE=new Map();
async function mdSong(c){if(MD_CACHE.has(c.id))return MD_CACHE.get(c.id);
  const M=mdParse(await c.blob.arrayBuffer()),parts=mdParts(M),roles=mdRoles(parts),pitched=Object.entries(roles).filter(([k])=>k!=='drums').map(([,p])=>p);
  const end=Math.max(0,...parts.map(p=>p.notes.length?p.notes[p.notes.length-1].t+p.notes[p.notes.length-1].d:0));
  const S={id:c.id,title:mdTitle(c,M.seq),artist:mdArtist(c),bpm:Math.max(50,Math.min(200,M.bpm||120)),barBeats:Math.max(2,Math.min(8,M.num*4/M.den)),roles,key:pitched.length?mdKey(pitched):{root:0,mode:'major',name:'C major'},beats:end};
  MD_CACHE.set(c.id,S);if(MD_CACHE.size>60)MD_CACHE.delete(MD_CACHE.keys().next().value);return S;}
const MD_GENERIC=/^(midi.?(files?|collection.*)?|midi_\d+|groups?\d*|unsorted|various|misc|a#|other.*|new folder|songs?|.*collection.*)$/i;
function mdTitle(c,seq){const raw=String(c.name).replace(/\.(midi?|kar)$/i,'');
  // old DOS names (WILD L~1) are cut short: the song name stored in the file is better
  if((/~\d/.test(raw)||raw.length<4)&&seq&&seq.length>2&&!/^(track|untitled|seq)/i.test(seq))return seq.replace(/\s+\d+$/,'').replace(/\b[a-z]/g,m=>m.toUpperCase()).trim();
  let t=String(c.name).replace(/\.(midi?|kar)$/i,'').replace(/[_]+/g,' ').replace(/\s*\(\d+\)\s*$/,'').replace(/^\d+[\s.\-_]+/,'').trim();
  t=t.replace(/[\s\-_]+\d$/,'').trim();if(t===t.toUpperCase()||t===t.toLowerCase())t=t.toLowerCase().replace(/(^|[\s(\-\/])[a-z]/g,m=>m.toUpperCase());return t||c.name;}
function mdArtist(c){const parts=String(c.path||'').split('/').slice(0,-1).reverse(),a0=parts.find(x=>x&&!MD_GENERIC.test(x.trim()));if(!a0)return '';const a=a0.replace(/_+/g,' ').trim();
  return a===a.toUpperCase()?a.toLowerCase().replace(/\b[a-z]/g,m=>m.toUpperCase()):a;}

/* ---------- the library in this browser */
const mdLib=()=>(typeof MYCLIPS==='undefined'?[]:MYCLIPS.list).filter(c=>c.dec===-7);
const mdIdx=()=>store.get('midi.idx',{});
const mdName=c=>{const x=mdIdx()[c.id];return (x&&x.t)||mdTitle(c);};   // the song's display title (from the index when read)
// one song's index line: which roles it has, its key and tempo (built once per file)
async function mdIndexOne(c){const I=mdIdx();if(I[c.id])return I[c.id];
  try{const S=await mdSong(c);I[c.id]={t:S.title,r:Object.keys(S.roles).map(k=>k[0]).join(''),k:S.key.root,m:S.key.mode==='minor'?1:0,b:Math.round(S.bpm),l:Math.round(S.beats)};}catch(e){I[c.id]={bad:1};}
  store.set('midi.idx',I);return I[c.id];}
async function mdBuildIndex(prog){const L=mdLib(),I=mdIdx();let k=0;
  for(const c of L){if(!I[c.id]){try{const S=await mdSong(c);I[c.id]={t:S.title,r:Object.keys(S.roles).map(x=>x[0]).join(''),k:S.key.root,m:S.key.mode==='minor'?1:0,b:Math.round(S.bpm),l:Math.round(S.beats)};}catch(e){I[c.id]={bad:1};}}
    if(++k%40===0){store.set('midi.idx',I);prog&&prog(k,L.length);await new Promise(r=>setTimeout(r,0));}}
  store.set('midi.idx',I);prog&&prog(L.length,L.length);return I;}
// songs that have every role asked for (and last long enough to loop)
function mdPool(need=[],opt={}){const I=mdIdx(),L=mdLib();return L.filter(c=>{const x=I[c.id];if(!x||x.bad||x.l<32)return false;
  if(!need.every(r=>x.r.includes(r[0])))return false;if(opt.mode!=null&&x.m!==opt.mode)return false;return true;});}

/* ---------- clips: the busiest N bars */
// many files are written in double (or half) time: f squeezes or stretches the beats so the music sits at 70–150 BPM
const mdFeel=S=>S.bpm>150?.5:S.bpm<68?2:1;
function mdWindow(S,roles,bars,f=1){const len=bars*S.barBeats/f,ps=roles.map(r=>S.roles[r]).filter(Boolean);if(!ps.length)return 0;
  let best=0,bs=-1;for(let s=0;s+len<=Math.max(len,S.beats);s+=S.barBeats){let sc=0;
    ps.forEach(p=>{let c=0;for(const x of p.notes){if(x.t>=s+len)break;if(x.t>=s)c++;}sc+=Math.min(1,c/(2*bars/f))*10+Math.log1p(c);});
    if(sc>bs){bs=sc;best=s;}}
  // no long silence at the start: if the lead part (roles[0], e.g. the tune) only enters later in the window, start at the
  // bar where it enters (a bar-aligned move keeps the downbeats; at most a few beats before the first note remain)
  const lead=ps[0],first=lead.notes.find(x=>x.t>=best&&x.t<best+len);
  if(first&&first.t-best>=1){const nb=best+Math.floor((first.t-best)/S.barBeats)*S.barBeats;if(nb>best&&nb+len<=Math.max(len,S.beats)+S.barBeats)best=nb;}
  return best;}
function mdClip(S,role,start,bars,shift=0,f=1){const p=S.roles[role];if(!p)return null;const len=bars*S.barBeats/f;
  const notes=p.notes.filter(x=>x.t>=start&&x.t<start+len).map(x=>({t:(x.t-start)*f,d:Math.min(x.d,start+len-x.t)*f,n:role==='drums'?x.n:x.n+shift,v:x.v}));
  return {role,prog:p.prog,name:p.name,notes,len:bars*S.barBeats,barBeats:S.barBeats,ch:role==='drums'?9:null};}
// transpose a pitched clip into a target key (smallest move, -6..+5), and keep bass low / melody up
function mdShift(fromRoot,toRoot){let s=((toRoot-fromRoot)%12+12)%12;if(s>5)s-=12;return s;}

/* ---------- playing clips with the WebAudio voices */
const MD_DRUM=(ac,d,t,n,v)=>{
  if(n===35||n===36)DR.kick(ac,d,t,{v});else if(n===38||n===40)DR.snare(ac,d,t,{v});else if(n===37)DR.rim(ac,d,t,{v});else if(n===39)DR.clap(ac,d,t,{v});
  else if(n===42||n===44)DR.hat(ac,d,t,{v:v*.8});else if(n===46)DR.hat(ac,d,t,{v:v*.8,open:true});
  else if([41,43,45,47,48,50].includes(n))DR.tom(ac,d,t,{v,f:80+(n-41)*18});else if([49,52,55,57].includes(n))DR.crash(ac,d,t,{v:v*.8});
  else if([51,53,59].includes(n))DR.nhat(ac,d,t,{v:v*.7,dec:.22,f:9000});else if(n===54)DR.tamb(ac,d,t,{v});else if(n===56)DR.cowbell(ac,d,t,{v:v*.7});
  else if(n===69||n===70)DR.shaker(ac,d,t,{v});else DR.rim(ac,d,t,{v:v*.6});};
// which synth voice plays a part: by role, General MIDI program and track name
function mdVoice(clip){const p=clip.prog,nm=clip.name||'';
  if(clip.voice)return clip.voice;if(clip.role==='bass')return 'bass';if(/vocal|voice|vox|sing|choir/i.test(nm))return 'vocal';
  if(/piano|keys/i.test(nm))return 'piano';if(/string|violin|viola|cello/i.test(nm))return 'strings';if(/brass|horn|trumpet|trombone|sax/i.test(nm))return 'brass';
  if(p==null)return clip.role==='chords'?'piano':'lead';
  if(p<4)return 'piano';if(p<8)return 'ep';if(p<16)return 'bell';if(p<24)return 'organ';if(p<32)return 'pluck';if(p<40)return 'bass';
  if(p<52)return 'strings';if(p<56)return 'pad';if(p<64)return 'brass';if(p<72)return 'brass';if(p<80)return 'lead';if(p<88)return 'lead';if(p<96)return 'pad';return 'ep';}
/* the grand piano: the University of Iowa samples (audio/atlas/piano, every semitone C2–C6, public domain), loaded once on
   first use; a note plays the nearest sample, re-pitched, and is damped when it ends. Until they're in, the FM piano plays. */
const MD_PIANO={bufs:new Map(),p:null};
function mdPianoLoad(){if(MD_PIANO.p)return MD_PIANO.p;const ac=audio(),NN=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'],jobs=[];
  for(let m=36;m<=84;m++)jobs.push(fetch(`audio/atlas/piano/${NN[m%12]}${Math.floor(m/12)-1}.mp3`).then(r=>r.arrayBuffer()).then(b=>new Promise((res,rej)=>ac.decodeAudioData(b,res,rej))).then(buf=>MD_PIANO.bufs.set(m,buf)).catch(()=>{}));
  return MD_PIANO.p=Promise.all(jobs);}
function mdPiano(ac,d,t,n,len,v){let m=Math.max(36,Math.min(84,Math.round(n)));if(!MD_PIANO.bufs.has(m)){let k=1;while(k<12&&!MD_PIANO.bufs.has(m+k)&&!MD_PIANO.bufs.has(m-k))k++;m=MD_PIANO.bufs.has(m+k)?m+k:m-k;}
  const buf=MD_PIANO.bufs.get(m);if(!buf){mdPianoLoad();VO.ep(ac,d,t,{n,len:Math.max(.15,len),v:v*.9});return;}
  const src=ac.createBufferSource(),g=gn(ac,0),hold=Math.min(buf.duration,Math.max(.12,len));src.buffer=buf;src.playbackRate.value=Math.pow(2,(n-m)/12);
  const pk=.78*Math.pow(v,1.4);g.gain.setValueAtTime(pk,t);g.gain.setTargetAtTime(0,t+hold,.12);   // the damper falls when the key comes up
  src.connect(g).connect(d);src.start(t);src.stop(t+hold+.8);}
const MD_VOX={
  // a string section: five detuned saws, a slow bow, gentle vibrato that comes in late
  strings(ac,d,t,n,len,v){const f=bq(ac,'lowpass',2600,.7),hp=bq(ac,'highpass',180,.7),g=gn(ac,0),L=Math.max(.25,len);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*.066,t+.09);g.gain.setValueAtTime(v*.066,t+L);g.gain.linearRampToValueAtTime(0,t+L+.25);
    const lfo=osc(ac,'sine',5.2),lg=gn(ac,0);lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(hz(n)*.004,t+.5);lfo.connect(lg);
    [-9,-4,0,4,9].forEach(c=>{const o=osc(ac,'sawtooth',hz(n));o.detune.value=c;lg.connect(o.frequency);o.connect(f);o.start(t);o.stop(t+L+.3);});
    lfo.start(t);lfo.stop(t+L+.3);f.connect(hp).connect(g).connect(d);},
  // brass: two saws and a square, the filter opening with the breath
  brass(ac,d,t,n,len,v){const f=bq(ac,'lowpass',500,1.2),g=gn(ac,0),L=Math.max(.12,len);
    f.frequency.setValueAtTime(500,t);f.frequency.linearRampToValueAtTime(900+2600*v,t+.06);f.frequency.setTargetAtTime(1200+1200*v,t+.08,.2);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*.11,t+.035);g.gain.setTargetAtTime(v*.085,t+.06,.1);g.gain.setValueAtTime(v*.085,t+L);g.gain.linearRampToValueAtTime(0,t+L+.08);
    [[ 'sawtooth',-6],['sawtooth',6],['square',0]].forEach(([w,c])=>{const o=osc(ac,w,hz(n));o.detune.value=c;o.connect(f);o.start(t);o.stop(t+L+.1);});f.connect(g).connect(d);},
};
function mdPlayNote(ac,d,t,voice,n,len,v){
  if(voice==='piano')return mdPiano(ac,d,t,n,len,v);if(MD_VOX[voice])return MD_VOX[voice](ac,d,t,n,len,v);
  switch(voice){case 'bass':VO.bass(ac,d,t,{n,len,v});break;case 'sub':VO.sub(ac,d,t,{n,len,v});break;case 'ep':VO.ep(ac,d,t,{n,len:Math.max(.15,len),v:v*.9});break;
    case 'organ':VO.organ(ac,d,t,{n,len,v});break;case 'pluck':VO.pluck(ac,d,t,{n,v,dec:.993});break;case 'bell':VO.bellv(ac,d,t,{n,v:v*.8});break;
    case 'vocal':VO.vocal(ac,d,t,{n,len,v:v*.7});break;case 'pad':VO.pad(ac,d,t,{notes:[n],len:Math.max(.3,len),v,a:.05,r:.3});break;case 'saw':VO.supersaw(ac,d,t,{notes:[n],len,v});break;
    default:VO.lead(ac,d,t,{n,len,v:v*.9});}}
const MD_ROOM={ir:null};
/* a looping band: layers {clip, gain, voice}; set(slot, clip) swaps a layer at the next loop. Returns a handle. */
function mdBand({bpm,bars,barBeats=4,dest,swing=0}){const ac=audio(),out=gn(ac,.9);out.connect(dest||AU.music);mdPianoLoad();
  const room=ac.createConvolver();room.buffer=MD_ROOM.ir||(MD_ROOM.ir=makeIR(ac,1.1,{damp:.55}));const rg=gn(ac,.16);out.connect(room).connect(rg).connect(dest||AU.music);   // a small room
  const L=bars*barBeats,spb=60/bpm,B={ac,out,bpm,layers:{},pending:{},gains:{},t0:ac.currentTime+.15,next:0,loopN:0,stop(){clearInterval(B.tick);try{out.disconnect();rg.disconnect();}catch(e){}AU.live.delete(B);},
    set(slot,clip){B.pending[slot]=clip;},setNow(slot,clip){B.layers[slot]=clip;},level(slot,v){const g=B.gain(slot);g.gain.setTargetAtTime(v,ac.currentTime,.05);},
    gain(slot){if(!B.gains[slot]){B.gains[slot]=gn(ac,1);B.gains[slot].connect(out);}return B.gains[slot];},
    pos(){return Math.max(0,(ac.currentTime-B.t0)/(L*spb))%1;},loopLen:L*spb};
  AU.live.add(B);
  // schedule one loop at a time, a little ahead
  const sched=()=>{const now=ac.currentTime;while(B.t0+B.next*L*spb<now+.4){const ls=B.t0+B.next*L*spb;Object.assign(B.layers,B.pending);B.pending={};
      Object.entries(B.layers).forEach(([slot,c])=>{if(!c||c.mute)return;const d=B.gain(slot),voice=mdVoice(c),sc=c.scale||1;
        c.notes.forEach(x=>{const tb=x.t*sc;if(tb>=L)return;const sw=swing&&Math.abs((tb*2)%1-.5)<.01?swing*spb*.5:0,t=ls+tb*spb+sw,v=Math.max(.15,(x.v||96)/127)*(c.vel||1);
          if(c.role==='drums'&&!c.voice)MD_DRUM(ac,d,t,x.n,v);else mdPlayNote(ac,d,t,voice,x.n,Math.max(.05,x.d*sc*spb),v);});});
      B.next++;B.loopN++;}};
  sched();B.tick=setInterval(sched,60);return B;}

/* ---------- writing a MIDI file: one track per part */
function mdWrite(parts,bpm,title='Control Room'){const tpq=480,trk=[];const vlq=n=>{const b=[n&127];while(n>>=7)b.unshift((n&127)|128);return b;},txt=s=>[...String(s)].map(c=>c.charCodeAt(0)&127);
  const us=Math.round(6e7/bpm),t0=[0,0xff,0x03,...vlq(title.length),...txt(title),0,0xff,0x51,3,(us>>16)&255,(us>>8)&255,us&255,0,0xff,0x58,4,4,2,24,8,0,0xff,0x2f,0];trk.push(t0);
  let chn=0;parts.forEach(pt=>{const ch=pt.role==='drums'?9:(chn===9?++chn:chn)%16;if(pt.role!=='drums')chn++;const ev=[];
    pt.notes.forEach(x=>{const on=Math.round(x.t*(pt.scale||1)*tpq),off=Math.max(on+1,Math.round((x.t+x.d)*(pt.scale||1)*tpq)),n=Math.max(0,Math.min(127,x.n));ev.push([on,0x90|ch,n,Math.max(1,Math.min(127,x.v||96))],[off,0x80|ch,n,0]);});
    ev.sort((a,b)=>a[0]-b[0]||(a[1]&0xf0)-(b[1]&0xf0));const nm=pt.label||pt.role;
    const d=[0,0xff,0x03,...vlq(nm.length),...txt(nm)];if(pt.role!=='drums'&&pt.prog!=null)d.push(0,0xc0|ch,pt.prog&127);let last=0;ev.forEach(e=>{d.push(...vlq(e[0]-last),e[1],e[2],e[3]);last=e[0];});d.push(0,0xff,0x2f,0);trk.push(d);});
  const out=[0x4d,0x54,0x68,0x64,0,0,0,6,0,1,(trk.length>>8)&255,trk.length&255,(tpq>>8)&255,tpq&255];
  trk.forEach(d=>{const L=d.length;out.push(0x4d,0x54,0x72,0x6b,(L>>>24)&255,(L>>16)&255,(L>>8)&255,L&255,...d);});return new Uint8Array(out);}

/* ---------- the shared setup panel: load the MIDI folder */
const MD_ROLE={drums:{l:'Drums',c:'--red',sh:0},bass:{l:'Bass',c:'--blue',sh:1},chords:{l:'Chords',c:'--yel',sh:2},melody:{l:'Melody',c:'--green',sh:3},extra:{l:'Extra',c:'--red',sh:3}};
function mdLibPanel(){const L=mdLib(),I=mdIdx(),ok=L.filter(c=>I[c.id]&&!I[c.id].bad).length,todo=L.filter(c=>!I[c.id]).length;
  return `<div class="fsec mxsongs"><h3><b>♪</b>Your MIDI library<small>${L.length?`${L.length} files · ${ok} ready${todo?` · ${todo} still to read`:''}`:'nothing loaded yet'} · stays in this browser</small></h3>
    <div class="chimport"><label class="big go">${L.length?'Load a different folder':'Load your MIDI folder'}<input type="file" id="mdFolder" webkitdirectory multiple hidden></label><span class="chprog" id="mdProg"></span>
      <p class="fine">A folder of .mid files (subfolders are fine: an artist’s folder name is shown as the artist). Every song is read once to find its drums, bass, chords and melody. The files stay in this browser, never online.</p></div>
    ${L.length?`<div class="frow">${todo?'<button class="ghost" id="mdIndex">Read the rest now</button>':''}<button class="ghost" id="mdClear">Remove the MIDI library</button></div>`:''}</div>`;}
function mdLibBind(st,redraw){const fo=$('#mdFolder',st),prog=$('#mdProg',st);
  if(fo)fo.onchange=async()=>{const files=[...fo.files].filter(f=>/\.(midi?|kar)$/i.test(f.name)&&f.size>0&&f.size<2e6);if(!files.length){toast('No MIDI files in that folder');return;}
    for(const c of mdLib())await clipDB.del(c.id);store.set('midi.idx',{});MD_CACHE.clear();let n=0;
    for(const f of files){const path=f.webkitRelativePath||f.name;await clipDB.put({id:'md:'+path,dec:-7,name:f.name,path,blob:f,at:Date.now()+n});n++;if(prog&&n%50===0)prog.textContent=`Saving ${n} of ${files.length}…`;}
    await loadMyClips();await mdBuildIndex((k,N)=>{if(prog)prog.textContent=`Reading songs ${k} of ${N}…`;});toast(`${files.length} MIDI files ready`);redraw();};
  const ix=$('#mdIndex',st);if(ix)ix.onclick=async()=>{await mdBuildIndex((k,N)=>{if(prog)prog.textContent=`Reading songs ${k} of ${N}…`;});redraw();};
  const cl=$('#mdClear',st);if(cl)cl.onclick=async()=>{if(!confirm('Remove the MIDI library from this browser?'))return;for(const c of mdLib())await clipDB.del(c.id);store.set('midi.idx',{});await loadMyClips();redraw();};}
// the mini piano roll of a clip, as an SVG
function mdRoll(clip,{w=220,h=70,c='var(--ink)'}={}){if(!clip||!clip.notes.length)return `<svg viewBox="0 0 ${w} ${h}" class="mdroll"></svg>`;
  const ns=clip.notes,lo=Math.min(...ns.map(x=>x.n)),hi=Math.max(...ns.map(x=>x.n)),rg=Math.max(8,hi-lo+1),L=clip.len||16;
  return `<svg viewBox="0 0 ${w} ${h}" class="mdroll" preserveAspectRatio="none">${[...Array(Math.round(L/(clip.barBeats||4)))].map((_,i)=>`<line x1="${i*w/(L/(clip.barBeats||4))}" y1="0" x2="${i*w/(L/(clip.barBeats||4))}" y2="${h}" stroke="var(--hair)" stroke-width="1"/>`).join('')}
    ${ns.map(x=>`<rect x="${(x.t/L*w).toFixed(1)}" y="${((hi-x.n)/rg*(h-4)+1).toFixed(1)}" width="${Math.max(1.5,x.d/L*w).toFixed(1)}" height="${Math.max(2,(h-4)/rg).toFixed(1)}" fill="${c}"/>`).join('')}</svg>`;}
