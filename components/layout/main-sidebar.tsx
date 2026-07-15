'use client'

import {
  AlertTriangle,
  Archive,
  BarChart3,
  BookOpen,
  Calculator,
  Calendar,
  Factory,
  FileText,
  FolderOpen,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Receipt,
  Timer,
  Truck,
  Users,
} from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { useAuthStore } from '@/lib/store/auth-store'
import type { ModuleId } from '@/lib/types'

interface NavItem {
  key?: string
  id: ModuleId
  label: string
  icon: React.ReactNode
  badge?: number
}

const mainNavItems: NavItem[] = [
  { id: 'start', label: 'Widok startowy', icon: <Home size={16} /> },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { id: 'customers', label: 'Klienci', icon: <Users size={16} />, badge: 1751 },
  { id: 'orders', label: 'Zlecenia', icon: <FileText size={16} />, badge: 4 },
]

const quoteNavItems: NavItem[] = [
  { id: 'quotes', label: 'Kalkulacja i wycena', icon: <Calculator size={16} />, badge: 2 },
  { id: 'quotes-list', label: 'Lista wycen', icon: <FileText size={16} />, badge: 2 },
  { id: 'quotes-products', label: 'Lista produktow', icon: <Package size={16} /> },
]

const productionNavItems: NavItem[] = [
  { id: 'production', label: 'Produkcja', icon: <Factory size={16} />, badge: 2 },
  { id: 'planning', label: 'Planowanie', icon: <Calendar size={16} /> },
  { id: 'active-work', label: 'Active Work', icon: <Timer size={16} /> },
]

const operationsNavItems: NavItem[] = [
  { id: 'logistics', label: 'Logistyka', icon: <Truck size={16} /> },
  { id: 'invoices', label: 'Faktury', icon: <Receipt size={16} /> },
  { id: 'complaints', label: 'Reklamacje', icon: <AlertTriangle size={16} /> },
  { id: 'inventory', label: 'Magazyn', icon: <Package size={16} /> },
]

const studioNavItems: NavItem[] = [
  { id: 'studio', label: 'Projektowanie/DTP', icon: <Gauge size={16} />, badge: 6 },
  { id: 'files', label: 'Pliki', icon: <FolderOpen size={16} /> },
]

const bottomNavItems: NavItem[] = [
  { id: 'documents', label: 'Dokumenty', icon: <BookOpen size={16} /> },
  { id: 'marketing', label: 'Ogloszenia', icon: <Megaphone size={16} /> },
  { id: 'reports', label: 'Raporty', icon: <BarChart3 size={16} /> },
  { id: 'archive', label: 'Archiwum', icon: <Archive size={16} /> },
]

function NavSection({
  title,
  items,
  compact = false,
}: {
  title?: string
  items: NavItem[]
  compact?: boolean
}) {
  const { currentModule, setCurrentModule } = useAppStore()

  const openItem = (item: NavItem) => {
    setCurrentModule(item.id)
  }

  return (
    <div className={`px-2 ${compact ? 'py-1' : 'py-2'}`}>
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.6px] text-sidebar-muted">
          {title}
        </div>
      )}
      {items.map((item) => (
        <button
          key={item.key ?? item.id}
          onClick={() => openItem(item)}
          aria-current={currentModule === item.id ? 'page' : undefined}
          className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-all ${
            currentModule === item.id
              ? 'bg-sidebar-active text-sidebar-foreground shadow-[inset_3px_0_0_rgba(125,92,255,0.95)]'
              : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground'
          }`}
        >
          <span className="opacity-70">{item.icon}</span>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {item.badge ? (
            <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] text-sidebar-muted">
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function MainSidebar() {
  const { user, logout } = useAuthStore()
  const { currentModule } = useAppStore()

  const getModuleTitle = () => {
    const allItems = [...mainNavItems, ...quoteNavItems, ...studioNavItems, ...productionNavItems, ...operationsNavItems, ...bottomNavItems]
    if (currentModule === 'settings') return 'Ustawienia'
    return allItems.find((item) => item.id === currentModule)?.label || 'Zlecenia'
  }

  return (
    <div className="clickup-chrome flex min-h-0 w-[var(--app-main-sidebar-width)] shrink-0 flex-col border-r border-sidebar-border">
      <div className="border-b border-sidebar-border px-3 py-2">
        <h2 className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-semibold text-sidebar-foreground hover:bg-sidebar-hover">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#2f80ed] text-[10px] font-bold text-white">M</span>
          <span className="min-w-0 flex-1 truncate">MADI GRID</span>
          <span className="truncate text-[11px] font-normal text-sidebar-muted">{getModuleTitle()}</span>
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div>
          <NavSection title="Glowne" items={mainNavItems} />
          <NavSection title="Wyceny" items={quoteNavItems} />
          <NavSection title="Dzial graficzny" items={studioNavItems} />
          <NavSection title="Produkcja" items={productionNavItems} />
          <NavSection title="Operacje" items={operationsNavItems} />
        </div>
        <div className="mt-auto border-t border-sidebar-border/70 pt-2">
          <NavSection items={bottomNavItems} compact />
        </div>
      </div>

      <div className="mt-auto border-t border-sidebar-border p-3">
        {user ? (
          <>
            <div className="flex cursor-pointer items-center gap-2.5 rounded-md p-2 transition-all hover:bg-sidebar-hover">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: user.avatarColor }}
              >
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name}</p>
                <p className="truncate text-[10px] text-sidebar-muted">{user.department}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-sidebar-muted transition-all hover:bg-sidebar-hover hover:text-sidebar-foreground"
            >
              <LogOut size={14} />
              Wyloguj sie
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
