'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store/app-store'
import { currentBrowserUrl, moduleFromLocation, moduleToUrl } from '@/lib/utils/module-routes'

export function ModuleHistorySync() {
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
      window.history.pushState({ madiModule: currentModule }, '', targetUrl)
    }
  }, [currentModule, locationReady])

  return null
}

