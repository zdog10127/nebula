// Native OS notifications (the Notification API — works both in the Electron renderer,
// via Chromium's native bridge, and in a regular browser tab once permission is granted).
// This is deliberately separate from lib/push.ts: push.ts is for *background* web-push
// (app closed, service worker wakes up) and needs a VAPID-configured backend that isn't
// wired up anywhere yet. This is simpler — "the app is open, ping me when something
// happens I'm not looking at" — and needs nothing from the backend at all.

export function isNotificationSupported(): boolean {
  return typeof Notification !== 'undefined'
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch {
    return false
  }
}

export function showNotification(
  title: string,
  options?: NotificationOptions & { onClick?: () => void },
): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  const { onClick, ...rest } = options ?? {}
  try {
    const notification = new Notification(title, rest)
    if (onClick) {
      notification.onclick = () => {
        window.focus()
        onClick()
        notification.close()
      }
    }
  } catch (err) {
    console.warn('Could not show notification', err)
  }
}
