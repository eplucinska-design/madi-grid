'use client'

import { useState } from 'react'
import { Pin, PinOff, X } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { useGridStore } from '@/lib/store/grid-store'
import { moduleIcon } from '@/lib/utils/module-icons'

export function WorkspaceTabs() {
  const { tabs, activeTabId, activateTab, closeTab, togglePinTab, reorderTabs, pinCurrentModule } = useAppStore()
  const setActiveTask = useGridStore((state) => state.setActiveTask)
  const [dragTabId, setDragTabId] = useState<string | null>(null)
  const [dropTabId, setDropTabId] = useState<string | null>(null)

  if (!tabs.length) return null

  const defaultHomeCreatedAt = new Date(0).toISOString()
  const visibleTabs = tabs.filter((tab) => {
    if (tab.id === activeTabId) return true
    if (tab.id === 'module-start' && tab.createdAt === defaultHomeCreatedAt) return false
    return tab.pinned
  })

  const openTab = (tabId: string) => {
    const tab = tabs.find((item) => item.id === tabId)
        if (!tab) return
        activateTab(tab.id)
        if (tab.kind === 'task' && tab.entityId) setActiveTask(tab.entityId)
  }

  const finishDrop = (targetTabId: string) => {
    if (dragTabId && dragTabId !== targetTabId) reorderTabs(dragTabId, targetTabId)
    setDragTabId(null)
    setDropTabId(null)
  }

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const active = activeTabId === tab.id
          return (
            <div
              key={tab.id}
              draggable
              onDragStart={(event) => {
                setDragTabId(tab.id)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('application/x-madi-tab', tab.id)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setDropTabId(tab.id)
              }}
              onDragLeave={() => setDropTabId((current) => (current === tab.id ? null : current))}
              onDrop={(event) => {
                event.preventDefault()
                finishDrop(tab.id)
              }}
              onDragEnd={() => {
                setDragTabId(null)
                setDropTabId(null)
              }}
              className={`group flex h-7 max-w-[240px] shrink-0 items-center gap-1 rounded-md border px-1.5 text-xs transition-colors ${
                active
                  ? 'border-primary/35 bg-primary/10 text-foreground'
                  : 'border-border bg-muted/25 text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${dragTabId === tab.id ? 'opacity-55' : ''} ${dropTabId === tab.id && dragTabId !== tab.id ? 'ring-2 ring-primary/35' : ''}`}
            >
              <button
                type="button"
                onClick={() => openTab(tab.id)}
                className="flex min-w-0 flex-1 items-center gap-1.5"
                title={tab.subtitle ? `${tab.title} - ${tab.subtitle}` : tab.title}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center ${
                    tab.kind === 'task' ? 'text-primary' : active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {tab.kind === 'task' ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : moduleIcon(tab.moduleId, 13)}
                </span>
                <span className="truncate font-medium">{tab.title}</span>
                {tab.subtitle && <span className="truncate text-[10px] text-muted-foreground">{tab.subtitle}</span>}
              </button>
              <button
                type="button"
                onClick={() => togglePinTab(tab.id)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-background/80 ${
                  tab.pinned ? 'text-primary' : 'opacity-0 group-hover:opacity-100'
                }`}
                title={tab.pinned ? 'Odepnij karte' : 'Przypnij karte'}
              >
                {tab.pinned ? <Pin size={12} /> : <PinOff size={12} />}
              </button>
              {!tab.pinned && (
                <button
                  type="button"
                  onClick={() => closeTab(tab.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 hover:bg-background/80 group-hover:opacity-100"
                  title="Zamknij karte"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => pinCurrentModule()}
        className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Przypnij aktualny widok do paska zakladek"
      >
        <Pin size={12} />
        Przypnij
      </button>
    </div>
  )
}
