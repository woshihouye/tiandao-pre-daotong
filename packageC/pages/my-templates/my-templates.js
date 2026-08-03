// 我的模板 — 已选模板完成度
var app = getApp()
var { getTemplateById, getLocalCustomTemplates, getTemplateRealmByScore } = require('../../../utils/life-template.js')

Page({
  data: {
    themeClass: 'theme-light-fixed',
    totalCultivation: 0,
    mainTemplate: null,
    sideTemplates: [],
    mainRealm: null,
    mainDetail: null,
    sideDetails: [],
    starIndexes: [0, 1, 2, 3, 4],
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
    var that = this
    var profile = (app.globalData && app.globalData.userProfile) || {}
    var totalCultivation = Number(profile.totalCultivation || 0)

    var mainSnap = app.getMainTemplate ? app.getMainTemplate() : null
    var sideSnaps = app.getSideTemplates ? app.getSideTemplates() : []
    var customs = getLocalCustomTemplates()

    // 主修模板
    var mainTemplate = null
    var mainRealm = null
    var mainDetail = null

    if (mainSnap && mainSnap.id) {
      mainTemplate = getTemplateById(mainSnap.id, customs) || mainSnap
      if (mainTemplate.realmNames && mainTemplate.realmNames.length) {
        mainRealm = getTemplateRealmByScore(totalCultivation, mainTemplate.realmNames, mainTemplate.baseScore || 38) || null
      }
      var mlv = Math.max(1, Math.min(5, mainSnap.level || (mainTemplate.level || 1)))
      mainDetail = {
        name: mainTemplate.name || '未知道则',
        cover: mainTemplate.cover || '道',
        goal: mainTemplate.goal || '',
        description: mainTemplate.description || '',
        realmNames: mainTemplate.realmNames || [],
        dailyCap: mainTemplate.dailyCap || 40,
        baseScore: mainTemplate.baseScore || 38,
        taskCount: (mainTemplate.tasks || []).length,
        level: mlv,
        levelPct: mlv * 20,
        tags: mainTemplate.tags || [],
        category: mainTemplate.category || '',
        industry: mainTemplate.industry || '',
        subcategory: mainTemplate.subcategory || '',
        camp: 'main'
      }
    }

    // 辅修模板
    var sideDetails = []
    for (var i = 0; i < sideSnaps.length; i++) {
      var snap = sideSnaps[i]
      if (!snap || !snap.id) continue
      var full = getTemplateById(snap.id, customs)
      var tmpl = full || snap
      var lv = Math.max(1, Math.min(5, snap.level || (tmpl.level || 1)))
      var realm = null
      if (tmpl.realmNames && tmpl.realmNames.length) {
        realm = getTemplateRealmByScore(totalCultivation, tmpl.realmNames, tmpl.baseScore || 38) || null
      }
      var realmStage = realm ? realm.stage : 1
      sideDetails.push({
        id: snap.id,
        name: tmpl.name || '未知道则',
        cover: tmpl.cover || '道',
        goal: tmpl.goal || '',
        description: tmpl.description || '',
        realm: realm,
        realmNames: tmpl.realmNames || [],
        realmDescs: tmpl.realmDescs || [],
        realmPct: Math.min(100, Math.round((realmStage / 9) * 100)),
        dailyCap: tmpl.dailyCap || 40,
        baseScore: tmpl.baseScore || 38,
        taskCount: (tmpl.tasks || []).length,
        level: lv,
        levelPct: lv * 20,
        tags: tmpl.tags || [],
        category: tmpl.category || '',
        industry: tmpl.industry || '',
        subcategory: tmpl.subcategory || '',
        camp: 'side'
      })
    }

    var isEmpty = !mainDetail && sideDetails.length === 0

    that.setData({
      totalCultivation: totalCultivation,
      mainTemplate: mainTemplate,
      mainRealm: mainRealm,
      mainDetail: mainDetail,
      sideDetails: sideDetails,
      isEmpty: isEmpty
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
