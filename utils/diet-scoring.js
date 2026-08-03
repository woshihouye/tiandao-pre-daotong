// ============================================================
// 天道修行 — 饮食营养达标判定引擎
//
// 联动知识库（nutrition-kb），结合用户体征数据，
// 判断每餐各营养元素是否达标，并进行科学赋分。
//
// 参考标准：
//   - 中国居民膳食指南 (2022)
//   - ISSN 运动营养立场声明
//   - ACSM 运动营养与运动表现指南
//   - WHO/FAO 宏量营养素推荐
// ============================================================

// ============================================================
// 一、食物营养数据库（常见食物每份估计值）
// ============================================================

/**
 * 常见食物营养数据库
 * perServing: 典型一份的营养素含量
 * 单位：protein(g), carbs(g), fat(g), fiber(g), calories(kcal)
 * 数据来源：中国食物成分表 + USDA FoodData Central
 */
var FOOD_DATABASE = {
  // === 蛋白质来源 ===
  '鸡胸肉':   { perServing: { protein: 31, carbs: 0, fat: 1.2, fiber: 0, calories: 133 }, grade: 'premium', servingDesc: '200g(约一块)' },
  '鸡腿':     { perServing: { protein: 24, carbs: 0, fat: 10,  fiber: 0, calories: 186 }, grade: 'standard', servingDesc: '200g(约2只)' },
  '鸡蛋':     { perServing: { protein: 13, carbs: 1, fat: 9,   fiber: 0, calories: 140 }, grade: 'premium', servingDesc: '100g(约2个)' },
  '三文鱼':   { perServing: { protein: 25, carbs: 0, fat: 15,  fiber: 0, calories: 235 }, grade: 'premium', servingDesc: '150g(一份)' },
  '牛肉':     { perServing: { protein: 28, carbs: 0, fat: 12,  fiber: 0, calories: 220 }, grade: 'premium', servingDesc: '150g(一份)' },
  '虾':       { perServing: { protein: 20, carbs: 0, fat: 1,   fiber: 0, calories: 90  }, grade: 'premium', servingDesc: '150g' },
  '猪肉':     { perServing: { protein: 20, carbs: 0, fat: 28,  fiber: 0, calories: 330 }, grade: 'standard', servingDesc: '150g' },
  '豆腐':     { perServing: { protein: 8,  carbs: 2, fat: 4,   fiber: 1, calories: 76  }, grade: 'standard', servingDesc: '200g' },
  '沙丁鱼':   { perServing: { protein: 25, carbs: 0, fat: 12,  fiber: 0, calories: 208 }, grade: 'premium', servingDesc: '150g' },
  '牛奶':     { perServing: { protein: 8,  carbs: 12, fat: 8,  fiber: 0, calories: 150 }, grade: 'standard', servingDesc: '250ml' },
  '希腊酸奶': { perServing: { protein: 15, carbs: 6, fat: 0,   fiber: 0, calories: 100 }, grade: 'premium', servingDesc: '200g' },

  // === 主食/碳水 ===
  '米饭':     { perServing: { protein: 4,  carbs: 45, fat: 0.5, fiber: 0.5, calories: 200 }, grade: 'standard', servingDesc: '150g(约一碗)' },
  '燕麦':     { perServing: { protein: 5,  carbs: 27, fat: 3,  fiber: 4,   calories: 155 }, grade: 'premium', servingDesc: '40g(干重)' },
  '红薯':     { perServing: { protein: 3,  carbs: 40, fat: 0.5, fiber: 5,   calories: 180 }, grade: 'premium', servingDesc: '200g(约一个)' },
  '面条':     { perServing: { protein: 8,  carbs: 50, fat: 1,  fiber: 1,   calories: 240 }, grade: 'standard', servingDesc: '200g(一碗)' },
  '全麦面包': { perServing: { protein: 8,  carbs: 25, fat: 2,  fiber: 4,   calories: 150 }, grade: 'premium', servingDesc: '80g(约2片)' },
  '面包':     { perServing: { protein: 6,  carbs: 30, fat: 2,  fiber: 1,   calories: 160 }, grade: 'standard', servingDesc: '80g(约2片)' },
  '玉米':     { perServing: { protein: 4,  carbs: 28, fat: 2,  fiber: 3,   calories: 140 }, grade: 'standard', servingDesc: '200g(一根)' },
  '土豆':     { perServing: { protein: 3,  carbs: 30, fat: 0.5, fiber: 2,  calories: 130 }, grade: 'standard', servingDesc: '200g(约一个)' },
  '藜麦':     { perServing: { protein: 8,  carbs: 30, fat: 3,  fiber: 3,   calories: 180 }, grade: 'premium', servingDesc: '50g(干重)' },

  // === 蔬菜 ===
  '西兰花':   { perServing: { protein: 5,  carbs: 10, fat: 0.5, fiber: 5,  calories: 60  }, grade: 'premium', servingDesc: '200g' },
  '菠菜':     { perServing: { protein: 4,  carbs: 5,  fat: 0.5, fiber: 3,  calories: 40  }, grade: 'premium', servingDesc: '200g' },
  '胡萝卜':   { perServing: { protein: 1,  carbs: 10, fat: 0.5, fiber: 3,  calories: 50  }, grade: 'standard', servingDesc: '150g' },
  '番茄':     { perServing: { protein: 1,  carbs: 5,  fat: 0.5, fiber: 2,  calories: 25  }, grade: 'standard', servingDesc: '200g(约2个)' },

  // === 水果 ===
  '苹果':     { perServing: { protein: 0.5, carbs: 20, fat: 0.5, fiber: 3,  calories: 80  }, grade: 'standard', servingDesc: '200g(一个)' },
  '香蕉':     { perServing: { protein: 1,  carbs: 27, fat: 0.5, fiber: 2,  calories: 105 }, grade: 'standard', servingDesc: '120g(一根)' },
  '蓝莓':     { perServing: { protein: 1,  carbs: 15, fat: 0.5, fiber: 3,  calories: 70  }, grade: 'premium', servingDesc: '150g' },
  '牛油果':   { perServing: { protein: 2,  carbs: 8,  fat: 15,  fiber: 7,  calories: 160 }, grade: 'premium', servingDesc: '150g(一个)' },

  // === 常见组合餐 ===
  '鸡胸肉沙拉':    { perServing: { protein: 35, carbs: 15, fat: 4,  fiber: 6,  calories: 240 }, grade: 'premium', servingDesc: '一份' },
  '三文鱼便当':    { perServing: { protein: 30, carbs: 50, fat: 18, fiber: 4,  calories: 480 }, grade: 'premium', servingDesc: '一份' },
  '牛肉面':        { perServing: { protein: 30, carbs: 60, fat: 15, fiber: 2,  calories: 500 }, grade: 'standard', servingDesc: '一碗' },
  '鸡腿饭':        { perServing: { protein: 28, carbs: 55, fat: 15, fiber: 1,  calories: 470 }, grade: 'standard', servingDesc: '一份' },
  '麻辣烫':        { perServing: { protein: 20, carbs: 30, fat: 25, fiber: 3,  calories: 420 }, grade: 'standard', servingDesc: '一碗' },
  '火锅':          { perServing: { protein: 40, carbs: 30, fat: 45, fiber: 2,  calories: 700 }, grade: 'low', servingDesc: '一人份' },
  '沙拉':          { perServing: { protein: 5,  carbs: 12, fat: 3,  fiber: 5,  calories: 100 }, grade: 'premium', servingDesc: '一份' },
  '三明治':        { perServing: { protein: 18, carbs: 30, fat: 12, fiber: 3,  calories: 300 }, grade: 'standard', servingDesc: '一个' },
  '包子':          { perServing: { protein: 10, carbs: 30, fat: 8,  fiber: 1,  calories: 230 }, grade: 'standard', servingDesc: '2个' },
  '饺子':          { perServing: { protein: 20, carbs: 45, fat: 15, fiber: 1,  calories: 400 }, grade: 'standard', servingDesc: '15个' },
  '豆浆':          { perServing: { protein: 8,  carbs: 5,  fat: 3,  fiber: 1,  calories: 80  }, grade: 'premium', servingDesc: '300ml' },
  '油条':          { perServing: { protein: 5,  carbs: 25, fat: 15, fiber: 0,  calories: 250 }, grade: 'low', servingDesc: '一根' },

  // === 不健康食品 ===
  '炸鸡':          { perServing: { protein: 25, carbs: 20, fat: 30, fiber: 0,  calories: 450 }, grade: 'junk', servingDesc: '200g(一块)' },
  '汉堡':          { perServing: { protein: 25, carbs: 40, fat: 25, fiber: 2,  calories: 480 }, grade: 'junk', servingDesc: '一个' },
  '薯条':          { perServing: { protein: 3,  carbs: 40, fat: 15, fiber: 1,  calories: 310 }, grade: 'junk', servingDesc: '一份' },
  '奶茶':          { perServing: { protein: 3,  carbs: 45, fat: 8,  fiber: 0,  calories: 260 }, grade: 'junk', servingDesc: '500ml' },
  '披萨':          { perServing: { protein: 20, carbs: 40, fat: 20, fiber: 2,  calories: 420 }, grade: 'junk', servingDesc: '2片' },
  '方便面':        { perServing: { protein: 8,  carbs: 50, fat: 20, fiber: 1,  calories: 400 }, grade: 'low', servingDesc: '一包' },
  '饼干':          { perServing: { protein: 3,  carbs: 30, fat: 12, fiber: 1,  calories: 240 }, grade: 'low', servingDesc: '100g(约5片)' },
  '蛋糕':          { perServing: { protein: 5,  carbs: 35, fat: 15, fiber: 0,  calories: 290 }, grade: 'low', servingDesc: '100g(一块)' },
  '冰淇淋':        { perServing: { protein: 3,  carbs: 25, fat: 10, fiber: 0,  calories: 200 }, grade: 'low', servingDesc: '100g(一个球)' },
  '含糖饮料':      { perServing: { protein: 0,  carbs: 35, fat: 0,  fiber: 0,  calories: 140 }, grade: 'junk', servingDesc: '350ml' },
  '巧克力':        { perServing: { protein: 3,  carbs: 25, fat: 15, fiber: 2,  calories: 240 }, grade: 'low', servingDesc: '50g' },
  '烧烤':          { perServing: { protein: 30, carbs: 10, fat: 35, fiber: 1,  calories: 480 }, grade: 'junk', servingDesc: '一人份' },
  '辣条':          { perServing: { protein: 2,  carbs: 15, fat: 15, fiber: 0,  calories: 200 }, grade: 'junk', servingDesc: '100g' },

  // === 汤/粥类 ===
  '粥':            { perServing: { protein: 3,  carbs: 25, fat: 1,  fiber: 0.5, calories: 120 }, grade: 'standard', servingDesc: '一碗(300ml)' },
  '鸡蛋羹':        { perServing: { protein: 12, carbs: 2,  fat: 8,  fiber: 0,  calories: 130 }, grade: 'premium', servingDesc: '一份' },
  '紫菜蛋花汤':    { perServing: { protein: 8,  carbs: 5,  fat: 5,  fiber: 1,  calories: 100 }, grade: 'premium', servingDesc: '一碗' },
}

/**
 * 根据食物名称从数据库中查找营养估计
 * @param {string} foodName - 食物名称
 * @returns {object|null} { nutrients: {...}, grade, servingDesc, matchedKey }
 */
function lookupFoodNutrients(foodName) {
  if (!foodName) return null
  var name = foodName.trim()

  // 精确匹配
  if (FOOD_DATABASE[name]) {
    var entry = FOOD_DATABASE[name]
    return {
      nutrients: cloneNutrients(entry.perServing),
      grade: entry.grade,
      servingDesc: entry.servingDesc,
      matchedKey: name,
      matchType: 'exact'
    }
  }

  // 部分匹配（最长关键词优先）
  var keys = Object.keys(FOOD_DATABASE)
  keys.sort(function(a, b) { return b.length - a.length })
  for (var i = 0; i < keys.length; i++) {
    if (name.indexOf(keys[i]) >= 0) {
      var e = FOOD_DATABASE[keys[i]]
      return {
        nutrients: cloneNutrients(e.perServing),
        grade: e.grade,
        servingDesc: e.servingDesc,
        matchedKey: keys[i],
        matchType: 'partial'
      }
    }
  }

  return null
}

function cloneNutrients(n) {
  return {
    protein: n.protein || 0,
    carbs: n.carbs || 0,
    fat: n.fat || 0,
    fiber: n.fiber || 0,
    calories: n.calories || 0
  }
}

// ============================================================
// 二、个性化营养目标计算
// ============================================================

/**
 * 根据体征和健身目标，计算每日营养素推荐量
 * @param {object} bodyProfile - 用户体征 { weight, height, age, gender, goal/fitnessGoal, ... }
 * @returns {object} 每日 + 每餐目标
 */
function computeDailyTargets(bodyProfile) {
  var bp = bodyProfile || {}
  var weight = Number(bp.weight) || 70
  var height = Number(bp.height) || 170
  var age = Number(bp.age) || 25
  var gender = bp.gender || 'male'
  var goal = bp.goal || bp.fitnessGoal || 'maintain'

  // BMI
  var bmi = weight / ((height / 100) * (height / 100))

  // BMR（Mifflin-St Jeor）
  var bmr
  if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5
  }

  // TDEE
  var activityMultiplier = 1.55
  var tdee = Math.round(bmr * activityMultiplier)

  // 目标调整
  if (goal === 'cut' || goal === 'cutting') {
    tdee = Math.round(tdee * 0.85) // 减脂：-15%
  } else if (goal === 'bulk' || goal === 'bulking') {
    tdee = Math.round(tdee * 1.10) // 增肌：+10%
  }

  // 蛋白质 g/kg（ISSN + 中国居民膳食指南）
  var proteinPerKg = 1.2
  if (goal === 'cut' || goal === 'cutting') proteinPerKg = 2.0
  else if (goal === 'bulk' || goal === 'bulking') proteinPerKg = 1.8
  else if (goal === 'endurance') proteinPerKg = 1.4

  var dailyProtein = Math.round(weight * proteinPerKg)

  // 脂肪
  var dailyFat = Math.round(weight * 1.0)

  // 碳水（剩余热量补足）
  var proteinCals = dailyProtein * 4
  var fatCals = dailyFat * 9
  var carbCals = Math.max(0, tdee - proteinCals - fatCals)
  var dailyCarbs = Math.max(100, Math.round(carbCals / 4))

  // 膳食纤维
  var dailyFiber = gender === 'female' ? 25 : 30

  // 确定活动水平标签
  var activityLevel = 'active'
  if (goal === 'cut' || goal === 'cutting') activityLevel = 'athlete'
  if (goal === 'bulk' || goal === 'bulking') activityLevel = 'bodybuilder'

  // 每餐目标（按 6 餐均分）
  var mealCount = 6
  return {
    weight: weight,
    bmi: Math.round(bmi * 10) / 10,
    bmiClass: classifyBMIForTargets(bmi),
    bmr: Math.round(bmr),
    tdee: tdee,
    goal: goal,
    activityLevel: activityLevel,
    proteinPerKg: proteinPerKg,
    daily: {
      protein: dailyProtein,
      carbs: dailyCarbs,
      fat: dailyFat,
      fiber: dailyFiber,
      calories: tdee
    },
    perMeal: {
      protein: Math.round(dailyProtein / mealCount),
      carbs: Math.round(dailyCarbs / mealCount),
      fat: Math.round(dailyFat / mealCount),
      fiber: Math.round(dailyFiber / mealCount),
      calories: Math.round(tdee / mealCount)
    }
  }
}

function classifyBMIForTargets(bmi) {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 24) return 'normal'
  if (bmi < 28) return 'overweight'
  return 'obese'
}

// ============================================================
// 三、单餐营养达标判定
// ============================================================

/**
 * 分析一餐的营养素达标情况
 * @param {object} actual - 实际摄入量 { protein, carbs, fat, fiber, calories }
 * @param {object} targets - computeDailyTargets 的返回值
 * @param {object} [options] - { foodGrade: 'premium'|'standard'|'low'|'junk', mealContext: {...} }
 * @returns {object} 达标分析结果
 */
function analyzeMealAdequacy(actual, targets, options) {
  var opts = options || {}
  var perMeal = targets.perMeal
  var foodGrade = opts.foodGrade || 'standard'

  var nutrients = []
  var totalScore = 0
  var warnings = []
  var highlights = []

  // ---- 1. 蛋白质（权重: 30%，最高 3 分） ----
  var proteinPct = safeRatio(actual.protein, perMeal.protein)
  var protResult = scoreNutrient({
    name: '蛋白质',
    actual: Math.round(actual.protein),
    target: perMeal.protein,
    unit: 'g',
    pct: proteinPct,
    weight: 3,
    idealMin: 0.70,
    idealMax: 1.50,
    goodMin: 0.45,
    goodMax: 2.0,
    goal: targets.goal,
    isKeyNutrient: true
  })
  nutrients.push(protResult)
  totalScore += protResult.score

  // ---- 2. 热量（权重: 25%，最高 2.5 分） ----
  var calPct = safeRatio(actual.calories, perMeal.calories)
  var calResult = scoreNutrient({
    name: '热量',
    actual: Math.round(actual.calories),
    target: perMeal.calories,
    unit: 'kcal',
    pct: calPct,
    weight: 2.5,
    idealMin: 0.75,
    idealMax: 1.25,
    goodMin: 0.50,
    goodMax: 1.50,
    goal: targets.goal,
    isKeyNutrient: true
  })
  nutrients.push(calResult)
  totalScore += calResult.score

  // ---- 3. 碳水（权重: 15%，最高 1.5 分） ----
  var carbPct = safeRatio(actual.carbs, perMeal.carbs)
  // 减脂期碳水阈值更低，高碳扣更多
  var carbIdealMax = targets.goal === 'cut' || targets.goal === 'cutting' ? 1.0 : 1.3
  var carbGoodMin = targets.goal === 'cut' || targets.goal === 'cutting' ? 0.4 : 0.5
  var carbResult = scoreNutrient({
    name: '碳水',
    actual: Math.round(actual.carbs),
    target: perMeal.carbs,
    unit: 'g',
    pct: carbPct,
    weight: 1.5,
    idealMin: carbGoodMin,
    idealMax: carbIdealMax,
    goodMin: 0.3,
    goodMax: 1.8,
    goal: targets.goal,
    isKeyNutrient: false
  })
  nutrients.push(carbResult)
  totalScore += carbResult.score

  // ---- 4. 脂肪（权重: 15%，最高 1.5 分） ----
  var fatPct = safeRatio(actual.fat, perMeal.fat)
  var fatResult = scoreNutrient({
    name: '脂肪',
    actual: Math.round(actual.fat),
    target: perMeal.fat,
    unit: 'g',
    pct: fatPct,
    weight: 1.5,
    idealMin: 0.5,
    idealMax: 1.5,
    goodMin: 0.3,
    goodMax: 2.0,
    goal: targets.goal,
    isKeyNutrient: false
  })
  nutrients.push(fatResult)
  totalScore += fatResult.score

  // ---- 5. 膳食纤维（权重: 10%，最高 1 分） ----
  var fiberPct = safeRatio(actual.fiber, perMeal.fiber)
  var fiberResult = scoreNutrient({
    name: '膳食纤维',
    actual: Math.round(actual.fiber),
    target: perMeal.fiber,
    unit: 'g',
    pct: fiberPct,
    weight: 1.0,
    idealMin: 0.5,
    idealMax: 2.0,
    goodMin: 0.25,
    goodMax: 3.0,
    goal: targets.goal,
    isKeyNutrient: false
  })
  nutrients.push(fiberResult)
  totalScore += fiberResult.score

  // ---- 6. 宏量营养素平衡（权重: 5%，最高 0.5 分） ----
  var balanceScore = calcMacroBalance(actual)
  var balanceResult = {
    name: '宏量平衡',
    actual: '-',
    target: '蛋白:碳水:脂肪 ≈ 3:4:3',
    unit: '',
    pct: Math.round(balanceScore * 100),
    score: balanceScore * 0.5,
    status: balanceScore > 0.7 ? 'excellent' : (balanceScore > 0.4 ? 'good' : 'poor'),
    statusLabel: balanceScore > 0.7 ? '均衡' : (balanceScore > 0.4 ? '一般' : '失衡'),
    icon: balanceScore > 0.7 ? '✅' : (balanceScore > 0.4 ? '👌' : '⚠️'),
    color: balanceScore > 0.7 ? '#10b981' : (balanceScore > 0.4 ? '#f59e0b' : '#f97316'),
    isKeyNutrient: false
  }
  nutrients.push(balanceResult)
  totalScore += balanceResult.score

  // ---- 汇总 ----
  var rawScore = Math.round(totalScore * 10) / 10

  // 食物品质修正系数
  var gradeMultiplier = 1.0
  if (foodGrade === 'premium') gradeMultiplier = 1.15
  else if (foodGrade === 'low') gradeMultiplier = 0.85
  else if (foodGrade === 'junk') {
    // 垃圾食品：正向分打半，负向分放大（不能因为"不健康"反而把负分缩小）
    gradeMultiplier = rawScore >= 0 ? 0.5 : 1.5
  }

  var finalScore = Math.round(rawScore * gradeMultiplier)

  // 夹紧到 [-5, 8]
  finalScore = Math.max(-5, Math.min(8, finalScore))

  // 等级
  var level
  if (finalScore >= 6) level = 'excellent'
  else if (finalScore >= 3) level = 'good'
  else if (finalScore >= 0) level = 'ok'
  else if (finalScore >= -3) level = 'poor'
  else level = 'harmful'

  var levelLabels = {
    excellent: { label: '灵气充沛', desc: '营养结构完美匹配当前修炼之道' },
    good: { label: '丹食有道', desc: '整体营养均衡，少数维度可优化' },
    ok: { label: '中正平和', desc: '基本达标，但仍有提升空间' },
    poor: { label: '灵气不足', desc: '多项营养素未达标，建议补充' },
    harmful: { label: '浊气入体', desc: '严重影响修行，亟需调整饮食' }
  }

  return {
    score: finalScore,
    level: level,
    levelLabel: levelLabels[level].label,
    levelDesc: levelLabels[level].desc,
    nutrients: nutrients,
    gradeMultiplier: gradeMultiplier,
    rawScore: rawScore,
    targets: targets,
    maxPossibleScore: 10
  }
}

/**
 * 单营养素评分
 */
function scoreNutrient(opts) {
  var pct = opts.pct
  var status, statusLabel, icon, color, score

  if (pct >= opts.idealMin && pct <= opts.idealMax) {
    status = 'excellent'
    statusLabel = '达标'
    icon = '✅'
    color = '#10b981'
    score = opts.weight
  } else if (pct >= opts.goodMin && pct <= opts.goodMax) {
    status = 'good'
    statusLabel = pct < opts.idealMin ? '略低' : '略高'
    icon = '👌'
    color = '#f59e0b'
    score = opts.weight * 0.65
  } else if (pct > 0) {
    status = 'poor'
    statusLabel = pct < opts.goodMin ? '不足' : '超标'
    icon = '⚠️'
    color = '#f97316'
    score = opts.isKeyNutrient ? -opts.weight * 0.3 : 0
  } else {
    status = 'deficient'
    statusLabel = '缺失'
    icon = '❌'
    color = '#ef4444'
    score = opts.isKeyNutrient ? -opts.weight * 0.7 : -opts.weight * 0.2
  }

  return {
    name: opts.name,
    actual: opts.actual,
    target: opts.target,
    unit: opts.unit,
    pct: Math.round(pct * 100),
    score: Math.round(score * 10) / 10,
    status: status,
    statusLabel: statusLabel,
    icon: icon,
    color: color,
    isKeyNutrient: opts.isKeyNutrient
  }
}

/**
 * 宏量营养素三元素平衡评分
 * 理想比例：蛋白 25-35%, 碳水 40-55%, 脂肪 20-30%
 */
function calcMacroBalance(actual) {
  var totalCals = actual.protein * 4 + actual.carbs * 4 + actual.fat * 9
  if (totalCals <= 0) return 0

  var pPct = (actual.protein * 4) / totalCals
  var cPct = (actual.carbs * 4) / totalCals
  var fPct = (actual.fat * 9) / totalCals

  // 每项偏离理想范围的罚分
  var score = 1.0

  // 蛋白质偏离
  if (pPct < 0.15) score -= 0.3
  else if (pPct < 0.2) score -= 0.15
  else if (pPct > 0.45) score -= 0.1

  // 碳水偏离
  if (cPct < 0.3) score -= 0.2
  else if (cPct > 0.65) score -= 0.2

  // 脂肪偏离
  if (fPct < 0.1) score -= 0.15
  else if (fPct > 0.45) score -= 0.3

  return Math.max(0, score)
}

function safeRatio(actual, target) {
  if (!target || target <= 0) return 0
  return actual / target
}

// ============================================================
// 四、便捷接口
// ============================================================

/**
 * 一键分析：从食物名称到完整营养达标报告
 * @param {string} foodName - 食物名称
 * @param {object} bodyProfile - 用户体征
 * @returns {object} { found, nutrients, targets, adequacy, score, level, ... }
 */
function analyzeDietRecord(foodName, bodyProfile) {
  var result = {
    found: false,
    foodName: foodName,
    nutrients: null,
    foodGrade: 'standard',
    servingDesc: '',
    matchedKey: '',
    matchType: '',
    targets: null,
    adequacy: null,
    // 综合评分
    score: 0,
    level: 'ok',
    levelLabel: '中正平和',
    levelDesc: '无法获取详细营养数据，使用基础分级',
    details: []
  }

  // 1. 计算个性化目标
  var targets = computeDailyTargets(bodyProfile)
  result.targets = targets

  // 2. 从知识库查找食物营养数据
  var lookup = lookupFoodNutrients(foodName)
  if (lookup && lookup.nutrients) {
    result.found = true
    result.nutrients = lookup.nutrients
    result.foodGrade = lookup.grade
    result.servingDesc = lookup.servingDesc
    result.matchedKey = lookup.matchedKey
    result.matchType = lookup.matchType

    // 3. 进行营养达标判定
    var adequacy = analyzeMealAdequacy(lookup.nutrients, targets, { foodGrade: lookup.grade })
    result.adequacy = adequacy
    result.score = adequacy.score
    result.level = adequacy.level
    result.levelLabel = adequacy.levelLabel
    result.levelDesc = adequacy.levelDesc
    result.details = adequacy.nutrients
  }

  return result
}

// ============================================================
// 五、食物分类（薄荷健康风格）
// ============================================================

/**
 * 食物分类定义
 * 每个分类下有若干食物，每项包含 name / icon / 营养简述
 */
var FOOD_CATEGORIES = [
  {
    id: 'staple',
    name: '主食',
    icon: '🍚',
    color: '#f59e0b',
    foods: ['米饭', '燕麦', '红薯', '面条', '全麦面包', '面包', '玉米', '土豆', '藜麦', '粥', '包子', '饺子', '油条']
  },
  {
    id: 'meat',
    name: '肉蛋',
    icon: '🥩',
    color: '#ef4444',
    foods: ['鸡胸肉', '鸡腿', '鸡蛋', '三文鱼', '牛肉', '虾', '猪肉', '沙丁鱼']
  },
  {
    id: 'veggie',
    name: '蔬菜',
    icon: '🥬',
    color: '#10b981',
    foods: ['西兰花', '菠菜', '胡萝卜', '番茄', '沙拉']
  },
  {
    id: 'fruit',
    name: '水果',
    icon: '🍎',
    color: '#f97316',
    foods: ['苹果', '香蕉', '蓝莓', '牛油果']
  },
  {
    id: 'drink',
    name: '饮品',
    icon: '🥤',
    color: '#6366f1',
    foods: ['牛奶', '豆浆', '含糖饮料', '奶茶', '希腊酸奶']
  },
  {
    id: 'snack',
    name: '零食',
    icon: '🍪',
    color: '#a855f7',
    foods: ['饼干', '蛋糕', '冰淇淋', '巧克力', '辣条', '薯条']
  },
  {
    id: 'combo',
    name: '组合餐',
    icon: '🍱',
    color: '#14b8a6',
    foods: ['鸡胸肉沙拉', '三文鱼便当', '牛肉面', '鸡腿饭', '麻辣烫', '火锅', '三明治', '鸡蛋羹', '紫菜蛋花汤']
  },
  {
    id: 'junk',
    name: '浊食',
    icon: '⚠️',
    color: '#dc2626',
    foods: ['炸鸡', '汉堡', '薯条', '奶茶', '披萨', '烧烤', '辣条', '含糖饮料']
  }
]

/**
 * 根据分类ID获取食列列表（含营养数据）
 */
function getCategoryFoods(catId) {
  var cat = FOOD_CATEGORIES.find(function(c) { return c.id === catId })
  if (!cat) return []
  return cat.foods.map(function(name) {
    var lookup = lookupFoodNutrients(name)
    var n = lookup ? lookup.nutrients : null
    return {
      name: name,
      icon: cat.icon,
      grade: lookup ? lookup.grade : 'standard',
      calories: n ? n.calories : 0,
      protein: n ? n.protein : 0,
      carbs: n ? n.carbs : 0,
      fat: n ? n.fat : 0,
      servingDesc: lookup ? lookup.servingDesc : ''
    }
  })
}

/**
 * 搜索食物（模糊匹配）
 */
function searchFoods(query) {
  if (!query) return []
  var q = query.trim().toLowerCase()
  var results = []
  var seen = {}
  FOOD_CATEGORIES.forEach(function(cat) {
    cat.foods.forEach(function(name) {
      if (seen[name]) return
      if (name.toLowerCase().indexOf(q) >= 0 || q.indexOf(name.toLowerCase()) >= 0) {
        seen[name] = true
        var lookup = lookupFoodNutrients(name)
        var n = lookup ? lookup.nutrients : null
        results.push({
          name: name,
          icon: cat.icon,
          category: cat.name,
          grade: lookup ? lookup.grade : 'standard',
          calories: n ? n.calories : 0,
          protein: n ? n.protein : 0,
          carbs: n ? n.carbs : 0,
          fat: n ? n.fat : 0,
          servingDesc: lookup ? lookup.servingDesc : ''
        })
      }
    })
  })
  return results
}

/**
 * 获取所有常见食物（用于首页快捷入口）
 */
function getQuickFoods() {
  var quick = ['鸡胸肉', '鸡蛋', '米饭', '三文鱼便当', '燕麦', '西兰花', '牛肉面', '沙拉', '牛奶', '苹果']
  return quick.map(function(name) {
    var lookup = lookupFoodNutrients(name)
    var n = lookup ? lookup.nutrients : null
    // 找到对应分类图标
    var icon = '🍽️'
    for (var i = 0; i < FOOD_CATEGORIES.length; i++) {
      if (FOOD_CATEGORIES[i].foods.indexOf(name) >= 0) {
        icon = FOOD_CATEGORIES[i].icon
        break
      }
    }
    return {
      name: name,
      icon: icon,
      grade: lookup ? lookup.grade : 'standard',
      calories: n ? n.calories : 0,
      protein: n ? n.protein : 0,
      servingDesc: lookup ? lookup.servingDesc : ''
    }
  })
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  FOOD_DATABASE,
  FOOD_CATEGORIES,
  lookupFoodNutrients,
  getCategoryFoods,
  searchFoods,
  getQuickFoods,
  computeDailyTargets,
  analyzeMealAdequacy,
  analyzeDietRecord
}
