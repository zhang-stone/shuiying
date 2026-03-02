# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

**隐私水印** —— 一款微信小程序，完全离线运行，用户可为图片添加自定义全屏平铺水印以防盗用。无服务器依赖，所有处理在本地完成。

## 开发工具

- 使用**微信开发者工具**打开 `shuiying/` 目录导入项目（无 npm/webpack，原生微信小程序）
- 无构建命令、无测试命令，验证方式见下文

## 验证方式

1. 微信开发者工具导入项目，检查 Canvas 预览是否正常渲染
2. 调节各滑块（字号/透明度/角度），验证水印实时更新
3. 点击"保存到相册"，在手机相册确认高清图生成正确
4. 测试边缘角度（0°、±90°），验证平铺无空白
5. 测试权限拒绝后的引导流程

## 代码架构

### 页面流程

```
index 页（选图入口）→ [tempFilePath via URL 参数] → editor 页（水印配置 + 预览 + 保存）
```

### 核心模块

| 文件 | 职责 |
|------|------|
| `pages/index/` | 首页，使用 `wx.chooseMedia` 选图，跳转 editor |
| `pages/editor/` | 编辑页，水印参数配置、Canvas 实时预览、高清导出 |
| `utils/watermark.js` | 核心水印绘制引擎（平铺算法） |
| `utils/permission.js` | 相册权限申请，被拒后引导 `wx.openSetting` |

### 水印绘制引擎（utils/watermark.js）

平铺算法步骤：
1. `ctx.clearRect` + `ctx.drawImage` 绘制原图
2. `ctx.measureText(text)` 测量文字宽度
3. 计算旋转后包围盒 `diagW/diagH` 作为平铺间距
4. 双重循环范围：`[-expandRange, W+expandRange] × [-expandRange, H+expandRange]`（`expandRange = max(W,H)`，防止旋转后边角空白）
5. 每个文字：`ctx.save → translate → rotate(rad) → fillText → restore`

可配置参数：`text`、`fontSize`（12~60px）、`opacity`（5%~80%）、`angle`（-90°~90°）、`color`（白/黑/红/蓝/灰/金）

### 关键技术约束

| 问题 | 解决方案 |
|------|---------|
| Canvas API 版本 | WXML 必须写 `type="2d"`，JS 用 `createSelectorQuery` 获取 node，`ctx.scale(dpr, dpr)` 适配高分辨率 |
| 高清导出 | 用 `wx.createOffscreenCanvas` 以原图分辨率重绘，字体按 `scaleFactor = originW / canvasW` 等比放大，再 `toTempFilePath` → `wx.saveImageToPhotosAlbum` |
| 输入防抖 | 文字输入 300ms 防抖，避免频繁重绘 |
| 权限申请 | 按需申请（点击时才授权），不在启动时预申请 |

## 部署

将 `project.config.json` 中的 `appid` 替换为真实 AppID 后，用微信开发者工具上传代码。
