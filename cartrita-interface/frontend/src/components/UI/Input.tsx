import React, { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Eye, EyeOff, AlertCircle, CheckCircle, Search, X } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  help?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  success?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  animated?: boolean;
}

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  help?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
  resize?: boolean;
  animated?: boolean;
}

interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
  searchDelay?: number;
}

interface PasswordInputProps extends Omit<InputProps, 'rightIcon' | 'type'> {
  strengthMeter?: boolean;
}

const sizeClasses = {
  sm: {
    input: 'px-3 py-2 text-sm',
    icon: 'w-4 h-4',
    label: 'text-sm',
    help: 'text-xs',
  },
  md: {
    input: 'px-4 py-2.5 text-sm',
    icon: 'w-5 h-5',
    label: 'text-sm',
    help: 'text-sm',
  },
  lg: {
    input: 'px-4 py-3 text-base',
    icon: 'w-6 h-6',
    label: 'text-base',
    help: 'text-sm',
  },
};

const variantClasses = {
  default: {
    input: 'border border-gray-300 bg-white focus:border-claude-500 focus:ring-claude-500',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
  },
  filled: {
    input: 'border-0 bg-gray-100 focus:bg-white focus:ring-claude-500',
    error: 'bg-red-50 focus:bg-white focus:ring-red-500',
    success: 'bg-green-50 focus:bg-white focus:ring-green-500',
  },
  outlined: {
    input: 'border-2 border-gray-200 bg-transparent focus:border-claude-500 focus:ring-0',
    error: 'border-red-500 focus:border-red-500',
    success: 'border-green-500 focus:border-green-500',
  },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  help,
  size = 'md',
  variant = 'default',
  leftIcon,
  rightIcon,
  loading = false,
  success = false,
  clearable = false,
  onClear,
  animated = true,
  className,
  id,
  value,
  onChange,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);
  const hasSuccess = success && !hasError;

  const getVariantClass = () => {
    if (hasError) return variantClasses[variant].error;
    if (hasSuccess) return variantClasses[variant].success;
    return variantClasses[variant].input;
  };

  const inputElement = (
    <div className="relative">
      {leftIcon && (
        <div className={clsx(
          'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400',
          sizeClasses[size].icon
        )}>
          {leftIcon}
        </div>
      )}

      <input
        ref={ref}
        id={inputId}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={clsx(
          'w-full rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size].input,
          getVariantClass(),
          leftIcon && 'pl-10',
          (rightIcon || clearable || hasError || hasSuccess || loading) && 'pr-10',
          className
        )}
        {...props}
      />

      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
        {loading && (
          <div className={clsx('animate-spin text-gray-400', sizeClasses[size].icon)}>
            <div className="w-full h-full border-2 border-gray-300 border-t-claude-500 rounded-full" />
          </div>
        )}

        {!loading && hasError && (
          <AlertCircle className={clsx('text-red-500', sizeClasses[size].icon)} />
        )}

        {!loading && hasSuccess && (
          <CheckCircle className={clsx('text-green-500', sizeClasses[size].icon)} />
        )}

        {!loading && clearable && value && (
          <button
            type="button"
            onClick={onClear}
            className={clsx(
              'text-gray-400 hover:text-gray-600 transition-colors',
              sizeClasses[size].icon
            )}
            aria-label="Clear input"
          >
            <X className="w-full h-full" />
          </button>
        )}

        {!loading && !hasError && !hasSuccess && !clearable && rightIcon && (
          <div className={clsx('text-gray-400', sizeClasses[size].icon)}>
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  );

  const content = (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={clsx(
            'block font-medium text-gray-700 mb-2',
            sizeClasses[size].label
          )}
        >
          {label}
        </label>
      )}

      {animated ? (
        <motion.div
          initial={false}
          animate={{
            scale: focused ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {inputElement}
        </motion.div>
      ) : (
        inputElement
      )}

      {(error || help) && (
        <div className="mt-2">
          {error && (
            <p className={clsx('text-red-600', sizeClasses[size].help)}>
              {error}
            </p>
          )}
          {help && !error && (
            <p className={clsx('text-gray-500', sizeClasses[size].help)}>
              {help}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return content;
});

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  help,
  size = 'md',
  variant = 'default',
  resize = true,
  animated = true,
  className,
  id,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);

  const getVariantClass = () => {
    if (hasError) return variantClasses[variant].error;
    return variantClasses[variant].input;
  };

  const textareaElement = (
    <textarea
      ref={ref}
      id={textareaId}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={clsx(
        'w-full rounded-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size].input,
        getVariantClass(),
        !resize && 'resize-none',
        className
      )}
      {...props}
    />
  );

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className={clsx(
            'block font-medium text-gray-700 mb-2',
            sizeClasses[size].label
          )}
        >
          {label}
        </label>
      )}

      {animated ? (
        <motion.div
          initial={false}
          animate={{
            scale: focused ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {textareaElement}
        </motion.div>
      ) : (
        textareaElement
      )}

      {(error || help) && (
        <div className="mt-2">
          {error && (
            <p className={clsx('text-red-600', sizeClasses[size].help)}>
              {error}
            </p>
          )}
          {help && !error && (
            <p className={clsx('text-gray-500', sizeClasses[size].help)}>
              {help}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  searchDelay = 300,
  ...props
}) => {
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    props.onChange?.(e);

    if (onSearch) {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      setSearchTimeout(setTimeout(() => {
        onSearch(value);
      }, searchDelay));
    }
  };

  return (
    <Input
      type="search"
      leftIcon={<Search />}
      clearable
      {...props}
      onChange={handleChange}
    />
  );
};

export const PasswordInput: React.FC<PasswordInputProps> = ({
  strengthMeter = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0);

  const calculateStrength = (password: string): number => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    props.onChange?.(e);

    if (strengthMeter) {
      setStrength(calculateStrength(value));
    }
  };

  const getStrengthColor = (strength: number): string => {
    if (strength < 2) return 'bg-red-500';
    if (strength < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = (strength: number): string => {
    if (strength < 2) return 'Weak';
    if (strength < 4) return 'Medium';
    return 'Strong';
  };

  return (
    <div>
      <Input
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        }
        {...props}
        onChange={handleChange}
      />

      {strengthMeter && props.value && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Password strength</span>
            <span className="text-xs text-gray-500">{getStrengthLabel(strength)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={clsx(
                'h-2 rounded-full transition-all duration-300',
                getStrengthColor(strength)
              )}
              style={{ width: `${(strength / 5) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Compound exports
Input.Textarea = Textarea;
Input.Search = SearchInput;
Input.Password = PasswordInput;

export default Input;