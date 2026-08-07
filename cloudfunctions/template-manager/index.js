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
  var t = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  var s = t.data[0] || {};
  var score = (s.likeCount || 0) * 2 + (s.favCount || 0) * 3
            + (s.importCount || 0) * 5 + (s.commentCount || 0) * 2;
  await db.collection('public_templates').where({ id: templateId }).update({
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
  // 安全：强制覆盖 event.userId 为真实OPENID
  var wxContext = cloud.getWXContext()
  event.userId = wxContext.OPENID

  try {
    switch (action) {

      // --- 模板广场 ---
      case 'getTemplates':       return await getTemplates(event);
      case 'getTemplateDetail':  return await getTemplateDetail(event);
      case 'initOfficialTemplates': return await initOfficialTemplates();
      case 'clearAllTemplates':   return await clearAllTemplates();

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
    console.error('[template-manager] 未知错误:', err.message)
    return { ok: false, error: '模板操作失败，请稍后重试' };
  }
};

// ==================== 模板广场 ====================

async function getTemplates(event) {
  var type = event.type || 'all';
  var category = event.category || '';     // 'preset' | 'career' | 'learning' | 'fitness' | ''
  var subcategory = event.subcategory || ''; // 子分类
  var sortBy = event.sortBy || 'hot';
  var keyword = event.keyword || '';
  var page = Math.min(Math.max(1, parseInt(event.page) || 1), 100)
  var pageSize = Math.min(Math.max(1, parseInt(event.pageSize) || 20), 50)
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

  var templateRes = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  if (!templateRes.data || !templateRes.data.length) return { ok: false, error: '模板不存在' };
  var template = templateRes.data[0];

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
      id: 'wu_chest_day',
      name: '胸肌锤炼日',
      category: 'fitness',
      subcategory: '胸肌',
      industry: '运动健康',
      cover: '胸',
      description: '推类动作为主，从杠铃卧推到底，收尾跳绳燃脂',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'barbell_bench', name: '卧推', reward: 2, path: 'lianti', desc: '上肢推力黄金动作，胸肌训练首选' },
        { id: 'dumbbell_incline_bench', name: '哑铃上斜卧推', reward: 1.5, path: 'lianti', desc: '上斜角度卧推，集中刺激上胸肌群' },
        { id: 'dumbbell_fly', name: '哑铃飞鸟', reward: 1, path: 'lianti', desc: '仰卧飞鸟夹胸，拉伸胸肌内侧' },
        { id: 'cable_chest_fly', name: '龙门架夹胸', reward: 1, path: 'lianti', desc: '龙门架绳索夹胸，精准训练胸肌内侧' },
        { id: 'tricep_pushdown', name: '绳索下压（肱三头）', reward: 0.8, path: 'lianti', desc: '龙门架绳索下压，肱三头肌最佳训练动作' },
        { id: 'push_up', name: '俯卧撑', reward: 1, path: 'lianti', desc: '经典自重推力训练，强化胸肌与三头肌' },
        { id: 'jump_rope', name: '跳绳', reward: 1, path: 'lianti', desc: '高效燃脂有氧，随时随地可练' }
      ]
    },
    {
      id: 'wu_back_day',
      name: '背部锻造日',
      category: 'fitness',
      subcategory: '背部',
      industry: '运动健康',
      cover: '背',
      description: '拉类动作拉满，引体向上开局，硬拉收尾',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'pull_up', name: '引体向上', reward: 2, path: 'lianti', desc: '上肢拉力训练，塑造背部线条' },
        { id: 'lat_pulldown', name: '高位下拉', reward: 1.5, path: 'lianti', desc: '下拉器训练背阔肌，塑造倒三角体型' },
        { id: 'barbell_row', name: '杠铃俯身划船', reward: 2, path: 'lianti', desc: '杠铃俯身划船，训练整个背部厚度' },
        { id: 'seated_row', name: '坐姿划船', reward: 1.5, path: 'lianti', desc: '坐姿划船器训练，强化中背部厚度' },
        { id: 'dumbbell_row', name: '哑铃俯身划船', reward: 1.2, path: 'lianti', desc: '俯身单手哑铃划船，训练中背部' },
        { id: 'barbell_deadlift', name: '硬拉', reward: 2.5, path: 'lianti', desc: '全身力量巅峰训练，增强后链肌群' },
        { id: 'dumbbell_curl', name: '哑铃弯举', reward: 0.8, path: 'lianti', desc: '肱二头肌孤立训练，塑造手臂线条' }
      ]
    },
    {
      id: 'wu_leg_day',
      name: '下肢锻骨日',
      category: 'fitness',
      subcategory: '下肢',
      industry: '运动健康',
      cover: '腿',
      description: '深蹲开局腿举跟上，练完臀推提踵不放过任何一块肉',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'barbell_squat', name: '杠铃深蹲', reward: 2, path: 'lianti', desc: '负重深蹲，下肢力量之王' },
        { id: 'leg_press', name: '腿举机', reward: 2, path: 'lianti', desc: '腿举机推举，安全高效训练股四头肌' },
        { id: 'dumbbell_lunge', name: '哑铃箭步蹲', reward: 1.5, path: 'lianti', desc: '持哑铃做箭步蹲，双侧下肢均衡训练' },
        { id: 'leg_extension', name: '腿屈伸', reward: 1, path: 'lianti', desc: '固定器械腿屈伸，孤立训练股四头肌' },
        { id: 'leg_curl', name: '腿弯举', reward: 1, path: 'lianti', desc: '固定器械腿弯举，孤立训练股后肌群' },
        { id: 'barbell_hip_thrust', name: '杠铃臀推', reward: 2, path: 'lianti', desc: '杠铃负重臀桥，最大化臀部力量增长' },
        { id: 'calf_raise', name: '提踵', reward: 0.3, path: 'lianti', desc: '小腿训练，增强踝关节稳定' },
        { id: 'glute_bridge', name: '臀桥', reward: 0.5, path: 'lianti', desc: '臀部激活训练，改善骨盆稳定' }
      ]
    },
    {
      id: 'wu_cardio_day',
      name: '全身燃脂日',
      category: 'fitness',
      subcategory: '燃脂',
      industry: '运动健康',
      cover: '燃',
      description: '跑步跳绳加波比，核心收尾平板撑，汗水出透才收工',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'running', name: '跑步', reward: 1, path: 'lianti', desc: '经典有氧运动，提升心肺耐力' },
        { id: 'jump_rope', name: '跳绳', reward: 1, path: 'lianti', desc: '高效燃脂有氧，随时随地可练' },
        { id: 'burpee', name: '波比跳', reward: 1, path: 'lianti', desc: '全身复合动作，兼具力量与有氧' },
        { id: 'hiit', name: 'HIIT训练', reward: 1.5, path: 'lianti', desc: '高强度间歇训练，燃脂效率极高' },
        { id: 'mountain_climber', name: '登山跑', reward: 0.25, path: 'lianti', desc: '动态核心训练，同时提升心率燃脂' },
        { id: 'plank', name: '平板支撑', reward: 0.05, path: 'lianti', desc: '核心稳定训练，提升腰腹力量' },
        { id: 'crunch', name: '卷腹', reward: 0.3, path: 'lianti', desc: '经典腹肌训练，集中锻炼腹直肌上段' },
        { id: 'brisk_walk', name: '快走/步行', reward: 0.5, path: 'lianti', desc: '日常步行锻炼，低强度有氧' }
      ]
    },
    {
      id: 'wu_shoulder_arm_day',
      name: '肩臂雕琢日',
      category: 'fitness',
      subcategory: '肩臂',
      industry: '运动健康',
      cover: '肩',
      description: '肩推侧平举前平举飞鸟，弯举臂屈伸一套带走',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'dumbbell_shoulder_press', name: '哑铃推举', reward: 1, path: 'lianti', desc: '肩部力量训练，打造宽阔肩部' },
        { id: 'dumbbell_lateral_raise', name: '哑铃侧平举', reward: 0.5, path: 'lianti', desc: '侧向抬臂训练，打造肩部宽度' },
        { id: 'dumbbell_front_raise', name: '哑铃前平举', reward: 0.5, path: 'lianti', desc: '前向抬臂训练，强化三角肌前束' },
        { id: 'dumbbell_rear_fly', name: '哑铃俯身飞鸟', reward: 0.5, path: 'lianti', desc: '俯身飞鸟，训练三角肌后束改善圆肩' },
        { id: 'dumbbell_curl', name: '哑铃弯举', reward: 0.8, path: 'lianti', desc: '肱二头肌孤立训练，塑造手臂线条' },
        { id: 'dumbbell_hammer_curl', name: '哑铃锤式弯举', reward: 0.8, path: 'lianti', desc: '锤式弯举变式，同时刺激肱肌与前臂' },
        { id: 'dumbbell_tricep_ext', name: '哑铃颈后臂屈伸', reward: 0.8, path: 'lianti', desc: '颈后臂屈伸，孤立训练肱三头肌' },
        { id: 'tricep_pushdown', name: '绳索下压（肱三头）', reward: 0.8, path: 'lianti', desc: '龙门架绳索下压，肱三头肌最佳训练动作' }
      ]
    },
    {
      id: 'shi_bulk_meal',
      name: '增肌标准餐',
      category: 'fitness',
      subcategory: '增肌饮食',
      industry: '运动健康',
      cover: '增',
      description: '高蛋白+碳水+蔬菜，三餐搭配补剂，练后快吸收',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'healthy_breakfast', name: '健康早餐', reward: 3, path: 'diet', desc: '早起吃一顿营养均衡的早餐，开启元气一天' },
        { id: 'nutritious_lunch', name: '营养午餐', reward: 3, path: 'diet', desc: '均衡搭配蛋白质+蔬菜+主食，午间充电' },
        { id: 'light_dinner', name: '清淡晚餐', reward: 3, path: 'diet', desc: '少油少盐、不过饱，晚间清淡饮食' },
        { id: 'quality_protein', name: '补充优质蛋白', reward: 3, path: 'diet', desc: '摄入鸡胸肉、鱼虾、蛋奶等优质蛋白' },
        { id: 'enough_veggies', name: '摄入足量蔬菜', reward: 3, path: 'diet', desc: '每日蔬菜摄入达标，补充维生素与纤维' },
        { id: 'regular_meals', name: '规律进食', reward: 4, path: 'diet', desc: '三餐定时定量，不暴饮暴食' },
        { id: 'drink_8_water', name: '喝够8杯水', reward: 4, path: 'diet', desc: '每日饮水充足，维持身体代谢平衡' }
      ]
    },
    {
      id: 'shi_cut_meal',
      name: '减脂轻食餐',
      category: 'fitness',
      subcategory: '减脂饮食',
      industry: '运动健康',
      cover: '减',
      description: '控制热量+高蛋白蔬菜，戒糖戒夜宵，缺口搞出来',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'calorie_control', name: '控制热量摄入', reward: 4, path: 'diet', desc: '有意识地控制全天总热量不超标' },
        { id: 'enough_veggies', name: '摄入足量蔬菜', reward: 3, path: 'diet', desc: '每日蔬菜摄入达标，补充维生素与纤维' },
        { id: 'light_dinner', name: '清淡晚餐', reward: 3, path: 'diet', desc: '少油少盐、不过饱，晚间清淡饮食' },
        { id: 'quality_protein', name: '补充优质蛋白', reward: 3, path: 'diet', desc: '摄入鸡胸肉、鱼虾、蛋奶等优质蛋白' },
        { id: 'no_sugar_drink', name: '戒断高糖饮料', reward: 5, path: 'diet', desc: '不喝奶茶、可乐等高糖饮品' },
        { id: 'no_late_snack', name: '戒断夜宵', reward: 4, path: 'diet', desc: '晚间8点后不进食，减轻肠胃负担' },
        { id: 'drink_8_water', name: '喝够8杯水', reward: 4, path: 'diet', desc: '每日饮水充足，维持身体代谢平衡' }
      ]
    },
    {
      id: 'shi_carb_load',
      name: '碳水充能日',
      category: 'fitness',
      subcategory: '碳水充能',
      industry: '运动健康',
      cover: '碳',
      description: '三餐碳水拉满，适合大练之后补充糖原',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'healthy_breakfast', name: '健康早餐', reward: 3, path: 'diet', desc: '早起吃一顿营养均衡的早餐，开启元气一天' },
        { id: 'nutritious_lunch', name: '营养午餐', reward: 3, path: 'diet', desc: '均衡搭配蛋白质+蔬菜+主食，午间充电' },
        { id: 'light_dinner', name: '清淡晚餐', reward: 3, path: 'diet', desc: '少油少盐、不过饱，晚间清淡饮食' },
        { id: 'regular_meals', name: '规律进食', reward: 4, path: 'diet', desc: '三餐定时定量，不暴饮暴食' },
        { id: 'drink_8_water', name: '喝够8杯水', reward: 4, path: 'diet', desc: '每日饮水充足，维持身体代谢平衡' }
      ]
    },
    {
      id: 'shi_detox_day',
      name: '补水清肠日',
      category: 'fitness',
      subcategory: '补水清肠',
      industry: '运动健康',
      cover: '水',
      description: '多喝水+大量蔬菜+清淡饮食，给肠胃放个假',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'drink_8_water', name: '喝够8杯水', reward: 4, path: 'diet', desc: '每日饮水充足，维持身体代谢平衡' },
        { id: 'enough_veggies', name: '摄入足量蔬菜', reward: 3, path: 'diet', desc: '每日蔬菜摄入达标，补充维生素与纤维' },
        { id: 'light_dinner', name: '清淡晚餐', reward: 3, path: 'diet', desc: '少油少盐、不过饱，晚间清淡饮食' },
        { id: 'no_sugar_drink', name: '戒断高糖饮料', reward: 5, path: 'diet', desc: '不喝奶茶、可乐等高糖饮品' },
        { id: 'regular_meals', name: '规律进食', reward: 4, path: 'diet', desc: '三餐定时定量，不暴饮暴食' }
      ]
    },
    {
      id: 'shi_discipline',
      name: '饮食自律日',
      category: 'fitness',
      subcategory: '饮食自律',
      industry: '运动健康',
      cover: '律',
      description: '三餐规律+控热+戒糖+戒夜宵+补蛋白，全方位自律',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'regular_meals', name: '规律进食', reward: 4, path: 'diet', desc: '三餐定时定量，不暴饮暴食' },
        { id: 'calorie_control', name: '控制热量摄入', reward: 4, path: 'diet', desc: '有意识地控制全天总热量不超标' },
        { id: 'no_sugar_drink', name: '戒断高糖饮料', reward: 5, path: 'diet', desc: '不喝奶茶、可乐等高糖饮品' },
        { id: 'no_late_snack', name: '戒断夜宵', reward: 4, path: 'diet', desc: '晚间8点后不进食，减轻肠胃负担' },
        { id: 'quality_protein', name: '补充优质蛋白', reward: 3, path: 'diet', desc: '摄入鸡胸肉、鱼虾、蛋奶等优质蛋白' },
        { id: 'healthy_breakfast', name: '健康早餐', reward: 3, path: 'diet', desc: '早起吃一顿营养均衡的早餐，开启元气一天' },
        { id: 'light_dinner', name: '清淡晚餐', reward: 3, path: 'diet', desc: '少油少盐、不过饱，晚间清淡饮食' }
      ]
    },
    {
      id: 'wu2_deep_study',
      name: '深度学习日',
      category: 'learning',
      subcategory: '深度学习',
      industry: '学习精进',
      cover: '学',
      description: '看书听课做笔记，深耕专业知识再加复盘',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'read_book', name: '阅读书籍', reward: 2, path: 'xiuxin', desc: '静心阅读，汲取知识养分' },
        { id: 'learn_course', name: '学习课程/技能', reward: 2.5, path: 'xiuxin', desc: '系统性学习一门课程或技能' },
        { id: 'write_reading_notes', name: '写读书笔记', reward: 2, path: 'xiuxin', desc: '读后整理笔记，内化知识体系' },
        { id: 'professional_knowledge', name: '专业知识学习', reward: 2.5, path: 'xiuxin', desc: '深耕专业领域知识，提升核心竞争力' },
        { id: 'review_summary', name: '复盘总结', reward: 1.5, path: 'xiuxin', desc: '回顾当日/当周得失，提炼经验教训' },
        { id: 'foreign_language', name: '外语学习', reward: 2, path: 'xiuxin', desc: '学习一门外语，听说读写全面训练' }
      ]
    },
    {
      id: 'wu2_calm_day',
      name: '冥想静心日',
      category: 'learning',
      subcategory: '静心',
      industry: '学习精进',
      cover: '静',
      description: '练字听乐弹琴写作观影，让心静下来',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'calligraphy', name: '练字/书法', reward: 1.5, path: 'xiuxin', desc: '练习书写，静心养性' },
        { id: 'listen_music', name: '听音乐', reward: 1, path: 'xiuxin', desc: '聆听音乐，感受旋律之美' },
        { id: 'play_instrument', name: '弹奏乐器', reward: 2.5, path: 'xiuxin', desc: '弹奏一种乐器，指尖流淌旋律' },
        { id: 'writing_creation', name: '写作创作', reward: 2, path: 'xiuxin', desc: '写下所思所想，文字中见天地见自己' },
        { id: 'watch_film_enlighten', name: '观影悟道', reward: 5, path: 'xiuxin', desc: '观看优质电影/纪录片，在故事中观照自身' },
        { id: 'read_book', name: '阅读书籍', reward: 2, path: 'xiuxin', desc: '静心阅读，汲取知识养分' }
      ]
    },
    {
      id: 'wu2_skill_up',
      name: '技能提升日',
      category: 'learning',
      subcategory: '技能',
      industry: '学习精进',
      cover: '技',
      description: '学外语背单词刷题备考，集中火力攻一门',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'foreign_language', name: '外语学习', reward: 2, path: 'xiuxin', desc: '学习一门外语，听说读写全面训练' },
        { id: 'memorize', name: '背诵记忆', reward: 2, path: 'xiuxin', desc: '背诵单词、古诗、公式等知识点' },
        { id: 'study_practice_questions', name: '刷题练习', reward: 2, path: 'xiuxin', desc: '刷题巩固，以练促学' },
        { id: 'exam_prep', name: '考证备考', reward: 2.5, path: 'xiuxin', desc: '系统性备考复习，向目标证书冲刺' },
        { id: 'learn_course', name: '学习课程/技能', reward: 2.5, path: 'xiuxin', desc: '系统性学习一门课程或技能' },
        { id: 'listen_audio_book', name: '听书学习', reward: 1.5, path: 'xiuxin', desc: '利用碎片时间听书，多感官吸收知识' }
      ]
    },
    {
      id: 'wu2_review_day',
      name: '复盘总结日',
      category: 'learning',
      subcategory: '复盘',
      industry: '学习精进',
      cover: '盘',
      description: '回顾得失提炼经验，写笔记理思路再写作输出',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'review_summary', name: '复盘总结', reward: 1.5, path: 'xiuxin', desc: '回顾当日/当周得失，提炼经验教训' },
        { id: 'write_reading_notes', name: '写读书笔记', reward: 2, path: 'xiuxin', desc: '读后整理笔记，内化知识体系' },
        { id: 'writing_creation', name: '写作创作', reward: 2, path: 'xiuxin', desc: '写下所思所想，文字中见天地见自己' },
        { id: 'read_book', name: '阅读书籍', reward: 2, path: 'xiuxin', desc: '静心阅读，汲取知识养分' },
        { id: 'photography', name: '摄影创作', reward: 2, path: 'xiuxin', desc: '用镜头捕捉光影，记录美的瞬间' }
      ]
    },
    {
      id: 'gong_deep_work',
      name: '深度工作日',
      category: 'career',
      subcategory: '深度工作',
      industry: '行业成长',
      cover: '深',
      description: '推里程碑修bug发版本，深度学习搞创意',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'milestone_progress', name: '项目里程碑推进', reward: 8, path: 'richang', desc: '推动项目关键节点取得实质进展' },
        { id: 'bug_fix', name: '问题排查修复', reward: 3, path: 'richang', desc: '排查定位问题并完成修复' },
        { id: 'version_update', name: '版本迭代更新', reward: 7, path: 'richang', desc: '完成一个版本的迭代发布' },
        { id: 'deep_skill_learn', name: '技能深度学习', reward: 3, path: 'richang', desc: '系统性深入学习一项专业技能' },
        { id: 'creative_plan', name: '创意方案策划', reward: 3, path: 'richang', desc: '构思策划创新方案，探索新可能' },
        { id: 'daily_sync', name: '日常进度同步', reward: 3, path: 'richang', desc: '与团队同步当日工作进度与问题' },
        { id: 'personal_review', name: '个人工作复盘', reward: 4, path: 'richang', desc: '回顾个人工作表现，总结经验教训' }
      ]
    },
    {
      id: 'gong_project_push',
      name: '项目推进日',
      category: 'career',
      subcategory: '项目推进',
      industry: '行业成长',
      cover: '推',
      description: '立项方案复盘同步跨部门协调，把项目往前推',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'project_proposal', name: '项目立项申请', reward: 6, path: 'richang', desc: '提交项目立项材料，推动项目正式启动' },
        { id: 'biz_plan_write', name: '商业方案撰写', reward: 3, path: 'richang', desc: '编写商业计划书或项目方案' },
        { id: 'project_review', name: '项目复盘总结', reward: 5, path: 'richang', desc: '对项目阶段进行复盘总结分析' },
        { id: 'daily_sync', name: '日常进度同步', reward: 3, path: 'richang', desc: '与团队同步当日工作进度与问题' },
        { id: 'cross_dept_coord', name: '跨部门协调推进', reward: 2.5, path: 'richang', desc: '推动跨部门沟通协调，解决协作问题' },
        { id: 'data_report', name: '数据报表输出', reward: 4, path: 'richang', desc: '整理并输出数据报表分析' }
      ]
    },
    {
      id: 'gong_side_hustle',
      name: '副业推进日',
      category: 'career',
      subcategory: '副业',
      industry: '行业成长',
      cover: '副',
      description: '副业创作+行业分析+创意策划+个人复盘，八小时之外搞产出',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'side_project', name: '副业创作产出', reward: 3, path: 'richang', desc: '推进副业项目或创作内容' },
        { id: 'industry_analysis', name: '行业经济分析', reward: 3, path: 'richang', desc: '深入研究分析行业动态与经济趋势' },
        { id: 'creative_plan', name: '创意方案策划', reward: 3, path: 'richang', desc: '构思策划创新方案，探索新可能' },
        { id: 'personal_review', name: '个人工作复盘', reward: 4, path: 'richang', desc: '回顾个人工作表现，总结经验教训' },
        { id: 'skill_practice', name: '专业技能练习', reward: 2.5, path: 'richang', desc: '刻意练习一项职业技能' },
        { id: 'industry_sharing', name: '行业交流分享', reward: 5, path: 'richang', desc: '参与行业交流或内部分享活动' }
      ]
    },
    {
      id: 'gong_daily_ops',
      name: '日常事务日',
      category: 'career',
      subcategory: '日常事务',
      industry: '行业成长',
      cover: '常',
      description: '打卡开会邮件报销文档更新，琐事也要算修行',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'clock_in', name: '上班打卡', reward: 1, path: 'richang', desc: '准时上班打卡签到' },
        { id: 'clock_out', name: '下班打卡', reward: 1, path: 'richang', desc: '准时下班打卡签退' },
        { id: 'daily_meeting', name: '例行晨会夕会', reward: 2, path: 'richang', desc: '参加每日例行晨会或夕会' },
        { id: 'email_reply', name: '邮件日常回复', reward: 1.5, path: 'richang', desc: '处理回复日常工作邮件' },
        { id: 'expense_report', name: '发票报销', reward: 2, path: 'richang', desc: '整理发票，提交报销申请' },
        { id: 'doc_update', name: '文档迭代更新', reward: 3, path: 'richang', desc: '更新维护项目相关文档资料' },
        { id: 'workstation_duty', name: '工位日常值守', reward: 1, path: 'richang', desc: '在工位完成日常工作值守' }
      ]
    },
    {
      id: 'sha_stay_up',
      name: '熬夜修仙',
      category: 'life',
      subcategory: '熬夜',
      industry: '生活修行',
      cover: '熬',
      description: '熬夜通宵睡前刷手机，第二天还赖床，修为倒扣不冤',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'stay_up_late', name: '熬夜（24点后睡）', reward: 8, path: 'richang', desc: '熬夜损伤元气，次日精神萎靡' },
        { id: 'all_nighter', name: '通宵不睡', reward: 5, path: 'richang', desc: '彻夜未眠，严重透支身体元气' },
        { id: 'bed_phone_1h', name: '睡前刷手机超1小时', reward: 3, path: 'richang', desc: '躺床上刷手机，影响睡眠质量' },
        { id: 'phone_all_night', name: '熬夜刷手机', reward: 3, path: 'richang', desc: '深夜不睡刷手机，损伤眼睛与精神' },
        { id: 'oversleep_1h', name: '赖床超1小时', reward: 3, path: 'richang', desc: '赖床不起，浪费早晨黄金时间' }
      ]
    },
    {
      id: 'sha_junk_food',
      name: '垃圾食品放纵',
      category: 'life',
      subcategory: '垃圾食品',
      industry: '生活修行',
      cover: '纵',
      description: '炸鸡奶茶甜品宵夜暴饮暴食，吃时一时爽扣分火葬场',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'binge_eating', name: '暴饮暴食', reward: 8, path: 'richang', desc: '放纵饮食，超出身体所需' },
        { id: 'full_sugar_bubble_tea', name: '喝全糖奶茶', reward: 5, path: 'richang', desc: '喝下一杯高糖高热量的全糖奶茶' },
        { id: 'fried_junk_food', name: '吃油炸垃圾食品', reward: 3, path: 'richang', desc: '吃油炸高脂垃圾食品，加重身体负担' },
        { id: 'midnight_snack', name: '吃宵夜', reward: 3, path: 'richang', desc: '睡前吃宵夜，加重消化负担影响睡眠' },
        { id: 'excess_sweets', name: '吃超量甜品', reward: 3, path: 'richang', desc: '一次性吃大量甜食，血糖飙升' },
        { id: 'sugary_soda', name: '喝高糖碳酸饮料', reward: 3, path: 'richang', desc: '喝高糖碳酸饮料，空热量伤牙伤身' }
      ]
    },
    {
      id: 'sha_phone_lost',
      name: '刷手机失神',
      category: 'life',
      subcategory: '刷手机',
      industry: '生活修行',
      cover: '刷',
      description: '短视频游戏八卦信息流，无目的刷到大脑空白',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'mindless_short_video', name: '无目的刷短视频', reward: 8, path: 'richang', desc: '漫无目的地刷短视频，时光虚度' },
        { id: 'game_addiction', name: '沉迷游戏超时', reward: 5, path: 'richang', desc: '打游戏超时停不下来，虚度光阴' },
        { id: 'cant_stop_video', name: '刷视频停不下来', reward: 3, path: 'richang', desc: '一个接一个刷视频，完全忘了时间' },
        { id: 'mindless_scroll_feed', name: '无效刷信息流', reward: 3, path: 'richang', desc: '无目的刷信息流，大脑被无用信息塞满' },
        { id: 'gossip_scroll', name: '漫无目的刷八卦', reward: 3, path: 'richang', desc: '刷娱乐八卦无关信息，浪费精神' },
        { id: 'refresh_social_obsess', name: '反复刷新社交软件', reward: 3, path: 'richang', desc: '强迫症式反复刷新社交动态' }
      ]
    },
    {
      id: 'sha_give_up',
      name: '摆烂躺平',
      category: 'life',
      subcategory: '摆烂',
      industry: '生活修行',
      cover: '摆',
      description: '荒废一天拖延任务搁置目标，心魔在召唤',
      tags: ['官方'],
      creatorName: '天道宗',
      isOfficial: true,
      isPublic: true,
      status: 'published',
      visibility: 'public',
      commentPerm: 'all',
      hotScore: 0,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      importCount: 0,
      realmNames: ['入门', '小成', '大成', '圆满'],
      dailyCap: 30,
      baseScore: 25,
      createdAt: now,
      updatedAt: now,
      tasks: [
        { id: 'waste_whole_day', name: '躺平荒废一整天', reward: 8, path: 'richang', desc: '一整天啥也没干，完全荒废' },
        { id: 'procrastinate_task', name: '拖延当日任务未完成', reward: 5, path: 'richang', desc: '计划内任务未完成，积压至明日' },
        { id: 'goal_abandoned', name: '目标搁置不推进', reward: 3, path: 'richang', desc: '设好的目标一直搁置，完全没推进' },
        { id: 'break_promise', name: '承诺的事拖延不做', reward: 3, path: 'richang', desc: '答应了的事一拖再拖迟迟不行动' },
        { id: 'slacking_at_work', name: '上班摸鱼划水', reward: 3, path: 'richang', desc: '上班时间摸鱼偷懒不干活' }
      ]
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

/** 清空 public_templates（废案清理，谨慎使用） */
async function clearAllTemplates() {
  // 云开发不允许无条件删除（where({}) 报 invalid parameters），用 _id 存在条件
  var res = await db.collection('public_templates').where({ _id: _.exists(true) }).remove();
  return { ok: true, removed: res.stats ? res.stats.removed : 0 };
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
    await db.collection('public_templates').where({ id: templateId }).update({
      data: { likeCount: _.inc(-1) }
    });
    liked = false;
  } else {
    await db.collection('template_likes').add({
      data: { templateId: templateId, userId: userId, createdAt: new Date() }
    });
    await db.collection('public_templates').where({ id: templateId }).update({
      data: { likeCount: _.inc(1) }
    });
    liked = true;
  }

  await updateHotScore(templateId);
  var t = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  return { ok: true, liked: liked, likeCount: t.data[0] ? (t.data[0].likeCount || 0) : 0 };
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
    await db.collection('public_templates').where({ id: templateId }).update({
      data: { favCount: _.inc(-1) }
    });
    favorited = false;
  } else {
    await db.collection('template_favorites').add({
      data: { templateId: templateId, userId: userId, createdAt: new Date() }
    });
    await db.collection('public_templates').where({ id: templateId }).update({
      data: { favCount: _.inc(1) }
    });
    favorited = true;
  }

  await updateHotScore(templateId);
  var t = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  return { ok: true, favorited: favorited, favCount: t.data[0] ? (t.data[0].favCount || 0) : 0 };
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
  var tplRes = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  if (!tplRes.data || !tplRes.data.length) return { ok: false, error: '模板不存在' };
  if (!checkCommentPerm(tplRes.data[0], userId)) {
    return { ok: false, error: '此模板已关闭评论' };
  }
  // 检查黑名单
  var blockList = tplRes.data[0].blacklist || [];
  if (blockList.indexOf(userId) >= 0) {
    return { ok: false, error: '您已被禁止评论此模板' };
  }

  var comment = {
    templateId: templateId, userId: userId, nickName: nickName,
    content: content, createdAt: new Date(), likeCount: 0
  };

  var addRes = await db.collection('template_comments').add({ data: comment });
  await db.collection('public_templates').where({ id: templateId }).update({
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
  await db.collection('public_templates').where({ id: templateId }).update({
    data: { commentCount: _.inc(1), updatedAt: new Date() }
  });

  return { ok: true, commentId: addRes._id, message: '评论已发表' };
}

async function getComments(event) {
  var templateId = event.templateId;
  var page = Math.min(Math.max(1, parseInt(event.page) || 1), 100)
  var pageSize = Math.min(Math.max(1, parseInt(event.pageSize) || 20), 50)
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
  var tplRes = await db.collection('public_templates').where({ id: comment.templateId }).limit(1).get();
  var isCreator = tplRes.data[0] && tplRes.data[0].creatorId === userId;
  if (comment.userId !== userId && !isCreator) {
    return { ok: false, error: '无权删除此评论' };
  }

  await db.collection('template_comments').doc(commentId).remove();
  await db.collection('public_templates').where({ id: comment.templateId }).update({
    data: { commentCount: _.inc(-1) }
  });
  await updateHotScore(comment.templateId);

  return { ok: true };
}

async function importTemplate(event) {
  var templateId = event.templateId;
  if (!templateId) return { ok: false, error: '缺少 templateId 参数' };

  await db.collection('public_templates').where({ id: templateId }).update({
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
      var existRes = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
      if (existRes.data[0] && existRes.data[0].creatorId === userId) {
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
    await db.collection('public_templates').where({ id: templateId }).update({ data: templateData });
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

  var tplRes = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  if (!tplRes.data || !tplRes.data.length) return { ok: false, error: '模板不存在' };
  if (tplRes.data[0].creatorId !== userId) return { ok: false, error: '无权下架他人模板' };

  await db.collection('public_templates').where({ id: templateId }).update({
    data: { isPublic: false, status: 'unpublished', updatedAt: new Date() }
  });
  return { ok: true, message: '模板已下架' };
}

async function deleteTemplate(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  if (!templateId || !userId) return { ok: false, error: '缺少必要参数' };

  var tplRes = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  if (!tplRes.data || !tplRes.data.length) return { ok: false, error: '模板不存在' };
  if (tplRes.data[0].creatorId !== userId) return { ok: false, error: '无权删除他人模板' };

  // 清理关联数据
  await db.collection('template_likes').where({ templateId: templateId }).remove().catch(function(){});
  await db.collection('template_favorites').where({ templateId: templateId }).remove().catch(function(){});
  await db.collection('template_comments').where({ templateId: templateId }).remove().catch(function(){});
  await db.collection('public_templates').where({ id: templateId }).remove();

  return { ok: true, message: '模板已删除' };
}

async function getMyPublished(event) {
  var userId = event.userId;
  var page = Math.min(Math.max(1, parseInt(event.page) || 1), 100)
  var pageSize = Math.min(Math.max(1, parseInt(event.pageSize) || 20), 50)
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
  var page = Math.min(Math.max(1, parseInt(event.page) || 1), 100)
  var pageSize = Math.min(Math.max(1, parseInt(event.pageSize) || 50), 50)
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
  var page = Math.min(Math.max(1, parseInt(event.page) || 1), 100)
  var pageSize = Math.min(Math.max(1, parseInt(event.pageSize) || 20), 50)
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
  var page = Math.min(Math.max(1, parseInt(event.page) || 1), 100)
  var pageSize = Math.min(Math.max(1, parseInt(event.pageSize) || 20), 50)
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

  var tplRes = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  if (!tplRes.data || !tplRes.data.length) return { ok: false, error: '模板不存在' };
  if (tplRes.data[0].creatorId !== userId) return { ok: false, error: '无权操作' };

  var blockList = tplRes.data[0].blacklist || [];
  if (blockList.indexOf(targetUserId) >= 0) return { ok: true, message: '已存在' };
  blockList.push(targetUserId);

  await db.collection('public_templates').where({ id: templateId }).update({
    data: { blacklist: blockList }
  });
  return { ok: true, message: '已加入黑名单' };
}

async function removeFromBlacklist(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  var targetUserId = event.targetUserId;
  if (!templateId || !userId || !targetUserId) return { ok: false, error: '缺少必要参数' };

  var tplRes = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  if (!tplRes.data || !tplRes.data.length) return { ok: false, error: '模板不存在' };
  if (tplRes.data[0].creatorId !== userId) return { ok: false, error: '无权操作' };

  var blockList = (tplRes.data[0].blacklist || []).filter(function(id) { return id !== targetUserId; });
  await db.collection('public_templates').where({ id: templateId }).update({
    data: { blacklist: blockList }
  });
  return { ok: true, message: '已移除黑名单' };
}

async function addToWhitelist(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  var targetUserId = event.targetUserId;
  if (!templateId || !userId || !targetUserId) return { ok: false, error: '缺少必要参数' };

  var tplRes = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  if (!tplRes.data || !tplRes.data.length) return { ok: false, error: '模板不存在' };
  if (tplRes.data[0].creatorId !== userId) return { ok: false, error: '无权操作' };

  var wl = tplRes.data[0].whitelist || [];
  if (wl.indexOf(targetUserId) >= 0) return { ok: true, message: '已存在' };
  wl.push(targetUserId);

  await db.collection('public_templates').where({ id: templateId }).update({
    data: { whitelist: wl }
  });
  return { ok: true, message: '已加入白名单' };
}

async function removeFromWhitelist(event) {
  var templateId = event.templateId;
  var userId = event.userId;
  var targetUserId = event.targetUserId;
  if (!templateId || !userId || !targetUserId) return { ok: false, error: '缺少必要参数' };

  var tplRes = await db.collection('public_templates').where({ id: templateId }).limit(1).get();
  if (!tplRes.data || !tplRes.data.length) return { ok: false, error: '模板不存在' };
  if (tplRes.data[0].creatorId !== userId) return { ok: false, error: '无权操作' };

  var wl = (tplRes.data[0].whitelist || []).filter(function(id) { return id !== targetUserId; });
  await db.collection('public_templates').where({ id: templateId }).update({
    data: { whitelist: wl }
  });
  return { ok: true, message: '已移除白名单' };
}
