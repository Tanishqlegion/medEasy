import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Button = forwardRef(
  ({ className, variant = 'primary', size = 'default', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-50 tracking-wide',
          {
            // Neon glowing primary button
            'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] border border-white/10 hover:border-white/20 hover:scale-[1.02]': variant === 'primary',
            // Glass secondary
            'bg-white/5 text-cyan-50 border border-white/10 hover:bg-white/10 backdrop-blur-md hover:border-cyan-500/50 shadow-lg': variant === 'secondary',
            // Outline neon
            'border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 hover:text-cyan-300': variant === 'outline',
            // Ghost
            'hover:bg-white/5 text-slate-300 hover:text-white': variant === 'ghost',
            // Sizes
            'h-11 px-6 py-2': size === 'default',
            'h-9 px-4 text-xs': size === 'sm',
            'h-14 px-10 text-base': size === 'lg',
            'h-11 w-11': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
