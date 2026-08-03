const {
  calculateTrainingScore,
  calculateDietScore,
  resolveTrainingPath,
  getDebuffScore
} = require('./score.js')

const CACHE_DAYS = 7

function now() {
  return Date.now()
}

function getExpireAt() {
  return now() + CACHE_DAYS * 24 * 60 * 60 * 1000
}

function getImageDigest(filePath) {
  return new Promise((resolve) => {
    wx.getFileInfo({
      filePath,
      digestAlgorithm: 'md5',
      success: (res) => resolve(res.digest),
      fail: () => resolve('')
    })
  })
}

function getVisionCacheKey(userId, digest, type) {
  return `vision_cache_${userId}_${type}_${digest}`
}

function getVisionAutoCacheKey(userId, digest) {
  return `vision_cache_${userId}_auto_${digest}`
}

function readVisionCache(userId, digest, type) {
  const key = getVisionCacheKey(userId, digest, type)
  const payload = wx.getStorageSync(key)
  if (!payload || !payload.expireAt) {
    return null
  }
  if (payload.expireAt < now()) {
    wx.removeStorageSync(key)
    return null
  }
  return payload.data || null
}

function writeVisionCache(userId, digest, type, data) {
  const key = getVisionCacheKey(userId, digest, type)
  wx.setStorageSync(key, {
    expireAt: getExpireAt(),
    data
  })
}

function readVisionAutoCache(userId, digest) {
  const key = getVisionAutoCacheKey(userId, digest)
  const payload = wx.getStorageSync(key)
  if (!payload || !payload.expireAt) {
    return null
  }
  if (payload.expireAt < now()) {
    wx.removeStorageSync(key)
    return null
  }
  return payload.data || null
}

function writeVisionAutoCache(userId, digest, data) {
  const key = getVisionAutoCacheKey(userId, digest)
  wx.setStorageSync(key, {
    expireAt: getExpireAt(),
    data
  })
}

function readFileAsBase64(filePath) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data),
      fail: reject
    })
  })
}

function chooseImage(sourceType) {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: [sourceType],
      success: (res) => {
        const tempPath = res.tempFilePaths[0]
        const fs = wx.getFileSystemManager()
        const stablePath = `${wx.env.USER_DATA_PATH}/vision_${Date.now()}.jpg`
        fs.copyFile({
          srcPath: tempPath,
          destPath: stablePath,
          success: () => resolve(stablePath),
          fail: () => resolve(tempPath)
        })
      },
      fail: reject
    })
  })
}

function getImageInfo(filePath) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: filePath,
      success: resolve,
      fail: reject
    })
  })
}

function canvasToTemp(canvasId, width, height, page) {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath(
      {
        canvasId,
        width,
        height,
        destWidth: width,
        destHeight: height,
        fileType: 'jpg',
        quality: 0.85,
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      },
      page
    )
  })
}

async function resizeToMax1024(filePath, page, canvasId = 'resizeCanvas') {
  const info = await getImageInfo(filePath)
  const maxSide = Math.max(info.width, info.height)
  if (maxSide <= 1024) {
    return filePath
  }

  const ratio = 1024 / maxSide
  const targetWidth = Math.max(1, Math.round(info.width * ratio))
  const targetHeight = Math.max(1, Math.round(info.height * ratio))
  const ctx = wx.createCanvasContext(canvasId, page)
  ctx.clearRect(0, 0, targetWidth, targetHeight)
  ctx.drawImage(filePath, 0, 0, targetWidth, targetHeight)

  await new Promise((resolve) => ctx.draw(false, resolve))
  return canvasToTemp(canvasId, targetWidth, targetHeight, page)
}

async function checkImageSecurity(base64) {
  if (!wx.cloud || !wx.cloud.callFunction) {
      return { ok: true, reason: '' }
    }

  try {
    const res = await wx.cloud.callFunction({
      name: 'imgSecCheck',
      data: {
        imageBase64: base64
      }
    })
    const data = res?.result || {}
    if (data.ok === false) {
      return { ok: false, reason: data.reason || '图片未通过内容安全校验' }
    }
    return { ok: true, reason: '' }
  } catch (e) {
    return { ok: true, reason: '' }
  }
}

function buildMockResult(type) {
  if (type === 'classify') {
    return {
      type,
      confidence: 0.86,
      detected: [
        { type: 'diet', confidence: 0.86 }
      ]
    }
  }
  if (type === 'diet') {
    return {
      type,
      items: [
        {
          name: '清蒸鸡胸肉',
          source: 'AI识图',
          meal: '未分餐',
          weight: 180,
          calories: 260,
          protein: 42,
          carbs: 3,
          fat: 7,
          fiber: 1
        },
        {
          name: '时蔬沙拉',
          source: 'AI识图',
          meal: '未分餐',
          weight: 220,
          calories: 180,
          protein: 6,
          carbs: 18,
          fat: 9,
          fiber: 8
        }
      ]
    }
  }

  if (type === 'sport') {
    return {
      type,
      items: [
        {
          name: '力量训练',
          source: 'AI识图',
          trainingType: '力量训练',
          totalReps: 60,
          volume: 4800,
          totalWork: 5760,
          calories: 320,
          coefficient: 1.2
        }
      ]
    }
  }

  return {
    type,
    items: [
      {
        name: '抽烟喝酒',
        source: 'AI识图判定',
        deductCultivation: 30
      }
    ]
  }
}

async function callVisionProvider(type, base64) {
  if (wx.cloud && wx.cloud.callFunction) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'visionRecognize',
        data: { type, imageBase64: base64 }
      })
      if (type === 'classify' && res?.result?.detected) {
        return res.result
      }
      if (res?.result?.items) {
        return res.result
      }
    } catch (e) {}
  }

  return new Promise((resolve) => {
    setTimeout(() => resolve(buildMockResult(type)), 650)
  })
}

async function recognizeWithRetry(type, base64) {
  try {
    return await callVisionProvider(type, base64)
  } catch (e) {
    return callVisionProvider(type, base64)
  }
}

// ============================================================
// AI 多模态识别（通过云函数 ai-vision → 豆包视觉模型）
// ============================================================

/**
 * 调用 ai-vision 云函数进行图片识别
 * @param {string} userId 当前用户ID
 * @param {string} fileId 云存储文件ID
 * @param {string} expectType 保留参数，兼容调用方
 * @param {string} digest 图片摘要，用于缓存去重
 */
/**
 * wu/shi/gong/wu_xin/sha → sport/diet/work/study/debuff 映射
 */
const AI_TYPE_TO_VISION_TYPE = {
  wu: 'sport',
  shi: 'diet',
  gong: 'work',
  wu_xin: 'study',
  sha: 'debuff'
}

/**
 * 前端侧 JSON 提取：从 AI 返回文本中提取第一个完整 JSON 对象
 * 自动清除 markdown 代码块包裹符号
 */
function extractJSONFromText(text) {
  if (!text || typeof text !== 'string') return null

  // 先清除所有 markdown 代码块标记（```json、``` 等）
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // 尝试直接解析
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }
  } catch (_) {}

  // 正则提取第一个完整的 {...} JSON 对象
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed && typeof parsed === 'object') return parsed
    } catch (_) {}
  }

  return null
}

/**
 * 将 AI 返回的统一协议转为 vision 页面兼容格式
 * 新协议：{ type, content, score, metrics: { duration, calorie, weight, protein, fat, carb, fiber }, deductScore }
 * 前端统一按 metrics 赋值，无需按分类分支判断
 */
function buildVisionResultFromAI(vision) {
  const type = vision.type || 'none'
  const m = vision.metrics || {}

  // none 类型：识别失败，返回提示信息
  if (type === 'none') {
    return {
      ok: false,
      data: { content: '无法识别请手动选择分类', visionType: 'diet', category: 'shi', score: 0 },
      classified: { type: 'diet', confidence: 0, primaryType: 'none', detected: [] },
      items: [{ name: '无法识别请手动选择分类', source: 'AI识图', score: 0, category: 'none' }],
      error: '无法识别请手动选择分类',
      errorCode: 0,
      mock: false
    }
  }

  const visionType = AI_TYPE_TO_VISION_TYPE[type] || 'diet'

  // 统一字段映射：从 metrics 直接取，非对应分类的字段值为0，前端无需分支判断
  const item = {
    name: vision.content || 'AI识别结果',
    source: 'AI识图',
    category: type,
    score: vision.score || 0,
    // 通用 metrics 字段
    duration: m.duration || 0,
    calories: m.calorie || 0,
    weight: m.weight || 0,
    protein: m.protein || 0,
    carbs: m.carb || 0,
    fat: m.fat || 0,
    fiber: m.fiber || 0,
    // 运动类道途标识（非运动类为空）
    trainingType: visionType === 'sport' ? 'AI识图推算' : '',
    // 煞类扣分（非煞类为0）
    deductCultivation: vision.deductScore || 0
  }

  console.log('[vision] 统一字段映射完成，type=', type, 'fields:', Object.keys(item).filter(k => item[k] !== 0).join(','))

  return {
    ok: true,
    visionRaw: vision,
    data: {
      content: vision.content || '',
      visionType,
      category: type,
      score: vision.score || 0
    },
    classified: {
      type: visionType,
      confidence: 0.9,
      primaryType: visionType,
      detected: [{ type: visionType, confidence: 0.9 }]
    },
    items: [item],
    error: '',
    mock: false
  }
}

async function callDeepSeekVision(userId, fileId, expectType, digest) {
  if (!wx.cloud || !wx.cloud.callFunction) {
    return buildFallbackResult(expectType)
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'ai-vision',
      data: { fileID: fileId }
    })

    const payload = res?.result || {}
    console.log('[vision] 云函数返回 ok=', payload.ok, 'type=', payload.data?.type)

    // 云函数返回失败（网络/API/解析等错误）
    if (payload.ok !== true) {
      return {
        ok: false,
        data: { content: payload.error || 'AI识别失败', visionType: 'diet', category: 'shi', score: 0 },
        classified: { type: 'diet', confidence: 0.5, primaryType: 'none', detected: [] },
        items: [{ name: payload.error || 'AI识别失败', source: 'AI识图', score: 0, category: 'none' }],
        error: payload.error || 'AI识别失败',
        errorCode: payload.status || -1,
        mock: true
      }
    }

    // 新协议：payload.data 包含 { type, content, score, metrics, deductScore }
    if (payload.data && payload.data.type) {
      return buildVisionResultFromAI(payload.data)
    }

    // JSON 解析失败兜底
    console.warn('[vision] 云函数返回了成功但缺少有效 data')
    return {
      ok: false,
      data: { content: '无法识别请手动选择分类', visionType: 'diet', category: 'shi', score: 0 },
      classified: { type: 'diet', confidence: 0, primaryType: 'none', detected: [] },
      items: [{ name: '无法识别请手动选择分类', source: 'AI识图', score: 0, category: 'none' }],
      error: '无法识别请手动选择分类',
      errorCode: 0,
      mock: false
    }
  } catch (error) {
    console.error('[vision] callDeepSeekVision 异常:', error)
    return buildFallbackResult(expectType)
  }
}

/**
 * 兜底结果生成（AI不可用时返回默认结构）
 */
function buildFallbackResult(expectType) {
  const type = expectType || 'shi'
  const categoryTypeMap = {
    wu: 'sport', shi: 'diet', wu_xin: 'study', gong: 'work', sha: 'debuff'
  }
  const visionType = categoryTypeMap[type] || 'diet'

  return {
    ok: false,
    data: { category: type, visionType, content: 'AI灵阵暂歇，请手动录入', score: 0, detail: {}, confidence: 0.5 },
    classified: {
      type: visionType,
      confidence: 0.5,
      primaryType: visionType,
      detected: [{ type: visionType, confidence: 0.5 }]
    },
    items: [{
      name: 'AI灵阵暂歇',
      source: '兜底结果',
      score: 0,
      category: type,
      detail: {}
    }],
    error: 'AI识别服务暂不可用，请手动录入',
    mock: true
  }
}

function buildDietScoreByMacros(item) {
  try {
    const calorie = Number(item.calories) || 0
    const protein = Number(item.protein) || 0
    const isJunk = !!(item.isBingeEat || item.isJunk || (calorie >= 800 && protein < 10))
    return calculateDietScore({
      ...item,
      isBingeEat: isJunk,
      foodQuality: isJunk ? 'junk' : 'healthy',
      proteinOk: protein > 0,
      carbsOk: Number(item.carbs) > 0,
      fatOk: Number(item.fat) > 0
    })
  } catch (error) {
    console.error('识图饮食积分失败', error)
    return 0
  }
}

function buildSportScore(item = {}, options = {}) {
  try {
    const trainingPath = resolveTrainingPath({
      trainingPath: item.trainingPath,
      trainingType: item.trainingType,
      name: item.name
    })
    const result = calculateTrainingScore({
      trainingPath,
      trainingType: item.trainingType,
      name: item.name,
      sets: Number(item.sets) || Math.max(1, Math.round((Number(item.totalReps) || 0) / 10) || 1),
      duration: Number(item.duration) || 30,
      totalReps: Number(item.totalReps) || 0,
      itemCount: 1
    }, options)
    return result.score
  } catch (error) {
    console.error('识图运动积分失败', error)
    return 0
  }
}

function chooseByPriority(types) {
  const order = ['debuff', 'diet', 'sport']
  for (const type of order) {
    if (types.includes(type)) {
      return type
    }
  }
  return types[0] || 'unknown'
}

async function classifySceneWithRetry(base64, preferredType) {
  try {
    const result = await callVisionProvider('classify', base64)
    const detected = Array.isArray(result?.detected) ? result.detected : []
    if (detected.length) {
      const best = detected.reduce((acc, item) => (item.confidence > acc.confidence ? item : acc), detected[0])
      return {
        primaryType: best.type || 'unknown',
        confidence: Number(best.confidence) || 0,
        detected
      }
    }
  } catch (e) {}

  const fallbackType = preferredType || 'diet'
  return {
    primaryType: fallbackType,
    confidence: preferredType ? 0.85 : 0.72,
    detected: [{ type: fallbackType, confidence: preferredType ? 0.85 : 0.72 }]
  }
}

module.exports = {
  CACHE_DAYS,
  getImageDigest,
  readVisionCache,
  writeVisionCache,
  readVisionAutoCache,
  writeVisionAutoCache,
  readFileAsBase64,
  chooseImage,
  resizeToMax1024,
  checkImageSecurity,
  recognizeWithRetry,
  classifySceneWithRetry,
  chooseByPriority,
  buildDietScoreByMacros,
  buildSportScore,
  // >>> DeepSeek 多模态识别
  callDeepSeekVision
}
