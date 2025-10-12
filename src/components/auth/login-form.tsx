"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

type LoginFormProps = {
  redirectTo: string
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const username = String(formData.get("username") ?? "")
    const password = String(formData.get("password") ?? "")

    if (!username || !password) {
      setErrorMessage("请输入用户名和密码")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setErrorMessage(result.error ?? "登录失败，请稍后再试")
        return
      }

      router.replace(redirectTo)
      router.refresh()
    } catch (error) {
      console.error("Failed to login:", error)
      setErrorMessage("网络或服务器异常，请稍后重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label
          className="block text-sm font-medium text-gray-700"
          htmlFor="username"
        >
          用户名
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="管理员用户名"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <label
          className="block text-sm font-medium text-gray-700"
          htmlFor="password"
        >
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="管理员密码"
          disabled={isSubmitting}
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        disabled={isSubmitting}
      >
        {isSubmitting ? "登录中..." : "登录"}
      </button>
    </form>
  )
}
