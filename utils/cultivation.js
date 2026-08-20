// 天道修行 - 修为境界核心系统 - v1.0.2
// 包含：境界计算、修为增减、模板匹配、宗门加成等核心逻辑

const REALMS = [
  { id: 'lianqi', name: '炼精化气', minScore: 0, maxScore: 299, stages: 9, perStage: 33, color: '#9ca3af' },
  { id: 'zhuji', name: '炼气化神', minScore: 300, maxScore: 2999, stages: 9, perStage: 300, color: '#22c55e' },
  { id: 'jindan', name: '炼神还虚', minScore: 3000, maxScore: 29999, stages: 9, perStage: 3000, color: '#eab308' },
  { id: 'yuanying', name: '炼虚合道', minScore: 30000, maxScore: Infinity, stages: 9, perStage: 10000, color: '#8b5cf6' }
];

const CULTIVATION_SYSTEM_KEY = 'tiandao_cultivation_system'

const CULTIVATION_SYSTEMS = {
  traditional: ['炼精化气', '炼气化神', '炼神还虚', '炼虚合道', '化神境', '炼虚境', '合体境', '大乘境', '渡劫境', '人仙境', '地仙境', '天仙境', '金仙境', '大罗金仙境', '准圣境', '圣人境'],
  body: ['炼体境', '锻骨境', '玉髓境', '金身境', '不灭境', '破碎虚空', '合体境', '大乘境', '渡劫境', '人仙境', '地仙境', '天仙境', '金仙境', '大罗金仙境', '准圣境', '圣人境'],
  beauty: ['淬颜境', '玉容境', '凝脂境', '倾世境', '化神境', '炼虚境', '合体境', '大乘境', '渡劫境', '人仙境', '地仙境', '天仙境', '金仙境', '大罗金仙境', '准圣境', '圣人境'],
  worldly: ['学徒境', '熟手境', '骨干境', '大佬境', '化神境', '炼虚境', '合体境', '大乘境', '渡劫境', '人仙境', '地仙境', '天仙境', '金仙境', '大罗金仙境', '准圣境', '圣人境'],
  wuxia: ['后天境', '先天境', '宗师境', '大宗师境', '天人境', '通玄境', '武尊境', '武帝境', '武圣境', '武神境', '人王境', '地皇境', '天尊境', '武祖境', '亚圣境', '至圣境'],
  ninja: ['下忍', '中忍', '特别上忍', '上忍', '精英上忍', '影级', '超影级', '六道入门', '六道级', '六道巅峰', '半神级', '神级', '大筒木下阶', '大筒木中阶', '大筒木上阶', '大筒木始祖'],
  knight: ['见习骑士', '正式骑士', '青铜骑士', '白银骑士', '黄金骑士', '大地骑士', '天空骑士', '圣骑士', '龙骑士', '传奇骑士', '圣域骑士', '半神骑士', '下位神', '中位神', '上位神', '创世神'],
  sequence: ['序列9', '序列8', '序列7', '序列6', '序列5', '序列4', '序列3', '序列2', '序列1', '真神门槛', '真神', '双途径真神', '旧日', '外神', '支柱级', '源堡之主'],
  cthulhu: ['懵懂凡人', '浅度接触', '深度沉迷', '密教学徒', '密教祭司', '血脉觉醒', '信徒核心', '黄衣使徒', '旧日仆从', '旧神选民', '外神眷者', '族群领主', '食尸鬼之王', '旧日支配者', '外神使者', '至高外神']
}

const CULTIVATION_SYSTEM_OPTIONS = [
  { key: 'traditional', label: '传统修仙' },
  { key: 'body', label: '体修炼体' },
  { key: 'beauty', label: '养气容颜' },
  { key: 'worldly', label: '入世修行' },
  { key: 'wuxia', label: '武侠江湖' },
  { key: 'ninja', label: '忍者传承' },
  { key: 'knight', label: '西幻骑士' },
  { key: 'sequence', label: '诡秘序列' },
  { key: 'cthulhu', label: '克苏鲁密教' }
]

const DEBUFF_SEVERITY = {
  stayUp: { desc: '熬夜', deduct: 10 },
  smokeDrink: { desc: '抽烟酗酒', deduct: 30 },
  overeat: { desc: '暴食放纵', deduct: 25 },
  procrastinate: { desc: '拖延', deduct: 15 }
};

const TEMPLATE_TAG_MAP = {
  fatLoss: '减脂',
  muscle: '增肌',
  health: '养生'
};

function calculateRealm(score) {
  for (let i = REALMS.length - 1; i >= 0; i--) {
    if (score >= REALMS[i].minScore) {
      const realm = REALMS[i];
      const progressInRealm = score - realm.minScore;
      const stage = Math.min(9, Math.floor(progressInRealm / realm.perStage) + 1);
      const nextStageScore = realm.minScore + stage * realm.perStage;
      const remaining = nextStageScore - score;
      const levelIndex = getRealmLevelIndex(i, stage);
      
      return {
        ...realm,
        baseName: realm.name,
        name: getRealmDisplayName(levelIndex),
        stage,
        levelIndex,
        progressInRealm,
        nextStageScore,
        remaining
      };
    }
  }
  return REALMS[0];
}

function getSelectedCultivationSystem() {
  if (typeof wx === 'undefined' || typeof wx.getStorageSync !== 'function') {
    return 'traditional'
  }
  const key = wx.getStorageSync(CULTIVATION_SYSTEM_KEY)
  return CULTIVATION_SYSTEMS[key] ? key : 'traditional'
}

function setSelectedCultivationSystem(systemKey = 'traditional') {
  const nextKey = CULTIVATION_SYSTEMS[systemKey] ? systemKey : 'traditional'
  if (typeof wx !== 'undefined' && typeof wx.setStorageSync === 'function') {
    wx.setStorageSync(CULTIVATION_SYSTEM_KEY, nextKey)
  }
  return nextKey
}

function getRealmLevelIndex(realmIndex, stage) {
  const totalMinorStages = REALMS.length * 9
  const currentMinorStage = (realmIndex * 9) + stage
  return Math.min(16, Math.max(1, Math.ceil((currentMinorStage / totalMinorStages) * 16)))
}

function getRealmDisplayName(levelIndex, systemKey) {
  const activeSystem = CULTIVATION_SYSTEMS[systemKey] ? systemKey : getSelectedCultivationSystem()
  const names = CULTIVATION_SYSTEMS[activeSystem] || CULTIVATION_SYSTEMS.traditional
  return names[Math.max(0, Math.min(15, Number(levelIndex || 1) - 1))]
}

function calculateDailyCultivation(baseScore, templateMatch, isSectMajor) {
  let cultivation = 20;
  cultivation += baseScore;
  
  let multiplier = 1;
  if (templateMatch >= 80) multiplier = 1.5;
  else if (templateMatch >= 60) multiplier = 1;
  else multiplier = 0.5;
  
  if (isSectMajor) {
    multiplier *= 1.05;
  }
  
  cultivation = Math.floor(cultivation * multiplier);
  return cultivation;
}

function calculatePenalty(totalScore, daysSinceLastCheckIn, hasSevereDebuff, debuffType) {
  let penalty = 0;
  
  if (daysSinceLastCheckIn >= 3) {
    penalty += Math.floor(totalScore * 0.01 * (daysSinceLastCheckIn - 2));
  }
  
  if (hasSevereDebuff && debuffType) {
    penalty += DEBUFF_SEVERITY[debuffType]?.deduct || 10;
  }
  
  if (daysSinceLastCheckIn >= 7) {
    penalty += Math.floor(totalScore * 0.1);
  }
  
  return penalty;
}

function getTemplateGrade(learners) {
  let grade = 'ren', stage = 1;
  
  if (learners >= 1000) {
    grade = 'tian';
    stage = Math.min(9, Math.floor(learners / 1000) + 1);
  } else if (learners >= 100) {
    grade = 'di';
    stage = Math.min(9, Math.floor(learners / 100) + 1);
  } else {
    stage = Math.min(9, Math.floor(learners / 10) + 1);
  }
  
  const gradeNames = { ren: '人品', di: '地品', tian: '天品' };
  const colors = { ren: '#9ca3af', di: '#3b82f6', tian: '#efb810' };
  
  return {
    grade,
    stage,
    name: `${gradeNames[grade]}-${stage}阶`,
    color: colors[grade]
  };
}

function calculateTemplateMatch(dailyData) {
  const exerciseRate = dailyData.exerciseCompletion || 0;
  const dietMatch = dailyData.dietMatch || 0;
  const scheduleRate = dailyData.scheduleCompliance || 0;
  const continuity = dailyData.continuity || 0;
  
  const matchScore = (
    exerciseRate * 0.4 +
    dietMatch * 0.35 +
    scheduleRate * 0.15 +
    continuity * 0.1
  ) * 100;
  
  return Math.round(matchScore);
}

function estimateTemplateDays(totalProgress, dailyMatch) {
  if (!dailyMatch) {
    return 99;
  }

  const remain = Math.max(0, 100 - totalProgress);
  return Math.max(1, Math.ceil(remain / Math.max(1, dailyMatch / 10)));
}

function buildUserStats(records) {
  const sortedDates = [...new Set(records.map((item) => item.date))].sort().reverse();
  let continuousDays = 0;
  let maxBreakDays = 0;
  let complianceRate = 100;

  const now = new Date();
  for (let i = 0; i < sortedDates.length; i += 1) {
    const date = new Date(sortedDates[i]);
    const diffDays = Math.floor((now - date) / 86400000);
    if (i === 0 && diffDays <= 1) {
      continuousDays += 1;
    }
  }

  if (records.length) {
    const negativeDays = new Set(records.filter((item) => item.score < 0).map((item) => item.date)).size;
    complianceRate = Math.max(0, Math.round(((sortedDates.length - negativeDays) / sortedDates.length) * 100));
  }

  return {
    continuousDays,
    complianceRate,
    maxBreakDays
  };
}

function getSystemMessage(prefix, content) {
  return `叮，${prefix}！${content}`;
}

function checkCanCreateTemplate(userStats) {
  if (userStats.continuousDays < 30) {
    return { canCreate: false, reason: '叮！修为尚浅，需连续修行30天方可创建人生模板' };
  }
  
  if (userStats.complianceRate < 90) {
    return { canCreate: false, reason: '叮！近30天综合合规度未达90%，无法创建模板' };
  }
  
  if (userStats.maxBreakDays >= 3) {
    return { canCreate: false, reason: '叮！存在连续3天以上断签记录，暂无法创建模板' };
  }
  
  return { canCreate: true };
}

module.exports = {
  REALMS,
  CULTIVATION_SYSTEMS,
  CULTIVATION_SYSTEM_OPTIONS,
  CULTIVATION_SYSTEM_KEY,
  DEBUFF_SEVERITY,
  calculateRealm,
  getSelectedCultivationSystem,
  setSelectedCultivationSystem,
  getRealmDisplayName,
  calculateDailyCultivation,
  calculatePenalty,
  getTemplateGrade,
  calculateTemplateMatch,
  estimateTemplateDays,
  buildUserStats,
  getSystemMessage,
  checkCanCreateTemplate,
  checkAndApplyStreakPenalty,
  TEMPLATE_TAG_MAP
};

async function checkAndApplyStreakPenalty(profile) {
  try {
    if (!profile || !profile.userId) return null
    const db = wx.cloud.database()
    const now = new Date()
    const pad = function (n) { return String(n).padStart(2, '0') }
    const todayStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
    if (profile.lastPenaltyDate === todayStr) return null

    const rec = await db.collection('records')
      .where({ userId: profile.userId })
      .orderBy('date', 'desc')
      .limit(1)
      .get()
    const lastDate = (rec.data && rec.data[0] && rec.data[0].date) || ''
    if (!lastDate || lastDate === todayStr) return null
    // >>> 每次断签只扣一次：锚点相同说明用户还没重新打卡，仍在同一次断签中，不重复扣
    if (profile.lastPenaltyAnchor === lastDate) return null

    const last = new Date(String(lastDate).replace(/-/g, '/'))
    const daysGap = Math.floor((now - last) / 86400000)
    if (daysGap < 2) return null

    const penalty = calculatePenalty(
      Math.max(0, Number(profile.totalCultivation || 0)),
      daysGap - 1,
      false, null
    )
    if (penalty <= 0) return null

    await db.collection('users').where({ userId: profile.userId }).update({
      data: {
        totalCultivation: Math.max(0, Number(profile.totalCultivation || 0) - penalty),
        lastPenaltyDate: todayStr,
        lastPenaltyAnchor: lastDate,
        updatedAt: Date.now()
      }
    })
    return { penalty: penalty, days: daysGap - 1 }
  } catch (e) {
    console.warn('断签惩罚检测失败', e)
    return null
  }
}
