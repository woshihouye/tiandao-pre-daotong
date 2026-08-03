// ============================================================
// 天道修行 - 自适应分析引擎 v3.0
//
// 核心原则：「适配才能增长修为」
// 不是吃了就加分、动了就得分，而是基于用户身体条件
// 与目标，在线推理每条记录是否真正有利于用户的成长。
// ============================================================

const { calculateBodyFactors } = require('./nutrition-kb.js')

// ============================================================
// 一、用户修炼目标体系
// ============================================================

const FITNESS_GOALS = {
  cut: {
    id: 'cut',
    name: '减脂塑形',
    icon: '🔥',
    desc: '降低体脂率，保留肌肉量',
    // 目标导向的积分修正
    sportPrefer: 'lianqi',      // 偏好有氧
    sportAvoid: null,
    dietFocus: 'calorie_deficit', // 热量缺口
    proteinMultiplier: 1.2,     // 减脂期蛋白质需求更高
    carbLimit: 0.7              // 碳水限制系数
  },
  bulk: {
    id: 'bulk',
    name: '增肌强化',
    icon: '💪',
    desc: '增加肌肉量与力量水平',
    sportPrefer: 'lianti',
    sportAvoid: null,
    dietFocus: 'calorie_surplus',
    proteinMultiplier: 1.0,
    carbLimit: 1.0
  },
  endurance: {
    id: 'endurance',
    name: '耐力突破',
    icon: '🏃',
    desc: '提升心肺耐力与运动表现',
    sportPrefer: 'lianqi',
    sportAvoid: null,
    dietFocus: 'balanced',
    proteinMultiplier: 0.9,
    carbLimit: 1.0
  },
  maintain: {
    id: 'maintain',
    name: '维持健康',
    icon: '⚖️',
    desc: '保持当前体态与健康水平',
    sportPrefer: null,
    sportAvoid: null,
    dietFocus: 'balanced',
    proteinMultiplier: 1.0,
    carbLimit: 1.0
  },
  flexibility: {
    id: 'flexibility',
    name: '柔韧灵修',
    icon: '🧘',
    desc: '提升柔韧性与身心平衡',
    sportPrefer: 'yangqi',
    sportAvoid: null,
    dietFocus: 'balanced',
    proteinMultiplier: 0.9,
    carbLimit: 1.0
  }
}

// ============================================================
// 二、身体条件基准计算
// ============================================================

/**
 * 根据身高体重计算 BMI 与体型分类
 */
function calculateBMI(weight, heightCm) {
  if (!weight || !heightCm || heightCm <= 0) return null
  var h = heightCm / 100
  return Math.round((weight / (h * h)) * 10) / 10
}

function classifyBMI(bmi) {
  if (bmi === null || bmi === undefined) return 'unknown'
  if (bmi < 18.5) return 'underweight'
  if (bmi < 24) return 'normal'
  if (bmi < 28) return 'overweight'
  return 'obese'
}

/**
 * 计算理想体重范围（Devine 公式 + 亚洲修正）
 */
function idealWeightRange(heightCm, gender) {
  if (!heightCm) return { min: 55, max: 70 }
  var inches = heightCm / 2.54
  var base = gender === 'female' ? 45.5 : 50.0
  var idealKg = base + 2.3 * (inches - 60)
  return {
    min: Math.round((idealKg - 5) * 10) / 10,
    max: Math.round((idealKg + 5) * 10) / 10,
    ideal: Math.round(idealKg * 10) / 10
  }
}

// ============================================================
// 三、自适应分析核心
// ============================================================

/**
 * 获取或构建用户完整画像（合并本地 bodyProfile + 目标设定）
 */
function resolveUserProfile(rawProfile) {
  var bp = rawProfile || {}
  var gender = bp.gender || 'male'
  var age = bp.age || 25
  var weight = bp.weight || 70
  var height = bp.height || 170
  var goal = bp.fitnessGoal || 'maintain'
  var bmi = calculateBMI(weight, height)
  var bmiClass = classifyBMI(bmi)
  var ideal = idealWeightRange(height, gender)
  var factors = calculateBodyFactors(bp)
  var restDaysThisWeek = bp.restDaysThisWeek || 0
  var trainingDaysThisWeek = bp.trainingDaysThisWeek || 0

  return {
    gender, age, weight, height,
    bmi, bmiClass, ideal,
    goal: FITNESS_GOALS[goal] || FITNESS_GOALS.maintain,
    goalKey: goal,
    factors,
    restDaysThisWeek,
    trainingDaysThisWeek,
    // 从历史记录提取的上下文
    consecutiveTrainingDays: bp.consecutiveTrainingDays || 0,
    todayTotalSportMinutes: bp.todayTotalSportMinutes || 0,
    todayCalorieEstimate: bp.todayCalorieEstimate || 0,
    weekOverTrainingScore: bp.weekOverTrainingScore || 0
  }
}

// ============================================================
// 四、饮食适配度分析
// ============================================================

/**
 * 分析一顿饭是否适配当前用户
 * 返回 { score, fitLevel, message, detail }
 *
 * fitLevel: 'excellent' | 'good' | 'ok' | 'poor' | 'harmful'
 *
 * 逻辑：
 *   1. 垃圾食品 → 永远适配度低
 *   2. 减脂期吃高碳水 → 适配度降低
 *   3. 增肌期蛋白质不足 → 适配度降低
 *   4. 体重偏轻却节食 → 适配度极低
 *   5. 体重偏重却放纵 → 适配度极低
 */
function analyzeDietFit(foodName, isJunk, bodyProfile) {
  var user = resolveUserProfile(bodyProfile)
  var goal = user.goal
  var bmiClass = user.bmiClass

  // ── 垃圾食品永远有害 ──
  if (isJunk) {
    var extraWarning = ''
    if (goal.id === 'cut' && bmiClass === 'obese') {
      extraWarning = '减脂期摄入浊气食物，不仅无益修为增长，还会拖累之前所有的努力。'
    } else if (goal.id === 'cut') {
      extraWarning = '减脂期浊气入体，今日热量缺口可能被一笔勾销。'
    }
    return {
      score: -8,
      fitLevel: 'harmful',
      message: '浊气入体，与修行目标相悖。' + extraWarning,
      detail: { grade: 'junk', penalty: -8, reason: '垃圾食品在任何目标下都是负收益' }
    }
  }

  // ── 基于营养密度和用户条件的适配度 ──
  var { analyzeFoodNutrition } = require('./nutrition-kb.js')
  var nutrition = analyzeFoodNutrition(foodName)
  var baseScore = 3
  var fitLevel = 'good'
  var messages = []

  // 营养密度越高越好
  if (nutrition.grade === 'premium') {
    baseScore = 5
  } else if (nutrition.grade === 'low') {
    baseScore = 1
  } else if (nutrition.grade === 'junk') {
    // >>> 垃圾食品永远是负分，无论用户是否勾选了 junk 开关
    baseScore = -5
    fitLevel = 'harmful'
    messages.push('此食物被知识库判定为浊气食物（' + nutrition.label + '），与修行之道相悖。')
  }

  // ── 减脂期分析 ──
  if (goal.id === 'cut') {
    if (nutrition.grade === 'premium') {
      baseScore += 1 // 高蛋白低热量食物是减脂期的黄金选择
      fitLevel = 'excellent'
      messages.push('高蛋白密度食物正是减脂期所需，可保留肌肉同时制造热量缺口。')
    } else if (nutrition.grade === 'standard' && baseScore >= 3) {
      messages.push('减脂期注意碳水总量即可，这餐营养结构尚可。')
    }
    if (foodName && (foodName.indexOf('米') >= 0 || foodName.indexOf('面') >= 0 || foodName.indexOf('饭') >= 0)) {
      baseScore = Math.min(baseScore, 2) // 减脂期精制碳水降分
      messages.push('精制碳水升糖快，可考虑替换为红薯/燕麦/糙米等缓释碳水。')
    }
  }

  // ── 增肌期分析 ──
  if (goal.id === 'bulk') {
    if (nutrition.grade === 'premium' && foodName && (foodName.indexOf('鸡') >= 0 || foodName.indexOf('蛋') >= 0 || foodName.indexOf('鱼') >= 0)) {
      baseScore += 1
      fitLevel = 'excellent'
      messages.push('高蛋白来源正是增肌期的核心燃料。')
    } else if (nutrition.grade === 'low' && baseScore <= 1) {
      fitLevel = 'poor'
      messages.push('增肌期需要充足营养，这餐营养密度偏低。考虑搭配蛋白质来源。')
    }
  }

  // ── 体重偏轻者分析 ──
  if (bmiClass === 'underweight') {
    if (baseScore >= 3) {
      baseScore += 1
      fitLevel = 'excellent'
      messages.push('你当前体重偏轻（BMI ' + user.bmi + '），充足营养是恢复健康的第一步。')
    } else {
      messages.push('你当前体重偏轻，建议增加进食频次与营养密度。')
    }
  }

  // ── 体重偏重者分析 ──
  if (bmiClass === 'obese') {
    if (nutrition.grade === 'premium') {
      baseScore += 1
      messages.push('高营养低热量选择，正是体重管理期的正确方向。')
    } else if (nutrition.grade === 'standard') {
      fitLevel = 'ok'
      messages.push('当前 BMI ' + user.bmi + ' 属于肥胖范围，注意控制总热量摄入。')
    }
  }

  return {
    score: baseScore,
    fitLevel: fitLevel,
    message: messages.length > 0 ? messages.join(' ') : '中正平和，适配当前修炼之道。',
    detail: {
      grade: nutrition.grade,
      label: nutrition.label,
      baseScore: baseScore,
      bmiClass: bmiClass,
      goalFit: fitLevel
    }
  }
}

// ============================================================
// 五、运动适配度分析
// ============================================================

/**
 * 分析一次运动是否适配当前用户，返回适配评估。
 *
 * 逻辑：
 *   1. 新手做高强度长时间 → 扣分警告（过度训练风险）
 *   2. 连续训练超过 6 天无休息 → 扣分警告
 *   3. 运动类型与目标不匹配 → 轻度降分
 *   4. 运动类型与目标高度匹配 → 加分
 *   5. 体重过重者做高强度冲击运动 → 警告降分
 *   6. 减脂期做纯力量无有氧 → 轻度降分
 *   7. 单日运动超过 4 小时 → 强制警告
 */
function analyzeSportFit(trainingPath, duration, params, bodyProfile) {
  var user = resolveUserProfile(bodyProfile)
  var goal = user.goal
  var bmiClass = user.bmiClass
  var score = 0
  var fitLevel = 'good'
  var messages = []
  var warnings = []

  var dur = duration || 0 // 分钟

  // ── 基础适配度 ──
  // 运动类型与目标匹配加分
  if (goal.sportPrefer && goal.sportPrefer === trainingPath) {
    score += 2
    fitLevel = 'excellent'
    messages.push('此训练类型与你的「' + goal.name + '」目标高度契合。')
  } else if (goal.sportPrefer && goal.sportPrefer !== trainingPath) {
    messages.push('此训练类型并非你的主攻方向，建议以' + (trainingPath === 'lianti' ? '力量' : trainingPath === 'lianqi' ? '有氧' : '柔韧') + '为辅，以主目标训练为主。')
  }

  // ── 过度训练检测 ──
  // 连续训练天数
  if (user.consecutiveTrainingDays >= 6) {
    warnings.push('你已连续训练 ' + user.consecutiveTrainingDays + ' 天，身体需要休息日来进行修复和生长。休息也是修炼的一部分。')
    score -= 3
    fitLevel = 'poor'
  }

  // 单日运动量
  if (dur > 180) {
    warnings.push('单次运动 ' + dur + ' 分钟远超合理范围（极限耐力训练除外），过度训练会抑制免疫系统并增加受伤风险。')
    score -= 4
  } else if (dur > 120) {
    messages.push('单次运动 ' + dur + ' 分钟属于高强度，请确保补充足够电解质与蛋白质。')
  }

  var todayTotal = user.todayTotalSportMinutes + dur
  if (todayTotal > 240) {
    warnings.push('今日累计运动已达 ' + todayTotal + ' 分钟，超出大部分人的恢复能力。请明日安排休息或轻盈活动。')
    score -= 2
  }

  // ── 体重与运动类型匹配 ──
  if (bmiClass === 'obese' && trainingPath === 'lianti') {
    if (dur > 60) {
      warnings.push('你当前 BMI ' + user.bmi + '，长时间高强度力量训练对关节压力较大。建议控制单次在 60 分钟内，并优先选择低冲击有氧。')
      score -= 1
    }
  }

  if (bmiClass === 'underweight' && trainingPath === 'lianqi' && dur > 60) {
    warnings.push('你体重偏轻（BMI ' + user.bmi + '），长时间有氧会消耗本已不多的肌肉。建议缩短有氧时间，优先力量训练增加体重。')
    score -= 2
  }

  // ── 年龄适配 ──
  if (user.age > 55 && trainingPath === 'lianti' && dur > 45) {
    messages.push('年龄 ' + user.age + '，建议力量训练控制在 45 分钟内，更注重动作质量而非时长。')
  }

  // ── 休息日检测 ──
  if (user.trainingDaysThisWeek >= 7) {
    warnings.push('本周已训练 7 天，建议明天至少安排 1 天完全休息。没有休息就没有生长。')
    score -= 3
  }

  return {
    score: score,
    fitLevel: fitLevel,
    message: messages.length > 0 ? messages.join(' ') : '训练适配当前状态。',
    warnings: warnings,
    detail: {
      trainingPath: trainingPath,
      duration: dur,
      goalMatch: goal.sportPrefer === trainingPath,
      consecutiveDays: user.consecutiveTrainingDays,
      overTrainingRisk: warnings.length > 0
    }
  }
}

// ============================================================
// 六、补剂适配度分析
// ============================================================

/**
 * 分析补剂是否适配用户需求
 * 不是所有补剂都适合所有人
 */
function analyzeSupplementFit(supplementId, bodyProfile) {
  var user = resolveUserProfile(bodyProfile)
  var bp = bodyProfile || {}

  var { analyzeSupplement } = require('./nutrition-kb.js')
  var baseResult = analyzeSupplement(supplementId, bodyProfile)

  var score = baseResult.score || 2
  var fitLevel = 'good'
  var messages = [baseResult.analysis]
  var warnings = baseResult.warnings || []

  // ── 减脂期特殊规则 ──
  if (user.goal.id === 'cut' && supplementId === 'mass_gainer') {
    fitLevel = 'harmful'
    score = -5
    messages = ['增肌粉每份 500-1000+ 大卡，与减脂目标严重冲突。减脂期应避免增肌粉，选择纯乳清蛋白。']
  }

  // ── 增肌期特殊规则 ──
  if (user.goal.id === 'bulk' && (supplementId === 'whey' || supplementId === 'creatine')) {
    score += 2
    fitLevel = 'excellent'
    messages.push('这正是增肌期的核心补剂组合。')
  }

  // ── 体重偏轻者 ──
  if (user.bmiClass === 'underweight' && supplementId === 'mass_gainer') {
    score += 2
    messages.push('你体重偏轻，增肌粉可作为高效热量补充手段。但优先以食物为主。')
  }

  // ── 年龄限制 ──
  if (user.age > 50 && (supplementId === 'pre_workout_powder' || supplementId === 'caffeine')) {
    fitLevel = 'poor'
    score = 0
    warnings.push('年龄 ' + user.age + ' 岁，训练前兴奋剂类补剂可能造成心血管负担。建议以食物和休息为训练动力来源。')
  }

  if (user.age < 16 && supplementId === 'creatine') {
    fitLevel = 'poor'
    score = 0
    warnings.push('16 岁以下不建议使用肌酸，应以均衡饮食为营养基础。')
  }

  return {
    score: score,
    fitLevel: fitLevel,
    message: messages.join(' '),
    warnings: warnings,
    detail: baseResult
  }
}

// ============================================================
// 七、心魔（负面行为）自适应分析
// ============================================================

/**
 * 分析负面行为的实际影响程度
 *
 * 逻辑：
 *   1. 本周第一次熬夜 ≠ 连续熬夜 — 扣分应有梯度
 *   2. 已经在优秀周的表现中出现一次失误 — 扣分应减轻
 *   3. 连续多次同类心魔 — 扣分应加重
 */
function analyzeDebuffImpact(debuffType, bodyProfile, todayRecords, weekStats) {
  var user = resolveUserProfile(bodyProfile)
  var basePenalty = getDebuffBaseScore(debuffType)

  var sameTypeCount = 0
  var allDebuffCount = 0
  var totalWeekRecords = weekStats ? (weekStats.totalRecords || 0) : 0
  var weekPositiveScore = weekStats ? (weekStats.positiveScore || 0) : 0

  if (todayRecords) {
    for (var i = 0; i < todayRecords.length; i++) {
      var r = todayRecords[i]
      if (r.category === 'debuff') {
        allDebuffCount++
        var rt = (r.detail && r.detail.debuffType) || r.name || ''
        if (rt === debuffType) sameTypeCount++
      }
    }
  }

  // ── 梯度扣分 ──
  var penalty = basePenalty
  var level = 'warning'
  var message = ''

  // 本周首次心魔 → 轻度警告
  if (sameTypeCount <= 1 && allDebuffCount <= 1 && weekPositiveScore > 30) {
    penalty = Math.round(basePenalty * 0.5)
    level = 'gentle'
    message = '偶尔的失误是人类的一部分。本周表现优秀，这次不构成重大影响。但请勿成为习惯。'
  }
  // 同类第 2 次 → 标准扣分
  else if (sameTypeCount <= 2) {
    penalty = basePenalty
    level = 'warning'
    message = '同类心魔正在成为模式。注意：习惯不是一次养成的，也不是一次打破的。'
  }
  // 同类第 3+ 次 → 加重扣分
  else {
    penalty = Math.round(basePenalty * 1.5)
    level = 'severe'
    message = '连续触发同类心魔！天道系统检测到行为模式异常。请重新审视你的生活节奏。连续心魔将大幅降低整体修炼加成。'
  }

  // ── 体重相关额外分析 ──
  if (debuffType === 'BINGE_EAT') {
    if (user.bmiClass === 'obese') {
      penalty = Math.round(penalty * 1.3)
      message += ' 当前 BMI ' + user.bmi + ' 已属肥胖范围，放纵饮食的伤害远大于常人。'
    } else if (user.bmiClass === 'underweight') {
      penalty = Math.round(penalty * 0.6)
      message += ' 不过你当前体重偏轻，偶尔的高热量摄入未必全是坏事。但勿以此为借口放纵。'
    }
  }

  if (debuffType === 'STAY_UP') {
    if (user.age > 45) {
      message += ' 注意：年龄超过 45 岁后，熬夜的身体恢复时间大幅延长。'
    }
  }

  return {
    score: -Math.abs(penalty),
    fitLevel: level === 'gentle' ? 'ok' : (level === 'severe' ? 'harmful' : 'poor'),
    message: message,
    detail: {
      basePenalty: basePenalty,
      actualPenalty: penalty,
      level: level,
      sameTypeCount: sameTypeCount,
      weekPositiveScore: weekPositiveScore
    }
  }
}

function getDebuffBaseScore(debuffType) {
  var DEBUFF_SCORES = {
    STAY_UP: -10,
    SMOKE_DRINK: -30,
    BINGE_EAT: -25,
    PROCRASTINATE: -15
  }
  return DEBUFF_SCORES[debuffType.toUpperCase()] || -10
}

// ============================================================
// 八、学习/工作适配度分析
// ============================================================

/**
 * 分析学习/工作时长的合理性
 */
function analyzeStudyWorkFit(category, duration, bodyProfile, todayRecords) {
  var user = resolveUserProfile(bodyProfile)

  // 计算今日该分类已累计时长
  var todayDur = 0
  if (todayRecords) {
    for (var i = 0; i < todayRecords.length; i++) {
      var r = todayRecords[i]
      if (r.category === category && r.score > 0) {
        todayDur += Number((r.detail && r.detail.duration) || r.detail && r.detail.minutes || 0)
      }
    }
  }

  var totalDur = todayDur + (duration || 0)
  var score = 0
  var messages = []

  // 单段时长
  if (duration > 180) {
    score -= 2
    messages.push('单段专注 ' + duration + ' 分钟已接近人类连续专注极限。建议分割为 90 分钟 + 休息 + 90 分钟。')
  } else if (duration >= 60 && duration <= 120) {
    score += 1
    messages.push('60-120 分钟是认知科学证明的最佳深度工作块长度。')
  }

  // 累计时长
  if (totalDur > 360) {
    score -= 3
    messages.push('今日累计 ' + category + ' 已达 ' + totalDur + ' 分钟，认知疲劳会大幅降低效率。')
  } else if (totalDur >= 120 && totalDur <= 240) {
    score += 1
    messages.push('今日' + category + '投入合理，在效率与休息间取得了平衡。')
  }

  return {
    score: score,
    fitLevel: score >= 0 ? 'good' : 'poor',
    message: messages.length > 0 ? messages.join(' ') : '学习/工作时长合理。',
    detail: {
      totalDuration: totalDur,
      sessionDuration: duration,
      riskOverwork: totalDur > 360
    }
  }
}

// ============================================================
// 九、综合分析入口
// ============================================================

/**
 * 通用记录分析入口
 * @param {string} category - sport/diet/supplement/debuff/study/work
 * @param {object} params - 记录参数
 * @param {object} bodyProfile - 用户画像
 * @param {object} context - 上下文（今日记录、本周统计等）
 * @returns {object} 分析结果
 */
function analyzeRecord(category, params, bodyProfile, context) {
  context = context || {}
  var todayRecords = context.todayRecords || []
  var weekStats = context.weekStats || null

  switch (category) {
    case 'diet':
      return analyzeDietFit(
        params.foodName || params.name || '',
        params.isJunk || params.isBingeEat || false,
        bodyProfile
      )

    case 'sport':
      return analyzeSportFit(
        params.trainingPath || 'lianti',
        Number(params.duration) || Number((params.detail && params.detail.duration)) || 0,
        params,
        bodyProfile
      )

    case 'supplement':
      return analyzeSupplementFit(params.supplementId || '', bodyProfile)

    case 'debuff':
      return analyzeDebuffImpact(
        params.debuffType || params.type || '',
        bodyProfile,
        todayRecords,
        weekStats
      )

    case 'study':
    case 'work':
      return analyzeStudyWorkFit(
        category,
        Number(params.duration) || Number((params.detail && params.detail.duration)) || 0,
        bodyProfile,
        todayRecords
      )

    default:
      return { score: 0, fitLevel: 'ok', message: '', detail: {} }
  }
}

/**
 * 获取 FIT_LEVEL 对应的视觉属性
 */
function getFitLevelStyle(fitLevel) {
  var map = {
    excellent: { color: '#10b981', icon: '✨', label: '完美适配' },
    good: { color: '#34d399', icon: '✅', label: '良好适配' },
    ok: { color: '#f59e0b', icon: '👌', label: '基本适配' },
    poor: { color: '#f97316', icon: '⚠️', label: '不太适配' },
    harmful: { color: '#ef4444', icon: '🚫', label: '有害无益' }
  }
  return map[fitLevel] || map.ok
}

// ============================================================
// 十、自定义训练项目适配分析
// ============================================================

/**
 * 分析自定义训练项目（卧推、跑步、背单词等）的适配度
 */
function analyzeCustomTrainingFit(presetCategory, metrics, bodyProfile) {
  var user = resolveUserProfile(bodyProfile)
  var messages = []
  var fitLevel = 'good'
  var score = 0

  // 根据训练类别给出适配建议
  switch (presetCategory) {
    case 'strength':
      // 力量训练：减脂期可适当力量训练保留肌肉
      if (user.goal.id === 'cut') {
        score += 1
        fitLevel = 'excellent'
        messages.push('减脂期进行力量训练有助于保留肌肉量，很好！')
      } else if (user.goal.id === 'bulk') {
        score += 2
        fitLevel = 'excellent'
        messages.push('增肌期力量训练与目标高度契合，建议搭配足够蛋白质摄入。')
      }
      // 体重过重者力量训练建议
      if (user.bmiClass === 'obese') {
        messages.push('注意动作规范，过重体重下关节压力较大，建议低冲击力量训练。')
      }
      break

    case 'endurance':
      if (user.goal.id === 'cut') {
        score += 2
        fitLevel = 'excellent'
        messages.push('有氧耐力训练与减脂目标高度契合。')
      } else if (user.goal.id === 'bulk') {
        score -= 1
        fitLevel = 'ok'
        messages.push('增肌期注意有氧不要过量，以免消耗来之不易的肌肉。')
      }
      if (user.bmiClass === 'underweight') {
        messages.push('体重偏轻，建议控制有氧时长在 30 分钟内，优先力量训练。')
      }
      break

    case 'mind':
      score += 1
      fitLevel = 'excellent'
      messages.push('神之根骨不分目标，每日精进即是修行。')
      break

    case 'study':
      score += 1
      messages.push('学海无涯，持续精进。')
      // 睡眠不足影响学习效果
      if (user.consecutiveTrainingDays > 5) {
        messages.push('注意：长期高强度用脑需充足睡眠巩固记忆（Ebbinghaus 1885）。')
      }
      break

    case 'daily':
      if (presetCategory === 'daily' && metrics.sleep_hours && metrics.sleep_hours >= 7 && metrics.sleep_hours <= 9) {
        score += 1
        fitLevel = 'excellent'
        messages.push('7-9 小时为 CDC/NSF 推荐的最佳睡眠时长，恢复质量有保障。')
      }
      break

    case 'skill':
      score += 1
      messages.push('敏之根骨提升身体控制力，长期坚持可降低运动损伤风险。')
      break
  }

  return {
    score: score,
    fitLevel: fitLevel,
    message: messages.length > 0 ? messages.join(' ') : '此训练项目与当前身体状态适配。',
    detail: { category: presetCategory }
  }
}

module.exports = {
  FITNESS_GOALS,
  calculateBMI,
  classifyBMI,
  idealWeightRange,
  resolveUserProfile,
  analyzeDietFit,
  analyzeSportFit,
  analyzeSupplementFit,
  analyzeDebuffImpact,
  analyzeStudyWorkFit,
  analyzeRecord,
  analyzeCustomTrainingFit,
  getFitLevelStyle,
  getDebuffBaseScore
}
