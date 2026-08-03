Page({
  data: { nodes: [] },
  onShow() {
    try {
      var records = wx.getStorageSync('tiandao_today_records') || []
      var nodes = records.map(function(r, i) {
        return {
          date: new Date(r.createTime).toLocaleDateString(),
          label: r.name || r.category,
          score: r.score || 0,
          color: r.score >= 0 ? '#22c55e' : '#ef4444'
        }
      })
      this.setData({ nodes: nodes.reverse() })
    } catch(e) { this.setData({ nodes: [] }) }
  }
})
