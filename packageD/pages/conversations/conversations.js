var app = getApp()

Page({
  data: {
    conversations: [],
    total: 0,
    totalCount: 0,
    normalCount: 0,
    strangerCount: 0,
    strangerFilter: 'all',
    loading: false,
    page: 1,
    touchStartX: 0
  },

  onShow: function() {
    this.loadConversations()
  },

  onPullDownRefresh: function() {
    var that = this
    this.loadConversations().then(function() {
      wx.stopPullDownRefresh()
    })
  },

  switchTab: function(e) {
    var filter = e.currentTarget.dataset.filter
    this.setData({ strangerFilter: filter, page: 1 })
    this.loadConversations()
  },

  loadConversations: function() {
    var that = this
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true })

    var filter = this.data.strangerFilter

    return new Promise(function(resolve) {
      wx.cloud.callFunction({
        name: 'message-center',
        data: {
          action: 'getConversations',
          params: {
            userId: (app.globalData && app.globalData.userId) || '',
            page: that.data.page,
            pageSize: 20,
            strangerFilter: filter
          }
        }
      }).then(function(res) {
        var result = res.result || {}
        if (result.ok) {
          var list = result.conversations || []
          var userId = (app.globalData && app.globalData.userId) || ''
          // 计算每个会话的未读数
          list = list.map(function(c) {
            var unread = c.unreadCount || {}
            return {
              _id: c._id,
              conversationId: c.conversationId,
              targetUserId: c.targetUserId,
              targetNickName: c.targetNickName || '无名修士',
              lastMessage: c.lastMessage || '',
              lastMsgTime: c.lastMsgTime || 0,
              unreadCount: unread[userId] || 0,
              timeLabel: that.formatTime(c.lastMsgTime),
              isStranger: !!c.isStranger,
              isOnline: !!c.isOnline,
              lastOnlineAt: c.lastOnlineAt || 0
            }
          })
          that.setData({
            conversations: list,
            total: result.total || 0,
            totalCount: (result.normalCount || 0) + (result.strangerCount || 0),
            normalCount: result.normalCount || 0,
            strangerCount: result.strangerCount || 0,
            loading: false
          })
        } else {
          that.setData({ loading: false })
        }
        resolve()
      }).catch(function() {
        that.setData({ loading: false })
        resolve()
      })
    })
  },

  formatTime: function(ts) {
    if (!ts) return ''
    var d = new Date(ts)
    var now = new Date()
    var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
    var msgDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    var time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    if (msgDate === today) return time
    var yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    var yestStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0')
    if (msgDate === yestStr) return '昨天 ' + time
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + time
  },

  openChat: function(e) {
    var item = e.currentTarget.dataset.item
    if (!item) return
    wx.navigateTo({
      url: '/packageD/pages/chat-detail/chat-detail?userId=' + item.targetUserId + '&nickName=' + (item.targetNickName || '')
    })
  },

  onTouchStart: function(e) { this.setData({ touchStartX: e.touches[0].clientX }) },
  onTouchMove: function(e) {
    var dx = e.touches[0].clientX - this.data.touchStartX
    if (dx < -60) {
      var idx = e.currentTarget.dataset.index
      var list = this.data.conversations
      list.forEach(function(c, i) { c.slideOpen = i === idx })
      this.setData({ conversations: list })
    }
  },
  onTouchEnd: function() { this.setData({ touchStartX: 0 }) },

  deleteConversation: function(e) {
    var item = e.currentTarget.dataset.item
    if (!item) return
    var that = this
    wx.showModal({
      title: '删除会话',
      content: '删除后将清空该会话记录',
      success: function(res) {
        if (!res.confirm) return
        wx.cloud.callFunction({
          name: 'message-center',
          data: {
            action: 'deleteConversation',
            params: {
              conversationId: item.conversationId,
              userId: (app.globalData && app.globalData.userId) || ''
            }
          }
        }).then(function() {
          that.loadConversations()
        }).catch(function() {})
      }
    })
  }
})
