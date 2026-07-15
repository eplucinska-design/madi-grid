// User & Auth Types
export type UserRole = 
  | 'administrator'
  | 'owner'
  | 'sales'
  | 'designer'
  | 'prepress'
  | 'operator'
  | 'logistics'
  | 'accounting'
  | 'marketing'
  | 'quality'
  | 'warehouse'

export interface User {
  id: string
  email: string
  name: string
  initials: string
  role: UserRole
  department: string
  avatarColor: string
  avatarUrl?: string
  permissions: string[]
}

// Order (Zlecenie) Types
export type OrderStatus = 
  | 'waiting_for_files'
  | 'verification'
  | 'design_preparation'
  | 'pending_approval'
  | 'approved'
  | 'ready_for_production'
  | 'in_production'
  | 'finishing'
  | 'packaging'
  | 'shipping'
  | 'completed'
  | 'on_hold'
  | 'cancelled'

export type OrderPriority = 'urgent' | 'high' | 'medium' | 'low'

export type ProductionStage =
  | 'files'
  | 'prepress'
  | 'approval'
  | 'printing'
  | 'finishing'
  | 'quality_check'
  | 'packaging'
  | 'shipping'

export interface OrderFile {
  id: string
  name: string
  type: 'received' | 'working' | 'preview' | 'print_ready' | 'production' | 'internal'
  size: number
  uploadedAt: Date
  uploadedBy: string
  version: number
  status: 'pending' | 'approved' | 'rejected'
}

export interface OrderComment {
  id: string
  userId: string
  userName: string
  userInitials: string
  userAvatarColor: string
  content: string
  createdAt: Date
  isInternal: boolean
}

export interface TimeEntry {
  id: string
  userId: string
  userName: string
  stage: ProductionStage
  startedAt: Date
  endedAt?: Date
  duration: number // in minutes
  description?: string
}

export interface Order {
  id: string
  orderNumber: string
  title: string
  description?: string
  
  // Customer
  customerId: string
  customerName: string
  
  // Status & Priority
  status: OrderStatus
  priority: OrderPriority
  stage: ProductionStage
  
  // Dates
  createdAt: Date
  updatedAt: Date
  dueDate: Date
  estimatedCompletionDate?: Date
  
  // Assignment
  assignedTo: string[]
  department: string
  
  // Technical specs
  product: string
  quantity: number
  specifications?: string
  
  // Files
  files: OrderFile[]
  
  // Time tracking
  timeEntries: TimeEntry[]
  estimatedTime: number // in minutes
  actualTime: number // in minutes
  
  // Comments
  comments: OrderComment[]
  
  // Financial
  quotedPrice?: number
  finalPrice?: number
  
  // Tags
  tags: string[]
}

// Customer Types
export interface CustomerContact {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  isPrimary: boolean
}

export interface Customer {
  id: string
  companyName: string
  taxId?: string
  address: string
  city: string
  postalCode: string
  country: string
  contacts: CustomerContact[]
  notes?: string
  accountManager?: string
  createdAt: Date
  totalOrders: number
  totalRevenue: number
  tags: string[]
}

// View Types
export type ViewType = 'list' | 'board' | 'calendar' | 'timeline'

export interface ViewState {
  currentView: ViewType
  filters: {
    status: OrderStatus[]
    priority: OrderPriority[]
    assignee: string[]
    customer: string[]
    dateRange: { from: Date | null; to: Date | null }
  }
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

// Work Task (personal task) Types
export type WorkTaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'

export interface TaskComment {
  author: string
  authorInitials: string
  authorColor: string
  text: string
  at: Date
}

export interface WorkTask {
  id: string
  title: string
  orderId?: string
  orderNumber?: string
  customerName: string
  workType: string
  department: string
  status: WorkTaskStatus
  priority: OrderPriority
  deadline: Date
  plannedMinutes: number
  workedMinutes: number
  assignedToId: string
  requestedByName: string
  requestedByInitials: string
  requestedByColor: string
  filesPath: string
  lastComment?: TaskComment
  isBlocking?: boolean
  isUrgent?: boolean
}

// Day plan slot on the start view
export interface DayPlanEntry {
  id: string
  time: string
  endTime?: string
  type: 'task' | 'break' | 'free' | 'micro'
  taskId?: string
  label?: string
}

// Live activity feed
export type ActivityKind =
  | 'new_order'
  | 'new_task'
  | 'assignment'
  | 'deadline_change'
  | 'comment'
  | 'blocking'
  | 'urgent'
  | 'approval'
  | 'status_change'

export type ActivityChannel = 'updates' | 'alerts' | 'comments' | 'deadlines' | 'assignments'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  channel: ActivityChannel
  actorName: string
  actorInitials: string
  actorColor: string
  message: string
  orderNumber?: string
  orderId?: string
  taskId?: string
  customerName?: string
  workType?: string
  deadline?: Date
  priority?: OrderPriority
  status?: string
  isBlocking?: boolean
  lastComment?: string
  createdAt: Date
}

// Navigation
export type ModuleId = 
  | 'start'
  | 'grid'
  | 'dashboard'
  | 'customers'
  | 'quotes'
  | 'quotes-list'
  | 'quotes-products'
  | 'studio'
  | 'studio-design'
  | 'orders'
  | 'files'
  | 'prepress'
  | 'production'
  | 'planning'
  | 'active-work'
  | 'logistics'
  | 'invoices'
  | 'complaints'
  | 'inventory'
  | 'documents'
  | 'communication'
  | 'marketing'
  | 'reports'
  | 'archive'
  | 'settings'

export interface NavigationModule {
  id: ModuleId
  label: string
  icon: string
  badge?: number
  children?: NavigationModule[]
}
