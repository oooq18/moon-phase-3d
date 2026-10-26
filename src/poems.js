/**
 * One short public-domain line for each phase, not a whole poem.
 * Couplets follow the received texts (毛诗, 全唐诗, 乐府, and the usual ci).
 *
 * Single mode draws from the ten lines whose first phase is that name.
 * Dual mode draws one shared line from the ordered pair 左相|右相
 * (8×8 = 64 pools, ten each). The same line may sit in several pools.
 *
 * 中秋: if either date is 农历八月十五, use the ten festival lines.
 */

export const PHASES = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];

function line(id, text, author, phases, extra = {}) {
  return { id, text, author, phases, ...extra };
}

const LIBRARY = [
  line('lulun-yuehei', '月黑雁飞高，单于夜遁逃', '卢纶', ['新月'], { core: true }),
  line('shijing-shuoyue', '十月之交，朔月辛卯', '诗经', ['新月'], { core: true }),
  line('shijing-yuewei', '彼月而微，此日而微', '诗经', ['新月'], { core: true }),
  line('shijing-yueshi', '彼月而食，则维其常', '诗经', ['新月'], { core: true }),
  line('shijing-yuezhu', '日居月诸，胡迭而微', '诗经', ['新月'], { core: true }),
  line('dufu-weisheng', '微升古塞外，已隐暮云端', '杜甫', ['新月', '蛾眉月'], { core: true }),
  line('dufu-hehan', '河汉不改色，关山空自寒', '杜甫', ['新月', '蛾眉月'], { core: true }),
  line('dufu-bailu', '庭前有白露，暗满菊花团', '杜甫', ['新月', '蛾眉月'], { core: true }),
  line('luobinwang-jiman', '忌满光先缺，乘昏影暂流', '骆宾王', ['新月', '蛾眉月'], { core: true }),
  line('quyuan-yeguang', '夜光何德，死则又育', '屈原', ['新月'], { core: true }),

  line('baijuyi-chusan', '可怜九月初三夜，露似真珠月似弓', '白居易', ['蛾眉月', '新月'], { core: true }),
  line('baozhao-yugou', '始见西南楼，纤纤如玉钩', '鲍照', ['蛾眉月'], { core: true }),
  line('baozhao-emei', '未映东北墀，娟娟似蛾眉', '鲍照', ['蛾眉月'], { core: true }),
  line('baozhao-zhulong', '蛾眉蔽珠栊，玉钩隔琐窗', '鲍照', ['蛾眉月'], { core: true }),
  line('liyu-yuegou', '无言独上西楼，月如钩', '李煜', ['蛾眉月', '残月'], { core: true }),
  line('yuqian-yutan', '泠泠玉潭水，映见蛾眉月', '虞骞', ['蛾眉月'], { core: true }),
  line('liuxiaochuo-xianxian', '秋月始纤纤，微光垂步檐', '刘孝绰', ['蛾眉月', '上弦月'], { core: true }),
  line('hexun-pojing', '初宿长淮上，破镜出云明', '何逊', ['蛾眉月', '上弦月'], { core: true }),
  line('hexun-shuange', '今夕千余里，双蛾映水生', '何逊', ['蛾眉月'], { core: true }),
  line('luobinwang-qugou', '既能明似镜，何用曲如钩', '骆宾王', ['蛾眉月'], { core: true }),

  line('libai-banlun', '峨眉山月半轮秋，影入平羌江水流', '李白', ['上弦月', '下弦月'], { core: true }),
  line('shijing-yueheng', '如月之恒，如日之升', '诗经', ['上弦月'], { core: true }),
  line('wangbao-banbi', '上弦如半璧，初魄似蛾眉', '王褒', ['上弦月', '蛾眉月'], { core: true }),
  line('wangbao-qiuye', '月色当秋夜，斜晖映薄帷', '王褒', ['上弦月'], { core: true }),
  line('wangbao-duyun', '渡云光忽驶，中天影更迟', '王褒', ['上弦月'], { core: true }),
  line('liuyuan-chuxian', '移榻坐庭阴，初弦时复临', '刘瑗', ['上弦月'], { core: true }),
  line('liuyuan-yueguang', '月光移数尺，方知夜已深', '刘瑗', ['上弦月', '下弦月'], { core: true }),
  line('baoquan-gouxuan', '客行钩始悬，此夜月将弦', '鲍泉', ['上弦月', '蛾眉月'], { core: true }),
  line('baoquan-chuanying', '川澄光尚动，流驶影难圆', '鲍泉', ['上弦月'], { core: true }),
  line('dufu-xianyu', '光细弦欲上，影斜轮未安', '杜甫', ['上弦月', '新月', '蛾眉月'], { core: true }),

  line('liuxiaochuo-lunguang', '轮光缺不半，扇影出将圆', '刘孝绰', ['盈凸月', '上弦月'], { core: true }),
  line('liuxiaochuo-liuguang', '流光照漭瀁，波动映沦涟', '刘孝绰', ['盈凸月'], { core: true }),
  line('yujianwu-xingliu', '星流时入晕，桂长欲侵轮', '庾肩吾', ['盈凸月'], { core: true }),
  line('yujianwu-duhe', '渡河光不湿，移轮辙讵开', '庾肩吾', ['盈凸月'], { core: true }),
  line('yuxi-tuanshan', '初生似玉钩，裁满如团扇', '虞羲', ['盈凸月', '蛾眉月'], { core: true }),
  line('yuxi-gaotai', '影丽高台端，光入长门殿', '虞羲', ['盈凸月'], { core: true }),
  line('libai-baiyupan', '小时不识月，呼作白玉盘', '李白', ['盈凸月', '满月'], { core: true }),
  line('libai-yaotai', '又疑瑶台镜，飞在青云端', '李白', ['盈凸月', '满月'], { core: true }),
  line('xiaogang-qijing', '形同七子镜，影类九秋霜', '萧纲', ['盈凸月', '满月'], { core: true }),
  line('zhangruoxu-fangdian', '江流宛转绕芳甸，月照花林皆似霰', '张若虚', ['盈凸月', '满月'], { core: true }),

  line('zhangjiuling-haishang', '海上生明月，天涯共此时', '张九龄', ['满月', '盈凸月'], { core: true }),
  line('libai-chuangqian', '床前明月光，疑是地上霜', '李白', ['满月', '盈凸月'], { core: true }),
  line('libai-tianshan', '明月出天山，苍茫云海间', '李白', ['满月', '亏凸月'], { core: true }),
  line('wangwei-songjian', '明月松间照，清泉石上流', '王维', ['满月', '盈凸月'], { core: true }),
  line('dufu-guxiang', '露从今夜白，月是故乡明', '杜甫', ['满月', '亏凸月'], { core: true }),
  line('dufu-mingjing', '满目飞明镜，归心折大刀', '杜甫', ['满月'], { core: true }),
  line('wangjian-zhongting', '中庭地白树栖鸦，冷露无声湿桂花', '王建', ['满月'], { core: true }),
  line('zhangruoxu-chunjiang', '春江潮水连海平，海上明月共潮生', '张若虚', ['满月', '盈凸月'], { core: true }),
  line('sushi-jiyou', '明月几时有，把酒问青天', '苏轼', ['满月'], { core: true, midAutumn: true }),
  line('caocao-wuxique', '月明星稀，乌鹊南飞', '曹操', ['满月', '盈凸月'], { core: true }),

  line('gushi-sanwu', '三五明月满，四五蟾兔缺', '古诗十九首', ['亏凸月', '满月'], { core: true }),
  line('xielingyun-jiman', '昨三五兮既满，今二八兮将缺', '谢灵运', ['亏凸月', '满月'], { core: true }),
  line('xielingyun-jiao', '浮云褰兮收泛滟，明舒照兮殊皎洁', '谢灵运', ['亏凸月'], { core: true }),
  line('sushi-yuanque', '人有悲欢离合，月有阴晴圆缺', '苏轼', ['亏凸月', '满月'], { core: true }),
  line('baozhao-erban', '三五二八时，千里与君同', '鲍照', ['亏凸月', '满月'], { core: true }),
  line('lishangyin-yuque', '初生欲缺虚惆怅，未必圆时即有情', '李商隐', ['亏凸月', '盈凸月'], { core: true }),
  line('lishangyin-guoshui', '过水穿楼触处明，藏人带树远含清', '李商隐', ['亏凸月', '满月'], { core: true }),
  line('xinqiji-jinbo', '一轮秋影转金波，飞镜又重磨', '辛弃疾', ['亏凸月', '满月'], { core: true, midAutumn: true }),
  line('libai-guren', '今人不见古时月，今月曾经照古人', '李白', ['亏凸月', '满月'], { core: true }),
  line('caozhi-gaolou', '明月照高楼，流光正徘徊', '曹植', ['亏凸月', '满月'], { core: true }),

  line('dufu-sigen', '四更山吐月，残夜水明楼', '杜甫', ['下弦月', '残月'], { core: true }),
  line('dufu-fenglian', '尘匣元开镜，风帘自上钩', '杜甫', ['下弦月', '残月'], { core: true }),
  line('dufu-tuifa', '兔应疑鹤发，蟾亦恋貂裘', '杜甫', ['下弦月'], { core: true }),
  line('dufu-henge', '斟酌姮娥寡，天寒耐九秋', '杜甫', ['下弦月', '残月'], { core: true }),
  line('xiaozifan-hehan', '河汉东西阴，清光此夜出', '萧子范', ['下弦月'], { core: true }),
  line('xiaozifan-ruzhang', '入帐华珠被，斜筵照宝瑟', '萧子范', ['下弦月'], { core: true }),
  line('xiaozifan-shuangcan', '霜惨庭上兰，风鸣檐下橘', '萧子范', ['下弦月'], { core: true }),
  line('shenyue-dongfang', '洞房殊未晓，清光信悠哉', '沈约', ['下弦月', '残月'], { core: true }),
  line('luji-anqin', '安寝北堂上，明月入我牖', '陆机', ['下弦月', '满月'], { core: true }),
  line('luji-yingshou', '照之有余辉，揽之不盈手', '陆机', ['下弦月', '满月'], { core: true }),

  line('liuyong-canxue', '今宵酒醒何处，杨柳岸晓风残月', '柳永', ['残月'], { core: true }),
  line('niuxiji-lianbian', '残月脸边明，别泪临清晓', '牛希济', ['残月'], { core: true }),
  line('niuxiji-chunshan', '春山烟欲收，天淡星稀小', '牛希济', ['残月', '下弦月'], { core: true }),
  line('wentingyun-jisheng', '鸡声茅店月，人迹板桥霜', '温庭筠', ['残月', '下弦月'], { core: true }),
  line('sushi-queyue', '缺月挂疏桐，漏断人初静', '苏轼', ['残月', '下弦月', '亏凸月'], { core: true }),
  line('zhangji-yueluo', '月落乌啼霜满天，江枫渔火对愁眠', '张继', ['残月'], { core: true }),
  line('lishangyin-yunmu', '云母屏风烛影深，长河渐落晓星沉', '李商隐', ['残月', '下弦月'], { core: true }),
  line('lishangyin-change', '嫦娥应悔偷灵药，碧海青天夜夜心', '李商隐', ['残月', '下弦月'], { core: true }),
  line('zhangruoxu-luoyue', '江水流春去欲尽，江潭落月复西斜', '张若虚', ['残月', '亏凸月'], { core: true }),
  line('yuqian-mimi', '靡靡露方垂，晖晖光稍没', '虞骞', ['残月', '下弦月'], { core: true }),

  line('sushi-qingying', '起舞弄清影，何似在人间', '苏轼', ['满月'], { midAutumn: true }),
  line('sushi-buheng', '不应有恨，何事长向别时圆', '苏轼', ['满月', '亏凸月'], { midAutumn: true }),
  line('sushi-chanyuan', '但愿人长久，千里共婵娟', '苏轼', ['满月'], { midAutumn: true }),
  line('sushi-yupan', '暮云收尽溢清寒，银汉无声转玉盘', '苏轼', ['满月'], { midAutumn: true }),
  line('sushi-mingnian', '此生此夜不长好，明月明年何处看', '苏轼', ['满月'], { midAutumn: true }),
  line('wangjian-qiusi', '今夜月明人尽望，不知秋思落谁家', '王建', ['满月'], { midAutumn: true }),
  line('xinqiji-chengfeng', '乘风好去，长空万里，直下看山河', '辛弃疾', ['满月'], { midAutumn: true }),
  line('xinqiji-guipo', '斫去桂婆娑，人道是清光更多', '辛弃疾', ['满月'], { midAutumn: true }),

  line('wangwei-yuechu', '月出惊山鸟，时鸣春涧中', '王维', ['新月', '蛾眉月']),
  line('liufangping-banren', '更深月色半人家，北斗阑干南斗斜', '刘方平', ['上弦月', '下弦月']),
  line('libai-jutou', '举头望明月，低头思故乡', '李白', ['满月', '盈凸月']),
  line('libai-yaoming', '举杯邀明月，对影成三人', '李白', ['满月']),
  line('dumu-ershisi', '二十四桥明月夜，玉人何处教吹箫', '杜牧', ['满月']),
  line('wangchangling-qinshi', '秦时明月汉时关，万里长征人未还', '王昌龄', ['满月', '亏凸月']),
  line('libai-chouxin', '我寄愁心与明月，随君直到夜郎西', '李白', ['满月', '亏凸月']),
  line('wanganshi-zhaohuan', '春风又绿江南岸，明月何时照我还', '王安石', ['满月']),
  line('dumu-qinhuai', '烟笼寒水月笼沙，夜泊秦淮近酒家', '杜牧', ['亏凸月', '残月']),
  line('liuyuxi-jiuyue', '淮水东边旧时月，夜深还过女墙来', '刘禹锡', ['亏凸月', '残月']),
  line('libai-bihai', '明月不归沉碧海，白云愁色满苍梧', '李白', ['残月', '下弦月']),
  line('chenziang-yinhu', '明月隐高树，长河没晓天', '陈子昂', ['残月', '下弦月']),
  line('lishangyin-suer', '青女素娥俱耐冷，月中霜里斗婵娟', '李商隐', ['满月', '盈凸月']),
  line('ouyangxiu-liushao', '月上柳梢头，人约黄昏后', '欧阳修', ['满月']),
  line('yanshu-lihen', '明月不谙离恨苦，斜光到晓穿朱户', '晏殊', ['满月', '亏凸月']),
  line('yanjidao-caiyun', '当时明月在，曾照彩云归', '晏几道', ['满月', '亏凸月']),
  line('xinqiji-jingque', '明月别枝惊鹊，清风半夜鸣蝉', '辛弃疾', ['满月', '盈凸月']),
  line('dufu-yueyong', '星垂平野阔，月涌大江流', '杜甫', ['满月', '盈凸月']),
  line('dufu-fuzou', '今夜鄜州月，闺中只独看', '杜甫', ['满月']),
  line('libai-chang', '长安一片月，万户捣衣声', '李白', ['满月']),
  line('libai-linglong', '却下水晶帘，玲珑望秋月', '李白', ['满月', '盈凸月']),
  line('yuliangshi-yueshou', '掬水月在手，弄花香满衣', '于良史', ['满月', '盈凸月']),
  line('zhangmi-chunting', '多情只有春庭月，犹为离人照落花', '张泌', ['亏凸月', '满月']),
  line('libai-chanchu', '蟾蜍蚀圆影，大明夜已残', '李白', ['亏凸月', '残月']),
  line('cuitu-sangeng', '蝴蝶梦中家万里，子规枝上月三更', '崔涂', ['残月', '下弦月']),
  line('pirixiu-yuelun', '玉颗珊珊下月轮，殿前拾得露华新', '皮日休', ['满月']),
];

function hashString(value) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function relevance(poem, phase) {
  const index = PHASES.indexOf(phase);
  if (index < 0) return 0;
  let best = 0;
  for (const tag of poem.phases) {
    const dist = Math.abs(PHASES.indexOf(tag) - index);
    const score = dist === 0 ? 8 : dist === 1 ? 4 : dist === 2 ? 2 : 0;
    if (score > best) best = score;
  }
  return best;
}

function ranked(phaseA, phaseB) {
  return LIBRARY.map((poem, index) => ({
    poem,
    index,
    score: relevance(poem, phaseA) * 5 + relevance(poem, phaseB) * 3,
    tie: hashString(`${phaseA}|${phaseB}|${poem.id}`),
  }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tie !== b.tie) return a.tie - b.tie;
      return a.index - b.index;
    })
    .map((row) => row.poem);
}

function takeUnique(list, count) {
  const out = [];
  const seen = new Set();
  for (const poem of list) {
    if (!poem.text || poem.text.includes('\n') || seen.has(poem.text)) continue;
    seen.add(poem.text);
    out.push(poem);
    if (out.length === count) break;
  }
  return out;
}

function pickPoem(list, avoidText) {
  if (!list?.length) return null;
  const pool = avoidText && list.some((poem) => poem.text !== avoidText)
    ? list.filter((poem) => poem.text !== avoidText)
    : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function poemsForPhase(name) {
  return takeUnique(LIBRARY.filter((poem) => poem.core && poem.phases[0] === name), 10);
}

export function poemsForPair(phaseA, phaseB) {
  return takeUnique(ranked(phaseA, phaseB), 10);
}

export function poemsForMidAutumn() {
  return LIBRARY.filter((poem) => poem.midAutumn);
}

export function poemForPhase(name, avoidText) {
  return pickPoem(poemsForPhase(name), avoidText);
}

export function poemForDual(phaseA, phaseB, avoidText) {
  return pickPoem(poemsForPair(phaseA, phaseB), avoidText);
}

export function poemForMidAutumn(avoidText) {
  return pickPoem(poemsForMidAutumn(), avoidText);
}

export function poemCatalogStats() {
  const texts = new Set(LIBRARY.map((poem) => poem.text));
  return {
    library: LIBRARY.length,
    uniqueTexts: texts.size,
    phases: PHASES.length,
    pairs: PHASES.length * PHASES.length,
    perPool: 10,
    midAutumn: poemsForMidAutumn().length,
    longest: Math.max(...LIBRARY.map((poem) => poem.text.length)),
  };
}
