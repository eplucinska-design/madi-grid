import type { ModuleId } from '@/lib/types'

const MODULE_IDS: ModuleId[] = [
  'start',
  'grid',
  'dashboard',
  'customers',
  'quotes',
  'quotes-list',
  'quotes-products',
  'studio',
  'studio-design',
  'orders',
  'files',
  'prepress',
  'production',
  'planning',
  'active-work',
  'logistics',
  'invoices',
  'complaints',
  'inventory',
  'documents',
  'communication',
  'marketing',
  'reports',
  'archive',
  'settings',
]

const MODULE_URLS: Partial<Record<ModuleId, string>> = {
  start: '/',
  quotes: '/estimates',
  'quotes-list': '/estimates?module=quotes-list',
  'quotes-products': '/estimates?module=quotes-products',
  studio: '/studio',
  'studio-design': '/studio?module=studio-design',
  orders: '/jobs',
  production: '/production',
  planning: '/?module=planning',
  'active-work': '/logs',
}

export function isModuleId(value: string | null): value is ModuleId {
  return Boolean(value && MODULE_IDS.includes(value as ModuleId))
}

export function moduleToUrl(module: ModuleId): string {
  return MODULE_URLS[module] ?? `/?module=${encodeURIComponent(module)}`
}

export function moduleFromLocation(pathname: string, search = ''): ModuleId {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const queryModule = params.get('module')

  if (isModuleId(queryModule)) {
    return queryModule
  }

  if (pathname.startsWith('/estimates')) return 'quotes'
  if (pathname.startsWith('/jobs')) return 'orders'
  if (pathname.startsWith('/clients')) return 'customers'
  if (pathname.startsWith('/production')) return 'production'
  if (pathname.startsWith('/studio/tasks')) return 'active-work'
  if (pathname.startsWith('/studio')) return 'studio'
  if (pathname.startsWith('/logs')) return 'active-work'

  return 'start'
}

export function currentBrowserUrl(): string {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}`
}
