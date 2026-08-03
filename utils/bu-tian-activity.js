// v4.0 — 补天计划活动引擎
var app = getApp()
var STORAGE_KEY = 'tiandao_bu_tian_progress'

// 活动配置
var ACTIVITY_CONFIG = {
  id: 'bu_tian_plan',
  title: '补天计划',
  subtitle: '天之道，损有余而补不足',
  description: '诸位修士齐心协力，以修行之力修补天道裂痕！',
  contactEmail: '2992571197@qq.com',
  phases: [
    { order: 1, name: '炼石', goal: 1000000, goalDesc: '全服累计修为达到 1,000,000', reward: { pills: ['pore_poop'], bonusRate: 0.03 } },
    { order: 2, name: '补天', goal: 10000,  goalDesc: '全服累计打卡 10,000 天', reward: { bonusRate: 0.05 } },
    { order: 3, name: '定天', goal: 100,    goalDesc: '全服累计发布 100 个模板', reward: { titleId: 'creator_gen1', pillMultiplier: 2 } }
  ],
  specialReward: { name: '五色补天石', desc: '活动限定特殊道具，仅本次活动可获取', icon: '🪨' },
  teamJoinEnabled: true,
  // 首期官方活动 - 共建参与形式
  participationWays: [
    { id: 'feedback', name: '问题反馈', desc: '发现 Bug 或体验问题，提交详细反馈，助我们修复天道裂痕' },
    { id: 'creative', name: '功能创意输出', desc: '提出新功能构想、优化建议，为天道修行注入新的灵气' },
    { id: 'template', name: '优质模板贡献', desc: '设计并发布高质量修行模板，以自身道则福泽万千修士' },
    { id: 'teamup', name: '团队加盟', desc: '加入补天计划核心团队，以己之长共建天道修行之路' }
  ]
}

function getActivityConfig() { return ACTIVITY_CONFIG }

function getLocalProgress() {
  try { return wx.getStorageSync(STORAGE_KEY) || { phase: 1, personalContribution: 0, serverProgress: 0, joined: false } }
  catch(e) { return { phase: 1, personalContribution: 0, serverProgress: 0, joined: false } }
}

function saveLocalProgress(progress) {
  try { wx.setStorageSync(STORAGE_KEY, progress) } catch(e) {}
}

function joinActivity() {
  var p = getLocalProgress()
  p.joined = true
  p.joinedAt = Date.now()
  saveLocalProgress(p)
  return { ok: true, message: '已加入补天计划！' }
}

function addContribution(amount) {
  var p = getLocalProgress()
  if (!p.joined) return { ok: false }
  p.personalContribution = (p.personalContribution || 0) + amount
  saveLocalProgress(p)
  return { ok: true, personalContribution: p.personalContribution }
}

function getCurrentPhase() {
  var p = getLocalProgress()
  var phases = ACTIVITY_CONFIG.phases
  return phases.find(function(ph) { return ph.order === p.phase }) || phases[0]
}

function getActivitySummary() {
  var p = getLocalProgress()
  var phase = getCurrentPhase()
  var progress = p.serverProgress || 0
  var goal = phase.goal || 1
  return {
    title: ACTIVITY_CONFIG.title,
    description: ACTIVITY_CONFIG.description,
    contactEmail: ACTIVITY_CONFIG.contactEmail,
    joined: p.joined,
    currentPhase: phase,
    phaseName: phase.name,
    phaseGoal: phase.goal,
    phaseGoalDesc: phase.goalDesc,
    serverProgress: progress,
    progressPercent: Math.min(100, Math.round(progress / goal * 100)),
    personalContribution: p.personalContribution || 0,
    reward: phase.reward,
    specialReward: ACTIVITY_CONFIG.specialReward,
    participationWays: ACTIVITY_CONFIG.participationWays,
    teamJoinEnabled: ACTIVITY_CONFIG.teamJoinEnabled
  }
}

module.exports = {
  ACTIVITY_CONFIG,
  getActivityConfig,
  getLocalProgress,
  saveLocalProgress,
  joinActivity,
  addContribution,
  getCurrentPhase,
  getActivitySummary
}
