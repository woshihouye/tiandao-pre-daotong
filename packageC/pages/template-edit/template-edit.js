// 自定义人生模板编辑页
const app = getApp()
const {
  createEmptyCustomTemplate,
  sanitizeCustomTemplate,
  upsertCustomTemplate,
  getTemplateById,
  getLocalCustomTemplates,
  CUSTOM_TASK_MAX_REWARD,
  CUSTOM_DAILY_CAP_MAX,
  buildShareCode,
  publishTemplateToPlaza
} = require('../../../utils/life-template.js')

const THEME_OPTIONS = [
  { key: 'theme-light-fixed', label: '素简' },
  { key: 'theme-fresh', label: '清新' },
  { key: 'theme-dusk', label: '黄昏' }
]

const SYSTEM_OPTIONS = [
  { key: 'traditional', label: '传统修仙' },
  { key: 'body', label: '体修' },
  { key: 'beauty', label: '养气' },
  { key: 'worldly', label: '入世' }
]

Page({
  data: {
    themeClass: 'theme-light-fixed',
    form: createEmptyCustomTemplate(),
    themeOptions: THEME_OPTIONS,
    systemOptions: SYSTEM_OPTIONS,
    themeIndex: 0,
    systemIndex: 0,
    maxTaskReward: CUSTOM_TASK_MAX_REWARD,
    maxDailyCap: CUSTOM_DAILY_CAP_MAX
  },

  onLoad(options) {
    this.applyTheme()
    if (options.id) {
      const existing = getTemplateById(options.id, getLocalCustomTemplates())
      if (existing && existing.category === 'custom') {
        this.applyForm(existing)
        return
      }
    }
    this.applyForm(createEmptyCustomTemplate())
  },

  onShow() {
    this.applyTheme()
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  applyForm(form) {
    const themeIndex = Math.max(0, THEME_OPTIONS.findIndex((item) => item.key === form.themeClass))
    const systemIndex = Math.max(0, SYSTEM_OPTIONS.findIndex((item) => item.key === form.cultivationSystem))
    this.setData({
      form,
      themeIndex: themeIndex >= 0 ? themeIndex : 0,
      systemIndex: systemIndex >= 0 ? systemIndex : 0
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`form.${field}`]: e.detail.value
    })
  },

  onRealmInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const realmNames = [...(this.data.form.realmNames || ['', '', '', ''])]
    realmNames[index] = e.detail.value
    this.setData({ 'form.realmNames': realmNames })
  },

  onThemeChange(e) {
    const index = Number(e.detail.value) || 0
    this.setData({
      themeIndex: index,
      'form.themeClass': THEME_OPTIONS[index].key
    })
  },

  onSystemChange(e) {
    const index = Number(e.detail.value) || 0
    this.setData({
      systemIndex: index,
      'form.cultivationSystem': SYSTEM_OPTIONS[index].key
    })
  },

  onTaskInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    this.setData({
      [`form.tasks[${index}].${field}`]: e.detail.value
    })
  },

  // v4.0 外链管理
  onLinkInput(e) {
    var idx = e.currentTarget.dataset.index
    var links = [...(this.data.form.externalLinks || [])]
    links[idx] = e.detail.value
    this.setData({ 'form.externalLinks': links })
  },
  addLink() {
    var links = [...(this.data.form.externalLinks || [])]
    if (links.length >= 5) { getApp().showSystemToast('最多5个外部链接'); return }
    links.push('')
    this.setData({ 'form.externalLinks': links })
  },
  onLinkDelete(e) {
    var idx = Number(e.currentTarget.dataset.index)
    var links = [...(this.data.form.externalLinks || [])]
    links.splice(idx, 1)
    this.setData({ 'form.externalLinks': links })
  },
  // v4.0 长文本
  onLongTextInput(e) {
    this.setData({ 'form.longTextContent': e.detail.value })
  },
  // v4.0 图片上传
  async onUploadImage() {
    var images = [...(this.data.form.imageUrls || [])]
    if (images.length >= 9) { getApp().showSystemToast('最多9张配图'); return }
    try {
      var res = await wx.chooseImage({ count: Math.min(9 - images.length, 9), sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      wx.showLoading({ title: '上传中...' })
      for (var i = 0; i < res.tempFilePaths.length; i++) {
        var uploadRes = await wx.cloud.uploadFile({ cloudPath: 'template_images/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + i + '.jpg', filePath: res.tempFilePaths[i] })
        if (uploadRes.fileID) images.push(uploadRes.fileID)
      }
      wx.hideLoading()
      this.setData({ 'form.imageUrls': images })
    } catch(e) { wx.hideLoading(); console.error('上传图片失败', e) }
  },
  onImageDelete(e) {
    var idx = Number(e.currentTarget.dataset.index)
    var images = [...(this.data.form.imageUrls || [])]
    images.splice(idx, 1)
    this.setData({ 'form.imageUrls': images })
  },

  addTask() {
    const tasks = [...(this.data.form.tasks || [])]
    if (tasks.length >= 12) {
      app.showSystemToast('单模板最多 12 项功课')
      return
    }
    tasks.push({
      id: `task_${Date.now()}`,
      name: '',
      reward: 3,
      path: 'richang',
      desc: '自定义'
    })
    this.setData({ 'form.tasks': tasks })
  },

  removeTask(e) {
    const index = Number(e.currentTarget.dataset.index)
    const tasks = [...(this.data.form.tasks || [])]
    tasks.splice(index, 1)
    this.setData({ 'form.tasks': tasks })
  },

  saveTemplate() {
    try {
      const sanitized = sanitizeCustomTemplate(this.data.form)
      if (!sanitized.tasks.length) {
        app.showSystemToast('请至少添加一项功课')
        return
      }
      const saved = upsertCustomTemplate(sanitized)
      this.applyForm(saved)
      app.showSystemToast('模板已保存', 'success')
    } catch (error) {
      console.error(error)
      app.showSystemToast('保存失败')
    }
  },

  async saveAndActivate() {
    this.saveTemplate()
    const form = sanitizeCustomTemplate(this.data.form)
    const saved = upsertCustomTemplate(form)
    await app.switchLifeTemplate(saved, { syncSystem: true })
    app.showSystemToast(`已启用「${saved.name}」`, 'success')
    setTimeout(() => {
      wx.redirectTo({
        url: `/packageC/pages/template-detail/template-detail?id=${saved.id}`
      })
    }, 400)
  },

  // >>> 发布到模板广场并生成分享码
  publishAndShare() {
    const saved = upsertCustomTemplate(sanitizeCustomTemplate(this.data.form))
    const published = publishTemplateToPlaza({
      ...saved,
      shareCode: saved.shareCode || buildShareCode(saved.id)
    })
    upsertCustomTemplate(published)
    wx.navigateTo({
      url: `/packageC/pages/template-share/template-share?code=${published.shareCode}&mode=share`
    })
  }
})
