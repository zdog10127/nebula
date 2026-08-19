import { Bell, BellOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiError, apiPatch, apiUpload } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { getExistingPushSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from '../lib/push'
import { useToast } from '../lib/ToastContext'
import Avatar from './Avatar'
import EmojiPicker from './EmojiPicker'
import Modal from './Modal'

export default function ProfileSettingsModal({ onClose }: { onClose: () => void }) {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [pronouns, setPronouns] = useState(user?.pronouns ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [bannerColor, setBannerColor] = useState(user?.bannerColor ?? '#22d3ee')
  const [statusText, setStatusText] = useState(user?.customStatusText ?? '')
  const [statusEmoji, setStatusEmoji] = useState(user?.customStatusEmoji ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isPushEnabled, setIsPushEnabled] = useState<boolean | null>(null)
  const [isTogglingPush, setIsTogglingPush] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) return
    void getExistingPushSubscription().then((sub) => setIsPushEnabled(!!sub))
  }, [])

  async function togglePush() {
    setIsTogglingPush(true)
    try {
      if (isPushEnabled) {
        await unsubscribeFromPush()
        setIsPushEnabled(false)
      } else {
        await subscribeToPush()
        setIsPushEnabled(true)
        toast.success('Notificações ativadas!')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao configurar notificações.')
    } finally {
      setIsTogglingPush(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      await apiPatch('/api/auth/me', {
        displayName,
        pronouns,
        bio,
        bannerColor,
        customStatusText: statusText,
        customStatusEmoji: statusEmoji,
      })
      await refreshProfile()
      onClose()
      toast.success('Perfil atualizado!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao salvar perfil.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAvatar(true)
    try {
      await apiUpload('/api/users/me/avatar', file)
      await refreshProfile()
      toast.success('Avatar atualizado!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar avatar.')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  async function handleBannerChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingBanner(true)
    try {
      await apiUpload('/api/users/me/banner', file)
      await refreshProfile()
      toast.success('Banner atualizado!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar banner.')
    } finally {
      setIsUploadingBanner(false)
    }
  }

  return (
    <Modal title="Configurações de perfil" onClose={onClose} size="lg">
      <div>
        <div
          className="h-24 rounded-xl"
          style={
            user?.bannerUrl
              ? { backgroundImage: `url(${user.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: bannerColor }
          }
        />

        <div className="flex items-end justify-between">
          <Avatar url={user?.avatarUrl} name={user?.displayName ?? ''} size={72} className="-mt-8 ml-1 border-4 border-panel" />
          <div className="mb-1 flex items-center gap-2">
            <input
              type="color"
              value={bannerColor}
              onChange={(e) => setBannerColor(e.target.value)}
              title="Cor do banner (usada se não houver imagem)"
              className="h-9 w-9 cursor-pointer rounded-lg border border-border-strong bg-raised"
            />
            <label className="btn btn-secondary cursor-pointer">
              {isUploadingBanner ? 'Enviando...' : 'Trocar banner'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleBannerChange(e)}
                disabled={isUploadingBanner}
                hidden
              />
            </label>
          </div>
        </div>

        <div className="mt-2">
          <label className="btn btn-secondary cursor-pointer">
            {isUploadingAvatar ? 'Enviando...' : 'Trocar avatar'}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void handleAvatarChange(e)}
              disabled={isUploadingAvatar}
              hidden
            />
          </label>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="label">
              Nome de exibição
              <input
                className="field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={1}
                maxLength={64}
              />
            </label>
            <label className="label">
              Pronomes
              <input
                className="field"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                maxLength={40}
                placeholder="ex: ele/dele"
              />
            </label>
          </div>

          <label className="label">
            Status personalizado
            <div className="flex items-center gap-2">
              <EmojiPicker onSelect={(emoji) => setStatusEmoji(emoji)} />
              {statusEmoji && (
                <span className="flex shrink-0 items-center gap-1 rounded-md bg-raised px-2 py-1.5 text-sm">
                  {statusEmoji}
                  <button
                    type="button"
                    onClick={() => setStatusEmoji('')}
                    className="text-muted-foreground hover:text-foreground"
                    title="Remover emoji"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              <input
                className="field flex-1"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                maxLength={128}
                placeholder="O que você está fazendo? Ex: Jogando Valorant"
              />
            </div>
          </label>

          <label className="label">
            Sobre mim
            <textarea
              className="field resize-none"
              rows={3}
              maxLength={190}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fale um pouco sobre você"
            />
          </label>

          <button type="submit" className="btn btn-primary self-start" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>

        {isPushSupported() && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-raised p-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              {isPushEnabled ? <Bell size={16} className="text-accent" /> : <BellOff size={16} className="text-muted-foreground" />}
              Notificações push (menções e mensagens diretas quando você estiver offline)
            </div>
            <button type="button" className="btn btn-secondary shrink-0" onClick={() => void togglePush()} disabled={isTogglingPush}>
              {isPushEnabled ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
