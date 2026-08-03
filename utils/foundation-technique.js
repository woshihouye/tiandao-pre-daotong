const FOUNDATION_TEMPLATE_ID = 'foundation_lian_ti_jue'

const STAGE_CONFIGS = [
  {
    levelRange: [1, 3],
    stageName: '入门三境',
    subtitle: '新手适应期',
    weeklyFrequency: 3,
    split: '全身训练',
    workoutMode: '每周3次，每次6个复合动作',
    repRule: '3组×8-12次，组间休息90秒',
    weeklySetsRange: [5, 8],
    maxVolumeGrowth: 0.1,
    trainingSuggestion: '双递进制：同重量由 8 次稳步推至 12 次，全部达成后再小幅加重。',
    examRule: '连续2周达到每周3练、单部位5-8组有效组数、动作次数落在 8-12 区间，即可冲击下一层。',
    rewardBase: 80
  },
  {
    levelRange: [4, 6],
    stageName: '进阶三境',
    subtitle: '容量递增期',
    weeklyFrequency: 4,
    split: '上下肢分化',
    workoutMode: '每周4次，上肢2次 / 下肢2次',
    repRule: '复合动作4组×6-10次，孤立动作3组×10-15次',
    weeklySetsRange: [10, 15],
    maxVolumeGrowth: 0.1,
    trainingSuggestion: '容量与强度并进：每2周加1组，4周设置1周调息周，容量减至50%。',
    examRule: '连续2周达到每周4练、单部位10-15组，并在6-10次区间完成复合动作，可晋入更高层。',
    rewardBase: 160
  },
  {
    levelRange: [7, 9],
    stageName: '大成三境',
    subtitle: '强度进阶期',
    weeklyFrequency: 5,
    split: '推拉腿分化',
    workoutMode: '每周5-6次，推 / 拉 / 腿周期化轮转',
    repRule: '复合动作5组×4-8次，辅助动作3组×8-12次',
    weeklySetsRange: [15, 20],
    maxVolumeGrowth: 0,
    trainingSuggestion: '3周积累 + 1周强化 + 1周减载，积累期 60-75%1RM，强化期 75-85%1RM。',
    examRule: '连续2周达到每周5练以上、单部位15-20组且强度落在周期区间，可解锁更高层。',
    rewardBase: 280
  }
]

const ACTIVITY_OPTIONS = [
  { key: 'auto_light', label: '每周1-2次', factor: 1.375 },
  { key: 'auto_mid', label: '每周3-5次', factor: 1.55 },
  { key: 'auto_high', label: '每周6-7次', factor: 1.725 },
  { key: 'custom', label: '自定义系数', factor: 1.55 }
]

const GOAL_CONFIG = {
  gain: {
    label: '增肌',
    caloriesDelta: 300,
    proteinPerKg: 2.0,
    carbsRange: [5, 6],
    fatPerKg: 1.0
  },
  maintain: {
    label: '维持',
    caloriesDelta: 0,
    proteinPerKg: 1.6,
    carbsRange: [4, 5],
    fatPerKg: 1.0
  },
  cut: {
    label: '减脂',
    caloriesDelta: -400,
    proteinPerKg: 2.2,
    carbsRange: [3, 4],
    fatPerKg: 0.8
  }
}

const MOVEMENT_MUSCLE_MAP = {
  卧推: '胸肩推',
  深蹲: '腿臀',
  硬拉: '腿臀',
  引体向上: '背部',
  哑铃推举: '肩部',
  跑步: '下肢有氧'
}

function getFoundationTemplate() {
  return {
    _id: FOUNDATION_TEMPLATE_ID,
    name: '薄肌模板',
    description: '遵循渐进超负荷之道，兼修增肌与基础力量，专为健身塑形人群打下薄肌根基。',
    tags: ['薄肌', '体修', '塑形'],
    founderName: '天工炼体司',
    learnerCount: 1,
    avgMatch: 88,
    isFoundation: true
  }
}

function getStageConfig(level = 1) {
  return STAGE_CONFIGS.find((item) => level >= item.levelRange[0] && level <= item.levelRange[1]) || STAGE_CONFIGS[0]
}

function getDefaultTechniqueProfile() {
  return {
    level: 1,
    qualifiedWeeks: 0,
    pendingUpgrade: false,
    lastReward: 0,
    lastRewardAt: 0
  }
}

function getDefaultBodyProfile() {
  return {
    gender: 'male',
    age: 24,
    height: 170,
    weight: 65,
    goal: 'gain',
    activityMode: 'auto_mid',
    customActivityFactor: 1.55,
    customProteinPerKg: 0,
    customCarbsPerKg: 0,
    customFatPerKg: 0
  }
}

function inferActivityFactor(weeklySessions, profile) {
  if (profile.activityMode === 'custom') {
    return Number(profile.customActivityFactor) || 1.55
  }
  if (weeklySessions >= 6) {
    return 1.725
  }
  if (weeklySessions >= 3) {
    return 1.55
  }
  return 1.375
}

function calculateBmr(profile) {
  const weight = Number(profile.weight) || 0
  const height = Number(profile.height) || 0
  const age = Number(profile.age) || 0
  if (profile.gender === 'female') {
    return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161)
  }
  return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5)
}

function calculateNutritionTarget(profile, weeklySessions, isTrainingDay) {
  const goal = GOAL_CONFIG[profile.goal] || GOAL_CONFIG.gain
  const activityFactor = inferActivityFactor(weeklySessions, profile)
  const bmr = calculateBmr(profile)
  const tdee = Math.round(bmr * activityFactor)
  const baseCalories = tdee + goal.caloriesDelta

  const proteinPerKg = Number(profile.customProteinPerKg) > 0 ? Number(profile.customProteinPerKg) : goal.proteinPerKg
  const carbsPerKg = Number(profile.customCarbsPerKg) > 0
    ? Number(profile.customCarbsPerKg)
    : ((goal.carbsRange[0] + goal.carbsRange[1]) / 2)
  const fatPerKg = Number(profile.customFatPerKg) > 0 ? Number(profile.customFatPerKg) : goal.fatPerKg

  const weight = Number(profile.weight) || 0
  const protein = Math.round(weight * proteinPerKg)
  const carbsBase = weight * carbsPerKg
  const carbs = Math.round(carbsBase * (isTrainingDay ? 1.12 : 0.9))
  const fat = Math.round(weight * fatPerKg)

  return {
    bmr,
    tdee,
    activityFactor,
    targetCalories: baseCalories,
    protein,
    carbs,
    fat,
    fiber: Math.max(25, Math.round(weight * 0.35)),
    goalLabel: goal.label,
    note: '仅供业余训练参考，不构成专业健身指导'
  }
}

function getWeekStart(dateInput) {
  const date = new Date(dateInput)
  const day = date.getDay() || 7
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - day + 1)
  return date
}

function getCurrentWeekKey(dateInput = Date.now()) {
  return formatDate(getWeekStart(dateInput))
}

function formatDate(dateInput) {
  const date = new Date(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameWeek(dateString, offset = 0) {
  const target = getWeekStart(Date.now())
  target.setDate(target.getDate() + (offset * 7))
  const targetStart = formatDate(target)
  const targetEndDate = new Date(target)
  targetEndDate.setDate(targetEndDate.getDate() + 6)
  const targetEnd = formatDate(targetEndDate)
  return dateString >= targetStart && dateString <= targetEnd
}

function normalizeSportRecord(record) {
  const detail = record.detail || {}
  const weight = Number(detail.weight) || 0
  const reps = Number(detail.reps) || 0
  const sets = Number(detail.sets) || 0
  const totalReps = Number(detail.totalReps) || (reps * sets) || 0
  const volume = Number(detail.volume) || (weight * totalReps) || 0
  const totalWork = Number(detail.totalWork) || volume || 0
  const calories = Number(detail.calories) || Math.round(volume * 0.08)
  const trainingType = detail.trainingType || (/跑|有氧/.test(record.name) ? '有氧' : '力量训练')
  const movementName = record.name || '基础动作'
  const effectiveSets = sets || inferEffectiveSets(trainingType)
  const repRange = totalReps && effectiveSets ? Math.round(totalReps / effectiveSets) : 0
  return {
    ...record,
    metrics: {
      movementName,
      trainingType,
      weight,
      reps,
      sets,
      totalReps,
      volume,
      totalWork,
      calories,
      effectiveSets,
      repRange,
      muscle: MOVEMENT_MUSCLE_MAP[movementName] || (trainingType === '有氧' ? '下肢有氧' : '全身')
    }
  }
}

function inferEffectiveSets(trainingType) {
  return trainingType === '有氧' ? 3 : 3
}

function summarizeWeek(records, offset = 0) {
  const list = records.filter((item) => isSameWeek(item.date, offset)).map(normalizeSportRecord)
  const sessionDays = [...new Set(list.map((item) => item.date))].length
  const totalVolume = list.reduce((sum, item) => sum + item.metrics.volume, 0)
  const totalWork = list.reduce((sum, item) => sum + item.metrics.totalWork, 0)
  const totalCalories = list.reduce((sum, item) => sum + item.metrics.calories, 0)
  const totalReps = list.reduce((sum, item) => sum + item.metrics.totalReps, 0)

  const muscleMap = {}
  list.forEach((item) => {
    const key = item.metrics.muscle
    muscleMap[key] = (muscleMap[key] || 0) + item.metrics.effectiveSets
  })

  const averageRepRange = list.length
    ? Math.round(list.reduce((sum, item) => sum + item.metrics.repRange, 0) / list.length)
    : 0
  const maxMuscleSets = Object.values(muscleMap).reduce((max, value) => Math.max(max, value), 0)

  return {
    list,
    sessionDays,
    totalVolume,
    totalWork,
    totalCalories,
    totalReps,
    muscleMap,
    maxMuscleSets,
    averageRepRange
  }
}

function evaluateTrainingStage(level, currentWeek, previousWeek) {
  const config = getStageConfig(level)
  const withinSets = currentWeek.maxMuscleSets >= config.weeklySetsRange[0] && currentWeek.maxMuscleSets <= config.weeklySetsRange[1]
  const frequencyMet = currentWeek.sessionDays >= config.weeklyFrequency
  const repOk = checkRepRange(level, currentWeek.averageRepRange)
  const weeklyQualified = frequencyMet && withinSets && repOk
  const previousQualified = checkPreviousWeek(level, previousWeek)
  const growthRatio = previousWeek.totalVolume > 0
    ? ((currentWeek.totalVolume - previousWeek.totalVolume) / previousWeek.totalVolume)
    : 0
  const growthSafe = config.maxVolumeGrowth === 0 ? true : growthRatio <= config.maxVolumeGrowth
  const canAdvance = weeklyQualified && previousQualified && growthSafe

  return {
    config,
    weeklyQualified,
    previousQualified,
    canAdvance,
    growthRatio,
    frequencyMet,
    withinSets,
    repOk,
    currentWeek
  }
}

function checkPreviousWeek(level, previousWeek) {
  const config = getStageConfig(level)
  if (!previousWeek.sessionDays) {
    return false
  }
  const withinSets = previousWeek.maxMuscleSets >= config.weeklySetsRange[0] && previousWeek.maxMuscleSets <= config.weeklySetsRange[1]
  const frequencyMet = previousWeek.sessionDays >= config.weeklyFrequency
  const repOk = checkRepRange(level, previousWeek.averageRepRange)
  return withinSets && frequencyMet && repOk
}

function checkRepRange(level, averageRepRange) {
  if (!averageRepRange) {
    return false
  }
  if (level <= 3) {
    return averageRepRange >= 8 && averageRepRange <= 12
  }
  if (level <= 6) {
    return averageRepRange >= 6 && averageRepRange <= 12
  }
  return averageRepRange >= 4 && averageRepRange <= 12
}

function summarizeDiet(records, dateString) {
  const todayList = records.filter((item) => item.date === dateString)
  const weekList = records.filter((item) => isSameWeek(item.date, 0))
  const monthList = records.filter((item) => {
    const current = new Date(dateString)
    const date = new Date(item.date)
    return current.getFullYear() === date.getFullYear() && current.getMonth() === date.getMonth()
  })

  const buildSum = (list) => ({
    calories: list.reduce((sum, item) => sum + (Number(item.detail?.calories) || 0), 0),
    protein: list.reduce((sum, item) => sum + (Number(item.detail?.protein) || (item.detail?.proteinOk ? 25 : 0)), 0),
    carbs: list.reduce((sum, item) => sum + (Number(item.detail?.carbs) || (item.detail?.carbsOk ? 30 : 0)), 0),
    fat: list.reduce((sum, item) => sum + (Number(item.detail?.fat) || (item.detail?.fatOk ? 10 : 0)), 0),
    fiber: list.reduce((sum, item) => sum + (Number(item.detail?.fiber) || 4), 0)
  })

  return {
    today: buildSum(todayList),
    week: buildSum(weekList),
    month: buildSum(monthList)
  }
}

function calculateAlignmentScore(target, actual) {
  if (!target.targetCalories) {
    return { score: 0, grade: '待补全参数', bonus: 0 }
  }

  const calorieDiffRate = Math.abs(actual.calories - target.targetCalories) / Math.max(1, target.targetCalories)
  const proteinRate = actual.protein / Math.max(1, target.protein)
  const carbsRate = actual.carbs / Math.max(1, target.carbs)
  const fatRate = actual.fat / Math.max(1, target.fat)

  const score = Math.max(
    0,
    Math.round(
      (Math.max(0, 1 - calorieDiffRate) * 35) +
      (Math.min(1, proteinRate) * 35) +
      (Math.min(1, carbsRate) * 20) +
      (Math.min(1, fatRate) * 10)
    )
  )

  const excellent = calorieDiffRate <= 0.1 && proteinRate >= 0.9
  return {
    score,
    grade: excellent ? '上乘契合' : score >= 75 ? '平稳契合' : '尚可调息',
    bonus: excellent ? 20 : score >= 75 ? 8 : 0,
    calorieDiffRate,
    proteinRate,
    carbsRate,
    fatRate
  }
}

function buildProgressSummary(level, trainingEval, alignment) {
  const nextLevel = Math.min(9, level + 1)
  const reward = calculateTechniqueReward(level)
  return {
    currentLevel: level,
    nextLevel,
    currentStageName: trainingEval.config.stageName,
    weekProgress: [
      { label: '周训练频次', value: `${trainingEval.currentWeek.sessionDays}/${trainingEval.config.weeklyFrequency}`, done: trainingEval.frequencyMet },
      { label: '单部位有效组', value: `${trainingEval.currentWeek.maxMuscleSets} 组`, done: trainingEval.withinSets },
      { label: '次数区间', value: `${trainingEval.currentWeek.averageRepRange || 0} 次`, done: trainingEval.repOk },
      { label: '饮食契合', value: `${alignment.score} 分`, done: alignment.score >= 75 }
    ],
    canAdvance: trainingEval.canAdvance,
    reward,
    suggestion: trainingEval.canAdvance
      ? '连续两周达成修炼标准，可冲击更高层数。'
      : (!trainingEval.weeklyQualified && !trainingEval.previousQualified)
        ? '已连续两周未满修炼门槛，宜先调整训练强度与恢复节奏，切勿急躁。'
        : '本周仍可稳固根基，继续守住频次、容量与营养契合。'
  }
}

function calculateTechniqueReward(level) {
  const config = getStageConfig(level)
  return config.rewardBase + (level * 20)
}

function buildTrainingAdvice(level, evalResult) {
  const config = evalResult.config
  const caution = evalResult.growthRatio > config.maxVolumeGrowth && config.maxVolumeGrowth > 0
    ? '本周容量增幅已逼近 10%，宜缓步加量，谨防过度训练。'
    : '当前容量节奏尚可，可循序推进，不必急于贪多。'
  return {
    title: `${config.stageName} · ${config.subtitle}`,
    split: config.split,
    workoutMode: config.workoutMode,
    repRule: config.repRule,
    weeklySetsRange: `${config.weeklySetsRange[0]}-${config.weeklySetsRange[1]} 组 / 单部位`,
    suggestion: config.trainingSuggestion,
    caution
  }
}

module.exports = {
  FOUNDATION_TEMPLATE_ID,
  STAGE_CONFIGS,
  ACTIVITY_OPTIONS,
  GOAL_CONFIG,
  getFoundationTemplate,
  getStageConfig,
  getDefaultTechniqueProfile,
  getDefaultBodyProfile,
  calculateBmr,
  calculateNutritionTarget,
  summarizeWeek,
  summarizeDiet,
  evaluateTrainingStage,
  calculateAlignmentScore,
  buildProgressSummary,
  calculateTechniqueReward,
  buildTrainingAdvice,
  formatDate,
  inferActivityFactor,
  getCurrentWeekKey
}
