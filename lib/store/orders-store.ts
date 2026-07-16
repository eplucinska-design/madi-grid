import { create } from 'zustand'
import { useAuthStore } from '@/lib/store/auth-store'
import { useNotificationsStore } from '@/lib/store/notifications-store'
import type { Order, OrderStatus, OrderPriority, ProductionStage } from '@/lib/types'

// Sample data
const sampleOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ZL-2026-0142',
    title: 'Ulotki A5 - Promocja letnia',
    description: 'Ulotki reklamowe A5, druk dwustronny, papier kredowy 170g',
    customerId: 'c1',
    customerName: 'Demo Print Lab Sp. z o.o.',
    status: 'in_production',
    priority: 'high',
    stage: 'printing',
    createdAt: new Date('2026-05-10'),
    updatedAt: new Date('2026-05-13'),
    dueDate: new Date('2026-05-16'),
    assignedTo: ['3', '4'],
    department: 'Druk offsetowy',
    product: 'Ulotki A5',
    quantity: 10000,
    specifications: 'CMYK, papier kredowy 170g, lakier UV',
    files: [],
    timeEntries: [],
    estimatedTime: 240,
    actualTime: 180,
    comments: [],
    quotedPrice: 1850,
    tags: ['ulotki', 'promocja'],
  },
  {
    id: '2',
    orderNumber: 'ZL-2026-0141',
    title: 'Katalog produktowy 2026',
    description: 'Katalog A4, 48 stron + okładka, oprawa klejona',
    customerId: 'c2',
    customerName: 'Fikcyjna Marka Reklamowa S.A.',
    status: 'pending_approval',
    priority: 'urgent',
    stage: 'approval',
    createdAt: new Date('2026-05-09'),
    updatedAt: new Date('2026-05-12'),
    dueDate: new Date('2026-05-14'),
    assignedTo: ['2', '3'],
    department: 'Druk cyfrowy',
    product: 'Katalog A4',
    quantity: 500,
    specifications: 'CMYK, środek 130g mat, okładka 300g + folia mat',
    files: [],
    timeEntries: [],
    estimatedTime: 480,
    actualTime: 320,
    comments: [],
    quotedPrice: 4200,
    tags: ['katalog', 'priorytet'],
  },
  {
    id: '3',
    orderNumber: 'ZL-2026-0140',
    title: 'Wizytówki firmowe - 5 wzorów',
    description: 'Wizytówki 90x50mm, 5 różnych wzorów po 500 szt.',
    customerId: 'c3',
    customerName: 'Studio Klienta Testowego Sp. z o.o.',
    status: 'design_preparation',
    priority: 'medium',
    stage: 'prepress',
    createdAt: new Date('2026-05-08'),
    updatedAt: new Date('2026-05-11'),
    dueDate: new Date('2026-05-18'),
    assignedTo: ['3'],
    department: 'DTP',
    product: 'Wizytówki',
    quantity: 2500,
    specifications: '350g mat + lakier wybiórczy UV',
    files: [],
    timeEntries: [],
    estimatedTime: 120,
    actualTime: 45,
    comments: [],
    quotedPrice: 890,
    tags: ['wizytówki'],
  },
  {
    id: '4',
    orderNumber: 'ZL-2026-0139',
    title: 'Roll-up 100x200cm - Targi',
    description: 'Roll-up reklamowy na targi branżowe',
    customerId: 'c4',
    customerName: 'Mockup Events Polska Sp. z o.o.',
    status: 'waiting_for_files',
    priority: 'high',
    stage: 'files',
    createdAt: new Date('2026-05-12'),
    updatedAt: new Date('2026-05-12'),
    dueDate: new Date('2026-05-15'),
    assignedTo: ['2'],
    department: 'Wielkoformatowy',
    product: 'Roll-up',
    quantity: 3,
    specifications: 'Druk na blockout 440g, kaseta aluminiowa',
    files: [],
    timeEntries: [],
    estimatedTime: 90,
    actualTime: 0,
    comments: [],
    quotedPrice: 1200,
    tags: ['rollup', 'targi'],
  },
  {
    id: '5',
    orderNumber: 'ZL-2026-0138',
    title: 'Naklejki samoprzylepne - Etykiety',
    description: 'Naklejki na produkty, wykrojnik okrągły fi 50mm',
    customerId: 'c5',
    customerName: 'Neutral Food Demo Sp. z o.o.',
    status: 'completed',
    priority: 'low',
    stage: 'shipping',
    createdAt: new Date('2026-05-05'),
    updatedAt: new Date('2026-05-10'),
    dueDate: new Date('2026-05-12'),
    assignedTo: ['4', '5'],
    department: 'Etykiety',
    product: 'Naklejki',
    quantity: 5000,
    specifications: 'Papier samoprzylepny błysk, CMYK',
    files: [],
    timeEntries: [],
    estimatedTime: 180,
    actualTime: 165,
    comments: [],
    quotedPrice: 650,
    finalPrice: 650,
    tags: ['naklejki', 'etykiety'],
  },
  {
    id: '6',
    orderNumber: 'ZL-2026-0137',
    title: 'Plakaty A2 - Koncert',
    description: 'Plakaty eventowe A2, druk jednostronny',
    customerId: 'c6',
    customerName: 'Kultura Demo Center',
    status: 'finishing',
    priority: 'medium',
    stage: 'finishing',
    createdAt: new Date('2026-05-07'),
    updatedAt: new Date('2026-05-12'),
    dueDate: new Date('2026-05-14'),
    assignedTo: ['4'],
    department: 'Druk cyfrowy',
    product: 'Plakaty A2',
    quantity: 200,
    specifications: '200g satyna, CMYK',
    files: [],
    timeEntries: [],
    estimatedTime: 60,
    actualTime: 55,
    comments: [],
    quotedPrice: 420,
    tags: ['plakaty', 'event'],
  },
  {
    id: '7',
    orderNumber: 'ZL-2026-0136',
    title: 'Teczki ofertowe z grzbietu',
    description: 'Teczki A4 z grzbietem 5mm, hot stamping logo',
    customerId: 'c7',
    customerName: 'Finanse Testowe S.A.',
    status: 'verification',
    priority: 'high',
    stage: 'prepress',
    createdAt: new Date('2026-05-11'),
    updatedAt: new Date('2026-05-13'),
    dueDate: new Date('2026-05-20'),
    assignedTo: ['3'],
    department: 'Introligatornia',
    product: 'Teczki ofertowe',
    quantity: 1000,
    specifications: '350g + folia mat + hot stamping złoto',
    files: [],
    timeEntries: [],
    estimatedTime: 360,
    actualTime: 30,
    comments: [],
    quotedPrice: 3800,
    tags: ['teczki', 'premium'],
  },
  {
    id: '8',
    orderNumber: 'ZL-2026-0135',
    title: 'Bannery mesh 3x1m - Ogrodzenie',
    description: 'Bannery siatkowe na ogrodzenie budowy',
    customerId: 'c8',
    customerName: 'Budowa Demo Development Sp. z o.o.',
    status: 'ready_for_production',
    priority: 'low',
    stage: 'printing',
    createdAt: new Date('2026-05-06'),
    updatedAt: new Date('2026-05-10'),
    dueDate: new Date('2026-05-17'),
    assignedTo: ['4'],
    department: 'Wielkoformatowy',
    product: 'Bannery mesh',
    quantity: 10,
    specifications: 'Mesh 270g, oczka co 50cm',
    files: [],
    timeEntries: [],
    estimatedTime: 120,
    actualTime: 0,
    comments: [],
    quotedPrice: 1500,
    tags: ['bannery', 'outdoor'],
  },
]

const templateOrders = sampleOrders.slice(0, 4)

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgClass: string }> = {
  waiting_for_files: { label: 'Oczekuje na pliki', color: '#868e96', bgClass: 'bg-[#f1f3f5] text-[#495057] dark:bg-[#374151] dark:text-[#9ca3af]' },
  verification: { label: 'Weryfikacja', color: '#1971c2', bgClass: 'bg-[#e7f5ff] text-[#1864ab] dark:bg-[#1e3a5f] dark:text-[#93c5fd]' },
  design_preparation: { label: 'Przygotowanie', color: '#e67700', bgClass: 'bg-[#fff3bf] text-[#e67700] dark:bg-[#78350f] dark:text-[#fbbf24]' },
  pending_approval: { label: 'Do akceptacji', color: '#f59f00', bgClass: 'bg-[#fff9db] text-[#e67700] dark:bg-[#78350f] dark:text-[#fbbf24]' },
  approved: { label: 'Zatwierdzone', color: '#0b7285', bgClass: 'bg-[#c5f6fa] text-[#0b7285] dark:bg-[#155e75] dark:text-[#67e8f9]' },
  ready_for_production: { label: 'Do produkcji', color: '#7950f2', bgClass: 'bg-[#e5dbff] text-[#7048e8] dark:bg-[#4c1d95] dark:text-[#c4b5fd]' },
  in_production: { label: 'W produkcji', color: '#2f9e44', bgClass: 'bg-[#d3f9d8] text-[#2f9e44] dark:bg-[#14532d] dark:text-[#86efac]' },
  finishing: { label: 'Wykończenie', color: '#0c8599', bgClass: 'bg-[#e3fafc] text-[#0c8599] dark:bg-[#0c4a6e] dark:text-[#7dd3fc]' },
  packaging: { label: 'Pakowanie', color: '#9c36b5', bgClass: 'bg-[#f3d9fa] text-[#9c36b5] dark:bg-[#701a75] dark:text-[#f0abfc]' },
  shipping: { label: 'Wysyłka', color: '#1971c2', bgClass: 'bg-[#d0ebff] text-[#1971c2] dark:bg-[#1e3a5f] dark:text-[#93c5fd]' },
  completed: { label: 'Zakończone', color: '#2b8a3e', bgClass: 'bg-[#b2f2bb] text-[#2b8a3e] dark:bg-[#166534] dark:text-[#86efac]' },
  on_hold: { label: 'Wstrzymane', color: '#495057', bgClass: 'bg-[#f1f3f5] text-[#495057] dark:bg-[#343a40] dark:text-[#adb5bd]' },
  cancelled: { label: 'Anulowane', color: '#c92a2a', bgClass: 'bg-[#ffe3e3] text-[#c92a2a] dark:bg-[#7f1d1d] dark:text-[#fca5a5]' },
}

export const PRIORITY_CONFIG: Record<OrderPriority, { label: string; color: string }> = {
  urgent: { label: 'Pilne', color: '#e03131' },
  high: { label: 'Wysoki', color: '#f59f00' },
  medium: { label: 'Średni', color: '#339af0' },
  low: { label: 'Niski', color: '#868e96' },
}

export const STAGE_CONFIG: Record<ProductionStage, { label: string; order: number }> = {
  files: { label: 'Pliki', order: 1 },
  prepress: { label: 'Prepress', order: 2 },
  approval: { label: 'Akceptacja', order: 3 },
  printing: { label: 'Druk', order: 4 },
  finishing: { label: 'Wykończenie', order: 5 },
  quality_check: { label: 'Kontrola', order: 6 },
  packaging: { label: 'Pakowanie', order: 7 },
  shipping: { label: 'Wysyłka', order: 8 },
}

const getNotificationActor = () => {
  const user = useAuthStore.getState().user
  return {
    actorName: user?.name ?? 'MADI GRID',
    actorInitials: user?.initials ?? 'MF',
    actorColor: user?.avatarColor ?? '#339af0',
  }
}

const prioritySeverity = (priority: OrderPriority) => (priority === 'urgent' ? 'critical' : priority === 'high' ? 'important' : 'info')

const formatOrderMinutes = (minutes: number) => {
  const safe = Math.max(0, minutes)
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  return `${hours.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}:00`
}

const notifyOrderPatch = (before: Order, after: Order, updates: Partial<Order>) => {
  const base = {
    ...getNotificationActor(),
    orderId: after.id,
    orderNumber: after.orderNumber,
    customerName: after.customerName,
    product: after.product,
    operation: after.department,
    statusLabel: STATUS_CONFIG[after.status].label,
  }

  if (updates.status && before.status !== after.status) {
    useNotificationsStore.getState().addNotification({
      ...base,
      channel: after.status === 'on_hold' || after.status === 'cancelled' ? 'alerts' : 'orders',
      kind: after.status === 'on_hold' ? 'blocking_alert' : 'status_changed',
      severity: after.status === 'on_hold' || after.status === 'cancelled' ? 'critical' : prioritySeverity(after.priority),
      title: after.status === 'on_hold' ? 'Zlecenie wstrzymane' : 'Status zlecenia zmieniony',
      body: `${STATUS_CONFIG[before.status].label} -> ${STATUS_CONFIG[after.status].label}`,
    })
    return
  }

  if (updates.stage && before.stage !== after.stage) {
    useNotificationsStore.getState().addNotification({
      ...base,
      channel: 'orders',
      kind: 'stage_changed',
      severity: prioritySeverity(after.priority),
      title: 'Etap zlecenia zmieniony',
      body: `${STAGE_CONFIG[before.stage].label} -> ${STAGE_CONFIG[after.stage].label}`,
      operation: STAGE_CONFIG[after.stage].label,
    })
    return
  }

  if (updates.dueDate && before.dueDate.getTime() !== after.dueDate.getTime()) {
    useNotificationsStore.getState().addNotification({
      ...base,
      channel: 'deadlines',
      kind: 'deadline_changed',
      severity: prioritySeverity(after.priority),
      title: 'Termin zlecenia zmieniony',
      body: `${before.dueDate.toLocaleDateString('pl-PL')} -> ${after.dueDate.toLocaleDateString('pl-PL')}`,
    })
    return
  }

  if (typeof updates.actualTime === 'number' && before.actualTime !== after.actualTime) {
    useNotificationsStore.getState().addNotification({
      ...base,
      channel: 'rcp',
      kind: after.actualTime > before.actualTime ? 'rcp_stopped' : 'order_updated',
      severity: prioritySeverity(after.priority),
      title: 'Aktualizacja czasu pracy',
      body: `Czas: ${formatOrderMinutes(before.actualTime)} -> ${formatOrderMinutes(after.actualTime)}`,
      durationLabel: formatOrderMinutes(Math.max(0, after.actualTime - before.actualTime)),
    })
  }
}

interface OrdersState {
  orders: Order[]
  selectedOrderId: string | null
  
  // Filters
  statusFilter: OrderStatus[]
  priorityFilter: OrderPriority[]
  searchQuery: string
  
  // Actions
  setOrders: (orders: Order[]) => void
  selectOrder: (id: string | null) => void
  updateOrder: (id: string, updates: Partial<Order>) => void
  setStatusFilter: (statuses: OrderStatus[]) => void
  setPriorityFilter: (priorities: OrderPriority[]) => void
  setSearchQuery: (query: string) => void
  
  // Computed
  getFilteredOrders: () => Order[]
  getSelectedOrder: () => Order | undefined
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: templateOrders,
  selectedOrderId: null,
  statusFilter: [],
  priorityFilter: [],
  searchQuery: '',

  setOrders: (orders) => set({ orders }),
  
  selectOrder: (id) => set({ selectedOrderId: id }),
  
  updateOrder: (id, updates) => {
    const before = get().orders.find((order) => order.id === id)
    set((state) => ({
      orders: state.orders.map(order => 
        order.id === id ? { ...order, ...updates, updatedAt: new Date() } : order
      )
    }))
    const after = get().orders.find((order) => order.id === id)
    if (before && after) notifyOrderPatch(before, after, updates)
  },
  
  setStatusFilter: (statuses) => set({ statusFilter: statuses }),
  
  setPriorityFilter: (priorities) => set({ priorityFilter: priorities }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  getFilteredOrders: () => {
    const { orders, statusFilter, priorityFilter, searchQuery } = get()
    
    return orders.filter(order => {
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(order.status)) {
        return false
      }
      
      // Priority filter
      if (priorityFilter.length > 0 && !priorityFilter.includes(order.priority)) {
        return false
      }
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          order.orderNumber.toLowerCase().includes(query) ||
          order.title.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.product.toLowerCase().includes(query)
        )
      }
      
      return true
    })
  },
  
  getSelectedOrder: () => {
    const { orders, selectedOrderId } = get()
    return orders.find(order => order.id === selectedOrderId)
  },
}))
