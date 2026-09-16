import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'yes' | 'no' | 'yes-soft' | 'no-soft' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'bg-surface-3 text-fg hover:bg-border',
  outline: 'border border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-2',
  ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-fg',
  yes: 'bg-yes text-white hover:bg-yes-hover',
  no: 'bg-no text-white hover:bg-no-hover',
  'yes-soft': 'bg-yes-soft text-yes hover:bg-yes hover:text-white',
  'no-soft': 'bg-no-soft text-no hover:bg-no hover:text-white',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs rounded-md gap-1',
  sm: 'h-8 px-3 text-[13px] rounded-md gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-md gap-2',
  lg: 'h-11 px-4 text-[15px] rounded-md gap-2',
  icon: 'h-8 w-8 rounded-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-semibold transition-colors duration-100',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
