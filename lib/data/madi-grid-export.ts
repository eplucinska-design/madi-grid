export const MADI_GRID_EXPORT_META = {
  source: 'madi-grid-codex-export',
  snapshotDate: '2026-07-13',
  grafikTaskCount: 107,
}

export interface MadiGridGrafikTask {
  id: string
  title: string
  queueLabel: string
  statusLabel: string
  priorityLabel: string
  assignee: string
  client: string
  orderNumber: string
  deadline: string
  isOverdue: boolean
}

export const MADI_GRID_GRAFIK_TASKS: MadiGridGrafikTask[] = [
  {
    id: 'dtp-8fef75e1-4d58-4b9d-b262-c8286b5cd457',
    title: 'Etykiety Metalizowane',
    queueLabel: 'Zalegle',
    statusLabel: 'CZEKA NA AKCEPT',
    priorityLabel: 'Sredni',
    assignee: 'EEmilka',
    client: 'Demo Labels Sp. z o.o.',
    orderNumber: 'ZG/2026/07/0094',
    deadline: '2026-07-08 13:45',
    isOverdue: true,
  },
  {
    id: 'dtp-577edafa-21b1-41ae-bfaa-11d37f46291b',
    title: 'Projekt / adaptacja grafiki',
    queueLabel: 'Zalegle',
    statusLabel: 'CZEKA NA AKCEPT',
    priorityLabel: 'Sredni',
    assignee: 'EEmilka',
    client: 'Demo County Office',
    orderNumber: 'ZG/2026/07/0089',
    deadline: '2026-07-09 08:30',
    isOverdue: true,
  },
  {
    id: 'dtp-eec1f458-e79c-4d6e-8f56-e6e4daa8619a',
    title: 'Oklejenie Samochodu - projekty grafiki',
    queueLabel: 'Zalegle',
    statusLabel: 'CZEKA NA AKCEPT',
    priorityLabel: 'Sredni',
    assignee: 'EEmilka',
    client: 'Demo Studio Projektowe',
    orderNumber: 'ZG/2026/07/0093',
    deadline: '2026-07-09 11:30',
    isOverdue: true,
  },
  {
    id: 'dtp-e689c703-b366-459b-a3b5-a6af8e7fade2',
    title: 'Wzorniki drukowane July update 2026',
    queueLabel: 'Zalegle',
    statusLabel: 'CZEKA NA AKCEPT',
    priorityLabel: 'Sredni',
    assignee: 'EEmilka',
    client: 'Demo Beauty Group Sp. z o.o.',
    orderNumber: 'ZG/2026/07/0075',
    deadline: '2026-07-09 13:00',
    isOverdue: true,
  },
  {
    id: 'dtp-3a218b21-50b1-4e9b-b608-aa7e8367247e',
    title: 'Kolo fortuny - przygotowanie pliku na Rolanda',
    queueLabel: 'Zalegle',
    statusLabel: 'CZEKA NA AKCEPT',
    priorityLabel: 'Sredni',
    assignee: 'EEmilka',
    client: 'Demo Beauty Group Sp. z o.o.',
    orderNumber: 'ZG/2026/07/0099',
    deadline: '2026-07-10 08:30',
    isOverdue: true,
  },
  {
    id: 'dtp-366c8948-b3e2-445b-8f1c-406c7394ce43',
    title: 'Mockup uchwytow na strone www',
    queueLabel: 'Zalegle',
    statusLabel: 'CZEKA NA AKCEPT',
    priorityLabel: 'Sredni',
    assignee: 'EEmilka',
    client: 'Klient Prywatny Demo',
    orderNumber: 'ZG/2026/07/0102',
    deadline: '2026-07-10 10:10',
    isOverdue: true,
  },
  {
    id: 'dtp-201685e5-cdc0-421c-82f3-002289f62dbb',
    title: 'Numery startowe - personalizacja',
    queueLabel: 'Grafik - przygotowanie plikow',
    statusLabel: 'CZEKA NA AKCEPT',
    priorityLabel: 'Sredni',
    assignee: 'EEmilka',
    client: 'Demo Sport Group Sp. z o.o.',
    orderNumber: 'ZG/2026/07/0106',
    deadline: '2026-07-13 08:30',
    isOverdue: false,
  },
  {
    id: 'dtp-431e5bda-f64b-453e-9ce7-486dec60170e',
    title: 'Dzwonnica - banner',
    queueLabel: 'Grafik - projektowanie',
    statusLabel: 'CZEKA',
    priorityLabel: 'Sredni',
    assignee: 'EEmilka',
    client: 'Demo Local Parish',
    orderNumber: 'ZG/2026/07/0100',
    deadline: '2026-07-13 08:30',
    isOverdue: false,
  },
  {
    id: 'dtp-38337819-fae4-4bf8-b89d-0ec16b849fac',
    title: 'Projekt grafiki na kalendarz',
    queueLabel: 'Grafik - przygotowanie plikow',
    statusLabel: 'CZEKA',
    priorityLabel: 'Sredni',
    assignee: 'EEmilka',
    client: 'Demo Electric Sp. z o.o.',
    orderNumber: 'ZG/2026/07/0103',
    deadline: '2026-07-13 10:10',
    isOverdue: false,
  },
  {
    id: 'dtp-3496f0f8-a5bd-433b-9d4c-48bee232d42e',
    title: 'Karty informacyjne',
    queueLabel: 'Grafik - przygotowanie plikow',
    statusLabel: 'CZEKA',
    priorityLabel: 'Sredni',
    assignee: 'EEmilka',
    client: 'Demo Services One',
    orderNumber: 'ZG/2026/07/0107',
    deadline: '2026-07-13 14:10',
    isOverdue: false,
  },
]

export interface MadiGridCustomerSeed {
  id: string
  companyName: string
  taxId: string
  address: string
  city: string
  group: string
  addedAt: string
}

export const MADI_GRID_CUSTOMERS: MadiGridCustomerSeed[] = [
  {
    id: 'mgc-wito-labels',
    companyName: 'Demo Labels Sp. z o.o.',
    taxId: '',
    address: '',
    city: '',
    group: 'Z eksportu Madi Grid',
    addedAt: '2026-06-16',
  },
  {
    id: 'mgc-cosmo-group',
    companyName: 'Demo Beauty Group Sp. z o.o.',
    taxId: '',
    address: '',
    city: '',
    group: 'Z eksportu Madi Grid',
    addedAt: '2026-06-16',
  },
  {
    id: 'mgc-aqrat',
    companyName: 'Demo Client Eleven',
    taxId: '7642258608',
    address: '60-369 Poznan',
    city: 'Poznan',
    group: 'Grupa 1 (top)',
    addedAt: '2026-06-16',
  },
  {
    id: 'mgc-an-mar',
    companyName: 'Demo Client Twelve Sp. z o.o.',
    taxId: '7792088639',
    address: '62-020 Jasin',
    city: 'Jasin',
    group: 'Grupa 2 (-10%)',
    addedAt: '2026-06-16',
  },
  {
    id: 'mgc-sport-evolution',
    companyName: 'Demo Sport Group Sp. z o.o.',
    taxId: '',
    address: '',
    city: '',
    group: 'Z eksportu Madi Grid',
    addedAt: '2026-07-13',
  },
]

export interface MadiGridTimeLog {
  at: string
  user: string
  action: string
  process: string
  orderNumber: string
  notes?: string
}

export const MADI_GRID_TIME_LOGS: MadiGridTimeLog[] = [
  { at: '2026-07-13 09:19', user: 'Emilka', action: 'STOP / akcept', process: 'Grafik - DTP', orderNumber: 'ZG/2026/07/0106' },
  { at: '2026-07-13 09:15', user: 'Emilka', action: 'START', process: 'Grafik - DTP', orderNumber: 'ZG/2026/07/0106' },
  { at: '2026-07-10 16:07', user: 'Emilka', action: 'STOP / akcept', process: 'Grafik - DTP', orderNumber: 'ZG/2026/07/0102' },
  { at: '2026-07-10 13:24', user: 'Emilka', action: 'START', process: 'Grafik - DTP', orderNumber: 'ZG/2026/07/0102' },
  { at: '2026-07-10 11:34', user: 'Emilka', action: 'complete', process: 'Grafik - Awaria', orderNumber: 'ZG/2026/07/0104', notes: 'gotowe' },
]

