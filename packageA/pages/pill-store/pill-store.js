var pill = require('../../../utils/pill-system.js')
Page({
  data: { pills: [] },
  onShow() { this.setData({ pills: pill.getPillSummary() }) },
  onUseTap(e) {
    var pillId = e.currentTarget.dataset.id
    var res = pill.usePill(pillId)
    if (res.success) {
      wx.showToast({ title: '已使用' + res.pillName, icon: 'success' })
      try { getApp().emitAppEvent('pill-used', { pillId, effect: res.effect }) } catch(e){}
      this.setData({ pills: pill.getPillSummary() })
    } else {
      wx.showToast({ title: res.reason || '使用失败', icon: 'none' })
    }
  }
})
