// 人生模板列表页 — v2 云端广场
var app = getApp()
var lifeTemplate = require('../../utils/life-template.js')
var templateConfig = require('../../utils/template-config.js')

/** 自定义模板存储 key */
var CUSTOM_TMPL_KEY = 'tiandao_custom_templates_'

Page({
  data: {
    // 云端广场
    cloudTemplates: [],
    cloudTotal: 0,
    cloudHasMore: true,
    cloudPage: 1,
    cloudLoading: false,
    cloudSortBy: 'new',
    cloudSortKey: 'new',
    cloudType: 'all',
    cloudCategory: '',
    cloudSubcategory: '',
    cloudKeyword: '',
    // 广场筛选配置（template-config.js）
    sortTabs: templateConfig.sortTabs,
    categoryTabs: templateConfig.categoryTabs,
    // 标签页切换
    activeTab: 'mytmpl', // 'mytmpl' | 'plaza'
    // 自建模板
    customTemplates: [],
    customTemplatesFiltered: [],
    customFilterType: 'all', // 'all' | 'daily' | 'weekly' | 'pool'
    hasCustomTemplates: false,
    showTypeSheet: false,
    showTemplateMenu: false,
    menuTemplate: null
  },

  onShow: function() {
    this.applyTheme()
    this.loadCustomTemplates()
    if (this.data.activeTab === 'plaza') {
      this.loadCloudTemplates(true)
    }
  },

  applyTheme: function() {
    var tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  // ==================== 自建模板 ====================

  _getCustomStorageKey: function() {
    var uid = (app.globalData && app.globalData.userId) || 'default'
    return CUSTOM_TMPL_KEY + uid
  },

  loadCustomTemplates: function() {
    var key = this._getCustomStorageKey()
    var list = []
    try { list = wx.getStorageSync(key) || [] } catch(e) {}
    this.setData({ customTemplates: list, hasCustomTemplates: list.length > 0 })
    this._filterCustomTemplates()
  },

  _filterCustomTemplates: function() {
    var list = this.data.customTemplates
    var ft = this.data.customFilterType
    if (ft === 'all') {
      this.setData({ customTemplatesFiltered: list })
    } else {
      this.setData({
        customTemplatesFiltered: list.filter(function(t) { return t.type === ft })
      })
    }
  },

  filterCustomType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({ customFilterType: type })
    this._filterCustomTemplates()
  },

  /** 弹出类型选择面板 */
  openTypeSheet: function() {
    this.setData({ showTypeSheet: true })
  },

  closeTypeSheet: function() {
    this.setData({ showTypeSheet: false })
  },

  /** 进入模板构建页 */
  goToTemplateBuilder: function(e) {
    var type = e.currentTarget.dataset.type || 'daily'
    this.setData({ showTypeSheet: false })
    wx.navigateTo({
      url: '/packageC/pages/template-builder/template-builder?type=' + type
    })
  },

  /** 编辑已有模板 */
  editCustomTemplate: function(e) {
    var id = e.currentTarget.dataset.id
    this.setData({ showTemplateMenu: false })
    wx.navigateTo({
      url: '/packageC/pages/template-builder/template-builder?id=' + id
    })
  },

  /** 启用模板 */
  enableTemplate: function(e) {
    var id = this.data.menuTemplate ? this.data.menuTemplate.id : e.currentTarget.dataset.id
    var templates = this.data.customTemplates
    var found = null
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === id) { found = templates[i]; break }
    }
    if (!found) return

    // 存储到全局
    app._activeCustomTemplate = found
    try { wx.setStorageSync('tiandao_active_custom_template', found) } catch(e) {}

    this.setData({ showTemplateMenu: false })
    wx.showToast({ title: '已启用「' + found.name + '」', icon: 'success' })
  },

  /** 删除模板 */
  deleteCustomTemplate: function() {
    var that = this
    var id = this.data.menuTemplate ? this.data.menuTemplate.id : ''
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: function(res) {
        if (!res.confirm) return
        var list = that.data.customTemplates
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) { list.splice(i, 1); break }
        }
        var key = that._getCustomStorageKey()
        try { wx.setStorageSync(key, list) } catch(e) {}
        // 如果删除的是当前启用的模板，清除
        if (app._activeCustomTemplate && app._activeCustomTemplate.id === id) {
          app._activeCustomTemplate = null
          try { wx.removeStorageSync('tiandao_active_custom_template') } catch(e) {}
        }
        that.setData({ showTemplateMenu: false, customTemplates: list, hasCustomTemplates: list.length > 0 })
        that._filterCustomTemplates()
      }
    })
  },

  /** 另存为新模板 */
  duplicateCustomTemplate: function() {
    var id = this.data.menuTemplate ? this.data.menuTemplate.id : ''
    var templates = this.data.customTemplates
    var found = null
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === id) { found = templates[i]; break }
    }
    if (!found) return
    var copy = JSON.parse(JSON.stringify(found))
    copy.id = 'ctmpl_' + Date.now()
    copy.name = (copy.name || '模板') + '（副本）'
    copy.createdAt = Date.now()
    templates.unshift(copy)
    var key = this._getCustomStorageKey()
    try { wx.setStorageSync(key, templates) } catch(e) {}
    this.setData({ showTemplateMenu: false, customTemplates: templates, hasCustomTemplates: true })
    this._filterCustomTemplates()
    wx.showToast({ title: '已另存为副本', icon: 'success' })
  },

  /** 长按/更多按钮呼出菜单 */
  showTemplateActions: function(e) {
    var id = e.currentTarget.dataset.id
    var templates = this.data.customTemplates
    var found = null
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === id) { found = templates[i]; break }
    }
    if (!found) return
    this.setData({ showTemplateMenu: true, menuTemplate: found })
  },

  closeTemplateMenu: function() {
    this.setData({ showTemplateMenu: false, menuTemplate: null })
  },

  getTemplateTypeLabel: function(type) {
    if (type === 'daily') return '日模板'
    if (type === 'weekly') return '周模板'
    if (type === 'pool') return '合道模板'
    return type
  },

  getTemplateActivityCount: function(template) {
    if (template.type === 'daily') {
      var count = 0
      var slots = template.timeSlots || []
      for (var i = 0; i < slots.length; i++) { count += (slots[i].activities || []).length }
      return count
    }
    if (template.type === 'weekly') {
      var c = 0
      var wd = template.weekData || {}
      var days = ['mon','tue','wed','thu','fri','sat','sun']
      for (var d = 0; d < days.length; d++) {
        var day = wd[days[d]] || {}
        c += (day.morning || []).length + (day.afternoon || []).length + (day.evening || []).length
      }
      return c
    }
    if (template.type === 'pool') {
      return (template.poolActivities || []).length
    }
    return 0
  },

  preventBubble: function() {},

  // >>> 标签切换
  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    if (tab !== 'mytmpl' && tab !== 'plaza') return
    this.setData({ activeTab: tab })
    if (tab === 'plaza') {
      this.loadCloudTemplates(true)
    }
  },

  // >>> 云端广场
  loadCloudTemplates: function(reset) {
    if (this.data.cloudLoading) return
    var page = reset ? 1 : this.data.cloudPage
    var that = this
    this.setData({ cloudLoading: true })

    // 先用本地 fallback
    if (!lifeTemplate.fetchCloudTemplates) {
      this.loadCloudFallback()
      return
    }

    var userId = (app.globalData && app.globalData.userId) || ''
    lifeTemplate.fetchCloudTemplates({
      type: this.data.cloudType,
      sortBy: this.data.cloudSortBy,
      category: this.data.cloudCategory || undefined,
      subcategory: this.data.cloudSubcategory || undefined,
      keyword: this.data.cloudKeyword || undefined,
      page: page,
      pageSize: 20,
      userId: userId
    }).then(function(res) {
      var list = res.templates || []
      var newList = reset ? list : that.data.cloudTemplates.concat(list)
      that.setData({
        cloudTemplates: newList,
        cloudTotal: res.total || 0,
        cloudHasMore: list.length >= 20,
        cloudPage: reset ? 1 : page,
        cloudLoading: false
      })
    }).catch(function() {
      that.loadCloudFallback()
    })
  },

  // 云端未就绪时显示空状态
  loadCloudFallback: function() {
    this.setData({
      cloudTemplates: [],
      cloudTotal: 0,
      cloudHasMore: false,
      cloudLoading: false
    })
  },

  loadMoreCloud: function() {
    if (!this.data.cloudHasMore || this.data.cloudLoading) return
    this.setData({ cloudPage: this.data.cloudPage + 1 })
    this.loadCloudTemplates(false)
  },

  changeSort: function(e) {
    var key = e.currentTarget.dataset.key
    var tab = (this.data.sortTabs || []).find(function(t) { return t.key === key })
    if (!tab) return
    this.setData({
      cloudSortKey: key,
      cloudSortBy: tab.sortBy || 'hot',
      cloudType: tab.type || 'all',
      cloudPage: 1
    })
    this.loadCloudTemplates(true)
  },

  changeCategory: function(e) {
    var cat = e.currentTarget.dataset.category
    this.setData({ cloudCategory: cat, cloudSubcategory: '', cloudPage: 1 })
    this.loadCloudTemplates(true)
  },

  onSearchInput: function(e) {
    this.data.cloudKeyword = e.detail.value
  },

  onSearchConfirm: function() {
    this.setData({ cloudPage: 1 })
    this.loadCloudTemplates(true)
  },

  // >>> 导航
  openTemplate: function(e) {
    var id = e.currentTarget.dataset.id
    if (id === 'custom') {
      wx.navigateTo({ url: '/packageC/pages/template-builder/template-builder' })
      return
    }
    wx.navigateTo({ url: '/packageC/pages/template-detail/template-detail?id=' + id })
  },

  openCloudTemplate: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageC/pages/template-detail/template-detail?id=' + id + '&from=plaza' })
  },

  openPlaza: function() {
    this.setData({ activeTab: 'plaza' })
    this.loadCloudTemplates(true)
  },

  openImport: function() {
    wx.navigateTo({ url: '/packageC/pages/template-share/template-share?mode=import' }
    )
  },

  /** 大道之行 · 活动库入口 */
  goToActivityLibrary: function() {
    wx.navigateTo({ url: '/packageC/pages/activity-library/activity-library' })
  }
})
