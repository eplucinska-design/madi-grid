'use client'

import { useEffect, useState } from 'react'
import { format, isToday, isPast } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  Play,
  Pause,
  Square,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Folder,
  Clock,
  Building2,
  User,
  MessageSquare,
  Flame,
} from 'lucide-react'
import type { WorkTask } from '@/lib/types'
import { WORK_TASK_STATUS_CONFIG, WORK_TYPE_CONFIG, formatMinutes } from '@/lib/data/workspace-data'
import { PRIORITY_CONFIG } from '@/lib/store/orders-store'
import { useStartStore } from '@/lib/store/start-store'
import { openOrderWindow } from '@/lib/utils/order-links'

function useTimerTick(active: boolean) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [active])
}

function formatClock(ms: number) {
  const total = Math.floor(ms / 1000)
  const hh = String(Math.floor(total / 3600)).padStart(2, '0')
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function ActionButton({
  onClick,
  icon,
  label,
  variant = 'ghost',
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  variant?: 'primary' | 'ghost' | 'danger' | 'success'
}) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    success: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
    danger: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
    ghost: 'bg-background/60 text-foreground hover:bg-background border border-border',
  }[variant]
  return (
    <button
      onClick={onClick}
      className={`flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors ${styles}`}
    >
      {icon}
      {label}
    </button>
  )
}

interface ActiveTaskCardProps {
  task: WorkTask
  onMarkDone: (id: string) => void
  onSendToRework: (id: string) => void
}

export function ActiveTaskCard({ task, onMarkDone, onSendToRework }: ActiveTaskCardProps) {
  const {
    timerStatus,
    activeTimerTaskId,
    startTimer,
    pauseTimer,
    stopTimer,
    getElapsedMs,
    setLastOpenedTask,
  } = useStartStore()

  const isThisRunning = activeTimerTaskId === task.id && timerStatus === 'running'
  const isThisActive = activeTimerTaskId === task.id
  useTimerTick(isThisRunning)

  const baseWorkedMs = task.workedMinutes * 60 * 1000
  const sessionMs = isThisActive ? getElapsedMs() : 0
  const totalWorkedMs = baseWorkedMs + sessionMs
  const plannedMs = task.plannedMinutes * 60 * 1000
  const progress = plannedMs > 0 ? Math.min((totalWorkedMs / plannedMs) * 100, 100) : 0
  const overBudget = totalWorkedMs > plannedMs

  const workColor = WORK_TYPE_CONFIG[task.workType]?.color ?? '#868e96'
  const overdue = isPast(task.deadline) && !isToday(task.deadline)

  const openOrder = () => openOrderWindow(task.orderId, task.orderNumber)

  return (
    <div onDoubleClick={openOrder} className="madi-responsive-card madi-active-task-card relative overflow-hidden rounded-md border border-primary/30 bg-card shadow-lg shadow-primary/5">
      {/* Accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

      <div className="p-[var(--app-module-gap)]">
        <div className="madi-active-task-top mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <span className={`h-1.5 w-1.5 rounded-full bg-primary ${isThisRunning ? 'animate-pulse' : ''}`} />
              Moje aktywne zadanie
            </span>
            {task.isUrgent && (
              <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                <Flame size={12} /> Pilne
              </span>
            )}
          </div>
          <span className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${WORK_TASK_STATUS_CONFIG[task.status].className}`}>
            {WORK_TASK_STATUS_CONFIG[task.status].label}
          </span>
        </div>

        <div className="madi-active-task-main flex flex-col gap-[var(--app-module-gap)] lg:flex-row lg:items-start lg:justify-between">
          {/* Left: details */}
          <div className="min-w-0 flex-1">
            <h2 className="text-balance text-lg font-semibold text-foreground">{task.title}</h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded px-2 py-0.5 text-[11px] font-medium"
                style={{ color: workColor, background: `${workColor}1a` }}
              >
                {task.workType}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_CONFIG[task.priority].color }} />
                {PRIORITY_CONFIG[task.priority].label}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{task.department}</span>
            </div>

            <div className="madi-active-task-info mt-4 grid gap-x-6 gap-y-2.5 text-[13px]">
              <InfoRow icon={<Building2 size={14} />} label="Klient" value={task.customerName} />
              <InfoRow icon={<ExternalLink size={14} />} label="Zlecenie" value={task.orderNumber ?? '—'} mono />
              <InfoRow
                icon={<Clock size={14} />}
                label="Deadline"
                value={format(task.deadline, "d MMM · HH:mm", { locale: pl })}
                valueClass={overdue ? 'text-destructive font-medium' : isToday(task.deadline) ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}
              />
              <InfoRow icon={<User size={14} />} label="Zlecający" value={task.requestedByName} />
              <InfoRow icon={<Folder size={14} />} label="Pliki" value={task.filesPath} mono className="sm:col-span-2" />
            </div>

            {task.lastComment && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: task.lastComment.authorColor }}
                >
                  {task.lastComment.authorInitials}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground">
                    {task.lastComment.author}
                    <span className="ml-1.5 font-normal text-muted-foreground">ostatni komentarz</span>
                  </p>
                  <p className="mt-0.5 flex items-start gap-1 text-[12px] text-muted-foreground">
                    <MessageSquare size={12} className="mt-0.5 shrink-0" />
                    {task.lastComment.text}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: timer */}
          <div className="madi-active-task-timer flex shrink-0 flex-col items-center gap-3 rounded-md border border-border bg-background/60 p-3 lg:w-48">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Czas pracy
            </span>
            <span className={`font-mono text-2xl font-semibold tabular-nums ${overBudget ? 'text-destructive' : 'text-foreground'}`}>
              {formatClock(totalWorkedMs)}
            </span>
            <div className="w-full">
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Plan: {formatMinutes(task.plannedMinutes)}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${overBudget ? 'bg-destructive' : progress >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            {isThisRunning ? (
              <button
                onClick={pauseTimer}
                className="flex h-[var(--app-control-height)] w-full items-center justify-center gap-1.5 rounded-md bg-amber-500 px-3 text-[13px] font-medium text-white hover:bg-amber-500/90"
              >
                <Pause size={15} /> Pauza
              </button>
            ) : (
              <button
                onClick={() => {
                  startTimer(task.id)
                  setLastOpenedTask(task.assignedToId, task.id)
                }}
                className="flex h-[var(--app-control-height)] w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Play size={15} /> {isThisActive ? 'Wznów' : 'Start'}
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="madi-card-actions mt-[var(--app-module-gap)] flex flex-wrap items-center gap-2 border-t border-border pt-[var(--app-module-gap)]">
          {isThisRunning ? (
            <ActionButton onClick={pauseTimer} icon={<Pause size={15} />} label="Pauza" variant="ghost" />
          ) : (
            <ActionButton
              onClick={() => {
                startTimer(task.id)
                setLastOpenedTask(task.assignedToId, task.id)
              }}
              icon={<Play size={15} />}
              label="Start"
              variant="primary"
            />
          )}
          <ActionButton onClick={stopTimer} icon={<Square size={15} />} label="Stop" variant="ghost" />
          <ActionButton onClick={() => onMarkDone(task.id)} icon={<CheckCircle2 size={15} />} label="Koniec" variant="success" />
          <ActionButton onClick={() => onSendToRework(task.id)} icon={<RotateCcw size={15} />} label="Do poprawki" variant="danger" />
          <div className="flex-1" />
          <ActionButton onClick={openOrder} icon={<ExternalLink size={15} />} label="Otwórz zlecenie" variant="ghost" />
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  mono,
  valueClass = '',
  className = '',
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  valueClass?: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className={`min-w-0 truncate text-foreground ${mono ? 'font-mono text-[12px]' : ''} ${valueClass}`} title={value}>
        {value}
      </span>
    </div>
  )
}
