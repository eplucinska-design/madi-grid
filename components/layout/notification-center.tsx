'use client'

import { useEffect, useMemo, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  AlertTriangle,
  Bell,
  BellRing,
  Bookmark,
  CheckCheck,
  Clock3,
  MessageSquare,
  Package,
  Play,
  RotateCcw,
  Settings2,
  Timer,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  type MadiNotification,
  type NotificationChannel,
  type NotificationSeverity,
  useNotificationsStore,
} from '@/lib/store/notifications-store'
import { openOrderWindow } from '@/lib/utils/order-links'

const FILTERS: Array<{
  id: NotificationChannel | 'all' | 'settings'
  label: string
  icon: React.ReactNode
}> = [
  { id: 'all', label: 'Wszystkie', icon: <Bell size={13} /> },
  { id: 'orders', label: 'Zlecenia', icon: <Package size={13} /> },
  { id: 'rcp', label: 'RCP', icon: <Timer size={13} /> },
  { id: 'alerts', label: 'Alerty', icon: <AlertTriangle size={13} /> },
  { id: 'comments', label: 'Komentarze', icon: <MessageSquare size={13} /> },
  { id: 'deadlines', label: 'Terminy', icon: <Clock3 size={13} /> },
  { id: 'settings', label: 'Ustawienia', icon: <Settings2 size={13} /> },
]

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  orders: 'Zlecenia',
  rcp: 'RCP',
  alerts: 'Alerty',
  comments: 'Komentarze',
  deadlines: 'Terminy',
}

const CHANNEL_ICONS: Record<NotificationChannel, React.ReactNode> = {
  orders: <Package size={14} />,
  rcp: <Timer size={14} />,
  alerts: <AlertTriangle size={14} />,
  comments: <MessageSquare size={14} />,
  deadlines: <Clock3 size={14} />,
}

const SEVERITY_META: Record<NotificationSeverity, { label: string; className: string; dot: string }> = {
  info: {
    label: 'Info',
    className: 'border-border bg-muted text-foreground',
    dot: 'bg-muted-foreground',
  },
  important: {
    label: 'Wazne',
    className: 'border-primary bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-100',
    dot: 'bg-primary',
  },
  critical: {
    label: 'Pilne',
    className: 'border-destructive bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-100',
    dot: 'bg-destructive',
  },
}

function notificationHighlightClass(item: MadiNotification) {
  if (item.severity === 'critical' || item.channel === 'alerts') {
    return 'madi-alert-highlight border-red-300 bg-red-50 text-red-950 ring-1 ring-red-200 dark:border-red-800 dark:bg-red-950 dark:text-red-50 dark:ring-red-900'
  }
  if (item.severity === 'important') {
    return 'madi-important-highlight border-amber-300 bg-amber-50 text-amber-950 ring-1 ring-amber-200 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50 dark:ring-amber-900'
  }
  return ''
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatTimeLabel(value: string) {
  return new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

function playNotificationSound() {
  if (typeof window === 'undefined') return
  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }
  const AudioContextCtor = window.AudioContext ?? audioWindow.webkitAudioContext
  if (!AudioContextCtor) return

  try {
    const context = new AudioContextCtor()
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(740, now)
    oscillator.frequency.exponentialRampToValueAtTime(980, now + 0.09)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.22)
    oscillator.onended = () => void context.close()
  } catch {
    // Browser can block audio before the first user gesture.
  }
}

function groupNotifications(items: MadiNotification[]) {
  return items.reduce<Array<{ label: string; items: MadiNotification[] }>>((groups, item) => {
    const label = formatDateLabel(item.createdAt)
    const current = groups[groups.length - 1]
    if (current?.label === label) {
      current.items.push(item)
      return groups
    }
    groups.push({ label, items: [item] })
    return groups
  }, [])
}

function NotificationCard({
  item,
  compact = false,
  onRead,
  onUnread,
  onSaveLater,
  onDismiss,
}: {
  item: MadiNotification
  compact?: boolean
  onRead: (id: string) => void
  onUnread: (id: string) => void
  onSaveLater: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const severity = SEVERITY_META[item.severity]
  const unread = !item.readAt

  return (
    <div
      className={cn(
        'relative rounded-md border bg-card text-card-foreground shadow-xl transition-colors',
        unread ? 'border-primary/40' : 'border-border',
        compact ? 'p-3' : 'p-3.5 hover:border-primary/40',
        notificationHighlightClass(item)
      )}
    >
      {(item.severity === 'critical' || item.channel === 'alerts') && (
        <span className="absolute inset-y-3 left-0 w-1 rounded-r bg-destructive" />
      )}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: item.actorColor }}
          >
            {item.actorInitials}
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-white text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-200">
            {CHANNEL_ICONS[item.channel]}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {formatTimeLabel(item.createdAt)}
                </span>
                {item.orderNumber && (
                    <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100">
                      {item.orderNumber}
                    </span>
                  )}
                <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', severity.className)}>
                  {severity.label}
                </span>
              </div>
              <h3 className="mt-1 text-[13px] font-semibold leading-snug text-foreground">{item.title}</h3>
            </div>
            {unread && <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', severity.dot)} />}
          </div>

          <p className="mt-1 text-[12px] leading-snug text-current/80">{item.body}</p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="rounded bg-white px-1.5 py-0.5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">{item.actorName}</span>
            <span className="rounded bg-white px-1.5 py-0.5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">{CHANNEL_LABELS[item.channel]}</span>
            {item.savedForLaterAt && <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700 shadow-sm dark:bg-blue-950 dark:text-blue-200">na pozniej</span>}
            {item.operation && <span className="rounded bg-white px-1.5 py-0.5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">{item.operation}</span>}
            {item.statusLabel && <span className="rounded bg-white px-1.5 py-0.5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">{item.statusLabel}</span>}
            {item.durationLabel && <span className="rounded bg-white px-1.5 py-0.5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">czas {item.durationLabel}</span>}
            {typeof item.quantityDone === 'number' && typeof item.quantityTotal === 'number' && (
              <span className="rounded bg-white px-1.5 py-0.5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                {item.quantityDone}/{item.quantityTotal} szt.
              </span>
            )}
          </div>

          {item.customerName && (
            <p className="mt-1 truncate text-[10px] text-muted-foreground/80">
              {item.customerName}
              {item.product ? ` - ${item.product}` : ''}
            </p>
          )}

          {!compact && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onRead(item.id)
                  openOrderWindow(item.orderId, item.orderNumber)
                }}
                disabled={!item.orderId}
                className="min-h-7 min-w-[104px] whitespace-nowrap rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold leading-tight text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Otworz zlecenie
              </button>
              <button
                type="button"
                onClick={() => onRead(item.id)}
                className="min-h-7 min-w-[82px] whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold leading-tight text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Odczytane
              </button>
              <button
                type="button"
                onClick={() => onUnread(item.id)}
                className="flex min-h-7 min-w-[104px] items-center justify-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold leading-tight text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <RotateCcw size={11} />
                Nieodczytane
              </button>
              <button
                type="button"
                onClick={() => onSaveLater(item.id)}
                className="flex min-h-7 min-w-[90px] items-center justify-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold leading-tight text-muted-foreground hover:bg-muted hover:text-primary"
              >
                <Bookmark size={11} />
                Na pozniej
              </button>
              <button
                type="button"
                onClick={() => onDismiss(item.id)}
                className="min-h-7 min-w-[88px] whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold leading-tight text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Ukryj dymek
              </button>
            </div>
          )}
        </div>

        {compact && (
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Zamknij"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function SettingsPanel() {
  const { settings, updateSettings, toggleChannel, addNotification, resetDemoNotifications } = useNotificationsStore()

  const handleSystemBubbles = async (enabled: boolean) => {
    if (!enabled) {
      updateSettings({ systemBubblesEnabled: false })
      return
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      updateSettings({ systemBubblesEnabled: false })
      return
    }

    if (Notification.permission === 'granted') {
      updateSettings({ systemBubblesEnabled: true })
      return
    }

    const permission = await Notification.requestPermission()
    updateSettings({ systemBubblesEnabled: permission === 'granted' })
  }

  return (
    <div className="space-y-4 p-3">
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tryb powiadomien</p>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Dymki w aplikacji</span>
            <Switch
              checked={settings.bubblesEnabled}
              onCheckedChange={(checked) => updateSettings({ bubblesEnabled: checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Dymek zostaje do zamkniecia</span>
            <Switch
              checked={settings.stickyBubbles}
              onCheckedChange={(checked) => updateSettings({ stickyBubbles: checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              Dzwiek
            </span>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">Dymki systemowe Windows</span>
              <span className="block text-[11px] text-muted-foreground">Wtedy dymki w aplikacji nie wyskakuja, a wpis zostaje w dzwoneczku.</span>
            </span>
            <Switch checked={settings.systemBubblesEnabled} onCheckedChange={handleSystemBubbles} />
          </label>
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kategorie</p>
        <div className="space-y-3">
          {(Object.keys(CHANNEL_LABELS) as NotificationChannel[]).map((channel) => (
            <label key={channel} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                {CHANNEL_ICONS[channel]}
                {CHANNEL_LABELS[channel]}
              </span>
              <Switch checked={settings.channelVisibility[channel]} onCheckedChange={() => toggleChannel(channel)} />
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            playNotificationSound()
            addNotification({
              channel: 'orders',
              kind: 'order_updated',
              severity: 'important',
              title: 'Test powiadomienia',
              body: 'Tak bedzie wygladal dymek przy aktualizacji zlecenia.',
              actorName: 'MADI GRID',
              actorInitials: 'MF',
              actorColor: '#339af0',
              orderId: '1',
              orderNumber: 'ZL-2026-0142',
              operation: 'Test',
            })
          }}
          className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
        >
          Test dymku
        </button>
        <button
          type="button"
          onClick={resetDemoNotifications}
          className="h-9 rounded-md border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Przywroc demo
        </button>
      </div>
    </div>
  )
}

export function NotificationCenter() {
  const {
    notifications,
    panelOpen,
    activeFilter,
    settings,
    lastSoundAt,
    setPanelOpen,
    setActiveFilter,
    markRead,
    markUnread,
    saveForLater,
    markAllRead,
    dismissBubble,
    dismissAllBubbles,
  } = useNotificationsStore()
  const handledSoundRef = useRef<number | null>(null)

  const unreadCount = notifications.filter((item) => !item.readAt).length
  const visibleNotifications = useMemo(() => {
    return notifications
      .filter((item) => settings.channelVisibility[item.channel])
      .filter((item) => activeFilter === 'all' || activeFilter === 'settings' || item.channel === activeFilter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [activeFilter, notifications, settings.channelVisibility])
  const groups = useMemo(() => groupNotifications(visibleNotifications), [visibleNotifications])
  const bubbles = useMemo(() => {
    if (settings.systemBubblesEnabled || panelOpen) return []
    if (!settings.bubblesEnabled) return []
    return notifications
      .filter((item) => settings.channelVisibility[item.channel])
      .filter((item) => !item.bubbleDismissedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4)
  }, [notifications, panelOpen, settings.bubblesEnabled, settings.channelVisibility, settings.systemBubblesEnabled])

  useEffect(() => {
    if (!lastSoundAt || handledSoundRef.current === lastSoundAt) return
    handledSoundRef.current = lastSoundAt
    const newest = notifications[0]

    if (settings.soundEnabled) {
      playNotificationSound()
    }

    if (
      settings.systemBubblesEnabled &&
      newest &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(`MADI GRID - ${newest.title}`, {
        body: newest.orderNumber ? `${newest.orderNumber} - ${newest.body}` : newest.body,
        icon: '/icon-light-32x32.png',
        badge: '/icon-light-32x32.png',
        tag: newest.id,
        silent: !settings.soundEnabled,
      })
    }
  }, [lastSoundAt, notifications, settings.soundEnabled, settings.systemBubblesEnabled])

  useEffect(() => {
    if (settings.stickyBubbles || bubbles.length === 0) return
    const timers = bubbles.map((item) => window.setTimeout(() => dismissBubble(item.id), 6500))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [bubbles, dismissBubble, settings.stickyBubbles])

  return (
    <>
      {panelOpen && (
        <section className="fixed bottom-3 right-3 z-[70] flex h-[min(780px,calc(100vh-var(--app-topbar-height)-24px))] w-[min(460px,calc(100vw-88px))] flex-col overflow-hidden rounded-md border border-border bg-background shadow-2xl">
          <header className="flex shrink-0 items-center justify-between border-b border-border px-3 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BellRing size={17} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Powiadomienia</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {unreadCount} nowe
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {notifications.length} wpisow, ostatni{' '}
                {notifications[0]
                  ? formatDistanceToNow(new Date(notifications[0].createdAt), { addSuffix: true, locale: pl })
                  : 'brak'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllRead}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Oznacz wszystko jako odczytane"
              >
                <CheckCheck size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Zamknij"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="flex shrink-0 flex-wrap gap-1 border-b border-border p-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold transition-colors',
                  activeFilter === filter.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {filter.icon}
                {filter.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeFilter === 'settings' ? (
              <SettingsPanel />
            ) : groups.length === 0 ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Brak powiadomien w wybranej kategorii.
              </div>
            ) : (
              <div className="p-3">
                {groups.map((group) => (
                  <div key={group.label} className="pb-3">
                    <div className="sticky top-0 z-10 -mx-3 mb-2 bg-background/95 px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground backdrop-blur">
                      {group.label}
                    </div>
                    <div className="relative space-y-2 pl-5">
                      <span className="absolute bottom-3 left-[7px] top-3 border-l border-dashed border-border" />
                      {group.items.map((item) => (
                        <div key={item.id} className="relative">
                          <span
                            className={cn(
                              'absolute -left-[20px] top-4 h-3.5 w-3.5 rounded-full border-2 border-background',
                              SEVERITY_META[item.severity].dot,
                              (item.severity === 'critical' || item.channel === 'alerts') && 'madi-alert-dot'
                            )}
                          />
                          <NotificationCard
                            item={item}
                            onRead={markRead}
                            onUnread={markUnread}
                            onSaveLater={saveForLater}
                            onDismiss={dismissBubble}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {bubbles.length > 0 && (
        <aside className="fixed bottom-3 right-3 z-[7600] flex max-h-[calc(100vh-24px)] w-[min(380px,calc(100vw-24px))] flex-col gap-2 overflow-y-auto pr-1">
          {bubbles.map((item) => (
            <div key={item.id} className="animate-in slide-in-from-bottom-4 fade-in duration-200">
              <NotificationCard
                item={item}
                compact
                onRead={markRead}
                onUnread={markUnread}
                onSaveLater={saveForLater}
                onDismiss={dismissBubble}
              />
              <div className="mt-1 flex items-center gap-1.5 px-1">
                <button
                  type="button"
                  onClick={() => {
                    markRead(item.id)
                    openOrderWindow(item.orderId, item.orderNumber)
                  }}
                  disabled={!item.orderId}
                  className="flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-[11px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play size={11} />
                  Otworz
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {settings.stickyBubbles ? 'zostaje do zamkniecia' : 'zniknie automatycznie'}
                </span>
                <button
                  type="button"
                  onClick={() => saveForLater(item.id)}
                  className="ml-auto flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-primary"
                >
                  <Bookmark size={11} />
                  Na pozniej
                </button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 shadow-xl">
            <span className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <BellRing size={13} className="text-primary" />
              Dymki powiadomien
            </span>
            <button
              type="button"
              onClick={dismissAllBubbles}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Wycisz
            </button>
          </div>
        </aside>
      )}
    </>
  )
}
