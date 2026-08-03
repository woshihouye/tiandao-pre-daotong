// 天道修行 - 修为详情页 - v1.3.0
// 三模块：顶部修为可视化 / 中部修行序列图谱 / 底部修为增长路径
// 所有境界计算统一走 app.js 全局方法，不重复实现

const app = getApp()
const customPreset = require('../../../utils/custom-preset.js')
const trainingMetrics = require('../../../utils/training-metrics.js')
const rootBone = require('../../../utils/root-bone.js')

// 境界阶位乘数（与 app.js buildRealmConfigByBaseScore 对齐）
const REALM_STAGE_MULTIPLIERS = [3, 7, 15, 30]

// 境界元数据（与 app.js REALM_META 对齐）
const REALM_META = [
  { id: 'lianqi', color: '#9ca3af' },
  { id: 'zhuji', color: '#22c55e' },
  { id: 'jindan', color: '#eab308' },
  { id: 'yuanying', color: '#8b5cf6' }
]

// 各体系最高境界数（与 app.js REALM_NAME_MAP 对齐，4个大境界）
const SYSTEM_REALM_NAMES = {
  traditional: ['炼精化气', '炼气化神', '炼神还虚', '炼虚合道'],
  body: ['炼体境', '锻骨境', '玉髓境', '金身境'],
  beauty: ['淬颜境', '玉容境', '凝脂境', '倾世境'],
  worldly: ['执事境', '主事境', '掌事境', '宗匠境'],
  wu: ['闻道境', '见道境', '明道境', '得道境'],
  gong: ['执事境', '主事境', '掌事境', '宗匠境'],
  wuxia: ['后天境', '先天境', '宗师境', '大宗师境'],
  ninja: ['下忍', '中忍', '特别上忍', '上忍'],
  knight: ['见习骑士', '正式骑士', '青铜骑士', '白银骑士'],
  sequence: ['序列9', '序列8', '序列7', '序列6'],
  cthulhu: ['懵懂凡人', '浅度接触', '深度沉迷', '密教学徒']
}


Page({
  data: {
    // —— 顶部：修为可视化 ——
    realmName: '',
    stageNumber: 1,
    totalCultivation: 0,
    realmProgress: 0,
    remainingToNext: 0,
    // 数据卡片
    weekCultivation: 0,
    streakDays: 0,
    bonusRate: '0%',
    bonusRateText: '暂无加成',
    bonusItems: [],
    debuffItems: [],
    // 迷你柱状图
    weekBars: [],
    // 主题
    themeClass: 'theme-light-fixed',

    // —— 中部：修行序列图谱 ——
    realmTimeline: [],
    realmTimelineAll: [],
    timelineExpanded: false,

    // >>> 突破仪式
    showBreakthrough: false,
    breakthroughData: null,

    // >>> 训练指标（自定义修行项目）
    trainingMetrics: [],      // 今日已记录的修行项目
    metricPresets: [],        // 所有预设项目的最新数据
    hasTrainingData: false,
    bodyProfile: null,        // 用户身体画像

    // >>> 根骨体系
    compositeBone: null,      // 综合根骨 { score, name, bonusPercent }
    topBoneOverviews: [],     // 根骨等级概览（首屏展示前2个）
    boneTitles: [],           // 根骨称号列表
    boneNewUnlocks: [],       // 新解锁称号
    unlockedBoneTitleCount: 0, // 已解锁根骨称号数量

    // >>> 加成明细溯源弹窗
    bonusDetailVisible: false,
    bonusDetailItem: null,

    loading: true
  },

  onLoad() {
    this.loadAll()
    this._themeChangedHandler = (payload) => {
      this.refreshTheme()
    }
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

  onShow() {
    this.loadAll()
  },

  async loadAll() {
    if (this._loading) return
    this._loading = true

    try {
      await Promise.all([
        this.loadUserRealm(),
        this.loadWeekTrend(),
        this.loadRealmTimeline(),
        this.loadTrainingMetrics()
      ])
    } catch (e) {
      console.error('[cultivation] 加载失败', e)
    } finally {
      this.setData({ loading: false })
      this._loading = false
    }
  },

  /**
   * 为加成/减益明细项生成溯源描述
   * 根据 item 的类型（模板/称号/功德）和状态自动生成详细说明
   */
  generateBonusDesc(item) {
    if (!item) return ''
    var type = item.type || 'bonus'
    var label = item.label || ''
    var rate = Math.round(Number(item.rate || 0) * 100)

    // 模板类加成
    if (item.templateId && item.campLabel) {
      var campName = item.campLabel || '模板'
      var progressPct = item.progress != null ? Math.round(Number(item.progress) * 100) : 0
      if (type === 'bonus') {
        if (progressPct >= 80) {
          return '来自' + campName + '「' + (item.name || '') + '」的满额道行加成。\n今日完成度 ' + progressPct + '%（≥80%），获得完整 +' + rate + '% 修为加成。\n道行等级越高，加成比例越大。'
        } else if (progressPct >= 50) {
          return '来自' + campName + '「' + (item.name || '') + '」的半额道行加成。\n今日完成度 ' + progressPct + '%（50%~80%），获得一半 +' + rate + '% 修为加成。\n建议提升至80%以上以获取满额加成。'
        } else {
          return '来自' + campName + '「' + (item.name || '') + '」的基础加成。\n完成度 ' + progressPct + '%，加成已按完成比例折算。'
        }
      } else {
        if (progressPct < 50) {
          return '来自' + campName + '「' + (item.name || '') + '」的心魔反噬。\n今日完成度仅 ' + progressPct + '%（<50%），触发 debuff ' + rate + '%。\n连续3天低于50%将降低道行等级。'
        } else {
          return '来自' + campName + '「' + (item.name || '') + '」的负面效果。\n完成度偏低，触发修为减益。'
        }
      }
    }

    // 称号类加成
    if (label.indexOf('道牒') >= 0 || label.indexOf('称号') >= 0) {
      return '已装备的荣誉称号加成。\n' + label + '，提供 +' + rate + '% 修为加成。\n称号可通过达成修行里程碑或完成特殊成就来解锁。'
    }

    // 功德类加成
    if (label.indexOf('功德') >= 0) {
      return '来自功德体系的修为加成。\n' + label + '，提供 +' + rate + '% 修为加成。\n完成利他行为、帮助他人修行可积累功德值，提升功德等级。'
    }

    // 通用描述
    if (type === 'bonus') {
      return label + '\n提供 +' + rate + '% 修为加成。\n持续完成每日任务以维持此加成。'
    } else {
      return label + '\n修为减益 ' + rate + '%。\n改善对应行为可消除此 debuff。'
    }
  },

  /**
   * 点击加成明细中的某项，弹出溯源详情
   */
  onBonusItemTap(e) {
    var dataset = e.currentTarget.dataset || {}
    var type = dataset.type || 'bonus'
    var index = Number(dataset.index)
    if (isNaN(index) || index < 0) return

    var items = type === 'bonus' ? this.data.bonusItems : this.data.debuffItems
    var item = items[index]
    if (!item) return

    var detailItem = {
      type: type,
      label: item.label || '',
      rateText: item.rateText || '',
      desc: item.desc || '暂无溯源信息',
      color: item.color || (type === 'bonus' ? 'var(--success)' : 'var(--danger-text)'),
      name: item.name || '',
      progress: item.progress != null ? Math.round(Number(item.progress) * 100) : null,
      campLabel: item.campLabel || '',
      templateId: item.templateId || ''
    }

    this.setData({
      bonusDetailVisible: true,
      bonusDetailItem: detailItem
    })
  },

  /**
   * 关闭加成溯源弹窗
   */
  closeBonusDetail() {
    this.setData({
      bonusDetailVisible: false,
      bonusDetailItem: null
    })
  },

  /** catchtouchmove 空函数，防止弹窗穿透滚动 */
  noop() {},

  // ========== 模块一：顶部修为可视化 ==========

  async loadUserRealm() {
    try {
      // >>> 获取用户档案（兼容老数据：totalCultivation 可能为 undefined）
      let profile = null
      if (app.getUserProfile) {
        profile = await app.getUserProfile()
      }
      if (!profile || !profile._id) {
        profile = app.globalData.userProfile || {}
      }

      const totalCultivation = Math.max(0, Number(profile.totalCultivation || 0))

      // >>> 境界计算 —— 统一走 app.getRealmByScore
      let realm = {}
      if (app.getRealmByScore) {
        realm = app.getRealmByScore(totalCultivation)
      } else {
        // 兜底：使用 utils/cultivation 的 calculateRealm
        const { calculateRealm } = require('../../../utils/cultivation.js')
        realm = calculateRealm(totalCultivation)
      }

      const realmName = realm.name || '炼精化气'
      const stageNumber = realm.stage || 1
      const perStage = realm.perStage || 33
      const remaining = realm.remaining || perStage

      // 进度百分比（当前阶段的进度）
      const progressInStage = perStage - remaining
      const realmProgress = Math.min(100, Math.max(0,
        Math.round((progressInStage / perStage) * 100)
      ))

      // >>> 本周获得修为（从 records 集合聚合）
      const weekCultivation = await this.getWeekCultivation()

      // >>> 连续修炼天数（兼容老字段 streakDays / continuousDays）
      const streakDays = Number(profile.streakDays || profile.continuousDays || 0)

      // >>> 当前总加成比例（含道牒称号加成）
      let bonusRate = '0%'
      let bonusRateText = '暂无加成'
      let bonusItems = []   // 正向加成明细
      let debuffItems = []  // 负向加成明细
      if (app.getTitleBonusInfo) {
        const coeffResult = app.getTitleBonusInfo()
        bonusRate = '+' + Math.round((coeffResult.rate || 0) * 100) + '%'
        const bonusParts = (coeffResult.bonusText || []).concat(coeffResult.debuffText || [])
        bonusRateText = bonusParts.length ? bonusParts.join(' · ') : '暂无加成'
        bonusItems = (coeffResult.bonusItems || []).map((item) => ({
          ...item,
          rateText: '+' + Math.round(Number(item.rate || 0) * 100) + '%',
          desc: this.generateBonusDesc(item)
        }))
        debuffItems = (coeffResult.debuffItems || []).map((item) => ({
          ...item,
          rateText: Math.round(Number(item.rate || 0) * 100) + '%',
          desc: this.generateBonusDesc(item)
        }))
      } else if (app.calcTodayCultivationCoeff) {
        const coeffResult = app.calcTodayCultivationCoeff()
        bonusRate = '+' + Math.round((coeffResult.rate || 0) * 100) + '%'
        const bonusParts = (coeffResult.bonusText || []).concat(coeffResult.debuffText || [])
        bonusRateText = bonusParts.length ? bonusParts.join(' · ') : '暂无加成'
        bonusItems = (coeffResult.bonusItems || []).map((item) => ({
          ...item,
          rateText: '+' + Math.round(Number(item.rate || 0) * 100) + '%',
          desc: this.generateBonusDesc(item)
        }))
        debuffItems = (coeffResult.debuffItems || []).map((item) => ({
          ...item,
          rateText: Math.round(Number(item.rate || 0) * 100) + '%',
          desc: this.generateBonusDesc(item)
        }))
      }

      // >>> 今日分 → 主题
      let todayScore = 0
      if (app.getTodayScore) {
        todayScore = await app.getTodayScore()
      }
      const themeClass = app.resolveThemeClass ? app.resolveThemeClass(todayScore) : 'theme-light-fixed'

      this.setData({
        realmName,
        stageNumber,
        totalCultivation,
        realmProgress,
        remainingToNext: remaining,
        weekCultivation,
        streakDays,
        bonusRate: bonusRate,
        bonusRateText: bonusRateText,
        bonusItems: bonusItems,
        debuffItems: debuffItems,
        themeClass,
        bodyProfile: profile    // 供训练指标计算使用
      })

      // >>> 系统面板：突破检测
      if (app.checkRealmBreakthrough) {
        var btResult = app.checkRealmBreakthrough(Number(totalCultivation))
        if (btResult && btResult.triggered) {
          this.setData({
            showBreakthrough: true,
            breakthroughData: btResult
          })
        }
      }
    } catch (e) {
      console.error('[cultivation] 加载用户境界失败', e)
    }
  },

  async getWeekCultivation() {
    try {
      const db = app.globalData.db
      const userId = app.globalData.userId
      if (!db || !userId) return 0

      const today = this.getTodayDate()
      const weekAgo = this.getDaysAgo(6)

      const res = await db.collection('records')
        .where({
          userId,
          date: db.command.gte(weekAgo).and(db.command.lte(today))
        })
        .get()

      // 仅统计已印证的正式记录
      return (res.data || []).reduce((sum, item) => {
        const status = item.status || 'confirmed'
        if (status !== 'confirmed') return sum
        return sum + Number(item.score || 0)
      }, 0)
    } catch (e) {
      console.error('[cultivation] 获取本周修为失败', e)
      return 0
    }
  },

  // ========== 迷你柱状图 ==========

  async loadWeekTrend() {
    try {
      const db = app.globalData.db
      const userId = app.globalData.userId
      if (!db || !userId) {
        this.setData({ weekBars: this.buildEmptyWeekBars() })
        return
      }

      const today = this.getTodayDate()
      const weekAgo = this.getDaysAgo(6)

      const res = await db.collection('records')
        .where({
          userId,
          date: db.command.gte(weekAgo).and(db.command.lte(today))
        })
        .get()

      const records = res.data || []
      const maxScore = Math.max(1, ...records.map(r => Math.abs(Number(r.score || 0))))

      // 生成近7天每日汇总
      const bars = []
      for (let i = 6; i >= 0; i--) {
        const dateStr = this.getDaysAgo(i)
        const dayRecords = records.filter(r => r.date === dateStr)
        const score = dayRecords.reduce((s, r) => s + Number(r.score || 0), 0)
        const height = Math.max(8, Math.min(100, Math.round((Math.abs(score) / maxScore) * 80)))
        bars.push({
          date: dateStr.slice(5), // MM-DD
          score,
          height,
          color: score < 0 ? '#f87171' : score > 0 ? '#10b981' : '#d1d5db'
        })
      }

      this.setData({ weekBars: bars })
    } catch (e) {
      console.error('[cultivation] 走势图加载失败', e)
      this.setData({ weekBars: this.buildEmptyWeekBars() })
    }
  },

  buildEmptyWeekBars() {
    const bars = []
    for (let i = 6; i >= 0; i--) {
      bars.push({
        date: this.getDaysAgo(i).slice(5),
        score: 0,
        height: 8,
        color: '#d1d5db'
      })
    }
    return bars
  },

  // ========== 模块二：修行序列图谱 ==========

  async loadRealmTimeline() {
    try {
      const totalCultivation = this.data.totalCultivation || 0

      // >>> 获取当前体系对应的境界名
      let systemKey = 'traditional'
      if (app.getCultivationSystem) {
        systemKey = app.getCultivationSystem()
      }

      // >>> 模板优先：取模板自定义境界名
      let customNames = null
      try {
        const template = app.getMainTemplate ? app.getMainTemplate() : null
        if (template && Array.isArray(template.realmNames) && template.realmNames.length >= 4) {
          customNames = template.realmNames
        }
      } catch (_) { /* 兼容老版本无模板 */ }

      // 取对应的境界名列表（兼容 9 套体系 + 模板自定义名）
      let names = SYSTEM_REALM_NAMES[systemKey] || SYSTEM_REALM_NAMES.traditional
      if (systemKey === 'wu') names = SYSTEM_REALM_NAMES.wu
      if (systemKey === 'gong') names = SYSTEM_REALM_NAMES.gong
      if (customNames) names = customNames

      // >>> 构建境界阈值（与 app.js buildRealmConfigByBaseScore 公式一致）
      // 从当前境界反推 baseScore
      let baseScore = 40 // 默认传统体系
      if (app.getRealmByScore) {
        const currentRealm = app.getRealmByScore(Math.max(1, totalCultivation))
        const realmIndex = REALM_META.findIndex(m => m.id === currentRealm.id)
        if (realmIndex >= 0 && currentRealm.perStage > 0) {
          baseScore = Math.round(currentRealm.perStage / REALM_STAGE_MULTIPLIERS[realmIndex])
        }
      }

      let cursor = 0
      const realmConfig = REALM_META.map((meta, index) => {
        const perStage = Math.max(1, Math.round(baseScore * REALM_STAGE_MULTIPLIERS[index]))
        const span = perStage * 9
        const minScore = cursor
        cursor += span
        return {
          ...meta,
          name: names[index] || meta.id,
          stages: 9,
          perStage,
          minScore
        }
      })

      // >>> 当前所在境界索引
      let currentRealmIdx = 0
      let currentStageInRealm = 1
      for (let i = realmConfig.length - 1; i >= 0; i--) {
        if (totalCultivation >= realmConfig[i].minScore) {
          currentRealmIdx = i
          const progress = totalCultivation - realmConfig[i].minScore
          currentStageInRealm = Math.min(9, Math.floor(progress / realmConfig[i].perStage) + 1)
          break
        }
      }

      // >>> 境界人数统计（读缓存 + 异步云函数）
      const realmCounts = await this.getRealmCounts()

      // >>> 构建全部 36 个节点序列
      const allNodes = []
      let currentNodeIndex = -1
      for (let r = 0; r < realmConfig.length; r++) {
        const realm = realmConfig[r]
        for (let s = 1; s <= 9; s++) {
          const nodeMinScore = realm.minScore + (s - 1) * realm.perStage
          const isCurrentRealm = r === currentRealmIdx
          const isCurrentStage = isCurrentRealm && s === currentStageInRealm
          const isPassed = r < currentRealmIdx || (isCurrentRealm && s < currentStageInRealm)

          let status = 'locked'
          if (isCurrentStage) status = 'current'
          else if (isPassed) status = 'passed'

          const node = {
            realmId: realm.id,
            realmName: realm.name,
            realmColor: realm.color,
            stage: s,
            status,
            totalNeeded: nodeMinScore,
            perStage: realm.perStage,
            userCount: realmCounts[r] || 0,
            showRealmLabel: s === 1 || s === 9 || isCurrentStage
          }

          if (isCurrentStage) currentNodeIndex = allNodes.length
          allNodes.push(node)
        }
      }

      // >>> 默认仅展示当前节点 + 未来3阶（共4个），避免用户觉得目标太远
      const visibleStart = Math.max(0, currentNodeIndex)
      const visibleEnd = Math.min(allNodes.length, currentNodeIndex + 4)
      const visible = allNodes.slice(visibleStart, visibleEnd)

      this.setData({
        realmTimelineAll: allNodes,
        realmTimeline: visible,
        timelineExpanded: false
      })
    } catch (e) {
      console.error('[cultivation] 序列图谱加载失败', e)
    }
  },

  async getRealmCounts() {
    try {
      // 尝试从本地缓存读取（每天更新一次）
      const cache = wx.getStorageSync('tiandao_realm_counts')
      if (cache && cache.date === this.getTodayDate()) {
        return cache.counts || [0, 0, 0, 0]
      }

      // 调用云函数聚合
      if (wx.cloud && wx.cloud.callFunction) {
        const res = await wx.cloud.callFunction({
          name: 'get-realm-count',
          data: {}
        })
        if (res.result && Array.isArray(res.result.counts)) {
          wx.setStorageSync('tiandao_realm_counts', {
            date: this.getTodayDate(),
            counts: res.result.counts
          })
          return res.result.counts
        }
      }
    } catch (e) {
      // 云函数未部署时静默降级，仅真正错误才打印
      var msg = (e && (e.errMsg || e.message)) || ''
      if (msg.indexOf('-501000') >= 0 || msg.indexOf('FUNCTION_NOT_FOUND') >= 0) {
        // 云函数未部署，静默跳过
      } else {
        console.error('[cultivation] 境界人数获取失败', e)
      }
    }
    return [0, 0, 0, 0]
  },

  // 展开/收起全部境界序列
  expandTimeline() {
    if (this.data.timelineExpanded) {
      // 收起：恢复默认4节点
      const allNodes = this.data.realmTimelineAll
      const currentNodeIndex = allNodes.findIndex(n => n.status === 'current')
      const visibleStart = Math.max(0, currentNodeIndex)
      const visibleEnd = Math.min(allNodes.length, currentNodeIndex + 4)
      this.setData({
        realmTimeline: allNodes.slice(visibleStart, visibleEnd),
        timelineExpanded: false
      })
    } else {
      // 展开：展示全部36节点
      this.setData({
        realmTimeline: this.data.realmTimelineAll,
        timelineExpanded: true
      })
    }
  },

  // 点击节点 → 未解锁弹 wx.showModal，已突破弹 toast
  onTapStage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const node = this.data.realmTimeline[index]
    if (!node) return

    if (node.status === 'locked') {
      const totalNeeded = node.totalNeeded
      const remaining = Math.max(0, totalNeeded - (this.data.totalCultivation || 0))
      const weekAvg = this.data.weekCultivation > 0
        ? Math.ceil(this.data.weekCultivation / 7)
        : 10
      const estDays = Math.ceil(remaining / Math.max(1, weekAvg))

      wx.showModal({
        title: `${node.realmName} 第${node.stage}阶`,
        content: `突破所需总修为：${totalNeeded}\n还需修为：${remaining}\n按近7日均速预估：约${estDays}天\n当前该境界人数：${node.userCount}`,
        showCancel: false,
        confirmText: '知道了'
      })
    } else if (node.status === 'passed') {
      wx.showToast({ title: `${node.realmName} 第${node.stage}阶 · 已突破`, icon: 'none' })
    }
  },

  // ========== 模块四：训练指标（自定义修行项目数据展示）==========

  loadTrainingMetrics: function() {
    var self = this
    try {
      var presets = customPreset.ALL_PRESETS
      var metricPresets = []
      var todayMetricRecords = [] // 今日记录

      presets.forEach(function(preset) {
        var key = 'tiandao_metrics_' + preset.id
        var data = wx.getStorageSync(key)
        if (!data || !data.latest) return

        var latest = data.latest
        var computed = latest.computed || {}
        var metrics = latest.metrics || {}

        // 构建修为面板展示数据
        var display = {
          presetId: preset.id,
          name: preset.name,
          cultivationName: preset.cultivationName,
          icon: preset.icon,
          color: preset.color,
          category: preset.categoryName,
          date: latest.date,
          metrics: metrics,
          computed: computed
        }

        // 根据预设类型提取关键指标展示
        switch (preset.id) {
          case 'bench_press':
          case 'squat':
          case 'deadlift':
          case 'overhead_press':
            display.primaryValue = computed.estimated_1rm || 0
            display.primaryLabel = '估测极限'
            display.primaryUnit = 'kg'
            display.secondaryItems = [
              { label: '训练容量', value: computed.volume_load || 0, unit: 'kg' },
              { label: '相对力量', value: computed.relative_strength || 0, unit: '×BW' }
            ]
            // 力量评级
            if (computed.estimated_1rm > 0 && self.data.bodyProfile) {
              var levelInfo = trainingMetrics.calcStrengthLevel(
                preset.id === 'overhead_press' ? 'bench_press' : preset.id,
                computed.estimated_1rm,
                self.data.bodyProfile.weight || 70,
                self.data.bodyProfile.gender || 'male'
              )
              display.level = levelInfo.level
              display.levelLabel = levelInfo.level + '·' + preset.name
            }
            break

          case 'pullup':
            display.primaryValue = computed.total_volume || metrics.max_reps || 0
            display.primaryLabel = '最高引体'
            display.primaryUnit = '次'
            display.secondaryItems = [
              { label: '引体评级', value: computed.pullup_level || '--', unit: '' }
            ]
            break

          case 'running_5k':
          case 'running_10k':
            display.primaryValue = computed.vdot || 0
            display.primaryLabel = 'VDOT 跑力'
            display.primaryUnit = ''
            display.level = computed.vdot >= 55 ? '精英' : computed.vdot >= 45 ? '高级' : computed.vdot >= 35 ? '中级' : '入门'
            display.secondaryItems = [
              { label: '配速', value: computed.pace || '--', unit: '' },
              { label: '步频', value: computed.cadence_level || '--', unit: '' }
            ]
            break

          case 'swim_100m':
            display.primaryValue = computed.swolf || 0
            display.primaryLabel = 'SWOLF'
            display.primaryUnit = ''
            display.secondaryItems = [
              { label: '水平', value: computed.swim_level || '--', unit: '' }
            ]
            break

          case 'vocabulary_english':
            display.primaryValue = metrics.new_words_today || 0
            display.primaryLabel = '今日新词'
            display.primaryUnit = '个'
            display.level = computed.cefr_level || '--'
            display.secondaryItems = [
              { label: 'CEFR', value: computed.cefr_level || '--', unit: '' },
              { label: '负荷', value: computed.word_load_eval || '--', unit: '' },
              { label: '保留率', value: computed.retention_rate || '--', unit: '' }
            ]
            break

          case 'reading_pages':
            display.primaryValue = metrics.pages_read || 0
            display.primaryLabel = '今日阅读'
            display.primaryUnit = '页'
            display.secondaryItems = [
              { label: '速度', value: computed.reading_speed || '--', unit: '' }
            ]
            break

          case 'coding_hours':
            display.primaryValue = metrics.focus_minutes || 0
            display.primaryLabel = '专注时间'
            display.primaryUnit = '分钟'
            display.secondaryItems = [
              { label: '番茄数', value: metrics.pomodoro_count || 0, unit: '个' }
            ]
            break

          case 'meditation':
            display.primaryValue = metrics.duration_minutes || 0
            display.primaryLabel = '入定时长'
            display.primaryUnit = '分钟'
            display.level = computed.focus_level === 'deep' ? '禅定' : computed.focus_level === 'focused' ? '入定' : '守一'
            display.secondaryItems = []
            break

          case 'flexibility_sit_reach':
            display.primaryValue = metrics.reach_cm || 0
            display.primaryLabel = '坐位体前屈'
            display.primaryUnit = 'cm'
            display.level = computed.flex_level || '--'
            display.secondaryItems = [
              { label: '超越', value: computed.flex_percentile || 0, unit: '%' }
            ]
            break

          case 'sleep_quality':
            display.primaryValue = metrics.sleep_hours || 0
            display.primaryLabel = '睡眠时长'
            display.primaryUnit = '小时'
            display.secondaryItems = [
              { label: '深睡', value: metrics.deep_sleep_hours || 0, unit: 'h' }
            ]
            break

          default:
            display.primaryValue = latest.score || 0
            display.primaryLabel = '修为'
            display.primaryUnit = ''
            display.secondaryItems = []
            break
        }

        metricPresets.push(display)

        // 今日记录
        if (latest.date === self.getTodayDate()) {
          todayMetricRecords.push(display)
        }
      })

      this.setData({
        metricPresets: metricPresets,
        trainingMetrics: todayMetricRecords,
        hasTrainingData: metricPresets.length > 0
      })

      // >>> 计算根骨等级概览
      this._calcBoneOverviews()
    } catch (e) {
      console.error('[cultivation] 加载训练指标失败', e)
    }
  },

  /**
   * 计算根骨等级概览：综合等级 + 前2个核心根骨进度
   */
  _calcBoneOverviews: function() {
    try {
      var comp = rootBone.calculateComposite()
      var titleCheck = rootBone.checkAndUnlockTitles()

      // 综合根骨信息
      var compositeInfo = {
        score: comp.compositeScore,
        name: comp.compositeName,
        bonusPercent: Math.round(comp.globalBonusRate * 100),
        bonusRate: comp.globalBonusRate,
        levelColor: '#4a6741'
      }

      // 前2个核心根骨（按得分降序取top 2）
      var top = rootBone.getTopBoneOverviews(2)
      var topBoneOverviews = top.map(function(o) {
        return {
          id: o.id,
          name: o.name,
          icon: o.icon,
          color: o.color,
          levelName: o.levelName,
          levelColor: o.levelColor,
          score: o.score,
          progress: o.progress,
          nextLevelName: o.nextLevel ? o.nextLevel.name : ''
        }
      })

      this.setData({
        compositeBone: compositeInfo,
        topBoneOverviews: topBoneOverviews,
        boneTitles: titleCheck.allUnlocked,
        boneNewUnlocks: titleCheck.newUnlocks,
        unlockedBoneTitleCount: titleCheck.allUnlocked.filter(function(t) { return t.unlocked }).length
      })
    } catch (e) {
      console.error('[cultivation] 计算根骨概览失败', e)
    }
  },

  // 跳转到自定义修行项目页
  navigateToCustomMetrics: function() {
    wx.navigateTo({ url: '/packageA/pages/custom-metrics/custom-metrics' })
  },

  onBoneTitleTap: function() {
    wx.navigateTo({ url: '/packageA/pages/custom-metrics/custom-metrics?tab=titles' })
  },

  // ========== 工具方法 ==========

  getTodayDate() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  getDaysAgo(n) {
    var d = new Date()
    d.setDate(d.getDate() - n)
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  },

  // 确认突破
  confirmBreakthrough: function() {
    this.setData({ showBreakthrough: false, breakthroughData: null })
    this.loadAll()
  },

  // 暂缓突破
  postponeBreakthrough: function() {
    this.setData({ showBreakthrough: false, breakthroughData: null })
  }
})
