Page({
  data: {
    msgText: '',
    history: [],
    faqs: [
      { q: '如何开始修行？', a: '在「记录」页选择运动/饮食/学习/工作任一维度提交即可。', show: false },
      { q: '修为怎么计算？', a: '修为 = 基准分 × 强度系数 × 有效率。', show: false },
      { q: '如何突破境界？', a: '修为达到阈值后，在首页点击突破提示进入仪式页。', show: false },
      { q: '模板如何使用？', a: '在「模板」页浏览并导入，导入后在「我的」可切换。', show: false }
    ]
  },
  onFaqTap(e) {
    var idx = e.currentTarget.dataset.index
    var faqs = this.data.faqs
    faqs[idx].show = !faqs[idx].show
    this.setData({ faqs })
  },
  onInput(e) { this.setData({ msgText: e.detail.value }) },
  async onSendTap() {
    var text = this.data.msgText.trim()
    if (!text) return
    wx.showLoading({ title: '发送中...' })
    try {
      await wx.cloud.callFunction({ name: 'customer-service', data: { action: 'send', content: text } })
      this.setData({ msgText: '' })
      wx.showToast({ title: '已发送', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '发送失败', icon: 'none' })
    }
    wx.hideLoading()
  }
})
