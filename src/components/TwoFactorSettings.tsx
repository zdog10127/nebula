import { KeyRound, ShieldCheck, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import QRCode from 'qrcode'
import { ApiError, apiPost } from '../api/client'
import type { EnableTwoFactorResult, TwoFactorSetupResult } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../lib/ToastContext'

type Step = 'idle' | 'scan' | 'recovery-codes' | 'disable'

// Opt-in 2FA settings, embedded in ProfileSettingsModal. Nothing here is forced on
// anyone — it's off by default and stays off unless the user walks through this flow.
export default function TwoFactorSettings() {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState<Step>('idle')
  const [setup, setSetup] = useState<TwoFactorSetupResult | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [isBusy, setIsBusy] = useState(false)

  function resetFlow() {
    setStep('idle')
    setSetup(null)
    setQrDataUrl(null)
    setCode('')
    setPassword('')
    setRecoveryCodes([])
  }

  async function startSetup() {
    setIsBusy(true)
    try {
      const result = await apiPost<TwoFactorSetupResult>('/api/auth/2fa/setup')
      setSetup(result)
      setQrDataUrl(await QRCode.toDataURL(result.otpAuthUri, { margin: 1, width: 220 }))
      setStep('scan')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao iniciar a configuração.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault()
    setIsBusy(true)
    try {
      const result = await apiPost<EnableTwoFactorResult>('/api/auth/2fa/enable', { code })
      setRecoveryCodes(result.recoveryCodes)
      setStep('recovery-codes')
      await refreshProfile()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Código inválido.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleDisable(e: FormEvent) {
    e.preventDefault()
    setIsBusy(true)
    try {
      await apiPost('/api/auth/2fa/disable', { password })
      toast.success('Autenticação em duas etapas desativada.')
      resetFlow()
      await refreshProfile()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao desativar.')
    } finally {
      setIsBusy(false)
    }
  }

  if (step === 'recovery-codes') {
    return (
      <div className="mt-4 rounded-lg border border-border bg-raised p-3">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <ShieldCheck size={16} className="text-accent" />
          Autenticação em duas etapas ativada!
        </p>
        <p className="mb-2 text-xs text-muted-foreground">
          Guarde esses códigos de recuperação em um lugar seguro. Cada um funciona só uma vez e serve pra
          entrar caso você perca acesso ao seu app autenticador. Eles não serão mostrados de novo.
        </p>
        <div className="grid grid-cols-2 gap-1.5 rounded-md bg-panel p-2 font-mono text-xs">
          {recoveryCodes.map((rc) => (
            <span key={rc}>{rc}</span>
          ))}
        </div>
        <button type="button" className="btn btn-primary mt-3" onClick={resetFlow}>
          Já salvei meus códigos
        </button>
      </div>
    )
  }

  if (step === 'scan' && setup) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-raised p-3">
        <p className="mb-2 text-sm font-medium text-foreground">Escaneie o QR code</p>
        <p className="mb-2 text-xs text-muted-foreground">
          Use um app autenticador (Google Authenticator, Authy, 1Password...) para escanear o código abaixo,
          ou digite a chave manualmente.
        </p>
        {qrDataUrl && <img src={qrDataUrl} alt="QR code para configurar a autenticação em duas etapas" className="rounded-md" />}
        <p className="mt-2 break-all rounded-md bg-panel px-2 py-1.5 font-mono text-xs">{setup.secretBase32}</p>
        <form onSubmit={handleConfirm} className="mt-3 flex items-end gap-2">
          <label className="label flex-1">
            Código de 6 dígitos
            <input
              className="field"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoFocus
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={isBusy || code.length !== 6}>
            Confirmar
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetFlow}>
            Cancelar
          </button>
        </form>
      </div>
    )
  }

  if (step === 'disable') {
    return (
      <div className="mt-4 rounded-lg border border-border bg-raised p-3">
        <p className="mb-2 text-sm font-medium text-foreground">Desativar autenticação em duas etapas</p>
        <form onSubmit={handleDisable} className="flex items-end gap-2">
          <label className="label flex-1">
            Confirme sua senha
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </label>
          <button type="submit" className="btn btn-danger" disabled={isBusy}>
            Desativar
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetFlow}>
            Cancelar
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-raised p-3">
      <div className="flex items-center gap-2 text-sm text-foreground">
        {user?.totpEnabled ? (
          <ShieldCheck size={16} className="text-accent" />
        ) : (
          <ShieldOff size={16} className="text-muted-foreground" />
        )}
        Autenticação em duas etapas{user?.totpEnabled ? ' (ativada)' : ''}
      </div>
      {user?.totpEnabled ? (
        <button type="button" className="btn btn-secondary shrink-0" onClick={() => setStep('disable')}>
          Desativar
        </button>
      ) : (
        <button type="button" className="btn btn-secondary shrink-0" onClick={() => void startSetup()} disabled={isBusy}>
          <KeyRound size={14} className="mr-1 inline" />
          Ativar
        </button>
      )}
    </div>
  )
}
