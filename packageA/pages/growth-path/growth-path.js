// 成长路径 — 时间线：修行记录 + 称号成就 + 境界突破 + 手动记录
var app = getApp()
var { CAMP } = require('../../../utils/constants.js')
var REALM_THRESHOLDS = [
  { name: '炼精化气', entry: 0 },
  { name: '炼气化神', entry: 300 },
  { name: '炼神还虚', entry: 3000 },
  { name: '炼虚合道', entry: 30000 }
]
var CAT_EMOJI = { sport: '💪', diet: '🍱', study: '📖', work: '💼', debuff: '💀' }
var CAT_LABEL = { sport: '武·炼体', diet: '食·丹食', study: '悟·修心', work: '工·功业', debuff: '煞·心魔' }
var MILESTONE_STORAGE = 'tiandao_manual_growth'

Page({
  data: {
    themeClass: 'theme-light-fixed',
    timeline: [],
    totalCultivation: 0,
    loading: true,
    isEmpty: false,
    // 手动记录
    showAddForm: false,
    newTitle: '',
    newContent: ''
  },

  onLoad: function() {
    this.applyTheme()
    this.loadData()
  },

  onShow: function() {
    this.applyTheme()
  },

  applyTheme: function() {
    var tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  loadData: function() {
    var that = this
    var profile = (app.globalData && app.globalData.userProfile) || {}
    var totalCultivation = Number(profile.totalCultivation || 0)
    var userId = (app.globalData && app.globalData.openid) || ''

    that.setData({ loading: true })

    // 1. 拉取全部 confirmed 记录
    this.fetchAllRecords(userId, function(records) {
      // 2. 构建时间线事件
      var events = []

      // 打卡事件
      for (var i = 0; i < records.length; i++) {
        var r = records[i]
        var cat = r.category || r.type || 'sport'
        events.push({
          type: 'checkin',
          date: r.date || '',
          time: r.timestamp || 0,
          category: cat,
          emoji: CAT_EMOJI[cat] || '✨',
          label: CAT_LABEL[cat] || cat,
          name: r.name || '修行打卡',
          score: r.score || 0,
          templateId: r.templateId || '',
          sortKey: r.timestamp || 0
        })
      }

      // 3. 推算境界突破事件
      var sortedByDate = records.slice().sort(function(a, b) {
        return (a.timestamp || 0) - (b.timestamp || 0)
      })
      var cumScore = 0
      var lastRealmIdx = -1
      for (var j = 0; j < sortedByDate.length; j++) {
        var sr = sortedByDate[j]
        cumScore += (sr.score || 0)
        // 判断是否跨过境界门槛
        for (var ri = 0; ri < REALM_THRESHOLDS.length; ri++) {
          if (cumScore >= REALM_THRESHOLDS[ri].entry && ri > lastRealmIdx) {
            events.push({
              type: 'breakthrough',
              date: sr.date || '',
              time: sr.timestamp || 0,
              emoji: '⚡',
              label: '境界突破',
              name: '突破至「' + REALM_THRESHOLDS[ri].name + '」',
              realmName: REALM_THRESHOLDS[ri].name,
              cumScore: cumScore,
              sortKey: (sr.timestamp || 0) + 1  // 让突破事件在同日打卡之后显示
            })
            lastRealmIdx = ri
          }
        }
      }

      // 4. 称号解锁事件
      var allTitles = that.getAllUnlockedTitles()
      for (var ti = 0; ti < allTitles.length; ti++) {
        var t = allTitles[ti]
        events.push({
          type: 'title',
          date: '',
          time: 0,
          emoji: '🏅',
          label: '道牒成就',
          name: '解锁称号「' + (t.name || '') + '」',
          titleColor: t.color || '#f59e0b',
          bonus: t.bonus || 0,
          poem: t.poem || '',
          sortKey: -1 - ti  // 排在最前面（无时间戳时）
        })
      }

      // 5. 手动记录
      var manualList = that.getManualRecords()
      for (var mk = 0; mk < manualList.length; mk++) {
        var mm = manualList[mk]
        events.push({
          type: 'manual',
          date: mm.date || '',
          time: mm.timestamp || 0,
          emoji: '📝',
          label: mm.title || '成长记录',
          name: mm.content || '',
          sortKey: mm.timestamp || 0
        })
      }

      // 按时间排序（新→旧）
      events.sort(function(a, b) { return (b.sortKey || 0) - (a.sortKey || 0) })

      that.setData({
        timeline: events,
        totalCultivation: totalCultivation,
        loading: false,
        isEmpty: events.length === 0
      })
    })
  },

  fetchAllRecords: function(userId, callback) {
    if (!userId) { callback([]); return }
    try {
      var db = wx.cloud.database()
      var MAX_LIMIT = 100
      var that = this
      function loadPage(skip, all) {
        all = all || []
        db.collection('records')
          .where({ userId: userId, status: 'confirmed' })
          .orderBy('timestamp', 'desc')
          .skip(skip)
          .limit(MAX_LIMIT)
          .get()
          .then(function(res) {
            var batch = (res && res.data) || []
            all = all.concat(batch)
            if (batch.length >= MAX_LIMIT) {
              loadPage(skip + MAX_LIMIT, all)
            } else {
              callback(all)
            }
          })
          .catch(function(err) {
            console.error('加载修行记录失败', err)
            callback(all)
          })
      }
      loadPage(0)
    } catch (e) {
      console.error('获取记录异常', e)
      callback([])
    }
  },

  getAllUnlockedTitles: function() {
    try {
      // 从本地缓存的 titleUnlockCache 获取已解锁称号ID列表
      var cache = wx.getStorageSync('tiandao_title_unlock_cache') || []
      if (cache.length === 0) return []
      // 从 titles.js 获取称号详情
      var titlesModule = require('../../../utils/titles.js')
      var allDefs = titlesModule.getAllTitleDefs ? titlesModule.getAllTitleDefs() : []
      if (allDefs.length === 0) {
        // fallback: 从 app 获取
        if (app.getAllUnlockedTitles) {
          return app.getAllUnlockedTitles() || []
        }
        return []
      }
      var result = []
      for (var i = 0; i < cache.length; i++) {
        var found = null
        for (var j = 0; j < allDefs.length; j++) {
          if (allDefs[j].id === cache[i]) { found = allDefs[j]; break }
        }
        if (found) result.push(found)
      }
      return result
    } catch (e) {
      return []
    }
  },

  // 手动记录
  getManualRecords: function() {
    try {
      return wx.getStorageSync(MILESTONE_STORAGE) || []
    } catch (e) {
      return []
    }
  },

  showAddForm: function() {
    this.setData({ showAddForm: true, newTitle: '', newContent: '' })
  },

  hideAddForm: function() {
    this.setData({ showAddForm: false })
  },

  onTitleInput: function(e) {
    this.setData({ newTitle: e.detail.value })
  },

  onContentInput: function(e) {
    this.setData({ newContent: e.detail.value })
  },

  saveManualRecord: function() {
    var title = (this.data.newTitle || '').trim()
    var content = (this.data.newContent || '').trim()
    if (!title || !content) {
      wx.showToast({ title: '请填写标题和内容', icon: 'none' })
      return
    }
    var list = this.getManualRecords()
    list.unshift({
      title: title,
      content: content,
      date: this.formatDate(new Date()),
      timestamp: Date.now()
    })
    wx.setStorageSync(MILESTONE_STORAGE, list)
    this.setData({ showAddForm: false, newTitle: '', newContent: '' })
    this.loadData()
    wx.showToast({ title: '已记录', icon: 'success' })
  },

  deleteManualRecord: function(e) {
    var that = this
    var idx = e.currentTarget.dataset.idx
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条成长记录？',
      success: function(res) {
        if (res.confirm) {
          var list = that.getManualRecords()
          list.splice(idx, 1)
          wx.setStorageSync(MILESTONE_STORAGE, list)
          that.loadData()
        }
      }
    })
  },

  formatDate: function(d) {
    var y = d.getFullYear()
    var m = ('0' + (d.getMonth() + 1)).slice(-2)
    var day = ('0' + d.getDate()).slice(-2)
    return y + '-' + m + '-' + day
  },

  goToTemplates: function() {
    wx.switchTab({ url: '/pages/templates/templates' })
  }
})
