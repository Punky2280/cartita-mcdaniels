import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  hoverable?: boolean;
  asChild?: boolean;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between';
}

const variantClasses = {
  default: 'bg-white border border-gray-200 shadow-sm',
  bordered: 'bg-white border-2 border-gray-300',
  elevated: 'bg-white border border-gray-200 shadow-lg',
  glass: 'bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-md',
};

const sizeClasses = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
};

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  animated = true,
  hoverable = true,
  className,
  asChild,
  ...props
}) => {
  const cardContent = (
    <div
      className={clsx(
        'overflow-hidden transition-all duration-200',
        variantClasses[variant],
        sizeClasses[size],
        hoverable && 'hover:shadow-md hover:border-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );

  if (!animated || asChild) {
    return cardContent;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverable ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {cardContent}
    </motion.div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  title,
  subtitle,
  actions,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'flex items-center justify-between p-6 border-b border-gray-200',
        className
      )}
      {...props}
    >
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 leading-6">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex items-center space-x-2 ml-4">
          {actions}
        </div>
      )}
    </div>
  );
};

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx('p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  justify = 'end',
  className,
  ...props
}) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={clsx(
        'flex items-center px-6 py-4 bg-gray-50 border-t border-gray-200',
        justifyClasses[justify],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Compound component pattern
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;