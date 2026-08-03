// ============================================================
// 天道修行 — 根骨体系 v2.0
//
// 核心变化：
//   - 6级玄幻命名：凡俗之骨→灵动之骨→清璞之骨→琉璃之骨→金玉之骨→仙髓之骨
//   - 取消单根骨单独加成，改为综合评分后全局统一加成
//   - 综合得分 = 力0.2+体0.2+敏0.15+神0.15+智0.15+行0.15
//   - 称号体系：9个顶级称号，归入「其他称号」分类
//   - 全部实时计算，不固化存储，兼容原有业务表
// ============================================================

var customPreset = null  // 懒加载

// ============================================================
// 一、六大根骨定义
// ============================================================

var ROOT_BONES = {
  strength: {
    id: 'strength',
    name: '力之根骨',
    icon: '\uD83D\uDCAA',  // 💪
    color: '#ef4444',
    desc: '抗阻力量训练，主司力量爆发',
    weight: 0.20,
    metrics: ['相对力量', '最大卧推深蹲硬拉', '累计训练容量']
  },
  endurance: {
    id: 'endurance',
    name: '体之根骨',
    icon: '\u26A1',  // ⚡
    color: '#22c55e',
    desc: '有氧心肺训练，主司体质耐力',
    weight: 0.20,
    metrics: ['最长跑步距离', '平均配速', '累计运动时长']
  },
  skill: {
    id: 'skill',
    name: '敏之根骨',
    icon: '\uD83E\uDDD8',  // 🧘
    color: '#8b5cf6',
    desc: '灵敏爆发协调，主司身法灵动',
    weight: 0.15,
    metrics: ['反应速度', '身体控制能力', '敏捷协调性']
  },
  mind: {
    id: 'mind',
    name: '神之根骨',
    icon: '\uD83E\uDDE0',  // 🧠
    color: '#ec4899',
    desc: '冥想专注修行，主司心神定力',
    weight: 0.15,
    metrics: ['单次专注时长', '连续冥想天数', '深度专注累计']
  },
  study: {
    id: 'study',
    name: '智之根骨',
    icon: '\uD83D\uDCD6',  // 📖
    color: '#6366f1',
    desc: '学习工作成长，主司智识学识',
    weight: 0.15,
    metrics: ['累计学习时长', '知识输入量', '技能掌握数量']
  },
  daily: {
    id: 'daily',
    name: '行之根骨',
    icon: '\uD83C\uDF05',  // 🌅
    color: '#64748b',
    desc: '日常习惯养成，主司日常修行',
    weight: 0.15,
    metrics: ['健康习惯连续性', '作息规律度', '行为自律性']
  }
}

// ============================================================
// 二、根骨等级体系（6阶玄幻命名）
// ============================================================

var BONE_LEVELS = [
  { level: 0, name: '凡俗之骨', shortName: '凡骨', score: 10,
    color: '#9ca3af', desc: '零基础新手，未形成稳定习惯' },
  { level: 1, name: '灵动之骨', shortName: '灵骨', score: 25,
    color: '#22c55e', desc: '入门半年，掌握基础动作' },
  { level: 2, name: '清璞之骨', shortName: '清骨', score: 40,
    color: '#3b82f6', desc: '系统训练1-2年，超过大众平均水平' },
  { level: 3, name: '琉璃之骨', shortName: '琉璃骨', score: 60,
    color: '#eab308', desc: '训练3年+，业余进阶水平' },
  { level: 4, name: '金玉之骨', shortName: '金玉骨', score: 80,
    color: '#f97316', desc: '业余精英，远超普通大众' },
  { level: 5, name: '仙髓之骨', shortName: '仙骨', score: 100,
    color: '#ef4444', desc: '业余顶尖，万中挑一' }
]

// ============================================================
// 三、综合评分与全局加成
// ============================================================

/**
 * 综合根骨等级 → 全局修为加成
 */
var COMPOSITE_BONUS_TABLE = [
  { maxScore: 20, bonusRate: 0.00, name: '凡俗之骨' },
  { maxScore: 40, bonusRate: 0.02, name: '灵动之骨' },
  { maxScore: 60, bonusRate: 0.04, name: '清璞之骨' },
  { maxScore: 75, bonusRate: 0.07, name: '琉璃之骨' },
  { maxScore: 90, bonusRate: 0.10, name: '金玉之骨' },
  { maxScore: 100, bonusRate: 0.15, name: '仙髓之骨' }
]

// ============================================================
// 四、称号体系（顶级/夯爆了）
// ============================================================

var ROOT_BONE_TITLES = {
  // 综合称号
  composite: [
    {
      id: 'bone_talent',
      name: '天纵奇才',
      rarity: 'top',
      category: '其他称号',
      desc: '综合根骨达金玉之骨，天赋异禀',
      condition: function(composite) { return composite.compositeScore >= 76 }
    },
    {
      id: 'bone_emperor',
      name: '大帝之姿',
      rarity: 'top',
      category: '其他称号',
      desc: '综合根骨达仙髓之骨，有帝者气象',
      condition: function(composite) { return composite.compositeScore >= 91 }
    },
    {
      id: 'bone_everything',
      name: '万古无二',
      rarity: 'top',
      category: '其他称号',
      desc: '六根骨全达仙髓，万中无一',
      hidden: true,
      condition: function(composite, boneLevels) {
        if (!boneLevels) return false
        var boneKeys = Object.keys(boneLevels)
        for (var i = 0; i < boneKeys.length; i++) {
          if (boneLevels[boneKeys[i]].level !== 5) return false
        }
        return true
      }
    }
  ],
  // 单项称号
  single: [
    { id: 'bone_strength', name: '撼天圣体', boneId: 'strength', rarity: 'top', category: '其他称号', desc: '力之根骨达仙髓，可撼天动地' },
    { id: 'bone_endurance', name: '神行天骨', boneId: 'endurance', rarity: 'top', category: '其他称号', desc: '体之根骨达仙髓，神行万里' },
    { id: 'bone_skill', name: '凌波仙骨', boneId: 'skill', rarity: 'top', category: '其他称号', desc: '敏之根骨达仙髓，凌波微步' },
    { id: 'bone_mind', name: '洞彻道心', boneId: 'mind', rarity: 'top', category: '其他称号', desc: '神之根骨达仙髓，洞彻万物' },
    { id: 'bone_study', name: '慧根深种', boneId: 'study', rarity: 'top', category: '其他称号', desc: '智之根骨达仙髓，慧根天成' },
    { id: 'bone_daily', name: '知行仙躯', boneId: 'daily', rarity: 'top', category: '其他称号', desc: '行之根骨达仙髓，知行合一' }
  ]
}

// ============================================================
// 五、用户配置存储
// ============================================================

var CONFIG_KEY = 'tiandao_root_bone_config'

function loadUserConfig() {
  try {
    var stored = wx.getStorageSync(CONFIG_KEY)
    if (stored && stored.bones) return stored
    return { bones: {}, titleUnlocks: {}, updatedAt: 0 }
  } catch (e) {
    return { bones: {}, titleUnlocks: {}, updatedAt: 0 }
  }
}

function saveUserConfig(config) {
  config.updatedAt = Date.now()
  wx.setStorageSync(CONFIG_KEY, config)
}

function getUserAddedPresets(boneId) {
  var config = loadUserConfig()
  var boneConfig = (config.bones && config.bones[boneId]) || null
  if (boneConfig && boneConfig.addedPresets && boneConfig.addedPresets.length > 0) {
    return boneConfig.addedPresets
  }
  // 默认推荐项目
  var defaults = {
    strength: ['bench_press', 'squat', 'deadlift', 'overhead_press', 'pullup'],
    endurance: ['running_5k', 'running_10k', 'cycling_20km', 'swim_100m'],
    skill: ['flexibility_sit_reach', 'yoga_session'],
    mind: ['meditation'],
    study: ['vocabulary_english', 'reading_pages', 'coding_hours'],
    daily: ['sleep_quality']
  }
  var def = defaults[boneId]
  return def ? def.slice() : []
}

function setUserAddedPresets(boneId, presetIds) {
  var config = loadUserConfig()
  if (!config.bones) config.bones = {}
  config.bones[boneId] = { addedPresets: presetIds || [] }
  saveUserConfig(config)
}

function isPresetInUserList(boneId, presetId) {
  var added = getUserAddedPresets(boneId)
  return added.indexOf(presetId) !== -1
}

// ============================================================
// 六、根骨评分与等级计算
// ============================================================

/**
 * 计算单根骨得分（0-100分制）
 * 基于该品类下所有预设的历史累计数据
 */
function calculateBoneScore(boneId) {
  var totalScore = _getCategoryTotalScore(boneId)
  return _normalizeToPercentile(totalScore, boneId)
}

/**
 * 获取某品类下所有预设的累计 score
 */
function _getCategoryTotalScore(boneId) {
  if (!customPreset) {
    customPreset = require('./custom-preset.js')
  }
  // 1) 现有 custom-preset 预设指标分
  var presets = customPreset.getPresetsByCategory(boneId)
  var totalScore = 0
  presets.forEach(function(p) {
    try {
      var key = 'tiandao_metrics_' + p.id
      var data = wx.getStorageSync(key)
      if (data && data.latest && data.latest.score) {
        totalScore += data.latest.score
      }
      if (data && data.history && data.history.length > 0) {
        data.history.forEach(function(h) {
          totalScore += (h.score || 0)
        })
      }
    } catch (e) {}
  })

  // 2) 【新增】拼接记录模块（records 集合）的运动数据
  //    通过 app.js 缓存的「全量记录→根骨分值」快照聚合
  totalScore += _getRecordBridgeScore(boneId)

  return totalScore
}

// ============================================================
// 记录模块桥接：从 records 集合提取数据映射到根骨品类
// ============================================================

var RECORD_BONE_CACHE_KEY = 'tiandao_record_bone_cache'
var RECORD_BONE_CACHE_TTL = 10 * 60 * 1000  // 10分钟有效

/**
 * 从记录聚合缓存中读取指定根骨品类的累计分值
 */
function _getRecordBridgeScore(boneId) {
  try {
    var cached = wx.getStorageSync(RECORD_BONE_CACHE_KEY)
    if (cached && cached.scores && cached.scores[boneId] !== undefined) {
      return cached.scores[boneId]
    }
  } catch (e) {}
  return 0
}

/**
 * 刷新记录→根骨分值缓存（由 app.js 在每次记录提交后调用）
 * @param {object} boneScores - { strength: 120, endurance: 80, mind: 30 }
 */
function refreshRecordBoneCache(boneScores) {
  try {
    wx.setStorageSync(RECORD_BONE_CACHE_KEY, {
      scores: boneScores || {},
      updatedAt: Date.now()
    })
  } catch (e) {}
}

/**
 * 将原始累积分映射到0-100分制
 * 分品类的渐进式阈值，让大众水平对应合理档位
 */
function _normalizeToPercentile(rawScore, boneId) {
  // 各品类分级阈值（使各等级大致对应用户规范中的现实水平）
  var thresholds = {
    strength:  [0, 15, 50, 120, 250, 500],
    endurance: [0, 10, 35, 90, 200, 400],
    skill:     [0, 8, 28, 70, 150, 300],
    mind:      [0, 6, 20, 55, 120, 250],
    study:     [0, 10, 35, 90, 200, 400],
    daily:     [0, 5, 18, 50, 110, 230]
  }
  var t = thresholds[boneId] || thresholds.strength

  // 在阈值区间内线性插值映射到 10/25/40/60/80/100
  var targetScores = BONE_LEVELS.map(function(l) { return l.score })
  var level = 0
  for (var i = t.length - 1; i > 0; i--) {
    if (rawScore >= t[i]) {
      level = i
      break
    }
  }
  if (level >= t.length - 1) return 100

  // 在当前等级和目标等级间线性插值
  var lowThreshold = t[level]
  var highThreshold = t[level + 1]
  var lowScore = targetScores[level]
  var highScore = targetScores[level + 1]
  var ratio = (rawScore - lowThreshold) / (highThreshold - lowThreshold)
  return Math.min(100, Math.round(lowScore + ratio * (highScore - lowScore)))
}

/**
 * 计算单根骨等级详情（含进度）
 */
function calculateBoneLevel(boneId) {
  var boneScore = calculateBoneScore(boneId)
  var levelInfo = _resolveBoneLevel(boneScore)
  var nextLevel = null
  if (levelInfo.level < BONE_LEVELS.length - 1) {
    nextLevel = BONE_LEVELS[levelInfo.level + 1]
  }
  var progress = 0
  if (nextLevel) {
    var curScore = BONE_LEVELS[levelInfo.level].score
    progress = Math.min(100, Math.round((boneScore - curScore) / (nextLevel.score - curScore) * 100))
  } else {
    progress = 100
  }
  return {
    level: levelInfo.level,
    name: levelInfo.name,
    shortName: levelInfo.shortName,
    score: boneScore,
    color: levelInfo.color,
    nextLevel: nextLevel,
    progress: progress
  }
}

function _resolveBoneLevel(score) {
  var result = BONE_LEVELS[0]
  for (var i = BONE_LEVELS.length - 1; i >= 0; i--) {
    if (score >= BONE_LEVELS[i].score) {
      result = BONE_LEVELS[i]
      break
    }
  }
  return result
}

// ============================================================
// 七、综合评分与全局加成
// ============================================================

/**
 * 计算综合根骨得分与全局加成
 * @returns {{ compositeScore, compositeName, compositeLevel, globalBonusRate, globalBonusPercent, boneLevels }}
 */
function calculateComposite() {
  var boneIds = Object.keys(ROOT_BONES)
  var boneLevels = {}
  var compositeScore = 0

  boneIds.forEach(function(id) {
    var bone = ROOT_BONES[id]
    var levelInfo = calculateBoneLevel(id)
    boneLevels[id] = levelInfo
    compositeScore += levelInfo.score * bone.weight
  })

  compositeScore = Math.round(compositeScore)

  // 检测是否六根全仙髓（万古无二隐藏称号条件）
  var boneAllSixImmortal = true
  boneIds.forEach(function(id) {
    if (!boneLevels[id] || boneLevels[id].level !== 5) {
      boneAllSixImmortal = false
    }
  })

  // 查表获取全局加成
  var compositeName = '凡俗之骨'
  var compositeLevel = 0
  var globalBonusRate = 0
  for (var i = 0; i < COMPOSITE_BONUS_TABLE.length; i++) {
    if (compositeScore <= COMPOSITE_BONUS_TABLE[i].maxScore) {
      compositeName = COMPOSITE_BONUS_TABLE[i].name
      compositeLevel = i
      globalBonusRate = COMPOSITE_BONUS_TABLE[i].bonusRate
      break
    }
  }

  return {
    compositeScore: compositeScore,
    compositeName: compositeName,
    compositeLevel: compositeLevel,
    globalBonusRate: globalBonusRate,
    globalBonusPercent: Math.round(globalBonusRate * 100),
    boneLevels: boneLevels,
    boneAllSixImmortal: boneAllSixImmortal
  }
}

/**
 * 获取全局修为加成比例
 */
function getGlobalBonusRate() {
  var comp = calculateComposite()
  return comp.globalBonusRate
}

/**
 * 对基础修为应用全局根骨加成
 */
function applyGlobalRootBonus(baseScore) {
  if (!baseScore || baseScore <= 0) {
    return { finalScore: baseScore, bonusScore: 0, bonusRate: 0, compositeName: '' }
  }
  var comp = calculateComposite()
  var bonusScore = Math.round(baseScore * comp.globalBonusRate)
  return {
    finalScore: baseScore + bonusScore,
    bonusScore: bonusScore,
    bonusRate: comp.globalBonusRate,
    compositeName: comp.compositeName
  }
}

// ============================================================
// 八、称号解锁逻辑
// ============================================================

/**
 * 检查并解锁新称号
 * @returns {{ newUnlocks: array, allUnlocked: array }}
 */
function checkAndUnlockTitles() {
  var comp = calculateComposite()
  var config = loadUserConfig()
  if (!config.titleUnlocks) config.titleUnlocks = {}

  var newUnlocks = []
  var allUnlocked = config.titleUnlocks

  // 检查综合称号
  ROOT_BONE_TITLES.composite.forEach(function(title) {
    if (!allUnlocked[title.id] && title.condition(comp, comp.boneLevels)) {
      allUnlocked[title.id] = Date.now()
      newUnlocks.push({
        id: title.id,
        name: title.name,
        rarity: title.rarity,
        category: title.category,
        desc: title.desc,
        hidden: title.hidden || false,
        isNew: true
      })
    }
  })

  // 检查单项称号
  ROOT_BONE_TITLES.single.forEach(function(title) {
    if (!allUnlocked[title.id] && comp.boneLevels[title.boneId] && comp.boneLevels[title.boneId].level === 5) {
      allUnlocked[title.id] = Date.now()
      newUnlocks.push({
        id: title.id,
        name: title.name,
        rarity: title.rarity,
        category: title.category,
        desc: title.desc,
        isNew: true
      })
    }
  })

  if (newUnlocks.length > 0) {
    saveUserConfig(config)
  }

  return {
    newUnlocks: newUnlocks,
    allUnlocked: _getAllTitleStatus(allUnlocked, comp)
  }
}

/**
 * 获取所有称号状态（包含未解锁的）
 */
function _getAllTitleStatus(unlockedMap, comp) {
  var all = []

  // 综合称号
  ROOT_BONE_TITLES.composite.forEach(function(title) {
    all.push({
      id: title.id,
      name: title.name,
      rarity: title.rarity,
      category: title.category,
      desc: title.desc,
      hidden: title.hidden || false,
      unlocked: !!unlockedMap[title.id],
      unlockedAt: unlockedMap[title.id] || null
    })
  })

  // 单项称号
  ROOT_BONE_TITLES.single.forEach(function(title) {
    all.push({
      id: title.id,
      name: title.name,
      rarity: title.rarity,
      category: title.category,
      desc: title.desc,
      boneId: title.boneId,
      boneName: ROOT_BONES[title.boneId] ? ROOT_BONES[title.boneId].name : '',
      unlocked: !!unlockedMap[title.id],
      unlockedAt: unlockedMap[title.id] || null,
      currentLevel: comp.boneLevels[title.boneId] ? comp.boneLevels[title.boneId].name : ''
    })
  })

  return all
}

/**
 * 获取所有称号（供外部展示用）
 */
function getAllTitles() {
  return checkAndUnlockTitles().allUnlocked
}

// ============================================================
// 九、便捷导出函数
// ============================================================

function getAllBoneOverviews() {
  var comp = calculateComposite()
  return {
    compositeScore: comp.compositeScore,
    compositeName: comp.compositeName,
    globalBonusPercent: Math.round(comp.globalBonusRate * 100),
    boneLevels: comp.boneLevels
  }
}

function getTopBoneOverviews(count) {
  count = count || 3
  var comp = calculateComposite()
  var entries = []
  Object.keys(comp.boneLevels).forEach(function(id) {
    entries.push({
      id: id,
      name: ROOT_BONES[id].name,
      icon: ROOT_BONES[id].icon,
      color: ROOT_BONES[id].color,
      levelName: comp.boneLevels[id].name,
      levelShortName: comp.boneLevels[id].shortName,
      score: comp.boneLevels[id].score,
      progress: comp.boneLevels[id].progress,
      levelColor: comp.boneLevels[id].color
    })
  })
  entries.sort(function(a, b) { return b.score - a.score })
  return entries.slice(0, count)
}

module.exports = {
  ROOT_BONES: ROOT_BONES,
  BONE_LEVELS: BONE_LEVELS,
  COMPOSITE_BONUS_TABLE: COMPOSITE_BONUS_TABLE,
  ROOT_BONE_TITLES: ROOT_BONE_TITLES,

  // 配置存储
  loadUserConfig: loadUserConfig,
  saveUserConfig: saveUserConfig,
  getUserAddedPresets: getUserAddedPresets,
  setUserAddedPresets: setUserAddedPresets,
  isPresetInUserList: isPresetInUserList,

  // 评分与等级
  calculateBoneScore: calculateBoneScore,
  calculateBoneLevel: calculateBoneLevel,
  calculateComposite: calculateComposite,
  getGlobalBonusRate: getGlobalBonusRate,
  applyGlobalRootBonus: applyGlobalRootBonus,

  // 称号
  checkAndUnlockTitles: checkAndUnlockTitles,
  getAllTitles: getAllTitles,

  // 便捷
  getAllBoneOverviews: getAllBoneOverviews,
  getTopBoneOverviews: getTopBoneOverviews,

  // 记录模块桥接
  refreshRecordBoneCache: refreshRecordBoneCache
}
