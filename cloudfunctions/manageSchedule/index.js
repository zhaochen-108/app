const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  switch (action) {
    case 'add': {
      // 验证孩子属于当前用户
      const child = await db.collection('children').doc(event.childId).get()
      if (child.data._openid !== OPENID) {
        throw new Error('无权操作')
      }

      const result = await db.collection('schedules').add({
        data: {
          _openid: OPENID,
          childId: event.childId,
          userId: OPENID,
          dayOfWeek: event.dayOfWeek,
          startTime: event.startTime,
          endTime: event.endTime,
          courseName: event.courseName,
          location: event.location || '',
          createdAt: db.serverDate()
        }
      })
      return { success: true, scheduleId: result._id }
    }

    case 'update': {
      // 验证课程属于当前用户
      const schedule = await db.collection('schedules').doc(event.scheduleId).get()
      if (schedule.data._openid !== OPENID) {
        throw new Error('无权操作')
      }

      await db.collection('schedules').doc(event.scheduleId).update({
        data: {
          dayOfWeek: event.dayOfWeek,
          startTime: event.startTime,
          endTime: event.endTime,
          courseName: event.courseName,
          location: event.location || '',
          updatedAt: db.serverDate()
        }
      })
      return { success: true }
    }

    case 'delete': {
      // 验证课程属于当前用户
      const scheduleDoc = await db.collection('schedules').doc(event.scheduleId).get()
      if (scheduleDoc.data._openid !== OPENID) {
        throw new Error('无权操作')
      }

      await db.collection('schedules').doc(event.scheduleId).remove()
      return { success: true }
    }

    default:
      throw new Error('未知操作: ' + action)
  }
}
