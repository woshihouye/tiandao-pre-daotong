// 更新日志页逻辑 - v2.1.0
var app = getApp()

Page({
  data: {
    themeClass: 'theme-dusk'
  },

  onShow: function() {
    var that = this
    app.waitForInit ? app.waitForInit().then(function() {
      that.refreshTheme()
    }) : that.refreshTheme()

    if (!this._themeChangedHandler) {
      this._themeChangedHandler = function(payload) {
        that.refreshTheme()
      }
      if (app.onAppEvent) {
        app.onAppEvent('themeOverrideChanged', this._themeChangedHandler)
      }
    }
  },

  onUnload: function() {
    if (this._themeChangedHandler && app.offAppEvent) {
      app.offAppEvent('themeOverrideChanged', this._themeChangedHandler)
    }
  },

  refreshTheme: function() {
    var appInstance = getApp()
    var score = appInstance.getTodayScore ? appInstance.getTodayScore() : 0
    if (score && score.then) {
      var that = this
      score.then(function(v) {
        var themeClass = appInstance.resolveThemeClass ? appInstance.resolveThemeClass(v) : 'theme-hongchen'
        that.setData({ themeClass: themeClass })
      })
    } else {
      var themeClass = appInstance.resolveThemeClass ? appInstance.resolveThemeClass(score) : 'theme-hongchen'
      this.setData({ themeClass: themeClass })
    }
  },

  onShareAppMessage: function() {
    return {
      title: '天道修行 v2.1.0 — 量化修行 · 以身证道',
      path: '/pages/index/index'
    }
  }
})
