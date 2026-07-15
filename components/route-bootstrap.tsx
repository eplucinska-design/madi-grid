'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store/app-store'
import { useOrdersStore } from '@/lib/store/orders-store'
import { MadiFlowApp } from '@/components/madi-flow-app'
import type { ModuleId } from '@/lib/types'

interface RouteBootstrapProps {
  module: ModuleId
  orderId?: string
}

/**
 * Renders the full MADI GRID app but forces a specific module (and optional
 * selected order) on mount. Used by the deep-link routes so that
 * "Otwórz w nowej karcie" opens a standalone view of that section.
 */
export function RouteBootstrap({ module, orderId }: RouteBootstrapProps) {
  const setCurrentModule = useAppStore((s) => s.setCurrentModule)
  const selectAppOrder = useAppStore((s) => s.selectOrder)
  const selectOrder = useOrdersStore((s) => s.selectOrder)

  useEffect(() => {
    setCurrentModule(module)
    if (orderId) {
      selectOrder(orderId)
      selectAppOrder(orderId)
    }
  }, [module, orderId, setCurrentModule, selectOrder, selectAppOrder])

  return <MadiFlowApp />
}
