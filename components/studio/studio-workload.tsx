'use client'

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  CheckCheck,
  Clock3,
  Columns3,
  ExternalLink,
  LayoutDashboard,
  List,
  MessageSquare,
  PanelRightOpen,
  Play,
  Plus,
  Search,
  Timer,
  UserPlus,
} from 'lucide-react'
import { UserAvatar } from '@/components/common/assignee-avatar-stack'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import { MADI_GRID_GRAFIK_TASKS, type MadiGridGrafikTask } from '@/lib/data/madi-grid-export'
import { openOrderWindow } from '@/lib/utils/order-links'

type StudioView = 'overview' | 'board' | 'list' | 'calendar'
type StudioCalendarMode = 'day' | 'week' | 'month'
type StudioStatus = 'waiting' | 'accept' | 'overdue' | 'active'
type StudioSortKey = 'title' | 'status' | 'client' | 'deadline' | 'minutes'
type SortDirection = 'asc' | 'desc'

interface StudioTask extends MadiGridGrafikTask {
  statusId: StudioStatus
  minutes: number
  trackedMinutes: number
  path: string
  note: string
  comments: Array<{ id: string; author: string; text: string; createdAt: string }>
}

const DAY_CAPACITY_MINUTES = 360
const VISIBLE_TASKS = MADI_GRID_GRAFIK_TASKS.slice(0, 12)

function taskMinutes(task: MadiGridGrafikTask, index: number) {
  if (task.queueLabel.toLowerCase().includes('projekt')) return 120 + (index % 2) * 60
  if (task.title.toLowerCase().includes('personalizacja')) return 60
  return 45 + (index % 3) * 15
}

function normalizeTask(task: MadiGridGrafikTask, index: number): StudioTask {
  const statusId: StudioStatus = task.isOverdue
    ? 'overdue'
    : task.statusLabel.includes('AKCEPT')
      ? 'accept'
      : index === 8
        ? 'active'
        : 'waiting'

  return {
    ...task,
    statusId,
    minutes: taskMinutes(task, index),
    trackedMinutes: statusId === 'active' ? 24 : statusId === 'accept' ? 15 : 0,
    path: `X:\\!ZLECENIA\\${task.client.split(' ')[0] || 'Klient'}\\${task.deadline.slice(0, 10)} ${task.title}`,
    note: statusId === 'accept'
      ? 'Czeka na akcept klienta. Po akceptacji przekazac do kolejnego etapu.'
      : 'Sprawdzic komplet materialow, opis zlecenia i termin przed startem pracy.',
    comments: [
      {
        id: `${task.id}-comment-1`,
        author: task.assignee.replace('EEmilka', 'Emilia'),
        text: statusId === 'overdue' ? 'Pozycja po terminie, wymaga decyzji co robimy dalej.' : 'Do sprawdzenia przed przekazaniem dalej.',
        createdAt: task.deadline,
      },
    ],
  }
}

const studioTasks: StudioTask[] = VISIBLE_TASKS.map(normalizeTask)

const priorityStudioTasks: StudioTask[] = [
  {
    id: 'studio-koperty-c4-personalizacja',
    title: 'Koperty C4 - personalizacja',
    queueLabel: 'Grafik - przygotowanie plikow',
    statusLabel: 'CZEKA',
    priorityLabel: 'Normalny',
    assignee: 'Przemek',
    client: 'Sport Evolution Group Sp. z o.o.',
    orderNumber: 'ZG/2026/07/0115',
    deadline: '2026-07-15 09:30',
    isOverdue: false,
    statusId: 'waiting',
    minutes: 60,
    trackedMinutes: 0,
    path: 'X:\\!ZLECENIA\\Sport Evolution\\2026-07-14 koperty Ironman Krakow\\',
    note: 'Personalizacja kopert jak zawsze, pamietaj o odsunieciu grafiki od krawedzi tak jak ostatnio.',
    comments: [
      {
        id: 'studio-koperty-c4-comment-1',
        author: 'Przemek',
        text: 'Najnowsze zlecenie w kolejce grafika. Mozna wystartowac od razu z karty Czeka.',
        createdAt: '2026-07-14 12:40',
      },
    ],
  },
]

const allStudioTasks: StudioTask[] = [...priorityStudioTasks, ...studioTasks]

const statusLabels: Record<StudioStatus, string> = {
  waiting: 'Czeka',
  accept: 'Czeka na akcept',
  overdue: 'Zalegle',
  active: 'W toku',
}

const statusClasses: Record<StudioStatus, string> = {
  waiting: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
  accept: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
  overdue: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200',
  active: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200',
}

const statusDot: Record<StudioStatus, string> = {
  waiting: '#94a3b8',
  accept: '#2f9e44',
  overdue: '#e03131',
  active: '#339af0',
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function progress(task: StudioTask) {
  return task.minutes ? Math.min(100, Math.round((task.trackedMinutes / task.minutes) * 100)) : 0
}

function deadline(task: StudioTask) {
  return task.deadline.replace(' ', ' / ')
}

function openStudioTask(task: StudioTask) {
  openOrderWindow(task.orderNumber, task.orderNumber)
}

function newestWaitingTask(tasks: StudioTask[]) {
  return [...tasks]
    .filter((task) => task.statusId === 'waiting')
    .sort((a, b) => b.deadline.localeCompare(a.deadline))[0]
}

function StudioViewSwitch({ value, onChange }: { value: StudioView; onChange: (view: StudioView) => void }) {
  const options: Array<{ id: StudioView; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Oblozenie', icon: <LayoutDashboard size={14} /> },
    { id: 'board', label: 'Board', icon: <Columns3 size={14} /> },
    { id: 'list', label: 'Lista', icon: <List size={14} /> },
    { id: 'calendar', label: 'Kalendarz', icon: <CalendarDays size={14} /> },
  ]

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold transition ${
            value === option.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

const metricToneClasses = {
  neutral: {
    card: 'border-border bg-card',
    rail: 'bg-muted-foreground/30',
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
  success: {
    card: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-500/12 dark:text-emerald-100',
    rail: 'bg-emerald-500',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    value: 'text-emerald-700 dark:text-emerald-200',
  },
  warning: {
    card: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/12 dark:text-amber-100',
    rail: 'bg-amber-500',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    value: 'text-amber-700 dark:text-amber-200',
  },
  danger: {
    card: 'border-red-300 bg-red-50 text-red-950 dark:border-red-500/50 dark:bg-red-500/12 dark:text-red-100',
    rail: 'bg-red-500',
    icon: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200',
    value: 'text-red-700 dark:text-red-200',
  },
}

function DarkStat({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: string | number
  hint: string
  tone?: keyof typeof metricToneClasses
  icon: ReactNode
}) {
  const classes = metricToneClasses[tone]

  return (
    <div className={`relative min-w-0 overflow-hidden rounded-md border px-3 py-2.5 shadow-[var(--subtle-shadow)] ${classes.card}`}>
      <span className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${classes.rail}`} />
      <div className="flex min-w-0 items-start justify-between gap-2 pl-1">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-muted-foreground">{label}</p>
          <div className="mt-1 flex min-w-0 items-baseline gap-1.5">
            <p className={`truncate text-xl font-semibold leading-none ${classes.value}`}>{value}</p>
            {hint ? <p className="min-w-0 truncate text-xs text-muted-foreground">{hint}</p> : null}
          </div>
        </div>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${classes.icon}`}>{icon}</span>
      </div>
    </div>
  )
}

function ActiveGraphicTask({
  task,
  running,
  onToggle,
  onDone,
  onRework,
  onOpen,
}: {
  task: StudioTask
  running: boolean
  onToggle: () => void
  onDone: () => void
  onRework: () => void
  onOpen: () => void
}) {
  const worked = running ? Math.max(task.trackedMinutes, 18) : task.trackedMinutes
  const value = task.minutes ? Math.min(100, Math.round((worked / task.minutes) * 100)) : 0

  return (
    <section
      onDoubleClick={onOpen}
      className="rounded-md border border-primary/50 bg-card p-4 shadow-[inset_0_3px_0_hsl(var(--primary))]"
    >
      <div className="grid gap-[var(--app-module-gap)] lg:grid-cols-[minmax(0,1fr)_190px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <span className={`h-1.5 w-1.5 rounded-full bg-primary ${running ? 'animate-pulse' : ''}`} />
              Moje aktywne zadanie
            </span>
            <span className={`rounded-md border px-3 py-1 text-[11px] font-semibold ${statusClasses[task.statusId]}`}>
              {statusLabels[task.statusId]}
            </span>
          </div>

          <h2 className="text-balance text-xl font-semibold">{task.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {task.queueLabel}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {task.priorityLabel}
            </span>
            <span className="text-xs text-muted-foreground">Projektowanie/DTP</span>
          </div>

          <div className="mt-4 grid gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-2">
            <InfoCell icon={<ExternalLink size={14} />} label="Zlecenie" value={task.orderNumber} mono />
            <InfoCell icon={<Clock3 size={14} />} label="Deadline" value={deadline(task)} />
            <InfoCell icon={<CalendarDays size={14} />} label="Klient" value={task.client} />
            <InfoCell icon={<Timer size={14} />} label="Zlecajacy" value={task.assignee.replace('EEmilka', 'Emilia')} />
            <InfoCell icon={<PanelRightOpen size={14} />} label="Pliki" value={task.path} mono className="sm:col-span-2" />
          </div>

          {task.comments[0] && (
            <div className="mt-4 flex items-start gap-2 rounded-md bg-muted/50 p-3">
              <UserAvatar label={task.comments[0].author} color="#4c6ef5" size="sm" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium">
                  {task.comments[0].author}
                  <span className="ml-1.5 font-normal text-muted-foreground">ostatni komentarz</span>
                </p>
                <p className="mt-0.5 flex items-start gap-1 text-[12px] text-muted-foreground">
                  <MessageSquare size={12} className="mt-0.5 shrink-0" />
                  {task.comments[0].text}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-border bg-background/70 p-3">
          <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Czas pracy</p>
          <p className="text-center font-mono text-3xl font-bold tabular-nums">{running ? '00:18:24' : '00:00:00'}</p>
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Plan: {formatMinutes(task.minutes)}</span>
              <span>{value}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {running ? <Clock3 size={15} /> : <Play size={15} />}
            {running ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onToggle} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Start
        </button>
        <button onClick={onToggle} className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
          Stop
        </button>
        <button onClick={onDone} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Koniec
        </button>
        <button onClick={onRework} className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
          Do poprawki
        </button>
        <button onClick={onRework} className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
          Komentarz
        </button>
        <button onClick={onRework} className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
          Termin
        </button>
        <button onClick={onOpen} className="ml-auto rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
          Otworz zlecenie
        </button>
      </div>
    </section>
  )
}

function InfoCell({
  icon,
  label,
  value,
  mono,
  className = '',
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  className?: string
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className={`min-w-0 truncate font-medium ${mono ? 'font-mono text-[12px]' : ''}`} title={value}>
        {value}
      </span>
    </div>
  )
}

function OverviewQueue({
  title,
  tasks,
  selectedId,
  actionLabel,
  onSelect,
}: {
  title: string
  tasks: StudioTask[]
  selectedId: string
  actionLabel: string
  onSelect: (id: string) => void
}) {
  return (
    <section className="rounded-md border border-border bg-card p-3">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">▾</span>
          <h3 className="truncate text-base font-semibold">{title}</h3>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{tasks.length}</span>
      </header>
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onSelect(task.id)}
            onDoubleClick={() => openStudioTask(task)}
            className={`grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-background p-3 text-left hover:bg-muted/35 ${
              selectedId === task.id ? 'border-primary bg-primary/5' : 'border-transparent'
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{task.title}</span>
              <span className="block truncate text-xs font-medium text-muted-foreground">{task.client}</span>
              <span className="mt-1 block text-[11px] font-semibold">
                Zlecajacy: {task.assignee.replace('EEmilka', 'Emilia')}{' '}
                <span className={task.statusId === 'overdue' ? 'text-red-600' : 'text-muted-foreground'}>
                  Deadline: {deadline(task)}
                </span>
              </span>
            </span>
            <span className={`rounded-md border px-3 py-2 text-xs font-bold ${statusClasses[task.statusId]}`}>
              {actionLabel}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function OverviewStats({ doneToday, todayMinutes, queueCount, activeCount }: { doneToday: number; todayMinutes: number; queueCount: number; activeCount: number }) {
  const items = [
    ['Ukonczone dzis', doneToday],
    ['Czas dzis', formatMinutes(todayMinutes)],
    ['W kolejce', queueCount],
    ['W toku', activeCount],
  ]

  return (
    <aside className="grid self-start rounded-md border border-border bg-card p-3 sm:grid-cols-2 xl:grid-cols-2 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-h-[96px] rounded-md border border-border bg-background p-4 text-center">
          <p className="text-3xl font-bold">{value}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
        </div>
      ))}
    </aside>
  )
}

function GraphicDayPlan({
  tasks,
  selectedId,
  onSelect,
}: {
  tasks: StudioTask[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const rows = [
    { time: '09:00', end: '11:00', task: tasks[0] },
    { time: '11:30', end: '13:30', task: tasks[1] },
    { time: '13:30', end: '14:00', label: 'Przerwa obiadowa' },
    { time: '16:45', end: '17:00', label: 'Wolne okno - bufor' },
  ]

  return (
    <section className="rounded-md border border-border bg-card p-3">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CalendarDays size={14} />
          </span>
          <h3 className="truncate text-sm font-semibold">Plan dnia grafika</h3>
        </div>
        <button className="text-xs font-semibold text-muted-foreground hover:text-foreground">Rozwin</button>
      </header>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={`${row.time}-${row.end}`} className="grid grid-cols-[48px_minmax(0,1fr)] gap-2">
            <div className="pt-2 text-right">
              <p className="text-xs font-semibold">{row.time}</p>
              <p className="text-[11px] text-muted-foreground">{row.end}</p>
            </div>
            {row.task ? (
              <button
                type="button"
                onClick={() => onSelect(row.task!.id)}
                onDoubleClick={() => openStudioTask(row.task!)}
                className={`min-w-0 rounded-md border bg-background p-2 text-left hover:bg-muted/35 ${
                  selectedId === row.task.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-8 w-1 rounded-full bg-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.task.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {row.task.queueLabel} · {row.task.client} · {formatMinutes(row.task.minutes)}
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/20 p-2 text-sm text-muted-foreground">
                {row.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function OverviewView({
  tasks,
  selectedTask,
  running,
  onToggleRunning,
  onDone,
  onRework,
  onSelect,
  onOpen,
}: {
  tasks: StudioTask[]
  selectedTask: StudioTask
  running: boolean
  onToggleRunning: () => void
  onDone: () => void
  onRework: () => void
  onSelect: (id: string) => void
  onOpen: () => void
}) {
  const queueTasks = tasks.filter((task) => task.statusId === 'waiting' || task.statusId === 'active').slice(0, 3)
  const acceptTasks = tasks.filter((task) => task.statusId === 'accept' || task.statusId === 'overdue').slice(0, 5)
  const plannedMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0)
  const todayMinutes = tasks.reduce((sum, task) => sum + task.trackedMinutes, 0)
  const doneToday = Math.max(4, Math.round(todayMinutes / 15))

  return (
    <div className="space-y-[var(--app-module-gap)]">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <DarkStat
          label="Do zrobienia"
          value={tasks.length}
          hint={`${tasks.filter((task) => task.statusId === 'active').length} w toku`}
          tone="neutral"
          icon={<List size={14} />}
        />
        <DarkStat
          label="Plan w kolejce"
          value={formatMinutes(plannedMinutes)}
          hint="szacowany czas"
          tone="success"
          icon={<Timer size={14} />}
        />
        <DarkStat
          label="Pilne"
          value={tasks.filter((task) => task.priorityLabel.toLowerCase().includes('pil')).length}
          hint="najwyzszy priorytet"
          tone="danger"
          icon={<AlertTriangle size={14} />}
        />
        <DarkStat
          label="Blokuje produkcje"
          value={tasks.filter((task) => task.statusId === 'overdue').length}
          hint="po terminie"
          tone="warning"
          icon={<PanelRightOpen size={14} />}
        />
      </div>

      <div className="grid items-start gap-[var(--app-module-gap)] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-[var(--app-module-gap)]">
          <ActiveGraphicTask
            task={selectedTask}
            running={running}
            onToggle={onToggleRunning}
            onDone={onDone}
            onRework={onRework}
            onOpen={onOpen}
          />
          <GraphicDayPlan tasks={queueTasks} selectedId={selectedTask.id} onSelect={onSelect} />
        </div>
        <OverviewStats
          doneToday={doneToday}
          todayMinutes={todayMinutes}
          queueCount={queueTasks.length}
          activeCount={running ? 1 : tasks.filter((task) => task.statusId === 'active').length}
        />
      </div>

      <div className="grid gap-[var(--app-module-gap)] xl:grid-cols-2">
        <OverviewQueue
          title="Kolejka zadan"
          tasks={queueTasks}
          selectedId={selectedTask.id}
          actionLabel="Czeka"
          onSelect={onSelect}
        />
        <OverviewQueue
          title="Czekaja na akcept"
          tasks={acceptTasks}
          selectedId={selectedTask.id}
          actionLabel="Czeka na akcept"
          onSelect={onSelect}
        />
      </div>
    </div>
  )
}

function StudioTaskCard({ task, selected, onSelect }: { task: StudioTask; selected: boolean; onSelect: () => void }) {
  const value = progress(task)

  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={() => openStudioTask(task)}
      className={`madi-responsive-card w-full rounded-md border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/25 ${
        selected ? 'border-primary/60 bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: statusDot[task.statusId] }} />
            <p className="line-clamp-2 text-sm font-semibold leading-snug">{task.title}</p>
          </div>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{task.client}</p>
        </div>
        <UserAvatar label="Emilia Plucinska" color="#4c6ef5" size="sm" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${statusClasses[task.statusId]}`}>
          {statusLabels[task.statusId]}
        </span>
        <span className="rounded border border-border bg-muted/45 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {task.queueLabel === 'Zalegle' ? 'Grafik' : task.queueLabel}
        </span>
        <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {task.priorityLabel}
        </span>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>{task.orderNumber}</span>
          <span>{formatMinutes(task.trackedMinutes)} / {formatMinutes(task.minutes)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <span className={task.statusId === 'overdue' ? 'font-semibold text-red-600' : 'text-muted-foreground'}>
          {deadline(task)}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <MessageSquare size={12} />
          {task.comments.length}
        </span>
      </div>
    </button>
  )
}

function BoardView({ tasks, selectedId, onSelect }: { tasks: StudioTask[]; selectedId: string; onSelect: (id: string) => void }) {
  const columns: Array<{ id: StudioStatus; title: string }> = [
    { id: 'waiting', title: 'Do startu' },
    { id: 'active', title: 'W toku' },
    { id: 'accept', title: 'Czeka na akcept' },
    { id: 'overdue', title: 'Zalegle' },
  ]

  return (
    <div className="grid w-max min-w-[980px] grid-cols-4 gap-3">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.statusId === column.id)
        return (
          <section key={column.id} className="flex h-[min(620px,calc(100vh-260px))] min-h-[420px] min-w-0 flex-col rounded-md border border-border bg-background">
            <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: statusDot[column.id] }} />
                <p className="truncate text-sm font-semibold">{column.title}</p>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{columnTasks.length}</span>
              </div>
              <button className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted" title="Dodaj zadanie">
                <Plus size={14} />
              </button>
            </header>
            <div className="madi-scroll-area flex-1 space-y-2 p-2">
              {columnTasks.length ? (
                columnTasks.map((task) => (
                  <StudioTaskCard key={task.id} task={task} selected={task.id === selectedId} onSelect={() => onSelect(task.id)} />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Brak pozycji
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function ListView({ tasks, selectedId, onSelect }: { tasks: StudioTask[]; selectedId: string; onSelect: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: StudioSortKey; direction: SortDirection }>({ key: 'deadline', direction: 'asc' })
  const [widths, setWidths] = useState<Record<string, number>>({
    title: 360,
    status: 150,
    client: 210,
    deadline: 140,
    minutes: 120,
    actions: 48,
  })

  const columns: Array<{ key: keyof typeof widths; label: string; sortKey?: StudioSortKey; min: number }> = [
    { key: 'title', label: 'Zadanie', sortKey: 'title', min: 240 },
    { key: 'status', label: 'Status', sortKey: 'status', min: 120 },
    { key: 'client', label: 'Klient', sortKey: 'client', min: 160 },
    { key: 'deadline', label: 'Termin', sortKey: 'deadline', min: 110 },
    { key: 'minutes', label: 'Czas', sortKey: 'minutes', min: 90 },
    { key: 'actions', label: '', min: 42 },
  ]
  const template = columns.map((column) => `${widths[column.key]}px`).join(' ')
  const sortedTasks = useMemo(() => {
    const valueFor = (task: StudioTask) => {
      if (sort.key === 'status') return statusLabels[task.statusId]
      if (sort.key === 'client') return task.client
      if (sort.key === 'deadline') return task.deadline
      if (sort.key === 'minutes') return task.minutes
      return task.title
    }
    return [...tasks].sort((a, b) => {
      const aValue = valueFor(a)
      const bValue = valueFor(b)
      const result = typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue), 'pl')
      return sort.direction === 'asc' ? result : -result
    })
  }, [sort, tasks])

  const changeSort = (key?: StudioSortKey) => {
    if (!key) return
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const startResize = (key: keyof typeof widths, min: number, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startWidth = widths[key]
    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(min, startWidth + moveEvent.clientX - startX)
      setWidths((current) => ({ ...current, [key]: nextWidth }))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="min-w-[980px] overflow-auto rounded-md border border-border bg-card">
      <div className="grid border-b border-border bg-muted/35 text-[11px] font-semibold uppercase text-muted-foreground" style={{ gridTemplateColumns: template }}>
        {columns.map((column) => (
          <button
            key={column.key}
            type="button"
            onClick={() => changeSort(column.sortKey)}
            className="group relative flex h-9 items-center gap-1 px-3 text-left hover:bg-muted"
          >
            <span className="truncate">{column.label}</span>
            {column.sortKey && sort.key === column.sortKey && (
              <span className="text-primary">{sort.direction === 'asc' ? '↑' : '↓'}</span>
            )}
            <span
              role="separator"
              aria-label={`Zmien szerokosc kolumny ${column.label}`}
              onMouseDown={(event) => startResize(column.key, column.min, event)}
              className="absolute right-0 top-1 h-7 w-1 cursor-col-resize rounded bg-transparent group-hover:bg-primary/50"
            />
          </button>
        ))}
      </div>
      {sortedTasks.map((task) => (
        <button
          key={task.id}
          type="button"
          onClick={() => onSelect(task.id)}
          onDoubleClick={() => openStudioTask(task)}
          className={`grid w-full items-center border-b border-border text-left last:border-b-0 hover:bg-muted/30 ${
            selectedId === task.id ? 'bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]' : ''
          }`}
          style={{ gridTemplateColumns: template }}
        >
          <span className="min-w-0 px-3 py-2.5">
            <span className="block truncate text-sm font-semibold">{task.title}</span>
            <span className="block truncate font-mono text-[11px] text-muted-foreground">{task.orderNumber}</span>
          </span>
          <span className="px-3 py-2.5">
            <span className={`w-fit rounded border px-2 py-1 text-[11px] font-semibold ${statusClasses[task.statusId]}`}>
              {statusLabels[task.statusId]}
            </span>
          </span>
          <span className="truncate px-3 py-2.5 text-xs text-muted-foreground">{task.client}</span>
          <span className={`px-3 py-2.5 ${task.statusId === 'overdue' ? 'text-xs font-semibold text-red-600' : 'text-xs text-muted-foreground'}`}>
            {task.deadline.slice(5)}
          </span>
          <span className="px-3 py-2.5 text-xs text-muted-foreground">{formatMinutes(task.minutes)}</span>
          <span className="flex justify-end px-3 py-2.5">
            <ExternalLink size={14} className="text-muted-foreground" />
          </span>
        </button>
      ))}
    </div>
  )
}

function CalendarView({ tasks, selectedId, onSelect }: { tasks: StudioTask[]; selectedId: string; onSelect: (id: string) => void }) {
  const [mode, setMode] = useState<StudioCalendarMode>('week')
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
  const days = [
    { label: 'Pon', date: '2026-07-13', tasks: tasks.slice(6, 8) },
    { label: 'Wt', date: '2026-07-14', tasks: tasks.slice(8, 11) },
    { label: 'Sr', date: '2026-07-15', tasks: tasks.slice(0, 2) },
    { label: 'Czw', date: '2026-07-16', tasks: [] },
    { label: 'Pt', date: '2026-07-17', tasks: tasks.slice(2, 3) },
  ]

  const calendarDays = mode === 'day'
    ? days.slice(1, 2)
    : mode === 'month'
      ? Array.from({ length: 28 }, (_, index) => ({
          label: `${index + 1}`,
          date: `2026-07-${String(index + 1).padStart(2, '0')}`,
          tasks: tasks.filter((_, taskIndex) => taskIndex % 9 === index % 9).slice(0, index % 4 === 0 ? 2 : 1),
        }))
      : days

  return (
    <div className="min-w-[980px] rounded-md border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <div>
          <h3 className="text-sm font-semibold">Kalendarz grafika</h3>
          <p className="text-xs text-muted-foreground">Dzienny, tygodniowy i miesieczny widok z godzinami pracy {hours[0]}-{hours[hours.length - 1]}.</p>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
          {(['day', 'week', 'month'] as StudioCalendarMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`h-8 rounded px-3 text-xs font-semibold ${
                mode === item ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item === 'day' ? 'Dzien' : item === 'week' ? 'Tydzien' : 'Miesiac'}
            </button>
          ))}
        </div>
      </header>
      <div className={`grid w-max min-w-full gap-3 p-3 ${
        mode === 'day' ? 'grid-cols-1' : mode === 'month' ? 'grid-cols-7' : 'grid-cols-5'
      }`}>
      {calendarDays.map((day) => {
        const minutes = day.tasks.reduce((sum, task) => sum + task.minutes, 0)
        const load = Math.min(100, Math.round((minutes / DAY_CAPACITY_MINUTES) * 100))
        return (
          <section key={day.date} className="h-[min(640px,calc(100vh-260px))] min-h-[520px] overflow-hidden rounded-md border border-border bg-card">
            <header className="border-b border-border p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{day.label}</p>
                  <p className="text-[11px] text-muted-foreground">{day.date}</p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{load}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${load > 85 ? 'bg-red-500' : load > 65 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${load}%` }} />
              </div>
            </header>
            <div className="madi-scroll-area h-[calc(100%-76px)] space-y-2 p-2">
              {day.tasks.length ? (
                day.tasks.map((task, index) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onSelect(task.id)}
                    onDoubleClick={() => openStudioTask(task)}
                    className={`w-full rounded-md border p-2 text-left hover:bg-muted/35 ${
                      selectedId === task.id ? 'border-primary bg-primary/5' : 'border-border bg-background'
                    }`}
                  >
                    <p className="text-[11px] font-semibold text-primary">{index === 0 ? '08:30' : index === 1 ? '10:30' : '12:40'}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold">{task.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatMinutes(task.minutes)} · {statusLabels[task.statusId]}</p>
                  </button>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Brak zadan</p>
              )}
            </div>
          </section>
        )
      })}
      </div>
    </div>
  )
}

function StudioAside({ task, onOpen, onDone }: { task: StudioTask; onOpen: () => void; onDone: () => void }) {
  return (
    <aside className="flex min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-muted-foreground">{task.orderNumber}</p>
            <h2 className="mt-1 line-clamp-2 text-base font-semibold">{task.title}</h2>
            <p className="mt-1 truncate text-xs text-muted-foreground">{task.client}</p>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Otworz zlecenie w oknie"
          >
            <ExternalLink size={15} />
          </button>
        </div>
      </header>

      <div className="madi-scroll-area flex-1 p-4">
        <section className="rounded-md border border-border bg-card p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Szczegoly</p>
            <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${statusClasses[task.statusId]}`}>
              {statusLabels[task.statusId]}
            </span>
          </div>
          <dl className="grid gap-2 text-sm">
            {[
              ['Typ pracy', task.queueLabel === 'Zalegle' ? 'Grafik - przygotowanie plikow' : task.queueLabel],
              ['Zlecajacy', task.assignee.replace('EEmilka', 'Emilia')],
              ['Termin', task.deadline],
              ['Szacowany czas', formatMinutes(task.minutes)],
              ['Rzeczywisty czas', formatMinutes(task.trackedMinutes)],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[112px_minmax(0,1fr)] gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0">
                <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-3 rounded-md border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Opis</p>
          <p className="rounded-md bg-muted/45 p-3 text-sm leading-relaxed">{task.note}</p>
        </section>

        <section className="mt-3 rounded-md border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Sciezka do plikow</p>
            <button className="text-xs font-semibold text-primary">Kopiuj</button>
          </div>
          <p className="break-words font-mono text-xs text-primary">{task.path}</p>
        </section>

        <section className="mt-3 rounded-md border border-border bg-card p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Komentarze</p>
            <button className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-semibold hover:bg-muted">
              <Plus size={13} /> Dodaj
            </button>
          </div>
          <div className="space-y-2">
            {task.comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-border bg-background p-2">
                <div className="mb-1 flex items-center gap-2">
                  <UserAvatar label={comment.author} color="#4c6ef5" size="sm" />
                  <p className="text-xs font-semibold">{comment.author}</p>
                </div>
                <p className="text-xs text-muted-foreground">{comment.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="shrink-0 border-t border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <button className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Play size={14} /> Start
          </button>
          <button onClick={onDone} className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold hover:bg-muted">
            <CheckCircle2 size={14} /> Gotowe
          </button>
          <button className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold hover:bg-muted">
            <MessageSquare size={14} /> Komentarz
          </button>
          <button onClick={onOpen} className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold hover:bg-muted">
            <ExternalLink size={14} /> Okno
          </button>
        </div>
      </footer>
    </aside>
  )
}

function StudioActivityAside({ tasks, selectedTask, onSelect, onOpen, onDone }: {
  tasks: StudioTask[]
  selectedTask: StudioTask
  onSelect: (id: string) => void
  onOpen: () => void
  onDone: () => void
}) {
  const [channel, setChannel] = useState<'activity' | 'updates' | 'alerts' | 'comments' | 'assignments'>('activity')
  const activityItems = tasks.slice(0, 9).map((task, index) => ({
    id: `${task.id}-activity`,
    task,
    kind: task.statusId === 'overdue' ? 'alerts' : task.comments.length ? 'comments' : index % 3 === 0 ? 'assignments' : 'updates',
    actor: task.assignee.replace('EEmilka', 'Emilia'),
    initials: task.assignee.replace('EEmilka', 'Emilia').slice(0, 2).toUpperCase(),
    message: task.statusId === 'overdue'
      ? 'blokuje kolejke graficzna'
      : task.statusId === 'accept'
        ? 'czeka na akcept klienta'
        : index % 3 === 0
          ? 'przypisal(a) zadanie DTP'
          : 'zmienil(a) status przygotowania',
  }))
  const filteredItems = channel === 'activity' ? activityItems : activityItems.filter((item) => item.kind === channel)
  const unreadCount = activityItems.filter((item) => item.kind === 'alerts' || item.kind === 'comments').length
  const tabs = [
    { id: 'activity' as const, label: 'Aktywnosc', icon: <Activity size={14} /> },
    { id: 'updates' as const, label: 'Aktualizacje', icon: <Bell size={14} /> },
    { id: 'alerts' as const, label: 'Alerty', icon: <AlertTriangle size={14} /> },
    { id: 'comments' as const, label: 'Komentarze', icon: <MessageSquare size={14} /> },
    { id: 'assignments' as const, label: 'Przypisania', icon: <UserPlus size={14} /> },
  ]

  return (
    <aside className="flex min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Aktywnosc</h2>
            {unreadCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {unreadCount} nowe
              </span>
            )}
          </div>
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="Oznacz jako przeczytane">
            <CheckCheck size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChannel(tab.id)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                channel === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="madi-scroll-area flex-1 p-2">
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.task.id)}
              onDoubleClick={() => openStudioTask(item.task)}
              className={`flex w-full gap-2.5 rounded-md px-2.5 py-2.5 text-left transition hover:bg-muted/60 ${
                item.kind === 'alerts'
                  ? 'border border-destructive/35 bg-destructive/[0.07]'
                  : item.task.id === selectedTask.id
                    ? 'border border-primary/25 bg-primary/[0.06]'
                    : ''
              }`}
            >
              <div className="relative shrink-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {item.initials}
                </span>
                <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${
                  item.kind === 'alerts' ? 'bg-destructive' : item.kind === 'comments' ? 'bg-amber-500' : 'bg-muted-foreground'
                }`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-snug">
                  <span className="font-medium">{item.actor}</span>{' '}
                  <span className="text-muted-foreground">{item.message}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground/70">{item.task.orderNumber}</span>
                  <span className="truncate text-[10px] text-muted-foreground">{item.task.client}</span>
                  <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${item.task.statusId === 'overdue' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                    {statusLabels[item.task.statusId]}
                  </span>
                </div>
                {item.task.comments[0] && (
                  <p className="mt-1 flex items-start gap-1 text-[11px] italic text-muted-foreground">
                    <MessageSquare size={10} className="mt-0.5 shrink-0" />
                    {item.task.comments[0].text}
                  </p>
                )}
                <span className="mt-1 block text-[10px] text-muted-foreground/70">{item.task.deadline}</span>
              </div>
            </button>
          ))}
          {!filteredItems.length && (
            <p className="px-3 py-8 text-center text-[12px] text-muted-foreground">Brak wpisow w tej kategorii</p>
          )}
        </div>

        <section className="mt-3 rounded-md border border-border bg-card p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-muted-foreground">{selectedTask.orderNumber}</p>
              <h3 className="mt-1 line-clamp-2 text-base font-semibold">{selectedTask.title}</h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">{selectedTask.client}</p>
            </div>
            <span className={`shrink-0 rounded border px-2 py-1 text-[11px] font-semibold ${statusClasses[selectedTask.statusId]}`}>
              {statusLabels[selectedTask.statusId]}
            </span>
          </div>
          <dl className="grid gap-2 text-sm">
            {[
              ['Typ pracy', selectedTask.queueLabel === 'Zalegle' ? 'Grafik - przygotowanie plikow' : selectedTask.queueLabel],
              ['Termin', selectedTask.deadline],
              ['Plan', formatMinutes(selectedTask.minutes)],
              ['Czas', formatMinutes(selectedTask.trackedMinutes)],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0">
                <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 rounded-md bg-muted/45 p-3 text-xs leading-relaxed text-muted-foreground">
            {selectedTask.note}
          </div>
        </section>
      </div>

      <footer className="shrink-0 border-t border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <button className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Play size={14} /> Start
          </button>
          <button onClick={onDone} className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold hover:bg-muted">
            <CheckCircle2 size={14} /> Gotowe
          </button>
          <button className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold hover:bg-muted">
            <MessageSquare size={14} /> Komentarz
          </button>
          <button onClick={onOpen} className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold hover:bg-muted">
            <ExternalLink size={14} /> Okno
          </button>
        </div>
      </footer>
    </aside>
  )
}

function GraphicCorrectionModal({
  task,
  onClose,
  onSave,
}: {
  task: StudioTask
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <section className="w-full max-w-3xl rounded-md border border-border bg-popover p-5 text-popover-foreground shadow-2xl">
        <header className="mb-4">
          <h2 className="text-lg font-semibold">Poprawka / komentarz do grafika</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zapisuje poprawke jako komentarz i pozwala wskazac nowa date, godzine oraz szacowany czas poprawki.
          </p>
        </header>

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            Powod poprawki
            <select className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" defaultValue="">
              <option value="" disabled>-- wybierz --</option>
              <option>Blad przygotowania plikow</option>
              <option>Blad obslugi zlecenia</option>
              <option>Blad produkcyjny / technologiczny</option>
              <option>Blad po stronie klienta</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            Komentarz / co poprawic
            <textarea
              className="min-h-24 resize-y rounded-md border border-border bg-background p-3 font-mono text-sm text-foreground outline-none focus:border-primary"
              placeholder="np. klient doslal uwagi: 1) zmienic tekst, 2) podmienic logo, 3) wyslac ponownie do akceptu"
              defaultValue={task.note}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Nowa data
              <input type="date" className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" defaultValue="2026-07-14" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Godzina
              <input type="time" className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" defaultValue="12:40" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Czas poprawki
              <input type="number" className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" defaultValue={60} />
            </label>
          </div>
        </div>

        <footer className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md bg-muted px-3 py-2 text-sm font-semibold hover:bg-muted/80">
            Anuluj
          </button>
          <button onClick={onSave} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Zapisz poprawke
          </button>
        </footer>
      </section>
    </div>
  )
}

export function StudioWorkload({
  initialView = 'overview',
  title = 'Projektowanie/DTP',
  kicker = 'Dzial graficzny',
  description = 'Aktywne zadanie, plan dnia, kolejka projektowania i DTP, akcepty, komentarze oraz czas pracy w ukladzie jak widok startowy.',
}: {
  initialView?: StudioView
  title?: string
  kicker?: string
  description?: string
}) {
  const [view, setView] = useState<StudioView>(initialView)
  const [selectedId, setSelectedId] = useState(newestWaitingTask(allStudioTasks)?.id ?? allStudioTasks[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [running, setRunning] = useState(false)
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set())
  const [correctionTask, setCorrectionTask] = useState<StudioTask | null>(null)

  useEffect(() => {
    setView(initialView)
  }, [initialView])

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const availableTasks = allStudioTasks.filter((task) => !doneIds.has(task.id))
    if (!normalized) return availableTasks
    return availableTasks.filter((task) =>
      [task.title, task.client, task.orderNumber, task.queueLabel, task.statusLabel].join(' ').toLowerCase().includes(normalized)
    )
  }, [doneIds, query])

  const selectedTask = filteredTasks.find((task) => task.id === selectedId) ?? newestWaitingTask(filteredTasks) ?? filteredTasks[0] ?? allStudioTasks[0]
  const plannedMinutes = filteredTasks.reduce((sum, task) => sum + task.minutes, 0)
  const trackedMinutes = filteredTasks.reduce((sum, task) => sum + task.trackedMinutes, 0)
  const load = Math.round((plannedMinutes / DAY_CAPACITY_MINUTES) * 100)

  const openSelected = () => selectedTask && openStudioTask(selectedTask)
  const markDone = (taskId: string) => {
    setDoneIds((current) => {
      const next = new Set(current)
      next.add(taskId)
      return next
    })
    setRunning(false)
  }

  return (
    <ModuleFrame
      title={title}
      kicker={kicker}
      description={description}
      icon={<Timer size={13} />}
      actions={<StudioViewSwitch value={view} onChange={setView} />}
      summary={view === 'overview' ? undefined : (
        <StatStrip
          items={[
            { label: 'W kolejce', value: filteredTasks.length, hint: 'widoczne po filtrach' },
            { label: 'Plan', value: formatMinutes(plannedMinutes), hint: `${load}% dziennego limitu`, tone: load > 100 ? 'text-red-600' : 'text-primary' },
            { label: 'Czas aktywny', value: formatMinutes(trackedMinutes), hint: 'zarejestrowany dzis' },
            { label: 'Zalegle', value: filteredTasks.filter((task) => task.statusId === 'overdue').length, hint: 'do reakcji', tone: 'text-red-600' },
          ]}
        />
      )}
      bodyClassName="overflow-hidden bg-workspace-surface"
      aside={selectedTask ? (
        <StudioActivityAside
          tasks={filteredTasks}
          selectedTask={selectedTask}
          onSelect={setSelectedId}
          onOpen={openSelected}
          onDone={() => markDone(selectedTask.id)}
        />
      ) : undefined}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-border bg-background px-[var(--app-module-pad-x)] py-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 min-w-[260px] flex-1 items-center gap-2 rounded-md border border-border bg-muted/35 px-3 text-sm text-muted-foreground">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Szukaj zadania, klienta, ZG..."
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold hover:bg-muted">
              <PanelRightOpen size={14} /> Panel
            </button>
            <button onClick={openSelected} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <ExternalLink size={14} /> Otworz zlecenie
            </button>
          </div>
        </div>

        <div className="madi-scroll-area flex-1 p-[var(--app-module-gap)]">
          {view === 'overview' && (
            <OverviewView
              tasks={filteredTasks}
              selectedTask={selectedTask}
              running={running}
              onToggleRunning={() => setRunning((value) => !value)}
              onDone={() => markDone(selectedTask.id)}
              onRework={() => setCorrectionTask(selectedTask)}
              onSelect={setSelectedId}
              onOpen={openSelected}
            />
          )}
          {view === 'board' && <BoardView tasks={filteredTasks} selectedId={selectedTask?.id ?? ''} onSelect={setSelectedId} />}
          {view === 'list' && <ListView tasks={filteredTasks} selectedId={selectedTask?.id ?? ''} onSelect={setSelectedId} />}
          {view === 'calendar' && <CalendarView tasks={filteredTasks} selectedId={selectedTask?.id ?? ''} onSelect={setSelectedId} />}
        </div>
      </div>
      {correctionTask && (
        <GraphicCorrectionModal
          task={correctionTask}
          onClose={() => setCorrectionTask(null)}
          onSave={() => setCorrectionTask(null)}
        />
      )}
    </ModuleFrame>
  )
}
