const { WEEKDAYS, showToast, showConfirm } = require('../../utils/util')

const db = wx.cloud.database()

Page({
  data: {
    childId: '',
    childName: '',
    childColor: '#4A90D9',
    weekdays: WEEKDAYS,
    currentDay: 1,
    daySchedules: [],
    allSchedules: []
  },

  onLoad(options) {
    const today = new Date().getDay()
    // getDay() 返回 0-6（周日-周六），转换为 1-7（周一-周日）
    const currentDay = today === 0 ? 7 : today

    this.setData({
      childId: options.childId,
      childName: decodeURIComponent(options.childName || ''),
      childColor: decodeURIComponent(options.childColor || '#4A90D9'),
      currentDay
    })

    wx.setNavigationBarTitle({ title: `${this.data.childName}的课程表` })
    this.loadSchedules()
  },

  onShow() {
    this.loadSchedules()
  },

  // 加载课程表
  async loadSchedules() {
    try {
      const { data } = await db.collection('schedules')
        .where({ childId: this.data.childId })
        .orderBy('startTime', 'asc')
        .get()

      this.setData({ allSchedules: data })
      this.filterDaySchedules()
    } catch (err) {
      console.error('加载课程表失败', err)
    }
  },

  // 筛选当天课程
  filterDaySchedules() {
    const { allSchedules, currentDay } = this.data
    const daySchedules = allSchedules
      .filter(s => s.dayOfWeek === currentDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
    this.setData({ daySchedules })
  },

  // 选择星期
  selectDay(e) {
    this.setData({ currentDay: e.currentTarget.dataset.day })
    this.filterDaySchedules()
  },

  // 添加课程
  addSchedule() {
    const { childId, childName, childColor, currentDay } = this.data
    wx.navigateTo({
      url: `/pages/schedule/edit?childId=${childId}&childName=${encodeURIComponent(childName)}&childColor=${encodeURIComponent(childColor)}&dayOfWeek=${currentDay}`
    })
  },

  // 编辑课程
  editSchedule(e) {
    const schedule = e.currentTarget.dataset.schedule
    const { childId, childName, childColor } = this.data
    wx.navigateTo({
      url: `/pages/schedule/edit?childId=${childId}&childName=${encodeURIComponent(childName)}&childColor=${encodeURIComponent(childColor)}&scheduleId=${schedule._id}&dayOfWeek=${schedule.dayOfWeek}&startTime=${schedule.startTime}&endTime=${schedule.endTime}&courseName=${encodeURIComponent(schedule.courseName)}&location=${encodeURIComponent(schedule.location || '')}`
    })
  },

  // 删除课程
  async deleteSchedule(e) {
    const id = e.currentTarget.dataset.id
    const confirmed = await showConfirm('确定删除这节课吗？')
    if (!confirmed) return

    try {
      await wx.cloud.callFunction({
        name: 'manageSchedule',
        data: { action: 'delete', scheduleId: id }
      })
      showToast('已删除')
      this.loadSchedules()
    } catch (err) {
      console.error('删除失败', err)
      showToast('删除失败')
    }
  }
})
