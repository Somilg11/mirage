import type { HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-border bg-surface', className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-border px-4 py-3', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-surface-3', className)} aria-hidden />;
}

type BadgeTone = 'neutral' | 'yes' | 'no' | 'primary' | 'warn';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-3 text-muted',
  yes: 'bg-yes-soft text-yes',
  no: 'bg-no-soft text-no',
  primary: 'bg-primary-soft text-primary',
  warn: 'bg-warn-soft text-warn',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded px-1.5 text-[11px] font-semibold',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && <div className="mb-3 text-subtle [&>svg]:size-6">{icon}</div>}
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  error,
  onRetry,
  className,
}: {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const message = error instanceof Error ? error.message : undefined;
  return (
    <EmptyState
      className={className}
      icon={<AlertTriangle className="text-no" />}
      title={title}
      description={message}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw className="size-3.5" /> Try again
          </Button>
        )
      }
    />
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

/** Compact button group for small toggles (chart range, outcome view). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'sm',
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  size?: 'xs' | 'sm';
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex rounded-md border border-border bg-surface p-0.5', className)}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 whitespace-nowrap rounded font-semibold transition-colors',
              size === 'xs' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-[13px]',
              active ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Underlined section tabs, used for page-level navigation. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('no-scrollbar flex gap-5 overflow-x-auto border-b border-border px-4', className)}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              '-mb-px flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 text-sm font-semibold transition-colors',
              active ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-xs text-muted">{label}</div>
      <div className="num mt-1 truncate text-xl font-semibold tracking-tight text-fg">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-subtle">{hint}</div>}
    </div>
  );
}
