export const cast = {
  bao: { name: '奶龙', han: '', role: 'The last laugh in the Vale', portrait: 'milk-dragon' },
  yun: { name: 'Yun', han: '云', role: 'Acoustic engineer', portrait: 'yun' },
  ren: { name: 'Ren', han: '灯任', role: 'Lantern keeper', portrait: 'ren' },
  echo: { name: 'The cylinder', han: '回声', role: 'An archived voice' },
  courier: { name: 'You', han: '', role: 'Courier' },
  narration: { name: 'Lantern Vale', han: '灯谷', role: 'Narration' },
};

export const chapters = [
  { title: 'The sound that stayed', location: 'Arrival bridge', lower: -9, upper: 11, spawn: [0, 7], task: 'Find the laughter on the bridge.' },
  { title: 'Things we keep', location: 'Lantern market', lower: -35, upper: -9, spawn: [0, -10], task: 'Speak with Yun and Ren about the missing voices.' },
  { title: 'An unfinished song', location: 'Ginkgo grove', lower: -59, upper: -35, spawn: [0, -36], task: 'Listen to the recording and wake the lantern organ.' },
  { title: 'What the valley owes', location: 'The listening house', lower: -85, upper: -59, spawn: [0, -60], task: 'Meet Yun and Ren, then decide what the transmitter should do.' },
  { title: 'The morning after', location: 'Dawn pavilion', lower: -106, upper: -85, spawn: [0, -86], task: 'Find 奶龙 at the last pavilion.' },
];

export const targets = [
  { id: 'arrival', title: '奶龙', type: 'Talk to', x: 0, z: -2, act: 0, actor: 'bao' },
  { id: 'yun', title: 'Yun', type: 'Talk to', x: -2.8, z: -18, act: 1, actor: 'yun' },
  { id: 'ren', title: 'Ren', type: 'Talk to', x: 2.8, z: -27, act: 1, actor: 'ren' },
  { id: 'cylinder', title: 'Wax cylinder', type: 'Listen to', x: -2.7, z: -43, act: 2, prop: 'cylinder' },
  { id: 'organ', title: 'Lantern organ', type: 'Tune', x: 1.8, z: -53, act: 2, prop: 'organ', requires: 'cylinder' },
  { id: 'confession', title: 'Listening platform', type: 'Approach', x: -2.6, z: -65, act: 3, actor: 'yun', companion: 'ren' },
  { id: 'broadcast', title: 'Vale transmitter', type: 'Operate', x: 0, z: -80, act: 3, prop: 'transmitter', requires: 'confession' },
  { id: 'farewell', title: '奶龙', type: 'Talk to', x: 0, z: -98, act: 4, actor: 'bao' },
];

export const outcomes = {
  chorus: { title: 'The living chorus', caption: 'A future with room for every voice.', subtitle: 'TRUE ENDING', image: 'world' },
  archive: { title: 'The museum of dawn', caption: 'Some sounds return only when invited.', subtitle: 'ARCHIVE ENDING', image: 'world' },
  quiet: { title: 'The quiet between', caption: 'Even silence can belong to us.', subtitle: 'QUIET ENDING', image: 'world' },
};

const line = (speaker, text) => ({ speaker, text });
const choice = (text, replies, effect = {}) => ({ text, replies, effect });
const question = (speaker, text, choices) => ({ speaker, text, choices });

export const scenes = {
  arrival: [
    line('narration', 'The last ferry leaves you with a dented parcel and a note in your mother’s handwriting. Deliver to Lantern Vale before the first bell.'),
    line('narration', 'The parcel spent six years under a floorboard in your mother’s shed. The ferryman found it two days ago, wrapped in a tea towel that still smells faintly of ginger. She died in the flood before anyone could deliver it.'),
    line('narration', 'Even from the far bank, you should hear a kitchen window sticking, someone counting change, the ferry rope slapping the pier. Tonight you hear a single laugh.'),
    line('bao', 'Hoh! Hoh! … Oh. You’re here. I tried waving, but I think I misplaced the part where I put my hand back down.'),
    line('courier', 'The festival bell was supposed to ring an hour ago. Where is everyone?'),
    line('bao', 'They’re here. I can see their mouths move. The Vale stopped keeping their sounds. Mine stayed. It comes out whenever I’m scared. Which, between us, is an inconvenient amount.'),
    question('bao', 'Were you expecting a better welcome?', [
      choice('“One real laugh is a good start.”', [line('bao', 'Then you can borrow mine. Short-term loan. The interest rate is snacks.')], { warmth: 1 }),
      choice('“I’m more worried about that bell.”', [line('bao', 'Good. Worry is easier with company. I’ll worry over here while you find Yun in the market.')]),
    ]),
    line('bao', 'Your parcel is humming the same note as the bell before it went quiet. Take it to Yun. Ren has the key to the old grove. Tell her I did not sell it for a bun. This time.'),
  ],
  yun: [
    line('yun', 'You still walk onto a bridge left foot first. I watched you do that every morning until the day you stopped coming.'),
    line('courier', 'I thought if I stayed away long enough I could remember the Vale without remembering the flood.'),
    line('yun', 'I took the opposite approach. I built a resonator to record the sounds of the people we lost. Your mother helped me test it. We had your ferry whistle, the bell, every boat on the south bank.'),
    line('yun', 'Come closer. The tower mostly eats sounds that reach the receivers on the eaves. You can still hear me from here, if I keep my voice low.'),
    line('yun', 'But when I played them too loudly, the machine started replacing live sounds with the recordings. Tonight someone turned it up again. This parcel contains the governor your mother made me promise to install.'),
    question('yun', 'I could use someone who remembers what the Vale actually sounded like.', [
      choice('“We can figure it out together. I missed that.”', [line('yun', 'So did I. More than I knew how to say in any of the letters I never sent.')], { yun: 1 }),
      choice('“Show me how the governor works.”', [line('yun', 'It lets the tower hear two things at once. A live signal and an echo. We’ll need both to fix this.')]),
    ]),
    line('yun', 'At dawn it writes over the live channel again. If the machine tunes itself to a quiet town, I don’t know how we’ll teach it to hear us after that. The next ferry whistle will be our last warning.'),
    line('yun', 'The last clean recording is in the grove. Ren can get you in. If she asks, I’ve stopped the festival playback timer. It still recalibrates at dawn. She deserves to know.'),
  ],
  ren: [
    line('ren', 'Careful with that lantern. The six-year-old who made it says the lopsided side is for luck. I say it’s the side we keep away from the curtains.'),
    line('courier', 'Yun sent me for the grove key.'),
    line('ren', 'Everyone says the tower’s broken. It sounds exactly the way it was built to sound. It has my brother’s voice from the day before the flood. It plays him saying he’ll be home for dinner. He never said what we were supposed to do with the leftovers.'),
    line('ren', 'Some people want to hear their families again. Some people are tired of being startled by ghosts on the way to work. Both groups still come to me for lanterns.'),
    question('ren', 'If you get the voices back, can you promise they’ll belong to the people who speak them?', [
      choice('“I can promise to listen. I’d like to start with you.”', [line('ren', 'Then come by after all this. When you ask me a question, I have the odd feeling you’d actually wait for the answer.')], { ren: 1 }),
      choice('“I’ll check what the tower is capable of.”', [line('ren', 'Good. Take the key. Read whatever my brother left in the grove.')]),
    ]),
  ],
  cylinder: [
    line('narration', 'A wax cylinder turns under a glass dome. The label is familiar. Your mother’s hand again. Calibration, for my courier.'),
    line('echo', 'One sound at a time, love. Start with the low river hum. Leave space for two breaths. Then bring in the high bell. The breath is part of the tune.'),
    line('echo', 'If you’re listening because something happened, remember that a recording can get the words right and still get the person wrong. I hope you’ll let me surprise you when I see you.'),
    line('courier', 'The last thing she said to me was that my soup needed salt. I’ve spent six years trying to turn it into advice.'),
    line('narration', 'You write her tuning sequence in your journal. The parcel has stopped humming.'),
  ],
  organ: [
    line('narration', 'Three lanterns flicker around the wind organ. They carry air from the canal through the transmission line. Until the organ is tuned, the tower can only play its own echoes.'),
    question('narration', 'Which notes do you send through the pipe?', [
      choice('River hum · two breaths · high bell', [line('narration', 'The first note travels beneath your feet. After two breaths, the bell catches it and the grove answers in harmony.')], { tuned: true }),
      choice('High bell · river hum · one breath', [line('narration', 'The lanterns go cold. The bell is crowding the lower note. You can try again.')]),
      choice('Two breaths · high bell · river hum', [line('narration', 'The last note dies in the intake. You can try again. The cylinder’s sequence is in your journal.')]),
    ]),
  ],
  confession: [
    line('ren', 'I wanted to hear him say it again. I thought I could raise the tower gain just for one minute. He sounded real enough that I went to set his place. By the time I came back, the whole market was getting quieter.'),
    line('yun', 'I left the gain lever unlocked. I knew what it did. If you’d asked me that day, I might have turned it up myself.'),
    line('ren', 'Then 奶龙 laughed. It’s the one sound the tower never found a matching recording for. We took him in after the flood. He was the first person to make me laugh. It hurt so much I made him apologize.'),
    line('courier', 'His laugh can carry a live signal. We can feed it through the governor and give the town a choice about what it keeps.'),
    line('yun', 'We can preserve the archive separately. Or unplug it. Or divide the two signals and put the storage controls back in the square. People would have to take turns tending it. I’d help.'),
    question('ren', 'When this is over, if you had time to spend with someone…', [
      choice('“Yun, there’s a ferry at dawn. Will you walk me to it?”', [line('yun', 'I will. If you decide to miss it, I know a place that still serves breakfast at four.')], { route: 'yun' }),
      choice('“Ren, I’d like to see how you make those lanterns.”', [line('ren', 'We’ll make a crooked one together. Then we can argue about which side is luckier.')], { route: 'ren' }),
      choice('“Let’s all stay until the lights come back.”', [line('ren', 'Then the three of us can finish the leftovers. I hope you two like radishes.')], { route: 'friends' }),
    ]),
  ],
  broadcast: [
    line('narration', 'By the time you seat the governor, there are townspeople watching from the market rail. No one has yet heard a word the three of you have spoken.'),
    line('bao', 'Hoh? Is this thing on? I’ve never tried laughing on purpose. Usually I’m thinking about buns, and then it happens to everybody.'),
    line('courier', 'Remember the bun you told Ren you didn’t sell her key for?'),
    line('bao', 'I wasn’t supposed to eat the evidence either?'),
    question('narration', '奶龙’s laugh peaks in the live channel. Set the governor while the two signals are distinct.', [
      choice('Split the signals and give the people the controls.', [line('narration', 'All along the canal, live sound returns. The archive light settles into a steady amber. A moment later, someone asks if the machine can be turned down. Someone else says yes.')], { ending: 'chorus' }),
      choice('Keep the archive intact and turn off its public speaker.', [line('narration', 'Sound returns in order of distance. You hear your own breath, then Ren’s, then the beating of clothes on stone downriver. The archive keeps turning behind its closed door.')], { ending: 'archive' }),
      choice('Disconnect the archive and let the original voices rest.', [line('narration', 'The last recorded voice finishes its sentence. For a little while, the canal is quiet. Then someone near the bridge calls to ask who wants a bowl of soup.')], { ending: 'quiet' }),
    ]),
  ],
};

export function sceneFor(id, state) {
  if (id !== 'farewell') return scenes[id];

  const route = {
    yun: [
      line('yun', 'You came down here without packing. If you’re staying a while, I can show you where I kept the unsent letters.'),
      line('courier', 'You can read the first one to me over breakfast. If you want.'),
      line('yun', state.bonds.yun ? 'I’d like that. I wrote the last one first, so you already know how it ends.' : 'Only if you tell me where you’ve been first. I want the whole story.'),
    ],
    ren: [
      line('ren', 'I brought a sheet of paper big enough for a two-person lantern. Come hold this corner.'),
      line('courier', 'What should we write on it?'),
      line('ren', state.bonds.ren ? 'A time and a place. Somewhere we can have our first proper date.' : 'Our names, maybe. See how they look sharing a side.'),
    ],
    friends: [
      line('ren', 'First round of tea is on the courier. I hear they make a decent living these days.'),
      line('yun', 'First round is mine. You two can argue about the second.'),
    ],
  }[state.route] ?? [];
  const reflection = {
    chorus: 'At noon, a child gives permission to record the reed whistle she learned that morning. She also asks how to erase it. Yun shows her both buttons.',
    archive: 'On the first market day, Ren opens the archive door for one hour. Her brother says he’ll be home for dinner. She tells him she’ll be out.',
    quiet: 'Ren leaves the empty cylinders by the river. Someone paints them and turns them into planters. When they fill with rain, nobody tries to play them.',
  }[state.ending];
  return [
    line('bao', state.bonds.warmth ? 'I’m here to collect that snack interest. It has been a very long night and inflation has been extraordinary.' : 'Remember the bell you were worried about? It rang this morning. The first sound after it was someone asking for seconds.'),
    line('narration', reflection),
    ...route,
    line('bao', 'Before you go, would you listen to something? Just this once.'),
    line('narration', '奶龙 takes a big breath. So do you. Neither of you can hold it for long.'),
  ];
}

export function applyChoice(state, item) {
  const { yun, ren, warmth, ...storyFlags } = item.effect;
  const bonds = { yun: state.bonds.yun + (yun ?? 0), ren: state.bonds.ren + (ren ?? 0), warmth: state.bonds.warmth + (warmth ?? 0) };
  return { ...state, ...storyFlags, bonds };
}

export function availableTargets(state) {
  return targets.filter(target => target.act === state.act && !state.done.includes(target.id) &&
    (!target.requires || state.done.includes(target.requires)));
}

export function finishScene(state, id) {
  if (id === 'organ' && !state.tuned) return state;
  const done = [...new Set([...state.done, id])];
  if (id === 'farewell') return { ...state, done, completed: true };
  const actFinished = targets.filter(target => target.act === state.act).every(target => done.includes(target.id));
  if (!actFinished) return { ...state, done };
  const act = state.act + 1;
  return { ...state, done, act, position: [...chapters[act].spawn], view: [0, 0] };
}

export const discoveries = {
  arrival: ['The last laugh', '奶龙’s laugh escaped the tower because there was no matching sound in its archive.'],
  yun: ['The governor', 'Your mother’s governor can separate a live signal from a recorded one.'],
  ren: ['The grove key', 'Ren wants the festival voices returned to the people who make them.'],
  cylinder: ['Calibration sequence', 'Low river hum → two breaths → high bell.'],
  organ: ['A clear channel', 'The organ now carries live sound through to the tower.'],
  confession: ['A borrowed voice', 'Ren raised the gain to hear her brother. The tower began replacing the living Vale with the recordings.'],
  broadcast: ['Decision at the tower', '奶龙’s laugh provided the clean signal that freed the Vale.'],
  farewell: ['Morning in the Vale', 'The ferry can wait.'],
};
