// 设置页 - 身体数据 / 修炼体系 / 主题 / 更新日志 / 新功能开关
const app = getApp()
const {
  CULTIVATION_SYSTEM_OPTIONS,
  getSelectedCultivationSystem,
  setSelectedCultivationSystem
} = require('../../../utils/cultivation.js')

function clampNumber(value, min, max) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return Math.max(min, Math.min(max, num))
}

function normalizeBodyProfile(profile) {
  return {
    height: clampNumber(profile.height, 100, 250),
    weight: clampNumber(profile.weight, 30, 300),
    age: clampNumber(profile.age, 10, 100),
    gender: profile.gender === 'female' ? 'female' : profile.gender === 'male' ? 'male' : '',
    goal: ['gain', 'maintain', 'cut'].includes(profile.goal) ? profile.goal : 'maintain',
    trainingExperience: ['0-3个月', '3-12个月', '1-3年', '3-5年', '5年以上'].includes(profile.trainingExperience) ? profile.trainingExperience : '0-3个月',
    bodyFat: profile.bodyFat === '' || profile.bodyFat === null || profile.bodyFat === undefined
      ? ''
      : clampNumber(profile.bodyFat, 3, 60)
  }
}

const GENDER_OPTIONS = [
  { key: 'male', label: '男' },
  { key: 'female', label: '女' }
]

const TRAINING_EXPERIENCE_OPTIONS = ['0-3个月', '3-12个月', '1-3年', '3-5年', '5年以上']

const GOAL_OPTIONS = [
  { key: 'gain', label: '增重增肌' },
  { key: 'maintain', label: '减脂塑形' },
  { key: 'cut', label: '保持现状' }
]

const THEME_OPTIONS = [
  { key: 'auto', label: '自动切换', desc: '根据修行分数自动切换仙界/红尘/地狱' },
  { key: 'fresh', label: '仙界主题', desc: '修行达标·仙风明亮' },
  { key: 'dusk', label: '红尘主题', desc: '修行中·暖黄护眼' },
  { key: 'gloom', label: '地狱主题', desc: '未达标·沉郁警醒' },
  { key: 'light', label: '修行主题', desc: '固定浅色·不随状态变化' }
]

const defaultBodyForm = { height: null, weight: null, age: null, gender: '', bodyFat: '', trainingExperience: '0-3个月', goal: 'maintain' }

Page({
  data: {
    // 身体数据
    bodyForm: Object.assign({}, defaultBodyForm),
    genderOptions: GENDER_OPTIONS,
    genderIndex: 0,
    trainingExperienceOptions: TRAINING_EXPERIENCE_OPTIONS,
    trainingExperienceIndex: 0,
    goalOptions: GOAL_OPTIONS,
    goalIndex: 1,

    // 修炼体系
    cultivationSystems: CULTIVATION_SYSTEM_OPTIONS,
    selectedCultivationSystem: 'traditional',

    // 主题
    themeOptions: THEME_OPTIONS,
    selectedTheme: 'auto',

    // 道童悬浮球
    spiritVisible: true
  },

  onLoad() {
    this.applyTheme()
    this.restoreSettings()
  },

  onShow() {
    this.applyTheme()
    this.restoreSettings()
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  async restoreSettings() {
    // 加载身体数据
    try {
      const stored = wx.getStorageSync('tiandao_body_profile') || {}
      const normalized = normalizeBodyProfile(stored)
      const genderIdx = normalized.gender === 'female' ? 1 : 0
      const trainingIdx = TRAINING_EXPERIENCE_OPTIONS.indexOf(normalized.trainingExperience)
      const goalIdx = GOAL_OPTIONS.findIndex(function(g) { return g.key === normalized.goal })
      this.setData({
        bodyForm: normalized,
        genderIndex: genderIdx,
        trainingExperienceIndex: trainingIdx >= 0 ? trainingIdx : 0,
        goalIndex: goalIdx >= 0 ? goalIdx : 1
      })
    } catch (e) { /* ignore */ }

    // 加载修炼体系
    this.setData({ selectedCultivationSystem: getSelectedCultivationSystem() })

    // 加载主题
    try {
      const theme = wx.getStorageSync('tiandao_theme_override') || 'auto'
      this.setData({ selectedTheme: theme })
    } catch (e) { /* ignore */ }

    // 加载悬浮球
    const spiritVisible = wx.getStorageSync('tiandao_spirit_hidden') !== true

    this.setData({
      spiritVisible
    })
  },

  // ===== 身体数据 =====
  onBodyInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['bodyForm.' + field]: e.detail.value })
  },

  onBodyBlur(e) {
    const field = e.currentTarget.dataset.field
    const form = Object.assign({}, this.data.bodyForm)
    const raw = form[field]
    if (field === 'height') { form.height = clampNumber(raw, 100, 250) }
    else if (field === 'weight') { form.weight = clampNumber(raw, 30, 300) }
    else if (field === 'age') { form.age = clampNumber(raw, 10, 100) }
    this.setData({ bodyForm: form })
  },

  onGenderChange(e) {
    const idx = Number(e.detail.value) || 0
    const key = GENDER_OPTIONS[idx] ? GENDER_OPTIONS[idx].key : 'male'
    this.setData({ genderIndex: idx, 'bodyForm.gender': key })
  },

  onTrainingExperienceChange(e) {
    const idx = Number(e.detail.value) || 0
    this.setData({
      trainingExperienceIndex: idx,
      'bodyForm.trainingExperience': TRAINING_EXPERIENCE_OPTIONS[idx]
    })
  },

  onGoalChange(e) {
    const idx = Number(e.detail.value) || 0
    const key = GOAL_OPTIONS[idx] ? GOAL_OPTIONS[idx].key : 'maintain'
    this.setData({ goalIndex: idx, 'bodyForm.goal': key })
  },

  saveBodySettings() {
    const normalized = normalizeBodyProfile(this.data.bodyForm)
    wx.setStorageSync('tiandao_body_profile', normalized)
    wx.showToast({ title: '身体数据已保存', icon: 'success' })

    // 同步到云数据库
    const db = app.globalData.db
    if (db && app.ensureUserProfile) {
      app.ensureUserProfile().then(function(profile) {
        if (profile && profile._id) {
          db.collection('users').doc(profile._id).update({
            data: { bodyProfile: normalized, updatedAt: Date.now() }
          }).catch(function() {})
        }
      }).catch(function() {})
    }
  },

  // ===== 修炼体系 =====
  selectCultivationSystem(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    setSelectedCultivationSystem(key)
    this.setData({ selectedCultivationSystem: key })
    wx.showToast({ title: '体系已切换', icon: 'success' })
  },

  // ===== 主题 =====
  selectTheme(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    wx.setStorageSync('tiandao_theme_override', key)
    this.setData({ selectedTheme: key })
    // 通知全局页面主题已变更
    if (app.emitAppEvent) {
      app.emitAppEvent('themeOverrideChanged', { key })
    }
    const label = key === 'auto' ? '自动切换' : '主题已切换'
    wx.showToast({ title: label, icon: 'success' })
  },

  // ===== 更新日志 =====
  goToUpdateLog() {
    wx.navigateTo({ url: '/packageB/pages/update-log/update-log' })
  },

  // ===== 新功能 =====
  toggleSpirit(e) {
    const val = e.detail.value
    wx.setStorageSync('tiandao_spirit_hidden', !val)
    this.setData({ spiritVisible: val })
    app.emitAppEvent && app.emitAppEvent('spirit-visibility-changed', { visible: val })
    app.showSystemToast && app.showSystemToast(val ? '道童悬浮球已显示' : '道童悬浮球已隐藏', 'success')
  }
})
