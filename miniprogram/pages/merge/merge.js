const { WEEKDAYS, findFreeSlots, timeToMinutes, minutesToTime } = require('../../utils/util')

Page({
  data: {
    groupId: '',
    groupName: '',
    weekdays: WEEKDAYS,
    currentDay: 1,
    childrenInfo: [],
    allSchedules: [],
    displaySchedules: [],
    freeSlots: [],
    hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    scrollHeight: 600
  },

  onLoad(options) {
    const today = new Date().getDay()
    const currentDay = today === 0 ? 7 : today

    // 计算滚动区域高度
    const sysInfo = wx.getSystemInfoSync()
    const scrollHeight = sysInfo.windowHeight - 280

    this.setData({
      groupId: options.groupId,
      groupName: decodeURIComponent(options.groupName || ''),
      currentDay,
      scrollHeight
    })

    wx.setNavigationBarTitle({ title: this.data.groupName })
    this.loadMergedData()
  },

  // 加载合并数据
  async loadMergedData() {
    try {
      wx.showLoading({ title: '加载中...' })
      const { result } = await wx.cloud.callFunction({
        name: 'getMergedView',
        data: { groupId: this.data.groupId }
      })

      if (result) {
        this.setData({
          childrenInfo: result.childrenInfo,
          allSchedules: result.schedules
        })
        this.renderDay()
      }
    } catch (err) {
      console.error('加载合并数据失败', err)
    } finally {
      wx.hideLoading()
    }
  },

  selectDay(e) {
    this.setData({ currentDay: e.currentTarget.dataset.day })
    this.renderDay()
  },

  // 渲染当天视图
  renderDay() {
    const { allSchedules, childrenInfo, currentDay } = this.data
    const baseTime = timeToMinutes('08:00')
    const pxPerMin = 2 // 每分钟对应 2rpx

    // 按孩子分组当天课程
    const childCount = childrenInfo.length
    const columnWidth = childCount > 0 ? Math.floor(550 / childCount) : 550

    const displaySchedules = []

    childrenInfo.forEach((child, index) => {
      const childSchedules = allSchedules.filter(
        s => s.childId === child.childId && s.dayOfWeek === currentDay
      )

      childSchedules.forEach(s => {
        const startMin = timeToMinutes(s.startTime) - baseTime
        const endMin = timeToMinutes(s.endTime) - baseTime
        displaySchedules.push({
          ...s,
          childName: child.childName,
          color: child.color,
          top: startMin * pxPerMin,
          height: Math.max((endMin - startMin) * pxPerMin, 50),
          left: 10 + index * columnWidth,
          width: columnWidth - 10
        })
      })
    })

    // 计算空闲时段
    const childrenScheduleData = childrenInfo.map(child => ({
      childName: child.childName,
      schedules: allSchedules.filter(s => s.childId === child.childId)
    }))

    const rawFreeSlots = findFreeSlots(childrenScheduleData, currentDay)

    const freeSlots = rawFreeSlots.map(slot => {
      const startMin = timeToMinutes(slot.start) - baseTime
      const endMin = timeToMinutes(slot.end) - baseTime
      const durationMin = endMin - startMin + baseTime - baseTime
      const hours = Math.floor(durationMin / 60)
      const mins = durationMin % 60
      let duration = ''
      if (hours > 0) duration += `${hours}小时`
      if (mins > 0) duration += `${mins}分钟`

      return {
        ...slot,
        duration,
        top: startMin * pxPerMin,
        height: (endMin - startMin) * pxPerMin
      }
    })

    this.setData({ displaySchedules, freeSlots })
  }
})
