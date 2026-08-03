// 天道修行 - 全局枚举常量文件
// 统一所有分类、状态、事件名、集合名等枚举值
// 各模块禁止硬编码字符串，统一引用此处常量

// ============================================================
// 存储键名
// ============================================================
const STORAGE_KEYS = {
  userId: 'tiandao_user_id',
  cultivationSystem: 'tiandao_cultivation_system',
  bodyProfile: 'tiandao_body_profile',
  currentTemplate: 'tiandao_current_template',
  mainTemplate: 'tiandao_main_template',
  sideTemplates: 'tiandao_side_templates',
  dailyScoreLedger: 'tiandao_daily_score_ledger',
  lastRecordSnapshot: 'tiandao_last_record_snapshot',
  customDaoze: 'tiandao_custom_daoze',
  practiceMode: 'tiandao_practice_mode',
  equippedTitle: 'tiandao_equipped_title',
  titleUnlockCache: 'tiandao_title_unlock_cache',
  templateCheckin: 'tiandao_template_checkin',
  templateLevels: 'tiandao_template_levels',
  themeOverride: 'tiandao_theme_override',
  spiritHidden: 'tiandao_spirit_hidden',
  realmCounts: 'tiandao_realm_counts',
  dailyTemplateRefresh: 'tiandao_daily_template_refresh',
  // >>> 模板社区存储键
  templateCache: 'tiandao_template_cache',
  templateFavLocal: 'tiandao_template_fav_local',
  templateCollectionSyncDate: 'tiandao_template_sync_date',
  titleCheckDate: 'tiandao_title_check_date',
  // >>> v4.0 新增：道基/丹药/突破/散功/等级
  daoFoundations: 'tiandao_dao_foundations',
  pillInventory: 'tiandao_pill_inventory',
  pillUsageLog: 'tiandao_pill_usage_log',
  breakthroughHistory: 'tiandao_breakthrough_history',
  resetCultivationRecords: 'tiandao_reset_records',
  lastFeedbackTime: 'tiandao_last_feedback_time',
  milestoneCache: 'tiandao_milestone_cache',
  titleGradeCache: 'tiandao_title_grade_cache',
  leaderboardCache: 'tiandao_leaderboard_cache',
  realmRightsCache: 'tiandao_realm_rights_cache',
  antiCheatToken: 'tiandao_anti_cheat_token',
  dailyPillReminder: 'tiandao_daily_pill_reminder',
  buTianProgress: 'tiandao_bu_tian_progress',
  // >>> 根骨体系
  rootBoneConfig: 'tiandao_root_bone_config'
}

// ============================================================
// 记录分类（五分类标准）
// ============================================================
const RECORD_CATEGORY = {
  SPORT: 'sport',
  DIET: 'diet',
  STUDY: 'study',
  WORK: 'work',
  DEBUFF: 'debuff'
}

// 分类中文标签
const CATEGORY_LABELS = {
  sport: '武·炼体',
  diet: '食·丹食',
  study: '悟·修心',
  work: '工·功业',
  debuff: '煞·心魔'
}

// AI识别 type 到分类映射
const AI_TYPE_TO_CATEGORY = {
  wu: 'sport',
  shi: 'diet',
  wu_xin: 'study',
  gong: 'work',
  sha: 'debuff'
}

// 分类到 AI type 映射
const CATEGORY_TO_AI_TYPE = {
  sport: 'wu',
  diet: 'shi',
  study: 'wu_xin',
  work: 'gong',
  debuff: 'sha'
}

// 道途维度名映射
const DIM_NAMES = {
  sport: 'wu',
  diet: 'shi',
  study: 'wu_xin',
  work: 'gong',
  debuff: 'sha'
}

// ============================================================
// 记录状态
// ============================================================
const RECORD_STATUS = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending'
}

// ============================================================
// 修炼体系
// ============================================================
const VALID_CULTIVATION_SYSTEMS = [
  'traditional', 'body', 'beauty', 'worldly',
  'wuxia', 'ninja', 'knight', 'sequence', 'cthulhu'
]

// ============================================================
// 道途训练分类
// ============================================================
const TRAINING_PATHS = {
  LIANTI: 'lianti',
  LIANQI: 'lianqi',
  YANGQI: 'yangqi',
  XIUXIN: 'xiuxin',
  RICHANG: 'richang'
}

// ============================================================
// 模板阵营
// ============================================================
const CAMP = {
  MAIN: 'main',
  SIDE: 'side'
}

// 辅修模板数量上限
const MAX_SIDE_TEMPLATES = 3

// ============================================================
// 修炼模式
// ============================================================
const PRACTICE_MODE = {
  EASY: 'easy',
  NORMAL: 'normal',
  STRICT: 'strict',
  SHARP: 'sharp'
}

// ============================================================
// 媒体权重
// ============================================================
const MEDIA_WEIGHT = {
  NONE: 1.0,
  IMAGE: 1.5,
  VIDEO: 2.0
}

// ============================================================
// 称号分类
// ============================================================
const TITLE_CATEGORY = {
  CORE: 'core',
  BEHAVIOR: 'behavior',
  FUN: 'fun',
  HIDDEN: 'hidden'
}

// ============================================================
// 云数据库集合名
// ============================================================
const COLLECTIONS = {
  RECORDS: 'records',
  USERS: 'users',
  DAILY_SPIRIT: 'daily_spirit',
  SPIRIT_CONVERSATIONS: 'spirit_conversations',
  SPIRIT_RATE_LIMITS: 'spirit_rate_limits',
  // >>> 模板社区集合
  PUBLIC_TEMPLATES: 'public_templates',
  TEMPLATE_LIKES: 'template_likes',
  TEMPLATE_FAVORITES: 'template_favorites',
  TEMPLATE_COMMENTS: 'template_comments',
  USER_FOLLOWS: 'user_follows',
  // >>> v4.0 新增集合
  DAO_FOUNDATIONS: 'dao_foundations',
  PILLS: 'pills',
  PILL_DEFINITIONS: 'pill_definitions',
  PILL_USAGE_LOGS: 'pill_usage_logs',
  RESET_RECORDS: 'reset_records',
  TITLE_GRADES: 'title_grades',
  CUSTOMER_SERVICE_MESSAGES: 'customer_service_messages',
  OFFICIAL_ACTIVITIES: 'official_activities',
  ACTIVITY_PARTICIPATIONS: 'activity_participations',
  LEADERBOARD_SNAPSHOT: 'leaderboard_snapshot'
}

// ============================================================
// 事件名
// ============================================================
const EVENT_NAMES = {
  SCORE_UPDATED: 'score-updated',
  THEME_OVERRIDE_CHANGED: 'themeOverrideChanged',
  SPIRIT_VISIBILITY_CHANGED: 'spirit-visibility-changed',
  BODY_PROFILE_CHANGED: 'body-profile-changed',
  REFRESH_CULTIVATION_PAGES: 'refresh-cultivation-pages',
  DAO_RULES_CHANGED: 'dao-rules-changed',
  // >>> 模板社区事件
  TEMPLATE_IMPORTED: 'template-imported',
  TEMPLATE_UNPUBLISHED: 'template-unpublished',
  TEMPLATE_PUBLISHED: 'template-published',
  TEMPLATE_FAV_CHANGED: 'template-fav-changed',
  FOLLOW_CHANGED: 'follow-changed',
  // >>> v4.0 新增事件
  BREAKTHROUGH_TRIGGERED: 'breakthrough-triggered',
  BREAKTHROUGH_COMPLETED: 'breakthrough-completed',
  CULTIVATION_FEEDBACK: 'cultivation-feedback',
  MILESTONE_ACHIEVED: 'milestone-achieved',
  PILL_USED: 'pill-used',
  PILL_OBTAINED: 'pill-obtained',
  RESET_CULTIVATION: 'reset-cultivation',
  ANTI_CHEAT_VERIFIED: 'anti-cheat-verified',
  TITLE_GRADE_UPDATED: 'title-grade-updated',
  LEADERBOARD_REFRESHED: 'leaderboard-refreshed',
  BU_TIAN_PROGRESS: 'bu-tian-progress'
}

// ============================================================
// 任务类型系数
// ============================================================
const TASK_SCORE_COEFFICIENT = {
  strength: 2,
  cardio: 0.3,
  stretch: 0.1,
  study: 0.15,
  work: 0.15,
  daily: 2,
  diet_healthy: 3,
  diet_unhealthy: -3,
  demon: -3
}

// ============================================================
// v4.0 新增：称号分级体系
// ============================================================
const TITLE_TIER = {
  S: { id: 'S', name: '夯爆了', color: '#efb810', icon: '👑', topPercent: 0.01, maxStack: Infinity, bonusRate: 0.05 },
  A: { id: 'A', name: '顶尖',   color: '#8b5cf6', icon: '💎', topPercent: 0.05, maxStack: 2, bonusRate: 0.03 },
  B: { id: 'B', name: '人上人', color: '#3b82f6', icon: '⭐', topPercent: 0.20, maxStack: 1, bonusRate: 0.02 },
  C: { id: 'C', name: 'NPC',    color: '#9ca3af', icon: '🧑', topPercent: 0.50, maxStack: 1, bonusRate: 0.01 },
  D: { id: 'D', name: '拉完了', color: '#6b7280', icon: '💤', topPercent: 1.00, maxStack: 1, bonusRate: 0.00 }
}

// 道基品质等级
const DAO_FOUNDATION_GRADE = {
  XIA:    { id: 'xia',    name: '下品', color: '#9ca3af', bonusRate: 0.00, minDays: 0,  maxDays: 15 },
  ZHONG:  { id: 'zhong',  name: '中品', color: '#22c55e', bonusRate: 0.02, minDays: 16, maxDays: 45 },
  SHANG:  { id: 'shang',  name: '上品', color: '#3b82f6', bonusRate: 0.05, minDays: 46, maxDays: 90 },
  JI:     { id: 'ji',     name: '极品', color: '#eab308', bonusRate: 0.08, minDays: 91, maxDays: 180 },
  XIAN:   { id: 'xian',   name: '仙品', color: '#efb810', bonusRate: 0.12, minDays: 181, maxDays: Infinity }
}

// 丹药类型
const PILL_TYPE = {
  PORE_POOP: { id: 'pore_poop', name: '毛孔拉屎丹', effect: 'capacity_expand', value: 5, rarity: 'common', desc: '排出体内浊气，当日修为上限+5' }
}

// 突破阶段（每个大境界内的4个子阶段）
const REALM_SUBSTAGE = {
  EARLY:    { id: 'early',    label: '初期', order: 0 },
  MIDDLE:   { id: 'middle',   label: '中期', order: 1 },
  LATE:     { id: 'late',     label: '后期', order: 2 },
  PERFECT:  { id: 'perfect',  label: '圆满', order: 3 }
}

// 排行榜类型
const LEADERBOARD_TYPE = {
  POWER:    { id: 'power',    name: '实力榜', source: 'totalCultivation', icon: '⚔️' },
  MERIT:    { id: 'merit',    name: '功德榜', source: 'meritScore',        icon: '🙏' },
  INCENSE:  { id: 'incense',  name: '香火榜', source: 'templateImported', icon: '🔥' }
}

// 修炼行为映射类型
const CULTIVATION_BEHAVIOR_TYPE = {
  LIANTI:  { id: 'lianti',  name: '炼体',   anim: 'iron_body',    particles: 'gold' },
  JINGXIU: { id: 'jingxiu', name: '静修',   anim: 'meditation',   particles: 'cyan' },
  SHENSHI: { id: 'shenshi', name: '神识',   anim: 'mind_expand',  particles: 'purple' },
  DEXING:  { id: 'dexing',  name: '德行',   anim: 'merit_gather', particles: 'white' },
  CUSTOM:  { id: 'custom',  name: '道则',   anim: 'dao_circle',   particles: 'blue' }
}

// ============================================================
// 日期工具
// ============================================================
function getTodayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

module.exports = {
  STORAGE_KEYS,
  RECORD_CATEGORY,
  CATEGORY_LABELS,
  AI_TYPE_TO_CATEGORY,
  CATEGORY_TO_AI_TYPE,
  DIM_NAMES,
  RECORD_STATUS,
  VALID_CULTIVATION_SYSTEMS,
  TRAINING_PATHS,
  CAMP,
  MAX_SIDE_TEMPLATES,
  PRACTICE_MODE,
  MEDIA_WEIGHT,
  TITLE_CATEGORY,
  COLLECTIONS,
  EVENT_NAMES,
  TASK_SCORE_COEFFICIENT,
  TITLE_TIER,
  DAO_FOUNDATION_GRADE,
  PILL_TYPE,
  REALM_SUBSTAGE,
  LEADERBOARD_TYPE,
  CULTIVATION_BEHAVIOR_TYPE,
  getTodayDate,
  getDaysAgo
}
