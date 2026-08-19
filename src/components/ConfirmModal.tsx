import Modal from './Modal'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  isLoading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="mb-5 text-sm text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={isLoading}
          autoFocus
        >
          {isLoading ? 'Aguarde...' : confirmLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </button>
      </div>
    </Modal>
  )
}
