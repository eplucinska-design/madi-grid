import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function sanitizeFolderName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\.+$/g, '')
    .slice(0, 120)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { basePath?: string; folderName?: string }
    const basePath = body.basePath?.trim()
    const folderName = sanitizeFolderName(body.folderName ?? '')

    if (!basePath) {
      return NextResponse.json({ error: 'Brak sciezki bazowej.' }, { status: 400 })
    }
    if (!folderName) {
      return NextResponse.json({ error: 'Brak nazwy folderu.' }, { status: 400 })
    }

    const targetPath = path.join(basePath, folderName)
    await mkdir(targetPath, { recursive: true })

    return NextResponse.json({ path: targetPath })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udalo sie utworzyc folderu.' },
      { status: 500 }
    )
  }
}
