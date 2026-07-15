import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/lib/types'

const SESSION_TTL_MS = 12 * 60 * 60 * 1000
const REMEMBER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Demo users for testing with 4-digit PINs. The login is stored in the email field for now.
export const DEMO_USERS: (User & { pin: string })[] = [
  {
    id: '1',
    email: 'emilia.plucinska',
    name: 'Emilia Plucińska',
    initials: 'EP',
    role: 'designer',
    department: 'Grafik kreatywny/DTP',
    avatarColor: '#4c6ef5',
    permissions: ['orders.view', 'files.all', 'prepress.all'],
    pin: '0001',
  },
  {
    id: '2',
    email: 'oliwier.matela',
    name: 'Oliwier Matela',
    initials: 'OM',
    role: 'designer',
    department: 'Grafik konstrukcyjny',
    avatarColor: '#15aabf',
    permissions: ['orders.view', 'files.all', 'prepress.all'],
    pin: '0002',
  },
  {
    id: '3',
    email: 'patryk.wachowiak',
    name: 'Patryk Wachowiak',
    initials: 'PW',
    role: 'operator',
    department: 'Drukarz produkcyjny',
    avatarColor: '#f08c00',
    permissions: ['orders.view', 'production.all', 'active-work.all'],
    pin: '0003',
  },
  {
    id: '4',
    email: 'przemyslaw.piktus',
    name: 'Przemysław Piktus',
    initials: 'PP',
    role: 'administrator',
    department: 'Menedżer drukarni',
    avatarColor: '#7950f2',
    permissions: ['all'],
    pin: '0004',
  },
  {
    id: '5',
    email: 'aleksandra.janiszewska',
    name: 'Aleksandra Janiszewska',
    initials: 'AJ',
    role: 'administrator',
    department: 'Menedżer biura',
    avatarColor: '#e64980',
    permissions: ['orders.view', 'orders.create', 'customers.view', 'customers.create', 'quotes.all', 'invoices.all', 'reports.view'],
    pin: '0005',
  },
  {
    id: '6',
    email: 'marek.nawrocki',
    name: 'Marek Nawrocki',
    initials: 'MN',
    role: 'owner',
    department: 'CEO',
    avatarColor: '#212529',
    permissions: ['all'],
    pin: '0006',
  },
  {
    id: '7',
    email: 'lukasz.jenczak',
    name: 'Łukasz Jenczak',
    initials: 'ŁJ',
    role: 'operator',
    department: 'Kierownik produkcji',
    avatarColor: '#2b8a3e',
    permissions: ['orders.view', 'production.all', 'active-work.all', 'inventory.all'],
    pin: '0007',
  },
  {
    id: '8',
    email: 'kacper.pilarski',
    name: 'Kacper Pilarski',
    initials: 'KP',
    role: 'sales',
    department: 'Specjalista ds. handlowych',
    avatarColor: '#fab005',
    permissions: ['orders.view', 'orders.create', 'customers.view', 'customers.create', 'quotes.all'],
    pin: '0008',
  },
  {
    id: '9',
    email: 'maciej.idziak',
    name: 'Maciej Idziak',
    initials: 'MI',
    role: 'operator',
    department: 'Introligator',
    avatarColor: '#2f9e44',
    permissions: ['orders.view', 'production.all', 'active-work.all'],
    pin: '0009',
  },
  {
    id: '10',
    email: 'norbert.skowronski',
    name: 'Norbert Skowroński',
    initials: 'NS',
    role: 'operator',
    department: 'Introligator',
    avatarColor: '#00b8a9',
    permissions: ['orders.view', 'production.all', 'active-work.all'],
    pin: '0010',
  },
  {
    id: '11',
    email: 'iryna.szczepanek',
    name: 'Iryna Szczepanek',
    initials: 'IS',
    role: 'operator',
    department: 'Introligator',
    avatarColor: '#099268',
    permissions: ['orders.view', 'production.all', 'active-work.all'],
    pin: '0011',
  },
  {
    id: '12',
    email: 'pomoc.produkcji1',
    name: 'Pomoc produkcji 1',
    initials: 'P1',
    role: 'operator',
    department: 'Pomoc produkcji',
    avatarColor: '#74b816',
    permissions: ['orders.view', 'production.all', 'active-work.all'],
    pin: '0012',
  },
  {
    id: '13',
    email: 'pomoc.produkcji2',
    name: 'Pomoc produkcji 2',
    initials: 'P2',
    role: 'operator',
    department: 'Pomoc produkcji',
    avatarColor: '#82c91e',
    permissions: ['orders.view', 'production.all', 'active-work.all'],
    pin: '0013',
  },
  {
    id: '14',
    email: 'pomoc.produkcji3',
    name: 'Pomoc produkcji 3',
    initials: 'P3',
    role: 'operator',
    department: 'Pomoc produkcji',
    avatarColor: '#94d82d',
    permissions: ['orders.view', 'production.all', 'active-work.all'],
    pin: '0014',
  },
]

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: 'Administrator',
  owner: 'Właściciel',
  sales: 'Handlowiec',
  designer: 'Grafik',
  prepress: 'DTP / Prepress',
  operator: 'Operator produkcji',
  logistics: 'Logistyka',
  accounting: 'Księgowość',
  marketing: 'Marketing',
  quality: 'Kontrola jakości',
  warehouse: 'Magazyn',
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  rememberMe: boolean
  sessionExpiresAt: number | null
  hasHydrated: boolean

  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>
  loginWithPin: (userId: string, pin: string) => Promise<boolean>
  validateSession: () => void
  setHasHydrated: (value: boolean) => void
  logout: () => void
  clearError: () => void
}

function stripPin(user: User & { pin?: string }): User {
  const { pin: _pin, ...safeUser } = user
  return safeUser
}

function createSession(user: User & { pin?: string }, rememberMe = false) {
  return {
    user: stripPin(user),
    isAuthenticated: true,
    isLoading: false,
    error: null,
    rememberMe,
    sessionExpiresAt: Date.now() + (rememberMe ? REMEMBER_SESSION_TTL_MS : SESSION_TTL_MS),
  }
}

const emptySession = {
  user: null,
  isAuthenticated: false,
  rememberMe: false,
  sessionExpiresAt: null,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      rememberMe: false,
      sessionExpiresAt: null,
      hasHydrated: false,

      login: async (email: string, password: string, rememberMe = false) => {
        set({ isLoading: true, error: null })

        await new Promise((resolve) => setTimeout(resolve, 800))

        const login = email.trim().toLowerCase()
        const user = DEMO_USERS.find((item) => item.email.toLowerCase() === login)

        if (user && user.pin === password) {
          set(createSession(user, rememberMe))
          return true
        }

        set({
          error: 'Nieprawidłowy login lub hasło',
          isLoading: false,
        })
        return false
      },

      loginWithPin: async (userId: string, pin: string) => {
        set({ isLoading: true, error: null })

        await new Promise((resolve) => setTimeout(resolve, 400))

        const user = DEMO_USERS.find((item) => item.id === userId)

        if (user && user.pin === pin) {
          set(createSession(user))
          return true
        }

        set({
          error: 'Nieprawidłowy PIN',
          isLoading: false,
        })
        return false
      },

      validateSession: () => {
        set((state) => {
          if (!state.isAuthenticated || !state.user) {
            return { ...emptySession, isLoading: false }
          }

          if (!state.sessionExpiresAt || state.sessionExpiresAt <= Date.now()) {
            return { ...emptySession, isLoading: false, error: 'Sesja wygasła. Zaloguj się ponownie.' }
          }

          const latestUser = DEMO_USERS.find((item) => item.id === state.user?.id)
          return latestUser ? { user: stripPin(latestUser) } : {}
        })
      },

      setHasHydrated: (value: boolean) => {
        set({ hasHydrated: value })
      },

      logout: () => {
        set({
          ...emptySession,
          error: null,
          isLoading: false,
        })
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'madi-flow-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.validateSession()
        state?.setHasHydrated(true)
      },
    }
  )
)
