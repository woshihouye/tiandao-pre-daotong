// ============================================================
// 天道修行 v4.0 — 称号分级与堆叠引擎
//
// 称号难度等级（从高到低）：
//   夯爆了(S) → 顶尖(A) → 人上人(B) → NPC(C) → 拉完了(D)
//
// 佩戴与加成规则：
//   - 夯爆了级：所有该级别称号可同时佩戴，全部加成叠加生效
//   - 顶尖级：最多同时佩戴2个，仅生效所选2个
//   - 人上人/NPC/拉完了级：每个级别仅可佩戴1个
//   - 同类型取最高生效，不同类型加成可叠加
// ============================================================

var consts = require('./constants.js')
var TITLE_TIER = consts.TITLE_TIER

/**
 * 计算用户的综合等级评分
 * @param {object} userStats - 用户统计 { totalCultivation, meritScore, templateImportCount, streakDays, ... }
 * @param {object} globalPercentiles - 全服百分位参考 { p50, p80, p95, p99 }
 * @returns {object} { tier, tierName, overallScore, dimensionGrades }
 */
function computeTitleGrade(userStats, globalPercentiles) {
  var s = userStats || {}
  var gp = globalPercentiles || {}

  // 各维度评分 (0~100)
  var powerScore = clampScore(s.totalCultivation || 0, gp.powerP50 || 1000, gp.powerP99 || 10000)
  var meritScore = clampScore(s.meritScore || 0, gp.meritP50 || 100, gp.meritP99 || 2000)
  var incenseScore = clampScore(s.templateImportCount || 0, gp.incenseP50 || 5, gp.incenseP99 || 500)

  // 综合评分：修为40% + 功德30% + 影响力30%
  var overallScore = Math.round(powerScore * 0.4 + meritScore * 0.3 + incenseScore * 0.3)

  // 判定等级
  var tier = 'D'
  if (overallScore >= 99) tier = 'S'
  else if (overallScore >= 95) tier = 'A'
  else if (overallScore >= 80) tier = 'B'
  else if (overallScore >= 50) tier = 'C'

  var tierInfo = TITLE_TIER[tier] || TITLE_TIER['D']

  return {
    tier: tier,
    tierName: tierInfo.name,
    tierColor: tierInfo.color,
    tierIcon: tierInfo.icon,
    overallScore: overallScore,
    dimensionGrades: {
      power: getDimensionGrade(powerScore),
      merit: getDimensionGrade(meritScore),
      incense: getDimensionGrade(incenseScore)
    },
    stackedBonuses: 0
  }
}

function clampScore(value, minRef, maxRef) {
  if (maxRef <= minRef) return 50
  var normalized = (value - minRef) / (maxRef - minRef)
  return Math.round(Math.max(0, Math.min(1, normalized)) * 100)
}

function getDimensionGrade(score) {
  if (score >= 99) return 'S'
  if (score >= 95) return 'A'
  if (score >= 80) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

/**
 * 应用称号堆叠规则
 * @param {Array} equippedTitles - 已佩戴的称号列表 [{ id, tier, bonusRate }]
 * @returns {object} { totalBonus, stackDetails }
 */
function applyTitleStacking(equippedTitles) {
  if (!equippedTitles || !equippedTitles.length) {
    return { totalBonus: 0, stackDetails: [] }
  }

  // 按等级分组
  var groups = { S: [], A: [], B: [], C: [], D: [] }
  for (var i = 0; i < equippedTitles.length; i++) {
    var t = equippedTitles[i]
    var tier = t.tier || 'D'
    if (!groups[tier]) groups[tier] = []
    groups[tier].push(t)
  }

  var totalBonus = 0
  var stackDetails = []

  // S级：全部叠加
  for (var j = 0; j < groups['S'].length; j++) {
    totalBonus += groups['S'][j].bonusRate || 0
  }
  if (groups['S'].length > 0) {
    stackDetails.push({ tier: 'S', count: groups['S'].length, bonus: groups['S'].reduce(function(a,b) { return a + (b.bonusRate || 0) }, 0) })
  }

  // A级：最多2个
  var aCount = Math.min(2, groups['A'].length)
  for (var k = 0; k < aCount; k++) {
    totalBonus += groups['A'][k].bonusRate || 0
  }
  if (aCount > 0) {
    stackDetails.push({ tier: 'A', count: aCount, bonus: groups['A'].slice(0, aCount).reduce(function(a,b) { return a + (b.bonusRate || 0) }, 0) })
  }

  // B/C/D级：每级1个
  ['B', 'C', 'D'].forEach(function(tier) {
    if (groups[tier].length > 0) {
      totalBonus += groups[tier][0].bonusRate || 0
      stackDetails.push({ tier: tier, count: 1, bonus: groups[tier][0].bonusRate || 0 })
    }
  })

  return {
    totalBonus: Math.round(totalBonus * 10000) / 10000,
    totalBonusDisplay: '+' + Math.round(totalBonus * 100) + '%',
    stackDetails: stackDetails
  }
}

/**
 * 获取称号等级图标
 * @param {string} tier
 * @returns {string}
 */
function getTierEmoji(tier) {
  var mapping = { 'S': '👑', 'A': '💎', 'B': '⭐', 'C': '🧑', 'D': '💤' }
  return mapping[tier] || '💤'
}

module.exports = {
  TITLE_TIER,
  computeTitleGrade,
  applyTitleStacking,
  getTierEmoji
}
