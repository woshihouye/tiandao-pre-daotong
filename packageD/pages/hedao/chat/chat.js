// 悟道童儿 - AI精灵聊天页
// 支持文字/语音/图片输入，AI分析后展示确认卡片，确认后修为入账
// 对接 dao-spirit-ai 云函数，集成火山引擎方舟多模态能力（与灵鉴识物共享 API）

const app = getApp()

const MODE_STORAGE_KEY = 'dao_spirit_mode'

// 五维中文标签映射
const DIM_LABELS = { wu: '武', shi: '食', sha: '煞', gong: '工', wu_xin: '悟' }

// 双模式话术映射
const MODE_MSGS = {
  lingzhu: {
    greeting: '道友来啦~道童儿在此恭候，今日有何修行记录，说与童儿便是。',
    recognizeOk: '道童儿已识得道友今日修行，请确认~',
    recognizeFail: '没关系道友，道童儿一时没看清，再描述一次就好啦~',
    apiError: '道童儿灵气稍微不稳，道友稍等片刻再试哦~',
    confirmOk: '{score}分已入账{label}。道友真棒，继续保持呀~',
    cancelConfirm: '好的道友，已撤销此次识别。慢慢来，重新描述即可~',
    switchTo: '灵珠归位~道童儿会一如既往温柔待你的。',
    blessingError: '道童儿灵气波动，一时未能运功。道友稍后再来求加持哦~',
    criticismError: '道童儿今日状态欠佳，道友且饶过这次。下次再帮你看看~',
    mediaMismatch: '道友，你上传的图片与记录内容不太相符呢，此次就不计入媒体加成了哦~'
  },
  mowan: {
    greeting: '哟，终于想起来找道童儿了？今日又打算记点啥，可别又是来摸鱼的。',
    recognizeOk: '算你还有点修行，道童儿识得了。自己看看对不对，别又搞错了。',
    recognizeFail: '啧，说了半天道童儿都没听明白。你到底修没修？重说。',
    apiError: '灵气炸了！都怪你日常不修炼，连道童儿都带不动。等会儿再试。',
    confirmOk: '{score}分入账{label}。别高兴太早，明天说不定就断签。',
    cancelConfirm: '啧，又撤回？行吧，道童儿就当没看见。赶紧重来。',
    switchTo: '哼，选了魔丸模式就别怪道童儿嘴下不留情。你的摆烂记录我可都记着呢。',
    blessingError: '道童儿今儿法力不够，加持不了。你反思一下是不是你修行太少害的。',
    criticismError: '啧，毒舌功能都卡了，可见你有多摆烂。等会儿再骂。',
    mediaMismatch: '啧，发个不相关的图想糊弄道童儿？媒体加成没了，自己看着办。'
  }
}

Page({
  data: {
    themeClass: 'theme-light-fixed',
    messages: [],             // 聊天消息列表
    inputText: '',            // 输入框文字
    isRecording: false,       // 是否正在录音
    showConfirmCard: null,    // 确认卡片数据
    isSubmitting: false,      // 提交中
    isAiThinking: false,      // AI思考中
    scrollToBottom: true,     // 自动滚到底部
    mediaList: [],            // 已选媒体文件（图片/视频）
    hasVideo: false,
    hasImage: false,

    // 双模式
    spiritMode: 'lingzhu',    // 'lingzhu' | 'mowan'
    showModePanel: false,
    avatarSwitching: false,

    // 沟通天道反馈弹窗
    showFeedbackPanel: false,

    // 录音相关
    recorderManager: null,
    recordingDuration: 0,
    recordingTimer: null
  },

  onLoad() {
    this.applyTheme()
    const savedMode = wx.getStorageSync(MODE_STORAGE_KEY) || 'lingzhu'
    this.setData({ spiritMode: savedMode })

    this.initRecorder()
    this.addSpiritMsg(this.getModeMsg('greeting'))
  },

  onUnload() {
    this.stopRecorder()
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  // ========== 双模式管理 ==========

  getModeMsg(key, vars = {}) {
    const mode = this.data.spiritMode
    const modeMsgs = MODE_MSGS[mode] || MODE_MSGS.lingzhu
    let msg = modeMsgs[key] || key
    Object.keys(vars).forEach(k => {
      msg = msg.replace(`{${k}}`, vars[k])
    })
    return msg
  },

  openModePanel() {
    this.setData({ showModePanel: true })
  },

  closeModePanel() {
    this.setData({ showModePanel: false })
  },

  // ========== 沟通天道 - 客服邮箱 ==========

  openFeedbackPanel() {
    this.setData({ showFeedbackPanel: true })
  },

  closeFeedbackPanel() {
    this.setData({ showFeedbackPanel: false })
  },

  copyFeedbackEmail() {
    const email = '2992571197@qq.com'
    try {
      wx.setClipboardData({
        data: email,
        success: () => {
          wx.showToast({ title: '邮箱已复制', icon: 'success', duration: 1500 })
        },
        fail: () => {
          wx.showToast({ title: '复制失败，请手动记录', icon: 'none', duration: 2000 })
        }
      })
    } catch (_) {
      wx.showToast({ title: '复制失败，请手动记录', icon: 'none', duration: 2000 })
    }
  },

  noop() {},

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.spiritMode) {
      this.setData({ showModePanel: false })
      return
    }

    this.setData({ avatarSwitching: true, showModePanel: false })
    setTimeout(() => {
      this.setData({ spiritMode: mode, avatarSwitching: false })
    }, 150)

    wx.setStorageSync(MODE_STORAGE_KEY, mode)

    if (app.emitAppEvent) {
      app.emitAppEvent('spiritModeChange', { mode })
    }

    setTimeout(() => {
      this.addSpiritMsg(this.getModeMsg('switchTo'))
    }, 350)
  },

  // ========== 初始化录音 ==========

  initRecorder() {
    const rm = wx.getRecorderManager()
    rm.onStart(() => {
      this.setData({ isRecording: true, recordingDuration: 0 })
      this._recordingTimer = setInterval(() => {
        this.setData({ recordingDuration: this.data.recordingDuration + 1 })
      }, 1000)
    })
    rm.onStop((res) => {
      this.setData({ isRecording: false })
      if (this._recordingTimer) {
        clearInterval(this._recordingTimer)
        this._recordingTimer = null
      }
      if (res.tempFilePath && this.data.recordingDuration > 0) {
        this.handleVoiceFile(res.tempFilePath)
      }
    })
    rm.onError((err) => {
      this.setData({ isRecording: false })
      wx.showToast({ title: '录音失败', icon: 'none' })
    })
    this.setData({ recorderManager: rm })
  },

  async handleVoiceFile(tempFilePath) {
    wx.showLoading({ title: '上传中...' })
    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `voice/${app.globalData.userId}_${Date.now()}.mp3`,
        filePath: tempFilePath
      })
      wx.hideLoading()
      this.sendMessage(`[语音记录：${this.data.recordingDuration}秒]`, [uploadRes.fileID])
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  startRecord() {
    wx.authorize({ scope: 'scope.record' }).then(() => {
      this.data.recorderManager.start({
        format: 'mp3',
        duration: 60000
      })
    }).catch(() => {
      wx.showToast({ title: '请授权录音权限', icon: 'none' })
    })
  },

  stopRecord() {
    this.data.recorderManager.stop()
  },

  stopRecorder() {
    if (this._recordingTimer) {
      clearInterval(this._recordingTimer)
    }
  },

  // ========== 消息管理 ==========

  addUserMsg(text) {
    this.addMsg({ role: 'user', type: 'text', content: text })
  },

  addSpiritMsg(text) {
    this.addMsg({ role: 'spirit', type: 'text', content: text })
  },

  addMsg(msg) {
    const messages = [...this.data.messages, { ...msg, _id: Date.now() + Math.random() }]
    this.setData({ messages, scrollToBottom: true })
    this.scrollToView()
  },

  scrollToView() {
    setTimeout(() => {
      wx.createSelectorQuery()
        .select('#chatBottom')
        .boundingClientRect()
        .exec((res) => {
          if (res[0]) {
            wx.pageScrollTo({ scrollTop: 99999, duration: 200 })
          }
        })
    }, 100)
  },

  // ========== 文字输入 ==========

  onInputChange(e) {
    this.setData({ inputText: e.detail.value })
  },

  onInputConfirm() {
    const text = this.data.inputText.trim()
    if (!text) return
    this.setData({ inputText: '' })
    this.sendMessage(text)
  },

  // ========== 媒体上传 ==========

  chooseMedia() {
    wx.chooseMedia({
      count: 3,
      mediaType: ['image', 'video'],
      sizeType: ['compressed'],
      maxDuration: 30,
      success: (res) => {
        const mediaList = [...this.data.mediaList]
        let hasVideo = this.data.hasVideo
        let hasImage = this.data.hasImage
        for (const file of res.tempFiles) {
          mediaList.push({
            tempFilePath: file.tempFilePath,
            type: file.fileType,
            size: file.size,
            uploaded: false,
            fileId: ''
          })
          if (file.fileType === 'video') hasVideo = true
          if (file.fileType === 'image') hasImage = true
        }
        this.setData({ mediaList, hasVideo, hasImage })
        this.uploadMedia(mediaList)
      }
    })
  },

  async uploadMedia(mediaList) {
    for (let i = 0; i < mediaList.length; i++) {
      if (mediaList[i].uploaded) continue
      try {
        const ext = mediaList[i].type === 'video' ? 'mp4' : 'jpg'
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `dao-chat/${app.globalData.userId}_${Date.now()}_${i}.${ext}`,
          filePath: mediaList[i].tempFilePath
        })
        mediaList[i].fileId = uploadRes.fileID
        mediaList[i].uploaded = true
      } catch (e) {
        console.error('媒体上传失败', e)
      }
    }
    this.setData({ mediaList })
  },

  removeMedia(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const mediaList = [...this.data.mediaList]
    mediaList.splice(idx, 1)
    this.setData({
      mediaList,
      hasVideo: mediaList.some(m => m.type === 'video'),
      hasImage: mediaList.some(m => m.type === 'image')
    })
  },

  // ================================================================
  // >>> 核心：发送消息 — 智能分流（识别/查询/聊天三合一）
  // ================================================================

  async sendMessage(text, voiceFileIds = []) {
    this.addUserMsg(text)

    // 收集已上传的媒体文件
    const mediaFileIds = this.data.mediaList
      .filter(m => m.uploaded && m.fileId)
      .map(m => m.fileId)
      .concat(voiceFileIds)

    const hasVideo = this.data.hasVideo
    const hasImage = this.data.hasImage

    this.setData({
      isAiThinking: true,
      mediaList: [],
      hasVideo: false,
      hasImage: false
    })

    try {
      // >>> 第1步：检测用户意图 —— 数据查询 or 打卡描述
      if (this.detectQueryIntent(text)) {
        await this.handleQueryFlow(text)
        return
      }

      // >>> 第2步：尝试打卡内容识别
      const recogResult = await app.callDaoSpiritAI('recognize_record', {
        userId: app.globalData.userId,
        text: text,
        cultivationSummary: await app.getCultivationSummary()
      })

      if (recogResult.ok && recogResult.data && recogResult.data.items && recogResult.data.items.length > 0) {
        // 识别成功 → 计算分数 + 媒体权重
        await this.handleRecognitionResult(recogResult.data, text, mediaFileIds, hasVideo, hasImage)
        return
      }

      // >>> 第3步：无识别结果 → 回退到通用聊天
      await this.handleChatFlow(text)

    } catch (e) {
      console.error('道童调用失败', e)
      // 识别失败时仍尝试走 chat 自动记录（FC 兜底），而非直接显示错误
      try {
        await this.handleChatFlow(text)
      } catch (chatErr) {
        console.error('chat 兜底也失败', chatErr)
        this.addSpiritMsg(this.getModeMsg('apiError'))
      }
    } finally {
      this.setData({ isAiThinking: false })
    }
  },

  /**
   * 检测用户是否在问修行数据相关问题
   */
  detectQueryIntent(text) {
    const queryPatterns = [
      /多少.*分/, /几分/, /得分/, /修为/,
      /几次/, /几天/, /多少天/, /打卡.*天/,
      /连续/, /断签/, /中断/,
      /什么境界/, /哪个境界/, /升级/, /还差/,
      /本周/, /这周/, /今日/, /今天/, /昨日/, /昨天/,
      /统计/, /汇总/, /总结/, /数据/,
      /最高.*维度/, /最.*维度/, /哪个.*多/, /哪个.*少/,
      /修行.*如何/, /修行.*怎么样/, /修行.*怎样/,
      /进度/, /排名/, /多少名/,
      /什么时候.*突破/, /还要.*多久/
    ]
    return queryPatterns.some(p => p.test(text))
  },

  /**
   * 处理打卡识别结果：计算分数 + 媒体权重 + 展示确认卡片
   */
  async handleRecognitionResult(data, originalText, mediaFileIds, hasVideo, hasImage) {
    let mediaRelevant = true
    let mediaWeightLabel = '纯文字记录'

    // >>> 有媒体文件时，调用方舟多模态 API 检测相关性
    if (mediaFileIds.length > 0) {
      const firstMedia = mediaFileIds[0]
      try {
        const mediaResult = await app.callDaoSpiritAI('recognize_media', {
          userId: app.globalData.userId,
          fileId: firstMedia,
          recordContent: data.summary || originalText,
          fileType: hasVideo ? 'video' : 'image'
        })

        if (mediaResult.ok && mediaResult.data) {
          mediaRelevant = mediaResult.data.relevant !== false
        } else {
          // VL调用失败时默认认为相关，不阻塞用户打卡
          mediaRelevant = true
        }
      } catch (e) {
        console.error('媒体识别异常，降级为默认相关', e)
        mediaRelevant = true
      }

      if (!mediaRelevant) {
        this.addSpiritMsg(this.getModeMsg('mediaMismatch'))
      }
    }

    // >>> 计算媒体权重（取最高值，不叠加）
    const weightInfo = app.calcMediaWeightBonus
      ? app.calcMediaWeightBonus(hasImage, hasVideo, mediaRelevant)
      : { weight: 1.0, label: '纯文字记录', relevant: mediaRelevant }

    const mediaWeight = weightInfo.weight
    mediaWeightLabel = weightInfo.label

    // >>> 为每个识别项计算基础分和加权分
    const items = data.items.map(item => {
      const baseScore = app.calcTaskScore
        ? app.calcTaskScore(item.detail.type, item.detail.unit, false)
        : (Number(item.suggestedScore) || 0)
      const weightedScore = Math.round(baseScore * mediaWeight)
      return {
        dim: item.dimension,
        dimLabel: DIM_LABELS[item.dimension] || item.dimension,
        name: item.content,
        baseScore,
        weightedScore,
        detail: item.detail
      }
    })

    const totalBaseScore = items.reduce((s, i) => s + i.baseScore, 0)
    const totalWeightedScore = items.reduce((s, i) => s + i.weightedScore, 0)

    // >>> 展示确认卡片
    this.addSpiritMsg((data.summary || this.getModeMsg('recognizeOk')) +
      (mediaWeight > 1 ? `\n${mediaWeightLabel}` : ''))

    this.setData({
      showConfirmCard: {
        summary: data.summary || '道童儿已识得',
        items,
        totalBaseScore,
        totalWeightedScore,
        mediaWeight,
        mediaWeightLabel,
        mediaRelevant
      }
    })
  },

  /**
   * 处理修行数据查询
   */
  async handleQueryFlow(question) {
    try {
      const [todaySummary, weeklySummary, cultivationSummary] = await Promise.all([
        app.getTodaySummary ? app.getTodaySummary() : Promise.resolve({}),
        app.getWeeklySummary ? app.getWeeklySummary() : Promise.resolve({}),
        app.getCultivationSummary ? app.getCultivationSummary() : Promise.resolve({})
      ])

      const result = await app.callDaoSpiritAI('query_data', {
        userId: app.globalData.userId,
        question,
        todaySummary,
        weeklySummary,
        cultivationSummary
      })

      if (result.ok && result.reply) {
        this.addSpiritMsg(result.reply)
      } else {
        // 查询失败时回退到通用聊天
        await this.handleChatFlow(question)
      }
    } catch (e) {
      console.error('数据查询失败，回退到聊天', e)
      await this.handleChatFlow(question)
    }
  },

  /**
   * 通用聊天（灵珠/魔丸人格对话）
   */
  async handleChatFlow(text) {
    // 构建消息历史（最近10轮）
    const recentMessages = this.data.messages
      .filter(m => m.role === 'user' || m.role === 'spirit')
      .slice(-20)
      .map(m => ({
        role: m.role === 'spirit' ? 'assistant' : 'user',
        content: m.content
      }))

    recentMessages.push({ role: 'user', content: text })

    const result = await app.callDaoSpiritAI('chat', {
      userId: app.globalData.userId,
      spiritMode: this.data.spiritMode,
      messages: recentMessages
    })

    if (result.ok && result.reply) {
      const replyText = typeof result.reply === 'string'
        ? result.reply
        : (result.reply.content || JSON.stringify(result.reply))
      this.addSpiritMsg(replyText)
    } else {
      this.addSpiritMsg(result.error || this.getModeMsg('recognizeFail'))
    }
  },

  // ========== 确认卡片操作 ==========

  onEditItem(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const items = [...this.data.showConfirmCard.items]
    const item = items[idx]
    if (!item) return

    wx.showActionSheet({
      itemList: ['修改名称', '修改维度', '删除此项'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '修改名称',
            editable: true,
            placeholderText: item.name,
            success: (modalRes) => {
              if (modalRes.confirm && modalRes.content) {
                items[idx].name = modalRes.content
                this.updateConfirmCard(items)
              }
            }
          })
        } else if (res.tapIndex === 1) {
          wx.showActionSheet({
            itemList: ['武·炼体', '食·丹食', '悟·修心', '工·功业', '煞·心魔'],
            success: (actionRes) => {
              const dims = ['wu', 'shi', 'wu_xin', 'gong', 'sha']
              const dim = dims[actionRes.tapIndex]
              if (dim) {
                items[idx].dim = dim
                items[idx].dimLabel = DIM_LABELS[dim]
                this.updateConfirmCard(items)
              }
            }
          })
        } else if (res.tapIndex === 2) {
          items.splice(idx, 1)
          this.updateConfirmCard(items)
        }
      }
    })
  },

  updateConfirmCard(items) {
    const mediaWeight = (this.data.showConfirmCard && this.data.showConfirmCard.mediaWeight) || 1.0

    // 重新计算分数（编辑后的条目用 app.calcTaskScore 重算基础分，再乘权重）
    const recalculatedItems = items.map(item => {
      let baseScore = Number(item.baseScore || 0)
      // 如果有 detail，重新计算确保准确
      if (item.detail && item.detail.type && item.detail.unit) {
        baseScore = app.calcTaskScore
          ? app.calcTaskScore(item.detail.type, item.detail.unit, false)
          : baseScore
      }
      const weightedScore = Math.round(baseScore * mediaWeight)
      return { ...item, baseScore, weightedScore }
    })

    const totalBaseScore = recalculatedItems.reduce((s, i) => s + i.baseScore, 0)
    const totalWeightedScore = recalculatedItems.reduce((s, i) => s + i.weightedScore, 0)

    this.setData({
      showConfirmCard: {
        ...this.data.showConfirmCard,
        items: recalculatedItems,
        totalBaseScore,
        totalWeightedScore
      }
    })
  },

  async confirmRecords() {
    const card = this.data.showConfirmCard
    if (!card || !card.items.length) return

    this.setData({ isSubmitting: true })

    try {
      const db = app.getDb ? app.getDb() : wx.cloud.database()
      const userId = app.globalData.userId
      const today = app.getTodayDate ? app.getTodayDate() : this.formatDate(new Date())

      // 媒体相关性检查
      if (card.mediaRelevant === false && card.mediaWeight > 1) {
        wx.showToast({ title: '媒体与内容不符，未计入加成', icon: 'none' })
      }

      const batch = card.items.map((item) => ({
        userId,
        date: today,
        type: this.mapDim(item.dim),
        name: item.name,
        score: item.weightedScore || item.baseScore || 0,
        source: '童儿识功',
        status: 'confirmed',
        createdAt: Date.now()
      }))

      // 批量写入 records 集合
      for (const record of batch) {
        await db.collection('records').add({ data: record })
      }

      // >>> 走全局 addScore 对接现有积分上限/下限逻辑
      const totalAdded = card.totalWeightedScore
      if (app.addScore && totalAdded !== 0) {
        await app.addScore(totalAdded, {
          source: 'dao-chat',
          lastCheckInDate: today
        })
      } else {
        await db.collection('users').where({ userId }).update({
          data: {
            totalCultivation: db.command.inc(totalAdded)
          }
        })
      }

      this.setData({ showConfirmCard: null })

      const weightLabel = card.mediaWeight > 1 ? `（${card.mediaWeightLabel}）` : ''
      this.addSpiritMsg(this.getModeMsg('confirmOk', { score: totalAdded, label: weightLabel }))

      app.showSystemToast && app.showSystemToast(`修为+${totalAdded}`)
    } catch (e) {
      console.error('入库失败', e)
      wx.showToast({ title: '入库失败，请重试', icon: 'none' })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  cancelConfirm() {
    this.setData({ showConfirmCard: null })
    this.addSpiritMsg(this.getModeMsg('cancelConfirm'))
  },

  // ========== 求加持 / 求棒喝（本地数据，不走 AI） ==========

  async getChatUserStats() {
    try {
      const profile = app.globalData.userProfile || {}
      const streakDays = Number(profile.streakDays || 0)
      const totalCultivation = Number(profile.totalCultivation || 0)

      const db = app.getDb ? app.getDb() : wx.cloud.database()
      const today = this.formatDate(new Date())
      const weekAgo = this.getDaysAgo(6)
      const res = await db.collection('records')
        .where({ userId: app.globalData.userId, status: 'confirmed' })
        .get()
      const records = res.data || []
      const weekRecords = records.filter(r => r.date >= weekAgo && r.date <= today)
      const weekDays = new Set(weekRecords.map(r => r.date)).size

      const typeToDim = { sport: 'wu', diet: 'shi', study: 'wu_xin', work: 'gong', debuff: 'sha' }
      const dimCounts = { wu: 0, shi: 0, wu_xin: 0, gong: 0, sha: 0 }
      let totalCheckinDays = new Set(records.map(r => r.date)).size
      let lateCount = 0
      records.forEach(r => {
        const dim = typeToDim[r.type] || typeToDim[r.category] || null
        if (dim && dimCounts[dim] !== undefined) dimCounts[dim]++
        const ts = r.timestamp || r.createdAt
        if (ts) { const h = new Date(ts).getHours(); if (h >= 22) lateCount++ }
      })

      const dates = Array.from(new Set(records.map(r => r.date))).sort()
      let breakCount = 0
      for (let i = 1; i < dates.length; i++) {
        if ((new Date(dates[i]) - new Date(dates[i-1])) / 86400000 > 1) breakCount++
      }

      let maxDim = '', minDim = '', maxCount = 0, minCount = Infinity
      Object.keys(dimCounts).forEach(k => {
        if (dimCounts[k] > maxCount) { maxCount = dimCounts[k]; maxDim = k }
        if (dimCounts[k] < minCount) { minCount = dimCounts[k]; minDim = k }
      })

      const dimLabels = { wu: '武·炼体', shi: '食·丹食', wu_xin: '悟·修心', gong: '工·功业', sha: '煞·心魔' }

      return {
        streakDays, totalCultivation, totalCheckinDays, breakCount, lateCount,
        weekDays, dimCounts, maxDim, minDim, maxCount, minCount, dimLabels, totalRecords: records.length
      }
    } catch (e) {
      return { streakDays: 0, totalCultivation: 0, totalCheckinDays: 0, breakCount: 0, lateCount: 0, weekDays: 0, dimCounts: {}, maxDim: '', minDim: '', maxCount: 0, minCount: 0, totalRecords: 0 }
    }
  },

  async requestBlessing() {
    this.setData({ isAiThinking: true })
    try {
      const stats = await this.getChatUserStats()
      const mode = this.data.spiritMode
      const dimMaxName = stats.maxDim ? stats.dimLabels[stats.maxDim] : ''
      const dimMaxCount = stats.maxCount || 0

      let pick
      if (mode === 'mowan') {
        const blessings = [
          `哟，连续${stats.streakDays}天修行了？难得啊，道童儿还以为你早放弃了。${dimMaxName ? dimMaxName + '练了' + dimMaxCount + '次，' : ''}行吧，勉强夸你一句：没垫底。`,
          `让道童儿看看……${stats.totalCheckinDays}天里记了${stats.totalRecords}次，${dimMaxName || '某道'}倒是练得勤。就是不知道这热情能撑几天，道童儿拭目以待。`,
          `嘿，近七日修行${stats.weekDays}天，${stats.weekDays >= 5 ? '还行，没太摸。' : '就这？道童儿家隔壁的扫地童都比你勤快。'}不过既然你求加持了，道童儿勉为其难说句：继续。`,
          `总共${stats.totalCultivation}修为，${dimMaxName ? dimMaxName + '占比最高——' : ''}看来你也就这点拿得出手了。不过道童儿向来公正，该夸还是夸：比完全不练强点。继续吧。`
        ]
        pick = blessings[Math.floor(Math.random() * blessings.length)]
      } else {
        const blessings = [
          `道童儿观道友近来勤勉，已连续修行${stats.streakDays}日，${stats.totalCheckinDays}日来累计${stats.totalCultivation}修为，毅力可嘉。\n\n${dimMaxName ? '于' + dimMaxName + '一道尤为精进，已达' + dimMaxCount + '次，' : ''}正所谓「日行一善，道心自固」。道友只管继续，道童儿看好你。`,
          `瞧道友这${stats.streakDays}天连修不断，周身已有淡淡灵气浮现了。${stats.weekDays >= 5 ? '近七日更有' + stats.weekDays + '日勤修，' : ''}这势头，假以时日必成大器。道童儿给你添盏灵茶。`,
          `道童儿翻了翻修行簿——${stats.totalCheckinDays}日间，道友踏踏实实记录了${stats.totalRecords}次修行，其中${dimMaxName || '诸道'}最是用功。这份积淀，比什么速成的路子都扎实。坚持下去，自有回响。`,
          `且看道友近日修行，${stats.weekDays >= 4 ? '七日修行' + stats.weekDays + '日，节奏甚稳，' : ''}心性已然比初入道时沉稳了许多。修行不是冲刺，是走远路。道友正走在正道上，道童儿为你击掌。`
        ]
        pick = blessings[Math.floor(Math.random() * blessings.length)]
      }

      this.addSpiritMsg(pick)
    } catch (e) {
      this.addSpiritMsg(this.getModeMsg('blessingError'))
    } finally {
      this.setData({ isAiThinking: false })
    }
  },

  async requestCriticism() {
    this.setData({ isAiThinking: true })
    try {
      const stats = await this.getChatUserStats()
      const mode = this.data.spiritMode
      const dimMaxName = stats.maxDim ? stats.dimLabels[stats.maxDim] : ''
      const dimMinName = stats.minDim ? stats.dimLabels[stats.minDim] : ''
      const dimMinCount = stats.minCount || 0

      if (mode === 'lingzhu') {
        const suggestions = []
        if (stats.breakCount >= 3) {
          suggestions.push(`道童儿注意到道友中间断了${stats.breakCount}次签到呢。修行路上偶有停顿很正常，不必自责，随时回来就好呀~`)
        }
        if (stats.lateCount >= 20) {
          suggestions.push(`道友有${stats.lateCount}次在亥时后修行，道童儿有点担心你的休息呢。修行虽重要，身体更是本钱，试试早一点修行？`)
        }
        if (stats.minCount < stats.maxCount * 0.3 && stats.minCount > 0 && stats.minDim) {
          suggestions.push(`${dimMinName}方面目前只有${dimMinCount}次修行，和其他维度比起来稍微少了些。不妨试试均衡发展，修行之路会更稳哦~`)
        }
        if (stats.weekDays <= 2 && stats.totalCheckinDays >= 7) {
          suggestions.push(`近七日修行了${stats.weekDays}天，节奏稍微慢了些。不过没关系，调整一下状态，明天再出发就好~`)
        }
        if (suggestions.length === 0) {
          suggestions.push(`道童儿仔细看了看，道友近来修行真的很均衡呢！节奏稳、维度全，没什么需要特别提醒的。继续保持就好啦~`)
        }
        const pick = suggestions[Math.floor(Math.random() * suggestions.length)]
        this.addSpiritMsg(pick)
      } else {
        const criticisms = []
        if (stats.breakCount >= 3) {
          criticisms.push(`断了${stats.breakCount}次签！道友你这道心是纸糊的吧？人家扫地童都能连续修行，你倒好，三天打鱼两天晒网。`)
        }
        if (stats.lateCount >= 20) {
          criticisms.push(`累计${stats.lateCount}次亥时后修行，道友你这是修行还是修仙？再熬夜，金丹没凝出来，黑眼圈先凝出来了。`)
        }
        if (stats.minCount < stats.maxCount * 0.3 && stats.minCount > 0 && stats.minDim) {
          criticisms.push(`${dimMinName}一途仅${dimMinCount}次修行，偏科至此，修行瘸腿走不远。道友别光顾着练擅长的，瘸腿神仙可不经打。`)
        }
        if (stats.weekDays <= 2 && stats.totalCheckinDays >= 7) {
          criticisms.push(`近七日仅修行${stats.weekDays}天，比摸鱼真人还摸。再这样下去，道童儿只好给你记个「半途而废」了。`)
        }
        if (criticisms.length === 0) {
          criticisms.push(`道童儿横看竖看，道友近来修行还真挑不出大毛病。积分稳、节奏匀、多维度不偏——啧，想骂都找不到角度。下次吧，道友可别松懈。`)
        }
        const pick = criticisms[Math.floor(Math.random() * criticisms.length)]
        this.addSpiritMsg(pick)
      }
    } catch (e) {
      this.addSpiritMsg(this.getModeMsg('criticismError'))
    } finally {
      this.setData({ isAiThinking: false })
    }
  },

  getDaysAgo(n) {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return this.formatDate(d)
  },

  // ========== 工具方法 ==========

  mapDim(dim) {
    const map = { wu: 'sport', shi: 'diet', wu_xin: 'study', gong: 'work', sha: 'debuff' }
    return map[dim] || 'diet'
  },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
})
