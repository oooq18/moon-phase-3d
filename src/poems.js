/**
 * Public-domain lines for the eight phase names used by the observatory.
 * Short couplets, mostly Tang, Song, and earlier. One is chosen at random
 * when the phase name changes.
 */
export const PHASE_POEMS = {
  新月: [
    { text: '月黑雁飞高，单于夜遁逃', author: '卢纶' },
    { text: '十月之交，朔月辛卯', author: '诗经' },
    { text: '彼月而微，此日而微', author: '诗经' },
    { text: '彼月而食，则维其常', author: '诗经' },
    { text: '日居月诸，胡迭而微', author: '诗经' },
    { text: '微升古塞外，已隐暮云端', author: '杜甫' },
    { text: '河汉不改色，关山空自寒', author: '杜甫' },
    { text: '庭前有白露，暗满菊花团', author: '杜甫' },
    { text: '忌满光先缺，乘昏影暂流', author: '骆宾王' },
    { text: '夜光何德，死则又育', author: '屈原' },
  ],
  蛾眉月: [
    { text: '可怜九月初三夜，露似真珠月似弓', author: '白居易' },
    { text: '始见西南楼，纤纤如玉钩', author: '鲍照' },
    { text: '未映东北墀，娟娟似蛾眉', author: '鲍照' },
    { text: '蛾眉蔽珠栊，玉钩隔琐窗', author: '鲍照' },
    { text: '无言独上西楼，月如钩', author: '李煜' },
    { text: '泠泠玉潭水，映见蛾眉月', author: '虞骞' },
    { text: '秋月始纤纤，微光垂步檐', author: '刘孝绰' },
    { text: '初宿长淮上，破镜出云明', author: '何逊' },
    { text: '今夕千余里，双蛾映水生', author: '何逊' },
    { text: '既能明似镜，何用曲如钩', author: '骆宾王' },
  ],
  上弦月: [
    { text: '峨眉山月半轮秋，影入平羌江水流', author: '李白' },
    { text: '如月之恒，如日之升', author: '诗经' },
    { text: '上弦如半璧，初魄似蛾眉', author: '王褒' },
    { text: '月色当秋夜，斜晖映薄帷', author: '王褒' },
    { text: '渡云光忽驶，中天影更迟', author: '王褒' },
    { text: '移榻坐庭阴，初弦时复临', author: '刘瑗' },
    { text: '月光移数尺，方知夜已深', author: '刘瑗' },
    { text: '客行钩始悬，此夜月将弦', author: '鲍泉' },
    { text: '川澄光尚动，流驶影难圆', author: '鲍泉' },
    { text: '光细弦欲上，影斜轮未安', author: '杜甫' },
  ],
  盈凸月: [
    { text: '轮光缺不半，扇影出将圆', author: '刘孝绰' },
    { text: '流光照漭瀁，波动映沦涟', author: '刘孝绰' },
    { text: '星流时入晕，桂长欲侵轮', author: '庾肩吾' },
    { text: '渡河光不湿，移轮辙讵开', author: '庾肩吾' },
    { text: '初生似玉钩，裁满如团扇', author: '虞羲' },
    { text: '影丽高台端，光入长门殿', author: '虞羲' },
    { text: '小时不识月，呼作白玉盘', author: '李白' },
    { text: '又疑瑶台镜，飞在青云端', author: '李白' },
    { text: '形同七子镜，影类九秋霜', author: '萧纲' },
    { text: '江流宛转绕芳甸，月照花林皆似霰', author: '张若虚' },
  ],
  满月: [
    { text: '海上生明月，天涯共此时', author: '张九龄' },
    { text: '床前明月光，疑是地上霜', author: '李白' },
    { text: '明月出天山，苍茫云海间', author: '李白' },
    { text: '明月松间照，清泉石上流', author: '王维' },
    { text: '露从今夜白，月是故乡明', author: '杜甫' },
    { text: '满月飞明镜，归心折大刀', author: '杜甫' },
    { text: '中庭地白树栖鸦，冷露无声湿桂花', author: '王建' },
    { text: '春江潮水连海平，海上明月共潮生', author: '张若虚' },
    { text: '明月几时有，把酒问青天', author: '苏轼' },
    { text: '月明星稀，乌鹊南飞', author: '曹操' },
  ],
  亏凸月: [
    { text: '三五明月满，四五蟾兔缺', author: '佚名' },
    { text: '昨三五兮既满，今二八兮将缺', author: '谢灵运' },
    { text: '浮云褰兮收泛滟，明舒照兮殊皎洁', author: '谢灵运' },
    { text: '人有悲欢离合，月有阴晴圆缺', author: '苏轼' },
    { text: '三五二八时，千里与君同', author: '鲍照' },
    { text: '初生欲缺虚惆怅，未必圆时即有情', author: '李商隐' },
    { text: '过水穿楼触处明，藏人带树远含清', author: '李商隐' },
    { text: '一轮秋影转金波，飞镜又重磨', author: '辛弃疾' },
    { text: '今人不见古时月，今月曾经照古人', author: '李白' },
    { text: '明月照高楼，流光正徘徊', author: '曹植' },
  ],
  下弦月: [
    { text: '四更山吐月，残夜水明楼', author: '杜甫' },
    { text: '尘匣元开镜，风帘自上钩', author: '杜甫' },
    { text: '兔应疑鹤发，蟾亦恋貂裘', author: '杜甫' },
    { text: '斟酌姮娥寡，天寒耐九秋', author: '杜甫' },
    { text: '河汉东西阴，清光此夜出', author: '萧子范' },
    { text: '入帐华珠被，斜筵照宝瑟', author: '萧子范' },
    { text: '霜惨庭上兰，风鸣檐下橘', author: '萧子范' },
    { text: '洞房殊未晓，清光信悠哉', author: '沈约' },
    { text: '安寝北堂上，明月入我牖', author: '陆机' },
    { text: '照之有余辉，揽之不盈手', author: '陆机' },
  ],
  残月: [
    { text: '今宵酒醒何处，杨柳岸晓风残月', author: '柳永' },
    { text: '残月脸边明，别泪临清晓', author: '牛希济' },
    { text: '春山烟欲收，天淡星稀小', author: '牛希济' },
    { text: '鸡声茅店月，人迹板桥霜', author: '温庭筠' },
    { text: '缺月挂疏桐，漏断人初静', author: '苏轼' },
    { text: '月落乌啼霜满天，江枫渔火对愁眠', author: '张继' },
    { text: '云母屏风烛影深，长河渐落晓星沉', author: '李商隐' },
    { text: '嫦娥应悔偷灵药，碧海青天夜夜心', author: '李商隐' },
    { text: '江水流春去欲尽，江潭落月复西斜', author: '张若虚' },
    { text: '靡靡露方垂，晖晖光稍没', author: '虞骞' },
  ],
};

/**
 * Lines written for 中秋 itself. Used only on 农历八月十五,
 * in place of the phase pools.
 */
export const MID_AUTUMN_POEMS = [
  { text: '明月几时有，把酒问青天', author: '苏轼' },
  { text: '起舞弄清影，何似在人间', author: '苏轼' },
  { text: '不应有恨，何事长向别时圆', author: '苏轼' },
  { text: '但愿人长久，千里共婵娟', author: '苏轼' },
  { text: '暮云收尽溢清寒，银汉无声转玉盘', author: '苏轼' },
  { text: '此生此夜不长好，明月明年何处看', author: '苏轼' },
  { text: '今夜月明人尽望，不知秋思落谁家', author: '王建' },
  { text: '一轮秋影转金波，飞镜又重磨', author: '辛弃疾' },
  { text: '乘风好去，长空万里，直下看山河', author: '辛弃疾' },
  { text: '斫去桂婆娑，人道是清光更多', author: '辛弃疾' },
];

function pickPoem(list, avoidText) {
  if (!list?.length) return null;
  let index = Math.floor(Math.random() * list.length);
  if (avoidText && list.length > 1 && list[index].text === avoidText) {
    index = (index + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  }
  return list[index];
}

export function poemForPhase(name, avoidText) {
  return pickPoem(PHASE_POEMS[name], avoidText);
}

export function poemForMidAutumn(avoidText) {
  return pickPoem(MID_AUTUMN_POEMS, avoidText);
}
