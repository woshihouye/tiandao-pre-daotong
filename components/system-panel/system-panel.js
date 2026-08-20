/**
 * system-panel - 系统通知面板组件
 * 类似RPG游戏系统对话框，暗色面板 + 光晕边框 + 扫描线特效
 * 五个等级对应不同视觉风格
 */

const LEVEL_CONFIG = {
  info: {
    titlePrefix: '叮！系统提示',
    glowColor: 'rgba(96, 165, 250, 0.3)',
    borderColor: 'rgba(96, 165, 250, 0.4)',
    iconClass: 'icon-info',
    iconChar: '讯'
  },
  progress: {
    titlePrefix: '修炼进展',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
    iconClass: 'icon-progress',
    iconChar: '修'
  },
  milestone: {
    titlePrefix: '里程碑达成',
    glowColor: 'rgba(255, 215, 0, 0.4)',
    borderColor: 'rgba(255, 215, 0, 0.55)',
    iconClass: 'icon-milestone',
    iconChar: '碑'
  },
  breakthrough: {
    titlePrefix: '突破！境界提升',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    borderColor: 'rgba(168, 85, 247, 0.6)',
    iconClass: 'icon-breakthrough',
    iconChar: '破'
  },
  glory: {
    titlePrefix: '天道荣光',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    borderColor: 'rgba(236, 72, 153, 0.5)',
    iconClass: 'icon-glory',
    iconChar: '光'
  }
}

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    /** 通知标题 */
    title: {
      type: String,
      value: ''
    },
    /** 通知内容 */
    message: {
      type: String,
      value: ''
    },
    /** 通知等级 */
    level: {
      type: String,
      value: 'info'
    },
    /** 是否显示图标 */
    showIcon: {
      type: Boolean,
      value: true
    }
  },

  data: {
    _animating: false,
    _levelTitle: '',
    _iconChar: '',
    _iconClass: ''
  },

  lifetimes: {
    attached() {
      this._applyLevel()
    },
    ready() {
      // 入场动画延迟触发
      setTimeout(() => {
        this.setData({ _animating: true })
      }, 100)
    }
  },

  observers: {
    'level': function(newLevel) {
      this._applyLevel(newLevel)
    }
  },

  methods: {
    _applyLevel(level) {
      const lvl = level || this.properties.level
      const config = LEVEL_CONFIG[lvl] || LEVEL_CONFIG.info
      this.setData({
        _levelTitle: config.titlePrefix,
        _iconChar: config.iconChar,
        _iconClass: config.iconClass
      })
    }
  }
})
