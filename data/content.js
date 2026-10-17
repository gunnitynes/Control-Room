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

/* ---------- Preset Archeologist: recreated in the browser by js/audio.js MACHINES ---------- */
window.PRESETS=[
  {id:'tr808',name:'Roland TR-808',year:1980,what:'Kick, clap, hats and cowbell',fact:'Its booming kick and cowbell flopped at first — then built hip-hop, Miami bass and trap.'},
  {id:'tr909',name:'Roland TR-909',year:1983,what:'House groove with open hats',fact:'Analog kick, sampled hats: the drum machine of house and techno.'},
  {id:'tb303',name:'Roland TB-303',year:1981,what:'Squelchy acid bassline',fact:'Sold as a bass accompanist, rescued from bargain bins to invent acid house.'},
  {id:'dx7',name:'Yamaha DX7',year:1983,what:'FM electric piano chords',fact:'Its FM electric piano preset is on a staggering number of 80s ballads.'},
  {id:'minimoog',name:'Minimoog Model D',year:1970,what:'Gliding mono lead',fact:'Three oscillators and the ladder filter — the lead voice of funk, prog and G-funk.'},
  {id:'juno106',name:'Roland Juno-106',year:1984,what:'Lush chorused pad',fact:'One oscillator plus that famous stereo chorus: instant lush pad.'},
  {id:'alphajuno',name:'Roland Alpha Juno',year:1985,what:'The rave "Hoover"',fact:'Its "What the" patch became the Hoover sound of early-90s rave.'},
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
  {c:'Low-pass filter',v:'lowpass',a:'Hearing a party through a closed wall'},
  {c:'High-pass filter',v:'highpass',a:'A phone speaker that just can’t do bass'},
  {c:'Bell boost',v:'bell',a:'Turning up one voice in a choir'},
  {c:'Notch filter',v:'notch',a:'Cutting one hum out of an otherwise perfect room'},
  {c:'Phase cancellation',v:'phase',a:'Two people pushing the same door from opposite sides'},
  {c:'Soft clipping',v:'softclip',a:'A sponge pressed against the ceiling'},
  {c:'Hard clipping',v:'hardclip',a:'Hitting your head on a concrete ceiling'},
  {c:'Sidechain ducking',v:'duck',a:'Everyone lowers their voice whenever the boss walks in'},
  {c:'Compression',v:'comp',a:'A parent turning the TV down when it’s loud and up when it’s quiet'},
  {c:'Limiter',v:'limit',a:'A ceiling so low you have to stoop — but nobody bumps their head'},
  {c:'Noise gate',v:'gate',a:'A bouncer who only lets you in once you’re loud enough'},
  {c:'Comb filtering',v:'comb',a:'A choir where every other singer has been muted'},
  {c:'Bitcrushing',v:'crush',a:'A photo blown up until you see the square pixels'},
  {c:'Delay',v:'delay',a:'Shouting into a canyon and hearing yourself come back'},
  {c:'Reverb',v:'reverb',a:'A cathedral remembering every footstep'},
  {c:'Pre-delay',v:'predelay',a:'The pause before the crowd starts clapping'},
  {c:'Tremolo',v:'tremolo',a:'Someone flicking the volume knob up and down'},
  {c:'Vibrato',v:'vibrato',a:'A singer’s voice wobbling in pitch'},
  {c:'Mono',v:'mono',a:'Everyone squeezed onto one chair in the middle'},
  {c:'Wide stereo',v:'wide',a:'Stretching a banner across the whole stage'},
  {c:'Swing',v:'swing',a:'Walking with a slight limp, every other step late'},
  {c:'Pluck envelope',v:'pluckenv',a:'Plucking a rubber band'},
  {c:'Pad envelope',v:'padenv',a:'Sunrise: slow to arrive, slow to leave'},
  {c:'Square wave',v:'square',a:'A light switch flicking on and off'},
  {c:'Sine wave',v:'sine',a:'A swing gently going back and forth'},
  {c:'Sawtooth wave',v:'saw',a:'Slowly filling a glass, then tipping it out at once'},
];

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
window.SABOTAGE={
  mild:['Mute the loudest track for the rest of the session.','Transpose everything up a minor third.','Halve the tempo. Make it work.','Swap the drum kit for a completely different one.','Delete every effect on the master bus.','Replace the bass with a different instrument.','Take the hi-hats away entirely.','Add a two-bar silence somewhere and earn it.'],
  brutal:['Delete 50% of the tracks right now.','Take the primary melody, reverse it, and pitch it down an octave.','Mute every instrument except the percussion and build a new track around the silence.','Bounce everything to one audio file and only edit that.','Remove the kick drum. Forever.','Everything must now be in 7/8.','Keep only the first 4 bars; delete the rest.','Pitch the whole project down a fifth and slow it to match.'],
  chaos:['Delete every track except one. Choose wisely.','Reverse the entire arrangement, end to start.','Chop the whole track into 16 pieces and shuffle them.','Replace every sound with your own voice.','Run the full mix through the most extreme plugin you have at 100%.','Delete all MIDI. Only audio survives.','Swap projects again — with the person on your right.','The new genre is the opposite of what you hear. Go.'],
};

/* ---------- Remix Relay: an optional twist for each leg ---------- */
window.RELAY_TWISTS=['Add something recorded on your phone','Change the key','Add a drop','Delete one thing the last person added','Add a vocal (any vocal)','Double the drums or halve them','Introduce a new sound nobody would expect','Make the ending','Add a breakdown','Bring back something the first person did','Add one weird effect','Make it groove harder'];

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
