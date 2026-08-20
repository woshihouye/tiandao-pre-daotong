// 许愿池云函数 — 统一入口
// 集合：wishes / wish_likes / wish_favorites / wish_comments
var cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
var db = cloud.database();
var _ = db.command;

// ==================== 1. publishWish ====================
/** 发布许愿 */
async function publishWish(event, OPENID) {
  var content = (event.content || '').trim();
  if (!content || content.length < 1 || content.length > 100) {
    return { ok: false, error: '许愿内容需在1-100字之间' };
  }
  var nickName = event.nickName || '无名修士';
  var avatar = event.avatar || '';

  // wishId 生成（碰撞兜底最多 3 次）
  var wishId = '';
  var created = false;
  for (var attempt = 0; attempt < 3; attempt++) {
    wishId = 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    var countRes = await db.collection('wishes').where({ wishId: wishId }).count();
    if (countRes.total === 0) { created = true; break; }
  }
  if (!created) return { ok: false, error: '请稍后重试' };

  var now = new Date();
  await db.collection('wishes').add({
    data: {
      wishId: wishId, userId: OPENID, nickName: nickName, avatar: avatar,
      content: content, likeCount: 0, favCount: 0, commentCount: 0,
      status: 'open', hotScore: 0, createdAt: now, updatedAt: now
    }
  });
  return { ok: true, wishId: wishId };
}

// ==================== 2. listWishes ====================
/** 许愿列表分页 */
async function listWishes(event) {
  var page = Math.min(Math.max(1, parseInt(event.page) || 1), 100);
  var pageSize = Math.min(Math.max(1, parseInt(event.pageSize) || 20), 50);
  var countRes = await db.collection('wishes').count();
  var sortBy = event.sortBy === 'new' ? 'createdAt' : 'hotScore'
  var listRes = await db.collection('wishes')
    .orderBy(sortBy, 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
  return {
    ok: true, wishes: listRes.data, total: countRes.total,
    hasMore: (page * pageSize) < countRes.total
  };
}

// ==================== 3. getWishDetail ====================
/** 许愿详情 + 当前用户是否已赞/已藏 */
async function getWishDetail(event, OPENID) {
  var wishId = event.wishId;
  if (!wishId) return { ok: false, error: '缺少 wishId 参数' };
  var wishRes = await db.collection('wishes').where({ wishId: wishId }).limit(1).get();
  if (!wishRes.data || !wishRes.data.length) return { ok: false, error: '许愿不存在' };
  var likeRes = await db.collection('wish_likes').where({ wishId: wishId, userId: OPENID }).count();
  var favRes = await db.collection('wish_favorites').where({ wishId: wishId, userId: OPENID }).count();
  return {
    ok: true, wish: wishRes.data[0],
    isLiked: likeRes.total > 0, isFavorited: favRes.total > 0
  };
}

// ==================== 4. deleteWish ====================
/** 删除许愿（级联：子表先删，主表最后；每步容错不中断） */
async function deleteWish(event, OPENID) {
  var wishId = event.wishId;
  if (!wishId) return { ok: false, error: '缺少 wishId 参数' };
  var wRes = await db.collection('wishes').where({ wishId: wishId }).limit(1).get();
  if (!wRes.data || !wRes.data.length) return { ok: false, error: '许愿不存在' };
  if (wRes.data[0].userId !== OPENID) return { ok: false, error: '无权删除' };

  // 子表依次删除（出错仅 log，不中断）
  try { await db.collection('wish_likes').where({ wishId: wishId }).remove(); }
  catch (e) { console.error('delete wish_likes error:', e); }
  try { await db.collection('wish_favorites').where({ wishId: wishId }).remove(); }
  catch (e) { console.error('delete wish_favorites error:', e); }
  try { await db.collection('wish_comments').where({ wishId: wishId }).remove(); }
  catch (e) { console.error('delete wish_comments error:', e); }
  // 主表
  await db.collection('wishes').where({ wishId: wishId }).remove();
  return { ok: true };
}

// ==================== 4b. fulfillWish ====================
/** 完成愿望：许愿者之外的用户可将其标记为已满足 */
async function fulfillWish(event, OPENID) {
  var wishId = (event.wishId || '').trim();
  if (!wishId) return { ok: false, error: '缺少愿望 id' };
  var res = await db.collection('wishes').where({ wishId: wishId }).limit(1).get();
  var wish = res.data && res.data[0];
  if (!wish) return { ok: false, error: '愿望不存在' };
  if (wish.status !== 'open') return { ok: false, error: '该愿望已被满足' };
  if (wish.userId === OPENID) return { ok: false, error: '自己的愿望需由他人助成' };
  var nickName = event.nickName || '无名修士';
  await db.collection('wishes').doc(wish._id).update({
    data: {
      status: 'fulfilled',
      fulfilledBy: OPENID,
      fulfilledByNick: nickName,
      fulfilledAt: new Date(),
      updatedAt: new Date()
    }
  });
  return { ok: true, wishId: wishId };
}

// ==================== 5. likeWish ====================
/** 点赞 toggle */
async function likeWish(event, OPENID) {
  var wishId = event.wishId;
  if (!wishId) return { ok: false, error: '缺少 wishId 参数' };
  var existRes = await db.collection('wish_likes').where({ wishId: wishId, userId: OPENID }).get();
  var liked = false;
  if (existRes.data && existRes.data.length > 0) {
    await db.collection('wish_likes').doc(existRes.data[0]._id).remove();
    await db.collection('wishes').where({ wishId: wishId }).update({ data: { likeCount: _.inc(-1), hotScore: _.inc(-2), updatedAt: new Date() } });
    liked = false;
  } else {
    await db.collection('wish_likes').add({ data: { wishId: wishId, userId: OPENID, createdAt: new Date() } });
    await db.collection('wishes').where({ wishId: wishId }).update({ data: { likeCount: _.inc(1), hotScore: _.inc(2), updatedAt: new Date() } });
    liked = true;
  }
  var t = await db.collection('wishes').where({ wishId: wishId }).limit(1).get();
  return { ok: true, liked: liked, likeCount: t.data[0] ? (t.data[0].likeCount || 0) : 0 };
}

// ==================== 6. favWish ====================
/** 收藏 toggle */
async function favWish(event, OPENID) {
  var wishId = event.wishId;
  if (!wishId) return { ok: false, error: '缺少 wishId 参数' };
  var existRes = await db.collection('wish_favorites').where({ wishId: wishId, userId: OPENID }).get();
  var favorited = false;
  if (existRes.data && existRes.data.length > 0) {
    await db.collection('wish_favorites').doc(existRes.data[0]._id).remove();
    await db.collection('wishes').where({ wishId: wishId }).update({ data: { favCount: _.inc(-1), hotScore: _.inc(-3), updatedAt: new Date() } });
    favorited = false;
  } else {
    await db.collection('wish_favorites').add({ data: { wishId: wishId, userId: OPENID, createdAt: new Date() } });
    await db.collection('wishes').where({ wishId: wishId }).update({ data: { favCount: _.inc(1), hotScore: _.inc(3), updatedAt: new Date() } });
    favorited = true;
  }
  var t = await db.collection('wishes').where({ wishId: wishId }).limit(1).get();
  return { ok: true, favorited: favorited, favCount: t.data[0] ? (t.data[0].favCount || 0) : 0 };
}

// ==================== 7. addWishComment ====================
/** 新增评论（B1 锁死：userId=OPENID；nickName 兜底「无名修士」，avatar 可空） */
async function addWishComment(event, OPENID) {
  var wishId = event.wishId;
  var content = (event.content || '').trim();
  if (!wishId) return { ok: false, error: '缺少 wishId 参数' };
  if (!content || content.length < 1 || content.length > 500) {
    return { ok: false, error: '评论内容需在1-500字之间' };
  }
  var wRes = await db.collection('wishes').where({ wishId: wishId }).limit(1).get();
  if (!wRes.data || !wRes.data.length) return { ok: false, error: '许愿不存在' };
  var nickName = event.nickName || '无名修士';
  var avatar = event.avatar || '';

  var addRes = await db.collection('wish_comments').add({
    data: {
      wishId: wishId, userId: OPENID, nickName: nickName, avatar: avatar,
      content: content, createdAt: new Date()
    }
  });
  await db.collection('wishes').where({ wishId: wishId }).update({
    data: { commentCount: _.inc(1), hotScore: _.inc(2), updatedAt: new Date() }
  });
  return { ok: true, commentId: addRes._id };
}

// ==================== 8. getWishComments ====================
/** 评论列表（按时间正序，分页） */
async function getWishComments(event) {
  var wishId = event.wishId;
  var page = Math.min(Math.max(1, parseInt(event.page) || 1), 100);
  var pageSize = Math.min(Math.max(1, parseInt(event.pageSize) || 20), 50);
  if (!wishId) return { ok: false, error: '缺少 wishId 参数' };
  var countRes = await db.collection('wish_comments').where({ wishId: wishId }).count();
  var listRes = await db.collection('wish_comments')
    .where({ wishId: wishId })
    .orderBy('createdAt', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
  return {
    ok: true, comments: listRes.data, total: countRes.total,
    hasMore: (page * pageSize) < countRes.total
  };
}

// ==================== 主入口 ====================
exports.main = async function(event, context) {
  var action = event.action;
  var wxContext = cloud.getWXContext();
  var OPENID = wxContext.OPENID;
  if (!OPENID) return { ok: false, error: '未登录' };

  try {
    switch (action) {
      case 'publishWish':     return await publishWish(event, OPENID);
      case 'listWishes':      return await listWishes(event);
      case 'getWishDetail':   return await getWishDetail(event, OPENID);
      case 'deleteWish':      return await deleteWish(event, OPENID);
      case 'fulfillWish':     return await fulfillWish(event, OPENID);
      case 'likeWish':        return await likeWish(event, OPENID);
      case 'favWish':         return await favWish(event, OPENID);
      case 'addWishComment':  return await addWishComment(event, OPENID);
      case 'getWishComments': return await getWishComments(event);
      default: return { ok: false, error: '未知 action: ' + action };
    }
  } catch (err) {
    console.error('wish-manager error:', err);
    return { ok: false, error: (err && err.errMsg) || '系统错误' };
  }
};
