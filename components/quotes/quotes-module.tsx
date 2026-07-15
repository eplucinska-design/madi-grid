'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Calculator,
  Check,
  Columns3,
  Copy,
  FileText,
  GripVertical,
  LayoutGrid,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import { TileSizeControl } from '@/components/start/section-shell'
import {
  useQuotesStore,
  type QuoteProcess,
  type QuoteProcessOverride,
  type QuoteImposition,
  type QuoteRecord,
  type QuoteStatus,
  type QuoteTechnicalMaterial,
} from '@/lib/store/quotes-store'
import type { StartTileSize } from '@/lib/store/start-store'

const statusLabels: Record<QuoteStatus, string> = {
  draft: 'Szkic',
  sent: 'Wyslana',
  accepted: 'Zaakceptowana',
  rejected: 'Odrzucona',
}

type QuoteSortKey = 'number' | 'status' | 'customer' | 'quantity' | 'netPrice'
type SortDirection = 'asc' | 'desc'

const quoteListColumns: Array<{ label: string; sortKey?: QuoteSortKey }> = [
  { label: 'Nr', sortKey: 'number' },
  { label: 'Status', sortKey: 'status' },
  { label: 'Klient / produkt', sortKey: 'customer' },
  { label: 'Naklad', sortKey: 'quantity' },
  { label: 'Cena', sortKey: 'netPrice' },
  { label: 'Akcje' },
]

function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <span className="ml-auto flex h-4 w-3 shrink-0 flex-col items-center justify-center text-[9px] leading-[7px]" aria-hidden="true">
      <span className={active && direction === 'asc' ? 'text-primary' : 'text-muted-foreground/45'}>^</span>
      <span className={active && direction === 'desc' ? 'text-primary' : 'text-muted-foreground/45'}>v</span>
    </span>
  )
}

function compareQuoteValue(a: string | number, b: string | number) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'pl', { sensitivity: 'base' })
}

const jobTypeLabels = {
  own: 'Wlasne',
  combined: 'Laczone',
  external: 'Zewnetrzne',
}

const categoryOptions = ['Ulotki', 'Katalog', 'Wizytowki', 'Opakowania', 'Plakaty', 'Teczki', 'Etykiety', 'Ogolne']

const productTypeOptions: Record<string, string[]> = {
  Ulotki: ['Ulotki proste', 'Ulotki skladane', 'Folder reklamowy'],
  Katalog: ['Katalog zeszytowy', 'Katalog klejony', 'Katalog spiralowany'],
  Wizytowki: ['Wizytowki standardowe', 'Wizytowki premium + folia', 'Wizytowki zaokraglane'],
  Opakowania: ['Opakowanie klejone', 'Opakowanie skladane', 'Wobbler / POS'],
  Plakaty: ['Plakat cyfrowy', 'Plakat wielkoformatowy', 'Roll-up / ekspozytor'],
  Teczki: ['Teczka ofertowa', 'Teczka z grzbietem', 'Teczka premium'],
  Etykiety: ['Etykiety arkuszowe', 'Etykiety z cieciem', 'Etykiety pakowane wzorami'],
  Ogolne: ['Produkt niestandardowy'],
}

const autoProcessMap: Record<string, string[]> = {
  'Ulotki proste': ['print-digital', 'cut-print', 'packing'],
  'Ulotki skladane': ['print-digital', 'cut-print', 'auto-crease', 'auto-fold', 'packing'],
  'Folder reklamowy': ['print-digital', 'dtp', 'auto-crease', 'auto-fold', 'packing'],
  'Katalog zeszytowy': ['print-digital', 'dtp', 'staple', 'cut-ready', 'packing'],
  'Katalog klejony': ['print-digital', 'dtp', 'glue-binding', 'cut-ready', 'packing'],
  'Katalog spiralowany': ['print-digital', 'dtp', 'spiral', 'cut-ready', 'packing'],
  'Wizytowki standardowe': ['print-digital', 'cut-print', 'cut-ready', 'packing'],
  'Wizytowki premium + folia': ['print-digital', 'foil', 'cut-ready', 'packing'],
  'Wizytowki zaokraglane': ['print-digital', 'cut-ready', 'round-corners-4', 'packing'],
  'Opakowanie klejone': ['print-digital', 'auto-crease', 'stitching', 'box-ready', 'packing'],
  'Opakowanie skladane': ['print-digital', 'auto-crease', 'stitching', 'box-flat', 'packing'],
  'Wobbler / POS': ['print-digital', 'cut-ready', 'wobbler', 'packing'],
  'Plakat cyfrowy': ['print-digital', 'cut-ready', 'packing'],
  'Plakat wielkoformatowy': ['large-format', 'plot-roll', 'packing'],
  'Roll-up / ekspozytor': ['large-format', 'plot-roll', 'sets', 'packing'],
  'Teczka ofertowa': ['print-digital', 'foil', 'auto-crease', 'stitching', 'glue-simple', 'packing'],
  'Teczka z grzbietem': ['print-digital', 'foil', 'auto-crease', 'stitching', 'glue-complex', 'packing'],
  'Teczka premium': ['print-digital', 'foil', 'outside-uv-flat', 'auto-crease', 'stitching', 'packing'],
  'Etykiety arkuszowe': ['print-digital', 'cut-ready', 'packing'],
  'Etykiety z cieciem': ['print-digital', 'plot-table', 'packing'],
  'Etykiety pakowane wzorami': ['print-digital', 'cut-ready', 'sets', 'packing'],
}

const defaultImposition: QuoteImposition = {
  readyFormat: 'Niestandardowy',
  orientation: 'horizontal' as const,
  productionSheet: '488x330 SG',
  widthMm: 90,
  heightMm: 50,
  bleedMm: 2,
  sheetMarginMm: 5,
  gutterVerticalMm: 4,
  gutterHorizontalMm: 4,
  mountMode: 'with-gutter' as const,
  layoutMode: 'auto' as const,
  forcedColumns: 0,
  forcedRows: 0,
}

function toNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function formatMoney(value: number) {
  return `${value.toFixed(2)} PLN`
}

function parseQuantities(value: string) {
  return value
    .split(/[,\s;]+/)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item) && item > 0)
}

type QuotePanelId =
  | 'form'
  | 'materials'
  | 'imposition'
  | 'summary'
  | 'processes'
  | 'process-editor'
  | 'machines'
  | 'quotes'

type QuotePanelLayout = Record<'left' | 'right', QuotePanelId[]>
type QuotePanelSizes = Record<QuotePanelId, StartTileSize>
type QuoteGridColumns = 'auto' | '1' | '2' | '3' | '4'
type QuoteWorkspaceMode = 'columns' | 'grid'

const defaultQuotePanelLayout: QuotePanelLayout = {
  left: ['form', 'materials', 'imposition', 'summary'],
  right: ['processes', 'process-editor', 'machines', 'quotes'],
}

const defaultQuotePanelSizes: QuotePanelSizes = {
  form: 'lg',
  materials: 'md',
  imposition: 'full',
  summary: 'md',
  processes: 'full',
  'process-editor': 'lg',
  machines: 'sm',
  quotes: 'full',
}

const QUOTE_PANEL_LAYOUT_STORAGE_KEY = 'madi-quotes-panel-layout-template-v1'
const QUOTE_PANEL_SIZES_STORAGE_KEY = 'madi-quotes-panel-sizes-template-v1'
const QUOTE_GRID_COLUMNS_STORAGE_KEY = 'madi-quotes-grid-columns-v1'
const QUOTE_WORKSPACE_MODE_STORAGE_KEY = 'madi-quotes-workspace-mode-v1'
const QUOTE_DETAIL_PANEL_COLLAPSED_STORAGE_KEY = 'madi-quotes-detail-panel-collapsed-v1'

const quotePanelMeta: Record<QuotePanelId, { title: string; hint: string }> = {
  form: { title: 'Nowa wycena', hint: 'Klient, produkt, naklady' },
  materials: { title: 'Materialy techniczne', hint: 'Surowce i narzut' },
  imposition: { title: 'Uzytki / montaz', hint: 'Arkusz produkcyjny i podglad' },
  summary: { title: 'Podsumowanie', hint: 'Koszt, czas, cena' },
  processes: { title: 'Procesy', hint: 'Zaznacz potrzebne operacje' },
  'process-editor': { title: 'Edycja procesow', hint: 'Kolejnosc, stawki, uwagi' },
  machines: { title: 'Maszyny', hint: 'Reguly rozliczenia' },
  quotes: { title: 'Lista wycen', hint: 'Historia i edycja inline' },
}

function readQuotePanelLayout(): QuotePanelLayout {
  if (typeof window === 'undefined') return defaultQuotePanelLayout
  try {
    const saved = window.localStorage.getItem(QUOTE_PANEL_LAYOUT_STORAGE_KEY)
    if (!saved) return defaultQuotePanelLayout
    const parsed = JSON.parse(saved) as Partial<QuotePanelLayout>
    const knownIds = new Set(Object.keys(quotePanelMeta))
    const left = (parsed.left ?? []).filter((id): id is QuotePanelId => knownIds.has(id))
    const right = (parsed.right ?? []).filter((id): id is QuotePanelId => knownIds.has(id))
    const used = new Set([...left, ...right])
    const missing = [...defaultQuotePanelLayout.left, ...defaultQuotePanelLayout.right].filter((id) => !used.has(id))
    return { left: [...left, ...missing.filter((id) => defaultQuotePanelLayout.left.includes(id))], right: [...right, ...missing.filter((id) => defaultQuotePanelLayout.right.includes(id))] }
  } catch {
    return defaultQuotePanelLayout
  }
}

function readQuotePanelSizes(): QuotePanelSizes {
  if (typeof window === 'undefined') return defaultQuotePanelSizes
  try {
    const saved = window.localStorage.getItem(QUOTE_PANEL_SIZES_STORAGE_KEY)
    if (!saved) return defaultQuotePanelSizes
    const parsed = JSON.parse(saved) as Partial<Record<QuotePanelId, StartTileSize>>
    const allowed = new Set<StartTileSize>(['sm', 'md', 'lg', 'full'])
    return Object.fromEntries(
      Object.keys(quotePanelMeta).map((id) => {
        const panelId = id as QuotePanelId
        const savedSize = parsed[panelId]
        return [panelId, savedSize && allowed.has(savedSize) ? savedSize : defaultQuotePanelSizes[panelId]]
      })
    ) as QuotePanelSizes
  } catch {
    return defaultQuotePanelSizes
  }
}

function readQuoteGridColumns(): QuoteGridColumns {
  if (typeof window === 'undefined') return '1'
  try {
    const saved = window.localStorage.getItem(QUOTE_GRID_COLUMNS_STORAGE_KEY)
    return saved === '1' || saved === '2' || saved === '3' || saved === '4' || saved === 'auto' ? saved : '1'
  } catch {
    return '1'
  }
}

function readQuoteWorkspaceMode(): QuoteWorkspaceMode {
  return 'grid'
}

function readQuoteDetailPanelCollapsed() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(QUOTE_DETAIL_PANEL_COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function flattenQuotePanelLayout(layout: QuotePanelLayout): QuotePanelId[] {
  const knownIds = new Set(Object.keys(quotePanelMeta))
  const result: QuotePanelId[] = []
  ;[...layout.left, ...layout.right].forEach((id) => {
    if (knownIds.has(id) && !result.includes(id)) result.push(id)
  })
  ;[...defaultQuotePanelLayout.left, ...defaultQuotePanelLayout.right].forEach((id) => {
    if (!result.includes(id)) result.push(id)
  })
  return result
}

function layoutFromPanelOrder(order: QuotePanelId[]): QuotePanelLayout {
  return { left: order, right: [] }
}

function quotePanelBodyClass() {
  return 'overflow-visible'
}

function quotePanelGridColumn(size: StartTileSize, columns: QuoteGridColumns, expanded: boolean) {
  if (expanded || columns === '1' || size === 'full') return '1 / -1'
  if (size === 'lg') return 'span 2'
  return 'span 1'
}

function quoteGridTemplateColumns(columns: QuoteGridColumns) {
  if (columns === 'auto') return 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))'
  return `repeat(${Number(columns)}, minmax(0, 1fr))`
}

function moveQuotePanel(layout: QuotePanelLayout, sourceId: QuotePanelId, targetId: QuotePanelId, targetSide: keyof QuotePanelLayout) {
  const withoutSource: QuotePanelLayout = {
    left: layout.left.filter((id) => id !== sourceId),
    right: layout.right.filter((id) => id !== sourceId),
  }
  const target = [...withoutSource[targetSide]]
  const targetIndex = target.indexOf(targetId)
  target.splice(targetIndex >= 0 ? targetIndex : target.length, 0, sourceId)
  return { ...withoutSource, [targetSide]: target }
}

function moveQuotePanelInGrid(layout: QuotePanelLayout, sourceId: QuotePanelId, targetId?: QuotePanelId) {
  const order = flattenQuotePanelLayout(layout).filter((id) => id !== sourceId)
  const targetIndex = targetId ? order.indexOf(targetId) : -1
  order.splice(targetIndex >= 0 ? targetIndex : order.length, 0, sourceId)
  return layoutFromPanelOrder(order)
}

function parseSheetSize(value: string) {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i)
  if (!match) return { width: 488, height: 330 }
  return {
    width: Number.parseFloat(match[1].replace(',', '.')) || 488,
    height: Number.parseFloat(match[2].replace(',', '.')) || 330,
  }
}

function getImpositionMetrics(value: QuoteImposition, quantities: number[], designsCount: number) {
  const sheet = parseSheetSize(value.productionSheet)
  const readyWidth = value.orientation === 'vertical' ? value.heightMm : value.widthMm
  const readyHeight = value.orientation === 'vertical' ? value.widthMm : value.heightMm
  const itemWidth = Math.max(1, readyWidth + value.bleedMm * 2)
  const itemHeight = Math.max(1, readyHeight + value.bleedMm * 2)
  const usableWidth = Math.max(1, sheet.width - value.sheetMarginMm * 2)
  const usableHeight = Math.max(1, sheet.height - value.sheetMarginMm * 2)
  const gutterX = value.mountMode === 'without-gutter' ? 0 : value.gutterVerticalMm
  const gutterY = value.mountMode === 'without-gutter' ? 0 : value.gutterHorizontalMm
  const autoColumns = Math.max(1, Math.floor((usableWidth + gutterX) / (itemWidth + gutterX)))
  const autoRows = Math.max(1, Math.floor((usableHeight + gutterY) / (itemHeight + gutterY)))
  const columns = value.forcedColumns > 0 ? value.forcedColumns : autoColumns
  const rows = value.forcedRows > 0 ? value.forcedRows : autoRows
  const uses = Math.max(1, columns * rows)
  const totalQuantity = (quantities.length ? quantities : [0]).reduce((sum, qty) => sum + qty, 0)
  const sheets = uses > 0 ? Math.ceil(Math.max(0, totalQuantity * Math.max(1, designsCount)) / uses) : 0
  const occupiedWidth = columns * itemWidth + Math.max(0, columns - 1) * gutterX
  const occupiedHeight = rows * itemHeight + Math.max(0, rows - 1) * gutterY
  const waste = Math.max(0, Math.round((1 - Math.min(1, (occupiedWidth * occupiedHeight) / Math.max(1, usableWidth * usableHeight))) * 100))

  return {
    sheet,
    readyWidth,
    readyHeight,
    itemWidth,
    itemHeight,
    usableWidth,
    usableHeight,
    columns,
    rows,
    uses,
    sheets,
    waste,
  }
}

type ImpositionMetrics = ReturnType<typeof getImpositionMetrics>

function ImpositionPreviewGrid({
  metrics,
  value,
  density = 'panel',
}: {
  metrics: ImpositionMetrics
  value: QuoteImposition
  density?: 'panel' | 'large'
}) {
  const maxItems = density === 'large' ? 240 : 96
  const previewItems = Array.from({ length: Math.min(metrics.uses, maxItems) })
  const hiddenItems = Math.max(0, metrics.uses - previewItems.length)
  const cellPalette = [
    'border-sky-400/80 bg-sky-500/20 text-sky-900 dark:text-sky-50',
    'border-emerald-400/80 bg-emerald-500/20 text-emerald-900 dark:text-emerald-50',
    'border-amber-400/80 bg-amber-500/20 text-amber-900 dark:text-amber-50',
    'border-violet-400/80 bg-violet-500/20 text-violet-900 dark:text-violet-50',
  ]

  return (
    <div
      className={`relative mx-auto grid w-full min-w-[260px] gap-1.5 rounded-md border border-primary/30 bg-[linear-gradient(135deg,rgba(59,130,246,0.10),rgba(16,185,129,0.08))] p-3 shadow-inner ${
        density === 'large' ? 'min-h-[520px]' : 'min-h-[240px]'
      }`}
      style={{
        aspectRatio: `${metrics.sheet.width} / ${metrics.sheet.height}`,
        gridTemplateColumns: `repeat(${metrics.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${metrics.rows}, minmax(0, 1fr))`,
      }}
    >
      {previewItems.map((_, index) => (
        <div
          key={index}
          className={`flex min-h-5 items-center justify-center rounded border text-[10px] font-semibold shadow-sm ${cellPalette[index % cellPalette.length]}`}
        >
          {index < 120 ? index + 1 : ''}
        </div>
      ))}
      {hiddenItems > 0 && (
        <div className="absolute bottom-3 right-3 rounded-md border border-border bg-background/90 px-2 py-1 text-[11px] font-semibold text-foreground shadow">
          +{hiddenItems}
        </div>
      )}
      <div className="pointer-events-none absolute inset-3 rounded border border-dashed border-foreground/25" />
      <div className="pointer-events-none absolute left-4 top-4 rounded bg-background/85 px-2 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm">
        margines {value.sheetMarginMm} mm
      </div>
    </div>
  )
}

function ImpositionPreviewWindow({
  open,
  metrics,
  value,
  onClose,
}: {
  open: boolean
  metrics: ImpositionMetrics
  value: QuoteImposition
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[6200] bg-background/82 p-5 backdrop-blur-sm">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Duzy podglad uzytkow</p>
            <p className="text-[11px] text-muted-foreground">
              Arkusz {metrics.sheet.width}x{metrics.sheet.height} mm, {metrics.columns} kol. x {metrics.rows} rz., brutto {metrics.itemWidth}x{metrics.itemHeight} mm
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Zamknij podglad"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="grid content-start gap-2 text-xs">
            {[
              ['Uzytki / ark.', `${metrics.uses} (${metrics.columns}x${metrics.rows})`],
              ['Arkusze', `${metrics.sheets}`],
              ['Brutto', `${metrics.itemWidth}x${metrics.itemHeight} mm`],
              ['Odpad', `${metrics.waste}%`],
              ['Margines', `${value.sheetMarginMm} mm`],
              ['Rozcinka', value.mountMode === 'without-gutter' ? 'bez rozcinki' : `${value.gutterVerticalMm}/${value.gutterHorizontalMm} mm`],
            ].map(([label, val]) => (
              <div key={label} className="rounded-md border border-border bg-background p-3 shadow-sm">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{val}</p>
              </div>
            ))}
          </div>
          <div className="min-h-0 overflow-auto rounded-md border border-border bg-background p-3">
            <ImpositionPreviewGrid metrics={metrics} value={value} density="large" />
          </div>
        </div>
      </div>
    </div>
  )
}

function QuoteWorkspacePanel({
  id,
  children,
  draggingId,
  expanded,
  size,
  onSizeChange,
  onDragStart,
  onDragEnd,
  onDropPanel,
  onExpand,
  gridColumn,
}: {
  id: QuotePanelId
  children: ReactNode
  draggingId: QuotePanelId | null
  expanded: boolean
  size: StartTileSize
  onSizeChange: (id: QuotePanelId, size: StartTileSize) => void
  onDragStart: (id: QuotePanelId) => void
  onDragEnd: () => void
  onDropPanel: (id: QuotePanelId) => void
  onExpand: (id: QuotePanelId) => void
  gridColumn?: string
}) {
  const meta = quotePanelMeta[id]

  return (
    <section
      data-quote-panel-id={id}
      style={{ gridColumn }}
      className={`madi-responsive-card rounded-md border border-border bg-card shadow-sm ${size === 'full' ? 'ring-1 ring-primary/10' : ''} ${draggingId === id ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <GripVertical size={14} className="shrink-0 text-muted-foreground/45" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug">{meta.title}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">{meta.hint}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TileSizeControl value={size} onChange={(nextSize) => onSizeChange(id, nextSize)} />
          <button
            onClick={() => onExpand(id)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title={expanded ? 'Zmniejsz panel' : 'Rozszerz panel'}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>
      <div className={quotePanelBodyClass()}>{children}</div>
    </section>
  )
}

function ProcessGroup({
  title,
  processes,
  selectedIds,
  onToggle,
}: {
  title: string
  processes: QuoteProcess[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {processes.map((process) => {
          const selected = selectedIds.includes(process.id)
          return (
            <button
              key={process.id}
              onClick={() => onToggle(process.id)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors ${
                selected
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {selected && <Check size={12} />}
              {process.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProcessEditor({
  processes,
  selectedIds,
  overrides,
  onUpdate,
  onRemove,
}: {
  processes: QuoteProcess[]
  selectedIds: string[]
  overrides: Record<string, QuoteProcessOverride>
  onUpdate: (id: string, patch: Partial<QuoteProcessOverride>) => void
  onRemove: (id: string) => void
}) {
  const selected = selectedIds
    .map((id, index) => {
      const process = processes.find((item) => item.id === id)
      if (!process) return null
      const override = overrides[id] ?? { order: index + 1, quantity: 1, minutes: process.minutes, rate: process.rate, notes: '' }
      return { process, override }
    })
    .filter(Boolean) as Array<{ process: QuoteProcess; override: QuoteProcessOverride }>
  const sorted = [...selected].sort((a, b) => a.override.order - b.override.order)

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Settings2 size={14} className="text-primary" />
        <div>
          <p className="text-sm font-semibold">Edycja procesow - kolejnosc, stawki i uwagi</p>
          <p className="text-[11px] text-muted-foreground">Te wartosci wplywaja na kalkulacje szkicu.</p>
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="p-4 text-center text-xs text-muted-foreground">Zaznacz procesy po prawej stronie.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[52px_1fr_84px_90px_90px_180px_44px] gap-2 border-b border-border bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
              <span>Kol.</span>
              <span>Proces</span>
              <span>Ilosc</span>
              <span>Min</span>
              <span>Stawka</span>
              <span>Uwagi</span>
              <span />
            </div>
            {sorted.map(({ process, override }) => (
              <div key={process.id} className="grid grid-cols-[52px_1fr_84px_90px_90px_180px_44px] gap-2 border-b border-border px-3 py-2 text-xs">
                <input
                  type="number"
                  min={1}
                  value={override.order}
                  onChange={(event) => onUpdate(process.id, { order: toNumber(event.target.value) || 1 })}
                  className="h-8 rounded border border-border bg-background px-2 outline-none focus:border-primary"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{process.label}</p>
                  <p className="text-[10px] text-muted-foreground">{process.group} / {process.unit ?? 'oper.'}</p>
                </div>
                <input
                  type="number"
                  min={1}
                  value={override.quantity}
                  onChange={(event) => onUpdate(process.id, { quantity: toNumber(event.target.value) || 1 })}
                  className="h-8 rounded border border-border bg-background px-2 outline-none focus:border-primary"
                />
                <input
                  type="number"
                  min={0}
                  value={override.minutes}
                  onChange={(event) => onUpdate(process.id, { minutes: toNumber(event.target.value) })}
                  className="h-8 rounded border border-border bg-background px-2 outline-none focus:border-primary"
                />
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={override.rate}
                  onChange={(event) => onUpdate(process.id, { rate: toNumber(event.target.value) })}
                  className="h-8 rounded border border-border bg-background px-2 outline-none focus:border-primary"
                />
                <input
                  value={override.notes}
                  onChange={(event) => onUpdate(process.id, { notes: event.target.value })}
                  className="h-8 rounded border border-border bg-background px-2 outline-none focus:border-primary"
                  placeholder="np. recznie / zewn."
                />
                <button
                  onClick={() => onRemove(process.id)}
                  className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Usun proces"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TechnicalMaterialsEditor({
  materials,
  onAdd,
  onUpdate,
  onDelete,
}: {
  materials: QuoteTechnicalMaterial[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<QuoteTechnicalMaterial>) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Materialy techniczne</p>
          <p className="text-[11px] text-muted-foreground">Koszt netto pozycji, domyslny narzut zakupowy 25%.</p>
        </div>
        <button onClick={onAdd} className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
          <Plus size={13} />
          Dodaj
        </button>
      </div>
      {materials.length === 0 ? (
        <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">Brak pozycji materialowych.</p>
      ) : (
        <div className="space-y-2">
          {materials.map((material) => (
            <div key={material.id} className="grid grid-cols-[1fr_82px_78px_92px_82px_34px] gap-2 rounded-md border border-border bg-muted/10 p-2 text-xs">
              <input value={material.name} onChange={(event) => onUpdate(material.id, { name: event.target.value })} className="h-8 rounded border border-border bg-background px-2 outline-none focus:border-primary" />
              <input type="number" min={0} value={material.quantity} onChange={(event) => onUpdate(material.id, { quantity: toNumber(event.target.value) })} className="h-8 rounded border border-border bg-background px-2 outline-none focus:border-primary" />
              <input value={material.unit} onChange={(event) => onUpdate(material.id, { unit: event.target.value })} className="h-8 rounded border border-border bg-background px-2 outline-none focus:border-primary" />
              <input type="number" min={0} value={material.unitCost} onChange={(event) => onUpdate(material.id, { unitCost: toNumber(event.target.value) })} className="h-8 rounded border border-border bg-background px-2 outline-none focus:border-primary" />
              <input type="number" min={0} value={material.markupPercent} onChange={(event) => onUpdate(material.id, { markupPercent: toNumber(event.target.value) })} className="h-8 rounded border border-border bg-background px-2 outline-none focus:border-primary" />
              <button onClick={() => onDelete(material.id)} className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ImpositionEditor({
  value,
  quantities,
  designsCount,
  onChange,
}: {
  value: QuoteImposition
  quantities: number[]
  designsCount: number
  onChange: (patch: Partial<QuoteImposition>) => void
}) {
  const metrics = getImpositionMetrics(value, quantities, designsCount)
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <div className="grid min-w-0 gap-3 p-3 xl:grid-cols-[minmax(360px,1fr)_minmax(320px,0.85fr)]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Wizytowki - liczenie po uzytkach</p>
            <p className="text-[11px] text-muted-foreground">Pola i podglad aktualizuja sie od razu po zmianie parametrow.</p>
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15"
          >
            <Maximize2 size={13} />
            Duzy podglad
          </button>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <label className="space-y-1 text-[11px] text-muted-foreground">
            Format gotowy
            <select value={value.readyFormat} onChange={(event) => onChange({ readyFormat: event.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground shadow-sm">
              <option>Niestandardowy</option>
              <option>90x50 mm</option>
              <option>85x55 mm</option>
              <option>A6</option>
              <option>A5</option>
            </select>
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">
            Orientacja
            <select value={value.orientation} onChange={(event) => onChange({ orientation: event.target.value as typeof value.orientation })} className="h-10 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground shadow-sm">
              <option value="horizontal">Poziom</option>
              <option value="vertical">Pion</option>
            </select>
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">
            Arkusz produkcyjny
            <select value={value.productionSheet} onChange={(event) => onChange({ productionSheet: event.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground shadow-sm">
              <option>488x330 SG</option>
              <option>450x320</option>
              <option>640x450</option>
              <option>700x1000</option>
            </select>
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">
            Szerokosc gotowa [mm]
            <input type="number" min={0} value={value.widthMm} onChange={(event) => onChange({ widthMm: toNumber(event.target.value) })} className="h-10 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground shadow-sm outline-none focus:border-primary" />
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">
            Wysokosc gotowa [mm]
            <input type="number" min={0} value={value.heightMm} onChange={(event) => onChange({ heightMm: toNumber(event.target.value) })} className="h-10 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground shadow-sm outline-none focus:border-primary" />
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">
            Spad z kazdej strony
            <input type="number" min={0} value={value.bleedMm} onChange={(event) => onChange({ bleedMm: toNumber(event.target.value) })} className="h-10 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground shadow-sm outline-none focus:border-primary" />
          </label>
        </div>

        <div className="mt-3 rounded-md border border-border bg-muted/20 p-3 shadow-sm">
          <p className="mb-2 text-[11px] font-semibold text-muted-foreground">Marginesy technologiczne montazu</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(84px,1fr))] gap-2">
            <input type="number" min={0} value={value.sheetMarginMm} onChange={(event) => onChange({ sheetMarginMm: toNumber(event.target.value) })} className="h-9 rounded-md border border-border bg-background px-2 text-xs font-medium shadow-sm outline-none focus:border-primary" title="Margines od arkusza" />
            <input type="number" min={0} value={value.gutterVerticalMm} onChange={(event) => onChange({ gutterVerticalMm: toNumber(event.target.value) })} className="h-9 rounded-md border border-border bg-background px-2 text-xs font-medium shadow-sm outline-none focus:border-primary" title="Rozcinka pionowa" />
            <input type="number" min={0} value={value.gutterHorizontalMm} onChange={(event) => onChange({ gutterHorizontalMm: toNumber(event.target.value) })} className="h-9 rounded-md border border-border bg-background px-2 text-xs font-medium shadow-sm outline-none focus:border-primary" title="Rozcinka pozioma" />
            <select value={value.mountMode} onChange={(event) => onChange({ mountMode: event.target.value as typeof value.mountMode })} className="h-9 rounded-md border border-border bg-background px-2 text-xs font-medium shadow-sm">
              <option value="with-gutter">z rozcinka</option>
              <option value="without-gutter">bez rozcinki</option>
              <option value="auto">auto</option>
            </select>
            <input type="number" min={0} value={value.forcedColumns} onChange={(event) => onChange({ forcedColumns: toNumber(event.target.value) })} className="h-9 rounded-md border border-border bg-background px-2 text-xs font-medium shadow-sm outline-none focus:border-primary" placeholder="auto kol." />
            <input type="number" min={0} value={value.forcedRows} onChange={(event) => onChange({ forcedRows: toNumber(event.target.value) })} className="h-9 rounded-md border border-border bg-background px-2 text-xs font-medium shadow-sm outline-none focus:border-primary" placeholder="auto rz." />
          </div>
          <button onClick={() => onChange(defaultImposition)} className="mt-3 h-8 rounded-md border border-border bg-background px-4 text-xs font-medium text-foreground hover:bg-muted">
            Reset do auto
          </button>
        </div>
      </div>

      <div className="min-w-0 rounded-md border border-primary/20 bg-background p-3 shadow-sm">
        <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-2 text-xs">
          <div className="rounded-md border border-sky-400/30 border-l-4 border-l-sky-500 bg-sky-500/10 p-2">
            <p className="text-muted-foreground">Uzytki / ark.</p>
            <p className="break-words font-semibold">{metrics.uses} ({metrics.columns}x{metrics.rows})</p>
          </div>
          <div className="rounded-md border border-emerald-400/30 border-l-4 border-l-emerald-500 bg-emerald-500/10 p-2">
            <p className="text-muted-foreground">Arkusze</p>
            <p className="break-words font-semibold">{metrics.sheets}</p>
          </div>
          <div className="rounded-md border border-violet-400/30 border-l-4 border-l-violet-500 bg-violet-500/10 p-2">
            <p className="text-muted-foreground">Brutto</p>
            <p className="break-words font-semibold">{metrics.itemWidth}x{metrics.itemHeight} mm</p>
          </div>
          <div className="rounded-md border border-amber-400/30 border-l-4 border-l-amber-500 bg-amber-500/10 p-2">
            <p className="text-muted-foreground">Odpad</p>
            <p className="break-words font-semibold">{metrics.waste}%</p>
          </div>
        </div>
        <div className="overflow-auto rounded-md">
          <ImpositionPreviewGrid metrics={metrics} value={value} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Arkusz {metrics.sheet.width}x{metrics.sheet.height} mm, margines {value.sheetMarginMm} mm. Podglad pokazuje realny uklad brutto ze spadem.
        </p>
      </div>
      <ImpositionPreviewWindow open={previewOpen} metrics={metrics} value={value} onClose={() => setPreviewOpen(false)} />
    </div>
  )
}

function QuoteDetailRail({ quote, onExpand }: { quote?: QuoteRecord; onExpand: () => void }) {
  return (
    <aside className="hidden w-12 shrink-0 border-l border-border bg-background xl:flex xl:flex-col xl:items-center">
      <button
        onClick={onExpand}
        className="mt-3 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Rozwin panel szczegolow"
      >
        <PanelRightOpen size={16} />
      </button>
      <div className="mt-4 h-px w-6 bg-border" />
      <div className="mt-4 flex max-w-8 flex-col items-center gap-2 text-center">
        <FileText size={15} className="text-muted-foreground" />
        <span className="break-all text-[10px] font-semibold leading-tight text-muted-foreground">
          {quote?.number?.replace('MAD/', '') ?? 'Szczegoly'}
        </span>
      </div>
    </aside>
  )
}

function QuoteDetail({
  quote,
  onCollapse,
  onOpenWindow,
  variant = 'panel',
}: {
  quote?: QuoteRecord
  onCollapse: () => void
  onOpenWindow?: () => void
  variant?: 'panel' | 'modal'
}) {
  const { processes, updateQuote, duplicateQuote, deleteQuote } = useQuotesStore()
  const panelClassName =
    variant === 'modal'
      ? 'flex h-[min(88vh,900px)] w-[min(1180px,calc(100vw-40px))] shrink-0 overflow-hidden rounded-md border border-border bg-background shadow-2xl'
      : 'w-[var(--app-detail-panel-width)] shrink-0 border-l border-border bg-background'

  if (!quote) {
    return (
      <aside className="hidden w-[var(--app-detail-panel-width)] shrink-0 border-l border-border bg-background xl:flex xl:flex-col">
        <div className="flex justify-end border-b border-border px-3 py-2">
          <button
            onClick={onCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Zwin panel szczegolow"
          >
            <PanelRightClose size={16} />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
          <FileText size={34} className="mb-3" />
          <p className="text-sm font-medium text-foreground">Wybierz wycene</p>
          <p className="mt-1 text-xs">Status, cena, procesy i notatki pojawia sie tutaj.</p>
        </div>
      </aside>
    )
  }

  const safeQuote: QuoteRecord = {
    ...quote,
    jobName: quote.jobName ?? quote.product ?? 'Nowe zlecenie',
    product: quote.product ?? quote.variantName ?? 'Nowa wycena',
    productType: quote.productType ?? '',
    variantName: quote.variantName ?? quote.product ?? '',
    quantities: Array.isArray(quote.quantities) && quote.quantities.length ? quote.quantities : [quote.quantity],
    designsCount: Math.max(1, quote.designsCount ?? 1),
    jobType: quote.jobType ?? 'own',
    manualOverage: Math.max(0, quote.manualOverage ?? 0),
    processOverrides: quote.processOverrides ?? {},
    technicalMaterials: Array.isArray(quote.technicalMaterials) ? quote.technicalMaterials : [],
    imposition: { ...defaultImposition, ...(quote.imposition ?? {}) },
  }
  const quantityText = safeQuote.quantities.join(', ')
  const quoteProcesses = safeQuote.processIds
    .map((processId, index) => {
      const process = processes.find((item) => item.id === processId)
      if (!process) return null
      const override =
        safeQuote.processOverrides[processId] ?? {
          order: index + 1,
          quantity: 1,
          minutes: process.minutes,
          rate: process.rate,
          notes: '',
        }
      return { process, override }
    })
    .filter(Boolean) as Array<{ process: QuoteProcess; override: QuoteProcessOverride }>
  const sortedQuoteProcesses = [...quoteProcesses].sort((a, b) => a.override.order - b.override.order)
  const technicalMaterialTotal = safeQuote.technicalMaterials.reduce(
    (sum, material) => sum + Math.max(0, material.quantity) * Math.max(0, material.unitCost) * (1 + Math.max(0, material.markupPercent) / 100),
    0
  )
  const processMinutes = sortedQuoteProcesses.reduce((sum, item) => sum + Math.max(0, item.override.minutes) * Math.max(1, item.override.quantity), 0)
  const patchQuoteProcess = (processId: string, patch: Partial<QuoteProcessOverride>) => {
    const current = sortedQuoteProcesses.find((item) => item.process.id === processId)
    if (!current) return
    updateQuote(quote.id, {
      processOverrides: {
        ...safeQuote.processOverrides,
        [processId]: { ...current.override, ...patch },
      },
    })
  }
  const removeQuoteProcess = (processId: string) => {
    const processOverrides = { ...safeQuote.processOverrides }
    delete processOverrides[processId]
    updateQuote(quote.id, {
      processIds: safeQuote.processIds.filter((id) => id !== processId),
      processOverrides,
    })
  }
  const updateQuoteMaterial = (materialId: string, patch: Partial<QuoteTechnicalMaterial>) => {
    updateQuote(quote.id, {
      technicalMaterials: safeQuote.technicalMaterials.map((material) =>
        material.id === materialId ? { ...material, ...patch } : material
      ),
    })
  }
  const addQuoteMaterial = () => {
    updateQuote(quote.id, {
      technicalMaterials: [
        ...safeQuote.technicalMaterials,
        { id: `quote-mat-${Date.now()}`, name: 'Nowy material', quantity: 1, unit: 'szt.', unitCost: 0, markupPercent: 25 },
      ],
    })
  }

  return (
    <aside className={panelClassName}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{safeQuote.number}</p>
            <p className="text-[11px] text-muted-foreground">{statusLabels[safeQuote.status]} / {formatMoney(safeQuote.netPrice)}</p>
          </div>
          <div className="flex items-center gap-1">
            {onOpenWindow && (
              <button onClick={onOpenWindow} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Otworz wycene w oknie">
                <Maximize2 size={15} />
              </button>
            )}
            <button onClick={onCollapse} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Zwin panel szczegolow">
              <PanelRightClose size={15} />
            </button>
            <button onClick={() => duplicateQuote(quote.id)} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Duplikuj">
              <Copy size={15} />
            </button>
            <button onClick={() => deleteQuote(quote.id)} className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Usun">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-[var(--app-module-gap)]">
          <label className="block space-y-1 text-xs text-muted-foreground">
            Klient
            <input
              value={safeQuote.customer}
              onChange={(event) => updateQuote(quote.id, { customer: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Nazwa zlecenia
            <input
              value={safeQuote.jobName}
              onChange={(event) => updateQuote(quote.id, { jobName: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Kategoria
              <select
                value={safeQuote.category}
                onChange={(event) => updateQuote(quote.id, { category: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Typ zlecenia
              <select
                value={safeQuote.jobType}
                onChange={(event) => updateQuote(quote.id, { jobType: event.target.value as QuoteRecord['jobType'] })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {Object.entries(jobTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Rodzaj produktu
            <input
              value={safeQuote.productType}
              onChange={(event) => updateQuote(quote.id, { productType: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Nazwa wzoru
            <input
              value={safeQuote.variantName}
              onChange={(event) => updateQuote(quote.id, { variantName: event.target.value, product: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Status
              <select
                value={safeQuote.status}
                onChange={(event) => updateQuote(quote.id, { status: event.target.value as QuoteStatus })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Liczba wzorow
              <input
                type="number"
                min={1}
                value={safeQuote.designsCount}
                onChange={(event) => updateQuote(quote.id, { designsCount: Math.max(1, toNumber(event.target.value)) })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Naklad glowny
              <input
                type="number"
                value={safeQuote.quantity}
                onChange={(event) => {
                  const quantity = Math.max(1, toNumber(event.target.value))
                  updateQuote(quote.id, { quantity, quantities: safeQuote.quantities.length ? [quantity, ...safeQuote.quantities.slice(1)] : [quantity] })
                }}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Gorka reczna / szt.
              <input
                type="number"
                value={safeQuote.manualOverage}
                onChange={(event) => updateQuote(quote.id, { manualOverage: toNumber(event.target.value) })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Cena netto
              <input
                type="number"
                value={safeQuote.netPrice}
                onChange={(event) => updateQuote(quote.id, { netPrice: toNumber(event.target.value) })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Marza %
              <input
                type="number"
                value={safeQuote.margin}
                onChange={(event) => updateQuote(quote.id, { margin: toNumber(event.target.value) })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Naklady wariantow
            <input
              key={`${quote.id}-${quantityText}`}
              defaultValue={quantityText}
              onBlur={(event) => {
                const quantities = parseQuantities(event.currentTarget.value)
                if (quantities.length) {
                  updateQuote(quote.id, { quantities, quantity: quantities[0] })
                } else {
                  event.currentTarget.value = quantityText
                }
              }}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              placeholder="np. 100, 500, 1000"
            />
          </label>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Sciezka plikow
            <input
              value={safeQuote.filesPath}
              onChange={(event) => updateQuote(quote.id, { filesPath: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Notatki
            <textarea
              value={safeQuote.notes}
              onChange={(event) => updateQuote(quote.id, { notes: event.target.value })}
              rows={5}
              className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Montaz / uzytki</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={safeQuote.imposition.readyFormat} onChange={(event) => updateQuote(quote.id, { imposition: { ...safeQuote.imposition, readyFormat: event.target.value } })} className="h-8 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary" title="Format gotowy" />
              <select value={safeQuote.imposition.productionSheet} onChange={(event) => updateQuote(quote.id, { imposition: { ...safeQuote.imposition, productionSheet: event.target.value } })} className="h-8 rounded border border-border bg-background px-2 text-xs">
                <option>488x330 SG</option>
                <option>450x320</option>
                <option>640x450</option>
                <option>700x1000</option>
              </select>
              <input type="number" value={safeQuote.imposition.widthMm} onChange={(event) => updateQuote(quote.id, { imposition: { ...safeQuote.imposition, widthMm: toNumber(event.target.value) } })} className="h-8 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary" title="Szerokosc" />
              <input type="number" value={safeQuote.imposition.heightMm} onChange={(event) => updateQuote(quote.id, { imposition: { ...safeQuote.imposition, heightMm: toNumber(event.target.value) } })} className="h-8 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary" title="Wysokosc" />
              <input type="number" value={safeQuote.imposition.bleedMm} onChange={(event) => updateQuote(quote.id, { imposition: { ...safeQuote.imposition, bleedMm: toNumber(event.target.value) } })} className="h-8 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary" title="Spad" />
              <select value={safeQuote.imposition.mountMode} onChange={(event) => updateQuote(quote.id, { imposition: { ...safeQuote.imposition, mountMode: event.target.value as QuoteImposition['mountMode'] } })} className="h-8 rounded border border-border bg-background px-2 text-xs">
                <option value="with-gutter">z rozcinka</option>
                <option value="without-gutter">bez rozcinki</option>
                <option value="auto">auto</option>
              </select>
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Materialy techniczne</p>
                <p className="text-[10px] text-muted-foreground">Suma: {formatMoney(technicalMaterialTotal)}</p>
              </div>
              <button onClick={addQuoteMaterial} className="flex h-7 items-center gap-1 rounded bg-primary px-2 text-[11px] font-medium text-primary-foreground">
                <Plus size={12} />
                Dodaj
              </button>
            </div>
            {safeQuote.technicalMaterials.length === 0 ? (
              <p className="rounded border border-border bg-muted/20 px-2 py-2 text-[11px] text-muted-foreground">Brak materialow przypisanych do wyceny.</p>
            ) : (
              <div className="space-y-2">
                {safeQuote.technicalMaterials.map((material) => (
                  <div key={material.id} className="grid grid-cols-[1fr_48px_42px_52px_42px_30px] gap-1.5 rounded border border-border bg-muted/10 p-2">
                    <input value={material.name} onChange={(event) => updateQuoteMaterial(material.id, { name: event.target.value })} className="h-7 min-w-0 rounded border border-border bg-background px-2 text-[11px] outline-none focus:border-primary" />
                    <input type="number" value={material.quantity} onChange={(event) => updateQuoteMaterial(material.id, { quantity: toNumber(event.target.value) })} className="h-7 rounded border border-border bg-background px-1.5 text-[11px] outline-none focus:border-primary" title="Ilosc" />
                    <input value={material.unit} onChange={(event) => updateQuoteMaterial(material.id, { unit: event.target.value })} className="h-7 rounded border border-border bg-background px-1.5 text-[11px] outline-none focus:border-primary" title="Jednostka" />
                    <input type="number" value={material.unitCost} onChange={(event) => updateQuoteMaterial(material.id, { unitCost: toNumber(event.target.value) })} className="h-7 rounded border border-border bg-background px-1.5 text-[11px] outline-none focus:border-primary" title="Koszt" />
                    <input type="number" value={material.markupPercent} onChange={(event) => updateQuoteMaterial(material.id, { markupPercent: toNumber(event.target.value) })} className="h-7 rounded border border-border bg-background px-1.5 text-[11px] outline-none focus:border-primary" title="Narzut %" />
                    <button onClick={() => updateQuote(quote.id, { technicalMaterials: safeQuote.technicalMaterials.filter((item) => item.id !== material.id) })} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Procesy i stawki</p>
              <span className="text-[10px] text-muted-foreground">{processMinutes} min</span>
            </div>
            <div className="space-y-2">
              {sortedQuoteProcesses.map(({ process, override }) => (
                <div key={process.id} className="rounded border border-border bg-background p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{process.label}</p>
                      <p className="text-[10px] text-muted-foreground">{process.group} / {process.unit ?? 'oper.'}</p>
                    </div>
                    <button onClick={() => removeQuoteProcess(process.id)} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Usun proces">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="grid grid-cols-[44px_52px_52px_52px_1fr] gap-1.5">
                    <input type="number" value={override.order} onChange={(event) => patchQuoteProcess(process.id, { order: toNumber(event.target.value) || 1 })} className="h-7 rounded border border-border bg-muted/20 px-1.5 text-[11px] outline-none" title="Kolejnosc" />
                    <input type="number" value={override.quantity} onChange={(event) => patchQuoteProcess(process.id, { quantity: toNumber(event.target.value) || 1 })} className="h-7 rounded border border-border bg-muted/20 px-1.5 text-[11px] outline-none" title="Ilosc" />
                    <input type="number" value={override.minutes} onChange={(event) => patchQuoteProcess(process.id, { minutes: toNumber(event.target.value) })} className="h-7 rounded border border-border bg-muted/20 px-1.5 text-[11px] outline-none" title="Minuty" />
                    <input type="number" value={override.rate} onChange={(event) => patchQuoteProcess(process.id, { rate: toNumber(event.target.value) })} className="h-7 rounded border border-border bg-muted/20 px-1.5 text-[11px] outline-none" title="Stawka" />
                    <input value={override.notes} onChange={(event) => patchQuoteProcess(process.id, { notes: event.target.value })} className="h-7 min-w-0 rounded border border-border bg-muted/20 px-1.5 text-[11px] outline-none" placeholder="uwagi" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function QuotesModule() {
  const {
    processes,
    quotes,
    draft,
    selectedQuoteId,
    toggleProcess,
    patchDraft,
    setDraftProcesses,
    updateDraftProcess,
    addTechnicalMaterial,
    updateTechnicalMaterial,
    deleteTechnicalMaterial,
    createQuote,
    updateQuote,
    deleteQuote,
    duplicateQuote,
    selectQuote,
    calculateDraft,
  } = useQuotesStore()
  const [quantityInput, setQuantityInput] = useState('')
  const [panelLayout, setPanelLayout] = useState<QuotePanelLayout>(defaultQuotePanelLayout)
  const [panelSizes, setPanelSizes] = useState<QuotePanelSizes>(defaultQuotePanelSizes)
  const [panelLayoutReady, setPanelLayoutReady] = useState(false)
  const [dragPanelId, setDragPanelId] = useState<QuotePanelId | null>(null)
  const [expandedPanelId, setExpandedPanelId] = useState<QuotePanelId | null>(null)
  const [gridColumns, setGridColumns] = useState<QuoteGridColumns>('1')
  const [workspaceMode, setWorkspaceMode] = useState<QuoteWorkspaceMode>('grid')
  const [detailPanelCollapsed, setDetailPanelCollapsed] = useState(false)
  const [quoteSort, setQuoteSort] = useState<{ key: QuoteSortKey; direction: SortDirection }>({ key: 'number', direction: 'asc' })
  const [quoteWindowId, setQuoteWindowId] = useState<string | null>(null)

  const calc = calculateDraft()
  const safeDraft = {
    ...draft,
    quantities: draft.quantities ?? [],
    processOverrides: draft.processOverrides ?? {},
    technicalMaterials: draft.technicalMaterials ?? [],
    imposition: { ...defaultImposition, ...(draft.imposition ?? {}) },
  }
  const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId)
  const quoteWindow = quotes.find((quote) => quote.id === quoteWindowId)
  const sortedQuotes = useMemo(() => {
    const valueFor = (quote: QuoteRecord): string | number => {
      if (quoteSort.key === 'status') return statusLabels[quote.status]
      if (quoteSort.key === 'customer') return `${quote.customer} ${quote.product}`
      if (quoteSort.key === 'quantity') return quote.quantity
      if (quoteSort.key === 'netPrice') return quote.netPrice
      return quote.number
    }
    return [...quotes].sort((a, b) => {
      const result = compareQuoteValue(valueFor(a), valueFor(b))
      return quoteSort.direction === 'asc' ? result : -result
    })
  }, [quoteSort.direction, quoteSort.key, quotes])
  const toggleQuoteSort = (key?: QuoteSortKey) => {
    if (!key) return
    setQuoteSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  useEffect(() => {
    setPanelLayout(readQuotePanelLayout())
    setPanelSizes(readQuotePanelSizes())
    setGridColumns(readQuoteGridColumns())
    setWorkspaceMode('grid')
    setDetailPanelCollapsed(readQuoteDetailPanelCollapsed())
    setPanelLayoutReady(true)
  }, [])

  useEffect(() => {
    if (!panelLayoutReady) return
    window.localStorage.setItem(QUOTE_PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(panelLayout))
    window.localStorage.setItem(QUOTE_PANEL_SIZES_STORAGE_KEY, JSON.stringify(panelSizes))
    window.localStorage.setItem(QUOTE_GRID_COLUMNS_STORAGE_KEY, gridColumns)
    window.localStorage.setItem(QUOTE_WORKSPACE_MODE_STORAGE_KEY, 'grid')
    window.localStorage.setItem(QUOTE_DETAIL_PANEL_COLLAPSED_STORAGE_KEY, String(detailPanelCollapsed))
  }, [panelLayout, panelSizes, gridColumns, workspaceMode, detailPanelCollapsed, panelLayoutReady])

  useEffect(() => {
    if (!panelLayoutReady) return
    setWorkspaceMode('grid')
  }, [panelLayoutReady])

  useEffect(() => {
    const handleOpenPanel = (event: Event) => {
      const detail = (event as CustomEvent<{ panelId?: QuotePanelId }>).detail
      const panelId = detail?.panelId
      if (!panelId || !(panelId in quotePanelMeta)) return
      setWorkspaceMode('grid')
      setExpandedPanelId(panelId)
      window.setTimeout(() => {
        const panel = document.querySelector<HTMLElement>(`[data-quote-panel-id="${panelId}"]`)
        panel?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      }, 80)
    }

    window.addEventListener('madi:quotes-open-panel', handleOpenPanel)
    return () => window.removeEventListener('madi:quotes-open-panel', handleOpenPanel)
  }, [])

  const availableProductTypes = productTypeOptions[draft.category] ?? productTypeOptions.Ogolne
  const processGroups = useMemo(() => {
    const groups = new Map<string, QuoteProcess[]>()
    processes.forEach((process) => groups.set(process.group, [...(groups.get(process.group) ?? []), process]))
    return Array.from(groups.entries())
  }, [processes])

  const addQuantity = () => {
    const qty = toNumber(quantityInput)
    if (!qty) return
    const quantities = [...safeDraft.quantities, qty]
    patchDraft({ quantities, quantity: quantities[0] ?? qty })
    setQuantityInput('')
  }

  const handleProductTypeChange = (productType: string) => {
    const autoProcesses = autoProcessMap[productType]
    patchDraft({ productType })
    if (autoProcesses) setDraftProcesses(autoProcesses)
  }

  const summary = (
    <StatStrip
      items={[
        { label: 'Wyceny', value: quotes.length, hint: 'w bazie lokalnej' },
        { label: 'Zaakceptowane', value: quotes.filter((quote) => quote.status === 'accepted').length, hint: 'gotowe do zlecenia' },
        { label: 'Cena szkicu', value: formatMoney(calc.netPrice), hint: `${calc.minutes} min procesu` },
        { label: 'Marza szkicu', value: `${calc.margin}%`, hint: 'po kosztach' },
      ]}
    />
  )

  const actions = (
    <div className="flex items-center gap-2">
      {selectedQuote && (
        <button
          onClick={() => setQuoteWindowId(selectedQuote.id)}
          className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Maximize2 size={14} />
          Otworz w oknie
        </button>
      )}
      <button
        onClick={() => {
          setPanelLayout(defaultQuotePanelLayout)
          setPanelSizes(defaultQuotePanelSizes)
          setGridColumns('1')
          setWorkspaceMode('grid')
          setDetailPanelCollapsed(false)
          setExpandedPanelId(null)
        }}
        className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Reset widoku
      </button>
      <div className="flex h-[var(--app-control-height)] items-center gap-1 rounded-md border border-border bg-background px-1 text-xs">
        <span className="flex items-center gap-1 px-2 text-muted-foreground">
          <Settings2 size={13} />
          Kolumny
        </span>
        {(['auto', '1', '2', '3', '4'] as QuoteGridColumns[]).map((value) => (
          <button
            key={value}
            onClick={() => setGridColumns(value)}
            className={`h-7 min-w-8 rounded px-2 font-medium transition-colors ${
              gridColumns === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={value === 'auto' ? 'Automatycznie dopasuj kolumny' : `${value} kolumny`}
          >
            {value === 'auto' ? 'Auto' : value}
          </button>
        ))}
      </div>
      <button
        onClick={() => setDetailPanelCollapsed((current) => !current)}
        className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        title={detailPanelCollapsed ? 'Pokaz panel szczegolow' : 'Zwin panel szczegolow'}
      >
        {detailPanelCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
        Panel
      </button>
      <button
        onClick={createQuote}
        className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus size={14} />
        Zapisz wycene
      </button>
    </div>
  )

  const movePanelToSide = (sourceId: QuotePanelId, targetSide: keyof QuotePanelLayout) => {
    setPanelLayout((current) => {
      const withoutSource = {
        left: current.left.filter((id) => id !== sourceId),
        right: current.right.filter((id) => id !== sourceId),
      }
      return { ...withoutSource, [targetSide]: [...withoutSource[targetSide], sourceId] }
    })
    setDragPanelId(null)
  }

  const setPanelSize = (id: QuotePanelId, size: StartTileSize) => {
    setPanelSizes((current) => ({ ...current, [id]: size }))
  }

  const renderPanelContent = (panelId: QuotePanelId) => {
    switch (panelId) {
      case 'form':
        return (
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Nowa wycena</p>
                <p className="text-[11px] text-muted-foreground">Pola sa edytowalne i zapisza sie jako szkic.</p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                {formatMoney(calc.netPrice)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 space-y-1 text-xs text-muted-foreground">
                Klient
                <input
                  value={safeDraft.customer}
                  onChange={(event) => patchDraft({ customer: event.target.value })}
                  placeholder="Nazwa firmy"
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="col-span-2 space-y-1 text-xs text-muted-foreground">
                Nazwa zlecenia
                <input
                  value={safeDraft.jobName}
                  onChange={(event) => patchDraft({ jobName: event.target.value })}
                  placeholder="Wspolna nazwa calego zamowienia"
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="col-span-2 space-y-1 text-xs text-muted-foreground">
                Sciezka plikow
                <input
                  value={safeDraft.filesPath}
                  onChange={(event) => patchDraft({ filesPath: event.target.value })}
                  placeholder="np. Z:\\Klienci\\COSMO\\Katalogi swiateczne"
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Kategoria
                <select
                  value={safeDraft.category}
                  onChange={(event) => {
                    const category = event.target.value
                    const productType = productTypeOptions[category]?.[0] ?? ''
                    patchDraft({ category, productType })
                    if (autoProcessMap[productType]) setDraftProcesses(autoProcessMap[productType])
                  }}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="">Wybierz</option>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Rodzaj produktu <span className="text-primary">| auto-dobiera procesy</span>
                <select
                  value={safeDraft.productType}
                  onChange={(event) => handleProductTypeChange(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="">-- najpierw wybierz kategorie --</option>
                  {availableProductTypes.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Nazwa wzoru
                <div className="flex gap-2">
                  <input
                    value={safeDraft.variantName}
                    onChange={(event) => patchDraft({ variantName: event.target.value, product: event.target.value })}
                    placeholder="Wpisz nazwe wlasna wzoru"
                    className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => patchDraft({ variantName: '', product: '' })}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
                    title="Wyczysc"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Naklady (szt.) - wpisz i Enter
                <input
                  value={quantityInput}
                  onChange={(event) => setQuantityInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addQuantity()
                    }
                  }}
                  placeholder="np. 100"
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </label>
              <div className="col-span-2 flex flex-wrap items-center gap-1.5">
                {safeDraft.quantities.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">Brak dodanych nakladow</span>
                ) : (
                  safeDraft.quantities.map((qty, index) => (
                    <button
                      key={`${qty}-${index}`}
                      onClick={() => {
                        const quantities = safeDraft.quantities.filter((_, itemIndex) => itemIndex !== index)
                        patchDraft({ quantities, quantity: quantities[0] ?? safeDraft.quantity })
                      }}
                      className="flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-1 text-[11px]"
                    >
                      {qty} szt. <X size={10} />
                    </button>
                  ))
                )}
              </div>
              <label className="space-y-1 text-xs text-muted-foreground">
                Liczba wzorow
                <input
                  type="number"
                  min={1}
                  value={safeDraft.designsCount}
                  onChange={(event) => patchDraft({ designsCount: toNumber(event.target.value) || 1 })}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Koszt materialu
                <input
                  type="number"
                  value={safeDraft.materialCost}
                  onChange={(event) => patchDraft({ materialCost: toNumber(event.target.value) })}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Narzut %
                <input
                  type="number"
                  value={safeDraft.marginPercent}
                  onChange={(event) => patchDraft({ marginPercent: toNumber(event.target.value) })}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="col-span-2 space-y-1 text-xs text-muted-foreground">
                Uwagi
                <textarea
                  value={safeDraft.notes}
                  onChange={(event) => patchDraft({ notes: event.target.value })}
                  rows={4}
                  className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="col-span-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Typ zlecenia</p>
                <div className="flex flex-wrap gap-3">
                  {([
                    ['own', 'Wlasne'],
                    ['combined', 'Laczone'],
                    ['external', 'Zewnetrzne'],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-1.5 text-xs">
                      <input
                        type="radio"
                        checked={safeDraft.jobType === value}
                        onChange={() => patchDraft({ jobType: value })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <label className="col-span-2 rounded-md border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
                <span className="mb-2 block font-semibold text-foreground">Gorka reczna</span>
                <input
                  type="number"
                  min={0}
                  value={safeDraft.manualOverage}
                  onChange={(event) => patchDraft({ manualOverage: toNumber(event.target.value) })}
                  className="h-9 w-full max-w-[260px] rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                />
                <span className="ml-3">Doliczana jako arkusze produkcyjne poza marza.</span>
              </label>
            </div>
          </div>
        )
      case 'materials':
        return (
          <TechnicalMaterialsEditor
            materials={safeDraft.technicalMaterials}
            onAdd={addTechnicalMaterial}
            onUpdate={updateTechnicalMaterial}
            onDelete={deleteTechnicalMaterial}
          />
        )
      case 'imposition':
        return (
          <ImpositionEditor
            value={safeDraft.imposition}
            quantities={safeDraft.quantities.length ? safeDraft.quantities : [safeDraft.quantity]}
            designsCount={safeDraft.designsCount}
            onChange={(imposition) => patchDraft({ imposition: { ...safeDraft.imposition, ...imposition } })}
          />
        )
      case 'summary':
        return (
          <div className="p-3">
            <p className="mb-3 text-sm font-semibold">Podsumowanie kalkulacji</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-border bg-muted/20 p-2">
                <p className="text-muted-foreground">Praca</p>
                <p className="font-semibold">{formatMoney(calc.workCost)}</p>
              </div>
              <div className="rounded border border-border bg-muted/20 p-2">
                <p className="text-muted-foreground">Material</p>
                <p className="font-semibold">{formatMoney(calc.materialCost)}</p>
              </div>
              <div className="rounded border border-border bg-muted/20 p-2">
                <p className="text-muted-foreground">Czas</p>
                <p className="font-semibold">{calc.minutes} min</p>
              </div>
              <div className="rounded border border-border bg-muted/20 p-2">
                <p className="text-muted-foreground">Cena netto</p>
                <p className="font-semibold">{formatMoney(calc.netPrice)}</p>
              </div>
            </div>
          </div>
        )
      case 'processes':
        return (
          <div className="space-y-2 p-3">
            {processGroups.map(([group, groupProcesses]) => (
              <ProcessGroup
                key={group}
                title={group}
                processes={groupProcesses}
                selectedIds={safeDraft.processIds}
                onToggle={toggleProcess}
              />
            ))}
          </div>
        )
      case 'process-editor':
        return (
          <div className="p-3">
            <ProcessEditor
              processes={processes}
              selectedIds={safeDraft.processIds}
              overrides={safeDraft.processOverrides}
              onUpdate={updateDraftProcess}
              onRemove={toggleProcess}
            />
          </div>
        )
      case 'machines':
        return (
          <div className="p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Maszyny druku i rozliczenie</p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><span className="font-semibold text-foreground">Ricoh 9200 / Ricoh 7500</span><br />Druk jednostronny / dwustronny. Rozliczenie per plik, limit maszyny glownej i backup dla zadan wymagajacych bialego koloru.</p>
              <p><span className="font-semibold text-foreground">Altalink B8200</span><br />Druk jednostronny / dwustronny 1/1 czarny, papier 80g. Wybor reczny dla prostych instrukcji i zwyklych kartek.</p>
              <p><span className="font-semibold text-foreground">Roland UV UG-642</span><br />Druk wielkoformatowy. Rozliczenie per m2 z uwzglednieniem szerokosci rolki i odpadu.</p>
            </div>
          </div>
        )
      case 'quotes':
        return (
          <div>
            <div className="madi-horizontal-scroll">
              <div className="min-w-[910px]">
                <div className="sticky top-0 grid grid-cols-[130px_130px_1fr_100px_120px_132px] gap-2 border-b border-border bg-muted/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {quoteListColumns.map((column) => (
                    <button
                      key={column.label}
                      type="button"
                      onClick={() => toggleQuoteSort(column.sortKey)}
                      className="flex min-w-0 items-center gap-1 text-left hover:text-foreground"
                    >
                      <span className="truncate">{column.label}</span>
                      {column.sortKey && (
                        <SortIndicator active={quoteSort.key === column.sortKey} direction={quoteSort.direction} />
                      )}
                      {column.sortKey && quoteSort.key === column.sortKey && (
                        <span className="hidden text-primary">{quoteSort.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ))}
                </div>
                {sortedQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    onClick={() => selectQuote(quote.id)}
                    className={`grid grid-cols-[130px_130px_1fr_100px_120px_132px] gap-2 border-b border-border px-3 py-2.5 text-sm hover:bg-muted/30 ${
                      selectedQuoteId === quote.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="truncate text-xs font-semibold text-primary">{quote.number}</span>
                    <select
                      value={quote.status}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateQuote(quote.id, { status: event.target.value as QuoteStatus })}
                      className="h-8 rounded border border-border bg-background px-2 text-xs"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <div className="min-w-0">
                      <input
                        value={quote.customer}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateQuote(quote.id, { customer: event.target.value })}
                        className="h-7 w-full rounded border border-transparent bg-transparent px-1 text-xs font-medium outline-none hover:border-border focus:border-primary focus:bg-background"
                      />
                      <p className="truncate px-1 text-[11px] text-muted-foreground">{quote.product}</p>
                    </div>
                    <input
                      type="number"
                      value={quote.quantity}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateQuote(quote.id, { quantity: toNumber(event.target.value) })}
                      className="h-8 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      value={quote.netPrice}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateQuote(quote.id, { netPrice: toNumber(event.target.value) })}
                      className="h-8 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={(event) => { event.stopPropagation(); selectQuote(quote.id); setQuoteWindowId(quote.id) }} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Otworz w oknie">
                        <Maximize2 size={14} />
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); duplicateQuote(quote.id) }} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Duplikuj">
                        <Copy size={14} />
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); deleteQuote(quote.id) }} className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Usun">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
    }
  }

  const orderedPanelIds = flattenQuotePanelLayout(panelLayout)
  const panelGridTemplateColumns = quoteGridTemplateColumns(gridColumns)

  const renderPanel = (panelId: QuotePanelId) => {
    const panelSize = panelSizes[panelId] ?? defaultQuotePanelSizes[panelId]
    return (
    <QuoteWorkspacePanel
      key={panelId}
      id={panelId}
      draggingId={dragPanelId}
      expanded={expandedPanelId === panelId}
      size={panelSize}
      onSizeChange={setPanelSize}
      onDragStart={setDragPanelId}
      onDragEnd={() => setDragPanelId(null)}
      onDropPanel={(targetId) => {
        if (!dragPanelId || dragPanelId === targetId) {
          setDragPanelId(null)
          return
        }
        setPanelLayout((current) => {
          if (workspaceMode === 'columns') {
            const targetSide = current.left.includes(targetId) ? 'left' : 'right'
            return moveQuotePanel(current, dragPanelId, targetId, targetSide)
          }
          return moveQuotePanelInGrid(current, dragPanelId, targetId)
        })
        setDragPanelId(null)
      }}
      onExpand={(id) => setExpandedPanelId((current) => current === id ? null : id)}
      gridColumn={quotePanelGridColumn(panelSize, gridColumns, expandedPanelId === panelId)}
    >
      {renderPanelContent(panelId)}
    </QuoteWorkspacePanel>
    )
  }

  return (
    <ModuleFrame
      title="Kalkulacja i wycena"
      kicker="Wycena, produkt i procesy"
      description="Formularz wyceny, procesy poligraficzne, koszt pracy, material i marza w jednym widoku."
      icon={<Calculator size={13} />}
      actions={actions}
      summary={summary}
      aside={
        detailPanelCollapsed ? (
          <QuoteDetailRail quote={selectedQuote} onExpand={() => setDetailPanelCollapsed(false)} />
        ) : (
          <QuoteDetail
            quote={selectedQuote}
            onCollapse={() => setDetailPanelCollapsed(true)}
            onOpenWindow={selectedQuote ? () => setQuoteWindowId(selectedQuote.id) : undefined}
          />
        )
      }
      bodyClassName="overflow-hidden"
    >
      {expandedPanelId ? (
        <div className="madi-scroll-area h-full p-[var(--app-module-gap)]">
          {renderPanel(expandedPanelId)}
        </div>
      ) : (
        <div
          className="madi-scroll-area h-full p-[var(--app-module-gap)]"
        >
          <div
            className="grid auto-rows-max items-start gap-[var(--app-module-gap)]"
            style={{ gridTemplateColumns: panelGridTemplateColumns }}
          >
            {orderedPanelIds.map((panelId) => renderPanel(panelId))}
          </div>
        </div>
      )}
      {quoteWindow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Okno wyceny"
          className="fixed inset-0 z-[6200] flex items-center justify-center bg-background/55 p-5 text-foreground backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setQuoteWindowId(null)
          }}
        >
          <QuoteDetail quote={quoteWindow} onCollapse={() => setQuoteWindowId(null)} variant="modal" />
        </div>
      )}
    </ModuleFrame>
  )
}
