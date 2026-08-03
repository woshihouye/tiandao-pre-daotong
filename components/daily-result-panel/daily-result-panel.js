// 底部结果汇总面板组件
var activityMeta = require('../../utils/activity-meta.js')

Component({
  properties: {
    activeCategory: {
      type: String,
      value: 'wu'
    },
    result: {
      type: Object,
      value: {}
    }
  },

  data: {
    categoryColors: {
      wu: '#EF4444',
      shi: '#F59E0B',
      wu2: '#8B5CF6',
      gong: '#3B82F6',
      sha: '#6B7280'
    },
    isShaNegative: false,
    gongSign: '+',
    gongDisplay: 0
  },

  observers: {
    'result, activeCategory': function(result, activeCategory) {
      if (!result) return
      var gong = result.totalGong || 0
      this.setData({
        isShaNegative: activeCategory === 'sha' && gong < 0,
        gongSign: (activeCategory === 'sha' && gong < 0) ? '' : '+',
        gongDisplay: Math.abs(Math.round(gong))
      })
    }
  },

  methods: {}
})
