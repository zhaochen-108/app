App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      traceUser: true
    })

    // 读取主题设置
    const theme = wx.getStorageSync('theme') || 'blue'
    this.globalData = {
      theme: theme
    }

    this.login()
  },

  async login() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'login' })
      this.globalData.userInfo = result.userInfo
      this.globalData.openid = result.openid
      if (this.userInfoReadyCallback) {
        this.userInfoReadyCallback(result)
      }
    } catch (err) {
      console.error('登录失败', err)
    }
  },

  setTheme(theme) {
    this.globalData.theme = theme
    wx.setStorageSync('theme', theme)
  },

  globalData: {
    userInfo: null,
    openid: null,
    theme: 'blue'
  }
})
