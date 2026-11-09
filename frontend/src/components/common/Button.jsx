import React from 'react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary', // primary | secondary | danger | success | outline
  size = 'md', // sm | md | lg
  disabled = false,
  isLoading = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none';

  const variantStyles = {
    primary: 'bg-zinc-900 hover:bg-zinc-800 text-white focus:ring-zinc-500 shadow-xs',
    secondary: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 focus:ring-zinc-400 border border-zinc-200/80',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-xs',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-xs',
    outline: 'border border-zinc-300 hover:bg-zinc-50 text-zinc-700 focus:ring-zinc-400',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}

