/**
 * Parameter Mapper Utility
 *
 * Maps unified parameters to provider-specific formats
 */

/**
 * Aspect ratio definitions
 */
export const ASPECT_RATIOS = {
  SQUARE: '1:1',
  LANDSCAPE_4_3: '4:3',
  PORTRAIT_3_4: '3:4',
  WIDESCREEN_16_9: '16:9',
  MOBILE_9_16: '9:16',
  ULTRAWIDE_21_9: '21:9',
  TALL_9_21: '9:21',
} as const

/**
 * Size to aspect ratio mapping
 */
const SIZE_TO_ASPECT_RATIO: Record<string, string> = {
  // Square
  '1024x1024': ASPECT_RATIOS.SQUARE,
  '512x512': ASPECT_RATIOS.SQUARE,
  '768x768': ASPECT_RATIOS.SQUARE,
  // Landscape 4:3
  '1024x768': ASPECT_RATIOS.LANDSCAPE_4_3,
  '1536x1152': ASPECT_RATIOS.LANDSCAPE_4_3,
  // Portrait 3:4
  '768x1024': ASPECT_RATIOS.PORTRAIT_3_4,
  '1152x1536': ASPECT_RATIOS.PORTRAIT_3_4,
  // Widescreen 16:9
  '1920x1080': ASPECT_RATIOS.WIDESCREEN_16_9,
  '1792x1008': ASPECT_RATIOS.WIDESCREEN_16_9,
  '1344x756': ASPECT_RATIOS.WIDESCREEN_16_9,
  // Mobile 9:16
  '1080x1920': ASPECT_RATIOS.MOBILE_9_16,
  '1008x1792': ASPECT_RATIOS.MOBILE_9_16,
  '756x1344': ASPECT_RATIOS.MOBILE_9_16,
  // Ultrawide 21:9
  '2560x1080': ASPECT_RATIOS.ULTRAWIDE_21_9,
  '1792x756': ASPECT_RATIOS.ULTRAWIDE_21_9,
  // Tall 9:21
  '1080x2560': ASPECT_RATIOS.TALL_9_21,
  '756x1792': ASPECT_RATIOS.TALL_9_21,
  // Direct ratio formats
  '21:9': ASPECT_RATIOS.ULTRAWIDE_21_9,
  '16:9': ASPECT_RATIOS.WIDESCREEN_16_9,
  '4:3': ASPECT_RATIOS.LANDSCAPE_4_3,
  '1:1': ASPECT_RATIOS.SQUARE,
  '3:4': ASPECT_RATIOS.PORTRAIT_3_4,
  '9:16': ASPECT_RATIOS.MOBILE_9_16,
  '9:21': ASPECT_RATIOS.TALL_9_21,
}

/**
 * Parse size string to width and height
 */
export function parseSizeString(size: string): { width: number; height: number } | null {
  const separators = ['x', 'X', ':']
  for (const sep of separators) {
    if (size.includes(sep)) {
      const [w, h] = size.split(sep)
      const width = parseInt(w!, 10)
      const height = parseInt(h!, 10)
      if (!isNaN(width) && !isNaN(height)) {
        return { width, height }
      }
    }
  }
  return null
}

/**
 * Calculate aspect ratio from size
 */
export function calculateAspectRatio(width: number, height: number): string {
  const ratio = width / height

  // Check against known ratios with tolerance
  const ratioChecks: Array<{ ratio: number; aspectRatio: string }> = [
    { ratio: 1.0, aspectRatio: ASPECT_RATIOS.SQUARE },
    { ratio: 21 / 9, aspectRatio: ASPECT_RATIOS.ULTRAWIDE_21_9 },
    { ratio: 16 / 9, aspectRatio: ASPECT_RATIOS.WIDESCREEN_16_9 },
    { ratio: 4 / 3, aspectRatio: ASPECT_RATIOS.LANDSCAPE_4_3 },
    { ratio: 3 / 4, aspectRatio: ASPECT_RATIOS.PORTRAIT_3_4 },
    { ratio: 9 / 16, aspectRatio: ASPECT_RATIOS.MOBILE_9_16 },
    { ratio: 9 / 21, aspectRatio: ASPECT_RATIOS.TALL_9_21 },
  ]

  for (const check of ratioChecks) {
    if (Math.abs(ratio - check.ratio) < 0.1) {
      return check.aspectRatio
    }
  }

  // Find closest match based on ratio ranges
  if (ratio >= 2.0) return ASPECT_RATIOS.ULTRAWIDE_21_9
  if (ratio >= 1.5) return ASPECT_RATIOS.WIDESCREEN_16_9
  if (ratio > 1.0) return ASPECT_RATIOS.LANDSCAPE_4_3
  if (ratio >= 0.7) return ASPECT_RATIOS.PORTRAIT_3_4
  if (ratio >= 0.4) return ASPECT_RATIOS.MOBILE_9_16
  return ASPECT_RATIOS.TALL_9_21
}

/**
 * Map size input to aspect ratio
 */
export function mapSizeToAspectRatio(sizeInput: string): string {
  // Direct lookup
  if (sizeInput in SIZE_TO_ASPECT_RATIO) {
    return SIZE_TO_ASPECT_RATIO[sizeInput]!
  }

  // Try parsing
  const parsed = parseSizeString(sizeInput)
  if (parsed) {
    return calculateAspectRatio(parsed.width, parsed.height)
  }

  // Default fallback
  console.warn(`Unable to parse size input: ${sizeInput}, defaulting to 1:1`)
  return ASPECT_RATIOS.SQUARE
}

/**
 * Map aspect ratio to OpenAI size format
 */
export function mapAspectRatioToOpenAISize(aspectRatio: string): string {
  const map: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1792x1024',
    '9:16': '1024x1792',
  }
  return map[aspectRatio] || '1024x1024'
}

/**
 * Extract numeric parameters with validation
 */
export function extractNumericParameter(
  parameters: Record<string, unknown>,
  key: string,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  const value = parameters[key]

  if (value === undefined || value === null) {
    return defaultValue
  }

  const numValue = typeof value === 'number' ? value : parseFloat(String(value))

  if (isNaN(numValue)) {
    console.warn(`Invalid numeric parameter ${key}: ${value}, using default ${defaultValue}`)
    return defaultValue
  }

  if (min !== undefined && numValue < min) {
    console.warn(`Parameter ${key} below minimum ${min}, clamping`)
    return min
  }

  if (max !== undefined && numValue > max) {
    console.warn(`Parameter ${key} above maximum ${max}, clamping`)
    return max
  }

  return numValue
}
