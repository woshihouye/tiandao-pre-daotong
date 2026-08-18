// pages/record/record.js — v2 模板驱动+双模式拖动 记录页（修复版）

var app = getApp()
var activityLib = require('../../utils/activity-library.js')
var MetaCards = require('../../utils/meta-cards.js')
var DefaultTemplates = require('../../utils/default-templates.js')
var templateProgress = require('../../utils/template-progress.js')
var scoreUtil = require('../../utils/score.js')
var CONST = require('../../utils/constants.js')

// ========== 分类配置 ==========
var CATEGORY_TABS = [
  { key: 'sport', id: 'wu', name: '武·炼体', icon: '武', color: '#EF4444' },
  { key: 'diet', id: 'shi', name: '食·丹食', icon: '食', color: '#F59E0B' },
  { key: 'study', id: 'wu2', name: '悟·修心', icon: '悟', color: '#8B5CF6' },
  { key: 'work', id: 'gong', name: '工·功业', icon: '工', color: '#3B82F6' },
  { key: 'debuff', id: 'sha', name: '煞·心魔', icon: '煞', color: '#6B7280' }
]

// 默认时段配置（用于公开模板活动分配）
var DEFAULT_SLOTS = [
  { id: 'dawn',    name: '晨起',   startTime: '05:00', endTime: '08:00' },
  { id: 'morning', name: '上午',   startTime: '08:00', endTime: '12:00' },
  { id: 'noon',    name: '中午',   startTime: '12:00', endTime: '14:00' },
  { id: 'afternoon', name: '下午', startTime: '14:00', endTime: '18:00' },
  { id: 'night',   name: '晚上',   startTime: '18:00', endTime: '22:00' }
]

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

    // 计算结果
    result: {},

    // 提交状态
    submitting: false,
    mode: 'fuzzy',
    submitFeedback: null,
  },

  onLoad: function () {
    var hasInitial = this._applyInitialTab()
    if (!hasInitial) {
      this.loadTemplates('wu')
    }
    this._loadCustomActivities()
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

    // 如果已经是当前 tab 则跳过（但仍需加载模板：onLoad 因返回 true 不会调用 loadTemplates）
    if (this.data.activeTab === tabId) {
      this.loadTemplates(tab.id)
      return true
    }

    this.setData({
      activeTab: tab.id,
      activeCategory: tab.key,
      activeColor: tab.color,
      tabIcon: tab.icon
    })
    this.loadTemplates(tab.id)
    return true
  },

  // ========== 自建 daily 模板加载（从 storage 读取，按 tab 筛选）==========
  loadTemplates: function (categoryId) {
    var self = this
    // 兜底：storage 无模板且无标记时写入默认模板（幂等；活动库未触发时这里补上）
    DefaultTemplates.ensureDefaultTemplates((app.globalData && app.globalData.userId) || 'default')
    var CUSTOM_TMPL_KEY = 'tiandao_custom_templates_'
    var uid = (app.globalData && app.globalData.userId) || 'default'

    // 获取 tab 信息
    var currentTab = null
    for (var ti = 0; ti < CATEGORY_TABS.length; ti++) {
      if (CATEGORY_TABS[ti].id === categoryId) { currentTab = CATEGORY_TABS[ti]; break }
    }
    if (!currentTab) {
      self.setData({ templates: [], currentTemplate: null, allProgress: {}, activityProgress: {} })
      return
    }

    // 从 storage 加载自建 daily 模板（统一 key：tiandao_custom_templates_<uid>，timeSlots 结构）
    var allDailyTemplates = []
    try { allDailyTemplates = wx.getStorageSync(CUSTOM_TMPL_KEY + uid) || [] } catch(e) {}

    // 筛选：type=daily + categoryKey 匹配（categoryKey 在后续 timeSlots 展开后推断）
    var filtered = []
    for (var fi = 0; fi < allDailyTemplates.length; fi++) {
      var tpl = allDailyTemplates[fi]
      if (!tpl) continue
      if (tpl.type && tpl.type !== 'daily') continue
      filtered.push(tpl)
    }

    var templates = []
    for (var i = 0; i < filtered.length; i++) {
      var tpl = filtered[i]

      // 解析活动：timeSlots 结构展开为平铺数组（builder 自建模板与默认模板同构）
      var rawActs = []
      if (Array.isArray(tpl.activities)) {
        rawActs = tpl.activities
      } else if (tpl.timeSlots && Array.isArray(tpl.timeSlots)) {
        for (var si = 0; si < tpl.timeSlots.length; si++) {
          var slotActs = (tpl.timeSlots[si] && tpl.timeSlots[si].activities) || []
          rawActs = rawActs.concat(slotActs)
        }
      }
      // categoryKey 推断：模板显式字段 > 首个活动维度 > 默认当前 tab
      var tplCategoryKey = tpl.categoryKey || (rawActs[0] && (rawActs[0].tabKey || rawActs[0].category)) || currentTab.key
      if (tplCategoryKey !== currentTab.key) continue

      var activities = []
      for (var ai = 0; ai < rawActs.length; ai++) {
        var actItem = rawActs[ai]
        var resolved = self._resolveTemplateActivity(actItem, currentTab.key)
        if (resolved) activities.push(resolved)
      }

      // 构建时段分配（最多 5 个时段）
      var schedule = []
      var totalActs = activities.length
      var slotsToUse = Math.min(totalActs, 5)
      var actsPerSlot = Math.ceil(totalActs / slotsToUse)
      for (var si = 0; si < slotsToUse; si++) {
        var slot = DEFAULT_SLOTS[si]
        schedule.push({
          id: slot.id,
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          activities: activities.slice(si * actsPerSlot, Math.min((si + 1) * actsPerSlot, totalActs))
        })
      }

      templates.push({
        id: tpl.id || ('tpl_' + i),
        name: tpl.name || '自建模板',
        cover: tpl.cover || '',
        themeClass: currentTab.id,
        tag: '',
        description: tpl.description || '',
        activities: activities,
        schedule: schedule
      })
    }

    // 构建 actId → 解析后活动 映射，供 onSubmit 兜底解析公共库活动
    var templateActMap = {}
    for (var mi = 0; mi < templates.length; mi++) {
      var tplActs = templates[mi].activities || []
      for (var mj = 0; mj < tplActs.length; mj++) {
        var tAct = tplActs[mj]
        if (tAct && tAct.id) templateActMap[tAct.id] = tAct
      }
    }
    self._templateActMap = templateActMap

    // 保留所有分类的进度
    var allProgress = Object.assign({}, self.data.allProgress)
    var currentTemplate = templates.length > 0 ? templates[0] : null
    var activityProgress = currentTemplate ? (allProgress[currentTemplate.id] || {}) : {}

    for (var ti2 = 0; ti2 < templates.length; ti2++) {
      var tpl2 = templates[ti2]
      if (!allProgress[tpl2.id]) {
        allProgress[tpl2.id] = {}
        for (var ai2 = 0; ai2 < tpl2.activities.length; ai2++) {
          allProgress[tpl2.id][tpl2.activities[ai2].id] = 0
        }
      }
    }

    self.setData({
      templates: templates,
      currentTemplateIndex: 0,
      currentTemplate: currentTemplate,
      allProgress: allProgress,
      activityProgress: activityProgress
    })

    self._updateTemplateProgresses()
    self.recalcResult()
  },

  /**
   * 3.5 解析模板活动项 → 统一 activity 对象
   * @param {object} actItem - 模板中存储的活动项 { actId, name, unit, scorePerUnit, icon, isNegative }
   * @param {string} categoryKey - 当前 tab 的 category key (sport/diet/study/work/debuff)
   */
  _resolveTemplateActivity: function (actItem, categoryKey) {
    var actId = actItem.actId || actItem.activityId || actItem.id
    if (!actId) return null

    // 容量（builder capacity 结构 → 兼容旧平铺结构）
    var cap = actItem.capacity || {}
    var capValue = cap.value != null ? cap.value : (actItem.value != null ? actItem.value : 1)
    var capUnit = cap.unit || actItem.unit || '次'

    // 元卡解析
    if (actId.indexOf('meta_') === 0) {
      var metaCardId = actId.replace('meta_', '')
      var metaCard = MetaCards.META_CARDS[metaCardId]
      if (!metaCard) return null
      return {
        id: actId,
        actId: actId,
        name: metaCard.name || actItem.activityName || actItem.name || '',
        unit: capUnit,
        scorePerUnit: actItem.scorePerUnit || (metaCard.category === 'debuff' ? -1 : 1),
        capacityValue: capValue,
        icon: actItem.icon || '',
        isNegative: metaCard.category === 'debuff',
        _metaCard: metaCard
      }
    }

    // 自定义活动
    return {
      id: actId,
      actId: actId,
      name: actItem.activityName || actItem.name || '',
      unit: capUnit,
      scorePerUnit: actItem.scorePerUnit || 1,
      capacityValue: capValue,
      icon: actItem.icon || '',
      isNegative: actItem.isNegative || false,
      tabKey: actItem.tabKey || actItem.category || categoryKey,
      isPublicLibrary: !!actItem.isPublicLibrary
    }
  },

  // ========== 复制模板 ==========

  /** 复制默认/已有模板为自己的新模板（与元卡创建活动同心智） */
  copyTemplate: function(e) {
    var app = getApp()
    var tplId = e.currentTarget.dataset.id
    var uid = (app.globalData && app.globalData.userId) || 'default'
    var key = 'tiandao_custom_templates_' + uid
    var list = wx.getStorageSync(key) || []
    var found = null
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === tplId) { found = list[i]; break }
    }
    if (!found) return
    var now = Date.now()
    var copy = JSON.parse(JSON.stringify(found))
    copy.id = 'custom_' + now + '_' + Math.random().toString(36).slice(2, 6)
    copy.sourceType = (found.id && found.id.indexOf('dflt_') === 0) ? 'default' : 'custom'
    copy.createdAt = now
    copy.updatedAt = now
    // ★ 默认/自建模板已是 daily(timeSlots) 结构——深拷贝后做字段补齐，不盲目 tasks→daily 转换
    copy.type = 'daily'
    if (Array.isArray(copy.timeSlots) && copy.timeSlots.length) {
      copy.timeSlots.forEach(function(slot) {
        (slot.activities || []).forEach(function(act) {
          act.actId = act.actId || ('cpy_' + now + '_' + Math.floor(Math.random() * 10000))
          act.scorePerUnit = act.scorePerUnit != null ? act.scorePerUnit : 1    // ★ 缺省 1 禁 0
          act.baseScore = act.baseScore != null ? act.baseScore : 1             // ★ 缺省 1 禁 0
          act.type = act.type || 'custom'
          act.isOfficial = !!act.isOfficial
          act._isMetaCard = !!act._isMetaCard
        })
      })
    } else {
      // 兜底：found 若为 tasks 结构（异常数据），转 daily 单时段（与改动一 1b 等价转换）
      var activities = ((found.tasks || []).map(function(task) {
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
      }))
      copy.timeSlots = [{ id: 'whole', name: '全天', activities: activities }]
    }
    var baseName = found.name || '模板'
    var exists = list.filter(function(x) { return x.name && x.name.indexOf(baseName) === 0 })
    copy.name = baseName + '（副本' + (exists.length + 1) + '）'   // 重名保护
    list.push(copy)
    wx.setStorageSync(key, list)
    wx.showToast({ title: '已创建副本，可自由编辑', icon: 'success' })
    this.loadTemplates(this.data.activeTab)
    // 注意：复制出的模板为全新 custom_ id，不会影响当前正在使用的模板（快照制）
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
      tabIcon: tab.icon
    })

    this.loadTemplates(tab.id)
  },

  // ========== Swiper 切换 ==========

  /**
   * 轮播切换：更新当前模板和进度
   */
  onSwiperChange: function(e) {
    var index = e.detail.current
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

  /**
   * 点击卡片进入精准记录模式
   */
  onCardTap: function(e) {
    var idx = e.currentTarget.dataset.index
    var template = this.data.templates[idx]
    if (!template) return

    // 确保精准模式有最新的 activityProgress
    var activityProgress = this.data.allProgress[template.id] || {}

    this.setData({
      currentTemplateIndex: idx,
      currentTemplate: template,
      activityProgress: activityProgress,
      mode: 'precise'
    })
  },

  /**
   * 精准模式返回模糊模式，重新计算总进度
   */
  onPreciseBack: function() {
    var template = this.data.currentTemplate
    if (!template || !template.activities) {
      this.setData({ mode: 'fuzzy' })
      return
    }

    var progMap = this.data.activityProgress
    var totalProgress = 0
    var estimatedScore = 0
    var count = template.activities.length

    for (var i = 0; i < count; i++) {
      var act = template.activities[i]
      var p = progMap[act.id] || 0
      totalProgress += p
      var bonus = act.isPublicLibrary ? (1 + CONST.PUBLIC_LIBRARY_BONUS) : 1
      estimatedScore += (act.scorePerUnit || 0) * (p / 100) * bonus
    }

    totalProgress = Math.round(totalProgress / count)
    template.totalProgress = totalProgress
    template.estimatedScore = estimatedScore >= 0
      ? '+' + Math.round(estimatedScore * 10) / 10
      : '-' + Math.round(Math.abs(estimatedScore) * 10) / 10

    var templates = this.data.templates.slice()
    var tplIdx = this.data.currentTemplateIndex
    if (tplIdx >= 0 && tplIdx < templates.length) {
      templates[tplIdx] = template
    }

    this.setData({
      templates: templates,
      mode: 'fuzzy'
    })

    this.recalcResult()
  },

  // ========== 精准模式：活动行水平滑动 ==========

  /**
   * 活动行触摸开始
   */
  onActivityTouchStart: function(e) {
    var actId = e.currentTarget.dataset.actId
    if (!actId) return

    var progMap = this.data.activityProgress
    var currentProgress = progMap[actId] || 0

    this._actTouchData = {
      actId: actId,
      startX: e.touches[0].clientX,
      startProgress: currentProgress,
      lastVibrateProgress: currentProgress,
      moving: false
    }
  },

  /**
   * 活动行触摸移动：水平滑动调整进度
   */
  onActivityTouchMove: function(e) {
    if (!this._actTouchData) return

    var td = this._actTouchData
    var deltaX = e.touches[0].clientX - td.startX  // 右滑为正（增加进度）

    // 行宽 ≈ 250px，映射到 0-100 进度
    var rowWidth = 250
    var progressChange = (deltaX / rowWidth) * 100
    var newProgress = Math.max(0, Math.min(100, Math.round(td.startProgress + progressChange)))

    td.moving = true
    td._currentProgress = newProgress

    // 每跨过 10% 边界震动
    var crossed = Math.floor(newProgress / 10) - Math.floor(td.lastVibrateProgress / 10)
    if (crossed !== 0) {
      try { wx.vibrateShort({ type: 'light' }) } catch (err) {}
      td.lastVibrateProgress = newProgress
    }

    this._applyActivityProgress(td.actId, newProgress)
  },

  /**
   * 活动行触摸结束：吸附到 5%
   */
  onActivityTouchEnd: function(e) {
    if (!this._actTouchData) return

    var td = this._actTouchData
    if (!td.moving) {
      this._actTouchData = null
      return
    }

    var currentProgress = td._currentProgress !== undefined ? td._currentProgress : td.startProgress
    var snapped = Math.round(currentProgress / 5) * 5
    snapped = Math.max(0, Math.min(100, snapped))

    this._applyActivityProgress(td.actId, snapped)
    this._actTouchData = null

    // 重算结果
    if (this._recalcTimer) clearTimeout(this._recalcTimer)
    var self = this
    this._recalcTimer = setTimeout(function() {
      self.recalcResult()
    }, 100)
  },

  /**
   * 应用单个活动的进度变化
   */
  _applyActivityProgress: function(actId, progress) {
    var template = this.data.currentTemplate
    if (!template) return

    var allProgress = Object.assign({}, this.data.allProgress)
    var progMap = allProgress[template.id] || {}
    progMap[actId] = progress
    allProgress[template.id] = progMap

    var activityProgress = Object.assign({}, this.data.activityProgress)
    activityProgress[actId] = progress

    this.setData({
      allProgress: allProgress,
      activityProgress: activityProgress
    })
  },

  // ========== 触摸进度调节 ==========

  /**
   * 触摸开始：记录起始位置和初始进度
   */
  onCardTouchStart: function(e) {
    var idx = e.currentTarget.dataset.index
    if (idx === undefined) return

    var template = this.data.templates[idx]
    if (!template) return

    this._touchData = {
      index: idx,
      startY: e.touches[0].clientY,
      startProgress: template.totalProgress || 0,
      lastVibrateProgress: template.totalProgress || 0,
      moving: false
    }
  },

  /**
   * 触摸移动：计算 delta 映射到进度变化
   */
  onCardTouchMove: function(e) {
    if (!this._touchData) return

    var td = this._touchData
    var deltaY = td.startY - e.touches[0].clientY  // 上滑为正

    // 卡片高度 ≈ 屏幕高度的 55%，映射到 0-100 进度
    // 像素 → 进度映射比例
    var cardHeight = 300  // 大致像素高度
    var progressChange = (deltaY / cardHeight) * 100
    var newProgress = Math.max(0, Math.min(100, Math.round(td.startProgress + progressChange)))

    td.moving = true
    td._currentProgress = newProgress

    // 每跨过 10% 边界时震动
    var crossed = Math.floor(newProgress / 10) - Math.floor(td.lastVibrateProgress / 10)
    if (crossed !== 0) {
      try { wx.vibrateShort({ type: 'light' }) } catch (err) {}
      td.lastVibrateProgress = newProgress
    }

    // 更新模板进度（按比例分配各活动）
    this._applyTotalProgress(td.index, newProgress)
  },

  /**
   * 触摸结束：吸附到 5% 整数倍
   */
  onCardTouchEnd: function(e) {
    if (!this._touchData) return

    var td = this._touchData
    if (!td.moving) {
      this._touchData = null
      return
    }

    var currentProgress = td._currentProgress !== undefined ? td._currentProgress : td.startProgress

    // 吸附到最近的 5% 整数倍
    var snapped = Math.round(currentProgress / 5) * 5
    snapped = Math.max(0, Math.min(100, snapped))

    this._applyTotalProgress(td.index, snapped)

    // 如果吸附后有跨 10% 边界，再震一次
    var crossed = Math.floor(snapped / 10) - Math.floor(td.lastVibrateProgress / 10)
    if (crossed !== 0 && snapped !== td.lastVibrateProgress) {
      try { wx.vibrateShort({ type: 'light' }) } catch (err) {}
    }

    this._touchData = null

    // 延迟触发重算结果
    if (this._recalcTimer) clearTimeout(this._recalcTimer)
    var self = this
    this._recalcTimer = setTimeout(function() {
      self.recalcResult()
    }, 100)
  },

  /**
   * 将总进度百分比按比例分配到模板的各个活动
   */
  _applyTotalProgress: function(templateIndex, totalPercent) {
    var template = this.data.templates[templateIndex]
    if (!template || !template.activities) return

    var allProgress = Object.assign({}, this.data.allProgress)
    var progMap = allProgress[template.id] || {}

    // 按比例分配：所有活动都设为相同的进度百分比
    for (var i = 0; i < template.activities.length; i++) {
      var act = template.activities[i]
      progMap[act.id] = Math.round(totalPercent)
    }

    allProgress[template.id] = progMap

    // 更新当前活动进度
    var activityProgress = {}
    if (template.id === this.data.currentTemplate.id) {
      activityProgress = progMap
    }

    // 更新 totalProgress 和 estimatedScore
    var actCount = template.activities.length
    var estimatedScore = 0
    for (var j = 0; j < actCount; j++) {
      var a = template.activities[j]
      var bonus = a.isPublicLibrary ? (1 + CONST.PUBLIC_LIBRARY_BONUS) : 1
      estimatedScore += (a.scorePerUnit || 0) * (totalPercent / 100) * bonus
    }

    template.totalProgress = Math.round(totalPercent)
    template.estimatedScore = estimatedScore >= 0 ? '+' + Math.round(estimatedScore * 10) / 10 : '-' + Math.round(Math.abs(estimatedScore) * 10) / 10

    var templates = this.data.templates.slice()
    templates[templateIndex] = template

    this.setData({
      templates: templates,
      allProgress: allProgress,
      activityProgress: activityProgress
    })
  },

  // ========== 模板进度计算 ==========

  /**
   * 计算所有模板的总进度百分比和预计修为
   * 总进度 = 各活动进度的平均值
   * 预计修为 = 各活动 scorePerUnit × progress（累加）
   */
  _updateTemplateProgresses: function() {
    var templates = this.data.templates
    var allProgress = this.data.allProgress
    var currentTpl = this.data.currentTemplate

    for (var i = 0; i < templates.length; i++) {
      var tpl = templates[i]
      var progMap = allProgress[tpl.id] || {}
      var totalProgress = 0
      var estimatedScore = 0
      var actCount = tpl.activities ? tpl.activities.length : 0

      if (actCount > 0) {
        for (var j = 0; j < tpl.activities.length; j++) {
          var act = tpl.activities[j]
          var progress = progMap[act.id] || 0
          totalProgress += progress
          var bonus = act.isPublicLibrary ? (1 + CONST.PUBLIC_LIBRARY_BONUS) : 1
          estimatedScore += (act.scorePerUnit || 0) * (progress / 100) * bonus
        }
        totalProgress = Math.round(totalProgress / actCount)
      }

      tpl.totalProgress = totalProgress
      tpl.estimatedScore = estimatedScore >= 0 ? '+' + Math.round(estimatedScore * 10) / 10 : '-' + Math.round(Math.abs(estimatedScore) * 10) / 10
    }

    var updateData = { templates: templates }
    if (currentTpl) {
      var cp = allProgress[currentTpl.id] || {}
      updateData.activityProgress = cp
    }

    this.setData(updateData)
  },

  // ========== 结果预估计算（综合化：不分类，一个综合结果）==========
  recalcResult: function () {
    var template = this.data.currentTemplate
    var activityProgress = this.data.activityProgress
    if (!template) { this.setData({ result: {} }); return }

    var wu = templateProgress.calcWuTemplateResult(template, activityProgress)
    var shi = templateProgress.calcShiTemplateResult(template, activityProgress)
    var study = templateProgress.calcStudyTemplateResult(template, activityProgress)
    var work = templateProgress.calcWorkTemplateResult(template, activityProgress)
    var debuff = templateProgress.calcDebuffTemplateResult(template, activityProgress)

    var result = {
      totalCalories: wu.totalCalories || 0,
      totalGong: wu.totalGong + shi.totalGong,
      muscleRows: wu.muscleRows || [],
      trainedMuscleCount: wu.trainedMuscleCount || 0,
      muscleActivation: wu.muscleActivation || {},
      nutrition: shi.nutrition || null,
      macroRatio: shi.macroRatio || null,
      shiCalories: shi.totalCalories || 0,
      shiGong: shi.totalGong || 0,
      studyMinutes: study.totalMinutes || 0,
      studyKnowledge: study.totalKnowledge || 0,
      workOutput: work.totalOutput || 0,
      debuffHours: debuff.totalTimeHours || 0,
      debuffCalories: debuff.totalExtraCalories || 0
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
        // 元卡兜底：从 MetaCards 直接解析活动定义
        if (!act && actId.indexOf('meta_') === 0) {
          var metaCardId = actId.replace('meta_', '')
          var metaCard = MetaCards.META_CARDS[metaCardId]
          if (metaCard) {
            act = {
              id: actId,
              name: metaCard.name || actId,
              unit: '次',
              scorePerUnit: metaCard.category === 'debuff' ? -1 : 1,
              isNegative: metaCard.category === 'debuff',
              tabKey: metaCard.category || 'sport',
              _metaCard: metaCard
            }
          }
        }
        // 如果官方活动库找不到，尝试从已加载的自定义活动中找
        if (!act && self._customActivityMap && self._customActivityMap[actId]) {
          act = self._customActivityMap[actId]
        }
        // 兜底：从模板活动项解析（官方/公共库活动不在静态库与自定义库中）
        if (!act && self._templateActMap && self._templateActMap[actId]) {
          act = self._templateActMap[actId]
        }
        if (!act) continue

        // 根据活动的 tabKey 确定 score.js 的 type 参数
        var scoreType = this.mapTabKeyToScoreType(act.tabKey)
        var scoreResult = this.calcScoreViaEngine(act, factor, scoreType)
        var score = scoreResult.score
        // 公共库活动 +10% 加成
        if (act.isPublicLibrary) { score = score * (1 + CONST.PUBLIC_LIBRARY_BONUS) }
        totalScore += score

        collectedRecords.push({
          activityId: act.id,
          activityName: act.name,
          unit: act.unit,
          progress: progress,
          scorePerUnit: act.scorePerUnit,
          score: score,
          isNegative: act.isNegative || false,
          tabKey: act.tabKey,
          formula: scoreResult.formula || '',
          intensityLabel: scoreResult.intensityLabel || '',
          efficiencyLabel: scoreResult.efficiencyLabel || '',
          subCoeff: (scoreResult.subCoeff != null) ? scoreResult.subCoeff : 1,
          isMainPath: scoreResult.isMainPath !== false,
          capCapped: scoreResult.capCapped === true,
          capReason: scoreResult.capReason || ''
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
        self.onSubmitSuccess(totalScore, collectedRecords)
      }).catch(function (err) {
        console.error('保存记录失败', err)
        self.setData({ submitting: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      })
    } else {
      self.onSubmitSuccess(totalScore, collectedRecords)
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
        var capResult = result.capResult || {}
        return {
          score: result.score,
          formula: result.formula || '',
          intensityLabel: result.intensityLabel || '',
          efficiencyLabel: result.efficiencyLabel || '',
          subCoeff: (result.subCoeff != null) ? result.subCoeff : 1,
          isMainPath: result.isMainPath !== false,
          capCapped: capResult.capped === true,
          capReason: (capResult.capped === true) ? (capResult.reason || '') : ''
        }
      }
    } catch (e) {
      console.warn('score.js calculateScoreV2 异常:', act.id, e)
    }

    // 降级：用活动库 scorePerUnit × 进度因子
    var baseScore = act.scorePerUnit || 1
    var fallbackScore = Math.round(baseScore * factor * 10) / 10
    return {
      score: fallbackScore,
      formula: '降级计分',
      intensityLabel: '',
      efficiencyLabel: '',
      subCoeff: 1,
      isMainPath: true,
      capCapped: false,
      capReason: ''
    }
  },

  onSubmitSuccess: function (totalScore, collectedRecords) {
    var self = this
    var gongText = totalScore >= 0 ? '+' + totalScore : '-' + Math.abs(totalScore)

    var list = collectedRecords || []
    var formulaList = []
    for (var i = 0; i < list.length && i < 3; i++) {
      var rec = list[i]
      var line = (rec.activityName || '') + '：' + (rec.formula || '')
      if (rec.capCapped) {
        line += '（' + (rec.capReason || '已达上限') + '）'
      }
      formulaList.push(line)
    }
    if (list.length > 3) {
      formulaList.push('…共 ' + list.length + ' 条，明细可在首页记录查看')
    }

    self.setData({
      submitFeedback: { gongText: gongText, formulaList: formulaList, totalCount: list.length }
    })

    if (app.emitAppEvent) {
      app.emitAppEvent('record-updated', { totalScore: totalScore })
    }

    self.setData({ submitting: false })
  },

  closeSubmitFeedback: function () {
    var self = this
    self.setData({ submitFeedback: null })
    wx.switchTab({ url: '/pages/index/index' })
  },

  // ========== 自定义活动 ==========

  /**
   * 加载用户自定义活动列表（供 activityLib 找不到时回退使用）
   * 在 onLoad / onShow 时调用
   */
  _loadCustomActivities: function(callback) {
    var self = this
    wx.cloud.callFunction({
      name: 'user-activity',
      data: { action: 'list' },
      success: function(res) {
        if (res.result && res.result.ok && res.result.data && res.result.data.list) {
          var map = {}
          var list = res.result.data.list
          for (var i = 0; i < list.length; i++) {
            var item = list[i]
            map[item.activityId] = {
              id: item.activityId,
              name: item.name,
              unit: item.unit || '次',
              scorePerUnit: item.scorePerUnit,
              icon: item.icon || '',
              isNegative: item.scorePerUnit < 0,
              isCustom: true,
              tabKey: item.category,
              originActivityId: item.originActivityId || '',
              // 自由度字段透传
              categoryName: item.categoryName || '',
              ext: item.ext || {},
              tags: item.tags || [],
              customMeta: item.customMeta || null,
              // 元卡字段：从 customMeta 提取
              metaCard: (item.customMeta && item.customMeta.metaCard) ? item.customMeta.metaCard : ''
            }
          }
          self._customActivityMap = map
        } else {
          self._customActivityMap = {}
        }
        if (callback) callback()
      },
      fail: function() {
        self._customActivityMap = {}
        if (callback) callback()
      }
    })
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
