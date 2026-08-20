// 单个活动进度条组件
var THROTTLE_MS = 50

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    activity: {
      type: Object,
      value: {}
    },
    progress: {
      type: Number,
      value: 0
    },
    categoryColor: {
      type: String,
      value: '#EF4444'
    }
  },

  data: {
    sliderVisible: false,
    dragging: false,
    touchStartY: 0,
    touchStartProgress: 0,
    localProgress: 0,
    totalDeltaY: 0
  },

  methods: {
    onTouchStart(e) {
      this.setData({
        dragging: false,
        totalDeltaY: 0,
        touchStartY: e.touches[0].clientY,
        touchStartProgress: this.data.progress,
        localProgress: this.data.progress
      })
      this._lastThrottleTime = 0
    },

    onTouchMove(e) {
      var deltaY = this.data.touchStartY - e.touches[0].clientY
      var step = Math.round(deltaY / 3)
      var newProgress = this.data.touchStartProgress + step * 5
      newProgress = Math.max(0, Math.min(100, newProgress))

      // 标记为拖动（超过5px才算拖动）
      if (Math.abs(deltaY) > 5) {
        this.setData({ dragging: true })
      }
      this.setData({ totalDeltaY: Math.abs(deltaY), localProgress: newProgress })

      // 节流：每50ms才触发一次 change 事件
      var now = Date.now()
      if (!this._lastThrottleTime || now - this._lastThrottleTime >= THROTTLE_MS) {
        this._lastThrottleTime = now
        this.triggerEvent('change', {
          activityId: this.data.activity.id,
          progress: newProgress
        })
      }
    },

    onTouchEnd() {
      // 最终值确保触发
      this.triggerEvent('change', {
        activityId: this.data.activity.id,
        progress: this.data.localProgress
      })
      this.setData({ dragging: false })
    },

    // 拖动超过5px时不弹出 slider
    onTapItem() {
      if (this.data.dragging) return
      this.setData({ sliderVisible: true })
    },

    onSliderChange(e) {
      this.triggerEvent('change', {
        activityId: this.data.activity.id,
        progress: e.detail.value
      })
    },

    onCloseSlider() {
      this.setData({ sliderVisible: false })
    }
  }
})
