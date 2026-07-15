'use client'

import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { 
  X, 
  ExternalLink, 
  MoreHorizontal,
  Building2,
  Calendar,
  Clock,
  User,
  Tag,
  FileText,
  MessageSquare,
  History,
  ChevronRight,
  Play,
  Pause,
  Upload,
  Send,
} from 'lucide-react'
import { useOrdersStore, STATUS_CONFIG, PRIORITY_CONFIG, STAGE_CONFIG } from '@/lib/store/orders-store'
import { DEMO_USERS } from '@/lib/store/auth-store'
import type { Order, OrderStatus, ProductionStage } from '@/lib/types'
import { openOrderWindow } from '@/lib/utils/order-links'

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {action}
    </div>
  )
}

function InfoRow({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon size={14} className="text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-muted-foreground block mb-0.5">{label}</span>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    </div>
  )
}

function StatusSelect({ status, onChange }: { status: OrderStatus; onChange: (status: OrderStatus) => void }) {
  const config = STATUS_CONFIG[status]
  
  return (
    <button className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors hover:opacity-90 ${config.bgClass}`}>
      {config.label}
      <ChevronRight size={12} className="opacity-60" />
    </button>
  )
}

function StageProgress({ currentStage }: { currentStage: ProductionStage }) {
  const stages = Object.entries(STAGE_CONFIG).sort((a, b) => a[1].order - b[1].order)
  const currentIndex = stages.findIndex(([key]) => key === currentStage)

  return (
    <div className="flex items-center gap-1">
      {stages.map(([key, config], index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        
        return (
          <div key={key} className="flex items-center gap-1">
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors ${
                isCompleted 
                  ? 'bg-primary text-primary-foreground' 
                  : isCurrent 
                    ? 'bg-primary/20 text-primary border-2 border-primary' 
                    : 'bg-muted text-muted-foreground'
              }`}
              title={config.label}
            >
              {index + 1}
            </div>
            {index < stages.length - 1 && (
              <div className={`w-3 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function AssigneeList({ assignedTo }: { assignedTo: string[] }) {
  const users = assignedTo
    .map(id => DEMO_USERS.find(u => u.id === id))
    .filter(Boolean)

  if (users.length === 0) {
    return <span className="text-muted-foreground text-sm">Nieprzypisane</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {users.map((user) => (
        <div 
          key={user!.id}
          className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50"
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold"
            style={{ background: user!.avatarColor }}
          >
            {user!.initials}
          </div>
          <span className="text-xs font-medium">{user!.name}</span>
        </div>
      ))}
    </div>
  )
}

function TimeTracker({ order }: { order: Order }) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const percentage = order.estimatedTime > 0 
    ? Math.min((order.actualTime / order.estimatedTime) * 100, 100) 
    : 0

  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">Czas pracy</span>
        <div className="flex gap-1">
          <button className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
            <Play size={14} />
          </button>
          <button className="w-8 h-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-colors">
            <Pause size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold font-mono">{formatTime(order.actualTime)}</span>
        <span className="text-sm text-muted-foreground">/ {formatTime(order.estimatedTime)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${
            percentage >= 100 ? 'bg-destructive' : percentage >= 80 ? 'bg-amber-500' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function FilesSection({ files }: { files: Order['files'] }) {
  return (
    <div>
      <SectionHeader 
        title="Pliki" 
        action={
          <button className="text-xs text-primary hover:underline flex items-center gap-1">
            <Upload size={12} />
            Dodaj
          </button>
        }
      />
      {files.length > 0 ? (
        <div className="py-2 space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <FileText size={16} className="text-muted-foreground" />
              <span className="flex-1 text-sm truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
            <Upload size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Brak plików</p>
          <button className="mt-2 text-xs text-primary hover:underline">
            Przeciągnij lub kliknij, aby dodać
          </button>
        </div>
      )}
    </div>
  )
}

function CommentsSection({ comments }: { comments: Order['comments'] }) {
  return (
    <div>
      <SectionHeader title="Komentarze" />
      <div className="py-3">
        {/* Comment Input */}
        <div className="flex gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
            AK
          </div>
          <div className="flex-1">
            <textarea 
              placeholder="Dodaj komentarz..."
              className="w-full p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              rows={2}
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                Tylko wewnętrzny
              </label>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors">
                <Send size={12} />
                Wyślij
              </button>
            </div>
          </div>
        </div>

        {/* Comments List */}
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ background: comment.userAvatarColor }}
                >
                  {comment.userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{comment.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(comment.createdAt, 'd MMM, HH:mm', { locale: pl })}
                    </span>
                    {comment.isInternal && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Wewnętrzny
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak komentarzy
          </p>
        )}
      </div>
    </div>
  )
}

export function OrderDetailPanel() {
  const { getSelectedOrder, selectOrder, updateOrder } = useOrdersStore()
  const order = getSelectedOrder()

  if (!order) {
    return null
  }

  return (
    <div className="flex h-full w-[var(--app-detail-panel-width)] shrink-0 flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-[var(--app-module-pad-x)] py-[var(--app-module-pad-y)]">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="font-semibold text-foreground truncate">{order.orderNumber}</h2>
          <button
            onClick={() => openOrderWindow(order.id, order.orderNumber)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Otworz zlecenie w osobnym oknie"
          >
            <ExternalLink size={14} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <MoreHorizontal size={18} />
          </button>
          <button 
            onClick={() => selectOrder(null)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-[var(--app-module-gap)]">
          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground mb-2">{order.title}</h3>
          {order.description && (
            <p className="text-sm text-muted-foreground mb-4">{order.description}</p>
          )}

          {/* Status & Stage */}
          <div className="flex items-center gap-3 mb-4">
            <StatusSelect 
              status={order.status} 
              onChange={(status) => updateOrder(order.id, { status })} 
            />
            <div 
              className="w-2 h-2 rounded-full"
              style={{ background: PRIORITY_CONFIG[order.priority].color }}
            />
            <span className="text-xs text-muted-foreground">
              {PRIORITY_CONFIG[order.priority].label}
            </span>
          </div>

          {/* Stage Progress */}
          <div className="mb-6">
            <span className="text-[11px] text-muted-foreground block mb-2">Etap produkcji</span>
            <StageProgress currentStage={order.stage} />
          </div>

          {/* Time Tracker */}
          <TimeTracker order={order} />

          {/* Details */}
          <div className="mt-6 space-y-1">
            <SectionHeader title="Szczegóły" />
            <InfoRow label="Klient" icon={Building2}>
              <span className="text-primary hover:underline cursor-pointer">{order.customerName}</span>
            </InfoRow>
            <InfoRow label="Termin" icon={Calendar}>
              {format(order.dueDate, 'd MMMM yyyy', { locale: pl })}
            </InfoRow>
            <InfoRow label="Utworzono" icon={Clock}>
              {format(order.createdAt, 'd MMM yyyy, HH:mm', { locale: pl })}
            </InfoRow>
            <InfoRow label="Produkt" icon={Tag}>
              {order.product} - {order.quantity.toLocaleString()} szt.
            </InfoRow>
            <InfoRow label="Dział" icon={Building2}>
              {order.department}
            </InfoRow>
            <InfoRow label="Przypisane do" icon={User}>
              <AssigneeList assignedTo={order.assignedTo} />
            </InfoRow>
          </div>

          {/* Specifications */}
          {order.specifications && (
            <div className="mt-6">
              <SectionHeader title="Specyfikacja techniczna" />
              <p className="py-3 text-sm text-foreground">{order.specifications}</p>
            </div>
          )}

          {/* Files */}
          <div className="mt-6">
            <FilesSection files={order.files} />
          </div>

          {/* Comments */}
          <div className="mt-6">
            <CommentsSection comments={order.comments} />
          </div>

          {/* History */}
          <div className="mt-6 mb-4">
            <SectionHeader 
              title="Historia zmian" 
              action={
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  <History size={12} />
                  Zobacz wszystko
                </button>
              }
            />
            <p className="py-4 text-sm text-muted-foreground text-center">
              Brak historii zmian
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
