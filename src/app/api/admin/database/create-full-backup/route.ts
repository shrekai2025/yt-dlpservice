import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import archiver from "archiver"
import { createWriteStream } from "fs"

/**
 * 创建完整备份 API
 * POST /api/admin/database/create-full-backup
 *
 * 支持两种备份模式：
 * 1. 仅数据库（默认）：只备份 app.db
 * 2. 完整备份：备份数据库 + 所有媒体文件
 */

// 获取数据目录路径
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

/**
 * 创建 tar.gz 压缩包
 */
async function createTarGz(sourceDir: string, outputPath: string, includeMedia: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath)
    const archive = archiver("tar", {
      gzip: true,
      gzipOptions: { level: 6 }, // 压缩级别 1-9，6是平衡
    })

    output.on("close", () => {
      resolve()
    })

    archive.on("error", (err) => {
      reject(err)
    })

    archive.pipe(output)

    // 总是包含数据库文件
    const dbPath = getDatabasePath()
    if (existsSync(dbPath)) {
      archive.file(dbPath, { name: "app.db" })
    }

    if (includeMedia) {
      // 包含所有重要的数据目录
      const directoriesToBackup = [
        "media-uploads",
        "media-thumbnails",
        "exports",
        "cookies",
        "temp",
      ]

      for (const dir of directoriesToBackup) {
        const dirPath = path.join(sourceDir, dir)
        if (existsSync(dirPath)) {
          archive.directory(dirPath, dir)
        }
      }

      // 包含重要的配置文件（如果存在）
      const filesToBackup = [
        "mavaeai-cc140-255bcb477e8d.json", // Google credentials
      ]

      for (const file of filesToBackup) {
        const filePath = path.join(sourceDir, file)
        if (existsSync(filePath)) {
          archive.file(filePath, { name: file })
        }
      }
    }

    void archive.finalize()
  })
}

/**
 * 获取目录大小
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  if (!existsSync(dirPath)) {
    return 0
  }

  let totalSize = 0

  async function calculateSize(currentPath: string) {
    const stats = await fs.stat(currentPath)

    if (stats.isFile()) {
      totalSize += stats.size
    } else if (stats.isDirectory()) {
      const files = await fs.readdir(currentPath)
      for (const file of files) {
        await calculateSize(path.join(currentPath, file))
      }
    }
  }

  await calculateSize(dirPath)
  return totalSize
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { includeMedia?: boolean }
    const includeMedia = body.includeMedia ?? false

    const dataDir = getDataDirectory()
    const dbPath = getDatabasePath()

    // 检查数据库是否存在
    if (!existsSync(dbPath)) {
      return NextResponse.json(
        {
          success: false,
          message: `数据库文件不存在: ${dbPath}`,
        },
        { status: 404 }
      )
    }

    if (includeMedia) {
      // 创建完整备份（tar.gz）
      const fullBackupPath = getFullBackupPath()

      // 如果已有完整备份，先创建旧备份
      if (existsSync(fullBackupPath)) {
        const oldBackupPath = `${fullBackupPath}.old`
        await fs.copyFile(fullBackupPath, oldBackupPath)

        try {
          // 创建新备份
          await createTarGz(dataDir, fullBackupPath, true)

          // 删除旧备份
          await fs.unlink(oldBackupPath)
        } catch (error) {
          // 如果创建失败，恢复旧备份
          if (existsSync(oldBackupPath)) {
            await fs.copyFile(oldBackupPath, fullBackupPath)
            await fs.unlink(oldBackupPath)
          }
          throw error
        }
      } else {
        // 直接创建新备份
        await createTarGz(dataDir, fullBackupPath, true)
      }

      const backupStats = await fs.stat(fullBackupPath)

      // 计算原始数据大小
      const dbSize = (await fs.stat(dbPath)).size
      const mediaUploadsSize = await getDirectorySize(path.join(dataDir, "media-uploads"))
      const mediaThumbnailsSize = await getDirectorySize(path.join(dataDir, "media-thumbnails"))
      const exportsSize = await getDirectorySize(path.join(dataDir, "exports"))
      const cookiesSize = await getDirectorySize(path.join(dataDir, "cookies"))
      const tempSize = await getDirectorySize(path.join(dataDir, "temp"))

      const totalOriginalSize = dbSize + mediaUploadsSize + mediaThumbnailsSize + exportsSize + cookiesSize + tempSize
      const compressionRatio = ((1 - backupStats.size / totalOriginalSize) * 100).toFixed(2)

      return NextResponse.json({
        success: true,
        message: "完整备份创建成功",
        data: {
          backupType: "full",
          backupPath: fullBackupPath,
          backupSize: backupStats.size,
          formattedBackupSize: formatFileSize(backupStats.size),
          originalSize: totalOriginalSize,
          formattedOriginalSize: formatFileSize(totalOriginalSize),
          compressionRatio: `${compressionRatio}%`,
          backupCreatedAt: backupStats.mtime,
          includedItems: {
            database: true,
            mediaUploads: mediaUploadsSize > 0,
            mediaThumbnails: mediaThumbnailsSize > 0,
            exports: exportsSize > 0,
            cookies: cookiesSize > 0,
            temp: tempSize > 0,
          },
          sizes: {
            database: formatFileSize(dbSize),
            mediaUploads: formatFileSize(mediaUploadsSize),
            mediaThumbnails: formatFileSize(mediaThumbnailsSize),
            exports: formatFileSize(exportsSize),
            cookies: formatFileSize(cookiesSize),
            temp: formatFileSize(tempSize),
          },
        },
      })
    } else {
      // 仅创建数据库备份
      const dbBackupPath = getDbOnlyBackupPath()

      // 如果备份文件已存在，先备份旧的备份文件
      if (existsSync(dbBackupPath)) {
        const oldBackupPath = `${dbBackupPath}.old`
        await fs.copyFile(dbBackupPath, oldBackupPath)

        try {
          await fs.copyFile(dbPath, dbBackupPath)
          await fs.unlink(oldBackupPath)
        } catch (error) {
          if (existsSync(oldBackupPath)) {
            await fs.copyFile(oldBackupPath, dbBackupPath)
            await fs.unlink(oldBackupPath)
          }
          throw error
        }
      } else {
        await fs.copyFile(dbPath, dbBackupPath)
      }

      const backupStats = await fs.stat(dbBackupPath)

      return NextResponse.json({
        success: true,
        message: "数据库备份创建成功",
        data: {
          backupType: "database-only",
          backupPath: dbBackupPath,
          backupSize: backupStats.size,
          formattedBackupSize: formatFileSize(backupStats.size),
          backupCreatedAt: backupStats.mtime,
        },
      })
    }
  } catch (error) {
    console.error("创建备份失败:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "创建备份失败",
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
