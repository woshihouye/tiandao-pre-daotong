// 模板广场云函数 — 统一入口（v2.1 完整版）
// 集合：public_templates / template_likes / template_favorites / template_comments / user_follows
var cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
var db = cloud.database();
var _ = db.command;

// ==================== 辅助函数 ====================

/** 获取当前用户对某模板的点赞/收藏状态 */
async function getUserInteractions(userId, templateId) {
  var likeRes = await db.collection('template_likes')
    .where({ userId: userId, templateId: templateId }).get();
  var favRes = await db.collection('template_favorites')
    .where({ userId: userId, templateId: templateId }).get();
  return {
    isLiked: likeRes.data && likeRes.data.length > 0,
    isFavorited: favRes.data && favRes.data.length > 0
  };
}

/** 更新模板热度分：likeCount*2 + favCount*3 + importCount*5 + commentCount*2 */
async function updateHotScore(templateId) {
  var t = await db.collection('public_templates').doc(templateId).get();
  var s = t.data || {};
  var score = (s.likeCount || 0) * 2 + (s.favCount || 0) * 3
            + (s.importCount || 0) * 5 + (s.commentCount || 0) * 2;
  await db.collection('public_templates').doc(templateId).update({
    data: { hotScore: score }
  });
}

/** 检查某用户是否在被查询者的黑名单中 */
async function isBlocked(templateOwnerId, visitorUserId) {
  if (!visitorUserId || !templateOwnerId) return false;
  var tpl = await db.collection('public_templates')
    .where({ creatorId: templateOwnerId }).limit(1).get();
  if (!tpl.data || tpl.data.length === 0) return false;
  var blockList = tpl.data[0].blacklist || [];
  return blockList.indexOf(visitorUserId) >= 0;
}

/** 检查模板对某用户的可见性 */
function checkVisibility(template, userId) {
  var visibility = template.visibility || 'public';
  if (visibility === 'public') return true;
  if (!userId) return false;
  if (visibility === 'self' || visibility === 'private') {
    return template.creatorId === userId;
  }
  if (visibility === 'fans') {
    // 需要额外查关注关系——这里先放行，调用方自行过滤
    return true;
  }
  if (visibility === 'whitelist') {
    var wl = template.whitelist || [];
    return wl.indexOf(userId) >= 0;
  }
  return false;
}

/** 检查评论权限 */
function checkCommentPerm(template, userId) {
  var perm = template.commentPerm || 'all';
  if (perm === 'all') return true;
  if (!userId) return false;
  if (perm === 'fans') return true; // 调用方自行过滤
  if (perm === 'none' || perm === 'closed') return false;
  return true;
}

/** 批量获取用户关注状态 */
async function batchCheckFollow(userId, targetIds) {
  if (!userId || !targetIds || targetIds.length === 0) {
    var empty = {};
    (targetIds || []).forEach(function(id) { empty[id] = false; });
    return empty;
  }
  var uniqueIds = [];
  var seen = {};
  targetIds.forEach(function(id) {
    if (!seen[id]) { seen[id] = true; uniqueIds.push(id); }
  });
  var res = await db.collection('user_follows')
    .where({ followerId: userId, followingId: _.in(uniqueIds) }).get();
  var follows = {};
  uniqueIds.forEach(function(id) { follows[id] = false; });
  (res.data || []).forEach(function(r) { follows[r.followingId] = true; });
  return follows;
}

// ==================== 主入口 ====================
exports.main = async function (event, context) {
  var action = event.action;

  try {
    switch (action) {

      // --- 模板广场 ---
      case 'getTemplates':       return await getTemplates(event);
      case 'getTemplateDetail':  return await getTemplateDetail(event);
      case 'initOfficialTemplates': return await initOfficialTemplates();

      // --- 互动 ---
      case 'likeTemplate':       return await likeTemplate(event);
      case 'favoriteTemplate':   return await favoriteTemplate(event);
      case 'commentTemplate':    return await commentTemplate(event);
      case 'addComment':         return await addCommentEvent(event);
      case 'getComments':        return await getComments(event);
      case 'deleteComment':      return await deleteComment(event);
      case 'importTemplate':     return await importTemplate(event);

      // --- 发布/管理 ---
      case 'publishTemplate':    return await publishTemplate(event);
      case 'unpublishTemplate':  return await unpublishTemplate(event);
      case 'deleteTemplate':     return await deleteTemplate(event);
      case 'getMyPublished':     return await getMyPublished(event);
      case 'getCreatorStats':    return await getCreatorStats(event);
      case 'getFavorites':       return await getFavorites(event);

      // --- 关注 ---
      case 'toggleFollow':       return await toggleFollow(event);
      case 'checkFollow':        return await checkFollow(event);
      case 'getFollowers':       return await getFollowers(event);
      case 'getFollowing':       return await getFollowing(event);

      // --- 黑名单 ---
      case 'addToBlacklist':     return await addToBlacklist(event);
      case 'removeFromBlacklist':return await removeFromBlacklist(event);
      case 'addToWhitelist':     return await addToWhitelist(event);
      case 'removeFromWhitelist':return await removeFromWhitelist(event);

      default:
        return { ok: false, error: '未知的 action: ' + action };
    }
  } catch (err) {
    return { ok: false, error: err.message || '服务器内部错误' };
  }
};

// ==================== 模板广场 ====================

async function getTemplates(event) {
  var type = event.type || 'all';
  var category = event.category || '';     // 'preset' | 'career' | 'learning' | 'fitness' | ''
  var subcategory = event.subcategory || ''; // 子分类
  var sortBy = event.sortBy || 'hot';
  var keyword = event.keyword || '';
  var page = parseInt(event.page) || 1;
  var pageSize = parseInt(event.pageSize) || 20;
  var userId = event.userId || '';

  var where = {};

  // type 筛选
  if (type === 'official') {
    where.isOfficial = true;
    where.isPublic = true;
  } else if (type === 'user') {
    where.isOfficial = _.neq(true);
    where.isPublic = true;
  } else {
    where.isPublic = true;
  }

  // category 筛选
  if (category) where.category = category;

  // 子分类筛选（industry 或 subcategory）
  if (subcategory) {
    where._ = _.or([
      { industry: subcategory },
      { subcategory: subcategory }
    ]);
  }

  // keyword 模糊搜索
  if (keyword) {
    where._ = _.or([
      { name: db.RegExp({ regexp: keyword, options: 'i' }) },
      { description: db.RegExp({ regexp: keyword, options: 'i' }) },
      { tags: db.RegExp({ regexp: keyword, options: 'i' }) }
    ]);
    // 合并原有 where 条件
    if (where.isPublic !== undefined) {
      var base = { isPublic: where.isPublic, isOfficial: where.isOfficial, category: where.category };
      // 清理 undefined
      Object.keys(base).forEach(function(k) { if (base[k] === undefined) delete base[k]; });
      base._ = where._;
      where = base;
    }
  }

  var countRes = await db.collection('public_templates').where(where).count();
  var total = countRes.total;

  var orderField = 'hotScore';
  var orderDir = 'desc';
  if (sortBy === 'new') { orderField = 'createdAt'; orderDir = 'desc'; }
  else if (sortBy === 'imports') { orderField = 'importCount'; orderDir = 'desc'; }

  var templatesRes = await db.collection('public_templates')
    .where(where)
    .orderBy(orderField, orderDir)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  // 过滤可见性（非公开模板对非创建者不可见）
  var filtered = templatesRes.data.filter(function(t) {
    return checkVisibility(t, userId);
  });

  var hasMore = (page * pageSize) < total;

  return {
    ok: true, templates: filtered,
    total: total, hasMore: hasMore
  };
}

async function getTemplateDetail(event) {
  var templateId = event.templateId;
  var userId = event.userId || '';
  if (!templateId) return { ok: false, error: '缺少 templateId 参数' };

  var templateRes = await db.collection('public_templates').doc(templateId).get();
  if (!templateRes.data) return { ok: false, error: '模板不存在' };
  var template = templateRes.data;

  // 可见性检查
  if (!checkVisibility(template, userId)) {
    return { ok: false, error: '无权查看此模板' };
  }

  var isLiked = false, isFavorited = false;
  if (userId) {
    var interactions = await getUserInteractions(userId, templateId);
    isLiked = interactions.isLiked;
    isFavorited = interactions.isFavorited;
  }

  return {
    ok: true, template: template,
    isLiked: isLiked, isFavorited: isFavorited,
    likeCount: template.likeCount || 0,
    favCount: template.favCount || 0,
    commentCount: template.commentCount || 0,
    importCount: template.importCount || 0
  };
}

// ==================== 官方模板初始化（7套修仙小道） ====================
async function initOfficialTemplates() {
  var countRes = await db.collection('public_templates')
    .where({ isOfficial: true }).count();
  var existingCount = countRes.total;

  var now = new Date();
  var officialTemplates = [
    {
      id: 'preset_sword', name: '剑修·锐意锋芒', cover: '剑', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'body',
      goal: '锻造爆发力与精准控制', subtitle: '运动健身',
      description: '剑修之道，在于爆发与精准。以高强度间歇训练为剑气，以力量突破为剑锋，锻造无可匹敌的身体素质。',
      tags: ['剑修','炼体','爆发力'], dailyCap: 35, baseScore: 30,
      founderName: '天道宗', creatorName: '天道宗',
      realmNames: ['剑胎境','剑气境','剑罡境','剑心境'],
      slogan: '一剑破万法，千锤百炼方成锋',
      tasks: [
        { id:'sword_1', name:'剑诀·爆发冲刺', reward:10, path:'lianqi', desc:'进行15分钟HIIT或冲刺训练' },
        { id:'sword_2', name:'剑势·负重突破', reward:8, path:'lianti', desc:'完成一组极限重量训练' },
        { id:'sword_3', name:'剑意·精准控制', reward:6, path:'lianti', desc:'完成10分钟核心稳定性训练' },
        { id:'sword_4', name:'剑息·调息归元', reward:4, path:'yangqi', desc:'训练后进行5分钟深呼吸拉伸' },
        { id:'sword_5', name:'剑心·今日斩获', reward:3, path:'xiuxin', desc:'记录今日训练的突破与心得' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_zen', name: '禅修·明心见性', cover: '禅', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'traditional',
      goal: '培养静定功夫与内在觉察', subtitle: '冥想静心',
      description: '禅修之道贵在持之以恒的静定功夫。每日冥想、正念行走、呼吸吐纳，以静谧之力洗涤心尘。',
      tags: ['禅修','冥想','内观'], dailyCap: 25, baseScore: 22,
      founderName: '天道宗', creatorName: '天道宗',
      realmNames: ['入定境','观照境','空明境','无我境'],
      slogan: '静中观照万物，定里照见本心',
      tasks: [
        { id:'zen_1', name:'禅定·正念冥想', reward:8, path:'yangqi', desc:'完成15分钟正念冥想' },
        { id:'zen_2', name:'禅步·经行观照', reward:5, path:'lianqi', desc:'进行20分钟正念步行' },
        { id:'zen_3', name:'禅息·吐纳归真', reward:5, path:'yangqi', desc:'练习5分钟腹式呼吸法' },
        { id:'zen_4', name:'禅观·三事觉察', reward:4, path:'xiuxin', desc:'记录今日三件值得感恩的事' },
        { id:'zen_5', name:'禅悦·不嗔不怒', reward:3, path:'richang', desc:'今日不发脾气、不抱怨' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_shadow', name: '影修·暗夜潜行', cover: '影', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'wuxia',
      goal: '建立规律作息与夜间自律', subtitle: '夜间自律',
      description: '影修者以黑夜为道场，专治熬夜拖延之症。将夜晚从消耗转为滋养。',
      tags: ['影修','夜行','自律'], dailyCap: 30, baseScore: 25,
      founderName: '天道宗', creatorName: '天道宗',
      realmNames: ['夜行境','影遁境','月华境','无极境'],
      slogan: '夜幕非终点，正是修行时',
      tasks: [
        { id:'shadow_1', name:'影遁·酉时收功', reward:8, path:'richang', desc:'21:00前停止使用手机/电脑' },
        { id:'shadow_2', name:'影息·子时入定', reward:8, path:'richang', desc:'23:00前上床就寝' },
        { id:'shadow_3', name:'影醒·卯时破晓', reward:6, path:'richang', desc:'次日6:30前起床打卡' },
        { id:'shadow_4', name:'影诀·夜读养神', reward:5, path:'xiuxin', desc:'睡前阅读纸质书15分钟' },
        { id:'shadow_5', name:'影录·一夜清修', reward:3, path:'richang', desc:'整夜未碰手机（次日验证）' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_alchemy', name: '丹修·炼精化气', cover: '丹', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'beauty',
      goal: '建立健康饮食与营养习惯', subtitle: '饮食营养',
      description: '丹修之道，将日常饮食视为炼丹修行。每餐搭配即炼丹配方，营养均衡即是丹成之兆。',
      tags: ['丹修','饮食','营养'], dailyCap: 28, baseScore: 24,
      founderName: '天道宗', creatorName: '天道宗',
      realmNames: ['识药境','炼药境','凝丹境','化神境'],
      slogan: '以身为炉鼎，化食为灵丹',
      tasks: [
        { id:'alchemy_1', name:'丹方·三餐均衡', reward:8, path:'diet', desc:'今日三餐均含蛋白质+蔬菜' },
        { id:'alchemy_2', name:'丹火·戒断糖毒', reward:6, path:'diet', desc:'今日不喝含糖饮料' },
        { id:'alchemy_3', name:'丹材·饮水化气', reward:5, path:'richang', desc:'今日饮水≥2000ml' },
        { id:'alchemy_4', name:'丹录·食修手札', reward:5, path:'diet', desc:'拍照记录每一餐并写下一句评价' },
        { id:'alchemy_5', name:'丹悟·食而知味', reward:4, path:'xiuxin', desc:'正念进食一餐，不刷手机不快吃' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_beast', name: '兽修·洪荒炼体', cover: '兽', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'body',
      goal: '追求体能的全面开发', subtitle: '综合体能',
      description: '兽修之道，追求体能的极致开发。力量、耐力、柔韧、爆发四维并进，唤醒体内原始力量。',
      tags: ['兽修','综合','体能'], dailyCap: 40, baseScore: 35,
      founderName: '天道宗', creatorName: '天道宗',
      realmNames: ['觉醒境','狂暴境','兽王境','洪荒境'],
      slogan: '唤醒沉睡的洪荒之力',
      tasks: [
        { id:'beast_1', name:'兽力·洪荒重压', reward:10, path:'lianti', desc:'完成一组大重量复合动作训练' },
        { id:'beast_2', name:'兽速·追风逐日', reward:10, path:'lianqi', desc:'完成20分钟跑步或骑行' },
        { id:'beast_3', name:'兽韧·钢筋铁骨', reward:8, path:'yangqi', desc:'完成10分钟全身拉伸训练' },
        { id:'beast_4', name:'兽息·吐纳归墟', reward:7, path:'yangqi', desc:'完成5分钟深呼吸练习' },
        { id:'beast_5', name:'兽志·今日猎获', reward:5, path:'xiuxin', desc:'简单记录今日三项训练数据' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_dream', name: '梦修·大梦春秋', cover: '梦', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'traditional',
      goal: '提升睡眠质量与恢复效率', subtitle: '睡眠管理',
      description: '梦修之道，以睡眠为修行道场。将睡眠从被动休息转为主动修炼。',
      tags: ['梦修','睡眠','恢复'], dailyCap: 22, baseScore: 20,
      founderName: '天道宗', creatorName: '天道宗',
      realmNames: ['浅梦境','深眠境','清明境','梦醒境'],
      slogan: '大梦谁先觉，平生我自知',
      tasks: [
        { id:'dream_1', name:'梦引·睡前一炷香', reward:6, path:'richang', desc:'睡前30分钟放下所有屏幕' },
        { id:'dream_2', name:'梦栖·寝宫布置', reward:5, path:'richang', desc:'整理卧室，营造幽暗安静环境' },
        { id:'dream_3', name:'梦记·醒后书写', reward:5, path:'xiuxin', desc:'起床后记录昨晚睡眠时长与质量' },
        { id:'dream_4', name:'梦憩·午时小歇', reward:3, path:'richang', desc:'午后进行15-20分钟午休' },
        { id:'dream_5', name:'梦戒·拒斥夜煞', reward:3, path:'richang', desc:'今晚不摄入咖啡因/酒精' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_tide', name: '潮修·驭浪而行', cover: '潮', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'worldly',
      goal: '建立弹性的周期化任务节奏', subtitle: '周期管理',
      description: '潮修之道，讲究顺势而为不苛求每日完美。高潮期全力冲刺，低潮期温和维持，接受生命的自然起伏。',
      tags: ['潮修','周期','节奏'], dailyCap: 32, baseScore: 28,
      founderName: '天道宗', creatorName: '天道宗',
      realmNames: ['观潮境','踏浪境','驭潮境','化海境'],
      slogan: '顺势而修，潮起潮落皆修行',
      tasks: [
        { id:'tide_1', name:'潮头·今日三要', reward:8, path:'xiuxin', desc:'列出今日最重要的三件事并完成其一' },
        { id:'tide_2', name:'潮涌·专注一炷香', reward:7, path:'xiuxin', desc:'进行一个25分钟的番茄专注时段' },
        { id:'tide_3', name:'潮息·一刻清闲', reward:6, path:'yangqi', desc:'刻意休息15分钟，不看不做不思考' },
        { id:'tide_4', name:'潮笔记·一日回顾', reward:6, path:'xiuxin', desc:'睡前用3句话总结今天的收获' },
        { id:'tide_5', name:'潮平·不追完美', reward:5, path:'richang', desc:'今日对一件不完美的事说"够了"' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    // >>> v3: 行业成长类小道模板（6条）
    {
      id: 'preset_code', name: '码修·代码修仙', cover: '码', camp: 'side', category: 'career',
      themeClass: 'theme-light-fixed', cultivationSystem: 'worldly',
      goal: '修炼编程技艺，攀登技术巅峰', subtitle: '互联网/程序员',
      description: '码修之道，以键盘为剑、以代码为诀。从需求评审到架构设计，从Bug修复到性能优化。',
      tags: ['码修','互联网','技术成长'], dailyCap: 45, baseScore: 38,
      founderName: '天机阁', creatorName: '天机阁', industry: '互联网',
      realmNames: ['初级码农','高级码农','技术专家','架构宗师'],
      realmDescs: ['掌握基础技术栈，独立完成常规开发任务','攻克复杂技术难题，主导模块级设计','引领技术方向，制定团队技术标准','融会贯通技术体系，体系级架构设计'],
      slogan: '键盘为剑破万行，代码成诀定乾坤',
      tasks: [
        { id:'code_1', name:'日修·精进核心', reward:10, path:'xiuxin', desc:'今日完成一项有技术深度的代码产出' },
        { id:'code_2', name:'参悟·研读源码', reward:8, path:'xiuxin', desc:'阅读30分钟开源项目源码或技术文档' },
        { id:'code_3', name:'炼丹·学习新知', reward:8, path:'xiuxin', desc:'学习一项新技术/框架/工具并做笔记' },
        { id:'code_4', name:'渡劫·解决难题', reward:7, path:'xiuxin', desc:'解决一个卡住已久的Bug或技术难题' },
        { id:'code_5', name:'传道·沉淀输出', reward:5, path:'xiuxin', desc:'写一段技术笔记/博客分享今日所得' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_finance', name: '财修·聚财化气', cover: '财', camp: 'side', category: 'career',
      themeClass: 'theme-light-fixed', cultivationSystem: 'worldly',
      goal: '修炼财务技艺，通透经济脉络', subtitle: '财会/金融',
      description: '财修之道，以数据为炉、以凭证为丹。从账务核算到财报分析，从税务筹划到投资研判。',
      tags: ['财修','财会','金融'], dailyCap: 45, baseScore: 38,
      founderName: '天机阁', creatorName: '天机阁', industry: '财会',
      realmNames: ['见习会计','主办会计','财务经理','CFO尊者'],
      realmDescs: ['掌握基础核算与报表编制','精通全盘账务与税务','统筹财务管理体系','战略级财务决策'],
      slogan: '聚财为气通四海，算尽天机我为尊',
      tasks: [
        { id:'fin_1', name:'算诀·精核收支', reward:10, path:'xiuxin', desc:'完成当日核心财务核算/分析任务' },
        { id:'fin_2', name:'法诀·研读政策', reward:8, path:'xiuxin', desc:'研读一条最新的财税/金融政策法规' },
        { id:'fin_3', name:'丹诀·考证修炼', reward:8, path:'xiuxin', desc:'投入30分钟备考CPA/CFA等专业证书' },
        { id:'fin_4', name:'机诀·数据洞察', reward:7, path:'xiuxin', desc:'发现一组关键财务数据变动并做归因分析' },
        { id:'fin_5', name:'道诀·研报精读', reward:5, path:'xiuxin', desc:'精读一篇行业研究报告或同行财报' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_design', name: '画修·妙笔生花', cover: '画', camp: 'side', category: 'career',
      themeClass: 'theme-light-fixed', cultivationSystem: 'worldly',
      goal: '修炼设计之道，形神兼备方为妙品', subtitle: '设计/创意',
      description: '画修之道，以视觉为道、以美感为法。从UI界面到品牌视觉，从交互体验到创意提案。',
      tags: ['画修','设计','创意'], dailyCap: 45, baseScore: 38,
      founderName: '天机阁', creatorName: '天机阁', industry: '设计',
      realmNames: ['见习画师','资深画师','设计主管','创世灵师'],
      realmDescs: ['独立完成常规设计稿','主导复杂视觉方案','制定团队设计标准','定义品牌视觉语言'],
      slogan: '一笔开天地，万象入画来',
      tasks: [
        { id:'des_1', name:'造物·核心产出', reward:10, path:'xiuxin', desc:'完成一个核心设计稿（界面/海报/视觉方案）' },
        { id:'des_2', name:'观想·审美积累', reward:8, path:'xiuxin', desc:'浏览并整理10个优秀设计案例/灵感素材' },
        { id:'des_3', name:'摹刻·技法精研', reward:8, path:'xiuxin', desc:'学习一个新设计技巧/软件功能并实操练习' },
        { id:'des_4', name:'问道·接受反馈', reward:7, path:'xiuxin', desc:'主动征求并认真记录一条设计反馈' },
        { id:'des_5', name:'传画·作品整理', reward:5, path:'xiuxin', desc:'整理一份作品集或发布一篇设计心得' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_sales', name: '商修·纵横捭阖', cover: '商', camp: 'side', category: 'career',
      themeClass: 'theme-light-fixed', cultivationSystem: 'worldly',
      goal: '修炼商务之法，以诚为本以术为用', subtitle: '销售/市场',
      description: '商修之道，以人脉为网、以成单为证。从客户开发到谈判成交，从市场洞察到品牌推广。',
      tags: ['商修','销售','市场'], dailyCap: 45, baseScore: 38,
      founderName: '天机阁', creatorName: '天机阁', industry: '销售',
      realmNames: ['见习商人','金牌商贾','商务舵主','纵横宗主'],
      realmDescs: ['建立基础客户关系','开拓核心行业客户','主导复杂商务谈判','定义市场战略方向'],
      slogan: '纵横商海卷千浪，诚信立身道自长',
      tasks: [
        { id:'sal_1', name:'拓脉·有效触达', reward:10, path:'xiuxin', desc:'发起/跟进5个有效客户沟通并做记录' },
        { id:'sal_2', name:'观市·竞品洞察', reward:8, path:'xiuxin', desc:'花15分钟分析一位竞品的策略与打法' },
        { id:'sal_3', name:'磨刃·话术精修', reward:8, path:'xiuxin', desc:'打磨一段产品介绍话术并模拟演练' },
        { id:'sal_4', name:'结缘·关系维护', reward:7, path:'xiuxin', desc:'主动问候3位老客户/合作方，维护关系' },
        { id:'sal_5', name:'归墟·复盘得失', reward:5, path:'xiuxin', desc:'用三句话复盘今日最成功/最遗憾的一次沟通' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_edu', name: '师修·传道授业', cover: '师', camp: 'side', category: 'career',
      themeClass: 'theme-light-fixed', cultivationSystem: 'worldly',
      goal: '修炼师者之道，点亮他人即是自证', subtitle: '教育/培训',
      description: '师修之道，以讲台为道场、以学子为道友。从备课授课到教学创新，从考试分析到生涯指导。',
      tags: ['师修','教育','培训'], dailyCap: 45, baseScore: 38,
      founderName: '天机阁', creatorName: '天机阁', industry: '教育',
      realmNames: ['助教修士','主讲修士','学科长老','教化真君'],
      realmDescs: ['独立完成备课授课','形成独特教学风格','引领课程体系设计','定义教育理念与方法论'],
      slogan: '三尺讲台连天地，一颗道心育万千',
      tasks: [
        { id:'edu_1', name:'传道·精心授课', reward:10, path:'xiuxin', desc:'认真完成一次课程讲授/培训活动并记录反思' },
        { id:'edu_2', name:'解惑·学员答疑', reward:8, path:'xiuxin', desc:'耐心解答3位学员/学生的疑问并跟踪掌握情况' },
        { id:'edu_3', name:'备课·道法精研', reward:8, path:'xiuxin', desc:'投入30分钟备好一堂有亮点的课程' },
        { id:'edu_4', name:'观课·博采众长', reward:7, path:'xiuxin', desc:'观摩一节优秀同行的课程/讲座并记录心得' },
        { id:'edu_5', name:'著书·教案沉淀', reward:5, path:'xiuxin', desc:'整理一份可复用的教学资料/教案/习题集' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_manage', name: '治修·运筹帷幄', cover: '治', camp: 'side', category: 'career',
      themeClass: 'theme-light-fixed', cultivationSystem: 'worldly',
      goal: '修炼管理之术，驭人驭己方为大道', subtitle: '管理/运营',
      description: '治修之道，以团队为阵、以目标为旗。从项目推进到团队建设，从运营优化到战略决策。',
      tags: ['治修','管理','运营'], dailyCap: 45, baseScore: 38,
      founderName: '天机阁', creatorName: '天机阁', industry: '管理',
      realmNames: ['见习执事','资深执事','舵主统领','一宗之主'],
      realmDescs: ['独立管理小团队/单项目','高效运营中型团队','统筹多团队/多项目协同','制定组织战略方向'],
      slogan: '运筹帷幄决千里，治大国如烹小鲜',
      tasks: [
        { id:'mgr_1', name:'决断·核心决策', reward:10, path:'xiuxin', desc:'做出今日最重要的一项管理决策并记录依据' },
        { id:'mgr_2', name:'点将·团队辅导', reward:8, path:'xiuxin', desc:'与一位团队成员进行10分钟一对一辅导' },
        { id:'mgr_3', name:'布阵·流程优化', reward:8, path:'xiuxin', desc:'发现并优化一个低效的工作流程/制度' },
        { id:'mgr_4', name:'观天·全局审视', reward:7, path:'xiuxin', desc:'花15分钟从全局视角审视团队/项目进展' },
        { id:'mgr_5', name:'修心·管理阅读', reward:5, path:'xiuxin', desc:'精读一段管理学/领导力相关书籍或文章' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    // ==================== 学习精进 ====================
    {
      id: 'preset_kaoyan', name: '研修·考研冲刺', cover: '研', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'traditional',
      category: 'learning', subcategory: '考研',
      founderName: '天道学司', creatorName: '天道学司',
      realmNames: ['起航学子','精进修士','冲刺真人','金榜道尊'],
      realmDescs: ['确定目标院校与专业方向，制定完整复习计划','完成一轮系统复习，逐步攻克薄弱环节','真题演练与模拟冲刺，调整应考状态至巅峰','从容赴考，笔落惊风雨，一战功成金榜题名'],
      goal: '系统备考，一战上岸', subtitle: '从制定计划到金榜题名',
      description: '以计划为阵，以真题为剑，在考研长路上步步为营。',
      slogan: '书山有路勤为径，学海无涯苦作舟',
      tags: ['学习','考研','备考'], dailyCap: 45, baseScore: 38,
      tasks: [
        { id:'ky_1', name:'今日主攻', reward:8, path:'xiuxin', desc:'完成当日核心科目复习计划（2小时以上）' },
        { id:'ky_2', name:'真题演练', reward:5, path:'xiuxin', desc:'做一套真题或模拟题并逐题复盘' },
        { id:'ky_3', name:'错题归宗', reward:4, path:'xiuxin', desc:'整理当日错题，归纳一类题型解法' },
        { id:'ky_4', name:'回顾速览', reward:3, path:'xiuxin', desc:'睡前15分钟快速回顾今日所学知识点' },
        { id:'ky_5', name:'劳逸结合', reward:3, path:'richang', desc:'学习间隙起身活动5分钟，远眺放松' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_zhongkao', name: '考修·中高考备战', cover: '考', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'traditional',
      category: 'learning', subcategory: '中高考',
      founderName: '天道学司', creatorName: '天道学司',
      realmNames: ['蒙童启智','勤修苦练','临阵磨枪','金榜题名'],
      realmDescs: ['夯实各科基础知识，建立完整知识框架','系统刷题强化，攻克常见失分题型','全真模拟演练，调整生物钟与考场节奏','胸有成竹入考场，下笔如神斩获佳绩'],
      goal: '十年磨剑，一朝试锋', subtitle: '从基础巩固到考场决胜',
      description: '以课本为根，以模考为镜，在中高考征途上查漏补缺。',
      slogan: '三更灯火五更鸡，正是少年读书时',
      tags: ['学习','中高考','备考'], dailyCap: 45, baseScore: 38,
      tasks: [
        { id:'zk_1', name:'主科攻坚', reward:8, path:'xiuxin', desc:'专心攻克一门主科（语数英），完成当日任务' },
        { id:'zk_2', name:'综合训练', reward:5, path:'xiuxin', desc:'做一套综合卷或理综/文综专项练习' },
        { id:'zk_3', name:'错题归因', reward:4, path:'xiuxin', desc:'分析今日错题原因，在错题本上记录解法' },
        { id:'zk_4', name:'背诵巩固', reward:3, path:'xiuxin', desc:'背诵当日必背内容（单词/古诗/公式）' },
        { id:'zk_5', name:'护眼调息', reward:3, path:'richang', desc:'每45分钟远眺窗外3分钟，活动颈椎' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_research', name: '究修·科研精进', cover: '究', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'traditional',
      category: 'learning', subcategory: '科研',
      founderName: '天道学司', creatorName: '天道学司',
      realmNames: ['入门学徒','独立研究者','领域专精','学术宗师'],
      realmDescs: ['掌握基本研究方法，能独立完成文献调研与实验设计','产出高质量研究成果，具备独立发表论文能力','在细分领域形成系统性贡献，指导初级研究者','引领学科方向，开创研究范式，影响学术界与产业界'],
      goal: '格物致知，探微求真', subtitle: '从文献阅读到学术突破',
      description: '以实验为炉，以数据为鼎，在科研路上炼就真知灼见。',
      slogan: '路漫漫其修远兮，吾将上下而求索',
      tags: ['学习','科研','学术'], dailyCap: 45, baseScore: 38,
      tasks: [
        { id:'rs_1', name:'文献研读', reward:8, path:'xiuxin', desc:'精读一篇领域核心论文并做笔记摘要' },
        { id:'rs_2', name:'实验/写作', reward:5, path:'xiuxin', desc:'推进实验或论文写作至少1小时' },
        { id:'rs_3', name:'数据整理', reward:4, path:'xiuxin', desc:'整理实验数据，绘制图表或做统计分析' },
        { id:'rs_4', name:'学术交流', reward:3, path:'xiuxin', desc:'与导师/同门讨论进展，或回复审稿意见' },
        { id:'rs_5', name:'科研日志', reward:3, path:'richang', desc:'记录今日研究心得与明日计划，清空大脑' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_coding', name: '程修·编程悟道', cover: '程', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'traditional',
      category: 'learning', subcategory: '编程',
      founderName: '天道学司', creatorName: '天道学司',
      realmNames: ['Hello World','代码行者','开源贡献者','技术大牛'],
      realmDescs: ['掌握一门编程语言基础语法，能独立完成小练习','熟练运用数据结构和算法，完成中等复杂度项目','贡献开源项目，具备代码审查和系统设计能力','精通多技术栈，能独立架构大型系统，技术影响力广泛'],
      goal: '从零到一，打通编程任督二脉', subtitle: '从Hello World到开源贡献',
      description: '以键盘为剑，以逻辑为道，在编程世界中从入门到精通。',
      slogan: 'Hello World 为始，Clean Code 为道',
      tags: ['学习','编程','技能'], dailyCap: 45, baseScore: 38,
      tasks: [
        { id:'cd_1', name:'编码练习', reward:8, path:'xiuxin', desc:'专心编码实践至少1小时（项目/练习/刷题）' },
        { id:'cd_2', name:'算法求索', reward:5, path:'xiuxin', desc:'学习和理解一个新算法或数据结构' },
        { id:'cd_3', name:'源码参悟', reward:4, path:'xiuxin', desc:'阅读一段开源代码或技术文档并做笔记' },
        { id:'cd_4', name:'Bug修复', reward:3, path:'xiuxin', desc:'定位并修复自己代码中的一个bug或优化一段逻辑' },
        { id:'cd_5', name:'护眼远眺', reward:3, path:'richang', desc:'每写码1小时，站立远眺窗外5分钟' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_language', name: '语修·语言贯通', cover: '语', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'traditional',
      category: 'learning', subcategory: '语言',
      founderName: '天道学司', creatorName: '天道学司',
      realmNames: ['牙牙学语','日常沟通','无障碍交流','母语水准'],
      realmDescs: ['掌握基础词汇和基本语法，能进行简单自我介绍','能独立完成日常对话，基本理解原版影视和文章','流利表达复杂观点，能用外语进行专业讨论','接近母语者水准，能听懂各种口音，写作地道自然'],
      goal: '听说读写，四维贯通', subtitle: '从牙牙学语到母语水准',
      description: '以单词为砖，以语法为梁，在语言学习路上构筑沟通之桥。',
      slogan: '一门语言一扇窗，万国之言皆可通',
      tags: ['学习','语言','外语'], dailyCap: 45, baseScore: 38,
      tasks: [
        { id:'lg_1', name:'词汇积累', reward:8, path:'xiuxin', desc:'背诵新单词30个或复习旧词50个' },
        { id:'lg_2', name:'听力磨耳', reward:5, path:'xiuxin', desc:'听一段外语播客/新闻/影视至少20分钟' },
        { id:'lg_3', name:'开口练习', reward:4, path:'xiuxin', desc:'跟读/朗读/对话练习至少10分钟' },
        { id:'lg_4', name:'阅读积累', reward:3, path:'xiuxin', desc:'阅读一篇外文文章，查生词并做摘要' },
        { id:'lg_5', name:'语言日记', reward:3, path:'richang', desc:'用所学语言写3句话记录今日生活' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    // ==================== 运动健康 ====================
    {
      id: 'preset_running', name: '跑修·千里之行', cover: '跑', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'body',
      category: 'fitness', subcategory: '跑步',
      founderName: '天道体司', creatorName: '天道体司',
      realmNames: ['初涉跑道','5K跑者','半马修士','全马尊者'],
      realmDescs: ['能连续慢跑3公里不中断，养成规律跑步习惯','轻松完成5公里，配速稳步提升','完成半程马拉松（21.1km），掌握科学补给策略','完成全程马拉松（42.2km），配速稳定心态从容'],
      goal: '步履不停，以双脚丈量世界', subtitle: '从初涉跑道到全马完赛',
      description: '以跑道为道场，以呼吸为节奏，在奔跑中淬炼肉身与意志。',
      slogan: '千里之行，始于足下；万米征途，贵在坚持',
      tags: ['运动','跑步','马拉松'], dailyCap: 48, baseScore: 40,
      tasks: [
        { id:'rn_1', name:'今日跑步', reward:8, path:'lianti', desc:'完成当日跑步计划（不少于20分钟/3公里）' },
        { id:'rn_2', name:'跑后拉伸', reward:5, path:'lianti', desc:'跑步后认真拉伸10分钟，防止伤病' },
        { id:'rn_3', name:'核心训练', reward:4, path:'lianti', desc:'做一组核心力量训练（平板支撑/卷腹等）' },
        { id:'rn_4', name:'跑姿优化', reward:3, path:'lianti', desc:'关注并记录今日跑步中一处跑姿改进点' },
        { id:'rn_5', name:'补水养足', reward:3, path:'richang', desc:'今日饮水2L以上，跑步前后充分补水' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_muscle', name: '锻修·增肌淬体', cover: '锻', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'body',
      category: 'fitness', subcategory: '增肌',
      founderName: '天道体司', creatorName: '天道体司',
      realmNames: ['初入铁馆','肌肉觉醒','形体初成','铁骨金身'],
      realmDescs: ['掌握三大项基础动作模式，建立训练习惯','肌肉力量显著增长，体脂率开始下降','肌肉线条清晰，维度明显，力量达到中级水平','身材比例协调，三大项成绩达到高级水准'],
      goal: '铁骨铮铮，肉身成圣', subtitle: '从初入铁馆到铁骨金身',
      description: '以铁为炉，以力为火，在力量训练中锻造强健体魄。',
      slogan: '千锤百炼方成钢，日复一日铸金身',
      tags: ['运动','增肌','力量'], dailyCap: 48, baseScore: 40,
      tasks: [
        { id:'mc_1', name:'今日举铁', reward:8, path:'lianti', desc:'完成当日力量训练计划（不少于40分钟）' },
        { id:'mc_2', name:'蛋白质补充', reward:5, path:'diet', desc:'训练后30分钟内补充优质蛋白质' },
        { id:'mc_3', name:'动作精进', reward:4, path:'lianti', desc:'针对一个动作做专项技术练习（深蹲/硬拉/卧推）' },
        { id:'mc_4', name:'充分休息', reward:3, path:'richang', desc:'确保训练肌群有48小时恢复，今晚睡足7小时' },
        { id:'mc_5', name:'饮食记录', reward:3, path:'diet', desc:'记录今日蛋白质和总热量摄入，确保增肌窗口' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_shaping', name: '塑修·形体再造', cover: '塑', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'body',
      category: 'fitness', subcategory: '塑形',
      founderName: '天道体司', creatorName: '天道体司',
      realmNames: ['体态初调','线条显现','比例精修','完美体魄'],
      realmDescs: ['改善圆肩驼背等不良体态，建立身体觉知','核心力量增强，腰腹线条初步显现','全身肌肉线条协调流畅，体态优雅挺拔','身材比例黄金均衡，由内而外散发健康光彩'],
      goal: '雕琢肉身，形神兼备', subtitle: '从体态初调到完美体魄',
      description: '以瑜伽为柔，以普拉提为稳，在塑形路上精雕细琢。',
      slogan: '美人在骨不在皮，好体态胜万千华服',
      tags: ['运动','塑形','瑜伽'], dailyCap: 48, baseScore: 40,
      tasks: [
        { id:'sp_1', name:'今日塑形', reward:8, path:'lianti', desc:'完成瑜伽/普拉提/体态训练不少于30分钟' },
        { id:'sp_2', name:'体态觉察', reward:5, path:'lianti', desc:'今日刻意关注并矫正坐姿/站姿各3次以上' },
        { id:'sp_3', name:'柔韧训练', reward:4, path:'lianti', desc:'做一组全身拉伸或泡沫轴放松' },
        { id:'sp_4', name:'颈椎养护', reward:3, path:'lianti', desc:'做一套颈椎放松操，缓解久坐疲劳' },
        { id:'sp_5', name:'镜前自省', reward:3, path:'richang', desc:'睡前对镜站立1分钟，感受今日体态变化' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_wellness', name: '养修·养生调息', cover: '养', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'body',
      category: 'fitness', subcategory: '养生',
      founderName: '天道体司', creatorName: '天道体司',
      realmNames: ['元气初聚','经络畅通','阴阳调和','百脉归元'],
      realmDescs: ['养成每日晨练习惯，初步感受气血运行','身体柔韧度和平衡力显著提升，睡眠质量改善','精神状态饱满，免疫力增强，亚健康症状消退','身体机能达到同龄人优异水平，身心和谐愉悦'],
      goal: '调和阴阳，颐养天年', subtitle: '从元气初聚到百脉归元',
      description: '以太极八段锦为拳，以吐纳导引为息，在养生路上调和身心。',
      slogan: '恬淡虚无，真气从之；精神内守，病安从来',
      tags: ['运动','养生','太极'], dailyCap: 48, baseScore: 40,
      tasks: [
        { id:'wl_1', name:'晨练养生', reward:8, path:'lianti', desc:'完成太极/八段锦/五禽戏至少20分钟' },
        { id:'wl_2', name:'吐纳调息', reward:5, path:'lianqi', desc:'练习腹式呼吸或冥想至少10分钟' },
        { id:'wl_3', name:'经络疏通', reward:4, path:'lianti', desc:'拍打经络或做穴位按摩至少10分钟' },
        { id:'wl_4', name:'早睡养阴', reward:3, path:'richang', desc:'晚上10:30前关灯就寝' },
        { id:'wl_5', name:'清淡饮食', reward:3, path:'diet', desc:'今日三餐少油少盐，多吃蔬菜杂粮' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    },
    {
      id: 'preset_combat', name: '战修·竞技搏击', cover: '战', camp: 'side',
      themeClass: 'theme-light-fixed', cultivationSystem: 'body',
      category: 'fitness', subcategory: '竞技',
      founderName: '天道体司', creatorName: '天道体司',
      realmNames: ['初入赛场','业余选手','专业运动员','冠军王者'],
      realmDescs: ['掌握基本格斗技术和比赛规则，完成第一场实战','技术动作娴熟，能流畅组合连招，有一定竞技成绩','技术全面，体能充沛，具备专业级竞技水平','竞技巅峰状态，技战术体系独树一帜，王者风范'],
      goal: '以武会友，实战为王', subtitle: '从初入赛场到冠军王者',
      description: '以拳为锋，以腿为刃，在竞技场上磨炼实战之魂。',
      slogan: '狭路相逢勇者胜，百战不殆王者归',
      tags: ['运动','搏击','竞技'], dailyCap: 48, baseScore: 40,
      tasks: [
        { id:'cb_1', name:'今日训练', reward:8, path:'lianti', desc:'完成技术训练或实战对抗至少45分钟' },
        { id:'cb_2', name:'专项体能', reward:5, path:'lianti', desc:'跳绳/冲刺/核心爆发一组针对性体能训练' },
        { id:'cb_3', name:'技战术复盘', reward:4, path:'lianti', desc:'回看训练视频或拆解一个技术动作细节' },
        { id:'cb_4', name:'柔韧放松', reward:3, path:'lianti', desc:'训练后充分拉伸恢复，泡沫轴放松肌肉' },
        { id:'cb_5', name:'武德自省', reward:3, path:'richang', desc:'默念：尊重对手，控制情绪，胜不骄败不馁' }
      ],
      creatorId: 'official', isOfficial: true, isPublic: true, status: 'published',
      visibility: 'public', commentPerm: 'all',
      hotScore: 0, likeCount: 0, favCount: 0, commentCount: 0, importCount: 0,
      createdAt: now, updatedAt: now
    }
  ];

  var newIds = officialTemplates.map(function(t) { return t.id; });
  var existingRes = await db.collection('public_templates')
    .where({ id: db.command.in(newIds) }).get();
  var existingIds = (existingRes.data || []).map(function(t) { return t.id; });

  var added = 0;
  for (var i = 0; i < officialTemplates.length; i++) {
    if (existingIds.indexOf(officialTemplates[i].id) === -1) {
      await db.collection('public_templates').add({ data: officialTemplates[i] });
      added++;
    }
  }

  return { ok: true, message: '官方模板同步完成', total: officialTemplates.length, added: added };
}

// ==================== 互动操作 ====================

async function likeTemplate(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  if (!templateId || !userId) return { ok: false, error: '缺少必要参数' };

  var existing = await db.collection('template_likes')
    .where({ templateId: templateId, userId: userId }).get();

  var liked = false;
  if (existing.data && existing.data.length > 0) {
    await db.collection('template_likes').doc(existing.data[0]._id).remove();
    await db.collection('public_templates').doc(templateId).update({
      data: { likeCount: _.inc(-1) }
    });
    liked = false;
  } else {
    await db.collection('template_likes').add({
      data: { templateId: templateId, userId: userId, createdAt: new Date() }
    });
    await db.collection('public_templates').doc(templateId).update({
      data: { likeCount: _.inc(1) }
    });
    liked = true;
  }

  await updateHotScore(templateId);
  var t = await db.collection('public_templates').doc(templateId).get();
  return { ok: true, liked: liked, likeCount: t.data.likeCount || 0 };
}

async function favoriteTemplate(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  if (!templateId || !userId) return { ok: false, error: '缺少必要参数' };

  var existing = await db.collection('template_favorites')
    .where({ templateId: templateId, userId: userId }).get();

  var favorited = false;
  if (existing.data && existing.data.length > 0) {
    await db.collection('template_favorites').doc(existing.data[0]._id).remove();
    await db.collection('public_templates').doc(templateId).update({
      data: { favCount: _.inc(-1) }
    });
    favorited = false;
  } else {
    await db.collection('template_favorites').add({
      data: { templateId: templateId, userId: userId, createdAt: new Date() }
    });
    await db.collection('public_templates').doc(templateId).update({
      data: { favCount: _.inc(1) }
    });
    favorited = true;
  }

  await updateHotScore(templateId);
  var t = await db.collection('public_templates').doc(templateId).get();
  return { ok: true, favorited: favorited, favCount: t.data.favCount || 0 };
}

async function commentTemplate(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  var nickName = event.nickName || '匿名修士';
  var content = (event.content || '').trim();

  if (!templateId || !userId) return { ok: false, error: '缺少必要参数' };
  if (!content || content.length < 1 || content.length > 500) {
    return { ok: false, error: '评论内容需在1-500字之间' };
  }

  // 检查模板评论权限
  var tplRes = await db.collection('public_templates').doc(templateId).get();
  if (!tplRes.data) return { ok: false, error: '模板不存在' };
  if (!checkCommentPerm(tplRes.data, userId)) {
    return { ok: false, error: '此模板已关闭评论' };
  }
  // 检查黑名单
  var blockList = tplRes.data.blacklist || [];
  if (blockList.indexOf(userId) >= 0) {
    return { ok: false, error: '您已被禁止评论此模板' };
  }

  var comment = {
    templateId: templateId, userId: userId, nickName: nickName,
    content: content, createdAt: new Date(), likeCount: 0
  };

  var addRes = await db.collection('template_comments').add({ data: comment });
  await db.collection('public_templates').doc(templateId).update({
    data: { commentCount: _.inc(1) }
  });
  await updateHotScore(templateId);

  return { ok: true, comment: Object.assign({ _id: addRes._id }, comment) };
}

async function addCommentEvent(event) {
  var userId = event.userId;
  var templateId = event.templateId;
  var content = event.content;
  if (!userId || !templateId || !content) return { ok: false, error: '缺少必要参数' };
  if (content.length > 500) return { ok: false, error: '评论内容过长' };

  var addRes = await db.collection('template_comments').add({
    data: {
      userId: userId,
      templateId: templateId,
      content: content,
      userName: event.userName || '修士',
      createdAt: new Date()
    }
  });

  // 更新评论计数
  await db.collection('public_templates').doc(templateId).update({
    data: { commentCount: _.inc(1), updatedAt: new Date() }
  });

  return { ok: true, commentId: addRes._id, message: '评论已发表' };
}

async function getComments(event) {
  var templateId = event.templateId;
  var page = parseInt(event.page) || 1;
  var pageSize = parseInt(event.pageSize) || 20;
  if (!templateId) return { ok: false, error: '缺少 templateId 参数' };

  var countRes = await db.collection('template_comments')
    .where({ templateId: templateId }).count();

  var commentsRes = await db.collection('template_comments')
    .where({ templateId: templateId })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return {
    ok: true, comments: commentsRes.data,
    total: countRes.total,
    hasMore: (page * pageSize) < countRes.total
  };
}

async function deleteComment(event) {
  var commentId = event.commentId;
  var userId = event.userId;
  if (!commentId || !userId) return { ok: false, error: '缺少必要参数' };

  var commentRes = await db.collection('template_comments').doc(commentId).get();
  if (!commentRes.data) return { ok: false, error: '评论不存在' };

  var comment = commentRes.data;
  // 评论作者或模板创建者都可以删除
  var tplRes = await db.collection('public_templates').doc(comment.templateId).get();
  var isCreator = tplRes.data && tplRes.data.creatorId === userId;
  if (comment.userId !== userId && !isCreator) {
    return { ok: false, error: '无权删除此评论' };
  }

  await db.collection('template_comments').doc(commentId).remove();
  await db.collection('public_templates').doc(comment.templateId).update({
    data: { commentCount: _.inc(-1) }
  });
  await updateHotScore(comment.templateId);

  return { ok: true };
}

async function importTemplate(event) {
  var templateId = event.templateId;
  if (!templateId) return { ok: false, error: '缺少 templateId 参数' };

  await db.collection('public_templates').doc(templateId).update({
    data: { importCount: _.inc(1) }
  });
  await updateHotScore(templateId);
  return { ok: true };
}

// ==================== 发布与模板管理 ====================

async function publishTemplate(event) {
  var template = event.template || {};
  var userId = event.userId;
  var nickName = event.nickName || '无名修士';

  if (!userId) return { ok: false, error: '缺少 userId 参数' };

  var templateId = template._id || template.templateId || template.id || '';
  var isUpdate = false;

  if (templateId) {
    try {
      var existRes = await db.collection('public_templates').doc(templateId).get();
      if (existRes.data && existRes.data.creatorId === userId) {
        isUpdate = true;
      }
    } catch (e) { /* 不存在则新增 */ }
  }

  // 构建完整的模板数据，保留修仙模板结构
  var templateData = {
    name: template.name || '',
    description: template.description || '',
    goal: template.goal || '',
    subtitle: template.subtitle || '',
    cover: template.cover || '道',
    tags: template.tags || [],
    camp: template.camp || 'side',
    cultivationSystem: template.cultivationSystem || 'traditional',
    themeClass: template.themeClass || 'theme-light-fixed',
    dailyCap: template.dailyCap || 30,
    baseScore: template.baseScore || 25,
    realmNames: template.realmNames || [],
    slogan: template.slogan || '',
    tasks: template.tasks || [],
    founderName: nickName,
    creatorId: userId,
    creatorName: nickName,
    isOfficial: false,
    isPublic: true,
    status: 'published',
    // 权限配置
    visibility: template.visibility || 'public',
    commentPerm: template.commentPerm || 'all',
    blacklist: template.blacklist || [],
    whitelist: template.whitelist || [],
    updatedAt: new Date(),
    // v4.0 增强字段
    externalLinks: template.externalLinks || [],
    longTextContent: template.longTextContent || '',
    imageUrls: template.imageUrls || [],
    creatorTitleInfo: template.creatorTitleInfo || null
  };

  if (isUpdate) {
    await db.collection('public_templates').doc(templateId).update({ data: templateData });
    return { ok: true, templateId: templateId, message: '模板已更新' };
  }

  templateData.id = 'pub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  templateData.createdAt = new Date();
  templateData.hotScore = 0;
  templateData.likeCount = 0;
  templateData.favCount = 0;
  templateData.commentCount = 0;
  templateData.importCount = 0;

  var addRes = await db.collection('public_templates').add({ data: templateData });

  // v4.0 初代创作者称号：检测用户是否首次发布原创模板
  try {
    var creatorStats = await db.collection('public_templates')
      .where({ creatorId: userId, status: 'published' })
      .field({ _id: true })
      .get()
    if (creatorStats.data && creatorStats.data.length === 1) {
      // 首次发布：为用户写入初代创作者标识
      await db.collection('users').where({ userId }).update({
        data: { creatorTitleInfo: { titleId: 'creator_gen1', titleName: '开山祖师', generation: 1, awardedAt: new Date() } }
      })
    }
  } catch (e) { /* 称号发放静默失败，不影响发布 */ }

  return { ok: true, templateId: addRes._id, message: '发布成功，道友可去广场查看了' };
}

async function unpublishTemplate(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  if (!templateId || !userId) return { ok: false, error: '缺少必要参数' };

  var tplRes = await db.collection('public_templates').doc(templateId).get();
  if (!tplRes.data) return { ok: false, error: '模板不存在' };
  if (tplRes.data.creatorId !== userId) return { ok: false, error: '无权下架他人模板' };

  await db.collection('public_templates').doc(templateId).update({
    data: { isPublic: false, status: 'unpublished', updatedAt: new Date() }
  });
  return { ok: true, message: '模板已下架' };
}

async function deleteTemplate(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  if (!templateId || !userId) return { ok: false, error: '缺少必要参数' };

  var tplRes = await db.collection('public_templates').doc(templateId).get();
  if (!tplRes.data) return { ok: false, error: '模板不存在' };
  if (tplRes.data.creatorId !== userId) return { ok: false, error: '无权删除他人模板' };

  // 清理关联数据
  await db.collection('template_likes').where({ templateId: templateId }).remove().catch(function(){});
  await db.collection('template_favorites').where({ templateId: templateId }).remove().catch(function(){});
  await db.collection('template_comments').where({ templateId: templateId }).remove().catch(function(){});
  await db.collection('public_templates').doc(templateId).remove();

  return { ok: true, message: '模板已删除' };
}

async function getMyPublished(event) {
  var userId = event.userId;
  var page = parseInt(event.page) || 1;
  var pageSize = parseInt(event.pageSize) || 20;
  if (!userId) return { ok: false, error: '缺少 userId' };

  var where = { creatorId: userId };
  var countRes = await db.collection('public_templates').where(where).count();

  var res = await db.collection('public_templates')
    .where(where)
    .orderBy('updatedAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return {
    ok: true, templates: res.data,
    total: countRes.total,
    hasMore: (page * pageSize) < countRes.total
  };
}

async function getCreatorStats(event) {
  var userId = event.userId;
  if (!userId) return { ok: false, error: '缺少 userId' };

  var pubs = await db.collection('public_templates')
    .where({ creatorId: userId }).get();
  var pubList = pubs.data || [];

  var totalViews = 0, totalLikes = 0, totalFavs = 0, totalImports = 0;
  pubList.forEach(function(t) {
    totalViews += t.viewCount || 0;
    totalLikes += t.likeCount || 0;
    totalFavs += t.favCount || 0;
    totalImports += t.importCount || 0;
  });

  return {
    ok: true,
    stats: {
      publishedCount: pubList.length,
      totalViews: totalViews,
      totalLikes: totalLikes,
      totalFavs: totalFavs,
      totalImports: totalImports
    }
  };
}

async function getFavorites(event) {
  var userId = event.userId;
  var page = parseInt(event.page) || 1;
  var pageSize = parseInt(event.pageSize) || 50;
  if (!userId) return { ok: false, error: '缺少 userId' };

  var countRes = await db.collection('template_favorites')
    .where({ userId: userId }).count();

  var favRes = await db.collection('template_favorites')
    .where({ userId: userId })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  var templateIds = (favRes.data || []).map(function(f) { return f.templateId; });

  // 批量获取模板详情
  var templates = [];
  if (templateIds.length > 0) {
    var tplRes = await db.collection('public_templates')
      .where({ _id: _.in(templateIds) }).get();
    var tplMap = {};
    (tplRes.data || []).forEach(function(t) { tplMap[t._id] = t; });
    favRes.data.forEach(function(f) {
      if (tplMap[f.templateId]) {
        templates.push(Object.assign({}, tplMap[f.templateId], { favId: f._id, favoritedAt: f.createdAt }));
      }
    });
  }

  return {
    ok: true, templates: templates,
    total: countRes.total,
    hasMore: (page * pageSize) < countRes.total
  };
}

// ==================== 关注系统 ====================

async function toggleFollow(event) {
  var userId = event.userId;
  var targetUserId = event.targetUserId;
  if (!userId || !targetUserId) return { ok: false, error: '缺少必要参数' };
  if (userId === targetUserId) return { ok: false, error: '不能关注自己' };

  var existing = await db.collection('user_follows')
    .where({ followerId: userId, followingId: targetUserId }).get();

  var following = false;
  if (existing.data && existing.data.length > 0) {
    await db.collection('user_follows').doc(existing.data[0]._id).remove();
    following = false;
  } else {
    await db.collection('user_follows').add({
      data: { followerId: userId, followingId: targetUserId, createdAt: new Date() }
    });
    following = true;
  }

  return { ok: true, following: following };
}

async function checkFollow(event) {
  var userId = event.userId;
  var targetUserId = event.targetUserId;
  if (!userId || !targetUserId) return { ok: false, error: '缺少必要参数' };

  var res = await db.collection('user_follows')
    .where({ followerId: userId, followingId: targetUserId }).get();

  return { ok: true, isFollowing: res.data && res.data.length > 0 };
}

async function getFollowers(event) {
  var userId = event.userId;  // 被关注者
  var page = parseInt(event.page) || 1;
  var pageSize = parseInt(event.pageSize) || 20;
  if (!userId) return { ok: false, error: '缺少 userId' };

  var countRes = await db.collection('user_follows')
    .where({ followingId: userId }).count();

  var res = await db.collection('user_follows')
    .where({ followingId: userId })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return {
    ok: true, followers: res.data,
    total: countRes.total,
    hasMore: (page * pageSize) < countRes.total
  };
}

async function getFollowing(event) {
  var userId = event.userId;  // 关注者
  var page = parseInt(event.page) || 1;
  var pageSize = parseInt(event.pageSize) || 20;
  if (!userId) return { ok: false, error: '缺少 userId' };

  var countRes = await db.collection('user_follows')
    .where({ followerId: userId }).count();

  var res = await db.collection('user_follows')
    .where({ followerId: userId })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return {
    ok: true, following: res.data,
    total: countRes.total,
    hasMore: (page * pageSize) < countRes.total
  };
}

// ==================== 黑白名单管理 ====================

async function addToBlacklist(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  var targetUserId = event.targetUserId;
  if (!templateId || !userId || !targetUserId) return { ok: false, error: '缺少必要参数' };

  var tplRes = await db.collection('public_templates').doc(templateId).get();
  if (!tplRes.data) return { ok: false, error: '模板不存在' };
  if (tplRes.data.creatorId !== userId) return { ok: false, error: '无权操作' };

  var blockList = tplRes.data.blacklist || [];
  if (blockList.indexOf(targetUserId) >= 0) return { ok: true, message: '已存在' };
  blockList.push(targetUserId);

  await db.collection('public_templates').doc(templateId).update({
    data: { blacklist: blockList }
  });
  return { ok: true, message: '已加入黑名单' };
}

async function removeFromBlacklist(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  var targetUserId = event.targetUserId;
  if (!templateId || !userId || !targetUserId) return { ok: false, error: '缺少必要参数' };

  var tplRes = await db.collection('public_templates').doc(templateId).get();
  if (!tplRes.data) return { ok: false, error: '模板不存在' };
  if (tplRes.data.creatorId !== userId) return { ok: false, error: '无权操作' };

  var blockList = (tplRes.data.blacklist || []).filter(function(id) { return id !== targetUserId; });
  await db.collection('public_templates').doc(templateId).update({
    data: { blacklist: blockList }
  });
  return { ok: true, message: '已移除黑名单' };
}

async function addToWhitelist(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  var targetUserId = event.targetUserId;
  if (!templateId || !userId || !targetUserId) return { ok: false, error: '缺少必要参数' };

  var tplRes = await db.collection('public_templates').doc(templateId).get();
  if (!tplRes.data) return { ok: false, error: '模板不存在' };
  if (tplRes.data.creatorId !== userId) return { ok: false, error: '无权操作' };

  var wl = tplRes.data.whitelist || [];
  if (wl.indexOf(targetUserId) >= 0) return { ok: true, message: '已存在' };
  wl.push(targetUserId);

  await db.collection('public_templates').doc(templateId).update({
    data: { whitelist: wl }
  });
  return { ok: true, message: '已加入白名单' };
}

async function removeFromWhitelist(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  var targetUserId = event.targetUserId;
  if (!templateId || !userId || !targetUserId) return { ok: false, error: '缺少必要参数' };

  var tplRes = await db.collection('public_templates').doc(templateId).get();
  if (!tplRes.data) return { ok: false, error: '模板不存在' };
  if (tplRes.data.creatorId !== userId) return { ok: false, error: '无权操作' };

  var wl = (tplRes.data.whitelist || []).filter(function(id) { return id !== targetUserId; });
  await db.collection('public_templates').doc(templateId).update({
    data: { whitelist: wl }
  });
  return { ok: true, message: '已移除白名单' };
}
