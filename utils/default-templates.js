// utils/default-templates.js — 默认模板定义 + 幂等初始化（主包，供 record/activity-library 双端引用）
// 注意：默认模板只能引用元卡（meta_ 前缀），与 template-builder「仅元卡」规则一致

/** 默认模板（timeSlots 结构与 builder 自建模板同构） */
var DEFAULT_TEMPLATES = [
  {
    id: 'dflt_tpl_strength', name: '力量训练日', type: 'daily', categoryKey: 'sport',
    timeSlots: [
      { id: 'dawn', name: '晨起', activities: [ { actId: 'meta_push', activityName: '推举', capacity: { value: 3, unit: '组' }, tabKey: 'sport', category: 'sport' }, { actId: 'meta_squat', activityName: '深蹲', capacity: { value: 3, unit: '组' }, tabKey: 'sport', category: 'sport' } ] },
      { id: 'evening', name: '晚间', activities: [ { actId: 'meta_pull', activityName: '引体', capacity: { value: 3, unit: '组' }, tabKey: 'sport', category: 'sport' } ] }
    ]
  },
  {
    id: 'dflt_tpl_running', name: '跑步日', type: 'daily', categoryKey: 'sport',
    timeSlots: [
      { id: 'dawn', name: '晨起', activities: [ { actId: 'meta_steady_cardio', activityName: '慢跑', capacity: { value: 30, unit: '分钟' }, tabKey: 'sport', category: 'sport' } ] }
    ]
  },
  {
    id: 'dflt_tpl_diet', name: '健康饮食', type: 'daily', categoryKey: 'diet',
    timeSlots: [
      { id: 'morning', name: '上午', activities: [ { actId: 'meta_daily', activityName: '规律饮食', capacity: { value: 1, unit: '份' }, tabKey: 'diet', category: 'diet' } ] }
    ]
  },
  {
    id: 'dflt_tpl_academic', name: '学术日', type: 'daily', categoryKey: 'study',
    timeSlots: [
      { id: 'morning', name: '上午', activities: [ { actId: 'meta_input', activityName: '阅读', capacity: { value: 60, unit: '分钟' }, tabKey: 'study', category: 'study' } ] },
      { id: 'afternoon', name: '下午', activities: [ { actId: 'meta_process', activityName: '整理复盘', capacity: { value: 60, unit: '分钟' }, tabKey: 'study', category: 'study' } ] },
      { id: 'evening', name: '晚间', activities: [ { actId: 'meta_output', activityName: '写作输出', capacity: { value: 60, unit: '分钟' }, tabKey: 'study', category: 'study' } ] }
    ]
  },
  {
    id: 'dflt_tpl_create', name: '创作日', type: 'daily', categoryKey: 'study',
    timeSlots: [
      { id: 'evening', name: '晚间', activities: [ { actId: 'meta_output', activityName: '写作输出', capacity: { value: 120, unit: '分钟' }, tabKey: 'study', category: 'study' } ] }
    ]
  },
  {
    id: 'dflt_tpl_work', name: '创业工作日', type: 'daily', categoryKey: 'work',
    timeSlots: [
      { id: 'morning', name: '上午', activities: [ { actId: 'meta_plan', activityName: '规划', capacity: { value: 60, unit: '分钟' }, tabKey: 'work', category: 'work' } ] },
      { id: 'afternoon', name: '下午', activities: [ { actId: 'meta_execute', activityName: '执行推进', capacity: { value: 60, unit: '分钟' }, tabKey: 'work', category: 'work' } ] },
      { id: 'evening', name: '晚间', activities: [ { actId: 'meta_talk', activityName: '沟通洽谈', capacity: { value: 30, unit: '分钟' }, tabKey: 'work', category: 'work' } ] }
    ]
  },
  {
    id: 'dflt_tpl_debuff', name: '堕落监控', type: 'daily', categoryKey: 'debuff',
    timeSlots: [
      { id: 'night', name: '晚上', activities: [ { actId: 'meta_inner_demon', activityName: '精神内耗', capacity: { value: 1, unit: '次' }, tabKey: 'debuff', category: 'debuff' }, { actId: 'meta_eat_chaos', activityName: '暴食乱吃', capacity: { value: 1, unit: '次' }, tabKey: 'debuff', category: 'debuff' }, { actId: 'meta_screen_lost', activityName: '刷手机', capacity: { value: 1, unit: '次' }, tabKey: 'debuff', category: 'debuff' } ] }
    ]
  }
]

/** 幂等初始化默认模板：无模板且无标记才写入；任何情况都置标记防重复 */
function ensureDefaultTemplates(uid) {
  var key = 'tiandao_custom_templates_' + uid
  var markKey = 'tiandao_dft_tmpl_inited_' + uid
  try {
    var raw = wx.getStorageSync(key)
    var marked = wx.getStorageSync(markKey)
    if (Array.isArray(raw)) {
      // 已有数据（含空数组=用户删光）：有标记则不动；无标记且有数据则补标记
      if (marked) return false
      if (raw.length > 0) {
        wx.setStorageSync(markKey, true)
        return false
      }
      // 空数组且无标记：罕见异常态，补写
      wx.setStorageSync(key, DEFAULT_TEMPLATES)
      wx.setStorageSync(markKey, true)
      return true
    }
    // key 不存在（getStorageSync 返回 ''）或数据异常：无论标记如何都补写（修复标记残留）
    wx.setStorageSync(key, DEFAULT_TEMPLATES)
    wx.setStorageSync(markKey, true)
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  DEFAULT_TEMPLATES: DEFAULT_TEMPLATES,
  ensureDefaultTemplates: ensureDefaultTemplates
}
