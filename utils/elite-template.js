// ============================================================
// 天道修行 - 精英人生模板系统核心引擎
// 
// 核心理念：
//   精英（广义的运动、工作、学习、生活精英）上传自身的人生模板，
//   普通用户可以「追随」精英的人生模板一步步修炼成长。
//   系统以玄幻小说「系统」的叙事体验，动态展示用户的成长进度。
// ============================================================

const { getTodayDate } = require('./constants.js')
const { calculateRealm } = require('./cultivation.js')

// ============================================================
// 一、精英模板数据结构
// ============================================================

/**
 * 精英人生模板标准结构
 * 
 * @typedef {Object} EliteTemplate
 * @property {string} id - 模板唯一 ID
 * @property {string} name - 模板名称（如「马斯克的钢铁作息」）
 * @property {string} eliteName - 精英名号（如「钢铁侠·马斯克」）
 * @property {string} eliteAvatar - 精英头像 URL
 * @property {string} eliteIntro - 精英简介（一句话）
 * @property {string} eliteBio - 精英详细传记
 * @property {string} category - 模板分类：sport / work / study / life / hybrid
 * @property {string} cultivationSystem - 绑定的修炼体系 key
 * @property {Array<ElitePhase>} phases - 修炼阶段列表（精英走过的路）
 * @property {Array<string>} principles - 精英核心理念/信条
 * @property {Object} dailyRhythm - 精英每日作息模板
 * @property {Array<string>} tags - 标签
 * @property {Object} stats - 模板统计数据
 * @property {number} createdAt - 创建时间戳
 */

/**
 * 修炼阶段结构 - 精英成长的阶梯
 * 
 * @typedef {Object} ElitePhase
 * @property {string} id - 阶段 ID
 * @property {string} name - 阶段名称（如「肉身重塑·百日筑基」）
 * @property {number} order - 阶段序号（从 1 开始）
 * @property {string} description - 阶段描述（精英原话或编者注）
 * @property {Array<PhaseMilestone>} milestones - 该阶段的里程碑
 * @property {number} requiredScore - 该阶段所需修为（默认根据任务自动计算）
 * @property {string} unlockHint - 解锁提示文案
 */

/**
 * 里程碑结构 - 阶段内的关键节点
 * 
 * @typedef {Object} PhaseMilestone
 * @property {string} id - 里程碑 ID
 * @property {string} name - 里程碑名称（如「连续 7 天晨跑」）
 * @property {string} type - 类型：daily_task / streak / score_threshold / custom
 * @property {Object} config - 配置参数
 * @property {number} reward - 达成奖励修为
 * @property {string} icon - 图标（emoji）
 * @property {string} celebrationText - 达成祝贺文案
 */

// ============================================================
// 二、预设精英模板库
// ============================================================

const ELITE_TEMPLATES = [
  // ---- 运动精英 ----
  {
    id: 'elite_runner_001',
    name: '破风者·跑者之道',
    eliteName: '破风者·基普乔格',
    eliteAvatar: '🏃',
    eliteIntro: '世界马拉松纪录保持者的人生节奏',
    eliteBio: '以极度自律与克制闻名。每日清晨 5:00 起床，不论晴雨坚持训练。坚信「没有捷径，只有重复」，将每一个平凡的日子都视为突破极限的机会。',
    category: 'sport',
    cultivationSystem: 'body',
    phases: [
      {
        id: 'p1', name: '觉醒·迈出第一步', order: 1,
        description: '精英曾言：「很多人不是输在跑不动，而是输在没穿上跑鞋。」此阶段只需建立「出门」的习惯，不追求速度与距离。',
        milestones: [
          { id: 'm1_1', name: '连续 3 天出门跑步', type: 'streak', config: { days: 3, task: '跑步' }, reward: 15, icon: '🏃', celebrationText: '『叮！系统提示：觉醒仪式完成，你的肉身已激活运动记忆』' },
          { id: 'm1_2', name: '单次跑步超过 20 分钟', type: 'custom', config: { key: 'run_20min' }, reward: 10, icon: '⏱️', celebrationText: '『叮！系统提示：首次突破 20 分钟耐力线，心跳与大地共鸣』' }
        ],
        requiredScore: 30, unlockHint: '『叮！现在开始，迈出你的第一步吧』'
      },
      {
        id: 'p2', name: '炼体·铸就跑者之躯', order: 2,
        description: '精英此阶段每日 30km 训练量。你的目标是建立规律的有氧节奏，每周至少 4 次跑步，逐步提升心肺。',
        milestones: [
          { id: 'm2_1', name: '连续 7 天有跑步记录', type: 'streak', config: { days: 7, task: '跑步' }, reward: 30, icon: '🔥', celebrationText: '『叮！系统提示：一周不间断，道心初显！你的身体已经开始适应修炼节奏』' },
          { id: 'm2_2', name: '累计跑步 100 分钟', type: 'score_threshold', config: { key: 'run_total_minutes', value: 100 }, reward: 25, icon: '💨', celebrationText: '『叮！系统提示：百分钟大关已破，风中已能感受到你的速度』' },
          { id: 'm2_3', name: '单次 5km 达成', type: 'custom', config: { key: 'run_5km' }, reward: 20, icon: '🎯', celebrationText: '『叮！系统提示：5 公里里程碑成就达成！你已超越 80% 的普通人』' }
        ],
        requiredScore: 80, unlockHint: '『叮！准备进入炼体阶段，调整好你的呼吸』'
      },
      {
        id: 'p3', name: '破境·超越极限', order: 3,
        description: '精英的信条：「痛苦是暂时的，荣耀是永恒的。」此阶段需要你挑战更长距离、更快速度，并开始力量交叉训练。',
        milestones: [
          { id: 'm3_1', name: '单次 10km 达成', type: 'custom', config: { key: 'run_10km' }, reward: 50, icon: '🏅', celebrationText: '『叮！系统提示：10 公里！这是凡人到修行者的分水岭！』' },
          { id: 'm3_2', name: '连续 21 天运动记录', type: 'streak', config: { days: 21, task: '运动' }, reward: 40, icon: '👑', celebrationText: '『叮！系统提示：二十一日养成法已成，运动已融入你的血脉』' },
          { id: 'm3_3', name: '周运动次数 >= 5 次持续 2 周', type: 'custom', config: { key: 'weekly_5x_2weeks' }, reward: 35, icon: '⚡', celebrationText: '『叮！系统提示：高频修炼模式启动，你的肉身正在向精英进化！』' }
        ],
        requiredScore: 150, unlockHint: '『叮！前方破境区域，准备好了吗？』'
      }
    ],
    principles: ['没有捷径，只有重复', '痛苦是暂时的，荣耀是永恒的', '每天进步 1%，一年后你就是 37 倍'],
    dailyRhythm: {
      wakeUp: '05:00', sleep: '21:00',
      slots: [
        { time: '05:30-07:00', task: '晨跑训练', category: 'sport' },
        { time: '07:00-07:30', task: '拉伸与恢复', category: 'sport' },
        { time: '08:00-12:00', task: '专注工作', category: 'work' },
        { time: '12:00-12:30', task: '健康午餐', category: 'diet' },
        { time: '16:00-17:30', task: '第二次训练/力量', category: 'sport' },
        { time: '19:00-19:30', task: '清淡晚餐', category: 'diet' },
        { time: '20:00-20:30', task: '冥想/复盘', category: 'study' }
      ]
    },
    tags: ['跑步', '马拉松', '自律', '运动'],
    stats: { followerCount: 0, totalProgress: 0, rating: 5 }
  },

  // ---- 工作精英 ----
  {
    id: 'elite_work_001',
    name: '效率大师·深度工作流',
    eliteName: '效率大师·卡尔·纽波特',
    eliteAvatar: '💼',
    eliteIntro: '数字时代的深度工作之道',
    eliteBio: '麻省理工计算机科学博士、乔治城大学教授。提出「深度工作」概念，主张在无干扰的专注状态下进行高强度认知活动，是知识工作者在新时代的核心竞争力。',
    category: 'work',
    cultivationSystem: 'worldly',
    phases: [
      {
        id: 'p1', name: '入门·驱逐分心', order: 1,
        description: '精英教导：「专注力是新时代的稀缺资源。」此阶段的核心是学会保护你的注意力，每天至少一段不受打扰的专注时间。',
        milestones: [
          { id: 'm1_1', name: '连续 3 天有深度工作记录', type: 'streak', config: { days: 3, task: '深度工作' }, reward: 15, icon: '🧠', celebrationText: '『叮！系统提示：你已开启专注之门，碎片化的诅咒开始松动』' },
          { id: 'm1_2', name: '单次深度工作超 2 小时', type: 'custom', config: { key: 'deepwork_2h' }, reward: 20, icon: '🔒', celebrationText: '『叮！系统提示：2 小时无中断专注，你已触摸到「心流」的边缘』' }
        ],
        requiredScore: 40, unlockHint: '『叮！放下手机，关闭通知，开始你的第一段深度时光』'
      },
      {
        id: 'p2', name: '精进·构建深度节奏', order: 2,
        description: '精英的日常：早晨 4 小时深度工作块，下午处理浅层事务。你需要建立自己的「深度工作时间块」并持续保护它。',
        milestones: [
          { id: 'm2_1', name: '连续 7 天有深度工作记录', type: 'streak', config: { days: 7, task: '深度工作' }, reward: 30, icon: '🗓️', celebrationText: '『叮！系统提示：七天深度节奏已建立，你的大脑开始习惯高密度思考』' },
          { id: 'm2_2', name: '累计深度工作 20 小时', type: 'score_threshold', config: { key: 'deepwork_total_hours', value: 20 }, reward: 40, icon: '📚', celebrationText: '『叮！系统提示：20 小时深度积累，你的认知能力正在发生质变』' },
          { id: 'm2_3', name: '完成一个完整项目', type: 'custom', config: { key: 'complete_project' }, reward: 50, icon: '🎉', celebrationText: '『叮！系统提示：项目大成！用深度工作产出的成果，质量远超碎片化劳作』' }
        ],
        requiredScore: 120, unlockHint: '『叮！准备好进入深度工作者的节奏了吗？』'
      },
      {
        id: 'p3', name: '大师·心流之境', order: 3,
        description: '精英境界：「进入深度工作的能力，就像肌肉一样需要训练。」此时你应已能自如切换专注模式，每日产出远超常人。',
        milestones: [
          { id: 'm3_1', name: '连续 30 天有深度工作记录', type: 'streak', config: { days: 30, task: '深度工作' }, reward: 60, icon: '🏆', celebrationText: '『叮！系统提示：三十日不间，道心已稳。你已是深度工作的践行者，普通人眼中的「天才」』' },
          { id: 'm3_2', name: '累计深度工作 100 小时', type: 'score_threshold', config: { key: 'deepwork_total_hours', value: 100 }, reward: 80, icon: '💎', celebrationText: '『叮！系统提示：百时之约已至。你的深度工作能力已接近精英水平』' }
        ],
        requiredScore: 180, unlockHint: '『叮！大师之路，就在脚下。心流之境，触手可及』'
      }
    ],
    principles: ['专注力是新时代的稀缺资源', '深度工作不是一种选择，而是一种必须', '减少切换成本，保护你的注意力块'],
    dailyRhythm: {
      wakeUp: '06:00', sleep: '22:30',
      slots: [
        { time: '06:30-07:00', task: '运动激活', category: 'sport' },
        { time: '08:00-12:00', task: '深度工作块 A', category: 'work' },
        { time: '13:00-14:00', task: '学习充电', category: 'study' },
        { time: '14:00-17:00', task: '深度工作块 B', category: 'work' },
        { time: '17:00-18:00', task: '浅层事务处理', category: 'work' },
        { time: '19:00-20:00', task: '阅读/学习', category: 'study' }
      ]
    },
    tags: ['工作效率', '深度工作', '专注力', '知识工作者'],
    stats: { followerCount: 0, totalProgress: 0, rating: 5 }
  },

  // ---- 学习精英 ----
  {
    id: 'elite_study_001',
    name: '学神之路·终身学习法',
    eliteName: '学神·费曼',
    eliteAvatar: '📖',
    eliteIntro: '以教为学的终极学习法则',
    eliteBio: '诺贝尔物理学奖得主、加州理工学院教授。其「费曼学习法」—— 用最简单的语言解释复杂概念，如果解释不清楚就回去重新学习——被公认为最高效的学习方法。他的一生是对「理解」二字最极致的追求。',
    category: 'study',
    cultivationSystem: 'traditional',
    phases: [
      {
        id: 'p1', name: '初窥·建立学习习惯', order: 1,
        description: '精英说过：「学习不是为了考试，是为了理解这个世界。」此阶段只需建立每天学习的习惯，不需要追求效率。',
        milestones: [
          { id: 'm1_1', name: '连续 5 天有学习记录', type: 'streak', config: { days: 5, task: '学习' }, reward: 20, icon: '📖', celebrationText: '『叮！系统提示：连续五日明心见性，你的大脑已开始享受学习的快感』' },
          { id: 'm1_2', name: '完成一次「费曼教学」', type: 'custom', config: { key: 'feynman_teach' }, reward: 15, icon: '🗣️', celebrationText: '『叮！系统提示：你尝试用最简单的语言解释了一个概念——这就是费曼学习法的精髓！』' }
        ],
        requiredScore: 35, unlockHint: '『叮！打开书本，每天 30 分钟，你的学习引擎即将启动』'
      },
      {
        id: 'p2', name: '贯通·掌握学习方法', order: 2,
        description: '精英的核心武器：费曼学习法 + 间隔重复 + 主动回忆。你需要将这三者融入日常学习，让每一次学习都有产出。',
        milestones: [
          { id: 'm2_1', name: '连续 14 天有学习记录', type: 'streak', config: { days: 14, task: '学习' }, reward: 30, icon: '🔥', celebrationText: '『叮！系统提示：两周不间断坚持，你已经超越了 90% 的普通人』' },
          { id: 'm2_2', name: '累计学习 30 小时', type: 'score_threshold', config: { key: 'study_total_hours', value: 30 }, reward: 40, icon: '⏰', celebrationText: '『叮！系统提示：三十小时的知识积累，你正在构建自己的认知体系』' },
          { id: 'm2_3', name: '输出 3 篇学习笔记/文章', type: 'custom', config: { key: 'output_3_notes' }, reward: 35, icon: '✍️', celebrationText: '『叮！系统提示：输出是最好的学习！三篇文章，三重理解』' }
        ],
        requiredScore: 120, unlockHint: '『叮！学神的方法已经在你面前展开，你准备好了吗？』'
      },
      {
        id: 'p3', name: '传道·以教为学', order: 3,
        description: '费曼信念：「如果你不能简单地解释它，你就没有真正理解它。」此阶段的核心是通过「教学」来检验和深化学习。',
        milestones: [
          { id: 'm3_1', name: '连续 30 天有学习记录', type: 'streak', config: { days: 30, task: '学习' }, reward: 50, icon: '👑', celebrationText: '『叮！系统提示：三十日道心已成，学习已是你的本能而非任务』' },
          { id: 'm3_2', name: '累计学习 100 小时', type: 'score_threshold', config: { key: 'study_total_hours', value: 100 }, reward: 70, icon: '💡', celebrationText: '『叮！系统提示：百时求知，你已经从一个学习者蜕变为一个思考者』' },
          { id: 'm3_3', name: '教会他人一个复杂概念', type: 'custom', config: { key: 'teach_others' }, reward: 60, icon: '🌟', celebrationText: '『叮！系统提示：费曼会为此感到骄傲——你真正理解了，因为你教会了别人』' }
        ],
        requiredScore: 200, unlockHint: '『叮！学神之路的最后一关：以教为学，以学为道』'
      }
    ],
    principles: ['如果你不能简单地解释它，你就没有真正理解它', '学习不是为了考试，是为了理解', '每天学一点，比突击学一天强一百倍'],
    dailyRhythm: {
      wakeUp: '06:30', sleep: '23:00',
      slots: [
        { time: '07:00-08:00', task: '晨间阅读', category: 'study' },
        { time: '09:00-12:00', task: '深度学习', category: 'study' },
        { time: '14:00-15:00', task: '费曼教学实践', category: 'study' },
        { time: '16:00-17:00', task: '运动调节', category: 'sport' },
        { time: '20:00-21:30', task: '晚间阅读/笔记', category: 'study' }
      ]
    },
    tags: ['学习', '费曼学习法', '终身学习', '知识管理'],
    stats: { followerCount: 0, totalProgress: 0, rating: 5 }
  },

  // ---- 生活精英 ----
  {
    id: 'elite_life_001',
    name: '生活大师·极致日常',
    eliteName: '生活大师·斯多葛',
    eliteAvatar: '🏛️',
    eliteIntro: '古代斯多葛哲学的现代生活实践',
    eliteBio: '马可·奥勒留，罗马皇帝与斯多葛哲学家。在帝国最动荡的时期，每晚在军帐中写下《沉思录》，将哲学融入呼吸，将修行融入日常。他的生活模板证明了：真正的力量来自内心的秩序。',
    category: 'life',
    cultivationSystem: 'beauty',
    phases: [
      {
        id: 'p1', name: '筑基·建立晨间仪式', order: 1,
        description: '精英每日清晨第一件事：在日记中写下今日要面对的挑战，并问自己「今天我能控制什么？」',
        milestones: [
          { id: 'm1_1', name: '连续 5 天完成晨间日记', type: 'streak', config: { days: 5, task: '晨间日记' }, reward: 20, icon: '📝', celebrationText: '『叮！系统提示：晨间仪式已成，你的每一天从清醒的自我觉察开始』' },
          { id: 'm1_2', name: '完成一次「控制圈」练习', type: 'custom', config: { key: 'circle_of_control' }, reward: 15, icon: '🎯', celebrationText: '『叮！系统提示：你学会了区分可控与不可控——这是内心平静的源头』' }
        ],
        requiredScore: 35, unlockHint: '『叮！每天早上 5 分钟，改变你的一生』'
      },
      {
        id: 'p2', name: '炼心·掌控情绪与作息', order: 2,
        description: '精英的日常修行：早起、冷水澡、间歇性断食、感恩日记、晚间复盘。「不是事物困扰我们，而是我们对事物的看法。」',
        milestones: [
          { id: 'm2_1', name: '连续 14 天保持规律作息', type: 'streak', config: { days: 14, task: '规律作息' }, reward: 30, icon: '🌅', celebrationText: '『叮！系统提示：十四天规律作息，你的身体正在建立自己的宇宙秩序』' },
          { id: 'm2_2', name: '连续 7 天健康饮食', type: 'streak', config: { days: 7, task: '健康饮食' }, reward: 25, icon: '🥗', celebrationText: '『叮！系统提示：七日清净饮食，肉身轻盈，神识清明』' },
          { id: 'm2_3', name: '完成 10 次冥想', type: 'score_threshold', config: { key: 'meditation_count', value: 10 }, reward: 30, icon: '🧘', celebrationText: '『叮！系统提示：十次冥想，你已触摸到内在的宁静』' }
        ],
        requiredScore: 100, unlockHint: '『叮！内心的秩序比外在的成就更重要——斯多葛的智慧』'
      },
      {
        id: 'p3', name: '合道·生活即修行', order: 3,
        description: '马可·奥勒留：「你拥有控制自己心灵的力量——而不是外部事件。意识到这一点，你将找到力量。」生活不再是任务清单，而是修行本身。',
        milestones: [
          { id: 'm3_1', name: '连续 30 天全部健康维度达标', type: 'streak', config: { days: 30, task: '全面修行' }, reward: 60, icon: '🏛️', celebrationText: '『叮！系统提示：三十日圆满！运动、饮食、学习、作息，四大维度均衡发展』' },
          { id: 'm3_2', name: '零心魔记录超过 21 天', type: 'streak', config: { days: 21, task: '零心魔' }, reward: 50, icon: '🛡️', celebrationText: '『叮！系统提示：二十一日无魔考，你的内心已如磐石般稳固』' },
          { id: 'm3_3', name: '撰写个人生活哲学', type: 'custom', config: { key: 'personal_philosophy' }, reward: 40, icon: '📜', celebrationText: '『叮！系统提示：你已凝练出自己的「沉思录」——这是斯多葛之路的最高成就』' }
        ],
        requiredScore: 180, unlockHint: '『叮！最后一个阶段：让生活本身成为你的修行道场』'
      }
    ],
    principles: ['不是事物困扰我们，而是我们对事物的看法', '控制你能控制的，接受你不能控制的', '每一天都当作最后一天来过'],
    dailyRhythm: {
      wakeUp: '05:30', sleep: '21:30',
      slots: [
        { time: '05:30-06:00', task: '晨间冥想+日记', category: 'study' },
        { time: '06:00-07:00', task: '运动训练', category: 'sport' },
        { time: '07:00-07:30', task: '健康早餐', category: 'diet' },
        { time: '08:00-12:00', task: '深度工作', category: 'work' },
        { time: '12:00-12:30', task: '正念午餐', category: 'diet' },
        { time: '20:00-20:30', task: '晚间复盘+感恩', category: 'study' }
      ]
    },
    tags: ['斯多葛', '生活哲学', '晨间仪式', '自律生活'],
    stats: { followerCount: 0, totalProgress: 0, rating: 5 }
  },

  // ---- 综合精英（运动+工作+学习+生活的完美平衡） ----
  {
    id: 'elite_hybrid_001',
    name: '全能修士·五维平衡之道',
    eliteName: '全能修士·达芬奇',
    eliteAvatar: '🎨',
    eliteIntro: '文艺复兴式的全方位人生修炼',
    eliteBio: '列奥纳多·达芬奇，画家、雕塑家、建筑师、科学家、音乐家、数学家、工程师、发明家、解剖学家、地质学家、植物学家和作家。他证明了：一个人类的潜能可以是无限的——只要他保持好奇心，并在多个领域持续精进。',
    category: 'hybrid',
    cultivationSystem: 'traditional',
    phases: [
      {
        id: 'p1', name: '启蒙·唤醒多维自我', order: 1,
        description: '达芬奇的秘诀：「好奇心是天才的种子。」此阶段你需要同时启动运动、学习、工作的三维轮转，体会跨领域的乐趣。',
        milestones: [
          { id: 'm1_1', name: '一周内运动+学习+工作三者各有记录', type: 'custom', config: { key: 'three_dimension_week' }, reward: 25, icon: '🔮', celebrationText: '『叮！系统提示：三维修行同步启动！运动强身、学习强智、工作强业，三者如鼎之三足』' },
          { id: 'm1_2', name: '连续 7 天至少两项维度有记录', type: 'streak', config: { days: 7, task: '多维度修行' }, reward: 20, icon: '⚖️', celebrationText: '『叮！系统提示：多维均衡之道初显，你已不是单维度生物！』' }
        ],
        requiredScore: 50, unlockHint: '『叮！达芬奇之路：永远对世界保持好奇，永远对多个领域保持热情』'
      },
      {
        id: 'p2', name: '融通·跨领域精进', order: 2,
        description: '精英的日课：运动、工作、学习三者每日轮转，外加饮食与睡眠的精微调控。多个领域的精进会产生「跨界飞轮效应」。',
        milestones: [
          { id: 'm2_1', name: '连续 14 天三项维度均有记录', type: 'streak', config: { days: 14, task: '三项全能' }, reward: 40, icon: '🌟', celebrationText: '『叮！系统提示：十四天全维度修炼！你正在激活自己的全部潜能』' },
          { id: 'm2_2', name: '单日三项维度均达满分', type: 'custom', config: { key: 'perfect_day' }, reward: 30, icon: '💫', celebrationText: '『叮！系统提示：完美一日！运动、学习、工作三项指标同时拉满——这就是精英的日常！』' },
          { id: 'm2_3', name: '连续 21 天零心魔', type: 'streak', config: { days: 21, task: '零心魔' }, reward: 35, icon: '✨', celebrationText: '『叮！系统提示：二十一日心无魔扰，自律已成为你的第二本能』' }
        ],
        requiredScore: 140, unlockHint: '『叮！达芬奇的境界：不同领域的知识会在你的大脑中自由碰撞，产生新的火花』'
      },
      {
        id: 'p3', name: '圆满·成为自己的达芬奇', order: 3,
        description: '达芬奇临终之言：「我冒犯了上帝和人类，因为我的工作没有达到它本应达到的质量。」——永远不满足，永远在进步。你的五维平衡人生，就是最好的作品。',
        milestones: [
          { id: 'm3_1', name: '四项维度连续 30 天均衡', type: 'streak', config: { days: 30, task: '四维均衡' }, reward: 80, icon: '🏆', celebrationText: '『叮！系统提示：三十日全维度修行大圆满！你已超越 99% 的普通人——现在的你，就是自己的达芬奇』' },
          { id: 'm3_2', name: '累计 10 个「完美日」', type: 'score_threshold', config: { key: 'perfect_day_count', value: 10 }, reward: 70, icon: '👑', celebrationText: '『叮！系统提示：十个完美修炼日！这种级别的均衡与自律，只存在于传说之中』' },
          { id: 'm3_3', name: '发布自己的修炼心得', type: 'custom', config: { key: 'publish_insight' }, reward: 50, icon: '📖', celebrationText: '『叮！系统提示：你的修炼心得将激励更多修士踏上全能之路！』' }
        ],
        requiredScore: 250, unlockHint: '『叮！全能修士的最后一程：你将成为你自己的人生模板』'
      }
    ],
    principles: ['好奇心是天才的种子', '多个领域的交叉产生真正的创造力', '永远不满足于现状，永远在进步', '身、心、智、业、灵，五维一体'],
    dailyRhythm: {
      wakeUp: '05:00', sleep: '22:00',
      slots: [
        { time: '05:30-06:30', task: '体能训练', category: 'sport' },
        { time: '06:30-07:00', task: '冥想+日记', category: 'study' },
        { time: '07:00-07:30', task: '营养早餐', category: 'diet' },
        { time: '08:00-12:00', task: '深度创作/工作', category: 'work' },
        { time: '14:00-16:00', task: '学习新领域知识', category: 'study' },
        { time: '16:00-17:00', task: '第二项运动', category: 'sport' },
        { time: '20:00-21:00', task: '绘画/音乐/创作', category: 'study' },
        { time: '21:00-21:30', task: '晚间复盘', category: 'study' }
      ]
    },
    tags: ['全能', '五维平衡', '文艺复兴', '跨界', '综合'],
    stats: { followerCount: 0, totalProgress: 0, rating: 5 }
  }
]

// ============================================================
// 三、用户追随状态管理
// ============================================================

/**
 * 用户追随某个精英模板的状态
 * 
 * @typedef {Object} TemplateJourney
 * @property {string} templateId - 追随的模板 ID
 * @property {number} startedAt - 开始追随时间戳
 * @property {number} currentPhase - 当前阶段序号
 * @property {number} phaseProgress - 当前阶段进度 (0-100)
 * @property {number} totalScore - 该模板累计获得修为
 * @property {number} matchRate - 今日匹配率 (0-100)
 * @property {Object} milestoneStatus - 里程碑完成状态 { milestoneId: true/false }
 * @property {number} streakDays - 连续修炼天数
 * @property {number} lastCheckinDate - 上次打卡日期时间戳
 */

/**
 * 初始化模板旅程
 */
function initTemplateJourney(templateId) {
  return {
    templateId,
    startedAt: Date.now(),
    currentPhase: 1,
    phaseProgress: 0,
    totalScore: 0,
    matchRate: 0,
    milestoneStatus: {},
    streakDays: 0,
    lastCheckinDate: 0
  }
}

/**
 * 获取精英模板
 */
function getEliteTemplate(templateId) {
  return ELITE_TEMPLATES.find(function (t) { return t.id === templateId }) || null
}

/**
 * 获取所有精英模板
 */
function getAllEliteTemplates() {
  return ELITE_TEMPLATES
}

/**
 * 按分类获取精英模板
 */
function getEliteTemplatesByCategory(category) {
  if (category === 'all') return ELITE_TEMPLATES.slice()
  return ELITE_TEMPLATES.filter(function (t) { return t.category === category })
}

/**
 * 获取模板的某个阶段
 */
function getTemplatePhase(templateId, phaseOrder) {
  var template = getEliteTemplate(templateId)
  if (!template) return null
  var phases = template.phases
  for (var i = 0; i < phases.length; i++) {
    if (phases[i].order === phaseOrder) return phases[i]
  }
  return null
}

/**
 * 获取模板当前阶段
 */
function getCurrentPhase(templateId, journey) {
  if (!journey) return null
  return getTemplatePhase(templateId, journey.currentPhase)
}

/**
 * 计算阶段内所有里程碑的总奖励
 */
function getPhaseTotalReward(phase) {
  if (!phase || !phase.milestones) return 0
  return phase.milestones.reduce(function (sum, m) { return sum + (m.reward || 0) }, 0)
}

/**
 * 计算阶段内已完成的里程碑奖励
 */
function getCompletedMilestoneReward(phase, milestoneStatus) {
  if (!phase || !phase.milestones || !milestoneStatus) return 0
  return phase.milestones.reduce(function (sum, m) {
    return sum + (milestoneStatus[m.id] ? (m.reward || 0) : 0)
  }, 0)
}

// ============================================================
// 四、进度计算引擎
// ============================================================

/**
 * 计算用户在某个模板上的总进度百分比
 * 基于：阶段完成度 + 里程碑完成度 + 修为积累度
 */
function calculateTemplateProgress(templateId, journey) {
  var template = getEliteTemplate(templateId)
  if (!template || !journey) return 0

  var phases = template.phases
  if (!phases || phases.length === 0) return 0

  // 已完成阶段按 100% 计
  var completedPhases = journey.currentPhase - 1
  var completedWeight = (completedPhases / phases.length) * 70 // 阶段权重 70%

  // 当前阶段进度（里程碑完成度）
  var currentPhaseData = getCurrentPhase(templateId, journey)
  var phaseWeight = (1 / phases.length) * 70
  var milestones = currentPhaseData ? currentPhaseData.milestones : []
  var completedMilestones = 0
  if (milestones.length > 0 && journey.milestoneStatus) {
    for (var i = 0; i < milestones.length; i++) {
      if (journey.milestoneStatus[milestones[i].id]) completedMilestones++
    }
    completedMilestones = (completedMilestones / milestones.length) * phaseWeight
  }

  // 总修为积累度（相对于全部阶段所需修为）
  var totalRequired = 0
  for (var j = 0; j < phases.length; j++) {
    totalRequired += (phases[j].requiredScore || 0)
  }
  var scoreWeight = totalRequired > 0 ? Math.min((journey.totalScore / totalRequired) * 30, 30) : 0 // 修为权重 30%

  return Math.min(Math.round(completedWeight + completedMilestones + scoreWeight), 100)
}

/**
 * 计算今日模板匹配率
 * 基于今日修行记录与精英每日作息的匹配度
 */
function calculateTodayMatchRate(templateId, todayRecords) {
  var template = getEliteTemplate(templateId)
  if (!template || !template.dailyRhythm || !template.dailyRhythm.slots) return 0

  var slots = template.dailyRhythm.slots
  var totalSlots = slots.length
  var matchedSlots = 0

  // 如果今天没有记录，直接返回 0
  if (!todayRecords || todayRecords.length === 0) return 0

  for (var i = 0; i < slots.length; i++) {
    var slot = slots[i]
    var slotCategory = slot.category
    // 检查是否有匹配分类的记录
    for (var j = 0; j < todayRecords.length; j++) {
      var record = todayRecords[j]
      var recordCategory = getRecordCategory(record)
      if (recordCategory === slotCategory && record.score > 0) {
        matchedSlots++
        break
      }
    }
  }

  return Math.round((matchedSlots / totalSlots) * 100)
}

/**
 * 将记录映射到模板分类
 */
function getRecordCategory(record) {
  if (record.category === 'sport') return 'sport'
  if (record.category === 'diet') return 'diet'
  if (record.category === 'study') return 'study'
  if (record.category === 'work') return 'work'
  return 'other'
}

// ============================================================
// 五、里程碑检测引擎
// ============================================================

/**
 * 检测里程碑是否达成
 * @param {Object} milestone - 里程碑定义
 * @param {Object} journey - 用户旅程数据
 * @param {Array} records - 今日记录
 * @param {Array} allRecords - 所有历史记录（用于累计检测）
 * @returns {boolean} 是否达成
 */
function checkMilestone(milestone, journey, records, allRecords) {
  if (!milestone || !milestone.config) return false

  var config = milestone.config
  var type = milestone.type

  switch (type) {
    case 'streak':
      // 连续天数检测
      return journey.streakDays >= config.days

    case 'score_threshold':
      // 累计数值检测
      var key = config.key
      var value = config.value
      if (key === 'study_total_hours' || key === 'deepwork_total_hours') {
        return calculateTotalMinutes(allRecords, key) >= value * 60
      }
      if (key === 'meditation_count') {
        return countMeditationSessions(allRecords) >= value
      }
      if (key === 'perfect_day_count') {
        return countPerfectDays(allRecords) >= value
      }
      return false

    case 'custom':
      // 自定义检测（需要结合具体业务逻辑）
      return checkCustomMilestone(milestone, journey, records, allRecords)

    default:
      return false
  }
}

/**
 * 计算特定类型记录的总分钟数
 */
function calculateTotalMinutes(records, type) {
  if (!records || records.length === 0) return 0
  var total = 0
  var isStudy = type === 'study_total_hours'
  var isDeepWork = type === 'deepwork_total_hours'

  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (r.score <= 0) continue

    if (isStudy && (r.category === 'study')) {
      total += (r.duration || r.minutes || 30) // 默认每次 30 分钟
    }
    if (isDeepWork && (r.category === 'work' || r.category === 'study') && (r.name && (r.name.indexOf('深度') >= 0 || r.name.indexOf('专注') >= 0))) {
      total += (r.duration || r.minutes || 30)
    }
  }
  return total
}

/**
 * 计算冥想次数
 */
function countMeditationSessions(records) {
  if (!records || records.length === 0) return 0
  var count = 0
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (r.name && (r.name.indexOf('冥想') >= 0 || r.name.indexOf('静坐') >= 0) && r.score > 0) {
      count++
    }
  }
  return count
}

/**
 * 计算完美日数量（运动+学习+工作三项都有正向记录）
 */
function countPerfectDays(records) {
  if (!records || records.length === 0) return 0
  var dayMap = {}
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (r.score <= 0) continue
    var d = r.date || ''
    if (!d) continue
    if (!dayMap[d]) dayMap[d] = { sport: false, study: false, work: false, diet: false }
    if (r.category === 'sport') dayMap[d].sport = true
    if (r.category === 'study') dayMap[d].study = true
    if (r.category === 'work') dayMap[d].work = true
    if (r.category === 'diet') dayMap[d].diet = true
  }
  var perfectCount = 0
  var days = Object.keys(dayMap)
  for (var j = 0; j < days.length; j++) {
    var dims = dayMap[days[j]]
    if (dims.sport && dims.study && dims.work && dims.diet) perfectCount++
  }
  return perfectCount
}

/**
 * 自定义里程碑检测
 */
function checkCustomMilestone(milestone, journey, records, allRecords) {
  var key = milestone.config.key
  if (!key) return false

  // 单个任务完成检测
  if (key === 'run_20min' || key === 'run_5km' || key === 'run_10km') {
    return records && records.some(function (r) {
      return r.name && r.name.indexOf('跑步') >= 0 && r.score > 0
    })
  }

  // 费曼教学检测
  if (key === 'feynman_teach') {
    return records && records.some(function (r) {
      return r.name && (r.name.indexOf('教学') >= 0 || r.name.indexOf('讲解') >= 0 || r.name.indexOf('费曼') >= 0) && r.score > 0
    })
  }

  // 输出笔记检测
  if (key === 'output_3_notes') {
    var noteCount = 0
    if (allRecords) {
      for (var i = 0; i < allRecords.length; i++) {
        var r = allRecords[i]
        if (r.name && (r.name.indexOf('笔记') >= 0 || r.name.indexOf('文章') >= 0 || r.name.indexOf('输出') >= 0) && r.score > 0) {
          noteCount++
        }
      }
    }
    return noteCount >= 3
  }

  // 教会他人检测
  if (key === 'teach_others') {
    return records && records.some(function (r) {
      return r.name && (r.name.indexOf('教学') >= 0 || r.name.indexOf('分享') >= 0 || r.name.indexOf('演讲') >= 0) && r.score > 0
    })
  }

  // 三维度检测
  if (key === 'three_dimension_week') {
    if (!allRecords) return false
    var recentRecords = allRecords.filter(function (r) {
      return r.score > 0 && r.timestamp > Date.now() - 7 * 24 * 3600 * 1000
    })
    var hasSport = recentRecords.some(function (r) { return r.category === 'sport' })
    var hasStudy = recentRecords.some(function (r) { return r.category === 'study' })
    var hasWork = recentRecords.some(function (r) { return r.category === 'work' })
    return hasSport && hasStudy && hasWork
  }

  // 完美日检测
  if (key === 'perfect_day') {
    if (!records || records.length === 0) return false
    var hasSport = false, hasStudy = false, hasWork = false, hasDiet = false
    for (var j = 0; j < records.length; j++) {
      var rec = records[j]
      if (rec.score <= 0) continue
      if (rec.category === 'sport') hasSport = true
      if (rec.category === 'study') hasStudy = true
      if (rec.category === 'work') hasWork = true
      if (rec.category === 'diet') hasDiet = true
    }
    return hasSport && hasStudy && hasWork && hasDiet
  }

  // 综合训练检测
  if (key === 'weekly_5x_2weeks') {
    return journey.streakDays >= 14
  }

  // 深度工作检测
  if (key === 'deepwork_2h' || key === 'complete_project') {
    return records && records.some(function (r) {
      return (r.category === 'work' || r.category === 'study') && r.score > 0
    })
  }

  // 个人哲学检测
  if (key === 'personal_philosophy' || key === 'publish_insight') {
    return records && records.some(function (r) {
      return r.name && (r.name.indexOf('写作') >= 0 || r.name.indexOf('心得') >= 0 || r.name.indexOf('总结') >= 0) && r.score > 0
    })
  }

  // 控制圈练习
  if (key === 'circle_of_control') {
    return records && records.some(function (r) {
      return r.name && (r.name.indexOf('日记') >= 0 || r.name.indexOf('反思') >= 0) && r.score > 0
    })
  }

  return false
}

// ============================================================
// 六、系统叙事引擎 - 生成玄幻小说般的「系统提示」
// ============================================================

/**
 * 生成阶段性「系统」提示
 * @param {Object} journey - 用户旅程
 * @param {Object} template - 模板详情
 * @returns {Object} { title, message, level }
 */
function generateSystemMessage(journey, template) {
  if (!journey || !template) {
    return {
      title: '系统待命中',
      message: '『叮！天道系统已绑定，请选择一位精英作为你的引路人』',
      level: 'info'
    }
  }

  var progress = calculateTemplateProgress(template.id, journey)
  var currentPhase = getCurrentPhase(template.id, journey)
  var phaseName = currentPhase ? currentPhase.name : '未知阶段'
  var milestones = currentPhase ? currentPhase.milestones : []
  var eliteName = template.eliteName || '未知精英'

  // 检查是否有未完成的里程碑
  var incompleteMilestones = []
  if (milestones && journey.milestoneStatus) {
    for (var i = 0; i < milestones.length; i++) {
      if (!journey.milestoneStatus[milestones[i].id]) {
        incompleteMilestones.push(milestones[i])
      }
    }
  }

  // 根据进度生成不同级别的消息
  if (progress < 5 && journey.streakDays === 0) {
    return {
      title: '『叮！天道系统启动』',
      message: '宿主已绑定精英「' + eliteName + '」的修炼模板。当前阶段：' + phaseName + '。从第一个里程碑开始你的修炼之路吧。',
      level: 'info'
    }
  }

  if (progress < 30) {
    var nextMilestone = incompleteMilestones.length > 0 ? incompleteMilestones[0] : null
    return {
      title: '『叮！修炼进行中』',
      message: '宿主正追随「' + eliteName + '」的足迹修炼。当前进度 ' + progress + '%，阶段：「' + phaseName + '」。' +
        (nextMilestone ? '下一个里程碑：「' + nextMilestone.name + '」，完成可获得 ' + nextMilestone.reward + ' 修为。' : '本阶段里程碑即将全部达成！'),
      level: 'progress'
    }
  }

  if (progress < 60) {
    return {
      title: '『叮！道心稳固』',
      message: '宿主已掌握「' + eliteName + '」修炼之道的 ' + progress + '%。你的成长速度令天道为之侧目。继续精进，下一个阶段就在前方。',
      level: 'milestone'
    }
  }

  if (progress < 90) {
    return {
      title: '『叮！精英之路近在咫尺』',
      message: '宿主已习得「' + eliteName + '」八成真传！总进度 ' + progress + '%。天道提示：你的气质、习惯和能力正在向精英靠拢。',
      level: 'breakthrough'
    }
  }

  return {
    title: '『叮！大成在即』',
    message: '宿主与「' + eliteName + '」的契合度已达 ' + progress + '%！天道预言：很快你将成为他人追随的精英，拥有撰写自己人生模板的资格。',
    level: 'glory'
  }
}

/**
 * 里程碑达成时的祝贺消息
 */
function getMilestoneCelebration(milestone, template) {
  if (!milestone) return ''
  if (milestone.celebrationText) return milestone.celebrationText
  return '『叮！系统提示：里程碑「' + (milestone.name || '未知') + '」达成！修为 +' + (milestone.reward || 0) + '』'
}

/**
 * 阶段解锁时的消息
 */
function getPhaseUnlockMessage(phase, template) {
  if (!phase) return ''
  return phase.unlockHint || '『叮！系统提示：新阶段已解锁，继续追随精英的脚步前进吧！』'
}

// ============================================================
// 七、数据持久化
// ============================================================

/**
 * 从本地存储加载模板旅程
 */
function loadTemplateJourney() {
  try {
    var data = wx.getStorageSync('tiandao_template_journey')
    return data || null
  } catch (e) {
    console.error('加载模板旅程失败', e)
    return null
  }
}

/**
 * 保存模板旅程到本地存储
 */
function saveTemplateJourney(journey) {
  try {
    wx.setStorageSync('tiandao_template_journey', journey)
  } catch (e) {
    console.error('保存模板旅程失败', e)
  }
}

/**
 * 清除模板旅程
 */
function clearTemplateJourney() {
  try {
    wx.removeStorageSync('tiandao_template_journey')
  } catch (e) {
    console.error('清除模板旅程失败', e)
  }
}

// ============================================================
// 八、模板分类与标签
// ============================================================

const ELITE_CATEGORIES = [
  { key: 'all', label: '全部精英', icon: '🌟' },
  { key: 'sport', label: '运动精英', icon: '🏃' },
  { key: 'work', label: '工作精英', icon: '💼' },
  { key: 'study', label: '学习精英', icon: '📖' },
  { key: 'life', label: '生活精英', icon: '🏛️' },
  { key: 'hybrid', label: '全能精英', icon: '🎨' }
]

const CATEGORY_LABEL_MAP = {}
for (var c = 0; c < ELITE_CATEGORIES.length; c++) {
  var cat = ELITE_CATEGORIES[c]
  CATEGORY_LABEL_MAP[cat.key] = cat.label
}

module.exports = {
  // 数据获取
  ELITE_TEMPLATES,
  ELITE_CATEGORIES,
  CATEGORY_LABEL_MAP,
  getEliteTemplate: getEliteTemplate,
  getAllEliteTemplates: getAllEliteTemplates,
  getEliteTemplatesByCategory: getEliteTemplatesByCategory,
  getTemplatePhase: getTemplatePhase,
  getCurrentPhase: getCurrentPhase,

  // 旅程管理
  initTemplateJourney: initTemplateJourney,
  loadTemplateJourney: loadTemplateJourney,
  saveTemplateJourney: saveTemplateJourney,
  clearTemplateJourney: clearTemplateJourney,

  // 进度计算
  calculateTemplateProgress: calculateTemplateProgress,
  calculateTodayMatchRate: calculateTodayMatchRate,

  // 里程碑
  checkMilestone: checkMilestone,
  getPhaseTotalReward: getPhaseTotalReward,
  getCompletedMilestoneReward: getCompletedMilestoneReward,
  getMilestoneCelebration: getMilestoneCelebration,
  getPhaseUnlockMessage: getPhaseUnlockMessage,

  // 系统叙事
  generateSystemMessage: generateSystemMessage
}
