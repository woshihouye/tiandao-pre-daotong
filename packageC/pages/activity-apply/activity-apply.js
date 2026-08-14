// packageC/pages/activity-apply/activity-apply.js
// 申请添加活动表单页 — 提交到公共修行库审核（云函数 activity-review）

var Alib = require('../../../utils/activity-library.js')

Page({
  data: {
    categories: Alib.GRAND_DAO_TABS,
    categoryIndex: 0,
    name: '',
    unit: '次',
    scorePerUnit: '',
    description: '',
    submitting: false
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

  onSubmit: function() {
    var that = this

    var name = (this.data.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入活动名称', icon: 'none' })
      return
    }

    var scorePerUnit = parseFloat(this.data.scorePerUnit)
    if (isNaN(scorePerUnit) || scorePerUnit === 0) {
      wx.showToast({ title: '请输入有效的建议分值', icon: 'none' })
      return
    }

    if (this.data.submitting) return
    this.setData({ submitting: true })

    var category = this.data.categories[this.data.categoryIndex].key

    wx.cloud.callFunction({
      name: 'activity-review',
      data: {
        action: 'submitActivityApplication',
        name: name,
        category: category,
        unit: (this.data.unit || '').trim() || '次',
        scorePerUnit: scorePerUnit,
        description: (this.data.description || '').trim()
      },
      success: function(res) {
        that.setData({ submitting: false })
        if (res.result && res.result.ok) {
          wx.showToast({ title: '已提交，待审核', icon: 'success' })
          setTimeout(function() { wx.navigateBack() }, 1000)
        } else {
          wx.showToast({ title: (res.result && res.result.error) || '提交失败', icon: 'none' })
        }
      },
      fail: function() {
        that.setData({ submitting: false })
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
      }
    })
  }
})
