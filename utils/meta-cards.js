// 大道之行 · 元卡定义（v1.1 – sport / diet 双维度）
// 元卡 = 动作原型的最小全集。用户通过组合元卡 + 自由命名 + 调参数 → 衍生所有活动。

var META_CARDS = {

  // ========== 无氧子集 ==========

  push: {
    id: 'push',
    name: '推',
    subcategory: 'anaerobic',
    description: '克服阻力将物体推离身体的抗阻训练',
    musclePool: {
      primary: [
        { id: 'pec_major',    name: '胸大肌',       defaultWeight: 0.40 },
        { id: 'front_delt',   name: '三角肌前束',    defaultWeight: 0.35 },
        { id: 'triceps',      name: '肱三头肌',       defaultWeight: 0.25 }
      ],
      secondary: [
        { id: 'serratus',     name: '前锯肌',         defaultWeight: 0 },
        { id: 'core',         name: '核心',            defaultWeight: 0 },
        { id: 'mid_delt',     name: '三角肌中束',      defaultWeight: 0 }
      ]
    },
    defaultCells: [
      { id: 1, type: 'weight',   name: '重量', unit: 'kg', weight: 0.50 },
      { id: 2, type: 'reps',     name: '次数', unit: '次', weight: 0.30 },
      { id: 3, type: 'sets',     name: '组数', unit: '组', weight: 0.20 }
    ],
    cellTypes: ['weight', 'reps', 'sets', 'time', 'distance', 'custom'],
    valueType: 'anaerobic',
    breakthrough: { type: 'single', formula: '1rm_compare' }
  },

  pull: {
    id: 'pull',
    name: '拉',
    subcategory: 'anaerobic',
    description: '克服阻力将物体拉近身体的抗阻训练',
    musclePool: {
      primary: [
        { id: 'lats',         name: '背阔肌',         defaultWeight: 0.30 },
        { id: 'mid_low_trap', name: '斜方肌中下',      defaultWeight: 0.20 },
        { id: 'rhomboids',    name: '菱形肌',         defaultWeight: 0.15 },
        { id: 'biceps',       name: '肱二头肌',       defaultWeight: 0.20 },
        { id: 'rear_delt',    name: '三角肌后束',      defaultWeight: 0.15 }
      ],
      secondary: [
        { id: 'brachialis',   name: '肱肌/肱桡肌',    defaultWeight: 0 },
        { id: 'teres_major',  name: '大圆肌',         defaultWeight: 0 },
        { id: 'core',         name: '核心',            defaultWeight: 0 },
        { id: 'infraspinatus',name: '冈下肌',         defaultWeight: 0 }
      ]
    },
    defaultCells: [
      { id: 1, type: 'weight', name: '重量', unit: 'kg', weight: 0.50 },
      { id: 2, type: 'reps',   name: '次数', unit: '次', weight: 0.30 },
      { id: 3, type: 'sets',   name: '组数', unit: '组', weight: 0.20 }
    ],
    cellTypes: ['weight', 'reps', 'sets', 'time', 'distance', 'custom'],
    valueType: 'anaerobic',
    breakthrough: { type: 'single', formula: '1rm_compare' }
  },

  squat: {
    id: 'squat',
    name: '蹲',
    subcategory: 'anaerobic',
    description: '下肢屈伸抗阻训练，髋膝踝联动',
    musclePool: {
      primary: [
        { id: 'quads',        name: '股四头肌',       defaultWeight: 0.35 },
        { id: 'glutes',       name: '臀大肌',         defaultWeight: 0.30 },
        { id: 'hamstrings',   name: '腘绳肌',         defaultWeight: 0.20 },
        { id: 'adductors',    name: '内收肌群',       defaultWeight: 0.15 }
      ],
      secondary: [
        { id: 'erectors',     name: '竖脊肌',         defaultWeight: 0 },
        { id: 'core',         name: '核心',            defaultWeight: 0 },
        { id: 'calves',       name: '腓肠肌',         defaultWeight: 0 },
        { id: 'hip_flexors',  name: '髋屈肌',         defaultWeight: 0 }
      ]
    },
    defaultCells: [
      { id: 1, type: 'weight', name: '重量', unit: 'kg', weight: 0.50 },
      { id: 2, type: 'reps',   name: '次数', unit: '次', weight: 0.30 },
      { id: 3, type: 'sets',   name: '组数', unit: '组', weight: 0.20 }
    ],
    cellTypes: ['weight', 'reps', 'sets', 'time', 'distance', 'custom'],
    valueType: 'anaerobic',
    breakthrough: { type: 'single', formula: '1rm_compare' },
    extraParams: [
      { id: 'rom', name: '幅度', type: 'select', options: ['全程', '半程', '等长'], default: '全程' }
    ]
  },

  // ========== 核心子集 ==========

  hold: {
    id: 'hold',
    name: '撑',
    subcategory: 'core',
    description: '静态抗阻保持，核心稳定训练',
    musclePool: {
      primary: [
        { id: 'rectus_ab',    name: '腹直肌',         defaultWeight: 0.30 },
        { id: 'trans_ab',     name: '腹横肌',         defaultWeight: 0.30 },
        { id: 'obliques',     name: '腹斜肌',         defaultWeight: 0.25 },
        { id: 'erectors',     name: '竖脊肌',         defaultWeight: 0.15 }
      ],
      secondary: [
        { id: 'glutes',       name: '臀大肌',         defaultWeight: 0 },
        { id: 'front_delt',   name: '三角肌前束',     defaultWeight: 0 },
        { id: 'quads',        name: '股四头肌',       defaultWeight: 0 }
      ]
    },
    defaultCells: [
      { id: 1, type: 'time',  name: '时长', unit: '秒', weight: 0.70 },
      { id: 2, type: 'sets',  name: '组数', unit: '组', weight: 0.30 }
    ],
    cellTypes: ['weight', 'reps', 'sets', 'time', 'distance', 'custom'],
    valueType: 'core_static',
    breakthrough: { type: 'time_max', formula: 'duration_compare' }
  },

  curl: {
    id: 'curl',
    name: '卷',
    subcategory: 'core',
    description: '动态核心屈伸，腹肌收缩训练',
    musclePool: {
      primary: [
        { id: 'rectus_ab',    name: '腹直肌',         defaultWeight: 0.30 },
        { id: 'trans_ab',     name: '腹横肌',         defaultWeight: 0.25 },
        { id: 'obliques',     name: '腹斜肌',         defaultWeight: 0.25 },
        { id: 'erectors',     name: '竖脊肌',         defaultWeight: 0.20 }
      ],
      secondary: [
        { id: 'hip_flexors',  name: '髋屈肌',         defaultWeight: 0 },
        { id: 'quads',        name: '股四头肌',       defaultWeight: 0 }
      ]
    },
    defaultCells: [
      { id: 1, type: 'reps',  name: '次数', unit: '次', weight: 0.60 },
      { id: 2, type: 'sets',  name: '组数', unit: '组', weight: 0.40 }
    ],
    cellTypes: ['weight', 'reps', 'sets', 'time', 'distance', 'custom'],
    valueType: 'core_dynamic',
    breakthrough: { type: 'single', formula: 'volume_compare' }
  },

  // ========== 有氧子集 ==========

  steady_cardio: {
    id: 'steady_cardio',
    name: '稳态有氧',
    subcategory: 'cardio',
    description: '持续稳定输出的心肺耐力训练',
    paramPool: {
      primary: [
        { id: 'cardio_endurance', name: '心肺耐力',     defaultWeight: 0.60 },
        { id: 'fat_metabolism',   name: '脂肪代谢',     defaultWeight: 0.40 }
      ],
      secondary: [
        { id: 'slow_twitch',  name: '慢肌纤维',         defaultWeight: 0 },
        { id: 'leg_muscles',  name: '下肢肌群',         defaultWeight: 0 },
        { id: 'core_stable',  name: '核心稳定',         defaultWeight: 0 }
      ]
    },
    defaultCells: [
      { id: 1, type: 'time',      name: '时长', unit: '分钟', weight: 0.60 },
      { id: 2, type: 'distance',  name: '距离', unit: 'km',   weight: 0.30 },
      { id: 3, type: 'custom',    name: '强度', unit: '',     weight: 0.10,
        meta: { selectOptions: ['轻松', '适中', '吃力'] } }
    ],
    cellTypes: ['time', 'distance', 'reps', 'custom'],
    valueType: 'cardio_steady',
    breakthrough: { type: 'trend', formula: 'weekly_compare' },
    extraParams: [
      { id: 'intensity', name: '强度标注', type: 'select',
        options: ['轻松', '适中', '吃力'], default: '适中',
        coeff: { '轻松': 0.7, '适中': 1.0, '吃力': 1.3 } }
    ]
  },

  interval_cardio: {
    id: 'interval_cardio',
    name: '间歇有氧',
    subcategory: 'cardio',
    description: '高强度间歇交替的心肺爆发训练',
    paramPool: {
      primary: [
        { id: 'cardio_burst',    name: '心肺爆发',      defaultWeight: 0.50 },
        { id: 'vo2max',          name: '最大摄氧量',    defaultWeight: 0.50 }
      ],
      secondary: [
        { id: 'fast_twitch',  name: '快肌纤维',         defaultWeight: 0 },
        { id: 'full_coord',   name: '全身协调',         defaultWeight: 0 },
        { id: 'fat_metabolism', name: '脂肪代谢',       defaultWeight: 0 }
      ]
    },
    defaultCells: [
      { id: 1, type: 'sets',   name: '组数', unit: '组',     weight: 0.40 },
      { id: 2, type: 'time',   name: '时长', unit: '分钟',   weight: 0.40 },
      { id: 3, type: 'custom', name: '强度', unit: '',       weight: 0.20,
        meta: { selectOptions: ['适中', '吃力', '极限'] } }
    ],
    cellTypes: ['time', 'distance', 'sets', 'reps', 'custom'],
    valueType: 'cardio_interval',
    breakthrough: { type: 'trend', formula: 'weekly_compare' },
    extraParams: [
      { id: 'intensity', name: '强度标注', type: 'select',
        options: ['适中', '吃力', '极限'], default: '吃力',
        coeff: { '适中': 0.8, '吃力': 1.0, '极限': 1.3 } }
    ]
  },

  // ========== 不知道（兜底）==========

  unknown: {
    id: 'unknown',
    name: '不知道',
    subcategory: 'unknown',
    description: '自由定义的运动活动，不受任何预设约束',
    musclePool: {
      primary: [],
      secondary: [
        { id: 'pec_major',    name: '胸大肌',         defaultWeight: 0 },
        { id: 'front_delt',   name: '三角肌前束',      defaultWeight: 0 },
        { id: 'mid_delt',     name: '三角肌中束',      defaultWeight: 0 },
        { id: 'triceps',      name: '肱三头肌',        defaultWeight: 0 },
        { id: 'lats',         name: '背阔肌',          defaultWeight: 0 },
        { id: 'mid_low_trap', name: '斜方肌中下',       defaultWeight: 0 },
        { id: 'rhomboids',    name: '菱形肌',          defaultWeight: 0 },
        { id: 'biceps',       name: '肱二头肌',        defaultWeight: 0 },
        { id: 'rear_delt',    name: '三角肌后束',       defaultWeight: 0 },
        { id: 'quads',        name: '股四头肌',        defaultWeight: 0 },
        { id: 'glutes',       name: '臀大肌',          defaultWeight: 0 },
        { id: 'hamstrings',   name: '腘绳肌',          defaultWeight: 0 },
        { id: 'adductors',    name: '内收肌群',        defaultWeight: 0 },
        { id: 'calves',       name: '腓肠肌',          defaultWeight: 0 },
        { id: 'erectors',     name: '竖脊肌',          defaultWeight: 0 },
        { id: 'rectus_ab',    name: '腹直肌',          defaultWeight: 0 },
        { id: 'trans_ab',     name: '腹横肌',          defaultWeight: 0 },
        { id: 'obliques',     name: '腹斜肌',          defaultWeight: 0 },
        { id: 'serratus',     name: '前锯肌',          defaultWeight: 0 },
        { id: 'brachialis',   name: '肱肌/肱桡肌',     defaultWeight: 0 },
        { id: 'teres_major',  name: '大圆肌',          defaultWeight: 0 },
        { id: 'infraspinatus',name: '冈下肌',          defaultWeight: 0 },
        { id: 'hip_flexors',  name: '髋屈肌',          defaultWeight: 0 },
        { id: 'cardio_endurance', name: '心肺耐力',     defaultWeight: 0 },
        { id: 'fat_metabolism',   name: '脂肪代谢',     defaultWeight: 0 },
        { id: 'cardio_burst',     name: '心肺爆发',     defaultWeight: 0 },
        { id: 'vo2max',           name: '最大摄氧量',   defaultWeight: 0 }
      ]
    },
    defaultCells: [],
    cellTypes: ['weight', 'reps', 'sets', 'time', 'distance', 'custom'],
    valueType: 'unknown',
    breakthrough: { type: 'none' }
  },

  // ========== 食·丹食 子集 ==========

  daily: {
    id: 'daily',
    name: '日常卡',
    category: 'diet',
    description: '选几项就记完，模糊判断食物质量',
    selectParams: [
      { id: 'fullness', name: '饱腹度', options: ['没吃', '七分饱', '饱了', '撑了'], default: '饱了' },
      { id: 'meat_veg_ratio', name: '荤素比', options: ['全素', '均衡', '肉多', '全肉'], default: '均衡' },
      { id: 'carb_level', name: '碳水量', options: ['低碳', '均衡', '高碳'], default: '均衡' },
      { id: 'fat_level', name: '油脂量', options: ['少油', '均衡', '高油'], default: '均衡' },
      { id: 'processing', name: '加工程度', options: ['天然', '轻度加工', '精加工', '超加工'], default: '轻度加工' }
    ],
    defaultCells: [
      { id: 1, type: 'subjective', name: '主观评价', unit: '', weight: 1.0,
        meta: { selectOptions: ['吃多了', '还行', '吃少了'] } }
    ],
    cellTypes: ['subjective', 'portion', 'weight_g', 'calories', 'custom'],
    valueType: 'diet_daily',
    breakthrough: { type: 'trend', formula: 'weekly_compare' }
  },

  precision: {
    id: 'precision',
    name: '精准卡',
    category: 'diet',
    description: '滑块调节营养素比例，精确管理饮食',
    paramPool: {
      primary: [
        { id: 'protein',  name: '蛋白质', defaultWeight: 0.33 },
        { id: 'carbs',    name: '碳水',   defaultWeight: 0.33 },
        { id: 'fat',      name: '脂肪',   defaultWeight: 0.33 }
      ],
      secondary: [
        { id: 'fiber',    name: '膳食纤维', defaultWeight: 0 },
        { id: 'cal_density', name: '热量密度', defaultWeight: 0 },
        { id: 'micronutrients', name: '微量营养素', defaultWeight: 0 }
      ]
    },
    defaultCells: [
      { id: 1, type: 'weight_g',  name: '重量',   unit: 'g',    weight: 0.50 },
      { id: 2, type: 'calories',  name: '卡路里', unit: 'kcal', weight: 0.50 }
    ],
    cellTypes: ['weight_g', 'calories', 'portion', 'custom'],
    valueType: 'diet_precision',
    breakthrough: { type: 'trend', formula: 'weekly_compare' }
  },

  diet_free: {
    id: 'diet_free',
    name: 'free卡',
    category: 'diet',
    description: '自由定义饮食活动',
    paramPool: {
      primary: [],
      secondary: [
        { id: 'protein', name: '蛋白质', defaultWeight: 0 },
        { id: 'carbs', name: '碳水', defaultWeight: 0 },
        { id: 'fat', name: '脂肪', defaultWeight: 0 },
        { id: 'fiber', name: '膳食纤维', defaultWeight: 0 },
        { id: 'cal_density', name: '热量密度', defaultWeight: 0 },
        { id: 'micronutrients', name: '微量营养素', defaultWeight: 0 }
      ]
    },
    defaultCells: [],
    cellTypes: ['weight_g', 'calories', 'portion', 'subjective', 'custom'],
    valueType: 'diet_free',
    breakthrough: { type: 'none' }
  }
}

// ========== 维度分组 ==========
var SUBCATEGORIES = {
  anaerobic: { name: '无氧', cards: ['push', 'pull', 'squat'], desc: '抗阻力量训练' },
  core:      { name: '核心', cards: ['hold', 'curl'],          desc: '腰腹核心训练' },
  cardio:    { name: '有氧', cards: ['steady_cardio', 'interval_cardio'], desc: '心肺耐力训练' },
  unknown:   { name: '不知道', cards: ['unknown'],              desc: '自由定义' },
  diet:      { name: '饮食', cards: ['daily', 'precision', 'diet_free'], desc: '' }
}

// ========== 价值计算公式 ==========
function calculateValue(metaCard, cells, muscleWeights, extraParams) {
  var volume = 0
  for (var i = 0; i < cells.length; i++) {
    var c = cells[i]
    var coeff = 1.0
    if (c.type === 'time') {
      coeff = c.unit === '秒' ? 1.0 / 60 : 1.0
    }
    volume += (c.value || 0) * (c.weight || 1) * coeff
  }

  var totalMuscleWeight = 0
  for (var j = 0; j < muscleWeights.length; j++) {
    totalMuscleWeight += muscleWeights[j].weight || 0
  }
  if (totalMuscleWeight <= 0) totalMuscleWeight = 1

  var baseValue = volume * totalMuscleWeight

  if (extraParams) {
    for (var k in extraParams) {
      var ep = extraParams[k]
      if (ep && ep.coeff) {
        baseValue *= ep.coeff[ep.value] || 1.0
      }
    }
  }

  return {
    volume: volume,
    baseValue: Math.round(baseValue * 100) / 100,
    muscleWeights: muscleWeights
  }
}

// ========== 动作模板库（种子数据）==========
var MOVEMENT_TEMPLATES = {
  // ---- 推类 ----
  '杠铃卧推':      { metaCard: 'push', muscles: { pec_major: 0.45, front_delt: 0.25, triceps: 0.30 } },
  '哑铃平板卧推':  { metaCard: 'push', muscles: { pec_major: 0.45, front_delt: 0.25, triceps: 0.30 } },
  '杠铃上斜卧推':  { metaCard: 'push', muscles: { pec_major: 0.50, front_delt: 0.30, triceps: 0.20 } },
  '杠铃下斜卧推':  { metaCard: 'push', muscles: { pec_major: 0.55, front_delt: 0.15, triceps: 0.30 } },
  '哑铃飞鸟':      { metaCard: 'push', muscles: { pec_major: 0.75, front_delt: 0.15, triceps: 0.10 } },
  '杠铃站姿肩推':  { metaCard: 'push', muscles: { front_delt: 0.50, triceps: 0.30, pec_major: 0.10, mid_delt: 0.10 } },
  '哑铃推举':      { metaCard: 'push', muscles: { front_delt: 0.50, triceps: 0.30, pec_major: 0.10, mid_delt: 0.10 } },
  '哑铃侧平举':    { metaCard: 'push', muscles: { mid_delt: 0.70, front_delt: 0.20, triceps: 0.10 } },
  '哑铃前平举':    { metaCard: 'push', muscles: { front_delt: 0.80, pec_major: 0.10, mid_delt: 0.10 } },
  '颈后臂屈伸':    { metaCard: 'push', muscles: { triceps: 0.80, front_delt: 0.10, pec_major: 0.10 } },
  '绳索下压':      { metaCard: 'push', muscles: { triceps: 0.90, front_delt: 0.10 } },
  '窄距卧推':      { metaCard: 'push', muscles: { triceps: 0.50, pec_major: 0.30, front_delt: 0.20 } },
  '俯卧撑':        { metaCard: 'push', muscles: { pec_major: 0.40, front_delt: 0.30, triceps: 0.25, core: 0.05 } },
  '双杠臂屈伸':    { metaCard: 'push', muscles: { triceps: 0.50, pec_major: 0.30, front_delt: 0.20 } },
  '龙门架夹胸':    { metaCard: 'push', muscles: { pec_major: 0.80, front_delt: 0.15, triceps: 0.05 } },
  '坐姿推胸器':    { metaCard: 'push', muscles: { pec_major: 0.55, front_delt: 0.25, triceps: 0.20 } },

  // ---- 拉类 ----
  '引体向上':      { metaCard: 'pull', muscles: { lats: 0.45, biceps: 0.25, mid_low_trap: 0.10, rhomboids: 0.10, rear_delt: 0.10 } },
  '高位下拉':      { metaCard: 'pull', muscles: { lats: 0.50, biceps: 0.20, rhomboids: 0.10, mid_low_trap: 0.10, rear_delt: 0.10 } },
  '杠铃俯身划船':  { metaCard: 'pull', muscles: { mid_low_trap: 0.25, rhomboids: 0.20, lats: 0.20, biceps: 0.15, rear_delt: 0.10, core: 0.10 } },
  '哑铃单臂划船':  { metaCard: 'pull', muscles: { lats: 0.30, rhomboids: 0.20, mid_low_trap: 0.20, biceps: 0.15, rear_delt: 0.10, core: 0.05 } },
  '坐姿划船':      { metaCard: 'pull', muscles: { rhomboids: 0.25, mid_low_trap: 0.25, lats: 0.20, biceps: 0.15, rear_delt: 0.10, core: 0.05 } },
  '哑铃弯举':      { metaCard: 'pull', muscles: { biceps: 0.70, brachialis: 0.30 } },
  '杠铃弯举':      { metaCard: 'pull', muscles: { biceps: 0.70, brachialis: 0.30 } },
  '锤式弯举':      { metaCard: 'pull', muscles: { biceps: 0.50, brachialis: 0.50 } },
  '俯身飞鸟':      { metaCard: 'pull', muscles: { rear_delt: 0.70, rhomboids: 0.15, mid_low_trap: 0.15 } },
  '面拉':          { metaCard: 'pull', muscles: { rear_delt: 0.50, rhomboids: 0.20, mid_low_trap: 0.20, biceps: 0.10 } },
  '硬拉':          { metaCard: 'pull', muscles: { erectors: 0.25, glutes: 0.20, lats: 0.20, hamstrings: 0.15, mid_low_trap: 0.10, core: 0.10 } },

  // ---- 蹲类 ----
  '杠铃深蹲':      { metaCard: 'squat', muscles: { quads: 0.40, glutes: 0.25, hamstrings: 0.15, adductors: 0.10, erectors: 0.05, core: 0.05 } },
  '自重深蹲':      { metaCard: 'squat', muscles: { quads: 0.40, glutes: 0.25, hamstrings: 0.15, adductors: 0.10, core: 0.05 } },
  '前蹲':          { metaCard: 'squat', muscles: { quads: 0.50, glutes: 0.20, hamstrings: 0.15, adductors: 0.05, core: 0.10 } },
  '箭步蹲':        { metaCard: 'squat', muscles: { quads: 0.30, glutes: 0.35, hamstrings: 0.15, adductors: 0.10, core: 0.10 } },
  '保加利亚分腿蹲':{ metaCard: 'squat', muscles: { quads: 0.35, glutes: 0.35, hamstrings: 0.15, adductors: 0.05, core: 0.10 } },
  '罗马尼亚硬拉':  { metaCard: 'squat', muscles: { hamstrings: 0.40, glutes: 0.30, erectors: 0.15, quads: 0.10, core: 0.05 } },
  '臀推':          { metaCard: 'squat', muscles: { glutes: 0.60, hamstrings: 0.20, erectors: 0.10, quads: 0.10 } },
  '腿举机':        { metaCard: 'squat', muscles: { quads: 0.60, glutes: 0.25, hamstrings: 0.10, adductors: 0.05 } },
  '腿屈伸':        { metaCard: 'squat', muscles: { quads: 1.0 } },
  '腿弯举':        { metaCard: 'squat', muscles: { hamstrings: 1.0 } },
  '髋外展':        { metaCard: 'squat', muscles: { glutes: 0.50, adductors: 0.50 } },

  // ---- 核心·撑 ----
  '平板支撑':      { metaCard: 'hold', muscles: { trans_ab: 0.35, rectus_ab: 0.30, obliques: 0.20, erectors: 0.15 } },
  '侧平板支撑':    { metaCard: 'hold', muscles: { obliques: 0.60, trans_ab: 0.25, rectus_ab: 0.15 } },
  '死虫式':        { metaCard: 'hold', muscles: { trans_ab: 0.40, rectus_ab: 0.30, obliques: 0.20, hip_flexors: 0.10 } },
  '鸟狗式':        { metaCard: 'hold', muscles: { erectors: 0.35, trans_ab: 0.30, glutes: 0.20, rectus_ab: 0.15 } },
  '超人式':        { metaCard: 'hold', muscles: { erectors: 0.45, glutes: 0.25, trans_ab: 0.15, rectus_ab: 0.15 } },
  '靠墙静蹲':      { metaCard: 'hold', muscles: { quads: 0.50, glutes: 0.25, core: 0.25 } },

  // ---- 核心·卷 ----
  '卷腹':          { metaCard: 'curl', muscles: { rectus_ab: 0.55, trans_ab: 0.25, obliques: 0.20 } },
  '反向卷腹':      { metaCard: 'curl', muscles: { rectus_ab: 0.45, trans_ab: 0.30, obliques: 0.15, hip_flexors: 0.10 } },
  '俄罗斯转体':    { metaCard: 'curl', muscles: { obliques: 0.55, rectus_ab: 0.25, trans_ab: 0.20 } },
  '仰卧举腿':      { metaCard: 'curl', muscles: { rectus_ab: 0.40, trans_ab: 0.30, hip_flexors: 0.20, obliques: 0.10 } },
  '绳索卷腹':      { metaCard: 'curl', muscles: { rectus_ab: 0.60, trans_ab: 0.20, obliques: 0.20 } },

  // ---- 稳态有氧 ----
  '跑步':          { metaCard: 'steady_cardio' },
  '快走':          { metaCard: 'steady_cardio' },
  '骑行':          { metaCard: 'steady_cardio' },
  '椭圆机':        { metaCard: 'steady_cardio' },
  '划船机':        { metaCard: 'steady_cardio' },
  '游泳':          { metaCard: 'steady_cardio' },
  '爬楼梯':        { metaCard: 'steady_cardio' },
  '晨间唤醒操':    { metaCard: 'steady_cardio' },
  '瑜伽':          { metaCard: 'steady_cardio' },
  '动态拉伸':      { metaCard: 'steady_cardio' },
  '静态拉伸':      { metaCard: 'steady_cardio' },
  '睡前拉伸':      { metaCard: 'steady_cardio' },
  '家务劳动':      { metaCard: 'steady_cardio' },

  // ---- 间歇有氧 ----
  'HIIT':           { metaCard: 'interval_cardio' },
  '波比跳':         { metaCard: 'interval_cardio' },
  '登山跑':         { metaCard: 'interval_cardio' },
  '跳绳':           { metaCard: 'interval_cardio' },
  '冲刺间歇':       { metaCard: 'interval_cardio' },
  'Tabata':         { metaCard: 'interval_cardio' }
}

// ========== 辅助函数 ==========

/** 根据动作名从模板库匹配 */
function matchMovement(name) {
  if (!name) return null
  var clean = String(name).trim()
  // 精确匹配
  if (MOVEMENT_TEMPLATES[clean]) {
    return MOVEMENT_TEMPLATES[clean]
  }
  // 模糊匹配（包含关系）
  var keys = Object.keys(MOVEMENT_TEMPLATES)
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].indexOf(clean) !== -1 || clean.indexOf(keys[i]) !== -1) {
      return MOVEMENT_TEMPLATES[keys[i]]
    }
  }
  return null
}

/** 获取某个 metaCard 的完整定义 */
function getMetaCard(cardId) {
  return META_CARDS[cardId] || null
}

module.exports = {
  META_CARDS: META_CARDS,
  SUBCATEGORIES: SUBCATEGORIES,
  MOVEMENT_TEMPLATES: MOVEMENT_TEMPLATES,
  calculateValue: calculateValue,
  matchMovement: matchMovement,
  getMetaCard: getMetaCard
}
