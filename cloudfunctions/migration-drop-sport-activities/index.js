// 一次性迁移：删除所有 sport 官方活动（保留 blank_sport）
// 部署后运行一次，运行后即可销毁

var cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
var db = cloud.database()

exports.main = async function(event) {
  var dryRun = event.dryRun !== false  // 默认试运行，传 { dryRun: false } 才真正删除

  try {
    // 查找所有 sport 官方活动（排除 blank_sport）
    var res = await db.collection('activities')
      .where({
        category: 'sport',
        isSystem: true,
        activityId: db.command.neq('blank_sport')
      })
      .limit(200)
      .get()

    var ids = (res.data || []).map(function(d) { return d._id })
    var names = (res.data || []).map(function(d) { return d.name || d.activityId })

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        count: ids.length,
        names: names,
        message: '试运行完成，未实际删除。传 { dryRun: false } 确认执行。'
      }
    }

    // 分批删除（每次最多 20 条）
    var removed = 0
    for (var i = 0; i < ids.length; i += 20) {
      var batch = ids.slice(i, i + 20)
      var delRes = await db.collection('activities')
        .where({ _id: db.command.in(batch) })
        .remove()
      removed += (delRes.stats && delRes.stats.removed) || 0
    }

    return {
      ok: true,
      dryRun: false,
      removed: removed,
      total: ids.length
    }
  } catch (e) {
    console.error('[migration-drop-sport-activities] 异常:', e)
    return { ok: false, error: e.message || '迁移失败' }
  }
}
