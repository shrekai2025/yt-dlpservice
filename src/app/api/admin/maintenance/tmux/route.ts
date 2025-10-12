import { NextResponse } from 'next/server'
import { promisify } from 'util'
import { exec } from 'child_process'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const { stdout, stderr } = await execAsync('tmux ls | cat', { maxBuffer: 1024 * 1024 })
    const output = (stdout || stderr || '').trim() || '无 tmux 会话或 tmux 未运行'
    return NextResponse.json({ success: true, output })
  } catch {
    // tmux 未运行时会返回非零；我们转为友好信息
    return NextResponse.json({ success: true, output: '无 tmux 会话或 tmux 未运行' })
  }
}

