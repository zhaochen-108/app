const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function callAI(text) {
  const apiKey = process.env.DOUBAO_API_KEY
  if (!apiKey) throw new Error('未配置 DOUBAO_API_KEY')

  const resp = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: process.env.DOUBAO_MODEL || 'doubao-1-5-lite-32k-250115',
      messages: [
        {
          role: 'system',
          content: '你是一个课程信息提取助手。用户输入一段自然语言描述的课程信息，你需要提取出结构化数据。只返回JSON，不要任何其他文字。格式：{"dayOfWeek":1-7数字,"startTime":"HH:mm","endTime":"HH:mm","courseName":"课程名","location":"地点"}。星期一到日对应1-7。如果某个字段无法识别则不返回该字段。'
        },
        { role: 'user', content: text }
      ],
      temperature: 0
    })
  })

  const data = await resp.json()
  const content = data.choices[0].message.content.trim()
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式异常')
  return JSON.parse(jsonMatch[0])
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  switch (action) {
    case 'parseText': {
      const result = await callAI(event.text)
      return { success: true, parsed: result }
    }

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
