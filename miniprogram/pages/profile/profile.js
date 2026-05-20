const { showToast } = require('../../utils/util')

const db = wx.cloud.database()

Page({
  data: {
    userInfo: {},
    childCount: 0,
    courseCount: 0,
    groupCount: 0,
    showNicknameModal: false,
    newNickname: '',
    theme: 'blue'
  },

  noop() {},

  onShow() {
    const app = getApp()
    this.setData({ theme: app.globalData.theme || 'blue' })
    app.applyThemeColors()
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo })
    }
    this.loadStats()
  },

  switchTheme(e) {
    const theme = e.currentTarget.dataset.theme
    const app = getApp()
    app.setTheme(theme)
    this.setData({ theme })
    showToast(theme === 'cute' ? '🧡 甜橙可爱' : '💙 简约蓝')
  },

  async loadStats() {
    try {
      const app = getApp()
      const openid = app.globalData.openid

      const childRes = await db.collection('children')
        .where({ _openid: getApp().globalData.openid })
        .count()

      const courseRes = await db.collection('schedules')
        .where({ _openid: getApp().globalData.openid })
        .count()

      let groupCount = 0
      if (openid) {
        const groupRes = await db.collection('groups')
          .where({ 'members.userId': openid })
          .count()
        groupCount = groupRes.total
      }

      this.setData({
        childCount: childRes.total,
        courseCount: courseRes.total,
        groupCount
      })
    } catch (err) {
      console.error('加载统计失败', err)
    }
  },

  editNickname() {
    this.setData({
      showNicknameModal: true,
      newNickname: this.data.userInfo.nickName || ''
    })
  },

  hideModal() {
    this.setData({ showNicknameModal: false })
  },

  onNicknameInput(e) {
    this.setData({ newNickname: e.detail.value })
  },

  async saveNickname() {
    const { newNickname } = this.data
    if (!newNickname.trim()) {
      showToast('请输入昵称')
      return
    }

    try {
      await wx.cloud.callFunction({
        name: 'login',
        data: {
          action: 'updateNickname',
          nickName: newNickname.trim()
        }
      })

      const app = getApp()
      app.globalData.userInfo.nickName = newNickname.trim()
      this.setData({
        'userInfo.nickName': newNickname.trim(),
        showNicknameModal: false
      })
      showToast('昵称已更新')
    } catch (err) {
      console.error('更新昵称失败', err)
      showToast('更新失败')
    }
  }
})
