'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  Activity,
  Bell,
  MessageSquare,
  CalendarClock,
  UserPlus,
  AlertTriangle,
  CheckCheck,
  PanelRightClose,
  PanelRightOpen,
  FilePlus2,
  Flame,
  Ban,
  ThumbsUp,
  ArrowRightCircle,
  ExternalLink,
} from 'lucide-react'
import type { ActivityItem, ActivityChannel, ActivityKind } from '@/lib/types'
import { useStartStore } from '@/lib/store/start-store'
import { openOrderWindow } from '@/lib/utils/order-links'

const CHANNELS: { id: ActivityChannel | 'all'; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Aktywność', icon: <Activity size={14} /> },
  { id: 'updates', label: 'Aktualizacje', icon: <Bell size={14} /> },
  { id: 'alerts', label: 'Alerty', icon: <AlertTriangle size={14} /> },
  { id: 'comments', label: 'Komentarze', icon: <MessageSquare size={14} /> },
  { id: 'deadlines', label: 'Zmiany terminów', icon: <CalendarClock size={14} /> },
  { id: 'assignments', label: 'Nowe przypisania', icon: <UserPlus size={14} /> },
]

const KIND_ICON: Record<ActivityKind, React.ReactNode> = {
  new_order: <FilePlus2 size={13} />,
  new_task: <FilePlus2 size={13} />,
  assignment: <UserPlus size={13} />,
  deadline_change: <CalendarClock size={13} />,
  comment: <MessageSquare size={13} />,
  blocking: <Ban size={13} />,
  urgent: <Flame size={13} />,
  approval: <ThumbsUp size={13} />,
  status_change: <ArrowRightCircle size={13} />,
}

interface ActivityFeedProps {
  items: ActivityItem[]
  userId: string
}

export function ActivityFeed({ items, userId }: ActivityFeedProps) {
  const { getPrefs, patchPrefs, markUpdateRead, markAllUpdatesRead } = useStartStore()
  const prefs = getPrefs(userId)
  const [channel, setChannel] = useState<ActivityChannel | 'all'>('all')

  const filtered = channel === 'all' ? items : items.filter((i) => i.channel === channel)
  const unreadCount = items.filter((i) => !prefs.readUpdateIds.includes(i.id)).length

  if (prefs.rightCollapsed) {
    return (
      <div className="flex h-full w-12 shrink-0 flex-col items-center gap-3 rounded-md border border-border bg-card py-3">
        <button
          onClick={() => patchPrefs(userId, { rightCollapsed: false })}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Rozwiń panel aktywności"
        >
          <PanelRightOpen size={16} />
        </button>
        <div className="relative">
          <Activity size={18} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full shrink-0 flex-col rounded-md border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Aktywność</span>
          {unreadCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {unreadCount} nowe
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => markAllUpdatesRead(userId, items.map((i) => i.id))}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Oznacz wszystko jako przeczytane"
          >
            <CheckCheck size={13} />
          </button>
          <button
            onClick={() => patchPrefs(userId, { rightCollapsed: true })}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Zwiń panel"
          >
            <PanelRightClose size={15} />
          </button>
        </div>
      </div>

      {/* Channel tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border px-2 py-2">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            onClick={() => setChannel(c.id)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              channel === c.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {c.icon}
            {c.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <p className="px-3 py-8 text-center text-[12px] text-muted-foreground">Brak wpisów w tej kategorii</p>
        )}
        {filtered.map((item) => {
          const isRead = prefs.readUpdateIds.includes(item.id)
          return (
            <button
              key={item.id}
              onClick={() => {
                markUpdateRead(userId, item.id)
                openOrderWindow(item.orderId, item.orderNumber)
              }}
              className={`flex w-full gap-2.5 rounded-md px-2.5 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                item.channel === 'alerts' || item.isBlocking
                  ? 'madi-alert-highlight border border-destructive/35 bg-destructive/[0.07]'
                  : item.priority === 'urgent'
                    ? 'madi-important-highlight border border-amber-400/35 bg-amber-50/65 dark:bg-amber-950/20'
                    : isRead
                      ? ''
                      : 'bg-primary/[0.04]'
              }`}
            >
              <div className="relative shrink-0">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: item.actorColor }}
                >
                  {item.actorInitials}
                </span>
                <span
                  className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card ${
                    item.channel === 'alerts' ? 'bg-destructive text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {KIND_ICON[item.kind]}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-snug text-foreground">
                  <span className="font-medium">{item.actorName}</span>{' '}
                  <span className="text-muted-foreground">{item.message}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {item.orderNumber && (
                    <span className="font-mono text-[10px] text-muted-foreground/70">{item.orderNumber}</span>
                  )}
                  {item.customerName && (
                    <span className="text-[10px] text-muted-foreground">· {item.customerName}</span>
                  )}
                  {item.workType && (
                    <span className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">{item.workType}</span>
                  )}
                  {item.priority === 'urgent' && (
                    <span className="flex items-center gap-0.5 rounded bg-destructive/10 px-1 py-0.5 text-[9px] font-medium text-destructive">
                      <Flame size={9} /> pilne
                    </span>
                  )}
                  {item.isBlocking && (
                    <span className="flex items-center gap-0.5 rounded bg-destructive/10 px-1 py-0.5 text-[9px] font-medium text-destructive">
                      <Ban size={9} /> blokuje
                    </span>
                  )}
                  {item.status && (
                    <span className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">{item.status}</span>
                  )}
                </div>
                {item.lastComment && (
                  <p className="mt-1 flex items-start gap-1 text-[11px] italic text-muted-foreground">
                    <MessageSquare size={10} className="mt-0.5 shrink-0" />
                    {item.lastComment}
                  </p>
                )}
                <span className="mt-1 block text-[10px] text-muted-foreground/70">
                  {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: pl })}
                </span>
              </div>
              {!isRead && <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />}
            </button>
          )
        })}
      </div>

      <div className="border-t border-border p-2">
        <button
          onClick={() => window.open('/logs', '_blank', 'noopener,noreferrer')}
          className="flex h-[var(--app-control-height)] w-full items-center justify-center gap-1.5 rounded-md px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink size={13} /> Otwórz pełną aktywność w nowej karcie
        </button>
      </div>
    </div>
  )
}
