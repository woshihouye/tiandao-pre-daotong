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
  notifyTemplateImport,
} = require('../../../utils/life-template.js')

const eliteModule = require('../../../utils/elite-template.js')
var activityMeta = require('../../../utils/activity-meta.js')

// 现实价值：只对 sport/study/work 三类附加；diet/debuff 不显示（diet 营养明细已在 task.desc，debuff 负分即可）
function attachRealValue(task) {
  var rv = ''
  var capVal = task.capacity ? (Number(task.capacity.value) || 1) : 1
  var capUnit = (task.capacity && task.capacity.unit) ? task.capacity.unit : '次'
  var meta = activityMeta.getActivityMeta(task.id, task.category, {})
  if (task.category === 'sport' && meta && meta.caloriesPerUnit) {
    rv = capVal + capUnit + ' · 约' + Math.round(capVal * meta.caloriesPerUnit) + '千卡'
  } else if (task.category === 'study' && capUnit === '分钟') {
    rv = capVal + '分钟'
  } else if (task.category === 'work') {
    rv = capVal + capUnit
  }
  task.realValue = rv
}

Page({
  data: {
    template: null,
    themeClass: 'theme-light-fixed',
    todayScore: 0,
    dailyCap: 0,
    remainScore: 0,
    realm: { name: '炼精化气', stage: 1, remaining: 33 },
    taskStates: [],
    timeSlotGroups: [],
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
    creatorId: '',
    creatorAvatar: '',
    longTextContent: '',
    subtitle: '',
    slogan: '',
    imageUrls: [],
    videoUrls: [],
    externalLinks: [],
    isOfficial: false,
    // >>> 道友共创
    collaborators: [],
    version: 0,
    lastEditorId: '',
    lastEditAt: 0,
    lastEditTimeText: '',
    isDaoistCollab: false,
    showInviteDaoist: false,
    inviteDaoistList: [],
    currentUserId: '',
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

      // ==== 【单向同步】继承副本（读取时同步 + 1h 本地短路） ====
      if (template && template.inheritedFrom) {
        var that = this
        var now = Date.now()
        // 【阻塞点1】本地短路：inheritedAt 存在且距今 < 3600000（1 小时） → 跳过云端拉取
        if (template.inheritedAt != null && (now - Number(template.inheritedAt)) < 3600000) {
          that._renderLocalTemplate(template)
          // （广场来源仍可单独加载互动数据）
          if (that.data.fromPlaza) that.loadCloudDetail()
          return
        }
        // 异步拉师父新版：不阻塞首屏渲染
        that._renderLocalTemplate(template)
        if (that.data.fromPlaza) that.loadCloudDetail()
        fetchTemplateDetail(template.inheritedFrom).then(function(mr) {
          var mentorLatest = mr && mr.template
          if (!mentorLatest) return
          var mentorUpdatedAt = Number(mentorLatest.updatedAt || 0)
          var inheritedAt = Number(template.inheritedAt || 0)
          if (!(mentorUpdatedAt > inheritedAt)) return
          if (template.dirty === true) {
            // dirty=true：徒弟改了自己的副本，不自动覆盖，顶部提示
            wx.showModal({
              title: '师父更新了模板',
              content: '你的副本已有自定义改动，是否采纳师父的最新版？（采纳会覆盖你当前的修改）',
              confirmText: '采纳',
              cancelText: '忽略',
              success: function(mr2) {
                if (!mr2.confirm) return
                that._applyMentorLatest(template, mentorLatest, { keepDirty: true })
              }
            })
            return
          }
          // dirty=false：师父更新了，直接覆盖本地副本（保留 id/inheritedFrom/inheritedAt，dirty 仍 false）
          that._applyMentorLatest(template, mentorLatest, { keepDirty: false })
        }).catch(function(e) {
          console.warn('[inherit sync] 拉取师父模板失败', e && e.message)
        })
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
        timeSlotGroups: this.buildTimeSlotGroups(template),
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

  _renderLocalTemplate: function(template) {
    try {
      var profile = (app.globalData && app.globalData.userProfile) || {}
      var totalCultivation = Number(profile.totalCultivation || 0)
      var stageInfo = require('../../../utils/cultivation-config.js').getCultivationStage(totalCultivation)
      var realm = { name: stageInfo.stage.name, stage: stageInfo.subStageIndex + 1, remaining: 0 }
      var todayScore = Number((app.globalData && app.globalData.todayScore) || 0)
      var dailyCap = Number(template.dailyCap || 40)
      var streakDays = Number(profile.streakDays || 0)
      var buffTip = ''
      if (template.extras && template.extras.streakBuffDays) {
        buffTip = streakDays >= template.extras.streakBuffDays
          ? '已激活「' + (template.extras.streakBuffName || '养颜buff') + '」：日常积分+' + Math.round((template.extras.streakBuffRate || 0) * 100) + '%'
          : '连续修行 ' + template.extras.streakBuffDays + ' 天可解锁「' + (template.extras.streakBuffName || '养颜buff') + '」'
      } else if (template.extras && template.extras.streakRewardDays) {
        buffTip = '连续学习每满 ' + template.extras.streakRewardDays + ' 天，额外 +' + template.extras.streakRewardScore + ' 修为'
      } else if (template.extras && template.extras.weeklyPlanReward) {
        buffTip = '完成周计划可额外 +' + template.extras.weeklyPlanReward + ' 修为'
      }
      var taskStates = (template.tasks || []).map(function(t) { return Object.assign({}, t) })
      var col = (template.collaborators) || [];
      var lei = Number(template.lastEditAt || 0);
      var curUid = (app.globalData && app.globalData.userId) || '';
      this.setData({
        template: template,
        todayScore: todayScore,
        dailyCap: dailyCap,
        remainScore: Math.max(0, dailyCap - todayScore),
        realm: realm,
        taskStates: taskStates,
        timeSlotGroups: this.buildTimeSlotGroups(template),
        streakDays: streakDays,
        buffTip: buffTip,
        canEdit: template.category === 'custom',
        collaborators: col,
        version: Number(template.version || 0),
        lastEditorId: template.lastEditorId || '',
        lastEditAt: lei,
        lastEditTimeText: this._formatTimeAgo(lei),
        isDaoistCollab: !!(col && col.length >= 2),
        currentUserId: curUid
      })
      wx.setNavigationBarTitle({ title: template.name || '人生模板' })
    } catch(e) {
      console.error('[render local]', e && e.message)
    }
  },

  _applyMentorLatest: function(oldCopy, mentorLatest, opts) {
    opts = opts || {}
    var converted = this.convertTasksToDaily(mentorLatest)
    converted.id = oldCopy.id
    converted.inheritedFrom = oldCopy.inheritedFrom
    converted.inheritedAt = Date.now()
    converted.dirty = opts.keepDirty ? true : false
    converted.name = (oldCopy && oldCopy.name) ? oldCopy.name.replace(/·师父版$/, '') + '·师父版' : ((mentorLatest.name || '传承模板') + '·师父版')
    var uid = ((app.globalData && app.globalData.userId) || 'default')
    var key = 'tiandao_custom_templates_' + uid
    var list = []
    try { list = wx.getStorageSync(key) || [] } catch(e) {}
    var found = -1
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === converted.id) { found = i; break }
    }
    if (found >= 0) list.splice(found, 1, converted)
    else list.unshift(converted)
    try { wx.setStorageSync(key, list) } catch(e) {}
    this._renderLocalTemplate(converted)
    wx.showToast({
      title: opts.keepDirty ? '已采纳师父最新版' : '已同步师父最新版',
      icon: 'success'
    })
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
        var col = (t.collaborators) || [];
        var lei = Number(t.lastEditAt || 0);
        var curUid = (app.globalData && app.globalData.userId) || '';
        that.setData({
          template: t,
          todayScore: todayScore,
          dailyCap: dailyCap,
          remainScore: Math.max(0, dailyCap - todayScore),
          realm: realm,
          taskStates: taskStates,
          timeSlotGroups: that.buildTimeSlotGroups(t),
          streakDays: Number(profile.streakDays || 0),
          canEdit: false,
          collaborators: col,
          version: Number(t.version || 0),
          lastEditorId: t.lastEditorId || '',
          lastEditAt: lei,
          lastEditTimeText: that._formatTimeAgo(lei),
          isDaoistCollab: !!(col && col.length >= 2),
          currentUserId: curUid
        })
        wx.setNavigationBarTitle({ title: t.name || '人生模板' })
      }
      var col = (t && t.collaborators) || [];
      var lei = Number((t && t.lastEditAt) || 0);
      var curUid = (app.globalData && app.globalData.userId) || '';
      that.setData({
        likeCount: res.likeCount || (t && t.likeCount) || 0,
        favCount: res.favCount || (t && t.favCount) || 0,
        commentCount: res.commentCount || (t && t.commentCount) || 0,
        importCount: res.importCount || (t && t.importCount) || 0,
        isLiked: res.isLiked || false,
        isFavorited: res.isFavorited || false,
        creatorName: (t && t.creatorName) || '',
        creatorId: (t && t.creatorId) || '',
        creatorAvatar: (t && t.creatorAvatar) || '',
        longTextContent: (t && t.longTextContent) || '',
        subtitle: (t && t.subtitle) || '',
        slogan: (t && t.slogan) || '',
        imageUrls: (t && t.imageUrls) || [],
        videoUrls: (t && t.videoUrls) || [],
        externalLinks: (t && t.externalLinks) || [],
        isOfficial: !!(t && t.isOfficial),
        // >>> 道友共创字段
        collaborators: col,
        version: Number((t && t.version) || 0),
        lastEditorId: (t && t.lastEditorId) || '',
        lastEditAt: lei,
        lastEditTimeText: that._formatTimeAgo(lei),
        isDaoistCollab: !!(col && col.length >= 2),
        currentUserId: curUid
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
        if (that.data.fromPlaza && that.data.cloudSourceId) {
          notifyTemplateImport(that.data.cloudSourceId)
        }
        that.setData({ copied: true })
      }
    })
  },

  // 从 template.timeSlots 构建时段分组；无 timeSlots 时返回空数组（走平铺兜底）
  buildTimeSlotGroups: function(template) {
    var slots = (template && template.timeSlots) || []
    if (!slots.length) return []
    var taskMap = {}
    ;(template.tasks || []).forEach(function(t) { taskMap[t.id] = t })
    return slots.map(function(slot) {
      var acts = slot.activities || []
      return {
        slotId: slot.id,
        name: slot.name || '全天',
        startTime: slot.startTime || '',
        endTime: slot.endTime || '',
        tasks: acts.map(function(a) {
          var tk = taskMap[a.actId || a.id]
          var task = {
            id: a.actId || a.id,
            name: a.activityName || a.name || '任务',
            reward: a.reward != null ? a.reward : (tk ? tk.reward : 0),
            path: a.path || (tk ? tk.path : ''),
            desc: a.desc || (tk ? tk.desc : ''),
            capacity: a.capacity || (tk ? tk.capacity : null),
            category: a.category || (tk ? tk.category : '')
          }
          attachRealValue(task)
          return task
        })
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
    var timeSlots = (t.timeSlots && t.timeSlots.length)
      ? t.timeSlots.map(function(slot) {
          return {
            id: slot.id, name: slot.name, startTime: slot.startTime, endTime: slot.endTime,
            activities: (slot.activities || []).map(function(a) {
              return {
                actId: a.actId || a.id,
                activityName: a.activityName || a.name || '任务',
                scorePerUnit: a.scorePerUnit != null ? a.scorePerUnit : (a.reward != null ? a.reward : 1),
                baseScore: a.baseScore != null ? a.baseScore : 1,
                capacity: a.capacity || { value: 1, unit: '次' },
                type: a.type || 'custom',
                tabKey: a.tabKey || '',
                category: a.category || '',
                isOfficial: false,
                _isMetaCard: false
              }
            })
          }
        })
      : [ { id: 'whole', name: '全天', activities: activities } ]
    return {
      id: 'custom_' + now + '_' + Math.random().toString(36).slice(2, 6),
      name: (t.name || '模板'),
      type: 'daily',
      categoryKey: (activities[0] && activities[0].tabKey) || '',
      timeSlots: timeSlots,
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

  // >>> 社交：跳发布页（填富媒体 + 发布），不再直接 publishTemplateCloud
  shareTemplateV2: function() {
    var template = this.data.template
    if (!template) return
    wx.navigateTo({
      url: '/packageC/pages/template-publish/template-publish?id=' + (template.id || this.templateId)
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
  },

  goToUserHome: function(e) {
    var userId = e.currentTarget.dataset.userId
    if (userId) wx.navigateTo({ url: '/packageD/pages/user-home/user-home?userId=' + userId })
  },

  copyLink: function(e) {
    var url = e.currentTarget.dataset.url
    if (url) wx.setClipboardData({ data: url, success: function() { wx.showToast({ title: '链接已复制', icon: 'none' }) } })
  },

  // >>> 辅助：时间戳转相对文本（X 分钟前 / X 小时前 / X 天前）
  _formatTimeAgo: function(ts) {
    if (!ts) return ''
    var diff = Date.now() - Number(ts)
    if (diff < 60 * 1000) return '刚刚'
    if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' 分钟前'
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + ' 小时前'
    return Math.floor(diff / 86400000) + ' 天前'
  },

  // >>> 道友共创：打开邀请面板
  openInviteDaoist: function() {
    var that = this
    var myUid = (app.globalData && app.globalData.userId) || ''
    if (!myUid) { app.showSystemToast('未登录'); return }
    // 权限校验：仅创建者可邀请
    if (that.data.creatorId && that.data.creatorId !== myUid) { app.showSystemToast('仅模板创建者可邀请道友'); return }
    // 已超过 2 人则不允许
    if (that.data.collaborators && that.data.collaborators.length >= 2) { app.showSystemToast('共创模板最多 2 人'); return }
    // 调云函数取道友列表（用于选择）
    wx.cloud.callFunction({
      name: 'relation-manager',
      data: { action: 'getDaoists' }
    }).then(function(res) {
      var r = res.result || {}
      if (r.ok) {
        that.setData({ showInviteDaoist: true, inviteDaoistList: r.daoists || [] })
      } else {
        app.showSystemToast(r.error || '加载道友列表失败')
      }
    }).catch(function() {
      app.showSystemToast('加载道友列表失败')
    })
  },

  // >>> 道友共创：关闭邀请面板
  closeInviteDaoist: function() {
    this.setData({ showInviteDaoist: false })
  },

  // >>> 道友共创：确认邀请某位道友
  confirmInviteDaoist: function(e) {
    var that = this
    var peerId = e.currentTarget.dataset.peerId
    if (!peerId) return
    var myUid = (app.globalData && app.globalData.userId) || ''
    if (!myUid) { app.showSystemToast('未登录'); return }
    var tplId = (that.data.template && that.data.template.id) || that.data.cloudSourceId
    if (!tplId) { app.showSystemToast('模板 ID 缺失'); return }
    wx.showLoading({ title: '邀请中...', mask: true })
    wx.cloud.callFunction({
      name: 'template-manager',
      data: {
        action: 'setCollaborators',
        templateId: tplId,
        collaborators: [myUid, peerId],
        userId: myUid
      }
    }).then(function(res) {
      wx.hideLoading()
      var r = res.result || {}
      if (r.ok) {
        var nowTs = Date.now();
        that.setData({
          showInviteDaoist: false,
          collaborators: r.collaborators || [myUid, peerId],
          version: Number(r.version != null ? r.version : 0),
          lastEditorId: myUid,
          lastEditAt: nowTs,
          lastEditTimeText: that._formatTimeAgo(nowTs),
          isDaoistCollab: true
        })
        app.showSystemToast('已邀请道友共创', 'success')
      } else {
        app.showSystemToast(r.error || '邀请失败')
      }
    }).catch(function() {
      wx.hideLoading()
      app.showSystemToast('邀请失败，请稍后再试')
    })
  }
})
