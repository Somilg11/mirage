import { cn } from '../../lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-fg" />
      <path
        d="M8 22V10.5l8 7.5 8-7.5V22"
        fill="none"
        className="stroke-bg"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className="size-6" />
      <span className="text-[16px] font-semibold tracking-tight text-fg">Mirage</span>
    </span>
  );
}
