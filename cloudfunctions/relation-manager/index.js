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
