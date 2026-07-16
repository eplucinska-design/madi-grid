import { create } from 'zustand'
import type { Customer } from '@/lib/types'
import { MADI_GRID_CUSTOMERS } from '@/lib/data/madi-grid-customers'

const sampleCustomers: Customer[] = [
  {
    id: 'c1',
    companyName: 'Demo Print Lab Sp. z o.o.',
    taxId: '123-456-78-90',
    address: 'ul. Marketingowa 15',
    city: 'Warszawa',
    postalCode: '00-001',
    country: 'Polska',
    contacts: [
      { id: 'ct1', name: 'Anna Nowak', email: 'anna.testowa@example.com', phone: '+48 500 100 200', role: 'Dyrektor marketingu', isPrimary: true },
      { id: 'ct2', name: 'Jan Kowalski', email: 'jan.testowy@example.com', phone: '+48 500 100 201', role: 'Project Manager', isPrimary: false },
    ],
    notes: 'Klient premium, preferuje kontakt mailowy',
    accountManager: '2',
    createdAt: new Date('2024-01-15'),
    totalOrders: 45,
    totalRevenue: 125000,
    tags: ['premium', 'marketing', 'stały klient'],
  },
  {
    id: 'c2',
    companyName: 'Fikcyjna Marka Reklamowa S.A.',
    taxId: '987-654-32-10',
    address: 'ul. Technologiczna 42',
    city: 'Kraków',
    postalCode: '30-001',
    country: 'Polska',
    contacts: [
      { id: 'ct3', name: 'Michał Wiśniewski', email: 'michal.demo@example.com', phone: '+48 600 200 300', role: 'CEO', isPrimary: true },
    ],
    notes: 'Duże zamówienia, wymagający klient',
    accountManager: '2',
    createdAt: new Date('2023-06-20'),
    totalOrders: 28,
    totalRevenue: 89000,
    tags: ['technologia', 'b2b'],
  },
  {
    id: 'c3',
    companyName: 'Studio Klienta Testowego Sp. z o.o.',
    taxId: '111-222-33-44',
    address: 'ul. Prawnicza 8',
    city: 'Poznań',
    postalCode: '60-001',
    country: 'Polska',
    contacts: [
      { id: 'ct4', name: 'Mec. Piotr Nowak', email: 'p.nowak@kancelaria-nowak.pl', phone: '+48 700 300 400', role: 'Partner', isPrimary: true },
    ],
    accountManager: '2',
    createdAt: new Date('2024-03-10'),
    totalOrders: 12,
    totalRevenue: 35000,
    tags: ['usługi prawne', 'premium'],
  },
  {
    id: 'c4',
    companyName: 'Mockup Events Polska Sp. z o.o.',
    taxId: '555-666-77-88',
    address: 'ul. Eventowa 25',
    city: 'Wrocław',
    postalCode: '50-001',
    country: 'Polska',
    contacts: [
      { id: 'ct5', name: 'Karolina Zielińska', email: 'karolina.demo@example.com', phone: '+48 800 400 500', role: 'Event Manager', isPrimary: true },
    ],
    notes: 'Zamówienia sezonowe, głównie przed targami',
    accountManager: '2',
    createdAt: new Date('2023-09-05'),
    totalOrders: 18,
    totalRevenue: 52000,
    tags: ['eventy', 'sezonowy'],
  },
  {
    id: 'c5',
    companyName: 'Neutral Food Demo Sp. z o.o.',
    taxId: '444-333-22-11',
    address: 'ul. Ekologiczna 12',
    city: 'Gdańsk',
    postalCode: '80-001',
    country: 'Polska',
    contacts: [
      { id: 'ct6', name: 'Agata Kwiatkowska', email: 'agata.demo@example.com', phone: '+48 900 500 600', role: 'Marketing Manager', isPrimary: true },
    ],
    notes: 'Preferuje materiały ekologiczne',
    accountManager: '2',
    createdAt: new Date('2024-02-28'),
    totalOrders: 8,
    totalRevenue: 22000,
    tags: ['food', 'ekologia'],
  },
  {
    id: 'c6',
    companyName: 'Kultura Demo Center',
    taxId: '777-888-99-00',
    address: 'ul. Muzyczna 1',
    city: 'Łódź',
    postalCode: '90-001',
    country: 'Polska',
    contacts: [
      { id: 'ct7', name: 'Barbara Melodia', email: 'barbara.demo@example.com', phone: '+48 100 600 700', role: 'Dyrektor ds. promocji', isPrimary: true },
    ],
    accountManager: '2',
    createdAt: new Date('2023-11-15'),
    totalOrders: 22,
    totalRevenue: 41000,
    tags: ['kultura', 'eventy'],
  },
  {
    id: 'c7',
    companyName: 'Finanse Testowe S.A.',
    taxId: '999-000-11-22',
    address: 'ul. Bankowa 100',
    city: 'Warszawa',
    postalCode: '00-100',
    country: 'Polska',
    contacts: [
      { id: 'ct8', name: 'Robert Kapitalski', email: 'robert.demo@example.com', phone: '+48 200 700 800', role: 'Dyrektor marketingu', isPrimary: true },
      { id: 'ct9', name: 'Ewa Kredytowa', email: 'ewa.demo@example.com', phone: '+48 200 700 801', role: 'Specjalista ds. zamówień', isPrimary: false },
    ],
    notes: 'Klient korporacyjny, długie terminy płatności',
    accountManager: '2',
    createdAt: new Date('2022-05-20'),
    totalOrders: 65,
    totalRevenue: 320000,
    tags: ['finanse', 'korporacja', 'premium'],
  },
  {
    id: 'c8',
    companyName: 'Budowa Demo Development Sp. z o.o.',
    taxId: '222-333-44-55',
    address: 'ul. Budowlana 50',
    city: 'Katowice',
    postalCode: '40-001',
    country: 'Polska',
    contacts: [
      { id: 'ct10', name: 'Tomasz Murarz', email: 'tomasz@buildpro.pl', phone: '+48 300 800 900', role: 'Marketing Manager', isPrimary: true },
    ],
    accountManager: '2',
    createdAt: new Date('2024-01-08'),
    totalOrders: 15,
    totalRevenue: 48000,
    tags: ['budownictwo', 'b2b'],
  },
]

const importedCustomers: Customer[] = MADI_GRID_CUSTOMERS.map((customer) => {
  const hasContact = Boolean(customer.contactName || customer.email || customer.phone)
  const notes = [
    `Import z danych demonstracyjnych (${customer.group}).`,
    customer.commonName ? `Nazwa zwyczajowa: ${customer.commonName}.` : '',
  ].filter(Boolean).join('\n')

  return {
    id: customer.id,
    companyName: customer.companyName,
    taxId: customer.taxId,
    address: customer.address,
    city: customer.city,
    postalCode: customer.postalCode,
    country: 'Polska',
    contacts: hasContact
      ? [
          {
            id: `${customer.id}-contact`,
            name: customer.contactName || 'Kontakt z importu',
            email: customer.email,
            phone: customer.phone,
            role: 'Kontakt',
            isPrimary: true,
          },
        ]
      : [],
    notes,
    accountManager: '2',
    createdAt: new Date(customer.addedAt),
    totalOrders: 0,
    totalRevenue: 0,
    tags: ['madi-grid-pdf', customer.group],
  }
})

const initialCustomers = importedCustomers.length ? importedCustomers : sampleCustomers.slice(0, 3)

interface CustomersState {
  customers: Customer[]
  selectedCustomerId: string | null
  searchQuery: string
  
  setCustomers: (customers: Customer[]) => void
  createCustomer: (input?: Partial<Customer>) => string
  updateCustomer: (id: string, patch: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  duplicateCustomer: (id: string) => void
  selectCustomer: (id: string | null) => void
  setSearchQuery: (query: string) => void
  
  getFilteredCustomers: () => Customer[]
  getSelectedCustomer: () => Customer | undefined
  getCustomerById: (id: string) => Customer | undefined
}

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: initialCustomers,
  selectedCustomerId: null,
  searchQuery: '',

  setCustomers: (customers) => set({ customers }),

  createCustomer: (input = {}) => {
    const id = createId('customer')
    const customer: Customer = {
      id,
      companyName: input.companyName ?? 'Nowy klient',
      taxId: input.taxId ?? '',
      address: input.address ?? '',
      city: input.city ?? '',
      postalCode: input.postalCode ?? '',
      country: input.country ?? 'Polska',
      contacts: input.contacts ?? [
        {
          id: createId('contact'),
          name: 'Nowy kontakt',
          email: '',
          phone: '',
          role: 'Kontakt',
          isPrimary: true,
        },
      ],
      notes: input.notes ?? '',
      accountManager: input.accountManager ?? '2',
      createdAt: input.createdAt ?? new Date(),
      totalOrders: input.totalOrders ?? 0,
      totalRevenue: input.totalRevenue ?? 0,
      tags: input.tags ?? [],
    }
    set((state) => ({ customers: [customer, ...state.customers], selectedCustomerId: id }))
    return id
  },

  updateCustomer: (id, patch) =>
    set((state) => ({
      customers: state.customers.map((customer) => (customer.id === id ? { ...customer, ...patch } : customer)),
    })),

  deleteCustomer: (id) =>
    set((state) => ({
      customers: state.customers.filter((customer) => customer.id !== id),
      selectedCustomerId: state.selectedCustomerId === id ? null : state.selectedCustomerId,
    })),

  duplicateCustomer: (id) => {
    const source = get().customers.find((customer) => customer.id === id)
    if (!source) return
    const copy: Customer = {
      ...source,
      id: createId('customer'),
      companyName: `${source.companyName} - kopia`,
      contacts: source.contacts.map((contact) => ({ ...contact, id: createId('contact') })),
      createdAt: new Date(),
    }
    set((state) => ({ customers: [copy, ...state.customers], selectedCustomerId: copy.id }))
  },
  
  selectCustomer: (id) => set({ selectedCustomerId: id }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  getFilteredCustomers: () => {
    const { customers, searchQuery } = get()
    
    if (!searchQuery) return customers
    
    const query = searchQuery.toLowerCase()
    return customers.filter(customer => 
      customer.companyName.toLowerCase().includes(query) ||
      customer.city.toLowerCase().includes(query) ||
      customer.contacts.some(c => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)) ||
      customer.tags.some(tag => tag.toLowerCase().includes(query))
    )
  },
  
  getSelectedCustomer: () => {
    const { customers, selectedCustomerId } = get()
    return customers.find(c => c.id === selectedCustomerId)
  },
  
  getCustomerById: (id) => {
    const { customers } = get()
    return customers.find(c => c.id === id)
  },
}))
