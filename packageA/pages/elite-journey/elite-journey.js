// ============================================================
// 修炼之路 - 精英追随系统核心页面
// 用户追随精英人生模板的视觉成长旅程
// 玄幻小说「系统」叙事体验
// ============================================================

var app = getApp()

var eliteModule = require('../../../utils/elite-template.js')
var constants = require('../../../utils/constants.js')

// 系统消息等级对应的图标和颜色
var SYSTEM_LEVEL_MAP = {
  info: { icon: '◇', color: '#60a5fa', label: '系统待命' },
  progress: { icon: '◎', color: '#34d399', label: '修炼进行中' },
  milestone: { icon: '◆', color: '#fbbf24', label: '里程碑触发' },
  breakthrough: { icon: '✦', color: '#f472b6', label: '道心稳固' },
  glory: { icon: '★', color: '#c084fc', label: '大成在即' }
}

// 分类图标映射
var CATEGORY_ICON_MAP = {
  sport: '🏃',
  work: '💼',
  study: '📖',
  diet: '🍱',
  other: '✨'
}

Page({
  data: {
    // 精英模板
    template: null,

    // 用户旅程
    journey: null,
    hasJourney: false,

    // 进度数据
    progress: 0,
    phaseProgress: 0,
    matchRate: 0,
    totalScore: 0,
    streakDays: 0,

    // 系统消息
    systemMessage: null,
    systemLevel: null,

    // 阶段数据
    currentPhase: null,
    phases: [],
    currentPhaseIndex: 0,

    // 里程碑
    completedMilestones: [],
    currentPhaseMilestones: [],

    // 已完成阶段列表
    completedPhaseCount: 0,

    // 庆祝弹窗
    showCelebration: false,
    celebrationData: null,

    // 加载状态
    loading: true
  },

  onLoad: function(options) {
    var that = this
    var templateId = (options && options.templateId) || ''

    if (templateId) {
      this.loadTemplateJourney(templateId)
    } else {
      // 尝试从存储中获取当前追随的模板
      var journey = eliteModule.loadTemplateJourney()
      if (journey && journey.templateId) {
        this.loadTemplateJourney(journey.templateId)
      } else {
        // 没有绑定模板，显示空状态
        this.setData({
          loading: false,
          hasJourney: false
        })
      }
    }
  },

  onShow: function() {
    // 每次显示时刷新数据
    var templateId = this.data.template ? this.data.template.id : ''
    if (templateId) {
      this.refreshData(templateId)
    }
  },

  onPullDownRefresh: function() {
    var templateId = this.data.template ? this.data.template.id : ''
    if (templateId) {
      this.loadTemplateJourney(templateId)
    } else {
      wx.stopPullDownRefresh()
    }
  },

  // ========== 数据加载 ==========

  loadTemplateJourney: function(templateId) {
    var that = this
    this.setData({ loading: true })

    try {
      // 1. 加载模板
      var template = eliteModule.getEliteTemplate(templateId)
      if (!template) {
        this.setData({
          loading: false,
          hasJourney: false
        })
        wx.showToast({ title: '模板不存在', icon: 'none' })
        return
      }

      // 2. 加载旅程数据
      var journey = eliteModule.loadTemplateJourney()
      var hasJourney = !!(journey && journey.templateId === templateId)

      if (!hasJourney) {
        // 如果没有旅程或模板不匹配，初始化新的旅程
        journey = eliteModule.initTemplateJourney(templateId)
        eliteModule.saveTemplateJourney(journey)
      }

      // 3. 计算各项数据
      var progress = eliteModule.calculateTemplateProgress(templateId, journey)
      var currentPhase = eliteModule.getCurrentPhase(templateId, journey)

      // 4. 计算今日匹配率
      var todayRecords = this.getTodayRecords()
      var matchRate = eliteModule.calculateTodayMatchRate(templateId, todayRecords)

      // 5. 生成系统消息
      var systemMsg = eliteModule.generateSystemMessage(journey, template)
      var levelInfo = SYSTEM_LEVEL_MAP[systemMsg.level] || SYSTEM_LEVEL_MAP.info

      // 6. 处理阶段和里程碑数据
      var phases = that.processPhases(template, journey)
      var currentPhaseIndex = journey.currentPhase - 1
      var currentPhaseMilestones = currentPhase ? that.processMilestones(currentPhase.milestones, journey) : []
      var completedMilestones = that.collectCompletedMilestones(template, journey)
      var completedPhaseCount = Math.max(0, journey.currentPhase - 1)

      // 7. 当前阶段进度
      var phaseProgress = 0
      if (currentPhase && currentPhase.milestones && currentPhase.milestones.length > 0) {
        var done = 0
        for (var k = 0; k < currentPhase.milestones.length; k++) {
          if (journey.milestoneStatus && journey.milestoneStatus[currentPhase.milestones[k].id]) {
            done++
          }
        }
        phaseProgress = Math.round((done / currentPhase.milestones.length) * 100)
      }

      that.setData({
        template: template,
        journey: journey,
        hasJourney: true,
        progress: progress,
        phaseProgress: phaseProgress,
        matchRate: matchRate,
        totalScore: journey.totalScore || 0,
        streakDays: journey.streakDays || 0,
        systemMessage: systemMsg,
        systemLevel: levelInfo,
        currentPhase: currentPhase,
        phases: phases,
        currentPhaseIndex: currentPhaseIndex,
        currentPhaseMilestones: currentPhaseMilestones,
        completedMilestones: completedMilestones,
        completedPhaseCount: completedPhaseCount,
        loading: false
      })

      // 8. 检测是否有新达成的里程碑（用于庆祝弹窗）
      that.checkNewMilestones(template, journey, todayRecords)

    } catch (e) {
      console.error('[elite-journey] 加载失败', e)
      that.setData({ loading: false, hasJourney: false })
    }

    wx.stopPullDownRefresh()
  },

  refreshData: function(templateId) {
    var that = this
    try {
      var journey = eliteModule.loadTemplateJourney()
      if (!journey || journey.templateId !== templateId) return

      var template = eliteModule.getEliteTemplate(templateId)
      if (!template) return

      var progress = eliteModule.calculateTemplateProgress(templateId, journey)
      var currentPhase = eliteModule.getCurrentPhase(templateId, journey)

      var todayRecords = this.getTodayRecords()
      var matchRate = eliteModule.calculateTodayMatchRate(templateId, todayRecords)

      var systemMsg = eliteModule.generateSystemMessage(journey, template)
      var levelInfo = SYSTEM_LEVEL_MAP[systemMsg.level] || SYSTEM_LEVEL_MAP.info

      var phases = that.processPhases(template, journey)
      var currentPhaseIndex = journey.currentPhase - 1
      var currentPhaseMilestones = currentPhase ? that.processMilestones(currentPhase.milestones, journey) : []
      var completedMilestones = that.collectCompletedMilestones(template, journey)
      var completedPhaseCount = Math.max(0, journey.currentPhase - 1)

      var phaseProgress = 0
      if (currentPhase && currentPhase.milestones && currentPhase.milestones.length > 0) {
        var done = 0
        for (var k = 0; k < currentPhase.milestones.length; k++) {
          if (journey.milestoneStatus && journey.milestoneStatus[currentPhase.milestones[k].id]) {
            done++
          }
        }
        phaseProgress = Math.round((done / currentPhase.milestones.length) * 100)
      }

      that.setData({
        journey: journey,
        progress: progress,
        phaseProgress: phaseProgress,
        matchRate: matchRate,
        totalScore: journey.totalScore || 0,
        streakDays: journey.streakDays || 0,
        systemMessage: systemMsg,
        systemLevel: levelInfo,
        currentPhase: currentPhase,
        phases: phases,
        currentPhaseIndex: currentPhaseIndex,
        currentPhaseMilestones: currentPhaseMilestones,
        completedMilestones: completedMilestones,
        completedPhaseCount: completedPhaseCount
      })
    } catch (e) {
      console.error('[elite-journey] 刷新失败', e)
    }
  },

  // ========== 数据处理 ==========

  processPhases: function(template, journey) {
    if (!template || !template.phases) return []
    var phases = template.phases
    var currentPhase = journey ? journey.currentPhase : 1
    var result = []

    for (var i = 0; i < phases.length; i++) {
      var phase = phases[i]
      var order = phase.order
      var status = 'locked'

      if (order < currentPhase) {
        status = 'completed'
      } else if (order === currentPhase) {
        status = 'current'
      }

      result.push({
        id: phase.id,
        name: phase.name,
        order: order,
        description: phase.description || '',
        status: status,
        milestoneCount: phase.milestones ? phase.milestones.length : 0,
        requiredScore: phase.requiredScore || 0,
        unlockHint: phase.unlockHint || ''
      })
    }

    return result
  },

  processMilestones: function(milestones, journey) {
    if (!milestones) return []
    var result = []

    for (var i = 0; i < milestones.length; i++) {
      var m = milestones[i]
      var completed = !!(journey.milestoneStatus && journey.milestoneStatus[m.id])

      result.push({
        id: m.id,
        name: m.name,
        type: m.type || 'custom',
        icon: m.icon || '◆',
        reward: m.reward || 0,
        description: m.description || '',
        celebrationText: m.celebrationText || '',
        completed: completed
      })
    }

    return result
  },

  collectCompletedMilestones: function(template, journey) {
    if (!template || !journey || !journey.milestoneStatus) return []
    var completed = []

    for (var i = 0; i < template.phases.length; i++) {
      var phase = template.phases[i]
      if (!phase.milestones) continue
      for (var j = 0; j < phase.milestones.length; j++) {
        var m = phase.milestones[j]
        if (journey.milestoneStatus[m.id]) {
          completed.push({
            id: m.id,
            name: m.name,
            icon: m.icon || '◆',
            reward: m.reward || 0,
            phaseName: phase.name,
            phaseOrder: phase.order
          })
        }
      }
    }

    return completed
  },

  // ========== 里程碑检测与庆祝 ==========

  checkNewMilestones: function(template, journey, todayRecords) {
    if (!template || !journey) return

    var allRecords = this.getAllRecords()
    var newMilestone = null

    for (var i = 0; i < template.phases.length; i++) {
      var phase = template.phases[i]
      if (phase.order > journey.currentPhase) continue
      if (!phase.milestones) continue

      for (var j = 0; j < phase.milestones.length; j++) {
        var m = phase.milestones[j]
        if (journey.milestoneStatus && journey.milestoneStatus[m.id]) continue

        var achieved = eliteModule.checkMilestone(m, journey, todayRecords, allRecords)
        if (achieved) {
          // 更新里程碑状态
          if (!journey.milestoneStatus) journey.milestoneStatus = {}
          journey.milestoneStatus[m.id] = true
          journey.totalScore = (journey.totalScore || 0) + (m.reward || 0)

          eliteModule.saveTemplateJourney(journey)

          newMilestone = {
            name: m.name,
            icon: m.icon || '◆',
            reward: m.reward || 0,
            celebrationText: m.celebrationText || ('『叮！系统提示：里程碑「' + (m.name || '未知') + '」达成！修为 +' + (m.reward || 0) + '』'),
            phaseName: phase.name,
            phaseOrder: phase.order
          }
          break
        }
      }
      if (newMilestone) break
    }

    if (newMilestone) {
      this.setData({
        showCelebration: true,
        celebrationData: newMilestone
      })
    }
  },

  // ========== 获取今日修行记录 ==========

  getTodayRecords: function() {
    try {
      var today = this.getTodayDate()
      // 从全局数据获取今日记录
      var allRecords = []
      if (app.globalData && app.globalData.todayRecords) {
        allRecords = app.globalData.todayRecords
      }

      // 也尝试从 storage 获取
      var ledger = wx.getStorageSync(constants.STORAGE_KEYS.dailyScoreLedger)
      if (ledger && ledger[today] && ledger[today].records) {
        return ledger[today].records
      }

      return allRecords.filter(function(r) {
        return r.date === today
      })
    } catch (e) {
      return []
    }
  },

  getAllRecords: function() {
    try {
      if (app.globalData && app.globalData.allRecords) {
        return app.globalData.allRecords
      }
      return []
    } catch (e) {
      return []
    }
  },

  getTodayDate: function() {
    var d = new Date()
    var y = d.getFullYear()
    var m = ('0' + (d.getMonth() + 1)).slice(-2)
    var day = ('0' + d.getDate()).slice(-2)
    return y + '-' + m + '-' + day
  },

  // ========== 事件处理 ==========

  // 跳转模板详情页
  goToTemplateDetail: function() {
    var templateId = this.data.template ? this.data.template.id : ''
    if (templateId) {
      wx.navigateTo({
        url: '/packageC/pages/template-detail/template-detail?templateId=' + templateId
      })
    }
  },

  // 点击每日作息任务
  onTapDailySlot: function(e) {
    var index = e.currentTarget.dataset.index
    var category = e.currentTarget.dataset.category
    var task = e.currentTarget.dataset.task

    // 根据分类跳转到不同页面（record 是 tabBar 页，必须用 switchTab）
    // switchTab 不支持 URL 参数，通过 globalData 传递初始 tab
    var app = getApp()
    if (app && app.globalData) {
      app.globalData.recordInitialTab = category
    }
    wx.switchTab({ url: '/pages/record/record' })
  },

  // 关闭庆祝弹窗
  closeCelebration: function() {
    var that = this
    this.setData({ showCelebration: false })
    // 刷新数据
    setTimeout(function() {
      var templateId = that.data.template ? that.data.template.id : ''
      if (templateId) {
        that.loadTemplateJourney(templateId)
      }
    }, 300)
  },

  // 点击阶段查看解锁提示
  onTapPhase: function(e) {
    var index = e.currentTarget.dataset.index
    var phase = this.data.phases[index]
    if (!phase) return

    if (phase.status === 'locked') {
      var hint = phase.unlockHint || '『叮！此阶段尚未解锁，请继续完成当前阶段的修炼』'
      wx.showModal({
        title: phase.name,
        content: hint,
        showCancel: false,
        confirmText: '知道了'
      })
    } else if (phase.status === 'completed') {
      wx.showToast({
        title: '「' + phase.name + '」已圆满达成',
        icon: 'none'
      })
    }
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    var templateId = this.data.template ? this.data.template.id : ''
    if (templateId) {
      this.loadTemplateJourney(templateId)
    } else {
      wx.stopPullDownRefresh()
    }
  },

  // 返回模板选择页
  goToTemplates: function() {
    wx.switchTab({ url: '/pages/templates/templates' })
  },

  // 获取分类图标
  getCategoryIcon: function(category) {
    return CATEGORY_ICON_MAP[category] || '✨'
  }
})
