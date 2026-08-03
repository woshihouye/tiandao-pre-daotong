// 天道修行 v4.0 — 丹药引擎云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const PILL_DEFS = {
  pore_poop: { id: 'pore_poop', name: '毛孔拉屎丹', effect: 'capacity_expand', value: 5, desc: '排出浊气，修为上限+5' }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const action = event.action || 'inventory'

  try {
    switch (action) {
      case 'inventory': return await getInventory(userId)
      case 'obtain': return await obtainPill(userId, event.pillId, event.quantity)
      case 'use': return await usePill(userId, event.pillId)
      case 'definitions': return await getDefinitions()
      case 'check_milestone': return await checkMilestoneReward(userId, event.milestoneDays)
      default: return { ok: false, error: '未知操作' }
    }
  } catch (e) {
    console.error('丹药引擎错误', e)
    return { ok: false, error: e.message }
  }
}

async function getInventory(userId) {
  const res = await db.collection('pills').where({ userId }).get()
  return { ok: true, inventory: res.data }
}

async function obtainPill(userId, pillId, quantity) {
  const def = PILL_DEFS[pillId]
  if (!def) return { ok: false, error: '丹药不存在' }
  const qty = Math.max(1, Math.floor(quantity || 1))
  const existing = await db.collection('pills').where({ userId, pillId }).get()

  if (existing.data.length) {
    await db.collection('pills').where({ userId, pillId }).update({
      data: { quantity: _.inc(qty), totalObtained: _.inc(qty), lastObtainedAt: new Date() }
    })
  } else {
    await db.collection('pills').add({
      data: { userId, pillId, pillName: def.name, quantity: qty, totalObtained: qty, lastObtainedAt: new Date() }
    })
  }
  return { ok: true, pillName: def.name, obtained: qty }
}

async function usePill(userId, pillId) {
  const def = PILL_DEFS[pillId]
  if (!def) return { ok: false, error: '丹药不存在' }
  const existing = await db.collection('pills').where({ userId, pillId }).get()
  if (!existing.data.length || existing.data[0].quantity <= 0) return { ok: false, error: '丹药不足' }

  await db.collection('pills').where({ userId, pillId }).update({
    data: { quantity: _.inc(-1) }
  })
  await db.collection('pill_usage_logs').add({
    data: { userId, pillId, usedAt: new Date(), effect: def }
  })
  return { ok: true, pillName: def.name, effect: def, remaining: existing.data[0].quantity - 1 }
}

async function getDefinitions() {
  return { ok: true, definitions: Object.values(PILL_DEFS) }
}

async function checkMilestoneReward(userId, milestoneDays) {
  if (milestoneDays === 7) {
    return await obtainPill(userId, 'pore_poop', 1)
  }
  return { ok: true, noReward: true }
}
