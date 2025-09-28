import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  animated?: boolean;
}

const variantClasses = {
  primary: 'bg-claude-500 text-white hover:bg-claude-600 focus:ring-claude-500',
  secondary: 'bg-ms-blue-500 text-white hover:bg-ms-blue-600 focus:ring-ms-blue-500',
  accent: 'bg-gpt-purple-500 text-white hover:bg-gpt-purple-600 focus:ring-gpt-purple-500',
  outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500',
  ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  animated = true,
  className,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const buttonContent = (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg',
        'border border-transparent',
        'transition-all duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <Loader2 className={clsx('animate-spin', iconSizeClasses[size], children && 'mr-2')} />
      )}

      {!loading && icon && iconPosition === 'left' && (
        <span className={clsx(iconSizeClasses[size], children && 'mr-2')}>
          {icon}
        </span>
      )}

      {children}

      {!loading && icon && iconPosition === 'right' && (
        <span className={clsx(iconSizeClasses[size], children && 'ml-2')}>
          {icon}
        </span>
      )}
    </button>
  );

  if (!animated) {
    return buttonContent;
  }

  return (
    <motion.div
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {buttonContent}
    </motion.div>
  );
};

export default Button;