const { showToast } = require('../../utils/util')

const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    groups: [],
    myChildren: [],
    showCreateModal: false,
    groupName: '',
    theme: "blue"
  },

  noop() {},

  onShow() {
    this.setData({ theme: getApp().globalData.theme || "blue" })
    getApp().applyThemeColors()
    this.loadGroups()
    this.loadMyChildren()
  },

  // 加载我的约玩圈
  async loadGroups() {
    try {
      const app = getApp()
      const openid = app.globalData.openid
      if (!openid) {
        setTimeout(() => this.loadGroups(), 500)
        return
      }

      const { data } = await db.collection('groups')
        .where({
          'members.userId': openid
        })
        .orderBy('createdAt', 'desc')
        .get()

      this.setData({ groups: data })
    } catch (err) {
      console.error('加载约玩圈失败', err)
    }
  },

  // 加载我的孩子
  async loadMyChildren() {
    try {
      const { data } = await db.collection('children')
        .where({ _openid: getApp().globalData.openid })
        .get()

      this.setData({
        myChildren: data.map(c => ({ ...c, selected: false }))
      })
    } catch (err) {
      console.error('加载孩子列表失败', err)
    }
  },

  showCreateGroup() {
    this.setData({
      showCreateModal: true,
      groupName: '',
      myChildren: this.data.myChildren.map(c => ({ ...c, selected: true }))
    })
  },

  hideModals() {
    this.setData({ showCreateModal: false })
  },

  onGroupNameInput(e) {
    this.setData({ groupName: e.detail.value })
  },

  toggleChildSelect(e) {
    const index = e.currentTarget.dataset.index
    const key = `myChildren[${index}].selected`
    this.setData({
      [key]: !this.data.myChildren[index].selected
    })
  },

  // 创建约玩圈
  async createGroup() {
    const { groupName, myChildren } = this.data
    if (!groupName.trim()) {
      showToast('请输入组名称')
      return
    }

    const selectedChildren = myChildren.filter(c => c.selected)

    try {
      wx.showLoading({ title: '创建中...' })
      const { result } = await wx.cloud.callFunction({
        name: 'manageGroup',
        data: {
          action: 'create',
          name: groupName.trim(),
          childIds: selectedChildren.map(c => c._id)
        }
      })

      showToast('创建成功')
      this.setData({ showCreateModal: false })

      // 提示通过分享邀请好友
      if (result && result.inviteCode) {
        wx.showModal({
          title: '约玩圈已创建',
          content: '进入约玩圈详情，点击"邀请好友加入"按钮分享给其他宝妈吧！',
          showCancel: false
        })
      }

      this.loadGroups()
    } catch (err) {
      console.error('创建失败', err)
      showToast('创建失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 进入组详情
  goToDetail(e) {
    const group = e.currentTarget.dataset.group
    wx.navigateTo({
      url: `/pages/groups/detail?groupId=${group._id}`
    })
  }
})
