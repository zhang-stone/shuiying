Page({
  chooseFromAlbum() {
    this._chooseImage(['album'])
  },

  chooseFromCamera() {
    this._chooseImage(['camera'])
  },

  _chooseImage(sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      success: (res) => {
        const filePath = res.tempFiles[0].tempFilePath
        wx.navigateTo({
          url: `/pages/editor/editor?imagePath=${encodeURIComponent(filePath)}`
        })
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许访问相册',
            confirmText: '去设置',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) wx.openSetting()
            }
          })
        }
      }
    })
  }
})
