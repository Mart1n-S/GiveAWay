import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ClipboardList,
  History,
  KeyRound,
  LogOut,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { logout } from '@/services/auth.service';
import { cn } from '@/lib/utils';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/associations/pending', label: 'Validations', icon: ClipboardList },
  { to: '/associations', label: 'Associations', icon: Building2 },
  { to: '/users', label: 'Utilisateurs', icon: Users },
  { to: '/admins', label: 'Admins', icon: ShieldCheck },
  { to: '/logs', label: 'Journal', icon: History },
];

export function AdminLayout() {
  const { admin, clear } = useAuthStore();
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      clear();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 border-r border-slate-200 bg-white">
        <div className="p-6">
          <h1 className="text-xl font-extrabold text-brand-600">GiveAWay</h1>
          <p className="text-xs text-slate-500">Administration</p>
        </div>
        <nav className="px-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium mb-1 transition',
                  isActive ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div />
          <div className="flex items-center gap-3">
            {admin && (
              <div className="text-right">
                <div className="text-sm font-medium text-slate-900">
                  {admin.firstName} {admin.lastName}
                </div>
                <div className="text-xs text-slate-500">{admin.role}</div>
              </div>
            )}
            <Link
              to="/account/password"
              className="flex items-center gap-2 rounded-md p-2 text-slate-500 hover:bg-slate-100"
              title="Changer mon mot de passe"
            >
              <KeyRound size={18} />
            </Link>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 rounded-md p-2 text-slate-500 hover:bg-slate-100"
              title="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
