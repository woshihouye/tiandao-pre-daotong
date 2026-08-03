Page({
  data: { comments: [], templateId: '', inputText: '' },
  onLoad(options) { this.setData({ templateId: options.templateId || '' }); this.loadComments() },
  async loadComments() {
    try {
      var res = await wx.cloud.callFunction({ name: 'template-manager', data: { action: 'getComments', templateId: this.data.templateId } })
      if (res.result && res.result.ok) this.setData({ comments: res.result.comments || [] })
    } catch(e) { console.error('加载评论失败', e) }
  },
  onInputChange(e) { this.setData({ inputText: e.detail.value }) },
  async onSendTap() {
    var text = (this.data.inputText || '').trim()
    if (!text) return
    wx.showLoading({ title: '发表中...' })
    try {
      var res = await wx.cloud.callFunction({ name: 'template-manager', data: { action: 'addComment', templateId: this.data.templateId, content: text } })
      wx.hideLoading()
      if (res.result && res.result.ok) { this.setData({ inputText: '' }); this.loadComments(); app.showSystemToast('评论已发表') }
      else wx.showToast({ title: res.result ? res.result.error : '发表失败', icon: 'none' })
    } catch(e) { wx.hideLoading(); wx.showToast({ title: '评论失败', icon: 'none' }) }
  }
})
