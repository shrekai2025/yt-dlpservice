import { NextResponse } from 'next/server'
import * as fs from 'fs/promises'
import path from 'path'

async function safeRead(file: string): Promise<string | null> {
  try { return await fs.readFile(file, 'utf-8') } catch { return null }
}

function tail(text: string, n = 120) {
  const lines = text.split(/\r?\n/)
  return lines.slice(Math.max(0, lines.length - n)).join('\n')
}

export async function GET() {
  try {
    const repoRoot = process.cwd()
    const logsDir = path.join(repoRoot, 'logs')
    const statusFile = path.join(logsDir, 'login-setup.status')
    const latestFile = path.join(logsDir, 'login-setup.latest')

    const status = (await safeRead(statusFile))?.trim() || 'IDLE'
    const latestPath = (await safeRead(latestFile))?.trim() || ''

    let logTail = ''
    if (latestPath) {
      const c = await safeRead(latestPath)
      if (c) logTail = tail(c)
    }

    return NextResponse.json({ success: true, status, latestPath, logTail })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

