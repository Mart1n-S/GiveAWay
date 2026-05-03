import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { login } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginPage() {
  const navigate = useNavigate();
  const set = useAuthStore((s) => s.set);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ email, password });
      if (res.admin) set(res.admin);
      toast.success('Connexion réussie');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Identifiants invalides';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg space-y-5"
      >
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-brand-600">GiveAWay</h1>
          <p className="text-sm text-slate-500">Console d'administration</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
            Mot de passe
          </label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </div>
  );
}
