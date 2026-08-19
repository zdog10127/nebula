import { apiGet, apiPost } from '../api/client'

export function isPushSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) throw new Error('Notificações push não são suportadas neste navegador.')

  const { publicKey } = await apiGet<{ publicKey: string | null }>('/api/push/vapid-public-key')
  if (!publicKey) throw new Error('Notificações push não estão configuradas no servidor.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permissão de notificação negada.')

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const json = subscription.toJSON()
  await apiPost('/api/push/subscribe', {
    endpoint: json.endpoint,
    p256dhKey: json.keys?.p256dh,
    authKey: json.keys?.auth,
  })
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await apiPost('/api/push/unsubscribe', { endpoint })
}
