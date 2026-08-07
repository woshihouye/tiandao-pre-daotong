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

/** 默认活动卡（新用户首次进入活动库时自动写入，等同自建卡） */
var DEFAULT_ACTIVITY_CARDS = [
  // ---- sport ----
  { id: 'sport_push_bench', name: '哑铃平板卧推', category: 'sport', unit: '组', scorePerUnit: 1, icon: '🏋️', description: '平板卧推，主练胸大肌、三角肌前束、肱三头肌' },
  { id: 'sport_squat', name: '深蹲', category: 'sport', unit: '组', scorePerUnit: 1, icon: '🦵', description: '深蹲，主练股四头肌、臀大肌、核心' },
  { id: 'sport_deadlift', name: '硬拉', category: 'sport', unit: '组', scorePerUnit: 1, icon: '🏋️‍♀️', description: '硬拉，主练后链（腘绳肌、臀大肌、下背）' },
  { id: 'sport_running', name: '跑步', category: 'sport', unit: '分钟', scorePerUnit: 1, icon: '🏃', description: '有氧跑步，提升心肺耐力' },
  // ---- diet ----
  { id: 'diet_breakfast', name: '健康早餐', category: 'diet', unit: '份', scorePerUnit: 1, icon: '🥣', description: '按时吃一份营养均衡的早餐' },
  { id: 'diet_water', name: '喝够8杯水', category: 'diet', unit: '杯', scorePerUnit: 1, icon: '💧', description: '全天饮水达到 8 杯（约 1.6L）' },
  { id: 'diet_protein', name: '补充优质蛋白', category: 'diet', unit: '份', scorePerUnit: 1, icon: '🥚', description: '摄入足量优质蛋白（蛋/肉/奶/豆制品）' },
  { id: 'diet_no_sugar_drink', name: '戒断高糖饮料', category: 'diet', unit: '次', scorePerUnit: 1, icon: '🚫🥤', description: '今天没有喝任何含糖饮料' },
  // ---- study ----
  { id: 'study_course', name: '学习课程/技能', category: 'study', unit: '分钟', scorePerUnit: 1, icon: '🎓', description: '学习一门课程或练习一项技能' },
  { id: 'study_read', name: '阅读书籍', category: 'study', unit: '分钟', scorePerUnit: 1, icon: '📖', description: '专注阅读 30 分钟以上' },
  { id: 'study_thesis', name: '论文写作', category: 'study', unit: '分钟', scorePerUnit: 1, icon: '📄', description: '撰写论文、开题报告或学术材料' },
  { id: 'study_experiment', name: '实验研究', category: 'study', unit: '分钟', scorePerUnit: 1, icon: '🔬', description: '实验设计、数据采集或结果分析' },
  { id: 'study_review', name: '复盘总结', category: 'study', unit: '分钟', scorePerUnit: 1, icon: '📝', description: '对今天的学习或工作复盘总结（含组会准备）' },
  // ---- work ----
  { id: 'work_research', name: '市场调研分析', category: 'work', unit: '分钟', scorePerUnit: 1, icon: '🔍', description: '收集并分析目标市场或用户信息' },
  { id: 'work_plan', name: '商业方案撰写', category: 'work', unit: '分钟', scorePerUnit: 1, icon: '📊', description: '撰写商业计划、方案或路演材料' },
  { id: 'work_troubleshoot', name: '问题排查修复', category: 'work', unit: '分钟', scorePerUnit: 1, icon: '🔧', description: '定位并解决一个实际问题' },
  { id: 'work_novel', name: '网文创作', category: 'work', unit: '分钟', scorePerUnit: 1, icon: '✍️', description: '长篇网文小说写作或大纲打磨' },
  // ---- debuff ----
  { id: 'debuff_stay_up', name: '熬夜（24点后睡）', category: 'debuff', unit: '次', scorePerUnit: -1, icon: '🌙', description: '超过 24 点才入睡' },
  { id: 'debuff_sedentary', name: '久坐超2小时', category: 'debuff', unit: '次', scorePerUnit: -1, icon: '🪑', description: '连续久坐超过 2 小时未起身' },
  { id: 'debuff_binge', name: '暴饮暴食', category: 'debuff', unit: '次', scorePerUnit: -1, icon: '🍔', description: '一次性摄入远超正常量的食物' },
  { id: 'debuff_smoking', name: '抽烟', category: 'debuff', unit: '次', scorePerUnit: -1, icon: '🚬', description: '今天抽烟了' },
  { id: 'debuff_drinking', name: '喝酒', category: 'debuff', unit: '次', scorePerUnit: -1, icon: '🍺', description: '今天喝酒了' },
  { id: 'debuff_bar', name: '泡吧', category: 'debuff', unit: '次', scorePerUnit: -1, icon: '🍸', description: '今天去酒吧/夜店了' },
  { id: 'debuff_screen', name: '沉迷屏幕超2小时', category: 'debuff', unit: '次', scorePerUnit: -1, icon: '📱', description: '玩游戏或刷短视频连续超过 2 小时' }
]

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

// ==================== initDefaults ====================
/** 新用户默认活动卡初始化（幂等：已初始化或已有自建卡则不重复写入） */
async function initDefaults(openid) {
  if (!openid) return { ok: false, error: '未登录' }

  // 1. 已初始化标记存在 → 直接返回（用户删光默认卡也不会复活）
  var markerRes = await db.collection('user_activities')
    .where({ type: 'default_init_marker', ownerId: openid }).limit(1).get()
  if (markerRes.data && markerRes.data.length) {
    return { ok: true, initialized: true, count: 0 }
  }

  // 2. 已有任何自定义活动（老用户）→ 跳过，不写标记
  var mineRes = await db.collection('user_activities')
    .where({ ownerId: openid }).limit(1).get()
  if (mineRes.data && mineRes.data.length) {
    return { ok: true, initialized: false, count: 0 }
  }

  // 3. 写入默认卡（固定 _id 防并发双写，冲突=已存在=跳过）
  var short = (openid || '').replace(/[^a-zA-Z0-9]/g, '').slice(-8)
  var now = new Date().toISOString()
  var written = 0
  var cards = []
  for (var i = 0; i < DEFAULT_ACTIVITY_CARDS.length; i++) {
    var c = DEFAULT_ACTIVITY_CARDS[i]
    var doc = {
      _id: 'dflt_' + c.id + '_' + short,
      activityId: 'dflt_' + c.id + '_' + short,
      type: 'default_activity',
      ownerId: openid,
      userId: openid,
      isCustom: true,
      isDefault: true,
      name: c.name,
      category: c.category,
      unit: c.unit,
      scorePerUnit: c.scorePerUnit,
      description: c.description,
      icon: c.icon,
      categoryName: '',
      ext: {},
      tags: [],
      customMeta: null,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
    try {
      await db.collection('user_activities').add({ data: doc })
      written++
      cards.push({ cardId: c.id, actId: doc.activityId, name: c.name, category: c.category, unit: c.unit, scorePerUnit: c.scorePerUnit, icon: c.icon })
    } catch (e) {
      // _id 冲突 = 已存在，跳过
    }
  }

  // 4. 写初始化标记（_id 固定，防并发）
  try {
    await db.collection('user_activities').add({
      data: {
        _id: 'dflt_init_' + short,
        activityId: 'dflt_init_' + short,
        type: 'default_init_marker',
        ownerId: openid,
        createdAt: now
      }
    })
  } catch (e) {
    // 并发下标记已存在，忽略
  }

  return { ok: true, initialized: true, count: written, cards: cards }
}

// ==================== restoreDefaultCards ====================
/** 手动恢复系统默认卡：补写缺失的 dflt_ 卡（用户主动触发；固定 _id 防并发，冲突=已存在=跳过） */
async function restoreDefaultCards(openid) {
  if (!openid) return { ok: false, error: '未登录' }
  var short = (openid || '').replace(/[^a-zA-Z0-9]/g, '').slice(-8)
  var now = new Date().toISOString()
  var written = 0
  for (var i = 0; i < DEFAULT_ACTIVITY_CARDS.length; i++) {
    var c = DEFAULT_ACTIVITY_CARDS[i]
    var doc = {
      _id: 'dflt_' + c.id + '_' + short,
      activityId: 'dflt_' + c.id + '_' + short,
      type: 'default_activity',
      ownerId: openid,
      userId: openid,
      isCustom: true,
      isDefault: true,
      name: c.name,
      category: c.category,
      unit: c.unit,
      scorePerUnit: c.scorePerUnit,
      description: c.description,
      icon: c.icon,
      categoryName: '',
      ext: {},
      tags: [],
      customMeta: null,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
    try {
      await db.collection('user_activities').add({ data: doc })
      written++
    } catch (e) {
      // _id 冲突 = 已存在，跳过
    }
  }
  // 补写初始化标记（防 initDefaults 后续重复触发；已存在则忽略）
  try {
    await db.collection('user_activities').add({
      data: {
        _id: 'dflt_init_' + short,
        activityId: 'dflt_init_' + short,
        type: 'default_init_marker',
        ownerId: openid,
        createdAt: now
      }
    })
  } catch (e) {
    // 标记已存在，忽略
  }
  return { ok: true, written: written }
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
      case 'initDefaults': return await initDefaults(openid, params)
      case 'restoreDefaultCards': return await restoreDefaultCards(openid, params)
      case 'reclassify': return await reclassify(openid, params)
      case 'health': return { ok: true, status: 'running' }
      default: return { ok: false, error: 'unknown action: ' + String(action) }
    }
  } catch (e) {
    console.error('[user-activity]', action, '异常:', e)
    return { ok: false, error: '操作失败，请稍后重试' }
  }
}
