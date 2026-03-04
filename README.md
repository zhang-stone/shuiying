# Shuiying

一个微信小程序，用于给图片添加可配置文字水印。

## 功能

- 从相册选择或拍照上传图片
- 实时预览水印效果
- 可调参数：
  - 水印文字
  - 字体颜色
  - 透明度
  - 字体大小
  - 间距
  - 倾斜角度
- 导出并保存到相册

## 技术说明

- 前端框架：微信小程序原生
- 核心绘制：Canvas 2D
- 处理方式：本地端内处理，不上传图片

## 本地开发

1. 打开微信开发者工具
2. 导入项目目录：`/Users/zhangzhenghe/stone/shuiying`
3. 使用小程序 AppID 运行与预览

## 目录结构

```text
pages/
  index/      # 首页（选图入口）
  editor/     # 编辑页（参数调整与保存）
utils/
  watermark.js # 水印绘制引擎
  permission.js
```

