import type { PresenceStatus } from '../api/types'

export const STATUS_LABEL: Record<PresenceStatus, string> = {
  Online: 'Online',
  Away: 'Ausente',
  DoNotDisturb: 'Não perturbe',
  Invisible: 'Invisível',
  Offline: 'Offline',
}

export const STATUS_DOT_CLASS: Record<PresenceStatus, string> = {
  Online: 'bg-online',
  Away: 'bg-away',
  DoNotDisturb: 'bg-dnd',
  Invisible: 'bg-offline',
  Offline: 'bg-offline',
}
