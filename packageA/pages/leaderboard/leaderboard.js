var board = require('../../../utils/leaderboard.js')
Page({
  data: {
    activeBoard: 'power',
    entries: [],
    myRank: null,
    userId: ''
  },
  onLoad() {
    var app = getApp()
    this.setData({ userId: app.globalData.userId || '' })
    this.loadBoard('power')
  },
  onBoardTap(e){ var t=e.currentTarget.dataset.board; this.setData({activeBoard:t}); this.loadBoard(t) },
  loadBoard(t) {
    var cached = board.getCachedBoardData(t)
    if (cached) { this.renderEntries(cached, t); return }
    // 降级用占位数据
    var entries = board.generatePlaceholderBoard(t, 10)
    this.renderEntries(entries, t)
  },
  renderEntries(entries, t) {
    var uid = this.data.userId
    for (var i=0;i<entries.length;i++) {
      var r = board.formatRank(entries[i].rank || i+1)
      entries[i].rankDisplay = r.display
      entries[i].rankClass = r.className
      entries[i].avatarText = entries[i].nickName ? entries[i].nickName.charAt(0) : '修'
    }
    var my = board.getUserRank(t, entries, uid)
    this.setData({ entries, myRank: my })
  }
})
