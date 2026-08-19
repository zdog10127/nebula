import type { MyPermissionsDto, ServerPermission } from '../api/types'

export const ALL_PERMISSIONS: { value: ServerPermission; label: string; description: string }[] = [
  { value: 'ManageServer', label: 'Gerenciar servidor', description: 'Renomear, mudar descrição/ícone e excluir o servidor.' },
  { value: 'ManageRoles', label: 'Gerenciar cargos', description: 'Criar, editar, excluir e atribuir cargos.' },
  { value: 'ManageChannels', label: 'Gerenciar canais', description: 'Criar, mover e organizar canais e categorias.' },
  { value: 'ManageMessages', label: 'Gerenciar mensagens', description: 'Excluir mensagens de outros membros.' },
  { value: 'KickMembers', label: 'Expulsar membros', description: 'Remover membros do servidor.' },
  { value: 'BanMembers', label: 'Banir membros', description: 'Banir e desbanir membros do servidor.' },
  { value: 'CreateInvite', label: 'Criar convite', description: 'Gerar convites para o servidor.' },
  { value: 'ManageEmojis', label: 'Gerenciar emojis', description: 'Adicionar e remover emojis customizados do servidor.' },
]

export function hasPermission(my: MyPermissionsDto | null, permission: ServerPermission): boolean {
  if (!my) return false
  return my.isOwner || my.permissions.includes(permission)
}

export function hasAnyPermission(my: MyPermissionsDto | null, permissions: ServerPermission[]): boolean {
  if (!my) return false
  return my.isOwner || permissions.some((p) => my.permissions.includes(p))
}
