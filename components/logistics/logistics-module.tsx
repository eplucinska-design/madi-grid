'use client'

import { useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  KanbanSquare,
  List,
  MapPin,
  PackageCheck,
  Plus,
  Route,
  Truck,
} from 'lucide-react'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import { GRID_STATUSES, type GridTask, useGridStore } from '@/lib/store/grid-store'

type LogisticsView = 'list' | 'board' | 'schedule' | 'calendar'
type ScheduleMode = 'day' | 'week'
type DeliveryKind = 'shipment' | 'pickup'
type LogisticsStatus = 'draft' | 'planned' | 'route' | 'done'
type PaymentMethod = 'transfer' | 'cash' | 'card' | 'none'
type SortDirection = 'asc' | 'desc'

interface LogisticsCourse {
  id: string
  taskId?: string
  orderNumber: string
  title: string
  customerName: string
  kind: DeliveryKind
  carrier: string
  paymentMethod: PaymentMethod
  address: string
  date: string
  time: string
  status: LogisticsStatus
  notes: string
  contact: string
}

const carriers = ['DPD', 'DHL', 'InPost', 'UPS', 'Pan Darek', 'Pan Mirek', 'Odbior wlasny', 'Kurier miejski']

function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <span className="ml-auto flex h-4 w-3 shrink-0 flex-col items-center justify-center text-[9px] leading-[7px]" aria-hidden="true">
      <span className={active && direction === 'asc' ? 'text-primary' : 'text-muted-foreground/45'}>^</span>
      <span className={active && direction === 'desc' ? 'text-primary' : 'text-muted-foreground/45'}>v</span>
    </span>
  )
}

const statusColumns: Array<{ id: LogisticsStatus; label: string; tone: string }> = [
  { id: 'draft', label: 'Do zaplanowania', tone: 'bg-muted text-muted-foreground' },
  { id: 'planned', label: 'Zaplanowane', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200' },
  { id: 'route', label: 'W trasie', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' },
  { id: 'done', label: 'Zamkniete', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200' },
]

const paymentLabels: Record<PaymentMethod, string> = {
  transfer: 'Przelew',
  cash: 'Gotowka',
  card: 'Karta',
  none: 'Nie dotyczy',
}

const kindLabels: Record<DeliveryKind, string> = {
  shipment: 'Wysylka',
  pickup: 'Odbior',
}

const createLocalId = () => `log-${Date.now()}-${Math.random().toString(16).slice(2)}`

const today = '2026-07-14'

function taskToCourse(task: GridTask, index: number): LogisticsCourse {
  return {
    id: `task-${task.id}`,
    taskId: task.id,
    orderNumber: task.orderNumber,
    title: task.title,
    customerName: task.customerName,
    kind: index % 3 === 0 ? 'pickup' : 'shipment',
    carrier: index % 3 === 0 ? 'Pan Darek' : index % 2 === 0 ? 'DPD' : 'DHL',
    paymentMethod: index % 3 === 0 ? 'transfer' : 'none',
    address: task.filesPath || 'Adres do uzupelnienia',
    date: task.dueDate || today,
    time: index % 3 === 0 ? '12:30' : index % 2 === 0 ? '10:00' : '15:00',
    status: task.status === 'done' ? 'done' : task.status === 'in_progress' ? 'route' : task.status === 'backlog' ? 'draft' : 'planned',
    notes: task.description || 'Kurs powiazany ze zleceniem.',
    contact: task.customerName,
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

function addDays(date: string, offset: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + offset)
  return next.toISOString().slice(0, 10)
}

function startOfWeek(date: string) {
  const next = new Date(`${date}T12:00:00`)
  const day = next.getDay() || 7
  next.setDate(next.getDate() - day + 1)
  return next.toISOString().slice(0, 10)
}

function getMonthDays(anchor: string) {
  const date = new Date(`${anchor}T12:00:00`)
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const gridStart = new Date(first)
  const day = gridStart.getDay() || 7
  gridStart.setDate(gridStart.getDate() - day + 1)
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart)
    current.setDate(gridStart.getDate() + index)
    return {
      date: current.toISOString().slice(0, 10),
      inMonth: current.getMonth() === date.getMonth(),
      day: current.getDate(),
    }
  })
}

export function LogisticsModule() {
  const transportTasks = useGridStore((state) => state.tasks.filter((task) => task.listId === 'transport'))
  const allTasks = useGridStore((state) => state.tasks)
  const [view, setView] = useState<LogisticsView>('list')
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('week')
  const [anchorDate, setAnchorDate] = useState(today)
  const [localCourses, setLocalCourses] = useState<LogisticsCourse[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState({
    taskId: '',
    title: '',
    kind: 'shipment' as DeliveryKind,
    carrier: 'DPD',
    paymentMethod: 'none' as PaymentMethod,
    address: '',
    date: today,
    time: '10:00',
    notes: '',
  })

  const generatedCourses = useMemo(() => transportTasks.map(taskToCourse), [transportTasks])
  const courses = useMemo(() => [...localCourses, ...generatedCourses].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)), [generatedCourses, localCourses])
  const selectedCourse = courses.find((course) => course.id === selectedId) ?? courses[0]
  const linkedTask = allTasks.find((task) => task.id === selectedCourse?.taskId)
  const openCourses = courses.filter((course) => course.status !== 'done')
  const todayCourses = courses.filter((course) => course.date === anchorDate)
  const pickupCourses = courses.filter((course) => course.kind === 'pickup')
  const routeCourses = courses.filter((course) => course.status === 'route')

  const addCourse = () => {
    const linked = allTasks.find((task) => task.id === form.taskId)
    const course: LogisticsCourse = {
      id: createLocalId(),
      taskId: linked?.id,
      orderNumber: linked?.orderNumber || 'Bez numeru',
      title: form.title || linked?.title || 'Nowy kurs',
      customerName: linked?.customerName || 'Klient do uzupelnienia',
      kind: form.kind,
      carrier: form.carrier,
      paymentMethod: form.kind === 'pickup' ? form.paymentMethod : 'none',
      address: form.address || linked?.filesPath || 'Adres do uzupelnienia',
      date: form.date,
      time: form.time,
      status: 'planned',
      notes: form.notes,
      contact: linked?.customerName || 'Kontakt do uzupelnienia',
    }
    setLocalCourses((items) => [course, ...items])
    setSelectedId(course.id)
    setForm((current) => ({ ...current, title: '', address: '', notes: '', paymentMethod: 'none' }))
  }

  const updateCourseStatus = (id: string, status: LogisticsStatus) => {
    setLocalCourses((items) => items.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  return (
    <ModuleFrame
      title="Logistyka"
      kicker="Kursy i wysylki"
      description="Widok kursow, odbiorow, przewoznikow, platnosci i harmonogramu godzinowego."
      icon={<Truck size={13} />}
      viewControls
      summary={
        <StatStrip
          items={[
            { label: 'Otwarte kursy', value: openCourses.length, hint: 'do realizacji' },
            { label: 'Dzisiaj', value: todayCourses.length, hint: formatDate(anchorDate) },
            { label: 'Odbiory', value: pickupCourses.length, hint: 'z platnoscia' },
            { label: 'W trasie', value: routeCourses.length, hint: 'aktywny transport', tone: 'text-amber-600' },
          ]}
        />
      }
      aside={selectedCourse ? <LogisticsAside course={selectedCourse} linkedTask={linkedTask} onStatusChange={updateCourseStatus} /> : undefined}
      bodyClassName="overflow-auto p-[var(--app-module-gap)]"
    >
      <div className="flex min-h-full min-w-0 flex-col gap-[var(--app-module-gap)]">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card p-2">
          <div className="flex flex-wrap items-center gap-1">
            <ViewButton active={view === 'list'} icon={<List size={14} />} label="Lista" onClick={() => setView('list')} />
            <ViewButton active={view === 'board'} icon={<KanbanSquare size={14} />} label="Board" onClick={() => setView('board')} />
            <ViewButton active={view === 'schedule'} icon={<Clock3 size={14} />} label="Harmonogram" onClick={() => setView('schedule')} />
            <ViewButton active={view === 'calendar'} icon={<CalendarDays size={14} />} label="Kalendarz" onClick={() => setView('calendar')} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view === 'schedule' && (
              <div className="flex rounded-md border border-border bg-muted/30 p-1">
                <button onClick={() => setScheduleMode('day')} className={`h-7 rounded px-3 text-xs ${scheduleMode === 'day' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background'}`}>Dzien</button>
                <button onClick={() => setScheduleMode('week')} className={`h-7 rounded px-3 text-xs ${scheduleMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background'}`}>Tydzien</button>
              </div>
            )}
            <input
              type="date"
              value={anchorDate}
              onChange={(event) => setAnchorDate(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>

        <section className="rounded-md border border-border bg-card p-3">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary"><Plus size={16} /></span>
            <div>
              <h2 className="text-sm font-semibold">Dodaj kurs / wysylke</h2>
              <p className="text-xs text-muted-foreground">Wybierz zlecenie, typ dostawy i przewoznika. Przy odbiorze wybierz sposob platnosci.</p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={form.taskId}
              onChange={(event) => {
                const task = allTasks.find((item) => item.id === event.target.value)
                setForm((current) => ({
                  ...current,
                  taskId: event.target.value,
                  title: task?.title ?? current.title,
                  address: task?.filesPath ?? current.address,
                }))
              }}
              className="h-9 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="">Zlecenie / bez powiazania</option>
              {allTasks.slice(0, 30).map((task) => (
                <option key={task.id} value={task.id}>{task.orderNumber} - {task.title}</option>
              ))}
            </select>
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Nazwa kursu" className="h-9 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary" />
            <select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as DeliveryKind, paymentMethod: event.target.value === 'pickup' ? 'transfer' : 'none' }))} className="h-9 rounded-md border border-border bg-background px-2 text-xs">
              <option value="shipment">Wysylka</option>
              <option value="pickup">Odbior</option>
            </select>
            <select value={form.carrier} onChange={(event) => setForm((current) => ({ ...current, carrier: event.target.value }))} className="h-9 rounded-md border border-border bg-background px-2 text-xs">
              {carriers.map((carrier) => <option key={carrier}>{carrier}</option>)}
            </select>
            {form.kind === 'pickup' && (
              <select value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))} className="h-9 rounded-md border border-amber-300 bg-amber-50 px-2 text-xs outline-none focus:border-amber-500 dark:border-amber-900 dark:bg-amber-950/30">
                <option value="transfer">Przelew</option>
                <option value="cash">Gotowka</option>
                <option value="card">Karta</option>
              </select>
            )}
            <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Adres / sciezka / punkt odbioru" className="h-9 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary xl:col-span-2" />
            <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="h-9 rounded-md border border-border bg-background px-2 text-xs" />
            <input type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} className="h-9 rounded-md border border-border bg-background px-2 text-xs" />
            <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Uwagi dla kierowcy / biura" className="h-9 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary xl:col-span-2" />
            <button onClick={addCourse} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
              Dodaj kurs
            </button>
          </div>
        </section>

        {view === 'list' && <LogisticsList courses={courses} selectedId={selectedCourse?.id} onSelect={setSelectedId} />}
        {view === 'board' && <LogisticsBoard courses={courses} selectedId={selectedCourse?.id} onSelect={setSelectedId} />}
        {view === 'schedule' && <LogisticsSchedule courses={courses} anchorDate={anchorDate} mode={scheduleMode} selectedId={selectedCourse?.id} onSelect={setSelectedId} />}
        {view === 'calendar' && <LogisticsCalendar courses={courses} anchorDate={anchorDate} selectedId={selectedCourse?.id} onSelect={setSelectedId} />}
      </div>
    </ModuleFrame>
  )
}

function ViewButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
      {icon}
      {label}
    </button>
  )
}

function LogisticsList({ courses, selectedId, onSelect }: { courses: LogisticsCourse[]; selectedId?: string; onSelect: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<keyof LogisticsCourse>('date')
  const [direction, setDirection] = useState<SortDirection>('asc')
  const sorted = [...courses].sort((a, b) => {
    const result = String(a[sortKey]).localeCompare(String(b[sortKey]), 'pl')
    return direction === 'asc' ? result : -result
  })

  const sort = (key: keyof LogisticsCourse) => {
    setSortKey(key)
    setDirection((current) => (sortKey === key && current === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <div className="madi-horizontal-scroll rounded-md border border-border bg-card">
      <table className="w-full min-w-[980px] text-left text-xs">
        <thead className="sticky top-0 z-10 bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <SortableHeader label="Zlecenie" active={sortKey === 'orderNumber'} direction={direction} onClick={() => sort('orderNumber')} />
            <SortableHeader label="Kurs" active={sortKey === 'title'} direction={direction} onClick={() => sort('title')} />
            <SortableHeader label="Typ" active={sortKey === 'kind'} direction={direction} onClick={() => sort('kind')} />
            <SortableHeader label="Przewoznik" active={sortKey === 'carrier'} direction={direction} onClick={() => sort('carrier')} />
            <SortableHeader label="Platnosc" active={sortKey === 'paymentMethod'} direction={direction} onClick={() => sort('paymentMethod')} />
            <SortableHeader label="Termin" active={sortKey === 'date'} direction={direction} onClick={() => sort('date')} />
            <SortableHeader label="Status" active={sortKey === 'status'} direction={direction} onClick={() => sort('status')} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((course) => (
            <tr key={course.id} onDoubleClick={() => onSelect(course.id)} onClick={() => onSelect(course.id)} className={`cursor-pointer border-b border-border hover:bg-muted/40 ${selectedId === course.id ? 'bg-primary/8 outline outline-1 outline-primary' : ''}`}>
              <td className="px-3 py-3 font-medium text-primary">{course.orderNumber}</td>
              <td className="px-3 py-3">
                <p className="font-semibold">{course.title}</p>
                <p className="text-muted-foreground">{course.customerName}</p>
              </td>
              <td className="px-3 py-3">{kindLabels[course.kind]}</td>
              <td className="px-3 py-3">{course.carrier}</td>
              <td className="px-3 py-3">{paymentLabels[course.paymentMethod]}</td>
              <td className="px-3 py-3">{formatDate(course.date)} {course.time}</td>
              <td className="px-3 py-3"><StatusBadge status={course.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SortableHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: SortDirection; onClick: () => void }) {
  return (
    <th className="border-b border-border px-3 py-2">
      <button onClick={onClick} className="flex w-full items-center gap-1 font-semibold hover:text-foreground">
        <span className="truncate">{label}</span>
        <SortIndicator active={active} direction={direction} />
      </button>
    </th>
  )
}

function LogisticsBoard({ courses, selectedId, onSelect }: { courses: LogisticsCourse[]; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex min-h-[440px] gap-3 overflow-auto pb-2">
      {statusColumns.map((column) => {
        const columnCourses = courses.filter((course) => course.status === column.id)
        return (
          <section key={column.id} className="flex min-h-0 w-[310px] shrink-0 flex-col rounded-md border border-border bg-muted/20">
            <header className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className={`rounded px-2 py-1 text-[11px] font-semibold ${column.tone}`}>{column.label}</span>
              <span className="text-xs text-muted-foreground">{columnCourses.length}</span>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
              {columnCourses.map((course) => (
                <CourseCard key={course.id} course={course} selected={selectedId === course.id} onClick={() => onSelect(course.id)} />
              ))}
              {!columnCourses.length && <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Brak kursow</div>}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function LogisticsSchedule({ courses, anchorDate, mode, selectedId, onSelect }: { courses: LogisticsCourse[]; anchorDate: string; mode: ScheduleMode; selectedId?: string; onSelect: (id: string) => void }) {
  const days = mode === 'day' ? [anchorDate] : Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchorDate), index))
  const hours = Array.from({ length: 12 }, (_, index) => `${String(index + 7).padStart(2, '0')}:00`)
  return (
    <div className="overflow-auto rounded-md border border-border bg-card">
      <div className="grid min-w-[960px]" style={{ gridTemplateColumns: `76px repeat(${days.length}, minmax(190px, 1fr))` }}>
        <div className="sticky left-0 top-0 z-20 border-b border-r border-border bg-muted p-2 text-xs font-semibold">Godz.</div>
        {days.map((day) => (
          <div key={day} className="sticky top-0 z-10 border-b border-r border-border bg-muted p-2 text-xs font-semibold">{formatDate(day)}</div>
        ))}
        {hours.map((hour) => (
          <>
            <div key={`h-${hour}`} className="sticky left-0 z-10 min-h-[96px] border-r border-t border-border bg-background p-2 text-xs text-muted-foreground">{hour}</div>
            {days.map((day) => {
              const hourCourses = courses.filter((course) => course.date === day && course.time.slice(0, 2) === hour.slice(0, 2))
              return (
                <div key={`${day}-${hour}`} className="min-h-[96px] space-y-1 border-r border-t border-border p-1.5">
                  {hourCourses.map((course) => (
                    <button key={course.id} onClick={() => onSelect(course.id)} className={`w-full rounded-md border p-2 text-left text-xs hover:border-primary ${selectedId === course.id ? 'border-primary bg-primary/8' : 'border-border bg-background'}`}>
                      <p className="truncate font-semibold">{course.time} {course.title}</p>
                      <p className="truncate text-muted-foreground">{course.carrier} - {kindLabels[course.kind]}</p>
                    </button>
                  ))}
                </div>
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}

function LogisticsCalendar({ courses, anchorDate, selectedId, onSelect }: { courses: LogisticsCourse[]; anchorDate: string; selectedId?: string; onSelect: (id: string) => void }) {
  const days = getMonthDays(anchorDate)
  return (
    <div className="overflow-auto rounded-md border border-border bg-card">
      <div className="grid min-w-[980px] grid-cols-7">
        {['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Nd'].map((day) => (
          <div key={day} className="border-b border-r border-border bg-muted px-2 py-2 text-xs font-semibold text-muted-foreground">{day}</div>
        ))}
        {days.map((day) => {
          const dayCourses = courses.filter((course) => course.date === day.date)
          return (
            <div key={day.date} className={`min-h-[150px] border-b border-r border-border p-2 ${day.inMonth ? 'bg-background' : 'bg-muted/20 text-muted-foreground'}`}>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold">{day.day}</span>
                <span className="text-muted-foreground">{dayCourses.length} kurs.</span>
              </div>
              <div className="space-y-1">
                {dayCourses.map((course) => (
                  <button key={course.id} onClick={() => onSelect(course.id)} className={`w-full rounded border px-2 py-1 text-left text-[11px] hover:border-primary ${selectedId === course.id ? 'border-primary bg-primary/8' : 'border-border bg-card'}`}>
                    <span className="font-semibold">{course.time}</span> {course.carrier}
                    <p className="truncate text-muted-foreground">{course.title}</p>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CourseCard({ course, selected, onClick }: { course: LogisticsCourse; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} onDoubleClick={onClick} className={`w-full rounded-md border bg-card p-3 text-left text-xs shadow-sm hover:border-primary ${selected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{course.title}</p>
          <p className="truncate text-muted-foreground">{course.orderNumber} - {course.customerName}</p>
        </div>
        <StatusBadge status={course.status} />
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span className="flex items-center gap-1"><Truck size={12} /> {course.carrier}</span>
        <span className="flex items-center gap-1"><CalendarDays size={12} /> {formatDate(course.date)} {course.time}</span>
        <span className="flex items-center gap-1"><PackageCheck size={12} /> {kindLabels[course.kind]}{course.kind === 'pickup' ? ` / ${paymentLabels[course.paymentMethod]}` : ''}</span>
      </div>
    </button>
  )
}

function StatusBadge({ status }: { status: LogisticsStatus }) {
  const column = statusColumns.find((item) => item.id === status)
  return <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold ${column?.tone ?? ''}`}>{column?.label ?? status}</span>
}

function LogisticsAside({ course, linkedTask, onStatusChange }: { course: LogisticsCourse; linkedTask?: GridTask; onStatusChange: (id: string, status: LogisticsStatus) => void }) {
  const taskStatus = linkedTask ? GRID_STATUSES.find((status) => status.id === linkedTask.status)?.label : undefined
  return (
    <aside className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{course.orderNumber}</p>
            <h2 className="truncate text-lg font-semibold">{course.title}</h2>
          </div>
          <StatusBadge status={course.status} />
        </div>
        <p className="text-sm text-muted-foreground">{course.customerName}</p>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
        <InfoCard icon={<Truck size={15} />} label="Przewoznik / osoba" value={course.carrier} />
        <InfoCard icon={<PackageCheck size={15} />} label="Rodzaj" value={kindLabels[course.kind]} />
        {course.kind === 'pickup' && <InfoCard icon={<CheckCircle2 size={15} />} label="Platnosc przy odbiorze" value={paymentLabels[course.paymentMethod]} tone="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30" />}
        <InfoCard icon={<CalendarDays size={15} />} label="Termin" value={`${formatDate(course.date)} ${course.time}`} />
        <InfoCard icon={<MapPin size={15} />} label="Adres / punkt" value={course.address} copyable />
        <InfoCard icon={<Route size={15} />} label="Kontakt" value={course.contact} />
        {taskStatus && <InfoCard icon={<List size={15} />} label="Status zlecenia" value={taskStatus} />}
        <div className="rounded-md border border-border bg-card p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Uwagi</p>
          <p className="whitespace-pre-wrap text-sm">{course.notes || 'Brak uwag.'}</p>
        </div>
      </div>
      <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-border p-4">
        <button onClick={() => onStatusChange(course.id, 'route')} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Start trasy</button>
        <button onClick={() => onStatusChange(course.id, 'done')} className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">Zamknij</button>
      </footer>
    </aside>
  )
}

function InfoCard({ icon, label, value, copyable, tone = '' }: { icon: React.ReactNode; label: string; value: string; copyable?: boolean; tone?: string }) {
  return (
    <div className={`rounded-md border border-border bg-card p-3 ${tone}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        {copyable && (
          <button onClick={() => navigator.clipboard?.writeText(value)} className="rounded p-1 hover:bg-muted" title="Kopiuj">
            <Copy size={13} />
          </button>
        )}
      </div>
      <p className="break-words text-sm font-medium">{value}</p>
    </div>
  )
}
