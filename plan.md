# 隐私水印微信小程序

## 项目概述

开发一个"隐私水印"微信小程序

**功能：** 一款完全基于本地离线处理的图片隐私保护工具。用户无需上传图片至服务器，即可快速为证件照、屏幕截图或生活照片添加自定义的全屏平铺水印，防止图片被非法盗用或追踪。

---

## 项目文件结构

```
shuiying/
├── app.js
├── app.json                  # 路由 + 权限声明
├── app.wxss                  # 全局样式
├── project.config.json
├── sitemap.json
├── pages/
│   ├── index/                # 主页（选图入口 + 功能说明）
│   │   ├── index.js
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   └── index.json
│   └── editor/               # 编辑页（水印配置 + 预览 + 保存）
│       ├── editor.js
│       ├── editor.wxml
│       ├── editor.wxss
│       └── editor.json
└── utils/
    ├── watermark.js          # 核心水印绘制引擎
    └── permission.js         # 权限申请工具
```

---

## 核心功能模块

### 1. 图片选择（index 页）

- 使用 `wx.chooseMedia({ mediaType: ['image'], sourceType: ['album', 'camera'] })`
- 获得 `tempFilePath` 后通过 URL 参数跳转到 editor 页

### 2. 水印绘制引擎（utils/watermark.js）

**平铺算法核心逻辑：**

1. `ctx.clearRect` + `ctx.drawImage` 绘制原图
2. 测量文字宽度 `metrics = ctx.measureText(text)`
3. 计算旋转后包围盒：`diagW/diagH` 作为平铺间距
4. 双重循环范围：`[-expandRange, W+expandRange] × [-expandRange, H+expandRange]`（`expandRange = max(W,H)`，防止旋转后边缘空白）
5. 每个文字：`ctx.save → translate → rotate(rad) → fillText → restore`

**可配置参数：**

| 参数 | 说明 | 范围 |
|------|------|------|
| `text` | 水印文字 | 默认"仅供查阅" |
| `fontSize` | 字号 | 12~60px |
| `opacity` | 透明度（globalAlpha） | 5%~80% |
| `angle` | 倾斜角度 | -90°~90° |
| `color` | 颜色预设 | 白/黑/红/蓝/灰/金 |

### 3. Canvas 2D 初始化（editor 页）

必须使用新版 Canvas 2D API：WXML 写 `type="2d"`，JS 用 `createSelectorQuery` 获取 node，`ctx.scale(dpr, dpr)` 适配高分辨率屏幕。

### 4. 高清导出保存

用 `wx.createOffscreenCanvas` 以原图分辨率重绘，字体按 `scaleFactor = originW / canvasW` 等比放大，再通过 `toTempFilePath` 导出并调用 `wx.saveImageToPhotosAlbum` 保存。

### 5. 权限管理（utils/permission.js）

- 选图时：被拒引导 `wx.openSetting`
- 保存前：`wx.authorize({ scope: 'scope.writePhotosAlbum' })`，被拒时引导设置页
- 原则：按需申请（点击时才授权），不在启动时预申请

---

## 编辑页 UI 布局

```
┌─────────────────────────┐
│  [导航栏] 水印编辑        │
├─────────────────────────┤
│  Canvas 实时预览          │  ← 占屏约 45%，type="2d"
├─────────────────────────┤
│ 水印文字 [输入框]          │
│ 字体大小 [Slider 12-60]   │
│ 透明度   [Slider 5-80%]   │
│ 倾斜角度 [Slider -90~90°] │
│ 水印颜色 [● ● ● ● ● ●]   │
│ [重置]      [保存到相册]   │
└─────────────────────────┘
```

---

## 技术栈

| 模块 | 方案 |
|------|------|
| 图片选择 | `wx.chooseMedia` |
| 水印绘制 | Canvas 2D，双重循环平铺算法 |
| 实时预览 | 参数变化 → `drawWatermark()`，文字输入 300ms 防抖 |
| 高清导出 | `wx.createOffscreenCanvas` + `toTempFilePath` |
| 保存 | `wx.saveImageToPhotosAlbum` |
| 网络依赖 | 无，完全离线 |

---

## 关键注意事项

| 问题 | 解决方案 |
|------|---------|
| Canvas 新旧 API | WXML 必须写 `type="2d"`，JS 用 `createSelectorQuery` 获取 node |
| 边缘空白 | `expandRange = max(W,H)`，平铺范围向外扩展 |
| 高清导出 | 用 `wx.createOffscreenCanvas` 以原图尺寸重绘，字体等比放大 |
| 权限审核 | 按需申请，不在启动时预申请 |
| 输入防抖 | 文字输入 300ms 防抖，避免频繁重绘 |

---

## 验证方式

1. 微信开发者工具导入项目，检查 Canvas 预览是否正常渲染
2. 调节各滑块，验证水印实时更新
3. 点击"保存到相册"，在手机相册确认高清图生成正确
4. 测试边缘角度（0°、±90°），验证平铺无空白
5. 测试权限拒绝后的引导流程

---

## 部署说明

- 将 `project.config.json` 中的 `appid` 替换为真实 AppID
- 用微信开发者工具打开 `shuiying/` 目录导入项目
- logo 图片放到 `/assets/logo.png`（可选）
