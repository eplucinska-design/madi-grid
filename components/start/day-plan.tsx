'use client'

import { useState } from 'react'
import { isPast, isToday } from 'date-fns'
import { Coffee, Sparkles, GripVertical, Play, Check, Flame, Ban, Clock, AlertCircle } from 'lucide-react'
import type { WorkTask, DayPlanEntry } from '@/lib/types'
import { WORK_TYPE_CONFIG, formatMinutes } from '@/lib/data/workspace-data'
import { PRIORITY_CONFIG } from '@/lib/store/orders-store'
import { useStartStore } from '@/lib/store/start-store'

interface DayPlanProps {
  entries: DayPlanEntry[]
  tasks: Record<string, WorkTask>
  userId: string
  onMarkDone: (id: string) => void
  onToggleUrgent: (id: string) => void
}

export function DayPlan({ entries, tasks, userId, onMarkDone, onToggleUrgent }: DayPlanProps) {
  const { startTimer, setPlanOrder, getPrefs } = useStartStore()
  const prefs = getPrefs(userId)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Apply saved order if present
  const ordered = (() => {
    if (!prefs.planOrder) return entries
    const map = new Map(entries.map((e) => [e.id, e]))
    const result: DayPlanEntry[] = []
    prefs.planOrder.forEach((id) => {
      const e = map.get(id)
      if (e) {
        result.push(e)
        map.delete(id)
      }
    })
    map.forEach((e) => result.push(e))
    return result
  })()

  // Overdue tasks that belong to plan tasks are shown at the top with red highlight
  const overdueTaskEntries = ordered.filter((e) => {
    if (e.type !== 'task' && e.type !== 'micro') return false
    const t = e.taskId ? tasks[e.taskId] : undefined
    return t && isPast(t.deadline) && !isToday(t.deadline)
  })

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setOverId(null)
      return
    }
    const ids = ordered.map((e) => e.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    ids.splice(to, 0, ids.splice(from, 1)[0])
    setPlanOrder(userId, ids)
    setDragId(null)
    setOverId(null)
  }

  return (
    <div className="space-y-1.5">
      {overdueTaskEntries.length > 0 && (
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-[12px] font-medium text-destructive">
          <AlertCircle size={14} />
          {overdueTaskEntries.length} zaległe zadania na początku planu – wymagają reakcji
        </div>
      )}
      {ordered.map((entry) => {
        const task = entry.taskId ? tasks[entry.taskId] : undefined
        const isOverdue = task && isPast(task.deadline) && !isToday(task.deadline)

        return (
          <div
            key={entry.id}
            draggable
            onDragStart={() => setDragId(entry.id)}
            onDragOver={(e) => {
              e.preventDefault()
              setOverId(entry.id)
            }}
            onDrop={() => handleDrop(entry.id)}
            onDragEnd={() => {
              setDragId(null)
              setOverId(null)
            }}
            className={`flex items-stretch gap-2 rounded-lg transition-colors ${
              overId === entry.id ? 'ring-1 ring-primary' : ''
            } ${dragId === entry.id ? 'opacity-50' : ''}`}
          >
            {/* Time gutter */}
            <div className="flex w-14 shrink-0 flex-col items-end justify-center pr-1">
              <span className="font-mono text-[12px] font-medium text-foreground">{entry.time}</span>
              {entry.endTime && <span className="font-mono text-[10px] text-muted-foreground">{entry.endTime}</span>}
            </div>

            {/* Content */}
            {entry.type === 'break' && (
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                <Coffee size={14} />
                {entry.label}
              </div>
            )}
            {entry.type === 'free' && (
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground">
                <Sparkles size={14} />
                {entry.label}
              </div>
            )}
            {(entry.type === 'task' || entry.type === 'micro') && task && (
              <div
                className={`group flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 ${
                  isOverdue ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'
                }`}
              >
                <GripVertical size={13} className="shrink-0 cursor-grab text-muted-foreground/40 active:cursor-grabbing" />
                <span
                  className="h-6 w-1 shrink-0 rounded-full"
                  style={{ background: PRIORITY_CONFIG[task.priority].color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {entry.type === 'micro' && (
                      <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                        micro
                      </span>
                    )}
                    <span className="truncate text-[12px] font-medium text-foreground">{task.title}</span>
                    {task.isUrgent && <Flame size={11} className="shrink-0 text-destructive" />}
                    {task.isBlocking && <Ban size={11} className="shrink-0 text-destructive" />}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span
                      className="rounded px-1 py-0.5 text-[9px] font-medium"
                      style={{
                        color: WORK_TYPE_CONFIG[task.workType]?.color,
                        background: `${WORK_TYPE_CONFIG[task.workType]?.color}1a`,
                      }}
                    >
                      {task.workType}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">{task.customerName}</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock size={9} />
                      {formatMinutes(task.plannedMinutes)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => startTimer(task.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    title="Timer"
                  >
                    <Play size={12} />
                  </button>
                  <button
                    onClick={() => onToggleUrgent(task.id)}
                    className={`flex h-6 w-6 items-center justify-center rounded hover:bg-destructive/10 ${task.isUrgent ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
                    title="Oznacz jako pilne"
                  >
                    <Flame size={12} />
                  </button>
                  <button
                    onClick={() => onMarkDone(task.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                    title="Gotowe"
                  >
                    <Check size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
