// 天道修行 - 境界人数聚合云函数
// 简单聚合 users 集合中各境界的人数，前端每天缓存一次
// 境界阈值使用默认传统体系 baseScore=40，与 buildRealmConfigByBaseScore 对齐

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 境界阶位乘数
const REALM_STAGE_MULTIPLIERS = [3, 7, 15, 30]
// 默认传统体系 baseScore
const DEFAULT_BASE_SCORE = 40

// 构建境界区间
function buildRealmRanges(baseScore) {
  let cursor = 0
  const multipliers = REALM_STAGE_MULTIPLIERS
  return multipliers.map((mult, index) => {
    const perStage = Math.max(1, Math.round(baseScore * mult))
    const span = perStage * 9
    const minScore = cursor
    const maxScore = index === multipliers.length - 1 ? Infinity : cursor + span
    cursor += span
    return { minScore, maxScore }
  })
}

exports.main = async () => {
  try {
    const ranges = buildRealmRanges(DEFAULT_BASE_SCORE)

    // 逐区间 count，避免一次拉全量数据
    const counts = []
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i]
      const where = {
        totalCultivation: db.command.gte(range.minScore)
      }
      if (range.maxScore !== Infinity) {
        where.totalCultivation = db.command.gte(range.minScore).and(db.command.lt(range.maxScore))
      }

      const res = await db.collection('users')
        .where(where)
        .count()
      counts.push(res.total || 0)
    }

    return { ok: true, counts, baseScore: DEFAULT_BASE_SCORE }
  } catch (e) {
    console.error('境界统计失败', e)
    return { ok: false, counts: [0, 0, 0, 0], baseScore: DEFAULT_BASE_SCORE }
  }
}
