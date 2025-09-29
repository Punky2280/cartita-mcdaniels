import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Pause,
  Settings,
  Activity,
} from 'lucide-react';

type StatusType = 'active' | 'inactive' | 'paused' | 'error' | 'maintenance' | 'running' | 'completed' | 'failed' | 'queued' | 'cancelled';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  showIcon?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  active: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    label: 'Active',
  },
  inactive: {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Clock,
    label: 'Inactive',
  },
  paused: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Pause,
    label: 'Paused',
  },
  error: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle,
    label: 'Error',
  },
  maintenance: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Settings,
    label: 'Maintenance',
  },
  running: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Activity,
    label: 'Running',
  },
  completed: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    label: 'Completed',
  },
  failed: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    label: 'Failed',
  },
  queued: {
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Clock,
    label: 'Queued',
  },
  cancelled: {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: XCircle,
    label: 'Cancelled',
  },
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-1.5 text-sm',
  lg: 'px-3 py-2 text-base',
};

const iconSizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  showIcon = true,
  animated = true,
  size = 'md',
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const badgeContent = (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full border',
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <Icon className={clsx('mr-1.5', iconSizeClasses[size])} />
      )}
      {config.label}
    </span>
  );

  if (!animated) {
    return badgeContent;
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
    >
      {badgeContent}
    </motion.div>
  );
};

export default StatusBadge;