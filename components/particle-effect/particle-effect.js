// 灵气粒子特效组件
// 用于修为增加时的视觉反馈：粒子向境界进度条汇聚
Component({
  properties: {
    show: { type: Boolean, value: false },
    // 粒子配置：{ type: 'burst'|'absorb'|'rise', color, count, target }
    config: {
      type: Object,
      value: { type: 'burst', color: '#f59e0b', count: 10, target: 'progress-bar' }
    },
    // 目标元素选择器（用于粒子汇聚方向）
    targetSelector: { type: String, value: '' },
    // 是否自动消失
    autoHide: { type: Boolean, value: true },
    // 自动消失时长(ms)
    duration: { type: Number, value: 2000 }
  },

  data: {
    particles: [],
    animating: false,
    _timer: null
  },

  lifetimes: {
    attached() {
      this._canvasId = 'particle-canvas-' + Math.random().toString(36).slice(2, 8)
    },
    detached() {
      clearTimeout(this.data._timer)
    }
  },

  observers: {
    'show, config'(show) {
      if (show) this._startAnimation()
    }
  },

  methods: {
    _startAnimation() {
      this.setData({ animating: true })
      this._generateParticles()

      if (this.data.autoHide) {
        clearTimeout(this.data._timer)
        this.data._timer = setTimeout(() => {
          this.setData({ animating: false, show: false })
        }, this.data.duration)
      }
    },

    _generateParticles() {
      var config = this.data.config || {}
      var count = config.count || 8
      var color = config.color || '#f59e0b'
      var type = config.type || 'burst'

      var particles = []
      for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 * i) / count
        if (type === 'rise') angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5
        if (type === 'absorb') angle = Math.PI / 2 + (Math.random() - 0.5) * 0.8

        var distance = 60 + Math.random() * 80
        particles.push({
          id: 'p' + i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 2 + Math.random() * 4,
          color: this._adjustColor(color, Math.random() * 0.3),
          delay: Math.random() * 300,
          duration: 600 + Math.random() * 400,
          opacity: 1
        })
      }
      this.setData({ particles })
    },

    _adjustColor(hex, amount) {
      // 简单颜色变体
      return hex
    }
  }
})
