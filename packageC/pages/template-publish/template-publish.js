var app = getApp()
var lifeTemplate = require('../../../utils/life-template.js')

Page({
  data: {
    template: null,
    templateId: '',
    visibility: 'public', // public/self/fans/whitelist
    commentPerm: 'all',   // all/fans/off
    submitting: false
  },

  onLoad: function(options) {
    var id = options.id || ''
    if (!id) {
      app.showSystemToast('未选择模板')
      return
    }
    this.setData({ templateId: id })
    this.loadTemplate()
  },

  loadTemplate: function() {
    var template = lifeTemplate.getTemplateById(this.data.templateId, lifeTemplate.getLocalCustomTemplates())
    if (!template) {
      app.showSystemToast('模板不存在')
      return
    }
    this.setData({ template: template })
  },

  // 修改可见性
  changeVisibility: function(e) {
    this.setData({ visibility: e.currentTarget.dataset.value })
  },

  // 修改评论权限
  changeCommentPerm: function(e) {
    this.setData({ commentPerm: e.currentTarget.dataset.value })
  },

  // 发布
  submitPublish: function() {
    var that = this
    var template = this.data.template
    if (!template) return

    this.setData({ submitting: true })
    wx.showLoading({ title: '发布中...' })

    // 构建发布数据
    var publishData = {
      id: template.id,
      name: template.name,
      camp: template.camp,
      cover: template.cover,
      cultivationSystem: template.cultivationSystem,
      dailyCap: template.dailyCap,
      baseScore: template.baseScore,
      realmNames: template.realmNames,
      themeClass: template.themeClass,
      category: template.category,
      goal: template.goal || '',
      subtitle: template.subtitle || '',
      description: template.description || '',
      tags: template.tags || [],
      tasks: template.tasks || [],
      founderName: template.founderName || '',
      visibility: this.data.visibility,
      commentPerm: this.data.commentPerm
    }

    // 调用云端发布
    if (lifeTemplate.publishTemplateCloud) {
      lifeTemplate.publishTemplateCloud(publishData).then(function() {
        wx.hideLoading()
        app.showSystemToast('道则已发布至广场！')
        that.setData({ submitting: false })
        wx.navigateBack()
      }).catch(function() {
        // 降级
        that.localPublish(publishData)
      })
    } else {
      this.localPublish(publishData)
    }
  },

  localPublish: function(publishData) {
    // ES5 兼容：手动合并对象
    var mergedData = {};
    var keys = Object.keys(publishData);
    for (var i = 0; i < keys.length; i++) {
      mergedData[keys[i]] = publishData[keys[i]];
    }
    mergedData.shareCode = lifeTemplate.buildShareCode(publishData.id);
    var published = lifeTemplate.publishTemplateToPlaza(mergedData)
    this.setData({ submitting: false })
    wx.hideLoading()
    if (published) {
      app.showSystemToast('已发布至本地广场', 'success')
      wx.navigateBack()
    }
  }
})
