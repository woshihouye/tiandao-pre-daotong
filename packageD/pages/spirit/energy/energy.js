const app = getApp()

function getTodayDate() {
  return app.getTodayDate ? app.getTodayDate() : new Date().toISOString().slice(0, 10)
}

function clamp(value, min, max) {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return 0
  }
  return Math.max(min, Math.min(max, num))
}

function calculateEnergy(form = {}) {
  const workHours = clamp(form.workHours, 0, 16)
  const sleepHours = clamp(form.sleepHours, 0, 16)
  const exerciseMinutes = clamp(form.exerciseMinutes, 0, 300)
  const sleepQuality = ['好', '一般', '差'].includes(form.sleepQuality) ? form.sleepQuality : '一般'

  let score = 100

  if (sleepHours >= 7) {
    score += 20
  } else if (sleepHours >= 6) {
    score += 10
  } else if (sleepHours < 5) {
    score -= 20
  }

  if (exerciseMinutes >= 30) {
    score += 15
  } else if (exerciseMinutes >= 15) {
    score += 8
  }

  if (workHours >= 8) {
    score -= 15
  } else if (workHours >= 6) {
    score -= 8
  }

  if (sleepQuality === '好') {
    score += 10
  } else if (sleepQuality === '差') {
    score -= 15
  }

  score = Math.max(0, Math.min(150, score))

  if (score >= 120) {
    return {
      energyValue: score,
      energyLevel: '精力充沛',
      progressColor: '#10B981',
      advice: '今日状态极佳！适合攻克难点修行内容，建议安排30min以上高强度运动',
      buff: '修行进度+30%'
    }
  }

  if (score >= 80) {
    return {
      energyValue: score,
      energyLevel: '状态平稳',
      progressColor: '#F59E0B',
      advice: '状态平稳，按部就班修行即可，可安排轻度运动',
      buff: '修行进度+10%'
    }
  }

  if (score >= 50) {
    return {
      energyValue: score,
      energyLevel: '略感疲惫',
      progressColor: '#F97316',
      advice: '略感疲惫，建议减少修行强度，以恢复为主',
      buff: '修行进度-20%'
    }
  }

  return {
    energyValue: score,
    energyLevel: '精力枯竭',
    progressColor: '#EF4444',
    advice: '精力严重不足！请立即休息，禁止剧烈运动',
    buff: '修行进度-50%'
  }
}

Page({
  data: {
    themeClass: 'theme-light-fixed',
    form: {
      workHours: '',
      sleepHours: '',
      sleepQuality: '一般',
      exerciseMinutes: ''
    },
    qualityOptions: ['好', '一般', '差'],
    qualityIndex: 1,
    energyValue: 100,
    energyLevel: '状态平稳',
    progressColor: '#F59E0B',
    advice: '状态平稳，按部就班修行即可，可安排轻度运动',
    buff: '修行进度+10%',
    progressWidth: 66.67
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
      this.recalculate()
      return
    }

    try {
      const res = await db.collection('daily_spirit')
        .where({
          userId: app.globalData.userId,
          date: getTodayDate(),
          type: '精'
        })
        .limit(1)
        .get()

      const record = res.data && res.data[0]
      if (record) {
        const form = {
          workHours: record.workHours === 0 ? '0' : String(record.workHours || ''),
          sleepHours: record.sleepHours === 0 ? '0' : String(record.sleepHours || ''),
          sleepQuality: record.sleepQuality || '一般',
          exerciseMinutes: record.exerciseMinutes === 0 ? '0' : String(record.exerciseMinutes || '')
        }
        this.setData({
          form,
          qualityIndex: Math.max(0, this.data.qualityOptions.indexOf(form.sleepQuality))
        })
      }
    } catch (error) {
      console.error('读取精力记录失败', error)
    }

    this.recalculate()
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`form.${field}`]: e.detail.value
    }, () => this.recalculate())
  },

  onQualityChange(e) {
    const index = Number(e.detail.value) || 0
    this.setData({
      qualityIndex: index,
      'form.sleepQuality': this.data.qualityOptions[index] || '一般'
    }, () => this.recalculate())
  },

  selectQuality(e) {
    const value = e.currentTarget.dataset.value || '一般'
    const index = this.data.qualityOptions.indexOf(value)
    this.setData({
      qualityIndex: Math.max(0, index),
      'form.sleepQuality': value
    }, () => this.recalculate())
  },

  recalculate() {
    const result = calculateEnergy(this.data.form)
    this.setData({
      ...result,
      progressWidth: (result.energyValue / 150) * 100
    })
  },

  async saveEnergy() {
    const db = app.getDb ? app.getDb() : app.globalData.db
    if (!db) {
      app.showSystemToast('当前环境不可用')
      return
    }

    const workHours = clamp(this.data.form.workHours, 0, 16)
    const sleepHours = clamp(this.data.form.sleepHours, 0, 16)
    const exerciseMinutes = clamp(this.data.form.exerciseMinutes, 0, 300)
    const result = calculateEnergy(this.data.form)
    const data = {
      userId: app.globalData.userId,
      date: getTodayDate(),
      type: '精',
      workHours,
      sleepHours,
      sleepQuality: this.data.form.sleepQuality,
      exerciseMinutes,
      energyValue: result.energyValue,
      energyLevel: result.energyLevel,
      buff: result.buff,
      advice: result.advice,
      updatedAt: Date.now()
    }

    try {
      const res = await db.collection('daily_spirit')
        .where({
          userId: app.globalData.userId,
          date: data.date,
          type: '精'
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
      this.recalculate()
      app.showSystemToast('精力记录已保存', 'success')
    } catch (error) {
      console.error('保存精力记录失败', error)
      app.showSystemToast('保存失败，请稍后重试')
    }
  }
})
