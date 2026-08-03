// ============================================================
// 天道修行 - 记录科学限制引擎
//
// 杜绝同一活动无限添加，所有限制基于运动科学 / 营养学 /
// 认知心理学 / 工作效能研究的合理边界。
// ============================================================

/**
 * ── 五大分类限制规则汇总 ──
 *
 * 运动（sport）
 *   单次时长 ≤ 180 min（超马级训练）
 *   单日总时长 ≤ 300 min（职业运动员日训上限）
 *   单日条目数 ≤ 3   （晨/午/晚三段训练，超出即违背恢复规律）
 *   同动作重复 ≤ 2   （如 跑步-晨 + 跑步-夜 合理，10 次即荒谬）
 *   炼体项：组数 ≤ 20，次数 ≤ 500，负重 ≤ 500 kg
 *
 * 饮食（diet）
 *   单日条目 ≤ 6  （3 主餐 + 2 加餐 + 1 补剂）
 *   单日健康餐 ≤ 3 （早餐/午餐/晚餐）
 *   单日放纵餐 ≤ 2
 *
 * 修心/学习（study）
 *   单次时长 ≤ 240 min（连续专注认知极限 ~4h）
 *   单日总时长 ≤ 480 min（全天极限学习量）
 *   单日条目 ≤ 3
 *   goalDone / earlyRise 每日仅一次
 *
 * 功业/工作（work）
 *   单次时长 ≤ 240 min
 *   单日总时长 ≤ 480 min
 *   单日条目 ≤ 2
 *   goalDone / review / noDistraction / extraEffort 每日仅一次
 *
 * 心魔（debuff）
 *   同类型每日 1 次（一个晚上只能熬一次夜）
 *   单日总心魔 ≤ 3
 */

// ============================================================
// 一、限制定义
// ============================================================

const SPORT_LIMITS = {
  maxEntriesPerDay: 3,
  maxDurationPerEntry: 180,   // 分钟
  maxDurationPerDay: 300,     // 分钟
  maxSameMovementRepeat: 2,   // 同名动作最多出现次数
  // 炼体专项
  maxSets: 20,
  maxReps: 500,
  maxWeight: 500              // kg
}

const DIET_LIMITS = {
  maxEntriesPerDay: 6,
  maxHealthyPerDay: 3,
  maxJunkPerDay: 2
}

const STUDY_LIMITS = {
  maxEntriesPerDay: 3,
  maxDurationPerEntry: 240,
  maxDurationPerDay: 480,
  // 以下字段每日只可出现一次
  onceOnlyFields: ['goalDone', 'earlyRise']
}

const WORK_LIMITS = {
  maxEntriesPerDay: 2,
  maxDurationPerEntry: 240,
  maxDurationPerDay: 480,
  onceOnlyFields: ['goalDone', 'review', 'noDistraction', 'extraEffort']
}

const DEBUFF_LIMITS = {
  maxSameTypePerDay: 1,
  maxTotalPerDay: 3
}

// ============================================================
// 二、校验引擎
// ============================================================

/**
 * 校验一条待提交记录，返回 { valid, reason }。
 * @param {string} category - sport | diet | study | work | debuff
 * @param {object} entry   - 表单数据（与 record-data 结构一致）
 * @param {array}  todayRecords - 今日同分类已有记录（原始记录数组）
 */
function validateRecord(category, entry, todayRecords) {
  if (!category || !entry) {
    return { valid: false, reason: '参数缺失' }
  }

  switch (category) {
    case 'sport':   return validateSport(entry, todayRecords || [])
    case 'diet':    return validateDiet(entry, todayRecords || [])
    case 'study':   return validateStudy(entry, todayRecords || [])
    case 'work':    return validateWork(entry, todayRecords || [])
    case 'debuff':  return validateDebuff(entry, todayRecords || [])
    default:        return { valid: true, reason: '' }
  }
}

// ── 运动 ──────────────────────────────────────────────

function validateSport(entry, todayRecords) {
  var count = todayRecords.length

  // 日条目上限
  if (count >= SPORT_LIMITS.maxEntriesPerDay) {
    return { valid: false, reason: '今日运动已达 ' + SPORT_LIMITS.maxEntriesPerDay + ' 次上限，过度训练反而损伤肉身' }
  }

  // 单次时长
  var dur = Number(entry.detail && entry.detail.duration) || Number(entry.duration) || 0
  if (dur > SPORT_LIMITS.maxDurationPerEntry) {
    return { valid: false, reason: '单次运动时长不能超过 ' + SPORT_LIMITS.maxDurationPerEntry + ' 分钟（极端耐力训练也鲜有超过 3 小时）' }
  }

  // 单日累计时长
  var totalDur = todayRecords.reduce(function (sum, r) {
    return sum + (Number((r.detail && r.detail.duration)) || 0)
  }, 0) + dur
  if (totalDur > SPORT_LIMITS.maxDurationPerDay) {
    return { valid: false, reason: '今日累计运动 ' + totalDur + ' 分钟，超过 ' + SPORT_LIMITS.maxDurationPerDay + ' 分钟上限，请明日再来' }
  }

  // 同动作名重复检测
  var name = entry.name || ''
  var sameNameCount = todayRecords.filter(function (r) { return r.name === name }).length + 1
  if (sameNameCount > SPORT_LIMITS.maxSameMovementRepeat) {
    return { valid: false, reason: '"' + name + '" 今日已记录 ' + (sameNameCount - 1) + ' 次，同动作每日不超过 ' + SPORT_LIMITS.maxSameMovementRepeat + ' 次' }
  }

  // 炼体专项
  var detail = entry.detail || {}
  var path = detail.trainingPath || ''
  if (path === 'lianti') {
    var sets = Number(detail.sets) || 0
    var reps = Number(detail.reps) || 0
    var weight = Number(detail.weight) || 0
    if (sets > SPORT_LIMITS.maxSets) return { valid: false, reason: '组数 ' + sets + ' 超过上限 ' + SPORT_LIMITS.maxSets }
    if (reps > SPORT_LIMITS.maxReps) return { valid: false, reason: '次数 ' + reps + ' 超过上限 ' + SPORT_LIMITS.maxReps }
    if (weight > SPORT_LIMITS.maxWeight) return { valid: false, reason: '负重 ' + weight + 'kg 超出合理范围' }
  }

  return { valid: true, reason: '' }
}

// ── 饮食 ──────────────────────────────────────────────

function validateDiet(entry, todayRecords) {
  var count = todayRecords.length

  if (count >= DIET_LIMITS.maxEntriesPerDay) {
    return { valid: false, reason: '今日已记录 ' + DIET_LIMITS.maxEntriesPerDay + ' 餐，超出正常饮食频率' }
  }

  // 健康餐计数
  var isHealthy = !(entry.detail && entry.detail.isBingeEat) && !(entry.detail && entry.detail.foodQuality === 'junk')
  if (isHealthy) {
    var healthyCount = todayRecords.filter(function (r) {
      return !(r.detail && r.detail.isBingeEat) && !(r.detail && r.detail.foodQuality === 'junk') && (r.score > 0)
    }).length
    if (healthyCount >= DIET_LIMITS.maxHealthyPerDay) {
      return { valid: false, reason: '今日健康餐已达 ' + DIET_LIMITS.maxHealthyPerDay + ' 次（三餐上限），一日三餐是科学饮食的基础' }
    }
  }

  // 放纵餐计数
  var isJunk = !!(entry.detail && (entry.detail.isBingeEat || entry.detail.foodQuality === 'junk'))
  if (isJunk) {
    var junkCount = todayRecords.filter(function (r) {
      return !!(r.detail && (r.detail.isBingeEat || r.detail.foodQuality === 'junk'))
    }).length
    if (junkCount >= DIET_LIMITS.maxJunkPerDay) {
      return { valid: false, reason: '今日放纵餐已记 ' + DIET_LIMITS.maxJunkPerDay + ' 次，天道不容过度放纵' }
    }
  }

  return { valid: true, reason: '' }
}

// ── 学习 ──────────────────────────────────────────────

function validateStudy(entry, todayRecords) {
  var count = todayRecords.length

  if (count >= STUDY_LIMITS.maxEntriesPerDay) {
    return { valid: false, reason: '今日已提交 ' + STUDY_LIMITS.maxEntriesPerDay + ' 次修心记录，认知科学研究表明 3 段深度专注是单日最优' }
  }

  var dur = Number(entry.detail && entry.detail.duration) || 0
  if (dur > STUDY_LIMITS.maxDurationPerEntry) {
    return { valid: false, reason: '单段修心时长不超过 ' + STUDY_LIMITS.maxDurationPerEntry + ' 分钟（人类连续专注极限 ~4 小时）' }
  }

  var totalDur = todayRecords.reduce(function (sum, r) {
    return sum + (Number((r.detail && r.detail.duration)) || 0)
  }, 0) + dur
  if (totalDur > STUDY_LIMITS.maxDurationPerDay) {
    return { valid: false, reason: '今日累计修心 ' + totalDur + ' 分钟，已超 ' + STUDY_LIMITS.maxDurationPerDay + ' 分钟认知上限' }
  }

  // 检查 once-only 字段
  var detail = entry.detail || {}
  var onceFields = STUDY_LIMITS.onceOnlyFields
  for (var i = 0; i < onceFields.length; i++) {
    var field = onceFields[i]
    if (detail[field]) {
      var already = todayRecords.some(function (r) {
        return r.detail && r.detail[field]
      })
      if (already) {
        var nameMap = { goalDone: '当日功果', earlyRise: '晨功早起' }
        return { valid: false, reason: '「' + (nameMap[field] || field) + '」每日仅可完成一次，不可重复提交' }
      }
    }
  }

  return { valid: true, reason: '' }
}

// ── 工作 ──────────────────────────────────────────────

function validateWork(entry, todayRecords) {
  var count = todayRecords.length

  if (count >= WORK_LIMITS.maxEntriesPerDay) {
    return { valid: false, reason: '今日已提交 ' + WORK_LIMITS.maxEntriesPerDay + ' 次功业记录，典型工作日分上下午两段即可' }
  }

  var dur = Number(entry.detail && entry.detail.duration) || 0
  if (dur > WORK_LIMITS.maxDurationPerEntry) {
    return { valid: false, reason: '单段功业时长不超过 ' + WORK_LIMITS.maxDurationPerEntry + ' 分钟' }
  }

  var totalDur = todayRecords.reduce(function (sum, r) {
    return sum + (Number((r.detail && r.detail.duration)) || 0)
  }, 0) + dur
  if (totalDur > WORK_LIMITS.maxDurationPerDay) {
    return { valid: false, reason: '今日累计功业 ' + totalDur + ' 分钟，超过 ' + WORK_LIMITS.maxDurationPerDay + ' 分钟，注意劳逸结合' }
  }

  // 检查 once-only 字段
  var detail = entry.detail || {}
  var onceFields = WORK_LIMITS.onceOnlyFields
  for (var i = 0; i < onceFields.length; i++) {
    var field = onceFields[i]
    if (detail[field]) {
      var already = todayRecords.some(function (r) {
        return r.detail && r.detail[field]
      })
      if (already) {
        var nameMap = { goalDone: '当日功成', review: '功业复盘', noDistraction: '心无旁骛', extraEffort: '额外精进' }
        return { valid: false, reason: '「' + (nameMap[field] || field) + '」每日仅可完成一次' }
      }
    }
  }

  return { valid: true, reason: '' }
}

// ── 心魔 ──────────────────────────────────────────────

function validateDebuff(entry, todayRecords) {
  var count = todayRecords.length

  if (count >= DEBUFF_LIMITS.maxTotalPerDay) {
    return { valid: false, reason: '今日已记录 ' + DEBUFF_LIMITS.maxTotalPerDay + ' 次心魔，再多就成魔修了' }
  }

  // 同类型重复检测
  var debuffType = (entry.detail && entry.detail.debuffType) || entry.name || ''
  var sameTypeExists = todayRecords.some(function (r) {
    var rt = (r.detail && r.detail.debuffType) || r.name || ''
    return rt === debuffType
  })
  if (sameTypeExists) {
    return { valid: false, reason: '今日已记录过「' + (entry.name || debuffType) + '」，同一心魔每日只记一次' }
  }

  return { valid: true, reason: '' }
}

// ============================================================
// 三、剩余配额查询（供 UI 展示）
// ============================================================

/**
 * 返回今日各项剩余配额，用于界面提示。
 */
function getRemainingQuota(category, todayRecords) {
  var records = todayRecords || []
  var count = records.length

  switch (category) {
    case 'sport':
      return {
        remainingEntries: Math.max(0, SPORT_LIMITS.maxEntriesPerDay - count),
        maxEntries: SPORT_LIMITS.maxEntriesPerDay,
        remainingDuration: Math.max(0, SPORT_LIMITS.maxDurationPerDay - records.reduce(function (s, r) {
          return s + (Number((r.detail && r.detail.duration)) || 0)
        }, 0)),
        maxDuration: SPORT_LIMITS.maxDurationPerDay,
        usedCount: count
      }

    case 'diet':
      var healthyUsed = records.filter(function (r) {
        return !(r.detail && (r.detail.isBingeEat || r.detail.foodQuality === 'junk')) && r.score > 0
      }).length
      var junkUsed = records.filter(function (r) {
        return !!(r.detail && (r.detail.isBingeEat || r.detail.foodQuality === 'junk'))
      }).length
      return {
        remainingEntries: Math.max(0, DIET_LIMITS.maxEntriesPerDay - count),
        maxEntries: DIET_LIMITS.maxEntriesPerDay,
        remainingHealthy: Math.max(0, DIET_LIMITS.maxHealthyPerDay - healthyUsed),
        maxHealthy: DIET_LIMITS.maxHealthyPerDay,
        remainingJunk: Math.max(0, DIET_LIMITS.maxJunkPerDay - junkUsed),
        maxJunk: DIET_LIMITS.maxJunkPerDay,
        usedCount: count
      }

    case 'study':
      var usedDur = records.reduce(function (s, r) {
        return s + (Number((r.detail && r.detail.duration)) || 0)
      }, 0)
      return {
        remainingEntries: Math.max(0, STUDY_LIMITS.maxEntriesPerDay - count),
        maxEntries: STUDY_LIMITS.maxEntriesPerDay,
        remainingDuration: Math.max(0, STUDY_LIMITS.maxDurationPerDay - usedDur),
        maxDuration: STUDY_LIMITS.maxDurationPerDay,
        usedCount: count
      }

    case 'work':
      var workUsedDur = records.reduce(function (s, r) {
        return s + (Number((r.detail && r.detail.duration)) || 0)
      }, 0)
      return {
        remainingEntries: Math.max(0, WORK_LIMITS.maxEntriesPerDay - count),
        maxEntries: WORK_LIMITS.maxEntriesPerDay,
        remainingDuration: Math.max(0, WORK_LIMITS.maxDurationPerDay - workUsedDur),
        maxDuration: WORK_LIMITS.maxDurationPerDay,
        usedCount: count
      }

    case 'debuff':
      return {
        remainingTotal: Math.max(0, DEBUFF_LIMITS.maxTotalPerDay - count),
        maxTotal: DEBUFF_LIMITS.maxTotalPerDay,
        usedCount: count,
        usedTypes: records.map(function (r) { return (r.detail && r.detail.debuffType) || r.name || '' })
      }

    default:
      return { usedCount: count }
  }
}

/**
 * 判断给定分类是否已耗尽（用于禁用提交按钮）
 */
function isCategoryExhausted(category, todayRecords) {
  var quota = getRemainingQuota(category, todayRecords)
  switch (category) {
    case 'sport':   return quota.remainingEntries <= 0 || quota.remainingDuration <= 0
    case 'diet':    return quota.remainingEntries <= 0 || (quota.remainingHealthy <= 0 && quota.remainingJunk <= 0)
    case 'study':   return quota.remainingEntries <= 0 || quota.remainingDuration <= 0
    case 'work':    return quota.remainingEntries <= 0 || quota.remainingDuration <= 0
    case 'debuff':  return quota.remainingTotal <= 0
    default:        return false
  }
}

module.exports = {
  SPORT_LIMITS,
  DIET_LIMITS,
  STUDY_LIMITS,
  WORK_LIMITS,
  DEBUFF_LIMITS,
  validateRecord,
  getRemainingQuota,
  isCategoryExhausted
}
