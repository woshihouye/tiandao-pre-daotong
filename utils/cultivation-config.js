// utils/cultivation-config.js — 修行阶段配置（大阶段 + 小阶段分层里程碑）
// 调整渠道：所有数值/名字/图标只改这里，界面自动生效
// 里程碑扩展位：未来加成就型里程碑在此加 type: 'achievement' 条目
module.exports = {
  stages: [
    { id: 'lianjing', name: '炼精化气', min: 0,     icon: '🌱', color: '#9ca3af', desc: '精元初凝，筑基之始', type: 'cultivation' },
    { id: 'lianqi',   name: '炼气化神', min: 100,   icon: '🌿', color: '#22c55e', desc: '气通神畅，道基渐固', type: 'cultivation' },
    { id: 'lianshen', name: '炼神还虚', min: 1000,  icon: '🌟', color: '#3b82f6', desc: '神游太虚，道行渐深', type: 'cultivation' },
    { id: 'lianxu',   name: '炼虚合道', min: 10000, icon: '👑', color: '#a855f7', desc: '虚合天道，道果初成', type: 'cultivation' }
  ],
  subStagesPerStage: 9
}

/** 按修为取当前修行阶段（大阶段 + 小阶段，纯展示） */
function getCultivationStage(totalCultivation) {
  var cfg = require('./cultivation-config.js')
  var stages = cfg.stages
  var subTotal = Math.max(1, cfg.subStagesPerStage || 9)
  var total = Number(totalCultivation || 0)
  var current = stages[0], idx = 0
  for (var i = stages.length - 1; i >= 0; i--) {
    if (total >= stages[i].min) { current = stages[i]; idx = i; break }
  }
  var next = stages[idx + 1] || null
  var span = next ? (next.min - current.min) : (current.min > 0 ? current.min : 1000)
  var perSub = span / subTotal
  var subIdx = Math.min(subTotal - 1, Math.floor((total - current.min) / perSub))
  var subProgress = Math.min(100, Math.floor(((total - current.min) % perSub) / perSub * 100))
  var progress = next ? Math.min(100, Math.floor((total - current.min) / span * 100)) : 100
  return {
    stage: { name: current.name, icon: current.icon, color: current.color, desc: current.desc },
    stageIndex: idx,
    subStageIndex: subIdx,
    subStageTotal: subTotal,
    subProgress: subProgress,
    progress: progress,
    nextAt: next ? next.min : null,
    nextName: next ? next.name : null
  }
}

module.exports = { stages: module.exports.stages, subStagesPerStage: module.exports.subStagesPerStage, getCultivationStage: getCultivationStage }
