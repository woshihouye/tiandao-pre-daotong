// 我的模板 — 自定义模板列表
var app = getApp()
var { getLocalCustomTemplates } = require('../../../utils/life-template.js')

Page({
  data: {
    themeClass: 'theme-light-fixed',
    totalCultivation: 0,
    customTemplates: [],
    isEmpty: true
  },

  onLoad: function() {
    this.applyTheme()
    this.loadData()
  },

  onShow: function() {
    this.applyTheme()
    this.loadData()
  },

  applyTheme: function() {
    var tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  loadData: function() {
    var profile = (app.globalData && app.globalData.userProfile) || {}
    var totalCultivation = Number(profile.totalCultivation || 0)
    var customTemplates = getLocalCustomTemplates()
    this.setData({
      totalCultivation: totalCultivation,
      customTemplates: customTemplates,
      isEmpty: customTemplates.length === 0
    })
  },

  goToTemplateDetail: function(e) {
    var id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: '/packageC/pages/template-detail/template-detail?id=' + id })
  },

  goToTemplates: function() {
    wx.switchTab({ url: '/pages/templates/templates' })
  }
})
