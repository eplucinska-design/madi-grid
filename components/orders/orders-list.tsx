'use client'

import { format, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { MessageSquare, Paperclip, Clock, ExternalLink } from 'lucide-react'
import { useOrdersStore, STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/store/orders-store'
import { DEMO_USERS } from '@/lib/store/auth-store'
import { openOrderWindow } from '@/lib/utils/order-links'
import type { Order } from '@/lib/types'

function StatusPill({ status }: { status: Order['status'] }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap ${config.bgClass}`}>
      {config.label}
    </span>
  )
}

function PriorityIndicator({ priority }: { priority: Order['priority'] }) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <div className="flex items-center gap-1.5 cursor-pointer group">
      <div 
        className="w-2 h-2 rounded-full"
        style={{ background: config.color }}
      />
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        {config.label}
      </span>
    </div>
  )
}

function AssigneeAvatars({ assignedTo }: { assignedTo: string[] }) {
  const users = assignedTo
    .map(id => DEMO_USERS.find(u => u.id === id))
    .filter(Boolean)
    .slice(0, 3)

  if (users.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">Nieprzypisane</span>
    )
  }

  if (users.length === 1) {
    const user = users[0]!
    const nameParts = user.name.trim().split(/\s+/).filter(Boolean)
    const shortName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1][0]}.` : user.name

    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <div
          className="w-6 h-6 rounded-full flex shrink-0 items-center justify-center text-white text-[10px] font-semibold border-2 border-background"
          style={{ background: user.avatarColor }}
          title={user.name}
        >
          {user.initials}
        </div>
        <span className="truncate text-xs text-muted-foreground" title={user.name}>{shortName}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center -space-x-1.5">
      {users.map((user) => (
        <div
          key={user!.id}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold border-2 border-background"
          style={{ background: user!.avatarColor }}
          title={user!.name}
        >
          {user!.initials}
        </div>
      ))}
      {assignedTo.length > 3 && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium bg-muted text-muted-foreground border-2 border-background">
          +{assignedTo.length - 3}
        </div>
      )}
    </div>
  )
}

function DueDate({ date }: { date: Date }) {
  const now = new Date()
  const isOverdue = isPast(date) && !isToday(date)
  const daysUntil = differenceInDays(date, now)
  
  let label: string
  let className = 'text-xs '
  
  if (isOverdue) {
    label = `${Math.abs(daysUntil)} dni temu`
    className += 'text-destructive font-medium'
  } else if (isToday(date)) {
    label = 'Dzisiaj'
    className += 'text-amber-600 dark:text-amber-400 font-medium'
  } else if (isTomorrow(date)) {
    label = 'Jutro'
    className += 'text-amber-600 dark:text-amber-400'
  } else if (daysUntil <= 3) {
    label = format(date, 'd MMM', { locale: pl })
    className += 'text-amber-600 dark:text-amber-400'
  } else {
    label = format(date, 'd MMM', { locale: pl })
    className += 'text-muted-foreground'
  }

  return <span className={className}>{label}</span>
}

function TimeProgress({ estimated, actual }: { estimated: number; actual: number }) {
  const percentage = estimated > 0 ? Math.min((actual / estimated) * 100, 100) : 0
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="flex items-center gap-2">
      <Clock size={12} className="text-muted-foreground" />
      <span className="text-xs font-mono text-muted-foreground">
        {formatTime(actual)}
      </span>
      {estimated > 0 && (
        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              percentage >= 100 ? 'bg-destructive' : percentage >= 80 ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  )
}

interface OrderRowProps {
  order: Order
  isSelected: boolean
  onSelect: () => void
}

function OrderRow({ order, isSelected, onSelect }: OrderRowProps) {
  return (
    <div 
      onClick={onSelect}
      onDoubleClick={() => openOrderWindow(order.id, order.orderNumber)}
      className={`grid grid-cols-[24px_40px_1fr_130px_100px_100px_120px_100px_80px_80px_32px] gap-2 px-5 py-3 border-b border-border/50 cursor-pointer transition-colors items-center ${
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      }`}
    >
      {/* Checkbox */}
      <div 
        className="w-[18px] h-[18px] border-2 border-border rounded cursor-pointer hover:border-primary transition-colors flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Order Number */}
      <span className="text-[11px] text-muted-foreground font-mono truncate">
        {order.orderNumber.split('-').pop()}
      </span>

      {/* Title */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium text-foreground truncate hover:text-primary transition-colors">
          {order.title}
        </span>
        {order.files.length > 0 && (
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <Paperclip size={12} />
            <span className="text-[10px]">{order.files.length}</span>
          </div>
        )}
      </div>

      {/* Status */}
      <StatusPill status={order.status} />

      {/* Priority */}
      <PriorityIndicator priority={order.priority} />

      {/* Customer */}
      <span className="text-xs text-muted-foreground truncate" title={order.customerName}>
        {order.customerName}
      </span>

      {/* Assignees */}
      <AssigneeAvatars assignedTo={order.assignedTo} />

      {/* Due Date */}
      <DueDate date={order.dueDate} />

      {/* Time */}
      <TimeProgress estimated={order.estimatedTime} actual={order.actualTime} />

      {/* Comments */}
      {order.comments.length > 0 ? (
        <div className="group/comment relative inline-flex h-6 w-fit items-center gap-1 rounded-full border border-orange-400/80 bg-orange-50 px-2 text-[11px] font-semibold text-orange-700 shadow-sm dark:border-orange-400/50 dark:bg-orange-950/45 dark:text-orange-200 madi-comment-pulse">
          <MessageSquare size={12} />
          <span>{order.comments.length}</span>
          <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 hidden w-[min(300px,70vw)] rounded-md border border-orange-300 bg-popover p-3 text-left text-popover-foreground shadow-xl group-hover/comment:block">
            <p className="mb-1 text-[11px] font-semibold text-orange-700 dark:text-orange-200">Ostatni komentarz</p>
            <p className="whitespace-normal text-xs leading-snug text-foreground">{order.comments[order.comments.length - 1]?.content}</p>
            <p className="mt-1 truncate text-[10px] text-muted-foreground">{order.comments[order.comments.length - 1]?.userName}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-muted-foreground">
          <MessageSquare size={12} />
          <span className="text-[11px]">0</span>
        </div>
      )}

      {/* Actions */}
      <button 
        onClick={(e) => {
          e.stopPropagation()
          openOrderWindow(order.id, order.orderNumber)
        }}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        title="Otworz zlecenie w osobnym oknie"
      >
        <ExternalLink size={15} />
      </button>
    </div>
  )
}

export function OrdersList() {
  const { getFilteredOrders, selectedOrderId, selectOrder } = useOrdersStore()
  const orders = getFilteredOrders()

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="grid grid-cols-[24px_40px_1fr_130px_100px_100px_120px_100px_80px_80px_32px] gap-2 px-5 py-2.5 bg-muted/50 border-b border-border sticky top-0 z-10 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        <span></span>
        <span>Nr</span>
        <span>Zlecenie</span>
        <span>Status</span>
        <span>Priorytet</span>
        <span>Klient</span>
        <span>Przypisane</span>
        <span>Termin</span>
        <span>Czas</span>
        <span>Kom.</span>
        <span></span>
      </div>

      {/* Orders */}
      {orders.length > 0 ? (
        orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            isSelected={selectedOrderId === order.id}
            onSelect={() => selectOrder(order.id)}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium">Brak zleceń</p>
          <p className="text-xs mt-1">Dodaj nowe zlecenie lub zmień filtry</p>
        </div>
      )}
    </div>
  )
}
