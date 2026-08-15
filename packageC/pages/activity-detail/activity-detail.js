// 单品活动详情页（修行库货架 → 单品详情）
var app = getApp()
var Cart = require('../../../utils/cart.js')

Page({
  data: {
    act: null,
    iconText: '',
    badges: [],
    isPublicLibrary: false,
    isAdmin: false
  },

  onLoad: function(options) {
    var act = null
    try {
      act = JSON.parse(decodeURIComponent(options.data || ''))
    } catch (e) {
      act = null
    }

    if (!act) {
      wx.showToast({ title: '活动不存在', icon: 'none' })
      return
    }

    var iconText = (act.name || '活').charAt(0)
    var badges = []
    if (act.sourceType === 'referenced') {
      badges.push({ type: 'ref', label: '引' })
    } else if (act._isMetaCard) {
      badges.push({ type: 'meta', label: '元' })
    } else if (act.isOfficial) {
      badges.push({ type: 'official', label: '官' })
    } else if (act.isPublic) {
      badges.push({ type: 'public', label: '公' })
    } else if (act.isCustom) {
      badges.push({ type: 'custom', label: '自' })
    }

    var isAdmin = false
    if (app.globalData && app.globalData.userProfile) {
      var profile = app.globalData.userProfile
      if (profile.role === 'admin' || profile.isAdmin || profile.canEdit) {
        isAdmin = true
      }
    }

    this.setData({
      act: act,
      iconText: iconText,
      badges: badges,
      isPublicLibrary: !!act.isPublicLibrary,
      isAdmin: isAdmin
    })
  },

  /** 底部「加入购物车」 */
  addToCart: function() {
    var act = this.data.act
    if (!act) return
    var res = Cart.addToCart(act)
    if (res.ok) {
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    } else if (res.reason === 'duplicate') {
      wx.showToast({ title: '已在购物车', icon: 'none' })
    }
  },

  preventBubble: function() {}
})
