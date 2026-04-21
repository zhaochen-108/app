const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 更新昵称
  if (event.action === 'updateNickname') {
    await db.collection('users').where({ _openid: OPENID }).update({
      data: { nickName: event.nickName, updatedAt: db.serverDate() }
    })
    return { success: true }
  }

  // 登录 / 注册
  const userRes = await db.collection('users').where({ _openid: OPENID }).get()

  if (userRes.data.length === 0) {
    // 新用户，创建记录
    await db.collection('users').add({
      data: {
        _openid: OPENID,
        nickName: '宝妈',
        avatarUrl: '',
        createdAt: db.serverDate()
      }
    })
    return {
      openid: OPENID,
      userInfo: { nickName: '宝妈', avatarUrl: '' },
      isNew: true
    }
  }

  return {
    openid: OPENID,
    userInfo: userRes.data[0],
    isNew: false
  }
}
