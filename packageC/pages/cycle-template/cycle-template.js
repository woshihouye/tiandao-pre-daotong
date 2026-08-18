var app = getApp();
var lifeTemplate = require('../../../utils/life-template.js');

Page({
  data: {
    playlistId: '',
    playlist: null,
    todayTemplate: null, // { id, name }
    todaySkipped: false,
    loading: false,
    todayScore: 0,
    progressPct: 0
  },

  onLoad: function(options) {
    var id = options.id || '';
    var fromList = options.fromList === '1';
    var that = this;
    var appUid = (app.globalData && app.globalData.userId) || '';
    if (!id && !fromList) {
      app.showSystemToast('缺少歌单 id');
      return;
    }
    this.setData({ playlistId: id || '' });
    if (!id) {
      // 直接进入 list → 调 cycle-manager list，取最新一条或新建
      this._loadListAndPickFirst(appUid);
      return;
    }
    this._loadAll();
  },

  onPullDownRefresh: function() {
    var that = this;
    this._loadAll(function() {
      wx.stopPullDownRefresh();
    });
  },

  _loadListAndPickFirst: function(appUid) {
    var that = this;
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'cycle-manager',
      data: { action: 'list', creatorId: appUid },
      success: function(r) {
        var list = (r.result && r.result.playlists) || [];
        if (list.length) {
          that.setData({ playlistId: list[0].id });
          that._loadAll();
        } else {
          that.setData({ loading: false });
          wx.showModal({
            title: '还没有歌单',
            content: '去新建一个周期模板？',
            confirmText: '去创建',
            confirmColor: '#10B981',
            success: function(m) {
              if (m.confirm) that._goCreate();
              else wx.navigateBack();
            }
          });
        }
      },
      fail: function() {
        that.setData({ loading: false });
        app.showSystemToast('加载失败');
      }
    });
  },

  _loadAll: function(done) {
    var that = this;
    this.setData({ loading: true });
    var id = this.data.playlistId;
    wx.cloud.callFunction({
      name: 'cycle-manager',
      data: { action: 'getTodayPlay', id: id },
      success: function(r) {
        var ret = r.result || {};
        var tplId = ret.templateId || '';
        var skipped = !!ret.skipped;
        var name = '';
        if (tplId) {
          // 尝试用本地缓存查名字（歌单 items 里没有 name，通过本地 + 云端日模板匹配）
          var t = that._findTemplateName(tplId);
          if (t) name = t;
          else name = tplId;
        }
        that.setData({
          todayTemplate: tplId ? { id: tplId, name: name } : null,
          todaySkipped: skipped
        });
        // 再拉一次完整 playlist（含 items 列表）
        wx.cloud.callFunction({
          name: 'cycle-manager',
          data: { action: 'list' },
          success: function(r2) {
            var lists = (r2.result && r2.result.playlists) || [];
            var pl = lists.find(function(x) { return x.id === id; });
            that._applyPlaylist(pl);
            that.setData({ loading: false });
            done && done();
          },
          fail: function() {
            that.setData({ loading: false });
            done && done();
          }
        });
      },
      fail: function() {
        that.setData({ loading: false });
        app.showSystemToast('今日播放加载失败');
        done && done();
      }
    });
  },

  _findTemplateName: function(templateId) {
    try {
      var locals = lifeTemplate.getLocalCustomTemplates() || [];
      var hit = locals.find(function(t) { return t.id === templateId; });
      if (hit) return hit.name || '';
    } catch(e) {}
    return '';
  },

  _applyPlaylist: function(pl) {
    if (!pl) return;
    var todayScore = Number((app.globalData && app.globalData.todayScore) || 0);
    var target = Math.max(0, parseInt(pl.scoreTarget) || 0);
    var pct = target > 0 ? Math.min(100, Math.round((todayScore / target) * 100)) : 0;
    this.setData({
      playlist: pl,
      todayScore: todayScore,
      progressPct: pct
    });
  },

  /* --------------------- UI actions --------------------- */

  openTodayPlay: function() {
    var t = this.data.todayTemplate;
    if (!t || !t.id) {
      if (this.data.todaySkipped) wx.showToast({ title: '今日无可用模板', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/packageC/pages/template-detail/template-detail?id=' + t.id
    });
  },

  openItem: function(e) {
    var tid = e.currentTarget.dataset.tid;
    if (!tid) return;
    wx.navigateTo({
      url: '/packageC/pages/template-detail/template-detail?id=' + tid
    });
  },

  toggleItemEnable: function(e) {
    var that = this;
    var tid = e.currentTarget.dataset.tid;
    var enabled = !!e.detail.value;
    if (!tid) return;
    wx.cloud.callFunction({
      name: 'cycle-manager',
      data: { action: 'toggleItem', id: this.data.playlistId, templateId: tid, enabled: enabled },
      success: function() {
        that._loadAll();
      },
      fail: function() { app.showSystemToast('操作失败'); }
    });
  },

  _goCreate: function() {
    var id = this.data.playlistId;
    if (id) {
      wx.navigateTo({
        url: '/packageC/pages/cycle-create/cycle-create?editId=' + id
      });
    } else {
      wx.navigateTo({
        url: '/packageC/pages/cycle-create/cycle-create'
      });
    }
  },

  editPlaylist: function() {
    this._goCreate();
  },

  deletePlaylist: function() {
    var that = this;
    wx.showModal({
      title: '删除歌单',
      content: '删除后无法恢复，确认删除吗？',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: function(m) {
        if (!m.confirm) return;
        wx.cloud.callFunction({
          name: 'cycle-manager',
          data: { action: 'remove', id: that.data.playlistId },
          success: function() {
            app.showSystemToast('已删除');
            wx.navigateBack();
          },
          fail: function() { app.showSystemToast('删除失败'); }
        });
      }
    });
  },

  /* 允许进入选择歌单列表（用户有多个歌单时跳 my-templates？） 这里直接回退/去创建 */
  openListPage: function() {
    wx.switchTab({
      url: '/pages/templates/templates',
      fail: function() { wx.navigateBack(); }
    });
  }
});
