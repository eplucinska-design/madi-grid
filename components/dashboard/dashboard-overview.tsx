'use client'

import { AlertTriangle, CalendarClock, CheckCircle2, Factory, MessageSquare, Timer, TrendingUp } from 'lucide-react'
import { GRID_STATUSES, useGridStore, type GridTask } from '@/lib/store/grid-store'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import { AssigneeAvatarStack } from '@/components/common/assignee-avatar-stack'
import { openOrderWindow } from '@/lib/utils/order-links'

function dueSoon(task: GridTask) {
  const today = new Date('2026-07-10T00:00:00')
  const due = new Date(`${task.dueDate}T00:00:00`)
  const diff = (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  return diff >= 0 && diff <= 2 && task.status !== 'done'
}

function MiniTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ size?: number; className?: string }>
  tone?: string
}) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon size={17} className="text-muted-foreground" />
      </div>
      <p className={`text-xl font-semibold ${tone ?? ''}`}>{value}</p>
    </div>
  )
}

function latestComment(task: GridTask) {
  return [...task.comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

function DashboardCommentBadge({ task }: { task: GridTask }) {
  const comment = latestComment(task)
  if (!comment) return null
  const pinned = task.comments.some((item) => item.pinned)

  return (
    <span
      className={`group/comment relative inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-orange-400/80 bg-orange-50 px-2 text-[11px] font-semibold text-orange-700 dark:border-orange-400/50 dark:bg-orange-950/45 dark:text-orange-200 ${
        pinned ? 'madi-comment-alert-pulse' : 'madi-comment-pulse'
      }`}
      title={comment.content}
    >
      <MessageSquare size={12} />
      {task.comments.length}
      <span className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 hidden w-[min(300px,70vw)] rounded-md border border-orange-300 bg-popover p-3 text-left text-popover-foreground shadow-xl group-hover/comment:block">
        <span className="mb-1 block text-[11px] font-semibold text-orange-700 dark:text-orange-200">
          {pinned ? 'Przypieta uwaga' : 'Ostatni komentarz'}
        </span>
        <span className="block whitespace-normal text-xs font-normal leading-snug text-foreground">{comment.content}</span>
        <span className="mt-1 block truncate text-[10px] font-normal text-muted-foreground">{comment.authorName}</span>
      </span>
    </span>
  )
}

export function DashboardOverview() {
  const { tasks, lists } = useGridStore()
  const openTasks = tasks.filter((task) => task.status !== 'done')
  const urgent = tasks.filter((task) => task.priority === 'urgent' && task.status !== 'done')
  const blocked = tasks.filter((task) => task.status === 'blocked')
  const soon = tasks.filter(dueSoon)
  const done = tasks.filter((task) => task.status === 'done')
  const tracked = tasks.reduce((sum, task) => sum + task.trackedMinutes, 0)
  const estimated = tasks.reduce((sum, task) => sum + task.estimateMinutes, 0)
  const tasksWithComments = tasks.filter((task) => task.comments.length > 0)

  const byStatus = GRID_STATUSES.map((status) => ({
    ...status,
    count: tasks.filter((task) => task.status === status.id).length,
  }))

  const newest = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8)

  return (
    <ModuleFrame
      title="Dashboard"
      kicker="Centrum operacyjne"
      description="Wspolny podglad zadan, blokad, terminow, ludzi i czasu pracy z modulow."
      icon={<Factory size={13} />}
      summary={
        <StatStrip
          items={[
            { label: 'Otwarte', value: openTasks.length, hint: 'aktywne sprawy' },
            { label: 'Pilne', value: urgent.length, hint: 'priorytet urgent', tone: 'text-[#e03131]' },
            { label: 'Blokady', value: blocked.length, hint: 'wymagaja decyzji', tone: 'text-[#f59f00]' },
            { label: 'Komentarze', value: tasksWithComments.length, hint: 'z uwagami', tone: tasksWithComments.length ? 'text-orange-600' : '' },
          ]}
        />
      }
      bodyClassName="madi-scroll-area p-[var(--app-module-gap)]"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-3">
        <MiniTile label="Otwarte" value={openTasks.length} icon={Factory} />
        <MiniTile label="Pilne" value={urgent.length} icon={AlertTriangle} tone="text-[#e03131]" />
        <MiniTile label="Blokady" value={blocked.length} icon={AlertTriangle} tone="text-[#f59f00]" />
        <MiniTile label="Na 48h" value={soon.length} icon={CalendarClock} />
        <MiniTile label="Gotowe" value={done.length} icon={CheckCircle2} tone="text-[#2f9e44]" />
        <MiniTile label="Czas" value={`${Math.round(tracked / 60)}h`} icon={Timer} />
        <MiniTile label="Komentarze" value={tasksWithComments.length} icon={MessageSquare} tone="text-orange-600" />
      </div>

      <div className="mt-[var(--app-module-gap)] grid grid-cols-1 gap-[var(--app-module-gap)] xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-3 py-2.5">
            <h2 className="text-sm font-semibold">Statusy pracy</h2>
          </div>
          <div className="space-y-3 p-3">
            {byStatus.map((status) => {
              const max = Math.max(...byStatus.map((item) => item.count), 1)
              return (
                <div key={status.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: status.color }} />
                      {status.label}
                    </span>
                    <span className="text-muted-foreground">{status.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${(status.count / max) * 100}%`, background: status.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-3 py-2.5">
            <h2 className="text-sm font-semibold">Ostatnie zmiany</h2>
          </div>
          <div className="divide-y divide-border">
            {newest.map((task) => (
              <button
                key={task.id}
                onDoubleClick={() => openOrderWindow(task.id, task.orderNumber)}
                className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {lists.find((list) => list.id === task.listId)?.name ?? 'Lista'} - {task.customerName || 'bez klienta'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <DashboardCommentBadge task={task} />
                  <AssigneeAvatarStack ids={task.assigneeIds} size="sm" showEmpty={false} />
                  <TrendingUp size={15} className="text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-[var(--app-module-gap)] rounded-md border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <h2 className="text-sm font-semibold">Komentarze do sprawdzenia</h2>
          <MessageSquare size={16} className="text-orange-600" />
        </div>
        <div className="grid gap-2 p-3 lg:grid-cols-2">
          {tasksWithComments.slice(0, 6).map((task) => {
            const comment = latestComment(task)
            const pinned = task.comments.some((item) => item.pinned)
            return (
              <div
                key={task.id}
                onDoubleClick={() => openOrderWindow(task.id, task.orderNumber)}
                className={`rounded-md border p-3 ${
                  pinned
                    ? 'madi-comment-alert-pulse border-orange-400/70 bg-orange-50 dark:bg-orange-950/35'
                    : 'border-border bg-background'
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{task.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{task.orderNumber || 'Bez numeru'} · {task.customerName || 'bez klienta'}</p>
                  </div>
                  <DashboardCommentBadge task={task} />
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{comment?.content}</p>
              </div>
            )
          })}
          {tasksWithComments.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground lg:col-span-2">
              Brak komentarzy do pokazania.
            </div>
          )}
        </div>
      </div>
    </ModuleFrame>
  )
}
