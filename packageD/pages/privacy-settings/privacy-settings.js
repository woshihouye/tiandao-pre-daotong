var app = getApp()
Page({
  data: {
    msgPermission: 'all',
    profileVisibility: 'public'
  },
  onShow: function() {
    this.loadSettings()
  },
  loadSettings: function() {
    var p = (app.globalData && app.globalData.userProfile) || {}
    this.setData({
      msgPermission: p.msgPermission || 'all',
      profileVisibility: p.profileVisibility || 'public'
    })
  },
  changeMsgPerm: function(e) {
    var val = e.currentTarget.dataset.value
    this.setData({ msgPermission: val })
    this.saveSettings({ msgPermission: val })
  },
  changeProfileVis: function(e) {
    var val = e.currentTarget.dataset.value
    this.setData({ profileVisibility: val })
    this.saveSettings({ profileVisibility: val })
  },
  saveSettings: function(patch) {
    var that = this
    if (app.syncUserProfile) app.syncUserProfile(patch)
    var db = app.globalData.db
    if (!db) return
    app.ensureUserProfile().then(function(profile) {
      if (profile && profile._id) {
        db.collection('users').doc(profile._id).update({ data: Object.assign({}, patch, { updatedAt: Date.now() }) })
      }
    }).catch(function() {})
  },
  goToBlacklist: function() {
    wx.showModal({ title: '黑名单', editable: true, placeholderText: '输入用户ID添加黑名单', success: function(res) {
      if (res.confirm && res.content) {
        var bl = wx.getStorageSync('tiandao_blacklist') || []
        if (bl.indexOf(res.content) === -1) {
          bl.push(res.content)
          wx.setStorageSync('tiandao_blacklist', bl)
          app.showSystemToast('已添加')
        } else { app.showSystemToast('已在黑名单中') }
      }
    }})
  },
  goToFollowList: function() {
    wx.navigateTo({ url: '/packageD/pages/follow-list/follow-list?type=follow' })
  },
  goToFansList: function() {
    wx.navigateTo({ url: '/packageD/pages/follow-list/follow-list?type=fans' })
  }
})
