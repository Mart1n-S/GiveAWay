import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  BarChart3,
  Building2,
  ClipboardList,
  History,
  KeyRound,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { logout } from '@/services/auth.service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/associations/pending', label: 'Validations', icon: ClipboardList },
  { to: '/associations', label: 'Associations', icon: Building2 },
  { to: '/users', label: 'Utilisateurs', icon: Users },
  { to: '/admins', label: 'Admins', icon: ShieldCheck },
  { to: '/logs', label: 'Journal', icon: History },
];

function initials(first?: string, last?: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'A';
}

interface NavListProps {
  onNavigate?: () => void;
}

function NavList({ onNavigate }: NavListProps) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const { admin, clear } = useAuthStore();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      clear();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar - visible à partir de lg */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <div className="px-6 py-5">
          <h1 className="text-xl font-extrabold">GiveAWay</h1>
          <p className="text-xs text-muted-foreground">Administration</p>
        </div>
        <Separator />
        <NavList />
      </aside>

      {/* Drawer mobile - Radix Dialog primitives directement (pas DialogContent
          qui centre l'élément). Animation slide-in depuis la gauche. */}
      <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col border-r bg-card shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">
              Navigation principale
            </DialogPrimitive.Title>
            <div className="flex h-14 items-center justify-between border-b px-6">
              <span className="font-extrabold">GiveAWay</span>
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fermer le menu">
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
            <NavList onNavigate={() => setDrawerOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-card px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Ouvrir le menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold lg:hidden">GiveAWay</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 px-2"
                  aria-label="Menu utilisateur"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {initials(admin?.firstName, admin?.lastName)}
                  </span>
                  {admin && (
                    <span className="hidden text-left sm:block">
                      <span className="block text-sm font-medium leading-tight">
                        {admin.firstName} {admin.lastName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {admin.role}
                      </span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/account/password')}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Changer le mot de passe
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
