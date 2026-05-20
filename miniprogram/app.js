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
    this.applyThemeColors(theme)

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
    this.applyThemeColors(theme)
  },

  applyThemeColors(theme) {
    if (!theme) theme = this.globalData.theme
    const colors = {
      blue: '#4A90D9',
      cute: '#FF7B3A'
    }
    const c = colors[theme] || colors.blue
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: c,
      animation: { duration: 300, timingFunc: 'easeIn' }
    })
    wx.setTabBarStyle({ selectedColor: c })
  },

  globalData: {
    userInfo: null,
    openid: null,
    theme: 'blue'
  }
})
