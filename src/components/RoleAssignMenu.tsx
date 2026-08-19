import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ApiError, apiDelete, apiPut } from '../api/client'
import type { RoleDto } from '../api/types'
import { useToast } from '../lib/ToastContext'

export default function RoleAssignMenu({
  x,
  y,
  serverId,
  memberUserId,
  memberName,
  roles,
  assignedRoleIds,
  onClose,
  onToggled,
}: {
  x: number
  y: number
  serverId: string
  memberUserId: string
  memberName: string
  roles: RoleDto[]
  assignedRoleIds: string[]
  onClose: () => void
  onToggled: (roleId: string, assigned: boolean) => void
}) {
  const toast = useToast()
  const rootRef = useRef<HTMLDivElement>(null)
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [onClose])

  async function toggle(role: RoleDto) {
    const isAssigned = assignedRoleIds.includes(role.id)
    setPendingRoleId(role.id)
    try {
      if (isAssigned) {
        await apiDelete(`/api/servers/${serverId}/members/${memberUserId}/roles/${role.id}`)
      } else {
        await apiPut(`/api/servers/${serverId}/members/${memberUserId}/roles/${role.id}`)
      }
      onToggled(role.id, !isAssigned)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao atualizar cargo.')
    } finally {
      setPendingRoleId(null)
    }
  }

  const menuWidth = 224
  const left = Math.min(x, window.innerWidth - menuWidth - 8)
  const top = Math.min(y, window.innerHeight - 60 - roles.length * 34 - 8)

  return (
    <div
      ref={rootRef}
      className="card fixed z-50 w-56 p-1.5"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
    >
      <div className="truncate px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
        Cargos de {memberName}
      </div>
      {roles.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">Nenhum cargo criado ainda.</p>}
      <div className="flex flex-col gap-0.5">
        {roles.map((role) => {
          const isAssigned = assignedRoleIds.includes(role.id)
          return (
            <button
              key={role.id}
              type="button"
              disabled={pendingRoleId === role.id}
              onClick={() => void toggle(role)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-panel-hover disabled:opacity-50"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
              <span className="min-w-0 flex-1 truncate" style={{ color: role.color }}>
                {role.name}
              </span>
              {isAssigned && <Check size={14} className="shrink-0 text-accent" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
