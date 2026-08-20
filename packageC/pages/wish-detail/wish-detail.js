// 许愿详情页
var app = getApp()

function formatTime(date) {
  if (!date) return ''
  var d = (typeof date === 'string' || typeof date === 'number') ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  var pad = function(n) { return n < 10 ? '0' + n : '' + n }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

Page({
  data: {
    wishId: '',
    wish: null,
    isOwner: false,
    isLiked: false,
    isFavorited: false,
    comments: [],
    commentPage: 1,
    commentPageSize: 20,
    commentHasMore: false,
    commentTotal: 0,
    commentLoading: false,
    commentInput: '',
    userNickName: '',
    userAvatar: '',
    myUserId: ''
  },

  onLoad: function(options) {
    var wishId = options.wishId
    if (!wishId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    var up = (app.globalData && app.globalData.userProfile) || {}
    this.setData({
      wishId: wishId,
      userNickName: up.nickName || '',
      userAvatar: up.avatarUrl || '',
      myUserId: (app.globalData && app.globalData.userId) || ''
    })
    this.applyTheme()
    this._loadDetail()
    this._loadComments(true)
  },

  onShow: function() {
    this.applyTheme()
  },

  applyTheme: function() {
    var tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  onPullDownRefresh: function() {
    var that = this
    this._loadDetail(function() {
      that._loadComments(true, function() {
        try { wx.stopPullDownRefresh() } catch(e) {}
      })
    })
  },

  onReachBottom: function() {
    if (!this.data.commentHasMore || this.data.commentLoading) return
    this.setData({ commentPage: this.data.commentPage + 1 })
    this._loadComments(false)
  },

  _loadDetail: function(cb) {
    var that = this
    wx.cloud.callFunction({
      name: 'wish-manager',
      data: { action: 'getWishDetail', wishId: this.data.wishId },
      success: function(res) {
        var r = res.result || {}
        if (r.ok) {
          var openid = (app.globalData && app.globalData.userId) || ''
          that.setData({
            wish: r.wish,
            isOwner: !!(r.wish && r.wish.userId && openid && r.wish.userId === openid),
            isLiked: !!r.isLiked,
            isFavorited: !!r.isFavorited
          })
        } else {
          wx.showToast({ title: r.error || '加载失败', icon: 'none' })
        }
        if (cb) cb()
      },
      fail: function() {
        wx.showToast({ title: '网络错误', icon: 'none' })
        if (cb) cb()
      }
    })
  },

  _loadComments: function(reset, cb) {
    if (this.data.commentLoading) { if (cb) cb(); return }
    var page = reset ? 1 : this.data.commentPage
    var that = this
    this.setData({ commentLoading: true })
    wx.cloud.callFunction({
      name: 'wish-manager',
      data: {
        action: 'getWishComments',
        wishId: this.data.wishId,
        page: page,
        pageSize: this.data.commentPageSize
      },
      success: function(res) {
        var r = res.result || {}
        if (r.ok) {
          var list = r.comments || []
          list.forEach(function(c) { c._timeText = formatTime(c.createdAt) })
          var newList = reset ? list : that.data.comments.concat(list)
          that.setData({
            comments: newList,
            commentTotal: r.total || 0,
            commentHasMore: !!r.hasMore,
            commentPage: reset ? 1 : page,
            commentLoading: false
          })
        } else {
          that.setData({ commentLoading: false })
          wx.showToast({ title: r.error || '加载失败', icon: 'none' })
        }
        if (cb) cb()
      },
      fail: function() {
        that.setData({ commentLoading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        if (cb) cb()
      }
    })
  },

  onLike: function() {
    var that = this
    wx.cloud.callFunction({
      name: 'wish-manager',
      data: { action: 'likeWish', wishId: this.data.wishId },
      success: function(res) {
        var r = res.result || {}
        if (r.ok) {
          var key = 'wish.likeCount'
          var obj = {}
          obj[key] = typeof r.likeCount === 'number' ? r.likeCount : (that.data.wish ? (that.data.wish.likeCount || 0) : 0)
          obj.isLiked = !!r.liked
          that.setData(obj)
          wx.showToast({ title: r.liked ? '已点赞' : '已取消', icon: 'none' })
        } else {
          wx.showToast({ title: r.error || '操作失败', icon: 'none' })
        }
      },
      fail: function() { wx.showToast({ title: '网络错误', icon: 'none' }) }
    })
  },

  onFav: function() {
    var that = this
    wx.cloud.callFunction({
      name: 'wish-manager',
      data: { action: 'favWish', wishId: this.data.wishId },
      success: function(res) {
        var r = res.result || {}
        if (r.ok) {
          var key = 'wish.favCount'
          var obj = {}
          obj[key] = typeof r.favCount === 'number' ? r.favCount : (that.data.wish ? (that.data.wish.favCount || 0) : 0)
          obj.isFavorited = !!r.favorited
          that.setData(obj)
          wx.showToast({ title: r.favorited ? '已收藏' : '已取消', icon: 'none' })
        } else {
          wx.showToast({ title: r.error || '操作失败', icon: 'none' })
        }
      },
      fail: function() { wx.showToast({ title: '网络错误', icon: 'none' }) }
    })
  },

  onDeleteWish: function() {
    var that = this
    wx.showModal({
      title: '确认删除',
      content: '删除后此许愿及其评论将不可恢复',
      confirmColor: '#ef4444',
      success: function(res) {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中', mask: true })
        wx.cloud.callFunction({
          name: 'wish-manager',
          data: { action: 'deleteWish', wishId: that.data.wishId },
          success: function(r2) {
            wx.hideLoading()
            var r = r2.result || {}
            if (r.ok) {
              wx.showToast({ title: '已删除', icon: 'success' })
              setTimeout(function() { wx.navigateBack() }, 600)
            } else {
              wx.showToast({ title: r.error || '删除失败', icon: 'none' })
            }
          },
          fail: function() {
            wx.hideLoading()
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        })
      }
    })
  },

  onFulfillWish: function() {
    var that = this
    wx.showModal({
      title: '助人圆满',
      content: '确定帮 TA 实现这个愿望？修行之道，助人即助己。',
      confirmText: '助成',
      success: function(res) {
        if (!res.confirm) return
        wx.showLoading({ title: '助成中...', mask: true })
        wx.cloud.callFunction({
          name: 'wish-manager',
          data: {
            action: 'fulfillWish',
            wishId: that.data.wish.wishId,
            nickName: ((app.globalData.userProfile && app.globalData.userProfile.nickName) || '')
          },
          success: function(r) {
            wx.hideLoading()
            var rs = r.result || {}
            if (rs.ok) {
              wx.showToast({ title: '愿力已成，功德自生', icon: 'success' })
              that._loadDetail()
            } else {
              wx.showToast({ title: rs.error || '助成失败', icon: 'none' })
            }
          },
          fail: function() { wx.hideLoading(); wx.showToast({ title: '网络错误', icon: 'none' }) }
        })
      }
    })
  },

  onCommentInput: function(e) {
    this.setData({ commentInput: e.detail.value })
  },

  onSendComment: function() {
    var content = (this.data.commentInput || '').trim()
    if (!content || content.length < 1) {
      wx.showToast({ title: '请输入评论', icon: 'none' })
      return
    }
    if (content.length > 500) {
      wx.showToast({ title: '评论最多500字', icon: 'none' })
      return
    }
    var that = this
    wx.showLoading({ title: '发送中', mask: true })
    wx.cloud.callFunction({
      name: 'wish-manager',
      data: {
        action: 'addWishComment',
        wishId: this.data.wishId,
        content: content,
        nickName: this.data.userNickName || '',
        avatar: this.data.userAvatar || ''
      },
      success: function(res) {
        wx.hideLoading()
        var r = res.result || {}
        if (r.ok) {
          that.setData({ commentInput: '' })
          wx.showToast({ title: '评论成功', icon: 'success' })
          // 主表 commentCount + 1
          var cur = that.data.wish ? (that.data.wish.commentCount || 0) : 0
          var obj = {}
          obj['wish.commentCount'] = cur + 1
          that.setData(obj)
          that._loadComments(true)
        } else {
          wx.showToast({ title: r.error || '发送失败', icon: 'none' })
        }
      },
      fail: function() {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  goToUserHome: function(e) {
    var userId = e.currentTarget.dataset.userId
    if (userId) wx.navigateTo({ url: '/packageD/pages/user-home/user-home?userId=' + userId })
  },

  preventBubble: function() {}
})
