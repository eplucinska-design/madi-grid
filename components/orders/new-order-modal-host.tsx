'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  FolderOpen,
  Plus,
  Printer,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/auth-store'
import {
  GRID_LISTS,
  inferGridTaskTimeMode,
  useGridStore,
  type GridChecklistItem,
  type GridStatusId,
  type GridTaskTimeMode,
} from '@/lib/store/grid-store'
import { useAppStore } from '@/lib/store/app-store'
import { useQuotesStore } from '@/lib/store/quotes-store'
import { openOrderWindow } from '@/lib/utils/order-links'
import type { OrderPriority } from '@/lib/types'

type ProcessGroup = 'grafika' | 'druk' | 'introligatornia' | 'ploter' | 'konfekcja' | 'techniczne'

interface ProcessTemplate {
  id: string
  label: string
  group: ProcessGroup
  minutes: number
  selected?: boolean
}

const PROCESS_TEMPLATES: ProcessTemplate[] = [
  { id: 'grafik-files', label: 'Grafik - przygotowanie plikow', group: 'grafika', minutes: 60, selected: true },
  { id: 'grafik-design', label: 'Grafik - projektowanie', group: 'grafika', minutes: 120 },
  { id: 'grafik-urgent', label: 'Grafik - pilna poprawka', group: 'grafika', minutes: 30 },
  { id: 'cut-print', label: 'Krojenie do druku', group: 'druk', minutes: 20, selected: true },
  { id: 'print-one-side', label: 'Druk jednostronny', group: 'druk', minutes: 60, selected: true },
  { id: 'print-two-side', label: 'Druk dwustronny', group: 'druk', minutes: 90 },
  { id: 'large-format', label: 'Druk wielkoformatowy', group: 'druk', minutes: 90 },
  { id: 'cut-finish', label: 'Krojenie do obrobki', group: 'introligatornia', minutes: 25 },
  { id: 'cut-format', label: 'Krojenie do formatu', group: 'introligatornia', minutes: 25, selected: true },
  { id: 'foil-one', label: 'Foliowanie jednostronne', group: 'introligatornia', minutes: 45 },
  { id: 'foil-two', label: 'Foliowanie dwustronne', group: 'introligatornia', minutes: 60 },
  { id: 'creasing', label: 'Bigowanie', group: 'introligatornia', minutes: 40 },
  { id: 'folding', label: 'Falcowanie', group: 'introligatornia', minutes: 40 },
  { id: 'binding-staple', label: 'Oprawa zeszytowa', group: 'introligatornia', minutes: 60 },
  { id: 'external-out', label: 'Obrobka na zewnatrz - wydanie', group: 'introligatornia', minutes: 20 },
  { id: 'external-in', label: 'Obrobka na zewnatrz - przyjecie', group: 'introligatornia', minutes: 20 },
  { id: 'die-cut', label: 'Sztancowanie', group: 'introligatornia', minutes: 60 },
  { id: 'drilling', label: 'Wiercenie', group: 'introligatornia', minutes: 30 },
  { id: 'plotter-table', label: 'Ploter stolowy', group: 'ploter', minutes: 60 },
  { id: 'plotter-roll', label: 'Ploter rolkowy', group: 'ploter', minutes: 60 },
  { id: 'assembly', label: 'Konfekcja', group: 'konfekcja', minutes: 90 },
  { id: 'packing', label: 'Pakowanie', group: 'konfekcja', minutes: 45, selected: true },
  { id: 'glue-simple', label: 'Podklejanie proste', group: 'konfekcja', minutes: 45 },
  { id: 'trimmer', label: 'Trymer', group: 'konfekcja', minutes: 30 },
  { id: 'cooperation-packing', label: 'Pakowanie do kooperacji', group: 'konfekcja', minutes: 35 },
  { id: 'warehouse-work', label: 'Prace magazynowe', group: 'techniczne', minutes: 30 },
  { id: 'cleaning', label: 'Sprzatanie / prace porzadkowe', group: 'techniczne', minutes: 20 },
  { id: 'maintenance', label: 'Konserwacja maszyn / serwis', group: 'techniczne', minutes: 45 },
  { id: 'mount-hard', label: 'Wyklejanie na podlozu twardym', group: 'techniczne', minutes: 60 },
]

const groupLabels: Record<ProcessGroup, string> = {
  grafika: 'Grafika / DTP',
  druk: 'Druk',
  introligatornia: 'Introligatornia',
  ploter: 'Ploter',
  konfekcja: 'Konfekcja',
  techniczne: 'Techniczne',
}

const workTypes = [
  'Grafik - przygotowanie plikow',
  'Grafik - projektowanie',
  'Grafik - pilna poprawka',
  'DTP',
  'Druk offsetowy',
  'Druk cyfrowy',
  'Druk wielkoformatowy',
  'Introligatornia',
  'Pakowanie',
  'Zlecenie produkcyjne',
]

const deliveryMethods = [
  'odbior osobisty',
  'wysylka kurierem',
  'transport MADI',
  'dostawa lokalna',
  'do ustalenia',
]

const colorModes = ['CMYK', 'CMYK + Pantone', '1+0', '1+1', '4+0', '4+4', 'do ustalenia']
const invoiceModes = ['faktura po realizacji', 'proforma', 'gotowka / karta', 'abonament', 'bez faktury na start']
const paymentStatuses = ['do rozliczenia', 'oplacone', 'zaliczka', 'termin platnosci', 'wstrzymane']

const createLocalId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
const today = () => new Date().toISOString().slice(0, 10)
const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char))

function printOrderSheet(data: {
  title: string
  orderNumber: string
  customerName: string
  creatorName: string
  workType: string
  priority: string
  dueDate: string
  quantity: string
  quoteNumber: string
  quotePrice: string
  filesPath: string
  description: string
  productionLines: string[]
  logisticsLines: string[]
  processes: string[]
}) {
  const printWindow = window.open('', '_blank', 'width=980,height=1200')
  if (!printWindow) return
  const rows = [
    ['Nr zlecenia', data.orderNumber || '-'],
    ['Klient', data.customerName || '-'],
    ['Utworzyl(a)', data.creatorName || '-'],
    ['Typ pracy', data.workType],
    ['Priorytet', data.priority],
    ['Termin', data.dueDate || '-'],
    ['Naklad / ilosc', data.quantity || '-'],
    ['Wycena', data.quoteNumber || '-'],
    ['Cena netto', data.quotePrice ? `${data.quotePrice} PLN` : '-'],
    ['Sciezka plikow', data.filesPath || '-'],
  ]
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(data.orderNumber || data.title || 'Zlecenie')}</title><style>
    @page { size: A4; margin: 14mm; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 13px; margin: 18px 0 8px; text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #d1d5db; padding-bottom: 5px; }
    .muted { color: #6b7280; font-size: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; }
    .cell { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; min-height: 38px; }
    .label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 700; margin-bottom: 4px; }
    .value { font-size: 13px; font-weight: 700; white-space: pre-wrap; overflow-wrap: anywhere; }
    .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; white-space: pre-wrap; overflow-wrap: anywhere; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 4px 0; }
  </style></head><body>
    <div class="muted">MADI GRID / ZLECENIE PRODUKCYJNE</div>
    <h1>${escapeHtml(data.title || 'Nowe zlecenie')}</h1>
    <div class="muted">Wygenerowano: ${new Date().toLocaleString('pl-PL')}</div>
    <div class="grid">${rows.map(([label, value]) => `<div class="cell"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`).join('')}</div>
    <h2>Opis / uwagi</h2><div class="box">${escapeHtml(data.description || '-')}</div>
    <h2>Produkcja</h2><ul>${data.productionLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
    <h2>Procesy RCP</h2><ul>${data.processes.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
    <h2>Logistyka</h2><ul>${data.logisticsLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
  </body></html>`)
  printWindow.document.close()
  printWindow.focus()
  window.setTimeout(() => printWindow.print(), 250)
}

export function openNewOrderModal() {
  window.dispatchEvent(new Event('madi:open-new-order'))
}

export function NewOrderModalHost() {
  const { createTask, setActiveTask } = useGridStore()
  const quotes = useQuotesStore((state) => state.quotes)
  const { setCurrentModule } = useAppStore()
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [workType, setWorkType] = useState(workTypes[0])
  const [listId, setListId] = useState('pg-dtp')
  const [status, setStatus] = useState<GridStatusId>('todo')
  const [priority, setPriority] = useState<OrderPriority>('medium')
  const [startDate, setStartDate] = useState(today())
  const [dueDate, setDueDate] = useState(tomorrow())
  const [estimateMinutes, setEstimateMinutes] = useState(120)
  const [quantity, setQuantity] = useState('500')
  const [filesPath, setFilesPath] = useState('')
  const [description, setDescription] = useState('')
  const [selectedQuoteId, setSelectedQuoteId] = useState('')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [quotePrice, setQuotePrice] = useState('')
  const [externalOrderNumber, setExternalOrderNumber] = useState('')
  const [requester, setRequester] = useState('')
  const [finishedFormat, setFinishedFormat] = useState('')
  const [paperMaterial, setPaperMaterial] = useState('')
  const [colorMode, setColorMode] = useState(colorModes[0])
  const [packaging, setPackaging] = useState('standardowo wzorami')
  const [finishingNotes, setFinishingNotes] = useState('')
  const [invoiceMode, setInvoiceMode] = useState(invoiceModes[0])
  const [paymentStatus, setPaymentStatus] = useState(paymentStatuses[0])
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>(
    PROCESS_TEMPLATES.filter((item) => item.selected).map((item) => item.id)
  )
  const [processQuery, setProcessQuery] = useState('')
  const [customProcess, setCustomProcess] = useState('')
  const [timeMode, setTimeMode] = useState<GridTaskTimeMode>('activity')
  const [deliveryMethod, setDeliveryMethod] = useState(deliveryMethods[0])
  const [deliveryDate, setDeliveryDate] = useState(tomorrow())
  const [deliveryHour, setDeliveryHour] = useState('8:00')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [logisticsNotes, setLogisticsNotes] = useState('')
  const [createLogisticsTask, setCreateLogisticsTask] = useState(true)
  const [openAfterCreate, setOpenAfterCreate] = useState(true)
  const [printPdfAfterCreate, setPrintPdfAfterCreate] = useState(false)
  const selectedQuote = selectedQuoteId ? quotes.find((quote) => quote.id === selectedQuoteId) : undefined
  const creatorName = user?.name ?? 'Nieznany uzytkownik'

  useEffect(() => {
    setMounted(true)
    const handler = () => setOpen(true)
    window.addEventListener('madi:open-new-order', handler)
    return () => window.removeEventListener('madi:open-new-order', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const nextList = workType.toLowerCase().includes('grafik') || workType.toLowerCase().includes('dtp') ? 'pg-dtp' : listId
    setListId(nextList)
    setTimeMode(inferGridTaskTimeMode(nextList, workType))
  }, [workType])

  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  useEffect(() => {
    if (!selectedQuote) return
    setQuoteNumber(selectedQuote.number)
    setQuotePrice(String(selectedQuote.netPrice || ''))
    if (!title.trim()) setTitle(selectedQuote.jobName || selectedQuote.product)
    if (!customerName.trim()) setCustomerName(selectedQuote.customer)
    if (!quantity.trim()) setQuantity(String(selectedQuote.quantity))
    if (!filesPath.trim()) setFilesPath(selectedQuote.filesPath)
    if (!description.trim()) setDescription(selectedQuote.notes)
  }, [selectedQuote])

  const filteredProcesses = useMemo(() => {
    const needle = processQuery.trim().toLowerCase()
    if (!needle) return PROCESS_TEMPLATES
    return PROCESS_TEMPLATES.filter((item) => item.label.toLowerCase().includes(needle) || groupLabels[item.group].toLowerCase().includes(needle))
  }, [processQuery])

  const selectedTemplates = PROCESS_TEMPLATES.filter((item) => selectedProcesses.includes(item.id))
  const totalProcessMinutes = selectedTemplates.reduce((sum, item) => sum + item.minutes, 0)

  const toggleProcess = (processId: string) => {
    setSelectedProcesses((current) =>
      current.includes(processId) ? current.filter((item) => item !== processId) : [...current, processId]
    )
  }

  const addCustomProcess = () => {
    const value = customProcess.trim()
    if (!value) return
    const id = `custom:${value}`
    setSelectedProcesses((current) => current.includes(id) ? current : [...current, id])
    setCustomProcess('')
  }

  const buildChecklist = (): GridChecklistItem[] => {
    const templateItems = selectedTemplates.map((item) => ({
      id: createLocalId('chk'),
      label: item.label,
      done: false,
      estimateMinutes: item.minutes,
      trackedMinutes: 0,
      assigneeIds: [],
      rcpEvents: [],
    }))
    const customItems = selectedProcesses
      .filter((id) => id.startsWith('custom:'))
      .map((id) => ({
        id: createLocalId('chk'),
        label: id.replace('custom:', ''),
        done: false,
        estimateMinutes: 30,
        trackedMinutes: 0,
        assigneeIds: [],
        rcpEvents: [],
      }))
    return [...templateItems, ...customItems]
  }

  const resetForm = () => {
    setTitle('')
    setCustomerName('')
    setOrderNumber('')
    setWorkType(workTypes[0])
    setListId('pg-dtp')
    setStatus('todo')
    setPriority('medium')
    setStartDate(today())
    setDueDate(tomorrow())
    setEstimateMinutes(120)
    setQuantity('500')
    setFilesPath('')
    setDescription('')
    setSelectedQuoteId('')
    setQuoteNumber('')
    setQuotePrice('')
    setExternalOrderNumber('')
    setRequester('')
    setFinishedFormat('')
    setPaperMaterial('')
    setColorMode(colorModes[0])
    setPackaging('standardowo wzorami')
    setFinishingNotes('')
    setInvoiceMode(invoiceModes[0])
    setPaymentStatus(paymentStatuses[0])
    setSelectedProcesses(PROCESS_TEMPLATES.filter((item) => item.selected).map((item) => item.id))
    setProcessQuery('')
    setCustomProcess('')
    setTimeMode('activity')
    setDeliveryMethod(deliveryMethods[0])
    setDeliveryDate(tomorrow())
    setDeliveryHour('8:00')
    setDeliveryAddress('')
    setLogisticsNotes('')
    setCreateLogisticsTask(true)
    setPrintPdfAfterCreate(false)
  }

  const submit = () => {
    const checklist = buildChecklist()
    const productionLines = [
      externalOrderNumber.trim() ? `Zewnetrzny nr zamowienia: ${externalOrderNumber.trim()}` : '',
      requester.trim() ? `Zlecajacy / handlowiec: ${requester.trim()}` : '',
      finishedFormat.trim() ? `Format / wymiar: ${finishedFormat.trim()}` : '',
      paperMaterial.trim() ? `Material / surowiec: ${paperMaterial.trim()}` : '',
      `Kolorystyka: ${colorMode}`,
      `Pakowanie: ${packaging}`,
      finishingNotes.trim() ? `Uwagi technologiczne: ${finishingNotes.trim()}` : '',
      `Rozliczenie: ${invoiceMode}`,
      `Platnosc: ${paymentStatus}`,
      `Utworzyl(a): ${creatorName}`,
    ].filter(Boolean)
    const logisticsLines = [
      '--- Logistyka ---',
      `Sposob dostawy: ${deliveryMethod}`,
      `Termin/godzina: ${deliveryDate || 'brak'} ${deliveryHour || ''}`.trim(),
      deliveryAddress.trim() ? `Adres: ${deliveryAddress.trim()}` : '',
      logisticsNotes.trim() ? `Uwagi logistyczne: ${logisticsNotes.trim()}` : '',
    ].filter(Boolean)
    const quoteLines = [
      '--- Wycena ---',
      quoteNumber.trim() ? `Wycena: ${quoteNumber.trim()}` : '',
      quotePrice.trim() ? `Cena z wyceny: ${quotePrice.trim()} PLN` : '',
      selectedQuote?.product ? `Produkt: ${selectedQuote.product}` : '',
    ].filter(Boolean)
    const fullDescription = [
      description.trim(),
      productionLines.length ? ['--- Produkcja / dane zlecenia ---', ...productionLines].join('\n') : '',
      quoteNumber.trim() || quotePrice.trim() || selectedQuote ? quoteLines.join('\n') : '',
      logisticsLines.join('\n'),
    ].filter(Boolean).join('\n\n')
    const tags = [
      quantity.trim() ? `naklad:${quantity.trim()}` : '',
      quoteNumber.trim() ? `wycena:${quoteNumber.trim()}` : '',
      selectedQuoteId ? `quoteId:${selectedQuoteId}` : '',
      quotePrice.trim() ? `cena:${quotePrice.trim()}` : '',
      `logistyka:${deliveryMethod}`,
      deliveryDate ? `dostawa:${deliveryDate} ${deliveryHour}`.trim() : '',
      deliveryAddress.trim() ? `adres:${deliveryAddress.trim()}` : '',
      `utworzyl:${creatorName}`,
      user?.id ? `utworzylId:${user.id}` : '',
      externalOrderNumber.trim() ? `zew:${externalOrderNumber.trim()}` : '',
      requester.trim() ? `zlecajacy:${requester.trim()}` : '',
      finishedFormat.trim() ? `format:${finishedFormat.trim()}` : '',
      packaging.trim() ? `pakowanie:${packaging.trim()}` : '',
    ].filter(Boolean)
    const id = createTask({
      title: title.trim() || 'Nowe zlecenie',
      description: fullDescription,
      customerName: customerName.trim(),
      orderNumber: orderNumber.trim(),
      workType,
      listId,
      status,
      priority,
      startDate,
      dueDate,
      estimateMinutes: Math.max(0, Number(estimateMinutes) || totalProcessMinutes || 60),
      tags,
      filesPath: filesPath.trim(),
      assigneeIds: [],
      checklist,
      timeMode,
    })
    if (createLogisticsTask) {
      createTask({
        title: `Logistyka - ${title.trim() || orderNumber.trim() || 'nowe zlecenie'}`,
        description: [
          `Zlecenie: ${orderNumber.trim() || id}`,
          customerName.trim() ? `Klient: ${customerName.trim()}` : '',
          logisticsLines.join('\n'),
        ].filter(Boolean).join('\n'),
        customerName: customerName.trim(),
        orderNumber: orderNumber.trim() || id,
        workType: 'Logistyka',
        listId: 'transport',
        status: 'todo',
        priority,
        startDate,
        dueDate: deliveryDate || dueDate,
        estimateMinutes: 30,
        tags: ['logistyka', `powiazane:${id}`, deliveryMethod, `utworzyl:${creatorName}`].filter(Boolean),
        assigneeIds: [],
        checklist: [
          { id: createLocalId('chk'), label: 'Potwierdzic sposob dostawy', done: false, estimateMinutes: 10, trackedMinutes: 0, assigneeIds: [], rcpEvents: [] },
          { id: createLocalId('chk'), label: 'Przygotowac dokumenty / etykiety', done: false, estimateMinutes: 10, trackedMinutes: 0, assigneeIds: [], rcpEvents: [] },
          { id: createLocalId('chk'), label: 'Oznaczyc jako odebrane / wyslane', done: false, estimateMinutes: 10, trackedMinutes: 0, assigneeIds: [], rcpEvents: [] },
        ],
        timeMode: 'task',
      })
    }
    if (printPdfAfterCreate) {
      printOrderSheet({
        title: title.trim() || 'Nowe zlecenie',
        orderNumber: orderNumber.trim() || id,
        customerName: customerName.trim(),
        creatorName,
        workType,
        priority,
        dueDate,
        quantity,
        quoteNumber,
        quotePrice,
        filesPath,
        description,
        productionLines,
        logisticsLines,
        processes: checklist.map((item) => item.label),
      })
    }
    setActiveTask(id)
    setCurrentModule('orders')
    setOpen(false)
    if (openAfterCreate) openOrderWindow(id, orderNumber.trim())
    resetForm()
  }

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[7200] bg-background/65 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div
        className="mx-auto flex h-[min(880px,calc(100vh-32px))] w-[min(1320px,calc(100vw-32px))] flex-col overflow-hidden rounded-md border border-border bg-card shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Briefcase size={13} />
              MADI GRID / Zlecenie
            </div>
            <h2 className="truncate text-lg font-semibold">Nowe zlecenie</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Zamknij"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_390px] overflow-hidden">
          <div className="min-h-0 overflow-auto p-4">
            <div className="grid grid-cols-12 gap-3">
              <label className="col-span-12 md:col-span-7">
                <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Nazwa zlecenia</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="np. Ulotki A5 - druk i pakowanie" />
              </label>
              <label className="col-span-12 md:col-span-5">
                <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Klient</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Nazwa firmy" />
              </label>
              <label className="col-span-12 md:col-span-3">
                <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Nr zlecenia</span>
                <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="ZL-2026-..." />
              </label>
              <label className="col-span-12 md:col-span-3">
                <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Typ pracy</span>
                <select value={workType} onChange={(event) => setWorkType(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                  {workTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="col-span-12 md:col-span-3">
                <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Lista</span>
                <select value={listId} onChange={(event) => {
                  setListId(event.target.value)
                  setTimeMode(inferGridTaskTimeMode(event.target.value, workType))
                }} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                  {GRID_LISTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="col-span-12 md:col-span-3">
                <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Priorytet</span>
                <select value={priority} onChange={(event) => setPriority(event.target.value as OrderPriority)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                  <option value="medium">Sredni</option>
                  <option value="high">Wysoki</option>
                  <option value="urgent">Pilne</option>
                  <option value="low">Niski</option>
                </select>
              </label>
              <label className="col-span-6 md:col-span-3">
                <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><Calendar size={12} /> Start</span>
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </label>
              <label className="col-span-6 md:col-span-3">
                <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><Calendar size={12} /> Termin</span>
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </label>
              <label className="col-span-6 md:col-span-3">
                <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><Clock3 size={12} /> Plan min.</span>
                <input type="number" min={0} value={estimateMinutes} onChange={(event) => setEstimateMinutes(Number(event.target.value))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </label>
              <label className="col-span-6 md:col-span-3">
                <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Naklad / ilosc</span>
                <input value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="np. 2500 szt." />
              </label>
              <label className="col-span-12">
                <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground"><FolderOpen size={12} /> Sciezka plikow</span>
                <input value={filesPath} onChange={(event) => setFilesPath(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="X:\\DEMO_ZLECENIA\\Klient\\ZL-..." />
              </label>
              <label className="col-span-12">
                <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Uwagi / opis</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary" placeholder="Specyfikacja, material, format, pakowanie, uwagi klienta..." />
              </label>
            </div>

            <section className="mt-4 rounded-md border border-border bg-background p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Produkcja i rozliczenie</h3>
                  <p className="text-xs text-muted-foreground">Pola trafia do zlecenia i arkusza PDF. Osoby odklikaja prace samodzielnie po wejściu w zadanie.</p>
                </div>
                <span className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Utworzyl(a): {creatorName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Zew. numer zamowienia</span>
                  <input value={externalOrderNumber} onChange={(event) => setExternalOrderNumber(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="np. C3 / mail / PO" />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Zlecajacy / handlowiec</span>
                  <input value={requester} onChange={(event) => setRequester(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="np. Kacper Pilarski" />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Format / wymiar</span>
                  <input value={finishedFormat} onChange={(event) => setFinishedFormat(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="np. A5, 90x50 mm, 320x450" />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Material / surowiec</span>
                  <input value={paperMaterial} onChange={(event) => setPaperMaterial(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="np. kreda 170g, folia mat" />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Kolorystyka</span>
                  <select value={colorMode} onChange={(event) => setColorMode(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                    {colorModes.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Pakowanie</span>
                  <input value={packaging} onChange={(event) => setPackaging(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="standardowo wzorami" />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Rozliczenie</span>
                  <select value={invoiceMode} onChange={(event) => setInvoiceMode(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                    {invoiceModes.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Platnosc</span>
                  <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                    {paymentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="col-span-2">
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Uwagi technologiczne</span>
                  <input value={finishingNotes} onChange={(event) => setFinishingNotes(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="np. proof, akceptacja koloru, osobne paczki, kontrola kompletu..." />
                </label>
              </div>
            </section>

            <section className="mt-4 rounded-md border border-border bg-background p-3">
              <div className="mb-3 flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">Wycena</h3>
                  <p className="text-xs text-muted-foreground">Powiaz wycene z tworzonym zleceniem albo wpisz numer recznie.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2">
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Wybierz z listy wycen</span>
                  <select
                    value={selectedQuoteId}
                    onChange={(event) => setSelectedQuoteId(event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Bez przypisanej wyceny</option>
                    {quotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.number} - {quote.customer} - {quote.product} - {quote.netPrice} PLN
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Numer wyceny</span>
                  <input value={quoteNumber} onChange={(event) => setQuoteNumber(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="MAD/2026/..." />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Cena netto</span>
                  <input value={quotePrice} onChange={(event) => setQuotePrice(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="PLN" />
                </label>
              </div>
            </section>

            <section className="mt-4 rounded-md border border-border bg-background p-3">
              <div className="mb-3 flex items-center gap-2">
                <Truck size={16} className="text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">Logistyka</h3>
                  <p className="text-xs text-muted-foreground">Te dane trafia do zlecenia i opcjonalnie utworza zadanie Transporty.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2 sm:col-span-1">
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Sposob dostawy</span>
                  <select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                    {deliveryMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Godzina</span>
                  <input value={deliveryHour} onChange={(event) => setDeliveryHour(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="8:00" />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Data dostawy / odbioru</span>
                  <input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Adres / miejsce</span>
                  <input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="adres, recepcja, magazyn..." />
                </label>
                <label className="col-span-2">
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Uwagi logistyczne</span>
                  <input value={logisticsNotes} onChange={(event) => setLogisticsNotes(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="np. awizacja, telefon, paleta, pobranie..." />
                </label>
                <label className="col-span-2 flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={createLogisticsTask} onChange={(event) => setCreateLogisticsTask(event.target.checked)} />
                  Utworz osobne zadanie w Logistyka / Transporty
                </label>
              </div>
            </section>

            <section className="mt-4 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
              <h3 className="text-sm font-semibold">Odklikiwanie pracy</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Zlecenie startuje bez przypisanych osob. Pracownik wybiera siebie w oknie zlecenia i odklikuje dana czynnosc w RCP.
                Autor zlecenia zostanie zapisany jako: <span className="font-semibold text-foreground">{creatorName}</span>.
              </p>
            </section>
          </div>

          <aside className="flex min-h-0 flex-col border-l border-border bg-muted/20">
            <div className="border-b border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Procesy / RCP</h3>
                  <p className="text-xs text-muted-foreground">{selectedProcesses.length} wybrane, plan {totalProcessMinutes} min</p>
                </div>
                <select value={timeMode} onChange={(event) => setTimeMode(event.target.value as GridTaskTimeMode)} className="h-9 rounded-md border border-border bg-background px-2 text-xs">
                  <option value="activity">Czas kazdej czynnosci</option>
                  <option value="task">Czas calego zlecenia</option>
                </select>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                <Search size={15} className="text-muted-foreground" />
                <input value={processQuery} onChange={(event) => setProcessQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Szukaj procesu..." />
              </div>
              <div className="mt-2 flex gap-2">
                <input value={customProcess} onChange={(event) => setCustomProcess(event.target.value)} onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addCustomProcess()
                  }
                }} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary" placeholder="Dodaj wlasna czynnosc" />
                <button onClick={addCustomProcess} className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90" title="Dodaj proces">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {Object.entries(groupLabels).map(([group, label]) => {
                const groupItems = filteredProcesses.filter((item) => item.group === group)
                if (!groupItems.length) return null
                return (
                  <details key={group} open className="mb-3 rounded-md border border-border bg-background">
                    <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                      {label}
                      <ChevronDown size={14} />
                    </summary>
                    <div className="space-y-1 border-t border-border p-2">
                      {groupItems.map((item) => {
                        const active = selectedProcesses.includes(item.id)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleProcess(item.id)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-all ${
                              active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                            }`}
                          >
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                              {active && <Check size={13} />}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            <span className="text-[11px] text-muted-foreground">{item.minutes}m</span>
                          </button>
                        )
                      })}
                    </div>
                  </details>
                )
              })}
              {selectedProcesses.filter((id) => id.startsWith('custom:')).length > 0 && (
                <div className="rounded-md border border-dashed border-primary/50 bg-primary/5 p-2">
                  <p className="mb-1 text-xs font-semibold text-primary">Wlasne procesy</p>
                  {selectedProcesses.filter((id) => id.startsWith('custom:')).map((id) => (
                    <button key={id} onClick={() => toggleProcess(id)} className="mb-1 flex w-full items-center justify-between rounded bg-background px-2 py-1.5 text-left text-sm hover:bg-muted">
                      <span className="truncate">{id.replace('custom:', '')}</span>
                      <X size={13} className="text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border p-3">
              <label className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={openAfterCreate} onChange={(event) => setOpenAfterCreate(event.target.checked)} />
                Otworz okno zlecenia po utworzeniu
              </label>
              <label className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={printPdfAfterCreate} onChange={(event) => setPrintPdfAfterCreate(event.target.checked)} />
                <Printer size={13} />
                Generuj arkusz zlecenia PDF / druk
              </label>
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className="h-10 flex-1 rounded-md border border-border px-3 text-sm hover:bg-muted">Anuluj</button>
                <button onClick={submit} className="h-10 flex-1 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Utworz zlecenie</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body
  )
}
