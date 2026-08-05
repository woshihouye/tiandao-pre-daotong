// 大道之行 · 活动库 — 全量结构化活动数据（元卡版）
// 五分类：武·炼体(元卡) / 食·丹食 / 悟·修心 / 工·功业 / 煞·心魔

/** 分类定义 */
var CATEGORIES = [
  { key: 'sport', name: '武·炼体', icon: '武', desc: '炼体修身，强筋健骨' },
  { key: 'diet',   name: '食·丹食', icon: '食', desc: '饮食有道，丹食养气' },
  { key: 'study',  name: '悟·修心', icon: '悟', desc: '修心悟道，明心见性' },
  { key: 'work',   name: '工·功业', icon: '工', desc: '入世修行，功业产出' },
  { key: 'debuff', name: '煞·心魔', icon: '煞', desc: '心魔妄念，损耗道基' }
]

/**
 * 各分类的双层筛选配置
 * sport.side 已从肌群维度（胸/背/肩/臂/核心/腿/臀/全身有氧）替换为动作模式维度（推/拉/蹲/核心/有氧）
 */
var FILTER_CONFIGS = {
  sport: {
    // 元卡改造：双层筛选(top/side) → 子集筛选 + 元卡列表
    subcategories: [
      { key: 'all',       name: '全部',       icon: '' },
      { key: 'anaerobic', name: '无氧力量',    icon: '力', desc: '推/拉/蹲' },
      { key: 'core',      name: '核心训练',    icon: '核', desc: '撑/卷' },
      { key: 'cardio',    name: '有氧心肺',    icon: '心', desc: '稳态/间歇' },
      { key: 'unknown',   name: '不知道',      icon: '?', desc: '自由定义' }
    ],
    metaCards: [
      { key: 'push',            name: '推',        subcategory: 'anaerobic', desc: '推离身体的抗阻训练' },
      { key: 'pull',            name: '拉',        subcategory: 'anaerobic', desc: '拉近身体的抗阻训练' },
      { key: 'squat',           name: '蹲',        subcategory: 'anaerobic', desc: '下肢屈伸抗阻训练' },
      { key: 'hold',            name: '撑',        subcategory: 'core',      desc: '静态核心稳定' },
      { key: 'curl',            name: '卷',        subcategory: 'core',      desc: '动态核心屈伸' },
      { key: 'steady_cardio',   name: '稳态有氧',  subcategory: 'cardio',    desc: '持续稳定输出' },
      { key: 'interval_cardio', name: '间歇有氧',  subcategory: 'cardio',    desc: '高低强度交替' },
      { key: 'unknown',         name: '不知道',    subcategory: 'unknown',   desc: '完全自由定义' }
    ]
  },
  diet: {
    top: [
      { key: 'all', name: '全部' },
      { key: 'meal', name: '正餐' },
      { key: 'water', name: '饮水' },
      { key: 'snack', name: '加餐' },
      { key: 'habit', name: '习惯' },
      { key: 'avoid', name: '忌口' }
    ],
    side: [
      { key: 'all', name: '全部' },
      { key: 'breakfast', name: '早餐' },
      { key: 'lunch', name: '午餐' },
      { key: 'dinner', name: '晚餐' },
      { key: 'beverage', name: '饮品摄入' },
      { key: 'nutrition_supp', name: '营养补充' },
      { key: 'eating_habit', name: '饮食习惯' },
      { key: 'unknown', name: '不知道' }
    ]
  },
  study: {
    top: [
      { key: 'all', name: '全部' },
      { key: 'brain', name: '长脑子啦' },
      { key: 'world', name: '见见世面' },
      { key: 'art', name: '搞艺术的' },
      { key: 'cyber', name: '赛博修行' }
    ],
    side: [
      { key: 'all', name: '全部' },
      { key: 'brain_growth', name: '长脑子啦' },
      { key: 'see_world', name: '见见世面' },
      { key: 'art_make', name: '搞艺术的' },
      { key: 'cyber_cultivate', name: '赛博修行' },
      { key: 'unknown', name: '不知道' }
    ]
  },
  work: {
    top: [
      { key: 'all', name: '全部' },
      { key: 'kaitian', name: '开天项目' },
      { key: 'butian', name: '补天项目' },
      { key: 'boring', name: '不好玩' },
      { key: 'fun', name: '有意思' }
    ],
    side: [
      { key: 'all', name: '全部' },
      { key: 'kaitian', name: '开天项目' },
      { key: 'butian', name: '补天项目' },
      { key: 'boring', name: '不好玩' },
      { key: 'fun', name: '有意思' },
      { key: 'unknown', name: '不知道' }
    ]
  },
  debuff: {
    top: [
      { key: 'all', name: '全部' },
      { key: 'body_hurt', name: '熬垮身子' },
      { key: 'eat_chaos', name: '乱吃一通' },
      { key: 'swipe_lost', name: '刷到失神' },
      { key: 'inner_demon', name: '心魔缠身' }
    ],
    side: [
      { key: 'all', name: '全部' },
      { key: 'body_hurt', name: '熬垮身子' },
      { key: 'eat_chaos', name: '乱吃一通' },
      { key: 'swipe_lost', name: '刷到失神' },
      { key: 'inner_demon', name: '心魔缠身' },
      { key: 'unknown', name: '不知道' }
    ]
  }
}

/**
 * 活动库数据结构
 * 每个活动包含：id、name、metaCard(仅sport)、description、unit、scorePerUnit、isNegative
 * tabKey: 跳转 record 页面时对应的 tab 值
 * presetAction: 跳转时预选的动作标识
 *
 * sport 维度（元卡改造）：
 *   仅保留一张空白入口卡，具体活动通过元卡编辑器（activity-edit）
 *   选择 8 张元卡（推/拉/蹲/撑/卷/稳态有氧/间歇有氧/不知道）创建。
 *   元卡定义见 utils/meta-cards.js
 */
var ACTIVITY_LIBRARY = {

  // ============================================================
  //  一、武·炼体
  // ============================================================
  sport: [
    // 元卡改造：sport 维度仅保留空白入口卡，具体活动通过元卡编辑器创建
    { id: 'blank_sport', name: '空白炼体',
      metaCard: 'unknown',  // 关联元卡（兜底）
      description: '自由记录运动修行',
      unit: '次', scorePerUnit: 1,
      tabKey: 'sport', presetAction: '' }
  ],

  // ============================================================
  //  二、食·丹食
  // ============================================================
  diet: [
    { id: 'blank_diet', name: '空白', topFilter: 'blank', sideFilter: 'blank',
      description: '自由记录空白丹食', unit: '份', scorePerUnit: 1, tabKey: 'diet', presetAction: '' },

    { id: 'healthy_breakfast', name: '健康早餐', topFilter: 'meal', sideFilter: 'breakfast',
      description: '早起吃一顿营养均衡的早餐，开启元气一天', unit: '次/天', scorePerUnit: 3, tabKey: 'diet', presetAction: '' },
    { id: 'nutritious_lunch', name: '营养午餐', topFilter: 'meal', sideFilter: 'lunch',
      description: '均衡搭配蛋白质+蔬菜+主食，午间充电', unit: '次/天', scorePerUnit: 3, tabKey: 'diet', presetAction: '' },
    { id: 'light_dinner', name: '清淡晚餐', topFilter: 'meal', sideFilter: 'dinner',
      description: '少油少盐、不过饱，晚间清淡饮食', unit: '次/天', scorePerUnit: 3, tabKey: 'diet', presetAction: '' },
    { id: 'drink_8_water', name: '喝够8杯水', topFilter: 'water', sideFilter: 'beverage',
      description: '每日饮水充足，维持身体代谢平衡', unit: '次/天', scorePerUnit: 4, tabKey: 'diet', presetAction: '' },
    { id: 'enough_veggies', name: '摄入足量蔬菜', topFilter: 'meal', sideFilter: 'nutrition_supp',
      description: '每日蔬菜摄入达标，补充维生素与纤维', unit: '次/天', scorePerUnit: 3, tabKey: 'diet', presetAction: '' },
    { id: 'no_sugar_drink', name: '戒断高糖饮料', topFilter: 'avoid', sideFilter: 'eating_habit',
      description: '不喝奶茶、可乐等高糖饮品', unit: '次/天', scorePerUnit: 5, tabKey: 'diet', presetAction: '' },
    { id: 'calorie_control', name: '控制热量摄入', topFilter: 'habit', sideFilter: 'eating_habit',
      description: '有意识地控制全天总热量不超标', unit: '次/天', scorePerUnit: 4, tabKey: 'diet', presetAction: '' },
    { id: 'quality_protein', name: '补充优质蛋白', topFilter: 'snack', sideFilter: 'nutrition_supp',
      description: '摄入鸡胸肉、鱼虾、蛋奶等优质蛋白', unit: '次/天', scorePerUnit: 3, tabKey: 'diet', presetAction: '' },
    { id: 'regular_meals', name: '规律进食', topFilter: 'habit', sideFilter: 'eating_habit',
      description: '三餐定时定量，不暴饮暴食', unit: '次/天', scorePerUnit: 4, tabKey: 'diet', presetAction: '' },
    { id: 'no_late_snack', name: '戒断夜宵', topFilter: 'avoid', sideFilter: 'eating_habit',
      description: '晚间8点后不进食，减轻肠胃负担', unit: '次/天', scorePerUnit: 4, tabKey: 'diet', presetAction: '' }
  ],

  // ============================================================
  //  三、悟·修心
  // ============================================================
  study: [

    // ======== 空白 ========
    { id: 'blank_study', name: '空白', topFilter: 'blank', sideFilter: 'blank',
      description: '自由记录空白修心活动', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' },

    // ======== 长脑子啦（学习成长类，全部按时长计算）========
    { id: 'read_book', name: '阅读书籍', topFilter: 'brain', sideFilter: 'brain_growth',
      description: '静心阅读，汲取知识养分', unit: '10分钟', scorePerUnit: 2, tabKey: 'study', presetAction: '' },
    { id: 'learn_course', name: '学习课程/技能', topFilter: 'brain', sideFilter: 'brain_growth',
      description: '系统性学习一门课程或技能', unit: '10分钟', scorePerUnit: 2.5, tabKey: 'study', presetAction: '' },
    { id: 'memorize', name: '背诵记忆', topFilter: 'brain', sideFilter: 'brain_growth',
      description: '背诵单词、古诗、公式等知识点', unit: '10分钟', scorePerUnit: 2, tabKey: 'study', presetAction: '' },
    { id: 'study_practice_questions', name: '刷题练习', topFilter: 'brain', sideFilter: 'brain_growth',
      description: '刷题巩固，以练促学', unit: '10分钟', scorePerUnit: 2, tabKey: 'study', presetAction: '' },
    { id: 'listen_audio_book', name: '听书学习', topFilter: 'brain', sideFilter: 'brain_growth',
      description: '利用碎片时间听书，多感官吸收知识', unit: '10分钟', scorePerUnit: 1.5, tabKey: 'study', presetAction: '' },
    { id: 'write_reading_notes', name: '写读书笔记', topFilter: 'brain', sideFilter: 'brain_growth',
      description: '读后整理笔记，内化知识体系', unit: '10分钟', scorePerUnit: 2, tabKey: 'study', presetAction: '' },
    { id: 'foreign_language', name: '外语学习', topFilter: 'brain', sideFilter: 'brain_growth',
      description: '学习一门外语，听说读写全面训练', unit: '10分钟', scorePerUnit: 2, tabKey: 'study', presetAction: '' },
    { id: 'professional_knowledge', name: '专业知识学习', topFilter: 'brain', sideFilter: 'brain_growth',
      description: '深耕专业领域知识，提升核心竞争力', unit: '10分钟', scorePerUnit: 2.5, tabKey: 'study', presetAction: '' },
    { id: 'exam_prep', name: '考证备考', topFilter: 'brain', sideFilter: 'brain_growth',
      description: '系统性备考复习，向目标证书冲刺', unit: '10分钟', scorePerUnit: 2.5, tabKey: 'study', presetAction: '' },
    { id: 'review_summary', name: '复盘总结', topFilter: 'brain', sideFilter: 'brain_growth',
      description: '回顾当日/当周得失，提炼经验教训', unit: '10分钟', scorePerUnit: 1.5, tabKey: 'study', presetAction: '' },

    // ======== 见见世面（出行通勤类）========
    { id: 'take_bus', name: '乘坐公交车', topFilter: 'world', sideFilter: 'see_world',
      description: '乘坐公交车通勤出行', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' },
    { id: 'take_subway', name: '乘坐地铁', topFilter: 'world', sideFilter: 'see_world',
      description: '乘坐地铁通勤出行', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' },
    { id: 'take_taxi', name: '乘坐出租车', topFilter: 'world', sideFilter: 'see_world',
      description: '乘坐出租车/网约车出行', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' },
    { id: 'take_train', name: '乘坐高铁/火车', topFilter: 'world', sideFilter: 'see_world',
      description: '乘坐高铁或火车长途出行', unit: '10分钟', scorePerUnit: 1.5, tabKey: 'study', presetAction: '' },
    { id: 'self_drive', name: '自驾出行', topFilter: 'world', sideFilter: 'see_world',
      description: '亲自驾驶车辆出行', unit: '10分钟', scorePerUnit: 1.5, tabKey: 'study', presetAction: '' },
    { id: 'cycling_commute', name: '骑行出行', topFilter: 'world', sideFilter: 'see_world',
      description: '骑自行车/电动车出行', unit: '10分钟', scorePerUnit: 1.5, tabKey: 'study', presetAction: '' },
    { id: 'walk_commute', name: '步行通勤', topFilter: 'world', sideFilter: 'see_world',
      description: '步行上下班或外出办事', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' },
    // 按次计算
    { id: 'take_flight', name: '乘坐飞机', topFilter: 'world', sideFilter: 'see_world',
      description: '乘坐飞机远途出行', unit: '次', scorePerUnit: 8, tabKey: 'study', presetAction: '' },
    { id: 'take_ship', name: '乘坐轮船', topFilter: 'world', sideFilter: 'see_world',
      description: '乘坐轮船/渡轮水上出行', unit: '次', scorePerUnit: 6, tabKey: 'study', presetAction: '' },
    { id: 'city_exhibition', name: '城市逛展', topFilter: 'world', sideFilter: 'see_world',
      description: '逛展览/博物馆/市集，开拓眼界', unit: '次', scorePerUnit: 5, tabKey: 'study', presetAction: '' },
    { id: 'travel_sightseeing', name: '旅行观光', topFilter: 'world', sideFilter: 'see_world',
      description: '旅行出游，欣赏风景增长见识', unit: '次', scorePerUnit: 8, tabKey: 'study', presetAction: '' },
    { id: 'take_rocket', name: '乘坐火箭', topFilter: 'world', sideFilter: 'see_world',
      description: '乘坐火箭飞向太空（彩蛋活动）', unit: '次', scorePerUnit: 50, tabKey: 'study', presetAction: '' },
    { id: 'black_hole_cross', name: '黑洞穿越', topFilter: 'world', sideFilter: 'see_world',
      description: '穿越黑洞抵达未知领域（彩蛋活动）', unit: '次', scorePerUnit: 100, tabKey: 'study', presetAction: '' },

    // ======== 搞艺术的（文娱创作类）========
    { id: 'calligraphy', name: '练字/书法', topFilter: 'art', sideFilter: 'art_make',
      description: '练习书写，静心养性', unit: '10分钟', scorePerUnit: 1.5, tabKey: 'study', presetAction: '' },
    { id: 'painting', name: '绘画创作', topFilter: 'art', sideFilter: 'art_make',
      description: '拿起画笔自由创作，表达内心世界', unit: '10分钟', scorePerUnit: 2, tabKey: 'study', presetAction: '' },
    { id: 'listen_music', name: '听音乐', topFilter: 'art', sideFilter: 'art_make',
      description: '聆听音乐，感受旋律之美', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' },
    { id: 'play_instrument', name: '弹奏乐器', topFilter: 'art', sideFilter: 'art_make',
      description: '弹奏一种乐器，指尖流淌旋律', unit: '10分钟', scorePerUnit: 2.5, tabKey: 'study', presetAction: '' },
    { id: 'sing_practice', name: '唱歌练习', topFilter: 'art', sideFilter: 'art_make',
      description: '练声唱歌，释放情感愉悦身心', unit: '10分钟', scorePerUnit: 1.5, tabKey: 'study', presetAction: '' },
    { id: 'photography', name: '摄影创作', topFilter: 'art', sideFilter: 'art_make',
      description: '用镜头捕捉光影，记录美的瞬间', unit: '10分钟', scorePerUnit: 2, tabKey: 'study', presetAction: '' },
    { id: 'handcraft', name: '手工制作', topFilter: 'art', sideFilter: 'art_make',
      description: '动手制作手工艺品，享受创造乐趣', unit: '10分钟', scorePerUnit: 2, tabKey: 'study', presetAction: '' },
    { id: 'writing_creation', name: '写作创作', topFilter: 'art', sideFilter: 'art_make',
      description: '写下所思所想，文字中见天地见自己', unit: '10分钟', scorePerUnit: 2, tabKey: 'study', presetAction: '' },
    { id: 'watch_show', name: '看剧/看番', topFilter: 'art', sideFilter: 'art_make',
      description: '观赏影视剧作，沉浸故事放松身心', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' },
    // 按次计算
    { id: 'watch_film_enlighten', name: '观影悟道', topFilter: 'art', sideFilter: 'art_make',
      description: '观看优质电影/纪录片，在故事中观照自身', unit: '次', scorePerUnit: 5, tabKey: 'study', presetAction: '' },

    // ======== 赛博修行（线上内容类，全部按时长计算）========
    { id: 'read_ebook', name: '看电子书', topFilter: 'cyber', sideFilter: 'cyber_cultivate',
      description: '阅读电子书，碎片化获取知识', unit: '10分钟', scorePerUnit: 1.5, tabKey: 'study', presetAction: '' },
    { id: 'browse_douyin', name: '刷抖音', topFilter: 'cyber', sideFilter: 'cyber_cultivate',
      description: '刷抖音短视频，娱乐放松', unit: '10分钟', scorePerUnit: 0.5, tabKey: 'study', presetAction: '' },
    { id: 'browse_kuaishou', name: '刷快手', topFilter: 'cyber', sideFilter: 'cyber_cultivate',
      description: '刷快手短视频，娱乐放松', unit: '10分钟', scorePerUnit: 0.5, tabKey: 'study', presetAction: '' },
    { id: 'browse_bilibili', name: '刷B站', topFilter: 'cyber', sideFilter: 'cyber_cultivate',
      description: '浏览B站内容，学习或娱乐', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' },
    { id: 'browse_xiaohongshu', name: '刷小红书', topFilter: 'cyber', sideFilter: 'cyber_cultivate',
      description: '浏览小红书，获取灵感与攻略', unit: '10分钟', scorePerUnit: 0.5, tabKey: 'study', presetAction: '' },
    { id: 'browse_hongguo', name: '刷红果免费短剧', topFilter: 'cyber', sideFilter: 'cyber_cultivate',
      description: '观看红果免费短剧，轻松一刻', unit: '10分钟', scorePerUnit: 0.5, tabKey: 'study', presetAction: '' },
    { id: 'browse_weibo', name: '刷微博', topFilter: 'cyber', sideFilter: 'cyber_cultivate',
      description: '浏览微博，获取资讯动态', unit: '10分钟', scorePerUnit: 0.5, tabKey: 'study', presetAction: '' },
    { id: 'browse_zhihu', name: '刷知乎', topFilter: 'cyber', sideFilter: 'cyber_cultivate',
      description: '浏览知乎，碎片化获取知识见解', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' },
    { id: 'online_community', name: '线上社群交流', topFilter: 'cyber', sideFilter: 'cyber_cultivate',
      description: '参与线上社群讨论，交流切磋', unit: '10分钟', scorePerUnit: 1.5, tabKey: 'study', presetAction: '' },
    { id: 'play_game', name: '玩游戏', topFilter: 'cyber', sideFilter: 'cyber_cultivate',
      description: '适度游戏放松，劳逸结合', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' }

  ],

  // ============================================================
  //  四、工·功业
  // ============================================================
  work: [

    // ======== 空白 ========
    { id: 'blank_work', name: '空白', topFilter: 'blank', sideFilter: 'blank',
      description: '自由记录空白功业活动', unit: '30分钟', scorePerUnit: 1, tabKey: 'work', presetAction: '' },

    // ======== 开天项目（新项目从0到1的前期搭建工作）========
    { id: 'market_research', name: '市场调研分析', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '系统调研分析市场环境与趋势', unit: '30分钟', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'project_proposal', name: '项目立项申请', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '提交项目立项材料，推动项目正式启动', unit: '次', scorePerUnit: 6, tabKey: 'work', presetAction: '' },
    { id: 'biz_plan_write', name: '商业方案撰写', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '编写商业计划书或项目方案', unit: '30分钟', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'competitor_analysis', name: '竞品深度分析', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '对竞品进行全面深入的分析研究', unit: '30分钟', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'user_need_research', name: '用户需求调研', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '调研目标用户的核心需求与痛点', unit: '30分钟', scorePerUnit: 2.5, tabKey: 'work', presetAction: '' },
    { id: 'resource_docking', name: '资源对接筹备', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '对接内外资源，筹备项目所需条件', unit: '次', scorePerUnit: 5, tabKey: 'work', presetAction: '' },
    { id: 'team_recruit', name: '团队组建招聘', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '招聘面试，组建项目团队', unit: '30分钟', scorePerUnit: 2.5, tabKey: 'work', presetAction: '' },
    { id: 'product_prototype', name: '产品原型设计', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '设计产品原型，验证核心功能逻辑', unit: '30分钟', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'budget_plan', name: '项目预算编制', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '编制项目预算，合理规划资源分配', unit: '次', scorePerUnit: 5, tabKey: 'work', presetAction: '' },
    { id: 'partner_negotiate', name: '合作方洽谈', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '与潜在合作伙伴进行商务洽谈', unit: '次', scorePerUnit: 5, tabKey: 'work', presetAction: '' },
    { id: 'risk_assessment', name: '风险评估报告', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '识别并评估项目潜在风险，制定预案', unit: '次', scorePerUnit: 5, tabKey: 'work', presetAction: '' },
    { id: 'process_framework', name: '流程框架搭建', topFilter: 'kaitian', sideFilter: 'kaitian',
      description: '搭建项目流程与管理框架', unit: '30分钟', scorePerUnit: 2.5, tabKey: 'work', presetAction: '' },

    // ======== 补天项目（现有项目迭代维护与推进）========
    { id: 'milestone_progress', name: '项目里程碑推进', topFilter: 'butian', sideFilter: 'butian',
      description: '推动项目关键节点取得实质进展', unit: '项', scorePerUnit: 8, tabKey: 'work', presetAction: '' },
    { id: 'bug_fix', name: '问题排查修复', topFilter: 'butian', sideFilter: 'butian',
      description: '排查定位问题并完成修复', unit: '30分钟', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'version_update', name: '版本迭代更新', topFilter: 'butian', sideFilter: 'butian',
      description: '完成一个版本的迭代发布', unit: '次', scorePerUnit: 7, tabKey: 'work', presetAction: '' },
    { id: 'daily_sync', name: '日常进度同步', topFilter: 'butian', sideFilter: 'butian',
      description: '与团队同步当日工作进度与问题', unit: '次', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'requirement_change', name: '需求变更处理', topFilter: 'butian', sideFilter: 'butian',
      description: '评估并处理项目需求变更', unit: '次', scorePerUnit: 4, tabKey: 'work', presetAction: '' },
    { id: 'project_review', name: '项目复盘总结', topFilter: 'butian', sideFilter: 'butian',
      description: '对项目阶段进行复盘总结分析', unit: '次', scorePerUnit: 5, tabKey: 'work', presetAction: '' },
    { id: 'cross_dept_coord', name: '跨部门协调推进', topFilter: 'butian', sideFilter: 'butian',
      description: '推动跨部门沟通协调，解决协作问题', unit: '30分钟', scorePerUnit: 2.5, tabKey: 'work', presetAction: '' },
    { id: 'data_report', name: '数据报表输出', topFilter: 'butian', sideFilter: 'butian',
      description: '整理并输出数据报表分析', unit: '份', scorePerUnit: 4, tabKey: 'work', presetAction: '' },
    { id: 'customer_followup', name: '客户需求跟进', topFilter: 'butian', sideFilter: 'butian',
      description: '跟进客户需求，推进问题解决', unit: '次', scorePerUnit: 4, tabKey: 'work', presetAction: '' },
    { id: 'qa_inspection', name: '质量检测验收', topFilter: 'butian', sideFilter: 'butian',
      description: '完成质量检测与验收确认', unit: '次', scorePerUnit: 5, tabKey: 'work', presetAction: '' },
    { id: 'ops_daily_check', name: '运维日常巡检', topFilter: 'butian', sideFilter: 'butian',
      description: '完成系统/设备日常巡检', unit: '次', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'doc_update', name: '文档迭代更新', topFilter: 'butian', sideFilter: 'butian',
      description: '更新维护项目相关文档资料', unit: '次', scorePerUnit: 3, tabKey: 'work', presetAction: '' },

    // ======== 不好玩（枯燥但必做的事务性工作）========
    { id: 'clock_in', name: '上班打卡', topFilter: 'boring', sideFilter: 'boring',
      description: '准时上班打卡签到', unit: '次', scorePerUnit: 1, tabKey: 'work', presetAction: '' },
    { id: 'clock_out', name: '下班打卡', topFilter: 'boring', sideFilter: 'boring',
      description: '准时下班打卡签退', unit: '次', scorePerUnit: 1, tabKey: 'work', presetAction: '' },
    { id: 'expense_report', name: '发票报销', topFilter: 'boring', sideFilter: 'boring',
      description: '整理发票，提交报销申请', unit: '次', scorePerUnit: 2, tabKey: 'work', presetAction: '' },
    { id: 'ledger_record', name: '台账记录', topFilter: 'boring', sideFilter: 'boring',
      description: '更新维护日常工作台账', unit: '次', scorePerUnit: 2, tabKey: 'work', presetAction: '' },
    { id: 'workstation_duty', name: '工位日常值守', topFilter: 'boring', sideFilter: 'boring',
      description: '在工位完成日常工作值守', unit: '30分钟', scorePerUnit: 1, tabKey: 'work', presetAction: '' },
    { id: 'assembly_line', name: '流水线日常作业', topFilter: 'boring', sideFilter: 'boring',
      description: '完成流水线/产线上的日常操作', unit: '30分钟', scorePerUnit: 1.5, tabKey: 'work', presetAction: '' },
    { id: 'change_uniform', name: '更换制服装备', topFilter: 'boring', sideFilter: 'boring',
      description: '更换工服/防护装备，做好上岗准备', unit: '次', scorePerUnit: 1, tabKey: 'work', presetAction: '' },
    { id: 'meeting_signin', name: '会议签到', topFilter: 'boring', sideFilter: 'boring',
      description: '参加指定会议并完成签到', unit: '次', scorePerUnit: 1, tabKey: 'work', presetAction: '' },
    { id: 'inventory_check', name: '物料盘点', topFilter: 'boring', sideFilter: 'boring',
      description: '盘点仓库/工位物料库存', unit: '次', scorePerUnit: 2, tabKey: 'work', presetAction: '' },
    { id: 'data_entry', name: '数据录入整理', topFilter: 'boring', sideFilter: 'boring',
      description: '将纸质或散乱数据录入系统并整理', unit: '30分钟', scorePerUnit: 1.5, tabKey: 'work', presetAction: '' },
    { id: 'email_reply', name: '邮件日常回复', topFilter: 'boring', sideFilter: 'boring',
      description: '处理回复日常工作邮件', unit: '30分钟', scorePerUnit: 1.5, tabKey: 'work', presetAction: '' },
    { id: 'daily_meeting', name: '例行晨会夕会', topFilter: 'boring', sideFilter: 'boring',
      description: '参加每日例行晨会或夕会', unit: '次', scorePerUnit: 2, tabKey: 'work', presetAction: '' },
    { id: 'process_apply', name: '活动流程申请', topFilter: 'boring', sideFilter: 'boring',
      description: '提交各类内部流程审批申请', unit: '次', scorePerUnit: 2, tabKey: 'work', presetAction: '' },
    { id: 'attendance_report', name: '日常考勤报备', topFilter: 'boring', sideFilter: 'boring',
      description: '完成日常考勤相关报备手续', unit: '次', scorePerUnit: 1, tabKey: 'work', presetAction: '' },

    // ======== 有意思（有创造性与成长性的工作）========
    { id: 'biz_negotiate', name: '商务谈判', topFilter: 'fun', sideFilter: 'fun',
      description: '参与商务谈判，争取有利合作条件', unit: '次', scorePerUnit: 8, tabKey: 'work', presetAction: '' },
    { id: 'biz_social', name: '商务应酬', topFilter: 'fun', sideFilter: 'fun',
      description: '参加商务宴请或社交活动，维护合作关系', unit: '次', scorePerUnit: 5, tabKey: 'work', presetAction: '' },
    { id: 'industry_analysis', name: '行业经济分析', topFilter: 'fun', sideFilter: 'fun',
      description: '深入研究分析行业动态与经济趋势', unit: '30分钟', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'deep_skill_learn', name: '技能深度学习', topFilter: 'fun', sideFilter: 'fun',
      description: '系统性深入学习一项专业技能', unit: '30分钟', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'creative_plan', name: '创意方案策划', topFilter: 'fun', sideFilter: 'fun',
      description: '构思策划创新方案，探索新可能', unit: '30分钟', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'side_project', name: '副业创作产出', topFilter: 'fun', sideFilter: 'fun',
      description: '推进副业项目或创作内容', unit: '30分钟', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'skill_practice', name: '专业技能练习', topFilter: 'fun', sideFilter: 'fun',
      description: '刻意练习一项职业技能', unit: '30分钟', scorePerUnit: 2.5, tabKey: 'work', presetAction: '' },
    { id: 'industry_sharing', name: '行业交流分享', topFilter: 'fun', sideFilter: 'fun',
      description: '参与行业交流或内部分享活动', unit: '次', scorePerUnit: 5, tabKey: 'work', presetAction: '' },
    { id: 'new_skill_practice', name: '新技能实战', topFilter: 'fun', sideFilter: 'fun',
      description: '将新学技能投入实战应用', unit: '次', scorePerUnit: 5, tabKey: 'work', presetAction: '' },
    { id: 'team_training', name: '团队培训分享', topFilter: 'fun', sideFilter: 'fun',
      description: '组织或参与团队内部培训分享', unit: '次', scorePerUnit: 5, tabKey: 'work', presetAction: '' },
    { id: 'biz_innovation', name: '业务创新探索', topFilter: 'fun', sideFilter: 'fun',
      description: '探索业务创新方向，尝试新方法', unit: '30分钟', scorePerUnit: 3, tabKey: 'work', presetAction: '' },
    { id: 'personal_review', name: '个人工作复盘', topFilter: 'fun', sideFilter: 'fun',
      description: '回顾个人工作表现，总结经验教训', unit: '次', scorePerUnit: 4, tabKey: 'work', presetAction: '' }

  ],

  // ============================================================
  //  五、煞·心魔
  // ============================================================
  debuff: [

    // ======== 空白 ========
    { id: 'blank_debuff', name: '空白', topFilter: 'blank', sideFilter: 'blank',
      description: '自由记录空白心魔活动', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: '' },

    // ======== 熬垮身子（身体损耗类，作息与伤身行为）========
    { id: 'stay_up_late', name: '熬夜（24点后睡）', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '熬夜损伤元气，次日精神萎靡', unit: '次', scorePerUnit: -10, isNegative: true, tabKey: 'debuff', presetAction: 'stay_up_late' },
    { id: 'sedentary_2h', name: '久坐超2小时不动', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '长时间久坐血液循环不畅', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'sedentary_2h' },
    { id: 'all_nighter', name: '通宵不睡', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '彻夜未眠，严重透支身体元气', unit: '次', scorePerUnit: -20, isNegative: true, tabKey: 'debuff', presetAction: 'all_nighter' },
    { id: 'skip_breakfast', name: '不吃早餐', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '跳过早餐，影响全天代谢', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'skip_breakfast' },
    { id: 'oversleep_1h', name: '赖床超1小时', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '赖床不起，浪费早晨黄金时间', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'oversleep_1h' },
    { id: 'phone_hunched', name: '低头久坐刷手机', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '低头弓背刷手机，损伤颈椎脊柱', unit: '30分钟', scorePerUnit: -4, isNegative: true, tabKey: 'debuff', presetAction: 'phone_hunched' },
    { id: 'hold_pee_1h', name: '憋尿硬扛超1小时', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '有尿意却硬撑着不去厕所，伤肾伤膀胱', unit: '次', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'hold_pee_1h' },
    { id: 'bed_phone_1h', name: '睡前刷手机超1小时', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '躺床上刷手机，影响睡眠质量', unit: '次', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'bed_phone_1h' },
    { id: 'cross_legs', name: '跷二郎腿久坐', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '跷二郎腿长时间不动，影响骨盆脊柱', unit: '30分钟', scorePerUnit: -3, isNegative: true, tabKey: 'debuff', presetAction: 'cross_legs' },
    { id: 'lie_down_after_sport', name: '剧烈运动后立刻躺平', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '运动完不拉伸就躺下，肌肉僵硬酸痛', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'lie_down_after_sport' },
    { id: 'no_water_half_day', name: '半天不喝水', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '大半天一滴水没喝，身体严重缺水', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'no_water_half_day' },
    { id: 'hold_pee_long', name: '憋尿不上厕所', topFilter: 'body_hurt', sideFilter: 'body_hurt',
      description: '长时间憋尿不上厕所，危害泌尿系统', unit: '次', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'hold_pee_long' },

    // ======== 乱吃一通（饮食失控类，不良饮食习惯）========
    { id: 'binge_eating', name: '暴饮暴食', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '放纵饮食，超出身体所需', unit: '次', scorePerUnit: -8, isNegative: true, tabKey: 'debuff', presetAction: 'binge_eating' },
    { id: 'full_sugar_bubble_tea', name: '喝全糖奶茶', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '喝下一杯高糖高热量的全糖奶茶', unit: '次', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'full_sugar_bubble_tea' },
    { id: 'fried_junk_food', name: '吃油炸垃圾食品', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '吃油炸高脂垃圾食品，加重身体负担', unit: '次', scorePerUnit: -7, isNegative: true, tabKey: 'debuff', presetAction: 'fried_junk_food' },
    { id: 'binge_drinking', name: '酗酒', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '过量饮酒，损伤肝脏与神经', unit: '次', scorePerUnit: -12, isNegative: true, tabKey: 'debuff', presetAction: 'binge_drinking' },
    { id: 'midnight_snack', name: '吃宵夜', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '睡前吃宵夜，加重消化负担影响睡眠', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'midnight_snack' },
    { id: 'iced_drink_on_empty', name: '空腹喝冰饮', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '空腹猛喝冰饮，刺激肠胃伤脾胃', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'iced_drink_on_empty' },
    { id: 'excess_sweets', name: '吃超量甜品', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '一次性吃大量甜食，血糖飙升', unit: '次', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'excess_sweets' },
    { id: 'gobble_food', name: '狼吞虎咽吃饭', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '吃饭太快不加咀嚼，消化负担重', unit: '次', scorePerUnit: -4, isNegative: true, tabKey: 'debuff', presetAction: 'gobble_food' },
    { id: 'skip_meals', name: '跳餐饮食不规律', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '跳餐不按时吃饭，打乱身体代谢节律', unit: '次', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'skip_meals' },
    { id: 'spicy_food_excess', name: '吃过多辛辣刺激食物', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '过量辛辣刺激肠胃，引起不适', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'spicy_food_excess' },
    { id: 'sugary_soda', name: '喝高糖碳酸饮料', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '喝高糖碳酸饮料，空热量伤牙伤身', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'sugary_soda' },
    { id: 'snacks_as_meal', name: '吃膨化零食当饭', topFilter: 'eat_chaos', sideFilter: 'eat_chaos',
      description: '用薯片等膨化零食替代正餐', unit: '次', scorePerUnit: -7, isNegative: true, tabKey: 'debuff', presetAction: 'snacks_as_meal' },

    // ======== 刷到失神（精神涣散类，娱乐沉迷与无效耗时）========
    { id: 'mindless_short_video', name: '无目的刷短视频', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '漫无目的地刷短视频，时光虚度', unit: '30分钟', scorePerUnit: -4, isNegative: true, tabKey: 'debuff', presetAction: 'mindless_short_video' },
    { id: 'game_addiction', name: '沉迷游戏超时', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '打游戏超时停不下来，虚度光阴', unit: '30分钟', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'game_addiction' },
    { id: 'trashy_short_drama', name: '刷爽文短剧', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '沉迷无营养爽文短剧，时光消磨', unit: '30分钟', scorePerUnit: -4, isNegative: true, tabKey: 'debuff', presetAction: 'trashy_short_drama' },
    { id: 'gossip_scroll', name: '漫无目的刷八卦', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '刷娱乐八卦无关信息，浪费精神', unit: '30分钟', scorePerUnit: -4, isNegative: true, tabKey: 'debuff', presetAction: 'gossip_scroll' },
    { id: 'slacking_at_work', name: '上班摸鱼划水', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '上班时间摸鱼偷懒不干活', unit: '30分钟', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'slacking_at_work' },
    { id: 'refresh_social_obsess', name: '反复刷新社交软件', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '强迫症式反复刷新社交动态', unit: '30分钟', scorePerUnit: -4, isNegative: true, tabKey: 'debuff', presetAction: 'refresh_social_obsess' },
    { id: 'brainless_movie', name: '看无脑爽片', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '看无营养的爆米花电影消磨时间', unit: '30分钟', scorePerUnit: -3, isNegative: true, tabKey: 'debuff', presetAction: 'brainless_movie' },
    { id: 'phone_all_night', name: '熬夜刷手机', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '深夜不睡刷手机，损伤眼睛与精神', unit: '30分钟', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'phone_all_night' },
    { id: 'drama_gossip_binge', name: '沉迷吃瓜冲浪', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '沉迷网络吃瓜围观，大把时间耗在八卦上', unit: '次', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'drama_gossip_binge' },
    { id: 'impulse_shopping_live', name: '刷直播冲动剁手', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '看直播冲动消费买不需要的东西', unit: '次', scorePerUnit: -8, isNegative: true, tabKey: 'debuff', presetAction: 'impulse_shopping_live' },
    { id: 'mindless_scroll_feed', name: '无效刷信息流', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '无目的刷信息流，大脑被无用信息塞满', unit: '30分钟', scorePerUnit: -4, isNegative: true, tabKey: 'debuff', presetAction: 'mindless_scroll_feed' },
    { id: 'cant_stop_video', name: '刷视频停不下来', topFilter: 'swipe_lost', sideFilter: 'swipe_lost',
      description: '一个接一个刷视频，完全忘了时间', unit: '30分钟', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'cant_stop_video' },

    // ======== 心魔缠身（情绪内耗与怠惰拖延类）========
    { id: 'lose_temper', name: '情绪失控发脾气', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '情绪失控，对人发火或过度焦虑', unit: '次', scorePerUnit: -8, isNegative: true, tabKey: 'debuff', presetAction: 'lose_temper' },
    { id: 'overthink_anxiety', name: '过度内耗焦虑', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '陷入反复思虑，消耗心神', unit: '次', scorePerUnit: -7, isNegative: true, tabKey: 'debuff', presetAction: 'overthink_anxiety' },
    { id: 'complain_about_others', name: '抱怨吐槽他人', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '不停抱怨吐槽，充满负能量', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: 'complain_about_others' },
    { id: 'envy_compare', name: '嫉妒攀比', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '嫉妒他人、不停攀比，内心失衡', unit: '次', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'envy_compare' },
    { id: 'self_denial', name: '陷入自我否定', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '陷入自我否定漩涡，怀疑自身价值', unit: '次', scorePerUnit: -7, isNegative: true, tabKey: 'debuff', presetAction: 'self_denial' },
    { id: 'rehash_old_stuff', name: '翻旧账反复纠结', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '反复翻旧账纠结过去的事，无法释怀', unit: '次', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'rehash_old_stuff' },
    { id: 'argue_with_others', name: '与人争吵争执', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '与人发生争吵冲突，耗气伤神', unit: '次', scorePerUnit: -8, isNegative: true, tabKey: 'debuff', presetAction: 'argue_with_others' },
    { id: 'procrastinate_task', name: '拖延当日任务未完成', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '计划内任务未完成，积压至明日', unit: '次', scorePerUnit: -8, isNegative: true, tabKey: 'debuff', presetAction: 'procrastinate_task' },
    { id: 'waste_whole_day', name: '躺平荒废一整天', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '一整天啥也没干，完全荒废', unit: '次', scorePerUnit: -15, isNegative: true, tabKey: 'debuff', presetAction: 'waste_whole_day' },
    { id: 'break_promise', name: '承诺的事拖延不做', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '答应了的事一拖再拖迟迟不行动', unit: '次', scorePerUnit: -7, isNegative: true, tabKey: 'debuff', presetAction: 'break_promise' },
    { id: 'sulk_hold_emotion', name: '生闷气憋情绪', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '把情绪憋在心里生闷气，不沟通不发泄', unit: '次', scorePerUnit: -6, isNegative: true, tabKey: 'debuff', presetAction: 'sulk_hold_emotion' },
    { id: 'goal_abandoned', name: '目标搁置不推进', topFilter: 'inner_demon', sideFilter: 'inner_demon',
      description: '设好的目标一直搁置，完全没推进', unit: '次', scorePerUnit: -8, isNegative: true, tabKey: 'debuff', presetAction: 'goal_abandoned' }

  ]
}

/**
 * 获取指定分类的活动列表
 */
function getActivitiesByCategory(categoryKey) {
  return ACTIVITY_LIBRARY[categoryKey] || []
}

/**
 * 按双层筛选过滤活动
 * @param {string} categoryKey - 分类 key
 * @param {string} topFilterKey - 顶部筛选 key，'all' 不过滤
 * @param {string} sideFilterKey - 侧边栏 key，'all' 不过滤
 */
function filterActivities(categoryKey, topFilterKey, sideFilterKey) {
  var list = getActivitiesByCategory(categoryKey)
  var result = list.filter(function(item) {
    if (topFilterKey && topFilterKey !== 'all' && item.topFilter !== topFilterKey) return false
    if (sideFilterKey && sideFilterKey !== 'all' && item.sideFilter !== sideFilterKey) return false
    return true
  })
  // 全部视图下，空白活动固定置顶
  if (!sideFilterKey || sideFilterKey === 'all') {
    for (var i = 0; i < result.length; i++) {
      if (result[i].sideFilter === 'blank') {
        var blankItem = result.splice(i, 1)[0]
        result.unshift(blankItem)
        break
      }
    }
  }
  return result
}

/**
 * 模糊搜索活动（按名称描述跨分类搜索）
 */
function searchActivities(keyword, categoryKey) {
  if (!keyword) {
    return categoryKey ? getActivitiesByCategory(categoryKey) : []
  }
  var kw = keyword.trim().toLowerCase()
  var results = []
  var categories = categoryKey ? [categoryKey] : Object.keys(ACTIVITY_LIBRARY)
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i]
    var list = ACTIVITY_LIBRARY[cat] || []
    for (var j = 0; j < list.length; j++) {
      var item = list[j]
      if (item.name.toLowerCase().indexOf(kw) !== -1 ||
          (item.description && item.description.toLowerCase().indexOf(kw) !== -1)) {
        results.push(item)
      }
    }
  }
  return results
}

/**
 * 按分类 + 筛选维度获取唯一 sideFilter 列表
 */
function getSideFilterKeysForCategory(categoryKey) {
  var list = getActivitiesByCategory(categoryKey)
  var seen = {}
  var keys = []
  for (var i = 0; i < list.length; i++) {
    var k = list[i].sideFilter
    if (k && !seen[k]) { seen[k] = true; keys.push(k) }
  }
  return keys
}

/**
 * 根据活动 ID 获取活动详情
 */
function getActivityById(activityId) {
  var cats = Object.keys(ACTIVITY_LIBRARY)
  for (var i = 0; i < cats.length; i++) {
    var list = ACTIVITY_LIBRARY[cats[i]]
    for (var j = 0; j < list.length; j++) {
      if (list[j].id === activityId) return list[j]
    }
  }
  return null
}

module.exports = {
  CATEGORIES: CATEGORIES,
  FILTER_CONFIGS: FILTER_CONFIGS,
  ACTIVITY_LIBRARY: ACTIVITY_LIBRARY,
  getActivitiesByCategory: getActivitiesByCategory,
  filterActivities: filterActivities,
  searchActivities: searchActivities,
  getSideFilterKeysForCategory: getSideFilterKeysForCategory,
  getActivityById: getActivityById
}
