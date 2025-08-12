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
    const statusFile = path.join(logsDir, 'login-setup.status')
    const latestFile = path.join(logsDir, 'login-setup.latest')
    await fs.mkdir(logsDir, { recursive: true })

    const scriptPath = path.join(repoRoot, 'deploy', 'login-setup.sh')
    await fs.chmod(scriptPath, 0o755)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const logPath = path.join(logsDir, `login-setup-${timestamp}.log`)
    await fs.writeFile(statusFile, 'START', 'utf-8')
    await fs.writeFile(latestFile, logPath, 'utf-8')

    const cmd = `nohup bash "${scriptPath}" >> "${logPath}" 2>&1 &`
    await execAsync(cmd)

    // 返回前端指导信息
    const guidance = {
      steps: [
        '本地电脑执行: ssh -N -L 9222:localhost:9222 <user>@<服务器IP>',
        '用本机 Chrome 打开: chrome://inspect/#devices → Configure… 添加 localhost:9222',
        '在 Remote Target 中点击 inspect，打开的页面里访问 https://www.youtube.com 完成登录（含二步验证）',
        '服务器验证: yt-dlp --cookies-from-browser "chromium:/home/<user>/chrome-profile/Default" --dump-json <YouTubeURL> | head -c 200'
      ],
      cookiesFromBrowser: 'chromium:/home/<user>/chrome-profile/Default'
    }

    return NextResponse.json({ success: true, message: 'Login setup started', logPath, guidance })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

