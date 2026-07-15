import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type StartSectionId =
  | 'day-plan'
  | 'production'
  | 'queue'
  | 'overdue'
  | 'urgent'
  | 'blocking'

export const DEFAULT_SECTION_ORDER: StartSectionId[] = [
  'day-plan',
  'production',
  'queue',
  'overdue',
  'urgent',
  'blocking',
]

export type DateRange = 'today' | 'week' | 'all'
export type StartTileSize = 'sm' | 'md' | 'lg' | 'full'
export type StartWidgetId = StartSectionId | 'active-task' | 'activity-feed'

export interface StartSavedView {
  name: string
  sectionOrder: StartSectionId[]
  collapsedSections: StartSectionId[]
  tileSizes: Partial<Record<StartWidgetId, StartTileSize>>
  rightCollapsed: boolean
  dateRange: DateRange
  onlyMine: boolean
  filterUrgent: boolean
  filterOverdue: boolean
  savedAt: string
}

export interface StartPrefs {
  sectionOrder: StartSectionId[]
  collapsedSections: StartSectionId[]
  tileSizes: Partial<Record<StartWidgetId, StartTileSize>>
  savedViews: StartSavedView[]
  rightCollapsed: boolean
  dateRange: DateRange
  onlyMine: boolean
  filterUrgent: boolean
  filterOverdue: boolean
  lastOpenedTaskId: string | null
  readUpdateIds: string[]
  planOrder: string[] | null
}

const DEFAULT_PREFS: StartPrefs = {
  sectionOrder: DEFAULT_SECTION_ORDER,
  collapsedSections: [],
  tileSizes: {
    'active-task': 'full',
    'day-plan': 'lg',
    production: 'md',
    queue: 'md',
    overdue: 'md',
    urgent: 'sm',
    blocking: 'md',
    'activity-feed': 'md',
  },
  savedViews: [],
  rightCollapsed: false,
  dateRange: 'today',
  onlyMine: true,
  filterUrgent: false,
  filterOverdue: false,
  lastOpenedTaskId: null,
  readUpdateIds: [],
  planOrder: null,
}

export type TimerStatus = 'idle' | 'running' | 'paused'

interface StartState {
  prefsByUser: Record<string, StartPrefs>

  // Timer (session-level, not persisted)
  timerStatus: TimerStatus
  activeTimerTaskId: string | null
  timerAccumMs: number
  timerStartTs: number | null

  // Prefs actions (per-user)
  getPrefs: (userId: string) => StartPrefs
  patchPrefs: (userId: string, patch: Partial<StartPrefs>) => void
  toggleSection: (userId: string, id: StartSectionId) => void
  reorderSections: (userId: string, order: StartSectionId[]) => void
  setPlanOrder: (userId: string, order: string[]) => void
  markUpdateRead: (userId: string, id: string) => void
  markAllUpdatesRead: (userId: string, ids: string[]) => void
  setLastOpenedTask: (userId: string, taskId: string) => void

  // Timer actions
  startTimer: (taskId: string) => void
  pauseTimer: () => void
  stopTimer: () => void
  getElapsedMs: () => number
}

export const useStartStore = create<StartState>()(
  persist(
    (set, get) => ({
      prefsByUser: {},

      timerStatus: 'idle',
      activeTimerTaskId: null,
      timerAccumMs: 0,
      timerStartTs: null,

      getPrefs: (userId) => ({
        ...DEFAULT_PREFS,
        ...(get().prefsByUser[userId] ?? {}),
        tileSizes: {
          ...DEFAULT_PREFS.tileSizes,
          ...(get().prefsByUser[userId]?.tileSizes ?? {}),
        },
      }),

      patchPrefs: (userId, patch) =>
        set((state) => {
          const current = {
            ...DEFAULT_PREFS,
            ...(state.prefsByUser[userId] ?? {}),
            tileSizes: {
              ...DEFAULT_PREFS.tileSizes,
              ...(state.prefsByUser[userId]?.tileSizes ?? {}),
            },
          }
          return {
            prefsByUser: {
              ...state.prefsByUser,
              [userId]: {
                ...current,
                ...patch,
                tileSizes: patch.tileSizes ? { ...current.tileSizes, ...patch.tileSizes } : current.tileSizes,
              },
            },
          }
        }),

      toggleSection: (userId, id) =>
        set((state) => {
          const current = state.prefsByUser[userId] ?? DEFAULT_PREFS
          const collapsed = current.collapsedSections.includes(id)
            ? current.collapsedSections.filter((s) => s !== id)
            : [...current.collapsedSections, id]
          return {
            prefsByUser: {
              ...state.prefsByUser,
              [userId]: { ...current, collapsedSections: collapsed },
            },
          }
        }),

      reorderSections: (userId, order) =>
        set((state) => {
          const current = state.prefsByUser[userId] ?? DEFAULT_PREFS
          return {
            prefsByUser: { ...state.prefsByUser, [userId]: { ...current, sectionOrder: order } },
          }
        }),

      setPlanOrder: (userId, order) =>
        set((state) => {
          const current = state.prefsByUser[userId] ?? DEFAULT_PREFS
          return {
            prefsByUser: { ...state.prefsByUser, [userId]: { ...current, planOrder: order } },
          }
        }),

      markUpdateRead: (userId, id) =>
        set((state) => {
          const current = state.prefsByUser[userId] ?? DEFAULT_PREFS
          if (current.readUpdateIds.includes(id)) return state
          return {
            prefsByUser: {
              ...state.prefsByUser,
              [userId]: { ...current, readUpdateIds: [...current.readUpdateIds, id] },
            },
          }
        }),

      markAllUpdatesRead: (userId, ids) =>
        set((state) => {
          const current = state.prefsByUser[userId] ?? DEFAULT_PREFS
          const merged = Array.from(new Set([...current.readUpdateIds, ...ids]))
          return {
            prefsByUser: { ...state.prefsByUser, [userId]: { ...current, readUpdateIds: merged } },
          }
        }),

      setLastOpenedTask: (userId, taskId) =>
        set((state) => {
          const current = state.prefsByUser[userId] ?? DEFAULT_PREFS
          return {
            prefsByUser: { ...state.prefsByUser, [userId]: { ...current, lastOpenedTaskId: taskId } },
          }
        }),

      startTimer: (taskId) =>
        set((state) => {
          // Switching to a different task resets the accumulator
          const sameTask = state.activeTimerTaskId === taskId
          return {
            activeTimerTaskId: taskId,
            timerStatus: 'running',
            timerStartTs: Date.now(),
            timerAccumMs: sameTask ? state.timerAccumMs : 0,
          }
        }),

      pauseTimer: () =>
        set((state) => {
          if (state.timerStatus !== 'running' || state.timerStartTs === null) return state
          return {
            timerStatus: 'paused',
            timerAccumMs: state.timerAccumMs + (Date.now() - state.timerStartTs),
            timerStartTs: null,
          }
        }),

      stopTimer: () =>
        set({
          timerStatus: 'idle',
          activeTimerTaskId: null,
          timerAccumMs: 0,
          timerStartTs: null,
        }),

      getElapsedMs: () => {
        const { timerStatus, timerAccumMs, timerStartTs } = get()
        if (timerStatus === 'running' && timerStartTs !== null) {
          return timerAccumMs + (Date.now() - timerStartTs)
        }
        return timerAccumMs
      },
    }),
    {
      name: 'madi-flow-start-template-v1',
      partialize: (state) => ({ prefsByUser: state.prefsByUser }),
    }
  )
)
