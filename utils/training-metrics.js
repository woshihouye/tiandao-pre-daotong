// ============================================================
// 天道修行 - 训练量化指标引擎 v1.0
//
// 所有公式引用自：
//   NSCA, ACSM, Daniels' Running Formula,
//   Ebbinghaus (1885), Schoenfeld et al. (2016),
//   Zourdos/Helms (2016), Cepeda et al. (2006),
//   Roediger & Karpicke (2006)
// ============================================================

// ============================================================
// 一、力量训练指标
// ============================================================

/**
 * 1RM 估算 — 提供三种公式取均值
 * Epley:   1RM = w × (1 + r/30)
 * Brzycki: 1RM = w × 36/(37-r)
 * Lombardi:1RM = w × r^0.10
 */
function estimate1RM(weight, reps) {
  if (!weight || !reps || reps <= 0 || weight <= 0) return { epley: 0, brzycki: 0, lombardi: 0, average: 0 }
  if (reps === 1) return { epley: weight, brzycki: weight, lombardi: weight, average: weight }
  if (reps > 12) reps = 12 // 超出 12 次的估算可靠性大幅下降

  var epley = weight * (1 + reps / 30)
  var brzycki = weight * 36 / (37 - reps)
  var lombardi = weight * Math.pow(reps, 0.10)
  var avg = Math.round((epley + brzycki + lombardi) / 3 * 10) / 10

  return {
    epley: Math.round(epley * 10) / 10,
    brzycki: Math.round(brzycki * 10) / 10,
    lombardi: Math.round(lombardi * 10) / 10,
    average: avg
  }
}

/**
 * 训练容量计算 Volume Load = Sets × Reps × Weight
 */
function calcVolumeLoad(sets, reps, weight) {
  if (!sets || !reps || !weight) return 0
  return Math.round(sets * reps * weight)
}

/**
 * RPE ↔ RIR 映射表 (Zourdos et al. 2016)
 */
var RPE_RIR_MAP = {
  10: { rir: 0,  label: '极限力竭', desc: '无法再完成任何一次' },
  9.5: { rir: 0.5, label: '接近极限', desc: '或许还能完成 1 次' },
  9: { rir: 1, label: '非常困难', desc: '1 次余力' },
  8.5: { rir: 1.5, label: '困难', desc: '1-2 次余力' },
  8: { rir: 2, label: '中等困难', desc: '2 次余力' },
  7.5: { rir: 2.5, label: '中等', desc: '2-3 次余力' },
  7: { rir: 3, label: '中等偏易', desc: '3 次余力' },
  6: { rir: 4, label: '轻松', desc: '4 次余力 — 热身强度' },
  5: { rir: 5, label: '非常轻松', desc: '远未力竭' }
}

/**
 * 力量等级评估（相对力量 = 1RM / 体重）
 */
function calcStrengthLevel(exercise, weight1RM, bodyWeight, gender) {
  var ratio = bodyWeight > 0 ? weight1RM / bodyWeight : 0
  gender = gender || 'male'

  var standards = {
    bench_press: {
      male:   [{ max: 0.75, level: '入门' }, { max: 1.0, level: '新手' }, { max: 1.25, level: '中级' }, { max: 1.5, level: '高级' }, { max: 99, level: '精英' }],
      female: [{ max: 0.4, level: '入门' },  { max: 0.6, level: '新手' }, { max: 0.75, level: '中级' }, { max: 1.0, level: '高级' }, { max: 99, level: '精英' }]
    },
    squat: {
      male:   [{ max: 1.0, level: '入门' }, { max: 1.25, level: '新手' }, { max: 1.75, level: '中级' }, { max: 2.25, level: '高级' }, { max: 99, level: '精英' }],
      female: [{ max: 0.75, level: '入门' }, { max: 1.0, level: '新手' }, { max: 1.25, level: '中级' }, { max: 1.75, level: '高级' }, { max: 99, level: '精英' }]
    },
    deadlift: {
      male:   [{ max: 1.25, level: '入门' }, { max: 1.5, level: '新手' }, { max: 2.0, level: '中级' }, { max: 2.5, level: '高级' }, { max: 99, level: '精英' }],
      female: [{ max: 1.0, level: '入门' }, { max: 1.25, level: '新手' }, { max: 1.5, level: '中级' }, { max: 2.0, level: '高级' }, { max: 99, level: '精英' }]
    }
  }

  var table = standards[exercise]
  if (!table) return { level: '--', ratio: ratio, percentile: 0 }

  var levels = table[gender] || table.male
  for (var i = 0; i < levels.length; i++) {
    if (ratio < levels[i].max) {
      return { level: levels[i].level, ratio: Math.round(ratio * 100) / 100, percentile: Math.round((i + 1) / levels.length * 100) }
    }
  }
  return { level: '精英', ratio: Math.round(ratio * 100) / 100, percentile: 100 }
}

/**
 * 渐进超负荷预算（按训练水平）
 */
function calcProgressiveOverloadTarget(currentWeight1RM, trainingLevel, weeksSinceLastPR) {
  var weeklyRate = { '入门': 0.05, '新手': 0.025, '中级': 0.015, '高级': 0.008, '精英': 0.005 }
  var rate = weeklyRate[trainingLevel] || 0.01
  var weeks = Math.min(weeksSinceLastPR || 4, 12)
  var target = Math.round(currentWeight1RM * (1 + rate * weeks) * 10) / 10
  return { target: target, weeklyRate: rate, weeksUntilGoal: weeks }
}

/**
 * 训练组间休息推荐
 */
function getRestRecommendation(goal) {
  var map = {
    strength:    { min: 120, max: 300, label: '2-5 分钟（力量）', reason: 'ATP-PC 系统需 3-5 分钟完全恢复' },
    hypertrophy: { min: 30,  max: 90,  label: '30-90 秒（增肌）', reason: '较短间歇促进代谢压力与生长激素分泌' },
    endurance:   { min: 15,  max: 60,  label: '15-60 秒（耐力）', reason: '模拟代谢需求，提升肌肉耐力' },
    power:       { min: 180, max: 300, label: '3-5 分钟（爆发力）', reason: '需要完全神经肌肉恢复' }
  }
  return map[goal] || map.hypertrophy
}

// ============================================================
// 二、跑步 / 耐力指标
// ============================================================

/**
 * 最大心率估算（Tanaka 公式，比 220-age 更准确）
 * HRmax = 208 - 0.7 × age
 * SD ≈ ±7 bpm
 */
function estimateHRmax(age) {
  return Math.round(208 - 0.7 * (age || 25))
}

/**
 * 心率区间计算（Karvonen 储备心率法）
 */
function calcHRZones(age, restingHR) {
  var maxHR = estimateHRmax(age)
  var hrr = maxHR - (restingHR || 60)
  return [
    { zone: 1, name: '恢复区', low: Math.round(hrr * 0.50 + restingHR), high: Math.round(hrr * 0.60 + restingHR), color: '#94a3b8' },
    { zone: 2, name: '燃脂区', low: Math.round(hrr * 0.60 + restingHR), high: Math.round(hrr * 0.70 + restingHR), color: '#22c55e' },
    { zone: 3, name: '有氧区', low: Math.round(hrr * 0.70 + restingHR), high: Math.round(hrr * 0.80 + restingHR), color: '#f59e0b' },
    { zone: 4, name: '阈值区', low: Math.round(hrr * 0.80 + restingHR), high: Math.round(hrr * 0.90 + restingHR), color: '#f97316' },
    { zone: 5, name: '极限区', low: Math.round(hrr * 0.90 + restingHR), high: maxHR, color: '#ef4444' }
  ]
}

/**
 * 从 5k/10k 时间估算 VDOT (Daniels & Gilbert)
 * VDOT = VO2 / VO2max%
 * 近似公式（回归简化，误差 <1 VDOT 单位）：
 */
function estimateVDOT(distanceMeters, timeSeconds) {
  if (!distanceMeters || !timeSeconds || timeSeconds <= 0) return 0
  var velocity = distanceMeters / timeSeconds * 60 // m/min
  // 简化 Daniels 公式
  var vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity * velocity
  var t = timeSeconds / 60 // 分钟
  var pctMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t)
  return vo2 > 0 && pctMax > 0 ? Math.round(vo2 / pctMax * 10) / 10 : 0
}

/**
 * VDOT → 配速建议表
 */
function vdotToPace(vdot) {
  if (vdot < 20 || vdot > 85) vdot = 40
  // 各类配速 (mins per km, 近似)
  var easy = Math.round(60 / (vdot * 0.65) * 10) / 10
  var marathon = Math.round(60 / (vdot * 0.78) * 10) / 10
  var threshold = Math.round(60 / (vdot * 0.90) * 10) / 10
  var interval = Math.round(60 / (vdot * 0.98) * 10) / 10
  return {
    easy: formatPace(easy),
    marathon: formatPace(marathon),
    threshold: formatPace(threshold),
    interval: formatPace(interval),
    vdot: vdot
  }
}

function formatPace(minsPerKm) {
  var m = Math.floor(minsPerKm)
  var s = Math.round((minsPerKm - m) * 60)
  return m + ':' + String(s).padStart(2, '0') + ' /km'
}

/**
 * 10% 规则 — 安全周跑量增量上限
 */
function maxSafeWeeklyIncrease(currentMileage) {
  return Math.round(currentMileage * 0.10 * 10) / 10
}

/**
 * 步频评估
 * 精英 ≈ 180 spm
 * 低于 170 spm 受伤风险增加
 */
function evaluateCadence(spm) {
  if (spm >= 180) return { level: '精英', risk: 'low', label: '步频优秀' }
  if (spm >= 170) return { level: '良好', risk: 'low', label: '步频良好' }
  if (spm >= 160) return { level: '一般', risk: 'medium', label: '可提升至 170+' }
  return { level: '偏低', risk: 'high', label: '步频偏低，注意跨步过大' }
}

// ============================================================
// 三、游泳指标
// ============================================================

/**
 * SWOLF 效率分 = 时间(秒) + 划水次数（单程）
 */
function calcSWOLF(timeSeconds, strokeCount, poolLength) {
  var poolFactor = poolLength === 25 ? 1 : poolLength === 50 ? 2.05 : 1
  var adjusted = timeSeconds + strokeCount * poolFactor / (poolLength / 25)
  return Math.round(adjusted)
}

function evaluateSWOLF(swolf) {
  if (swolf <= 40) return { level: '精英', swolf: swolf }
  if (swolf <= 50) return { level: '高级', swolf: swolf }
  if (swolf <= 65) return { level: '中级', swolf: swolf }
  return { level: '入门', swolf: swolf }
}

/**
 * CSS (Critical Swim Speed) — 阈值配速
 * CSS = (400m时间 - 200m时间) / 2
 */
function calcCSS(time400m, time200m) {
  if (!time400m || !time200m || time400m <= time200m) return 0
  var cssSec = (time400m - time200m) / 2
  return Math.round(cssSec * 10) / 10
}

// ============================================================
// 四、词汇 / 学习指标
// ============================================================

/**
 * Ebbinghaus 遗忘曲线 — 给定时间后的记忆保留率
 * t 单位：分钟
 * 简化公式：R = 100 * (1 - 0.56*log10(t/1+1) / log10(1440*31 + 1))
 * 基于 Ebbinghaus (1885) 实验数据拟合
 */
function estimateRetention(timeMinutes) {
  // Murre & Dros (2015) 拟合 Ebbinghaus 储蓄分数
  if (timeMinutes <= 0) return 100
  var logT = Math.log(timeMinutes + 1)
  var retention = 100 - 42 * Math.log(timeMinutes + 1) / Math.log(1440 * 31 + 1) - 25 * logT / Math.log(1440 + 1)
  return Math.max(5, Math.min(100, Math.round(retention)))
}

/**
 * 基于遗忘曲线推荐下次复习时间
 * 间隔为 1 → 3 → 7 → 14 → 30 天
 */
function getNextReviewInterval(reviewCount) {
  var intervals = [0, 1, 3, 7, 14, 30, 60, 90, 180]
  var idx = Math.min(reviewCount || 0, intervals.length - 1)
  return intervals[idx]
}

/**
 * 学习量评估（新词/天）
 *   ≤10   → 保守
 *   10-20  → 最优
 *   20-30  → 高负荷
 *   >30    → 超负荷（长期保留率下降）
 */
function evaluateDailyWordLoad(newWords) {
  if (newWords <= 10) return { level: '保守', label: '保守积累', retentionEstimate: '85%+' }
  if (newWords <= 20) return { level: '最优', label: '最优负荷', retentionEstimate: '75-85%' }
  if (newWords <= 30) return { level: '偏高', label: '高负荷', retentionEstimate: '55-75%' }
  return { level: '过载', label: '超负荷', retentionEstimate: '<55% — 长期保留率下降' }
}

/**
 * CEFR 词汇量评估
 */
function estimateCEFRLevel(knownWords) {
  if (knownWords <= 0) return { level: '--', name: '未评估' }
  if (knownWords <= 1500) return { level: 'A1-A2', name: '基础使用者', percentile: Math.round(knownWords / 1500 * 25) }
  if (knownWords <= 2500) return { level: 'A2+', name: '初级', percentile: 25 + Math.round((knownWords - 1500) / 1000 * 15) }
  if (knownWords <= 3250) return { level: 'B1', name: '中级', percentile: 40 + Math.round((knownWords - 2500) / 750 * 15) }
  if (knownWords <= 3750) return { level: 'B1+', name: '中级偏上', percentile: 55 + Math.round((knownWords - 3250) / 500 * 10) }
  if (knownWords <= 4500) return { level: 'B2', name: '中高级', percentile: 65 + Math.round((knownWords - 3750) / 750 * 10) }
  if (knownWords <= 8000) return { level: 'C1', name: '高级', percentile: 75 + Math.round((knownWords - 4500) / 3500 * 15) }
  if (knownWords <= 16000) return { level: 'C2', name: '精通', percentile: 90 + Math.round((knownWords - 8000) / 8000 * 8) }
  return { level: 'C2+', name: '母语级', percentile: 98 }
}

/**
 * 预估各等级所需学习时长
 */
function estimateHoursToLevel(fromWords, toLevel) {
  var targetWords = { 'A2': 1500, 'B1': 2500, 'B2': 3750, 'C1': 6250, 'C2': 12000 }
  var wordsNeeded = Math.max(0, (targetWords[toLevel] || 3750) - (fromWords || 0))
  var wordsPerHour = 8 // 每小时有效学习约 8 个词
  var hours = Math.round(wordsNeeded / wordsPerHour)
  return { wordsNeeded: wordsNeeded, estimatedHours: hours, wordsPerHour: wordsPerHour }
}

// ============================================================
// 五、柔韧 / 拉伸指标
// ============================================================

/**
 * 坐位体前屈标准 (cm)
 * ACSM 规范参考
 */
function evaluateSitAndReach(cm, gender, age) {
  gender = gender || 'male'
  age = age || 25
  var ageGroup = age < 36 ? 'young' : age < 46 ? 'mid' : 'older'

  var standards = {
    male:   { young: [0, 25, 34, 40, 46], mid: [0, 22, 30, 36, 42], older: [0, 18, 28, 35, 40] },
    female: { young: [0, 31, 40, 46, 52], mid: [0, 28, 36, 42, 48], older: [0, 23, 33, 40, 45] }
  }
  var levels = ['需提升', '一般', '良好', '优秀', '卓越']
  var table = (standards[gender] || standards.male)[ageGroup] || [0, 20, 30, 38, 44]
  for (var i = levels.length - 1; i >= 0; i--) {
    if (cm >= table[i]) return { level: levels[i], cm: cm, percentile: (i + 1) * 20 }
  }
  return { level: '需提升', cm: cm, percentile: 10 }
}

// ============================================================
// 六、冥想 / 正念指标
// ============================================================

/**
 * 冥想经验评估
 */
function evaluateMeditationPractice(totalSessions, totalMinutes, streakDays) {
  var level = '初识冥想'
  if (totalSessions >= 200 && streakDays >= 30) level = '长期修行者'
  else if (totalSessions >= 50 && streakDays >= 14) level = '进阶修行者'
  else if (totalSessions >= 10 && streakDays >= 7) level = '入门修行者'

  return {
    level: level,
    totalMinutes: totalMinutes || 0,
    streakDays: streakDays || 0,
    // 估计脑可塑性变化时间线 (Lazar et al. 2011)
    brainChangesEstimate: totalMinutes >= 2250 ? '可能已出现皮质厚度变化' // 8wks × 7d × 45min
      : totalMinutes >= 600 ? '接近可测量的脑变化阈值'
      : '继续坚持，脑部变化需约 8 周规律练习'
  }
}

// ============================================================
// 七、综合水平计算
// ============================================================

/**
 * 将训练指标转化为修行积分（知识库换算）
 * @param {string} metricType - bench_1rm / running_5k / vocab_count / meditation_sessions 等
 * @param {number|object} value - 具体数值
 * @param {object} bodyProfile - 用户身体画像
 * @returns {object} { score, benchmark, level, message }
 */
function metricToCultivationScore(metricType, value, bodyProfile) {
  var bp = bodyProfile || {}
  var gender = bp.gender || 'male'
  var age = bp.age || 25
  var weight = bp.weight || 70

  switch (metricType) {
    case 'bench_1rm':
    case 'squat_1rm':
    case 'deadlift_1rm': {
      var exercise = metricType.replace('_1rm', '')
      var levelInfo = calcStrengthLevel(exercise, value, weight, gender)
      var scoreMap = { '入门': 1, '新手': 3, '中级': 6, '高级': 10, '精英': 16 }
      return {
        score: scoreMap[levelInfo.level] || 1,
        benchmark: levelInfo.level,
        level: levelInfo.level,
        message: '相对力量 ' + levelInfo.ratio + '× 体重，' + levelInfo.level + '水平（' + exercise + '）'
      }
    }

    case 'running_5k': {
      var vdot = estimateVDOT(5000, value)
      var level = vdot >= 55 ? '精英' : vdot >= 45 ? '高级' : vdot >= 35 ? '中级' : vdot >= 28 ? '入门' : '初学'
      return {
        score: vdot >= 55 ? 16 : vdot >= 45 ? 10 : vdot >= 35 ? 6 : vdot >= 28 ? 3 : 1,
        benchmark: 'VDOT ' + vdot,
        level: level,
        message: '5k 估测 VDOT = ' + vdot + '，' + level + '跑者水平'
      }
    }

    case 'vocab_count': {
      var cefr = estimateCEFRLevel(value)
      var scoreMap = { 'A1-A2': 1, 'A2+': 2, 'B1': 4, 'B1+': 5, 'B2': 7, 'C1': 10, 'C2': 13, 'C2+': 16 }
      return {
        score: scoreMap[cefr.level] || 1,
        benchmark: cefr.level,
        level: cefr.level,
        message: '词汇量约 ' + value + ' 词，CEFR ' + cefr.level + ' 水平'
      }
    }

    case 'meditation_minutes': {
      return {
        score: value >= 2000 ? 12 : value >= 600 ? 6 : value >= 100 ? 3 : 1,
        benchmark: value + ' 分钟',
        level: value >= 2000 ? '长期' : value >= 600 ? '进阶' : '入门',
        message: '累计冥想 ' + value + ' 分钟'
      }
    }

    case 'swim_100m': {
      if (value <= 75) return { score: 16, benchmark: '精英', level: '精英', message: '100m 自由泳 ≤75s ≈ 精英水平' }
      if (value <= 105) return { score: 10, benchmark: '高级', level: '高级', message: '100m 自由泳 ' + value + 's ≈ 高级水平' }
      if (value <= 135) return { score: 6, benchmark: '中级', level: '中级', message: '100m 自由泳 ' + value + 's ≈ 中级水平' }
      return { score: 2, benchmark: '入门', level: '入门', message: '100m 自由泳 ' + value + 's ≈ 入门水平' }
    }

    case 'sit_and_reach': {
      var flex = evaluateSitAndReach(value, gender, age)
      var scoreMap = { '需提升': 1, '一般': 3, '良好': 6, '优秀': 10, '卓越': 14 }
      return { score: scoreMap[flex.level] || 1, benchmark: flex.level, level: flex.level, message: '坐位体前屈 ' + value + 'cm，' + flex.level + '水平' }
    }

    default:
      return { score: 1, benchmark: '--', level: '--', message: '记录成功' }
  }
}

module.exports = {
  // 力量
  estimate1RM,
  calcVolumeLoad,
  RPE_RIR_MAP,
  calcStrengthLevel,
  calcProgressiveOverloadTarget,
  getRestRecommendation,
  // 跑步
  estimateHRmax,
  calcHRZones,
  estimateVDOT,
  vdotToPace,
  maxSafeWeeklyIncrease,
  evaluateCadence,
  // 游泳
  calcSWOLF,
  evaluateSWOLF,
  calcCSS,
  // 词汇
  estimateRetention,
  getNextReviewInterval,
  evaluateDailyWordLoad,
  estimateCEFRLevel,
  estimateHoursToLevel,
  // 柔韧
  evaluateSitAndReach,
  // 冥想
  evaluateMeditationPractice,
  // 综合
  metricToCultivationScore
}
