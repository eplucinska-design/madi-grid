'use client'

import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  Copy,
  GripVertical,
  LayoutGrid,
  List,
  Package,
  PanelRight,
  Plus,
  Search,
  Square,
  CheckSquare,
  Trash2,
} from 'lucide-react'
import {
  useInventoryStore,
  type InventoryCategory,
  type InventoryItem,
} from '@/lib/store/inventory-store'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import { useAuthStore } from '@/lib/store/auth-store'
import { useAppStore } from '@/lib/store/app-store'
import { useViewPreferencesStore } from '@/lib/store/view-preferences-store'

const categoryLabels: Record<InventoryCategory, string> = {
  paper: 'Papier',
  foil: 'Folia',
  carton: 'Karton',
  laminate: 'Laminat',
  ink: 'Farby / toner',
  adhesive: 'Kleje',
  packaging: 'Opakowania',
  other: 'Inne',
}

const EMPTY_COLUMN_WIDTHS: Record<string, number> = {}

type InventoryViewMode = 'list' | 'cards'
type InventorySortKey = 'category' | 'name' | 'sku' | 'grammage' | 'stock' | 'available' | 'reserved' | 'minStock' | 'lastDelivery' | 'supplier' | 'location'
type SortDirection = 'asc' | 'desc'

const inventorySortLabels: Record<InventorySortKey, string> = {
  category: 'Rodzaj surowca',
  name: 'Nazwa',
  sku: 'SKU',
  grammage: 'Gramatura',
  stock: 'Stan',
  available: 'Dostepne',
  reserved: 'Rezerwacja',
  minStock: 'Minimum',
  lastDelivery: 'Ostatnia dostawa',
  supplier: 'Dostawca',
  location: 'Lokalizacja',
}

function toNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function stockState(item: InventoryItem) {
  const available = item.stock - item.reserved
  if (available <= 0) return { label: 'Brak', tone: 'text-destructive' }
  if (available <= item.minStock) return { label: 'Niski', tone: 'text-[#f59f00]' }
  return { label: 'OK', tone: 'text-[#2f9e44]' }
}

function grammageValue(item: InventoryItem) {
  const match = item.name.match(/(\d+(?:[,.]\d+)?)\s*g\b/i) ?? item.sku.match(/(\d+(?:[,.]\d+)?)\s*g\b/i)
  if (!match) return 0
  return Number.parseFloat(match[1].replace(',', '.')) || 0
}

function availableStock(item: InventoryItem) {
  return Math.max(0, item.stock - item.reserved)
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, 'pl', { sensitivity: 'base' })
}

function sortInventoryItems(items: InventoryItem[], sortKey: InventorySortKey, direction: SortDirection) {
  const factor = direction === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    let result = 0
    if (sortKey === 'category') result = compareText(categoryLabels[a.category], categoryLabels[b.category]) || compareText(a.name, b.name)
    if (sortKey === 'name') result = compareText(a.name, b.name)
    if (sortKey === 'sku') result = compareText(a.sku, b.sku)
    if (sortKey === 'grammage') result = grammageValue(a) - grammageValue(b)
    if (sortKey === 'stock') result = a.stock - b.stock
    if (sortKey === 'available') result = availableStock(a) - availableStock(b)
    if (sortKey === 'reserved') result = a.reserved - b.reserved
    if (sortKey === 'minStock') result = a.minStock - b.minStock
    if (sortKey === 'lastDelivery') result = new Date(a.lastDelivery).getTime() - new Date(b.lastDelivery).getTime()
    if (sortKey === 'supplier') result = compareText(a.supplier, b.supplier)
    if (sortKey === 'location') result = compareText(a.location, b.location)
    return result * factor
  })
}

function InventoryCard({
  item,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  item: InventoryItem
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const state = stockState(item)
  const available = availableStock(item)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-md border border-border bg-card p-3 text-left transition hover:border-primary/50 hover:bg-muted/25"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.sku || 'Bez SKU'} · {categoryLabels[item.category]}</p>
        </div>
        <span className={`rounded bg-muted px-2 py-1 text-[11px] font-semibold ${state.tone}`}>{state.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded border border-border bg-muted/20 p-2">
          <p className="text-muted-foreground">Stan</p>
          <p className="font-semibold">{item.stock} {item.unit}</p>
        </div>
        <div className="rounded border border-border bg-muted/20 p-2">
          <p className="text-muted-foreground">Dostepne</p>
          <p className="font-semibold">{available}</p>
        </div>
        <div className="rounded border border-border bg-muted/20 p-2">
          <p className="text-muted-foreground">Gram.</p>
          <p className="font-semibold">{grammageValue(item) || '-'}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{item.location || 'Brak lokalizacji'}</span>
        <span className="truncate">{item.supplier || 'Brak dostawcy'}</span>
      </div>
      <div className="mt-3 flex gap-1">
        <span className="flex-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
          Dostawa: {item.lastDelivery || '-'}
        </span>
        <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicate() }} className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted" title="Duplikuj">
          <Copy size={13} />
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onDelete() }} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Usun">
          <Trash2 size={13} />
        </button>
      </div>
    </button>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function startResize(
  event: ReactMouseEvent,
  initialWidth: number,
  onResize: (width: number) => void,
  min = 70,
  max = 520
) {
  event.preventDefault()
  event.stopPropagation()
  const startX = event.clientX

  const handleMove = (moveEvent: MouseEvent) => {
    onResize(clamp(initialWidth + moveEvent.clientX - startX, min, max))
  }

  const handleUp = () => {
    window.removeEventListener('mousemove', handleMove)
    window.removeEventListener('mouseup', handleUp)
  }

  window.addEventListener('mousemove', handleMove)
  window.addEventListener('mouseup', handleUp)
}

function InventoryDetailPanel() {
  const { getActiveItem, updateItem, deleteItem, duplicateItem, setActiveItem } = useInventoryStore()
  const item = getActiveItem()

  if (!item) {
    return null
  }

  return (
    <aside className="w-[var(--app-detail-panel-width)] shrink-0 border-l border-border bg-background">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.sku || item.id}</p>
            <p className="text-[11px] text-muted-foreground">{categoryLabels[item.category]}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => duplicateItem(item.id)} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Duplikuj">
              <Copy size={15} />
            </button>
            <button onClick={() => deleteItem(item.id)} className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Usun">
              <Trash2 size={15} />
            </button>
            <button onClick={() => setActiveItem(null)} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Zamknij">
              x
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-[var(--app-module-gap)]">
          <label className="block space-y-1 text-xs text-muted-foreground">
            Nazwa materialu
            <input
              value={item.name}
              onChange={(event) => updateItem(item.id, { name: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Kategoria
              <select
                value={item.category}
                onChange={(event) => updateItem(item.id, { category: event.target.value as InventoryCategory })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Jednostka
              <input
                value={item.unit}
                onChange={(event) => updateItem(item.id, { unit: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Stan
              <input
                type="number"
                value={item.stock}
                onChange={(event) => updateItem(item.id, { stock: toNumber(event.target.value) })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Rezerwacja
              <input
                type="number"
                value={item.reserved}
                onChange={(event) => updateItem(item.id, { reserved: toNumber(event.target.value) })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Minimum
              <input
                type="number"
                value={item.minStock}
                onChange={(event) => updateItem(item.id, { minStock: toNumber(event.target.value) })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Lokalizacja
              <input
                value={item.location}
                onChange={(event) => updateItem(item.id, { location: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Dostawca
            <input
              value={item.supplier}
              onChange={(event) => updateItem(item.id, { supplier: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Ostatnia dostawa
            <input
              type="date"
              value={item.lastDelivery}
              onChange={(event) => updateItem(item.id, { lastDelivery: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Notatki
            <textarea
              value={item.notes}
              onChange={(event) => updateItem(item.id, { notes: event.target.value })}
              rows={5}
              className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
        </div>
      </div>
    </aside>
  )
}

export function InventoryModule() {
  const {
    filters,
    setFilter,
    createItem,
    deleteItem,
    duplicateItem,
    toggleSelection,
    setActiveItem,
    getFilteredItems,
  } = useInventoryStore()
  const { user } = useAuthStore()
  const { currentModule } = useAppStore()
  const userId = user?.id ?? 'guest'
  const listColumnWidths = useViewPreferencesStore(
    (state) => state.prefsByUser[userId]?.[currentModule]?.listColumnWidths ?? EMPTY_COLUMN_WIDTHS
  )
  const setListColumnWidth = useViewPreferencesStore((state) => state.setListColumnWidth)
  const [viewMode, setViewMode] = useState<InventoryViewMode>('list')
  const [sortKey, setSortKey] = useState<InventorySortKey>('category')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const filteredItems = getFilteredItems()
  const items = useMemo(
    () => sortInventoryItems(filteredItems, sortKey, sortDirection),
    [filteredItems, sortKey, sortDirection]
  )
  const low = items.filter((item) => item.stock - item.reserved <= item.minStock)
  const reserved = items.reduce((sum, item) => sum + item.reserved, 0)
  const selected = items.filter((item) => item.selected).length
  const columns = useMemo(
    () => [
      { id: 'select', label: '', width: 42, min: 42, max: 42 },
      { id: 'name', label: 'Material', sortKey: 'name' as InventorySortKey, width: 380, min: 260, max: 560 },
      { id: 'category', label: 'Kategoria', sortKey: 'category' as InventorySortKey, width: 150, min: 120, max: 220 },
      { id: 'sku', label: 'SKU', sortKey: 'sku' as InventorySortKey, width: 135, min: 110, max: 220 },
      { id: 'stock', label: 'Stan', sortKey: 'stock' as InventorySortKey, width: 96, min: 84, max: 150 },
      { id: 'reserved', label: 'Rezerw.', sortKey: 'reserved' as InventorySortKey, width: 96, min: 84, max: 150 },
      { id: 'minStock', label: 'Min.', sortKey: 'minStock' as InventorySortKey, width: 90, min: 80, max: 140 },
      { id: 'location', label: 'Lokalizacja', sortKey: 'location' as InventorySortKey, width: 160, min: 120, max: 240 },
      { id: 'supplier', label: 'Dostawca', sortKey: 'supplier' as InventorySortKey, width: 190, min: 140, max: 320 },
      { id: 'actions', label: 'Akcje', width: 132, min: 120, max: 170 },
    ],
    []
  )
  const columnWidth = (id: string, fallback: number) => listColumnWidths[id] ?? fallback
  const gridTemplateColumns = columns.map((column) => `${columnWidth(column.id, column.width)}px`).join(' ')
  const minWidth = columns.reduce((sum, column) => sum + columnWidth(column.id, column.width), 0) + columns.length * 8 + 32
  const toggleSort = (key?: InventorySortKey) => {
    if (!key) return
    setSortKey((current) => {
      if (current === key) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
        return current
      }
      setSortDirection('asc')
      return key
    })
  }

  const summary = (
    <StatStrip
      items={[
        { label: 'Materialy', value: items.length, hint: 'widoczne po filtrach' },
        { label: 'Niskie stany', value: low.length, hint: 'do reakcji', tone: low.length ? 'text-[#f59f00]' : '' },
        { label: 'Rezerwacje', value: reserved, hint: 'suma jednostek' },
        { label: 'Zaznaczone', value: selected, hint: 'do akcji zbiorczych' },
      ]}
    />
  )

  const actions = (
    <>
      <button
        onClick={() => createItem({ name: 'Nowy material', category: 'paper' })}
        className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus size={14} />
        Nowy material
      </button>
    </>
  )

  return (
    <ModuleFrame
      title="Magazyn"
      kicker="Stany i rezerwacje"
      description="Papiery, folie, kartony, farby, kleje i opakowania. Lista jest podgladem, edycja odbywa sie w panelu materialu."
      icon={<Package size={13} />}
      actions={actions}
      summary={summary}
      aside={<InventoryDetailPanel />}
      bodyClassName="overflow-hidden"
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
          <div className="flex min-w-[clamp(190px,24vw,320px)] flex-1 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
            <Search size={15} className="text-muted-foreground" />
            <input
              value={filters.query}
              onChange={(event) => setFilter('query', event.target.value)}
              placeholder="Szukaj materialu, SKU, dostawcy, lokalizacji..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={filters.category}
            onChange={(event) => setFilter('category', event.target.value as InventoryCategory | 'all')}
            className="h-[var(--app-control-height)] rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="all">Wszystkie kategorie</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setFilter('onlyLowStock', !filters.onlyLowStock)}
            className={`flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md border px-3 text-xs ${
              filters.onlyLowStock ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border hover:bg-muted'
            }`}
          >
            <AlertTriangle size={14} />
            Niskie stany
          </button>
          <div className="flex items-center rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-8 items-center gap-1 rounded px-2 text-xs font-medium ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <List size={14} />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex h-8 items-center gap-1 rounded px-2 text-xs font-medium ${viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <LayoutGrid size={14} />
              Kafelki
            </button>
          </div>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as InventorySortKey)}
            className="h-[var(--app-control-height)] rounded-md border border-border bg-background px-2 text-xs"
          >
            {Object.entries(inventorySortLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
            className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
            title="Zmien kierunek sortowania"
          >
            {sortDirection === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
            {sortDirection === 'asc' ? 'Rosnaco' : 'Malejaco'}
          </button>
        </div>

        <div className="madi-scroll-area flex-1">
          {viewMode === 'cards' ? (
            <div className="grid madi-fluid-cards gap-[var(--app-module-gap)] p-[var(--app-module-gap)]">
              {items.map((item) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  onSelect={() => setActiveItem(item.id)}
                  onDuplicate={() => duplicateItem(item.id)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </div>
          ) : (
          <div style={{ minWidth }}>
            <div
              className="sticky top-0 z-10 grid gap-2 border-b border-border bg-muted/70 px-[var(--app-module-pad-x)] py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur"
              style={{ gridTemplateColumns }}
            >
              {columns.map((column) => (
                <div key={column.id} className="relative flex items-center gap-1">
                  {column.id !== 'select' && column.id !== 'actions' && <GripVertical size={11} className="text-muted-foreground/60" />}
                  {'sortKey' in column && column.sortKey ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.sortKey)}
                      className="flex min-w-0 items-center gap-1 text-left hover:text-foreground"
                    >
                      <span className="truncate">{column.label}</span>
                      {sortKey === column.sortKey && (
                        <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ) : (
                    <span>{column.label}</span>
                  )}
                  {column.id !== 'select' && column.id !== 'actions' && (
                    <button
                      onMouseDown={(event) =>
                        startResize(
                          event,
                          columnWidth(column.id, column.width),
                          (width) => setListColumnWidth(userId, currentModule, column.id, width),
                          column.min,
                          column.max
                        )
                      }
                      className="absolute -right-1 top-0 h-full w-2 cursor-col-resize rounded opacity-0 hover:bg-primary/20 hover:opacity-100"
                      title="Zmien szerokosc kolumny"
                    />
                  )}
                </div>
              ))}
            </div>
            {items.map((item) => {
              const state = stockState(item)
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveItem(item.id)}
                  className={`grid gap-2 border-b border-border px-[var(--app-module-pad-x)] py-2.5 text-sm hover:bg-muted/30 ${
                    item.selected ? 'bg-primary/10' : ''
                  }`}
                  style={{ gridTemplateColumns }}
                >
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleSelection(item.id)
                    }}
                    className="flex h-8 items-center justify-center text-muted-foreground hover:text-primary"
                  >
                    {item.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <div className="min-w-0 px-2">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.notes || 'Kliknij, aby edytowac w panelu'}</p>
                  </div>
                  <span className="truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground" title="Edycja kategorii w panelu materialu">
                    {categoryLabels[item.category]}
                  </span>
                  <span className="truncate rounded bg-muted/60 px-2 py-1 font-mono text-xs text-muted-foreground" title="Edycja SKU w panelu materialu">
                    {item.sku || 'Brak SKU'}
                  </span>
                  <span className={`truncate rounded bg-background px-2 py-1 text-xs font-semibold ${state.tone}`} title="Edycja stanu w panelu materialu">
                    {item.stock} {item.unit}
                  </span>
                  <span className="truncate rounded bg-background px-2 py-1 text-xs text-muted-foreground" title="Edycja rezerwacji w panelu materialu">
                    {item.reserved} {item.unit}
                  </span>
                  <span className="truncate rounded bg-background px-2 py-1 text-xs text-muted-foreground" title="Edycja minimum w panelu materialu">
                    {item.minStock} {item.unit}
                  </span>
                  <span className="truncate rounded bg-muted/60 px-2 py-1 text-xs text-muted-foreground" title="Edycja lokalizacji w panelu materialu">
                    {item.location || 'Brak'}
                  </span>
                  <span className="truncate rounded bg-muted/60 px-2 py-1 text-xs text-muted-foreground" title="Edycja dostawcy w panelu materialu">
                    {item.supplier || 'Brak'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={(event) => { event.stopPropagation(); setActiveItem(item.id) }} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Edytuj w panelu">
                      <PanelRight size={14} />
                    </button>
                    <button onClick={(event) => { event.stopPropagation(); duplicateItem(item.id) }} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Duplikuj">
                      <Copy size={14} />
                    </button>
                    <button onClick={(event) => { event.stopPropagation(); deleteItem(item.id) }} className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Usun">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </div>
      </div>
    </ModuleFrame>
  )
}
