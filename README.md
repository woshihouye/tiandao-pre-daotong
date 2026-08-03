# 天道修行小程序

当前目录是微信原生小程序工程，负责修行首页、记录录入、AI 识别、基础炼体诀、精神模块、个人中心与设置分包。

## 目录职责

```text
tiandao-miniprogram/
├── app.js                      # 小程序全局入口、云开发初始化、全局事件与用户档案同步
├── app.json                    # 页面注册、分包配置、TabBar
├── app.wxss                    # 全局主题变量与基础通用样式
├── pages/                      # 主包页面
│   ├── index/                  # 首页总览与快捷入口
│   ├── vision/                 # AI 图片识别入口
│   ├── detail-board/           # 武/食/煞 详情看板
│   ├── foundation-technique/   # 基础炼体诀详情页
│   ├── record/                 # 手动记录录入
│   ├── templates/              # 秘籍列表
│   ├── spirit/                 # 精神总览
│   │   ├── energy/             # 精力管理
│   │   └── mood/               # 心情记录
│   ├── cultivation/            # 修为面板（当前为占位实现）
│   ├── sect/                   # 宗门页（当前为占位实现）
│   └── profile/                # 我的页
├── packageB/                   # 低频页面分包
│   └── pages/
│       ├── settings/           # 设置页
│       ├── update-log/         # 更新日志
│       └── changelog/          # 历史变更页
└── utils/                      # 公共业务工具
    ├── cultivation.js          # 境界、修炼体系与修为算法
    ├── score.js                # 打分规则
    ├── detail-board.js         # 看板聚合与图表数据处理
    ├── foundation-technique.js # 基础炼体诀算法
    └── vision.js               # AI 识别相关工具
```

## 页面分层

- 主包页面：高频访问页面与首页主流程，见 `pages/`
- 分包页面：设置与日志说明页，见 `packageB/pages/`
- 工具层：跨页面复用算法与数据聚合逻辑，见 `utils/`

## 关键集合

- `users`：用户资料、修行体系、身体数据、累计修为
- `records`：运动、饮食、恶习等修行记录
- `daily_spirit`：精力与心情记录

## 开发约定

- 新增高频业务页面优先放主包 `pages/`
- 低频说明类页面优先放分包 `packageB/pages/`
- 页面间共享算法应收敛到 `utils/`，不要在多个页面重复实现
- 页面依赖的全局能力统一从 `app.js` 获取，不在页面各自散落初始化

## 运行说明

1. 用微信开发者工具打开当前目录
2. 确认 `app.js` 中云环境 ID 配置正确
3. 确认云数据库已创建 `users`、`records`、`daily_spirit`
4. 编译运行并检查分包页面跳转是否正常
