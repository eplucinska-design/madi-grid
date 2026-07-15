export const MADI_OPEN_ORDER_WINDOW_EVENT = 'madi:open-order-window'

export interface OpenOrderWindowEventDetail {
  orderId: string
  fallbackOrderNumber?: string
}

declare global {
  interface Window {
    __madiOrderWindowHostReady?: boolean
  }
}

function popupOrderWindow(orderId: string) {
  const width = Math.min(1360, Math.max(1040, window.screen.availWidth - 120))
  const height = Math.min(900, Math.max(720, window.screen.availHeight - 90))
  const left = Math.max(20, Math.round((window.screen.availWidth - width) / 2))
  const top = Math.max(20, Math.round((window.screen.availHeight - height) / 2))
  const url = `${window.location.origin}/jobs/${encodeURIComponent(orderId)}`
  const target = `madi-order-${orderId.replace(/[^a-z0-9_-]/gi, '-')}`
  const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  return window.open(url, target, features)
}

export function openStandaloneOrderWindow(orderId?: string, fallbackOrderNumber?: string) {
  if (typeof window === 'undefined') return
  const rawId = (orderId || fallbackOrderNumber || '').trim()
  if (!rawId) return

  const opened = popupOrderWindow(rawId)

  if (opened) {
    opened.focus()
    return
  }

  window.location.assign(`${window.location.origin}/jobs/${encodeURIComponent(rawId)}`)
}

export function openOrderWindow(orderId?: string, fallbackOrderNumber?: string) {
  if (typeof window === 'undefined') return
  const rawId = (orderId || fallbackOrderNumber || '').trim()
  if (!rawId) return

  if (window.__madiOrderWindowHostReady) {
    window.dispatchEvent(
      new CustomEvent<OpenOrderWindowEventDetail>(MADI_OPEN_ORDER_WINDOW_EVENT, {
        detail: {
          orderId: rawId,
          fallbackOrderNumber,
        },
      })
    )
    return
  }

  openStandaloneOrderWindow(rawId, fallbackOrderNumber)
}
