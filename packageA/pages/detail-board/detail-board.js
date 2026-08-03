const app = getApp()
const {
  CATEGORY_MAP,
  ALL_CATEGORIES,
  BOARD_CONFIG,
  getBoardConfig,
  getDetailPageUrl,
  getCacheKey,
  normalizeRecord,
  sortRecords,
  buildOverview,
  buildCharts,
  buildSections,
  fetchCategoryRecords,
  fetchAllRecords,
  syncUserProfileFromRecords,
  buildUpdatedRecordPayload
} = require('../../../utils/detail-board.js')
const { calculateRealm } = require('../../../utils/cultivation.js')
const { DEBUFF_TYPES } = require('../../../utils/score.js')

Page({
  data: {
    themeClass: 'theme-dusk',
    type: 'sport',
    boardConfig: getBoardConfig('sport'),
    currentRealm: { id: 'lianqi', name: '炼精化气', stage: 1 },
    overviewCards: [],
    periodTabs: [
      { key: 'day', label: '日' },
      { key: 'week', label: '周' },
      { key: 'month', label: '月' }
    ],
    currentPeriod: 'day',
    periodLabel: '日',
    chartBars: [],
    linePoints: [],
    nutritionLegend: [],
    pieStyle: '',
    healthLine: 60,
    allRecords: [],
    visibleRecords: [],
    pageSize: 10,
    pageIndex: 1,
    hasMore: false,
    showEditor: false,
    currentRecordId: '',
    editForm: {},
    debuffTypes: DEBUFF_TYPES,
    categoryTabs: [],
    activeCategory: 'all',
  },

  onLoad(options) {
    var type = options.type || 'all'
    var boardConfig = getBoardConfig(type)
    wx.setNavigationBarTitle({ title: boardConfig.title })
    // 构建类别切换 Tab（全 / 武 / 食 / 悟 / 工 / 煞）
    var categoryTabs = ALL_CATEGORIES.map(function(cat) {
      var cfg = getBoardConfig(cat)
      return { key: cat, shortTitle: cfg.shortTitle, icon: cfg.icon, color: cfg.color }
    })
    var allCfg = getBoardConfig('all')
    categoryTabs.unshift({ key: 'all', shortTitle: allCfg.shortTitle, icon: allCfg.icon, color: allCfg.color })
    this.setData({
      type: type,
      boardConfig: boardConfig,
      categoryTabs: categoryTabs,
      activeCategory: type
    })
    this.restoreCache()
    this.loadBoardData(true)
    this._themeChangedHandler = (payload) => { this.refreshTheme() }
    if (app.onAppEvent) {
      app.onAppEvent('themeOverrideChanged', this._themeChangedHandler)
    }
  },

  onUnload() {
    if (this._themeChangedHandler && app.offAppEvent) {
      app.offAppEvent('themeOverrideChanged', this._themeChangedHandler)
    }
  },

  refreshTheme() {
    const todayScore = this.data.todayScore != null ? this.data.todayScore : 0
    const themeClass = app.resolveThemeClass ? app.resolveThemeClass(todayScore) : 'theme-hongchen'
    this.setData({ themeClass })
  },

  onPullDownRefresh() {
    this.loadBoardData(true).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    this.loadMore()
  },

  restoreCache() {
    var userId = app.globalData.userId || app.getLocalUserId()
    var cacheKey = getCacheKey(userId, this.data.type)
    var cache = wx.getStorageSync(cacheKey)
    if (!cache) return
    var normalized = (cache.records || []).map(function(item) { return normalizeRecord(this.data.type, item) }.bind(this))
    this.applyBoardData(normalized, false)
  },

  /** 切换类别 Tab */
  switchCategory: function(e) {
    var cat = e.currentTarget.dataset.cat
    if (cat === this.data.activeCategory) return
    var boardConfig = getBoardConfig(cat)
    wx.setNavigationBarTitle({ title: boardConfig.title })
    this.setData({ type: cat, boardConfig: boardConfig, activeCategory: cat, pageIndex: 1, visibleRecords: [] })
    this.loadBoardData(true)
  },

  async loadBoardData(showLoading) {
    if (showLoading === undefined) showLoading = false
    var db = app.globalData.db
    var userId = app.globalData.userId
    if (!db || !userId) return

    if (showLoading) wx.showLoading({ title: '推演看板中...' })

    try {
      var profile = await app.ensureUserProfile()
      var todayScore = await app.getTodayScore()
      var type = this.data.type
      // all 类型：聚合全部类别；其他类型：按类别查询
      var records = type === 'all'
        ? await fetchAllRecords(db, userId)
        : await fetchCategoryRecords(db, userId, type)
      var normalized = records.map(function(item) { return normalizeRecord(type, item) })
      var currentRealm = calculateRealm((profile && profile.totalCultivation) || 0)

      this.setData({
        themeClass: app.resolveThemeClass ? app.resolveThemeClass(todayScore) : 'theme-hongchen'
      })
      this.applyBoardData(normalized, true, currentRealm)
    } catch (error) {
      console.error(error)
      app.showSystemToast('详情看板加载失败')
    } finally {
      if (showLoading) wx.hideLoading()
    }
  },

  applyBoardData(records, writeCache = true, realm) {
    const sorted = sortRecords(records)
    const overviewCards = buildOverview(this.data.type, sorted)
    const chartData = buildCharts(this.data.type, sorted, this.data.currentPeriod)
    const sectionRecords = buildSections(this.data.type, sorted)
    const hasMore = sectionRecords.length > this.data.pageSize
    const visibleRecords = sectionRecords.slice(0, this.data.pageSize)
    const periodMap = { day: '日', week: '周', month: '月' }

    this.setData({
      overviewCards,
      chartBars: chartData.bars,
      linePoints: chartData.linePoints,
      nutritionLegend: chartData.nutritionLegend,
      pieStyle: chartData.pieStyle,
      healthLine: Math.min(100, chartData.healthLine || 0),
      allRecords: sorted,
      visibleRecords,
      pageIndex: 1,
      hasMore,
      periodLabel: periodMap[this.data.currentPeriod],
      currentRealm: realm || this.data.currentRealm
    })

    if (writeCache) {
      const userId = app.globalData.userId
      wx.setStorageSync(getCacheKey(userId, this.data.type), {
        records: sorted,
        updatedAt: Date.now()
      })
    }
  },

  switchPeriod(e) {
    const currentPeriod = e.currentTarget.dataset.key
    const chartData = buildCharts(this.data.type, this.data.allRecords, currentPeriod)
    const periodMap = { day: '日', week: '周', month: '月' }
    this.setData({
      currentPeriod,
      chartBars: chartData.bars,
      linePoints: chartData.linePoints,
      nutritionLegend: chartData.nutritionLegend,
      pieStyle: chartData.pieStyle,
      healthLine: Math.min(100, chartData.healthLine || 0),
      periodLabel: periodMap[currentPeriod]
    })
  },

  loadMore() {
    if (!this.data.hasMore) {
      return
    }
    const nextPage = this.data.pageIndex + 1
    const visibleRecords = buildSections(this.data.type, this.data.allRecords)
      .slice(0, nextPage * this.data.pageSize)
    this.setData({
      pageIndex: nextPage,
      visibleRecords,
      hasMore: visibleRecords.length < this.data.allRecords.length
    })
  },

  goToRecord() {
    wx.navigateTo({
      url: `/pages/record/record?type=${this.data.type}`
    })
  },

  goToVision() {
    wx.navigateTo({
      url: `/packageA/pages/vision/vision?type=${this.data.type}`
    })
  },

  openEditor(e) {
    const currentRecordId = e.currentTarget.dataset.id
    const record = this.data.allRecords.find((item) => item._id === currentRecordId)
    if (!record) {
      return
    }
    this.setData({
      currentRecordId,
      showEditor: true,
      editForm: this.buildEditForm(record)
    })
  },

  buildEditForm(record) {
    const form = {
      name: record.name,
      source: record.metrics.source
    }

    if (this.data.type === 'sport') {
      return {
        ...form,
        trainingType: record.metrics.trainingType,
        weight: String(record.metrics.weight || ''),
        reps: String(record.metrics.reps || ''),
        sets: String(record.metrics.sets || ''),
        totalReps: String(record.metrics.totalReps || ''),
        volume: String(record.metrics.volume || ''),
        totalWork: String(record.metrics.totalWork || ''),
        calories: String(record.metrics.calories || ''),
        duration: String(record.metrics.duration || '')
      }
    }

    if (this.data.type === 'diet') {
      return {
        ...form,
        meal: record.metrics.meal,
        weight: String(record.metrics.weight || ''),
        calories: String(record.metrics.calories || ''),
        protein: String(record.metrics.protein || ''),
        carbs: String(record.metrics.carbs || ''),
        fat: String(record.metrics.fat || ''),
        fiber: String(record.metrics.fiber || '')
      }
    }

    return {
      ...form,
      deductCultivation: String(record.metrics.deductCultivation || '')
    }
  },

  closeEditor() {
    this.setData({
      showEditor: false,
      currentRecordId: '',
      editForm: {}
    })
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`editForm.${field}`]: e.detail.value
    })
  },

  async saveRecord() {
    const db = app.globalData.db
    const userId = app.globalData.userId
    const record = this.data.allRecords.find((item) => item._id === this.data.currentRecordId)
    if (!db || !record) {
      return
    }

    wx.showLoading({ title: '修正中...' })
    try {
      const todayRecords = (this.data.allRecords || []).filter((item) => item.date === record.date)
      const systemKey = app.getCultivationSystem
        ? app.getCultivationSystem()
        : (app.globalData.cultivationSystem || 'traditional')
      const oldScore = Number(record.score) || 0
      const payload = buildUpdatedRecordPayload(this.data.type, record, this.data.editForm, {
        todayRecords,
        systemKey
      })
      await db.collection('records').doc(record._id).update({
        data: payload
      })

      // >>> 修正记录后，用 addScore 同步修为差值
      const scoreDelta = (Number(payload.score) || 0) - oldScore
      if (app.addScore && scoreDelta !== 0) {
        await app.addScore(scoreDelta)
      }

      const profile = await syncUserProfileFromRecords(db, userId)
      this.closeEditor()
      await this.loadBoardData(false)
      if (profile?.currentRealm) {
        this.setData({ currentRealm: profile.currentRealm })
      }
      app.showSystemToast('记录已修正并同步修为', 'success')
    } catch (error) {
      console.error(error)
      app.showSystemToast('修正失败，请稍后再试')
    } finally {
      wx.hideLoading()
    }
  },

  async deleteRecord() {
    const db = app.globalData.db
    const userId = app.globalData.userId
    const record = this.data.allRecords.find((item) => item._id === this.data.currentRecordId)
    if (!db || !record) {
      return
    }

    const modal = await app.showSystemModal('确认删除此条历史记录？删除后将重新结算修为与等级进度。', '确认删除')
    if (!modal.confirm) {
      return
    }

    wx.showLoading({ title: '回溯结算中...' })
    try {
      const oldScore = Number(record.score) || 0
      await db.collection('records').doc(record._id).remove()

      // >>> 删除记录后回退修为
      if (app.addScore && oldScore !== 0) {
        await app.addScore(-oldScore)
      }

      const profile = await syncUserProfileFromRecords(db, userId)
      this.closeEditor()
      await this.loadBoardData(false)
      if (profile?.currentRealm) {
        this.setData({ currentRealm: profile.currentRealm })
      }
      app.showSystemToast('记录已撤销并返还影响值', 'success')
    } catch (error) {
      console.error(error)
      app.showSystemToast('删除失败，请稍后再试')
    } finally {
      wx.hideLoading()
    }
  }
})
