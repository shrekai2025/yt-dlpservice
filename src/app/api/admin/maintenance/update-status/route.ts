import { NextResponse } from 'next/server'
import * as fs from 'fs/promises'
import path from 'path'

async function safeRead(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, 'utf-8')
  } catch {
    return null
  }
}

function tailLines(text: string, maxLines: number): string {
  const lines = text.split(/\r?\n/)
  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n')
}

export async function GET() {
  try {
    const repoRoot = process.cwd()
    const logsDir = path.join(repoRoot, 'logs')
    const statusFile = path.join(logsDir, 'oneclick-update.status')
    const latestFile = path.join(logsDir, 'oneclick-update.latest')

    const statusRaw = (await safeRead(statusFile))?.trim() || 'IDLE'
    const latestPath = (await safeRead(latestFile))?.trim() || ''

    let logTail = ''
    if (latestPath) {
      const content = await safeRead(latestPath)
      if (content) logTail = tailLines(content, 120)
    }

    return NextResponse.json({ success: true, status: statusRaw, latestPath, logTail })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

