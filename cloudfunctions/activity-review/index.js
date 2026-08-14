// 公共修行库审核云函数
// 集合：activities（官方/公共库）/ activities_applications（用户申请）
// 权限：isAdmin（admins 集合 openid 或 adminToken 兜底）

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ADMIN_TOKEN = 'tiandao-init-2026'

// 6 大道则分类 label 映射（与 template-config.js categoryTabs 对齐）
const GRAND_DAO_CATEGORIES = {
  li:   '力之大道',
  gong: '工之大道',
  wu:   '悟之大道',
  yang: '养生道',
  zi:   '自由道',
  hong: '红尘道'
}

// 申请表单分类白名单（锁死）
const GRAND_DAO_KEYS = ['li', 'gong', 'wu', 'yang', 'zi', 'hong']

// 官方卡 5 大类 → 6 大道则 key（listActivityApplications 补 categoryLabel 用）
const CATEGORY_TO_GRAND_DAO = { sport: 'li', work: 'gong', study: 'wu', diet: 'yang', debuff: 'hong' }

/** 管理员判定：OPENID 在 admins 集合 或 adminToken 兜底 */
async function isAdmin(wxContext, event) {
  if (event.adminToken === ADMIN_TOKEN) return true
  var res = await db.collection('admins').where({ openid: wxContext.OPENID }).limit(1).get()
  return res.data && res.data.length > 0
}

// ==================== 用户申请 4 ====================

/** 1. 用户提交申请 → activities_applications（status:'pending'） */
async function submitActivityApplication(event, wxContext) {
  var openid = wxContext.OPENID
  if (!openid) return { ok: false, error: '未登录' }

  var name = String(event.name || '').trim()
  var category = event.category
  var unit = String(event.unit || '').trim() || '次'
  var scorePerUnit = Number(event.scorePerUnit)
  var description = String(event.description || '').trim()

  // 校验
  if (!name) return { ok: false, error: '活动名称不能为空' }
  if (GRAND_DAO_KEYS.indexOf(category) === -1) return { ok: false, error: '分类不合法' }
  if (isNaN(scorePerUnit) || scorePerUnit === 0) return { ok: false, error: '修为值不合法' }

  // 去重：同 openid + 同 name 且 status='pending' 已存在
  var dupRes = await db.collection('activities_applications')
    .where({ applicantId: openid, name: name, status: 'pending' }).limit(1).get()
  if (dupRes.data && dupRes.data.length) {
    return { ok: false, error: '已提交过同名申请' }
  }

  var doc = {
    name: name,
    category: category,
    categoryLabel: GRAND_DAO_CATEGORIES[category] || category,
    unit: unit,
    scorePerUnit: scorePerUnit,
    description: description,
    applicantId: openid,
    status: 'pending',
    reviewNote: '',
    createdAt: Date.now()
  }

  var res = await db.collection('activities_applications').add({ data: doc })
  return { ok: true, applicationId: res._id }
}

/** 2. 待审核列表（用户申请 pending + 官方卡 pending_review） */
async function listActivityApplications(event, wxContext) {
  if (!(await isAdmin(wxContext, event))) return { ok: false, error: '无权限' }

  var officialRes = await db.collection('activities')
    .where({ isSystem: true, reviewStatus: 'pending_review' })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  var userRes = await db.collection('activities_applications')
    .where({ status: 'pending' })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  // 官方卡补 categoryLabel（category 5 大类 → 6 大道则 label）
  var officialPending = (officialRes.data || []).map(function (doc) {
    var gd = CATEGORY_TO_GRAND_DAO[doc.category] || doc.category
    doc.categoryLabel = GRAND_DAO_CATEGORIES[gd] || doc.categoryLabel || doc.category
    return doc
  })

  return {
    ok: true,
    data: {
      officialPending: officialPending,
      userApplications: userRes.data || []
    }
  }
}

/** 3. 通过用户申请 → 写 activities（isPublicLibrary:true）+ application 置 approved */
async function approveActivityApplication(event, wxContext) {
  if (!(await isAdmin(wxContext, event))) return { ok: false, error: '无权限' }
  var applicationId = event.applicationId
  if (!applicationId) return { ok: false, error: '缺少 applicationId' }

  var appRes = await db.collection('activities_applications')
    .where({ _id: applicationId }).limit(1).get()
  var app = appRes.data && appRes.data[0]
  if (!app) return { ok: false, error: '申请不存在' }

  // 写 activities（新 doc）；不改 scorePerUnit，直接采用申请人填的分值
  var doc = {
    name: app.name,
    category: app.category,
    categoryLabel: app.categoryLabel || GRAND_DAO_CATEGORIES[app.category] || app.category,
    unit: app.unit,
    scorePerUnit: app.scorePerUnit,
    description: app.description || '',
    isPublicLibrary: true,
    isSystem: true,
    status: 'active',
    reviewStatus: 'approved',
    source: 'user_application',
    sourceApplicantId: app.applicantId,
    createdAt: Date.now()
  }
  var addRes = await db.collection('activities').add({ data: doc })

  // 更新申请状态
  await db.collection('activities_applications').doc(applicationId).update({
    data: { status: 'approved' }
  })

  return { ok: true, activityId: addRes._id }
}

/** 4. 驳回用户申请 → application 置 rejected + reviewNote */
async function rejectActivityApplication(event, wxContext) {
  if (!(await isAdmin(wxContext, event))) return { ok: false, error: '无权限' }
  var applicationId = event.applicationId
  if (!applicationId) return { ok: false, error: '缺少 applicationId' }

  await db.collection('activities_applications').doc(applicationId).update({
    data: { status: 'rejected', reviewNote: String(event.reason || '') }
  })

  return { ok: true }
}

// ==================== 官方卡重审 2 ====================

/** 5. 通过官方卡重审 → activities 置 reviewStatus:'approved' + isPublicLibrary:true */
async function approveOfficialCard(event, wxContext) {
  if (!(await isAdmin(wxContext, event))) return { ok: false, error: '无权限' }
  var activityId = event.activityId
  if (!activityId) return { ok: false, error: '缺少 activityId' }

  await db.collection('activities').doc(activityId).update({
    data: { reviewStatus: 'approved', isPublicLibrary: true }
  })

  return { ok: true }
}

/** 6. 驳回官方卡 → activities 置 reviewStatus:'rejected' + status:'inactive' */
async function rejectOfficialCard(event, wxContext) {
  if (!(await isAdmin(wxContext, event))) return { ok: false, error: '无权限' }
  var activityId = event.activityId
  if (!activityId) return { ok: false, error: '缺少 activityId' }

  await db.collection('activities').doc(activityId).update({
    data: { reviewStatus: 'rejected', status: 'inactive', reviewNote: String(event.reason || '') }
  })

  return { ok: true }
}

// ==================== 迁移 1 ====================

/** 7. 一次性迁移：191 张官方卡标记 reviewStatus:'pending_review'（幂等） */
async function migrateOfficialCards(event, wxContext) {
  if (!(await isAdmin(wxContext, event))) return { ok: false, error: '无权限' }

  // 双标识兼容（isSystem 或 isOfficial），且 reviewStatus 不存在（幂等）
  var where = {
    reviewStatus: _.exists(false),
    _: _.or([{ isSystem: true }, { isOfficial: true }])
  }

  // 前置核对：命中数明显异常（0 或远超 191）则停止上报
  var countRes = await db.collection('activities').where(where).count()
  var preCount = countRes.total
  if (preCount === 0 || preCount > 300) {
    return { ok: false, error: '迁移命中数异常，停止：' + preCount, preCount: preCount }
  }

  var migrated = 0
  // 分批循环（每批 50 条）：已迁移 doc 因 reviewStatus 已存在而退出 where，无需 skip 递增
  while (true) {
    var batchRes = await db.collection('activities').where(where).limit(50).get()
    var docs = batchRes.data || []
    if (!docs.length) break

    var n = 0
    for (var i = 0; i < docs.length; i++) {
      await db.collection('activities').doc(docs[i]._id).update({
        data: { reviewStatus: 'pending_review', isPublicLibrary: false }
      })
      n++
    }
    migrated += n
    console.log('migrated batch:', n)
  }

  return { ok: true, migrated: migrated, preCount: preCount }
}

// ==================== 入口 ====================
exports.main = async function(event, context) {
  var wxContext = cloud.getWXContext()
  var action = event.action
  switch (action) {
    case 'submitActivityApplication': return await submitActivityApplication(event, wxContext)
    case 'listActivityApplications':  return await listActivityApplications(event, wxContext)
    case 'approveActivityApplication': return await approveActivityApplication(event, wxContext)
    case 'rejectActivityApplication': return await rejectActivityApplication(event, wxContext)
    case 'approveOfficialCard':       return await approveOfficialCard(event, wxContext)
    case 'rejectOfficialCard':        return await rejectOfficialCard(event, wxContext)
    case 'migrateOfficialCards':      return await migrateOfficialCards(event, wxContext)
    default: return { ok: false, error: 'unknown action: ' + String(action) }
  }
}
