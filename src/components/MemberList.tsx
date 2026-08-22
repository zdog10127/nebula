import { Gamepad2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { apiGet } from '../api/client'
import type { MemberDto, MyPermissionsDto, PresenceStatus, RoleDto } from '../api/types'
import { isHubConnected, useChatHub } from '../hubs/ChatHubContext'
import { hasPermission } from '../lib/permissions'
import { STATUS_DOT_CLASS, STATUS_LABEL } from '../lib/presence'
import { useProfileCard } from '../lib/ProfileCardContext'
import Avatar from './Avatar'
import RoleAssignMenu from './RoleAssignMenu'

export default function MemberList({ serverId }: { serverId: string }) {
  const [members, setMembers] = useState<MemberDto[]>([])
  const [roles, setRoles] = useState<RoleDto[]>([])
  const [myPermissions, setMyPermissions] = useState<MyPermissionsDto | null>(null)
  const [roleMenu, setRoleMenu] = useState<{ x: number; y: number; memberId: string } | null>(null)
  const connection = useChatHub()
  const canManageRoles = hasPermission(myPermissions, 'ManageRoles')

  useEffect(() => {
    let cancelled = false
    void apiGet<MemberDto[]>(`/api/servers/${serverId}/members`).then((list) => {
      if (!cancelled) setMembers(list)
    })
    void apiGet<RoleDto[]>(`/api/servers/${serverId}/roles`).then((list) => {
      if (!cancelled) setRoles(list)
    })
    void apiGet<MyPermissionsDto>(`/api/servers/${serverId}/my-permissions`).then((p) => {
      if (!cancelled) setMyPermissions(p)
    })
    return () => {
      cancelled = true
    }
    // Re-fetch once the hub connects too: presence may have changed between
    // the initial fetch and the hub handshake completing.
  }, [serverId, isHubConnected(connection)])

  useEffect(() => {
    if (!connection) return

    const onPresence = (userId: string, status: PresenceStatus) => {
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, status } : m)))
    }
    const onCustomStatus = (userId: string, text: string | null, emoji: string | null) => {
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, customStatusText: text, customStatusEmoji: emoji } : m)),
      )
    }
    const onActivity = (userId: string, activity: string | null) => {
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, currentActivity: activity } : m)))
    }

    connection.on('PresenceChanged', onPresence)
    connection.on('CustomStatusChanged', onCustomStatus)
    connection.on('ActivityChanged', onActivity)
    return () => {
      connection.off('PresenceChanged', onPresence)
      connection.off('CustomStatusChanged', onCustomStatus)
      connection.off('ActivityChanged', onActivity)
    }
  }, [connection])

  const rolesById = new Map(roles.map((r) => [r.id, r]))
  const online = members.filter((m) => m.status !== 'Offline')
  const offline = members.filter((m) => m.status === 'Offline')
  const roleMenuMember = roleMenu ? members.find((m) => m.userId === roleMenu.memberId) : undefined

  function handleContextMenu(e: MouseEvent, member: MemberDto) {
    if (!canManageRoles) return
    e.preventDefault()
    setRoleMenu({ x: e.clientX, y: e.clientY, memberId: member.userId })
  }

  return (
    <aside className="hidden w-60 shrink-0 overflow-y-auto border-l border-border bg-canvas p-3 lg:block">
      <MemberGroup title={`Online — ${online.length}`}>
        {online.map((m) => (
          <MemberRow key={m.userId} member={m} rolesById={rolesById} roles={roles} onContextMenu={handleContextMenu} />
        ))}
      </MemberGroup>
      <MemberGroup title={`Offline — ${offline.length}`}>
        {offline.map((m) => (
          <MemberRow key={m.userId} member={m} rolesById={rolesById} roles={roles} onContextMenu={handleContextMenu} />
        ))}
      </MemberGroup>
      {roleMenu && roleMenuMember && (
        <RoleAssignMenu
          x={roleMenu.x}
          y={roleMenu.y}
          serverId={serverId}
          memberUserId={roleMenuMember.userId}
          memberName={roleMenuMember.nickname ?? roleMenuMember.displayName}
          roles={roles}
          assignedRoleIds={roleMenuMember.roleIds}
          onClose={() => setRoleMenu(null)}
          onToggled={(roleId, assigned) => {
            setMembers((prev) =>
              prev.map((mm) =>
                mm.userId === roleMenuMember.userId
                  ? { ...mm, roleIds: assigned ? [...mm.roleIds, roleId] : mm.roleIds.filter((id) => id !== roleId) }
                  : mm,
              ),
            )
          }}
        />
      )}
    </aside>
  )
}

function MemberGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">{title}</h4>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function MemberRow({
  member,
  rolesById,
  roles,
  onContextMenu,
}: {
  member: MemberDto
  rolesById: Map<string, RoleDto>
  roles: RoleDto[]
  onContextMenu: (e: MouseEvent, member: MemberDto) => void
}) {
  const { openProfile } = useProfileCard()
  const memberRoles = member.roleIds.map((id) => rolesById.get(id)).filter((r): r is RoleDto => !!r)

  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-panel-hover"
      onClick={() =>
        openProfile({
          userId: member.userId,
          memberContext: { roleIds: member.roleIds, joinedAt: member.joinedAt, isOwner: member.isOwner, roles },
        })
      }
      onContextMenu={(e) => onContextMenu(e, member)}
    >
      <div className="relative shrink-0">
        <Avatar url={member.avatarUrl} name={member.nickname ?? member.displayName} size={26} />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-canvas ${STATUS_DOT_CLASS[member.status]}`}
          title={STATUS_LABEL[member.status]}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`truncate ${member.status === 'Offline' ? 'text-muted-foreground' : 'text-foreground'}`}>
            {member.nickname ?? member.displayName}
          </span>
          {member.isOwner && (
            <span className="shrink-0 rounded border border-accent-border px-1 text-[10px] font-semibold text-accent">
              Owner
            </span>
          )}
          {memberRoles.map((role) => (
            <span
              key={role.id}
              className="shrink-0 rounded border px-1 text-[10px] font-semibold"
              style={{ color: role.color, borderColor: `${role.color}80` }}
            >
              {role.name}
            </span>
          ))}
        </div>
        {member.currentActivity && (
          <div className="flex items-center gap-1 truncate text-xs text-accent">
            <Gamepad2 size={11} className="shrink-0" />
            <span className="truncate">Jogando {member.currentActivity}</span>
          </div>
        )}
        {member.customStatusText && (
          <div className="truncate text-xs text-muted-foreground">
            {member.customStatusEmoji && <span className="mr-1">{member.customStatusEmoji}</span>}
            {member.customStatusText}
          </div>
        )}
      </div>
    </button>
  )
}
