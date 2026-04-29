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

// 分钟数转时间字符串
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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

  busySlots.sort((a, b) => a.start - b.start)

  const merged = []
  for (const slot of busySlots) {
    if (merged.length === 0 || merged[merged.length - 1].end <= slot.start) {
      merged.push({ start: slot.start, end: slot.end })
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, slot.end)
    }
  }

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

// 智能解析课程文本
// 支持: "周三下午6:30到8点美术课 少年宫"
// 支持: "周五下午4点半到6点。美术"
// 支持: "周六早上9点到12点，科技活动"
function parseScheduleText(text) {
  var result = {}

  // 解析星期
  var dayMap = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7
  }
  var dayMatch = text.match(/周([一二三四五六日天])/)
  if (dayMatch) {
    result.dayOfWeek = dayMap[dayMatch[1]]
  }

  // 提取时间段标记（上午/下午/早上/中午/晚上）
  var periodMap = { '上午': 'am', '早上': 'am', '中午': 'pm', '下午': 'pm', '晚上': 'pm' }
  var periodReg = /(上午|早上|中午|下午|晚上)/
  var periodMatch = text.match(periodReg)
  var period = periodMatch ? periodMap[periodMatch[1]] : null

  // 解析时间 - 按顺序找所有时间表达式
  var timeNums = []
  var fullText = text
  var m

  // 第一遍：匹配 "数字:数字" 或 "数字：数字" 格式
  var colonTimeReg = /(\d{1,2})[:：](\d{1,2})/g
  var colonPositions = []
  while ((m = colonTimeReg.exec(fullText)) !== null) {
    timeNums.push({ hour: parseInt(m[1]), min: parseInt(m[2]), pos: m.index })
    colonPositions.push(m.index)
  }

  // 第二遍：匹配 "数字点半" "数字点数字" "数字点" 格式
  var dotTimeReg = /(\d{1,2})点(半|\d{1,2})?/g
  while ((m = dotTimeReg.exec(fullText)) !== null) {
    var isDup = false
    for (var i = 0; i < colonPositions.length; i++) {
      if (Math.abs(m.index - colonPositions[i]) < 4) { isDup = true; break }
    }
    if (isDup) continue
    var hour = parseInt(m[1])
    var minStr = m[2]
    var min = 0
    if (minStr === '半') { min = 30 }
    else if (minStr) { min = parseInt(minStr) }
    timeNums.push({ hour: hour, min: min, pos: m.index })
  }

  // 按出现位置排序
  timeNums.sort(function(a, b) { return a.pos - b.pos })

  if (timeNums.length >= 2) {
    var startH = timeNums[0].hour
    var startM = timeNums[0].min
    var endH = timeNums[1].hour
    var endM = timeNums[1].min

    if (period === 'pm') {
      if (startH < 12) startH += 12
      if (endH < 12) endH += 12
    }
    if (!period) {
      if (startH < 8) startH += 12
      if (endH < 8) endH += 12
      if (endH <= startH) endH += 12
    }

    startM = startM <= 15 ? 0 : 30
    endM = endM <= 15 ? 0 : 30

    result.startTime = String(startH).padStart(2, '0') + ':' + String(startM).padStart(2, '0')
    result.endTime = String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0')
  }

  // 解析课程名 - 去掉所有时间相关的文字
  var remaining = text
  remaining = remaining.replace(/周[一二三四五六日天]/g, '')
  remaining = remaining.replace(/(上午|早上|中午|下午|晚上)/g, '')
  remaining = remaining.replace(/\d{1,2}[:：]\d{1,2}/g, '')
  remaining = remaining.replace(/\d{1,2}点(半|\d{1,2})?/g, '')
  remaining = remaining.replace(/\b\d{1,2}\b/g, '')
  remaining = remaining.replace(/到|[-—~至]/g, '')
  remaining = remaining.replace(/[，,。.、；;：:]/g, ' ')
  remaining = remaining.trim()

  var parts = remaining.split(/\s+/).filter(function(s) { return s.length > 0 })
  if (parts.length > 0) {
    result.courseName = parts[0]
  }
  if (parts.length > 1) {
    result.location = parts.slice(1).join(' ')
  }

  return result
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
  showConfirm,
  parseScheduleText
}
