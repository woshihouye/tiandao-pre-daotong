const app = getApp()

const MOOD_OPTIONS = [
  { key: '愉悦', icon: '😊', color: '#10B981' },
  { key: '一般', icon: '😐', color: '#F59E0B' },
  { key: '消极', icon: '😔', color: '#6B7280' }
]

const TAG_OPTIONS = [
  '工作顺利', '人际和谐', '身体舒适', '学习进步',
  '疲惫', '压力大', '身体不适', '情绪低落'
]

function getTodayDate() {
  return app.getTodayDate ? app.getTodayDate() : new Date().toISOString().slice(0, 10)
}

function getMoodAdvice(mood) {
  if (mood === '愉悦') {
    return {
      lifeAdvice: '趁状态好，尝试新事物',
      cultivateAdvice: '适合突破瓶颈，效率+20%'
    }
  }
  if (mood === '消极') {
    return {
      lifeAdvice: '允许自己低落，但别沉溺，建议散步/听音乐',
      cultivateAdvice: '降低修行目标，以静心为主，效率-30%'
    }
  }
  return {
    lifeAdvice: '平淡是福，做些让自己开心的小事',
    cultivateAdvice: '保持日常修行节奏即可'
  }
}

Page({
  data: {
    themeClass: 'theme-light-fixed',
    moodOptions: MOOD_OPTIONS,
    tagOptions: TAG_OPTIONS,
    positiveTagOptions: TAG_OPTIONS.slice(0, 4),
    negativeTagOptions: TAG_OPTIONS.slice(4),
    mood: '一般',
    tags: [],
    note: '',
    lifeAdvice: '平淡是福，做些让自己开心的小事',
    cultivateAdvice: '保持日常修行节奏即可'
  },

  onLoad() {
    this.applyTheme()
    this.loadTodayRecord()
  },

  onShow() {
    this.applyTheme()
    this.loadTodayRecord()
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  async loadTodayRecord() {
    const db = app.getDb ? app.getDb() : app.globalData.db
    if (!db) {
      this.updateAdvice()
      return
    }

    try {
      const res = await db.collection('daily_spirit')
        .where({
          userId: app.globalData.userId,
          date: getTodayDate(),
          type: '神'
        })
        .limit(1)
        .get()

      const record = res.data && res.data[0]
      if (record) {
        this.setData({
          mood: record.mood || '一般',
          tags: Array.isArray(record.tags) ? record.tags : [],
          note: record.note || ''
        })
      }
    } catch (error) {
      console.error('读取心情记录失败', error)
    }

    this.updateAdvice()
  },

  selectMood(e) {
    const mood = e.currentTarget.dataset.mood || '一般'
    this.setData({ mood }, () => this.updateAdvice())
  },

  toggleTag(e) {
    const value = e.currentTarget.dataset.value
    const current = this.data.tags || []
    const exists = current.includes(value)
    const tags = exists ? current.filter((item) => item !== value) : current.concat(value)
    this.setData({ tags })
  },

  onNoteInput(e) {
    this.setData({
      note: e.detail.value
    })
  },

  updateAdvice() {
    this.setData(getMoodAdvice(this.data.mood))
  },

  async saveMood() {
    const db = app.getDb ? app.getDb() : app.globalData.db
    if (!db) {
      app.showSystemToast('当前环境不可用')
      return
    }

    const advice = getMoodAdvice(this.data.mood)
    const data = {
      userId: app.globalData.userId,
      date: getTodayDate(),
      type: '神',
      mood: this.data.mood,
      tags: this.data.tags,
      note: this.data.note,
      lifeAdvice: advice.lifeAdvice,
      cultivateAdvice: advice.cultivateAdvice,
      updatedAt: Date.now()
    }

    try {
      const res = await db.collection('daily_spirit')
        .where({
          userId: app.globalData.userId,
          date: data.date,
          type: '神'
        })
        .limit(1)
        .get()

      if (res.data && res.data.length) {
        await db.collection('daily_spirit').doc(res.data[0]._id).update({
          data
        })
      } else {
        await db.collection('daily_spirit').add({
          data: {
            ...data,
            createdAt: Date.now()
          }
        })
      }
      this.setData(advice)
      app.showSystemToast('心情记录已保存', 'success')
    } catch (error) {
      console.error('保存心情记录失败', error)
      app.showSystemToast('保存失败，请稍后重试')
    }
  }
})
