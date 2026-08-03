// 我的道则 - 自定义维度和境界名称
const app = getApp()

const DEFAULT_DIMENSIONS = {
  wu: { name: '炼体', icon: '武' },
  shi: { name: '丹食', icon: '食' },
  wu_xin: { name: '修心', icon: '悟' },
  gong: { name: '功业', icon: '工' },
  sha: { name: '心魔', icon: '煞' }
}

const DEFAULT_REALMS = ['炼精化气', '炼气化神', '炼神还虚', '炼虚合道']

const DIM_KEYS = ['wu', 'shi', 'wu_xin', 'gong', 'sha']

Page({
  data: {
    themeClass: 'theme-light-fixed',
    daoName: '我的道则',
    coverImage: '',
    dimNames: { wu: '', shi: '', wu_xin: '', gong: '', sha: '' },
    realmNames: ['', '', '', ''],
    checkinItems: { wu: [], shi: [], wu_xin: [], gong: [], sha: [] },
    activeDim: 'wu',
    newItemText: '',
    hasChanges: false,
    isSaving: false
  },

  onLoad() {
    this.applyTheme()
    this.loadExisting()
  },

  onShow() {
    this.applyTheme()
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  loadExisting() {
    const rules = app.getCustomDaoRules()
    if (rules) {
      const dimNames = {}
      DIM_KEYS.forEach((key) => {
        dimNames[key] = (rules.dimensions && rules.dimensions[key] && rules.dimensions[key].name) || ''
      })
      this.setData({
        daoName: rules.name || '我的道则',
        coverImage: rules.coverImage || '',
        dimNames,
        realmNames: Array.isArray(rules.realmNames) ? rules.realmNames.slice(0, 4) : ['', '', '', ''],
        checkinItems: rules.checkinItems || { wu: [], shi: [], wu_xin: [], gong: [], sha: [] }
      })
    }
  },

  // ========== 道则名称 ==========
  onNameInput(e) {
    this.setData({ daoName: e.detail.value, hasChanges: true })
  },

  // ========== 维度名称 ==========
  onDimInput(e) {
    const dim = e.currentTarget.dataset.dim
    const value = e.detail.value
    this.setData({
      [`dimNames.${dim}`]: value,
      hasChanges: true
    })
  },

  // ========== 境界名称 ==========
  onRealmInput(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const realmNames = [...this.data.realmNames]
    realmNames[idx] = e.detail.value
    this.setData({ realmNames, hasChanges: true })
  },

  // ========== 自定义打卡项 ==========
  switchDim(e) {
    const dim = e.currentTarget.dataset.dim
    this.setData({ activeDim: dim, newItemText: '' })
  },

  onItemTextInput(e) {
    this.setData({ newItemText: e.detail.value })
  },

  addCheckinItem() {
    const text = this.data.newItemText.trim()
    if (!text) return
    const dim = this.data.activeDim
    const checkinItems = { ...this.data.checkinItems }
    if (!checkinItems[dim]) checkinItems[dim] = []
    if (checkinItems[dim].includes(text)) {
      wx.showToast({ title: '已存在相同修行项', icon: 'none' })
      return
    }
    checkinItems[dim] = [...checkinItems[dim], text]
    this.setData({ checkinItems, newItemText: '', hasChanges: true })
  },

  removeCheckinItem(e) {
    const dim = e.currentTarget.dataset.dim
    const idx = Number(e.currentTarget.dataset.idx)
    const checkinItems = { ...this.data.checkinItems }
    checkinItems[dim] = checkinItems[dim].filter((_, i) => i !== idx)
    this.setData({ checkinItems, hasChanges: true })
  },

  // ========== 保存 ==========
  async saveDaoRules() {
    const { daoName, dimNames, realmNames, checkinItems } = this.data

    // 验证名称
    if (!daoName.trim()) {
      wx.showToast({ title: '请输入道则名称', icon: 'none' })
      return
    }

    // 构建道则数据
    const rules = {
      name: daoName.trim(),
      coverImage: this.data.coverImage,
      dimensions: {},
      realmNames: realmNames.map((n) => n.trim() || DEFAULT_REALMS[realmNames.indexOf(n)]),
      checkinItems,
      updatedAt: Date.now()
    }

    DIM_KEYS.forEach((key) => {
      rules.dimensions[key] = {
        name: dimNames[key] && dimNames[key].trim() ? dimNames[key].trim() : DEFAULT_DIMENSIONS[key].name
      }
    })

    this.setData({ isSaving: true })
    const ok = app.saveCustomDaoRules(rules)
    if (ok) {
      wx.showToast({ title: '道则已保存', icon: 'success' })
      this.setData({ hasChanges: false, isSaving: false })

      // 一键同步到道童对话
      app.emitAppEvent('dao-rules-changed', { rules })
      app.refreshCultivationPages('dao-rules-changed')
    } else {
      wx.showToast({ title: '保存失败', icon: 'none' })
      this.setData({ isSaving: false })
    }
  },

  // ========== 重置 ==========
  resetAll() {
    wx.showModal({
      title: '叮，系统提示',
      content: '确定重置所有道则自定义内容为默认值？',
      confirmText: '确认重置',
      success: (res) => {
        if (res.confirm) {
          const dimNames = {}
          DIM_KEYS.forEach((key) => { dimNames[key] = '' })
          this.setData({
            daoName: '我的道则',
            coverImage: '',
            dimNames,
            realmNames: ['', '', '', ''],
            checkinItems: { wu: [], shi: [], wu_xin: [], gong: [], sha: [] },
            hasChanges: true
          })
        }
      }
    })
  },

  // ========== 分享 ==========
  onShareDao() {
    const rules = this.buildRulesForShare()
    if (!rules || !rules.name) {
      wx.showToast({ title: '请先保存道则', icon: 'none' })
      return
    }

    // 复制分享码
    const shareCode = btoa(encodeURIComponent(JSON.stringify(rules)))
    wx.setClipboardData({
      data: `天之道则：${rules.name}\n分享码：${shareCode}\n—来自天道修行小程序`,
      success: () => {
        wx.showToast({ title: '道则分享码已复制', icon: 'success' })
      }
    })
  },

  buildRulesForShare() {
    const { daoName, dimNames, realmNames, checkinItems } = this.data
    const dimensions = {}
    DIM_KEYS.forEach((key) => {
      if (dimNames[key] && dimNames[key].trim()) {
        dimensions[key] = { name: dimNames[key].trim() }
      } else {
        dimensions[key] = { name: DEFAULT_DIMENSIONS[key].name }
      }
    })
    return {
      name: daoName.trim(),
      dimensions,
      realmNames: realmNames.map((n, i) => n.trim() || DEFAULT_REALMS[i]),
      checkinItems
    }
  }
})
