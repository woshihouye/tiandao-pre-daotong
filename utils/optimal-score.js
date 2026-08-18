// 偏离度递减赋分引擎 — 歌单预测/日模板最优区间修为计算
// 独立于 score.js（打卡链路），仅用于「预测展示」+「创作者确认目标区间」

const DEFAULT_OPTIMAL_TARGETS = {
  activity: { min: 300, max: 600 },
  nutrition: {
    protein:  { min: 50,  max: 80  },
    carbs:    { min: 200, max: 300 },
    fat:      { min: 40,  max: 70  },
    calories: { min: 1800, max: 2400 }
  }
}

function _safeRange(range) {
  if (!range) return { min: 0, max: 0 }
  var min = Number(range.min) || 0
  var max = Number(range.max) || 0
  if (max <= 0) max = Math.max(min, 1)
  if (min <= 0) min = Math.min(max, 1)
  if (min > max) { var tmp = min; min = max; max = tmp }
  return { min: min, max: max }
}

/**
 * 计算相对偏离度 d（>=0，0 最优）
 * v 在 [min,max] 内 → 0；v<min → (min-v)/min；v>max → (v-max)/max
 */
function calcDeviation(v, range) {
  var r = _safeRange(range)
  var val = Number(v) || 0
  if (val < 0) val = 0
  if (val >= r.min && val <= r.max) return 0
  if (val < r.min) return (r.min - val) / r.min
  return (val - r.max) / r.max
}

/**
 * 单区间修为映射（5 档递减，fullScore 为满分）
 * 【阻塞点1】负分必须与 d 线性挂钩：fullScore * -0.6 * d，禁止固定值 -0.6*fullScore；无下限
 */
function deviationToScore(d, fullScore) {
  var dev = Number(d) || 0
  var fs = Number(fullScore) || 0
  if (dev < 0) dev = 0

  if (dev <= 0.1) return Math.round(fs * 10) / 10
  if (dev <= 0.3) return Math.round(fs * 0.72 * 10) / 10
  if (dev <= 0.6) return Math.round(fs * 0.32 * 10) / 10
  if (dev <= 1.0) return 0
  // d>1.0：极端偏离，线性负分挂钩（不设下限）
  return Math.round(fs * -0.6 * dev * 10) / 10
}

/**
 * 计算活动修为（封顶 5.0）
 * @param {Number} totalCalories 当日总消耗千卡
 * @param {Object} optimalRange  { min, max }
 * @returns {Number} 活动修为
 */
function calcActivityScore(totalCalories, optimalRange) {
  var range = optimalRange || (DEFAULT_OPTIMAL_TARGETS && DEFAULT_OPTIMAL_TARGETS.activity)
  var d = calcDeviation(totalCalories, range)
  return deviationToScore(d, 5.0)
}

/**
 * 计算饮食修为（封顶 2.5）
 * 加权平均偏离度：蛋白 0.4 / 碳水 0.3 / 脂肪 0.2 / 热量 0.1
 * @param {Object} nutrition  { protein, carbs, fat, calories }
 * @param {Object} optimalNutrition  { protein:{min,max}, carbs:{...}, fat:{...}, calories:{...} }
 */
function calcNutritionScore(nutrition, optimalNutrition) {
  var opt = optimalNutrition || (DEFAULT_OPTIMAL_TARGETS && DEFAULT_OPTIMAL_TARGETS.nutrition) || {}
  var nut = nutrition || {}
  var dProtein  = calcDeviation(nut.protein,  opt.protein)
  var dCarbs    = calcDeviation(nut.carbs,    opt.carbs)
  var dFat      = calcDeviation(nut.fat,      opt.fat)
  var dCalories = calcDeviation(nut.calories, opt.calories)
  var weightedD = dProtein * 0.4 + dCarbs * 0.3 + dFat * 0.2 + dCalories * 0.1
  return deviationToScore(weightedD, 2.5)
}

/**
 * 给定 bodyProfile 计算默认最优区间（创作者确认页默认值）
 * @param {Object} bp bodyProfile { weightKg, heightCm, age, gender, goal, activityLevel }
 * goal: 'muscle' | 'fatloss' | 'maintain'；activityLevel: 1.2~1.7
 */
function calcDefaultTargetsByBodyProfile(bp) {
  var profile = bp || {}
  var weight = Number(profile.weightKg) || 65
  var height = Number(profile.heightCm) || 170
  var age = Number(profile.age) || 25
  var gender = profile.gender || 'male'
  var goal = profile.goal || 'maintain'
  var activityLevel = Number(profile.activityLevel) || 1.375

  // 简化 BMR（Mifflin-St Jeor）
  var bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'female' ? -161 : 5)
  var tdee = bmr * activityLevel
  if (goal === 'muscle') tdee += 300
  if (goal === 'fatloss') tdee -= 300

  // 蛋白 g/kg：增肌 1.6~2.2，减脂 1.8~2.4，维持 1.4~2.0
  var pLo, pHi
  if (goal === 'muscle') { pLo = 1.6; pHi = 2.2 }
  else if (goal === 'fatloss') { pLo = 1.8; pHi = 2.4 }
  else { pLo = 1.4; pHi = 2.0 }
  var protein = { min: Math.round(weight * pLo), max: Math.round(weight * pHi) }

  // 脂肪（25~30% 总卡 → 换算克：1g=9kcal）
  var fatLoKcal = tdee * 0.25, fatHiKcal = tdee * 0.30
  var fat = { min: Math.round(fatLoKcal / 9), max: Math.round(fatHiKcal / 9) }

  // 蛋白 + 脂肪 占用卡 → 剩余给碳水（1g=4kcal）
  var pKcal = protein.min * 4 + protein.max * 4; pKcal /= 2
  var fKcal = fatLoKcal + fatHiKcal; fKcal /= 2
  var carbsKcal = Math.max(0, tdee - pKcal - fKcal)
  var carbs = { min: Math.round(carbsKcal * 0.85 / 4), max: Math.round(carbsKcal * 1.15 / 4) }

  var calories = { min: Math.round(tdee * 0.95), max: Math.round(tdee * 1.05) }

  // 活动消耗区间：增肌 300-600，减脂 400-700，维持 300-500
  var activity
  if (goal === 'muscle') activity = { min: 300, max: 600 }
  else if (goal === 'fatloss') activity = { min: 400, max: 700 }
  else activity = { min: 300, max: 500 }

  return {
    activity: activity,
    nutrition: { protein: protein, carbs: carbs, fat: fat, calories: calories }
  }
}

module.exports = {
  DEFAULT_OPTIMAL_TARGETS: DEFAULT_OPTIMAL_TARGETS,
  calcDeviation: calcDeviation,
  deviationToScore: deviationToScore,
  calcActivityScore: calcActivityScore,
  calcNutritionScore: calcNutritionScore,
  calcDefaultTargetsByBodyProfile: calcDefaultTargetsByBodyProfile
}
