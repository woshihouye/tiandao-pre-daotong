// ============================================================
// 天道修行 — 预设修行项目库 v1.0
//
// 所有量化指标引用：
//   力量：NSCA Essentials of Strength Training, ACSM Guidelines
//   跑步：Daniels' Running Formula (VDOT), Tanaka HRmax
//   游泳：SWOLF, CSS (Ginn 1993)
//   词汇：Ebbinghaus 遗忘曲线, CEFR 等级, Roediger & Karpicke
//   柔韧：ACSM 坐位体前屈标准
//   冥想：Lazar et al. 2011, Brewer et al. 2011
//   睡眠：AASM/CDC 成人睡眠建议 (7-9h)
//   阅读：Carver (1990) 平均阅读速度 238 wpm（英文）/ 300 字/分钟（中文）
//
// 结构：
//   presets[].id           唯一标识
//   presets[].category      大类：力量/耐力/灵巧/心法/学识/日常
//   presets[].cultivationName  修行称谓
//   presets[].metrics[]    指标列表
//   presets[].scoreFormula  修行积分换算公式
//   presets[].displayConfig 展示配置
// ============================================================

var sportMovements = require('./sport-movements.js')

// ============================================================
// 一、力之根骨（体修）
// ============================================================

var STRENGTH_PRESETS = [
  {
    id: 'bench_press',
    name: '卧推',
    cultivationName: '擎天印·卧推',
    category: 'strength',
    categoryName: '力之根骨',
    icon: '🏋️',
    color: '#ef4444',
    desc: '以杠铃卧推锤炼胸肩三头之力，量化上肢推力修为',
    // ------ 修行指标定义 ------
    metrics: [
      {
        key: 'training_weight',
        label: '训练重量',
        unit: 'kg',
        type: 'number',
        step: 2.5,
        required: true,
        placeholder: '如 60',
        tip: '当前训练组使用的重量，单位为公斤',
        scientificRef: 'ACSM 建议阻力训练使用 60-85% 1RM 进行 8-12 次',
        cultivationLabel: '负重量'
      },
      {
        key: 'reps',
        label: '完成次数',
        unit: '次',
        type: 'number',
        step: 1,
        required: true,
        placeholder: '如 8',
        tip: '该重量下完成的重复次数（≤12 用于 1RM 估算）',
        scientificRef: 'Epley (1985), Brzycki (1993) — reps ≤12 时 1RM 估算最准确',
        cultivationLabel: '擎天次数'
      },
      {
        key: 'sets',
        label: '训练组数',
        unit: '组',
        type: 'number',
        step: 1,
        defaultValue: 3,
        required: false,
        placeholder: '如 3',
        tip: '完成的训练组数（不含热身组）',
        scientificRef: 'Schoenfeld et al. (2016) 荟萃分析：每周 10+ 组/肌群最优',
        cultivationLabel: '锤炼组数'
      },
      {
        key: 'rpe',
        label: 'RPE 自觉强度',
        unit: '',
        type: 'select',
        required: false,
        defaultValue: 8,
        options: [
          { value: 6, label: '6 — 轻松（热身强度）' },
          { value: 7, label: '7 — 中等偏易（3次余力）' },
          { value: 7.5, label: '7.5 — 中等（2-3次余力）' },
          { value: 8, label: '8 — 中等困难（2次余力）⭐推荐' },
          { value: 8.5, label: '8.5 — 困难（1-2次余力）' },
          { value: 9, label: '9 — 非常困难（1次余力）' },
          { value: 9.5, label: '9.5 — 接近极限' },
          { value: 10, label: '10 — 极限力竭' }
        ],
        tip: 'RPE (Rating of Perceived Exertion) — 主观费力程度，10 为极限',
        scientificRef: 'Zourdos et al. (2016) — RPE-RIR 映射：RPE 8 ≈ 2 次余力',
        cultivationLabel: '力竭程度'
      },
      {
        key: 'rest_interval',
        label: '组间休息',
        unit: '秒',
        type: 'number',
        step: 30,
        defaultValue: 120,
        required: false,
        placeholder: '如 120',
        tip: '组间休息时长（秒）',
        scientificRef: 'NSCA：力量训练 2-5min，增肌 30-90s，耐力 15-60s',
        cultivationLabel: '调息时间'
      }
    ],
    // 修行积分换算
    scoreFormula: {
      description: '基于 1RM/BW 比值评分 + 容量加成',
      primaryMetric: '1RM_ratio',    // 相对力量 = 1RM / 体重
      secondaryMetric: 'volume_load', // 训练容量 = 组 × 次 × 重量
      bonus: {
        rpe_optimal: { min: 7.5, max: 9, bonus: 1.2, reason: 'RPE 7.5-9 为力量训练最优强度区间' },
        rest_optimal: { min: 90, max: 300, bonus: 1.1, reason: '组间充分休息保证训练质量' }
      }
    },
    displayConfig: {
      // 在修为面板展示的核心指标
      primaryDisplay: {
        key: 'estimated_1rm',
        label: '估测极限',
        unit: 'kg',
        transform: 'estimate1RM(training_weight, reps).average',
        icon: '🏆'
      },
      secondaryDisplay: [
        { key: 'relative_strength', label: '相对力量', unit: '×BW', transform: 'estimated_1rm / bodyWeight', format: 'toFixed(2)' },
        { key: 'strength_level', label: '力量评级', unit: '', transform: 'calcStrengthLevel(bench_press, estimated_1rm, bodyWeight, gender).level' },
        { key: 'volume_load', label: '训练容量', unit: 'kg', transform: 'sets * reps * training_weight' }
      ]
    }
  },

  {
    id: 'squat',
    name: '深蹲',
    cultivationName: '镇岳印·深蹲',
    category: 'strength',
    categoryName: '力之根骨',
    icon: '🦵',
    color: '#f97316',
    desc: '杠铃深蹲淬炼下肢整体力量，夯实修行根基',
    metrics: [
      { key: 'training_weight', label: '训练重量', unit: 'kg', type: 'number', step: 2.5, required: true, placeholder: '如 80', tip: '深蹲训练组重量', cultivationLabel: '负重量' },
      { key: 'reps', label: '完成次数', unit: '次', type: 'number', step: 1, required: true, placeholder: '如 5', tip: '该重量下完成的次数（≤12）', cultivationLabel: '镇岳次数' },
      { key: 'sets', label: '训练组数', unit: '组', type: 'number', step: 1, defaultValue: 3, required: false, placeholder: '如 3', cultivationLabel: '锤炼组数' },
      { key: 'rpe', label: 'RPE 自觉强度', unit: '', type: 'select', required: false, defaultValue: 8, options: [ { value: 6, label: '6 — 轻松' }, { value: 7, label: '7 — 中等偏易' }, { value: 7.5, label: '7.5 — 中等' }, { value: 8, label: '8 — 中等困难 ⭐推荐' }, { value: 8.5, label: '8.5 — 困难' }, { value: 9, label: '9 — 非常困难' }, { value: 9.5, label: '9.5 — 接近极限' }, { value: 10, label: '10 — 极限力竭' } ], tip: '主观费力程度', cultivationLabel: '力竭程度' },
      { key: 'rest_interval', label: '组间休息', unit: '秒', type: 'number', step: 30, defaultValue: 180, required: false, placeholder: '如 180', tip: '深蹲建议 3-5 分钟', cultivationLabel: '调息时间' }
    ],
    scoreFormula: { description: '基于 1RM/BW 比值评分', primaryMetric: '1RM_ratio', secondaryMetric: 'volume_load', bonus: { rpe_optimal: { min: 7.5, max: 9, bonus: 1.2 }, rest_optimal: { min: 120, max: 300, bonus: 1.1 } } },
    displayConfig: {
      primaryDisplay: { key: 'estimated_1rm', label: '估测极限', unit: 'kg', transform: 'estimate1RM(training_weight, reps).average', icon: '🏆' },
      secondaryDisplay: [
        { key: 'relative_strength', label: '相对力量', unit: '×BW' },
        { key: 'strength_level', label: '力量评级', unit: '' },
        { key: 'volume_load', label: '训练容量', unit: 'kg' }
      ]
    }
  },

  {
    id: 'deadlift',
    name: '硬拉',
    cultivationName: '撼地印·硬拉',
    category: 'strength',
    categoryName: '力之根骨',
    icon: '🔗',
    color: '#a855f7',
    desc: '硬拉贯通全身后链，锤炼真元根基',
    metrics: [
      { key: 'training_weight', label: '训练重量', unit: 'kg', type: 'number', step: 2.5, required: true, placeholder: '如 100', cultivationLabel: '负重量' },
      { key: 'reps', label: '完成次数', unit: '次', type: 'number', step: 1, required: true, placeholder: '如 5', cultivationLabel: '撼地次数' },
      { key: 'sets', label: '训练组数', unit: '组', type: 'number', step: 1, defaultValue: 3, required: false, placeholder: '如 3', cultivationLabel: '锤炼组数' },
      { key: 'rpe', label: 'RPE 自觉强度', unit: '', type: 'select', required: false, defaultValue: 8, options: [ { value: 6, label: '6 — 轻松' }, { value: 7, label: '7 — 中等偏易' }, { value: 7.5, label: '7.5 — 中等' }, { value: 8, label: '8 — 中等困难 ⭐推荐' }, { value: 8.5, label: '8.5 — 困难' }, { value: 9, label: '9 — 非常困难' }, { value: 9.5, label: '9.5 — 接近极限' }, { value: 10, label: '10 — 极限力竭' } ], cultivationLabel: '力竭程度' },
      { key: 'rest_interval', label: '组间休息', unit: '秒', type: 'number', step: 30, defaultValue: 180, required: false, placeholder: '如 180', cultivationLabel: '调息时间' }
    ],
    scoreFormula: { description: '基于 1RM/BW 比值评分', primaryMetric: '1RM_ratio', secondaryMetric: 'volume_load', bonus: { rpe_optimal: { min: 7.5, max: 9, bonus: 1.2 }, rest_optimal: { min: 120, max: 300, bonus: 1.1 } } },
    displayConfig: {
      primaryDisplay: { key: 'estimated_1rm', label: '估测极限', unit: 'kg', transform: 'estimate1RM(training_weight, reps).average', icon: '🏆' },
      secondaryDisplay: [
        { key: 'relative_strength', label: '相对力量', unit: '×BW' },
        { key: 'strength_level', label: '力量评级', unit: '' },
        { key: 'volume_load', label: '训练容量', unit: 'kg' }
      ]
    }
  },

  {
    id: 'overhead_press',
    name: '肩推',
    cultivationName: '托天印·肩推',
    category: 'strength',
    categoryName: '力之根骨',
    icon: '🏋️',
    color: '#fb923c',
    desc: '杠铃肩推锤炼三角肌与核心稳定',
    metrics: [
      { key: 'training_weight', label: '训练重量', unit: 'kg', type: 'number', step: 2.5, required: true, placeholder: '如 40', cultivationLabel: '负重量' },
      { key: 'reps', label: '完成次数', unit: '次', type: 'number', step: 1, required: true, placeholder: '如 8', cultivationLabel: '托天次数' },
      { key: 'sets', label: '训练组数', unit: '组', type: 'number', step: 1, defaultValue: 3, required: false, cultivationLabel: '锤炼组数' },
      { key: 'rpe', label: 'RPE 自觉强度', unit: '', type: 'select', required: false, defaultValue: 8, options: [ { value: 6, label: '6 — 轻松' }, { value: 7, label: '7 — 中等偏易' }, { value: 7.5, label: '7.5 — 中等' }, { value: 8, label: '8 — 中等困难 ⭐推荐' }, { value: 8.5, label: '8.5 — 困难' }, { value: 9, label: '9 — 非常困难' }, { value: 9.5, label: '9.5 — 接近极限' }, { value: 10, label: '10 — 极限力竭' } ], cultivationLabel: '力竭程度' }
    ],
    scoreFormula: { description: '基于 1RM/BW 比值评分', primaryMetric: '1RM_ratio', secondaryMetric: 'volume_load' },
    displayConfig: {
      primaryDisplay: { key: 'estimated_1rm', label: '估测极限', unit: 'kg', transform: 'estimate1RM(training_weight, reps).average', icon: '🏆' },
      secondaryDisplay: [
        { key: 'relative_strength', label: '相对力量', unit: '×BW' },
        { key: 'volume_load', label: '训练容量', unit: 'kg' }
      ]
    }
  },

  {
    id: 'pullup',
    name: '引体向上',
    cultivationName: '飞升术·引体',
    category: 'strength',
    categoryName: '力之根骨',
    icon: '🔝',
    color: '#06b6d4',
    desc: '自重引体向上，衡量相对力量的上乘指标',
    metrics: [
      { key: 'max_reps', label: '最高连续次数', unit: '次', type: 'number', step: 1, required: true, placeholder: '如 12', tip: '不借力标准引体向上的最高连续次数', scientificRef: '美国海军陆战队体能标准：≥20次优秀，≥12次良好', cultivationLabel: '飞升次数' },
      { key: 'sets', label: '训练组数', unit: '组', type: 'number', step: 1, defaultValue: 3, required: false, cultivationLabel: '锤炼组数' },
      { key: 'added_weight', label: '额外负重', unit: 'kg', type: 'number', step: 2.5, defaultValue: 0, required: false, placeholder: '如 10（无负重填 0）', cultivationLabel: '负重' }
    ],
    scoreFormula: { description: '基于最高次数评级', primaryMetric: 'max_reps', secondaryMetric: 'added_weight' },
    displayConfig: {
      primaryDisplay: { key: 'max_reps', label: '最高引体', unit: '次', icon: '🔝' },
      secondaryDisplay: [
        { key: 'pullup_level', label: '引体评级', unit: '' },
        { key: 'total_volume', label: '总次数', unit: '次' }
      ]
    }
  }
]

// ============================================================
// 二、体之根骨（气修）
// ============================================================

var ENDURANCE_PRESETS = [
  {
    id: 'running_5k',
    name: '5公里跑',
    cultivationName: '疾风步·五里',
    category: 'endurance',
    categoryName: '体之根骨',
    icon: '🏃',
    color: '#22c55e',
    desc: '以 5km 路跑测试有氧耐力根基',
    metrics: [
      {
        key: 'time_minutes',
        label: '完赛时间',
        unit: '分钟',
        type: 'number',
        step: 0.5,
        required: true,
        placeholder: '如 25.5',
        tip: '5km 完赛时间，可输入小数（25.5 = 25分30秒）',
        scientificRef: 'Daniels & Gilbert (1979) VDOT 公式',
        cultivationLabel: '疾风时速'
      },
      {
        key: 'avg_hr',
        label: '平均心率',
        unit: 'bpm',
        type: 'number',
        step: 1,
        required: false,
        placeholder: '如 155',
        tip: '跑步全程平均心率',
        cultivationLabel: '心跳频率'
      },
      {
        key: 'cadence',
        label: '平均步频',
        unit: '步/分',
        type: 'number',
        step: 1,
        required: false,
        placeholder: '如 170',
        tip: '精英跑者步频约 180 spm',
        scientificRef: 'Daniels 观察精英跑者步频集中在 180±5 spm',
        cultivationLabel: '步伐频率'
      }
    ],
    scoreFormula: {
      description: '基于 VDOT 评分',
      primaryMetric: 'vdot',
      secondaryMetric: 'cadence',
      bonus: { cadence_elite: { min: 175, bonus: 1.15, reason: '高步频降低受伤风险' } }
    },
    displayConfig: {
      primaryDisplay: { key: 'vdot', label: 'VDOT 跑力', unit: '', transform: 'estimateVDOT(5000, time_minutes*60)', icon: '⚡' },
      secondaryDisplay: [
        { key: 'pace', label: '平均配速', unit: '/km', transform: 'vdotToPace(vdot).threshold' },
        { key: 'hr_zone', label: '心率区间', unit: '' },
        { key: 'cadence_level', label: '步频评级', unit: '', transform: 'evaluateCadence(cadence).level' }
      ]
    }
  },

  {
    id: 'running_10k',
    name: '10公里跑',
    cultivationName: '追云步·十里',
    category: 'endurance',
    categoryName: '体之根骨',
    icon: '🏃‍♂️',
    color: '#10b981',
    desc: '10km 路跑，中距离耐力试金石',
    metrics: [
      { key: 'time_minutes', label: '完赛时间', unit: '分钟', type: 'number', step: 0.5, required: true, placeholder: '如 55', cultivationLabel: '追云时速' },
      { key: 'avg_hr', label: '平均心率', unit: 'bpm', type: 'number', step: 1, required: false, cultivationLabel: '心跳频率' },
      { key: 'cadence', label: '平均步频', unit: '步/分', type: 'number', step: 1, required: false, cultivationLabel: '步伐频率' }
    ],
    scoreFormula: { description: '基于 VDOT 评分', primaryMetric: 'vdot', secondaryMetric: 'cadence' },
    displayConfig: {
      primaryDisplay: { key: 'vdot', label: 'VDOT 跑力', unit: '', icon: '⚡' },
      secondaryDisplay: [
        { key: 'pace', label: '平均配速', unit: '/km' },
        { key: 'cadence_level', label: '步频评级', unit: '' }
      ]
    }
  },

  {
    id: 'swim_100m',
    name: '100米游泳',
    cultivationName: '游龙术·百丈',
    category: 'endurance',
    categoryName: '体之根骨',
    icon: '🏊',
    color: '#3b82f6',
    desc: '百米自由泳速度测试',
    metrics: [
      { key: 'time_seconds', label: '完赛时间', unit: '秒', type: 'number', step: 1, required: true, placeholder: '如 75', tip: '100m 自由泳完成时间（秒）', cultivationLabel: '游龙时速' },
      { key: 'stroke_count', label: '单程划水数', unit: '次', type: 'number', step: 1, required: false, placeholder: '如 18', tip: '25m/50m 单程划水次数', cultivationLabel: '划水数' },
      { key: 'pool_length', label: '泳池长度', unit: '米', type: 'select', required: false, defaultValue: 25, options: [ { value: 25, label: '25m 短池' }, { value: 50, label: '50m 标准池' } ], cultivationLabel: '道场规格' }
    ],
    scoreFormula: { description: '基于 SWOLF 效率评分', primaryMetric: 'swolf', secondaryMetric: 'time_seconds' },
    displayConfig: {
      primaryDisplay: { key: 'swolf', label: 'SWOLF 效率', unit: '', icon: '🌊' },
      secondaryDisplay: [
        { key: 'swim_level', label: '游泳评级', unit: '' },
        { key: 'stroke_efficiency', label: '划水效率', unit: '' }
      ]
    }
  },

  {
    id: 'cycling_20km',
    name: '20公里骑行',
    cultivationName: '御风术·千里',
    category: 'endurance',
    categoryName: '体之根骨',
    icon: '🚴',
    color: '#eab308',
    desc: '20km 公路骑行耐力测试',
    metrics: [
      { key: 'time_minutes', label: '完赛时间', unit: '分钟', type: 'number', step: 0.5, required: true, placeholder: '如 40', tip: '20km 骑行完成时间', cultivationLabel: '御风时速' },
      { key: 'avg_speed', label: '平均速度', unit: 'km/h', type: 'number', step: 0.5, required: false, placeholder: '如 30', cultivationLabel: '均速' },
      { key: 'avg_hr', label: '平均心率', unit: 'bpm', type: 'number', step: 1, required: false, cultivationLabel: '心跳频率' }
    ],
    scoreFormula: { description: '基于平均速度评分', primaryMetric: 'avg_speed', secondaryMetric: 'time_minutes' },
    displayConfig: {
      primaryDisplay: { key: 'avg_speed', label: '骑行均速', unit: 'km/h', icon: '💨' },
      secondaryDisplay: [
        { key: 'cycling_level', label: '骑行评级', unit: '' },
        { key: 'total_distance', label: '骑程', unit: 'km' }
      ]
    }
  }
]

// ============================================================
// 三、敏之根骨（技修）
// ============================================================

var SKILL_PRESETS = [
  {
    id: 'flexibility_sit_reach',
    name: '坐位体前屈',
    cultivationName: '柔身术·体前屈',
    category: 'skill',
    categoryName: '敏之根骨',
    icon: '🧘',
    color: '#8b5cf6',
    desc: '坐位体前屈测试后链柔韧性，ACSM 金标准',
    metrics: [
      { key: 'reach_cm', label: '前伸距离', unit: '厘米', type: 'number', step: 1, required: true, placeholder: '如 30', tip: '指尖超过脚尖为正数，未到为负数', scientificRef: 'ACSM 坐位体前屈百分位标准按年龄/性别分层', cultivationLabel: '前屈距离' },
      { key: 'hold_time', label: '保持时间', unit: '秒', type: 'number', step: 1, defaultValue: 10, required: false, placeholder: '如 15', tip: 'ACSM 建议拉伸保持 10-30 秒', cultivationLabel: '柔身时长' }
    ],
    scoreFormula: { description: '基于 ACSM 百分位评级', primaryMetric: 'reach_cm', secondaryMetric: 'hold_time' },
    displayConfig: {
      primaryDisplay: { key: 'flex_level', label: '柔韧评级', unit: '', transform: 'evaluateSitAndReach(reach_cm, gender, age).level', icon: '🧘' },
      secondaryDisplay: [
        { key: 'flex_percentile', label: '超越', unit: '%人群', transform: 'evaluateSitAndReach(reach_cm, gender, age).percentile' }
      ]
    }
  },

  {
    id: 'yoga_session',
    name: '瑜伽练习',
    cultivationName: '瑜伽·天人合一',
    category: 'skill',
    categoryName: '敏之根骨',
    icon: '🧘‍♀️',
    color: '#a78bfa',
    desc: '完整瑜伽练习记录，量化身心调和',
    metrics: [
      { key: 'duration_minutes', label: '练习时长', unit: '分钟', type: 'number', step: 5, required: true, placeholder: '如 60', cultivationLabel: '合道时长' },
      { key: 'intensity', label: '练习强度', unit: '', type: 'select', required: true, defaultValue: 'moderate', options: [ { value: 'gentle', label: '阴瑜伽/修复' }, { value: 'moderate', label: '哈他/流瑜伽' }, { value: 'intense', label: '力量瑜伽/阿斯汤加' } ], cultivationLabel: '瑜伽流派' },
      { key: 'focus_area', label: '侧重部位', unit: '', type: 'text', required: false, placeholder: '如 髋部/脊柱/全身', cultivationLabel: '修炼重点' }
    ],
    scoreFormula: { description: '基于时长与强度评分', primaryMetric: 'duration_minutes', secondaryMetric: 'intensity' },
    displayConfig: {
      primaryDisplay: { key: 'duration_minutes', label: '瑜伽时长', unit: '分钟', icon: '🧘‍♀️' },
      secondaryDisplay: [
        { key: 'yoga_intensity', label: '强度等级', unit: '' }
      ]
    }
  },

  {
    id: 'agility_ladder',
    name: '敏捷梯训练',
    cultivationName: '灵敏·灵猫步',
    category: 'skill',
    categoryName: '敏之根骨',
    icon: '🪜',
    color: '#8b5cf6',
    desc: '敏捷梯训练提升步法灵敏性与协调性',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'double_under',
    name: '跳绳双摇',
    cultivationName: '灵敏·双摇术',
    category: 'skill',
    categoryName: '敏之根骨',
    icon: '🪢',
    color: '#8b5cf6',
    desc: '双摇跳绳训练爆发力与节奏感',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'burpee_training',
    name: '波比跳训练',
    cultivationName: '灵敏·暴烈波比',
    category: 'skill',
    categoryName: '敏之根骨',
    icon: '🔥',
    color: '#8b5cf6',
    desc: '波比跳综合训练全身爆发耐力',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'pilates',
    name: '普拉提',
    cultivationName: '灵敏·柔体术',
    category: 'skill',
    categoryName: '敏之根骨',
    icon: '🤸',
    color: '#8b5cf6',
    desc: '普拉提训练核心力量与身体控制',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'parkour_basic',
    name: '跑酷基础',
    cultivationName: '灵敏·攀云术',
    category: 'skill',
    categoryName: '敏之根骨',
    icon: '🧗',
    color: '#8b5cf6',
    desc: '跑酷基础动作训练身体穿越障碍能力',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'balance_training',
    name: '平衡训练',
    cultivationName: '灵敏·定身诀',
    category: 'skill',
    categoryName: '敏之根骨',
    icon: '⚖️',
    color: '#8b5cf6',
    desc: '平衡训练增强本体感觉与稳定性',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  }
]

// ============================================================
// 四、神之根骨（神修）
// ============================================================

var MIND_PRESETS = [
  {
    id: 'meditation',
    name: '冥想打坐',
    cultivationName: '静心诀·入定',
    category: 'mind',
    categoryName: '神之根骨',
    icon: '🧠',
    color: '#ec4899',
    desc: '冥想静坐锤炼精神力与专注力',
    metrics: [
      {
        key: 'duration_minutes',
        label: '入定时长',
        unit: '分钟',
        type: 'number',
        step: 5,
        required: true,
        placeholder: '如 20',
        tip: '单次冥想时长（分钟），建议≥10分钟起步',
        scientificRef: 'Lazar et al. (2011)：每日 27 分钟、8 周即可观察到脑皮质变化',
        cultivationLabel: '入定时间'
      },
      {
        key: 'session_count_today',
        label: '今日次数',
        unit: '次',
        type: 'number',
        step: 1,
        defaultValue: 1,
        required: false,
        cultivationLabel: '修炼次数'
      },
      {
        key: 'focus_quality',
        label: '专注品质',
        unit: '',
        type: 'select',
        required: false,
        defaultValue: 'moderate',
        options: [
          { value: 'distracted', label: '散乱 — 念头纷飞' },
          { value: 'moderate', label: '守一 — 偶有杂念' },
          { value: 'focused', label: '入定 — 心无旁骛' },
          { value: 'deep', label: '禅定 — 身心两忘' }
        ],
        tip: '对本次冥想专注程度的主观评价',
        cultivationLabel: '入定境界'
      }
    ],
    scoreFormula: { description: '基于时长与专注品质评分', primaryMetric: 'duration_minutes', secondaryMetric: 'focus_quality' },
    displayConfig: {
      primaryDisplay: { key: 'duration_minutes', label: '冥想时长', unit: '分', icon: '🧠' },
      secondaryDisplay: [
        { key: 'focus_level', label: '专注境', unit: '' },
        { key: 'brain_change_estimate', label: '脑变化', unit: '', transform: 'evaluateMeditationPractice(totalSessions, totalMinutes, streakDays).brainChangesEstimate' }
      ]
    }
  },

  {
    id: 'breath_meditation',
    name: '呼吸冥想',
    cultivationName: '神修·观息诀',
    category: 'mind',
    categoryName: '神之根骨',
    icon: '🌬️',
    color: '#ec4899',
    desc: '观呼吸冥想培养专注觉察力',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'mindfulness',
    name: '正念冥想',
    cultivationName: '神修·明心诀',
    category: 'mind',
    categoryName: '神之根骨',
    icon: '🧘',
    color: '#ec4899',
    desc: '正念冥想训练当下觉知能力',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'standing_meditation',
    name: '站桩',
    cultivationName: '神修·定海针',
    category: 'mind',
    categoryName: '神之根骨',
    icon: '🧍',
    color: '#ec4899',
    desc: '站桩静功修炼身心合一',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'mindful_walking',
    name: '正念行走',
    cultivationName: '神修·步步莲',
    category: 'mind',
    categoryName: '神之根骨',
    icon: '🚶',
    color: '#ec4899',
    desc: '行走冥想将正念融入日常步履',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'night_calm',
    name: '睡前静心',
    cultivationName: '神修·安神诀',
    category: 'mind',
    categoryName: '神之根骨',
    icon: '🌙',
    color: '#ec4899',
    desc: '睡前静心仪式助眠安神',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'emotion_awareness',
    name: '情绪觉察',
    cultivationName: '神修·照心镜',
    category: 'mind',
    categoryName: '神之根骨',
    icon: '🪞',
    color: '#ec4899',
    desc: '情绪觉察练习洞察内心波澜',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  }
]

// ============================================================
// 五、智之根骨（文修）
// ============================================================

var STUDY_PRESETS = [
  {
    id: 'vocabulary_english',
    name: '英语背单词',
    cultivationName: '天书阁·词汇',
    category: 'study',
    categoryName: '智之根骨',
    icon: '📖',
    color: '#6366f1',
    desc: '量化英语词汇积累与记忆效果',
    metrics: [
      {
        key: 'new_words_today',
        label: '今日新词',
        unit: '个',
        type: 'number',
        step: 5,
        required: true,
        placeholder: '如 20',
        tip: '今日新学的单词数量',
        scientificRef: 'Ebbinghaus (1885)：每日 10-20 新词为最优记忆负荷',
        cultivationLabel: '拓词数'
      },
      {
        key: 'review_words_today',
        label: '今日复习',
        unit: '个',
        type: 'number',
        step: 5,
        required: false,
        placeholder: '如 50',
        tip: '今日复习的旧单词数量',
        scientificRef: '间隔重复 (Spaced Repetition)：1-3-7-14-30 天复习间隔最优',
        cultivationLabel: '温故数'
      },
      {
        key: 'total_vocabulary',
        label: '总词汇量',
        unit: '个',
        type: 'number',
        step: 100,
        required: false,
        placeholder: '如 3500',
        tip: '当前掌握的英语词汇总量（估测）',
        scientificRef: 'CEFR：A1≈500, A2≈1500, B1≈2500, B2≈3750, C1≈6250, C2≈12000',
        cultivationLabel: '词库总量'
      },
      {
        key: 'study_duration',
        label: '学习时长',
        unit: '分钟',
        type: 'number',
        step: 5,
        required: false,
        placeholder: '如 45',
        tip: '今日背单词总用时',
        cultivationLabel: '学时'
      },
      {
        key: 'method',
        label: '学习方式',
        unit: '',
        type: 'select',
        required: false,
        defaultValue: 'app',
        options: [
          { value: 'app', label: 'App（Anki/墨墨等）' },
          { value: 'book', label: '纸质书/词表' },
          { value: 'reading', label: '阅读中学习' },
          { value: 'listening', label: '听力中学习' }
        ],
        tip: '主动回忆 (active recall) 效果显著优于被动阅读',
        scientificRef: 'Roediger & Karpicke (2006)：测试效应 — 主动回忆比重复阅读提升 50% 长期保留',
        cultivationLabel: '修炼法门'
      }
    ],
    scoreFormula: {
      description: '基于新词数 + CEFR 等级 + 学习方式修正',
      primaryMetric: 'new_words_today',
      secondaryMetric: 'total_vocabulary',
      bonus: {
        active_recall: { condition: 'method === "app"', bonus: 1.3, reason: '主动回忆效果优于被动学习 50%（Roediger 2006）' },
        optimal_load: { condition: 'new_words_today >= 10 && new_words_today <= 20', bonus: 1.15, reason: '每日 10-20 新词为最优记忆负荷' },
        review_ratio: { condition: 'review_words_today >= new_words_today * 1.5', bonus: 1.2, reason: '复习量≥新词量 1.5 倍，间隔重复策略执行良好' }
      }
    },
    displayConfig: {
      primaryDisplay: { key: 'new_words_today', label: '今日新词', unit: '个', icon: '📖' },
      secondaryDisplay: [
        { key: 'cefr_level', label: 'CEFR 等级', unit: '', transform: 'estimateCEFRLevel(total_vocabulary).level' },
        { key: 'word_load_eval', label: '学习负荷', unit: '', transform: 'evaluateDailyWordLoad(new_words_today).label' },
        { key: 'retention_rate', label: '短期保留', unit: '', transform: 'evaluateDailyWordLoad(new_words_today).retentionEstimate' }
      ]
    }
  },

  {
    id: 'reading_pages',
    name: '深度阅读',
    cultivationName: '藏经阁·阅典',
    category: 'study',
    categoryName: '智之根骨',
    icon: '📚',
    color: '#818cf8',
    desc: '量化阅读积累，以页数为主要量化单位',
    metrics: [
      { key: 'pages_read', label: '阅读页数', unit: '页', type: 'number', step: 10, required: true, placeholder: '如 50', tip: '今日阅读页数（以书籍类阅读为主）', cultivationLabel: '阅页数' },
      { key: 'duration_minutes', label: '阅读时长', unit: '分钟', type: 'number', step: 5, required: false, placeholder: '如 60', cultivationLabel: '阅读时长' },
      { key: 'book_type', label: '书籍类型', unit: '', type: 'select', required: false, defaultValue: 'general', options: [ { value: 'academic', label: '学术/教材' }, { value: 'general', label: '通识/非虚构' }, { value: 'fiction', label: '文学/小说' }, { value: 'technical', label: '技术/工具书' } ], cultivationLabel: '典籍类型' }
    ],
    scoreFormula: { description: '基于页数和书籍类型评分', primaryMetric: 'pages_read', secondaryMetric: 'duration_minutes' },
    displayConfig: {
      primaryDisplay: { key: 'pages_read', label: '今日阅读', unit: '页', icon: '📚' },
      secondaryDisplay: [
        { key: 'reading_speed', label: '阅读速度', unit: '页/时' },
        { key: 'book_type', label: '典籍类型', unit: '' }
      ]
    }
  },

  {
    id: 'coding_hours',
    name: '编程/创作',
    cultivationName: '炼器阁·编程',
    category: 'study',
    categoryName: '智之根骨',
    icon: '💻',
    color: '#14b8a6',
    desc: '量化编程或创作工作的专注产出',
    metrics: [
      { key: 'focus_minutes', label: '专注时长', unit: '分钟', type: 'number', step: 15, required: true, placeholder: '如 120', tip: '净专注时间（不含休息/分心）', scientificRef: 'Cal Newport (2016)：每日 4 小时深度工作为认知上限', cultivationLabel: '专注时长' },
      { key: 'pomodoro_count', label: '番茄钟数', unit: '个', type: 'number', step: 1, required: false, placeholder: '如 4', tip: '完成的番茄钟个数（25分钟/个）', cultivationLabel: '番茄钟' },
      { key: 'output_lines', label: '产出代码行', unit: '行', type: 'number', step: 50, required: false, placeholder: '如 200', tip: '今日新增/修改的代码行数', cultivationLabel: '代码行' }
    ],
    scoreFormula: { description: '基于专注时长与番茄钟评分', primaryMetric: 'focus_minutes', secondaryMetric: 'pomodoro_count' },
    displayConfig: {
      primaryDisplay: { key: 'focus_minutes', label: '专注时间', unit: '分', icon: '💻' },
      secondaryDisplay: [
        { key: 'pomodoro_count', label: '番茄数', unit: '个' },
        { key: 'output_lines', label: '代码行', unit: '行' }
      ]
    }
  },

  {
    id: 'exam_prep',
    name: '考证备考',
    cultivationName: '智修·破卷诀',
    category: 'study',
    categoryName: '智之根骨',
    icon: '📝',
    color: '#6366f1',
    desc: '系统备考认证考试，以考促学',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'writing_practice',
    name: '写作练习',
    cultivationName: '智修·著书诀',
    category: 'study',
    categoryName: '智之根骨',
    icon: '✍️',
    color: '#6366f1',
    desc: '持续写作锤炼表达与思维',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'design_creation',
    name: '设计创作',
    cultivationName: '智修·造化诀',
    category: 'study',
    categoryName: '智之根骨',
    icon: '🎨',
    color: '#6366f1',
    desc: '设计创作训练审美与创造力',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'industry_research',
    name: '行业调研',
    cultivationName: '智修·探微诀',
    category: 'study',
    categoryName: '智之根骨',
    icon: '🔍',
    color: '#6366f1',
    desc: '行业调研深入洞察市场趋势',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'general_reading',
    name: '通识阅读',
    cultivationName: '智修·博览诀',
    category: 'study',
    categoryName: '智之根骨',
    icon: '📰',
    color: '#6366f1',
    desc: '广泛阅读拓宽认知边界',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'knowledge_organize',
    name: '知识梳理',
    cultivationName: '智修·汇通诀',
    category: 'study',
    categoryName: '智之根骨',
    icon: '🗂️',
    color: '#6366f1',
    desc: '知识整理归纳，构建认知体系',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  }
]

// ============================================================
// 六、行之根骨（日常）
// ============================================================

var DAILY_PRESETS = [
  {
    id: 'sleep_quality',
    name: '睡眠质量',
    cultivationName: '养神诀·安寝',
    category: 'daily',
    categoryName: '行之根骨',
    icon: '😴',
    color: '#475569',
    desc: '量化睡眠时长与质量，修炼恢复之基',
    metrics: [
      { key: 'sleep_hours', label: '睡眠时长', unit: '小时', type: 'number', step: 0.5, required: true, placeholder: '如 7.5', tip: '夜间总睡眠时长（小时）', scientificRef: 'CDC/NSF：成人 7-9 小时为最佳睡眠时长', cultivationLabel: '安寝时长' },
      { key: 'deep_sleep_hours', label: '深睡时长', unit: '小时', type: 'number', step: 0.1, required: false, placeholder: '如 2.0', tip: '深睡眠阶段时长，约占总睡眠 20-25%', cultivationLabel: '深层安寝' },
      { key: 'sleep_quality', label: '主观质量', unit: '', type: 'select', required: false, defaultValue: 'good', options: [ { value: 'poor', label: '差 — 入睡困难/多梦' }, { value: 'ok', label: '一般' }, { value: 'good', label: '良好' }, { value: 'excellent', label: '优秀 — 一夜好眠' } ], cultivationLabel: '安寝品质' },
      { key: 'bed_time', label: '入睡时间', unit: '', type: 'text', required: false, placeholder: '如 23:00', tip: '规律作息对昼夜节律至关重要', cultivationLabel: '入定时刻' }
    ],
    scoreFormula: { description: '基于睡眠时长与质量评分', primaryMetric: 'sleep_hours', secondaryMetric: 'sleep_quality', bonus: { optimal: { condition: 'sleep_hours >= 7 && sleep_hours <= 9', bonus: 1.2, reason: '7-9h 为最优睡眠时长（CDC/NSF）' }, deep_good: { condition: 'deep_sleep_hours >= 1.5', bonus: 1.15, reason: '充足深睡眠促进恢复' } } },
    displayConfig: {
      primaryDisplay: { key: 'sleep_hours', label: '睡眠时长', unit: '时', icon: '😴' },
      secondaryDisplay: [
        { key: 'deep_sleep_hours', label: '深睡', unit: '时' },
        { key: 'sleep_quality', label: '质量', unit: '' }
      ]
    }
  },

  {
    id: 'cold_shower',
    name: '冷水浴',
    cultivationName: '冰心诀·寒浴',
    category: 'daily',
    categoryName: '行之根骨',
    icon: '❄️',
    color: '#06b6d4',
    desc: '冷水浸泡/淋浴，锤炼意志与代谢',
    metrics: [
      { key: 'duration_minutes', label: '冷水时长', unit: '分钟', type: 'number', step: 1, required: true, placeholder: '如 3', tip: '冷水浸泡/淋浴总时长', cultivationLabel: '寒浴时长' },
      { key: 'water_temp', label: '水温', unit: '°C', type: 'number', step: 1, required: false, placeholder: '如 10', tip: '水温（摄氏）', cultivationLabel: '寒泉温度' },
      { key: 'method', label: '方式', unit: '', type: 'select', required: false, defaultValue: 'shower', options: [ { value: 'shower', label: '冷水淋浴' }, { value: 'bath', label: '冰水浸泡' }, { value: 'outdoor', label: '户外冬泳' } ], cultivationLabel: '修炼法门' }
    ],
    scoreFormula: { description: '基于时长与水温评分', primaryMetric: 'duration_minutes', secondaryMetric: 'water_temp' },
    displayConfig: {
      primaryDisplay: { key: 'duration_minutes', label: '寒浴时长', unit: '分', icon: '❄️' },
      secondaryDisplay: [
        { key: 'water_temp', label: '水温', unit: '°C' },
        { key: 'method', label: '方式', unit: '' }
      ]
    }
  },

  {
    id: 'balanced_meal',
    name: '均衡餐食',
    cultivationName: '行修·食气诀',
    category: 'daily',
    categoryName: '行之根骨',
    icon: '🥗',
    color: '#64748b',
    desc: '均衡膳食搭配，滋养修行之体',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'calorie_control',
    name: '控制热量',
    cultivationName: '行修·节欲诀',
    category: 'daily',
    categoryName: '行之根骨',
    icon: '⚖️',
    color: '#64748b',
    desc: '热量管理维持修行体态',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'regular_meals',
    name: '规律三餐',
    cultivationName: '行修·定时诀',
    category: 'daily',
    categoryName: '行之根骨',
    icon: '🍽️',
    color: '#64748b',
    desc: '定时进食养护脾胃，规律作息',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'daily_walk',
    name: '每日散步',
    cultivationName: '行修·缓步诀',
    category: 'daily',
    categoryName: '行之根骨',
    icon: '🚶',
    color: '#64748b',
    desc: '每日散步活动筋骨，舒缓身心',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'weekly_review',
    name: '定期复盘',
    cultivationName: '行修·观心诀',
    category: 'daily',
    categoryName: '行之根骨',
    icon: '📋',
    color: '#64748b',
    desc: '定期回顾总结，修行日益精进',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  },

  {
    id: 'hydration',
    name: '多喝水',
    cultivationName: '行修·润体诀',
    category: 'daily',
    categoryName: '行之根骨',
    icon: '💧',
    color: '#64748b',
    desc: '充足饮水滋养百脉，维持代谢',
    metrics: [
      { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
    ],
    scoreFormula: 'minuteBased'
  }
]

// ============================================================
// 汇总导出
// ============================================================

var ALL_PRESETS = [].concat(
  STRENGTH_PRESETS,
  ENDURANCE_PRESETS,
  SKILL_PRESETS,
  MIND_PRESETS,
  STUDY_PRESETS,
  DAILY_PRESETS
)

var CATEGORIES = [
  { id: 'strength', name: '力之根骨', icon: '💪', color: '#ef4444', desc: '抗阻力量训练，主司力量爆发' },
  { id: 'endurance', name: '体之根骨', icon: '⚡', color: '#22c55e', desc: '有氧心肺训练，主司体质耐力' },
  { id: 'skill', name: '敏之根骨', icon: '🧘', color: '#8b5cf6', desc: '灵敏爆发协调，主司身法灵动' },
  { id: 'mind', name: '神之根骨', icon: '🧠', color: '#ec4899', desc: '冥想专注修行，主司心神定力' },
  { id: 'study', name: '智之根骨', icon: '📖', color: '#6366f1', desc: '学习工作成长，主司智识学识' },
  { id: 'daily', name: '行之根骨', icon: '🌅', color: '#64748b', desc: '日常习惯养成，主司日常修行' }
]

/**
 * 按大类获取预设列表（仅修行预设，不含运动库合并）
 */
function getPresetsByCategory(categoryId) {
  if (!categoryId) return ALL_PRESETS
  return ALL_PRESETS.filter(function(p) { return p.category === categoryId })
}

// ============================================================
// 运动知识库 → 修行预设 合并桥接
// ============================================================

/**
 * 根骨品类对应的图标/颜色/修行称谓前缀
 */
var BONE_META = {
  strength: { icon: '💪', color: '#ef4444', prefix: '体修', categoryName: '力之根骨' },
  endurance: { icon: '⚡', color: '#22c55e', prefix: '气修', categoryName: '体之根骨' },
  mind: { icon: '🧠', color: '#ec4899', prefix: '神修', categoryName: '神之根骨' }
}

/**
 * 将一个运动动作转换为通用修行预设对象
 * @param {object} movement - { id, name, aliases, trainingPath, groupName, met, needWeight, boneCategory }
 * @returns {object} 轻量级 preset
 */
function movementToPreset(movement) {
  var meta = BONE_META[movement.boneCategory] || BONE_META.endurance
  var isStrength = movement.boneCategory === 'strength'
  return {
    id: movement.id,
    name: movement.name,
    cultivationName: meta.prefix + '·' + movement.name,
    category: movement.boneCategory,
    categoryName: meta.categoryName,
    icon: meta.icon,
    color: meta.color,
    desc: (movement.groupName || '') + ' · MET ' + movement.met,
    // 通用指标：炼体类用时长+强度，其他用时长
    metrics: isStrength
      ? [
          { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' },
          { key: 'training_weight', label: '训练重量', unit: 'kg', type: 'number', step: 2.5, required: false, placeholder: '如 60', cultivationLabel: '负重量' },
          { key: 'reps', label: '完成次数', unit: '次', type: 'number', step: 1, required: false, placeholder: '如 10', cultivationLabel: '修炼次数' },
          { key: 'sets', label: '训练组数', unit: '组', type: 'number', step: 1, required: false, placeholder: '如 3', cultivationLabel: '锤炼组数' }
        ]
      : [
          { key: 'duration', label: '修行时长', cultivationLabel: '修行时长', type: 'number', unit: '分钟', required: true, defaultValue: '0' }
        ],
    scoreFormula: 'minuteBased',
    displayConfig: {
      primaryDisplay: { key: 'duration', label: '修行时长', unit: '分钟', icon: meta.icon },
      secondaryDisplay: [
        { key: 'met', label: 'MET值', unit: '' }
      ]
    },
    // 标记来源（新增字段，不参与存储）
    _source: 'sport'
  }
}

/**
 * 按根骨品类获取全量修行项目（预设 + 运动库合并）
 * 用于「添加活动」弹窗展示
 * @param {string} categoryId - 'strength'|'endurance'|'mind'|'skill'|'study'|'daily'
 */
function getAllPresetsForBoneCategory(categoryId) {
  // 修行预设库中的项目
  var existingPresets = ALL_PRESETS.filter(function(p) { return p.category === categoryId })
  var existingIds = {}
  existingPresets.forEach(function(p) { existingIds[p.id] = true })

  // 运动知识库中的项目（仅 strength/endurance/mind 有数据）
  if (BONE_META[categoryId]) {
    var sportMovs = sportMovements.getAllMovementsByBone(categoryId)
    sportMovs.forEach(function(m) {
      // 去重：已存在于修行预设库中的不重复添加
      if (!existingIds[m.id]) {
        existingPresets.push(movementToPreset(m))
        existingIds[m.id] = true
      }
    })
  }

  return existingPresets
}

/**
 * 根据 id 获取单个预设
 */
function getPresetById(presetId) {
  return ALL_PRESETS.find(function(p) { return p.id === presetId }) || null
}

/**
 * 获取预设中所有可选 RPE 选项（统一列表）
 */
function getRPEOptions() {
  return [
    { value: 6, label: '6 — 轻松（热身强度）' },
    { value: 7, label: '7 — 中等偏易（3次余力）' },
    { value: 7.5, label: '7.5 — 中等（2-3次余力）' },
    { value: 8, label: '8 — 中等困难（2次余力）⭐推荐' },
    { value: 8.5, label: '8.5 — 困难（1-2次余力）' },
    { value: 9, label: '9 — 非常困难（1次余力）' },
    { value: 9.5, label: '9.5 — 接近极限' },
    { value: 10, label: '10 — 极限力竭' }
  ]
}

/**
 * 获取所有预设的名称映射（给记录页下拉选择用）
 */
function getPresetNameMap() {
  var map = {}
  ALL_PRESETS.forEach(function(p) {
    map[p.id] = { name: p.name, cultivationName: p.cultivationName, icon: p.icon, color: p.color, category: p.categoryName }
  })
  return map
}

/**
 * 计算预设训练项目的修行积分
 * @param {string} presetId
 * @param {object} metrics - { training_weight, reps, sets, ... } 用户输入的指标值
 * @param {object} bodyProfile - { weight, gender, age, ... }
 * @returns {object} { score, breakdown, metricsComputed }
 */
function calcPresetScore(presetId, metrics, bodyProfile) {
  var preset = getPresetById(presetId)
  if (!preset) return { score: 0, breakdown: [], metricsComputed: {}, message: '未知修行项目' }

  var bp = bodyProfile || {}
  var bodyWeight = Number(bp.weight || 70)
  var gender = bp.gender || 'male'
  var age = Number(bp.age || 25)

  var computed = {}
  var breakdown = []
  var baseScore = 0
  var bonusMultiplier = 1.0

  switch (presetId) {

    // ===== 力量项目 =====
    case 'bench_press':
    case 'squat':
    case 'deadlift':
    case 'overhead_press': {
      var w = Number(metrics.training_weight || 0)
      var r = Number(metrics.reps || 0)
      var s = Number(metrics.sets || 1)
      var rpe = Number(metrics.rpe || 0)
      var rest = Number(metrics.rest_interval || 0)
      // 1RM 估算
      if (w > 0 && r > 0) {
        var epley = w * (1 + r / 30)
        var brzycki = r < 37 ? w * 36 / (37 - r) : epley
        var lombardi = w * Math.pow(Math.min(r, 12), 0.10)
        computed.estimated_1rm = Math.round((epley + brzycki + lombardi) / 3 * 10) / 10
      } else {
        computed.estimated_1rm = 0
      }
      computed.volume_load = w * r * s
      computed.relative_strength = computed.estimated_1rm > 0 ? Math.round(computed.estimated_1rm / bodyWeight * 100) / 100 : 0

      // 评分：按相对力量等级
      var exerciseKey = presetId === 'bench_press' ? 'bench_press' : presetId === 'squat' ? 'squat' : presetId === 'deadlift' ? 'deadlift' : 'bench_press'
      var ratio = computed.relative_strength
      var levelMap = presetId === 'bench_press' || presetId === 'overhead_press'
        ? (gender === 'female'
          ? [{ max: 0.4, score: 1 }, { max: 0.6, score: 3 }, { max: 0.75, score: 6 }, { max: 1.0, score: 10 }, { max: 99, score: 16 }]
          : [{ max: 0.75, score: 1 }, { max: 1.0, score: 3 }, { max: 1.25, score: 6 }, { max: 1.5, score: 10 }, { max: 99, score: 16 }])
        : presetId === 'squat'
          ? (gender === 'female'
            ? [{ max: 0.75, score: 1 }, { max: 1.0, score: 3 }, { max: 1.25, score: 6 }, { max: 1.75, score: 10 }, { max: 99, score: 16 }]
            : [{ max: 1.0, score: 1 }, { max: 1.25, score: 3 }, { max: 1.75, score: 6 }, { max: 2.25, score: 10 }, { max: 99, score: 16 }])
          : (gender === 'female'
            ? [{ max: 1.0, score: 1 }, { max: 1.25, score: 3 }, { max: 1.5, score: 6 }, { max: 2.0, score: 10 }, { max: 99, score: 16 }]
            : [{ max: 1.25, score: 1 }, { max: 1.5, score: 3 }, { max: 2.0, score: 6 }, { max: 2.5, score: 10 }, { max: 99, score: 16 }])

      for (var li = 0; li < levelMap.length; li++) {
        if (ratio < levelMap[li].max) { baseScore = levelMap[li].score; break }
      }
      if (baseScore === 0) baseScore = 16

      breakdown.push({ label: '相对力量', detail: ratio + '×BW', contribution: '+' + baseScore })
      if (computed.volume_load > 0) {
        var volBonus = Math.min(3, Math.floor(computed.volume_load / 2000))
        baseScore += volBonus
        breakdown.push({ label: '训练容量', detail: computed.volume_load + 'kg', contribution: '+' + volBonus })
      }
      // RPE 加成
      if (rpe >= 7.5 && rpe <= 9) {
        bonusMultiplier += 0.2
        breakdown.push({ label: 'RPE 最优区间', detail: 'RPE ' + rpe, contribution: '×1.2' })
      }
      // 组间休息加成
      if (rest >= 90 && rest <= 300) {
        bonusMultiplier += 0.1
        breakdown.push({ label: '充分组间休息', detail: rest + '秒', contribution: '×1.1' })
      }
      computed.strength_level = ratio
      break
    }

    // ===== 引体向上 =====
    case 'pullup': {
      var maxReps = Number(metrics.max_reps || 0)
      var sets = Number(metrics.sets || 1)
      var added = Number(metrics.added_weight || 0)
      computed.total_volume = maxReps * sets
      baseScore = maxReps >= 20 ? 14 : maxReps >= 15 ? 10 : maxReps >= 10 ? 6 : maxReps >= 5 ? 3 : 1
      if (added > 0) { baseScore = Math.min(16, baseScore + Math.floor(added / 10)) }
      computed.pullup_level = maxReps >= 20 ? '卓越' : maxReps >= 15 ? '优秀' : maxReps >= 10 ? '良好' : maxReps >= 5 ? '一般' : '入门'
      breakdown.push({ label: '最高引体', detail: maxReps + '次', contribution: '+' + baseScore })
      if (added > 0) breakdown.push({ label: '额外负重', detail: '+' + added + 'kg', contribution: '负重加成' })
      break
    }

    // ===== 跑步项目 =====
    case 'running_5k':
    case 'running_10k': {
      var timeMin = Number(metrics.time_minutes || 0)
      var cadence = Number(metrics.cadence || 0)
      var distance = presetId === 'running_5k' ? 5000 : 10000
      var vdot = 0
      if (timeMin > 0) {
        var velocity = distance / (timeMin * 60) * 60
        vdot = Math.round((-4.60 + 0.182258 * velocity + 0.000104 * velocity * velocity) * 10) / 10
      }
      computed.vdot = vdot
      computed.pace = timeMin > 0 ? formatPaceMinutes(timeMin / (distance / 1000)) : '--'
      computed.cadence_level = cadence >= 180 ? '精英' : cadence >= 170 ? '良好' : cadence >= 160 ? '一般' : '偏低'
      baseScore = vdot >= 55 ? 16 : vdot >= 45 ? 10 : vdot >= 35 ? 6 : vdot >= 28 ? 3 : 1
      breakdown.push({ label: 'VDOT 跑力', detail: String(vdot), contribution: '+' + baseScore })
      if (cadence >= 175) { bonusMultiplier += 0.15; breakdown.push({ label: '精英步频', detail: cadence + 'spm', contribution: '×1.15' }) }
      break
    }

    // ===== 游泳 =====
    case 'swim_100m': {
      var timeSec = Number(metrics.time_seconds || 0)
      var strokes = Number(metrics.stroke_count || 0)
      var poolLen = Number(metrics.pool_length || 25)
      computed.swolf = strokes > 0 ? Math.round(timeSec + strokes / (poolLen / 25)) : timeSec
      computed.swim_level = timeSec <= 75 ? '精英' : timeSec <= 105 ? '高级' : timeSec <= 135 ? '中级' : timeSec <= 180 ? '入门' : '初学'
      computed.stroke_efficiency = strokes > 0 ? Math.round(timeSec / (poolLen / 25) / strokes * 10) / 10 : 0
      baseScore = timeSec <= 75 ? 16 : timeSec <= 105 ? 10 : timeSec <= 135 ? 6 : timeSec <= 180 ? 3 : 1
      breakdown.push({ label: '百米成绩', detail: timeSec + 's', contribution: '+' + baseScore })
      break
    }

    // ===== 骑行 =====
    case 'cycling_20km': {
      var avgSpeed = Number(metrics.avg_speed || 0)
      computed.avg_speed = avgSpeed
      computed.cycling_level = avgSpeed >= 35 ? '精英' : avgSpeed >= 30 ? '高级' : avgSpeed >= 25 ? '中级' : avgSpeed >= 20 ? '入门' : '初学'
      baseScore = avgSpeed >= 35 ? 14 : avgSpeed >= 30 ? 10 : avgSpeed >= 25 ? 6 : avgSpeed >= 20 ? 3 : 1
      breakdown.push({ label: '骑行均速', detail: avgSpeed + 'km/h', contribution: '+' + baseScore })
      break
    }

    // ===== 柔韧 =====
    case 'flexibility_sit_reach': {
      var reach = Number(metrics.reach_cm || 0)
      var holdTime = Number(metrics.hold_time || 0)
      computed.flex_level = '一般'
      computed.flex_percentile = 50
      var ageGroup = age < 36 ? 'young' : age < 46 ? 'mid' : 'older'
      var flexStandards = {
        male: { young: [0, 25, 34, 40, 46], mid: [0, 22, 30, 36, 42], older: [0, 18, 28, 35, 40] },
        female: { young: [0, 31, 40, 46, 52], mid: [0, 28, 36, 42, 48], older: [0, 23, 33, 40, 45] }
      }
      var table = (flexStandards[gender] || flexStandards.male)[ageGroup] || [0, 20, 30, 38, 44]
      var levels = ['需提升', '一般', '良好', '优秀', '卓越']
      var scores = [1, 3, 6, 10, 14]
      for (var fi = levels.length - 1; fi >= 0; fi--) {
        if (reach >= table[fi]) { computed.flex_level = levels[fi]; computed.flex_percentile = (fi + 1) * 20; baseScore = scores[fi]; break }
      }
      breakdown.push({ label: '坐位体前屈', detail: reach + 'cm', contribution: '+' + baseScore })
      if (holdTime >= 15) { bonusMultiplier += 0.1; breakdown.push({ label: '充分拉伸', detail: holdTime + '秒', contribution: '×1.1' }) }
      break
    }

    // ===== 瑜伽 =====
    case 'yoga_session': {
      var dur = Number(metrics.duration_minutes || 0)
      var intensity = metrics.intensity || 'moderate'
      computed.yoga_intensity = intensity === 'intense' ? '高强度' : intensity === 'moderate' ? '中等' : '温和'
      baseScore = Math.min(10, Math.floor(dur / 10))
      if (intensity === 'intense') { baseScore = Math.round(baseScore * 1.4) }
      else if (intensity === 'moderate') { baseScore = Math.round(baseScore * 1.15) }
      breakdown.push({ label: '瑜伽时长', detail: dur + '分钟', contribution: '+' + baseScore })
      break
    }

    // ===== 冥想 =====
    case 'meditation': {
      var dur = Number(metrics.duration_minutes || 0)
      var focus = metrics.focus_quality || 'moderate'
      computed.focus_level = focus
      baseScore = Math.min(8, Math.floor(dur / 5))
      if (focus === 'deep') { bonusMultiplier += 0.5 }
      else if (focus === 'focused') { bonusMultiplier += 0.3 }
      else if (focus === 'moderate') { bonusMultiplier += 0.1 }
      breakdown.push({ label: '入定时长', detail: dur + '分钟', contribution: '+' + baseScore })
      if (focus === 'deep') breakdown.push({ label: '禅定境', detail: '身心两忘', contribution: '×1.5' })
      else if (focus === 'focused') breakdown.push({ label: '入定境', detail: '心无旁骛', contribution: '×1.3' })
      break
    }

    // ===== 背单词 =====
    case 'vocabulary_english': {
      var newWords = Number(metrics.new_words_today || 0)
      var reviewWords = Number(metrics.review_words_today || 0)
      var totalVocab = Number(metrics.total_vocabulary || 0)
      var studyDur = Number(metrics.study_duration || 0)
      var method = metrics.method || 'app'
      // 基础分：按新词数
      baseScore = Math.min(10, Math.floor(newWords / 2))
      // CEFR 加成
      var cefrScore = totalVocab >= 12000 ? 6 : totalVocab >= 6250 ? 4 : totalVocab >= 3750 ? 2 : totalVocab >= 2500 ? 1 : 0
      baseScore += cefrScore
      breakdown.push({ label: '新词 ' + newWords + ' + 复习 ' + reviewWords, detail: '词汇量 ~' + totalVocab, contribution: '+' + baseScore })
      // 学习方式修正
      if (method === 'app') { bonusMultiplier += 0.3; breakdown.push({ label: '主动回忆法', detail: 'App/Anki', contribution: '×1.3（Roediger 2006）' }) }
      // 最优负荷
      if (newWords >= 10 && newWords <= 20) { bonusMultiplier += 0.15; breakdown.push({ label: '最优负荷', detail: '10-20 新词/天', contribution: '×1.15' }) }
      // 复习比
      if (reviewWords >= newWords * 1.5 && newWords > 0) { bonusMultiplier += 0.2; breakdown.push({ label: '间隔重复', detail: '复习≥新词×1.5', contribution: '×1.2' }) }
      computed.cefr_level = totalVocab >= 16000 ? 'C2+' : totalVocab >= 12000 ? 'C2' : totalVocab >= 8000 ? 'C1' : totalVocab >= 4500 ? 'B2' : totalVocab >= 3750 ? 'B1+' : totalVocab >= 2500 ? 'B1' : totalVocab >= 1500 ? 'A2+' : totalVocab > 0 ? 'A1-A2' : '未评估'
      computed.word_load_eval = newWords <= 10 ? '保守积累' : newWords <= 20 ? '最优负荷' : newWords <= 30 ? '高负荷' : '超负荷'
      computed.retention_rate = newWords <= 10 ? '85%+' : newWords <= 20 ? '75-85%' : newWords <= 30 ? '55-75%' : '<55%'
      break
    }

    // ===== 阅读 =====
    case 'reading_pages': {
      var pages = Number(metrics.pages_read || 0)
      var dur = Number(metrics.duration_minutes || 0)
      var bookType = metrics.book_type || 'general'
      baseScore = Math.min(10, Math.floor(pages / 10))
      var typeBonus = { academic: 1.4, technical: 1.3, general: 1.0, fiction: 0.8 }
      baseScore = Math.round(baseScore * (typeBonus[bookType] || 1.0))
      computed.reading_speed = dur > 0 ? Math.round(pages / (dur / 60)) + '页/时' : '--'
      breakdown.push({ label: '阅读页数', detail: pages + '页', contribution: '+' + baseScore })
      break
    }

    // ===== 编程 =====
    case 'coding_hours': {
      var focusMin = Number(metrics.focus_minutes || 0)
      var pomodoro = Number(metrics.pomodoro_count || 0)
      var lines = Number(metrics.output_lines || 0)
      baseScore = Math.min(12, Math.floor(focusMin / 15))
      breakdown.push({ label: '专注时长', detail: focusMin + '分钟', contribution: '+' + baseScore })
      if (pomodoro > 0) { var pomBonus = Math.min(3, Math.floor(pomodoro / 2)); baseScore += pomBonus; breakdown.push({ label: '番茄钟', detail: pomodoro + '个', contribution: '+' + pomBonus }) }
      break
    }

    // ===== 睡眠 =====
    case 'sleep_quality': {
      var sleepH = Number(metrics.sleep_hours || 0)
      var deepH = Number(metrics.deep_sleep_hours || 0)
      var quality = metrics.sleep_quality || 'good'
      baseScore = sleepH >= 7 && sleepH <= 9 ? 8 : sleepH >= 6 && sleepH < 7 ? 5 : sleepH > 9 ? 4 : 2
      if (deepH >= 1.5) { bonusMultiplier += 0.15; breakdown.push({ label: '充足深睡眠', detail: deepH + 'h', contribution: '×1.15' }) }
      if (quality === 'excellent') { bonusMultiplier += 0.1 }
      breakdown.push({ label: '睡眠时长', detail: sleepH + 'h', contribution: '+' + baseScore })
      break
    }

    // ===== 冷水浴 =====
    case 'cold_shower': {
      var coldDur = Number(metrics.duration_minutes || 0)
      var temp = Number(metrics.water_temp || 0)
      baseScore = Math.min(6, Math.floor(coldDur))
      if (temp > 0 && temp <= 15) { bonusMultiplier += 0.3; breakdown.push({ label: '低温挑战', detail: temp + '°C', contribution: '×1.3' }) }
      breakdown.push({ label: '寒浴时长', detail: coldDur + '分钟', contribution: '+' + baseScore })
      break
    }

    default:
      // 通用时长型预设（含运动库生成的轻量级预设）
      var duration = Number(metrics.duration || 0)
      if (duration > 0) {
        baseScore = Math.min(10, Math.floor(duration / 15))
        breakdown.push({ label: '修行时长', detail: duration + '分钟', contribution: '+' + baseScore })
      } else {
        baseScore = 1
        breakdown.push({ label: '记录', detail: '完成', contribution: '+1' })
      }
      break
  }

  var finalScore = Math.max(1, Math.round(baseScore * bonusMultiplier))

  return {
    score: finalScore,
    baseScore: baseScore,
    multiplier: Math.round(bonusMultiplier * 100) / 100,
    breakdown: breakdown,
    metricsComputed: computed,
    preset: preset,
    message: preset.cultivationName + ' · 收获修为 +' + finalScore
  }
}

/**
 * 评估某个指标的用户水平（用于修为面板展示）
 */
function evaluateUserLevel(presetId, metricsComputed, bodyProfile) {
  var bp = bodyProfile || {}
  var computed = metricsComputed || {}
  var levelNames = ['入门', '新手', '中级', '高级', '精英']

  // 按预设类别返回水平评级
  switch (presetId) {
    case 'bench_press':
    case 'squat':
    case 'deadlift':
    case 'overhead_press':
      var ratio = computed.relative_strength || 0
      if (ratio <= 0) return { level: '--', label: '暂无数据' }
      for (var i = 0; i < levelNames.length; i++) {
        if (ratio < (presetId === 'bench_press' || presetId === 'overhead_press' ? [0.75, 1.0, 1.25, 1.5, 99] : presetId === 'squat' ? [1.0, 1.25, 1.75, 2.25, 99] : [1.25, 1.5, 2.0, 2.5, 99])[i]) {
          return { level: levelNames[i], label: levelNames[i] + '力量', ratio: ratio }
        }
      }
      return { level: '精英', label: '精英力量', ratio: ratio }

    case 'pullup':
      var reps = computed.maxReps || computed.total_volume || 0
      return { level: reps >= 20 ? '卓越' : reps >= 15 ? '优秀' : reps >= 10 ? '良好' : '一般', label: '引体向上' }

    case 'running_5k':
    case 'running_10k':
      return { level: (computed.vdot >= 55 ? '精英' : computed.vdot >= 45 ? '高级' : computed.vdot >= 35 ? '中级' : '入门'), label: 'VDOT ' + (computed.vdot || '--') }

    case 'swim_100m':
      return { level: computed.swim_level || '--', label: computed.swolf ? 'SWOLF ' + computed.swolf : '--' }

    case 'vocabulary_english':
      return { level: computed.cefr_level || '--', label: computed.cefr_level || '未评估' }

    case 'flexibility_sit_reach':
      return { level: computed.flex_level || '--', label: '柔韧 ' + (computed.flex_level || '--') }

    case 'meditation':
      return { level: computed.focus_level === 'deep' ? '禅定' : computed.focus_level === 'focused' ? '入定' : '守一', label: '冥想境' }

    default:
      return { level: '--', label: '修行中' }
  }
}

function formatPaceMinutes(minsPerKm) {
  var m = Math.floor(minsPerKm)
  var s = Math.round((minsPerKm - m) * 60)
  return m + ':' + (s < 10 ? '0' : '') + s + ' /km'
}

/**
 * 获取某分类下的默认推荐预设（首屏仅展示3-5个）
 * @param {string} categoryId 分类ID
 * @returns {array} 预设数组
 */
function getDefaultPresets(categoryId) {
  var defaults = {
    strength:  ['bench_press', 'squat', 'deadlift', 'overhead_press', 'pullup'],
    endurance: ['running_5k', 'running_10k', 'cycling_20km', 'swim_100m'],
    skill:     ['flexibility_sit_reach', 'yoga_session'],
    mind:      ['meditation'],
    study:     ['vocabulary_english', 'reading_pages', 'coding_hours'],
    daily:     ['sleep_quality']
  }
  var ids = defaults[categoryId] || []
  return ids.map(function(id) { return getPresetById(id) }).filter(Boolean)
}

module.exports = {
  ALL_PRESETS: ALL_PRESETS,
  CATEGORIES: CATEGORIES,
  getPresetsByCategory: getPresetsByCategory,
  getAllPresetsForBoneCategory: getAllPresetsForBoneCategory,
  getPresetById: getPresetById,
  getRPEOptions: getRPEOptions,
  getPresetNameMap: getPresetNameMap,
  calcPresetScore: calcPresetScore,
  evaluateUserLevel: evaluateUserLevel,
  getDefaultPresets: getDefaultPresets
}