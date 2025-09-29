/**
 * Cartrita Interface - Core Type Definitions
 * Production-ready TypeScript types with strict null safety
 */

export interface User {
  readonly id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  password?: string; // Only present during creation/update
}

export type UserRole = 'admin' | 'user' | 'moderator' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface CreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export type CurrentView = 'dashboard' | 'users' | 'analytics' | 'reports' | 'settings';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  readonly lastUpdated: Date;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Cartrita Theme Types
export interface CartritaTheme {
  colors: {
    claude: string;
    msBlue: string;
    gptPurple: string;
    neutral: Record<string, string>;
  };
  spacing: Record<string, string>;
  typography: Record<string, string>;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  'data-testid'?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: ApiError | null;
}

// Modal Types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export interface UserModalProps extends ModalProps {
  user: User | null;
  onSave: (userData: CreateUserRequest | UpdateUserRequest) => Promise<void>;
}

// Table Types
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
}

export interface TableProps<T> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  loading?: boolean;
}

// Form Types
export interface FormFieldProps extends BaseComponentProps {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
}

// Navigation Types
export interface NavItem {
  id: CurrentView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}

// Error Boundary Types
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  timestamp: Date;
}

// Health Check Types
export interface HealthCheckStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    api: boolean;
    external: boolean;
  };
  lastCheck: Date;
}

// Chat Types
export interface ChatMessage {
  readonly id: string;
  content: string;
  role: 'user' | 'assistant';
  readonly timestamp: Date;
  agentName?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
  metadata?: {
    model?: string;
    tokens?: number;
    responseTime?: number;
    error?: string;
    context7Enabled?: boolean;
    enhancedDocumentation?: boolean;
    mcpServersUsed?: string[];
    documentationVersion?: string;
  };
}

export interface ChatConversation {
  readonly id: string;
  title: string;
  messages: ChatMessage[];
  agentType?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  isActive?: boolean;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  status: 'online' | 'offline' | 'busy';
  avatar?: string;
  category: 'core' | 'advanced' | 'specialized';
}

export interface ChatRequest {
  conversationId: string;
  message: ChatMessage;
  agentType?: string;
  streaming?: boolean;
  context?: {
    previousMessages?: ChatMessage[];
    userPreferences?: {
      useContext7?: boolean;
      enhancedDocumentation?: boolean;
    };
    sessionData?: {
      timestamp?: string;
      context7Enabled?: boolean;
    };
  };
}

export interface ChatResponse {
  messageId: string;
  content: string;
  conversationId: string;
  agentName?: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokens?: number;
    responseTime?: number;
    context7Enabled?: boolean;
    enhancedDocumentation?: boolean;
    mcpServersUsed?: string[];
    documentationVersion?: string;
  };
}

export interface TypingIndicator {
  isTyping: boolean;
  agentName?: string;
  startTime?: Date;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'chat_response' | 'typing_start' | 'typing_stop' | 'error' | 'status';
  payload: unknown;
  conversationId?: string;
  timestamp: Date;
}