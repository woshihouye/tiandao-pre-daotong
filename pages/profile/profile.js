// 个人主页 — v2 重构
var app = getApp()

function getTodayDate() {
  var d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function getDaysAgo(n) {
  var d = new Date()
  d.setDate(d.getDate() - n)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

Page({
  data: {
    // >>> 模块1: 形象头区
    nickName: '',
    avatarText: '修',
    currentRealm: { name: '炼气', stage: 1, index: 0 },
    realmProgress: 0,
    realmRemaining: 0,
    cultivationSystem: 'traditional',
    sectName: '',
    // >>> 模块2: 定场诗
    signaturePoem: '',
    // >>> 模块3: 核心数据
    totalCultivation: 0,
    streakDays: 0,
    dailyMatch: 0,
    totalCheckins: 0,
    // >>> 模块4: 道牒成就
    equippedTitle: [null, null],
    equippedTitleBonus: 0,
    unlockedTitles: [],
    titlePoem: '',
    // >>> 模块5: 修行轨迹
    weekData: [],
    dimStats: {},
    // >>> 模块6: 模板
    mainTemplate: null,
    sideTemplates: [],
    // >>> 状态统计
    sportCount: 0,
    dietCount: 0,
    studyCount: 0,
    workCount: 0,
    debuffCount: 0,
    energyValue: '--',
    moodEmoji: '--',
    showReviewEntry: false
  },

  onLoad: function() {
    var that = this

    // 监听签名诗变化
    this._poemChangedHandler = function(payload) {
      if (payload && payload.poem !== undefined) {
        that.setData({ signaturePoem: payload.poem })
      } else {
        that.loadSignaturePoem()
      }
    }

    // 监听积分更新 — 重新加载统计数据
    this._scoreUpdatedHandler = function() {
      that.loadStats()
    }

    // 监听模板导入/切换 — 重新加载模板信息
    this._templateChangedHandler = function() {
      that.loadTemplateInfo()
    }

    // 监听称号变更
    this._titleChangedHandler = function() {
      that.loadEquippedTitle()
      that.loadAllUnlockedTitles()
    }

    // 监听修炼体系刷新 — 全量重载
    this._refreshCultivationHandler = function() {
      that.loadAll()
    }

    if (app.onAppEvent) {
      app.onAppEvent('signature-poem-changed', this._poemChangedHandler)
      app.onAppEvent('score-updated', this._scoreUpdatedHandler)
      app.onAppEvent('template-imported', this._templateChangedHandler)
      app.onAppEvent('template-published', this._templateChangedHandler)
      app.onAppEvent('template-unpublished', this._templateChangedHandler)
      app.onAppEvent('title-equipped', this._titleChangedHandler)
      app.onAppEvent('title-poem-changed', this._titleChangedHandler)
      app.onAppEvent('refresh-cultivation-pages', this._refreshCultivationHandler)
    }
  },

  onShow: function() {
    this.loadAll()
    this.loadReviewEntry()
  },

  onUnload: function() {
    var handlers = [
      { e: 'signature-poem-changed', h: this._poemChangedHandler },
      { e: 'score-updated', h: this._scoreUpdatedHandler },
      { e: 'template-imported', h: this._templateChangedHandler },
      { e: 'template-published', h: this._templateChangedHandler },
      { e: 'template-unpublished', h: this._templateChangedHandler },
      { e: 'title-equipped', h: this._titleChangedHandler },
      { e: 'title-poem-changed', h: this._titleChangedHandler },
      { e: 'refresh-cultivation-pages', h: this._refreshCultivationHandler }
    ]
    if (app.offAppEvent) {
      handlers.forEach(function(item) {
        if (item.h) app.offAppEvent(item.e, item.h)
      })
    }
  },

  loadAll: function() {
    this.loadStats()
    this.loadEquippedTitle()
    this.loadAllUnlockedTitles()
    this.loadSignaturePoem()
    this.loadTemplateInfo()
    this.loadSpiritSummary()
  },

  // 审核中心入口判定：仅管理员（admins 集合 openid）可见，前端不传/不读 adminToken
  loadReviewEntry: function() {
    var that = this
    wx.cloud.callFunction({
      name: 'activity-review',
      data: { action: 'listActivityApplications' },
      success: function(res) {
        if (res.result && res.result.ok) {
          that.setData({ showReviewEntry: true })
        } else {
          that.setData({ showReviewEntry: false })
        }
      },
      fail: function() {
        that.setData({ showReviewEntry: false })
      }
    })
  },

  // ============ 模块1-3: 核心数据加载 ============
  loadStats: function() {
    var db = app.globalData.db
    if (!db) return

    var that = this
    var profile = (app.globalData && app.globalData.userProfile) || {}

    // 从全局数据取基础字段
    var totalCultivation = Number(profile.totalCultivation || 0)
    var streakDays = Number(profile.streakDays || 0)
    var nickName = profile.nickName || '无名修士'
    var sectName = profile.sectName || ''
    var dailyMatch = Number(profile.dailyMatch || 0)
    var avatarText = nickName.charAt(0) || '修'
    
    // 境界
    var realm = { name: '炼气', stage: 1, index: 0, remaining: 33, perStage: 33 }
    if (app.getRealmByScore) {
      realm = app.getRealmByScore(totalCultivation)
    }
    var realmProgress = 0
    if (realm.perStage && realm.perStage > 0) {
      realmProgress = Math.min(100, Math.round((realm.perStage - (realm.remaining || 0)) / realm.perStage * 100))
    }
    var cultivationSystem = profile.cultivationSystem || 'traditional'

    // 查近7天记录
    var today = getTodayDate()
    var weekAgo = getDaysAgo(6)
    
    db.collection('records')
      .where({ userId: app.globalData.userId, date: db.command.gte(weekAgo).and(db.command.lte(today)) })
      .orderBy('date', 'asc')
      .get()
      .then(function(res) {
        var records = res.data || []
        var weekData = that.generateWeekData(records)
        var dimStats = that.calcDimStats(records)
        var categoryCounts = that.countCategories(records)
        // 重算连续天数（更精确）
        var calcStreak = that.calculateStreakDays(records)
        var totalCheckins = records.length

        that.setData({
          nickName: nickName,
          avatarText: avatarText,
          currentRealm: realm,
          realmProgress: realmProgress,
          realmRemaining: realm.remaining || 0,
          cultivationSystem: cultivationSystem,
          sectName: sectName,
          totalCultivation: totalCultivation,
          streakDays: calcStreak > streakDays ? calcStreak : streakDays,
          dailyMatch: dailyMatch,
          totalCheckins: totalCheckins,
          weekData: weekData,
          dimStats: dimStats,
          sportCount: categoryCounts.sport || 0,
          dietCount: categoryCounts.diet || 0,
          studyCount: categoryCounts.study || 0,
          workCount: categoryCounts.work || 0,
          debuffCount: categoryCounts.debuff || 0
        })
      })
      .catch(function() {
        that.setData({
          nickName: nickName,
          avatarText: avatarText,
          currentRealm: realm,
          realmProgress: realmProgress,
          realmRemaining: realm.remaining || 0,
          cultivationSystem: cultivationSystem,
          sectName: sectName,
          totalCultivation: totalCultivation,
          streakDays: streakDays,
          dailyMatch: dailyMatch,
          weekData: [],
          dimStats: [],
          sportCount: 0, dietCount: 0, studyCount: 0, workCount: 0, debuffCount: 0
        })
      })
  },

  // 近七日走势
  generateWeekData: function(records) {
    var days = []
    for (var i = 6; i >= 0; i--) {
      var date = getDaysAgo(i)
      var dayRecords = records.filter(function(r) { return r.date === date })
      var score = dayRecords.reduce(function(s, r) { return s + (r.score || 0) }, 0)
      var label = date.slice(5)
      var height = Math.min(100, Math.max(4, Math.abs(score) * 15))
      var color = score >= 5 ? '#10b981' : score >= 0 ? '#34d399' : '#f87171'
      var emoji = score >= 10 ? '🔥' : score >= 5 ? '✨' : score >= 0 ? '·' : '⚠'
      var count = dayRecords.length
      days.push({ date: date, label: label, score: score, height: height, color: color, emoji: emoji, count: count })
    }
    return days
  },

  // 五维度统计（返回数组，供 WXML wx:for 遍历）
  calcDimStats: function(records) {
    var dims = { sport: 0, diet: 0, study: 0, work: 0, debuff: 0 }
    var countDims = { sport: 0, diet: 0, study: 0, work: 0, debuff: 0 }
    
    records.forEach(function(r) {
      var cat = r.category || ''
      if (dims.hasOwnProperty(cat)) {
        dims[cat] += (r.score || 0)
        countDims[cat] += 1
      }
    })

    var total = 0
    for (var k in countDims) { total += countDims[k] }

    var labels = { sport: '武·炼体', diet: '食·丹食', study: '悟·修心', work: '工·功业', debuff: '煞·心魔' }
    var colors = { sport: '#f59e0b', diet: '#10b981', study: '#8b5cf6', work: '#3b82f6', debuff: '#ef4444' }
    var icons = { sport: '⚔', diet: '🍃', study: '📖', work: '🏛', debuff: '⚠' }
    var keys = ['sport', 'diet', 'study', 'work', 'debuff']

    var result = []
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]
      result.push({
        key: k,
        label: labels[k],
        icon: icons[k],
        color: colors[k],
        count: countDims[k],
        score: dims[k],
        pct: total > 0 ? Math.round(countDims[k] / total * 100) : 0
      })
    }
    return result
  },

  // 分类计数
  countCategories: function(records) {
    var result = { sport: 0, diet: 0, study: 0, work: 0, debuff: 0 }
    records.forEach(function(r) {
      var cat = r.category || ''
      if (result.hasOwnProperty(cat)) result[cat]++
    })
    return result
  },

  // 连续天数
  calculateStreakDays: function(records) {
    var sortedDates = []
    records.forEach(function(r) {
      if (sortedDates.indexOf(r.date) === -1) sortedDates.push(r.date)
    })
    sortedDates.sort()
    var today = getTodayDate()
    var streak = 0
    for (var i = sortedDates.length - 1; i >= 0; i--) {
      var expected = getDaysAgo(streak)
      if (sortedDates[i] === expected || sortedDates[i] === today) {
        if (sortedDates[i] !== today || streak === 0) streak++
      } else { break }
    }
    if (sortedDates.indexOf(today) === -1 && sortedDates.indexOf(getDaysAgo(1)) === -1) streak = 0
    return streak
  },

  // ============ 模块2: 定场诗 ============
  loadSignaturePoem: function() {
    if (app.getSignaturePoem) {
      this.setData({ signaturePoem: app.getSignaturePoem() })
    }
  },

  // ============ 模块4: 道牒成就 ============
  loadEquippedTitle: function() {
    var titles = app.getEquippedTitles ? app.getEquippedTitles() : [null, null]
    var getTitleBuffs = null
    try { getTitleBuffs = require('../../utils/titles.js').getTitleBuffs } catch (e) {}

    var cards = [null, null]
    var totalBonus = 0
    for (var i = 0; i < titles.length && i < 2; i++) {
      var t = titles[i]
      if (!t) continue
      var buffs = getTitleBuffs ? getTitleBuffs(t) : []
      var cultivation = 0
      var combat = 0
      for (var j = 0; j < buffs.length; j++) {
        if (buffs[j].type === 'cultivation') cultivation += Number(buffs[j].value || 0)
        if (buffs[j].type === 'combat') combat += Number(buffs[j].value || 0)
      }
      var buffsText = ''
      if (cultivation > 0) buffsText += '+' + Math.round(cultivation * 100) + '% 修行'
      if (combat > 0) buffsText += (buffsText ? ' · ' : '') + '+' + Math.round(combat * 100) + '% 战力'
      cards[i] = {
        id: t.id,
        name: t.name,
        color: t.color,
        buffsText: buffsText || '加成'
      }
      totalBonus += cultivation
    }

    this.setData({
      equippedTitle: cards,
      equippedTitleBonus: Math.round(totalBonus * 100)
    })

    if (app.getEquippedTitlePoem) {
      this.setData({ titlePoem: app.getEquippedTitlePoem() })
    }
  },

  loadAllUnlockedTitles: function() {
    var that = this
    if (app.getAllUnlockedTitles) {
      app.getAllUnlockedTitles().then(function(titles) {
        if (titles && titles.length) {
          that.setData({ unlockedTitles: titles.slice(0, 10) })
        }
      }).catch(function() {})
    }
  },

  // ============ 模块6: 模板 ============
  loadTemplateInfo: function() {
    var main = app.getMainTemplate ? app.getMainTemplate() : null
    var sides = app.getSideTemplates ? app.getSideTemplates() : []
    this.setData({
      mainTemplate: main ? { id: main.id, name: main.name, cover: main.cover, dailyCap: main.dailyCap, camp: main.camp } : null,
      sideTemplates: sides.map(function(t) { return { id: t.id, name: t.name, cover: t.cover, dailyCap: t.dailyCap, camp: t.camp } })
    })
  },

  // ============ 精/神 ============
  loadSpiritSummary: function() {
    var db = app.globalData.db
    if (!db) return
    var that = this
    var today = getTodayDate()
    db.collection('daily_spirit')
      .where({ userId: app.globalData.userId, date: today })
      .get()
      .then(function(res) {
        if (res.data && res.data.length > 0) {
          var rec = res.data[0]
          that.setData({ energyValue: rec.energy || rec.energyValue || '--', moodEmoji: rec.mood || rec.moodEmoji || '--' })
        }
      }).catch(function() {})
  },

  // ============ 导航 ============
  goToPoemEdit: function() {
    wx.navigateTo({ url: '/packageD/pages/poem-edit/poem-edit' })
  },

  goToCultivation: function() {
    wx.navigateTo({ url: '/packageA/pages/cultivation/cultivation' })
  },

  goToTitle: function() {
    wx.navigateTo({ url: '/packageB/pages/title/title' })
  },

  goToBodyStatus: function() {
    wx.navigateTo({ url: '/packageA/pages/body-status/body-status' })
  },

  goToSettings: function() {
    wx.navigateTo({ url: '/packageB/pages/settings/settings' })
  },

  goToFavorites: function() {
    wx.navigateTo({ url: '/packageD/pages/my-favorites/my-favorites' })
  },

  goToCreatorCenter: function() {
    wx.navigateTo({ url: '/packageC/pages/creator-center/creator-center' })
  },

  goToTemplateDetail: function(e) {
    var id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: '/packageC/pages/template-detail/template-detail?id=' + id })
  },

  goToDetailBoard: function() {
    wx.navigateTo({ url: '/packageA/pages/detail-board/detail-board?type=all' })
  },

  goToConversations: function() { wx.navigateTo({ url: '/packageD/pages/conversations/conversations' }) },
  goToPrivacy: function() { wx.navigateTo({ url: '/packageD/pages/privacy-settings/privacy-settings' }) },
  
  goToGrowthPath: function() {
    wx.navigateTo({ url: '/packageA/pages/growth-path/growth-path' })
  },

  goToMyTemplates: function() {
    wx.navigateTo({ url: '/packageC/pages/my-templates/my-templates' })
  },

  // ============ v4.0 新增导航 ============
  goToDaoFoundation: function() { wx.navigateTo({ url: '/packageA/pages/dao-foundation/dao-foundation' }) },
  goToPillStore: function() { wx.navigateTo({ url: '/packageA/pages/pill-store/pill-store' }) },
  goToLeaderboard: function() { wx.navigateTo({ url: '/packageA/pages/leaderboard/leaderboard' }) },
  goToResetCultivation: function() { wx.navigateTo({ url: '/packageA/pages/reset-cultivation/reset-cultivation' }) },
  goToCustomerService: function() { wx.navigateTo({ url: '/packageD/pages/customer-svc/customer-svc' }) },
  goToReviewCenter: function() { wx.navigateTo({ url: '/packageD/pages/review-center/review-center' }) },
  goToTitleGrade: function() { wx.navigateTo({ url: '/packageB/pages/title-grade/title-grade' }) },
  goToCultivationLadder: function() { wx.navigateTo({ url: '/packageA/pages/cultivation-ladder/cultivation-ladder' }) },

  goToTemplatesTab: function() {
    wx.switchTab({ url: '/pages/templates/templates' })
  },

  editBodyProfile: function(e) {
    var field = e.currentTarget.dataset.field
    var that = this
    wx.showModal({
      title: '修改肉身数据',
      editable: true,
      placeholderText: '请输入新数据',
      success: function(res) {
        if (res.confirm && res.content) {
          var val = res.content.trim()
          if (app.syncUserProfile) {
            var patch = {}
            if (field === 'gender') patch.gender = val
            else patch[field] = Number(val)
            app.syncUserProfile(patch)
          }
          that.loadAll()
        }
      }
    })
  }
})
