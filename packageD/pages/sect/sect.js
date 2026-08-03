const app = getApp()

Page({
  data: {
    themeClass: 'theme-light-fixed'
  },

  onLoad() {
    this.applyTheme()
  },

  onShow() {
    this.applyTheme()
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  }
})
