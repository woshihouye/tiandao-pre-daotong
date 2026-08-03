// 人生模板详情页：任务打卡 + 启用模板 + addScore 结算
const app = getApp()
const {
  getTemplateById,
  getLocalCustomTemplates,
  settleTemplateTaskReward,
  calcTemplateExtraReward,
  getTemplateRealmByScore,
  resolveTemplateId,
  buildShareCode,
  publishTemplateToPlaza,
  fetchTemplateDetail,
  importCloudTemplate,
  toggleLikeTemplate,
  toggleFavoriteTemplate,
  postComment,
  getComments,
  deleteComment,
  publishTemplateCloud
} = require('../../../utils/life-template.js')

const eliteModule = require('../../../utils/elite-template.js')

const CHECKIN_STORAGE = 'tiandao_template_checkin'

function getTodayDate() {
  return app.getTodayDate ? app.getTodayDate() : new Date().toISOString().slice(0, 10)
}

Page({
  data: {
    template: null,
    themeClass: 'theme-light-fixed',
    isActive: false,
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
        app.showSystemToast('模板不存在')
        return
      }

      const current = app.getCurrentTemplate ? app.getCurrentTemplate() : null
      const isActive = !!(current && current.id === template.id)
      const profile = (app.globalData && app.globalData.userProfile) || {}
      const totalCultivation = Number(profile.totalCultivation || 0)
      const realm = getTemplateRealmByScore(totalCultivation, template.realmNames)
      const checkin = this.readTodayCheckin(template.id)
      const todayScore = Number(checkin.totalScore || 0)
      const dailyCap = Number(template.dailyCap || 40)
      const streakDays = Number(profile.streakDays || checkin.streakDays || 0)

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

      const doneMap = checkin.tasks || {}
      const taskStates = (template.tasks || []).map((task) => ({
        ...task,
        done: !!doneMap[task.id]
      }))

      this.setData({
        template,
        isActive,
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

  readTodayCheckin(templateId) {
    try {
      const all = wx.getStorageSync(CHECKIN_STORAGE) || {}
      const today = getTodayDate()
      const key = `${templateId}_${today}`
      return all[key] || { date: today, tasks: {}, totalScore: 0 }
    } catch (error) {
      return { date: getTodayDate(), tasks: {}, totalScore: 0 }
    }
  },

  writeTodayCheckin(templateId, data) {
    try {
      const all = wx.getStorageSync(CHECKIN_STORAGE) || {}
      const today = getTodayDate()
      all[`${templateId}_${today}`] = { ...data, date: today }
      wx.setStorageSync(CHECKIN_STORAGE, all)
    } catch (error) {
      console.error('写入打卡缓存失败', error)
    }
  },

  async activateTemplate() {
    const template = this.data.template
    if (!template) return
    try {
      await app.switchLifeTemplate(template, { syncSystem: true })
      app.showSystemToast(`已启用「${template.name}」并同步修炼体系`, 'success')
      this.loadPage()
    } catch (error) {
      console.error(error)
      app.showSystemToast('启用模板失败')
    }
  },

  // >>> 任务打卡：统一走 addScore
  async completeTask(e) {
    const taskId = e.currentTarget.dataset.id
    const template = this.data.template
    const task = (template.tasks || []).find((item) => item.id === taskId)
    if (!template || !task) return

    const checkin = this.readTodayCheckin(template.id)
    if (checkin.tasks && checkin.tasks[taskId]) {
      app.showSystemToast('今日已完成此功课')
      return
    }

    if (!this.data.isActive) {
      const modal = await app.showSystemModal(`先启用「${template.name}」再修行？`, '启用并修行')
      if (!modal.confirm) return
      await this.activateTemplate()
    }

    try {
      const settle = settleTemplateTaskReward(template, task, {
        todayUsed: Number(checkin.totalScore || 0),
        streakDays: this.data.streakDays
      })

      if (settle.score <= 0) {
        app.showSystemToast('今日模板修为已达上限')
        return
      }

      // 积分统一走全局 addScore
      if (app.addScore) {
        await app.addScore(settle.score, { lastCheckInDate: getTodayDate() })
      }

      checkin.tasks = checkin.tasks || {}
      checkin.tasks[taskId] = true
      checkin.totalScore = Number(checkin.totalScore || 0) + settle.score
      this.writeTodayCheckin(template.id, checkin)

      // 学霸连续满7天额外奖励
      const doneCount = Object.keys(checkin.tasks).length
      const totalTasks = (template.tasks || []).length
      if (doneCount >= totalTasks && template.extras && template.extras.streakRewardDays) {
        const nextStreak = this.data.streakDays + 1
        if (nextStreak > 0 && nextStreak % template.extras.streakRewardDays === 0) {
          const extra = calcTemplateExtraReward(template, { justReachedStreakMultiple: true })
          if (extra > 0 && app.addScore) {
            await app.addScore(extra)
            app.showSystemToast(`连续修行奖励 +${extra} 修为`, 'success')
          }
        }
      }

      const tip = settle.buffApplied
        ? `功课完成 +${settle.score}（含养颜buff）`
        : `功课完成 +${settle.score} 修为`
      app.showSystemToast(tip, 'success')
      this.loadPage()
    } catch (error) {
      console.error('任务打卡失败', error)
      app.showSystemToast('修行失败，请稍后再试')
    }
  },

  // >>> 打工人：周计划奖励
  async claimWeekPlan() {
    const template = this.data.template
    if (!template || !template.extras || !template.extras.weeklyPlanReward) return
    const key = `week_plan_${template.id}_${getTodayDate().slice(0, 7)}`
    if (wx.getStorageSync(key)) {
      app.showSystemToast('本周奖励已领取')
      return
    }
    const extra = calcTemplateExtraReward(template, { weekPlanCompleted: true })
    if (extra > 0 && app.addScore) {
      await app.addScore(extra)
      wx.setStorageSync(key, true)
      app.showSystemToast(`周计划完成 +${extra} 修为`, 'success')
    }
  },

  editTemplate() {
    wx.navigateTo({
      url: `/packageC/pages/template-edit/template-edit?id=${this.templateId}`
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

  // >>> 加载云端模板详情
  loadCloudDetail: function() {
    var that = this
    if (!fetchTemplateDetail) return
    fetchTemplateDetail(this.data.cloudSourceId).then(function(res) {
      that.setData({
        likeCount: res.likeCount || (res.template && res.template.likeCount) || 0,
        favCount: res.favCount || (res.template && res.template.favCount) || 0,
        commentCount: res.commentCount || (res.template && res.template.commentCount) || 0,
        importCount: res.importCount || (res.template && res.template.importCount) || 0,
        isLiked: res.isLiked || false,
        isFavorited: res.isFavorited || false,
        creatorName: (res.template && res.template.creatorName) || '',
        isOfficial: (res.template && res.template.isOfficial) || false
      })
    }).catch(function() {})
  },

  // >>> 导入云端模板为我的辅修
  importToMyTemplates: function() {
    var that = this
    var template = this.data.template
    if (!template) return
    wx.showModal({
      title: '导入道则',
      content: '将「' + template.name + '」导入为你的辅修小道？',
      success: function(modalRes) {
        if (!modalRes.confirm) return
        var imported = importCloudTemplate(template, that.data.cloudSourceId)
        if (imported) {
          // 设为辅修
          if (app.toggleSideTemplate) {
            app.toggleSideTemplate(imported)
          }
          app.showSystemToast('「' + imported.name + '」已导入为你的辅修小道', 'success')
          // 触发事件通知其他页面刷新
          if (app.emitAppEvent) {
            app.emitAppEvent('template-imported', { template: imported })
          }
        }
      }
    })
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
