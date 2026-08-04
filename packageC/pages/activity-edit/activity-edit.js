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
    unitIndex: 0,
    units: UNIT_OPTIONS,
    scorePerUnit: '1',
    description: '',
    icon: '',

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
        var unitIdx = 0
        var unit = act.unit || '次'
        for (var j = 0; j < UNIT_OPTIONS.length; j++) {
          if (UNIT_OPTIONS[j] === unit) { unitIdx = j; break }
        }

        this.setData({
          activityId: act.id || act.activityId || '',
          isNew: !!options.isNew,
          name: act.name || '',
          categoryIndex: catIdx,
          unitIndex: unitIdx,
          scorePerUnit: String(act.scorePerUnit != null ? act.scorePerUnit : 1),
          description: act.description || '',
          icon: act.icon || '',
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

  onUnitChange: function(e) {
    this.setData({ unitIndex: parseInt(e.detail.value) || 0 })
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
    var unit = UNIT_OPTIONS[this.data.unitIndex]

    var params = {
      name: name,
      category: catKey,
      unit: unit,
      scorePerUnit: scoreVal,
      description: this.data.description || '',
      icon: this.data.icon || ''
    }

    if (this.data.isNew) {
      // 新建模式 → 使用 copy action
      // 但实际是用户从活动库点"复制"过来的，需要调用 user-activity copy
      // 然而如果 isNew 且 activityId 为空，说明是完全新建
      // 这里简化处理：如果有 activityId（复制场景），用 update；否则提示
      wx.cloud.callFunction({
        name: 'user-activity',
        data: {
          action: 'copy',
          params: {
            originActivityId: this.data.activityId,
            name: params.name,
            unit: params.unit,
            scorePerUnit: params.scorePerUnit,
            description: params.description
          }
        },
        success: function(res) {
          self.setData({ saving: false })
          if (res.result && res.result.ok) {
            wx.showToast({ title: '复制成功，你可以修改了', icon: 'success' })
            // 跳转到刚创建的活动编辑（使用新的 activityId）
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
