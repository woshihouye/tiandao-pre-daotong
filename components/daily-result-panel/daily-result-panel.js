// 底部结果汇总面板组件（综合化：不分类，一个综合结果）
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
      sha: '#6B7280',
      study: '#10B981',
      work: '#3B82F6',
      debuff: '#F97316'
    }
  },

  methods: {}
})
