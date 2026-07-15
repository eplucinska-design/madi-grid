'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Check,
  Clock3,
  MessageSquare,
  Megaphone,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import { useAuthStore } from '@/lib/store/auth-store'
import {
  useNotificationsStore,
  type MadiNotification,
  type NotificationChannel,
  type NotificationSeverity,
} from '@/lib/store/notifications-store'

interface PinnedAnnouncement {
  id: string
  title: string
  body: string
  authorName: string
  severity: NotificationSeverity
  sourceNotificationId?: string
  createdAt: string
}

const STORAGE_KEY = 'madi-grid-pinned-announcements-v1'

const channelLabels: Record<NotificationChannel, string> = {
  orders: 'Zlecenia',
  rcp: 'RCP',
  alerts: 'Alerty',
  comments: 'Komentarze',
  deadlines: 'Terminy',
}

const severityLabels: Record<NotificationSeverity, string> = {
  info: 'Info',
  important: 'Wazne',
  critical: 'Pilne',
}

const severityClass: Record<NotificationSeverity, string> = {
  info: 'border-border bg-card',
  important: 'madi-important-highlight border-amber-400/45 bg-amber-50/75 dark:bg-amber-950/25',
  critical: 'madi-alert-highlight border-destructive/45 bg-destructive/[0.075]',
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `pin-${crypto.randomUUID()}`
  return `pin-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function notificationIcon(item: MadiNotification) {
  if (item.channel === 'alerts' || item.severity === 'critical') return <AlertTriangle size={14} />
  if (item.channel === 'comments') return <MessageSquare size={14} />
  if (item.channel === 'deadlines') return <Clock3 size={14} />
  return <Bell size={14} />
}

function loadPinned(): PinnedAnnouncement[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function savePinned(items: PinnedAnnouncement[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function AnnouncementsModule() {
  const { user } = useAuthStore()
  const notifications = useNotificationsStore((state) => state.notifications)
  const markAllRead = useNotificationsStore((state) => state.markAllRead)
  const [pinned, setPinned] = useState<PinnedAnnouncement[]>([])
  const [query, setQuery] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newSeverity, setNewSeverity] = useState<NotificationSeverity>('important')

  useEffect(() => {
    setPinned(loadPinned())
  }, [])

  useEffect(() => {
    savePinned(pinned)
  }, [pinned])

  const filteredNotifications = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return notifications.filter((item) => {
      if (!normalized) return true
      return [
        item.title,
        item.body,
        item.actorName,
        item.orderNumber,
        item.customerName,
        item.product,
        item.operation,
        item.statusLabel,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    })
  }, [notifications, query])

  const pinnedSourceIds = new Set(pinned.map((item) => item.sourceNotificationId).filter(Boolean))
  const unreadCount = notifications.filter((item) => !item.readAt).length
  const alertCount = notifications.filter((item) => item.channel === 'alerts' || item.severity === 'critical').length

  const addManualPin = () => {
    const title = newTitle.trim()
    const body = newBody.trim()
    if (!title && !body) return
    setPinned((items) => [
      {
        id: createId(),
        title: title || 'Przypieta informacja',
        body,
        authorName: user?.name ?? 'MADI GRID',
        severity: newSeverity,
        createdAt: new Date().toISOString(),
      },
      ...items,
    ])
    setNewTitle('')
    setNewBody('')
    setNewSeverity('important')
  }

  const pinNotification = (item: MadiNotification) => {
    if (pinnedSourceIds.has(item.id)) return
    setPinned((items) => [
      {
        id: createId(),
        title: item.title,
        body: item.body,
        authorName: item.actorName,
        severity: item.severity,
        sourceNotificationId: item.id,
        createdAt: new Date().toISOString(),
      },
      ...items,
    ])
  }

  const removePin = (id: string) => setPinned((items) => items.filter((item) => item.id !== id))

  return (
    <ModuleFrame
      title="Ogloszenia"
      kicker="Centrum zmian i przypiec"
      description="Wspolny dziennik zmian z systemu oraz recznie przypiete informacje dla zespolu."
      icon={<Megaphone size={13} />}
      viewControls={false}
      actions={
        <button
          onClick={markAllRead}
          className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
        >
          <Check size={14} />
          Oznacz przeczytane
        </button>
      }
      summary={
        <StatStrip
          items={[
            { label: 'Zmiany', value: notifications.length, hint: 'zarejestrowane wpisy' },
            { label: 'Nieczytane', value: unreadCount, hint: 'do sprawdzenia', tone: unreadCount ? 'text-primary' : '' },
            { label: 'Alerty', value: alertCount, hint: 'blokady i pilne', tone: alertCount ? 'text-destructive' : '' },
            { label: 'Przypiete', value: pinned.length, hint: 'widoczne na gorze' },
          ]}
        />
      }
      aside={
        <aside className="flex h-full flex-col bg-background">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Dodaj przypiecie</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Ustalenia, ostrzezenia lub informacje dla zespolu.</p>
          </div>
          <div className="space-y-3 overflow-auto p-4">
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Tytul"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <textarea
              value={newBody}
              onChange={(event) => setNewBody(event.target.value)}
              placeholder="Tresc ogloszenia..."
              rows={5}
              className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
            <select
              value={newSeverity}
              onChange={(event) => setNewSeverity(event.target.value as NotificationSeverity)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="info">Info</option>
              <option value="important">Wazne</option>
              <option value="critical">Pilne / alert</option>
            </select>
            <button
              onClick={addManualPin}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={14} />
              Przypnij informacje
            </button>
          </div>
        </aside>
      }
    >
      <div className="madi-scroll-area h-full p-[var(--app-module-gap)]">
        <div className="grid gap-[var(--app-module-gap)] xl:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.3fr)]">
          <section className="min-w-0 rounded-md border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Przypiete</p>
                <p className="text-[11px] text-muted-foreground">Rzeczy stale widoczne dla zespolu.</p>
              </div>
              <Pin size={16} className="text-primary" />
            </div>
            <div className="space-y-2 p-3">
              {pinned.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Brak przypietych informacji.
                </div>
              )}
              {pinned.map((item) => (
                <article key={item.id} className={`rounded-md border p-3 ${severityClass[item.severity]}`}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Pin size={13} className="shrink-0 text-primary" />
                        <h3 className="truncate text-sm font-semibold">{item.title}</h3>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {item.authorName} · {formatTime(item.createdAt)} · {severityLabels[item.severity]}
                      </p>
                    </div>
                    <button
                      onClick={() => removePin(item.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
                      title="Odepnij"
                    >
                      <PinOff size={14} />
                    </button>
                  </div>
                  {item.body && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.body}</p>}
                </article>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-md border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Dziennik zmian</p>
                  <p className="text-[11px] text-muted-foreground">Wpisy z powiadomien, alertow, komentarzy i zmian statusow.</p>
                </div>
                <div className="flex h-9 min-w-[240px] items-center gap-2 rounded-md border border-border bg-background px-2.5">
                  <Search size={15} className="text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Szukaj zmian..."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="max-h-[calc(100vh-290px)] space-y-2 overflow-auto p-3">
              {filteredNotifications.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Brak zmian dla wybranego filtra.
                </div>
              )}
              {filteredNotifications.map((item) => {
                const pinnedAlready = pinnedSourceIds.has(item.id)
                return (
                  <article
                    key={item.id}
                    className={`rounded-md border p-3 ${
                      item.channel === 'alerts' || item.severity === 'critical'
                        ? severityClass.critical
                        : item.severity === 'important'
                          ? severityClass.important
                          : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ background: item.actorColor }}
                      >
                        {item.actorInitials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{formatTime(item.createdAt)}</span>
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                            {notificationIcon(item)}
                            {channelLabels[item.channel]}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5">{severityLabels[item.severity]}</span>
                          {item.orderNumber && <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{item.orderNumber}</span>}
                        </div>
                        <h3 className="mt-1 text-sm font-semibold">{item.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                        {(item.customerName || item.product || item.operation || item.statusLabel) && (
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                            {item.customerName && <span className="rounded bg-muted px-1.5 py-0.5">{item.customerName}</span>}
                            {item.product && <span className="rounded bg-muted px-1.5 py-0.5">{item.product}</span>}
                            {item.operation && <span className="rounded bg-muted px-1.5 py-0.5">{item.operation}</span>}
                            {item.statusLabel && <span className="rounded bg-muted px-1.5 py-0.5">{item.statusLabel}</span>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => (pinnedAlready ? undefined : pinNotification(item))}
                        disabled={pinnedAlready}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        title={pinnedAlready ? 'Juz przypiete' : 'Przypnij te zmiane'}
                      >
                        {pinnedAlready ? <Check size={14} /> : <Pin size={14} />}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </ModuleFrame>
  )
}
