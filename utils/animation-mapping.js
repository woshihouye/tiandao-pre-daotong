// ============================================================
// 天道修行 v4.0 — 行为-修炼类型映射引擎
//
// 核心映射逻辑：
//   练体类（运动、体力打卡）    → 炼体修行动画
//   静修类（学习、阅读、冥想）   → 打坐修行动画
//   神识类（灵鉴物、论道、AI）   → 神识感悟动画
//   德行类（善行打卡、日课完成） → 功德汇聚动画
//   自定义任务                   → 道则主题动画
//
// 境界绑定差异化：同一行为在不同境界下动画效果不同
// ============================================================

// 行为 → 修炼类型 + 动画映射
var BEHAVIOR_MAP = {
  // === 炼体类（运动） ===
  bench_press:   { type: 'lianti',  anim: 'iron_body',    particles: 'gold',   label: '武道炼体' },
  squat:         { type: 'lianti',  anim: 'iron_body',    particles: 'gold',   label: '武道炼体' },
  deadlift:      { type: 'lianti',  anim: 'iron_body',    particles: 'gold',   label: '武道炼体' },
  pull_up:       { type: 'lianti',  anim: 'iron_body',    particles: 'gold',   label: '武道炼体' },
  running:       { type: 'lianti',  anim: 'wind_runner',  particles: 'green',  label: '御风修行' },
  cycling:       { type: 'lianti',  anim: 'wind_runner',  particles: 'green',  label: '御风修行' },
  yoga:          { type: 'jingxiu', anim: 'lotus_bloom',  particles: 'cyan',   label: '莲台静修' },
  meditation:    { type: 'jingxiu', anim: 'lotus_bloom',  particles: 'cyan',   label: '禅定悟道' },
  sport_general: { type: 'lianti',  anim: 'qi_flow',      particles: 'gold',   label: '炼体修行' },

  // === 静修类（学习/工作） ===
  reading:       { type: 'jingxiu', anim: 'meditation',   particles: 'cyan',   label: '静心悟道' },
  study:         { type: 'jingxiu', anim: 'meditation',   particles: 'cyan',   label: '修心悟道' },
  work:          { type: 'jingxiu', anim: 'forge_hammer', particles: 'orange', label: '功业锻造' },

  // === 神识类 ===
  ai_vision:     { type: 'shenshi', anim: 'mind_expand',  particles: 'purple', label: '神识探查' },
  dao_chat:      { type: 'shenshi', anim: 'mind_expand',  particles: 'purple', label: '道心论道' },

  // === 德行类 ===
  good_deed:     { type: 'dexing',  anim: 'merit_gather', particles: 'white',  label: '功德汇聚' },
  daily_checkin: { type: 'dexing',  anim: 'merit_gather', particles: 'white',  label: '日常功课' },

  // === 饮食 ===
  healthy_meal:  { type: 'diet',    anim: 'qi_absorb',    particles: 'blue',   label: '丹食修炼' },
  junk_food:     { type: 'sha',     anim: 'corrosion',    particles: 'red',    label: '浊气入体' },

  // === 心魔 ===
  debuff:        { type: 'sha',     anim: 'corrosion',    particles: 'purple', label: '心魔缠身' },

  // === 自定义 ===
  custom_task:   { type: 'custom',  anim: 'dao_circle',   particles: 'blue',   label: '道则修行' },

  // 默认
  _default:      { type: 'custom',  anim: 'qi_flow',      particles: 'white',  label: '修行' }
}

// 境界层级的动画强化倍数
var REALM_ANIMATION_MULTIPLIER = {
  lianqi:  1.0,
  zhuji:   1.2,
  jindan:  1.5,
  yuanying: 2.0
}

/**
 * 根据行为key解析修炼类型
 * @param {string} behaviorKey - 行为标识（如 'bench_press', 'running', 'study' 等）
 * @returns {object} { type, anim, particles, label }
 */
function resolveCultivationType(behaviorKey) {
  return BEHAVIOR_MAP[behaviorKey] || BEHAVIOR_MAP['_default']
}

/**
 * 根据记录类别解析修炼类型
 * @param {string} category - 'sport'|'diet'|'study'|'work'|'debuff'
 * @param {string} movementId - 运动ID（仅category='sport'时有效）
 * @returns {object} { type, anim, particles, label }
 */
function resolveFromRecord(category, movementId) {
  if (category === 'sport' && movementId) {
    return BEHAVIOR_MAP[movementId] || BEHAVIOR_MAP['sport_general']
  }
  switch (category) {
    case 'study': return BEHAVIOR_MAP['study']
    case 'work':  return BEHAVIOR_MAP['work']
    case 'diet':  return BEHAVIOR_MAP['healthy_meal']
    case 'debuff': return BEHAVIOR_MAP['debuff']
    default:      return BEHAVIOR_MAP['custom_task']
  }
}

/**
 * 获取境界绑定的动画配置
 * @param {string} cultivationType - 修炼类型
 * @param {string} realmId - 当前境界
 * @returns {object} { animationKey, particles, intensity, duration }
 */
function getRealmBoundAnimation(cultivationType, realmId) {
  var behavior = Object.values(BEHAVIOR_MAP).find(function(b) { return b.type === cultivationType }) || BEHAVIOR_MAP['_default']
  var multiplier = REALM_ANIMATION_MULTIPLIER[realmId] || 1.0

  return {
    animationKey: behavior.anim + '_realm_' + (realmId || 'lianqi'),
    particles: behavior.particles,
    intensity: Math.round(multiplier * 100) / 100,
    duration: Math.round(3000 * multiplier), // ms
    label: behavior.label,
    cultivationType: cultivationType,
    realmId: realmId
  }
}

/**
 * 获取所有修炼类型列表
 * @returns {Array}
 */
function getAllCultivationTypes() {
  var seen = {}
  var types = []
  Object.keys(BEHAVIOR_MAP).forEach(function(key) {
    var v = BEHAVIOR_MAP[key]
    if (!seen[v.type]) {
      seen[v.type] = true
      types.push({ type: v.type, label: v.label, anim: v.anim })
    }
  })
  return types
}

module.exports = {
  BEHAVIOR_MAP,
  REALM_ANIMATION_MULTIPLIER,
  resolveCultivationType,
  resolveFromRecord,
  getRealmBoundAnimation,
  getAllCultivationTypes
}
