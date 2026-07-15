'use client'

import { useEffect } from 'react'
import { IconSidebar } from './icon-sidebar'
import { MainSidebar } from './main-sidebar'
import { NotificationCenter } from './notification-center'
import { TopBar } from './top-bar'
import { WorkspaceTabs } from './workspace-tabs'
import { useAppStore } from '@/lib/store/app-store'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { ModuleHistorySync } from '@/components/module-history-sync'
import { NewOrderModalHost } from '@/components/orders/new-order-modal-host'
import { OrderWindowModalHost } from '@/components/orders/order-window-modal-host'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { theme } = useAppStore()

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-workspace-surface">
      <ModuleHistorySync />
      <KeyboardShortcuts />

      {/* Icon Sidebar */}
      <IconSidebar />
      
      {/* Main Sidebar */}
      <MainSidebar />
      
      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-workspace-surface">
        <TopBar />
        <WorkspaceTabs />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {children}
        </div>
      </div>
      <NotificationCenter />
      <NewOrderModalHost />
      <OrderWindowModalHost />
    </div>
  )
}
