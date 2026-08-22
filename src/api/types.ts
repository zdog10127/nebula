export type ChannelType = 'Text' | 'Voice'
export type PresenceStatus = 'Offline' | 'Online' | 'Away' | 'DoNotDisturb' | 'Invisible'
export type ServerPermission =
  | 'ManageServer'
  | 'ManageRoles'
  | 'ManageChannels'
  | 'KickMembers'
  | 'BanMembers'
  | 'CreateInvite'
  | 'ManageMessages'
  | 'ManageEmojis'

export interface AuthResult {
  userId: string
  username: string
  email: string
  displayName: string
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
}

export interface UserProfile {
  userId: string
  username: string
  email: string
  displayName: string
  avatarUrl: string | null
  bannerUrl: string | null
  bannerColor: string | null
  bio: string | null
  pronouns: string | null
  customStatusText: string | null
  customStatusEmoji: string | null
  totpEnabled: boolean
}

export interface LoginOutcome {
  requiresTwoFactor: boolean
  loginToken: string | null
  result: AuthResult | null
}

export interface TwoFactorSetupResult {
  secretBase32: string
  otpAuthUri: string
}

export interface EnableTwoFactorResult {
  recoveryCodes: string[]
}

export interface PublicProfileDto {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  bannerUrl: string | null
  bannerColor: string | null
  bio: string | null
  pronouns: string | null
  customStatusText: string | null
  customStatusEmoji: string | null
  createdAt: string
}

export interface ServerSummary {
  id: string
  name: string
  iconUrl: string | null
  isOwner: boolean
  memberCount: number
}

export interface ChannelDto {
  id: string
  serverId: string
  name: string
  type: ChannelType
  position: number
  categoryId: string | null
}

export interface CategoryDto {
  id: string
  serverId: string
  name: string
  position: number
}

export interface ServerDetail {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  ownerId: string
  createdAt: string
  channels: ChannelDto[]
  categories: CategoryDto[]
}

export interface RoleDto {
  id: string
  serverId: string
  name: string
  color: string
  permissions: ServerPermission[]
  position: number
}

export interface MemberDto {
  userId: string
  username: string
  displayName: string
  nickname: string | null
  avatarUrl: string | null
  roleIds: string[]
  isOwner: boolean
  joinedAt: string
  status: PresenceStatus
  customStatusText: string | null
  customStatusEmoji: string | null
}

export interface MyPermissionsDto {
  isOwner: boolean
  permissions: ServerPermission[]
}

export interface BanDto {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  bannedByUserId: string
  reason: string | null
  createdAt: string
}

export interface InviteDto {
  id: string
  code: string
  createdAt: string
  expiresAt: string | null
  maxUses: number | null
  uses: number
  isValid: boolean
}

export interface CustomEmojiDto {
  id: string
  serverId: string
  name: string
  imageUrl: string
  createdAt: string
}

export interface AttachmentSummary {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  url: string
}

export interface ReactionSummary {
  emoji: string
  userIds: string[]
}

export interface MessageDto {
  id: string
  channelId: string
  authorId: string
  authorUsername: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  content: string
  createdAt: string
  editedAt: string | null
  attachments: AttachmentSummary[]
  reactions: ReactionSummary[]
  mentionedUserIds: string[]
  isPinned: boolean
}

export interface UnreadCountDto {
  count: number
  hasMention: boolean
}

export interface VoiceTokenResult {
  url: string
  token: string
  roomName: string
  identity: string
}

export interface VoiceParticipantDto {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  isMuted: boolean
  isDeafened: boolean
}

export type NowPlayingType = 'youtube' | 'audio'

export interface NowPlayingDto {
  type: NowPlayingType
  url: string
  title: string | null
  sharedByUserId: string
  sharedByDisplayName: string
  startedAtUnixMs: number
}

export interface MusicResolveResultDto {
  videoId: string
  title: string
  thumbnailUrl: string | null
}

export interface GifResultDto {
  id: string
  previewUrl: string
  url: string
  width: number
  height: number
}

export interface GifSearchResult {
  results: GifResultDto[]
  next: string | null
}

export interface FriendDto {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  status: PresenceStatus
  friendsSince: string
}

export interface FriendRequestDto {
  id: string
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
  isIncoming: boolean
}

export interface DmChannelDto {
  id: string
  otherUserId: string
  otherUsername: string
  otherDisplayName: string
  otherAvatarUrl: string | null
  otherStatus: PresenceStatus
  lastMessageContent: string | null
  lastMessageAt: string | null
}

export interface DmMessageDto {
  id: string
  dmChannelId: string
  authorId: string
  content: string
  createdAt: string
  editedAt: string | null
}

export interface ApiErrorBody {
  error: string
}
