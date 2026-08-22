import { useEffect, useState } from 'react'
import { apiGet } from '../api/client'
import type { PublicProfileDto, RoleDto } from '../api/types'
import type { ProfileCardMemberContext } from '../lib/ProfileCardContext'
import Avatar from './Avatar'
import Modal from './Modal'
import NebulaLoader from './NebulaLoader'

interface Props {
  userId: string
  memberContext?: ProfileCardMemberContext
  onClose: () => void
}

export default function ProfileCardModal({ userId, memberContext, onClose }: Props) {
  const [profile, setProfile] = useState<PublicProfileDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    void apiGet<PublicProfileDto>(`/api/users/${userId}`)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const memberRoles: RoleDto[] = memberContext
    ? memberContext.roleIds
        .map((id) => memberContext.roles.find((r) => r.id === id))
        .filter((r): r is RoleDto => !!r)
    : []

  return (
    <Modal title="Perfil" onClose={onClose}>
      {isLoading || !profile ? (
        <div className="flex justify-center py-6">
          <NebulaLoader size={24} />
        </div>
      ) : (
        <div>
          <div
            className="h-24 rounded-xl"
            style={
              profile.bannerUrl
                ? { backgroundImage: `url(${profile.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: profile.bannerColor ?? 'linear-gradient(135deg, var(--color-accent), var(--color-accent-active))' }
            }
          />
          <div>
            <Avatar
              url={profile.avatarUrl}
              name={profile.displayName}
              size={80}
              className="-mt-10 ml-2 border-4 border-panel"
            />

            <div className="mt-3">
              <h3 className="text-lg font-bold text-foreground">{profile.displayName}</h3>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.pronouns && <p className="mt-0.5 text-xs text-muted-foreground">{profile.pronouns}</p>}
            </div>

            {profile.customStatusText && (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-foreground">
                {profile.customStatusEmoji && <span>{profile.customStatusEmoji}</span>}
                <span>{profile.customStatusText}</span>
              </div>
            )}

            <div className="mt-3 flex flex-col gap-3 rounded-lg bg-raised p-3">
              {profile.bio && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Sobre mim</h4>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{profile.bio}</p>
                </div>
              )}

              {memberRoles.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Cargos</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {memberRoles.map((role) => (
                      <span
                        key={role.id}
                        className="rounded-full border px-2 py-0.5 text-xs font-medium"
                        style={{ color: role.color, borderColor: `${role.color}80` }}
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                  {memberContext ? 'Membro desde' : 'Conta criada em'}
                </h4>
                <p className="text-sm text-foreground">
                  {new Date(memberContext?.joinedAt ?? profile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
