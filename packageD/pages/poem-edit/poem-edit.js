var app = getApp()

Page({
  data: {
    poem: '',
    originalPoem: '',
    isGenerating: false,
    poemLength: 0
  },

  onLoad: function(options) {
    var poem = ''
    if (app.getSignaturePoem) {
      poem = app.getSignaturePoem()
    }
    this.setData({ poem: poem, originalPoem: poem, poemLength: poem.length })
  },

  onInput: function(e) {
    var val = e.detail.value || ''
    this.setData({ poem: val, poemLength: val.length })
  },

  // AI生成定场诗
  generateAI: function() {
    var that = this
    this.setData({ isGenerating: true })

    // 构建生成上下文
    var profile = (app.globalData && app.globalData.userProfile) || {}
    var totalCultivation = profile.totalCultivation || 0
    var realm = app.getRealmByScore ? app.getRealmByScore(totalCultivation) : null
    var realmName = (realm && realm.name) || '炼气'
    var title = app.getEquippedTitle ? app.getEquippedTitle() : null
    var titleName = (title && title.name) || '无名修士'
    var nickName = profile.nickName || '道友'
    var mainTemplate = app.getMainTemplate ? app.getMainTemplate() : null
    var templateName = (mainTemplate && mainTemplate.name) || ''

    var prompt = '你是一位修仙诗人，请为一位名叫"' + nickName + '"的修行者写一首七言定场诗（二句即可，14个字）。他的境界是"' + realmName + '"，称号是"' + titleName + '"' + (templateName ? '，主修方向是"' + templateName + '"' : '') + '。要求：押韵、有修仙气势、符合他的身份。只输出诗句，不要任何解释。'

    // 调用道童AI云函数
    try {
      wx.cloud.callFunction({
        name: 'dao-spirit-ai',
        data: {
          action: 'chat',
          messages: [{ role: 'user', content: prompt }],
          mode: 'lingzhu'
        }
      }).then(function(res) {
        var result = res.result || {}
        var generated = (result.reply || result.content || '').trim()
        // 清理非诗句内容
        generated = generated.replace(/["""]/g, '').replace(/（.*?）/g, '').replace(/\(.*?\)/g, '')
        if (generated.length > 30) {
          generated = generated.substring(0, 30)
        }
        if (generated) {
          that.setData({ poem: generated, poemLength: generated.length })
        }
        that.setData({ isGenerating: false })
      }).catch(function() {
        // AI调用失败，使用默认诗歌
        var defaults = [
          '修行路上莫问程，道心所至即长生。',
          '天地为炉造化为工，阴阳为炭万物为铜。',
          '一粒金丹吞入腹，始知我命不由天。',
          '千锤百炼方成器，万劫不灭是真仙。'
        ]
        var pick = defaults[Math.floor(Math.random() * defaults.length)]
        that.setData({ poem: pick, poemLength: pick.length, isGenerating: false })
      })
    } catch (e) {
      that.setData({ isGenerating: false })
    }
  },

  // 保存
  savePoem: function() {
    var poem = (this.data.poem || '').trim()
    if (!poem) {
      app.showSystemToast('定场诗不能为空')
      return
    }
    if (poem.length > 50) {
      app.showSystemToast('定场诗最多50字')
      return
    }

    var that = this
    if (app.saveSignaturePoem) {
      app.saveSignaturePoem(poem).then(function() {
        app.showSystemToast('定场诗已保存', 'success')
        wx.navigateBack()
      }).catch(function() {
        app.showSystemToast('保存失败')
      })
    } else {
      wx.setStorageSync('tiandao_signature_poem', poem)
      app.showSystemToast('已保存', 'success')
      wx.navigateBack()
    }
  },

  // 恢复原始
  resetPoem: function() {
    this.setData({ poem: this.data.originalPoem, poemLength: this.data.originalPoem.length })
  }
})
