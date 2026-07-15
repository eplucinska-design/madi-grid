'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  Package,
  Pause,
  Play,
  Printer,
  Search,
  Square,
  User,
  X,
} from 'lucide-react'
import { DEMO_USERS } from '@/lib/store/auth-store'
import { type GridRcpEventType, type GridRcpMode, type GridTask, useGridStore } from '@/lib/store/grid-store'
import { PRIORITY_CONFIG, STAGE_CONFIG, STATUS_CONFIG, useOrdersStore } from '@/lib/store/orders-store'
import type { Order, OrderStatus, ProductionStage } from '@/lib/types'
import { openStandaloneOrderWindow } from '@/lib/utils/order-links'

interface OrderWorkWindowProps {
  orderId: string
  variant?: 'page' | 'modal'
  onClose?: () => void
}

interface WorkerRow {
  id: string
  name: string
  role: string
  initials: string
  color: string
  active?: boolean
}

interface OperationRow {
  id: string
  number: string
  status: 'done' | 'running' | 'waiting'
  machine: string
  done: number
  total: number
  missing: number
  workerNotes: string
  product: string
}

interface DetailData {
  operationTitle: string
  machine: string
  packaging: string
  size: string
  externalNumber: string
  author: string
  requester: string
  fileName: string
  confirmDate: string
  deliveryMethod: string
  deliveryHour: string
  filePath: string
  rawMaterials: Array<{ name: string; amount: string }>
  notes: string[]
  parameters: string[]
  previousOperations: OperationRow[]
  relatedOperations: OperationRow[]
}

const GRID_STATUS_TO_ORDER_STATUS: Record<GridTask['status'], OrderStatus> = {
  backlog: 'waiting_for_files',
  todo: 'ready_for_production',
  in_progress: 'in_production',
  review: 'verification',
  production: 'in_production',
  blocked: 'on_hold',
  done: 'completed',
}

function gridTaskStage(task: GridTask): ProductionStage {
  const normalized = `${task.listId} ${task.workType}`.toLowerCase()
  if (normalized.includes('dtp') || normalized.includes('prepress') || normalized.includes('graf')) return 'prepress'
  if (normalized.includes('intro') || normalized.includes('introligator')) return 'finishing'
  if (normalized.includes('transport') || normalized.includes('logist')) return 'shipping'
  if (normalized.includes('druk') || normalized.includes('print') || normalized.includes('produkc')) return 'printing'
  return 'files'
}

function tagValue(tags: string[], prefix: string) {
  const tag = tags.find((item) => item.toLowerCase().startsWith(prefix.toLowerCase()))
  return tag ? tag.slice(prefix.length).trim() : ''
}

function numberTagValue(tags: string[], prefix: string) {
  const value = tagValue(tags, prefix).replace(',', '.').replace(/[^\d.]/g, '')
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function gridTaskToOrder(task: GridTask): Order {
  const dueDate = task.dueDate ? new Date(`${task.dueDate}T12:00:00`) : new Date()
  const quantity = numberTagValue(task.tags, 'naklad:') ?? 1000
  return {
    id: task.id,
    orderNumber: task.orderNumber || task.id,
    title: task.title,
    description: task.description,
    customerId: task.customerName || task.id,
    customerName: task.customerName || 'Klient do uzupelnienia',
    status: GRID_STATUS_TO_ORDER_STATUS[task.status],
    priority: task.priority,
    stage: gridTaskStage(task),
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
    dueDate,
    assignedTo: task.assigneeIds,
    department: task.workType || 'Produkcja',
    product: task.title,
    quantity,
    specifications: task.description || task.tags.join(', '),
    files: [],
    timeEntries: [],
    estimatedTime: task.estimateMinutes,
    actualTime: task.trackedMinutes,
    comments: task.comments.map((comment) => ({
      id: comment.id,
      userId: comment.authorId,
      userName: comment.authorName,
      userInitials: comment.authorName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      userAvatarColor: '#339af0',
      content: comment.content,
      createdAt: new Date(comment.createdAt),
      isInternal: true,
    })),
    tags: task.tags,
    quotedPrice: numberTagValue(task.tags, 'cena:'),
  }
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}:00`
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min`
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

function formatRcpDate(value: string) {
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function normalizeLookup(value?: string) {
  return decodeURIComponent(value ?? '')
    .trim()
    .toLowerCase()
}

function digitsOnly(value?: string) {
  return (value ?? '').replace(/\D/g, '')
}

function copyText(value: string) {
  if (typeof navigator === 'undefined') return
  navigator.clipboard?.writeText(value)
}

function makeDetailData(order: Order): DetailData {
  const deliveryMethod = tagValue(order.tags, 'logistyka:') || (order.stage === 'shipping' ? 'wysylka kurierem' : 'odbior osobisty')
  const deliveryDateRaw = tagValue(order.tags, 'dostawa:')
  const deliveryAddress = tagValue(order.tags, 'adres:')
  const deliveryHour = deliveryDateRaw.split(' ').slice(1).join(' ') || '8:00'
  const quoteNumber = tagValue(order.tags, 'wycena:')
  const creatorName = tagValue(order.tags, 'utworzyl:') || 'MADI GRID'
  const requesterName = tagValue(order.tags, 'zlecajacy:') || 'Do uzupelnienia'
  const externalNumber = tagValue(order.tags, 'zew:') || order.customerId.toUpperCase()
  const customFormat = tagValue(order.tags, 'format:')
  const packagingMode = tagValue(order.tags, 'pakowanie:')
  const sizeByStage: Record<ProductionStage, string> = {
    files: 'plik produkcyjny',
    prepress: 'preflight / impozycja',
    approval: 'akceptacja klienta',
    printing: '320x450 mm',
    finishing: 'po druku',
    quality_check: 'kontrola kompletu',
    packaging: 'standardowo wzorami',
    shipping: 'pakowanie zbiorcze',
  }
  const operations: OperationRow[] = [
    {
      id: `${order.id}-prev-1`,
      number: `1/${order.orderNumber.replace('ZL-', '')}`,
      status: 'done',
      machine: order.stage === 'printing' ? 'Prepress / impozycja' : 'Krojenie do formatu',
      done: order.quantity,
      total: order.quantity,
      missing: 0,
      workerNotes: 'OK',
      product: order.product,
    },
    {
      id: `${order.id}-current`,
      number: `2/${order.orderNumber.replace('ZL-', '')}`,
      status: order.status === 'in_production' ? 'running' : 'waiting',
      machine: order.department,
      done: order.status === 'completed' ? order.quantity : Math.min(order.quantity, Math.round(order.quantity * 0.35)),
      total: order.quantity,
      missing: order.status === 'completed' ? 0 : Math.max(0, order.quantity - Math.round(order.quantity * 0.35)),
      workerNotes: order.status === 'on_hold' ? 'Wstrzymane - wymaga decyzji' : '',
      product: order.product,
    },
    {
      id: `${order.id}-next-1`,
      number: `3/${order.orderNumber.replace('ZL-', '')}`,
      status: 'waiting',
      machine: order.stage === 'packaging' ? 'Wysylka' : 'Pakowanie',
      done: 0,
      total: order.quantity,
      missing: order.quantity,
      workerNotes: '',
      product: order.product,
    },
  ]

  return {
    operationTitle: `${order.product} - start/stop pracy`,
    machine: order.department || 'Produkcja',
    packaging: packagingMode || (order.stage === 'packaging' || order.stage === 'shipping' ? 'karton zbiorczy' : 'standardowo wzorami'),
    size: customFormat || sizeByStage[order.stage] || 'wg specyfikacji',
    externalNumber,
    author: creatorName,
    requester: requesterName,
    fileName: order.files.length ? order.files.map((file) => file.name).join(', ') : `${order.product} - pliki produkcyjne`,
    confirmDate: formatDateTime(order.updatedAt),
    deliveryMethod: deliveryAddress ? `${deliveryMethod} - ${deliveryAddress}` : deliveryMethod,
    deliveryHour,
    filePath: `X:\\ZLECENIA\\${order.customerName}\\${order.orderNumber}\\${order.product}`,
    rawMaterials: [
      { name: order.specifications || 'Material wg specyfikacji', amount: `${Math.max(1, Math.round(order.quantity / 320))} ark.` },
      { name: 'Karton / przekladki / etykiety logistyczne', amount: `${Math.max(1, Math.ceil(order.quantity / 1000))} kpl.` },
    ],
    notes: [
      order.description || 'Brak opisu handlowego.',
      `Naklad: ${order.quantity.toLocaleString('pl-PL')} szt.`,
      `Specyfikacja: ${order.specifications || 'do uzupelnienia'}`,
      `Priorytet: ${PRIORITY_CONFIG[order.priority].label}`,
      `Termin: ${formatDate(order.dueDate)}`,
      quoteNumber ? `Wycena: ${quoteNumber}` : '',
    ],
    parameters: [
      `Status: ${STATUS_CONFIG[order.status].label}`,
      `Etap: ${STAGE_CONFIG[order.stage].label}`,
      `Czas planowany: ${formatMinutes(order.estimatedTime)}`,
      `Czas wykonany: ${formatMinutes(order.actualTime)}`,
      `Cena: ${(order.finalPrice ?? order.quotedPrice ?? 0).toLocaleString('pl-PL')} PLN`,
    ],
    previousOperations: operations.slice(0, 1),
    relatedOperations: operations,
  }
}

function WorkerList({
  workers,
  selectedWorkerId,
  onSelect,
}: {
  workers: WorkerRow[]
  selectedWorkerId: string
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const filteredWorkers = normalizedQuery
    ? workers.filter((worker) =>
        `${worker.name} ${worker.role} ${worker.initials}`.toLowerCase().includes(normalizedQuery)
      )
    : workers

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3">
        <p className="text-sm font-semibold text-foreground">Zespół</p>
        <label className="mt-3 block text-xs text-muted-foreground">
          Wyszukaj pracownika
          <div className="mt-2 flex h-9 items-center gap-2 rounded-md border border-border bg-background px-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
              placeholder="Imie, dzial..."
            />
          </div>
        </label>
      </div>
      <div data-order-worker-list className="madi-scroll-area min-h-0 flex-1">
        {filteredWorkers.map((worker) => (
          <button
            key={worker.id}
            data-order-worker-button={worker.id}
            onClick={() => onSelect(worker.id)}
            className={`flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors ${
              selectedWorkerId === worker.id ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/40'
            }`}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: worker.color }}
            >
              {worker.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{worker.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {worker.role}
              </span>
            </span>
          </button>
        ))}
        {filteredWorkers.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Brak pracownikow</p>
        )}
      </div>
    </aside>
  )
}

function FieldPill({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/80 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="min-w-0 break-words text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" title={label}>
          {label}
        </span>
        {copyable && (
          <button onClick={() => copyText(value)} className="shrink-0 text-muted-foreground hover:text-primary" title="Kopiuj">
            <Copy size={14} />
          </button>
        )}
      </div>
      {copyable && (
        <span className="sr-only">Mozna skopiowac</span>
      )}
      <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-snug text-foreground">{value || '-'}</p>
    </div>
  )
}

function WorkerPunchPanel({
  worker,
  order,
  running,
  actualTime,
  pin,
  onPinChange,
  onStartStop,
  onFinish,
  onClose,
}: {
  worker?: WorkerRow
  order: Order
  running: boolean
  actualTime: number
  pin: string
  onPinChange: (value: string) => void
  onStartStop: (mode?: GridRcpMode, code?: string) => void
  onFinish: () => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<GridRcpMode>('manual')
  const selectedWorker = worker ?? {
    id: 'operator',
    name: 'Operator',
    role: 'Produkcja',
    initials: 'OP',
    color: '#339af0',
  }
  const modeHint: Record<GridRcpMode, string> = {
    manual: 'Wpisz PIN albo numer operatora.',
    scanner: 'Zeskanuj kod pracownika albo kod operacji.',
    card: 'Przyloz karte / brelok operatora.',
    beacon: 'Odczyt nadajnika zostanie dopisany do RCP.',
  }

  return (
    <section data-worker-punch-panel className="min-h-0 flex-1 overflow-y-auto bg-background p-6">
      <div className="mx-auto max-w-[980px]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              Wybrany pracownik: <span className="font-semibold text-foreground">{selectedWorker.name}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {order.orderNumber} - {order.product} - {order.customerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Wroc do szczegolow zlecenia"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-md border border-border bg-card p-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-base font-bold text-white"
              style={{ background: selectedWorker.color }}
            >
              {selectedWorker.initials}
            </span>
            <p className="mt-3 text-lg font-semibold text-foreground">{selectedWorker.name}</p>
            <p className="text-sm text-muted-foreground">{selectedWorker.role}</p>
            <div className="mt-4 rounded-md border border-border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status RCP</p>
              <p className={`mt-1 text-sm font-semibold ${running ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                {running ? 'Praca w toku' : 'Gotowy do startu'}
              </p>
            </div>
            <div className="mt-3 rounded-md border border-border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Czas zlecenia</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">{formatMinutes(actualTime)}</p>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {([
                ['manual', 'PIN'],
                ['scanner', 'Skaner'],
                ['card', 'Karta'],
                ['beacon', 'Nadajnik'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`h-8 rounded-md border px-3 text-xs font-semibold transition-colors ${
                    mode === value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs text-muted-foreground">{modeHint[mode]}</p>
            <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
              <label className="space-y-2 text-sm font-medium text-foreground">
                PIN
                <input
                  value={pin}
                  onChange={(event) => onPinChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onStartStop(mode, pin)
                  }}
                  className="h-[72px] w-full rounded-md border border-border bg-background px-4 text-center font-mono text-xl outline-none focus:border-primary"
                  autoFocus
                />
              </label>
              <button
                onClick={() => onStartStop(mode, pin)}
                className={`flex h-[72px] items-center justify-center rounded-md border text-xl font-bold tracking-wide transition-colors ${
                  running
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300'
                    : 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {running ? 'STOP' : 'START'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={onFinish}
                className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <Check size={16} />
                Zakoncz operacje
              </button>
              <button
                onClick={onClose}
                className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Szczegoly zlecenia
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatusDot({ status }: { status: OperationRow['status'] }) {
  if (status === 'done') return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={15} /></span>
  if (status === 'running') return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"><Play size={13} /></span>
  return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground"><Square size={12} /></span>
}

function OperationsTable({
  title,
  rows,
  editable = false,
  onToggleOperation,
  onFinishOperation,
}: {
  title: string
  rows: OperationRow[]
  editable?: boolean
  onToggleOperation?: (row: OperationRow) => void
  onFinishOperation?: (row: OperationRow) => void
}) {
  return (
    <section className="mt-5">
      <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
              <th className="px-2 py-2">Nr zlecenia</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Maszyna</th>
              <th className="px-2 py-2">Gotowe</th>
              <th className="px-2 py-2">Braki</th>
              <th className="px-2 py-2">Uwagi pracownika</th>
              <th className="px-2 py-2">Produkt</th>
              {editable && <th className="px-2 py-2">RCP etapu</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                <td className="px-2 py-2 font-mono">{row.number}</td>
                <td className="px-2 py-2"><StatusDot status={row.status} /></td>
                <td className="px-2 py-2">{row.machine}</td>
                <td className="px-2 py-2">{row.done}/{row.total} szt.</td>
                <td className="px-2 py-2">{row.missing ? `${row.missing} szt.` : ''}</td>
                <td className="px-2 py-2">{row.workerNotes}</td>
                <td className="px-2 py-2">{row.product}</td>
                {editable && (
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleOperation?.(row)}
                        disabled={row.status === 'done'}
                        className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                          row.status === 'running'
                            ? 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                        title={row.status === 'running' ? 'Zatrzymaj czas tego etapu' : 'Start czasu tego etapu'}
                      >
                        {row.status === 'running' ? <Pause size={13} /> : <Play size={13} />}
                        {row.status === 'running' ? 'Stop' : 'Start'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onFinishOperation?.(row)}
                        disabled={row.status === 'done'}
                        className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
                        title="Oznacz etap jako wykonany"
                      >
                        <Check size={13} />
                        Gotowe
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function RightStatusPanel({
  order,
  gridTask,
  selectedWorker,
  running,
  actualTime,
  onStartStop,
  onFinish,
  onManualTime,
}: {
  order: Order
  gridTask?: GridTask
  selectedWorker?: WorkerRow
  running: boolean
  actualTime: number
  onStartStop: () => void
  onFinish: () => void
  onManualTime: (minutes: number) => void
}) {
  const [manualMinutes, setManualMinutes] = useState('')
  const timeProgress = order.estimatedTime > 0 ? Math.min((actualTime / order.estimatedTime) * 100, 100) : 0
  const done = order.status === 'completed' ? order.quantity : Math.min(order.quantity, Math.round(order.quantity * (timeProgress / 100)))
  const left = Math.max(order.quantity - done, 0)
  const progress = order.quantity > 0 ? Math.min((done / order.quantity) * 100, 100) : 0
  const rcpTypeLabels = {
    start: 'Start pracy',
    pause: 'Pauza',
    stop: 'Stop pracy',
    finish: 'Zakonczono',
    manual: 'Dopisano czas',
  }
  const history = [...(gridTask?.rcpEvents ?? [])].reverse().slice(0, 8)
  const submitManualTime = () => {
    const minutes = Number.parseInt(manualMinutes, 10)
    if (!Number.isFinite(minutes) || minutes <= 0) return
    onManualTime(minutes)
    setManualMinutes('')
  }

  return (
    <aside className="madi-scroll-area flex h-full min-h-0 min-w-0 flex-col border-l border-border bg-card p-4 max-xl:col-span-2 max-xl:max-h-[360px] max-xl:border-l-0 max-xl:border-t">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Aktywność / RCP</p>
          <p className="text-[11px] text-muted-foreground">Postęp, czas pracy i historia operacji</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
          running ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
        }`}>
          {running ? 'W toku' : 'Gotowe do startu'}
        </span>
      </div>

      <div className="rounded-md border border-border bg-background p-4">
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-muted-foreground">Gotowe / zlecone</span>
          <span>{done}/{order.quantity} szt.</span>
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Pozostało</span>
          <span>{left} szt.</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-3 rounded-md border border-border bg-background p-4">
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-muted-foreground">Czas</span>
          <span>{formatMinutes(actualTime)}</span>
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Plan</span>
          <span>{formatMinutes(order.estimatedTime)}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${timeProgress}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={onStartStop}
          className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold ${
            running ? 'bg-muted text-foreground hover:bg-muted/80' : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? 'Stop pracy' : 'Start pracy'}
        </button>
        <button
          onClick={onFinish}
          className="flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-semibold text-foreground hover:bg-muted"
        >
          <Check size={16} />
          Zakończ
        </button>
      </div>

      <div className="mt-3 rounded-md border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Dopisz czas recznie
          </label>
          <span className="truncate text-[11px] text-muted-foreground" title={selectedWorker?.name}>
            {selectedWorker?.name ?? 'Operator'}
          </span>
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            min={1}
            value={manualMinutes}
            onChange={(event) => setManualMinutes(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitManualTime()
            }}
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            placeholder="min"
          />
          <button
            onClick={submitManualTime}
            className="h-9 rounded-md bg-muted px-3 text-xs font-semibold text-foreground hover:bg-muted/80"
          >
            Zapisz
          </button>
        </div>
      </div>

      <section className="mt-5 min-h-[180px]">
        <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historia wykonania</h2>
        <div className="relative mt-4 space-y-3 pl-7">
          <span className="absolute bottom-2 left-2 top-2 border-l border-dashed border-border" />
          {history.length === 0 && (
            <div className="rounded-md border border-dashed border-border bg-background px-4 py-5 text-center text-xs text-muted-foreground">
              Brak odklikanych czynnosci
            </div>
          )}
          {history.map((entry) => (
            <div key={entry.id} className="relative rounded-md border border-border bg-background px-4 py-3">
              <span className="absolute -left-[31px] top-3 h-4 w-4 rounded-full border-2 border-primary bg-background" />
              <p className="text-xs font-semibold text-foreground">
                {rcpTypeLabels[entry.type]}{entry.minutesDelta ? ` - ${formatDuration(entry.minutesDelta)}` : ''}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{formatRcpDate(entry.createdAt)}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{entry.userName}</p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}

export function OrderWorkWindow({ orderId, variant = 'page', onClose }: OrderWorkWindowProps) {
  const { orders, updateOrder } = useOrdersStore()
  const { tasks, updateTask, addRcpEvent } = useGridStore()
  const isModal = variant === 'modal'
  const lookup = normalizeLookup(orderId)
  const lookupDigits = digitsOnly(lookup)
  const directOrder = orders.find((item) => {
    const orderNumber = normalizeLookup(item.orderNumber)
    return item.id === lookup || orderNumber === lookup || (!!lookupDigits && digitsOnly(orderNumber).endsWith(lookupDigits))
  })
  const gridTask = tasks.find((item) => {
    const orderNumber = normalizeLookup(item.orderNumber)
    return item.id === lookup || orderNumber === lookup || (!!lookupDigits && digitsOnly(orderNumber).endsWith(lookupDigits))
  })
  const linkedOrder = directOrder ?? (gridTask?.orderNumber ? orders.find((item) => item.orderNumber === gridTask.orderNumber) : undefined)
  const order = useMemo(() => linkedOrder ?? (gridTask ? gridTaskToOrder(gridTask) : undefined), [gridTask, linkedOrder])
  const [selectedWorkerId, setSelectedWorkerId] = useState(order?.assignedTo[0] ?? DEMO_USERS[0]?.id ?? '1')
  const [workerPunchOpen, setWorkerPunchOpen] = useState(false)
  const [workerPin, setWorkerPin] = useState('')
  const [running, setRunning] = useState(order?.status === 'in_production')
  const [startedAt, setStartedAt] = useState<Date | null>(order?.status === 'in_production' ? new Date() : null)
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null)
  const [operationOverrides, setOperationOverrides] = useState<Record<string, Partial<OperationRow>>>({})
  const [, setTimerTick] = useState(0)
  const detail = useMemo(() => (order ? makeDetailData(order) : null), [order])

  useEffect(() => {
    if (!running) return
    const intervalId = window.setInterval(() => setTimerTick((tick) => tick + 1), 1000)
    return () => window.clearInterval(intervalId)
  }, [running])

  const workers: WorkerRow[] = DEMO_USERS.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.department || user.role,
    initials: user.initials,
    color: user.avatarColor,
    active: order?.assignedTo.includes(user.id),
  }))
  const selectedWorker = workers.find((worker) => worker.id === selectedWorkerId)
  const liveMinutes = running && startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 60000) : 0
  const actualTime = (order?.actualTime ?? 0) + liveMinutes
  const closeWindow = () => {
    if (onClose) {
      onClose()
      return
    }
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    window.close()
  }

  if (!order || !detail) {
    const notFound = (
      <div className="rounded-md border border-border bg-card p-8 text-center shadow-xl">
          <FileText size={34} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-semibold">Nie znaleziono zlecenia</p>
          <p className="mt-1 text-sm text-muted-foreground">ID / numer: {decodeURIComponent(orderId)}</p>
          <button onClick={closeWindow} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Zamknij
          </button>
        </div>
    )

    if (isModal) {
      return (
        <section className="flex h-[min(360px,calc(100vh-48px))] w-[min(520px,calc(100vw-48px))] items-center justify-center rounded-md border border-border bg-background shadow-2xl">
          {notFound}
        </section>
      )
    }

    return (
      <main className="flex h-screen items-center justify-center bg-background p-4 text-foreground">
        {notFound}
      </main>
    )
  }

  const toggleRunning = (mode: GridRcpMode = 'manual', code?: string) => {
    const next = !running
    const operator = selectedWorker ?? workers[0]
    const sessionMinutes = startedAt ? Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000)) : 1
    setRunning(next)
    setStartedAt(next ? new Date() : null)

    if (linkedOrder && next) {
      updateOrder(linkedOrder.id, {
        status: 'in_production',
      })
    }
    if (linkedOrder && !next) {
      updateOrder(linkedOrder.id, {
        actualTime: order.actualTime + sessionMinutes,
      })
    }
    if (gridTask) {
      if (next) updateTask(gridTask.id, { status: 'in_progress' })
      addRcpEvent(gridTask.id, {
        type: next ? 'start' : 'stop',
        mode,
        userId: operator?.id ?? selectedWorkerId,
        userName: operator?.name ?? 'Operator',
        code: code?.trim() || undefined,
        minutesDelta: next ? 0 : sessionMinutes,
      })
    }
  }

  const addRcp = (type: GridRcpEventType, minutesDelta: number, mode: GridRcpMode = 'manual', code?: string) => {
    const operator = selectedWorker ?? workers[0]
    if (gridTask) {
      addRcpEvent(gridTask.id, {
        type,
        mode,
        userId: operator?.id ?? selectedWorkerId,
        userName: operator?.name ?? 'Operator',
        code: code?.trim() || undefined,
        minutesDelta,
      })
    }
  }

  const finishOrder = () => {
    const sessionMinutes = running && startedAt ? Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000)) : 0
    setRunning(false)
    setStartedAt(null)
    if (linkedOrder) {
      updateOrder(linkedOrder.id, {
        status: 'completed',
        actualTime: order.actualTime + sessionMinutes,
      })
    }
    if (gridTask) {
      updateTask(gridTask.id, { status: 'done' })
    }
    addRcp('finish', sessionMinutes)
  }

  const addManualTime = (minutes: number) => {
    if (linkedOrder) {
      updateOrder(linkedOrder.id, {
        actualTime: order.actualTime + minutes,
      })
    }
    addRcp('manual', minutes)
  }

  const relatedOperations = detail.relatedOperations.map((row) => ({
    ...row,
    ...operationOverrides[row.id],
    status: activeOperationId === row.id ? 'running' as const : (operationOverrides[row.id]?.status ?? row.status),
  }))

  const toggleOperation = (row: OperationRow) => {
    const isRunningOperation = activeOperationId === row.id
    const minutesDelta = isRunningOperation ? 1 : 0
    setActiveOperationId(isRunningOperation ? null : row.id)
    setOperationOverrides((current) => ({
      ...current,
      [row.id]: {
        ...current[row.id],
        status: isRunningOperation ? 'waiting' : 'running',
        workerNotes: isRunningOperation ? `Stop: ${row.machine}` : `Start: ${row.machine}`,
      },
    }))
    addRcp(isRunningOperation ? 'stop' : 'start', minutesDelta, 'manual', row.machine)
    if (!isRunningOperation && gridTask) updateTask(gridTask.id, { status: 'in_progress' })
  }

  const finishOperation = (row: OperationRow) => {
    setActiveOperationId((current) => (current === row.id ? null : current))
    setOperationOverrides((current) => ({
      ...current,
      [row.id]: {
        ...current[row.id],
        status: 'done',
        done: row.total,
        missing: 0,
        workerNotes: `Zakonczono: ${row.machine}`,
      },
    }))
    addRcp('finish', 1, 'manual', row.machine)
  }

  const windowFrame = (
    <section
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-background shadow-2xl ${
        isModal
          ? 'h-[min(920px,calc(100vh-32px))] max-h-[calc(100vh-32px)] w-[min(1680px,calc(100vw-32px))]'
          : 'h-[min(900px,calc(100vh-24px))] max-h-[calc(100vh-24px)] w-[min(1600px,calc(100vw-24px))]'
      }`}
    >
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <span>MADI GRID</span>
            <span>/</span>
            <span className="min-w-0 max-w-[42vw] truncate" title={order.department}>{order.department}</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">Zlecenie</span>
          </div>
          <h1 className="line-clamp-2 text-lg font-bold leading-tight">{detail.operationTitle}</h1>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
            {order.orderNumber} - {order.customerName} - {STATUS_CONFIG[order.status].label}
          </p>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          {!isModal && (
            <button onClick={() => window.history.back()} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground" title="Wroc">
              <ArrowLeft size={18} />
            </button>
          )}
          <button onClick={() => openStandaloneOrderWindow(order.id, order.orderNumber)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground" title="Otworz jako osobne okno">
            <ExternalLink size={18} />
          </button>
          <button
            onClick={closeWindow}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"
            title="Zamknij"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <div className="grid h-0 min-h-0 flex-1 grid-cols-[minmax(190px,220px)_minmax(420px,1fr)_minmax(300px,360px)] overflow-hidden max-xl:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
        <WorkerList
          workers={workers}
          selectedWorkerId={selectedWorkerId}
          onSelect={(workerId) => {
            setSelectedWorkerId(workerId)
            setWorkerPin('')
            setWorkerPunchOpen(true)
          }}
        />

        <div className="flex h-full min-h-0 min-w-0 overflow-hidden">
          {workerPunchOpen ? (
            <WorkerPunchPanel
              worker={selectedWorker}
              order={order}
              running={running}
              actualTime={actualTime}
              pin={workerPin}
              onPinChange={setWorkerPin}
              onStartStop={(mode, code) => toggleRunning(mode, code)}
              onFinish={finishOrder}
              onClose={() => setWorkerPunchOpen(false)}
            />
          ) : (
        <section data-order-detail-scroll className="madi-scroll-area h-full min-h-0 min-w-0 flex-1 bg-background p-4 pb-12">
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr))]">
              <FieldPill label="Numer zlecenia" value={order.orderNumber.replace('ZL-', '')} />
              <FieldPill label="Maszyna / Operacja" value={detail.machine} />
              <FieldPill label="Zew numer zamowienia" value={detail.externalNumber} />
              <FieldPill label="Na kiedy?" value={formatDate(order.dueDate)} />
              <FieldPill label="Klient" value={order.customerName} />
              <FieldPill label="Utworzyl(a)" value={detail.author} />
              <FieldPill label="Wymiar" value={detail.size} />
              <FieldPill label="Sposob pakowania" value={detail.packaging} />
              <FieldPill label="Priorytet" value={PRIORITY_CONFIG[order.priority].label} />
              <FieldPill label="Etap" value={STAGE_CONFIG[order.stage].label} />
              <FieldPill label="Zlecajacy" value={detail.requester} />
          </div>

          <section className="mt-7 rounded-md border border-border bg-card p-3">
            <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uwagi</h2>
            <div className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-foreground">
              {detail.notes.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>

          <section className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
            <div className="min-w-0">
              <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dodatkowe pola do produktu</h2>
              <div className="mt-3 space-y-2">
                <FieldPill label="Nazwa pliku" value={detail.fileName} copyable />
                <FieldPill label="Zamawiajacy" value={detail.requester} copyable />
                <FieldPill label="Data potwierdzenia" value={detail.confirmDate} copyable />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dodatkowe pola do zamowienia</h2>
              <div className="mt-3 space-y-2">
                <FieldPill label="Sciezka zamowienia" value={detail.filePath} copyable />
                <FieldPill label="Sposob dostawy" value={detail.deliveryMethod} copyable />
                <FieldPill label="Godzina" value={detail.deliveryHour} copyable />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Surowce</h2>
              <div className="mt-3 space-y-2">
                {detail.rawMaterials.map((material) => (
                  <FieldPill key={material.name} label={material.name} value={material.amount} />
                ))}
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-md border border-border bg-card p-3">
            <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parametry operacji</h2>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {detail.parameters.map((parameter) => (
                <div key={parameter} className="min-w-0 break-words rounded-md border border-border bg-background px-3 py-2 text-sm font-medium">
                  {parameter}
                </div>
              ))}
            </div>
          </section>

          <OperationsTable title="Poprzednie operacje" rows={detail.previousOperations} />
          <OperationsTable
            title="Powiazane zlecenia / etapy do odklikania"
            rows={relatedOperations}
            editable
            onToggleOperation={toggleOperation}
            onFinishOperation={finishOperation}
          />

          <section className="mt-5 grid gap-4 pb-12 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 font-bold"><FolderOpen size={16} /> Pliki</div>
              <p className="break-words text-sm">{detail.filePath}</p>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 font-bold"><Printer size={16} /> Produkcja</div>
              <p className="break-words text-sm">{detail.machine} - {detail.size}</p>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 font-bold"><Package size={16} /> Logistyka</div>
              <p className="break-words text-sm">{detail.deliveryMethod}, {detail.deliveryHour}</p>
            </div>
          </section>
        </section>
          )}
        </div>

        <RightStatusPanel
          order={order}
          gridTask={gridTask}
          selectedWorker={selectedWorker}
          running={running}
          actualTime={actualTime}
          onStartStop={toggleRunning}
          onFinish={finishOrder}
          onManualTime={addManualTime}
        />
      </div>
      </section>
  )

  if (isModal) return windowFrame

  return (
    <main className="relative flex h-screen min-h-0 items-center justify-center overflow-hidden bg-background p-3 text-foreground">
      {windowFrame}
    </main>
  )
}
