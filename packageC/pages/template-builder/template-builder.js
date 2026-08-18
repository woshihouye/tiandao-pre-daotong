// 自建模板配置页
var app = getApp()
var Cart = require('../../../utils/cart.js')
var optimalScore = require('../../../utils/optimal-score.js')

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

Page({
  data: {
    // 模板基本信息
    templateId: '',
    templateName: '',
    templateType: 'daily',

    // 日模板
    timeSlots: [],
    currentSlotId: 'dawn',

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

    // 购物车落位区
    cart: [],
    dropMode: false,
    dropTarget: null,
    dropSelectedSlots: [],
    dropSlotChecked: [],
    showCartEditPopup: false,
    cartEditTarget: null,
    cartEditValue: '',
    cartEditUnit: '',
    cartEditUnits: CAPACITY_UNITS_ALL,

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
    historyActivities: [],

    // 修行目标（最优区间）
    optimalTargets: (optimalScore && optimalScore.DEFAULT_OPTIMAL_TARGETS) ? JSON.parse(JSON.stringify(optimalScore.DEFAULT_OPTIMAL_TARGETS)) : {
      activity: { min: 300, max: 600 },
      nutrition: { protein: { min: 50, max: 80 }, carbs: { min: 200, max: 300 }, fat: { min: 40, max: 70 }, calories: { min: 1800, max: 2400 } }
    },
    defaultOptimalTargets: null
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
  },

  onShow: function() {
    this.setData({ cart: Cart.getCart() })
  },

  // ==================== 模板切换 ====================

  switchType: function(e) {
    var type = e.currentTarget.dataset.type
    if (type === 'playlist') {
      // 周期模板（歌单）跳独立创建页，不进入 builder 的时段/活动编辑逻辑
      wx.navigateTo({
        url: '/packageC/pages/cycle-create/cycle-create'
      })
      return
    }
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

  // ==================== 购物车落位区 ====================

  goToActivityLibrary: function() {
    wx.navigateTo({ url: '/packageC/pages/activity-library/activity-library' })
  },

  onCartItemTap: function(e) {
    var cartId = e.currentTarget.dataset.id
    var cart = this.data.cart
    var target = null
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].cartId === cartId) { target = cart[i]; break }
    }
    if (!target) return
    this.setData({
      showCartEditPopup: true,
      cartEditTarget: target,
      cartEditValue: String(target.capacity.value),
      cartEditUnit: target.capacity.unit
    })
  },

  closeCartEditPopup: function() {
    this.setData({ showCartEditPopup: false, cartEditTarget: null })
  },

  onCartEditValue: function(e) {
    this.setData({ cartEditValue: e.detail.value })
  },

  selectCartEditUnit: function(e) {
    this.setData({ cartEditUnit: e.currentTarget.dataset.unit })
  },

  confirmCartCapacity: function() {
    var val = parseInt(this.data.cartEditValue)
    if (isNaN(val) || val <= 0) {
      wx.showToast({ title: '请输入有效容量', icon: 'none' })
      return
    }
    var target = this.data.cartEditTarget
    if (!target) return
    Cart.updateCartCapacity(target.cartId, val, this.data.cartEditUnit)
    this.setData({
      cart: Cart.getCart(),
      showCartEditPopup: false,
      cartEditTarget: null
    })
    wx.showToast({ title: '容量已更新', icon: 'success' })
  },

  removeCartItem: function(e) {
    var cartId = e.currentTarget.dataset.id
    Cart.removeFromCart(cartId)
    this.setData({ cart: Cart.getCart() })
  },

  clearCart: function() {
    Cart.clearCart()
    this.setData({ cart: [] })
  },

  startDrop: function(e) {
    var cartId = e.currentTarget.dataset.id
    var cart = this.data.cart
    var target = null
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].cartId === cartId) { target = cart[i]; break }
    }
    if (!target) return
    var checked = []
    for (var j = 0; j < this.data.timeSlots.length; j++) checked.push(false)
    this.setData({
      dropMode: true,
      dropTarget: target,
      dropSelectedSlots: [],
      dropSlotChecked: checked
    })
  },

  toggleDropSlot: function(e) {
    var id = e.currentTarget.dataset.id
    var index = parseInt(e.currentTarget.dataset.index)
    var selected = this.data.dropSelectedSlots.slice()
    var checked = this.data.dropSlotChecked.slice()
    var idx = selected.indexOf(id)
    if (idx > -1) {
      selected.splice(idx, 1)
      checked[index] = false
    } else {
      selected.push(id)
      checked[index] = true
    }
    this.setData({ dropSelectedSlots: selected, dropSlotChecked: checked })
  },

  cancelDrop: function() {
    this.setData({ dropMode: false, dropTarget: null, dropSelectedSlots: [], dropSlotChecked: [] })
  },

  confirmDrop: function() {
    if (this.data.dropSelectedSlots.length === 0) {
      wx.showToast({ title: '请先选择时段', icon: 'none' })
      return
    }
    var target = this.data.dropTarget
    if (!target) return

    var slots = this.data.timeSlots
    var selected = this.data.dropSelectedSlots
    var actId = target.act.id
    var tabKey = target.act.tabKey || target.act.category
    for (var s = 0; s < slots.length; s++) {
      if (selected.indexOf(slots[s].id) === -1) continue
      var slot = slots[s]
      var existIdx = -1
      for (var j = 0; j < slot.activities.length; j++) {
        if (slot.activities[j].actId === actId) { existIdx = j; break }
      }
      if (existIdx > -1) {
        slot.activities[existIdx].capacity.value += 1
      } else {
        slot.activities.push({
          actId: actId,
          activityName: target.act.name,
          capacity: { value: target.capacity.value, unit: target.capacity.unit },
          tabKey: tabKey,
          category: tabKey,
          isPublicLibrary: !!target.act.isPublicLibrary
        })
      }
    }

    Cart.removeFromCart(target.cartId)
    this.setData({
      timeSlots: slots,
      cart: Cart.getCart(),
      dropMode: false,
      dropTarget: null,
      dropSelectedSlots: [],
      dropSlotChecked: []
    })
    this._refreshCurrentSlotDisplay()
    wx.showToast({ title: '已加入 ' + selected.length + ' 个时段', icon: 'success' })
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
      tabKey: activity.tabKey || activity.category || 'sport',
      category: activity.tabKey || activity.category || 'sport',
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
        var existing = templates[i] || {}
        if (existing.inheritedFrom) {
          template.inheritedFrom = existing.inheritedFrom
          template.inheritedAt = existing.inheritedAt || Date.now()
          template.dirty = true
        }
        templates[i] = template
        found = true
        break
      }
    }
    if (!found) {
      templates.unshift(template)
    }

    // 写入最优区间（日模板/合道模板）
    if (template.type === 'daily' || template.type === 'pool') {
      template.optimalTargets = this.data.optimalTargets
    }

    // 保存到本地存储
    var key = this._getStorageKey()
    var templates = []
    try { templates = wx.getStorageSync(key) || [] } catch(e) {}

    var found = false
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === template.id) {
        var existing = templates[i] || {}
        if (existing.inheritedFrom) {
          template.inheritedFrom = existing.inheritedFrom
          template.inheritedAt = existing.inheritedAt || Date.now()
          template.dirty = true
        }
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

  // 最优区间：输入某一项 min/max（field 形如 "activity.min" / "nutrition.protein.max"）
  onOptimalTargetInput: function(e) {
    var field = e.currentTarget.dataset.field || ''
    var val = parseFloat(e.detail.value)
    if (isNaN(val) || val < 0) return
    var parts = field.split('.')
    var t = JSON.parse(JSON.stringify(this.data.optimalTargets || {}))
    if (parts.length === 2) {
      if (!t[parts[0]]) t[parts[0]] = {}
      t[parts[0]][parts[1]] = Math.round(val * 10) / 10
    } else if (parts.length === 3) {
      if (!t[parts[0]]) t[parts[0]] = {}
      if (!t[parts[0]][parts[1]]) t[parts[0]][parts[1]] = {}
      t[parts[0]][parts[1]][parts[2]] = Math.round(val * 10) / 10
    }
    this.setData({ optimalTargets: t })
  },

  // 使用系统推荐（按 bodyProfile 计算）作为默认最优区间
  applyDefaultOptimalTargets: function() {
    var def = this._buildDefaultTargetsFromProfile()
    if (!def) return
    this.setData({ optimalTargets: def })
    wx.showToast({ title: '已应用推荐区间', icon: 'success' })
  },

  // 基于用户 bodyProfile 计算推荐默认区间（无则用全局 DEFAULT_OPTIMAL_TARGETS）
  _buildDefaultTargetsFromProfile: function() {
    var cached = this.data.defaultOptimalTargets
    if (cached) return cached
    var bp = null
    try {
      var profile = (app.globalData && app.globalData.userProfile) || {}
      if (profile && (profile.weightKg || profile.bodyProfile)) {
        bp = profile.bodyProfile || {
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          age: profile.age || 25,
          gender: profile.gender || 'male',
          goal: profile.goal || 'maintain',
          activityLevel: profile.activityLevel || 1.375
        }
      }
    } catch (e) { bp = null }
    var def
    if (optimalScore && typeof optimalScore.calcDefaultTargetsByBodyProfile === 'function' && bp) {
      def = optimalScore.calcDefaultTargetsByBodyProfile(bp)
    } else if (optimalScore && optimalScore.DEFAULT_OPTIMAL_TARGETS) {
      def = JSON.parse(JSON.stringify(optimalScore.DEFAULT_OPTIMAL_TARGETS))
    } else {
      def = {
        activity: { min: 300, max: 600 },
        nutrition: {
          protein: { min: 50, max: 80 }, carbs: { min: 200, max: 300 }, fat: { min: 40, max: 70 }, calories: { min: 1800, max: 2400 }
        }
      }
    }
    this.setData({ defaultOptimalTargets: def })
    return def
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
      return
    }

    this.setData({
      templateId: found.id,
      templateName: found.name,
      templateType: found.type
    })

    if (found.type === 'daily') {
      this.setData({
        timeSlots: found.timeSlots || DEFAULT_SLOTS,
        currentSlotId: 'dawn',
        optimalTargets: found.optimalTargets || (optimalScore && optimalScore.DEFAULT_OPTIMAL_TARGETS ? JSON.parse(JSON.stringify(optimalScore.DEFAULT_OPTIMAL_TARGETS)) : null) || this.data.optimalTargets
      })
      this._initWeekData()
    } else if (found.type === 'weekly') {
      this._initTimeSlots()
      this.setData({ weekData: found.weekData || {} })
    } else if (found.type === 'pool') {
      this._initTimeSlots()
      this._initWeekData()
      this.setData({
        poolActivities: found.poolActivities || [],
        scoreTarget: String(found.scoreTarget || ''),
        optimalTargets: found.optimalTargets || (optimalScore && optimalScore.DEFAULT_OPTIMAL_TARGETS ? JSON.parse(JSON.stringify(optimalScore.DEFAULT_OPTIMAL_TARGETS)) : null) || this.data.optimalTargets
      })
    }

    this._refreshCurrentSlotDisplay()
  },

  // ==================== 通用 ====================

  preventBubble: function() {}
})
