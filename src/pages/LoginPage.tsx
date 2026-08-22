import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import LoadingScreen from '../components/LoadingScreen'
import NebulaLogo from '../components/NebulaLogo'
import ThemeBackdrop from '../components/ThemeBackdrop'
import { useToast } from '../lib/ToastContext'

export default function LoginPage() {
  const { login, user, isLoading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // AuthProvider already tries to restore the session from a saved token on mount
  // (loadProfile). If that resolved to a valid user by the time someone lands here —
  // clicking "Entrar" with a token still saved, or the Electron build booting straight to
  // /login — skip the form entirely instead of making them type their password again.
  useEffect(() => {
    if (!isLoading && user) navigate('/app', { replace: true })
  }, [isLoading, user, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/app', { replace: true })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao entrar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // While we're still checking the saved token, or once it turned out to be valid and
  // we're about to redirect above, don't flash the empty login form in between.
  if (isLoading || user) {
    return <LoadingScreen />
  }

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-canvas px-6">
      <ThemeBackdrop />

      <form onSubmit={handleSubmit} className="card relative z-10 w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <NebulaLogo size={56} />
          <div>
            <h1 className="text-2xl">Entrar</h1>
            <p className="mt-1 text-sm text-muted-foreground">Bem-vindo de volta</p>
          </div>
        </div>

        <label className="label mb-3">
          Email
          <input
            type="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label className="label mb-5">
          Senha
          <input
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  )
}
