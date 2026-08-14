var board = require('../../utils/leaderboard.js')
Page({
  data: {
    boards: board.getBoardList(),
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
    var that = this
    wx.cloud.callFunction({
      name: 'template-manager',
      data: { action: 'getLeaderboard', boardType: t, userId: this.data.userId }
    }).then(function(res) {
      var r = res.result
      if (r && r.ok) {
        that.renderEntries(r.entries || [], t)
        board.cacheBoardData(t, r.entries || [])
      } else {
        that.renderEntries(board.generatePlaceholderBoard(t, 10), t)
      }
    }).catch(function() {
      that.renderEntries(board.generatePlaceholderBoard(t, 10), t)
    })
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
