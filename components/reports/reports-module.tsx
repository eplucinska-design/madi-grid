'use client'

import { useMemo, useState } from 'react'
import { BarChart3, CalendarDays, Download, FileText, Package, Printer, Users } from 'lucide-react'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import { GRID_LISTS, GRID_STATUSES, type GridTask, useGridStore } from '@/lib/store/grid-store'
import { useCustomersStore } from '@/lib/store/customers-store'
import { useInventoryStore, type InventoryCategory } from '@/lib/store/inventory-store'
import { useQuotesStore, type QuoteRecord } from '@/lib/store/quotes-store'

type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year'

const periodLabels: Record<ReportPeriod, string> = {
  day: 'Dzienny',
  week: 'Tygodniowy',
  month: 'Miesieczny',
  quarter: 'Kwartalny',
  year: 'Roczny',
}

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

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay() || 7
  next.setDate(next.getDate() - day + 1)
  return next
}

function getPeriodRange(period: ReportPeriod, anchorDate: string) {
  const anchor = startOfDay(new Date(`${anchorDate}T12:00:00`))
  const start = new Date(anchor)
  const end = new Date(anchor)

  if (period === 'day') return { start, end: endOfDay(end) }
  if (period === 'week') {
    const weekStart = startOfWeek(anchor)
    const weekEnd = endOfDay(new Date(weekStart))
    weekEnd.setDate(weekEnd.getDate() + 6)
    return { start: weekStart, end: weekEnd }
  }
  if (period === 'month') {
    start.setDate(1)
    end.setMonth(end.getMonth() + 1, 0)
    return { start: startOfDay(start), end: endOfDay(end) }
  }
  if (period === 'quarter') {
    const quarterStartMonth = Math.floor(anchor.getMonth() / 3) * 3
    start.setMonth(quarterStartMonth, 1)
    end.setMonth(quarterStartMonth + 3, 0)
    return { start: startOfDay(start), end: endOfDay(end) }
  }
  start.setMonth(0, 1)
  end.setMonth(11, 31)
  return { start: startOfDay(start), end: endOfDay(end) }
}

function isInRange(value: string | Date | undefined, start: Date, end: Date) {
  if (!value) return false
  const date = value instanceof Date ? value : new Date(value.includes('T') ? value : `${value}T12:00:00`)
  return date >= start && date <= end
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value.includes('T') ? value : `${value}T12:00:00`)
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(value)
}

function formatMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  if (!hours) return `${rest} min`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function listName(listId: string) {
  return GRID_LISTS.find((list) => list.id === listId)?.name ?? listId
}

function statusLabel(status: GridTask['status']) {
  return GRID_STATUSES.find((item) => item.id === status)?.label ?? status
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function csvEscape(value: string | number) {
  const text = String(value).replaceAll('"', '""')
  return `"${text}"`
}

function buildCsv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map(csvEscape).join(';')).join('\n')
}

export function ReportsModule() {
  const { tasks } = useGridStore()
  const customers = useCustomersStore((state) => state.customers)
  const inventoryItems = useInventoryStore((state) => state.items)
  const { quotes } = useQuotesStore()
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [anchorDate, setAnchorDate] = useState(toDateInput(new Date()))

  const range = useMemo(() => getPeriodRange(period, anchorDate), [anchorDate, period])

  const report = useMemo(() => {
    const periodTasks = tasks.filter((task) =>
      isInRange(task.updatedAt, range.start, range.end) ||
      isInRange(task.createdAt, range.start, range.end) ||
      isInRange(task.dueDate, range.start, range.end)
    )
    const periodQuotes = quotes.filter((quote) => isInRange(quote.createdAt, range.start, range.end))
    const periodCustomers = customers.filter((customer) => isInRange(customer.createdAt, range.start, range.end))
    const invoiceTasks = periodTasks.filter((task) => task.listId === 'invoices')
    const doneTasks = periodTasks.filter((task) => task.status === 'done')
    const activeTasks = periodTasks.filter((task) => task.status !== 'done')
    const lowStock = inventoryItems.filter((item) => Math.max(0, item.stock - item.reserved) <= item.minStock)

    const byStage = GRID_LISTS.map((list) => {
      const listTasks = periodTasks.filter((task) => task.listId === list.id)
      return {
        id: list.id,
        label: list.name,
        count: listTasks.length,
        done: listTasks.filter((task) => task.status === 'done').length,
        blocked: listTasks.filter((task) => task.status === 'blocked').length,
        planned: listTasks.reduce((sum, task) => sum + task.estimateMinutes, 0),
        tracked: listTasks.reduce((sum, task) => sum + task.trackedMinutes, 0),
      }
    }).filter((item) => item.count > 0)

    const byStatus = GRID_STATUSES.map((status) => ({
      id: status.id,
      label: status.label,
      color: status.color,
      count: periodTasks.filter((task) => task.status === status.id).length,
    })).filter((item) => item.count > 0)

    const inventoryByCategory = Object.entries(categoryLabels).map(([category, label]) => {
      const items = inventoryItems.filter((item) => item.category === category)
      return {
        category,
        label,
        count: items.length,
        stock: items.reduce((sum, item) => sum + item.stock, 0),
        reserved: items.reduce((sum, item) => sum + item.reserved, 0),
        low: items.filter((item) => Math.max(0, item.stock - item.reserved) <= item.minStock).length,
      }
    }).filter((item) => item.count > 0)

    return {
      periodTasks,
      periodQuotes,
      periodCustomers,
      invoiceTasks,
      doneTasks,
      activeTasks,
      lowStock,
      byStage,
      byStatus,
      inventoryByCategory,
      totals: {
        planned: periodTasks.reduce((sum, task) => sum + task.estimateMinutes, 0),
        tracked: periodTasks.reduce((sum, task) => sum + task.trackedMinutes, 0),
        quoteValue: periodQuotes.reduce((sum, quote) => sum + quote.netPrice, 0),
        acceptedQuoteValue: periodQuotes.filter((quote) => quote.status === 'accepted').reduce((sum, quote) => sum + quote.netPrice, 0),
        customerRevenue: periodCustomers.reduce((sum, customer) => sum + customer.totalRevenue, 0),
      },
    }
  }, [customers, inventoryItems, quotes, range.end, range.start, tasks])

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ['Raport', periodLabels[period], `${formatDate(range.start)} - ${formatDate(range.end)}`],
      [],
      ['Produkcja etap', 'Zadania', 'Gotowe', 'Blokady', 'Plan min', 'Czas min'],
      ...report.byStage.map((item) => [item.label, item.count, item.done, item.blocked, item.planned, item.tracked]),
      [],
      ['Faktury', report.invoiceTasks.length],
      ['Klienci nowi', report.periodCustomers.length],
      ['Wyceny', report.periodQuotes.length, formatMoney(report.totals.quoteValue)],
      ['Niskie stany', report.lowStock.length],
    ]
    downloadTextFile(`madi-grid-raport-${period}-${anchorDate}.csv`, buildCsv(rows))
  }

  return (
    <ModuleFrame
      title="Raporty"
      kicker="Zestawienia okresowe"
      description="Raporty dzienne, tygodniowe, miesieczne, kwartalne i roczne dla produkcji, faktur, klientow, wycen oraz magazynu."
      icon={<BarChart3 size={13} />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted"
          >
            <Printer size={14} />
            Drukuj
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex h-[var(--app-control-height)] items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      }
      summary={
        <StatStrip
          items={[
            { label: 'Zadania', value: report.periodTasks.length, hint: `${report.doneTasks.length} gotowe` },
            { label: 'Czas', value: formatMinutes(report.totals.tracked), hint: `plan ${formatMinutes(report.totals.planned)}` },
            { label: 'Wyceny', value: report.periodQuotes.length, hint: formatMoney(report.totals.quoteValue) },
            { label: 'Niskie stany', value: report.lowStock.length, hint: 'magazyn', tone: report.lowStock.length ? 'text-amber-600' : 'text-emerald-600' },
          ]}
        />
      }
      bodyClassName="overflow-hidden"
    >
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-[var(--app-module-gap)] py-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/25 px-3">
            <CalendarDays size={15} className="text-muted-foreground" />
            <input
              type="date"
              value={anchorDate}
              onChange={(event) => setAnchorDate(event.target.value)}
              className="h-10 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center rounded-md border border-border bg-background p-1">
            {(Object.keys(periodLabels) as ReportPeriod[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`h-8 rounded px-3 text-xs font-semibold ${
                  period === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {periodLabels[item]}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Zakres: <span className="font-semibold text-foreground">{formatDate(range.start)} - {formatDate(range.end)}</span>
          </div>
        </div>

        <div className="madi-scroll-area flex-1 p-[var(--app-module-gap)]">
          <div className="grid gap-[var(--app-module-gap)] xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-[var(--app-module-gap)]">
              <ReportSection title="Produkcja wedlug etapow" icon={<BarChart3 size={15} />}>
                <ReportTable
                  columns={['Etap', 'Zadania', 'Gotowe', 'Blokady', 'Plan', 'Czas']}
                  rows={report.byStage.map((item) => [
                    item.label,
                    item.count,
                    item.done,
                    item.blocked,
                    formatMinutes(item.planned),
                    formatMinutes(item.tracked),
                  ])}
                  empty="Brak zadan produkcyjnych w tym okresie."
                />
              </ReportSection>

              <ReportSection title="Statusy zadan" icon={<FileText size={15} />}>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {report.byStatus.map((item) => (
                    <div key={item.id} className="rounded-md border border-border bg-card p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                        <p className="text-sm font-semibold">{item.label}</p>
                      </div>
                      <p className="text-2xl font-semibold">{item.count}</p>
                    </div>
                  ))}
                  {!report.byStatus.length && <EmptyBox text="Brak statusow w zakresie raportu." />}
                </div>
              </ReportSection>

              <ReportSection title="Faktury i rozliczenia" icon={<FileText size={15} />}>
                <ReportTable
                  columns={['Zadanie', 'Klient', 'Status', 'Termin', 'Czas']}
                  rows={report.invoiceTasks.map((task) => [
                    task.title,
                    task.customerName || '-',
                    statusLabel(task.status),
                    task.dueDate ? formatDate(task.dueDate) : '-',
                    formatMinutes(task.trackedMinutes),
                  ])}
                  empty="Brak spraw fakturowych w tym okresie."
                />
              </ReportSection>

              <ReportSection title="Wyceny" icon={<FileText size={15} />}>
                <ReportTable
                  columns={['Numer', 'Klient', 'Status', 'Produkt', 'Cena']}
                  rows={report.periodQuotes.map((quote: QuoteRecord) => [
                    quote.number,
                    quote.customer || '-',
                    quote.status,
                    quote.product || quote.jobName || '-',
                    formatMoney(quote.netPrice),
                  ])}
                  empty="Brak wycen w tym okresie."
                />
              </ReportSection>
            </div>

            <div className="space-y-[var(--app-module-gap)]">
              <ReportSection title="Klienci" icon={<Users size={15} />}>
                <div className="grid gap-2">
                  <MetricLine label="Nowi klienci" value={report.periodCustomers.length} />
                  <MetricLine label="Obrot historyczny tych klientow" value={formatMoney(report.totals.customerRevenue)} />
                  <MetricLine label="Aktywne zadania" value={report.activeTasks.length} />
                </div>
              </ReportSection>

              <ReportSection title="Magazyn" icon={<Package size={15} />}>
                <ReportTable
                  columns={['Rodzaj', 'Pozycje', 'Stan', 'Rezerw.', 'Niskie']}
                  rows={report.inventoryByCategory.map((item) => [
                    item.label,
                    item.count,
                    item.stock,
                    item.reserved,
                    item.low,
                  ])}
                  empty="Brak pozycji magazynowych."
                />
              </ReportSection>

              <ReportSection title="Alerty magazynowe" icon={<Package size={15} />}>
                <div className="space-y-2">
                  {report.lowStock.slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-100">
                      <p className="font-semibold">{item.name}</p>
                      <p className="mt-1">Dostepne: {Math.max(0, item.stock - item.reserved)} {item.unit}, minimum: {item.minStock} {item.unit}</p>
                    </div>
                  ))}
                  {!report.lowStock.length && <EmptyBox text="Brak niskich stanow." />}
                </div>
              </ReportSection>
            </div>
          </div>
        </div>
      </div>
    </ModuleFrame>
  )
}

function ReportSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}

function ReportTable({ columns, rows, empty }: { columns: string[]; rows: Array<Array<string | number>>; empty: string }) {
  if (!rows.length) return <EmptyBox text={empty} />
  return (
    <div className="madi-horizontal-scroll">
      <table className="w-full min-w-[620px] text-left text-xs">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column} className="border-b border-border px-2 py-2 font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="max-w-[260px] px-2 py-2 align-top">
                  <span className="line-clamp-2 break-words">{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MetricLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
