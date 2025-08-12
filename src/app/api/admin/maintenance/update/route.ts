import { NextResponse } from 'next/server'
import { promisify } from 'util'
import { exec } from 'child_process'
import * as fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

export async function POST() {
  try {
    const repoRoot = process.cwd()
    const logsDir = path.join(repoRoot, 'logs')
    const statusFile = path.join(logsDir, 'oneclick-update.status')
    const latestFile = path.join(logsDir, 'oneclick-update.latest')

    await fs.mkdir(logsDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const logPath = path.join(logsDir, `oneclick-update-${timestamp}.log`)

    // reset status and record latest log file
    await fs.writeFile(statusFile, 'START', 'utf-8')
    await fs.writeFile(latestFile, logPath, 'utf-8')

    // ensure script is executable
    const scriptPath = path.join(repoRoot, 'deploy', 'oneclick-update.sh')
    await fs.chmod(scriptPath, 0o755)

    // run in background via nohup; append logs
    const cmd = `nohup bash "${scriptPath}" >> "${logPath}" 2>&1 &`
    await execAsync(cmd)

    return NextResponse.json({ success: true, message: 'Update started', logPath })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

