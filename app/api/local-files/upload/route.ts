import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function sanitizeFileName(value: string) {
  return (value || 'plik')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\.+$/g, '')
    .slice(0, 180)
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const basePathValue = formData.get('basePath')
    const basePath = typeof basePathValue === 'string' ? basePathValue.trim() : ''
    const files = formData.getAll('files').filter((item): item is File => item instanceof File)

    if (!basePath) {
      return NextResponse.json({ error: 'Brak sciezki folderu.' }, { status: 400 })
    }
    if (!files.length) {
      return NextResponse.json({ error: 'Brak plikow do zapisu.' }, { status: 400 })
    }

    await mkdir(basePath, { recursive: true })

    const savedFiles = []
    for (const file of files) {
      const fileName = sanitizeFileName(file.name)
      const targetPath = path.join(basePath, fileName)
      const bytes = Buffer.from(await file.arrayBuffer())
      await writeFile(targetPath, bytes)
      savedFiles.push({ name: fileName, path: targetPath, size: file.size })
    }

    return NextResponse.json({ path: basePath, files: savedFiles })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udalo sie zapisac plikow.' },
      { status: 500 }
    )
  }
}
