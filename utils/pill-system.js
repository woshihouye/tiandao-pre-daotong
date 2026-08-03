// ============================================================
// 天道修行 v4.0 — 丹药系统
//
// 首批落地丹药品类：毛孔拉屎丹
// 产出规则：仅通过完成指定活动获取，无常规直购渠道
// ============================================================

var PILL_DEFINITIONS = {
  pore_poop: {
    id: 'pore_poop',
    name: '毛孔拉屎丹',
    description: '服用后排出体内浊气，毛孔通透，当日修为上限临时扩张',
    effect: {
      type: 'capacity_expand',
      value: 5,
      duration: 1
    },
    rarity: 'common',
    quality: 1,
    obtainMethod: '连续修行7天达成「七日小成」里程碑时自动获得',
    obtainCondition: 'milestone_7_days',
    icon: '💊',
    color: '#22c55e',
    maxStack: 10,
    isActive: true
  }
}

// 丹药效果类型定义
var EFFECT_TYPES = {
  capacity_expand: { name: '上限扩展', desc: '临时提升当日修为上限' },
  score_boost:     { name: '修为暴涨', desc: '直接增加修为数值' },
  streak_repair:   { name: '续命续修', desc: '修复断签，保留连续天数' },
  penalty_immune:  { name: '心魔免疫', desc: '当日心魔扣分豁免' }
}

/**
 * 获取丹药定义
 * @param {string} pillId
 * @returns {object|null}
 */
function getPillDefinition(pillId) {
  return PILL_DEFINITIONS[pillId] || null
}

/**
 * 获取所有可用丹药定义
 * @returns {Array}
 */
function getAllPillDefinitions() {
  return Object.keys(PILL_DEFINITIONS).map(function(key) {
    return PILL_DEFINITIONS[key]
  })
}

/**
 * 获取用户丹药库存（从本地存储读取）
 * @returns {object} { [pillId]: { quantity, totalObtained } }
 */
function getPillInventory() {
  try {
    var stored = wx.getStorageSync('tiandao_pill_inventory')
    return stored || {}
  } catch (e) {
    return {}
  }
}

/**
 * 保存丹药库存
 * @param {object} inventory
 */
function savePillInventory(inventory) {
  try {
    wx.setStorageSync('tiandao_pill_inventory', inventory)
  } catch (e) {
    console.error('保存丹药库存失败', e)
  }
}

/**
 * 获得丹药
 * @param {string} pillId
 * @param {number} quantity
 * @returns {object} { success, pillName, newQuantity, totalObtained }
 */
function obtainPill(pillId, quantity) {
  var def = getPillDefinition(pillId)
  if (!def) return { success: false, reason: '丹药不存在' }

  var qty = Math.max(1, Math.floor(quantity || 1))
  var inv = getPillInventory()
  var current = inv[pillId] || { quantity: 0, totalObtained: 0 }
  current.quantity += qty
  current.totalObtained += qty
  current.lastObtainedAt = Date.now()
  inv[pillId] = current
  savePillInventory(inv)

  return {
    success: true,
    pillId: pillId,
    pillName: def.name,
    newQuantity: current.quantity,
    totalObtained: current.totalObtained
  }
}

/**
 * 使用丹药
 * @param {string} pillId
 * @returns {object} { success, pillName, remainingQuantity, effect }
 */
function usePill(pillId) {
  var def = getPillDefinition(pillId)
  if (!def) return { success: false, reason: '丹药不存在' }

  var inv = getPillInventory()
  var current = inv[pillId]
  if (!current || current.quantity <= 0) return { success: false, reason: '丹药不足' }

  current.quantity -= 1
  inv[pillId] = current
  savePillInventory(inv)

  // 记录使用日志
  var logs = wx.getStorageSync('tiandao_pill_usage_log') || []
  logs.push({
    pillId: pillId,
    pillName: def.name,
    usedAt: Date.now(),
    effect: def.effect
  })
  if (logs.length > 100) logs = logs.slice(-100)
  wx.setStorageSync('tiandao_pill_usage_log', logs)

  return {
    success: true,
    pillId: pillId,
    pillName: def.name,
    remainingQuantity: current.quantity,
    effect: def.effect
  }
}

/**
 * 应用丹药效果到修为上限
 * @param {string} pillId - 使用的丹药ID
 * @param {number} currentDailyLimit - 当前每日上限
 * @returns {number} 新的每日上限
 */
function applyPillEffectToLimit(pillId, currentDailyLimit) {
  var def = getPillDefinition(pillId)
  if (!def || !def.effect) return currentDailyLimit

  if (def.effect.type === 'capacity_expand') {
    return currentDailyLimit + def.effect.value
  }
  return currentDailyLimit
}

/**
 * 检查里程碑奖励丹药
 * @param {number} milestoneDays - 达成的里程碑天数
 * @returns {string|null} 应获得的丹药ID
 */
function checkMilestonePillReward(milestoneDays) {
  if (milestoneDays === 7) return 'pore_poop'
  return null
}

/**
 * 获取用户丹药摘要（用于展示）
 */
function getPillSummary() {
  var inv = getPillInventory()
  var allDefs = getAllPillDefinitions()
  return allDefs.map(function(def) {
    var current = inv[def.id] || { quantity: 0, totalObtained: 0 }
    return {
      pillId: def.id,
      name: def.name,
      icon: def.icon,
      color: def.color,
      description: def.description,
      effect: def.effect,
      rarity: def.rarity,
      quantity: current.quantity,
      totalObtained: current.totalObtained,
      canUse: current.quantity > 0
    }
  })
}

module.exports = {
  PILL_DEFINITIONS,
  EFFECT_TYPES,
  getPillDefinition,
  getAllPillDefinitions,
  getPillInventory,
  savePillInventory,
  obtainPill,
  usePill,
  applyPillEffectToLimit,
  checkMilestonePillReward,
  getPillSummary
}
