// 自建模板配置页
var app = getApp()
var Alib = require('../../../utils/activity-library.js')
var MetaCards = require('../../../utils/meta-cards.js')

/** 存储 key */
var CUSTOM_TEMPLATES_KEY = 'tiandao_custom_templates_'

/** 默认日模板6时段 */
var DEFAULT_SLOTS = [
  { id: 'dawn', name: '晨起', startTime: '06:00', endTime: '08:00', activities: [] },
  { id: 'morning', name: '上午', startTime: '08:00', endTime: '12:00', activities: [] },
  { id: 'noon', name: '中午', startTime: '12:00', endTime: '14:00', activities: [] },
  { id: 'afternoon', name: '下午', startTime: '14:00', endTime: '18:00', activities: [] },
  { id: 'evening', name: '晚间', startTime: '18:00', endTime: '22:00', activities: [] },
  { id: 'bedtime', name: '睡前', startTime: '22:00', endTime: '23:59', activities: [] }
]

/** 周模板天 */
var WEEK_DAYS = [
  { key: 'mon', label: '周一' }, { key: 'tue', label: '周二' },
  { key: 'wed', label: '周三' }, { key: 'thu', label: '周四' },
  { key: 'fri', label: '周五' }, { key: 'sat', label: '周六' },
  { key: 'sun', label: '周日' }
]

/** 周模板时段 */
var WEEK_PERIODS = [
  { key: 'morning', label: '早间' },
  { key: 'afternoon', label: '午间' },
  { key: 'evening', label: '晚间' }
]

/** 容量单位选项 */
var CAPACITY_UNITS_ALL = ['次', '组', '分钟', '秒', '次/天', '份', '组×次']

/** 活动类型默认单位映射 — 炼体=组/次, 有氧=分钟, 丹食=份 */
var DEFAULT_UNIT_MAP = {
  sport: '组/次', diet: '份', study: '分钟', work: '分钟', debuff: '次'
}

/** 6 大道则 → 底层 5 大类反向映射（分类 tab 用 grandDao，底层查询仍用 5 大类 key） */
var GRAND_DAO_TO_CATEGORY = {}
for (var gdKey in Alib.GRAND_DAO_MAP) {
  if (Object.prototype.hasOwnProperty.call(Alib.GRAND_DAO_MAP, gdKey)) {
    GRAND_DAO_TO_CATEGORY[Alib.GRAND_DAO_MAP[gdKey]] = gdKey
  }
}

Page({
  data: {
    // 模板基本信息
    templateId: '',
    templateName: '',
    templateType: 'daily',
    currentTemplateId: '',
    currentTemplateSlots: [],

    // 日模板
    timeSlots: [],
    currentSlotId: 'dawn',
    editMode: false,

    // 周模板
    weekDays: WEEK_DAYS,
    weekPeriods: WEEK_PERIODS,
    currentWeekDay: 'mon',
    currentWeekDayLabel: '周一',
    currentWeekSlot: 'morning',
    weekData: {},

    // 合道模板
    poolActivities: [],
    currentPoolIndex: 0,
    scoreTarget: '',

    // 当前选中时段的已添加活动
    currentSlotLabel: '',
    currentSlotActivities: [],

    // 活动库
    categories: Alib.GRAND_DAO_TABS,
    currentCategory: 'sport',
    currentGrandDao: 'li',
    libSortType: 'default',
    libSideFilters: [],
    currentLibSide: 'all',
    libActivities: [],
    libKeyword: '',

    // 容量浮层
    showCapacityPopup: false,
    capacityActivityId: '',
    capacityActivityName: '',
    capacityValue: '',
    capacityUnits: CAPACITY_UNITS_ALL,
    currentCapacityUnit: '',
    capacityTempInfo: null,

    // 批量复制浮层（日→其他时段）
    showCopySlotPopup: false,
    copySlotOptions: [],

    // 批量复制浮层（周→其他天）
    showCopyDayPopup: false,
    copyDayOptions: [],

    // 预设浮层
    showPresetPopup: false,
    presetPopupTitle: '',
    presetOptions: [],

    // 历史导入浮层
    showHistoryPopup: false,
    historyActivities: []
  },

  // ==================== 生命周期 ====================

  onLoad: function(options) {
    // 支持编辑已有模板
    if (options && options.id) {
      this._loadTemplateForEdit(options.id)
      return
    }
    if (options && options.type) {
      this.setData({ templateType: options.type })
    }
    // 恢复缓存的模板名称
    try {
      var cachedName = wx.getStorageSync('tiandao_tpl_name_cache')
      if (cachedName) this.setData({ templateName: cachedName })
    } catch(e) {}
    this._initTimeSlots()
    this._initWeekData()
    this._initLibSideFilters()
    this._loadLibActivities()
  },

  onShow: function() {
    // 从 activity-edit 返回后刷新活动库
    this._loadLibActivities()
  },

  // ==================== 模板切换 ====================

  switchType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({
      templateType: type,
      currentSlotId: 'dawn',
      currentWeekDay: 'mon',
      currentWeekDayLabel: '周一',
      currentWeekSlot: 'morning',
      currentPoolIndex: 0,
      currentSlotActivities: []
    })
    this._initWeekData()
    this._refreshCurrentSlotDisplay()
  },

  onNameInput: function(e) {
    var val = e.detail.value
    if (val.length > 20) {
      val = val.slice(0, 20)
      wx.showToast({ title: '最多输入20个字符', icon: 'none' })
    }
    this.setData({ templateName: val })
  },

  onNameBlur: function() {
    // 失焦自动缓存名称
    try { wx.setStorageSync('tiandao_tpl_name_cache', this.data.templateName) } catch(e) {}
  },

  clearName: function() {
    this.setData({ templateName: '' })
  },

  // ==================== 日模板 时段初始化 ====================

  _initTimeSlots: function() {
    var slots = JSON.parse(JSON.stringify(DEFAULT_SLOTS))
    this.setData({ timeSlots: slots, currentSlotId: 'dawn' })
    this._refreshCurrentSlotDisplay()
  },

  selectSlot: function(e) {
    var id = e.currentTarget.dataset.id
    this.setData({ currentSlotId: id })
    this._refreshCurrentSlotDisplay()
  },

  // 时间段自定义：点击时间文字直接唤起原生选择器
  onSlotStartTimeChange: function(e) {
    var id = e.currentTarget.dataset.id
    var newStart = e.detail.value
    var slots = this.data.timeSlots
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].id === id) {
        slots[i].startTime = newStart
        // 校验：结束时间必须晚于开始时间，否则自动顺延为开始+1小时
        if (slots[i].endTime <= newStart) {
          var h = parseInt(newStart.split(':')[0])
          var m = newStart.split(':')[1]
          var endH = (h + 1) % 24
          slots[i].endTime = (endH < 10 ? '0' + endH : '' + endH) + ':' + m
        }
        break
      }
    }
    this.setData({ timeSlots: slots })
  },

  onSlotEndTimeChange: function(e) {
    var id = e.currentTarget.dataset.id
    var newEnd = e.detail.value
    var slots = this.data.timeSlots
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].id === id) {
        slots[i].endTime = newEnd
        break
      }
    }
    this.setData({ timeSlots: slots })
  },

  _findSlotById: function(id) {
    var slots = this.data.timeSlots
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].id === id) return slots[i]
    }
    return null
  },

  // ==================== 周模板 ====================

  _initWeekData: function() {
    var data = {}
    for (var d = 0; d < WEEK_DAYS.length; d++) {
      data[WEEK_DAYS[d].key] = { morning: [], afternoon: [], evening: [] }
    }
    this.setData({ weekData: data })
    this._refreshCurrentSlotDisplay()
  },

  selectWeekDay: function(e) {
    var key = e.currentTarget.dataset.key
    var label = '周一'
    for (var i = 0; i < WEEK_DAYS.length; i++) {
      if (WEEK_DAYS[i].key === key) { label = WEEK_DAYS[i].label; break }
    }
    this.setData({ currentWeekDay: key, currentWeekDayLabel: label })
    this._refreshCurrentSlotDisplay()
  },

  selectWeekSlot: function(e) {
    var key = e.currentTarget.dataset.key
    this.setData({ currentWeekSlot: key })
    this._refreshCurrentSlotDisplay()
  },

  // ==================== 合道模板 ====================

  selectPoolActivity: function(e) {
    var idx = parseInt(e.currentTarget.dataset.index)
    this.setData({ currentPoolIndex: idx, currentSlotActivities: [] })
  },

  onScoreTargetInput: function(e) {
    this.setData({ scoreTarget: e.detail.value })
  },

  removePoolItem: function(e) {
    var idx = parseInt(e.currentTarget.dataset.index)
    var pool = this.data.poolActivities
    pool.splice(idx, 1)
    this.setData({ poolActivities: pool, currentPoolIndex: Math.max(0, idx - 1) })
  },

  movePoolItem: function(e) {
    var idx = parseInt(e.currentTarget.dataset.index)
    var dir = e.currentTarget.dataset.dir
    var pool = this.data.poolActivities
    if (dir === 'up' && idx > 0) {
      var tmp = pool[idx - 1]; pool[idx - 1] = pool[idx]; pool[idx] = tmp
      this.setData({ poolActivities: pool, currentPoolIndex: idx - 1 })
    } else if (dir === 'down' && idx < pool.length - 1) {
      var tmp2 = pool[idx + 1]; pool[idx + 1] = pool[idx]; pool[idx] = tmp2
      this.setData({ poolActivities: pool, currentPoolIndex: idx + 1 })
    }
  },

  // ==================== 当前时段活动刷新 ====================

  _refreshCurrentSlotDisplay: function() {
    var type = this.data.templateType
    var activities = []
    var label = ''

    if (type === 'daily') {
      var slot = this._findSlotById(this.data.currentSlotId)
      if (slot) { activities = slot.activities; label = slot.name }
    } else if (type === 'weekly') {
      activities = (this.data.weekData[this.data.currentWeekDay] || {})[this.data.currentWeekSlot] || []
      label = this.data.currentWeekDayLabel + ' ' + (this._getWeekPeriodLabel(this.data.currentWeekSlot))
    } else if (type === 'pool') {
      label = '合道活动池'
      activities = this.data.poolActivities || []
    }

    this.setData({
      currentSlotLabel: label,
      currentSlotActivities: activities
    })
  },

  _getWeekPeriodLabel: function(key) {
    var periods = WEEK_PERIODS
    for (var i = 0; i < periods.length; i++) {
      if (periods[i].key === key) return periods[i].label
    }
    return key
  },

  // ==================== 活动库 ====================

  _initLibSideFilters: function() {
    var cat = this.data.currentCategory
    var config = Alib.FILTER_CONFIGS[cat] || { categories: [], subcategories: [] }
    var sideFilters = config.categories || config.subcategories || []
    this.setData({ libSideFilters: sideFilters, currentLibSide: 'all' })
    this._loadLibActivities()
  },

  switchLibCategory: function(e) {
    var gd = e.currentTarget.dataset.cat
    var cat = GRAND_DAO_TO_CATEGORY[gd] || ''
    this.setData({ currentGrandDao: gd, currentCategory: cat, currentLibSide: 'all', libKeyword: '' })
    // 自由道 zi：无现有 5 大类映射，展示空态
    if (!cat) {
      this.setData({ libActivities: [], libSideFilters: [] })
      return
    }
    this._initLibSideFilters()
  },

  tapLibSide: function(e) {
    var key = e.currentTarget.dataset.key
    this.setData({ currentLibSide: key })
    this._loadLibActivities()
  },

  onLibSearch: function(e) {
    this.setData({ libKeyword: e.detail.value })
    this._loadLibActivities()
  },

  clearLibSearch: function() {
    this.setData({ libKeyword: '' })
    this._loadLibActivities()
  },

  _loadLibActivities: function() {
    var cat = this.data.currentCategory
    var kw = this.data.libKeyword
    var side = this.data.currentLibSide

    // 统一流程：元卡渲染 + 云端加载（官方 → 我的 → 公开）+ 引用卡
    this._loadLibFromCloud(cat, kw, side)
  },

  changeLibSort: function() {
    var self = this
    wx.showActionSheet({
      itemList: ['默认排序', '修为值从高到低', '修为值从低到高', '按名称'],
      success: function(res) {
        var map = { 0: 'default', 1: 'score_desc', 2: 'score_asc', 3: 'name' }
        self.setData({ libSortType: map[res.tapIndex] })
        self.applyLibSort()
      }
    })
  },

  applyLibSort: function() {
    var list = (this.data.libActivities || []).slice()
    var type = this.data.libSortType
    if (type === 'score_desc') {
      list.sort(function(a, b) { return (Number(b.scorePerUnit) || 0) - (Number(a.scorePerUnit) || 0) })
    } else if (type === 'score_asc') {
      list.sort(function(a, b) { return (Number(a.scorePerUnit) || 0) - (Number(b.scorePerUnit) || 0) })
    } else if (type === 'name') {
      list.sort(function(a, b) { return (a.name || '').localeCompare(b.name || '') })
    }
    this.setData({ libActivities: list })
  },

  /**
   * 统一补 grandDao 并按当前 6 大道则筛选（活动对象缺 grandDao 时按 category 兜底映射）
   */
  _applyGrandDaoFilter: function(list) {
    var gd = this.data.currentGrandDao
    var result = []
    for (var i = 0; i < list.length; i++) {
      var act = list[i]
      act.grandDao = Alib.getGrandDao(act.category || act.tabKey)
      if (act.grandDao === gd) result.push(act)
    }
    return result
  },

  /**
   * 构建元卡活动列表项（字段白名单：仅允许 id/actId/activityName/name/category/tabKey/sideFilter/description/scorePerUnit/unit/_isMetaCard）
   * @param {string} sideFilter - 当前侧栏筛选 key
   */
  _buildTemplateMetaCards: function(sideFilter) {
    var cat = this.data.currentCategory
    var kw = this.data.libKeyword
    var cards = MetaCards.META_CARDS
    var arr = []
    for (var key in cards) {
      if (!Object.prototype.hasOwnProperty.call(cards, key)) continue
      var card = cards[key]
      // 非 sport 维度按 category 过滤；sport 维度无 category 字段
      if (card.category && card.category !== cat) continue
      if (!card.category && cat !== 'sport') continue
      // 侧栏筛选
      if (sideFilter !== 'all') {
        if (cat === 'sport' && card.subcategory !== sideFilter) continue
        if (cat === 'debuff') {
          if (sideFilter === 'body_hurt' && card.id !== 'body_harm') continue
          if (sideFilter === 'eat_chaos' && card.id !== 'eat_chaos') continue
          if (sideFilter === 'screen_lost' && card.id !== 'screen_lost') continue
          if (sideFilter === 'inner_demon' && card.id !== 'inner_demon') continue
          if (sideFilter === 'unknown' && card.id !== 'inner_demon') continue
        }
        if (cat === 'work') {
          var goalCardMap = { kaitian: ['plan', 'talk'], butian: ['execute', 'talk'], fun: ['plan', 'execute'], boring: ['execute'], unknown: ['talk'] }
          var allowedCards = goalCardMap[sideFilter] || []
          if (allowedCards.indexOf(card.id) === -1) continue
        }
        if (cat === 'study') {
          var learnCardMap = { knowledge: ['input'], skill: ['process'], worldly: ['output'], cyber: ['input', 'process'], unknown: ['output'] }
          var allowedStudy = learnCardMap[sideFilter] || []
          if (allowedStudy.indexOf(card.id) === -1) continue
        }
      }
      // 关键词模糊匹配
      if (kw && kw.trim()) {
        var kwLower = kw.trim().toLowerCase()
        if (card.name.toLowerCase().indexOf(kwLower) === -1 &&
            (!card.description || card.description.toLowerCase().indexOf(kwLower) === -1)) {
          continue
        }
      }
      // 字段白名单：仅保留规范的输出字段
      arr.push({
        id: 'meta_' + card.id,
        actId: 'meta_' + card.id,
        activityName: card.name,
        name: card.name,
        category: cat,
        tabKey: cat,
        grandDao: Alib.getGrandDao(cat),
        sideFilter: sideFilter !== 'all' ? sideFilter : 'all',
        description: card.description || '',
        scorePerUnit: cat === 'debuff' ? -1 : 1,
        unit: '次',
        _isMetaCard: true
      })
    }
    return arr
  },

  /** 从 storage 读取活动编辑覆写 */
  _loadEdits: function() {
    var edits = {}
    try { edits = wx.getStorageSync('tiandao_act_edits_' + this._getUid()) || {} } catch(e) {}
    return edits
  },

  /** 按使用频次排序活动列表，空白始终置顶 */
  _sortLibByUsage: function(list) {
    var self = this
    var usage = {}
    try { usage = wx.getStorageSync('tiandao_act_usage_' + self._getUid()) || {} } catch(e) {}
    list.sort(function(a, b) {
      // 空白始终在最前
      if (a.sideFilter === 'blank' && b.sideFilter !== 'blank') return -1
      if (a.sideFilter !== 'blank' && b.sideFilter === 'blank') return 1
      // 自定义活动排在官方前面
      if (a.isCustom && !b.isCustom) return -1
      if (!a.isCustom && b.isCustom) return 1
      // 按使用次数降序
      var ua = usage[a.id] || 0
      var ub = usage[b.id] || 0
      return ub - ua
    })
    return list
  },

  /**
   * 分页拉取全量数据（循环直到凑够 total）
   */
  _fetchAllPages: function(action, baseParams, pageSize) {
    pageSize = pageSize || 50
    var all = []
    var page = 1
    var MAX_PAGES = 100

    var self = this
    return new Promise(function(resolve) {
      function loadPage() {
        wx.cloud.callFunction({
          name: 'activity-api',
          data: {
            action: action,
            params: Object.assign({}, baseParams, { page: page, pageSize: pageSize })
          },
          success: function(res) {
            var result = res.result
            if (!result || !result.ok) { resolve(null); return }
            var list = result.data.list || []
            var total = result.data.total || 0
            all = all.concat(list)
            if (all.length >= total || page >= MAX_PAGES) {
              resolve(all)
            } else {
              page++
              loadPage()
            }
          },
          fail: function() { resolve(null) }
        })
      }
      loadPage()
    })
  },

  /** 本地加载活动库 + 元卡渲染（不再调用云端，走 Alib + 元卡） */
  _loadLibFromLocal: function(cat, kw, side) {
    var self = this

    // 先同步渲染元卡，避免空白等待
    var metaCards = self._buildTemplateMetaCards(side)
    self.setData({ libActivities: metaCards })

    var list = []
    if (kw && kw.trim()) {
      list = Alib.searchActivities(kw, cat)
      var customAll = []
      try { customAll = wx.getStorageSync('tiandao_custom_act_' + self._getUid()) || [] } catch(e) {}
      var kwLower = kw.trim().toLowerCase()
      for (var i = 0; i < customAll.length; i++) {
        var ci = customAll[i]
        if (ci.category === cat) {
          if (ci.name.toLowerCase().indexOf(kwLower) !== -1 ||
              (ci.description && ci.description.toLowerCase().indexOf(kwLower) !== -1)) {
            list.unshift(ci)
          }
        }
      }
    } else {
      list = Alib.filterActivities(cat, 'all', side)
      var customAll2 = []
      try { customAll2 = wx.getStorageSync('tiandao_custom_act_' + self._getUid()) || [] } catch(e) {}
      var customFiltered = []
      for (var j = 0; j < customAll2.length; j++) {
        var cj = customAll2[j]
        if (cj.category === cat) {
          if (side === 'all' || cj.sideFilter === side) {
            customFiltered.push(cj)
          }
        }
      }
      list = customFiltered.concat(list)
    }

    // 全部视图下，空白活动固定置顶
    if (side === 'all') {
      for (var bi = 0; bi < list.length; bi++) {
        if (list[bi].sideFilter === 'blank') {
          var blankItem = list.splice(bi, 1)[0]
          list.unshift(blankItem)
          break
        }
      }
    }

    // 应用编辑覆写（含 defaultGroup）
    var edits = self._loadEdits()
    for (var k = 0; k < list.length; k++) {
      var edit = edits[list[k].id]
      if (edit) {
        if (edit.scorePerUnit !== undefined) list[k].scorePerUnit = edit.scorePerUnit
        if (edit.unit !== undefined) list[k].unit = edit.unit
        if (edit.defaultGroup !== undefined) list[k].defaultGroup = edit.defaultGroup
      }
    }

    list = self._applyGrandDaoFilter(list)
    self.setData({ libActivities: self._sortLibByUsage(list) })
    self.applyLibSort()
  },

  /**
   * 云端加载活动库（与 activity-library.js 的 _loadFromCloud 字段映射逐字段一致）
   * 顺序固定：① 官方 getLibrary → ② 我的 getMine → ③ 全服公开 getPublicCustom
   */
  _loadLibFromCloud: function(cat, kw, side) {
    var self = this

    // 先同步渲染元卡，避免空白等待
    var metaCards = self._buildTemplateMetaCards(side)
    self.setData({ libActivities: metaCards })

    // 并行调用三个云函数
    var promises = [
      // 1. 官方活动（分页拉全量）
      new Promise(function(resolve) {
        self._fetchAllPages('getLibrary', { category: cat, topFilter: 'all', sideFilter: side, keyword: kw || undefined }, 100).then(function(list) {
          resolve({ ok: list ? true : false, data: { list: list || [], total: (list || []).length } })
        })
      }),
      // 2. 我的自定义
      new Promise(function(resolve) {
        wx.cloud.callFunction({
          name: 'activity-api',
          data: { action: 'getMine' },
          success: function(res) { resolve(res.result) },
          fail: function() { resolve(null) }
        })
      }),
      // 3. 全服公开自定义（仅在非搜索时加载）
      new Promise(function(resolve) {
        if (kw && kw.trim()) { resolve(null); return }
        self._fetchAllPages('getPublicCustom', { category: cat }, 50).then(function(list) {
          resolve({ ok: true, data: { list: list || [], total: (list || []).length } })
        })
      })
    ]

    Promise.all(promises).then(function(results) {
      var officialRes = results[0]
      var mineRes = results[1]
      var publicRes = results[2]

      // 判断云端是否可用
      var cloudOk = officialRes && officialRes.ok
      if (!cloudOk) {
        self._loadLibFromLocal(cat, kw, side)
        return
      }

      var blankCards = []
      var officialCards = []
      var blankId = cat === 'diet' ? 'blank_diet' : ('blank_' + cat)

      // 1. 官方活动：映射字段（拆分空白卡）
      var officialList = (officialRes.data && officialRes.data.list) || []
      for (var i = 0; i < officialList.length; i++) {
        var item = officialList[i]
        var mapped = {
          id: item.activityId,
          name: item.name,
          scorePerUnit: item.scorePerUnit,
          unit: item.unit,
          category: item.category,
          tabKey: item.category,
          grandDao: Alib.getGrandDao(item.category),
          topFilter: item.topFilter,
          sideFilter: item.sideFilter,
          description: item.description,
          presetAction: item.presetAction,
          isOfficial: true,
          isCustom: false,
          isPublicLibrary: item.isPublicLibrary || false
        }
        if (mapped.id === blankId) {
          blankCards.push(mapped)
        } else {
          officialCards.push(mapped)
        }
      }

      // 2. 我的自定义：分类筛选 + 合并
      var mineCards = []
      var mineList = (mineRes && mineRes.ok && mineRes.data && mineRes.data.list) || []
      for (var j = 0; j < mineList.length; j++) {
        var mc = mineList[j]
        if (mc.category !== cat) continue
        if (side !== 'all' && mc.sideFilter !== side) continue
        if (kw && kw.trim()) {
          var kwLower = kw.trim().toLowerCase()
          if (mc.name.toLowerCase().indexOf(kwLower) === -1 &&
              (!mc.description || mc.description.toLowerCase().indexOf(kwLower) === -1)) {
            continue
          }
        }
        mineCards.push({
          id: mc.activityId || mc._id || mc.id,
          name: mc.name,
          scorePerUnit: mc.scorePerUnit,
          unit: mc.unit,
          category: mc.category,
          tabKey: mc.category,
          grandDao: Alib.getGrandDao(mc.category),
          topFilter: mc.topFilter || '',
          sideFilter: mc.sideFilter || '',
          description: mc.description || '',
          isOfficial: false,
          isCustom: true,
          presetAction: '',
          categoryName: mc.categoryName || '',
          ext: mc.ext || {},
          tags: mc.tags || [],
          icon: mc.icon || '',
          customMeta: mc.customMeta || null
        })
      }

      // 3. 全服公开自定义：分类筛选 + 合并
      var publicCards = []
      if (publicRes && publicRes.ok) {
        var pubList = (publicRes.data && publicRes.data.list) || []
        for (var k = 0; k < pubList.length; k++) {
          var pc = pubList[k]
          if (pc.category !== cat) continue
          if (side !== 'all' && pc.sideFilter !== side) continue
          publicCards.push({
            id: pc.activityId || pc._id || pc.id,
            name: pc.name,
            scorePerUnit: pc.scorePerUnit,
            unit: pc.unit,
            category: pc.category,
            tabKey: pc.category,
            grandDao: Alib.getGrandDao(pc.category),
            topFilter: pc.topFilter || '',
            sideFilter: pc.sideFilter || '',
            description: pc.description || '',
            isOfficial: false,
            isCustom: true,
            isPublic: true,
            ownerName: pc.ownerName || '',
            presetAction: '',
            categoryName: pc.categoryName || '',
            ext: pc.ext || {},
            tags: pc.tags || [],
            icon: pc.icon || '',
            customMeta: pc.customMeta || null
          })
        }
      }

      // 合并顺序：元卡 + 空白卡 + 官方 + 我的 + 公开
      var list = metaCards.concat(blankCards).concat(officialCards).concat(mineCards).concat(publicCards)

      // 应用编辑覆写（本地覆写仍然生效）
      var edits = self._loadEdits()
      for (var ei = 0; ei < list.length; ei++) {
        var edit = edits[list[ei].id]
        if (edit) {
          if (edit.scorePerUnit !== undefined) list[ei].scorePerUnit = edit.scorePerUnit
          if (edit.unit !== undefined) list[ei].unit = edit.unit
          if (edit.defaultGroup !== undefined) list[ei].defaultGroup = edit.defaultGroup
        }
      }

      // 引用卡（置底去重）
      var refs = self._loadReferencedActivities()
      list = self._mergeReferenced(list, refs)
      list = self._applyGrandDaoFilter(list)

      self.setData({ libActivities: self._sortLibByUsage(list) })
      self.applyLibSort()
    }).catch(function() {
      self._loadLibFromLocal(cat, kw, side)
    })
  },

  /**
   * 引用活动卡：编辑模板时，将当前模板 timeSlots 里已用活动合并进活动库
   * 标记 sourceType: 'referenced' + refFromTemplate（来源模板 id）
   */
  _loadReferencedActivities: function() {
    var refs = []
    var slots = this.data.currentTemplateSlots || []
    for (var i = 0; i < slots.length; i++) {
      var acts = slots[i].activities || []
      for (var j = 0; j < acts.length; j++) {
        var a = acts[j] || {}
        refs.push({
          id: a.actId || a.id,
          activityId: a.activityId || a.actId || a.id,
          name: a.activityName || a.name || '未命名活动',
          scorePerUnit: a.scorePerUnit != null ? a.scorePerUnit : 1,
          baseScore: a.baseScore != null ? a.baseScore : 1,
          unit: (a.capacity && a.capacity.unit) || a.unit || '次',
          category: a.category || a.tabKey || '',
          tabKey: a.tabKey || a.category || '',
          grandDao: Alib.getGrandDao(a.category || a.tabKey),
          capacity: a.capacity || { value: 1, unit: '次' },
          type: a.type || 'custom',
          isOfficial: false,
          isCustom: false,
          isPublic: false,
          _isMetaCard: false,
          sourceType: 'referenced',
          refFromTemplate: this.data.currentTemplateId || ''
        })
      }
    }
    return refs
  },

  /**
   * 引用卡去重合并（置底）：
   * - activityId 优先匹配；无 activityId 时按 metaCardId + name 组合判定
   * - 与元卡（metaCardId）/官方（activityId）/我的（activityId）/公开（activityId）任一匹配则不追加
   */
  _mergeReferenced: function(list, refs) {
    var merged = list.slice()
    for (var i = 0; i < refs.length; i++) {
      var ref = refs[i]
      var refId = ref.activityId || ref.actId || ref.id
      var refMeta = ref.metaCardId || ''
      var refName = ref.name || ref.activityName || ''

      var dup = false
      for (var j = 0; j < merged.length; j++) {
        var it = merged[j]
        // ① 元卡：metaCardId 匹配（元卡 id 形如 meta_<metaCardId>）
        if (refMeta && it._isMetaCard) {
          var metaId = (it.id || '').replace('meta_', '')
          if (metaId === refMeta) { dup = true; break }
        }
        // ②③④ 官方/我的/公开：activityId（或 actId/id）匹配
        if (refId && (it.id === refId || it.activityId === refId || it.actId === refId)) {
          dup = true
          break
        }
        // 兜底：metaCardId + name 组合
        if (!refId && refMeta && refName && it.metaCardId === refMeta && (it.name === refName || it.activityName === refName)) {
          dup = true
          break
        }
      }
      if (!dup) merged.push(ref)
    }
    return merged
  },

  // ==================== 活动库编辑体系 ====================

  toggleEditMode: function() {
    this.setData({ editMode: !this.data.editMode })
  },

  onLibCardTap: function(e) {
    if (this.data.editMode) {
      this.editLibActivity(e)
    } else {
      this.addActivity(e)
    }
  },

  editLibActivity: function(e) {
    var act = e.currentTarget.dataset.act
    if (!act) return

    // 元卡 → 创建衍生活动
    if (act._isMetaCard) {
      var metaCardId = act.metaCardId || act.id
      if (metaCardId) {
        wx.navigateTo({ url: '/packageC/pages/activity-edit/activity-edit?metaCard=' + metaCardId })
      }
      return
    }

    // 公开活动 → 克隆
    if (act.isPublic) {
      var self = this
      wx.showModal({
        title: '克隆活动',
        content: '确定要将「' + act.name + '」克隆为我的自定义活动吗？',
        success: function(res) {
          if (res.confirm) {
            wx.cloud.callFunction({
              name: 'activity-api',
              data: { action: 'cloneActivity', params: { activityId: act.id } },
              success: function() {
                self._loadLibActivities()
                wx.showToast({ title: '克隆成功', icon: 'success' })
              },
              fail: function() { wx.showToast({ title: '克隆失败，请重试', icon: 'none' }) }
            })
          }
        }
      })
      return
    }

    // 官方活动 → 复制后编辑
    if (act.isOfficial) {
      var copyData = encodeURIComponent(JSON.stringify({
        id: act.id, name: act.name, category: act.category,
        unit: act.unit, scorePerUnit: act.scorePerUnit,
        description: act.description || '', icon: act.presetAction || ''
      }))
      wx.navigateTo({ url: '/packageC/pages/activity-edit/activity-edit?isNew=true&data=' + copyData })
      return
    }

    // 用户自定义 → 编辑
    var editData = encodeURIComponent(JSON.stringify({
      id: act.id, name: act.name, category: act.category,
      unit: act.unit, scorePerUnit: act.scorePerUnit,
      description: act.description || '', icon: act.icon || ''
    }))
    wx.navigateTo({ url: '/packageC/pages/activity-edit/activity-edit?isNew=false&data=' + editData })
  },

  // ==================== 添加活动到当前时段 ====================

  addActivity: function(e) {
    var act = e.currentTarget.dataset.act
    if (!act) return

    // 日模板：无弹窗直接添加，已存在则累加容量
    if (this.data.templateType === 'daily') {
      var slots = this.data.timeSlots
      var slotId = this.data.currentSlotId
      var slot = null
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].id === slotId) { slot = slots[i]; break }
      }
      if (!slot) return

      var existIdx = -1
      for (var j = 0; j < slot.activities.length; j++) {
        if (slot.activities[j].actId === act.id) { existIdx = j; break }
      }
      if (existIdx > -1) {
        slot.activities[existIdx].capacity.value += 1
      } else {
        var defaultUnit = act.unit || DEFAULT_UNIT_MAP[act.tabKey || this.data.currentCategory] || '次'
        var capValue = 1
        if (defaultUnit === '次' && act.defaultGroup) {
          capValue = parseInt(act.defaultGroup) || 1
        }
        slot.activities.push({
          actId: act.id,
          activityName: act.name,
          capacity: { value: capValue, unit: defaultUnit },
          tabKey: act.tabKey || this.data.currentCategory,
          category: act.tabKey || this.data.currentCategory,
          isPublicLibrary: !!act.isPublicLibrary
        })
      }
      this.setData({ timeSlots: slots })
      this._refreshCurrentSlotDisplay()
      return
    }

    // 周模板/合道模板：保持原有弹窗逻辑
    this.addActivityToSlot(e)
  },

  addActivityToSlot: function(e) {
    var activity = e.currentTarget.dataset.act || e.currentTarget.dataset.activity
    if (!activity) return

    // 储存临时信息，弹出容量设置
    this.setData({
      showCapacityPopup: true,
      capacityActivityId: activity.id,
      capacityActivityName: activity.name,
      capacityValue: '',
      currentCapacityUnit: DEFAULT_UNIT_MAP[activity.tabKey || this.data.currentCategory] || '次',
      capacityTempInfo: activity
    })
  },

  onCapacityValue: function(e) {
    this.setData({ capacityValue: e.detail.value })
  },

  selectCapacityUnit: function(e) {
    if (!e || !e.currentTarget) return;
    this.setData({ currentCapacityUnit: e.currentTarget.dataset.unit })
  },

  closeCapacityPopup: function() {
    this.setData({ showCapacityPopup: false, capacityTempInfo: null })
  },

  confirmCapacity: function() {
    var val = parseInt(this.data.capacityValue)
    if (isNaN(val) || val <= 0) {
      wx.showToast({ title: '请输入有效的容量值', icon: 'none' })
      return
    }
    var activity = this.data.capacityTempInfo
    if (!activity) return

    var unit = this.data.currentCapacityUnit
    var newEntry = {
      actId: activity.id,
      activityName: activity.name,
      capacity: { value: val, unit: unit },
      tabKey: activity.tabKey || this.data.currentCategory,
      category: activity.tabKey || this.data.currentCategory,
      isPublicLibrary: !!activity.isPublicLibrary
    }

    var type = this.data.templateType

    if (type === 'daily') {
      var slots = this.data.timeSlots
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].id === this.data.currentSlotId) {
          slots[i].activities.push(newEntry)
          break
        }
      }
      this.setData({ timeSlots: slots })
    } else if (type === 'weekly') {
      var wd = this.data.weekData
      wd[this.data.currentWeekDay][this.data.currentWeekSlot].push(newEntry)
      this.setData({ weekData: wd })
    } else if (type === 'pool') {
      var pool = this.data.poolActivities
      pool.push(newEntry)
      this.setData({ poolActivities: pool })
    }

    this.setData({ showCapacityPopup: false, capacityTempInfo: null })
    this._refreshCurrentSlotDisplay()
  },

  changeVolume: function(e) {
    var slotId = e.currentTarget.dataset.slot
    var idx = parseInt(e.currentTarget.dataset.index)
    var step = parseInt(e.currentTarget.dataset.step)
    var slots = this.data.timeSlots
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].id === slotId) {
        var act = slots[i].activities[idx]
        if (act) {
          act.capacity.value = Math.max(1, act.capacity.value + step)
          this.setData({ timeSlots: slots })
        }
        break
      }
    }
  },

  deleteAct: function(e) {
    var slotId = e.currentTarget.dataset.slot
    var idx = parseInt(e.currentTarget.dataset.index)
    var slots = this.data.timeSlots
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].id === slotId) {
        slots[i].activities.splice(idx, 1)
        this.setData({ timeSlots: slots })
        break
      }
    }
  },

  // ==================== 当前时段活动操作 ====================

  editCapacity: function(e) {
    var idx = parseInt(e.currentTarget.dataset.index)
    var activities = this.data.currentSlotActivities
    var item = activities[idx]
    if (!item) return

    this.setData({
      showCapacityPopup: true,
      capacityActivityId: item.actId,
      capacityActivityName: item.activityName,
      capacityValue: String(item.capacity.value),
      currentCapacityUnit: item.capacity.unit,
      capacityTempInfo: { index: idx, isEdit: true }
    })
  },

  removeActivity: function(e) {
    var idx = parseInt(e.currentTarget.dataset.index)
    this._removeActivityFromCurrentSlot(idx)
    this._refreshCurrentSlotDisplay()
  },

  _removeActivityFromCurrentSlot: function(idx) {
    var type = this.data.templateType
    if (type === 'daily') {
      var slots = this.data.timeSlots
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].id === this.data.currentSlotId) {
          slots[i].activities.splice(idx, 1)
          this.setData({ timeSlots: slots })
          return
        }
      }
    } else if (type === 'weekly') {
      var wd = this.data.weekData
      wd[this.data.currentWeekDay][this.data.currentWeekSlot].splice(idx, 1)
      this.setData({ weekData: wd })
    }
  },

  moveActivity: function(e) {
    var idx = parseInt(e.currentTarget.dataset.index)
    var dir = e.currentTarget.dataset.dir
    var type = this.data.templateType
    var arrKey = ''

    if (type === 'daily') {
      var slots = this.data.timeSlots
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].id === this.data.currentSlotId) {
          var arr = slots[i].activities
          if (dir === 'up' && idx > 0) { var t = arr[idx-1]; arr[idx-1] = arr[idx]; arr[idx] = t }
          else if (dir === 'down' && idx < arr.length - 1) { var t2 = arr[idx+1]; arr[idx+1] = arr[idx]; arr[idx] = t2 }
          this.setData({ timeSlots: slots })
          break
        }
      }
    } else if (type === 'weekly') {
      var wd = this.data.weekData
      var arr2 = wd[this.data.currentWeekDay][this.data.currentWeekSlot]
      if (dir === 'up' && idx > 0) { var u = arr2[idx-1]; arr2[idx-1] = arr2[idx]; arr2[idx] = u }
      else if (dir === 'down' && idx < arr2.length - 1) { var d = arr2[idx+1]; arr2[idx+1] = arr2[idx]; arr2[idx] = d }
      this.setData({ weekData: wd })
    }
    this._refreshCurrentSlotDisplay()
  },

  // ==================== 批量复制（日→其他时段） ====================

  copySlotToOthers: function() {
    var slots = this.data.timeSlots
    var options = []
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].id !== this.data.currentSlotId) {
        options.push({ id: slots[i].id, name: slots[i].name, checked: true })
      }
    }
    this.setData({ showCopySlotPopup: true, copySlotOptions: options })
  },

  toggleCopySlotOption: function(e) {
    var idx = parseInt(e.currentTarget.dataset.index)
    var options = this.data.copySlotOptions
    options[idx].checked = !options[idx].checked
    this.setData({ copySlotOptions: options })
  },

  closeCopySlotPopup: function() {
    this.setData({ showCopySlotPopup: false })
  },

  confirmCopySlot: function() {
    var sourceSlot = this._findSlotById(this.data.currentSlotId)
    if (!sourceSlot) return
    var sourceActs = JSON.parse(JSON.stringify(sourceSlot.activities))
    var options = this.data.copySlotOptions
    var slots = this.data.timeSlots

    for (var i = 0; i < options.length; i++) {
      if (options[i].checked) {
        for (var j = 0; j < slots.length; j++) {
          if (slots[j].id === options[i].id) {
            slots[j].activities = JSON.parse(JSON.stringify(sourceActs))
            break
          }
        }
      }
    }
    this.setData({ timeSlots: slots, showCopySlotPopup: false })
    wx.showToast({ title: '已复制', icon: 'success' })
  },

  // ==================== 批量复制（周→其他天） ====================

  batchCopyDay: function() {
    var days = WEEK_DAYS
    var options = []
    for (var i = 0; i < days.length; i++) {
      if (days[i].key !== this.data.currentWeekDay) {
        options.push({ key: days[i].key, label: days[i].label, checked: true })
      }
    }
    // 工作日批量选中
    var workKeys = ['mon','tue','wed','thu','fri']
    for (var j = 0; j < options.length; j++) {
      options[j].checked = workKeys.indexOf(options[j].key) !== -1
    }
    this.setData({ showCopyDayPopup: true, copyDayOptions: options })
  },

  toggleCopyDayOption: function(e) {
    var idx = parseInt(e.currentTarget.dataset.index)
    var options = this.data.copyDayOptions
    options[idx].checked = !options[idx].checked
    this.setData({ copyDayOptions: options })
  },

  closeCopyDayPopup: function() {
    this.setData({ showCopyDayPopup: false })
  },

  confirmCopyDay: function() {
    var source = JSON.parse(JSON.stringify(this.data.weekData[this.data.currentWeekDay]))
    var options = this.data.copyDayOptions
    var wd = this.data.weekData

    for (var i = 0; i < options.length; i++) {
      if (options[i].checked) {
        wd[options[i].key] = JSON.parse(JSON.stringify(source))
      }
    }
    this.setData({ weekData: wd, showCopyDayPopup: false })
    wx.showToast({ title: '已复制', icon: 'success' })
  },

  // ==================== 预设填充 ====================

  fillPreset: function() {
    var presets = [
      { id: 'preset1', name: '规律作息模板', desc: '晨间唤醒操 → 深度工作 → 健康午餐 → 午间散步 → 下午学习 → 晚间运动 → 睡前阅读' },
      { id: 'preset2', name: '增肌训练日', desc: '晨起拉伸 → 上午加餐 → 力量训练 → 高蛋白午餐 → 午后恢复 → 有氧补充 → 晚间拉伸' },
      { id: 'preset3', name: '轻断食日', desc: '晨起温水 → 上午轻办公 → 下午悠闲活动 → 傍晚轻食 → 晚间冥想 → 早睡养气' }
    ]
    this.setData({
      showPresetPopup: true,
      presetPopupTitle: '选择推荐作息',
      presetOptions: presets,
      _presetType: 'daily'
    })
  },

  fillWeeklyPreset: function() {
    var presets = [
      { id: 'wpreset1', name: '规律作息周计划', desc: '工作日早起晨练+深度工作，周末灵活安排' },
      { id: 'wpreset2', name: '增肌训练周计划', desc: '推拉腿三分化：周一推/周三拉/周五腿，其余恢复日' },
      { id: 'wpreset3', name: '备考冲刺周计划', desc: '每日早晚复习，周日模考总结' }
    ]
    this.setData({
      showPresetPopup: true,
      presetPopupTitle: '选择推荐周计划',
      presetOptions: presets,
      _presetType: 'weekly'
    })
  },

  applyPreset: function(e) {
    var id = e.currentTarget.dataset.id
    var type = this.data._presetType || 'daily'

    if (type === 'daily') {
      this._applyDailyPreset(id)
    } else if (type === 'weekly') {
      this._applyWeeklyPreset(id)
    }
    this.setData({ showPresetPopup: false })
    this._refreshCurrentSlotDisplay()
  },

  _applyDailyPreset: function(id) {
    var slots = this.data.timeSlots

    if (id === 'preset1') {
      // 规律作息
      slots[0].activities = [{ actId: 'morning_wakeup', activityName: '晨间唤醒操', capacity: { value: 1, unit: '组/次' }, tabKey: 'sport', category: 'sport' }]
      slots[1].activities = [{ actId: 'deep_work', activityName: '专注深度工作', capacity: { value: 2, unit: '次' }, tabKey: 'work', category: 'work' }]
      slots[2].activities = [{ actId: 'nutritious_lunch', activityName: '营养午餐', capacity: { value: 1, unit: '份' }, tabKey: 'diet', category: 'diet' }]
      slots[3].activities = [{ actId: 'brisk_walk', activityName: '快走/步行', capacity: { value: 20, unit: '分钟' }, tabKey: 'sport', category: 'sport' }]
      slots[4].activities = [{ actId: 'read_book', activityName: '阅读书籍', capacity: { value: 3, unit: '次' }, tabKey: 'study', category: 'study' }]
      slots[5].activities = [{ actId: 'bedtime_stretch', activityName: '睡前放松拉伸', capacity: { value: 1, unit: '组/次' }, tabKey: 'sport', category: 'sport' }]
    } else if (id === 'preset2') {
      slots[0].activities = [{ actId: 'dynamic_stretch', activityName: '动态拉伸', capacity: { value: 10, unit: '分钟' }, tabKey: 'sport', category: 'sport' }]
      slots[1].activities = []
      slots[2].activities = [{ actId: 'quality_protein', activityName: '补充优质蛋白', capacity: { value: 1, unit: '份' }, tabKey: 'diet', category: 'diet' }]
      slots[3].activities = [{ actId: 'barbell_bench', activityName: '卧推', capacity: { value: 5, unit: '组/次' }, tabKey: 'sport', category: 'sport' }, { actId: 'barbell_squat', activityName: '杠铃深蹲', capacity: { value: 5, unit: '组/次' }, tabKey: 'sport', category: 'sport' }]
      slots[4].activities = [{ actId: 'running', activityName: '跑步', capacity: { value: 30, unit: '分钟' }, tabKey: 'sport', category: 'sport' }]
      slots[5].activities = [{ actId: 'static_stretch', activityName: '静态拉伸', capacity: { value: 10, unit: '分钟' }, tabKey: 'sport', category: 'sport' }]
    } else if (id === 'preset3') {
      slots[0].activities = [{ actId: 'drink_8_water', activityName: '喝够8杯水', capacity: { value: 1, unit: '份' }, tabKey: 'diet', category: 'diet' }]
      slots[4].activities = [{ actId: 'meditation', activityName: '正念冥想', capacity: { value: 20, unit: '分钟' }, tabKey: 'study', category: 'study' }]
    }

    this.setData({ timeSlots: slots })
  },

  _applyWeeklyPreset: function(id) {
    var wd = this.data.weekData

    if (id === 'wpreset1') {
      // 规律作息：工作日统一
      var workActs = {
        morning: [{ actId: 'morning_wakeup', activityName: '晨间唤醒操', capacity: { value: 1, unit: '次' }, tabKey: 'sport', category: 'sport' }],
        afternoon: [{ actId: 'deep_work', activityName: '专注深度工作', capacity: { value: 2, unit: '次' }, tabKey: 'work', category: 'work' }],
        evening: [{ actId: 'read_book', activityName: '阅读书籍', capacity: { value: 2, unit: '次' }, tabKey: 'study', category: 'study' }]
      }
      ['mon','tue','wed','thu','fri'].forEach(function(d) {
        wd[d] = JSON.parse(JSON.stringify(workActs))
      })
    } else if (id === 'wpreset2') {
      wd['mon'] = { morning: [], afternoon: [{ actId: 'barbell_bench', activityName: '卧推', capacity: { value: 5, unit: '组' }, tabKey: 'sport', category: 'sport' }], evening: [] }
      wd['wed'] = { morning: [], afternoon: [{ actId: 'pull_up', activityName: '引体向上', capacity: { value: 5, unit: '组' }, tabKey: 'sport', category: 'sport' }], evening: [] }
      wd['fri'] = { morning: [], afternoon: [{ actId: 'barbell_squat', activityName: '杠铃深蹲', capacity: { value: 5, unit: '组' }, tabKey: 'sport', category: 'sport' }], evening: [] }
    }

    this.setData({ weekData: wd })
    wx.showToast({ title: '预设已应用', icon: 'success' })
  },

  closePresetPopup: function() {
    this.setData({ showPresetPopup: false })
  },

  // ==================== 导入历史活动 ====================

  importHistoryActivities: function() {
    // 模拟从打卡记录中提取历史活动
    try {
      var checkins = wx.getStorageSync('tiandao_checkin_cache_' + this._getUid()) || []
    } catch(e) { var checkins = [] }

    // 如果没有真实数据，提供模拟历史数据
    var history = [
      { actId: 'push_up', activityName: '俯卧撑', count: 15, capacity: { value: 3, unit: '组' }, tabKey: 'sport', category: 'sport' },
      { actId: 'read_book', activityName: '阅读书籍', count: 12, capacity: { value: 3, unit: '次' }, tabKey: 'study', category: 'study' },
      { actId: 'deep_work', activityName: '专注深度工作', count: 10, capacity: { value: 2, unit: '次' }, tabKey: 'work', category: 'work' },
      { actId: 'running', activityName: '跑步', count: 8, capacity: { value: 30, unit: '分钟' }, tabKey: 'sport', category: 'sport' },
      { actId: 'drink_8_water', activityName: '喝够8杯水', count: 20, capacity: { value: 1, unit: '次/天' }, tabKey: 'diet', category: 'diet' },
      { actId: 'meditation', activityName: '正念冥想', count: 7, capacity: { value: 20, unit: '分钟' }, tabKey: 'study', category: 'study' },
      { actId: 'bodyweight_squat', activityName: '深蹲', count: 6, capacity: { value: 3, unit: '组' }, tabKey: 'sport', category: 'sport' },
      { actId: 'daily_journal', activityName: '每日复盘写日记', count: 9, capacity: { value: 1, unit: '次' }, tabKey: 'study', category: 'study' }
    ]

    for (var i = 0; i < history.length; i++) {
      history[i].checked = i < 5
    }

    this.setData({ showHistoryPopup: true, historyActivities: history })
  },

  toggleHistoryOption: function(e) {
    var idx = parseInt(e.currentTarget.dataset.index)
    var list = this.data.historyActivities
    list[idx].checked = !list[idx].checked
    this.setData({ historyActivities: list })
  },

  closeHistoryPopup: function() {
    this.setData({ showHistoryPopup: false })
  },

  confirmImportHistory: function() {
    var history = this.data.historyActivities
    var pool = this.data.poolActivities
    for (var i = 0; i < history.length; i++) {
      if (history[i].checked) {
        pool.push({
          actId: history[i].actId,
          activityName: history[i].activityName,
          capacity: history[i].capacity || { value: 1, unit: '次' },
          tabKey: history[i].tabKey || 'sport',
          category: history[i].category || 'sport'
        })
      }
    }
    this.setData({ poolActivities: pool, showHistoryPopup: false })
    this._refreshCurrentSlotDisplay()
    wx.showToast({ title: '已导入', icon: 'success' })
  },

  // ==================== 保存模板 ====================

  _getUid: function() {
    return (app.globalData && app.globalData.userId) || 'default'
  },

  _getStorageKey: function() {
    return CUSTOM_TEMPLATES_KEY + this._getUid()
  },

  saveTemplate: function() {
    // 300ms 防抖
    if (this._saveLock) return
    this._saveLock = true
    var self = this
    setTimeout(function() { self._saveLock = false }, 300)

    var name = (this.data.templateName || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入模板名称', icon: 'none' })
      return
    }

    // 校验日模板至少有一个时段包含活动
    if (this.data.templateType === 'daily') {
      var hasActivity = false
      var slots = this.data.timeSlots
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].activities && slots[i].activities.length > 0) {
          hasActivity = true
          break
        }
      }
      if (!hasActivity) {
        wx.showToast({ title: '请至少为一个时段添加活动', icon: 'none' })
        return
      }
    }

    var template = {
      id: this.data.templateId || ('ctmpl_' + Date.now()),
      name: name,
      type: this.data.templateType,
      createdAt: Date.now()
    }

    if (template.type === 'daily') {
      template.timeSlots = this.data.timeSlots
    } else if (template.type === 'weekly') {
      template.weekData = this.data.weekData
    } else if (template.type === 'pool') {
      template.poolActivities = this.data.poolActivities
      template.scoreTarget = parseInt(this.data.scoreTarget) || 0
    }

    // 保存到本地存储
    var key = this._getStorageKey()
    var templates = []
    try { templates = wx.getStorageSync(key) || [] } catch(e) {}

    var found = false
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === template.id) {
        templates[i] = template
        found = true
        break
      }
    }
    if (!found) {
      templates.unshift(template)
    }

    try { wx.setStorageSync(key, templates) } catch(e) {}

    wx.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(function() { wx.navigateBack() }, 800)
  },

  // ==================== 编辑已有模板 ====================

  _loadTemplateForEdit: function(id) {
    var key = this._getStorageKey()
    var templates = []
    try { templates = wx.getStorageSync(key) || [] } catch(e) {}

    var found = null
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === id) { found = templates[i]; break }
    }

    if (!found) {
      wx.showToast({ title: '模板不存在', icon: 'none' })
      this._initTimeSlots()
      this._initWeekData()
      this._initLibSideFilters()
      this._loadLibActivities()
      return
    }

    this.setData({
      templateId: found.id,
      templateName: found.name,
      templateType: found.type
    })

    if (found.type === 'daily') {
      this.setData({ timeSlots: found.timeSlots || DEFAULT_SLOTS, currentSlotId: 'dawn' })
      this._initWeekData()
    } else if (found.type === 'weekly') {
      this._initTimeSlots()
      this.setData({ weekData: found.weekData || {} })
    } else if (found.type === 'pool') {
      this._initTimeSlots()
      this._initWeekData()
      this.setData({
        poolActivities: found.poolActivities || [],
        scoreTarget: String(found.scoreTarget || '')
      })
    }

    // 归一化当前模板时段活动，供引用活动卡加载（sourceType: 'referenced'）
    var refSlots = []
    if (found.type === 'daily') {
      refSlots = found.timeSlots || []
    } else if (found.type === 'weekly') {
      var wd = found.weekData || {}
      for (var dk in wd) {
        if (!Object.prototype.hasOwnProperty.call(wd, dk)) continue
        var periods = wd[dk] || {}
        for (var pk in periods) {
          if (!Object.prototype.hasOwnProperty.call(periods, pk)) continue
          refSlots.push({ id: dk + '_' + pk, activities: periods[pk] || [] })
        }
      }
    } else if (found.type === 'pool') {
      refSlots = [{ id: 'pool', activities: found.poolActivities || [] }]
    }
    this.setData({
      currentTemplateId: found.id,
      currentTemplateSlots: refSlots
    })

    this._initLibSideFilters()
    this._loadLibActivities()
    this._refreshCurrentSlotDisplay()
  },

  // ==================== 通用 ====================

  preventBubble: function() {}
})
