// 天道修行 v4.0 — 客服消息云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const action = event.action || 'send'

  try {
    switch (action) {
      case 'send': return await sendMessage(userId, event.content, event.contentType)
      case 'history': return await getHistory(userId, event.sessionId)
      case 'sessions': return await getSessions(userId)
      default: return { ok: false, error: '未知操作' }
    }
  } catch (e) {
    console.error('[customer-service] error:', e.message)
    return { ok: false, error: '操作失败，请稍后重试' }
  }
}

async function sendMessage(userId, content, contentType) {
  if (!content || content.length > 2000) return { ok: false, error: '消息内容过长或为空' }
  const sessionId = userId // 简单实现：一个用户一个会话
  await db.collection('customer_service_messages').add({
    data: { userId, sessionId, fromUser: true, content, contentType: contentType || 'text', read: false, createdAt: new Date() }
  })
  return { ok: true, message: '消息已发送，管理员将尽快回复' }
}

async function getHistory(userId, sessionId) {
  const sid = sessionId || userId
  const res = await db.collection('customer_service_messages')
    .where({ sessionId: sid })
    .orderBy('createdAt', 'asc')
    .limit(100)
    .get()

  // 标记已读
  await db.collection('customer_service_messages').where({ sessionId: sid, fromUser: false, read: false }).update({ data: { read: true } })
  return { ok: true, messages: res.data }
}

async function getSessions(userId) {
  const res = await db.collection('customer_service_messages')
    .where({ userId })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return { ok: true, hasSession: res.data.length > 0, latestMessage: res.data[0] || null }
}
