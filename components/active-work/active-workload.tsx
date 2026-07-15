'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Clock3,
  Gauge,
  ListChecks,
  Pause,
  Play,
  TimerReset,
  UserRound,
} from 'lucide-react'
import { UserAvatar, AssigneeAvatarStack } from '@/components/common/assignee-avatar-stack'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import { DEMO_USERS } from '@/lib/store/auth-store'
import {
  GRID_LISTS,
  GRID_STATUSES,
  type GridRcpEventType,
  type GridStatusId,
  type GridTask,
  useGridStore,
} from '@/lib/store/grid-store'
import { useAuthStore } from '@/lib/store/auth-store'

const ACTIVE_STATUSES: GridStatusId[] = ['in_progress', 'production', 'blocked', 'todo', 'review']
const WORKING_STATUSES: GridStatusId[] = ['in_progress', 'production']
const DAY_CAPACITY_MINUTES = 7 * 60

function formatMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  if (!hours) return `${rest}m`
  return `${hours}h ${rest.toString().padStart(2, '0')}m`
}

function progressValue(task: GridTask) {
  if (!task.estimateMinutes) return 0
  return Math.min(100, Math.round((task.trackedMinutes / task.estimateMinutes) * 100))
}

function statusConfig(status: GridStatusId) {
  return GRID_STATUSES.find((item) => item.id === status) ?? GRID_STATUSES[0]
}

function listName(listId: string) {
  return GRID_LISTS.find((item) => item.id === listId)?.name ?? listId
}

function priorityLabel(priority: GridTask['priority']) {
  if (priority === 'urgent') return 'Pilne'
  if (priority === 'high') return 'Wysoki'
  if (priority === 'low') return 'Niski'
  return 'Sredni'
}

function priorityClass(priority: GridTask['priority']) {
  if (priority === 'urgent') return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
  if (priority === 'high') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
  if (priority === 'low') return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
  return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200'
}

function isTodayOrLate(dateValue: string) {
  if (!dateValue) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(`${dateValue}T00:00:00`)
  return date.getTime() <= today.getTime()
}

function selectedUserName(userId: string) {
  return DEMO_USERS.find((user) => user.id === userId)?.name ?? 'Nieprzypisane'
}

function TaskMiniCard({
  task,
  active,
  onSelect,
}: {
  task: GridTask
  active: boolean
  onSelect: () => void
}) {
  const status = statusConfig(task.status)
  const progress = progressValue(task)
  const overdue = task.status !== 'done' && isTodayOrLate(task.dueDate)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md border p-3 text-left transition ${
        active
          ? 'border-primary/60 bg-primary/10 shadow-[var(--subtle-shadow)]'
          : 'border-border bg-card hover:border-primary/35 hover:bg-muted/30'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: status.color }} />
            <p className="truncate text-sm font-semibold">{task.title}</p>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {task.orderNumber || 'Bez numeru'} · {task.customerName || 'Bez klienta'}
          </p>
        </div>
        <AssigneeAvatarStack ids={task.assigneeIds} size="sm" max={3} showEmpty={false} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={`rounded border px-1.5 py-0.5 ${status.tone}`}>{status.label}</span>
        <span className={`rounded border px-1.5 py-0.5 ${priorityClass(task.priority)}`}>{priorityLabel(task.priority)}</span>
        <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5">{listName(task.listId)}</span>
        {overdue && <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-red-700">termin</span>}
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
          <span>{formatMinutes(task.trackedMinutes)} / {formatMinutes(task.estimateMinutes)}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </button>
  )
}

function QueueSection({
  title,
  icon,
  tasks,
  selectedTaskId,
  onSelect,
}: {
  title: string
  icon: React.ReactNode
  tasks: GridTask[]
  selectedTaskId: string | null
  onSelect: (taskId: string) => void
}) {
  return (
    <section className="rounded-md border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground">{icon}</span>
          {title}
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="grid gap-2 p-2">
        {tasks.length ? (
          tasks.map((task) => (
            <TaskMiniCard
              key={task.id}
              task={task}
              active={selectedTaskId === task.id}
              onSelect={() => onSelect(task.id)}
            />
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Brak zadan w tej kolejce.
          </div>
        )}
      </div>
    </section>
  )
}

function DetailPanel({
  task,
  userId,
  onRcp,
  onFinish,
}: {
  task?: GridTask
  userId: string
  onRcp: (task: GridTask, type: GridRcpEventType, minutesDelta?: number) => void
  onFinish: (task: GridTask) => void
}) {
  const [minutes, setMinutes] = useState('15')

  if (!task) {
    return (
      <aside className="flex min-h-0 w-[360px] shrink-0 flex-col border-l border-border bg-background p-4">
        <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-center text-sm text-muted-foreground">
          Wybierz osobe lub zadanie, zeby zobaczyc RCP i szczegoly pracy.
        </div>
      </aside>
    )
  }

  const events = [...(task.rcpEvents ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const progress = progressValue(task)
  const checklistDone = task.checklist.filter((item) => item.done).length
  const minutesNumber = Number.parseInt(minutes, 10)
  const safeMinutes = Number.isFinite(minutesNumber) ? Math.max(0, minutesNumber) : 0

  return (
    <aside className="flex min-h-0 w-[380px] shrink-0 flex-col border-l border-border bg-background">
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Aktywne zlecenie</p>
            <h2 className="mt-1 text-lg font-semibold leading-tight">{task.title}</h2>
            <p className="mt-1 truncate text-xs text-muted-foreground">{task.orderNumber} · {task.customerName}</p>
          </div>
          <AssigneeAvatarStack ids={task.assigneeIds} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-border bg-muted/25 p-2">
            <p className="text-muted-foreground">Status</p>
            <p className="font-semibold">{statusConfig(task.status).label}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/25 p-2">
            <p className="text-muted-foreground">Termin</p>
            <p className="font-semibold">{task.dueDate || 'Brak'}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/25 p-2">
            <p className="text-muted-foreground">Czas</p>
            <p className="font-semibold">{formatMinutes(task.trackedMinutes)} / {formatMinutes(task.estimateMinutes)}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/25 p-2">
            <p className="text-muted-foreground">Checklisty</p>
            <p className="font-semibold">{checklistDone} / {task.checklist.length || 0}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="border-b border-border p-4">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Minuty dopisane przy stop/koniec</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => onRcp(task, 'start')}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          >
            <Play size={14} /> Start
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onRcp(task, 'pause')}
            className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted"
          >
            <Pause size={14} /> Pauza
          </button>
          <button
            type="button"
            onClick={() => onRcp(task, 'stop', safeMinutes)}
            className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted"
          >
            <TimerReset size={14} /> Stop
          </button>
          <button
            type="button"
            onClick={() => onFinish(task)}
            className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Check size={14} /> Koniec
          </button>
        </div>
      </div>

      <div className="madi-scroll-area flex-1 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historia RCP</p>
        <div className="space-y-2">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="rounded-md border border-border bg-card p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize">{event.type}</span>
                  <span className="text-muted-foreground">{new Date(event.createdAt).toLocaleString('pl-PL')}</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {event.userName} · {event.mode}{event.minutesDelta ? ` · ${formatMinutes(event.minutesDelta)}` : ''}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Jeszcze bez zdarzen RCP dla tej pozycji.
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

export function ActiveWorkload() {
  const { user } = useAuthStore()
  const { tasks, setActiveTask, updateTask, addRcpEvent } = useGridStore()
  const activeTasks = useMemo(
    () => tasks.filter((task) => ACTIVE_STATUSES.includes(task.status)).sort((a, b) => a.position - b.position),
    [tasks]
  )
  const firstUserWithWork = DEMO_USERS.find((demoUser) => activeTasks.some((task) => task.assigneeIds.includes(demoUser.id)))
  const [selectedUserId, setSelectedUserId] = useState(user?.id ?? firstUserWithWork?.id ?? DEMO_USERS[0]?.id ?? '1')
  const selectedUserTasks = activeTasks.filter((task) => task.assigneeIds.includes(selectedUserId))
  const fallbackTask = selectedUserTasks[0] ?? activeTasks[0]
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(fallbackTask?.id ?? null)
  const selectedTask = activeTasks.find((task) => task.id === selectedTaskId) ?? fallbackTask

  const teamRows = DEMO_USERS.map((demoUser) => {
    const assigned = activeTasks.filter((task) => task.assigneeIds.includes(demoUser.id))
    const workloadMinutes = assigned.reduce((sum, task) => sum + Math.max(0, task.estimateMinutes - task.trackedMinutes), 0)
    const working = assigned.filter((task) => WORKING_STATUSES.includes(task.status)).length
    const blocked = assigned.filter((task) => task.status === 'blocked').length
    const load = Math.min(140, Math.round((workloadMinutes / DAY_CAPACITY_MINUTES) * 100))
    return { user: demoUser, assigned, workloadMinutes, working, blocked, load }
  })

  const queueSource = selectedUserTasks.length ? selectedUserTasks : activeTasks
  const nowTasks = queueSource.filter((task) => WORKING_STATUSES.includes(task.status))
  const nextTasks = queueSource.filter((task) => task.status === 'todo' || task.status === 'review')
  const blockedTasks = queueSource.filter((task) => task.status === 'blocked')

  const registerRcp = (task: GridTask, type: GridRcpEventType, minutesDelta = 0) => {
    const rcpUserId = selectedUserId || user?.id || '1'
    addRcpEvent(task.id, {
      type,
      mode: 'manual',
      userId: rcpUserId,
      userName: selectedUserName(rcpUserId),
      minutesDelta,
    })
    if (type === 'start') updateTask(task.id, { status: 'in_progress' })
  }

  const finishTask = (task: GridTask) => {
    registerRcp(task, 'finish', Math.max(0, task.estimateMinutes - task.trackedMinutes))
    updateTask(task.id, { status: 'done' })
  }

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    setActiveTask(taskId)
  }

  const selectUser = (userId: string) => {
    setSelectedUserId(userId)
    const next = activeTasks.find((task) => task.assigneeIds.includes(userId)) ?? activeTasks[0]
    if (next) selectTask(next.id)
  }

  return (
    <ModuleFrame
      title="Active Work"
      kicker="Workload i RCP"
      description="Biezaca praca pokazana przez obciazenie osob, aktywne kolejki i szybkie odklikanie czasu."
      icon={<Gauge size={13} />}
      summary={
        <StatStrip
          items={[
            { label: 'W toku', value: nowTasks.length, hint: 'aktywnie prowadzone', tone: 'text-emerald-600' },
            { label: 'Do startu', value: nextTasks.length, hint: 'kolejne pozycje' },
            { label: 'Blokady', value: blockedTasks.length, hint: 'wymaga decyzji', tone: 'text-red-600' },
            { label: 'Czas w toku', value: formatMinutes(nowTasks.reduce((sum, task) => sum + task.trackedMinutes, 0)), hint: 'zarejestrowany RCP' },
          ]}
        />
      }
      bodyClassName="overflow-hidden"
      aside={
        <DetailPanel
          task={selectedTask}
          userId={selectedUserId}
          onRcp={registerRcp}
          onFinish={finishTask}
        />
      }
    >
      <div className="grid h-full min-h-0 grid-cols-[320px_minmax(0,1fr)] bg-workspace-surface">
        <aside className="madi-scroll-area border-r border-border bg-background p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Zespol</p>
              <p className="text-xs text-muted-foreground">Obciazenie dzienne i aktywne prace</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{activeTasks.length}</span>
          </div>
          <div className="space-y-2">
            {teamRows.map((row) => (
              <button
                key={row.user.id}
                type="button"
                onClick={() => selectUser(row.user.id)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  selectedUserId === row.user.id
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border bg-card hover:bg-muted/35'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserAvatar userId={row.user.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.user.department}</p>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${row.load > 100 ? 'bg-red-100 text-red-700' : row.load > 80 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {row.load}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${row.load > 100 ? 'bg-red-500' : row.load > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, row.load)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{row.assigned.length} zadan</span>
                  <span>{formatMinutes(row.workloadMinutes)}</span>
                  <span>{row.working} w toku</span>
                  {row.blocked > 0 && <span className="font-semibold text-red-600">{row.blocked} blok.</span>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="madi-scroll-area p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Kolejka pracy: {selectedUserName(selectedUserId)}</h2>
              <p className="text-xs text-muted-foreground">
                Kliknij pozycje, zeby sterowac RCP po prawej. Gdy osoba nie ma zadan, pokazujemy caly aktywny bufor.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              <UserRound size={14} />
              Workload zamiast surowej listy
            </div>
          </div>
          <div className="grid madi-fluid-cards gap-3">
            <QueueSection
              title="Teraz"
              icon={<Clock3 size={15} />}
              tasks={nowTasks}
              selectedTaskId={selectedTask?.id ?? null}
              onSelect={selectTask}
            />
            <QueueSection
              title="Nastepne"
              icon={<ListChecks size={15} />}
              tasks={nextTasks}
              selectedTaskId={selectedTask?.id ?? null}
              onSelect={selectTask}
            />
            <QueueSection
              title="Blokady"
              icon={<AlertTriangle size={15} />}
              tasks={blockedTasks}
              selectedTaskId={selectedTask?.id ?? null}
              onSelect={selectTask}
            />
          </div>
        </main>
      </div>
    </ModuleFrame>
  )
}
