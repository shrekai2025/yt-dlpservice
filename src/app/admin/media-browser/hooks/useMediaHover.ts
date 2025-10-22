import { useCallback, useEffect, useRef, useState } from 'react'

type UseMediaHoverOptions = {
  delay?: number
}

export function useMediaHover(options: UseMediaHoverOptions = {}) {
  const { delay = 150 } = options
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleHover = useCallback(
    (fileId: string | null) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (fileId) {
        timeoutRef.current = setTimeout(() => {
          setHoveredId(fileId)
        }, delay)
      } else {
        setHoveredId(null)
      }
    },
    [delay]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    hoveredId,
    setHoveredId,
    handleHover,
  }
}
