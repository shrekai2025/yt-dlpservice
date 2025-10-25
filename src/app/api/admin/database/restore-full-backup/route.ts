import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import { existsSync, createReadStream } from "fs"
import path from "path"
import * as tar from "tar"

/**
 * 恢复完整备份 API
 * POST /api/admin/database/restore-full-backup
 *
 * 支持恢复两种类型的备份：
 * 1. 数据库备份（.db.backup）
 * 2. 完整备份（full-backup.tar.gz）
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

/**
 * 解压 tar.gz 备份文件
 */
async function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  await tar.extract({
    file: archivePath,
    cwd: destDir,
  })
}

/**
 * 创建目录的完整备份（用于回滚）
 */
async function backupCurrentData(dataDir: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const tempBackupPath = path.join(dataDir, `temp-backup-${timestamp}.tar.gz`)

  const { default: archiver } = await import("archiver")
  const { createWriteStream } = await import("fs")

  return new Promise((resolve, reject) => {
    const output = createWriteStream(tempBackupPath)
    const archive = archiver("tar", {
      gzip: true,
      gzipOptions: { level: 9 },
    })

    output.on("close", () => {
      resolve(tempBackupPath)
    })

    archive.on("error", (err) => {
      reject(err)
    })

    archive.pipe(output)

    // 备份数据库
    const dbPath = getDatabasePath()
    if (existsSync(dbPath)) {
      archive.file(dbPath, { name: "app.db" })
    }

    // 备份所有数据目录
    const directoriesToBackup = [
      "media-uploads",
      "media-thumbnails",
      "exports",
      "cookies",
      "temp",
    ]

    for (const dir of directoriesToBackup) {
      const dirPath = path.join(dataDir, dir)
      if (existsSync(dirPath)) {
        archive.directory(dirPath, dir)
      }
    }

    void archive.finalize()
  })
}

/**
 * 清理指定的目录
 */
async function cleanupDirectory(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    return
  }

  const files = await fs.readdir(dirPath)
  for (const file of files) {
    // 保留 .gitkeep 文件
    if (file === ".gitkeep") {
      continue
    }

    const filePath = path.join(dirPath, file)
    const stats = await fs.stat(filePath)

    if (stats.isDirectory()) {
      await fs.rm(filePath, { recursive: true, force: true })
    } else {
      await fs.unlink(filePath)
    }
  }
}

export async function POST(request: NextRequest) {
  let tempBackupPath: string | null = null

  try {
    const body = await request.json() as { backupType?: "full" | "database-only" }
    const backupType = body.backupType ?? "database-only"

    const dataDir = getDataDirectory()
    const dbPath = getDatabasePath()

    if (backupType === "full") {
      // 恢复完整备份
      const fullBackupPath = getFullBackupPath()

      if (!existsSync(fullBackupPath)) {
        return NextResponse.json(
          {
            success: false,
            message: `完整备份文件不存在: ${fullBackupPath}`,
          },
          { status: 404 }
        )
      }

      // 创建当前数据的临时备份（用于回滚）
      console.log("正在创建当前数据的临时备份...")
      tempBackupPath = await backupCurrentData(dataDir)
      console.log(`临时备份已创建: ${tempBackupPath}`)

      try {
        // 清理数据库文件
        if (existsSync(dbPath)) {
          await fs.unlink(dbPath)
        }

        // 清理所有媒体目录
        const directoriesToClean = [
          "media-uploads",
          "media-thumbnails",
          "exports",
          "cookies",
          "temp",
        ]

        for (const dir of directoriesToClean) {
          const dirPath = path.join(dataDir, dir)
          await cleanupDirectory(dirPath)
        }

        // 解压完整备份
        console.log("正在解压完整备份...")
        await extractTarGz(fullBackupPath, dataDir)
        console.log("完整备份解压成功")

        // 删除临时备份
        if (tempBackupPath && existsSync(tempBackupPath)) {
          await fs.unlink(tempBackupPath)
          tempBackupPath = null
        }

        return NextResponse.json({
          success: true,
          message: "完整备份恢复成功，请刷新页面",
          data: {
            backupType: "full",
            restoredFrom: fullBackupPath,
          },
        })
      } catch (error) {
        // 恢复失败，回滚到临时备份
        console.error("恢复失败，正在回滚...", error)

        if (tempBackupPath && existsSync(tempBackupPath)) {
          try {
            await extractTarGz(tempBackupPath, dataDir)
            await fs.unlink(tempBackupPath)
            tempBackupPath = null
          } catch (rollbackError) {
            console.error("回滚失败:", rollbackError)
            throw new Error(
              `恢复失败，回滚也失败。临时备份位置: ${tempBackupPath}。请手动恢复。`
            )
          }
        }

        throw error
      }
    } else {
      // 仅恢复数据库备份
      const dbBackupPath = getDbOnlyBackupPath()

      if (!existsSync(dbBackupPath)) {
        return NextResponse.json(
          {
            success: false,
            message: `数据库备份文件不存在: ${dbBackupPath}`,
          },
          { status: 404 }
        )
      }

      // 先创建当前数据库的临时备份
      const tempDbBackupPath = `${dbPath}.temp`
      if (existsSync(dbPath)) {
        await fs.copyFile(dbPath, tempDbBackupPath)
      }

      try {
        // 恢复数据库
        await fs.copyFile(dbBackupPath, dbPath)

        // 删除临时备份
        if (existsSync(tempDbBackupPath)) {
          await fs.unlink(tempDbBackupPath)
        }

        return NextResponse.json({
          success: true,
          message: "数据库备份恢复成功，请刷新页面",
          data: {
            backupType: "database-only",
            restoredFrom: dbBackupPath,
          },
        })
      } catch (error) {
        // 如果恢复失败，尝试还原临时备份
        if (existsSync(tempDbBackupPath)) {
          await fs.copyFile(tempDbBackupPath, dbPath)
          await fs.unlink(tempDbBackupPath)
        }
        throw error
      }
    }
  } catch (error) {
    console.error("恢复备份失败:", error)

    // 清理临时备份
    if (tempBackupPath && existsSync(tempBackupPath)) {
      try {
        await fs.unlink(tempBackupPath)
      } catch (cleanupError) {
        console.error("清理临时备份失败:", cleanupError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "恢复备份失败",
      },
      { status: 500 }
    )
  }
}
