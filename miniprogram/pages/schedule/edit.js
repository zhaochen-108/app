const { WEEKDAYS, generateTimeSlots, showToast, timeToMinutes } = require('../../utils/util')

const timeSlots = generateTimeSlots()

Page({
  data: {
    childId: '',
    scheduleId: '',
    isEdit: false,
    courseName: '',
    location: '',
    weekdays: WEEKDAYS,
    timeSlots: timeSlots,
    dayIndex: 0,
    startIndex: 0,
    endIndex: 2  // 默认1小时
  },

  onLoad(options) {
    const dayOfWeek = parseInt(options.dayOfWeek) || 1
    const dayIndex = dayOfWeek - 1

    this.setData({
      childId: options.childId,
      dayIndex
    })

    // 编辑模式
    if (options.scheduleId) {
      const startIndex = timeSlots.indexOf(options.startTime) >= 0 ? timeSlots.indexOf(options.startTime) : 0
      const endIndex = timeSlots.indexOf(options.endTime) >= 0 ? timeSlots.indexOf(options.endTime) : 2

      this.setData({
        scheduleId: options.scheduleId,
        isEdit: true,
        courseName: decodeURIComponent(options.courseName || ''),
        location: decodeURIComponent(options.location || ''),
        startIndex,
        endIndex
      })

      wx.setNavigationBarTitle({ title: '编辑课程' })
    } else {
      wx.setNavigationBarTitle({ title: '添加课程' })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  onDayChange(e) {
    this.setData({ dayIndex: parseInt(e.detail.value) })
  },

  onStartChange(e) {
    let startIndex = parseInt(e.detail.value)
    let { endIndex } = this.data
    // 确保结束时间在开始时间之后
    if (endIndex <= startIndex) {
      endIndex = Math.min(startIndex + 2, timeSlots.length - 1)
    }
    this.setData({ startIndex, endIndex })
  },

  onEndChange(e) {
    let endIndex = parseInt(e.detail.value)
    const { startIndex } = this.data
    if (endIndex <= startIndex) {
      showToast('结束时间必须晚于开始时间')
      return
    }
    this.setData({ endIndex })
  },

  async save() {
    const { childId, scheduleId, isEdit, courseName, location, dayIndex, startIndex, endIndex } = this.data

    if (!courseName.trim()) {
      showToast('请输入课程名称')
      return
    }

    if (endIndex <= startIndex) {
      showToast('结束时间必须晚于开始时间')
      return
    }

    const data = {
      childId,
      dayOfWeek: dayIndex + 1,
      startTime: timeSlots[startIndex],
      endTime: timeSlots[endIndex],
      courseName: courseName.trim(),
      location: location.trim()
    }

    try {
      wx.showLoading({ title: '保存中...' })

      if (isEdit) {
        await wx.cloud.callFunction({
          name: 'manageSchedule',
          data: { action: 'update', scheduleId, ...data }
        })
      } else {
        await wx.cloud.callFunction({
          name: 'manageSchedule',
          data: { action: 'add', ...data }
        })
      }

      showToast('保存成功')
      setTimeout(() => wx.navigateBack(), 500)
    } catch (err) {
      console.error('保存失败', err)
      showToast('保存失败')
    } finally {
      wx.hideLoading()
    }
  }
})
