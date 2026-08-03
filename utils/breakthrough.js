// ============================================================
// 天道修行 v4.0 — 境界突破仪式引擎
//
// 完整突破链路：
//   突破预警(90%) → 主动触发 → 差异化动画 → 结算面板
// ============================================================

var realmRights = require('./realm-rights.js')

// 突破预警阈值
var BREAKTHROUGH_WARNING_THRESHOLD = 0.9

// 各境界突破动画配置（对应Lottie动画或Canvas动画key）
var REALM_RITUALS = {
  lianqi: {
    realmId: 'lianqi',
    realmName: '炼气期',
    animationKey: 'qi_to_zhuji',
    animationDuration: 3000,
    description: '灵气如潮水汇聚，贯穿经脉，仙基初成',
    poem: '百日筑基功，灵气通百脉。\n自此超凡俗，迈入修仙门。',
    skipEnabled: true,
    sfx: 'wind_rising',
    color: '#f59e0b'
  },
  zhuji: {
    realmId: 'zhuji',
    realmName: '筑基期',
    animationKey: 'zhuji_to_jindan',
    animationDuration: 5000,
    description: '丹田之内丹火熊熊，灵液凝丹，金光乍现',
    poem: '百日炉火煅，丹成耀九霄。\n金丹凝大道，神通自此生。',
    skipEnabled: true,
    sfx: 'fire_crackling',
    color: '#eab308'
  },
  jindan: {
    realmId: 'jindan',
    realmName: '金丹期',
    animationKey: 'jindan_to_yuanying',
    animationDuration: 8000,
    description: '金丹碎裂化元婴，天地异象频生，万道共鸣',
    poem: '金丹破壳出，元婴天地惊。\n一朝登天尊，俯瞰万界生。',
    skipEnabled: true,
    sfx: 'thunder_roar',
    color: '#efb810'
  },
  yuanying: {
    realmId: 'yuanying',
    realmName: '元婴期',
    animationKey: 'yuanying_advanced',
    animationDuration: 10000,
    description: '元婴离体遨游九霄，法则尽在掌握',
    poem: '元婴已成尊，天地任我行。\n万法皆通彻，问道再登峰。',
    skipEnabled: true,
    sfx: 'cosmic_hum',
    color: '#white'
  }
}

/**
 * 检测是否接近突破（修为达到当前境界的90%）
 * @param {number} totalScore - 用户总修为
 * @param {object} currentRealm - 当前境界信息 { realmId, threshold, nextRealm }
 * @returns {object} { nearBreakthrough, realmId, currentScore, threshold, progress, warning }
 */
function checkWarningThreshold(totalScore, currentRealm) {
  if (!currentRealm || !currentRealm.threshold) {
    return { nearBreakthrough: false }
  }
  var progress = totalScore / currentRealm.threshold
  var nearBreakthrough = progress >= BREAKTHROUGH_WARNING_THRESHOLD && progress < 1.0
  return {
    nearBreakthrough: nearBreakthrough,
    realmId: currentRealm.realmId,
    currentScore: totalScore,
    threshold: currentRealm.threshold,
    progress: Math.min(progress, 1.0),
    remaining: Math.max(0, currentRealm.threshold - totalScore),
    warning: nearBreakthrough ? '修行已达瓶颈，突破在即' : null,
    substageProgress: null // 子阶段进度由外界传入
  }
}

/**
 * 获取突破仪式配置
 * @param {string} realmId - 即将突破到的境界
 * @returns {object} 仪式配置
 */
function getBreakthroughRitual(realmId) {
  return REALM_RITUALS[realmId] || REALM_RITUALS['lianqi']
}

/**
 * 生成突破结算面板数据
 * @param {object} params - { totalScore, realmBefore, realmAfter, daoQuality, streakDays }
 * @returns {object} 结算面板完整数据
 */
function generateSettlementPanel(params) {
  var p = params || {}
  var realmAfter = p.realmAfter || {}
  var realmBefore = p.realmBefore || {}
  var newFeatures = realmRights.getNewUnlockedFeatures(realmAfter.realmId, realmBefore.realmId)
  var rightsAfter = realmRights.getRealmRights(realmAfter.realmId)
  var ritual = getBreakthroughRitual(realmAfter.realmId)

  return {
    realmBefore: realmBefore,
    realmAfter: realmAfter,
    newTitle: rightsAfter.realmName || realmAfter.realmName,
    unlockedFeatures: newFeatures,
    attributeChanges: {
      power: '+20%',
      knowledge: '+15%',
      spirit: '+10%'
    },
    daoFoundation: {
      quality: p.daoQuality || '中品',
      qualityName: p.daoQuality || '中品',
      bonusRate: 0
    },
    realmRitual: ritual,
    celebrationPrompts: [
      ritual.poem,
      '新境界：' + (rightsAfter.realmName || ''),
      newFeatures.length ? '解锁功能：' + newFeatures.map(function(f) { return f.label }).join('、') : ''
    ],
    timestamp: Date.now()
  }
}

/**
 * 判断首次突破是否需要强制播放动画
 * @param {string} realmId - 突破到的境界
 * @param {number} breakthroughCount - 用户累计突破次数
 * @returns {boolean}
 */
function shouldForceAnimation(realmId, breakthroughCount) {
  // 首次突破到该境界强制播放，后续可跳过
  return breakthroughCount <= 1
}

module.exports = {
  BREAKTHROUGH_WARNING_THRESHOLD,
  REALM_RITUALS,
  checkWarningThreshold,
  getBreakthroughRitual,
  generateSettlementPanel,
  shouldForceAnimation
}
