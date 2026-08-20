// 道牒称号系统 - 称号定义与解锁条件
// v1.4.0 - 对接现有用户数据自动解锁，所有称号一次仅可佩戴一个

const TITLE_CATEGORY = {
  CORE: 'core',
  BEHAVIOR: 'behavior',
  FUN: 'fun',
  HIDDEN: 'hidden',
  MERIT: 'merit',
  OTHER: 'other'
}

const CATEGORY_LABELS = {
  core: '核心称号',
  behavior: '行为成就',
  fun: '趣味称号',
  hidden: '隐藏彩蛋',
  merit: '功德称号',
  other: '其他称号'
}

const CATEGORY_ORDER = ['core', 'behavior', 'merit', 'fun', 'hidden', 'other']

const CORE_COLORS = [
  '#b0b0b0', // 1 浅灰
  '#707070', // 2 深灰
  '#3a3a3a', // 3 炭黑
  '#1a1a1a', // 4 墨黑
  '#8B6914', // 5 檀棕
  '#D4A574', // 6 铜色
  '#C0C0C0', // 7 银色
  '#FFD700', // 8 金色
  '#DC143C'  // 9 正红
]

// ==================== 等级分类常量（5档趣味命名版） ====================
const TITLE_LEVEL = {
  EXPLOSIVE: 'explosive', // 夯爆了
  TOP: 'top',             // 顶级
  SUPERIOR: 'superior',   // 人上人
  NORMAL: 'normal',       // npc
  BOTTOM: 'bottom'        // 拉完了
}

const LEVEL_LABELS = {
  explosive: '夯爆了',
  top: '顶级',
  superior: '人上人',
  normal: 'npc',
  bottom: '拉完了'
}

// 等级排序权重（从高到低）
const LEVEL_WEIGHT = {
  explosive: 0,
  top: 1,
  superior: 2,
  normal: 3,
  bottom: 4
}

// Tab 展示顺序（全部 → 5档）
const LEVEL_TAB_ORDER = ['all', 'explosive', 'top', 'superior', 'normal', 'bottom']

/**
 * 全部称号定义（29个）
 * 每个称号: id / name / category / color / bonus / condition / conditionText / order
 * condition 函数签名为 (userStats) => boolean
 */
const TITLE_DEFINITIONS = [

  // ==================== 核心9阶称号 ====================
  {
    id: 'core_1', name: '初入夯货', category: 'core', level: 'normal', color: CORE_COLORS[0], bonus: 0.01,
    poem: '初踏仙途意气生，万象更新道始成。',
    condition: (s) => s.totalCheckinDays >= 1,
    conditionText: '完成首次修行', order: 1
  },
  {
    id: 'core_2', name: '勉强夯实', category: 'core', level: 'normal', color: CORE_COLORS[1], bonus: 0.02,
    poem: '百日筑基尘与土，一朝锻骨始见金。',
    condition: (s) => s.totalCultivation >= 100 && s.maxDimStreak >= 7,
    conditionText: '修为≥100，单维度连续修行7天', order: 2
  },
  {
    id: 'core_3', name: '小有夯实', category: 'core', level: 'normal', color: CORE_COLORS[2], bonus: 0.03,
    poem: '三七日夜磨一剑，六分道心渐通明。',
    condition: (s) => s.totalCultivation >= 500 && s.maxDimStreak >= 21 && s.dimCompletionRate3 >= 0.6,
    conditionText: '修为≥500，单维度连续修行21天，3维度修行率≥60%', order: 3
  },
  {
    id: 'core_4', name: '踏实夯仔', category: 'core', level: 'normal', color: CORE_COLORS[3], bonus: 0.05,
    poem: '三十日行不辍步，七成道力入丹炉。',
    condition: (s) => s.totalCultivation >= 1500 && s.dimCompletionRate5 >= 0.7 && s.streakDays >= 30,
    conditionText: '修为≥1500，5维度修行率≥70%，连续修行30天', order: 4
  },
  {
    id: 'core_5', name: '稳扎稳打', category: 'core', level: 'superior', color: CORE_COLORS[4], bonus: 0.06,
    poem: '六十昼夜凝真意，八分圆满筑基台。',
    condition: (s) => s.totalCultivation >= 3000 && s.dimCompletionRate5 >= 0.8 && s.streakDays >= 60,
    conditionText: '修为≥3000，5维度修行率≥80%，连续修行60天', order: 5
  },
  {
    id: 'core_6', name: '渐入佳境', category: 'core', level: 'top', color: CORE_COLORS[5], bonus: 0.07,
    poem: '百日光阴淬道骨，八五道心映玉壶。',
    condition: (s) => s.totalCultivation >= 6000 && s.dimCompletionRate5 >= 0.85 && s.totalCheckinDays >= 100,
    conditionText: '修为≥6000，5维度修行率≥85%，累计修行100天', order: 6
  },
  {
    id: 'core_7', name: '不拉胯了', category: 'core', level: 'top', color: CORE_COLORS[6], bonus: 0.08,
    poem: '寒暑半载修行路，九成道意破茧出。',
    condition: (s) => s.totalCultivation >= 12000 && s.dimCompletionRate5 >= 0.9 && s.streakDays >= 180,
    conditionText: '修为≥12000，5维度修行率≥90%，连续修行180天', order: 7
  },
  {
    id: 'core_8', name: '快拉满了', category: 'core', level: 'explosive', color: CORE_COLORS[7], bonus: 0.09,
    poem: '三百六五朝与暮，九五道心近太虚。',
    condition: (s) => s.totalCultivation >= 25000 && s.dimCompletionRate5 >= 0.95 && s.streakDays >= 365,
    conditionText: '修为≥25000，5维度修行率≥95%，连续修行365天', order: 8
  },
  {
    id: 'core_9', name: '真的拉满', category: 'core', level: 'explosive', color: CORE_COLORS[8], bonus: 0.10,
    poem: '两载岁月凝金身，九八圆满大道成。',
    condition: (s) => s.totalCultivation >= 50000 && s.dimCompletionRate5 >= 0.98 && s.streakDays >= 730,
    conditionText: '修为≥50000，5维度修行率≥98%，连续修行730天', order: 9
  },

  // ==================== 行为成就称号 ====================
  {
    id: 'behavior_1', name: '练家子', category: 'behavior', level: 'normal', color: '#e74c3c', bonus: 0.02,
    poem: '百炼筋骨铸铁壁，千锤百打若等闲。',
    condition: (s) => (s.dimCounts && s.dimCounts.wu || 0) >= 100,
    conditionText: '武维度累计修行100次', order: 10
  },
  {
    id: 'behavior_2', name: '铁胃仙人', category: 'behavior', level: 'normal', color: '#e67e22', bonus: 0.02,
    poem: '三十日净食无垢，一口清气纳乾坤。',
    condition: (s) => (s.dimHealthyStreak && s.dimHealthyStreak.shi || 0) >= 30,
    conditionText: '食维度连续30天健康饮食', order: 11
  },
  {
    id: 'behavior_3', name: '心魔退散', category: 'behavior', level: 'superior', color: '#9b59b6', bonus: 0.02,
    poem: '三十日心澄如水，群魔辟易不敢侵。',
    condition: (s) => (s.dimCleanStreak && s.dimCleanStreak.sha || 0) >= 30,
    conditionText: '煞维度连续30天无负面标记', order: 12
  },
  {
    id: 'behavior_4', name: '卷王本王', category: 'behavior', level: 'superior', color: '#2ecc71', bonus: 0.02,
    poem: '三十日满勤不辍，一卷功成万骨枯。',
    condition: (s) => (s.dimFullStreak && s.dimFullStreak.gong || 0) >= 30,
    conditionText: '工维度连续30天满勤', order: 13
  },
  {
    id: 'behavior_5', name: '顿悟了', category: 'behavior', level: 'top', color: '#3498db', bonus: 0.02,
    poem: '百次参悟开灵窍，一朝顿悟道自通。',
    condition: (s) => (s.dimCounts && s.dimCounts.wu_xin || 0) >= 100,
    conditionText: '悟维度累计修行100次', order: 14
  },
  {
    id: 'behavior_6', name: '严格行者', category: 'behavior', level: 'top', color: '#c0392b', bonus: 0.03,
    poem: '三十日严规恪守，铁面自修不徇私。',
    condition: (s) => (s.modeDays && s.modeDays.strict || 0) >= 30,
    conditionText: '严格模式累计修行30天', order: 15
  },
  {
    id: 'behavior_7', name: '铜皮铁骨', category: 'behavior', level: 'explosive', color: '#d35400', bonus: 0.04,
    poem: '百日淬火锻金骨，铜皮铁骨笑红尘。',
    condition: (s) => (s.modeStreak && s.modeStreak.strict || 0) >= 100,
    conditionText: '严格模式连续修行100天', order: 16
  },
  {
    id: 'behavior_8', name: '骂不动了', category: 'behavior', level: 'explosive', color: '#8e44ad', bonus: 0.03,
    poem: '六十日听尽毒舌，道心坚如磐石固。',
    condition: (s) => (s.modeStreak && s.modeStreak.sharp || 0) >= 60,
    conditionText: '毒舌模式连续修行60天', order: 17
  },

  // ==================== 趣味整活称号 ====================
  {
    id: 'fun_1', name: '断签大王', category: 'fun', color: '#e74c3c', bonus: 0.01,
    poem: '断签十次仍在途，此心不灭即是仙。',
    condition: (s) => (s.breakStreakCount || 0) >= 10,
    conditionText: '累计断签≥10次', order: 19
  },
  {
    id: 'fun_2', name: '夜宵悍将', category: 'fun', color: '#f39c12', bonus: 0.01,
    poem: '五十夜宵踏月来，谁言夜深不修仙。',
    condition: (s) => (s.lateDietCount || 0) >= 50,
    conditionText: '累计50次22点后修行饮食', order: 20
  },
  {
    id: 'fun_3', name: '摸鱼真人', category: 'fun', color: '#27ae60', bonus: 0.01,
    poem: '昼伏夜出修行法，摸鱼亦是道中人。',
    condition: (s) => {
      const total = s.weekdayWorkHours || 0
      const inWork = s.workHoursCheckin || 0
      return total > 0 && (inWork / total) < 0.3
    },
    conditionText: '工作日10-16点修行占比<30%', order: 21
  },
  {
    id: 'fun_4', name: '周末修士', category: 'fun', color: '#2980b9', bonus: 0.01,
    poem: '周末方显真本色，五日蛰伏两日狂。',
    condition: (s) => (s.weekendOnlyWeeks || 0) >= 10,
    conditionText: '累计10周仅周末修行', order: 22
  },
  {
    id: 'fun_5', name: '补卡大师', category: 'fun', color: '#16a085', bonus: 0.01,
    poem: '亡羊补牢未为晚，二十补卡亦称雄。',
    condition: (s) => (s.makeupCount || 0) >= 20,
    conditionText: '累计补卡≥20次', order: 23
  },
  {
    id: 'fun_6', name: '熬夜冠军', category: 'fun', color: '#2c3e50', bonus: 0.01,
    poem: '五十夜深人不寐，一盏孤灯照道心。',
    condition: (s) => (s.lateCheckinCount || 0) >= 50,
    conditionText: '累计50次23点后修行', order: 24
  },
  {
    id: 'fun_7', name: '偏科修士', category: 'fun', color: '#e91e63', bonus: 0.02,
    poem: '一柱擎天偏锋走，七成功力破玄关。',
    condition: (s) => {
      var ratios = s.dimRatios || {}
      var vals = []
      for (var k in ratios) { if (typeof ratios[k] === 'number' && ratios[k] > 0) vals.push(ratios[k]) }
      if (vals.length < 2) return false
      var maxRatio = Math.max.apply(null, vals)
      if (maxRatio < 0.7) return false
      var others = vals.filter(function(v) { return v !== maxRatio })
      return others.length > 0 && others.every(function(v) { return v < 0.3 })
    },
    conditionText: '单维度修为占比≥70%，其余维度修行率<30%', order: 25
  },
  {
    id: 'fun_8', name: '逃兵选手', category: 'fun', color: '#607d8b', bonus: 0.01,
    poem: '五度下山避险峰，暂避锋芒再上山。',
    condition: (s) => (s.modeEscapeCount || 0) >= 5,
    conditionText: '累计5次从严格/毒舌模式紧急下山', order: 26
  },

  // ==================== 隐藏彩蛋称号 ====================
  {
    id: 'hidden_1', name: '道祖眷顾', category: 'hidden', color: '#ff4500', bonus: 0.05,
    poem: '百次断签道不弃，天眷之人自有缘。',
    condition: (s) => (s.breakStreakCount || 0) >= 100 && s.totalCheckinDays > 0,
    conditionText: '累计断签≥100次仍在修行', order: 27
  },
  {
    id: 'hidden_2', name: '判官服了', category: 'hidden', color: '#8b0000', bonus: 0.05,
    poem: '百天毒舌炼金身，地狱判官亦称臣。',
    condition: (s) => (s.modeStreak && s.modeStreak.sharp || 0) >= 100,
    conditionText: '毒舌模式连续修行100天', order: 28
  },
  // ============================================================
  // >>> 功德称号（基于社区贡献）
  // ============================================================
  {
    id: 'merit_1',
    name: '初积善缘',
    category: 'merit',
    color: '#22c55e',
    bonus: 0.01,
    poem: '一念善起万物生，初播福田待收成。',
    condition: function(s) { return (s.meritScore || 0) >= 1 },
    conditionText: '功德 ≥ 1',
    order: 40
  },
  {
    id: 'merit_2',
    name: '小有功德',
    category: 'merit',
    color: '#10b981',
    bonus: 0.015,
    poem: '善行渐积如春水，润物无声自成溪。',
    condition: function(s) { return (s.meritScore || 0) >= 11 },
    conditionText: '功德 ≥ 11',
    order: 41
  },
  {
    id: 'merit_3',
    name: '功德渐显',
    category: 'merit',
    color: '#059669',
    bonus: 0.02,
    poem: '日行一善功不唐，莲华出水见真章。',
    condition: function(s) { return (s.meritScore || 0) >= 51 },
    conditionText: '功德 ≥ 51',
    order: 42
  },
  {
    id: 'merit_4',
    name: '善名远扬',
    category: 'merit',
    color: '#f59e0b',
    bonus: 0.025,
    poem: '道不远人德为邻，四方来朝问道心。',
    condition: function(s) { return (s.meritScore || 0) >= 151 },
    conditionText: '功德 ≥ 151',
    order: 43
  },
  {
    id: 'merit_5',
    name: '积善成德',
    category: 'merit',
    color: '#f97316',
    bonus: 0.03,
    poem: '善积百年为德厚，金石为开感苍穹。',
    condition: function(s) { return (s.meritScore || 0) >= 401 },
    conditionText: '功德 ≥ 401',
    order: 44
  },
  {
    id: 'merit_6',
    name: '德高望重',
    category: 'merit',
    color: '#ef4444',
    bonus: 0.035,
    poem: '德行天下众生仰，一片丹心照汗青。',
    condition: function(s) { return (s.meritScore || 0) >= 1001 },
    conditionText: '功德 ≥ 1001',
    order: 45
  },
  {
    id: 'merit_7',
    name: '道济天下',
    category: 'merit',
    color: '#a855f7',
    bonus: 0.04,
    poem: '功德无量济苍生，大道之行万古明。',
    condition: function(s) { return (s.meritScore || 0) >= 3001 },
    conditionText: '功德 ≥ 3001',
    order: 46
  },

  // ==================== 其他称号（含根骨先天称号，共9个） ====================
  // 综合称号
  {
    id: 'bone_talent',
    name: '天纵奇才',
    category: 'other',
    level: 'top',
    color: '#f59e0b',
    bonus: 0.06,
    poem: '六根不凡孕天资，锻骨炼神显锋芒。',
    condition: function(s) { return (s.boneCompositeScore || 0) >= 76 },
    conditionText: '综合根骨达金玉之骨',
    order: 50
  },
  {
    id: 'bone_emperor',
    name: '大帝之姿',
    category: 'other',
    level: 'explosive',
    color: '#ef4444',
    bonus: 0.08,
    poem: '天骨峥嵘帝者相，万法归宗我为尊。',
    condition: function(s) { return (s.boneCompositeScore || 0) >= 91 },
    conditionText: '综合根骨达仙髓之骨',
    order: 51
  },
  {
    id: 'bone_everything',
    name: '万古无二',
    category: 'other',
    level: 'explosive',
    color: '#a855f7',
    bonus: 0.10,
    poem: '六根仙髓贯天地，万古青史独一人。',
    hidden: true,
    condition: function(s) { return s.boneAllSixImmortal || false },
    conditionText: '六根骨全达仙髓之骨',
    order: 52
  },
  // 单项称号
  {
    id: 'bone_strength',
    name: '撼天圣体',
    category: 'other',
    level: 'top',
    color: '#ef4444',
    bonus: 0.04,
    poem: '力拔山兮气盖世，一力降十会。',
    condition: function(s) { return (s.boneStrengthLevel || 0) >= 5 },
    conditionText: '力之根骨达仙髓之骨',
    order: 53
  },
  {
    id: 'bone_endurance',
    name: '神行天骨',
    category: 'other',
    level: 'top',
    color: '#22c55e',
    bonus: 0.04,
    poem: '身随意转步凌虚，万里追风影不留。',
    condition: function(s) { return (s.boneEnduranceLevel || 0) >= 5 },
    conditionText: '体之根骨达仙髓之骨',
    order: 54
  },
  {
    id: 'bone_skill',
    name: '凌波仙骨',
    category: 'other',
    level: 'top',
    color: '#8b5cf6',
    bonus: 0.04,
    poem: '身似流云步如飞，踏波而行若等闲。',
    condition: function(s) { return (s.boneSkillLevel || 0) >= 5 },
    conditionText: '敏之根骨达仙髓之骨',
    order: 55
  },
  {
    id: 'bone_mind',
    name: '洞彻道心',
    category: 'other',
    level: 'top',
    color: '#ec4899',
    bonus: 0.04,
    poem: '心如明镜台，洞彻万法源。',
    condition: function(s) { return (s.boneMindLevel || 0) >= 5 },
    conditionText: '神之根骨达仙髓之骨',
    order: 56
  },
  {
    id: 'bone_study',
    name: '慧根深种',
    category: 'other',
    level: 'top',
    color: '#6366f1',
    bonus: 0.04,
    poem: '慧眼观天机，一智破万卷。',
    condition: function(s) { return (s.boneStudyLevel || 0) >= 5 },
    conditionText: '智之根骨达仙髓之骨',
    order: 57
  },
  {
    id: 'bone_daily',
    name: '知行仙躯',
    category: 'other',
    level: 'top',
    color: '#64748b',
    bonus: 0.04,
    poem: '知行合一无二法，日常即是大道行。',
    condition: function(s) { return (s.boneDailyLevel || 0) >= 5 },
    conditionText: '行之根骨达仙髓之骨',
    order: 58
  },

  // ==================== 功德榜称号（排名段位制） ====================
  { id: 'merit_top1',   name: '天运道祖', category: 'merit', level: 'explosive', color: '#a855f7',
    buffs: [ { type: 'cultivation', value: 0.30 }, { type: 'combat', value: 0.10 } ],
    condition: function(s) { return (s.meritRank || 0) === 1 },
    conditionText: '功德榜第 1 名', order: 45 },
  { id: 'merit_top3',   name: '功德真人', category: 'merit', level: 'top', color: '#f97316',
    buffs: [ { type: 'cultivation', value: 0.20 } ],
    condition: function(s) { return (s.meritRank || 0) >= 2 && (s.meritRank || 0) <= 3 },
    conditionText: '功德榜第 2-3 名', order: 46 },
  { id: 'merit_top10',  name: '积善真君', category: 'merit', level: 'superior', color: '#f59e0b',
    buffs: [ { type: 'cultivation', value: 0.10 } ],
    condition: function(s) { return (s.meritRank || 0) >= 4 && (s.meritRank || 0) <= 10 },
    conditionText: '功德榜第 4-10 名', order: 47 },
  { id: 'merit_top50',  name: '行善修士', category: 'merit', level: 'normal', color: '#22c55e',
    buffs: [ { type: 'cultivation', value: 0.05 } ],
    condition: function(s) { return (s.meritRank || 0) >= 11 && (s.meritRank || 0) <= 50 },
    conditionText: '功德榜第 11-50 名', order: 48 },
  { id: 'merit_top100', name: '向善道童', category: 'merit', level: 'normal', color: '#10b981',
    buffs: [ { type: 'cultivation', value: 0.02 } ],
    condition: function(s) { return (s.meritRank || 0) >= 51 && (s.meritRank || 0) <= 100 },
    conditionText: '功德榜第 51-100 名', order: 49 },
  // ==================== 战力榜称号（排名段位制） ====================
  { id: 'combat_top1',  name: '战力之巅', category: 'combat', level: 'explosive', color: '#ef4444',
    buffs: [ { type: 'combat', value: 0.30 }, { type: 'cultivation', value: 0.10 } ],
    condition: function(s) { return (s.combatRank || 0) === 1 },
    conditionText: '战力榜第 1 名', order: 50 },
  { id: 'combat_top10', name: '百战真人', category: 'combat', level: 'top', color: '#e74c3c',
    buffs: [ { type: 'combat', value: 0.15 } ],
    condition: function(s) { return (s.combatRank || 0) >= 2 && (s.combatRank || 0) <= 10 },
    conditionText: '战力榜第 2-10 名', order: 51 },
  { id: 'combat_top100',name: '斗战胜士', category: 'combat', level: 'superior', color: '#d35400',
    buffs: [ { type: 'combat', value: 0.05 } ],
    condition: function(s) { return (s.combatRank || 0) >= 11 && (s.combatRank || 0) <= 100 },
    conditionText: '战力榜第 11-100 名', order: 52 },

  // ==================== 助人称号（完成愿望） ====================
  { id: 'fulfill_1', name: '渡人者', category: 'merit', color: '#22c55e', bonus: 0.005,
    condition: function(s) { return (s.wishFulfillCount || 0) >= 1 },
    conditionText: '完成 1 个愿望', poem: '愿力所至，渡人渡己。', order: 101 },
  { id: 'fulfill_5', name: '圆梦使者', category: 'merit', color: '#10b981', bonus: 0.01,
    condition: function(s) { return (s.wishFulfillCount || 0) >= 5 },
    conditionText: '完成 5 个愿望', poem: '五愿成真，梦启新章。', order: 102 },
  { id: 'fulfill_20', name: '济世明灯', category: 'merit', color: '#059669', bonus: 0.015,
    condition: function(s) { return (s.wishFulfillCount || 0) >= 20 },
    conditionText: '完成 20 个愿望', poem: '廿愿皆偿，明灯照世。', order: 103 }
]

function getTitlesByCategory(category) {
  return TITLE_DEFINITIONS.filter(function(t) { return t.category === category }).sort(function(a, b) { return a.order - b.order })
}

function getTitlesByLevel(level) {
  return TITLE_DEFINITIONS.filter(function(t) { return t.level === level })
    .sort(function(a, b) { return a.order - b.order })
}

function getAllTitles() {
  return TITLE_DEFINITIONS.slice().sort(function(a, b) { return a.order - b.order })
}

/**
 * 获取按等级从高到低排序的所有称号
 * 同等级内：已解锁在前 → 未解锁在后，再按 order 排序
 */
function getAllTitlesSortedByLevel(userUnlockedIds) {
  var unlockedSet = {}
  if (userUnlockedIds && userUnlockedIds.length) {
    for (var i = 0; i < userUnlockedIds.length; i++) {
      unlockedSet[userUnlockedIds[i]] = true
    }
  }
  return TITLE_DEFINITIONS.slice().sort(function(a, b) {
    var wA = LEVEL_WEIGHT[a.level] != null ? LEVEL_WEIGHT[a.level] : 99
    var wB = LEVEL_WEIGHT[b.level] != null ? LEVEL_WEIGHT[b.level] : 99
    if (wA !== wB) return wA - wB
    var uA = unlockedSet[a.id] ? 1 : 0
    var uB = unlockedSet[b.id] ? 1 : 0
    if (uA !== uB) return uB - uA
    return a.order - b.order
  })
}

function getTitleById(id) {
  return TITLE_DEFINITIONS.find(function(t) { return t.id === id }) || null
}

function checkTitleUnlock(title, userStats) {
  if (!title || !title.condition || !userStats) return false
  try { return title.condition(userStats) } catch (e) { return false }
}

function getUnlockedTitles(userStats) {
  if (!userStats) return []
  return TITLE_DEFINITIONS.filter(function(t) { return checkTitleUnlock(t, userStats) })
}

// 称号词条类型（未来加新加成类型只加这里）
var BUFF_TYPES = {
  cultivation: { label: '修行加成', unit: '%' },
  combat:      { label: '战力加成', unit: '%' }
}

function getTitleBuffs(title) {
  if (!title) return []
  if (Array.isArray(title.buffs)) return title.buffs
  if (typeof title.bonus === 'number' && title.bonus > 0) {
    return [{ type: 'cultivation', value: title.bonus }]
  }
  return []
}

module.exports = {
  TITLE_DEFINITIONS: TITLE_DEFINITIONS,
  TITLE_CATEGORY: TITLE_CATEGORY,
  TITLE_LEVEL: TITLE_LEVEL,
  CATEGORY_LABELS: CATEGORY_LABELS,
  CATEGORY_ORDER: CATEGORY_ORDER,
  LEVEL_LABELS: LEVEL_LABELS,
  LEVEL_WEIGHT: LEVEL_WEIGHT,
  LEVEL_TAB_ORDER: LEVEL_TAB_ORDER,
  CORE_COLORS: CORE_COLORS,
  BUFF_TYPES: BUFF_TYPES,
  getTitlesByCategory: getTitlesByCategory,
  getTitlesByLevel: getTitlesByLevel,
  getAllTitles: getAllTitles,
  getAllTitlesSortedByLevel: getAllTitlesSortedByLevel,
  getTitleById: getTitleById,
  getTitleBuffs: getTitleBuffs,
  checkTitleUnlock: checkTitleUnlock,
  getUnlockedTitles: getUnlockedTitles
}
