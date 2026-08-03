// 天道修行 v4.0 — 散功重修云函数
// 执行：清空修为进度、境界等级、道基记录，重置修行
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 散功保留比例（次数越多保留越少）
const PRESERVATION_RATIOS = [0.50, 0.45, 0.40, 0.35, 0.30]

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  try {
    const userRes = await db.collection('users').where({ userId }).get()
    if (!userRes.data.length) return { ok: false, error: '用户不存在' }
    const user = userRes.data[0]

    // 检查散功次数上限
    const prevCount = user.cultivationResetCount || 0
    if (prevCount >= PRESERVATION_RATIOS.length) {
      return { ok: false, error: '已达散功次数上限，不可再次散功' }
    }

    // 7天内不可重复散功
    const lastReset = user.lastResetAt
    if (lastReset && Date.now() - new Date(lastReset).getTime() < 7 * 86400000) {
      return { ok: false, error: '七日内已散功一次，请静待七日后再来' }
    }

    const preScore = user.totalCultivation || 0
    const ratio = PRESERVATION_RATIOS[prevCount]
    const preservedScore = Math.floor(preScore * ratio)

    // 道基加成保留
    const foundBonus = (user.daoFoundations && Object.values(user.daoFoundations)
      .reduce((s, f) => s + (f.bonusRate || 0), 0)) || 0
    const finalScore = Math.floor(preservedScore * (1 + foundBonus))

    // 更新用户数据
    await db.collection('users').where({ userId }).update({
      data: {
        totalCultivation: finalScore,
        realmName: '炼气期',
        realmId: 'lianqi',
        daoFoundations: {},
        cultivationResetCount: (prevCount + 1),
        lastResetAt: new Date(),
        lastRealmStartAt: new Date(),
        breakthroughCount: 0
      }
    })

    // 记录散功历史
    await db.collection('reset_records').add({
      data: {
        userId,
        resetAt: new Date(),
        preScore, preservedScore: finalScore,
        ratio, resetCount: prevCount + 1,
        reason: event.reason || '自觉散功'
      }
    })

    return {
      ok: true,
      preservedScore: finalScore,
      preScore,
      ratio,
      resetCount: prevCount + 1,
      message: '散功成功，修为重置为' + finalScore + '分。保留比例：' + Math.round(ratio * 100) + '%'
    }
  } catch (e) {
    console.error('散功失败', e)
    return { ok: false, error: e.message }
  }
}
