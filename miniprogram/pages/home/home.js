Page({
  data: {
    theme: 'blue',
    features: [
      {
        id: 'schedule',
        name: '爱玩课程表',
        desc: '轻松管理孩子课程',
        icon: '/images/feature-schedule.png',
        active: true
      },
      {
        id: 'more',
        name: '更多功能',
        desc: '敬请期待...',
        icon: '',
        active: false
      }
    ]
  },

  onShow() {
    const app = getApp()
    this.setData({ theme: app.globalData.theme || 'blue' })
    app.applyThemeColors()
  },

  onTapFeature(e) {
    const id = e.currentTarget.dataset.id
    if (id === 'schedule') {
      wx.switchTab({ url: '/pages/index/index' })
    }
  }
})