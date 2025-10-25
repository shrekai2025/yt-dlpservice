import { NextRequest, NextResponse } from "next/server"
import { existsSync, createReadStream } from "fs"
import { stat } from "fs/promises"
import path from "path"

/**
 * 下载备份文件 API
 * GET /api/admin/database/download-backup?type=full|database
 */

const getDataDirectory = () => {
  const databaseUrl = process.env.DATABASE_URL || "file:./data/app.db"
  const dbPath = databaseUrl.replace("file:", "")
  const absoluteDbPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath)
  return path.dirname(absoluteDbPath)
}

const getDatabasePath = () => {
  const databaseUrl = process.env.DATABASE_URL || "file:./data/app.db"
  const filePath = databaseUrl.replace("file:", "")
  if (!path.isAbsolute(filePath)) {
    return path.join(process.cwd(), filePath)
  }
  return filePath
}

const getFullBackupPath = () => {
  const dataDir = getDataDirectory()
  return path.join(dataDir, "full-backup.tar.gz")
}

const getDbOnlyBackupPath = () => {
  const dbPath = getDatabasePath()
  return `${dbPath}.backup`
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const backupType = searchParams.get("type") ?? "database"

    let backupPath: string
    let filename: string
    let contentType: string

    if (backupType === "full") {
      backupPath = getFullBackupPath()
      filename = `full-backup-${new Date().toISOString().split("T")[0]}.tar.gz`
      contentType = "application/gzip"
    } else {
      backupPath = getDbOnlyBackupPath()
      filename = `database-backup-${new Date().toISOString().split("T")[0]}.db`
      contentType = "application/x-sqlite3"
    }

    // 检查备份文件是否存在
    if (!existsSync(backupPath)) {
      return NextResponse.json(
        {
          success: false,
          message: `备份文件不存在: ${backupPath}`,
        },
        { status: 404 }
      )
    }

    // 获取文件信息
    const stats = await stat(backupPath)

    // 创建文件流
    const fileStream = createReadStream(backupPath)

    // 将 Node.js 可读流转换为 Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
        })

        fileStream.on("end", () => {
          controller.close()
        })

        fileStream.on("error", (error) => {
          controller.error(error)
        })
      },
      cancel() {
        fileStream.destroy()
      },
    })

    // 返回文件流
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": stats.size.toString(),
      },
    })
  } catch (error) {
    console.error("下载备份文件失败:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "下载备份文件失败",
      },
      { status: 500 }
    )
  }
}
