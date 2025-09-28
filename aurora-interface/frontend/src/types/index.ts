/**
 * Aurora Interface - Core Type Definitions
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

// Aurora Theme Types
export interface AuroraTheme {
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