/**
 * 水印绘制引擎
 * 支持全屏平铺、旋转角度、透明度、颜色、分布间距等参数配置
 */

/**
 * 在 Canvas 上绘制带水印的图片
 * @param {object} options
 * @param {object} options.canvas   - Canvas 节点 (type="2d")
 * @param {object} options.image    - 已加载的图片对象
 * @param {number} options.canvasW  - Canvas 显示宽度
 * @param {number} options.canvasH  - Canvas 显示高度
 * @param {string} options.text     - 水印文字
 * @param {number} options.fontSize - 字号 (px)
 * @param {number} options.opacity  - 透明度 0~1
 * @param {number} options.spacing  - 分布间距倍率（默认 1.0）
 * @param {number} options.angle    - 倾斜角度 (度)
 * @param {string} options.color    - 字体颜色 (CSS 颜色值)
 */
function drawWatermark(options) {
  const {
    canvas,
    image,
    canvasW,
    canvasH,
    text = '仅供查阅',
    fontSize = 24,
    opacity = 0.2,
    spacing = 1.0,
    angle = -30,
    color = '#000000'
  } = options

  const ctx = canvas.getContext('2d')

  // 清空画布
  ctx.clearRect(0, 0, canvasW, canvasH)

  // 绘制原图（铺满画布）
  ctx.drawImage(image, 0, 0, canvasW, canvasH)

  // 设置水印样式
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = color
  ctx.font = `${fontSize}px sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'

  // 计算文字包围盒，用于平铺间距
  const metrics = ctx.measureText(text)
  const textW = metrics.width
  const textH = fontSize

  const rad = (angle * Math.PI) / 180

  // 旋转后包围盒对角线，作为平铺最小间距
  const diagW = Math.abs(textW * Math.cos(rad)) + Math.abs(textH * Math.sin(rad))
  const diagH = Math.abs(textW * Math.sin(rad)) + Math.abs(textH * Math.cos(rad))

  const spacingX = (diagW + fontSize * 2) * spacing
  const spacingY = (diagH + fontSize * 2) * spacing

  // 扩展范围防止旋转后边缘空白
  const expandRange = Math.max(canvasW, canvasH)

  const startX = -expandRange
  const startY = -expandRange
  const endX = canvasW + expandRange
  const endY = canvasH + expandRange

  for (let y = startY; y < endY; y += spacingY) {
    for (let x = startX; x < endX; x += spacingX) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rad)
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }
  }

  ctx.restore()
}

module.exports = { drawWatermark }
