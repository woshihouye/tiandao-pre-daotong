Page({
  data: {
    success: false,
    userData: null,
    preserveRatio: 0,
    preservedScore: 0,
    resetCount: 0,
    result: null
  },
  onLoad() {
    var app = getApp()
    var up = app.globalData.userProfile || {}
    var rc = up.cultivationResetCount || 0
    var ratios = [0.50, 0.45, 0.40, 0.35, 0.30]
    var ratio = ratios[Math.min(rc, ratios.length - 1)]
    var score = up.totalCultivation || 0
    this.setData({
      userData: { totalCultivation: score, realmName: up.realmName || '炼气期', resetCount: rc },
      preserveRatio: Math.round(ratio * 100),
      preservedScore: Math.floor(score * ratio),
      resetCount: rc
    })
  },
  onCancel() { wx.navigateBack() },
  async onConfirm() {
    wx.showModal({
      title: '最终确认',
      content: '散功后将清空所有修为数据，修行完全重置。此操作不可撤销！是否继续？',
      success: async (r) => {
        if (!r.confirm) return
        wx.showLoading({ title: '散功中...' })
        try {
          var res = await wx.cloud.callFunction({ name: 'reset-cultivation', data: { reason: '主动散功' } })
          wx.hideLoading()
          if (res.result && res.result.ok) {
            this.setData({ success: true, result: {
              preservedScore: res.result.preservedScore,
              ratio: Math.round(res.result.ratio * 100),
              resetCount: res.result.resetCount
            }})
            try { getApp().emitAppEvent('reset-cultivation', res.result) } catch(e){}
          } else {
            wx.showToast({ title: res.result ? res.result.error : '散功失败', icon: 'none' })
          }
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: e.message || '散功失败', icon: 'none' })
        }
      }
    })
  },
  onBack() { wx.navigateBack() }
})
