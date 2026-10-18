/* ====================================================================
   CONTROL ROOM — audio
   Every sound is synthesised in the browser, no samples:
   · sfx       interface cues (FM bells, pads, noise swells in one reverb)
   · voices    a drum kit (808 recipes), basses, plucks, pads, FM piano,
               a formant "vocal", Karplus-Strong guitar
   · seq/rig   a lookahead step sequencer with mixer strips + reverb send
   · songs     the demo band, the eight decade mixes, groove patterns
   · machines  recreations of famous presets (808, 909, 303, DX7 …)
   · makeIR    reverbs whose RT60 is exact (−60 dB at T seconds)
   · patch     the Parameter Telephone synth (identical on host + phones)
   Real samples can replace any recreation later (see data/content.js).
   ==================================================================== */
const SFX={on:store.get('sfx',true)};
const AU={ac:null,live:new Set(),ir:{},ks:{}};
function audio(){
  if(AU.ac){if(AU.ac.state==='suspended')AU.ac.resume();return AU.ac;}
  const ac=new (window.AudioContext||window.webkitAudioContext)();AU.ac=ac;
  const master=ac.createDynamicsCompressor();master.threshold.value=-4;master.knee.value=2;master.ratio.value=14;master.attack.value=.002;master.release.value=.12;master.connect(ac.destination);
  // interface cues: own bus, compressor and a 2.8 s reverb
  const sb=ac.createGain();sb.gain.value=2.2;const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.01;comp.release.value=.25;
  sb.connect(comp).connect(master);AU.sfx=sb;
  const v=ac.createConvolver();v.buffer=makeIR(ac,2.8,{damp:.6});const vr=ac.createGain();vr.gain.value=.55;v.connect(vr).connect(sb);AU.sfxVerb=v;
  // game audio
  const mb=ac.createGain();mb.gain.value=.9;mb.connect(master);AU.music=mb;
  const nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;AU.noise=nb;
  return ac;
}
function AU_stopAll(){AU.live.forEach(h=>{try{h.stop();}catch(e){}});AU.live.clear();}
const mtof=m=>440*Math.pow(2,(m-69)/12);
const hz=mtof;

/* ---------- building blocks ---------- */
function gn(ac,v=1){const g=ac.createGain();g.gain.value=v;return g;}
function bq(ac,type,f,q=.707,gain=0){const b=ac.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;b.gain.value=gain;return b;}
function osc(ac,type,f){const o=ac.createOscillator();o.type=type;o.frequency.value=f;return o;}
function noise(ac){const s=ac.createBufferSource();s.buffer=AU.noise;s.loop=true;s.loopStart=Math.random();return s;}
function panner(ac,p){const n=ac.createStereoPanner();n.pan.value=clamp(p,-1,1);return n;}
// percussive envelope: 0 → peak in a, exponential fall to silence in d
function perc(g,t,a,d,peak){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d);g.gain.linearRampToValueAtTime(0,t+a+d+.01);return t+a+d+.02;}
// ADSR with a held note of length len (from note-on); returns the time the voice is silent
function adsr(g,t,{a=.005,d=.1,s=.7,r=.1,len=.3,peak=1}){
  const A=Math.max(.001,a),hold=t+Math.max(len,0.001),sv=Math.max(.0001,peak*s);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+A);
  if(hold>t+A){g.gain.setTargetAtTime(sv,t+A,Math.max(.003,d/3));}
  g.gain.cancelAndHoldAtTime?g.gain.cancelAndHoldAtTime(hold):g.gain.setValueAtTime(sv,hold);
  g.gain.setTargetAtTime(0,hold,Math.max(.003,r/4));return hold+r*1.6+.05;
}
const CURVE={};
function curve(kind,amt){const key=kind+amt;if(CURVE[key])return CURVE[key];const n=2048,c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=i/(n-1)*2-1;
    if(kind==='soft'){const k=amt*8+1;c[i]=Math.tanh(k*x)/Math.tanh(k);}
    else if(kind==='hard'){c[i]=clamp(x*(1+amt*12),-1,1)*.92;}
    else if(kind==='crush'){const q=Math.pow(2,amt-1);c[i]=Math.round(x*q)/q;}
    else if(kind==='tape'){c[i]=(1.5*x-.5*x*x*x)*.9;}
  }return CURVE[key]=c;}
function shaper(ac,kind,amt){const w=ac.createWaveShaper();w.curve=curve(kind,amt);w.oversample=kind==='crush'?'none':'2x';return w;}

/* reverb impulse with an exact decay: amplitude 10^(-3t/rt60) → −60 dB at rt60.
   Damping darkens the tail with a one-pole lowpass whose level loss is compensated,
   so the broadband decay stays true. `gated` gives the 80s flat-then-cut shape. */
function makeIR(ac,rt60,{pre=0,damp=.5,gated=0,len}={}){
  const key=[rt60,pre,damp,gated,len].join('|');if(AU.ir[key]&&AU.ir[key].sampleRate===ac.sampleRate)return AU.ir[key];
  const sr=ac.sampleRate,L=Math.floor(sr*(len||(gated?pre+gated+.04:Math.min(12,pre+rt60*1.15+.05))));
  const buf=ac.createBuffer(2,L,sr);let E=0;
  for(let c=0;c<2;c++){const d=buf.getChannelData(c);let lp=0;
    for(let i=0;i<L;i++){const t=i/sr-pre;if(t<0){d[i]=0;continue;}
      const k=damp*Math.min(.92,t/Math.max(.05,rt60)*.95);lp=lp*k+(Math.random()*2-1)*(1-k);
      const a=gated?(t<gated?1-.25*t/gated:Math.max(0,1-(t-gated)/.012)):Math.pow(10,-3*t/rt60);
      d[i]=lp*a*Math.sqrt((1+k)/(1-k))*(t<.004?t/.004:1);E+=d[i]*d[i];}}
  const g=1/Math.sqrt(E/2+1e-9)*.9;for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<L;i++)d[i]*=g;}
  return AU.ir[key]=buf;
}

/* ---------- interface sounds ---------- */
function sfxOut(ac,node,wet,pan=0){const p=panner(ac,pan);node.connect(p);p.connect(AU.sfx);if(wet){const w=gn(ac,wet);p.connect(w).connect(AU.sfxVerb);}}
function voice({f,type='sine',at=0,a=.005,d=.4,g=.1,glide=0,cut=0,q=.7,cutEnd=0,fm=0,ratio=2,fmDecay=.2,detune=0,wet=.3,pan=0}){
  if(!SFX.on)return;let ac;try{ac=audio();}catch(e){return;}
  const t=ac.currentTime+.01+at,o=osc(ac,type,glide?f*glide:f),env=gn(ac,0);
  if(glide)o.frequency.exponentialRampToValueAtTime(f,t+Math.min(.12,d*.5));o.detune.value=detune;
  if(fm){const m=osc(ac,'sine',f*ratio),mg=gn(ac,0);mg.gain.setValueAtTime(f*fm,t);mg.gain.exponentialRampToValueAtTime(f*fm*.01+.01,t+fmDecay);m.connect(mg).connect(o.frequency);m.start(t);m.stop(t+d+.1);}
  let n=o;if(cut){const fl=bq(ac,'lowpass',cut,q);if(cutEnd)fl.frequency.exponentialRampToValueAtTime(cutEnd,t+d);o.connect(fl);n=fl;}
  perc(env,t,a,d,g);n.connect(env);sfxOut(ac,env,wet,pan);o.start(t);o.stop(t+a+d+.05);
}
function air({at=0,a=.3,d=.4,g=.08,f0=400,f1=4000,q=2,type='bandpass',wet=.4,pan=0}){
  if(!SFX.on)return;let ac;try{ac=audio();}catch(e){return;}
  const t=ac.currentTime+.01+at,src=noise(ac),fl=bq(ac,type,f0,q),env=gn(ac,0);fl.frequency.exponentialRampToValueAtTime(f1,t+a+d*.6);
  perc(env,t,a,d,g);src.connect(fl).connect(env);sfxOut(ac,env,wet,pan);src.start(t);src.stop(t+a+d+.05);
}
const bell=(m,at,g=.06,pan=0,d=1.6)=>{voice({f:hz(m),at,g,d,fm:1.4,ratio:3.5,fmDecay:.35,wet:.5,pan});voice({f:hz(m+12),at,g:g*.25,d:d*.5,wet:.6,pan:-pan});};
const sPad=(ms,at,{g=.035,a=.25,d=1.8,cut=1800,cutEnd=500}={})=>ms.forEach((m,i)=>[-9,9].forEach(dt=>voice({f:hz(m),type:'sawtooth',at,a,d,g,cut,cutEnd,detune:dt,wet:.55,pan:(i/(ms.length-1||1)-.5)*.8})));
const PENTA=[0,2,4,7,9,12,14,16];
const sfx={
  tick:sec=>{const k=5-clamp(sec||5,1,5);voice({f:hz(76+k*2),g:.12,d:.09,glide:1.5,wet:.15});voice({f:hz(40+k),g:.2,d:.18,glide:2,wet:.05});},
  inn:()=>{const m=72+pick(PENTA);voice({f:hz(m),g:.14,d:.35,glide:.6,wet:.45,pan:Math.random()*1.2-.6});},
  join:()=>{const m=79+PENTA[Math.floor(Math.random()*5)];bell(m,0,.08,-.3,1.1);bell(m+7,.09,.06,.3,1.1);},
  open:()=>{air({a:.35,d:.35,g:.06,f0:300,f1:5000,q:1.4});bell(81,.32,.05,0,1.4);voice({f:hz(45),g:.09,a:.3,d:.6,cut:300,wet:.2});},
  reveal:(pct=50)=>{const ch=pct>=60?[57,64,69,73,76]:pct>=30?[57,64,69,71,76]:[57,63,67,70,74];
    air({a:.04,d:.5,g:.05,f0:6000,f1:900,q:.8,type:'lowpass'});voice({f:hz(33),g:.16,a:.01,d:1.2,glide:1.8,cut:200,wet:.1});
    sPad(ch,0,{g:.03,a:.04,d:2.2,cut:3200,cutEnd:600});ch.slice(2).forEach((m,i)=>bell(m+12,.06+i*.07,.035,(i-1)*.5,1.8));},
  board:()=>{air({a:.25,d:.6,g:.07,f0:5000,f1:250,q:1.2});voice({f:hz(38),g:.14,a:.2,d:.7,glide:2,cut:220,wet:.15});},
  fanfare:()=>{air({a:.9,d:.8,g:.06,f0:200,f1:7000,q:1});voice({f:hz(33),g:.16,a:.9,d:2.5,cut:240,wet:.2});
    sPad([45,57,64,69,73,76],.85,{g:.035,a:.08,d:3.6,cut:4200,cutEnd:700});[81,85,88,93,88,97].forEach((m,i)=>bell(m,1+i*.11,.04,(i%2?.5:-.5),2.4));},
  // slot machine: a soft ratchet tick, and a weighty landing per reel
  spin:()=>voice({f:hz(84+Math.floor(Math.random()*3)),g:.05,d:.03,type:'triangle',wet:.05}),
  land:(k=0)=>{voice({f:hz(43+k*5),g:.2,d:.25,glide:2.2,wet:.1});bell(76+[0,4,7,12][k%4],0,.05,(k-1)*.4,1.2);air({a:.01,d:.15,g:.05,f0:3000,f1:600,q:1,type:'lowpass'});},
  card:()=>{air({a:.02,d:.2,g:.08,f0:1500,f1:6000,q:.8,type:'highpass'});voice({f:hz(55),g:.12,d:.3,glide:1.5,wet:.2});},
  alarm:()=>{[0,.32,.64].forEach(t=>{bell(88,t,.06,0,.6);voice({f:hz(64),at:t,g:.08,d:.25,type:'triangle',wet:.2});});},
  whoosh:()=>{air({a:.5,d:.5,g:.09,f0:200,f1:6000,q:1.2});air({at:.5,a:.05,d:.6,g:.06,f0:6000,f1:300,q:1.2});},
  swap:()=>{voice({f:hz(45),g:.22,d:.4,glide:2,wet:.1});[0,.1,.2].forEach((t,i)=>bell(81+i*4,t,.05,(i-1)*.5,.9));air({a:.02,d:.3,g:.06,f0:7000,f1:800,q:1,type:'lowpass'});},
  vote:()=>voice({f:hz(79+pick([0,2,4,7])),g:.07,d:.25,glide:.7,wet:.4,pan:Math.random()-.5}),
};

/* ---------- rig: an output with mixer strips and a shared reverb ---------- */
function rig(dest,{rt=1.6,pre=.02,damp=.55,gated=0,wet=1}={}){
  const ac=audio(),out=gn(ac,1);out.connect(dest||AU.music);
  const verb=ac.createConvolver();verb.buffer=makeIR(ac,rt,{pre,damp,gated});const vg=gn(ac,wet);verb.connect(vg).connect(out);
  const h={ac,out,verb,strips:{},
    strip(name,{gain=1,pan=0,send=0,lp=20000,hp=0}={}){const inp=gn(ac,1),f=bq(ac,'lowpass',lp,.6),hpf=bq(ac,'highpass',hp||10,.6),g=gn(ac,gain),p=panner(ac,pan),s=gn(ac,send);
      inp.connect(hpf).connect(f).connect(g).connect(p).connect(out);p.connect(s).connect(verb);
      const st={in:inp,lp:f,hp:hpf,gain:g,pan:p,send:s,set(o){const t=ac.currentTime;if(o.pan!=null)p.pan.setTargetAtTime(clamp(o.pan,-1,1),t,.05);if(o.send!=null)s.gain.setTargetAtTime(o.send,t,.05);if(o.gain!=null)g.gain.setTargetAtTime(o.gain,t,.05);if(o.lp!=null)f.frequency.setTargetAtTime(o.lp,t,.05);}};
      return h.strips[name]=st;},
    stop(f=.08){const t=ac.currentTime;out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(0,t+f);setTimeout(()=>{try{out.disconnect();}catch(e){}},f*1000+600);AU.live.delete(h);if(h.seq)h.seq.halt();}};
  AU.live.add(h);return h;
}
/* lookahead step sequencer: tracks = [{pat:[ev|null…], play(t,ev,sd,step)}] */
function seq(r,{bpm=100,len=16,loops=Infinity,swing=0,tracks,onStep,at=.08}){
  const ac=r.ac,sd=60/bpm/4;let step=0,t=ac.currentTime+at;const t0=t,total=len*loops;
  const ahead=window.OfflineAudioContext&&ac instanceof OfflineAudioContext?1e9:.15; // offline renders (tests) schedule everything up front
  const tick=()=>{while(t<ac.currentTime+ahead&&step<total){const s=step%len,tt=t+(s%2?swing*sd:0);
      tracks.forEach(tr=>{const ev=tr.pat[s%tr.pat.length];if(ev)try{tr.play(tt,ev,sd,s);}catch(e){console.error(e);}});
      if(onStep){const st=step;setTimeout(()=>onStep(st),Math.max(0,(tt-ac.currentTime)*1000));}step++;t+=sd;}
    if(step>=total){clearInterval(iv);}};
  const iv=setInterval(tick,25);tick();
  const q={t0,sd,len,dur:total*sd,halt(){clearInterval(iv);}};r.seq=q;return q;
}
const P_=(s,v=1)=>[...s].map(c=>c==='x'?v:c==='o'?.4:null); // one-shot patterns: x hit, o accent-free (open hat)
const P=(s,v=1)=>[...s].map(c=>c==='x'?v:c==='X'?1:c==='o'?.45:c==='-'?.25:null); // drum pattern strings

/* ---------- drum voices (classic analog recipes) ---------- */
const DR={
  kick(ac,d,t,{v=1,dec=.55,f0=50,f1=160,click=.4,drive=0}={}){const o=osc(ac,'sine',f1),g=gn(ac,0);o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f0,t+.07);perc(g,t,.002,dec,v);
    let n=o;if(drive){const w=shaper(ac,'soft',drive);o.connect(w);n=w;}n.connect(g).connect(d);o.start(t);o.stop(t+dec+.05);
    if(click){const s=noise(ac),f=bq(ac,'highpass',2500),cg=gn(ac,0);perc(cg,t,.001,.012,v*click*.5);s.connect(f).connect(cg).connect(d);s.start(t);s.stop(t+.03);}},
  snare(ac,d,t,{v=1,tone=185,dec=.16,ndec=.2,bright=2500}={}){const o=osc(ac,'triangle',tone*1.6),g=gn(ac,0);o.frequency.exponentialRampToValueAtTime(tone,t+.03);perc(g,t,.001,dec*.6,v*.5);o.connect(g).connect(d);o.start(t);o.stop(t+dec);
    const s=noise(ac),f=bq(ac,'highpass',bright*.6),f2=bq(ac,'peaking',bright,1,6),ng=gn(ac,0);perc(ng,t,.001,ndec,v*.55);s.connect(f).connect(f2).connect(ng).connect(d);s.start(t);s.stop(t+ndec+.05);},
  clap(ac,d,t,{v=1,dec=.22}={}){const s=noise(ac),f=bq(ac,'bandpass',1150,1.2),g=gn(ac,0);g.gain.setValueAtTime(0,t);
    [0,.011,.022].forEach(o=>{g.gain.setValueAtTime(v*.8,t+o);g.gain.exponentialRampToValueAtTime(v*.12,t+o+.009);});g.gain.setValueAtTime(v*.7,t+.033);g.gain.exponentialRampToValueAtTime(.0001,t+.033+dec);
    s.connect(f).connect(g).connect(d);s.start(t);s.stop(t+dec+.06);},
  hat(ac,d,t,{v=1,open=false,dec}={}){const g=gn(ac,0),bp=bq(ac,'bandpass',10000,.8),hp=bq(ac,'highpass',7000);bp.connect(hp).connect(g).connect(d);
    [205.3,304.4,369.6,522.7,540,800].forEach(f=>{const o=osc(ac,'square',f);o.connect(bp);o.start(t);o.stop(t+(open?.5:.12));}); // the six 808 metal oscillators
    perc(g,t,.001,dec||(open?.32:.045),v*.5);},
  nhat(ac,d,t,{v=1,dec=.05,f=8000}={}){const s=noise(ac),h=bq(ac,'highpass',f),g=gn(ac,0);perc(g,t,.001,dec,v*.45);s.connect(h).connect(g).connect(d);s.start(t);s.stop(t+dec+.03);},
  cowbell(ac,d,t,{v=1}={}){const g=gn(ac,0),bp=bq(ac,'bandpass',1000,.9);[540,800].forEach(f=>{const o=osc(ac,'square',f);o.connect(bp);o.start(t);o.stop(t+.5);});
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*.5,t+.002);g.gain.exponentialRampToValueAtTime(v*.18,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.4);bp.connect(g).connect(d);},
  tom(ac,d,t,{v=1,f=220,dec=.45}={}){const o=osc(ac,'sine',f*1.9),g=gn(ac,0);o.frequency.exponentialRampToValueAtTime(f*.55,t+dec*.8);perc(g,t,.002,dec,v*.8);o.connect(g).connect(d);o.start(t);o.stop(t+dec+.05);
    const s=noise(ac),bp=bq(ac,'bandpass',f*4,1),ng=gn(ac,0);perc(ng,t,.001,.05,v*.25);s.connect(bp).connect(ng).connect(d);s.start(t);s.stop(t+.08);},
  rim(ac,d,t,{v=1,f=1700}={}){const o=osc(ac,'square',f),bp=bq(ac,'bandpass',f,4),g=gn(ac,0);perc(g,t,.0005,.025,v*.5);o.connect(bp).connect(g).connect(d);o.start(t);o.stop(t+.05);},
  shaker(ac,d,t,{v=1}={}){const s=noise(ac),h=bq(ac,'bandpass',7500,1.5),g=gn(ac,0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*.3,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.08);s.connect(h).connect(g).connect(d);s.start(t);s.stop(t+.1);},
  tamb(ac,d,t,{v=1}={}){DR.nhat(ac,d,t,{v:v*1.1,dec:.12,f:6500});const o=osc(ac,'square',5200),bp=bq(ac,'bandpass',5200,8),g=gn(ac,0);perc(g,t,.001,.1,v*.15);o.connect(bp).connect(g).connect(d);o.start(t);o.stop(t+.15);},
  crash(ac,d,t,{v=1,dec=1.6}={}){const s=noise(ac),h=bq(ac,'highpass',3500),p=bq(ac,'peaking',7000,1,5),g=gn(ac,0);perc(g,t,.002,dec,v*.35);s.connect(h).connect(p).connect(g).connect(d);s.start(t);s.stop(t+dec+.05);},
  click(ac,d,t,{v=1,f=2000}={}){const o=osc(ac,'sine',f),g=gn(ac,0);perc(g,t,.001,.03,v*.4);o.connect(g).connect(d);o.start(t);o.stop(t+.05);},
};

/* ---------- tonal voices ---------- */
function ksBuffer(ac,m,dec=.996,bright=.5){const key=m+'|'+dec+'|'+bright;if(AU.ks[key])return AU.ks[key];
  const sr=ac.sampleRate,f=hz(m),N=Math.max(2,Math.round(sr/f)),L=Math.floor(sr*2.2),b=ac.createBuffer(1,L,sr),d=b.getChannelData(0),buf=new Float32Array(N);
  for(let i=0;i<N;i++)buf[i]=Math.random()*2-1;let p=0,last=0;
  for(let i=0;i<L;i++){const x=buf[p];const y=dec*(bright*x+(1-bright)*.5*(x+last));last=x;buf[p]=y;d[i]=x;p=(p+1)%N;}
  return AU.ks[key]=b;}
const VO={
  sub(ac,d,t,{n,len=.4,v=1,glideFrom,drive=0}){const o=osc(ac,'sine',hz(glideFrom??n)),g=gn(ac,0);if(glideFrom!=null)o.frequency.exponentialRampToValueAtTime(hz(n),t+.09);
    const end=adsr(g.gain?g:g,t,{a:.004,d:.3,s:.8,r:.08,len,peak:v*.9});let x=o;if(drive){const w=shaper(ac,'soft',drive);o.connect(w);x=w;}x.connect(g).connect(d);o.start(t);o.stop(end);},
  bass(ac,d,t,{n,len=.25,v=1,wave='sawtooth',cut=700,env=1600,q=2,dec=.18}){const o=osc(ac,wave,hz(n)),f=bq(ac,'lowpass',cut+env,q),g=gn(ac,0);f.frequency.setValueAtTime(cut+env,t);f.frequency.setTargetAtTime(cut,t,dec/3);
    const end=adsr(g,t,{a:.004,d:.2,s:.6,r:.06,len,peak:v*.55});o.connect(f).connect(g).connect(d);o.start(t);o.stop(end);},
  acid(ac,d,t,{n,len=.12,v=1,acc=0,slideFrom,cut=380,res=14,env=2400}){const o=osc(ac,'sawtooth',hz(slideFrom??n));if(slideFrom!=null)o.frequency.linearRampToValueAtTime(hz(n),t+.06);
    const f1=bq(ac,'lowpass',cut,res*.5),f2=bq(ac,'lowpass',cut,res*.5),g=gn(ac,0),pk=cut+env*(1+acc);[f1,f2].forEach(f=>{f.frequency.setValueAtTime(pk,t);f.frequency.setTargetAtTime(cut,t,.06+(1-acc)*.05);});
    const end=adsr(g,t,{a:.003,d:.15,s:.7,r:.03,len,peak:v*(.32+acc*.18)});o.connect(f1).connect(f2).connect(g).connect(d);o.start(t);o.stop(end);},
  ep(ac,d,t,{n,len=.6,v=1,bright=1}){ // DX7-style electric piano: 1:1 FM body + 14:1 tine
    const f=hz(n),c=osc(ac,'sine',f),m=osc(ac,'sine',f),mg=gn(ac,0),g=gn(ac,0);mg.gain.setValueAtTime(f*2.2*bright*v,t);mg.gain.exponentialRampToValueAtTime(f*.25+.1,t+.9);m.connect(mg).connect(c.frequency);
    const c2=osc(ac,'sine',f),m2=osc(ac,'sine',f*14),m2g=gn(ac,0),g2=gn(ac,0);m2g.gain.setValueAtTime(f*4*bright,t);m2g.gain.exponentialRampToValueAtTime(1,t+.12);m2.connect(m2g).connect(c2.frequency);perc(g2,t,.001,.3,v*.12);
    const end=adsr(g,t,{a:.002,d:1.4,s:.25,r:.35,len,peak:v*.3});c.connect(g).connect(d);c2.connect(g2).connect(d);[c,m,c2,m2].forEach(x=>{x.start(t);x.stop(end);});},
  organ(ac,d,t,{n,len=.5,v=1,bars=[1,.8,.6,0,.3,0,0,.2]}){const g=gn(ac,0),end=adsr(g,t,{a:.006,d:.05,s:1,r:.05,len,peak:v*.12});
    [.5,1,1.5,2,3,4,5,6].forEach((h,i)=>{if(!bars[i])return;const o=osc(ac,'sine',hz(n)*h),og=gn(ac,bars[i]);o.connect(og).connect(g);o.start(t);o.stop(end);});g.connect(d);},
  pad(ac,d,t,{notes,len=2,v=1,cut=1800,a=.4,r=.8,wave='sawtooth',det=12,q=.8}){const f=bq(ac,'lowpass',cut,q),g=gn(ac,0),end=adsr(g,t,{a,d:.5,s:.85,r,len,peak:v*.1});
    notes.forEach(m=>[-det,det].forEach(dt=>{const o=osc(ac,wave,hz(m));o.detune.value=dt+Math.random()*4;o.connect(f);o.start(t);o.stop(end);}));f.connect(g).connect(d);},
  supersaw(ac,d,t,{notes,len=.4,v=1,cut=5000}){const f=bq(ac,'lowpass',cut,.7),g=gn(ac,0),end=adsr(g,t,{a:.004,d:.2,s:.8,r:.15,len,peak:v*.07});
    notes.forEach(m=>[-24,-11,0,11,24].forEach(dt=>{const o=osc(ac,'sawtooth',hz(m));o.detune.value=dt;o.connect(f);o.start(t);o.stop(end);}));f.connect(g).connect(d);},
  pluck(ac,d,t,{n,v=1,dec=.996,bright=.5}){const s=ac.createBufferSource();s.buffer=ksBuffer(ac,n,dec,bright);const g=gn(ac,v*.5);s.connect(g).connect(d);s.start(t);s.stop(t+2.2);},
  vocal(ac,d,t,{n,len=.6,v=1,vowel='a'}){ // a sung "aah": sawtooth + vibrato through three formant bandpasses
    const F={a:[800,1150,2900],o:[450,800,2830],e:[400,1700,2600],u:[350,600,2700]}[vowel],o=osc(ac,'sawtooth',hz(n)),vib=osc(ac,'sine',5.2),vg=gn(ac,0);
    vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(hz(n)*.012,t+.35);vib.connect(vg).connect(o.frequency);
    const g=gn(ac,0),end=adsr(g,t,{a:.06,d:.2,s:.8,r:.18,len,peak:v*.9});
    F.forEach((f,i)=>{const b=bq(ac,'bandpass',f,[9,12,14][i]),bg=gn(ac,[1,.6,.25][i]);o.connect(b).connect(bg).connect(g);});g.connect(d);o.start(t);vib.start(t);o.stop(end);vib.stop(end);},
  lead(ac,d,t,{n,len=.3,v=1,from,cut=1400,q=4}){ // Minimoog-ish: three saws, glide, resonant lowpass with envelope
    const g=gn(ac,0),f=bq(ac,'lowpass',cut*3,q),end=adsr(g,t,{a:.01,d:.3,s:.75,r:.12,len,peak:v*.16});f.frequency.setValueAtTime(cut*3.5,t);f.frequency.setTargetAtTime(cut,t,.12);
    [0,7,-1203].forEach(dt=>{const o=osc(ac,'sawtooth',hz(from??n));o.detune.value=dt;if(from!=null)o.frequency.setTargetAtTime(hz(n),t,.03);o.connect(f);o.start(t);o.stop(end);});f.connect(g).connect(d);},
  bellv(ac,d,t,{n,v=1,dec=1.2}){const f=hz(n),c=osc(ac,'sine',f),m=osc(ac,'sine',f*3.5),mg=gn(ac,0),g=gn(ac,0);mg.gain.setValueAtTime(f*2.5,t);mg.gain.exponentialRampToValueAtTime(1,t+dec);m.connect(mg).connect(c.frequency);perc(g,t,.002,dec,v*.25);c.connect(g).connect(d);c.start(t);m.start(t);c.stop(t+dec+.05);m.stop(t+dec+.05);},
  power(ac,d,t,{notes,len=.3,v=1,drive=.8}){const w=shaper(ac,'hard',drive),f=bq(ac,'lowpass',3200,.7),g=gn(ac,0),end=adsr(g,t,{a:.003,d:.2,s:.8,r:.08,len,peak:v*.18});
    notes.forEach(m=>[0,9].forEach(dt=>{const o=osc(ac,'sawtooth',hz(m));o.detune.value=dt;o.connect(w);o.start(t);o.stop(end);}));w.connect(f).connect(g).connect(d);},
};

/* ---------- the demo band (used by the listening games) ----------
   A minor, 96 BPM, four bars: Am – F – C – G. Every instrument has its
   own strip, so games can pan it, push it back, or filter the whole mix. */
const DEMO={bpm:96,
  chords:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],roots:[45,41,48,43],
  melody:[[0,76,6],[6,74,2],[8,72,6],[16,72,6],[22,69,2],[24,72,8],[32,71,6],[38,72,2],[40,74,8],[48,74,6],[54,72,2],[56,71,8]],
  inst:{kick:'Kick',snare:'Snare',hats:'Hi-hats',bass:'Bass',guitar:'Acoustic guitar',pads:'Synth pads',vocal:'Lead vocal'}};
function demoTracks(r,{only,parts}={}){
  const ac=r.ac,S=n=>r.strips[n]||r.strip(n),use=n=>(!only||only.includes(n))&&(!parts||parts[n]!==false);
  const T=[];const s16=(s,b)=>s+16*b;
  if(use('kick'))T.push({pat:P('x.....x...x.....'.repeat(4)),play:(t,v)=>DR.kick(ac,S('kick').in,t,{v,dec:.45})});
  if(use('snare'))T.push({pat:P('....x.......x..o'.repeat(4)),play:(t,v)=>DR.snare(ac,S('snare').in,t,{v})});
  if(use('hats'))T.push({pat:P('x-o-x-o-x-o-x-ox'.repeat(4),.7),play:(t,v)=>DR.hat(ac,S('hats').in,t,{v})});
  if(use('bass'))T.push({pat:[...Array(64)].map((_,s)=>{const b=s>>4,k=s%16;return [0,3,6,8,10,14].includes(k)?{n:DEMO.roots[b]+(k===10?12:0)}:null;}),play:(t,e,sd)=>VO.bass(ac,S('bass').in,t,{n:e.n,len:sd*1.6,cut:500})});
  if(use('guitar'))T.push({pat:[...Array(64)].map((_,s)=>{const b=s>>4,k=s%16;if(k%2)return null;const ch=DEMO.chords[b];return {n:ch[(k/2)%3]+12+((k/2)%4===3?12:0)};}),play:(t,e)=>VO.pluck(ac,S('guitar').in,t,{n:e.n,v:.8})});
  if(use('pads'))T.push({pat:[...Array(64)].map((_,s)=>s%16===0?{ch:DEMO.chords[s>>4]}:null),play:(t,e,sd)=>VO.pad(ac,S('pads').in,t,{notes:e.ch.map(m=>m+12),len:sd*15,cut:1600,a:.5,r:.6,v:.9})});
  if(use('vocal'))T.push({pat:(()=>{const a=Array(64).fill(null);DEMO.melody.forEach(([s,n,l])=>a[s]={n,l});return a;})(),play:(t,e,sd)=>VO.vocal(ac,S('vocal').in,t,{n:e.n,len:e.l*sd*.92,v:.8})});
  return T;
}
const DEMO_BASE={kick:{gain:1},snare:{gain:.8},hats:{gain:.5},bass:{gain:.9},guitar:{gain:.6},pads:{gain:.7},vocal:{gain:.7}};
function playDemo(dest,{layout,loops=Infinity,rt=1.4,only,onStep}={}){
  const r=rig(dest,{rt,pre:.02,damp:.5});
  Object.keys(DEMO.inst).forEach(n=>{const b=DEMO_BASE[n],L=layout&&layout[n];r.strip(n,{gain:b.gain*(L&&L.gain!=null?L.gain:1),pan:L?L.pan||0:0,send:L?L.send||0:.12,lp:L&&L.lp||20000});});
  seq(r,{bpm:DEMO.bpm,len:64,loops,tracks:demoTracks(r,{only}),onStep});return r;
}

/* ---------- eight decades: the same idea dressed in each era's sound ---------- */
function eraChain(ac,dest,steps){let n=dest;for(let i=steps.length-1;i>=0;i--){const x=steps[i];x.connect(n);n=x;}return n;}
const ERAS={
  1955:{label:'1950s',tells:'Mono, narrow band, slapback echo, shuffle feel, no real low end.',play(dest){const ac=audio();
    const hp=bq(ac,'highpass',140),lp=bq(ac,'lowpass',4200),tp=shaper(ac,'tape',1),mono=ac.createGain();mono.channelCount=1;mono.channelCountMode='explicit';
    const inp=eraChain(ac,dest,[mono,hp,lp,tp]);const dl=ac.createDelay(1);dl.delayTime.value=.11;const dg=gn(ac,.35);inp.connect(dl);dl.connect(dg).connect(dest);
    const r=rig(inp,{rt:.6,damp:.7});r.strip('dr',{gain:.6,send:.15});r.strip('b',{gain:.9});r.strip('p',{gain:.7,send:.2});r.strip('v',{gain:.7,send:.25});
    const h=hiss(ac,dest,.012);const ch=[[57,60,64],[50,53,57],[52,56,59],[57,60,64]];
    seq(r,{bpm:138,len:32,loops:1,swing:.33,tracks:[
      {pat:P('x.o.x.o.x.o.x.o.x.o.x.o.x.o.x.o.',.6),play:(t,v)=>DR.nhat(ac,r.strips.dr.in,t,{v,dec:.09,f:3000})},
      {pat:P('....x.......x.......x.......x...'),play:(t,v)=>DR.snare(ac,r.strips.dr.in,t,{v:.6,bright:1800,ndec:.12})},
      {pat:[...Array(32)].map((_,s)=>s%4===0?{n:[45,49,52,54,50,54,57,54][s/4]}:null),play:(t,e,sd)=>{VO.sub(ac,r.strips.b.in,t,{n:e.n,len:sd*3,v:.9});VO.pluck(ac,r.strips.b.in,t,{n:e.n+12,v:.35,dec:.99});}},
      {pat:[...Array(32)].map((_,s)=>s%4===2?{ch:ch[s>>3]}:null),play:(t,e)=>e.ch.forEach(m=>VO.ep(ac,r.strips.p.in,t,{n:m+12,len:.18,v:.5,bright:.4}))},
      {pat:[...Array(32)].map((_,s)=>s%8===0?{n:[69,72,71,69][s>>3]}:null),play:(t,e,sd)=>VO.vocal(ac,r.strips.v.in,t,{n:e.n,len:sd*7,vowel:'o',v:.7})}]});
    return withExtra(r,h);}},
  1965:{label:'1960s',tells:'Early stereo: drums hard left, organ hard right, plate reverb, tape warmth, tambourine.',play(dest){const ac=audio();
    const inp=eraChain(ac,dest,[bq(ac,'highpass',70),bq(ac,'lowpass',8500),shaper(ac,'tape',1)]);
    const r=rig(inp,{rt:2.2,pre:.01,damp:.4});r.strip('dr',{pan:-1,gain:.8,send:.3});r.strip('b',{pan:0,gain:.8});r.strip('o',{pan:1,gain:.8,send:.25});r.strip('v',{pan:.2,gain:.7,send:.4});
    const h=hiss(ac,dest,.008);const ch=[[57,60,64],[53,57,60],[55,59,62],[52,56,59]];
    seq(r,{bpm:118,len:32,loops:1,tracks:[
      {pat:P('x.......x.......x.......x.......'),play:t=>DR.kick(ac,r.strips.dr.in,t,{v:.7,dec:.3,f0:60,click:.1})},
      {pat:P('....x.......x.......x.......x...'),play:t=>DR.snare(ac,r.strips.dr.in,t,{v:.7,bright:2000})},
      {pat:P('x...x...x...x...x...x...x...x...'),play:t=>DR.tamb(ac,r.strips.dr.in,t,{v:.6})},
      {pat:[...Array(32)].map((_,s)=>[0,6,8,12].includes(s%16)?{n:[45,41,43,40][s>>3]}:null),play:(t,e,sd)=>VO.bass(ac,r.strips.b.in,t,{n:e.n,len:sd*1.5,cut:450,env:500,wave:'triangle'})},
      {pat:[...Array(32)].map((_,s)=>s%8===0?{ch:ch[s>>3]}:null),play:(t,e,sd)=>e.ch.forEach(m=>VO.organ(ac,r.strips.o.in,t,{n:m,len:sd*7.5,v:.9}))},
      {pat:[...Array(32)].map((_,s)=>s%4===0?{n:[76,74,72,74,72,71,69,71][s/4]}:null),play:(t,e,sd)=>VO.vocal(ac,r.strips.v.in,t,{n:e.n,len:sd*3.5,v:.7})}]});
    return withExtra(r,h);}},
  1977:{label:'1970s',tells:'Warm and dry, four-on-the-floor, octave disco bass, string machine, wide but natural stereo.',play(dest){const ac=audio();
    const inp=eraChain(ac,dest,[bq(ac,'lowpass',11000),shaper(ac,'tape',1)]);
    const r=rig(inp,{rt:1.2,damp:.5});r.strip('k',{gain:.9});r.strip('h',{pan:.35,gain:.5});r.strip('sn',{gain:.7,send:.1});r.strip('b',{gain:.85});r.strip('s',{pan:-.5,gain:.8,send:.2});r.strip('g',{pan:.6,gain:.6});
    const ch=[[57,60,64],[52,55,59],[53,57,60],[55,59,62]];
    seq(r,{bpm:118,len:32,loops:1,tracks:[
      {pat:P('x...x...x...x...x...x...x...x...'),play:t=>DR.kick(ac,r.strips.k.in,t,{v:.9,dec:.3,f0:55,click:.2})},
      {pat:P('..x...x...x...x...x...x...x...x.'),play:t=>DR.nhat(ac,r.strips.h.in,t,{v:.8,dec:.18,f:6000})},
      {pat:P('....x.......x.......x.......x...'),play:t=>DR.snare(ac,r.strips.sn.in,t,{v:.7})},
      {pat:[...Array(32)].map((_,s)=>s%2===0?{n:[45,40,41,43][s>>3]+(s%4===2?12:0)}:null),play:(t,e,sd)=>VO.bass(ac,r.strips.b.in,t,{n:e.n,len:sd*.9,cut:600,env:1400,q:3})},
      {pat:[...Array(32)].map((_,s)=>s%8===0?{ch:ch[s>>3]}:null),play:(t,e,sd)=>VO.pad(ac,r.strips.s.in,t,{notes:e.ch.map(m=>m+12),len:sd*8,cut:3500,a:.15,r:.3,det:18,v:1.1})},
      {pat:[...Array(32)].map((_,s)=>s%4===2?{n:[69,64,65,67][s>>3]+12}:null),play:(t,e)=>VO.pluck(ac,r.strips.g.in,t,{n:e.n,v:.6,dec:.97,bright:.9})}]});
    return r;}},
  1985:{label:'1980s',tells:'Gated reverb on a huge snare, FM bass and bells, glossy chorus, very bright top.',play(dest){const ac=audio();
    const inp=eraChain(ac,dest,[bq(ac,'highshelf',6000,.7,5)]);
    const r=rig(inp,{rt:1,gated:.28,pre:.005,damp:.2});r.strip('k',{gain:.9,send:.1});r.strip('sn',{gain:.9,send:1.4});r.strip('h',{pan:.3,gain:.4});r.strip('b',{gain:.8});r.strip('p',{pan:-.3,gain:.7});r.strip('t',{gain:.8,send:.8});
    const ch=[[57,64,67,72],[53,60,64,69],[55,62,67,71],[52,59,64,67]];
    seq(r,{bpm:112,len:32,loops:1,tracks:[
      {pat:P('x.......x.x.....x.......x.x.....'),play:t=>DR.kick(ac,r.strips.k.in,t,{v:.9,dec:.25,f0:58,click:.4})},
      {pat:P('....x.......x.......x.......x...'),play:t=>DR.snare(ac,r.strips.sn.in,t,{v:1,tone:200,bright:3500,ndec:.15})},
      {pat:P('x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.'),play:t=>DR.nhat(ac,r.strips.h.in,t,{v:.6,dec:.04,f:9000})},
      {pat:[...Array(32)].map((_,s)=>s%2===0?{n:[45,41,43,40][s>>3]+(s%8===6?12:0)}:null),play:(t,e,sd)=>VO.ep(ac,r.strips.b.in,t,{n:e.n,len:sd*.9,v:.9,bright:1.4})},
      {pat:[...Array(32)].map((_,s)=>s%8===0?{ch:ch[s>>3]}:null),play:(t,e,sd)=>e.ch.forEach(m=>VO.bellv(ac,r.strips.p.in,t,{n:m+12,v:.6,dec:1.4}))},
      {pat:[...Array(32)].map((_,s)=>s>=28?{f:[300,240,190,150][s-28]}:null),play:(t,e)=>DR.tom(ac,r.strips.t.in,t,{f:e.f,v:.8})}]});
    return r;}},
  1994:{label:'1990s',tells:'Boom-bap swing, dusty 12-bit sampler crunch, vinyl crackle, a filtered loop.',play(dest){const ac=audio();
    const inp=eraChain(ac,dest,[bq(ac,'lowpass',9000),shaper(ac,'crush',12),bq(ac,'lowpass',11000)]);
    const r=rig(inp,{rt:.8,damp:.6});r.strip('k',{gain:1});r.strip('sn',{gain:.85,send:.1});r.strip('h',{gain:.45,pan:.2});r.strip('l',{gain:.8,lp:3500});r.strip('b',{gain:.9});
    const h=crackle(ac,dest);const ch=[[57,60,64,67],[53,57,60,64]];
    seq(r,{bpm:90,len:32,loops:1,swing:.18,tracks:[
      {pat:P('x.........x.x.....x.......x.....'),play:t=>DR.kick(ac,r.strips.k.in,t,{v:1,dec:.4,f0:52,drive:.4})},
      {pat:P('....x.......x.......x.......x..o'),play:t=>DR.snare(ac,r.strips.sn.in,t,{v:.95,tone:170,bright:2200,ndec:.16})},
      {pat:P('x.x.x.x.x.x.x.xox.x.x.x.x.x.x.x.',.8),play:(t,v)=>DR.nhat(ac,r.strips.h.in,t,{v,dec:.05,f:7000})},
      {pat:[...Array(32)].map((_,s)=>[0,6,10].includes(s%16)?{ch:ch[s>>4]}:null),play:(t,e,sd)=>e.ch.forEach(m=>VO.ep(ac,r.strips.l.in,t,{n:m,len:sd*3,v:.7,bright:.6}))},
      {pat:[...Array(32)].map((_,s)=>[0,10].includes(s%16)?{n:[33,29][s>>4]}:null),play:(t,e,sd)=>VO.sub(ac,r.strips.b.in,t,{n:e.n,len:sd*5,v:.9})}]});
    return withExtra(r,h);}},
  2004:{label:'2000s',tells:'The loudness war: everything clipped and brick-walled, distorted power chords, crash on every bar.',play(dest){const ac=audio();
    const inp=eraChain(ac,dest,[gn(ac,3.2),shaper(ac,'hard',.25),bq(ac,'highshelf',5000,.7,3)]);
    const r=rig(inp,{rt:1,damp:.5});r.strip('k',{gain:.8});r.strip('sn',{gain:.7,send:.15});r.strip('c',{gain:.4,pan:.3});r.strip('g',{gain:.8,pan:-.2});r.strip('g2',{gain:.8,pan:.6});r.strip('b',{gain:.7});
    seq(r,{bpm:150,len:32,loops:1,tracks:[
      {pat:P('x.x.....x.x.....x.x.....x.x.....'),play:t=>DR.kick(ac,r.strips.k.in,t,{v:.9,dec:.2,f0:60,click:.6})},
      {pat:P('....x.......x.......x.......x.x.'),play:t=>DR.snare(ac,r.strips.sn.in,t,{v:.9,bright:3000})},
      {pat:P('x...............x...............'),play:t=>DR.crash(ac,r.strips.c.in,t,{v:.8,dec:1.2})},
      {pat:[...Array(32)].map((_,s)=>s%2===0?{ch:[[45,52,57],[41,48,53],[48,55,60],[43,50,55]][s>>3]}:null),play:(t,e,sd)=>{VO.power(ac,r.strips.g.in,t,{notes:e.ch,len:sd*.9});VO.power(ac,r.strips.g2.in,t,{notes:e.ch,len:sd*.9});}},
      {pat:[...Array(32)].map((_,s)=>s%2===0?{n:[33,29,36,31][s>>3]}:null),play:(t,e,sd)=>VO.bass(ac,r.strips.b.in,t,{n:e.n,len:sd*.9,cut:900,wave:'square'})}]});
    return r;}},
  2013:{label:'2010s',tells:'EDM: four-on-the-floor kick ducking a giant supersaw (sidechain pumping), big reverb, sub bass.',play(dest){const ac=audio();
    const inp=eraChain(ac,dest,[gn(ac,1.4),shaper(ac,'soft',.15)]);
    const r=rig(inp,{rt:3,pre:.03,damp:.4});r.strip('k',{gain:1});r.strip('c',{gain:.7,send:.3});r.strip('s',{gain:.9,send:.35});r.strip('b',{gain:.9});r.strip('h',{gain:.35,pan:.3});
    const duck=r.strips.s.gain,duckB=r.strips.b.gain,ch=[[57,60,64,69],[53,57,60,65],[48,52,55,60],[55,59,62,67]];
    seq(r,{bpm:126,len:32,loops:1,tracks:[
      {pat:P('x...x...x...x...x...x...x...x...'),play:t=>{DR.kick(ac,r.strips.k.in,t,{v:1,dec:.35,f0:48,click:.5});[duck,duckB].forEach(g=>{g.gain.setValueAtTime(.12,t);g.gain.linearRampToValueAtTime(.95,t+.22);});}},
      {pat:P('....x.......x.......x.......x...'),play:t=>DR.clap(ac,r.strips.c.in,t,{v:.9})},
      {pat:P('..x...x...x...x...x...x...x...x.'),play:t=>DR.nhat(ac,r.strips.h.in,t,{v:.8,dec:.07,f:8000})},
      {pat:[...Array(32)].map((_,s)=>s%2===0?{ch:ch[s>>3]}:null),play:(t,e,sd)=>VO.supersaw(ac,r.strips.s.in,t,{notes:e.ch.map(m=>m+12),len:sd*1.8,v:.9})},
      {pat:[...Array(32)].map((_,s)=>s%8===0?{n:[33,29,36,31][s>>3]}:null),play:(t,e,sd)=>VO.sub(ac,r.strips.b.in,t,{n:e.n,len:sd*7.5,v:.9})}]});
    return r;}},
  2022:{label:'2020s',tells:'Trap and hyperpop: sliding distorted 808s, hi-hat rolls, pitched-up bells, extremely loud and wide.',play(dest){const ac=audio();
    const inp=eraChain(ac,dest,[gn(ac,2),shaper(ac,'soft',.5)]);
    const r=rig(inp,{rt:1.8,pre:.02,damp:.3});r.strip('808',{gain:1});r.strip('c',{gain:.8,send:.15});r.strip('h',{gain:.45,pan:-.4});r.strip('bl',{gain:.6,pan:.5,send:.4});
    const hats='x.x.x.x.xxxxx.x.x.x.x.x.x.xxxxxx';
    seq(r,{bpm:140,len:32,loops:1,tracks:[
      {pat:[...Array(32)].map((_,s)=>({0:{n:33},6:{n:33},10:{n:36,g:33},16:{n:31},22:{n:31},26:{n:38,g:31}})[s]||null),play:(t,e,sd)=>{VO.sub(ac,r.strips['808'].in,t,{n:e.n,len:sd*5,v:1,glideFrom:e.g,drive:.6});DR.kick(ac,r.strips['808'].in,t,{v:.5,dec:.1,f0:60,click:.6});}},
      {pat:P('........x...............x.......'),play:t=>DR.clap(ac,r.strips.c.in,t,{v:1,dec:.15})},
      {pat:P(hats,.7),play:(t,v,sd,s)=>{DR.nhat(ac,r.strips.h.in,t,{v,dec:.03,f:9000});if(hats[s]==='x'&&hats[s+1]==='x')DR.nhat(ac,r.strips.h.in,t+sd/2,{v:v*.7,dec:.02,f:9500});}},
      {pat:[...Array(32)].map((_,s)=>s%3===0?{n:[81,84,88,86,84,81,79,76,79,81,84][s/3]}:null),play:(t,e)=>VO.bellv(ac,r.strips.bl.in,t,{n:e.n,v:.6,dec:.5})}]});
    return r;}},
};
function hiss(ac,dest,v){const s=noise(ac),f=bq(ac,'highpass',3000),g=gn(ac,v);s.connect(f).connect(g).connect(dest);s.start();return {stop(){try{s.stop();}catch(e){}}};}
function crackle(ac,dest){const sr=ac.sampleRate,b=ac.createBuffer(1,sr*2,sr),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()<.0006?(Math.random()*2-1)*.8:(Math.random()*2-1)*.004;
  const s=ac.createBufferSource();s.buffer=b;s.loop=true;const f=bq(ac,'bandpass',2500,.5),g=gn(ac,.5);s.connect(f).connect(g).connect(dest);s.start();return {stop(){try{s.stop();}catch(e){}}};}
function withExtra(r,x){const st=r.stop;r.stop=f=>{x.stop();st(f);};return r;}
function playEra(year,dest){const r=ERAS[year].play(dest||AU.music);return r;}

/* ---------- famous machines, recreated ---------- */
const MACHINES={
  tr808(dest){const r=rig(dest,{rt:.9});['k','s','h','cb','cl'].forEach(n=>r.strip(n,{gain:1,send:.05,pan:n==='h'?.25:n==='cb'?-.2:0}));const ac=r.ac;
    seq(r,{bpm:100,len:32,loops:1,tracks:[{pat:P('x.....x...x.....x.....x...x..x..'),play:t=>DR.kick(ac,r.strips.k.in,t,{v:1,dec:1.1,f0:48,f1:120,click:.1})},
      {pat:P('....x.......x.......x.......x...'),play:t=>DR.clap(ac,r.strips.cl.in,t,{v:.8})},{pat:P('x.x.x.x.x.x.x.x.x.x.x.x.x.xxx.x.',.7),play:(t,v)=>DR.hat(ac,r.strips.h.in,t,{v})},
      {pat:P('..x.....x.x.......x.....x.......'),play:t=>DR.cowbell(ac,r.strips.cb.in,t,{v:.7})}]});return r;},
  tr909(dest){const r=rig(dest,{rt:1});['k','s','h','o'].forEach(n=>r.strip(n,{gain:1,send:.05}));const ac=r.ac;
    seq(r,{bpm:124,len:32,loops:1,tracks:[{pat:P('x...x...x...x...x...x...x...x...'),play:t=>DR.kick(ac,r.strips.k.in,t,{v:1,dec:.35,f0:50,f1:200,click:.8,drive:.3})},
      {pat:P('....x.......x.......x.......x...'),play:t=>DR.clap(ac,r.strips.s.in,t,{v:.8})},{pat:P('xxoxxxoxxxoxxxox',.6),play:(t,v)=>DR.nhat(ac,r.strips.h.in,t,{v,dec:.04,f:8500})},
      {pat:P('..x...x...x...x...x...x...x...x.'),play:t=>DR.nhat(ac,r.strips.o.in,t,{v:.9,dec:.28,f:7000})}]});return r;},
  tb303(dest){const r=rig(dest,{rt:.8});r.strip('a',{gain:1,send:.08});r.strip('k',{gain:.8});const ac=r.ac;
    const line=[[0,36,1],[2,48,0],[3,36,0],[4,39,1],[6,36,0],[7,43,0,1],[8,36,1],[10,46,0],[11,48,1,1],[12,36,0],[14,41,1],[15,43,0,1]];const pat=Array(16).fill(null);line.forEach(([s,n,a,sl])=>pat[s]={n,a,sl});
    let prev=36;seq(r,{bpm:126,len:16,loops:2,tracks:[{pat,play:(t,e,sd)=>{VO.acid(ac,r.strips.a.in,t,{n:e.n,acc:e.a,slideFrom:e.sl?prev:null,len:sd*.8,cut:300+Math.random()*120,res:16});prev=e.n;}},
      {pat:P('x...x...x...x...'),play:t=>DR.kick(ac,r.strips.k.in,t,{v:.8,dec:.3,f0:50,click:.5})}]});return r;},
  dx7(dest){const r=rig(dest,{rt:1.6});r.strip('e',{gain:1,send:.2});const ac=r.ac;const ch=[[57,64,67,72],[53,60,64,69],[55,62,65,71],[52,59,64,67]];
    seq(r,{bpm:84,len:32,loops:1,tracks:[{pat:[...Array(32)].map((_,s)=>s%8===0?{ch:ch[s>>3]}:s%8===6?{ch:ch[s>>3].slice(1)}:null),play:(t,e,sd)=>e.ch.forEach((m,i)=>VO.ep(ac,r.strips.e.in,t+i*.012,{n:m,len:sd*5,v:.8}))}]});return r;},
  minimoog(dest){const r=rig(dest,{rt:1.2});r.strip('l',{gain:1.6,send:.15});const ac=r.ac;const mel=[[0,69,3],[3,72,1],[4,76,4],[8,74,2],[10,72,2],[12,71,2],[14,72,2],[16,69,6],[22,64,2],[24,67,4],[28,69,4]];
    const pat=Array(32).fill(null);mel.forEach(([s,n,l])=>pat[s]={n,l});let prev=null;seq(r,{bpm:108,len:32,loops:1,tracks:[{pat,play:(t,e,sd)=>{VO.lead(ac,r.strips.l.in,t,{n:e.n,len:e.l*sd*.95,from:prev,v:1});prev=e.n;}}]});return r;},
  juno106(dest){const ac=audio();const L=ac.createDelay(.05),R=ac.createDelay(.05),lfo=osc(ac,'triangle',.5),lg=gn(ac,.0025),m=ac.createChannelMerger(2),inp=gn(ac,1),dry=gn(ac,.6);
    L.delayTime.value=.0035;R.delayTime.value=.0035;lfo.connect(lg);lg.connect(L.delayTime);const inv=gn(ac,-1);lg.connect(inv).connect(R.delayTime);lfo.start(); // the Juno chorus: two delay lines swept in opposite directions
    inp.connect(L).connect(m,0,0);inp.connect(R).connect(m,0,1);m.connect(dest||AU.music);inp.connect(dry).connect(dest||AU.music);
    const r=rig(inp,{rt:1.8});r.strip('p',{gain:1.1,send:.15});const ch=[[57,64,69,72],[53,60,65,69],[48,55,60,64],[55,62,67,71]];
    seq(r,{bpm:90,len:32,loops:1,tracks:[{pat:[...Array(32)].map((_,s)=>s%8===0?{ch:ch[s>>3]}:null),play:(t,e,sd)=>VO.pad(ac,r.strips.p.in,t,{notes:e.ch,len:sd*7.5,cut:2600,a:.06,r:.5,wave:'sawtooth',det:4,q:2,v:1.3})}]});
    return withExtra(r,{stop(){try{lfo.stop();}catch(e){}setTimeout(()=>{try{m.disconnect();dry.disconnect();}catch(e){}},700);}});},
  alphajuno(dest){const r=rig(dest,{rt:1.4});r.strip('h',{gain:1,send:.12});const ac=r.ac; // the "Hoover": a stack of detuned saws that dips and swoops
    const seqn=[[0,45,6],[6,45,2],[8,48,4],[12,43,4],[16,45,6],[22,52,2],[24,50,4],[28,48,4]];const pat=Array(32).fill(null);seqn.forEach(([s,n,l])=>pat[s]={n,l});
    seq(r,{bpm:132,len:32,loops:1,tracks:[{pat,play:(t,e,sd)=>{const g=gn(ac,0),f=bq(ac,'lowpass',3500,1),end=adsr(g,t,{a:.01,d:.2,s:.8,r:.15,len:e.l*sd,peak:.09});
      [-35,-18,-6,0,8,19,33].forEach(dt=>{[0,-12].forEach(oc=>{const o=osc(ac,'sawtooth',hz(e.n+oc-5));o.detune.value=dt;o.frequency.setTargetAtTime(hz(e.n+oc),t,.05);o.frequency.setTargetAtTime(hz(e.n+oc-.6),t+e.l*sd*.6,.1);o.connect(f);o.start(t);o.stop(end);});});
      f.connect(g).connect(r.strips.h.in);}}]});return r;},
  simmons(dest){const r=rig(dest,{rt:1.1,gated:.3});r.strip('t',{gain:1.7,send:.6});r.strip('k',{gain:.8});const ac=r.ac;
    seq(r,{bpm:110,len:16,loops:2,tracks:[{pat:[...Array(16)].map((_,s)=>s>=8&&s%1===0?{f:[420,380,320,280,240,200,170,140][s-8]}:null),play:(t,e)=>DR.tom(ac,r.strips.t.in,t,{f:e.f,v:1,dec:.4})},
      {pat:P('x.......x.......'),play:t=>DR.kick(ac,r.strips.k.in,t,{v:.8,dec:.3,f0:55})}]});return r;},
};
/* a real recording of the machine wins: PRESETS[].src (audio/presets/…) is played
   when it exists; otherwise the in-browser recreation above. */
AU.smp={};
function sampleReady(src){if(AU.smp[src])return AU.smp[src];return AU.smp[src]=fetch(src).then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer();}).then(b=>new Promise((res,rej)=>audio().decodeAudioData(b,res,rej))).catch(e=>{delete AU.smp[src];throw e;});}
function playSample(buf,dest,{gain=.9,maxDur=12,offset=0}={}){const ac=audio(),s=ac.createBufferSource(),g=gn(ac,0),t=ac.currentTime+.04;s.buffer=buf;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.01);
  offset=Math.max(0,Math.min(offset,buf.duration-1));const end=t+Math.min(buf.duration-offset,maxDur);g.gain.setValueAtTime(gain,end-.25);g.gain.linearRampToValueAtTime(0,end);s.connect(g).connect(dest||AU.music);s.start(t,offset);s.stop(end+.02);return songHandle(ac,[s],g);}
function playMachine(id,dest){
  const P=(window.PRESETS||[]).find(x=>x.id===id);
  if(P&&P.kit)return play808(P.kit,dest);
  return playMachineSrc(P,id,dest);}
const KIT808={bd:'audio/presets/808-bd5075.wav',cp:'audio/presets/808-cp.wav',cb:'audio/presets/808-cb.wav',ch:'audio/presets/808-ch.wav',oh:'audio/presets/808-oh25.wav'};
// the real TR-808 one-shots played as a groove by the sequencer (falls back to the browser 808)
function play808(kit=KIT808,dest){const id='tr808';const P={kit};{
    const h={r:null,stopped:false,stop(f){h.stopped=true;if(h.r)h.r.stop(f);AU.live.delete(h);}};AU.live.add(h);const names=Object.keys(P.kit);
    Promise.all(names.map(n=>sampleReady(P.kit[n]))).then(bufs=>{if(h.stopped)return;const K=Object.fromEntries(names.map((n,i)=>[n,bufs[i]]));
      const r=rig(dest||AU.music,{rt:.9});['k','s','h','cb'].forEach(n=>r.strip(n,{gain:n==='h'?.7:1,send:.05,pan:n==='h'?.25:n==='cb'?-.2:0}));h.r=r;const ac=r.ac;
      const hit=(buf,d,t,v=1)=>{const s=ac.createBufferSource(),g=gn(ac,v);s.buffer=buf;s.connect(g).connect(d);s.start(t);};
      seq(r,{bpm:100,len:32,loops:1,tracks:[{pat:P_('x.....x...x.....x.....x...x..x..'),play:t=>hit(K.bd,r.strips.k.in,t,1)},
        {pat:P_('....x.......x.......x.......x...'),play:t=>hit(K.cp,r.strips.s.in,t,.8)},
        {pat:P_('x.x.x.x.x.x.x.o.x.x.x.x.x.x.x.o.',.7),play:(t,v)=>hit(v>.5?K.ch:K.oh,r.strips.h.in,t,v)},
        {pat:P_('..x.....x.x.......x.....x.......'),play:t=>hit(K.cb,r.strips.cb.in,t,.6)}]});}).catch(()=>{if(!h.stopped)h.r=MACHINES[id](dest||AU.music);});
    return h;}
}
function playMachineSrc(P,id,dest){
  if(P&&P.src){const h={inner:null,stopped:false,stop(f){h.stopped=true;if(h.inner)h.inner.stop(f);AU.live.delete(h);}};AU.live.add(h);
    sampleReady(P.src).then(buf=>{if(!h.stopped)h.inner=playSample(buf,dest);}).catch(()=>{if(!h.stopped)h.inner=MACHINES[id](dest||AU.music);});return h;}
  return MACHINES[id](dest||AU.music);
}

/* ---------- groove patterns (Ghost Note) ---------- */
const GROOVE_VOICE={kick:(ac,d,t)=>DR.kick(ac,d,t,{v:1,dec:.35}),snare:(ac,d,t)=>DR.snare(ac,d,t,{v:.9}),hat:(ac,d,t)=>DR.nhat(ac,d,t,{v:.8,dec:.05}),
  clave:(ac,d,t)=>DR.rim(ac,d,t,{v:1,f:2200}),bass:(ac,d,t)=>VO.bass(ac,d,t,{n:33,len:.16,cut:400,env:1200}),cowbell:(ac,d,t)=>DR.cowbell(ac,d,t,{v:.8}),clap:(ac,d,t)=>DR.clap(ac,d,t,{v:.9})};
function playGroove(g,{bars=4,countIn=true,onStep,dest}={}){
  const r=rig(dest,{rt:.7});const ac=r.ac;Object.keys(g.lanes).forEach(l=>r.strip(l,{gain:1,send:.05}));r.strip('ci',{gain:.6});
  const len=16,tot=(bars+(countIn?1:0));const tracks=Object.entries(g.lanes).map(([l,s])=>({pat:[...(countIn?'.'.repeat(16):''),...s.repeat(bars)].map(c=>c==='x'?1:null),play:t=>GROOVE_VOICE[l](ac,r.strips[l].in,t)}));
  if(countIn)tracks.push({pat:[...'x...x...x...x...'].map(c=>c==='x'?1:null).concat(Array(16*bars).fill(null)),play:(t,v,sd,s)=>DR.click(ac,r.strips.ci.in,t,{f:s===0?2400:1800})});
  seq(r,{bpm:g.bpm,len:len*tot,loops:1,tracks,onStep});r.dur=len*tot*60/g.bpm/4;return r;
}

/* ---------- envelope tones (Envelope Sculptor) ---------- */
// Envelope Sculptor's voice: a warm open fifth (A–E–A), soft detuned voices and a vibrato that blooms in.
// The filter stays fixed so only the loudness moves, and the room is short so it doesn't blur the release.
function playEnvelope(E,dest){const ac=audio(),r=rig(dest,{rt:.9,damp:.6});r.strip('e',{gain:1,send:.05});
  const t=ac.currentTime+.08,g=gn(ac,0),f=bq(ac,'lowpass',2300,.5),end=adsr(g,t,{a:E.a,d:E.d,s:E.s,r:E.r,len:E.hold,peak:.7});
  const lfo=osc(ac,'sine',5.1),lg=gn(ac,0);lfo.connect(lg);lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(6,t+.7);   // ±6 cents
  [57,64,69].forEach((n,k)=>[[-5,'triangle',.24],[6,'sawtooth',.07]].forEach(([dt,type,v])=>{const o=osc(ac,type,hz(n));o.detune.value=dt;lg.connect(o.detune);
    const vg=gn(ac,v*(k===1?.85:1));o.connect(vg).connect(f);o.start(t);o.stop(end+.05);}));
  lfo.start(t);lfo.stop(end+.1);f.connect(g).connect(r.strips.e.in);r.dur=end-t;return r;}

/* ---------- decaying spaces (Decay Guessr) ---------- */
const DECAY_SRC={
  clap:(ac,d,t)=>DR.clap(ac,d,t,{v:1,dec:.08}),
  snare:(ac,d,t)=>DR.snare(ac,d,t,{v:1,dec:.1,ndec:.1}),
  hey:(ac,d,t)=>VO.vocal(ac,d,t,{n:57,len:.18,v:1,vowel:'e'}),
  chord:(ac,d,t)=>[57,60,64].forEach(n=>VO.pluck(ac,d,t,{n:n+12,v:.7,dec:.95,bright:.8})),
};
// time between hits: enough of the tail to judge it (about −50 dB), no more
const decayGap=rt=>Math.max(.8,rt*.85+.15);
function playDecay({rt,src='clap',pre=.02,damp=.4,hits=2,gap},dest){
  const ac=audio(),out=gn(ac,1);out.connect(dest||AU.music);const cv=ac.createConvolver();cv.buffer=makeIR(ac,rt,{pre,damp});const wet=gn(ac,2.4),dry=gn(ac,1.5),inp=gn(ac,1);
  inp.connect(dry).connect(out);inp.connect(cv);cv.connect(wet).connect(out);gap=gap||decayGap(rt);const t0=ac.currentTime+.1;
  const play=typeof src==='function'?src:DECAY_SRC[src];for(let i=0;i<hits;i++)play(ac,inp,t0+i*gap);
  const h={dur:gap*hits,stop(f=.08){const t=ac.currentTime;out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(0,t+f);setTimeout(()=>{try{out.disconnect();}catch(e){}},f*1000+500);AU.live.delete(h);}};AU.live.add(h);return h;
}

/* ---------- Parameter Telephone synth ----------
   Eight knobs, all 0..1. The same code runs on the host (reveal) and on
   each phone (designing, recreating), so a patch sounds identical everywhere. */
const PATCH_KNOBS=[
  {k:'wave',l:'Wave',fmt:v=>['Sine','Triangle','Saw','Square'][Math.min(3,Math.floor(v*4))]},
  {k:'cut',l:'Cutoff',fmt:v=>fmtHz(80*Math.pow(150,v))},
  {k:'res',l:'Reso',fmt:v=>Math.round(v*100)+'%'},
  {k:'drive',l:'Drive',fmt:v=>Math.round(v*100)+'%'},
  {k:'att',l:'Attack',fmt:v=>Math.round(1+v*v*600)+' ms'},
  {k:'dec',l:'Decay',fmt:v=>Math.round(40+v*v*1400)+' ms'},
  {k:'echo',l:'Echo',fmt:v=>Math.round(v*100)+'%'},
  {k:'wob',l:'Wobble',fmt:v=>Math.round(v*100)+'%'},
];
const PATCH_DEFAULT={wave:.6,cut:.6,res:.2,drive:0,att:0,dec:.3,echo:0,wob:0};
const randomPatch=()=>Object.fromEntries(PATCH_KNOBS.map(({k})=>[k,Math.round(Math.random()*100)/100]));
/* The Telephone synth. loops=0 plays until stopped, and h.set(p) changes the sound while it plays:
   filter, drive, wobble and echo move at once, wave/attack/decay from the next note on. */
function playPatch(p,dest,{loops=1}={}){
  const ac=audio(),out=gn(ac,1);out.connect(dest||AU.music);
  // drive = a crossfade between the clean signal and one fixed saturation curve (swapping curves while playing clicks)
  const f=bq(ac,'lowpass',1000,1),drv=shaper(ac,'soft',1.6),pre=gn(ac,1),dry=gn(ac,1),dwet=gn(ac,0),vca=gn(ac,.28);
  const lfo=osc(ac,'sine',3.2),lg=gn(ac,0);lfo.connect(lg).connect(f.frequency);lfo.start();
  const dl=ac.createDelay(1),fb=gn(ac,0),wet=gn(ac,0);dl.delayTime.value=.409;
  // a gentle safety compressor: high resonance + drive + echo feedback can peak hard on phone speakers
  const lim=ac.createDynamicsCompressor();lim.threshold.value=-10;lim.knee.value=8;lim.ratio.value=8;lim.attack.value=.003;lim.release.value=.15;
  pre.connect(dry).connect(f);pre.connect(drv).connect(dwet).connect(f);f.connect(vca).connect(lim);vca.connect(dl);dl.connect(fb).connect(dl);dl.connect(wet).connect(lim);lim.connect(out);
  let P={...p};
  const set=(q,tc=.025)=>{P={...q};const t=ac.currentTime,fc=80*Math.pow(150,P.cut);
    f.frequency.setTargetAtTime(fc,t,tc);f.Q.setTargetAtTime(.5+P.res*16,t,tc);
    dry.gain.setTargetAtTime(Math.cos(P.drive*Math.PI/2),t,tc);dwet.gain.setTargetAtTime(Math.sin(P.drive*Math.PI/2),t,tc);
    pre.gain.setTargetAtTime(1+P.drive*1.5,t,tc);vca.gain.setTargetAtTime(.28/(1+P.drive*1.2),t,tc);
    // wobble sweeps the filter around its cutoff, never below 10 % of it (a negative frequency makes the filter pop)
    lg.gain.setTargetAtTime(fc*P.wob*.9,t,tc);fb.gain.setTargetAtTime(P.echo*.55,t,tc);wet.gain.setTargetAtTime(P.echo*.7,t,tc);};
  set(p,.001);
  const bpm=110,step=60/bpm/2,riff=[57,64,69,72,64,69,60,67,57,64,69,72,65,69,67,64],t0=ac.currentTime+.06,N=loops?loops*16:Infinity;let i=0;
  const note=(t,n)=>{const wave=['sine','triangle','sawtooth','square'][Math.min(3,Math.floor(P.wave*4))],A=.001+P.att*P.att*.6,D=.04+P.dec*P.dec*1.4;
    const o=osc(ac,wave,hz(n-12)),g=gn(ac,0);o.connect(g).connect(pre);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+A);g.gain.setTargetAtTime(0,t+A,D/3);o.start(t);o.stop(t+A+D*2+.05);};
  // a finite take is scheduled up front (background tabs throttle timers); an endless one looks 150 ms ahead
  const tick=()=>{const lim=loops?Infinity:ac.currentTime+.15;while(i<N&&t0+i*step<lim){note(t0+i*step,riff[i%16]);i++;}};
  tick();const timer=loops?0:setInterval(tick,40);
  const dur=loops?N*step:Infinity;
  const h={dur,set,stop(fd=.08){clearInterval(timer);const t=ac.currentTime;out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(0,t+fd);setTimeout(()=>{try{out.disconnect();lfo.stop();}catch(e){}},fd*1000+400);AU.live.delete(h);}};
  AU.live.add(h);if(loops)setTimeout(()=>{if(AU.live.has(h))h.stop(.6);},(dur+1.8)*1000);return h;
}
/* How different two patches SOUND, 0 (same) … 1 (nothing alike). Knob distance alone was unfair: the wave knob has four
   steps, the cutoff hardly matters on a sine, 1 ms and 20 ms attacks sound the same, and a whisper of echo is inaudible. */
const PD_WAVE=[[0,.25,.8,.7],[.25,0,.6,.5],[.8,.6,0,.35],[.7,.5,.35,0]],PD_MAXF=[700,2500,9000,9000];
function patchDist(a,b){const bin=v=>Math.min(3,Math.floor((v??0)*4)),wa=bin(a.wave),wb=bin(b.wave),fc=p=>80*Math.pow(150,p.cut??0);
  const fe=(p,w)=>clamp(fc(p),90,PD_MAXF[w]),relOf=(p,w)=>Math.min(1,Math.log2(PD_MAXF[w]/fe(p,w))/2+.3),rel=Math.max(relOf(a,wa),relOf(b,wb));
  const A=p=>Math.max(8,1+600*p.att*p.att),D=p=>40+1400*p.dec*p.dec,e=v=>Math.max(0,v-.05)/.95;
  const d={wave:PD_WAVE[wa][wb],cut:Math.min(1,Math.abs(Math.log2(fe(a,wa)/fe(b,wb)))/3),res:Math.abs(a.res-b.res)*rel,
    drive:Math.min(1,Math.abs(Math.sqrt(a.drive)-Math.sqrt(b.drive))*1.2),att:Math.min(1,Math.abs(Math.log10(A(a)/A(b)))/1.6),
    dec:Math.min(1,Math.abs(Math.log2(D(a)/D(b)))/3),echo:Math.min(1,Math.abs(e(a.echo)-e(b.echo))*1.3),wob:Math.min(1,Math.abs(a.wob-b.wob)*1.3)*rel};
  const W={wave:1.3,cut:1,res:.6,drive:1,att:.8,dec:1,echo:.8,wob:.8};let sum=0,tot=0;for(const k in W){sum+=W[k]*d[k];tot+=W[k];}return sum/tot;}
// a copy's accuracy: a careful copy lands around 85–100 %, a rough one around 55 %, a random sound near 0
const patchAcc=(copy,target)=>clamp(1-(patchDist(copy,target)-.04)/.32,0,1);

/* ---------- the demo song (games 05–08) ----------
   One recording, used four ways: bar-locked loops, dry one-shot chops,
   and a spectral "freeze" that turns a single moment into a steady held tone. */
function songReady(){
  if(AU.song)return Promise.resolve(AU.song);
  if(!window.SONG||!SONG.src)return Promise.reject(new Error('No demo song configured'));
  if(!AU.songP)AU.songP=fetch(SONG.src).then(r=>{if(!r.ok)throw new Error('Demo song: HTTP '+r.status);return r.arrayBuffer();})
    .then(b=>new Promise((res,rej)=>audio().decodeAudioData(b,res,rej))).then(buf=>AU.song=buf).catch(e=>{AU.songP=null;console.warn(e);throw e;});
  return AU.songP;
}
const barSec=()=>240/SONG.bpm;
function songHandle(ac,nodes,out){const h={stop(f=.08){const t=ac.currentTime;out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(0,t+f);nodes.forEach(n=>{try{n.stop(t+f+.02);}catch(e){}});setTimeout(()=>{try{out.disconnect();}catch(e){}},f*1000+400);AU.live.delete(h);}};AU.live.add(h);return h;}
// a 4-bar excerpt, looping exactly on its bar lines
function playExcerpt(ex,dest,{gain=.85}={}){
  const ac=audio(),s=ac.createBufferSource(),g=gn(ac,0),t=ac.currentTime+.05;
  s.buffer=AU.song;s.loop=true;s.loopStart=ex.at;s.loopEnd=ex.at+ex.bars*barSec();
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.03);s.connect(g).connect(dest||AU.music);s.start(t,ex.at);
  return songHandle(ac,[s],g);
}
// one dry hit cut out of the song, with a quick fade so it ends cleanly
function songChop(ac,d,t,ch){
  const s=ac.createBufferSource(),g=gn(ac,0),len=ch.len+.02;s.buffer=AU.song;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+.003);g.gain.setValueAtTime(1,t+len-.06);g.gain.exponentialRampToValueAtTime(.0005,t+len);
  s.connect(g).connect(d);s.start(t,Math.max(0,ch.at-.02),len+.01);
}
/* spectral freeze: take the spectrum of ~0.75 s of the song at one moment, find
   the notes sounding there (the spectral peaks) and resynthesise each as a pure,
   steady sine at its exact frequency, over a quiet random-phase bed of the rest of
   the spectrum for colour. One inverse FFT builds it, so it loops seamlessly: the
   song's own chord, held perfectly still, with no beats or transients — a clean
   tone for the envelope to shape. */
function fftInPlace(re,im,inv){
  const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for(let len=2;len<=n;len<<=1){const a=(inv?2:-2)*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);
    for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const p=i+k,q=p+len/2,tr=re[q]*cr-im[q]*ci,ti=re[q]*ci+im[q]*cr;re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr;}}}
}
AU.frz={};
function freezeBuffer(fr){
  const key=fr.at;if(AU.frz[key])return AU.frz[key];
  const ac=audio(),src=AU.song,sr=src.sampleRate,N=1<<15,M=1<<17,L=src.getChannelData(0),R=src.numberOfChannels>1?src.getChannelData(1):L;
  const i0=Math.max(0,Math.floor(fr.at*sr)-N/2),re=new Float64Array(N),im=new Float64Array(N);
  for(let i=0;i<N;i++){const w=.5-.5*Math.cos(2*Math.PI*i/(N-1));re[i]=((L[i0+i]||0)+(R[i0+i]||0))*.5*w;}
  fftInPlace(re,im,false);
  const H=N/2,mag=new Float64Array(H+1),bin=sr/N;for(let k=0;k<=H;k++)mag[k]=Math.hypot(re[k],im[k]);
  // a smooth spectral envelope (for the noise bed and the peak threshold)
  const env=new Float64Array(H+1),W=24;{let acc=0;for(let k=0;k<=H;k++){acc+=mag[k];if(k>=2*W+1)acc-=mag[k-2*W-1];env[Math.max(0,k-W)]=acc/(2*W+1);}}
  // the notes: local maxima clearly above the envelope, 70 Hz – 6 kHz, strongest 48
  const peaks=[];for(let k=3;k<H-3;k++){const f=k*bin;if(f<70||f>6000)continue;const m=mag[k];
    if(m>mag[k-1]&&m>=mag[k+1]&&m>mag[k-2]&&m>=mag[k+2]&&m>env[k]*2.2){const a=Math.log(mag[k-1]+1e-12),b=Math.log(m+1e-12),c=Math.log(mag[k+1]+1e-12),d=.5*(a-c)/(a-2*b+c);peaks.push({f:(k+d)*bin,a:m});}}
  peaks.sort((x,y)=>y.a-x.a);const top=peaks.slice(0,48);
  // a gentle tilt (+3 dB/octave below 1 kHz) so the bass doesn't swamp the chord
  const tilt=f=>f<1000?Math.sqrt(f/1000):1;
  const out=ac.createBuffer(2,M,sr);
  for(let c=0;c<2;c++){const R2=new Float64Array(M),I2=new Float64Array(M);
    for(let k=1;k<M/2;k++){const hz=k*sr/M;if(hz<60||hz>12000)continue;const e=env[Math.min(H,Math.round(hz/bin))]*.18*tilt(hz),ph=Math.random()*2*Math.PI;R2[k]=e*Math.cos(ph);I2[k]=e*Math.sin(ph);}
    top.forEach(p=>{const k=Math.round(p.f*M/sr),amp=p.a*tilt(p.f)*Math.sqrt(M/N)*4,ph=Math.random()*2*Math.PI;if(k>0&&k<M/2){R2[k]+=amp*Math.cos(ph);I2[k]+=amp*Math.sin(ph);}});
    for(let k=1;k<M/2;k++){R2[M-k]=R2[k];I2[M-k]=-I2[k];}
    fftInPlace(R2,I2,true);const d=out.getChannelData(c);for(let i=0;i<M;i++)d[i]=R2[i];}
  // fixed loudness for every freeze point, so the envelopes compare fairly
  let ss=0;for(let c=0;c<2;c++){const d=out.getChannelData(c);for(let i=0;i<M;i++)ss+=d[i]*d[i];}
  const g=.12/Math.sqrt(ss/(2*M)+1e-12);for(let c=0;c<2;c++){const d=out.getChannelData(c);for(let i=0;i<M;i++)d[i]*=g;}
  out.notes=top.length;return AU.frz[key]=out;
}
function playFreeze(fr,E,dest){
  const ac=audio(),r=rig(dest,{rt:.6});r.strip('e',{gain:1,send:.04});
  const t0=ac.currentTime+.06,s=ac.createBufferSource(),out=gn(ac,0);s.buffer=freezeBuffer(fr);s.loop=true;
  const end=adsr(out,t0,{a:E.a,d:E.d,s:E.s,r:E.r,len:E.hold,peak:1.2});
  s.connect(out).connect(r.strips.e.in);s.start(t0,Math.random()*2);s.stop(end+.05);
  r.dur=end-t0;return r;
}
