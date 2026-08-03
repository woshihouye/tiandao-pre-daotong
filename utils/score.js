// 天道修行 - 打分算法封装
// 按训练道途动态结算修为，并联动修炼体系加成与单日上限
// >>> v3.0 核心重构：所有积分走自适应引擎，适配才能增长修为
// >>> v3.1 统一量化：新增 calculateScoreV2 统一入口，路由至 unified-score.js
const { getSportScoreMultiplier, analyzeFoodNutrition, analyzeSupplement } = require('./nutrition-kb.js')
const { analyzeDietFit, analyzeSportFit, analyzeSupplementFit, analyzeDebuffImpact, analyzeStudyWorkFit } = require('./adaptive-engine.js')
const { analyzeDietRecord } = require('./diet-scoring.js')
var unifiedScore = null  // 懒加载 unified-score.js（避免 require 循环）

/**
 * 五大修炼道途积分配置（便于后续调参）
 * key 与修仙主题命名对齐：炼体 / 炼气 / 养气 / 修心 / 日常功课
 */
const TRAINING_PATH_CONFIG = {
  lianti: {
    key: 'lianti',
    name: '炼体类',
    desc: '无氧抗阻训练：举铁、俯卧撑、引体向上、深蹲硬拉、器械训练等',
    dailyCap: 50,
    // 每完成 1 组标准动作 +2；每累计满 30 分钟额外 +5
    scorePerSet: 2,
    bonusPerMinutes: 30,
    bonusScore: 5
  },
  lianqi: {
    key: 'lianqi',
    name: '炼气类',
    desc: '有氧心肺训练：跑步、游泳、骑行、跳绳、球类、椭圆机等',
    dailyCap: 60,
    // 每运动 10 分钟 +3
    minutesUnit: 10,
    scorePerUnit: 3
  },
  yangqi: {
    key: 'yangqi',
    name: '养气类',
    desc: '拉伸、冥想、瑜伽、放松训练',
    dailyCap: 20,
    // 每 10 分钟 +1
    minutesUnit: 10,
    scorePerUnit: 1
  },
  xiuxin: {
    key: 'xiuxin',
    name: '修心类',
    desc: '学习、看书、听课、技能提升',
    dailyCap: 40,
    // 每 15 分钟 +2
    minutesUnit: 15,
    scorePerUnit: 2
  },
  richang: {
    key: 'richang',
    name: '日常功课',
    desc: '早睡、早起、喝够水等日常打卡',
    dailyCap: 10,
    // 每项完成 +2
    scorePerItem: 2
  }
}

/**
 * 修炼体系 → 道途加成配置
 * 未配置的体系默认无加成
 */
const SYSTEM_PATH_BONUS = {
  // 体修：炼体、炼气 +20%
  body: { lianti: 0.2, lianqi: 0.2 },
  // 传统修仙：修心、养气 +20%
  traditional: { xiuxin: 0.2, yangqi: 0.2 },
  // >>> 养气/小美、入世/打工人体系加成
  beauty: { yangqi: 0.2, richang: 0.1 },
  worldly: { xiuxin: 0.2, richang: 0.1 },
  // 其他体系按主题对应加成
  wuxia: { lianti: 0.2, xiuxin: 0.1 },
  ninja: { lianqi: 0.2, yangqi: 0.1 },
  knight: { lianti: 0.2, richang: 0.1 },
  sequence: { xiuxin: 0.2, yangqi: 0.1 },
  cthulhu: { yangqi: 0.2, xiuxin: 0.1 }
}

/**
 * 丹食积分规则
 */
const DIET_SCORES = {
  HEALTHY: 3, // 健康饮食
  JUNK: -3 // 高油高糖 / 垃圾食品（与全局 TASK_SCORE_COEFFICIENT 对齐）
}

/**
 * 心魔扣分规则（与 cultivation.js DEBUFF_SEVERITY 对齐）
 */
const DEBUFF_SCORES = {
  STAY_UP: -10,         // 熬夜
  SMOKE_DRINK: -30,     // 抽烟酗酒
  BINGE_EAT: -25,       // 暴食放纵
  PROCRASTINATE: -15,   // 拖延
  DEFAULT: -10          // 未识别心魔默认
}

/** @deprecated 保留旧常量名，避免外部引用报错 */
const SPORT_SCORES = {
  NORMAL: 2,
  PR_BREAK: 2,
  VOLUME_INCREASE: 2
}

const TRAINING_PATH_OPTIONS = Object.keys(TRAINING_PATH_CONFIG).map((key) => ({
  key,
  name: TRAINING_PATH_CONFIG[key].name,
  desc: TRAINING_PATH_CONFIG[key].desc
}))

/**
 * 关键词 → 道途映射（自动识别训练类型）
 */
const TRAINING_TYPE_KEYWORDS = {
  lianti: ['力量', '举铁', '卧推', '深蹲', '硬拉', '俯卧撑', '引体', '自重', '哑铃', '杠铃', '器械', '练肌', '增肌', '弯举', '划船', '推举', '飞鸟', '壶铃', '卷腹', '平板支撑', '箭步蹲', '臀桥', '提踵', '仰卧起坐', '悬垂', '龙旗'],
  lianqi: ['跑步', '有氧', '跳绳', '骑行', '椭圆', '游泳', '慢跑', '快走', '有氧操', '燃脂', '徒步', '登山', '爬楼', '桨板', '皮划艇', '动感单车', '划船机', '爬楼机', '太极拳', '八段锦', '易筋经', '站桩', 'HIIT', 'Tabata', '波比跳', '开合跳', '高抬腿', '踢毽子', '篮球', '足球', '羽毛球', '乒乓球', '网球', '排球', '壁球', '保龄球', '高尔夫', '飞盘', '射箭'],
  yangqi: ['拉伸', '冥想', '瑜伽', '放松', '泡沫轴', '呼吸', '太极', '静坐'],
  xiuxin: ['学习', '看书', '阅读', '听课', '课程', '技能', '读书', '编程', '写作'],
  richang: ['早睡', '早起', '喝水', '打卡', '作息', '日常', '功课']
}

function toSafeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function clampNonNegativeInt(value) {
  return Math.max(0, Math.floor(toSafeNumber(value, 0)))
}

/**
 * 根据动作名 / 训练标签推断道途
 */
function resolveTrainingPath(params = {}) {
  try {
    const explicit = params.trainingPath || params.pathKey || params.cultivatePath
    if (explicit && TRAINING_PATH_CONFIG[explicit]) {
      return explicit
    }

    const trainingType = String(params.trainingType || '').trim()
    const typeAlias = {
      力量训练: 'lianti',
      力量: 'lianti',
      自重: 'lianti',
      炼体: 'lianti',
      有氧: 'lianqi',
      炼气: 'lianqi',
      拉伸: 'yangqi',
      养气: 'yangqi',
      瑜伽: 'yangqi',
      冥想: 'yangqi',
      学习: 'xiuxin',
      修心: 'xiuxin',
      日常: 'richang',
      日常功课: 'richang'
    }
    if (typeAlias[trainingType]) {
      return typeAlias[trainingType]
    }

    const text = [
      params.movement,
      params.movementId,
      params.name,
      trainingType,
      params.label
    ].filter(Boolean).join(' ')

    for (const [pathKey, keywords] of Object.entries(TRAINING_TYPE_KEYWORDS)) {
      if (keywords.some((word) => text.includes(word))) {
        return pathKey
      }
    }

    // 默认按炼体兜底（兼容旧力量录入）
    return 'lianti'
  } catch (error) {
    console.error('识别训练道途失败', error)
    return 'lianti'
  }
}

function getSystemBonusRate(systemKey = 'traditional', pathKey = 'lianti') {
  try {
    const bonusMap = SYSTEM_PATH_BONUS[systemKey] || {}
    const rate = toSafeNumber(bonusMap[pathKey], 0)
    return rate > 0 ? rate : 0
  } catch (error) {
    return 0
  }
}

function applySystemBonus(rawScore, pathKey, systemKey) {
  const safeRaw = toSafeNumber(rawScore, 0)
  if (safeRaw <= 0) {
    return Math.floor(safeRaw)
  }
  const rate = getSystemBonusRate(systemKey, pathKey)
  return Math.floor(safeRaw * (1 + rate))
}

/**
 * 按道途单日上限裁剪本条可得修为
 * @param {number} score 本条加成后分数
 * @param {string} pathKey 道途
 * @param {number} todayUsed 今日该道途已获得修为（不含本条）
 */
function applyDailyCap(score, pathKey, todayUsed = 0) {
  try {
    const config = TRAINING_PATH_CONFIG[pathKey]
    if (!config) {
      return Math.floor(toSafeNumber(score, 0))
    }
    const used = Math.max(0, toSafeNumber(todayUsed, 0))
    const remain = Math.max(0, config.dailyCap - used)
    const safeScore = Math.floor(toSafeNumber(score, 0))
    if (safeScore <= 0) {
      return safeScore
    }
    return Math.min(safeScore, remain)
  } catch (error) {
    console.error('单日上限裁剪失败', error)
    return Math.floor(toSafeNumber(score, 0))
  }
}

/**
 * 自重类动作系数（有效重量 = 系数 × 体重 kg）
 * 仅对自重筑基类/核心凝气类有效，自由重量/器械类动作需用户输入重量
 * 
 * 分类标准：
 *   推类动作（如俯卧撑）0.70  — 上肢推力主导，约承载70%体重
 *   拉类动作（如引体向上）0.60  — 上肢拉力主导，约承载60%体重
 *   腿类动作（如自重深蹲）1.00  — 下肢主导，承载全身重
 *   核心类动作 0.40             — 腰腹核心训练，部分体重
 */
var BODYWEIGHT_COEFF_MAP = {
  // ===== 推类 (0.70) =====
  push_up: 0.70, wide_push_up: 0.70, narrow_push_up: 0.70,
  diamond_push_up: 0.70, incline_push_up: 0.50, decline_push_up: 0.85,
  knee_push_up: 0.40, clap_push_up: 0.70,
  // ===== 拉类 (0.60) =====
  pull_up: 0.60, wide_pull_up: 0.60, narrow_pull_up: 0.60,
  australian_pull_up: 0.50,
  // ===== 腿类 (1.00) =====
  bodyweight_squat: 1.0, sumo_squat: 1.0,
  lunge: 1.0,
  bulgarian_split_squat: 1.0,
  pistol_squat: 1.0,
  glute_bridge: 0.30, single_leg_glute_bridge: 0.30,
  calf_raise: 0.60,
  sissy_squat: 0.40,
  // ===== 核心类 (0.40) =====
  crunch: 0.4, reverse_crunch: 0.4, sit_up: 0.4,
  russian_twist: 0.4, mountain_climber: 0.4,
  hanging_leg_raise: 0.4, lying_leg_raise: 0.4,
  side_crunch: 0.4, dragon_flag: 0.4
}

/**
 * 获取炼体类动作的有效训练重量（kg）
 * @param {string} movementId 动作 ID
 * @param {number} inputWeight 用户输入的重量
 * @param {object} bodyProfile 身体画像 { weight, height, bmi, ... }
 * @returns {{ weight: number, isBodyweight: boolean }}
 */
function getEffectiveLiantiWeight(movementId, inputWeight, bodyProfile) {
  var coeff = BODYWEIGHT_COEFF_MAP[movementId]
  if (coeff !== undefined && coeff > 0) {
    var bw = (bodyProfile && bodyProfile.weight) ? Number(bodyProfile.weight) : 70
    return { weight: coeff * bw, isBodyweight: true }
  }
  return { weight: Number(inputWeight) || 0, isBodyweight: false }
}

/**
 * 炼体类 — 训练容量 → 边际递减修为计算
 * @param {number} volume 训练容量 = 有效重量 × 次数 × 组数
 * @param {number} reps 单组次数
 * @param {number} sets 组数
 * @param {number} duration 时长（分钟），0 表示不启用密度系数
 * @returns {number} 基础修为值
 */
function calcLiantiVolumeScore(volume, reps, sets, duration) {
  if (volume <= 0) return 0
  if (reps <= 0 || sets <= 0) return 0

  // 边际递减分段：容量越大，单位效率越低
  var baseScore = 0
  var remaining = volume
  var tiers = [
    { limit: 500,  rate: 25 },   // 0-500:  每 25 volume = 1 分  (最高 20 分)
    { limit: 1500, rate: 40 },   // 500-2000: 每 40 volume = 1 分 (最高 +37.5 = 57.5)
    { limit: 3000, rate: 75 },   // 2000-5000: 每 75 volume = 1 分 (最高 +40 = 97.5)
    { limit: Infinity, rate: 150 } // 5000+: 每 150 volume = 1 分
  ]
  var consumed = 0
  for (var i = 0; i < tiers.length; i++) {
    if (remaining <= 0) break
    var seg = Math.min(remaining, tiers[i].limit)
    baseScore += seg / tiers[i].rate
    remaining -= seg
    consumed += seg
  }

  // 训练密度效率系数（需要有时长数据）
  var densityCoeff = 1.0
  if (duration > 0) {
    var density = (reps * sets) / duration  // 每分钟总次数
    if (density >= 25) densityCoeff = 1.3
    else if (density >= 15) densityCoeff = 1.2
    else if (density >= 10) densityCoeff = 1.1
    else if (density >= 5) densityCoeff = 1.0
    else densityCoeff = 0.85
  }

  return Math.round(baseScore * densityCoeff)
}

/**
 * 计算道途原始修为（未加成、未封顶）
 * @param {string} pathKey 道途 key
 * @param {object} params 训练参数 { sets, reps, weight, duration, movement/movementId, bodyProfile }
 * @param {object} bodyProfile 身体画像（可选，用于体重系数折算）
 */
function calculateRawTrainingScore(pathKey, params = {}, bodyProfile = null) {
  try {
    const config = TRAINING_PATH_CONFIG[pathKey] || TRAINING_PATH_CONFIG.lianti
    const sets = clampNonNegativeInt(params.sets)
    const reps = clampNonNegativeInt(params.reps)
    const duration = clampNonNegativeInt(params.duration || params.minutes)
    const itemCount = Math.max(1, clampNonNegativeInt(params.itemCount || params.count || 1))

    if (pathKey === 'lianti') {
      // ===== 参数校验：次数、组数必须 > 0 =====
      if (reps <= 0 || sets <= 0) return 0

      var movementId = params.movementId || params.movement || ''
      var inputWeight = Number(params.weight || params.weightKg || 0)
      var bp = bodyProfile || params.bodyProfile || null

      var eff = getEffectiveLiantiWeight(movementId, inputWeight, bp)
      var weight = eff.weight

      // 负重类动作必须填写重量
      if (!eff.isBodyweight && weight <= 0) return 0

      var volume = weight * reps * sets
      return calcLiantiVolumeScore(volume, reps, sets, duration)
    }

    if (pathKey === 'richang') {
      return itemCount * toSafeNumber(config.scorePerItem, 2)
    }

    const unit = Math.max(1, toSafeNumber(config.minutesUnit, 10))
    const perUnit = toSafeNumber(config.scorePerUnit, 1)
    if (duration <= 0) return 0
    return Math.floor(duration / unit) * perUnit
  } catch (error) {
    console.error('计算原始训练修为失败', error)
    return 0
  }
}

/**
 * >>> 新增积分计算核心：自动判类型、算加成、卡单日上限
 * @param {object} params 训练参数
 * @param {object} options
 * @param {string} options.systemKey 当前修炼体系
 * @param {number} options.todayTypeScore 今日该道途已获修为
 * @returns {{ score: number, trainingPath: string, pathName: string, rawScore: number, bonusRate: number, capped: boolean, dailyCap: number, todayUsed: number }}
 */
function calculateTrainingScore(params = {}, options = {}) {
  try {
    const trainingPath = resolveTrainingPath(params)
    const config = TRAINING_PATH_CONFIG[trainingPath] || TRAINING_PATH_CONFIG.lianti
    const systemKey = options.systemKey || params.systemKey || 'traditional'
    const todayUsed = Math.max(0, toSafeNumber(options.todayTypeScore, 0))

    var rawScore = calculateRawTrainingScore(trainingPath, params, options.bodyProfile || null)
    var bonusRate = getSystemBonusRate(systemKey, trainingPath)

    // >>> 用户身体画像差异化修正
    var bodyMultiplier = 1.0
    var sportFit = null
    if (options.bodyProfile) {
      bodyMultiplier = getSportScoreMultiplier(options.bodyProfile, trainingPath)
      rawScore = Math.round(rawScore * bodyMultiplier)

      // >>> 走自适应引擎，评估这次运动的适配度
      if (typeof options.bodyProfile === 'object') {
        var dur = Number((params.detail && params.detail.duration) || params.duration || 0)
        sportFit = analyzeSportFit(trainingPath, dur, params, options.bodyProfile)
        // 适配度分析也影响最终积分
        rawScore += (sportFit.score || 0)
        if (rawScore < 0) rawScore = 0 // 不给负分（过度训练警告已由 engine 给出）
      }
    }

    const boosted = applySystemBonus(rawScore, trainingPath, systemKey)

    // >>> 全局根骨加成：基于六根骨综合得分计算的统一加成
    var rootBoneBonus = 0
    var rootBoneName = ''
    if (boosted > 0) {
      try {
        var rootBone = require('./root-bone.js')
        var boneResult = rootBone.applyGlobalRootBonus(boosted)
        rootBoneBonus = boneResult.bonusScore
        rootBoneName = boneResult.compositeName
      } catch (e) {
        // 根骨模块未加载时静默跳过
      }
    }

    const preCapScore = boosted + rootBoneBonus
    const score = applyDailyCap(preCapScore, trainingPath, todayUsed)

    return {
      score,
      trainingPath,
      pathName: config.name,
      rawScore,
      bonusRate,
      bodyMultiplier: bodyMultiplier,
      sportFit: sportFit,
      rootBoneBonus: rootBoneBonus,
      rootBoneName: rootBoneName,
      capped: boosted > score,
      dailyCap: config.dailyCap,
      todayUsed
    }
  } catch (error) {
    console.error('训练积分结算失败', error)
    return {
      score: 0,
      trainingPath: 'lianti',
      pathName: TRAINING_PATH_CONFIG.lianti.name,
      rawScore: 0,
      bonusRate: 0,
      bodyMultiplier: 1.0,
      sportFit: null,
      capped: false,
      dailyCap: TRAINING_PATH_CONFIG.lianti.dailyCap,
      todayUsed: 0
    }
  }
}

/**
 * 统计今日某道途已获得修为（用于上限）
 */
function sumTodayPathScore(records = [], pathKey, excludeId = '') {
  try {
    if (!Array.isArray(records) || !pathKey) {
      return 0
    }
    return records.reduce((sum, item) => {
      if (!item || item.category !== 'sport') {
        return sum
      }
      if (excludeId && (item._id === excludeId)) {
        return sum
      }
      const itemPath = resolveTrainingPath({
        trainingPath: item.detail && item.detail.trainingPath,
        trainingType: item.detail && item.detail.trainingType,
        movement: item.detail && item.detail.movement,
        name: item.name
      })
      if (itemPath !== pathKey) {
        return sum
      }
      return sum + Math.max(0, toSafeNumber(item.score, 0))
    }, 0)
  } catch (error) {
    console.error('统计今日道途修为失败', error)
    return 0
  }
}

/**
 * 计算运动记录得分（兼容旧调用）
 * 支持传入 options 做体系加成与单日上限
 */
function calculateSportScore(params = {}, options = {}) {
  try {
    const result = calculateTrainingScore(params, options)
    return result.score
  } catch (error) {
    console.error('运动积分计算失败', error)
    return 0
  }
}

/**
 * 计算饮食记录得分（走自适应引擎）
 * 核心：不是吃了就加分，而是适配你的身体条件与目标才加分。
 *
 * @param {object}  params       - 食物表单参数
 * @param {object}  [bodyProfile] - 用户身体画像
 * @param {object}  [context]     - 上下文（今日记录等）
 * @returns {{ score: number, nutritionGrade: string, nutritionLabel: string, analysis: object, fit: object }}
 */
function calculateDietScore(params = {}, bodyProfile, context) {
  try {
    var isJunk = !!(
      params.isBingeEat || params.isJunk || params.isJunkFood
      || params.highOilSugar || params.foodQuality === 'junk' || params.foodQuality === 'unhealthy'
    )
    var foodName = params.foodName || params.name || ''

    // >>> 从食物名称自动检测垃圾食品
    var nutritionInfo = analyzeFoodNutrition(foodName)
    var nameDetectedJunk = (nutritionInfo.grade === 'junk')
    if (nameDetectedJunk) {
      isJunk = true
    }

    // >>> 走自适应引擎分析（基础适配度）
    var fit = analyzeDietFit(foodName, isJunk, bodyProfile)

    // >>> 营养达标判定引擎：联动知识库 + bodyProfile 做精准营养分析
    var mealAnalysis = null
    if (foodName) {
      mealAnalysis = analyzeDietRecord(foodName, bodyProfile)
    }

    // 综合评分：如果知识库命中，融合营养达标分 + 适配度分
    // 垃圾食品：取两者中更低分（防止正向适配分抵消负分）
    var finalScore = fit.score
    var scoreBreakdown = null
    var isMealJunk = isJunk || (mealAnalysis && mealAnalysis.foodGrade === 'junk')

    if (mealAnalysis && mealAnalysis.found) {
      // 营养达标分（来自知识库食物数据 + 体征目标对比）
      var nutritionScore = mealAnalysis.score
      // 适配度分（来自自适应引擎的目标匹配分析）
      var adaptScore = fit.score

      if (isMealJunk) {
        // 垃圾食品：取更差分，不融合
        finalScore = Math.min(nutritionScore, adaptScore)
      } else {
        // 正常食品：加权融合 营养达标 60% + 适配度 40%
        finalScore = Math.round(nutritionScore * 0.6 + adaptScore * 0.4)
      }

      scoreBreakdown = {
        nutritionScore: nutritionScore,
        adaptScore: adaptScore,
        blendScore: finalScore,
        nutritionWeight: isMealJunk ? 1.0 : 0.6,
        adaptWeight: isMealJunk ? 0 : 0.4,
        isJunk: isMealJunk,
        foodGrade: mealAnalysis.foodGrade,
        servingDesc: mealAnalysis.servingDesc,
        matchedKey: mealAnalysis.matchedKey,
        nutrients: mealAnalysis.details || [],
        targets: mealAnalysis.targets ? {
          perMeal: mealAnalysis.targets.perMeal,
          daily: mealAnalysis.targets.daily,
          tdee: mealAnalysis.targets.tdee,
          bmi: mealAnalysis.targets.bmi
        } : null,
        levelLabel: mealAnalysis.levelLabel,
        levelDesc: mealAnalysis.levelDesc
      }
    } else if (mealAnalysis && !mealAnalysis.found && mealAnalysis.targets) {
      // 知识库未命中但有体征数据，提供营养目标参考
      scoreBreakdown = {
        nutritionScore: null,
        adaptScore: fit.score,
        blendScore: fit.score,
        nutritionWeight: 0,
        adaptWeight: 1.0,
        foodGrade: 'unknown',
        matchedKey: null,
        nutrients: [],
        targets: {
          perMeal: mealAnalysis.targets.perMeal,
          daily: mealAnalysis.targets.daily,
          tdee: mealAnalysis.targets.tdee,
          bmi: mealAnalysis.targets.bmi
        },
        levelLabel: null,
        levelDesc: null
      }
    }

    return {
      score: finalScore,
      nutritionGrade: isJunk ? 'junk' : nutritionInfo.grade,
      nutritionLabel: isJunk ? '浊气入体' : nutritionInfo.label,
      analysis: nutritionInfo,
      fit: fit,
      mealAnalysis: mealAnalysis,
      scoreBreakdown: scoreBreakdown
    }
  } catch (error) {
    console.error('饮食积分计算失败', error)
    return { score: 0, nutritionGrade: 'standard', nutritionLabel: '', analysis: {}, fit: { fitLevel: 'ok', message: '' }, mealAnalysis: null, scoreBreakdown: null }
  }
}

/**
 * >>> 补剂积分计算 + 自适应适配度分析
 * 不是所有补剂对所有人都好，基于目标和身体条件评估。
 * @param {string} supplementId - 补剂 ID
 * @param {object} [bodyProfile] - 用户身体画像
 * @returns {{ score: number, analysis: object, fit: object }}
 */
function calculateSupplementScore(supplementId, bodyProfile) {
  try {
    var fit = analyzeSupplementFit(supplementId, bodyProfile)
    return {
      score: fit.score,
      analysis: fit.detail || {},
      fit: fit
    }
  } catch (error) {
    console.error('补剂积分计算失败', error)
    return { score: 0, analysis: {}, fit: { fitLevel: 'ok', message: '' } }
  }
}

/**
 * 获取心魔扣分（默认 -3）
 */
function getDebuffScore(debuffType) {
  try {
    if (!debuffType) {
      return DEBUFF_SCORES.DEFAULT
    }
    const key = String(debuffType).toUpperCase()
    if (Object.prototype.hasOwnProperty.call(DEBUFF_SCORES, key)) {
      return DEBUFF_SCORES[key]
    }
    return DEBUFF_SCORES.DEFAULT
  } catch (error) {
    console.error('心魔积分计算失败', error)
    return DEBUFF_SCORES.DEFAULT
  }
}

/**
 * 根据分数获取对应主题
 */
function getThemeByScore(score) {
  const safe = toSafeNumber(score, 0)
  if (safe >= 5) {
    return 'healing'
  }
  if (safe >= 0) {
    return 'dusk'
  }
  return 'depressing'
}

function getThemeSlogan(theme) {
  const slogans = {
    healing: '天道酬勤，今日修行圆满',
    dusk: '夕阳无限，修行尚有余力',
    depressing: '道心蒙尘，切勿沉沦！'
  }
  return slogans[theme] || slogans.dusk
}

/**
 * 预设动作列表（附带默认道途）
 */
const {
  getMovementsByPath, resolveSportName, searchMovements,
  getLiantiGroups, getLianqiGroups
} = require('./sport-movements.js')

const SPORT_MOVEMENTS = getMovementsByPath('lianti').concat(getMovementsByPath('lianqi'))

/**
 * 心魔类型列表
 */
const DEBUFF_TYPES = [
  { type: 'STAY_UP', name: '熬夜', score: DEBUFF_SCORES.STAY_UP, icon: '🌙', desc: '超过 23:00 未就寝，次日精力恢复减半，连续熬夜触发修为加速衰减' },
  { type: 'SMOKE_DRINK', name: '抽烟喝酒', score: DEBUFF_SCORES.SMOKE_DRINK, icon: '🚬', desc: '烟酒入体，灵气污浊。每次触发为当日最高心魔扣分，且持续影响后续三日修炼加成' },
  { type: 'BINGE_EAT', name: '放纵餐', score: DEBUFF_SCORES.BINGE_EAT, icon: '🍔', desc: '暴饮暴食损伤脾胃，当日饮食正向积分清零，并扣除基础修为' },
  { type: 'PROCRASTINATE', name: '拖延', score: DEBUFF_SCORES.PROCRASTINATE, icon: '⏳', desc: '当日有重要任务未在计划内完成，拖延超过 2 小时即触发，连带降低次日修炼积极性' }
]

// ====================================================================
// >>> v3.1 统一量化 V2 入口
// ====================================================================

/**
 * 懒加载 unified-score 模块
 */
function getUnifiedScore() {
  if (!unifiedScore) {
    try {
      unifiedScore = require('./unified-score.js')
    } catch (e) {
      console.error('加载统一量化引擎失败', e)
      unifiedScore = null
    }
  }
  return unifiedScore
}

/**
 * 将旧系统参数映射到统一引擎入参
 * @param {string} category - 'sport'|'diet'|'study'|'work'|'debuff'
 * @param {object} params - 行为参数
 */
function mapParamsToUnified(category, params) {
  params = params || {}
  switch (category) {
    case 'sport':
      return {
        pathKey: params.trainingPath || params.pathKey || 'lianti',
        rpe: params.rpe,
        sets: params.sets,
        weightKg: params.weightKg,
        hrZone: params.hrZone,
        duration: params.duration || params.minutes || 0,
        intensity: params.intensity
      }
    case 'diet':
      return {
        isBingeEat: params.isBingeEat || params.isJunk || params.isJunkFood,
        nutritionGrade: params.nutritionGrade,
        foodQuality: params.foodQuality,
        fit: params.fit,
        mealLevel: params.mealLevel
      }
    case 'study':
      return {
        duration: params.duration || params.minutes || 25,
        goalDone: params.goalDone,
        newKnowledge: params.newKnowledge,
        review: params.review,
        hasOutput: params.hasOutput
      }
    case 'work':
      return {
        duration: params.duration || params.minutes || 30,
        goalDone: params.goalDone,
        review: params.review,
        noDistraction: params.noDistraction,
        extraEffort: params.extraEffort
      }
    case 'debuff':
      return {
        debuffType: params.debuffType || 'DEFAULT',
        todayCount: params.todayCount || 1,
        weekCount: params.weekCount || 1
      }
    default:
      return params
  }
}

/**
 * 统一量化 V2 入口
 * 根据行为类型自动路由至 unified-score.js 的五大类
 *
 * @param {string} type - 'sport'|'diet'|'study'|'work'|'debuff'
 * @param {object} params - 行为参数
 * @param {object} opts - 选项
 *   {
 *     verifySource: 'ai_vision'|'task_checkin'|'manual_claim',
 *     isMainPath: boolean,
 *     systemKey: string,
 *     todayMainGained: number,
 *     todaySubGained: number,
 *     todayBonusGained: number
 *   }
 * @returns {object} { score, baseScore, intensity, intensityLabel, efficiency, ... }
 */
function calculateScoreV2(type, params, opts) {
  var us = getUnifiedScore()
  if (!us) {
    return { score: 0, error: 'unified_engine_unavailable' }
  }

  opts = opts || {}

  // 默认验证方式：手动申报
  if (!opts.verifySource) {
    opts.verifySource = 'manual_claim'
  }

  // 默认体系
  if (!opts.systemKey) {
    opts.systemKey = 'traditional'
  }

  // 映射行为类型到统一大类
  var categoryMap = {
    'sport': 'wu',
    'diet': 'shi',
    'study': 'wu_xin',
    'work': 'gong',
    'debuff': 'sha'
  }
  var unifiedCat = categoryMap[type] || 'wu'

  // 映射参数
  var unifiedParams = mapParamsToUnified(type, params)

  // 走统一引擎
  return us.calc(unifiedCat, unifiedParams, {
    verifySource: opts.verifySource,
    isMainPath: opts.isMainPath !== false,
    systemKey: opts.systemKey,
    todayMainGained: opts.todayMainGained || 0,
    todaySubGained: opts.todaySubGained || 0,
    todayBonusGained: opts.todayBonusGained || 0
  })
}

// ====================================================================
module.exports = {
  // >>> 新增：训练道途与体系加成配置
  TRAINING_PATH_CONFIG,
  TRAINING_PATH_OPTIONS,
  SYSTEM_PATH_BONUS,
  TRAINING_TYPE_KEYWORDS,

  SPORT_SCORES,
  DIET_SCORES,
  DEBUFF_SCORES,

  // >>> 新增：积分计算入口
  resolveTrainingPath,
  getSystemBonusRate,
  applySystemBonus,
  applyDailyCap,
  calculateRawTrainingScore,
  calculateTrainingScore,
  sumTodayPathScore,

  getThemeByScore,
  getThemeSlogan,
  calculateSportScore,
  calculateDietScore,
  calculateSupplementScore,
  getDebuffScore,
  SPORT_MOVEMENTS,
  DEBUFF_TYPES,

  // >>> v3.1 统一量化 V2 入口
  calculateScoreV2: calculateScoreV2,
  getUnifiedScore: getUnifiedScore
}
