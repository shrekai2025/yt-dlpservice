'use client'

/**
 * Global Error Handler
 * This prevents Next.js from trying to generate static error pages
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h2>出错了</h2>
          <p>{error.message}</p>
          <button onClick={() => reset()}>重试</button>
        </div>
      </body>
    </html>
  )
}
