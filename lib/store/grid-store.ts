import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from '@/lib/store/auth-store'
import { useNotificationsStore } from '@/lib/store/notifications-store'
import type { OrderPriority } from '@/lib/types'

const MADI_GRID_GRAFIK_TASKS: Array<{
  id: string
  title: string
  queueLabel: string
  statusLabel: string
  priorityLabel: string
  assignee: string
  client: string
  orderNumber: string
  deadline: string
  isOverdue: boolean
}> = []

export type GridView = 'board' | 'list' | 'calendar'

export type GridStatusId =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'production'
  | 'blocked'
  | 'done'

export interface GridStatus {
  id: GridStatusId
  label: string
  color: string
  tone: string
}

export interface GridSpace {
  id: string
  name: string
  color: string
}

export interface GridList {
  id: string
  spaceId: string
  name: string
  description?: string
}

export interface GridChecklistItem {
  id: string
  label: string
  done: boolean
  estimateMinutes?: number
  trackedMinutes?: number
  assigneeIds?: string[]
  rcpEvents?: GridRcpEvent[]
}

export interface GridComment {
  id: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
  updatedAt?: string
  pinned?: boolean
}

export type GridRcpMode = 'manual' | 'scanner' | 'card' | 'beacon'
export type GridRcpEventType = 'start' | 'pause' | 'stop' | 'finish' | 'manual'
export type GridTaskTimeMode = 'task' | 'activity'

export interface GridRcpEvent {
  id: string
  type: GridRcpEventType
  mode: GridRcpMode
  userId: string
  userName: string
  code?: string
  minutesDelta: number
  createdAt: string
}

export interface GridTask {
  id: string
  title: string
  description: string
  spaceId: string
  listId: string
  status: GridStatusId
  priority: OrderPriority
  assigneeIds: string[]
  customerName: string
  orderNumber: string
  workType: string
  startDate: string
  dueDate: string
  estimateMinutes: number
  trackedMinutes: number
  tags: string[]
  filesPath: string
  position: number
  createdAt: string
  updatedAt: string
  checklist: GridChecklistItem[]
  comments: GridComment[]
  rcpEvents?: GridRcpEvent[]
  timeMode?: GridTaskTimeMode
  selected: boolean
}

export const GRID_STATUSES: GridStatus[] = [
  { id: 'backlog', label: 'Inbox', color: '#868e96', tone: 'bg-[#f1f3f5] text-[#495057] dark:bg-[#343a40] dark:text-[#ced4da]' },
  { id: 'todo', label: 'Do zrobienia', color: '#339af0', tone: 'bg-[#e7f5ff] text-[#1864ab] dark:bg-[#1d3557] dark:text-[#a5d8ff]' },
  { id: 'in_progress', label: 'W toku', color: '#40c057', tone: 'bg-[#d3f9d8] text-[#2f9e44] dark:bg-[#14532d] dark:text-[#b2f2bb]' },
  { id: 'review', label: 'Do sprawdzenia', color: '#f59f00', tone: 'bg-[#fff3bf] text-[#e67700] dark:bg-[#78350f] dark:text-[#ffd43b]' },
  { id: 'production', label: 'Produkcja', color: '#7950f2', tone: 'bg-[#e5dbff] text-[#6741d9] dark:bg-[#3b1f73] dark:text-[#d0bfff]' },
  { id: 'blocked', label: 'Blokada', color: '#e03131', tone: 'bg-[#ffe3e3] text-[#c92a2a] dark:bg-[#7f1d1d] dark:text-[#ffc9c9]' },
  { id: 'done', label: 'Gotowe', color: '#2b8a3e', tone: 'bg-[#b2f2bb] text-[#2b8a3e] dark:bg-[#166534] dark:text-[#b2f2bb]' },
]

export const GRID_SPACES: GridSpace[] = [
  { id: 'office', name: 'Glowny (MADI GRID)', color: '#339af0' },
  { id: 'graphic', name: 'Grafik', color: '#7950f2' },
  { id: 'production', name: 'Produkcja', color: '#40c057' },
]

export const GRID_LISTS: GridList[] = [
  { id: 'pg-dtp', spaceId: 'graphic', name: 'PG/DTP', description: 'Prace graficzne, korekty i przygotowanie plikow.' },
  { id: 'transport', spaceId: 'office', name: 'Transporty', description: 'Odbiory, wysylki i koordynacja dostaw.' },
  { id: 'invoices', spaceId: 'office', name: 'Faktury PG/subskrypcje', description: 'Rozliczenia i cykliczne oplaty.' },
  { id: 'office-tasks', spaceId: 'office', name: 'Zadania', description: 'Zadania administracyjne i firmowe.' },
  { id: 'intro', spaceId: 'production', name: 'Intro', description: 'Introligatornia i wykonczenie.' },
  { id: 'print', spaceId: 'production', name: 'Druk', description: 'Druk cyfrowy, offset i wielki format.' },
]

const HIDDEN_LIST_IDS = new Set(['marketing-general', 'content', 'promo'])

const today = new Date('2026-07-10T09:00:00')
const day = 24 * 60 * 60 * 1000

const isoDate = (offset: number) => new Date(today.getTime() + offset * day).toISOString().slice(0, 10)

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const statusLabel = (status: GridStatusId) => GRID_STATUSES.find((item) => item.id === status)?.label ?? status
const listLabel = (listId: string) => GRID_LISTS.find((item) => item.id === listId)?.name ?? listId

const getNotificationActor = () => {
  const user = useAuthStore.getState().user
  return {
    actorName: user?.name ?? 'MADI GRID',
    actorInitials: user?.initials ?? 'MF',
    actorColor: user?.avatarColor ?? '#339af0',
  }
}

const prioritySeverity = (priority: OrderPriority) => (priority === 'urgent' ? 'critical' : priority === 'high' ? 'important' : 'info')

const notifyTaskChange = (
  task: GridTask,
  input: {
    kind:
      | 'order_created'
      | 'order_updated'
      | 'status_changed'
      | 'assignee_changed'
      | 'deadline_changed'
      | 'comment_added'
      | 'rcp_started'
      | 'rcp_paused'
      | 'rcp_stopped'
      | 'rcp_finished'
      | 'blocking_alert'
    channel: 'orders' | 'rcp' | 'alerts' | 'comments' | 'deadlines'
    title: string
    body: string
    operation?: string
    status?: GridStatusId
    durationLabel?: string
  }
) => {
  useNotificationsStore.getState().addNotification({
    ...getNotificationActor(),
    channel: input.channel,
    kind: input.kind,
    severity: input.kind === 'blocking_alert' || input.status === 'blocked' ? 'critical' : prioritySeverity(task.priority),
    title: input.title,
    body: input.body,
    orderId: task.id,
    orderNumber: task.orderNumber || task.id,
    customerName: task.customerName,
    product: task.title,
    operation: input.operation ?? task.workType,
    statusLabel: input.status ? statusLabel(input.status) : statusLabel(task.status),
    durationLabel: input.durationLabel,
  })
}

const notifyTaskPatch = (before: GridTask, after: GridTask, patch: Partial<GridTask>) => {
  if (patch.status && before.status !== after.status) {
    notifyTaskChange(after, {
      channel: after.status === 'blocked' ? 'alerts' : 'orders',
      kind: after.status === 'blocked' ? 'blocking_alert' : 'status_changed',
      status: after.status,
      title: after.status === 'blocked' ? 'Zlecenie zablokowane' : 'Status zlecenia zmieniony',
      body: `${statusLabel(before.status)} -> ${statusLabel(after.status)}`,
    })
    return
  }

  if (patch.listId && before.listId !== after.listId) {
    notifyTaskChange(after, {
      channel: 'orders',
      kind: 'order_updated',
      title: 'Zlecenie przeniesione',
      body: `${listLabel(before.listId)} -> ${listLabel(after.listId)}`,
      operation: listLabel(after.listId),
    })
    return
  }

  if (patch.dueDate && before.dueDate !== after.dueDate) {
    notifyTaskChange(after, {
      channel: 'deadlines',
      kind: 'deadline_changed',
      title: 'Termin zlecenia zmieniony',
      body: `${before.dueDate || 'brak'} -> ${after.dueDate || 'brak'}`,
    })
    return
  }

  if (patch.assigneeIds && before.assigneeIds.join(',') !== after.assigneeIds.join(',')) {
    notifyTaskChange(after, {
      channel: 'orders',
      kind: 'assignee_changed',
      title: 'Zmieniono osoby przy zleceniu',
      body: `${after.assigneeIds.length} przypisanych osob`,
    })
  }
}

const rcpTypeLabel: Record<GridRcpEventType, string> = {
  start: 'start',
  pause: 'pauza',
  stop: 'stop',
  finish: 'zakonczenie',
  manual: 'wpis reczny',
}

const rcpKind: Record<GridRcpEventType, 'rcp_started' | 'rcp_paused' | 'rcp_stopped' | 'rcp_finished'> = {
  start: 'rcp_started',
  pause: 'rcp_paused',
  stop: 'rcp_stopped',
  finish: 'rcp_finished',
  manual: 'rcp_stopped',
}

const minutesLabel = (minutes: number) => {
  const safe = Math.max(0, minutes)
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  return `${hours.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}:00`
}

const gridExportStatus = (status: string): GridStatusId => {
  const normalized = status.toLowerCase()
  if (normalized.includes('akcept')) return 'review'
  if (normalized.includes('gotowe')) return 'done'
  if (normalized.includes('anul')) return 'blocked'
  if (normalized.includes('czeka')) return 'todo'
  return 'todo'
}

const gridExportPriority = (priority: string, overdue: boolean): OrderPriority => {
  const normalized = priority.toLowerCase()
  if (overdue) return 'urgent'
  if (normalized.includes('pil')) return 'urgent'
  if (normalized.includes('wys')) return 'high'
  if (normalized.includes('nis')) return 'low'
  return 'medium'
}

const gridExportWorkType = (queueLabel: string) => {
  const normalized = queueLabel.toLowerCase()
  if (normalized.includes('projekt')) return 'Projekt graficzny'
  return 'Prepress'
}

const gridExportDueDate = (deadline: string) => deadline.slice(0, 10)

const importedGrafikTasks: GridTask[] = MADI_GRID_GRAFIK_TASKS.map((task, index) => {
  const dueDate = gridExportDueDate(task.deadline)
  const status = gridExportStatus(task.statusLabel)
  const workType = gridExportWorkType(task.queueLabel)

  return {
    id: `madi-grid-${task.id}`,
    title: task.title,
    description: `Import z Madi Grid: ${task.queueLabel}. Status w eksporcie: ${task.statusLabel}. Operator: ${task.assignee}.`,
    spaceId: 'office',
    listId: 'pg-dtp',
    status,
    priority: gridExportPriority(task.priorityLabel, task.isOverdue),
    assigneeIds: ['3'],
    customerName: task.client,
    orderNumber: task.orderNumber,
    workType,
    startDate: dueDate,
    dueDate,
    estimateMinutes: workType === 'Projekt graficzny' ? 90 : 45,
    trackedMinutes: status === 'review' ? 15 : 0,
    tags: ['madi-grid-export', task.queueLabel, task.statusLabel].filter(Boolean),
    filesPath: `X:\\!DEMO_ZLECENIA\\${task.orderNumber.replaceAll('/', '\\')}`,
    position: 1000 + index * 10,
    createdAt: new Date(`${dueDate}T08:00:00`).toISOString(),
    updatedAt: new Date(`${dueDate}T12:00:00`).toISOString(),
    checklist: [
      { id: `mg-chk-${index}-1`, label: 'Zweryfikuj pliki i komplet informacji', done: status === 'review' || status === 'done' },
      { id: `mg-chk-${index}-2`, label: 'Przygotuj podglad do akceptacji', done: status === 'review' || status === 'done' },
      { id: `mg-chk-${index}-3`, label: 'Przekaz do kolejnego etapu', done: status === 'done' },
    ],
    comments: [
      {
        id: `mg-com-${index}`,
        authorId: 'system',
        authorName: 'Import Madi Grid',
        content: `Zrodlo: ${task.statusLabel}, termin ${task.deadline}.`,
        createdAt: new Date(`${dueDate}T12:00:00`).toISOString(),
      },
    ],
    timeMode: 'task',
    selected: false,
  }
})

const sampleTasks: GridTask[] = [
  {
    id: 'task-001',
    title: 'Katalog produktowy 2026 - preflight i akceptacja',
    description: 'Sprawdzic spady, fonty, overprint, WHITE i przygotowac finalny PDF do akceptacji klienta.',
    spaceId: 'production',
    listId: 'print',
    status: 'in_progress',
    priority: 'urgent',
    assigneeIds: ['3', '6'],
    customerName: 'Fikcyjna Marka Reklamowa S.A.',
    orderNumber: 'ZL-2026-0141',
    workType: 'Prepress',
    startDate: isoDate(0),
    dueDate: isoDate(0),
    estimateMinutes: 180,
    trackedMinutes: 95,
    tags: ['preflight', 'katalog', 'pilne'],
    filesPath: '\\\\serwer\\zlecenia\\2026\\0141\\prepress',
    position: 10,
    createdAt: new Date(today.getTime() - day).toISOString(),
    updatedAt: new Date(today.getTime()).toISOString(),
    checklist: [
      { id: 'chk-001', label: 'Spady 3 mm', done: true },
      { id: 'chk-002', label: 'Separacja WHITE', done: false },
      { id: 'chk-003', label: 'PDF do akceptacji', done: false },
    ],
    comments: [
      { id: 'com-001', authorId: '8', authorName: 'Handlowiec Demo', content: 'Klient prosi o dodatkowy lakier na okladce.', createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString() },
    ],
    timeMode: 'task',
    selected: false,
  },
  {
    id: 'task-002',
    title: 'Ulotki A5 - Promocja letnia',
    description: 'Projekt i przygotowanie do druku dwustronnych ulotek A5.',
    spaceId: 'office',
    listId: 'pg-dtp',
    status: 'todo',
    priority: 'high',
    assigneeIds: ['3'],
    customerName: 'Demo Print Lab Sp. z o.o.',
    orderNumber: 'ZL-2026-0142',
    workType: 'Projekt graficzny',
    startDate: isoDate(0),
    dueDate: isoDate(1),
    estimateMinutes: 120,
    trackedMinutes: 0,
    tags: ['ulotki', 'dtp'],
    filesPath: '\\\\serwer\\zlecenia\\2026\\0142\\projekt',
    position: 20,
    createdAt: new Date(today.getTime() - 3 * day).toISOString(),
    updatedAt: new Date(today.getTime() - day).toISOString(),
    checklist: [
      { id: 'chk-004', label: 'Wariant kolorystyczny', done: false },
      { id: 'chk-005', label: 'Akceptacja handlowca', done: false },
    ],
    comments: [],
    timeMode: 'task',
    selected: false,
  },
  {
    id: 'task-003',
    title: 'Roll-up Targi - brakuje logo wektorowego',
    description: 'Zadanie blokuje produkcje. Trzeba wyegzekwowac logo w krzywych od klienta.',
    spaceId: 'production',
    listId: 'print',
    status: 'blocked',
    priority: 'urgent',
    assigneeIds: ['2'],
    customerName: 'Mockup Events Polska Sp. z o.o.',
    orderNumber: 'ZL-2026-0139',
    workType: 'Pliki',
    startDate: isoDate(-1),
    dueDate: isoDate(1),
    estimateMinutes: 45,
    trackedMinutes: 10,
    tags: ['blokada', 'logo', 'wielki format'],
    filesPath: '\\\\serwer\\zlecenia\\2026\\0139\\pliki',
    position: 30,
    createdAt: new Date(today.getTime() - 2 * day).toISOString(),
    updatedAt: new Date(today.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    checklist: [
      { id: 'chk-006', label: 'Mail do klienta', done: true },
      { id: 'chk-007', label: 'Podmiana pliku', done: false },
    ],
    comments: [
      { id: 'com-002', authorId: '2', authorName: 'Konstruktor Demo', content: 'Bitmapa ma za niska rozdzielczosc, potrzebny wektor.', createdAt: new Date(today.getTime() - day).toISOString(), pinned: true },
    ],
    timeMode: 'task',
    selected: false,
  },
  {
    id: 'task-005',
    title: 'Teczki ofertowe - hot stamping',
    description: 'Ustalic pozycje tloczenia i przygotowac plik technologiczny HS.',
    spaceId: 'production',
    listId: 'intro',
    status: 'production',
    priority: 'high',
    assigneeIds: ['6', '4'],
    customerName: 'Finanse Testowe S.A.',
    orderNumber: 'ZL-2026-0136',
    workType: 'Introligatornia',
    startDate: isoDate(1),
    dueDate: isoDate(4),
    estimateMinutes: 150,
    trackedMinutes: 35,
    tags: ['hot stamping', 'teczki'],
    filesPath: '\\\\serwer\\zlecenia\\2026\\0136\\dtp',
    position: 50,
    createdAt: new Date(today.getTime() - 5 * day).toISOString(),
    updatedAt: new Date(today.getTime() - day).toISOString(),
    checklist: [
      { id: 'chk-010', label: 'Matryca HS', done: true, estimateMinutes: 45, trackedMinutes: 25, assigneeIds: ['6'] },
      { id: 'chk-011', label: 'Proba pozycji', done: false, estimateMinutes: 40, trackedMinutes: 10, assigneeIds: ['4'] },
      { id: 'chk-012', label: 'Pakowanie i kontrola kompletu', done: false, estimateMinutes: 35, trackedMinutes: 0, assigneeIds: ['4'] },
    ],
    comments: [],
    timeMode: 'activity',
    selected: false,
  },
  ...importedGrafikTasks,
]

const templateTasks = sampleTasks.filter((task) =>
  ['task-001', 'task-002', 'task-003', 'task-005'].includes(task.id)
)

interface GridFilters {
  query: string
  spaceId: string
  listId: string
  assigneeId: string
  priority: string
  onlySelected: boolean
}

interface GridState {
  tasks: GridTask[]
  spaces: GridSpace[]
  lists: GridList[]
  statuses: GridStatus[]
  currentView: GridView
  activeTaskId: string | null
  filters: GridFilters

  setCurrentView: (view: GridView) => void
  setActiveTask: (taskId: string | null) => void
  setFilter: <K extends keyof GridFilters>(key: K, value: GridFilters[K]) => void
  resetFilters: () => void
  createTask: (input?: Partial<GridTask>) => string
  updateTask: (taskId: string, patch: Partial<GridTask>) => void
  deleteTask: (taskId: string) => void
  duplicateTask: (taskId: string) => void
  toggleTaskSelection: (taskId: string) => void
  selectAllFiltered: () => void
  clearSelection: () => void
  bulkUpdateStatus: (status: GridStatusId) => void
  bulkMoveToList: (listId: string) => void
  bulkDelete: () => void
  moveTask: (taskId: string, target: { status?: GridStatusId; listId?: string; beforeTaskId?: string | null }) => void
  moveTaskToStatus: (taskId: string, status: GridStatusId) => void
  moveTaskToList: (taskId: string, listId: string) => void
  nudgeTask: (taskId: string, direction: -1 | 1) => void
  createList: (spaceId: string, name: string) => void
  updateList: (listId: string, patch: Partial<GridList>) => void
  deleteList: (listId: string) => void
  addChecklistItem: (taskId: string, label: string) => void
  updateChecklistItem: (taskId: string, itemId: string, patch: Partial<GridChecklistItem>) => void
  deleteChecklistItem: (taskId: string, itemId: string) => void
  addComment: (taskId: string, authorId: string, authorName: string, content: string) => void
  updateComment: (taskId: string, commentId: string, content: string) => void
  deleteComment: (taskId: string, commentId: string) => void
  togglePinnedComment: (taskId: string, commentId: string) => void
  addRcpEvent: (
    taskId: string,
    input: {
      type: GridRcpEventType
      mode: GridRcpMode
      userId: string
      userName: string
      code?: string
      minutesDelta?: number
    }
  ) => void
  addActivityRcpEvent: (
    taskId: string,
    itemId: string,
    input: {
      type: GridRcpEventType
      mode: GridRcpMode
      userId: string
      userName: string
      code?: string
      minutesDelta?: number
    }
  ) => void
  getFilteredTasks: () => GridTask[]
  getActiveTask: () => GridTask | undefined
  getSelectedTasks: () => GridTask[]
}

const defaultFilters: GridFilters = {
  query: '',
  spaceId: 'all',
  listId: 'all',
  assigneeId: 'all',
  priority: 'all',
  onlySelected: false,
}

const listSpace = (lists: GridList[], listId: string) => lists.find((list) => list.id === listId)?.spaceId ?? 'office'

export const inferGridTaskTimeMode = (listId: string, workType = ''): GridTaskTimeMode => {
  const normalized = workType.toLowerCase()
  if (
    normalized.includes('zlecenie') ||
    normalized.includes('druk') ||
    normalized.includes('intro') ||
    normalized.includes('introligator') ||
    normalized.includes('produkc')
  ) {
    return 'activity'
  }
  if (
    listId === 'pg-dtp' ||
    listId === 'content' ||
    listId === 'promo' ||
    normalized.includes('graf') ||
    normalized.includes('prepress') ||
    normalized.includes('projekt') ||
    normalized.includes('plik') ||
    normalized.includes('content') ||
    normalized.includes('social')
  ) {
    return 'task'
  }
  return 'activity'
}

const normalizeTaskPatch = (lists: GridList[], patch: Partial<GridTask>) => {
  if (!patch.listId) return patch
  return { ...patch, spaceId: listSpace(lists, patch.listId) }
}

const nextPosition = (tasks: GridTask[], listId: string, status: GridStatusId) => {
  const positions = tasks
    .filter((task) => task.listId === listId && task.status === status)
    .map((task) => task.position)
  return positions.length ? Math.max(...positions) + 10 : 10
}

export const useGridStore = create<GridState>()(
  persist(
    (set, get) => ({
      tasks: templateTasks,
      spaces: GRID_SPACES,
      lists: GRID_LISTS,
      statuses: GRID_STATUSES,
      currentView: 'board',
      activeTaskId: templateTasks[0]?.id ?? null,
      filters: defaultFilters,

      setCurrentView: (view) => set({ currentView: view }),
      setActiveTask: (taskId) => set({ activeTaskId: taskId }),
      setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
      resetFilters: () => set({ filters: defaultFilters }),

      createTask: (input = {}) => {
        const now = new Date().toISOString()
        const activeListId = get().filters.listId !== 'all' ? get().filters.listId : 'pg-dtp'
        const listId = input.listId ?? activeListId
        const safeListId = listId === 'all' ? 'pg-dtp' : listId
        const status = input.status ?? 'todo'
        const id = createId('task')
        const workType = input.workType ?? 'Zadanie'
        const timeMode = input.timeMode ?? inferGridTaskTimeMode(safeListId, workType)
        const task: GridTask = {
          id,
          title: input.title?.trim() || 'Nowe zadanie',
          description: input.description ?? '',
          listId: safeListId,
          spaceId: listSpace(get().lists, safeListId),
          status,
          priority: input.priority ?? 'medium',
          assigneeIds: input.assigneeIds ?? [],
          customerName: input.customerName ?? '',
          orderNumber: input.orderNumber ?? '',
          workType,
          startDate: input.startDate ?? new Date().toISOString().slice(0, 10),
          dueDate: input.dueDate ?? new Date(Date.now() + day).toISOString().slice(0, 10),
          estimateMinutes: input.estimateMinutes ?? 60,
          trackedMinutes: input.trackedMinutes ?? 0,
          tags: input.tags ?? [],
          filesPath: input.filesPath ?? '',
          position: nextPosition(get().tasks, safeListId, status),
          createdAt: now,
          updatedAt: now,
          checklist: input.checklist ?? [],
          comments: input.comments ?? [],
          rcpEvents: input.rcpEvents ?? [],
          timeMode,
          selected: false,
        }
        set((state) => ({ tasks: [...state.tasks, task], activeTaskId: id }))
        notifyTaskChange(task, {
          channel: 'orders',
          kind: 'order_created',
          title: 'Nowe zlecenie',
          body: task.title,
          status,
        })
        return id
      },

      updateTask: (taskId, patch) => {
        const before = get().tasks.find((task) => task.id === taskId)
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, ...normalizeTaskPatch(state.lists, patch), updatedAt: new Date().toISOString() }
              : task
          ),
        }))
        const after = get().tasks.find((task) => task.id === taskId)
        if (before && after) notifyTaskPatch(before, after, patch)
      },

      deleteTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
          activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
        })),

      duplicateTask: (taskId) => {
        const source = get().tasks.find((task) => task.id === taskId)
        if (!source) return
        const now = new Date().toISOString()
        const copy: GridTask = {
          ...source,
          id: createId('task'),
          title: `${source.title} - kopia`,
          selected: false,
          position: nextPosition(get().tasks, source.listId, source.status),
          createdAt: now,
          updatedAt: now,
          checklist: source.checklist.map((item) => ({
            ...item,
            id: createId('chk'),
            rcpEvents: item.rcpEvents?.map((event) => ({ ...event, id: createId('rcp') })) ?? [],
          })),
          comments: [],
          rcpEvents: source.rcpEvents?.map((event) => ({ ...event, id: createId('rcp') })) ?? [],
        }
        set((state) => ({ tasks: [...state.tasks, copy], activeTaskId: copy.id }))
      },

      toggleTaskSelection: (taskId) =>
        set((state) => ({
          tasks: state.tasks.map((task) => task.id === taskId ? { ...task, selected: !task.selected } : task),
        })),

      selectAllFiltered: () => {
        const ids = new Set(get().getFilteredTasks().map((task) => task.id))
        set((state) => ({ tasks: state.tasks.map((task) => ids.has(task.id) ? { ...task, selected: true } : task) }))
      },

      clearSelection: () => set((state) => ({ tasks: state.tasks.map((task) => ({ ...task, selected: false })) })),

      bulkUpdateStatus: (status) => {
        const selected = get().tasks.filter((task) => task.selected && task.status !== status)
        set((state) => ({
          tasks: state.tasks.map((task) => task.selected ? { ...task, status, updatedAt: new Date().toISOString() } : task),
        }))
        selected.forEach((task) => {
          const after = get().tasks.find((item) => item.id === task.id)
          if (after) notifyTaskPatch(task, after, { status })
        })
      },

      bulkMoveToList: (listId) => {
        const selected = get().tasks.filter((task) => task.selected && task.listId !== listId)
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.selected
              ? { ...task, listId, spaceId: listSpace(state.lists, listId), updatedAt: new Date().toISOString() }
              : task
          ),
        }))
        selected.forEach((task) => {
          const after = get().tasks.find((item) => item.id === task.id)
          if (after) notifyTaskPatch(task, after, { listId })
        })
      },

      bulkDelete: () =>
        set((state) => ({
          tasks: state.tasks.filter((task) => !task.selected),
          activeTaskId: state.activeTaskId && state.tasks.find((task) => task.id === state.activeTaskId)?.selected
            ? null
            : state.activeTaskId,
        })),

      moveTask: (taskId, target) => {
        const before = get().tasks.find((task) => task.id === taskId)
        set((state) => {
          const task = state.tasks.find((item) => item.id === taskId)
          if (!task) return state

          const status = target.status ?? task.status
          const listId = target.listId ?? task.listId
          const spaceId = listSpace(state.lists, listId)
          const peers = state.tasks
            .filter((item) => item.id !== taskId && item.status === status && item.listId === listId)
            .sort((a, b) => a.position - b.position)

          const foundIndex = target.beforeTaskId ? peers.findIndex((item) => item.id === target.beforeTaskId) : -1
          const targetIndex = foundIndex >= 0 ? foundIndex : peers.length

          const ordered = [...peers]
          ordered.splice(targetIndex, 0, {
            ...task,
            status,
            listId,
            spaceId,
          })
          const positionById = new Map(ordered.map((item, index) => [item.id, (index + 1) * 10]))
          const now = new Date().toISOString()

          return {
            tasks: state.tasks.map((item) => {
              if (!positionById.has(item.id)) return item
              if (item.id === taskId) {
                return {
                  ...item,
                  status,
                  listId,
                  spaceId,
                  position: positionById.get(item.id) ?? item.position,
                  updatedAt: now,
                }
              }
              return { ...item, position: positionById.get(item.id) ?? item.position, updatedAt: now }
            }),
          }
        })
        const after = get().tasks.find((task) => task.id === taskId)
        if (before && after && (before.status !== after.status || before.listId !== after.listId)) {
          notifyTaskPatch(before, after, {
            status: before.status !== after.status ? after.status : undefined,
            listId: before.listId !== after.listId ? after.listId : undefined,
          })
        }
      },

      moveTaskToStatus: (taskId, status) => get().moveTask(taskId, { status }),

      moveTaskToList: (taskId, listId) =>
        get().moveTask(taskId, { listId }),

      nudgeTask: (taskId, direction) =>
        set((state) => {
          const task = state.tasks.find((item) => item.id === taskId)
          if (!task) return state
          const peers = state.tasks
            .filter((item) => item.listId === task.listId && item.status === task.status)
            .sort((a, b) => a.position - b.position)
          const index = peers.findIndex((item) => item.id === taskId)
          const target = peers[index + direction]
          if (!target) return state
          return {
            tasks: state.tasks.map((item) => {
              if (item.id === task.id) return { ...item, position: target.position, updatedAt: new Date().toISOString() }
              if (item.id === target.id) return { ...item, position: task.position, updatedAt: new Date().toISOString() }
              return item
            }),
          }
        }),

      createList: (spaceId, name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((state) => ({
          lists: [...state.lists, { id: createId('list'), spaceId, name: trimmed }],
        }))
      },

      updateList: (listId, patch) =>
        set((state) => ({
          lists: state.lists.map((list) => list.id === listId ? { ...list, ...patch } : list),
        })),

      deleteList: (listId) =>
        set((state) => ({
          lists: state.lists.filter((list) => list.id !== listId),
          tasks: state.tasks.filter((task) => task.listId !== listId),
        })),

      addChecklistItem: (taskId, label) => {
        const trimmed = label.trim()
        if (!trimmed) return
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  checklist: [
                    ...task.checklist,
                    {
                      id: createId('chk'),
                      label: trimmed,
                      done: false,
                      estimateMinutes: task.timeMode === 'activity' ? 30 : undefined,
                      trackedMinutes: 0,
                      assigneeIds: task.assigneeIds,
                      rcpEvents: [],
                    },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }))
      },

      updateChecklistItem: (taskId, itemId, patch) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  checklist: task.checklist.map((item) => item.id === itemId ? { ...item, ...patch } : item),
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        })),

      deleteChecklistItem: (taskId, itemId) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, checklist: task.checklist.filter((item) => item.id !== itemId), updatedAt: new Date().toISOString() }
              : task
          ),
        })),

      addComment: (taskId, authorId, authorName, content) => {
        const trimmed = content.trim()
        if (!trimmed) return
        const comment: GridComment = {
          id: createId('com'),
          authorId,
          authorName,
          content: trimmed,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, comments: [...task.comments, comment], updatedAt: new Date().toISOString() }
              : task
          ),
        }))
        const task = get().tasks.find((item) => item.id === taskId)
        if (task) {
          useNotificationsStore.getState().addNotification({
            channel: 'comments',
            kind: 'comment_added',
            severity: prioritySeverity(task.priority),
            title: 'Nowy komentarz',
            body: trimmed,
            actorName: authorName,
            actorInitials: authorName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            actorColor: '#339af0',
            orderId: task.id,
            orderNumber: task.orderNumber || task.id,
            customerName: task.customerName,
            product: task.title,
            operation: task.workType,
            statusLabel: statusLabel(task.status),
          })
        }
      },

      updateComment: (taskId, commentId, content) => {
        const trimmed = content.trim()
        if (!trimmed) return
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  comments: task.comments.map((comment) =>
                    comment.id === commentId
                      ? { ...comment, content: trimmed, updatedAt: new Date().toISOString() }
                      : comment
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }))
      },

      deleteComment: (taskId, commentId) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  comments: task.comments.filter((comment) => comment.id !== commentId),
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        })),

      togglePinnedComment: (taskId, commentId) =>
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task
            const commentToToggle = task.comments.find((comment) => comment.id === commentId)
            const shouldPin = !commentToToggle?.pinned
            return {
              ...task,
              comments: task.comments.map((comment) => ({
                ...comment,
                pinned: comment.id === commentId ? shouldPin : false,
              })),
              updatedAt: new Date().toISOString(),
            }
          }),
        })),

      addRcpEvent: (taskId, input) => {
        const minutesDelta = Math.max(0, input.minutesDelta ?? 0)
        const event: GridRcpEvent = {
          id: createId('rcp'),
          type: input.type,
          mode: input.mode,
          userId: input.userId,
          userName: input.userName,
          code: input.code?.trim() || undefined,
          minutesDelta,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  trackedMinutes: task.trackedMinutes + minutesDelta,
                  rcpEvents: [...(task.rcpEvents ?? []), event],
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }))
        const task = get().tasks.find((item) => item.id === taskId)
        if (task) {
          useNotificationsStore.getState().addNotification({
            channel: 'rcp',
            kind: rcpKind[input.type],
            severity: prioritySeverity(task.priority),
            title: `RCP: ${rcpTypeLabel[input.type]}`,
            body: `${input.userName} - ${task.workType}${minutesDelta ? `, czas ${minutesLabel(minutesDelta)}` : ''}.`,
            actorName: input.userName,
            actorInitials: input.userName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            actorColor: '#40c057',
            orderId: task.id,
            orderNumber: task.orderNumber || task.id,
            customerName: task.customerName,
            product: task.title,
            operation: task.workType,
            statusLabel: statusLabel(task.status),
            durationLabel: minutesDelta ? minutesLabel(minutesDelta) : undefined,
          })
        }
      },

      addActivityRcpEvent: (taskId, itemId, input) => {
        const minutesDelta = Math.max(0, input.minutesDelta ?? 0)
        const event: GridRcpEvent = {
          id: createId('rcp'),
          type: input.type,
          mode: input.mode,
          userId: input.userId,
          userName: input.userName,
          code: input.code?.trim() || undefined,
          minutesDelta,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  trackedMinutes: task.trackedMinutes + minutesDelta,
                  checklist: task.checklist.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          done: item.done || input.type === 'finish',
                          trackedMinutes: (item.trackedMinutes ?? 0) + minutesDelta,
                          rcpEvents: [...(item.rcpEvents ?? []), event],
                        }
                      : item
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }))
        const task = get().tasks.find((item) => item.id === taskId)
        const checklistItem = task?.checklist.find((item) => item.id === itemId)
        if (task && checklistItem) {
          useNotificationsStore.getState().addNotification({
            channel: 'rcp',
            kind: rcpKind[input.type],
            severity: prioritySeverity(task.priority),
            title: `RCP: ${rcpTypeLabel[input.type]} czynnosci`,
            body: `${input.userName} - ${checklistItem.label}${minutesDelta ? `, czas ${minutesLabel(minutesDelta)}` : ''}.`,
            actorName: input.userName,
            actorInitials: input.userName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            actorColor: '#40c057',
            orderId: task.id,
            orderNumber: task.orderNumber || task.id,
            customerName: task.customerName,
            product: task.title,
            operation: checklistItem.label,
            statusLabel: statusLabel(task.status),
            durationLabel: minutesDelta ? minutesLabel(minutesDelta) : undefined,
          })
        }
      },

      getFilteredTasks: () => {
        const { tasks, filters, lists } = get()
        const query = filters.query.trim().toLowerCase()
        return tasks
          .filter((task) => {
            const effectiveSpaceId = listSpace(lists, task.listId) || task.spaceId
            if (task.spaceId === 'marketing' || HIDDEN_LIST_IDS.has(task.listId)) return false
            if (filters.spaceId !== 'all' && effectiveSpaceId !== filters.spaceId) return false
            if (filters.listId !== 'all' && task.listId !== filters.listId) return false
            if (filters.assigneeId !== 'all' && !task.assigneeIds.includes(filters.assigneeId)) return false
            if (filters.priority !== 'all' && task.priority !== filters.priority) return false
            if (filters.onlySelected && !task.selected) return false
            if (!query) return true
            return [
              task.title,
              task.description,
              task.customerName,
              task.orderNumber,
              task.workType,
              task.tags.join(' '),
            ].some((value) => value.toLowerCase().includes(query))
          })
          .sort((a, b) => a.position - b.position)
      },

      getActiveTask: () => {
        const { activeTaskId, tasks } = get()
        return tasks.find((task) => task.id === activeTaskId)
      },

      getSelectedTasks: () => get().tasks.filter((task) => task.selected),
    }),
    {
      name: 'madi-grid-workspace-template-v2-sanitized',
      merge: (persisted, current) => {
        const saved = persisted as Partial<GridState> | undefined
        const savedTasks = Array.isArray(saved?.tasks) ? saved.tasks : current.tasks
        const savedTaskIds = new Set(savedTasks.map((task) => task.id))
        const mergedTasks = [
          ...savedTasks,
          ...templateTasks.filter((task) => !savedTaskIds.has(task.id)),
        ]
        const savedListIds = new Set((saved?.lists ?? []).map((list) => list.id))
        const mergedLists = [
          ...(saved?.lists ?? []),
          ...current.lists.filter((list) => !savedListIds.has(list.id)),
        ].filter((list) => list.spaceId !== 'marketing' && !HIDDEN_LIST_IDS.has(list.id))

        return {
          ...current,
          ...(saved ?? {}),
          tasks: mergedTasks,
          lists: mergedLists,
          spaces: current.spaces,
          statuses: current.statuses,
          activeTaskId: saved?.activeTaskId && mergedTasks.some((task) => task.id === saved.activeTaskId)
            ? saved.activeTaskId
            : mergedTasks[0]?.id ?? null,
        }
      },
    }
  )
)
