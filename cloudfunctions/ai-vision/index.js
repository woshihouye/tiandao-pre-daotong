const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: 'cloudbase-d9gymqfdb305568c7' })

// ============================================================
// AI模型API配置
// API Key通过云函数环境变量注入，禁止硬编码
// ============================================================
const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses'
const ARK_MODEL = 'doubao-seed-2-0-mini-260428'
const REQUEST_TIMEOUT_MS = 20000

// ============================================================
// 频率限制（基于用户OPENID + 每日30次）
// ============================================================
const DAILY_LIMIT = 30
const rateLimitMap = new Map()

function checkRateLimit(openid) {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const key = openid + '_' + today
  let entry = rateLimitMap.get(key)
  
  if (!entry) {
    entry = { count: 0, date: today }
    rateLimitMap.set(key, entry)
    // 清理旧记录
    for (const [k, v] of rateLimitMap) {
      if (!k.endsWith('_' + today)) rateLimitMap.delete(k)
    }
  }
  
  entry.count++
  return {
    allowed: entry.count <= DAILY_LIMIT,
    count: entry.count,
    limit: DAILY_LIMIT
  }
}

// ============================================================
// 识别结果缓存（基于 openid + fileID，云函数热实例复用）
// ============================================================
const resultCache = new Map()
const CACHE_TTL_MS = 30 * 60 * 1000  // 30分钟有效期

function getCached(openid, fileID) {
  const key = openid + '_' + fileID
  const entry = resultCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    resultCache.delete(key)
    return null
  }
  console.log('[cache] 命中缓存，key=', key, '已缓存', ((Date.now() - entry.ts) / 1000).toFixed(0), 's')
  return entry.data
}

function setCached(openid, fileID, data) {
  const key = openid + '_' + fileID
  resultCache.set(key, { data, ts: Date.now() })
}

// ============================================================
// MIME 类型检测（文件头魔数匹配）
// ============================================================
const MIME_SIGNATURES = [
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'image/bmp',  bytes: [0x42, 0x4D] }
]

function detectMimeType(buffer) {
  if (!buffer || buffer.length < 4) return 'image/jpeg'
  for (const sig of MIME_SIGNATURES) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) {
      return sig.mime
    }
  }
  return 'image/jpeg'
}

// ============================================================
// 构建图片 Base64 Data URI
// ============================================================
function buildDataUri(buffer) {
  const mimeType = detectMimeType(buffer)
  const base64 = Buffer.from(buffer).toString('base64')
  const dataUri = `data:${mimeType};base64,${base64}`
  return { mimeType, dataUri }
}

// ============================================================
// 调用AI视觉模型
// ============================================================
async function callArkVisionAPI(dataUri, apiKey) {
  const requestBody = {
    model: ARK_MODEL,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_image',
            image_url: dataUri
          },
          {
            type: 'input_text',
            text: `# 第一层：格式约束（最高优先级）
你是一个图片场景分类助手。你必须严格仅输出一个合法的纯JSON对象。禁止任何markdown标记、代码块、自然语言说明、前缀或后缀文本。不遵守此格式的输出视为严重识别失败。

# 第二层：分类决策规则

## 决策优先级（按顺序判定，命中即停止）
1. 图中是否有食物/餐具/餐饮场景 → 有则优先归shi（垃圾食品倾向归sha）
2. 图中是否有人运动/运动器械/运动APP截图 → 有则归wu
3. 图中是否有烟酒/槟榔 → 有则归sha
4. 图中是否有电脑屏幕/文档/办公环境 → 有则归gong
5. 图中是否有书本/笔记/阅读场景 → 有则归wu_xin
6. 纯自然风景/景观照（无人物/食物/建筑/运动痕迹）→ 归none
7. 完全无法判定：选视觉面积最大元素的类别；纯黑屏/纯白屏/损坏图 → 归none

## 五大分类定义

### wu - 武·炼体 (+3分)
✅ 正向：运动健身、跑步APP界面(Keep/悦跑圈/咕咚/Nike Run/Strava)、跑步轨迹地图、健身房力量器械、跑步机、有氧训练、健身自拍、运动数据截图、球场运动、瑜伽垫上动作、微信运动/健康类APP步数截图、计步器界面、运动手环数据
❌ 反例：食物照片、办公桌、书本、烟酒、手机桌面截图

### shi - 食·丹食 (+2分)
✅ 正向：家常菜、外卖餐盒、水果拼盘、零食包装、饮料杯、烘焙食品、火锅/烧烤食材、便利店饭团/三明治、餐盘上的食物、超市货架食品、咖啡/茶饮、泡面桶、便当盒、切好的水果
❌ 反例：运动APP界面、办公软件截图、健身房器械、书本
⚠ 炸鸡/汉堡/奶茶等垃圾食品→倾向归sha

### gong - 工·功业 (+2分)
✅ 正向：电脑办公桌面、IDE/代码编辑器界面、Excel/Word文档、会议白板、上网课屏幕、工作台/办公桌、PPT演示、设计软件界面、邮件界面、办公键盘鼠标特写、工位照片、视频会议画面
❌ 反例：食物照片、运动场景、游戏画面
⚠ 办公桌上零食/饮料→归shi；电脑显示游戏画面→归sha；纯阅读看书→归wu_xin

### wu_xin - 悟·修心 (+2分)
✅ 正向：看书阅读、纸质书/电子书/kindle、冥想打坐、笔记记录/手写笔记、学习资料/教材/试卷、网课学习、图书馆场景、书店场景、文具/笔/笔记本特写
❌ 反例：工作文档/办公软件、运动APP、食物、烟酒

### sha - 煞·心魔 (-3分)
✅ 正向：吸烟/烟盒/打火机/烟灰缸、酒瓶/酒杯/饮酒场景/酒吧、槟榔、泡面/炸鸡/汉堡/薯条/奶茶/可乐、熬夜打游戏/游戏界面、过量甜食/蛋糕/膨化食品/辣条、烧烤大餐
❌ 反例：正常家常饭菜、健身餐/沙拉、水果、白开水/茶

# 第三层：数值参数要求

## 营养估算参考（仅shi分类需要）
| 食物 | 重量(g) | 热量(kcal) | 蛋白质(g) | 脂肪(g) | 碳水(g) | 膳食纤维(g) |
| 米饭1碗 | 200 | 230 | 4 | 0.5 | 50 | 1 |
| 炒青菜1份 | 150 | 80 | 3 | 5 | 6 | 3 |
| 炒肉1份 | 120 | 250 | 20 | 15 | 5 | 1 |
| 鸡蛋1个 | 50 | 75 | 6 | 5 | 1 | 0 |
| 苹果1个 | 200 | 100 | 0.5 | 0.3 | 25 | 4 |
| 香蕉1根 | 120 | 110 | 1.5 | 0.4 | 27 | 3 |
| 鸡胸肉1块 | 150 | 200 | 40 | 4 | 0 | 0 |
| 牛奶1杯 | 250 | 160 | 8 | 9 | 12 | 0 |
| 吐司1片 | 30 | 80 | 3 | 1 | 15 | 1 |
| 火锅1人份(混合) | 500 | 800 | 45 | 50 | 35 | 5 |
| 外卖套餐1份 | 450 | 750 | 35 | 30 | 80 | 4 |
| 奶茶1杯(中) | 500 | 350 | 3 | 6 | 65 | 0 |
| 沙拉1份(无酱) | 300 | 180 | 10 | 8 | 20 | 8 |

## 各分类专属数值规则

### wu（武）必须输出：
- duration：运动时长（分钟），禁止填0。有明确数据则提取，否则按类型估算（跑步~30min、力量训练~60min、有氧~45min）
- calorie：消耗热量（大卡），禁止填0。有数据则提取，否则按运动类型估算（跑步5km≈300kcal、力量60min≈360kcal）

### shi（食）必须输出：
- weight：食物总量（克），按图片实际份量估算
- calorie：总热量（大卡），参考上表估算
- protein/fat/carb/fiber：各营养成分（克），参考上表估算
- 以上6个字段禁止全为0，必须全部给出合理估算值

### gong（工）必须输出：
- duration：工作时长（分钟），禁止填0。IDE/文档60-120min，会议30-90min，默认60min

### wu_xin（悟）必须输出：
- duration：学习/阅读/冥想时长（分钟），禁止填0。阅读30-90min，笔记45-120min，冥想20-60min，默认45min

### sha（煞）必须输出：
- deductScore：扣分值（正整数），禁止填0。吸烟/饮酒3-5分，垃圾食品2-3分，游戏3-4分

## 通用规则
- content：15字以内简短描述图中核心内容
- score：严格按分类分值填写（wu=3, shi=2, gong=2, wu_xin=2, sha=-3, none不填score）
- 不属于本分类的数值字段一律填0，但本分类的专属字段禁止填0

## 输出示例（Few-shot）
{"type":"wu","content":"Keep跑步记录5公里","score":3,"duration":30,"calorie":300}
{"type":"shi","content":"清炒时蔬配米饭","score":2,"weight":350,"calorie":310,"protein":7,"fat":5.5,"carb":56,"fiber":4}
{"type":"gong","content":"VS Code编写代码","score":2,"duration":90}
{"type":"wu_xin","content":"阅读修仙小说修炼","score":2,"duration":45}
{"type":"sha","content":"烟酒聚会不良习惯","score":-3,"deductScore":5}
{"type":"none"}

## 输出前自检
□ 输出是否只有纯JSON？
□ type是否为 wu/shi/gong/wu_xin/sha/none ？
□ 本分类专属数值字段是否全部>0？
□ content是否在15字以内？
□ score是否与分类匹配？`
          }
        ]
      }
    ],
    thinking: { type: 'disabled' }
  }

  // console.log('[debug] AI请求发起')  // 调试日志，移除敏感参数
  const startTime = Date.now()

  const response = await axios.post(ARK_API_URL, requestBody, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: REQUEST_TIMEOUT_MS
  })

  const elapsed = Date.now() - startTime
  // console.log('[debug] AI请求完成, 耗时=' + elapsed + 'ms, 状态码=' + response.status)  // 调试日志

  return response.data
}

// ============================================================
// 从 AI 返回文本中提取 JSON 对象
// ============================================================
function extractJsonFromText(text) {
  if (!text) return null

  // 尝试直接解析
  try {
    const parsed = JSON.parse(text.trim())
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }
  } catch (_) {}

  // 尝试提取 markdown 代码块中的 JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim())
      if (parsed && typeof parsed === 'object') return parsed
    } catch (_) {}
  }

  // 尝试正则提取最外层 JSON 对象
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed && typeof parsed === 'object') return parsed
    } catch (_) {}
  }

  return null
}

// ============================================================
// 标准化 AI 返回的 JSON 结果 → 统一返回协议
// ============================================================
function normalizeVisionResult(json) {
  const validTypes = ['wu', 'shi', 'gong', 'wu_xin', 'sha', 'none']
  const type = validTypes.includes(json?.type) ? json.type : 'none'

  // 按类型强制设置正确分值
  const typeScoreMap = { wu: 3, shi: 2, gong: 2, wu_xin: 2, sha: -3, none: 0 }
  const score = typeScoreMap[type] !== undefined ? typeScoreMap[type] : 0

  // 通用 metrics：非对应分类字段统一为0，前端无需判断，直接按字段赋值
  const metrics = {
    duration: (type === 'wu' || type === 'gong' || type === 'wu_xin')
      ? (Number(json?.duration) || 0) : 0,
    calorie: (type === 'shi' || type === 'wu')
      ? (Number(json?.calorie) || 0) : 0,
    weight: type === 'shi' ? (Number(json?.weight) || 0) : 0,
    protein: type === 'shi' ? (Number(json?.protein) || 0) : 0,
    fat: type === 'shi' ? (Number(json?.fat) || 0) : 0,
    carb: type === 'shi' ? (Number(json?.carb) || 0) : 0,
    fiber: type === 'shi' ? (Number(json?.fiber) || 0) : 0
  }

  return {
    type,
    content: type === 'none' ? '' : (String(json?.content || '').slice(0, 15) || '未识别'),
    score,
    metrics,
    deductScore: type === 'sha' ? (Number(json?.deductScore) || 0) : 0
  }
}

// ============================================================
// 解析AI返回结果（三级 JSON 提取容错）
// ============================================================
function parseArkResponse(responseData) {
  // /v3/responses 标准格式：output[].content[].text
  const text = responseData?.output?.[0]?.content?.[0]?.text
  if (text) {
    console.log('[ark] 获取到AI返回文本，长度=', text.length)

    // 第1级：直接 JSON.parse
    const json = extractJsonFromText(text)
    if (json) {
      // console.log('[debug] JSON解析成功, type=' + json.type)  // 调试日志
      const result = normalizeVisionResult(json)
      // console.log('[debug] 标准化结果完成')  // 调试日志，移除敏感内容
      return { ok: true, data: result }
    }

    // 第3级失败：不把原始文本透传给前端，返回标准错误
    console.warn('[ark] JSON解析失败，AI返回了非JSON内容')
    return { ok: false, error: 'AI返回格式异常，请稍后重试或手动录入' }
  }

  // 兜底：Chat Completions 格式（兼容旧版接入点）
  const chatText = responseData?.choices?.[0]?.message?.content
  if (chatText) {
    const json = extractJsonFromText(chatText)
    if (json) {
      return { ok: true, data: normalizeVisionResult(json) }
    }
    return { ok: false, error: 'AI返回格式异常，请稍后重试或手动录入' }
  }

  console.error('[ark] 无法解析返回体')
  return { ok: false, error: 'AI返回格式异常，无法解析识别结果' }
}

// ============================================================
// 错误分类与标准化
// ============================================================
function normalizeError(e) {
  // 网络超时
  if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
    return { ok: false, status: 408, error: 'AI服务响应超时，请稍后重试' }
  }
  // DNS/连接错误
  if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET') {
    console.error('[ark] 网络连接失败:', e.code, e.message)
    return { ok: false, status: 502, error: 'AI服务网络连接失败' }
  }
  // API返回的业务错误
  if (e.response?.data?.error) {
    const err = e.response.data.error
    console.error('[ark] 业务错误:', err.code, err.message)
    return {
      ok: false,
      status: e.response.status || 400,
      error: 'AI识别服务暂时不可用，请稍后重试'
    }
  }
  // HTTP 状态码错误
  if (e.response?.status) {
    console.error('[ark] HTTP错误:', e.response.status, e.response.statusText)
    return {
      ok: false,
      status: e.response.status,
      error: `AI服务异常 (${e.response.status})，请稍后重试`
    }
  }
  // 未知错误
  console.error('[ark] 未知错误:', e.message, e.stack)
  return { ok: false, status: -1, error: 'AI识别服务暂时不可用，请稍后重试' }
}

// ============================================================
// 云函数入口
// ============================================================
exports.main = async (event) => {
  const { fileID } = event
  console.log('[ai-vision] 入口触发，fileID=', fileID)

  // --- 参数校验 ---
  if (!fileID || !fileID.startsWith('cloud://')) {
    console.error('[ai-vision] 参数错误：无效的 fileID')
    return { ok: false, error: '参数错误：缺少有效的 cloud:// 文件ID' }
  }

  // --- 获取真实 OPENID ---
  const openid = cloud.getWXContext().OPENID

  // --- API Key 校验（从环境变量读取） ---
  const apiKey = process.env.DOUBAO_API_KEY
  if (!apiKey) {
    console.error('[ai-vision] 未配置 API_KEY 环境变量')
    return { ok: false, error: '服务未配置：请在云开发控制台设置 API_KEY 环境变量' }
  }

  // --- 频率限制 ---
  if (openid) {
    const rateLimit = checkRateLimit(openid)
    if (!rateLimit.allowed) {
      return { ok: false, error: '今日调用次数已达上限（' + DAILY_LIMIT + '次），请明日再来。' }
    }
    console.log('[ai-vision] 限流:', openid, rateLimit.count + '/' + DAILY_LIMIT)
  }

  // --- 缓存检查 ---
  const cached = getCached(openid, fileID)
  if (cached) {
    console.log('[ai-vision] 命中缓存，直接返回')
    return { ok: true, data: cached, fromCache: true }
  }

  try {
    // --- Step 1: 下载云存储文件 ---
    console.log('[ai-vision] 开始下载云存储文件...')
    const downloadRes = await cloud.downloadFile({ fileID })
    if (!downloadRes || !downloadRes.fileContent) {
      console.error('[ai-vision] 文件下载失败：内容为空')
      return { ok: false, error: '图片下载失败，文件内容为空' }
    }
    console.log('[ai-vision] 下载完成，大小=', downloadRes.fileContent.length, 'bytes')

    // --- Step 2: 构建 Base64 Data URI ---
    const { mimeType, dataUri } = buildDataUri(downloadRes.fileContent)
    console.log('[ai-vision] Base64 编码完成，MIME=', mimeType, '长度=', dataUri.length)

    // --- Step 3: 调用AI视觉模型 ---
    const arkResponse = await callArkVisionAPI(dataUri, apiKey)

    // --- Step 4: 解析结果并缓存 ---
    const result = parseArkResponse(arkResponse)
    if (result.ok && result.data) {
      setCached(openid, fileID, result.data)
    }
    return result

  } catch (e) {
    return normalizeError(e)
  }
}
