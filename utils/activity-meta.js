// 活动元数据扩展 — 为活动库中的活动补充肌群、热量、营养等计算用元数据

// 武·炼体类活动元数据
var WU_ACTIVITY_META = {
  // ======== 自重 · 推类 ========
  push_up: { muscles: { chest: 1.0, triceps: 0.6, shoulder_front: 0.4 }, caloriesPerUnit: 3, category: 'push' },
  wide_push_up: { muscles: { chest: 0.9, triceps: 0.5, shoulder_front: 0.3 }, caloriesPerUnit: 3, category: 'push' },
  narrow_push_up: { muscles: { chest: 0.5, triceps: 1.0, shoulder_front: 0.3 }, caloriesPerUnit: 3, category: 'push' },
  diamond_push_up: { muscles: { triceps: 1.0, chest: 0.6 }, caloriesPerUnit: 4, category: 'push' },
  knee_push_up: { muscles: { chest: 0.6, triceps: 0.4 }, caloriesPerUnit: 2, category: 'push' },
  decline_push_up: { muscles: { chest: 0.8, shoulder_front: 0.6, triceps: 0.5 }, caloriesPerUnit: 4, category: 'push' },
  incline_push_up: { muscles: { chest: 0.6, triceps: 0.5 }, caloriesPerUnit: 2, category: 'push' },
  band_push_up: { muscles: { chest: 1.0, triceps: 0.6 }, caloriesPerUnit: 4, category: 'push' },

  // ======== 自重 · 拉类 ========
  pull_up: { muscles: { back: 1.0, biceps: 0.6, shoulder_front: 0.2 }, caloriesPerUnit: 6, category: 'pull' },
  australian_pull_up: { muscles: { back: 0.8, biceps: 0.4 }, caloriesPerUnit: 4, category: 'pull' },
  superman_hold: { muscles: { back: 0.6, glutes: 0.4, hamstrings: 0.3 }, caloriesPerUnit: 0.5, category: 'pull' },

  // ======== 自重 · 推类（肩部）========
  pike_push_up: { muscles: { shoulders: 1.0, triceps: 0.5 }, caloriesPerUnit: 4, category: 'push' },
  wall_handstand: { muscles: { shoulders: 1.0, triceps: 0.6 }, caloriesPerUnit: 6, category: 'push' },

  // ======== 自重 · 拉类（肱二头肌）========
  reverse_grip_pull_up: { muscles: { biceps: 0.8, back: 0.7 }, caloriesPerUnit: 6, category: 'pull' },

  // ======== 自重 · 核心 ========
  plank: { muscles: { abs: 0.8, obliques: 0.4, back: 0.3 }, caloriesPerUnit: 0.3, category: 'core' },
  crunch: { muscles: { abs: 1.0, obliques: 0.2 }, caloriesPerUnit: 1, category: 'core' },
  reverse_crunch: { muscles: { abs: 0.9, obliques: 0.2 }, caloriesPerUnit: 1, category: 'core' },
  russian_twist: { muscles: { obliques: 1.0, abs: 0.5 }, caloriesPerUnit: 1, category: 'core' },
  mountain_climber: { muscles: { abs: 0.6, quads: 0.5, shoulders: 0.3 }, caloriesPerUnit: 2, category: 'core' },
  dead_bug: { muscles: { abs: 0.8, obliques: 0.3 }, caloriesPerUnit: 1, category: 'core' },
  side_plank: { muscles: { obliques: 1.0, abs: 0.4 }, caloriesPerUnit: 0.3, category: 'core' },
  leg_raise: { muscles: { abs: 0.9, hamstrings: 0.3 }, caloriesPerUnit: 1, category: 'core' },
  burpee: { muscles: { full_body: 0.8, quads: 0.6, chest: 0.4 }, caloriesPerUnit: 5, category: 'cardio' },
  bird_dog: { muscles: { back: 0.4, glutes: 0.4, abs: 0.4 }, caloriesPerUnit: 1, category: 'core' },
  stand_desk: { muscles: { back: 0.2, abs: 0.1 }, caloriesPerUnit: 3, category: 'core' },

  // ======== 自重 · 蹲类 ========
  bodyweight_squat: { muscles: { quads: 0.8, glutes: 0.6, hamstrings: 0.4, calves: 0.2 }, caloriesPerUnit: 3, category: 'squat' },
  sumo_squat: { muscles: { quads: 0.6, glutes: 0.9, hamstrings: 0.3 }, caloriesPerUnit: 3, category: 'squat' },
  lunge: { muscles: { quads: 0.7, glutes: 0.7, hamstrings: 0.4 }, caloriesPerUnit: 3, category: 'squat' },
  bulgarian_split_squat: { muscles: { quads: 0.9, glutes: 0.8, hamstrings: 0.3 }, caloriesPerUnit: 4, category: 'squat' },
  wall_sit: { muscles: { quads: 0.9, glutes: 0.3 }, caloriesPerUnit: 0.5, category: 'squat' },
  calf_raise: { muscles: { calves: 1.0 }, caloriesPerUnit: 1, category: 'squat' },
  pistol_squat: { muscles: { quads: 1.0, glutes: 0.7, hamstrings: 0.5 }, caloriesPerUnit: 6, category: 'squat' },
  box_squat: { muscles: { quads: 0.7, glutes: 0.7, hamstrings: 0.3 }, caloriesPerUnit: 2, category: 'squat' },

  // ======== 自重 · 臀部 ========
  glute_bridge: { muscles: { glutes: 1.0, hamstrings: 0.3 }, caloriesPerUnit: 1.5, category: 'squat' },
  single_leg_glute_bridge: { muscles: { glutes: 1.0, hamstrings: 0.3 }, caloriesPerUnit: 2, category: 'squat' },
  clamshell: { muscles: { glutes: 0.8, hamstrings: 0.2 }, caloriesPerUnit: 1, category: 'squat' },
  hip_abduction_bw: { muscles: { glutes: 0.8 }, caloriesPerUnit: 1, category: 'squat' },

  // ======== 自重 · 有氧 ========
  yoga: { muscles: { full_body: 0.3, back: 0.3 }, caloriesPerUnit: 4, category: 'cardio' },
  morning_wakeup: { muscles: { full_body: 0.3 }, caloriesPerUnit: 8, category: 'cardio' },

  // ======== 哑铃 · 推类 ========
  dumbbell_bench: { muscles: { chest: 1.0, triceps: 0.5, shoulder_front: 0.3 }, caloriesPerUnit: 8, category: 'push' },
  dumbbell_incline_bench: { muscles: { chest: 0.8, shoulder_front: 0.6, triceps: 0.4 }, caloriesPerUnit: 8, category: 'push' },
  dumbbell_fly: { muscles: { chest: 0.9, shoulder_front: 0.3 }, caloriesPerUnit: 5, category: 'push' },
  dumbbell_shoulder_press: { muscles: { shoulders: 1.0, triceps: 0.4 }, caloriesPerUnit: 5, category: 'push' },
  dumbbell_lateral_raise: { muscles: { shoulders: 0.9 }, caloriesPerUnit: 3, category: 'push' },
  dumbbell_front_raise: { muscles: { shoulder_front: 1.0 }, caloriesPerUnit: 3, category: 'push' },
  dumbbell_tricep_ext: { muscles: { triceps: 1.0 }, caloriesPerUnit: 4, category: 'push' },
  dumbbell_kickback: { muscles: { triceps: 0.9 }, caloriesPerUnit: 3, category: 'push' },

  // ======== 哑铃 · 拉类 ========
  dumbbell_row: { muscles: { back: 0.8, biceps: 0.4 }, caloriesPerUnit: 6, category: 'pull' },
  single_arm_db_row: { muscles: { back: 0.9, biceps: 0.4 }, caloriesPerUnit: 8, category: 'pull' },
  dumbbell_deadlift: { muscles: { back: 0.6, hamstrings: 0.5, glutes: 0.5 }, caloriesPerUnit: 8, category: 'pull' },
  dumbbell_rear_fly: { muscles: { back: 0.4, shoulders: 0.6 }, caloriesPerUnit: 3, category: 'pull' },
  dumbbell_curl: { muscles: { biceps: 1.0 }, caloriesPerUnit: 4, category: 'pull' },
  dumbbell_hammer_curl: { muscles: { biceps: 0.8, back: 0.2 }, caloriesPerUnit: 4, category: 'pull' },

  // ======== 哑铃 · 核心 ========
  dumbbell_russian_twist: { muscles: { obliques: 1.0, abs: 0.5 }, caloriesPerUnit: 2, category: 'core' },
  dumbbell_crunch: { muscles: { abs: 1.0 }, caloriesPerUnit: 2, category: 'core' },

  // ======== 哑铃 · 蹲类 ========
  dumbbell_squat: { muscles: { quads: 0.8, glutes: 0.6, hamstrings: 0.4 }, caloriesPerUnit: 8, category: 'squat' },
  dumbbell_lunge: { muscles: { quads: 0.7, glutes: 0.7, hamstrings: 0.4 }, caloriesPerUnit: 8, category: 'squat' },
  dumbbell_romanian_dl: { muscles: { hamstrings: 0.9, glutes: 0.6, back: 0.4 }, caloriesPerUnit: 8, category: 'squat' },
  dumbbell_hip_thrust: { muscles: { glutes: 1.0, hamstrings: 0.3 }, caloriesPerUnit: 8, category: 'squat' },

  // ======== 杠铃 · 推类 ========
  barbell_bench: { muscles: { chest: 1.0, triceps: 0.6, shoulder_front: 0.4 }, caloriesPerUnit: 10, category: 'push' },
  barbell_incline_bench: { muscles: { chest: 0.8, shoulder_front: 0.7, triceps: 0.4 }, caloriesPerUnit: 10, category: 'push' },
  barbell_decline_bench: { muscles: { chest: 0.8, triceps: 0.6 }, caloriesPerUnit: 10, category: 'push' },
  barbell_press: { muscles: { shoulders: 1.0, triceps: 0.4 }, caloriesPerUnit: 10, category: 'push' },
  barbell_push_press: { muscles: { shoulders: 0.9, triceps: 0.3, quads: 0.2 }, caloriesPerUnit: 12, category: 'push' },
  barbell_close_grip_bench: { muscles: { triceps: 1.0, chest: 0.5 }, caloriesPerUnit: 8, category: 'push' },

  // ======== 杠铃 · 拉类 ========
  barbell_deadlift: { muscles: { back: 0.5, hamstrings: 0.7, glutes: 0.7 }, caloriesPerUnit: 14, category: 'pull' },
  barbell_row: { muscles: { back: 1.0, biceps: 0.4 }, caloriesPerUnit: 10, category: 'pull' },
  barbell_curl: { muscles: { biceps: 1.0 }, caloriesPerUnit: 5, category: 'pull' },

  // ======== 杠铃 · 蹲类 ========
  barbell_romanian_dl: { muscles: { hamstrings: 0.9, glutes: 0.6, back: 0.5 }, caloriesPerUnit: 12, category: 'squat' },
  barbell_squat: { muscles: { quads: 0.9, glutes: 0.7, hamstrings: 0.5, calves: 0.2 }, caloriesPerUnit: 12, category: 'squat' },
  barbell_lunge: { muscles: { quads: 0.7, glutes: 0.7, hamstrings: 0.4 }, caloriesPerUnit: 10, category: 'squat' },
  barbell_hip_thrust: { muscles: { glutes: 1.0, hamstrings: 0.3 }, caloriesPerUnit: 10, category: 'squat' },

  // ======== 弹力带 ========
  band_chest_fly: { muscles: { chest: 0.9 }, caloriesPerUnit: 3, category: 'push' },
  band_pulldown: { muscles: { back: 0.8, biceps: 0.3 }, caloriesPerUnit: 4, category: 'pull' },
  band_seated_row: { muscles: { back: 0.8, biceps: 0.3 }, caloriesPerUnit: 4, category: 'pull' },
  band_bent_row: { muscles: { back: 0.7, biceps: 0.3 }, caloriesPerUnit: 4, category: 'pull' },
  band_lateral_raise: { muscles: { shoulders: 0.9 }, caloriesPerUnit: 2, category: 'push' },
  band_ext_rotation: { muscles: { shoulders: 0.6 }, caloriesPerUnit: 1, category: 'push' },
  band_front_raise: { muscles: { shoulder_front: 0.9 }, caloriesPerUnit: 2, category: 'push' },
  band_curl: { muscles: { biceps: 0.8 }, caloriesPerUnit: 2, category: 'pull' },
  band_tricep_ext: { muscles: { triceps: 0.8 }, caloriesPerUnit: 2, category: 'push' },
  band_squat: { muscles: { quads: 0.7, glutes: 0.5 }, caloriesPerUnit: 5, category: 'squat' },
  band_side_walk: { muscles: { glutes: 0.8 }, caloriesPerUnit: 2, category: 'squat' },
  band_glute_bridge: { muscles: { glutes: 0.9, hamstrings: 0.3 }, caloriesPerUnit: 3, category: 'squat' },
  band_hip_abduction: { muscles: { glutes: 0.8 }, caloriesPerUnit: 2, category: 'squat' },

  // ======== 绳索/固定器械 ========
  cable_chest_fly: { muscles: { chest: 0.9 }, caloriesPerUnit: 5, category: 'push' },
  machine_chest_press: { muscles: { chest: 1.0, triceps: 0.5 }, caloriesPerUnit: 8, category: 'push' },
  lat_pulldown: { muscles: { back: 0.9, biceps: 0.4 }, caloriesPerUnit: 8, category: 'pull' },
  seated_row: { muscles: { back: 0.9, biceps: 0.3 }, caloriesPerUnit: 8, category: 'pull' },
  cable_straight_arm_pd: { muscles: { back: 0.8 }, caloriesPerUnit: 5, category: 'pull' },
  cable_lateral_raise: { muscles: { shoulders: 0.9 }, caloriesPerUnit: 3, category: 'push' },
  cable_front_raise: { muscles: { shoulder_front: 0.9 }, caloriesPerUnit: 3, category: 'push' },
  tricep_pushdown: { muscles: { triceps: 1.0 }, caloriesPerUnit: 4, category: 'push' },
  cable_curl: { muscles: { biceps: 1.0 }, caloriesPerUnit: 4, category: 'pull' },
  leg_press: { muscles: { quads: 0.8, glutes: 0.6, hamstrings: 0.4 }, caloriesPerUnit: 10, category: 'squat' },
  leg_extension: { muscles: { quads: 1.0 }, caloriesPerUnit: 5, category: 'squat' },
  leg_curl: { muscles: { hamstrings: 1.0 }, caloriesPerUnit: 5, category: 'squat' },
  hip_abduction: { muscles: { glutes: 0.9 }, caloriesPerUnit: 4, category: 'squat' },
  cable_crunch: { muscles: { abs: 0.9, obliques: 0.3 }, caloriesPerUnit: 3, category: 'core' },

  // ======== 有氧 ========
  running: { muscles: { heart: 0.7, calves: 0.4, quads: 0.3, hamstrings: 0.2 }, caloriesPerUnit: 10, category: 'cardio' },
  cycling: { muscles: { heart: 0.6, quads: 0.6, glutes: 0.4, calves: 0.2 }, caloriesPerUnit: 8, category: 'cardio' },
  jump_rope: { muscles: { heart: 0.7, calves: 0.6, shoulders: 0.2 }, caloriesPerUnit: 12, category: 'cardio' },
  swimming: { muscles: { heart: 0.6, back: 0.5, shoulders: 0.4, chest: 0.2 }, caloriesPerUnit: 12, category: 'cardio' },
  hiit: { muscles: { heart: 0.8, full_body: 0.5 }, caloriesPerUnit: 15, category: 'cardio' },
  elliptical: { muscles: { heart: 0.5, quads: 0.4, glutes: 0.3 }, caloriesPerUnit: 8, category: 'cardio' },
  rowing_machine: { muscles: { heart: 0.5, back: 0.6, quads: 0.4, biceps: 0.3 }, caloriesPerUnit: 10, category: 'cardio' },
  brisk_walk: { muscles: { heart: 0.3, calves: 0.3 }, caloriesPerUnit: 4, category: 'cardio' },
  stair_climb: { muscles: { heart: 0.3, quads: 0.3, calves: 0.3 }, caloriesPerUnit: 5, category: 'cardio' },
  housework: { muscles: { full_body: 0.2 }, caloriesPerUnit: 3, category: 'cardio' },
  dynamic_stretch: { muscles: { full_body: 0.2 }, caloriesPerUnit: 2, category: 'cardio' },
  static_stretch: { muscles: { full_body: 0.2 }, caloriesPerUnit: 2, category: 'cardio' },
  bedtime_stretch: { muscles: { back: 0.2, hamstrings: 0.2 }, caloriesPerUnit: 6, category: 'cardio' },
  blank_sport: { muscles: { full_body: 0.3 }, caloriesPerUnit: 3, category: 'cardio' }
}

// 食·丹食类活动元数据
var SHI_ACTIVITY_META = {
  healthy_breakfast: { nutrition: { protein: 20, carbs: 45, fat: 12 }, caloriesPerUnit: 380 },
  nutritious_lunch: { nutrition: { protein: 35, carbs: 60, fat: 15 }, caloriesPerUnit: 550 },
  light_dinner: { nutrition: { protein: 25, carbs: 40, fat: 10 }, caloriesPerUnit: 380 },
  drink_8_water: { nutrition: { protein: 0, carbs: 0, fat: 0 }, caloriesPerUnit: 0 },
  enough_veggies: { nutrition: { protein: 5, carbs: 15, fat: 1 }, caloriesPerUnit: 100 },
  no_sugar_drink: { nutrition: { protein: 0, carbs: 0, fat: 0 }, caloriesPerUnit: 0 },
  calorie_control: { nutrition: { protein: 0, carbs: 0, fat: 0 }, caloriesPerUnit: 0 },
  quality_protein: { nutrition: { protein: 30, carbs: 2, fat: 8 }, caloriesPerUnit: 200 },
  regular_meals: { nutrition: { protein: 0, carbs: 0, fat: 0 }, caloriesPerUnit: 0 },
  no_late_snack: { nutrition: { protein: 0, carbs: 0, fat: 0 }, caloriesPerUnit: 0 },
  blank_diet: { nutrition: { protein: 10, carbs: 20, fat: 8 }, caloriesPerUnit: 200 }
}

// 肌群名称映射
var MUSCLE_NAMES = {
  chest: '胸肌',
  back: '背部',
  shoulders: '肩部',
  biceps: '肱二头肌',
  triceps: '肱三头肌',
  quads: '股四头肌',
  hamstrings: '腘绳肌',
  glutes: '臀肌',
  abs: '腹肌',
  obliques: '腹斜肌',
  calves: '小腿',
  heart: '心肺',
  shoulder_front: '三角肌前束',
  full_body: '全身'
}

// 肌群展示顺序（重要肌群优先）
var MUSCLE_DISPLAY_ORDER = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'abs', 'obliques', 'calves', 'heart', 'shoulder_front', 'full_body']

/**
 * 获取活动元数据，没有则返回默认值
 */
function getActivityMeta(activityId, category) {
  if (category === 'wu' || category === 'sport') {
    return WU_ACTIVITY_META[activityId] || {
      muscles: { full_body: 0.5 },
      caloriesPerUnit: 3,
      category: 'core'
    }
  }
  if (category === 'shi' || category === 'diet') {
    return SHI_ACTIVITY_META[activityId] || {
      nutrition: { carbs: 10 },
      caloriesPerUnit: 50
    }
  }
  return {}
}

module.exports = {
  WU_ACTIVITY_META: WU_ACTIVITY_META,
  SHI_ACTIVITY_META: SHI_ACTIVITY_META,
  MUSCLE_NAMES: MUSCLE_NAMES,
  MUSCLE_DISPLAY_ORDER: MUSCLE_DISPLAY_ORDER,
  getActivityMeta: getActivityMeta
}
