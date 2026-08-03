// 云函数：精英模板管理与旅程追踪
// 用于云端存储精英模板、用户修行旅程数据
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 集合名
const COLLECTION_ELITE_TEMPLATES = 'elite_templates'
const COLLECTION_ELITE_JOURNEYS = 'elite_journeys'
const COLLECTION_ELITE_FOLLOWERS = 'elite_followers'

/**
 * 初始化官方精英模板到云端
 */
async function initOfficialEliteTemplates() {
  try {
    const existing = await db.collection(COLLECTION_ELITE_TEMPLATES)
      .where({ isOfficial: true })
      .count()

    if (existing.total >= 5) {
      return { success: true, message: '官方精英模板已存在', count: existing.total }
    }

    const officialTemplates = [
      {
        templateId: 'elite_runner_001',
        name: '破风者·跑者之道',
        eliteName: '破风者·基普乔格',
        eliteAvatar: '🏃',
        eliteIntro: '世界马拉松纪录保持者的人生节奏',
        category: 'sport',
        cultivationSystem: 'body',
        phaseCount: 3,
        principles: ['没有捷径，只有重复', '痛苦是暂时的，荣耀是永恒的'],
        tags: ['跑步', '马拉松', '自律', '运动'],
        isOfficial: true,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        stats: { followerCount: 0, totalProgress: 0, rating: 5 }
      },
      {
        templateId: 'elite_work_001',
        name: '效率大师·深度工作流',
        eliteName: '效率大师·卡尔·纽波特',
        eliteAvatar: '💼',
        eliteIntro: '数字时代的深度工作之道',
        category: 'work',
        cultivationSystem: 'worldly',
        phaseCount: 3,
        principles: ['专注力是新时代的稀缺资源', '深度工作不是一种选择，而是一种必须'],
        tags: ['工作效率', '深度工作', '专注力'],
        isOfficial: true,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        stats: { followerCount: 0, totalProgress: 0, rating: 5 }
      },
      {
        templateId: 'elite_study_001',
        name: '学神之路·终身学习法',
        eliteName: '学神·费曼',
        eliteAvatar: '📖',
        eliteIntro: '以教为学的终极学习法则',
        category: 'study',
        cultivationSystem: 'traditional',
        phaseCount: 3,
        principles: ['如果你不能简单地解释它，你就没有真正理解它'],
        tags: ['学习', '费曼学习法', '终身学习'],
        isOfficial: true,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        stats: { followerCount: 0, totalProgress: 0, rating: 5 }
      },
      {
        templateId: 'elite_life_001',
        name: '生活大师·极致日常',
        eliteName: '生活大师·斯多葛',
        eliteAvatar: '🏛️',
        eliteIntro: '古代斯多葛哲学的现代生活实践',
        category: 'life',
        cultivationSystem: 'beauty',
        phaseCount: 3,
        principles: ['不是事物困扰我们，而是我们对事物的看法'],
        tags: ['斯多葛', '生活哲学', '自律生活'],
        isOfficial: true,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        stats: { followerCount: 0, totalProgress: 0, rating: 5 }
      },
      {
        templateId: 'elite_hybrid_001',
        name: '全能修士·五维平衡之道',
        eliteName: '全能修士·达芬奇',
        eliteAvatar: '🎨',
        eliteIntro: '文艺复兴式的全方位人生修炼',
        category: 'hybrid',
        cultivationSystem: 'traditional',
        phaseCount: 3,
        principles: ['好奇心是天才的种子', '多个领域的交叉产生真正的创造力'],
        tags: ['全能', '五维平衡', '跨界', '综合'],
        isOfficial: true,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        stats: { followerCount: 0, totalProgress: 0, rating: 5 }
      }
    ]

    for (const tpl of officialTemplates) {
      await db.collection(COLLECTION_ELITE_TEMPLATES).add({ data: tpl })
    }

    return { success: true, message: '官方精英模板初始化完成', count: officialTemplates.length }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

/**
 * 获取精英模板列表
 */
async function getEliteTemplates(params) {
  try {
    const { category, sortBy = 'hot', page = 1, pageSize = 20, keyword } = params || {}
    
    let query = {}
    if (category && category !== 'all') {
      query.category = category
    }
    if (keyword) {
      query.$or = [
        { name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { eliteName: db.RegExp({ regexp: keyword, options: 'i' }) },
        { tags: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]
    }

    let orderField = 'stats.followerCount'
    let orderDir = 'desc'
    if (sortBy === 'new') {
      orderField = 'createdAt'
    } else if (sortBy === 'rating') {
      orderField = 'stats.rating'
    }

    const count = await db.collection(COLLECTION_ELITE_TEMPLATES).where(query).count()
    const list = await db.collection(COLLECTION_ELITE_TEMPLATES)
      .where(query)
      .orderBy(orderField, orderDir)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: list.data,
      total: count.total,
      page,
      pageSize,
      hasMore: page * pageSize < count.total
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

/**
 * 获取单个精英模板详情
 */
async function getEliteTemplateDetail(templateId) {
  try {
    const result = await db.collection(COLLECTION_ELITE_TEMPLATES)
      .where({ templateId })
      .limit(1)
      .get()

    if (result.data.length === 0) {
      return { success: false, error: '模板不存在' }
    }

    return { success: true, data: result.data[0] }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

/**
 * 保存用户修行旅程
 */
async function saveJourney(openid, journeyData) {
  try {
    const existing = await db.collection(COLLECTION_ELITE_JOURNEYS)
      .where({ _openid: openid, templateId: journeyData.templateId })
      .limit(1)
      .get()

    if (existing.data.length > 0) {
      // 更新已有旅程
      await db.collection(COLLECTION_ELITE_JOURNEYS)
        .doc(existing.data[0]._id)
        .update({
          data: {
            ...journeyData,
            updatedAt: db.serverDate()
          }
        })
    } else {
      // 创建新旅程
      await db.collection(COLLECTION_ELITE_JOURNEYS).add({
        data: {
          _openid: openid,
          ...journeyData,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })

      // 更新模板追随者计数
      await db.collection(COLLECTION_ELITE_TEMPLATES)
        .where({ templateId: journeyData.templateId })
        .update({
          data: {
            'stats.followerCount': _.inc(1),
            updatedAt: db.serverDate()
          }
        })
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

/**
 * 获取用户的修行旅程
 */
async function getJourney(openid, templateId) {
  try {
    let query = { _openid: openid }
    if (templateId) query.templateId = templateId

    const result = await db.collection(COLLECTION_ELITE_JOURNEYS)
      .where(query)
      .orderBy('updatedAt', 'desc')
      .get()

    return {
      success: true,
      data: templateId ? (result.data[0] || null) : result.data
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

/**
 * 获取追随者排行
 */
async function getFollowerRanking(templateId, limit = 10) {
  try {
    const result = await db.collection(COLLECTION_ELITE_JOURNEYS)
      .where({ templateId })
      .orderBy('totalScore', 'desc')
      .limit(limit)
      .get()

    return { success: true, data: result.data }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// 主入口
exports.main = async (event, context) => {
  const { action, params } = event
  const { OPENID } = cloud.getWXContext()

  switch (action) {
    case 'initOfficial':
      return await initOfficialEliteTemplates()

    case 'getTemplates':
      return await getEliteTemplates(params)

    case 'getTemplateDetail':
      return await getEliteTemplateDetail(params.templateId)

    case 'saveJourney':
      return await saveJourney(OPENID, params.journey)

    case 'getJourney':
      return await getJourney(OPENID, params.templateId)

    case 'getFollowerRanking':
      return await getFollowerRanking(params.templateId, params.limit)

    default:
      return { success: false, error: '未知操作: ' + action }
  }
}
