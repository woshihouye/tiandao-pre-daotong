// ============================================================
// 天道修行 v4.0 — 成长可视化数据引擎
//
// 输出：
//   1. 分层进度条数据（初期→中期→后期→圆满）
//   2. 修炼天梯图数据（道标随境界提升）
//   3. 属性雷达图数据（五维能力）
// ============================================================

/**
 * 构建分层进度条数据
 * 每个大境界拆分为「初期→中期→后期→圆满」4个小阶段
 *
 * @param {object} realmInfo - 境界信息 { realmId, realmName, currentStage, perStage, totalScore }
 * @returns {object} { substages: [{ label, progress, filled, color }], overallProgress, currentStageLabel }
 */
function buildLayeredProgress(realmInfo) {
  var info = realmInfo || {}
  var realmId = info.realmId || 'lianqi'
  var currentStage = info.currentStage || 0     // 0~8 (9子阶)
  var perStage = info.perStage || 100

  var SUBSTAGE_NAMES = ['初期', '中期', '后期', '圆满']
  var realmColors = {
    lianqi: ['#86efac', '#4ade80', '#22c55e', '#16a34a'],
    zhuji: ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'],
    jindan: ['#fde047', '#facc15', '#eab308', '#ca8a04'],
    yuanying: ['#f0abfc', '#e879f9', '#d946ef', '#c026d3']
  }
  var colors = realmColors[realmId] || realmColors['lianqi']

  // 每大境界4小阶段，每小阶段跨2个子阶+（9/4 ≈ 2.25）
  var subStageCount = 4  // 初期/中期/后期/圆满
  var stagesPerSub = 9 / subStageCount  // 2.25

  var substages = []
  for (var i = 0; i < subStageCount; i++) {
    var substageStart = i * stagesPerSub
    var substageEnd = (i + 1) * stagesPerSub
    var progress
    if (currentStage >= substageEnd) {
      progress = 1.0
    } else if (currentStage <= substageStart) {
      progress = 0
    } else {
      progress = (currentStage - substageStart) / stagesPerSub
    }
    substages.push({
      label: SUBSTAGE_NAMES[i],
      index: i,
      progress: Math.round(progress * 100) / 100,
      filled: progress >= 1.0,
      color: colors[i] || '#22c55e',
      isCurrent: currentStage >= substageStart && currentStage <= substageEnd
    })
  }

  // 整体境界进度 (0~1)
  var overallProgress = Math.min(1.0, currentStage / 9)

  return {
    substages: substages,
    overallProgress: Math.round(overallProgress * 100) / 100,
    currentStageLabel: SUBSTAGE_NAMES[Math.min(subStageCount - 1, Math.floor(currentStage / stagesPerSub))] || '初期'
  }
}

/**
 * 构建修炼天梯图数据
 *
 * @param {Array} historyScores - [{ date, score, realmId, stage }]
 * @param {number} totalScore - 当前总修为
 * @returns {object} { ladderPoints: [{x, y, label, event}], currentPosition, maxScore }
 */
function buildCultivationLadder(historyScores, totalScore) {
  var scores = historyScores || []
  if (!scores.length) {
    return { ladderPoints: [], currentPosition: { x: 0, y: 0 }, maxScore: totalScore || 0 }
  }

  var maxScore = Math.max(totalScore || 0, scores[scores.length - 1] ? scores[scores.length - 1].score : 0)
  var points = []

  // 每个记录点映射为天梯上的一个坐标
  for (var i = 0; i < scores.length; i++) {
    var s = scores[i]
    points.push({
      date: s.date,
      score: s.score,
      realmName: s.realmName || '',
      stage: s.stage || 0,
      x: i,
      y: s.score,
      label: s.realmName || '',
      event: s.event || null
    })
  }

  return {
    ladderPoints: points,
    currentPosition: {
      x: points.length - 1,
      y: totalScore || 0
    },
    maxScore: maxScore,
    trend: calculateTrend(points)
  }
}

function calculateTrend(points) {
  if (points.length < 2) return 'stable'
  var recent = points.slice(-7) // 最近7个点
  var first = recent[0], last = recent[recent.length - 1]
  if (!first || !last) return 'stable'
  var growth = (last.score - first.score) / Math.max(1, recent.length)
  if (growth > 5) return 'rising'
  if (growth < -5) return 'falling'
  return 'stable'
}

/**
 * 构建属性雷达图数据（五维能力）
 *
 * @param {object} userStats - 用户统计数据
 * @returns {Array} [{dimension, name, value, maxValue, color}]
 */
function buildAttributeRadar(userStats) {
  var s = userStats || {}
  var dimensions = [
    {
      key: 'sport',
      name: '武力',
      icon: '⚔️',
      color: '#ef4444',
      value: normalizeDimension(s.sportScore, s.totalDays, 200)
    },
    {
      key: 'diet',
      name: '食力',
      icon: '🍽️',
      color: '#22c55e',
      value: normalizeDimension(s.dietScore, s.totalDays, 100)
    },
    {
      key: 'study',
      name: '悟力',
      icon: '📖',
      color: '#3b82f6',
      value: normalizeDimension(s.studyScore, s.totalDays, 150)
    },
    {
      key: 'work',
      name: '工力',
      icon: '⚒️',
      color: '#8b5cf6',
      value: normalizeDimension(s.workScore, s.totalDays, 150)
    },
    {
      key: 'spirit',
      name: '道心',
      icon: '💫',
      color: '#f59e0b',
      value: normalizeDimension(s.streakDays || 0, 30, 30)
    }
  ]

  var maxVal = Math.max.apply(null, dimensions.map(function(d) { return d.value })) || 100
  return dimensions.map(function(d) {
    return {
      key: d.key,
      name: d.name,
      icon: d.icon,
      color: d.color,
      value: d.value,
      maxValue: maxVal,
      ratio: maxVal > 0 ? Math.round(d.value / maxVal * 100) / 100 : 0
    }
  })
}

function normalizeDimension(value, days, maxCap) {
  var v = value || 0
  var d = Math.max(1, days || 1)
  // 日均值 * 权重
  var daily = Math.min(v / d, maxCap)
  return Math.round(daily * 10) / 10
}

/**
 * 构建成长时间线
 *
 * @param {Array} records - [{ date, category, score, name }]
 * @returns {Array} [{ date, events: [{ time, category, name, score }] }]
 */
function buildGrowthTimeline(records) {
  if (!records || !records.length) return []

  // 按日期分组
  var groups = {}
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    var dateKey = typeof r.date === 'string' ? r.date : new Date(r.createTime || r.date).toDateString()
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(r)
  }

  // 排序并格式化
  var dates = Object.keys(groups).sort()
  return dates.map(function(d) {
    return {
      date: d,
      dateDisplay: d,
      events: groups[d].map(function(r) {
        return {
          category: r.category,
          name: r.name || '',
          score: r.score || 0,
          icon: getCategoryIcon(r.category)
        }
      })
    }
  })
}

function getCategoryIcon(category) {
  var icons = { sport: '⚔️', diet: '🍽️', study: '📖', work: '⚒️', debuff: '😈' }
  return icons[category] || '✨'
}

module.exports = {
  buildLayeredProgress,
  buildCultivationLadder,
  buildAttributeRadar,
  buildGrowthTimeline
}
