// packageC/pages/activity-edit/activity-edit.js
// 自定义活动编辑页 — 仅可编辑 name/category/unit/scorePerUnit/description/icon

var app = getApp()

// 分类选项
var CATEGORY_OPTIONS = [
  { key: 'sport', label: '武·炼体' },
  { key: 'diet', label: '食·丹食' },
  { key: 'study', label: '悟·修心' },
  { key: 'work', label: '工·功业' },
  { key: 'debuff', label: '煞·心魔' }
]

// 单位选项
var UNIT_OPTIONS = ['次', '分钟', '组', '秒', '份']

Page({
  data: {
    themeClass: '',
    activityId: '',
    isNew: true,  // 是否新建（vs编辑已有）

    // 表单字段
    name: '',
    categoryIndex: 0,
    categories: CATEGORY_OPTIONS,
    unit: '次',
    scorePerUnit: '1',
    description: '',
    icon: '',

    // 自由度字段
    categoryName: '',
    ext: {},           // { key: val, ... }
    extKey: '',        // 编辑中的属性名
    extVal: '',        // 编辑中的属性值
    extList: [],       // 展示用的 [{ key, val }]
    tagsStr: '',       // 输入中的标签字符串（逗号分隔）
    showAdvanced: false,
    customMetaStr: '',  // JSON 文本输入

    // 原活动名称（复制时用）
    originActivityName: '',

    saving: false
  },

  onLoad: function(options) {
    var tc = app.resolveThemeClass ? app.resolveThemeClass(0) : 'theme-light-fixed'
    this.setData({ themeClass: tc })

    // 从参数获取活动数据
    if (options && options.data) {
      try {
        var act = JSON.parse(decodeURIComponent(options.data))

        // 查找分类索引
        var catIdx = 0
        for (var i = 0; i < CATEGORY_OPTIONS.length; i++) {
          if (CATEGORY_OPTIONS[i].key === (act.category || act.tabKey)) {
            catIdx = i; break
          }
        }

        // 查找单位索引
        var unit = act.unit || '次'

        // 自由字段
        var extList = []
        var ext = act.ext || {}
        for (var k in ext) {
          if (Object.prototype.hasOwnProperty.call(ext, k)) {
            extList.push({ key: k, val: String(ext[k]) })
          }
        }

        var tagsStr = Array.isArray(act.tags) ? act.tags.join(', ') : ''

        this.setData({
          activityId: act.id || act.activityId || '',
          isNew: !!options.isNew,
          name: act.name || '',
          categoryIndex: catIdx,
          unit: unit,
          scorePerUnit: String(act.scorePerUnit != null ? act.scorePerUnit : 1),
          description: act.description || '',
          icon: act.icon || '',
          categoryName: act.categoryName || '',
          ext: ext,
          extList: extList,
          tagsStr: tagsStr,
          customMetaStr: act.customMeta ? JSON.stringify(act.customMeta, null, 2) : '',
          originActivityName: act.originActivityName || options.originActivityName || ''
        })
      } catch (e) {
        console.warn('解析活动数据失败', e)
      }
    }
  },

  onNameInput: function(e) {
    this.setData({ name: e.detail.value })
  },

  onCategoryChange: function(e) {
    this.setData({ categoryIndex: parseInt(e.detail.value) || 0 })
  },

  onUnitInput: function(e) {
    this.setData({ unit: e.detail.value })
  },

  onScoreInput: function(e) {
    this.setData({ scorePerUnit: e.detail.value })
  },

  onDescInput: function(e) {
    this.setData({ description: e.detail.value })
  },

  onIconInput: function(e) {
    this.setData({ icon: e.detail.value })
  },

  // 自由度 handlers
  onCategoryNameInput: function(e) {
    this.setData({ categoryName: e.detail.value })
  },

  onExtKeyInput: function(e) {
    this.setData({ extKey: e.detail.value })
  },

  onExtValInput: function(e) {
    this.setData({ extVal: e.detail.value })
  },

  onAddExt: function() {
    var key = (this.data.extKey || '').trim()
    var val = (this.data.extVal || '').trim()
    if (!key) return
    var extList = this.data.extList.slice()
    // 更新或新增
    var found = false
    for (var i = 0; i < extList.length; i++) {
      if (extList[i].key === key) { extList[i].val = val; found = true; break }
    }
    if (!found) extList.push({ key: key, val: val })
    this.setData({ extList: extList, extKey: '', extVal: '' })
  },

  onRemoveExt: function(e) {
    var idx = e.currentTarget.dataset.index
    var extList = this.data.extList.slice()
    extList.splice(idx, 1)
    this.setData({ extList: extList })
  },

  onTagsInput: function(e) {
    this.setData({ tagsStr: e.detail.value })
  },

  toggleAdvanced: function() {
    this.setData({ showAdvanced: !this.data.showAdvanced })
  },

  onCustomMetaInput: function(e) {
    this.setData({ customMetaStr: e.detail.value })
  },

  // 保存
  onSave: function() {
    var self = this
    var name = (this.data.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入活动名称', icon: 'none' })
      return
    }

    var scoreVal = parseFloat(this.data.scorePerUnit)
    if (isNaN(scoreVal) || scoreVal === 0) {
      wx.showToast({ title: '请输入有效的修为值', icon: 'none' })
      return
    }

    if (this.data.saving) return
    this.setData({ saving: true })

    var catKey = CATEGORY_OPTIONS[this.data.categoryIndex].key
    var unit = (this.data.unit || '次').trim() || '次'

    // 构建 ext 对象
    var extObj = {}
    var extList = this.data.extList
    for (var i = 0; i < extList.length; i++) {
      if (extList[i].key) extObj[extList[i].key] = extList[i].val
    }

    // 解析 tags
    var tagsArr = (this.data.tagsStr || '').split(/[,，]/).map(function(t) { return t.trim() }).filter(Boolean)

    // 解析 customMeta
    var customMeta = null
    if (this.data.customMetaStr.trim()) {
      try { customMeta = JSON.parse(this.data.customMetaStr) }
      catch (e) { wx.showToast({ title: '高级设置 JSON 格式错误', icon: 'none' }); return }
    }

    var params = {
      name: name,
      category: catKey,
      unit: unit,
      scorePerUnit: scoreVal,
      description: this.data.description || '',
      icon: this.data.icon || '',
      categoryName: this.data.categoryName || '',
      ext: extObj,
      tags: tagsArr,
      customMeta: customMeta
    }

    if (this.data.isNew) {
      // 有原活动 id → 复制场景
      if (this.data.activityId) {
        wx.cloud.callFunction({
          name: 'user-activity',
          data: {
            action: 'copy',
            params: {
              originActivityId: this.data.activityId,
              name: params.name,
              unit: params.unit,
              scorePerUnit: params.scorePerUnit,
              description: params.description,
              categoryName: params.categoryName,
              icon: params.icon,
              ext: params.ext,
              tags: params.tags,
              customMeta: params.customMeta
            }
          },
          success: function(res) {
            self.setData({ saving: false })
            if (res.result && res.result.ok) {
              wx.showToast({ title: '复制成功，你可以修改了', icon: 'success' })
              var newActId = (res.result.data && res.result.data.activity && res.result.data.activity.activityId) || ''
              if (newActId) {
                self.setData({ activityId: newActId, isNew: false })
              }
              setTimeout(function() { wx.navigateBack() }, 1500)
            } else {
              var errMsg = (res.result && res.result.error) || '操作失败'
              if (errMsg.indexOf('已复制过') !== -1) {
                wx.showToast({ title: '你已经复制过这个活动了', icon: 'none' })
              } else {
                wx.showToast({ title: errMsg, icon: 'none' })
              }
            }
          },
          fail: function() {
            self.setData({ saving: false })
            wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
          }
        })
      } else {
        // 纯新建：无原活动 → 调用 activity-api createCustom
        wx.cloud.callFunction({
          name: 'activity-api',
          data: {
            action: 'createCustom',
            params: params
          },
          success: function(res) {
            self.setData({ saving: false })
            if (res.result && res.result.ok) {
              wx.showToast({ title: '创建成功', icon: 'success' })
              self._notifyParentSaved()
              setTimeout(function() { wx.navigateBack() }, 1500)
            } else {
              wx.showToast({ title: (res.result && res.result.error) || '创建失败', icon: 'none' })
            }
          },
          fail: function() {
            self.setData({ saving: false })
            wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
          }
        })
      }
    } else {
      // 编辑模式
      params.activityId = this.data.activityId
      wx.cloud.callFunction({
        name: 'user-activity',
        data: {
          action: 'update',
          params: params
        },
        success: function(res) {
          self.setData({ saving: false })
          if (res.result && res.result.ok) {
            wx.showToast({ title: '保存成功', icon: 'success' })
            self._notifyParentSaved()
            setTimeout(function() { wx.navigateBack() }, 1500)
          } else {
            wx.showToast({ title: (res.result && res.result.error) || '保存失败', icon: 'none' })
          }
        },
        fail: function() {
          self.setData({ saving: false })
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        }
      })
    }
  },

  // 通知上页活动已更新
  _notifyParentSaved: function() {
    var pages = getCurrentPages()
    if (pages.length > 1) {
      var prevPage = pages[pages.length - 2]
      if (prevPage._reloadActivities) {
        prevPage._reloadActivities()
      }
    }
  },

  // 取消
  onCancel: function() {
    wx.navigateBack()
  }
})
