/* =====================================================================
   LIVE REMIX — the engine
   1. rxAnalyse(buffer): tempo, beat grid, downbeats, key and energy per bar, straight from the audio
      (STFT at ~11 kHz → spectral-flux onsets → autocorrelation tempo → phase + downbeat from the bass → chroma key)
   2. RX player: the song scheduled beat by beat (so any beat can be repeated, reversed, sped up or shuffled
      on the grid), through an FX rack, plus generated layers (808, hats, claps, sub) locked to the grid and the key
   ===================================================================== */
const RX_NOTES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
function rxFFT(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}}
  for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);
    for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const p=i+k,q=p+len/2,tr=re[q]*cr-im[q]*ci,ti=re[q]*ci+im[q]*cr;re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr;}}}}
async function rxAnalyse(buf,onProg){
  const sr0=buf.sampleRate,f=Math.max(1,Math.round(sr0/11025)),sr=sr0/f,n=Math.floor(buf.length/f);
  const L=buf.getChannelData(0),R=buf.numberOfChannels>1?buf.getChannelData(1):L,x=new Float32Array(n);
  for(let i=0;i<n;i++){let s=0;for(let k=0;k<f;k++){const j=i*f+k;s+=L[j]+R[j];}x[i]=s/(2*f);}
  const N=1024,hop=128,frames=Math.max(1,Math.floor((n-N)/hop)),fr=sr/hop,win=new Float32Array(N).map((_,i)=>0.5-0.5*Math.cos(2*Math.PI*i/(N-1)));
  const re=new Float32Array(N),im=new Float32Array(N),prev=new Float32Array(N/2),flux=new Float32Array(frames),low=new Float32Array(frames),rms=new Float32Array(frames),chroma=new Float64Array(12);
  const binHz=sr/N,lowK=Math.round(150/binHz),pc=new Int8Array(N/2).map((_,k)=>{const fq=k*binHz;return fq<65||fq>2100?-1:((Math.round(12*Math.log2(fq/440))+69)%12+12)%12;});
  for(let t=0;t<frames;t++){const o=t*hop;let e=0;for(let i=0;i<N;i++){const v=x[o+i];e+=v*v;re[i]=v*win[i];im[i]=0;}rms[t]=Math.sqrt(e/N);rxFFT(re,im);
    let fl=0,lf=0;for(let k=1;k<N/2;k++){const m=Math.hypot(re[k],im[k]),lm=Math.log1p(100*m),d=lm-prev[k];prev[k]=lm;if(d>0){fl+=d;if(k<=lowK)lf+=d;}if(pc[k]>=0)chroma[pc[k]]+=m;}
    flux[t]=fl;low[t]=lf;if(onProg&&t%800===0){onProg(t/frames);await new Promise(r=>setTimeout(r,0));}}
  // onset strength: flux above its local average
  const env=new Float32Array(frames),W=Math.round(fr*0.5);let acc=0;const cs=new Float64Array(frames+1);for(let i=0;i<frames;i++){cs[i+1]=cs[i]+flux[i];}
  for(let i=0;i<frames;i++){const a=Math.max(0,i-W),b=Math.min(frames,i+W);env[i]=Math.max(0,flux[i]-(cs[b]-cs[a])/(b-a));}
  // tempo: autocorrelation of the onsets over 60–190 BPM, helped by the double period and a gentle prior near 100 BPM
  const ac=lag=>{let s=0;const li=Math.floor(lag),fr_=lag-li;for(let i=0;i+li+1<frames;i++)s+=env[i]*(env[i+li]*(1-fr_)+env[i+li+1]*fr_);return s;};
  let best=null;for(let bpm=60;bpm<=190;bpm+=0.25){const lag=60*fr/bpm,sc=(ac(lag)+0.5*ac(2*lag)+0.25*ac(lag/2))*Math.exp(-0.5*Math.pow(Math.log2(bpm/100)/1.1,2));if(!best||sc>best.sc)best={bpm,sc,lag};}
  const P=best.lag;
  // beat phase: where the onsets line up best with the grid
  let ph=0,phs=-1;for(let p=0;p<P;p+=0.5){let s=0;for(let k=p;k<frames;k+=P)s+=env[Math.round(k)]||0;if(s>phs){phs=s;ph=p;}}
  const beats=[];for(let k=ph;k<frames;k+=P)beats.push(k/fr);
  // downbeat: the beat of the bar where the bass hits hardest
  let db=0,dbs=-1;for(let m=0;m<4;m++){let s=0;for(let b=m;b<beats.length;b+=4)s+=low[Math.round(beats[b]*fr)]||0;if(s>dbs){dbs=s;db=m;}}
  const bars=[];for(let b=db;b<beats.length;b+=4)bars.push(beats[b]);
  // energy per bar, 0..1
  const en=bars.map((t,i)=>{const a=Math.round(t*fr),b=Math.round((bars[i+1]||t+4*P/fr)*fr);let s=0,c=0;for(let j=a;j<b&&j<frames;j++){s+=rms[j];c++;}return c?s/c:0;});
  const emax=Math.max(...en,1e-9),energy=en.map(v=>v/emax);
  // key: chroma against the Krumhansl–Kessler profiles
  const MAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],MIN=[6.33,2.68,3.52,5.38,2.6,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
  const corr=(a,b)=>{const ma=a.reduce((s,v)=>s+v,0)/12,mb=b.reduce((s,v)=>s+v,0)/12;let n_=0,da=0,db_=0;for(let i=0;i<12;i++){n_+=(a[i]-ma)*(b[i]-mb);da+=(a[i]-ma)**2;db_+=(b[i]-mb)**2;}return n_/Math.sqrt(da*db_);};
  let key={r:-2};for(let r=0;r<12;r++)for(const [mode,pr] of [['major',MAJ],['minor',MIN]]){const rot=[...Array(12)].map((_,i)=>chroma[(i+r)%12]);const c=corr(rot,pr);if(c>key.r)key={root:r,mode,r:c};}
  key.name=RX_NOTES[key.root]+' '+key.mode;
  if(onProg)onProg(1);
  return {bpm:Math.round(best.bpm*10)/10,beat:P/fr,beats,bars,energy,key,dur:buf.duration,first:bars[0]||0,env,fr,low};
}

/* ---------- the effects students can fire. cat: time (red) · tone (blue) · space (yellow) · layer (green)
   kind 'beat' takes over the playhead for a few beats (one at a time, queued); 'fx' and 'layer' run for bars */
const RX_FX=[
  {id:'stutter',cat:'time',name:'Stutter',d:'The beat catches and repeats',kind:'beat',beats:4},
  {id:'roll',cat:'time',name:'Beat roll',d:'One beat, faster and faster',kind:'beat',beats:4},
  {id:'reverse',cat:'time',name:'Reverse',d:'Two beats backwards',kind:'beat',beats:2},
  {id:'tapestop',cat:'time',name:'Tape stop',d:'The tape grinds to a halt',kind:'beat',beats:2},
  {id:'double',cat:'time',name:'Double time',d:'Twice as fast for two beats',kind:'beat',beats:2},
  {id:'slowmo',cat:'time',name:'Slow-mo',d:'Half speed, an octave down',kind:'beat',beats:2},
  {id:'shuffle',cat:'time',name:'Shuffle',d:'The next bar, beats re-ordered',kind:'beat',beats:4},
  {id:'scratch',cat:'time',name:'Scratch',d:'Back and forth on the platter',kind:'beat',beats:2},
  {id:'drop',cat:'time',name:'Drop out',d:'One beat of silence, then slam',kind:'beat',beats:1},
  {id:'encore',cat:'time',name:'Encore',d:'Loop the bar you just heard',kind:'beat',beats:4},
  {id:'killbass',cat:'tone',name:'Kill the bass',d:'Everything below 250 Hz gone',kind:'fx',bars:2},
  {id:'killmid',cat:'tone',name:'Kill the mids',d:'A hollow scoop',kind:'fx',bars:2},
  {id:'killhigh',cat:'tone',name:'Kill the highs',d:'Muffled, next door',kind:'fx',bars:2},
  {id:'sweep',cat:'tone',name:'Filter sweep',d:'Down to the floor and back',kind:'fx',bars:2},
  {id:'riser',cat:'tone',name:'Riser',d:'High-pass build, then the drop',kind:'fx',bars:2},
  {id:'novocal',cat:'tone',name:'Vocal out',d:'Mid/side: the centre disappears',kind:'fx',bars:2},
  {id:'crush',cat:'tone',name:'Bitcrush',d:'4-bit, 1980s console',kind:'fx',bars:2},
  {id:'lofi',cat:'tone',name:'Lo-fi',d:'Old radio, crackle, wobble',kind:'fx',bars:2},
  {id:'phaser',cat:'tone',name:'Phaser',d:'A jet plane sweep',kind:'fx',bars:2},
  {id:'echo',cat:'space',name:'Dub echo',d:'Throw it into the delay',kind:'fx',bars:1},
  {id:'wash',cat:'space',name:'Reverb wash',d:'A cathedral for one bar',kind:'fx',bars:1},
  {id:'gate',cat:'space',name:'Trance gate',d:'Chopped into 16ths',kind:'fx',bars:2},
  {id:'pump',cat:'space',name:'Sidechain pump',d:'Ducks on every beat',kind:'fx',bars:2},
  {id:'wide',cat:'space',name:'Mega wide',d:'The sides blown open',kind:'fx',bars:2},
  {id:'boom',cat:'layer',name:'808 boom',d:'A sub kick tuned to the key',kind:'layer',bars:4},
  {id:'hats',cat:'layer',name:'Hi-hats',d:'Fast 16ths on top',kind:'layer',bars:4},
  {id:'clap',cat:'layer',name:'Claps',d:'On two and four',kind:'layer',bars:4},
  {id:'sub',cat:'layer',name:'Sub bass',d:'The root note, deep',kind:'layer',bars:4},
];
const RX_CAT={time:'--red',tone:'--blue',space:'--yel',layer:'--green'};

/* the player */
function rxPlayer(buf,A,{startBar=0}={}){const ac=audio(),P={buf,A,ac,beat:A.beat,b0:Math.max(0,A.beats.indexOf(A.bars[startBar])),fx:new Map(),queue:[],mod:null,layers:new Map(),dead:false};
  // a reversed copy for the reverse moves
  const rv=ac.createBuffer(buf.numberOfChannels,buf.length,buf.sampleRate);for(let c=0;c<buf.numberOfChannels;c++){const s=buf.getChannelData(c),d=rv.getChannelData(c),n=s.length;for(let i=0;i<n;i++)d[i]=s[n-1-i];}P.rev=rv;
  // graph: slices → mid/side → isolator → filters → crush → phaser → gate → pump → out; sends: echo, reverb
  const inp=gn(ac,1),sp=ac.createChannelSplitter(2),mg=ac.createChannelMerger(2),L=gn(ac,1),R=gn(ac,1);inp.connect(sp);
  const midL=gn(ac,.5),midR=gn(ac,.5),sideL=gn(ac,.5),sideR=gn(ac,-.5),M=gn(ac,1),S=gn(ac,1);sp.connect(midL,0);sp.connect(midR,1);sp.connect(sideL,0);sp.connect(sideR,1);midL.connect(M);midR.connect(M);sideL.connect(S);sideR.connect(S);
  const mLo=bq(ac,'lowpass',160),mHi=bq(ac,'highpass',160),mHiG=gn(ac,1),sG=gn(ac,1);M.connect(mLo);M.connect(mHi).connect(mHiG);S.connect(sG);
  const toL=gn(ac,1),toR=gn(ac,1),sInv=gn(ac,-1);mLo.connect(toL);mLo.connect(toR);mHiG.connect(toL);mHiG.connect(toR);sG.connect(toL);sG.connect(sInv).connect(toR);toL.connect(mg,0,0);toR.connect(mg,0,1);
  const lo=bq(ac,'lowshelf',250,.7,0),mid=bq(ac,'peaking',1200,.6,0),hi=bq(ac,'highshelf',3500,.7,0),lp=bq(ac,'lowpass',20000,.9),hp=bq(ac,'highpass',20,.9);
  const crushDry=gn(ac,1),crushWet=gn(ac,0),crush=shaper(ac,'crush',4),crushLp=bq(ac,'lowpass',5500),cr=gn(ac,1);
  mg.connect(lo).connect(mid).connect(hi).connect(lp).connect(hp);hp.connect(crushDry).connect(cr);hp.connect(crush).connect(crushLp).connect(crushWet).connect(cr);
  const aps=[0,1,2,3].map(()=>bq(ac,'allpass',800,.6)),phWet=gn(ac,0),phDry=gn(ac,1),ph=gn(ac,1);cr.connect(phDry).connect(ph);cr.connect(aps[0]);aps.reduce((a,b)=>(a.connect(b),b)).connect(phWet).connect(ph);
  const phLfo=osc(ac,'sine',0.35),phAmt=gn(ac,700);phLfo.connect(phAmt);aps.forEach(a=>phAmt.connect(a.frequency));phLfo.start();
  const gate=gn(ac,1),pump=gn(ac,1),out=gn(ac,0.9),an=ac.createAnalyser();an.fftSize=1024;an.smoothingTimeConstant=.7;
  ph.connect(gate).connect(pump).connect(out);out.connect(AU.music);out.connect(an);
  // sends
  const eSend=gn(ac,0),dl=ac.createDelay(4),fb=gn(ac,.55),dlf=bq(ac,'bandpass',1400,.7);dl.delayTime.value=P.beat*.75;cr.connect(eSend).connect(dl);dl.connect(dlf).connect(fb).connect(dl);dlf.connect(out);
  const rSend=gn(ac,0),cv=ac.createConvolver();cv.buffer=makeIR(ac,5.5,{damp:.35});const rRet=gn(ac,.7);cr.connect(rSend).connect(cv).connect(rRet).connect(out);
  // crackle for lo-fi
  const nz=noise(ac),nzf=bq(ac,'highpass',3000),nzg=gn(ac,0);nz.connect(nzf).connect(nzg).connect(out);nz.start();
  // generated layers
  const lay=gn(ac,.8);lay.connect(pump);
  Object.assign(P,{inp,mHiG,sG,lo,mid,hi,lp,hp,crushDry,crushWet,phWet,phDry,gate,pump,out,an,eSend,rSend,dl,nzg,lay,nodes:[nz,phLfo]});
  P.t=ac.currentTime+0.2;P.k=0;P.sb=P.b0;   // next grid time, beats played, song beat
  P.timer=setInterval(()=>rxTick(P),40);rxTick(P);return P;}
function rxStop(P){if(!P||P.dead)return;P.dead=true;clearInterval(P.timer);const t=P.ac.currentTime;P.out.gain.setTargetAtTime(0,t,.05);setTimeout(()=>{try{P.out.disconnect();P.nodes.forEach(n=>n.stop());}catch(e){}},400);}
// one piece of the song: from song time `off`, `len` seconds of song, played at `rate`, starting at `at`
function rxSlice(P,at,off,len,{rate=1,rev=false,g=1,rampTo=null,dur:D=null}={}){const ac=P.ac,s=ac.createBufferSource(),e=gn(ac,0);s.buffer=rev?P.rev:P.buf;
  const o=rev?Math.max(0,P.buf.duration-off-len):off,dur=D||len/rate;s.playbackRate.setValueAtTime(rate,at);if(rampTo)s.playbackRate.exponentialRampToValueAtTime(rampTo,at+dur);
  const f=Math.min(.006,dur/4);e.gain.setValueAtTime(0,at);e.gain.linearRampToValueAtTime(g,at+f);e.gain.setValueAtTime(g,at+dur-f);e.gain.linearRampToValueAtTime(0,at+dur);
  s.connect(e).connect(P.inp);s.start(at,Math.max(0,o));s.stop(at+dur+.02);}
const rxBeatT=(P,sb)=>P.A.beats[sb]??(P.A.beats[P.A.beats.length-1]+(sb-P.A.beats.length+1)*P.beat);
// the scheduler: each grid beat plays one song beat, unless a 'beat' move owns it
function rxTick(P){if(P.dead)return;const ac=P.ac,B=P.beat;
  while(P.t<ac.currentTime+0.3){const t=P.t;
    if(P.sb>=P.A.beats.length-2)P.sb=P.b0;   // the end of the song: back to the start bar
    if(!P.mod&&P.queue.length){const q=P.queue[0];if(!q.bar||P.k%4===0){P.queue.shift();P.mod={...q,left:q.beats,i:0,from:P.sb};if(P.onFx)P.onFx(q,'start');}}
    const m=P.mod,off=rxBeatT(P,P.sb);
    if(!m){rxSlice(P,t,off,B);P.sb++;}
    else{const i=m.i;
      if(m.id==='stutter'){const n=i<2?2:i<3?4:8,l=B/n,src=rxBeatT(P,m.from);for(let j=0;j<n;j++)rxSlice(P,t+j*l,src,l);if(i===m.beats-1)P.sb=m.from+m.beats;}
      else if(m.id==='roll'){const n=[1,2,4,8][i],l=B/n,src=rxBeatT(P,m.from);for(let j=0;j<n;j++)rxSlice(P,t+j*l,src,l,{g:.85+.15*j/n});if(i===m.beats-1)P.sb=m.from+m.beats;}
      else if(m.id==='reverse'){rxSlice(P,t,rxBeatT(P,m.from+m.beats-1-i),B,{rev:true});if(i===m.beats-1)P.sb=m.from+m.beats;}
      else if(m.id==='tapestop'){if(i===0)rxSlice(P,t,off,B*2,{rate:1,rampTo:0.05,dur:B*2});if(i===m.beats-1)P.sb=m.from+m.beats;}
      else if(m.id==='double'){rxSlice(P,t,rxBeatT(P,P.sb),B*2,{rate:2});P.sb+=2;}
      else if(m.id==='slowmo'){rxSlice(P,t,rxBeatT(P,m.from)+i*B/2,B/2,{rate:.5});if(i===m.beats-1)P.sb=m.from+1;}
      else if(m.id==='shuffle'){if(i===0)m.ord=shuffle([0,1,2,3]);const k=m.ord[i];rxSlice(P,t,rxBeatT(P,m.from+k),B/2);rxSlice(P,t+B/2,rxBeatT(P,m.from+m.ord[(i+2)%4])+B/2,B/2);if(i===m.beats-1)P.sb=m.from+4;}
      else if(m.id==='scratch'){const src=rxBeatT(P,m.from),l=B/4;for(let j=0;j<4;j++)rxSlice(P,t+j*l,src+(j%2?l*.6:0),l*(j%2?1.4:.8),{rate:j%2?1.4:.8,rev:!!(j%2)});if(i===m.beats-1)P.sb=m.from+m.beats;}
      else if(m.id==='drop'){P.sb++;}
      else if(m.id==='encore'){rxSlice(P,t,rxBeatT(P,m.from-4+i),B);if(i===m.beats-1)P.sb=m.from;}
      else{rxSlice(P,t,off,B);P.sb++;}
      m.i++;if(m.i>=m.beats){if(P.onFx)P.onFx(m,'end');P.mod=null;}}
    rxLayers(P,t);rxAuto(P,t);
    P.t+=B;P.k++;}}
// effects and layers that run for bars: switched on at the next beat, off when their bars are up
function rxFire(P,fx,who){const B=P.beat;
  if(fx.kind==='beat'){if(P.queue.length>=2)return false;P.queue.push({...fx,who,bar:fx.id==='shuffle'||fx.id==='encore'});return true;}
  const st=P.t,end=st+(fx.bars||2)*4*B;
  if(fx.kind==='layer'){P.layers.set(fx.id,{end,who});if(P.onFx)P.onFx({...fx,who},'start');return true;}
  P.fx.set(fx.id,{st,end,who,on:false});if(P.onFx)P.onFx({...fx,who},'start');return true;}
function rxAuto(P,t){const B=P.beat,ac=P.ac,set=(p,v,at,tc=.03)=>p.setTargetAtTime(v,at,tc);
  for(const [id,f] of P.fx){
    if(!f.on&&t>=f.st-0.001){f.on=true;const st=f.st,end=f.end;
      if(id==='killbass'){set(P.lo.gain,-40,st);set(P.hp.frequency,300,st);set(P.lo.gain,0,end);set(P.hp.frequency,20,end);}
      if(id==='killmid'){set(P.mid.gain,-30,st);set(P.mid.gain,0,end);}
      if(id==='killhigh'){set(P.hi.gain,-40,st);set(P.lp.frequency,1800,st);set(P.hi.gain,0,end);set(P.lp.frequency,20000,end);}
      if(id==='sweep'){P.lp.frequency.setValueAtTime(18000,st);P.lp.frequency.exponentialRampToValueAtTime(260,st+3*B);P.lp.frequency.setValueAtTime(260,end-3*B);P.lp.frequency.exponentialRampToValueAtTime(18000,end);P.lp.Q.setValueAtTime(6,st);P.lp.Q.setValueAtTime(.9,end);}
      if(id==='riser'){P.hp.frequency.setValueAtTime(30,st);P.hp.frequency.exponentialRampToValueAtTime(2500,end-0.02);P.hp.frequency.setValueAtTime(20,end);P.nzg.gain.setValueAtTime(0,st);P.nzg.gain.linearRampToValueAtTime(.12,end-.02);P.nzg.gain.setValueAtTime(0,end);}
      if(id==='novocal'){set(P.mHiG.gain,0,st);set(P.sG.gain,1.4,st);set(P.mHiG.gain,1,end);set(P.sG.gain,1,end);}
      if(id==='wide'){set(P.sG.gain,2.4,st);set(P.mHiG.gain,.7,st);set(P.sG.gain,1,end);set(P.mHiG.gain,1,end);}
      if(id==='crush'){set(P.crushWet.gain,1,st);set(P.crushDry.gain,0,st);set(P.crushWet.gain,0,end);set(P.crushDry.gain,1,end);}
      if(id==='lofi'){set(P.lp.frequency,2800,st);set(P.hp.frequency,350,st);set(P.nzg.gain,.035,st);set(P.lp.frequency,20000,end);set(P.hp.frequency,20,end);set(P.nzg.gain,0,end);}
      if(id==='phaser'){set(P.phWet.gain,.9,st);set(P.phDry.gain,.6,st);set(P.phWet.gain,0,end);set(P.phDry.gain,1,end);}
      if(id==='echo'){P.dl.delayTime.setValueAtTime(B*.75,st);set(P.eSend.gain,.9,st,.01);set(P.eSend.gain,0,st+B,.02);}
      if(id==='wash'){set(P.rSend.gain,1.2,st,.05);set(P.rSend.gain,0,end,.2);}
      if(id==='gate'){for(let k=0;k<(end-st)/(B/4);k++){const a=st+k*B/4;P.gate.gain.setValueAtTime([1,0,1,1,0,1,0,1][k%8]?1:0.05,a);P.gate.gain.setValueAtTime([1,0,1,1,0,1,0,1][k%8]?0.15:0.05,a+B/8);}P.gate.gain.setValueAtTime(1,end);}
      if(id==='pump'){for(let k=0;k<(end-st)/B;k++){const a=st+k*B;P.pump.gain.setValueAtTime(.08,a);P.pump.gain.setTargetAtTime(1,a+0.02,B/5);}P.pump.gain.setTargetAtTime(1,end,.02);}}
    if(t>=f.end){P.fx.delete(id);if(P.onFx)P.onFx({id,who:f.who},'end');}}
  for(const [id,l] of P.layers)if(t>=l.end){P.layers.delete(id);if(P.onFx)P.onFx({id,who:l.who},'end');}}
// generated layers, in time and in key: the 808 and the sub sit on the key's root
function rxLayers(P,t){const ac=P.ac,B=P.beat,beatInBar=P.k%4,root=P.A.key.root,minor=P.A.key.mode==='minor',d=P.lay;
  if(P.layers.has('boom')&&(beatInBar===0||beatInBar===2)){DR.kick(ac,d,t,{v:1,dec:B*1.4,f0:hz(24+root+12),f1:hz(24+root+31),click:.25,drive:.3});if(beatInBar===2)DR.kick(ac,d,t+B*0.75,{v:.7,dec:B*.6,f0:hz(36+root),f1:hz(55+root)});}
  if(P.layers.has('hats'))for(let j=0;j<4;j++)DR.hat(ac,d,t+j*B/4,{v:j===2?.55:j%2?.25:.38});
  if(P.layers.has('clap')&&(beatInBar===1||beatInBar===3))DR.clap(ac,d,t,{v:.75});
  if(P.layers.has('sub')){const o=osc(ac,'sine',hz(24+root+12)),g=gn(ac,0);o.connect(g).connect(d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55,t+.01);g.gain.setTargetAtTime(0,t+B*.8,.05);o.start(t);o.stop(t+B+.2);}}
