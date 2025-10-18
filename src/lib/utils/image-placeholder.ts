/**
 * 图片占位符工具
 * 用于 Next.js Image 组件的 blurDataURL
 */

/**
 * 生成 shimmer 效果的 SVG
 */
export function shimmer(w: number, h: number): string {
  return `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f5f5f5" offset="20%" />
      <stop stop-color="#e5e5e5" offset="50%" />
      <stop stop-color="#f5f5f5" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f5f5f5" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`
}

/**
 * 将 SVG 转换为 base64 data URL
 */
export function toBase64(str: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(str).toString('base64')
  }
  return window.btoa(str)
}

/**
 * 获取 shimmer 占位符的 data URL
 */
export function getShimmerPlaceholder(w: number, h: number): string {
  return `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`
}
