'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store/app-store'
import { currentBrowserUrl, moduleFromLocation, moduleToUrl } from '@/lib/utils/module-routes'

export function ModuleHistorySync() {
  const router = useRouter()
  const currentModule = useAppStore((s) => s.currentModule)
  const setCurrentModule = useAppStore((s) => s.setCurrentModule)
  const [locationReady, setLocationReady] = useState(false)
  const skipNextPushRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const moduleFromUrl = moduleFromLocation(window.location.pathname, window.location.search)
    if (moduleFromUrl !== useAppStore.getState().currentModule) {
      skipNextPushRef.current = true
      setCurrentModule(moduleFromUrl)
    }

    setLocationReady(true)
  }, [setCurrentModule])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      const moduleFromUrl = moduleFromLocation(window.location.pathname, window.location.search)
      if (moduleFromUrl !== useAppStore.getState().currentModule) {
        skipNextPushRef.current = true
        setCurrentModule(moduleFromUrl)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [setCurrentModule])

  useEffect(() => {
    if (!locationReady || typeof window === 'undefined') return

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false
      return
    }

    const targetUrl = moduleToUrl(currentModule)
    if (targetUrl !== currentBrowserUrl()) {
      const currentPath = window.location.pathname
      const targetPath = targetUrl.split('?')[0] || '/'
      const crossesAppRoute =
        (currentPath.startsWith('/estimates') && !targetPath.startsWith('/estimates')) ||
        (!currentPath.startsWith('/estimates') && targetPath.startsWith('/estimates')) ||
        (currentPath.startsWith('/jobs') && !targetPath.startsWith('/jobs')) ||
        (!currentPath.startsWith('/jobs') && targetPath.startsWith('/jobs')) ||
        (currentPath.startsWith('/studio') && !targetPath.startsWith('/studio')) ||
        (!currentPath.startsWith('/studio') && targetPath.startsWith('/studio')) ||
        (currentPath.startsWith('/logs') && !targetPath.startsWith('/logs')) ||
        (!currentPath.startsWith('/logs') && targetPath.startsWith('/logs')) ||
        (currentPath.startsWith('/production') && !targetPath.startsWith('/production')) ||
        (!currentPath.startsWith('/production') && targetPath.startsWith('/production'))

      if (crossesAppRoute) {
        router.push(targetUrl)
        return
      }

      window.history.pushState({ madiModule: currentModule }, '', targetUrl)
    }
  }, [currentModule, locationReady, router])

  return null
}
