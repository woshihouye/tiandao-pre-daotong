var cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
var db = cloud.database()
var _ = db.command

exports.main = async function(event, context) {
  var action = event.action
  var params = event.params || {}
  // 安全：强制覆盖当前用户身份为真实OPENID
  var wxContext = cloud.getWXContext()
  var OPENID = wxContext.OPENID
  // 覆盖params中的当前用户标识，下游函数统一从params读取
  if (params.fromUserId !== undefined || params.userId !== undefined) {
    params.fromUserId = OPENID
    params.userId = OPENID
  }
  event.params = params

  try {
    switch (action) {
      case 'sendMessage': return await sendMessage(params)
      case 'getConversations': return await getConversations(params)
      case 'getMessages': return await getMessages(params)
      case 'markRead': return await markRead(params)
      case 'deleteConversation': return await deleteConversation(params)
      case 'checkPermission': return await checkPermission(params)
      case 'toggleFollow': return await toggleFollow(params)
      case 'getFollowList': return await getFollowList(params)
      case 'getFansList': return await getFansList(params)
      case 'reportMessage': return await reportMessage(params)
      case 'blockUser': return await blockUser(params)
      case 'getOnlineStatus': return await getOnlineStatus(params)
      default: return { ok: false, error: 'unknown action: ' + action }
    }
  } catch (e) {
    console.error('[message-center] 未知错误:', e.message)
    return { ok: false, error: '消息服务暂不可用，请稍后重试' }
  }
}

// ==================== 发送消息 ====================
async function sendMessage(params) {
  var fromUserId = params.fromUserId
  var toUserId = params.toUserId
  var content = (params.content || '').trim()

  if (!fromUserId || !toUserId || !content) {
    return { ok: false, error: '参数不完整' }
  }
  if (content.length > 1000) {
    return { ok: false, error: '消息太长' }
  }

  // 生成会话ID（两人userId排序后拼接，确保唯一）
  var convId = [fromUserId, toUserId].sort().join('_')

  var now = Date.now()

  // 0. 检查双方是否互关（判断是否陌生人）
  var isMutualFollow = false
  try {
    var followARes = await db.collection('user_follows')
      .where({ userId: fromUserId, targetUserId: toUserId }).limit(1).get()
    var followBRes = await db.collection('user_follows')
      .where({ userId: toUserId, targetUserId: fromUserId }).limit(1).get()
    isMutualFollow = followARes.data.length > 0 && followBRes.data.length > 0
  } catch (e) {}

  // 1. 写入消息
  var msgRes = await db.collection('messages').add({
    data: {
      conversationId: convId,
      fromUserId: fromUserId,
      toUserId: toUserId,
      content: content,
      createdAt: now,
      read: false,
      type: 'text'
    }
  })

  // 2. 更新/创建双方会话（标记是否陌生人会话）
  await upsertConversation(convId, fromUserId, toUserId, content, now, !isMutualFollow)

  // 3. 尝试发送订阅消息提醒
  try {
    await sendSubscribeMsgNotify(toUserId, fromUserId, content)
  } catch (e) {}

  return { ok: true, messageId: msgRes._id, createdAt: now, isStranger: !isMutualFollow }
}

// ==================== 获取会话列表 ====================
async function getConversations(params) {
  var userId = params.userId
  var page = Math.min(Math.max(1, parseInt(params.page) || 1), 100)
  var pageSize = Math.min(Math.max(1, parseInt(params.pageSize) || 20), 50)
  var strangerFilter = params.strangerFilter || 'all'  // 'all' | 'normal' | 'stranger'

  if (!userId) return { ok: false, error: '缺少userId' }

  // 查询所有该用户参与的会话
  var queryRes = await db.collection('conversations')
    .where(_.or([
      { userA: userId },
      { userB: userId }
    ]))
    .orderBy('lastMsgTime', 'desc')
    .get()

  // 过滤已删除的会话
  var allConvs = queryRes.data.filter(function(c) {
    return !c[userId + '_deleted']
  })

  // 根据strangerFilter分组过滤
  if (strangerFilter === 'normal') {
    allConvs = allConvs.filter(function(c) { return !c.isStranger })
  } else if (strangerFilter === 'stranger') {
    allConvs = allConvs.filter(function(c) { return c.isStranger })
  }

  var total = allConvs.length
  var paged = allConvs.slice((page - 1) * pageSize, page * pageSize)

  // 为每个会话补充对方信息和在线状态
  var conversations = []
  for (var i = 0; i < paged.length; i++) {
    var conv = paged[i]
    var targetUserId = conv.userA === userId ? conv.userB : conv.userA
    
    // 查询对方用户信息
    var userInfo = { nickName: '无名修士', lastOnlineAt: 0, isOnline: false, msgPermission: 'all' }
    try {
      var userRes = await db.collection('users').where({ userId: targetUserId }).limit(1).get()
      if (userRes.data.length > 0) {
        var u = userRes.data[0]
        userInfo = {
          nickName: u.nickName || '无名修士',
          avatarUrl: u.avatarUrl || '',
          lastOnlineAt: u.lastOnlineAt || 0,
          isOnline: !!u.isOnline,
          msgPermission: u.msgPermission || 'all'
        }
      }
    } catch (e) {}

    // 检查是否被目标用户拉黑
    var isBlocked = false
    try {
      var blockRes = await db.collection('user_follows')
        .where({ followerId: targetUserId, followingId: userId, type: 'block' }).limit(1).get()
      if (blockRes.data.length > 0) isBlocked = true
    } catch (e) {}

    conversations.push({
      _id: conv._id,
      conversationId: conv.conversationId,
      targetUserId: targetUserId,
      targetNickName: userInfo.nickName,
      lastMessage: conv.lastMessage || '',
      lastMsgTime: conv.lastMsgTime || 0,
      unreadCount: (conv.unreadCount || {}),
      isStranger: !!conv.isStranger,
      lastOnlineAt: userInfo.lastOnlineAt,
      isOnline: userInfo.isOnline,
      msgPermission: userInfo.msgPermission,
      isBlocked: isBlocked,
      createdAt: conv.createdAt || 0
    })
  }

  return {
    ok: true,
    conversations: conversations,
    total: total,
    // 返回各分组数量给前端Tab展示
    strangerCount: allConvs.filter(function(c) { return c.isStranger }).length,
    normalCount: allConvs.filter(function(c) { return !c.isStranger }).length
  }
}

// ==================== 获取消息列表 ====================
async function getMessages(params) {
  var conversationId = params.conversationId
  var userId = params.userId
  var page = Math.min(Math.max(1, parseInt(params.page) || 1), 100)
  var pageSize = Math.min(Math.max(1, parseInt(params.pageSize) || 30), 50)

  if (!conversationId) return { ok: false, error: '缺少conversationId' }

  var res = await db.collection('messages')
    .where({ conversationId: conversationId })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 补充对方用户信息
  var senderIds = []
  for (var i = 0; i < res.data.length; i++) {
    var senderId = res.data[i].fromUserId
    if (senderIds.indexOf(senderId) === -1) senderIds.push(senderId)
  }
  
  // 标记消息为已读（对方发给我的）
  if (userId) {
    var unreadMsgIds = res.data
      .filter(function(m) { return m.toUserId === userId && !m.read })
      .map(function(m) { return m._id })
    if (unreadMsgIds.length > 0) {
      try {
        await db.collection('messages').where({ _id: _.in(unreadMsgIds) }).update({ data: { read: true } })
      } catch (e) {}
    }
  }

  return { ok: true, messages: res.data.reverse(), hasMore: res.data.length >= pageSize }
}

// ==================== 标记已读 ====================
async function markRead(params) {
  var conversationId = params.conversationId
  var userId = params.userId

  if (!conversationId || !userId) return { ok: false, error: '参数不完整' }

  // 标记对方发给我的消息为已读
  await db.collection('messages')
    .where({ conversationId: conversationId, toUserId: userId, read: false })
    .update({ data: { read: true } })

  // 清除当前用户的未读数
  var userKey = 'unreadCount.' + userId
  try {
    await db.collection('conversations')
      .where({ conversationId: conversationId })
      .update({ data: { [userKey]: 0 } })
  } catch (e) {}

  return { ok: true }
}

// ==================== 删除会话 ====================
async function deleteConversation(params) {
  var conversationId = params.conversationId
  var userId = params.userId

  if (!conversationId) return { ok: false, error: '缺少conversationId' }

  // 软删除：标记当前用户已删除
  var userKey = userId + '_deleted'
  try {
    await db.collection('conversations')
      .where({ conversationId: conversationId })
      .update({ data: { [userKey]: true } })
  } catch (e) {}

  return { ok: true }
}

// ==================== 关注/取消关注 ====================
async function toggleFollow(params) {
  var userId = params.userId
  var targetUserId = params.targetUserId

  if (!userId || !targetUserId) return { ok: false, error: '参数不完整' }
  if (userId === targetUserId) return { ok: false, error: '不能关注自己' }

  var followId = userId + '_' + targetUserId
  
  var existing = await db.collection('user_follows').where({ followId: followId }).limit(1).get()
  
  if (existing.data.length > 0) {
    // 已关注，取消
    await db.collection('user_follows').doc(existing.data[0]._id).remove()
    return { ok: true, following: false }
  } else {
    // 未关注，关注
    await db.collection('user_follows').add({
      data: {
        followId: followId,
        userId: userId,
        targetUserId: targetUserId,
        createdAt: Date.now()
      }
    })

    // 发送新粉丝订阅提醒
    try {
      var fromUserRes = await db.collection('users').where({ userId: userId }).limit(1).get()
      var fromNickName = fromUserRes.data.length > 0 ? (fromUserRes.data[0].nickName || '某修士') : '某修士'
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: targetUserId,
          templateId: 'TEMPLATE_NEW_FOLLOWER',  // 需替换为微信后台实际模板ID
          data: {
            thing1: { value: fromNickName.slice(0, 20) },
            date2: { value: new Date().toLocaleString('zh-CN', { hour12: false }) }
          },
          page: 'pages/profile/profile'
        })
      } catch (e) {}
    } catch (e) {}

    return { ok: true, following: true }
  }
}

// ==================== 获取关注列表 ====================
async function getFollowList(params) {
  var userId = params.userId
  if (!userId) return { ok: false, error: '缺少userId' }

  var res = await db.collection('user_follows')
    .where({ userId: userId })
    .orderBy('createdAt', 'desc')
    .get()

  return { ok: true, list: res.data, total: res.data.length }
}

// ==================== 获取粉丝列表 ====================
async function getFansList(params) {
  var userId = params.userId
  if (!userId) return { ok: false, error: '缺少userId' }

  var res = await db.collection('user_follows')
    .where({ targetUserId: userId })
    .orderBy('createdAt', 'desc')
    .get()

  return { ok: true, list: res.data, total: res.data.length }
}

// ==================== 权限检查 ====================
async function checkPermission(params) {
  var fromUserId = params.fromUserId
  var toUserId = params.toUserId

  if (!fromUserId || !toUserId) return { ok: false, error: '参数不完整' }

  // 1. 检查黑名单
  var blacklist = await db.collection('user_follows')
    .where({
      userId: toUserId,
      targetUserId: fromUserId,
      type: 'block'
    }).limit(1).get()
  if (blacklist.data.length > 0) {
    return { ok: false, blocked: true, reason: '对方已将你拉黑' }
  }

  // 2. 检查对方私信权限
  try {
    var userRes = await db.collection('users').where({ userId: toUserId }).limit(1).get()
    if (userRes.data.length > 0) {
      var user = userRes.data[0]
      var msgPerm = user.msgPermission || 'all'
      if (msgPerm === 'off') return { ok: false, blocked: true, reason: '对方已关闭私信' }
      if (msgPerm === 'followers') {
        // 检查是否互关
        var followCheck = await db.collection('user_follows')
          .where({ userId: fromUserId, targetUserId: toUserId }).limit(1).get()
        if (followCheck.data.length === 0) {
          return { ok: false, blocked: true, reason: '仅对方关注者才能发送私信' }
        }
      }
    }
  } catch (e) {}

  return { ok: true, allowed: true }
}

// ==================== 举报消息 ====================
async function reportMessage(params) {
  var reporterId = params.userId
  var messageId = params.messageId
  var reason = params.reason || ''

  if (!reporterId || !messageId) return { ok: false, error: '参数不完整' }

  // 简单记录举报
  await db.collection('messages').doc(messageId).update({
    data: { reported: true, reportReason: reason, reportedBy: reporterId, reportedAt: Date.now() }
  })

  return { ok: true }
}

// ==================== 拉黑用户 ====================
async function blockUser(params) {
  var userId = params.userId
  var targetUserId = params.targetUserId

  if (!userId || !targetUserId) return { ok: false, error: '参数不完整' }

  var blockId = userId + '_block_' + targetUserId
  
  var existing = await db.collection('user_follows').where({ followId: blockId }).limit(1).get()
  
  if (existing.data.length > 0) {
    // 已拉黑，取消拉黑
    await db.collection('user_follows').doc(existing.data[0]._id).remove()
    return { ok: true, blocked: false }
  } else {
    // 拉黑
    await db.collection('user_follows').add({
      data: {
        followId: blockId,
        userId: userId,
        targetUserId: targetUserId,
        type: 'block',
        createdAt: Date.now()
      }
    })
    return { ok: true, blocked: true }
  }
}

// ==================== 辅助：更新/创建会话 ====================
async function upsertConversation(convId, userA, userB, lastMessage, time, isStranger) {
  var existing = await db.collection('conversations')
    .where({ conversationId: convId })
    .limit(1)
    .get()

  if (existing.data.length > 0) {
    // 更新：增加对方未读数
    var conv = existing.data[0]
    var unreadKey = 'unreadCount.' + userB  // 对方未读+1
    var updateData = { lastMessage: lastMessage, lastMsgTime: time, updatedAt: time }
    
    // 清除对方删除标记
    var delKey = userB + '_deleted'
    updateData[delKey] = _.remove()
    
    // 对方未读+1
    updateData[unreadKey] = _.inc(1)
    
    // 陌生人标记
    if (isStranger !== undefined) {
      updateData.isStranger = isStranger
    }
    
    await db.collection('conversations').doc(conv._id).update({ data: updateData })
  } else {
    // 创建新会话
    var unreadData = {}
    unreadData[userA] = 0
    unreadData[userB] = 1  // 对方未读1

    await db.collection('conversations').add({
      data: {
        conversationId: convId,
        userA: userA,
        userB: userB,
        lastMessage: lastMessage,
        lastMsgTime: time,
        unreadCount: unreadData,
        isStranger: !!isStranger,
        createdAt: time,
        updatedAt: time
      }
    })
  }
}

// ==================== 获取在线状态 ====================
async function getOnlineStatus(params) {
  var userId = params.userId
  if (!userId) return { ok: false, error: '缺少userId' }

  try {
    var userRes = await db.collection('users').where({ userId: userId }).limit(1).get()
    if (userRes.data.length > 0) {
      var u = userRes.data[0]
      return {
        ok: true,
        userId: userId,
        lastOnlineAt: u.lastOnlineAt || 0,
        isOnline: !!u.isOnline
      }
    }
    return { ok: true, userId: userId, lastOnlineAt: 0, isOnline: false }
  } catch (e) {
    console.error('[message-center] getOnlineStatus error:', e.message)
    return { ok: false, error: '状态更新失败，请稍后重试' }
  }
}

// ==================== 发送订阅消息提醒 ====================
async function sendSubscribeMsgNotify(toUserId, fromUserId, content) {
  try {
    // 查询接收者nickName
    var userRes = await db.collection('users').where({ userId: toUserId }).limit(1).get()
    var fromUserRes = await db.collection('users').where({ userId: fromUserId }).limit(1).get()
    var toNickName = userRes.data.length > 0 ? (userRes.data[0].nickName || '道友') : '道友'
    var fromNickName = fromUserRes.data.length > 0 ? (fromUserRes.data[0].nickName || '某修士') : '某修士'

    // 发送新消息提醒
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: toUserId,
        templateId: 'TEMPLATE_NEW_MESSAGE',  // 需替换为微信后台实际模板ID
        data: {
          thing1: { value: fromNickName.slice(0, 20) },
          thing2: { value: content.slice(0, 20) },
          date3: { value: new Date().toLocaleString('zh-CN', { hour12: false }) }
        },
        page: 'pages/conversations/conversations'
      })
    } catch (e) {
      // 订阅消息发送失败（未授权或模板ID无效）静默处理
    }
  } catch (e) {
    // 静默处理
  }
}
