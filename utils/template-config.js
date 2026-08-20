// utils/template-config.js — 模板广场分类配置（唯一分类配置入口）
// 分类 key 锁死：li/gong/wu/yang/zi/hong
module.exports = {
  // 第一层：排序/来源筛选（sort/type 双处理）
  sortTabs: [
    { key: 'quality', label: '质量', sortBy: 'hot', type: 'all' },
    { key: 'new', label: '最新', sortBy: 'new', type: 'all' },
    { key: 'imports', label: '最多导入', sortBy: 'imports', type: 'all' },
    { key: 'user', label: '道友', sortBy: 'hot', type: 'user' }
  ],
  // 第二层：6 大道则分类
  categoryTabs: [
    { key: 'li', label: '力之大道' },
    { key: 'gong', label: '工之大道' },
    { key: 'wu', label: '悟之大道' },
    { key: 'yang', label: '养生道' },
    { key: 'zi', label: '自由道' },
    { key: 'hong', label: '红尘道' }
  ]
}
