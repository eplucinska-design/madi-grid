'use client'

import { format, isToday, isTomorrow, isPast, differenceInHours } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Clock, Play, Check, Flame, ExternalLink, MessageSquare, Ban } from 'lucide-react'
import type { WorkTask } from '@/lib/types'
import { WORK_TASK_STATUS_CONFIG, WORK_TYPE_CONFIG, formatMinutes } from '@/lib/data/workspace-data'
import { PRIORITY_CONFIG } from '@/lib/store/orders-store'
import { useStartStore } from '@/lib/store/start-store'
import { openOrderWindow } from '@/lib/utils/order-links'

function Deadline({ date }: { date: Date }) {
  const overdue = isPast(date) && !isToday(date)
  let label: string
  let cls = 'text-[11px] font-semibold '

  if (overdue) {
    label = `Zalegle - ${format(date, 'd MMM', { locale: pl })}`
    cls += 'text-destructive'
  } else if (isToday(date)) {
    const hours = differenceInHours(date, new Date())
    label = hours <= 0 ? 'Dzis' : `Dzis - ${format(date, 'HH:mm')}`
    cls += 'text-amber-600 dark:text-amber-400'
  } else if (isTomorrow(date)) {
    label = 'Jutro'
    cls += 'text-amber-600 dark:text-amber-400'
  } else {
    label = format(date, 'd MMM', { locale: pl })
    cls += 'text-muted-foreground'
  }

  return <span className={cls}>{label}</span>
}

interface TaskRowProps {
  task: WorkTask
  onMarkDone?: (id: string) => void
}

export function TaskRow({ task, onMarkDone }: TaskRowProps) {
  const { startTimer, setLastOpenedTask } = useStartStore()
  const workColor = WORK_TYPE_CONFIG[task.workType]?.color ?? '#868e96'
  const overdue = isPast(task.deadline) && !isToday(task.deadline)

  const openOrder = () => openOrderWindow(task.orderId, task.orderNumber)

  return (
    <div
      onDoubleClick={openOrder}
      className={`madi-responsive-card madi-start-task-row group relative overflow-visible rounded-md border bg-background p-3 pl-4 transition-colors hover:bg-muted/35 ${
        overdue ? 'border-destructive/35 bg-destructive/5' : 'border-border'
      }`}
    >
      <span
        className="absolute bottom-3 left-3 top-3 w-1 rounded-full"
        style={{ background: PRIORITY_CONFIG[task.priority].color }}
        title={PRIORITY_CONFIG[task.priority].label}
      />

      <div className="min-w-0 pl-3">
        <div className="madi-start-task-head flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{task.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ color: workColor, background: `${workColor}1a` }}
              >
                {task.workType}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${WORK_TASK_STATUS_CONFIG[task.status].className}`}>
                {WORK_TASK_STATUS_CONFIG[task.status].label}
              </span>
              {task.isUrgent && (
                <span className="flex shrink-0 items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                  <Flame size={10} /> Pilne
                </span>
              )}
              {task.isBlocking && (
                <span className="flex shrink-0 items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                  <Ban size={10} /> Blokuje
                </span>
              )}
            </div>
          </div>

          <div className="madi-start-task-actions flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button
              onClick={() => {
                startTimer(task.id)
                setLastOpenedTask(task.assignedToId, task.id)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
              title="Uruchom timer"
            >
              <Play size={14} />
            </button>
            {onMarkDone && (
              <button
                onClick={() => onMarkDone(task.id)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                title="Oznacz jako gotowe"
              >
                <Check size={14} />
              </button>
            )}
            {task.lastComment && (
              <button
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                title={task.lastComment.text}
              >
                <MessageSquare size={14} />
              </button>
            )}
            <button
              onClick={openOrder}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              title="Otworz zlecenie"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

        <div className="madi-start-task-meta mt-3 grid min-w-0 gap-1.5 text-[11px]">
          <span className="truncate text-muted-foreground" title={task.customerName}>
            {task.customerName}
          </span>
          {task.orderNumber && (
            <span className="truncate font-mono text-muted-foreground/80" title={task.orderNumber}>
              {task.orderNumber}
            </span>
          )}
          <Deadline date={task.deadline} />
          <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
            <Clock size={11} className="shrink-0" />
            <span className="truncate">{formatMinutes(task.workedMinutes)} / {formatMinutes(task.plannedMinutes)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
