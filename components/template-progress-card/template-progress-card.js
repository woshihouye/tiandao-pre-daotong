// 模板进度卡片组件 — 支持展开/收起、双模式拖动

var templateProgress = require('../../utils/template-progress.js')

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    template: {
      type: Object,
      value: {}
    },
    category: {
      type: String,
      value: 'wu'
    },
    expanded: {
      type: Boolean,
      value: false
    },
    activityProgress: {
      type: Object,
      value: {}
    },
    categoryColor: {
      type: String,
      value: '#EF4444'
    }
  },

  data: {
    totalProgress: 0,
    estimatedGong: 0,
    coverText: '',
    dragging: false,
    touchStartY: 0,
    touchStartProgress: 0
  },

  observers: {
    'template, activityProgress': function(template, activityProgress) {
      this.recalcTotalProgress()
      this.recalcEstimatedGong()
      var cover = ''
      if (template && template.cover) {
        cover = template.cover
      } else if (template && template.name) {
        cover = template.name[0]
      } else {
        cover = '修'
      }
      this.setData({ coverText: cover })
    }
  },

  methods: {
    recalcTotalProgress() {
      var total = templateProgress.calcTemplateTotalProgress(
        this.data.template,
        this.data.activityProgress
      )
      this.setData({ totalProgress: total })
    },

    recalcEstimatedGong() {
      var template = this.data.template
      var progress = this.data.activityProgress
      if (!template || !template.activities || !progress) return
      var gong = 0
      for (var i = 0; i < template.activities.length; i++) {
        var act = template.activities[i]
        var pct = progress[act.id] || 0
        gong += (act.scorePerUnit || 0) * pct / 100
      }
      this.setData({ estimatedGong: Math.round(gong * 10) / 10 })
    },

    onToggleExpand() {
      this.triggerEvent('toggle-expand', {
        templateId: this.data.template.id
      })
    },

    onCardTouchStart(e) {
      if (this.data.expanded) return
      this.setData({
        dragging: true,
        touchStartY: e.touches[0].clientY,
        touchStartProgress: this.data.totalProgress
      })
    },

    onCardTouchMove(e) {
      if (!this.data.dragging || this.data.expanded) return
      var deltaY = this.data.touchStartY - e.touches[0].clientY
      var step = Math.round(deltaY / 3)
      var newProgress = this.data.touchStartProgress + step * 5
      newProgress = Math.max(0, Math.min(100, newProgress))
      this.setData({ totalProgress: newProgress })
    },

    onCardTouchEnd() {
      if (!this.data.dragging) return
      this.setData({ dragging: false })
      var activities = this.data.template.activities || []
      var distributed = templateProgress.distributeProgressToActivities(
        this.data.totalProgress,
        activities
      )
      this.triggerEvent('progress-change', {
        templateId: this.data.template.id,
        totalProgress: this.data.totalProgress,
        activityProgress: distributed
      })
    },

    onActivityProgressChange(e) {
      var detail = e.detail
      var newProgress = Object.assign({}, this.data.activityProgress)
      newProgress[detail.activityId] = detail.progress

      var total = templateProgress.calcTemplateTotalProgress(
        this.data.template,
        newProgress
      )

      this.triggerEvent('progress-change', {
        templateId: this.data.template.id,
        totalProgress: total,
        activityProgress: newProgress
      })
    }
  }
})
