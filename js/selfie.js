/* ====================================================================
   SELFIES — so the teacher can learn names. Optional and quiet: a phone offers it once (the first time it joins after
   this feature arrived); the notebook's header has the button to take a new one. The student frames their
   face in a square face box (drag to move, slider or pinch to zoom); the phone sends a 240 px JPEG in pieces (PeerJS
   json messages must stay under 16 KB). The teacher's computer keeps them in this browser (clipDB, dec -8), never shows
   them in the room, and opens them only from ⋯ ▸ Faces.
   ==================================================================== */
'use strict';

// ON HOLD (2026-10-27, the owner's request): false hides every trace (no offer, no notebook button, no ⋯ Faces, nothing accepted).
// Set it to true to bring selfies back.
const SELFIES_ON=false;
const SF_PX=240,SF_PART=11000;
const sfKey=n=>'sf:'+String(n||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'').slice(0,40);

/* ---------- host ---------- */
const SF={parts:new Map(),open:false,quiz:false};
const selfies=()=>(typeof MYCLIPS==='undefined'?[]:MYCLIPS.list).filter(c=>c.dec===-8);
const selfieFor=name=>selfies().find(c=>c.id===sfKey(name));
// on join: does this student already have one? (the phone then offers it, or not)
function selfieTell(p){if(!SELFIES_ON||!p||!p.conn||!p.conn.open)return;const go=()=>{try{p.conn.send({t:'selfie-has',has:!!selfieFor(p.name)});}catch(e){}};MYCLIPS.ready?MYCLIPS.ready.then(go):go();}
// pieces of a data URL from a phone {t:'selfie', i, n, d}
async function selfieData(p,m){if(!SELFIES_ON||!p||!Number.isInteger(m.n)||m.n<1||m.n>12||!Number.isInteger(m.i)||m.i<0||m.i>=m.n||typeof m.d!=='string'||m.d.length>SF_PART+10)return;
  let e=SF.parts.get(p.id);if(!e||e.n!==m.n){e={n:m.n,got:[]};SF.parts.set(p.id,e);}e.got[m.i]=m.d;if(e.got.filter(x=>x!=null).length<m.n)return;SF.parts.delete(p.id);
  const url=e.got.join('');if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(url))return;
  const blob=await (await fetch(url)).blob();if(blob.size>200e3)return;
  await clipDB.put({id:sfKey(p.name),dec:-8,name:p.name,blob,at:Date.now()});await loadMyClips();
  try{p.conn.send({t:'selfie-ok'});}catch(x){}if(SF.open)facesDraw();const u=$('#bFaces em');if(u)u.textContent=facesSub();}
const facesSub=()=>{const n=selfies().length;return n?`learn names · ${n}`:'none yet';};

const SF_URLS=new Map();const sfURL=c=>{const k=c.id+c.at;if(!SF_URLS.has(k))SF_URLS.set(k,URL.createObjectURL(c.blob));return SF_URLS.get(k);};
function openFaces(){SF.open=true;let ov=$('#faces');if(!ov){ov=el('div','facesov');ov.id='faces';document.body.appendChild(ov);}facesDraw();document.addEventListener('keydown',facesKey,true);}
function closeFaces(){SF.open=false;const ov=$('#faces');if(ov)ov.remove();document.removeEventListener('keydown',facesKey,true);}
function facesKey(e){if(e.key==='Escape'){e.stopPropagation();closeFaces();}}
function facesDraw(){const ov=$('#faces');if(!ov)return;const here=new Set(online().map(p=>sfKey(p.name)));
  const L=selfies().slice().sort((a,b)=>(here.has(b.id)-here.has(a.id))||a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));
  ov.innerHTML=`<div class="fchead"><div><span class="lab">Only for you · close it before you share your screen</span><h1>Faces</h1></div>
      <p class="fine">Students add a selfie from their phone (it’s optional). They stay in this browser on this computer and are never shown to the class.</p>
      <div class="frow"><button class="ghost${SF.quiz?' on':''}" id="fcQuiz">${SF.quiz?'Show the names':'Quiz me'}</button><button class="ghost" id="fcClose">Close <small>ESC</small></button></div></div>
    ${L.length?`<div class="fcgrid">${L.map(c=>`<figure class="fc${here.has(c.id)?' here':''}" data-id="${esc(c.id)}"><img src="${sfURL(c)}" alt=""><figcaption>${SF.quiz?'<i>?</i>':esc(c.name)}</figcaption>${here.has(c.id)?'<span class="fcin">in the room</span>':''}<button class="fcx" title="Delete this selfie" aria-label="Delete ${esc(c.name)}’s selfie">×</button></figure>`).join('')}</div>
      <p class="fine"><button class="ghost" id="fcAll">Delete all selfies</button></p>`
    :'<div class="rvempty"><h2>No faces yet</h2><p>When a student joins for the first time, their phone offers to add a selfie. They can also tap <b>Your selfie</b> on their phone at any time.</p></div>'}`;
  $('#fcClose',ov).onclick=closeFaces;$('#fcQuiz',ov).onclick=()=>{SF.quiz=!SF.quiz;facesDraw();};
  $$('.fc',ov).forEach(f=>f.onclick=e=>{if(e.target.closest('.fcx'))return;if(SF.quiz){const c=selfies().find(x=>x.id===f.dataset.id);const cap=f.querySelector('figcaption');if(c&&cap)cap.textContent=c.name;}});
  $$('.fcx',ov).forEach(b=>b.onclick=async()=>{const f=b.closest('.fc'),c=selfies().find(x=>x.id===f.dataset.id);if(!c||!confirm(`Delete ${c.name}’s selfie?`))return;await clipDB.del(c.id);await loadMyClips();facesDraw();});
  const all=$('#fcAll',ov);if(all)all.onclick=async()=>{if(!confirm('Delete every selfie from this computer?'))return;for(const c of selfies())await clipDB.del(c.id);await loadMyClips();facesDraw();};}

/* ---------- phone ---------- */
// the gentle first offer, once per phone (the idle screen also keeps a small "Your selfie" button)
function selfieOffer(){if(!SELFIES_ON||store.get('selfie.offered',false)||PL.selfieHas!==false||$('#sfOffer'))return;store.set('selfie.offered',true);
  const d=el('div','sfoffer');d.id='sfOffer';d.innerHTML=`<div><b>Help your teachers learn your name</b><span>Add a selfie? Only your teachers see it, on their computer. You can change it later in your notebook.</span></div><button class="ghost" id="sfYes">Add one</button><button class="sfno" id="sfNo" aria-label="Not now">Not now</button>`;
  document.body.appendChild(d);$('#sfYes',d).onclick=()=>{d.remove();selfieEditor();};$('#sfNo',d).onclick=()=>d.remove();}
// take or pick a photo, then frame the face in the square box
function selfieEditor(){const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.setAttribute('capture','user');
  inp.onchange=()=>{const f=inp.files[0];if(!f)return;const img=new Image();img.onload=()=>sfCrop(img);img.onerror=()=>toastP('That photo couldn’t be opened.');img.src=URL.createObjectURL(f);};inp.click();}
function toastP(t){let n=$('#sfToast');if(!n){n=el('div','sftoast');n.id='sfToast';document.body.appendChild(n);}n.textContent=t;n.classList.add('on');clearTimeout(toastP.t);toastP.t=setTimeout(()=>n.classList.remove('on'),3200);}
function sfCrop(img){const ov=el('div','sfov');ov.innerHTML=`<div class="sfcard"><span class="lab">Your selfie · only your teachers see it</span><h2>Fit your face in the box</h2>
    <div class="sfstage" id="sfStage"><canvas id="sfCv"></canvas><i class="sfbox"></i></div>
    <label class="sfzoom">Zoom<input type="range" id="sfZ" min="100" max="400" value="100"></label>
    <p class="fine">Drag to move. Pinch or slide to zoom.</p>
    <div class="sfbtns"><button class="ghost" id="sfAgain">Another photo</button><button class="ghost" id="sfCancel">Cancel</button><button class="big go" id="sfUse">Send it</button></div></div>`;
  document.body.appendChild(ov);
  const cv=$('#sfCv',ov),st=$('#sfStage',ov),ctx=cv.getContext('2d'),Z=$('#sfZ',ov);
  const S=()=>st.clientWidth,base=()=>Math.max(S()/img.width,S()/img.height);   // at zoom 1 the photo just covers the box
  const v={z:1,x:0,y:0};   // x,y: the photo's offset from centred, in stage pixels
  const clampV=()=>{const s=base()*v.z,w=img.width*s,h=img.height*s,mx=Math.max(0,(w-S())/2),my=Math.max(0,(h-S())/2);v.x=Math.max(-mx,Math.min(mx,v.x));v.y=Math.max(-my,Math.min(my,v.y));};
  const draw=()=>{const d=devicePixelRatio||1,s=S();cv.width=s*d;cv.height=s*d;cv.style.width=cv.style.height=s+'px';ctx.setTransform(d,0,0,d,0,0);clampV();
    const k=base()*v.z,w=img.width*k,h=img.height*k;ctx.fillStyle='#111';ctx.fillRect(0,0,s,s);ctx.drawImage(img,(s-w)/2+v.x,(s-h)/2+v.y,w,h);};
  draw();addEventListener('resize',draw);
  const pts=new Map();let last=null;
  st.onpointerdown=e=>{st.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});last=null;};
  st.onpointermove=e=>{if(!pts.has(e.pointerId))return;const p=pts.get(e.pointerId),nx=e.clientX,ny=e.clientY;
    if(pts.size===1){v.x+=nx-p.x;v.y+=ny-p.y;}
    else{const [a,b]=[...pts.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);pts.set(e.pointerId,{x:nx,y:ny});const [c,d]=[...pts.values()],nd=Math.hypot(c.x-d.x,c.y-d.y);
      if(dist>0){v.z=Math.max(1,Math.min(4,v.z*nd/dist));Z.value=Math.round(v.z*100);}draw();return;}
    pts.set(e.pointerId,{x:nx,y:ny});draw();};
  st.onpointerup=st.onpointercancel=e=>pts.delete(e.pointerId);
  Z.oninput=()=>{v.z=Z.value/100;draw();};
  const close=()=>{removeEventListener('resize',draw);ov.remove();};
  $('#sfCancel',ov).onclick=close;$('#sfAgain',ov).onclick=()=>{close();selfieEditor();};
  $('#sfUse',ov).onclick=()=>{const out=document.createElement('canvas');out.width=out.height=SF_PX;const o=out.getContext('2d'),r=SF_PX/S(),k=base()*v.z*r;
    o.fillStyle='#111';o.fillRect(0,0,SF_PX,SF_PX);o.drawImage(img,(SF_PX-img.width*k)/2+v.x*r,(SF_PX-img.height*k)/2+v.y*r,img.width*k,img.height*k);
    let url=out.toDataURL('image/jpeg',.82);if(url.length>60000)url=out.toDataURL('image/jpeg',.6);
    const n=Math.ceil(url.length/SF_PART),send=m=>{if(PL.conn&&PL.conn.open)try{PL.conn.send(m);return true;}catch(e){}return false;};
    let ok=true;for(let i=0;i<n;i++)ok=send({t:'selfie',i,n,d:url.slice(i*SF_PART,(i+1)*SF_PART)})&&ok;
    close();toastP(ok?'Sending your selfie…':'Not connected to the room: try again in a moment.');};}
function selfieOk(){PL.selfieHas=true;store.set('selfie.offered',true);toastP('✓ Sent. Only your teachers see it.');if(typeof pRender==='function')pRender();}
