/**
 * progress-ring - 环形修炼进度组件
 * 模拟RPG状态面板的圆形进度环，使用Canvas 2D绘制
 * 支持渐变色彩、发光脉动动画
 */

Component({
  properties: {
    /** 进度百分比 0-100 */
    percent: {
      type: Number,
      value: 0,
      observer: '_onPercentChange'
    },
    /** 环大小 rpx */
    size: {
      type: Number,
      value: 200
    },
    /** 描边宽度 rpx */
    strokeWidth: {
      type: Number,
      value: 12
    },
    /** 环颜色 */
    color: {
      type: String,
      value: 'var(--primary)'
    },
    /** 标签文字 */
    label: {
      type: String,
      value: '修炼进度'
    },
    /** 是否显示脉动动画 */
    showPulse: {
      type: Boolean,
      value: true
    }
  },

  data: {
    _canvasReady: false,
    _animPercent: 0,
    _animTimer: null
  },

  lifetimes: {
    attached() {
      this._dpr = wx.getSystemInfoSync().pixelRatio || 2
    },
    ready() {
      this._initCanvas()
    },
    detached() {
      if (this.data._animTimer) {
        clearInterval(this.data._animTimer)
        this.data._animTimer = null
      }
    }
  },

  methods: {
    _onPercentChange(newVal) {
      // 动画过渡到新值
      this._animateToPercent(newVal)
    },

    _initCanvas() {
      const query = this.createSelectorQuery()
      query.select('#progressCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            // 降级：使用旧版 Canvas API
            this._initOldCanvas()
            return
          }
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = this._dpr
          const size = this.properties.size

          canvas.width = size * dpr
          canvas.height = size * dpr
          ctx.scale(dpr, dpr)

          this._canvas = canvas
          this._ctx = ctx
          this.data._canvasReady = true

          this._drawRing(this.properties.percent)
        })
    },

    _initOldCanvas() {
      // 兼容旧版 Canvas
      const ctx = wx.createCanvasContext('progressCanvas', this)
      this._ctxOld = ctx
      this._isOldCanvas = true
      this.data._canvasReady = true
      this._drawRingOld(this.properties.percent)
    },

    /**
     * 数值动画：从当前值平滑过渡到目标值
     */
    _animateToPercent(target) {
      if (this._animTimer) {
        clearInterval(this._animTimer)
      }
      const current = this.data._animPercent
      const diff = target - current
      if (Math.abs(diff) < 0.5) {
        this.data._animPercent = target
        this._renderRing(target)
        return
      }

      const steps = 30
      const stepVal = diff / steps
      let step = 0
      const timer = setInterval(() => {
        step++
        const val = current + stepVal * step
        const animPercent = step >= steps ? target : val
        this.data._animPercent = animPercent
        this._renderRing(animPercent)
        if (step >= steps) {
          clearInterval(timer)
          this.data._animTimer = null
        }
      }, 16)
      this.data._animTimer = timer
    },

    _renderRing(percent) {
      if (!this.data._canvasReady) return
      if (this._isOldCanvas) {
        this._drawRingOld(percent)
      } else {
        this._drawRing(percent)
      }
    },

    /**
     * Canvas 2D 绘制（新版）
     */
    _drawRing(percent) {
      const ctx = this._ctx
      const size = this.properties.size
      const sw = this.properties.strokeWidth
      const p = Math.min(100, Math.max(0, percent))

      // 圆心与半径
      const cx = size / 2
      const cy = size / 2
      const radius = (size - sw) / 2

      ctx.clearRect(0, 0, size, size)

      // 底层轨道（半透明）
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = sw
      ctx.lineCap = 'round'
      ctx.stroke()

      if (p <= 0) return

      // 渐变进度弧
      const startAngle = -Math.PI / 2
      const endAngle = startAngle + (Math.PI * 2 * p / 100)

      // 创建渐变
      const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy)
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.6)')
      gradient.addColorStop(0.5, 'rgba(16, 185, 129, 1)')
      gradient.addColorStop(1, 'rgba(52, 211, 153, 0.8)')

      ctx.beginPath()
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.strokeStyle = gradient
      ctx.lineWidth = sw
      ctx.lineCap = 'round'
      ctx.stroke()

      // 进度弧头部发光圆点
      const headX = cx + radius * Math.cos(endAngle)
      const headY = cy + radius * Math.sin(endAngle)
      ctx.beginPath()
      ctx.arc(headX, headY, sw * 0.6, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(52, 211, 153, 0.9)'
      ctx.fill()
    },

    /**
     * 旧版 Canvas 绘制
     */
    _drawRingOld(percent) {
      const ctx = this._ctxOld
      const size = this.properties.size
      const sw = this.properties.strokeWidth
      const p = Math.min(100, Math.max(0, percent))

      const cx = size / 2
      const cy = size / 2
      const radius = (size - sw) / 2

      ctx.clearRect(0, 0, size, size)

      // 底层轨道
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.setStrokeStyle('rgba(255,255,255,0.08)')
      ctx.setLineWidth(sw)
      ctx.setLineCap('round')
      ctx.stroke()

      if (p <= 0) {
        ctx.draw()
        return
      }

      // 渐变进度弧（旧版用分段颜色模拟渐变）
      const startAngle = -Math.PI / 2
      const endAngle = startAngle + (Math.PI * 2 * p / 100)

      const grd = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy)
      grd.addColorStop(0, '#10b981')
      grd.addColorStop(0.5, '#34d399')
      grd.addColorStop(1, '#6ee7b7')

      ctx.beginPath()
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.setStrokeStyle(grd)
      ctx.setLineWidth(sw)
      ctx.setLineCap('round')
      ctx.stroke()

      // 头部发光点
      const headX = cx + radius * Math.cos(endAngle)
      const headY = cy + radius * Math.sin(endAngle)
      ctx.beginPath()
      ctx.arc(headX, headY, sw * 0.6, 0, Math.PI * 2)
      ctx.setFillStyle('#34d399')
      ctx.fill()

      ctx.draw()
    }
  }
})
