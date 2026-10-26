/**
 * One short public-domain line for each phase, not a whole poem.
 * Couplets follow the received texts (毛诗, 楚辞, 文选, 玉台, 艺文类聚, 全唐诗, 全宋词).
 *
 * Single mode draws from the twenty lines whose first phase is that name.
 * 新月 is the dark moon (朔), so its lines say 月黑 or 朔, not the first crescent.
 * The crescent hook belongs to 蛾眉月. Dual mode does not show a line.
 *
 * 中秋: on 农历八月十五 in single mode, use the ten festival lines.
 */

export const PHASES = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];

function line(id, text, author, phases, extra = {}) {
  return { id, text, author, phases, ...extra };
}

const LIBRARY = [
  line('lulun-yuehei', '月黑雁飞高，单于夜遁逃', '卢纶', ['新月'], { core: true }),
  line('shijing-shuoyue', '十月之交，朔月辛卯', '诗经', ['新月'], { core: true }),
  line('quyuan-yeguang', '夜光何德，死则又育', '屈原', ['新月'], { core: true }),
  line('zhashenxing-yuehei', '月黑见渔灯，孤光一点萤', '查慎行', ['新月'], { core: true }),
  line('zhashenxing-manhe', '微微风簇浪，散作满河星', '查慎行', ['新月'], { core: true }),
  line('zhenggu-lihua', '春阴妨柳絮，月黑见梨花', '郑谷', ['新月'], { core: true }),
  line('wangchangling-yuehei', '其时月黑猿啾啾，微雨沾衣令人愁', '王昌龄', ['新月'], { core: true }),
  line('baijuyi-yuehei', '昼伏宵行经大漠，云阴月黑风沙恶', '白居易', ['新月'], { core: true }),
  line('baijuyi-qingzhong', '惊藏青冢寒草疏，偷渡黄河夜冰薄', '白居易', ['新月'], { core: true }),
  line('cuidrong-yuehei', '深山月黑风雨夜，欲近晓天啼一声', '崔道融', ['新月'], { core: true }),
  line('liqunyu-yuehei', '是时月黑天，四野烟雨深', '李群玉', ['新月'], { core: true }),
  line('liqunyu-shengli', '如闻生离哭，其声痛人心', '李群玉', ['新月'], { core: true }),
  line('liqunyu-qiaoqiao', '悄悄夜正长，空山响哀音', '李群玉', ['新月'], { core: true }),
  line('fanchengda-yuehei', '月黑雁犹去，灯寒人更愁', '范成大', ['新月'], { core: true }),
  line('litingrui-yuehei', '阴陵道隘，月黑云如垒', '黎廷瑞', ['新月'], { core: true }),
  line('zhouzizhi-yuehei', '月黑波翻江浩渺，扁舟系缆垂杨杪', '周紫芝', ['新月'], { core: true }),
  line('yuanzhen-xinshuo', '蓂叶标新朔，霜豪引细辉', '元稹', ['新月'], { core: true }),
  line('yuanzhen-yuanming', '须遣圆明尽，良嗟造化非', '元稹', ['新月'], { core: true }),
  line('yuanzhen-chantu', '氛埃谁定灭，蟾兔杳难希', '元稹', ['新月'], { core: true }),
  line('libai-yinjing', '阴精此沦惑，去去不足观', '李白', ['新月'], { core: true }),

  line('baijuyi-chusan', '可怜九月初三夜，露似真珠月似弓', '白居易', ['蛾眉月'], { core: true }),
  line('miaoshizi-weigong', '初月如弓未上弦，分明挂在碧霄边', '缪氏子', ['蛾眉月'], { core: true }),
  line('miaoshizi-emei', '时人莫道蛾眉小，三五团圆照满天', '缪氏子', ['蛾眉月'], { core: true }),
  line('baozhao-yugou', '始见西南楼，纤纤如玉钩', '鲍照', ['蛾眉月'], { core: true }),
  line('baozhao-emei', '未映东北墀，娟娟似蛾眉', '鲍照', ['蛾眉月'], { core: true }),
  line('baozhao-zhulong', '蛾眉蔽珠栊，玉钩隔琐窗', '鲍照', ['蛾眉月'], { core: true }),
  line('liyu-yuegou', '无言独上西楼，月如钩', '李煜', ['蛾眉月'], { core: true }),
  line('yuqian-yutan', '泠泠玉潭水，映见蛾眉月', '虞骞', ['蛾眉月'], { core: true }),
  line('liuxiaochuo-xianxian', '秋月始纤纤，微光垂步檐', '刘孝绰', ['蛾眉月'], { core: true }),
  line('liuyuan-yugou', '仙宫云箔卷，露出玉帘钩', '刘瑗', ['蛾眉月'], { core: true }),
  line('luobinwang-qugou', '既能明似镜，何用曲如钩', '骆宾王', ['蛾眉月'], { core: true }),
  line('hexun-pojing', '初宿长淮上，破镜出云明', '何逊', ['蛾眉月'], { core: true }),
  line('hexun-shuange', '今夕千余里，双蛾映水生', '何逊', ['蛾眉月'], { core: true }),
  line('dufu-weisheng', '微升古塞外，已隐暮云端', '杜甫', ['蛾眉月'], { core: true }),
  line('yuanzhen-xugong', '凉魄潭空洞，虚弓雁畏威', '元稹', ['蛾眉月'], { core: true }),
  line('yuanzhen-baimei', '白眉惊半隐，虹势讶全微', '元稹', ['蛾眉月'], { core: true }),
  line('shijujian-emei', '澹扫蛾眉雨后天，天容澄洁称婵娟', '释居简', ['蛾眉月'], { core: true }),
  line('shijujian-weishang', '弦虽未上终持满，璧反胡为尚不全', '释居简', ['蛾眉月'], { core: true }),
  line('daishulun-rumei', '凉月如眉挂柳湾，越中山色镜中看', '戴叔伦', ['蛾眉月'], { core: true }),
  line('lihe-yugou', '大漠沙如雪，燕山月似钩', '李贺', ['蛾眉月'], { core: true }),

  line('libai-banlun', '峨眉山月半轮秋，影入平羌江水流', '李白', ['上弦月'], { core: true }),
  line('wangbao-banbi', '上弦如半璧，初魄似蛾眉', '王褒', ['上弦月'], { core: true }),
  line('wangbao-qiuye', '月色当秋夜，斜晖映薄帷', '王褒', ['上弦月'], { core: true }),
  line('liuyuan-chuxian', '移榻坐庭阴，初弦时复临', '刘瑗', ['上弦月'], { core: true }),
  line('liuyuan-yueguang', '月光移数尺，方知夜已深', '刘瑗', ['上弦月'], { core: true }),
  line('baoquan-gouxuan', '客行钩始悬，此夜月将弦', '鲍泉', ['上弦月'], { core: true }),
  line('baoquan-chuanying', '川澄光尚动，流驶影难圆', '鲍泉', ['上弦月'], { core: true }),
  line('baoquan-cangcang', '苍苍随远色，瀁瀁逐漪涟', '鲍泉', ['上弦月'], { core: true }),
  line('dufu-xianyu', '光细弦欲上，影斜轮未安', '杜甫', ['上弦月'], { core: true }),
  line('dufu-liushang', '万里瞿塘峡，春来六上弦', '杜甫', ['上弦月'], { core: true }),
  line('dufu-anshi', '时时开暗室，故故满青天', '杜甫', ['上弦月'], { core: true }),
  line('dufu-wuque', '南飞有乌鹊，夜久落江边', '杜甫', ['上弦月'], { core: true }),
  line('dufu-jiangguang', '江月光于水，高楼思杀人', '杜甫', ['上弦月'], { core: true }),
  line('dufu-yinhe', '玉露团清影，银河没半轮', '杜甫', ['上弦月'], { core: true }),
  line('dufu-jinxiu', '谁家挑锦字，烛灭翠眉颦', '杜甫', ['上弦月'], { core: true }),
  line('yuanzhen-shangxian', '上弦何汲汲，佳色转依依', '元稹', ['上弦月'], { core: true }),
  line('shijing-yueheng', '如月之恒，如日之升', '诗经', ['上弦月'], { core: true }),
  line('wufei-banlun', '半轮斜月挂岩边，见者多应叹未圆', '吴芾', ['上弦月'], { core: true }),
  line('liuxiaowei-weiyuan', '鹊飞空绕树，月轮殊未圆', '刘孝威', ['上弦月'], { core: true }),
  line('liuxiaowei-change', '嫦娥望不出，桂枝稍隐残', '刘孝威', ['上弦月'], { core: true }),

  line('liuxiaochuo-lunguang', '轮光缺不半，扇影出将圆', '刘孝绰', ['盈凸月'], { core: true }),
  line('liuxiaochuo-liuguang', '流光照漭瀁，波动映沦涟', '刘孝绰', ['盈凸月'], { core: true }),
  line('yuxi-tuanshan', '初生似玉钩，裁满如团扇', '虞羲', ['盈凸月'], { core: true }),
  line('yuxi-gaotai', '影丽高台端，光入长门殿', '虞羲', ['盈凸月'], { core: true }),
  line('yuxi-jinbo', '泛滥浮阴来，金波时不见', '虞羲', ['盈凸月'], { core: true }),
  line('yuanzhen-pojing', '绮幕残灯敛，妆楼破镜飞', '元稹', ['盈凸月'], { core: true }),
  line('yuanzhen-linglong', '玲珑穿竹树，岑寂思屏帏', '元稹', ['盈凸月'], { core: true }),
  line('yuanzhen-guijiang', '坐爱规将合，行看望已几', '元稹', ['盈凸月'], { core: true }),
  line('yujianwu-xingliu', '星流时入晕，桂长欲侵轮', '庾肩吾', ['盈凸月'], { core: true }),
  line('yujianwu-duhe', '渡河光不湿，移轮辙讵开', '庾肩吾', ['盈凸月'], { core: true }),
  line('libai-baiyupan', '小时不识月，呼作白玉盘', '李白', ['盈凸月'], { core: true }),
  line('libai-yaotai', '又疑瑶台镜，飞在白云端', '李白', ['盈凸月'], { core: true }),
  line('libai-tuantuan', '仙人垂两足，桂树作团团', '李白', ['盈凸月'], { core: true }),
  line('libai-baitu', '白兔捣药成，问言与谁餐', '李白', ['盈凸月'], { core: true }),
  line('zhuchao-yilun', '入风先绕晕，排雾急移轮', '朱超', ['盈凸月'], { core: true }),
  line('zhuchao-sishan', '若教长似扇，堪拂艳歌尘', '朱超', ['盈凸月'], { core: true }),
  line('xiaogang-tuanshan', '桂花那不落，团扇与谁装', '萧纲', ['盈凸月'], { core: true }),
  line('xiaogang-qijing', '形同七子镜，影类九秋霜', '萧纲', ['盈凸月'], { core: true }),
  line('yujianwu-yuanbang', '圆随汉东蚌，晕逐淮南灰', '庾肩吾', ['盈凸月'], { core: true }),
  line('xiaogang-liuhui', '流辉入画堂，初照上梅梁', '萧纲', ['盈凸月'], { core: true }),

  line('zhangjiuling-haishang', '海上生明月，天涯共此时', '张九龄', ['满月'], { core: true }),
  line('libai-chuangqian', '床前明月光，疑是地上霜', '李白', ['满月'], { core: true }),
  line('libai-jutou', '举头望明月，低头思故乡', '李白', ['满月'], { core: true }),
  line('libai-tianshan', '明月出天山，苍茫云海间', '李白', ['满月'], { core: true }),
  line('wangwei-songjian', '明月松间照，清泉石上流', '王维', ['满月'], { core: true }),
  line('dufu-guxiang', '露从今夜白，月是故乡明', '杜甫', ['满月'], { core: true }),
  line('dufu-mingjing', '满目飞明镜，归心折大刀', '杜甫', ['满月'], { core: true }),
  line('dufu-danglou', '孤月当楼满，寒江动夜扉', '杜甫', ['满月'], { core: true }),
  line('dufu-weique', '未缺空山静，高悬列宿稀', '杜甫', ['满月'], { core: true }),
  line('wangjian-zhongting', '中庭地白树栖鸦，冷露无声湿桂花', '王建', ['满月'], { core: true }),
  line('zhangruoxu-chunjiang', '春江潮水连海平，海上明月共潮生', '张若虚', ['满月'], { core: true }),
  line('zhangruoxu-guyue', '江天一色无纤尘，皎皎空中孤月轮', '张若虚', ['满月'], { core: true }),
  line('sushi-jiyou', '明月几时有，把酒问青天', '苏轼', ['满月'], { core: true, midAutumn: true }),
  line('xinqiji-jinbo', '一轮秋影转金波，飞镜又重磨', '辛弃疾', ['满月'], { core: true, midAutumn: true }),
  line('caocao-wuxique', '月明星稀，乌鹊南飞', '曹操', ['满月'], { core: true }),
  line('libai-yaoming', '举杯邀明月，对影成三人', '李白', ['满月'], { core: true }),
  line('caozhi-gaolou', '明月照高楼，流光正徘徊', '曹植', ['满月'], { core: true }),
  line('jiangzong-tuanshan', '只轮非战反，团扇少歌声', '江总', ['满月'], { core: true }),
  line('liuxiaochuo-sanwu', '明明三五月，垂影当高树', '刘孝绰', ['满月'], { core: true }),
  line('yuanzhen-yulun', '绛河冰鉴朗，黄道玉轮巍', '元稹', ['满月'], { core: true }),

  line('gushi-sanwu', '三五明月满，四五蟾兔缺', '古诗十九首', ['亏凸月'], { core: true }),
  line('xielingyun-jiman', '昨三五兮既满，今二八兮将缺', '谢灵运', ['亏凸月'], { core: true }),
  line('xielingyun-jiao', '浮云褰兮收泛滟，明舒照兮殊皎洁', '谢灵运', ['亏凸月'], { core: true }),
  line('xielingyun-jingjian', '墀除兮镜鉴，房栊兮澄澈', '谢灵运', ['亏凸月'], { core: true }),
  line('sushi-yuanque', '人有悲欢离合，月有阴晴圆缺', '苏轼', ['亏凸月'], { core: true }),
  line('baozhao-erban', '三五二八时，千里与君同', '鲍照', ['亏凸月'], { core: true }),
  line('baozhao-yeheng', '夜移衡汉落，徘徊帷户中', '鲍照', ['亏凸月'], { core: true }),
  line('lishangyin-yuque', '初生欲缺虚惆怅，未必圆时即有情', '李商隐', ['亏凸月'], { core: true }),
  line('lishangyin-guoshui', '过水穿楼触处明，藏人带树远含清', '李商隐', ['亏凸月'], { core: true }),
  line('dufu-renyuan', '秋月仍圆夜，江村独老身', '杜甫', ['亏凸月'], { core: true }),
  line('dufu-juanlian', '卷帘还照客，倚杖更随人', '杜甫', ['亏凸月'], { core: true }),
  line('dufu-qianqiu', '光射潜虬动，明翻宿鸟频', '杜甫', ['亏凸月'], { core: true }),
  line('dufu-maozhai', '茅斋依橘柚，清切露华新', '杜甫', ['亏凸月'], { core: true }),
  line('dufu-shengchen', '必验升沉体，如知进退情', '杜甫', ['亏凸月'], { core: true }),
  line('yuanzhen-jianjian', '渐减姮娥面，徐收楚练机', '元稹', ['亏凸月'], { core: true }),
  line('yuanzhen-kuiying', '今古虽云极，亏盈不易违', '元稹', ['亏凸月'], { core: true }),
  line('wangtaiqing-feiyuan', '空庭高楼月，非复三五圆', '王台卿', ['亏凸月'], { core: true }),
  line('wangtaiqing-zhaochuang', '何须照床里，终是一人眠', '王台卿', ['亏凸月'], { core: true }),
  line('libai-chanchu', '蟾蜍蚀圆影，大明夜已残', '李白', ['亏凸月'], { core: true }),
  line('liuyuxi-jiuyue', '淮水东边旧时月，夜深还过女墙来', '刘禹锡', ['亏凸月'], { core: true }),

  line('qudajun-xiaxian', '下弦今夜月，隐影半规明', '屈大均', ['下弦月'], { core: true }),
  line('qudajun-xueguang', '以雪光微食，因风影又生', '屈大均', ['下弦月'], { core: true }),
  line('qudajun-jianghan', '江连云汉泻，天与水灯平', '屈大均', ['下弦月'], { core: true }),
  line('qudajun-canshi', '不寐怜蟾兔，残时更有情', '屈大均', ['下弦月'], { core: true }),
  line('dufu-sigen', '四更山吐月，残夜水明楼', '杜甫', ['下弦月'], { core: true }),
  line('dufu-fenglian', '尘匣元开镜，风帘自上钩', '杜甫', ['下弦月'], { core: true }),
  line('dufu-tuifa', '兔应疑鹤发，蟾亦恋貂裘', '杜甫', ['下弦月'], { core: true }),
  line('dufu-henge', '斟酌姮娥寡，天寒耐九秋', '杜甫', ['下弦月'], { core: true }),
  line('liufangping-banren', '更深月色半人家，北斗阑干南斗斜', '刘方平', ['下弦月'], { core: true }),
  line('cuitu-sangeng', '蝴蝶梦中家万里，子规枝上月三更', '崔涂', ['下弦月'], { core: true }),
  line('dufu-xiama', '魍魉移深树，虾蟆动半轮', '杜甫', ['下弦月'], { core: true }),
  line('dufu-qingzhang', '若无青嶂月，愁杀白头人', '杜甫', ['下弦月'], { core: true }),
  line('dufu-xixin', '故园当北斗，直想照西秦', '杜甫', ['下弦月'], { core: true }),
  line('dufu-tianhe', '断续巫山雨，天河此夜新', '杜甫', ['下弦月'], { core: true }),
  line('yuanzhen-diaobi', '卞疑雕璧碎，潘感竟床稀', '元稹', ['下弦月'], { core: true }),
  line('yuanzhen-juanqie', '捐箧辞班女，潜波蔽虙妃', '元稹', ['下弦月'], { core: true }),
  line('zhoubangyan-yuejiao', '月皎惊乌栖不定，更漏将残', '周邦彦', ['下弦月'], { core: true }),
  line('zhoubangyan-doubing', '楼上阑干横斗柄，露寒人远鸡相应', '周邦彦', ['下弦月'], { core: true }),
  line('dufu-yinhan', '不违银汉落，亦伴玉绳横', '杜甫', ['下弦月'], { core: true }),
  line('zhuchao-gulou', '唯余故楼月，远近必随人', '朱超', ['下弦月'], { core: true }),

  line('liuyong-canxue', '今宵酒醒何处，杨柳岸晓风残月', '柳永', ['残月'], { core: true }),
  line('niuxiji-lianbian', '残月脸边明，别泪临清晓', '牛希济', ['残月'], { core: true }),
  line('niuxiji-chunshan', '春山烟欲收，天淡星稀小', '牛希济', ['残月'], { core: true }),
  line('wentingyun-jisheng', '鸡声茅店月，人迹板桥霜', '温庭筠', ['残月'], { core: true }),
  line('sushi-queyue', '缺月挂疏桐，漏断人初静', '苏轼', ['残月'], { core: true }),
  line('zhangji-yueluo', '月落乌啼霜满天，江枫渔火对愁眠', '张继', ['残月'], { core: true }),
  line('lishangyin-yunmu', '云母屏风烛影深，长河渐落晓星沉', '李商隐', ['残月'], { core: true }),
  line('zhangruoxu-luoyue', '江水流春去欲尽，江潭落月复西斜', '张若虚', ['残月'], { core: true }),
  line('zhangruoxu-xieyue', '斜月沉沉藏海雾，碣石潇湘无限路', '张若虚', ['残月'], { core: true }),
  line('zhangruoxu-yaoqing', '不知乘月几人归，落月摇情满江树', '张若虚', ['残月'], { core: true }),
  line('yuqian-mimi', '靡靡露方垂，晖晖光稍没', '虞骞', ['残月'], { core: true }),
  line('yuqian-yuying', '佳人复千里，余影徒挥忽', '虞骞', ['残月'], { core: true }),
  line('lihe-xiaoyue', '寻章摘句老雕虫，晓月当帘挂玉弓', '李贺', ['残月'], { core: true }),
  line('libai-bihai', '明月不归沉碧海，白云愁色满苍梧', '李白', ['残月'], { core: true }),
  line('chenziang-yinhu', '明月隐高树，长河没晓天', '陈子昂', ['残月'], { core: true }),
  line('dufu-shaoxia', '稍下巫山峡，犹衔白帝城', '杜甫', ['残月'], { core: true }),
  line('dufu-lunze', '气沉全浦暗，轮仄半楼明', '杜甫', ['残月'], { core: true }),
  line('dufu-diaodou', '刁斗皆催晓，蟾蜍且自倾', '杜甫', ['残月'], { core: true }),
  line('dufu-zhanggong', '张弓倚残魄，不独汉家营', '杜甫', ['残月'], { core: true }),
  line('zhanghu-xieyue', '潮落夜江斜月里，两三星火是瓜洲', '张祜', ['残月'], { core: true }),

  line('sushi-qingying', '起舞弄清影，何似在人间', '苏轼', ['满月'], { midAutumn: true }),
  line('sushi-buheng', '不应有恨，何事长向别时圆', '苏轼', ['满月'], { midAutumn: true }),
  line('sushi-chanyuan', '但愿人长久，千里共婵娟', '苏轼', ['满月'], { midAutumn: true }),
  line('sushi-yupan', '暮云收尽溢清寒，银汉无声转玉盘', '苏轼', ['满月'], { midAutumn: true }),
  line('sushi-mingnian', '此生此夜不长好，明月明年何处看', '苏轼', ['满月'], { midAutumn: true }),
  line('wangjian-qiusi', '今夜月明人尽望，不知秋思落谁家', '王建', ['满月'], { midAutumn: true }),
  line('xinqiji-chengfeng', '乘风好去，长空万里，直下看山河', '辛弃疾', ['满月'], { midAutumn: true }),
  line('xinqiji-guipo', '斫去桂婆娑，人道是清光更多', '辛弃疾', ['满月'], { midAutumn: true }),
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
  return takeUnique(LIBRARY.filter((poem) => poem.core && poem.phases[0] === name), 20);
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
    perPool: 20,
    midAutumn: poemsForMidAutumn().length,
    longest: Math.max(...LIBRARY.map((poem) => poem.text.length)),
  };
}
