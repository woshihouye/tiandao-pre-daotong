const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { imageBase64 } = event
  if (!imageBase64) return { ok: false, reason: '缺少图片数据' }
  
  try {
    // 将base64转为Buffer
    const buffer = Buffer.from(imageBase64, 'base64')
    
    // 调用微信云调用安全检测
    const result = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/png',
        value: buffer
      }
    })
    
    if (result.errCode === 0) {
      return { ok: true, reason: '' }
    } else {
      return { ok: false, reason: '图片包含违规内容' }
    }
  } catch (e) {
    // 云调用失败时（如开发环境不支持），返回安全放行但记录日志
    console.error('[imgSecCheck] 检测调用失败:', e.errCode || e.message)
    return { ok: true, reason: '检测服务暂不可用' }
  }
}
