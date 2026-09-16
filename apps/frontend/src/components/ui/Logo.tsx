import { useId } from 'react';
import { cn } from '../../lib/cn';

export function LogoMark({ className }: { className?: string }) {
  // Unique per instance: a duplicate id inside a hidden element would blank every other copy.
  const gradientId = `mirage-mark-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b8cff" />
          <stop offset="1" stopColor="#2255e8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path
        d="M8 21.5 12.5 11l3.5 7 3.5-7L24 21.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-[17px] font-bold tracking-tight text-fg">Mirage</span>
    </span>
  );
}
