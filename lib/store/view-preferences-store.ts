import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleId, ViewType } from '@/lib/types'
import type { GridView } from '@/lib/store/grid-store'

export interface SavedView {
  name: string
  currentView: GridView | ViewType
  boardColumnWidths: Record<string, number>
  listColumnWidths: Record<string, number>
  collapsedPanels: string[]
  compactCards: boolean
  showSummary: boolean
  savedAt: string
}

export interface ModuleViewPrefs {
  currentView: GridView | ViewType | null
  boardColumnWidths: Record<string, number>
  listColumnWidths: Record<string, number>
  collapsedPanels: string[]
  compactCards: boolean
  showSummary: boolean
  savedViews: SavedView[]
}

interface ViewPrefsState {
  prefsByUser: Record<string, Record<string, ModuleViewPrefs>>
  getModulePrefs: (userId: string, moduleId: ModuleId | string) => ModuleViewPrefs
  patchModulePrefs: (userId: string, moduleId: ModuleId | string, patch: Partial<ModuleViewPrefs>) => void
  setBoardColumnWidth: (userId: string, moduleId: ModuleId | string, columnId: string, width: number) => void
  setListColumnWidth: (userId: string, moduleId: ModuleId | string, columnId: string, width: number) => void
  toggleCollapsedPanel: (userId: string, moduleId: ModuleId | string, panelId: string) => void
  saveCurrentView: (userId: string, moduleId: ModuleId | string, name: string) => void
  restoreSavedView: (userId: string, moduleId: ModuleId | string, name: string) => void
  deleteSavedView: (userId: string, moduleId: ModuleId | string, name: string) => void
  resetModulePrefs: (userId: string, moduleId: ModuleId | string) => void
}

const DEFAULT_PREFS: ModuleViewPrefs = {
  currentView: null,
  boardColumnWidths: {},
  listColumnWidths: {},
  collapsedPanels: [],
  compactCards: false,
  showSummary: true,
  savedViews: [],
}

function clampWidth(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max)
}

function mergePrefs(prefs?: ModuleViewPrefs): ModuleViewPrefs {
  return {
    ...DEFAULT_PREFS,
    ...(prefs ?? {}),
    boardColumnWidths: { ...DEFAULT_PREFS.boardColumnWidths, ...(prefs?.boardColumnWidths ?? {}) },
    listColumnWidths: { ...DEFAULT_PREFS.listColumnWidths, ...(prefs?.listColumnWidths ?? {}) },
    collapsedPanels: prefs?.collapsedPanels ?? DEFAULT_PREFS.collapsedPanels,
    savedViews: prefs?.savedViews ?? DEFAULT_PREFS.savedViews,
  }
}

export const useViewPreferencesStore = create<ViewPrefsState>()(
  persist(
    (set, get) => ({
      prefsByUser: {},

      getModulePrefs: (userId, moduleId) => mergePrefs(get().prefsByUser[userId]?.[moduleId]),

      patchModulePrefs: (userId, moduleId, patch) =>
        set((state) => {
          const current = mergePrefs(state.prefsByUser[userId]?.[moduleId])
          return {
            prefsByUser: {
              ...state.prefsByUser,
              [userId]: {
                ...(state.prefsByUser[userId] ?? {}),
                [moduleId]: mergePrefs({ ...current, ...patch }),
              },
            },
          }
        }),

      setBoardColumnWidth: (userId, moduleId, columnId, width) =>
        set((state) => {
          const current = mergePrefs(state.prefsByUser[userId]?.[moduleId])
          return {
            prefsByUser: {
              ...state.prefsByUser,
              [userId]: {
                ...(state.prefsByUser[userId] ?? {}),
                [moduleId]: {
                  ...current,
                  boardColumnWidths: {
                    ...current.boardColumnWidths,
                    [columnId]: clampWidth(width, 240, 520),
                  },
                },
              },
            },
          }
        }),

      setListColumnWidth: (userId, moduleId, columnId, width) =>
        set((state) => {
          const current = mergePrefs(state.prefsByUser[userId]?.[moduleId])
          return {
            prefsByUser: {
              ...state.prefsByUser,
              [userId]: {
                ...(state.prefsByUser[userId] ?? {}),
                [moduleId]: {
                  ...current,
                  listColumnWidths: {
                    ...current.listColumnWidths,
                    [columnId]: clampWidth(width, 60, 720),
                  },
                },
              },
            },
          }
        }),

      toggleCollapsedPanel: (userId, moduleId, panelId) =>
        set((state) => {
          const current = mergePrefs(state.prefsByUser[userId]?.[moduleId])
          const collapsedPanels = current.collapsedPanels.includes(panelId)
            ? current.collapsedPanels.filter((id) => id !== panelId)
            : [...current.collapsedPanels, panelId]
          return {
            prefsByUser: {
              ...state.prefsByUser,
              [userId]: {
                ...(state.prefsByUser[userId] ?? {}),
                [moduleId]: { ...current, collapsedPanels },
              },
            },
          }
        }),

      saveCurrentView: (userId, moduleId, name) =>
        set((state) => {
          const current = mergePrefs(state.prefsByUser[userId]?.[moduleId])
          const trimmed = name.trim() || 'Widok roboczy'
          const saved: SavedView = {
            name: trimmed,
            currentView: current.currentView ?? 'list',
            boardColumnWidths: current.boardColumnWidths,
            listColumnWidths: current.listColumnWidths,
            collapsedPanels: current.collapsedPanels,
            compactCards: current.compactCards,
            showSummary: current.showSummary,
            savedAt: new Date().toISOString(),
          }
          return {
            prefsByUser: {
              ...state.prefsByUser,
              [userId]: {
                ...(state.prefsByUser[userId] ?? {}),
                [moduleId]: {
                  ...current,
                  savedViews: [saved, ...current.savedViews.filter((item) => item.name !== trimmed)].slice(0, 8),
                },
              },
            },
          }
        }),

      restoreSavedView: (userId, moduleId, name) =>
        set((state) => {
          const current = mergePrefs(state.prefsByUser[userId]?.[moduleId])
          const saved = current.savedViews.find((item) => item.name === name)
          if (!saved) return state
          return {
            prefsByUser: {
              ...state.prefsByUser,
              [userId]: {
                ...(state.prefsByUser[userId] ?? {}),
                [moduleId]: {
                  ...current,
                  currentView: saved.currentView,
                  boardColumnWidths: saved.boardColumnWidths,
                  listColumnWidths: saved.listColumnWidths,
                  collapsedPanels: saved.collapsedPanels,
                  compactCards: saved.compactCards,
                  showSummary: saved.showSummary,
                },
              },
            },
          }
        }),

      deleteSavedView: (userId, moduleId, name) =>
        set((state) => {
          const current = mergePrefs(state.prefsByUser[userId]?.[moduleId])
          return {
            prefsByUser: {
              ...state.prefsByUser,
              [userId]: {
                ...(state.prefsByUser[userId] ?? {}),
                [moduleId]: {
                  ...current,
                  savedViews: current.savedViews.filter((item) => item.name !== name),
                },
              },
            },
          }
        }),

      resetModulePrefs: (userId, moduleId) =>
        set((state) => ({
          prefsByUser: {
            ...state.prefsByUser,
            [userId]: {
              ...(state.prefsByUser[userId] ?? {}),
              [moduleId]: DEFAULT_PREFS,
            },
          },
        })),
    }),
    {
      name: 'madi-view-preferences-template-v1',
    }
  )
)
