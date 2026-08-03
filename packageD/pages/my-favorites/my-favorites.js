var app = getApp()
var lifeTemplate = require('../../../utils/life-template.js')

Page({
  data: {
    templates: [],
    loading: false
  },

  onShow: function() {
    this.loadFavorites()
  },

  loadFavorites: function() {
    var that = this
    this.setData({ loading: true })

    if (!lifeTemplate.getMyFavorites) {
      // 降级：本地缓存
      var local = wx.getStorageSync('tiandao_template_fav_local') || []
      this.setData({ templates: local, loading: false })
      return
    }

    lifeTemplate.getMyFavorites().then(function(res) {
      // 云函数返回 { ok, templates, total, hasMore }
      var list = res.templates || res.favorites || res.data || []
      that.setData({ templates: list, loading: false })
    }).catch(function() {
      // 降级为本地
      var local = wx.getStorageSync('tiandao_template_fav_local') || []
      that.setData({ templates: local, loading: false })
    })
  },

  removeFavorite: function(e) {
    var templateId = e.currentTarget.dataset.id
    var that = this
    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏吗？',
      success: function(res) {
        if (!res.confirm) return
        if (!lifeTemplate.toggleFavoriteTemplate) return
        lifeTemplate.toggleFavoriteTemplate(templateId).then(function(result) {
          var newList = that.data.templates.filter(function(t) {
            return t._id !== templateId && t.id !== templateId && t.templateId !== templateId
          })
          that.setData({ templates: newList })
          app.showSystemToast('已取消收藏')
        }).catch(function() {
          app.showSystemToast('操作失败')
        })
      }
    })
  },

  importTemplate: function(e) {
    var template = e.currentTarget.dataset.template
    if (!template) return
    var id = template.templateId || template.id || template._id
    wx.navigateTo({
      url: '/packageC/pages/template-detail/template-detail?id=' + id + '&from=plaza'
    })
  }
})
