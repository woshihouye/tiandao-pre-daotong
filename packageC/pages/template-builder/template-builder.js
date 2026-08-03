// 自建模板配置页
var app = getApp()
var Alib = require('../../../utils/activity-library.js')

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

/** 食物侧栏分类（与主修行库一致） */
var FOOD_SIDE_FILTERS = [
  { key: 'all', name: '全部' },
  { key: 'meat', name: '肉类' },
  { key: 'vegetable', name: '蔬菜类' },
  { key: 'carb', name: '碳水类' },
  { key: 'supplement', name: '补剂类' },
  { key: 'nutrition', name: '营养品' },
  { key: 'medicine', name: '药品' }
]

/** 食物知识库 — 每100g营养数据（与主修行库完全一致） */
var FOOD_KNOWLEDGE_BASE = [
  // ---- 空白 ----
  { id: 'blank_diet', name: '空白', sideFilter: 'blank', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  // ---- 肉类 ----
  { id: 'food_chicken_breast', name: '鸡胸肉', sideFilter: 'meat', nutrition: { calories: 133, protein: 19.4, carbs: 2.5, fat: 5.0 } },
  { id: 'food_lean_beef', name: '瘦牛肉', sideFilter: 'meat', nutrition: { calories: 125, protein: 20.2, carbs: 0.2, fat: 4.2 } },
  { id: 'food_pork_tenderloin', name: '猪里脊', sideFilter: 'meat', nutrition: { calories: 155, protein: 20.2, carbs: 0.7, fat: 7.9 } },
  { id: 'food_salmon', name: '三文鱼', sideFilter: 'meat', nutrition: { calories: 139, protein: 17.2, carbs: 0, fat: 7.8 } },
  { id: 'food_sole_fish', name: '龙利鱼', sideFilter: 'meat', nutrition: { calories: 83, protein: 17.0, carbs: 0, fat: 1.4 } },
  { id: 'food_shrimp', name: '虾仁', sideFilter: 'meat', nutrition: { calories: 93, protein: 18.6, carbs: 0.3, fat: 1.4 } },
  { id: 'food_egg', name: '鸡蛋', sideFilter: 'meat', nutrition: { calories: 144, protein: 13.3, carbs: 1.5, fat: 8.8 } },
  { id: 'food_duck_egg', name: '鸭蛋', sideFilter: 'meat', nutrition: { calories: 180, protein: 12.6, carbs: 3.1, fat: 13.0 } },
  { id: 'food_chicken_thigh', name: '鸡腿肉（去皮）', sideFilter: 'meat', nutrition: { calories: 119, protein: 19.7, carbs: 0, fat: 4.0 } },
  { id: 'food_duck', name: '鸭肉', sideFilter: 'meat', nutrition: { calories: 240, protein: 15.5, carbs: 0.2, fat: 19.7 } },
  { id: 'food_lean_lamb', name: '瘦羊肉', sideFilter: 'meat', nutrition: { calories: 118, protein: 20.5, carbs: 0.2, fat: 3.9 } },
  { id: 'food_tuna', name: '金枪鱼', sideFilter: 'meat', nutrition: { calories: 108, protein: 23.3, carbs: 0, fat: 1.0 } },
  { id: 'food_cod', name: '鳕鱼', sideFilter: 'meat', nutrition: { calories: 88, protein: 20.4, carbs: 0, fat: 0.5 } },
  { id: 'food_chicken_sausage', name: '鸡胸肉肠', sideFilter: 'meat', nutrition: { calories: 110, protein: 20.0, carbs: 1.0, fat: 2.5 } },
  { id: 'food_braised_beef', name: '卤牛肉', sideFilter: 'meat', nutrition: { calories: 190, protein: 26.0, carbs: 1.8, fat: 8.0 } },
  // ---- 蔬菜类 ----
  { id: 'food_broccoli', name: '西兰花', sideFilter: 'vegetable', nutrition: { calories: 36, protein: 4.1, carbs: 4.5, fat: 0.3 } },
  { id: 'food_spinach', name: '菠菜', sideFilter: 'vegetable', nutrition: { calories: 28, protein: 2.6, carbs: 2.8, fat: 0.3 } },
  { id: 'food_lettuce', name: '生菜', sideFilter: 'vegetable', nutrition: { calories: 15, protein: 1.4, carbs: 1.6, fat: 0.2 } },
  { id: 'food_cucumber', name: '黄瓜', sideFilter: 'vegetable', nutrition: { calories: 16, protein: 0.7, carbs: 2.9, fat: 0.1 } },
  { id: 'food_tomato', name: '番茄', sideFilter: 'vegetable', nutrition: { calories: 20, protein: 0.9, carbs: 3.5, fat: 0.2 } },
  { id: 'food_celery', name: '芹菜', sideFilter: 'vegetable', nutrition: { calories: 17, protein: 0.8, carbs: 2.5, fat: 0.1 } },
  { id: 'food_asparagus', name: '芦笋', sideFilter: 'vegetable', nutrition: { calories: 22, protein: 2.2, carbs: 3.7, fat: 0.2 } },
  { id: 'food_baby_cabbage', name: '娃娃菜', sideFilter: 'vegetable', nutrition: { calories: 13, protein: 1.5, carbs: 2.2, fat: 0.1 } },
  { id: 'food_napa_cabbage', name: '白菜', sideFilter: 'vegetable', nutrition: { calories: 17, protein: 1.5, carbs: 2.4, fat: 0.2 } },
  { id: 'food_leaf_lettuce', name: '油麦菜', sideFilter: 'vegetable', nutrition: { calories: 15, protein: 1.5, carbs: 1.7, fat: 0.3 } },
  { id: 'food_carrot', name: '胡萝卜', sideFilter: 'vegetable', nutrition: { calories: 37, protein: 1.0, carbs: 7.7, fat: 0.2 } },
  { id: 'food_pumpkin', name: '南瓜', sideFilter: 'vegetable', nutrition: { calories: 23, protein: 0.7, carbs: 4.5, fat: 0.1 } },
  { id: 'food_winter_melon', name: '冬瓜', sideFilter: 'vegetable', nutrition: { calories: 12, protein: 0.4, carbs: 2.4, fat: 0.1 } },
  { id: 'food_bitter_melon', name: '苦瓜', sideFilter: 'vegetable', nutrition: { calories: 22, protein: 1.0, carbs: 3.5, fat: 0.1 } },
  { id: 'food_enoki', name: '金针菇', sideFilter: 'vegetable', nutrition: { calories: 32, protein: 2.7, carbs: 4.0, fat: 0.5 } },
  { id: 'food_shitake', name: '香菇', sideFilter: 'vegetable', nutrition: { calories: 26, protein: 2.2, carbs: 3.3, fat: 0.3 } },
  { id: 'food_wood_ear', name: '木耳', sideFilter: 'vegetable', nutrition: { calories: 27, protein: 1.5, carbs: 5.5, fat: 0.2 } },
  { id: 'food_kelp', name: '海带', sideFilter: 'vegetable', nutrition: { calories: 13, protein: 1.2, carbs: 1.6, fat: 0.1 } },
  { id: 'food_purple_cabbage', name: '紫甘蓝', sideFilter: 'vegetable', nutrition: { calories: 25, protein: 1.4, carbs: 4.8, fat: 0.1 } },
  { id: 'food_green_pepper', name: '青椒', sideFilter: 'vegetable', nutrition: { calories: 22, protein: 1.0, carbs: 4.2, fat: 0.2 } },
  // ---- 碳水类 ----
  { id: 'food_rice', name: '米饭', sideFilter: 'carb', nutrition: { calories: 116, protein: 2.6, carbs: 25.6, fat: 0.3 } },
  { id: 'food_steamed_bun', name: '馒头', sideFilter: 'carb', nutrition: { calories: 223, protein: 7.0, carbs: 44.2, fat: 1.1 } },
  { id: 'food_whole_wheat_bread', name: '全麦面包', sideFilter: 'carb', nutrition: { calories: 246, protein: 10.9, carbs: 42.7, fat: 3.4 } },
  { id: 'food_oats', name: '燕麦片', sideFilter: 'carb', nutrition: { calories: 367, protein: 11.3, carbs: 60.6, fat: 6.7 } },
  { id: 'food_sweet_potato', name: '红薯', sideFilter: 'carb', nutrition: { calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1 } },
  { id: 'food_purple_potato', name: '紫薯', sideFilter: 'carb', nutrition: { calories: 82, protein: 1.8, carbs: 17.6, fat: 0.2 } },
  { id: 'food_corn', name: '玉米', sideFilter: 'carb', nutrition: { calories: 112, protein: 4.0, carbs: 19.9, fat: 1.2 } },
  { id: 'food_noodles', name: '面条', sideFilter: 'carb', nutrition: { calories: 284, protein: 8.3, carbs: 54.7, fat: 0.7 } },
  { id: 'food_brown_rice', name: '糙米', sideFilter: 'carb', nutrition: { calories: 111, protein: 2.5, carbs: 23.0, fat: 0.9 } },
  { id: 'food_millet_porridge', name: '小米粥', sideFilter: 'carb', nutrition: { calories: 46, protein: 1.4, carbs: 8.4, fat: 0.7 } },
  { id: 'food_buckwheat_noodles', name: '荞麦面', sideFilter: 'carb', nutrition: { calories: 329, protein: 11.3, carbs: 60.0, fat: 2.8 } },
  { id: 'food_yam', name: '山药', sideFilter: 'carb', nutrition: { calories: 57, protein: 1.9, carbs: 11.6, fat: 0.1 } },
  { id: 'food_potato', name: '土豆', sideFilter: 'carb', nutrition: { calories: 81, protein: 2.0, carbs: 16.5, fat: 0.2 } },
  { id: 'food_toast', name: '吐司', sideFilter: 'carb', nutrition: { calories: 278, protein: 8.4, carbs: 49.6, fat: 3.9 } },
  { id: 'food_pasta', name: '意面', sideFilter: 'carb', nutrition: { calories: 350, protein: 12.0, carbs: 71.0, fat: 1.5 } },
  // ---- 补剂类 ----
  { id: 'food_whey_protein', name: '乳清蛋白粉', sideFilter: 'supplement', nutrition: { calories: 390, protein: 75.0, carbs: 10.0, fat: 5.0 } },
  { id: 'food_creatine', name: '肌酸', sideFilter: 'supplement', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { id: 'food_bcaa', name: '支链氨基酸', sideFilter: 'supplement', nutrition: { calories: 400, protein: 100.0, carbs: 0, fat: 0 } },
  { id: 'food_pre_workout', name: '氮泵', sideFilter: 'supplement', nutrition: { calories: 300, protein: 5.0, carbs: 60.0, fat: 1.0 } },
  { id: 'food_fish_oil', name: '鱼油', sideFilter: 'supplement', nutrition: { calories: 900, protein: 0, carbs: 0, fat: 100.0 } },
  { id: 'food_vitamin_c', name: '维生素C', sideFilter: 'supplement', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { id: 'food_multivitamin', name: '复合维生素', sideFilter: 'supplement', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { id: 'food_calcium', name: '钙片', sideFilter: 'supplement', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  // ---- 营养品 ----
  { id: 'food_milk', name: '牛奶', sideFilter: 'nutrition', nutrition: { calories: 66, protein: 3.2, carbs: 4.9, fat: 3.6 } },
  { id: 'food_yogurt', name: '无糖酸奶', sideFilter: 'nutrition', nutrition: { calories: 72, protein: 5.7, carbs: 9.3, fat: 1.3 } },
  { id: 'food_soy_milk', name: '豆浆', sideFilter: 'nutrition', nutrition: { calories: 31, protein: 3.2, carbs: 1.2, fat: 1.6 } },
  { id: 'food_walnut', name: '核桃', sideFilter: 'nutrition', nutrition: { calories: 627, protein: 16.1, carbs: 10.1, fat: 58.8 } },
  { id: 'food_almond', name: '杏仁', sideFilter: 'nutrition', nutrition: { calories: 578, protein: 21.2, carbs: 19.7, fat: 49.9 } },
  { id: 'food_peanut', name: '花生', sideFilter: 'nutrition', nutrition: { calories: 563, protein: 24.8, carbs: 16.1, fat: 44.3 } },
  { id: 'food_black_sesame', name: '黑芝麻', sideFilter: 'nutrition', nutrition: { calories: 559, protein: 19.7, carbs: 11.6, fat: 46.1 } },
  { id: 'food_goji', name: '枸杞', sideFilter: 'nutrition', nutrition: { calories: 349, protein: 14.3, carbs: 64.0, fat: 1.5 } },
  { id: 'food_red_date', name: '红枣', sideFilter: 'nutrition', nutrition: { calories: 276, protein: 3.4, carbs: 64.0, fat: 0.4 } },
  { id: 'food_honey', name: '蜂蜜', sideFilter: 'nutrition', nutrition: { calories: 321, protein: 0.4, carbs: 75.6, fat: 0.2 } },
  // ---- 药品 ----
  { id: 'food_ibuprofen', name: '布洛芬', sideFilter: 'medicine', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { id: 'food_cold_medicine', name: '感冒灵', sideFilter: 'medicine', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { id: 'food_amoxicillin', name: '阿莫西林', sideFilter: 'medicine', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { id: 'food_omeprazole', name: '奥美拉唑', sideFilter: 'medicine', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { id: 'food_montmorillonite', name: '蒙脱石散', sideFilter: 'medicine', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { id: 'food_vitamin_b', name: '维生素B族', sideFilter: 'medicine', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
]

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

    // 活动库
    categories: Alib.CATEGORIES,
    currentCategory: 'sport',
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
    if (cat === 'diet') {
      // 食·丹食 使用食物自定义侧栏（与主修行库一致）
      this.setData({ libSideFilters: FOOD_SIDE_FILTERS, currentLibSide: 'all' })
      this._loadLibActivities()
      return
    }
    var config = Alib.FILTER_CONFIGS[cat] || { side: [] }
    this.setData({ libSideFilters: config.side || [], currentLibSide: 'all' })
    this._loadLibActivities()
  },

  switchLibCategory: function(e) {
    var cat = e.currentTarget.dataset.cat
    this.setData({ currentCategory: cat, currentLibSide: 'all', libKeyword: '' })
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

    var list = []

    // 食·丹食 使用食物知识库（与主修行库数据源一致）
    if (cat === 'diet') {
      if (kw && kw.trim()) {
        var kwLower = kw.trim().toLowerCase()
        for (var fi = 0; fi < FOOD_KNOWLEDGE_BASE.length; fi++) {
          var foodItem = FOOD_KNOWLEDGE_BASE[fi]
          if (foodItem.name.toLowerCase().indexOf(kwLower) !== -1) {
            list.push({
              id: foodItem.id, name: foodItem.name, category: 'diet', tabKey: 'diet',
              sideFilter: foodItem.sideFilter, isFood: true
            })
          }
        }
        // 同时搜索自定义食物
        var customFoodsSrch = []
        try { customFoodsSrch = wx.getStorageSync('tiandao_custom_food_' + this._getUid()) || [] } catch(e) {}
        for (var cfs = 0; cfs < customFoodsSrch.length; cfs++) {
          var cfsItem = customFoodsSrch[cfs]
          if (cfsItem.name.toLowerCase().indexOf(kwLower) !== -1) {
            cfsItem.category = 'diet'; cfsItem.tabKey = 'diet'; cfsItem.isFood = true
            list.unshift(cfsItem)
          }
        }
      } else {
        // 非搜索：按侧栏筛选食物知识库
        for (var fm = 0; fm < FOOD_KNOWLEDGE_BASE.length; fm++) {
          var fmItem = FOOD_KNOWLEDGE_BASE[fm]
          if (side === 'all' || fmItem.sideFilter === side) {
            list.push({
              id: fmItem.id, name: fmItem.name, category: 'diet', tabKey: 'diet',
              sideFilter: fmItem.sideFilter, isFood: true
            })
          }
        }
        // 合并自定义食物
        var customFoodsAll = []
        try { customFoodsAll = wx.getStorageSync('tiandao_custom_food_' + this._getUid()) || [] } catch(e) {}
        var customFoodFiltered = []
        for (var cfn = 0; cfn < customFoodsAll.length; cfn++) {
          var cfnItem = customFoodsAll[cfn]
          if (side === 'all' || cfnItem.sideFilter === side) {
            cfnItem.category = 'diet'; cfnItem.tabKey = 'diet'; cfnItem.isFood = true
            customFoodFiltered.push(cfnItem)
          }
        }
        list = customFoodFiltered.concat(list)
      }
      // 全部视图下，空白食物固定置顶
      if (side === 'all') {
        for (var bfi = 0; bfi < list.length; bfi++) {
          if (list[bfi].id === 'blank_diet') {
            var blankFood = list.splice(bfi, 1)[0]
            list.unshift(blankFood)
            break
          }
        }
      }
      this.setData({ libActivities: list })
      return
    }

    if (kw && kw.trim()) {
      list = Alib.searchActivities(kw, cat)
      // 同时搜索自定义活动
      var customAll = []
      try { customAll = wx.getStorageSync('tiandao_custom_act_' + this._getUid()) || [] } catch(e) {}
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
      // 合并自定义活动
      var customAll2 = []
      try { customAll2 = wx.getStorageSync('tiandao_custom_act_' + this._getUid()) || [] } catch(e) {}
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

    // 全部视图下，空白活动固定置顶（自定义活动可能已排到前面）
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
    var edits = {}
    try { edits = wx.getStorageSync('tiandao_act_edits_' + this._getUid()) || {} } catch(e) {}
    for (var k = 0; k < list.length; k++) {
      var edit = edits[list[k].id]
      if (edit) {
        if (edit.scorePerUnit !== undefined) list[k].scorePerUnit = edit.scorePerUnit
        if (edit.unit !== undefined) list[k].unit = edit.unit
        if (edit.defaultGroup !== undefined) list[k].defaultGroup = edit.defaultGroup
      }
    }

    this.setData({ libActivities: list })
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
          category: act.tabKey || this.data.currentCategory
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
      category: activity.tabKey || this.data.currentCategory
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

    this._initLibSideFilters()
    this._loadLibActivities()
    this._refreshCurrentSlotDisplay()
  },

  // ==================== 通用 ====================

  preventBubble: function() {}
})
