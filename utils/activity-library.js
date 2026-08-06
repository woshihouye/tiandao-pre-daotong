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
    categories: [
      { key: 'all', name: '全部' },
      { key: 'bulk', name: '增肌' },
      { key: 'cut', name: '减脂' },
      { key: 'health', name: '养生' },
      { key: 'free', name: '我free啦' },
      { key: 'unknown', name: '不知道' }
    ],
    metaCards: [
      { key: 'daily', name: '日常卡', desc: '选几项就记完' },
      { key: 'precision', name: '精准卡', desc: '精确营养素' },
      { key: 'diet_free', name: 'free卡', desc: '自由定义' }
    ]
  },
  study: {
    categories: [
      { key: 'all', name: '全部' },
      { key: 'knowledge', name: '学知识' },
      { key: 'skill', name: '练技艺' },
      { key: 'worldly', name: '见世面' },
      { key: 'cyber', name: '赛博修行' },
      { key: 'unknown', name: '不知道' }
    ],
    metaCards: [
      { key: 'input', name: '输入卡', desc: '听书阅读看视频' },
      { key: 'process', name: '处理卡', desc: '笔记整理复盘' },
      { key: 'output', name: '输出卡', desc: '写作汇报分享' }
    ]
  },
  work: {
    categories: [
      { key: 'all', name: '全部' },
      { key: 'kaitian', name: '开天' },
      { key: 'butian', name: '补天' },
      { key: 'fun', name: '有意思' },
      { key: 'boring', name: '不好玩' },
      { key: 'unknown', name: '不知道' }
    ],
    metaCards: [
      { key: 'plan', name: '谋卡', desc: '策划设计谋划' },
      { key: 'execute', name: '行卡', desc: '执行开发落地' },
      { key: 'talk', name: '谈卡', desc: '沟通对齐谈判' }
    ]
  },
  debuff: {
    categories: [
      { key: 'all', name: '全部' },
      { key: 'body_hurt', name: '伤身' },
      { key: 'eat_chaos', name: '乱食' },
      { key: 'screen_lost', name: '溺屏' },
      { key: 'inner_demon', name: '内耗' },
      { key: 'unknown', name: '不知道' }
    ],
    metaCards: [
      { key: 'body_harm', name: '伤身卡', desc: '作息紊乱身体损耗' },
      { key: 'eat_chaos', name: '乱食卡', desc: '饮食失控暴饮暴食' },
      { key: 'screen_lost', name: '溺屏卡', desc: '沉迷屏幕虚度光阴' },
      { key: 'inner_demon', name: '内耗卡', desc: '情绪内耗拖延怠惰' }
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
    { id: 'blank_diet', name: '空白丹食', metaCard: 'diet_free',
      description: '自由记录饮食修行', unit: '份', scorePerUnit: 1, tabKey: 'diet', presetAction: '' }
  ],

  // ============================================================
  //  三、悟·修心
  // ============================================================
  study: [
    { id: 'blank_study', name: '空白修心', metaCard: 'output',
      description: '自由记录修心修行', unit: '10分钟', scorePerUnit: 1, tabKey: 'study', presetAction: '' }
  ],
  // ============================================================
  //  四、工·功业
  // ============================================================
  work: [
    { id: 'blank_work', name: '空白功业', metaCard: 'talk',
      description: '自由记录功业修行', unit: '30分钟', scorePerUnit: 1, tabKey: 'work', presetAction: '' }
  ],

  // ============================================================
  //  五、煞·心魔
  // ============================================================
  debuff: [
    { id: 'blank_debuff', name: '空白心魔', metaCard: 'inner_demon',
      description: '自由记录心魔修行', unit: '次', scorePerUnit: -5, isNegative: true, tabKey: 'debuff', presetAction: '' }
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
      if (result[i].sideFilter === 'blank' || result[i].sideFilter === 'unknown') {
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
