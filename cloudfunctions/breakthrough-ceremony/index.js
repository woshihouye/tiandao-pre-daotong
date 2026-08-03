// ============================================================
// 天道修行 v4.0 — 突破仪式结算云函数
//
// 功能：
//   1. 验证用户是否达到突破条件
//   2. 执行突破结算：更新境界、计算道基、发放称号
//   3. 解锁新境界权限
//   4. 返回结算面板数据
// ============================================================

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 道基品质判定
const FOUNDATION_GRADES = [
  { id: 'xian',   name: '仙品', bonus: 0.12, maxDays: 15 },
  { id: 'ji',     name: '极品', bonus: 0.08, maxDays: 45 },
  { id: 'shang',  name: '上品', bonus: 0.05, maxDays: 90 },
  { id: 'zhong',  name: '中品', bonus: 0.02, maxDays: 180 },
  { id: 'xia',    name: '下品', bonus: 0.00, maxDays: Infinity }
]

// 境界配置
const REALM_CONFIG = [
  { id: 'lianqi',  name: '炼气期', threshold: 0,     next: 'zhuji' },
  { id: 'zhuji',   name: '筑基期', threshold: 1000,  next: 'jindan' },
  { id: 'jindan',  name: '金丹期', threshold: 4000,  next: 'yuanying' },
  { id: 'yuanying', name: '元婴期', threshold: 10000, next: null }
]

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    // 1. 获取用户当前状态
    const userRes = await db.collection('users').where({ userId }).get()
    if (!userRes.data.length) return { ok: false, error: '用户不存在' }
    const user = userRes.data[0]

    // 2. 计算当前境界和下一境界
    const totalScore = user.totalCultivation || 0
    const currentRealm = getCurrentRealm(totalScore)
    const nextRealm = getNextRealm(currentRealm)

    if (!nextRealm) {
      return { ok: false, error: '已达最高境界', maxReached: true }
    }

    // 3. 验证是否达到突破阈值
    if (totalScore < nextRealm.threshold) {
      return {
        ok: false,
        error: '修为不足，无法突破',
        currentScore: totalScore,
        targetScore: nextRealm.threshold,
        remaining: nextRealm.threshold - totalScore
      }
    }

    // 4. 查询该境界修炼天数（从首次进入该境界计算）
    const currentRealmStartDate = user.lastRealmStartAt || user.createdAt
    const daysSpent = Math.max(1, Math.floor((Date.now() - new Date(currentRealmStartDate).getTime()) / 86400000))

    // 5. 计算道基品质
    const foundation = calcFoundation(daysSpent, totalScore)

    // 6. 更新用户数据
    const daoFoundations = user.daoFoundations || {}
    daoFoundations[currentRealm.id] = {
      gradeId: foundation.gradeId,
      gradeName: foundation.gradeName,
      qualityScore: foundation.qualityScore,
      bonusRate: foundation.bonus,
      daysSpent: daysSpent,
      scoreAtBreakthrough: totalScore,
      calculatedAt: Date.now()
    }

    const updateData = {
      daoFoundations: daoFoundations,
      breakthroughCount: _.inc(1),
      lastRealmStartAt: new Date(),
      lastBreakthroughAt: new Date(),
      pendingBreakthrough: false,
      realmName: nextRealm.name,
      realmId: nextRealm.id
    }

    await db.collection('users').where({ userId }).update({ data: updateData })

    // 7. 记录到 dao_foundations 集合
    await db.collection('dao_foundations').add({
      data: {
        userId,
        realmId: currentRealm.id,
        gradeId: foundation.gradeId,
        gradeName: foundation.gradeName,
        qualityScore: foundation.qualityScore,
        bonusRate: foundation.bonus,
        daysSpent: daysSpent,
        scoreAtBreakthrough: totalScore,
        createdAt: new Date()
      }
    })

    // 8. 返回结算数据
    const newFeatures = getNewFeatures(currentRealm.id, nextRealm.id)

    return {
      ok: true,
      settlement: {
        realmBefore: { realmId: currentRealm.id, realmName: currentRealm.name },
        realmAfter: { realmId: nextRealm.id, realmName: nextRealm.name },
        daoFoundation: {
          gradeId: foundation.gradeId,
          gradeName: foundation.gradeName,
          qualityScore: foundation.qualityScore,
          bonusRate: foundation.bonus,
          daysSpent: daysSpent
        },
        newFeatures: newFeatures,
        totalScore: totalScore,
        timestamp: Date.now()
      }
    }

  } catch (err) {
    console.error('突破结算失败', err)
    return { ok: false, error: err.message }
  }
}

function getCurrentRealm(totalScore) {
  for (var i = REALM_CONFIG.length - 1; i >= 0; i--) {
    if (totalScore >= REALM_CONFIG[i].threshold) return REALM_CONFIG[i]
  }
  return REALM_CONFIG[0]
}

function getNextRealm(currentRealm) {
  if (!currentRealm || !currentRealm.next) return null
  return REALM_CONFIG.find(function(r) { return r.id === currentRealm.next }) || null
}

function calcFoundation(daysSpent, scoreAtBreakthrough) {
  for (var i = 0; i < FOUNDATION_GRADES.length; i++) {
    if (daysSpent <= FOUNDATION_GRADES[i].maxDays) {
      var baseScore = 100 - Math.min(100, Math.floor(daysSpent * 0.5))
      var scoreBonus = Math.min(10, Math.floor(scoreAtBreakthrough / 1000))
      return {
        gradeId: FOUNDATION_GRADES[i].id,
        gradeName: FOUNDATION_GRADES[i].name,
        qualityScore: Math.max(0, Math.min(100, baseScore + scoreBonus)),
        bonus: FOUNDATION_GRADES[i].bonus
      }
    }
  }
  return { gradeId: 'xia', gradeName: '下品', qualityScore: 0, bonus: 0 }
}

function getNewFeatures(currentId, nextId) {
  var features = {
    zhuji:   [{ key: 'lingjian_deep', label: '灵鉴深度分析' }],
    jindan:  [{ key: 'lundao_speak', label: '论道发言' }],
    yuanying: [{ key: 'custom_dao_rules', label: '自定义道则高级编辑' }]
  }
  return features[nextId] || []
}
