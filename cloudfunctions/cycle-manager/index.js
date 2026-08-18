const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  try {
    const ctx = cloud.getWXContext();
    const OPENID = ctx.OPENID || '';
    const action = event.action || '';

    if (!OPENID) {
      return { ok: false, error: '未登录' };
    }

    switch (action) {
      case 'create':       return await createPlaylist(event, OPENID);
      case 'update':       return await updatePlaylist(event, OPENID);
      case 'toggleItem':   return await toggleItem(event, OPENID);
      case 'removeItem':   return await removeItem(event, OPENID);
      case 'reorder':      return await reorderItems(event, OPENID);
      case 'list':         return await listPlaylists(event, OPENID);
      case 'remove':       return await removePlaylist(event, OPENID);
      case 'getTodayPlay': return await getTodayPlay(event, OPENID);
      default:
        return { ok: false, error: '未知的 action: ' + action };
    }
  } catch (err) {
    console.error('[cycle-manager] 未知错误:', err.message);
    return { ok: false, error: '歌单操作失败，请稍后重试' };
  }
};

/* ------------------------------ helpers ------------------------------ */

function todayStr() {
  var d = new Date();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

async function loadPlaylist(id) {
  var r = await db.collection('playlists').where({ id: id }).get();
  return r.data && r.data[0];
}

async function verifyOwner(id, OPENID) {
  var doc = await loadPlaylist(id);
  if (!doc) return { error: '歌单不存在' };
  if (doc.creatorId !== OPENID) return { error: '无权限操作' };
  return { doc: doc };
}

/* ------------------------------ CRUD ------------------------------ */

async function createPlaylist(event, OPENID) {
  var name = (event.name || '').trim();
  var items = Array.isArray(event.items) ? event.items : [];
  var playMode = event.playMode === 'random' ? 'random' : 'loop';
  var scoreTarget = Math.max(0, parseInt(event.scoreTarget) || 0);
  if (!name) return { ok: false, error: '请填写歌单名称' };

  var id = 'pl_' + Date.now();
  var now = Date.now();
  var data = {
    id: id,
    name: name,
    cover: (name || '歌').slice(0, 1),
    creatorId: OPENID,
    items: items.map(function(x, i) {
      return {
        templateId: x.templateId,
        enabled: x.enabled !== false,
        order: typeof x.order === 'number' ? x.order : i
      };
    }).sort(function(a, b) { return a.order - b.order; }),
    playMode: playMode,
    scoreTarget: scoreTarget,
    cursor: 0,
    lastPlayDate: '',
    recentPlayed: [],
    createdAt: now,
    updatedAt: now
  };
  await db.collection('playlists').add({ data: data });
  return { ok: true, id: id, playlist: data };
}

async function updatePlaylist(event, OPENID) {
  var id = event.id;
  if (!id) return { ok: false, error: '缺少 id' };
  var chk = await verifyOwner(id, OPENID);
  if (chk.error) return { ok: false, error: chk.error };
  var patch = { updatedAt: Date.now() };
  if (typeof event.name === 'string' && event.name.trim()) patch.name = event.name.trim();
  if (Array.isArray(event.items)) {
    patch.items = event.items.map(function(x, i) {
      return {
        templateId: x.templateId,
        enabled: x.enabled !== false,
        order: typeof x.order === 'number' ? x.order : i
      };
    }).sort(function(a, b) { return a.order - b.order; });
  }
  if (event.playMode === 'loop' || event.playMode === 'random') patch.playMode = event.playMode;
  if (typeof event.scoreTarget !== 'undefined') patch.scoreTarget = Math.max(0, parseInt(event.scoreTarget) || 0);
  await db.collection('playlists').where({ id: id }).update({ data: patch });
  return { ok: true };
}

async function toggleItem(event, OPENID) {
  var id = event.id;
  var templateId = event.templateId;
  var enabled = !!event.enabled;
  if (!id || !templateId) return { ok: false, error: '参数不全' };
  var chk = await verifyOwner(id, OPENID);
  if (chk.error) return { ok: false, error: chk.error };
  var items = (chk.doc.items || []).map(function(it) {
    if (it.templateId === templateId) it.enabled = enabled;
    return it;
  });
  await db.collection('playlists').where({ id: id }).update({
    data: { items: items, updatedAt: Date.now() }
  });
  return { ok: true };
}

async function removeItem(event, OPENID) {
  var id = event.id;
  var templateId = event.templateId;
  if (!id || !templateId) return { ok: false, error: '参数不全' };
  var chk = await verifyOwner(id, OPENID);
  if (chk.error) return { ok: false, error: chk.error };
  var items = (chk.doc.items || []).filter(function(it) { return it.templateId !== templateId });
  items = items.map(function(x, i) { x.order = i; return x; });
  var cursor = Math.min(chk.doc.cursor || 0, Math.max(0, items.length - 1));
  await db.collection('playlists').where({ id: id }).update({
    data: { items: items, cursor: cursor, updatedAt: Date.now() }
  });
  return { ok: true };
}

async function reorderItems(event, OPENID) {
  var id = event.id;
  var templateIds = Array.isArray(event.templateIds) ? event.templateIds : [];
  if (!id || !templateIds.length) return { ok: false, error: '参数不全' };
  var chk = await verifyOwner(id, OPENID);
  if (chk.error) return { ok: false, error: chk.error };
  var map = {};
  (chk.doc.items || []).forEach(function(it) { map[it.templateId] = it; });
  var items = templateIds.map(function(tid, i) {
    var base = map[tid] || { templateId: tid, enabled: true };
    return { templateId: base.templateId, enabled: base.enabled !== false, order: i };
  });
  await db.collection('playlists').where({ id: id }).update({
    data: { items: items, updatedAt: Date.now() }
  });
  return { ok: true };
}

async function listPlaylists(event, OPENID) {
  var creatorId = event.creatorId || OPENID;
  if (creatorId !== OPENID) return { ok: false, error: '无权限查看' };
  var res = await db.collection('playlists')
    .where({ creatorId: creatorId })
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  return { ok: true, playlists: res.data };
}

async function removePlaylist(event, OPENID) {
  var id = event.id;
  if (!id) return { ok: false, error: '缺少 id' };
  var chk = await verifyOwner(id, OPENID);
  if (chk.error) return { ok: false, error: chk.error };
  await db.collection('playlists').where({ id: id }).remove();
  return { ok: true };
}

/* ------------------------------ 今日播放计算 ------------------------------ */

async function getTodayPlay(event, OPENID) {
  var id = event.id;
  if (!id) return { ok: false, error: '缺少 id' };
  var chk = await verifyOwner(id, OPENID);
  if (chk.error) return { ok: false, error: chk.error };
  var doc = chk.doc;
  var items = doc.items || [];
  var enabledItems = items.filter(function(it) { return it.enabled === true; });

  // 0 个可用
  if (!enabledItems.length) {
    return { ok: true, templateId: '', templateName: '', skipped: true };
  }

  var today = todayStr();
  var picked;

  if (doc.playMode === 'random') {
    /* ---------- 随机不连续重复 ---------- */
    var recent = Array.isArray(doc.recentPlayed) ? doc.recentPlayed : [];
    var candidates = enabledItems.filter(function(it) {
      return recent.indexOf(it.templateId) === -1;
    });
    // 候选空 → 有损降级为全量 enabled 随机
    var pool = candidates.length ? candidates : enabledItems;
    var rIdx = Math.floor(Math.random() * pool.length);
    picked = pool[rIdx];
    recent.push(picked.templateId);
    recent = recent.slice(-3);
    await db.collection('playlists').where({ id: id }).update({
      data: { recentPlayed: recent, lastPlayDate: today, updatedAt: Date.now() }
    });
  } else {
    /* ---------- loop：每次从 cursor 向后找第一个 enabled，禁止直接 items[cursor] ---------- */
    var cursor = Math.max(0, parseInt(doc.cursor) || 0);
    var len = items.length;
    var foundIdx = -1;
    // 第一轮：cursor 到末尾
    for (var i = cursor; i < len; i++) {
      if (items[i] && items[i].enabled === true) { foundIdx = i; break; }
    }
    // 第二轮：0 到 cursor-1（如果第一轮未命中）
    if (foundIdx === -1) {
      for (var j = 0; j < cursor; j++) {
        if (items[j] && items[j].enabled === true) { foundIdx = j; break; }
      }
    }
    if (foundIdx === -1) {
      return { ok: true, templateId: '', templateName: '', skipped: true };
    }
    picked = items[foundIdx];
    // lastPlayDate 判断推进 cursor
    var lastPlay = doc.lastPlayDate || '';
    if (lastPlay !== today || foundIdx !== cursor) {
      await db.collection('playlists').where({ id: id }).update({
        data: { cursor: foundIdx, lastPlayDate: today, updatedAt: Date.now() }
      });
    }
  }

  return {
    ok: true,
    templateId: picked.templateId || '',
    templateName: picked.templateName || '',
    skipped: false
  };
}
