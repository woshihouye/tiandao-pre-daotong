// 人生模板详情页：模板内容展示 + 启用模板 + 复制为我的模板
const app = getApp()
const {
  getTemplateById,
  getLocalCustomTemplates,
  resolveTemplateId,
  buildShareCode,
  fetchTemplateDetail,
  toggleLikeTemplate,
  toggleFavoriteTemplate,
  postComment,
  getComments,
  deleteComment,
  publishTemplateCloud
} = require('../../../utils/life-template.js')

const eliteModule = require('../../../utils/elite-template.js')

Page({
  data: {
    template: null,
    themeClass: 'theme-light-fixed',
    todayScore: 0,
    dailyCap: 0,
    remainScore: 0,
    realm: { name: '炼精化气', stage: 1, remaining: 33 },
    taskStates: [],
    streakDays: 0,
    buffTip: '',
    canEdit: false,
    fromPlaza: false,
    cloudSourceId: '',
    copied: false,
    // >>> 互动数据
    likeCount: 0,
    favCount: 0,
    commentCount: 0,
    importCount: 0,
    isLiked: false,
    isFavorited: false,
    creatorName: '',
    isOfficial: false,
    // >>> 评论
    comments: [],
    commentPage: 1,
    commentTotal: 0,
    commentLoading: false,
    inputComment: '',
    showCommentInput: false,
    // 精英模板
    isElite: false,
    eliteJourney: null,
    eliteProgress: 0,
    isFollowingElite: false,
    eliteTemplateData: null
  },

  onLoad(options) {
    this.applyTheme()
    this.templateId = resolveTemplateId(options.id || 'thin_muscle')
    this.setData({ fromPlaza: options.from === 'plaza', cloudSourceId: options.sourceId || options.id || '' })
    // 检测精英模板
    if (this.templateId && this.templateId.startsWith('elite_')) {
      this.loadEliteTemplate()
    } else {
      this.loadPage()
    }
  },

  onShow() {
    this.applyTheme()
    if (this.templateId) {
      if (this.templateId.startsWith('elite_')) {
        this.loadEliteTemplate()
      } else {
        this.loadPage()
      }
    }
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  loadPage() {
    try {
      const template = getTemplateById(this.templateId, getLocalCustomTemplates())
      if (!template || template.category === 'custom_entry') {
        // 云端模板兜底：广场进入的官方模板本地不存在，走云端加载模板本体
        if (this.data.fromPlaza && this.data.cloudSourceId) {
          this.loadCloudDetail(true)
          return
        }
        app.showSystemToast('模板不存在')
        return
      }

      const profile = (app.globalData && app.globalData.userProfile) || {}
      const totalCultivation = Number(profile.totalCultivation || 0)
      const stageInfo = require('../../../utils/cultivation-config.js').getCultivationStage(totalCultivation)
      const realm = { name: stageInfo.stage.name, stage: stageInfo.subStageIndex + 1, remaining: 0 }
      const todayScore = Number((app.globalData && app.globalData.todayScore) || 0)
      const dailyCap = Number(template.dailyCap || 40)
      const streakDays = Number(profile.streakDays || 0)

      let buffTip = ''
      if (template.extras && template.extras.streakBuffDays) {
        buffTip = streakDays >= template.extras.streakBuffDays
          ? `已激活「${template.extras.streakBuffName || '养颜buff'}」：日常积分+${Math.round((template.extras.streakBuffRate || 0) * 100)}%`
          : `连续修行 ${template.extras.streakBuffDays} 天可解锁「${template.extras.streakBuffName || '养颜buff'}」`
      } else if (template.extras && template.extras.streakRewardDays) {
        buffTip = `连续学习每满 ${template.extras.streakRewardDays} 天，额外 +${template.extras.streakRewardScore} 修为`
      } else if (template.extras && template.extras.weeklyPlanReward) {
        buffTip = `完成周计划可额外 +${template.extras.weeklyPlanReward} 修为`
      }

      const taskStates = (template.tasks || []).map((task) => ({ ...task }))

      this.setData({
        template,
        todayScore,
        dailyCap,
        remainScore: Math.max(0, dailyCap - todayScore),
        realm,
        taskStates,
        streakDays,
        buffTip,
        canEdit: template.category === 'custom'
      })

      wx.setNavigationBarTitle({ title: template.name || '人生模板' })

      // >>> 加载云端详情
      if (this.data.fromPlaza) {
        this.loadCloudDetail()
      }
    } catch (error) {
      console.error('加载模板详情失败', error)
      app.showSystemToast('模板加载失败')
    }
  },

  loadEliteTemplate() {
    try {
      const eliteTemplate = eliteModule.getEliteTemplate(this.templateId)
      if (!eliteTemplate) {
        app.showSystemToast('精英模板不存在')
        return
      }

      const journey = eliteModule.loadTemplateJourney()
      const isFollowing = !!(journey && journey.templateId === this.templateId)
      const progress = isFollowing ? eliteModule.calculateTemplateProgress(this.templateId, journey) : 0

      // 构建兼容现有 hero card 的 template 对象
      const template = {
        id: eliteTemplate.id,
        name: eliteTemplate.name,
        cover: eliteTemplate.eliteAvatar,
        goal: eliteTemplate.eliteIntro,
        description: eliteTemplate.eliteBio,
        category: eliteTemplate.category,
        tags: eliteTemplate.tags || []
      }

      this.setData({
        template,
        isElite: true,
        eliteTemplateData: eliteTemplate,
        eliteJourney: journey,
        eliteProgress: progress,
        isFollowingElite: isFollowing,
        isActive: false,
        todayScore: 0,
        dailyCap: 0,
        remainScore: 0
      })

      wx.setNavigationBarTitle({ title: eliteTemplate.name || '精英模板' })
    } catch (error) {
      console.error('加载精英模板失败', error)
      app.showSystemToast('模板加载失败')
    }
  },

  editTemplate() {
    wx.navigateTo({
      url: `/packageC/pages/template-builder/template-builder?id=${this.templateId}`
    })
  },

  shareTemplate() {
    this.shareTemplateV2()
  },

  // 薄肌模板可进入进阶炼体详情（兼容旧基础炼体诀页）
  openAdvanced() {
    if (this.templateId !== 'thin_muscle') return
    wx.navigateTo({
      url: '/packageA/pages/foundation-technique/foundation-technique'
    })
  },

  // >>> 加载云端模板详情（loadBody=true 时同时加载模板本体，用于广场进入的官方模板）
  loadCloudDetail: function(loadBody) {
    var that = this
    if (!fetchTemplateDetail) return
    fetchTemplateDetail(this.data.cloudSourceId).then(function(res) {
      var t = res.template
      if (loadBody && t) {
        var taskStates = (t.tasks || []).map(function(task) {
          return Object.assign({}, task)
        })
        var profile = (app.globalData && app.globalData.userProfile) || {}
        var totalCultivation = Number(profile.totalCultivation || 0)
        var stageInfo = require('../../../utils/cultivation-config.js').getCultivationStage(totalCultivation)
        var realm = { name: stageInfo.stage.name, stage: stageInfo.subStageIndex + 1, remaining: 0 }
        var todayScore = Number((app.globalData && app.globalData.todayScore) || 0)
        var dailyCap = Number(t.dailyCap || 40)
        that.setData({
          template: t,
          todayScore: todayScore,
          dailyCap: dailyCap,
          remainScore: Math.max(0, dailyCap - todayScore),
          realm: realm,
          taskStates: taskStates,
          streakDays: Number(profile.streakDays || 0),
          canEdit: false
        })
        wx.setNavigationBarTitle({ title: t.name || '人生模板' })
      }
      that.setData({
        likeCount: res.likeCount || (t && t.likeCount) || 0,
        favCount: res.favCount || (t && t.favCount) || 0,
        commentCount: res.commentCount || (t && t.commentCount) || 0,
        importCount: res.importCount || (t && t.importCount) || 0,
        isLiked: res.isLiked || false,
        isFavorited: res.isFavorited || false,
        creatorName: (t && t.creatorName) || '',
        isOfficial: !!(t && t.isOfficial)
      })
    }).catch(function() {
      if (loadBody) {
        app.showSystemToast('模板加载失败')
      }
    })
  },

  // >>> 复制云端模板为我的 daily 模板
  copyToMyTemplates: function() {
    var that = this
    var t = this.data.template
    if (!t) return
    if (this.data.copied) return
    wx.showModal({
      title: '复制为我的模板',
      content: '将「' + t.name + '」复制为你的模板？复制后可自由编辑。',
      success: function(res) {
        if (!res.confirm) return
        var daily = that.convertTasksToDaily(t)
        var uid = ((getApp().globalData && getApp().globalData.userId) || 'default')
        var list = wx.getStorageSync('tiandao_custom_templates_' + uid) || []
        var baseName = t.name || '模板'
        var exists = list.filter(function(x) { return x.name && x.name.indexOf(baseName) === 0 })
        daily.name = baseName + '（副本' + (exists.length + 1) + '）'
        list.push(daily)
        wx.setStorageSync('tiandao_custom_templates_' + uid, list)
        wx.showToast({ title: '已复制为你的模板', icon: 'success' })
        that.setData({ copied: true })
      }
    })
  },

  // >>> 云端模板 tasks → 我的 daily 模板（字段补齐：scorePerUnit/baseScore/type/isOfficial/_isMetaCard）
  convertTasksToDaily: function(t) {
    var now = Date.now()
    var activities = (t.tasks || []).map(function(task) {
      return {
        actId: 'cpy_' + task.id + '_' + now,
        activityName: task.name || '任务',
        scorePerUnit: task.scorePerUnit != null ? task.scorePerUnit : 1,
        baseScore: task.baseScore != null ? task.baseScore : 1,
        capacity: task.capacity || { value: 1, unit: '次' },
        type: task.type || 'custom',
        tabKey: task.tabKey || '',
        category: task.category || '',
        isOfficial: false,
        _isMetaCard: false
      }
    })
    return {
      id: 'custom_' + now + '_' + Math.random().toString(36).slice(2, 6),
      name: (t.name || '模板'),
      type: 'daily',
      categoryKey: '',
      timeSlots: [
        { id: 'whole', name: '全天', activities: activities }
      ],
      sourceId: t.id || '',
      sourceName: t.name || '',
      sourceType: 'cloud',
      createdAt: now,
      updatedAt: now
    }
  },

  // >>> 导入云端模板：与复制合并为同一动作
  importToMyTemplates: function() {
    this.copyToMyTemplates()
  },

  // >>> 互动：点赞
  onToggleLike: function() {
    var that = this
    if (!toggleLikeTemplate) return
    toggleLikeTemplate(this.data.cloudSourceId).then(function(res) {
      that.setData({ isLiked: res.liked, likeCount: res.likeCount })
    }).catch(function() {
      app.showSystemToast('操作失败，请稍后再试')
    })
  },

  // >>> 互动：收藏
  onToggleFav: function() {
    var that = this
    if (!toggleFavoriteTemplate) return
    toggleFavoriteTemplate(this.data.cloudSourceId).then(function(res) {
      that.setData({ isFavorited: res.favorited, favCount: res.favCount })
      app.showSystemToast(res.favorited ? '已收藏' : '已取消收藏', 'success')
    }).catch(function() {
      app.showSystemToast('操作失败，请稍后再试')
    })
  },

  // >>> 互动：评论 - 打开输入框
  onOpenCommentInput: function() {
    this.setData({ showCommentInput: !this.data.showCommentInput, inputComment: '' })
    if (!this.data.comments.length) this.loadComments()
  },

  // >>> 互动：评论 - 输入
  onInputComment: function(e) {
    this.setData({ inputComment: e.detail.value })
  },

  // >>> 互动：评论 - 发送
  onSubmitComment: function() {
    var content = (this.data.inputComment || '').trim()
    if (!content) return
    if (content.length > 500) {
      app.showSystemToast('评论最多500字')
      return
    }
    var that = this
    if (!postComment) return
    postComment(this.data.cloudSourceId, content).then(function(res) {
      var comment = res.comment
      // 插入到列表头部
      var newComments = [comment].concat(that.data.comments)
      that.setData({
        comments: newComments,
        commentCount: (that.data.commentCount || 0) + 1,
        showCommentInput: false,
        inputComment: ''
      })
      app.showSystemToast('评论已发表')
    }).catch(function() {
      app.showSystemToast('发表失败')
    })
  },

  // >>> 互动：评论 - 加载列表
  loadComments: function() {
    var that = this
    if (this.data.commentLoading) return
    this.setData({ commentLoading: true })
    if (!getComments) { this.setData({ commentLoading: false }); return }
    getComments(this.data.cloudSourceId, 1, 20).then(function(res) {
      that.setData({ comments: res.comments || [], commentTotal: res.total || 0, commentLoading: false })
    }).catch(function() {
      that.setData({ commentLoading: false })
    })
  },

  // >>> 互动：评论 - 删除
  onDeleteComment: function(e) {
    var commentId = e.currentTarget.dataset.id
    var that = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: function(modalRes) {
        if (!modalRes.confirm) return
        if (!deleteComment) return
        deleteComment(commentId).then(function() {
          var newComments = that.data.comments.filter(function(c) { return c._id !== commentId })
          that.setData({ comments: newComments, commentCount: Math.max(0, (that.data.commentCount || 1) - 1) })
        }).catch(function() {
          app.showSystemToast('删除失败')
        })
      }
    })
  },

  // >>> 社交：发布到广场（修改现有 shareTemplate 方法）
  shareTemplateV2: function() {
    var template = this.data.template
    if (!template) return
    if (!publishTemplateCloud) {
      // 降级为本地分享
      wx.navigateTo({
        url: '/packageC/pages/template-share/template-share?code=' + (template.shareCode || buildShareCode(template.id)) + '&mode=share'
      })
      return
    }
    var that = this
    wx.showLoading({ title: '发布中...' })
    publishTemplateCloud(template).then(function() {
      wx.hideLoading()
      app.showSystemToast('道则已发布至广场！', 'success')
    }).catch(function() {
      wx.hideLoading()
      app.showSystemToast('发布失败，请稍后再试')
    })
  },

  // >>> 精英模板：追随并开始修炼
  adoptEliteTemplate() {
    const templateId = this.templateId
    if (!templateId) return

    const journey = eliteModule.initTemplateJourney(templateId)
    eliteModule.saveTemplateJourney(journey)

    if (app.emitAppEvent) {
      app.emitAppEvent('elite-journey-changed', { templateId, journey })
    }

    app.showSystemToast('道心已定，开始追随精英的足迹！', 'success')

    wx.navigateTo({
      url: '/packageA/pages/elite-journey/elite-journey?templateId=' + templateId
    })
  },

  // >>> 精英模板：进入修炼之路
  goToEliteJourney() {
    wx.navigateTo({
      url: '/packageA/pages/elite-journey/elite-journey?templateId=' + this.templateId
    })
  }
})
