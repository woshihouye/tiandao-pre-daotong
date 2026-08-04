var daoF = require('../../utils/dao-foundation.js')
Page({
  data: { records: [] },
  onShow() {
    var app = getApp()
    var user = app.globalData.userProfile || {}
    var founds = user.daoFoundations || {}
    var summary = daoF.getFoundationSummary(founds)
    var realmNames = { lianqi: '炼气期', zhuji: '筑基期', jindan: '金丹期', yuanying: '元婴期' }
    var records = (summary.records || []).map(function(r) {
      var disp = daoF.getFoundationDisplay(r)
      return {
        realmName: realmNames[r.realmId] || r.realmId,
        gradeName: r.gradeName || '未知',
        color: disp.color,
        icon: disp.icon,
        daysSpent: r.daysSpent,
        scoreAtBreakthrough: r.scoreAtBreakthrough || 0,
        bonusDisplay: disp.bonusDisplay
      }
    })
    this.setData({ records })
  }
})
