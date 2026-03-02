const { drawWatermark } = require('../../utils/watermark')
const { authorizeWritePhotosAlbum } = require('../../utils/permission')

const DEFAULT_PARAMS = {
  text: '仅供查阅',
  fontSize: 24,
  opacityDisplay: 20,
  spacing: 1.0,
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
  _debounceTimer: null,

  onLoad(options) {
    const imagePath = decodeURIComponent(options.imagePath || '')
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
        this._render()
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
    drawWatermark({
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
  },

  _debouncedRender() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer)
    this._debounceTimer = setTimeout(() => this._render(), 300)
  },

  onTextInput(e) {
    this.setData({ text: e.detail.value })
    this._debouncedRender()
  },

  onFontSizeChange(e) {
    this.setData({ fontSize: e.detail.value }, () => this._render())
  },

  onOpacityChange(e) {
    this.setData({ opacityDisplay: e.detail.value }, () => this._render())
  },

  onSpacingChange(e) {
    this.setData({ spacing: e.detail.value }, () => this._render())
  },

  onAngleChange(e) {
    this.setData({ angle: e.detail.value }, () => this._render())
  },

  onColorChange(e) {
    const color = e.currentTarget.dataset.color
    this.setData({ currentColor: color }, () => this._render())
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
    const scaleFactor = originW / this._canvasW

    const offCanvas = wx.createOffscreenCanvas({
      type: '2d',
      width: originW,
      height: originH
    })

    const offImg = offCanvas.createImage()
    offImg.onload = () => {
      drawWatermark({
        canvas: offCanvas,
        image: offImg,
        canvasW: originW,
        canvasH: originH,
        text,
        fontSize: fontSize * scaleFactor,
        opacity: opacityDisplay / 100,
        spacing,
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
