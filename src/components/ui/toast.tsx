/**
 * Toast Notification Component
 * 
 * 替代alert的现代化通知组件
 */

"use client"

import { useEffect, useState } from 'react'
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  type?: ToastType
  duration?: number
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'
}

interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

let toastList: ToastItem[] = []
let toastListeners: ((toasts: ToastItem[]) => void)[] = []

export function toast(message: string, options: ToastOptions = {}) {
  const {
    type = 'info',
    duration = 3000,
  } = options

  const id = Math.random().toString(36).substring(7)
  const newToast: ToastItem = { id, message, type, duration }

  toastList = [...toastList, newToast]
  toastListeners.forEach((listener) => listener(toastList))

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id)
    }, duration)
  }

  return id
}

toast.success = (message: string, duration = 3000) => {
  return toast(message, { type: 'success', duration })
}

toast.error = (message: string, duration = 5000) => {
  return toast(message, { type: 'error', duration })
}

toast.warning = (message: string, duration = 4000) => {
  return toast(message, { type: 'warning', duration })
}

toast.info = (message: string, duration = 3000) => {
  return toast(message, { type: 'info', duration })
}

function dismissToast(id: string) {
  toastList = toastList.filter((t) => t.id !== id)
  toastListeners.forEach((listener) => listener(toastList))
}

export function Toaster({ position = 'top-right' }: { position?: ToastOptions['position'] }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    toastListeners.push(setToasts)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts)
    }
  }, [])

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2 max-w-md`}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${bgColors[toast.type]} shadow-lg animate-slide-in-right`}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

