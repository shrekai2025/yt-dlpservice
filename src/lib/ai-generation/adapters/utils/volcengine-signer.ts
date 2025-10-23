/**
 * 火山引擎 API 签名工具
 *
 * 根据火山引擎公共参数文档实现签名机制
 * https://www.volcengine.com/docs/6348/155534
 *
 * 关键要点：
 * 1. SecretAccessKey 必须使用原始的 Base64 字符串，不要解码
 * 2. Content-Type 需要包含在签名中
 * 3. X-Content-Sha256 必须添加到请求头和签名中
 */

import * as crypto from 'crypto'

interface SignatureParams {
  accessKeyId: string
  secretAccessKey: string  // 原始的 Base64 字符串
  service: string // 固定值: cv
  region: string  // 固定值: cn-north-1
  method: string  // POST
  path: string    // 请求路径
  query?: Record<string, string>
  headers?: Record<string, string>
  body?: string
}

/**
 * 生成火山引擎 API 签名头
 */
export function generateVolcengineSignature(params: SignatureParams): Record<string, string> {
  const {
    accessKeyId,
    secretAccessKey,
    service,
    region,
    method,
    path,
    query = {},
    headers = {},
    body = '',
  } = params

  // 1. 生成时间戳（格式：YYYYMMDDTHHMMSSZ）
  const now = new Date()
  const xDate = formatISO8601(now)
  const shortDate = xDate.substring(0, 8)

  // 2. 计算 Body 的 SHA256 哈希
  const hashedPayload = crypto.createHash('sha256').update(body, 'utf8').digest('hex')

  // 3. 构建规范化请求头
  // 根据官方文档，不签名的头包括：authorization, content-length, user-agent, presigned-expires, expect
  // 但要签名：host, x-date, x-content-sha256, content-type
  const unsignableHeaders = ['authorization', 'content-length', 'user-agent', 'presigned-expires', 'expect']

  const allHeaders: Record<string, string> = {
    ...headers,
    'X-Date': xDate,
    'X-Content-Sha256': hashedPayload,
    'Host': 'visual.volcengineapi.com',
  }

  // 过滤出需要签名的头
  const signableHeaderKeys = Object.keys(allHeaders)
    .filter(key => unsignableHeaders.indexOf(key.toLowerCase()) < 0)
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))

  const canonicalHeaders = signableHeaderKeys
    .map(key => {
      const value = allHeaders[key]
      // 规范化header值：替换多个空格为单个，去除首尾空格
      const canonicalValue = `${value}`.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '')
      return `${key.toLowerCase()}:${canonicalValue}`
    })
    .join('\n')

  const signedHeaders = signableHeaderKeys
    .map(key => key.toLowerCase())
    .sort()
    .join(';')

  // 4. 规范化查询字符串（使用官方的 uriEscape 编码）
  const canonicalQueryString = Object.keys(query)
    .sort()
    .map(key => {
      const val = query[key]
      const escapedKey = uriEscape(key)
      const escapedVal = uriEscape(val)
      return `${escapedKey}=${escapedVal}`
    })
    .join('&')

  // 5. 构建规范请求
  const canonicalRequest = [
    method.toUpperCase(),
    path,
    canonicalQueryString,
    canonicalHeaders + '\n',  // 注意这里要加换行符
    signedHeaders,
    hashedPayload,
  ].join('\n')

  // 6. 构建待签名字符串
  const credentialScope = `${shortDate}/${region}/${service}/request`
  const hashedCanonicalRequest = crypto
    .createHash('sha256')
    .update(canonicalRequest, 'utf8')
    .digest('hex')

  const stringToSign = [
    'HMAC-SHA256',
    xDate,
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n')

  // 7. 计算签名
  // 重要：第一步使用 secretAccessKey 字符串，之后使用 Buffer
  const kDate = hmacSha256(shortDate, secretAccessKey)
  const kRegion = hmacSha256(region, kDate)
  const kService = hmacSha256(service, kRegion)
  const kSigning = hmacSha256('request', kService)
  const signature = hmacSha256(stringToSign, kSigning, 'hex')

  // 8. 构建 Authorization Header
  const authorization = [
    `HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ')

  // 返回需要添加到请求头的字段
  return {
    Authorization: authorization,
    'X-Date': xDate,
    'X-Content-Sha256': hashedPayload,
  }
}

/**
 * HMAC-SHA256 哈希
 */
function hmacSha256(
  data: string,
  key: string | Buffer,
  outputFormat: 'hex' | 'buffer' = 'buffer'
): string | Buffer {
  const hmac = crypto.createHmac('sha256', key)
  hmac.update(data, 'utf8')
  return outputFormat === 'hex' ? hmac.digest('hex') : hmac.digest()
}

/**
 * 格式化 ISO8601 时间戳
 * 格式: YYYYMMDDTHHMMSSZ
 */
function formatISO8601(date: Date): string {
  return date.toISOString().replace(/[:\-]|\.\d{3}/g, '')
}

/**
 * URI 编码（按照火山引擎规范）
 * 保留字符：A-Z a-z 0-9 - _ . ~
 */
function uriEscape(str: string): string {
  try {
    return encodeURIComponent(str)
      .replace(/[^A-Za-z0-9_.~\-%]+/g, (match) => {
        // 对特殊字符进行编码
        return match.split('').map(ch => {
          const code = ch.charCodeAt(0)
          return '%' + code.toString(16).toUpperCase()
        }).join('')
      })
      .replace(/[*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`)
  } catch (e) {
    return ''
  }
}
