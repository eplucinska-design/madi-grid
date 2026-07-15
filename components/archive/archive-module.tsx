'use client'

import { useMemo, useState } from 'react'
import { Archive, ArrowDownAZ, ArrowUpAZ, CheckCircle2, ExternalLink, RotateCcw, Search } from 'lucide-react'
import { AssigneeAvatarStack } from '@/components/common/assignee-avatar-stack'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import { GRID_LISTS, type GridTask, useGridStore } from '@/lib/store/grid-store'
import { openOrderWindow } from '@/lib/utils/order-links'

type ArchiveSortKey = 'updatedAt' | 'title' | 'customer' | 'list' | 'dueDate' | 'trackedMinutes'
type SortDirection = 'asc' | 'desc'

const archiveColumns: Array<{ label: string; sortKey: ArchiveSortKey }> = [
  { label: 'Zlecenie', sortKey: 'title' },
  { label: 'Klient', sortKey: 'customer' },
  { label: 'Obszar', sortKey: 'list' },
  { label: 'Termin', sortKey: 'dueDate' },
  { label: 'Czas', sortKey: 'trackedMinutes' },
  { label: 'Zamkniete', sortKey: 'updatedAt' },
]

function listName(listId: string) {
  return GRID_LISTS.find((list) => list.id === listId)?.name ?? listId
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(`${value.includes('T') ? value : `${value}T12:00:00`}`).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatMinutes(minutes: number) {
  if (!minutes) return '0 min'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function sortArchive(tasks: GridTask[], sortKey: ArchiveSortKey, direction: SortDirection) {
  const factor = direction === 'asc' ? 1 : -1
  return [...tasks].sort((a, b) => {
    const valueFor = (task: GridTask): string | number => {
      if (sortKey === 'customer') return task.customerName
      if (sortKey === 'list') return listName(task.listId)
      if (sortKey === 'dueDate') return task.dueDate || ''
      if (sortKey === 'trackedMinutes') return task.trackedMinutes
      if (sortKey === 'updatedAt') return task.updatedAt
      return `${task.title} ${task.orderNumber}`
    }
    const left = valueFor(a)
    const right = valueFor(b)
    const result = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), 'pl', { sensitivity: 'base' })
    return result * factor
  })
}

export function ArchiveModule() {
  const { tasks, setActiveTask, updateTask } = useGridStore()
  const [query, setQuery] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<ArchiveSortKey>('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const archivedTasks = useMemo(() => {
    const search = query.trim().toLowerCase()
    const source = tasks.filter((task) => task.status === 'done')
    const filtered = source.filter((task) => {
      if (!search) return true
      return `${task.title} ${task.orderNumber} ${task.customerName} ${task.filesPath} ${listName(task.listId)}`
        .toLowerCase()
        .includes(search)
    })
    return sortArchive(filtered, sortKey, sortDirection)
  }, [query, sortDirection, sortKey, tasks])

  const selectedTask = archivedTasks.find((task) => task.id === selectedTaskId) ?? archivedTasks[0]
  const totalTracked = archivedTasks.reduce((sum, task) => sum + task.trackedMinutes, 0)
  const totalEstimated = archivedTasks.reduce((sum, task) => sum + task.estimateMinutes, 0)

  const toggleSort = (key: ArchiveSortKey) => {
    setSortKey((current) => {
      if (current === key) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
        return current
      }
      setSortDirection(key === 'updatedAt' ? 'desc' : 'asc')
      return key
    })
  }

  const openTask = (task: GridTask) => {
    setSelectedTaskId(task.id)
    setActiveTask(task.id)
    openOrderWindow(task.id, task.orderNumber)
  }

  return (
    <ModuleFrame
      title="Archiwum"
      kicker="Zamkniete zlecenia"
      description="Tutaj trafiaja zlecenia i zadania oznaczone jako Gotowe. Mozna je przeszukac, podejrzec i w razie potrzeby cofnac do pracy."
      icon={<Archive size={13} />}
      summary={
        <StatStrip
          items={[
            { label: 'W archiwum', value: archivedTasks.length, hint: 'status Gotowe', tone: 'text-emerald-600' },
            { label: 'Czas laczny', value: formatMinutes(totalTracked), hint: 'zarejestrowany RCP' },
            { label: 'Plan', value: formatMinutes(totalEstimated), hint: 'estymacja zamknietych' },
            { label: 'Wybrane', value: selectedTask ? 'Tak' : 'Nie', hint: 'panel szczegolow' },
          ]}
        />
      }
      aside={
        <aside className="hidden w-[var(--app-detail-panel-width)] shrink-0 border-l border-border bg-background xl:flex xl:flex-col">
          {selectedTask ? (
            <>
              <div className="border-b border-border p-[var(--app-module-gap)]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Podglad archiwum</p>
                <h2 className="mt-1 text-lg font-semibold leading-tight">{selectedTask.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{selectedTask.orderNumber || 'Bez numeru'} · {selectedTask.customerName || 'Bez klienta'}</p>
              </div>
              <div className="madi-scroll-area flex-1 space-y-3 p-[var(--app-module-gap)]">
                <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 size={16} />
                    Zlecenie gotowe / zamkniete
                  </div>
                  <p className="mt-1 text-xs">Ostatnia zmiana: {formatDate(selectedTask.updatedAt)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <InfoTile label="Obszar" value={listName(selectedTask.listId)} />
                  <InfoTile label="Termin" value={formatDate(selectedTask.dueDate)} />
                  <InfoTile label="Czas" value={formatMinutes(selectedTask.trackedMinutes)} />
                  <InfoTile label="Plan" value={formatMinutes(selectedTask.estimateMinutes)} />
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Opis</p>
                  <p className="text-sm leading-relaxed">{selectedTask.description || 'Brak opisu.'}</p>
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sciezka plikow</p>
                  <p className="break-all font-mono text-xs text-muted-foreground">{selectedTask.filesPath || 'Brak sciezki.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openTask(selectedTask)}
                    className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <ExternalLink size={14} />
                    Otworz zlecenie
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTask(selectedTask.id, { status: 'review' })}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted"
                  >
                    <RotateCcw size={14} />
                    Cofnij do sprawdzenia
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Brak zlecen w archiwum.
            </div>
          )}
        </aside>
      }
      bodyClassName="overflow-hidden"
    >
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="shrink-0 border-b border-border p-[var(--app-module-gap)]">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/25 px-3">
            <Search size={15} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Szukaj po numerze, kliencie, nazwie, sciezce..."
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="madi-scroll-area flex-1">
          <div className="min-w-[980px]">
            <div className="sticky top-0 z-10 grid grid-cols-[minmax(260px,1.2fr)_minmax(170px,0.8fr)_140px_110px_110px_130px_92px] gap-3 border-b border-border bg-muted/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
              {archiveColumns.map((column) => (
                <button
                  key={column.sortKey}
                  type="button"
                  onClick={() => toggleSort(column.sortKey)}
                  className="flex min-w-0 items-center gap-1 text-left hover:text-foreground"
                >
                  <span className="truncate">{column.label}</span>
                  {sortKey === column.sortKey && (
                    <span className="text-primary">{sortDirection === 'asc' ? <ArrowDownAZ size={12} /> : <ArrowUpAZ size={12} />}</span>
                  )}
                </button>
              ))}
              <span>Akcje</span>
            </div>

            {archivedTasks.length ? (
              archivedTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    setSelectedTaskId(task.id)
                    setActiveTask(task.id)
                  }}
                  onDoubleClick={() => openTask(task)}
                  className={`grid w-full grid-cols-[minmax(260px,1.2fr)_minmax(170px,0.8fr)_140px_110px_110px_130px_92px] items-center gap-3 border-b border-border px-4 py-3 text-left text-sm hover:bg-muted/35 ${
                    selectedTask?.id === task.id ? 'bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'bg-background'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{task.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{task.orderNumber || 'Bez numeru'} · {task.filesPath || 'Brak sciezki'}</p>
                  </div>
                  <span className="truncate text-xs">{task.customerName || 'Bez klienta'}</span>
                  <span className="truncate rounded bg-muted px-2 py-1 text-xs">{listName(task.listId)}</span>
                  <span className="text-xs">{formatDate(task.dueDate)}</span>
                  <span className="text-xs">{formatMinutes(task.trackedMinutes)}</span>
                  <AssigneeAvatarStack ids={task.assigneeIds} size="sm" max={3} showEmpty={false} singleLabel />
                  <span
                    onClick={(event) => {
                      event.stopPropagation()
                      openTask(task)
                    }}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs font-semibold hover:bg-muted"
                  >
                    <ExternalLink size={13} />
                    Okno
                  </span>
                </button>
              ))
            ) : (
              <div className="m-4 rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Brak zamknietych zlecen. Po oznaczeniu zadania jako Gotowe pojawi sie tutaj automatycznie.
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleFrame>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  )
}
