var app = getApp()
var lifeTemplate = require('../../../utils/life-template.js')

Page({
  data: {
    publishedList: [],
    stats: { publishedCount: 0, totalViews: 0, totalLikes: 0, totalFavs: 0, totalImports: 0 },
    activeTab: 'published', // 'published' | 'comments' | 'blacklist'
    loading: false
  },

  onShow: function() {
    this.loadPublished()
    this.loadStats()
  },

  /** 从云端加载我发布的模板 */
  loadPublished: function() {
    var that = this
    this.setData({ loading: true })

    if (!lifeTemplate.getMyPublished) {
      // 降级：本地读取
      var publicLocal = lifeTemplate.getPublicTemplates ? lifeTemplate.getPublicTemplates() : []
      var userId = (app.globalData && app.globalData.userId) || ''
      var published = publicLocal.filter(function(t) {
        return t.creatorId === userId || t.shareCode
      })
      this.setData({ publishedList: published, loading: false })
      return
    }

    lifeTemplate.getMyPublished(1, 50).then(function(res) {
      var list = res.templates || []
      that.setData({ publishedList: list, loading: false })
    }).catch(function() {
      // 降级
      var publicLocal = lifeTemplate.getPublicTemplates ? lifeTemplate.getPublicTemplates() : []
      var userId2 = (app.globalData && app.globalData.userId) || ''
      var published = publicLocal.filter(function(t) {
        return t.creatorId === userId2 || t.shareCode
      })
      that.setData({ publishedList: published, loading: false })
    })
  },

  /** 从云端加载统计数据 */
  loadStats: function() {
    var that = this
    if (!lifeTemplate.getCreatorStats) return

    lifeTemplate.getCreatorStats().then(function(res) {
      var s = res.stats || {}
      that.setData({
        stats: {
          publishedCount: s.publishedCount || 0,
          totalViews: s.totalViews || 0,
          totalLikes: s.totalLikes || 0,
          totalFavs: s.totalFavs || 0,
          totalImports: s.totalImports || 0
        }
      })
    }).catch(function() {
      // 降级：从本地列表计算
      var list = that.data.publishedList
      var s = { publishedCount: list.length, totalViews: 0, totalLikes: 0, totalFavs: 0, totalImports: 0 }
      list.forEach(function(t) {
        s.totalViews += (t.viewCount || 0)
        s.totalLikes += (t.likeCount || 0)
        s.totalFavs += (t.favCount || 0)
        s.totalImports += (t.importCount || 0)
      })
      that.setData({ stats: s })
    })
  },

  /** 编辑模板 */
  editTemplate: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageC/pages/template-builder/template-builder?id=' + id })
  },

  /** 下架模板（云端） */
  unpublishTemplate: function(e) {
    var templateId = e.currentTarget.dataset.id
    var that = this
    wx.showModal({
      title: '下架确认',
      content: '下架后其他道友将无法在广场浏览此道则，确定？',
      success: function(res) {
        if (!res.confirm) return

        if (lifeTemplate.unpublishTemplateCloud) {
          wx.showLoading({ title: '下架中...' })
          lifeTemplate.unpublishTemplateCloud(templateId).then(function() {
            wx.hideLoading()
            that.loadPublished()
            that.loadStats()
            app.showSystemToast('已下架')
          }).catch(function() {
            wx.hideLoading()
            that.localUnpublish(templateId)
          })
        } else {
          that.localUnpublish(templateId)
        }
      }
    })
  },

  /** 删除模板（彻底删除） */
  deleteTemplate: function(e) {
    var templateId = e.currentTarget.dataset.id
    var that = this
    wx.showModal({
      title: '删除确认',
      content: '删除后将彻底移除模板及所有互动数据，不可恢复！确定？',
      success: function(res) {
        if (!res.confirm) return

        if (lifeTemplate.deleteTemplateCloud) {
          wx.showLoading({ title: '删除中...' })
          lifeTemplate.deleteTemplateCloud(templateId).then(function() {
            wx.hideLoading()
            that.loadPublished()
            that.loadStats()
            app.showSystemToast('模板已删除')
          }).catch(function() {
            wx.hideLoading()
            app.showSystemToast('删除失败')
          })
        } else {
          that.localUnpublish(templateId)
        }
      }
    })
  },

  /** 本地降级下架 */
  localUnpublish: function(templateId) {
    var publicList = lifeTemplate.getPublicTemplates ? lifeTemplate.getPublicTemplates() : []
    var newList = publicList.filter(function(t) { return t.id !== templateId && t.sourceId !== templateId })
    wx.setStorageSync('tiandao_public_templates', newList)
    this.loadPublished()
    this.loadStats()
    app.showSystemToast('已下架')
  },

  // ==================== 黑白名单管理 ====================
  /** 添加黑名单用户（针对自己发布的模板） */
  addToBlacklist: function() {
    var that = this
    wx.showModal({
      title: '添加黑名单',
      editable: true,
      placeholderText: '输入道友ID',
      success: function(res) {
        if (!res.confirm || !res.content) return
        var targetUserId = res.content.trim()

        // 如果已有云端模板，添加到每个模板的黑名单
        var list = that.data.publishedList
        if (list.length === 0) {
          app.showSystemToast('暂无已发布模板')
          return
        }

        if (lifeTemplate.addToBlacklist) {
          wx.showLoading({ title: '操作中...' })
          var promises = list.map(function(t) {
            return lifeTemplate.addToBlacklist(t._id, targetUserId).catch(function() {})
          })
          Promise.all(promises).then(function() {
            wx.hideLoading()
            app.showSystemToast('已添加至所有模板的黑名单')
          })
        } else {
          // 降级为本地存储
          var blacklist = wx.getStorageSync('tiandao_blacklist') || []
          if (blacklist.indexOf(targetUserId) === -1) {
            blacklist.push(targetUserId)
            wx.setStorageSync('tiandao_blacklist', blacklist)
            app.showSystemToast('已添加')
          } else {
            app.showSystemToast('该用户已在黑名单中')
          }
        }
      }
    })
  },

  /** 切换到评论管理 */
  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  }
})
