var app = getApp()
var lifeTemplate = require('../../../utils/life-template.js')

Page({
  data: {
    type: 'follow', // 'follow' | 'fans'
    list: [],
    loading: false,
    title: '我的关注'
  },
  onLoad: function(options) {
    var type = options.type || 'follow'
    this.setData({ type: type, title: type === 'follow' ? '我的关注' : '我的粉丝' })
    wx.setNavigationBarTitle({ title: this.data.title })
    this.loadList()
  },
  loadList: function() {
    var that = this
    var isFollow = this.data.type === 'follow'
    var userId = (app.globalData && app.globalData.userId) || ''

    this.setData({ loading: true })

    // 使用 template-manager 云函数
    var action = isFollow ? 'getFollowing' : 'getFollowers'

    if (lifeTemplate.getFollowing && lifeTemplate.getFollowers) {
      var fetcher = isFollow ? lifeTemplate.getFollowing : lifeTemplate.getFollowers
      fetcher(userId, 1, 50).then(function(res) {
        var data = isFollow ? (res.following || []) : (res.followers || [])
        var list = data.map(function(f) {
          return {
            userId: isFollow ? f.followingId : f.followerId,
            time: f.createdAt
          }
        })
        that.setData({ list: list, loading: false })
        that.loadUserNames(list)
      }).catch(function() {
        that.setData({ loading: false })
      })
      return
    }

    // 降级：使用 message-center
    wx.cloud.callFunction({
      name: 'message-center',
      data: { action: isFollow ? 'getFollowList' : 'getFansList', params: { userId: userId } }
    }).then(function(res) {
      var result = res.result || {}
      if (result.ok) {
        var list = (result.list || []).map(function(f) {
          return { userId: isFollow ? f.targetUserId : f.userId, time: f.createdAt }
        })
        that.setData({ list: list, loading: false })
        that.loadUserNames(list)
      } else { that.setData({ loading: false }) }
    }).catch(function() { that.setData({ loading: false }) })
  },
  loadUserNames: function(list) {
    var db = app.globalData.db
    if (!db || !list.length) return
    var userIds = list.map(function(f) { return f.userId })
    var that = this
    db.collection('users').where({ userId: db.command.in(userIds) }).get().then(function(res) {
      var userMap = {}
      ;(res.data || []).forEach(function(u) { userMap[u.userId] = u.nickName || '无名修士' })
      var newList = that.data.list.map(function(f) {
        f.nickName = userMap[f.userId] || '无名修士'
        return f
      })
      that.setData({ list: newList })
    }).catch(function() {})
  },
  goToUserHome: function(e) {
    var userId = e.currentTarget.dataset.userId
    if (userId) wx.navigateTo({ url: '/packageD/pages/user-home/user-home?userId=' + userId })
  }
})
