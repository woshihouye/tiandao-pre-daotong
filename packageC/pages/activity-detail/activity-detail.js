// 单品活动详情页（修行库货架 → 单品详情）
var app = getApp()
var Cart = require('../../../utils/cart.js')

Page({
  data: {
    act: null,
    iconText: '',
    badges: [],
    isPublicLibrary: false,
    isAdmin: false,
    metaCardName: '',
    trainText: '',
    cellText: '',
    primaryMuscles: [],
    secondaryMuscles: [],
    trainParams: [],
    editingTrain: false,
    editCells: []
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

    // ── 训练信息提取 ──
    var MetaCards = require('../../../utils/meta-cards.js')
    var customMeta = act.customMeta || {}
    // 元卡
    var metaCardId = customMeta.metaCard || ''
    var metaCardName = ''
    if (metaCardId) {
      var mc = MetaCards.getMetaCard(metaCardId)
      metaCardName = (mc && mc.name) || metaCardId
    }
    // 训练量（cells 有 value 时拼接 "100kg × 8次 × 4组"）
    var cells = customMeta.cells || []
    var trainParts = []
    for (var ci = 0; ci < cells.length; ci++) {
      var c = cells[ci]
      if (c.value != null && c.value > 0) {
        trainParts.push(c.value + (c.unit || ''))
      }
    }
    var trainText = trainParts.join(' × ')
    // 自由度格子（名称+单位，无 value 时展示）
    var cellNames = []
    for (var cj = 0; cj < cells.length; cj++) {
      var cc = cells[cj]
      cellNames.push(cc.name + (cc.unit ? '(' + cc.unit + ')' : ''))
    }
    var cellText = cellNames.join(' · ')
    // 肌群（primary / secondary 分组，只取 weight > 0）
    var muscleWeights = customMeta.muscleWeights || []
    var primaryMuscles = []
    var secondaryMuscles = []
    for (var mi = 0; mi < muscleWeights.length; mi++) {
      var mw = muscleWeights[mi]
      if (mw.weight > 0) {
        if (mw.group === 'primary') primaryMuscles.push(mw.name)
        else secondaryMuscles.push(mw.name)
      }
    }
    // 官方卡训练参数
    var trainParams = []
    if (act.intensity) trainParams.push('强度:' + act.intensity)
    if (act.difficulty) trainParams.push('难度:' + act.difficulty)
    if (act.defaultGroup != null && act.defaultReps) {
      trainParams.push(act.defaultGroup + '组×' + act.defaultReps + '次')
    }
    if (act.defaultLoad) trainParams.push('负荷:' + act.defaultLoad)
    if (act.restInterval) trainParams.push('组间休息:' + act.restInterval)
    if (act.sessionDuration) trainParams.push('时长:' + act.sessionDuration)
    if (act.targetMuscle) trainParams.push('肌群:' + act.targetMuscle)
    if (act.targetAmount) trainParams.push('目标量:' + act.targetAmount)
    if (act.frequency) trainParams.push('频率:' + act.frequency)

    this.setData({
      act: act,
      iconText: iconText,
      badges: badges,
      isPublicLibrary: !!act.isPublicLibrary,
      isAdmin: isAdmin,
      metaCardName: metaCardName,
      trainText: trainText,
      cellText: cellText,
      primaryMuscles: primaryMuscles,
      secondaryMuscles: secondaryMuscles,
      trainParams: trainParams
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

  /** 进入训练量编辑态 */
  startEditTrain: function() {
    var cells = (this.data.act.customMeta && this.data.act.customMeta.cells) || []
    this.setData({ editingTrain: true, editCells: JSON.parse(JSON.stringify(cells)) })
  },

  /** 训练量输入 */
  onTrainInput: function(e) {
    var idx = e.currentTarget.dataset.index
    var val = parseFloat(e.detail.value)
    var key = 'editCells[' + idx + '].value'
    var obj = {}
    obj[key] = isNaN(val) ? 0 : val
    this.setData(obj)
  },

  /** 取消编辑 */
  cancelTrain: function() {
    this.setData({ editingTrain: false, editCells: [] })
  },

  /** 保存训练量（复用 user-activity update） */
  saveTrain: function() {
    var self = this
    var act = this.data.act
    var customMeta = JSON.parse(JSON.stringify(act.customMeta || {}))
    customMeta.cells = this.data.editCells
    var activityId = act.id || act.activityId
    wx.cloud.callFunction({
      name: 'user-activity',
      data: {
        action: 'update',
        activityId: activityId,
        name: act.name,
        category: act.category,
        unit: act.unit,
        scorePerUnit: act.scorePerUnit,
        description: act.description || '',
        icon: act.icon || '',
        customMeta: customMeta
      },
      success: function(res) {
        var r = res.result || {}
        if (r.ok) {
          act.customMeta = customMeta
          var parts = []
          for (var i = 0; i < customMeta.cells.length; i++) {
            var c = customMeta.cells[i]
            if (c.value != null && c.value > 0) parts.push(c.value + (c.unit || ''))
          }
          self.setData({ act: act, trainText: parts.join(' × '), editingTrain: false, editCells: [] })
          wx.showToast({ title: '已保存', icon: 'success' })
        } else {
          wx.showToast({ title: r.error || '保存失败', icon: 'none' })
        }
      },
      fail: function() {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  preventBubble: function() {}
})
