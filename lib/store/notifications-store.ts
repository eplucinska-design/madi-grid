import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationChannel = 'orders' | 'rcp' | 'alerts' | 'comments' | 'deadlines'
export type NotificationSeverity = 'info' | 'important' | 'critical'

export type NotificationKind =
  | 'order_created'
  | 'order_updated'
  | 'status_changed'
  | 'stage_changed'
  | 'assignee_changed'
  | 'deadline_changed'
  | 'comment_added'
  | 'rcp_started'
  | 'rcp_paused'
  | 'rcp_stopped'
  | 'rcp_finished'
  | 'material_alert'
  | 'blocking_alert'

export interface MadiNotification {
  id: string
  channel: NotificationChannel
  kind: NotificationKind
  severity: NotificationSeverity
  title: string
  body: string
  actorName: string
  actorInitials: string
  actorColor: string
  orderId?: string
  orderNumber?: string
  customerName?: string
  product?: string
  operation?: string
  statusLabel?: string
  quantityDone?: number
  quantityTotal?: number
  durationLabel?: string
  createdAt: string
  readAt?: string
  bubbleDismissedAt?: string
  savedForLaterAt?: string
}

export interface NotificationSettings {
  bubblesEnabled: boolean
  stickyBubbles: boolean
  soundEnabled: boolean
  systemBubblesEnabled: boolean
  channelVisibility: Record<NotificationChannel, boolean>
}

interface AddNotificationInput {
  channel: NotificationChannel
  kind: NotificationKind
  severity?: NotificationSeverity
  title: string
  body: string
  actorName?: string
  actorInitials?: string
  actorColor?: string
  orderId?: string
  orderNumber?: string
  customerName?: string
  product?: string
  operation?: string
  statusLabel?: string
  quantityDone?: number
  quantityTotal?: number
  durationLabel?: string
  createdAt?: string
}

interface NotificationsState {
  notifications: MadiNotification[]
  panelOpen: boolean
  activeFilter: NotificationChannel | 'all' | 'settings'
  settings: NotificationSettings
  lastSoundAt: number | null

  setPanelOpen: (open: boolean) => void
  togglePanel: () => void
  setActiveFilter: (filter: NotificationChannel | 'all' | 'settings') => void
  updateSettings: (patch: Partial<NotificationSettings>) => void
  toggleChannel: (channel: NotificationChannel) => void
  addNotification: (input: AddNotificationInput) => string
  markRead: (id: string) => void
  markUnread: (id: string) => void
  saveForLater: (id: string) => void
  markAllRead: () => void
  dismissBubble: (id: string) => void
  dismissAllBubbles: () => void
  resetDemoNotifications: () => void
}

const CHANNEL_DEFAULTS: Record<NotificationChannel, boolean> = {
  orders: true,
  rcp: true,
  alerts: true,
  comments: true,
  deadlines: true,
}

const DEFAULT_SETTINGS: NotificationSettings = {
  bubblesEnabled: true,
  stickyBubbles: true,
  soundEnabled: true,
  systemBubblesEnabled: false,
  channelVisibility: CHANNEL_DEFAULTS,
}

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const demoNotifications: MadiNotification[] = [
  {
    id: 'notif-rcp-001',
    channel: 'rcp',
    kind: 'rcp_finished',
    severity: 'important',
    title: 'Operacja RCP zakonczona',
    body: 'Maciej Idziak odklikal pakowanie. Gotowe: 2 szt., czas: 00:07:09.',
    actorName: 'Maciej Idziak',
    actorInitials: 'MI',
    actorColor: '#2f9e44',
    orderId: '1',
    orderNumber: 'ZL-2026-0142',
    customerName: 'ABC Marketing Sp. z o.o.',
    product: 'Ulotki A5 - Promocja letnia',
    operation: 'Pakowanie',
    quantityDone: 2,
    quantityTotal: 10000,
    durationLabel: '00:07:09',
    createdAt: '2026-07-13T08:55:49+02:00',
  },
  {
    id: 'notif-status-001',
    channel: 'orders',
    kind: 'status_changed',
    severity: 'important',
    title: 'Zlecenie weszlo w produkcje',
    body: 'Status zmieniony na W produkcji. Operator ma aktywne odklikanie czasu.',
    actorName: 'Łukasz Jenczak',
    actorInitials: 'ŁJ',
    actorColor: '#2b8a3e',
    orderId: '1',
    orderNumber: 'ZL-2026-0142',
    customerName: 'ABC Marketing Sp. z o.o.',
    product: 'Ulotki A5',
    operation: 'Druk offsetowy',
    statusLabel: 'W produkcji',
    createdAt: '2026-07-13T08:49:25+02:00',
  },
  {
    id: 'notif-alert-001',
    channel: 'alerts',
    kind: 'blocking_alert',
    severity: 'critical',
    title: 'Blokada na plikach',
    body: 'Roll-up Targi wymaga logo w krzywych. Produkcja nie powinna ruszyc bez poprawnego pliku.',
    actorName: 'Oliwier Matela',
    actorInitials: 'OM',
    actorColor: '#15aabf',
    orderId: '4',
    orderNumber: 'ZL-2026-0139',
    customerName: 'EventMax Group',
    product: 'Roll-up',
    operation: 'Prepress',
    statusLabel: 'Blokada',
    createdAt: '2026-07-13T08:48:40+02:00',
  },
  {
    id: 'notif-deadline-001',
    channel: 'deadlines',
    kind: 'deadline_changed',
    severity: 'important',
    title: 'Termin do pilnej kontroli',
    body: 'Katalog produktowy 2026 ma termin dzisiaj. Wymagana akceptacja przed produkcja.',
    actorName: 'Kacper Pilarski',
    actorInitials: 'KP',
    actorColor: '#fab005',
    orderId: '2',
    orderNumber: 'ZL-2026-0141',
    customerName: 'TechPro Solutions',
    product: 'Katalog A4',
    operation: 'Akceptacja',
    statusLabel: 'Do akceptacji',
    createdAt: '2026-07-13T08:47:31+02:00',
  },
  {
    id: 'notif-comment-001',
    channel: 'comments',
    kind: 'comment_added',
    severity: 'info',
    title: 'Nowy komentarz',
    body: 'Klient prosi o dodatkowy lakier na okladce.',
    actorName: 'Kacper Pilarski',
    actorInitials: 'KP',
    actorColor: '#fab005',
    orderId: '2',
    orderNumber: 'ZL-2026-0141',
    customerName: 'TechPro Solutions',
    product: 'Katalog A4',
    operation: 'Prepress',
    createdAt: '2026-07-13T08:42:18+02:00',
  },
]

const templateNotifications = demoNotifications.slice(0, 3)

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: templateNotifications,
      panelOpen: false,
      activeFilter: 'all',
      settings: DEFAULT_SETTINGS,
      lastSoundAt: null,

      setPanelOpen: (open) => set({ panelOpen: open }),
      togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
      setActiveFilter: (filter) => set({ activeFilter: filter }),

      updateSettings: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...patch,
            channelVisibility: patch.channelVisibility
              ? { ...state.settings.channelVisibility, ...patch.channelVisibility }
              : state.settings.channelVisibility,
          },
        })),

      toggleChannel: (channel) =>
        set((state) => ({
          settings: {
            ...state.settings,
            channelVisibility: {
              ...state.settings.channelVisibility,
              [channel]: !state.settings.channelVisibility[channel],
            },
          },
        })),

      addNotification: (input) => {
        const state = get()
        const id = createId('notif')
        const now = new Date().toISOString()
        const item: MadiNotification = {
          id,
          channel: input.channel,
          kind: input.kind,
          severity: input.severity ?? 'info',
          title: input.title,
          body: input.body,
          actorName: input.actorName ?? 'MADI GRID',
          actorInitials: input.actorInitials ?? 'MF',
          actorColor: input.actorColor ?? '#339af0',
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          customerName: input.customerName,
          product: input.product,
          operation: input.operation,
          statusLabel: input.statusLabel,
          quantityDone: input.quantityDone,
          quantityTotal: input.quantityTotal,
          durationLabel: input.durationLabel,
          createdAt: input.createdAt ?? now,
          bubbleDismissedAt:
            state.settings.bubblesEnabled && !state.settings.systemBubblesEnabled && state.settings.channelVisibility[input.channel]
              ? undefined
              : now,
        }

        set((current) => ({
          notifications: [item, ...current.notifications].slice(0, 120),
          lastSoundAt: current.settings.soundEnabled ? Date.now() : current.lastSoundAt,
        }))
        return id
      },

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item
          ),
        })),

      markUnread: (id) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, readAt: undefined, bubbleDismissedAt: undefined } : item
          ),
        })),

      saveForLater: (id) =>
        set((state) => {
          const now = new Date().toISOString()
          return {
            notifications: state.notifications.map((item) =>
              item.id === id
                ? {
                    ...item,
                    savedForLaterAt: now,
                    bubbleDismissedAt: now,
                  }
                : item
            ),
          }
        }),

      markAllRead: () =>
        set((state) => {
          const now = new Date().toISOString()
          return {
            notifications: state.notifications.map((item) => (item.readAt ? item : { ...item, readAt: now })),
          }
        }),

      dismissBubble: (id) =>
        set((state) => {
          const now = new Date().toISOString()
          return {
            notifications: state.notifications.map((item) =>
              item.id === id
                ? {
                    ...item,
                    bubbleDismissedAt: now,
                  }
                : item
            ),
          }
        }),

      dismissAllBubbles: () =>
        set((state) => {
          const now = new Date().toISOString()
          return {
            notifications: state.notifications.map((item) => ({
              ...item,
              bubbleDismissedAt: item.bubbleDismissedAt ?? now,
            })),
          }
        }),

      resetDemoNotifications: () => set({ notifications: templateNotifications }),
    }),
    {
      name: 'madi-flow-notifications-template-v1',
      partialize: (state) => ({
        notifications: state.notifications,
        settings: state.settings,
        activeFilter: state.activeFilter,
      }),
    }
  )
)
