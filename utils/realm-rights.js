// ============================================================
// 天道修行 v4.0 — 境界权限联动引擎
//
// 核心逻辑：
//   1. 每个大境界解锁不同功能权限
//   2. AI道童行为随境界迭代（称呼/语气/深度）
//   3. 高境界解锁专属UI特效
// ============================================================

// 境界 -> 权限映射
var REALM_RIGHTS_MAP = {
  lianqi: {
    realmName: '炼气期',
    features: [],
    featureLabels: [],
    description: '基础修行',
    uiTheme: 'default',
    daoChildGreeting: '道友初入修行之门',
    daoChildTone: 'encourage'
  },
  zhuji: {
    realmName: '筑基期',
    features: ['lingjian_deep'],
    featureLabels: ['灵鉴深度分析'],
    description: '大道初成',
    uiTheme: 'zhuji',
    daoChildGreeting: '恭喜前辈筑基功成',
    daoChildTone: 'respectful'
  },
  jindan: {
    realmName: '金丹期',
    features: ['lingjian_deep', 'lundao_speak'],
    featureLabels: ['灵鉴深度分析', '论道发言'],
    description: '金丹大成',
    uiTheme: 'jindan',
    daoChildGreeting: '拜见金丹真人',
    daoChildTone: 'reverent'
  },
  yuanying: {
    realmName: '元婴期',
    features: ['lingjian_deep', 'lundao_speak', 'custom_dao_rules'],
    featureLabels: ['灵鉴深度分析', '论道发言', '自定义道则高级编辑'],
    description: '元婴天尊',
    uiTheme: 'yuanying',
    daoChildGreeting: '恭迎元婴天尊驾临',
    daoChildTone: 'worship'
  }
}

// 默认配置（炼气期）
var DEFAULT_RIGHTS = {
  features: [],
  featureLabels: [],
  description: '基础修行',
  uiTheme: 'default',
  daoChildGreeting: '道友初入修行之门',
  daoChildTone: 'encourage'
}

/**
 * 根据境界ID获取权限配置
 * @param {string} realmId - 境界ID: 'lianqi'|'zhuji'|'jindan'|'yuanying'
 * @returns {object} 权限配置对象
 */
function getRealmRights(realmId) {
  return REALM_RIGHTS_MAP[realmId] || DEFAULT_RIGHTS
}

/**
 * 检查用户是否有某个功能权限
 * @param {string} realmId - 当前境界
 * @param {string} featureKey - 功能key
 * @returns {boolean}
 */
function checkFeatureAccess(realmId, featureKey) {
  var rights = getRealmRights(realmId)
  return rights.features.indexOf(featureKey) >= 0
}

/**
 * 获取AI道童行为配置
 * @param {string} realmId - 当前境界
 * @returns {object} { greeting, tone, topics }
 */
function getDaoBehaviorConfig(realmId) {
  var rights = getRealmRights(realmId)
  return {
    greeting: rights.daoChildGreeting,
    tone: rights.daoChildTone,
    depth: realmId === 'yuanying' ? 'deep' : (realmId === 'jindan' ? 'moderate' : 'basic'),
    uiTheme: rights.uiTheme
  }
}

/**
 * 获取境界专属UI特效class
 * @param {string} realmId
 * @returns {string} CSS class名称
 */
function getRealmUIClass(realmId) {
  var rights = getRealmRights(realmId)
  return 'realm-ui-' + rights.uiTheme
}

/**
 * 获取新解锁功能列表（比前一个境界多出的功能）
 * @param {string} realmId - 新境界
 * @param {string} prevRealmId - 旧境界
 * @returns {Array<{key:string, label:string}>}
 */
function getNewUnlockedFeatures(realmId, prevRealmId) {
  var current = getRealmRights(realmId)
  var previous = getRealmRights(prevRealmId || 'lianqi')
  var newFeatures = []
  for (var i = 0; i < current.features.length; i++) {
    if (previous.features.indexOf(current.features[i]) < 0) {
      newFeatures.push({
        key: current.features[i],
        label: current.featureLabels[i] || current.features[i]
      })
    }
  }
  return newFeatures
}

/**
 * 获取所有境界列表（按等级排序），用于权限对比展示
 */ 
function getAllRealmRights() {
  return [
    { realmId: 'lianqi',  order: 0, ...REALM_RIGHTS_MAP.lianqi },
    { realmId: 'zhuji',   order: 1, ...REALM_RIGHTS_MAP.zhuji },
    { realmId: 'jindan',  order: 2, ...REALM_RIGHTS_MAP.jindan },
    { realmId: 'yuanying', order: 3, ...REALM_RIGHTS_MAP.yuanying }
  ]
}

module.exports = {
  REALM_RIGHTS_MAP,
  getRealmRights,
  checkFeatureAccess,
  getDaoBehaviorConfig,
  getRealmUIClass,
  getNewUnlockedFeatures,
  getAllRealmRights
}
