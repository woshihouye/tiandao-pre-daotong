// 肉身状态主页面：纯数据展示，无分析建议
const app = getApp()

function getTodayDate() {
  return app.getTodayDate ? app.getTodayDate() : new Date().toISOString().slice(0, 10)
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(ts) {
  const date = new Date(Number(ts) || Date.now())
  if (Number.isNaN(date.getTime())) return '--:--'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function safeNum(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function isSleepRecord(record) {
  const name = String(record.name || '')
  const path = String((record.detail && record.detail.trainingPath) || '')
  const type = String((record.detail && record.detail.trainingType) || '')
  return /睡|早睡|入睡|熬夜/.test(name) || /睡/.test(type) || (path === 'richang' && /睡/.test(name))
}

function isStudyRecord(record) {
  const name = String(record.name || '')
  const path = String((record.detail && record.detail.trainingPath) || '')
  const type = String((record.detail && record.detail.trainingType) || '')
  return path === 'xiuxin' || /学习|工作|刷题|听书|复盘|专注|作业|单词/.test(name + type)
}

function getDurationMinutes(record) {
  const detail = record.detail || {}
  if (detail.duration !== undefined && detail.duration !== '') {
    return Math.max(0, safeNum(detail.duration, 0))
  }
  if (detail.minutes !== undefined) {
    return Math.max(0, safeNum(detail.minutes, 0))
  }
  if (record.category === 'sport') {
    const sets = safeNum(detail.sets, 0)
    return sets > 0 ? sets * 5 : 0
  }
  return 0
}

function classifyDietTag(record) {
  const detail = record.detail || {}
  const score = safeNum(record.score, 0)
  if (detail.foodQuality === 'junk' || detail.isBingeEat || score < 0) {
    return '负面'
  }
  return '健康'
}

Page({
  data: {
    themeClass: 'theme-light-fixed',
    // 当日总览
    sportMinutes: 0,
    dietCount: 0,
    sleepMinutes: 0,
    studyMinutes: 0,
    // 精神基础值
    energyValue: '--',
    moodValue: '--',
    // 当日明细
    todayList: [],
    // 周期图
    periodTabs: [
      { key: 'day', label: '日' },
      { key: 'week', label: '周' },
      { key: 'month', label: '月' }
    ],
    currentPeriod: 'week',
    chartBars: [],
    chartLegend: [
      { key: 'sport', label: '运动(分)', color: '#10b981' },
      { key: 'diet', label: '健康饮食(次)', color: '#3b82f6' },
      { key: 'sleep', label: '睡眠(分)', color: '#8b5cf6' }
    ]
  },

  onLoad() {
    this.applyTheme()
    app.onAppEvent && app.onAppEvent('themeOverrideChanged', this._onThemeChange)
  },

  onUnload() {
    app.offAppEvent && app.offAppEvent('themeOverrideChanged', this._onThemeChange)
  },

  _onThemeChange() {
    this.applyTheme()
  },

  onShow() {
    this.applyTheme()
    this.loadPageData()
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  async loadPageData() {
    const db = app.getDb ? app.getDb() : app.globalData.db
    const userId = app.globalData.userId
    const today = getTodayDate()

    if (!db || !userId) {
      this.setData({
        sportMinutes: 0,
        dietCount: 0,
        sleepMinutes: 0,
        studyMinutes: 0,
        todayList: [],
        chartBars: this.buildEmptyChart(this.data.currentPeriod)
      })
      this.loadSpiritSummary(null)
      return
    }

    try {
      if (app.waitForInit) {
        await app.waitForInit()
      }
    } catch (error) {
      console.error(error)
    }

    let records = []
    try {
      // 拉取近 30 天记录，供日/周/月图与当日明细共用
      const res = await db.collection('records')
        .where({ userId })
        .orderBy('timestamp', 'desc')
        .limit(200)
        .get()
      records = res.data || []
    } catch (error) {
      console.error('读取修行记录失败', error)
      try {
        const res = await db.collection('records').where({ userId }).get()
        records = (res.data || []).sort((a, b) => safeNum(b.timestamp, 0) - safeNum(a.timestamp, 0))
      } catch (innerError) {
        console.error(innerError)
        records = []
      }
    }

    const todayRecords = records.filter((item) => item.date === today)
    this.applyTodayOverview(todayRecords)
    this.applyTodayList(todayRecords)
    this.applyChart(records, this.data.currentPeriod)
    this.loadSpiritSummary(db)
  },

  applyTodayOverview(todayRecords) {
    let sportMinutes = 0
    let dietCount = 0
    let sleepMinutes = 0
    let studyMinutes = 0

    todayRecords.forEach((record) => {
      if (record.category === 'sport' && !isSleepRecord(record) && !isStudyRecord(record)) {
        sportMinutes += getDurationMinutes(record)
      }
      if (record.category === 'diet') {
        dietCount += 1
      }
      if (isSleepRecord(record)) {
        sleepMinutes += getDurationMinutes(record) || safeNum(record.detail && record.detail.sleepMinutes, 0)
      }
      if (isStudyRecord(record)) {
        studyMinutes += getDurationMinutes(record)
      }
    })

    this.setData({
      sportMinutes,
      dietCount,
      sleepMinutes,
      studyMinutes
    })
  },

  applyTodayList(todayRecords) {
    const list = (todayRecords || [])
      .slice()
      .sort((a, b) => safeNum(b.timestamp, 0) - safeNum(a.timestamp, 0))
      .map((record) => this.formatListItem(record))
      .filter(Boolean)

    this.setData({ todayList: list })
  },

  formatListItem(record) {
    const timeLabel = formatTime(record.timestamp)
    const score = safeNum(record.score, 0)
    const duration = getDurationMinutes(record)

    if (record.category === 'sport' && isSleepRecord(record)) {
      return {
        id: record._id || `${record.timestamp}_sleep`,
        timeLabel,
        kind: '睡眠',
        title: record.name || '睡眠记录',
        meta: `时长 ${duration || 0} 分钟 · 入睡 ${timeLabel}`,
        scoreText: score ? `${score > 0 ? '+' : ''}${score}` : ''
      }
    }

    if (record.category === 'sport' && isStudyRecord(record)) {
      return {
        id: record._id || `${record.timestamp}_study`,
        timeLabel,
        kind: '功课',
        title: record.name || '学习/工作',
        meta: `时长 ${duration || 0} 分钟`,
        scoreText: score ? `${score > 0 ? '+' : ''}${score}` : ''
      }
    }

    if (record.category === 'sport') {
      const typeLabel = (record.detail && (record.detail.trainingType || record.detail.trainingPath)) || '武道'
      return {
        id: record._id || `${record.timestamp}_sport`,
        timeLabel,
        kind: '运动',
        title: record.name || '运动记录',
        meta: `${typeLabel} · 时长 ${duration || 0} 分钟 · 修为 ${score > 0 ? '+' : ''}${score}`,
        scoreText: `${score > 0 ? '+' : ''}${score}`
      }
    }

    if (record.category === 'diet') {
      const tag = classifyDietTag(record)
      return {
        id: record._id || `${record.timestamp}_diet`,
        timeLabel,
        kind: '丹食',
        title: record.name || '饮食记录',
        meta: `标签：${tag}`,
        scoreText: `${score > 0 ? '+' : ''}${score}`
      }
    }

    if (record.category === 'debuff') {
      return {
        id: record._id || `${record.timestamp}_debuff`,
        timeLabel,
        kind: '心魔',
        title: record.name || '心魔标记',
        meta: `修为 ${score}`,
        scoreText: `${score}`
      }
    }

    return {
      id: record._id || `${record.timestamp}_other`,
      timeLabel,
      kind: '记录',
      title: record.name || '修行记录',
      meta: `修为 ${score > 0 ? '+' : ''}${score}`,
      scoreText: `${score > 0 ? '+' : ''}${score}`
    }
  },

  async loadSpiritSummary(db) {
    if (!db) {
      this.setData({ energyValue: '--', moodValue: '--' })
      return
    }
    try {
      const res = await db.collection('daily_spirit')
        .where({
          userId: app.globalData.userId,
          date: getTodayDate()
        })
        .get()
      const list = res.data || []
      const energy = list.find((item) => item.type === '精')
      const mood = list.find((item) => item.type === '神')
      this.setData({
        energyValue: energy ? String(energy.energyValue ?? '--') : '--',
        moodValue: mood && mood.mood ? String(mood.mood) : '--'
      })
    } catch (error) {
      console.error('读取精神概览失败', error)
      this.setData({ energyValue: '--', moodValue: '--' })
    }
  },

  switchPeriod(e) {
    const key = e.currentTarget.dataset.key
    if (!key || key === this.data.currentPeriod) return
    this.setData({ currentPeriod: key })
    this.reloadChartOnly()
  },

  async reloadChartOnly() {
    const db = app.getDb ? app.getDb() : app.globalData.db
    const userId = app.globalData.userId
    if (!db || !userId) {
      this.setData({ chartBars: this.buildEmptyChart(this.data.currentPeriod) })
      return
    }
    try {
      const res = await db.collection('records').where({ userId }).limit(200).get()
      this.applyChart(res.data || [], this.data.currentPeriod)
    } catch (error) {
      this.setData({ chartBars: this.buildEmptyChart(this.data.currentPeriod) })
    }
  },

  applyChart(records, period) {
    const days = period === 'month' ? 30 : period === 'day' ? 1 : 7
    const today = new Date()
    const buckets = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = formatDate(date)
      const dayRecords = (records || []).filter((item) => item.date === dateStr)

      let sport = 0
      let dietHealthy = 0
      let sleep = 0

      dayRecords.forEach((record) => {
        if (record.category === 'sport' && !isSleepRecord(record) && !isStudyRecord(record)) {
          sport += getDurationMinutes(record)
        }
        if (record.category === 'diet' && classifyDietTag(record) === '健康') {
          dietHealthy += 1
        }
        if (isSleepRecord(record)) {
          sleep += getDurationMinutes(record) || safeNum(record.detail && record.detail.sleepMinutes, 0)
        }
      })

      buckets.push({
        date: dateStr,
        label: period === 'day' ? '今日' : `${date.getMonth() + 1}/${date.getDate()}`,
        sport,
        diet: dietHealthy,
        sleep
      })
    }

    const maxSport = Math.max(1, ...buckets.map((item) => item.sport))
    const maxDiet = Math.max(1, ...buckets.map((item) => item.diet))
    const maxSleep = Math.max(1, ...buckets.map((item) => item.sleep))

    const chartBars = buckets.map((item) => ({
      ...item,
      sportHeight: Math.max(4, Math.round((item.sport / maxSport) * 100)),
      dietHeight: Math.max(4, Math.round((item.diet / maxDiet) * 100)),
      sleepHeight: Math.max(4, Math.round((item.sleep / maxSleep) * 100))
    }))

    this.setData({ chartBars })
  },

  buildEmptyChart(period) {
    const days = period === 'month' ? 30 : period === 'day' ? 1 : 7
    const today = new Date()
    const bars = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      bars.push({
        date: formatDate(date),
        label: period === 'day' ? '今日' : `${date.getMonth() + 1}/${date.getDate()}`,
        sport: 0,
        diet: 0,
        sleep: 0,
        sportHeight: 4,
        dietHeight: 4,
        sleepHeight: 4
      })
    }
    return bars
  },

  goToSpirit() {
    wx.navigateTo({
      url: '/packageD/pages/spirit/spirit'
    })
  }
})
