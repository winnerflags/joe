'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const [pressing, setPressing] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (disabled || loading) return;
    setPressing(true);
    setTimeout(() => setPressing(false), 220);
    onClick?.(e);
  }

  return (
    <button
      disabled={disabled || loading}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed select-none',
        pressing && 'animate-press-pop',
        variant === 'primary' && 'bg-gold-500 text-navy-900 hover:bg-gold-400 active:scale-[.96]',
        variant === 'secondary' && 'bg-white border border-navy-100 text-navy-900 hover:border-navy-600 active:scale-[.97]',
        variant === 'ghost' && 'bg-transparent text-navy-600 hover:text-navy-900 hover:bg-cream-dark px-3 active:scale-[.97]',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
