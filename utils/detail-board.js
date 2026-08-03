const { calculateRealm, calculateTemplateMatch, estimateTemplateDays } = require('./cultivation.js')
const {
  calculateTrainingScore,
  calculateDietScore,
  getDebuffScore,
  sumTodayPathScore,
  resolveTrainingPath
} = require('./score.js')

const CATEGORY_MAP = {
  sport: 'sport',
  diet: 'diet',
  debuff: 'debuff',
  study: 'study',
  work: 'work',
  all: 'all'
}

const ALL_CATEGORIES = ['sport', 'diet', 'study', 'work', 'debuff']

const BOARD_CONFIG = {
  sport: {
    title: '武·运动详情',
    shortTitle: '武',
    icon: '⚔️',
    color: '#ef4444',
    addLabel: '新增运动记录',
    emptyText: '暂无运动历史，可先录入第一条武道修行'
  },
  diet: {
    title: '食·饮食详情',
    shortTitle: '食',
    icon: '🍲',
    color: '#f59e0b',
    addLabel: '新增饮食记录',
    emptyText: '暂无饮食历史，可先录入第一条丹食记录'
  },
  study: {
    title: '悟·学习详情',
    shortTitle: '悟',
    icon: '📖',
    color: '#6366f1',
    addLabel: '新增学习记录',
    emptyText: '暂无学习历史，识海尚待开启'
  },
  work: {
    title: '工·功业详情',
    shortTitle: '工',
    icon: '⚙️',
    color: '#14b8a6',
    addLabel: '新增功业记录',
    emptyText: '暂无功业历史，功业之路尚待开启'
  },
  debuff: {
    title: '煞·恶习详情',
    shortTitle: '煞',
    icon: '💀',
    color: '#a855f7',
    addLabel: '新增心魔记录',
    emptyText: '暂无心魔历史，继续稳固道心'
  },
  all: {
    title: '全·修行轨迹',
    shortTitle: '全',
    icon: '☯️',
    color: '#10b981',
    addLabel: '',
    emptyText: '暂无修行记录，道途尚未开启'
  }
}

function getBoardConfig(type) {
  return BOARD_CONFIG[type] || BOARD_CONFIG.sport
}

function getDetailPageUrl(type) {
  return `/packageA/pages/detail-board/detail-board?type=${type}`
}

function getCacheKey(userId, type) {
  return `detail_board_cache_${userId}_${type}`
}

function formatDate(dateInput) {
  const date = new Date(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(dateInput) {
  const date = new Date(dateInput)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getWeekKey(dateInput) {
  const date = new Date(dateInput)
  const day = date.getDay() || 7
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 4 - day)
  const yearStart = new Date(date.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  return `${date.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getMonthKey(dateInput) {
  const date = new Date(dateInput)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function buildSportMetrics(record) {
  const detail = record.detail || {}
  const reps = Number(detail.reps) || 0
  const sets = Number(detail.sets) || 0
  const weight = Number(detail.weight) || 0
  const totalReps = Number(detail.totalReps) || (reps * sets)
  const volume = Number(detail.volume) || (weight * totalReps)
  const totalWork = Number(detail.totalWork) || volume
  const calories = Number(detail.calories) || Math.max(0, Math.round(volume * 0.08))
  const duration = Number(detail.duration) || Math.max(5, Math.round(totalReps / 3) || (sets ? sets * 5 : 10))
  const trainingPath = detail.trainingPath || resolveTrainingPath({
    trainingType: detail.trainingType,
    movement: detail.movement,
    name: record.name
  })
  return {
    source: detail.source || '手动录入',
    trainingPath,
    trainingType: detail.trainingType || inferSportType(detail.movement, record.name, trainingPath),
    totalReps,
    volume,
    totalWork,
    calories,
    duration,
    weight,
    reps,
    sets
  }
}

function buildDietMetrics(record) {
  const detail = record.detail || {}
  const protein = detail.protein !== undefined ? Number(detail.protein) : (detail.proteinOk ? 25 : 10)
  const carbs = detail.carbs !== undefined ? Number(detail.carbs) : (detail.carbsOk ? 30 : 12)
  const fat = detail.fat !== undefined ? Number(detail.fat) : (detail.fatOk ? 12 : 6)
  const fiber = detail.fiber !== undefined ? Number(detail.fiber) : 4
  const calories = detail.calories !== undefined
    ? Number(detail.calories)
    : Math.round((protein * 4) + (carbs * 4) + (fat * 9))
  return {
    source: detail.source || '手动录入',
    meal: detail.meal || '未分餐',
    weight: Number(detail.weight) || 100,
    calories,
    protein,
    carbs,
    fat,
    fiber
  }
}

function buildDebuffMetrics(record) {
  const detail = record.detail || {}
  return {
    source: detail.source || '手动录入',
    deductCultivation: Number(detail.deductCultivation) || Math.abs(Number(record.score) || 0),
    debuffType: detail.debuffType || record.name
  }
}

function inferSportType(movementId, name, trainingPath) {
  if (trainingPath) {
    const pathNames = {
      lianti: '炼体',
      lianqi: '炼气',
      yangqi: '养气',
      xiuxin: '修心',
      richang: '日常功课'
    }
    if (pathNames[trainingPath]) {
      return pathNames[trainingPath]
    }
  }
  const pathKey = resolveTrainingPath({ movement: movementId, name })
  const fallbackNames = {
    lianti: '炼体',
    lianqi: '炼气',
    yangqi: '养气',
    xiuxin: '修心',
    richang: '日常功课'
  }
  return fallbackNames[pathKey] || '炼体'
}

function normalizeRecord(type, record) {
  var timestamp = Number(record.timestamp) || Date.now()
  var date = record.date || formatDate(timestamp)
  var base = {
    date: date,
    timestamp: timestamp,
    dateLabel: date,
    timeLabel: formatTime(timestamp)
  }
  // 合并 record 的所有字段
  for (var key in record) {
    if (record.hasOwnProperty(key) && !base.hasOwnProperty(key)) {
      base[key] = record[key]
    }
  }

  if (type === 'all') {
    // 全维度：根据 record.category 选择指标计算
    var cat = record.category || ''
    switch (cat) {
      case 'sport': return Object.assign({}, base, { metrics: buildSportMetrics(record) })
      case 'diet': return Object.assign({}, base, { metrics: buildDietMetrics(record) })
      case 'study':
      case 'work':
        return Object.assign({}, base, { metrics: buildStudyWorkMetrics(record) })
      case 'debuff': return Object.assign({}, base, { metrics: buildDebuffMetrics(record) })
      default: return Object.assign({}, base, { metrics: { score: record.score || 0 } })
    }
  }
  if (type === 'study' || type === 'work') {
    return Object.assign({}, base, { metrics: buildStudyWorkMetrics(record) })
  }
  if (type === 'sport') {
    return Object.assign({}, base, { metrics: buildSportMetrics(record) })
  }
  if (type === 'diet') {
    return Object.assign({}, base, { metrics: buildDietMetrics(record) })
  }
  return Object.assign({}, base, { metrics: buildDebuffMetrics(record) })
}

function buildStudyWorkMetrics(record) {
  var detail = record.detail || {}
  return {
    duration: Number(detail.duration || 0),
    score: Number(record.score || 0),
    source: detail.trainingPath || detail.pathName || '手动录入'
  }
}

function sortRecords(records) {
  return [...records].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
}

function buildOverview(type, records) {
  if (!records.length) {
    if (type === 'all') {
      return [
        { label: '总记录数', value: '0' },
        { label: '武·运动', value: '0次' },
        { label: '食·饮食', value: '0次' },
        { label: '悟·修心', value: '0次' },
        { label: '工·功业', value: '0次' },
        { label: '煞·心魔', value: '0次' },
        { label: '累计修为', value: '0' }
      ]
    }
    if (type === 'study') {
      return [
        { label: '修心总次数', value: '0' },
        { label: '累计学习时长', value: '0小时' },
        { label: '累计获得修为', value: '+0' }
      ]
    }
    if (type === 'work') {
      return [
        { label: '功业总次数', value: '0' },
        { label: '累计工作时长', value: '0小时' },
        { label: '累计获得修为', value: '+0' }
      ]
    }
    if (type === 'sport') {
      return [
        { label: '累计运动总次数', value: '0' },
        { label: '累计物理总做功', value: '0' },
        { label: '累计消耗总卡路里', value: '0' },
        { label: '累计训练总时长', value: '0' }
      ]
    }
    if (type === 'diet') {
      return [
        { label: '累计摄入总热量', value: '0' },
        { label: '累计蛋白质', value: '0' },
        { label: '累计碳水', value: '0' },
        { label: '累计脂肪', value: '0' },
        { label: '累计膳食纤维', value: '0' }
      ]
    }
    return [
      { label: '恶习总触发次数', value: '0' },
      { label: '累计扣减总修为', value: '0' },
      { label: '单月最高触发次数', value: '0' }
    ]
  }

  if (type === 'all') {
    var catCounts = {}
    var totalScore = 0
    records.forEach(function(r) {
      var cat = r.category || 'other'
      catCounts[cat] = (catCounts[cat] || 0) + 1
      totalScore += (r.score || 0)
    })
    return [
      { label: '总记录数', value: String(records.length) },
      { label: '武·运动', value: String(catCounts.sport || 0) + '次' },
      { label: '食·饮食', value: String(catCounts.diet || 0) + '次' },
      { label: '悟·修心', value: String(catCounts.study || 0) + '次' },
      { label: '工·功业', value: String(catCounts.work || 0) + '次' },
      { label: '煞·心魔', value: String(catCounts.debuff || 0) + '次' },
      { label: '累计修为', value: String(totalScore) }
    ]
  }

  if (type === 'study') {
    var totalMin = records.reduce(function(sum, r) { return sum + ((r.detail && r.detail.duration) || (r.metrics && r.metrics.duration) || 0) }, 0)
    return [
      { label: '修心总次数', value: String(records.length) },
      { label: '累计学习时长', value: String(Math.round(totalMin / 60 * 10) / 10) + '小时' },
      { label: '累计获得修为', value: '+' + records.reduce(function(s, r) { return s + (r.score || 0) }, 0) }
    ]
  }

  if (type === 'work') {
    var totalMin = records.reduce(function(sum, r) { return sum + ((r.detail && r.detail.duration) || (r.metrics && r.metrics.duration) || 0) }, 0)
    return [
      { label: '功业总次数', value: String(records.length) },
      { label: '累计工作时长', value: String(Math.round(totalMin / 60 * 10) / 10) + '小时' },
      { label: '累计获得修为', value: '+' + records.reduce(function(s, r) { return s + (r.score || 0) }, 0) }
    ]
  }

  if (type === 'sport') {
    const totalTimes = records.reduce((sum, item) => sum + item.metrics.totalReps, 0)
    const totalWork = records.reduce((sum, item) => sum + item.metrics.totalWork, 0)
    const totalCalories = records.reduce((sum, item) => sum + item.metrics.calories, 0)
    const totalDuration = records.reduce((sum, item) => sum + item.metrics.duration, 0)
    return [
      { label: '累计运动总次数', value: `${totalTimes}` },
      { label: '累计物理总做功', value: `${totalWork}` },
      { label: '累计消耗总卡路里', value: `${totalCalories}` },
      { label: '累计训练总时长', value: `${totalDuration}分` }
    ]
  }

  if (type === 'diet') {
    const totalCalories = records.reduce((sum, item) => sum + item.metrics.calories, 0)
    const totalProtein = records.reduce((sum, item) => sum + item.metrics.protein, 0)
    const totalCarbs = records.reduce((sum, item) => sum + item.metrics.carbs, 0)
    const totalFat = records.reduce((sum, item) => sum + item.metrics.fat, 0)
    const totalFiber = records.reduce((sum, item) => sum + item.metrics.fiber, 0)
    return [
      { label: '累计摄入总热量', value: `${totalCalories}` },
      { label: '累计蛋白质', value: `${totalProtein}g` },
      { label: '累计碳水', value: `${totalCarbs}g` },
      { label: '累计脂肪', value: `${totalFat}g` },
      { label: '累计膳食纤维', value: `${totalFiber}g` }
    ]
  }

  const monthlyMap = {}
  records.forEach((item) => {
    const key = getMonthKey(item.timestamp)
    monthlyMap[key] = (monthlyMap[key] || 0) + 1
  })
  const peak = Object.values(monthlyMap).reduce((max, count) => Math.max(max, count), 0)
  const totalDeduct = records.reduce((sum, item) => sum + item.metrics.deductCultivation, 0)
  return [
    { label: '恶习总触发次数', value: `${records.length}` },
    { label: '累计扣减总修为', value: `${totalDeduct}` },
    { label: '单月最高触发次数', value: `${peak}` }
  ]
}

function groupByPeriod(records, period) {
  const groups = {}
  records.forEach((item) => {
    let key = item.date
    if (period === 'week') {
      key = getWeekKey(item.timestamp)
    } else if (period === 'month') {
      key = getMonthKey(item.timestamp)
    }
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
  })
  return groups
}

function sliceRecentGroupKeys(keys, period) {
  const sizeMap = { day: 7, week: 8, month: 6 }
  const size = sizeMap[period] || 7
  return keys.sort().slice(-size)
}

function buildCharts(type, records, period) {
  const groups = groupByPeriod(records, period)
  const keys = sliceRecentGroupKeys(Object.keys(groups), period)

  if (!keys.length) {
    return {
      bars: [],
      linePoints: [],
      nutritionLegend: [],
      pieStyle: '',
      healthLine: 60
    }
  }

  if (type === 'sport') {
    const totals = keys.map((key) => {
      const list = groups[key]
      return {
        label: formatGroupLabel(key, period),
        calories: list.reduce((sum, item) => sum + item.metrics.calories, 0),
        work: list.reduce((sum, item) => sum + item.metrics.totalWork, 0),
        frequency: list.length
      }
    })
    const maxBar = Math.max(1, ...totals.map((item) => Math.max(item.calories, item.work)))
    const maxLine = Math.max(1, ...totals.map((item) => item.frequency))
    return {
      bars: totals.map((item) => ({
        label: item.label,
        leftHeight: Math.max(12, Math.round((item.calories / maxBar) * 100)),
        rightHeight: Math.max(12, Math.round((item.work / maxBar) * 100)),
        leftValue: item.calories,
        rightValue: item.work
      })),
      linePoints: totals.map((item) => ({
        label: item.label,
        value: item.frequency,
        height: Math.max(8, Math.round((item.frequency / maxLine) * 100))
      })),
      nutritionLegend: [],
      pieStyle: '',
      healthLine: 0
    }
  }

  if (type === 'diet') {
    const totals = keys.map((key) => {
      const list = groups[key]
      return {
        label: formatGroupLabel(key, period),
        calories: list.reduce((sum, item) => sum + item.metrics.calories, 0)
      }
    })
    const maxCalories = Math.max(1, ...totals.map((item) => item.calories), 2000)
    const filtered = keys.flatMap((key) => groups[key])
    const nutrients = {
      protein: filtered.reduce((sum, item) => sum + item.metrics.protein, 0),
      carbs: filtered.reduce((sum, item) => sum + item.metrics.carbs, 0),
      fat: filtered.reduce((sum, item) => sum + item.metrics.fat, 0),
      fiber: filtered.reduce((sum, item) => sum + item.metrics.fiber, 0)
    }
    const totalNutrition = Math.max(1, nutrients.protein + nutrients.carbs + nutrients.fat + nutrients.fiber)
    const legend = [
      { label: '蛋白质', value: nutrients.protein, color: '#d4af37', percent: Math.round((nutrients.protein / totalNutrition) * 100) },
      { label: '碳水', value: nutrients.carbs, color: '#4a90e2', percent: Math.round((nutrients.carbs / totalNutrition) * 100) },
      { label: '脂肪', value: nutrients.fat, color: '#9b59b6', percent: Math.round((nutrients.fat / totalNutrition) * 100) },
      { label: '膳食纤维', value: nutrients.fiber, color: '#2fbf8f', percent: Math.round((nutrients.fiber / totalNutrition) * 100) }
    ]
    return {
      bars: [],
      linePoints: totals.map((item) => ({
        label: item.label,
        value: item.calories,
        height: Math.max(8, Math.round((item.calories / maxCalories) * 100))
      })),
      nutritionLegend: legend,
      pieStyle: buildPieStyle(legend),
      healthLine: Math.round((2000 / maxCalories) * 100)
    }
  }

  // >>> all: 全维度聚合，按大类分组柱状图 + 修为趋势线
  if (type === 'all') {
    var totals = keys.map(function(key) {
      var list = groups[key]
      var catCounts = {}
      var dayScore = 0
      list.forEach(function(r) {
        var cat = r.category || 'other'
        catCounts[cat] = (catCounts[cat] || 0) + 1
        dayScore += (r.score || 0)
      })
      return {
        label: formatGroupLabel(key, period),
        sport: catCounts.sport || 0,
        diet: catCounts.diet || 0,
        study: catCounts.study || 0,
        work: catCounts.work || 0,
        debuff: catCounts.debuff || 0,
        score: dayScore
      }
    })
    var allMaxBar = Math.max(1, totals.reduce(function(m, t) { return Math.max(m, t.sport, t.diet, t.study, t.work, t.debuff) }, 0))
    var allMaxLine = Math.max(1, totals.reduce(function(m, t) { return Math.max(m, t.score) }, 0))
    var colors = ['#ef4444', '#f59e0b', '#6366f1', '#14b8a6', '#a855f7']
    return {
      bars: totals.map(function(item) { return {
        label: item.label,
        leftHeight: Math.max(12, Math.round((item.sport / allMaxBar) * 80)),
        rightHeight: Math.max(12, Math.round((item.diet / allMaxBar) * 80)),
        leftValue: item.sport,
        rightValue: item.diet,
        extraBars: [
          { height: Math.max(8, Math.round((item.study / allMaxBar) * 60)), value: item.study, color: colors[2] },
          { height: Math.max(8, Math.round((item.work / allMaxBar) * 60)), value: item.work, color: colors[3] },
          { height: Math.max(8, Math.round((item.debuff / allMaxBar) * 60)), value: item.debuff, color: colors[4] }
        ]
      }}),
      linePoints: totals.map(function(item) { return {
        label: item.label,
        value: item.score,
        height: Math.max(8, Math.round((item.score / allMaxLine) * 100))
      }}),
      nutritionLegend: [],
      pieStyle: '',
      healthLine: 0
    }
  }

  const filtered = keys.flatMap((key) => groups[key])
  const typeCount = {}
  filtered.forEach((item) => {
    typeCount[item.name] = (typeCount[item.name] || 0) + 1
  })
  const barRows = Object.keys(typeCount).map((key) => ({ label: key, value: typeCount[key] }))
  const maxBar = Math.max(1, ...barRows.map((item) => item.value))
  const lineRows = keys.map((key) => {
    const list = groups[key]
    return {
      label: formatGroupLabel(key, period),
      value: list.reduce((sum, item) => sum + item.metrics.deductCultivation, 0)
    }
  })
  const maxLine = Math.max(1, ...lineRows.map((item) => item.value))
  return {
    bars: barRows.map((item) => ({
      label: item.label,
      leftHeight: Math.max(12, Math.round((item.value / maxBar) * 100)),
      rightHeight: 0,
      leftValue: item.value,
      rightValue: 0
    })),
    linePoints: lineRows.map((item) => ({
      label: item.label,
      value: item.value,
      height: Math.max(8, Math.round((item.value / maxLine) * 100))
    })),
    nutritionLegend: [],
    pieStyle: '',
    healthLine: 0
  }
}

function buildPieStyle(legend) {
  let start = 0
  const parts = legend.map((item) => {
    const end = start + item.percent
    const section = `${item.color} ${start}% ${end}%`
    start = end
    return section
  })
  return `background: conic-gradient(${parts.join(', ')});`
}

function formatGroupLabel(key, period) {
  if (period === 'day') {
    return key.slice(5)
  }
  return key
}

function buildSections(type, records) {
  let lastKey = ''
  return sortRecords(records).map((item) => {
    const sectionKey = type === 'diet'
      ? `${item.date} · ${item.metrics.meal}`
      : item.date
    const result = {
      ...item,
      sectionTitle: sectionKey !== lastKey ? sectionKey : ''
    }
    lastKey = sectionKey
    return result
  })
}

async function fetchCategoryRecords(db, userId, category) {
  const all = []
  const pageSize = 100
  let page = 0
  while (true) {
    const res = await db.collection('records')
      .where({ userId, category })
      .orderBy('timestamp', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()
    all.push(...res.data)
    if (res.data.length < pageSize) {
      break
    }
    page += 1
  }
  return all
}

async function fetchAllRecords(db, userId) {
  const all = []
  const pageSize = 100
  let page = 0
  while (true) {
    const res = await db.collection('records')
      .where({ userId })
      .orderBy('timestamp', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()
    all.push(...res.data)
    if (res.data.length < pageSize) {
      break
    }
    page += 1
  }
  return all
}

function computeStreak(sortedDates, todayDate) {
  const dateSet = new Set(sortedDates)
  const cursor = new Date(todayDate)
  let streak = 0
  while (true) {
    const key = formatDate(cursor)
    if (!dateSet.has(key)) {
      break
    }
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function groupByDate(records) {
  return records.reduce((map, item) => {
    const key = item.date || formatDate(item.timestamp)
    if (!map[key]) {
      map[key] = []
    }
    map[key].push(item)
    return map
  }, {})
}

async function syncUserProfileFromRecords(db, userId) {
  const profileRes = await db.collection('users')
    .where({ userId })
    .limit(1)
    .get()
  const profile = profileRes.data[0]
  if (!profile) {
    return null
  }

  const allRecords = await fetchAllRecords(db, userId)
  const grouped = groupByDate(allRecords)
  const dates = Object.keys(grouped).sort()
  const todayDate = formatDate(Date.now())

  let totalScore = 0
  let totalCultivation = 0
  let dailyMatch = 0
  let todayCultivationValue = 0
  const dayMatches = []

  dates.forEach((date) => {
    const list = grouped[date]
    const dayScore = list.reduce((sum, item) => sum + Number(item.score || 0), 0)
    const sportCount = list.filter((item) => item.category === 'sport').length
    const dietPositive = list.filter((item) => item.category === 'diet' && Number(item.score) > 0).length
    const hasDebuff = list.some((item) => item.category === 'debuff')
    const match = calculateTemplateMatch({
      exerciseCompletion: Math.min(1, sportCount / 2),
      dietMatch: Math.min(1, dietPositive / 3),
      scheduleCompliance: hasDebuff ? 0.6 : 1,
      continuity: 1
    })
    // >>> 与 addScore 对齐：修为直接按记录积分累计，不再二次换算
    const dayCultivation = dayScore

    totalScore += dayScore
    totalCultivation += dayCultivation
    dayMatches.push(match)

    if (date === todayDate) {
      dailyMatch = match
      todayCultivationValue = dayCultivation
    }
  })

  const weeklySource = dayMatches.slice(-7)
  const weeklyMatch = weeklySource.length
    ? Math.round(weeklySource.reduce((sum, value) => sum + value, 0) / weeklySource.length)
    : 0
  const totalProgress = weeklyMatch
  const estimatedDays = estimateTemplateDays(totalProgress, dailyMatch || weeklyMatch)
  const lastCheckInDate = dates.length ? dates[dates.length - 1] : ''
  const streakDays = computeStreak(dates, todayDate)

  const updateData = {
    totalScore,
    totalCultivation: Math.max(0, totalCultivation),
    streakDays,
    lastCheckInDate,
    todayCultivationDate: dailyMatch ? todayDate : '',
    todayCultivationValue,
    dailyMatch,
    weeklyMatch,
    totalProgress,
    estimatedDays,
    updatedAt: Date.now()
  }

  await db.collection('users').doc(profile._id).update({ data: updateData })
  return {
    ...profile,
    ...updateData,
    currentRealm: calculateRealm(totalCultivation)
  }
}

function buildUpdatedRecordPayload(type, original, form, options = {}) {
  const detail = { ...(original.detail || {}) }
  const payload = {
    name: form.name || original.name,
    timestamp: original.timestamp,
    date: original.date
  }

  if (type === 'sport') {
    detail.source = form.source
    detail.trainingType = form.trainingType
    detail.trainingPath = form.trainingPath || detail.trainingPath || resolveTrainingPath({
      trainingType: form.trainingType,
      movement: detail.movement,
      name: form.name || original.name
    })
    detail.weight = Number(form.weight) || 0
    detail.reps = Number(form.reps) || 0
    detail.sets = Number(form.sets) || 0
    detail.totalReps = Number(form.totalReps) || 0
    detail.volume = Number(form.volume) || 0
    detail.totalWork = Number(form.totalWork) || 0
    detail.calories = Number(form.calories) || 0
    detail.duration = Number(form.duration) || 0
    payload.detail = detail

    // >>> 编辑记录时同样走道途积分规则（含体系加成与单日上限）
    const pathKey = detail.trainingPath
    const todayTypeScore = sumTodayPathScore(options.todayRecords || [], pathKey, original._id)
    const result = calculateTrainingScore({
      ...detail,
      name: payload.name
    }, {
      systemKey: options.systemKey || 'traditional',
      todayTypeScore
    })
    detail.trainingPath = result.trainingPath
    detail.trainingType = result.pathName
    detail.rawScore = result.rawScore
    detail.bonusRate = result.bonusRate
    payload.score = result.score
    return payload
  }

  if (type === 'diet') {
    detail.source = form.source
    detail.meal = form.meal
    detail.weight = Number(form.weight) || 0
    detail.calories = Number(form.calories) || 0
    detail.protein = Number(form.protein) || 0
    detail.carbs = Number(form.carbs) || 0
    detail.fat = Number(form.fat) || 0
    detail.fiber = Number(form.fiber) || 0
    // 高热量且宏量失衡时按浊气丹食处理
    const calorie = Number(detail.calories) || 0
    const isJunk = calorie >= 800 && Number(detail.protein || 0) < 10
    detail.isBingeEat = isJunk
    detail.foodQuality = isJunk ? 'junk' : 'healthy'
    payload.detail = detail
    payload.score = calculateDietScore(detail)
    return payload
  }

  detail.source = form.source
  const deduct = Number(form.deductCultivation)
  detail.deductCultivation = Number.isFinite(deduct) && deduct > 0
    ? deduct
    : Math.abs(getDebuffScore(detail.debuffType))
  payload.detail = detail
  payload.score = -Math.abs(detail.deductCultivation || getDebuffScore(detail.debuffType))
  return payload
}

module.exports = {
  CATEGORY_MAP,
  ALL_CATEGORIES,
  BOARD_CONFIG,
  getBoardConfig,
  getDetailPageUrl,
  getCacheKey,
  normalizeRecord,
  sortRecords,
  buildOverview,
  buildCharts,
  buildSections,
  fetchCategoryRecords,
  fetchAllRecords,
  syncUserProfileFromRecords,
  buildUpdatedRecordPayload
}
