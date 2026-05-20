const { COLORS, showToast, showConfirm, getNextColor } = require('../../utils/util')

const db = wx.cloud.database()

Page({
  data: {
    userInfo: null,
    children: [],
    showModal: false,
    childName: '',
    childColor: COLORS[0],
    colors: COLORS,
    editingChild: null,
    theme: "blue"
  },

  onLoad() {
    const app = getApp()
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo })
    } else {
      app.userInfoReadyCallback = (res) => {
        this.setData({ userInfo: res.userInfo })
      }
    }
  },

  onShow() {
    this.setData({ theme: getApp().globalData.theme || "blue" })
    getApp().applyThemeColors()
    const app = getApp()
    if (app.globalData.openid) {
      this.loadChildren()
    } else {
      app.userInfoReadyCallback = () => this.loadChildren()
    }
  },

  // 加载孩子列表
  async loadChildren() {
    try {
      const { data } = await db.collection('children')
        .where({ _openid: getApp().globalData.openid })
        .orderBy('createdAt', 'asc')
        .get()

      // 获取每个孩子的课程数量
      const childrenWithCount = await Promise.all(
        data.map(async (child) => {
          const countRes = await db.collection('schedules')
            .where({ childId: child._id })
            .count()
          return { ...child, courseCount: countRes.total }
        })
      )

      this.setData({ children: childrenWithCount })
    } catch (err) {
      console.error('加载孩子列表失败', err)
    }
  },

  // 显示添加孩子弹窗
  showAddChild() {
    const usedColors = this.data.children.map(c => c.color)
    this.setData({
      showModal: true,
      childName: '',
      childColor: getNextColor(usedColors),
      editingChild: null,
    theme: "blue"
    })
  },

  // 编辑孩子
  editChild(e) {
    const child = e.currentTarget.dataset.child
    this.setData({
      showModal: true,
      childName: child.name,
      childColor: child.color,
      editingChild: child
    })
  },

  // 删除孩子
  async deleteChild(e) {
    const child = e.currentTarget.dataset.child
    const confirmed = await showConfirm(`确定删除 ${child.name} 及其所有课程吗？`)
    if (!confirmed) return

    try {
      wx.showLoading({ title: '删除中...' })
      await wx.cloud.callFunction({
        name: 'manageChild',
        data: { action: 'delete', childId: child._id }
      })
      showToast('已删除')
      this.loadChildren()
    } catch (err) {
      console.error('删除失败', err)
      showToast('删除失败')
    } finally {
      wx.hideLoading()
    }
  },

  hideModal() {
    this.setData({ showModal: false })
  },

  onNameInput(e) {
    this.setData({ childName: e.detail.value })
  },

  selectColor(e) {
    this.setData({ childColor: e.currentTarget.dataset.color })
  },

  // 保存孩子
  async saveChild() {
    const { childName, childColor, editingChild } = this.data
    if (!childName.trim()) {
      showToast('请输入宝贝姓名')
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      if (editingChild) {
        await wx.cloud.callFunction({
          name: 'manageChild',
          data: {
            action: 'update',
            childId: editingChild._id,
            name: childName.trim(),
            color: childColor
          }
        })
      } else {
        await wx.cloud.callFunction({
          name: 'manageChild',
          data: {
            action: 'add',
            name: childName.trim(),
            color: childColor
          }
        })
      }
      showToast(editingChild ? '已更新' : '已添加')
      this.setData({ showModal: false })
      this.loadChildren()
    } catch (err) {
      console.error('保存失败', err)
      showToast('保存失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 跳转到课程表
  noop() {},

  goToSchedule(e) {
    const child = e.currentTarget.dataset.child
    wx.navigateTo({
      url: `/pages/schedule/schedule?childId=${child._id}&childName=${child.name}&childColor=${child.color}`
    })
  }
})
