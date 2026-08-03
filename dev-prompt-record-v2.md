# 微信小程序「天道修行」记录页 v2 开发指令

## 项目背景
这是一个微信小程序云开发项目，根目录：`C:\Users\1\Desktop\workspace\统子\tiandao-pre-daotong`
当前未上线，无历史数据兼容问题，可以直接删除旧逻辑重写。

---

## 一、核心目标
废除原有的「选动作-填组数次数」表单式记录逻辑，改为**「模板驱动+双模式拖动」**的新记录方式。

---

## 二、必须删除/废弃的旧文件与旧逻辑

### 直接删除的文件
- 检查 `pages/record/` 下有没有 .bak 备份文件，有就直接删

### 要重写的文件（清空旧内容，从零写v2）
- `pages/record/record.js`（原61KB旧逻辑全部废弃）
- `pages/record/record.wxml`（原46KB旧表单全部废弃）
- `pages/record/record.wxss`（原36KB旧样式全部废弃）
- `pages/record/record.json`（更新组件引用）

### 不再使用的旧工具文件（保留文件但不要在新代码中引用）
- `utils/sport-movements.js`（具体动作库，新逻辑不需要选具体动作）
- `utils/sport-predictor.js`（旧动作预测逻辑废弃）
- `utils/diet-scoring.js`（旧饮食打分逻辑废弃）
- `utils/training-metrics.js`（旧训练指标废弃）

---

## 三、新架构总览

### 三层结构
```
┌─────────────────────────────────────────┐
│  底层：活动库（已存在 utils/activity-library.js）│
│  原子活动数据，每个活动有分类、分值、元数据  │
└─────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────┐
│  中层：模板（已存在 utils/custom-preset.js）│
│  = 活动ID的有序集合，用户自定义/公共模板   │
└─────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────┐
│  上层：新记录页（本次开发）              │
│  选分类 → 选模板 → 双模式拖动设完成度 → 实时汇总│
└─────────────────────────────────────────┘
```

### 新增文件清单
1. `utils/activity-meta.js` — 活动元数据扩展（肌群、热量、营养）
2. `utils/template-progress.js` — 模板进度计算引擎
3. `components/template-progress-card/` — 模板进度卡片组件（支持展开/收起、双模式拖动）
4. `components/activity-progress-item/` — 单个活动进度条组件
5. `components/daily-result-panel/` — 底部结果汇总面板组件
6. `pages/record/record.js/wxml/wxss/json` — 全新记录页

---

## 四、详细数据结构

### 4.1 活动元数据扩展（`utils/activity-meta.js`）
给活动库中的每个活动补充计算用的元数据。

```javascript
// 武·炼体类活动元数据
const WU_ACTIVITY_META = {
  // 活动id: {
  //   muscles: { 肌群key: 激活权重0~1 },
  //   caloriesPerUnit: 每单位消耗大卡,
  //   category: 'push/pull/squat/core/cardio'
  // }
  barbell_bench_press: {
    muscles: { chest: 1.0, triceps: 0.6, shoulder_front: 0.4 },
    caloriesPerUnit: 8, // 每组8大卡
    category: 'push'
  },
  dumbbell_fly: {
    muscles: { chest: 0.9, shoulder_front: 0.3 },
    caloriesPerUnit: 5,
    category: 'push'
  },
  // ... 至少给活动库中前30个常用武类活动加上元数据
  // 其他没有的活动给默认值：muscles: { full_body: 0.5 }, caloriesPerUnit: 3
}

// 食·丹食类活动元数据
const SHI_ACTIVITY_META = {
  // 活动id: {
  //   nutrition: { protein: 克数, carbs: 克数, fat: 克数, fiber: 克数 },
  //   caloriesPerUnit: 每单位大卡
  // }
  chicken_breast_100g: {
    nutrition: { protein: 31, carbs: 0, fat: 3.6 },
    caloriesPerUnit: 165
  },
  rice_100g: {
    nutrition: { protein: 2.6, carbs: 28, fat: 0.3 },
    caloriesPerUnit: 130
  },
  // ... 至少给活动库中前30个常用食类活动加上元数据
  // 其他没有的给默认值：nutrition: { carbs: 10 }, caloriesPerUnit: 50
}

// 肌群名称映射
const MUSCLE_NAMES = {
  chest: '胸肌', back: '背部', shoulders: '肩部', biceps: '肱二头肌',
  triceps: '肱三头肌', quads: '股四头肌', hamstrings: '腘绳肌',
  glutes: '臀肌', abs: '腹肌', obliques: '腹斜肌', calves: '小腿',
  heart: '心肺', full_body: '全身'
}

module.exports = {
  WU_ACTIVITY_META,
  SHI_ACTIVITY_META,
  MUSCLE_NAMES,
  getActivityMeta
}
```

### 4.2 进度计算引擎（`utils/template-progress.js`）

核心函数：

```javascript
/**
 * 计算单个模板的总进度
 * @param {Object} template 模板对象，包含activities数组
 * @param {Object} activityProgress { activityId: 0~100 }
 * @returns {Number} 总进度0~100，按各活动scorePerUnit加权平均
 */
function calcTemplateTotalProgress(template, activityProgress) {}

/**
 * 计算模板结果（武类）
 * @param {Object} template
 * @param {Object} activityProgress
 * @returns {
 *   totalCalories: 总消耗大卡,
 *   totalGong: 总修为,
 *   muscleActivation: { 肌群key: 激活度0~1 },
 *   trainedMuscleCount: 训练肌群数量
 * }
 */
function calcWuTemplateResult(template, activityProgress) {}

/**
 * 计算模板结果（食类）
 * @param {Object} template
 * @param {Object} activityProgress
 * @returns {
 *   totalCalories: 总摄入大卡,
 *   totalGong: 总修为,
 *   nutrition: { protein, carbs, fat, fiber },
 *   macroRatio: { protein:%, carbs:%, fat:% }
 * }
 */
function calcShiTemplateResult(template, activityProgress) {}

/**
 * 模糊设置总进度时，按比例分配给所有活动
 * @param {Number} totalProgress 0~100
 * @param {Array} activities
 * @returns {Object} { activityId: progress }
 */
function distributeProgressToActivities(totalProgress, activities) {}
```

---

## 五、组件详细设计

### 5.1 单个活动进度项 `components/activity-progress-item/`

**属性**：
- `activity`：活动对象（id, name, unit, scorePerUnit, icon）
- `progress`：Number 0~100
- `categoryColor`：分类主题色

**事件**：
- `change`：进度变化时触发，detail = { activityId, progress }

**UI**：
- 高度56px，左侧活动名+单位，右侧百分比数字
- 背景：`linear-gradient(90deg, ${categoryColor}15 ${progress}%, transparent ${progress}%)`
- 支持上下拖动改进度，步长5%
- 点击弹出slider精确调整

### 5.2 模板进度卡片 `components/template-progress-card/`

**属性**：
- `template`：模板对象（id, name, cover, themeClass, activities数组）
- `category`：当前分类（wu/shi/wu2/gong/sha）
- `expanded`：Boolean，是否展开

**事件**：
- `toggle-expand`：点击展开/收起
- `progress-change`：任何进度变化时触发，detail = { templateId, totalProgress, activityProgress }

**交互逻辑**：
1. **收起状态（模糊模式）**：
   - 卡片高度72px，显示模板封面字、模板名、总进度%、预计修为+N
   - 直接在卡片上上下拖动 = 设置总进度
   - 拖动时内部调用 `distributeProgressToActivities` 按比例分配给所有活动
   - 背景色随总进度从灰到主题色渐变

2. **展开状态（精准模式）**：
   - 卡片高度自动撑开，顶部模板信息栏不变
   - 下方纵向排列该模板包含的所有 `activity-progress-item`
   - 可以单独拖每个活动的进度
   - 单个活动变化时，自动重算总进度（加权平均）并更新顶部显示

3. **双向同步**：
   - 收起态拖总进度 → 展开后所有活动进度同步更新
   - 展开态调单个活动 → 收起后总进度为新的加权值

**视觉**：
- 展开/收起有300ms动画
- 进度100%时卡片加轻微发光效果
- 右上角箭头图标指示展开状态

### 5.3 结果汇总面板 `components/daily-result-panel/`

**属性**：
- `activeCategory`：当前分类
- `result`：calcWuTemplateResult/calcShiTemplateResult返回的结果对象

**UI（武类）**：
1. 顶部汇总栏：`总消耗 XX 大卡 · 总修为 +XX · 训练肌群 X 处`
2. 肌群激活条形图：胸/背/腿/肩/臂/核心/有氧 各一个进度条，显示激活度
3. 颜色用武类红色系

**UI（食类）**：
1. 顶部汇总栏：`总摄入 XX 大卡 · 总修为 +XX`
2. 三大营养素环形图：蛋白/碳水/脂肪 比例
3. 各营养素摄入克数：蛋白XXg / 碳水XXg / 脂肪XXg
4. 颜色用食类橙色系

**UI（悟/工/煞）**：
- 先显示占位文字：「该道途结果统计将在后续版本开放」

---

## 六、新记录页 `pages/record/` 详细设计

### 页面结构（从上到下）
```
[顶部Tab栏] 武·炼体 | 食·丹食 | 悟·修心 | 工·功业 | 煞·心魔
    ↓
[模板选择栏] 横向滚动，显示用户该分类下的模板封面，点选切换
    ↓
[模板进度区] 纵向排列当前选中模板的 template-progress-card
    ↓
[结果面板] daily-result-panel，实时显示汇总结果
    ↓
[底部提交按钮] 「确认今日修行」
```

### 页面逻辑
1. `onLoad`：
   - 读取用户已启用的模板（从custom-preset.js）
   - 默认选中第一个模板，所有活动进度初始0%
   - 计算初始结果

2. **Tab切换**：
   - 切换分类时，自动加载该分类下用户的模板
   - 自动选中该分类第一个模板
   - 结果面板切换对应分类的显示

3. **模板切换**：
   - 点顶部模板封面切换当前编辑的模板
   - 进度状态每个模板独立保存（切走再回来还是之前设的进度）

4. **进度变化**：
   - 任何模板/活动进度变化时，debounce 200ms重算结果
   - 结果面板实时更新

5. **提交逻辑**：
   - 汇总所有模板的所有活动进度
   - 调用现有云函数/接口写入今日记录
   - 计算总修为，触发境界检查等现有逻辑
   - 成功后返回首页

### 样式要求
- 背景色：#F9FAFB（和现有app一致）
- 卡片圆角：16px
- 卡片阴影：轻微阴影，不要太重
- 主题色：
  - 武：#EF4444
  - 食：#F59E0B
  - 悟：#8B5CF6
  - 工：#3B82F6
  - 煞：#6B7280
- 整体风格：极简、干净、有修仙感但不要花哨

---

## 七、编码规范与注意事项

1. **编码格式**：所有文件必须使用 UTF-8 编码，绝对不能出现乱码
2. **不要有中文乱码**：所有中文注释、中文文案直接写，不要转义
3. **不要保留旧代码**：record.js/wxml/wxss清空重写，不要留着旧代码注释掉
4. **复用现有能力**：
   - 模板读取用现有 `utils/custom-preset.js`
   - 活动数据用现有 `utils/activity-library.js`
   - 先读一遍这两个文件，搞清楚现有数据结构再写
   - 修为计算复用现有 `utils/score.js` 中的逻辑
   - 云函数调用复用现有封装
5. **组件要通用**：不要写死，方便后续加悟/工/煞三类
6. **性能**：进度拖动时不要频繁setData，用debounce
7. **不要引入新依赖**：只用小程序原生能力和现有工具

---

## 八、验收标准
1. 打开记录页，顶部5个tab可以切换
2. 武类下显示用户的练相关模板，食类下显示吃相关模板
3. 模板卡片收起时可以上下拖动设总进度，颜色渐变，数字实时变
4. 点展开箭头可以看到模板内所有活动，每个可以单独拖进度
5. 单拖活动时总进度自动更新；拖总进度时所有活动按比例更新
6. 底部结果面板实时显示：
   - 武：总消耗大卡、总修为、肌群训练情况
   - 食：总摄入大卡、总修为、三大营养素
7. 点提交可以正常保存记录，修为正确增加
8. 所有中文显示正常，无乱码
9. 旧的选动作、填组数次数表单完全消失
