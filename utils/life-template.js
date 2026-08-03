// 人生模板体系：大道主修 · 修为系数
// 仅保留大道体系，小道模板已移除

const CUSTOM_TASK_MAX_REWARD = 3
const CUSTOM_DAILY_CAP_MAX = 45
const PUBLIC_TEMPLATE_STORAGE = 'tiandao_public_templates'
const CUSTOM_TEMPLATE_STORAGE = 'tiandao_custom_templates'
const CHECKIN_STORAGE = 'tiandao_template_checkin'
const TEMPLATE_STATE_STORAGE = 'tiandao_template_levels'

/** 阵营 */
const CAMP = {
  MAIN: 'main', // 大道 · 证道主修
  SIDE: 'side' // 小道 · 旁门辅修
}

/**
 * 阵营加成规则
 * baseBonus: 1 级基础加成；maxBonus: 5 级满额加成；debuff: 未达标惩罚
 */
const CAMP_BONUS_RULES = {
  main: { baseBonus: 0.1, maxBonus: 0.2, debuff: -0.15, label: '大道' },
  side: { baseBonus: 0.04, maxBonus: 0.08, debuff: -0.04, label: '小道' }
}

/** 总系数封顶 / 兜底 */
const COEFF_CAPS = { maxBonus: 0.5, minDebuff: -0.3 }

/**
 * 预设模板（仅含大道主修3条）
 */
const PRESET_TEMPLATES = {
  // —— 大道 · 证道主修 ——
  thin_muscle: {
    id: 'thin_muscle',
    name: '力之大道',
    camp: CAMP.MAIN,
    category: 'preset',
    cover: '力',
    themeClass: 'theme-fresh',
    cultivationSystem: 'body',
    goal: '增肌减脂、养成运动习惯',
    subtitle: '炼体修行、塑形筑基',
    description: '面向健身塑形人群，以炼体炼气双修打下肌肌根基。',
    tags: ['大道', '体修', '塑形', '力'],
    dailyCap: 60,
    baseScore: 45,
    founderName: '天工炼体司',
    realmNames: ['炼体境', '锻骨境', '玉髓境', '金身境'],
    isGrandDao: true,
    gongfaCount: 0,
    tasks: [
      { id: 'tm_strength', name: '力量训练30分钟', reward: 15, path: 'lianti', desc: '炼体类' },
      { id: 'tm_cardio', name: '有氧训练20分钟', reward: 10, path: 'lianqi', desc: '炼气类' },
      { id: 'tm_diet', name: '控制饮食（戒高油高糖）', reward: 5, path: 'diet', desc: '丹食' },
      { id: 'tm_water', name: '喝够2L水', reward: 2, path: 'richang', desc: '日常功课' }
    ],
    extras: {}
  },
  gong: {
    id: 'gong',
    name: '工之大道',
    camp: CAMP.MAIN,
    category: 'preset',
    cover: '工',
    themeClass: 'theme-dusk',
    cultivationSystem: 'worldly',
    goal: '产出修行、创造价值',
    subtitle: '产出修行、创造价值',
    description: '面向所有价值产出场景，不限于上班，以炼心入世打磨自身能力，打下立身根基。',
    tags: ['大道', '工作', '产出'],
    dailyCap: 45,
    baseScore: 38,
    founderName: '天工造物司',
    realmNames: ['执事境', '主事境', '掌事境', '宗匠境'],
    isGrandDao: true,
    gongfaCount: 0,
    tasks: [
      { id: 'gong_core', name: '完成当日核心产出目标', reward: 8, path: 'xiuxin', desc: '产出' },
      { id: 'gong_review', name: '当日产出复盘总结', reward: 3, path: 'xiuxin', desc: '复盘' },
      { id: 'gong_focus', name: '无效摸鱼时长<1小时', reward: 5, path: 'xiuxin', desc: '专注' },
      { id: 'gong_side', name: '额外产出/副业推进', reward: 5, path: 'xiuxin', desc: '副业' },
      { id: 'gong_sleep', name: '早睡养精力', reward: 3, path: 'richang', desc: '日常' }
    ],
    extras: {}
  },
  wu: {
    id: 'wu',
    name: '习之大道',
    camp: CAMP.MAIN,
    category: 'preset',
    cover: '悟',
    themeClass: 'theme-light-fixed',
    cultivationSystem: 'traditional',
    goal: '修心悟道、自我提升',
    subtitle: '修心悟道、自我提升',
    description: '面向所有自我成长场景，不限于上学，以明心见性提升认知，打下悟道根基。',
    tags: ['大道', '学习', '提升'],
    dailyCap: 50,
    baseScore: 40,
    founderName: '观心悟道阁',
    realmNames: ['闻道境', '见道境', '明道境', '得道境'],
    isGrandDao: true,
    gongfaCount: 0,
    tasks: [
      { id: 'wu_focus', name: '专注学习/提升2小时', reward: 10, path: 'xiuxin', desc: '修心' },
      { id: 'wu_review', name: '当日所学复盘吸收', reward: 4, path: 'xiuxin', desc: '复盘' },
      { id: 'wu_input', name: '新知输入（看书/课程）', reward: 3, path: 'xiuxin', desc: '输入' },
      { id: 'wu_practice', name: '练习巩固所学', reward: 4, path: 'xiuxin', desc: '巩固' },
      { id: 'wu_early', name: '早起学习', reward: 2, path: 'richang', desc: '日常' }
    ],
    extras: {}
  },
}

/**
 * 功法模板（归于各大道之下）
 * grandDao: 归属的大道 ID（thin_muscle/gong/wu）
 * camp: SIDE（功法均为辅修性质，但归属大道统一管理）
 */
const GONGFA_TEMPLATES = {}

/**
 * 获取所有大道列表（isGrandDao: true 的模板）
 */
function getGrandDaoList() {
  return Object.values(PRESET_TEMPLATES)
    .filter(function(item) { return item.isGrandDao === true })
    .map(function(item) { return clone(item) })
}

/**
 * 获取指定大道下的所有功法
 * @param {string} grandDaoId - 大道 ID
 */
function getGongfaByGrandDao(grandDaoId) {
  return Object.values(GONGFA_TEMPLATES)
    .filter(function(item) { return item.grandDao === grandDaoId })
    .map(function(item) { return clone(item) })
}

/**
 * 根据 ID 获取功法模板
 */
function getGongfaById(gongfaId) {
  if (!gongfaId) return null
  var tmpl = GONGFA_TEMPLATES[gongfaId]
  return tmpl ? clone(tmpl) : null
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function safeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function getPresetList() {
  return Object.values(PRESET_TEMPLATES)
    .filter((item) => item.category !== 'custom_entry')
    .map((item) => clone(item))
}

function getMainPresets() {
  return getPresetList().filter((item) => item.camp === CAMP.MAIN)
}

function getTemplateById(templateId, customList = []) {
  try {
    if (!templateId) return clone(PRESET_TEMPLATES.thin_muscle)
    if (PRESET_TEMPLATES[templateId] && PRESET_TEMPLATES[templateId].category !== 'custom_entry') {
      return clone(PRESET_TEMPLATES[templateId])
    }
    if (GONGFA_TEMPLATES[templateId]) {
      return clone(GONGFA_TEMPLATES[templateId])
    }
    const customs = Array.isArray(customList) ? customList : getLocalCustomTemplates()
    const found = customs.find((item) => item && item.id === templateId)
    return found ? clone(found) : null
  } catch (error) {
    console.error('读取模板失败', error)
    return clone(PRESET_TEMPLATES.thin_muscle)
  }
}

function resolveTemplateId(rawId) {
  if (rawId === 'foundation_lian_ti_jue' || rawId === 'foundation' || rawId === 'jiji') {
    return 'thin_muscle'
  }
  if (rawId === 'scholar') return 'wu'
  if (rawId === 'worker') return 'gong'
  return rawId || ''
}

/** 按等级计算阵营加成（1→base，5→max） */
function getLevelBonusRate(camp, level = 1) {
  const rule = CAMP_BONUS_RULES[camp] || CAMP_BONUS_RULES.side
  const lv = Math.max(1, Math.min(5, Math.floor(safeNumber(level, 1))))
  const span = rule.maxBonus - rule.baseBonus
  return rule.baseBonus + (span * (lv - 1)) / 4
}

function getCampDebuffRate(camp) {
  const rule = CAMP_BONUS_RULES[camp] || CAMP_BONUS_RULES.side
  return rule.debuff
}

function createEmptyCustomTemplate(overrides = {}) {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '我的人生模板',
    camp: CAMP.SIDE,
    category: 'custom',
    cover: '自',
    themeClass: 'theme-light-fixed',
    cultivationSystem: 'traditional',
    goal: '自定义修行目标',
    subtitle: '旁门自创、随心修行',
    description: '由道友亲手拟定的专属人生模板。',
    tags: ['小道', '自定义'],
    dailyCap: 45,
    baseScore: 38,
    founderName: '本座',
    realmNames: ['炼精化气', '炼气化神', '炼神还虚', '炼虚合道'],
    tasks: [
      { id: `task_${Date.now()}`, name: '每日功课', reward: 3, path: 'richang', desc: '自定义' }
    ],
    level: 1,
    extras: {},
    isPublic: true,
    shareCode: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  }
}

function sanitizeCustomTemplate(input = {}) {
  try {
    const base = createEmptyCustomTemplate()
    const name = String(input.name || base.name).trim().slice(0, 20) || base.name
    const dailyCap = Math.min(
      CUSTOM_DAILY_CAP_MAX,
      Math.max(1, Math.floor(safeNumber(input.dailyCap, base.dailyCap)))
    )
    const realmNames = Array.isArray(input.realmNames) && input.realmNames.length >= 4
      ? input.realmNames.slice(0, 4).map((item) => String(item || '').trim() || '无名境')
      : base.realmNames

    const tasks = (Array.isArray(input.tasks) ? input.tasks : base.tasks)
      .filter((item) => item && String(item.name || '').trim())
      .slice(0, 12)
      .map((item, index) => ({
        id: item.id || `task_${Date.now()}_${index}`,
        name: String(item.name).trim().slice(0, 24),
        reward: Math.min(CUSTOM_TASK_MAX_REWARD, Math.max(1, Math.floor(safeNumber(item.reward, 1)))),
        path: item.path || 'richang',
        desc: String(item.desc || '自定义').slice(0, 12)
      }))

    return {
      ...base,
      ...input,
      id: input.id || base.id,
      name,
      camp: CAMP.SIDE,
      dailyCap,
      baseScore: 38,
      realmNames,
      tasks: tasks.length ? tasks : base.tasks,
      category: 'custom',
      cover: String(input.cover || name.slice(0, 1) || '自').slice(0, 2),
      themeClass: input.themeClass || 'theme-light-fixed',
      cultivationSystem: input.cultivationSystem || 'traditional',
      level: Math.max(1, Math.min(5, Math.floor(safeNumber(input.level, 1)))),
      updatedAt: Date.now()
    }
  } catch (error) {
    console.error('自定义模板校验失败', error)
    return createEmptyCustomTemplate()
  }
}

function getLocalCustomTemplates() {
  try {
    const list = wx.getStorageSync(CUSTOM_TEMPLATE_STORAGE)
    return Array.isArray(list) ? list : []
  } catch (error) {
    return []
  }
}

function saveLocalCustomTemplates(list = []) {
  try {
    wx.setStorageSync(CUSTOM_TEMPLATE_STORAGE, list)
    return true
  } catch (error) {
    return false
  }
}

function upsertCustomTemplate(template) {
  const sanitized = sanitizeCustomTemplate(template)
  const list = getLocalCustomTemplates()
  const index = list.findIndex((item) => item.id === sanitized.id)
  if (index >= 0) list[index] = sanitized
  else list.unshift(sanitized)
  saveLocalCustomTemplates(list)
  return sanitized
}

function getPublicTemplates() {
  try {
    const list = wx.getStorageSync(PUBLIC_TEMPLATE_STORAGE)
    return Array.isArray(list) ? list : []
  } catch (error) {
    return []
  }
}

function publishTemplateToPlaza(template) {
  const sanitized = sanitizeCustomTemplate({ ...template, isPublic: true })
  sanitized.shareCode = sanitized.shareCode || buildShareCode(sanitized.id)
  const list = getPublicTemplates()
  const index = list.findIndex((item) => item.id === sanitized.id || item.shareCode === sanitized.shareCode)
  if (index >= 0) list[index] = sanitized
  else list.unshift(sanitized)
  wx.setStorageSync(PUBLIC_TEMPLATE_STORAGE, list)
  return sanitized
}

function findPublicTemplateByShareCode(shareCode) {
  const code = String(shareCode || '').trim().toUpperCase()
  if (!code) return null
  return getPublicTemplates().find((item) => String(item.shareCode || '').toUpperCase() === code) || null
}

function importPublicTemplate(shareCode) {
  const source = findPublicTemplateByShareCode(shareCode)
  if (!source) return null
  const imported = sanitizeCustomTemplate({
    ...source,
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${source.name}·摹本`,
    founderName: '本座（导入）',
    shareCode: '',
    camp: CAMP.SIDE,
    sourceShareCode: source.shareCode,
    sourceId: source.id
  })
  return upsertCustomTemplate(imported)
}

function buildShareCode(templateId = '') {
  const seed = String(templateId || Date.now()).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return `TD${seed.slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`
}

function buildSharePath(shareCode) {
  return `/packageC/pages/template-share/template-share?code=${encodeURIComponent(shareCode || '')}`
}

function getTodayDateStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function readTodayCheckin(templateId) {
  try {
    const all = wx.getStorageSync(CHECKIN_STORAGE) || {}
    const key = `${templateId}_${getTodayDateStr()}`
    return all[key] || { date: getTodayDateStr(), tasks: {}, totalScore: 0 }
  } catch (error) {
    return { date: getTodayDateStr(), tasks: {}, totalScore: 0 }
  }
}

function writeTodayCheckin(templateId, data) {
  try {
    const all = wx.getStorageSync(CHECKIN_STORAGE) || {}
    all[`${templateId}_${getTodayDateStr()}`] = { ...data, date: getTodayDateStr() }
    wx.setStorageSync(CHECKIN_STORAGE, all)
  } catch (error) {
    console.error(error)
  }
}

/** 模板当日完成进度 0~1 */
function getTemplateDayProgress(template) {
  const tasks = (template && template.tasks) || []
  if (!tasks.length) return 1
  const checkin = readTodayCheckin(template.id)
  const doneMap = checkin.tasks || {}
  const done = tasks.filter((task) => doneMap[task.id]).length
  return done / tasks.length
}

/**
 * 构建可持久化的选中模板快照
 */
function buildSelectedTemplatePayload(template, level = 1) {
  if (!template) return null
  return {
    id: template.id,
    name: template.name,
    camp: template.camp || CAMP.SIDE,
    cover: template.cover,
    cultivationSystem: template.cultivationSystem,
    dailyCap: template.dailyCap,
    baseScore: template.baseScore,
    realmNames: template.realmNames || [],
    realmDescs: template.realmDescs || [],
    slogan: template.slogan || '',
    themeClass: template.themeClass || 'theme-light-fixed',
    category: template.category || 'preset',
    subcategory: template.subcategory || '',
    industry: template.industry || '',
    goal: template.goal || '',
    subtitle: template.subtitle || template.goal || '',
    description: template.description || '',
    tags: template.tags || [],
    founderName: template.founderName || '',
    tasks: template.tasks || [],
    level: Math.max(1, Math.min(5, Math.floor(safeNumber(level, template.level || 1)))),
    highStreak: safeNumber(template.highStreak, 0),
    lowStreak: safeNumber(template.lowStreak, 0),
    updatedAt: Date.now()
  }
}

/** @deprecated 兼容旧调用 */
function buildCurrentTemplatePayload(template) {
  return buildSelectedTemplatePayload(template)
}

function settleTemplateTaskReward(template, task, options = {}) {
  try {
    const dailyCap = Math.max(1, safeNumber(template && template.dailyCap, 40))
    const todayUsed = Math.max(0, safeNumber(options.todayUsed, 0))
    const remain = Math.max(0, dailyCap - todayUsed)
    const reward = Math.max(0, Math.floor(safeNumber(task && task.reward, 0)))
    const score = Math.min(reward, remain)
    return {
      score,
      capped: reward > score,
      todayUsed,
      dailyCap,
      buffApplied: false,
      rawReward: reward
    }
  } catch (error) {
    return { score: 0, capped: false, todayUsed: 0, dailyCap: 0, buffApplied: false, rawReward: 0 }
  }
}

function calcTemplateExtraReward() {
  return 0
}

function getTemplateRealmByScore(score = 0, realmNames = [], baseScore = 38) {
  try {
    const names = Array.isArray(realmNames) && realmNames.length
      ? realmNames
      : ['炼精化气', '炼气化神', '炼神还虚', '炼虚合道']
    const safeScore = Math.max(0, safeNumber(score, 0))
    const safeBase = Math.max(1, safeNumber(baseScore, 38))
    const multipliers = [3, 7, 15, 30]
    const thresholds = []
    let cursor = 0
    for (let i = 0; i < 4; i++) {
      const perStage = Math.max(1, Math.round(safeBase * multipliers[i]))
      thresholds.push({ minScore: cursor, perStage, stages: 9 })
      cursor += perStage * 9
    }
    for (let i = thresholds.length - 1; i >= 0; i--) {
      const realm = thresholds[i]
      if (safeScore >= realm.minScore) {
        const progressInRealm = safeScore - realm.minScore
        const stage = Math.min(realm.stages, Math.floor(progressInRealm / realm.perStage) + 1)
        const nextStageScore = realm.minScore + stage * realm.perStage
        return {
          name: names[Math.min(i, names.length - 1)] || names[0],
          stage,
          remaining: Math.max(0, nextStageScore - safeScore),
          progressInRealm,
          perStage: realm.perStage,
          index: i
        }
      }
    }
    return { name: names[0], stage: 1, remaining: thresholds[0].perStage, progressInRealm: 0, perStage: thresholds[0].perStage, index: 0 }
  } catch (error) {
    return { name: '炼精化气', stage: 1, remaining: 33, progressInRealm: 0, perStage: 33, index: 0 }
  }
}

/**
 * 根据完成进度计算单个模板对系数的贡献
 * >=80% 满额加成；50%~80% 半额；<50% 全额 debuff
 */
function calcTemplateCoeffContribution(template) {
  const camp = template.camp === CAMP.MAIN ? CAMP.MAIN : CAMP.SIDE
  const level = Math.max(1, Math.min(5, Math.floor(safeNumber(template.level, 1))))
  const progress = getTemplateDayProgress(template)
  const fullBonus = getLevelBonusRate(camp, level)
  const debuff = getCampDebuffRate(camp)
  const campLabel = CAMP_BONUS_RULES[camp].label

  if (progress >= 0.8) {
    return {
      templateId: template.id,
      name: template.name,
      camp,
      campLabel,
      progress,
      rate: fullBonus,
      type: 'bonus',
      label: `${template.name}·满额道行 +${Math.round(fullBonus * 100)}%`
    }
  }
  if (progress >= 0.5) {
    const half = fullBonus / 2
    return {
      templateId: template.id,
      name: template.name,
      camp,
      campLabel,
      progress,
      rate: half,
      type: 'bonus',
      label: `${template.name}·半额道行 +${Math.round(half * 100)}%`
    }
  }
  return {
    templateId: template.id,
    name: template.name,
    camp,
    campLabel,
    progress,
    rate: debuff,
    type: 'debuff',
    label: `${template.name}·心魔 debuff ${Math.round(debuff * 100)}%`
  }
}

/**
 * 合并选中模板的系数（未封顶原始值）
 */
function aggregateCoeffParts(mainTemplate, sideTemplates = []) {
  const parts = []
  if (mainTemplate && mainTemplate.id) {
    const full = getTemplateById(mainTemplate.id) || mainTemplate
    parts.push(calcTemplateCoeffContribution({ ...full, ...mainTemplate, tasks: full.tasks || mainTemplate.tasks || [] }))
  }
  ;(sideTemplates || []).forEach((item) => {
    if (!item || !item.id) return
    const full = getTemplateById(item.id) || item
    parts.push(calcTemplateCoeffContribution({ ...full, ...item, tasks: full.tasks || item.tasks || [] }))
  })
  return parts
}

function clampTotalCoeff(rawRate) {
  const capped = Math.max(COEFF_CAPS.minDebuff, Math.min(COEFF_CAPS.maxBonus, rawRate))
  return {
    rate: capped,
    coeff: 1 + capped,
    capped: capped !== rawRate
  }
}

/**
 * 模板等级结算：连续7天≥80%升1级；连续3天<50%掉1级
 */
function applyTemplateLevelProgress(template, dayProgress) {
  const next = { ...template }
  next.level = Math.max(1, Math.min(5, Math.floor(safeNumber(next.level, 1))))
  next.highStreak = safeNumber(next.highStreak, 0)
  next.lowStreak = safeNumber(next.lowStreak, 0)

  if (dayProgress >= 0.8) {
    next.highStreak += 1
    next.lowStreak = 0
    if (next.highStreak >= 7 && next.level < 5) {
      next.level += 1
      next.highStreak = 0
      next.leveledUp = true
    }
  } else if (dayProgress < 0.5) {
    next.lowStreak += 1
    next.highStreak = 0
    if (next.lowStreak >= 3 && next.level > 1) {
      next.level -= 1
      next.lowStreak = 0
      next.leveledDown = true
    }
  } else {
    next.highStreak = 0
    next.lowStreak = 0
  }
  return next
}

/**
 * ==========================================
 *  以下为 v2 新增：云端模板广场接口
 * ==========================================
 */

/**
 * 调用 template-manager 云函数
 * 将 params 平铺到 event 顶层，云函数直接读 event.xxx
 */
function callTemplateManager(action, params) {
  params = params || {}
  var data = { action: action }
  Object.keys(params).forEach(function(k) { data[k] = params[k] })
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: 'template-manager',
      data: data
    }).then(function(res) {
      if (res.result && res.result.ok) {
        resolve(res.result)
      } else {
        reject(res.result || new Error('云函数调用失败'))
      }
    }).catch(function(err) {
      reject(err)
    })
  })
}

/**
 * 从云端获取模板列表
 * @param {Object} options - { type('all'|'official'|'user'), sortBy('hot'|'new'|'imports'), keyword, page, pageSize, category }
 */
function fetchCloudTemplates(options) {
  options = options || {}
  var params = {
    type: options.type || 'all',
    sortBy: options.sortBy || 'hot',
    page: options.page || 1,
    pageSize: options.pageSize || 20
  }
  if (options.keyword) params.keyword = options.keyword
  if (options.category) params.category = options.category
  if (options.subcategory) params.subcategory = options.subcategory
  return callTemplateManager('getTemplates', params)
}

/**
 * 从云端获取模板详情
 */
function fetchTemplateDetail(templateId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('getTemplateDetail', { templateId: templateId, userId: userId })
}

/**
 * 从云端导入模板（转为用户辅修模板 + 增加导入计数）
 * 返回 importPublicTemplate 的结果
 */
function importCloudTemplate(templateData, sourceTemplateId) {
  // 先生成本地副本
  var imported = sanitizeCustomTemplate({
    id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: (templateData.name || '未知道则') + '·摹本',
    founderName: '本座（导入）',
    shareCode: '',
    camp: CAMP.SIDE,
    sourceId: templateData.id,
    cover: templateData.cover || '道',
    cultivationSystem: templateData.cultivationSystem || 'traditional',
    dailyCap: templateData.dailyCap || 30,
    baseScore: templateData.baseScore || 25,
    realmNames: templateData.realmNames || [],
    themeClass: templateData.themeClass || 'theme-light-fixed',
    category: 'custom',
    goal: templateData.goal || '',
    subtitle: templateData.subtitle || '',
    description: templateData.description || '',
    tags: templateData.tags || [],
    tasks: templateData.tasks || [],
    level: 1,
    highStreak: 0,
    lowStreak: 0
  })
  var saved = upsertCustomTemplate(imported)
  
  // 异步增加云端导入计数（不阻塞返回）
  callTemplateManager('importTemplate', { templateId: sourceTemplateId || templateData.id }).catch(function() {})
  
  return saved
}

/**
 * 初始化云端官方模板（首次调用时写入7套预设模板）
 */
function initCloudOfficialTemplates() {
  return callTemplateManager('initOfficialTemplates', {})
}

/**
 * 模板互动：点赞/取消点赞
 */
function toggleLikeTemplate(templateId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('likeTemplate', { templateId: templateId, userId: userId })
}

/**
 * 模板互动：收藏/取消收藏
 */
function toggleFavoriteTemplate(templateId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('favoriteTemplate', { templateId: templateId, userId: userId })
}

/**
 * 获取我的收藏列表
 */
function getMyFavorites() {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('getFavorites', { userId: userId, page: 1, pageSize: 50 })
}

/**
 * 发表评论
 */
function postComment(templateId, content) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  var nickName = (app && app.globalData.nickName) || '无名修士'
  return callTemplateManager('commentTemplate', { templateId: templateId, userId: userId, nickName: nickName, content: content })
}

/**
 * 获取评论列表
 */
function getComments(templateId, page, pageSize) {
  return callTemplateManager('getComments', { templateId: templateId, page: page || 1, pageSize: pageSize || 20 })
}

/**
 * 删除评论
 */
function deleteComment(commentId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('deleteComment', { commentId: commentId, userId: userId })
}

/**
 * 发布模板到广场
 */
function publishTemplateCloud(templateData) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  var nickName = (app && app.globalData.nickName) || '无名修士'
  return callTemplateManager('publishTemplate', { template: templateData, userId: userId, nickName: nickName })
}

/**
 * 下架模板
 */
function unpublishTemplateCloud(templateId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('unpublishTemplate', { templateId: templateId, userId: userId })
}

/**
 * 关注/取消关注用户
 */
function toggleFollow(targetUserId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('toggleFollow', { userId: userId, targetUserId: targetUserId })
}

/**
 * 检查是否已关注
 */
function checkFollowStatus(targetUserId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('checkFollow', { userId: userId, targetUserId: targetUserId })
}

/**
 * 获取粉丝列表
 */
function getFollowers(userId, page, pageSize) {
  return callTemplateManager('getFollowers', { userId: userId, page: page || 1, pageSize: pageSize || 20 })
}

/**
 * 获取关注列表
 */
function getFollowing(userId, page, pageSize) {
  return callTemplateManager('getFollowing', { userId: userId, page: page || 1, pageSize: pageSize || 20 })
}

/**
 * 获取我发布的模板列表
 */
function getMyPublished(page, pageSize) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('getMyPublished', { userId: userId, page: page || 1, pageSize: pageSize || 20 })
}

/**
 * 获取创作者统计数据
 */
function getCreatorStats() {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('getCreatorStats', { userId: userId })
}

/**
 * 删除模板（彻底删除，清理关联数据）
 */
function deleteTemplateCloud(templateId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('deleteTemplate', { templateId: templateId, userId: userId })
}

/**
 * 黑白名单管理
 */
function addToBlacklist(templateId, targetUserId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('addToBlacklist', { templateId: templateId, userId: userId, targetUserId: targetUserId })
}

function removeFromBlacklist(templateId, targetUserId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('removeFromBlacklist', { templateId: templateId, userId: userId, targetUserId: targetUserId })
}

function addToWhitelist(templateId, targetUserId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('addToWhitelist', { templateId: templateId, userId: userId, targetUserId: targetUserId })
}

function removeFromWhitelist(templateId, targetUserId) {
  var app = getApp()
  var userId = (app && app.globalData.userId) || ''
  return callTemplateManager('removeFromWhitelist', { templateId: templateId, userId: userId, targetUserId: targetUserId })
}

module.exports = {
  CUSTOM_TASK_MAX_REWARD,
  CUSTOM_DAILY_CAP_MAX,
  CAMP,
  CAMP_BONUS_RULES,
  COEFF_CAPS,
  PRESET_TEMPLATES,
  GONGFA_TEMPLATES,
  CHECKIN_STORAGE,
  getPresetList,
  getMainPresets,
  getTemplateById,
  resolveTemplateId,
  getGrandDaoList,
  getGongfaByGrandDao,
  getGongfaById,
  getLevelBonusRate,
  getCampDebuffRate,
  createEmptyCustomTemplate,
  sanitizeCustomTemplate,
  getLocalCustomTemplates,
  saveLocalCustomTemplates,
  upsertCustomTemplate,
  getPublicTemplates,
  publishTemplateToPlaza,
  findPublicTemplateByShareCode,
  importPublicTemplate,
  buildShareCode,
  buildSharePath,
  readTodayCheckin,
  writeTodayCheckin,
  getTemplateDayProgress,
  buildSelectedTemplatePayload,
  buildCurrentTemplatePayload,
  settleTemplateTaskReward,
  calcTemplateExtraReward,
  getTemplateRealmByScore,
  calcTemplateCoeffContribution,
  aggregateCoeffParts,
  clampTotalCoeff,
  applyTemplateLevelProgress,

  // >>> v2.1: 云端模板广场接口
  fetchCloudTemplates,
  fetchTemplateDetail,
  importCloudTemplate,
  initCloudOfficialTemplates,
  toggleLikeTemplate,
  toggleFavoriteTemplate,
  getMyFavorites,
  postComment,
  getComments,
  deleteComment,
  publishTemplateCloud,
  unpublishTemplateCloud,
  deleteTemplateCloud,
  getMyPublished,
  getCreatorStats,
  toggleFollow,
  checkFollowStatus,
  getFollowers,
  getFollowing,
  addToBlacklist,
  removeFromBlacklist,
  addToWhitelist,
  removeFromWhitelist
}
