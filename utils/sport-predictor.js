// ====================================================================
// 天道修行 — 武·运动预测引擎 v1.0
// sport-predictor.js
//
// 实时联动身体画像 / 训练指标 / 自适应引擎 / 统一量化，
// 输出精确的热量消耗、总做功、预计修为值和超限告警。
// ====================================================================

var { estimate1RM, calcVolumeLoad, RPE_RIR_MAP, calcStrengthLevel } = require('./training-metrics.js')
var { getSportScoreMultiplier, calculateBodyFactors } = require('./nutrition-kb.js')
var { analyzeSportFit } = require('./adaptive-engine.js')
var { calculateTrainingScore, TRAINING_PATH_CONFIG } = require('./score.js')

// ====================================================================
// 一、MET 数据库（NSCA/ACSM 标准）
// ====================================================================

/**
 * 动作级 MET 值（中等强度为基准，
 * 实际计算时会根据强度等级调整 ±30%）
 * 未收录的动作通过 getMovementMet 从运动知识库动态获取
 */
var { getMovementMet } = require('./sport-movements.js')

var MOVEMENT_MET = {
  // 力量训练
  bench_press:     { met: 5.0, label: '卧推' },
  squat:           { met: 5.0, label: '深蹲' },
  deadlift:        { met: 6.0, label: '硬拉' },
  pull_up:         { met: 5.5, label: '引体向上' },
  push_up:         { met: 4.0, label: '俯卧撑' },
  dumbbell_press:  { met: 4.5, label: '哑铃推举' },

  // 有氧运动
  running:         { met: 8.0, label: '跑步' },
  rope_skipping:   { met: 10.0, label: '跳绳' },
  cycling:         { met: 6.0, label: '骑行' },

  // 柔韧/冥想
  yoga:            { met: 3.0, label: '瑜伽' },
  stretch:         { met: 2.5, label: '拉伸' },
  meditation:      { met: 1.0, label: '冥想' },

  // 缺省
  _default:        { met: 4.0, label: '运动' }
}

/** 强度级 MET 修正系数 */
var INTENSITY_MET_MODIFIER = {
  light: 0.7,
  moderate: 1.0,
  high: 1.3,
  extreme: 1.6
}

// ====================================================================
// 二、力量级超限阈值（基于训练经验推断合理上限）
// ====================================================================

/** 训练经验 → 相对力量上限倍率（1RM/BW），超出此值即为可疑 */
var EXPERIENCE_STRENGTH_CAP = {
  '0-3个月':   { bench_press: 0.6, squat: 0.8, deadlift: 1.0 },
  '3-6个月':   { bench_press: 0.8, squat: 1.0, deadlift: 1.3 },
  '6-12个月':  { bench_press: 1.0, squat: 1.3, deadlift: 1.6 },
  '1-3年':     { bench_press: 1.2, squat: 1.6, deadlift: 2.0 },
  '3年以上':   { bench_press: 1.5, squat: 2.0, deadlift: 2.5 }
}

// ====================================================================
// 三、核心预测函数
// ====================================================================

/**
 * 从表单参数推断强度等级（与 unified-score 的 INTENSITY_WU.rules 对齐）
 */
function inferIntensityLevel(pathKey, params) {
  params = params || {}
  var dur = Number(params.duration) || 0

  if (pathKey === 'lianti') {
    var rpe = Number(params.rpe)
    if (!isNaN(rpe) && rpe > 0) {
      if (rpe >= 9.5) return 'extreme'
      if (rpe >= 8.5) return 'high'
      if (rpe >= 7.5) return 'moderate'
      return 'light'
    }
    var sets = Number(params.sets) || 0
    var weightKg = Number(params.weightKg || params.weight) || 0
    if (sets >= 8 || weightKg >= 120) return 'extreme'
    if (sets >= 6 || weightKg >= 80) return 'high'
    if (sets >= 3 || weightKg >= 40) return 'moderate'
    return 'light'
  }

  if (pathKey === 'lianqi') {
    var hrZone = Number(params.hrZone)
    if (!isNaN(hrZone) && hrZone > 0) {
      if (hrZone >= 5) return 'extreme'
      if (hrZone >= 4) return 'high'
      if (hrZone >= 2) return 'moderate'
      return 'light'
    }
    if (dur > 120) return 'extreme'
    if (dur > 60) return 'high'
    if (dur > 20) return 'moderate'
    return 'light'
  }

  // yangqi / xiuxin / richang
  if (dur > 60) return 'extreme'
  if (dur > 30) return 'high'
  if (dur > 15) return 'moderate'
  return 'light'
}

/**
 * 计算热量消耗
 * formula: kcal = MET × weight(kg) × duration(hours) × intensityModifier
 */
function calcCalorieBurn(params, bodyProfile) {
  params = params || {}
  bodyProfile = bodyProfile || {}
  var weight = Number(bodyProfile.weight) || 70

  var movementId = params.movementId || params.movement || ''
  var metEntry = MOVEMENT_MET[movementId]
  if (!metEntry) {
    var dynamicMet = getMovementMet(movementId)
    metEntry = { met: dynamicMet, label: movementId }
  }
  if (!metEntry || !metEntry.met) { metEntry = MOVEMENT_MET._default }
  var baseMet = metEntry.met

  var pathKey = params.trainingPath || params.pathKey || 'lianti'
  var intensity = inferIntensityLevel(pathKey, params)
  var metMod = INTENSITY_MET_MODIFIER[intensity] || 1.0

  // 有效运动时长
  var durationMin = Number(params.duration || params.durationMin) || 0
  var sets = Number(params.sets) || 1

  // 对于力量训练：只计算实际做功时间 ≈ 每组 45 秒
  if (pathKey === 'lianti') {
    var effortMinutes = sets * 0.75  // 每组 ~45 秒做功
    // 加上组间休息的热量（约 60% 效率）
    var restMinutes = sets * 1.5
    var totalEffortHours = (effortMinutes + restMinutes * 0.4) / 60
  } else {
    var totalEffortHours = Math.max(0, durationMin) / 60
  }

  var kcal = Math.round(baseMet * metMod * weight * totalEffortHours)

  return {
    kcal: kcal,
    met: Math.round(baseMet * metMod * 10) / 10,
    baseMet: baseMet,
    intensityModifier: metMod,
    intensity: intensity,
    weight: weight,
    durationMin: durationMin,
    movementLabel: metEntry.label
  }
}

/**
 * 计算总做功（机械功）
 * 力量训练：功(kg·rep) = weight × reps × sets
 * 有氧训练：功(kcal) 即热量消耗
 */
function calcTotalWork(params) {
  params = params || {}
  var pathKey = params.trainingPath || params.pathKey || ''

  if (pathKey === 'lianti') {
    var weight = Number(params.weightKg || params.weight) || 0
    var reps = Number(params.reps) || 0
    var sets = Number(params.sets) || 0
    var volumeLoad = weight * reps * sets  // 总容量(kg)
    return {
      type: 'strength',
      volumeLoad: volumeLoad,
      volumeLabel: volumeLoad >= 10000
        ? (Math.round(volumeLoad / 1000 * 10) / 10 + ' 吨')
        : (volumeLoad + ' kg'),
      formula: weight + 'kg × ' + reps + '次 × ' + sets + '组'
    }
  }

  // 有氧/柔韧类：用热量消耗作为"功"
  return {
    type: 'cardio',
    volumeLoad: 0,
    volumeLabel: '有氧运动以热量消耗计',
    formula: ''
  }
}

/**
 * 计算 1RM 与相对力量评级
 */
function calcStrengthPrediction(params, bodyProfile) {
  params = params || {}
  bodyProfile = bodyProfile || {}
  var weight = Number(params.weightKg || params.weight) || 0
  var reps = Number(params.reps) || 0
  var movementId = params.movementId || params.movement || ''

  if (!weight || !reps) return null

  var rm = estimate1RM(weight, reps)
  if (rm.average <= 0) return null

  var bodyWeight = Number(bodyProfile.weight) || 70
  var gender = bodyProfile.gender || 'male'
  var strength = calcStrengthLevel(movementId, rm.average, bodyWeight, gender)

  return {
    weight1RM: rm.average,
    bodyWeight: bodyWeight,
    ratio: strength.ratio,
    level: strength.level,
    percentile: strength.percentile,
    epley: rm.epley,
    brzycki: rm.brzycki,
    lombardi: rm.lombardi
  }
}

/**
 * 检测运动参数是否超出用户基础数据的合理范围
 *
 * 判定维度：
 *  — 力量训练：重量/1RM 是否超过经验上限
 *  — 有氧：时长是否远超合理值（>3h）
 *  — 通用：单次时长是否超过安全阈值
 */
function detectOverLimit(params, bodyProfile) {
  params = params || {}
  bodyProfile = bodyProfile || {}
  var warnings = []
  var pathKey = params.trainingPath || params.pathKey || ''
  var movementId = params.movementId || params.movement || ''

  // 1. 力量训练超重检测
  if (pathKey === 'lianti') {
    var weight = Number(params.weightKg || params.weight) || 0
    var reps = Number(params.reps) || 0
    var bodyWeight = Number(bodyProfile.weight) || 70
    var experience = bodyProfile.trainingExperience || '0-3个月'

    if (weight > 0 && reps > 0) {
      var rm = estimate1RM(weight, reps)
      var ratio = bodyWeight > 0 ? rm.average / bodyWeight : 0
      var capEntry = EXPERIENCE_STRENGTH_CAP[experience]
      var moveCap = (capEntry && capEntry[movementId])
                    ? capEntry[movementId]
                    : (capEntry ? capEntry.bench_press : 0.6)

      if (ratio > moveCap * 1.3) {
        // 超出经验上限 30%
        var levelLabel = calcStrengthLevel(movementId, rm.average, bodyWeight, bodyProfile.gender || 'male')
        warnings.push({
          type: 'weight_too_high',
          severity: 'critical',
          message: '你输入的 ' + weight + 'kg × ' + reps + ' 次推算 1RM 约 ' + rm.average + 'kg(' + levelLabel.level + ' 级)，远超你当前训练经验（' + experience + '）的合理上限，请确认是否误输。',
          ratio: Math.round(ratio * 100) / 100,
          cap: Math.round(moveCap * 100) / 100
        })
      } else if (ratio > moveCap * 1.15) {
        warnings.push({
          type: 'weight_high',
          severity: 'warning',
          message: '该重量推算出 ' + rm.average + 'kg 1RM(' + Math.round(ratio * 100) / 100 + '×体重)，已接近你当前经验上限。如确认无误可继续。',
          ratio: Math.round(ratio * 100) / 100,
          cap: Math.round(moveCap * 100) / 100
        })
      }
    }

    // 检查 reps > 12 降权说明
    if (reps > 12) {
      warnings.push({
        type: 'reps_high',
        severity: 'info',
        message: reps + ' 次超出 1RM 公式有效范围(≤12)，实际训练强度可能被低估，建议填写 8-12RM 重量。'
      })
    }
  }

  // 2. 时长超限检测
  var duration = Number(params.duration || params.durationMin) || 0
  if (pathKey === 'lianti' && duration > 120) {
    warnings.push({
      type: 'duration_too_long',
      severity: 'warning',
      message: '力量训练单次 ' + duration + ' 分钟超过推荐的 120 分钟上限。以你当前训练水平，过长时间可能引发过度疲劳或受伤风险。'
    })
  } else if (pathKey === 'lianqi' && duration > 180) {
    warnings.push({
      type: 'duration_too_long',
      severity: 'warning',
      message: '有氧运动单次 ' + duration + ' 分钟超出 180 分钟科学上限，请注意监测心率并及时补充水分电解质。'
    })
  } else if (pathKey === 'yangqi' && duration > 90) {
    warnings.push({
      type: 'duration_too_long',
      severity: 'info',
      message: '拉伸/冥想类单次超过 90 分钟可能难以保持专注，建议拆分多次。'
    })
  }

  // 3. 基于年龄和 BMI 的通用安全提示
  var age = Number(bodyProfile.age) || 25
  var bmi = bodyProfile.bmi || null
  if (age > 55 && pathKey === 'lianti' && duration > 60) {
    warnings.push({
      type: 'age_precaution',
      severity: 'warning',
      message: '年龄 ' + age + ' 岁，建议每次力量训练控制在 60 分钟以内。'
    })
  }
  if (bmi && bmi > 35 && pathKey === 'lianti') {
    warnings.push({
      type: 'bmi_precaution',
      severity: 'info',
      message: 'BMI ' + bmi + ' 偏大，力量训练时请特别注意关节保护，建议优先采用低冲击动作。'
    })
  }

  return {
    hasOverLimit: warnings.length > 0,
    hasCritical: warnings.some(function(w) { return w.severity === 'critical' }),
    warnings: warnings
  }
}

// ====================================================================
// 四、统一预测入口
// ====================================================================

/**
 * 运动数据实时预测（表单每变动一次就调用一次）
 *
 * @param {object} params - 表单参数 { trainingPath, movementId, sets, reps, weight, duration, ... }
 * @param {object} bodyProfile - 用户身体画像 { weight, height, age, gender, trainingExperience, bmi, ... }
 * @param {object} context - 上下文 { systemKey, todayTypeScore }
 * @returns {object} 完整预测数据
 */
function predict(params, bodyProfile, context) {
  params = params || {}
  bodyProfile = bodyProfile || {}
  context = context || {}

  var pathKey = params.trainingPath || 'lianti'
  var movementId = params.movementId || params.movement || ''

  // --- 1. 修为预测（走现有 calculateTrainingScore，与提交一致）---
  var scoreResult = calculateTrainingScore({
    trainingPath: pathKey,
    trainingType: '',
    movement: movementId,
    name: '',
    sets: Number(params.sets) || 0,
    duration: Number(params.duration || params.durationMin) || 0,
    reps: Number(params.reps) || 0,
    weight: Number(params.weightKg || params.weight) || 0,
    itemCount: 1
  }, {
    systemKey: context.systemKey || 'traditional',
    todayTypeScore: context.todayTypeScore || 0,
    bodyProfile: bodyProfile
  })

  // --- 2. 热量消耗 ---
  var calorie = calcCalorieBurn(params, bodyProfile)

  // --- 3. 总做功 ---
  var work = calcTotalWork(params)

  // --- 4. 力量预测（仅 lianti 有数据时）---
  var strength = calcStrengthPrediction(params, bodyProfile)

  // --- 5. 超限检测 ---
  var overLimit = detectOverLimit(params, bodyProfile)

  // --- 6. 强度推断 ---
  var intensity = inferIntensityLevel(pathKey, params)
  var intensityLabels = {
    light:    { cn: '轻度', en: 'Light',     color: '#22c55e' },
    moderate: { cn: '中度', en: 'Moderate',   color: '#eab308' },
    high:     { cn: '高强度', en: 'High',     color: '#f97316' },
    extreme:  { cn: '极限', en: 'Extreme',    color: '#ef4444' }
  }

  return {
    // 修为
    cultivation: {
      score: scoreResult.score,
      pathName: scoreResult.pathName || '',
      bonusRate: scoreResult.bonusRate || 0,
      bodyMultiplier: scoreResult.bodyMultiplier || 1.0,
      capped: scoreResult.capped || false,
      formula: scoreResult.scoreFormula || ''
    },

    // 热量
    calorie: calorie,

    // 做功
    work: work,

    // 力量
    strength: strength,

    // 超限
    overLimit: overLimit,

    // 强度
    intensity: intensity,
    intensityLabel: (intensityLabels[intensity] || intensityLabels.moderate).cn,
    intensityColor: (intensityLabels[intensity] || intensityLabels.moderate).color,

    // 身体画像摘要
    bodySummary: {
      weight: Number(bodyProfile.weight) || 0,
      bmi: bodyProfile.bmi || null,
      experience: bodyProfile.trainingExperience || '未知',
      age: Number(bodyProfile.age) || 0
    }
  }
}

/**
 * 轻量版预测（仅修为 + 热量，用于快速更新）
 * 不包含超限检测，适合表单每键都调用的场景
 */
function predictQuick(params, bodyProfile, context) {
  var full = predict(params, bodyProfile, context)
  return {
    cultivation: full.cultivation,
    calorie: full.calorie,
    intensity: full.intensity,
    intensityLabel: full.intensityLabel
  }
}

// ====================================================================
// 五、导出
// ====================================================================

module.exports = {
  MOVEMENT_MET: MOVEMENT_MET,
  INTENSITY_MET_MODIFIER: INTENSITY_MET_MODIFIER,
  EXPERIENCE_STRENGTH_CAP: EXPERIENCE_STRENGTH_CAP,

  inferIntensityLevel: inferIntensityLevel,
  calcCalorieBurn: calcCalorieBurn,
  calcTotalWork: calcTotalWork,
  calcStrengthPrediction: calcStrengthPrediction,
  detectOverLimit: detectOverLimit,

  predict: predict,
  predictQuick: predictQuick
}
