'use client'

import { useRef } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, ChevronDown, ChevronRight, ExternalLink, Grip, GripVertical } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import type { StartTileSize } from '@/lib/store/start-store'
import type { ModuleId } from '@/lib/types'

interface SectionShellProps {
  title: string
  icon: ReactNode
  count?: number
  accent?: string
  collapsed: boolean
  onToggle: () => void
  /** in-app module to switch to when clicking the open icon */
  openModule?: ModuleId
  /** route to open in a separate browser tab */
  openHref?: string
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDragTarget?: boolean
  size?: StartTileSize
  onSizeChange?: (size: StartTileSize) => void
  children: ReactNode
}

const tileSizeOptions: StartTileSize[] = ['sm', 'md', 'lg', 'full']

export function TileResizeHandle({
  value,
  onChange,
  className = '',
}: {
  value: StartTileSize
  onChange: (size: StartTileSize) => void
  className?: string
}) {
  const resizeStartRef = useRef<{ x: number; y: number; index: number } | null>(null)

  const startTileResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const startIndex = tileSizeOptions.indexOf(value)
    resizeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      index: startIndex >= 0 ? startIndex : 1,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveTileResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = resizeStartRef.current
    if (!start) return
    const delta = Math.max(event.clientX - start.x, event.clientY - start.y)
    const steps = Math.round(delta / 120)
    const nextIndex = Math.max(0, Math.min(tileSizeOptions.length - 1, start.index + steps))
    onChange(tileSizeOptions[nextIndex])
  }

  const stopTileResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    resizeStartRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <button
      type="button"
      onPointerDown={startTileResize}
      onPointerMove={moveTileResize}
      onPointerUp={stopTileResize}
      onPointerCancel={stopTileResize}
      className={`absolute bottom-1 right-1 flex h-6 w-6 cursor-nwse-resize items-center justify-center rounded-md text-muted-foreground/45 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/tile:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      title="Zmien rozmiar kafelka przeciagajac rog"
      aria-label="Zmien rozmiar kafelka"
    >
      <Grip size={13} />
    </button>
  )
}

export function SectionShell({
  title,
  icon,
  count,
  accent,
  collapsed,
  onToggle,
  openModule,
  openHref,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget,
  size = 'md',
  onSizeChange,
  children,
}: SectionShellProps) {
  const { setCurrentModule } = useAppStore()

  return (
    <section
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group/tile relative min-w-0 overflow-visible rounded-md border bg-card transition-colors ${
        isDragTarget ? 'border-primary ring-1 ring-primary' : 'border-border'
      }`}
    >
      <header
        className="flex min-w-0 flex-wrap items-center gap-2 px-3 py-2.5"
        draggable={draggable}
        onDragStart={onDragStart}
      >
        {draggable && (
          <button
            type="button"
            className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
            aria-label="Przeciagnij sekcje"
          >
            <GripVertical size={15} />
          </button>
        )}

        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={!collapsed}
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={accent ? { color: accent, background: `${accent}1a` } : undefined}
          >
            {icon}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-foreground">{title}</span>
          {typeof count === 'number' && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {count}
            </span>
          )}
          <span className="ml-1 text-muted-foreground">
            {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {openModule && (
            <button
              type="button"
              onClick={() => setCurrentModule(openModule)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={`Otworz: ${title}`}
              aria-label={`Otworz: ${title}`}
            >
              <ArrowUpRight size={14} />
            </button>
          )}
          {openHref && (
            <button
              type="button"
              onClick={() => window.open(openHref, '_blank', 'noopener,noreferrer')}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Otworz w nowej karcie"
              aria-label="Otworz w nowej karcie"
            >
              <ExternalLink size={14} />
            </button>
          )}
        </div>
      </header>

      {!collapsed && <div className="min-w-0 px-3 pb-3">{children}</div>}

      {onSizeChange && (
        <TileResizeHandle value={size} onChange={onSizeChange} />
      )}
    </section>
  )
}
