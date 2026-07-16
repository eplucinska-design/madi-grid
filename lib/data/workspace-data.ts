import type {
  WorkTask,
  WorkTaskStatus,
  DayPlanEntry,
  ActivityItem,
  OrderPriority,
} from '@/lib/types'
import { DEMO_USERS } from '@/lib/store/auth-store'

const MADI_GRID_GRAFIK_TASKS: Array<{
  id: string
  title: string
  orderNumber: string
  client: string
  queueLabel: string
  statusLabel: string
  priorityLabel: string
  deadline: string
  isOverdue: boolean
}> = []

const MADI_GRID_TIME_LOGS: Array<{
  user: string
  action: string
  orderNumber: string
  process: string
  notes?: string
}> = []

// Stable reference "now" captured at module load so relative deadlines don't drift between renders.
const NOW = new Date()
const h = (hours: number) => new Date(NOW.getTime() + hours * 60 * 60 * 1000)

export const WORK_TASK_STATUS_CONFIG: Record<
  WorkTaskStatus,
  { label: string; className: string }
> = {
  todo: { label: 'Do zrobienia', className: 'bg-[#f1f3f5] text-[#495057] dark:bg-[#343a40] dark:text-[#adb5bd]' },
  in_progress: { label: 'W toku', className: 'bg-[#d3f9d8] text-[#2f9e44] dark:bg-[#14532d] dark:text-[#86efac]' },
  review: { label: 'Do sprawdzenia', className: 'bg-[#fff9db] text-[#e67700] dark:bg-[#78350f] dark:text-[#fbbf24]' },
  blocked: { label: 'Blokada', className: 'bg-[#ffe3e3] text-[#c92a2a] dark:bg-[#7f1d1d] dark:text-[#fca5a5]' },
  done: { label: 'Gotowe', className: 'bg-[#b2f2bb] text-[#2b8a3e] dark:bg-[#166534] dark:text-[#86efac]' },
}

export const WORK_TYPE_CONFIG: Record<string, { color: string }> = {
  DTP: { color: '#20c997' },
  'Projekt graficzny': { color: '#f06595' },
  Prepress: { color: '#4dabf7' },
  Druk: { color: '#40c057' },
  Wykończenie: { color: '#0c8599' },
  Korekta: { color: '#f59f00' },
  Montaż: { color: '#7950f2' },
  'Social media': { color: '#339af0' },
}

interface TaskTemplate {
  key: string
  title: string
  orderId?: string
  orderNumber?: string
  customerName: string
  workType: string
  department: string
  status: WorkTaskStatus
  priority: OrderPriority
  deadlineOffsetH: number
  plannedMinutes: number
  workedMinutes: number
  filesPath: string
  requestedByEmail: string
  comment?: string
  isBlocking?: boolean
  isUrgent?: boolean
  slot?: string
  slotEnd?: string
  slotType?: DayPlanEntry['type']
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    key: 'active',
    title: 'Przygotowanie do druku – Katalog produktowy 2026',
    orderId: '2',
    orderNumber: 'ZL-2026-0141',
    customerName: 'Fikcyjna Marka Reklamowa S.A.',
    workType: 'Prepress',
    department: 'Druk cyfrowy',
    status: 'in_progress',
    priority: 'urgent',
    deadlineOffsetH: 6,
    plannedMinutes: 180,
    workedMinutes: 95,
    filesPath: '\\\\serwer\\zlecenia\\2026\\0141\\prepress',
    requestedByEmail: 'handlowiec@madiflow.pl',
    comment: 'Klient prosi o dodatkowy lakier na okładce.',
    slot: '09:00',
    slotEnd: '11:00',
    slotType: 'task',
  },
  {
    key: 'overdue-1',
    title: 'Korekta wizytówek – 5 wzorów',
    orderId: '3',
    orderNumber: 'ZL-2026-0140',
    customerName: 'Studio Klienta Testowego Sp. z o.o.',
    workType: 'Korekta',
    department: 'DTP',
    status: 'review',
    priority: 'high',
    deadlineOffsetH: -20,
    plannedMinutes: 60,
    workedMinutes: 20,
    filesPath: '\\\\serwer\\zlecenia\\2026\\0140\\dtp',
    requestedByEmail: 'admin@madiflow.pl',
    comment: 'Poprawić literówkę w adresie kancelarii.',
    isUrgent: true,
  },
  {
    key: 'blocking',
    title: 'Brakujące pliki produkcyjne – Roll-up Targi',
    orderId: '4',
    orderNumber: 'ZL-2026-0139',
    customerName: 'Mockup Events Polska Sp. z o.o.',
    workType: 'Prepress',
    department: 'Wielkoformatowy',
    status: 'blocked',
    priority: 'urgent',
    deadlineOffsetH: 26,
    plannedMinutes: 90,
    workedMinutes: 0,
    filesPath: '\\\\serwer\\zlecenia\\2026\\0139\\pliki',
    requestedByEmail: 'handlowiec@madiflow.pl',
    comment: 'Czekamy na logo w wektorze od klienta – blokuje druk.',
    isBlocking: true,
    isUrgent: true,
  },
  {
    key: 'queue-1',
    title: 'Projekt graficzny – Ulotki A5 Promocja letnia',
    orderId: '1',
    orderNumber: 'ZL-2026-0142',
    customerName: 'Demo Print Lab Sp. z o.o.',
    workType: 'Projekt graficzny',
    department: 'Druk offsetowy',
    status: 'todo',
    priority: 'high',
    deadlineOffsetH: 30,
    plannedMinutes: 120,
    workedMinutes: 0,
    filesPath: '\\\\serwer\\zlecenia\\2026\\0142\\projekt',
    requestedByEmail: 'admin@madiflow.pl',
    comment: 'Wykorzystać key visual z poprzedniej kampanii.',
    slot: '11:30',
    slotEnd: '13:30',
    slotType: 'task',
  },
  {
    key: 'queue-2',
    title: 'Hot stamping – makieta teczek ofertowych',
    orderId: '7',
    orderNumber: 'ZL-2026-0136',
    customerName: 'Finanse Testowe S.A.',
    workType: 'DTP',
    department: 'Introligatornia',
    status: 'todo',
    priority: 'medium',
    deadlineOffsetH: 70,
    plannedMinutes: 150,
    workedMinutes: 0,
    filesPath: '\\\\serwer\\zlecenia\\2026\\0136\\dtp',
    requestedByEmail: 'dtp@madiflow.pl',
    comment: 'Ustalić pozycję tłoczenia złota.',
    slot: '14:30',
    slotEnd: '16:30',
    slotType: 'task',
  },
  {
    key: 'micro',
    title: 'Mikro-poprawka – kolor tła plakatu koncertowego',
    orderId: '6',
    orderNumber: 'ZL-2026-0137',
    customerName: 'Kultura Demo Center',
    workType: 'Projekt graficzny',
    department: 'Druk cyfrowy',
    status: 'todo',
    priority: 'low',
    deadlineOffsetH: 48,
    plannedMinutes: 15,
    workedMinutes: 0,
    filesPath: '\\\\serwer\\zlecenia\\2026\\0137\\projekt',
    requestedByEmail: 'operator@madiflow.pl',
    comment: 'Przyciemnić tło o 10%.',
    slot: '16:30',
    slotEnd: '16:45',
    slotType: 'micro',
  },
  {
    key: 'queue-3',
    title: 'Przygotowanie spadów – Bannery mesh',
    orderId: '8',
    orderNumber: 'ZL-2026-0135',
    customerName: 'Budowa Demo Development Sp. z o.o.',
    workType: 'Prepress',
    department: 'Wielkoformatowy',
    status: 'todo',
    priority: 'low',
    deadlineOffsetH: 96,
    plannedMinutes: 60,
    workedMinutes: 0,
    filesPath: '\\\\serwer\\zlecenia\\2026\\0135\\prepress',
    requestedByEmail: 'magazyn@madiflow.pl',
  },
]

const TEMPLATE_TASKS = TASK_TEMPLATES.slice(0, 4)

// Deterministic per-user cache
const taskCache = new Map<string, WorkTask[]>()
const planCache = new Map<string, DayPlanEntry[]>()
const activityCache = new Map<string, ActivityItem[]>()

function requester(email: string) {
  const u = DEMO_USERS.find((x) => x.email === email) ?? DEMO_USERS[0]
  return { name: u.name, initials: u.initials, color: u.avatarColor }
}

function exportTaskStatus(status: string): WorkTaskStatus {
  const normalized = status.toLowerCase()
  if (normalized.includes('akcept')) return 'review'
  if (normalized.includes('gotowe')) return 'done'
  if (normalized.includes('anul')) return 'blocked'
  return 'todo'
}

function exportTaskPriority(priority: string, overdue: boolean): OrderPriority {
  const normalized = priority.toLowerCase()
  if (overdue) return 'urgent'
  if (normalized.includes('pil')) return 'urgent'
  if (normalized.includes('wys')) return 'high'
  if (normalized.includes('nis')) return 'low'
  return 'medium'
}

function exportTaskDeadline(deadline: string) {
  return new Date(deadline.replace(' ', 'T'))
}

export function getTasksForUser(userId: string): WorkTask[] {
  const cached = taskCache.get(userId)
  if (cached) return cached

  const tasks: WorkTask[] = TEMPLATE_TASKS.map((t) => {
    const r = requester(t.requestedByEmail)
    return {
      id: `${userId}-${t.key}`,
      title: t.title,
      orderId: t.orderId,
      orderNumber: t.orderNumber,
      customerName: t.customerName,
      workType: t.workType,
      department: t.department,
      status: t.status,
      priority: t.priority,
      deadline: h(t.deadlineOffsetH),
      plannedMinutes: t.plannedMinutes,
      workedMinutes: t.workedMinutes,
      assignedToId: userId,
      requestedByName: r.name,
      requestedByInitials: r.initials,
      requestedByColor: r.color,
      filesPath: t.filesPath,
      lastComment: t.comment
        ? { author: r.name, authorInitials: r.initials, authorColor: r.color, text: t.comment, at: h(-2) }
        : undefined,
      isBlocking: t.isBlocking,
      isUrgent: t.isUrgent,
    }
  })

  const exportRequester = requester('dtp@madiflow.pl')
  const importedTasks: WorkTask[] = MADI_GRID_GRAFIK_TASKS.slice(0, 0).map((task) => ({
    id: `${userId}-madi-grid-${task.id}`,
    title: task.title,
    orderNumber: task.orderNumber,
    customerName: task.client,
    workType: task.queueLabel.toLowerCase().includes('projekt') ? 'Projekt graficzny' : 'Prepress',
    department: 'Grafik / DTP',
    status: exportTaskStatus(task.statusLabel),
    priority: exportTaskPriority(task.priorityLabel, task.isOverdue),
    deadline: exportTaskDeadline(task.deadline),
    plannedMinutes: task.queueLabel.toLowerCase().includes('projekt') ? 90 : 45,
    workedMinutes: task.statusLabel.includes('AKCEPT') ? 15 : 0,
    assignedToId: userId,
    requestedByName: exportRequester.name,
    requestedByInitials: exportRequester.initials,
    requestedByColor: exportRequester.color,
    filesPath: `X:\\!DEMO_ZLECENIA\\${task.orderNumber.replaceAll('/', '\\')}`,
    lastComment: {
      author: 'Import Madi Grid',
      authorInitials: 'MG',
      authorColor: '#7950f2',
      text: `${task.statusLabel} · ${task.queueLabel}`,
      at: exportTaskDeadline(task.deadline),
    },
    isBlocking: task.statusLabel.toLowerCase().includes('anul'),
    isUrgent: task.isOverdue,
  }))

  tasks.push(...importedTasks)

  taskCache.set(userId, tasks)
  return tasks
}

export function getDayPlanForUser(userId: string): DayPlanEntry[] {
  const cached = planCache.get(userId)
  if (cached) return cached

  const entries: DayPlanEntry[] = []
  TEMPLATE_TASKS.forEach((t) => {
    if (t.slot) {
      entries.push({
        id: `plan-${userId}-${t.key}`,
        time: t.slot,
        endTime: t.slotEnd,
        type: t.slotType ?? 'task',
        taskId: `${userId}-${t.key}`,
      })
    }
  })

  // Insert fixed breaks / free windows
  entries.push({ id: `plan-${userId}-lunch`, time: '13:30', endTime: '14:00', type: 'break', label: 'Przerwa obiadowa' })
  entries.push({ id: `plan-${userId}-free`, time: '16:45', endTime: '17:00', type: 'free', label: 'Wolne okno – bufor' })

  // Sort by time
  entries.sort((a, b) => a.time.localeCompare(b.time))

  planCache.set(userId, entries)
  return entries
}

const ACTIVITY_TEMPLATES: Omit<ActivityItem, 'id' | 'createdAt'>[] = [
  {
    kind: 'new_order',
    channel: 'updates',
    actorName: 'Koordynator Demo 1',
    actorInitials: 'AK',
    actorColor: '#339af0',
    message: 'dodała nowe zlecenie z biura',
    orderNumber: 'ZL-2026-0143',
    customerName: 'Demo Technology Sp. z o.o.',
    workType: 'Druk cyfrowy',
    priority: 'high',
    status: 'Weryfikacja',
  },
  {
    kind: 'assignment',
    channel: 'assignments',
    actorName: 'Koordynator Demo 2',
    actorInitials: 'PN',
    actorColor: '#fab005',
    message: 'przypisał Ci zadanie DTP',
    orderNumber: 'ZL-2026-0141',
    orderId: '2',
    customerName: 'Fikcyjna Marka Reklamowa S.A.',
    workType: 'DTP',
    priority: 'urgent',
  },
  {
    kind: 'deadline_change',
    channel: 'deadlines',
    actorName: 'Koordynator Demo 1',
    actorInitials: 'AK',
    actorColor: '#339af0',
    message: 'zmieniła termin zlecenia na wcześniejszy',
    orderNumber: 'ZL-2026-0139',
    orderId: '4',
    customerName: 'Mockup Events Polska Sp. z o.o.',
    priority: 'urgent',
  },
  {
    kind: 'comment',
    channel: 'comments',
    actorName: 'Grafik Demo 2',
    actorInitials: 'MW',
    actorColor: '#f06595',
    message: 'dodała komentarz do zadania',
    orderNumber: 'ZL-2026-0140',
    orderId: '3',
    customerName: 'Studio Klienta Testowego Sp. z o.o.',
    lastComment: 'Poprawiłam adres, proszę o ponowne sprawdzenie.',
  },
  {
    kind: 'blocking',
    channel: 'alerts',
    actorName: 'System',
    actorInitials: 'SY',
    actorColor: '#c92a2a',
    message: 'Zlecenie blokuje produkcję – brak plików',
    orderNumber: 'ZL-2026-0139',
    orderId: '4',
    customerName: 'Mockup Events Polska Sp. z o.o.',
    isBlocking: true,
    priority: 'urgent',
  },
  {
    kind: 'urgent',
    channel: 'alerts',
    actorName: 'Koordynator Demo 2',
    actorInitials: 'PN',
    actorColor: '#fab005',
    message: 'oznaczył zadanie jako pilne',
    orderNumber: 'ZL-2026-0140',
    orderId: '3',
    customerName: 'Studio Klienta Testowego Sp. z o.o.',
    priority: 'urgent',
  },
  {
    kind: 'approval',
    channel: 'updates',
    actorName: 'Klient',
    actorInitials: 'KL',
    actorColor: '#2f9e44',
    message: 'zaakceptował projekt',
    orderNumber: 'ZL-2026-0137',
    orderId: '6',
    customerName: 'Kultura Demo Center',
    status: 'Zatwierdzone',
  },
  {
    kind: 'status_change',
    channel: 'updates',
    actorName: 'Operator Demo 1',
    actorInitials: 'JK',
    actorColor: '#40c057',
    message: 'przesunął zlecenie do produkcji',
    orderNumber: 'ZL-2026-0142',
    orderId: '1',
    customerName: 'Demo Print Lab Sp. z o.o.',
    status: 'W produkcji',
  },
  ...MADI_GRID_TIME_LOGS.map((log) => ({
    kind: 'status_change' as const,
    channel: 'updates' as const,
    actorName: log.user,
    actorInitials: log.user.slice(0, 2).toUpperCase(),
    actorColor: '#20c997',
    message: `RCP ${log.action}`,
    orderNumber: log.orderNumber,
    workType: log.process,
    status: log.notes ?? log.action,
  })),
]

export function getActivityForUser(userId: string): ActivityItem[] {
  const cached = activityCache.get(userId)
  if (cached) return cached

  const items: ActivityItem[] = ACTIVITY_TEMPLATES.slice(0, 4).map((t, i) => ({
    ...t,
    id: `act-${userId}-${i}`,
    createdAt: new Date(NOW.getTime() - i * 27 * 60 * 1000),
  }))

  activityCache.set(userId, items)
  return items
}

export function formatMinutes(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
}
