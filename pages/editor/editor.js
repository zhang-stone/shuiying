const { drawWatermark } = require('../../utils/watermark')
const { authorizeWritePhotosAlbum } = require('../../utils/permission')

const DEFAULT_SPACING = 0
const MAX_EXPORT_SIDE = 4096

const DEFAULT_PARAMS = {
  text: '仅供查阅',
  fontSize: 24,
  opacityDisplay: 90,
  spacing: DEFAULT_SPACING,
  angle: -30,
  currentColor: '#000000'
}

Page({
  data: {
    imagePath: '',
    text: DEFAULT_PARAMS.text,
    fontSize: DEFAULT_PARAMS.fontSize,
    opacityDisplay: DEFAULT_PARAMS.opacityDisplay,
    spacing: DEFAULT_PARAMS.spacing,
    angle: DEFAULT_PARAMS.angle,
    currentColor: DEFAULT_PARAMS.currentColor,
    colors: [
      { value: '#000000', border: 'rgba(0,0,0,0.3)' },
      { value: '#ff4444', border: 'rgba(255,68,68,0.3)' },
      { value: '#4488ff', border: 'rgba(68,136,255,0.3)' },
      { value: '#ffd700', border: 'rgba(255,215,0,0.3)' }
    ]
  },

  _canvas: null,
  _ctx: null,
  _image: null,
  _canvasW: 0,
  _canvasH: 0,
  _previewImageW: 0,
  _previewImageH: 0,
  _debounceTimer: null,
  _renderTimer: null,
  _isRendering: false,
  _renderQueued: false,

  onLoad(options) {
    const imagePath = decodeURIComponent(options.imagePath || '')
    if (!imagePath) {
      wx.showToast({ title: '图片路径无效', icon: 'none' })
      return
    }
    this.setData({ imagePath })
    this._initCanvas(imagePath)
  },

  _initCanvas(imagePath) {
    const query = wx.createSelectorQuery()
    query.select('#watermarkCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        wx.showToast({ title: '画布初始化失败', icon: 'none' })
        return
      }

      const canvas = res[0].node
      const dpr = wx.getWindowInfo().pixelRatio
      const displayW = res[0].width
      const displayH = res[0].height

      canvas.width = displayW * dpr
      canvas.height = displayH * dpr

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)

      this._canvas = canvas
      this._ctx = ctx
      this._canvasW = displayW
      this._canvasH = displayH

      const img = canvas.createImage()
      img.onload = () => {
        this._image = img
        this._scheduleRender(0)
      }
      img.onerror = () => {
        wx.showToast({ title: '图片加载失败', icon: 'none' })
      }
      img.src = imagePath
    })
  },

  _render() {
    if (!this._canvas || !this._image) return
    const { text, fontSize, opacityDisplay, spacing, angle, currentColor } = this.data
    const drawMeta = drawWatermark({
      canvas: this._canvas,
      image: this._image,
      canvasW: this._canvasW,
      canvasH: this._canvasH,
      text,
      fontSize,
      opacity: opacityDisplay / 100,
      spacing,
      angle,
      color: currentColor
    })

    if (drawMeta) {
      this._previewImageW = drawMeta.drawW
      this._previewImageH = drawMeta.drawH
    }
  },

  _debouncedRender() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer)
    this._debounceTimer = setTimeout(() => this._scheduleRender(0), 200)
  },

  _scheduleRender(delay = 16) {
    if (this._renderTimer) clearTimeout(this._renderTimer)
    this._renderTimer = setTimeout(() => {
      this._renderTimer = null
      if (this._isRendering) {
        this._renderQueued = true
        return
      }

      this._isRendering = true
      try {
        this._render()
      } finally {
        this._isRendering = false
      }

      if (this._renderQueued) {
        this._renderQueued = false
        this._scheduleRender(16)
      }
    }, delay)
  },

  onTextInput(e) {
    this.setData({ text: e.detail.value })
    this._debouncedRender()
  },

  onFontSizeChange(e) {
    const fontSize = clampNumber(e.detail.value, 12, 60, DEFAULT_PARAMS.fontSize)
    this.setData({ fontSize }, () => this._scheduleRender(0))
  },

  onOpacityChange(e) {
    this.setData({ opacityDisplay: Number(e.detail.value) }, () => this._scheduleRender(0))
  },

  onSpacingChange(e) {
    const spacing = Math.max(0, Number(e.detail.value) || DEFAULT_SPACING)
    this.setData({ spacing }, () => this._scheduleRender(0))
  },

  onAngleChange(e) {
    this.setData({ angle: Number(e.detail.value) }, () => this._scheduleRender(0))
  },

  onColorChange(e) {
    const color = e.currentTarget.dataset.color
    this.setData({ currentColor: color }, () => this._scheduleRender(0))
  },

  onUnload() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer)
    if (this._renderTimer) clearTimeout(this._renderTimer)
    this._canvas = null
    this._ctx = null
    this._image = null
  },

  async saveImage() {
    try {
      await authorizeWritePhotosAlbum()
    } catch (err) {
      return
    }

    wx.showLoading({ title: '生成中…' })

    const { text, fontSize, opacityDisplay, spacing, angle, currentColor } = this.data
    const img = this._image

    if (!img) {
      wx.hideLoading()
      wx.showToast({ title: '图片未就绪', icon: 'none' })
      return
    }

    const originW = img.width
    const originH = img.height
    const { width: exportW, height: exportH } = computeSafeExportSize(originW, originH, MAX_EXPORT_SIDE)
    const previewImageW = this._previewImageW || this._canvasW
    const scaleFactor = exportW / previewImageW

    const offCanvas = wx.createOffscreenCanvas({
      type: '2d',
      width: exportW,
      height: exportH
    })

    const offImg = offCanvas.createImage()
    offImg.onload = () => {
      drawWatermark({
        canvas: offCanvas,
        image: offImg,
        canvasW: exportW,
        canvasH: exportH,
        text,
        fontSize: fontSize * scaleFactor,
        opacity: opacityDisplay / 100,
        spacing: spacing * scaleFactor,
        angle,
        color: currentColor
      })

      wx.canvasToTempFilePath({
        canvas: offCanvas,
        fileType: 'jpg',
        quality: 0.95,
        success: (res) => {
          wx.hideLoading()
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({ title: '已保存到相册', icon: 'success' })
            },
            fail: () => {
              wx.showToast({ title: '保存失败，请检查权限', icon: 'none' })
            }
          })
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({ title: '图片生成失败', icon: 'none' })
        }
      })
    }
    offImg.onerror = () => {
      wx.hideLoading()
      wx.showToast({ title: '离屏图片加载失败', icon: 'none' })
    }
    offImg.src = this.data.imagePath
  }
})

function computeSafeExportSize(width, height, maxSide) {
  if (!width || !height) return { width: maxSide, height: maxSide }
  const largestSide = Math.max(width, height)
  if (largestSide <= maxSide) return { width, height }
  const ratio = maxSide / largestSide
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  }
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, num))
}
