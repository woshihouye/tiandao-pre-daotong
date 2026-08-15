// 全局购物车 — 修行库货架 → 模板 builder 落位
// storage key：tiandao_tpl_cart（JSON 字符串，存 cart 数组）

var CART_KEY = 'tiandao_tpl_cart'

/** 活动类型默认单位映射 — 炼体=组/次, 有氧=分钟, 丹食=份 */
var DEFAULT_UNIT_MAP = {
  sport: '组/次', diet: '份', study: '分钟', work: '分钟', debuff: '次'
}

/** 读 storage，解析为数组，异常返回 [] */
function getCart() {
  try {
    var raw = wx.getStorageSync(CART_KEY)
    if (!raw) return []
    var arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
}

/** 写 storage */
function saveCart(cart) {
  try {
    wx.setStorageSync(CART_KEY, JSON.stringify(cart || []))
  } catch (e) {}
}

/**
 * 加入购物车
 * 返回 { ok, reason }；reason: 'duplicate' | null
 */
function addToCart(act) {
  if (!act || !act.id) return { ok: false, reason: null }

  var cart = getCart()
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].act && cart[i].act.id === act.id) {
      return { ok: false, reason: 'duplicate' }
    }
  }

  // 默认容量初始化（复用 addActivity L946-950）
  var defaultUnit = act.unit || DEFAULT_UNIT_MAP[act.tabKey || act.category] || '次'
  var capValue = 1
  if (defaultUnit === '次' && act.defaultGroup) {
    capValue = parseInt(act.defaultGroup) || 1
  }

  cart.push({
    cartId: 'c_' + Date.now() + '_' + cart.length,
    act: {
      id: act.id,
      name: act.name,
      icon: act.icon || act.presetAction || '',
      description: act.description || '',
      scorePerUnit: act.scorePerUnit,
      category: act.category || '',
      tabKey: act.tabKey || act.category || '',
      unit: act.unit || '',
      defaultGroup: act.defaultGroup || '',
      isPublicLibrary: !!act.isPublicLibrary
    },
    capacity: { value: capValue, unit: defaultUnit }
  })

  saveCart(cart)
  return { ok: true, reason: null }
}

/** 移除指定购物车项 */
function removeFromCart(cartId) {
  var cart = getCart()
  var next = []
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].cartId !== cartId) next.push(cart[i])
  }
  saveCart(next)
  return next
}

/** 更新购物车项容量 */
function updateCartCapacity(cartId, value, unit) {
  var cart = getCart()
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].cartId === cartId) {
      cart[i].capacity = { value: value, unit: unit }
      break
    }
  }
  saveCart(cart)
  return cart
}

/** 清空购物车 */
function clearCart() {
  saveCart([])
  return []
}

module.exports = {
  getCart: getCart,
  saveCart: saveCart,
  addToCart: addToCart,
  removeFromCart: removeFromCart,
  updateCartCapacity: updateCartCapacity,
  clearCart: clearCart
}
