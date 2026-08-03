var app = getApp()

Page({
  data: {
    userId: '',
    nickName: '道友',
    messages: [],
    inputText: '',
    hasMore: false,
    loading: false,
    myUserId: '',
    isOnline: false,
    lastOnlineText: '',
    isStranger: false,
    currentPage: 1,
    scrollToView: ''
  },

  onLoad: function(options) {
    var userId = options.userId || ''
    var nickName = decodeURIComponent(options.nickName || '道友')
    var myUserId = (app.globalData && app.globalData.userId) || ''

    this.setData({ userId: userId, nickName: nickName, myUserId: myUserId })
    wx.setNavigationBarTitle({ title: nickName })

    this.loadOnlineStatus()
    this.loadMessages()
    this.markRead()
  },

  onShow: function() {
    // 回来看的时候刷新在线状态
    this.loadOnlineStatus()
  },

  loadOnlineStatus: function() {
    var that = this
    wx.cloud.callFunction({
      name: 'message-center',
      data: { action: 'getOnlineStatus', params: { userId: this.data.userId } }
    }).then(function(res) {
      var result = res.result || {}
      if (result.ok) {
        var isOnline = !!result.isOnline
        var lastText = ''
        if (!isOnline && result.lastOnlineAt) {
          lastText = that.formatOnlineTime(result.lastOnlineAt)
        }
        that.setData({ isOnline: isOnline, lastOnlineText: lastText })
      }
    }).catch(function() {})
  },

  formatOnlineTime: function(ts) {
    if (!ts) return ''
    var diff = Date.now() - ts
    if (diff < 60000) return '刚刚在线'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前在线'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前在线'
    if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前在线'
    var d = new Date(ts)
    return (d.getMonth() + 1) + '/' + d.getDate() + ' 在线'
  },

  loadMessages: function(append) {
    var that = this
    var page = append ? this.data.currentPage + 1 : 1

    if (this.data.loading && append) return
    this.setData({ loading: true })

    var convId = [this.data.myUserId, this.data.userId].sort().join('_')

    wx.cloud.callFunction({
      name: 'message-center',
      data: {
        action: 'getMessages',
        params: {
          conversationId: convId,
          userId: this.data.myUserId,
          page: page,
          pageSize: 40
        }
      }
    }).then(function(res) {
      var result = res.result || {}
      if (result.ok) {
        var msgs = (result.messages || []).map(function(m) {
          return {
            _id: m._id,
            content: m.content,
            fromUserId: m.fromUserId,
            isMe: m.fromUserId === that.data.myUserId,
            createdAt: that.formatTime(m.createdAt),
            timestamp: m.createdAt,
            type: m.type || 'text'
          }
        })

        if (append && msgs.length > 0) {
          // 加载更早的消息，放到列表头部
          msgs = msgs.concat(that.data.messages)
          // 去重：按 _id 去重
          var seen = {}
          msgs = msgs.filter(function(m) {
            if (seen[m._id]) return false
            seen[m._id] = true
            return true
          })
        }

        that.setData({
          messages: msgs,
          hasMore: result.hasMore ||
            (append ? msgs.length !== that.data.messages.length : result.hasMore),
          loading: false,
          currentPage: page
        })

        if (!append) that.scrollToBottom()
      } else {
        that.setData({ loading: false })
      }
    }).catch(function() {
      that.setData({ loading: false })
    })

    // 加载会话信息
    if (!append) this.loadConvInfo()
  },

  loadConvInfo: function() {
    var that = this
    var convId = [this.data.myUserId, this.data.userId].sort().join('_')
    var db = app.globalData.db
    if (!db) return
    db.collection('conversations').where({ conversationId: convId }).limit(1).get().then(function(res) {
      if (res.data && res.data.length > 0 && res.data[0].isStranger) {
        that.setData({ isStranger: true })
      }
    }).catch(function() {})
  },

  scrollToBottom: function() {
    var that = this
    setTimeout(function() {
      var len = that.data.messages.length
      if (len > 0) that.setData({ scrollToView: 'msg-' + (len - 1) })
    }, 100)
  },

  formatTime: function(ts) {
    if (!ts) return ''
    var d = new Date(ts)
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  },

  markRead: function() {
    var convId = [this.data.myUserId, this.data.userId].sort().join('_')
    wx.cloud.callFunction({
      name: 'message-center',
      data: {
        action: 'markRead',
        params: { conversationId: convId, userId: this.data.myUserId }
      }
    }).catch(function() {})
  },

  onInputChange: function(e) {
    this.setData({ inputText: e.detail.value })
  },

  sendMessage: function() {
    var content = (this.data.inputText || '').trim()
    if (!content) return
    if (content.length > 1000) {
      app.showSystemToast('消息最多1000字')
      return
    }

    var that = this
    var now = Date.now()

    // 先检查权限
    wx.cloud.callFunction({
      name: 'message-center',
      data: {
        action: 'checkPermission',
        params: { fromUserId: this.data.myUserId, toUserId: this.data.userId }
      }
    }).then(function(permRes) {
      var permResult = permRes.result || {}
      if (!permResult.ok && permResult.blocked) {
        app.showSystemToast(permResult.reason || '无法发送消息')
        return Promise.reject('permission_blocked')
      }

      // 发送消息
      return wx.cloud.callFunction({
        name: 'message-center',
        data: {
          action: 'sendMessage',
          params: { fromUserId: that.data.myUserId, toUserId: that.data.userId, content: content }
        }
      })
    }).then(function(sendRes) {
      if (!sendRes) return
      var result = sendRes.result || {}
      if (result.ok) {
        var newMsgs = that.data.messages.concat([{
          _id: result.messageId || ('temp_' + now),
          content: content,
          fromUserId: that.data.myUserId,
          isMe: true,
          createdAt: '刚刚',
          timestamp: now,
          type: 'text'
        }])
        that.setData({ messages: newMsgs, inputText: '' })

        if (result.isStranger) that.setData({ isStranger: true })
        that.scrollToBottom()
      } else {
        app.showSystemToast(result.error || '发送失败')
      }
    }).catch(function(err) {
      if (err !== 'permission_blocked') app.showSystemToast('发送失败')
    })
  },

  /** 上拉加载更早的消息 */
  loadMoreMessages: function() {
    if (!this.data.hasMore || this.data.loading) return
    this.loadMessages(true)  // append = true
  },

  /** 长按消息举报/删除 */
  onMessageLongPress: function(e) {
    var msgId = e.currentTarget.dataset.id
    var isMe = e.currentTarget.dataset.isMe
    if (!msgId) return

    var that = this
    var itemList = ['举报']
    if (isMe) itemList.push('删除')

    wx.showActionSheet({
      itemList: itemList,
      success: function(res) {
        if (res.tapIndex === 0) {
          // 举报
          wx.cloud.callFunction({
            name: 'message-center',
            data: {
              action: 'reportMessage',
              params: {
                userId: (app.globalData && app.globalData.userId) || '',
                messageId: msgId,
                reason: '不当内容'
              }
            }
          }).then(function() { app.showSystemToast('已举报') }).catch(function() {})
        } else if (res.tapIndex === 1 && isMe) {
          // 删除自己的消息（本地移除）
          var msgs = that.data.messages.filter(function(m) { return m._id !== msgId })
          that.setData({ messages: msgs })
        }
      }
    })
  },

  /** 拉黑对方 */
  blockUser: function() {
    var that = this
    wx.showModal({
      title: '拉黑确认',
      content: '拉黑后将不会收到对方的消息提醒',
      success: function(res) {
        if (!res.confirm) return
        wx.cloud.callFunction({
          name: 'message-center',
          data: {
            action: 'blockUser',
            params: {
              userId: (app.globalData && app.globalData.userId) || '',
              targetUserId: that.data.userId
            }
          }
        }).then(function() {
          app.showSystemToast('已拉黑')
        }).catch(function() {})
      }
    })
  },

  /** 订阅新消息通知 */
  subscribeNotify: function() {
    if (app.requestSubscribeMsg) {
      app.requestSubscribeMsg(['TEMPLATE_NEW_MESSAGE'])
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' })
    }
  }
})
