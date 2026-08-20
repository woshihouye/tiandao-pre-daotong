const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 全项目云函数用到的集合（缺失则创建，已存在自动跳过）
const COLLECTIONS = [
  'users', 'records', 'user_daily_records',
  'public_templates', 'template_likes', 'template_favorites', 'template_comments',
  'wishes', 'wish_comments', 'wish_likes', 'wish_favorites',
  'admins', 'activities_applications',
  'mentor_relations', 'mentor_invites', 'user_follows',
  'pills', 'pill_usage_logs', 'playlists',
  'conversations', 'messages', 'customer_service_messages',
  'spirit_conversations', 'spirit_rate_limits',
  'dao_foundations', 'daoist_relations', 'reset_records'
]

exports.main = async (event) => {
  const results = []
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
      results.push({ name, created: true })
    } catch (e) {
      const msg = (e && e.message) || ''
      // -501001 或 "already exist" 表示已存在
      results.push({ name, created: false, reason: msg })
    }
  }
  return { ok: true, total: COLLECTIONS.length, results }
}
