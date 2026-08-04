// ============================================================
// 天道修行 v4.0 — 道基参数引擎
//
// 核心逻辑：
//   - 单一境界从入门到突破的耗时越短，道基品质品级越高
//   - 每次大境界突破时同步结算道基品级
//   - 各境界道基独立留存，突破后不可更改
//   - 道基品质影响后续修行的加成率
// ============================================================

var consts = require('../../utils/constants.js')
var DAO_FOUNDATION_GRADE = consts.DAO_FOUNDATION_GRADE

/**
 * 根据修炼天数和突破时修为计算道基品质
 *
 * 品质判定逻辑：
 *   修炼天数越短 → 品质越高（说明悟性高、修炼效率高）
 *   突破时修为越高 → 额外加分（说明积累更深厚）
 *
 * @param {string} realmId - 境界ID
 * @param {number} daysSpent - 在该境界累计修炼天数
 * @param {number} scoreAtBreakthrough - 突破时的总修为值
 * @returns {object} { grade, gradeName, qualityScore, bonusRate }
 */
function calcDaoFoundation(realmId, daysSpent, scoreAtBreakthrough) {
  var grade = DAO_FOUNDATION_GRADE.XIA
  var grades = [
    DAO_FOUNDATION_GRADE.XIAN,
    DAO_FOUNDATION_GRADE.JI,
    DAO_FOUNDATION_GRADE.SHANG,
    DAO_FOUNDATION_GRADE.ZHONG,
    DAO_FOUNDATION_GRADE.XIA
  ]

  // 从高到低匹配：天数越短越好
  for (var i = 0; i < grades.length; i++) {
    var g = grades[i]
    if (daysSpent >= g.minDays && daysSpent <= g.maxDays) {
      grade = g
      break
    }
  }

  // 品质评分 (0~100)：基础分 + 修为加成
  var baseScore = 100 - Math.min(100, Math.floor(daysSpent * 0.5)) // 天数越少分越高
  var scoreBonus = Math.min(10, Math.floor((scoreAtBreakthrough || 0) / 1000))
  var qualityScore = Math.max(0, Math.min(100, baseScore + scoreBonus))

  return {
    gradeId: grade.id,
    gradeName: grade.name,
    gradeColor: grade.color,
    qualityScore: qualityScore,
    bonusRate: grade.bonusRate,
    daysSpent: daysSpent,
    scoreAtBreakthrough: scoreAtBreakthrough || 0,
    calculatedAt: Date.now()
  }
}

/**
 * 获取道基加成率（用于后续修为计算）
 * @param {object} daoFoundationRecord - 单条道基记录
 * @returns {number} 加成率（0~0.12）
 */
function getFoundationBonus(daoFoundationRecord) {
  if (!daoFoundationRecord || !daoFoundationRecord.bonusRate) return 0
  return daoFoundationRecord.bonusRate
}

/**
 * 获取所有境界道基汇总
 * @param {object} daoFoundations - 用户道基汇总对象 { lianqi: {...}, zhuji: {...}, ... }
 * @returns {object} { totalBonus, records, best }
 */
function getFoundationSummary(daoFoundations) {
  var df = daoFoundations || {}
  var totalBonus = 0
  var records = []
  var best = null

  var realmIds = ['lianqi', 'zhuji', 'jindan', 'yuanying']
  for (var i = 0; i < realmIds.length; i++) {
    var r = df[realmIds[i]]
    if (r && r.gradeId) {
      totalBonus += r.bonusRate || 0
      records.push(r)
      if (!best || r.bonusRate > best.bonusRate) {
        best = r
      }
    }
  }

  return {
    totalBonus: Math.round(totalBonus * 10000) / 10000,
    totalBonusDisplay: Math.round(totalBonus * 100) + '%',
    records: records,
    best: best,
    count: records.length
  }
}

/**
 * 生成道基品质的显示描述
 * @param {object} foundationRecord
 * @returns {object}
 */
function getFoundationDisplay(foundationRecord) {
  if (!foundationRecord || !foundationRecord.gradeId) {
    return { text: '暂无记录', color: '#9ca3af', icon: '—' }
  }
  var grade = DAO_FOUNDATION_GRADE[foundationRecord.gradeId.toUpperCase()]
  if (!grade) {
    var gradeKey = Object.keys(DAO_FOUNDATION_GRADE).find(function(k) {
      return DAO_FOUNDATION_GRADE[k].id === foundationRecord.gradeId
    })
    grade = gradeKey ? DAO_FOUNDATION_GRADE[gradeKey] : null
  }
  if (!grade) return { text: foundationRecord.gradeName || '未知', color: '#9ca3af', icon: '—' }
  return {
    text: grade.name,
    color: grade.color,
    icon: grade.id === 'xian' ? '🌟' : (grade.id === 'ji' ? '💎' : (grade.id === 'shang' ? '⭐' : '✓')),
    bonusDisplay: '+' + Math.round(grade.bonusRate * 100) + '%'
  }
}

module.exports = {
  DAO_FOUNDATION_GRADE,
  calcDaoFoundation,
  getFoundationBonus,
  getFoundationSummary,
  getFoundationDisplay
}
