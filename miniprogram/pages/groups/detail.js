const { showToast, showConfirm } = require('../../utils/util')

const db = wx.cloud.database()

Page({
  data: {
    groupId: '',
    group: { name: '', inviteCode: '', members: [], children: [] },
    isOwner: false,
    unaddedChildren: [],
    theme: 'cute'
  },

  onLoad(options) {
    this.setData({ groupId: options.groupId })
  },

  onShow() {
    this.setData({ theme: getApp().globalData.theme || 'cute' })
    getApp().applyThemeColors()
    this.loadGroupDetail()
  },

  // 微信分享 — 将邀请码嵌入分享链接
  onShareAppMessage() {
    const group = this.data.group
    return {
      title: `来加入「${group.name}」约玩圈，一起安排孩子的课余时间吧！`,
      path: `/pages/groups/join?inviteCode=${group.inviteCode}&groupName=${encodeURIComponent(group.name)}`
    }
  },

  async loadGroupDetail() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'manageGroup',
        data: { action: 'detail', groupId: this.data.groupId }
      })

      if (result) {
        this.setData({
          group: result.group,
          isOwner: result.isOwner,
          unaddedChildren: result.unaddedChildren || []
        })
        wx.setNavigationBarTitle({ title: result.group.name })
      }
    } catch (err) {
      console.error('加载组详情失败', err)
      showToast('加载失败')
    }
  },

  // 添加孩子到组
  async addChildToGroup(e) {
    const child = e.currentTarget.dataset.child
    try {
      wx.showLoading({ title: '添加中...' })
      await wx.cloud.callFunction({
        name: 'manageGroup',
        data: {
          action: 'addChild',
          groupId: this.data.groupId,
          childId: child._id
        }
      })
      showToast('已添加')
      this.loadGroupDetail()
    } catch (err) {
      console.error('添加失败', err)
      showToast('添加失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 查看合并课程表
  goToMergeView() {
    wx.navigateTo({
      url: `/pages/merge/merge?groupId=${this.data.groupId}&groupName=${encodeURIComponent(this.data.group.name)}`
    })
  },

  // 退出约玩圈
  async leaveGroup() {
    const confirmed = await showConfirm('确定退出该约玩圈吗？')
    if (!confirmed) return

    try {
      await wx.cloud.callFunction({
        name: 'manageGroup',
        data: { action: 'leave', groupId: this.data.groupId }
      })
      showToast('已退出')
      wx.navigateBack()
    } catch (err) {
      console.error('退出失败', err)
      showToast('退出失败')
    }
  },

  // 解散约玩圈
  async deleteGroup() {
    const confirmed = await showConfirm('确定解散该约玩圈吗？所有成员将被移除。')
    if (!confirmed) return

    try {
      await wx.cloud.callFunction({
        name: 'manageGroup',
        data: { action: 'delete', groupId: this.data.groupId }
      })
      showToast('已解散')
      wx.navigateBack()
    } catch (err) {
      console.error('解散失败', err)
      showToast('解散失败')
    }
  }
})
