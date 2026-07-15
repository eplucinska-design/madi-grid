'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bell,
  Calendar,
  CheckCheck,
  CheckCircle2,
  Copy,
  FileText,
  Flag,
  LayoutDashboard,
  LayoutGrid,
  List,
  Package,
  PanelRight,
  Plus,
  Search,
  Settings,
  Timer,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useGridStore, type GridView } from '@/lib/store/grid-store'
import { useNotificationsStore } from '@/lib/store/notifications-store'
import { useViewPreferencesStore } from '@/lib/store/view-preferences-store'
import type { ModuleId, ViewType } from '@/lib/types'
import { openNewOrderModal } from '@/components/orders/new-order-modal-host'
import { openOrderWindow } from '@/lib/utils/order-links'

type CommandKind = 'module' | 'action' | 'view'

interface ShortcutCommand {
  id: string
  kind: CommandKind
  title: string
  hint: string
  shortcut?: string
  icon: ReactNode
  keywords: string[]
  action: () => void
}

const moduleCommands: Array<{
  module: ModuleId
  title: string
  hint: string
  shortcut?: string
  icon: ReactNode
  keywords: string[]
}> = [
  { module: 'start', title: 'Widok startowy', hint: 'Przejdz do pulpitu pracy', icon: <LayoutDashboard size={15} />, keywords: ['home', 'start', 'pulpit'] },
  { module: 'dashboard', title: 'Dashboard', hint: 'Podsumowania i metryki', icon: <LayoutDashboard size={15} />, keywords: ['dashboard', 'metryki'] },
  { module: 'customers', title: 'Klienci', hint: 'CRM i kontakty', icon: <Users size={15} />, keywords: ['klienci', 'crm', 'kontakt'] },
  { module: 'quotes', title: 'Kalkulacja i wycena', hint: 'Pelny formularz, produkty i procesy', icon: <FileText size={15} />, keywords: ['wyceny', 'kalkulacje', 'produkty'] },
  { module: 'quotes-list', title: 'Lista wycen', hint: 'Archiwum i statusy wycen', icon: <FileText size={15} />, keywords: ['lista wycen', 'archiwum wycen'] },
  { module: 'quotes-products', title: 'Lista produktow', hint: 'Produkty i warianty do kalkulacji', icon: <Package size={15} />, keywords: ['produkty', 'lista produktow'] },
  { module: 'studio', title: 'Projektowanie i prepress', hint: 'Oblozenie grafika, projektowanie, prepress i kalendarz', icon: <Timer size={15} />, keywords: ['studio', 'grafik', 'workload', 'oblozenie', 'prepress'] },
  { module: 'orders', title: 'Zlecenia', hint: 'Tablica zlecen i RCP', icon: <FileText size={15} />, keywords: ['zlecenia', 'zadania'] },
  { module: 'prepress', title: 'Prepress / DTP', hint: 'Grafik, pliki i akceptacje', icon: <FileText size={15} />, keywords: ['prepress', 'dtp', 'grafik', 'pliki'] },
  { module: 'production', title: 'Produkcja', hint: 'Druk i introligatornia', icon: <Package size={15} />, keywords: ['produkcja', 'druk', 'intro'] },
  { module: 'planning', title: 'Planowanie', hint: 'Kalendarz pracy', icon: <Calendar size={15} />, keywords: ['planowanie', 'kalendarz'] },
  { module: 'active-work', title: 'Active Work', hint: 'Biezaca praca i blokady', icon: <Timer size={15} />, keywords: ['active', 'rcp', 'czas'] },
  { module: 'inventory', title: 'Magazyn', hint: 'Materialy i rezerwacje', icon: <Package size={15} />, keywords: ['magazyn', 'materialy'] },
  { module: 'settings', title: 'Ustawienia', hint: 'Role, konta i integracje', icon: <Settings size={15} />, keywords: ['ustawienia', 'settings'] },
]

const shortcutRows = [
  ['Ctrl/Cmd K', 'Paleta polecen'],
  ['/', 'Szukaj polecenia'],
  ['Ctrl/Cmd Shift ?', 'Pomoc skrotow'],
  ['Ctrl/Cmd N', 'Nowe zlecenie'],
  ['L / B / C', 'Szybka zmiana widoku'],
  ['Ctrl/Cmd Enter', 'Aktywne zadanie jako gotowe'],
  ['Shift D', 'Duplikuj aktywne zadanie'],
  ['Shift O', 'Otworz aktywne zlecenie'],
  ['Shift Delete', 'Usun aktywne zadanie'],
  ['Alt + scroll', 'Przewijanie poziome'],
  ['Alt N', 'Powiadomienia'],
  ['Alt T', 'Motyw jasny / ciemny'],
  ['Esc', 'Zamknij panel lub palete'],
]

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, option, [contenteditable="true"], [role="textbox"], [data-keyboard-scope="input"]'
    )
  )
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function commandMatches(command: ShortcutCommand, query: string) {
  if (!query) return true
  const needle = normalize(query)
  return normalize([command.title, command.hint, command.shortcut, ...command.keywords].join(' ')).includes(needle)
}

export function KeyboardShortcuts() {
  const { currentModule, setCurrentModule, toggleTheme, setCurrentView: setAppView } = useAppStore()
  const { user } = useAuthStore()
  const {
    deleteTask,
    duplicateTask,
    getActiveTask,
    setCurrentView: setGridView,
    updateTask,
  } = useGridStore()
  const { panelOpen, setPanelOpen, togglePanel, markAllRead, notifications } = useNotificationsStore()
  const patchModulePrefs = useViewPreferencesStore((state) => state.patchModulePrefs)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const unreadCount = notifications.filter((item) => !item.readAt).length
  const userId = user?.id ?? 'guest'

  const goToModule = (module: ModuleId) => {
    setCurrentModule(module)
    setPaletteOpen(false)
    setHelpOpen(false)
    setQuery('')
  }

  const createNewOrder = () => {
    setCurrentModule('orders')
    openNewOrderModal()
    setPaletteOpen(false)
    setHelpOpen(false)
    setQuery('')
  }

  const setWorkspaceView = (view: GridView) => {
    setGridView(view)
    setAppView(view as ViewType)
    patchModulePrefs(userId, currentModule, { currentView: view })
    setPaletteOpen(false)
    setHelpOpen(false)
  }

  const withActiveTask = (action: (taskId: string) => void) => {
    const task = getActiveTask()
    if (!task) return false
    action(task.id)
    setPaletteOpen(false)
    setHelpOpen(false)
    setQuery('')
    return true
  }

  const markActiveDone = () => {
    withActiveTask((taskId) => updateTask(taskId, { status: 'done' }))
  }

  const markActiveUrgent = () => {
    withActiveTask((taskId) => updateTask(taskId, { priority: 'urgent' }))
  }

  const duplicateActiveTask = () => {
    withActiveTask((taskId) => duplicateTask(taskId))
  }

  const deleteActiveTask = () => {
    withActiveTask((taskId) => deleteTask(taskId))
  }

  const openActiveTaskWindow = () => {
    const task = getActiveTask()
    if (!task) return
    openOrderWindow(task.id, task.orderNumber)
    setPaletteOpen(false)
    setHelpOpen(false)
    setQuery('')
  }

  const commands = useMemo<ShortcutCommand[]>(() => {
    const moduleItems: ShortcutCommand[] = moduleCommands.map((item) => ({
      id: `module-${item.module}`,
      kind: 'module',
      title: item.title,
      hint: item.hint,
      shortcut: item.shortcut,
      icon: item.icon,
      keywords: item.keywords,
      action: () => goToModule(item.module),
    }))

    return [
      {
        id: 'action-new-order',
        kind: 'action',
        title: 'Nowe zlecenie',
        hint: 'Otworz formularz zlecenia z procesami RCP',
        shortcut: 'Ctrl/Cmd N',
        icon: <Plus size={15} />,
        keywords: ['nowe', 'zlecenie', 'zadanie'],
        action: createNewOrder,
      },
      {
        id: 'action-notifications',
        kind: 'action',
        title: panelOpen ? 'Zamknij powiadomienia' : 'Otworz powiadomienia',
        hint: unreadCount ? `${unreadCount} nieprzeczytanych` : 'Centrum powiadomien',
        shortcut: 'Alt N',
        icon: <Bell size={15} />,
        keywords: ['powiadomienia', 'alerty', 'rcp'],
        action: () => {
          togglePanel()
          setPaletteOpen(false)
          setHelpOpen(false)
        },
      },
      {
        id: 'action-read-notifications',
        kind: 'action',
        title: 'Oznacz powiadomienia jako przeczytane',
        hint: unreadCount ? `${unreadCount} do oznaczenia` : 'Brak nieprzeczytanych',
        icon: <CheckCheck size={15} />,
        keywords: ['przeczytane', 'powiadomienia'],
        action: () => {
          markAllRead()
          setPaletteOpen(false)
          setHelpOpen(false)
        },
      },
      {
        id: 'action-theme',
        kind: 'action',
        title: 'Przelacz motyw',
        hint: 'Jasny / ciemny',
        shortcut: 'Alt T',
        icon: <Settings size={15} />,
        keywords: ['motyw', 'theme', 'dark'],
        action: () => {
          toggleTheme()
          setPaletteOpen(false)
          setHelpOpen(false)
        },
      },
      {
        id: 'task-done',
        kind: 'action',
        title: 'Oznacz aktywne zadanie jako gotowe',
        hint: 'Dziala na ostatnio klikniete zadanie',
        shortcut: 'Ctrl Enter',
        icon: <CheckCircle2 size={15} />,
        keywords: ['gotowe', 'done', 'koniec', 'zadanie'],
        action: markActiveDone,
      },
      {
        id: 'task-urgent',
        kind: 'action',
        title: 'Oznacz aktywne zadanie jako pilne',
        hint: 'Ustawia priorytet Pilne',
        shortcut: 'Shift P',
        icon: <Flag size={15} />,
        keywords: ['pilne', 'priorytet', 'urgent'],
        action: markActiveUrgent,
      },
      {
        id: 'task-open-window',
        kind: 'action',
        title: 'Otworz aktywne zlecenie',
        hint: 'Otwiera zlecenie w oknie/panelu pracy',
        shortcut: 'Shift O',
        icon: <PanelRight size={15} />,
        keywords: ['otworz', 'okno', 'zlecenie'],
        action: openActiveTaskWindow,
      },
      {
        id: 'task-duplicate',
        kind: 'action',
        title: 'Duplikuj aktywne zadanie',
        hint: 'Tworzy kopie ostatnio kliknietego zadania',
        shortcut: 'Shift D',
        icon: <Copy size={15} />,
        keywords: ['duplikuj', 'kopia', 'zadanie'],
        action: duplicateActiveTask,
      },
      {
        id: 'task-delete',
        kind: 'action',
        title: 'Usun aktywne zadanie',
        hint: 'Usuwa ostatnio klikniete zadanie',
        shortcut: 'Shift Delete',
        icon: <Trash2 size={15} />,
        keywords: ['usun', 'delete', 'zadanie'],
        action: deleteActiveTask,
      },
      {
        id: 'view-list',
        kind: 'view',
        title: 'Widok listy',
        hint: 'Przelacz obszar roboczy na liste',
        shortcut: 'L',
        icon: <List size={15} />,
        keywords: ['lista', 'list'],
        action: () => setWorkspaceView('list'),
      },
      {
        id: 'view-board',
        kind: 'view',
        title: 'Widok board',
        hint: 'Przelacz obszar roboczy na tablice',
        shortcut: 'B',
        icon: <LayoutGrid size={15} />,
        keywords: ['board', 'kanban', 'tablica'],
        action: () => setWorkspaceView('board'),
      },
      {
        id: 'view-calendar',
        kind: 'view',
        title: 'Widok kalendarza',
        hint: 'Przelacz obszar roboczy na terminy',
        shortcut: 'C',
        icon: <Calendar size={15} />,
        keywords: ['kalendarz', 'terminy'],
        action: () => setWorkspaceView('calendar'),
      },
      ...moduleItems,
    ]
  }, [currentModule, panelOpen, unreadCount, userId])

  const filteredCommands = useMemo(
    () => commands.filter((command) => commandMatches(command, query)).slice(0, 12),
    [commands, query]
  )

  const openPalette = () => {
    setHelpOpen(false)
    setPaletteOpen(true)
    setActiveIndex(0)
  }

  useEffect(() => {
    if (!paletteOpen) return
    const id = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [paletteOpen])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const handleOpenPalette = () => openPalette()
    window.addEventListener('madi:open-command-palette', handleOpenPalette)
    return () => window.removeEventListener('madi:open-command-palette', handleOpenPalette)
  }, [])

  useEffect(() => {
    const runDirectCommand = (id: string) => {
      const command = commands.find((item) => item.id === id)
      command?.action()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const editable = isEditableTarget(event.target)

      if (event.isComposing) return

      if (event.key === 'Escape') {
        if (paletteOpen || helpOpen) {
          event.preventDefault()
          setPaletteOpen(false)
          setHelpOpen(false)
          setQuery('')
          return
        }
        if (panelOpen) {
          event.preventDefault()
          setPanelOpen(false)
        }
        return
      }

      if (!editable && (event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault()
        openPalette()
        return
      }

      if (!editable && (event.ctrlKey || event.metaKey) && key === 'n') {
        event.preventDefault()
        createNewOrder()
        return
      }

      if (!editable && (event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === '?' || key === '/')) {
        event.preventDefault()
        setPaletteOpen(false)
        setHelpOpen(true)
        return
      }

      if (!editable && (event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        markActiveDone()
        return
      }

      if (paletteOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setActiveIndex((index) => Math.min(index + 1, Math.max(0, filteredCommands.length - 1)))
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setActiveIndex((index) => Math.max(0, index - 1))
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          filteredCommands[activeIndex]?.action()
          return
        }
      }

      if (editable) return

      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        openPalette()
        return
      }

      if (event.altKey && key === 'n') {
        event.preventDefault()
        togglePanel()
        return
      }

      if (event.altKey && key === 't') {
        event.preventDefault()
        toggleTheme()
        return
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.shiftKey && key === 'p') {
          event.preventDefault()
          markActiveUrgent()
          return
        }
        if (event.shiftKey && key === 'd') {
          event.preventDefault()
          duplicateActiveTask()
          return
        }
        if (event.shiftKey && key === 'o') {
          event.preventDefault()
          openActiveTaskWindow()
          return
        }
        if (event.shiftKey && (event.key === 'Delete' || event.key === 'Backspace')) {
          event.preventDefault()
          deleteActiveTask()
          return
        }
        if (!event.shiftKey && key === 'l') {
          event.preventDefault()
          runDirectCommand('view-list')
          return
        }
        if (!event.shiftKey && key === 'b') {
          event.preventDefault()
          runDirectCommand('view-board')
          return
        }
        if (!event.shiftKey && key === 'c') {
          event.preventDefault()
          runDirectCommand('view-calendar')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commands, filteredCommands, activeIndex, paletteOpen, helpOpen, panelOpen, togglePanel, toggleTheme, setPanelOpen])

  useEffect(() => {
    const findHorizontalScroller = (target: EventTarget | null) => {
      let node = target instanceof HTMLElement ? target : null
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node)
        const canScroll = node.scrollWidth > node.clientWidth + 2
        const allowsScroll = /(auto|scroll|overlay)/.test(`${style.overflowX} ${style.overflow}`)
        if (canScroll && allowsScroll) return node
        node = node.parentElement
      }
      return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null
    }

    const handleWheel = (event: WheelEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return
      const scroller = findHorizontalScroller(event.target)
      if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (!delta) return
      event.preventDefault()
      scroller.scrollLeft += delta
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <>
      {(paletteOpen || helpOpen) && (
        <div className="fixed inset-0 z-[6300] bg-background/75 p-4 backdrop-blur-sm" onMouseDown={() => { setPaletteOpen(false); setHelpOpen(false); setQuery('') }}>
          <div
            className="mx-auto mt-[8vh] w-full max-w-2xl overflow-hidden rounded-md border border-border bg-card shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Search size={16} className="text-muted-foreground" />
              {paletteOpen ? (
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Szukaj polecenia, modulu albo widoku..."
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              ) : (
                <div className="flex h-9 flex-1 items-center text-sm font-semibold">Skroty klawiszowe</div>
              )}
              <button
                onClick={() => { setPaletteOpen(false); setHelpOpen(false); setQuery('') }}
                className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Zamknij"
              >
                <X size={16} />
              </button>
            </div>

            {paletteOpen ? (
              <div className="max-h-[58vh] overflow-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="rounded-md border border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                    Brak pasujacych polecen.
                  </div>
                ) : (
                  filteredCommands.map((command, index) => (
                    <button
                      key={command.id}
                      onClick={command.action}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                        activeIndex === index ? 'bg-primary/10 text-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        {command.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{command.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{command.hint}</span>
                      </span>
                      {command.shortcut && (
                        <kbd className="shrink-0 rounded border border-border bg-background px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                          {command.shortcut}
                        </kbd>
                      )}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {shortcutRows.map(([keys, label]) => (
                  <div key={keys} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <kbd className="rounded border border-border bg-background px-2 py-1 text-[10px] font-semibold text-foreground">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
