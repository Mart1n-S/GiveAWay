import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { changePassword, me } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FieldError } from '@/components/ui/field-error';
import { parseApiError, type FieldErrors } from '@/lib/errors';

interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const empty: FormState = { currentPassword: '', newPassword: '', confirmPassword: '' };

interface Rule {
  label: string;
  test: (v: string) => boolean;
}
const rules: Rule[] = [
  { label: 'Au moins 12 caractères', test: (v) => v.length >= 12 },
  { label: 'Une majuscule (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { label: 'Une minuscule (a-z)', test: (v) => /[a-z]/.test(v) },
  { label: 'Un chiffre (0-9)', test: (v) => /[0-9]/.test(v) },
  { label: 'Un caractère spécial', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const setAdmin = useAuthStore((s) => s.set);
  const mustChange = useAuthStore((s) => !!s.admin?.mustChangePassword);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!form.currentPassword) errs.currentPassword = 'Mot de passe actuel requis';
    const failed = rules.filter((r) => !r.test(form.newPassword));
    if (failed.length > 0) errs.newPassword = failed[0].label;
    if (!form.confirmPassword) errs.confirmPassword = 'Confirmation requise';
    else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Les mots de passe ne correspondent pas';
    if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword) {
      errs.newPassword = "Le nouveau mot de passe doit être différent de l'actuel";
    }
    return errs;
  };

  const clearErr = (k: keyof FormState) => {
    if (errors[k]) {
      const next = { ...errors };
      delete next[k];
      setErrors(next);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      await changePassword(form.currentPassword, form.newPassword);
      // Refresh /me pour synchroniser mustChangePassword côté store
      const fresh = await me();
      setAdmin(fresh);
    },
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès');
      setForm(empty);
      setErrors({});
      navigate('/dashboard');
    },
    onError: (err) => {
      const { fieldErrors, generalMessage } = parseApiError(err, 'Échec du changement de mot de passe');
      setErrors(fieldErrors);
      toast.error(generalMessage);
    },
  });

  const submit = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Veuillez corriger les champs en erreur');
      return;
    }
    mutation.mutate();
  };

  const passwordStrength = rules.filter((r) => r.test(form.newPassword)).length;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Changer mon mot de passe</h1>
        <p className="text-sm text-slate-500">
          Pour des raisons de sécurité, choisissez un mot de passe robuste et distinct de l'ancien.
        </p>
      </div>

      {mustChange && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Action requise :</b> votre mot de passe a été (ré)initialisé par un administrateur.
          Vous devez le changer avant de pouvoir accéder aux autres pages.
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900">Sécurité du compte</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Mot de passe actuel *</label>
            <div className="relative">
              <Input
                type={show.current ? 'text' : 'password'}
                value={form.currentPassword}
                aria-invalid={!!errors.currentPassword}
                className={errors.currentPassword ? 'border-red-500 focus:ring-red-500 pr-10' : 'pr-10'}
                onChange={(e) => { setForm({ ...form, currentPassword: e.target.value }); clearErr('currentPassword'); }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700"
                onClick={() => setShow({ ...show, current: !show.current })}
                title={show.current ? 'Masquer' : 'Afficher'}
              >
                {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <FieldError message={errors.currentPassword} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nouveau mot de passe *</label>
            <div className="relative">
              <Input
                type={show.next ? 'text' : 'password'}
                value={form.newPassword}
                aria-invalid={!!errors.newPassword}
                className={errors.newPassword ? 'border-red-500 focus:ring-red-500 pr-10' : 'pr-10'}
                onChange={(e) => { setForm({ ...form, newPassword: e.target.value }); clearErr('newPassword'); }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700"
                onClick={() => setShow({ ...show, next: !show.next })}
                title={show.next ? 'Masquer' : 'Afficher'}
              >
                {show.next ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <FieldError message={errors.newPassword} />

            {form.newPassword.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        passwordStrength >= i
                          ? passwordStrength <= 2
                            ? 'bg-red-400'
                            : passwordStrength <= 4
                            ? 'bg-amber-400'
                            : 'bg-green-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <ul className="space-y-1 text-xs">
                  {rules.map((r) => {
                    const ok = r.test(form.newPassword);
                    return (
                      <li
                        key={r.label}
                        className={`flex items-center gap-1.5 ${ok ? 'text-green-600' : 'text-slate-500'}`}
                      >
                        {ok ? <Check size={12} /> : <X size={12} />}
                        {r.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Confirmer le nouveau mot de passe *</label>
            <div className="relative">
              <Input
                type={show.confirm ? 'text' : 'password'}
                value={form.confirmPassword}
                aria-invalid={!!errors.confirmPassword}
                className={errors.confirmPassword ? 'border-red-500 focus:ring-red-500 pr-10' : 'pr-10'}
                onChange={(e) => { setForm({ ...form, confirmPassword: e.target.value }); clearErr('confirmPassword'); }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700"
                onClick={() => setShow({ ...show, confirm: !show.confirm })}
                title={show.confirm ? 'Masquer' : 'Afficher'}
              >
                {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <FieldError message={errors.confirmPassword} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>Annuler</Button>
            <Button disabled={mutation.isPending} onClick={submit}>
              {mutation.isPending ? 'Enregistrement…' : 'Mettre à jour'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
