// ============================================================
// 天道修行 — 公开修行模板库
//
// 每个模板是一组活动的有序集合，选的都是活动库里真实存在的活动
// 用户可以直接用公开模板来记录修行，也可以保存为自己的模板
// ============================================================

var PUBLIC_TEMPLATES = {

  // ============================================================
  //  一、武·炼体
  // ============================================================

  // ---- 胸肌锤炼日 ----
  wu_chest_day: {
    id: 'wu_chest_day',
    name: '胸肌锤炼日',
    category: 'wu',
    cover: '胸',
    tag: '官方',
    description: '推类动作为主，从杠铃卧推到底，收尾跳绳燃脂',
    activities: [
      'barbell_bench',
      'dumbbell_incline_bench',
      'dumbbell_fly',
      'cable_chest_fly',
      'tricep_pushdown',
      'push_up',
      'jump_rope'
    ]
  },

  // ---- 背部锻造日 ----
  wu_back_day: {
    id: 'wu_back_day',
    name: '背部锻造日',
    category: 'wu',
    cover: '背',
    tag: '官方',
    description: '拉类动作拉满，引体向上开局，硬拉收尾',
    activities: [
      'pull_up',
      'lat_pulldown',
      'barbell_row',
      'seated_row',
      'dumbbell_row',
      'barbell_deadlift',
      'dumbbell_curl'
    ]
  },

  // ---- 下肢锻骨日 ----
  wu_leg_day: {
    id: 'wu_leg_day',
    name: '下肢锻骨日',
    category: 'wu',
    cover: '腿',
    tag: '官方',
    description: '深蹲开局腿举跟上，练完臀推提踵不放过任何一块肉',
    activities: [
      'barbell_squat',
      'leg_press',
      'dumbbell_lunge',
      'leg_extension',
      'leg_curl',
      'barbell_hip_thrust',
      'calf_raise',
      'glute_bridge'
    ]
  },

  // ---- 全身燃脂日 ----
  wu_cardio_day: {
    id: 'wu_cardio_day',
    name: '全身燃脂日',
    category: 'wu',
    cover: '燃',
    tag: '官方',
    description: '跑步跳绳加波比，核心收尾平板撑，汗水出透才收工',
    activities: [
      'running',
      'jump_rope',
      'burpee',
      'hiit',
      'mountain_climber',
      'plank',
      'crunch',
      'brisk_walk'
    ]
  },

  // ---- 肩臂雕琢日 ----
  wu_shoulder_arm_day: {
    id: 'wu_shoulder_arm_day',
    name: '肩臂雕琢日',
    category: 'wu',
    cover: '肩',
    tag: '官方',
    description: '肩推侧平举前平举飞鸟，弯举臂屈伸一套带走',
    activities: [
      'dumbbell_shoulder_press',
      'dumbbell_lateral_raise',
      'dumbbell_front_raise',
      'dumbbell_rear_fly',
      'dumbbell_curl',
      'dumbbell_hammer_curl',
      'dumbbell_tricep_ext',
      'tricep_pushdown'
    ]
  },

  // ============================================================
  //  二、食·丹食
  // ============================================================

  // ---- 增肌标准餐 ----
  shi_bulk_meal: {
    id: 'shi_bulk_meal',
    name: '增肌标准餐',
    category: 'shi',
    cover: '增',
    tag: '官方',
    description: '高蛋白+碳水+蔬菜，三餐搭配补剂，练后快吸收',
    activities: [
      'healthy_breakfast',
      'nutritious_lunch',
      'light_dinner',
      'quality_protein',
      'enough_veggies',
      'regular_meals',
      'drink_8_water'
    ]
  },

  // ---- 减脂轻食餐 ----
  shi_cut_meal: {
    id: 'shi_cut_meal',
    name: '减脂轻食餐',
    category: 'shi',
    cover: '减',
    tag: '官方',
    description: '控制热量+高蛋白蔬菜，戒糖戒夜宵，缺口搞出来',
    activities: [
      'calorie_control',
      'enough_veggies',
      'light_dinner',
      'quality_protein',
      'no_sugar_drink',
      'no_late_snack',
      'drink_8_water'
    ]
  },

  // ---- 碳水充能日 ----
  shi_carb_load: {
    id: 'shi_carb_load',
    name: '碳水充能日',
    category: 'shi',
    cover: '碳',
    tag: '官方',
    description: '三餐碳水拉满，适合大练之后补充糖原',
    activities: [
      'healthy_breakfast',
      'nutritious_lunch',
      'light_dinner',
      'regular_meals',
      'drink_8_water'
    ]
  },

  // ---- 补水清肠日 ----
  shi_detox_day: {
    id: 'shi_detox_day',
    name: '补水清肠日',
    category: 'shi',
    cover: '水',
    tag: '官方',
    description: '多喝水+大量蔬菜+清淡饮食，给肠胃放个假',
    activities: [
      'drink_8_water',
      'enough_veggies',
      'light_dinner',
      'no_sugar_drink',
      'regular_meals'
    ]
  },

  // ---- 饮食自律日 ----
  shi_discipline: {
    id: 'shi_discipline',
    name: '饮食自律日',
    category: 'shi',
    cover: '律',
    tag: '官方',
    description: '三餐规律+控热+戒糖+戒夜宵+补蛋白，全方位自律',
    activities: [
      'regular_meals',
      'calorie_control',
      'no_sugar_drink',
      'no_late_snack',
      'quality_protein',
      'healthy_breakfast',
      'light_dinner'
    ]
  },

  // ============================================================
  //  三、悟·修心
  // ============================================================

  // ---- 深度学习日 ----
  wu2_deep_study: {
    id: 'wu2_deep_study',
    name: '深度学习日',
    category: 'wu2',
    cover: '学',
    tag: '官方',
    description: '看书听课做笔记，深耕专业知识再加复盘',
    activities: [
      'read_book',
      'learn_course',
      'write_reading_notes',
      'professional_knowledge',
      'review_summary',
      'foreign_language'
    ]
  },

  // ---- 冥想静心日 ----
  wu2_calm_day: {
    id: 'wu2_calm_day',
    name: '冥想静心日',
    category: 'wu2',
    cover: '静',
    tag: '官方',
    description: '练字听乐弹琴写作观影，让心静下来',
    activities: [
      'calligraphy',
      'listen_music',
      'play_instrument',
      'writing_creation',
      'watch_film_enlighten',
      'read_book'
    ]
  },

  // ---- 技能提升日 ----
  wu2_skill_up: {
    id: 'wu2_skill_up',
    name: '技能提升日',
    category: 'wu2',
    cover: '技',
    tag: '官方',
    description: '学外语背单词刷题备考，集中火力攻一门',
    activities: [
      'foreign_language',
      'memorize',
      'study_practice_questions',
      'exam_prep',
      'learn_course',
      'listen_audio_book'
    ]
  },

  // ---- 复盘总结日 ----
  wu2_review_day: {
    id: 'wu2_review_day',
    name: '复盘总结日',
    category: 'wu2',
    cover: '盘',
    tag: '官方',
    description: '回顾得失提炼经验，写笔记理思路再写作输出',
    activities: [
      'review_summary',
      'write_reading_notes',
      'writing_creation',
      'read_book',
      'photography'
    ]
  },

  // ============================================================
  //  四、工·功业
  // ============================================================

  // ---- 深度工作日 ----
  gong_deep_work: {
    id: 'gong_deep_work',
    name: '深度工作日',
    category: 'gong',
    cover: '深',
    tag: '官方',
    description: '推里程碑修bug发版本，深度学习搞创意',
    activities: [
      'milestone_progress',
      'bug_fix',
      'version_update',
      'deep_skill_learn',
      'creative_plan',
      'daily_sync',
      'personal_review'
    ]
  },

  // ---- 项目推进日 ----
  gong_project_push: {
    id: 'gong_project_push',
    name: '项目推进日',
    category: 'gong',
    cover: '推',
    tag: '官方',
    description: '立项方案复盘同步跨部门协调，把项目往前推',
    activities: [
      'project_proposal',
      'biz_plan_write',
      'project_review',
      'daily_sync',
      'cross_dept_coord',
      'data_report'
    ]
  },

  // ---- 副业推进日 ----
  gong_side_hustle: {
    id: 'gong_side_hustle',
    name: '副业推进日',
    category: 'gong',
    cover: '副',
    tag: '官方',
    description: '副业创作+行业分析+创意策划+个人复盘，八小时之外搞产出',
    activities: [
      'side_project',
      'industry_analysis',
      'creative_plan',
      'personal_review',
      'skill_practice',
      'industry_sharing'
    ]
  },

  // ---- 日常事务日 ----
  gong_daily_ops: {
    id: 'gong_daily_ops',
    name: '日常事务日',
    category: 'gong',
    cover: '常',
    tag: '官方',
    description: '打卡开会邮件报销文档更新，琐事也要算修行',
    activities: [
      'clock_in',
      'clock_out',
      'daily_meeting',
      'email_reply',
      'expense_report',
      'doc_update',
      'workstation_duty'
    ]
  },

  // ============================================================
  //  五、煞·心魔
  // ============================================================

  // ---- 熬夜修仙 ----
  sha_stay_up: {
    id: 'sha_stay_up',
    name: '熬夜修仙',
    category: 'sha',
    cover: '熬',
    tag: '官方',
    description: '熬夜通宵睡前刷手机，第二天还赖床，修为倒扣不冤',
    activities: [
      'stay_up_late',
      'all_nighter',
      'bed_phone_1h',
      'phone_all_night',
      'oversleep_1h'
    ]
  },

  // ---- 垃圾食品放纵 ----
  sha_junk_food: {
    id: 'sha_junk_food',
    name: '垃圾食品放纵',
    category: 'sha',
    cover: '纵',
    tag: '官方',
    description: '炸鸡奶茶甜品宵夜暴饮暴食，吃时一时爽扣分火葬场',
    activities: [
      'binge_eating',
      'full_sugar_bubble_tea',
      'fried_junk_food',
      'midnight_snack',
      'excess_sweets',
      'sugary_soda'
    ]
  },

  // ---- 刷手机失神 ----
  sha_phone_lost: {
    id: 'sha_phone_lost',
    name: '刷手机失神',
    category: 'sha',
    cover: '刷',
    tag: '官方',
    description: '短视频游戏八卦信息流，无目的刷到大脑空白',
    activities: [
      'mindless_short_video',
      'game_addiction',
      'cant_stop_video',
      'mindless_scroll_feed',
      'gossip_scroll',
      'refresh_social_obsess'
    ]
  },

  // ---- 摆烂躺平 ----
  sha_give_up: {
    id: 'sha_give_up',
    name: '摆烂躺平',
    category: 'sha',
    cover: '摆',
    tag: '官方',
    description: '荒废一天拖延任务搁置目标，心魔在召唤',
    activities: [
      'waste_whole_day',
      'procrastinate_task',
      'goal_abandoned',
      'break_promise',
      'slacking_at_work'
    ]
  }

}

/**
 * 按分类获取公开模板列表
 * @param {string} category - 分类标识：wu/shi/wu2/gong/sha
 * @returns {Array} 模板对象数组
 */
function getPublicTemplatesByCategory(category) {
  var result = []
  var keys = Object.keys(PUBLIC_TEMPLATES)
  for (var i = 0; i < keys.length; i++) {
    var tpl = PUBLIC_TEMPLATES[keys[i]]
    if (tpl.category === category) {
      result.push(tpl)
    }
  }
  return result
}

/**
 * 获取所有公开模板
 * @returns {Object} 所有公开模板的映射
 */
function getAllPublicTemplates() {
  return PUBLIC_TEMPLATES
}

module.exports = {
  PUBLIC_TEMPLATES: PUBLIC_TEMPLATES,
  getPublicTemplatesByCategory: getPublicTemplatesByCategory,
  getAllPublicTemplates: getAllPublicTemplates
}
