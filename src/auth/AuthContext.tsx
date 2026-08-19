import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { apiGet, apiPost } from '../api/client'
import { clearTokens, getAccessToken, getRefreshToken, setTokens, subscribeToTokenChanges } from '../api/tokenStore'
import type { AuthResult, UserProfile } from '../api/types'

interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const profile = await apiGet<UserProfile>('/api/auth/me')
      setUser(profile)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
    return subscribeToTokenChanges(() => {
      if (!getAccessToken()) setUser(null)
    })
  }, [loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiPost<AuthResult>('/api/auth/login', { email, password })
    setTokens(result.accessToken, result.refreshToken)
    await loadProfile()
  }, [loadProfile])

  const register = useCallback(async (username: string, email: string, password: string, displayName?: string) => {
    const result = await apiPost<AuthResult>('/api/auth/register', { username, email, password, displayName })
    setTokens(result.accessToken, result.refreshToken)
    await loadProfile()
  }, [loadProfile])

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        await apiPost('/api/auth/logout', { refreshToken })
      } catch {
        // ignore logout errors, clear local state regardless
      }
    }
    clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
