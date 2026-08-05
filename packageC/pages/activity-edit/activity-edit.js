// packageC/pages/activity-edit/activity-edit.js
// 自定义活动编辑页 — 可编辑 name/category/unit/scorePerUnit/description/icon
// 支持三种模式: default(默认), metaCard(元卡创建), isNew(复制)

var app = getApp()
var metaCards = require('../../../utils/meta-cards.js')

// 分类选项
var CATEGORY_OPTIONS = [
  { key: 'sport', label: '武·炼体' },
  { key: 'diet', label: '食·丹食' },
  { key: 'study', label: '悟·修心' },
  { key: 'work', label: '工·功业' },
  { key: 'debuff', label: '煞·心魔' }
]

// 单位选项
var UNIT_OPTIONS = ['次', '分钟', '组', '秒', '份']

// 元卡列表（顶部切换 chips）
var META_CARD_LIST = [
  { id: 'push', name: '推' },
  { id: 'pull', name: '拉' },
  { id: 'squat', name: '蹲' },
  { id: 'hold', name: '撑' },
  { id: 'curl', name: '卷' },
  { id: 'steady_cardio', name: '稳态有氧' },
  { id: 'interval_cardio', name: '间歇有氧' },
  { id: 'unknown', name: '不知道' }
]

// 容量格子类型选项
var CELL_TYPES = [
  { type: 'weight', name: '重量' },
  { type: 'reps', name: '次数' },
  { type: 'sets', name: '组数' },
  { type: 'time', name: '时长' },
  { type: 'distance', name: '距离' },
  { type: 'custom', name: '自定义' }
]

Page({
  data: {
    themeClass: '',
    activityId: '',
    isNew: true,  // 是否新建（vs编辑已有）

    // 页面模式: 'default' | 'metaCard'
    mode: 'default',

    // 表单字段
    name: '',
    categoryIndex: 0,
    categories: CATEGORY_OPTIONS,
    unit: '次',
    scorePerUnit: '1',
    description: '',
    icon: '',

    // 自由度字段
    categoryName: '',
    ext: {},           // { key: val, ... }
    extKey: '',        // 编辑中的属性名
    extVal: '',        // 编辑中的属性值
    extList: [],       // 展示用的 [{ key, val }]
    tagsStr: '',       // 输入中的标签字符串（逗号分隔）
    showAdvanced: false,
    customMetaStr: '',  // JSON 文本输入

    // 原活动名称（复制时用）
    originActivityName: '',

    // ── 元卡模式字段 ──
    selectedMetaCard: '',          // 当前元卡 id
    metaCardList: META_CARD_LIST,  // 元卡列表
    metaCardInfo: null,            // 元卡完整定义
    muscleWeights: [],             // 肌群权重 [{ id, name, weight, group:'primary'|'secondary' }]
    showSecondaryMuscles: false,   // 是否展开辅助肌群
    cells: [],                     // 容量格子 [{ id, type, name, unit, value, weight, typeIndex }]
    cellTypeOptions: [],           // 当前元卡可用的格子类型
    matchedTemplate: null,         // 匹配到的动作模板对象
    matchedTemplateName: '',       // 匹配到的模板名
    extraParamValues: {},          // 额外参数值 { rom: '全程', intensity: '适中' }

    saving: false
  },

  onLoad: function(options) {
    var tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'

    // ── 元卡模式入口检测 ──
    if (options && options.metaCard) {
      this.setData({
        themeClass: tc,
        mode: 'metaCard',
        categoryIndex: 0  // sport
      })
      this._initMetaCard(options.metaCard)
      return
    }

    this.setData({ themeClass: tc })

    // 从参数获取活动数据
    if (options && options.data) {
      try {
        var act = JSON.parse(decodeURIComponent(options.data))

        // 查找分类索引
        var catIdx = 0
        for (var i = 0; i < CATEGORY_OPTIONS.length; i++) {
          if (CATEGORY_OPTIONS[i].key === (act.category || act.tabKey)) {
            catIdx = i; break
          }
        }

        // 查找单位索引
        var unit = act.unit || '次'

        // 自由字段
        var extList = []
        var ext = act.ext || {}
        for (var k in ext) {
          if (Object.prototype.hasOwnProperty.call(ext, k)) {
            extList.push({ key: k, val: String(ext[k]) })
          }
        }

        var tagsStr = Array.isArray(act.tags) ? act.tags.join(', ') : ''

        this.setData({
          activityId: act.id || act.activityId || '',
          isNew: !!options.isNew,
          name: act.name || '',
          categoryIndex: catIdx,
          unit: unit,
          scorePerUnit: String(act.scorePerUnit != null ? act.scorePerUnit : 1),
          description: act.description || '',
          icon: act.icon || '',
          categoryName: act.categoryName || '',
          ext: ext,
          extList: extList,
          tagsStr: tagsStr,
          customMetaStr: act.customMeta ? JSON.stringify(act.customMeta, null, 2) : '',
          originActivityName: act.originActivityName || options.originActivityName || ''
        })
      } catch (e) {
        console.warn('解析活动数据失败', e)
      }
    }
  },

  onNameInput: function(e) {
    this.setData({ name: e.detail.value })
  },

  onCategoryChange: function(e) {
    this.setData({ categoryIndex: parseInt(e.detail.value) || 0 })
  },

  onUnitInput: function(e) {
    this.setData({ unit: e.detail.value })
  },

  onScoreInput: function(e) {
    this.setData({ scorePerUnit: e.detail.value })
  },

  onDescInput: function(e) {
    this.setData({ description: e.detail.value })
  },

  onIconInput: function(e) {
    this.setData({ icon: e.detail.value })
  },

  // 自由度 handlers
  onCategoryNameInput: function(e) {
    this.setData({ categoryName: e.detail.value })
  },

  onExtKeyInput: function(e) {
    this.setData({ extKey: e.detail.value })
  },

  onExtValInput: function(e) {
    this.setData({ extVal: e.detail.value })
  },

  onAddExt: function() {
    var key = (this.data.extKey || '').trim()
    var val = (this.data.extVal || '').trim()
    if (!key) return
    var extList = this.data.extList.slice()
    // 更新或新增
    var found = false
    for (var i = 0; i < extList.length; i++) {
      if (extList[i].key === key) { extList[i].val = val; found = true; break }
    }
    if (!found) extList.push({ key: key, val: val })
    this.setData({ extList: extList, extKey: '', extVal: '' })
  },

  onRemoveExt: function(e) {
    var idx = e.currentTarget.dataset.index
    var extList = this.data.extList.slice()
    extList.splice(idx, 1)
    this.setData({ extList: extList })
  },

  onTagsInput: function(e) {
    this.setData({ tagsStr: e.detail.value })
  },

  toggleAdvanced: function() {
    this.setData({ showAdvanced: !this.data.showAdvanced })
  },

  onCustomMetaInput: function(e) {
    this.setData({ customMetaStr: e.detail.value })
  },

  // ====================================================================
  //  元卡模式方法
  // ====================================================================

  /** 初始化元卡模式（切换元卡时也会调用） */
  _initMetaCard: function(cardId) {
    var metaCardInfo = metaCards.getMetaCard(cardId)
    if (!metaCardInfo) {
      metaCardInfo = metaCards.getMetaCard('push')
      cardId = 'push'
    }
    this.setData({
      metaCardInfo: metaCardInfo,
      selectedMetaCard: cardId,
      matchedTemplate: null,
      matchedTemplateName: ''
    })
    this._initMuscleWeights(metaCardInfo)
    this._initCells(metaCardInfo)
    this._initExtraParams(metaCardInfo)
  },

  /** 从元卡 musclePool/paramPool 构建肌群权重列表 */
  _initMuscleWeights: function(metaCard) {
    var pool = metaCard.musclePool || metaCard.paramPool || { primary: [], secondary: [] }
    var primary = pool.primary || []
    var secondary = pool.secondary || []
    var weights = []

    for (var i = 0; i < primary.length; i++) {
      weights.push({
        id: primary[i].id,
        name: primary[i].name,
        weight: primary[i].defaultWeight || 0,
        group: 'primary'
      })
    }

    for (var j = 0; j < secondary.length; j++) {
      weights.push({
        id: secondary[j].id,
        name: secondary[j].name,
        weight: secondary[j].defaultWeight || 0,
        group: 'secondary'
      })
    }

    this.setData({ muscleWeights: weights })
  },

  /** 从元卡 defaultCells 初始化容量格子，并计算 typeIndex */
  _initCells: function(metaCard) {
    var defaultCells = metaCard.defaultCells || []
    var cellTypeOptions = this._getCellTypeOptions(metaCard)
    var cells = []

    for (var i = 0; i < defaultCells.length; i++) {
      var dc = defaultCells[i]
      var typeIndex = 0
      for (var j = 0; j < cellTypeOptions.length; j++) {
        if (cellTypeOptions[j].type === dc.type) {
          typeIndex = j
          break
        }
      }
      cells.push({
        id: dc.id || (i + 1),
        type: dc.type,
        name: dc.name || cellTypeOptions[typeIndex].name,
        unit: dc.unit || '',
        value: dc.value || '',
        weight: dc.weight || 0,
        typeIndex: typeIndex
      })
    }

    this.setData({ cells: cells, cellTypeOptions: cellTypeOptions })
  },

  /** 根据元卡允许的 cellTypes 过滤全局 CELL_TYPES */
  _getCellTypeOptions: function(metaCard) {
    var allowedTypes = metaCard.cellTypes || ['weight', 'reps', 'sets', 'time', 'distance', 'custom']
    var result = []
    for (var i = 0; i < CELL_TYPES.length; i++) {
      for (var j = 0; j < allowedTypes.length; j++) {
        if (CELL_TYPES[i].type === allowedTypes[j]) {
          result.push(CELL_TYPES[i])
          break
        }
      }
    }
    return result
  },

  /** 初始化额外参数（如蹲的幅度、有氧的强度） */
  _initExtraParams: function(metaCard) {
    var extraParamValues = {}
    if (metaCard.extraParams) {
      for (var i = 0; i < metaCard.extraParams.length; i++) {
        var ep = metaCard.extraParams[i]
        extraParamValues[ep.id] = ep.default || (ep.options && ep.options[0]) || ''
        // 在 options 中查找默认值的索引
        var defIdx = 0
        if (ep.options) {
          for (var j = 0; j < ep.options.length; j++) {
            if (ep.options[j] === extraParamValues[ep.id]) {
              defIdx = j
              break
            }
          }
        }
        extraParamValues[ep.id + '_idx'] = defIdx
      }
    }
    this.setData({ extraParamValues: extraParamValues })
  },

  /** 元卡选择器切换 */
  onChangeMetaCard: function(e) {
    var cardId = e.currentTarget.dataset.key
    if (cardId === this.data.selectedMetaCard) return
    this._initMetaCard(cardId)
  },

  /** 肌群滑块拖拽 — 实时归一化，保持总和 = 1 */
  onMuscleSliderChange: function(e) {
    var index = e.currentTarget.dataset.index
    var newValue = parseFloat(e.detail.value) / 100
    var muscleWeights = this.data.muscleWeights.slice()

    if (isNaN(newValue)) newValue = 0
    if (newValue < 0) newValue = 0
    if (newValue > 1) newValue = 1

    // 计算其他肌群的总和
    var otherSum = 0
    for (var i = 0; i < muscleWeights.length; i++) {
      if (i !== index) otherSum += muscleWeights[i].weight
    }

    // 更新当前肌群
    muscleWeights[index].weight = newValue

    // 按比例分配剩余权重给其他肌群
    var remaining = 1 - newValue
    if (remaining < 0) remaining = 0

    if (otherSum > 0.0001) {
      for (var j = 0; j < muscleWeights.length; j++) {
        if (j !== index) {
          muscleWeights[j].weight = Math.max(0, remaining * (muscleWeights[j].weight / otherSum))
        }
      }
    } else if (remaining > 0) {
      // 所有其他肌群都为 0，平均分配
      var otherCount = muscleWeights.length - 1
      if (otherCount > 0) {
        var each = remaining / otherCount
        for (var k = 0; k < muscleWeights.length; k++) {
          if (k !== index) muscleWeights[k].weight = each
        }
      }
    }

    this.setData({ muscleWeights: muscleWeights })
  },

  /** 展开/收起辅助肌群 */
  toggleSecondaryMuscles: function() {
    this.setData({ showSecondaryMuscles: !this.data.showSecondaryMuscles })
  },

  /** 名称输入框失焦时匹配动作模板 */
  onNameBlur: function(e) {
    if (this.data.mode !== 'metaCard') return
    var name = (e.detail.value || '').trim()
    if (!name) {
      this.setData({ matchedTemplate: null, matchedTemplateName: '' })
      return
    }

    var matched = metaCards.matchMovement(name)
    if (matched) {
      this.setData({
        matchedTemplate: matched,
        matchedTemplateName: name
      })
      // 自动应用模板肌群权重
      this._applyTemplateMuscles(matched)
    } else {
      this.setData({ matchedTemplate: null, matchedTemplateName: '' })
    }
  },

  /** 将模板的肌群权重覆盖当前值 */
  _applyTemplateMuscles: function(template) {
    if (!template || !template.muscles) return
    var muscleWeights = this.data.muscleWeights.slice()
    var templateMuscles = template.muscles

    // 覆盖模板中定义的肌群权重
    for (var i = 0; i < muscleWeights.length; i++) {
      var mw = muscleWeights[i]
      if (templateMuscles.hasOwnProperty(mw.id)) {
        mw.weight = templateMuscles[mw.id]
      }
    }

    // 归一化确保总和 = 1
    var sum = 0
    for (var j = 0; j < muscleWeights.length; j++) {
      sum += muscleWeights[j].weight
    }
    if (sum > 0) {
      for (var k = 0; k < muscleWeights.length; k++) {
        muscleWeights[k].weight = muscleWeights[k].weight / sum
      }
    }

    this.setData({ muscleWeights: muscleWeights })
  },

  /** 重置为元卡默认值 */
  resetToDefault: function() {
    this._initMuscleWeights(this.data.metaCardInfo)
    this.setData({ matchedTemplate: null, matchedTemplateName: '' })
  },

  /** 切换容量格子类型 */
  onCellTypeChange: function(e) {
    var index = e.currentTarget.dataset.index
    var newTypeIndex = parseInt(e.detail.value)
    var cells = this.data.cells.slice()
    var cellTypeOptions = this.data.cellTypeOptions

    if (newTypeIndex >= 0 && newTypeIndex < cellTypeOptions.length) {
      cells[index].type = cellTypeOptions[newTypeIndex].type
      cells[index].name = cellTypeOptions[newTypeIndex].name
      cells[index].typeIndex = newTypeIndex
    }

    this.setData({ cells: cells })
  },

  /** 输入格子数值 */
  onCellValueInput: function(e) {
    var index = e.currentTarget.dataset.index
    var cells = this.data.cells.slice()
    cells[index].value = parseFloat(e.detail.value) || 0
    this.setData({ cells: cells })
  },

  /** 输入格子单位 */
  onCellUnitInput: function(e) {
    var index = e.currentTarget.dataset.index
    var cells = this.data.cells.slice()
    cells[index].unit = e.detail.value
    this.setData({ cells: cells })
  },

  /** 输入格子权重 */
  onCellWeightInput: function(e) {
    var index = e.currentTarget.dataset.index
    var cells = this.data.cells.slice()
    cells[index].weight = parseFloat(e.detail.value) || 0
    this.setData({ cells: cells })
  },

  /** 添加新格子 */
  addCell: function() {
    var cells = this.data.cells.slice()
    var cellTypeOptions = this.data.cellTypeOptions
    var newId = cells.length > 0 ? cells[cells.length - 1].id + 1 : 1
    var firstType = cellTypeOptions.length > 0 ? cellTypeOptions[0] : { type: 'custom', name: '自定义' }

    cells.push({
      id: newId,
      type: firstType.type,
      name: firstType.name,
      unit: '',
      value: '',
      weight: 0,
      typeIndex: 0
    })
    this.setData({ cells: cells })
  },

  /** 删除格子 */
  removeCell: function(e) {
    var index = e.currentTarget.dataset.index
    var cells = this.data.cells.slice()
    cells.splice(index, 1)
    this.setData({ cells: cells })
  },

  /** 额外参数变更 */
  onExtraParamChange: function(e) {
    var paramId = e.currentTarget.dataset.paramId
    var idx = parseInt(e.detail.value)
    var extraParamValues = {}
    // 浅拷贝当前值
    var current = this.data.extraParamValues
    for (var k in current) {
      if (Object.prototype.hasOwnProperty.call(current, k)) {
        extraParamValues[k] = current[k]
      }
    }

    var metaCardInfo = this.data.metaCardInfo
    if (metaCardInfo && metaCardInfo.extraParams) {
      for (var i = 0; i < metaCardInfo.extraParams.length; i++) {
        var ep = metaCardInfo.extraParams[i]
        if (ep.id === paramId && ep.options && idx < ep.options.length) {
          extraParamValues[paramId] = ep.options[idx]
          extraParamValues[paramId + '_idx'] = idx
          break
        }
      }
    }

    this.setData({ extraParamValues: extraParamValues })
  },

  // 保存
  onSave: function() {
    var self = this
    var name = (this.data.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入活动名称', icon: 'none' })
      return
    }

    var scoreVal = parseFloat(this.data.scorePerUnit)
    if (isNaN(scoreVal) || scoreVal === 0) {
      wx.showToast({ title: '请输入有效的修为值', icon: 'none' })
      return
    }

    if (this.data.saving) return
    this.setData({ saving: true })

    // ── 元卡模式保存 ──
    if (this.data.mode === 'metaCard') {
      var customMeta = {
        metaCard: this.data.selectedMetaCard,
        muscleWeights: [],
        cells: [],
        extraParams: {}
      }

      // 构建肌群权重
      var muscleWeights = this.data.muscleWeights
      for (var mwi = 0; mwi < muscleWeights.length; mwi++) {
        customMeta.muscleWeights.push({
          id: muscleWeights[mwi].id,
          name: muscleWeights[mwi].name,
          weight: muscleWeights[mwi].weight,
          group: muscleWeights[mwi].group
        })
      }

      // 构建容量格子
      var cells = this.data.cells
      for (var ci = 0; ci < cells.length; ci++) {
        customMeta.cells.push({
          id: cells[ci].id,
          type: cells[ci].type,
          name: cells[ci].name,
          unit: cells[ci].unit,
          value: cells[ci].value,
          weight: cells[ci].weight
        })
      }

      // 构建额外参数
      var extraParamValues = this.data.extraParamValues
      for (var ek in extraParamValues) {
        if (Object.prototype.hasOwnProperty.call(extraParamValues, ek) && ek.indexOf('_idx') === -1) {
          customMeta.extraParams[ek] = extraParamValues[ek]
        }
      }

      var metaUnit = (this.data.unit || '次').trim() || '次'
      var metaScore = parseFloat(this.data.scorePerUnit) || 1
      if (isNaN(metaScore)) metaScore = 1

      var metaParams = {
        name: name,
        category: 'sport',
        unit: metaUnit,
        scorePerUnit: metaScore,
        description: this.data.description || '',
        icon: this.data.icon || '',
        categoryName: this.data.categoryName || '',
        ext: {},
        tags: [],
        customMeta: customMeta
      }

      wx.cloud.callFunction({
        name: 'activity-api',
        data: {
          action: 'createCustom',
          params: metaParams
        },
        success: function(res) {
          self.setData({ saving: false })
          if (res.result && res.result.ok) {
            wx.showToast({ title: '创建成功', icon: 'success' })
            self._notifyParentSaved()
            setTimeout(function() { wx.navigateBack() }, 1500)
          } else {
            wx.showToast({ title: (res.result && res.result.error) || '创建失败', icon: 'none' })
          }
        },
        fail: function() {
          self.setData({ saving: false })
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        }
      })
      return
    }

    var catKey = CATEGORY_OPTIONS[this.data.categoryIndex].key
    var unit = (this.data.unit || '次').trim() || '次'

    // 构建 ext 对象
    var extObj = {}
    var extList = this.data.extList
    for (var i = 0; i < extList.length; i++) {
      if (extList[i].key) extObj[extList[i].key] = extList[i].val
    }

    // 解析 tags
    var tagsArr = (this.data.tagsStr || '').split(/[,，]/).map(function(t) { return t.trim() }).filter(Boolean)

    // 解析 customMeta
    var existingCustomMeta = null
    if (this.data.customMetaStr.trim()) {
      try { existingCustomMeta = JSON.parse(this.data.customMetaStr) }
      catch (e) { wx.showToast({ title: '高级设置 JSON 格式错误', icon: 'none' }); return }
    }

    var params = {
      name: name,
      category: catKey,
      unit: unit,
      scorePerUnit: scoreVal,
      description: this.data.description || '',
      icon: this.data.icon || '',
      categoryName: this.data.categoryName || '',
      ext: extObj,
      tags: tagsArr,
      customMeta: existingCustomMeta
    }

    if (this.data.isNew) {
      // 有原活动 id → 复制场景
      if (this.data.activityId) {
        wx.cloud.callFunction({
          name: 'user-activity',
          data: {
            action: 'copy',
            params: {
              originActivityId: this.data.activityId,
              name: params.name,
              unit: params.unit,
              scorePerUnit: params.scorePerUnit,
              description: params.description,
              categoryName: params.categoryName,
              icon: params.icon,
              ext: params.ext,
              tags: params.tags,
              customMeta: params.customMeta
            }
          },
          success: function(res) {
            self.setData({ saving: false })
            if (res.result && res.result.ok) {
              wx.showToast({ title: '复制成功，你可以修改了', icon: 'success' })
              var newActId = (res.result.data && res.result.data.activity && res.result.data.activity.activityId) || ''
              if (newActId) {
                self.setData({ activityId: newActId, isNew: false })
              }
              setTimeout(function() { wx.navigateBack() }, 1500)
            } else {
              var errMsg = (res.result && res.result.error) || '操作失败'
              if (errMsg.indexOf('已复制过') !== -1) {
                wx.showToast({ title: '你已经复制过这个活动了', icon: 'none' })
              } else {
                wx.showToast({ title: errMsg, icon: 'none' })
              }
            }
          },
          fail: function() {
            self.setData({ saving: false })
            wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
          }
        })
      } else {
        // 纯新建：无原活动 → 调用 activity-api createCustom
        wx.cloud.callFunction({
          name: 'activity-api',
          data: {
            action: 'createCustom',
            params: params
          },
          success: function(res) {
            self.setData({ saving: false })
            if (res.result && res.result.ok) {
              wx.showToast({ title: '创建成功', icon: 'success' })
              self._notifyParentSaved()
              setTimeout(function() { wx.navigateBack() }, 1500)
            } else {
              wx.showToast({ title: (res.result && res.result.error) || '创建失败', icon: 'none' })
            }
          },
          fail: function() {
            self.setData({ saving: false })
            wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
          }
        })
      }
    } else {
      // 编辑模式
      params.activityId = this.data.activityId
      wx.cloud.callFunction({
        name: 'user-activity',
        data: {
          action: 'update',
          params: params
        },
        success: function(res) {
          self.setData({ saving: false })
          if (res.result && res.result.ok) {
            wx.showToast({ title: '保存成功', icon: 'success' })
            self._notifyParentSaved()
            setTimeout(function() { wx.navigateBack() }, 1500)
          } else {
            wx.showToast({ title: (res.result && res.result.error) || '保存失败', icon: 'none' })
          }
        },
        fail: function() {
          self.setData({ saving: false })
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        }
      })
    }
  },

  // 通知上页活动已更新
  _notifyParentSaved: function() {
    var pages = getCurrentPages()
    if (pages.length > 1) {
      var prevPage = pages[pages.length - 2]
      if (prevPage._reloadActivities) {
        prevPage._reloadActivities()
      }
    }
  },

  // 取消
  onCancel: function() {
    wx.navigateBack()
  }
})
