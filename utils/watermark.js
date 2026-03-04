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
 * @param {number} options.spacing  - 文字额外间距（px，兼容写法）
 * @param {number} options.spacingX - 横向额外间距（px）
 * @param {number} options.spacingY - 竖向额外间距（px）
 * @param {number} options.angle    - 倾斜角度 (度)
 * @param {string} options.color    - 字体颜色 (CSS 颜色值)
 * @param {string} options.imageFit - 图片适配方式，默认 contain
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
    spacing = 0,
    spacingX = spacing,
    spacingY = spacing,
    angle = -30,
    color = '#000000',
    imageFit = 'contain',
    maxTiles = 2200,
    minStepPx = 1
  } = options

  const ctx = canvas.getContext('2d')

  // 清空画布
  ctx.clearRect(0, 0, canvasW, canvasH)

  const imageW = image.width || canvasW
  const imageH = image.height || canvasH
  const drawRect = getImageDrawRect({
    imageW,
    imageH,
    canvasW,
    canvasH,
    imageFit
  })

  // 绘制原图（默认等比显示）
  ctx.drawImage(image, drawRect.x, drawRect.y, drawRect.width, drawRect.height)

  // 设置水印样式
  ctx.save()
  // 仅在图片实际区域绘制水印，避免出现在黑边区域
  ctx.beginPath()
  ctx.rect(drawRect.x, drawRect.y, drawRect.width, drawRect.height)
  ctx.clip()

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

  const gapXPx = clampNumber(spacingX, 0, 200, 0)
  const gapYPx = clampNumber(spacingY, 0, 200, 0)
  const tightenPx = computeTightenPx(fontSize, diagW, diagH)
  const stepX = Math.max(minStepPx, diagW + gapXPx - tightenPx)
  const stepY = Math.max(minStepPx, diagH + gapYPx - tightenPx)

  // 扩展范围防止旋转后边缘空白
  const expandRange = Math.max(drawRect.width, drawRect.height)

  const startX = drawRect.x - expandRange
  const startY = drawRect.y - expandRange
  const endX = drawRect.x + drawRect.width + expandRange
  const endY = drawRect.y + drawRect.height + expandRange

  if (!text) {
    ctx.restore()
    return {
      drawX: drawRect.x,
      drawY: drawRect.y,
      drawW: drawRect.width,
      drawH: drawRect.height
    }
  }

  let tileCount = 0
  let exceededMaxTiles = false
  for (let y = startY; y < endY; y += stepY) {
    for (let x = startX; x < endX; x += stepX) {
      if (tileCount >= maxTiles) {
        exceededMaxTiles = true
        break
      }
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rad)
      ctx.fillText(text, 0, 0)
      ctx.restore()
      tileCount += 1
    }
    if (exceededMaxTiles) break
  }

  ctx.restore()

  return {
    drawX: drawRect.x,
    drawY: drawRect.y,
    drawW: drawRect.width,
    drawH: drawRect.height
  }
}

function getImageDrawRect(options) {
  const {
    imageW,
    imageH,
    canvasW,
    canvasH,
    imageFit = 'contain'
  } = options

  if (!imageW || !imageH || !canvasW || !canvasH) {
    return { x: 0, y: 0, width: canvasW, height: canvasH }
  }

  if (imageFit === 'fill') {
    return { x: 0, y: 0, width: canvasW, height: canvasH }
  }

  const imageRatio = imageW / imageH
  const canvasRatio = canvasW / canvasH

  let width
  let height

  if (imageRatio > canvasRatio) {
    width = canvasW
    height = canvasW / imageRatio
  } else {
    height = canvasH
    width = canvasH * imageRatio
  }

  const x = (canvasW - width) / 2
  const y = (canvasH - height) / 2

  return { x, y, width, height }
}

module.exports = { drawWatermark, getImageDrawRect }

function clampNumber(value, min, max, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, num))
}

function computeTightenPx(fontSize, diagW, diagH) {
  // 让 spacing=0 时更贴近字形边缘，同时避免步长过小导致绘制爆炸
  const byFont = fontSize * 0.5
  const byDiag = Math.min(diagW, diagH) * 0.38
  return Math.max(0, Math.min(byFont, byDiag))
}
