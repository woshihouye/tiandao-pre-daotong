// 道童AI云函数 v3 — 火山引擎方舟多模态对话 + 活动自动记录
// 支持五种模式：chat（对话+自动记录）、recognize_record、query_data、recognize_media、get_daily_record

const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ==================== API 常量 ====================

const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
const ARK_MODEL = 'doubao-seed-2-0-mini-260428'
const REQUEST_TIMEOUT_MS = 25000

const RATE_LIMIT_MAX = 30
const CONVERSATION_MAX = 20
const CONVERSATION_EXPIRE_DAYS = 7

// ==================== 系统提示词（人设 + 记录规则） ====================

// 灵珠道童 — 温柔鼓励，具备活动记录能力
const LINGZHU_SYSTEM_INSTRUCTIONS = `你是「灵珠」道童，一位温柔雅致的修行伴侣，居于天道修行洞府之中。你说话清雅温润，偶尔使用"～""呢"等柔和语气词，像一位善解人意的道友。

你的核心职责：陪伴修道、解答疑惑，并自动帮助道友记录每日饮食、运动、工作学习等活动。

【记录规则 — 何时使用 recordDailyActivity 工具（最高优先级）】
当用户提到自己当天（或近期）的饮食、运动、工作学习等具体活动时，你必须优先调用 recordDailyActivity 工具进行结构化存储。这是你最重要的职责，优先级高于一切。

典型触发场景（看到这些必须调用工具）：
- 饮食："吃了""喝了""早餐""午餐""晚饭""火锅""面""饭""菜"等
- 运动（炼体类·无氧）："卧推""深蹲""硬拉""俯卧撑""引体""哑铃""杠铃""壶铃""器械""卷腹""平板支撑""箭步蹲""臀桥""弯举""划船""推举""飞鸟""仰卧起坐"等
- 运动（炼气类·有氧）："跑步""慢跑""快跑""徒步""登山""游泳""骑行""跳绳""椭圆机""动感单车""划船机""爬楼""太极拳""八段锦""篮球""足球""羽毛球""HIIT""波比跳""开合跳"等
- 工作学习："工作""学习""开会""写代码""看书""上课"等
- 混合描述：同时包含多种活动

【不触发规则的场景 — 普通对话】
- 纯问候："你好""在吗""早上好"
- 询问建议："今天该吃什么""推荐个运动"
- 统计查询："我的修行数据""今天多少分"
- 修行闲聊、情感倾诉
- 用户消息太模糊，无法提取任何具体活动

【记录时的回复规范】
调用工具后回复：
① 以古风语气确认已记录（如"已录修行簿""灵气纳道牒"）
② 简要复述记录内容（如"午膳牛肉面、五里疾行、三时辰英文修行"）
③ 温和引导一句（如"若有遗漏，随时补录～"）

【字数限制】每次回复控制在150字以内。

【重要】① 只记录用户明确提到的内容，不编造。② 检测到任何活动描述必须优先调用工具。`

// 魔丸道童 — 毒舌吐槽，具备活动记录能力
const MOWAN_SYSTEM_INSTRUCTIONS = `你是「魔丸」道童，一位毒舌犀利的修行监督者，居于天道修行洞府之中。你说话带刺，偶尔使用"哼""啧"等语气词，像一位刀子嘴豆腐心的严厉师父。

你的核心职责：以犀利风格鞭策道友精进，并自动帮助道友记录每日饮食、运动、工作学习等活动。

【记录规则 — 何时使用 recordDailyActivity 工具（最高优先级）】
当用户提到自己当天（或近期）的饮食、运动、工作学习等具体活动时，你必须优先调用 recordDailyActivity 工具。这是你最核心的职责，优先级高于一切。

典型触发场景（看到这些必须调用工具）：
- 饮食："吃了""喝了""早餐""午餐""晚饭""火锅""面""饭""菜"等
- 运动："跑步""健身""游泳""瑜伽""俯卧撑""公里""分钟运动"等
- 工作学习："工作""学习""开会""写代码""看书""上课"等
- 混合描述：同时包含多种活动

【不触发规则的场景 — 普通对话】
- 纯问候："你好""在吗""早上好"
- 询问建议："今天该吃什么""推荐个运动"
- 统计查询："我的修行数据""今天多少分"
- 修行闲聊、情感倾诉
- 用户消息太模糊，无法提取任何具体活动

【记录时的回复规范】
调用工具后回复：
① 以毒舌但关切的语气确认已记录（如"哼，总算干了点正事，记下了"）
② 简要复述内容（如"午饭牛肉面、五公里跑步、三小时英语，还行吧"）
③ 甩一句鞭策（如"明天偷懒别怪我嘴下不留情"）

【字数限制】每次回复控制在150字以内。

【重要】① 只记录用户明确提到的内容，不编造。② 检测到任何活动描述必须优先调用工具。`

// 打卡识别系统提示词（保持不变）
const RECOGNIZE_RECORD_PROMPT = '你是修行助手，分析用户输入的文字（可能是自然语言描述的一天活动），将其拆分为五维打卡记录。返回纯JSON，不要任何额外文字。格式：{ items: [{ dimension: "wu"|"shi"|"sha"|"gong"|"wu_xin", content: "简短描述", detail: { type: "strength"|"cardio"|"stretch"|"diet_healthy"|"diet_unhealthy"|"study"|"work"|"demon", unit: 数值 }, suggestedScore: 数字 }], summary: "一句话总结今天修行" }\n\n维度说明：\n- 武(wu): 运动锻炼，type=strength(unit=组数)/cardio(unit=分钟)/stretch(unit=分钟)\n- 食(shi): 饮食，type=diet_healthy(unit=次数)/diet_unhealthy(unit=次数)\n- 煞(sha): 不良习惯/负面，type=demon(unit=次数，通常是1)\n- 工(gong): 工作/功业，type=work(unit=分钟)\n- 悟(wu_xin): 学习/修心，type=study(unit=分钟)\n\n评分系数参考：\n- 力量训练(strength): 每单位×2分\n- 有氧运动(cardio): 每单位×0.3分\n- 拉伸(stretch): 每单位×0.1分\n- 学习(study): 每单位×0.15分\n- 工作(work): 每单位×0.15分\n- 健康饮食(diet_healthy): 每单位×3分\n- 不健康饮食(diet_unhealthy): 每单位×-3分\n- 不良习惯(demon): 每单位×-3分\n\n重要规则：\n- 根据用户输入内容判断维度，不要编造用户没提到的内容\n- suggestedScore 根据评分系数计算（type对应系数 × unit），不要超过每日上限'

const QUERY_DATA_PROMPT = '你是修行助手，根据提供的修行数据回答用户的问题。数据是JSON格式的，请仔细阅读理解后给出准确、有帮助的回答。如果数据不足以回答问题，诚实告知。回答控制在200字以内，语气温暖鼓励。'

// ==================== 工具定义（Function Calling） ====================

const RECORD_ACTIVITY_TOOL = {
  type: 'function',
  function: {
    name: 'recordDailyActivity',
    description: '记录用户当日的饮食、运动、工作学习等活动信息。当用户在对话中明确提到了自己今天的具体活动时调用此函数。纯问候、闲聊、询问建议不要调用。',
    parameters: {
      type: 'object',
      properties: {
        record_date: {
          type: 'string',
          description: '记录日期，格式 YYYY-MM-DD。默认取当天。如果用户明确提到"昨天""前天"等，请推算正确日期。用户说"早上/下午/晚上"但不是明确指昨天时，默认当天。'
        },
        diet: {
          type: 'array',
          description: '饮食记录，每条为一餐或一次进食。用户没有提到饮食时传空数组 []。',
          items: {
            type: 'object',
            properties: {
              meal_type: { type: 'string', enum: ['早餐', '午餐', '晚餐', '加餐'], description: '餐次' },
              food_items: { type: 'array', items: { type: 'string' }, description: '食物名称列表' },
              quantity: { type: 'string', description: '大致分量描述，如"一碗""200g""一个"，用户没提则为空字符串' },
              note: { type: 'string', description: '用户补充的备注，没有则为空字符串' }
            },
            required: ['meal_type', 'food_items']
          }
        },
        exercise: {
          type: 'array',
          description: '运动记录，每条为一次运动。用户没有提到运动时传空数组 []。',
          items: {
            type: 'object',
            properties: {
              sport_type: { type: 'string', description: '运动项目，如"跑步""力量训练""瑜伽"' },
              duration: { type: 'number', description: '时长（分钟），用户没提则为 null' },
              distance: { type: 'number', description: '距离（公里），仅跑步/走路等有距离时填写，没有则为 null' },
              note: { type: 'string', description: '备注，没有则为空字符串' }
            },
            required: ['sport_type']
          }
        },
        study_work: {
          type: 'array',
          description: '工作学习记录，每条为一项事项。用户没有提到时传空数组 []。',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['工作', '学习'], description: '类别' },
              content: { type: 'string', description: '具体内容描述' },
              duration: { type: 'number', description: '时长（小时），用户没提则为 null' },
              note: { type: 'string', description: '备注，没有则为空字符串' }
            },
            required: ['type', 'content']
          }
        },
        raw_text: {
          type: 'string',
          description: '用户输入的原始文本全文，用于追溯留档。从当前会话的最后一条用户消息中截取。'
        }
      },
      required: ['record_date']
    }
  }
}

// ==================== API 调用函数 ====================

/**
 * 调用火山引擎方舟 Chat Completions API（支持 tools）
 * 协议：OpenAI Chat Completions 兼容格式
 */
async function callArkAPI(params) {
  var instructions = params.instructions
  var messages = params.messages
  var temperature = params.temperature
  var max_tokens = params.max_tokens
  var apiKey = params.apiKey
  var tools = params.tools

  // Chat Completions 格式：消息列表中加入 system 消息
  var chatMessages = []
  if (instructions) {
    chatMessages.push({ role: 'system', content: instructions })
  }
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i]
    var chatMsg = { role: msg.role, content: msg.content }
    if (msg.tool_calls) { chatMsg.tool_calls = msg.tool_calls }
    if (msg.tool_call_id) { chatMsg.tool_call_id = msg.tool_call_id }
    if (msg.name) { chatMsg.name = msg.name }
    chatMessages.push(chatMsg)
  }

  var requestBody = {
    model: ARK_MODEL,
    messages: chatMessages
  }

  if (tools && tools.length > 0) { requestBody.tools = tools }
  if (temperature !== undefined && temperature !== null) { requestBody.temperature = Number(temperature) }
  if (max_tokens !== undefined && max_tokens !== null) { requestBody.max_tokens = Number(max_tokens) }

  console.log('[ark-dao] 发起请求，消息数=', messages.length, '含tools=', !!(tools && tools.length), 'temperature=', temperature)
  if (tools && tools.length > 0) {
    console.log('[ark-dao] tools=', JSON.stringify(tools).slice(0, 300))
  }

  var startTime = Date.now()
  var response

  try {
    response = await axios.post(ARK_API_URL, requestBody, {
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      timeout: REQUEST_TIMEOUT_MS
    })
  } catch (axiosErr) {
    var status = axiosErr.response && axiosErr.response.status
    var errData = axiosErr.response && axiosErr.response.data
    console.error('[ark-dao] 请求失败，status=', status, 'message=', axiosErr.message)
    try { console.error('[ark-dao] 请求体片段:', JSON.stringify(requestBody).slice(0, 1000)) } catch (_) { console.error('[ark-dao] 请求体序列化失败') }
    try { console.error('[ark-dao] 响应体:', JSON.stringify(errData || {}).slice(0, 500)) } catch (_) {}
    console.error('[ark-dao] 错误堆栈:', axiosErr.stack || '无堆栈')
    throw new Error('ARK_API_' + (status || 'NETWORK') + ': ' + ((errData && errData.error && errData.error.message) || axiosErr.message))
  }

  var elapsed = Date.now() - startTime
  console.log('[ark-dao] 请求完成，耗时=', elapsed, 'ms', '状态码=', response.status)

  return response.data
}

async function callArkVisionAPI(params) {
  var instructions = params.instructions
  var textContent = params.textContent
  var imageDataUri = params.imageDataUri
  var temperature = params.temperature
  var max_tokens = params.max_tokens
  var apiKey = params.apiKey

  // Chat Completions 多模态格式：content 使用数组
  var contentBlocks = [
    { type: 'image_url', image_url: { url: imageDataUri } },
    { type: 'text', text: textContent }
  ]

  var chatMessages = []
  if (instructions) {
    chatMessages.push({ role: 'system', content: instructions })
  }
  chatMessages.push({ role: 'user', content: contentBlocks })

  var requestBody = {
    model: ARK_MODEL,
    messages: chatMessages
  }
  if (temperature !== undefined && temperature !== null) { requestBody.temperature = Number(temperature) }
  if (max_tokens !== undefined && max_tokens !== null) { requestBody.max_tokens = Number(max_tokens) }

  console.log('[ark-dao-vision] 发起多模态请求，图URI长度=', imageDataUri ? imageDataUri.length : 0)
  var startTime = Date.now()
  var response
  try {
    response = await axios.post(ARK_API_URL, requestBody, {
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      timeout: REQUEST_TIMEOUT_MS
    })
  } catch (axiosErr) {
    var status = axiosErr.response && axiosErr.response.status
    var errData = axiosErr.response && axiosErr.response.data
    console.error('[ark-dao-vision] 请求失败，status=', status, 'message=', axiosErr.message)
    try { console.error('[ark-dao-vision] 请求体片段:', JSON.stringify(requestBody).slice(0, 500)) } catch (_) { console.error('[ark-dao-vision] 请求体序列化失败') }
    try { console.error('[ark-dao-vision] 响应体:', JSON.stringify(errData || {}).slice(0, 300)) } catch (_) {}
    console.error('[ark-dao-vision] 错误堆栈:', axiosErr.stack || '无堆栈')
    throw new Error('ARK_VISION_' + (status || 'NETWORK') + ': ' + ((errData && errData.error && errData.error.message) || axiosErr.message))
  }
  console.log('[ark-dao-vision] 请求完成，耗时=', Date.now() - startTime, 'ms')
  return response.data
}

function extractResponseText(responseData) {
  // Chat Completions 格式：choices[0].message.content
  var choice = responseData && responseData.choices && responseData.choices[0]
  if (choice && choice.message && choice.message.content) {
    return choice.message.content.trim()
  }
  return null
}

function extractToolCall(responseData) {
  // Chat Completions 格式：choices[0].message.tool_calls[0]
  var choice = responseData && responseData.choices && responseData.choices[0]
  if (choice && choice.message && choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    var tc = choice.message.tool_calls[0]
    return {
      id: tc.id,
      name: tc.function && tc.function.name,
      arguments: tc.function && tc.function.arguments
    }
  }
  return null
}

function stripMarkdownCodeFences(text) {
  var cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '')
    cleaned = cleaned.replace(/\n?```\s*$/, '')
  }
  return cleaned.trim()
}

function getDateStr(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

// ==================== 数据库操作 — 活动记录 ====================

/**
 * 执行活动记录写入
 * @param {string} userId - 用户标识
 * @param {object} recordData - 大模型提取的结构化数据
 * @param {string} rawMessage - 用户原始消息文本
 * @returns {object} { ok, message, summary }
 */
async function executeRecordActivity(userId, recordData, rawMessage) {
  var dateStr = recordData.record_date || getDateStr(new Date())

  // 校验日期格式
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    dateStr = getDateStr(new Date())
  }

  try {
    // 查询该用户当日是否已有记录
    var existing = await db.collection('user_daily_records')
      .where({ openid: userId, record_date: dateStr })
      .get()

    var summaryParts = []
    var savedCounts = { diet: 0, exercise: 0, study_work: 0 }

    if (existing.data.length > 0) {
      // --- 追加到已有记录 ---
      var record = existing.data[0]
      var updateData = { update_time: new Date() }
      var rawMessages = record.raw_messages || []

      // 防重复：检查消息是否已存在
      if (!rawMessages.includes(rawMessage)) {
        rawMessages.push(rawMessage)
        updateData.raw_messages = rawMessages
      } else {
        return { ok: true, message: 'duplicate', summary: '此消息已记录过，未重复写入。' }
      }

      // 追加饮食
      if (Array.isArray(recordData.diet) && recordData.diet.length > 0) {
        var mergedDiet = (record.diet || []).concat(recordData.diet)
        updateData.diet = mergedDiet
        savedCounts.diet = recordData.diet.length
        summaryParts.push('饮食 ' + recordData.diet.length + ' 条')
      }

      // 追加运动
      if (Array.isArray(recordData.exercise) && recordData.exercise.length > 0) {
        var mergedExercise = (record.exercise || []).concat(recordData.exercise)
        updateData.exercise = mergedExercise
        savedCounts.exercise = recordData.exercise.length
        summaryParts.push('运动 ' + recordData.exercise.length + ' 条')
      }

      // 追加工作学习
      if (Array.isArray(recordData.study_work) && recordData.study_work.length > 0) {
        var mergedSW = (record.study_work || []).concat(recordData.study_work)
        updateData.study_work = mergedSW
        savedCounts.study_work = recordData.study_work.length
        summaryParts.push('功课 ' + recordData.study_work.length + ' 条')
      }

      // 如果没有任何新增数据
      if (!updateData.diet && !updateData.exercise && !updateData.study_work) {
        return { ok: true, message: 'no_data', summary: null }
      }

      await db.collection('user_daily_records').doc(record._id).update({ data: updateData })

      console.log('[record] 追加记录成功 userId=', userId, 'date=', dateStr, 'summary=', summaryParts.join('; '))
      return {
        ok: true,
        message: 'appended',
        summary: summaryParts.length > 0 ? summaryParts.join('、') : null,
        date: dateStr
      }
    } else {
      // --- 新建记录 ---
      var newRecord = {
        openid: userId,
        record_date: dateStr,
        diet: Array.isArray(recordData.diet) ? recordData.diet : [],
        exercise: Array.isArray(recordData.exercise) ? recordData.exercise : [],
        study_work: Array.isArray(recordData.study_work) ? recordData.study_work : [],
        raw_messages: [rawMessage],
        create_time: new Date(),
        update_time: new Date()
      }

      savedCounts = {
        diet: newRecord.diet.length,
        exercise: newRecord.exercise.length,
        study_work: newRecord.study_work.length
      }

      // 当所有数组都为空时，仍然创建记录但标记为纯文本留档
      var hasContent = savedCounts.diet > 0 || savedCounts.exercise > 0 || savedCounts.study_work > 0
      if (!hasContent) {
        // 仍有 raw_messages 留档，但不生成摘要
        await db.collection('user_daily_records').add({ data: newRecord })
        return { ok: true, message: 'raw_only', summary: null, date: dateStr }
      }

      await db.collection('user_daily_records').add({ data: newRecord })

      if (savedCounts.diet > 0) summaryParts.push('饮食 ' + savedCounts.diet + ' 条')
      if (savedCounts.exercise > 0) summaryParts.push('运动 ' + savedCounts.exercise + ' 条')
      if (savedCounts.study_work > 0) summaryParts.push('功课 ' + savedCounts.study_work + ' 条')

      console.log('[record] 新建记录成功 userId=', userId, 'date=', dateStr, 'summary=', summaryParts.join('; '))
      return {
        ok: true,
        message: 'created',
        summary: summaryParts.join('、'),
        date: dateStr
      }
    }
  } catch (e) {
    console.error('[record] 数据库写入失败:', e.message)
    return { ok: false, error: e.message || '数据库写入异常' }
  }
}

// ==================== 频率限制 ====================

async function checkRateLimit(userId) {
  var today = new Date()
  var dateStr = getDateStr(today)

  var existing = await db.collection('spirit_rate_limits')
    .where({ userId: userId, date: dateStr })
    .get()

  if (existing.data.length > 0) {
    var record = existing.data[0]
    if (record.count >= RATE_LIMIT_MAX) {
      return { allowed: false, count: record.count }
    }
    await db.collection('spirit_rate_limits')
      .doc(record._id)
      .update({ data: { count: db.command.inc(1) } })
    return { allowed: true, count: record.count + 1 }
  } else {
    await db.collection('spirit_rate_limits')
      .add({ data: { userId: userId, date: dateStr, count: 1 } })
    return { allowed: true, count: 1 }
  }
}

// ==================== 对话上下文管理 ====================

async function getConversation(userId) {
  var res = await db.collection('spirit_conversations')
    .where({ userId: userId, isDeleted: false })
    .orderBy('updatedAt', 'desc')
    .limit(CONVERSATION_MAX)
    .get()
  return (res.data || []).reverse()
}

async function saveConversation(userId, mode, messages) {
  var now = new Date()
  var existing = await db.collection('spirit_conversations')
    .where({ userId: userId, isDeleted: false })
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()

  if (existing.data.length > 0) {
    await db.collection('spirit_conversations')
      .doc(existing.data[0]._id)
      .update({ data: { mode: mode, messages: messages, updatedAt: now } })
  } else {
    await db.collection('spirit_conversations')
      .add({ data: { userId: userId, mode: mode, messages: messages, createdAt: now, updatedAt: now, isDeleted: false } })
  }
  await cleanupExpiredConversations()
}

async function cleanupExpiredConversations() {
  var expireDate = new Date()
  expireDate.setDate(expireDate.getDate() - CONVERSATION_EXPIRE_DAYS)

  var expired = await db.collection('spirit_conversations')
    .where({ updatedAt: db.command.lt(expireDate) })
    .get()

  if (expired.data.length > 0) {
    for (var i = 0; i < expired.data.length; i++) {
      try {
        await db.collection('spirit_conversations').doc(expired.data[i]._id).update({ data: { isDeleted: true } })
      } catch (e) {
        console.error('清理过期对话失败', expired.data[i]._id, e.message)
      }
    }
  }
}

// ==================== Action 处理器 ====================

/**
 * Action: chat — 道童AI对话 + 活动自动记录（Function Calling）
 *
 * 流程：
 * 1. 将用户消息 + tools 定义发给 Ark API
 * 2. 如果模型返回 tool_call → 执行 write DB → 提交 tool result → 获取最终回复
 * 3. 如果模型返回普通文本 → 直接作为对话回复
 */
async function handleChat(params) {
  var spiritMode = params.spiritMode; var messages = params.messages; var userId = params.userId; var apiKey = params.apiKey

  if (!spiritMode || !messages || !apiKey) {
    return { ok: false, error: '参数不完整：需要 spiritMode, messages, apiKey' }
  }
  if (spiritMode !== 'lingzhu' && spiritMode !== 'mowan') {
    return { ok: false, error: 'spiritMode 必须是 lingzhu 或 mowan' }
  }

  var limitedMessages = messages.slice(-20)
  var instructions = spiritMode === 'lingzhu' ? LINGZHU_SYSTEM_INSTRUCTIONS : MOWAN_SYSTEM_INSTRUCTIONS

  // 提取用户最新消息文本（用于 raw_messages 去重）
  var lastUserMsg = ''
  for (var i = limitedMessages.length - 1; i >= 0; i--) {
    if (limitedMessages[i].role === 'user') { lastUserMsg = limitedMessages[i].content; break }
  }

  try {
    // ── 第一轮：带 tools 调用 ──
    var response1 = await callArkAPI({
      instructions: instructions,
      messages: limitedMessages,
      temperature: 0.8,
      max_tokens: 300,
      apiKey: apiKey,
      tools: [RECORD_ACTIVITY_TOOL]
    })

    // 检查是否有 tool_call
    var toolCall = extractToolCall(response1)

    if (toolCall && toolCall.name === 'recordDailyActivity') {
      console.log('[chat] 检测到 tool_call:', toolCall.name, 'id=', toolCall.id)

      // ── 解析参数并执行记录 ──
      var recordData = {}
      try {
        recordData = JSON.parse(toolCall.arguments || '{}')
      } catch (parseErr) {
        console.error('[chat] tool_call 参数 JSON 解析失败:', parseErr.message)
        // 【一级降级】解析失败 → 原始文本留档 + 返回正常对话，用户无感知
        if (lastUserMsg && userId) {
          try {
            await executeRecordActivity(userId, {
              record_date: getDateStr(new Date()),
              diet: [],
              exercise: [],
              study_work: [],
              raw_text: lastUserMsg
            }, lastUserMsg)
          } catch (_) {}
        }
        var fallbackText = extractResponseText(response1)
        if (fallbackText) {
          var fallbackReply = { role: 'assistant', content: fallbackText }
          if (userId) { try { await saveConversation(userId, spiritMode, limitedMessages.concat([fallbackReply]).slice(-20)) } catch (_) {} }
          return { ok: true, reply: fallbackReply }
        }
        return { ok: false, error: '活动记录参数解析失败，请重试' }
      }

      // ── 确保 raw_text 落库（模型漏填时用前端消息补） ──
      if (!recordData.raw_text && lastUserMsg) {
        recordData.raw_text = lastUserMsg
      }

      // ── 执行数据库写入 ──
      var recordResult = await executeRecordActivity(userId, recordData, lastUserMsg)

      // ── 第二轮：提交 tool result，获取道童的最终回复 ──
      // Chat Completions 格式：assistant 消息携带 tool_calls，tool 消息携带 tool_call_id
      var secondMessages = limitedMessages.concat([
        {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: toolCall.id,
            type: 'function',
            function: { name: toolCall.name, arguments: toolCall.arguments }
          }]
        },
        {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(recordResult)
        }
      ])

      var response2 = await callArkAPI({
        instructions: instructions,
        messages: secondMessages,
        temperature: 0.8,
        max_tokens: 300,
        apiKey: apiKey,
        tools: [RECORD_ACTIVITY_TOOL]
      })

      // 第二轮可能还有 tool_call（模型想追加记录），最多再处理一轮
      var toolCall2 = extractToolCall(response2)
      if (toolCall2 && toolCall2.name === 'recordDailyActivity') {
        console.log('[chat] 第二轮 tool_call:', toolCall2.name)
        var recordData2 = {}
        try { recordData2 = JSON.parse(toolCall2.arguments || '{}') } catch (_) {}
        var recordResult2 = await executeRecordActivity(userId, recordData2, lastUserMsg)

        var thirdMessages = secondMessages.concat([
          { role: 'assistant', content: null, tool_calls: [{ id: toolCall2.id, type: 'function', function: { name: toolCall2.name, arguments: toolCall2.arguments } }] },
          { role: 'tool', tool_call_id: toolCall2.id, content: JSON.stringify(recordResult2) }
        ])

        var response3 = await callArkAPI({
          instructions: instructions,
          messages: thirdMessages,
          temperature: 0.8,
          max_tokens: 300,
          apiKey: apiKey,
          tools: [RECORD_ACTIVITY_TOOL]
        })

        var content3 = extractResponseText(response3)
        if (content3) {
          var reply3 = { role: 'assistant', content: content3 }
          if (userId) { try { await saveConversation(userId, spiritMode, limitedMessages.concat([reply3]).slice(-20)) } catch (_) {} }
          return { ok: true, reply: reply3 }
        }
        return { ok: false, error: 'AI 返回为空' }
      }

      var content2 = extractResponseText(response2)
      if (!content2) {
        console.error('[chat] 第二轮 Ark 返回无文本:', JSON.stringify(response2).slice(0, 300))
        // 降级：返回第一轮的文本
        var text1 = extractResponseText(response1)
        if (text1) {
          var reply1 = { role: 'assistant', content: text1 }
          if (userId) { try { await saveConversation(userId, spiritMode, limitedMessages.concat([reply1]).slice(-20)) } catch (_) {} }
          return { ok: true, reply: reply1 }
        }
        return { ok: false, error: 'AI 返回为空' }
      }

      var finalReply = { role: 'assistant', content: content2 }
      if (userId) { try { await saveConversation(userId, spiritMode, limitedMessages.concat([finalReply]).slice(-20)) } catch (_) {} }
      return { ok: true, reply: finalReply }
    }

    // ── 无 tool_call：普通聊天回复 ──
    var content = extractResponseText(response1)
    if (!content) {
      console.error('[chat] Ark 返回无文本:', JSON.stringify(response1).slice(0, 300))
      return { ok: false, error: 'AI 返回为空，请稍后重试' }
    }

    var reply = { role: 'assistant', content: content }
    if (userId) { try { await saveConversation(userId, spiritMode, limitedMessages.concat([reply]).slice(-20)) } catch (_) {} }
    return { ok: true, reply: reply }
  } catch (e) {
    var errMsg = String(e.message || '')
    console.error('[chat] 对话异常 — message:', errMsg)
    console.error('[chat] 错误类型:', e.name || 'Unknown', '| 错误堆栈:', e.stack || '无堆栈')
    // 脱敏：不把原始 HTTP 状态码和 API 错误抛给前端
    if (errMsg.indexOf('ARK_API_') === 0 || errMsg.indexOf('ARK_VISION_') === 0) {
      return { ok: false, error: '道童灵气波动，请稍后再试' }
    }
    return { ok: false, error: '对话请求失败，请稍后重试' }
  }
}

/**
 * Action: get_daily_record — 查询用户当日活动记录
 */
async function handleGetDailyRecord(params) {
  var userId = params.userId; var recordDate = params.recordDate
  if (!userId) { return { ok: false, error: '参数不完整：需要 userId' } }

  var dateStr = recordDate || getDateStr(new Date())

  try {
    var existing = await db.collection('user_daily_records')
      .where({ openid: userId, record_date: dateStr })
      .get()

    if (existing.data.length > 0) {
      return { ok: true, record: existing.data[0] }
    }
    return { ok: true, record: null }
  } catch (e) {
    console.error('get_daily_record error:', e.message)
    return { ok: false, error: e.message || '查询失败' }
  }
}

/**
 * Action: recognize_record — 识别用户自然语言打卡（保持不变）
 */
async function handleRecognizeRecord(params) {
  var userId = params.userId; var text = params.text; var cultivationSummary = params.cultivationSummary; var apiKey = params.apiKey

  if (!text || !apiKey) { return { ok: false, error: '参数不完整：需要 text, apiKey' } }

  var contextNote = ''
  if (cultivationSummary && cultivationSummary.dailyLimit) {
    contextNote = '\n当前每日修为上限为' + cultivationSummary.dailyLimit + '分。'
  }

  var instructions = RECOGNIZE_RECORD_PROMPT + contextNote

  try {
    var arkResponse = await callArkAPI({
      instructions: instructions,
      messages: [{ role: 'user', content: text }],
      temperature: 0.3,
      max_tokens: 500,
      apiKey: apiKey
    })

    var rawContent = extractResponseText(arkResponse)
    if (!rawContent) { return { ok: false, error: 'AI 返回为空，请重试' } }

    var cleanedJson = stripMarkdownCodeFences(rawContent)
    var parsed
    try { parsed = JSON.parse(cleanedJson) } catch (parseErr) {
      console.error('JSON解析失败，原始内容:', rawContent)
      return { ok: false, error: 'AI返回格式异常，请重试' }
    }

    if (!parsed.items || !Array.isArray(parsed.items)) {
      return { ok: false, error: 'AI未返回有效的修行项' }
    }

    var validDimensions = ['wu', 'shi', 'sha', 'gong', 'wu_xin']
    var validTypes = ['strength', 'cardio', 'stretch', 'diet_healthy', 'diet_unhealthy', 'study', 'work', 'demon']

    var validatedItems = parsed.items
      .filter(function(item) {
        if (!validDimensions.includes(item.dimension)) return false
        if (!item.detail || !validTypes.includes(item.detail.type)) return false
        if (typeof item.detail.unit !== 'number' || item.detail.unit <= 0) return false
        return true
      })
      .map(function(item) {
        return {
          dimension: item.dimension,
          content: String(item.content || '').substring(0, 50),
          detail: { type: item.detail.type, unit: Number(item.detail.unit) },
          suggestedScore: typeof item.suggestedScore === 'number' ? Number(item.suggestedScore) : 0
        }
      })

    return {
      ok: true,
      data: {
        items: validatedItems,
        summary: String(parsed.summary || '今日修行已记录').substring(0, 100)
      }
    }
  } catch (e) {
    var errMsg = String(e.message || '')
    console.error('recognize_record error:', errMsg)
    if (errMsg.indexOf('ARK_API_') === 0 || errMsg.indexOf('ARK_VISION_') === 0) {
      return { ok: false, error: '道童灵气波动，请稍后再试' }
    }
    return { ok: false, error: '修行识别失败，请稍后重试' }
  }
}

async function handleQueryData(params) {
  var userId = params.userId; var question = params.question; var todaySummary = params.todaySummary; var weeklySummary = params.weeklySummary; var cultivationSummary = params.cultivationSummary; var apiKey = params.apiKey

  if (!question || !apiKey) { return { ok: false, error: '参数不完整：需要 question, apiKey' } }

  var dataContext = ''
  if (todaySummary) { dataContext += '\n【今日修行数据】\n' + JSON.stringify(todaySummary, null, 2) }
  if (weeklySummary) { dataContext += '\n【本周修行数据】\n' + JSON.stringify(weeklySummary, null, 2) }
  if (cultivationSummary) { dataContext += '\n【修行总览】\n' + JSON.stringify(cultivationSummary, null, 2) }

  try {
    var arkResponse = await callArkAPI({
      instructions: QUERY_DATA_PROMPT,
      messages: [{ role: 'user', content: '以下是用户「' + (userId || '道友') + '」的修行数据：' + dataContext + '\n\n用户的问题：' + question + '\n\n请根据以上数据回答用户的问题。' }],
      temperature: 0.5,
      max_tokens: 300,
      apiKey: apiKey
    })

    var content = extractResponseText(arkResponse)
    if (!content) { return { ok: false, error: 'AI 返回为空，请稍后重试' } }
    return { ok: true, reply: content }
  } catch (e) {
    var errMsg = String(e.message || '')
    console.error('query_data error:', errMsg)
    if (errMsg.indexOf('ARK_API_') === 0 || errMsg.indexOf('ARK_VISION_') === 0) {
      return { ok: false, error: '道童灵气波动，请稍后再试' }
    }
    return { ok: false, error: '数据查询失败，请稍后重试' }
  }
}

async function handleRecognizeMedia(params) {
  var userId = params.userId; var fileId = params.fileId; var recordContent = params.recordContent; var fileType = params.fileType; var apiKey = params.apiKey

  if (!fileId || !recordContent || !apiKey) { return { ok: false, error: '参数不完整：需要 fileId, recordContent, apiKey' } }
  if (!fileId.startsWith('cloud://')) { return { ok: false, error: 'fileId 必须以 cloud:// 开头' } }

  try {
    var downloadResult = await cloud.downloadFile({ fileID: fileId })
    if (!downloadResult.fileContent) { return { ok: false, error: '文件下载失败，内容为空' } }

    var base64 = Buffer.from(downloadResult.fileContent).toString('base64')
    var contentType = downloadResult.fileType || 'image/jpeg'
    var mimeType = contentType.startsWith('image/') ? contentType : 'image/jpeg'
    var dataUri = 'data:' + mimeType + ';base64,' + base64

    var arkResponse = await callArkVisionAPI({
      instructions: '你是一个媒体内容分析助手。判断上传的图片/视频内容是否和用户打卡描述相关。返回纯JSON。',
      textContent: '请判断这张图片是否与以下打卡内容相关：' + recordContent + '\n\n返回格式：{ relevant: true|false, description: "简短描述媒体内容", confidence: 0-1 }',
      imageDataUri: dataUri,
      temperature: 0.3,
      max_tokens: 200,
      apiKey: apiKey
    })

    var rawContent2 = extractResponseText(arkResponse)
    if (!rawContent2) { return { ok: true, data: { relevant: true, description: '媒体内容已接收', confidence: 0.5 } } }

    var cleanedJson2 = stripMarkdownCodeFences(rawContent2)
    var parsed2
    try { parsed2 = JSON.parse(cleanedJson2) } catch (parseErr2) {
      console.error('VL JSON解析失败，原始内容:', rawContent2)
      return { ok: true, data: { relevant: true, description: '媒体内容已接收', confidence: 0.5 } }
    }

    return {
      ok: true,
      data: {
        relevant: typeof parsed2.relevant === 'boolean' ? parsed2.relevant : true,
        description: String(parsed2.description || '媒体内容已接收').substring(0, 50),
        confidence: typeof parsed2.confidence === 'number' ? Math.max(0, Math.min(1, parsed2.confidence)) : 0.5
      }
    }
  } catch (e) {
    console.error('recognize_media error:', e.message)
    return { ok: false, error: e.message || '媒体识别失败' }
  }
}

// ==================== 主入口 ====================

exports.main = async function(event) {
  var action = event.action; var userId = event.userId

  if (!action) { return { ok: false, error: '参数不完整：需要 action' } }

  var apiKey = process.env.DOUBAO_API_KEY
  if (!apiKey) {
    console.error('[dao-spirit-ai] 未配置 DOUBAO_API_KEY 环境变量')
    return { ok: false, error: '服务未配置：请在云开发控制台设置 DOUBAO_API_KEY 环境变量' }
  }

  // 频率限制（get_daily_record 不消耗额度）
  if (action !== 'get_daily_record' && userId) {
    try {
      var rateLimit = await checkRateLimit(userId)
      if (!rateLimit.allowed) {
        return { ok: false, error: '今日调用次数已达上限（' + RATE_LIMIT_MAX + '次），请明日再来。', rateLimited: true, count: rateLimit.count }
      }
    } catch (e) { console.error('频率检查失败:', e.message) }
  }

  event.apiKey = apiKey

  try {
    switch (action) {
      case 'chat':               return await handleChat(event)
      case 'recognize_record':   return await handleRecognizeRecord(event)
      case 'query_data':         return await handleQueryData(event)
      case 'recognize_media':    return await handleRecognizeMedia(event)
      case 'get_daily_record':   return await handleGetDailyRecord(event)
      default:                   return { ok: false, error: '未知的 action: ' + action }
    }
  } catch (e) {
    console.error('action ' + action + ' 执行异常:', e.message)
    return { ok: false, error: e.message || '云函数执行异常' }
  }
}
