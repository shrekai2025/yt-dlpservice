import { toast as showToast } from './toast'

export interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, variant = 'default', duration } = options

    let message = title || ''
    if (description) {
      message = message ? `${message}: ${description}` : description
    }

    if (!message) return

    // variant='destructive' 对应 error 类型
    // variant='default' 对应 info 类型
    const toastType = variant === 'destructive' ? 'error' : 'info'
    showToast(message, { type: toastType, duration })
  }

  return { toast }
}
