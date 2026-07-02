const { showToast } = require('../../utils/util')

Page({
  data: {
    groupName: '',
    inviteCode: '',
    status: 'loading', // loading | confirming | joining | success | error
    errorMsg: '',
    theme: 'cute'
  },

  onLoad(options) {
    this.setData({ theme: getApp().globalData.theme || 'cute' })
    getApp().applyThemeColors()

    const { inviteCode, groupName } = options
    if (!inviteCode) {
      this.setData({ status: 'error', errorMsg: '邀请链接无效' })
      return
    }

    this.setData({
      inviteCode,
      groupName: groupName ? decodeURIComponent(groupName) : '约玩圈',
      status: 'confirming'
    })
  },

  // 确认加入
  async confirmJoin() {
    this.setData({ status: 'joining' })
    wx.showLoading({ title: '加入中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'manageGroup',
        data: {
          action: 'join',
          inviteCode: this.data.inviteCode
        }
      })

      wx.hideLoading()
      this.setData({ status: 'success' })
      showToast('加入成功')
    } catch (err) {
      wx.hideLoading()
      console.error('加入约玩圈失败:', err)
      const msg = err.message || ''
      if (msg.includes('已经在')) {
        // 已经是成员，直接跳转
        this.setData({ status: 'success' })
        showToast('你已经在这个约玩圈中')
      } else {
        this.setData({
          status: 'error',
          errorMsg: msg.includes('找不到') ? '约玩圈不存在或邀请码已失效' : '加入失败，请稍后重试'
        })
      }
    }
  },

  // 跳转到约玩圈列表
  goToGroups() {
    wx.switchTab({ url: '/pages/groups/groups' })
  },

  // 返回首页
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
