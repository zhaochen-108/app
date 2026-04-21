// 时间工具函数

// 预定义颜色列表（给孩子分配）
const COLORS = [
  '#4A90D9', '#52c41a', '#fa8c16', '#eb2f96',
  '#722ed1', '#13c2c2', '#f5222d', '#1890ff'
]

// 星期映射
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// 生成时间段列表（半小时粒度，8:00-21:00）
function generateTimeSlots() {
  const slots = []
  for (let h = 8; h < 21; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  slots.push('21:00')
  return slots
}

// 生成6位邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 获取下一个可用颜色
function getNextColor(usedColors) {
  for (const color of COLORS) {
    if (!usedColors.includes(color)) return color
  }
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

// 时间字符串转分钟数（用于比较）
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

// 检查两个时间段是否重叠
function isOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1)
  const e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  const e2 = timeToMinutes(end2)
  return s1 < e2 && s2 < e1
}

// 计算多个孩子的共同空闲时段
function findFreeSlots(childrenSchedules, dayOfWeek) {
  const dayStart = timeToMinutes('08:00')
  const dayEnd = timeToMinutes('21:00')

  // 收集当天所有课程的时间段
  const busySlots = []
  for (const child of childrenSchedules) {
    const daySchedules = child.schedules.filter(s => s.dayOfWeek === dayOfWeek)
    for (const s of daySchedules) {
      busySlots.push({
        start: timeToMinutes(s.startTime),
        end: timeToMinutes(s.endTime),
        childName: child.childName
      })
    }
  }

  // 按开始时间排序
  busySlots.sort((a, b) => a.start - b.start)

  // 找出所有孩子都空闲的时段
  // 先合并所有忙碌时段
  const merged = []
  for (const slot of busySlots) {
    if (merged.length === 0 || merged[merged.length - 1].end <= slot.start) {
      merged.push({ start: slot.start, end: slot.end })
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, slot.end)
    }
  }

  // 空闲时段 = 总时间 - 忙碌时段
  const freeSlots = []
  let current = dayStart
  for (const busy of merged) {
    if (current < busy.start) {
      freeSlots.push({
        start: minutesToTime(current),
        end: minutesToTime(busy.start)
      })
    }
    current = Math.max(current, busy.end)
  }
  if (current < dayEnd) {
    freeSlots.push({
      start: minutesToTime(current),
      end: minutesToTime(dayEnd)
    })
  }

  return freeSlots
}

// 分钟数转时间字符串
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 显示提示
function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 })
}

// 显示确认弹窗
function showConfirm(content) {
  return new Promise((resolve) => {
    wx.showModal({
      title: '提示',
      content,
      success: (res) => resolve(res.confirm)
    })
  })
}

module.exports = {
  COLORS,
  WEEKDAYS,
  generateTimeSlots,
  generateInviteCode,
  getNextColor,
  timeToMinutes,
  minutesToTime,
  isOverlap,
  findFreeSlots,
  showToast,
  showConfirm
}
