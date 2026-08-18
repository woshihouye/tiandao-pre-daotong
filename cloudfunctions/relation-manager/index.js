const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  try {
    const ctx = cloud.getWXContext();
    const OPENID = ctx.OPENID || '';
    const action = event.action || '';
    if (!OPENID) return { ok: false, error: '未登录' };

    switch (action) {
      case 'createInvite':      return await createInvite(event, OPENID);
      case 'acceptInvite':      return await acceptInvite(event, OPENID);
      case 'getDisciples':      return await getDisciples(event, OPENID);
      case 'getMentor':         return await getMentor(event, OPENID);
      case 'getMentorTemplates':return await getMentorTemplates(event, OPENID);
      case 'unbind':            return await unbindRelation(event, OPENID);
      case 'bindDaoist':        return await bindDaoist(event, OPENID);
      case 'unbindDaoist':      return await unbindDaoist(event, OPENID);
      case 'getDaoists':        return await getDaoists(event, OPENID);
      case 'getDaoistTemplates':return await getDaoistTemplates(event, OPENID);
      default:
        return { ok: false, error: '未知的 action: ' + action };
    }
  } catch (err) {
    console.error('[relation-manager] 未知错误:', err.message);
    return { ok: false, error: '师徒操作失败，请稍后重试' };
  }
};

/* ========================================================= */
/* 1. createInvite：师父生成 6 位数字邀请码，24h 过期         */
/* ========================================================= */
async function createInvite(event, OPENID) {
  var mentorId = event.mentorId || OPENID;
  if (mentorId !== OPENID) return { ok: false, error: '无权限' };
  var code = String(Math.floor(100000 + Math.random() * 900000));
  var now = Date.now();
  await db.collection('mentor_invites').add({
    data: {
      code: code,
      mentorId: mentorId,
      expiresAt: now + 24 * 60 * 60 * 1000,
      createdAt: now
    }
  });
  return { ok: true, code: code };
}

/* ========================================================= */
/* 2. acceptInvite：徒弟输码建立师徒关系（幂等 + 过期校验）   */
/* ========================================================= */
async function acceptInvite(event, OPENID) {
  var discipleId = event.discipleId || OPENID;
  var code = (event.code || '').trim();
  if (discipleId !== OPENID) return { ok: false, error: '无权限' };
  if (!code) return { ok: false, error: '请输入邀请码' };

  var now = Date.now();
  // 【阻塞点3】必须加 _.gt(now) 过期判定，禁止只按 code 查
  var invRes = await db.collection('mentor_invites')
    .where({ code: code, expiresAt: _.gt(now) })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  if (!invRes.data || !invRes.data.length) return { ok: false, error: '邀请码无效或已过期' };
  var invite = invRes.data[0];
  var mentorId = invite.mentorId;
  if (mentorId === discipleId) return { ok: false, error: '不能收自己为徒' };

  var relationId = mentorId + '_' + discipleId;
  // 幂等：先查是否已绑定
  var dup = await db.collection('mentor_relations').where({ relationId: relationId }).get();
  if (dup.data && dup.data.length) {
    // 存在就直接返回 alreadyBound，但仍尝试删邀请码（尽力而为）
    try { await db.collection('mentor_invites').doc(invite._id).remove(); } catch(e) {}
    return { ok: true, alreadyBound: true, mentorId: mentorId };
  }

  var wrote = false;
  try {
    await db.collection('mentor_relations').add({
      data: {
        relationId: relationId,
        mentorId: mentorId,
        discipleId: discipleId,
        status: 'active',
        createdAt: now
      }
    });
    wrote = true;
  } catch(e) {
    // 唯一键冲突兜底：再查一次 relationId，仍然不存在才是真失败
    var recheck = await db.collection('mentor_relations').where({ relationId: relationId }).get();
    if (recheck.data && recheck.data.length) {
      wrote = true;
    } else {
      return { ok: false, error: '建立关系失败，请重试' };
    }
  }

  if (wrote) {
    // 【铁律】删邀请码放最后（写失败不能删，徒弟可重试）
    try { await db.collection('mentor_invites').doc(invite._id).remove(); } catch(e) {}
  }
  return { ok: true, mentorId: mentorId, alreadyBound: false };
}

/* ========================================================= */
/* 3. getDisciples：师父查徒弟列表（联表 users 头像昵称修为） */
/* ========================================================= */
async function getDisciples(event, OPENID) {
  var mentorId = event.mentorId || OPENID;
  if (mentorId !== OPENID) return { ok: false, error: '无权限' };
  var relRes = await db.collection('mentor_relations')
    .where({ mentorId: mentorId, status: 'active' })
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  var rels = relRes.data || [];
  var disciples = [];
  for (var i = 0; i < rels.length; i++) {
    var discipleId = rels[i].discipleId;
    var user = null;
    try {
      var uRes = await db.collection('users').where({ userId: discipleId }).limit(1).get();
      user = uRes.data && uRes.data[0];
    } catch(e) { user = null; }
    disciples.push({
      discipleId: discipleId,
      nickName: (user && (user.nickName || user.nickname)) || '无名修士',
      avatarUrl: (user && user.avatarUrl) || '/assets/images/avatars/av_default.png',
      totalCultivation: Number((user && user.totalCultivation) || 0)
    });
  }
  return { ok: true, disciples: disciples };
}

/* ========================================================= */
/* 4. getMentor：徒弟查师父信息                               */
/* ========================================================= */
async function getMentor(event, OPENID) {
  var discipleId = event.discipleId || OPENID;
  if (discipleId !== OPENID) return { ok: false, error: '无权限' };
  var relRes = await db.collection('mentor_relations')
    .where({ discipleId: discipleId, status: 'active' })
    .limit(1)
    .get();
  var rel = relRes.data && relRes.data[0];
  if (!rel) return { ok: true, mentor: null };
  var mentor = null;
  try {
    var uRes = await db.collection('users').where({ userId: rel.mentorId }).limit(1).get();
    var user = uRes.data && uRes.data[0];
    if (user) {
      mentor = {
        mentorId: rel.mentorId,
        nickName: (user.nickName || user.nickname) || '无名修士',
        avatarUrl: user.avatarUrl || '/assets/images/avatars/av_default.png',
        totalCultivation: Number(user.totalCultivation || 0)
      };
    } else {
      mentor = { mentorId: rel.mentorId, nickName: '无名修士', avatarUrl: '/assets/images/avatars/av_default.png', totalCultivation: 0 };
    }
  } catch(e) {
    mentor = { mentorId: rel.mentorId, nickName: '无名修士', avatarUrl: '/assets/images/avatars/av_default.png', totalCultivation: 0 };
  }
  return { ok: true, mentor: mentor };
}

/* ========================================================= */
/* 5. getMentorTemplates：查师父已公开模板列表                */
/* ========================================================= */
async function getMentorTemplates(event, OPENID) {
  var mentorId = event.mentorId;
  if (!mentorId) return { ok: false, error: '缺少 mentorId' };
  // 【阻塞点2】public_templates 写 isPublic:true（template-manager L280+ 多处写入确认），查询用 isPublic 过滤
  var res = await db.collection('public_templates')
    .where({ creatorId: mentorId, isPublic: true, status: 'published' })
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  var list = (res.data || []).map(function(t) {
    return {
      id: t.id,
      name: t.name || '',
      cover: t.cover || '道',
      dailyCap: t.dailyCap || 0,
      category: t.category || '',
      likeCount: t.likeCount || 0,
      updatedAt: t.updatedAt || 0
    };
  });
  return { ok: true, templates: list };
}

/* ========================================================= */
/* 6. unbind：解除师徒关系                                    */
/* ========================================================= */
async function unbindRelation(event, OPENID) {
  var relationId = event.relationId;
  if (!relationId) return { ok: false, error: '缺少 relationId' };
  var chk = await db.collection('mentor_relations').where({ relationId: relationId }).limit(1).get();
  var rel = chk.data && chk.data[0];
  if (!rel) return { ok: false, error: '关系不存在' };
  if (rel.mentorId !== OPENID && rel.discipleId !== OPENID) return { ok: false, error: '无权限' };
  await db.collection('mentor_relations').where({ relationId: relationId }).remove();
  return { ok: true };
}

/* ========================================================= */
/* 7. bindDaoist：结为道友（双向，A-B 排序后同一条 relationId）*/
/* ========================================================= */
async function bindDaoist(event, OPENID) {
  var peerId = event.peerId;
  if (!peerId) return { ok: false, error: '缺少 peerId' };
  // 【阻塞点1】禁止与自己结为道友
  if (peerId === OPENID) return { ok: false, error: '不能与自己结为道友' };
  var arr = [OPENID, peerId].sort();
  var relationId = arr[0] + '_' + arr[1];
  var userA = arr[0];
  var userB = arr[1];
  var dup = await db.collection('daoist_relations').where({ relationId: relationId }).get();
  if (dup.data && dup.data.length) {
    // 已存在，幂等返回（即使被 status 非 active，也激活）
    var exist = dup.data[0];
    if (exist.status !== 'active') {
      try { await db.collection('daoist_relations').doc(exist._id).update({ data: { status: 'active' } }); } catch(e) {}
    }
    return { ok: true, alreadyBound: true, relationId: relationId };
  }
  var now = Date.now();
  try {
    await db.collection('daoist_relations').add({
      data: {
        relationId: relationId,
        userA: userA,
        userB: userB,
        status: 'active',
        createdAt: now
      }
    });
  } catch(e) {
    // 唯一键冲突兜底：再查一次
    var re = await db.collection('daoist_relations').where({ relationId: relationId }).get();
    if (!(re.data && re.data.length)) return { ok: false, error: '结为道友失败，请重试' };
  }
  return { ok: true, alreadyBound: false, relationId: relationId };
}

/* ========================================================= */
/* 8. unbindDaoist：解除道友关系                               */
/* ========================================================= */
async function unbindDaoist(event, OPENID) {
  var relationId = event.relationId;
  if (!relationId) return { ok: false, error: '缺少 relationId' };
  var chk = await db.collection('daoist_relations').where({ relationId: relationId }).limit(1).get();
  var rel = chk.data && chk.data[0];
  if (!rel) return { ok: false, error: '关系不存在' };
  if (rel.userA !== OPENID && rel.userB !== OPENID) return { ok: false, error: '无权限' };
  await db.collection('daoist_relations').where({ relationId: relationId }).remove();
  return { ok: true };
}

/* ========================================================= */
/* 9. getDaoists：查我的道友列表（过滤自己）                  */
/* ========================================================= */
async function getDaoists(event, OPENID) {
  // 查 userA=我 或 userB=我 的所有记录
  var relA = await db.collection('daoist_relations')
    .where({ userA: OPENID, status: 'active' })
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  var relB = await db.collection('daoist_relations')
    .where({ userB: OPENID, status: 'active' })
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  var rels = (relA.data || []).concat(relB.data || []);
  // 【阻塞点1】过滤 peerId !== 自己
  var peerIds = [];
  var peerMap = {}; // peerId -> relationId
  for (var i = 0; i < rels.length; i++) {
    var r = rels[i];
    var peer = (r.userA !== OPENID) ? r.userA : r.userB;
    if (peer !== OPENID && !peerMap[peer]) {
      peerMap[peer] = r.relationId;
      peerIds.push(peer);
    }
  }
  var daoists = [];
  for (var j = 0; j < peerIds.length; j++) {
    var pid = peerIds[j];
    var info = null;
    try {
      var u = await db.collection('users').where({ userId: pid }).limit(1).get();
      info = u.data && u.data[0];
    } catch(e) { info = null; }
    daoists.push({
      userId: pid,
      nickName: (info && (info.nickName || info.nickname)) || '无名修士',
      avatarUrl: (info && info.avatarUrl) || '/assets/images/avatars/av_default.png',
      totalCultivation: Number((info && info.totalCultivation) || 0),
      relationId: peerMap[pid]
    });
  }
  return { ok: true, daoists: daoists };
}

/* ========================================================= */
/* 10. getDaoistTemplates：查我参与的共创模板列表             */
/* ========================================================= */
async function getDaoistTemplates(event, OPENID) {
  var tpls = await db.collection('public_templates')
    .where({ collaborators: _.elemMatch(_.eq(OPENID)), status: 'published' })
    .orderBy('lastEditAt', 'desc')
    .limit(200)
    .field({ id: true, name: true, cover: true, version: true, lastEditorId: true, lastEditAt: true, creatorId: true, collaborators: true, updatedAt: true })
    .get();
  var list = (tpls.data || []).map(function(t) {
    return {
      id: t.id,
      name: t.name || '',
      cover: t.cover || '道',
      version: Number(t.version || 0),
      lastEditorId: t.lastEditorId || '',
      lastEditAt: Number(t.lastEditAt || 0),
      creatorId: t.creatorId || '',
      collaborators: t.collaborators || []
    };
  });
  return { ok: true, templates: list };
}
