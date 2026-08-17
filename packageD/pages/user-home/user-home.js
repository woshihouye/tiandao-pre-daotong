var app = getApp()
var lifeTemplate = require('../../../utils/life-template.js')

Page({
  data: {
    userId: '',
    isSelf: false,
    user: null,
    // 关注状态
    isFollowing: false,
    // 头像
    nickName: '',
    avatarText: '',
    // 境界
    realmName: '练气',
    realmStage: 1,
    // 定场诗
    signaturePoem: '',
    // 核心数据
    totalCultivation: 0,
    streakDays: 0,
    // 称号
    equippedTitle: [null, null],
    // 模板
    mainTemplate: null,
    sideTemplates: [],
    // 统计
    sportCount: 0,
    dietCount: 0,
    debuffCount: 0,
    // 隐私
    isRestricted: false,
    restrictedReason: '',
    // 状态
    loading: true,
    // 此人所创模板
    createdTemplates: [],
    createdLoading: false
  },

  onLoad: function(options) {
    var userId = options.userId || ''
    var myUserId = (app.globalData && app.globalData.userId) || ''
    var isSelf = userId === myUserId
    
    this.setData({ userId: userId, isSelf: isSelf })
    
    if (isSelf) {
      // 看自己，跳转到我的页
      wx.switchTab({ url: '/pages/profile/profile' })
      return
    }
    
    this.loadUserInfo()
    this.checkFollowStatus()
    this.loadCreatedTemplates()
  },

  loadUserInfo: function() {
    var that = this
    this.setData({ loading: true })

    if (!app.getUserPublicInfo) {
      this.setData({ loading: false })
      app.showSystemToast('功能暂不可用')
      return
    }

    app.getUserPublicInfo(this.data.userId).then(function(user) {
      if (!user) {
        that.setData({ loading: false })
        app.showSystemToast('用户不存在')
        return
      }

      // 隐私校验：profileVisibility === 'followers' 时检查是否互关
      var visibility = user.profileVisibility || 'public'
      var myUserId = (app.globalData && app.globalData.userId) || ''

      if (visibility === 'followers' || visibility === 'private') {
        // 检查是否为关注者
        that._checkProfileAccess(user, myUserId)
        return
      }

      that._renderUserProfile(user)
    }).catch(function() {
      that.setData({ loading: false })
      app.showSystemToast('加载失败')
    })
  },

  /** 检查主页访问权限 */
  _checkProfileAccess: function(user, myUserId) {
    var that = this
    // 需要查 user_follows 表验证访问者是否关注了该用户
    if (lifeTemplate.checkFollowStatus) {
      lifeTemplate.checkFollowStatus(user.userId).then(function(res) {
        if (!res.isFollowing) {
          that.setData({
            loading: false,
            nickName: user.nickName || '无名修士',
            avatarText: (user.nickName || '修').charAt(0),
            isRestricted: true,
            restrictedReason: '道友设置了仅关注者可查看主页'
          })
        } else {
          that._renderUserProfile(user)
        }
      }).catch(function() {
        // 降级：查不了就放行
        that._renderUserProfile(user)
      })
      return
    }

    // 降级：使用 message-center 查询
    wx.cloud.callFunction({
      name: 'message-center',
      data: { action: 'getFollowList', params: { userId: myUserId } }
    }).then(function(res) {
      var result = res.result || {}
      if (result.ok && result.list) {
        var isFollowing = result.list.some(function(f) { return f.targetUserId === user.userId })
        if (!isFollowing) {
          that.setData({
            loading: false,
            nickName: user.nickName || '无名修士',
            avatarText: (user.nickName || '修').charAt(0),
            isRestricted: true,
            restrictedReason: '道友设置了仅关注者可查看主页'
          })
          return
        }
      }
      that._renderUserProfile(user)
    }).catch(function() {
      that._renderUserProfile(user)
    })
  },

  /** 渲染用户主页 */
  _renderUserProfile: function(user) {
    var that = this
    // 查近7天统计
    this.loadUserStats(user)

    this.setData({
      user: user,
      nickName: user.nickName || '无名修士',
      avatarText: (user.nickName || '修').charAt(0),
      signaturePoem: user.signaturePoem || '',
      totalCultivation: user.totalCultivation || 0,
      streakDays: user.streakDays || 0,
      mainTemplate: user.mainTemplate,
      sideTemplates: user.sideTemplates || [],
      isRestricted: false,
      loading: false
    })

    // 加载境界
    if (app.getRealmByScore) {
      var realm = app.getRealmByScore(user.totalCultivation || 0)
      if (realm) {
        that.setData({ realmName: realm.name || '炼气', realmStage: realm.stage || 1 })
      }
    }
  },

  loadUserStats: function(user) {
    var that = this
    var db = app.globalData.db
    if (!db) return

    var today = app.getTodayDate ? app.getTodayDate() : new Date().toISOString().slice(0, 10)
    var weekAgo = app.getDaysAgo ? app.getDaysAgo(6) : ''
    if (!weekAgo) {
      var d = new Date()
      d.setDate(d.getDate() - 6)
      weekAgo = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    }

    db.collection('records')
      .where({ userId: user.userId, date: db.command.gte(weekAgo).and(db.command.lte(today)) })
      .get()
      .then(function(res) {
        var records = res.data || []
        var counts = { sport: 0, diet: 0, debuff: 0 }
        records.forEach(function(r) {
          if (r.category === 'sport') counts.sport++
          else if (r.category === 'diet') counts.diet++
          else if (r.category === 'debuff') counts.debuff++
        })
        that.setData({
          sportCount: counts.sport,
          dietCount: counts.diet,
          debuffCount: counts.debuff
        })
      }).catch(function() {})

    // 境界计算
    if (app.getRealmByScore) {
      var realm = app.getRealmByScore(user.totalCultivation || 0)
      if (realm) {
        that.setData({ realmName: realm.name || '炼气', realmStage: realm.stage || 1 })
      }
    }
  },

  checkFollowStatus: function() {
    var myUserId = (app.globalData && app.globalData.userId) || ''
    if (!myUserId) return
    var that = this

    // 优先使用 template-manager
    if (lifeTemplate.checkFollowStatus) {
      lifeTemplate.checkFollowStatus(this.data.userId).then(function(res) {
        that.setData({ isFollowing: res.isFollowing || false })
      }).catch(function() {})
      return
    }

    // 降级：使用 message-center
    wx.cloud.callFunction({
      name: 'message-center',
      data: { action: 'getFollowList', params: { userId: myUserId } }
    }).then(function(res) {
      var result = res.result || {}
      if (result.ok && result.list) {
        var isFollowing = result.list.some(function(f) { return f.targetUserId === that.data.userId })
        that.setData({ isFollowing: isFollowing })
      }
    }).catch(function() {})
  },

  // >>> 关注/取消（使用 template-manager）
  toggleFollow: function() {
    var that = this
    var myUserId = (app.globalData && app.globalData.userId) || ''
    if (!myUserId) return

    if (lifeTemplate.toggleFollow) {
      lifeTemplate.toggleFollow(this.data.userId).then(function(res) {
        that.setData({ isFollowing: res.following })
        app.showSystemToast(res.following ? '已关注' : '已取消关注', 'success')
        // 触发事件
        if (app.emitAppEvent) {
          app.emitAppEvent('follow-changed', { targetUserId: that.data.userId, following: res.following })
        }
      }).catch(function() {
        app.showSystemToast('操作失败')
      })
      return
    }

    // 降级：使用 message-center
    wx.cloud.callFunction({
      name: 'message-center',
      data: { action: 'toggleFollow', params: { userId: myUserId, targetUserId: this.data.userId } }
    }).then(function(res) {
      var result = res.result || {}
      if (result.ok) {
        that.setData({ isFollowing: result.following })
        app.showSystemToast(result.following ? '已关注' : '已取消关注', 'success')
      }
    }).catch(function() {
      app.showSystemToast('操作失败')
    })
  },

  // >>> 私信
  sendMessage: function() {
    if (!this.data.user) return
    wx.navigateTo({
      url: '/packageD/pages/chat-detail/chat-detail?userId=' + this.data.userId + '&nickName=' + (this.data.nickName || '道友')
    })
  },

  // >>> 此人所创
  loadCreatedTemplates: function() {
    var that = this
    var targetUserId = this.data.userId
    if (!targetUserId) return
    this.setData({ createdLoading: true })
    wx.cloud.callFunction({
      name: 'template-manager',
      data: {
        action: 'getUserPublished',
        targetUserId: targetUserId,
        page: 1,
        pageSize: 20
      },
      success: function(res) {
        var r = res.result || {}
        if (r.ok) {
          that.setData({
            createdTemplates: r.templates || [],
            createdLoading: false
          })
        } else {
          that.setData({ createdLoading: false })
          wx.showToast({ title: r.error || '加载失败', icon: 'none' })
        }
      },
      fail: function() {
        that.setData({ createdLoading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // >>> 模板详情
  goToTemplate: function(e) {
    var id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: '/packageC/pages/template-detail/template-detail?id=' + id })
  },

  // >>> 举报
  reportUser: function() {
    var that = this
    wx.showActionSheet({
      itemList: ['举报不当内容', '拉黑此用户'],
      success: function(res) {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '举报道友',
            editable: true,
            placeholderText: '请描述举报原因',
            success: function(modalRes) {
              if (modalRes.confirm && modalRes.content) {
                app.showSystemToast('举报已提交')
              }
            }
          })
        } else if (res.tapIndex === 1) {
          wx.showModal({
            title: '拉黑确认',
            content: '拉黑后将无法收到对方的私信，确定？',
            success: function(modalRes) {
              if (modalRes.confirm) {
                wx.cloud.callFunction({
                  name: 'message-center',
                  data: { action: 'blockUser', params: { userId: (app.globalData && app.globalData.userId) || '', targetUserId: that.data.userId } }
                }).then(function(res2) {
                  app.showSystemToast('已拉黑')
                }).catch(function() { app.showSystemToast('操作失败') })
              }
            }
          })
        }
      }
    })
  }
})
