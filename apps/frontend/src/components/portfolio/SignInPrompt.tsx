import type { ReactNode } from 'react';
import { Wallet } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { Card, Skeleton } from '../ui/primitives';
import { SignInButton } from '../layout/AuthControls';

/** Renders children only for signed-in users; otherwise a sign-in call to action. */
export function RequireAuth({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { status } = useAuth();
  if (status === 'authenticated') return <>{children}</>;
  if (status === 'loading') return <Skeleton className="h-56 rounded-lg" />;
  return (
    <Card className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="relative flex flex-col items-center px-6 py-14 text-center">
        <div className="grid size-11 place-items-center rounded-md border border-border bg-surface-2 text-muted">
          <Wallet className="size-5" />
        </div>
        <h2 className="mt-4 text-base font-semibold">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
        <SignInButton className="mt-5">Connect wallet</SignInButton>
      </div>
    </Card>
  );
}
