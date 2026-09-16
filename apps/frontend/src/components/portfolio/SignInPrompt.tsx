import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { Card, EmptyState } from '../ui/primitives';
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
  return (
    <Card>
      <EmptyState
        icon={<Lock className="size-5" />}
        title={title}
        description={description}
        action={<SignInButton loading={status === 'loading'}>Log in with wallet</SignInButton>}
      />
    </Card>
  );
}
