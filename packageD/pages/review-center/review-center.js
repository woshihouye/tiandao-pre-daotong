// packageD/pages/review-center/review-center.js
// 审核中心 — 官方卡重审 + 用户申请（云函数 activity-review）

Page({
  data: {
    activeTab: 'official',
    officialPending: [],
    userApplications: [],
    noAuth: false,
    loading: false
  },

  onLoad: function() {
    this.loadList()
  },

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  loadList: function() {
    var that = this
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'activity-review',
      data: { action: 'listActivityApplications' },
      success: function(res) {
        that.setData({ loading: false })
        var result = res.result || {}
        if (result.ok) {
          var data = result.data || {}
          that.setData({
            noAuth: false,
            officialPending: (data.officialPending || []).map(function(item) {
              return {
                activityId: item._id,
                name: item.name || '',
                categoryLabel: item.categoryLabel || '',
                scorePerUnit: item.scorePerUnit,
                description: item.description || ''
              }
            }),
            userApplications: (data.userApplications || []).map(function(item) {
              return {
                applicationId: item._id,
                name: item.name || '',
                categoryLabel: item.categoryLabel || '',
                scorePerUnit: item.scorePerUnit,
                description: item.description || '',
                applicantId: item.applicantId || ''
              }
            })
          })
        } else {
          that.setData({ noAuth: true, officialPending: [], userApplications: [] })
        }
      },
      fail: function() {
        that.setData({ loading: false, noAuth: true, officialPending: [], userApplications: [] })
      }
    })
  },

  approveOfficialCard: function(e) {
    var id = e.currentTarget.dataset.id
    this._reviewAction('approveOfficialCard', { activityId: id }, '已通过')
  },

  rejectOfficialCard: function(e) {
    var id = e.currentTarget.dataset.id
    this._rejectWithReason('rejectOfficialCard', { activityId: id })
  },

  approveUserApplication: function(e) {
    var id = e.currentTarget.dataset.id
    this._reviewAction('approveActivityApplication', { applicationId: id }, '已通过')
  },

  rejectUserApplication: function(e) {
    var id = e.currentTarget.dataset.id
    this._rejectWithReason('rejectActivityApplication', { applicationId: id })
  },

  _reviewAction: function(action, params, toastText) {
    var that = this
    var data = { action: action }
    for (var k in params) {
      if (Object.prototype.hasOwnProperty.call(params, k)) data[k] = params[k]
    }
    wx.cloud.callFunction({
      name: 'activity-review',
      data: data,
      success: function(res) {
        if (res.result && res.result.ok) {
          wx.showToast({ title: toastText, icon: 'success' })
          that.loadList()
        } else {
          wx.showToast({ title: (res.result && res.result.error) || '操作失败', icon: 'none' })
        }
      },
      fail: function() {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
      }
    })
  },

  _rejectWithReason: function(action, params) {
    var that = this
    wx.showModal({
      title: '驳回原因',
      editable: true,
      placeholderText: '请输入驳回原因（必填）',
      success: function(res) {
        if (!res.confirm) return
        var reason = (res.content || '').trim()
        if (!reason) {
          wx.showToast({ title: '驳回原因不能为空', icon: 'none' })
          return
        }
        params.reason = reason
        that._reviewAction(action, params, '已驳回')
      }
    })
  }
})
