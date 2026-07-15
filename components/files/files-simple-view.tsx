'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Check,
  Copy,
  FileUp,
  FolderOpen,
  FolderPlus,
  Pencil,
  Search,
} from 'lucide-react'
import { AssigneeAvatarStack } from '@/components/common/assignee-avatar-stack'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import {
  GRID_STATUSES,
  type GridTask,
  useGridStore,
} from '@/lib/store/grid-store'

type FileSortKey = 'task' | 'path' | 'status' | 'assignees'
type SortDirection = 'asc' | 'desc'

const fileListGrid = 'grid-cols-[minmax(220px,0.8fr)_minmax(280px,1.2fr)_140px_90px]'
const fileListColumns: Array<{ label: string; sortKey: FileSortKey }> = [
  { label: 'Zlecenie', sortKey: 'task' },
  { label: 'Sciezka', sortKey: 'path' },
  { label: 'Status', sortKey: 'status' },
  { label: 'Osoby', sortKey: 'assignees' },
]

function copyText(value: string) {
  if (typeof navigator === 'undefined') return
  navigator.clipboard?.writeText(value)
}

function statusTone(task: GridTask) {
  return GRID_STATUSES.find((status) => status.id === task.status) ?? GRID_STATUSES[0]
}

function normalize(value: string) {
  return value.toLowerCase().trim()
}

function FileRow({
  task,
  active,
  onSelect,
}: {
  task: GridTask
  active: boolean
  onSelect: () => void
}) {
  const status = statusTone(task)
  const hasPath = Boolean(task.filesPath?.trim())

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full ${fileListGrid} items-center gap-3 border-b border-border px-4 py-3 text-left transition hover:bg-muted/35 ${
        active ? 'bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'bg-background'
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{task.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {task.orderNumber || 'Bez numeru'} · {task.customerName || 'Bez klienta'}
        </p>
      </div>
      <div className="min-w-0">
        <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${hasPath ? 'border-border bg-muted/25' : 'border-dashed border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'}`}>
          <FolderOpen size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-xs">{hasPath ? task.filesPath : 'Brak sciezki - uzupelnij w panelu'}</span>
        </div>
      </div>
      <div className="min-w-0">
        <span className={`inline-flex rounded px-2 py-1 text-[11px] font-medium ${status.tone}`}>{status.label}</span>
      </div>
      <AssigneeAvatarStack ids={task.assigneeIds} size="sm" max={3} showEmpty={false} singleLabel />
    </button>
  )
}

function PathPanel({ task }: { task?: GridTask }) {
  const updateTask = useGridStore((state) => state.updateTask)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pathDraft, setPathDraft] = useState(task?.filesPath ?? '')
  const [folderName, setFolderName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  if (!task) {
    return (
      <aside className="flex min-h-0 w-[420px] shrink-0 flex-col border-l border-border bg-background p-4">
        <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-center text-sm text-muted-foreground">
          Wybierz zlecenie, zeby zobaczyc i edytowac sciezke plikow.
        </div>
      </aside>
    )
  }

  const currentPath = pathDraft.trim()

  const savePath = () => {
    updateTask(task.id, { filesPath: pathDraft.trim() })
    setMessage('Sciezka zapisana.')
  }

  const createFolder = async () => {
    if (!currentPath || !folderName.trim()) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/local-files/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basePath: currentPath, folderName }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Nie udalo sie utworzyc folderu.')
      setFolderName('')
      setMessage(`Utworzono folder: ${result.path}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nie udalo sie utworzyc folderu.')
    } finally {
      setBusy(false)
    }
  }

  const uploadFiles = async () => {
    if (!currentPath || !selectedFiles.length) return
    setBusy(true)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('basePath', currentPath)
      selectedFiles.forEach((file) => formData.append('files', file))
      const response = await fetch('/api/local-files/upload', { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Nie udalo sie zapisac plikow.')
      setSelectedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      setMessage(`Zapisano ${result.files?.length ?? 0} plikow w folderze.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nie udalo sie zapisac plikow.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="flex min-h-0 w-[440px] shrink-0 flex-col border-l border-border bg-background">
      <div className="border-b border-border p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Podglad plikow</p>
        <h2 className="mt-1 text-lg font-semibold leading-tight">{task.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{task.orderNumber || 'Bez numeru'} · {task.customerName || 'Bez klienta'}</p>
      </div>

      <div className="madi-scroll-area flex-1 p-4">
        <div className="rounded-md border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Sciezka zlecenia</p>
            <button
              type="button"
              onClick={() => currentPath && copyText(currentPath)}
              disabled={!currentPath}
              className="flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              <Copy size={13} />
              Kopiuj
            </button>
          </div>
          <textarea
            value={pathDraft}
            onChange={(event) => setPathDraft(event.target.value)}
            placeholder="np. X:\\!ZLECENIA\\Klient\\2026-07\\ZL-0140"
            className="h-24 w-full resize-none rounded-md border border-border bg-background p-2 font-mono text-xs outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={savePath}
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground"
          >
            <Check size={14} />
            Zapisz sciezke
          </button>
        </div>

        <div className="mt-3 rounded-md border border-border bg-card p-3">
          <p className="mb-2 text-sm font-semibold">Utworz folder w tej sciezce</p>
          <div className="flex gap-2">
            <input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="np. do akceptacji, druk, klient"
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={createFolder}
              disabled={busy || !currentPath || !folderName.trim()}
              className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <FolderPlus size={14} />
              Dodaj
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-md border border-border bg-card p-3">
          <p className="mb-2 text-sm font-semibold">Wrzuc pliki do folderu</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
            className="w-full rounded-md border border-border bg-background p-2 text-xs"
          />
          <button
            type="button"
            onClick={uploadFiles}
            disabled={busy || !currentPath || !selectedFiles.length}
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <FileUp size={14} />
            Zapisz {selectedFiles.length ? `${selectedFiles.length} plikow` : 'pliki'}
          </button>
        </div>

        {message && (
          <div className="mt-3 rounded-md border border-border bg-muted/35 p-3 text-sm text-muted-foreground">
            {message}
          </div>
        )}
      </div>
    </aside>
  )
}

export function FilesSimpleView() {
  const { tasks, setActiveTask } = useGridStore()
  const [query, setQuery] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(tasks[0]?.id ?? null)
  const [sortKey, setSortKey] = useState<FileSortKey>('task')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const filteredTasks = useMemo(() => {
    const value = normalize(query)
    return tasks
      .filter((task) => {
        if (!value) return true
        return normalize(`${task.title} ${task.orderNumber} ${task.customerName} ${task.filesPath}`).includes(value)
      })
      .sort((a, b) => {
        const valueFor = (task: GridTask) => {
          if (sortKey === 'path') return task.filesPath || ''
          if (sortKey === 'status') return statusTone(task).label
          if (sortKey === 'assignees') return task.assigneeIds.join(', ')
          return `${task.orderNumber || ''} ${task.title}`
        }
        const result = valueFor(a).localeCompare(valueFor(b), 'pl', { sensitivity: 'base' })
        return sortDirection === 'asc' ? result : -result
      })
  }, [query, sortDirection, sortKey, tasks])

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0]
  const withPath = tasks.filter((task) => task.filesPath?.trim()).length
  const missingPath = tasks.length - withPath

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    setActiveTask(taskId)
  }
  const toggleSort = (key: FileSortKey) => {
    setSortKey((current) => {
      if (current === key) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
        return current
      }
      setSortDirection('asc')
      return key
    })
  }

  return (
    <ModuleFrame
      title="Pliki"
      kicker="Zlecenia i sciezki"
      description="Uproszczony widok: zlecenie, klient i folder produkcyjny bez edycji statusow z poziomu listy."
      icon={<FolderOpen size={13} />}
      summary={
        <StatStrip
          items={[
            { label: 'Zlecenia', value: tasks.length, hint: 'w bazie roboczej' },
            { label: 'Ze sciezka', value: withPath, hint: 'gotowe do pracy', tone: 'text-emerald-600' },
            { label: 'Brak sciezki', value: missingPath, hint: 'do uzupelnienia', tone: missingPath ? 'text-amber-600' : '' },
            { label: 'Widok', value: 'Prosty', hint: 'zlecenie + sciezka' },
          ]}
        />
      }
      bodyClassName="overflow-hidden"
      aside={<PathPanel task={selectedTask} />}
    >
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="shrink-0 border-b border-border p-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/25 px-3">
            <Search size={15} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Szukaj po zleceniu, kliencie, numerze lub sciezce..."
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className={`grid shrink-0 ${fileListGrid} gap-3 border-b border-border bg-muted/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`}>
          {fileListColumns.map((column) => (
            <button
              key={column.sortKey}
              type="button"
              onClick={() => toggleSort(column.sortKey)}
              className="flex min-w-0 items-center gap-1 text-left hover:text-foreground"
            >
              <span className="truncate">{column.label}</span>
              {sortKey === column.sortKey && (
                <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          ))}
        </div>

        <div className="madi-scroll-area flex-1">
          {filteredTasks.length ? (
            filteredTasks.map((task) => (
              <FileRow
                key={task.id}
                task={task}
                active={selectedTask?.id === task.id}
                onSelect={() => selectTask(task.id)}
              />
            ))
          ) : (
            <div className="m-4 rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Brak wynikow dla tego filtra.
            </div>
          )}
        </div>
      </div>
    </ModuleFrame>
  )
}
