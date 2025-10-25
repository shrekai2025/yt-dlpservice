import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import { existsSync } from "fs"
import path from "path"

/**
 * 上传备份文件 API
 * POST /api/admin/database/upload-backup
 */

// 数据库路径配置
const getDatabasePath = () => {
  const databaseUrl = process.env.DATABASE_URL || "file:./data/app.db"
  const filePath = databaseUrl.replace("file:", "")
  if (!path.isAbsolute(filePath)) {
    return path.join(process.cwd(), filePath)
  }
  return filePath
}

const getBackupPath = () => {
  const dbPath = getDatabasePath()
  return `${dbPath}.backup`
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { success: false, message: "未找到上传的文件" },
        { status: 400 }
      )
    }

    // 验证文件类型（检查是否为 SQLite 数据库）
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith(".db") && !fileName.endsWith(".backup") && !fileName.endsWith(".sqlite")) {
      return NextResponse.json(
        {
          success: false,
          message: "文件类型不正确，请上传 .db、.backup 或 .sqlite 文件"
        },
        { status: 400 }
      )
    }

    // 验证文件大小（限制在 100MB 以内）
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          message: `文件过大，最大支持 100MB（当前: ${(file.size / 1024 / 1024).toFixed(2)} MB）`
        },
        { status: 400 }
      )
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 验证文件是否为有效的 SQLite 数据库
    // SQLite 文件头应该以 "SQLite format 3" 开始
    const header = buffer.toString("utf-8", 0, 15)
    if (!header.startsWith("SQLite format 3")) {
      return NextResponse.json(
        {
          success: false,
          message: "文件不是有效的 SQLite 数据库文件"
        },
        { status: 400 }
      )
    }

    // 保存到备份位置
    const backupPath = getBackupPath()

    // 如果备份文件已存在，先备份旧的备份文件
    if (existsSync(backupPath)) {
      const oldBackupPath = `${backupPath}.old`
      await fs.copyFile(backupPath, oldBackupPath)

      try {
        // 写入新备份
        await fs.writeFile(backupPath, buffer)

        // 删除旧备份
        await fs.unlink(oldBackupPath)
      } catch (error) {
        // 如果写入失败，恢复旧备份
        if (existsSync(oldBackupPath)) {
          await fs.copyFile(oldBackupPath, backupPath)
          await fs.unlink(oldBackupPath)
        }
        throw error
      }
    } else {
      // 直接写入新备份
      await fs.writeFile(backupPath, buffer)
    }

    const stats = await fs.stat(backupPath)

    return NextResponse.json({
      success: true,
      message: "备份文件上传成功",
      data: {
        backupPath: backupPath,
        backupSize: stats.size,
        formattedBackupSize: formatFileSize(stats.size),
        backupCreatedAt: stats.mtime,
      },
    })
  } catch (error) {
    console.error("上传备份文件失败:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "上传备份文件失败",
      },
      { status: 500 }
    )
  }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"

  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
