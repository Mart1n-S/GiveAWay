import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { AdminRole } from '@repo/shared';
import { me } from '@/services/auth.service';

interface Props {
  requiredRole?: AdminRole;
}

export function ProtectedRoute({ requiredRole }: Props) {
  const { admin, set, clear, isHydrated } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;
    me()
      .then((a) => {
        if (!cancelled) set(a);
      })
      .catch(() => {
        if (!cancelled) clear();
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, set, clear]);

  if (!isHydrated || checking) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Chargement…
      </div>
    );
  }

  if (!admin) return <Navigate to="/login" replace />;
  if (requiredRole && admin.role !== requiredRole) return <Navigate to="/dashboard" replace />;

  // Si le compte vient d'être créé/réinitialisé, force le changement de mot de passe
  // avant tout accès aux autres pages.
  if (admin.mustChangePassword && location.pathname !== '/account/password') {
    return <Navigate to="/account/password" replace />;
  }

  return <Outlet />;
}
