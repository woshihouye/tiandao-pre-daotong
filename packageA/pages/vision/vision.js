const app = getApp()
const { calculateTemplateMatch, estimateTemplateDays } = require('../../../utils/cultivation.js')
const {
  getImageDigest,
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
  callDeepSeekVision
} = require('../../utils/vision.js')
const {
  calculateTrainingScore,
  resolveTrainingPath,
  sumTodayPathScore,
  getDebuffScore,
  calculateScoreV2
} = require('../../../utils/score.js')

Page({
  data: {
    themeClass: 'theme-light-fixed',
    preferredType: '',
    activeType: '',
    typeLabel: '',
    detectedTypes: [],
    confidence: 0,
    imagePath: '',           // 预览用（选图立即赋值，不会被 resize 替换）
    rawImagePath: '',        // 上传/识别用（chooseMedia 返回的原始完整路径）
    cloudImageId: '',
    uploadStatus: 'idle',       // idle | selected | processing | uploaded | error
    processingStatus: '',       // 当前识别阶段：securing | uploading | recognizing
    digest: '',
    cacheHit: false,
    resultsByType: {},
    resultItems: [],
    showEditor: false,
    editingIndex: -1,
    editForm: {},
    // >>> 批量上传模式
    batchMode: false,
    batchImages: [],            // [{ tempPath, cloudFileId, visionResult, status: 'pending'|'uploading'|'recognizing'|'done'|'error', errorMsg }]
    batchProgress: 0,
    batchTotal: 0,
    batchProcessing: false,
    batchDoneCount: 0,
    batchErrorCount: 0
  },

  onLoad(options) {
    this.applyTheme()
    this.setData({
      preferredType: options.type || '',
      activeType: '',
      typeLabel: ''
    })
    wx.setNavigationBarTitle({ title: '灵鉴识物' })
  },

  applyTheme() {
    const tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })
  },

  async chooseCamera() {
    await this.pickImage('camera')
  },

  async chooseAlbum() {
    await this.pickImage('album')
  },

  async pickImage(sourceType) {
    try {
      const stablePath = await chooseImage(sourceType)

      this.setData({
        imagePath: stablePath,
        rawImagePath: stablePath,
        cloudImageId: '',
        uploadStatus: 'selected',
        processingStatus: 'compressing',
        resultsByType: {},
        resultItems: [],
        detectedTypes: [],
        activeType: '',
        typeLabel: '',
        confidence: 0,
        cacheHit: false,
        showEditor: false,
        editingIndex: -1,
        editForm: {}
      })

      // 后台压缩+摘要（仅用于缓存摘要，不影响预览显示和上传路径）
      // 使用 stablePath 而非 rawPath，避免临时文件被 GC 回收导致失败
      try {
        const resizedPath = await resizeToMax1024(stablePath, this)
        const digest = await getImageDigest(resizedPath)
        const userId = app.globalData.userId
        const cached = digest ? readVisionAutoCache(userId, digest) : null

        this.setData({
          uploadStatus: 'selected',
          processingStatus: '',
          digest,
          cacheHit: !!cached,
          resultsByType: cached?.resultsByType || {},
          detectedTypes: cached?.detectedTypes || [],
          activeType: cached?.activeType || '',
          typeLabel: this.getTypeLabel(cached?.activeType || ''),
          confidence: cached?.confidence || 0,
          resultItems: (cached?.resultsByType && cached?.activeType) ? (cached.resultsByType[cached.activeType] || []) : []
        })
      } catch (compressErr) {
        // 压缩/摘要失败不阻断流程：图片预览已就绪，用户仍可手动录入
        console.warn('[vision] 压缩/摘要失败，跳过缓存', compressErr)
        this.setData({ processingStatus: '' })
      }
    } catch (e) {
      app.showSystemToast('未能读取影像，请重试')
      // 失败时清空预览
      this.setData({ imagePath: '', rawImagePath: '', uploadStatus: 'idle', processingStatus: '' })
    }
  },

  resetAll() {
    this.setData({
      imagePath: '',
      rawImagePath: '',
      cloudImageId: '',
      uploadStatus: 'idle',
      processingStatus: '',
      digest: '',
      cacheHit: false,
      resultsByType: {},
      detectedTypes: [],
      activeType: '',
      typeLabel: '',
      confidence: 0,
      resultItems: [],
      showEditor: false,
      editingIndex: -1,
      editForm: {},
      batchMode: false,
      batchImages: [],
      batchProgress: 0,
      batchTotal: 0,
      batchProcessing: false,
      batchDoneCount: 0,
      batchErrorCount: 0
    })
  },

  onImageError(e) {
    console.error('[vision] 图片加载失败', {
      errMsg: e?.detail?.errMsg || '',
      imagePath: this.data.imagePath,
      cloudImageId: this.data.cloudImageId,
      uploadStatus: this.data.uploadStatus
    })
    // 如果云存储 fileID 加载失败，回退到本地路径
    if (this.data.cloudImageId && this.data.imagePath) {
      console.log('[vision] cloud fileID 加载失败，回退本地路径')
      this.setData({ cloudImageId: '', uploadStatus: 'error' })
    }
  },

  async startRecognize() {
    if (!this.data.imagePath) {
      app.showSystemToast('请先选择影像')
      return
    }

    // 检查AI隐私同意
    const aiAgreed = wx.getStorageSync('tiandao_ai_privacy_agreed')
    if (!aiAgreed) {
      const that = this
      wx.showModal({
        title: 'AI识别隐私说明',
        content: '您的饮食/运动图片将被发送至AI服务进行分析识别，图片数据仅用于本次分析，不会存储或用于其他用途。是否同意？',
        confirmText: '同意',
        cancelText: '暂不使用',
        success: function(res) {
          if (res.confirm) {
            wx.setStorageSync('tiandao_ai_privacy_agreed', true)
            that.startRecognize()
          }
        }
      })
      return
    }

    // >>> 上传/识别始终使用原始全尺寸路径，不用压缩图
    const uploadPath = this.data.rawImagePath || this.data.imagePath

    const userId = app.globalData.userId
    const cached = this.data.digest ? readVisionAutoCache(userId, this.data.digest) : null
    if (cached?.resultsByType && cached?.activeType) {
      this.setData({
        resultsByType: cached.resultsByType,
        detectedTypes: cached.detectedTypes || [],
        activeType: cached.activeType,
        typeLabel: this.getTypeLabel(cached.activeType),
        confidence: cached.confidence || 0,
        resultItems: cached.resultsByType[cached.activeType] || [],
        cacheHit: true
      })
      return
    }

    // >>> 使用内联遮罩替代全屏 loading，保留图片预览
    this.setData({ processingStatus: 'uploading' })
    try {
      // 1. 上传到云存储获取 fileId（用固化后的稳定路径）
      let cloudFileId = ''
      try {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `vision/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`,
          filePath: uploadPath
        })
        cloudFileId = uploadRes.fileID || ''
        if (cloudFileId) {
          this.setData({ cloudImageId: cloudFileId, uploadStatus: 'uploaded' })
        }
      } catch (uploadErr) {
        console.error('上传云存储失败，降级走原流程', uploadErr)
        this.setData({ uploadStatus: 'error' })
      }

      // 2. 优先走火山方舟多模态识别
      this.setData({ processingStatus: 'recognizing' })
      if (cloudFileId && wx.cloud && wx.cloud.callFunction) {
        const expectTypeMap = {
          sport: 'wu',
          diet: 'shi',
          study: 'wu_xin',
          work: 'gong',
          debuff: 'sha'
        }
        const expectType = expectTypeMap[this.data.preferredType] || ''

        // >>> 用户可见的 AI 调用状态提示
        wx.showLoading({ title: '正在调用AI识别...', mask: true })

        // console.log('[debug] 点击识别')  // 调试日志，移除敏感参数

        const deepResult = await callDeepSeekVision(
          userId, cloudFileId, expectType, this.data.digest
        )

        wx.hideLoading()

        // >>> 失败时按错误类型展示具体提示，不甩通用错误
        if (!deepResult.ok) {
          this.setData({ processingStatus: '' })

          // 内容无法识别（type=none 或 JSON解析失败）：引导用户手动选择分类
          if (deepResult.error === '无法识别请手动选择分类') {
            wx.showToast({ title: '无法识别请手动选择分类', icon: 'none', duration: 2000 })
            const chosen = await this.askUserType()
            if (!chosen) return
            // 用户手动选择了类型，直接跳转对应录入页
            this.goManual(chosen)
            return
          }

          // 真实 AI 服务错误（网络/API/密钥等）
          this.showRecognitionError(deepResult.error || '', deepResult.errorCode || -1)
          await app.showSystemModal(
            deepResult.error
              ? this.mapAIError(deepResult.error, deepResult.errorCode)
              : 'AI灵阵暂歇，可手动录入或重试',
            '去手动录入'
          )
          return
        }

        const classified = deepResult.classified || {}
        const items = deepResult.items || []
        const primaryType = classified.primaryType || ''

        // [断点6] 追踪分类切换与字段赋值
        console.log('=== startRecognize 分类切换 ===')
        console.log('classified对象：', JSON.stringify(classified))
        console.log('primaryType：', primaryType)
        console.log('items数量：', items.length, '第一条：', JSON.stringify(items[0] || {}).slice(0, 300))
        console.log('将切换到activeType：', primaryType, '对应标签：', this.getTypeLabel(primaryType))

        // primaryType 为空时（分类完全失败），不强制默认食tab，引导手动选择
        if (!primaryType) {
          console.warn('primaryType 为空，分类失败，引导手动选择')
          this.setData({ processingStatus: '' })
          wx.showToast({ title: '无法识别请手动选择分类', icon: 'none', duration: 2000 })
          const chosen = await this.askUserType()
          if (!chosen) return
          this.goManual(chosen)
          return
        }
        const finalTypes = [primaryType]

        const resultsByType = {}
        resultsByType[primaryType] = items.map((item) => ({
          ...item,
          source: deepResult.fromCache ? '缓存识图' : (item.source || 'AI识图')
        }))

        this.setData({
          detectedTypes: finalTypes,
          confidence: classified.confidence || 0.85,
          activeType: primaryType,
          typeLabel: this.getTypeLabel(primaryType),
          resultsByType,
          resultItems: resultsByType[primaryType] || [],
          cacheHit: deepResult.fromCache || false,
          processingStatus: ''
        })

        // [断点7] setData后确认状态
        console.log('=== setData 完成 ===')
        console.log('当前 activeType：', this.data.activeType)
        console.log('resultItems 条数：', this.data.resultItems.length)
        console.log('resultsByType keys：', Object.keys(this.data.resultsByType))

        if (this.data.digest && deepResult.ok) {
          writeVisionAutoCache(userId, this.data.digest, {
            activeType: primaryType,
            confidence: classified.confidence || 0.85,
            detectedTypes: finalTypes,
            resultsByType
          })
        }
        return
      }

      // 3. 兜底：云上传失败，引导手动录入
      this.setData({ processingStatus: '' })
      const modal = await app.showSystemModal('云端服务暂不可用，可直接前往手动录入。', '去手动录入')
      if (modal.confirm) {
        this.goManual(this.data.preferredType || 'sport')
      }
    } catch (e) {
      console.error(e)
      this.setData({ processingStatus: '' })
      const modal = await app.showSystemModal('识别失败或影像模糊，可直接前往手动录入。', '去手动录入')
      if (modal.confirm) {
        this.goManual(this.data.preferredType || 'sport')
      }
    }
  },

  // ============================================================
  // >>> 批量上传识别功能
  // ============================================================

  /**
   * 启动批量上传：选择最多9张当天图片
   */
  async startBatchUpload() {
    // 检查AI隐私同意
    const aiAgreed = wx.getStorageSync('tiandao_ai_privacy_agreed')
    if (!aiAgreed) {
      const that = this
      wx.showModal({
        title: 'AI识别隐私说明',
        content: '您的饮食/运动图片将被发送至AI服务进行分析识别，图片数据仅用于本次分析，不会存储或用于其他用途。是否同意？',
        confirmText: '同意',
        cancelText: '暂不使用',
        success: function(res) {
          if (res.confirm) {
            wx.setStorageSync('tiandao_ai_privacy_agreed', true)
            that.startBatchUpload()
          }
        }
      })
      return
    }

    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseImage({
          count: 9,
          sizeType: ['compressed'],
          sourceType: ['album'],
          success: resolve,
          fail: reject
        })
      })

      const tempPaths = res.tempFilePaths || []
      if (!tempPaths.length) return

      wx.showLoading({ title: '校验影像日期...' })

      // 获取每张图片的文件信息，校验是否为当天创建
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayTs = todayStart.getTime()

      const batchImages = []
      const skippedPaths = []

      for (const tempPath of tempPaths) {
        try {
          const fileInfo = await new Promise((resolve, reject) => {
            wx.getFileInfo({
              filePath: tempPath,
              success: resolve,
              fail: reject
            })
          })
          // createTime 为毫秒时间戳
          const createTime = (fileInfo.createTime || 0) * 1000
          if (createTime >= todayTs) {
            batchImages.push({
              tempPath,
              cloudFileId: '',
              visionResult: null,
              status: 'pending',
              errorMsg: '',
              index: batchImages.length
            })
          } else {
            skippedPaths.push(tempPath)
          }
        } catch (_) {
          // getFileInfo 失败时也纳入，避免因权限问题误拦
          batchImages.push({
            tempPath,
            cloudFileId: '',
            visionResult: null,
            status: 'pending',
            errorMsg: '',
            index: batchImages.length
          })
        }
      }

      wx.hideLoading()

      if (skippedPaths.length > 0 && batchImages.length === 0) {
        await app.showSystemModal('所选图片均非当天拍摄，请重新选择', '知道了')
        return
      }

      if (skippedPaths.length > 0) {
        wx.showToast({ title: `已过滤${skippedPaths.length}张非当天图片`, icon: 'none', duration: 2000 })
      }

      if (!batchImages.length) return

      this.setData({
        batchMode: true,
        batchImages,
        batchTotal: batchImages.length,
        batchProgress: 0,
        batchProcessing: false,
        batchDoneCount: 0,
        batchErrorCount: 0,
        imagePath: '',
        rawImagePath: '',
        resultItems: [],
        resultsByType: {},
        detectedTypes: [],
        activeType: '',
        typeLabel: ''
      })

      // 自动开始处理
      await this.processBatchImages()
    } catch (e) {
      wx.hideLoading()
      if (e.errMsg && e.errMsg.includes('cancel')) return
      console.error('[batch] 批量选图失败:', e)
      app.showSystemToast('选图失败，请重试')
    }
  },

  /**
   * 逐张处理批量图片：上传 → 识别
   */
  async processBatchImages() {
    const images = this.data.batchImages
    if (!images.length) return

    this.setData({ batchProcessing: true, batchProgress: 0 })

    for (let i = 0; i < images.length; i++) {
      await this.processSingleBatchImage(i)
      this.setData({ batchProgress: i + 1 })
    }

    this.setData({ batchProcessing: false })
    wx.hideLoading()

    // 统计识别结果
    const doneCount = images.filter(img => img.status === 'done').length
    const errorCount = images.filter(img => img.status === 'error').length

    this.setData({
      batchDoneCount: doneCount,
      batchErrorCount: errorCount
    })

    if (doneCount === 0) {
      await app.showSystemModal('所有图片均识别失败，请检查网络后重试', '知道了')
      return
    }

    wx.showToast({ title: `识别完成：成功${doneCount}张` + (errorCount > 0 ? `，失败${errorCount}张` : ''), icon: 'none', duration: 2500 })
  },

  /**
   * 处理单张批量图片：上传云存储 + 调用AI识别
   */
  async processSingleBatchImage(index) {
    const images = this.data.batchImages
    const img = images[index]
    if (!img) return

    // 更新状态：安全校验中
    images[index] = { ...img, status: 'securing' }
    this.setData({ batchImages: images })

    const userId = app.globalData.userId

    try {
      // 0. 内容安全校验（与单图流程一致）
      try {
        const base64 = await readFileAsBase64(img.tempPath)
        const security = await checkImageSecurity(base64)
        if (!security.ok) {
          images[index] = { ...img, status: 'error', errorMsg: security.reason || '图片未通过安全校验' }
          this.setData({ batchImages: images })
          return
        }
      } catch (secErr) {
        // 安全校验服务不可用时放行，不阻塞用户体验
        console.warn('[batch] 安全校验异常，放行', secErr)
      }

      // 1. 上传到云存储
      images[index] = { ...images[index], status: 'uploading' }
      this.setData({ batchImages: images })

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `vision/batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${index}.jpg`,
        filePath: img.tempPath
      })
      const cloudFileId = uploadRes.fileID || ''
      if (!cloudFileId) {
        images[index] = { ...images[index], status: 'error', errorMsg: '上传失败' }
        this.setData({ batchImages: images })
        return
      }
      images[index] = { ...images[index], cloudFileId, status: 'recognizing' }
      this.setData({ batchImages: images })

      // 2. 调用 AI 识别
      wx.showLoading({ title: `识别中 ${index + 1}/${this.data.batchTotal}...`, mask: true })

      const deepResult = await callDeepSeekVision(userId, cloudFileId, '', '')

      if (!deepResult.ok) {
        images[index] = {
          ...images[index],
          status: 'error',
          errorMsg: deepResult.error || 'AI识别失败'
        }
        this.setData({ batchImages: images })
        return
      }

      // 3. 保存识别结果
      const classified = deepResult.classified || {}
      const items = deepResult.items || []
      const primaryType = classified.primaryType || 'diet'

      images[index] = {
        ...images[index],
        status: 'done',
        visionResult: {
          visionRaw: deepResult.visionRaw || null,
          primaryType,
          items: items.map(item => ({
            ...item,
            source: item.source || 'AI识图'
          }))
        }
      }
      this.setData({ batchImages: images })

    } catch (e) {
      console.error(`[batch] 图片${index}处理失败:`, e)
      images[index] = { ...img, status: 'error', errorMsg: '处理异常' }
      this.setData({ batchImages: images })
    }
  },

  /**
   * 删除单张批量识别结果
   */
  removeBatchResult(e) {
    const index = Number(e.currentTarget.dataset.idx)
    const images = this.data.batchImages
    if (index < 0 || index >= images.length) return

    images[index] = {
      ...images[index],
      status: 'removed',
      visionResult: null,
      cloudFileId: ''
    }
    const doneCount = images.filter(img => img.status === 'done').length
    const errorCount = images.filter(img => img.status === 'error').length
    this.setData({
      batchImages: images,
      batchDoneCount: doneCount,
      batchErrorCount: errorCount
    })
    app.showSystemToast('已移除该条记录')
  },

  /**
   * 编辑单张批量识别结果
   */
  editBatchResult(e) {
    const index = Number(e.currentTarget.dataset.idx)
    const img = this.data.batchImages[index]
    if (!img || !img.visionResult) return

    const items = img.visionResult.items || []
    if (!items.length) return

    const item = items[0]
    const primaryType = img.visionResult.primaryType || 'diet'

    this.setData({
      showEditor: true,
      editingIndex: index,
      activeType: primaryType,
      editForm: this.buildEditForm(item),
      _editingBatchItem: true
    })
  },

  /**
   * 保存批量结果的编辑（覆盖默认 saveEditor 行为）
   */
  saveBatchEditor() {
    const idx = this.data.editingIndex
    if (idx < 0) return

    const images = this.data.batchImages
    const img = images[idx]
    if (!img || !img.visionResult) return

    const form = this.data.editForm || {}
    const items = img.visionResult.items || []
    const origin = items[0] || {}
    const visionRaw = img.visionResult.visionRaw || {}

    if (this.data.activeType === 'sport') {
      img.visionResult.items[0] = {
        ...origin,
        name: form.name || origin.name,
        duration: Number(form.duration) || 0,
        calories: Number(form.calories) || 0
      }
      img.visionResult.visionRaw = { ...visionRaw, content: form.name || visionRaw.content }
    } else if (this.data.activeType === 'diet') {
      img.visionResult.items[0] = {
        ...origin,
        name: form.name || origin.name,
        weight: Number(form.weight) || 0,
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        fiber: Number(form.fiber) || 0
      }
      img.visionResult.visionRaw = {
        ...visionRaw,
        content: form.name || visionRaw.content,
        weight: Number(form.weight) || 0,
        calorie: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carb: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        fiber: Number(form.fiber) || 0
      }
    } else if (this.data.activeType === 'work' || this.data.activeType === 'study') {
      img.visionResult.items[0] = {
        ...origin,
        name: form.name || origin.name,
        duration: Number(form.duration) || 0
      }
      img.visionResult.visionRaw = { ...visionRaw, content: form.name || visionRaw.content }
    } else {
      img.visionResult.items[0] = {
        ...origin,
        name: form.name || origin.name,
        deductCultivation: Number(form.deductCultivation) || 0
      }
      img.visionResult.visionRaw = { ...visionRaw, content: form.name || visionRaw.content }
    }

    this.setData({
      batchImages: images,
      showEditor: false,
      editingIndex: -1,
      editForm: {},
      _editingBatchItem: false
    })
  },

  /**
   * 批量确认录入：汇总所有成功的识别结果，复用现有入库逻辑
   */
  async confirmBatchRecords() {
    const images = this.data.batchImages
    const doneImages = images.filter(img => img.status === 'done' && img.visionResult)
    if (!doneImages.length) {
      app.showSystemToast('暂无可录入的识别结果')
      return
    }

    const modal = await app.showSystemModal(`确认将${doneImages.length}条识别结果录入修行记录？`, '确认录入')
    if (!modal.confirm) return

    const db = app.globalData.db
    const userId = app.globalData.userId
    if (!db || !userId) {
      app.showSystemToast('云海灵阵尚未连通')
      return
    }

    wx.showLoading({ title: '批量写入修行簿...' })
    try {
      const profile = await app.ensureUserProfile()
      const date = this.getTodayDate()
      const timestampBase = Date.now()
      const systemKey = app.getCultivationSystem
        ? app.getCultivationSystem()
        : (profile?.cultivationSystem || 'traditional')

      let todaySportRecords = []
      try {
        const todaySportRes = await db.collection('records')
          .where({ userId, date, category: 'sport' })
          .get()
        todaySportRecords = todaySportRes.data || []
      } catch (error) {
        console.error('读取今日武道记录失败', error)
      }

      const todayTypeScoreMap = {
        lianti: sumTodayPathScore(todaySportRecords, 'lianti'),
        lianqi: sumTodayPathScore(todaySportRecords, 'lianqi'),
        yangqi: sumTodayPathScore(todaySportRecords, 'yangqi'),
        xiuxin: sumTodayPathScore(todaySportRecords, 'xiuxin'),
        richang: sumTodayPathScore(todaySportRecords, 'richang')
      }

      const scoreOptions = { systemKey, todayTypeScoreMap }

      // 汇总所有识别结果，按类型聚合
      const resultsByType = {}
      for (const img of doneImages) {
        const primaryType = img.visionResult.primaryType || 'diet'
        const items = img.visionResult.items || []
        if (!resultsByType[primaryType]) {
          resultsByType[primaryType] = []
        }
        resultsByType[primaryType].push(...items)
      }

      const typesToSave = Object.keys(resultsByType).filter(key => (resultsByType[key] || []).length)
      const inserted = []

      for (const type of typesToSave) {
        const items = resultsByType[type] || []
        if (!items.length) continue

        if (type === 'debuff') {
          let allowed = await this.getDebuffAllowance(db, userId, date)
          for (const item of items) {
            if (allowed <= 0) break
            const record = this.buildRecordPayload(type, item, date, timestampBase + inserted.length, scoreOptions)
            const itemDeduct = Math.min(Math.abs(Number(record.detail.deductCultivation) || 0), allowed)
            record.detail.deductCultivation = itemDeduct
            record.score = -itemDeduct
            inserted.push(record)
            allowed -= itemDeduct
          }
          continue
        }

        const startIndex = inserted.length
        items.forEach((item, index) => {
          inserted.push(this.buildRecordPayload(type, item, date, timestampBase + startIndex + index, scoreOptions))
        })
      }

      if (!inserted.length) {
        wx.hideLoading()
        app.showSystemToast('暂无可录入的数据')
        return
      }

      const scoreDelta = inserted.reduce((sum, item) => sum + Number(item.score || 0), 0)
      await Promise.all(inserted.map(rec => db.collection('records').add({
        data: {
          ...rec,
          userId,
          createdAt: Date.now()
        }
      })))

      await this.updateProfileAfterInsert(db, profile, date, scoreDelta)
      wx.hideLoading()
      app.showSystemToast(`已录入${inserted.length}条记录并同步修为`, 'success')

      this.resetAll()
      wx.navigateBack()
    } catch (e) {
      console.error('[batch] 批量录入失败:', e)
      wx.hideLoading()
      app.showSystemToast('录入失败，请稍后再试')
    }
  },

  /**
   * 取消批量识别
   */
  cancelBatch() {
    this.resetAll()
    app.showSystemToast('已取消批量识别')
  },

  getTypeLabel(type) {
    const map = {
      sport: '武·炼体',
      diet: '食·丹食',
      study: '悟·修心',
      work: '工·功业',
      debuff: '煞·心魔'
    }
    return map[type] || '未知'
  },

  /**
   * 批量结果中获取类型中文标签（用于 wxml）
   */
  getBatchTypeLabel(primaryType) {
    return this.getTypeLabel(primaryType)
  },

  askUserType() {
    return new Promise((resolve) => {
      wx.showActionSheet({
        itemList: ['武·炼体', '食·丹食', '悟·修心', '工·功业', '煞·心魔'],
        success: (res) => {
          const idx = Number(res.tapIndex)
          const types = ['sport', 'diet', 'study', 'work', 'debuff']
          resolve(types[idx] || '')
        },
        fail: () => resolve('')
      })
    })
  },

  async recognizeAllNeeded(base64, types) {
    const unique = [...new Set(types)]
    const jobs = unique.map(async (type) => {
      const result = await recognizeWithRetry(type, base64)
      let items = (result?.items || []).map((item) => ({
        ...item,
        source: item.source || (type === 'debuff' ? 'AI识图判定' : 'AI识图')
      }))

      if (type === 'debuff' && items.length > 1) {
        const maxDeduct = items.reduce((max, item) => Math.max(max, Number(item.deductCultivation) || 0), 0)
        const base = items[0] || {}
        items = [
          {
            ...base,
            name: base.name || '心魔判定',
            deductCultivation: maxDeduct || (Number(base.deductCultivation) || 0),
            source: base.source || 'AI识图判定'
          }
        ]
      }

      return { type, items }
    })
    const results = await Promise.all(jobs)
    return results.reduce((map, item) => {
      map[item.type] = item.items
      return map
    }, {})
  },

  async switchResultType(e) {
    const type = e.currentTarget.dataset.type
    if (!type || type === this.data.activeType) {
      return
    }

    const cachedItems = this.data.resultsByType[type]
    if (cachedItems && cachedItems.length) {
      this.setData({
        activeType: type,
        typeLabel: this.getTypeLabel(type),
        resultItems: cachedItems
      })
      return
    }

    if (!this.data.imagePath) {
      return
    }

    // >>> 使用原始路径读取，不用压缩图
    const base64Path = this.data.rawImagePath || this.data.imagePath

    wx.showLoading({ title: '重推演中...' })
    try {
      const base64 = await readFileAsBase64(base64Path)
      const resultsByType = { ...this.data.resultsByType }
      const next = await this.recognizeAllNeeded(base64, [type])
      resultsByType[type] = next[type] || []
      this.setData({
        activeType: type,
        typeLabel: this.getTypeLabel(type),
        resultsByType,
        resultItems: resultsByType[type] || []
      })

      if (this.data.digest) {
        const userId = app.globalData.userId
        writeVisionAutoCache(userId, this.data.digest, {
          activeType: type,
          confidence: this.data.confidence,
          detectedTypes: this.data.detectedTypes,
          resultsByType
        })
      }
    } catch (error) {
      console.error(error)
      app.showSystemToast('重推演失败')
    } finally {
      wx.hideLoading()
    }
  },

  goManual(type) {
    // >>> 五分类手动录入映射
    const typeMap = {
      sport: 'sport',
      diet: 'diet',
      study: 'study',
      work: 'work',
      debuff: 'debuff'
    }
    const tabType = typeMap[type] || 'sport'
    wx.navigateTo({
      url: `/pages/record/record?type=${tabType}`
    })
  },

  openEditor(e) {
    const index = Number(e.currentTarget.dataset.idx)
    const item = this.data.resultItems[index]
    if (!item) return

    this.setData({
      showEditor: true,
      editingIndex: index,
      editForm: this.buildEditForm(item)
    })
  },

  buildEditForm(item) {
    if (this.data.activeType === 'sport') {
      return {
        name: item.name,
        duration: String(item.duration ?? ''),
        calories: String(item.calories ?? '')
      }
    }

    if (this.data.activeType === 'diet') {
      return {
        name: item.name,
        weight: String(item.weight ?? ''),
        calories: String(item.calories ?? ''),
        protein: String(item.protein ?? ''),
        carbs: String(item.carbs ?? ''),
        fat: String(item.fat ?? ''),
        fiber: String(item.fiber ?? '')
      }
    }

    if (this.data.activeType === 'work' || this.data.activeType === 'study') {
      return {
        name: item.name,
        duration: String(item.duration ?? '')
      }
    }

    return {
      name: item.name,
      deductCultivation: String(item.deductCultivation ?? '')
    }
  },

  closeEditor() {
    this.setData({
      showEditor: false,
      editingIndex: -1,
      editForm: {},
      _editingBatchItem: false
    })
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`editForm.${field}`]: e.detail.value
    })
  },

  saveEditor() {
    // 批量编辑模式：转发到 saveBatchEditor
    if (this.data._editingBatchItem) {
      return this.saveBatchEditor()
    }

    const idx = this.data.editingIndex
    if (idx < 0) return

    const items = [...this.data.resultItems]
    const origin = items[idx] || {}
    const form = this.data.editForm || {}

    if (this.data.activeType === 'sport') {
      items[idx] = {
        ...origin,
        name: form.name || origin.name,
        duration: Number(form.duration) || 0,
        calories: Number(form.calories) || 0
      }
    } else if (this.data.activeType === 'diet') {
      items[idx] = {
        ...origin,
        name: form.name || origin.name,
        weight: Number(form.weight) || 0,
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        fiber: Number(form.fiber) || 0
      }
    } else if (this.data.activeType === 'work' || this.data.activeType === 'study') {
      items[idx] = {
        ...origin,
        name: form.name || origin.name,
        duration: Number(form.duration) || 0
      }
    } else {
      items[idx] = {
        ...origin,
        name: form.name || origin.name,
        deductCultivation: Number(form.deductCultivation) || 0
      }
    }

    this.setData({
      resultsByType: {
        ...this.data.resultsByType,
        [this.data.activeType]: items
      },
      resultItems: items,
      showEditor: false,
      editingIndex: -1,
      editForm: {}
    })
  },

  cancelRecords() {
    this.setData({
      resultItems: []
    })
    app.showSystemToast('已撤销本次识别结果')
  },

  async confirmRecords(e) {
    const mode = e?.currentTarget?.dataset?.mode || 'current'
    const db = app.globalData.db
    const userId = app.globalData.userId
    if (!db || !userId) {
      app.showSystemToast('云海灵阵尚未连通')
      return
    }

    if (!this.data.resultItems.length) {
      app.showSystemToast('暂无可录入的识别结果')
      return
    }

    const modal = await app.showSystemModal('确认将识别结果录入修行记录？', '确认录入')
    if (!modal.confirm) {
      return
    }

    wx.showLoading({ title: '写入修行簿...' })
    try {
      const profile = await app.ensureUserProfile()
      const date = this.getTodayDate()
      const timestampBase = Date.now()
      const systemKey = app.getCultivationSystem
        ? app.getCultivationSystem()
        : (profile?.cultivationSystem || 'traditional')

      let todaySportRecords = []
      try {
        const todaySportRes = await db.collection('records')
          .where({ userId, date, category: 'sport' })
          .get()
        todaySportRecords = todaySportRes.data || []
      } catch (error) {
        console.error('读取今日武道记录失败', error)
      }

      const todayTypeScoreMap = {
        lianti: sumTodayPathScore(todaySportRecords, 'lianti'),
        lianqi: sumTodayPathScore(todaySportRecords, 'lianqi'),
        yangqi: sumTodayPathScore(todaySportRecords, 'yangqi'),
        xiuxin: sumTodayPathScore(todaySportRecords, 'xiuxin'),
        richang: sumTodayPathScore(todaySportRecords, 'richang')
      }

      const scoreOptions = { systemKey, todayTypeScoreMap }

      const typesToSave = mode === 'all'
        ? Object.keys(this.data.resultsByType).filter((key) => (this.data.resultsByType[key] || []).length)
        : [this.data.activeType]

      const inserted = []
      for (const type of typesToSave) {
        const items = this.data.resultsByType[type] || []
        if (!items.length) continue

        if (type === 'debuff') {
          const allowed = await this.getDebuffAllowance(db, userId, date)
          if (allowed <= 0) {
            continue
          }
          const record = this.buildRecordPayload(type, items[0], date, timestampBase + inserted.length, scoreOptions)
          record.detail.deductCultivation = Math.min(Number(record.detail.deductCultivation) || 0, allowed)
          record.score = -Math.min(Math.abs(Number(record.score) || 0), allowed)
          inserted.push(record)
          continue
        }

        const startIndex = inserted.length
        items.forEach((item, index) => {
          inserted.push(this.buildRecordPayload(
            type,
            item,
            date,
            timestampBase + startIndex + index,
            scoreOptions
          ))
        })
      }

      if (!inserted.length) {
        wx.hideLoading()
        app.showSystemToast('暂无可录入的数据')
        return
      }

      const scoreDelta = inserted.reduce((sum, item) => sum + Number(item.score || 0), 0)
      await Promise.all(inserted.map((rec) => db.collection('records').add({
        data: {
          ...rec,
          userId,
          createdAt: Date.now()
        }
      })))

      await this.updateProfileAfterInsert(db, profile, date, scoreDelta)
      wx.hideLoading()
      app.showSystemToast('识别记录已入库并同步修为', 'success')

      this.resetAll()
      wx.navigateBack()
    } catch (e) {
      console.error(e)
      wx.hideLoading()
      app.showSystemToast('录入失败，请稍后再试')
    }
  },

  buildRecordPayload(type, item, date, timestamp, options = {}) {
    if (type === 'sport') {
      const trainingPath = resolveTrainingPath({
        trainingPath: item.trainingPath,
        trainingType: item.trainingType || 'AI识图推算',
        name: item.name
      })
      const todayUsed = options.todayTypeScoreMap
        ? (options.todayTypeScoreMap[trainingPath] || 0)
        : 0
      const result = calculateTrainingScore({
        trainingPath,
        trainingType: item.trainingType || 'AI识图推算',
        name: item.name,
        sets: Number(item.sets) || 1,
        duration: Number(item.duration) || 30
      }, {
        systemKey: options.systemKey || 'traditional',
        todayTypeScore: todayUsed
      })

      // 累计今日该道途已用额度，避免同批多条冲破上限
      if (options.todayTypeScoreMap) {
        options.todayTypeScoreMap[trainingPath] = todayUsed + result.score
      }

      return {
        date,
        timestamp,
        category: 'sport',
        name: item.name,
        score: result.score,
        detail: {
          source: item.source || 'AI识图',
          trainingPath: result.trainingPath,
          trainingType: result.pathName,
          duration: Number(item.duration) || 30,
          calories: Number(item.calories) || 0,
          rawScore: result.rawScore,
          bonusRate: result.bonusRate
        }
      }
    }

    if (type === 'diet') {
      const score = buildDietScoreByMacros(item)
      return {
        date,
        timestamp,
        category: 'diet',
        name: item.name,
        score,
        detail: {
          source: item.source || 'AI识图',
          meal: item.meal || '未分餐',
          weight: Number(item.weight) || 0,
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat) || 0,
          fiber: Number(item.fiber) || 0,
          foodQuality: score < 0 ? 'junk' : 'healthy'
        }
      }
    }

    if (type === 'study') {
      const scoreResult = calculateScoreV2('study', {
        duration: Number(item.duration) || 0
      }, {
        verifySource: 'ai_vision',
        systemKey: options.systemKey || 'traditional'
      })
      return {
        date,
        timestamp,
        category: 'study',
        name: item.name || '修心悟道',
        score: (scoreResult && scoreResult.score) || 0,
        detail: {
          source: item.source || 'AI识图',
          duration: Number(item.duration) || 0
        }
      }
    }

    if (type === 'work') {
      const scoreResult = calculateScoreV2('work', {
        duration: Number(item.duration) || 0
      }, {
        verifySource: 'ai_vision',
        systemKey: options.systemKey || 'traditional'
      })
      return {
        date,
        timestamp,
        category: 'work',
        name: item.name || '功业产出',
        score: (scoreResult && scoreResult.score) || 0,
        detail: {
          source: item.source || 'AI识图',
          duration: Number(item.duration) || 0
        }
      }
    }

    // type === 'debuff' 兜底
    const deduct = Math.abs(getDebuffScore(item.debuffType || item.name))
    const customDeduct = Number(item.deductCultivation)
    const finalDeduct = Number.isFinite(customDeduct) && customDeduct > 0 ? customDeduct : deduct
    return {
      date,
      timestamp,
      category: 'debuff',
      name: item.name,
      score: -Math.abs(finalDeduct || 3),
      detail: {
        source: item.source || 'AI识图判定',
        debuffType: item.name,
        deductCultivation: Math.abs(finalDeduct || 3)
      }
    }
  },

  async getDebuffAllowance(db, userId, date) {
    const res = await db.collection('records')
      .where({
        userId,
        category: 'debuff',
        date
      })
      .get()
    const current = res.data.reduce((sum, item) => sum + Math.abs(Number(item.score || 0)), 0)
    return Math.max(0, 100 - current)
  },

  async updateProfileAfterInsert(db, profile, date, scoreDelta) {
    const userId = app.globalData.userId

    // >>> 积分统一走 addScore
    if (app.addScore && Number(scoreDelta)) {
      await app.addScore(Number(scoreDelta), {
        lastCheckInDate: date
      })
    }

    const todayRecordsRes = await db.collection('records')
      .where({ userId, date })
      .get()

    const todayRecords = todayRecordsRes.data || []
    const sportCount = todayRecords.filter((item) => item.category === 'sport').length
    const dietPositive = todayRecords.filter((item) => item.category === 'diet' && Number(item.score) > 0).length
    const hasDebuff = todayRecords.some((item) => item.category === 'debuff')

    const dailyMatch = calculateTemplateMatch({
      exerciseCompletion: Math.min(1, sportCount / 2),
      dietMatch: Math.min(1, dietPositive / 3),
      scheduleCompliance: hasDebuff ? 0.6 : 1,
      continuity: 1
    })

    const totalProgress = Math.min(
      100,
      Math.round((((profile?.totalProgress || 0) * 4) + dailyMatch) / 5)
    )
    const estimatedDays = estimateTemplateDays(totalProgress, dailyMatch)

    const profileUpdate = {
      lastCheckInDate: date,
      dailyMatch,
      weeklyMatch: Math.round((((profile?.weeklyMatch || dailyMatch) * 6) + dailyMatch) / 7),
      totalProgress,
      estimatedDays,
      updatedAt: Date.now()
    }

    if (profile?._id) {
      await db.collection('users').doc(profile._id).update({ data: profileUpdate })
      if (app.syncUserProfile) {
        app.syncUserProfile(profileUpdate)
      }
    }
  },

  getTodayDate() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  /**
   * 根据 AI 错误信息映射为具体错误提示
   * 密钥错误 / 余额不足 / 网络超时 / 其他
   */
  mapAIError(errorMsg, errorCode) {
    const code = Number(errorCode)
    const msg = String(errorMsg).toLowerCase()
    if (code === 401 || msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('密钥') || msg.includes('api key')) {
      return 'AI服务密钥配置错误，请检查云函数环境变量'
    }
    if (code === 402 || msg.includes('insufficient') || msg.includes('balance') || msg.includes('quota') || msg.includes('余额')) {
      return 'AI服务余额不足，请前往AI服务平台充值'
    }
    if (code === 408 || msg.includes('timeout') || msg.includes('超时') || msg.includes('timed out')) {
      return '网络超时，请检查网络后重试'
    }
    if (code === 429 || msg.includes('rate') || msg.includes('limit')) {
      return '请求过于频繁，请稍后再试'
    }
    return errorMsg || 'AI识别失败，请稍后重试'
  },

  /**
   * 弹出错误 toast + 控制台日志
   */
  showRecognitionError(errorMsg, errorCode) {
    const toast = this.mapAIError(errorMsg, errorCode)
    wx.showToast({ title: toast, icon: 'none', duration: 3000 })
    console.error(`[AI识别失败] errorCode=${errorCode}, errorMsg=${errorMsg}`)
  }
})

