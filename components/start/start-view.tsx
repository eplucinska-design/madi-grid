'use client'

import { useMemo, useState } from 'react'
import { format, isToday, isPast, differenceInDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  CalendarDays,
  Factory,
  ListTodo,
  AlertCircle,
  Flame,
  Ban,
  Inbox,
  Save,
  UserCheck,
} from 'lucide-react'
import type { WorkTask } from '@/lib/types'
import { useAuthStore } from '@/lib/store/auth-store'
import {
  useStartStore,
  DEFAULT_SECTION_ORDER,
  type StartSectionId,
  type DateRange,
  type StartTileSize,
  type StartWidgetId,
} from '@/lib/store/start-store'
import { getTasksForUser, getDayPlanForUser, getActivityForUser } from '@/lib/data/workspace-data'
import { SectionShell, TileSizeControl } from './section-shell'
import { ActiveTaskCard } from './active-task-card'
import { DayPlan } from './day-plan'
import { ProductionPanel } from './production-panel'
import { ActivityFeed } from './activity-feed'
import { TaskRow } from './task-row'

const SECTION_META: Record<
  StartSectionId,
  { title: string; icon: React.ReactNode; accent: string; openModule?: 'planning' | 'production' | 'orders'; openHref: string }
> = {
  'day-plan': { title: 'Plan dnia', icon: <CalendarDays size={14} />, accent: '#339af0', openModule: 'planning', openHref: '/studio' },
  production: { title: 'Aktywna produkcja', icon: <Factory size={14} />, accent: '#40c057', openModule: 'production', openHref: '/production' },
  queue: { title: 'Moja kolejka', icon: <ListTodo size={14} />, accent: '#7950f2', openModule: 'orders', openHref: '/jobs' },
  overdue: { title: 'Zalegle', icon: <AlertCircle size={14} />, accent: '#e03131', openModule: 'orders', openHref: '/jobs' },
  urgent: { title: 'Pilne', icon: <Flame size={14} />, accent: '#f59f00', openModule: 'orders', openHref: '/jobs' },
  blocking: { title: 'Zadania blokujace produkcje', icon: <Ban size={14} />, accent: '#c92a2a', openModule: 'production', openHref: '/production' },
}

const tileSizeClasses: Record<StartTileSize, string> = {
  sm: 'xl:col-span-1',
  md: 'xl:col-span-1',
  lg: 'xl:col-span-2',
  full: 'xl:col-span-2 2xl:col-span-3',
}

function tileSpanClass(size: StartTileSize) {
  return tileSizeClasses[size] ?? tileSizeClasses.md
}

export function StartView() {
  const { user } = useAuthStore()
  const {
    getPrefs,
    patchPrefs,
    toggleSection,
    reorderSections,
    setLastOpenedTask,
    activeTimerTaskId,
  } = useStartStore()

  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [urgentOverrides, setUrgentOverrides] = useState<Set<string>>(new Set())
  const [dragSection, setDragSection] = useState<StartSectionId | null>(null)
  const [overSection, setOverSection] = useState<StartSectionId | null>(null)
  const [viewName, setViewName] = useState('Widok startowy')

  if (!user) return null
  const prefs = getPrefs(user.id)

  const allTasks = useMemo(() => getTasksForUser(user.id), [user.id])
  const dayPlan = useMemo(() => getDayPlanForUser(user.id), [user.id])
  const activity = useMemo(() => getActivityForUser(user.id), [user.id])

  const markDone = (id: string) => setDoneIds((prev) => new Set(prev).add(id))
  const toggleUrgent = (id: string) =>
    setUrgentOverrides((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const tasks: WorkTask[] = allTasks
    .filter((task) => !doneIds.has(task.id))
    .map((task) => (urgentOverrides.has(task.id) ? { ...task, isUrgent: !task.isUrgent } : task))

  const taskMap = useMemo(() => Object.fromEntries(allTasks.map((task) => [task.id, task])), [allTasks])

  const inRange = (task: WorkTask) => {
    const overdue = isPast(task.deadline) && !isToday(task.deadline)
    if (overdue) return true
    if (prefs.dateRange === 'all') return true
    const days = differenceInDays(task.deadline, new Date())
    if (prefs.dateRange === 'today') return isToday(task.deadline)
    return days <= 7
  }

  let scoped = tasks.filter(inRange)
  if (prefs.filterUrgent) scoped = scoped.filter((task) => task.isUrgent)
  if (prefs.filterOverdue) scoped = scoped.filter((task) => isPast(task.deadline) && !isToday(task.deadline))

  const activeTask =
    tasks.find((task) => task.id === activeTimerTaskId) ??
    tasks.find((task) => task.id === prefs.lastOpenedTaskId) ??
    tasks.find((task) => task.status === 'in_progress') ??
    tasks[0]

  const overdue = scoped.filter((task) => isPast(task.deadline) && !isToday(task.deadline))
  const urgent = scoped.filter((task) => task.isUrgent)
  const blocking = scoped.filter((task) => task.isBlocking)
  const queue = scoped.filter((task) => task.id !== activeTask?.id)

  const order: StartSectionId[] = [
    ...prefs.sectionOrder.filter((id) => DEFAULT_SECTION_ORDER.includes(id)),
    ...DEFAULT_SECTION_ORDER.filter((id) => !prefs.sectionOrder.includes(id)),
  ]

  const tileSize = (id: StartWidgetId, fallback: StartTileSize = 'md') => prefs.tileSizes[id] ?? fallback
  const setTileSize = (id: StartWidgetId, size: StartTileSize) =>
    patchPrefs(user.id, { tileSizes: { [id]: size } })
  const saveStartView = () => {
    const trimmed = viewName.trim() || 'Widok startowy'
    patchPrefs(user.id, {
      savedViews: [
        {
          name: trimmed,
          sectionOrder: order,
          collapsedSections: prefs.collapsedSections,
          tileSizes: prefs.tileSizes,
          rightCollapsed: prefs.rightCollapsed,
          dateRange: prefs.dateRange,
          onlyMine: prefs.onlyMine,
          filterUrgent: prefs.filterUrgent,
          filterOverdue: prefs.filterOverdue,
          savedAt: new Date().toISOString(),
        },
        ...prefs.savedViews.filter((view) => view.name !== trimmed),
      ].slice(0, 8),
    })
  }
  const restoreStartView = (name: string) => {
    const saved = prefs.savedViews.find((view) => view.name === name)
    if (!saved) return
    patchPrefs(user.id, {
      sectionOrder: saved.sectionOrder,
      collapsedSections: saved.collapsedSections,
      tileSizes: saved.tileSizes,
      rightCollapsed: saved.rightCollapsed,
      dateRange: saved.dateRange,
      onlyMine: saved.onlyMine,
      filterUrgent: saved.filterUrgent,
      filterOverdue: saved.filterOverdue,
    })
  }

  const handleSectionDrop = (target: StartSectionId) => {
    if (!dragSection || dragSection === target) {
      setDragSection(null)
      setOverSection(null)
      return
    }
    const next = [...order]
    const from = next.indexOf(dragSection)
    const to = next.indexOf(target)
    next.splice(to, 0, next.splice(from, 1)[0])
    reorderSections(user.id, next)
    setDragSection(null)
    setOverSection(null)
  }

  const renderSectionBody = (id: StartSectionId) => {
    switch (id) {
      case 'day-plan':
        return (
          <DayPlan
            entries={dayPlan}
            tasks={taskMap}
            userId={user.id}
            onMarkDone={markDone}
            onToggleUrgent={toggleUrgent}
          />
        )
      case 'production':
        return <ProductionPanel />
      case 'queue':
        return <TaskListBody tasks={queue} onMarkDone={markDone} emptyLabel="Kolejka pusta" />
      case 'overdue':
        return <TaskListBody tasks={overdue} onMarkDone={markDone} emptyLabel="Brak zaleglych zadan" />
      case 'urgent':
        return <TaskListBody tasks={urgent} onMarkDone={markDone} emptyLabel="Brak pilnych zadan" />
      case 'blocking':
        return <TaskListBody tasks={blocking} onMarkDone={markDone} emptyLabel="Nic nie blokuje produkcji" />
    }
  }

  const sectionCount = (id: StartSectionId) => {
    switch (id) {
      case 'queue':
        return queue.length
      case 'overdue':
        return overdue.length
      case 'urgent':
        return urgent.length
      case 'blocking':
        return blocking.length
      default:
        return undefined
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Dzien dobry' : hour < 18 ? 'Czesc' : 'Dobry wieczor'

  return (
    <div data-start-view-root className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {greeting}, {user.name.split(' ')[0]}
          </h1>
          <p className="truncate text-[12px] capitalize text-muted-foreground">
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: pl })} - aktywna produkcja i moje zadania
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
          {(['today', 'week', 'all'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => patchPrefs(user.id, { dateRange: range })}
              className={`rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
                prefs.dateRange === range ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range === 'today' ? 'Dzis' : range === 'week' ? 'Tydzien' : 'Wszystko'}
            </button>
          ))}
        </div>

        <FilterToggle
          active={prefs.onlyMine}
          onClick={() => patchPrefs(user.id, { onlyMine: !prefs.onlyMine })}
          icon={<UserCheck size={13} />}
          label="Tylko moje"
        />
        <FilterToggle
          active={prefs.filterUrgent}
          onClick={() => patchPrefs(user.id, { filterUrgent: !prefs.filterUrgent })}
          icon={<Flame size={13} />}
          label="Pilne"
        />
        <FilterToggle
          active={prefs.filterOverdue}
          onClick={() => patchPrefs(user.id, { filterOverdue: !prefs.filterOverdue })}
          icon={<AlertCircle size={13} />}
          label="Zalegle"
        />
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted/20 p-1">
          <input
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
            className="h-7 w-28 rounded border border-border bg-background px-2 text-[11px] outline-none focus:border-primary"
            placeholder="Nazwa widoku"
          />
          <button
            onClick={saveStartView}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Zapisz widok"
          >
            <Save size={13} />
          </button>
          {prefs.savedViews.length > 0 && (
            <select
              onChange={(event) => {
                if (event.target.value) restoreStartView(event.target.value)
                event.currentTarget.value = ''
              }}
              className="h-7 max-w-32 rounded border border-border bg-background px-1.5 text-[11px]"
              defaultValue=""
              title="Przywroc widok"
            >
              <option value="" disabled>
                Widoki
              </option>
              {prefs.savedViews.map((view) => (
                <option key={view.name} value={view.name}>
                  {view.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div data-start-view-content className="madi-scroll-area flex-1 p-[var(--app-module-gap)]">
          <div data-start-view-grid className="grid min-w-0 auto-rows-min gap-[var(--app-module-gap)] [grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr))]">
            <div className={`min-w-0 ${tileSpanClass(tileSize('active-task', 'full'))}`}>
              <div className="mb-2 flex justify-end">
                <TileSizeControl
                  value={tileSize('active-task', 'full')}
                  onChange={(size) => setTileSize('active-task', size)}
                />
              </div>
              {activeTask ? (
                <ActiveTaskCard task={activeTask} onMarkDone={markDone} onSendToRework={markDone} />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-12 text-center">
                  <Inbox size={32} className="mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Brak aktywnego zadania</p>
                  <p className="text-[12px] text-muted-foreground">Uruchom timer na zadaniu z planu lub kolejki.</p>
                </div>
              )}
            </div>

            {order.map((id) => (
              <div key={id} className={`min-w-0 ${tileSpanClass(tileSize(id))}`}>
                <SectionShell
                  title={SECTION_META[id].title}
                  icon={SECTION_META[id].icon}
                  accent={SECTION_META[id].accent}
                  count={sectionCount(id)}
                  collapsed={prefs.collapsedSections.includes(id)}
                  onToggle={() => toggleSection(user.id, id)}
                  openModule={SECTION_META[id].openModule}
                  openHref={SECTION_META[id].openHref}
                  size={tileSize(id)}
                  onSizeChange={(size) => setTileSize(id, size)}
                  draggable
                  onDragStart={() => setDragSection(id)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setOverSection(id)
                  }}
                  onDrop={() => handleSectionDrop(id)}
                  isDragTarget={overSection === id && dragSection !== id}
                >
                  {renderSectionBody(id)}
                </SectionShell>
              </div>
            ))}
          </div>
        </div>
        <div
          data-start-activity-column
          className={`hidden min-h-0 min-w-0 shrink-0 p-[var(--app-module-gap)] pl-0 lg:block ${
            prefs.rightCollapsed ? 'w-[calc(48px+var(--app-module-gap))]' : 'w-[clamp(320px,22vw,390px)]'
          }`}
        >
          <ActivityFeed items={activity} userId={user.id} />
        </div>
      </div>
    </div>
  )
}

function TaskListBody({
  tasks,
  onMarkDone,
  emptyLabel,
}: {
  tasks: WorkTask[]
  onMarkDone: (id: string) => void
  emptyLabel: string
}) {
  if (tasks.length === 0) {
    return <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} onMarkDone={onMarkDone} />
      ))}
    </div>
  )
}

function FilterToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
