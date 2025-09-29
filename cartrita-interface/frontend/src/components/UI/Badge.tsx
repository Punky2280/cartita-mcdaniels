import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  pill?: boolean;
  outlined?: boolean;
  animated?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  dot?: boolean;
}

const variantClasses = {
  primary: {
    filled: 'bg-claude-500 text-white',
    outlined: 'bg-claude-50 text-claude-700 border-claude-200',
    dot: 'bg-claude-500',
  },
  secondary: {
    filled: 'bg-ms-blue-500 text-white',
    outlined: 'bg-ms-blue-50 text-ms-blue-700 border-ms-blue-200',
    dot: 'bg-ms-blue-500',
  },
  accent: {
    filled: 'bg-gpt-purple-500 text-white',
    outlined: 'bg-gpt-purple-50 text-gpt-purple-700 border-gpt-purple-200',
    dot: 'bg-gpt-purple-500',
  },
  success: {
    filled: 'bg-green-500 text-white',
    outlined: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  warning: {
    filled: 'bg-yellow-500 text-white',
    outlined: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    dot: 'bg-yellow-500',
  },
  error: {
    filled: 'bg-red-500 text-white',
    outlined: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  info: {
    filled: 'bg-blue-500 text-white',
    outlined: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  neutral: {
    filled: 'bg-gray-500 text-white',
    outlined: 'bg-gray-50 text-gray-700 border-gray-200',
    dot: 'bg-gray-500',
  },
};

const sizeClasses = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'w-3 h-3',
    dismiss: 'w-3 h-3 ml-1',
    dot: 'w-2 h-2',
  },
  md: {
    badge: 'px-2.5 py-1 text-sm',
    icon: 'w-4 h-4',
    dismiss: 'w-4 h-4 ml-1.5',
    dot: 'w-2.5 h-2.5',
  },
  lg: {
    badge: 'px-3 py-1.5 text-base',
    icon: 'w-5 h-5',
    dismiss: 'w-5 h-5 ml-2',
    dot: 'w-3 h-3',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  pill = false,
  outlined = false,
  animated = true,
  dismissible = false,
  onDismiss,
  icon,
  dot = false,
  className,
  ...props
}) => {
  const variantStyle = outlined ? variantClasses[variant].outlined : variantClasses[variant].filled;
  const borderClass = outlined ? 'border' : '';

  if (dot) {
    const dotContent = (
      <span
        className={clsx(
          'inline-block rounded-full',
          variantClasses[variant].dot,
          sizeClasses[size].dot,
          className
        )}
        {...props}
      />
    );

    if (!animated) {
      return dotContent;
    }

    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {dotContent}
      </motion.span>
    );
  }

  const badgeContent = (
    <span
      className={clsx(
        'inline-flex items-center font-medium',
        pill ? 'rounded-full' : 'rounded-md',
        variantStyle,
        borderClass,
        sizeClasses[size].badge,
        dismissible && 'pr-1',
        className
      )}
      role="status"
      aria-label={typeof children === 'string' ? children : undefined}
      {...props}
    >
      {icon && (
        <span className={clsx(sizeClasses[size].icon, children && 'mr-1')}>
          {icon}
        </span>
      )}

      {children}

      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className={clsx(
            'inline-flex items-center justify-center hover:bg-black/10 rounded-full transition-colors',
            sizeClasses[size].dismiss
          )}
          aria-label="Remove badge"
        >
          <X className="w-full h-full" />
        </button>
      )}
    </span>
  );

  if (!animated) {
    return badgeContent;
  }

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      {badgeContent}
    </motion.span>
  );
};

// Status Badge - specific use case for system status
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'online' | 'offline' | 'warning' | 'error' | 'loading' | 'idle';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  dot = true,
  ...props
}) => {
  const statusVariants = {
    online: 'success',
    offline: 'neutral',
    warning: 'warning',
    error: 'error',
    loading: 'info',
    idle: 'neutral',
  } as const;

  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    warning: 'Warning',
    error: 'Error',
    loading: 'Loading',
    idle: 'Idle',
  };

  return (
    <Badge
      variant={statusVariants[status]}
      dot={dot}
      {...props}
    >
      {!dot && statusLabels[status]}
    </Badge>
  );
};

// Priority Badge - for task/item priorities
interface PriorityBadgeProps extends Omit<BadgeProps, 'variant'> {
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  ...props
}) => {
  const priorityVariants = {
    low: 'info',
    medium: 'warning',
    high: 'accent',
    critical: 'error',
  } as const;

  const priorityLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };

  return (
    <Badge
      variant={priorityVariants[priority]}
      size="sm"
      {...props}
    >
      {priorityLabels[priority]}
    </Badge>
  );
};

Badge.Status = StatusBadge;
Badge.Priority = PriorityBadge;

export default Badge;