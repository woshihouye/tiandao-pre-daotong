// 悟道童儿 - 全局悬浮组件
// 右下角浮动道童头像，可拖动，边缘半隐藏，设置中可关闭
// 支持灵珠/魔丸双模式切换
// >>> ENABLE_AI=false 时完全隐藏，不影响提审

const STORAGE_KEY = 'dao_spirit_pos'
const HIDDEN_KEY = 'dao_spirit_hidden'
const MODE_STORAGE_KEY = 'dao_spirit_mode'

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {},

  data: {
    visible: true,
    x: 0,        // 距右边距离 rpx
    y: 200,      // 距底部距离 rpx
    hiddenByEdge: false,  // 是否半隐藏在边缘
    spiritMode: 'lingzhu',  // 'lingzhu' | 'mowan'
    speechBubble: '',
    showSpeech: false
  },

  lifetimes: {
    attached() {
      const app = getApp()

      // >>> AI 功能未启用时，完全隐藏悬浮球
      if (app && app.isAIEnabled && !app.isAIEnabled()) {
        this.setData({ visible: false })
        return
      }

      // 读取设置：是否已关闭
      const hidden = wx.getStorageSync(HIDDEN_KEY)
      if (hidden) {
        this.setData({ visible: false })
        return
      }

      // 恢复上次位置
      const saved = wx.getStorageSync(STORAGE_KEY)
      if (saved) {
        this.setData({ x: saved.x || 0, y: saved.y || 200 })
      }

      // 读取道童模式
      const savedMode = wx.getStorageSync(MODE_STORAGE_KEY) || 'lingzhu'
      this.setData({ spiritMode: savedMode })

      // 监听模式切换事件
      if (app && app.onAppEvent) {
        app.onAppEvent('spiritModeChange', (payload) => {
          if (payload && payload.mode) {
            this.setData({ spiritMode: payload.mode })
          }
        })
      }

      // >>> 系统面板：道童主动搭话定时器（轻量化，60s间隔，不做DB查询）
      var that = this
      this._lastSpeechTime = 0
      this._speechTimer = setInterval(function() {
        var now = Date.now()
        // 距上次搭话超过8分钟才可能再次搭话
        if (now - that._lastSpeechTime < 480000) return
        // 15%概率触发
        if (Math.random() > 0.15) return
        // 直接从全局缓存读，不查DB
        that.speakFromCache()
      }, 60000)
    },

    detached: function() {
      if (this._speechTimer) {
        clearInterval(this._speechTimer)
        this._speechTimer = null
      }
    }
  },

  methods: {
    // 拖动手势
    onTouchStart(e) {
      this._startX = e.touches[0].clientX
      this._startY = e.touches[0].clientY
      this._originX = this.data.x
      this._originY = this.data.y
    },

    onTouchMove(e) {
      // 触控节流：每3帧才更新一次，消除拖动时的 setData 风暴
      if (this._moveThrottle) return
      this._moveThrottle = true
      var that = this
      setTimeout(function() { that._moveThrottle = false }, 50)
      
      const dx = this._startX - e.touches[0].clientX
      const dy = this._startY - e.touches[0].clientY
      const newX = Math.max(-20, this._originX + dx)
      const newY = Math.max(0, Math.min(600, this._originY + dy))
      this.setData({ x: newX, y: newY, hiddenByEdge: false })
    },

    onTouchEnd() {
      // 拖到右边缘 → 半隐藏
      const x = this.data.x
      if (x < 5) {
        this.setData({ x: -28, hiddenByEdge: true })
      } else {
        this.setData({ hiddenByEdge: false })
      }

      // 保存位置
      wx.setStorageSync(STORAGE_KEY, { x: this.data.x, y: this.data.y })
    },

    // 点击 → 进入聊天页
    onTapSpirit() {
      wx.navigateTo({
        url: '/packageD/pages/hedao/chat/chat'
      })
    },

    // 隐藏道童
    hideSpirit() {
      this.setData({ visible: false })
      wx.setStorageSync(HIDDEN_KEY, true)
    },

    // 恢复道童（由设置页调用）
    showSpirit() {
      const app = getApp()
      // 仅在 AI 启用时允许恢复
      if (app && app.isAIEnabled && !app.isAIEnabled()) {
        wx.showToast({ title: 'AI功能未启用', icon: 'none' })
        return
      }
      this.setData({ visible: true })
      wx.removeStorageSync(HIDDEN_KEY)
    },

    // 从全局缓存判断场景并搭话（不查DB）
    speakFromCache: function() {
      var app = getApp()
      if (!app || !app.getDaoSpiritMsg) return
      
      var todayScore = 0
      var hasDebuff = false
      var todayCount = 0
      
      // 从globalData读今日记录缓存（由首页或其他页面维护）
      try {
        var cache = app.globalData._todayRecordsCache
        if (cache && cache.date === this.getTodayDate()) {
          todayScore = cache.score || 0
          hasDebuff = cache.hasDebuff || false
          todayCount = cache.count || 0
        }
      } catch (e) {}
      
      var scenario = 'idle_long'
      if (todayCount > 0) {
        if (hasDebuff) scenario = 'after_debuff'
        else if (todayScore >= 20) scenario = 'high_score'
        else scenario = 'after_record'
      }
      
      var msg = app.getDaoSpiritMsg(scenario)
      if (msg) this.showMessage(msg)
    },

    // @deprecated 旧版DB查询方式，保留但不使用
    checkAndSpeak: function() {
      this.speakFromCache()
    },

    // 展示道童说话气泡
    showMessage: function(msg) {
      var that = this
      this._lastSpeechTime = Date.now()
      this.setData({ speechBubble: msg, showSpeech: true })
      
      // 4秒后自动消失
      setTimeout(function() {
        that.setData({ showSpeech: false })
      }, 4000)
    },

    // 点击气泡关闭
    onTapSpeech: function() {
      this.setData({ showSpeech: false })
    },

    // 获取今天的日期
    getTodayDate: function() {
      var d = new Date()
      return d.getFullYear() + '-' + 
        String(d.getMonth() + 1).padStart(2, '0') + '-' + 
        String(d.getDate()).padStart(2, '0')
    }
  }
})
