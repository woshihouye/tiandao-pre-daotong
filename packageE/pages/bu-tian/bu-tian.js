// 补天计划 · 首期官方活动宣传页
const app = getApp()

Page({
  data: {
    themeClass: 'theme-xiuxing',
    contactEmail: '2992571197@qq.com',
    showCopyTip: false
  },

  onLoad: function() {
    this.refreshTheme()

    this._themeChangedHandler = function() {
      this.refreshTheme()
    }.bind(this)
    if (app.onAppEvent) {
      app.onAppEvent('themeOverrideChanged', this._themeChangedHandler)
    }
  },

  onUnload: function() {
    if (this._themeChangedHandler && app.offAppEvent) {
      app.offAppEvent('themeOverrideChanged', this._themeChangedHandler)
    }
  },

  refreshTheme: function() {
    var themeClass = 'theme-xiuxing'
    if (app.resolveThemeClass) {
      // 尝试获取当前主题，如果没有 todayscore 就用默认
      var score = app.globalData._todayRecordsCache ? app.globalData._todayRecordsCache.score : 0
      themeClass = app.resolveThemeClass(score)
    }
    this.setData({ themeClass: themeClass })
  },

  // 复制邮箱到剪贴板
  onCopyEmail: function() {
    var that = this
    wx.setClipboardData({
      data: this.data.contactEmail,
      success: function() {
        that.setData({ showCopyTip: true })
        setTimeout(function() {
          that.setData({ showCopyTip: false })
        }, 2000)
      }
    })
  }
})
