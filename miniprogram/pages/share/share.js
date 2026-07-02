const { WEEKDAYS, timeToMinutes, showToast, showConfirm } = require('../../utils/util')

const db = wx.cloud.database()

// 绘制圆角矩形
function roundRect(ctx, x, y, w, h, r) {
  if (w <= 0 || h <= 0) return
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// 截断文字
function truncateText(ctx, text, maxWidth) {
  if (maxWidth <= 0 || ctx.measureText(text).width <= maxWidth) return text
  let name = text
  while (name.length > 1 && ctx.measureText(name + '…').width > maxWidth) {
    name = name.slice(0, -1)
  }
  return name + '…'
}

Page({
  data: {
    childId: '',
    childName: '',
    childColor: '#4A90D9',
    allSchedules: [],
    previewImageUrl: '',
    generating: false,
    theme: 'cute'
  },

  onLoad(options) {
    this.setData({
      childId: options.childId,
      childName: decodeURIComponent(options.childName || ''),
      childColor: decodeURIComponent(options.childColor || '#4A90D9')
    })
    this.loadSchedulesAndGenerate()
  },

  onShow() {
    const theme = getApp().globalData.theme || 'cute'
    this.setData({ theme })
  },

  goBack() {
    wx.navigateBack()
  },

  async loadSchedulesAndGenerate() {
    try {
      this.setData({ generating: true })
      const { data } = await db.collection('schedules')
        .where({ childId: this.data.childId })
        .orderBy('startTime', 'asc')
        .get()
      this.setData({ allSchedules: data })
      await this.generateImage()
    } catch (err) {
      console.error('加载课程表失败', err)
      showToast('加载失败，请重试')
    } finally {
      this.setData({ generating: false })
    }
  },

  generateImage() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery()
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            showToast('生成失败，请重试')
            reject(new Error('canvas node not found'))
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getSystemInfoSync().pixelRatio

          const W = 1000
          const H = 920
          canvas.width = W * dpr
          canvas.height = H * dpr
          ctx.scale(dpr, dpr)

          this.drawWeeklySchedule(ctx, W, H)

          wx.canvasToTempFilePath({
            canvas,
            x: 0,
            y: 0,
            width: W * dpr,
            height: H * dpr,
            destWidth: W * dpr,
            destHeight: H * dpr,
            success: (res) => {
              this.setData({ previewImageUrl: res.tempFilePath })
              resolve(res.tempFilePath)
            },
            fail: (err) => {
              console.error('导出图片失败', err)
              showToast('生成图片失败')
              reject(err)
            }
          })
        })
    })
  },

  // Canvas 绘制周课表 — 横向布局（经典课表格）
  drawWeeklySchedule(ctx, W, H) {
    const { childName, childColor, allSchedules } = this.data

    const PADDING = 20
    const HEADER_H = 80
    const DAY_HEADER_H = 45
    const TIME_LABEL_W = 50
    const FOOTER_H = 40
    const COL_GAP = 2

    const gridLeft = PADDING + TIME_LABEL_W
    const gridRight = W - PADDING
    const gridWidth = gridRight - gridLeft
    const colWidth = Math.floor((gridWidth - COL_GAP * 6) / 7)

    const baseMinutes = 480  // 08:00
    const endMinutes = 1200  // 20:00
    const pxPerHour = 55
    const gridTop = HEADER_H + DAY_HEADER_H
    const gridHeight = (endMinutes - baseMinutes) / 60 * pxPerHour

    // ---- 白色背景 ----
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, 0, 0, W, H, 16)
    ctx.fill()

    // ---- 标题 ----
    ctx.fillStyle = '#333333'
    ctx.font = 'bold 30px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(childName + ' 的每周课程表', W / 2, PADDING + 28)

    // 彩色装饰线
    ctx.fillStyle = childColor
    const titleW = ctx.measureText(childName + ' 的每周课程表').width
    ctx.fillRect(W / 2 - titleW / 2, PADDING + 50, titleW, 4)

    // ---- 星期列头 ----
    for (let day = 0; day < 7; day++) {
      const x = gridLeft + day * (colWidth + COL_GAP)
      const isWeekend = day >= 5

      // 列头背景
      ctx.fillStyle = isWeekend ? '#fff5ec' : '#f8f9fa'
      roundRect(ctx, x, gridTop - DAY_HEADER_H + 5, colWidth, DAY_HEADER_H - 5, 6)
      ctx.fill()

      // 列头文字
      ctx.fillStyle = isWeekend ? '#FF7B3A' : '#333333'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(WEEKDAYS[day], x + colWidth / 2, gridTop - DAY_HEADER_H / 2 + 2)
    }

    // ---- 时间轴标签 + 横线 ----
    for (let hour = 8; hour <= 20; hour++) {
      const y = gridTop + (hour - 8) * pxPerHour

      // 时间标签
      ctx.fillStyle = '#999999'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(hour + ':00', gridLeft - 8, y)

      // 横线（整点）
      ctx.strokeStyle = '#f0f0f0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(gridLeft, y)
      ctx.lineTo(gridRight, y)
      ctx.stroke()

      // 半点虚线
      if (hour < 20) {
        ctx.strokeStyle = '#f8f8f8'
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(gridLeft, y + pxPerHour / 2)
        ctx.lineTo(gridRight, y + pxPerHour / 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // ---- 列分隔线 ----
    for (let day = 1; day < 7; day++) {
      const x = gridLeft + day * (colWidth + COL_GAP) - COL_GAP / 2
      ctx.strokeStyle = '#f0f0f0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, gridTop)
      ctx.lineTo(x, gridTop + gridHeight)
      ctx.stroke()
    }

    // ---- 每天课程 ----
    for (let day = 1; day <= 7; day++) {
      const colIdx = day - 1
      const colX = gridLeft + colIdx * (colWidth + COL_GAP)
      const dayCourses = allSchedules.filter(s => s.dayOfWeek === day)

      if (dayCourses.length === 0) {
        ctx.fillStyle = '#e0e0e0'
        ctx.font = '13px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('无', colX + colWidth / 2, gridTop + gridHeight / 2)
        continue
      }

      // 绘制课程色块
      dayCourses.forEach(course => {
        const startMin = timeToMinutes(course.startTime) - baseMinutes
        const endMin = timeToMinutes(course.endTime) - baseMinutes

        const y = gridTop + startMin * pxPerHour / 60
        const h = Math.max((endMin - startMin) * pxPerHour / 60, 30)
        const x = colX + 4
        const w = colWidth - 8

        // 色块背景
        ctx.fillStyle = childColor
        ctx.globalAlpha = 0.9
        roundRect(ctx, x, y, w, h, 6)
        ctx.fill()
        ctx.globalAlpha = 1.0

        // 课程名（居中）
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 15px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const name = truncateText(ctx, course.courseName, w - 8)
        ctx.fillText(name, x + w / 2, y + 5)

        // 时间范围
        if (h > 40) {
          ctx.font = '11px sans-serif'
          ctx.globalAlpha = 0.85
          ctx.fillText(course.startTime + '-' + course.endTime, x + w / 2, y + 24)
          ctx.globalAlpha = 1.0
        }

        // 地点
        if (h > 60 && course.location) {
          ctx.font = '10px sans-serif'
          ctx.globalAlpha = 0.7
          const loc = truncateText(ctx, '📍' + course.location, w - 8)
          ctx.fillText(loc, x + w / 2, y + 40)
          ctx.globalAlpha = 1.0
        }
      })
    }

    // ---- 底部品牌 ----
    ctx.fillStyle = '#cccccc'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('由 爱玩工程师 生成', W / 2, H - 12)
  },

  // 保存到相册
  async saveToAlbum() {
    try {
      const { authSetting } = await wx.getSetting()
      if (!authSetting['scope.writePhotosAlbum']) {
        try {
          await wx.authorize({ scope: 'scope.writePhotosAlbum' })
        } catch (e) {
          const confirmed = await showConfirm('需要相册权限，请在设置中开启')
          if (confirmed) {
            wx.openSetting()
          }
          return
        }
      }

      await wx.saveImageToPhotosAlbum({
        filePath: this.data.previewImageUrl
      })
      showToast('已保存到相册')
    } catch (err) {
      console.error('保存失败', err)
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        showToast('请允许访问相册')
      } else {
        showToast('保存失败')
      }
    }
  }
})
