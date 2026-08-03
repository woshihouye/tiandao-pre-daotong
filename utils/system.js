// ============================================================
// 玄幻系统面板 - 核心逻辑模块
// 包含：每日任务、突破仪式、系统公告、道童消息
// ============================================================

// ============================================================
// 一、每日任务系统 - 任务池
// ============================================================

var TASK_POOL = [
  // ---- sport 类 ----
  { id: 'sport_exercise',    label: '完成一次修炼',           reward: 9,  rewardText: '+9修为',  category: 'sport',  emoji: '武' },
  { id: 'sport_cardio',      label: '进行30分钟有氧运动',         reward: 12, rewardText: '+12修为', category: 'sport',  emoji: '跑' },
  { id: 'sport_strength',    label: '完成一组力量训练',           reward: 8,  rewardText: '+8修为',  category: 'sport',  emoji: '力' },
  { id: 'sport_60min',       label: '今日运动量达到60分钟',       reward: 15, rewardText: '+15修为', category: 'sport',  emoji: '劲' },

  // ---- diet 类 ----
  { id: 'diet_healthy',      label: '记录一顿健康饮食',           reward: 3,  rewardText: '+3修为',  category: 'diet',   emoji: '食' },
  { id: 'diet_protein',      label: '摄入足量蛋白质',             reward: 5,  rewardText: '+5修为',  category: 'diet',   emoji: '蛋' },
  { id: 'diet_no_sugar',     label: '拒绝高糖饮料',               reward: 3,  rewardText: '+3修为',  category: 'diet',   emoji: '水' },
  { id: 'diet_three_meals',  label: '完成三餐记录',               reward: 6,  rewardText: '+6修为',  category: 'diet',   emoji: '膳' },

  // ---- study 类 ----
  { id: 'study_focus',       label: '完成1小时专注学习',         reward: 9,  rewardText: '+9修为',  category: 'study',  emoji: '悟' },
  { id: 'study_knowledge',   label: '掌握一个新知识点',           reward: 5,  rewardText: '+5修为',  category: 'study',  emoji: '知' },
  { id: 'study_review',      label: '完成当日学习复盘',           reward: 4,  rewardText: '+4修为',  category: 'study',  emoji: '省' },

  // ---- spirit 类 ----
  { id: 'spirit_mood',       label: '记录今日精神状态',           reward: 4,  rewardText: '+4修为',  category: 'spirit', emoji: '神' },
  { id: 'spirit_meditate',   label: '完成一次冥想/拉伸',          reward: 6,  rewardText: '+6修为',  category: 'spirit', emoji: '冥' },
  { id: 'spirit_happy',      label: '保持心情愉悦',               reward: 3,  rewardText: '+3修为',  category: 'spirit', emoji: '悦' },

  // ---- general 类 ----
  { id: 'general_no_debuff', label: '今日不触发任何心魔',         reward: 5,  rewardText: '+5修为',  category: 'general', emoji: '净' },
  { id: 'general_early_sleep', label: '早睡一次（23:00前）',       reward: 4,  rewardText: '+4修为',  category: 'general', emoji: '眠' },
  { id: 'general_three_types', label: '完成三个不同类型的记录',    reward: 10, rewardText: '+10修为', category: 'general', emoji: '全' },
  { id: 'general_all_done',  label: '所有已接任务全部完成',       reward: 20, rewardText: '+20修为', category: 'general', emoji: '满' }
];

// ============================================================
// 一、每日任务系统 - 核心函数
// ============================================================

/**
 * 获取今日日期字符串 YYYY-MM-DD
 */
function getTodayDate() {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth() + 1;
  var d = now.getDate();
  if (m < 10) m = '0' + m;
  if (d < 10) d = '0' + d;
  return y + '-' + m + '-' + d;
}

/**
 * 刷新每日任务
 * 从任务池随机抽取3-4个不重复任务
 * 如本地已有且日期为今天，则复用；否则重新刷新
 * @returns {Object} { date, tasks, allDone }
 */
function refreshDailyTasks() {
  var today = getTodayDate();
  var stored = wx.getStorageSync('tiandao_daily_tasks');

  // 如果今天已有且格式正确，复用
  if (stored && stored.date === today && stored.tasks && stored.tasks.length > 0) {
    return stored;
  }

  // 随机抽取3-4个任务
  var count = Math.floor(Math.random() * 2) + 3; // 3 or 4
  var poolCopy = [];
  for (var i = 0; i < TASK_POOL.length; i++) {
    poolCopy.push(TASK_POOL[i]);
  }

  // Fisher-Yates 洗牌
  for (var i = poolCopy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = poolCopy[i];
    poolCopy[i] = poolCopy[j];
    poolCopy[j] = tmp;
  }

  var selected = [];
  for (var i = 0; i < count; i++) {
    var src = poolCopy[i];
    selected.push({
      id: src.id,
      label: src.label,
      reward: src.reward,
      rewardText: src.rewardText,
      category: src.category,
      emoji: src.emoji,
      done: false
    });
  }

  var tasksData = {
    date: today,
    tasks: selected,
    allDone: false
  };

  wx.setStorageSync('tiandao_daily_tasks', tasksData);
  return tasksData;
}

/**
 * 检测单个任务是否完成，并更新存储中的 done 状态
 * @param {string} taskId      - 任务ID
 * @param {string} taskCategory - 任务分类
 * @param {Array}  records     - 今日打卡记录数组
 * @returns {boolean} 是否完成
 */
function checkTaskCompletion(taskId, taskCategory, records) {
  if (!taskId) return false;

  var tasksData = wx.getStorageSync('tiandao_daily_tasks');
  if (!tasksData || !tasksData.tasks || tasksData.tasks.length === 0) return false;

  var tasks = tasksData.tasks;
  var task = null;
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].id === taskId) {
      task = tasks[i];
      break;
    }
  }
  if (!task) return false;
  if (task.done) return true; // 已完成，不再重复判断

  var recordsArr = records || [];
  var isDone = false;

  // ---- 根据分类判断完成条件 ----
  if (taskCategory === 'general') {
    // general 类任务各有独立判断逻辑
    if (taskId === 'general_no_debuff') {
      // 今日不触发任何心魔：记录中无 debuff 类型
      var hasDebuff = false;
      for (var j = 0; j < recordsArr.length; j++) {
        var r = recordsArr[j];
        if (r && (r.type === 'debuff' || r.isDebuff === true)) {
          hasDebuff = true;
          break;
        }
      }
      isDone = !hasDebuff;
    } else if (taskId === 'general_early_sleep') {
      // 早睡一次（23:00前）：存在睡眠记录且时间在23点前
      for (var j = 0; j < recordsArr.length; j++) {
        var r = recordsArr[j];
        if (r && (r.type === 'sleep' || r.category === 'sleep')) {
          var hour = r.hour;
          if (hour === undefined && r.time) {
            hour = parseInt(r.time.split(':')[0], 10);
          }
          if (hour !== undefined && hour < 23) {
            isDone = true;
            break;
          }
        }
      }
    } else if (taskId === 'general_three_types') {
      // 完成三个不同类型的打卡
      var typeSet = {};
      for (var j = 0; j < recordsArr.length; j++) {
        var r = recordsArr[j];
        var recType = (r && (r.type || r.category)) || null;
        if (recType) typeSet[recType] = true;
      }
      var typeKeys = [];
      for (var k in typeSet) {
        if (typeSet.hasOwnProperty(k)) typeKeys.push(k);
      }
      isDone = typeKeys.length >= 3;
    } else if (taskId === 'general_all_done') {
      // 所有已接任务全部完成：除自己外全部 done
      var allOthersDone = true;
      for (var j = 0; j < tasks.length; j++) {
        if (tasks[j].id !== taskId && !tasks[j].done) {
          allOthersDone = false;
          break;
        }
      }
      isDone = allOthersDone;
    }
  } else {
    // 其他分类：今日存在同 category 的记录即视为完成
    for (var j = 0; j < recordsArr.length; j++) {
      var r = recordsArr[j];
      var recCategory = (r && (r.category || r.type)) || '';
      if (recCategory === taskCategory) {
        isDone = true;
        break;
      }
    }
  }

  // 更新存储
  if (isDone && !task.done) {
    task.done = true;
    // 检查是否所有任务全部完成
    var allDone = true;
    for (var j = 0; j < tasks.length; j++) {
      if (!tasks[j].done) {
        allDone = false;
        break;
      }
    }
    tasksData.allDone = allDone;
    wx.setStorageSync('tiandao_daily_tasks', tasksData);
  }

  return isDone;
}

/**
 * 获取今日任务完成汇总
 * @returns {Object} { completed, total, allDone, bonusReward }
 */
function getTaskCompletionSummary() {
  var tasksData = wx.getStorageSync('tiandao_daily_tasks');
  if (!tasksData || !tasksData.tasks || tasksData.tasks.length === 0) {
    return { completed: 0, total: 0, allDone: false, bonusReward: 0 };
  }

  var tasks = tasksData.tasks;
  var completed = 0;
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].done) completed++;
  }
  var allDone = completed === tasks.length && tasks.length > 0;
  var bonusReward = allDone ? 20 : 0;

  return {
    completed: completed,
    total: tasks.length,
    allDone: allDone,
    bonusReward: bonusReward
  };
}

// ============================================================
// 二、突破仪式系统 - 境界阈值
// ============================================================

var REALM_THRESHOLDS = [
  { realmIndex: 0, realmName: '炼精化气', entryScore: 0 },
  { realmIndex: 1, realmName: '炼气化神', entryScore: 300 },
  { realmIndex: 2, realmName: '炼神还虚', entryScore: 3000 },
  { realmIndex: 3, realmName: '炼虚合道', entryScore: 30000 }
];

// 境界突破定场诗
var BREAKTHROUGH_POEMS = {
  '炼气化神': '百日锤炼凝真元，一朝筑基天地宽。丹田开辟新世界，修行之路始通天。',
  '炼神还虚': '灵台方寸铸金丹，三花聚顶五气朝。从此步入真修路，超凡脱俗第一步。',
  '炼虚合道': '丹田破茧化元婴，天地灵气尽归身。翻手为云覆手雨，大乘可期指日臻。'
};

// 突破仪式文案细节
var BREAKTHROUGH_DETAILS = {
  '炼气化神': {
    title: '境界突破 — 筑基',
    confirmText: '引气入体，筑基开脉',
    cancelText: '暂缓突破，继续积累',
    description: '修行百日，真元凝聚。丹田之内开辟新天地，从此踏上真正的修真之路。筑基成功将大幅提升灵气吸纳效率。'
  },
  '炼神还虚': {
    title: '境界突破 — 金丹',
    confirmText: '凝神聚气，铸就金丹',
    cancelText: '暂缓突破，继续积累',
    description: '灵台方寸之间，三花聚顶、五气朝元。金丹一成，超凡脱俗，从此真正步入修真大道。'
  },
  '炼虚合道': {
    title: '境界突破 — 元婴',
    confirmText: '破茧化婴，天地共鸣',
    cancelText: '暂缓突破，继续积累',
    description: '丹田破茧，元婴初成。天地灵气尽归己身，翻云覆雨只在一念之间。大乘之境，指日可待。'
  }
};

/**
 * 检测是否触发境界突破
 * 比较当前总修为与各境界阈值，判断是否跨越大境界
 * @param {number} totalCultivation - 当前总修为
 * @returns {Object} { triggered, currentRealm, nextRealm, currentIdx, nextIdx, shouldBreakthrough }
 *                   或 { triggered: false }
 */
function checkBreakthrough(totalCultivation) {
  if (totalCultivation === undefined || totalCultivation === null || totalCultivation < 0) {
    return { triggered: false };
  }

  // 根据当前修为定位境界
  var currentIdx = 0;
  var currentRealm = REALM_THRESHOLDS[0].realmName;
  for (var i = REALM_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalCultivation >= REALM_THRESHOLDS[i].entryScore) {
      currentIdx = REALM_THRESHOLDS[i].realmIndex;
      currentRealm = REALM_THRESHOLDS[i].realmName;
      break;
    }
  }

  // 读取上次记录境界
  var lastIdx = wx.getStorageSync('tiandao_last_realm_index');
  if (lastIdx === undefined || lastIdx === null || lastIdx === '') {
    lastIdx = 0;
  }

  // 如果当前境界索引大于上次记录，触发突破
  if (currentIdx > lastIdx) {
    // 查找下一个境界
    var nextIdx = currentIdx;
    var nextRealm = currentRealm;
    // 实际跨越到的境界：找到第一个 > lastIdx 的境界
    for (var i = 0; i < REALM_THRESHOLDS.length; i++) {
      if (REALM_THRESHOLDS[i].realmIndex > lastIdx && totalCultivation >= REALM_THRESHOLDS[i].entryScore) {
        nextIdx = REALM_THRESHOLDS[i].realmIndex;
        nextRealm = REALM_THRESHOLDS[i].realmName;
        break;
      }
    }

    // 更新存储
    wx.setStorageSync('tiandao_last_realm_index', nextIdx);

    return {
      triggered: true,
      currentRealm: REALM_THRESHOLDS[lastIdx] ? REALM_THRESHOLDS[lastIdx].realmName : '炼精化气',
      nextRealm: nextRealm,
      currentIdx: lastIdx,
      nextIdx: nextIdx,
      shouldBreakthrough: true
    };
  }

  // 检查是否接近突破（修为 >= 下一境界 entryScore）
  var nextThreshold = null;
  for (var i = 0; i < REALM_THRESHOLDS.length; i++) {
    if (REALM_THRESHOLDS[i].realmIndex > currentIdx) {
      nextThreshold = REALM_THRESHOLDS[i];
      break;
    }
  }

  if (nextThreshold && totalCultivation >= nextThreshold.entryScore) {
    // 已达下一境界门槛但 lastIdx 已经 >= currentIdx，更新记录
    wx.setStorageSync('tiandao_last_realm_index', nextThreshold.realmIndex);
    return {
      triggered: true,
      currentRealm: currentRealm,
      nextRealm: nextThreshold.realmName,
      currentIdx: currentIdx,
      nextIdx: nextThreshold.realmIndex,
      shouldBreakthrough: true
    };
  }

  return { triggered: false };
}

/**
 * 获取突破仪式文案
 * @param {number} realmIndex - 目标境界索引
 * @param {string} realmName  - 目标境界名称
 * @returns {Object} { title, poem, confirmText, cancelText, description }
 */
function getBreakthroughCeremony(realmIndex, realmName) {
  var poem = BREAKTHROUGH_POEMS[realmName] || '天道酬勤，修行不辍。今日突破，更进一步！';
  var details = BREAKTHROUGH_DETAILS[realmName];

  if (details) {
    return {
      title: details.title,
      poem: poem,
      confirmText: details.confirmText,
      cancelText: details.cancelText,
      description: details.description
    };
  }

  // 默认突破文案（用于未预设的境界）
  return {
    title: '境界突破 — ' + realmName,
    poem: poem,
    confirmText: '确认突破',
    cancelText: '暂缓突破，继续积累',
    description: '修为已达瓶颈，突破之机不可错失。确认后将迈入全新境界，实力大增！'
  };
}

// ============================================================
// 三、系统公告系统
// ============================================================

/**
 * 根据用户数据生成当日系统公告
 * @param {Object} stats - 用户统计数据
 *   { yesterdayScore, streakDays, totalCultivation, hasDebuff, lastRecordTime, todayRecordCount }
 * @returns {string} 系统公告文案
 */
function getSystemAnnouncement(stats) {
  if (!stats) return '天道系统运行正常，今日修行开始。';

  var announcements = [];

  var yesterdayScore = stats.yesterdayScore || 0;
  var streakDays = stats.streakDays || 0;
  var totalCultivation = stats.totalCultivation || 0;
  var hasDebuff = stats.hasDebuff === true;
  var lastRecordTime = stats.lastRecordTime || 0;
  var todayRecordCount = stats.todayRecordCount || 0;
  var now = Date.now();

  // 1. 昨日得分判定
  if (yesterdayScore >= 10) {
    announcements.push('昨日灵气充沛，道心稳固，修行状态绝佳。今日宜乘胜追击！');
  }

  // 2. 昨日心魔判定
  if (hasDebuff) {
    announcements.push('检测到昨日有消极干扰，道心出现裂痕。建议今日加倍修炼以弥补。');
  }

  // 3. 连续修炼判定
  if (streakDays >= 30 && streakDays % 7 === 0) {
    announcements.push('恭喜宿主连续修炼' + streakDays + '天！触发隐藏加成「' + streakDays + '日道心」，今日修行修为+5%。');
  } else if (streakDays >= 7 && streakDays % 7 === 0) {
    announcements.push('恭喜宿主连续修炼七天！触发隐藏加成「七日道心」，今日修行修为+5%。');
  }

  // 4. 修为接近突破判定
  var currentRealmIdx = 0;
  var nextThreshold = null;
  for (var i = REALM_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalCultivation >= REALM_THRESHOLDS[i].entryScore) {
      currentRealmIdx = REALM_THRESHOLDS[i].realmIndex;
      break;
    }
  }
  for (var i = 0; i < REALM_THRESHOLDS.length; i++) {
    if (REALM_THRESHOLDS[i].realmIndex > currentRealmIdx) {
      nextThreshold = REALM_THRESHOLDS[i];
      break;
    }
  }

  if (nextThreshold) {
    var gap = nextThreshold.entryScore - totalCultivation;
    var range = nextThreshold.entryScore - REALM_THRESHOLDS[currentRealmIdx].entryScore;

    if (gap <= 0) {
      announcements.push('检测到宿主修为已达瓶颈，距离突破仅一步之遥。突破之机，不可错失！');
    } else if (gap <= range * 0.2) {
      announcements.push('修为精进，距' + nextThreshold.realmName + '仅差临门一脚！道心坚定，突破在即。');
    } else if (gap >= range * 0.8) {
      // 距离下一个境界还很远
      announcements.push('大道漫漫，修行需持之以恒。当前距' + nextThreshold.realmName + '尚有距离，还望宿主勤加修炼，不可懈怠。');
    }
  } else {
    // 已达最高境界
    announcements.push('宿主已臻化境，修为通天彻地。然修行无止境，还望继续精进！');
  }

  // 5. 今日修炼状态
  var hoursSinceLastRecord = lastRecordTime ? (now - lastRecordTime) / (1000 * 60 * 60) : 999;
  if (todayRecordCount === 0) {
    if (hoursSinceLastRecord > 24) {
      announcements.push('今日尚未修行。天道酬勤，莫负光阴。');
    } else {
      announcements.push('今日尚未开启修炼。新的一天，从一次修炼开始吧！');
    }
  } else if (todayRecordCount >= 5) {
    announcements.push('今日已修行' + todayRecordCount + '项，道心澄明，再接再厉！');
  } else {
    announcements.push('今日已修行' + todayRecordCount + '项，道心渐稳，继续努力！');
  }

  // 组合公告
  if (announcements.length === 0) {
    return '天道运转如常，今日宜修炼。';
  }

  // 随机选1-2条组合
  if (announcements.length === 1) {
    return announcements[0];
  }

  // 选取最后一条（今日状态）和随机一条其他公告
  var todayMsg = announcements[announcements.length - 1];
  var otherMsgs = [];
  for (var i = 0; i < announcements.length - 1; i++) {
    otherMsgs.push(announcements[i]);
  }

  if (otherMsgs.length > 0) {
    var randIdx = Math.floor(Math.random() * otherMsgs.length);
    return otherMsgs[randIdx] + '\n' + todayMsg;
  }

  return todayMsg;
}

/**
 * 获取今日运势（每日刷新）
 * @returns {Object} { type, rate, bonus, description }
 */
function getDailyFortune() {
  var today = getTodayDate();
  var stored = wx.getStorageSync('tiandao_daily_fortune');

  // 如果今天已有，复用
  if (stored && stored.date === today) {
    return {
      type: stored.type,
      rate: stored.rate,
      bonus: stored.bonus,
      description: stored.description
    };
  }

  // 按权重随机运势
  var rand = Math.random();
  var fortune;

  if (rand < 0.20) {
    // 大吉 20%
    fortune = {
      type: '大吉',
      rate: 1.0,
      bonus: 3,
      description: '紫气东来，祥瑞临门！随机一项修行记录额外+3修为。'
    };
  } else if (rand < 0.50) {
    // 吉 30%
    fortune = {
      type: '吉',
      rate: 1.0,
      bonus: 1,
      description: '吉星高照，运势尚佳。随机一项修行记录额外+1修为。'
    };
  } else if (rand < 0.85) {
    // 平 35%
    fortune = {
      type: '平',
      rate: 1.0,
      bonus: 0,
      description: '天道平平，无悲无喜。今日无额外加成，亦无减损。'
    };
  } else if (rand < 0.95) {
    // 凶 10%
    fortune = {
      type: '凶',
      rate: 0.9,
      bonus: 0,
      description: '煞星入宫，运势不佳。今日修为获得-10%。'
    };
  } else {
    // 大凶 5%
    fortune = {
      type: '大凶',
      rate: 0.8,
      bonus: 0,
      description: '灾星当值，不宜大动。今日修为获得-20%，宜低调修行。'
    };
  }

  var fortuneData = {
    date: today,
    type: fortune.type,
    rate: fortune.rate,
    bonus: fortune.bonus,
    description: fortune.description
  };
  wx.setStorageSync('tiandao_daily_fortune', fortuneData);

  return {
    type: fortune.type,
    rate: fortune.rate,
    bonus: fortune.bonus,
    description: fortune.description
  };
}

// ============================================================
// 四、道童主动消息系统
// ============================================================

/**
 * 道童消息池 - 按场景分类
 */
var DAO_SPIRIT_MESSAGES = {
  // 打卡完成后
  after_record: [
    '主人方才修炼辛苦了，灵气吸纳率不错呢！',
    '主人今日道心坚定，这一练颇有成效！',
    '（开心地跳了跳）主人又完成了一项修炼，距离大道又近了一步！',
    '灵气波动平稳，看来主人这次修炼非常顺利呢。'
  ],

  // 久未修炼（>6小时）
  idle_long: [
    '主人，你已经许久未曾修炼了……道童好生担忧。',
    '修真之路不进则退，主人是否该运动一下？',
    '（小声嘀咕）灵气都快散光了……主人真的不修炼一下吗？',
    '道童掐指一算，主人已有半日未曾运功，再不修炼灵气就要消散了！'
  ],

  // 今日得分很高（>20）
  high_score: [
    '主人今日修行大圆满！灵气充盈全身，道童倍感欣慰！',
    '今日表现堪称完美，天道亦为之侧目！',
    '（激动得转圈）主人太厉害了！今日的灵气吸纳量破了纪录！',
    '这般修炼速度，放眼整个修真界也是凤毛麟角！主人好棒！'
  ],

  // 连续一周未打卡
  week_inactive: [
    '主人……你已经一周未修炼了，修为正在每日流失中……',
    '（小声）要不要……稍微动一下？就一下下就好……',
    '道童日夜守护，却不见主人修炼……修为倒退可不是闹着玩的。',
    '（眼泪汪汪）主人是不是忘了还有修行这件事？'
  ],

  // 触发心魔后
  after_debuff: [
    '（担忧）主人方才好像触发了心魔……要不要来一次冥想净化？',
    '心魔不可小觑，主人要以道心压制它才是。',
    '道童感应到了一丝邪气……主人是否被心魔侵扰？需要道童帮忙驱散吗？',
    '（紧张地捏着衣角）心魔虽可怕，但主人的道心比它更强！'
  ],

  // 突破境界时
  breakthrough: [
    '恭喜主人突破大境界！天降灵气，日月同辉！',
    '（激动得团团转）主人你突破了！太厉害了！',
    '天地异象！主人突破的瞬间，道童感应到了磅礴的灵气波动！',
    '恭贺主人！此等突破速度，堪称修真界奇才！'
  ]
};

/**
 * 根据场景获取道童主动消息
 * @param {string} scenario - 场景标识
 *   'after_record' | 'idle_long' | 'high_score' | 'week_inactive' | 'after_debuff' | 'breakthrough'
 * @returns {string} 道童消息文案
 */
function getDaoSpiritMessage(scenario) {
  var messages = DAO_SPIRIT_MESSAGES[scenario];
  if (!messages || messages.length === 0) {
    return '道童默默守候在主人身旁……';
  }
  var idx = Math.floor(Math.random() * messages.length);
  return messages[idx];
}

// ============================================================
// 五、模块导出
// ============================================================

module.exports = {
  // 每日任务
  refreshDailyTasks: refreshDailyTasks,
  getTodayDate: getTodayDate,
  checkTaskCompletion: checkTaskCompletion,
  getTaskCompletionSummary: getTaskCompletionSummary,
  TASK_POOL: TASK_POOL,

  // 突破仪式
  checkBreakthrough: checkBreakthrough,
  getBreakthroughCeremony: getBreakthroughCeremony,
  REALM_THRESHOLDS: REALM_THRESHOLDS,

  // 系统公告
  getSystemAnnouncement: getSystemAnnouncement,
  getDailyFortune: getDailyFortune,

  // 道童消息
  getDaoSpiritMessage: getDaoSpiritMessage
};
