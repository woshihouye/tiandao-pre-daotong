const app = getApp()
const { fetchCategoryRecords } = require('../../../utils/detail-board.js')
const {
  FOUNDATION_TEMPLATE_ID,
  ACTIVITY_OPTIONS,
  GOAL_CONFIG,
  getDefaultTechniqueProfile,
  calculateNutritionTarget,
  summarizeWeek,
  summarizeDiet,
  evaluateTrainingStage,
  calculateAlignmentScore,
  calculateTechniqueReward,
  buildTrainingAdvice,
  getStageConfig,
  formatDate
} = require('../../../utils/foundation-technique.js')

function defaultBodyProfile() {
  return {
    gender: 'male',
    age: 24,
    height: 170,
    weight: 65,
    goal: 'maintain',
    activityMode: 'auto_mid',
    customActivityFactor: 1.55,
    customProteinPerKg: 0,
    customCarbsPerKg: 0,
    customFatPerKg: 0
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function isWithinDays(dateString, days) {
  if (!dateString) return false
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return false
  const diff = Date.now() - date.getTime()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
}

function toLevelName(level) {
  const stageName = level <= 3 ? '入门' : level <= 6 ? '进阶' : '大成'
  const inStage = ((level - 1) % 3) + 1
  const map = ['一', '二', '三']
  return `${stageName}${map[inStage - 1]}境`
}

Page({
  data: {
    themeClass: 'theme-dusk',
    statusBarHeight: 0,
    navBarHeight: 44,
    activeTab: 'general',
    tabList: [
      { key: 'general', label: '修炼总纲' },
      { key: 'training', label: '训练篇' },
      { key: 'diet', label: '饮食篇' },
      { key: 'exam', label: '进阶考核' }
    ],
    bodyProfile: defaultBodyProfile(),
    techniqueProfile: getDefaultTechniqueProfile(),
    needBodyProfile: false,
    goalTabs: [
      { key: 'gain', label: '增肌' },
      { key: 'maintain', label: '维持' },
      { key: 'cut', label: '减脂' }
    ],
    activityOptions: ACTIVITY_OPTIONS,
    nutritionTarget: {
      bmr: 0,
      tdee: 0,
      activityFactor: 1.55,
      targetCalories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      goalLabel: '维持',
      note: '仅供业余训练参考，不构成专业健身指导'
    },
    dietToday: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    trainingEval: null,
    trainingAdvice: null,
    alignment: { score: 0, grade: '待补全参数', bonus: 0 },
    weekProgress: {
      trainingRate: 0,
      dietRate: 0,
      overallRate: 0
    },
    todayBonus: 0,
    canBreakthrough: false,
    breakthroughReward: 0,
    sportRecent: [],
    dietRecent: []
  },

  onLoad() {
    const info = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: info.statusBarHeight || 0
    })
    this.loadData(true)
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

  onPullDownRefresh() {
    this.loadData(false).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ activeTab: key })
  },

  switchGoal(e) {
    const key = e.currentTarget.dataset.key
    this.setData({
      'bodyProfile.goal': key
    }, () => {
      this.recalculate()
    })
  },

  onBodyInput(e) {
    const field = e.currentTarget.dataset.field
    const value = Number(e.detail.value) || 0
    this.setData({
      [`bodyProfile.${field}`]: value
    }, () => {
      this.recalculate()
    })
  },

  onActivityModeChange(e) {
    const index = Number(e.detail.value)
    const mode = this.data.activityOptions[index]?.key || 'auto_mid'
    this.setData({
      'bodyProfile.activityMode': mode
    }, () => {
      this.recalculate()
    })
  },

  goBack() {
    wx.navigateBack()
  },

  goProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  async loadData(showLoading) {
    const db = app.globalData.db
    if (!db) {
      return
    }

    if (showLoading) {
      wx.showLoading({ title: '推演功法中...' })
    }

    try {
      const profile = await app.ensureUserProfile()
      const todayScore = await app.getTodayScore()
      const localBodyProfile = wx.getStorageSync('tiandao_body_profile') || {}
      const bodyProfile = { ...defaultBodyProfile(), ...(profile?.bodyProfile || {}), ...localBodyProfile }
      const techniqueProfile = { ...getDefaultTechniqueProfile(), ...(profile?.foundationTechniqueProfile || {}) }

      const sportAll = await fetchCategoryRecords(db, app.globalData.userId, 'sport')
      const dietAll = await fetchCategoryRecords(db, app.globalData.userId, 'diet')

      const today = formatDate(Date.now())
      const sportRecent = sportAll.filter((item) => isWithinDays(item.date, 14))
      const dietRecent = dietAll.filter((item) => isWithinDays(item.date, 7))

      const dietTodaySummary = summarizeDiet(dietRecent, today).today
      const stageConfig = getStageConfig(techniqueProfile.level)
      const trainingEval = evaluateTrainingStage(
        techniqueProfile.level,
        summarizeWeek(sportRecent, 0),
        summarizeWeek(sportRecent, -1)
      )
      const isTrainingDay = trainingEval.currentWeek.list.some((item) => item.date === today)
      const nutritionTarget = calculateNutritionTarget(bodyProfile, trainingEval.currentWeek.sessionDays, isTrainingDay)
      const alignment = calculateAlignmentScore(nutritionTarget, dietTodaySummary)
      const trainingAdvice = buildTrainingAdvice(techniqueProfile.level, trainingEval)

      const trainingRate = this.calculateTrainingRate(stageConfig, trainingEval)
      const dietRate = clamp(alignment.score / 100, 0, 1)
      const overallRate = Math.round(((trainingRate * 0.6) + (dietRate * 0.4)) * 100)
      const todayBonus = alignment.bonus || 0
      const canBreakthrough = trainingEval.canAdvance && alignment.score >= 75
      const breakthroughReward = calculateTechniqueReward(techniqueProfile.level)
      const needBodyProfile = !profile?.bodyProfile
        || !Number(bodyProfile.height)
        || !Number(bodyProfile.weight)
        || !Number(bodyProfile.age)

      this.setData({
        themeClass: app.resolveThemeClass ? app.resolveThemeClass(todayScore) : 'theme-hongchen',
        bodyProfile,
        techniqueProfile,
        needBodyProfile,
        nutritionTarget,
        dietToday: dietTodaySummary,
        trainingEval,
        trainingAdvice,
        alignment,
        weekProgress: {
          trainingRate: Math.round(trainingRate * 100),
          dietRate: Math.round(dietRate * 100),
          overallRate
        },
        todayBonus,
        canBreakthrough,
        breakthroughReward,
        sportRecent,
        dietRecent
      })
    } catch (error) {
      console.error(error)
      app.showSystemToast('功法推演失败')
    } finally {
      if (showLoading) {
        wx.hideLoading()
      }
    }
  },

  calculateTrainingRate(stageConfig, trainingEval) {
    const frequencyRate = clamp(trainingEval.currentWeek.sessionDays / Math.max(1, stageConfig.weeklyFrequency), 0, 1)
    const setRate = clamp(trainingEval.currentWeek.maxMuscleSets / Math.max(1, stageConfig.weeklySetsRange[0]), 0, 1)
    const repRate = trainingEval.repOk ? 1 : 0
    return (frequencyRate * 0.45) + (setRate * 0.35) + (repRate * 0.2)
  },

  recalculate() {
    const trainingEval = this.data.trainingEval
    if (!trainingEval) {
      return
    }
    const today = formatDate(Date.now())
    const dietToday = summarizeDiet(this.data.dietRecent, today).today
    const isTrainingDay = trainingEval.currentWeek.list.some((item) => item.date === today)
    const nutritionTarget = calculateNutritionTarget(this.data.bodyProfile, trainingEval.currentWeek.sessionDays, isTrainingDay)
    const alignment = calculateAlignmentScore(nutritionTarget, dietToday)
    const stageConfig = getStageConfig(this.data.techniqueProfile.level)
    const trainingRate = this.calculateTrainingRate(stageConfig, trainingEval)
    const dietRate = clamp(alignment.score / 100, 0, 1)
    const overallRate = Math.round(((trainingRate * 0.6) + (dietRate * 0.4)) * 100)
    const canBreakthrough = trainingEval.canAdvance && alignment.score >= 75

    this.setData({
      nutritionTarget,
      dietToday,
      alignment,
      weekProgress: {
        trainingRate: Math.round(trainingRate * 100),
        dietRate: Math.round(dietRate * 100),
        overallRate
      },
      todayBonus: alignment.bonus || 0,
      canBreakthrough
    })
  },

  async confirmBreakthrough() {
    if (!this.data.canBreakthrough) {
      app.showSystemToast('仍需稳固根基')
      return
    }

    const db = app.globalData.db
    if (!db) {
      app.showSystemToast('云海灵阵尚未连通')
      return
    }

    const profile = await app.ensureUserProfile()
    if (!profile?._id) {
      app.showSystemToast('当前无法突破')
      return
    }

    const currentLevel = this.data.techniqueProfile.level
    const nextLevel = Math.min(9, currentLevel + 1)
    const reward = calculateTechniqueReward(currentLevel)

    const modal = await app.showSystemModal(`《薄肌模板》可突破至${toLevelName(nextLevel)}，是否领取 ${reward} 修为并破境？`, '破境')
    if (!modal.confirm) {
      return
    }

    try {
      // >>> 破境奖励统一走 addScore
      if (app.addScore) {
        await app.addScore(reward)
      }
      await db.collection('users').doc(profile._id).update({
        data: {
          foundationTechniqueProfile: {
            ...(profile.foundationTechniqueProfile || {}),
            level: nextLevel,
            lastReward: reward,
            lastRewardAt: Date.now()
          },
          learningTemplateId: 'thin_muscle',
          learningTemplateName: '薄肌模板',
          bodyProfile: this.data.bodyProfile,
          updatedAt: Date.now()
        }
      })
      app.showSystemToast(`突破成功，已晋入${toLevelName(nextLevel)}`, 'success')
      this.loadData(false)
    } catch (error) {
      console.error(error)
      app.showSystemToast('突破失败，请稍后再试')
    }
  }
})
