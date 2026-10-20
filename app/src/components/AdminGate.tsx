import { ReactNode } from 'react';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';

/** Screen wrapper for admin-only pages: shows a lock state to everyone else. */
export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return (
      <Screen title={title} back>
        <EmptyState icon="lock-closed-outline" title="Admins only" />
      </Screen>
    );
  }

  return (
    <Screen title={title} back>
      {children}
    </Screen>
  );
}
