'use client'

import { useEffect, useMemo, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  Brush,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Factory,
  FileText,
  FolderOpen,
  GripVertical,
  LayoutGrid,
  List,
  MessageSquare,
  Package,
  PanelRight,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Printer,
  RadioTower,
  RotateCcw,
  Save,
  ScanLine,
  Search,
  Send,
  SlidersHorizontal,
  Square,
  Tag,
  Trash2,
  Truck,
  Upload,
  Users,
  X,
} from 'lucide-react'
import {
  GRID_STATUSES,
  inferGridTaskTimeMode,
  useGridStore,
  type GridList,
  type GridRcpEventType,
  type GridRcpMode,
  type GridStatusId,
  type GridTask,
  type GridTaskTimeMode,
  type GridView,
} from '@/lib/store/grid-store'
import { DEMO_USERS } from '@/lib/store/auth-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useAppStore } from '@/lib/store/app-store'
import { useViewPreferencesStore, type ModuleViewPrefs } from '@/lib/store/view-preferences-store'
import { AssigneeAvatarStack, UserAvatar } from '@/components/common/assignee-avatar-stack'
import { openNewOrderModal } from '@/components/orders/new-order-modal-host'
import { openOrderWindow } from '@/lib/utils/order-links'
import type { OrderPriority } from '@/lib/types'

export interface GridScope {
  spaceIds?: string[]
  listIds?: string[]
  statuses?: GridStatusId[]
  workTypes?: string[]
  priorities?: OrderPriority[]
}

interface MadiGridWorkspaceProps {
  title?: string
  kicker?: string
  description?: string
  scope?: GridScope
  preferredView?: GridView
  lockedView?: GridView
}

const priorityLabels: Record<OrderPriority, string> = {
  urgent: 'Pilne',
  high: 'Wysoki',
  medium: 'Sredni',
  low: 'Niski',
}

const priorityColors: Record<OrderPriority, string> = {
  urgent: '#e03131',
  high: '#f59f00',
  medium: '#339af0',
  low: '#868e96',
}

const viewTabs: { id: GridView; label: string; icon: React.ReactNode }[] = [
  { id: 'board', label: 'Board', icon: <LayoutGrid size={14} /> },
  { id: 'list', label: 'Lista', icon: <List size={14} /> },
  { id: 'calendar', label: 'Kalendarz', icon: <Calendar size={14} /> },
]

const defaultModulePrefs: ModuleViewPrefs = {
  currentView: null,
  boardColumnWidths: {},
  listColumnWidths: {},
  collapsedPanels: [],
  compactCards: false,
  showSummary: true,
  savedViews: [],
}

function mergeModulePrefs(prefs?: ModuleViewPrefs): ModuleViewPrefs {
  return {
    ...defaultModulePrefs,
    ...(prefs ?? {}),
    boardColumnWidths: prefs?.boardColumnWidths ?? {},
    listColumnWidths: prefs?.listColumnWidths ?? {},
    collapsedPanels: prefs?.collapsedPanels ?? [],
    savedViews: prefs?.savedViews ?? [],
  }
}

function useModulePrefs(userId: string, moduleId: string) {
  const rawPrefs = useViewPreferencesStore((state) => state.prefsByUser[userId]?.[moduleId])
  return useMemo(() => mergeModulePrefs(rawPrefs), [rawPrefs])
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest}m`
  return `${hours}h ${rest.toString().padStart(2, '0')}m`
}

function toInputNumber(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0
}

function dateLabel(value: string) {
  if (!value) return 'Brak terminu'
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'short' }).format(date)
}

function getPinnedComment(task: GridTask) {
  return [...task.comments]
    .filter((comment) => comment.pinned)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

function isCorrectionComment(content: string) {
  return content.trim().toLowerCase().startsWith('poprawka:')
}

function getLatestCorrection(task: GridTask) {
  return [...task.comments]
    .filter((comment) => isCorrectionComment(comment.content))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

function CorrectionSignal({ task, compact = false }: { task: GridTask; compact?: boolean }) {
  const correction = getLatestCorrection(task)
  if (!correction) return null

  return (
    <span
      className={`madi-comment-alert-pulse inline-flex shrink-0 items-center gap-1 rounded-full border border-red-400/80 bg-red-50 font-semibold text-red-700 shadow-sm dark:border-red-400/50 dark:bg-red-950/45 dark:text-red-200 ${
        compact ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]'
      }`}
      title={correction.content}
    >
      <AlertTriangle size={compact ? 10 : 12} />
      {compact ? null : 'Poprawka'}
    </span>
  )
}

function PinnedCommentSignal({ task, compact = false }: { task: GridTask; compact?: boolean }) {
  const comment = getPinnedComment(task)
  if (!comment) return null

  return (
    <div
      className={`madi-pinned-note flex min-w-0 items-start gap-2 rounded-md border border-amber-300/80 bg-amber-50 px-2.5 py-2 text-amber-900 dark:border-amber-400/45 dark:bg-amber-950/35 dark:text-amber-100 ${
        compact ? 'text-[11px]' : 'text-xs'
      }`}
      title={`${comment.authorName}: ${comment.content}`}
    >
      <Pin size={compact ? 12 : 14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
      <div className="min-w-0">
        <p className="truncate font-semibold">Uwaga przypieta</p>
        <p className={compact ? 'truncate' : 'line-clamp-2'}>{comment.content}</p>
      </div>
    </div>
  )
}

function CommentBubbleSignal({ task, compact = false }: { task: GridTask; compact?: boolean }) {
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null)
  const count = task.comments.length
  if (!count) return null
  const pinnedComment = getPinnedComment(task)
  const latestComment = [...task.comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const title = pinnedComment ? 'Przypieta uwaga' : count === 1 ? 'Komentarz' : `Komentarze (${count})`
  const tooltipStyle = tooltipRect
    ? {
        left: Math.min(Math.max(12, tooltipRect.left + tooltipRect.width / 2 - 140), window.innerWidth - 292),
        top: Math.min(tooltipRect.bottom + 8, window.innerHeight - 132),
      }
    : undefined

  return (
    <>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-400/80 bg-orange-50 font-semibold text-orange-700 shadow-sm dark:border-orange-400/50 dark:bg-orange-950/45 dark:text-orange-200 ${
          compact ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]'
        } ${pinnedComment ? 'madi-comment-alert-pulse' : 'madi-comment-pulse'}`}
        title={`${pinnedComment ? 'Przypieta uwaga' : 'Komentarze'}: ${latestComment?.content ?? count}`}
        onMouseEnter={(event) => setTooltipRect(event.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setTooltipRect(null)}
      >
        <MessageSquare size={compact ? 10 : 12} />
        {count}
      </span>
      {tooltipRect && typeof document !== 'undefined' && createPortal(
        <div
          className="pointer-events-none fixed z-[1000] w-[280px] rounded-md border border-orange-300 bg-popover p-3 text-left text-popover-foreground shadow-2xl"
          style={tooltipStyle}
        >
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-orange-700 dark:text-orange-200">
            <MessageSquare size={12} />
            {title}
          </div>
          <div className="whitespace-normal text-xs font-normal leading-snug text-foreground">
            {latestComment?.content ?? 'Brak tresci komentarza'}
          </div>
          <div className="mt-1 truncate text-[10px] font-normal text-muted-foreground">
            {latestComment?.authorName}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function copyText(value: string) {
  if (typeof navigator === 'undefined') return
  navigator.clipboard?.writeText(value)
}

function tagsToString(tags: string[]) {
  return tags.join(', ')
}

function stringToTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function startResize(
  event: ReactMouseEvent,
  initialWidth: number,
  onResize: (width: number) => void,
  min = 80,
  max = 520
) {
  event.preventDefault()
  event.stopPropagation()
  const startX = event.clientX

  const handleMove = (moveEvent: MouseEvent) => {
    onResize(clamp(initialWidth + moveEvent.clientX - startX, min, max))
  }

  const handleUp = () => {
    window.removeEventListener('mousemove', handleMove)
    window.removeEventListener('mouseup', handleUp)
  }

  window.addEventListener('mousemove', handleMove)
  window.addEventListener('mouseup', handleUp)
}

const rcpModeLabels: Record<GridRcpMode, string> = {
  manual: 'Recznie',
  scanner: 'Skaner',
  card: 'Karta',
  beacon: 'Nadajnik',
}

const rcpEventLabels: Record<GridRcpEventType, string> = {
  start: 'Start',
  pause: 'Pauza',
  stop: 'Stop',
  finish: 'Koniec',
  manual: 'Dopisano czas',
}

function StatusPill({ status }: { status: GridStatusId }) {
  const config = GRID_STATUSES.find((item) => item.id === status) ?? GRID_STATUSES[0]
  const inProgress = status === 'in_progress'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium ${config.tone} ${
        inProgress ? 'madi-status-blink ring-1 ring-[#40c057]/40' : ''
      }`}
    >
      {inProgress && <span className="madi-status-dot h-1.5 w-1.5 rounded-full bg-[#40c057]" />}
      {config.label}
    </span>
  )
}

function PriorityPill({ priority }: { priority: OrderPriority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: priorityColors[priority] }} />
      {priorityLabels[priority]}
    </span>
  )
}

function AssigneeFaces({ ids }: { ids: string[] }) {
  return <AssigneeAvatarStack ids={ids} />
}

function TaskProgress({ task }: { task: GridTask }) {
  const checked = task.checklist.filter((item) => item.done).length
  const checklistProgress = task.checklist.length ? checked / task.checklist.length : 0
  const timeProgress = task.estimateMinutes ? Math.min(task.trackedMinutes / task.estimateMinutes, 1) : 0
  const progress = Math.max(checklistProgress, timeProgress) * 100

  return (
    <div className="space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {checked}/{task.checklist.length || 0} checklist
        </span>
        <span>
          {formatMinutes(task.trackedMinutes)} / {formatMinutes(task.estimateMinutes)}
        </span>
      </div>
    </div>
  )
}

function TaskTypeIcon({ task, listName, size = 'md' }: { task: GridTask; listName?: string; size?: 'sm' | 'md' }) {
  const workType = `${task.workType} ${task.listId} ${listName ?? ''}`.toLocaleLowerCase('pl-PL')
  const iconSize = size === 'sm' ? 12 : 14
  const className = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7'
  let icon = <FileText size={iconSize} />
  let tone = 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300'

  if (workType.includes('graf') || workType.includes('dtp') || workType.includes('prepress') || workType.includes('pg/')) {
    icon = <Brush size={iconSize} />
    tone = 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200'
  } else if (workType.includes('druk') || workType.includes('print')) {
    icon = <Printer size={iconSize} />
    tone = 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200'
  } else if (workType.includes('intro') || workType.includes('introlig') || workType.includes('pakow')) {
    icon = <Package size={iconSize} />
    tone = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
  } else if (workType.includes('transport') || workType.includes('logist') || workType.includes('wysyl')) {
    icon = <Truck size={iconSize} />
    tone = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
  } else if (workType.includes('faktur') || workType.includes('invoice')) {
    icon = <CreditCard size={iconSize} />
    tone = 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200'
  } else if (workType.includes('produkc')) {
    icon = <Factory size={iconSize} />
    tone = 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-200'
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-md ${className} ${tone}`}
      title={listName ? `${listName} - ${task.workType || 'Zlecenie'}` : task.workType || 'Zlecenie'}
    >
      {icon}
    </span>
  )
}

interface TaskCardProps {
  task: GridTask
  list?: GridList
  onDragStart: (taskId: string) => void
  onDragOverTask: (taskId: string) => void
  onDropOnTask: (event: DragEvent<HTMLDivElement>, taskId: string) => void
  isDropTarget?: boolean
  compact?: boolean
  selectionMode?: boolean
}

function TaskCard({ task, list, onDragStart, onDragOverTask, onDropOnTask, isDropTarget, compact, selectionMode = false }: TaskCardProps) {
  const {
    setActiveTask,
    toggleTaskSelection,
    duplicateTask,
    deleteTask,
    nudgeTask,
  } = useGridStore()
  const openTaskTab = useAppStore((state) => state.openTaskTab)

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('application/x-madi-task', task.id)
        event.dataTransfer.effectAllowed = 'move'
        onDragStart(task.id)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = 'move'
        onDragOverTask(task.id)
      }}
      onDrop={(event) => onDropOnTask(event, task.id)}
      onClick={() => setActiveTask(task.id)}
      onDoubleClick={(event) => {
        event.stopPropagation()
        setActiveTask(task.id)
        openOrderWindow(task.id, task.orderNumber)
      }}
      className={`group relative cursor-pointer rounded-md border bg-card p-2.5 shadow-[var(--subtle-shadow)] transition-all hover:border-primary/60 hover:bg-muted/20 ${
        selectionMode && task.selected ? 'border-primary shadow-sm shadow-primary/20' : isDropTarget ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      {isDropTarget && <div className="absolute -top-1 left-2 right-2 h-0.5 rounded-full bg-primary" />}
      <div className="mb-2 flex items-start gap-2">
        {selectionMode && (
          <button
            onClick={(event) => {
              event.stopPropagation()
              toggleTaskSelection(task.id)
            }}
            className="mt-0.5 text-muted-foreground hover:text-primary"
            title="Zaznacz"
          >
            {task.selected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <GripVertical size={13} className="shrink-0 text-muted-foreground opacity-60" />
            <TaskTypeIcon task={task} listName={list?.name} />
            <h3 className="truncate text-sm font-semibold text-foreground">{task.title}</h3>
            <CorrectionSignal task={task} compact={compact} />
            <CommentBubbleSignal task={task} compact={compact} />
          </div>
          {!compact && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description || 'Bez opisu'}</p>}
        </div>
      </div>

      <div className={`${compact ? 'mb-2' : 'mb-3'} flex flex-wrap gap-1.5`}>
        <StatusPill status={task.status} />
        <PriorityPill priority={task.priority} />
      </div>

      <PinnedCommentSignal task={task} compact={compact} />

      {!compact && <TaskProgress task={task} />}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-muted-foreground">{task.orderNumber || 'Bez numeru'}</p>
          <p className="truncate text-[11px] text-muted-foreground">{list?.name ?? 'Lista'}</p>
        </div>
        <AssigneeFaces ids={task.assigneeIds} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock3 size={12} />
          {dateLabel(task.dueDate)}
        </span>
        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(event) => {
              event.stopPropagation()
              setActiveTask(task.id)
              openTaskTab({ taskId: task.id, title: task.title || 'Zadanie', orderNumber: task.orderNumber, moduleId: 'orders' })
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Otworz w karcie"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation()
              setActiveTask(task.id)
              openOrderWindow(task.id, task.orderNumber)
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Otworz w oknie"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation()
              nudgeTask(task.id, -1)
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Przesun wyzej"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation()
              nudgeTask(task.id, 1)
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Przesun nizej"
          >
            <ArrowDown size={14} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation()
              duplicateTask(task.id)
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Duplikuj"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation()
              deleteTask(task.id)
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Usun"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkspaceToolbar({
  selectionMode,
  onSelectionModeChange,
  lockedView,
}: {
  selectionMode: boolean
  onSelectionModeChange: (enabled: boolean) => void
  lockedView?: GridView
}) {
  const {
    currentView,
    filters,
    spaces,
    lists,
    statuses,
    setCurrentView,
    setFilter,
    resetFilters,
    createList,
    getSelectedTasks,
    selectAllFiltered,
    clearSelection,
    bulkUpdateStatus,
    bulkMoveToList,
    bulkDelete,
  } = useGridStore()
  const { user } = useAuthStore()
  const { currentModule } = useAppStore()
  const userId = user?.id ?? 'guest'
  const prefs = useModulePrefs(userId, currentModule)
  const patchModulePrefs = useViewPreferencesStore((state) => state.patchModulePrefs)
  const saveCurrentView = useViewPreferencesStore((state) => state.saveCurrentView)
  const restoreSavedView = useViewPreferencesStore((state) => state.restoreSavedView)
  const resetModulePrefs = useViewPreferencesStore((state) => state.resetModulePrefs)
  const [newListName, setNewListName] = useState('')
  const [newListSpace, setNewListSpace] = useState(spaces[0]?.id ?? 'office')
  const [savedViewName, setSavedViewName] = useState('Widok operacyjny')
  const selectedCount = getSelectedTasks().length
  const visibleLists = filters.spaceId === 'all'
    ? lists
    : lists.filter((list) => list.spaceId === filters.spaceId)

  useEffect(() => {
    if (filters.spaceId !== 'all' && !spaces.some((space) => space.id === filters.spaceId)) {
      setFilter('spaceId', 'all')
    }
  }, [filters.spaceId, setFilter, spaces])

  return (
    <div className="border-b border-border bg-background px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[clamp(190px,24vw,320px)] flex-1 items-center gap-2 rounded-md border border-border bg-muted/35 px-2.5 py-1.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={filters.query}
            onChange={(event) => setFilter('query', event.target.value)}
            placeholder="Szukaj zadan, klientow, tagow..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <select
          value={filters.spaceId}
          onChange={(event) => {
            setFilter('spaceId', event.target.value)
            setFilter('listId', 'all')
          }}
          className="h-[var(--app-control-height)] rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="all">Wszystkie przestrzenie</option>
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>{space.name}</option>
          ))}
        </select>

        <select
          value={filters.listId}
          onChange={(event) => setFilter('listId', event.target.value)}
          className="h-[var(--app-control-height)] rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="all">Wszystkie listy</option>
          {visibleLists.map((list) => (
            <option key={list.id} value={list.id}>{list.name}</option>
          ))}
        </select>

        <select
          value={filters.assigneeId}
          onChange={(event) => setFilter('assigneeId', event.target.value)}
          className="h-[var(--app-control-height)] rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="all">Wszyscy</option>
          {DEMO_USERS.map((user) => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(event) => setFilter('priority', event.target.value)}
          className="h-[var(--app-control-height)] rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="all">Kazdy priorytet</option>
          {Object.entries(priorityLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <button
          onClick={resetFilters}
          className="h-[var(--app-control-height)] rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 border-b border-transparent">
          {viewTabs.filter((tab) => !lockedView || tab.id === lockedView).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (lockedView) return
                setCurrentView(tab.id)
                patchModulePrefs(userId, currentModule, { currentView: tab.id })
              }}
              className={`flex items-center gap-1.5 border-b-2 px-2.5 py-1.5 text-xs font-semibold transition-all ${
                currentView === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSelectionModeChange(!selectionMode)}
            className={`flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md border px-3 text-xs ${
              selectionMode ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border hover:bg-muted'
            }`}
            title="Wlacz zaznaczanie i akcje zbiorcze"
          >
            {selectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
            Edycja zbiorcza
          </button>
          <button
            onClick={() => patchModulePrefs(userId, currentModule, { compactCards: !prefs.compactCards })}
            className={`flex h-[var(--app-control-height)] w-[var(--app-control-height)] items-center justify-center rounded-md border text-xs ${
              prefs.compactCards ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border hover:bg-muted'
            }`}
            title="Kompaktowe karty"
            aria-label="Kompaktowe karty"
          >
            <SlidersHorizontal size={14} />
          </button>
          <button
            onClick={() => patchModulePrefs(userId, currentModule, { showSummary: !prefs.showSummary })}
            className={`flex h-[var(--app-control-height)] w-[var(--app-control-height)] items-center justify-center rounded-md border text-xs ${
              prefs.showSummary ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border hover:bg-muted'
            }`}
            title="Pokaz lub ukryj podsumowanie"
            aria-label="Pokaz lub ukryj podsumowanie"
          >
            <PanelRight size={14} />
          </button>
          <input
            value={savedViewName}
            onChange={(event) => setSavedViewName(event.target.value)}
            className="h-[var(--app-control-height)] w-32 rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-primary"
            placeholder="Nazwa widoku"
          />
          <button
            onClick={() => saveCurrentView(userId, currentModule, savedViewName)}
            className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-muted"
            title="Zapisz obecny widok"
          >
            <Save size={14} />
            Zapisz
          </button>
          {prefs.savedViews.length > 0 && (
            <select
              onChange={(event) => {
                if (event.target.value) restoreSavedView(userId, currentModule, event.target.value)
                event.currentTarget.value = ''
              }}
              className="h-[var(--app-control-height)] rounded-md border border-border bg-background px-2 text-xs"
              defaultValue=""
              title="Przywroc zapisany widok"
            >
              <option value="" disabled>Przywroc widok</option>
              {prefs.savedViews.map((view) => (
                <option key={view.name} value={view.name}>{view.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => resetModulePrefs(userId, currentModule)}
            className="flex h-[var(--app-control-height)] w-[var(--app-control-height)] items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Reset preferencji widoku"
          >
            <RotateCcw size={14} />
          </button>
          <select
            value={newListSpace}
            onChange={(event) => setNewListSpace(event.target.value)}
            className="h-[var(--app-control-height)] rounded-md border border-border bg-background px-2 text-xs"
          >
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>{space.name}</option>
            ))}
          </select>
          <input
            value={newListName}
            onChange={(event) => setNewListName(event.target.value)}
            placeholder="Nowa lista"
            className="h-[var(--app-control-height)] w-32 rounded-md border border-border bg-background px-3 text-xs outline-none"
          />
          <button
            onClick={() => {
              createList(newListSpace, newListName)
              setNewListName('')
            }}
            className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-muted"
          >
            <FolderOpen size={14} />
            Dodaj liste
          </button>
          <button
            onClick={openNewOrderModal}
            className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={14} />
            Nowe zlecenie
          </button>
        </div>
      </div>

      {selectionMode && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
          <span className="text-xs font-medium">{selectedCount} zaznaczone</span>
          <select
            onChange={(event) => {
              if (event.target.value) bulkUpdateStatus(event.target.value as GridStatusId)
              event.currentTarget.value = ''
            }}
            className="h-8 rounded border border-border bg-background px-2 text-xs"
            defaultValue=""
          >
            <option value="" disabled>Zmien status</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
          <select
            onChange={(event) => {
              if (event.target.value) bulkMoveToList(event.target.value)
              event.currentTarget.value = ''
            }}
            className="h-8 rounded border border-border bg-background px-2 text-xs"
            defaultValue=""
          >
            <option value="" disabled>Przenies do listy</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
          </select>
          <button onClick={selectAllFiltered} className="h-8 rounded border border-border px-2 text-xs hover:bg-muted">
            Zaznacz widoczne
          </button>
          <button onClick={clearSelection} className="h-8 rounded border border-border px-2 text-xs hover:bg-muted">
            Wyczyść
          </button>
          <button onClick={bulkDelete} className="ml-auto flex h-8 items-center gap-1 rounded border border-destructive/30 px-2 text-xs text-destructive hover:bg-destructive/10">
            <Trash2 size={13} />
            Usuń zaznaczone
          </button>
        </div>
      )}
    </div>
  )
}

function BoardView({ tasks, selectionMode }: { tasks: GridTask[]; selectionMode: boolean }) {
  const { lists, statuses, moveTask, createTask } = useGridStore()
  const { user } = useAuthStore()
  const { currentModule } = useAppStore()
  const userId = user?.id ?? 'guest'
  const prefs = useModulePrefs(userId, currentModule)
  const setBoardColumnWidth = useViewPreferencesStore((state) => state.setBoardColumnWidth)
  const toggleCollapsedPanel = useViewPreferencesStore((state) => state.toggleCollapsedPanel)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overTaskId, setOverTaskId] = useState<string | null>(null)
  const [overStatus, setOverStatus] = useState<GridStatusId | null>(null)

  const onDrop = (event: DragEvent<HTMLDivElement>, status: GridStatusId) => {
    event.preventDefault()
    event.stopPropagation()
    const taskId = event.dataTransfer.getData('application/x-madi-task') || draggingId
    if (taskId) moveTask(taskId, { status })
    setDraggingId(null)
    setOverTaskId(null)
    setOverStatus(null)
  }

  const onDropOnTask = (event: DragEvent<HTMLDivElement>, beforeTaskId: string) => {
    event.preventDefault()
    event.stopPropagation()
    const taskId = event.dataTransfer.getData('application/x-madi-task') || draggingId
    const target = tasks.find((item) => item.id === beforeTaskId)
    if (taskId && target && taskId !== beforeTaskId) {
      moveTask(taskId, { status: target.status, listId: target.listId, beforeTaskId })
    }
    setDraggingId(null)
    setOverTaskId(null)
    setOverStatus(null)
  }

  return (
    <div className="madi-board-scroll bg-workspace-surface p-[var(--app-module-gap)]">
      <div className="flex h-full min-h-0 w-max min-w-full gap-2">
      {statuses.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status.id)
        const storedWidth = prefs.boardColumnWidths[status.id]
        const width = storedWidth ?? 276
        const collapsedId = `board-column-${status.id}`
        const collapsed = prefs.collapsedPanels.includes(collapsedId)

        if (collapsed) {
          return (
            <div
              key={status.id}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setOverStatus(status.id)
              }}
              onDragLeave={() => setOverStatus((current) => (current === status.id ? null : current))}
              onDrop={(event) => onDrop(event, status.id)}
              className={`relative flex min-h-0 w-14 shrink-0 flex-col items-center rounded-md border transition-colors ${
                overStatus === status.id ? 'border-primary/70' : 'border-border'
              }`}
              style={{ background: `${status.color}10` }}
              title={`${status.label}: ${columnTasks.length} zadan`}
            >
              <button
                type="button"
                onClick={() => toggleCollapsedPanel(userId, currentModule, collapsedId)}
                className="flex h-full min-h-[220px] w-full flex-col items-center gap-2 rounded-md px-2 py-3 text-muted-foreground hover:bg-background/60 hover:text-foreground"
                title="Rozwin kolumne"
              >
                <ChevronRight size={15} />
                <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: status.color }}>
                  {columnTasks.length}
                </span>
                <span className="mt-1 min-h-0 flex-1 [writing-mode:vertical-rl] rotate-180 truncate text-xs font-semibold">
                  {status.label}
                </span>
              </button>
            </div>
          )
        }

        return (
          <div
            key={status.id}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setOverStatus(status.id)
            }}
            onDragLeave={() => setOverStatus((current) => (current === status.id ? null : current))}
            onDrop={(event) => onDrop(event, status.id)}
            className={`relative flex min-h-0 shrink-0 flex-col rounded-md border transition-colors ${
              overStatus === status.id ? 'border-primary/70' : 'border-border'
            }`}
            style={{
              width: storedWidth ? `${storedWidth}px` : 'var(--app-board-column-width)',
              background: `${status.color}10`,
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span
                  className={`clickup-pill text-white ${status.id === 'in_progress' ? 'madi-status-blink' : ''}`}
                  style={{ background: status.color }}
                >
                  <span className={`h-1.5 w-1.5 rounded-full bg-white/90 ${status.id === 'in_progress' ? 'madi-status-dot' : ''}`} />
                  {status.label}
                </span>
                <span className="rounded bg-background/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">{columnTasks.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleCollapsedPanel(userId, currentModule, collapsedId)}
                  className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                  title="Zwin kolumne"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => createTask({ title: 'Nowe zadanie', status: status.id })}
                  className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                  title="Dodaj zadanie"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
            <div className="madi-scroll-area flex-1 space-y-2 p-2">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  list={lists.find((list) => list.id === task.listId)}
                  onDragStart={setDraggingId}
                  onDragOverTask={setOverTaskId}
                  onDropOnTask={onDropOnTask}
                  isDropTarget={overTaskId === task.id && draggingId !== task.id}
                  compact={prefs.compactCards}
                  selectionMode={selectionMode}
                />
              ))}
              {!columnTasks.length && (
                <button
                  onClick={() => createTask({ title: 'Nowe zadanie', status: status.id })}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-6 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
                >
                  <Plus size={14} />
                  Dodaj pierwsze zadanie
                </button>
              )}
            </div>
            <button
              onMouseDown={(event) =>
                startResize(
                  event,
                  event.currentTarget.parentElement?.getBoundingClientRect().width ?? width,
                  (nextWidth) => setBoardColumnWidth(userId, currentModule, status.id, nextWidth),
                  228,
                  500
                )
              }
                className="madi-resize-handle absolute bottom-0 right-0 top-0 w-3 cursor-col-resize rounded-r-md opacity-0 transition-opacity hover:bg-primary/20 hover:opacity-100"
              title="Zmien szerokosc kolumny"
            />
          </div>
        )
      })}
      </div>
    </div>
  )
}

function EditableListView({ tasks, selectionMode }: { tasks: GridTask[]; selectionMode: boolean }) {
  const {
    lists,
    setActiveTask,
    toggleTaskSelection,
    deleteTask,
    duplicateTask,
    nudgeTask,
    moveTask,
  } = useGridStore()
  const { user } = useAuthStore()
  const { currentModule } = useAppStore()
  const userId = user?.id ?? 'guest'
  const prefs = useModulePrefs(userId, currentModule)
  const setListColumnWidth = useViewPreferencesStore((state) => state.setListColumnWidth)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  type SortKey = 'manual' | 'title' | 'status' | 'priority' | 'list' | 'assignees' | 'due' | 'time'
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'manual', direction: 'asc' })

  const columns = [
    ...(selectionMode ? [{ id: 'select', label: '', width: 42, min: 42, max: 42 }] : []),
    { id: 'title', label: 'Nazwa', width: selectionMode ? 300 : 342, min: 220, max: 460 },
    { id: 'status', label: 'Status', width: 150, min: 120, max: 220 },
    { id: 'priority', label: 'Priorytet', width: 120, min: 105, max: 170 },
    { id: 'list', label: 'Lista', width: 150, min: 120, max: 220 },
    { id: 'assignees', label: 'Osoby', width: 175, min: 145, max: 260 },
    { id: 'due', label: 'Termin', width: 150, min: 135, max: 200 },
    { id: 'time', label: 'Czas', width: 108, min: 90, max: 150 },
    { id: 'actions', label: 'Akcje', width: 218, min: 200, max: 260 },
  ]

  const columnWidth = (id: string, fallback: number) => prefs.listColumnWidths[id] ?? fallback
  const gridTemplateColumns = columns.map((column) => `${columnWidth(column.id, column.width)}px`).join(' ')
  const minWidth = columns.reduce((sum, column) => sum + columnWidth(column.id, column.width), 0) + columns.length * 8 + 32

  const listNameById = useMemo(() => {
    return new Map(lists.map((list) => [list.id, list.name]))
  }, [lists])

  const userNameById = useMemo(() => {
    return new Map(DEMO_USERS.map((user) => [user.id, user.name]))
  }, [])

  const sortTasks = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const sortedTasks = useMemo(() => {
    const priorityOrder: Record<OrderPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    const statusOrder = new Map(GRID_STATUSES.map((status, index) => [status.id, index]))
    const text = (value: string) => value.toLocaleLowerCase('pl-PL')
    const valueFor = (task: GridTask) => {
      if (sort.key === 'manual') return task.position
      if (sort.key === 'title') return text(`${task.title} ${task.orderNumber ?? ''} ${task.customerName ?? ''}`)
      if (sort.key === 'status') return statusOrder.get(task.status) ?? 999
      if (sort.key === 'priority') return priorityOrder[task.priority]
      if (sort.key === 'list') return text(listNameById.get(task.listId) ?? task.listId)
      if (sort.key === 'assignees') return text(task.assigneeIds.map((id) => userNameById.get(id) ?? id).join(' '))
      if (sort.key === 'due') return task.dueDate ? new Date(`${task.dueDate}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER
      return task.trackedMinutes / Math.max(1, task.estimateMinutes)
    }

    return [...tasks].sort((a, b) => {
      const aValue = valueFor(a)
      const bValue = valueFor(b)
      const result = typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue), 'pl', { sensitivity: 'base' })
      if (result !== 0) return sort.direction === 'asc' ? result : -result
      return a.position - b.position
    })
  }, [listNameById, sort.direction, sort.key, tasks, userNameById])

  const dropOnRow = (event: DragEvent<HTMLDivElement>, beforeTask: GridTask) => {
    event.preventDefault()
    event.stopPropagation()
    const taskId = event.dataTransfer.getData('application/x-madi-task') || draggingId
    if (taskId && taskId !== beforeTask.id) {
      moveTask(taskId, { status: beforeTask.status, listId: beforeTask.listId, beforeTaskId: beforeTask.id })
      setSort({ key: 'manual', direction: 'asc' })
    }
    setDraggingId(null)
    setOverId(null)
  }

  const dropAtListEnd = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('application/x-madi-task') || draggingId
    if (!taskId) return
    const lastTask = sortedTasks.filter((task) => task.id !== taskId).at(-1)
    if (lastTask) {
      moveTask(taskId, { status: lastTask.status, listId: lastTask.listId, beforeTaskId: null })
      setSort({ key: 'manual', direction: 'asc' })
    }
    setDraggingId(null)
    setOverId(null)
  }

  return (
    <div
      className="madi-scroll-area h-full"
      onDragOver={(event) => {
        if (!draggingId) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={dropAtListEnd}
    >
      <div data-grid-list-table style={{ minWidth }}>
        <div
          className="sticky top-0 z-10 grid gap-2 border-b border-border bg-muted/70 px-[var(--app-module-pad-x)] py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur"
          style={{ gridTemplateColumns }}
        >
          {columns.map((column) => (
            <div key={column.id} className="relative flex items-center">
              {column.id !== 'select' && column.id !== 'actions' ? (
                <button
                  type="button"
                  onClick={() => sortTasks(column.id as SortKey)}
                  className={`flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-background hover:text-foreground ${
                    sort.key === column.id ? 'text-foreground' : ''
                  }`}
                  title={`Sortuj po kolumnie: ${column.label}`}
                >
                  <span className="truncate">{column.label}</span>
                  <span className="ml-auto flex h-4 w-3 shrink-0 flex-col items-center justify-center text-[9px] leading-[7px]" aria-hidden="true">
                    <span className={sort.key === column.id && sort.direction === 'asc' ? 'text-primary' : 'text-muted-foreground/45'}>^</span>
                    <span className={sort.key === column.id && sort.direction === 'desc' ? 'text-primary' : 'text-muted-foreground/45'}>v</span>
                  </span>
                </button>
              ) : (
                <span>{column.label}</span>
              )}
              {column.id !== 'select' && column.id !== 'actions' && (
                <button
                  onMouseDown={(event) =>
                    startResize(
                      event,
                      columnWidth(column.id, column.width),
                      (width) => setListColumnWidth(userId, currentModule, column.id, width),
                      column.min,
                      column.max
                    )
                  }
                  className="madi-resize-handle absolute -right-1 top-0 h-full w-3 cursor-col-resize rounded opacity-0 hover:bg-primary/20 hover:opacity-100"
                  title="Zmien szerokosc kolumny"
                />
              )}
            </div>
          ))}
        </div>
        {sortedTasks.map((task) => {
          const listName = lists.find((list) => list.id === task.listId)?.name ?? task.listId
          const pinnedComment = getPinnedComment(task)
          return (
            <div
              key={task.id}
              data-grid-list-row
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/x-madi-task', task.id)
                event.dataTransfer.effectAllowed = 'move'
                setDraggingId(task.id)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setOverId(task.id)
              }}
              onDrop={(event) => dropOnRow(event, task)}
              onClick={() => setActiveTask(task.id)}
              onDoubleClick={(event) => {
                event.stopPropagation()
                setActiveTask(task.id)
                openOrderWindow(task.id, task.orderNumber)
              }}
              className={`grid cursor-pointer items-center gap-2 border-b border-border px-[var(--app-module-pad-x)] py-2.5 text-sm transition-colors ${
                selectionMode && task.selected ? 'bg-primary/10' : overId === task.id && draggingId !== task.id ? 'bg-primary/5' : 'hover:bg-muted/30'
              }`}
              style={{ gridTemplateColumns }}
            >
              {selectionMode && (
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleTaskSelection(task.id)
                  }}
                  className="flex h-8 items-center justify-center text-muted-foreground hover:text-primary"
                  title="Zaznacz"
                >
                  {task.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              )}
              <div className="flex min-w-0 items-center gap-2 px-2">
                <GripVertical size={14} className="shrink-0 text-muted-foreground/60" />
                <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                    <TaskTypeIcon task={task} listName={listName} size="sm" />
                    <p className="truncate font-medium text-foreground">{task.title || 'Bez nazwy'}</p>
                    <CorrectionSignal task={task} compact />
                    <CommentBubbleSignal task={task} compact />
                    {pinnedComment && (
                      <span
                        className="madi-pinned-note inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
                        title={`Uwaga przypieta: ${pinnedComment.content}`}
                      >
                        <Pin size={11} />
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {task.orderNumber || 'Bez numeru'} · {task.customerName || 'Bez klienta'}
                  </p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <FolderOpen size={11} className="shrink-0" />
                    <span className="truncate font-mono" title={task.filesPath || 'Brak sciezki'}>
                      {task.filesPath || 'Brak sciezki plikow'}
                    </span>
                    {task.filesPath && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          copyText(task.filesPath)
                        }}
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-primary"
                        title="Kopiuj sciezke"
                      >
                        <Copy size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <StatusPill status={task.status} />
              </div>
              <div className="min-w-0">
                <PriorityPill priority={task.priority} />
              </div>
              <span className="truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground" title="Lista tylko do podgladu - edycja w panelu">
                {listName}
              </span>
              <div className="flex min-w-0 items-center gap-2" title="Osoby tylko do podgladu - edycja w panelu">
                <AssigneeAvatarStack ids={task.assigneeIds} showEmpty size="sm" singleLabel />
              </div>
              <span className="truncate text-xs text-muted-foreground" title="Termin tylko do podgladu - edycja w panelu">
                {task.dueDate ? dateLabel(task.dueDate) : 'Brak'}
              </span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {formatMinutes(task.trackedMinutes)} / {formatMinutes(task.estimateMinutes)}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={(event) => { event.stopPropagation(); setActiveTask(task.id) }} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Edytuj w panelu bocznym">
                  <PanelRight size={14} />
                </button>
                <button onClick={(event) => { event.stopPropagation(); setActiveTask(task.id); openOrderWindow(task.id, task.orderNumber) }} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Otworz w oknie">
                  <ExternalLink size={14} />
                </button>
                <button onClick={(event) => { event.stopPropagation(); nudgeTask(task.id, -1) }} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Wyzej">
                  <ArrowUp size={14} />
                </button>
                <button onClick={(event) => { event.stopPropagation(); nudgeTask(task.id, 1) }} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Nizej">
                  <ArrowDown size={14} />
                </button>
                <button onClick={(event) => { event.stopPropagation(); duplicateTask(task.id) }} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Duplikuj">
                  <Copy size={14} />
                </button>
                <button onClick={(event) => { event.stopPropagation(); deleteTask(task.id) }} className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Usun">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CalendarView({ tasks }: { tasks: GridTask[] }) {
  const { lists, setActiveTask, updateTask } = useGridStore()
  const groups = useMemo(() => {
    const result = new Map<string, GridTask[]>()
    tasks.forEach((task) => {
      const key = task.dueDate || 'bez-terminu'
      result.set(key, [...(result.get(key) ?? []), task])
    })
    return Array.from(result.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [tasks])

  return (
    <div className="h-full overflow-auto p-[var(--app-module-gap)]">
      <div className="grid grid-cols-1 gap-[var(--app-module-gap)] lg:grid-cols-2 2xl:grid-cols-3">
        {groups.map(([date, items]) => (
          <div key={date} className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold">{date === 'bez-terminu' ? 'Bez terminu' : dateLabel(date)}</p>
                <p className="text-[11px] text-muted-foreground">{items.length} zadania</p>
              </div>
              <Calendar size={17} className="text-muted-foreground" />
            </div>
            <div className="space-y-2 p-3">
              {items.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setActiveTask(task.id)}
                  className="w-full rounded-md border border-border bg-background p-3 text-left hover:border-primary/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {lists.find((list) => list.id === task.listId)?.name} · {task.customerName || 'Bez klienta'}
                      </p>
                    </div>
                    <PriorityPill priority={task.priority} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <input
                      type="date"
                      value={task.dueDate}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateTask(task.id, { dueDate: event.target.value })}
                      className="h-8 rounded border border-border bg-background px-2 text-xs"
                    />
                    <AssigneeAvatarStack ids={task.assigneeIds} size="sm" showEmpty={false} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function toCalendarIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addCalendarDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addCalendarMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months, 1)
  return next
}

function startCalendarWeek(date: Date) {
  const next = new Date(date)
  const offset = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - offset)
  next.setHours(0, 0, 0, 0)
  return next
}

function buildPlanningDays(cursor: Date, mode: 'month' | 'week') {
  const start =
    mode === 'week'
      ? startCalendarWeek(cursor)
      : startCalendarWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1))
  const length = mode === 'week' ? 7 : 42
  return Array.from({ length }, (_, index) => addCalendarDays(start, index))
}

function PlanningCalendarView({ tasks }: { tasks: GridTask[] }) {
  const { lists, setActiveTask, updateTask } = useGridStore()
  const [cursorDate, setCursorDate] = useState(() => new Date())
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const todayIso = toCalendarIsoDate(new Date())
  const days = useMemo(() => buildPlanningDays(cursorDate, mode), [cursorDate, mode])
  const unscheduledTasks = tasks.filter((task) => !task.dueDate)
  const tasksByDate = useMemo(() => {
    const result = new Map<string, GridTask[]>()
    tasks.forEach((task) => {
      if (!task.dueDate) return
      result.set(task.dueDate, [...(result.get(task.dueDate) ?? []), task])
    })
    return result
  }, [tasks])

  const monthLabel = new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric',
  }).format(cursorDate)

  const visibleTasks = days.flatMap((day) => tasksByDate.get(toCalendarIsoDate(day)) ?? [])
  const plannedMinutes = visibleTasks.reduce((sum, task) => sum + task.estimateMinutes, 0)
  const trackedMinutes = visibleTasks.reduce((sum, task) => sum + task.trackedMinutes, 0)
  const urgentCount = visibleTasks.filter((task) => task.priority === 'urgent').length
  const runningCount = visibleTasks.filter((task) => task.status === 'in_progress' || task.status === 'production').length
  const expandedIndex = expandedDate ? days.findIndex((day) => toCalendarIsoDate(day) === expandedDate) : -1
  const expandedRow = expandedIndex >= 0 ? Math.floor(expandedIndex / 7) : -1
  const expandedTaskCount = expandedDate ? (tasksByDate.get(expandedDate)?.length ?? 0) : 0
  const expandedRowHeight = Math.max(340, 120 + expandedTaskCount * 76)
  const calendarRowCount = Math.ceil(days.length / 7)
  const calendarGridRows = mode === 'week'
    ? 'minmax(360px, 1fr)'
    : Array.from({ length: calendarRowCount }, (_, row) =>
        row === expandedRow ? `minmax(${expandedRowHeight}px, max-content)` : 'minmax(176px, 1fr)'
      ).join(' ')

  const moveTaskToDate = (event: DragEvent<HTMLDivElement>, date: string) => {
    event.preventDefault()
    event.stopPropagation()
    const taskId = event.dataTransfer.getData('application/x-madi-task')
    if (taskId) updateTask(taskId, { dueDate: date })
    setDragOverDate(null)
  }

  const navigate = (direction: -1 | 1) => {
    setCursorDate((current) => (mode === 'week' ? addCalendarDays(current, direction * 7) : addCalendarMonths(current, direction)))
    setExpandedDate(null)
  }

  const dayNames = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Nd']

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-[var(--app-module-pad-x)] py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Calendar size={17} className="text-primary" />
            <h2 className="truncate text-sm font-semibold capitalize">{monthLabel}</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {visibleTasks.length} widocznych zadan, plan {formatMinutes(plannedMinutes)}, wykonane {formatMinutes(trackedMinutes)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-background">
            <button
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Poprzedni okres"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => {
                setCursorDate(new Date())
                setExpandedDate(null)
              }}
              className="h-8 border-x border-border px-3 text-xs font-medium hover:bg-muted"
            >
              Dzisiaj
            </button>
            <button
              onClick={() => navigate(1)}
              className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Nastepny okres"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="flex items-center rounded-md bg-muted p-1">
            {(['month', 'week'] as const).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setMode(item)
                  setExpandedDate(null)
                }}
                className={`h-7 rounded px-3 text-xs font-medium ${
                  mode === item ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item === 'month' ? 'Miesiac' : 'Tydzien'}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[11px] text-muted-foreground xl:flex">
            <span>W toku: {runningCount}</span>
            <span className="h-3 border-l border-border" />
            <span className={urgentCount ? 'font-semibold text-destructive' : ''}>Pilne: {urgentCount}</span>
          </div>
        </div>
      </div>

      {unscheduledTasks.length > 0 && (
        <div className="shrink-0 border-b border-border bg-muted/20 px-[var(--app-module-pad-x)] py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Bez terminu</span>
            {unscheduledTasks.map((task) => (
              <button
                key={task.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/x-madi-task', task.id)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => setActiveTask(task.id)}
                className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-border bg-background px-2 text-xs hover:border-primary/60"
              >
                <span className="max-w-[220px] truncate">{task.title}</span>
                <PriorityPill priority={task.priority} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-7 border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {dayNames.map((day) => (
          <div key={day} className="border-r border-border px-2 py-2 last:border-r-0">
            {day}
          </div>
        ))}
      </div>


      <div
        className="grid madi-scroll-area min-h-0 flex-1 grid-cols-7 overflow-auto"
        style={{ gridTemplateRows: calendarGridRows }}
      >
        {days.map((day) => {
          const iso = toCalendarIsoDate(day)
          const dayTasks = tasksByDate.get(iso) ?? []
          const outside = day.getMonth() !== cursorDate.getMonth()
          const dayEstimate = dayTasks.reduce((sum, task) => sum + task.estimateMinutes, 0)
          const dayTracked = dayTasks.reduce((sum, task) => sum + task.trackedMinutes, 0)
          const isToday = iso === todayIso
          const dropTarget = dragOverDate === iso
          const baseVisibleLimit = mode === 'week' ? 5 : 1
          const isExpanded = expandedDate === iso
          const visibleLimit = isExpanded ? dayTasks.length : baseVisibleLimit

          return (
            <div
              key={iso}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setDragOverDate(iso)
              }}
              onDragLeave={() => setDragOverDate((current) => (current === iso ? null : current))}
              onDrop={(event) => moveTaskToDate(event, iso)}
              className={`flex flex-col border-b border-r border-border p-2 transition-colors last:border-r-0 ${
                outside ? 'bg-muted/15 text-muted-foreground' : 'bg-background'
              } ${isExpanded ? 'bg-primary/[0.03] ring-1 ring-inset ring-primary/30' : ''} ${
                dropTarget ? 'bg-primary/10 ring-1 ring-inset ring-primary/50' : ''
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <button
                  onClick={() => {
                    setCursorDate(day)
                    setMode('week')
                  }}
                  className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs font-semibold ${
                    isToday ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  {day.getDate()}
                </button>
                <div className="min-w-0 text-right">
                  <p className="text-[10px] text-muted-foreground">{dayTasks.length} zad.</p>
                  {dayEstimate > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {formatMinutes(dayTracked)} / {formatMinutes(dayEstimate)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                {dayTasks.slice(0, visibleLimit).map((task) => {
                  const status = GRID_STATUSES.find((item) => item.id === task.status)
                  const list = lists.find((item) => item.id === task.listId)
                  return (
                    <button
                      key={task.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('application/x-madi-task', task.id)
                        event.dataTransfer.effectAllowed = 'move'
                      }}
                      onClick={() => setActiveTask(task.id)}
                      className="group w-full shrink-0 rounded-md border border-border bg-card px-2 py-1.5 text-left shadow-sm transition-colors hover:border-primary/60 hover:bg-muted/30"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: status?.color ?? priorityColors[task.priority] }} />
                        <span className="truncate text-[11px] font-semibold text-foreground">{task.title}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] text-muted-foreground">
                          {task.orderNumber || list?.name || 'Zadanie'}
                        </span>
                        <AssigneeAvatarStack ids={task.assigneeIds} size="sm" showEmpty={false} />
                      </div>
                    </button>
                  )
                })}
                {(dayTasks.length > baseVisibleLimit || isExpanded) && (
                  <button
                    onClick={() => setExpandedDate((current) => (current === iso ? null : iso))}
                    className={`mt-auto flex min-h-8 w-full items-center justify-center gap-1 rounded-md border border-dashed px-1 text-[11px] font-medium hover:border-primary hover:text-foreground ${
                      isExpanded
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    <ChevronDown size={12} className={isExpanded ? 'rotate-180' : ''} />
                    {isExpanded ? 'zwin dzien' : `+${dayTasks.length - baseVisibleLimit} wiecej`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MultiAssigneeEditor({ task }: { task: GridTask }) {
  const { updateTask } = useGridStore()
  const toggleAssignee = (userId: string) => {
    const assigneeIds = task.assigneeIds.includes(userId)
      ? task.assigneeIds.filter((id) => id !== userId)
      : [...task.assigneeIds, userId]
    updateTask(task.id, { assigneeIds })
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {DEMO_USERS.map((user) => (
        <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted">
          <input
            type="checkbox"
            checked={task.assigneeIds.includes(user.id)}
            onChange={() => toggleAssignee(user.id)}
          />
          <UserAvatar userId={user.id} size="sm" />
          <span className="truncate">{user.name}</span>
        </label>
      ))}
    </div>
  )
}

function DetailSection({
  id,
  title,
  icon,
  children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const { user } = useAuthStore()
  const { currentModule } = useAppStore()
  const userId = user?.id ?? 'guest'
  const prefs = useModulePrefs(userId, currentModule)
  const toggleCollapsedPanel = useViewPreferencesStore((state) => state.toggleCollapsedPanel)
  const collapsed = prefs.collapsedPanels.includes(id)

  return (
    <section className="mt-5 rounded-md border border-border">
      <button
        onClick={() => toggleCollapsedPanel(userId, currentModule, id)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/50"
      >
        {icon}
        <span className="flex-1">{title}</span>
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>
      {!collapsed && <div className="border-t border-border p-3">{children}</div>}
    </section>
  )
}

function RcpModeIcon({ mode }: { mode: GridRcpMode }) {
  if (mode === 'scanner') return <ScanLine size={13} />
  if (mode === 'card') return <CreditCard size={13} />
  if (mode === 'beacon') return <RadioTower size={13} />
  return <Clock3 size={13} />
}

function RcpSection({ task }: { task: GridTask }) {
  const { addRcpEvent } = useGridStore()
  const { user } = useAuthStore()
  const [mode, setMode] = useState<GridRcpMode>('manual')
  const [code, setCode] = useState('')
  const [minutes, setMinutes] = useState('15')
  const events = [...(task.rcpEvents ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const userId = user?.id ?? '1'
  const userName = user?.name ?? 'Grafik Demo'

  const register = (type: GridRcpEventType) => {
    const minutesDelta = type === 'manual' || type === 'stop' || type === 'finish' ? toInputNumber(minutes) : 0
    addRcpEvent(task.id, {
      type,
      mode,
      userId,
      userName,
      code,
      minutesDelta,
    })
    if (type !== 'start' && type !== 'pause') setMinutes('15')
    setCode('')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          Tryb wejscia
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as GridRcpMode)}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
          >
            {Object.entries(rcpModeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Minuty do dopisania
          <input
            type="number"
            min={0}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Kod skanera / karty / nadajnika
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') register('start')
          }}
          placeholder="np. PIN, RFID, kod kreskowy zadania"
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
        />
      </label>
      <div className="grid grid-cols-5 gap-1.5">
        {(['start', 'pause', 'stop', 'finish', 'manual'] as GridRcpEventType[]).map((type) => (
          <button
            key={type}
            onClick={() => register(type)}
            className="flex h-8 items-center justify-center rounded-md border border-border px-2 text-[11px] hover:bg-muted"
          >
            {rcpEventLabels[type]}
          </button>
        ))}
      </div>
      <div className="rounded-md border border-border bg-muted/20">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span>Historia RCP</span>
          <span>{formatMinutes(task.trackedMinutes)}</span>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {events.length ? (
            events.slice(0, 12).map((event) => (
              <div key={event.id} className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-xs last:border-0">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-background text-muted-foreground">
                  <RcpModeIcon mode={event.mode} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{rcpEventLabels[event.type]} - {event.userName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {rcpModeLabels[event.mode]} {event.code ? `- ${event.code}` : ''} - {new Date(event.createdAt).toLocaleString('pl-PL')}
                  </p>
                </div>
                {event.minutesDelta > 0 && <span className="text-[11px] text-muted-foreground">+{event.minutesDelta}m</span>}
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Brak odbic RCP dla tego zadania.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function getTaskTimeMode(task: GridTask): GridTaskTimeMode {
  return task.timeMode ?? inferGridTaskTimeMode(task.listId, task.workType)
}

function ActivityRcpRow({ task, item }: { task: GridTask; item: GridTask['checklist'][number] }) {
  const { addActivityRcpEvent, updateChecklistItem } = useGridStore()
  const { user } = useAuthStore()
  const [mode, setMode] = useState<GridRcpMode>('manual')
  const [code, setCode] = useState('')
  const [minutes, setMinutes] = useState(String(item.estimateMinutes || 15))
  const userId = user?.id ?? '1'
  const userName = user?.name ?? 'Grafik Demo'
  const tracked = item.trackedMinutes ?? 0
  const estimate = item.estimateMinutes ?? 0
  const progress = estimate ? Math.min((tracked / estimate) * 100, 100) : item.done ? 100 : 0

  const register = (type: GridRcpEventType) => {
    const minutesDelta = type === 'manual' || type === 'stop' || type === 'finish' ? toInputNumber(minutes) : 0
    addActivityRcpEvent(task.id, item.id, {
      type,
      mode,
      userId,
      userName,
      code,
      minutesDelta,
    })
    setCode('')
  }

  return (
    <div className={`rounded-md border p-3 ${item.done ? 'border-[#2b8a3e]/40 bg-[#2b8a3e]/5' : 'border-border bg-muted/10'}`}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => updateChecklistItem(task.id, item.id, { done: !item.done })}
          className="mt-1 text-muted-foreground hover:text-primary"
          title="Oznacz czynnosc"
        >
          {item.done ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
        <div className="min-w-0 flex-1">
          <input
            value={item.label}
            onChange={(event) => updateChecklistItem(task.id, item.id, { label: event.target.value })}
            className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-sm font-medium outline-none hover:border-border focus:border-primary focus:bg-background"
          />
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatMinutes(tracked)} / {estimate ? formatMinutes(estimate) : 'bez planu'}
            </span>
          </div>
        </div>
        <AssigneeAvatarStack ids={item.assigneeIds ?? task.assigneeIds} size="sm" showEmpty={false} />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_88px_100px] gap-2">
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as GridRcpMode)}
          className="h-8 rounded border border-border bg-background px-2 text-xs"
        >
          {Object.entries(rcpModeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          className="h-8 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          title="Minuty"
        />
        <input
          type="number"
          min={0}
          value={item.estimateMinutes ?? 0}
          onChange={(event) => updateChecklistItem(task.id, item.id, { estimateMinutes: toInputNumber(event.target.value) })}
          className="h-8 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          title="Plan minut"
        />
      </div>

      <input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') register('start')
        }}
        placeholder="Kod skanera / karty / nadajnika dla tej czynnosci"
        className="mt-2 h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
      />

      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {(['start', 'pause', 'stop', 'finish', 'manual'] as GridRcpEventType[]).map((type) => (
          <button
            key={type}
            onClick={() => register(type)}
            className="flex h-8 items-center justify-center rounded-md border border-border px-2 text-[11px] hover:bg-muted"
          >
            {rcpEventLabels[type]}
          </button>
        ))}
      </div>

      {(item.rcpEvents?.length ?? 0) > 0 && (
        <div className="mt-2 max-h-24 overflow-y-auto rounded border border-border bg-background">
          {[...(item.rcpEvents ?? [])].reverse().slice(0, 5).map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5 text-[11px] last:border-0">
              <span className="truncate">{rcpEventLabels[event.type]} - {rcpModeLabels[event.mode]}</span>
              <span className="shrink-0 text-muted-foreground">+{event.minutesDelta}m</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityRcpSection({ task }: { task: GridTask }) {
  const { addChecklistItem } = useGridStore()
  const [newActivity, setNewActivity] = useState('')

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
        W tym trybie kazda czynnosc zlecenia ma osobne odbicia RCP i osobny licznik czasu. Suma trafia rowniez do czasu calego zlecenia.
      </div>
      {task.checklist.map((item) => (
        <ActivityRcpRow key={item.id} task={task} item={item} />
      ))}
      <div className="flex gap-2">
        <input
          value={newActivity}
          onChange={(event) => setNewActivity(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              addChecklistItem(task.id, newActivity)
              setNewActivity('')
            }
          }}
          placeholder="Dodaj czynnosc produkcyjna..."
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        />
        <button
          onClick={() => {
            addChecklistItem(task.id, newActivity)
            setNewActivity('')
          }}
          className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-muted"
        >
          <Plus size={14} />
          Dodaj
        </button>
      </div>
    </div>
  )
}

function TaskFilesPanel({
  task,
  onPathChange,
}: {
  task: GridTask
  onPathChange: (path: string) => void
}) {
  const [folderName, setFolderName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const currentPath = task.filesPath.trim()

  const createFolder = async () => {
    setMessage('')
    setError('')
    if (!currentPath) {
      setError('Najpierw wpisz sciezke bazowa.')
      return
    }
    if (!folderName.trim()) {
      setError('Wpisz nazwe folderu.')
      return
    }

    setBusy(true)
    try {
      const response = await fetch('/api/local-files/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basePath: currentPath, folderName }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error ?? 'Nie udalo sie utworzyc folderu.')
      onPathChange(result.path)
      setFolderName('')
      setMessage(`Utworzono folder: ${result.path}`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nie udalo sie utworzyc folderu.')
    } finally {
      setBusy(false)
    }
  }

  const uploadFiles = async () => {
    setMessage('')
    setError('')
    if (!currentPath) {
      setError('Najpierw wpisz sciezke folderu.')
      return
    }
    if (!selectedFiles.length) {
      setError('Wybierz pliki do wrzucenia.')
      return
    }

    const formData = new FormData()
    formData.append('basePath', currentPath)
    selectedFiles.forEach((file) => formData.append('files', file))

    setBusy(true)
    try {
      const response = await fetch('/api/local-files/upload', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error ?? 'Nie udalo sie zapisac plikow.')
      setSelectedFiles([])
      setMessage(`Zapisano ${result.files?.length ?? 0} plikow w: ${result.path}`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nie udalo sie zapisac plikow.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Folder zadania</p>
          <p className="mt-1 truncate font-mono text-xs text-foreground" title={currentPath || 'Brak sciezki'}>
            {currentPath || 'Brak sciezki plikow'}
          </p>
        </div>
        <button
          onClick={() => currentPath && copyText(currentPath)}
          disabled={!currentPath}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          title="Kopiuj sciezke"
        >
          <Copy size={15} />
        </button>
      </div>

      <label className="block space-y-1 text-xs text-muted-foreground">
        Sciezka folderu
        <input
          value={task.filesPath}
          onChange={(event) => onPathChange(event.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground outline-none focus:border-primary"
          placeholder="np. X:\\DEMO_ZLECENIA\\Klient\\ZL-2026-0141"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={folderName}
          onChange={(event) => setFolderName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') createFolder()
          }}
          className="h-9 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          placeholder="Nazwa nowego folderu, np. DTP"
        />
        <button
          onClick={createFolder}
          disabled={busy}
          className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FolderOpen size={14} />
          Utworz folder
        </button>
      </div>

      <div className="rounded-md border border-dashed border-border bg-background p-3">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Upload size={18} />
          <span>{selectedFiles.length ? `${selectedFiles.length} plikow gotowych do zapisu` : 'Wybierz pliki do wrzucenia do folderu'}</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
          />
        </label>
        {selectedFiles.length > 0 && (
          <div className="mt-3 space-y-1">
            {selectedFiles.map((file) => (
              <p key={`${file.name}-${file.size}`} className="truncate text-[11px] text-muted-foreground">
                {file.name}
              </p>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={uploadFiles}
        disabled={busy || !selectedFiles.length}
        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Upload size={14} />
        Zapisz pliki w folderze
      </button>

      {message && <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function TaskDetailPanel() {
  const {
    statuses,
    lists,
    activeTaskId,
    setActiveTask,
    getActiveTask,
    updateTask,
    deleteTask,
    duplicateTask,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    addComment,
    updateComment,
    deleteComment,
    togglePinnedComment,
  } = useGridStore()
  const { user } = useAuthStore()
  const task = getActiveTask()
  const [newChecklist, setNewChecklist] = useState('')
  const [newComment, setNewComment] = useState('')
  const [correctionReason, setCorrectionReason] = useState('Blad przygotowania plikow')
  const [correctionDescription, setCorrectionDescription] = useState('')
  const [correctionDueDate, setCorrectionDueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [correctionEstimate, setCorrectionEstimate] = useState(30)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')

  if (!task) {
    return (
      <aside className="hidden w-[var(--app-detail-panel-width)] shrink-0 border-l border-border bg-background xl:flex xl:flex-col">
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
          <PanelRight size={34} className="mb-3" />
          <p className="text-sm font-medium text-foreground">Wybierz zadanie</p>
          <p className="mt-1 text-xs">Szczegoly, pola edycji, komentarze i checklisty pojawia sie tutaj.</p>
        </div>
      </aside>
    )
  }

  const authorId = user?.id ?? '1'
  const authorName = user?.name ?? 'Grafik Demo'
  const timeMode = getTaskTimeMode(task)
  const pinnedComment = getPinnedComment(task)
  const latestCorrection = getLatestCorrection(task)
  const startCommentEdit = (commentId: string, content: string) => {
    setEditingCommentId(commentId)
    setEditingCommentContent(content)
  }
  const cancelCommentEdit = () => {
    setEditingCommentId(null)
    setEditingCommentContent('')
  }
  const saveCommentEdit = () => {
    if (!editingCommentId) return
    updateComment(task.id, editingCommentId, editingCommentContent)
    cancelCommentEdit()
  }
  const setQuickStatus = (status: GridStatusId) => updateTask(task.id, { status })

  return (
    <aside className="w-[var(--app-detail-panel-width)] shrink-0 border-l border-border bg-background">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{task.orderNumber || 'Zadanie'}</p>
            <p className="text-[11px] text-muted-foreground">Ostatnia zmiana {dateLabel(task.updatedAt.slice(0, 10))}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => openOrderWindow(task.id, task.orderNumber)} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Otworz w oknie">
              <ExternalLink size={16} />
            </button>
            <button onClick={() => duplicateTask(task.id)} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Duplikuj">
              <Copy size={16} />
            </button>
            <button onClick={() => deleteTask(task.id)} className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Usun">
              <Trash2 size={16} />
            </button>
            <button onClick={() => setActiveTask(null)} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Zamknij">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-[var(--app-module-gap)]">
          <input
            value={task.title}
            onChange={(event) => updateTask(task.id, { title: event.target.value })}
            className="mb-3 w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-[clamp(17px,1vw,20px)] font-semibold outline-none hover:border-border focus:border-primary focus:bg-muted/20"
          />
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <button
              onClick={() => setQuickStatus('in_progress')}
              className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2 font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/45 dark:bg-emerald-950/35 dark:text-emerald-200"
              title="Oznacz zlecenie jako w toku"
            >
              <Clock3 size={14} />
              W toku
            </button>
            <button
              onClick={() => setQuickStatus('done')}
              className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-2 font-semibold text-green-700 hover:bg-green-100 dark:border-green-500/45 dark:bg-green-950/35 dark:text-green-200"
              title="Oznacz zlecenie jako gotowe"
            >
              <Check size={14} />
              Gotowe
            </button>
            <button
              onClick={() => setQuickStatus('review')}
              className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-orange-300 bg-orange-50 px-2 font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-500/45 dark:bg-orange-950/35 dark:text-orange-200"
              title="Przekaz zlecenie do poprawki / sprawdzenia"
            >
              <AlertTriangle size={14} />
              Poprawka
            </button>
            <button
              onClick={() => setQuickStatus('done')}
              className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Archiwizuj jako gotowe"
            >
              <Archive size={14} />
              Archiwizuj
            </button>
          </div>
          {pinnedComment && (
            <div className="madi-pinned-note mb-3 rounded-md border border-amber-300/80 bg-amber-50 p-3 text-amber-950 dark:border-amber-400/45 dark:bg-amber-950/35 dark:text-amber-100">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold">
                  <Pin size={14} className="shrink-0 text-amber-600 dark:text-amber-300" />
                  <span className="truncate">Uwaga przypieta przez {pinnedComment.authorName}</span>
                </span>
                <button
                  onClick={() => togglePinnedComment(task.id, pinnedComment.id)}
                  className="shrink-0 rounded px-2 py-1 text-[11px] text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
                  title="Odepnij uwage"
                >
                  Odepnij
                </button>
              </div>
              <p className="text-sm leading-relaxed">{pinnedComment.content}</p>
            </div>
          )}
          <div className="mb-3 flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
            <FolderOpen size={14} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={task.filesPath || 'Brak sciezki'}>
              {task.filesPath || 'Brak sciezki plikow'}
            </span>
            <button
              onClick={() => task.filesPath && copyText(task.filesPath)}
              disabled={!task.filesPath}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              title="Kopiuj sciezke"
            >
              <Copy size={14} />
            </button>
          </div>
          <textarea
            value={task.description}
            onChange={(event) => updateTask(task.id, { description: event.target.value })}
            placeholder="Opis zadania..."
            rows={4}
            className="mb-4 w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Status
              <select
                value={task.status}
                onChange={(event) => updateTask(task.id, { status: event.target.value as GridStatusId })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Priorytet
              <select
                value={task.priority}
                onChange={(event) => updateTask(task.id, { priority: event.target.value as OrderPriority })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Lista
              <select
                value={task.listId}
                onChange={(event) => updateTask(task.id, { listId: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>{list.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Typ pracy
              <input
                value={task.workType}
                onChange={(event) => updateTask(task.id, { workType: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Start
              <input
                type="date"
                value={task.startDate}
                onChange={(event) => updateTask(task.id, { startDate: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Termin
              <input
                type="date"
                value={task.dueDate}
                onChange={(event) => updateTask(task.id, { dueDate: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Estymacja min.
              <input
                type="number"
                min={0}
                value={task.estimateMinutes}
                onChange={(event) => updateTask(task.id, { estimateMinutes: toInputNumber(event.target.value) })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Czas min.
              <input
                type="number"
                min={0}
                value={task.trackedMinutes}
                onChange={(event) => updateTask(task.id, { trackedMinutes: toInputNumber(event.target.value) })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="col-span-2 space-y-1 text-xs text-muted-foreground">
              Liczenie czasu
              <select
                value={timeMode}
                onChange={(event) => updateTask(task.id, { timeMode: event.target.value as GridTaskTimeMode })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                <option value="activity">RCP per czynnosc zlecenia</option>
                <option value="task">Czas calego zlecenia / grafika</option>
              </select>
            </label>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block space-y-1 text-xs text-muted-foreground">
              Klient
              <input
                value={task.customerName}
                onChange={(event) => updateTask(task.id, { customerName: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              Numer / ID
              <input
                value={task.orderNumber}
                onChange={(event) => updateTask(task.id, { orderNumber: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              Tagi
              <input
                value={tagsToString(task.tags)}
                onChange={(event) => updateTask(task.id, { tags: stringToTags(event.target.value) })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>

          <DetailSection id="files" title="Pliki i folder" icon={<FolderOpen size={14} />}>
            <TaskFilesPanel task={task} onPathChange={(path) => updateTask(task.id, { filesPath: path })} />
          </DetailSection>

          {timeMode === 'activity' ? (
            <DetailSection id="activities" title="Czynnosci / RCP" icon={<Clock3 size={14} />}>
              <ActivityRcpSection task={task} />
            </DetailSection>
          ) : (
            <DetailSection id="rcp" title="RCP calego zlecenia" icon={<Clock3 size={14} />}>
              <RcpSection task={task} />
            </DetailSection>
          )}

          <DetailSection id="assignees" title="Osoby" icon={<Users size={14} />}>
            <MultiAssigneeEditor task={task} />
          </DetailSection>

          {timeMode === 'task' && (
            <DetailSection id="checklist" title="Checklist grafiki / przygotowania" icon={<CheckSquare size={14} />}>
              <div className="space-y-2">
                {task.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <button
                      onClick={() => updateChecklistItem(task.id, item.id, { done: !item.done })}
                      className="text-muted-foreground hover:text-primary"
                    >
                      {item.done ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <input
                      value={item.label}
                      onChange={(event) => updateChecklistItem(task.id, item.id, { label: event.target.value })}
                      className={`h-8 min-w-0 flex-1 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary ${
                        item.done ? 'text-muted-foreground line-through' : ''
                      }`}
                    />
                    <button
                      onClick={() => deleteChecklistItem(task.id, item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={newChecklist}
                    onChange={(event) => setNewChecklist(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        addChecklistItem(task.id, newChecklist)
                        setNewChecklist('')
                      }
                    }}
                    placeholder="Dodaj punkt..."
                    className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => {
                      addChecklistItem(task.id, newChecklist)
                      setNewChecklist('')
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </DetailSection>
          )}

          <DetailSection id="comments" title="Komentarze" icon={<MessageSquare size={14} />}>
            <div className="space-y-3">
              <div className="rounded-md border border-red-300/80 bg-red-50 p-3 text-red-950 dark:border-red-400/45 dark:bg-red-950/35 dark:text-red-100">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle size={15} />
                    Poprawka / uwaga do zlecenia
                  </div>
                  {latestCorrection && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/60 dark:text-red-200">
                      Aktywna
                    </span>
                  )}
                </div>
                {latestCorrection && (
                  <p className="mb-3 rounded border border-red-200 bg-white/60 p-2 text-xs leading-relaxed dark:border-red-800 dark:bg-black/20">
                    {latestCorrection.content}
                  </p>
                )}
                <div className="grid gap-2">
                  <select
                    value={correctionReason}
                    onChange={(event) => setCorrectionReason(event.target.value)}
                    className="h-9 rounded-md border border-red-200 bg-background px-2 text-xs outline-none focus:border-red-400 dark:border-red-800"
                  >
                    <option>Blad przygotowania plikow</option>
                    <option>Blad obslugi zlecenia</option>
                    <option>Blad produkcyjny / technologiczny</option>
                    <option>Blad po stronie klienta</option>
                    <option>Zmiana zakresu / dodatkowe uwagi</option>
                  </select>
                  <textarea
                    value={correctionDescription}
                    onChange={(event) => setCorrectionDescription(event.target.value)}
                    placeholder="Opisz dokladnie co poprawic, co wyjasnic albo co blokuje dalszy etap..."
                    rows={3}
                    className="w-full resize-none rounded-md border border-red-200 bg-background p-2 text-xs outline-none focus:border-red-400 dark:border-red-800"
                  />
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px]">
                    <input
                      type="date"
                      value={correctionDueDate}
                      onChange={(event) => setCorrectionDueDate(event.target.value)}
                      className="h-9 rounded-md border border-red-200 bg-background px-2 text-xs outline-none focus:border-red-400 dark:border-red-800"
                    />
                    <input
                      type="number"
                      min={0}
                      value={correctionEstimate}
                      onChange={(event) => setCorrectionEstimate(Number.parseInt(event.target.value, 10) || 0)}
                      className="h-9 rounded-md border border-red-200 bg-background px-2 text-xs outline-none focus:border-red-400 dark:border-red-800"
                      title="Szacowany czas poprawki w minutach"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const text = correctionDescription.trim()
                      if (!text) return
                      addComment(
                        task.id,
                        authorId,
                        authorName,
                        `Poprawka: ${correctionReason}. Termin: ${correctionDueDate}. Szacowany czas: ${correctionEstimate} min. ${text}`
                      )
                      setCorrectionDescription('')
                    }}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    <AlertTriangle size={14} />
                    Zglos poprawke
                  </button>
                </div>
              </div>
              {task.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`rounded-md border p-3 ${
                    comment.pinned
                      ? 'madi-pinned-note border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-400/45 dark:bg-amber-950/35 dark:text-amber-100'
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="min-w-0 truncate font-medium text-foreground">{comment.authorName}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span>{new Date(comment.createdAt).toLocaleString('pl-PL')}</span>
                      <button
                        onClick={() => togglePinnedComment(task.id, comment.id)}
                        className={`flex h-7 w-7 items-center justify-center rounded ${
                          comment.pinned ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200' : 'hover:bg-muted hover:text-primary'
                        }`}
                        title={comment.pinned ? 'Odepnij uwage' : 'Przypnij jako pulsujaca uwage'}
                      >
                        {comment.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                      </button>
                      <button
                        onClick={() => startCommentEdit(comment.id, comment.content)}
                        className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted hover:text-primary"
                        title="Edytuj komentarz"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          deleteComment(task.id, comment.id)
                          if (editingCommentId === comment.id) cancelCommentEdit()
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive"
                        title="Usun komentarz"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingCommentContent}
                        onChange={(event) => setEditingCommentContent(event.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={saveCommentEdit}
                          className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Zapisz
                        </button>
                        <button
                          onClick={cancelCommentEdit}
                          className="h-8 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">{comment.content}</p>
                      {comment.updatedAt && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Edytowano {new Date(comment.updatedAt).toLocaleString('pl-PL')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
              <textarea
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder="Dodaj komentarz..."
                rows={3}
                className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => {
                  addComment(task.id, authorId, authorName, newComment)
                  setNewComment('')
                }}
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Send size={14} />
                Dodaj komentarz
              </button>
            </div>
          </DetailSection>
        </div>
      </div>
    </aside>
  )
}

function WorkspaceSummary({ tasks, selectionMode }: { tasks: GridTask[]; selectionMode: boolean }) {
  const selected = tasks.filter((task) => task.selected).length
  const inProgress = tasks.filter((task) => task.status === 'in_progress' || task.status === 'production').length
  const blocked = tasks.filter((task) => task.status === 'blocked').length
  const done = tasks.filter((task) => task.status === 'done').length
  const urgent = tasks.filter((task) => task.priority === 'urgent').length
  const showProgressSignal = !selectionMode && inProgress > 0
  const showUrgentSignal = urgent > 0

  return (
    <div className="grid grid-cols-2 gap-2 border-b border-border bg-muted/20 px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)] xl:grid-cols-4">
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <p className="text-[11px] text-muted-foreground">Widoczne</p>
        <p className="text-[clamp(15px,0.9vw,18px)] font-semibold">{tasks.length}</p>
      </div>
      <div
        className={`relative overflow-hidden rounded-md border px-3 py-2 transition-colors ${
          showProgressSignal
            ? 'border-emerald-400/55 bg-emerald-500/10 shadow-[inset_0_0_0_1px_rgba(64,192,87,0.08)]'
            : 'border-border bg-background'
        }`}
      >
        {showProgressSignal && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-emerald-500" />}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">{selectionMode ? 'Zaznaczone' : 'W toku'}</p>
          {showProgressSignal && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <Clock3 size={12} />
            </span>
          )}
        </div>
        <p
          className={`flex items-center text-[clamp(15px,0.9vw,18px)] font-semibold ${
            showProgressSignal ? 'text-emerald-700 dark:text-emerald-300' : ''
          }`}
        >
          {showProgressSignal && <span className="madi-status-dot mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          {selectionMode ? selected : inProgress}
        </p>
      </div>
      <div
        className={`relative overflow-hidden rounded-md border px-3 py-2 transition-colors ${
          showUrgentSignal
            ? 'border-red-400/60 bg-red-500/10 shadow-[inset_0_0_0_1px_rgba(224,49,49,0.08)]'
            : 'border-border bg-background'
        }`}
      >
        {showUrgentSignal && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-red-500" />}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">Pilne</p>
          {showUrgentSignal && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/15 text-red-700 dark:text-red-300">
              <RadioTower size={12} />
            </span>
          )}
        </div>
        <p
          className={`flex items-center text-[clamp(15px,0.9vw,18px)] font-semibold ${
            showUrgentSignal ? 'text-red-700 dark:text-red-300' : 'text-[#e03131]'
          }`}
        >
          {showUrgentSignal && <span className="madi-status-dot mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
          {urgent}
        </p>
      </div>
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <p className="text-[11px] text-muted-foreground">Blokady / gotowe</p>
        <p className="text-[clamp(15px,0.9vw,18px)] font-semibold">{blocked} / {done}</p>
      </div>
    </div>
  )
}

function applyScope(tasks: GridTask[], scope?: GridScope) {
  if (!scope) return tasks
  return tasks.filter((task) => {
    if (scope.spaceIds?.length && !scope.spaceIds.includes(task.spaceId)) return false
    if (scope.listIds?.length && !scope.listIds.includes(task.listId)) return false
    if (scope.statuses?.length && !scope.statuses.includes(task.status)) return false
    if (scope.workTypes?.length && !scope.workTypes.includes(task.workType)) return false
    if (scope.priorities?.length && !scope.priorities.includes(task.priority)) return false
    return true
  })
}

function isGridView(value: unknown): value is GridView {
  return value === 'board' || value === 'list' || value === 'calendar'
}

export function MadiGridWorkspace({
  title = 'MADI GRID',
  kicker = 'Panel roboczy',
  description = 'Podglad listy, edycja w panelu lub oknie, kanban drag/drop, checklisty i komentarze',
  scope,
  preferredView,
  lockedView,
}: MadiGridWorkspaceProps) {
  const { currentView, setCurrentView, resetFilters, clearSelection, getFilteredTasks } = useGridStore()
  const { user } = useAuthStore()
  const { currentModule } = useAppStore()
  const [selectionMode, setSelectionMode] = useState(false)
  const userId = user?.id ?? 'guest'
  const prefs = useModulePrefs(userId, currentModule)
  const baseTasks = getFilteredTasks()
  const tasks = useMemo(() => applyScope(baseTasks, scope), [baseTasks, scope])
  const savedCurrentView = prefs.currentView

  useEffect(() => {
    resetFilters()
    setSelectionMode(false)
    clearSelection()
    if (lockedView) {
      setCurrentView(lockedView)
      return
    }
    if (isGridView(savedCurrentView)) {
      setCurrentView(savedCurrentView)
      return
    }
    if (preferredView) setCurrentView(preferredView)
  }, [title, preferredView, lockedView, savedCurrentView, resetFilters, setCurrentView, clearSelection])

  const handleSelectionModeChange = (enabled: boolean) => {
    setSelectionMode(enabled)
    if (!enabled) clearSelection()
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-border bg-background px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Tag size={13} />
                {kicker}
              </div>
              <h1 className="truncate text-[clamp(17px,1vw,20px)] font-semibold">{title}</h1>
            </div>
            <div className="hidden min-w-0 items-center gap-2 text-xs text-muted-foreground xl:flex">
              <Check size={14} className="text-primary" />
              <span className="truncate">{description}</span>
            </div>
          </div>
        </div>
        <WorkspaceToolbar selectionMode={selectionMode} onSelectionModeChange={handleSelectionModeChange} lockedView={lockedView} />
        {prefs.showSummary && <WorkspaceSummary tasks={tasks} selectionMode={selectionMode} />}
        <div className="min-h-0 flex-1 overflow-hidden">
          {currentView === 'board' && <BoardView tasks={tasks} selectionMode={selectionMode} />}
          {currentView === 'list' && <EditableListView tasks={tasks} selectionMode={selectionMode} />}
          {currentView === 'calendar' && <PlanningCalendarView tasks={tasks} />}
        </div>
      </main>
      <TaskDetailPanel />
    </div>
  )
}
