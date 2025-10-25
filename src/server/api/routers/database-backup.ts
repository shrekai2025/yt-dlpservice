import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import fs from "fs/promises"
import { existsSync, statSync, createReadStream, createWriteStream } from "fs"
import path from "path"
import { pipeline } from "stream/promises"
import { tmpdir } from "os"

/**
 * 数据库备份 Router
 * 提供数据库备份和恢复功能
 * 支持两种备份模式：
 * 1. 数据库备份（仅备份 app.db）
 * 2. 完整备份（备份数据库 + 所有媒体文件）
 */

// 数据库路径配置
const getDatabasePath = () => {
  const databaseUrl = process.env.DATABASE_URL || "file:./data/app.db"
  // 从 DATABASE_URL 提取实际文件路径
  const filePath = databaseUrl.replace("file:", "")

  // 如果是相对路径，转换为绝对路径
  if (!path.isAbsolute(filePath)) {
    return path.join(process.cwd(), filePath)
  }

  return filePath
}

const getDataDirectory = () => {
  const dbPath = getDatabasePath()
  return path.dirname(dbPath)
}

const getBackupPath = () => {
  const dbPath = getDatabasePath()
  return `${dbPath}.backup`
}

const getFullBackupPath = () => {
  const dataDir = getDataDirectory()
  return path.join(dataDir, "full-backup.tar.gz")
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

export const databaseBackupRouter = createTRPCRouter({
  /**
   * 获取备份信息
   */
  getBackupInfo: publicProcedure.query(async () => {
    try {
      const dbPath = getDatabasePath()
      const backupPath = getBackupPath()

      const dbExists = existsSync(dbPath)
      const backupExists = existsSync(backupPath)

      let dbSize = 0
      let backupSize = 0
      let backupCreatedAt = null

      if (dbExists) {
        const dbStats = statSync(dbPath)
        dbSize = dbStats.size
      }

      if (backupExists) {
        const backupStats = statSync(backupPath)
        backupSize = backupStats.size
        backupCreatedAt = backupStats.mtime
      }

      return {
        success: true,
        data: {
          databasePath: dbPath,
          backupPath: backupPath,
          databaseExists: dbExists,
          backupExists: backupExists,
          databaseSize: dbSize,
          backupSize: backupSize,
          backupCreatedAt: backupCreatedAt,
          formattedDatabaseSize: formatFileSize(dbSize),
          formattedBackupSize: formatFileSize(backupSize),
        },
      }
    } catch (error) {
      console.error("获取备份信息失败:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "获取备份信息失败",
      }
    }
  }),

  /**
   * 创建备份
   */
  createBackup: publicProcedure.mutation(async () => {
    try {
      const dbPath = getDatabasePath()
      const backupPath = getBackupPath()

      // 检查数据库文件是否存在
      if (!existsSync(dbPath)) {
        return {
          success: false,
          message: `数据库文件不存在: ${dbPath}`,
        }
      }

      // 复制数据库文件到备份位置
      await fs.copyFile(dbPath, backupPath)

      // 获取备份文件信息
      const backupStats = statSync(backupPath)

      return {
        success: true,
        message: "数据库备份成功",
        data: {
          backupPath: backupPath,
          backupSize: backupStats.size,
          formattedBackupSize: formatFileSize(backupStats.size),
          backupCreatedAt: backupStats.mtime,
        },
      }
    } catch (error) {
      console.error("创建备份失败:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "创建备份失败",
      }
    }
  }),

  /**
   * 恢复备份
   */
  restoreBackup: publicProcedure.mutation(async () => {
    try {
      const dbPath = getDatabasePath()
      const backupPath = getBackupPath()

      // 检查备份文件是否存在
      if (!existsSync(backupPath)) {
        return {
          success: false,
          message: `备份文件不存在: ${backupPath}`,
        }
      }

      // 先创建当前数据库的临时备份（以防恢复失败）
      const tempBackupPath = `${dbPath}.temp`
      if (existsSync(dbPath)) {
        await fs.copyFile(dbPath, tempBackupPath)
      }

      try {
        // 复制备份文件到数据库位置
        await fs.copyFile(backupPath, dbPath)

        // 删除临时备份
        if (existsSync(tempBackupPath)) {
          await fs.unlink(tempBackupPath)
        }

        return {
          success: true,
          message: "数据库恢复成功，请刷新页面",
        }
      } catch (error) {
        // 如果恢复失败，尝试还原临时备份
        if (existsSync(tempBackupPath)) {
          await fs.copyFile(tempBackupPath, dbPath)
          await fs.unlink(tempBackupPath)
        }
        throw error
      }
    } catch (error) {
      console.error("恢复备份失败:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "恢复备份失败",
      }
    }
  }),

  /**
   * 删除备份
   */
  deleteBackup: publicProcedure.mutation(async () => {
    try {
      const backupPath = getBackupPath()

      // 检查备份文件是否存在
      if (!existsSync(backupPath)) {
        return {
          success: false,
          message: "备份文件不存在",
        }
      }

      // 删除备份文件
      await fs.unlink(backupPath)

      return {
        success: true,
        message: "备份文件已删除",
      }
    } catch (error) {
      console.error("删除备份失败:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "删除备份失败",
      }
    }
  }),

  /**
   * 获取完整备份信息
   * 包括数据库和媒体文件的大小统计
   */
  getFullBackupInfo: publicProcedure.query(async () => {
    try {
      const dbPath = getDatabasePath()
      const dataDir = getDataDirectory()
      const dbBackupPath = getBackupPath()
      const fullBackupPath = getFullBackupPath()

      const dbExists = existsSync(dbPath)
      const dbBackupExists = existsSync(dbBackupPath)
      const fullBackupExists = existsSync(fullBackupPath)

      let dbSize = 0
      let dbBackupSize = 0
      let dbBackupCreatedAt = null
      let fullBackupSize = 0
      let fullBackupCreatedAt = null

      if (dbExists) {
        const dbStats = statSync(dbPath)
        dbSize = dbStats.size
      }

      if (dbBackupExists) {
        const backupStats = statSync(dbBackupPath)
        dbBackupSize = backupStats.size
        dbBackupCreatedAt = backupStats.mtime
      }

      if (fullBackupExists) {
        const fullBackupStats = statSync(fullBackupPath)
        fullBackupSize = fullBackupStats.size
        fullBackupCreatedAt = fullBackupStats.mtime
      }

      // 计算媒体目录大小
      const mediaUploadsSize = await getDirectorySize(path.join(dataDir, "media-uploads"))
      const mediaThumbnailsSize = await getDirectorySize(path.join(dataDir, "media-thumbnails"))
      const exportsSize = await getDirectorySize(path.join(dataDir, "exports"))
      const cookiesSize = await getDirectorySize(path.join(dataDir, "cookies"))
      const tempSize = await getDirectorySize(path.join(dataDir, "temp"))

      const totalMediaSize = mediaUploadsSize + mediaThumbnailsSize + exportsSize + cookiesSize + tempSize
      const totalDataSize = dbSize + totalMediaSize

      return {
        success: true,
        data: {
          database: {
            path: dbPath,
            exists: dbExists,
            size: dbSize,
            formattedSize: formatFileSize(dbSize),
          },
          dbBackup: {
            path: dbBackupPath,
            exists: dbBackupExists,
            size: dbBackupSize,
            formattedSize: formatFileSize(dbBackupSize),
            createdAt: dbBackupCreatedAt,
          },
          fullBackup: {
            path: fullBackupPath,
            exists: fullBackupExists,
            size: fullBackupSize,
            formattedSize: formatFileSize(fullBackupSize),
            createdAt: fullBackupCreatedAt,
          },
          mediaDirectories: {
            uploads: {
              size: mediaUploadsSize,
              formattedSize: formatFileSize(mediaUploadsSize),
            },
            thumbnails: {
              size: mediaThumbnailsSize,
              formattedSize: formatFileSize(mediaThumbnailsSize),
            },
            exports: {
              size: exportsSize,
              formattedSize: formatFileSize(exportsSize),
            },
            cookies: {
              size: cookiesSize,
              formattedSize: formatFileSize(cookiesSize),
            },
            temp: {
              size: tempSize,
              formattedSize: formatFileSize(tempSize),
            },
          },
          totalSizes: {
            mediaOnly: totalMediaSize,
            formattedMediaOnly: formatFileSize(totalMediaSize),
            allData: totalDataSize,
            formattedAllData: formatFileSize(totalDataSize),
          },
        },
      }
    } catch (error) {
      console.error("获取完整备份信息失败:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "获取完整备份信息失败",
      }
    }
  }),

  /**
   * 删除完整备份
   */
  deleteFullBackup: publicProcedure.mutation(async () => {
    try {
      const fullBackupPath = getFullBackupPath()

      if (!existsSync(fullBackupPath)) {
        return {
          success: false,
          message: "完整备份文件不存在",
        }
      }

      await fs.unlink(fullBackupPath)

      return {
        success: true,
        message: "完整备份文件已删除",
      }
    } catch (error) {
      console.error("删除完整备份失败:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "删除完整备份失败",
      }
    }
  }),
})

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
