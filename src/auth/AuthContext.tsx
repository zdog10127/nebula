import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, apiGet, apiPost } from '../api/client'
import { clearTokens, getAccessToken, getRefreshToken, setTokens, subscribeToTokenChanges } from '../api/tokenStore'
import type { AuthResult, LoginOutcome, UserProfile } from '../api/types'

export interface LoginResult {
  requiresTwoFactor: boolean
  loginToken: string | null
}

interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  verifyTwoFactor: (loginToken: string, code: string) => Promise<void>
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

    // On a hard refresh (F5), the very first request to the API can fail for reasons
    // that have nothing to do with the session being invalid — a cold cross-origin
    // connection to the API's CloudFront domain, a transient CORS/network hiccup, a
    // 5xx. Treating every failure here as "logged out" was throwing away a perfectly
    // good token. Only an actual 401 (meaning even the refresh-token retry inside
    // apiGet failed) should sign the user out; anything else gets a couple of quick
    // retries before we give up.
    const attempt = async (retriesLeft: number): Promise<void> => {
      try {
        const profile = await apiGet<UserProfile>('/api/auth/me')
        setUser(profile)
      } catch (err) {
        const isAuthFailure = err instanceof ApiError && err.status === 401
        if (!isAuthFailure && retriesLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          return attempt(retriesLeft - 1)
        }
        console.warn('Could not load profile', err)
        setUser(null)
      }
    }

    try {
      await attempt(2)
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

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const outcome = await apiPost<LoginOutcome>('/api/auth/login', { email, password })

    if (outcome.requiresTwoFactor) {
      // Password was correct, but this account has 2FA enabled — no tokens yet. The
      // caller (LoginPage) shows a code-entry step and calls verifyTwoFactor next.
      return { requiresTwoFactor: true, loginToken: outcome.loginToken }
    }

    if (outcome.result) {
      setTokens(outcome.result.accessToken, outcome.result.refreshToken)
      await loadProfile()
    }

    return { requiresTwoFactor: false, loginToken: null }
  }, [loadProfile])

  const verifyTwoFactor = useCallback(async (loginToken: string, code: string) => {
    const result = await apiPost<AuthResult>('/api/auth/2fa/verify', { loginToken, code })
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
    <AuthContext.Provider value={{ user, isLoading, login, verifyTwoFactor, register, logout, refreshProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
