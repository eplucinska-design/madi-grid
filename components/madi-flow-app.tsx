'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'
import { LoginScreen } from './login-screen'
import { AppShell } from './layout/app-shell'
import { ContentRouter } from './content-router'

export function MadiFlowApp() {
  const { isAuthenticated, hasHydrated, validateSession } = useAuthStore()

  useEffect(() => {
    if (hasHydrated) {
      validateSession()
    }
  }, [hasHydrated, validateSession])

  if (!hasHydrated) {
    return (
      <div className="fixed inset-0 z-[5000] grid place-items-center bg-[#0a0a09] text-[#f4f4ef]">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#f4f4ef] text-[#11110f] shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <p className="text-sm font-semibold tracking-wide">MADI GRID</p>
          <p className="mt-2 text-xs text-white/45">Przywracanie sesji...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <AppShell>
      <ContentRouter />
    </AppShell>
  )
}
