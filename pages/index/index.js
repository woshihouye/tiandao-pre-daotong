// 天道修行首页逻辑 - v1.0.3 精英模板系统版
const app = getApp();
const { calculateRealm, calculateDailyCultivation } = require('../../utils/cultivation.js');
var cultivationUtil = require('../../utils/cultivation.js')
var systemModule = require('../../utils/system.js')
const { getDetailPageUrl } = require('../../utils/detail-board.js');
const eliteModule = require('../../utils/elite-template.js');
var optimalScore = require('../../utils/optimal-score.js')
var dailyEval = require('../../utils/daily-evaluation.js')

Page({
  data: {
    themeClass: 'theme-dusk',
    todayScore: 0,
    totalCultivation: 0,
    slogan: '夕阳无限，修为尚有余力',
    records: [],
    isNewUser: false,
    animateScore: false,
    currentRealm: { id: 'lianqi', name: '炼精化气', stage: 1, remaining: 33 },
    realmProgress: 0,
    todayEstimation: 20,
    learningTemplate: null,
    dailyMatch: 0,
    totalProgress: 0,
    estDays: 30,

    // >>> 系统面板
    dailyTasks: [],
    fortune: null,
    announcement: '',
    titlePoem: '',
    showBreakthrough: false,
    breakthroughData: null,
    breakthroughWarning: null,
    buTianSummary: null,
    unlockedTitlePopup: null,
    poemShowcaseId: '',

    // >>> 功德系统
    meritData: null,

    // >>> 精英模板系统
    eliteJourney: null,
    eliteTemplate: null,
    eliteProgress: 0,
    eliteMatchRate: 0,
    eliteSystemMsg: null
  },

  onLoad() {
    this.loadUserData()
    this._themeChangedHandler = (payload) => {
      this.refreshTheme()
    }
    if (app.onAppEvent) {
      app.onAppEvent('themeOverrideChanged', this._themeChangedHandler)
    }

    // 监听称号定场诗变化
    this._poemChangedHandler = function(payload) {
      if (payload && payload.poem) {
        this.setData({ titlePoem: payload.poem })
      } else {
        this.setData({ titlePoem: '' })
      }
    }.bind(this)
    if (app.onAppEvent) {
      app.onAppEvent('title-poem-changed', this._poemChangedHandler)
    }

    // 监听称号装备事件
    this._titleEquippedHandler = function(payload) {
      this.loadTitlePoem()
    }.bind(this)
    if (app.onAppEvent) {
      app.onAppEvent('title-equipped', this._titleEquippedHandler)
    }

    // 监听模板旅程变更
    this._journeyChangedHandler = function() {
      this.loadEliteJourney()
    }.bind(this)
    if (app.onAppEvent) {
      app.onAppEvent('elite-journey-changed', this._journeyChangedHandler)
    }
  },

  onShow() {
    // 引导态下强制刷新，确保完成首条后引导态消失
    if (this.data.isNewUser === true) {
      this._recordsLoaded = false
    }
    this.loadUserData()
    // v4.0: 检查突破预警
    if (app.checkBreakthroughWarning) {
      var warning = app.checkBreakthroughWarning()
      if (warning.nearBreakthrough) {
        warning.warningPercent = Math.round(warning.progress * 100)
      }
      this.setData({ breakthroughWarning: warning.nearBreakthrough ? warning : null })
    }
    // v4.0: 补天计划
    try {
      var buTian = require('../../utils/bu-tian-activity.js')
      this.setData({ buTianSummary: buTian.getActivitySummary() })
    } catch(e) {}
  },

  onUnload() {
    if (this._themeChangedHandler && app.offAppEvent) {
      app.offAppEvent('themeOverrideChanged', this._themeChangedHandler)
    }
    if (this._poemChangedHandler && app.offAppEvent) {
      app.offAppEvent('title-poem-changed', this._poemChangedHandler)
    }
    if (this._titleEquippedHandler && app.offAppEvent) {
      app.offAppEvent('title-equipped', this._titleEquippedHandler)
    }
    if (this._journeyChangedHandler && app.offAppEvent) {
      app.offAppEvent('elite-journey-changed', this._journeyChangedHandler)
    }
  },

  refreshTheme() {
    const todayScore = this.data.todayScore != null ? this.data.todayScore : 0
    const themeClass = app.resolveThemeClass ? app.resolveThemeClass(todayScore) : 'theme-hongchen'
    this.setData({ themeClass })
  },

  async loadUserData() {
    var db = app.globalData.db;
    if (!db) return;

    var today = this.getTodayDate();
    
    // >>> 性能优化：同一次会话内不重复拉取今日记录
    if (this._lastLoadDate === today && this._recordsLoaded) {
      return
    }
    this._lastLoadDate = today

    var userInfo = await this.getUserInfo(db);

    try {
      var streakPenalty = await cultivationUtil.checkAndApplyStreakPenalty(userInfo)
      if (streakPenalty && streakPenalty.penalty > 0) {
        wx.showToast({ title: '道心蒙尘 ' + streakPenalty.days + ' 天，修为-' + streakPenalty.penalty, icon: 'none' })
      }
    } catch (e) {
      console.warn('断签惩罚判定异常', e)
    }

    try {
      var records = await db.collection('records')
        .where({
          userId: app.globalData.userId,
          date: today
        })
        .orderBy('timestamp', 'desc')
        .get();

      var totalCultivationVal = userInfo.totalCultivation || 0
      var recordsData = records.data || []
      this.processTodayRecords(recordsData, userInfo);
      this._recordsLoaded = true

      // 写入今日记录缓存供道童使用（不查DB）
      try {
        app.globalData._todayRecordsCache = {
          date: today,
          score: recordsData.reduce(function(s, r) { return s + (r.score || 0) }, 0),
          hasDebuff: recordsData.some(function(r) { return r.score < 0 }),
          count: recordsData.length
        }
      } catch (e) {}

      // >>> 加载功德数据（贡献→功德等级→修行加成）
      var meritData = null
      try {
        if (app.loadMeritData) {
          meritData = await app.loadMeritData()
        }
      } catch (e) { console.warn('[index] 功德数据加载失败', e) }

      // >>> 加载精英模板旅程
      this.loadEliteJourney(recordsData)

      // >>> 合并 setData：后续非紧急数据一次性写入
      var extraData = {}

      // 突破检测
      if (app.checkRealmBreakthrough) {
        var btResult = app.checkRealmBreakthrough(totalCultivationVal)
        if (btResult && btResult.triggered) {
          extraData.showBreakthrough = true
          extraData.breakthroughData = btResult
        }
      }

      // 刷新每日任务完成状态（仅从缓存读取，不重新走 storage）
      var cachedTasks = this.data.dailyTasks
      if (cachedTasks && cachedTasks.length > 0 && app.checkSystemTask) {
        var updated = false
        for (var t = 0; t < cachedTasks.length; t++) {
          if (!cachedTasks[t].done && app.checkSystemTask(cachedTasks[t].id, cachedTasks[t].category, recordsData)) {
            cachedTasks[t].done = true
            updated = true
          }
        }
        if (updated) extraData.dailyTasks = cachedTasks.slice()
      }

      if (Object.keys(extraData).length > 0) {
        this.setData(extraData)
      }
    } catch (error) {
      console.error('加载今日记录失败', error);
      this.processTodayRecords([], userInfo);
    }
  },

  /**
   * 加载精英模板旅程数据
   */
  loadEliteJourney: function(todayRecords) {
    var journey = eliteModule.loadTemplateJourney()
    if (!journey) {
      this.setData({
        eliteJourney: null,
        eliteTemplate: null,
        eliteProgress: 0,
        eliteMatchRate: 0,
        eliteSystemMsg: null
      })
      return
    }

    var template = eliteModule.getEliteTemplate(journey.templateId)
    if (!template) {
      this.setData({
        eliteJourney: null,
        eliteTemplate: null,
        eliteProgress: 0,
        eliteMatchRate: 0,
        eliteSystemMsg: null
      })
      return
    }

    var progress = eliteModule.calculateTemplateProgress(journey.templateId, journey)
    var matchRate = eliteModule.calculateTodayMatchRate(journey.templateId, todayRecords || [])
    var systemMsg = eliteModule.generateSystemMessage(journey, template)

    // 更新匹配率到旅程数据
    journey.matchRate = matchRate
    eliteModule.saveTemplateJourney(journey)

    this.setData({
      eliteJourney: journey,
      eliteTemplate: template,
      eliteProgress: progress,
      eliteMatchRate: matchRate,
      eliteSystemMsg: systemMsg
    })
  },

  async getUserInfo(db) {
    try {
      const user = await db.collection('users')
        .where({ userId: app.globalData.userId })
        .limit(1)
        .get();
      
      if (user.data.length > 0) {
        return user.data[0];
      }
    } catch (e) {
      console.log('获取用户信息失败');
    }
    
    return {
      totalCultivation: 0,
      learningTemplateId: '',
      learningTemplateName: '',
      dailyMatch: 0,
      totalProgress: 0,
      estimatedDays: 30
    };
  },

  processTodayRecords(records, userInfo) {
    console.assert(Array.isArray(records), 'records 必须为数组')

    // ===== A3 / P0-1：先展开批量结构，再映射 =====
    var flat = [];
    for (var ri = 0; ri < records.length; ri++) {
      var r = records[ri] || {};
      if (Array.isArray(r.records) && r.records.length > 0) {
        for (var si = 0; si < r.records.length; si++) {
          var sub = r.records[si] || {};
          var tabKey = String(sub.tabKey || 'sport');
          var catMap = { sport: '武·炼体', diet: '食·丹食', study: '悟·修心', work: '工·功业', debuff: '煞·心魔' };
          flat.push({
            name: sub.activityName || sub.name || '未知',
            category: catMap[tabKey] || (tabKey || ''),
            score: typeof sub.score === 'number' ? sub.score : 0,
            timestamp: r.timestamp || 0,
            _id: sub._id || (r._id ? (r._id + '_' + si) : null)
          });
        }
      } else {
        flat.push(r);
      }
    }

    const processed = flat.map(r => ({
      ...r,
      timeStr: this.formatTime(r.timestamp)
    }));
    
    const todayScore = processed.reduce((sum, r) => sum + (typeof r.score === 'number' ? r.score : 0), 0);
    const totalCultivation = userInfo.totalCultivation || 0;
    const realm = calculateRealm(totalCultivation);
    
    const totalNeeded = realm.perStage;
    const currentInStage = realm.progressInRealm % realm.perStage;
    const progress = (currentInStage / totalNeeded) * 100;
    
    const estimation = calculateDailyCultivation(
      todayScore,
      userInfo.dailyMatch || 75,
      false
    );
    
    var slogan = '叮，系统提示：今日道心平稳，可继续积累修为';
    if (totalCultivation >= 30000) slogan = '叮，系统提示：你已凝成元婴，道途广大';
    else if (totalCultivation >= 3000) slogan = '叮，系统提示：金丹已稳，继续淬炼心性';
    else if (totalCultivation >= 300) slogan = '叮，系统提示：筑基已成，正宜勇猛精进';
    else if (todayScore >= 5) slogan = '叮，系统提示：今日表现优异，灵气充盈';
    
    // 获取系统公告
    var announcement = ''
    if (app.getSystemAnnouncement) {
      var yesterdayStats = {
        yesterdayScore: this._getYesterdayScore(records),
        streakDays: userInfo.streakDays || 0,
        totalCultivation: totalCultivation,
        hasDebuff: records.some(function(r) { return r.score < 0 }),
        todayRecordCount: records.length,
        lastRecordTime: records.length > 0 ? records[records.length - 1].timestamp : 0
      }
      announcement = app.getSystemAnnouncement(yesterdayStats)
    }

    // 获取每日任务
    var dailyTasks = []
    if (app.getDailyTasks) {
      dailyTasks = app.getDailyTasks()
    }

    // 获取运势
    var fortune = null
    if (app.getDailyFortune) {
      fortune = app.getDailyFortune()
    }

    // 获取定场诗
    var titlePoem = ''
    if (app.getEquippedTitlePoem) {
      titlePoem = app.getEquippedTitlePoem()
    }

    // >>> 今日综合分析（只读提交时落库的 summary，历史数据缺省隐藏）
    var summary = null
    for (var sr = 0; sr < records.length; sr++) {
      var rdoc = records[sr] || {}
      if (rdoc.summary && (rdoc.summary.nutrition || rdoc.summary.totalCalories > 0 || rdoc.summary.studyMinutes > 0 || rdoc.summary.workOutput > 0)) {
        summary = rdoc.summary
        break
      }
    }
    var todaySummary = null
    if (summary) {
      var ts = { show: false }
      if (summary.nutrition && (summary.nutrition.protein > 0 || summary.nutrition.carbs > 0 || summary.nutrition.fat > 0)) {
        ts.nutrition = optimalScore.calcAdequacy(summary.nutrition, null)
        ts.show = true
      }
      if (summary.totalCalories > 0) {
        ts.sport = {
          calories: summary.totalCalories,
          muscleCount: Object.keys(summary.muscleActivation || {}).length
        }
        ts.show = true
      }
      if (summary.studyMinutes > 0 || summary.workOutput > 0) {
        ts.studyWork = {
          studyMinutes: summary.studyMinutes,
          workOutput: summary.workOutput
        }
        ts.show = true
      }
      var evals = dailyEval.buildEvaluation({
        nutrition: summary.nutrition || null,
        supplementBonus: summary.supplementBonus || 0,
        totalCalories: summary.totalCalories || 0,
        muscleCount: Object.keys(summary.muscleActivation || {}).length,
        studyMinutes: summary.studyMinutes || 0,
        workOutput: summary.workOutput || 0,
        debuffCount: summary.debuffCount || 0,
        sleepOnTime: summary.sleepOnTime,
        stayUpLate: summary.stayUpLate
      })
      if (evals && evals.overall) { ts.evaluation = evals; ts.show = true }
      todaySummary = ts
    }

    this.setData({
      records: processed,
      themeClass: app.resolveThemeClass ? app.resolveThemeClass(todayScore) : 'theme-hongchen',
      todayScore,
      totalCultivation,
      currentRealm: realm,
      realmProgress: progress,
      todayEstimation: estimation,
      slogan,
      learningTemplate: userInfo.learningTemplateName || (userInfo.currentTemplate && userInfo.currentTemplate.name)
        ? {
          name: userInfo.learningTemplateName || userInfo.currentTemplate.name
        }
        : null,
      dailyMatch: userInfo.dailyMatch || 0,
      totalProgress: userInfo.totalProgress || 0,
      estDays: userInfo.estimatedDays || 30,
      dailyTasks: dailyTasks,
      fortune: fortune,
      announcement: announcement,
      titlePoem: titlePoem,
      isNewUser: (totalCultivation === 0 && records.length === 0),
      // 功德数据
      meritData: app.globalData.meritData || null,
      todaySummary: todaySummary
    });
  },

  getTodayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  formatTime(ts) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  startFirstRecord: function (e) {
    var dim = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.dim : null;
    if (dim) getApp().globalData.recordInitialTab = dim;
    wx.switchTab({ url: '/pages/record/record' })
  },

  goToRecord(e) {
    // A4 / P1-4：改走 recordInitialTab 预选 → switchTab 录卡页
    const type = e.currentTarget.dataset.type;
    try {
      var app = getApp();
      if (app && app.globalData) app.globalData.recordInitialTab = type;
    } catch (err) {}
    wx.switchTab({
      url: '/pages/record/record'
    });
  },

  goToVision() {
    wx.navigateTo({
      url: '/packageA/pages/vision/vision'
    })
  },

  goToCultivationPage() {
    wx.navigateTo({
      url: '/packageA/pages/cultivation/cultivation'
    })
  },

  goToDaoChat() {
    wx.navigateTo({
      url: '/packageD/pages/hedao/chat/chat'
    })
  },

  goToDaoEdit() {
    wx.navigateTo({
      url: '/packageB/pages/dao-edit/dao-edit'
    })
  },

  // >>> 精英模板导航
  goToEliteJourney: function() {
    var journey = this.data.eliteJourney
    if (!journey) return
    wx.navigateTo({
      url: '/packageA/pages/elite-journey/elite-journey?templateId=' + journey.templateId
    })
  },

  goToEliteMarket: function() {
    wx.switchTab({
      url: '/pages/templates/templates'
    })
  },

  _getYesterdayScore: function(records) {
    var yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    var yStr = yesterday.getFullYear() + '-' + 
      String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
      String(yesterday.getDate()).padStart(2, '0')
    return records.filter(function(r) { return r.date === yStr }).reduce(function(s, r) { return s + (r.score || 0) }, 0)
  },

  // 加载定场诗（称号装备时调用）
  loadTitlePoem: function() {
    if (app.getEquippedTitlePoem) {
      this.setData({ titlePoem: app.getEquippedTitlePoem() })
    }
  },

  // 点击任务项
  onTapTask: function(e) {
    var taskId = e.currentTarget.dataset.id
    var tasks = this.data.dailyTasks
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId && !tasks[i].done) {
        var cat = tasks[i].category
        var url = ''
        if (cat === 'sport') url = '/pages/record/record?type=sport'
        else if (cat === 'diet') url = '/pages/record/record?type=diet'
        else if (cat === 'study') url = '/pages/record/record?type=study'
        else if (cat === 'spirit') url = '/packageD/pages/spirit/spirit'
        else url = '/pages/record/record'
        
        wx.navigateTo({ url: url })
        break
      }
    }
  },

  // v4.0: 跳转境界突破仪式全屏页
  confirmBreakthrough: function() {
    this.setData({ showBreakthrough: false, breakthroughData: null, breakthroughWarning: null })
    var profile = app.globalData.userProfile || {}
    var btData = this.data.breakthroughData || this.data.breakthroughWarning || {}
    var realmAfter = JSON.stringify({ realmId: profile.realmId === 'lianqi' ? 'zhuji' : (profile.realmId === 'zhuji' ? 'jindan' : 'yuanying'), realmName: profile.realmId === 'lianqi' ? '筑基期' : (profile.realmId === 'zhuji' ? '金丹期' : '元婴期') })
    var realmBefore = JSON.stringify({ realmId: profile.realmId || 'lianqi', realmName: profile.realmName || '炼气期' })
    wx.navigateTo({
      url: '/packageA/pages/breakthrough/breakthrough?realmAfter=' + encodeURIComponent(realmAfter) + '&realmBefore=' + encodeURIComponent(realmBefore)
    })
  },

  // v4.0: 突破预警区点击
  onBreakthroughWarningTap: function() {
    if (app.checkBreakthroughWarning) {
      var w = app.checkBreakthroughWarning()
      if (w.nearBreakthrough) {
        this.setData({ breakthroughData: w, showBreakthrough: true })
      }
    }
  },

  // v4.0: 补天计划入口 - 跳转宣传页
  onBuTianTap: function() {
    wx.navigateTo({
      url: '/packageE/pages/bu-tian/bu-tian'
    })
  },

  // 关闭突破仪式弹窗（暂缓）
  postponeBreakthrough: function() {
    this.setData({ showBreakthrough: false, breakthroughData: null })
  },

  // 关闭称号解锁弹窗
  closeTitlePopup: function() {
    this.setData({ unlockedTitlePopup: null })
  }
});
