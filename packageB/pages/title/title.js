// 道牒殿 - 称号展示与佩戴
const app = getApp()
const { getAllTitles, getTitleById, LEVEL_LABELS, LEVEL_TAB_ORDER, CATEGORY_LABELS } = require('../../../utils/titles.js')

Page({
  data: {
    equippedId: '',
    // 等级 Tab 数据
    levelTabs: [],
    activeLevel: 'all',
    // 当前筛选的称号列表
    displayTitles: [],
    loading: true,
    showStamp: false,
    stampTitle: null,
    showPoemPanel: false,
    poemTitle: null
  },

  onLoad() {
    this.applyTheme()
    this.loadTitles()
  },

  onShow() {
    this.applyTheme()
    this.loadTitles()
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  async loadTitles() {
    this.setData({ loading: true })

    try {
      const unlocked = await app.getAllUnlockedTitles()
      const unlockedIds = unlocked.map(function(t) { return t.id })
      const equipped = app.getEquippedTitle()
      const equippedId = equipped ? equipped.id : ''

      // 构建全量称号列表（按等级从高到低排序）
      var allTitles = getAllTitles()
      var allDisplay = allTitles.map(function(t) {
        var isUnlocked = unlockedIds.indexOf(t.id) !== -1
        return {
          id: t.id,
          name: t.name,
          color: t.color,
          level: t.level,
          levelLabel: LEVEL_LABELS[t.level] || t.level,
          category: t.category,
          categoryLabel: CATEGORY_LABELS[t.category] || t.category,
          bonus: Math.round(Number(t.bonus || 0) * 100) + '%',
          poem: t.poem,
          conditionText: t.conditionText,
          unlocked: isUnlocked,
          equipped: t.id === equippedId
        }
      })

      // 按等级权重排序：explosive → top → superior → normal → bottom
      // 同等级内：已解锁在前，再按 order
      var LEVEL_WEIGHT = { explosive: 0, top: 1, superior: 2, normal: 3, bottom: 4 }
      allDisplay.sort(function(a, b) {
        var wA = LEVEL_WEIGHT[a.level] != null ? LEVEL_WEIGHT[a.level] : 99
        var wB = LEVEL_WEIGHT[b.level] != null ? LEVEL_WEIGHT[b.level] : 99
        if (wA !== wB) return wA - wB
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
        return 0
      })

      // 构建 Tab 数据
      var levelTabs = LEVEL_TAB_ORDER.map(function(key) {
        var label = key === 'all' ? '全部' : LEVEL_LABELS[key]
        var count = key === 'all' ? allDisplay.length : allDisplay.filter(function(t) { return t.level === key }).length
        return { key: key, label: label, count: count }
      })

      // 默认全部
      var activeLevel = this.data.activeLevel || 'all'
      var displayTitles = activeLevel === 'all'
        ? allDisplay
        : allDisplay.filter(function(t) { return t.level === activeLevel })

      this.setData({
        levelTabs: levelTabs,
        allTitles: allDisplay,
        displayTitles: displayTitles,
        activeLevel: activeLevel,
        equippedId: equippedId,
        loading: false
      })
    } catch (e) {
      console.error('[title] 加载称号失败', e)
      this.setData({ loading: false })
    }
  },

  // 切换等级 Tab
  onTapLevelTab(e) {
    var key = e.currentTarget.dataset.key
    if (key === this.data.activeLevel) return
    var allDisplay = this.data.allTitles || []
    var displayTitles = key === 'all'
      ? allDisplay
      : allDisplay.filter(function(t) { return t.level === key })
    this.setData({ activeLevel: key, displayTitles: displayTitles })
  },

  onTapTitle(e) {
    var id = e.currentTarget.dataset.id
    var title = getTitleById(id)
    if (!title) return

    var targetItem = null
    var displayTitles = this.data.displayTitles
    for (var i = 0; i < displayTitles.length; i++) {
      if (displayTitles[i].id === id) { targetItem = displayTitles[i]; break }
    }
    if (!targetItem) {
      var allTitles = this.data.allTitles || []
      for (var j = 0; j < allTitles.length; j++) {
        if (allTitles[j].id === id) { targetItem = allTitles[j]; break }
      }
    }
    if (!targetItem) return

    if (!targetItem.unlocked) {
      wx.showToast({ title: targetItem.conditionText, icon: 'none', duration: 2500 })
      return
    }

    if (targetItem.equipped) {
      app.unequipTitle()
      this.setData({ equippedId: '' })
      this.refreshEquippedState('')
    } else {
      app.equipTitle(id)
      this.setData({ equippedId: id })
      this.refreshEquippedState(id)

      this.setData({
        showStamp: true,
        stampTitle: { name: title.name, color: title.color }
      })
      setTimeout(function() {
        this.setData({ showStamp: false, stampTitle: null })
      }.bind(this), 2000)

      if (title.poem) {
        this.setData({
          showPoemPanel: true,
          poemTitle: { name: title.name, poem: title.poem, color: title.color }
        })
        var that = this
        setTimeout(function() {
          that.setData({ showPoemPanel: false, poemTitle: null })
        }, 4000)
      }
    }
  },

  refreshEquippedState(equippedId) {
    var updateList = function(list) {
      return (list || []).map(function(t) {
        var item = Object.assign({}, t)
        item.equipped = item.id === equippedId
        return item
      })
    }
    this.setData({
      displayTitles: updateList(this.data.displayTitles),
      allTitles: updateList(this.data.allTitles || [])
    })
  },

  onCloseStamp() {
    this.setData({ showStamp: false, stampTitle: null })
  },

  onClosePoemPanel: function() {
    this.setData({ showPoemPanel: false, poemTitle: null })
  }
})
