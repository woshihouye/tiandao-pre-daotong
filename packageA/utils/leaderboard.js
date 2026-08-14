// ============================================================
// 天道修行 v4.0 — 排行榜引擎
//
// 三大排行榜：
//   实力榜：按用户总修行分数排名
//   功德榜：按用户功德分数排名
//   香火榜：按用户创建模板的累计被引用次数排名
// ============================================================

var BOARD_CONFIGS = {
  power: {
    id: 'power',
    name: '修为榜',        // 原 '实力榜'
    icon: '⚔️',
    subtitle: '直接修为，苦修不辍',
    sourceField: 'totalCultivation',
    sortDesc: true,
    cacheKey: 'tiandao_leaderboard_power'
  },
  merit: {
    id: 'merit',
    name: '功德榜',
    icon: '🙏',
    subtitle: '善行功德无量',
    sourceField: 'meritScore',
    sortDesc: true,
    cacheKey: 'tiandao_leaderboard_merit'
  },
  incense: {
    id: 'incense',
    name: '香火榜',
    icon: '🔥',
    subtitle: '模板香火传承',
    sourceField: 'totalImportCount',
    sortDesc: true,
    cacheKey: 'tiandao_leaderboard_incense'
  },
  combat: {
    id: 'combat',
    name: '战力榜',
    icon: '🛡️',
    subtitle: '综合战力，以武证道',
    sourceField: 'combatPower',
    sortDesc: true,
    cacheKey: 'tiandao_leaderboard_combat'
  }
}

/**
 * 获取全部榜单配置（前端 Tab 配置驱动）
 * @returns {Array}
 */
function getBoardList() {
  return Object.keys(BOARD_CONFIGS).map(function(k) { return BOARD_CONFIGS[k] })
}

/**
 * 获取排行榜配置
 * @param {string} boardType - 'power'|'merit'|'incense'
 * @returns {object}
 */
function getBoardConfig(boardType) {
  return BOARD_CONFIGS[boardType] || BOARD_CONFIGS['power']
}

/**
 * 格式化排名展示
 * @param {number} rank - 排名（1-based）
 * @returns {object} { display, icon, color, className }
 */
function formatRank(rank) {
  if (rank === 1) return { display: '🥇', icon: '👑', color: '#efb810', className: 'rank-gold' }
  if (rank === 2) return { display: '🥈', icon: '💎', color: '#9ca3af', className: 'rank-silver' }
  if (rank === 3) return { display: '🥉', icon: '⭐', color: '#cd7f32', className: 'rank-bronze' }
  if (rank <= 10) return { display: String(rank), icon: null, color: '#3b82f6', className: 'rank-top10' }
  return { display: String(rank), icon: null, color: '#6b7280', className: 'rank-normal' }
}

/**
 * 缓存排行榜数据（本地存储）
 * @param {string} boardType
 * @param {Array} entries
 */
function cacheBoardData(boardType, entries) {
  try {
    var config = getBoardConfig(boardType)
    wx.setStorageSync(config.cacheKey, {
      entries: entries,
      cachedAt: Date.now(),
      date: new Date().toDateString()
    })
  } catch (e) {
    console.error('缓存排行榜失败', e)
  }
}

/**
 * 读取缓存的排行榜数据
 * @param {string} boardType
 * @returns {Array|null} 过期（超过1天）返回null
 */
function getCachedBoardData(boardType) {
  try {
    var config = getBoardConfig(boardType)
    var cached = wx.getStorageSync(config.cacheKey)
    if (!cached || !cached.date) return null
    var today = new Date().toDateString()
    if (cached.date !== today) return null
    return cached.entries || null
  } catch (e) {
    return null
  }
}

/**
 * 获取用户在当前榜单中的排名预览
 * @param {string} boardType
 * @param {Array} entries - 排序后的榜单数据
 * @param {string} userId
 * @returns {object} { rank, entry }
 */
function getUserRank(boardType, entries, userId) {
  if (!entries || !entries.length) return { rank: -1, entry: null }
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].userId === userId) {
      return { rank: i + 1, entry: entries[i] }
    }
  }
  return { rank: -1, entry: null }
}

/**
 * 生成虚拟排行榜数据（用于UI预览/降级展示）
 * @param {string} boardType
 * @param {number} count
 * @returns {Array}
 */
function generatePlaceholderBoard(boardType, count) {
  var config = getBoardConfig(boardType)
  var entries = []
  var placeholderNames = [
    '太虚真人', '凌霄剑尊', '幽泉散人', '碧落仙子', '赤阳道人',
    '清风修士', '明月居士', '紫霞仙子', '白鹤仙翁', '玄冥真人'
  ]
  for (var i = 0; i < Math.min(count || 10, placeholderNames.length); i++) {
    entries.push({
      userId: 'placeholder_' + i,
      nickName: placeholderNames[i],
      avatarText: placeholderNames[i].charAt(0),
      score: Math.max(100, 10000 - i * 800 + Math.floor(Math.random() * 200)),
      realmName: i < 3 ? '金丹期' : (i < 6 ? '筑基期' : '炼气期'),
      realmStage: Math.floor(Math.random() * 9),
      systemName: '传统道家',
      rank: i + 1
    })
  }
  return entries
}

module.exports = {
  BOARD_CONFIGS,
  getBoardConfig,
  getBoardList,
  formatRank,
  cacheBoardData,
  getCachedBoardData,
  getUserRank,
  generatePlaceholderBoard
}
