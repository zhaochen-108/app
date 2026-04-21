const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { groupId } = event

  // 获取组信息
  const groupRes = await db.collection('groups').doc(groupId).get()
  const group = groupRes.data

  // 验证是组成员
  const isMember = group.members.some(m => m.userId === OPENID)
  if (!isMember) {
    throw new Error('你不是该组成员，无权查看')
  }

  // 获取组内所有孩子的信息
  const childrenInfo = group.children.map(c => ({
    childId: c.childId,
    childName: c.childName,
    color: c.color,
    parentName: c.parentName
  }))

  // 获取所有孩子的课程表
  const childIds = childrenInfo.map(c => c.childId)

  if (childIds.length === 0) {
    return { childrenInfo: [], schedules: [] }
  }

  // 云开发数据库单次查询限制 20 条，需要分批获取
  let allSchedules = []
  for (const childId of childIds) {
    let skip = 0
    const limit = 100
    while (true) {
      const res = await db.collection('schedules')
        .where({ childId })
        .skip(skip)
        .limit(limit)
        .get()

      allSchedules = allSchedules.concat(res.data)
      if (res.data.length < limit) break
      skip += limit
    }
  }

  // 给每条课程附上孩子信息
  const schedulesWithInfo = allSchedules.map(s => {
    const child = childrenInfo.find(c => c.childId === s.childId)
    return {
      ...s,
      childName: child ? child.childName : '未知',
      color: child ? child.color : '#999'
    }
  })

  return {
    childrenInfo,
    schedules: schedulesWithInfo
  }
}
