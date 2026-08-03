// 模板分享 / 广场 / 导入页
const app = getApp()
const {
  getPublicTemplates,
  findPublicTemplateByShareCode,
  importPublicTemplate,
  buildSharePath
} = require('../../../utils/life-template.js')

Page({
  data: {
    themeClass: 'theme-light-fixed',
    mode: 'plaza',
    shareCode: '',
    inputCode: '',
    template: null,
    plazaList: [],
    sharePath: ''
  },

  onLoad(options) {
    this.applyTheme()
    const mode = options.mode || (options.code ? 'share' : 'plaza')
    const shareCode = decodeURIComponent(options.code || '')
    this.setData({ mode, shareCode, inputCode: shareCode })
    this.refresh(shareCode)
  },

  onShow() {
    this.applyTheme()
    this.refresh(this.data.shareCode)
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  refresh(shareCode) {
    const plazaList = getPublicTemplates()
    let template = null
    if (shareCode) {
      template = findPublicTemplateByShareCode(shareCode)
    }
    this.setData({
      plazaList,
      template,
      sharePath: shareCode ? buildSharePath(shareCode) : ''
    })
    const titleMap = { plaza: '模板广场', import: '导入模板', share: '分享模板' }
    wx.setNavigationBarTitle({ title: titleMap[this.data.mode] || '模板广场' })
  },

  onCodeInput(e) {
    this.setData({ inputCode: e.detail.value })
  },

  lookupCode() {
    const code = String(this.data.inputCode || '').trim()
    if (!code) {
      app.showSystemToast('请输入分享码')
      return
    }
    const template = findPublicTemplateByShareCode(code)
    if (!template) {
      app.showSystemToast('未找到对应模板')
      this.setData({ template: null, shareCode: code })
      return
    }
    this.setData({
      template,
      shareCode: template.shareCode,
      mode: 'share',
      sharePath: buildSharePath(template.shareCode)
    })
  },

  // >>> 一键导入：生成本地副本，不影响原模板
  importNow() {
    const code = this.data.template
      ? this.data.template.shareCode
      : this.data.inputCode
    const imported = importPublicTemplate(code)
    if (!imported) {
      app.showSystemToast('导入失败，分享码无效')
      return
    }
    app.showSystemToast(`已导入「${imported.name}」`, 'success')
    wx.redirectTo({
      url: `/packageC/pages/template-detail/template-detail?id=${imported.id}`
    })
  },

  openPlazaItem(e) {
    const code = e.currentTarget.dataset.code
    const template = findPublicTemplateByShareCode(code)
    if (!template) return
    this.setData({
      mode: 'share',
      template,
      shareCode: template.shareCode,
      inputCode: template.shareCode,
      sharePath: buildSharePath(template.shareCode)
    })
  },

  copyCode() {
    const code = this.data.shareCode || (this.data.template && this.data.template.shareCode)
    if (!code) return
    wx.setClipboardData({
      data: code,
      success: () => app.showSystemToast('分享码已复制', 'success')
    })
  },

  onShareAppMessage() {
    const code = this.data.shareCode || ''
    const name = (this.data.template && this.data.template.name) || '人生模板'
    return {
      title: `天道修行 · ${name}`,
      path: buildSharePath(code)
    }
  }
})
