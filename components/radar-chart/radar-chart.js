// v4.0 五维属性雷达图组件
// 使用 Canvas 2D 绘制
Component({
  properties: {
    dimensions: { type: Array, value: [] },    // [{ key, name, value, maxValue, color }]
    width: { type: Number, value: 280 },        // Canvas 宽度 (rpx → px 需自行转换)
    height: { type: Number, value: 280 }
  },

  data: {
    canvasId: '',
    chartReady: false
  },

  lifetimes: {
    attached() {
      this.data.canvasId = 'radar-canvas-' + Math.random().toString(36).slice(2, 8)
      this.setData({ canvasId: this.data.canvasId })
    },
    ready() {
      this._draw()
    }
  },

  observers: {
    'dimensions'(dims) {
      if (dims && dims.length) this._draw()
    }
  },

  methods: {
    _draw() {
      var dims = this.data.dimensions
      if (!dims || !dims.length) return

      var w = this.data.width
      var h = this.data.height
      var cx = w / 2
      var cy = h / 2
      var radius = Math.min(w, h) / 2 - 40
      var count = dims.length
      var angleStep = (Math.PI * 2) / count

      var query = wx.createSelectorQuery().in(this)
      query.select('#' + this.data.canvasId).fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        var canvas = res[0].node
        var ctx = canvas.getContext('2d')
        var dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.scale(dpr, dpr)

        ctx.clearRect(0, 0, w, h)

        // 绘制网格（3层）
        for (var layer = 1; layer <= 3; layer++) {
          ctx.beginPath()
          var r = (radius / 3) * layer
          for (var i = 0; i < count; i++) {
            var angle = angleStep * i - Math.PI / 2
            var x = cx + Math.cos(angle) * r
            var y = cy + Math.sin(angle) * r
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.strokeStyle = 'rgba(148,163,184,0.15)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // 绘制轴线
        for (var j = 0; j < count; j++) {
          var a = angleStep * j - Math.PI / 2
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
          ctx.strokeStyle = 'rgba(148,163,184,0.1)'
          ctx.stroke()
        }

        // 绘制数值区域
        ctx.beginPath()
        for (var k = 0; k < count; k++) {
          var a2 = angleStep * k - Math.PI / 2
          var ratio = dims[k].maxValue > 0 ? dims[k].value / dims[k].maxValue : 0
          var vr = radius * Math.max(0.05, ratio)
          var vx = cx + Math.cos(a2) * vr
          var vy = cy + Math.sin(a2) * vr
          if (k === 0) ctx.moveTo(vx, vy)
          else ctx.lineTo(vx, vy)
        }
        ctx.closePath()
        ctx.fillStyle = 'rgba(234,179,8,0.15)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(234,179,8,0.5)'
        ctx.lineWidth = 2
        ctx.stroke()

        // 绘制数据点 + 标签
        for (var m = 0; m < count; m++) {
          var a3 = angleStep * m - Math.PI / 2
          var ratio2 = dims[m].maxValue > 0 ? dims[m].value / dims[m].maxValue : 0
          var vr2 = radius * Math.max(0.05, ratio2)
          var dx = cx + Math.cos(a3) * vr2
          var dy = cy + Math.sin(a3) * vr2

          // 数据点
          ctx.beginPath()
          ctx.arc(dx, dy, 5, 0, Math.PI * 2)
          ctx.fillStyle = dims[m].color || '#eab308'
          ctx.fill()

          // 标签（在数据点外侧）
          ctx.font = '11px sans-serif'
          ctx.fillStyle = '#94a3b8'
          ctx.textAlign = 'center'
          var lx = cx + Math.cos(a3) * (radius + 24)
          var ly = cy + Math.sin(a3) * (radius + 24)
          ctx.fillText(dims[m].name + ' ' + dims[m].value, lx, ly + 4)
        }
      })
    }
  }
})
