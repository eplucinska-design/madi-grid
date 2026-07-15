'use client'

import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { CheckCircle2, ChevronsLeftRight, PanelRightClose, PanelRightOpen, RotateCcw, Save } from 'lucide-react'
import { useAuthStore } from '@/lib/store/auth-store'
import { useAppStore } from '@/lib/store/app-store'
import { useViewPreferencesStore, type SavedView } from '@/lib/store/view-preferences-store'

interface ModuleFrameProps {
  title: string
  kicker?: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
  summary?: ReactNode
  children: ReactNode
  aside?: ReactNode
  bodyClassName?: string
  viewControls?: boolean
}

const EMPTY_SAVED_VIEWS: SavedView[] = []

export function ModuleFrame({
  title,
  kicker,
  description,
  icon,
  actions,
  summary,
  children,
  aside,
  bodyClassName = 'overflow-auto p-[var(--app-module-gap)]',
  viewControls = true,
}: ModuleFrameProps) {
  const [asideCollapsed, setAsideCollapsed] = useState(false)
  const [asideWidth, setAsideWidth] = useState(392)

  const startAsideResize = (event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startWidth = asideWidth

    const handleMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(Math.max(startWidth + startX - moveEvent.clientX, 300), 620)
      setAsideWidth(nextWidth)
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <header className="shrink-0 border-b border-border bg-background px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {icon ?? <CheckCircle2 size={13} />}
                {kicker ?? 'Obszar roboczy'}
              </div>
              <h1 className="truncate text-[clamp(17px,1vw,20px)] font-semibold text-foreground">{title}</h1>
              {description && <p className="mt-1 max-w-[min(56rem,72vw)] text-xs text-muted-foreground">{description}</p>}
            </div>
            {(actions || viewControls) && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {actions}
                {viewControls && <ModuleViewControls />}
              </div>
            )}
          </div>
        </header>
        {summary && (
          <div className="shrink-0 border-b border-border bg-muted/10 px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
            {summary}
          </div>
        )}
        <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
      </main>
      {aside && (
        <div
          data-module-aside-shell
          className={`relative hidden min-h-0 shrink-0 border-l border-border bg-background xl:flex ${
            asideCollapsed ? 'w-10' : ''
          }`}
          style={!asideCollapsed ? { width: `clamp(300px, ${asideWidth}px, min(620px, 42vw))` } : undefined}
        >
          {asideCollapsed ? (
            <button
              type="button"
              onClick={() => setAsideCollapsed(false)}
              className="flex h-full w-10 flex-col items-center gap-2 px-1 py-3 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Rozwin panel boczny"
            >
              <PanelRightOpen size={16} />
              <span className="mt-2 [writing-mode:vertical-rl] rotate-180 text-[11px] font-semibold uppercase tracking-wide">
                Panel
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onMouseDown={startAsideResize}
                className="absolute bottom-0 left-0 top-0 z-20 w-2 cursor-col-resize opacity-0 transition-opacity hover:bg-primary/20 hover:opacity-100"
                title="Zmien szerokosc panelu"
              >
                <span className="sr-only">Zmien szerokosc panelu</span>
              </button>
              <div className="absolute left-1 top-2 z-30 flex rounded-md border border-border bg-background shadow-sm">
                <button
                  type="button"
                  onClick={() => setAsideCollapsed(true)}
                  className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Zwin panel boczny"
                >
                  <PanelRightClose size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={startAsideResize}
                  className="flex h-7 w-7 cursor-col-resize items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Przeciagnij, aby zmienic szerokosc"
                >
                  <ChevronsLeftRight size={14} />
                </button>
              </div>
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden [&>aside]:h-full [&>aside]:w-full [&>aside]:min-w-0 [&>aside]:border-l-0">
                {aside}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ModuleViewControls() {
  const { user } = useAuthStore()
  const { currentModule } = useAppStore()
  const userId = user?.id ?? 'guest'
  const [viewName, setViewName] = useState('Widok roboczy')
  const savedViews = useViewPreferencesStore(
    (state) => state.prefsByUser[userId]?.[currentModule]?.savedViews ?? EMPTY_SAVED_VIEWS
  )
  const saveCurrentView = useViewPreferencesStore((state) => state.saveCurrentView)
  const restoreSavedView = useViewPreferencesStore((state) => state.restoreSavedView)
  const resetModulePrefs = useViewPreferencesStore((state) => state.resetModulePrefs)

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-muted/20 p-1">
      <input
        value={viewName}
        onChange={(event) => setViewName(event.target.value)}
        className="h-7 w-28 rounded border border-border bg-background px-2 text-[11px] outline-none focus:border-primary"
        placeholder="Nazwa widoku"
      />
      <button
        onClick={() => saveCurrentView(userId, currentModule, viewName)}
        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Zapisz widok"
      >
        <Save size={13} />
      </button>
      {savedViews.length > 0 && (
        <select
          onChange={(event) => {
            if (event.target.value) restoreSavedView(userId, currentModule, event.target.value)
            event.currentTarget.value = ''
          }}
          className="h-7 max-w-32 rounded border border-border bg-background px-1.5 text-[11px]"
          defaultValue=""
          title="Przywroc widok"
        >
          <option value="" disabled>
            Widoki
          </option>
          {savedViews.map((view) => (
            <option key={view.name} value={view.name}>
              {view.name}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={() => resetModulePrefs(userId, currentModule)}
        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Reset widoku"
      >
        <RotateCcw size={13} />
      </button>
    </div>
  )
}

export function StatStrip({
  items,
}: {
  items: Array<{ label: string; value: string | number; hint?: string; tone?: string }>
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(210px,100%),1fr))] gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-border bg-card px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
          <p className={`text-[clamp(15px,0.9vw,18px)] font-semibold ${item.tone ?? ''}`}>{item.value}</p>
          {item.hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.hint}</p>}
        </div>
      ))}
    </div>
  )
}
