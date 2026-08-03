// 大道详情子页面
var app = getApp()
var { getTemplateById, getGongfaByGrandDao } = require('../../../utils/life-template.js')

Page({
  data: {
    dao: null,
    gongfaList: [],
    themeClass: 'theme-light-fixed'
  },

  onLoad: function(options) {
    var id = options.id || ''
    if (!id) {
      wx.navigateBack()
      return
    }
    this.loadDaoData(id)
  },

  onShow: function() {
    var tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  loadDaoData: function(id) {
    var dao = getTemplateById(id)
    if (!dao) {
      wx.showToast({ title: '大道未找到', icon: 'none' })
      wx.navigateBack()
      return
    }

    var gongfaList = getGongfaByGrandDao(id)

    this.setData({
      dao: dao,
      gongfaList: gongfaList
    })

    // 动态设置导航栏标题
    wx.setNavigationBarTitle({ title: dao.name || '大道详情' })
  },

  /** 点击功法卡片 → 进入模板详情页 */
  openGongfa: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageC/pages/template-detail/template-detail?id=' + id })
  }
})
