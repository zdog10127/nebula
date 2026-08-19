import { Orbit } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../lib/ToastContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-canvas px-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />

      <form onSubmit={handleSubmit} className="card relative z-10 w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-canvas">
            <Orbit size={24} />
          </div>
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
