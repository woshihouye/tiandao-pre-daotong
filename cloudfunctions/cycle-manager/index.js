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
      case 'predict':      return await predictPlaylist(event, OPENID);
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

/* ------------------------------ 歌单预测 predict ------------------------------ */

const PREDICT_DEFAULT_OPTIMAL = {
  activity: { min: 300, max: 600 },
  nutrition: {
    protein: { min: 50, max: 80 },
    carbs: { min: 200, max: 300 },
    fat: { min: 40, max: 70 },
    calories: { min: 1800, max: 2400 }
  }
};

const PREDICT_WU_META = {
  run_mild: { caloriesPerUnit: 6, category: 'wu' },
  run_high: { caloriesPerUnit: 10, category: 'wu' },
  run_interval: { caloriesPerUnit: 14, category: 'wu' },
  walk_mild: { caloriesPerUnit: 3, category: 'wu' },
  walk_high: { caloriesPerUnit: 4.5, category: 'wu' },
  pushup: { caloriesPerUnit: 7, category: 'wu' },
  pullup: { caloriesPerUnit: 10, category: 'wu' },
  squat_bodyweight: { caloriesPerUnit: 0.5, category: 'wu' },
  squat_barbell: { caloriesPerUnit: 7, category: 'wu' },
  bench_dumbbell: { caloriesPerUnit: 6, category: 'wu' },
  bench_barbell: { caloriesPerUnit: 7, category: 'wu' },
  row_barbell: { caloriesPerUnit: 7, category: 'wu' },
  row_dumbbell: { caloriesPerUnit: 6, category: 'wu' },
  deadlift: { caloriesPerUnit: 9, category: 'wu' },
  ohp_barbell: { caloriesPerUnit: 6, category: 'wu' },
  deadbug: { caloriesPerUnit: 0.5, category: 'wu' },
  plank: { caloriesPerUnit: 3, category: 'wu' },
  situp: { caloriesPerUnit: 0.6, category: 'wu' },
  leg_raise_hang: { caloriesPerUnit: 1.2, category: 'wu' },
  russian_twist: { caloriesPerUnit: 0.5, category: 'wu' },
  mountain_climber: { caloriesPerUnit: 8, category: 'wu' },
  burpee: { caloriesPerUnit: 1.2, category: 'wu' },
  jump_squat: { caloriesPerUnit: 0.8, category: 'wu' },
  hiit_standard: { caloriesPerUnit: 10, category: 'wu' },
  swimming_mild: { caloriesPerUnit: 7, category: 'wu' },
  cycling_mild: { caloriesPerUnit: 5, category: 'wu' },
  cycling_high: { caloriesPerUnit: 8, category: 'wu' },
  jump_rope: { caloriesPerUnit: 10, category: 'wu' },
  stair_master: { caloriesPerUnit: 7, category: 'wu' },
  rowing_machine: { caloriesPerUnit: 7, category: 'wu' },
  yoga_basic: { caloriesPerUnit: 2.5, category: 'wu' },
  pilates: { caloriesPerUnit: 4, category: 'wu' },
  stretch_basic: { caloriesPerUnit: 1.5, category: 'wu' },
  basketball: { caloriesPerUnit: 7, category: 'wu' },
  football: { caloriesPerUnit: 7, category: 'wu' },
  badminton: { caloriesPerUnit: 5, category: 'wu' },
  table_tennis: { caloriesPerUnit: 4, category: 'wu' },
  tennis: { caloriesPerUnit: 6, category: 'wu' },
  martial_arts_basic: { caloriesPerUnit: 7, category: 'wu' },
  taiji_basic: { caloriesPerUnit: 4, category: 'wu' },
  blank_wu: { caloriesPerUnit: 6, category: 'wu' }
};

const PREDICT_SHI_META = {
  meal_rice: { caloriesPerUnit: 200, nutrition: { protein: 4, carbs: 45, fat: 0.5 }, category: 'shi' },
  meal_noodle: { caloriesPerUnit: 280, nutrition: { protein: 9, carbs: 55, fat: 2 }, category: 'shi' },
  meal_congee: { caloriesPerUnit: 120, nutrition: { protein: 2.4, carbs: 26, fat: 0.5 }, category: 'shi' },
  meal_bread: { caloriesPerUnit: 260, nutrition: { protein: 9, carbs: 49, fat: 3.5 }, category: 'shi' },
  protein_chicken: { caloriesPerUnit: 165, nutrition: { protein: 31, carbs: 0, fat: 3.6 }, category: 'shi' },
  protein_beef: { caloriesPerUnit: 250, nutrition: { protein: 26, carbs: 0, fat: 15 }, category: 'shi' },
  protein_fish: { caloriesPerUnit: 206, nutrition: { protein: 22, carbs: 0, fat: 12 }, category: 'shi' },
  protein_egg: { caloriesPerUnit: 78, nutrition: { protein: 6, carbs: 0.6, fat: 5 }, category: 'shi' },
  protein_shrimp: { caloriesPerUnit: 99, nutrition: { protein: 24, carbs: 0.2, fat: 0.3 }, category: 'shi' },
  protein_tofu: { caloriesPerUnit: 76, nutrition: { protein: 8, carbs: 1.9, fat: 4.8 }, category: 'shi' },
  protein_milk: { caloriesPerUnit: 103, nutrition: { protein: 6.3, carbs: 10, fat: 3.4 }, category: 'shi' },
  veg_leafy: { caloriesPerUnit: 20, nutrition: { protein: 1.5, carbs: 3, fat: 0.2 }, category: 'shi' },
  veg_crucifer: { caloriesPerUnit: 34, nutrition: { protein: 2.8, carbs: 7, fat: 0.4 }, category: 'shi' },
  veg_root: { caloriesPerUnit: 80, nutrition: { protein: 1.4, carbs: 19, fat: 0.1 }, category: 'shi' },
  veg_bean: { caloriesPerUnit: 120, nutrition: { protein: 8, carbs: 20, fat: 0.5 }, category: 'shi' },
  fruit_sweet: { caloriesPerUnit: 57, nutrition: { protein: 0.5, carbs: 14, fat: 0.3 }, category: 'shi' },
  fruit_berry: { caloriesPerUnit: 46, nutrition: { protein: 0.8, carbs: 11, fat: 0.3 }, category: 'shi' },
  fat_nut: { caloriesPerUnit: 170, nutrition: { protein: 5, carbs: 6, fat: 15 }, category: 'shi' },
  fat_oil_tsp: { caloriesPerUnit: 40, nutrition: { protein: 0, carbs: 0, fat: 4.5 }, category: 'shi' },
  fat_avocado: { caloriesPerUnit: 160, nutrition: { protein: 2, carbs: 9, fat: 15 }, category: 'shi' },
  snack_energy_bar: { caloriesPerUnit: 200, nutrition: { protein: 10, carbs: 25, fat: 7 }, category: 'shi' },
  snack_nuts_pack: { caloriesPerUnit: 200, nutrition: { protein: 6, carbs: 7, fat: 18 }, category: 'shi' },
  drink_protein_shake: { caloriesPerUnit: 150, nutrition: { protein: 25, carbs: 6, fat: 2 }, category: 'shi' },
  drink_milk: { caloriesPerUnit: 103, nutrition: { protein: 6.3, carbs: 10, fat: 3.4 }, category: 'shi' },
  drink_coffee_milk: { caloriesPerUnit: 90, nutrition: { protein: 3, carbs: 10, fat: 4 }, category: 'shi' },
  blank_shi: { caloriesPerUnit: 200, nutrition: { protein: 8, carbs: 30, fat: 4 }, category: 'shi' }
};

const PREDICT_STUDY_META = {
  read_book: { minutesPerUnit: 30, knowledgePerUnit: 1, category: 'study' },
  watch_course: { minutesPerUnit: 20, knowledgePerUnit: 1, category: 'study' },
  take_notes: { minutesPerUnit: 30, knowledgePerUnit: 1.5, category: 'study' },
  review_flashcard: { minutesPerUnit: 15, knowledgePerUnit: 1, category: 'study' },
  foreign_lang: { minutesPerUnit: 30, knowledgePerUnit: 1.2, category: 'study' },
  write_essay: { minutesPerUnit: 60, knowledgePerUnit: 2, category: 'study' },
  problem_solving: { minutesPerUnit: 45, knowledgePerUnit: 1.8, category: 'study' },
  code_practice: { minutesPerUnit: 45, knowledgePerUnit: 2, category: 'study' },
  blank_study: { minutesPerUnit: 30, knowledgePerUnit: 1, category: 'study' }
};

const PREDICT_WORK_META = {
  project_proposal: { outputPerUnit: 1, category: 'work' },
  code_commit: { outputPerUnit: 1, category: 'work' },
  meeting_sync: { outputPerUnit: 1, category: 'work' },
  doc_writing: { outputPerUnit: 1, category: 'work' },
  customer_call: { outputPerUnit: 1, category: 'work' },
  design_iterate: { outputPerUnit: 1, category: 'work' },
  test_deploy: { outputPerUnit: 1, category: 'work' },
  review_feedback: { outputPerUnit: 1, category: 'work' },
  blank_work: { outputPerUnit: 1, category: 'work' }
};

const PREDICT_DEBUFF_META = {
  game_addiction: { timeCostPerUnit: 2, calorieIntakePerUnit: 0, category: 'debuff' },
  binge_scroll: { timeCostPerUnit: 1, calorieIntakePerUnit: 0, category: 'debuff' },
  late_night_snack: { timeCostPerUnit: 0.5, calorieIntakePerUnit: 450, category: 'debuff' },
  alcohol: { timeCostPerUnit: 2, calorieIntakePerUnit: 500, category: 'debuff' },
  skip_meal: { timeCostPerUnit: 0.2, calorieIntakePerUnit: -500, category: 'debuff' },
  oversleep: { timeCostPerUnit: 2, calorieIntakePerUnit: 0, category: 'debuff' },
  blank_debuff: { timeCostPerUnit: 1, calorieIntakePerUnit: 0, category: 'debuff' }
};

function _predictSafeRange(range) {
  var min = parseFloat(range && range.min); if (isNaN(min)) min = 0;
  var max = parseFloat(range && range.max); if (isNaN(max)) max = 0;
  if (min > max) { var t = min; min = max; max = t; }
  if (max <= 0) max = Math.max(1, min);
  if (min <= 0) min = Math.max(1, max * 0.6);
  return { min: min, max: max };
}

function _predictDeviation(v, range) {
  var r = _predictSafeRange(range);
  var x = parseFloat(v); if (isNaN(x)) x = 0;
  if (x >= r.min && x <= r.max) return 0;
  if (x < r.min) return (r.min - x) / r.min;
  return (x - r.max) / r.max;
}

function _predictDeviationToScore(dev, fullScore) {
  var d = parseFloat(dev); if (isNaN(d)) d = 1;
  if (d < 0) d = 0;
  var fs = parseFloat(fullScore); if (isNaN(fs) || fs <= 0) fs = 1;
  var score;
  if (d <= 0.1) score = fs;
  else if (d <= 0.3) score = fs * 0.72;
  else if (d <= 0.6) score = fs * 0.32;
  else if (d <= 1.0) score = 0;
  else score = Math.round(fs * -0.6 * d * 10) / 10;
  return Math.round(score * 10) / 10;
}

function _predictActivityScore(totalCalories, optimal) {
  var opt = (optimal && optimal.activity) ? optimal.activity : PREDICT_DEFAULT_OPTIMAL.activity;
  var d = _predictDeviation(totalCalories, opt);
  return _predictDeviationToScore(d, 5.0);
}

function _predictNutritionScore(nutrition, optimal) {
  var oNut = (optimal && optimal.nutrition) ? optimal.nutrition : PREDICT_DEFAULT_OPTIMAL.nutrition;
  var dP = _predictDeviation(nutrition.protein, oNut.protein);
  var dC = _predictDeviation(nutrition.carbs, oNut.carbs);
  var dF = _predictDeviation(nutrition.fat, oNut.fat);
  var dK = _predictDeviation(nutrition.calories, oNut.calories);
  var wd = dP * 0.4 + dC * 0.3 + dF * 0.2 + dK * 0.1;
  return _predictDeviationToScore(wd, 2.5);
}

function _predictUnifiedMeta(activityId, actCategory, act) {
  var id = String(activityId || '');
  var cat = String(actCategory || '').toLowerCase();
  var custom = (act && act.customMeta && typeof act.customMeta === 'object') ? act.customMeta : null;
  var result = { caloriesPerUnit: 0, nutrition: { protein: 0, carbs: 0, fat: 0 }, minutesPerUnit: 0, knowledgePerUnit: 0, outputPerUnit: 0, timeCostPerUnit: 0, calorieIntakePerUnit: 0 };
  var src = null;
  if (['wu', 'exercise', 'fitness', 'sport', 'cardio', 'strength', '炼体', '运动'].indexOf(cat) !== -1 || id.indexOf('wu_') === 0 || id.indexOf('run_') === 0 || id.indexOf('walk_') === 0 || id.indexOf('pushup') === 0 || id.indexOf('pullup') === 0 || id.indexOf('squat') === 0 || id.indexOf('bench') === 0 || id.indexOf('row_') === 0 || id.indexOf('deadlift') === 0 || id.indexOf('ohp') === 0 || id.indexOf('deadbug') === 0 || id.indexOf('plank') === 0 || id.indexOf('situp') === 0 || id.indexOf('leg_raise') === 0 || id.indexOf('russian_twist') === 0 || id.indexOf('mountain_climber') === 0 || id.indexOf('burpee') === 0 || id.indexOf('jump_squat') === 0 || id.indexOf('hiit_') === 0 || id.indexOf('swimming_') === 0 || id.indexOf('cycling_') === 0 || id.indexOf('jump_rope') === 0 || id.indexOf('stair_') === 0 || id.indexOf('rowing_') === 0 || id.indexOf('yoga_') === 0 || id.indexOf('pilates') === 0 || id.indexOf('stretch_') === 0 || id.indexOf('basketball') === 0 || id.indexOf('football') === 0 || id.indexOf('badminton') === 0 || id.indexOf('table_tennis') === 0 || id.indexOf('tennis') === 0 || id.indexOf('martial_arts') === 0 || id.indexOf('taiji_') === 0 || id.indexOf('blank_wu') === 0) {
    src = PREDICT_WU_META[id] || PREDICT_WU_META.blank_wu;
  } else if (['shi', 'diet', 'nutrition', 'meal', 'food', '饮食', '饭', '食'].indexOf(cat) !== -1 || id.indexOf('shi_') === 0 || id.indexOf('meal_') === 0 || id.indexOf('protein_') === 0 || id.indexOf('veg_') === 0 || id.indexOf('fruit_') === 0 || id.indexOf('fat_') === 0 || id.indexOf('snack_') === 0 || id.indexOf('drink_') === 0 || id.indexOf('blank_shi') === 0) {
    src = PREDICT_SHI_META[id] || PREDICT_SHI_META.blank_shi;
  } else if (['study', 'knowledge', 'learning', '学', '识'].indexOf(cat) !== -1 || id.indexOf('study_') === 0 || id.indexOf('read_') === 0 || id.indexOf('watch_') === 0 || id.indexOf('take_') === 0 || id.indexOf('review_') === 0 || id.indexOf('foreign_') === 0 || id.indexOf('write_essay') === 0 || id.indexOf('problem_solving') === 0 || id.indexOf('code_practice') === 0 || id.indexOf('blank_study') === 0) {
    src = PREDICT_STUDY_META[id] || PREDICT_STUDY_META.blank_study;
  } else if (['work', 'career', '业', '事业', '工'].indexOf(cat) !== -1 || id.indexOf('work_') === 0 || id.indexOf('project_') === 0 || id.indexOf('code_commit') === 0 || id.indexOf('meeting_') === 0 || id.indexOf('doc_writing') === 0 || id.indexOf('customer_') === 0 || id.indexOf('design_') === 0 || id.indexOf('test_') === 0 || id.indexOf('review_') === 0 || id.indexOf('blank_work') === 0) {
    src = PREDICT_WORK_META[id] || PREDICT_WORK_META.blank_work;
  } else if (['debuff', 'vice', 'indulge', '放纵', '堕', '懒'].indexOf(cat) !== -1 || id.indexOf('debuff_') === 0 || id.indexOf('game_') === 0 || id.indexOf('binge_') === 0 || id.indexOf('late_night_') === 0 || id.indexOf('alcohol') === 0 || id.indexOf('skip_') === 0 || id.indexOf('oversleep') === 0 || id.indexOf('blank_debuff') === 0) {
    src = PREDICT_DEBUFF_META[id] || PREDICT_DEBUFF_META.blank_debuff;
  } else if (custom) {
    src = custom;
  } else {
    src = PREDICT_WU_META.blank_wu;
  }
  var s = src || {};
  var cals = parseFloat(s.caloriesPerUnit); if (isNaN(cals)) cals = 0;
  result.caloriesPerUnit = cals;
  if (s.nutrition && typeof s.nutrition === 'object') {
    var n = s.nutrition;
    var p = parseFloat(n.protein); if (isNaN(p)) p = 0;
    var cb = parseFloat(n.carbs); if (isNaN(cb)) cb = 0;
    var ft = parseFloat(n.fat); if (isNaN(ft)) ft = 0;
    result.nutrition = { protein: p, carbs: cb, fat: ft };
  }
  var m = parseFloat(s.minutesPerUnit); if (isNaN(m)) m = 0;
  result.minutesPerUnit = m;
  var k = parseFloat(s.knowledgePerUnit); if (isNaN(k)) k = 0;
  result.knowledgePerUnit = k;
  var o = parseFloat(s.outputPerUnit); if (isNaN(o)) o = 0;
  result.outputPerUnit = o;
  var tc = parseFloat(s.timeCostPerUnit); if (isNaN(tc)) tc = 0;
  result.timeCostPerUnit = tc;
  var ci = parseFloat(s.calorieIntakePerUnit); if (isNaN(ci)) ci = 0;
  result.calorieIntakePerUnit = ci;
  if (custom) {
    var c = custom;
    if (typeof c.caloriesPerUnit !== 'undefined') {
      var x = parseFloat(c.caloriesPerUnit); if (!isNaN(x)) result.caloriesPerUnit = x;
    }
    if (c.nutrition && typeof c.nutrition === 'object') {
      var np = parseFloat(c.nutrition.protein); if (!isNaN(np)) result.nutrition.protein = np;
      var nc = parseFloat(c.nutrition.carbs); if (!isNaN(nc)) result.nutrition.carbs = nc;
      var nf = parseFloat(c.nutrition.fat); if (!isNaN(nf)) result.nutrition.fat = nf;
    }
    var mu = parseFloat(c.minutesPerUnit); if (!isNaN(mu)) result.minutesPerUnit = mu;
    var ku = parseFloat(c.knowledgePerUnit); if (!isNaN(ku)) result.knowledgePerUnit = ku;
    var ou = parseFloat(c.outputPerUnit); if (!isNaN(ou)) result.outputPerUnit = ou;
    var tu = parseFloat(c.timeCostPerUnit); if (!isNaN(tu)) result.timeCostPerUnit = tu;
    var ciu = parseFloat(c.calorieIntakePerUnit); if (!isNaN(ciu)) result.calorieIntakePerUnit = ciu;
  }
  return result;
}

function _predictFlattenActivities(template) {
  var res = [];
  if (!template || typeof template !== 'object') return res;
  if (Array.isArray(template.activities)) {
    template.activities.forEach(function(a) { if (a) res.push(a); });
  }
  if (Array.isArray(template.timeSlots)) {
    template.timeSlots.forEach(function(slot) {
      if (slot && Array.isArray(slot.activities)) {
        slot.activities.forEach(function(a) { if (a) res.push(a); });
      }
    });
  }
  if (template.type === 'pool' && Array.isArray(template.poolActivities)) {
    template.poolActivities.forEach(function(a) { if (a) res.push(a); });
  }
  return res;
}

function _predictAggregateTemplate(template) {
  var activities = _predictFlattenActivities(template);
  var agg = {
    totalCalories: 0,
    nutrition: { protein: 0, carbs: 0, fat: 0, calories: 0 },
    studyMinutes: 0, workOutput: 0, debuffHours: 0,
    activityCount: activities.length
  };
  for (var i = 0; i < activities.length; i++) {
    var act = activities[i] || {};
    var cat = String(act.category || '').toLowerCase();
    var id = act.activityId || '';
    var meta = _predictUnifiedMeta(id, cat, act);
    var qty = 1;
    if (act.capacity && typeof act.capacity === 'object') {
      var v = parseFloat(act.capacity.value); if (!isNaN(v)) qty = v;
    } else {
      var qv = parseFloat(act.quantity || act.qty || act.value); if (!isNaN(qv)) qty = qv;
    }
    var factor = 1;
    var fv = parseFloat(act.factor); if (!isNaN(fv)) factor = fv;
    var progress = parseFloat(act.progress); if (isNaN(progress) || progress < 0) progress = 100;
    var ratio = progress / 100;
    var q = qty * factor * ratio;

    if (cat === 'shi' || cat === 'diet' || cat === 'nutrition' || cat === 'meal' || cat === 'food' || id.indexOf('shi_') === 0 || id.indexOf('meal_') === 0 || id.indexOf('protein_') === 0 || id.indexOf('veg_') === 0 || id.indexOf('fruit_') === 0 || id.indexOf('fat_') === 0 || id.indexOf('snack_') === 0 || id.indexOf('drink_') === 0 || id.indexOf('blank_shi') === 0) {
      agg.nutrition.protein += (meta.nutrition.protein || 0) * q;
      agg.nutrition.carbs += (meta.nutrition.carbs || 0) * q;
      agg.nutrition.fat += (meta.nutrition.fat || 0) * q;
      agg.nutrition.calories += (meta.caloriesPerUnit || 0) * q;
    } else {
      agg.totalCalories += (meta.caloriesPerUnit || 0) * q;
    }
    if (meta.minutesPerUnit) agg.studyMinutes += meta.minutesPerUnit * q;
    if (meta.outputPerUnit) agg.workOutput += meta.outputPerUnit * q;
    if (meta.timeCostPerUnit) agg.debuffHours += meta.timeCostPerUnit * q;
    if (meta.calorieIntakePerUnit) agg.nutrition.calories += meta.calorieIntakePerUnit * q;
  }
  agg.nutrition.protein = Math.round(agg.nutrition.protein * 10) / 10;
  agg.nutrition.carbs = Math.round(agg.nutrition.carbs * 10) / 10;
  agg.nutrition.fat = Math.round(agg.nutrition.fat * 10) / 10;
  agg.nutrition.calories = Math.round(agg.nutrition.calories * 10) / 10;
  agg.totalCalories = Math.round(agg.totalCalories * 10) / 10;
  agg.studyMinutes = Math.round(agg.studyMinutes * 10) / 10;
  agg.workOutput = Math.round(agg.workOutput * 10) / 10;
  agg.debuffHours = Math.round(agg.debuffHours * 10) / 10;
  return agg;
}

async function predictPlaylist(event, OPENID) {
  var id = event.id;
  if (!id) return { ok: false, error: '缺少歌单 id' };
  var chk = await verifyOwner(id, OPENID);
  if (chk.error) return { ok: false, error: chk.error };
  var doc = chk.doc;
  var items = Array.isArray(doc.items) ? doc.items.filter(function(it) { return it && it.enabled === true; }) : [];
  var localTemplates = Array.isArray(event.localTemplates) ? event.localTemplates : [];
  var localMap = {};
  localTemplates.forEach(function(t) { if (t && t.id) localMap[t.id] = t; });

  var result = {
    totalActivityScore: 0,
    totalNutritionScore: 0,
    totalScore: 0,
    reality: {
      totalCalories: 0,
      protein: 0, carbs: 0, fat: 0, calories: 0,
      studyMinutes: 0, workOutput: 0, debuffHours: 0
    },
    itemCount: 0,
    processed: [],
    failed: []
  };

  var optimal = doc.optimalTargets || null;
  if (!optimal) optimal = doc.settings && doc.settings.optimalTargets ? doc.settings.optimalTargets : null;

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var tid = String(it.templateId || '');
    var template = null;
    try {
      if (tid.indexOf('ctmpl_') === 0) {
        template = localMap[tid] || null;
      } else if (tid) {
        var r = await cloud.callFunction({
          name: 'template-manager',
          data: { action: 'getTemplateDetail', templateId: tid, _playlistPredict: true }
        });
        if (r && r.result && r.result.ok === true && r.result.template) {
          template = r.result.template;
        } else if (r && r.result && typeof r.result === 'object' && (r.result.id || r.result.name)) {
          template = r.result;
        }
      }
    } catch (e) {
      console.error('[predict] 获取模板失败 tid=' + tid, e && e.message);
      result.failed.push({ templateId: tid, error: (e && e.message) || 'error' });
      continue;
    }
    if (!template) {
      result.failed.push({ templateId: tid, error: 'not_found' });
      continue;
    }
    var tOptimal = template.optimalTargets || optimal;
    var agg = _predictAggregateTemplate(template);
    var actScore = _predictActivityScore(agg.totalCalories, tOptimal);
    var nutScore = _predictNutritionScore(agg.nutrition, tOptimal);
    result.totalActivityScore = Math.round((result.totalActivityScore + actScore) * 10) / 10;
    result.totalNutritionScore = Math.round((result.totalNutritionScore + nutScore) * 10) / 10;
    result.reality.totalCalories += agg.totalCalories;
    result.reality.protein += agg.nutrition.protein;
    result.reality.carbs += agg.nutrition.carbs;
    result.reality.fat += agg.nutrition.fat;
    result.reality.calories += agg.nutrition.calories;
    result.reality.studyMinutes += agg.studyMinutes;
    result.reality.workOutput += agg.workOutput;
    result.reality.debuffHours += agg.debuffHours;
    result.itemCount += 1;
    result.processed.push({
      templateId: tid,
      name: template.name || '',
      activityScore: actScore,
      nutritionScore: nutScore,
      agg: agg
    });
  }

  result.totalScore = Math.round((result.totalActivityScore + result.totalNutritionScore) * 10) / 10;
  var rl = result.reality;
  rl.totalCalories = Math.round(rl.totalCalories * 10) / 10;
  rl.protein = Math.round(rl.protein * 10) / 10;
  rl.carbs = Math.round(rl.carbs * 10) / 10;
  rl.fat = Math.round(rl.fat * 10) / 10;
  rl.calories = Math.round(rl.calories * 10) / 10;
  rl.studyMinutes = Math.round(rl.studyMinutes * 10) / 10;
  rl.workOutput = Math.round(rl.workOutput * 10) / 10;
  rl.debuffHours = Math.round(rl.debuffHours * 10) / 10;
  return { ok: true, data: result };
}
