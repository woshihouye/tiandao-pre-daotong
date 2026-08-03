// 分层进度条组件：初期→中期→后期→圆满
Component({
  properties: {
    substages: { type: Array, value: [] },
    overallProgress: { type: Number, value: 0 },
    currentStageLabel: { type: String, value: '' },
    realmName: { type: String, value: '' }
  },

  observers: {
    'substates, overallProgress'(substages, overallProgress) {
      this._updateDisplay()
    }
  },

  lifetimes: {
    attached() { this._updateDisplay() }
  },

  methods: {
    onTap() { this.triggerEvent('tap', {}) },

    _updateDisplay() {
      var substages = this.properties.substates || []
      var overallProgress = this.properties.overallProgress || 0
      var overallPercent = Math.round(overallProgress * 1000) / 10

      // 为每个子阶段预计算样式，避免WXML中的复杂表达式
      var processed = substages.map(function(item) {
        var fillWidth = Math.round(item.progress * 100)
        return {
          label: item.label,
          index: item.index,
          progress: item.progress,
          filled: item.filled,
          color: item.color,
          isCurrent: item.isCurrent,
          segmentStyle: item.isCurrent ? 'box-shadow: 0 0 12rpx ' + item.color : '',
          fillStyle: 'width:' + fillWidth + '%;background:' + item.color,
          labelStyle: item.isCurrent ? 'color:' + item.color + ';font-weight:600' : ''
        }
      })

      this.setData({
        substages: processed,
        overallPercent: overallPercent
      })
    }
  }
})
