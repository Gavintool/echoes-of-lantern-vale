export const cast = {
  bao: { name: '奶龙', role: '桥头的笑声', portrait: 'milk-dragon' },
  yun: { name: '青音奶龙', role: '灯谷声学师', portrait: 'qingyin' },
  ren: { name: '灯穗奶龙', role: '纸灯铺老板', portrait: 'dengsui' },
  echo: { name: '霜铃奶龙', role: '母亲留下的蜡筒录音', portrait: 'shuangling' },
  courier: { name: '信使奶龙', role: '归乡的信使', portrait: 'courier' },
  narration: { name: '灯谷', role: '旁白' },
};

export const chapters = [
  { title: '还有一声笑', location: '归渡桥', lower: -9, upper: 11, spawn: [0, 7], task: '去桥上寻找笑声的来处。' },
  { title: '留在灯里的人', location: '灯市', lower: -35, upper: -9, spawn: [0, -10], task: '向青音奶龙和灯穗奶龙打听消失的声音。' },
  { title: '没奏完的曲子', location: '银杏林', lower: -59, upper: -35, spawn: [0, -36], task: '听蜡筒录音，按顺序为灯风琴调音。' },
  { title: '回声的归处', location: '听声楼', lower: -85, upper: -59, spawn: [0, -60], task: '与大家会合，决定发声塔的去留。' },
  { title: '渡船还早', location: '晓灯亭', lower: -106, upper: -85, spawn: [0, -86], task: '去最后一座亭子找奶龙。' },
];

export const targets = [
  { id: 'manifest', title: '渡船簿', type: '查看', x: -3.45, z: 2.4, act: 0, prop: 'plaque', optional: true },
  { id: 'arrival', title: '奶龙', type: '和%s说话', x: 0, z: -2, act: 0, actor: 'bao' },
  { id: 'yun', title: '青音奶龙', type: '和%s说话', x: -2.8, z: -18, act: 1, actor: 'yun' },
  { id: 'pattern', title: '歪纸灯', type: '查看', x: 3.46, z: -22.5, act: 1, prop: 'paper', optional: true },
  { id: 'ren', title: '灯穗奶龙', type: '和%s说话', x: 2.8, z: -27, act: 1, actor: 'ren' },
  { id: 'cylinder', title: '蜡筒录音', type: '聆听', x: -2.7, z: -43, act: 2, prop: 'cylinder' },
  { id: 'floodmark', title: '水位碑', type: '查看', x: 3.36, z: -47.5, act: 2, prop: 'plaque', optional: true },
  { id: 'organ', title: '灯风琴', type: '调音 · ', x: 1.8, z: -53, act: 2, prop: 'organ', requires: 'cylinder' },
  { id: 'confession', title: '听声台', type: '前往', x: -2.6, z: -65, act: 3, actor: 'yun', companion: 'ren' },
  { id: 'logbook', title: '值班记录', type: '查看', x: 3.46, z: -72, act: 3, prop: 'plaque', optional: true },
  { id: 'broadcast', title: '发声塔', type: '操作', x: 0, z: -80, act: 3, prop: 'transmitter', requires: 'confession' },
  { id: 'farewell', title: '奶龙', type: '和%s说话', x: 0, z: -98, act: 4, actor: 'bao' },
];

export const outcomes = {
  chorus: { title: '灯谷合唱', caption: '明天的灯谷，每一道声音都有位置。', subtitle: '共鸣结局', image: 'world' },
  archive: { title: '黎明档案馆', caption: '门打开的时候，过去才走进来。', subtitle: '珍藏结局', image: 'world' },
  quiet: { title: '两声之间', caption: '安静也是留给活人的地方。', subtitle: '静默结局', image: 'world' },
};

const line = (speaker, text, cue) => ({ speaker, text, cue });
const choice = (text, replies, effect = {}) => ({ text, replies, effect });
const question = (speaker, text, choices, cue) => ({ speaker, text, choices, cue });

export const scenes = {
  manifest: [
    line('narration', '渡船簿的最后一页卷了边。所有停航日期都划掉了，只有六年前那个雨夜，还写着“等一等”。'),
    line('courier', '那是母亲写的。她等的最后一趟船，是我那趟。'),
  ],
  arrival: [
    line('narration', '末班渡船把你放在灯谷外岸。怀里的包裹瘪了一角，便笺上是母亲的字：头一声钟响以前，送到灯谷。'),
    line('narration', '船夫前两天才从她的工具房里找到包裹。裹着的茶巾还有一点姜味。六年前，洪水来得太急，她没来得及把它寄出去。'),
    line('narration', '从前站在对岸，就能听见船绳拍着石阶，厨房关不上窗，还有人掰着指头数找零。今夜，只剩一声笑。'),
    line('bao', '嚯！嚯嚯！啊，你可来了。我本来在冲你招手，挥着挥着，忘了怎么放下去了。', 'first-laugh'),
    line('courier', '开灯节的钟早该响了。大家去哪了？'),
    line('bao', '都在。我看得见他们动嘴，声音就是传不过来。我的笑倒还在。越害怕越想笑，真会挑时候。'),
    question('bao', '你大老远坐船回来，是不是盼着有人正经欢迎你一下？', [
      choice('有一声真心的笑，已经挺好了。', [line('bao', '那借你用一会儿。短借，利息收点心。')], { warmth: 1 }),
      choice('我更担心那口钟。', [line('bao', '好，两个人担心比一个人容易。你去灯市找青音奶龙，我在桥上替你担心。')]),
    ]),
    line('bao', '钟停之前，跟你那个包裹嗡的是同一个调。拿给青音奶龙看看。银杏林的钥匙在灯穗奶龙那儿。帮我跟她说，我这次没拿钥匙换包子。'),
  ],
  yun: [
    line('yun', '你过桥还是先迈左脚。我以前每天早上都看。后来有一天，你没来了。'),
    line('courier', '我以为走得够远，就能只记得灯谷，忘掉那场洪水。'),
    line('yun', '我刚好倒过来。我造了一台留声机，专门留住走了的人的声音。你母亲帮我试过。那时塔里存着钟声、渡船笛，还有南岸每一艘船靠码头的动静。'),
    line('yun', '靠近些。屋檐下有拾音器，声音传到那里才会被塔吞掉。我小声一点，你在这儿就还能听见。'),
    line('yun', '把增益推高，塔就会用相似的旧录音盖掉现在的声音。今晚有人把它又推高了。你带来的正是你母亲做的分音器，我当初答应过她，一定会装上。'),
    question('yun', '我需要一个还记得灯谷本来是什么声音的人。你愿意留下来帮我吗？', [
      choice('一起想办法吧。我很怀念我们从前那样。', [line('yun', '我也是。没寄出的那些信，没有一封把这句话说清楚。')], { yun: 1 }),
      choice('先教我怎么用分音器。', [line('yun', '它能让塔同时听见两个声道。一道送活声，一道送回声。少了哪一个，都调不回来。')]),
    ]),
    line('yun', '天一亮，塔会重新校准。要是它认定灯谷本来就该这么安静，再想教它听见我们就晚了。下一班渡船的笛声，就是最后一次提醒。'),
    line('yun', '最后一段没受干扰的录音在银杏林。灯穗奶龙有钥匙。告诉她，我关了灯节的定时播放，但天亮的校准停不了。她该知道。'),
  ],
  pattern: [
    line('narration', '纸灯一边大、一边小。底下用歪歪扭扭的笔迹写着：哥哥回来，就把灯拿下来。'),
    line('narration', '灯穗奶龙在下面添了一句很小的字：一直挂着也可以。'),
  ],
  ren: [
    line('ren', '小心那盏灯。做灯的小朋友说歪一点才有福气。我说歪的那面别对着窗帘。'),
    line('courier', '青音奶龙让我来借银杏林的钥匙。'),
    line('ren', '大家都说塔坏了。可它做的，正是造它时要它做的事。那里面有我哥洪水前一天的声音。他说晚饭回来吃。他从没说，那锅剩饭该怎么处理。'),
    line('ren', '有人想再听家里人说话。有人上工走到半路，已经受够了被旧声音吓一跳。可两种人都来我这儿买灯。'),
    question('ren', '如果声音回来了，你能答应我，由说这句话的人决定要不要留下它吗？', [
      choice('我答应会认真听。先从听你说开始。', [line('ren', '事情办完了，来找我吧。你问问题的时候，好像真的会等我把答案说完。')], { ren: 1 }),
      choice('我先问清楚，那座塔究竟做得到什么。', [line('ren', '也好。钥匙给你。我哥存在林子里的东西，你尽管看。')]),
    ]),
  ],
  cylinder: [
    line('narration', '玻璃罩下的蜡筒慢慢转起来。标签上的字太熟了。母亲写的是：试音，留给我的小信使。', 'cylinder'),
    line('echo', '乖，一次只送一声。先听低低的河鸣。空出两口气。然后敲高钟。别急着填满，呼吸也是调子的一部分。'),
    line('echo', '要是出了什么事，你才听到这段话，就记着：录音能把话说得一字不差，却不一定能替我回答你。等见面的时候，留我亲口说。'),
    line('courier', '她最后一句话，说的是我煮的汤忘了放盐。我花了六年，硬要把它听成一句临别教诲。'),
    line('narration', '你把试音顺序记在手记上。包裹不再嗡响了。'),
  ],
  floodmark: [
    line('narration', '银杏根旁有块细长的水位碑。六年前的刻痕已经高过你的眼睛。碑背却多了许多矮矮的刻线，是孩子们这些年量身高留下的。'),
    line('courier', '原来大家已经在往上长了。'),
  ],
  organ: [
    line('narration', '风管把河上的气送进灯风琴。三只灯罩时亮时暗。琴没调准，塔就只听得见自己的回声。'),
    question('narration', '要按什么顺序把声音送进风管？', [
      choice('低河鸣 → 两次呼吸 → 高钟', [line('narration', '沉声从脚底过去。两次呼吸之后，高钟接住它，整片银杏林都轻轻震了一下。', 'tuned')], { tuned: true }),
      choice('高钟 → 低河鸣 → 一次呼吸', [line('narration', '灯暗下去。钟声盖住了低音。再试一次吧。', 'mistune')]),
      choice('两次呼吸 → 高钟 → 低河鸣', [line('narration', '最后一声消失在进气口。还能再试，手记里有蜡筒上的顺序。', 'mistune')]),
    ]),
  ],
  confession: [
    line('ren', '是我想再听他说一遍。我只打算把塔的增益推高一分钟。听起来太真了，我竟然跑去给他摆碗筷。等我回来，整个灯市都快听不见了。'),
    line('yun', '是我没锁增益杆。我知道会出什么事。那天如果你先问我，说不定我会亲手把它推上去。'),
    line('ren', '后来奶龙笑了。怎么找，塔里也没有那声笑的录音。他是洪水后才来的，是头一个把我逗笑的家伙。那一笑牵得心里难受，我还让他跟我道歉。'),
    line('courier', '用他的笑当活声，分音器就能把两条路分开。然后，让灯谷自己决定留下什么。'),
    line('yun', '可以把档案单独留下，也可以拔掉，或者把档案的开关放回广场，让大家自己管。得有人轮班，我愿意去。'),
    question('ren', '等这一切结束，如果你还愿意花一点时间陪谁……', [
      choice('青音奶龙，天亮有班渡船。你能陪我走过去吗？', [line('yun', '好。要是你想故意赶不上，我知道哪家铺子凌晨四点就有早点。')], { route: 'yun' }),
      choice('灯穗奶龙，我想看看你怎么扎纸灯。', [line('ren', '我们一起扎一只歪的。往哪边歪比较有福气，可以吵到天亮。')], { route: 'ren' }),
      choice('我们都留下，等灯一盏盏亮起来。', [line('ren', '那三个人一起吃剩饭。先说好，那锅里全是萝卜。')], { route: 'friends' }),
    ]),
  ],
  logbook: [
    line('narration', '楼梯旁的值班记录写了三遍同一句：播前确认。最后一遍旁边有人添了一行：问录声音的人，别只问开机器的人。'),
    line('courier', '等灯谷又能听见的时候，这页该贴在广场上。'),
  ],
  broadcast: [
    line('narration', '分音器卡进槽口。像是有人开了扇窗，灯市的奶龙们挤到栏杆边往上看。你们三个人说的话，还没有一句传到他们耳朵里。'),
    line('bao', '嚯？通了吗？我可没试过故意笑。平时想到包子，笑声就自己跑出去祸害大家了。'),
    line('courier', '你不是说，没拿灯穗奶龙的钥匙换包子吗？'),
    line('bao', '啊？证据原来也不能吃吗？'),
    question('narration', '奶龙笑得整座话筒都在抖。活声和回声终于分开了。现在决定分音器的去向。', [
      choice('分开两个声道，把开关交给灯谷。', [line('narration', '活声顺着河岸一寸寸回来。档案灯稳稳亮着。过了一会儿，有人问机器能关小一点吗。另一个声音回答：能。', 'chorus')], { ending: 'chorus' }),
      choice('保留档案，关掉对外播放的喇叭。', [line('narration', '声音从近到远地回来。先是你自己的呼吸，接着是灯穗奶龙的，再远一点，有人在石阶上捶衣服。档案在关好的门后慢慢转着。', 'archive')], { ending: 'archive' }),
      choice('切断档案，让旧声音休息。', [line('narration', '最后一道录音把话说完。有一小会儿，河岸一句话也没有。然后桥边有人问，谁要来喝碗汤。', 'quiet')], { ending: 'quiet' }),
    ], 'second-laugh'),
  ],
};

export function sceneFor(id, state) {
  if (id !== 'farewell') return scenes[id];

  const route = {
    yun: [
      line('yun', '你连行李都没带。要是想多待几天，我带你去看那些没寄出去的信藏在哪儿。'),
      line('courier', '吃早饭的时候，你可以念第一封给我听。如果你愿意。'),
      line('yun', state.bonds.yun ? '好啊。我先写的是最后一封，所以你已经知道故事怎么结尾了。' : '你得先跟我说，这几年都去了哪儿。我想听完整的。'),
    ],
    ren: [
      line('ren', '这张纸够扎一只两个人抬的灯。来，帮我按住那一角。'),
      line('courier', '灯上写什么？'),
      line('ren', state.bonds.ren ? '写时间和地点吧。挑个我们能正经约会的地方。' : '写我们的名字吧。看看两个名字挨在一面好不好看。'),
    ],
    friends: [
      line('ren', '第一壶茶信使请。听说这行现在挺赚钱。'),
      line('yun', '第一壶我请。第二壶你们俩慢慢争。'),
    ],
  }[state.route] ?? [];
  const reflection = {
    chorus: '中午，一个小孩同意录下刚学会的芦苇哨。她又问，想擦掉怎么办。青音奶龙把两个按钮都指给她看。',
    archive: '赶集那天，灯穗奶龙把档案室开了一小时。哥哥在里面说，晚饭回来吃。她说，我今晚要出去。',
    quiet: '灯穗奶龙把空蜡筒摆在河边。有人给它们刷上颜色，种了草。雨水灌满的时候，谁也没有去找唱针。',
  }[state.ending];
  return [
    line('bao', state.bonds.warmth ? '我来收点心利息。昨晚过得太长，利息涨得特别厉害。' : '昨晚你担心的那口钟，今早响啦。它响完的第一句话，是“还能再来一碗吗”。', 'dawn'),
    line('narration', reflection),
    ...route,
    line('bao', '你走以前，还能再听我一回吗？就这一回。'),
    line('narration', '奶龙深吸一口气。你也吸了一口。谁都没憋住。', 'final-laugh'),
  ];
}

export function allDialogueLines() {
  const unique = new Map();
  function visit(items) {
    for (const item of items) {
      unique.set(item.speaker + ':' + item.text, item);
      for (const reply of item.choices ?? []) visit(reply.replies);
    }
  }
  for (const scene of Object.values(scenes)) visit(scene);
  for (const route of ['yun', 'ren', 'friends']) {
    for (const ending of Object.keys(outcomes)) {
      for (const bond of [0, 1]) visit(sceneFor('farewell', { route, ending, bonds: { yun: bond, ren: bond, warmth: bond } }));
    }
  }
  return [...unique.values()];
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
  const actFinished = targets.filter(target => target.act === state.act && !target.optional).every(target => done.includes(target.id));
  if (!actFinished) return { ...state, done };
  const act = state.act + 1;
  return { ...state, done, act, position: [...chapters[act].spawn], view: [0, 0] };
}

export const discoveries = {
  manifest: ['渡船簿', '母亲在最后一趟渡船的停航记录旁写了“等一等”。'],
  arrival: ['唯一的笑声', '塔里没有奶龙笑声的旧录音，因此它没有被发声塔抹去。'],
  yun: ['分音器', '母亲留下的分音器可以把活声和旧录音分开。'],
  pattern: ['歪纸灯', '有人把一盏不肯取下的灯留给了家人。'],
  ren: ['银杏林钥匙', '灯穗奶龙希望声音回到说话的人手里。'],
  cylinder: ['试音顺序', '低河鸣 → 两次呼吸 → 高钟。'],
  floodmark: ['水位碑', '洪水的刻度还在。碑背也记下了孩子们长高的日子。'],
  organ: ['干净的声道', '风琴把未经覆盖的声音送进塔。'],
  confession: ['借来的一句话', '灯穗奶龙为了听见哥哥推高了增益，旧声音开始覆盖现在。'],
  logbook: ['值班记录', '播放前应先问留下声音的人。'],
  broadcast: ['塔上的决定', '奶龙的笑声为灯谷打开了活声的通道。'],
  farewell: ['灯谷的早晨', '渡船还可以等一等。'],
};
