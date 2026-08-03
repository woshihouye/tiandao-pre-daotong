// ============================================================
// 天道修行 v4.0 — 即时反馈引擎
//
// 三层反馈体系：
//   Layer1 视觉层：粒子配置、进度条微动效、境界提示
//   Layer2 文案层：境界匹配修炼感受文案
//   Layer3 激励层：3/7/30天里程碑检测
// ============================================================

var realmRights = require('./realm-rights.js')

// 粒子特效配置（按修炼类型）
var PARTICLE_CONFIGS = {
  sport:   { type: 'burst',    color: '#f59e0b', count: 12, target: 'progress-bar', spread: 'wide' },
  diet:    { type: 'absorb',   color: '#22c55e', count: 8,  target: 'progress-bar', spread: 'narrow' },
  study:   { type: 'rise',     color: '#3b82f6', count: 10, target: 'progress-bar', spread: 'medium' },
  work:    { type: 'pulse',    color: '#8b5cf6', count: 6,  target: 'progress-bar', spread: 'narrow' },
  debuff:  { type: 'shatter',  color: '#ef4444', count: 4,  target: 'none',        spread: 'wide' }
}

// 小阶段完成提示
var SUBSTAGE_LABELS = ['初期', '中期', '后期', '圆满']

// 境界专属修炼感受文案库（按境界 + 类型组合）
var REALM_QUOTES = {
  lianqi: {
    sport:   ['灵气随动作流转，经脉微微发热', '汗水中感受到真气萌动', '肉身渐显灵光，炼体初成'],
    diet:    ['食气入体，腹中有暖流涌动', '五谷精华化作丹田热力', '丹食之功，贵在日积月累'],
    study:   ['知识如星光，点点汇入识海', '经文入心，澄明一片', '悟道方能破障，明理才可精进'],
    work:    ['凡尘事务亦是修行，功业在积累', '心力所至，灵识开阔', '劳作之间，道心愈坚'],
    _default: ['修行之道，始于足下', '灵根初现，道途漫漫', '每一次修炼都是蜕变']
  },
  zhuji: {
    sport:   ['仙基稳固，力道如江水奔涌', '气贯长虹，一招一式皆有道韵', '筑基已成，肉身如铁'],
    diet:    ['丹食入腹，灵气化力', '食补之功，胜过千年灵芝', '饮食有道，筑基仙途'],
    study:   ['知识生根，识海泛起涟漪', '古经新解，道意通明', '文武之道，一张一弛'],
    work:    ['功业渐成，红尘亦是道场', '心力所至，万物可破', '事业即修行，每一步都是道印'],
    _default: ['筑基有成，道心如磐石', '仙缘已结，妙法在心', '大道初成，前路光明']
  },
  jindan: {
    sport:   ['金丹运转，力如雷霆万钧', '举手投足间，天地灵气汇聚', '肉身为鼎炉，修为化金丹'],
    diet:    ['金丹吞吐灵气，食补臻至化境', '仙食入腹，道韵自生', '丹食之道，契合天地'],
    study:   ['识海翻涌，智慧如金光照耀', '大道至简，悟者自通', '万卷经文心中过，金丹自转'],
    work:    ['虚空之中构筑道场，功业化莲台', '运筹帷幄之间，金丹映照万法', '业力即是法力，功德圆满'],
    _default: ['金丹大成，神通自现', '万法归一，道在心中', '金光照耀前路，步履生莲']
  },
  yuanying: {
    sport:   ['元婴苏醒，天地灵气听我号令', '举手投足间，万物法则清晰可见', '肉身已达凡尘极致，元婴超脱'],
    diet:    ['仙肴入体，元婴欢欣', '食补之道已至化境，不在人间', '万物精华皆为灵药，道体自主炼化'],
    study:   ['神识通天彻地，一览众山小', '元婴论道，字字珠玑', '智慧之光普照大千，万法皆通'],
    work:    ['身为天尊，功业自成天地', '造化在己，万法随心', '业力化天道，功成不必在人间'],
    _default: ['元婴天尊，俯瞰苍生', '道心永恒，天地同寿', '至尊之上，仍有大道']
  }
}

// 里程碑配置
var MILESTONES = [
  { days: 3,   name: '三日筑基',   titlePrefix: '勤修',  bonusRate: 0.01, icon: '🌱' },
  { days: 7,   name: '七日小成',   titlePrefix: '不倦',  bonusRate: 0.02, icon: '🔥' },
  { days: 30,  name: '一月大成',   titlePrefix: '精进',  bonusRate: 0.05, icon: '⭐' },
  { days: 100, name: '百日飞升',   titlePrefix: '天道',  bonusRate: 0.10, icon: '👑' }
]

/**
 * 获取粒子特效配置
 * @param {string} category - 记录分类: sport|diet|study|work|debuff
 * @param {number} score - 分数（分数越高粒子越多）
 * @param {string} realmId - 当前境界
 * @returns {object} 粒子配置
 */
function getParticleEffect(category, score, realmId) {
  var base = PARTICLE_CONFIGS[category] || PARTICLE_CONFIGS['study']
  // 根据分数调整粒子数量（-10~+30 映射到 3~20）
  var countMultiplier = Math.max(0.5, Math.min(2, (score + 10) / 20))
  var realmMultiplier = 1
  if (realmId === 'jindan') realmMultiplier = 1.3
  if (realmId === 'yuanying') realmMultiplier = 1.6
  return {
    type: base.type,
    color: score >= 0 ? base.color : '#ef4444',
    count: Math.round(base.count * countMultiplier * realmMultiplier),
    target: base.target,
    spread: base.spread,
    score: score
  }
}

/**
 * 获取境界匹配修炼感受文案
 * @param {string} category - 记录分类
 * @param {string} realmId - 当前境界
 * @param {number} score - 本次得分
 * @returns {string} 修炼文案
 */
function getRealmQuote(category, realmId, score) {
  var realmQuotes = REALM_QUOTES[realmId] || REALM_QUOTES['lianqi']
  var quotes = realmQuotes[category] || realmQuotes['_default']
  // 根据分数选择文案（分数越高，选越靠后的激励文案）
  var index = 0
  if (score >= 10) index = 2
  else if (score >= 5) index = 1
  if (index >= quotes.length) index = quotes.length - 1
  return quotes[index]
}

/**
 * 检测里程碑达成
 * @param {number} streakDays - 连续修行天数
 * @param {object} userStats - 用户统计数据
 * @returns {object|null} 里程碑信息 或 null（无新里程碑）
 */
function checkMilestone(streakDays, userStats) {
  if (!streakDays) return null
  // 只返回刚好达成的里程碑
  for (var i = 0; i < MILESTONES.length; i++) {
    var m = MILESTONES[i]
    if (streakDays === m.days) {
      return {
        days: m.days,
        name: m.name,
        titlePrefix: m.titlePrefix,
        bonusRate: m.bonusRate,
        icon: m.icon,
        streakDays: streakDays
      }
    }
  }
  return null
}

/**
 * 获取下一次里程碑预览
 * @param {number} streakDays
 * @returns {object|null}
 */
function getNextMilestone(streakDays) {
  for (var i = 0; i < MILESTONES.length; i++) {
    if (MILESTONES[i].days > streakDays) {
      return {
        days: MILESTONES[i].days,
        name: MILESTONES[i].name,
        icon: MILESTONES[i].icon,
        remaining: MILESTONES[i].days - streakDays
      }
    }
  }
  return null
}

/**
 * 生成综合反馈包（三层联动）
 * @param {object} params - { category, score, realmId, streakDays, userStats }
 * @returns {object} 反馈包
 */
function generateFeedbackPackage(params) {
  var p = params || {}
  var category = p.category || 'sport'
  var score = p.score || 0
  var realmId = p.realmId || 'lianqi'
  var streakDays = p.streakDays || 0

  return {
    // Layer1: 视觉
    particle: getParticleEffect(category, score, realmId),
    substagePopup: score > 3 ? null : null, // 子阶段弹出由外部控制
    // Layer2: 文案
    quote: getRealmQuote(category, realmId, score),
    realmName: (realmRights.getRealmRights(realmId)).realmName || '炼气期',
    // Layer3: 激励
    milestone: checkMilestone(streakDays),
    nextMilestone: getNextMilestone(streakDays),
    // 汇总
    timestamp: Date.now()
  }
}

module.exports = {
  PARTICLE_CONFIGS,
  REALM_QUOTES,
  MILESTONES,
  getParticleEffect,
  getRealmQuote,
  checkMilestone,
  getNextMilestone,
  generateFeedbackPackage
}
