import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface QuoteProcess {
  id: string
  group: string
  label: string
  minutes: number
  rate: number
  unit?: string
}

export interface QuoteProcessOverride {
  order: number
  quantity: number
  minutes: number
  rate: number
  notes: string
}

export interface QuoteTechnicalMaterial {
  id: string
  name: string
  quantity: number
  unit: string
  unitCost: number
  markupPercent: number
}

export interface QuoteImposition {
  readyFormat: string
  orientation: 'horizontal' | 'vertical'
  productionSheet: string
  widthMm: number
  heightMm: number
  bleedMm: number
  sheetMarginMm: number
  gutterVerticalMm: number
  gutterHorizontalMm: number
  mountMode: 'auto' | 'with-gutter' | 'without-gutter'
  layoutMode: 'auto' | 'manual'
  forcedColumns: number
  forcedRows: number
}

export type QuoteJobType = 'own' | 'combined' | 'external'

export interface QuoteRecord {
  id: string
  number: string
  status: QuoteStatus
  customer: string
  jobName: string
  product: string
  productType: string
  variantName: string
  category: string
  quantity: number
  quantities: number[]
  designsCount: number
  jobType: QuoteJobType
  manualOverage: number
  materialCost: number
  netPrice: number
  margin: number
  filesPath: string
  notes: string
  processIds: string[]
  processOverrides: Record<string, QuoteProcessOverride>
  technicalMaterials: QuoteTechnicalMaterial[]
  imposition: QuoteImposition
  createdAt: string
}

export interface QuoteDraft {
  customer: string
  jobName: string
  product: string
  productType: string
  variantName: string
  category: string
  quantity: number
  quantities: number[]
  designsCount: number
  jobType: QuoteJobType
  manualOverage: number
  filesPath: string
  notes: string
  processIds: string[]
  processOverrides: Record<string, QuoteProcessOverride>
  technicalMaterials: QuoteTechnicalMaterial[]
  imposition: QuoteImposition
  materialCost: number
  marginPercent: number
}

interface QuotesState {
  processes: QuoteProcess[]
  quotes: QuoteRecord[]
  draft: QuoteDraft
  selectedQuoteId: string | null
  toggleProcess: (processId: string) => void
  patchDraft: (patch: Partial<QuoteDraft>) => void
  setDraftProcesses: (processIds: string[]) => void
  updateDraftProcess: (processId: string, patch: Partial<QuoteProcessOverride>) => void
  addTechnicalMaterial: () => void
  updateTechnicalMaterial: (materialId: string, patch: Partial<QuoteTechnicalMaterial>) => void
  deleteTechnicalMaterial: (materialId: string) => void
  createQuote: () => string
  updateQuote: (quoteId: string, patch: Partial<QuoteRecord>) => void
  deleteQuote: (quoteId: string) => void
  duplicateQuote: (quoteId: string) => void
  selectQuote: (quoteId: string | null) => void
  calculateDraft: () => { workCost: number; materialCost: number; netPrice: number; margin: number; minutes: number }
}

export const QUOTE_PROCESSES: QuoteProcess[] = [
  { id: 'print-digital', group: 'DR Druk', label: 'Drukowanie', minutes: 28, rate: 2.4, unit: 'plik' },
  { id: 'cut-print', group: 'DR Druk', label: 'Krojenie do druku', minutes: 8, rate: 2.1, unit: 'ark' },
  { id: 'large-format', group: 'DR Druk', label: 'Druk wielkoformatowy', minutes: 35, rate: 3.2, unit: 'm2' },
  { id: 'graphic-design', group: 'GF Grafika', label: 'Grafik - projektowanie', minutes: 90, rate: 2.8, unit: 'h' },
  { id: 'dtp', group: 'GF Grafika', label: 'Grafik - DTP', minutes: 45, rate: 2.4, unit: 'h' },
  { id: 'graphic-fix', group: 'GF Grafika', label: 'Grafik - awaria', minutes: 30, rate: 3.4, unit: 'h' },
  { id: 'cut-finish', group: 'IN Introligatornia', label: 'Krojenie do obrobki', minutes: 11, rate: 3.0, unit: 'ark' },
  { id: 'cut-ready', group: 'IN Introligatornia', label: 'Krojenie na gotowo', minutes: 11, rate: 3.0, unit: 'ark' },
  { id: 'auto-crease', group: 'IN Introligatornia', label: 'Bigowanie automatyczne', minutes: 37, rate: 3, unit: 'ark' },
  { id: 'manual-crease', group: 'IN Introligatornia', label: 'Bigowanie reczne', minutes: 55, rate: 2.6, unit: 'ark' },
  { id: 'auto-perf', group: 'IN Introligatornia', label: 'Perforacja automatyczna', minutes: 28, rate: 2.7, unit: 'ark' },
  { id: 'auto-fold', group: 'IN Introligatornia', label: 'Falcowanie automatyczne', minutes: 37, rate: 3, unit: 'ark' },
  { id: 'manual-fold', group: 'IN Introligatornia', label: 'Falcowanie reczne', minutes: 55, rate: 2.5, unit: 'ark' },
  { id: 'foil', group: 'IN Introligatornia', label: 'Foliowanie automatyczne', minutes: 42, rate: 3.1, unit: 'ark' },
  { id: 'laminate', group: 'IN Introligatornia', label: 'Laminowanie arkuszowe', minutes: 45, rate: 3.2, unit: 'ark' },
  { id: 'nacinanie', group: 'IN Introligatornia', label: 'Nacinanie (nacinarka)', minutes: 33, rate: 2.8, unit: 'ark' },
  { id: 'staple', group: 'IN Introligatornia', label: 'Oprawa zeszytowa', minutes: 48, rate: 2.9, unit: 'kpl' },
  { id: 'spiral', group: 'IN Introligatornia', label: 'Oprawa spiralna', minutes: 65, rate: 2.7, unit: 'kpl' },
  { id: 'glue-binding', group: 'IN Introligatornia', label: 'Oprawa klejona', minutes: 70, rate: 3.1, unit: 'kpl' },
  { id: 'calendar-binding', group: 'IN Introligatornia', label: 'Oprawa kalendarzowa', minutes: 58, rate: 2.9, unit: 'kpl' },
  { id: 'stitching', group: 'IN Introligatornia', label: 'Sztancowanie', minutes: 62, rate: 3.6, unit: 'ark' },
  { id: 'round-corners-1', group: 'IN Introligatornia', label: 'Zaokraglanie naroznikow: 1 naroznik', minutes: 18, rate: 2.2, unit: 'kpl' },
  { id: 'round-corners-2', group: 'IN Introligatornia', label: 'Zaokraglanie naroznikow: 2 narozniki', minutes: 22, rate: 2.2, unit: 'kpl' },
  { id: 'round-corners-4', group: 'IN Introligatornia', label: 'Zaokraglanie naroznikow: 4 narozniki', minutes: 30, rate: 2.2, unit: 'kpl' },
  { id: 'kaserowanie', group: 'IN Introligatornia', label: 'Kaszerowanie', minutes: 50, rate: 3.4, unit: 'ark' },
  { id: 'plot-roll', group: 'PL Ploter', label: 'Ploter rolkowy - ark/h lub mb linii do ciecia', minutes: 30, rate: 3.5, unit: 'mb' },
  { id: 'plot-table', group: 'PL Ploter', label: 'Ploter stolowy - ark/h lub mb linii do ciecia', minutes: 40, rate: 3.8, unit: 'mb' },
  { id: 'wobbler', group: 'KF Konfekcja', label: 'Podklejanie woblera', minutes: 25, rate: 2.2, unit: 'szt' },
  { id: 'glue-simple', group: 'KF Konfekcja', label: 'Podklejanie proste', minutes: 22, rate: 2.1, unit: 'szt' },
  { id: 'glue-complex', group: 'KF Konfekcja', label: 'Podklejanie zlozone', minutes: 38, rate: 2.4, unit: 'szt' },
  { id: 'box-flat', group: 'KF Konfekcja', label: 'Klejenie opakowania ze zlozeniem na plasko', minutes: 44, rate: 2.5, unit: 'szt' },
  { id: 'box-ready', group: 'KF Konfekcja', label: 'Klejenie opakowania ze zlozeniem na gotowo', minutes: 55, rate: 2.8, unit: 'szt' },
  { id: 'packing', group: 'KF Konfekcja', label: 'Pakowanie', minutes: 18, rate: 2, unit: 'kpl' },
  { id: 'sets', group: 'KF Konfekcja', label: 'Kompletowanie zestawow', minutes: 36, rate: 2.1, unit: 'kpl' },
  { id: 'repacking', group: 'KF Konfekcja', label: 'Przepakowywanie', minutes: 26, rate: 2.1, unit: 'kpl' },
  { id: 'outside-uv-flat', group: 'PZ Procesy zewnetrzne', label: 'PZ lakier UV wybiorczy', minutes: 0, rate: 0, unit: 'zew' },
  { id: 'outside-uv-3d', group: 'PZ Procesy zewnetrzne', label: 'PZ lakier UV 3D wybiorczy', minutes: 0, rate: 0, unit: 'zew' },
  { id: 'outside-release', group: 'PZ Procesy zewnetrzne', label: 'PZ wydanie', minutes: 5, rate: 2, unit: 'zew' },
  { id: 'outside-pickup', group: 'PZ Procesy zewnetrzne', label: 'PZ przyjecie', minutes: 5, rate: 2, unit: 'zew' },
]

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createProcessOverride = (process: QuoteProcess, order: number): QuoteProcessOverride => ({
  order,
  quantity: 1,
  minutes: process.minutes,
  rate: process.rate,
  notes: '',
})

const ensureProcessOverrides = (
  processIds: string[],
  overrides: Record<string, QuoteProcessOverride>,
  processes: QuoteProcess[]
) => {
  const next: Record<string, QuoteProcessOverride> = {}
  processIds.forEach((processId, index) => {
    const process = processes.find((item) => item.id === processId)
    if (!process) return
    next[processId] = overrides[processId] ?? createProcessOverride(process, index + 1)
  })
  return next
}

const quoteStatuses: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected']
const quoteJobTypes: QuoteJobType[] = ['own', 'combined', 'external']

const defaultDraft: QuoteDraft = {
  customer: '',
  jobName: '',
  product: '',
  productType: '',
  variantName: '',
  category: '',
  quantity: 500,
  quantities: [],
  designsCount: 1,
  jobType: 'own',
  manualOverage: 0,
  filesPath: '',
  notes: '',
  processIds: ['print-digital', 'cut-print', 'packing'],
  processOverrides: {},
  technicalMaterials: [],
  imposition: {
    readyFormat: 'Niestandardowy',
    orientation: 'horizontal',
    productionSheet: '488x330 SG',
    widthMm: 90,
    heightMm: 50,
    bleedMm: 2,
    sheetMarginMm: 5,
    gutterVerticalMm: 4,
    gutterHorizontalMm: 4,
    mountMode: 'with-gutter',
    layoutMode: 'auto',
    forcedColumns: 0,
    forcedRows: 0,
  },
  materialCost: 320,
  marginPercent: 45,
}

const sampleQuotes: QuoteRecord[] = [
  {
    id: 'quote-001',
    number: 'MAD/2026/07/0091',
    status: 'draft',
    customer: 'Demo Print Lab Sp. z o.o.',
    jobName: 'Pakiet startowy - ulotki i wizytowki',
    product: 'Wizytowki firmowe',
    productType: 'Wizytowki standardowe',
    variantName: 'Wariant podstawowy',
    category: 'Wizytowki',
    quantity: 500,
    quantities: [500, 100],
    designsCount: 2,
    jobType: 'own',
    manualOverage: 0,
    materialCost: 320,
    netPrice: 1206.46,
    margin: 55.4,
    filesPath: 'Z:\\DEMO\\Klienci\\Demo Print Lab\\Pakiet startowy',
    notes: 'Szablon wyceny z montazem uzytkow i podstawowymi procesami.',
    processIds: ['print-digital', 'cut-print', 'auto-crease', 'auto-fold', 'packing'],
    processOverrides: {},
    technicalMaterials: [],
    imposition: defaultDraft.imposition,
    createdAt: '2026-07-06',
  },
  {
    id: 'quote-002',
    number: 'MAD/2026/07/0090',
    status: 'sent',
    customer: 'Fikcyjna Marka Reklamowa S.A.',
    jobName: 'Katalog 2026',
    product: 'Katalog A4 20 stron',
    productType: 'Katalog klejony',
    variantName: 'wariant ekonomiczny',
    category: 'Katalog',
    quantity: 100,
    quantities: [100],
    designsCount: 1,
    jobType: 'own',
    manualOverage: 0,
    materialCost: 180,
    netPrice: 468.3,
    margin: 38.2,
    filesPath: 'Z:\\DEMO\\Klienci\\Fikcyjna Marka\\Katalog 2026',
    notes: 'Wariant ekonomiczny bez folii.',
    processIds: ['print-digital', 'dtp', 'staple', 'packing'],
    processOverrides: {},
    technicalMaterials: [],
    imposition: defaultDraft.imposition,
    createdAt: '2026-07-06',
  },
]

const normalizeDraft = (draft?: Partial<QuoteDraft>): QuoteDraft => {
  const processIds = Array.isArray(draft?.processIds) && draft.processIds.length ? draft.processIds : defaultDraft.processIds
  return {
    ...defaultDraft,
    ...(draft ?? {}),
    processIds,
    processOverrides: ensureProcessOverrides(processIds, draft?.processOverrides ?? {}, QUOTE_PROCESSES),
    quantities: Array.isArray(draft?.quantities) ? draft.quantities : defaultDraft.quantities,
    technicalMaterials: Array.isArray(draft?.technicalMaterials) ? draft.technicalMaterials : defaultDraft.technicalMaterials,
    imposition: { ...defaultDraft.imposition, ...(draft?.imposition ?? {}) },
  }
}

const normalizeQuote = (quote: Partial<QuoteRecord>, index: number): QuoteRecord => {
  const processIds = Array.isArray(quote.processIds) && quote.processIds.length ? quote.processIds : defaultDraft.processIds
  const quantity = Math.max(1, quote.quantity ?? defaultDraft.quantity)
  return {
    id: quote.id ?? createId('quote'),
    number: quote.number ?? `MAD/2026/07/${String(index + 91).padStart(4, '0')}`,
    status: quoteStatuses.includes(quote.status as QuoteStatus) ? (quote.status as QuoteStatus) : 'draft',
    customer: quote.customer ?? 'Nowy klient',
    jobName: quote.jobName ?? quote.product ?? 'Nowe zlecenie',
    product: quote.product ?? quote.variantName ?? 'Nowa wycena',
    productType: quote.productType ?? '',
    variantName: quote.variantName ?? quote.product ?? '',
    category: quote.category ?? 'Ogolne',
    quantity,
    quantities: Array.isArray(quote.quantities) && quote.quantities.length ? quote.quantities : [quantity],
    designsCount: Math.max(1, quote.designsCount ?? 1),
    jobType: quoteJobTypes.includes(quote.jobType as QuoteJobType) ? (quote.jobType as QuoteJobType) : 'own',
    manualOverage: Math.max(0, quote.manualOverage ?? 0),
    materialCost: Math.max(0, quote.materialCost ?? 0),
    netPrice: Math.max(0, quote.netPrice ?? 0),
    margin: Math.max(0, quote.margin ?? 0),
    filesPath: quote.filesPath ?? '',
    notes: quote.notes ?? '',
    processIds,
    processOverrides: ensureProcessOverrides(processIds, quote.processOverrides ?? {}, QUOTE_PROCESSES),
    technicalMaterials: Array.isArray(quote.technicalMaterials) ? quote.technicalMaterials : [],
    imposition: { ...defaultDraft.imposition, ...(quote.imposition ?? {}) },
    createdAt: quote.createdAt ?? new Date().toISOString().slice(0, 10),
  }
}

export const useQuotesStore = create<QuotesState>()(
  persist(
    (set, get) => ({
      processes: QUOTE_PROCESSES,
      quotes: sampleQuotes,
      draft: defaultDraft,
      selectedQuoteId: sampleQuotes[0]?.id ?? null,

      toggleProcess: (processId) =>
        set((state) => {
          const processIds = state.draft.processIds.includes(processId)
            ? state.draft.processIds.filter((id) => id !== processId)
            : [...state.draft.processIds, processId]
          return {
            draft: {
              ...state.draft,
              processIds,
              processOverrides: ensureProcessOverrides(processIds, state.draft.processOverrides ?? {}, state.processes),
            },
          }
        }),

      patchDraft: (patch) =>
        set((state) => ({
          draft: {
            ...defaultDraft,
            ...state.draft,
            ...patch,
            imposition: { ...defaultDraft.imposition, ...(state.draft.imposition ?? {}), ...(patch.imposition ?? {}) },
            processOverrides: patch.processIds
              ? ensureProcessOverrides(patch.processIds, state.draft.processOverrides ?? {}, state.processes)
              : state.draft.processOverrides ?? {},
            technicalMaterials: patch.technicalMaterials ?? state.draft.technicalMaterials ?? [],
          },
        })),

      setDraftProcesses: (processIds) =>
        set((state) => ({
          draft: {
            ...defaultDraft,
            ...state.draft,
            processIds,
            processOverrides: ensureProcessOverrides(processIds, state.draft.processOverrides ?? {}, state.processes),
          },
        })),

      updateDraftProcess: (processId, patch) =>
        set((state) => {
          const process = state.processes.find((item) => item.id === processId)
          if (!process) return state
          const current =
            state.draft.processOverrides?.[processId] ??
            createProcessOverride(process, state.draft.processIds.findIndex((id) => id === processId) + 1)
          return {
            draft: {
              ...state.draft,
              processOverrides: {
                ...(state.draft.processOverrides ?? {}),
                [processId]: { ...current, ...patch },
              },
            },
          }
        }),

      addTechnicalMaterial: () =>
        set((state) => ({
          draft: {
            ...state.draft,
            technicalMaterials: [
              ...(state.draft.technicalMaterials ?? []),
              { id: createId('mat'), name: 'Nowy material', quantity: 1, unit: 'szt.', unitCost: 0, markupPercent: 25 },
            ],
          },
        })),

      updateTechnicalMaterial: (materialId, patch) =>
        set((state) => ({
          draft: {
            ...state.draft,
            technicalMaterials: (state.draft.technicalMaterials ?? []).map((material) =>
              material.id === materialId ? { ...material, ...patch } : material
            ),
          },
        })),

      deleteTechnicalMaterial: (materialId) =>
        set((state) => ({
          draft: {
            ...state.draft,
            technicalMaterials: (state.draft.technicalMaterials ?? []).filter((material) => material.id !== materialId),
          },
        })),

      calculateDraft: () => {
        const { draft, processes } = get()
        const safeDraft = { ...defaultDraft, ...draft, imposition: { ...defaultDraft.imposition, ...(draft.imposition ?? {}) } }
        const selected = processes.filter((process) => safeDraft.processIds.includes(process.id))
        const mainQuantity = Math.max(...(safeDraft.quantities.length ? safeDraft.quantities : [safeDraft.quantity]).map((qty) => Math.max(qty, 1)))
        const quantityTotal = (safeDraft.quantities.length ? safeDraft.quantities : [safeDraft.quantity]).reduce((sum, qty) => sum + Math.max(qty, 0), 0)
        const qtyFactor = Math.max(mainQuantity, 1) / 500
        const processOverrides = ensureProcessOverrides(safeDraft.processIds, safeDraft.processOverrides ?? {}, processes)
        const minutes = Math.round(
          selected.reduce((sum, process) => {
            const override = processOverrides[process.id] ?? createProcessOverride(process, 1)
            return sum + Math.max(0, override.minutes) * Math.max(1, override.quantity)
          }, 0) * Math.max(qtyFactor, 0.35)
        )
        const workCost = selected.reduce((sum, process) => {
          const override = processOverrides[process.id] ?? createProcessOverride(process, 1)
          return sum + Math.max(0, override.minutes) * Math.max(0, override.rate) * Math.max(1, override.quantity)
        }, 0) * Math.max(qtyFactor, 0.35)
        const technicalCost = (safeDraft.technicalMaterials ?? []).reduce(
          (sum, material) => sum + Math.max(0, material.quantity) * Math.max(0, material.unitCost) * (1 + Math.max(0, material.markupPercent) / 100),
          0
        )
        const manualOverageCost = Math.max(0, safeDraft.manualOverage) * Math.max(quantityTotal, 1)
        const materialCost = Math.max(0, safeDraft.materialCost) + technicalCost + manualOverageCost
        const base = workCost + materialCost
        const netPrice = Math.round(base * (1 + Math.max(0, safeDraft.marginPercent) / 100) * 100) / 100
        const margin = netPrice ? Math.round(((netPrice - base) / netPrice) * 1000) / 10 : 0
        return { workCost, materialCost, netPrice, margin, minutes }
      },

      createQuote: () => {
        const { draft } = get()
        const safeDraft = { ...defaultDraft, ...draft, imposition: { ...defaultDraft.imposition, ...(draft.imposition ?? {}) } }
        const calc = get().calculateDraft()
        const id = createId('quote')
        const number = `MAD/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(
          get().quotes.length + 91
        ).padStart(4, '0')}`
        const record: QuoteRecord = {
          id,
          number,
          status: 'draft',
          customer: safeDraft.customer.trim() || 'Nowy klient',
          jobName: safeDraft.jobName.trim() || 'Nowe zlecenie',
          product: safeDraft.product.trim() || 'Nowa wycena',
          productType: safeDraft.productType,
          variantName: safeDraft.variantName,
          category: safeDraft.category || 'Ogolne',
          quantity: Math.max(1, safeDraft.quantity),
          quantities: safeDraft.quantities,
          designsCount: Math.max(1, safeDraft.designsCount),
          jobType: safeDraft.jobType,
          manualOverage: Math.max(0, safeDraft.manualOverage),
          materialCost: calc.materialCost,
          netPrice: calc.netPrice,
          margin: calc.margin,
          filesPath: safeDraft.filesPath,
          notes: safeDraft.notes,
          processIds: safeDraft.processIds,
          processOverrides: ensureProcessOverrides(safeDraft.processIds, safeDraft.processOverrides ?? {}, get().processes),
          technicalMaterials: safeDraft.technicalMaterials,
          imposition: safeDraft.imposition,
          createdAt: new Date().toISOString().slice(0, 10),
        }
        set((state) => ({ quotes: [record, ...state.quotes], selectedQuoteId: id }))
        return id
      },

      updateQuote: (quoteId, patch) =>
        set((state) => ({
          quotes: state.quotes.map((quote) => (quote.id === quoteId ? { ...quote, ...patch } : quote)),
        })),

      deleteQuote: (quoteId) =>
        set((state) => ({
          quotes: state.quotes.filter((quote) => quote.id !== quoteId),
          selectedQuoteId: state.selectedQuoteId === quoteId ? null : state.selectedQuoteId,
        })),

      duplicateQuote: (quoteId) => {
        const source = get().quotes.find((quote) => quote.id === quoteId)
        if (!source) return
        const copy = {
          ...source,
          id: createId('quote'),
          number: `${source.number}-K`,
          status: 'draft' as QuoteStatus,
          product: `${source.product} - kopia`,
          createdAt: new Date().toISOString().slice(0, 10),
        }
        set((state) => ({ quotes: [copy, ...state.quotes], selectedQuoteId: copy.id }))
      },

      selectQuote: (quoteId) => set({ selectedQuoteId: quoteId }),
    }),
    {
      name: 'madi-quotes-store-template-v2-sanitized',
      merge: (persisted, current) => {
        const saved = persisted as Partial<QuotesState> | undefined
        const quotes = Array.isArray(saved?.quotes)
          ? saved.quotes.map((quote, index) => normalizeQuote(quote as Partial<QuoteRecord>, index))
          : current.quotes
        const selectedQuoteId = quotes.some((quote) => quote.id === saved?.selectedQuoteId)
          ? saved?.selectedQuoteId ?? null
          : quotes[0]?.id ?? null

        return {
          ...current,
          ...(saved ?? {}),
          processes: QUOTE_PROCESSES,
          quotes,
          draft: normalizeDraft(saved?.draft as Partial<QuoteDraft> | undefined),
          selectedQuoteId,
        }
      },
    }
  )
)
