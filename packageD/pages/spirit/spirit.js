const app = getApp()

function getTodayDate() {
  return app.getTodayDate ? app.getTodayDate() : new Date().toISOString().slice(0, 10)
}

function getEnergyMeta(value = 0) {
  const safeValue = Math.max(0, Math.min(150, Number(value) || 0))
  // 仅用于进度条颜色，不展示评价文案
  if (safeValue >= 120) return { color: '#10B981' }
  if (safeValue >= 80) return { color: '#F59E0B' }
  if (safeValue >= 50) return { color: '#F97316' }
  return { color: '#EF4444' }
}

function getMoodMeta(mood) {
  if (mood === '愉悦') return { emoji: '😊', text: '愉悦' }
  if (mood === '一般') return { emoji: '😐', text: '一般' }
  if (mood === '消极') return { emoji: '😔', text: '消极' }
  return { emoji: '--', text: '--' }
}

Page({
  data: {
    themeClass: 'theme-light-fixed',
    energyValue: '--',
    energyColor: '#10B981',
    energyPercent: 0,
    buffText: '',
    moodEmoji: '--',
    moodText: '--'
  },

  onLoad() {
    this.applyTheme()
  },

  onShow() {
    this.applyTheme()
    this.loadTodaySpirit()
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  async loadTodaySpirit() {
    const db = app.getDb ? app.getDb() : app.globalData.db
    if (!db) {
      this.applyRecords(null, null)
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
      const energyRecord = list.find((item) => item.type === '精') || null
      const moodRecord = list.find((item) => item.type === '神') || null
      this.applyRecords(energyRecord, moodRecord)
    } catch (error) {
      console.error('读取精神数据失败', error)
      this.applyRecords(null, null)
    }
  },

  applyRecords(energyRecord, moodRecord) {
    const energyValue = Number(energyRecord?.energyValue || 0)
    const energyMeta = getEnergyMeta(energyValue)
    const moodMeta = getMoodMeta(moodRecord?.mood)

    this.setData({
      energyValue: energyRecord ? String(energyRecord.energyValue ?? '--') : '--',
      energyColor: energyMeta.color,
      energyPercent: energyRecord ? Math.max(0, Math.min(100, (energyValue / 150) * 100)) : 0,
      buffText: energyRecord?.buff || '',
      moodEmoji: moodMeta.emoji,
      moodText: moodMeta.text
    })
  },

  goToEnergy() {
    wx.navigateTo({
      url: '/packageD/pages/spirit/energy/energy'
    })
  },

  goToMood() {
    wx.navigateTo({
      url: '/packageD/pages/spirit/mood/mood'
    })
  }
})
