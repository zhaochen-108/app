const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 生成6位邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  switch (action) {
    // 创建约玩圈
    case 'create': {
      const userRes = await db.collection('users').where({ _openid: OPENID }).get()
      const nickName = userRes.data.length > 0 ? userRes.data[0].nickName : '宝妈'

      // 获取选中的孩子信息
      const childrenData = []
      if (event.childIds && event.childIds.length > 0) {
        for (const childId of event.childIds) {
          const childRes = await db.collection('children').doc(childId).get()
          if (childRes.data._openid === OPENID) {
            childrenData.push({
              childId: childRes.data._id,
              childName: childRes.data.name,
              color: childRes.data.color,
              userId: OPENID,
              parentName: nickName
            })
          }
        }
      }

      const inviteCode = generateInviteCode()

      await db.collection('groups').add({
        data: {
          name: event.name,
          creatorId: OPENID,
          inviteCode,
          members: [{
            userId: OPENID,
            nickName,
            role: 'owner'
          }],
          children: childrenData,
          createdAt: db.serverDate()
        }
      })

      return { success: true, inviteCode }
    }

    // 加入约玩圈
    case 'join': {
      const groupRes = await db.collection('groups')
        .where({ inviteCode: event.inviteCode })
        .get()

      if (groupRes.data.length === 0) {
        throw new Error('找不到该约玩圈，请检查邀请码')
      }

      const group = groupRes.data[0]

      // 检查是否已经是成员
      const isMember = group.members.some(m => m.userId === OPENID)
      if (isMember) {
        throw new Error('你已经在该约玩圈中')
      }

      const userRes = await db.collection('users').where({ _openid: OPENID }).get()
      const nickName = userRes.data.length > 0 ? userRes.data[0].nickName : '宝妈'

      await db.collection('groups').doc(group._id).update({
        data: {
          members: _.push({
            each: [{ userId: OPENID, nickName, role: 'member' }]
          })
        }
      })

      return { success: true, groupName: group.name }
    }

    // 获取组详情
    case 'detail': {
      const group = await db.collection('groups').doc(event.groupId).get()
      const groupData = group.data

      // 验证是组成员
      const isMember = groupData.members.some(m => m.userId === OPENID)
      if (!isMember) {
        throw new Error('你不是该组成员')
      }

      const isOwner = groupData.creatorId === OPENID

      // 获取当前用户未加入组的孩子
      const myChildren = await db.collection('children')
        .where({ _openid: OPENID })
        .get()

      const addedChildIds = groupData.children
        .filter(c => c.userId === OPENID)
        .map(c => c.childId)

      const unaddedChildren = myChildren.data.filter(
        c => !addedChildIds.includes(c._id)
      )

      return { group: groupData, isOwner, unaddedChildren }
    }

    // 添加孩子到组
    case 'addChild': {
      const group = await db.collection('groups').doc(event.groupId).get()
      const isMember = group.data.members.some(m => m.userId === OPENID)
      if (!isMember) {
        throw new Error('你不是该组成员')
      }

      const child = await db.collection('children').doc(event.childId).get()
      if (child.data._openid !== OPENID) {
        throw new Error('无权操作')
      }

      const userRes = await db.collection('users').where({ _openid: OPENID }).get()
      const nickName = userRes.data.length > 0 ? userRes.data[0].nickName : '宝妈'

      await db.collection('groups').doc(event.groupId).update({
        data: {
          children: _.push({
            each: [{
              childId: child.data._id,
              childName: child.data.name,
              color: child.data.color,
              userId: OPENID,
              parentName: nickName
            }]
          })
        }
      })

      return { success: true }
    }

    // 退出约玩圈
    case 'leave': {
      const groupDoc = await db.collection('groups').doc(event.groupId).get()

      // 移除成员
      const updatedMembers = groupDoc.data.members.filter(m => m.userId !== OPENID)
      // 移除该用户的孩子
      const updatedChildren = groupDoc.data.children.filter(c => c.userId !== OPENID)

      await db.collection('groups').doc(event.groupId).update({
        data: { members: updatedMembers, children: updatedChildren }
      })

      return { success: true }
    }

    // 解散约玩圈
    case 'delete': {
      const groupToDelete = await db.collection('groups').doc(event.groupId).get()
      if (groupToDelete.data.creatorId !== OPENID) {
        throw new Error('只有组长可以解散约玩圈')
      }

      await db.collection('groups').doc(event.groupId).remove()
      return { success: true }
    }

    default:
      throw new Error('未知操作: ' + action)
  }
}
