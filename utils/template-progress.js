// 模板进度计算引擎 — 计算模板总进度、武类结果、食类结果

var activityMeta = require('./activity-meta.js')

/**
 * 计算单个模板的总进度
 * @param {Object} template - 模板对象，包含 activities 数组
 * @param {Object} activityProgress - { activityId: 0~100 }
 * @returns {Number} 总进度 0~100，按各活动 scorePerUnit 加权平均
 */
function calcTemplateTotalProgress(template, activityProgress) {
  if (!template || !template.activities || template.activities.length === 0) return 0
  if (!activityProgress) return 0

  var totalWeight = 0
  var weightedSum = 0

  for (var i = 0; i < template.activities.length; i++) {
    var activity = template.activities[i]
    var progress = activityProgress[activity.id] || 0
    var weight = activity.scorePerUnit || 1
    weightedSum += progress * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return 0
  return Math.round(weightedSum / totalWeight)
}

/**
 * 计算模板结果（武类）
 * @param {Object} template - 模板对象
 * @param {Object} activityProgress - { activityId: 0~100 }
 * @returns {Object} { totalCalories, totalGong, muscleActivation, trainedMuscleCount, muscleRows }
 */
function calcWuTemplateResult(template, activityProgress) {
  if (!template || !template.activities || template.activities.length === 0) {
    return { totalCalories: 0, totalGong: 0, muscleActivation: {}, trainedMuscleCount: 0, muscleRows: [] }
  }

  var totalCalories = 0
  var totalGong = 0
  var muscleActivation = {}

  for (var i = 0; i < template.activities.length; i++) {
    var activity = template.activities[i]
    var progress = (activityProgress && activityProgress[activity.id]) || 0
    var factor = progress / 100

    var meta = activityMeta.getActivityMeta(activity.id, 'wu', activity)
    if (meta.caloriesPerUnit) {
      totalCalories += meta.caloriesPerUnit * factor
    }

    totalGong += (activity.scorePerUnit || 0) * factor

    if (meta.muscles) {
      var muscleKeys = Object.keys(meta.muscles)
      for (var j = 0; j < muscleKeys.length; j++) {
        var key = muscleKeys[j]
        var activation = meta.muscles[key] * factor
        if (!muscleActivation[key]) muscleActivation[key] = 0
        muscleActivation[key] += activation
      }
    }
  }

  // 肌群激活度归一化到 0~1
  var maxActivation = 0
  var muscleKeys = Object.keys(muscleActivation)
  for (var k = 0; k < muscleKeys.length; k++) {
    if (muscleActivation[muscleKeys[k]] > maxActivation) {
      maxActivation = muscleActivation[muscleKeys[k]]
    }
  }
  if (maxActivation > 1) {
    for (var m = 0; m < muscleKeys.length; m++) {
      muscleActivation[muscleKeys[m]] = Math.min(1, muscleActivation[muscleKeys[m]] / maxActivation)
    }
  }

  // 统计有激活的肌群数（激活度 >= 0.05）
  var trainedMuscleCount = 0
  for (var n = 0; n < muscleKeys.length; n++) {
    if (muscleActivation[muscleKeys[n]] >= 0.05) {
      trainedMuscleCount++
    }
  }

  // 预计算肌群行数据（避免 WXML 中调用 Math.round）
  var displayOrder = activityMeta.MUSCLE_DISPLAY_ORDER
  var muscleNames = activityMeta.MUSCLE_NAMES
  var muscleRows = []
  for (var d = 0; d < displayOrder.length; d++) {
    var mKey = displayOrder[d]
    var actVal = muscleActivation[mKey]
    if (actVal && actVal > 0) {
      muscleRows.push({
        key: mKey,
        name: muscleNames[mKey] || mKey,
        activationPct: Math.round(actVal * 100),
        activationWidth: Math.round(actVal * 100)
      })
    }
  }

  return {
    totalCalories: Math.round(totalCalories),
    totalGong: Math.round(totalGong * 10) / 10,
    muscleActivation: muscleActivation,
    trainedMuscleCount: trainedMuscleCount,
    muscleRows: muscleRows
  }
}

/**
 * 计算模板结果（食类）
 * @param {Object} template - 模板对象
 * @param {Object} activityProgress - { activityId: 0~100 }
 * @returns {Object} { totalCalories, totalGong, nutrition, macroRatio }
 */
function calcShiTemplateResult(template, activityProgress) {
  if (!template || !template.activities || template.activities.length === 0) {
    return {
      totalCalories: 0,
      totalGong: 0,
      nutrition: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
      macroRatio: { protein: 0, carbs: 0, fat: 0 }
    }
  }

  var totalCalories = 0
  var totalGong = 0
  var nutrition = { protein: 0, carbs: 0, fat: 0, fiber: 0 }

  for (var i = 0; i < template.activities.length; i++) {
    var activity = template.activities[i]
    var progress = (activityProgress && activityProgress[activity.id]) || 0
    var factor = progress / 100

    var meta = activityMeta.getActivityMeta(activity.id, 'shi', activity)

    if (meta.caloriesPerUnit) {
      totalCalories += meta.caloriesPerUnit * factor
    }

    totalGong += (activity.scorePerUnit || 0) * factor

    if (meta.nutrition) {
      nutrition.protein += (meta.nutrition.protein || 0) * factor
      nutrition.carbs += (meta.nutrition.carbs || 0) * factor
      nutrition.fat += (meta.nutrition.fat || 0) * factor
      nutrition.fiber += (meta.nutrition.fiber || 0) * factor
    }
  }

  var totalGrams = nutrition.protein + nutrition.carbs + nutrition.fat
  var roundNut = function(v) { return Math.round(v * 10) / 10 }

  return {
    totalCalories: Math.round(totalCalories),
    totalGong: roundNut(totalGong),
    nutrition: {
      protein: roundNut(nutrition.protein),
      carbs: roundNut(nutrition.carbs),
      fat: roundNut(nutrition.fat),
      fiber: roundNut(nutrition.fiber)
    },
    macroRatio: {
      protein: totalGrams > 0 ? Math.round(nutrition.protein / totalGrams * 100) : 0,
      carbs: totalGrams > 0 ? Math.round(nutrition.carbs / totalGrams * 100) : 0,
      fat: totalGrams > 0 ? Math.round(nutrition.fat / totalGrams * 100) : 0
    }
  }
}

/**
 * 模糊设置总进度时，所有活动设为相同进度值
 * @param {Number} totalProgress 0~100
 * @param {Array} activities - 活动列表 [{ id, scorePerUnit }]
 * @returns {Object} { activityId: progress }
 */
function distributeProgressToActivities(totalProgress, activities) {
  if (!activities || activities.length === 0) return {}
  var result = {}
  for (var i = 0; i < activities.length; i++) {
    result[activities[i].id] = totalProgress
  }
  return result
}

/**
 * 从模板 activities（支持 timeSlots 平铺）中抽取完整活动列表
 */
function _flattenActivities(template) {
  if (!template) return []
  if (Array.isArray(template.activities) && template.activities.length) return template.activities
  var acts = []
  var slots = template.timeSlots || []
  for (var i = 0; i < slots.length; i++) {
    var arr = (slots[i] && slots[i].activities) || []
    for (var j = 0; j < arr.length; j++) acts.push(arr[j])
  }
  return acts
}

/**
 * 计算学习类结果（不动原 calcWu/calcShi）
 * @returns {Object} { totalMinutes, totalKnowledge, items: [{id, minutes, knowledge}] }
 */
function calcStudyTemplateResult(template, activityProgress) {
  var activities = _flattenActivities(template)
  var totalMinutes = 0
  var totalKnowledge = 0
  var items = []
  for (var i = 0; i < activities.length; i++) {
    var act = activities[i]
    var progress = (activityProgress && activityProgress[act.id]) != null ? Number(activityProgress[act.id]) : 100
    var factor = Math.max(0, Math.min(1, progress / 100))
    var meta = activityMeta.getActivityMeta(act.id, act.category || 'study', act)
    var mins = Number(meta.minutesPerUnit || 0) * (Number(act.capacity && act.capacity.value != null ? act.capacity.value : 1) || 1) * factor
    var know = Number(meta.knowledgePerUnit || 0) * (Number(act.capacity && act.capacity.value != null ? act.capacity.value : 1) || 1) * factor
    totalMinutes += mins
    totalKnowledge += know
    items.push({ id: act.id, minutes: Math.round(mins * 10) / 10, knowledge: Math.round(know * 10) / 10 })
  }
  return { totalMinutes: Math.round(totalMinutes), totalKnowledge: Math.round(totalKnowledge * 10) / 10, items: items }
}

/**
 * 计算工作类结果（不动原 calcWu/calcShi）
 */
function calcWorkTemplateResult(template, activityProgress) {
  var activities = _flattenActivities(template)
  var totalOutput = 0
  var items = []
  for (var i = 0; i < activities.length; i++) {
    var act = activities[i]
    var progress = (activityProgress && activityProgress[act.id]) != null ? Number(activityProgress[act.id]) : 100
    var factor = Math.max(0, Math.min(1, progress / 100))
    var meta = activityMeta.getActivityMeta(act.id, act.category || 'work', act)
    var out = Number(meta.outputPerUnit || 0) * (Number(act.capacity && act.capacity.value != null ? act.capacity.value : 1) || 1) * factor
    totalOutput += out
    items.push({ id: act.id, output: Math.round(out * 10) / 10 })
  }
  return { totalOutput: Math.round(totalOutput * 10) / 10, items: items }
}

/**
 * 计算放纵类结果（不动原 calcWu/calcShi）——debuff 值越大越不好
 */
function calcDebuffTemplateResult(template, activityProgress) {
  var activities = _flattenActivities(template)
  var totalTimeHours = 0
  var totalExtraCalories = 0
  var items = []
  for (var i = 0; i < activities.length; i++) {
    var act = activities[i]
    var progress = (activityProgress && activityProgress[act.id]) != null ? Number(activityProgress[act.id]) : 100
    var factor = Math.max(0, Math.min(1, progress / 100))
    var meta = activityMeta.getActivityMeta(act.id, act.category || 'debuff', act)
    var hrs = Number(meta.timeCostPerUnit || 0) * (Number(act.capacity && act.capacity.value != null ? act.capacity.value : 1) || 1) * factor
    var cals = Number(meta.calorieIntakePerUnit || 0) * (Number(act.capacity && act.capacity.value != null ? act.capacity.value : 1) || 1) * factor
    totalTimeHours += hrs
    totalExtraCalories += cals
    items.push({ id: act.id, hours: Math.round(hrs * 10) / 10, extraCalories: Math.round(cals) })
  }
  return { totalTimeHours: Math.round(totalTimeHours * 10) / 10, totalExtraCalories: Math.round(totalExtraCalories), items: items }
}

/**
 * 累加所有 activities 的武+食总量（偏离度引擎用），progress=100%（预测用）
 * @returns {Object} { totalCalories: 活动千卡, nutrition:{protein,carbs,fat,calories} 饮食摄入 }
 */
function aggregateTemplateForPrediction(template) {
  var activities = _flattenActivities(template)
  var totalCalories = 0
  var nutrition = { protein: 0, carbs: 0, fat: 0, calories: 0 }
  var studyMinutes = 0
  var workOutput = 0
  var debuffHours = 0

  for (var i = 0; i < activities.length; i++) {
    var act = activities[i]
    var qty = Number(act.capacity && act.capacity.value != null ? act.capacity.value : 1) || 1
    var cat = String(act.category || '').toLowerCase()
    var um = activityMeta.getUnifiedMeta(act.id, act.category, act)

    // 武类（炼体）：卡路里按 caloriesPerUnit 计入活动消耗 totalCalories
    // 食类（饮食）：nutrition + 饮食摄入 calories（营养+饮食摄入 calories 一并入营养摄入）
    if (cat === 'shi' || cat === 'diet') {
      nutrition.protein += Number((um.nutrition && um.nutrition.protein) || 0) * qty
      nutrition.carbs   += Number((um.nutrition && um.nutrition.carbs)   || 0) * qty
      nutrition.fat     += Number((um.nutrition && um.nutrition.fat)     || 0) * qty
      nutrition.calories += Number(um.caloriesPerUnit || 0) * qty
    } else {
      // 武/其他所有：caloriesPerUnit 计为活动消耗
      totalCalories += Number(um.caloriesPerUnit || 0) * qty
    }

    // debuff calorieIntakePerUnit：加到饮食摄入卡路里（放纵额外摄入）
    if (um.calorieIntakePerUnit) nutrition.calories += Number(um.calorieIntakePerUnit) * qty

    // 学/业/放纵现实价值（不参与偏离度修为，仅展示）
    studyMinutes += Number(um.minutesPerUnit || 0) * qty
    workOutput   += Number(um.outputPerUnit    || 0) * qty
    debuffHours  += Number(um.timeCostPerUnit  || 0) * qty
  }

  var rnd = function(v) { return Math.round(v * 10) / 10 }
  return {
    totalCalories: Math.round(totalCalories),
    nutrition: {
      protein:  rnd(nutrition.protein),
      carbs:    rnd(nutrition.carbs),
      fat:      rnd(nutrition.fat),
      calories: Math.round(nutrition.calories)
    },
    studyMinutes: Math.round(studyMinutes),
    workOutput:   rnd(workOutput),
    debuffHours:  rnd(debuffHours)
  }
}

module.exports = {
  calcTemplateTotalProgress: calcTemplateTotalProgress,
  calcWuTemplateResult: calcWuTemplateResult,
  calcShiTemplateResult: calcShiTemplateResult,
  calcStudyTemplateResult: calcStudyTemplateResult,
  calcWorkTemplateResult: calcWorkTemplateResult,
  calcDebuffTemplateResult: calcDebuffTemplateResult,
  aggregateTemplateForPrediction: aggregateTemplateForPrediction,
  distributeProgressToActivities: distributeProgressToActivities
}
