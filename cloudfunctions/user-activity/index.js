// 用户自定义活动云函数
// 集合：user_activities
// 所有操作校验 userId = OPENID，用户只能操作自己的活动

var cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
var db = cloud.database()
var _ = db.command

/** 取当前用户 OPENID */
function getOpenId() {
  try {
    return cloud.getWXContext().OPENID || null
  } catch (e) {
    return null
  }
}

/** 生成活动id */
function genId(openid) {
  var short = (openid || 'anon').replace(/[^a-zA-Z0-9]/g, '').slice(-8)
  return 'u_' + short + '_' + Date.now() + '_' + Math.floor(Math.random() * 900 + 100)
}

/** 校验输入 */
function validate(d) {
  if (!d || !d.name) return { ok: false, error: '缺少活动名称' }
  var name = String(d.name).trim()
  if (!name) return { ok: false, error: '活动名称不能为空' }
  if (name.length > 20) return { ok: false, error: '活动名称最多20个字符' }
  var score = Number(d.scorePerUnit)
  if (isNaN(score)) return { ok: false, error: '修为值不合法' }
  if (score < -1000 || score > 1000) return { ok: false, error: '修为值超出范围(-1000~1000)' }
  var cats = ['wu', 'shi', 'wu2', 'gong', 'sha', 'sport', 'diet', 'study', 'work', 'debuff']
  var cat = d.category
  if (cats.indexOf(cat) === -1) return { ok: false, error: '分类不合法' }
  // 单位允许自定义文本（无白名单限制）
  var unit = (d.unit || '次').trim() || '次'
  return {
    ok: true,
    data: {
      name: name,
      category: cat,
      unit: unit,
      scorePerUnit: score,
      description: d.description ? String(d.description).trim().substring(0, 200) : '',
      icon: d.icon || '',
      // 自由度字段
      categoryName: d.categoryName ? String(d.categoryName).trim() : '',
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

/** 标准化输出 */
function sanitize(doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    activityId: doc.activityId || doc._id,
    userId: doc.userId || '',
    originActivityId: doc.originActivityId || '',
    isCustom: true,
    name: doc.name || '',
    category: doc.category || '',
    unit: doc.unit || '',
    scorePerUnit: doc.scorePerUnit != null ? doc.scorePerUnit : 0,
    description: doc.description || '',
    icon: doc.icon || '',
    createdAt: doc.createdAt || '',
    updatedAt: doc.updatedAt || '',
    // 自由度字段
    categoryName: doc.categoryName || '',
    ext: doc.ext || {},
    tags: doc.tags || [],
    customMeta: doc.customMeta || null
  }
}

// ==================== list ====================
async function list(openid) {
  if (!openid) return { ok: false, error: '未登录' }
  var res = await db.collection('user_activities')
    .where(_.or([
      { userId: openid, isCustom: true },
      { ownerId: openid }
    ]))
    .orderBy('updatedAt', 'desc')
    .limit(200)
    .get()
  return {
    ok: true,
    data: { list: (res.data || []).map(sanitize) }
  }
}

// ==================== copy ====================
async function copy(openid, params) {
  if (!openid) return { ok: false, error: '未登录' }
  var originId = params.originActivityId
  if (!originId) return { ok: false, error: '缺少原活动id' }

  // 查找原活动（官方或自定义）
  var origin = null
  var isOfficial = false
  if (String(originId).indexOf('u_') !== 0 && String(originId).indexOf('food_') !== 0 && String(originId).indexOf('blank_') !== 0) {
    // 官方活动 - 从 activities 集合查
    var offRes = await db.collection('activities')
      .where({ activityId: originId, status: 'active' }).limit(1).get()
    if (offRes.data && offRes.data.length) {
      origin = offRes.data[0]
      isOfficial = true
    }
  }

  if (!origin) {
    // 从 user_activities 查（可能是克隆别人的自定义活动）
    var cusRes = await db.collection('user_activities')
      .where({ activityId: originId }).limit(1).get()
    if (cusRes.data && cusRes.data.length) origin = cusRes.data[0]
  }

  if (!origin) return { ok: false, error: '原活动不存在' }

  // 检查是否已复制过
  var dupRes = await db.collection('user_activities')
    .where({ ownerId: openid, originActivityId: originId }).limit(1).get()
  if (dupRes.data && dupRes.data.length) {
    return { ok: false, error: '已复制过该活动', activityId: dupRes.data[0].activityId }
  }

  var newName = (params.name && params.name.trim()) || (origin.name + '（我的）')
  var doc = {
    activityId: genId(openid),
    userId: openid,
    ownerId: openid,
    originActivityId: originId,
    isCustom: true,
    name: newName,
    category: origin.category || 'sport',
    unit: origin.unit || '次',
    scorePerUnit: origin.scorePerUnit != null ? origin.scorePerUnit : 1,
    description: origin.description || '',
    icon: params.icon || origin.icon || origin.presetAction || '',
    categoryName: params.categoryName || origin.categoryName || '',
    ext: params.ext || origin.ext || {},
    tags: params.tags || origin.tags || [],
    customMeta: params.customMeta || origin.customMeta || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await db.collection('user_activities').add({ data: doc })
  return { ok: true, data: { activity: sanitize(doc) } }
}

// ==================== update ====================
async function update(openid, params) {
  if (!openid) return { ok: false, error: '未登录' }
  var activityId = params.activityId
  if (!activityId) return { ok: false, error: '缺少 activityId' }

  var v = validate(params)
  if (!v.ok) return v

  // 校验归属
  var existRes = await db.collection('user_activities')
    .where({ activityId: activityId, ownerId: openid }).limit(1).get()
  if (!existRes.data || existRes.data.length === 0) {
    return { ok: false, error: '无权修改或活动不存在' }
  }

  var updateData = {
    name: v.data.name,
    category: v.data.category,
    unit: v.data.unit,
    scorePerUnit: v.data.scorePerUnit,
    description: v.data.description,
    icon: v.data.icon,
    categoryName: v.data.categoryName,
    ext: v.data.ext,
    tags: v.data.tags,
    customMeta: v.data.customMeta,
    updatedAt: new Date().toISOString()
  }

  await db.collection('user_activities')
    .where({ activityId: activityId, ownerId: openid })
    .update({ data: updateData })

  return { ok: true }
}

// ==================== delete ====================
async function remove(openid, params) {
  if (!openid) return { ok: false, error: '未登录' }
  var activityId = params.activityId
  if (!activityId) return { ok: false, error: '缺少 activityId' }

  var res = await db.collection('user_activities')
    .where({ activityId: activityId, ownerId: openid })
    .remove()

  return { ok: true, removed: res.stats ? res.stats.removed : 0 }
}

// ==================== reclassify（元卡改造：调整活动分类）====================
async function reclassify(openid, params) {
  if (!openid) return { ok: false, error: '未登录' }
  var activityId = params.activityId
  if (!activityId) return { ok: false, error: '缺少 activityId' }

  // 校验归属
  var existRes = await db.collection('user_activities')
    .where({ activityId: activityId, ownerId: openid }).limit(1).get()
  if (!existRes.data || existRes.data.length === 0) {
    return { ok: false, error: '无权修改或活动不存在' }
  }

  var existing = existRes.data[0]
  var currentMeta = existing.customMeta || {}

  // 更新分类元数据
  if (params.metaCard) currentMeta.metaCard = params.metaCard
  if (params.subcategory) currentMeta.subcategory = params.subcategory
  if (params.muscleWeights) currentMeta.muscleWeights = params.muscleWeights

  var upd = {
    customMeta: currentMeta,
    updatedAt: new Date().toISOString()
  }
  // 同步更新 topFilter/sideFilter（兼容旧维度）
  if (params.topFilter !== undefined) upd.topFilter = params.topFilter
  if (params.sideFilter !== undefined) upd.sideFilter = params.sideFilter

  await db.collection('user_activities')
    .where({ activityId: activityId, ownerId: openid })
    .update({ data: upd })

  return { ok: true }
}

// ==================== 入口 ====================
exports.main = async function(event, context) {
  var action = event.action
  var params = event.params || {}
  var openid = getOpenId()

  // 所有操作都需要登录
  if (!openid) {
    // list/copy/update/delete 都需要登录
    if (action !== 'health') {
      return { ok: false, error: '未登录' }
    }
  }

  try {
    switch (action) {
      case 'list':   return await list(openid, params)
      case 'copy':   return await copy(openid, params)
      case 'update': return await update(openid, params)
      case 'delete': return await remove(openid, params)
      case 'reclassify': return await reclassify(openid, params)
      case 'health': return { ok: true, status: 'running' }
      default: return { ok: false, error: 'unknown action: ' + String(action) }
    }
  } catch (e) {
    console.error('[user-activity]', action, '异常:', e)
    return { ok: false, error: '操作失败，请稍后重试' }
  }
}
