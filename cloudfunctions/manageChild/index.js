const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  switch (action) {
    case 'add': {
      const result = await db.collection('children').add({
        data: {
          _openid: OPENID,
          userId: OPENID,
          name: event.name,
          color: event.color,
          createdAt: db.serverDate()
        }
      })
      return { success: true, childId: result._id }
    }

    case 'update': {
      // 验证是自己的孩子
      const child = await db.collection('children').doc(event.childId).get()
      if (child.data._openid !== OPENID) {
        throw new Error('无权操作')
      }

      await db.collection('children').doc(event.childId).update({
        data: {
          name: event.name,
          color: event.color,
          updatedAt: db.serverDate()
        }
      })

      // 同步更新约玩圈中的孩子名称
      const groups = await db.collection('groups').where({
        'children.childId': event.childId
      }).get()

      for (const group of groups.data) {
        const updatedChildren = group.children.map(c => {
          if (c.childId === event.childId) {
            return { ...c, childName: event.name, color: event.color }
          }
          return c
        })
        await db.collection('groups').doc(group._id).update({
          data: { children: updatedChildren }
        })
      }

      return { success: true }
    }

    case 'delete': {
      // 验证是自己的孩子
      const childDoc = await db.collection('children').doc(event.childId).get()
      if (childDoc.data._openid !== OPENID) {
        throw new Error('无权操作')
      }

      // 删除孩子
      await db.collection('children').doc(event.childId).remove()

      // 删除该孩子的所有课程
      const schedules = await db.collection('schedules')
        .where({ childId: event.childId })
        .get()

      for (const s of schedules.data) {
        await db.collection('schedules').doc(s._id).remove()
      }

      // 从约玩圈中移除该孩子
      const groupsWithChild = await db.collection('groups').where({
        'children.childId': event.childId
      }).get()

      for (const group of groupsWithChild.data) {
        const updatedChildren = group.children.filter(c => c.childId !== event.childId)
        await db.collection('groups').doc(group._id).update({
          data: { children: updatedChildren }
        })
      }

      return { success: true }
    }

    default:
      throw new Error('未知操作: ' + action)
  }
}
