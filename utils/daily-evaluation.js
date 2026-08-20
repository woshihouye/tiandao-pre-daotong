// 今日综合评价生成器 — 纯文字评价（无分数/星级）
// 仅显示层使用；打分逻辑仍在 unified-score.js / optimal-score.js，此处只读调用 calcAdequacy

var optimalScore = require('./optimal-score.js')

function evalSport(d) {
  if (!d || !d.totalCalories || d.totalCalories <= 0) return null
  var cal = d.totalCalories
  var txt
  if (cal >= 500) txt = '运动量充足，消耗到位'
  else if (cal >= 200) txt = '运动到位，保持节奏'
  else txt = '运动量偏少，建议加练'
  if (d.muscleCount > 0) txt += '，激活 ' + d.muscleCount + ' 个肌群'
  return txt
}

function evalDiet(d) {
  if (!d || !d.nutrition) return null
  var nut = d.nutrition
  var hasVal = (nut.protein > 0 || nut.carbs > 0 || nut.fat > 0 || nut.calories > 0)
  if (!hasVal) return null
  var parts = []
  if (nut.protein >= 80) parts.push('蛋白充足')
  else if (nut.protein > 0 && nut.protein < 60) parts.push('蛋白偏低')
  if (nut.calories >= 90) parts.push('热量适中')
  else if (nut.calories > 0 && nut.calories < 70) parts.push('热量不足')
  if (parts.length === 0) parts.push('营养均衡')
  if (d.supplementBonus > 0) parts.push('补剂加成+' + d.supplementBonus)
  return parts.join('，')
}

function evalStudy(d) {
  if (!d || !d.studyMinutes || d.studyMinutes <= 0) return null
  var m = d.studyMinutes
  if (m >= 180) return '学习充实，成果可期'
  if (m >= 60) return '学习在线，持续积累'
  return '学习时间偏少，明日补足'
}

function evalWork(d) {
  if (!d || !d.workOutput || d.workOutput <= 0) return null
  if (d.workOutput >= 3) return '功业高效，推进有力'
  return '功业正常推进'
}

function evalDebuff(d) {
  if (!d || d.debuffCount == null) return null
  if (d.debuffCount >= 3) return '放纵多次，明日务必节制'
  if (d.debuffCount >= 1) return '偶有放纵，无伤大雅'
  return '今日自律'
}

function evalSleep(d) {
  if (!d) return null
  if (d.sleepOnTime) return '准点入睡，恢复有保障'
  if (d.stayUpLate) return '熬夜伤身，明日尽早入睡'
  return null
}

function evalOverall(evals) {
  var tags = []
  if (evals.sport) tags.push('训练' + (evals.sport.indexOf('充足') >= 0 || evals.sport.indexOf('到位') >= 0 ? '到位' : '偏少'))
  if (evals.diet) tags.push(evals.diet.indexOf('蛋白充足') >= 0 || evals.diet.indexOf('均衡') >= 0 ? '饮食均衡' : '饮食有偏')
  if (evals.study) tags.push('学习' + (evals.study.indexOf('充实') >= 0 ? '充实' : '在线'))
  if (evals.debuff) tags.push('有放纵')
  if (evals.sleep) tags.push('睡眠' + (evals.sleep.indexOf('保障') >= 0 ? '充足' : '不足'))
  if (tags.length === 0) return null
  var line = '今日' + tags.join('，')
  if (evals.debuff) line += '，明日回归正轨'
  else line += '，保持此境'
  return line
}

function buildEvaluation(d) {
  d = d || {}
  var dietInput = null
  if (d.nutrition) {
    dietInput = {
      nutrition: optimalScore.calcAdequacy(d.nutrition, null),
      supplementBonus: d.supplementBonus || 0
    }
  }
  var evals = {
    sport: evalSport(d),
    diet: evalDiet(dietInput),
    study: evalStudy(d),
    work: evalWork(d),
    debuff: evalDebuff(d),
    sleep: evalSleep(d)
  }
  evals.overall = evalOverall(evals)
  return evals
}

module.exports = {
  evalSport: evalSport,
  evalDiet: evalDiet,
  evalStudy: evalStudy,
  evalWork: evalWork,
  evalDebuff: evalDebuff,
  evalSleep: evalSleep,
  evalOverall: evalOverall,
  buildEvaluation: buildEvaluation
}
