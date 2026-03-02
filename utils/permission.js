/**
 * 权限申请工具
 */

/**
 * 检查并申请相册写入权限
 * @returns {Promise<boolean>}
 */
function authorizeWritePhotosAlbum() {
  return new Promise((resolve, reject) => {
    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => resolve(true),
      fail: () => {
        wx.showModal({
          title: '需要相册权限',
          content: '请在设置中允许访问相册，以便保存添加水印后的图片',
          confirmText: '去设置',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting['scope.writePhotosAlbum']) {
                    resolve(true)
                  } else {
                    reject(new Error('用户拒绝授权'))
                  }
                },
                fail: () => reject(new Error('打开设置失败'))
              })
            } else {
              reject(new Error('用户取消授权'))
            }
          }
        })
      }
    })
  })
}

module.exports = { authorizeWritePhotosAlbum }
