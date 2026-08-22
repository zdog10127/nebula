import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import NebulaLogo from '../components/NebulaLogo'
import ThemeBackdrop from '../components/ThemeBackdrop'
import { useToast } from '../lib/ToastContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await register(username, email, password, displayName || undefined)
      navigate('/app', { replace: true })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar conta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-canvas px-6 py-8">
      <ThemeBackdrop />

      <form onSubmit={handleSubmit} className="card relative z-10 w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <NebulaLogo size={56} />
          <div>
            <h1 className="text-2xl">Criar conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">Comece a conversar em segundos</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="label">
            Usuário
            <input
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_.-]+"
              title="Só letras, números, '.', '_' ou '-'"
              autoFocus
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              3-32 caracteres: letras, números, ponto, hífen ou underline.
            </span>
          </label>
          <label className="label">
            Nome de exibição (opcional)
            <input
              className="field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={64}
            />
          </label>
          <label className="label">
            Email
            <input
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
            />
          </label>
          <label className="label">
            Senha
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
            />
            <span className="mt-1 block text-xs text-muted-foreground">Mínimo de 8 caracteres.</span>
          </label>
        </div>

        <button type="submit" className="btn btn-primary mt-5 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Criando...' : 'Criar conta'}
        </button>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  )
}
