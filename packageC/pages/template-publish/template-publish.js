var app = getApp()
var lifeTemplate = require('../../../utils/life-template.js')

Page({
  data: {
    template: null,
    templateId: '',
    visibility: 'public', // public/self/fans/whitelist
    commentPerm: 'all',   // all/fans/off
    submitting: false,
    longTextContent: '',
    subtitle: '',
    slogan: '',
    imageUrls: [],
    videoUrls: [],
    externalLinks: [],
    linkTitle: '',
    linkUrl: ''
  },

  onLoad: function(options) {
    var id = options.id || ''
    if (!id) {
      app.showSystemToast('模板不存在')
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
    this.setData({
      template: template,
      longTextContent: template.longTextContent || '',
      subtitle: template.subtitle || '',
      slogan: template.slogan || '',
      imageUrls: template.imageUrls || [],
      videoUrls: template.videoUrls || [],
      externalLinks: template.externalLinks || []
    })
  },

  // 修改可见性
  changeVisibility: function(e) {
    this.setData({ visibility: e.currentTarget.dataset.value })
  },

  // 修改评论权限
  changeCommentPerm: function(e) {
    this.setData({ commentPerm: e.currentTarget.dataset.value })
  },

  // 输入长文 / 副标题 / 金句
  onLongTextInput: function(e) { this.setData({ longTextContent: e.detail.value }) },
  onSubtitleInput: function(e) { this.setData({ subtitle: e.detail.value }) },
  onSloganInput: function(e) { this.setData({ slogan: e.detail.value }) },

  // 上传图片（最多 9 张，逐个传云存储）
  chooseImages: function() {
    var that = this
    var remain = 9 - (this.data.imageUrls || []).length
    if (remain <= 0) { wx.showToast({ title: '最多 9 张', icon: 'none' }); return }
    wx.chooseMedia({
      count: remain, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: function(res) {
        var files = res.tempFiles || []
        var uploaded = 0
        files.forEach(function(f, idx) {
          var ext = (f.tempFilePath.match(/\.\w+$/) || ['.png'])[0]
          var cloudPath = 'templates/' + Date.now() + '-' + idx + ext
          wx.cloud.uploadFile({ cloudPath: cloudPath, filePath: f.tempFilePath, success: function(r) {
            var list = that.data.imageUrls.concat([r.fileID])
            that.setData({ imageUrls: list })
            uploaded++
            if (uploaded === files.length) { wx.showToast({ title: '上传完成', icon: 'success' }) }
          }, fail: function() {
            uploaded++
            if (uploaded === files.length) { wx.showToast({ title: '部分上传失败', icon: 'none' }) }
          } })
        })
      }
    })
  },

  // 上传视频（最多 3 个）
  chooseVideos: function() {
    var that = this
    var remain = 3 - (this.data.videoUrls || []).length
    if (remain <= 0) { wx.showToast({ title: '最多 3 个视频', icon: 'none' }); return }
    wx.chooseMedia({
      count: remain, mediaType: ['video'], sourceType: ['album', 'camera'], maxDuration: 60,
      success: function(res) {
        var files = res.tempFiles || []
        files.forEach(function(f, idx) {
          var cloudPath = 'templates/video-' + Date.now() + '-' + idx + '.mp4'
          wx.cloud.uploadFile({ cloudPath: cloudPath, filePath: f.tempFilePath, success: function(r) {
            var list = that.data.videoUrls.concat([r.fileID])
            that.setData({ videoUrls: list })
          } })
        })
      }
    })
  },

  // 删除某张图片
  removeImage: function(e) {
    var idx = e.currentTarget.dataset.index
    var list = (this.data.imageUrls || []).slice()
    list.splice(idx, 1)
    this.setData({ imageUrls: list })
  },
  // 删除某个视频
  removeVideo: function(e) {
    var idx = e.currentTarget.dataset.index
    var list = (this.data.videoUrls || []).slice()
    list.splice(idx, 1)
    this.setData({ videoUrls: list })
  },

  // 添加链接（标题 + 网址）
  addLink: function() {
    var title = (this.data.linkTitle || '').trim()
    var url = (this.data.linkUrl || '').trim()
    if (!title || !url) { wx.showToast({ title: '请填链接标题和网址', icon: 'none' }); return }
    var list = (this.data.externalLinks || []).concat([{ title: title, url: url }])
    this.setData({ externalLinks: list, linkTitle: '', linkUrl: '' })
  },
  onLinkTitleInput: function(e) { this.setData({ linkTitle: e.detail.value }) },
  onLinkUrlInput: function(e) { this.setData({ linkUrl: e.detail.value }) },
  removeLink: function(e) {
    var idx = e.currentTarget.dataset.index
    var list = (this.data.externalLinks || []).slice()
    list.splice(idx, 1)
    this.setData({ externalLinks: list })
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
      description: template.description || '',
      tags: template.tags || [],
      tasks: template.tasks || [],
      founderName: template.founderName || '',
      longTextContent: this.data.longTextContent || '',
      subtitle: this.data.subtitle || '',
      slogan: this.data.slogan || '',
      imageUrls: this.data.imageUrls || [],
      videoUrls: this.data.videoUrls || [],
      externalLinks: this.data.externalLinks || [],
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
