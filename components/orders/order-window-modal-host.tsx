'use client'

import { useEffect, useState } from 'react'
import { OrderWorkWindow } from '@/components/orders/order-work-window'
import {
  MADI_OPEN_ORDER_WINDOW_EVENT,
  type OpenOrderWindowEventDetail,
} from '@/lib/utils/order-links'

export function OrderWindowModalHost() {
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    window.__madiOrderWindowHostReady = true

    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenOrderWindowEventDetail>).detail
      const nextOrderId = detail?.orderId?.trim() || detail?.fallbackOrderNumber?.trim()
      if (nextOrderId) setOrderId(nextOrderId)
    }

    window.addEventListener(MADI_OPEN_ORDER_WINDOW_EVENT, handleOpen)
    return () => {
      window.removeEventListener(MADI_OPEN_ORDER_WINDOW_EVENT, handleOpen)
      window.__madiOrderWindowHostReady = false
    }
  }, [])

  useEffect(() => {
    if (!orderId) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOrderId(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [orderId])

  if (!orderId) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Okno zlecenia"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/55 p-5 text-foreground backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOrderId(null)
      }}
    >
      <OrderWorkWindow orderId={orderId} variant="modal" onClose={() => setOrderId(null)} />
    </div>
  )
}
