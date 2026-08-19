import { Ban, Copy, Pencil, Plus, Shield, Trash2, UserX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut, apiUpload } from '../api/client'
import type { BanDto, CustomEmojiDto, InviteDto, MemberDto, MyPermissionsDto, RoleDto, ServerDetail, ServerPermission } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ALL_PERMISSIONS, hasPermission } from '../lib/permissions'
import { useToast } from '../lib/ToastContext'
import { useServers } from '../servers/ServersContext'
import Avatar from './Avatar'
import ConfirmModal from './ConfirmModal'
import Modal from './Modal'

interface Props {
  server: ServerDetail
  onClose: () => void
  onUpdated: () => Promise<void>
}

type Tab = 'general' | 'roles' | 'members' | 'bans' | 'invites' | 'emojis'

export default function ServerSettingsModal({ server, onClose, onUpdated }: Props) {
  const { user } = useAuth()
  const [myPermissions, setMyPermissions] = useState<MyPermissionsDto | null>(null)
  const [roles, setRoles] = useState<RoleDto[]>([])
  const [members, setMembers] = useState<MemberDto[]>([])
  const [bans, setBans] = useState<BanDto[]>([])
  const [invites, setInvites] = useState<InviteDto[]>([])
  const [emojis, setEmojis] = useState<CustomEmojiDto[]>([])
  const [tab, setTab] = useState<Tab>('general')

  useEffect(() => {
    void apiGet<MyPermissionsDto>(`/api/servers/${server.id}/my-permissions`).then(setMyPermissions)
    void refreshRoles()
    void refreshMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server.id])

  async function refreshRoles() {
    setRoles(await apiGet<RoleDto[]>(`/api/servers/${server.id}/roles`))
  }

  async function refreshMembers() {
    setMembers(await apiGet<MemberDto[]>(`/api/servers/${server.id}/members`))
  }

  async function refreshBans() {
    setBans(await apiGet<BanDto[]>(`/api/servers/${server.id}/bans`))
  }

  async function refreshInvites() {
    setInvites(await apiGet<InviteDto[]>(`/api/servers/${server.id}/invites`))
  }

  async function refreshEmojis() {
    setEmojis(await apiGet<CustomEmojiDto[]>(`/api/servers/${server.id}/emojis`))
  }

  const canGeneral = hasPermission(myPermissions, 'ManageServer')
  const canRoles = hasPermission(myPermissions, 'ManageRoles')
  const canBans = hasPermission(myPermissions, 'BanMembers')
  const canInvites = hasPermission(myPermissions, 'ManageServer')
  const canEmojis = hasPermission(myPermissions, 'ManageEmojis')

  const tabs: { id: Tab; label: string }[] = [
    ...(canGeneral ? [{ id: 'general' as const, label: 'Geral' }] : []),
    ...(canRoles ? [{ id: 'roles' as const, label: 'Cargos' }] : []),
    { id: 'members', label: 'Membros' },
    ...(canBans ? [{ id: 'bans' as const, label: 'Banidos' }] : []),
    ...(canInvites ? [{ id: 'invites' as const, label: 'Convites' }] : []),
    ...(canEmojis ? [{ id: 'emojis' as const, label: 'Emojis' }] : []),
  ]

  useEffect(() => {
    if (myPermissions && !tabs.some((t) => t.id === tab)) setTab(tabs[0]?.id ?? 'members')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPermissions])

  useEffect(() => {
    if (tab === 'bans' && canBans) void refreshBans()
    if (tab === 'invites' && canInvites) void refreshInvites()
    if (tab === 'emojis' && canEmojis) void refreshEmojis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <Modal title="Configurações do servidor" onClose={onClose} size="lg">
      <div className="flex gap-4">
        <div className="flex w-36 shrink-0 flex-col gap-0.5 border-r border-border pr-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                tab === t.id ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-panel-hover hover:text-foreground'
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] min-w-0 flex-1 overflow-y-auto">
          {tab === 'general' && (
            <GeneralTab server={server} isOwner={!!myPermissions?.isOwner} onUpdated={onUpdated} onClose={onClose} />
          )}
          {tab === 'roles' && <RolesTab serverId={server.id} roles={roles} onRefresh={refreshRoles} />}
          {tab === 'members' && (
            <MembersTab
              serverId={server.id}
              members={members}
              roles={roles}
              myPermissions={myPermissions}
              currentUserId={user?.userId}
              onRefreshMembers={refreshMembers}
            />
          )}
          {tab === 'bans' && <BansTab serverId={server.id} bans={bans} onRefresh={refreshBans} />}
          {tab === 'invites' && <InvitesTab serverId={server.id} invites={invites} onRefresh={refreshInvites} />}
          {tab === 'emojis' && <EmojisTab serverId={server.id} emojis={emojis} onRefresh={refreshEmojis} />}
        </div>
      </div>
    </Modal>
  )
}

function GeneralTab({
  server,
  isOwner,
  onUpdated,
  onClose,
}: {
  server: ServerDetail
  isOwner: boolean
  onUpdated: () => Promise<void>
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { refresh } = useServers()
  const toast = useToast()
  const [name, setName] = useState(server.name)
  const [description, setDescription] = useState(server.description ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      await apiPatch(`/api/servers/${server.id}`, { name, description })
      await onUpdated()
      toast.success('Servidor atualizado!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao salvar.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleIconChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingIcon(true)
    try {
      await apiUpload(`/api/servers/${server.id}/icon`, file)
      await onUpdated()
      toast.success('Ícone atualizado!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar ícone.')
    } finally {
      setIsUploadingIcon(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await apiDelete(`/api/servers/${server.id}`)
      await refresh()
      onClose()
      navigate('/app')
      toast.success('Servidor excluído.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir servidor.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar url={server.iconUrl} name={server.name} size={64} />
        <label className="btn btn-secondary cursor-pointer">
          {isUploadingIcon ? 'Enviando...' : 'Trocar ícone'}
          <input type="file" accept="image/*" onChange={(e) => void handleIconChange(e)} disabled={isUploadingIcon} hidden />
        </label>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <label className="label">
          Nome do servidor
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} />
        </label>
        <label className="label">
          Descrição
          <textarea
            className="field resize-none"
            rows={3}
            maxLength={1024}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Sobre o que é esse servidor?"
          />
        </label>
        <button type="submit" className="btn btn-secondary self-start" disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>

      {isOwner && (
        <div className="rounded-lg border border-dnd/30 p-3">
          <h4 className="mb-1 text-sm font-semibold text-dnd">Zona de perigo</h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Excluir o servidor apaga permanentemente todos os canais, mensagens e cargos. Essa ação não pode ser desfeita.
          </p>
          <label className="label mb-2">
            Digite <strong className="text-foreground">{server.name}</strong> para confirmar
            <input className="field" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn btn-danger"
            disabled={confirmText !== server.name || isDeleting}
            onClick={() => void handleDelete()}
          >
            <Trash2 size={15} />
            {isDeleting ? 'Excluindo...' : 'Excluir servidor'}
          </button>
        </div>
      )}
    </div>
  )
}

function RolesTab({ serverId, roles, onRefresh }: { serverId: string; roles: RoleDto[]; onRefresh: () => Promise<void> }) {
  const toast = useToast()
  const [mode, setMode] = useState<{ type: 'list' } | { type: 'edit'; role: RoleDto | null }>({ type: 'list' })
  const [pendingDelete, setPendingDelete] = useState<RoleDto | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function confirmDeleteRole() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await apiDelete(`/api/servers/${serverId}/roles/${pendingDelete.id}`)
      await onRefresh()
      toast.success('Cargo excluído.')
      setPendingDelete(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir cargo.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (mode.type === 'edit') {
    return (
      <RoleForm
        serverId={serverId}
        role={mode.role}
        onDone={() => {
          setMode({ type: 'list' })
          void onRefresh()
        }}
        onCancel={() => setMode({ type: 'list' })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" className="btn btn-secondary self-start" onClick={() => setMode({ type: 'edit', role: null })}>
        <Plus size={15} /> Criar cargo
      </button>
      <div className="flex flex-col gap-1">
        {roles.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cargo criado ainda.</p>}
        {roles.map((role) => (
          <div key={role.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-panel-hover">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: role.color }} />
            <span className="flex-1 truncate text-sm text-foreground">{role.name}</span>
            <button type="button" className="icon-btn h-7 w-7" onClick={() => setMode({ type: 'edit', role })} title="Editar">
              <Pencil size={13} />
            </button>
            <button
              type="button"
              className="icon-btn h-7 w-7 hover:text-dnd"
              onClick={() => setPendingDelete(role)}
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {pendingDelete && (
        <ConfirmModal
          title="Excluir cargo"
          message={`Tem certeza que quer excluir o cargo "${pendingDelete.name}"? Ele será removido de todos os membros que o possuem.`}
          confirmLabel="Excluir"
          isLoading={isDeleting}
          onConfirm={() => void confirmDeleteRole()}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}

function RoleForm({
  serverId,
  role,
  onDone,
  onCancel,
}: {
  serverId: string
  role: RoleDto | null
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState(role?.name ?? 'Novo cargo')
  const [color, setColor] = useState(role?.color ?? '#99aab5')
  const [permissions, setPermissions] = useState<Set<ServerPermission>>(new Set(role?.permissions ?? []))
  const [isSaving, setIsSaving] = useState(false)

  function togglePermission(p: ServerPermission) {
    setPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      const body = { name, color, permissions: Array.from(permissions) }
      if (role) await apiPatch(`/api/servers/${serverId}/roles/${role.id}`, body)
      else await apiPost(`/api/servers/${serverId}/roles`, body)
      toast.success('Cargo salvo!')
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao salvar cargo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border border-border-strong bg-raised"
        />
        <input className="field flex-1" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={50} />
      </div>
      <div>
        <p className="label mb-2">Permissões</p>
        <div className="flex flex-col gap-1.5">
          {ALL_PERMISSIONS.map((p) => (
            <label key={p.value} className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-panel-hover">
              <input type="checkbox" className="mt-0.5" checked={permissions.has(p.value)} onChange={() => togglePermission(p.value)} />
              <span>
                <span className="block text-sm text-foreground">{p.label}</span>
                <span className="block text-xs text-muted-foreground">{p.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function MembersTab({
  serverId,
  members,
  roles,
  myPermissions,
  currentUserId,
  onRefreshMembers,
}: {
  serverId: string
  members: MemberDto[]
  roles: RoleDto[]
  myPermissions: MyPermissionsDto | null
  currentUserId: string | undefined
  onRefreshMembers: () => Promise<void>
}) {
  const toast = useToast()
  const canManageRoles = hasPermission(myPermissions, 'ManageRoles')
  const canKick = hasPermission(myPermissions, 'KickMembers')
  const canBan = hasPermission(myPermissions, 'BanMembers')
  const [pendingAction, setPendingAction] = useState<{ type: 'kick' | 'ban'; member: MemberDto } | null>(null)
  const [isActing, setIsActing] = useState(false)

  async function toggleRole(member: MemberDto, role: RoleDto) {
    try {
      if (member.roleIds.includes(role.id)) await apiDelete(`/api/servers/${serverId}/members/${member.userId}/roles/${role.id}`)
      else await apiPut(`/api/servers/${serverId}/members/${member.userId}/roles/${role.id}`)
      await onRefreshMembers()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao alterar cargo.')
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return
    setIsActing(true)
    try {
      if (pendingAction.type === 'kick') {
        await apiDelete(`/api/servers/${serverId}/members/${pendingAction.member.userId}`)
        toast.success(`${pendingAction.member.displayName} foi removido do servidor.`)
      } else {
        await apiPost(`/api/servers/${serverId}/bans/${pendingAction.member.userId}`, {})
        toast.success(`${pendingAction.member.displayName} foi banido do servidor.`)
      }
      await onRefreshMembers()
      setPendingAction(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao concluir a ação.')
    } finally {
      setIsActing(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {members.map((member) => (
        <div key={member.userId} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-panel-hover">
          <Avatar url={member.avatarUrl} name={member.displayName} size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-foreground">{member.nickname ?? member.displayName}</div>
            <div className="flex flex-wrap gap-1.5">
              {member.isOwner && <span className="text-[10px] font-semibold text-accent">Owner</span>}
              {member.roleIds.map((id) => {
                const role = roles.find((r) => r.id === id)
                return role ? (
                  <span key={id} className="text-[10px] font-semibold" style={{ color: role.color }}>
                    {role.name}
                  </span>
                ) : null
              })}
            </div>
          </div>
          {canManageRoles && !member.isOwner && (
            <RoleAssignPopover roles={roles} member={member} onToggle={(role) => void toggleRole(member, role)} />
          )}
          {!member.isOwner && member.userId !== currentUserId && (
            <>
              {canKick && (
                <button
                  type="button"
                  className="icon-btn h-7 w-7"
                  onClick={() => setPendingAction({ type: 'kick', member })}
                  title="Expulsar"
                >
                  <UserX size={14} />
                </button>
              )}
              {canBan && (
                <button
                  type="button"
                  className="icon-btn h-7 w-7 hover:text-dnd"
                  onClick={() => setPendingAction({ type: 'ban', member })}
                  title="Banir"
                >
                  <Ban size={14} />
                </button>
              )}
            </>
          )}
        </div>
      ))}

      {pendingAction && (
        <ConfirmModal
          title={pendingAction.type === 'kick' ? 'Expulsar membro' : 'Banir membro'}
          message={
            pendingAction.type === 'kick'
              ? `Tem certeza que quer expulsar ${pendingAction.member.displayName} do servidor? A pessoa pode entrar novamente com um convite.`
              : `Tem certeza que quer banir ${pendingAction.member.displayName}? A pessoa não poderá voltar a entrar até ser desbanida.`
          }
          confirmLabel={pendingAction.type === 'kick' ? 'Expulsar' : 'Banir'}
          isLoading={isActing}
          onConfirm={() => void confirmPendingAction()}
          onClose={() => setPendingAction(null)}
        />
      )}
    </div>
  )
}

function RoleAssignPopover({
  roles,
  member,
  onToggle,
}: {
  roles: RoleDto[]
  member: MemberDto
  onToggle: (role: RoleDto) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button type="button" className="icon-btn h-7 w-7" onClick={() => setOpen((v) => !v)} title="Cargos">
        <Shield size={14} />
      </button>
      {open && (
        <div className="card shadow-pop absolute right-0 top-full z-50 mt-1 w-48 p-1.5">
          {roles.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">Nenhum cargo criado.</p>}
          {roles.map((role) => (
            <label key={role.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-panel-hover">
              <input type="checkbox" checked={member.roleIds.includes(role.id)} onChange={() => onToggle(role)} />
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: role.color }} />
              <span className="truncate text-foreground">{role.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function BansTab({ serverId, bans, onRefresh }: { serverId: string; bans: BanDto[]; onRefresh: () => Promise<void> }) {
  const toast = useToast()

  async function unban(ban: BanDto) {
    try {
      await apiDelete(`/api/servers/${serverId}/bans/${ban.userId}`)
      await onRefresh()
      toast.success(`${ban.displayName} foi desbanido.`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao desbanir.')
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {bans.length === 0 && <p className="text-sm text-muted-foreground">Nenhum usuário banido.</p>}
      {bans.map((ban) => (
        <div key={ban.userId} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-panel-hover">
          <Avatar url={ban.avatarUrl} name={ban.displayName} size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-foreground">{ban.displayName}</div>
            {ban.reason && <div className="truncate text-xs text-muted-foreground">{ban.reason}</div>}
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void unban(ban)}>
            Desbanir
          </button>
        </div>
      ))}
    </div>
  )
}

function InvitesTab({ serverId, invites, onRefresh }: { serverId: string; invites: InviteDto[]; onRefresh: () => Promise<void> }) {
  const toast = useToast()
  const [isCreating, setIsCreating] = useState(false)

  async function createInvite() {
    setIsCreating(true)
    try {
      await apiPost(`/api/servers/${serverId}/invites`, {})
      await onRefresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar convite.')
    } finally {
      setIsCreating(false)
    }
  }

  async function revoke(invite: InviteDto) {
    try {
      await apiDelete(`/api/servers/${serverId}/invites/${invite.id}`)
      await onRefresh()
      toast.success('Convite revogado.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao revogar convite.')
    }
  }

  function copyCode(code: string) {
    void navigator.clipboard.writeText(code)
    toast.success('Código copiado!')
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" className="btn btn-secondary self-start" onClick={() => void createInvite()} disabled={isCreating}>
        <Plus size={15} /> {isCreating ? 'Criando...' : 'Criar convite'}
      </button>
      <div className="flex flex-col gap-1">
        {invites.length === 0 && <p className="text-sm text-muted-foreground">Nenhum convite criado ainda.</p>}
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-panel-hover">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <code className="text-sm font-semibold text-foreground">{invite.code}</code>
                {!invite.isValid && <span className="text-[10px] font-semibold text-dnd">Expirado</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {invite.uses} uso{invite.uses === 1 ? '' : 's'}
                {invite.maxUses ? ` de ${invite.maxUses}` : ''}
              </div>
            </div>
            <button type="button" className="icon-btn h-7 w-7" onClick={() => copyCode(invite.code)} title="Copiar código">
              <Copy size={13} />
            </button>
            <button
              type="button"
              className="icon-btn h-7 w-7 hover:text-dnd"
              onClick={() => void revoke(invite)}
              title="Revogar"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmojisTab({ serverId, emojis, onRefresh }: { serverId: string; emojis: CustomEmojiDto[]; onRefresh: () => Promise<void> }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !name.trim()) return
    setIsUploading(true)
    try {
      await apiUpload(`/api/servers/${serverId}/emojis`, file, { name: name.trim() })
      setName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await onRefresh()
      toast.success('Emoji adicionado!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar emoji.')
    } finally {
      setIsUploading(false)
    }
  }

  async function remove(emoji: CustomEmojiDto) {
    try {
      await apiDelete(`/api/servers/${serverId}/emojis/${emoji.id}`)
      await onRefresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir emoji.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="nome_do_emoji"
          maxLength={32}
        />
        <label className={`btn btn-secondary shrink-0 ${name.trim() ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
          {isUploading ? 'Enviando...' : 'Enviar imagem'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleUpload(e)}
            disabled={isUploading || !name.trim()}
            hidden
          />
        </label>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {emojis.length === 0 && <p className="col-span-4 text-sm text-muted-foreground">Nenhum emoji customizado ainda.</p>}
        {emojis.map((emoji) => (
          <div key={emoji.id} className="group relative flex flex-col items-center gap-1 rounded-lg border border-border p-2">
            <img src={emoji.imageUrl} alt={emoji.name} className="h-10 w-10 object-contain" />
            <span className="truncate text-[11px] text-muted-foreground">:{emoji.name}:</span>
            <button
              type="button"
              className="icon-btn absolute -right-1 -top-1 h-5 w-5 bg-panel opacity-0 group-hover:opacity-100 hover:text-dnd"
              onClick={() => void remove(emoji)}
              title="Excluir"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
