/* Control Room — content for every game except the Quiz (see quiz-questions.js).
   Everything here is plain data: edit, add or remove entries freely. */

/* ---------- DAW Shortcut Showdown ----------
   [goal, index of correct answer, [A,B,C,D]]. Mac default key commands
   (FL Studio uses Ctrl on Windows, ⌘ on Mac). Versions differ — check against yours. */
window.SHORTCUTS={
  live:{name:'Ableton Live',qs:[
    ['Consolidate the selection into one new clip',0,['⌘J','⌘E','⌘D','⇧⌘J']],
    ['Split a clip at the insert marker',1,['⌘J','⌘E','⌘X','⌘T']],
    ['Switch between Session and Arrangement view',2,['⌘Tab','⇧Tab','Tab','⌥Tab']],
    ['Group the selected tracks',0,['⌘G','⇧⌘G','⌘T','⌥⌘G']],
    ['Insert a new MIDI track',1,['⌘T','⇧⌘T','⌥⌘T','⌘M']],
    ['Insert a new audio track',0,['⌘T','⇧⌘T','⌥⌘T','⌘A']],
    ['Insert a return track',2,['⇧⌘R','⌘R','⌥⌘T','⇧⌘T']],
    ['Toggle Draw Mode',3,['D','P','⌘D','B']],
    ['Quantize the selection',2,['⌘Q','Q','⌘U','⇧⌘Q']],
    ['Loop the selection',0,['⌘L','L','⇧⌘L','⌥L']],
    ['Capture MIDI you just played without recording',1,['⌘C','⇧⌘C','⌥⌘C','⇧⌘R']],
    ['Enter MIDI Map mode',0,['⌘M','⌘K','⇧⌘M','M']],
    ['Show or hide the Browser',2,['⌘B','⇧⌘B','⌥⌘B','B']],
    ['Start recording in the Arrangement',3,['R','⌘R','F12','F9']],
    ['Switch the bottom panel between Clip and Device view',1,['Tab','⇧Tab','⌥Tab','⌘Tab']],
  ]},
  logic:{name:'Logic Pro',qs:[
    ['Start recording',0,['R','⌘R','*','F9']],
    ['Turn Cycle on or off',1,['L','C','⌘L','⌥C']],
    ['Open the Mixer',2,['M','⌘M','X','⌥X']],
    ['Open the Piano Roll',0,['P','E','⌘P','⌥P']],
    ['Split regions at the playhead',3,['⌘S','⌘X','⌘E','⌘T']],
    ['Join the selected regions',1,['⌘G','⌘J','⇧⌘J','J']],
    ['Bounce a track in place',2,['⌘B','⇧⌘B','⌃B','⌥B']],
    ['Show or hide automation',0,['A','⌘A','⌥A','U']],
    ['Turn the metronome on or off',1,['M','K','⌘K','C']],
    ['Show or hide Smart Controls',3,['S','⌘S','I','B']],
    ['Open the New Tracks dialog',2,['⌘N','⇧⌘N','⌥⌘N','⌘T']],
    ['Open Musical Typing',0,['⌘K','K','⌥K','⇧⌘K']],
    ['Create a track stack from the selected tracks',1,['⌘G','⇧⌘D','⌥⌘S','⇧⌘S']],
    ['Show or hide the Library',3,['L','⌘L','B','Y']],
    ['Show or hide the Inspector',0,['I','⌘I','⌥I','N']],
  ]},
  protools:{name:'Pro Tools',qs:[
    ['Consolidate a clip',0,['⌥⇧3','⌘J','⇧⌘C','⌥C']],
    ['Separate a clip at the selection',1,['⌘X','⌘E','⌘T','⌘B']],
    ['Heal a separation',2,['⌘J','⇧⌘H','⌘H','⌥H']],
    ['Switch to Slip mode',1,['F1','F2','F3','F4']],
    ['Switch to Grid mode',3,['F1','F2','F3','F4']],
    ['Toggle between the Mix and Edit windows',0,['⌘=','⌘M','⌘E','Tab']],
    ['Open the New Tracks dialog',2,['⌘N','⌘T','⇧⌘N','⌥⌘N']],
    ['Select the Trim tool',1,['F5','F6','F7','F8']],
    ['Select the Pencil tool',3,['F7','F8','F9','F10']],
    ['Bounce the mix',2,['⌘B','⇧⌘B','⌥⌘B','⌃B']],
    ['Strip Silence',0,['⌘U','⌘S','⇧⌘S','⌥S']],
    ['Open the Fades dialog',1,['⌘D','⌘F','⇧⌘F','F']],
    ['Repeat the selection',2,['⌘D','⌘R','⌥R','⇧R']],
    ['Toggle Loop Playback',3,['L','⌘L','⌥L','⇧⌘L']],
    ['Start recording',0,['⌘Space','R','F9','⇧Space']],
  ]},
  fl:{name:'FL Studio',qs:[
    ['Open the Playlist',0,['F5','F6','F7','F9']],
    ['Open the Channel Rack',1,['F5','F6','F7','F9']],
    ['Open the Piano Roll',2,['F5','F6','F7','F9']],
    ['Open the Mixer',3,['F5','F6','F7','F9']],
    ['Open the Plugin Picker',1,['F6','F8','F10','F11']],
    ['Show or hide the Browser',0,['Alt+F8','F8','Ctrl+B','Alt+B']],
    ['Switch between Pattern and Song mode',2,['P','S','L','M']],
    ['Export a WAV',1,['Ctrl+E','Ctrl+R','Ctrl+W','Ctrl+Shift+E']],
    ['Quick-quantize in the Piano Roll',0,['Ctrl+Q','Q','Alt+Q','Ctrl+U']],
    ['Duplicate the selection (Piano Roll / Playlist)',3,['Ctrl+D','Ctrl+C','Shift+D','Ctrl+B']],
    ['Save a new version of the project',2,['Ctrl+S','Ctrl+Shift+S','Ctrl+N','Ctrl+Alt+S']],
    ['Open MIDI settings',1,['F9','F10','F11','F12']],
  ]},
  any:{name:'Any DAW',qs:[
    ['Play / stop in almost every DAW',0,['Space','Enter','P','⌘P']],
    ['Undo the last action',1,['⌘U','⌘Z','⌘Y','⌥Z']],
    ['Redo (in most Mac DAWs)',2,['⌘R','⌥⌘Z','⇧⌘Z','⌘Y']],
    ['Save the project',3,['⌘P','⇧⌘S','⌥S','⌘S']],
    ['Select everything',0,['⌘A','⌘E','⇧A','⌥A']],
  ]},
};

/* ---------- Preset Archeologist ----------
   src: a real recording (audio/presets/); kit: real one-shots played in a groove;
   neither: recreated in the browser by js/audio.js MACHINES. credit: shown on the reveal. */
window.PRESETS=[
  {id:'tr808',name:'Roland TR-808',year:1980,what:'Kick, clap, hats and cowbell',fact:'Its booming kick and cowbell flopped at first — then built hip-hop, Miami bass and trap.',
   kit:{bd:'audio/presets/808-bd5075.wav',cp:'audio/presets/808-cp.wav',cb:'audio/presets/808-cb.wav',ch:'audio/presets/808-ch.wav',oh:'audio/presets/808-oh25.wav'},
   credit:'Real TR-808 one-shots sampled by Michael Fischer (Technopolis), free sample set'},
  {id:'tr909',name:'Roland TR-909',year:1983,what:'House groove with open hats',fact:'Analog kick, sampled hats: the drum machine of house and techno.'},
  {id:'tb303',name:'Roland TB-303',year:1981,what:'Squelchy acid bassline',fact:'Sold as a bass accompanist, rescued from bargain bins to invent acid house.',
   src:'audio/presets/tb303.mp3',credit:'“The Sound of Roland TB-303 for Wikipedia” by I speak so quietly, Wikimedia Commons, CC BY-SA 4.0 (excerpt)'},
  {id:'dx7',name:'Yamaha DX7',year:1983,what:'FM electric piano chords',fact:'Its FM electric piano preset is on a staggering number of 80s ballads.'},
  {id:'minimoog',name:'Minimoog Model D',year:1970,what:'Gliding mono lead',fact:'Three oscillators and the ladder filter — the lead voice of funk, prog and G-funk.'},
  {id:'juno106',name:'Roland Juno-60',year:1982,what:'Swelling PWM string pad',fact:'One oscillator, pulse-width modulation and that famous chorus — the Juno sound, later carried on by the Juno-106.',
   src:'audio/presets/juno60.mp3',credit:'“JUNO-60 PWM Strings” by Raymangold22, Wikimedia Commons, CC0 (excerpt)'},
  {id:'alphajuno',name:'Roland Alpha Juno',year:1985,what:'The rave "Hoover"',fact:'Its "What the" patch became the Hoover sound of early-90s rave.',
   src:'audio/presets/hoover.mp3',credit:'“Juno Hoover What The patch” by Djnebula1, Wikimedia Commons, CC BY-SA 3.0 (excerpt)'},
  {id:'simmons',name:'Simmons SDS-V',year:1981,what:'Electronic tom fill',fact:'Hexagonal pads and pew-pew toms: the sound of the 80s drum fill.'},
];
window.PRESET_DECOYS=['Korg M1','LinnDrum LM-1','Sequential Prophet-5','Mellotron','E-mu SP-1200','Oberheim OB-Xa','Casio CZ-101','Fairlight CMI','Roland TR-606','Korg MS-20','ARP Odyssey','Akai MPC60'];

/* ---------- Ghost Note: 16-step grooves. Lanes: kick snare hat clave bass cowbell clap ---------- */
window.GROOVES=[
  {name:'Tresillo',bpm:96,level:1,lanes:{clave:'x..x..x.x..x..x.'}},
  {name:'Son clave 3–2',bpm:100,level:1,lanes:{clave:'x..x..x...x.x...'}},
  {name:'Rumba clave',bpm:100,level:1,lanes:{clave:'x..x...x..x.x...'}},
  {name:'Bossa clave',bpm:110,level:1,lanes:{clave:'x..x..x...x..x..'}},
  {name:'Syncopated bass',bpm:98,level:1,lanes:{bass:'x..x..x...x.x..x'}},
  {name:'Cowbell funk',bpm:104,level:1,lanes:{cowbell:'x.x..x.x..x.x...'}},
  {name:'Boom bap',bpm:90,level:2,lanes:{kick:'x.........x.x...',snare:'....x.......x...'}},
  {name:'Dembow',bpm:96,level:2,lanes:{kick:'x...x...x...x...',snare:'...x..x....x..x.'}},
  {name:'Half-time trap',bpm:70,level:2,lanes:{kick:'x......x.x......',snare:'........x.......'}},
  {name:'Two-step',bpm:132,level:2,lanes:{kick:'x......x..x.....',snare:'....x.......x...'}},
  {name:'Breakbeat',bpm:100,level:2,lanes:{kick:'x.x.......xx....',snare:'....x..x.x..x..x'}},
  {name:'Funk pocket',bpm:96,level:3,lanes:{kick:'x..x..x...x.....',snare:'....x..x....x...',hat:'x.xxx.x.x.xxx.x.'}},
  {name:'House',bpm:122,level:3,lanes:{kick:'x...x...x...x...',clap:'....x.......x...',hat:'..x...x...x...x.'}},
  {name:'Afrobeat-ish',bpm:104,level:3,lanes:{kick:'x.....x...x.....',snare:'....x.......x..x',hat:'x.xx.xx.x.xx.xx.'}},
];

/* ---------- Frequency Sculptor: problems with a home on the spectrum ---------- */
window.EQ_PROBLEMS=[
  {f:110,name:'Boomy',hint:'a woolly thump that makes the low end bloated'},
  {f:250,name:'Muddy',hint:'thick, cloudy low-mids where everything blurs'},
  {f:450,name:'Boxy',hint:'the cardboard-box sound of a small room'},
  {f:1000,name:'Honky',hint:'a nasal, megaphone-like push in the middle'},
  {f:2000,name:'Tinny / telephone',hint:'a thin, pushy upper-mid edge'},
  {f:3600,name:'Harsh',hint:'the piercing zone your ear is most sensitive to'},
  {f:7000,name:'Sibilant',hint:'spitty S and T sounds, splashy cymbals'},
  {f:11000,name:'Fizzy',hint:'brittle, glassy air on top'},
];

/* ---------- Envelope Sculptor: envelope shapes, seconds (hold = how long the key is held) ---------- */
window.ENVELOPES=[
  {name:'Pluck',a:.002,d:.25,s:0,r:.15,hold:.6},
  {name:'Slow pad swell',a:1.6,d:.6,s:.85,r:1.6,hold:2.2},
  {name:'Organ',a:.005,d:.05,s:1,r:.04,hold:1.1},
  {name:'Brass',a:.12,d:.35,s:.6,r:.3,hold:1.2},
  {name:'Bowed string',a:.55,d:.3,s:.9,r:.8,hold:1.6},
  {name:'808 long decay',a:.002,d:1.9,s:0,r:1.9,hold:2.1},
  {name:'Stab',a:.002,d:.12,s:.22,r:.08,hold:.4},
  {name:'Reverse swell',a:1.2,d:.01,s:1,r:.02,hold:1.25},
  {name:'Soft keys',a:.02,d:.8,s:.3,r:.5,hold:1.0},
  {name:'Gated hit',a:.002,d:.02,s:1,r:.01,hold:.45},
];

/* ---------- Translation Grid: concept ↔ picture (v: drawn in js/games-brain.js) or ↔ analogy (a) ---------- */
window.TRANSLATE=[
  {c:'Low-pass filter',v:'lowpass',a:'Music from the club next door: you hear the thump, never the cymbals'},
  {c:'High-pass filter',v:'highpass',a:'A laptop speaker playing a bass-heavy track: all click, no boom'},
  {c:'Bell boost',v:'bell',a:'A spotlight that makes one singer in the choir stand out'},
  {c:'Notch filter',v:'notch',a:'Plucking one hair out with tweezers and leaving the rest'},
  {c:'Phase cancellation',v:'phase',a:'Two identical waves meet exactly out of step and the water goes flat'},
  {c:'Soft clipping',v:'softclip',a:'A pillow on the ceiling: you hit it, but it squashes gently'},
  {c:'Hard clipping',v:'hardclip',a:'A guillotine slicing the top off every wave'},
  {c:'Sidechain ducking',v:'duck',a:'The whole room goes quiet every time the kick drum speaks'},
  {c:'Compression',v:'comp',a:'A friend who pulls you back when you shout and nudges you when you mumble'},
  {c:'Limiter',v:'limit',a:'A height barrier at a car park: nothing taller gets through, no matter what'},
  {c:'Noise gate',v:'gate',a:'A door that only opens when someone knocks loud enough'},
  {c:'Comb filtering',v:'comb',a:'Two speakers a little out of time, scooping regular holes in the sound'},
  {c:'Bitcrushing',v:'crush',a:'Zooming into a photo until it turns into blocky pixels'},
  {c:'Delay',v:'delay',a:'Shouting into a canyon and hearing yourself come back'},
  {c:'Reverb',v:'reverb',a:'Clapping once in an empty church and hearing it hang in the air'},
  {c:'Pre-delay',v:'predelay',a:'The tiny gap between the flash and the thunder'},
  {c:'Tremolo',v:'tremolo',a:'A helicopter passing: the volume throbs in and out'},
  {c:'Vibrato',v:'vibrato',a:'An opera singer holding a note that wavers up and down in pitch'},
  {c:'Mono',v:'mono',a:'Every instrument standing in a single spotlight, dead centre'},
  {c:'Wide stereo',v:'wide',a:'Musicians spread out from wall to wall around you'},
  {c:'Swing',v:'swing',a:'Skipping instead of walking: long, short, long, short'},
  {c:'Pluck envelope',v:'pluckenv',a:'Snapping a rubber band: instant hit, gone a moment later'},
  {c:'Pad envelope',v:'padenv',a:'Sunrise: fades in slowly, lingers, fades out slowly'},
  {c:'Square wave',v:'square',a:'A light switch: fully on, fully off, nothing in between'},
  {c:'Sine wave',v:'sine',a:'A pendulum swinging smoothly back and forth'},
  {c:'Sawtooth wave',v:'saw',a:'A ramp up, then a drop off a cliff, over and over'},
];

/* ---------- Attendance: the class Google Sheet's Apps Script web app ("Class Attendance System").
   The host lists its classes; phones pick their name from the chosen class and are checked in
   on the sheet's MasterLog. Set url to '' to switch the class list off. ---------- */
window.ATTENDANCE={url:'https://script.google.com/macros/s/AKfycbyf7HfaXossjes5l4Fz569eXIYkwx5NmLrOsX444GUlIUHNfqI5RWcsDar_WLf1Jhof/exec'};

/* ---------- Sample Chronologist: real recordings by decade (audio/eras, credits in CREDITS.txt) ----------
   clips are filled in below; decades with none use the teacher's own clips or the browser re-creation. */
window.ERA_DECADES={
  1900:{label:'1900s',tells:'Acoustic horn recording: no microphones, the band played into a big horn. Only a thin midrange, heavy surface hiss, no bass, almost no drums.',clips:[]},
  1910:{label:'1910s',tells:'Still acoustic, but louder and cleaner discs: brass, banjo and tuba cut through the horn best, and the first jazz records appear. Thin, boxy and crackly.',clips:[]},
  1920:{label:'1920s',tells:'Electrical recording arrives in 1925: microphones and amplifiers bring more bass and treble. Blues and hot jazz on 78s, still mono with surface noise.',clips:[]},
  1930:{label:'1930s',tells:'The swing era on 78s: smoother microphones, an audible upright bass, crooners singing close to the mic. Warmer and fuller than the 1920s, still mono.',clips:[]},
  1940:{label:'1940s',tells:'Late 78s and wartime V-Discs: clearer and fuller big bands and small groups. Magnetic tape reaches studios after the war. Mono, little reverb.',clips:[]},
  1950:{label:'1950s',tells:'Magnetic tape: slapback echo, close-miked voice, twangy guitar, rock ’n’ roll and country. Cleaner, but still mono and midrange-heavy.',clips:[]},
  1960:{label:'1960s',tells:'Multitrack tape and early stereo: drums hard left or right, plate and chamber reverb, tape saturation, tambourine everywhere.',clips:[]},
  1970:{label:'1970s',tells:'Warm 24-track tape: dry close-miked drums, disco four-on-the-floor, string machines, wide but natural stereo.',clips:[]},
  1980:{label:'1980s',tells:'Digital reverbs and drum machines: a gated snare, FM bass and bells, glossy chorus, a very bright top end.',clips:[]},
  1990:{label:'1990s',tells:'Samplers and the CD: dusty 12-bit loops, boom-bap swing, grunge guitars, louder and louder masters.',clips:[]},
  2000:{label:'2000s',tells:'The DAW era: full bandwidth, dead-silent digital background, laptop electronica, and the loudness war of brick-walled masters.',clips:[]},
  2010:{label:'2010s',tells:'EDM and streaming: huge sub bass, sidechain pumping, dubstep wobbles and supersaws, ultra-wide stereo, very loud masters.',clips:[]},
  2020:{label:'2020s',tells:'Bedroom production for streaming: slap house, cloud rap and lo-fi; sliding 808s, crisp hats, and vinyl crackle added on purpose.',clips:[]},
};
/*CLIPS*/
window.ERA_DECADES[1900].clips=[{"src": "audio/eras/1900-billy-murray-you-re-a-grand-old-flag-ogg.mp3", "title": "Billy Murray – You’re a Grand Old Flag (1906)", "credit": "Billy Murray – “You’re a Grand Old Flag” (1906) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1900-ada-jones-and-billy-murray-shine-on-harv.mp3", "title": "Ada Jones & Billy Murray – Shine On, Harvest Moon (1909)", "credit": "Ada Jones & Billy Murray – “Shine On, Harvest Moon” (1909) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1900-tom-turpin-vess-l-ossman-the-buffalo-rag.mp3", "title": "Vess L. Ossman – The Buffalo Rag (1906)", "credit": "Vess L. Ossman – “The Buffalo Rag” (1906) · Public domain · Wikimedia Commons"}];
window.ERA_DECADES[1910].clips=[{"src": "audio/eras/1910-arthur-collins-and-byron-harlan-alexande.mp3", "title": "Arthur Collins & Byron Harlan – Alexander’s Ragtime Band (1911)", "credit": "Arthur Collins & Byron Harlan – “Alexander’s Ragtime Band” (1911) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1910-at-the-jazz-band-ball-1918-sound-recordi.mp3", "title": "Original Dixieland Jass Band – At the Jazz Band Ball (1918)", "credit": "Original Dixieland Jass Band – “At the Jazz Band Ball” (1918) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1910-billy-murray-k-k-k-katy-ogg.mp3", "title": "Billy Murray – K-K-K-Katy (1918)", "credit": "Billy Murray – “K-K-K-Katy” (1918) · Public domain · Wikimedia Commons"}];
window.ERA_DECADES[1920].clips=[{"src": "audio/eras/1920-mamie-smith-crazy-blues-ogg.mp3", "title": "Mamie Smith & Her Jazz Hounds – Crazy Blues (1920)", "credit": "Mamie Smith & Her Jazz Hounds – “Crazy Blues” (1920) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1920-king-oliver-s-creole-jazz-band-krooked-b.mp3", "title": "King Oliver’s Creole Jazz Band – Krooked Blues (1923)", "credit": "King Oliver’s Creole Jazz Band – “Krooked Blues” (1923) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1920-bessie-smith-and-louis-armstrong-the-st-.mp3", "title": "Bessie Smith & Louis Armstrong – St. Louis Blues (1925)", "credit": "Bessie Smith & Louis Armstrong – “St. Louis Blues” (1925) · Public domain · Wikimedia Commons"}];
window.ERA_DECADES[1930].clips=[{"src": "audio/eras/1930-anchors-aweigh-paul-tremaine-orchestra-1.mp3", "title": "Paul Tremaine Orchestra – Anchors Aweigh (1930)", "credit": "Paul Tremaine Orchestra – “Anchors Aweigh” (1930) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1930-philharrisorch-thevamp1932-ogg.mp3", "title": "Phil Harris Orchestra – The Vamp (1932)", "credit": "Phil Harris Orchestra – “The Vamp” (1932) · CC0 · Wikimedia Commons"}, {"src": "audio/eras/1930-autopsy-on-schubert-by-larry-wagner-1937.mp3", "title": "Larry Wagner – Autopsy on Schubert (1937)", "credit": "Larry Wagner – “Autopsy on Schubert” (1937) · Public domain · Wikimedia Commons"}];
window.ERA_DECADES[1940].clips=[{"src": "audio/eras/1940-intrigas-no-boteco-do-padilha-luis-ameri.mp3", "title": "Luis Americano – Intrigas no Boteco do Padilha (1940)", "credit": "Luis Americano – “Intrigas no Boteco do Padilha” (1940) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1940-v-disc-1944-duckworth-chant-ogg.mp3", "title": "V-Disc – Duckworth Chant (1944)", "credit": "V-Disc – “Duckworth Chant” (1944) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1940-smoke-on-the-water-1944-flac.mp3", "title": "Red Foley – Smoke on the Water (1944)", "credit": "Red Foley – “Smoke on the Water” (1944) · Public domain · Wikimedia Commons"}];
window.ERA_DECADES[1950].clips=[{"src": "audio/eras/1950-johnny-cash-new-mexico-oga.mp3", "title": "Johnny Cash – New Mexico (1955)", "credit": "Johnny Cash – “New Mexico” (1955) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1950-george-jones-sings-i-m-ragged-but-i-m-ri.mp3", "title": "George Jones – I’m Ragged But I’m Right (1958)", "credit": "George Jones – “I’m Ragged But I’m Right” (1958) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/1950-terry-buter-c-h-r-i-s-t-m-a-s-ogg.mp3", "title": "Terry Buter – C-H-R-I-S-T-M-A-S (1956)", "credit": "Terry Buter – “C-H-R-I-S-T-M-A-S” (1956) · Public domain · Wikimedia Commons"}];
window.ERA_DECADES[2000].clips=[{"src": "audio/eras/2000-cadillac-max-impact-united-states-air-fo.mp3", "title": "US Air Force Band, Max Impact – Cadillac (2008)", "credit": "US Air Force Band, Max Impact – “Cadillac” (2008) · Public domain · Wikimedia Commons"}, {"src": "audio/eras/2000-c418-mixes-03-incredibly-detailed-acid-t.mp3", "title": "C418 – Incredibly Detailed Acid Trip (2008)", "credit": "C418 – “Incredibly Detailed Acid Trip” (2008) · CC BY 3.0 · Wikimedia Commons"}, {"src": "audio/eras/2000-c418-bushes-and-marshmallows-05-i-believ.mp3", "title": "C418 – I Believe I Can Fly (2009)", "credit": "C418 – “I Believe I Can Fly” (2009) · CC BY 3.0 · Wikimedia Commons"}];
window.ERA_DECADES[2010].clips=[{"src": "audio/eras/2010-skwrl-dubstep-violin-rework-ogg.mp3", "title": "skwrl – Dubstep Violin Rework (2013)", "credit": "skwrl – “Dubstep Violin Rework” (2013) · CC BY 3.0 · Wikimedia Commons"}, {"src": "audio/eras/2010-kirill-t-the-radiance-of-the-black-sun-d.mp3", "title": "Kirill-T – The Radiance of the Black Sun (2017)", "credit": "Kirill-T – “The Radiance of the Black Sun” (2017) · CC BY 3.0 · Wikimedia Commons"}, {"src": "audio/eras/2010-sappheiros-reminiscence-chillstep-opus.mp3", "title": "Sappheiros – Reminiscence (2016)", "credit": "Sappheiros – “Reminiscence” (2016) · CC BY 4.0 · Wikimedia Commons"}];
window.ERA_DECADES[2020].clips=[{"src": "audio/eras/2020-soulker-memories-cloud-rap-instrumental-.mp3", "title": "Soulker – Memories (2021)", "credit": "Soulker – “Memories” (2021) · CC BY-SA 3.0 · Wikimedia Commons"}, {"src": "audio/eras/2020-i-need-u-deep-house-instrumental-vocal-d.mp3", "title": "OA beats – I Need U (2021)", "credit": "OA beats – “I Need U” (2021) · CC BY-SA 3.0 · Wikimedia Commons"}, {"src": "audio/eras/2020-raspberrymusic-lofi-hip-hop-upbeat-ogg.mp3", "title": "Raspberrymusic – Lofi Hip Hop Upbeat (2021)", "credit": "Raspberrymusic – “Lofi Hip Hop Upbeat” (2021) · CC BY 4.0 · Wikimedia Commons"}];
/*END CLIPS*/

/* ---------- Constraint Generator reels ---------- */
window.CONSTRAINTS={
  tool:['Only stock plugins','Three audio tracks, maximum','Zero MIDI allowed','One synth, one effect','No EQ at all','Only plugins you’ve never used','No reverb — make space another way','Everything through one saturator','Mono until the very last minute','No quantize, play it all in','Only the arrangement view, no loops','One sampler, one sample','No drum machine — make the drums','Only automation for movement','Faders only: no plugins on channels','No presets: start every sound from init'],
  source:['Record your own voice for every sound','Only sounds made in this room','One found object, sampled ten ways','A field recording from outside','Your phone’s built-in microphone only','The first sample in your library','Kitchen utensils','Body percussion only','A single piano note','Recordings of your keyboard and mouse','Only noise — shape it into everything','Someone else’s voice memo','Glass and water','A door, opened and closed','Your own whistling','Paper: tear it, crumple it, flick it'],
  structure:['No looping: everything linear','Exactly 60 seconds long','It must get slower every section','Start with the ending','No drums until the halfway point','Every section is a different key','One sound enters every 8 bars','Silence in the exact middle','The drop is just one sound','Two halves that mirror each other','No repeated bar, ever','The hook appears only once','Build the whole track from 4 bars','A false ending before the real one','Nothing louder than the intro','Three tempos, one track'],
};

/* ---------- Genre Cross-Pollinator reels ---------- */
window.GENRES={
  a:['1950s doo-wop','Baroque harpsichord','Delta blues','Bossa nova','Motown soul','Krautrock','Disco','Dub reggae','Synth-pop','Detroit techno','Shoegaze','Boom-bap hip-hop','Drum & bass','Gregorian chant','Bluegrass','Surf rock','Gamelan','Flamenco','Polka','Barbershop quartet','Lo-fi hip-hop','Icelandic folk','Afrobeat','Film noir jazz'],
  b:['Cyberpunk industrial techno','Hyperpop','Drill','Vaporwave','Dubstep','Ambient drone','Trap','Footwork','Death metal','Reggaeton','UK garage','Hardstyle','Glitch','Grime','Phonk','Jersey club','Amapiano','Minimal techno','Math rock','Witch house','Synthwave','Breakcore','Musique concrète','Big room EDM'],
  tempo:['60 BPM','74 BPM','90 BPM','100 BPM','120 BPM','128 BPM','140 BPM','160 BPM','174 BPM','Free time, no grid'],
  setting:['for a car chase','at a funeral that turns into a party','in an underwater nightclub','for a robot learning to love','at 4am in a laundromat','for a video-game boss fight','in a cathedral made of ice','for a sunrise on Mars','at a wedding on a spaceship','for a horror film’s kitchen scene'],
  ingredient:['a kazoo','a vocoder','a choir','a cowbell','one live instrument','a field recording','a reversed piano','a dial tone','a key change','a 5/4 bar','a sub drop','a whistle'],
};

/* ---------- Destructive Remix: sabotage rules by severity ---------- */
/* Soundabout Roundabout: prompt cards by kind. Each card is used once before any repeats (tracked per browser). */
window.ROUNDABOUT={"Sound hunt": ["Record a sound in this room that nobody has noticed today, and make it the lead instrument.","Turn a zipper, a pen click or a key ring into the hi-hat.","Hum the bassline into your phone and let that recording be the bass.","Find the most beautiful sound hiding inside a preset you would never normally choose.","Sample one word from a voice memo and play it as a melody.","Tap a rhythm on your desk, record it, and replace one drum with it.","Make a pad out of a single breath, stretched as long as you can.","Record a glass, a bottle or a mug and tune it into the key of the track.","Use a sound from the first ten seconds of the project as the snare.","Whistle a counter-melody and keep every imperfection.","Make a kick drum out of something that is not a drum at all.","Record the room tone, the “silence” here, and fade it in under everything.","Find a sound in your library with a funny name and give it a starring role.","Make a new instrument by layering two sounds that have never met.","Sample your own laugh and hide it somewhere musical.","Turn the click of your mouse or trackpad into a percussion loop.","Pitch a noise sweep until it sings a note, then use it as a riser.","Record yourself saying the name of the track and chop it into a rhythm.","Use only sounds that could exist in a kitchen for the next layer.","Find a field recording you love and let one moment of it start a section.","Turn the reverb tail of one sound into a whole new pad.","Record a sound outside the window, or just outside the door, and place it right on the downbeat.","Make the bass from a sine wave you shape entirely with one envelope.","Ask your neighbour to make one sound with their mouth, record it and use it.","Resample the loudest moment of the track and play it on a keyboard.","Pick a sound you dislike and process it until you secretly like it.","Use paper (tearing, folding, flicking) for one full percussion layer.","Find a sound that feels “orange” and add it.","Bring back the first sound of the project in a completely new disguise.","Record one note on a real instrument, any instrument, and build a chord from copies of it."],"Shape the song": ["Give the track a two-bar intro that tells us exactly what is coming.","Add a moment where everything stops for one beat, then crashes back in.","Write a section that only appears once and never returns.","Turn the strongest four bars into the chorus and build the way into it.","Make the ending surprising, then make it feel inevitable.","Add a breakdown where only two sounds are allowed to play.","Create a false ending: stop, wait, then come back better.","Make the second half answer a question the first half asked.","Build a slow eight-bar lift that rewards the listener at the top.","Copy one section, then change exactly one thing in the copy.","Find the moment that feels like a door opening and add a sound there.","Write a bridge that feels like a different room in the same house.","Start the track with its most interesting sound instead of its loudest.","Make the drop smaller than expected and make that the point.","Add a pickup into the next section: a fill, a riser, a vocal shout.","Give every section a name and add one sound that matches each name.","Make the outro a slowed, softer memory of the intro.","Introduce one new element every four bars for the next sixteen.","Take something away every four bars until only the heartbeat remains.","Put the hook somewhere nobody expects it, then repeat it where they do.","Add a 30-second interlude that could be its own tiny song.","Make the track loop seamlessly so the end flows back into the start.","Draw the energy of the song as a line, then make the arrangement follow it.","Add a moment of total surprise exactly in the middle.","Rebuild the chorus with completely different sounds but the same notes.","Mark the golden ratio point of the track (about 62 % through) and put the big moment there.","Make the verse leave space for a voice, even if no one ever sings it.","Let one instrument tell a story from the start to the end of the track.","Turn a mistake you find in the project into a feature that repeats.","Make the last chorus feel like the first one, but finally answered."],"Texture & space": ["Place every sound somewhere different in the stereo field, like musicians on a stage.","Make one sound feel very close, like a whisper, and one very far away.","Put the whole track in a tiny room, then open the doors for the chorus.","Add a texture you can feel more than hear.","Make it sound like the track is being played from another room, then walk in.","Give the track weather: rain, wind, a storm or sunshine, through sound alone.","Add one long echo that becomes part of the rhythm.","Make a section sound like an old radio, then bloom into full colour.","Fill the empty frequencies with something soft and glowing.","Automate a filter so the track seems to breathe in and out.","Make one sound grow from mono into wide stereo.","Turn the reverb into an instrument: freeze it, chop it, play it.","Give the drums a different space from everything else.","Add a layer of gentle grit: tape, vinyl or saturation, just enough to feel warm.","Make the quietest moment the most detailed one.","Use delay throws to make one word or note echo off into the distance.","Create a moment of underwater sound, then come up for air.","Make the chorus feel twice as wide without adding a single new sound.","Add movement to a still sound: panning, tremolo or slow modulation.","Let one sound slowly fall apart into noise across the section.","Make the track glitter: add three tiny high sounds that sparkle.","Dress the bass in a new texture without changing its notes.","Give the intro a different acoustic, as if it is a memory.","Make the track feel like it is spinning around the listener.","Turn the volume of the background down and the character up.","Add a shimmering sound that only appears on the last beat of each bar.","Blur one section with reverb until it feels like a dream, then snap back into focus.","Let silence be a texture: carve three short gaps that feel intentional.","Make the whole mix sound like it is lit by candlelight.","Pick one sound and give it a spotlight: everything else steps back."],"Rhythm games": ["Add a rhythm that only lands on the off-beats.","Give the groove a little swing and see what wakes up.","Write a percussion part that plays in groups of three over the four.","Make the hi-hats tell a story: busy, calm, busy, gone.","Add a shaker or tambourine part that changes every eight bars.","Shift one loop by a sixteenth note and keep the happy accident.","Build a groove using only five hits per bar, total.","Let the kick drum skip one beat somewhere unexpected.","Add a fill that tumbles down into the next section.","Make the drums half time for a section, then double back.","Program a rhythm by tapping it in live, no grid allowed.","Add ghost notes: quiet hits that make the groove feel human.","Make the bass and kick a perfect team: they hit together or answer each other.","Write a rhythm inspired by your walking speed.","Add a polyrhythm: one loop in 3, one in 4, same downbeat.","Give every bar a different snare sound.","Make the groove feel like it is leaning forward, pushing ahead of the beat.","Create a stutter edit on one moment and make it a signature.","Replace the hi-hats with a melodic instrument playing the same rhythm.","Write a rhythm you can clap, then teach it to the track.","Use the same rhythm for drums, bass and chords for four bars.","Make a beat that would make a robot dance and a human smile.","Add a call-and-response between two percussion sounds.","Let the tempo breathe: a tiny slow-down before the drop.","Build a groove where the most important sound is the gap.","Add a rhythm borrowed from a language: say a sentence, copy its rhythm.","Make the drums sound like they are played by someone very excited.","Hide a Morse-code message in a percussion part.","Make the rhythm feel like a heartbeat speeding up.","Write one bar of drums so good it could loop forever."],"Notes & chords": ["Add a melody that uses only three notes and still sings.","Change one chord into a surprise chord and keep it.","Write a bassline that walks somewhere instead of standing still.","Add a high melody that answers the main one, like a conversation.","Turn the chords upside down: same notes, new voicing.","Add a key change for the final section, up or down.","Write a hook you could whistle on the way home.","Add a drone note under everything and let the chords move over it.","Make a melody that goes up when the energy goes up.","Replace one major chord with minor, or the other way around.","Add arpeggios that turn the chords into motion.","Write a melody that starts on the off-beat.","Add a counter-melody that only enters the second time around.","Find one note that is “wrong” and make it the best note in the track.","Make the chords simpler and the sounds more interesting.","Add a melody built from the notes of the track’s title (A to G letters only).","Write a bassline with one long held note that changes the mood.","Pitch one element down an octave and see what it becomes.","Make the melody sad in the verse and brave in the chorus, same notes.","Add a harmony line a third above the main melody.","Give the track a signature interval: a big jump that keeps returning.","Write a melody using only the black keys.","Let the melody rest for two bars and let the chords do the talking.","Add a melodic riff that repeats while the chords change underneath.","Turn the bass into the melody for one section.","Add a chord that sounds like the sun coming out.","Write a tune a five-year-old could sing and a jazz musician would respect.","Use a scale you rarely use for one new part.","Make two melodies cross over each other like dancers.","Hum something new over the track, then play exactly what you hummed."],"Tell a story": ["Make the track sound like the opening scene of a film. What happens next?","Give the song a main character and add their theme.","Make it sound like midnight in a city that never sleeps.","Turn the track into a road trip: departure, journey, arrival.","Score the moment a spaceship lands somewhere friendly.","Make the track feel like a secret being told.","Add a sound that represents the weather in your mood today.","Make it the soundtrack to a video game level. Which world is it?","Write the music for the last day of summer.","Imagine the track is a place. Add one sound that lives there.","Make the track feel like waking up slowly on a Sunday.","Turn it into a chase scene for thirty seconds.","Make the track sound like a postcard from somewhere you have never been.","Give the track a plot twist halfway through.","Score a tiny animal on a big adventure.","Make it feel like the lights just came on at the end of a party.","Add the sound of a door, a phone or footsteps to start a new chapter.","Make the track sound like a memory of the track.","Turn it into the theme tune of a show that does not exist yet. What is the show?","Make it sound like the ocean has an opinion.","Write the music for a robot learning to feel something.","Make it sound like a festival heard from a mountain far away.","Add the sound of the next morning to the very end.","Make it feel like flying low over fields at sunset.","Turn the track into a lullaby for a dragon.","Make the track sound like a city waking up at dawn.","Score a slow-motion moment in a sports final.","Make the track sound like falling in love with a sound.","Give the music a villain, and let the hero win in the end.","Make it the soundtrack to the moment you open a mysterious box."],"Playful rules": ["For the next part, you may only use one plugin. Choose it like a superpower.","Everything new you add must be exactly eight bars long.","Use only presets that start with the first letter of your name.","Make every new sound at least slightly out of tune, on purpose.","Work with your eyes closed for two minutes: ears only.","Use only stock plugins, and make it sound expensive.","Every new note must be played in live, no drawing allowed.","Turn one knob as far as it goes and leave it there.","Pick a colour and only choose sounds that feel like that colour.","Make one thing sound tiny and one thing sound enormous.","You may add three things only. Make them count.","Copy one idea from the person on your left’s screen.","Use the strangest preset on your computer for something important.","Every sound you add must move: no static parameters allowed.","Make the new part sound like a different decade, then blend it in.","Hide something only you will notice. Tell nobody.","Give the track a new title and change one thing to match it.","Add a sound that makes the person next to you smile.","Use exactly one effect, but automate it ten times.","Make something the loudest you can, then make it the quietest you can.","Play your new part with one finger only.","Use a random number from 1 to 8: that is how many tracks you may touch.","Turn the tempo up or down by exactly 7 BPM and make it work.","Pick a genre at random and steal one trick from it.","Spend the first minute only listening, no clicking.","Make a sound that would scare a cat and a sound that would calm it.","Choose one track and give it a nickname. Make it live up to the name.","Everything you add has to begin quiet and end loud.","Find a setting you have never touched and turn it into your favourite.","Imagine you have one minute left. What is the most important thing to add?"],"Pass it on": ["Find the best idea the last person had and make it twice as good.","Leave a little gift for the next person: an empty space they can fill.","Add something that finishes the last person’s musical sentence.","Turn the last person’s newest sound into the main theme.","Find something the last person might have missed and give it a moment.","Write the next person a hint inside the project: a track named with a tip.","Keep everything you found, but give it a brand-new beginning.","Respond to the last section like you are replying to a message.","Make the track a little more like you without erasing anyone else.","Find the most fragile sound in the project and protect it.","Take the last person’s idea in the opposite direction for eight bars.","Add something that would make the first person of this project proud.","Turn two unrelated parts from different people into a duet.","Clean up one messy corner of the project and make it shine.","Add a bridge between the last two people’s ideas.","Name the strongest moment so far and build towards it.","Find a sound the last person muted and give it a second chance.","Add one thing that ties the whole project together.","Leave the next person a cliffhanger.","Add the part you think is missing, the one everyone has been waiting for.","Make the project easier to work on: label, colour and group the tracks.","Add a moment of calm before the next person takes over.","Find a loop that has been repeating too long and give it a new life.","Take one sound from the start and one from the end and make them meet.","Add a twist the last person would never have expected, but would love.","Make the project sound finished, then leave one door open.","Ask: what does this track want? Give it exactly that.","Bring the track to its best four bars and loop them for the next person.","Add something that feels like a high five.","Write a tiny note for the next person on your phone and show it to them."]};

/* ---------- Remix Relay: an optional twist for each leg ---------- */

/* ---------- Metaphor Translation: scenes. `art` is drawn in js/games-make.js;
   `src` can point to a real photo instead (e.g. 'images/garage.jpg'). ---------- */
window.SCENES=[
  {title:'A brutalist concrete parking garage at night',art:'garage'},
  {title:'An overgrown 1970s greenhouse',art:'greenhouse'},
  {title:'A blurry neon sign in the rain',art:'neon'},
  {title:'A macro shot of melting ice',art:'ice'},
  {title:'A desert highway at noon',art:'desert'},
  {title:'Fog rolling over a power station',art:'fog'},
  {title:'An abandoned swimming pool',art:'pool'},
  {title:'Fireworks over a frozen lake',art:'fireworks'},
];
window.METAPHOR_CHIPS=['Reverb decay over 6 s','No high frequencies above 4 kHz','Only band-passed noise','Everything mono','Nothing under 200 Hz','Tape wobble on everything','No attack — swells only','One note, endlessly','Distant, behind glass','Granular shimmer','Dripping, irregular rhythm','Sub bass you feel, not hear','Bitcrushed to 8-bit','Long pre-delay','Pitch slowly falling','Metallic resonances','Dry and close, no room','Wide stereo wash'];

/* ---------- The demo song: the sound source for games 05–08 ----------
   120 BPM, first beat at 0.139 s, so a bar is 2 s and bars start at 0.139 + 2·n.
   excerpts: 4-bar loops (Frequency Detective, Frequency Sculptor)
   chops:    one dry hit cut out of the song (Decay Guessr)
   freeze:   a tonal moment frozen into a steady tone (Envelope Sculptor)
   Times are in seconds — listen and adjust freely. Set vocal:true on parts with singing. */
window.SONG={
  src:'audio/demosong.mp3',bpm:120,beat0:0.139,
  excerpts:[
    {name:'Intro',at:6.139,bars:4},
    {name:'First lift',at:20.139,bars:4},
    {name:'Drop',at:44.139,bars:4},
    {name:'Groove',at:58.139,bars:4},
    {name:'Bright section',at:74.139,bars:4},
    {name:'Breakdown',at:124.139,bars:4},
    {name:'Melodic section',at:140.139,bars:4},
    {name:'Second groove',at:166.139,bars:4},
    {name:'Peak',at:180.139,bars:4},
    {name:'Second drop',at:202.139,bars:4},
    {name:'Last drop',at:226.139,bars:4},
  ],
  chops:[
    {name:'Kick',at:88.60,len:.28},{name:'Kick',at:163.11,len:.28},{name:'Kick',at:225.97,len:.28},
    {name:'Snare / clap',at:8.70,len:.24},{name:'Snare / clap',at:68.40,len:.24},{name:'Snare / clap',at:169.63,len:.24},
    {name:'Chord stab',at:13.17,len:.34},{name:'Chord stab',at:32.09,len:.34},{name:'Chord stab',at:152.13,len:.34},
    {name:'Melodic slice',at:110.0,len:.38},{name:'Melodic slice',at:149.5,len:.38},{name:'Melodic slice',at:193.0,len:.38},
  ],
  freeze:[
    {name:'Intro chord',at:8.5},{name:'Intro pad',at:17.0},{name:'Lift',at:33.5},{name:'Groove tone',at:86.0},
    {name:'Bridge tone',at:110.0},{name:'Breakdown chord',at:125.5},{name:'Melodic tone',at:149.5},{name:'Peak tone',at:193.0},
  ],
};
