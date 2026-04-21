const { showToast } = require('../../utils/util')

const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    groups: [],
    myChildren: [],
    showCreateModal: false,
    showJoinModal: false,
    groupName: '',
    inviteCode: ''
  },

  onShow() {
    this.loadGroups()
    this.loadMyChildren()
  },

  // 加载我的家庭组
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
      console.error('加载家庭组失败', err)
    }
  },

  // 加载我的孩子
  async loadMyChildren() {
    try {
      const { data } = await db.collection('children')
        .where({ _openid: '{openid}' })
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

  showJoinGroup() {
    this.setData({ showJoinModal: true, inviteCode: '' })
  },

  hideModals() {
    this.setData({ showCreateModal: false, showJoinModal: false })
  },

  onGroupNameInput(e) {
    this.setData({ groupName: e.detail.value })
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value.toUpperCase() })
  },

  toggleChildSelect(e) {
    const index = e.currentTarget.dataset.index
    const key = `myChildren[${index}].selected`
    this.setData({
      [key]: !this.data.myChildren[index].selected
    })
  },

  // 创建家庭组
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

      // 显示邀请码
      if (result && result.inviteCode) {
        wx.showModal({
          title: '家庭组已创建',
          content: `邀请码：${result.inviteCode}\n分享给其他宝妈即可加入`,
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

  // 加入家庭组
  async joinGroup() {
    const { inviteCode } = this.data
    if (!inviteCode || inviteCode.length !== 6) {
      showToast('请输入6位邀请码')
      return
    }

    try {
      wx.showLoading({ title: '加入中...' })
      await wx.cloud.callFunction({
        name: 'manageGroup',
        data: {
          action: 'join',
          inviteCode: inviteCode
        }
      })

      showToast('加入成功')
      this.setData({ showJoinModal: false })
      this.loadGroups()
    } catch (err) {
      console.error('加入失败', err)
      const msg = err.message || '加入失败'
      showToast(msg.includes('找不到') ? '邀请码无效' : '加入失败')
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
