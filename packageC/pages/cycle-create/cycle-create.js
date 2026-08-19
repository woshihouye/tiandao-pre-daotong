var app = getApp();
var lifeTemplate = require('../../../utils/life-template.js');

Page({
  data: {
    editId: '',
    name: '',
    playMode: 'loop', // loop | random
    scoreTarget: 0,
    localDaily: [],
    cloudDaily: [],
    items: [], // [{templateId, name, enabled, order}]
    tabIndex: 0, // 0=本地 1=云端
    loadingCloud: false,
    submitting: false
  },

  onLoad: function(options) {
    var editId = options.editId || '';
    this.setData({ editId: editId });
    if (editId) {
      wx.setNavigationBarTitle({ title: '编辑周期歌单' });
      this._loadForEdit(editId);
    }
    this._loadLocalDaily();
    this._loadCloudDaily();
  },

  _loadLocalDaily: function() {
    try {
      var locals = (lifeTemplate.getLocalCustomTemplates && lifeTemplate.getLocalCustomTemplates()) || [];
      var daily = locals.filter(function(t) { return t.type === 'daily'; });
      this.setData({ localDaily: daily });
    } catch(e) {}
  },

  _loadCloudDaily: function() {
    var that = this;
    var uid = (app.globalData && app.globalData.userId) || '';
    if (!uid) return;
    this.setData({ loadingCloud: true });
    wx.cloud.callFunction({
      name: 'template-manager',
      data: { action: 'getMyDailyTemplates', creatorId: uid },
      success: function(r) {
        that.setData({
          loadingCloud: false,
          cloudDaily: (r.result && r.result.templates) || []
        });
      },
      fail: function() {
        that.setData({ loadingCloud: false });
      }
    });
  },

  _loadForEdit: function(id) {
    var that = this;
    var uid = (app.globalData && app.globalData.userId) || '';
    wx.cloud.callFunction({
      name: 'cycle-manager',
      data: { action: 'list', creatorId: uid },
      success: function(r) {
        var lists = (r.result && r.result.playlists) || [];
        var pl = lists.find(function(x) { return x.id === id; });
        if (!pl) { app.showSystemToast('歌单不存在'); return; }
        var items = (pl.items || []).map(function(it) {
          return {
            templateId: it.templateId,
            name: it.templateName || it.templateId,
            enabled: it.enabled !== false,
            order: typeof it.order === 'number' ? it.order : 0
          };
        }).sort(function(a, b) { return a.order - b.order; });
        that.setData({
          name: pl.name || '',
          playMode: pl.playMode || 'loop',
          scoreTarget: parseInt(pl.scoreTarget) || 0,
          items: items
        });
        that._hydrateItemNames();
      }
    });
  },

  _hydrateItemNames: function() {
    var that = this;
    var map = {};
    (this.data.localDaily || []).forEach(function(t) { map[t.id] = t.name || t.id; });
    (this.data.cloudDaily || []).forEach(function(t) { map[t.id] = t.name || t.id; });
    var items = this.data.items.map(function(it) {
      if (!it.name || it.name === it.templateId) it.name = map[it.templateId] || it.templateId;
      return it;
    });
    this.setData({ items: items });
  },

  /* --------------------- 输入 --------------------- */
  onNameInput: function(e) {
    var val = (e.detail.value || '').slice(0, 20);
    this.setData({ name: val });
  },
  switchTab: function(e) {
    var idx = Number(e.currentTarget.dataset.idx);
    this.setData({ tabIndex: idx });
  },
  switchMode: function(e) {
    var mode = e.currentTarget.dataset.mode;
    this.setData({ playMode: mode });
  },
  onTargetInput: function(e) {
    var v = parseInt(e.detail.value) || 0;
    this.setData({ scoreTarget: Math.max(0, v) });
  },

  /* --------------------- 选日模板 --------------------- */
  addTemplate: function(e) {
    var tid = e.currentTarget.dataset.tid;
    var tname = e.currentTarget.dataset.tname || tid;
    if (!tid) return;
    var exists = this.data.items.some(function(x) { return x.templateId === tid; });
    if (exists) { wx.showToast({ title: '已加入', icon: 'none' }); return; }
    var items = this.data.items.concat([{
      templateId: tid, name: tname, enabled: true, order: this.data.items.length
    }]);
    this.setData({ items: items });
  },

  removeItem: function(e) {
    var idx = Number(e.currentTarget.dataset.idx);
    var arr = this.data.items.slice();
    arr.splice(idx, 1);
    arr.forEach(function(x, i) { x.order = i; });
    this.setData({ items: arr });
  },

  toggleItem: function(e) {
    var idx = Number(e.currentTarget.dataset.idx);
    var enabled = !!e.detail.value;
    var arr = this.data.items.slice();
    if (arr[idx]) arr[idx].enabled = enabled;
    this.setData({ items: arr });
  },

  moveItem: function(e) {
    var idx = Number(e.currentTarget.dataset.idx);
    var dir = e.currentTarget.dataset.dir;
    var arr = this.data.items.slice();
    if (dir === 'up' && idx > 0) {
      var tmp = arr[idx - 1]; arr[idx - 1] = arr[idx]; arr[idx] = tmp;
    } else if (dir === 'down' && idx < arr.length - 1) {
      var tmp2 = arr[idx + 1]; arr[idx + 1] = arr[idx]; arr[idx] = tmp2;
    } else return;
    arr.forEach(function(x, i) { x.order = i; });
    this.setData({ items: arr });
  },

  /* --------------------- 保存 --------------------- */
  savePlaylist: function() {
    var that = this;
    if (this.data.submitting) return;
    if (!this.data.name.trim()) { wx.showToast({ title: '请填写歌单名称', icon: 'none' }); return; }
    if (!this.data.items.length) { wx.showToast({ title: '请加入至少一个日模板', icon: 'none' }); return; }

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    var payload = {
      name: this.data.name.trim(),
      playMode: this.data.playMode,
      scoreTarget: Math.max(0, parseInt(this.data.scoreTarget) || 0),
      items: this.data.items.map(function(x) {
        return { templateId: x.templateId, enabled: x.enabled !== false, order: x.order };
      })
    };
    var action = 'create';
    if (this.data.editId) {
      action = 'update';
      payload.id = this.data.editId;
    }
    wx.cloud.callFunction({
      name: 'cycle-manager',
      data: Object.assign({ action: action }, payload),
      success: function(r) {
        wx.hideLoading();
        var res = r.result || {};
        if (!res.ok) { app.showSystemToast(res.error || '保存失败'); return; }
        app.showSystemToast('保存成功');
        var finalId = that.data.editId || (res.playlist && res.playlist.id) || res.id;
        wx.redirectTo({
          url: '/packageC/pages/cycle-template/cycle-template?id=' + finalId
        });
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submitting: false });
        app.showSystemToast('保存失败');
      }
    });
  },

  onPredictPlaylist: function() {
    var that = this
    var plId = this.data.editId || ''
    if (!plId) {
      wx.showToast({ title: '请先保存歌单再预测', icon: 'none' })
      return
    }
    wx.showLoading({ title: '预测中...', mask: true })
    wx.cloud.callFunction({
      name: 'cycle-manager',
      data: { action: 'predict', id: plId, localTemplates: this.data.localDaily || [] },
      success: function(r) {
        wx.hideLoading()
        var res = r.result || {}
        if (res.ok !== false) {
          var total = Math.round((res.totalScore || 0) * 10) / 10
          var act = Math.round((res.totalActivityScore || 0) * 10) / 10
          var nut = Math.round((res.totalNutritionScore || 0) * 10) / 10
          var reality = res.reality || {}
          var detail = '预计修为：' + total + '\n活动修为：' + act + ' · 营养修为：' + nut
          detail += '\n现实产出：消耗' + Math.round(reality.totalCalories || 0) + 'kcal · 蛋白' + Math.round(reality.protein || 0) + 'g · 学习' + Math.round(reality.studyMinutes || 0) + '分钟 · 输出' + Math.round(reality.workOutput || 0)
          if (res.itemCount === 0) detail += '\n（歌单暂无启用模板）'
          if (res.failed && res.failed.length) detail += '\n' + res.failed.length + ' 个模板预测失败'
          wx.showModal({ title: '歌单预测', content: detail, showCancel: false })
        } else {
          wx.showToast({ title: res.error || '预测失败', icon: 'none' })
        }
      },
      fail: function() {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  }
});
