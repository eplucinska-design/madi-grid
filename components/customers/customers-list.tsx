'use client'

import { useMemo, useState } from 'react'
import { ArrowDownAZ, ArrowUpAZ, Building2, Copy, LayoutGrid, List, Mail, Phone, Plus, Search, Tag, Trash2, User } from 'lucide-react'
import { useCustomersStore } from '@/lib/store/customers-store'
import { DEMO_USERS } from '@/lib/store/auth-store'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import { UserAvatar } from '@/components/common/assignee-avatar-stack'
import type { Customer, CustomerContact } from '@/lib/types'

function tagsToString(tags: string[]) {
  return tags.join(', ')
}

function stringToTags(value: string) {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean)
}

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
}

function shortDate(value: Date) {
  return new Date(value).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type CustomerViewMode = 'cards' | 'list'
type CustomerSortKey = 'createdAt' | 'lastOrder' | 'lastInvoice' | 'alphabetical' | 'contact' | 'group' | 'revenue' | 'orders'
type SortDirection = 'asc' | 'desc'

const customerSortLabels: Record<CustomerSortKey, string> = {
  createdAt: 'Data dodania',
  lastOrder: 'Ostatnie zlecenie',
  lastInvoice: 'Ostatnia faktura',
  alphabetical: 'Alfabetycznie',
  contact: 'Kontakt',
  group: 'Grupa',
  revenue: 'Obrot',
  orders: 'Liczba zlecen',
}

const customerListGrid = 'grid-cols-[minmax(280px,1.35fr)_minmax(150px,0.65fr)_minmax(170px,0.8fr)_130px_130px_110px_110px]'

const customerListColumns: Array<{ label: string; sortKey: CustomerSortKey }> = [
  { label: 'Klient', sortKey: 'alphabetical' },
  { label: 'Grupa', sortKey: 'group' },
  { label: 'Kontakt', sortKey: 'contact' },
  { label: 'Dodany', sortKey: 'createdAt' },
  { label: 'Ost. zlecenie', sortKey: 'lastOrder' },
  { label: 'Ost. faktura', sortKey: 'lastInvoice' },
  { label: 'Zlecenia', sortKey: 'orders' },
]

function inferredLastOrderDate(customer: Customer) {
  if (!customer.totalOrders) return customer.createdAt
  const date = new Date(customer.createdAt)
  date.setDate(date.getDate() + Math.min(720, customer.totalOrders * 9))
  return date > new Date() ? new Date() : date
}

function inferredLastInvoiceDate(customer: Customer) {
  if (!customer.totalRevenue) return customer.createdAt
  const date = inferredLastOrderDate(customer)
  date.setDate(date.getDate() + 7)
  return date > new Date() ? new Date() : date
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, 'pl', { sensitivity: 'base' })
}

function primaryContactName(customer: Customer) {
  return (customer.contacts.find((contact) => contact.isPrimary) || customer.contacts[0])?.name ?? ''
}

function customerGroup(customer: Customer) {
  return customer.tags.find((tag) => tag !== 'madi-grid-pdf') ?? 'Bez grupy'
}

function CustomerGroupLabel({ customer }: { customer: Customer }) {
  const group = customerGroup(customer)
  const tone = group === 'Bez grupy'
    ? 'border-border bg-muted text-muted-foreground'
    : 'border-primary/25 bg-primary/10 text-primary'

  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${tone}`} title={`Grupa: ${group}`}>
      <Tag size={11} />
      <span className="truncate">{group}</span>
    </span>
  )
}

function sortCustomers(customers: Customer[], sortKey: CustomerSortKey, direction: SortDirection) {
  const factor = direction === 'asc' ? 1 : -1
  return [...customers].sort((a, b) => {
    let result = 0
    if (sortKey === 'alphabetical') result = compareText(a.companyName, b.companyName)
    if (sortKey === 'contact') result = compareText(primaryContactName(a), primaryContactName(b))
    if (sortKey === 'group') result = compareText(customerGroup(a), customerGroup(b)) || compareText(a.companyName, b.companyName)
    if (sortKey === 'createdAt') result = a.createdAt.getTime() - b.createdAt.getTime()
    if (sortKey === 'lastOrder') result = inferredLastOrderDate(a).getTime() - inferredLastOrderDate(b).getTime()
    if (sortKey === 'lastInvoice') result = inferredLastInvoiceDate(a).getTime() - inferredLastInvoiceDate(b).getTime()
    if (sortKey === 'revenue') result = a.totalRevenue - b.totalRevenue
    if (sortKey === 'orders') result = a.totalOrders - b.totalOrders
    return result * factor
  })
}

function updateContact(customer: Customer, contactId: string, patch: Partial<CustomerContact>) {
  return customer.contacts.map((contact) => (contact.id === contactId ? { ...contact, ...patch } : contact))
}

function CustomerCard({ customer, isSelected, onSelect }: { customer: Customer; isSelected: boolean; onSelect: () => void }) {
  const primaryContact = customer.contacts.find((contact) => contact.isPrimary) || customer.contacts[0]

  return (
    <button
      type="button"
      draggable
      onClick={onSelect}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', customer.id)
        event.dataTransfer.effectAllowed = 'copyMove'
      }}
      className={`rounded-md border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-primary/50 hover:bg-muted/20 ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{customer.companyName}</h3>
            <p className="truncate text-xs text-muted-foreground">{customer.city || 'Bez miasta'}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <CustomerGroupLabel customer={customer} />
          {customer.accountManager && <UserAvatar userId={customer.accountManager} size="sm" />}
        </div>
      </div>

      {primaryContact && (
        <div className="mb-3 rounded-md bg-muted/40 p-2">
          <div className="mb-1 flex items-center gap-2">
            <User size={12} className="text-muted-foreground" />
            <span className="truncate text-sm font-medium">{primaryContact.name}</span>
            <span className="truncate text-xs text-muted-foreground">({primaryContact.role})</span>
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1">
              <Mail size={10} />
              <span className="truncate">{primaryContact.email || 'Brak maila'}</span>
            </span>
            <span className="flex min-w-0 items-center gap-1">
              <Phone size={10} />
              <span className="truncate">{primaryContact.phone || 'Brak telefonu'}</span>
            </span>
          </div>
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-border bg-muted/20 p-2">
          <p className="text-muted-foreground">Zlecenia</p>
          <p className="font-semibold">{customer.totalOrders}</p>
        </div>
        <div className="rounded border border-border bg-muted/20 p-2">
          <p className="text-muted-foreground">Obrot</p>
          <p className="font-semibold">{Math.round(customer.totalRevenue / 1000)}k PLN</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div className="rounded border border-border bg-muted/20 p-2">
          <p>Ost. zlecenie</p>
          <p className="font-semibold text-foreground">{shortDate(inferredLastOrderDate(customer))}</p>
        </div>
        <div className="rounded border border-border bg-muted/20 p-2">
          <p>Ost. faktura</p>
          <p className="font-semibold text-foreground">{shortDate(inferredLastInvoiceDate(customer))}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {customer.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            <Tag size={10} />
            {tag}
          </span>
        ))}
      </div>
    </button>
  )
}

function CustomerListRow({ customer, isSelected, onSelect }: { customer: Customer; isSelected: boolean; onSelect: () => void }) {
  const primaryContact = customer.contacts.find((contact) => contact.isPrimary) || customer.contacts[0]

  return (
    <button
      type="button"
      draggable
      onClick={onSelect}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', customer.id)
        event.dataTransfer.effectAllowed = 'copyMove'
      }}
      className={`grid w-full ${customerListGrid} items-center gap-3 border-b border-border px-4 py-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring hover:bg-muted/35 ${
        isSelected ? 'bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'bg-background'
      }`}
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{customer.companyName}</p>
        <p className="truncate text-xs text-muted-foreground">{customer.city || 'Bez miasta'} · {customer.taxId || 'Brak NIP'}</p>
      </div>
      <div className="min-w-0">
        <CustomerGroupLabel customer={customer} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{primaryContact?.name || 'Brak kontaktu'}</p>
        <p className="truncate text-xs text-muted-foreground">{primaryContact?.email || 'Brak maila'}</p>
      </div>
      <span className="text-xs">{shortDate(customer.createdAt)}</span>
      <span className="text-xs">{shortDate(inferredLastOrderDate(customer))}</span>
      <span className="text-xs">{shortDate(inferredLastInvoiceDate(customer))}</span>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{customer.totalOrders}</span>
        {customer.accountManager && <UserAvatar userId={customer.accountManager} size="sm" />}
      </div>
    </button>
  )
}

function CustomerDetailPanel() {
  const {
    getSelectedCustomer,
    updateCustomer,
    deleteCustomer,
    duplicateCustomer,
    selectCustomer,
  } = useCustomersStore()
  const customer = getSelectedCustomer()

  if (!customer) {
    return (
      <aside className="hidden w-[var(--app-detail-panel-width)] shrink-0 border-l border-border bg-background xl:flex xl:flex-col">
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
          <Building2 size={34} className="mb-3" />
          <p className="text-sm font-medium text-foreground">Wybierz klienta</p>
          <p className="mt-1 text-xs">Dane firmy, kontakty i notatki beda edytowalne tutaj.</p>
        </div>
      </aside>
    )
  }

  const primaryContact = customer.contacts.find((contact) => contact.isPrimary) || customer.contacts[0]

  return (
    <aside className="w-[var(--app-detail-panel-width)] shrink-0 border-l border-border bg-background">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{customer.companyName}</p>
            <p className="text-[11px] text-muted-foreground">Klient od {formatDate(customer.createdAt)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => duplicateCustomer(customer.id)} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Duplikuj">
              <Copy size={15} />
            </button>
            <button onClick={() => deleteCustomer(customer.id)} className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Usun">
              <Trash2 size={15} />
            </button>
            <button onClick={() => selectCustomer(null)} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" title="Zamknij">
              x
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-[var(--app-module-gap)]">
          <label className="block space-y-1 text-xs text-muted-foreground">
            Firma
            <input
              value={customer.companyName}
              onChange={(event) => updateCustomer(customer.id, { companyName: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              NIP
              <input
                value={customer.taxId ?? ''}
                onChange={(event) => updateCustomer(customer.id, { taxId: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Opiekun
              <select
                value={customer.accountManager ?? ''}
                onChange={(event) => updateCustomer(customer.id, { accountManager: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                <option value="">Brak</option>
                {DEMO_USERS.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Adres
            <input
              value={customer.address}
              onChange={(event) => updateCustomer(customer.id, { address: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Miasto
              <input
                value={customer.city}
                onChange={(event) => updateCustomer(customer.id, { city: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Kod
              <input
                value={customer.postalCode}
                onChange={(event) => updateCustomer(customer.id, { postalCode: event.target.value })}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>
          {primaryContact && (
            <div className="rounded-md border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kontakt glowny</p>
              <div className="space-y-2">
                <input
                  value={primaryContact.name}
                  onChange={(event) => updateCustomer(customer.id, { contacts: updateContact(customer, primaryContact.id, { name: event.target.value }) })}
                  className="h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                />
                <input
                  value={primaryContact.email}
                  onChange={(event) => updateCustomer(customer.id, { contacts: updateContact(customer, primaryContact.id, { email: event.target.value }) })}
                  className="h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                />
                <input
                  value={primaryContact.phone ?? ''}
                  onChange={(event) => updateCustomer(customer.id, { contacts: updateContact(customer, primaryContact.id, { phone: event.target.value }) })}
                  className="h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>
          )}
          <label className="block space-y-1 text-xs text-muted-foreground">
            Tagi
            <input
              value={tagsToString(customer.tags)}
              onChange={(event) => updateCustomer(customer.id, { tags: stringToTags(event.target.value) })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Notatki
            <textarea
              value={customer.notes ?? ''}
              onChange={(event) => updateCustomer(customer.id, { notes: event.target.value })}
              rows={5}
              className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>
      </div>
    </aside>
  )
}

export function CustomersList() {
  const {
    getFilteredCustomers,
    selectedCustomerId,
    selectCustomer,
    searchQuery,
    setSearchQuery,
    createCustomer,
  } = useCustomersStore()
  const [viewMode, setViewMode] = useState<CustomerViewMode>('list')
  const [sortKey, setSortKey] = useState<CustomerSortKey>('alphabetical')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const filteredCustomers = getFilteredCustomers()
  const customers = useMemo(
    () => sortCustomers(filteredCustomers, sortKey, sortDirection),
    [filteredCustomers, sortKey, sortDirection]
  )
  const revenue = customers.reduce((sum, customer) => sum + customer.totalRevenue, 0)
  const toggleSort = (key: CustomerSortKey) => {
    setSortKey((current) => {
      if (current === key) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
        return current
      }
      setSortDirection('asc')
      return key
    })
  }

  const actions = (
    <button
      onClick={() => createCustomer()}
      className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
    >
      <Plus size={14} />
      Nowy klient
    </button>
  )

  return (
    <ModuleFrame
      title="Klienci"
      kicker="CRM i kontakty"
      description="Karty klientow, kontakty, opiekunowie, tagi i edycja danych w jednym miejscu."
      icon={<Building2 size={13} />}
      actions={actions}
      aside={<CustomerDetailPanel />}
      summary={
        <StatStrip
          items={[
            { label: 'Klienci', value: customers.length, hint: 'widoczne po filtrach' },
            { label: 'Zlecenia', value: customers.reduce((sum, customer) => sum + customer.totalOrders, 0), hint: 'historycznie' },
            { label: 'Obrot', value: `${Math.round(revenue / 1000)}k`, hint: 'PLN lacznie' },
            { label: 'Wybrany', value: selectedCustomerId ? 'Tak' : 'Nie', hint: 'panel szczegolow' },
          ]}
        />
      }
      bodyClassName="overflow-hidden"
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
          <div className="flex min-w-[min(100%,240px)] flex-1 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
            <Search size={15} className="text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Szukaj firmy, miasta, kontaktu lub tagu..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex shrink-0 items-center rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex h-8 items-center gap-1 rounded px-2 text-xs font-medium ${viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <LayoutGrid size={14} />
              Kafelki
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-8 items-center gap-1 rounded px-2 text-xs font-medium ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <List size={14} />
              Lista
            </button>
          </div>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as CustomerSortKey)}
            className="h-9 rounded-md border border-border bg-background px-2 text-xs"
          >
            {Object.entries(customerSortLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
            title="Zmien kierunek sortowania"
          >
            {sortDirection === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
            {sortDirection === 'asc' ? 'Rosnaco' : 'Malejaco'}
          </button>
        </div>
        <div className="madi-scroll-area flex-1 p-[var(--app-module-gap)]">
          {customers.length > 0 ? (
            viewMode === 'cards' ? (
              <div className="grid madi-fluid-cards gap-[var(--app-module-gap)]">
                {customers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    isSelected={selectedCustomerId === customer.id}
                    onSelect={() => selectCustomer(customer.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border bg-background">
                <div className={`grid min-w-[1120px] ${customerListGrid} gap-3 border-b border-border bg-muted/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`}>
                  {customerListColumns.map((column) => (
                    <button
                      key={column.sortKey}
                      type="button"
                      onClick={() => toggleSort(column.sortKey)}
                      className="flex min-w-0 items-center gap-1 text-left hover:text-foreground"
                    >
                      <span className="truncate">{column.label}</span>
                      {sortKey === column.sortKey && (
                        <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="min-w-[1120px]">
                  {customers.map((customer) => (
                    <CustomerListRow
                      key={customer.id}
                      customer={customer}
                      isSelected={selectedCustomerId === customer.id}
                      onSelect={() => selectCustomer(customer.id)}
                    />
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Building2 size={32} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Brak klientow</p>
              <p className="mt-1 text-xs">Dodaj nowego klienta lub zmien filtr.</p>
            </div>
          )}
        </div>
      </div>
    </ModuleFrame>
  )
}
