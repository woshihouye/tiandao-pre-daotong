// 人生模板体系：模板数据层（已废弃大道主修/辅修/阵营/境界体系）
// 模板无主修/辅修，均为可复制内容；「大道」仅作广场分类标题

const CUSTOM_TASK_MAX_REWARD = 3
const CUSTOM_DAILY_CAP_MAX = 45
const PUBLIC_TEMPLATE_STORAGE = 'tiandao_public_templates'
const CUSTOM_TEMPLATE_STORAGE = 'tiandao_custom_templates'
const CHECKIN_STORAGE = 'tiandao_template_checkin'
const TEMPLATE_STATE_STORAGE = 'tiandao_template_levels'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function safeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function getTemplateById(templateId, customList = []) {
  try {
    if (!templateId) return null
    const customs = Array.isArray(customList) ? customList : getLocalCustomTemplates()
    const found = customs.find((item) => item && item.id === templateId)
    return found ? clone(found) : null
  } catch (error) {
    console.error('读取模板失败', error)
    return null
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

function createEmptyCustomTemplate(overrides = {}) {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '我的人生模板',
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
  CHECKIN_STORAGE,
  getTemplateById,
  resolveTemplateId,
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
  settleTemplateTaskReward,
  calcTemplateExtraReward,
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
