import type { ApiErrorBody, AuthResult } from './types'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStore'

export const API_URL = import.meta.env.VITE_API_URL as string

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) {
          clearTokens()
          return false
        }
        const result = (await res.json()) as AuthResult
        setTokens(result.accessToken, result.refreshToken)
        return true
      } catch {
        clearTokens()
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const accessToken = getAccessToken()
  const headers = new Headers(options.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) return request<T>(path, options, false)
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const body = (await res.json()) as ApiErrorBody
      if (body.error) message = body.error
    } catch {
      // ignore body parse errors
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function apiUpload<T>(path: string, file: File, extraFields?: Record<string, string>): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)
  if (extraFields) for (const [key, value] of Object.entries(extraFields)) formData.append(key, value)
  return request<T>(path, { method: 'POST', body: formData })
}
