// 大道之行 · 活动库
var app = getApp()
var Alib = require('../../../utils/activity-library.js')
var MetaCards = require('../../../utils/meta-cards.js')
var DefaultTemplates = require('../../../utils/default-templates.js')
var Cart = require('../../../utils/cart.js')

// 6 大道则 → 5 大类反向映射（分类 tab 切换时，底层查询仍用 5 大类 key）
var GRAND_DAO_TO_CATEGORY = {}
for (var gdKey in Alib.GRAND_DAO_MAP) {
  if (Object.prototype.hasOwnProperty.call(Alib.GRAND_DAO_MAP, gdKey)) {
    GRAND_DAO_TO_CATEGORY[Alib.GRAND_DAO_MAP[gdKey]] = gdKey
  }
}

/** 置顶本地存储 key 前缀 */
var PIN_STORAGE_PREFIX = 'tiandao_actlib_pin_'
/** 自定义活动存储 key 前缀 */
var CUSTOM_STORAGE_PREFIX = 'tiandao_custom_act_'
/** 自定义食物存储 key 前缀 */
var CUSTOM_FOOD_PREFIX = 'tiandao_custom_food_'

/** 食物侧栏分类 */
var FOOD_SIDE_FILTERS = [
  { key: 'all', name: '全部' },
  { key: 'meat', name: '肉类' },
  { key: 'vegetable', name: '蔬菜类' },
  { key: 'carb', name: '碳水类' },
  { key: 'supplement', name: '补剂类' },
  { key: 'nutrition', name: '营养品' },
  { key: 'medicine', name: '药品' },
  { key: 'unknown', name: '不知道' }
]

/** 食物知识库 — 每100g营养数据 */
var FOOD_KNOWLEDGE_BASE = [
  // ---- 空白 ----
  { id: 'blank_diet', name: '空白', sideFilter: 'unknown', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
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

/** 获取食物侧栏名称 */
function getFoodSideName(key) {
  for (var i = 0; i < FOOD_SIDE_FILTERS.length; i++) {
    if (FOOD_SIDE_FILTERS[i].key === key) return FOOD_SIDE_FILTERS[i].name
  }
  return ''
}

Page({
  data: {
    themeClass: '',
    categories: Alib.GRAND_DAO_TABS,
    currentCategory: 'sport',
    currentGrandDao: 'li',

    // 筛选
    sideFilters: [],
    currentSideFilter: 'all',
    cardMode: 'default',  // 'study' | 'food' | 'default'
    viewMode: 'browse',   // 'browse'=修行库货架 | 'butian'=补天·创建

    // 元卡浏览（sport / diet 维度）
    currentSubcategory: 'all', // 当前子集筛选
    currentMetaCard: '',       // 当前元卡筛选（空=全部）
    metaCardSearchKeyword: '', // 动作搜索关键词
    metaCardSearchResults: [], // 动作搜索匹配结果

    // 活动数据
    activities: [],
    searchKeyword: '',

    // 置顶集合（ID 集合）
    pinned: {},

    // 管理员标识
    isAdmin: false,

    // "历史活动卡" 筛选（练过的活动）
    showTrainedOnly: false,
    trainedActivityIds: {},
    showAllTagsOff: false,  // false=不限，true=只看未打标签
    selectedTag: '',        // 当前选中的 tag，空='全部'
    allTags: [],            // 聚合后的标签列表

    // 活动详情弹窗
    showActivityDetail: false,
    activityDetail: null,

    // 调整分类弹窗（元卡改造）
    showReclassifyModal: false,
    reclassifyActivity: null,
    reclassifyMetaCards: [
      { key: 'push', name: '推', subcategory: 'anaerobic' },
      { key: 'pull', name: '拉', subcategory: 'anaerobic' },
      { key: 'squat', name: '蹲', subcategory: 'anaerobic' },
      { key: 'hold', name: '撑', subcategory: 'core' },
      { key: 'curl', name: '卷', subcategory: 'core' },
      { key: 'steady_cardio', name: '稳态有氧', subcategory: 'cardio' },
      { key: 'interval_cardio', name: '间歇有氧', subcategory: 'cardio' },
      { key: 'unknown', name: '不知道', subcategory: 'unknown' }
    ],
    selectedReclassifyMetaCard: '',

    // --- 活动编辑弹窗 ---
    showEditModal: false,
    editData: {
      id: '',
      name: '',
      scorePerUnit: '',
      defaultGroup: '1',
      unitIndex: 0,
      categoryIndex: 0,
      isCustom: false,
      isNegative: false
    },
    editUnitOptions: ['次', '组', '分钟', '份'],
    editCategoryOptions: [],

    // --- 修心详情面板 ---
    showStudyDetail: false,
    studyDetail: {
      id: '',
      name: '',
      categoryName: '',
      calcUnit: 'time',
      baseScore: 0,
      inputValue: 10,
      totalScore: 0,
      isCustom: false
    },

    // --- 食物详情面板 ---
    showFoodDetail: false,
    foodDetail: {
      id: '',
      name: '',
      categoryName: '',
      nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      weight: 100,
      converted: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      isCustom: false
    },

    // --- 新建食物弹窗 ---
    showFoodModal: false,
    _editingFoodId: '',
    foodFormData: {
      name: '',
      sideFilterIndex: 0,
      calories: '',
      protein: '',
      carbs: '',
      fat: ''
    },
    foodFormSideOptions: FOOD_SIDE_FILTERS.filter(function(f) { return f.key !== 'all' }),

    // --- 元卡详情面板 ---
    showMetaDetail: false,
    metaDetail: {
      id: '',
      name: '',
      description: '',
      muscles: '',
      movements: []
    }
  },

  // ==================== 生命周期 ====================

  onLoad: function() {
    var tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    // 检测管理员权限
    var isAdmin = false
    if (app.globalData && app.globalData.userProfile) {
      var profile = app.globalData.userProfile
      // 通过角色字段或编辑权限标识判断管理员
      if (profile.role === 'admin' || profile.isAdmin || profile.canEdit) {
        isAdmin = true
      }
    }
    this.setData({ themeClass: tc, isAdmin: isAdmin })
    this._loadPinned()
    this._initFilters()
    this._reloadActivities()
    this._migrateLegacyCustomActivities()
    // 首次进入：初始化默认活动卡（云端，幂等）→ 完成后初始化默认模板（本地）
    this._initDefaultActivities()
  },

  onShow: function() {
    var tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    if (tc !== this.data.themeClass) {
      this.setData({ themeClass: tc })
    }
    // 刷新管理员状态
    var isAdmin = false
    if (app.globalData && app.globalData.userProfile) {
      var profile = app.globalData.userProfile
      if (profile.role === 'admin' || profile.isAdmin || profile.canEdit) {
        isAdmin = true
      }
    }
    if (isAdmin !== this.data.isAdmin) {
      this.setData({ isAdmin: isAdmin })
    }
    // 每次回显时刷新列表（自定义活动可能在其他地方被修改）
    this._reloadActivities()
  },

  // ==================== 置顶 ====================

  _getUid: function() {
    return (app.globalData && app.globalData.userId) || 'default'
  },

  _getPinStorageKey: function() {
    return PIN_STORAGE_PREFIX + this._getUid()
  },

  _loadPinned: function() {
    try {
      var data = wx.getStorageSync(this._getPinStorageKey()) || {}
      this.setData({ pinned: data })
    } catch (e) {
      this.setData({ pinned: {} })
    }
  },

  _savePinned: function(pinObj) {
    try {
      wx.setStorageSync(this._getPinStorageKey(), pinObj)
    } catch (e) {}
  },

  /** 切换置顶状态 */
  togglePin: function(e) {
    var activityId = e.currentTarget.dataset.id
    if (!activityId) return
    var pin = this.data.pinned || {}
    if (pin[activityId]) {
      delete pin[activityId]
    } else {
      pin[activityId] = true
    }
    this.setData({ pinned: pin })
    this._savePinned(pin)
    // 即时重新排序
    this.setData({ activities: this._sortByUsage(this.data.activities) })
  },

  // ==================== 自定义活动存储 ====================

  _getCustomStorageKey: function() {
    return CUSTOM_STORAGE_PREFIX + this._getUid()
  },

  _loadCustomActivities: function() {
    try {
      return wx.getStorageSync(this._getCustomStorageKey()) || []
    } catch (e) {
      return []
    }
  },

  _saveCustomActivities: function(list) {
    try {
      wx.setStorageSync(this._getCustomStorageKey(), list)
    } catch (e) {}
  },

  // ==================== 自定义食物存储 ====================

  _getCustomFoodKey: function() {
    return CUSTOM_FOOD_PREFIX + this._getUid()
  },

  _loadCustomFoods: function() {
    try {
      return wx.getStorageSync(this._getCustomFoodKey()) || []
    } catch (e) {
      return []
    }
  },

  _saveCustomFoods: function(list) {
    try {
      wx.setStorageSync(this._getCustomFoodKey(), list)
    } catch (e) {}
  },

  // ==================== 筛选初始化 ====================

  _initFilters: function() {
    var cat = this.data.currentCategory
    if (cat === 'diet') {
      // 食·丹食 元卡改造：使用 categories 侧栏 + metaCards 筛选
      var dietConfig = Alib.FILTER_CONFIGS.diet || { categories: [], metaCards: [] }
      var dietSideFilters = dietConfig.categories || []
      this.setData({
        sideFilters: dietSideFilters,
        currentSideFilter: 'all',
        currentSubcategory: 'all',
        currentMetaCard: '',
        currentDietGoal: 'all'
      })
    } else if (cat === 'sport') {
      // 元卡改造：sport 使用子集侧栏筛选
      this.setData({
        sideFilters: [
          { key: 'all', name: '全部分类' },
          { key: 'anaerobic', name: '无氧力量' },
          { key: 'core', name: '核心训练' },
          { key: 'cardio', name: '有氧心肺' },
          { key: 'unknown', name: '不知道' }
        ],
        currentSideFilter: 'all',
        currentSubcategory: 'all',
        currentMetaCard: ''
      })
    } else if (cat === 'study') {
      // 悟·修心 元卡改造：使用 categories 侧栏 + metaCards 筛选
      var studyConfig = Alib.FILTER_CONFIGS.study || { categories: [], metaCards: [] }
      var studySideFilters = studyConfig.categories || []
      this.setData({
        sideFilters: studySideFilters,
        currentSideFilter: 'all',
        currentSubcategory: 'all',
        currentMetaCard: ''
      })
    } else if (cat === 'work') {
      // 工·功业 元卡改造：使用 categories 侧栏 + metaCards 筛选
      var workConfig = Alib.FILTER_CONFIGS.work || { categories: [], metaCards: [] }
      var workSideFilters = workConfig.categories || []
      this.setData({
        sideFilters: workSideFilters,
        currentSideFilter: 'all',
        currentSubcategory: 'all',
        currentMetaCard: ''
      })
    } else if (cat === 'debuff') {
      // 煞·心魔 元卡改造：使用 categories 侧栏 + metaCards 筛选
      var debuffConfig = Alib.FILTER_CONFIGS.debuff || { categories: [], metaCards: [] }
      var debuffSideFilters = debuffConfig.categories || []
      this.setData({
        sideFilters: debuffSideFilters,
        currentSideFilter: 'all',
        currentSubcategory: 'all',
        currentMetaCard: ''
      })
    } else {
      var config = Alib.FILTER_CONFIGS[cat] || { top: [], side: [] }
      var sideFilters = config.side || []
      this.setData({
        sideFilters: sideFilters,
        currentSideFilter: 'all'
      })
    }
  },

  // ==================== 分类切换 ====================

  switchCategory: function(e) {
    var gd = e.currentTarget.dataset.category
    var cat = GRAND_DAO_TO_CATEGORY[gd] || ''
    this.setData({
      currentGrandDao: gd,
      currentCategory: cat,
      searchKeyword: '',
      currentSideFilter: 'all',
      metaCardSearchKeyword: '',
      metaCardSearchResults: [],
      activities: []          // 切换时立即清空，避免旧分类列表滞留
    })
    // 自由道 zi：无现有 5 大类映射，展示空态
    if (!cat) {
      this.setData({ sideFilters: [], allTags: [] })
      return
    }
    this._initFilters()
    this._reloadActivities()
  },

  /** 模式切换：browse=货架 / butian=补天创建 */
  switchMode: function (e) {
    var mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.viewMode) return
    this.setData({
      viewMode: mode,
      searchKeyword: '',
      metaCardSearchKeyword: '',
      metaCardSearchResults: [],
      currentSideFilter: 'all',
      currentSubcategory: 'all',
      currentMetaCard: '',
      activities: []
    })
    this._initFilters()
    this._reloadActivities()
  },

  /** 按分类构建元卡列表（补天模式专用，复用现有 5 个元卡构建函数） */
  _buildMetaCardsByCategory: function (cat, kw) {
    var metaActs = []
    if (cat === 'sport') metaActs = this._buildMetaCardActivities()
    else if (cat === 'diet') metaActs = this._buildDietMetaCardActivities()
    else if (cat === 'study') metaActs = this._buildStudyMetaCardActivities()
    else if (cat === 'work') metaActs = this._buildWorkMetaCardActivities()
    else if (cat === 'debuff') metaActs = this._buildDebuffMetaCardActivities()

    if (kw && kw.trim()) {
      var kwLower = kw.trim().toLowerCase()
      metaActs = metaActs.filter(function (ma) {
        return ma.name.toLowerCase().indexOf(kwLower) !== -1 ||
          (ma.description && ma.description.toLowerCase().indexOf(kwLower) !== -1)
      })
    }
    return metaActs
  },

  // ==================== 筛选 ====================

  tapSideFilter: function(e) {
    var key = e.currentTarget.dataset.key
    if (this.data.currentCategory === 'sport' || this.data.currentCategory === 'diet' || this.data.currentCategory === 'study' || this.data.currentCategory === 'work' || this.data.currentCategory === 'debuff') {
      this.setData({ currentSideFilter: key, currentSubcategory: key })
    } else {
      this.setData({ currentSideFilter: key })
    }
    this._reloadActivities()
  },

  // ==================== 搜索 ====================

  onSearchInput: function(e) {
    var kw = e.detail.value
    this.setData({ searchKeyword: kw, metaCardSearchKeyword: kw, metaCardSearchResults: [] })

    // sport 维度：搜索动作模板
    if (this.data.currentCategory === 'sport' && kw && kw.trim()) {
      var templates = MetaCards.MOVEMENT_TEMPLATES
      var results = []
      var kwLower = kw.trim().toLowerCase()
      for (var name in templates) {
        if (Object.prototype.hasOwnProperty.call(templates, name)) {
          if (name.toLowerCase().indexOf(kwLower) !== -1) {
            var t = templates[name]
            var metaCard = MetaCards.getMetaCard(t.metaCard)
            results.push({
              name: name,
              metaCard: t.metaCard,
              metaCardName: metaCard ? metaCard.name : t.metaCard,
              muscles: t.muscles
            })
          }
        }
      }
      // 限制最多 20 条
      if (results.length > 20) results = results.slice(0, 20)
      this.setData({ metaCardSearchResults: results })
    }

    this._reloadActivities()
  },

  clearSearch: function() {
    this.setData({ searchKeyword: '', metaCardSearchKeyword: '', metaCardSearchResults: [] })
    this._reloadActivities()
  },

  // ==================== 元卡：虚拟活动注入（sport 维度）====================

  /**
   * 构建 diet 元卡活动列表（3 张）
   */
  _buildDietMetaCardActivities: function() {
    var cards = MetaCards.META_CARDS
    var sub = this.data.currentSubcategory || 'all'
    var mc = this.data.currentMetaCard || ''
    var arr = []

    // 子集（增肌/减脂/养生/我free啦/不知道）到元卡的映射
    var goalCardMap = {
      bulk: ['precision'],
      cut: ['precision'],
      health: ['daily', 'precision'],
      free: ['diet_free'],
      unknown: ['diet_free']
    }

    for (var key in cards) {
      if (!Object.prototype.hasOwnProperty.call(cards, key)) continue
      var card = cards[key]
      if (card.category !== 'diet') continue

      // 元卡筛选
      if (mc && card.id !== mc) continue

      // 子集（目标）筛选
      if (sub !== 'all') {
        var allowedCards = goalCardMap[sub] || []
        if (allowedCards.indexOf(card.id) === -1) continue
      }

      // 构建参数摘要
      var summary = ''
      if (card.selectParams) {
        var names = []
        for (var i = 0; i < card.selectParams.length; i++) {
          names.push(card.selectParams[i].name)
        }
        summary = names.slice(0, 3).join('·')
      } else if (card.paramPool && card.paramPool.primary) {
        var pNames = []
        for (var j = 0; j < card.paramPool.primary.length; j++) {
          pNames.push(card.paramPool.primary[j].name)
        }
        summary = pNames.slice(0, 3).join('·')
      }

      arr.push({
        id: 'meta_' + card.id,
        name: card.name,
        category: 'diet',
        tabKey: 'diet',
        metaCardId: card.id,
        description: card.description,
        unit: '次',
        scorePerUnit: 1,
        presetAction: '',
        isOfficial: false,
        isCustom: false,
        isPublic: false,
        sideFilter: sub !== 'all' ? sub : 'all',
        _isMetaCard: true,
        _muscleSummary: summary,
        ext: {},
        tags: [],
        __keys: []
      })
    }
    return arr
  },

  /**
   * 构建 study 元卡活动列表（3 张 - 输入/处理/输出）
   */
  _buildStudyMetaCardActivities: function() {
    var cards = MetaCards.META_CARDS
    var sub = this.data.currentSubcategory || 'all'
    var mc = this.data.currentMetaCard || ''
    var arr = []

    // 子集（学知识/练技艺/见世面/赛博修行/不知道）到元卡的映射
    var goalCardMap = {
      knowledge: ['input', 'process'],
      skill: ['process', 'output'],
      worldly: ['input'],
      cyber: ['input', 'process', 'output'],
      unknown: ['output']
    }

    for (var key in cards) {
      if (!Object.prototype.hasOwnProperty.call(cards, key)) continue
      var card = cards[key]
      if (card.category !== 'study') continue

      if (mc && card.id !== mc) continue

      if (sub !== 'all') {
        var allowedCards = goalCardMap[sub] || []
        if (allowedCards.indexOf(card.id) === -1) continue
      }

      // 构建参数摘要
      var summary = ''
      if (card.selectParams) {
        var names = []
        for (var i = 0; i < card.selectParams.length; i++) {
          names.push(card.selectParams[i].name)
        }
        summary = names.slice(0, 3).join('·')
      }

      arr.push({
        id: 'meta_' + card.id,
        name: card.name,
        category: 'study',
        tabKey: 'study',
        metaCardId: card.id,
        description: card.description,
        unit: '次',
        scorePerUnit: 1,
        presetAction: '',
        isOfficial: false,
        isCustom: false,
        isPublic: false,
        sideFilter: sub !== 'all' ? sub : 'all',
        _isMetaCard: true,
        _muscleSummary: summary,
        ext: {},
        tags: [],
        __keys: []
      })
    }
    return arr
  },

  _buildWorkMetaCardActivities: function() {
    var cards = MetaCards.META_CARDS
    var sub = this.data.currentSubcategory || 'all'
    var mc = this.data.currentMetaCard || ''
    var arr = []

    // 子集（开天/补天/有意思/不好玩/不知道）到元卡的映射
    var goalCardMap = {
      kaitian: ['plan', 'talk'],
      butian: ['execute', 'talk'],
      fun: ['plan', 'execute'],
      boring: ['execute'],
      unknown: ['talk']
    }

    for (var key in cards) {
      if (!Object.prototype.hasOwnProperty.call(cards, key)) continue
      var card = cards[key]
      if (card.category !== 'work') continue

      if (mc && card.id !== mc) continue

      if (sub !== 'all') {
        var allowedCards = goalCardMap[sub] || []
        if (allowedCards.indexOf(card.id) === -1) continue
      }

      // 构建参数摘要
      var summary = ''
      if (card.selectParams) {
        var names = []
        for (var i = 0; i < card.selectParams.length; i++) {
          names.push(card.selectParams[i].name)
        }
        summary = names.slice(0, 3).join('·')
      }

      arr.push({
        id: 'meta_' + card.id,
        name: card.name,
        category: 'work',
        tabKey: 'work',
        metaCardId: card.id,
        description: card.description,
        unit: '次',
        scorePerUnit: 1,
        presetAction: '',
        isOfficial: false,
        isCustom: false,
        isPublic: false,
        sideFilter: sub !== 'all' ? sub : 'all',
        _isMetaCard: true,
        _muscleSummary: summary,
        ext: {},
        tags: [],
        __keys: []
      })
    }
    return arr
  },

  _buildDebuffMetaCardActivities: function() {
    var cards = MetaCards.META_CARDS
    var sub = this.data.currentSubcategory || 'all'
    var mc = this.data.currentMetaCard || ''
    var arr = []

    for (var key in cards) {
      if (!Object.prototype.hasOwnProperty.call(cards, key)) continue
      var card = cards[key]
      if (card.category !== 'debuff') continue

      if (mc && card.id !== mc) continue

      // 子集筛选：伤身/乱食/溺屏/内耗 → 各对应一张元卡
      if (sub !== 'all') {
        // body_hurt → body_harm, eat_chaos → eat_chaos, screen_lost → screen_lost, inner_demon → inner_demon
        if (sub === 'body_hurt' && card.id !== 'body_harm') continue
        if (sub === 'eat_chaos' && card.id !== 'eat_chaos') continue
        if (sub === 'screen_lost' && card.id !== 'screen_lost') continue
        if (sub === 'inner_demon' && card.id !== 'inner_demon') continue
        if (sub === 'unknown' && card.id !== 'inner_demon') continue
      }

      // 构建参数摘要
      var summary = ''
      if (card.selectParams) {
        var names = []
        for (var i = 0; i < card.selectParams.length; i++) {
          names.push(card.selectParams[i].name)
        }
        summary = names.slice(0, 2).join('·')
      }

      arr.push({
        id: 'meta_' + card.id,
        name: card.name,
        category: 'debuff',
        tabKey: 'debuff',
        metaCardId: card.id,
        description: card.description,
        unit: '次',
        scorePerUnit: -1,
        presetAction: '',
        isOfficial: false,
        isCustom: false,
        isPublic: false,
        sideFilter: sub !== 'all' ? sub : 'all',
        _isMetaCard: true,
        _muscleSummary: summary,
        ext: {},
        tags: [],
        __keys: []
      })
    }
    return arr
  },

  /**
   * 构建 8 张元卡为普通活动对象，混入 activities 列表统一渲染
   * @returns {Array} 8 个虚拟活动对象
   */
  _buildMetaCardActivities: function() {
    var cards = MetaCards.META_CARDS
    var sub = this.data.currentSubcategory
    var mc = this.data.currentMetaCard
    var arr = []
    var sideMap = { push: 'push', pull: 'pull', squat: 'squat', hold: 'core', curl: 'core', steady_cardio: 'cardio', interval_cardio: 'cardio', unknown: 'unknown' }

    for (var key in cards) {
      if (!Object.prototype.hasOwnProperty.call(cards, key)) continue
      var card = cards[key]

      // 排除 diet/study/work/debuff 元卡（sport 卡无 category 字段）
      if (card.category === 'diet' || card.category === 'study' || card.category === 'work' || card.category === 'debuff') continue

      // 子集筛选
      if (sub !== 'all' && card.subcategory !== sub) continue
      // 元卡筛选
      if (mc && card.id !== mc) continue

      // 构建肌群摘要
      var muscleNames = []
      var pool = card.musclePool || card.paramPool
      if (pool && pool.primary) {
        for (var i = 0; i < pool.primary.length; i++) {
          muscleNames.push(pool.primary[i].name)
        }
      }
      var muscleSummary = muscleNames.length > 0 ? muscleNames.slice(0, 3).join('·') : ''

      arr.push({
        id: 'meta_' + card.id,
        name: card.name,
        category: 'sport',
        tabKey: 'sport',
        metaCardId: card.id,
        description: card.description,
        unit: '次',
        scorePerUnit: 1,
        presetAction: '',
        isOfficial: false,
        isCustom: false,
        isPublic: false,
        sideFilter: sideMap[card.id] || card.subcategory,
        _isMetaCard: true,
        _muscleSummary: muscleSummary,
        ext: {},
        tags: [],
        __keys: []
      })
    }
    return arr
  },

  /** 获取某元卡的建议衍生活动 */
  _getMetaCardMovements: function(metaCardId) {
    var templates = MetaCards.MOVEMENT_TEMPLATES
    var result = []
    for (var name in templates) {
      if (!Object.prototype.hasOwnProperty.call(templates, name)) continue
      if (templates[name].metaCard === metaCardId) {
        result.push(name)
      }
    }
    return result.slice(0, 8)
  },

  /** 元卡子集筛选 */
  onSubcategoryTap: function(e) {
    var key = e.currentTarget.dataset.key
    this.setData({ currentSubcategory: key })
    this._reloadActivities()
  },

  /** 元卡筛选 */
  onMetaCardFilterTap: function(e) {
    var key = e.currentTarget.dataset.key
    this.setData({ currentMetaCard: key })
    this._reloadActivities()
  },

  /** 打开元卡详情面板 */
  _openMetaDetail: function(metaActivity) {
    var card = MetaCards.getMetaCard ? MetaCards.getMetaCard(metaActivity.metaCardId) : (MetaCards.META_CARDS[metaActivity.metaCardId] || {})
    var pool = card.musclePool || card.paramPool
    var muscleNames = []
    if (pool && pool.primary) {
      for (var i = 0; i < pool.primary.length; i++) {
        muscleNames.push(pool.primary[i].name)
      }
    }
    var movements = this._getMetaCardMovements(metaActivity.metaCardId)
    this.setData({
      showMetaDetail: true,
      metaDetail: {
        id: metaActivity.metaCardId,
        name: metaActivity.name,
        description: metaActivity.description || '',
        muscles: muscleNames.join('、'),
        movements: movements
      }
    })
  },

  /** 关闭元卡详情面板 */
  closeMetaDetail: function() {
    this.setData({ showMetaDetail: false })
  },

  /** 创建衍生活动 → 跳转编辑页 */
  onCreateDerivative: function(e) {
    var activity = e.currentTarget.dataset.activity
    var metaCardId = activity.metaCardId || activity.id
    if (!metaCardId) return
    wx.navigateTo({
      url: '../activity-edit/activity-edit?metaCard=' + metaCardId
    })
  },

  /** 点击模板搜索结果 → 跳转编辑页并预填模板参数 */
  onMetaCardSearchResultTap: function(e) {
    var index = e.currentTarget.dataset.index
    var result = this.data.metaCardSearchResults[index]
    if (!result) return
    wx.navigateTo({
      url: '../activity-edit/activity-edit?metaCard=' + result.metaCard + '&templateName=' + encodeURIComponent(result.name)
    })
  },

  // ==================== 数据加载 ====================

  /**
   * 新增活动维度规范（作用域安全版）
   *
   * 1. 每个函数内部自行声明 var self = this，禁止跨函数共享
   * 2. 有本地元卡的维度（sport / diet / 后续新增）：
   *    - 必须同步调用 _finalizeListWithMetaCards
   *    - 再异步追加自定义数据
   * 3. 纯云端维度（study / work / debuff）：
   *    - 保持 _loadFromCloud 不变
   *    - 禁止强行同步渲染
   * 4. 竞态防护（requestId）：
   *    - 在 _reloadActivities 内生成 this._activityRequestId（实例属性，非 data）
   *    - 在 _loadFromCloud 内部自行捕获 requestId
   *    - sport/diet 的守卫加在异步回调内（闭包访问 currentRequestId）
   *    - 禁止在 finalize 函数体内访问 requestId
   *    - _loadCustomFromCloud 是纯数据获取器，无需任何守卫
   */
  _reloadActivities: function() {
    var self = this
    this._activityRequestId = (this._activityRequestId || 0) + 1
    var cat = this.data.currentCategory
    var kw = this.data.searchKeyword
    var sideF = this.data.currentSideFilter

    // 补天·创建模式：只显示元卡（母版），不加载官方/自定义/公开活动
    if (this.data.viewMode === 'butian') {
      var metaActs = this._buildMetaCardsByCategory(cat, kw)
      this._finalizeListWithMetaCards(metaActs, cat)
      return
    }

    // 修行库货架模式：统一走云端加载（官方 + 自定义 + 公开）
    this._loadFromCloud(cat, kw, sideF)
  },

  /**
   * 分页拉取全量数据（循环直到凑够 total）
   * @param {string} action - 云函数 action
   * @param {object} baseParams - 基础参数（不含 page）
   * @param {number} pageSize - 每页条数（默认取云函数上限）
   * @returns {Promise<Array|null>} 活动数组；失败返回 null
   */
  _fetchAllPages: function(action, baseParams, pageSize) {
    pageSize = pageSize || 50
    var all = []
    var page = 1
    var MAX_PAGES = 100  // 安全上限，防死循环

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

  /**
   * 从当前活动列表聚合标签（去重，按出现次数降序，最多20个）
   */
  _aggregateTags: function(list) {
    var counts = {}
    for (var i = 0; i < list.length; i++) {
      var tags = list[i].tags || []
      for (var j = 0; j < tags.length; j++) {
        var t = tags[j]
        if (t) counts[t] = (counts[t] || 0) + 1
      }
    }
    var sorted = []
    for (var k in counts) {
      if (Object.prototype.hasOwnProperty.call(counts, k)) {
        sorted.push({ name: k, count: counts[k] })
      }
    }
    sorted.sort(function(a, b) { return b.count - a.count })
    this.setData({ allTags: sorted.slice(0, 20) })
  },

  /**
   * 云端加载活动数据（官方 + 我的自定义 + 全服公开自定义）
   * 失败时自动降级到本地数据
   */
  _loadFromCloud: function(cat, kw, sideF) {
    var self = this
    var requestId = this._activityRequestId || 0

    // 并行调用三个云函数
    var promises = [
      // 1. 官方活动（分页拉全量，服务端 pageSize 上限 100）
      new Promise(function(resolve) {
        self._fetchAllPages('getLibrary', { category: cat, topFilter: 'all', sideFilter: sideF, keyword: kw || undefined, tag: self.data.selectedTag || undefined }, 100).then(function(list) {
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
      // 3. 全服公开自定义（仅在非搜索时加载，分页拉全量）
      new Promise(function(resolve) {
        if (kw && kw.trim()) {
          resolve(null)
          return
        }
        self._fetchAllPages('getPublicCustom', { category: cat, tag: self.data.selectedTag || undefined }, 50).then(function(list) {
          resolve({ ok: true, data: { list: list || [], total: (list || []).length } })
        })
      })
    ]

    Promise.all(promises).then(function(results) {
      var officialRes = results[0]
      var mineRes = results[1]
      var publicRes = results[2]

      // 判断云端是否可用（getLibrary 是否成功）
      var cloudOk = officialRes && officialRes.ok

      if (cloudOk) {
        var list = []

        // 1. 官方活动：映射字段
        var officialList = (officialRes.data && officialRes.data.list) || []
        for (var i = 0; i < officialList.length; i++) {
          var item = officialList[i]
          list.push({
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
            isPublicLibrary: item.isPublicLibrary || false,
            intensity: item.intensity || '',
            difficulty: item.difficulty || '',
            defaultGroup: item.defaultGroup,
            defaultReps: item.defaultReps || '',
            defaultLoad: item.defaultLoad || '',
            restInterval: item.restInterval || '',
            sessionDuration: item.sessionDuration || '',
            targetMuscle: item.targetMuscle || '',
            targetAmount: item.targetAmount || '',
            frequency: item.frequency || '',
            cellTypes: item.cellTypes || [],
            defaultCells: item.defaultCells || []
          })
        }

        // 2. 我的自定义：分类筛选 + 合并
        var mineList = (mineRes && mineRes.ok && mineRes.data && mineRes.data.list) || []
        for (var j = 0; j < mineList.length; j++) {
          var mc = mineList[j]
          if (mc.category === cat) {
            // 根据 sideFilter 筛选
            if (sideF === 'all' || mc.sideFilter === sideF) {
              // 如果是搜索模式，按关键词过滤
              if (kw && kw.trim()) {
                var kwLower = kw.trim().toLowerCase()
                if (mc.name.toLowerCase().indexOf(kwLower) === -1 &&
                    (!mc.description || mc.description.toLowerCase().indexOf(kwLower) === -1)) {
                  continue
                }
              }
              list.unshift({
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
          }
        }

        // 3. 全服公开自定义：分类筛选 + 合并
        if (publicRes && publicRes.ok) {
          var pubList = (publicRes.data && publicRes.data.list) || []
          for (var k = 0; k < pubList.length; k++) {
            var pc = pubList[k]
            if (pc.category === cat && (sideF === 'all' || pc.sideFilter === sideF)) {
              list.push({
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
        }

        // 应用编辑覆写（本地覆写仍然生效）
        var edits = self._loadEdits()
        for (var ei = 0; ei < list.length; ei++) {
          var edit = edits[list[ei].id]
          if (edit) {
            if (edit.scorePerUnit !== undefined) { list[ei].scorePerUnit = edit.scorePerUnit; list[ei].isNegative = edit.scorePerUnit < 0 }
            if (edit.unit !== undefined) list[ei].unit = edit.unit
            if (edit.defaultGroup !== undefined) list[ei].defaultGroup = edit.defaultGroup
            if (edit.category !== undefined) { list[ei].category = edit.category; list[ei].tabKey = edit.category }
          }
        }

        // 全量聚合标签（在过滤前，标签行不缩水）
        self._aggregateTags(list)

        if (requestId !== self._activityRequestId) return
        self._finalizeList(list, cat, sideF)
      } else {
        // 云端不可用，回退本地
        self._loadFromLocal(cat, kw, sideF)
      }
    }).catch(function() {
      // 网络异常等，回退本地
      self._loadFromLocal(cat, kw, sideF)
    })
  },

  /**
   * 本地数据加载（降级策略）
   * 使用 Alib + 本地 storage 自定义活动
   */
  _loadFromLocal: function(cat, kw, sideF) {
    var list = []

    if (kw && kw.trim()) {
      list = Alib.searchActivities(kw, cat)
      var customAll = this._loadCustomActivities()
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
      list = Alib.filterActivities(cat, 'all', sideF)
      var customAll2 = this._loadCustomActivities()
      var customFiltered = []
      for (var j = 0; j < customAll2.length; j++) {
        var cj = customAll2[j]
        if (cj.category === cat) {
          if (sideF === 'all' || cj.sideFilter === sideF) {
            customFiltered.push(cj)
          }
        }
      }
      list = customFiltered.concat(list)
    }

    // 给本地 Alib 官方活动打标签
    for (var t = 0; t < list.length; t++) {
      if (!list[t].isCustom) {
        list[t].isOfficial = true
        list[t].isCustom = false
      } else {
        list[t].isOfficial = false
      }
    }

    // 应用编辑覆写
    var edits = this._loadEdits()
    for (var k = 0; k < list.length; k++) {
      var edit = edits[list[k].id]
      if (edit) {
        if (edit.scorePerUnit !== undefined) { list[k].scorePerUnit = edit.scorePerUnit; list[k].isNegative = edit.scorePerUnit < 0 }
        if (edit.unit !== undefined) list[k].unit = edit.unit
        if (edit.defaultGroup !== undefined) list[k].defaultGroup = edit.defaultGroup
        if (edit.category !== undefined) { list[k].category = edit.category; list[k].tabKey = edit.category }
      }
    }

    // tag 筛选
    var st = this.data.selectedTag
    if (st) {
      var tagFiltered = []
      for (var tf = 0; tf < list.length; tf++) {
        var tags = list[tf].tags || []
        if (tags.indexOf(st) !== -1) tagFiltered.push(list[tf])
      }
      list = tagFiltered
    }

    // 只看未打标签
    if (this.data.showAllTagsOff) {
      var noTagList = []
      for (var nt = 0; nt < list.length; nt++) {
        if (!list[nt].tags || list[nt].tags.length === 0) noTagList.push(list[nt])
      }
      list = noTagList
    }

    this._finalizeList(list, cat, sideF)
  },

  /**
   * 将"我的自定义"按分类名或第1个英文词分组
   */
  _groupMyCustom: function(list) {
    var result = []
    var groupMap = {}
    var ungrouped = []

    for (var i = 0; i < list.length; i++) {
      var item = list[i]
      if (item.isCustom && !item.isPublic) {
        var groupKey = (item.categoryName || '').trim()
        if (!groupKey && item.ext && item.ext.group) groupKey = item.ext.group
        if (!groupKey) {
          var m = (item.name || '').match(/^[A-Za-z]+/)
          groupKey = m ? m[0] : ''
        }
        if (!groupKey) {
          ungrouped.push(item)
        } else {
          if (!groupMap[groupKey]) { groupMap[groupKey] = [] }
          groupMap[groupKey].push(item)
        }
      } else {
        ungrouped.push(item)
      }
    }

    for (var gk in groupMap) {
      if (Object.prototype.hasOwnProperty.call(groupMap, gk)) {
        result.push({ _isGroup: true, _groupName: gk, _groupCount: groupMap[gk].length, id: '_group_' + gk })
        for (var gi = 0; gi < groupMap[gk].length; gi++) {
          groupMap[gk][gi]._inGroup = gk
          result.push(groupMap[gk][gi])
        }
      }
    }
    for (var ui = 0; ui < ungrouped.length; ui++) {
      result.push(ungrouped[ui])
    }
    return result
  },

  /**
   * 统一补 grandDao 并按当前 6 大道则筛选（活动对象缺 grandDao 时按 category 兜底映射）
   */
  _applyGrandDaoFilter: function(list) {
    var gd = this.data.currentGrandDao
    var result = []
    for (var i = 0; i < list.length; i++) {
      var act = list[i]
      if (act._isGroup) { result.push(act); continue }
      act.grandDao = Alib.getGrandDao(act.category || act.tabKey)
      if (act.grandDao === gd) result.push(act)
    }
    return result
  },

  /**
   * 列表最终处理：标记修心模式、设置卡模式、空白置顶、排序展示
   */
  _finalizeList: function(list, cat, sideF) {
    // 竞态守卫：请求返回时若分类已切换，丢弃过期结果
    if (cat !== this.data.currentCategory) return

    // 筛选：历史活动卡（练过的活动）
    if (this.data.showTrainedOnly) {
      var trained = this.data.trainedActivityIds || {}
      var filtered = []
      for (var fi = 0; fi < list.length; fi++) {
        if (trained[list[fi].id]) {
          filtered.push(list[fi])
        }
      }
      list = filtered
    }

    // 只看未打标签
    if (this.data.showAllTagsOff) {
      var noTagList = []
      for (var nt = 0; nt < list.length; nt++) {
        if (!list[nt].tags || list[nt].tags.length === 0) noTagList.push(list[nt])
      }
      list = noTagList
    }

    // 悟·修心 / 工·功业 / 煞·心魔 分类：标记为换算模式
    if (cat === 'study' || cat === 'work' || cat === 'debuff') {
      for (var s = 0; s < list.length; s++) {
        var item = list[s]
        var cloned = {}
        for (var key in item) {
          cloned[key] = item[key]
        }
        cloned.isStudyMode = true
        var unit = item.unit || ''
        cloned.calcUnit = unit.indexOf('分钟') !== -1 ? 'time' : 'count'
        list[s] = cloned
      }
    }

    var cardMode = 'default'
    if (cat === 'study' || cat === 'work' || cat === 'debuff') cardMode = 'study'
    else if (cat === 'diet') cardMode = 'food'

    // 全部视图下，空白活动固定置顶
    if (sideF === 'all') {
      var blankId = cat === 'diet' ? 'blank_diet' : ('blank_' + cat)
      for (var ri = 0; ri < list.length; ri++) {
        if (list[ri].id === blankId) {
          var blankItem = list.splice(ri, 1)[0]
          list.unshift(blankItem)
          break
        }
      }
    }

    // ext 预处理：生成 __keys 数组供 wxml 渲染
    for (var ei = 0; ei < list.length; ei++) {
      var it = list[ei]
      if (it._isGroup) continue
      var ext = it.ext || {}
      var keys = Object.keys(ext)
      var kArr = []
      for (var ki = 0; ki < keys.length && ki < 4; ki++) {
        kArr.push(keys[ki])
      }
      it.__keys = kArr
      it.__ext = ext
    }

    list = this._applyGrandDaoFilter(list)

    this.setData({ activities: this._sortByUsage(list), cardMode: cardMode })
  },

  /** 为 sport 元卡模式加载云端自定义活动（简化版：只拉用户自定义） */
  _loadCustomFromCloud: function(cat, kw, sideF, callback) {
    var self = this
    // 查询自己的自定义活动
    wx.cloud.callFunction({
      name: 'user-activity',
      data: { action: 'list' },
      success: function(res) {
        var list = []
        if (res.result && res.result.ok && res.result.data && res.result.data.list) {
          for (var i = 0; i < res.result.data.list.length; i++) {
            var mc = res.result.data.list[i]
            if (mc.category === cat) {
              list.push({
                id: mc.activityId || mc._id || mc.id,
                name: mc.name,
                scorePerUnit: mc.scorePerUnit,
                unit: mc.unit,
                category: mc.category,
                tabKey: mc.category,
                grandDao: Alib.getGrandDao(mc.category),
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
          }
        }
        callback(list)
      },
      fail: function() { callback([]) }
    })
  },

  /** sport 元卡模式专用 finalize：不按 sideFilter 过滤（已由 pill 栏处理） */
  _finalizeListWithMetaCards: function(list, cat) {
    // 竞态守卫：请求返回时若分类已切换，丢弃过期结果
    if (cat !== this.data.currentCategory) return

    // 标签聚合
    this._aggregateTags(list)

    // ext 预处理
    for (var ei = 0; ei < list.length; ei++) {
      var it = list[ei]
      if (it._isGroup) continue
      var ext = it.ext || {}
      var keys = Object.keys(ext)
      var kArr = []
      for (var ki = 0; ki < keys.length && ki < 4; ki++) {
        kArr.push(keys[ki])
      }
      it.__keys = kArr
      it.__ext = ext
    }

    list = this._applyGrandDaoFilter(list)

    this.setData({ activities: this._sortByUsage(list), cardMode: 'default' })
  },

  /** 按置顶+使用次数排序：置顶优先，其次按使用次数降序 */
  _sortByUsage: function(list) {
    // 预计算图标首字（wxml 表达式不支持 charAt 等方法调用，须在 js 算好再绑定）
    for (var ii = 0; ii < list.length; ii++) {
      var itm = list[ii]
      if (itm && itm.name && !itm._iconText) {
        itm._iconText = itm.name.charAt(0)
      }
    }
    var pinned = this.data.pinned || {}
    // 尝试从本地读取使用统计
    var usage = {}
    try {
      var usageKey = 'tiandao_act_usage_' + this._getUid()
      usage = wx.getStorageSync(usageKey) || {}
    } catch (e) {}
    return list.slice().sort(function(a, b) {
      var aPin = pinned[a.id] ? 1 : 0
      var bPin = pinned[b.id] ? 1 : 0
      if (aPin !== bPin) return bPin - aPin
      var ua = usage[a.id] || 0
      var ub = usage[b.id] || 0
      return ub - ua
    })
  },

  // ==================== 跳转 ====================

  goToRecord: function(e) {
    var activity = e.currentTarget.dataset.activity
    if (!activity) return

    var tabKey = activity.tabKey || activity.category

    app._preSelectTab = tabKey
    app._preSelectActivity = activity.presetAction || activity.id
    app._preSelectActivityName = activity.name

    wx.switchTab({ url: '/pages/record/record' })
  },

  // ==================== 自定义活动弹窗 ====================

  /** 计算分类索引（编辑面板仍按 5 大类，底层 category 不随 tab 切换） */
  _getCategoryIndex: function(catKey) {
    var cats = Alib.CATEGORIES
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].key === catKey) return i
    }
    return 0
  },

  /** 计算子分类索引 */
  _getSideFilterIndex: function(options, sideKey) {
    for (var i = 0; i < options.length; i++) {
      if (options[i].key === sideKey) return i
    }
    return 0
  },

  /** 阻止冒泡 */
  preventBubble: function() {},

  // ==================== 活动编辑存储 ====================

  _getEditStorageKey: function() {
    return 'tiandao_act_edits_' + this._getUid()
  },

  _loadEdits: function() {
    try {
      return wx.getStorageSync(this._getEditStorageKey()) || {}
    } catch (e) {
      return {}
    }
  },

  _saveEdits: function(edits) {
    try {
      wx.setStorageSync(this._getEditStorageKey(), edits)
    } catch (e) {}
  },

  // ==================== 活动编辑弹窗 ====================

  onCardTap: function(e) {
    var activity = e.currentTarget.dataset.activity
    if (!activity) return

    // 元卡点击 → 显示详情面板
    if (activity._isMetaCard) {
      this._openMetaDetail(activity)
      return
    }

    // 食物卡片 → 打开食物详情面板
    if (activity.isFood) {
      this.openFoodDetail(activity)
      return
    }

    // 修心卡片 → 打开修心详情面板
    if (activity.isStudyMode) {
      this.openStudyDetail(activity)
      return
    }

    // 通用卡片 → 打开详情弹窗
    this.openActivityDetail(activity)
  },

  /** 点活动卡卡片本身 → 进入单品详情页 */
  navigateToActivityDetail: function(e) {
    var act = e.currentTarget.dataset.activity
    if (!act) return
    wx.navigateTo({
      url: '/packageC/pages/activity-detail/activity-detail?data=' + encodeURIComponent(JSON.stringify(act))
    })
  },

  /** 活动卡右上角「＋」加购（catchtap 拦截冒泡） */
  addToCart: function(e) {
    var act = e.currentTarget.dataset.act
    if (!act) return
    var res = Cart.addToCart(act)
    if (res.ok) {
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    } else if (res.reason === 'duplicate') {
      wx.showToast({ title: '已在购物车', icon: 'none' })
    }
  },

  /** 编辑自定义活动 */
  onEditCustomActivity: function(e) {
    var activity = e.currentTarget.dataset.activity
    if (!activity) return

    var data = encodeURIComponent(JSON.stringify({
      id: activity.id,
      name: activity.name,
      category: activity.category,
      unit: activity.unit,
      scorePerUnit: activity.scorePerUnit,
      description: activity.description || '',
      icon: activity.icon || ''
    }))

    this.closeActivityDetail()
    wx.navigateTo({
      url: '/packageC/pages/activity-edit/activity-edit?isNew=false&data=' + data
    })
  },

  /** 删除自定义活动 */
  onDeleteCustomActivity: function(e) {
    var activity = e.currentTarget.dataset.activity
    if (!activity) return

    var self = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除「' + activity.name + '」吗？此操作不可恢复。',
      confirmColor: '#EF4444',
      success: function(res) {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'user-activity',
            data: {
              action: 'delete',
              params: { activityId: activity.id }
            },
            success: function() {
              self._reloadActivities()
              self.closeActivityDetail()
              wx.showToast({ title: '已删除', icon: 'success' })
            },
            fail: function() {
              wx.showToast({ title: '删除失败，请稍后重试', icon: 'none' })
            }
          })
        }
      }
    })
  },

  /** 阻止事件冒泡 */
  noop: function() {},

  /** 打开活动详情 */
  openActivityDetail: function(activity) {
    if (!activity) return
    // 详情面板使用的字段，从 activity 对象透传
    var d = {
      id: activity.id,
      name: activity.name,
      category: activity.category,
      categoryName: activity.categoryName || '',
      unit: activity.unit || '次',
      scorePerUnit: activity.scorePerUnit || 0,
      description: activity.description || '',
      icon: activity.icon || activity.presetAction || '',
      isCustom: !!activity.isCustom,
      isPublic: !!activity.isPublic,
      isOfficial: !!activity.isOfficial,
      isFood: !!activity.isFood,
      isStudyMode: !!activity.isStudyMode,
      ownerName: activity.ownerName || '',
      useCount: activity.useCount || 0,
      likeCount: activity.likeCount || 0,
      ext: activity.ext || {},
      tags: activity.tags || [],
      customMeta: activity.customMeta || null,
      // 面板专用
      isNegative: (activity.scorePerUnit || 0) < 0,
      createdTime: activity.createdAt || activity.createdTime || ''
    }
    // ext 转化为 __keys 数组
    var keys = Object.keys(d.ext)
    var kArr = []
    for (var ki = 0; ki < keys.length && ki < 6; ki++) kArr.push(keys[ki])
    d.__keys = kArr
    d.__ext = d.ext
    this.setData({ showActivityDetail: true, activityDetail: d })
  },

  /** 关闭详情 */
  closeActivityDetail: function() {
    this.setData({ showActivityDetail: false, activityDetail: null })
  },

  /** 调整分类（元卡改造） */
  onReclassifyActivity: function(e) {
    var activity = e.currentTarget.dataset.activity
    var currentMetaCard = (activity.customMeta && activity.customMeta.metaCard) || 'unknown'
    this.setData({
      showReclassifyModal: true,
      reclassifyActivity: activity,
      selectedReclassifyMetaCard: currentMetaCard
    })
  },

  onSelectReclassifyMetaCard: function(e) {
    this.setData({ selectedReclassifyMetaCard: e.currentTarget.dataset.key })
  },

  onConfirmReclassify: function() {
    var self = this
    var metaCard = this.data.selectedReclassifyMetaCard
    var activity = this.data.reclassifyActivity
    if (!activity || !metaCard) return

    wx.cloud.callFunction({
      name: 'user-activity',
      data: {
        action: 'reclassify',
        activityId: activity.id,
        metaCard: metaCard
      },
      success: function(res) {
        if (res.result && res.result.ok) {
          wx.showToast({ title: '分类已更新', icon: 'success' })
          // 更新当前详情中的 customMeta
          var detail = self.data.activityDetail
          detail.customMeta = detail.customMeta || {}
          detail.customMeta.metaCard = metaCard
          self.setData({ activityDetail: detail, showReclassifyModal: false })
          self._reloadActivities()
        } else {
          wx.showToast({ title: (res.result && res.result.error) || '调整失败', icon: 'none' })
        }
      },
      fail: function() {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  closeReclassifyModal: function() {
    this.setData({ showReclassifyModal: false })
  },

  /** 切换「历史活动卡」（练过的活动） */
  onToggleTrained: function() {
    var self = this
    var next = !this.data.showTrainedOnly
    this.setData({ showTrainedOnly: next })
    if (next) {
      this._loadTrainedIds(function () { self._reloadActivities() })
    } else {
      this._reloadActivities()
    }
  },

  /** 加载练过的活动 id 集合（从 records 聚合，批量结构 records[].activityId + 单条结构顶层 activityId） */
  _loadTrainedIds: function (callback) {
    var self = this
    var userId = this._getUid()
    var db = (app.globalData && app.globalData.db)
    if (!db) { if (callback) callback(); return }
    db.collection('records')
      .where({ userId: userId })
      .field({ records: true, activityId: true })
      .limit(1000)
      .get()
      .then(function (res) {
        var trained = {}
        var docs = res.data || []
        for (var i = 0; i < docs.length; i++) {
          var doc = docs[i]
          if (doc.records && Array.isArray(doc.records)) {
            for (var j = 0; j < doc.records.length; j++) {
              if (doc.records[j].activityId) trained[doc.records[j].activityId] = true
            }
          } else if (doc.activityId) {
            trained[doc.activityId] = true
          }
        }
        self.setData({ trainedActivityIds: trained })
        if (callback) callback()
      })
      .catch(function () { if (callback) callback() })
  },

  onTagTap: function(e) {
    var tag = e.currentTarget.dataset.tag
    if (this.data.selectedTag === tag) {
      this.setData({ selectedTag: '' })
    } else {
      this.setData({ selectedTag: tag })
    }
    this._reloadActivities()
  },

  toggleAllTagsOff: function() {
    this.setData({ showAllTagsOff: !this.data.showAllTagsOff })
    this._reloadActivities()
  },

  openEditPanel: function(activity) {
    // 权限检查：仅管理员和编辑权限账号可编辑
    if (!this.data.isAdmin) {
      wx.showToast({ title: '仅管理员可编辑', icon: 'none' })
      return
    }
    var catIdx = this._getCategoryIndex(activity.category)
    var isStudy = activity.isStudyMode

    // 修心/功业/心魔模式使用不同单位选项
    var isWorkOrDebuff = activity.category === 'work' || activity.tabKey === 'work' ||
                         activity.category === 'debuff' || activity.tabKey === 'debuff'
    var editUnits = isStudy
      ? (isWorkOrDebuff ? ['30分钟', '次'] : ['10分钟', '次'])
      : ['次', '组', '分钟', '份']
    var unitIdx = isStudy
      ? this._getStudyUnitIndex(activity.unit || (isWorkOrDebuff ? '30分钟' : '10分钟'))
      : this._getUnitIndex(activity.unit || '次')

    this.setData({
      showEditModal: true,
      editCategoryOptions: Alib.CATEGORIES,
      editUnitOptions: editUnits,
      editData: {
        id: activity.id,
        name: activity.name || '',
        scorePerUnit: String(activity.scorePerUnit || 0),
        defaultGroup: String(activity.defaultGroup || 1),
        unitIndex: unitIdx,
        categoryIndex: catIdx,
        isCustom: !!activity.isCustom,
        isNegative: (activity.scorePerUnit || 0) < 0,
        isStudyMode: isStudy || false,
        // 自由度字段
        icon: activity.icon || '',
        categoryName: activity.categoryName || '',
        ext: activity.ext || {},
        tags: activity.tags || [],
        customMeta: activity.customMeta || null
      }
    })
  },

  _getStudyUnitIndex: function(unit) {
    if (unit.indexOf('分钟') !== -1) return 0
    return 1
  },

  closeEditModal: function() {
    this.setData({ showEditModal: false })
  },

  _getUnitIndex: function(unit) {
    var units = this.data.editUnitOptions
    for (var i = 0; i < units.length; i++) {
      if (units[i] === unit) return i
    }
    // 未匹配则尝试前缀匹配（如 "组/次" 匹配 "组"）
    for (var j = 0; j < units.length; j++) {
      if (unit.indexOf(units[j]) !== -1) return j
    }
    return 0
  },

  onEditNameInput: function(e) {
    this.setData({ 'editData.name': e.detail.value })
  },

  onEditScoreInput: function(e) {
    var val = e.detail.value
    this.setData({
      'editData.scorePerUnit': val,
      'editData.isNegative': parseFloat(val) < 0
    })
  },

  onEditUnitChange: function(e) {
    this.setData({ 'editData.unitIndex': parseInt(e.detail.value) })
  },

  onEditGroupInput: function(e) {
    var val = parseInt(e.detail.value)
    if (isNaN(val) || val < 1) val = 1
    this.setData({ 'editData.defaultGroup': String(val) })
  },

  onEditCategoryChange: function(e) {
    this.setData({ 'editData.categoryIndex': parseInt(e.detail.value) })
  },

  submitEditActivity: function() {
    var ed = this.data.editData
    var name = (ed.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入活动名称', icon: 'none' })
      return
    }
    if (name.length > 20) {
      wx.showToast({ title: '名称最多20个字符', icon: 'none' })
      return
    }

    var scoreVal = parseFloat(ed.scorePerUnit)
    if (isNaN(scoreVal)) {
      wx.showToast({ title: '请输入有效的修为值', icon: 'none' })
      return
    }

    var unit = this.data.editUnitOptions[ed.unitIndex]
    var catKey = this.data.editCategoryOptions[ed.categoryIndex].key
    var groupVal = parseInt(ed.defaultGroup) || 1

    var self = this
    if (ed.isCustom) {
      // 云端更新自定义活动
      this.setData({ showEditModal: false })
      wx.cloud.callFunction({
        name: 'activity-api',
        data: {
          action: 'updateCustom',
          params: {
            activityId: ed.id,
            name: name,
            scorePerUnit: scoreVal,
            unit: unit,
            category: catKey,
            description: '',
            icon: ed.icon || '',
            categoryName: ed.categoryName || '',
            ext: ed.ext || {},
            tags: ed.tags || [],
            customMeta: ed.customMeta || null
          }
        },
        success: function() {
          self._syncToTemplates(ed.id, name, scoreVal)
          self._reloadActivities()
          self.closeActivityDetail()
          wx.showToast({ title: '保存成功', icon: 'success' })
        },
        fail: function() {
          // 降级：更新本地 storage
          var customList = self._loadCustomActivities()
          for (var i = 0; i < customList.length; i++) {
            if (customList[i].id === ed.id) {
              customList[i].name = name
              customList[i].scorePerUnit = scoreVal
              customList[i].unit = unit
              customList[i].category = catKey
              customList[i].tabKey = catKey
              customList[i].isNegative = scoreVal < 0
              customList[i].defaultGroup = unit === '次' ? groupVal : undefined
              break
            }
          }
          self._saveCustomActivities(customList)
          self._syncToTemplates(ed.id, name, scoreVal)
          self._reloadActivities()
          self.closeActivityDetail()
          wx.showToast({ title: '已本地保存', icon: 'success' })
        }
      })
    } else {
      // 系统活动：保存覆写配置
      var edits = this._loadEdits()
      edits[ed.id] = {
        scorePerUnit: scoreVal,
        unit: unit,
        category: catKey
      }
      if (unit === '次') edits[ed.id].defaultGroup = groupVal
      this._saveEdits(edits)

      // 联动更新模板
      this._syncToTemplates(ed.id, name, scoreVal)

      this.setData({ showEditModal: false })
      this._reloadActivities()
      wx.showToast({ title: '保存成功', icon: 'success' })
    }
  },

  deleteCustomActivity: function() {
    var self = this
    var actId = this.data.editData.id
    var actName = this.data.editData.name

    var usedInTemplates = this._checkUsedInTemplates(actId)

    wx.showModal({
      title: '确认删除',
      content: usedInTemplates ? '该活动已在模板中使用，删除后将一并移除' : ('确定要删除「' + actName + '」吗？'),
      success: function(res) {
        if (res.confirm) {
          self._doDeleteCustomActivity(actId)
        }
      }
    })
  },

  _doDeleteCustomActivity: function(actId) {
    var self = this
    // 云端删除
    wx.cloud.callFunction({
      name: 'activity-api',
      data: {
        action: 'deleteCustom',
        params: { activityId: actId }
      },
      success: function() {
        self._removeFromTemplates(actId)
        // 清理覆写记录
        var edits = self._loadEdits()
        if (edits[actId]) {
          delete edits[actId]
          self._saveEdits(edits)
        }
        self.setData({ showEditModal: false })
        self._reloadActivities()
        wx.showToast({ title: '已删除', icon: 'success' })
      },
      fail: function() {
        // 降级：从本地 storage 移除
        var customList = self._loadCustomActivities()
        var newList = []
        for (var i = 0; i < customList.length; i++) {
          if (customList[i].id !== actId) newList.push(customList[i])
        }
        self._saveCustomActivities(newList)
        self._removeFromTemplates(actId)
        var edits = self._loadEdits()
        if (edits[actId]) {
          delete edits[actId]
          self._saveEdits(edits)
        }
        self.setData({ showEditModal: false })
        self._reloadActivities()
        wx.showToast({ title: '已本地删除', icon: 'success' })
      }
    })
  },

  /** 默认活动卡初始化：默认卡机制已取缔（官方活动为公共资源），仅保留默认模板初始化 */
  _initDefaultActivities: function() {
    this._initDefaultTemplates()
  },

  /** 默认模板初始化：本地 storage 幂等写入（无模板且无标记才写） */
  _initDefaultTemplates: function() {
    DefaultTemplates.ensureDefaultTemplates(this._getUid())
  },

  /**
   * 旧自定义活动数据迁移：首次启动时将本地 storage 的旧自定义活动上传到云端
   */
  _migrateLegacyCustomActivities: function() {
    var migrated = wx.getStorageSync('tiandao_migrated_custom_acts')
    if (migrated) return

    var oldCustom = this._loadCustomActivities()
    if (oldCustom.length === 0) {
      wx.setStorageSync('tiandao_migrated_custom_acts', true)
      return
    }

    var self = this
    var uploaded = 0
    var total = oldCustom.length

    function uploadNext(idx) {
      if (idx >= total) {
        wx.setStorageSync('tiandao_migrated_custom_acts', true)
        if (uploaded > 0) {
          self._saveCustomActivities([])
          self._reloadActivities()
        }
        return
      }

      var act = oldCustom[idx]
      wx.cloud.callFunction({
        name: 'activity-api',
        data: {
          action: 'createCustom',
          params: {
            name: act.name,
            category: act.category,
            scorePerUnit: act.scorePerUnit,
            unit: act.unit,
            description: act.description || '',
            topFilter: act.topFilter || '',
            sideFilter: act.sideFilter || ''
          }
        },
        success: function() { uploaded++; uploadNext(idx + 1) },
        fail: function() { uploadNext(idx + 1) }
      })
    }

    uploadNext(0)
  },

  // ==================== 模板数据联动 ====================

  _getTemplateStorageKey: function() {
    return 'tiandao_custom_templates_' + this._getUid()
  },

  _syncToTemplates: function(actId, newName, newScore) {
    try {
      var templates = wx.getStorageSync(this._getTemplateStorageKey()) || []
      var updated = false

      for (var t = 0; t < templates.length; t++) {
        var tmpl = templates[t]
        // 日模板
        if (tmpl.timeSlots) {
          for (var s = 0; s < tmpl.timeSlots.length; s++) {
            var acts = tmpl.timeSlots[s].activities || []
            for (var a = 0; a < acts.length; a++) {
              if (acts[a].actId === actId) {
                acts[a].activityName = newName
                acts[a].score = newScore
                updated = true
              }
            }
          }
        }
        // 周模板
        if (tmpl.weekData) {
          var days = tmpl.weekData
          for (var day in days) {
            if (days.hasOwnProperty(day)) {
              for (var p in days[day]) {
                if (days[day].hasOwnProperty(p)) {
                  var wkActs = days[day][p]
                  for (var wa = 0; wa < wkActs.length; wa++) {
                    if (wkActs[wa].actId === actId) {
                      wkActs[wa].activityName = newName
                      wkActs[wa].score = newScore
                      updated = true
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (updated) {
        wx.setStorageSync(this._getTemplateStorageKey(), templates)
      }
    } catch (e) {}
  },

  _checkUsedInTemplates: function(actId) {
    try {
      var templates = wx.getStorageSync(this._getTemplateStorageKey()) || []
      for (var t = 0; t < templates.length; t++) {
        var tmpl = templates[t]
        var allActs = []
        if (tmpl.timeSlots) {
          for (var s = 0; s < tmpl.timeSlots.length; s++) {
            allActs = allActs.concat(tmpl.timeSlots[s].activities || [])
          }
        }
        if (tmpl.weekData) {
          var days = tmpl.weekData
          for (var day in days) {
            if (days.hasOwnProperty(day)) {
              for (var p in days[day]) {
                if (days[day].hasOwnProperty(p)) {
                  allActs = allActs.concat(days[day][p])
                }
              }
            }
          }
        }
        for (var a = 0; a < allActs.length; a++) {
          if (allActs[a].actId === actId) return true
        }
      }
    } catch (e) {}
    return false
  },

  _removeFromTemplates: function(actId) {
    try {
      var templates = wx.getStorageSync(this._getTemplateStorageKey()) || []
      var updated = false

      for (var t = 0; t < templates.length; t++) {
        var tmpl = templates[t]
        // 日模板
        if (tmpl.timeSlots) {
          for (var s = 0; s < tmpl.timeSlots.length; s++) {
            var acts = tmpl.timeSlots[s].activities || []
            var filtered = []
            for (var a = 0; a < acts.length; a++) {
              if (acts[a].actId !== actId) filtered.push(acts[a])
              else updated = true
            }
            tmpl.timeSlots[s].activities = filtered
          }
        }
        // 周模板
        if (tmpl.weekData) {
          var days = tmpl.weekData
          for (var day in days) {
            if (days.hasOwnProperty(day)) {
              for (var p in days[day]) {
                if (days[day].hasOwnProperty(p)) {
                  var wkActs = days[day][p]
                  var wkFiltered = []
                  for (var wa = 0; wa < wkActs.length; wa++) {
                    if (wkActs[wa].actId !== actId) wkFiltered.push(wkActs[wa])
                    else updated = true
                  }
                  days[day][p] = wkFiltered
                }
              }
            }
          }
        }
      }

      if (updated) {
        wx.setStorageSync(this._getTemplateStorageKey(), templates)
      }
    } catch (e) {}
  },

  // ==================== 食物详情面板 ====================

  _calcConverted: function(nutrition, weight) {
    var ratio = weight / 100
    return {
      calories: Math.round(nutrition.calories * ratio * 10) / 10,
      protein: Math.round(nutrition.protein * ratio * 10) / 10,
      carbs: Math.round(nutrition.carbs * ratio * 10) / 10,
      fat: Math.round(nutrition.fat * ratio * 10) / 10
    }
  },

  openFoodDetail: function(food) {
    var nutrition = food.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    var weight = 100
    this.setData({
      showFoodDetail: true,
      foodDetail: {
        id: food.id,
        name: food.name,
        categoryName: getFoodSideName(food.sideFilter),
        nutrition: nutrition,
        weight: weight,
        converted: this._calcConverted(nutrition, weight),
        isCustom: food.isCustom || false
      }
    })
  },

  closeFoodDetail: function() {
    this.setData({ showFoodDetail: false })
  },

  onFoodWeightInput: function(e) {
    var val = parseInt(e.detail.value)
    if (isNaN(val) || val < 1) val = 1
    if (val > 9999) val = 9999
    var nutrition = this.data.foodDetail.nutrition
    this.setData({
      'foodDetail.weight': val,
      'foodDetail.converted': this._calcConverted(nutrition, val)
    })
  },

  addFoodToRecord: function() {
    var fd = this.data.foodDetail
    var now = new Date()
    var dateStr = now.getFullYear() + '-' +
      ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
      ('0' + now.getDate()).slice(-2)
    var timeStr = ('0' + now.getHours()).slice(-2) + ':' +
      ('0' + now.getMinutes()).slice(-2)

    var record = {
      id: 'food_record_' + Date.now(),
      foodId: fd.id,
      foodName: fd.name,
      categoryName: fd.categoryName,
      weight: fd.weight,
      nutrition: fd.converted,
      date: dateStr,
      time: timeStr
    }

    var recordKey = 'tiandao_food_records_' + this._getUid()
    try {
      var records = wx.getStorageSync(recordKey) || []
      records.unshift(record)
      wx.setStorageSync(recordKey, records)
      wx.showToast({ title: '已添加', icon: 'success' })
      this.setData({ showFoodDetail: false })
    } catch (e) {
      wx.showToast({ title: '记录失败', icon: 'none' })
    }
  },

  // ==================== 新建食物弹窗 ====================

  openFoodModal: function() {
    this.setData({
      showFoodModal: true,
      foodFormData: {
        name: '',
        sideFilterIndex: 0,
        calories: '',
        protein: '',
        carbs: '',
        fat: ''
      }
    })
  },

  closeFoodModal: function() {
    this.setData({ showFoodModal: false, _editingFoodId: '' })
  },

  onFoodFormNameInput: function(e) {
    this.setData({ 'foodFormData.name': e.detail.value })
  },

  onFoodFormSideFilterChange: function(e) {
    this.setData({ 'foodFormData.sideFilterIndex': parseInt(e.detail.value) })
  },

  onFoodFormCaloriesInput: function(e) {
    this.setData({ 'foodFormData.calories': e.detail.value })
  },

  onFoodFormProteinInput: function(e) {
    this.setData({ 'foodFormData.protein': e.detail.value })
  },

  onFoodFormCarbsInput: function(e) {
    this.setData({ 'foodFormData.carbs': e.detail.value })
  },

  onFoodFormFatInput: function(e) {
    this.setData({ 'foodFormData.fat': e.detail.value })
  },

  submitNewFood: function() {
    var fd = this.data.foodFormData
    var name = (fd.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入食物名称', icon: 'none' })
      return
    }

    var calories = parseFloat(fd.calories)
    if (isNaN(calories)) {
      wx.showToast({ title: '请输入热量值', icon: 'none' })
      return
    }

    var protein = parseFloat(fd.protein) || 0
    var carbs = parseFloat(fd.carbs) || 0
    var fat = parseFloat(fd.fat) || 0

    var sideOptions = this.data.foodFormSideOptions
    var sideKey = sideOptions[fd.sideFilterIndex].key

    var newFood = {
      id: 'custom_food_' + Date.now(),
      name: name,
      sideFilter: sideKey,
      category: 'diet',
      isFood: true,
      isCustom: true,
      nutrition: {
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat
      },
      calories: calories
    }

    // 保存到自定义食物存储
    var customFoods = this._loadCustomFoods()
    customFoods.unshift(newFood)
    this._saveCustomFoods(customFoods)

    this.setData({ showFoodModal: false })
    this._reloadActivities()
    wx.showToast({ title: '添加成功', icon: 'success' })
  },

  // ==================== 食物编辑 / 删除 ====================

  editFood: function() {
    var fd = this.data.foodDetail
    if (!fd.isCustom) return

    var sideOptions = this.data.foodFormSideOptions
    var sideIdx = 0
    for (var i = 0; i < sideOptions.length; i++) {
      if (sideOptions[i].name === fd.categoryName) { sideIdx = i; break }
    }

    var n = fd.nutrition
    this.setData({
      showFoodDetail: false,
      showFoodModal: true,
      foodFormData: {
        name: fd.name,
        sideFilterIndex: sideIdx,
        calories: String(n.calories),
        protein: String(n.protein),
        carbs: String(n.carbs),
        fat: String(n.fat)
      },
      _editingFoodId: fd.id
    })
  },

  submitEditFood: function() {
    var editId = this.data._editingFoodId
    if (!editId) return

    var fd = this.data.foodFormData
    var name = (fd.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入食物名称', icon: 'none' })
      return
    }

    var calories = parseFloat(fd.calories)
    if (isNaN(calories)) {
      wx.showToast({ title: '请输入热量值', icon: 'none' })
      return
    }

    var protein = parseFloat(fd.protein) || 0
    var carbs = parseFloat(fd.carbs) || 0
    var fat = parseFloat(fd.fat) || 0
    var sideKey = this.data.foodFormSideOptions[fd.sideFilterIndex].key

    var customFoods = this._loadCustomFoods()
    for (var i = 0; i < customFoods.length; i++) {
      if (customFoods[i].id === editId) {
        customFoods[i].name = name
        customFoods[i].sideFilter = sideKey
        customFoods[i].nutrition = { calories: calories, protein: protein, carbs: carbs, fat: fat }
        customFoods[i].calories = calories
        break
      }
    }
    this._saveCustomFoods(customFoods)

    this.setData({ showFoodModal: false, _editingFoodId: '' })
    this._reloadActivities()
    wx.showToast({ title: '已更新', icon: 'success' })
  },

  deleteFood: function() {
    var self = this
    var foodId = this.data.foodDetail.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个食物吗？',
      success: function(res) {
        if (res.confirm) {
          var foods = self._loadCustomFoods()
          var newList = []
          for (var i = 0; i < foods.length; i++) {
            if (foods[i].id !== foodId) newList.push(foods[i])
          }
          self._saveCustomFoods(newList)
          self.setData({ showFoodDetail: false })
          self._reloadActivities()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // ==================== 修心详情面板 ====================

  openStudyDetail: function(activity) {
    var isTime = activity.calcUnit === 'time'
    var baseScore = activity.scorePerUnit || 0
    var cat = activity.category || activity.tabKey || 'study'

    // 获取侧栏分类名
    var config = Alib.FILTER_CONFIGS[cat] || Alib.FILTER_CONFIGS['study'] || { side: [] }
    var sideFilters = config.side || []
    var catName = ''
    for (var i = 0; i < sideFilters.length; i++) {
      if (sideFilters[i].key === activity.sideFilter) {
        catName = sideFilters[i].name
        break
      }
    }

    // 根据活动的单位确定时间块大小（10分钟 → 10, 30分钟 → 30）
    var unit = activity.unit || ''
    var timeBlockMin = 30
    if (unit.indexOf('10') !== -1) timeBlockMin = 10

    var timeBlockLabel = '组数（每组' + timeBlockMin + '分钟）'

    this.setData({
      showStudyDetail: true,
      studyDetail: {
        id: activity.id,
        name: activity.name,
        categoryName: catName,
        calcUnit: isTime ? 'time' : 'count',
        baseScore: baseScore,
        inputValue: 1,
        totalScore: Math.round(baseScore * 10) / 10,
        isCustom: activity.isCustom || false,
        timeBlockMinutes: timeBlockMin,
        timeBlockLabel: timeBlockLabel,
        inputUnit: isTime ? '组' : '次'
      }
    })
  },

  closeStudyDetail: function() {
    this.setData({ showStudyDetail: false })
  },

  onStudyInput: function(e) {
    var val = parseInt(e.detail.value)
    if (isNaN(val) || val < 1) val = 1
    if (val > 999) val = 999
    var base = this.data.studyDetail.baseScore
    this.setData({
      'studyDetail.inputValue': val,
      'studyDetail.totalScore': Math.round(base * val * 10) / 10
    })
  },

  addStudyToRecord: function() {
    var sd = this.data.studyDetail
    var now = new Date()
    var dateStr = now.getFullYear() + '-' +
      ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
      ('0' + now.getDate()).slice(-2)
    var timeStr = ('0' + now.getHours()).slice(-2) + ':' +
      ('0' + now.getMinutes()).slice(-2)

    var calcLabel = sd.calcUnit === 'time' ? (sd.timeBlockMinutes + '分钟') : '次'

    var record = {
      id: 'study_record_' + Date.now(),
      activityId: sd.id,
      activityName: sd.name,
      categoryName: sd.categoryName,
      calcUnit: sd.calcUnit,
      calcLabel: calcLabel,
      baseScore: sd.baseScore,
      inputValue: sd.inputValue,
      totalScore: sd.totalScore,
      date: dateStr,
      time: timeStr
    }

    var recordKey = 'tiandao_study_records_' + this._getUid()
    try {
      var records = wx.getStorageSync(recordKey) || []
      records.unshift(record)
      wx.setStorageSync(recordKey, records)
      wx.showToast({ title: '已添加', icon: 'success' })
      this.setData({ showStudyDetail: false })
    } catch (e) {
      wx.showToast({ title: '记录失败', icon: 'none' })
    }
  }
})
