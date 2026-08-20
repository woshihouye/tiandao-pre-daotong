// 人生模板列表页 — v2 云端广场
var app = getApp()
var lifeTemplate = require('../../utils/life-template.js')
var templateConfig = require('../../utils/template-config.js')

/** 自定义模板存储 key */
var CUSTOM_TMPL_KEY = 'tiandao_custom_templates_'

Page({
  data: {
    // 云端广场
    cloudTemplates: [],
    cloudTotal: 0,
    cloudHasMore: true,
    cloudPage: 1,
    cloudLoading: false,
    cloudSortBy: 'new',
    cloudSortKey: 'new',
    cloudType: 'all',
    cloudCategory: '',
    cloudSubcategory: '',
    cloudKeyword: '',
    // 结缘滑动卡片
    deckCards: [],
    deckIndex: 0,
    // 广场筛选配置（template-config.js）
    sortTabs: templateConfig.sortTabs,
    categoryTabs: templateConfig.categoryTabs,
    // 标签页切换
    activeTab: 'plaza', // 'mytmpl' | 'plaza' | 'wish'
    // 许愿池
    wishes: [],
    wishPage: 1,
    wishPageSize: 20,
    wishSortBy: 'hot', // 'hot' | 'new'
    wishHasMore: false,
    wishTotal: 0,
    wishLoading: false,
    wishContent: '',
    wishUserNickName: '',
    wishUserAvatar: '',
    // 自建模板
    customTemplates: [],
    customTemplatesFiltered: [],
    customFilterType: 'all', // 'all' | 'daily' | 'weekly' | 'pool'
    hasCustomTemplates: false,
    showTypeSheet: false,
    showTemplateMenu: false,
    menuTemplate: null
  },

  onShow: function() {
    this.applyTheme()
    this.loadCustomTemplates()
    var up = (app.globalData && app.globalData.userProfile) || {}
    this.setData({
      wishUserNickName: up.nickName || '',
      wishUserAvatar: up.avatarUrl || ''
    })
    if (this.data.activeTab === 'plaza') {
      this.loadCloudTemplates(true)
    }
    if (this.data.activeTab === 'wish' && this.data.wishes.length === 0) {
      this._loadWishes(true)
    }
  },

  applyTheme: function() {
    var tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  // ==================== 自建模板 ====================

  _getCustomStorageKey: function() {
    var uid = (app.globalData && app.globalData.userId) || 'default'
    return CUSTOM_TMPL_KEY + uid
  },

  loadCustomTemplates: function() {
    var key = this._getCustomStorageKey()
    var list = []
    try { list = wx.getStorageSync(key) || [] } catch(e) {}
    this.setData({ customTemplates: list, hasCustomTemplates: list.length > 0 })
    this._filterCustomTemplates()
  },

  _filterCustomTemplates: function() {
    var list = this.data.customTemplates
    var ft = this.data.customFilterType
    if (ft === 'all') {
      this.setData({ customTemplatesFiltered: list })
    } else {
      this.setData({
        customTemplatesFiltered: list.filter(function(t) { return t.type === ft })
      })
    }
  },

  filterCustomType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({ customFilterType: type })
    this._filterCustomTemplates()
  },

  /** 弹出类型选择面板 */
  openTypeSheet: function() {
    this.setData({ showTypeSheet: true })
  },

  closeTypeSheet: function() {
    this.setData({ showTypeSheet: false })
  },

  /** 进入模板构建页 */
  goToTemplateBuilder: function(e) {
    var type = e.currentTarget.dataset.type || 'daily'
    this.setData({ showTypeSheet: false })
    wx.navigateTo({
      url: '/packageC/pages/template-builder/template-builder?type=' + type
    })
  },

  /** 编辑已有模板 */
  editCustomTemplate: function(e) {
    var id = e.currentTarget.dataset.id
    this.setData({ showTemplateMenu: false })
    wx.navigateTo({
      url: '/packageC/pages/template-builder/template-builder?id=' + id
    })
  },

  /** 启用模板 */
  enableTemplate: function(e) {
    var id = this.data.menuTemplate ? this.data.menuTemplate.id : e.currentTarget.dataset.id
    var templates = this.data.customTemplates
    var found = null
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === id) { found = templates[i]; break }
    }
    if (!found) return

    // 存储到全局
    app._activeCustomTemplate = found
    try { wx.setStorageSync('tiandao_active_custom_template', found) } catch(e) {}

    this.setData({ showTemplateMenu: false })
    wx.showToast({ title: '已启用「' + found.name + '」', icon: 'success' })
  },

  /** 删除模板 */
  deleteCustomTemplate: function() {
    var that = this
    var id = this.data.menuTemplate ? this.data.menuTemplate.id : ''
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: function(res) {
        if (!res.confirm) return
        var list = that.data.customTemplates
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) { list.splice(i, 1); break }
        }
        var key = that._getCustomStorageKey()
        try { wx.setStorageSync(key, list) } catch(e) {}
        // 如果删除的是当前启用的模板，清除
        if (app._activeCustomTemplate && app._activeCustomTemplate.id === id) {
          app._activeCustomTemplate = null
          try { wx.removeStorageSync('tiandao_active_custom_template') } catch(e) {}
        }
        that.setData({ showTemplateMenu: false, customTemplates: list, hasCustomTemplates: list.length > 0 })
        that._filterCustomTemplates()
      }
    })
  },

  /** 另存为新模板 */
  duplicateCustomTemplate: function() {
    var id = this.data.menuTemplate ? this.data.menuTemplate.id : ''
    var templates = this.data.customTemplates
    var found = null
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === id) { found = templates[i]; break }
    }
    if (!found) return
    var copy = JSON.parse(JSON.stringify(found))
    copy.id = 'ctmpl_' + Date.now()
    copy.name = (copy.name || '模板') + '（副本）'
    copy.createdAt = Date.now()
    templates.unshift(copy)
    var key = this._getCustomStorageKey()
    try { wx.setStorageSync(key, templates) } catch(e) {}
    this.setData({ showTemplateMenu: false, customTemplates: templates, hasCustomTemplates: true })
    this._filterCustomTemplates()
    wx.showToast({ title: '已另存为副本', icon: 'success' })
  },

  /** 长按/更多按钮呼出菜单 */
  showTemplateActions: function(e) {
    var id = e.currentTarget.dataset.id
    var templates = this.data.customTemplates
    var found = null
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === id) { found = templates[i]; break }
    }
    if (!found) return
    this.setData({ showTemplateMenu: true, menuTemplate: found })
  },

  closeTemplateMenu: function() {
    this.setData({ showTemplateMenu: false, menuTemplate: null })
  },

  getTemplateTypeLabel: function(type) {
    if (type === 'daily') return '日模板'
    if (type === 'weekly') return '周模板'
    if (type === 'pool') return '合道模板'
    return type
  },

  getTemplateActivityCount: function(template) {
    if (template.type === 'daily') {
      var count = 0
      var slots = template.timeSlots || []
      for (var i = 0; i < slots.length; i++) { count += (slots[i].activities || []).length }
      return count
    }
    if (template.type === 'weekly') {
      var c = 0
      var wd = template.weekData || {}
      var days = ['mon','tue','wed','thu','fri','sat','sun']
      for (var d = 0; d < days.length; d++) {
        var day = wd[days[d]] || {}
        c += (day.morning || []).length + (day.afternoon || []).length + (day.evening || []).length
      }
      return c
    }
    if (template.type === 'pool') {
      return (template.poolActivities || []).length
    }
    return 0
  },

  preventBubble: function() {},

  // >>> 标签切换
  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    if (tab !== 'mytmpl' && tab !== 'plaza' && tab !== 'wish') return
    this.setData({ activeTab: tab })
    if (tab === 'plaza') {
      this.loadCloudTemplates(true)
    }
    if (tab === 'wish' && this.data.wishes.length === 0) {
      this._loadWishes(true)
    }
  },

  // ==================== 许愿池 Tab ====================

  _loadWishes: function(reset) {
    if (this.data.wishLoading) return
    var page = reset ? 1 : this.data.wishPage
    var that = this
    this.setData({ wishLoading: true })
    wx.cloud.callFunction({
      name: 'wish-manager',
      data: {
        action: 'listWishes',
        page: page,
        pageSize: this.data.wishPageSize,
        sortBy: this.data.wishSortBy
      },
      success: function(res) {
        var r = res.result || {}
        if (r.ok) {
          var list = r.wishes || []
          var newList = reset ? list : that.data.wishes.concat(list)
          that.setData({
            wishes: newList,
            wishTotal: r.total || 0,
            wishHasMore: !!r.hasMore,
            wishPage: reset ? 1 : page,
            wishLoading: false
          })
        } else {
          that.setData({ wishLoading: false })
          wx.showToast({ title: r.error || '加载失败', icon: 'none' })
        }
      },
      fail: function() {
        that.setData({ wishLoading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      },
      complete: function() {
        try { wx.stopPullDownRefresh() } catch(e) {}
      }
    })
  },

  onSwitchWishSort: function(e) {
    var sort = e.currentTarget.dataset.sort
    if (this.data.wishSortBy === sort) return
    this.setData({ wishSortBy: sort, wishes: [], wishPage: 1 })
    this._loadWishes(true)
  },

  onWishInput: function(e) {
    this.setData({ wishContent: e.detail.value })
  },

  onPublishWish: function() {
    var content = (this.data.wishContent || '').trim()
    if (!content || content.length < 1) {
      wx.showToast({ title: '请输入许愿内容', icon: 'none' })
      return
    }
    if (content.length > 100) {
      wx.showToast({ title: '许愿最多100字', icon: 'none' })
      return
    }
    var that = this
    wx.showLoading({ title: '提交中', mask: true })
    wx.cloud.callFunction({
      name: 'wish-manager',
      data: {
        action: 'publishWish',
        content: content,
        nickName: this.data.wishUserNickName || '',
        avatar: this.data.wishUserAvatar || ''
      },
      success: function(res) {
        wx.hideLoading()
        var r = res.result || {}
        if (r.ok) {
          that.setData({ wishContent: '' })
          wx.showToast({ title: '许愿成功', icon: 'success' })
          that._loadWishes(true)
        } else {
          wx.showToast({ title: r.error || '提交失败', icon: 'none' })
        }
      },
      fail: function() {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  onLikeWish: function(e) {
    var that = this
    var wishId = e.currentTarget.dataset.id
    var idx = -1
    for (var i = 0; i < this.data.wishes.length; i++) {
      if (this.data.wishes[i].wishId === wishId) { idx = i; break }
    }
    if (idx < 0) return
    wx.cloud.callFunction({
      name: 'wish-manager',
      data: { action: 'likeWish', wishId: wishId },
      success: function(res) {
        var r = res.result || {}
        if (r.ok) {
          var key1 = 'wishes[' + idx + '].likeCount'
          var key2 = 'wishes[' + idx + ']._isLiked'
          var obj = {}
          obj[key1] = typeof r.likeCount === 'number' ? r.likeCount : (that.data.wishes[idx].likeCount || 0)
          obj[key2] = !!r.liked
          that.setData(obj)
          wx.showToast({ title: r.liked ? '已点赞' : '已取消', icon: 'none' })
        } else {
          wx.showToast({ title: r.error || '操作失败', icon: 'none' })
        }
      },
      fail: function() { wx.showToast({ title: '网络错误', icon: 'none' }) }
    })
  },

  goWishDetail: function(e) {
    var wishId = e.currentTarget.dataset.id
    if (!wishId) return
    wx.navigateTo({ url: '/packageC/pages/wish-detail/wish-detail?wishId=' + wishId })
  },

  goToUserHome: function(e) {
    var userId = e.currentTarget.dataset.userId
    if (userId) wx.navigateTo({ url: '/packageD/pages/user-home/user-home?userId=' + userId })
  },

  onPullDownRefresh: function() {
    if (this.data.activeTab === 'plaza') {
      this.loadCloudTemplates(true)
      return
    }
    if (this.data.activeTab === 'wish') {
      this._loadWishes(true)
      return
    }
    this.loadCustomTemplates()
    try { wx.stopPullDownRefresh() } catch(e) {}
  },

  onReachBottom: function() {
    if (this.data.activeTab === 'plaza') {
      this.loadMoreCloud()
      return
    }
    if (this.data.activeTab === 'wish') {
      if (!this.data.wishHasMore || this.data.wishLoading) return
      this.setData({ wishPage: this.data.wishPage + 1 })
      this._loadWishes(false)
    }
  },

  // >>> 云端广场
  loadCloudTemplates: function(reset) {
    if (this.data.cloudLoading) return
    var page = reset ? 1 : this.data.cloudPage
    var that = this
    this.setData({ cloudLoading: true })

    // 先用本地 fallback
    if (!lifeTemplate.fetchCloudTemplates) {
      this.loadCloudFallback()
      return
    }

    var userId = (app.globalData && app.globalData.userId) || ''
    lifeTemplate.fetchCloudTemplates({
      type: this.data.cloudType,
      sortBy: this.data.cloudSortBy,
      category: this.data.cloudCategory || undefined,
      subcategory: this.data.cloudSubcategory || undefined,
      keyword: this.data.cloudKeyword || undefined,
      page: page,
      pageSize: 20,
      userId: userId
    }).then(function(res) {
      var list = res.templates || []
      var newList = reset ? list : that.data.cloudTemplates.concat(list)
      that.setData({
        cloudTemplates: newList,
        cloudTotal: res.total || 0,
        cloudHasMore: list.length >= 20,
        cloudPage: reset ? 1 : page,
        cloudLoading: false,
        deckIndex: reset ? 0 : that.data.deckIndex
      }, function() {
        that.buildDeck()
      })
    }).catch(function() {
      that.loadCloudFallback()
    })
  },

  // 结缘滑动卡片：构建当前 3 张展示
  buildDeck: function() {
    var list = this.data.cloudTemplates || []
    var i = this.data.deckIndex || 0
    if (i >= list.length) { this.setData({ deckCards: [] }); return }
    var cards = []
    for (var k = 0; k < 3 && i + k < list.length; k++) {
      var t = list[i + k]
      cards.push(this._formatDeckCard(t, k))
    }
    this.setData({ deckCards: cards })
  },

  _formatDeckCard: function(t, k) {
    var offsets = [
      'translate(0px, 0px) scale(1) rotate(0deg)',
      'translate(-30px, 16px) scale(0.92) rotate(-3deg)',
      'translate(30px, 32px) scale(0.85) rotate(3deg)'
    ]
    var themeBgMap = {
      'theme-xianjie': 'linear-gradient(160deg, #6a543a 0%, #4a3a26 40%, #8a6a48 70%, #a8885e 100%)',
      'theme-hongchen': 'linear-gradient(160deg, #2c4a3e 0%, #1a3a30 40%, #3a5a40 70%, #6a7a4a 100%)',
      'theme-diyu': 'linear-gradient(160deg, #2e2e32 0%, #1a1a1e 40%, #3a3a3e 70%, #4a4a52 100%)',
      'theme-xiuxing': 'linear-gradient(160deg, #2c4a3e 0%, #1a3a30 40%, #3a5a40 70%, #6a7a4a 100%)',
      'theme-fresh': 'linear-gradient(160deg, #6a543a 0%, #4a3a26 40%, #8a6a48 70%, #a8885e 100%)',
      'theme-dusk': 'linear-gradient(160deg, #2c4a3e 0%, #1a3a30 40%, #3a5a40 70%, #6a7a4a 100%)',
      'theme-gloom': 'linear-gradient(160deg, #2e2e32 0%, #1a1a1e 40%, #3a3a3e 70%, #4a4a52 100%)',
      'theme-light-fixed': 'linear-gradient(160deg, #2c4a3e 0%, #1a3a30 40%, #3a5a40 70%, #6a7a4a 100%)'
    }
    var bg = themeBgMap[this.data.themeClass] || themeBgMap['theme-xiuxing']
    if (t.imageUrls && t.imageUrls.length > 0) bg = 'url(' + t.imageUrls[0] + ') center/cover no-repeat'
    else if (t.cover && /^https?:|^cloud:\/\//.test(t.cover)) bg = 'url(' + t.cover + ') center/cover no-repeat'
    var score = t.baseScore || 0
    var outputs = []
    ;(t.timeSlots || []).forEach(function(slot) {
      ;(slot.activities || []).forEach(function(a) {
        if (outputs.length < 3) {
          var cap = a.capacity || {}
          outputs.push({ emoji: '·', label: a.activityName || a.name || '', val: (cap.value || '') + (cap.unit || '') })
        }
      })
    })
    return {
      id: t.id, name: t.name,
      subtitle: t.subtitle || t.slogan || '',
      description: t.description || '',
      categoryLabel: t.category || '',
      creatorName: t.creatorName || '道友',
      bgStyle: bg,
      score: '+' + score,
      outputs: outputs,
      offset: offsets[k] || offsets[2]
    }
  },

  // 结缘滑动手势
  onCardTouchStart: function(e) {
    this._sx = e.touches[0].clientX
    this._sy = e.touches[0].clientY
    this._dx = 0; this._dy = 0
    this._active = true
  },
  onCardTouchMove: function(e) {
    if (!this._active) return
    var dx = e.touches[0].clientX - this._sx
    var dy = e.touches[0].clientY - this._sy
    this._dx = dx; this._dy = dy
    var rot = (dx / 18).toFixed(1)
    var deck = this.data.deckCards
    if (deck && deck.length > 0) {
      deck[0].offset = 'translate(' + dx + 'px, ' + dy + 'px) rotate(' + rot + 'deg)'
      var opacity = Math.min(1, Math.abs(dx) / 110)
      deck[0]._likeOpacity = dx > 0 ? opacity : 0
      deck[0]._nopeOpacity = dx < 0 ? opacity : 0
      this.setData({ deckCards: deck })
    }
  },
  onCardTouchEnd: function() {
    if (!this._active) return
    this._active = false
    if (this._dx > 110) this._swipe('like')
    else if (this._dx < -110) this._swipe('nope')
    else {
      var deck = this.data.deckCards
      if (deck && deck.length > 0) {
        deck[0].offset = 'translate(0px, 0px) scale(1) rotate(0deg)'
        deck[0]._likeOpacity = 0
        deck[0]._nopeOpacity = 0
        this.setData({ deckCards: deck })
      }
    }
  },
  _swipe: function(dir) {
    var that = this
    var list = this.data.cloudTemplates || []
    var i = this.data.deckIndex || 0
    if (i >= list.length) return
    var t = list[i]
    var sx = dir === 'like' ? '620px' : '-620px'
    var rot = dir === 'like' ? '28deg' : '-28deg'
    var deck = this.data.deckCards
    if (deck && deck.length > 0) {
      deck[0].offset = 'translate(' + sx + ', -30px) rotate(' + rot + ')'
      this.setData({ deckCards: deck })
    }
    if (dir === 'like') { this._adoptTemplate(t) }
    this.setData({ deckIndex: i + 1 })
    setTimeout(function() { that.buildDeck() }, 280)
  },
  _adoptTemplate: function(t) {
    if (lifeTemplate && lifeTemplate.importCloudTemplate) {
      lifeTemplate.importCloudTemplate(t, t.id)
      wx.showToast({ title: '已结缘「' + (t.name || '') + '」', icon: 'success' })
    } else {
      wx.showToast({ title: '已结缘「' + (t.name || '') + '」', icon: 'none' })
    }
  },
  onSwipeLike: function() { this._swipe('like') },
  onSwipeNope: function() { this._swipe('nope') },
  onSwipeUndo: function() { if ((this.data.deckIndex || 0) > 0) { this.setData({ deckIndex: this.data.deckIndex - 1 }); this.buildDeck() } },
  onSwipeSuper: function() { this._swipe('like') },

  // 云端未就绪时显示空状态
  loadCloudFallback: function() {
    this.setData({
      cloudTemplates: [],
      cloudTotal: 0,
      cloudHasMore: false,
      cloudLoading: false,
      deckCards: [],
      deckIndex: 0
    })
  },

  loadMoreCloud: function() {
    if (!this.data.cloudHasMore || this.data.cloudLoading) return
    this.setData({ cloudPage: this.data.cloudPage + 1 })
    this.loadCloudTemplates(false)
  },

  changeSort: function(e) {
    var key = e.currentTarget.dataset.key
    var tab = (this.data.sortTabs || []).find(function(t) { return t.key === key })
    if (!tab) return
    this.setData({
      cloudSortKey: key,
      cloudSortBy: tab.sortBy || 'hot',
      cloudType: tab.type || 'all',
      cloudPage: 1
    })
    this.loadCloudTemplates(true)
  },

  changeCategory: function(e) {
    var cat = e.currentTarget.dataset.category
    this.setData({ cloudCategory: cat, cloudSubcategory: '', cloudPage: 1 })
    this.loadCloudTemplates(true)
  },

  onSearchInput: function(e) {
    this.data.cloudKeyword = e.detail.value
  },

  onSearchConfirm: function() {
    this.setData({ cloudPage: 1 })
    this.loadCloudTemplates(true)
  },

  // >>> 导航
  openTemplate: function(e) {
    var id = e.currentTarget.dataset.id
    if (id === 'custom') {
      wx.navigateTo({ url: '/packageC/pages/template-builder/template-builder' })
      return
    }
    wx.navigateTo({ url: '/packageC/pages/template-detail/template-detail?id=' + id })
  },

  openCloudTemplate: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packageC/pages/template-detail/template-detail?id=' + id + '&from=plaza' })
  },

  openPlaza: function() {
    this.setData({ activeTab: 'plaza' })
    this.loadCloudTemplates(true)
  },

  openImport: function() {
    wx.navigateTo({ url: '/packageC/pages/template-share/template-share?mode=import' }
    )
  },

  /** 大道之行 · 活动库入口 */
  goToActivityLibrary: function() {
    wx.navigateTo({ url: '/packageC/pages/activity-library/activity-library' })
  }
})
