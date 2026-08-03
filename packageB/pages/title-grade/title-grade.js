var titleGrade = require('../../../utils/title-grade.js')
Page({
  data: {
    grade: null,
    overallScore: 0,
    tierName: '--',
    tierColor: '#9ca3af',
    tierIcon: '💤',
    dimensions: [],
    tiers: [
      { id: 'S', name: '夯爆了', emoji: '👑', desc: '该级别所有称号可同时佩戴，全部加成叠加生效' },
      { id: 'A', name: '顶尖', emoji: '💎', desc: '最多同时佩戴2个，生效所选称号加成' },
      { id: 'B', name: '人上人', emoji: '⭐', desc: '可佩戴1个' },
      { id: 'C', name: 'NPC', emoji: '🧑', desc: '可佩戴1个' },
      { id: 'D', name: '拉完了', emoji: '💤', desc: '可佩戴1个' }
    ]
  },
  onShow() {
    var app = getApp()
    var p = app.globalData.userProfile || {}
    var dimScores = { power: p.totalCultivation || 0, merit: p.meritScore || 0, incense: 0 }
    try { dimScores.incense = wx.getStorageSync('tiandao_template_import_count') || 0 } catch(e){}

    // v4.0 实际调用 computeTitleGrade
    var gradeResult = titleGrade.computeTitleGrade({
      totalCultivation: dimScores.power,
      meritScore: dimScores.merit,
      templateImportCount: dimScores.incense
    }, null) // globalPercentiles can be null for local fallback

    var colors = { power: '#ef4444', merit: '#22c55e', incense: '#3b82f6' }
    var dimensions = [
      { key: 'power', name: '实力', score: dimScores.power, max: Math.max(100, dimScores.power), color: colors.power },
      { key: 'merit', name: '功德', score: dimScores.merit, max: Math.max(100, dimScores.merit), color: colors.merit },
      { key: 'incense', name: '香火', score: dimScores.incense, max: Math.max(10, dimScores.incense), color: colors.incense }
    ].map(function(item) {
      var pct = item.max > 0 ? Math.min(100, Math.round(item.score / item.max * 100)) : 0
      return { key: item.key, name: item.name, score: item.score, barWidth: pct + '%', barColor: item.color }
    })

    this.setData({
      grade: gradeResult,
      overallScore: gradeResult.overallScore,
      tierName: gradeResult.tierName,
      tierColor: gradeResult.tierColor,
      tierIcon: gradeResult.tierIcon,
      dimensions: dimensions
    })
  }
})
