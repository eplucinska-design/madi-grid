import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type LaunchTarget = 'slack' | 'mail'

function startDetached(command: string, args: string[] = []) {
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })
  child.unref()
}

function startWindowsTarget(target: string) {
  startDetached('cmd.exe', ['/c', 'start', '', target])
}

function firstExisting(paths: string[]) {
  return paths.find((item) => item && existsSync(item))
}

function launchSlack() {
  const localAppData = process.env.LOCALAPPDATA ?? ''
  const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'
  const exe = firstExisting([
    `${localAppData}\\slack\\slack.exe`,
    `${programFiles}\\Slack\\slack.exe`,
    `${programFilesX86}\\Slack\\slack.exe`,
  ])

  if (exe) {
    startDetached(exe)
    return
  }

  startWindowsTarget('slack://open')
}

function launchMail() {
  const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'
  const exe = firstExisting([
    `${programFiles}\\Mozilla Thunderbird\\thunderbird.exe`,
    `${programFilesX86}\\Mozilla Thunderbird\\thunderbird.exe`,
  ])

  if (exe) {
    startDetached(exe)
    return
  }

  startWindowsTarget('mailto:')
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { target?: LaunchTarget }

    if (body.target === 'slack') {
      launchSlack()
      return NextResponse.json({ ok: true, target: 'slack' })
    }

    if (body.target === 'mail') {
      launchMail()
      return NextResponse.json({ ok: true, target: 'mail' })
    }

    return NextResponse.json({ error: 'Nieznana aplikacja.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udalo sie uruchomic aplikacji.' },
      { status: 500 }
    )
  }
}
