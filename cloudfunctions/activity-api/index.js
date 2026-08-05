// 活动库云函数 — 统一入口（v1.0）
// 集合：activities（官方活动，只读）/ user_activities（用户自定义，公开分享）
// 说明：官方活动由开发者在云开发控制台直接管理；本函数不含管理员逻辑
var cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
var db = cloud.database()
var _ = db.command

// ==================== 工具 ====================

/** 取当前用户 OPENID（无则返回 null） */
function getOpenId() {
  try {
    return cloud.getWXContext().OPENID || null
  } catch (e) {
    return null
  }
}

/** 过滤返回字段，去掉内部字段 */
function sanitizeActivity(doc) {
  if (!doc) return null
  return {
    activityId: doc.activityId || doc._id,
    name: doc.name || '',
    category: doc.category || '',
    topFilter: doc.topFilter || '',
    sideFilter: doc.sideFilter || '',
    description: doc.description || '',
    unit: doc.unit || '',
    scorePerUnit: doc.scorePerUnit != null ? doc.scorePerUnit : 0,
    presetAction: doc.presetAction || '',
    defaultGroup: doc.defaultGroup != null ? doc.defaultGroup : 1,
    isSystem: !!doc.isSystem,
    isStudyMode: !!doc.isStudyMode,
    ownerId: doc.ownerId || '',
    ownerName: doc.ownerName || '',
    visibility: doc.visibility || 'public',
    useCount: doc.useCount || 0,
    likeCount: doc.likeCount || 0,
    createdAt: doc.createdAt || '',
    // 自由度字段：透传自定义输入
    categoryName: doc.categoryName || '',
    icon: doc.icon || '',
    ext: doc.ext || {},
    tags: doc.tags || [],
    customMeta: doc.customMeta || null,
    // 元卡字段：从 customMeta 提取，用于 sport 维度的元卡分类
    metaCard: (doc.customMeta && doc.customMeta.metaCard) ? doc.customMeta.metaCard : 'unknown'
  }
}

/** 生成用户活动 id：u_<openid前8>_<时间戳>_<随机3位> */
function genUserActivityId(openid) {
  var short = (openid || 'anon').replace(/[^a-zA-Z0-9]/g, '').slice(-8)
  return 'u_' + short + '_' + Date.now() + '_' + Math.floor(Math.random() * 900 + 100)
}

/** 校验用户活动字段合法性 */
function validateActivityInput(d) {
  if (!d || !d.name) return { ok: false, error: '缺少活动名称' }
  var name = String(d.name).trim()
  if (!name) return { ok: false, error: '活动名称不能为空' }
  if (name.length > 20) return { ok: false, error: '活动名称最多20个字符' }
  var score = Number(d.scorePerUnit)
  if (isNaN(score)) return { ok: false, error: '修为值不合法' }
  if (score < -1000 || score > 1000) return { ok: false, error: '修为值超出范围(-1000~1000)' }
  var cats = ['sport', 'diet', 'study', 'work', 'debuff']
  if (cats.indexOf(d.category) === -1) return { ok: false, error: '分类不合法' }
  return {
    ok: true,
    data: {
      name: name,
      category: d.category,
      topFilter: d.topFilter || '',
      sideFilter: d.sideFilter || '',
      description: d.description ? String(d.description).trim() : '',
      unit: d.unit || '次',
      scorePerUnit: score,
      presetAction: d.presetAction || '',
      defaultGroup: score >= 0 ? (Number(d.defaultGroup) || 1) : undefined,
      isStudyMode: !!d.isStudyMode,
      // 自由度字段：透传前端自定义输入
      categoryName: d.categoryName ? String(d.categoryName).trim() : '',
      icon: d.icon ? String(d.icon).trim().substring(0, 4) : '',
      // ext: 仅接受对象，≤20键，键≤20字符，值≤100字符
      ext: (function() {
        var ext = {}
        if (d.ext && typeof d.ext === 'object' && !Array.isArray(d.ext)) {
          var keys = Object.keys(d.ext)
          for (var ek = 0; ek < keys.length && ek < 20; ek++) {
            var k = keys[ek]
            if (String(k).length <= 20) ext[k] = String(d.ext[k]).substring(0, 100)
          }
        }
        return ext
      })(),
      tags: Array.isArray(d.tags) ? d.tags.map(function(t) { return String(t).trim() }).filter(Boolean).slice(0, 10) : [],
      // customMeta: 仅接受对象，序列化后 ≤2000 字符
      customMeta: (function() {
        if (d.customMeta && typeof d.customMeta === 'object' && !Array.isArray(d.customMeta)) {
          try {
            var s = JSON.stringify(d.customMeta)
            if (s && s.length <= 2000) return d.customMeta
          } catch (e) { /* ignore */ }
        }
        return null
      })()
    }
  }
}

// ==================== 读操作 ====================

/** 官方活动列表（按分类+筛选，分页） */
async function getLibrary(params) {
  var where = { status: 'active', isSystem: true }
  if (params.category) where.category = params.category
  // 元卡改造：sport 维度不再使用 topFilter/sideFilter，改用 metaCard 或直接返回
  if (params.category === 'sport' && params.metaCard) {
    where['customMeta.metaCard'] = params.metaCard
  } else {
    if (params.topFilter && params.topFilter !== 'all') where.topFilter = params.topFilter
    if (params.sideFilter && params.sideFilter !== 'all') where.sideFilter = params.sideFilter
  }
  if (params.keyword) {
    var kw = String(params.keyword).trim()
    if (kw) {
      // 名称/描述模糊匹配
      var reg = db.RegExp({ regexp: kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options: 'i' })
      where.name = reg
    }
  }
  if (params.tag) {
    where.tags = params.tag  // 云数据库数组字段直接匹配
  }
  var page = parseInt(params.page) || 1
  var pageSize = Math.min(parseInt(params.pageSize) || 50, 100)
  var res = await db.collection('activities')
    .where(where)
    .orderBy('category', 'asc')
    .orderBy('sortOrder', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  var countRes = await db.collection('activities').where(where).count()
  // getLibrary - 返回结构与前端对齐: { ok, data: { list, total, ... } }
  return {
    ok: true,
    data: {
      list: (res.data || []).map(sanitizeActivity),
      total: countRes.total,
      page: page,
      pageSize: pageSize,
      source: 'cloud'
    }
  }
}

/** 全部分类+筛选配置（静态，与本地 activity-library.js 保持一致） */
function getFilterConfigs() {
  return {
    categories: [
      { key: 'sport', name: '武·炼体', icon: '武' },
      { key: 'diet', name: '食·丹食', icon: '食' },
      { key: 'study', name: '悟·修心', icon: '悟' },
      { key: 'work', name: '工·功业', icon: '工' },
      { key: 'debuff', name: '煞·心魔', icon: '煞' }
    ],
    filters: {
      sport: {
        subcategories: [
          { key: 'all',       name: '全部',       icon: '' },
          { key: 'anaerobic', name: '无氧力量',    icon: '力', desc: '推/拉/蹲' },
          { key: 'core',      name: '核心训练',    icon: '核', desc: '撑/卷' },
          { key: 'cardio',    name: '有氧心肺',    icon: '心', desc: '稳态/间歇' },
          { key: 'unknown',   name: '不知道',      icon: '?', desc: '自由定义' }
        ],
        metaCards: [
          { key: 'push',            name: '推',        subcategory: 'anaerobic', desc: '推离身体的抗阻训练' },
          { key: 'pull',            name: '拉',        subcategory: 'anaerobic', desc: '拉近身体的抗阻训练' },
          { key: 'squat',           name: '蹲',        subcategory: 'anaerobic', desc: '下肢屈伸抗阻训练' },
          { key: 'hold',            name: '撑',        subcategory: 'core',      desc: '静态核心稳定' },
          { key: 'curl',            name: '卷',        subcategory: 'core',      desc: '动态核心屈伸' },
          { key: 'steady_cardio',   name: '稳态有氧',  subcategory: 'cardio',    desc: '持续稳定输出' },
          { key: 'interval_cardio', name: '间歇有氧',  subcategory: 'cardio',    desc: '高低强度交替' },
          { key: 'unknown',         name: '不知道',    subcategory: 'unknown',   desc: '完全自由定义' }
        ]
      },
      diet: { top: ['all'], side: ['all'] },
      study: { top: ['all'], side: ['all'] },
      work: { top: ['all'], side: ['all'] },
      debuff: { top: ['all'], side: ['all'] }
    }
  }
}

/** 公开自定义活动列表（全服，按热度/时间） */
async function getPublicCustom(params) {
  var where = { status: 'active', visibility: 'public' }
  if (params.category) where.category = params.category
  if (params.tag) where.tags = params.tag
  var sortBy = params.sortBy === 'hot' ? 'useCount' : 'createdAt'
  var page = parseInt(params.page) || 1
  var pageSize = Math.min(parseInt(params.pageSize) || 20, 50)
  var res = await db.collection('user_activities')
    .where(where)
    .orderBy(sortBy, 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  var countRes = await db.collection('user_activities').where(where).count()
  // getPublicCustom - 返回结构与前端对齐: { ok, data: { list, total, ... } }
  return {
    ok: true,
    data: {
      list: (res.data || []).map(sanitizeActivity),
      total: countRes.total,
      page: page,
      pageSize: pageSize
    }
  }
}

/** 我的自定义活动 */
async function getMine(openid, params) {
  if (!openid) return { ok: false, error: '未登录' }
  var page = parseInt(params.page) || 1
  var pageSize = Math.min(parseInt(params.pageSize) || 50, 100)
  var res = await db.collection('user_activities')
    .where({ ownerId: openid })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  // getMine - 返回结构与前端对齐: { ok, data: { list, total } }
  return {
    ok: true,
    data: {
      list: (res.data || []).map(sanitizeActivity),
      total: res.data ? res.data.length : 0
    }
  }
}

/** 按 id 批量取活动（供记录页加载已选活动） */
async function getByIds(params) {
  var ids = params.ids
  // getByIds - 返回结构与前端对齐: { ok, data: { list } }
  if (!ids || !ids.length) return { ok: true, data: { list: [] } }
  var officialIds = []
  var customIds = []
  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i])
    if (id.indexOf('u_') === 0) customIds.push(id)
    else officialIds.push(id)
  }
  var result = []
  // 官方（用 activityId 查询，最多拆两批）
  if (officialIds.length) {
    var offWhere = { activityId: _.in(officialIds.slice(0, 20)) }
    var offRes = await db.collection('activities').where(offWhere).limit(20).get()
    result = result.concat((offRes.data || []).map(sanitizeActivity))
  }
  // 用户自定义（按 activityId）
  if (customIds.length) {
    var cusRes = await db.collection('user_activities')
      .where({ activityId: _.in(customIds.slice(0, 20)) }).limit(20).get()
    result = result.concat((cusRes.data || []).map(sanitizeActivity))
  }
  return { ok: true, data: { list: result } }
}

// ==================== 写操作 ====================

/** 新建自定义活动 */
async function createCustom(openid, params) {
  if (!openid) return { ok: false, error: '未登录' }
  var v = validateActivityInput(params)
  if (!v.ok) return v
  var doc = v.data
  doc.activityId = genUserActivityId(openid)
  doc.isSystem = false
  doc.ownerId = openid
  doc.ownerName = params.ownerName || ''
  doc.visibility = 'public' // 公开分享
  doc.useCount = 0
  doc.likeCount = 0
  doc.status = 'active'
  doc.createdAt = new Date().toISOString()
  doc.updatedAt = doc.createdAt
  // 自由度字段写入
  doc.icon = params.icon || ''
  doc.categoryName = doc.categoryName || ''
  doc.ext = doc.ext || {}
  doc.tags = doc.tags || []
  doc.customMeta = params.customMeta || null
  var res = await db.collection('user_activities').add({ data: doc })
  return { ok: true, activityId: doc.activityId, _id: res._id }
}

/** 更新自己的自定义活动 */
async function updateCustom(openid, params) {
  if (!openid) return { ok: false, error: '未登录' }
  var activityId = params.activityId
  if (!activityId) return { ok: false, error: '缺少 activityId' }
  var v = validateActivityInput(params)
  if (!v.ok) return v
  // 校验归属
  var existRes = await db.collection('user_activities')
    .where({ activityId: activityId, ownerId: openid }).limit(1).get()
  if (!existRes.data || existRes.data.length === 0) {
    return { ok: false, error: '无权修改或活动不存在' }
  }
  // ★ 只更新 params 显式提供的字段（缺失字段不覆盖）
  var upd = { updatedAt: new Date().toISOString() }
  var fields = ['name', 'category', 'topFilter', 'sideFilter', 'description',
                'unit', 'scorePerUnit', 'presetAction', 'defaultGroup',
                'isStudyMode', 'categoryName', 'icon', 'ext', 'tags', 'customMeta']
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i]
    if (params[f] !== undefined) upd[f] = v.data[f] !== undefined ? v.data[f] : params[f]
  }
  await db.collection('user_activities')
    .where({ activityId: activityId, ownerId: openid })
    .update({ data: upd })
  return { ok: true }
}

/** 删除自己的自定义活动 */
async function deleteCustom(openid, params) {
  if (!openid) return { ok: false, error: '未登录' }
  var activityId = params.activityId
  if (!activityId) return { ok: false, error: '缺少 activityId' }
  var res = await db.collection('user_activities')
    .where({ activityId: activityId, ownerId: openid })
    .remove()
  return { ok: true, removed: res.stats ? res.stats.removed : 0 }
}

/** 克隆公开活动为自己的副本 */
async function cloneActivity(openid, params) {
  if (!openid) return { ok: false, error: '未登录' }
  var srcId = params.activityId
  if (!srcId) return { ok: false, error: '缺少 activityId' }
  // 源活动：官方或公开自定义
  var src = null
  if (String(srcId).indexOf('u_') === 0) {
    var cusRes = await db.collection('user_activities')
      .where({ activityId: srcId, status: 'active', visibility: 'public' }).limit(1).get()
    if (cusRes.data && cusRes.data.length) src = cusRes.data[0]
  } else {
    var offRes = await db.collection('activities')
      .where({ activityId: srcId, status: 'active' }).limit(1).get()
    if (offRes.data && offRes.data.length) src = offRes.data[0]
  }
  if (!src) return { ok: false, error: '源活动不存在或不可见' }
  // 防止重复克隆同源（同一用户同一源只允许一份）
  var dupRes = await db.collection('user_activities')
    .where({ ownerId: openid, sourceActivityId: srcId }).limit(1).get()
  if (dupRes.data && dupRes.data.length) {
    return { ok: false, error: '已克隆过该活动', activityId: dupRes.data[0].activityId }
  }
  var doc = {
    activityId: genUserActivityId(openid),
    name: src.name,
    category: src.category,
    topFilter: src.topFilter || 'custom',
    sideFilter: src.sideFilter || 'custom',
    description: src.description || '',
    unit: src.unit || '次',
    scorePerUnit: src.scorePerUnit != null ? src.scorePerUnit : 0,
    presetAction: src.presetAction || '',
    defaultGroup: src.defaultGroup != null ? src.defaultGroup : 1,
    isSystem: false,
    isStudyMode: !!src.isStudyMode,
    ownerId: openid,
    ownerName: params.ownerName || '',
    visibility: 'public',
    sourceActivityId: srcId,   // 溯源
    useCount: 0,
    likeCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  var addRes = await db.collection('user_activities').add({ data: doc })
  // 源使用计数 +1（官方/自定义都加）
  try {
    if (String(srcId).indexOf('u_') === 0) {
      await db.collection('user_activities').where({ activityId: srcId })
        .update({ data: { useCount: _.inc(1) } })
    } else {
      await db.collection('activities').where({ activityId: srcId })
        .update({ data: { useCount: _.inc(1) } })
    }
  } catch (e) { /* 计数失败不影响克隆 */ }
  return { ok: true, activityId: doc.activityId, _id: addRes._id }
}

/** 搜索（官方+公开自定义合并） */
async function searchActivities(params) {
  var kw = String(params.keyword || '').trim()
  // searchActivities - 返回结构与前端对齐: { ok, data: { list, total } }
  if (!kw) return { ok: true, data: { list: [], total: 0 } }
  var reg = db.RegExp({ regexp: kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options: 'i' })
  var limit = Math.min(parseInt(params.pageSize) || 20, 50)
  var offRes = await db.collection('activities')
    .where({ status: 'active', name: reg }).limit(limit).get()
  var cusRes = await db.collection('user_activities')
    .where({ status: 'active', visibility: 'public', name: reg }).limit(limit).get()
  var list = (offRes.data || []).map(sanitizeActivity)
    .concat((cusRes.data || []).map(sanitizeActivity))
  // searchActivities 主返回 - 结构与前端对齐: { ok, data: { list, total } }
  return { ok: true, data: { list: list.slice(0, limit), total: list.length } }
}

// ==================== 入口 ====================

exports.main = async function(event, context) {
  var action = event.action
  var params = event.params || {}
  var openid = getOpenId()

  try {
    switch (action) {
      case 'getLibrary':      return await getLibrary(params)
      case 'getFilterConfigs': return getFilterConfigs()
      case 'getPublicCustom': return await getPublicCustom(params)
      case 'getMine':         return await getMine(openid, params)
      case 'getByIds':        return await getByIds(params)
      case 'search':          return await searchActivities(params)
      case 'createCustom':    return await createCustom(openid, params)
      case 'updateCustom':    return await updateCustom(openid, params)
      case 'deleteCustom':    return await deleteCustom(openid, params)
      case 'cloneActivity':   return await cloneActivity(openid, params)
      default: return { ok: false, error: 'unknown action: ' + action }
    }
  } catch (e) {
    console.error('[activity-api]', action, '异常:', e)
    return { ok: false, error: e.message || 'unknown error' }
  }
}
