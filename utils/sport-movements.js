// 运动知识库全量数据 — 炼体类(无氧) / 炼气类(有氧) 双体系
// 每个动作含 id、name(通用名)、aliases(简称/俗称)、category(子类分组)、trainingPath、met、needWeight

// ========== 炼体类（无氧抗阻训练） ==========

var LIANTI_GROUPS = [
  {
    groupName: '自重筑基类',
    groupDesc: '无器械徒手训练',
    items: [
      { id: 'push_up', name: '标准俯卧撑', aliases: ['俯卧撑', 'pushup'], met: 4.0, needWeight: false },
      { id: 'wide_push_up', name: '宽距俯卧撑', aliases: ['宽距俯卧撑'], met: 4.0, needWeight: false },
      { id: 'narrow_push_up', name: '窄距俯卧撑', aliases: ['窄距俯卧撑'], met: 4.5, needWeight: false },
      { id: 'diamond_push_up', name: '钻石俯卧撑', aliases: ['钻石俯卧撑'], met: 4.5, needWeight: false },
      { id: 'incline_push_up', name: '上斜俯卧撑', aliases: ['上斜俯卧撑'], met: 3.5, needWeight: false },
      { id: 'decline_push_up', name: '下斜俯卧撑', aliases: ['下斜俯卧撑'], met: 4.5, needWeight: false },
      { id: 'knee_push_up', name: '跪姿俯卧撑', aliases: ['跪姿俯卧撑'], met: 3.0, needWeight: false },
      { id: 'clap_push_up', name: '击掌俯卧撑', aliases: ['击掌俯卧撑'], met: 6.0, needWeight: false },
      { id: 'pull_up', name: '引体向上', aliases: ['引体', 'pullup'], met: 5.5, needWeight: false },
      { id: 'wide_pull_up', name: '宽距引体', aliases: ['宽距引体'], met: 5.5, needWeight: false },
      { id: 'narrow_pull_up', name: '窄距引体', aliases: ['窄距引体'], met: 5.5, needWeight: false },
      { id: 'australian_pull_up', name: '澳式引体', aliases: ['澳式引体', '反向划船'], met: 4.0, needWeight: false },
      { id: 'bodyweight_squat', name: '自重深蹲', aliases: ['深蹲', '徒手深蹲'], met: 5.0, needWeight: false },
      { id: 'sumo_squat', name: '相扑深蹲', aliases: ['相扑深蹲'], met: 5.0, needWeight: false },
      { id: 'lunge', name: '箭步蹲', aliases: ['箭步蹲', '弓步蹲'], met: 4.5, needWeight: false },
      { id: 'bulgarian_split_squat', name: '保加利亚分腿蹲', aliases: ['保加利亚蹲', '分腿蹲'], met: 5.5, needWeight: false },
      { id: 'pistol_squat', name: '单腿深蹲', aliases: ['单腿深蹲', '手枪蹲'], met: 6.0, needWeight: false },
      { id: 'glute_bridge', name: '臀桥', aliases: ['臀桥'], met: 3.0, needWeight: false },
      { id: 'single_leg_glute_bridge', name: '单腿臀桥', aliases: ['单腿臀桥'], met: 3.5, needWeight: false },
      { id: 'calf_raise', name: '提踵', aliases: ['提踵', '踮脚'], met: 2.5, needWeight: false },
      { id: 'sissy_squat', name: '坐姿腿屈伸', aliases: ['坐姿腿屈伸', '西斯深蹲'], met: 3.5, needWeight: false },
      { id: 'plank', name: '平板支撑', aliases: ['平板支撑', 'plank'], met: 2.0, needWeight: false },
      { id: 'side_plank', name: '侧平板支撑', aliases: ['侧平板'], met: 2.5, needWeight: false },
      { id: 'knee_plank', name: '跪姿平板', aliases: ['跪姿平板支撑'], met: 1.5, needWeight: false },
      { id: 'dead_bug', name: '死虫式', aliases: ['死虫式'], met: 2.0, needWeight: false },
      { id: 'bird_dog', name: '鸟狗式', aliases: ['鸟狗式'], met: 2.0, needWeight: false },
      { id: 'diaphragmatic_breathing', name: '腹式呼吸', aliases: ['腹式呼吸'], met: 1.0, needWeight: false }
    ]
  },
  {
    groupName: '淬骨炼筋类',
    groupDesc: '杠铃/哑铃/壶铃自由重量',
    items: [
      { id: 'barbell_squat', name: '杠铃深蹲', aliases: ['杠铃深蹲'], met: 5.5, needWeight: true },
      { id: 'barbell_deadlift', name: '杠铃硬拉', aliases: ['硬拉', 'deadlift'], met: 6.0, needWeight: true },
      { id: 'conventional_deadlift', name: '传统硬拉', aliases: ['传统硬拉'], met: 6.0, needWeight: true },
      { id: 'romanian_deadlift', name: '罗马尼亚硬拉', aliases: ['罗马尼亚硬拉', '罗硬'], met: 5.5, needWeight: true },
      { id: 'barbell_bench', name: '杠铃卧推', aliases: ['卧推', '杠铃卧推', 'benchpress'], met: 5.0, needWeight: true },
      { id: 'barbell_row', name: '杠铃划船', aliases: ['杠铃划船'], met: 5.0, needWeight: true },
      { id: 'bent_over_row', name: '俯身杠铃划船', aliases: ['俯身划船'], met: 5.5, needWeight: true },
      { id: 'barbell_press', name: '杠铃推举', aliases: ['杠铃推举'], met: 5.0, needWeight: true },
      { id: 'barbell_curl', name: '杠铃弯举', aliases: ['杠铃弯举'], met: 3.5, needWeight: true },
      { id: 'barbell_tricep_ext', name: '杠铃臂屈伸', aliases: ['杠铃臂屈伸'], met: 3.5, needWeight: true },
      { id: 'barbell_lunge', name: '杠铃箭步蹲', aliases: ['杠铃箭步蹲'], met: 5.5, needWeight: true },
      { id: 'dumbbell_bench', name: '哑铃卧推', aliases: ['哑铃卧推'], met: 5.0, needWeight: true },
      { id: 'dumbbell_fly', name: '哑铃飞鸟', aliases: ['哑铃飞鸟'], met: 4.0, needWeight: true },
      { id: 'dumbbell_row', name: '哑铃划船', aliases: ['哑铃划船'], met: 4.5, needWeight: true },
      { id: 'single_arm_db_row', name: '单臂哑铃划船', aliases: ['单臂划船', '单臂哑铃划船'], met: 5.0, needWeight: true },
      { id: 'dumbbell_press', name: '哑铃推举', aliases: ['哑铃推举', '哑铃肩推'], met: 4.5, needWeight: true },
      { id: 'dumbbell_lateral_raise', name: '哑铃侧平举', aliases: ['侧平举', '哑铃侧平举'], met: 3.0, needWeight: true },
      { id: 'dumbbell_front_raise', name: '哑铃前平举', aliases: ['前平举', '哑铃前平举'], met: 3.0, needWeight: true },
      { id: 'dumbbell_rear_fly', name: '哑铃俯身飞鸟', aliases: ['俯身飞鸟', '脸拉'], met: 3.0, needWeight: true },
      { id: 'dumbbell_curl', name: '哑铃弯举', aliases: ['哑铃弯举', '二头弯举'], met: 3.5, needWeight: true },
      { id: 'dumbbell_hammer_curl', name: '哑铃锤式弯举', aliases: ['锤式弯举'], met: 3.5, needWeight: true },
      { id: 'dumbbell_tricep_ext', name: '哑铃颈后臂屈伸', aliases: ['颈后臂屈伸', '三头臂屈伸'], met: 3.5, needWeight: true },
      { id: 'dumbbell_lunge', name: '哑铃箭步蹲', aliases: ['哑铃箭步蹲'], met: 5.0, needWeight: true },
      { id: 'dumbbell_deadlift', name: '哑铃硬拉', aliases: ['哑铃硬拉'], met: 5.5, needWeight: true },
      { id: 'dumbbell_hip_thrust', name: '哑铃臀推', aliases: ['哑铃臀推', '臀推'], met: 4.5, needWeight: true },
      { id: 'kettlebell_swing', name: '壶铃摇摆', aliases: ['壶铃摇摆', '壶铃swing'], met: 6.0, needWeight: true },
      { id: 'kettlebell_squat', name: '壶铃深蹲', aliases: ['壶铃深蹲'], met: 5.5, needWeight: true },
      { id: 'kettlebell_deadlift', name: '壶铃硬拉', aliases: ['壶铃硬拉'], met: 5.5, needWeight: true },
      { id: 'kettlebell_press', name: '壶铃推举', aliases: ['壶铃推举'], met: 5.0, needWeight: true },
      { id: 'kettlebell_goblet_squat', name: '壶铃高脚杯深蹲', aliases: ['高脚杯深蹲'], met: 5.5, needWeight: true },
      { id: 'turkish_getup', name: '土耳其起立', aliases: ['土耳其起立'], met: 5.0, needWeight: true },
      { id: 'kettlebell_snatch', name: '壶铃甩摆', aliases: ['壶铃甩摆', '壶铃抓举'], met: 6.5, needWeight: true }
    ]
  },
  {
    groupName: '器锻筋骨类',
    groupDesc: '固定器械训练',
    items: [
      { id: 'machine_chest_press', name: '坐姿推胸器', aliases: ['推胸器', '坐姿推胸'], met: 4.0, needWeight: true },
      { id: 'pec_dec', name: '蝴蝶机夹胸', aliases: ['蝴蝶机', '夹胸'], met: 3.5, needWeight: true },
      { id: 'machine_shoulder_press', name: '坐姿肩推器', aliases: ['肩推器', '坐姿肩推'], met: 4.0, needWeight: true },
      { id: 'machine_lateral_raise', name: '器械侧平举', aliases: ['器械侧平举'], met: 3.0, needWeight: true },
      { id: 'machine_pec_fly', name: '器械夹胸', aliases: ['器械夹胸'], met: 3.5, needWeight: true },
      { id: 'lat_pulldown', name: '高位下拉器', aliases: ['高位下拉', '下拉'], met: 4.5, needWeight: true },
      { id: 'wide_lat_pulldown', name: '宽距高位下拉', aliases: ['宽距下拉'], met: 4.5, needWeight: true },
      { id: 'narrow_lat_pulldown', name: '窄距高位下拉', aliases: ['窄距下拉'], met: 4.5, needWeight: true },
      { id: 'seated_row', name: '坐姿划船器', aliases: ['坐姿划船', '划船器'], met: 4.5, needWeight: true },
      { id: 'machine_curl', name: '二头弯举器', aliases: ['弯举器', '二头弯举器'], met: 3.0, needWeight: true },
      { id: 'tricep_pushdown', name: '三头下压器', aliases: ['三头下压', '下压器'], met: 3.0, needWeight: true },
      { id: 'cable_pushdown', name: '绳索下压', aliases: ['绳索下压'], met: 3.5, needWeight: true },
      { id: 'leg_press', name: '腿举机', aliases: ['腿举', '腿举机', '倒蹬'], met: 5.5, needWeight: true },
      { id: 'hack_squat', name: '哈克深蹲', aliases: ['哈克深蹲', '哈克机'], met: 5.5, needWeight: true },
      { id: 'leg_extension', name: '腿屈伸', aliases: ['腿屈伸', '股四头'], met: 3.5, needWeight: true },
      { id: 'leg_curl', name: '腿弯举', aliases: ['腿弯举', '股二头'], met: 3.5, needWeight: true },
      { id: 'hip_abduction', name: '髋外展机', aliases: ['髋外展'], met: 3.0, needWeight: true },
      { id: 'hip_adduction', name: '髋内收机', aliases: ['髋内收'], met: 3.0, needWeight: true },
      { id: 'seated_calf_raise', name: '坐姿提踵机', aliases: ['坐姿提踵', '提踵机'], met: 2.5, needWeight: true },
      { id: 'standing_calf_raise', name: '站姿提踵机', aliases: ['站姿提踵', '站姿提踵机'], met: 3.0, needWeight: true },
      { id: 'hip_thrust_machine', name: '臀推机', aliases: ['臀推机'], met: 4.5, needWeight: true }
    ]
  },
  {
    groupName: '核心凝气类',
    groupDesc: '腰腹核心专项',
    items: [
      { id: 'crunch', name: '卷腹', aliases: ['卷腹', 'crunch'], met: 3.0, needWeight: false },
      { id: 'reverse_crunch', name: '反向卷腹', aliases: ['反向卷腹'], met: 3.0, needWeight: false },
      { id: 'sit_up', name: '仰卧起坐', aliases: ['仰卧起坐', 'situp'], met: 4.0, needWeight: false },
      { id: 'russian_twist', name: '俄罗斯转体', aliases: ['俄罗斯转体'], met: 3.5, needWeight: false },
      { id: 'mountain_climber', name: '登山跑', aliases: ['登山跑', '登山者'], met: 7.0, needWeight: false },
      { id: 'hanging_leg_raise', name: '悬垂举腿', aliases: ['悬垂举腿'], met: 5.0, needWeight: false },
      { id: 'lying_leg_raise', name: '仰卧抬腿', aliases: ['仰卧抬腿'], met: 3.5, needWeight: false },
      { id: 'side_crunch', name: '侧卧卷腹', aliases: ['侧卧卷腹'], met: 3.0, needWeight: false },
      { id: 'dragon_flag', name: '龙旗', aliases: ['龙旗'], met: 5.5, needWeight: false }
    ]
  }
]

// ========== 炼气类（有氧心肺训练） ==========

var LIANQI_GROUPS = [
  {
    groupName: '行功炼气类',
    groupDesc: '户外有氧运动',
    items: [
      { id: 'jogging', name: '慢跑', aliases: ['慢跑', '跑步', 'jog'], met: 7.0, needWeight: false },
      { id: 'sprinting', name: '快跑', aliases: ['快跑', '冲刺', 'sprint'], met: 12.0, needWeight: false },
      { id: 'interval_run', name: '间歇跑', aliases: ['间歇跑'], met: 10.0, needWeight: false },
      { id: 'trail_run', name: '越野跑', aliases: ['越野跑'], met: 8.0, needWeight: false },
      { id: 'morning_run', name: '晨跑', aliases: ['晨跑'], met: 7.0, needWeight: false },
      { id: 'night_run', name: '夜跑', aliases: ['夜跑'], met: 7.0, needWeight: false },
      { id: 'brisk_walk', name: '快走', aliases: ['快走', '健走'], met: 4.5, needWeight: false },
      { id: 'walking', name: '散步', aliases: ['散步', '走路'], met: 3.0, needWeight: false },
      { id: 'hiking', name: '徒步', aliases: ['徒步'], met: 5.0, needWeight: false },
      { id: 'long_hike', name: '长距离徒步', aliases: ['长距离徒步', '长线徒步'], met: 5.5, needWeight: false },
      { id: 'mountain_climbing', name: '登山', aliases: ['登山', '爬山'], met: 6.0, needWeight: false },
      { id: 'stair_climbing', name: '爬楼', aliases: ['爬楼', '爬楼梯'], met: 7.0, needWeight: false },
      { id: 'road_cycling', name: '公路骑行', aliases: ['公路骑行', '公路车'], met: 7.0, needWeight: false },
      { id: 'mountain_cycling', name: '山地骑行', aliases: ['山地骑行', '山地车'], met: 7.5, needWeight: false },
      { id: 'leisure_cycling', name: '休闲骑行', aliases: ['休闲骑行', '骑车'], met: 5.0, needWeight: false },
      { id: 'freestyle_swim', name: '自由泳', aliases: ['自由泳', '游泳'], met: 8.0, needWeight: false },
      { id: 'breaststroke', name: '蛙泳', aliases: ['蛙泳'], met: 7.0, needWeight: false },
      { id: 'backstroke', name: '仰泳', aliases: ['仰泳'], met: 6.0, needWeight: false },
      { id: 'butterfly', name: '蝶泳', aliases: ['蝶泳'], met: 11.0, needWeight: false },
      { id: 'paddleboard', name: '桨板', aliases: ['桨板', 'SUP'], met: 3.5, needWeight: false },
      { id: 'kayaking', name: '皮划艇', aliases: ['皮划艇', '独木舟'], met: 5.0, needWeight: false }
    ]
  },
  {
    groupName: '静息吐纳类',
    groupDesc: '室内器械有氧',
    items: [
      { id: 'treadmill_jog', name: '跑步机慢跑', aliases: ['跑步机慢跑', '跑步机'], met: 7.0, needWeight: false },
      { id: 'treadmill_walk', name: '跑步机快走', aliases: ['跑步机快走', '跑步机走'], met: 4.5, needWeight: false },
      { id: 'treadmill_incline', name: '跑步机爬坡', aliases: ['跑步机爬坡', '坡度走'], met: 5.5, needWeight: false },
      { id: 'elliptical', name: '椭圆机', aliases: ['椭圆机', '椭圆仪'], met: 6.0, needWeight: false },
      { id: 'spinning', name: '动感单车', aliases: ['动感单车', '单车'], met: 8.5, needWeight: false },
      { id: 'rowing_machine', name: '划船机', aliases: ['划船机'], met: 7.0, needWeight: false },
      { id: 'stair_master', name: '爬楼机', aliases: ['爬楼机'], met: 7.5, needWeight: false },
      { id: 'stepper', name: '踏步机', aliases: ['踏步机'], met: 4.0, needWeight: false },
      { id: 'climb_mill', name: '登山机', aliases: ['登山机'], met: 7.5, needWeight: false }
    ]
  },
  {
    groupName: '灵动身法类',
    groupDesc: '徒手/间歇有氧',
    items: [
      { id: 'rope_skipping', name: '跳绳', aliases: ['跳绳', '跳繩'], met: 10.0, needWeight: false },
      { id: 'jumping_jack', name: '开合跳', aliases: ['开合跳'], met: 8.0, needWeight: false },
      { id: 'burpee', name: '波比跳', aliases: ['波比跳', 'burpee'], met: 10.0, needWeight: false },
      { id: 'high_knee', name: '高抬腿', aliases: ['高抬腿'], met: 7.0, needWeight: false },
      { id: 'jog_in_place', name: '原地跑', aliases: ['原地跑'], met: 6.0, needWeight: false },
      { id: 'shuttlecock', name: '踢毽子', aliases: ['踢毽子', '毽子'], met: 4.0, needWeight: false },
      { id: 'tai_chi', name: '太极拳', aliases: ['太极拳', '太极'], met: 3.0, needWeight: false },
      { id: 'baduanjin', name: '八段锦', aliases: ['八段锦'], met: 3.0, needWeight: false },
      { id: 'yijinjing', name: '易筋经', aliases: ['易筋经'], met: 3.0, needWeight: false },
      { id: 'slow_walk', name: '慢走', aliases: ['慢走'], met: 2.5, needWeight: false },
      { id: 'zhan_zhuang', name: '站桩', aliases: ['站桩'], met: 1.5, needWeight: false },
      { id: 'hiit', name: 'HIIT训练', aliases: ['HIIT', '高强度间歇'], met: 10.0, needWeight: false },
      { id: 'tabata', name: 'Tabata训练', aliases: ['Tabata', '塔巴塔'], met: 11.0, needWeight: false },
      { id: 'cross_jack', name: '胯下击掌', aliases: ['胯下击掌'], met: 7.0, needWeight: false },
      { id: 'butt_kick', name: '后踢腿跑', aliases: ['后踢腿跑'], met: 6.5, needWeight: false }
    ]
  },
  {
    groupName: '游艺炼气类',
    groupDesc: '球类与休闲有氧',
    items: [
      { id: 'basketball', name: '篮球', aliases: ['篮球', '打篮球'], met: 6.5, needWeight: false },
      { id: 'badminton', name: '羽毛球', aliases: ['羽毛球', '打羽毛球'], met: 5.5, needWeight: false },
      { id: 'table_tennis', name: '乒乓球', aliases: ['乒乓球', '打乒乓'], met: 4.0, needWeight: false },
      { id: 'tennis', name: '网球', aliases: ['网球', '打网球'], met: 7.0, needWeight: false },
      { id: 'soccer', name: '足球', aliases: ['足球', '踢球'], met: 7.5, needWeight: false },
      { id: 'volleyball', name: '排球', aliases: ['排球', '打排球'], met: 4.0, needWeight: false },
      { id: 'squash', name: '壁球', aliases: ['壁球'], met: 7.5, needWeight: false },
      { id: 'badminton_singles', name: '羽毛球单打', aliases: ['羽毛球单打'], met: 5.5, needWeight: false },
      { id: 'badminton_doubles', name: '羽毛球双打', aliases: ['羽毛球双打'], met: 4.5, needWeight: false },
      { id: 'bowling', name: '保龄球', aliases: ['保龄球'], met: 3.5, needWeight: false },
      { id: 'golf', name: '高尔夫', aliases: ['高尔夫', '高尔夫球'], met: 4.0, needWeight: false },
      { id: 'frisbee', name: '飞盘', aliases: ['飞盘', '极限飞盘'], met: 4.5, needWeight: false },
      { id: 'archery', name: '射箭', aliases: ['射箭'], met: 3.5, needWeight: false }
    ]
  }
]

// ========== 汇总工具函数 ==========

/**
 * 获取炼体类全量动作（扁平列表）
 */
function getLiantiMovements() {
  var result = []
  LIANTI_GROUPS.forEach(function(g) {
    g.items.forEach(function(item) {
      result.push({
        id: item.id,
        name: item.name,
        aliases: item.aliases,
        trainingPath: 'lianti',
        groupName: g.groupName,
        met: item.met,
        needWeight: item.needWeight,
        boneCategory: 'strength'
      })
    })
  })
  return result
}

/**
 * 获取炼气类全量动作（扁平列表）
 */
function getLianqiMovements() {
  var result = []
  LIANQI_GROUPS.forEach(function(g) {
    g.items.forEach(function(item) {
      var boneCat = MIND_MOVEMENT_IDS.indexOf(item.id) !== -1 ? 'mind' : 'endurance'
      result.push({
        id: item.id,
        name: item.name,
        aliases: item.aliases,
        trainingPath: 'lianqi',
        groupName: g.groupName,
        met: item.met,
        needWeight: item.needWeight,
        boneCategory: boneCat
      })
    })
  })
  return result
}

/**
 * 按道途获取全量动作（兼容旧接口）
 */
function getMovementsByPath(pathKey) {
  if (pathKey === 'lianti') return getLiantiMovements()
  if (pathKey === 'lianqi') return getLianqiMovements()
  return []
}

/**
 * 获取炼体类分组结构（前端分组展示用）
 */
function getLiantiGroups() {
  return LIANTI_GROUPS.map(function(g) {
    return {
      groupName: g.groupName,
      groupDesc: g.groupDesc,
      items: g.items.map(function(item) {
        return {
          id: item.id,
          name: item.name,
          aliases: item.aliases,
          trainingPath: 'lianti',
          met: item.met,
          needWeight: item.needWeight
        }
      })
    }
  })
}

/**
 * 获取炼气类分组结构（前端分组展示用）
 */
function getLianqiGroups() {
  return LIANQI_GROUPS.map(function(g) {
    return {
      groupName: g.groupName,
      groupDesc: g.groupDesc,
      items: g.items.map(function(item) {
        return {
          id: item.id,
          name: item.name,
          aliases: item.aliases,
          trainingPath: 'lianqi',
          met: item.met,
          needWeight: item.needWeight
        }
      })
    }
  })
}

/**
 * 模糊搜索动作
 * @param {string} pathKey - 'lianti' | 'lianqi'
 * @param {string} query - 搜索关键词
 * @returns {array} 匹配的动作列表
 */
function searchMovements(pathKey, query) {
  if (!query) return getMovementsByPath(pathKey)
  var q = query.toLowerCase()
  var all = getMovementsByPath(pathKey)
  return all.filter(function(m) {
    if (m.name.toLowerCase().indexOf(q) !== -1) return true
    if (m.id.toLowerCase().indexOf(q) !== -1) return true
    return (m.aliases || []).some(function(a) { return a.toLowerCase().indexOf(q) !== -1 })
  })
}

/**
 * 根据运动名称（含别名）查找动作id和道途
 * @param {string} query - 运动名称/别名
 * @returns {object|null} { id, name, trainingPath }
 */
function resolveSportName(query) {
  if (!query) return null
  var q = query.toLowerCase().trim()
  var all = getLiantiMovements().concat(getLianqiMovements())
  for (var i = 0; i < all.length; i++) {
    var m = all[i]
    if (m.name.toLowerCase() === q || m.id === q) return { id: m.id, name: m.name, trainingPath: m.trainingPath }
    for (var j = 0; j < (m.aliases || []).length; j++) {
      if (m.aliases[j].toLowerCase() === q) return { id: m.id, name: m.name, trainingPath: m.trainingPath }
    }
  }
  // 模糊匹配（包含关系）
  for (var k = 0; k < all.length; k++) {
    var mk = all[k]
    if (mk.name.toLowerCase().indexOf(q) !== -1) return { id: mk.id, name: mk.name, trainingPath: mk.trainingPath }
    if (mk.aliases) {
      for (var a = 0; a < mk.aliases.length; a++) {
        if (mk.aliases[a].toLowerCase().indexOf(q) !== -1) return { id: mk.id, name: mk.name, trainingPath: mk.trainingPath }
      }
    }
  }
  return null
}

/**
 * 获取动作 MET 值
 */
function getMovementMet(movementId) {
  var all = getLiantiMovements().concat(getLianqiMovements())
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === movementId) return all[i].met
  }
  return 4.0
}

/**
 * 获取道童AI识别用的运动名称关键词列表
 */
function getSportAliasMap() {
  var map = {}
  var all = getLiantiMovements().concat(getLianqiMovements())
  all.forEach(function(m) {
    var names = [m.name].concat(m.aliases || [])
    names.forEach(function(n) {
      var key = n.toLowerCase()
      if (!map[key]) {
        map[key] = { id: m.id, name: m.name, trainingPath: m.trainingPath }
      }
    })
  })
  return map
}

// ============================================================
// 根骨品类映射（运动动作 → 六大根骨品类）
// ============================================================

/**
 * 灵动身法类中需要映射到「神之根骨/mind」的动作ID
 */
var MIND_MOVEMENT_IDS = ['tai_chi', 'baduanjin', 'yijinjing', 'zhan_zhuang', 'slow_walk']

/**
 * 根据运动动作 ID 获取对应的根骨品类
 *   lianti 类 → 'strength'（力之根骨）
 *   lianqi 类 → 'endurance'（体之根骨）
 *   养生/冥想类 → 'mind'（神之根骨）
 * @returns {string} boneCategory - 'strength'|'endurance'|'mind'
 */
function getBoneCategory(movementId) {
  if (MIND_MOVEMENT_IDS.indexOf(movementId) !== -1) return 'mind'

  var allLianti = getLiantiMovements()
  for (var i = 0; i < allLianti.length; i++) {
    if (allLianti[i].id === movementId) return 'strength'
  }
  var allLianqi = getLianqiMovements()
  for (var j = 0; j < allLianqi.length; j++) {
    if (allLianqi[j].id === movementId) return 'endurance'
  }
  return null
}

/**
 * 获取各根骨品类包含的运动动作 ID 列表
 */
function getMovementIdsByBoneCategory(boneCategory) {
  if (boneCategory === 'strength') {
    return getLiantiMovements().map(function(m) { return m.id })
  }
  if (boneCategory === 'endurance') {
    return getLianqiMovements().filter(function(m) { return MIND_MOVEMENT_IDS.indexOf(m.id) === -1 }).map(function(m) { return m.id })
  }
  if (boneCategory === 'mind') {
    return MIND_MOVEMENT_IDS.slice()
  }
  return []
}

/**
 * 按根骨品类获取全量运动动作（含 boneCategory 字段）
 * @param {string} boneCategory - 'strength'|'endurance'|'mind'
 */
function getAllMovementsByBone(boneCategory) {
  if (boneCategory === 'strength') return getLiantiMovements()
  if (boneCategory === 'endurance') return getLianqiMovements().filter(function(m) { return m.boneCategory === 'endurance' })
  if (boneCategory === 'mind') return getLianqiMovements().filter(function(m) { return m.boneCategory === 'mind' })
  return []
}

module.exports = {
  LIANTI_GROUPS: LIANTI_GROUPS,
  LIANQI_GROUPS: LIANQI_GROUPS,
  getLiantiMovements: getLiantiMovements,
  getLianqiMovements: getLianqiMovements,
  getMovementsByPath: getMovementsByPath,
  getLiantiGroups: getLiantiGroups,
  getLianqiGroups: getLianqiGroups,
  searchMovements: searchMovements,
  resolveSportName: resolveSportName,
  getMovementMet: getMovementMet,
  getSportAliasMap: getSportAliasMap,
  getBoneCategory: getBoneCategory,
  getMovementIdsByBoneCategory: getMovementIdsByBoneCategory,
  getAllMovementsByBone: getAllMovementsByBone
}
