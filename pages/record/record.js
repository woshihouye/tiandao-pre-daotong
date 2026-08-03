// pages/record/record.js — v2 模板驱动+双模式拖动 记录页（修复版）

var app = getApp()
var activityLib = require('../../utils/activity-library.js')
var templateProgress = require('../../utils/template-progress.js')
var scoreUtil = require('../../utils/score.js')
var presetLib = require('../../utils/custom-preset.js')
var publicTemplates = require('../../utils/public-templates.js')

// ========== 分类配置 ==========
var CATEGORY_TABS = [
  { key: 'sport', id: 'wu', name: '武·炼体', icon: '武', color: '#EF4444' },
  { key: 'diet', id: 'shi', name: '食·丹食', icon: '食', color: '#F59E0B' },
  { key: 'study', id: 'wu2', name: '悟·修心', icon: '悟', color: '#8B5CF6' },
  { key: 'work', id: 'gong', name: '工·功业', icon: '工', color: '#3B82F6' },
  { key: 'debuff', id: 'sha', name: '煞·心魔', icon: '煞', color: '#6B7280' }
]

// preset 骨骼分类 → tab 分类的映射
// custom-preset.js 的 presets 用了一套骨骼分类体系，这里映射到我们的 tab
var PRESET_BONE_CATEGORY_MAP = {
  wu: ['strength', 'endurance', 'skill'],
  shi: ['nutrition'],
  wu2: ['mind', 'study'],
  gong: ['daily_work'],
  sha: ['bad_habit']
}

Page({
  data: {
    tabs: CATEGORY_TABS,
    activeTab: 'wu',
    activeCategory: 'sport',
    activeColor: '#EF4444',
    tabIcon: '武',

    // 当前分类下的所有模板
    templates: [],
    currentTemplateIndex: 0,
    currentTemplate: null,

    // 全局进度存储（跨分类保留）
    // 结构：{ templateId: { activityId: progress } }
    allProgress: {},
    // 当前模板的进度
    activityProgress: {},

    // 展开状态
    expandedCards: {},

    // 计算结果
    result: {},

    // 提交状态
    submitting: false
  },

  onLoad: function () {
    var hasInitial = this._applyInitialTab()
    if (!hasInitial) {
      this.loadTemplates('wu')
    }
  },

  onShow: function () {
    this._applyInitialTab()
  },

  // 读取 globalData 中的初始 tab 设置，返回布尔值表示是否成功切换了 tab
  _applyInitialTab: function () {
    var app = getApp()
    var initialCategory = app && app.globalData && app.globalData.recordInitialTab
    if (!initialCategory) return false

    // 映射旧分类 key → tab id
    var categoryToTab = {
      sport: 'wu',
      diet: 'shi',
      study: 'wu2',
      work: 'gong',
      debuff: 'sha'
    }
    var tabId = categoryToTab[initialCategory] || initialCategory
    var tab = CATEGORY_TABS.find(function (t) { return t.id === tabId })
    if (!tab) return false

    // 清除标记，避免重复切换
    app.globalData.recordInitialTab = null

    // 如果已经是当前 tab 则跳过
    if (this.data.activeTab === tabId) return true

    this.setData({
      activeTab: tab.id,
      activeCategory: tab.key,
      activeColor: tab.color,
      tabIcon: tab.icon,
      expandedCards: {}
    })
    this.loadTemplates(tab.id)
    return true
  },

  // ========== 模板加载：custom-preset.js 预设 + public-templates.js 公开模板 ==========
  loadTemplates: function (categoryId) {
    var self = this
    var boneCategories = PRESET_BONE_CATEGORY_MAP[categoryId] || []

    // 1. 从 custom-preset.js 读取用户自定义预设
    var customTemplates = []
    for (var bc = 0; bc < boneCategories.length; bc++) {
      try {
        var catPresets = presetLib.getPresetsByCategory(boneCategories[bc])
        if (catPresets && catPresets.length > 0) {
          for (var cp = 0; cp < catPresets.length; cp++) {
            var preset = catPresets[cp]
            var presetActivity = activityLib.getActivityById(preset.id)
            var activity = presetActivity || {
              id: preset.id, name: preset.name || preset.id,
              unit: '分钟', scorePerUnit: preset.baseScore || 1,
              icon: preset.icon || '', isNegative: false
            }
            customTemplates.push({
              id: 'preset_' + preset.id,
              name: preset.name || preset.id,
              cover: preset.icon || (preset.name ? preset.name[0] : '修'),
              themeClass: categoryId,
              tag: '',
              activities: [{
                id: activity.id, name: activity.name,
                unit: activity.unit || '分钟',
                scorePerUnit: activity.scorePerUnit || 1,
                icon: activity.icon, isNegative: activity.isNegative || false,
                _preset: preset
              }]
            })
          }
        }
      } catch (e) {
        console.warn('加载预设分类失败:', boneCategories[bc], e)
      }
    }

    // 2. 从 public-templates.js 读取公开模板
    var pubTmpls = publicTemplates.getPublicTemplatesByCategory(categoryId)
    var publicTemplateCards = []
    for (var pt = 0; pt < pubTmpls.length; pt++) {
      var pubTpl = pubTmpls[pt]
      var activities = []
      for (var ai = 0; ai < pubTpl.activities.length; ai++) {
        var actId = pubTpl.activities[ai]
        var act = activityLib.getActivityById(actId)
        if (act) {
          activities.push({
            id: act.id, name: act.name,
            unit: act.unit || '次',
            scorePerUnit: act.scorePerUnit || 1,
            icon: act.icon, isNegative: act.isNegative || false
          })
        }
      }
      if (activities.length > 0) {
        publicTemplateCards.push({
          id: 'public_' + pubTpl.id,
          name: pubTpl.name,
          cover: pubTpl.cover,
          themeClass: categoryId,
          tag: pubTpl.tag || '官方',
          description: pubTpl.description || '',
          activities: activities
        })
      }
    }

    // 3. 合并：公开模板放前面，用户预设放后面
    var allTemplates = publicTemplateCards.concat(customTemplates)

    // 保留所有分类的进度
    var allProgress = Object.assign({}, this.data.allProgress)

    var currentIndex = 0
    var currentTemplate = allTemplates.length > 0 ? allTemplates[0] : null
    var activityProgress = currentTemplate ? (allProgress[currentTemplate.id] || {}) : {}

    for (var ti = 0; ti < allTemplates.length; ti++) {
      var tpl = allTemplates[ti]
      if (!allProgress[tpl.id]) {
        allProgress[tpl.id] = {}
        for (var ai2 = 0; ai2 < tpl.activities.length; ai2++) {
          allProgress[tpl.id][tpl.activities[ai2].id] = 0
        }
      }
    }

    this.setData({
      templates: allTemplates,
      currentTemplateIndex: currentIndex,
      currentTemplate: currentTemplate,
      allProgress: allProgress,
      activityProgress: activityProgress
    })

    this.recalcResult()
  },

  // ========== Tab 切换 ==========
  onTabTap: function (e) {
    var tabKey = e.currentTarget.dataset.tab
    var tab = CATEGORY_TABS.find(function (t) { return t.id === tabKey })
    if (!tab || tab.id === this.data.activeTab) return

    this.setData({
      activeTab: tab.id,
      activeCategory: tab.key,
      activeColor: tab.color,
      tabIcon: tab.icon,
      expandedCards: {}
    })

    this.loadTemplates(tab.id)
  },

  // ========== 模板选择 ==========
  onTemplateSelect: function (e) {
    var index = e.currentTarget.dataset.index
    if (index === this.data.currentTemplateIndex) return

    var template = this.data.templates[index]
    if (!template) return

    var activityProgress = this.data.allProgress[template.id] || {}

    this.setData({
      currentTemplateIndex: index,
      currentTemplate: template,
      activityProgress: activityProgress
    })

    this.recalcResult()
  },

  // ========== 进度变化 ==========
  onProgressChange: function (e) {
    var detail = e.detail
    var allProgress = Object.assign({}, this.data.allProgress)
    allProgress[detail.templateId] = detail.activityProgress

    var updateData = {}
    if (detail.templateId === this.data.currentTemplate.id) {
      updateData.activityProgress = detail.activityProgress
      if (this._recalcTimer) clearTimeout(this._recalcTimer)
      this._recalcTimer = setTimeout(this.recalcResult.bind(this), 200)
    }

    // activityProgress 立即更新保证 UI 实时响应
    if (Object.keys(updateData).length > 0) {
      this.setData(updateData)
    }

    // allProgress 用 debounce 批量写入，避免高频全量 setData
    if (this._progressTimer) clearTimeout(this._progressTimer)
    var self = this
    this._progressTimer = setTimeout(function () {
      self.setData({ allProgress: allProgress })
    }, 100)
  },

  // ========== 展开/收起 ==========
  onToggleExpand: function (e) {
    var templateId = e.detail.templateId
    var expandedCards = Object.assign({}, this.data.expandedCards)
    expandedCards[templateId] = !expandedCards[templateId]
    this.setData({ expandedCards: expandedCards })
  },

  // ========== 结果预估计算 ==========
  recalcResult: function () {
    var categoryId = this.data.activeTab
    var template = this.data.currentTemplate
    var activityProgress = this.data.activityProgress

    if (!template) {
      this.setData({ result: {} })
      return
    }

    var result
    if (categoryId === 'wu') {
      result = templateProgress.calcWuTemplateResult(template, activityProgress)
    } else if (categoryId === 'shi') {
      result = templateProgress.calcShiTemplateResult(template, activityProgress)
    } else {
      // 悟/工/煞：仅占位
      result = { totalCalories: 0, totalGong: 0, muscleActivation: {}, trainedMuscleCount: 0, muscleRows: [] }
    }

    this.setData({ result: result })
  },

  // ========== 提交流程 ==========
  onSubmit: function () {
    var self = this
    if (this.data.submitting) return

    var allProgress = this.data.allProgress
    var hasProgress = false
    var templateIds = Object.keys(allProgress)
    for (var p = 0; p < templateIds.length; p++) {
      var progMap = allProgress[templateIds[p]]
      var actIds = Object.keys(progMap)
      for (var q = 0; q < actIds.length; q++) {
        if (progMap[actIds[q]] > 0) { hasProgress = true; break }
      }
      if (hasProgress) break
    }

    if (!hasProgress) {
      wx.showToast({ title: '请至少调整一项修行的进度', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    // 遍历所有 allProgress 条目，不管来自公开模板还是自定义预设
    var dateStr = this.getDateStr()
    var collectedRecords = []
    var totalScore = 0

    for (var ti = 0; ti < templateIds.length; ti++) {
      var tplId = templateIds[ti]
      var progMap = allProgress[tplId]
      var actIds = Object.keys(progMap)

      // 从 activity-library.js 查找每个活动
      for (var ai = 0; ai < actIds.length; ai++) {
        var actId = actIds[ai]
        var progress = progMap[actId]
        if (progress <= 0) continue

        var factor = progress / 100
        var act = activityLib.getActivityById(actId)
        if (!act) continue

        // 根据活动的 tabKey 确定 score.js 的 type 参数
        var scoreType = this.mapTabKeyToScoreType(act.tabKey)
        var scoreResult = this.calcScoreViaEngine(act, factor, scoreType)
        var score = scoreResult.score
        totalScore += score

        collectedRecords.push({
          activityId: act.id,
          activityName: act.name,
          unit: act.unit,
          progress: progress,
          scorePerUnit: act.scorePerUnit,
          score: score,
          isNegative: act.isNegative || false,
          tabKey: act.tabKey
        })
      }
    }

    totalScore = Math.round(totalScore * 10) / 10

    var userId = app.globalData && app.globalData.userId ? app.globalData.userId : ''
    var now = Date.now()

    var recordData = {
      userId: userId,
      date: dateStr,
      records: collectedRecords,
      totalScore: totalScore,
      score: totalScore,
      timestamp: now,
      createdAt: now,
      status: 'confirmed'
    }

    var db = app.globalData && app.globalData.db
    if (db) {
      db.collection('records').add({ data: recordData }).then(function () {
        self.onSubmitSuccess(totalScore)
      }).catch(function (err) {
        console.error('保存记录失败', err)
        self.setData({ submitting: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      })
    } else {
      self.onSubmitSuccess(totalScore)
    }
  },

  // tabKey → score.js type 参数
  mapTabKeyToScoreType: function (tabKey) {
    var map = { sport: 'sport', diet: 'diet', study: 'study', work: 'work', debuff: 'debuff' }
    return map[tabKey] || 'sport'
  },

  // 通过 score.js 统一计算引擎算分
  calcScoreViaEngine: function (act, factor, scoreType) {
    // 构造符合 mapParamsToUnified 期望的 params
    var params = {}
    switch (scoreType) {
      case 'sport':
        params = {
          duration: Math.round(factor * 60),
          intensity: factor,
          pathKey: 'lianti'
        }
        break
      case 'diet':
        params = {
          foodQuality: Math.round(factor * 3),
          fit: factor >= 0.8,
          mealLevel: Math.round(factor * 3)
        }
        break
      case 'study':
        params = {
          duration: Math.round(factor * 60),
          goalDone: factor >= 0.8,
          hasOutput: factor >= 0.5
        }
        break
      case 'work':
        params = {
          duration: Math.round(factor * 60),
          goalDone: factor >= 0.8,
          noDistraction: factor >= 0.6
        }
        break
      case 'debuff':
        params = {
          debuffType: 'DEFAULT',
          todayCount: 1
        }
        break
      default:
        params = { duration: Math.round(factor * 60) }
    }

    try {
      var result = scoreUtil.calculateScoreV2(scoreType, params, {
        verifySource: 'manual_claim',
        systemKey: 'traditional'
      })
      if (result && typeof result.score === 'number' && result.score !== 0) {
        return { score: result.score }
      }
    } catch (e) {
      console.warn('score.js calculateScoreV2 异常:', act.id, e)
    }

    // 降级：用活动库 scorePerUnit × 进度因子
    var baseScore = act.scorePerUnit || 1
    var fallbackScore = Math.round(baseScore * factor * 10) / 10
    return { score: fallbackScore }
  },

  onSubmitSuccess: function (totalScore) {
    var self = this

    // 煞类负分正确显示「修为 -N」
    var gongText = totalScore >= 0 ? '+' + totalScore : '-' + Math.abs(totalScore)

    wx.showToast({
      title: '已保存，修为 ' + gongText,
      icon: 'success',
      duration: 2000
    })

    if (app.emitAppEvent) {
      app.emitAppEvent('record-updated', { totalScore: totalScore })
    }

    setTimeout(function () {
      self.setData({ submitting: false })
      wx.switchTab({ url: '/pages/index/index' })
    }, 1500)
  },

  // ========== 辅助 ==========
  getCategoryKey: function (id) {
    var tab = CATEGORY_TABS.find(function (t) { return t.id === id })
    return tab ? tab.key : 'sport'
  },

  getDateStr: function () {
    var d = new Date()
    var m = d.getMonth() + 1
    var day = d.getDate()
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day
  }
})
