import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { RoleDto } from '../api/types'
import ProfileCardModal from '../components/ProfileCardModal'

export interface ProfileCardMemberContext {
  roleIds: string[]
  joinedAt: string
  isOwner: boolean
  roles: RoleDto[]
}

export interface OpenProfileOptions {
  userId: string
  memberContext?: ProfileCardMemberContext
}

interface ProfileCardContextValue {
  openProfile: (options: OpenProfileOptions) => void
}

const ProfileCardContext = createContext<ProfileCardContextValue | null>(null)

export function ProfileCardProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<OpenProfileOptions | null>(null)

  return (
    <ProfileCardContext.Provider value={{ openProfile: setTarget }}>
      {children}
      {target && <ProfileCardModal userId={target.userId} memberContext={target.memberContext} onClose={() => setTarget(null)} />}
    </ProfileCardContext.Provider>
  )
}

export function useProfileCard(): ProfileCardContextValue {
  const ctx = useContext(ProfileCardContext)
  if (!ctx) throw new Error('useProfileCard must be used within ProfileCardProvider')
  return ctx
}
