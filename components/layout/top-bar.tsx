'use client'

import {
  Search,
  Filter,
  Plus,
  Bell,
  Sun,
  Moon,
  List,
  LayoutGrid,
  Calendar,
  Clock,
} from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { useNotificationsStore } from '@/lib/store/notifications-store'
import { openNewOrderModal } from '@/components/orders/new-order-modal-host'
import { moduleIcon } from '@/lib/utils/module-icons'
import type { ViewType } from '@/lib/types'

const viewTabs: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'list', label: 'Lista', icon: <List size={14} /> },
  { id: 'board', label: 'Kanban', icon: <LayoutGrid size={14} /> },
  { id: 'calendar', label: 'Kalendarz', icon: <Calendar size={14} /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
]

export function TopBar() {
  const { currentModule, currentView, setCurrentView, setCurrentModule, theme, toggleTheme } = useAppStore()
  const { notifications, panelOpen, togglePanel } = useNotificationsStore()
  const unreadCount = notifications.filter((item) => !item.readAt).length

  const openCommandPalette = () => {
    window.dispatchEvent(new Event('madi:open-command-palette'))
  }

  const getBreadcrumb = () => {
    const moduleLabels: Record<string, string> = {
      start: 'Widok startowy',
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
      marketing: 'Marketing',
      reports: 'Raporty',
      archive: 'Archiwum',
      settings: 'Ustawienia',
    }
    return moduleLabels[currentModule] || 'Zlecenia'
  }

  return (
    <div className="flex h-[var(--app-topbar-height)] shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <div className="flex min-w-0 items-center gap-2 rounded-md px-1 text-[13px] text-muted-foreground">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
          {moduleIcon(currentModule, 13)}
        </span>
        <span className="truncate text-[14px] font-semibold text-foreground">
          {getBreadcrumb()}
        </span>
      </div>

      <div className="ml-3 hidden items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5">
        {viewTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id)}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-all ${
              currentView === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 justify-center px-2">
        <button
          type="button"
          onClick={openCommandPalette}
          className="hidden h-[var(--app-control-height)] w-[min(420px,34vw)] items-center gap-2 rounded-full border border-border bg-muted/55 px-3 text-muted-foreground transition-all hover:bg-muted/80 md:flex"
          title="Otworz palete polecen"
        >
          <Search size={14} />
          <span className="min-w-0 flex-1 text-left text-xs">Szukaj, komenda lub zadanie...</span>
          <kbd className="rounded bg-background/70 px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
          <Filter size={18} />
        </button>

        <button
          onClick={togglePanel}
          className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-all ${
            panelOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title="Powiadomienia"
          aria-label="Powiadomienia"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={() => {
            setCurrentModule('orders')
            openNewOrderModal()
          }}
          className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90"
        >
          <Plus size={14} />
          <span className="hidden xl:inline">Nowe zlecenie</span>
        </button>
      </div>
    </div>
  )
}
