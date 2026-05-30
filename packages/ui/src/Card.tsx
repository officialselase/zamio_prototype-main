import React from 'react'

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  gradient?: {
    from: string;
    to: string;
    direction?: 'tr' | 'br' | 'bl' | 'tl' | 'r' | 'l' | 't' | 'b';
  };
  backdropBlur?: boolean;
  border?: boolean;
  borderColor?: string;
}

export default function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  rounded = 'xl',
  shadow = 'sm',
  hover = false,
  gradient,
  backdropBlur = false,
  border = false,
  borderColor
}: CardProps) {
  // Base styles
  const baseStyles = 'bg-white dark:bg-gray-800';

  // Variant styles
  const variantStyles = {
    default: '',
    elevated: 'shadow-lg',
    outlined: 'border border-gray-200 dark:border-gray-700',
    gradient: gradient ? `bg-gradient-to-${gradient.direction || 'br'} ${gradient.from} ${gradient.to}` : ''
  };

  // Padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  // Rounded styles
  const roundedStyles = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };

  // Shadow styles
  const shadowStyles = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  // Hover effects
  const hoverStyles = hover ? 'transition-all duration-300 hover:shadow-xl hover:scale-[1.02]' : '';

  // Backdrop blur
  const backdropStyles = backdropBlur ? 'backdrop-blur-sm' : '';

  // Border styles
  const borderStyles = border && borderColor ? `border ${borderColor}` : '';

  const cardStyles = [
    baseStyles,
    variantStyles[variant],
    paddingStyles[padding],
    roundedStyles[rounded],
    shadowStyles[shadow],
    hoverStyles,
    backdropStyles,
    borderStyles,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardStyles}>
      {children}
    </div>
  );
}