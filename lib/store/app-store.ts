import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleId, ViewType } from '@/lib/types'

const moduleLabels: Record<ModuleId, string> = {
  start: 'Home',
  grid: 'MADI GRID',
  dashboard: 'Dashboard',
  customers: 'Klienci',
  quotes: 'Kalkulacja i wycena',
  'quotes-list': 'Lista wycen',
  'quotes-products': 'Lista produktow',
  studio: 'Projektowanie i prepress',
  'studio-design': 'Projektowanie i prepress',
  orders: 'Zlecenia',
  files: 'Pliki',
  prepress: 'Projektowanie i prepress',
  production: 'Produkcja',
  planning: 'Planowanie',
  'active-work': 'Active Work',
  logistics: 'Logistyka',
  invoices: 'Faktury',
  complaints: 'Reklamacje',
  inventory: 'Magazyn',
  documents: 'Dokumenty',
  communication: 'Komunikacja',
  marketing: 'Ogłoszenia',
  reports: 'Raporty',
  archive: 'Archiwum',
  settings: 'Ustawienia',
}

export interface WorkspaceTab {
  id: string
  kind: 'module' | 'task'
  title: string
  subtitle?: string
  moduleId: ModuleId
  entityId?: string
  pinned: boolean
  createdAt: string
}

interface AppState {
  // Navigation
  currentModule: ModuleId
  expandedSpaces: string[]
  tabs: WorkspaceTab[]
  activeTabId: string | null
  
  // Theme
  theme: 'light' | 'dark'
  
  // View
  currentView: ViewType
  
  // Panel
  selectedOrderId: string | null
  isPanelOpen: boolean
  
  // Actions
  setCurrentModule: (module: ModuleId) => void
  openModuleTab: (module: ModuleId, title?: string, pinned?: boolean) => void
  openTaskTab: (input: { taskId: string; title: string; orderNumber?: string; moduleId?: ModuleId; pinned?: boolean }) => void
  activateTab: (tabId: string) => void
  closeTab: (tabId: string) => void
  togglePinTab: (tabId: string) => void
  reorderTabs: (sourceTabId: string, targetTabId: string) => void
  pinCurrentModule: (title?: string) => void
  toggleSpace: (spaceId: string) => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  setCurrentView: (view: ViewType) => void
  selectOrder: (orderId: string | null) => void
  closePanel: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentModule: 'start',
      expandedSpaces: ['studio'],
      tabs: [
        {
          id: 'module-start',
          kind: 'module',
          title: 'Home',
          moduleId: 'start',
          pinned: false,
          createdAt: new Date(0).toISOString(),
        },
      ],
      activeTabId: 'module-start',
      theme: 'light',
      currentView: 'list',
      selectedOrderId: null,
      isPanelOpen: false,

      setCurrentModule: (module) => set((state) => {
        const tabId = `module-${module}`
        const defaultHomeCreatedAt = new Date(0).toISOString()
        const pinnedTabs = state.tabs.filter(
          (tab) => tab.pinned && !(tab.id === 'module-start' && tab.createdAt === defaultHomeCreatedAt && module !== 'start')
        )
        const existingPinned = pinnedTabs.some((tab) => tab.id === tabId)
        const currentTab = {
          id: tabId,
          kind: 'module' as const,
          title: moduleLabels[module] ?? module,
          moduleId: module,
          pinned: false,
          createdAt: new Date().toISOString(),
        }
        return {
          currentModule: module,
          activeTabId: tabId,
          tabs: existingPinned ? pinnedTabs : [...pinnedTabs, currentTab],
        }
      }),

      openModuleTab: (module, title, pinned = false) => set((state) => {
        const tabId = `module-${module}`
        const pinnedTabs = state.tabs.filter((tab) => tab.pinned && tab.id !== tabId)
        const existing = state.tabs.find((tab) => tab.id === tabId)
        const nextTab = existing
          ? { ...existing, title: title ?? existing.title, pinned: existing.pinned || pinned }
          : {
              id: tabId,
              kind: 'module' as const,
              title: title ?? moduleLabels[module] ?? module,
              moduleId: module,
              pinned,
              createdAt: new Date().toISOString(),
            }
        const nextTabs = nextTab.pinned ? [...pinnedTabs, nextTab] : [...pinnedTabs, nextTab]
        return { currentModule: module, activeTabId: tabId, tabs: nextTabs }
      }),

      openTaskTab: ({ taskId, title, orderNumber, moduleId = 'orders', pinned = false }) => set((state) => {
        const tabId = `task-${taskId}`
        const pinnedTabs = state.tabs.filter((tab) => tab.pinned && tab.id !== tabId)
        const existing = state.tabs.find((tab) => tab.id === tabId)
        const nextTab = existing
          ? { ...existing, title, subtitle: orderNumber ?? existing.subtitle, pinned: existing.pinned || pinned }
          : {
              id: tabId,
              kind: 'task' as const,
              title,
              subtitle: orderNumber,
              moduleId,
              entityId: taskId,
              pinned,
              createdAt: new Date().toISOString(),
            }
        const nextTabs = [...pinnedTabs, nextTab]
        return { currentModule: moduleId, activeTabId: tabId, tabs: nextTabs }
      }),

      activateTab: (tabId) => set((state) => {
        const tab = state.tabs.find((item) => item.id === tabId)
        if (!tab) return {}
        return { activeTabId: tab.id, currentModule: tab.moduleId }
      }),

      closeTab: (tabId) => set((state) => {
        const nextTabs = state.tabs.filter((tab) => tab.id !== tabId || tab.pinned)
        const closedActive = state.activeTabId === tabId
        const fallback = nextTabs.length ? nextTabs[nextTabs.length - 1] : null
        return {
          tabs: nextTabs,
          activeTabId: closedActive ? fallback?.id ?? null : state.activeTabId,
          currentModule: closedActive ? fallback?.moduleId ?? state.currentModule : state.currentModule,
        }
      }),

      togglePinTab: (tabId) => set((state) => ({
        tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, pinned: !tab.pinned } : tab)),
      })),

      reorderTabs: (sourceTabId, targetTabId) => set((state) => {
        if (sourceTabId === targetTabId) return {}
        const sourceIndex = state.tabs.findIndex((tab) => tab.id === sourceTabId)
        const targetIndex = state.tabs.findIndex((tab) => tab.id === targetTabId)
        if (sourceIndex < 0 || targetIndex < 0) return {}
        const nextTabs = [...state.tabs]
        const [sourceTab] = nextTabs.splice(sourceIndex, 1)
        nextTabs.splice(targetIndex, 0, sourceTab)
        return { tabs: nextTabs }
      }),

      pinCurrentModule: (title) => set((state) => {
        const tabId = `module-${state.currentModule}`
        const existing = state.tabs.some((tab) => tab.id === tabId)
        return {
          activeTabId: tabId,
          tabs: existing
            ? state.tabs.map((tab) => (tab.id === tabId ? { ...tab, title: title ?? tab.title, pinned: true } : tab))
            : [
                ...state.tabs,
                {
                  id: tabId,
                  kind: 'module',
                  title: title ?? moduleLabels[state.currentModule] ?? state.currentModule,
                  moduleId: state.currentModule,
                  pinned: true,
                  createdAt: new Date().toISOString(),
                },
              ],
        }
      }),
  
      toggleSpace: (spaceId) => set((state) => ({
        expandedSpaces: state.expandedSpaces.includes(spaceId)
          ? state.expandedSpaces.filter(id => id !== spaceId)
          : [...state.expandedSpaces, spaceId]
      })),
  
      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark')
        }
        return set({ theme })
      },
  
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light'
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', newTheme === 'dark')
        }
        return { theme: newTheme }
      }),
  
      setCurrentView: (view) => set({ currentView: view }),
  
      selectOrder: (orderId) => set({ 
        selectedOrderId: orderId,
        isPanelOpen: orderId !== null,
      }),
  
      closePanel: () => set({ 
        selectedOrderId: null,
        isPanelOpen: false,
      }),
    }),
    {
      name: 'madi-flow-app-template-v1',
      partialize: (state) => ({
        currentModule: state.currentModule,
        expandedSpaces: state.expandedSpaces,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        theme: state.theme,
        currentView: state.currentView,
      }),
    }
  )
)
