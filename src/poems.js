/**
 * Complete public-domain poems for the eight phase names.
 * Texts follow received editions in simplified characters:
 * 毛诗, 文选, 全唐诗, and the usual ci texts (东坡乐府, 稼轩词, and so on).
 * Nothing here is a cut half-line, and nothing is invented.
 *
 * Single mode draws one poem from that phase's pool of ten.
 * Dual mode draws one shared poem from the ordered pair
 * 左相|右相 (8×8 = 64 pools, ten each). The same poem object
 * may sit in several pools; within one pool the texts are unique.
 *
 * 中秋 rule: if either date is 农历八月十五, ignore the phase
 * pair and draw from the ten Mid-Autumn poems (midAutumn: true).
 * 《生查子·元夕》 follows the traditional 欧阳修 attribution;
 * the same text also circulates under 朱淑真.
 */

export const PHASES = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];

function piece(entry) {
  return { ...entry, text: entry.lines.join('\n') };
}

const LIBRARY = [
  piece({
    id: 'lulun-saixia',
    title: '塞下曲',
    author: '卢纶',
    lines: ['月黑雁飞高，单于夜遁逃。', '欲将轻骑逐，大雪满弓刀。'],
    phases: ['新月'],
  }),
  piece({
    id: 'wangwei-niaoming',
    title: '鸟鸣涧',
    author: '王维',
    lines: ['人闲桂花落，夜静春山空。', '月出惊山鸟，时鸣春涧中。'],
    phases: ['新月', '蛾眉月'],
  }),
  piece({
    id: 'shijing-yuechu',
    title: '月出',
    author: '诗经',
    lines: [
      '月出皎兮，佼人僚兮。舒窈纠兮，劳心悄兮。',
      '月出皓兮，佼人懰兮。舒懮受兮，劳心慅兮。',
      '月出照兮，佼人燎兮。舒夭绍兮，劳心惨兮。',
    ],
    phases: ['新月', '蛾眉月', '满月'],
  }),
  piece({
    id: 'dufu-chuyue',
    title: '初月',
    author: '杜甫',
    lines: [
      '光细弦欲上，影斜轮未安。',
      '微升古塞外，已隐暮云端。',
      '河汉不改色，关山空自寒。',
      '庭前有白露，暗满菊花团。',
    ],
    phases: ['新月', '蛾眉月', '上弦月'],
  }),
  piece({
    id: 'baijuyi-mujiang',
    title: '暮江吟',
    author: '白居易',
    lines: ['一道残阳铺水中，半江瑟瑟半江红。', '可怜九月初三夜，露似真珠月似弓。'],
    phases: ['蛾眉月'],
  }),
  piece({
    id: 'liyu-xiangjianhuan',
    title: '相见欢',
    author: '李煜',
    lines: ['无言独上西楼，月如钩。寂寞梧桐深院锁清秋。', '剪不断，理还乱，是离愁。别是一般滋味在心头。'],
    phases: ['蛾眉月', '残月'],
  }),
  piece({
    id: 'menghaoran-jiande',
    title: '宿建德江',
    author: '孟浩然',
    lines: ['移舟泊烟渚，日暮客愁新。', '野旷天低树，江清月近人。'],
    phases: ['蛾眉月', '上弦月'],
  }),
  piece({
    id: 'libai-emei',
    title: '峨眉山月歌',
    author: '李白',
    lines: ['峨眉山月半轮秋，影入平羌江水流。', '夜发清溪向三峡，思君不见下渝州。'],
    phases: ['上弦月', '下弦月', '蛾眉月'],
  }),
  piece({
    id: 'liufangping-yueye',
    title: '月夜',
    author: '刘方平',
    lines: ['更深月色半人家，北斗阑干南斗斜。', '今夜偏知春气暖，虫声新透绿窗纱。'],
    phases: ['上弦月', '下弦月'],
  }),
  piece({
    id: 'libai-jingyesi',
    title: '静夜思',
    author: '李白',
    lines: ['床前明月光，疑是地上霜。', '举头望明月，低头思故乡。'],
    phases: ['满月', '盈凸月'],
    midAutumn: true,
  }),
  piece({
    id: 'libai-yujie',
    title: '玉阶怨',
    author: '李白',
    lines: ['玉阶生白露，夜久侵罗袜。', '却下水晶帘，玲珑望秋月。'],
    phases: ['满月', '盈凸月'],
  }),
  piece({
    id: 'libai-qiuge',
    title: '子夜吴歌·秋歌',
    author: '李白',
    lines: ['长安一片月，万户捣衣声。', '秋风吹不尽，总是玉关情。', '何日平胡虏，良人罢远征。'],
    phases: ['满月'],
  }),
  piece({
    id: 'libai-yuexia',
    title: '月下独酌·其一',
    author: '李白',
    lines: [
      '花间一壶酒，独酌无相亲。',
      '举杯邀明月，对影成三人。',
      '月既不解饮，影徒随我身。',
      '暂伴月将影，行乐须及春。',
      '我歌月徘徊，我舞影零乱。',
      '醒时同交欢，醉后各分散。',
      '永结无情游，相期邈云汉。',
    ],
    phases: ['满月'],
    midAutumn: true,
  }),
  piece({
    id: 'libai-longbiao',
    title: '闻王昌龄左迁龙标遥有此寄',
    author: '李白',
    lines: ['杨花落尽子规啼，闻道龙标过五溪。', '我寄愁心与明月，随君直到夜郎西。'],
    phases: ['满月', '亏凸月'],
  }),
  piece({
    id: 'libai-guanshan',
    title: '关山月',
    author: '李白',
    lines: [
      '明月出天山，苍茫云海间。',
      '长风几万里，吹度玉门关。',
      '汉下白登道，胡窥青海湾。',
      '由来征战地，不见有人还。',
      '戍客望边色，思归多苦颜。',
      '高楼当此夜，叹息未应闲。',
    ],
    phases: ['满月', '亏凸月'],
  }),
  piece({
    id: 'libai-baijiu',
    title: '把酒问月',
    author: '李白',
    lines: [
      '青天有月来几时？我今停杯一问之。',
      '人攀明月不可得，月行却与人相随。',
      '皎如飞镜临丹阙，绿烟灭尽清辉发。',
      '但见宵从海上来，宁知晓向云间没。',
      '白兔捣药秋复春，嫦娥孤栖与谁邻？',
      '今人不见古时月，今月曾经照古人。',
      '古人今人若流水，共看明月皆如此。',
      '唯愿当歌对酒时，月光长照金樽里。',
    ],
    phases: ['满月', '亏凸月'],
  }),
  piece({
    id: 'libai-gulang',
    title: '古朗月行',
    author: '李白',
    lines: [
      '小时不识月，呼作白玉盘。',
      '又疑瑶台镜，飞在白云端。',
      '仙人垂两足，桂树作团团。',
      '白兔捣药成，问言与谁餐。',
      '蟾蜍蚀圆影，大明夜已残。',
      '羿昔落九乌，天人清且安。',
      '阴精此沦惑，去去不足观。',
      '忧来其如何，凄怆摧心肝。',
    ],
    phases: ['盈凸月', '亏凸月', '残月'],
  }),
  piece({
    id: 'libai-jingmen',
    title: '渡荆门送别',
    author: '李白',
    lines: ['渡远荆门外，来从楚国游。', '山随平野尽，江入大荒流。', '月下飞天镜，云生结海楼。', '仍怜故乡水，万里送行舟。'],
    phases: ['满月', '盈凸月'],
  }),
  piece({
    id: 'libai-kuchao',
    title: '哭晁卿衡',
    author: '李白',
    lines: ['日本晁卿辞帝都，征帆一片绕蓬壶。', '明月不归沉碧海，白云愁色满苍梧。'],
    phases: ['残月', '下弦月'],
  }),
  piece({
    id: 'wangwei-shanju',
    title: '山居秋暝',
    author: '王维',
    lines: ['空山新雨后，天气晚来秋。', '明月松间照，清泉石上流。', '竹喧归浣女，莲动下渔舟。', '随意春芳歇，王孙自可留。'],
    phases: ['满月', '盈凸月'],
  }),
  piece({
    id: 'wangchangling-chusai',
    title: '出塞',
    author: '王昌龄',
    lines: ['秦时明月汉时关，万里长征人未还。', '但使龙城飞将在，不教胡马度阴山。'],
    phases: ['满月', '亏凸月'],
  }),
  piece({
    id: 'wangjian-shiwu',
    title: '十五夜望月寄杜郎中',
    author: '王建',
    lines: ['中庭地白树栖鸦，冷露无声湿桂花。', '今夜月明人尽望，不知秋思落谁家。'],
    phases: ['满月'],
    midAutumn: true,
  }),
  piece({
    id: 'zhangjiuling-wangyue',
    title: '望月怀远',
    author: '张九龄',
    lines: ['海上生明月，天涯共此时。', '情人怨遥夜，竟夕起相思。', '灭烛怜光满，披衣觉露滋。', '不堪盈手赠，还寝梦佳期。'],
    phases: ['满月', '盈凸月'],
    midAutumn: true,
  }),
  piece({
    id: 'dufu-yueye',
    title: '月夜',
    author: '杜甫',
    lines: ['今夜鄜州月，闺中只独看。', '遥怜小儿女，未解忆长安。', '香雾云鬟湿，清辉玉臂寒。', '何时倚虚幌，双照泪痕干。'],
    phases: ['满月'],
    midAutumn: true,
  }),
  piece({
    id: 'dufu-shedi',
    title: '月夜忆舍弟',
    author: '杜甫',
    lines: ['戍鼓断人行，边秋一雁声。', '露从今夜白，月是故乡明。', '有弟皆分散，无家问死生。', '寄书长不达，况乃未休兵。'],
    phases: ['满月', '亏凸月'],
  }),
  piece({
    id: 'dufu-lvye',
    title: '旅夜书怀',
    author: '杜甫',
    lines: ['细草微风岸，危樯独夜舟。', '星垂平野阔，月涌大江流。', '名岂文章著，官应老病休。', '飘飘何所似，天地一沙鸥。'],
    phases: ['满月', '盈凸月'],
  }),
  piece({
    id: 'dufu-yueyuan',
    title: '月圆',
    author: '杜甫',
    lines: ['孤月当楼满，寒江动夜扉。', '委波金不定，照席绮逾依。', '未缺空山静，高悬列宿稀。', '故园松桂发，万里共清辉。'],
    phases: ['满月'],
  }),
  piece({
    id: 'dufu-bayue',
    title: '八月十五夜月',
    author: '杜甫',
    lines: ['满目飞明镜，归心折大刀。', '转蓬行地远，攀桂仰天高。', '水路疑霜雪，林栖见羽毛。', '此时瞻白兔，直欲数秋毫。'],
    phases: ['满月'],
    midAutumn: true,
  }),
  piece({
    id: 'dufu-bayue-xia',
    title: '八月十五夜月·其二',
    author: '杜甫',
    lines: ['稍下巫山峡，犹衔白帝城。', '气沉全浦暗，轮仄半楼明。', '刁斗皆催晓，蟾蜍且自倾。', '张弓倚残魄，不独汉家营。'],
    phases: ['亏凸月', '下弦月', '残月'],
  }),
  piece({
    id: 'dumu-yangzhou',
    title: '寄扬州韩绰判官',
    author: '杜牧',
    lines: ['青山隐隐水迢迢，秋尽江南草未凋。', '二十四桥明月夜，玉人何处教吹箫。'],
    phases: ['满月'],
  }),
  piece({
    id: 'dumu-qinhuai',
    title: '泊秦淮',
    author: '杜牧',
    lines: ['烟笼寒水月笼沙，夜泊秦淮近酒家。', '商女不知亡国恨，隔江犹唱后庭花。'],
    phases: ['亏凸月', '残月'],
  }),
  piece({
    id: 'lishangyin-shuangyue',
    title: '霜月',
    author: '李商隐',
    lines: ['初闻征雁已无蝉，百尺楼高水接天。', '青女素娥俱耐冷，月中霜里斗婵娟。'],
    phases: ['满月', '盈凸月'],
  }),
  piece({
    id: 'lishangyin-change',
    title: '嫦娥',
    author: '李商隐',
    lines: ['云母屏风烛影深，长河渐落晓星沉。', '嫦娥应悔偷灵药，碧海青天夜夜心。'],
    phases: ['残月', '下弦月'],
  }),
  piece({
    id: 'liuyuxi-shitou',
    title: '石头城',
    author: '刘禹锡',
    lines: ['山围故国周遭在，潮打空城寂寞回。', '淮水东边旧时月，夜深还过女墙来。'],
    phases: ['亏凸月', '残月'],
  }),
  piece({
    id: 'yuliangshi-chunshan',
    title: '春山夜月',
    author: '于良史',
    lines: ['春山多胜事，赏玩夜忘归。', '掬水月在手，弄花香满衣。', '兴来无远近，欲去惜芳菲。', '南望鸣钟处，楼台深翠微。'],
    phases: ['满月', '盈凸月'],
  }),
  piece({
    id: 'zhangmi-jiren',
    title: '寄人',
    author: '张泌',
    lines: ['别梦依依到谢家，小廊回合曲阑斜。', '多情只有春庭月，犹为离人照落花。'],
    phases: ['亏凸月', '满月'],
  }),
  piece({
    id: 'zhangji-fengqiao',
    title: '枫桥夜泊',
    author: '张继',
    lines: ['月落乌啼霜满天，江枫渔火对愁眠。', '姑苏城外寒山寺，夜半钟声到客船。'],
    phases: ['残月'],
  }),
  piece({
    id: 'wentingyun-shangshan',
    title: '商山早行',
    author: '温庭筠',
    lines: ['晨起动征铎，客行悲故乡。', '鸡声茅店月，人迹板桥霜。', '槲叶落山路，枳花明驿墙。', '因思杜陵梦，凫雁满回塘。'],
    phases: ['残月'],
  }),
  piece({
    id: 'chenziang-chunye',
    title: '春夜别友人',
    author: '陈子昂',
    lines: ['银烛吐青烟，金樽对绮筵。', '离堂思琴瑟，别路绕山川。', '明月隐高树，长河没晓天。', '悠悠洛阳道，此会在何年。'],
    phases: ['残月'],
  }),
  piece({
    id: 'cuitu-chunxi',
    title: '春夕',
    author: '崔涂',
    lines: ['水流花谢两无情，送尽东风过楚城。', '蝴蝶梦中家万里，子规枝上月三更。'],
    phases: ['残月', '下弦月'],
  }),
  piece({
    id: 'luji-nimingyue',
    title: '拟明月何皎皎',
    author: '陆机',
    lines: ['安寝北堂上，明月入我牖。', '照之有余辉，揽之不盈手。', '凉风绕曲房，寒蝉鸣高柳。', '踟蹰感节物，我行永已久。', '游宦会无成，离思难常守。'],
    phases: ['满月', '盈凸月'],
  }),
  piece({
    id: 'gushi-mingyue',
    title: '明月何皎皎',
    author: '古诗十九首',
    lines: ['明月何皎皎，照我罗床帏。', '忧愁不能寐，揽衣起徘徊。', '客行虽云乐，不如早旋归。', '出户独彷徨，愁思当告谁。', '引领还入房，泪下沾裳衣。'],
    phases: ['满月'],
  }),
  piece({
    id: 'caozhi-qiai',
    title: '七哀',
    author: '曹植',
    lines: [
      '明月照高楼，流光正徘徊。',
      '上有愁思妇，悲叹有余哀。',
      '借问叹者谁，言是客子妻。',
      '君行逾十年，孤妾常独栖。',
      '君若清路尘，妾若浊水泥。',
      '浮沉各异势，会合何时谐？',
      '愿为西南风，长逝入君怀。',
      '君怀良不开，贱妾当何依？',
    ],
    phases: ['满月'],
  }),
  piece({
    id: 'caocao-duange',
    title: '短歌行',
    author: '曹操',
    lines: [
      '对酒当歌，人生几何！譬如朝露，去日苦多。',
      '慨当以慷，忧思难忘。何以解忧？唯有杜康。',
      '青青子衿，悠悠我心。但为君故，沉吟至今。',
      '呦呦鹿鸣，食野之苹。我有嘉宾，鼓瑟吹笙。',
      '明明如月，何时可掇？忧从中来，不可断绝。',
      '越陌度阡，枉用相存。契阔谈宴，心念旧恩。',
      '月明星稀，乌鹊南飞。绕树三匝，何枝可依？',
      '山不厌高，海不厌深。周公吐哺，天下归心。',
    ],
    phases: ['满月', '盈凸月'],
  }),
  piece({
    id: 'pirixiu-guizi',
    title: '天竺寺八月十五日夜桂子',
    author: '皮日休',
    lines: ['玉颗珊珊下月轮，殿前拾得露华新。', '至今不会天中事，应是嫦娥掷与人。'],
    phases: ['满月'],
    midAutumn: true,
  }),
  piece({
    id: 'wanganshi-guazhou',
    title: '泊船瓜洲',
    author: '王安石',
    lines: ['京口瓜洲一水间，钟山只隔数重山。', '春风又绿江南岸，明月何时照我还。'],
    phases: ['满月'],
  }),
  piece({
    id: 'sushi-yangguan',
    title: '阳关曲·中秋月',
    author: '苏轼',
    lines: ['暮云收尽溢清寒，银汉无声转玉盘。', '此生此夜不长好，明月明年何处看。'],
    phases: ['满月'],
    midAutumn: true,
  }),
  piece({
    id: 'sushi-shuidiao',
    title: '水调歌头·丙辰中秋',
    author: '苏轼',
    lines: [
      '明月几时有？把酒问青天。不知天上宫阙，今夕是何年。',
      '我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间。',
      '转朱阁，低绮户，照无眠。不应有恨，何事长向别时圆？',
      '人有悲欢离合，月有阴晴圆缺，此事古难全。但愿人长久，千里共婵娟。',
    ],
    phases: ['满月'],
    midAutumn: true,
  }),
  piece({
    id: 'sushi-jiangcheng',
    title: '江城子·乙卯正月二十日夜记梦',
    author: '苏轼',
    lines: [
      '十年生死两茫茫，不思量，自难忘。千里孤坟，无处话凄凉。纵使相逢应不识，尘满面，鬓如霜。',
      '夜来幽梦忽还乡，小轩窗，正梳妆。相顾无言，惟有泪千行。料得年年肠断处，明月夜，短松冈。',
    ],
    phases: ['满月'],
  }),
  piece({
    id: 'sushi-busuan',
    title: '卜算子·黄州定慧院寓居作',
    author: '苏轼',
    lines: ['缺月挂疏桐，漏断人初静。谁见幽人独往来，缥缈孤鸿影。', '惊起却回头，有恨无人省。拣尽寒枝不肯栖，寂寞沙洲冷。'],
    phases: ['亏凸月', '下弦月', '残月'],
  }),
  piece({
    id: 'ouyangxiu-shengcha',
    title: '生查子·元夕',
    author: '欧阳修',
    lines: ['去年元夜时，花市灯如昼。月上柳梢头，人约黄昏后。', '今年元夜时，月与灯依旧。不见去年人，泪湿春衫袖。'],
    phases: ['满月'],
  }),
  piece({
    id: 'yanshu-dielian',
    title: '蝶恋花',
    author: '晏殊',
    lines: [
      '槛菊愁烟兰泣露，罗幕轻寒，燕子双飞去。明月不谙离恨苦，斜光到晓穿朱户。',
      '昨夜西风凋碧树，独上高楼，望尽天涯路。欲寄彩笺兼尺素，山长水阔知何处。',
    ],
    phases: ['满月', '亏凸月'],
  }),
  piece({
    id: 'yanjidao-linjiang',
    title: '临江仙',
    author: '晏几道',
    lines: [
      '梦后楼台高锁，酒醒帘幕低垂。去年春恨却来时。落花人独立，微雨燕双飞。',
      '记得小蘋初见，两重心字罗衣。琵琶弦上说相思。当时明月在，曾照彩云归。',
    ],
    phases: ['满月', '亏凸月'],
  }),
  piece({
    id: 'liuyong-yulin',
    title: '雨霖铃',
    author: '柳永',
    lines: [
      '寒蝉凄切，对长亭晚，骤雨初歇。都门帐饮无绪，留恋处，兰舟催发。执手相看泪眼，竟无语凝噎。念去去，千里烟波，暮霭沉沉楚天阔。',
      '多情自古伤离别，更那堪，冷落清秋节。今宵酒醒何处？杨柳岸，晓风残月。此去经年，应是良辰好景虚设。便纵有千种风情，更与何人说？',
    ],
    phases: ['残月'],
  }),
  piece({
    id: 'fanzhongyan-yujie',
    title: '御街行·秋日怀旧',
    author: '范仲淹',
    lines: [
      '纷纷坠叶飘香砌。夜寂静，寒声碎。真珠帘卷玉楼空，天淡银河垂地。年年今夜，月华如练，长是人千里。',
      '愁肠已断无由醉。酒未到，先成泪。残灯明灭枕头欹，谙尽孤眠滋味。都来此事，眉间心上，无计相回避。',
    ],
    phases: ['满月'],
  }),
  piece({
    id: 'zhoubangyan-zaoxing',
    title: '蝶恋花·早行',
    author: '周邦彦',
    lines: [
      '月皎惊乌栖不定，更漏将残，辘轳牵金井。唤起两眸清炯炯。泪花落枕红绵冷。',
      '执手霜风吹鬓影，去意徊徨，别语愁难听。楼上阑干横斗柄，露寒人远鸡相应。',
    ],
    phases: ['残月', '下弦月'],
  }),
  piece({
    id: 'liqingzhao-yijian',
    title: '一剪梅',
    author: '李清照',
    lines: [
      '红藕香残玉簟秋。轻解罗裳，独上兰舟。云中谁寄锦书来，雁字回时，月满西楼。',
      '花自飘零水自流。一种相思，两处闲愁。此情无计可消除，才下眉头，却上心头。',
    ],
    phases: ['满月'],
  }),
  piece({
    id: 'zhangxiaoxiang-dongting',
    title: '念奴娇·过洞庭',
    author: '张孝祥',
    lines: [
      '洞庭青草，近中秋，更无一点风色。玉鉴琼田三万顷，着我扁舟一叶。素月分辉，明河共影，表里俱澄澈。悠然心会，妙处难与君说。',
      '应念岭海经年，孤光自照，肝胆皆冰雪。短发萧骚襟袖冷，稳泛沧浪空阔。尽挹西江，细斟北斗，万象为宾客。扣舷独啸，不知今夕何夕。',
    ],
    phases: ['满月', '盈凸月'],
  }),
  piece({
    id: 'xinqiji-xijiang',
    title: '西江月·夜行黄沙道中',
    author: '辛弃疾',
    lines: ['明月别枝惊鹊，清风半夜鸣蝉。稻花香里说丰年，听取蛙声一片。', '七八个星天外，两三点雨山前。旧时茅店社林边，路转溪桥忽见。'],
    phases: ['满月', '盈凸月'],
  }),
  piece({
    id: 'xinqiji-taichang',
    title: '太常引·建康中秋夜为吕叔潜赋',
    author: '辛弃疾',
    lines: ['一轮秋影转金波，飞镜又重磨。把酒问姮娥：被白发、欺人奈何？', '乘风好去，长空万里，直下看山河。斫去桂婆娑，人道是、清光更多。'],
    phases: ['满月'],
    midAutumn: true,
  }),
  piece({
    id: 'niuxiji-shengcha',
    title: '生查子',
    author: '牛希济',
    lines: ['春山烟欲收，天淡星稀小。残月脸边明，别泪临清晓。', '语已多，情未了，回首犹重道。记得绿罗裙，处处怜芳草。'],
    phases: ['残月'],
  }),
].map((poem) => poem);

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
    if (seen.has(poem.text)) continue;
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
  return takeUnique(ranked(name, name), 10);
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
  };
}
