'use client'

import { format, isPast, isToday, differenceInHours } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Ban, Flame, AlertTriangle } from 'lucide-react'
import { useOrdersStore, STATUS_CONFIG, STAGE_CONFIG } from '@/lib/store/orders-store'
import { DEMO_USERS } from '@/lib/store/auth-store'
import { useAppStore } from '@/lib/store/app-store'
import type { Order } from '@/lib/types'

const ACTIVE_STATUSES: Order['status'][] = [
  'in_production',
  'finishing',
  'packaging',
  'ready_for_production',
  'pending_approval',
]

function ProductionRow({ order }: { order: Order }) {
  const { selectOrder } = useOrdersStore()
  const { setCurrentModule } = useAppStore()
  const responsible = DEMO_USERS.find((u) => u.id === order.assignedTo[0])
  const atRisk = isToday(order.dueDate) || (isPast(order.dueDate) && !isToday(order.dueDate)) || differenceInHours(order.dueDate, new Date()) <= 24
  const isBlocking = order.status === 'waiting_for_files' || order.status === 'on_hold'
  const isUrgent = order.priority === 'urgent'

  return (
    <button
      onClick={() => {
        selectOrder(order.id)
        setCurrentModule('orders')
      }}
      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/40"
    >
      <span className={`h-8 w-1 shrink-0 rounded-full`} style={{ background: STATUS_CONFIG[order.status].color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-foreground">{order.title}</span>
          {isUrgent && <Flame size={11} className="shrink-0 text-destructive" />}
          {isBlocking && <Ban size={11} className="shrink-0 text-destructive" />}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-mono text-[10px] text-muted-foreground/70">{order.orderNumber}</span>
          <span className="text-[11px] text-muted-foreground">· Etap: {STAGE_CONFIG[order.stage].label}</span>
        </div>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_CONFIG[order.status].bgClass}`}>
          {STATUS_CONFIG[order.status].label}
        </span>
        <span className={`text-[10px] ${atRisk ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
          {atRisk && <AlertTriangle size={9} className="mr-0.5 inline" />}
          {format(order.dueDate, 'd MMM', { locale: pl })}
        </span>
      </div>
      {responsible && (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ background: responsible.avatarColor }}
          title={responsible.name}
        >
          {responsible.initials}
        </span>
      )}
    </button>
  )
}

export function ProductionPanel() {
  const { orders } = useOrdersStore()
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
  const blocking = active.filter((o) => o.status === 'waiting_for_files' || o.status === 'on_hold').length
  const urgent = active.filter((o) => o.priority === 'urgent').length
  const atRisk = active.filter((o) => isToday(o.dueDate) || (isPast(o.dueDate) && !isToday(o.dueDate))).length

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Stat label="W produkcji" value={active.length} />
        <Stat label="Pilne" value={urgent} tone={urgent > 0 ? 'danger' : 'muted'} />
        <Stat label="Zagrożone" value={atRisk} tone={atRisk > 0 ? 'warn' : 'muted'} />
        <Stat label="Blokujące" value={blocking} tone={blocking > 0 ? 'danger' : 'muted'} />
      </div>
      <div className="space-y-1">
        {active.slice(0, 6).map((order) => (
          <ProductionRow key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, tone = 'muted' }: { label: string; value: number; tone?: 'muted' | 'danger' | 'warn' }) {
  const toneClass = {
    muted: 'text-foreground',
    danger: 'text-destructive',
    warn: 'text-amber-600 dark:text-amber-400',
  }[tone]
  return (
    <div className="flex flex-1 flex-col rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className={`text-lg font-semibold tabular-nums ${toneClass}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  )
}
