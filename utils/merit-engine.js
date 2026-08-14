// ============================================================
// 天道修行 — 功德引擎 v1.0
//
// 功德 = 用户对社区的贡献总和（非修行积分）
// 功德来源：模板被点赞、收藏、导入、引用，精英模板被追随
// 功德作用：修行加成系数 + 功德专属称号
//
// 数据源（云数据库）：
//   public_templates 集合 → likeCount / favCount / importCount
//   elite_journeys 集合 → 被追随次数
// ============================================================

// ============================================================
// 一、功德换算规则（贡献 → 功德）
// ============================================================

/**
 * 各项贡献的功德权重
 * 参照热度分权重设计，但更突出长期价值和传播性
 */
var MERIT_WEIGHTS = {
  templatePublished:  10,   // 不变
  likeReceived:        3,   // 原 1
  favReceived:         5,   // 原 3
  importReceived:     10,   // 原 5
  eliteFollowed:      10,   // 不变
  templateFeatured:   50,   // 不变（预留）
  commentReceived:     2    // 原 1
}

// ============================================================
// 二、功德等级体系
// ============================================================

/**
 * 功德等级定义
 * 等级越高，修行加成越多
 */
var MERIT_LEVELS = [
  { min: 0,     max: 0,     level: 0, name: '无功无德',   icon: '🌑', color: '#9ca3af', bonus: 0.00, desc: '尚未布道，功行未显' },
  { min: 1,     max: 10,    level: 1, name: '初积善缘',   icon: '🌱', color: '#22c55e', bonus: 0.01, desc: '初有善举，种子方播' },
  { min: 11,    max: 50,    level: 2, name: '小有功德',   icon: '🌿', color: '#10b981', bonus: 0.02, desc: '善行渐积，草木初萌' },
  { min: 51,    max: 150,   level: 3, name: '功德渐显',   icon: '🪷', color: '#059669', bonus: 0.03, desc: '功德日益，莲华方绽' },
  { min: 151,   max: 400,   level: 4, name: '善名远扬',   icon: '🌟', color: '#f59e0b', bonus: 0.04, desc: '道途渐远，名传四方' },
  { min: 401,   max: 1000,  level: 5, name: '积善成德',   icon: '🔥', color: '#f97316', bonus: 0.05, desc: '善行汇聚，德光初现' },
  { min: 1001,  max: 3000,  level: 6, name: '德高望重',   icon: '👑', color: '#ef4444', bonus: 0.06, desc: '德被苍生，万众景仰' },
  { min: 3001,  max: 99999, level: 7, name: '道济天下',   icon: '⚡', color: '#a855f7', bonus: 0.07, desc: '功德无量，道济苍生' }
]

// ============================================================
// 三、功德计算函数
// ============================================================

/**
 * 从贡献统计数据计算功德值
 * @param {object} stats — 来自云函数 getCreatorStats 或本地降级计算
 *   { publishedCount, totalLikes, totalFavs, totalImports, eliteFollowers, totalComments }
 * @returns {object} { totalMerit, levelInfo, breakdown }
 */
function computeMerit(stats) {
  var s = stats || {}
  var breakdown = []
  var total = 0

  // 发布模板
  var pubCount = Number(s.publishedCount || 0)
  if (pubCount > 0) {
    var pubMerit = pubCount * MERIT_WEIGHTS.templatePublished
    total += pubMerit
    breakdown.push({ label: '发布模板', count: pubCount, weight: MERIT_WEIGHTS.templatePublished, merit: pubMerit })
  }

  // 收到点赞
  var likes = Number(s.totalLikes || 0)
  if (likes > 0) {
    var likeMerit = likes * MERIT_WEIGHTS.likeReceived
    total += likeMerit
    breakdown.push({ label: '收到点赞', count: likes, weight: MERIT_WEIGHTS.likeReceived, merit: likeMerit })
  }

  // 收到收藏
  var favs = Number(s.totalFavs || 0)
  if (favs > 0) {
    var favMerit = favs * MERIT_WEIGHTS.favReceived
    total += favMerit
    breakdown.push({ label: '收到收藏', count: favs, weight: MERIT_WEIGHTS.favReceived, merit: favMerit })
  }

  // 被导入
  var imports = Number(s.totalImports || 0)
  if (imports > 0) {
    var importMerit = imports * MERIT_WEIGHTS.importReceived
    total += importMerit
    breakdown.push({ label: '被导入使用', count: imports, weight: MERIT_WEIGHTS.importReceived, merit: importMerit })
  }

  // 精英被追随
  var followers = Number(s.eliteFollowers || 0)
  if (followers > 0) {
    var followerMerit = followers * MERIT_WEIGHTS.eliteFollowed
    total += followerMerit
    breakdown.push({ label: '精英被追随', count: followers, weight: MERIT_WEIGHTS.eliteFollowed, merit: followerMerit })
  }

  // 收到评论（预留）
  var comments = Number(s.totalComments || 0)
  if (comments > 0) {
    var commentMerit = comments * MERIT_WEIGHTS.commentReceived
    total += commentMerit
    breakdown.push({ label: '收到评论', count: comments, weight: MERIT_WEIGHTS.commentReceived, merit: commentMerit })
  }

  // 匹配功德等级
  var levelInfo = getMeritLevel(total)

  return {
    totalMerit: total,
    levelInfo: levelInfo,
    breakdown: breakdown,
    nextLevelAt: getNextLevelThreshold(total)
  }
}

/**
 * 根据功德值匹配等级
 */
function getMeritLevel(totalMerit) {
  for (var i = MERIT_LEVELS.length - 1; i >= 0; i--) {
    if (totalMerit >= MERIT_LEVELS[i].min) {
      return MERIT_LEVELS[i]
    }
  }
  return MERIT_LEVELS[0]
}

/**
 * 获取下一级所需功德
 */
function getNextLevelThreshold(currentMerit) {
  var currentLevel = getMeritLevel(currentMerit)
  if (currentLevel.level >= MERIT_LEVELS.length - 1) {
    return null // 已是最高级
  }
  var next = MERIT_LEVELS[currentLevel.level + 1]
  return {
    nextLevelName: next.name,
    needed: next.min - currentMerit,
    nextMin: next.min
  }
}

// ============================================================
// 四、功德贡献数据获取
// ============================================================

/**
 * 优先调云函数，兜底本地降级
 * 由 app.js 统一封装，本模块仅提供降级计算
 */
function computeMeritLocal(publishedList) {
  var list = publishedList || []
  var stats = {
    publishedCount: list.length,
    totalLikes: 0,
    totalFavs: 0,
    totalImports: 0,
    totalComments: 0,
    eliteFollowers: 0
  }
  list.forEach(function(t) {
    stats.totalLikes += Number(t.likeCount || 0)
    stats.totalFavs += Number(t.favCount || 0)
    stats.totalImports += Number(t.importCount || 0)
    stats.totalComments += Number(t.commentCount || 0)
  })
  return computeMerit(stats)
}

// ============================================================
// 五、功德修行加成
// ============================================================

/**
 * 获取功德加成比例（用于叠加到总加成体系中）
 * @param {number} totalMerit
 * @returns {object} { rate, level, name, icon, color, bonusItem }
 */
function getMeritBonus(totalMerit) {
  var levelInfo = getMeritLevel(totalMerit)
  return {
    rate: levelInfo.bonus,
    level: levelInfo.level,
    name: levelInfo.name,
    icon: levelInfo.icon,
    color: levelInfo.color,
    bonusItem: {
      label: '功德加成：' + levelInfo.name,
      rate: levelInfo.bonus,
      type: 'bonus',
      color: levelInfo.color,
      icon: levelInfo.icon
    }
  }
}

// ============================================================
// 六、功德专属称号体系
// ============================================================

/**
 * 功德称号（独立于核心修行称号，用 MERIT_ 前缀区分）
 * 只要功德达到对应等级即自动解锁
 */
var MERIT_TITLES = [
  {
    id: 'merit_1',
    name: '初积善缘',
    category: 'merit',
    color: '#22c55e',
    bonus: 0.01,
    poem: '一念善起万物生，初播福田待收成。',
    meritRequired: 1,
    conditionText: '功德 ≥ 1',
    order: 1
  },
  {
    id: 'merit_2',
    name: '小有功德',
    category: 'merit',
    color: '#10b981',
    bonus: 0.015,
    poem: '善行渐积如春水，润物无声自成溪。',
    meritRequired: 11,
    conditionText: '功德 ≥ 11',
    order: 2
  },
  {
    id: 'merit_3',
    name: '功德渐显',
    category: 'merit',
    color: '#059669',
    bonus: 0.02,
    poem: '日行一善功不唐，莲华出水见真章。',
    meritRequired: 51,
    conditionText: '功德 ≥ 51',
    order: 3
  },
  {
    id: 'merit_4',
    name: '善名远扬',
    category: 'merit',
    color: '#f59e0b',
    bonus: 0.025,
    poem: '道不远人德为邻，四方来朝问道心。',
    meritRequired: 151,
    conditionText: '功德 ≥ 151',
    order: 4
  },
  {
    id: 'merit_5',
    name: '积善成德',
    category: 'merit',
    color: '#f97316',
    bonus: 0.03,
    poem: '善积百年为德厚，金石为开感苍穹。',
    meritRequired: 401,
    conditionText: '功德 ≥ 401',
    order: 5
  },
  {
    id: 'merit_6',
    name: '德高望重',
    category: 'merit',
    color: '#ef4444',
    bonus: 0.035,
    poem: '德行天下众生仰，一片丹心照汗青。',
    meritRequired: 1001,
    conditionText: '功德 ≥ 1001',
    order: 6
  },
  {
    id: 'merit_7',
    name: '道济天下',
    category: 'merit',
    color: '#a855f7',
    bonus: 0.04,
    poem: '功德无量济苍生，大道之行万古明。',
    meritRequired: 3001,
    conditionText: '功德 ≥ 3001',
    order: 7
  }
]

/**
 * 根据功德值获取已解锁称号列表
 */
function getUnlockedMeritTitles(totalMerit) {
  return MERIT_TITLES.filter(function(t) {
    return totalMerit >= t.meritRequired
  })
}

/**
 * 获取最高功德称号
 */
function getHighestMeritTitle(totalMerit) {
  var unlocked = getUnlockedMeritTitles(totalMerit)
  return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null
}

module.exports = {
  MERIT_WEIGHTS: MERIT_WEIGHTS,
  MERIT_LEVELS: MERIT_LEVELS,
  MERIT_TITLES: MERIT_TITLES,
  computeMerit: computeMerit,
  getMeritLevel: getMeritLevel,
  getNextLevelThreshold: getNextLevelThreshold,
  computeMeritLocal: computeMeritLocal,
  getMeritBonus: getMeritBonus,
  getUnlockedMeritTitles: getUnlockedMeritTitles,
  getHighestMeritTitle: getHighestMeritTitle
}
