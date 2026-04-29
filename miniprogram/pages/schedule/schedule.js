const { WEEKDAYS, generateTimeSlots, showToast, showConfirm } = require('../../utils/util')

const db = wx.cloud.database()
const timeSlots = generateTimeSlots()

Page({
  data: {
    childId: '',
    childName: '',
    childColor: '#4A90D9',
    weekdays: WEEKDAYS,
    timeSlots: timeSlots,
    currentDay: 1,
    daySchedules: [],
    allSchedules: [],
    // 上学时间弹窗
    showSchoolModal: false,
    schoolStartIndex: 0,   // 默认 08:00
    schoolEndIndex: 10,    // 默认 15:00 (index 14 = 15:00... let me calc)
    hasSchoolTime: false,
    theme: "blue"
  },

  onLoad(options) {
    const today = new Date().getDay()
    const currentDay = today === 0 ? 7 : today

    // 计算默认上学时间的 index
    const defaultStart = timeSlots.indexOf('08:00')
    const defaultEnd = timeSlots.indexOf('15:30')

    this.setData({
      childId: options.childId,
      childName: decodeURIComponent(options.childName || ''),
      childColor: decodeURIComponent(options.childColor || '#4A90D9'),
      currentDay,
      schoolStartIndex: defaultStart >= 0 ? defaultStart : 0,
      schoolEndIndex: defaultEnd >= 0 ? defaultEnd : 15
    })

    wx.setNavigationBarTitle({ title: `${this.data.childName}的课程表` })
    this.loadSchedules()
  },

  onShow() {
    this.setData({ theme: getApp().globalData.theme || "blue" })
    this.loadSchedules()
  },

  noop() {},

  // 加载课程表
  async loadSchedules() {
    try {
      const { data } = await db.collection('schedules')
        .where({ childId: this.data.childId })
        .orderBy('startTime', 'asc')
        .get()

      // 检查是否已有上学时间
      const hasSchoolTime = data.some(s => s.courseName === '上学')

      this.setData({ allSchedules: data, hasSchoolTime })
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

  // 复制课程（默认复制到下一天）
  copySchedule(e) {
    const schedule = e.currentTarget.dataset.schedule
    const { childId, childName, childColor } = this.data
    const nextDay = schedule.dayOfWeek >= 7 ? 1 : schedule.dayOfWeek + 1
    wx.navigateTo({
      url: `/pages/schedule/edit?childId=${childId}&childName=${encodeURIComponent(childName)}&childColor=${encodeURIComponent(childColor)}&dayOfWeek=${nextDay}&startTime=${schedule.startTime}&endTime=${schedule.endTime}&courseName=${encodeURIComponent(schedule.courseName)}&location=${encodeURIComponent(schedule.location || '')}&copyMode=1`
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
  },

  // === 上学时间相关 ===

  showSchoolTimeModal() {
    // 如果已有上学记录，读取现有时间作为默认值
    const schoolRecord = this.data.allSchedules.find(s => s.courseName === '上学')
    if (schoolRecord) {
      const si = timeSlots.indexOf(schoolRecord.startTime)
      const ei = timeSlots.indexOf(schoolRecord.endTime)
      if (si >= 0) this.setData({ schoolStartIndex: si })
      if (ei >= 0) this.setData({ schoolEndIndex: ei })
    }
    this.setData({ showSchoolModal: true })
  },

  hideSchoolModal() {
    this.setData({ showSchoolModal: false })
  },

  onSchoolStartChange(e) {
    let startIndex = parseInt(e.detail.value)
    let { schoolEndIndex } = this.data
    if (schoolEndIndex <= startIndex) {
      schoolEndIndex = Math.min(startIndex + 15, timeSlots.length - 1)
    }
    this.setData({ schoolStartIndex: startIndex, schoolEndIndex })
  },

  onSchoolEndChange(e) {
    let endIndex = parseInt(e.detail.value)
    if (endIndex <= this.data.schoolStartIndex) {
      showToast('放学时间必须晚于上学时间')
      return
    }
    this.setData({ schoolEndIndex: endIndex })
  },

  async saveSchoolTime() {
    const { childId, schoolStartIndex, schoolEndIndex, hasSchoolTime } = this.data
    const startTime = timeSlots[schoolStartIndex]
    const endTime = timeSlots[schoolEndIndex]

    if (schoolEndIndex <= schoolStartIndex) {
      showToast('放学时间必须晚于上学时间')
      return
    }

    try {
      wx.showLoading({ title: '设置中...' })

      // 先删除旧的上学记录
      if (hasSchoolTime) {
        const oldRecords = this.data.allSchedules.filter(s => s.courseName === '上学')
        for (const record of oldRecords) {
          await wx.cloud.callFunction({
            name: 'manageSchedule',
            data: { action: 'delete', scheduleId: record._id }
          })
        }
      }

      // 给周一到周五批量添加
      for (let day = 1; day <= 5; day++) {
        await wx.cloud.callFunction({
          name: 'manageSchedule',
          data: {
            action: 'add',
            childId,
            dayOfWeek: day,
            startTime,
            endTime,
            courseName: '上学',
            location: ''
          }
        })
      }

      showToast('上学时间已设置')
      this.setData({ showSchoolModal: false })
      this.loadSchedules()
    } catch (err) {
      console.error('设置上学时间失败', err)
      showToast('设置失败')
    } finally {
      wx.hideLoading()
    }
  }
})
