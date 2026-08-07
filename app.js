// 小程序入口文件

// ============================================================
// >>> AI 配置（通过云函数环境变量注入API Key）
// >>> ENABLE_AI 可通过管理设置页关闭（存储key: tiandao_enable_ai） 
// ============================================================
const ENABLE_AI = true

/**
 * 运行时读取AI开关状态
 * 默认开启，可通过管理设置页关闭
 */
function getEnableAI() {
  try {
    const stored = wx.getStorageSync('tiandao_enable_ai')
    if (stored !== '' && stored !== undefined && stored !== null) return stored === 'true' || stored === true
  } catch (e) {}
  return true
}

// 本地缓存键统一收口，避免各页面散落硬编码。
const STORAGE_KEYS = {
  userId: 'tiandao_user_id',
  cultivationSystem: 'tiandao_cultivation_system',
  bodyProfile: 'tiandao_body_profile',
  currentTemplate: 'tiandao_current_template',
  mainTemplate: 'tiandao_main_template',
  sideTemplates: 'tiandao_side_templates',
  // >>> 单日已获正分 / 已扣分缓存，供上限与扣分下限校验
  dailyScoreLedger: 'tiandao_daily_score_ledger',
  // >>> 历史录入记忆快照，按类型缓存最近一次录入值
  lastRecordSnapshot: 'tiandao_last_record_snapshot',
  // >>> 自定义道则体系数据
  customDaoze: 'tiandao_custom_daoze',
  // >>> 修炼模式（轻松/一般/严格/毒舌）
  practiceMode: 'tiandao_practice_mode',
  // >>> 道牒称号系统
  equippedTitle: 'tiandao_equipped_title',
  titleUnlockCache: 'tiandao_title_unlock_cache',
  titleCheckDate: 'tiandao_title_check_date',
  signaturePoem: 'tiandao_signature_poem',
  lastOnlineAt: 'tiandao_last_online_at',
  subscribeMsgStatus: 'tiandao_subscribe_msg_status',
  // >>> 系统面板
  dailyTasks: 'tiandao_daily_tasks',
  dailyFortune: 'tiandao_daily_fortune',
  lastRealmIndex: 'tiandao_last_realm_index',
  systemAnnouncement: 'tiandao_system_announcement',
  lastDaoSpiritMsg: 'tiandao_last_dao_spirit_msg',
  unreadBadge: 'tiandao_unread_badge',
  // >>> 安全身份标识（基于openid）
  safeUserId: 'tiandao_safe_user_id'
}

/**
 * >>> 记录状态常量
 * confirmed：正式记录（印证道行），计入修为计算
 * pending：待印证暂存，不计入修为，须用户手动确认
 */
const RECORD_STATUS = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending'
}

// 修炼体系白名单。
// 兼容当前项目中已接入的所有体系 key。
// >>> beauty（养气/小美）、worldly（入世/打工人）以联动人生模板
const VALID_CULTIVATION_SYSTEMS = [
  'traditional',
  'body',
  'beauty',
  'worldly',
  'wuxia',
  'ninja',
  'knight',
  'sequence',
  'cthulhu'
]

const VALID_GOALS = ['gain', 'maintain', 'cut']
const VALID_TRAINING_EXPERIENCE = ['0-3个月', '3-12个月', '1-3年', '3-5年', '5年以上']

// ============================================================
// >>> 新增：全局公平积分配置（约 12 个月成长周期对齐）
// ============================================================

/**
 * 各模板/体系每日基准分与单日上限。
 * 境界阈值按 baseScore 动态生成，保证各体系升满大周期接近。
 * 未单独配置的体系回落到 traditional。
 */
// >>> v3.1 统一境界阈值：所有体系 baseScore=40，消除体系间晋升节奏差
// 原值：body=45, traditional=40, worldly=38, beauty=32
// 统一后，所有体系升满四境所需总修为 ~19,800（约12个月）
// dailyLimit 保持差异化，代表不同体系每日可获上限
const TEMPLATE_DAILY_BASE_SCORE = {
  body: { baseScore: 40, dailyLimit: 60 },
  beauty: { baseScore: 40, dailyLimit: 40 },
  traditional: { baseScore: 40, dailyLimit: 50 },
  worldly: { baseScore: 40, dailyLimit: 45 },
  custom: { baseScore: 40, dailyLimit: 45 }
}

// >>> v3.1 统一量化开关：设为 true 后所有计分走 unified-score.js 引擎
const USE_UNIFIED_SCORING = true

/**
 * 统一任务打分系数（所有任务结算应优先走 calcTaskScore）
 */
const TASK_SCORE_COEFFICIENT = {
  strength: 2, // 力量训练：每组
  cardio: 0.3, // 有氧运动：每分钟
  stretch: 0.1, // 拉伸冥想：每分钟
  study: 0.15, // 修心学习：每分钟
  work: 0.15, // 功业产出：每分钟（和 study 统一系数，保证公平）
  daily: 2, // 日常打卡：每项
  diet_healthy: 3, // 健康饮食：每餐
  diet_unhealthy: -3, // 垃圾饮食：每餐
  demon: -3 // 心魔标记：每次
}

/**
 * 加成规则：连续打卡 + 体系匹配，叠加不超过 total_cap
 */
const BONUS_RULES = {
  streak_7: 0.05,
  streak_30: 0.1,
  streak_100: 0.15,
  system_match: 0.2,
  total_cap: 0.35,
  merit_cap: 0.07,               // 功德加成单独上限 7%
  title_cap: 0.15,               // 称号加成分项上限（不变）
  template_cap: 0.20              // 模板加成分项上限（不变）
}

/** 单日扣分最多 10 分，防止一日扣穿 */
const DAILY_DEDUCT_LIMIT = 10

/** 自定义模板防刷：单任务最高分（与 life-template 对齐） */
const CUSTOM_TASK_MAX_REWARD = 3

/**
 * >>> 修炼模式（轻松/一般/严格/毒舌）
 * 一周一锁，选择后7天内不可更改
 */
const PRACTICE_MODES = {
  EASY: { key: 'easy', label: '轻松', desc: '自由修炼，无硬性考核' },
  NORMAL: { key: 'normal', label: '一般', desc: '标准修炼节奏' },
  STRICT: { key: 'strict', label: '严格', desc: '高标准考核，懈怠有罚' },
  SHARP: { key: 'sharp', label: '毒舌', desc: '毒舌鞭策，强力督促' }
}

/** 默认修炼模式 */
const DEFAULT_PRACTICE_MODE = 'normal'

/**
 * >>> 媒体权重加成规则
 * 无媒体=1.0x，相关实拍图=1.5x，相关实拍视频=2.0x
 * 同时传图和视频取最高2.0x，权重不叠加
 */
const MEDIA_WEIGHT = {
  NONE: 1.0,
  IMAGE: 1.5,
  VIDEO: 2.0
}

/**
 * 大境界每阶阈值倍率（相对每日基准分）
 * 第1境快、第4境慢，整体约一年节奏
 */
const REALM_STAGE_MULTIPLIERS = [3, 7, 15, 30]

const REALM_META = [
  { id: 'lianqi', color: '#9ca3af' },
  { id: 'zhuji', color: '#22c55e' },
  { id: 'jindan', color: '#eab308' },
  { id: 'yuanying', color: '#8b5cf6' }
]

/**
 * >>> 修改：废弃固定全局阈值，按体系 baseScore 动态生成四大境界配置
 * 每个大境界 9 小阶；perStage = baseScore * 倍率
 */
function buildRealmConfigByBaseScore(baseScore = 40) {
  const safeBase = Math.max(1, Number(baseScore) || 40)
  let cursor = 0
  return REALM_META.map((meta, index) => {
    const perStage = Math.max(1, Math.round(safeBase * REALM_STAGE_MULTIPLIERS[index]))
    const span = perStage * 9
    const minScore = cursor
    const maxScore = index === REALM_META.length - 1 ? Infinity : cursor + span - 1
    cursor += span
    return {
      id: meta.id,
      color: meta.color,
      stages: 9,
      perStage,
      minScore,
      maxScore
    }
  })
}

/**
 * 将修炼体系 / 模板映射到公平积分配置 key
 */
function resolveBalanceSystemKey(systemKey = 'traditional', template = null) {
  if (template) {
    if (template.category === 'custom' || template.id === 'custom') {
      return 'custom'
    }
    const fromTemplateSystem = template.cultivationSystem
    if (TEMPLATE_DAILY_BASE_SCORE[fromTemplateSystem]) {
      return fromTemplateSystem
    }
    if (template.id === 'thin_muscle') return 'body'
    if (template.id === 'beauty') return 'beauty'
    if (template.id === 'wu' || template.id === 'scholar') return 'traditional'
    if (template.id === 'gong' || template.id === 'worker') return 'worldly'
  }

  if (TEMPLATE_DAILY_BASE_SCORE[systemKey]) {
    return systemKey
  }

  // 其余主题体系统一按 traditional 节奏，避免刷分差异
  return 'traditional'
}

function getBalanceConfig(systemKey = 'traditional', template = null) {
  const key = resolveBalanceSystemKey(systemKey, template)
  return TEMPLATE_DAILY_BASE_SCORE[key] || TEMPLATE_DAILY_BASE_SCORE.traditional
}

// >>> 兼容：保留 REALM_CONFIG 符号，改为 traditional 默认动态阈值，避免外部引用报错
const REALM_CONFIG = buildRealmConfigByBaseScore(TEMPLATE_DAILY_BASE_SCORE.traditional.baseScore)

const REALM_NAME_MAP = {
  traditional: ['炼精化气', '炼气化神', '炼神还虚', '炼虚合道'],
  body: ['炼体境', '锻骨境', '玉髓境', '金身境'],
  beauty: ['淬颜境', '玉容境', '凝脂境', '倾世境'],
  worldly: ['执事境', '主事境', '掌事境', '宗匠境'],
  // >>> 悟模板 / 工模板专属称号（切换主修时优先取模板 realmNames，此处作体系兜底）
  wu: ['闻道境', '见道境', '明道境', '得道境'],
  gong: ['执事境', '主事境', '掌事境', '宗匠境'],
  wuxia: ['后天境', '先天境', '宗师境', '大宗师境'],
  ninja: ['下忍', '中忍', '特别上忍', '上忍'],
  knight: ['见习骑士', '正式骑士', '青铜骑士', '白银骑士'],
  sequence: ['序列9', '序列8', '序列7', '序列6'],
  cthulhu: ['懵懂凡人', '浅度接触', '深度沉迷', '密教学徒']
}

const INIT_TIMEOUT_MS = 2000

App({
  onLaunch() {
    console.log('天道修行小程序启动')

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      this.globalData.userId = this.getLocalUserId()
      this.globalData.cultivationSystem = this.getCultivationSystem()
      this.globalData.bodyProfile = this.getLocalBodyProfile()
      const fallbackProfile = this.createDefaultUserProfile()
      this.globalData.userProfile = fallbackProfile
      this.initPromise = Promise.resolve(fallbackProfile)
      return
    }

    wx.cloud.init({
      env: 'cloudbase-d9gymqfdb305568c7',
      traceUser: true
    })

    // 获取真实openid并持久化（异步，不阻塞启动流程）
    var that = this
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: function(res) {
        if (res.result && res.result.openid) {
          var safeId = res.result.openid
          wx.setStorageSync(STORAGE_KEYS.safeUserId, safeId)
          that.globalData.userId = safeId
        }
      },
      fail: function(e) {
        console.warn('获取openid失败，使用本地ID', e)
      }
    })

    // 启动时验证 ai-vision 云函数连通性
    wx.cloud.callFunction({
      name: 'ai-vision',
      data: { fileID: 'cloud://ping-test' },
      success: res => console.log('ai-vision 云函数在线'),
      fail: err => console.warn('ai-vision 云函数未部署:', err.errMsg)
    })

    // 启动阶段同步挂载基础运行态。
    this.globalData.db = wx.cloud.database()
    this.globalData.userId = this.getLocalUserId()
    this.globalData.cultivationSystem = this.getCultivationSystem()
    this.globalData.bodyProfile = this.getLocalBodyProfile()

    // 异步初始化 Promise 挂载到全局，页面可直接 await。
    this.initPromise = this.initApp()

    // >>> 全局未读消息轮询（每60秒）
    var that = this
    this._badgeTimer = setInterval(function() {
      if (that._badgeChecking) return
      that._badgeChecking = true
      wx.cloud.callFunction({
        name: 'message-center',
        data: { action: 'getConversations', params: { userId: that.globalData.userId, page: 1, pageSize: 50 } }
      }).then(function(res) {
        var result = res.result || {}
        if (result.ok) {
          var total = 0
          var userId = that.globalData.userId
          ;(result.conversations || []).forEach(function(c) {
            total += (c.unreadCount && c.unreadCount[userId]) || 0
          })
          that.globalData._unreadTotal = total
          try { wx.setStorageSync(STORAGE_KEYS.unreadBadge, total) } catch (e) {}
          // 更新tabBar角标
          if (total > 0) {
            wx.setTabBarBadge({ index: 4, text: total > 99 ? '99+' : String(total) })
          } else {
            wx.removeTabBarBadge({ index: 4 })
          }
        }
      }).catch(function() {}).finally(function() {
        that._badgeChecking = false
      })
    }, 60000)

    // >>> 更新在线状态
    this.updateOnlineStatus(true)
  },

  onShow: function() {
    this.updateOnlineStatus(true)
  },

  onHide: function() {
    this.updateOnlineStatus(false)
  },

  globalData: {
    db: null,
    userId: '',
    version: 'v2.0.0',
    todayScore: 0,
    enableAI: ENABLE_AI,
    themeTargetScore: 20,
    cultivationSystem: 'traditional',
    bodyProfile: null,
    userProfile: null,
    // >>> 历史录入记忆快照
    lastRecordSnapshot: {},
    // >>> 多选模板：证道主修(1) + 旁门辅修(多)
    currentTemplate: null,
    mainTemplate: null,
    sideTemplates: [],
    // >>> 公平积分配置挂载，便于调试与页面只读
    scoreBalance: {
      TEMPLATE_DAILY_BASE_SCORE,
      TASK_SCORE_COEFFICIENT,
      BONUS_RULES,
      DAILY_DEDUCT_LIMIT,
      CUSTOM_TASK_MAX_REWARD,
      USE_UNIFIED_SCORING
    },
    // >>> 道牒称号系统
    equippedTitle: null,
    titleStats: null,
    titleUnlockCache: [],
    lastRealmIndex: -1,
    lastDaoSpiritMsg: '',
    signaturePoem: ''
  },

  // 统一启动初始化流程，避免页面各自重复拉起初始化。
  async initApp() {
    const timeoutProfile = this.createDefaultUserProfile()
    let timer = null

    try {
      const profile = await Promise.race([
        this.ensureUserProfile(),
        new Promise((resolve) => {
          timer = setTimeout(() => {
            console.warn(`小程序初始化超过 ${INIT_TIMEOUT_MS}ms，使用默认档案兜底`)
            resolve(timeoutProfile)
          }, INIT_TIMEOUT_MS)
        })
      ])

      // >>> 每日首次启动时刷新模板等级（不依赖打卡行为）
      this._dailyStartupRefresh().catch(() => {})

      return profile
    } catch (error) {
      console.error('小程序初始化失败', error)
      return this.createDefaultUserProfile()
    } finally {
      if (timer) {
        clearTimeout(timer)
      }
    }
  },

  /**
   * 更新用户在线状态
   * @param {boolean} isOnline - 是否在线
   */
  updateOnlineStatus: function(isOnline) {
    var that = this
    var now = Date.now()
    var userId = this.globalData.userId
    if (!userId) return

    // 节流：30秒内不重复写库
    var lastWrite = this.globalData._lastOnlineWrite || 0
    if (isOnline && now - lastWrite < 30000) return

    var db = this.globalData.db
    if (!db) return

    var updateData = { lastOnlineAt: now }
    if (isOnline) {
      updateData.isOnline = true
    } else {
      updateData.isOnline = false
    }

    // 先尝试更新已有文档
    db.collection('users').where({ userId: userId }).limit(1).get().then(function(res) {
      if (res.data && res.data.length > 0) {
        db.collection('users').doc(res.data[0]._id).update({ data: updateData })
      }
      that.globalData._lastOnlineWrite = now
    }).catch(function() {})
  },

  /**
   * 请求订阅消息授权
   * @param {Array<string>} tmplIds - 模板ID列表
   */
  requestSubscribeMsg: function(tmplIds) {
    if (!tmplIds || tmplIds.length === 0) {
      tmplIds = ['TEMPLATE_NEW_MESSAGE', 'TEMPLATE_NEW_FOLLOWER']  // 需替换为实际模板ID
    }
    var that = this
    wx.requestSubscribeMessage({
      tmplIds: tmplIds,
      success: function(res) {
        // 记录订阅状态
        try { wx.setStorageSync(STORAGE_KEYS.subscribeMsgStatus, JSON.stringify(res)) } catch (e) {}
        console.log('[订阅消息] 授权结果:', JSON.stringify(res))
      },
      fail: function(err) {
        console.log('[订阅消息] 授权失败:', err)
      }
    })
  },

  /**
   * >>> 每日首次启动时刷新模板等级
   * 仅在当天未执行过时触发，避免重复计算
   */
  async _dailyStartupRefresh() {
    const today = this.getTodayDate()
    const lastRefreshKey = 'tiandao_daily_template_refresh'
    try {
      const lastDate = wx.getStorageSync(lastRefreshKey) || ''
      if (lastDate === today) return
      await this.refreshTemplateLevelsAfterCheckin()
      wx.setStorageSync(lastRefreshKey, today)
    } catch (_) { /* 静默失败，不影响主流程 */ }
  },

  waitForInit() {
    return (this.initPromise || Promise.resolve(this.createDefaultUserProfile()))
      .catch((error) => {
        console.error('等待初始化完成失败', error)
        return this.createDefaultUserProfile()
      })
  },

  getDb() {
    return this.globalData.db
  },

  getLocalUserId() {
    // 优先使用云函数返回的真实openid
    let userId = wx.getStorageSync(STORAGE_KEYS.safeUserId)
    if (userId) return userId

    // 兼容旧版本地ID
    userId = wx.getStorageSync(STORAGE_KEYS.userId)
    if (userId) return userId

    // 生成临时ID（后续会被openid覆盖）
    userId = `dao-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    wx.setStorageSync(STORAGE_KEYS.userId, userId)
    return userId
  },

  createDefaultUserProfile(overrides = {}) {
    const userId = this.globalData.userId || this.getLocalUserId()
    const bodyProfile = this.globalData.bodyProfile || this.getLocalBodyProfile()
    const cultivationSystem = this.globalData.cultivationSystem || this.getCultivationSystem()
    const defaultProfile = {
      userId,
      nickName: `道友${String(userId).slice(-4)}`,
      totalCultivation: 0,
      totalScore: 0,
      streakDays: 0,
      lastCheckInDate: '',
      learningTemplateId: '',
      learningTemplateName: '',
      // >>> 人生模板：主修 + 辅修
      currentTemplate: this.globalData.currentTemplate || wx.getStorageSync(STORAGE_KEYS.currentTemplate) || null,
      mainTemplate: this.globalData.mainTemplate || wx.getStorageSync(STORAGE_KEYS.mainTemplate) || null,
      sideTemplates: this.globalData.sideTemplates || wx.getStorageSync(STORAGE_KEYS.sideTemplates) || [],
      dailyMatch: 0,
      weeklyMatch: 0,
      totalProgress: 0,
      estimatedDays: 30,
      sectId: '',
      sectName: '',
      sectRole: '',
      mainTemplateBonus: false,
      // >>> 历史录入记忆快照，初始为空对象
      lastRecordSnapshot: this.globalData.lastRecordSnapshot || wx.getStorageSync(STORAGE_KEYS.lastRecordSnapshot) || {},
      cultivationSystem,
      bodyProfile,
      signaturePoem: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    return {
      ...defaultProfile,
      ...overrides
    }
  },

  // 统一修炼体系入参，保证所有页面读取到的都是合法 key。
  normalizeCultivationSystem(systemKey = 'traditional') {
    return VALID_CULTIVATION_SYSTEMS.includes(systemKey) ? systemKey : 'traditional'
  },

  // 统一身体数据结构，避免页面直接读到异常值导致计算波动。
  normalizeBodyProfile(profile = {}) {
    const toRangeNumber = (value, min, max, optional = false) => {
      if (value === '' || value === null || value === undefined) {
        return optional ? '' : null
      }
      const numberValue = Number(value)
      if (!Number.isFinite(numberValue)) {
        return optional ? '' : null
      }
      return Math.max(min, Math.min(max, numberValue))
    }

    return {
      height: toRangeNumber(profile.height, 100, 250),
      weight: toRangeNumber(profile.weight, 30, 300),
      age: toRangeNumber(profile.age, 10, 100),
      gender: profile.gender === 'female' ? 'female' : profile.gender === 'male' ? 'male' : '',
      goal: VALID_GOALS.includes(profile.goal) ? profile.goal : 'maintain',
      trainingExperience: VALID_TRAINING_EXPERIENCE.includes(profile.trainingExperience)
        ? profile.trainingExperience
        : '0-3个月',
      bodyFat: toRangeNumber(profile.bodyFat, 3, 60, true)
    }
  },

  getCultivationSystem() {
    const stored = wx.getStorageSync(STORAGE_KEYS.cultivationSystem)
    const nextSystem = this.normalizeCultivationSystem(stored || this.globalData.cultivationSystem || 'traditional')
    this.globalData.cultivationSystem = nextSystem
    return nextSystem
  },

  // 修炼体系切换时，同步本地缓存、全局状态与云端用户档案。
  async setCultivationSystem(systemKey = 'traditional') {
    const nextSystem = this.normalizeCultivationSystem(systemKey)
    const previousSystem = this.globalData.cultivationSystem

    wx.setStorageSync(STORAGE_KEYS.cultivationSystem, nextSystem)
    this.globalData.cultivationSystem = nextSystem

    try {
      const profile = await this.ensureUserProfile()
      if (profile && profile._id && profile.cultivationSystem !== nextSystem) {
        await this.getDb().collection('users').doc(profile._id).update({
          data: {
            cultivationSystem: nextSystem,
            updatedAt: Date.now()
          }
        })
        this.syncUserProfile({ cultivationSystem: nextSystem, updatedAt: Date.now() })
      }
    } catch (error) {
      console.error('同步修炼体系失败', error)
    }

    if (previousSystem !== nextSystem) {
      this.emitAppEvent('cultivation-system-changed', { systemKey: nextSystem })
      this.refreshCultivationPages('cultivation-system-changed')
    }

    return nextSystem
  },

  getLocalBodyProfile() {
    const storedProfile = wx.getStorageSync(STORAGE_KEYS.bodyProfile) || {}
    const normalized = this.normalizeBodyProfile(storedProfile)
    this.globalData.bodyProfile = normalized
    return normalized
  },

  setLocalBodyProfile(profile = {}) {
    const normalized = this.normalizeBodyProfile(profile)
    wx.setStorageSync(STORAGE_KEYS.bodyProfile, normalized)
    this.globalData.bodyProfile = normalized
    this.emitAppEvent('body-profile-changed', { bodyProfile: normalized })
    return normalized
  },

  // App 级事件总线：用于全局刷新和页面轻量通信。
  onAppEvent(eventName, handler) {
    if (!eventName || typeof handler !== 'function') {
      return () => {}
    }
    if (!this._eventBus) {
      this._eventBus = {}
    }
    if (!this._eventBus[eventName]) {
      this._eventBus[eventName] = new Set()
    }
    this._eventBus[eventName].add(handler)
    return () => this.offAppEvent(eventName, handler)
  },

  offAppEvent(eventName, handler) {
    if (!this._eventBus || !this._eventBus[eventName]) {
      return
    }
    this._eventBus[eventName].delete(handler)
  },

  emitAppEvent(eventName, payload = {}) {
    if (!this._eventBus || !this._eventBus[eventName]) {
      return
    }
    this._eventBus[eventName].forEach((handler) => {
      try {
        handler(payload)
      } catch (error) {
        console.error(`事件「${eventName}」触发失败`, error)
      }
    })
  },

  // >>> 云函数/数据库操作重试机制（最多重试1次，网络异常时使用）
  withRetry(fn, maxRetries = 1, label = '') {
    return async (...args) => {
      let lastError = null
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn(...args)
        } catch (error) {
          lastError = error
          if (attempt < maxRetries) {
            console.warn(`[retry] ${label || '操作'} 失败，第${attempt + 1}次重试`, error.message || error)
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
          }
        }
      }
      throw lastError
    }
  },

  // 统一刷新主要修行页面，同时广播事件，兼容显式方法调用与事件订阅两种模式。
  refreshCultivationPages(reason = 'manual') {
    this.emitAppEvent('refresh-cultivation-pages', { reason })

    const pages = getCurrentPages()
    pages.forEach((page) => {
      if (!page || typeof page !== 'object') {
        return
      }
      if (page.route === 'pages/index/index' && typeof page.loadUserData === 'function') {
        page.loadUserData()
      } else if (page.route === 'pages/profile/profile' && typeof page.loadStats === 'function') {
        page.loadStats()
      } else if (page.route === '/packageA/pages/detail-board/detail-board' && typeof page.loadBoardData === 'function') {
        page.loadBoardData(false)
      } else if (page.route === '/packageA/pages/cultivation/cultivation' && typeof page.loadCultivationPanel === 'function') {
        page.loadCultivationPanel()
      } else if (page.route === 'packageB/pages/settings/settings' && typeof page.restoreSettings === 'function') {
        page.restoreSettings()
      } else if (page.route === '/packageA/pages/foundation-technique/foundation-technique' && typeof page.loadTechniqueData === 'function') {
        page.loadTechniqueData()
      }
    })
  },

  showSystemToast(message, icon = 'none', duration = 2200) {
    wx.showToast({
      title: `叮，系统提示：${message}`,
      icon,
      duration
    })
  },

  showSystemSuccess(message, duration = 2200) {
    this.showSystemToast(message, 'success', duration)
  },

  showSystemError(message, duration = 2200) {
    this.showSystemToast(message, 'none', duration)
  },

  showSystemLoading(message = '天机推演中...') {
    wx.showLoading({
      title: message,
      mask: true
    })
  },

  hideSystemLoading() {
    wx.hideLoading()
  },

  showSystemModal(content, confirmText = '领命') {
    return new Promise((resolve) => {
      wx.showModal({
        title: '叮，系统提示',
        content,
        confirmText,
        cancelText: '稍后',
        success: resolve
      })
    })
  },

  getTodayDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 连续修行天数计算：支持传入日期字符串数组或带 date 字段的记录数组。
  calcStreakDays(records = []) {
    if (!Array.isArray(records) || !records.length) {
      return 0
    }

    const formatDate = (value) => {
      if (!value) return ''
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value
      }
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return ''
      }
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const uniqueDates = [
      ...new Set(
        records
          .map((item) => (typeof item === 'string' ? item : item.date))
          .map((item) => formatDate(item))
          .filter(Boolean)
      )
    ].sort().reverse()

    if (!uniqueDates.length) {
      return 0
    }

    let streak = 0
    const cursor = new Date()

    for (let i = 0; i < 365; i++) {
      const currentDate = formatDate(cursor)
      if (uniqueDates.includes(currentDate)) {
        streak += 1
      } else if (i > 0) {
        break
      }
      cursor.setDate(cursor.getDate() - 1)
    }

    return streak
  },

  // ============================================================
  // >>> 新增 / 重构：公平积分与动态境界
  // ============================================================

  /**
   * >>> 新增：读取当前体系/模板的每日基准配置
   */
  getTemplateDailyBalance() {
    const systemKey = this.getCultivationSystem()
    const template = this.getCurrentTemplate()
    return getBalanceConfig(systemKey, template)
  },

  /**
   * >>> 新增：按当前体系动态生成境界阈值表
   * 自定义模板可保留专属称号，但阈值强制走 custom 基准，不可自定义阈值
   */
  getRealmConfigForSystem(systemKey, template = null) {
    const balanceKey = resolveBalanceSystemKey(systemKey, template)
    // 自定义模板：名称可自定义，阈值固定按 custom.baseScore
    const effectiveTemplate = balanceKey === 'custom'
      ? { ...(template || {}), category: 'custom', cultivationSystem: 'custom' }
      : template
    const balance = getBalanceConfig(systemKey, effectiveTemplate)
    return buildRealmConfigByBaseScore(balance.baseScore)
  },

  /**
   * >>> 修改：根据当前体系动态计算境界；总修为数值不变，仅阈值适配
   * 入参出参格式保持兼容：返回 { id, name, stage, remaining, perStage, ... }
   */
  getRealmByScore(score = 0) {
    const safeScore = Math.max(0, Number(score) || 0)
    const systemKey = this.getCultivationSystem()
    const template = this.getMainTemplate() || this.getCurrentTemplate()
    const realmConfig = this.getRealmConfigForSystem(systemKey, template)

    let names = REALM_NAME_MAP[systemKey] || REALM_NAME_MAP.traditional
    if (template && Array.isArray(template.realmNames) && template.realmNames.length >= 4) {
      names = template.realmNames
    } else if (template && template.id === 'wu') {
      names = REALM_NAME_MAP.wu
    } else if (template && template.id === 'gong') {
      names = REALM_NAME_MAP.gong
    }

    for (let i = realmConfig.length - 1; i >= 0; i--) {
      const realm = realmConfig[i]
      if (safeScore >= realm.minScore) {
        const progressInRealm = safeScore - realm.minScore
        const stage = Math.min(realm.stages, Math.floor(progressInRealm / realm.perStage) + 1)
        const nextStageScore = realm.minScore + stage * realm.perStage
        return {
          ...realm,
          name: names[i] || REALM_NAME_MAP.traditional[i],
          stage,
          progressInRealm,
          nextStageScore,
          remaining: Math.max(0, nextStageScore - safeScore)
        }
      }
    }

    const first = realmConfig[0]
    return {
      ...first,
      name: names[0] || REALM_NAME_MAP.traditional[0],
      stage: 1,
      progressInRealm: 0,
      nextStageScore: first.perStage,
      remaining: first.perStage
    }
  },

  /**
   * >>> 新增：连续打卡加成比率（不含体系匹配）
   */
  getStreakBonusRate(streakDays = 0) {
    const days = Math.max(0, Number(streakDays) || 0)
    if (days >= 100) return BONUS_RULES.streak_100
    if (days >= 30) return BONUS_RULES.streak_30
    if (days >= 7) return BONUS_RULES.streak_7
    return 0
  },

  /**
   * >>> 新增：统一任务打分
   * @param {string} taskType TASK_SCORE_COEFFICIENT 的 key
   * @param {number} unit 组数 / 分钟 / 次数
   * @param {boolean} hasSystemBonus 是否享受模板匹配体系加成
   * @returns {number} 最终得分（整数；扣分为负）
   */
  calcTaskScore(taskType, unit = 1, hasSystemBonus = false) {
    try {
      const coeff = TASK_SCORE_COEFFICIENT[taskType]
      if (coeff === undefined) {
        console.warn(`未知任务类型「${taskType}」，按 0 分处理`)
        return 0
      }

      const safeUnit = Math.max(0, Number(unit) || 0)
      const raw = coeff * safeUnit

      // 扣分不加加成，直接取整
      if (raw <= 0) {
        return Math.floor(raw)
      }

      const profile = this.globalData.userProfile || {}
      const streakDays = Number(profile.streakDays || 0)
      let bonusRate = this.getStreakBonusRate(streakDays)
      if (hasSystemBonus) {
        bonusRate += BONUS_RULES.system_match
      }
      bonusRate = Math.min(bonusRate, BONUS_RULES.total_cap)

      return Math.max(0, Math.floor(raw * (1 + bonusRate)))
    } catch (error) {
      console.error('calcTaskScore 失败', error)
      return 0
    }
  },

  /**
   * >>> 新增：当前体系单日积分上限
   */
  getDailyScoreLimit() {
    try {
      const balance = this.getTemplateDailyBalance()
      return Math.max(1, Number(balance.dailyLimit) || 45)
    } catch (error) {
      return TEMPLATE_DAILY_BASE_SCORE.traditional.dailyLimit
    }
  },

  /**
   * >>> 新增：单日正分/扣分台账（本地），配合云端今日分做双保险
   */
  getDailyScoreLedger() {
    const today = this.getTodayDate()
    try {
      const stored = wx.getStorageSync(STORAGE_KEYS.dailyScoreLedger) || {}
      if (stored.date !== today) {
        return { date: today, gained: 0, deducted: 0 }
      }
      return {
        date: today,
        gained: Math.max(0, Number(stored.gained) || 0),
        deducted: Math.max(0, Number(stored.deducted) || 0)
      }
    } catch (error) {
      return { date: today, gained: 0, deducted: 0 }
    }
  },

  saveDailyScoreLedger(ledger) {
    try {
      wx.setStorageSync(STORAGE_KEYS.dailyScoreLedger, {
        date: ledger.date || this.getTodayDate(),
        gained: Math.max(0, Number(ledger.gained) || 0),
        deducted: Math.max(0, Number(ledger.deducted) || 0)
      })
    } catch (error) {
      console.error('写入单日积分台账失败', error)
    }
  },

  /**
   * >>> v3.1 统一量化引擎：获取当日三层上限余额
   * 桥接旧 dailyScoreLedger 到 unified-score.js 的 L1/L2/L3 体系
   */
  getUnifiedDailyCap(opts) {
    try {
      var unifiedScore = require('./utils/unified-score.js')
      var ledger = this.getDailyScoreLedger()
      var systemKey = this.getCultivationSystem()
      // 映射体系 key 到统一引擎的 systemKey
      var mappedKey = resolveBalanceSystemKey(systemKey, this.getMainTemplate() || this.getCurrentTemplate())
      return unifiedScore.getRemainingCap(
        mappedKey,
        Number(opts && opts.todayMainGained) || ledger.gained || 0,
        Number(opts && opts.todaySubGained) || 0,
        Number(opts && opts.todayBonusGained) || 0
      )
    } catch (error) {
      console.error('获取统一上限余额失败', error)
      return { systemKey: 'traditional', dailyLimit: 50, L1_remain: 50, L2_remain: 40, L3_remain: 75 }
    }
  },

  /**
   * >>> 新增：按公平规则裁剪本次加减分
   * - 正分：不超过单日上限剩余额度
   * - 负分：单日扣分最多 10，且总修为不会变为负数
   */
  clampScoreDelta(delta, options = {}) {
    const changeValue = Number(delta) || 0
    if (!changeValue) {
      return { applied: 0, capped: false, reason: 'zero' }
    }

    const ledger = this.getDailyScoreLedger()
    const profile = this.globalData.userProfile || {}
    const currentTotal = Math.max(0, Number(profile.totalCultivation || 0))

    if (changeValue > 0) {
      const dailyLimit = this.getDailyScoreLimit()
      const used = Number.isFinite(Number(options.todayGained))
        ? Math.max(0, Number(options.todayGained))
        : ledger.gained
      const remain = Math.max(0, dailyLimit - used)
      const applied = Math.min(changeValue, remain)
      return {
        applied,
        capped: applied < changeValue,
        reason: applied < changeValue ? 'daily_limit' : 'ok',
        dailyLimit,
        remain
      }
    }

    // 扣分：单日最多扣 DAILY_DEDUCT_LIMIT，且不低于 0 总修为
    const alreadyDeducted = Number.isFinite(Number(options.todayDeducted))
      ? Math.max(0, Number(options.todayDeducted))
      : ledger.deducted
    const deductRemain = Math.max(0, DAILY_DEDUCT_LIMIT - alreadyDeducted)
    const wantDeduct = Math.abs(changeValue)
    const allowedDeduct = Math.min(wantDeduct, deductRemain, currentTotal)
    return {
      applied: -allowedDeduct,
      capped: allowedDeduct < wantDeduct,
      reason: allowedDeduct < wantDeduct ? 'deduct_limit' : 'ok',
      deductRemain
    }
  },

  getCurrentTemplate() {
    // 兼容旧调用：优先返回主修大道模板
    return this.getMainTemplate()
      || this.globalData.currentTemplate
      || (this.globalData.userProfile && this.globalData.userProfile.currentTemplate)
      || wx.getStorageSync(STORAGE_KEYS.currentTemplate)
      || null
  },

  getMainTemplate() {
    return this.globalData.mainTemplate
      || (this.globalData.userProfile && this.globalData.userProfile.mainTemplate)
      || wx.getStorageSync(STORAGE_KEYS.mainTemplate)
      || null
  },

  getSideTemplates() {
    const list = this.globalData.sideTemplates
      || (this.globalData.userProfile && this.globalData.userProfile.sideTemplates)
      || wx.getStorageSync(STORAGE_KEYS.sideTemplates)
      || []
    return Array.isArray(list) ? list : []
  },

  /**
   * >>> 新增：计算当日修行系数
   * 最终修为 = 基础分 × coeff；总加成最高 +50%，总 debuff 最低 -30%
   */
  calcTodayCultivationCoeff() {
    try {
      const {
        aggregateCoeffParts,
        clampTotalCoeff,
        getTemplateById,
        getLocalCustomTemplates
      } = require('./utils/life-template.js')

      const main = this.getMainTemplate()
      const sides = this.getSideTemplates()
      const customs = getLocalCustomTemplates()

      const hydrate = (snap) => {
        if (!snap || !snap.id) return null
        const full = getTemplateById(snap.id, customs) || snap
        return {
          ...full,
          ...snap,
          tasks: (full && full.tasks && full.tasks.length) ? full.tasks : (snap.tasks || [])
        }
      }

      const parts = aggregateCoeffParts(hydrate(main), sides.map(hydrate).filter(Boolean))
      const rawRate = parts.reduce((sum, item) => sum + Number(item.rate || 0), 0)
      const clamped = clampTotalCoeff(rawRate)
      const bonusItems = parts.filter((item) => item.type === 'bonus')
      const debuffItems = parts.filter((item) => item.type === 'debuff')

      return {
        coeff: clamped.coeff,
        rate: clamped.rate,
        capped: clamped.capped,
        parts,
        bonusItems,
        debuffItems,
        bonusText: bonusItems.map((item) => item.label),
        debuffText: debuffItems.map((item) => item.label)
      }
    } catch (error) {
      console.error('calcTodayCultivationCoeff 失败', error)
      return {
        coeff: 1,
        rate: 0,
        capped: false,
        parts: [],
        bonusItems: [],
        debuffItems: [],
        bonusText: [],
        debuffText: []
      }
    }
  },

  /**
   * >>> 持久化主修/辅修到本地 + 云端 users
   */
  async persistTemplateSelection(mainTemplate, sideTemplates = [], options = {}) {
    const syncSystem = options.syncSystem !== false
    const main = mainTemplate || null
    const sides = Array.isArray(sideTemplates) ? sideTemplates : []

    wx.setStorageSync(STORAGE_KEYS.mainTemplate, main)
    wx.setStorageSync(STORAGE_KEYS.sideTemplates, sides)
    // 兼容旧字段：currentTemplate 指向主修
    wx.setStorageSync(STORAGE_KEYS.currentTemplate, main)

    this.globalData.mainTemplate = main
    this.globalData.sideTemplates = sides
    this.globalData.currentTemplate = main

    const profilePatch = {
      mainTemplate: main,
      sideTemplates: sides,
      currentTemplate: main,
      learningTemplateId: main ? main.id : '',
      learningTemplateName: main ? main.name : '',
      updatedAt: Date.now()
    }

    try {
      const profile = await this.ensureUserProfile()
      if (profile && profile._id) {
        const db = this.getDb()
        if (db) {
          await db.collection('users').doc(profile._id).update({ data: profilePatch })
        }
      }
      this.syncUserProfile(profilePatch)
    } catch (error) {
      console.error('同步多选模板失败', error)
      this.syncUserProfile(profilePatch)
    }

    if (syncSystem && main && main.cultivationSystem) {
      await this.setCultivationSystem(main.cultivationSystem)
    }

    this.emitAppEvent('life-template-changed', {
      mainTemplate: main,
      sideTemplates: sides
    })
    this.refreshCultivationPages('life-template-changed')
    return { mainTemplate: main, sideTemplates: sides }
  },

  /**
   * >>> 设置证道主修（大道单选，直接替换，清空旧模板当日打卡）
   */
  async setMainTemplate(template, options = {}) {
    const { buildSelectedTemplatePayload, CAMP, writeTodayCheckin } = require('./utils/life-template.js')
    if (!template || template.camp === 'side') {
      // 允许强制：若传入小道则拒绝
      if (template && template.camp === CAMP.SIDE) {
        this.showSystemToast('小道不可设为主修')
        return null
      }
    }
    const payload = buildSelectedTemplatePayload(template, template.level || 1)
    if (!payload) return null
    payload.camp = CAMP.MAIN

    // >>> 切换主修时清空旧模板当日打卡状态，避免串扰
    const oldMain = this.getMainTemplate()
    if (oldMain && oldMain.id && oldMain.id !== payload.id) {
      try {
        writeTodayCheckin(oldMain.id, { tasks: {}, totalScore: 0 })
      } catch (_) { /* 静默清理 */ }
    }

    return this.persistTemplateSelection(payload, this.getSideTemplates(), options)
  },

  /**
   * >>> 切换旁门辅修（小道多选，最多 3 个）
   */
  async toggleSideTemplate(template) {
    const { buildSelectedTemplatePayload, CAMP } = require('./utils/life-template.js')
    const MAX_SIDE_TEMPLATES = 3
    if (!template || !template.id) return null
    if (template.camp === CAMP.MAIN) {
      this.showSystemToast('大道请在证道主修区选择')
      return null
    }

    const payload = buildSelectedTemplatePayload(template, template.level || 1)
    payload.camp = CAMP.SIDE
    const sides = [...this.getSideTemplates()]
    const index = sides.findIndex((item) => item.id === payload.id)
    if (index >= 0) {
      sides.splice(index, 1)
    } else {
      if (sides.length >= MAX_SIDE_TEMPLATES) {
        this.showSystemToast(`旁门辅修最多${MAX_SIDE_TEMPLATES}个，请先移除一个`)
        return null
      }
      sides.push(payload)
    }
    return this.persistTemplateSelection(this.getMainTemplate(), sides, { syncSystem: false })
  },

  /**
   * >>> 兼容旧接口：切换人生模板 = 设为主修
   */
  async switchLifeTemplate(template, options = {}) {
    return this.setMainTemplate(template, options)
  },

  /**
   * >>> 合并所有选中模板的每日任务（按阵营分组）
   */
  getMergedDailyTasks() {
    const { getTemplateById, getLocalCustomTemplates, readTodayCheckin, CAMP } = require('./utils/life-template.js')
    const customs = getLocalCustomTemplates()
    const groups = []

    const pushGroup = (snap, campLabel) => {
      if (!snap || !snap.id) return
      const full = getTemplateById(snap.id, customs) || snap
      const tasks = full.tasks || snap.tasks || []
      const checkin = readTodayCheckin(snap.id)
      const doneMap = checkin.tasks || {}
      groups.push({
        templateId: snap.id,
        templateName: snap.name || full.name,
        camp: snap.camp || full.camp,
        campLabel,
        level: snap.level || 1,
        tasks: tasks.map((task) => ({
          ...task,
          templateId: snap.id,
          done: !!doneMap[task.id]
        }))
      })
    }

    const main = this.getMainTemplate()
    if (main) pushGroup(main, '证道主修')
    this.getSideTemplates().forEach((item) => pushGroup(item, '旁门辅修'))
    return groups
  },

  /**
   * >>> 日终刷新模板等级（可在打卡后调用）
   */
  async refreshTemplateLevelsAfterCheckin() {
    const {
      getTemplateDayProgress,
      applyTemplateLevelProgress,
      getTemplateById,
      getLocalCustomTemplates
    } = require('./utils/life-template.js')

    const customs = getLocalCustomTemplates()
    let main = this.getMainTemplate()
    let sides = this.getSideTemplates()
    let changed = false

    const bump = (snap) => {
      if (!snap) return snap
      const full = getTemplateById(snap.id, customs) || snap
      const progress = getTemplateDayProgress({ ...full, ...snap, tasks: full.tasks || [] })
      const next = applyTemplateLevelProgress({ ...snap, tasks: full.tasks || [] }, progress)
      if (next.level !== snap.level || next.highStreak !== snap.highStreak || next.lowStreak !== snap.lowStreak) {
        changed = true
      }
      return next
    }

    if (main) main = bump(main)
    sides = sides.map(bump)
    if (changed) {
      await this.persistTemplateSelection(main, sides, { syncSystem: false })
    }
    return { mainTemplate: main, sideTemplates: sides }
  },

  getThemeByScore(score = 0) {
    const target = this.globalData.themeTargetScore || 20
    if (score < 0) {
      return {
        key: 'gloom',
        className: 'theme-diyu',
        label: '地狱主题',
        score,
        target
      }
    }

    if (score >= target) {
      return {
        key: 'fresh',
        className: 'theme-xianjie',
        label: '仙界主题',
        score,
        target
      }
    }

    return {
      key: 'dusk',
      className: 'theme-hongchen',
      label: '红尘主题',
      score,
      target
    }
  },

  getFixedTheme() {
    return {
      key: 'light',
      className: 'theme-xiuxing',
      label: '修行主题'
    }
  },

  /**
   * 解析当前生效的主题类名
   * 优先读取用户手动选择的主题，无手动选择时按分数动态切换
   */
  resolveThemeClass(todayScore) {
    let resolved = 'theme-hongchen'
    try {
      const override = wx.getStorageSync('tiandao_theme_override')
      if (override && override !== 'auto') {
        // 用户手动选择了主题 → 用固定映射
        const map = {
          fresh: 'theme-xianjie',
          dusk: 'theme-hongchen',
          gloom: 'theme-diyu',
          light: 'theme-xiuxing'
        }
        resolved = map[override] || 'theme-xiuxing'
      } else {
        // 自动模式 → 按分数动态切换
        const score = todayScore != null ? todayScore : 0
        if (score < 0) resolved = 'theme-diyu'
        else {
          const target = this.globalData.themeTargetScore || 20
          if (score >= target) resolved = 'theme-xianjie'
          else resolved = 'theme-hongchen'
        }
      }
    } catch (e) { /* ignore */ }

    // 同步更新导航栏颜色
    this._applyNavBarTheme(resolved)
    return resolved
  },

  /**
   * 根据主题类名动态设置导航栏与 TabBar 颜色
   */
  _applyNavBarTheme(themeClass) {
    const navBarConfig = {
      'theme-xianjie': {
        backgroundColor: '#faf7f2',
        frontColor: '#000000',
        backgroundTextStyle: 'dark',
        tabBarBg: '#ffffff',
        tabBarSelected: '#c8a260',
        tabBarColor: '#b5a890'
      },
      'theme-hongchen': {
        backgroundColor: '#f8efe0',
        frontColor: '#000000',
        backgroundTextStyle: 'dark',
        tabBarBg: '#ffffff',
        tabBarSelected: '#d48530',
        tabBarColor: '#b59070'
      },
      'theme-diyu': {
        backgroundColor: '#080608',
        frontColor: '#ffffff',
        backgroundTextStyle: 'light',
        tabBarBg: '#080608',
        tabBarSelected: '#ff4500',
        tabBarColor: '#685050'
      },
      'theme-xiuxing': {
        backgroundColor: '#f9fafb',
        frontColor: '#000000',
        backgroundTextStyle: 'dark',
        tabBarBg: '#ffffff',
        tabBarSelected: '#111827',
        tabBarColor: '#9ca3af'
      }
    }
    const config = navBarConfig[themeClass] || navBarConfig['theme-xiuxing']
    wx.setNavigationBarColor({
      frontColor: config.frontColor,
      backgroundColor: config.backgroundColor,
      animation: {
        duration: 500,
        timingFunc: 'easeInOut'
      }
    })
    if (wx.setBackgroundTextStyle) {
      wx.setBackgroundTextStyle({
        textStyle: config.backgroundTextStyle
      })
    }
    // 同步更新 TabBar 样式
    wx.setTabBarStyle({
      color: config.tabBarColor,
      selectedColor: config.tabBarSelected,
      backgroundColor: config.tabBarBg,
      borderStyle: themeClass === 'theme-xianjie' || themeClass === 'theme-xiuxing' ? 'black' : 'black'
    })
  },

  async getTodayScore() {
    const db = this.getDb()
    if (!db || !this.globalData.userId) {
      return 0
    }

    try {
      const res = await db.collection('records')
        .where({
          userId: this.globalData.userId,
          date: this.getTodayDate()
        })
        .get()

      // >>> 仅统计 status=confirmed 的正式记录（旧数据无 status 视为已印证）
      const score = (res.data || []).reduce((sum, item) => {
        const itemStatus = item.status || RECORD_STATUS.CONFIRMED
        if (itemStatus !== RECORD_STATUS.CONFIRMED) return sum
        return sum + Number(item.score || 0)
      }, 0)
      this.globalData.todayScore = score
      return score
    } catch (error) {
      console.error('获取今日修行分失败', error)
      return this.globalData.todayScore || 0
    }
  },

  /**
   * >>> 新增：今日正分合计（用于单日上限，忽略扣分记录）
   */
  async getTodayPositiveScore() {
    const db = this.getDb()
    if (!db || !this.globalData.userId) {
      return this.getDailyScoreLedger().gained
    }
    try {
      const res = await db.collection('records')
        .where({
          userId: this.globalData.userId,
          date: this.getTodayDate()
        })
        .get()
      // >>> 仅统计 status=confirmed 的正式记录正分（旧数据无 status 视为已印证）
      const gained = (res.data || []).reduce((sum, item) => {
        const itemStatus = item.status || RECORD_STATUS.CONFIRMED
        if (itemStatus !== RECORD_STATUS.CONFIRMED) return sum
        const score = Number(item.score || 0)
        return sum + (score > 0 ? score : 0)
      }, 0)
      return gained
    } catch (error) {
      return this.getDailyScoreLedger().gained
    }
  },

  // ============================================================
  // >>> 新增：历史录入记忆与离线待印证暂存
  // ============================================================

  /**
   * >>> 读取指定类型最近一次录入快照值
   * @param {string} type 分类：exercise / diet / sleep / study
   * @returns {*} 上次录入值快照，无记录返回 null
   */
  getLastRecordSnapshot(type) {
    try {
      const snapshot = this.globalData.lastRecordSnapshot
        || wx.getStorageSync(STORAGE_KEYS.lastRecordSnapshot)
        || {}
      return snapshot[type] !== undefined ? snapshot[type] : null
    } catch (error) {
      return null
    }
  },

  /**
   * >>> 保存录入快照值到本地 + 云端
   * @param {string} type 分类
   * @param {*} value 录入值
   */
  async saveLastRecordSnapshot(type, value) {
    try {
      const snapshot = this.globalData.lastRecordSnapshot
        || wx.getStorageSync(STORAGE_KEYS.lastRecordSnapshot)
        || {}
      snapshot[type] = value
      this.globalData.lastRecordSnapshot = snapshot
      wx.setStorageSync(STORAGE_KEYS.lastRecordSnapshot, snapshot)

      // 同步到云端 users 档案
      try {
        const profile = await this.ensureUserProfile()
        if (profile && profile._id) {
          const db = this.getDb()
          if (db) {
            await db.collection('users').doc(profile._id).update({
              data: {
                lastRecordSnapshot: snapshot,
                updatedAt: Date.now()
              }
            })
          }
        }
      } catch (cloudErr) {
        console.error('同步录入快照到云端失败', cloudErr)
      }
    } catch (error) {
      console.error('保存录入快照失败', error)
    }
  },

  /**
   * >>> 近30天最常用3-5个选项，供快捷录入标签
   * @param {string} type 分类：exercise / diet / sleep / study 等
   * @returns {Array<{ value: string, count: number }>}
   */
  async getFrequentRecordOptions(type) {
    const db = this.getDb()
    if (!db || !this.globalData.userId) return []

    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const startDate = this.formatDate(thirtyDaysAgo)
      const endDate = this.getTodayDate()

      const res = await db.collection('records')
        .where({
          userId: this.globalData.userId,
          type
        })
        .get()

      // 筛选近30天、status=confirmed 的正式记录
      const confirmedInRange = (res.data || []).filter((item) => {
        const itemStatus = item.status || RECORD_STATUS.CONFIRMED
        return itemStatus === RECORD_STATUS.CONFIRMED && item.date >= startDate && item.date <= endDate
      })

      // 按 value 归并频次
      const freqMap = {}
      confirmedInRange.forEach((item) => {
        const val = item.value || item.content || item.label || item.name || ''
        if (!val) return
        const key = String(val).trim()
        if (key) {
          freqMap[key] = (freqMap[key] || 0) + 1
        }
      })

      return Object.entries(freqMap)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    } catch (error) {
      console.error('获取常用录入选项失败', error)
      return []
    }
  },

  // ============================================================
  // >>> 新增：离线待印证暂存（7日空白检测 + 自动生成 + 手动确认）
  // ============================================================

  /**
   * >>> 生成离线暂存记录
   * 检测过去7天无正式记录的日期，按四类平均值生成汇总待印证暂存
   * - 仅统计 status=confirmed 的正式记录
   * - 单日只生成1条汇总暂存，不重复
   * - 自动删除超过7天的未确认暂存
   * @returns {Array} 本次新生成的暂存记录
   */
  async generatePendingRecords() {
    const db = this.getDb()
    if (!db || !this.globalData.userId) return []

    const today = this.getTodayDate()
    const newPendingRecords = []

    try {
      // 生成过去7天日期数组（不含今日）
      const past7Dates = []
      for (let i = 1; i <= 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        past7Dates.push(this.formatDate(d))
      }

      // 查询过去7天正式记录
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const startDate = this.formatDate(sevenDaysAgo)

      const confirmedRes = await db.collection('records')
        .where({
          userId: this.globalData.userId
        })
        .get()

      const allRecords = (confirmedRes.data || []).filter((item) => {
        const itemStatus = item.status || RECORD_STATUS.CONFIRMED
        return itemStatus === RECORD_STATUS.CONFIRMED && item.date >= startDate
      })

      // 已有正式记录日期集合
      const confirmedDates = new Set(allRecords.map((item) => item.date))

      // 已有待印证暂存日期集合（避免重复生成）
      const pendingRes = await db.collection('records')
        .where({
          userId: this.globalData.userId,
          status: RECORD_STATUS.PENDING
        })
        .get()
      const pendingDates = new Set((pendingRes.data || []).map((item) => item.date))

      // 全量历史正式记录，用于算四类平均值
      const allConfirmed = (confirmedRes.data || []).filter((item) => {
        const itemStatus = item.status || RECORD_STATUS.CONFIRMED
        return itemStatus === RECORD_STATUS.CONFIRMED
      })

      // 按四类分组计算平均分
      const categories = ['exercise', 'diet', 'sleep', 'study']
      const avgMap = {}
      categories.forEach((cat) => {
        const catRecords = allConfirmed.filter((item) => item.type === cat || item.category === cat)
        if (catRecords.length) {
          const total = catRecords.reduce((sum, item) => sum + Math.max(0, Number(item.score || 0)), 0)
          avgMap[cat] = Math.round(total / catRecords.length)
        } else {
          avgMap[cat] = 0
        }
      })

      // 对无正式记录也无暂存记录的日期生成汇总暂存
      for (const date of past7Dates) {
        if (confirmedDates.has(date) || pendingDates.has(date)) continue

        const pendingRecord = {
          userId: this.globalData.userId,
          date,
          status: RECORD_STATUS.PENDING,
          isAutoGenerated: true,
          type: 'pending',
          score: 0,
          summary: {
            exercise: avgMap.exercise,
            diet: avgMap.diet,
            sleep: avgMap.sleep,
            study: avgMap.study
          },
          avgMap,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        try {
          const addRes = await db.collection('records').add({ data: pendingRecord })
          pendingRecord._id = addRes._id
          newPendingRecords.push(pendingRecord)
        } catch (addErr) {
          console.error(`生成待印证暂存失败 date=${date}`, addErr)
        }
      }

      // 自动清理超过7天的未确认暂存
      const oldPending = (pendingRes.data || []).filter((item) => {
        return item.date < startDate && item.status === RECORD_STATUS.PENDING
      })
      for (const old of oldPending) {
        try {
          await db.collection('records').doc(old._id).remove()
        } catch (delErr) {
          console.error(`清理过期暂存失败 _id=${old._id}`, delErr)
        }
      }

      if (newPendingRecords.length) {
        this.emitAppEvent('pending-records-generated', {
          count: newPendingRecords.length,
          records: newPendingRecords
        })
      }

      return newPendingRecords
    } catch (error) {
      console.error('生成待印证暂存失败', error)
      return []
    }
  },

  /**
   * >>> 印证道行：将暂存转为正式记录，调用 addScore 正常加修为
   * @param {string} recordId 暂存记录的 _id
   * @param {object} overrides 用户修改后的字段覆盖（可选）
   * @returns {object|null} 更新后的记录
   */
  async confirmPendingRecord(recordId, overrides = {}) {
    const db = this.getDb()
    if (!db || !recordId) return null

    try {
      const res = await db.collection('records').doc(recordId).get()
      if (!res.data || res.data.status !== RECORD_STATUS.PENDING) {
        this.showSystemError('此记录非待印证状态，无法印证道行')
        return null
      }

      const original = res.data
      const merged = {
        ...original,
        ...overrides,
        status: RECORD_STATUS.CONFIRMED,
        isAutoGenerated: true,
        confirmedAt: Date.now(),
        updatedAt: Date.now()
      }

      await db.collection('records').doc(recordId).update({
        data: {
          status: RECORD_STATUS.CONFIRMED,
          ...(overrides.score !== undefined ? { score: overrides.score } : {}),
          ...overrides,
          confirmedAt: Date.now(),
          updatedAt: Date.now()
        }
      })

      // 正常加修为
      const scoreDelta = Number(overrides.score !== undefined ? overrides.score : merged.score || 0)
      if (scoreDelta !== 0) {
        await this.addScore(scoreDelta, {
          source: 'pending-confirm',
          recordId
        })
      }

      this.emitAppEvent('pending-record-confirmed', { recordId, merged })
      this.refreshCultivationPages('pending-record-confirmed')
      return merged
    } catch (error) {
      console.error('印证道行失败', error)
      this.showSystemError('印证道行失败，请稍后再试')
      return null
    }
  },

  /**
   * >>> 修改待印证暂存后确认生效
   * @param {string} recordId 暂存 _id
   * @param {object} data 用户修改后的字段
   * @returns {object|null}
   */
  async updatePendingRecord(recordId, data = {}) {
    const db = this.getDb()
    if (!db || !recordId) return null

    try {
      const res = await db.collection('records').doc(recordId).get()
      if (!res.data || res.data.status !== RECORD_STATUS.PENDING) {
        this.showSystemError('此记录非待印证状态，无法修改')
        return null
      }

      const patch = {
        ...data,
        isAutoGenerated: false,
        updatedAt: Date.now()
      }

      await db.collection('records').doc(recordId).update({ data: patch })

      // 如果用户修改时直接给出了 score，一并确认加修为
      const updated = { ...res.data, ...patch }
      if (Number(data.score) && data.confirmAfterUpdate !== false) {
        return this.confirmPendingRecord(recordId, { score: Number(data.score) })
      }

      return updated
    } catch (error) {
      console.error('修改待印证暂存失败', error)
      return null
    }
  },

  /**
   * >>> 作废删除暂存记录（不计入修为）
   * @param {string} recordId 暂存 _id
   * @returns {boolean}
   */
  async deletePendingRecord(recordId) {
    const db = this.getDb()
    if (!db || !recordId) return false

    try {
      const res = await db.collection('records').doc(recordId).get()
      if (!res.data || res.data.status !== RECORD_STATUS.PENDING) {
        this.showSystemError('此记录非待印证状态，无法作废')
        return false
      }

      await db.collection('records').doc(recordId).remove()
      this.emitAppEvent('pending-record-deleted', { recordId })
      return true
    } catch (error) {
      console.error('作废暂存记录失败', error)
      return false
    }
  },

  async getUserProfile() {
    if (this.globalData.userProfile) {
      return this.globalData.userProfile
    }
    return this.ensureUserProfile()
  },

  async ensureUserProfile() {
    const db = this.getDb()
    if (!db) {
      const fallbackProfile = this.createDefaultUserProfile()
      this.globalData.userProfile = fallbackProfile
      return fallbackProfile
    }

    // 使用 Promise 锁避免多个页面同时调用时重复创建 users 文档。
    if (this._ensureUserProfilePromise) {
      return this._ensureUserProfilePromise
    }

    this._ensureUserProfilePromise = (async () => {
      const localBodyProfile = this.getLocalBodyProfile()
      const localCultivationSystem = this.getCultivationSystem()

      try {
        const res = await db.collection('users')
          .where({ userId: this.globalData.userId })
          .limit(1)
          .get()

        if (res.data.length) {
          const sourceProfile = res.data[0]
          const profile = {
            ...this.createDefaultUserProfile(),
            ...sourceProfile,
            bodyProfile: this.normalizeBodyProfile(sourceProfile.bodyProfile || localBodyProfile),
            cultivationSystem: this.normalizeCultivationSystem(sourceProfile.cultivationSystem || localCultivationSystem)
          }

          // >>> 恢复多选模板快照
          if (sourceProfile.mainTemplate) {
            this.globalData.mainTemplate = sourceProfile.mainTemplate
            wx.setStorageSync(STORAGE_KEYS.mainTemplate, sourceProfile.mainTemplate)
            this.globalData.currentTemplate = sourceProfile.mainTemplate
            wx.setStorageSync(STORAGE_KEYS.currentTemplate, sourceProfile.mainTemplate)
          } else if (sourceProfile.currentTemplate) {
            this.globalData.currentTemplate = sourceProfile.currentTemplate
            this.globalData.mainTemplate = sourceProfile.currentTemplate
            wx.setStorageSync(STORAGE_KEYS.currentTemplate, sourceProfile.currentTemplate)
            wx.setStorageSync(STORAGE_KEYS.mainTemplate, sourceProfile.currentTemplate)
          }
          if (Array.isArray(sourceProfile.sideTemplates)) {
            this.globalData.sideTemplates = sourceProfile.sideTemplates
            wx.setStorageSync(STORAGE_KEYS.sideTemplates, sourceProfile.sideTemplates)
          }
          // >>> 恢复签名诗
          if (sourceProfile.signaturePoem) {
            this.globalData.signaturePoem = sourceProfile.signaturePoem
            wx.setStorageSync(STORAGE_KEYS.signaturePoem, sourceProfile.signaturePoem)
          }
          // >>> 恢复历史录入记忆快照
          if (sourceProfile.lastRecordSnapshot && typeof sourceProfile.lastRecordSnapshot === 'object') {
            this.globalData.lastRecordSnapshot = sourceProfile.lastRecordSnapshot
            wx.setStorageSync(STORAGE_KEYS.lastRecordSnapshot, sourceProfile.lastRecordSnapshot)
          }

          // 历史用户若缺失身体数据或修炼体系字段，则自动补齐。
          if (
            !sourceProfile.bodyProfile ||
            !Object.keys(sourceProfile.bodyProfile).length ||
            !sourceProfile.cultivationSystem
          ) {
            await db.collection('users').doc(profile._id).update({
              data: {
                bodyProfile: profile.bodyProfile,
                cultivationSystem: profile.cultivationSystem,
                updatedAt: Date.now()
              }
            })
          }

          this.globalData.userProfile = profile
          this.globalData.bodyProfile = profile.bodyProfile
          this.globalData.cultivationSystem = profile.cultivationSystem
          return profile
        }

        const profile = this.createDefaultUserProfile({
          cultivationSystem: localCultivationSystem,
          bodyProfile: localBodyProfile,
          updatedAt: Date.now()
        })

        const addRes = await db.collection('users').add({ data: profile })
        const createdProfile = {
          ...profile,
          _id: addRes._id
        }
        this.globalData.userProfile = createdProfile
        return createdProfile
      } catch (error) {
        console.error('初始化用户档案失败', error)
        const fallbackProfile = this.createDefaultUserProfile()
        this.globalData.userProfile = fallbackProfile
        this.globalData.bodyProfile = fallbackProfile.bodyProfile
        this.globalData.cultivationSystem = fallbackProfile.cultivationSystem
        return fallbackProfile
      } finally {
        this._ensureUserProfilePromise = null
      }
    })()

    return this._ensureUserProfilePromise
  },

  // 更新用户档案缓存，供页面在本地写回后快速同步全局状态。
  syncUserProfile(partialProfile = {}) {
    const currentProfile = this.globalData.userProfile || {}
    const nextProfile = {
      ...currentProfile,
      ...partialProfile
    }

    if (partialProfile.bodyProfile) {
      nextProfile.bodyProfile = this.normalizeBodyProfile(partialProfile.bodyProfile)
      this.globalData.bodyProfile = nextProfile.bodyProfile
      wx.setStorageSync(STORAGE_KEYS.bodyProfile, nextProfile.bodyProfile)
    }

    if (partialProfile.cultivationSystem) {
      nextProfile.cultivationSystem = this.normalizeCultivationSystem(partialProfile.cultivationSystem)
      this.globalData.cultivationSystem = nextProfile.cultivationSystem
      wx.setStorageSync(STORAGE_KEYS.cultivationSystem, nextProfile.cultivationSystem)
    }

    if (partialProfile.currentTemplate) {
      this.globalData.currentTemplate = partialProfile.currentTemplate
      wx.setStorageSync(STORAGE_KEYS.currentTemplate, partialProfile.currentTemplate)
    }

    // >>> 同步历史录入记忆快照
    if (partialProfile.lastRecordSnapshot && typeof partialProfile.lastRecordSnapshot === 'object') {
      this.globalData.lastRecordSnapshot = partialProfile.lastRecordSnapshot
      wx.setStorageSync(STORAGE_KEYS.lastRecordSnapshot, partialProfile.lastRecordSnapshot)
    }

    this.globalData.userProfile = nextProfile
    return nextProfile
  },

  clearUserProfileCache() {
    this.globalData.userProfile = null
  },

  /**
   * >>> 修改：全局积分更新
   * - 保留原有入参出参：addScore(delta, options) → profile | null
   * - 新增单日上限 / 单日扣分下限校验，超出部分不累计
   * - 总修为不会变为负数
   */
  async addScore(delta = 0, options = {}) {
    const db = this.getDb()
    const rawDelta = Number(delta) || 0

    if (!db) {
      console.error('云数据库未初始化，无法更新修为')
      return null
    }

    const profile = await this.ensureUserProfile()
    if (!profile || !profile._id) {
      return null
    }

    // 读取今日已获正分，用于上限裁剪
    // >>> 优先走本地台账（快速路径），兜底走 DB 查询
    let todayGained = 0
    let todayDeducted = 0
    const ledger = this.getDailyScoreLedger()
    if (ledger.gained > 0 || ledger.deducted > 0) {
      // 本地台账已有数据，直接使用（所有积分变更都经过 addScore，台账已同步）
      todayGained = ledger.gained
      todayDeducted = ledger.deducted
    } else {
      try {
        const todayRecords = await db.collection('records')
          .where({
            userId: this.globalData.userId,
            date: this.getTodayDate()
          })
          .get()
        ;(todayRecords.data || []).forEach((item) => {
          const itemStatus = item.status || RECORD_STATUS.CONFIRMED
          if (itemStatus !== RECORD_STATUS.CONFIRMED) return
          const score = Number(item.score || 0)
          if (score > 0) todayGained += score
          if (score < 0) todayDeducted += Math.abs(score)
        })
        // >>> 首次 DB 查询后同步写入台账，后续调用走快速路径
        this.saveDailyScoreLedger({ date: this.getTodayDate(), gained: todayGained, deducted: todayDeducted })
      } catch (error) {
        todayGained = ledger.gained
        todayDeducted = ledger.deducted
      }
    }

    const clampResult = this.clampScoreDelta(rawDelta, {
      todayGained,
      todayDeducted
    })
    const changeValue = clampResult.applied

    if (!changeValue) {
      if (clampResult.capped && rawDelta > 0) {
        this.showSystemToast('今日修为已达上限')
      } else if (clampResult.capped && rawDelta < 0) {
        this.showSystemToast('今日心魔扣分已达上限')
      }
      return profile
    }

    const nextTotalCultivation = Math.max(0, Number(profile.totalCultivation || 0) + changeValue)
    const nextTotalScore = Math.max(0, Number(profile.totalScore || 0) + changeValue)
    const payload = {
      totalCultivation: nextTotalCultivation,
      totalScore: nextTotalScore,
      updatedAt: Date.now()
    }

    if (options.lastCheckInDate) {
      payload.lastCheckInDate = options.lastCheckInDate
    }
    if (typeof options.streakDays === 'number') {
      payload.streakDays = options.streakDays
    }

    try {
      await db.collection('users').doc(profile._id).update({
        data: payload
      })

      // 更新单日台账
      const ledger = this.getDailyScoreLedger()
      if (changeValue > 0) {
        ledger.gained += changeValue
      } else {
        ledger.deducted += Math.abs(changeValue)
      }
      this.saveDailyScoreLedger(ledger)
      this.globalData.todayScore = (Number(this.globalData.todayScore) || 0) + changeValue

      const nextProfile = this.syncUserProfile(payload)
      this.emitAppEvent('score-updated', {
        delta: changeValue,
        requestedDelta: rawDelta,
        capped: clampResult.capped,
        profile: nextProfile,
        options
      })
      this.refreshCultivationPages('score-updated')
      return nextProfile
    } catch (error) {
      console.error('更新修为失败', error)
      return null
    }
  },

  // ============================================================
  // >>> 新增：媒体权重加成
  // ============================================================

  /**
   * 计算媒体权重加成系数
   * @param {boolean} hasImage 是否有上传图片
   * @param {boolean} hasVideo 是否有上传视频
   * @param {boolean} isRelevant 媒体内容是否和打卡内容相关
   * @returns {{ weight: number, label: string }}
   */
  calcMediaWeightBonus(hasImage, hasVideo, isRelevant) {
    if (!isRelevant) {
      return { weight: MEDIA_WEIGHT.NONE, label: '媒体与内容不符', relevant: false }
    }
    if (hasVideo) {
      return { weight: MEDIA_WEIGHT.VIDEO, label: '实拍视频·双倍加成', relevant: true }
    }
    if (hasImage) {
      return { weight: MEDIA_WEIGHT.IMAGE, label: '实拍图片·半倍加成', relevant: true }
    }
    return { weight: MEDIA_WEIGHT.NONE, label: '纯文字记录', relevant: true }
  },

  /**
   * 带媒体权重的统一打分入口
   * 最终得分 = calcTaskScore基础分 * 媒体权重，之后走 addScore 所有现有逻辑
   */
  calcWeightedTaskScore(taskType, unit, hasSystemBonus, mediaWeight) {
    const baseScore = this.calcTaskScore(taskType, unit, hasSystemBonus)
    const weight = mediaWeight || MEDIA_WEIGHT.NONE
    return Math.round(baseScore * weight)
  },

  // ============================================================
  // >>> 新增：自定义道则体系
  // ============================================================

  /** 获取当前用户的自定义道则 */
  getCustomDaoRules() {
    try {
      const rules = wx.getStorageSync(STORAGE_KEYS.customDaoze)
      if (!rules || !rules.dimensions) return null
      return rules
    } catch (e) {
      return null
    }
  },

  /** 保存自定义道则到本地存储 */
  saveCustomDaoRules(rules) {
    if (!rules || !rules.dimensions) return false
    try {
      wx.setStorageSync(STORAGE_KEYS.customDaoze, rules)
      this.emitAppEvent('dao-rules-changed', { rules })
      this.refreshCultivationPages('dao-rules-changed')
      return true
    } catch (e) {
      console.error('保存自定义道则失败', e)
      return false
    }
  },

  /** 获取当前生效的维度显示名称（自定义优先，默认兜底） */
  getDaoDimensionNames() {
    const custom = this.getCustomDaoRules()
    const defaults = {
      wu: { name: '炼体', icon: '武' },
      shi: { name: '丹食', icon: '食' },
      wu_xin: { name: '修心', icon: '悟' },
      gong: { name: '功业', icon: '工' },
      sha: { name: '心魔', icon: '煞' }
    }
    if (!custom) return defaults
    const merged = {}
    Object.keys(defaults).forEach((key) => {
      merged[key] = {
        name: (custom.dimensions && custom.dimensions[key] && custom.dimensions[key].name) || defaults[key].name,
        icon: defaults[key].icon
      }
    })
    return merged
  },

  /** 获取当前生效的四境界显示名称 */
  getDaoRealmNames() {
    const custom = this.getCustomDaoRules()
    const defaults = REALM_NAME_MAP.traditional
    if (!custom || !Array.isArray(custom.realmNames) || custom.realmNames.length < 4) {
      const systemKey = this.getCultivationSystem()
      return REALM_NAME_MAP[systemKey] || defaults
    }
    return custom.realmNames.slice(0, 4)
  },

  /** 获取指定维度下的自定义打卡项 */
  getCustomCheckinItems(dim) {
    const custom = this.getCustomDaoRules()
    if (!custom || !custom.checkinItems) return []
    return (custom.checkinItems[dim] || []).slice()
  },

  // ============================================================
  // >>> 修炼模式管理
  // ============================================================

  /** 获取当前修炼模式 */
  getPracticeMode() {
    try {
      const stored = wx.getStorageSync(STORAGE_KEYS.practiceMode)
      if (!stored || !stored.mode) return DEFAULT_PRACTICE_MODE
      return stored.mode
    } catch (e) {
      return DEFAULT_PRACTICE_MODE
    }
  },

  /** 获取修炼模式完整信息（含锁定状态） */
  getPracticeModeInfo() {
    try {
      const stored = wx.getStorageSync(STORAGE_KEYS.practiceMode)
      const now = Date.now()
      if (stored && stored.mode && stored.lockedUntil && now < stored.lockedUntil) {
        return { mode: stored.mode, locked: true, lockedUntil: stored.lockedUntil }
      }
      return { mode: stored?.mode || DEFAULT_PRACTICE_MODE, locked: false }
    } catch (e) {
      return { mode: DEFAULT_PRACTICE_MODE, locked: false }
    }
  },

  /** 设置修炼模式（一周一锁） */
  setPracticeMode(mode) {
    const validKeys = Object.values(PRACTICE_MODES).map((m) => m.key)
    if (!validKeys.includes(mode)) return false

    const info = this.getPracticeModeInfo()
    if (info.locked && info.mode !== mode) return false

    try {
      const lockedUntil = Date.now() + 7 * 24 * 60 * 60 * 1000
      wx.setStorageSync(STORAGE_KEYS.practiceMode, {
        mode,
        lockedUntil,
        setAt: Date.now()
      })
      this.emitAppEvent('practice-mode-changed', { mode })
      return true
    } catch (e) {
      return false
    }
  },

  /** 获取所有可选修炼模式 */
  getAvailablePracticeModes() {
    return Object.values(PRACTICE_MODES)
  },

  // ============================================================
  // >>> 道牒称号系统
  // ============================================================

  /**
   * 获取当前佩戴的称号
   * @returns {object|null} { id, name, color, bonus, ... } 或 null
   */
  getEquippedTitle() {
    try {
      const stored = this.globalData.equippedTitle
        || wx.getStorageSync(STORAGE_KEYS.equippedTitle)
        || null
      if (stored && stored.id) return stored
      return null
    } catch (e) { return null }
  },

  /**
   * 佩戴称号（一次仅一个，新佩戴自动替换旧称号）
   * @param {string} titleId 称号 id
   * @returns {object|null} 佩戴的称号对象
   */
  equipTitle(titleId) {
    try {
      const { getTitleById } = require('./utils/titles.js')
      const title = getTitleById(titleId)
      if (!title) return null
      wx.setStorageSync(STORAGE_KEYS.equippedTitle, title)
      this.globalData.equippedTitle = title
      this.emitAppEvent('title-equipped', { title })
      if (title.poem) {
        this.emitAppEvent('title-poem-changed', { poem: title.poem, titleName: title.name })
      }
      // 同步称号ID到云端（供他人主页查询）
      try {
        var db = this.globalData.db
        if (db) {
          this.ensureUserProfile().then(function(profile) {
            if (profile && profile._id) {
              db.collection('users').doc(profile._id).update({
                data: { equippedTitleId: title.id, updatedAt: Date.now() }
              })
            }
          }).catch(function() {})
        }
      } catch (e) {}
      this.refreshCultivationPages('title-equipped')
      return title
    } catch (e) { return null }
  },

  /**
   * 卸下当前称号
   */
  unequipTitle() {
    try {
      wx.removeStorageSync(STORAGE_KEYS.equippedTitle)
      this.globalData.equippedTitle = null
      this.emitAppEvent('title-equipped', { title: null })
      this.refreshCultivationPages('title-unequipped')
    } catch (e) { /* ignore */ }
  },

  /**
   * 获取当前佩戴称号的加成率
   * @returns {number} 0 ~ 0.10
   */
  getTitleBonusRate() {
    const title = this.getEquippedTitle()
    return title ? (Number(title.bonus) || 0) : 0
  },

  /**
   * >>> 称号统计：优先走云函数聚合，前端仅接收结果
   * 云函数异常时降级为本地计算（兼容旧数据<500条场景）
   * @returns {Promise<object>} userStats
   */
  async computeTitleUserStats() {
    const db = this.getDb()
    const userId = this.globalData.userId
    const profile = this.globalData.userProfile || {}

    // >>> 优先走云函数聚合
    if (wx.cloud && wx.cloud.callFunction) {
      try {
        const res = await this.withRetry(
          () => wx.cloud.callFunction({
            name: 'get-title-stats',
            data: { userId }
          }),
          1,
          '称号统计云函数'
        )()
        if (res.result && res.result.ok && res.result.stats) {
          const stats = res.result.stats
          // 用本地 profile 补充云端可能缺的 streakDays
          stats.streakDays = Number(profile.streakDays || stats.streakDays || 0)
          // 补充功德值（云端不一定有）
          stats.meritScore = this.globalData.meritData ? this.globalData.meritData.totalMerit : (stats.meritScore || 0)
          // 补充根骨数据（云端不一定有）
          this._injectBoneStats(stats)
          this.globalData.titleStats = stats
          return stats
        }
      } catch (e) {
        console.warn('[titles] 云函数统计失败，降级本地计算', e.message || e)
      }
    }

    // >>> 降级：本地计算（仅当云函数不可用时）
    return this.computeTitleUserStatsLocal()
  },

  /**
   * >>> 本地称号统计（兜底方案，记录量<500条时可用）
   */
  async computeTitleUserStatsLocal() {
    const db = this.getDb()
    const userId = this.globalData.userId
    const profile = this.globalData.userProfile || {}

    const stats = {
      totalCultivation: Number(profile.totalCultivation || 0),
      streakDays: Number(profile.streakDays || 0),
      totalCheckinDays: 0,
      breakStreakCount: 0,
      maxDimStreak: 0,
      dimCompletionRate3: 0,
      dimCompletionRate5: 0,
      dimCounts: { wu: 0, shi: 0, wu_xin: 0, gong: 0, sha: 0 },
      dimHealthyStreak: { shi: 0 },
      dimCleanStreak: { sha: 0 },
      dimFullStreak: { gong: 0 },
      dimRatios: { wu: 0, shi: 0, wu_xin: 0, gong: 0, sha: 0 },
      modeDays: { strict: 0, sharp: 0 },
      modeStreak: { strict: 0, sharp: 0 },
      modeEscapeCount: 0,
      lateDietCount: 0,
      lateCheckinCount: 0,
      weekdayWorkHours: 0,
      workHoursCheckin: 0,
      weekendOnlyWeeks: 0,
      makeupCount: 0,
      meritScore: this.globalData.meritData ? this.globalData.meritData.totalMerit : 0
    }

    if (!db || !userId) return stats

    try {
      // 获取全量已印证记录（限制500条，超量数据走云函数）
      const res = await db.collection('records')
        .where({ userId })
        .limit(500)
        .get()
      const records = (res.data || []).filter(function(r) {
        return (r.status || 'confirmed') === 'confirmed'
      })

      if (!records.length) return stats

      // 按日期分组
      var dateMap = {}
      records.forEach(function(r) {
        var d = r.date
        if (!d) return
        if (!dateMap[d]) dateMap[d] = []
        dateMap[d].push(r)
      })

      var dates = Object.keys(dateMap).sort()
      stats.totalCheckinDays = dates.length

      // 各维度累计打卡次数 / 时间分析
      var dimNames = { sport: 'wu', diet: 'shi', study: 'wu_xin', work: 'gong', debuff: 'sha' }
      records.forEach(function(r) {
        var type = r.type || r.category || ''
        var dim = dimNames[type] || null
        if (dim && stats.dimCounts[dim] !== undefined) {
          stats.dimCounts[dim]++
        }

        var ts = r.timestamp || r.createdAt
        if (ts) {
          var d = new Date(ts)
          var hour = d.getHours()
          var day = d.getDay()

          if (hour >= 23) stats.lateCheckinCount++
          if (hour >= 22 && (type === 'diet' || type === 'shi')) stats.lateDietCount++

          if (day >= 1 && day <= 5) {
            stats.weekdayWorkHours++
            if (hour >= 10 && hour < 16) stats.workHoursCheckin++
          }
        }

        if (r.isMakeup) stats.makeupCount++
      })

      // 维度打卡率
      var totalDays = Math.max(1, stats.totalCheckinDays)
      var dimRatiosRaw = {}
      var activeCount3 = 0
      var activeCount5 = 0
      var dimKeys = ['wu', 'shi', 'wu_xin', 'gong', 'sha']
      dimKeys.forEach(function(dk) {
        var ratio = Math.min(1, (stats.dimCounts[dk] || 0) / totalDays)
        dimRatiosRaw[dk] = ratio
        if (ratio >= 0.6) activeCount3++
        if (ratio >= 0.7) activeCount5++
      })
      stats.dimRatios = dimRatiosRaw
      stats.dimCompletionRate3 = Math.min(1, activeCount3 / 3)
      stats.dimCompletionRate5 = Math.min(1, activeCount5 / 5)

      // 单维度最长连续打卡
      var maxStreak = 0
      dimKeys.forEach(function(dk) {
        var dimDates = []
        dates.forEach(function(dateStr) {
          var dayRecords = dateMap[dateStr] || []
          var hasDim = dayRecords.some(function(r) {
            var type = r.type || r.category || ''
            return dimNames[type] === dk
          })
          if (hasDim) dimDates.push(dateStr)
        })
        var currentStreak = 0
        var bestStreak = 0
        dimDates.forEach(function(d, i) {
          if (i === 0) { currentStreak = 1 }
          else {
            var diff = (new Date(d) - new Date(dimDates[i - 1])) / 86400000
            currentStreak = diff === 1 ? currentStreak + 1 : 1
          }
          if (currentStreak > bestStreak) bestStreak = currentStreak
        })
        if (bestStreak > maxStreak) maxStreak = bestStreak
        if (dk === 'shi') stats.dimHealthyStreak.shi = bestStreak
        if (dk === 'sha') stats.dimCleanStreak.sha = bestStreak
      })
      stats.maxDimStreak = maxStreak
      stats.dimFullStreak = { gong: maxStreak }

      // 断签次数
      var breakCount = 0
      for (var i = 1; i < dates.length; i++) {
        var diffDays = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000
        if (diffDays > 1) breakCount++
      }
      stats.breakStreakCount = breakCount

      // 模式天数
      var modeDateMap = { strict: {}, sharp: {} }
      records.forEach(function(r) {
        var mode = r.practiceMode || r.mode || ''
        if (mode && modeDateMap[mode] && r.date) {
          modeDateMap[mode][r.date] = true
        }
      })
      stats.modeDays.strict = Object.keys(modeDateMap.strict).length
      stats.modeDays.sharp = Object.keys(modeDateMap.sharp).length

      Object.keys(modeDateMap).forEach(function(m) {
        var modeDates = Object.keys(modeDateMap[m]).sort()
        var curStreak = 0
        var bestModeStreak = 0
        modeDates.forEach(function(d, i) {
          if (i === 0) { curStreak = 1 }
          else {
            var diff = (new Date(d) - new Date(modeDates[i - 1])) / 86400000
            curStreak = diff === 1 ? curStreak + 1 : 1
          }
          if (curStreak > bestModeStreak) bestModeStreak = curStreak
        })
        if (m === 'strict' || m === 'sharp') stats.modeStreak[m] = bestModeStreak
      })

      stats.modeEscapeCount = records.filter(function(r) {
        return r.escapeMode || r.emergencyExit
      }).length

      // 仅周末打卡周数（修正时区：使用本地日期构造避免UTC偏移）
      var weekMap = {}
      dates.forEach(function(dateStr) {
        var parts = dateStr.split('-')
        var dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        var dayOfWeek = dt.getDay()
        var monday = new Date(dt)
        monday.setDate(dt.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
        var weekKey = monday.getFullYear() + '-' + String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0')
        if (!weekMap[weekKey]) weekMap[weekKey] = { days: {} }
        weekMap[weekKey].days[dayOfWeek] = true
      })
      var weekendOnlyWeeks = 0
      Object.keys(weekMap).forEach(function(wk) {
        var days = weekMap[wk].days
        var hasWeekday = [1, 2, 3, 4, 5].some(function(d) { return days[d] })
        var hasWeekend = [0, 6].some(function(d) { return days[d] })
        if (hasWeekend && !hasWeekday) weekendOnlyWeeks++
      })
      stats.weekendOnlyWeeks = weekendOnlyWeeks

    } catch (e) {
      console.error('[titles] 计算用户统计失败', e)
    }

    // ===== 根骨数据聚合（供道牒殿称号条件判定） =====
    this._injectBoneStats(stats)

    this.globalData.titleStats = stats
    return stats
  },

  /**
   * 获取所有已解锁的称号列表
   * @returns {Promise<Array>} 已解锁称号数组
   */
  async getAllUnlockedTitles() {
    try {
      var stats = this.globalData.titleStats
      if (!stats) {
        stats = await this.computeTitleUserStats()
      }
      var { getUnlockedTitles } = require('./utils/titles.js')
      var unlockedTitles = getUnlockedTitles(stats)
      this.globalData._cachedUnlockedTitles = unlockedTitles
      return unlockedTitles
    } catch (e) { return [] }
  },

  /**
   * 检查是否有新解锁的称号（相比上次缓存）
   * 每日仅计算一次，后续调用直接返回缓存结果
   * @returns {Promise<Array>} 新解锁的称号数组
   */
  async checkNewTitleUnlocks() {
    try {
      // >>> 性能优化：当天已检查过直接跳过，避免每次 onShow 调云函数
      var today = this.getTodayDate ? this.getTodayDate() : new Date().toISOString().slice(0, 10)
      var lastCheckDate = this.globalData._titleCheckDate || ''
      try {
        lastCheckDate = lastCheckDate || wx.getStorageSync('tiandao_title_check_date') || ''
      } catch (e) {}
      
      if (lastCheckDate === today) return []
      
      var allUnlocked = await this.getAllUnlockedTitles()
      if (!allUnlocked.length) {
        // 即使没解锁也记录检查日期，避免反复调云函数
        this.globalData._titleCheckDate = today
        try { wx.setStorageSync('tiandao_title_check_date', today) } catch (e) {}
        return []
      }

      var newIds = allUnlocked.map(function(t) { return t.id })
      var cachedIds = this.globalData.titleUnlockCache || []
      try {
        var stored = wx.getStorageSync(STORAGE_KEYS.titleUnlockCache) || []
        cachedIds = Array.isArray(stored) ? stored : []
      } catch (e) { /* ignore */ }

      var newlyUnlocked = allUnlocked.filter(function(t) {
        return cachedIds.indexOf(t.id) === -1
      })

      // 更新缓存
      this.globalData.titleUnlockCache = newIds
      try {
        wx.setStorageSync(STORAGE_KEYS.titleUnlockCache, newIds)
      } catch (e) { /* ignore */ }

      // 记录今日已检查
      this.globalData._titleCheckDate = today
      try { wx.setStorageSync('tiandao_title_check_date', today) } catch (e) {}

      return newlyUnlocked
    } catch (e) { return [] }
  },

  /**
   * 补充根骨数据到称号统计 stats 中（供 bone 类称号解锁条件判定）
   */
  _injectBoneStats(stats) {
    try {
      var rootBone = require('./utils/root-bone.js')
      var comp = rootBone.calculateComposite()
      if (!comp) return
      stats.boneCompositeScore = comp.compositeScore || 0
      stats.boneAllSixImmortal = comp.boneAllSixImmortal || false
      if (comp.boneLevels) {
        stats.boneStrengthLevel = comp.boneLevels.strength ? comp.boneLevels.strength.level : 0
        stats.boneEnduranceLevel = comp.boneLevels.endurance ? comp.boneLevels.endurance.level : 0
        stats.boneSkillLevel = comp.boneLevels.skill ? comp.boneLevels.skill.level : 0
        stats.boneMindLevel = comp.boneLevels.mind ? comp.boneLevels.mind.level : 0
        stats.boneStudyLevel = comp.boneLevels.study ? comp.boneLevels.study.level : 0
        stats.boneDailyLevel = comp.boneLevels.daily ? comp.boneLevels.daily.level : 0
      }
    } catch (e) {
      // 根骨模块不存在时静默跳过
    }
  },

  /**
   * 刷新称号统计数据（通常在打卡后调用）
   */
  async refreshTitleStats() {
    this.globalData.titleStats = null
    // 同步刷新根骨缓存
    this.refreshRecordBoneCache()
    return this.computeTitleUserStats()
  },

  /**
   * 刷新记录→根骨分值缓存（记录提交/确认后调用）
   * 把 records 集合中的运动数据按根骨品类聚合后写入 localStorage
   * 供 root-bone.js 实时读取参与根骨等级计算
   */
  async refreshRecordBoneCache() {
    try {
      var userId = this.globalData.userId
      if (!userId) return

      var db = wx.cloud.database()
      var _ = db.command
      var { getBoneCategory } = require('./utils/sport-movements.js')
      var { refreshRecordBoneCache } = require('./utils/root-bone.js')

      // 拉取该用户所有已确认的记录
      var allRecords = []
      var batchSize = 100
      var skip = 0
      var hasMore = true
      while (hasMore) {
        try {
          var res = await db.collection('records')
            .where({ userId: userId, status: 'confirmed' })
            .skip(skip)
            .limit(batchSize)
            .get()
          if (res.data && res.data.length > 0) {
            allRecords = allRecords.concat(res.data)
            skip += batchSize
          } else {
            hasMore = false
          }
        } catch (e) {
          hasMore = false
        }
      }

      // 按根骨品类聚合分数
      var boneScores = { strength: 0, endurance: 0, mind: 0 }
      allRecords.forEach(function(rec) {
        var movementId = (rec.detail && rec.detail.movementId) || rec.movementId || ''
        var score = Number(rec.score || 0)
        if (!movementId || score <= 0) return

        var boneCategory = getBoneCategory(movementId)
        if (boneCategory && boneScores[boneCategory] !== undefined) {
          boneScores[boneCategory] += score
        }
      })

      refreshRecordBoneCache(boneScores)
      console.log('[app] 记录→根骨缓存已刷新', boneScores)
    } catch (e) {
      console.error('[app] 刷新记录→根骨缓存失败', e)
    }
  },

  /**
   * 获取带称号加成的综合加成信息（扩展 calcTodayCultivationCoeff）
   * 总加成不超过35%
   * @returns {object} 包含 titleBonus, titleBonusItem, combinedRate 等
   */
  getTitleBonusInfo() {
    try {
      var baseResult = this.calcTodayCultivationCoeff()
      var title = this.getEquippedTitle()
      var titleRate = title ? (Number(title.bonus) || 0) : 0

      // >>> 功德加成
      var meritInfo = this.getMeritBonusInfo()
      var meritRate = meritInfo.rate || 0

      var baseRate = baseResult.rate || 0
      var combinedRate = baseRate + titleRate + meritRate
      var totalCap = BONUS_RULES.total_cap || 0.35
      var capped = combinedRate > totalCap
      var effectiveCombined = Math.min(combinedRate, totalCap)

      var titleBonusItem = null
      if (title && titleRate > 0) {
        titleBonusItem = {
          label: '道牒·' + title.name,
          rate: titleRate,
          type: 'bonus',
          color: title.color
        }
      }

      var meritBonusItem = null
      if (meritRate > 0) {
        meritBonusItem = meritInfo.bonusItem || {
          label: '功德加成：' + meritInfo.name,
          rate: meritRate,
          type: 'bonus',
          color: meritInfo.color,
          icon: meritInfo.icon
        }
      }

      var bonusItems = (baseResult.bonusItems || []).slice()
      if (titleBonusItem) bonusItems.push(titleBonusItem)
      if (meritBonusItem) bonusItems.push(meritBonusItem)

      return {
        coeff: 1 + effectiveCombined,
        rate: effectiveCombined,
        baseRate: baseRate,
        titleRate: titleRate,
        meritRate: meritRate,
        capped: capped,
        titleBonusItem: titleBonusItem,
        meritBonusItem: meritBonusItem,
        bonusItems: bonusItems,
        debuffItems: baseResult.debuffItems || [],
        bonusText: bonusItems.map(function(item) { return item.label }),
        debuffText: (baseResult.debuffItems || []).map(function(item) { return item.label }),
        equippedTitle: title,
        meritInfo: meritInfo
      }
    } catch (e) {
      console.error('[titles] getTitleBonusInfo 失败', e)
      return {
        coeff: 1,
        rate: 0,
        baseRate: 0,
        titleRate: 0,
        meritRate: 0,
        capped: false,
        titleBonusItem: null,
        meritBonusItem: null,
        bonusItems: [],
        debuffItems: [],
        bonusText: [],
        debuffText: [],
        equippedTitle: null,
        meritInfo: null
      }
    }
  },

  // ============================================================
  // >>> 功德系统
  // ============================================================

  /**
   * 加载用户功德数据（贡献→功德值）
   * 优先云函数，降级本地 publishedList 聚合
   * @returns {object} { totalMerit, levelInfo, breakdown, nextLevelAt }
   */
  async loadMeritData() {
    // 优先调云函数 get-creator-stats
    if (wx.cloud && wx.cloud.callFunction) {
      try {
        var meritEngine = require('./utils/merit-engine.js')
        // 尝试调用 template-manager 的 getCreatorStats
        var res = await new Promise(function(resolve) {
          wx.cloud.callFunction({
            name: 'template-manager',
            data: { action: 'getCreatorStats', userId: '' }
          }).then(resolve).catch(function(e) {
            console.warn('[merit] 云函数调用失败，降级本地', e.message)
            resolve(null)
          })
        })
        if (res && res.result && res.result.stats) {
          var stats = res.result.stats
          var meritResult = meritEngine.computeMerit(stats)
          this.globalData.meritData = meritResult
          return meritResult
        }
      } catch (e) {
        console.warn('[merit] 云函数失败，降级本地', e.message || e)
      }
    }

    // 降级：本地聚合
    return this.computeMeritLocal()
  },

  /**
   * 本地降级计算功德
   */
  computeMeritLocal() {
    try {
      var meritEngine = require('./utils/merit-engine.js')
      var publishedList = []
      // 尝试读取本地缓存中的模板列表
      try {
        var cache = wx.getStorageSync('tiandao_published_list')
        if (cache && cache.length) publishedList = cache
      } catch (_) {}
      // 也用 globalData 的
      if (!publishedList.length && this.globalData.publishedTemplates) {
        publishedList = this.globalData.publishedTemplates
      }
      var meritResult = meritEngine.computeMeritLocal(publishedList)
      this.globalData.meritData = meritResult
      return meritResult
    } catch (e) {
      console.error('[merit] 本地计算失败', e)
      return { totalMerit: 0, levelInfo: null, breakdown: [] }
    }
  },

  /**
   * 获取功德加成信息（给 getTitleBonusInfo 调用）
   */
  getMeritBonusInfo() {
    var meritData = this.globalData.meritData
    var totalMerit = meritData ? meritData.totalMerit : 0
    var meritEngine = require('./utils/merit-engine.js')
    return meritEngine.getMeritBonus(totalMerit)
  },

  // ============================================================
  // >>> 系统面板
  // ============================================================

  /**
   * 系统面板：获取/刷新每日任务
   */
  getDailyTasks() {
    var system = require('./utils/system.js')
    return system.refreshDailyTasks()
  },

  /**
   * 系统面板：检查任务完成
   */
  checkSystemTask(taskId, taskCategory, records) {
    var system = require('./utils/system.js')
    return system.checkTaskCompletion(taskId, taskCategory, records)
  },

  /**
   * 系统面板：检查是否触发突破
   */
  checkRealmBreakthrough(totalCultivation) {
    var system = require('./utils/system.js')
    var result = system.checkBreakthrough(totalCultivation)
    if (result.triggered) {
      this.globalData.lastRealmIndex = result.currentIdx
      try { wx.setStorageSync(STORAGE_KEYS.lastRealmIndex, result.currentIdx) } catch (e) {}
    }
    return result
  },

  /**
   * 系统面板：获取系统公告
   */
  getSystemAnnouncement(stats) {
    var system = require('./utils/system.js')
    return system.getSystemAnnouncement(stats)
  },

  /**
   * 系统面板：获取今日运势
   */
  getDailyFortune() {
    var system = require('./utils/system.js')
    return system.getDailyFortune()
  },

  /**
   * 系统面板：获取道童主动消息
   */
  getDaoSpiritMsg(scenario) {
    var system = require('./utils/system.js')
    return system.getDaoSpiritMessage(scenario)
  },

  /**
   * 获取当前佩戴称号的定场诗
   */
  getEquippedTitlePoem() {
    var title = this.getEquippedTitle()
    if (title && title.poem) return title.poem
    return ''
  },

  /**
   * 获取签名诗（优先用户自定义，无则取称号定场诗，再无返回默认）
   */
  getSignaturePoem: function() {
    var profile = this.globalData.userProfile || {}
    // 1. 用户自定义签名诗
    if (profile.signaturePoem && profile.signaturePoem.trim()) {
      return profile.signaturePoem.trim()
    }
    // 2. 称号定场诗
    var title = this.getEquippedTitle()
    if (title && title.poem) return title.poem
    // 3. 根据境界返回默认诗
    return this._getDefaultPoemByRealm()
  },

  /**
   * 保存签名诗
   */
  saveSignaturePoem: function(poem) {
    var that = this
    return new Promise(function(resolve, reject) {
      try {
        that.globalData.userProfile.signaturePoem = poem
        try { wx.setStorageSync(STORAGE_KEYS.signaturePoem, poem) } catch (e) {}
        
        // 同步云端
        that.ensureUserProfile().then(function(profile) {
          if (profile && profile._id) {
            var db = that.globalData.db
            if (db) {
              db.collection('users').doc(profile._id).update({
                data: { signaturePoem: poem, updatedAt: Date.now() }
              }).then(function() {
                // 广播事件
                that.emitAppEvent('signature-poem-changed', { poem: poem })
                resolve(true)
              }).catch(function(err) { reject(err) })
            } else {
              that.emitAppEvent('signature-poem-changed', { poem: poem })
              resolve(true)
            }
          } else {
            that.emitAppEvent('signature-poem-changed', { poem: poem })
            resolve(true)
          }
        }).catch(function(err) { reject(err) })
      } catch (e) { reject(e) }
    })
  },

  /**
   * 根据当前境界返回默认定场诗
   */
  _getDefaultPoemByRealm: function() {
    try {
      var profile = this.globalData.userProfile || {}
      var totalCultivation = Number(profile.totalCultivation || 0)
      var mainTemplate = this.getMainTemplate ? this.getMainTemplate() : null
      var realmNames = (mainTemplate && mainTemplate.realmNames) || ['炼气','筑基','金丹','元婴']
      var realm = this.getRealmByScore ? this.getRealmByScore(totalCultivation) : null
      var realmName = (realm && realm.name) || '炼气'
      
      var poems = {
        '炼气': '引气入体初问道，凡胎始脱天地宽。',
        '筑基': '百日筑基尘与土，道心初定破玄关。',
        '金丹': '龙虎交媾结金丹，一颗圆光照大千。',
        '元婴': '丹田破茧化元婴，从此超凡入圣门。',
        '化神': '化身千万显神通，一念苍穹一念空。'
      }
      return poems[realmName] || '修行路上莫问前程，道心所致皆是修行。'
    } catch (e) {
      return '修行路上莫问前程，道心所致皆是修行。'
    }
  },

  /**
   * 获取用户公开信息（用于他人主页展示）
   */
  getUserPublicInfo: function(userId) {
    var that = this
    return new Promise(function(resolve, reject) {
      try {
        var db = that.globalData.db
        if (!db) { resolve(null); return }
        
        db.collection('users').where({ userId: userId }).limit(1).get().then(function(res) {
          if (res.data && res.data.length > 0) {
            var user = res.data[0]
            resolve({
              userId: user.userId,
              nickName: user.nickName || '无名修士',
              totalCultivation: user.totalCultivation || 0,
              streakDays: user.streakDays || 0,
              signaturePoem: user.signaturePoem || '',
              cultivationSystem: user.cultivationSystem || 'traditional',
              mainTemplate: user.mainTemplate || null,
              sideTemplates: user.sideTemplates || [],
              bodyProfile: user.bodyProfile || {},
              createdAt: user.createdAt || 0,
              updatedAt: user.updatedAt || 0,
              // 需要再查当前佩戴称号
              equippedTitleId: user.equippedTitleId || ''
            })
          } else {
            resolve(null)
          }
        }).catch(function(err) { reject(err) })
      } catch (e) { reject(e) }
    })
  },

  /**
   * 获取用户已解锁称号及其定场诗
   */
  getTitlePoemList() {
    var allUnlocked = this.globalData._cachedUnlockedTitles || []
    return allUnlocked.filter(function(t) { return t.poem }).map(function(t) {
      return { id: t.id, name: t.name, poem: t.poem, color: t.color }
    })
  },

  // ============================================================
  // >>> 道童 AI 能力（通过云函数调用多模态AI模型）
  // ============================================================

  /**
   * 检查 AI 功能是否已启用
   */
  isAIEnabled() {
    return getEnableAI()
  },

  /**
   * 调用道童 AI 云函数（API Key 由云函数环境变量注入）
   * @param {string} action - chat | recognize_record | query_data | recognize_media | get_daily_record
   * @param {object} params - 对应 action 所需参数
   * @returns {Promise<object>}
   */
  async callDaoSpiritAI(action, params = {}) {
    if (!this.isAIEnabled()) {
      this.showSystemToast('AI 功能尚未启用', 'none')
      return { ok: false, error: 'AI 功能未启用，请在设置中开启 AI 功能并在云开发控制台配置 API Key 环境变量' }
    }

    try {
      var res = await wx.cloud.callFunction({
        name: 'dao-spirit-ai',
        data: {
          action: action,
          ...params
        }
      })
      return res.result || { ok: false, error: '云函数无返回' }
    } catch (error) {
      console.error('[道童AI] 调用失败', error)
      wx.showToast({ title: '道童暂时不在，请稍后再试', icon: 'none' })
      return { ok: false, error: String(error) }
    }
  },

  /**
   * 获取今日打卡汇总（供 AI 数据查询使用）
   */
  async getTodaySummary() {
    var db = this.getDb()
    if (!db) return { records: [], totalScore: 0, dimensionCounts: {} }

    try {
      var res = await db.collection('records')
        .where({
          userId: this.globalData.userId,
          date: this.getTodayDate()
        })
        .get()
      var records = (res.data || []).filter(function(r) {
        return (r.status || RECORD_STATUS.CONFIRMED) === RECORD_STATUS.CONFIRMED
      })
      var totalScore = records.reduce(function(sum, r) { return sum + Number(r.score || 0) }, 0)
      var dimCounts = { wu: 0, shi: 0, wu_xin: 0, gong: 0, sha: 0 }
      var typeMap = { sport: 'wu', diet: 'shi', study: 'wu_xin', work: 'gong', debuff: 'sha' }
      records.forEach(function(r) {
        var dim = typeMap[r.type || r.category] || 'wu'
        if (dimCounts[dim] !== undefined) dimCounts[dim]++
      })
      return { records: records, totalScore: totalScore, dimensionCounts: dimCounts }
    } catch (e) {
      return { records: [], totalScore: 0, dimensionCounts: {} }
    }
  },

  /**
   * 获取本周打卡汇总（供 AI 数据查询使用）
   */
  async getWeeklySummary() {
    var db = this.getDb()
    if (!db) return { days: 0, totalScore: 0, dimensionCounts: {} }

    var now = new Date()
    var dayOfWeek = now.getDay()
    var monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    var startDate = this.formatDate(monday)
    var endDate = this.getTodayDate()

    try {
      var res = await db.collection('records')
        .where({
          userId: this.globalData.userId
        })
        .get()
      var records = (res.data || []).filter(function(r) {
        return (r.status || RECORD_STATUS.CONFIRMED) === RECORD_STATUS.CONFIRMED
          && r.date >= startDate && r.date <= endDate
      })
      var dateSet = {}
      var dimCounts = { wu: 0, shi: 0, wu_xin: 0, gong: 0, sha: 0 }
      var typeMap = { sport: 'wu', diet: 'shi', study: 'wu_xin', work: 'gong', debuff: 'sha' }
      var totalScore = 0
      records.forEach(function(r) {
        dateSet[r.date] = true
        totalScore += Number(r.score || 0)
        var dim = typeMap[r.type || r.category] || 'wu'
        if (dimCounts[dim] !== undefined) dimCounts[dim]++
      })
      return { days: Object.keys(dateSet).length, totalScore: totalScore, dimensionCounts: dimCounts, records: records }
    } catch (e) {
      return { days: 0, totalScore: 0, dimensionCounts: {} }
    }
  },

  /**
   * 获取修行进度汇总（供 AI 数据查询使用）
   */
  async getCultivationSummary() {
    var profile = await this.ensureUserProfile()
    if (!profile) return {}

    var systemKey = this.getCultivationSystem()
    var balanceConfig = getBalanceConfig(systemKey)
    var realmConfig = buildRealmConfigByBaseScore(balanceConfig.baseScore)
    var totalCultivation = Number(profile.totalCultivation || 0)

    // 查找当前境界
    var currentRealm = null
    var realmNames = REALM_NAME_MAP[systemKey] || REALM_NAME_MAP.traditional
    for (var i = 0; i < realmConfig.length; i++) {
      if (totalCultivation >= realmConfig[i].minScore && totalCultivation <= realmConfig[i].maxScore) {
        currentRealm = {
          index: i,
          name: realmNames[i] || realmConfig[i].id,
          stages: realmConfig[i].stages,
          perStage: realmConfig[i].perStage,
          minScore: realmConfig[i].minScore,
          maxScore: realmConfig[i].maxScore,
          progress: totalCultivation - realmConfig[i].minScore,
          remaining: realmConfig[i].maxScore === Infinity ? 0 : realmConfig[i].maxScore - totalCultivation,
          progressPercent: realmConfig[i].maxScore === Infinity ? 100 : Math.min(100, Math.round((totalCultivation - realmConfig[i].minScore) / (realmConfig[i].maxScore - realmConfig[i].minScore) * 100))
        }
        break
      }
    }

    return {
      totalCultivation: totalCultivation,
      totalScore: Number(profile.totalScore || 0),
      streakDays: Number(profile.streakDays || 0),
      lastCheckInDate: profile.lastCheckInDate || '',
      dailyLimit: balanceConfig.dailyLimit,
      nextLimitRealm: balanceConfig.nextLimitRealm,
      currentRealm: currentRealm,
      systemKey: systemKey,
      bodyProfile: profile.bodyProfile || {},
      mainTemplate: profile.mainTemplate || null,
      sideTemplates: profile.sideTemplates || []
    }
  },

  formatDate(d) {
    var y = d.getFullYear()
    var m = String(d.getMonth() + 1).padStart(2, '0')
    var day = String(d.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + day
  },

  // ============================================================
  // >>> v4.0 新增：突破预警检测
  // ============================================================

  /**
   * 检测境界突破预警
   * @returns {object} { nearBreakthrough, warning, realmId, progress, ... }
   */
  checkBreakthroughWarning: function() {
    try {
      var profile = this.globalData.userProfile
      if (!profile) return { nearBreakthrough: false }
      var totalScore = Number(profile.totalCultivation || 0)
      var systemKey = profile.cultivationSystem || this.getCultivationSystem() || 'traditional'

      var balanceConfig = getBalanceConfig(systemKey)
      var nextLimitRealm = balanceConfig && balanceConfig.nextLimitRealm
      if (!nextLimitRealm) return { nearBreakthrough: false }

      var threshold = nextLimitRealm * 4
      var progress = totalScore / threshold

      return {
        nearBreakthrough: progress >= 0.9,
        warning: progress >= 0.9 ? '修行已达瓶颈，突破在即' : null,
        realmId: profile.realmId || 'lianqi',
        systemKey: systemKey,
        totalScore: totalScore,
        threshold: threshold,
        progress: Math.min(progress, 1.0),
        remaining: Math.max(0, threshold - totalScore)
      }
    } catch (e) {
      return { nearBreakthrough: false }
    }
  }
})
