// 记录运动修行页 JS — 仅炼体类 / 炼气类
// Draft 模式：draftForm 是唯一输入态，永不参与外部回写
const app = getApp()
const {
  SPORT_MOVEMENTS,
  calculateTrainingScore, sumTodayPathScore
} = require('../../utils/score.js')
const { getLiantiGroups, getLianqiGroups } = require('../../utils/sport-movements.js')
const {
  getSelectedCultivationSystem
} = require('../../utils/cultivation.js')
const { validateRecord, getRemainingQuota, isCategoryExhausted } = require('../../utils/record-limits.js')
const customPreset = require('../../utils/custom-preset.js')
const sportPredictor = require('../../utils/sport-predictor.js')

// 仅保留炼体类和炼气类
const TRAINING_PATH_OPTIONS = [
  { key: 'lianti', name: '炼体类', desc: '无氧抗阻训练：举铁、俯卧撑、引体向上、深蹲硬拉、器械训练等' },
  { key: 'lianqi', name: '炼气类', desc: '有氧心肺训练：跑步、游泳、骑行、跳绳、球类、椭圆机等' }
]

var MOVEMENT_TO_PRESET = {
  'bench_press': 'bench_press', 'squat': 'squat', 'deadlift': 'deadlift',
  'pull_up': 'pullup', 'running': 'running_5k', 'cycling': 'cycling_20km',
  'yoga': 'yoga_session', 'meditation': 'meditation', 'reading': 'reading_pages'
}

var LAST_SPORT_KEY_PREFIX = 'tiandao_sport_last_'

Page({
  data: {
    // 训练道途选择
    selectedPathIndex: 0,
    selectedPath: TRAINING_PATH_OPTIONS[0],
    trainingPathOptions: TRAINING_PATH_OPTIONS,
    selectedMovement: null,
    movements: [],
    isLiantiPath: true,

    // 运动表单
    sportForm: { weight: '', reps: '', sets: '', duration: '' },

    // 预览
    previewScore: 0,
    previewMeta: '',
    predictData: null,

    // 适配结果
    fitResult: null,
    fitStyle: null,
    syncedPresetName: '',

    // 配额
    todayRecordsCache: {},
    quota: null,
    isExhausted: false,
    exhaustedReason: '',
    canSubmit: true,

    // 运动选择器
    showMovementPicker: false,
    movementGroups: [],
    movementSearchQuery: '',

    // 身体画像
    bodyProfile: null,

    // 超限确认弹窗
    overLimitModal: { visible: false, warnings: [], onConfirm: null },

    // === Draft 模式 ===
    draftForm: {},
    _hasDraft: false,

    // 反馈
    showFeedbackParticle: false,
    feedbackParticleConfig: {},
    showMilestone: false,
    milestoneData: null,
    milestonePillReward: null,

    loading: true
  },

  // ==================== Draft 模式核心工具 ====================

  _initDraft: function() {
    var sf = this.data.sportForm
    var draft = { weight: sf.weight || '', reps: sf.reps || '', sets: sf.sets || '', duration: sf.duration || '' }
    this.setData({ draftForm: draft, _hasDraft: false })
  },

  _updateHasDraft: function() {
    var d = this.data.draftForm
    var has = false
    for (var k in d) {
      if (d.hasOwnProperty(k) && d[k] !== undefined && d[k] !== '') { has = true; break }
    }
    if (this.data._hasDraft !== has) {
      this.data._hasDraft = has
    }
  },

  _flushDraftField: function(field) {
    var draftVal = this.data.draftForm[field]
    if (draftVal === undefined) return {}
    var update = {}
    update['sportForm.' + field] = draftVal
    return update
  },

  _flushAllDrafts: function() {
    var d = this.data.draftForm
    var update = {}
    for (var k in d) {
      if (d.hasOwnProperty(k) && d[k] !== undefined && d[k] !== '') {
        update['sportForm.' + k] = d[k]
        update['draftForm.' + k] = ''
      }
    }
    update._hasDraft = false
    this.setData(update)
  },

  _loadLastSportValues: function(movementId) {
    try {
      var key = LAST_SPORT_KEY_PREFIX + movementId
      var stored = wx.getStorageSync(key)
      return stored || {}
    } catch (e) {
      return {}
    }
  },

  _saveLastSportValues: function(movementId, detail) {
    try {
      var key = LAST_SPORT_KEY_PREFIX + movementId
      wx.setStorageSync(key, {
        weight: detail.weight !== undefined ? detail.weight : '',
        reps: detail.reps !== undefined ? detail.reps : '',
        sets: detail.sets !== undefined ? detail.sets : '',
        duration: detail.duration !== undefined ? detail.duration : '',
        time: Date.now()
      })
    } catch (e) {
      console.error('保存训练默认值失败', e)
    }
  },

  // ==================== 生命周期 ====================

  onLoad: function() {
    try {
      var bp = app.globalData.bodyProfile || wx.getStorageSync('tiandao_body_profile') || null
      if (bp && !bp.bmi) {
        var h = Number(bp.height) / 100
        if (h > 0 && bp.weight) bp.bmi = Math.round(bp.weight / (h * h) * 10) / 10
      }
      this.setData({ bodyProfile: bp })
    } catch (e) { console.error('加载身体画像失败', e) }

    this.setData({
      movements: SPORT_MOVEMENTS.filter(function(m) { return m.trainingPath === 'lianti' })
    })

    this._initDraft()
    this.loadTodayQuota()
    this.updatePreviewScore()
    this.setData({ loading: false })
  },

  getSystemKey: function() {
    if (app.getSelectedCultivationSystem) return app.getSelectedCultivationSystem()
    return getSelectedCultivationSystem()
  },

  // ========== 道途选择 ==========

  onPathChange: function(e) {
    var index = Number(e.detail.value) || 0
    var selectedPath = this.data.trainingPathOptions[index] || TRAINING_PATH_OPTIONS[0]
    var groupFn = selectedPath.key === 'lianti' ? getLiantiGroups : getLianqiGroups
    var groups = groupFn()
    var allMovements = []
    groups.forEach(function(g) { allMovements = allMovements.concat(g.items) })
    var isLianti = selectedPath.key === 'lianti'
    var update = {
      selectedPathIndex: index,
      selectedPath: selectedPath,
      selectedMovement: null,
      movements: allMovements,
      isLiantiPath: isLianti,
      syncedPresetName: '',
      previewScore: 0,
      previewMeta: '',
      predictData: null,
      movementGroups: groups,
      movementSearchQuery: ''
    }
    // 切换到炼气类：清空重量/次数/组数，仅保留时长
    if (!isLianti) {
      update['sportForm.weight'] = ''
      update['sportForm.reps'] = ''
      update['sportForm.sets'] = ''
      update['draftForm.weight'] = ''
      update['draftForm.reps'] = ''
      update['draftForm.sets'] = ''
    }
    this.setData(update)
    this.updatePreviewScore()
  },

  // ========== 运动搜索选择器 ==========

  openMovementPicker: function() {
    var pathKey = 'lianti'
    if (this.data.selectedPath) {
      pathKey = this.data.selectedPath.key
    }
    var groups = pathKey === 'lianti' ? getLiantiGroups() : getLianqiGroups()
    this.setData({
      showMovementPicker: true,
      movementGroups: groups,
      movementSearchQuery: ''
    })
  },

  closeMovementPicker: function() {
    this.setData({ showMovementPicker: false, movementSearchQuery: '' })
  },

  onMovementSearch: function(e) {
    var query = (e.detail.value || '').trim()
    var pathKey = (this.data.selectedPath && this.data.selectedPath.key) || 'lianti'
    var allGroups = pathKey === 'lianti' ? getLiantiGroups() : getLianqiGroups()

    if (!query) {
      this.setData({ movementGroups: allGroups, movementSearchQuery: '' })
      return
    }
    var q = query.toLowerCase()
    var filtered = []
    allGroups.forEach(function(g) {
      var matched = g.items.filter(function(item) {
        if (item.name.toLowerCase().indexOf(q) !== -1) return true
        return (item.aliases || []).some(function(a) { return a.toLowerCase().indexOf(q) !== -1 })
      })
      if (matched.length > 0) {
        filtered.push({ groupName: g.groupName, groupDesc: g.groupDesc, items: matched })
      }
    })
    this.setData({ movementGroups: filtered, movementSearchQuery: query })
  },

  clearMovementSearch: function() {
    var pathKey = (this.data.selectedPath && this.data.selectedPath.key) || 'lianti'
    var groups = pathKey === 'lianti' ? getLiantiGroups() : getLianqiGroups()
    this.setData({ movementGroups: groups, movementSearchQuery: '' })
  },

  onMovementSelect: function(e) {
    var movement = e.currentTarget.dataset.movement
    if (!movement) return

    var lastValues = this._loadLastSportValues(movement.id)
    var sf = this.data.sportForm
    var isLianti = movement.trainingPath === 'lianti'

    var update = { selectedMovement: movement, syncedPresetName: '' }

    if (isLianti) {
      // 重量按 needWeight 条件处理：仅负重动作加载/保留上次重量，自重动作清空
      if (movement.needWeight) {
        update['sportForm.weight'] = lastValues.weight !== undefined ? lastValues.weight : (sf.weight || '')
        update['draftForm.weight'] = lastValues.weight !== undefined ? lastValues.weight : ''
      } else {
        update['sportForm.weight'] = ''
        update['draftForm.weight'] = ''
      }
      update['sportForm.reps'] = lastValues.reps !== undefined ? lastValues.reps : (sf.reps || '')
      update['sportForm.sets'] = lastValues.sets !== undefined ? lastValues.sets : (sf.sets || '')
      update['draftForm.reps'] = lastValues.reps !== undefined ? lastValues.reps : ''
      update['draftForm.sets'] = lastValues.sets !== undefined ? lastValues.sets : ''
    }
    // 两种道途都需要时长
    update['sportForm.duration'] = lastValues.duration !== undefined ? lastValues.duration : (sf.duration || '')
    update['draftForm.duration'] = lastValues.duration !== undefined ? lastValues.duration : ''

    this.setData(update)
    this.closeMovementPicker()
    this._syncPreview()
  },

  // ==================== Draft 模式输入 ====================

  onInputChange: function(e) {
    var field = e.currentTarget.dataset.field
    var value = e.detail.value
    var update = {}
    update['draftForm.' + field] = value
    try {
      this._calcPreviewInto(update, field, value)
    } catch (ignore) {}
    this.setData(update)
  },

  onInputBlur: function(e) {
    var field = e.currentTarget.dataset.field
    var syncUpdate = this._flushDraftField(field)
    if (Object.keys(syncUpdate).length > 0) {
      this.setData(syncUpdate)
    }
    this._updateHasDraft()
    this.updatePreviewScore()
  },

  // ==================== 预览计算 ====================

  _calcPreviewInto: function(update, draftField, draftValue) {
    if (!this.data.selectedMovement) {
      update.previewScore = 0
      update.previewMeta = ''
      update.predictData = null
      return
    }
    var sf = this.data.sportForm
    var df = this.data.draftForm
    var pathKey = this.data.selectedPath ? this.data.selectedPath.key : 'lianti'

    var getMerged = function(f) {
      if (draftField === f && draftValue !== undefined) return draftValue
      if (df[f] !== undefined && df[f] !== '') return df[f]
      return sf[f]
    }

    var params = {
      trainingPath: pathKey,
      trainingType: '',
      movement: this.data.selectedMovement ? this.data.selectedMovement.id : '',
      name: this.data.selectedMovement ? this.data.selectedMovement.name : '',
      sets: Number(getMerged('sets')) || 0,
      reps: Number(getMerged('reps')) || 0,
      weight: Number(getMerged('weight')) || 0,
      duration: Number(getMerged('duration')) || 0,
      itemCount: 1
    }
    var bp = this.data.bodyProfile || app.globalData.bodyProfile || null
    var result = sportPredictor.predictQuick(params, bp, { systemKey: this.getSystemKey() })

    update.previewScore = result.cultivation ? result.cultivation.score : 0
    // score 为 0 时（参数不全）清空预测卡片和强度标签
    if (update.previewScore <= 0) {
      update.previewMeta = ''
      update.predictData = null
      return
    }
    var metaParts = []
    if (result.cultivation && result.cultivation.pathName) metaParts.push(result.cultivation.pathName)
    if (result.cultivation && result.cultivation.bodyMultiplier && result.cultivation.bodyMultiplier !== 1)
      metaParts.push('体质修正x' + result.cultivation.bodyMultiplier.toFixed(2))
    if (result.cultivation && result.cultivation.bonusRate > 0)
      metaParts.push('体系加成' + Math.round(result.cultivation.bonusRate * 100) + '%')
    update.previewMeta = metaParts.join(' · ')
    update.predictData = result
  },

  _syncPreview: function() {
    if (this.data._hasDraft) return
    var update = {}
    try { this._calcPreviewInto(update) } catch (e) {}
    if (Object.keys(update).length > 0) {
      this.setData(update)
    }
  },

  buildSportScoreParams: function() {
    var sf = this.data.sportForm
    return {
      trainingPath: this.data.selectedPath ? this.data.selectedPath.key : 'lianti',
      trainingType: '',
      movement: this.data.selectedMovement ? this.data.selectedMovement.id : '',
      name: this.data.selectedMovement ? this.data.selectedMovement.name : '',
      sets: Number(sf.sets) || 0,
      duration: Number(sf.duration) || 0,
      reps: Number(sf.reps) || 0,
      weight: Number(sf.weight) || 0,
      itemCount: 1
    }
  },

  _applySportPreview: function(predictResult) {
    if (this.data._hasDraft) return
    if (!predictResult || !predictResult.cultivation || predictResult.cultivation.score <= 0) {
      this.setData({ previewScore: 0, previewMeta: '', predictData: null })
      return
    }
    var metaParts = [predictResult.cultivation.pathName || '']
    if (predictResult.cultivation.bodyMultiplier && predictResult.cultivation.bodyMultiplier !== 1) {
      metaParts.push('体质修正x' + predictResult.cultivation.bodyMultiplier.toFixed(2))
    }
    if (predictResult.cultivation.bonusRate > 0) {
      metaParts.push('体系加成' + Math.round(predictResult.cultivation.bonusRate * 100) + '%')
    }
    if (predictResult.cultivation.capped) {
      metaParts.push('已触达单日上限')
    }
    this.setData({
      previewScore: predictResult.cultivation.score,
      previewMeta: metaParts.join(' · '),
      predictData: predictResult
    })
  },

  updatePreviewScore: async function() {
    if (this.data._hasDraft) return
    try {
      if (!this.data.selectedMovement) {
        this.setData({ previewScore: 0, previewMeta: '', predictData: null })
        return
      }
      var params = this.buildSportScoreParams()
      var bp = this.data.bodyProfile || app.globalData.bodyProfile || null
      var todayRecords = await this.fetchTodaySportRecords()

      if (this.data._hasDraft) return

      var todayTypeScore = sumTodayPathScore(todayRecords, params.trainingPath)
      var result = sportPredictor.predict(params, bp, {
        systemKey: this.getSystemKey(), todayTypeScore: todayTypeScore
      })
      this._applySportPreview(result)
    } catch (error) {
      console.error('预估修为失败', error)
      if (this.data._hasDraft) return
      this.setData({ previewScore: 0, previewMeta: '', predictData: null })
    }
  },

  // ========== 提交 ==========

  submitSport: async function() {
    this._flushAllDrafts()

    try {
      var todayRecords = await this.fetchTodaySportRecords()
      var params = this.buildSportScoreParams()
      var entry = {
        name: this.data.selectedMovement ? this.data.selectedMovement.name : '武道训练',
        movementId: this.data.selectedMovement ? this.data.selectedMovement.id : null,
        category: 'sport',
        detail: {
          trainingPath: params.trainingPath,
          sets: params.sets,
          reps: params.reps,
          weight: params.weight,
          duration: params.duration
        }
      }
      entry.detail.movementId = entry.movementId

      var validation = validateRecord('sport', entry, todayRecords)
      if (!validation.valid) {
        app.showSystemToast(validation.reason || '不符合记录规则')
        return
      }

      var todayTypeScore = sumTodayPathScore(todayRecords, params.trainingPath)
      var result = calculateTrainingScore(params, {
        systemKey: this.getSystemKey(), todayTypeScore: todayTypeScore,
        bodyProfile: this.data.bodyProfile
      })

      if (result.score <= 0) {
        app.showSystemToast('今日该道途修为已达上限，或参数不足')
        return
      }

      var predictData = this.data.predictData
      var self = this
      if (predictData && predictData.overLimit && predictData.overLimit.hasOverLimit) {
        this._openOverLimitConfirm(predictData.overLimit, function() {
          self._proceedSportSubmit(result, entry)
        })
      } else if (result.sportFit && result.sportFit.warnings && result.sportFit.warnings.length > 0) {
        wx.showModal({
          title: '修炼警示',
          content: result.sportFit.warnings.join('\n'),
          showCancel: true, cancelText: '取消', confirmText: '仍然提交',
          success: function(res) { if (res.confirm) self.doSaveSportRecord(result, entry) }
        })
      } else {
        this.doSaveSportRecord(result, entry)
      }
    } catch (error) {
      console.error('武道提交失败', error)
      app.showSystemToast('结算失败，请稍后再试')
    }
  },

  _openOverLimitConfirm: function(overLimit, onConfirm) {
    this.setData({
      'overLimitModal.visible': true,
      'overLimitModal.warnings': overLimit.warnings || [],
      'overLimitModal.onConfirm': onConfirm
    })
  },

  onOverLimitConfirm: function() {
    var onConfirm = this.data.overLimitModal.onConfirm
    this.setData({ 'overLimitModal.visible': false, 'overLimitModal.warnings': [], 'overLimitModal.onConfirm': null })
    if (typeof onConfirm === 'function') onConfirm()
  },

  onOverLimitCancel: function() {
    this.setData({ 'overLimitModal.visible': false, 'overLimitModal.warnings': [], 'overLimitModal.onConfirm': null })
    app.showSystemToast('已取消提交，请修正数据后重试')
  },

  _proceedSportSubmit: function(result, entry) {
    var sportFit = result.sportFit
    var self = this
    if (sportFit && sportFit.warnings && sportFit.warnings.length > 0) {
      wx.showModal({
        title: '修炼警示',
        content: sportFit.warnings.join('\n'),
        showCancel: true, cancelText: '取消', confirmText: '仍然提交',
        success: function(res) { if (res.confirm) self.doSaveSportRecord(result, entry) }
      })
    } else {
      this.doSaveSportRecord(result, entry)
    }
  },

  doSaveSportRecord: function(result, entry) {
    var recordData = {
      name: entry.name,
      category: 'sport',
      score: result.score,
      detail: entry.detail,
      sportFit: result.sportFit || null,
      bodyMultiplier: result.bodyMultiplier || 1,
      bonusRate: result.bonusRate || 0,
      createTime: Date.now()
    }
    var localRecords = wx.getStorageSync('tiandao_today_records') || []
    localRecords.push(recordData)
    wx.setStorageSync('tiandao_today_records', localRecords)

    if (this.data.selectedMovement) {
      this.syncMovementToCultivation(entry, this.data.bodyProfile)
    }

    if (entry.movementId && entry.detail) {
      this._saveLastSportValues(entry.movementId, entry.detail)
    }

    app.showSystemToast('武道记录成功，修为 +' + result.score)
    this._triggerCultivationFeedback('sport', result.score)
    this.setData({ previewScore: 0, previewMeta: '', predictData: null })
    this.loadTodayQuota()
    this.updatePreviewScore()
  },

  // ========== 自动同步到修行面板 ==========

  syncMovementToCultivation: function(entry, bodyProfile) {
    var movementId = entry.movementId || (entry.detail && entry.detail.movementId)
    if (!movementId) return
    var presetId = MOVEMENT_TO_PRESET[movementId]
    if (!presetId) return

    try {
      var metrics = {}
      var detail = entry.detail || {}
      if (presetId === 'bench_press' || presetId === 'squat' || presetId === 'deadlift' || presetId === 'pullup') {
        metrics.training_weight = Number(detail.weight) || 0
        metrics.reps = Number(detail.reps) || 0
        metrics.sets = Number(detail.sets) || 0
        metrics.RPE = 8
      } else if (presetId === 'running_5k') {
        metrics.time_minutes = Number(detail.duration) || 0
        metrics.cadence = Math.round(180)
      } else if (presetId === 'cycling_20km') {
        metrics.time_minutes = Number(detail.duration) || 0
      } else if (presetId === 'yoga_session' || presetId === 'meditation') {
        metrics.duration_minutes = Number(detail.duration) || 0
        metrics.focus_quality = 2
      } else if (presetId === 'reading_pages') {
        metrics.pages = 20
        metrics.focus_minutes = Number(detail.duration) || 0
      }

      var bp = bodyProfile || {}
      var computed = customPreset.calcPresetScore(presetId, metrics, bp)
      var key = 'tiandao_metrics_' + presetId
      var stored = wx.getStorageSync(key) || { latest: null, history: [] }
      stored.latest = { score: computed.score, metrics: metrics, computed: computed, time: Date.now() }
      if (!stored.history) stored.history = []
      stored.history.push(stored.latest)
      if (stored.history.length > 30) stored.history = stored.history.slice(-30)
      wx.setStorageSync(key, stored)
    } catch (e) {
      console.error('同步修行指标失败', e)
    }
  },

  // ========== 配额管理 ==========

  loadTodayQuota: function() {
    this.fetchTodaySportRecords().then(function(records) {
      if (this.data._hasDraft) {
        this.data.todayRecordsCache = records
        return
      }
      var todayRecords = records || []
      var quota = getRemainingQuota('sport', todayRecords)
      var exhausted = isCategoryExhausted('sport', todayRecords)
      this.setData({
        todayRecordsCache: todayRecords,
        quota: quota,
        isExhausted: exhausted.exhausted,
        exhaustedReason: exhausted.reason || '',
        canSubmit: !exhausted.exhausted
      })
    }.bind(this)).catch(function(e) {
      console.error('加载配额失败', e)
    })
  },

  fetchTodaySportRecords: async function() {
    if (this.data.todayRecordsCache && this.data.todayRecordsCache.length > 0) {
      return Promise.resolve(this.data.todayRecordsCache)
    }
    var local = wx.getStorageSync('tiandao_today_records') || []
    var filtered = local.filter(function(r) { return r.category === 'sport' && r.createTime > new Date(new Date().toDateString()).getTime() })
    return Promise.resolve(filtered)
  },

  // ========== 修炼反馈 ==========

  _triggerCultivationFeedback: function(category, score) {
    try {
      var feedbackEngine = require('../../utils/feedback-engine.js')
      var pillSystem = require('../../utils/pill-system.js')
      var app = getApp()
      var profile = app.globalData.userProfile || {}
      var streakDays = (profile.streakDays || 0) + 1
      var realmId = profile.realmId || 'lianqi'

      var feedback = feedbackEngine.generateFeedbackPackage({
        category: category,
        score: score,
        realmId: realmId,
        streakDays: streakDays
      })

      this.setData({
        showFeedbackParticle: true,
        feedbackParticleConfig: feedback.particle
      })
      setTimeout(function() {
        this.setData({ showFeedbackParticle: false })
      }.bind(this), feedback.particle.count > 8 ? 2000 : 1500)

      if (feedback.quote) {
        setTimeout(function() {
          app.showSystemToast(feedback.quote)
        }, 300)
      }

      if (feedback.milestone) {
        var pillReward = pillSystem.checkMilestonePillReward(feedback.milestone.days)
        if (pillReward) {
          pillSystem.obtainPill(pillReward, 1)
        }
        setTimeout(function() {
          this.setData({
            showMilestone: true,
            milestoneData: feedback.milestone,
            milestonePillReward: pillReward
          })
        }.bind(this), 800)
        setTimeout(function() {
          this.setData({ showMilestone: false })
        }.bind(this), 3500)
      }

      try { app.emitAppEvent('cultivation-feedback', feedback) } catch (e) {}
    } catch (e) {
      console.error('[feedback] 修炼反馈触发失败', e)
    }
  },

  onCloseMilestone: function() {
    this.setData({ showMilestone: false })
  },

  // 占位方法，避免 WXML 中的 catchtap="noop" 报错
  noop: function() {}
})
