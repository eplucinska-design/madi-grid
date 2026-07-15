'use client'

import { DEMO_USERS } from '@/lib/store/auth-store'

interface AssigneeAvatarStackProps {
  ids: string[]
  max?: number
  size?: 'sm' | 'md'
  showEmpty?: boolean
  singleLabel?: boolean
}

const sizeClasses = {
  sm: 'h-5 w-5 text-[8px]',
  md: 'h-6 w-6 text-[9px]',
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part[0]).join('')
  return (initials || '?').toUpperCase()
}

function shortPersonName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Nieprzypisane'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[1][0]}.`
}

export function UserAvatar({
  userId,
  label,
  color,
  size = 'md',
}: {
  userId?: string
  label?: string
  color?: string
  size?: 'sm' | 'md'
}) {
  const user = userId ? DEMO_USERS.find((item) => item.id === userId) : undefined
  const name = label ?? user?.name ?? 'Nieprzypisane'
  const initials = user ? initialsFromName(user.name) : initialsFromName(name)

  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-background font-semibold text-white shadow-sm ${sizeClasses[size]}`}
      style={{ background: color ?? user?.avatarColor ?? '#64748b' }}
    >
      {initials}
    </span>
  )
}

export function AssigneeAvatarStack({ ids, max = 4, size = 'md', showEmpty = true, singleLabel = false }: AssigneeAvatarStackProps) {
  const safeIds = ids.filter(Boolean)

  if (!safeIds.length) {
    if (!showEmpty) return null
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <UserAvatar label="Brak osoby" size={size} />
        <span>Brak osoby</span>
      </div>
    )
  }

  const visible = safeIds.slice(0, max)
  const hidden = safeIds.length - visible.length
  const singleUser = singleLabel && safeIds.length === 1 ? DEMO_USERS.find((item) => item.id === safeIds[0]) : undefined

  if (singleUser) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <UserAvatar userId={singleUser.id} size={size} />
        <span className="truncate text-xs text-muted-foreground" title={singleUser.name}>
          {shortPersonName(singleUser.name)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {visible.map((id) => (
          <UserAvatar key={id} userId={id} size={size} />
        ))}
        {hidden > 0 && (
          <span
            className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted font-semibold text-foreground ${sizeClasses[size]}`}
            title={`${hidden} wiecej`}
          >
            +{hidden}
          </span>
        )}
      </div>
    </div>
  )
}
