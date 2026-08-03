// ====================================================================
// 天道修行 — 统一行为量化引擎 (v1.0)
// unified-score.js
//
// 统一修为公式：修为 = 基准分 × 强度系数 × 有效率 × 辅修系数
//
// 设计原则：
//  1. 基准分锚定 — 每个大类固定基准分，不受体征/体系/等级影响
//  2. 强度横向可比 — 不同大类同等强度代表同等程度的投入
//  3. 有效率纵向公平 — 不同验证方式通过折扣体现数据质量差异
//  4. 辅修公正 — 辅修行为 ×0.8 确保主修赛道竞争优势
//  5. 向后兼容 — 仅此模块提供新公式，存量数据完全不受影响
// ====================================================================

// ====================================================================
// 一、四大类基准分配表
// ====================================================================

/**
 * 大类 → 基准分配定义
 * 每个大类有固定的 baseScore，不随用户体征变化
 * unitLabel 为辅助展示用的行为单元描述
 */
var CATEGORY_CONFIG = {
  // 武：运动训练
  wu: {
    baseScore: 8,
    unitLabel: '次训练',
    desc: '力量训练、有氧运动、柔韧修行',
    subCategories: ['lianti', 'lianqi', 'yangqi']
  },
  // 食：饮食（含补剂）
  shi: {
    baseScore: 5,
    unitLabel: '餐',
    desc: '正餐录入、补剂摄入',
    subCategories: ['diet', 'supplement']
  },
  // 悟：学习/修心
  wu_xin: {
    baseScore: 6,
    unitLabel: '专注块(25min)',
    desc: '学习、阅读、技能练习',
    subCategories: ['study']
  },
  // 工：工作/功业
  gong: {
    baseScore: 6,
    unitLabel: '功业块(30min)',
    desc: '工作产出、项目管理',
    subCategories: ['work']
  },
  // 煞：负面行为（扣分）
  sha: {
    baseScore: -5,
    unitLabel: '次',
    desc: '熬夜、暴食、拖延、烟酒',
    subCategories: ['debuff']
  }
}

// ====================================================================
// 二、武 · 训练强度系数表
// ====================================================================

/**
 * 强度等级 → 系数值 → 判定条件
 * 按道途（lianti/lianqi/yangqi）细分判定标准
 */
var INTENSITY_WU = {
  levels: [
    { id: 'light',   coeff: 0.5, label: '轻度' },
    { id: 'moderate', coeff: 1.0, label: '中度' },
    { id: 'high',    coeff: 1.5, label: '高强度' },
    { id: 'extreme', coeff: 2.0, label: '极限' }
  ],
  // 每个道途的强度判定规则
  rules: {
    lianti: function(params) {
      var rpe = params.rpe
      if (rpe === undefined || rpe === null) {
        // 无 RPE 时按其他指标兜底
        var sets = params.sets || 0
        var weightKg = params.weightKg || 0
        if (sets >= 8 || weightKg >= 120) return 'extreme'
        if (sets >= 6 || weightKg >= 80) return 'high'
        if (sets >= 3 || weightKg >= 40) return 'moderate'
        return 'light'
      }
      if (rpe >= 9.5) return 'extreme'
      if (rpe >= 8.5) return 'high'
      if (rpe >= 7.5) return 'moderate'
      return 'light'
    },
    lianqi: function(params) {
      var hrZone = params.hrZone
      if (hrZone === 5) return 'extreme'
      if (hrZone === 4) return 'high'
      if (hrZone === 3 || hrZone === 2) return 'moderate'
      // 无 HR 数据时按时长和强度估判
      var dur = params.duration || 0
      var intensity = params.intensity || ''
      if (intensity === 'race' || intensity === 'competition' || dur > 120) return 'extreme'
      if (intensity === 'intervals' || intensity === 'tempo' || dur > 60) return 'high'
      if (dur > 20) return 'moderate'
      return 'light'
    },
    yangqi: function(params) {
      var dur = params.duration || 0
      if (dur > 60) return 'extreme'
      if (dur > 30) return 'high'
      if (dur > 15) return 'moderate'
      return 'light'
    }
  }
}

// ====================================================================
// 三、食 · 营养等级系数表
// ====================================================================

var INTENSITY_SHI = {
  levels: [
    { id: 'perfect',  coeff: 2.0, label: '完美' },
    { id: 'good',     coeff: 1.5, label: '良好' },
    { id: 'normal',   coeff: 1.0, label: '一般' },
    { id: 'poor',     coeff: 0.5, label: '偏差' },
    { id: 'junk',     coeff: -1.0, label: '垃圾' }
  ],
  /**
   * 综合营养等级判定
   * 优先级：junk > perfect > good > normal > poor
   */
  determine: function(params) {
    var isJunk = !!(
      params.isBingeEat || params.isJunk || params.isJunkFood ||
      params.foodQuality === 'junk' || params.foodQuality === 'unhealthy'
    )
    if (isJunk) return 'junk'

    // 从营养分析结果提取
    var nutritionGrade = params.nutritionGrade || ''
    var fitLevel = (params.fit && params.fit.fitLevel) || ''
    var mealLevel = params.mealLevel || ''

    // 垃圾食品 → junk
    if (nutritionGrade === 'junk' || fitLevel === 'harmful') return 'junk'

    // 完美适配
    if (fitLevel === 'excellent' ||
        (nutritionGrade === 'premium' && fitLevel === 'good') ||
        mealLevel === 'excellent') {
      return 'perfect'
    }

    // 良好适配
    if (fitLevel === 'good' ||
        nutritionGrade === 'premium' ||
        mealLevel === 'good') {
      return 'good'
    }

    // 偏差：营养低或不太适配
    if (fitLevel === 'poor' ||
        nutritionGrade === 'low' ||
        mealLevel === 'poor') {
      return 'poor'
    }

    // 默认：一般
    return 'normal'
  }
}

// ====================================================================
// 四、悟 · 深度等级系数表
// ====================================================================

var INTENSITY_WU_XIN = {
  levels: [
    { id: 'browse',  coeff: 0.5, label: '浏览' },
    { id: 'learn',   coeff: 1.0, label: '学习' },
    { id: 'deep',    coeff: 1.5, label: '深度' },
    { id: 'create',  coeff: 2.0, label: '创作' }
  ],
  /**
   * 根据学习行为参数判定深度等级
   */
  determine: function(params) {
    var dur = params.duration || 0
    var goalDone = params.goalDone
    var newKnowledge = params.newKnowledge
    var review = params.review
    var hasOutput = params.hasOutput || params.earlyRise

    // 创作：有明确产出标记 + 已完成目标
    if (goalDone && hasOutput) return 'create'

    // 深度：长时专注 + 达成目标
    if (goalDone && dur >= 60) return 'deep'
    if (dur >= 90) return 'deep'

    // 学习：系统学习/复习 + 适中时长
    if ((newKnowledge || review) && dur >= 25) return 'learn'

    // 浏览：碎片信息 / 短时间
    return 'browse'
  }
}

// ====================================================================
// 五、工 · 产出等级系数表
// ====================================================================

var INTENSITY_GONG = {
  levels: [
    { id: 'execute', coeff: 0.5, label: '执行' },
    { id: 'improve', coeff: 1.0, label: '优化' },
    { id: 'breakthrough', coeff: 1.5, label: '突破' },
    { id: 'create',  coeff: 2.0, label: '创造' }
  ],
  /**
   * 根据工作行为参数判定产出等级
   */
  determine: function(params) {
    var goalDone = params.goalDone
    var review = params.review
    var noDistraction = params.noDistraction
    var extraEffort = params.extraEffort
    var dur = params.duration || 0

    // 创造：完成目标 + 额外付出 + 长时
    if (goalDone && extraEffort && dur >= 60) return 'create'

    // 突破：完成目标
    if (goalDone && dur >= 30) return 'breakthrough'

    // 优化：有复盘
    if (review) return 'improve'

    // 执行：专注完成日常事务
    if (noDistraction) return 'execute'

    // 默认：基于时长兜底
    if (dur >= 60) return 'improve'
    return 'execute'
  }
}

// ====================================================================
// 六、煞 · 严重程度系数表
// ====================================================================

var INTENSITY_SHA = {
  levels: [
    { id: 'minor',   coeff: 0.5, label: '轻微' },
    { id: 'normal',  coeff: 1.0, label: '一般' },
    { id: 'serious', coeff: 1.5, label: '严重' },
    { id: 'fatal',   coeff: 2.0, label: '致命' }
  ],
  // DEBUFF_TYPES → 严重程度映射
  debuffMap: {
    'PROCRASTINATE': 'minor',
    'STAY_UP': 'normal',
    'BINGE_EAT': 'serious',
    'SMOKE_DRINK': 'fatal',
    'DEFAULT': 'normal'
  }
}

// ====================================================================
// 七、验证有效率表
// ====================================================================

var EFFICIENCY_TABLE = {
  'ai_vision':   { rate: 1.0, label: 'AI验证' },
  'task_checkin': { rate: 0.8, label: '任务打卡' },
  'manual_claim': { rate: 0.5, label: '手动申报' }
}

// ====================================================================
// 八、辅修系数表
// ====================================================================

var SUB_COEFF = {
  main: 1.0,
  side: 0.8
}

// ====================================================================
// 九、三大体系每日上限配置
// ====================================================================

/**
 * 各体系 (cultivation system) 的 dailyLimit
 * 等同于原 TEMPLATE_DAILY_BASE_SCORE 的 dailyLimit
 */
var SYSTEM_DAILY_LIMIT = {
  body: 60,
  beauty: 40,
  traditional: 50,
  worldly: 45,
  custom: 45
}

/**
 * L1 = dailyLimit
 * L2 = dailyLimit × 0.8
 * L3 = dailyLimit × 1.5
 */
function getCapConfig(systemKey) {
  var dailyLimit = SYSTEM_DAILY_LIMIT[systemKey] || 50
  return {
    dailyLimit: dailyLimit,
    L1_mainCap: dailyLimit,
    L2_subCap: Math.floor(dailyLimit * 0.8),
    L3_totalCap: Math.floor(dailyLimit * 1.5)
  }
}

// ====================================================================
// 十、核心计算函数
// ====================================================================

/**
 * 统一修为计算入口
 *
 * @param {string} category - 行为大类: 'wu' | 'shi' | 'wu_xin' | 'gong' | 'sha'
 * @param {object} params - 行为参数（强度判定依据）
 *   wu:  { pathKey, rpe, sets, weightKg, hrZone, duration, intensity }
 *   shi: { isBingeEat, nutritionGrade, foodQuality, fit, mealLevel }
 *   wu_xin: { duration, goalDone, newKnowledge, review, hasOutput }
 *   gong: { duration, goalDone, review, noDistraction, extraEffort }
 *   sha: { debuffType, todayCount, weekCount }
 * @param {object} [opts] 可选参数
 *   { verifySource: 'ai_vision'|'task_checkin'|'manual_claim',
 *     isMainPath: boolean,
 *     systemKey: string,
 *     todayMainGained: number,
 *     todaySubGained: number,
 *     todayBonusGained: number }
 *
 * @returns {object}
 *   {
 *     score: number,        // 最终修为值（已夹紧到上限内）
 *     baseScore: number,    // 基准分
 *     intensity: number,    // 强度系数
 *     intensityLabel: string,
 *     efficiency: number,   // 有效率
 *     efficiencyLabel: string,
 *     subCoeff: number,     // 辅修系数
 *     isMainPath: boolean,
 *     formula: string,
 *     capResult: { allowed, capped, layer, reason, remainL1, remainL2, remainL3 }
 *   }
 */
function calc(category, params, opts) {
  var config = CATEGORY_CONFIG[category]
  if (!config) {
    return {
      score: 0,
      error: 'unknown_category',
      formula: 'unknown_category: ' + category
    }
  }

  opts = opts || {}

  // 1. 基准分
  var baseScore = config.baseScore

  // 2. 强度系数
  var intensityResult = determineIntensity(category, params)
  var intensity = intensityResult.coeff
  var intensityLabel = intensityResult.label

  // 3. 验证有效率
  var verifySource = opts.verifySource || 'manual_claim'
  var effEntry = EFFICIENCY_TABLE[verifySource] || EFFICIENCY_TABLE.manual_claim
  var efficiency = effEntry.rate
  var efficiencyLabel = effEntry.label

  // 4. 辅修系数
  var isMainPath = opts.isMainPath !== false
  var subCoeff = isMainPath ? SUB_COEFF.main : SUB_COEFF.side

  // 5. 计算原始修为
  var rawScore = baseScore * intensity * efficiency * subCoeff
  // 保留一位小数，负分向下取整
  var computedScore = category === 'sha'
    ? Math.floor(rawScore)
    : Math.round(rawScore * 10) / 10

  // 6. 三层上限校验
  var capResult = checkCap(category, opts, computedScore)

  // 7. 最终得分
  var score = capResult.allowed

  return {
    score: score,
    baseScore: baseScore,
    intensity: intensity,
    intensityLabel: intensityLabel,
    efficiency: efficiency,
    efficiencyLabel: efficiencyLabel,
    verifySource: verifySource,
    subCoeff: subCoeff,
    isMainPath: isMainPath,
    formula: baseScore + '\u00d7' + intensity + '\u00d7' + efficiency + '\u00d7' + subCoeff + '=' + computedScore,
    rawScore: computedScore,
    capResult: capResult
  }
}

/**
 * 判定强度系数
 * @returns { coeff: number, label: string, levelId: string }
 */
function determineIntensity(category, params) {
  params = params || {}
  var table, levels

  switch (category) {
    case 'wu':
      table = INTENSITY_WU
      // 道途判定
      var pathKey = params.pathKey || 'lianti'
      var ruleFn = table.rules[pathKey] || table.rules.lianti
      var levelId = ruleFn(params)
      levels = table.levels
      for (var i = 0; i < levels.length; i++) {
        if (levels[i].id === levelId) {
          return { coeff: levels[i].coeff, label: levels[i].label, levelId: levelId }
        }
      }
      // 兜底
      return { coeff: 1.0, label: '中度', levelId: 'moderate' }

    case 'shi':
      table = INTENSITY_SHI
      levelId = table.determine(params)
      levels = table.levels
      for (var j = 0; j < levels.length; j++) {
        if (levels[j].id === levelId) {
          return { coeff: levels[j].coeff, label: levels[j].label, levelId: levelId }
        }
      }
      return { coeff: 1.0, label: '一般', levelId: 'normal' }

    case 'wu_xin':
      table = INTENSITY_WU_XIN
      levelId = table.determine(params)
      levels = table.levels
      for (var k = 0; k < levels.length; k++) {
        if (levels[k].id === levelId) {
          return { coeff: levels[k].coeff, label: levels[k].label, levelId: levelId }
        }
      }
      return { coeff: 1.0, label: '学习', levelId: 'learn' }

    case 'gong':
      table = INTENSITY_GONG
      levelId = table.determine(params)
      levels = table.levels
      for (var l = 0; l < levels.length; l++) {
        if (levels[l].id === levelId) {
          return { coeff: levels[l].coeff, label: levels[l].label, levelId: levelId }
        }
      }
      return { coeff: 1.0, label: '优化', levelId: 'improve' }

    case 'sha':
      var debuffType = (params.debuffType || '').toUpperCase()
      var mappedLevel = INTENSITY_SHA.debuffMap[debuffType] || INTENSITY_SHA.debuffMap.DEFAULT
      var sLevels = INTENSITY_SHA.levels
      for (var m = 0; m < sLevels.length; m++) {
        if (sLevels[m].id === mappedLevel) {
          return { coeff: sLevels[m].coeff, label: sLevels[m].label, levelId: mappedLevel }
        }
      }
      return { coeff: 1.0, label: '一般', levelId: 'normal' }

    default:
      return { coeff: 1.0, label: '标准', levelId: 'normal' }
  }
}

// ====================================================================
// 十一、三层上限校验
// ====================================================================

/**
 * 三层上限校验
 *
 * @param {string} category - 行为大类
 * @param {object} opts - { systemKey, isMainPath, todayMainGained, todaySubGained, todayBonusGained }
 * @param {number} computedScore - 本次计算的原始修为
 * @returns {object} { allowed, capped, layer, reason, remainL1, remainL2, remainL3 }
 */
function checkCap(category, opts, computedScore) {
  opts = opts || {}
  var systemKey = opts.systemKey || 'traditional'
  var isMainPath = opts.isMainPath !== false
  var dailyLimit = SYSTEM_DAILY_LIMIT[systemKey] || 50

  var L1 = dailyLimit
  var L2 = Math.floor(dailyLimit * 0.8)
  var L3 = Math.floor(dailyLimit * 1.5)

  var mainUsed = opts.todayMainGained || 0
  var subUsed = opts.todaySubGained || 0
  var bonusUsed = opts.todayBonusGained || 0
  var totalUsed = mainUsed + subUsed + bonusUsed

  var remainL1 = Math.max(0, L1 - mainUsed)
  var remainL2 = Math.max(0, L2 - subUsed)
  var remainL3 = Math.max(0, L3 - totalUsed)

  // L1: 主修上限
  if (isMainPath && remainL1 <= 0) {
    return {
      allowed: 0,
      capped: true,
      layer: 1,
      reason: 'L1:主修大类已达日上限(' + L1 + ')，' + mainUsed + '已用',
      remainL1: 0,
      remainL2: remainL2,
      remainL3: remainL3
    }
  }

  // L2: 辅修上限
  if (!isMainPath && remainL2 <= 0) {
    return {
      allowed: 0,
      capped: true,
      layer: 2,
      reason: 'L2:辅修大类已达日上限(' + L2 + ')，' + subUsed + '已用',
      remainL1: remainL1,
      remainL2: 0,
      remainL3: remainL3
    }
  }

  // L3: 总上限
  if (remainL3 <= 0) {
    return {
      allowed: 0,
      capped: true,
      layer: 3,
      reason: 'L3:总修为已达日上限(' + L3 + ')，' + totalUsed + '已用',
      remainL1: remainL1,
      remainL2: remainL2,
      remainL3: 0
    }
  }

  // 计算实际可用额度
  var maxByPath = isMainPath ? remainL1 : Math.min(remainL2, remainL3)
  var allowed = Math.min(computedScore, maxByPath)
  var capped = allowed < computedScore

  return {
    allowed: allowed,
    capped: capped,
    layer: capped ? (isMainPath ? 1 : 2) : 0,
    reason: capped ? '修为超出' + (isMainPath ? '主修' : '辅修') + '上限，已截断至 ' + allowed : '',
    remainL1: isMainPath ? Math.max(0, remainL1 - allowed) : remainL1,
    remainL2: !isMainPath ? Math.max(0, remainL2 - allowed) : remainL2,
    remainL3: Math.max(0, remainL3 - allowed)
  }
}

/**
 * 获取单日剩余修为余额（供UI预览用）
 */
function getRemainingCap(systemKey, todayMainGained, todaySubGained, todayBonusGained) {
  systemKey = systemKey || 'traditional'
  var dailyLimit = SYSTEM_DAILY_LIMIT[systemKey] || 50
  var mainUsed = todayMainGained || 0
  var subUsed = todaySubGained || 0
  var bonusUsed = todayBonusGained || 0

  return {
    systemKey: systemKey,
    dailyLimit: dailyLimit,
    L1_mainCap: dailyLimit,
    L1_remain: Math.max(0, dailyLimit - mainUsed),
    L2_subCap: Math.floor(dailyLimit * 0.8),
    L2_remain: Math.max(0, Math.floor(dailyLimit * 0.8) - subUsed),
    L3_totalCap: Math.floor(dailyLimit * 1.5),
    L3_remain: Math.max(0, Math.floor(dailyLimit * 1.5) - (mainUsed + subUsed + bonusUsed)),
    mainUsed: mainUsed,
    subUsed: subUsed,
    bonusUsed: bonusUsed
  }
}

// ====================================================================
// 十二、便捷适配器（供现有代码按需调用）
// ====================================================================

/**
 * 运动 → 统一修为
 * 从现有 sports params 映射到统一引擎入参
 */
function calcWuScore(trainingPath, params, opts) {
  var mapped = {
    pathKey: trainingPath || params.trainingPath || 'lianti',
    rpe: params.rpe,
    sets: params.sets,
    weightKg: params.weightKg,
    hrZone: params.hrZone,
    duration: params.duration,
    intensity: params.intensity
  }
  return calc('wu', mapped, opts)
}

/**
 * 饮食 → 统一修为
 */
function calcShiScore(params, opts) {
  var mapped = {
    isBingeEat: params.isBingeEat,
    nutritionGrade: params.nutritionGrade,
    foodQuality: params.foodQuality,
    fit: params.fit,
    mealLevel: params.mealLevel
  }
  return calc('shi', mapped, opts)
}

/**
 * 修心/学习 → 统一修为
 */
function calcWuXinScore(params, opts) {
  return calc('wu_xin', params, opts)
}

/**
 * 功业/工作 → 统一修为
 */
function calcGongScore(params, opts) {
  return calc('gong', params, opts)
}

/**
 * 心魔 → 统一修为
 */
function calcShaScore(params, opts) {
  return calc('sha', params, opts)
}

// ====================================================================
// 十三、内置测试断言
// ====================================================================

/**
 * 运行内置测试，验证各场景入参出参合理性
 * 返回 { passed: number, failed: number, results: [...] }
 */
function runTests() {
  var results = []
  var passed = 0
  var failed = 0

  function assert(desc, condition) {
    if (condition) {
      passed++
      results.push({ desc: desc, pass: true })
    } else {
      failed++
      results.push({ desc: desc, pass: false })
    }
  }

  // --- 武 · 强度系数检验 ---
  var wuLight = calcWuScore('lianti', { rpe: 6, sets: 3, weightKg: 30 },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('武·炼体·轻度 RPE6 → 强度=0.5', wuLight.intensity === 0.5)
  assert('武·炼体·轻度 RPE6 → score≈2', Math.round(wuLight.score) === 2)

  var wuModerate = calcWuScore('lianti', { rpe: 8, sets: 5, weightKg: 60 },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('武·炼体·中度 RPE8 → 强度=1.0', wuModerate.intensity === 1.0)
  assert('武·炼体·中度 RPE8 → score≈4', Math.round(wuModerate.score) === 4)

  var wuHigh = calcWuScore('lianti', { rpe: 9, sets: 7, weightKg: 80 },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('武·炼体·高强度 RPE9 → 强度=1.5', wuHigh.intensity === 1.5)
  assert('武·炼体·高强度 RPE9 → score≈6', Math.round(wuHigh.score) === 6)

  var wuExtreme = calcWuScore('lianti', { rpe: 10, sets: 8, weightKg: 120 },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('武·炼体·极限 RPE10 → 强度=2.0', wuExtreme.intensity === 2.0)
  assert('武·炼体·极限 RPE10 → score≈8', Math.round(wuExtreme.score) === 8)

  // --- 炼气强度检验 ---
  var qiModerate = calcWuScore('lianqi', { hrZone: 3, duration: 30 },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('武·炼气·Zone3 → 强度=1.0', qiModerate.intensity === 1.0)

  var qiExtreme = calcWuScore('lianqi', { hrZone: 5, intensity: 'race' },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('武·炼气·Zone5 → 强度=2.0', qiExtreme.intensity === 2.0)

  // --- 养气强度检验 ---
  var yangShort = calcWuScore('yangqi', { duration: 10 },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('武·养气·10min → 强度=0.5', yangShort.intensity === 0.5)

  var yangLong = calcWuScore('yangqi', { duration: 70 },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('武·养气·70min → 强度=2.0', yangLong.intensity === 2.0)

  // --- 食 · 营养等级检验 ---
  var shiPerfect = calcShiScore({ nutritionGrade: 'premium', fit: { fitLevel: 'excellent' } },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('食·完美 → 强度=2.0', shiPerfect.intensity === 2.0)
  assert('食·完美 → score≈5', Math.round(shiPerfect.score) === 5)

  var shiJunk = calcShiScore({ isBingeEat: true, foodQuality: 'junk' },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('食·垃圾 → 强度=-1.0', shiJunk.intensity === -1.0)
  assert('食·垃圾 → score≈-2', Math.round(shiJunk.score) === -2)

  // --- 悟 · 深度等级检验 ---
  var wuXinBrowse = calcWuXinScore({ duration: 15, goalDone: false },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('悟·浏览 15min → 强度=0.5', wuXinBrowse.intensity === 0.5)
  assert('悟·浏览 → score≈2', Math.round(wuXinBrowse.score) === 2)

  var wuXinDeep = calcWuXinScore({ duration: 90, goalDone: true, newKnowledge: true },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('悟·深度 90min+goalDone → 强度=1.5', wuXinDeep.intensity === 1.5)

  var wuXinCreate = calcWuXinScore({ duration: 120, goalDone: true, hasOutput: true },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('悟·创作 goalDone+output → 强度=2.0', wuXinCreate.intensity === 2.0)

  // --- 工 · 产出等级检验 ---
  var gongExe = calcGongScore({ duration: 30, noDistraction: true },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('工·执行 noDistraction → 强度=0.5', gongExe.intensity === 0.5)

  var gongCreate = calcGongScore({ duration: 90, goalDone: true, extraEffort: true },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('工·创造 goalDone+extra → 强度=2.0', gongCreate.intensity === 2.0)

  // --- 有效率检验 ---
  var wuAI = calcWuScore('lianti', { rpe: 8, sets: 5 },
    { verifySource: 'ai_vision', isMainPath: true, systemKey: 'traditional' })
  assert('AI验证 → 有效率=1.0', wuAI.efficiency === 1.0)

  var wuTask = calcWuScore('lianti', { rpe: 8, sets: 5 },
    { verifySource: 'task_checkin', isMainPath: true, systemKey: 'traditional' })
  assert('任务打卡 → 有效率=0.8', wuTask.efficiency === 0.8)

  var wuManual = calcWuScore('lianti', { rpe: 8, sets: 5 },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  assert('手动申报 → 有效率=0.5', wuManual.efficiency === 0.5)
  assert('AI验证 > 任务打卡 > 手动申报', wuAI.score > wuTask.score && wuTask.score > wuManual.score)

  // --- 辅修系数检验 ---
  var wuMain = calcWuScore('lianti', { rpe: 8, sets: 5 },
    { verifySource: 'manual_claim', isMainPath: true, systemKey: 'traditional' })
  var wuSub = calcWuScore('lianti', { rpe: 8, sets: 5 },
    { verifySource: 'manual_claim', isMainPath: false, systemKey: 'traditional' })
  assert('辅修系数=0.8', wuSub.subCoeff === 0.8)
  assert('辅修分数 < 主修分数', wuSub.score < wuMain.score)

  // --- 三层上限检验 ---
  // L1 上限：主修已满
  var capL1 = checkCap('wu', {
    systemKey: 'traditional', isMainPath: true,
    todayMainGained: 50, todaySubGained: 0, todayBonusGained: 0
  }, 10)
  assert('L1上限：主修50已满 → allowed=0', capL1.allowed === 0)
  assert('L1上限：主修50已满 → layer=1', capL1.layer === 1)

  // L2 上限：辅修已满
  var capL2 = checkCap('wu', {
    systemKey: 'traditional', isMainPath: false,
    todayMainGained: 30, todaySubGained: 40, todayBonusGained: 0
  }, 10)
  assert('L2上限：辅修40已满 → allowed=0', capL2.allowed === 0)
  assert('L2上限：辅修40已满 → layer=2', capL2.layer === 2)

  // L3 上限：总额已满
  var capL3 = checkCap('wu', {
    systemKey: 'traditional', isMainPath: false,
    todayMainGained: 50, todaySubGained: 10, todayBonusGained: 15
  }, 10)
  assert('L3上限：总额75已满 → allowed=0', capL3.allowed === 0)
  assert('L3上限：总额75已满 → layer=3', capL3.layer === 3)

  // 部分超出截断
  var capPartial = checkCap('wu', {
    systemKey: 'traditional', isMainPath: true,
    todayMainGained: 48, todaySubGained: 0, todayBonusGained: 0
  }, 10)
  assert('L1部分超出：48+10>50 → capped=true', capPartial.capped === true)
  assert('L1部分超出：48+10>50 → allowed=2', capPartial.allowed === 2)

  // 额度充足
  var capOK = checkCap('wu', {
    systemKey: 'traditional', isMainPath: true,
    todayMainGained: 20, todaySubGained: 0, todayBonusGained: 0
  }, 8)
  assert('L1额度充足：20+8≤50 → capped=false', capOK.capped === false)
  assert('L1额度充足 → allowed=8', capOK.allowed === 8)

  // --- 梯度分布检验 ---
  var scores = []
  for (var s = 0; s < INTENSITY_WU.levels.length; s++) {
    var lvl = INTENSITY_WU.levels[s]
    var sc = 8 * lvl.coeff * 0.5 * 1.0
    scores.push(Math.round(sc))
  }
  assert('武·强度梯度单调递增',
    scores[0] < scores[1] && scores[1] < scores[2] && scores[2] < scores[3])

  return { passed: passed, failed: failed, results: results }
}

// ====================================================================
// 十四、导出
// ====================================================================

module.exports = {
  // 配置（只读，供后台动态调整参考）
  CATEGORY_CONFIG: CATEGORY_CONFIG,
  INTENSITY_WU: INTENSITY_WU,
  INTENSITY_SHI: INTENSITY_SHI,
  INTENSITY_WU_XIN: INTENSITY_WU_XIN,
  INTENSITY_GONG: INTENSITY_GONG,
  INTENSITY_SHA: INTENSITY_SHA,
  EFFICIENCY_TABLE: EFFICIENCY_TABLE,
  SUB_COEFF: SUB_COEFF,
  SYSTEM_DAILY_LIMIT: SYSTEM_DAILY_LIMIT,

  // 核心计算
  calc: calc,
  determineIntensity: determineIntensity,

  // 上限管理
  checkCap: checkCap,
  getCapConfig: getCapConfig,
  getRemainingCap: getRemainingCap,

  // 便捷适配器
  calcWuScore: calcWuScore,
  calcShiScore: calcShiScore,
  calcWuXinScore: calcWuXinScore,
  calcGongScore: calcGongScore,
  calcShaScore: calcShaScore,

  // 测试
  runTests: runTests
}
