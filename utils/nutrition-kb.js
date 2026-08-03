// ============================================================
// 天道修行 - 运动 · 饮食 · 营养补给综合知识库
//
// 覆盖：常见运动动作、食物营养密度、补剂品类、营养素知识
// 每次记录/分析均调用此库，结合用户身体数据给出差异化建议。
// ============================================================

// ============================================================
// 一、补剂品类定义（饮食记录类目下的独立子分类）
// ============================================================

const SUPPLEMENT_CATEGORIES = [
  {
    id: 'protein',
    name: '蛋白质类',
    icon: '🥚',
    desc: '乳清蛋白、酪蛋白、植物蛋白等，促进肌肉合成与修复',
    items: [
      { id: 'whey', name: '乳清蛋白粉', icon: '🥛', typicalDose: '25-30g/份', timing: '训练后 30min 内' },
      { id: 'casein', name: '酪蛋白', icon: '🧀', typicalDose: '25-30g/份', timing: '睡前服用（缓释）' },
      { id: 'plant_protein', name: '植物蛋白', icon: '🌱', typicalDose: '25-30g/份', timing: '任意时间' },
      { id: 'mass_gainer', name: '增肌粉', icon: '💪', typicalDose: '50-100g/份', timing: '训练后或加餐' }
    ]
  },
  {
    id: 'amino_acid',
    name: '氨基酸类',
    icon: '🧬',
    desc: 'BCAA、EAA、谷氨酰胺等单质氨基酸，加速恢复',
    items: [
      { id: 'bcaa', name: 'BCAA 支链氨基酸', icon: '🔬', typicalDose: '5-10g/次', timing: '训练中/训练后' },
      { id: 'eaa', name: 'EAA 必需氨基酸', icon: '🧪', typicalDose: '10-15g/次', timing: '训练后' },
      { id: 'glutamine', name: '谷氨酰胺', icon: '💊', typicalDose: '5-10g/次', timing: '训练后/睡前' },
      { id: 'creatine', name: '肌酸', icon: '⚡', typicalDose: '3-5g/日', timing: '训练后（可与碳水同服）' }
    ]
  },
  {
    id: 'pre_workout',
    name: '训练前补剂',
    icon: '🔥',
    desc: '氮泵、咖啡因等提升训练强度与专注力',
    items: [
      { id: 'pre_workout_powder', name: '氮泵', icon: '🚀', typicalDose: '1勺/次', timing: '训练前 20-30min' },
      { id: 'caffeine', name: '咖啡因片', icon: '☕', typicalDose: '100-200mg/次', timing: '训练前 30min' },
      { id: 'beta_alanine', name: 'β-丙氨酸', icon: '🎯', typicalDose: '2-5g/日', timing: '任意时间' },
      { id: 'citrulline', name: '瓜氨酸', icon: '🩸', typicalDose: '6-8g/次', timing: '训练前 30-60min' }
    ]
  },
  {
    id: 'vitamin_mineral',
    name: '维生素矿物质',
    icon: '💎',
    desc: '综合维生素、维生素D、钙镁锌等微量元素',
    items: [
      { id: 'multivitamin', name: '综合维生素', icon: '🌟', typicalDose: '1粒/日', timing: '随餐服用' },
      { id: 'vitamin_d', name: '维生素 D3', icon: '☀️', typicalDose: '1000-5000IU/日', timing: '随餐（含脂肪）' },
      { id: 'magnesium', name: '镁', icon: '🦴', typicalDose: '200-400mg/日', timing: '睡前' },
      { id: 'zinc', name: '锌', icon: '🛡️', typicalDose: '15-30mg/日', timing: '随餐' },
      { id: 'calcium', name: '钙', icon: '🦷', typicalDose: '500-1000mg/日', timing: '随餐' }
    ]
  },
  {
    id: 'omega',
    name: '必需脂肪酸类',
    icon: '🐟',
    desc: '鱼油、亚麻籽油等 Omega-3 必需脂肪酸',
    items: [
      { id: 'fish_oil', name: '鱼油 (Omega-3)', icon: '🐠', typicalDose: '1000-3000mg/日', timing: '随餐' },
      { id: 'flaxseed_oil', name: '亚麻籽油', icon: '🌿', typicalDose: '1-2汤匙/日', timing: '随餐' },
      { id: 'cla', name: 'CLA 共轭亚油酸', icon: '🏋️', typicalDose: '3-6g/日', timing: '随餐' }
    ]
  },
  {
    id: 'joint_bone',
    name: '关节骨骼类',
    icon: '🦿',
    desc: '氨糖、软骨素、MSM 等关节健康补剂',
    items: [
      { id: 'glucosamine', name: '氨糖', icon: '🦵', typicalDose: '1500mg/日', timing: '随餐' },
      { id: 'chondroitin', name: '软骨素', icon: '🦿', typicalDose: '800-1200mg/日', timing: '随餐' },
      { id: 'msm', name: 'MSM', icon: '🌟', typicalDose: '1000-3000mg/日', timing: '随餐' }
    ]
  },
  {
    id: 'other',
    name: '其他补剂',
    icon: '🔮',
    desc: '褪黑素、益生菌、电解质等',
    items: [
      { id: 'melatonin', name: '褪黑素', icon: '🌙', typicalDose: '1-3mg/次', timing: '睡前 30min' },
      { id: 'probiotics', name: '益生菌', icon: '🦠', typicalDose: '1-2粒/日', timing: '空腹或随餐' },
      { id: 'electrolyte', name: '电解质', icon: '⚡', typicalDose: '1包/次', timing: '训练中' },
      { id: 'greens', name: '植物精粹', icon: '🥬', typicalDose: '1勺/日', timing: '任意时间' }
    ]
  }
]

// ============================================================
// 二、运动员/健身人群营养素需求基准
// ============================================================

/**
 * 营养需求基准（每kg体重每日）
 * 参考：ISSN、ACSM、中国居民膳食指南
 */
const MACRO_BASELINE = {
  protein:   { sedentary: 0.8,  active: 1.2,  athlete: 1.6,  bodybuilder: 2.2,  unit: 'g/kg' },
  carbs:     { sedentary: 3.0,  active: 4.0,  athlete: 5.0,  bodybuilder: 6.0,  unit: 'g/kg' },
  fat:       { sedentary: 0.8,  active: 1.0,  athlete: 1.0,  bodybuilder: 1.0,  unit: 'g/kg' },
  water:     { base: 30,   unit: 'ml/kg',   activityBonus: 500,  unit_desc: 'ml/kg + 运动中每 h +500ml' }
}

// ============================================================
// 三、运动效果差异化系数
// ============================================================

/**
 * 基于性别/年龄的基代和运动效率系数
 * 参考：Mifflin-St Jeor 公式、ACSM 代谢当量
 */
const METABOLIC_COEFFICIENTS = {
  male: {
    bmrConstant: 5,     // BMR = 10*w + 6.25*h - 5*a + 5
    sportBonus: 1.0,    // 男性运动效率基准
    strengthGain: 1.0,
    cardioGain: 1.0
  },
  female: {
    bmrConstant: -161,  // BMR = 10*w + 6.25*h - 5*a - 161
    sportBonus: 0.85,   // 女性同等训练量下绝对消耗较低
    strengthGain: 0.8,  // 女性增肌速度约男性 80%
    cardioGain: 1.1     // 女性有氧耐力效率略高
  }
}

// 年龄修正系数（基于 25-30 岁基准）
const AGE_ADJUSTMENT = {
  // [minAge, maxAge, sportEfficiency, recoveryRate]
  ranges: [
    { min: 10, max: 17, sportEff: 0.80, recovery: 1.30 }, // 青少年：效率低，恢复快
    { min: 18, max: 25, sportEff: 0.95, recovery: 1.20 },
    { min: 26, max: 35, sportEff: 1.00, recovery: 1.00 }, // 黄金期
    { min: 36, max: 45, sportEff: 0.92, recovery: 0.85 },
    { min: 46, max: 55, sportEff: 0.82, recovery: 0.70 },
    { min: 56, max: 65, sportEff: 0.70, recovery: 0.55 },
    { min: 66, max: 100,sportEff: 0.55, recovery: 0.40 }
  ]
}

// 训练经验修正
const EXPERIENCE_BONUS = {
  '0-3个月':   { sportEffExtra: 0,    recoveryBonus: 0 },    // 新手保护：恢复快但效率低
  '3-6个月':  { sportEffExtra: 0.05, recoveryBonus: 0 },
  '6-12个月': { sportEffExtra: 0.08, recoveryBonus: -0.05 },
  '1-3年':    { sportEffExtra: 0.12, recoveryBonus: -0.08 },
  '3年以上':   { sportEffExtra: 0.15, recoveryBonus: -0.10 }
}

// ============================================================
// 四、食物营养密度分级
// ============================================================

const FOOD_NUTRITION_GRADE = {
  // 高营养密度食物（健康餐+额外奖励）
  premium: {
    score: 5,
    examples: ['鸡胸肉', '三文鱼', '西兰花', '鸡蛋', '蓝莓', '燕麦', '希腊酸奶', '牛油果', '红薯', '藜麦', '菠菜', '沙丁鱼'],
    label: '灵气充沛'
  },
  // 标准健康食物
  standard: {
    score: 3,
    examples: ['米饭', '面条', '面包', '鸡腿', '猪肉', '牛奶', '豆腐', '苹果', '香蕉', '胡萝卜', '番茄', '玉米', '土豆'],
    label: '中正平和'
  },
  // 低营养/高加工食物
  low: {
    score: 1,
    examples: ['白面包', '果汁', '方便面', '饼干', '薯片', '冰淇淋', '巧克力', '蛋糕', '糖果'],
    label: '灵气稀薄'
  },
  // 垃圾食品（扣分）
  junk: {
    score: -5,
    examples: ['炸鸡', '薯条', '汉堡', '披萨', '甜甜圈', '含糖饮料', '奶茶', '辣条', '烧烤酱', '肥肉'],
    label: '浊气入体'
  }
}

// ============================================================
// 五、知识库分析引擎
// ============================================================

/**
 * 根据用户身体数据计算基代和运动效率系数
 */
function calculateBodyFactors(bodyProfile) {
  var bp = bodyProfile || {}
  var gender = bp.gender || 'male'
  var age = bp.age || 25
  var weight = bp.weight || 70
  var height = bp.height || 170
  var experience = bp.trainingExperience || '0-3个月'

  // 基代（Mifflin-St Jeor）
  var genderConst = METABOLIC_COEFFICIENTS[gender] ? METABOLIC_COEFFICIENTS[gender].bmrConstant : 5
  var bmr = 10 * weight + 6.25 * height - 5 * age + genderConst
  if (gender === 'female') bmr = 10 * weight + 6.25 * height - 5 * age - 161

  // 年龄修正
  var ageAdj = AGE_ADJUSTMENT.ranges.find(function(r) { return age >= r.min && age <= r.max })
  if (!ageAdj) {
    ageAdj = age < 10 ? AGE_ADJUSTMENT.ranges[0] : AGE_ADJUSTMENT.ranges[AGE_ADJUSTMENT.ranges.length - 1]
  }

  // 经验修正
  var expBonus = EXPERIENCE_BONUS[experience] || EXPERIENCE_BONUS['0-3个月']

  // 性别基础系数
  var genderCoeff = METABOLIC_COEFFICIENTS[gender] || METABOLIC_COEFFICIENTS.male

  return {
    bmr: Math.round(bmr),
    tdeeSedentary: Math.round(bmr * 1.2),
    tdeeActive: Math.round(bmr * 1.55),
    tdeeAthlete: Math.round(bmr * 1.9),
    sportEfficiency: Math.round((genderCoeff.sportBonus * ageAdj.sportEff + expBonus.sportEffExtra) * 100) / 100,
    recoveryRate: Math.round((ageAdj.recovery + expBonus.recoveryBonus) * 100) / 100,
    strengthGainRate: Math.round((genderCoeff.strengthGain * ageAdj.sportEff) * 100) / 100,
    cardioGainRate: Math.round((genderCoeff.cardioGain * ageAdj.sportEff) * 100) / 100,
    ageGroup: ageAdj
  }
}

/**
 * 分析补剂摄入，返回建议/警示
 */
function analyzeSupplement(supplementId, bodyProfile, todayDose) {
  var factors = calculateBodyFactors(bodyProfile)
  var bp = bodyProfile || {}
  var result = {
    name: '',
    category: '',
    timing: '',
    suggestedDose: '',
    analysis: '',
    warnings: [],
    score: 0
  }

  // 在所有补剂品类中查找
  for (var i = 0; i < SUPPLEMENT_CATEGORIES.length; i++) {
    var cat = SUPPLEMENT_CATEGORIES[i]
    for (var j = 0; j < cat.items.length; j++) {
      if (cat.items[j].id === supplementId) {
        var item = cat.items[j]
        result.name = item.name
        result.category = cat.name
        result.timing = item.timing
        result.suggestedDose = item.typicalDose

        // 基于用户画像生成建议
        if (supplementId === 'whey' || supplementId === 'mass_gainer') {
          var proteinNeed = Math.round((bp.weight || 70) * MACRO_BASELINE.protein.athlete)
          result.analysis = '以你 ' + (bp.weight || 70) + 'kg 体重估算，日需蛋白质约 ' + proteinNeed + 'g。' + item.name + ' 每份提供约 25g 蛋白，训练后补充是黄金窗口。'
          result.score = 3
        } else if (supplementId === 'creatine') {
          result.analysis = '肌酸是研究最充分、最有效的补剂之一。每日 5g 持续服用，无需冲击期。配合碳水可提升肌酸吸收率。'
          result.score = 4
        } else if (supplementId === 'fish_oil') {
          result.analysis = 'Omega-3 抗炎支持关节与心血管健康。以你体重 ' + (bp.weight || 70) + 'kg，建议每日 2-3g 的 EPA+DHA 组合。'
          result.score = 3
        } else if (supplementId === 'vitamin_d') {
          result.analysis = '维生素 D3 支持免疫与骨骼健康。室内工作者尤其需要补充。日照不足时建议持续服用。'
          result.score = 3
        } else if (supplementId === 'pre_workout_powder') {
          if ((bp.age || 25) > 45) {
            result.warnings.push('年龄超过 45 岁，建议减少氮泵用量至半勺并先咨询医生。')
          }
          result.analysis = '氮泵提升训练强度，推荐在腿部/大肌群训练日使用。非训练日不建议服用，以免产生耐受。'
          result.score = 2
        } else if (supplementId === 'magnesium') {
          result.analysis = '镁支持肌肉放松与睡眠质量。以你 ' + (bp.weight || 70) + 'kg 体重，每日 300-400mg 是安全且有效的剂量。'
          result.score = 3
        } else if (supplementId === 'caffeine') {
          if ((bp.weight || 70) < 60) {
            result.warnings.push('体重偏轻，单次咖啡因建议减半至 100mg 以内。')
          }
          result.analysis = '咖啡因提升运动表现，半衰期约 5h，建议下午 2 点前使用以免影响睡眠。'
          result.score = 2
        } else if (supplementId === 'melatonin') {
          if ((bp.age || 25) < 18) {
            result.warnings.push('青少年不宜长期服用褪黑素。')
          }
          result.analysis = '褪黑素短期调节作息有效，不建议连续服用超过 4 周。核心仍是建立规律作息。'
          result.score = 1
        } else {
          result.analysis = item.name + '属于' + cat.name + '，建议按推荐剂量服用。如有不适请停用并咨询专业人士。'
          result.score = 2
        }

        // 通用检查
        if (result.warnings.length === 0 && (bp.age || 25) > 60) {
          result.warnings.push('年龄超过 60 岁，任何补剂建议先咨询医生。')
        }

        return result
      }
    }
  }

  return { name: '未知补剂', analysis: '未在知识库中找到该补剂信息', warnings: [], score: 0 }
}

/**
 * 分析食物营养密度，返回分级和积分建议
 */
function analyzeFoodNutrition(foodName) {
  if (!foodName) return { grade: 'standard', score: 3, label: '中正平和' }

  var lower = foodName.toLowerCase()

  // 遍历分级表
  var grades = ['premium', 'standard', 'low', 'junk']
  for (var g = 0; g < grades.length; g++) {
    var gradeKey = grades[g]
    var gradeInfo = FOOD_NUTRITION_GRADE[gradeKey]
    for (var e = 0; e < gradeInfo.examples.length; e++) {
      if (lower.indexOf(gradeInfo.examples[e].toLowerCase()) >= 0) {
        return { grade: gradeKey, score: gradeInfo.score, label: gradeInfo.label }
      }
    }
  }

  return { grade: 'standard', score: 3, label: '中正平和' }
}

/**
 * 基于用户身体数据计算运动差异化积分修正系数
 */
function getSportScoreMultiplier(bodyProfile, trainingPath) {
  var factors = calculateBodyFactors(bodyProfile)
  var multiplier = 1.0

  // 力量训练（炼体）受力量增益系数影响
  if (trainingPath === 'lianti') {
    multiplier = factors.strengthGainRate
  }
  // 有氧训练（炼气）受心肺增益系数影响
  else if (trainingPath === 'lianqi') {
    multiplier = factors.cardioGainRate
  }
  // 柔韧/精神类受运动效率综合影响
  else if (trainingPath === 'yangqi' || trainingPath === 'xiuxin') {
    multiplier = factors.sportEfficiency
  }

  return Math.round(multiplier * 100) / 100
}

/**
 * 获取补剂品类列表
 */
function getSupplementCategories() {
  return SUPPLEMENT_CATEGORIES
}

/**
 * 根据补剂 ID 查找补剂详情
 */
function getSupplementById(id) {
  for (var i = 0; i < SUPPLEMENT_CATEGORIES.length; i++) {
    var cat = SUPPLEMENT_CATEGORIES[i]
    for (var j = 0; j < cat.items.length; j++) {
      if (cat.items[j].id === id) return cat.items[j]
    }
  }
  return null
}

/**
 * 生成当日营养素摄入总览建议（增强版：联动 diet-scoring 引擎）
 */
function generateDailyNutritionAdvice(todayDietRecords, bodyProfile) {
  var factors = calculateBodyFactors(bodyProfile)
  var bp = bodyProfile || {}
  var weight = bp.weight || 70

  // >>> 使用 diet-scoring 引擎计算个性化目标
  var targets = null
  try {
    var dietScoring = require('./diet-scoring.js')
    targets = dietScoring.computeDailyTargets(bodyProfile)
  } catch (e) {
    // 回退到旧逻辑
  }

  var proteinTotal = 0
  var carbsTotal = 0
  var fatTotal = 0
  var caloriesTotal = 0
  var fiberTotal = 0
  var healthyCount = 0
  var junkCount = 0
  var supplementCount = 0

  for (var i = 0; i < todayDietRecords.length; i++) {
    var r = todayDietRecords[i]
    if (r.category === 'diet' || r.category === 'supplement') {
      if (r.detail && r.detail.isSupplement) {
        supplementCount++
      } else if (r.score > 0) {
        healthyCount++
      } else if (r.score < 0 && !(r.detail && r.detail.isSupplement)) {
        junkCount++
      }

      // 如果记录中包含 mealAnalysis 营养数据，进行聚合
      if (r.detail && r.detail.mealAnalysis && r.detail.mealAnalysis.nutrients) {
        var nut = r.detail.mealAnalysis.nutrients
        for (var j = 0; j < nut.length; j++) {
          if (nut[j].name === '蛋白质') proteinTotal += (nut[j].actual || 0)
          else if (nut[j].name === '碳水') carbsTotal += (nut[j].actual || 0)
          else if (nut[j].name === '脂肪') fatTotal += (nut[j].actual || 0)
          else if (nut[j].name === '膳食纤维') fiberTotal += (nut[j].actual || 0)
          else if (nut[j].name === '热量') caloriesTotal += (nut[j].actual || 0)
        }
      }
    }
  }

  // 使用个性化目标（如果可用）替代通用估算
  var dailyTargets = targets ? targets.daily : null
  var proteinTarget = dailyTargets ? dailyTargets.protein : Math.round(weight * MACRO_BASELINE.protein.athlete)
  var carbsTarget = dailyTargets ? dailyTargets.carbs : Math.round(weight * MACRO_BASELINE.carbs.active)
  var tdeeTarget = dailyTargets ? dailyTargets.calories : factors.tdeeActive

  var advice = ''

  if (healthyCount < 3 && junkCount === 0) {
    advice = '今日餐饮次数偏少（' + healthyCount + '次），建议至少保证三餐。目标蛋白质 ' + proteinTarget + 'g/日。'
  } else if (junkCount > 0) {
    advice = '已摄入 ' + junkCount + ' 次浊气食物，建议下一餐选择高蛋白清洁食物（如鸡胸肉/三文鱼）来平衡。'
  } else if (healthyCount >= 3 && supplementCount > 0) {
    advice = '今日饮食结构良好，' + healthyCount + ' 次健康餐 + 补剂配合，蛋白质达标率较好。'
  } else if (healthyCount >= 3) {
    advice = '三餐进餐频率良好。日需蛋白质约 ' + proteinTarget + 'g（' + weight + 'kg × ' + (dailyTargets ? Math.round(proteinTarget / weight * 10) / 10 : '1.6') + 'g/kg），请检查是否达标。'
    if (proteinTotal > 0) {
      var proteinPct = Math.round(proteinTotal / Math.max(1, proteinTarget) * 100)
      advice += ' 目前已摄入约 ' + Math.round(proteinTotal) + 'g（' + proteinPct + '%）。'
    }
  }

  return {
    healthyCount: healthyCount,
    junkCount: junkCount,
    supplementCount: supplementCount,
    proteinTarget: proteinTarget,
    carbsTarget: carbsTarget,
    tdee: tdeeTarget,
    advice: advice,
    // >>> 新增：实际摄入营养素聚合（如果知识库匹配到）
    actualNutrients: (proteinTotal > 0 || caloriesTotal > 0) ? {
      protein: Math.round(proteinTotal),
      carbs: Math.round(carbsTotal),
      fat: Math.round(fatTotal),
      fiber: Math.round(fiberTotal),
      calories: Math.round(caloriesTotal)
    } : null,
    dailyTargets: dailyTargets
  }
}

// ============================================================
// 七、运动科学参考数据
// ============================================================

/**
 * 力量训练参考标准（1RM / 体重）
 * 来源：NSCA Essentials of Strength Training, ACSM Guidelines
 */
var STRENGTH_STANDARDS = {
  bench_press: {
    male:   { novice: 0.75, intermediate: 1.0, advanced: 1.25, elite: 1.5 },
    female: { novice: 0.4, intermediate: 0.6, advanced: 0.75, elite: 1.0 }
  },
  squat: {
    male:   { novice: 1.0, intermediate: 1.25, advanced: 1.75, elite: 2.25 },
    female: { novice: 0.75, intermediate: 1.0, advanced: 1.25, elite: 1.75 }
  },
  deadlift: {
    male:   { novice: 1.25, intermediate: 1.5, advanced: 2.0, elite: 2.5 },
    female: { novice: 1.0, intermediate: 1.25, advanced: 1.5, elite: 2.0 }
  }
}

/**
 * 跑步 VDOT 参考
 * 来源：Daniels' Running Formula (3rd Edition)
 */
var VDOT_STANDARDS = [
  { vdot: 30, label: '初级', description: '5km ≈ 30min' },
  { vdot: 40, label: '中级', description: '5km ≈ 23min, 10km ≈ 48min' },
  { vdot: 50, label: '高级', description: '5km ≈ 19min, 10km ≈ 39min' },
  { vdot: 60, label: '精英', description: '5km ≈ 16min, 10km ≈ 33min' },
  { vdot: 70, label: '世界级', description: '5km ≈ 14min' }
]

/**
 * 心率区间划分（Karvonen 储备心率法）
 * 来源：ACSM Guidelines, Karvonen et al. (1957)
 */
var HR_ZONE_DESCRIPTIONS = {
  1: { name: '恢复区', physiological: '促进血液循环，加速代谢废物清除', fuel: '脂肪为主', trainingEffect: '主动恢复' },
  2: { name: '燃脂区', physiological: '线粒体密度增加，脂肪氧化能力提升', fuel: '脂肪为主', trainingEffect: '基础耐力建设' },
  3: { name: '有氧区', physiological: '毛细血管密度增加，心输出量提升', fuel: '脂肪+碳水', trainingEffect: '有氧能力提升' },
  4: { name: '阈值区', physiological: '乳酸阈值提升，缓冲能力增强', fuel: '碳水为主', trainingEffect: '配速耐受力' },
  5: { name: '极限区', physiological: '最大摄氧量刺激，神经肌肉招募', fuel: '碳水为主', trainingEffect: 'VO2max 提升' }
}

/**
 * 步频标准
 * 来源：Daniels' Running Formula
 */
var CADENCE_STANDARDS = {
  elite:     { min: 180, risk: 'low', note: '精英跑者步频集中在 180 spm ±5' },
  good:      { min: 170, risk: 'low', note: '步频良好，受伤风险低' },
  average:   { min: 160, risk: 'medium', note: '可提升至 170+ 以降低冲击力' },
  low:       { min: 0,   risk: 'high', note: '步频偏低，跨步过大增加胫骨和膝盖压力' }
}

/**
 * 游泳 SWOLF 标准
 */
var SWOLF_STANDARDS = [
  { max: 40, level: '精英', note: '极高的划水效率' },
  { max: 50, level: '高级', note: '优秀的游泳经济性' },
  { max: 65, level: '中级', note: '划水效率尚可，可优化' },
  { max: 999, level: '入门', note: '建议加强划水技术训练' }
]

// ============================================================
// 八、认知科学参考数据
// ============================================================

/**
 * 艾宾浩斯遗忘曲线参考数据
 * 来源：Ebbinghaus (1885), Murre & Dros (2015) 重新拟合
 */
var EBBINGHAUS_REFERENCE = {
  '20min':   { retention: 58, note: '初始快速遗忘阶段' },
  '1hour':   { retention: 44, note: '一小时后遗忘过半' },
  '1day':    { retention: 34, note: '一天后仅剩约 1/3' },
  '2days':   { retention: 28, note: '继续衰退' },
  '7days':   { retention: 25, note: '一周后曲线趋于平缓' },
  '31days':  { retention: 21, note: '一个月后残留约 1/5' }
}

/**
 * 间隔重复最佳复习间隔
 * 来源：Cepeda et al. (2006), Kang (2016)
 */
var SPACED_REPETITION_INTERVALS = [
  { review: 1, interval: '1天', gap: 1, rationale: '首次复习应在学习后 24h 内' },
  { review: 2, interval: '3天', gap: 3, rationale: '间隔逐步拉长，强化长期记忆' },
  { review: 3, interval: '7天', gap: 7, rationale: '一周复习是长期记忆形成关键点' },
  { review: 4, interval: '14天', gap: 14, rationale: '两周间隔适用于已相对熟悉的材料' },
  { review: 5, interval: '30天', gap: 30, rationale: '月度复习，维持长期保留' }
]

/**
 * CEFR 词汇量参考
 * 来源：Cambridge English, Nation (2006)
 */
var CEFR_VOCABULARY = {
  'A1': { min: 0, max: 1500, description: '基础使用者：简单日常表达' },
  'A2': { min: 1500, max: 2500, description: '初级：可处理简单日常对话' },
  'B1': { min: 2500, max: 3750, description: '中级：可独立旅行/工作沟通' },
  'B2': { min: 3750, max: 6250, description: '中高级：可进行复杂讨论' },
  'C1': { min: 6250, max: 12000, description: '高级：可用于学术/专业场景' },
  'C2': { min: 12000, max: 20000, description: '精通：接近母语者水平' }
}

/**
 * 每日新词学习量最优区间
 * 来源：Ebbinghaus (1885), Nation (2001)
 */
var OPTIMAL_WORD_LOAD = {
  conservative: { max: 10, retention: '85%+', note: '适合初学者，长期保留率最高' },
  optimal:      { max: 20, retention: '75-85%', note: '平衡效率与保留率的最佳区间' },
  high:         { max: 30, retention: '55-75%', note: '短期可见成效，长期保留率下降' },
  overload:     { max: 99, retention: '<55%', note: '超负荷，长期保留率显著下降' }
}

/**
 * 主动回忆 vs 被动复习效果对比
 * 来源：Roediger & Karpicke (2006)
 */
var ACTIVE_RECALL_EFFECT = {
  active:  { retention_1week: '56%', note: '测试后 1 周保留率' },
  passive: { retention_1week: '35%', note: '重复阅读后 1 周保留率' },
  effect_size: '50% improvement',
  conclusion: '主动回忆（测试效应）比被动重复阅读提升约 50% 长期记忆保留'
}

// ============================================================
// 九、训练项目科学建议生成
// ============================================================

/**
 * 根据用户的训练指标数据，生成基于科学文献的训练建议
 * @param {string} presetId - 训练项目 ID
 * @param {object} metrics - 用户输入的指标值
 * @param {object} bodyProfile - 用户身体画像
 * @returns {object} { advice: string, references: string[] }
 */
function generateTrainingAdvice(presetId, metrics, bodyProfile) {
  var bp = bodyProfile || {}
  var weight = Number(bp.weight || 70)
  var gender = bp.gender || 'male'
  var advice = ''
  var refs = []

  switch (presetId) {
    case 'bench_press':
    case 'squat':
    case 'deadlift':
    case 'overhead_press': {
      var trainingWeight = Number(metrics.training_weight || 0)
      var reps = Number(metrics.reps || 0)
      var rpe = Number(metrics.rpe || 0)
      var est1RM = reps > 0 ? trainingWeight * (1 + reps / 30) : 0
      var ratio = est1RM / weight
      refs = ['NSCA Essentials of Strength Training (4th Ed.)', 'Schoenfeld et al. (2016) JSCR']
      if (rpe > 0 && rpe < 6) {
        advice = 'RPE < 6 为热身/恢复强度，正式训练建议 RPE 7.5-9 以有效刺激力量增长（中高级训练者）。'
      } else if (rpe >= 9.5) {
        advice = '接近极限的训练应在有保护者的情况下进行，且不应每组的训练都达到此强度。建议大部分训练组控制在 RPE 7-9。'
      } else if (rpe >= 7.5 && rpe <= 9) {
        advice = '训练强度合理。按周期化原则（linear/undulating），可安排 3-4 周渐进超负荷后接 1 周减载。'
      }
      if (ratio < 0.5 && presetId !== 'overhead_press') {
        advice += ' 相对力量较低，建议从线性周期化（每周增加 2.5kg）起步。'
      }
      break
    }
    case 'pullup': {
      refs = ['美国海军陆战队体能标准', 'ACSM Guidelines']
      var maxReps = Number(metrics.max_reps || 0)
      if (maxReps < 5) {
        advice = '引体向上是衡量上肢相对力量的极佳指标。当前低于 5 次，建议使用弹力带辅助或负重下拉逐步提升。'
      } else if (maxReps >= 15) {
        advice = '引体向上水平优秀！可以考虑增加负重（5-20kg 负重背心/腰带）进一步提升力量。'
      }
      break
    }
    case 'running_5k':
    case 'running_10k': {
      refs = ['Daniels\' Running Formula (3rd Ed.)', '10% 规则：ACSM']
      var timeMin = Number(metrics.time_minutes || 0)
      var cadence = Number(metrics.cadence || 0)
      if (cadence > 0 && cadence < 170) {
        advice = '步频 ' + cadence + ' spm 偏低，建议逐步提升至 170-180 spm。高步频显著降低地面反作用力及受伤风险。每次提升 5 spm，给身体 2-3 周适应期。'
      } else if (cadence >= 180) {
        advice = '步频优秀，保持在 180 spm 附近即可。下一步可关注垂直振幅（减少上下波动）与触地时间。'
      }
      if (timeMin > 0) {
        advice += ' 周跑量增加遵循 10% 规则，避免跑量骤增导致的过度使用损伤。'
      }
      break
    }
    case 'vocabulary_english': {
      refs = ['Ebbinghaus (1885)', 'Roediger & Karpicke (2006) Psych. Sci.', 'Cepeda et al. (2006) Psych. Bull.']
      var newWords = Number(metrics.new_words_today || 0)
      var reviewWords = Number(metrics.review_words_today || 0)
      var method = metrics.method || 'app'
      if (newWords > 30) {
        advice = '每日 30+ 新词属于超负荷区间。Ebbinghaus 遗忘曲线表明：超负荷学习的长期保留率 < 55%。建议降至 10-20 新词/天，将更多时间分配给复习。'
      } else if (newWords >= 10 && newWords <= 20) {
        advice = '每日 10-20 新词为最优负荷区间。配合间隔重复（1-3-7-14-30 天），长期保留率可达 75-85%。'
      }
      if (method !== 'app') {
        advice += ' 研究一致表明：主动回忆（如 Anki 卡片测试）比被动阅读提升约 50% 长期记忆保留。推荐使用具备间隔重复算法的 App。'
      }
      if (reviewWords < newWords) {
        advice += ' 复习量低于新词量，建议调整比重：复习应占每日学习时间的 60-70%。'
      }
      break
    }
    case 'meditation': {
      refs = ['Lazar et al. (2011) Psychiatry Research', 'Brewer et al. (2011) PNAS']
      var dur = Number(metrics.duration_minutes || 0)
      if (dur < 10) {
        advice = '单次冥想 < 10 分钟倾向入门体验。研究显示每日 20-30 分钟、持续 8 周可观察到前额叶皮质厚度增加（Lazar et al. 2011）。'
      } else if (dur >= 20) {
        advice = '每日 20+ 分钟冥想坚持 8 周以上，神经影像学研究表明可出现可测量的脑结构变化（前额叶皮质增厚，杏仁核体积减小）。'
      }
      break
    }
    case 'sleep_quality': {
      refs = ['CDC/NSF Sleep Duration Recommendations (2015)', 'Walker, M. (2017) Why We Sleep']
      var sleepH = Number(metrics.sleep_hours || 0)
      if (sleepH < 7) {
        advice = '睡眠 < 7 小时时，运动表现、认知能力、免疫系统均受到显著影响。长期睡眠不足与多种慢性疾病风险正相关。'
      } else if (sleepH >= 7 && sleepH <= 9) {
        advice = '睡眠时长在 CDC/NSF 推荐的 7-9 小时范围内。深度睡眠 1.5-2 小时有助于肌肉修复与记忆巩固。'
      }
      break
    }
    case 'flexibility_sit_reach': {
      refs = ['ACSM Guidelines for Exercise Testing (11th Ed.)']
      var reach = Number(metrics.reach_cm || 0)
      if (reach < 10) {
        advice = '后链柔韧性目前偏弱，建议每天进行腘绳肌、下背部拉伸（10-30s × 3组），4-6 周内可见明显改善。'
      }
      break
    }
    default:
      advice = '坚持规律训练，身体会在 4-8 周内产生可测量的适应性变化。'
      refs = ['ACSM Guidelines']
      break
  }

  return { advice: advice, references: refs }
}

module.exports = {
  SUPPLEMENT_CATEGORIES,
  FOOD_NUTRITION_GRADE,
  MACRO_BASELINE,
  METABOLIC_COEFFICIENTS,
  AGE_ADJUSTMENT,
  EXPERIENCE_BONUS,
  calculateBodyFactors,
  analyzeSupplement,
  analyzeFoodNutrition,
  getSportScoreMultiplier,
  getSupplementCategories,
  getSupplementById,
  generateDailyNutritionAdvice,
  // 运动科学
  STRENGTH_STANDARDS,
  VDOT_STANDARDS,
  HR_ZONE_DESCRIPTIONS,
  CADENCE_STANDARDS,
  SWOLF_STANDARDS,
  // 认知科学
  EBBINGHAUS_REFERENCE,
  SPACED_REPETITION_INTERVALS,
  CEFR_VOCABULARY,
  OPTIMAL_WORD_LOAD,
  ACTIVE_RECALL_EFFECT,
  // 建议生成
  generateTrainingAdvice
}
