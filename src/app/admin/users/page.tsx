"use client"

export const dynamic = 'force-dynamic'

import { useState } from "react"
import { api } from "~/components/providers/trpc-provider"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"

export default function UsersPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  // 查询用户列表
  const { data: users, refetch } = api.user.list.useQuery()

  // 创建用户 Mutation
  const createUser = api.user.create.useMutation({
    onSuccess: () => {
      setIsAddDialogOpen(false)
      setNewUsername("")
      setNewPassword("")
      setFormError(null)
      void refetch()
    },
    onError: (error: { message: string }) => {
      setFormError(error.message)
    },
  })

  // 删除用户 Mutation
  const deleteUser = api.user.delete.useMutation({
    onSuccess: () => {
      setDeleteUserId(null)
      void refetch()
    },
    onError: (error: { message: string }) => {
      alert(error.message)
      setDeleteUserId(null)
    },
  })

  const handleAddUser = () => {
    setFormError(null)

    if (!newUsername.trim() || !newPassword.trim()) {
      setFormError("用户名和密码不能为空")
      return
    }

    createUser.mutate({
      username: newUsername.trim(),
      password: newPassword.trim(),
    })
  }

  const handleDeleteUser = (userId: string) => {
    deleteUser.mutate({ id: userId })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">用户管理</h1>
          <p className="mt-1 text-sm text-neutral-600">
            管理系统用户账号，可以添加或删除用户
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>添加新用户</Button>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700">
                  用户名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700">
                  创建时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-700">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {users?.map((user: { id: string; username: string; createdAt: Date }) => (
                <tr key={user.id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">
                    {user.username}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-600">
                    {new Date(user.createdAt).toLocaleString("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteUserId(user.id)}
                    >
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!users || users.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-neutral-500">暂无用户</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* 添加用户对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新用户</DialogTitle>
            <DialogDescription>
              创建新的管理员账号。用户名和密码不能为空。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="text-sm font-medium text-neutral-700"
              >
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="请输入用户名"
                disabled={createUser.isPending}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-neutral-700"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="请输入密码"
                disabled={createUser.isPending}
              />
            </div>

            {formError ? (
              <p className="text-sm text-red-600">{formError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false)
                setNewUsername("")
                setNewPassword("")
                setFormError(null)
              }}
              disabled={createUser.isPending}
            >
              取消
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={createUser.isPending}
            >
              {createUser.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteUserId !== null}
        onOpenChange={(open: boolean) => !open && setDeleteUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。确定要删除该用户吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && handleDeleteUser(deleteUserId)}
              disabled={deleteUser.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUser.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
