// 天道修行 - 自定义修行项目页（根骨体系）v2.0
// 根骨分类标签页 + 已添加项目展示 + 多选添加/移除机制

var app = getApp()
var customPreset = require('../../../utils/custom-preset.js')
var rootBone = require('../../../utils/root-bone.js')

Page({
  data: {
    // 根骨分类
    boneCategories: [],       // 格式化的分类列表 { id, name, icon, color, desc }
    activeBone: 'strength',
    boneMeta: null,           // 当前根骨元数据
    boneLevel: null,          // 当前根骨等级信息

    // 修行项目
    presets: [],              // 当前根骨下用户已添加的项目
    allBonePresets: [],       // 当前根骨全量项目（添加弹窗用）

    // 添加项目弹窗
    showAddPicker: false,
    addSearchQuery: '',
    addCheckMap: {},          // { presetId: true/false }

    // 表单
    showForm: false,
    activePreset: null,
    formMetrics: {},
    metricInputs: {},
    selectValues: {},
    selectLabels: {},

    // 结果
    calcResult: null,

    // 历史
    historyRecords: [],

    // 用户画像
    bodyProfile: null,

    loading: true,

    // 综合根骨
    compositeName: '',
    compositeScore: 0,
    globalBonusPercent: 0,

    // 称号
    showTitles: false,
    boneTitles: [],
  },

  onLoad: function(options) {
    this._initBoneCategories()
    this.switchBone({ currentTarget: { dataset: { id: 'strength' } } })
    this.loadBodyProfile()
    this.loadHistory()
    this.setData({ loading: false })

    if (options && options.tab === 'titles') {
      this.setData({ showTitles: true })
      this._loadBoneTitles()
    }
  },

  onShow: function() {
    this.loadBodyProfile()
    this.loadHistory()
    // 刷新当前根骨的等级和项目列表
    if (this.data.activeBone) {
      this._refreshBoneData(this.data.activeBone)
    }
  },

  // ==================== 根骨分类 ====================

  _initBoneCategories: function() {
    var bones = rootBone.ROOT_BONES
    var cats = []
    Object.keys(bones).forEach(function(id) {
      cats.push({
        id: id,
        name: bones[id].name,
        icon: bones[id].icon,
        color: bones[id].color,
        desc: bones[id].desc
      })
    })
    this.setData({ boneCategories: cats })
  },

  switchBone: function(e) {
    var boneId = e.currentTarget.dataset.id
    if (this.data.showTitles) {
      this.setData({ activeBone: boneId })
      this._loadBoneTitles()
    } else {
      this.setData({ activeBone: boneId })
      this._refreshBoneData(boneId)
    }
  },

  _loadBoneTitles: function() {
    var titles = rootBone.getAllTitles()
    // 过滤出当前根骨相关的单项称号 + 所有综合称号
    var currentBoneId = this.data.activeBone
    var filtered = titles.filter(function(t) {
      return !t.boneId || t.boneId === currentBoneId
    })
    // 综合称号放在前面
    filtered.sort(function(a, b) {
      if (!a.boneId && b.boneId) return -1
      if (a.boneId && !b.boneId) return 1
      return 0
    })
    this.setData({ boneTitles: filtered })
  },

  closeTitles: function() {
    this.setData({ showTitles: false })
    this._refreshBoneData(this.data.activeBone)
  },

  /**
   * 刷新某根骨下的所有数据：元数据、等级、项目列表
   */
  _refreshBoneData: function(boneId) {
    var bone = rootBone.ROOT_BONES[boneId]
    if (!bone) return

    var boneLevel = rootBone.calculateBoneLevel(boneId)

    this.setData({
      boneMeta: {
        id: boneId,
        name: bone.name,
        icon: bone.icon,
        color: bone.color,
        desc: bone.desc
      },
      boneLevel: {
        name: boneLevel.name,
        color: boneLevel.color,
        score: boneLevel.score,
        progress: boneLevel.progress,
        nextLevel: boneLevel.nextLevel
      }
    })

    var comp = rootBone.calculateComposite()
    this.setData({
      compositeName: comp.compositeName,
      compositeScore: comp.compositeScore,
      globalBonusPercent: comp.globalBonusPercent
    })

    this._loadUserPresets(boneId)
  },

  // ==================== 用户项目列表 ====================

  _loadUserPresets: function(boneId) {
    var addedIds = rootBone.getUserAddedPresets(boneId)
    // 使用合并后的全量数据源（预设库 + 运动知识库）构建 lookup
    var allPresets = customPreset.getAllPresetsForBoneCategory(boneId)
    var lookup = {}
    allPresets.forEach(function(p) { lookup[p.id] = p })

    var presets = []
    addedIds.forEach(function(id) {
      if (lookup[id]) presets.push(lookup[id])
    })
    this.setData({ presets: presets })
  },

  // ==================== 添加项目弹窗 ====================

  openAddProject: function() {
    var boneId = this.data.activeBone
    // 获取当前根骨下所有预设
    var allPresets = customPreset.getAllPresetsForBoneCategory(boneId)
    // 获取用户已添加的
    var addedIds = rootBone.getUserAddedPresets(boneId)
    var checkMap = {}
    var displayList = allPresets.map(function(p) {
      var isChecked = addedIds.indexOf(p.id) !== -1
      checkMap[p.id] = isChecked
      return {
        id: p.id,
        icon: p.icon,
        name: p.name,
        cultivationName: p.cultivationName,
        desc: p.desc,
        color: p.color,
        checked: isChecked
      }
    })

    this.setData({
      showAddPicker: true,
      allBonePresets: displayList,
      addSearchQuery: '',
      addCheckMap: checkMap
    })
  },

  closeAddPicker: function() {
    this.setData({ showAddPicker: false, addSearchQuery: '', addCheckMap: {} })
  },

  onAddSearchInput: function(e) {
    var query = (e.detail.value || '').trim().toLowerCase()
    this.setData({ addSearchQuery: query })
    if (!query) {
      // 恢复完整列表
      this.openAddProject()
      return
    }
    // 过滤搜索
    var boneId = this.data.activeBone
    var allPresets = customPreset.getAllPresetsForBoneCategory(boneId)
    var checkMap = this.data.addCheckMap || {}
    var filtered = allPresets
      .filter(function(p) {
        return p.name.toLowerCase().indexOf(query) !== -1 ||
          p.cultivationName.toLowerCase().indexOf(query) !== -1 ||
          (p.desc || '').toLowerCase().indexOf(query) !== -1
      })
      .map(function(p) {
        return {
          id: p.id,
          icon: p.icon,
          name: p.name,
          cultivationName: p.cultivationName,
          desc: p.desc,
          color: p.color,
          checked: checkMap[p.id] || false
        }
      })
    this.setData({ allBonePresets: filtered })
  },

  onToggleAddItem: function(e) {
    var presetId = e.currentTarget.dataset.id
    var checkMap = this.data.addCheckMap || {}
    checkMap[presetId] = !checkMap[presetId]

    // 更新列表中的勾选状态
    var list = this.data.allBonePresets.map(function(item) {
      if (item.id === presetId) {
        item.checked = checkMap[presetId]
      }
      return item
    })

    this.setData({ addCheckMap: checkMap, allBonePresets: list })
  },

  saveAddedProjects: function() {
    var boneId = this.data.activeBone
    var checkMap = this.data.addCheckMap || {}
    var addedIds = []
    Object.keys(checkMap).forEach(function(id) {
      if (checkMap[id]) addedIds.push(id)
    })

    rootBone.setUserAddedPresets(boneId, addedIds)
    this._loadUserPresets(boneId)
    this.closeAddPicker()

    wx.showToast({ title: '已保存', icon: 'success', duration: 1200 })
  },

  // ==================== 身体画像 ====================

  loadBodyProfile: async function() {
    try {
      var profile = null
      if (app.getUserProfile) {
        profile = await app.getUserProfile()
      }
      if (!profile || !profile._id) {
        profile = app.globalData.userProfile || null
      }
      this.setData({ bodyProfile: profile })
    } catch (e) {
      console.error('[custom-metrics] 加载用户画像失败', e)
    }
  },

  // ==================== 项目表单 ====================

  stopPropagation: function() {},

  onInputChange: function(e) {
    var key = e.currentTarget.dataset.key
    var val = e.detail.value
    var inputs = this.data.metricInputs
    inputs[key] = val
    this.setData({ metricInputs: inputs })
  },

  openForm: function(e) {
    var presetId = e.currentTarget.dataset.id
    var preset = customPreset.getPresetById(presetId)
    // 运动库生成的预设不在 ALL_PRESETS 中，从合并数据源查询
    if (!preset) {
      var boneId = this.data.activeBone
      var allPresets = customPreset.getAllPresetsForBoneCategory(boneId)
      for (var i = 0; i < allPresets.length; i++) {
        if (allPresets[i].id === presetId) { preset = allPresets[i]; break }
      }
    }
    if (!preset) return

    var inputs = {}
    var selectValues = {}
    var selectLabels = {}
    preset.metrics.forEach(function(m) {
      if (m.type === 'select') {
        var defVal = m.defaultValue !== undefined ? m.defaultValue : ''
        inputs[m.key] = defVal
        if (m.options) {
          var defIdx = 0
          for (var i = 0; i < m.options.length; i++) {
            if (m.options[i].value === defVal) { defIdx = i; break }
          }
          selectValues[m.key] = defIdx
          selectLabels[m.key] = m.options[defIdx].label
        }
      } else if (m.type === 'text') {
        inputs[m.key] = ''
      } else {
        inputs[m.key] = m.defaultValue !== undefined ? String(m.defaultValue) : ''
      }
    })

    this.setData({
      showForm: true,
      activePreset: preset,
      metricInputs: inputs,
      selectValues: selectValues,
      selectLabels: selectLabels,
      calcResult: null
    })
  },

  closeForm: function() {
    this.setData({
      showForm: false,
      activePreset: null,
      metricInputs: {},
      selectValues: {},
      selectLabels: {},
      calcResult: null
    })
  },

  onSelectChange: function(e) {
    var key = e.currentTarget.dataset.key
    var idx = parseInt(e.detail.value)
    var preset = this.data.activePreset
    if (!preset) return
    var metric = null
    for (var i = 0; i < preset.metrics.length; i++) {
      if (preset.metrics[i].key === key) { metric = preset.metrics[i]; break }
    }
    if (!metric || !metric.options) return
    var inputs = this.data.metricInputs
    var selectValues = this.data.selectValues
    var selectLabels = this.data.selectLabels
    inputs[key] = metric.options[idx].value
    selectValues[key] = idx
    selectLabels[key] = metric.options[idx].label
    this.setData({
      metricInputs: inputs,
      selectValues: selectValues,
      selectLabels: selectLabels
    })
  },

  // ==================== 提交计算 ====================

  submitMetrics: function() {
    var preset = this.data.activePreset
    if (!preset) return

    var inputs = this.data.metricInputs
    for (var i = 0; i < preset.metrics.length; i++) {
      var m = preset.metrics[i]
      if (m.required && (!inputs[m.key] || inputs[m.key] === '')) {
        wx.showToast({ title: '请填写 ' + m.label, icon: 'none' })
        return
      }
    }

    var metrics = {}
    preset.metrics.forEach(function(m) {
      if (m.type === 'number') {
        metrics[m.key] = parseFloat(inputs[m.key]) || 0
      } else {
        metrics[m.key] = inputs[m.key]
      }
    })

    var bp = this.data.bodyProfile || {}
    var result = customPreset.calcPresetScore(preset.id, metrics, bp)
    this.setData({ calcResult: result })

    this.saveToLocal(preset, metrics, result)
    this.saveToCloud(preset, metrics, result)
  },

  saveToLocal: function(preset, metrics, result) {
    try {
      var key = 'tiandao_metrics_' + preset.id
      var existing = wx.getStorageSync(key) || {}
      var today = this.getTodayDate()

      existing.latest = {
        date: today,
        metrics: metrics,
        computed: result.metricsComputed,
        score: result.score
      }

      if (!existing.history) existing.history = []
      existing.history.unshift({
        date: today,
        time: new Date().toTimeString().slice(0, 5),
        metrics: metrics,
        computed: result.metricsComputed,
        score: result.score,
        presetId: preset.id
      })
      if (existing.history.length > 30) existing.history.length = 30

      wx.setStorageSync(key, existing)
    } catch (e) {
      console.error('[custom-metrics] 本地保存失败', e)
    }
  },

  saveToCloud: async function(preset, metrics, result) {
    try {
      var db = app.globalData.db
      var userId = app.globalData.userId
      if (!db || !userId) return

      await db.collection('training_metrics').add({
        data: {
          userId: userId,
          presetId: preset.id,
          presetName: preset.cultivationName,
          category: preset.category,
          metrics: metrics,
          computed: result.metricsComputed,
          score: result.score,
          baseScore: result.baseScore,
          multiplier: result.multiplier,
          date: this.getTodayDate(),
          createdAt: db.serverDate()
        }
      })

      if (result.score > 0) {
        await db.collection('user_profiles').where({ userId: userId }).update({
          data: {
            totalCultivation: db.command.inc(result.score)
          }
        })

        var todayDate = this.getTodayDate()
        await db.collection('records').add({
          data: {
            userId: userId,
            date: todayDate,
            timestamp: Date.now(),
            category: 'sport',
            type: 'sport',
            name: preset.cultivationName,
            score: result.score,
            source: 'custom-metrics',
            detail: {
              presetId: preset.id,
              metrics: metrics,
              computed: result.metricsComputed,
              baseScore: result.baseScore,
              multiplier: result.multiplier
            },
            status: 'confirmed',
            createdAt: db.serverDate()
          }
        })
      }

      wx.showToast({ title: '修行记录已刻入命盘', icon: 'success' })
    } catch (e) {
      console.error('[custom-metrics] 云保存失败', e)
      wx.showToast({ title: '记录成功', icon: 'success' })
    }

    await this.loadHistory()
    // 刷新当前根骨等级数据
    this._refreshBoneData(this.data.activeBone)
    this.closeForm()
  },

  loadHistory: async function() {
    try {
      var allHistory = []
      // 合并数据源：ALL_PRESETS + 各品类运动库生成的预设
      var allPresets = customPreset.ALL_PRESETS.slice()
      var boneIds = Object.keys(rootBone.ROOT_BONES)
      boneIds.forEach(function(bid) {
        var sportPresets = customPreset.getAllPresetsForBoneCategory(bid)
        sportPresets.forEach(function(sp) {
          // 去重
          if (!allPresets.find(function(ap) { return ap.id === sp.id })) {
            allPresets.push(sp)
          }
        })
      })
      var today = this.getTodayDate()

      allPresets.forEach(function(p) {
        var key = 'tiandao_metrics_' + p.id
        var data = wx.getStorageSync(key)
        if (data && data.latest && data.latest.date === today) {
          allHistory.push({
            presetId: p.id,
            icon: p.icon,
            name: p.cultivationName,
            category: p.categoryName,
            color: p.color,
            date: data.latest.date,
            metrics: data.latest.metrics,
            computed: data.latest.computed,
            score: data.latest.score
          })
        }
      })

      try {
        var db = app.globalData.db
        var userId = app.globalData.userId
        if (db && userId) {
          var res = await db.collection('training_metrics')
            .where({ userId: userId, date: today })
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get()
          if (res.data && res.data.length > 0) {
            res.data.forEach(function(r) {
              var preset = customPreset.getPresetById(r.presetId)
              if (preset && !allHistory.find(function(h) { return h.presetId === r.presetId })) {
                allHistory.push({
                  presetId: r.presetId,
                  icon: preset.icon,
                  name: preset.cultivationName,
                  category: preset.categoryName,
                  color: preset.color,
                  date: r.date,
                  metrics: r.metrics,
                  computed: r.computed,
                  score: r.score
                })
              }
            })
          }
        }
      } catch (_) {}

      this.setData({ historyRecords: allHistory })
    } catch (e) {
      console.error('[custom-metrics] 加载历史失败', e)
    }
  },

  getTodayDate: function() {
    var d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }
})
