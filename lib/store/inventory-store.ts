import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type InventoryCategory =
  | 'paper'
  | 'foil'
  | 'carton'
  | 'laminate'
  | 'ink'
  | 'adhesive'
  | 'packaging'
  | 'other'

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  sku: string
  unit: string
  stock: number
  reserved: number
  minStock: number
  location: string
  supplier: string
  lastDelivery: string
  notes: string
  selected: boolean
}

interface InventoryFilters {
  query: string
  category: InventoryCategory | 'all'
  onlyLowStock: boolean
}

interface InventoryState {
  items: InventoryItem[]
  activeItemId: string | null
  filters: InventoryFilters
  createItem: (input?: Partial<InventoryItem>) => string
  updateItem: (itemId: string, patch: Partial<InventoryItem>) => void
  deleteItem: (itemId: string) => void
  duplicateItem: (itemId: string) => void
  toggleSelection: (itemId: string) => void
  clearSelection: () => void
  setActiveItem: (itemId: string | null) => void
  setFilter: <K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) => void
  adjustStock: (itemId: string, delta: number) => void
  reserveStock: (itemId: string, delta: number) => void
  getFilteredItems: () => InventoryItem[]
  getActiveItem: () => InventoryItem | undefined
}

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const sampleItems: InventoryItem[] = [
  {
    id: 'inv-001',
    name: 'Papier kreda mat 170 g SRA3',
    category: 'paper',
    sku: 'PAP-KM170-SRA3',
    unit: 'ryza',
    stock: 42,
    reserved: 12,
    minStock: 20,
    location: 'A1-02',
    supplier: 'Antalis',
    lastDelivery: '2026-07-03',
    notes: 'Najczesciej schodzi na katalogi i ulotki.',
    selected: false,
  },
  {
    id: 'inv-002',
    name: 'Papier offset 90 g B1',
    category: 'paper',
    sku: 'PAP-OFF90-B1',
    unit: 'ark.',
    stock: 8200,
    reserved: 2800,
    minStock: 5000,
    location: 'A2-01',
    supplier: 'Igepa',
    lastDelivery: '2026-07-08',
    notes: 'Do instrukcji, ksiazek i insertow.',
    selected: false,
  },
  {
    id: 'inv-003',
    name: 'Folia soft touch 32 mic',
    category: 'foil',
    sku: 'FOL-ST32',
    unit: 'mb',
    stock: 310,
    reserved: 110,
    minStock: 250,
    location: 'F1-01',
    supplier: 'Grafix',
    lastDelivery: '2026-06-27',
    notes: 'Kontrolowac pod teczki premium.',
    selected: false,
  },
  {
    id: 'inv-004',
    name: 'Folia blysk OPP 24 mic',
    category: 'foil',
    sku: 'FOL-OPP24-B',
    unit: 'mb',
    stock: 95,
    reserved: 55,
    minStock: 150,
    location: 'F1-03',
    supplier: 'Grafix',
    lastDelivery: '2026-06-18',
    notes: 'Niski stan, zamowic przed kolejnym pakietem ulotek.',
    selected: false,
  },
  {
    id: 'inv-005',
    name: 'Karton GC1 300 g 700x1000',
    category: 'carton',
    sku: 'KAR-GC1-300',
    unit: 'ark.',
    stock: 1450,
    reserved: 860,
    minStock: 1000,
    location: 'K2-04',
    supplier: 'Papyrus',
    lastDelivery: '2026-07-01',
    notes: 'Opakowania i zawieszki.',
    selected: false,
  },
  {
    id: 'inv-006',
    name: 'Kartony wysylkowe 305x215x80',
    category: 'packaging',
    sku: 'PAK-305-215-80',
    unit: 'szt.',
    stock: 260,
    reserved: 40,
    minStock: 200,
    location: 'P3-01',
    supplier: 'Rajapack',
    lastDelivery: '2026-07-09',
    notes: 'Standard do probek i malych paczek.',
    selected: false,
  },
  {
    id: 'inv-007',
    name: 'Toner CMYK Xerox Versant',
    category: 'ink',
    sku: 'TON-XV-CMYK',
    unit: 'kpl.',
    stock: 4,
    reserved: 1,
    minStock: 3,
    location: 'D1-01',
    supplier: 'Xerox',
    lastDelivery: '2026-06-30',
    notes: 'Trzymac jeden komplet awaryjny.',
    selected: false,
  },
  {
    id: 'inv-008',
    name: 'Klej hot-melt do woblera',
    category: 'adhesive',
    sku: 'KLEJ-HM-WOB',
    unit: 'kg',
    stock: 12,
    reserved: 5,
    minStock: 8,
    location: 'I1-02',
    supplier: 'Henkel',
    lastDelivery: '2026-06-22',
    notes: 'Do konfekcji reklamowej.',
    selected: false,
  },
]

const templateItems = sampleItems.slice(0, 5)

const defaultFilters: InventoryFilters = {
  query: '',
  category: 'all',
  onlyLowStock: false,
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: templateItems,
      activeItemId: templateItems[0]?.id ?? null,
      filters: defaultFilters,

      createItem: (input = {}) => {
        const id = createId('inv')
        const item: InventoryItem = {
          id,
          name: input.name?.trim() || 'Nowy material',
          category: input.category ?? 'paper',
          sku: input.sku ?? '',
          unit: input.unit ?? 'szt.',
          stock: input.stock ?? 0,
          reserved: input.reserved ?? 0,
          minStock: input.minStock ?? 0,
          location: input.location ?? '',
          supplier: input.supplier ?? '',
          lastDelivery: input.lastDelivery ?? new Date().toISOString().slice(0, 10),
          notes: input.notes ?? '',
          selected: false,
        }
        set((state) => ({ items: [...state.items, item], activeItemId: id }))
        return id
      },

      updateItem: (itemId, patch) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
        })),

      deleteItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
          activeItemId: state.activeItemId === itemId ? null : state.activeItemId,
        })),

      duplicateItem: (itemId) => {
        const source = get().items.find((item) => item.id === itemId)
        if (!source) return
        const copy = { ...source, id: createId('inv'), name: `${source.name} - kopia`, selected: false }
        set((state) => ({ items: [...state.items, copy], activeItemId: copy.id }))
      },

      toggleSelection: (itemId) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === itemId ? { ...item, selected: !item.selected } : item)),
        })),

      clearSelection: () => set((state) => ({ items: state.items.map((item) => ({ ...item, selected: false })) })),
      setActiveItem: (itemId) => set({ activeItemId: itemId }),
      setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),

      adjustStock: (itemId, delta) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, stock: Math.max(0, item.stock + delta) } : item
          ),
        })),

      reserveStock: (itemId, delta) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, reserved: Math.max(0, item.reserved + delta) } : item
          ),
        })),

      getFilteredItems: () => {
        const { items, filters } = get()
        const query = filters.query.trim().toLowerCase()
        return items.filter((item) => {
          if (filters.category !== 'all' && item.category !== filters.category) return false
          if (filters.onlyLowStock && item.stock - item.reserved > item.minStock) return false
          if (!query) return true
          return [item.name, item.sku, item.location, item.supplier, item.notes]
            .join(' ')
            .toLowerCase()
            .includes(query)
        })
      },

      getActiveItem: () => get().items.find((item) => item.id === get().activeItemId),
    }),
    {
      name: 'madi-inventory-store-template-v1',
    }
  )
)
