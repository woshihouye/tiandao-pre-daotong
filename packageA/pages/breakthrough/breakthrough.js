// 境界突破仪式页
var app = getApp()
var breakthroughEngine = require('../../../utils/breakthrough.js')
var realmRights = require('../../../utils/realm-rights.js')

Page({
  data: {
    phase: 'prepare',
    realmBefore: {},
    realmAfter: {},
    settlement: null,
    animProgress: 0,
    animComplete: false,
    ritual: null,
    showSkip: false,
    forcedAnimation: true,
    // 预计算显示值（避免WXML中复杂表达式）
    animCoreDuration: '0.8s',
    animRing1Duration: '2s',
    animRing3Opacity: '0.3',
    animProgressWidth: '0%',
    animText: '灵气汇聚中...',
    rewardBonusText: '',
    rewardGradeId: ''
  },

  onLoad(options) {
    var realmAfter = {}
    try { realmAfter = JSON.parse(decodeURIComponent(options.realmAfter || '{}')) } catch(e){}
    var realmBefore = {}
    try { realmBefore = JSON.parse(decodeURIComponent(options.realmBefore || '{}')) } catch(e){}

    var ritual = breakthroughEngine.getBreakthroughRitual(realmAfter.realmId || 'zhuji')
    var forced = options.forced === 'true'

    this.setData({
      realmBefore: realmBefore,
      realmAfter: realmAfter,
      ritual: ritual,
      forcedAnimation: forced || false,
      showSkip: !(forced || false)
    })
  },

  onReady() {
    if (this.data.phase === 'prepare') {
      this._startAnimation()
    }
  },

  onAnimationTap() {
    if (this.data.phase === 'animate') {
      this._finishAnimation()
    }
  },

  onSkipTap() {
    this._finishAnimation()
  },

  _startAnimation() {
    this.setData({ phase: 'animate' })
    var ritual = this.data.ritual
    var duration = ritual ? ritual.animationDuration : 3000
    var interval = 50
    var totalSteps = Math.floor(duration / interval)
    var step = 0

    this._animTimer = setInterval(() => {
      step++
      var progress = step / totalSteps
      if (progress >= 1) {
        progress = 1
        clearInterval(this._animTimer)
        this._onAnimComplete()
      }
      this._updateAnimDisplay(progress)
    }, interval)

    if (!this.data.forcedAnimation) {
      setTimeout(() => { this.setData({ showSkip: true }) }, 3000)
    }
  },

  _updateAnimDisplay(progress) {
    var p = progress
    var update = {
      animProgress: p,
      animCoreDuration: (p < 0.5 ? 0.8 : 0.4) + 's',
      animRing1Duration: (p < 0.5 ? 2 : 1.2) + 's',
      animRing3Opacity: p > 0.5 ? '1' : '0.3',
      animProgressWidth: Math.round(p * 100) + '%'
    }
    if (p < 0.5) {
      update.animText = '灵气汇聚中...'
    } else if (p < 0.8) {
      update.animText = '突破即将完成...'
    } else {
      update.animText = '境界蜕变！'
    }
    this.setData(update)
  },

  _finishAnimation() {
    if (this._animTimer) clearInterval(this._animTimer)
    this._animTimer = null
    this.setData({ animProgress: 1, animText: '境界蜕变！', animProgressWidth: '100%' })
    this._onAnimComplete()
  },

  async _onAnimComplete() {
    if (this.data.animComplete) return
    this.setData({ animComplete: true })

    try {
      var res = await wx.cloud.callFunction({
        name: 'breakthrough-ceremony',
        data: {}
      })

      if (res.result && res.result.ok) {
        var settlement = res.result.settlement
        var bonusRate = settlement.daoFoundation ? settlement.daoFoundation.bonusRate : 0
        var gradeId = settlement.daoFoundation ? settlement.daoFoundation.gradeId : ''
        this.setData({
          settlement: settlement,
          phase: 'settle',
          rewardBonusText: '+' + Math.round(bonusRate * 100) + '%',
          rewardGradeId: 'grade-' + gradeId
        })
        try { app.emitAppEvent('breakthrough-completed', settlement) } catch(e){}
      } else {
        this.setData({ phase: 'settle', settlement: { error: res.result ? res.result.error : '突破失败' } })
      }
    } catch (e) {
      this.setData({ phase: 'settle', settlement: { error: e.message || '突破失败' } })
    }
  },

  onConfirmTap() {
    wx.navigateBack({ delta: 2 })
  },

  onCloseTap() {
    wx.navigateBack()
  },

  onUnload() {
    if (this._animTimer) clearInterval(this._animTimer)
  }
})
