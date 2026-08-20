// 天道修行 - 称号统计云函数
// 将 computeTitleUserStats 从客户端迁移到云端，使用数据库聚合
// 解决记录量超1000条后前端计算卡顿问题

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { userId } = event || {}
  if (!userId) return { ok: false, error: '缺少 userId' }

  try {
    const profileRes = await db.collection('users').where({ userId }).limit(1).get()
    const profile = profileRes.data[0] || {}

    const stats = {
      totalCultivation: Number(profile.totalCultivation || 0),
      streakDays: Number(profile.streakDays || 0),
      totalCheckinDays: 0,
      breakStreakCount: 0,
      maxDimStreak: 0,
      dimCompletionRate3: 0,
      dimCompletionRate5: 0,
      dimCounts: { wu: 0, shi: 0, wu_xin: 0, gong: 0, sha: 0 },
      dimHealthyStreak: { shi: 0 },
      dimCleanStreak: { sha: 0 },
      dimFullStreak: { gong: 0 },
      dimRatios: { wu: 0, shi: 0, wu_xin: 0, gong: 0, sha: 0 },
      modeDays: { strict: 0, sharp: 0 },
      modeStreak: { strict: 0, sharp: 0 },
      modeEscapeCount: 0,
      lateDietCount: 0,
      lateCheckinCount: 0,
      weekdayWorkHours: 0,
      workHoursCheckin: 0,
      weekendOnlyWeeks: 0,
      makeupCount: 0,
      wishFulfillCount: 0
    }

    // 完成愿望数（助人称号判定用）
    const wishRes = await db.collection('wishes').where({ fulfilledBy: userId }).count()
    stats.wishFulfillCount = wishRes.total || 0

    // 分页读取已印证记录，上限 2000 条
    const MAX_RECORDS = 2000
    const PAGE_SIZE = 200
    const records = []
    let offset = 0

    while (records.length < MAX_RECORDS) {
      const res = await db.collection('records')
        .where({ userId, status: _.neq('pending') })
        .orderBy('createdAt', 'desc')
        .skip(offset)
        .limit(PAGE_SIZE)
        .get()

      const batch = (res.data || []).filter(r => (r.status || 'confirmed') === 'confirmed')
      records.push(...batch)
      if (res.data.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }

    if (!records.length) return { ok: true, stats }

    // 按日期分组
    const dateMap = {}
    records.forEach(r => {
      const d = r.date
      if (!d) return
      if (!dateMap[d]) dateMap[d] = []
      dateMap[d].push(r)
    })

    const dates = Object.keys(dateMap).sort()
    stats.totalCheckinDays = dates.length

    // 维度映射
    const dimNames = { sport: 'wu', diet: 'shi', study: 'wu_xin', work: 'gong', debuff: 'sha' }

    // 统计维度次数、时间分析
    records.forEach(r => {
      const type = r.type || r.category || ''
      const dim = dimNames[type] || null
      if (dim && stats.dimCounts[dim] !== undefined) {
        stats.dimCounts[dim]++
      }

      const ts = r.timestamp || r.createdAt
      if (ts) {
        const d = new Date(ts)
        const hour = d.getHours()
        const day = d.getDay()

        if (hour >= 23) stats.lateCheckinCount++
        if (hour >= 22 && (type === 'diet' || type === 'shi')) stats.lateDietCount++

        if (day >= 1 && day <= 5) {
          stats.weekdayWorkHours++
          if (hour >= 10 && hour < 16) stats.workHoursCheckin++
        }
      }

      if (r.isMakeup) stats.makeupCount++
    })

    // 维度打卡率
    const totalDays = Math.max(1, stats.totalCheckinDays)
    let activeCount3 = 0
    let activeCount5 = 0
    const dimKeys = ['wu', 'shi', 'wu_xin', 'gong', 'sha']

    dimKeys.forEach(dk => {
      const ratio = Math.min(1, (stats.dimCounts[dk] || 0) / totalDays)
      stats.dimRatios[dk] = ratio
      if (ratio >= 0.6) activeCount3++
      if (ratio >= 0.7) activeCount5++
    })
    stats.dimCompletionRate3 = Math.min(1, activeCount3 / 3)
    stats.dimCompletionRate5 = Math.min(1, activeCount5 / 5)

    // 单维度最长连续打卡
    let maxStreak = 0
    dimKeys.forEach(dk => {
      const dimDates = []
      dates.forEach(dateStr => {
        const dayRecords = dateMap[dateStr] || []
        const hasDim = dayRecords.some(r => {
          const type = r.type || r.category || ''
          return dimNames[type] === dk
        })
        if (hasDim) dimDates.push(dateStr)
      })

      let currentStreak = 0
      let bestStreak = 0
      dimDates.forEach((d, i) => {
        if (i === 0) { currentStreak = 1 }
        else {
          const diff = (new Date(d) - new Date(dimDates[i - 1])) / 86400000
          currentStreak = diff === 1 ? currentStreak + 1 : 1
        }
        if (currentStreak > bestStreak) bestStreak = currentStreak
      })

      if (bestStreak > maxStreak) maxStreak = bestStreak
      if (dk === 'shi') stats.dimHealthyStreak.shi = bestStreak
      if (dk === 'sha') stats.dimCleanStreak.sha = bestStreak
    })
    stats.maxDimStreak = maxStreak

    // 工维度连续满勤（同最大连续）
    stats.dimFullStreak = { gong: maxStreak }

    // 断签次数
    let breakCount = 0
    for (let i = 1; i < dates.length; i++) {
      const diffDays = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000
      if (diffDays > 1) breakCount++
    }
    stats.breakStreakCount = breakCount

    // 模式天数 & 连续打卡
    const modeDateMap = { strict: {}, sharp: {} }
    records.forEach(r => {
      const mode = r.practiceMode || r.mode || ''
      if (mode && modeDateMap[mode] && r.date) {
        modeDateMap[mode][r.date] = true
      }
    })
    stats.modeDays.strict = Object.keys(modeDateMap.strict).length
    stats.modeDays.sharp = Object.keys(modeDateMap.sharp).length

    Object.keys(modeDateMap).forEach(m => {
      const modeDates = Object.keys(modeDateMap[m]).sort()
      let curStreak = 0
      let bestModeStreak = 0
      modeDates.forEach((d, i) => {
        if (i === 0) { curStreak = 1 }
        else {
          const diff = (new Date(d) - new Date(modeDates[i - 1])) / 86400000
          curStreak = diff === 1 ? curStreak + 1 : 1
        }
        if (curStreak > bestModeStreak) bestModeStreak = curStreak
      })
      if (m === 'strict' || m === 'sharp') stats.modeStreak[m] = bestModeStreak
    })

    // 紧急下山次数
    stats.modeEscapeCount = records.filter(r => r.escapeMode || r.emergencyExit).length

    // 仅周末打卡周数（修正时区：使用本地日期计算）
    const weekMap = {}
    dates.forEach(dateStr => {
      const parts = dateStr.split('-')
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      const dayOfWeek = d.getDay() // 0=周日
      const monday = new Date(d)
      monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
      if (!weekMap[weekKey]) weekMap[weekKey] = { days: {} }
      weekMap[weekKey].days[dayOfWeek] = true
    })

    let weekendOnlyWeeks = 0
    Object.keys(weekMap).forEach(wk => {
      const days = weekMap[wk].days
      const weekdayKeys = [1, 2, 3, 4, 5]
      const weekendKeys = [0, 6]
      const hasWeekday = weekdayKeys.some(d => days[d])
      const hasWeekend = weekendKeys.some(d => days[d])
      if (hasWeekend && !hasWeekday) weekendOnlyWeeks++
    })
    stats.weekendOnlyWeeks = weekendOnlyWeeks

    return { ok: true, stats }
  } catch (e) {
    console.error('[get-title-stats] 统计失败', e)
    return { ok: false, error: e.message }
  }
}
