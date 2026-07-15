'use client'

import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Settings, 
  Bell,
  Search,
  HelpCircle,
  Mail,
  Slack,
} from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { useNotificationsStore } from '@/lib/store/notifications-store'
import type { ModuleId } from '@/lib/types'

const iconItems: { id: ModuleId | 'search' | 'notifications' | 'help'; icon: React.ReactNode }[] = [
  { id: 'dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'orders', icon: <FileText size={18} /> },
  { id: 'production', icon: <Package size={18} /> },
]

const bottomItems: { id: 'search' | 'notifications' | 'help' | 'settings'; icon: React.ReactNode }[] = [
  { id: 'search', icon: <Search size={18} /> },
  { id: 'notifications', icon: <Bell size={18} /> },
  { id: 'help', icon: <HelpCircle size={18} /> },
  { id: 'settings', icon: <Settings size={18} /> },
]

const bottomLabels: Record<(typeof bottomItems)[number]['id'], string> = {
  search: 'Szukaj',
  notifications: 'Powiadomienia',
  help: 'Pomoc',
  settings: 'Ustawienia',
}

const externalItems: { id: 'slack' | 'mail'; label: string; href: string; target?: string; icon: React.ReactNode }[] = [
  { id: 'slack', label: 'Slack', href: 'slack://open', icon: <Slack size={18} /> },
  { id: 'mail', label: 'Poczta', href: 'https://mail.google.com/mail/u/0/#inbox', target: '_blank', icon: <Mail size={18} /> },
]

export function IconSidebar() {
  const { currentModule, setCurrentModule } = useAppStore()
  const { notifications, panelOpen, togglePanel } = useNotificationsStore()
  const unreadCount = notifications.filter((item) => !item.readAt).length
  const launchExternalApp = (item: (typeof externalItems)[number]) => {
    const link = document.createElement('a')
    link.href = item.href
    if (item.target) link.target = item.target
    link.rel = 'noopener noreferrer'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="clickup-chrome flex w-[var(--app-icon-sidebar-width)] shrink-0 flex-col items-center border-r border-sidebar-border py-2.5">
      {/* Logo */}
      <div className="mb-3.5 flex h-8 w-8 items-center justify-center rounded-md bg-[#f4f4ef] text-[#11110f] shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </div>

      {/* Top Icons */}
      {iconItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            if (item.id !== 'search' && item.id !== 'notifications' && item.id !== 'help') {
              setCurrentModule(item.id)
            }
          }}
          className={`mb-1 flex h-9 w-9 items-center justify-center rounded-md transition-all ${
            currentModule === item.id
              ? 'bg-sidebar-active text-sidebar-foreground'
              : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground'
          }`}
        >
          {item.icon}
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {externalItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => launchExternalApp(item)}
          title={item.label}
          aria-label={item.label}
          className="mb-1 flex h-9 w-9 items-center justify-center rounded-md text-sidebar-muted transition-all hover:bg-sidebar-hover hover:text-sidebar-foreground"
        >
          {item.icon}
        </button>
      ))}

      {/* Bottom Icons */}
      {bottomItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            if (item.id === 'notifications') {
              togglePanel()
            }
            if (item.id === 'settings') {
              setCurrentModule('settings')
            }
          }}
          className={`relative mb-1 flex h-9 w-9 items-center justify-center rounded-md transition-all ${
            (item.id === 'notifications' && panelOpen) || currentModule === item.id
              ? 'bg-sidebar-active text-sidebar-foreground'
              : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground'
          }`}
          title={bottomLabels[item.id]}
          aria-label={bottomLabels[item.id]}
        >
          {item.icon}
          {item.id === 'notifications' && unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
