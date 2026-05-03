import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { changePassword, me } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
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

const errInput = (hasErr: boolean) =>
  cn('pr-10', hasErr && 'border-destructive focus-visible:ring-destructive');

interface PasswordFieldProps {
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
}

function PasswordField({
  label,
  value,
  show,
  onToggle,
  onChange,
  error,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          aria-invalid={!!error}
          className={errInput(!!error)}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
          title={show ? 'Masquer' : 'Afficher'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );
}

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
    else if (form.newPassword !== form.confirmPassword)
      errs.confirmPassword = 'Les mots de passe ne correspondent pas';
    if (
      form.currentPassword &&
      form.newPassword &&
      form.currentPassword === form.newPassword
    ) {
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
      const { fieldErrors, generalMessage } = parseApiError(
        err,
        'Échec du changement de mot de passe',
      );
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
        <h1 className="text-2xl font-bold tracking-tight">Changer mon mot de passe</h1>
        <p className="text-sm text-muted-foreground">
          Pour des raisons de sécurité, choisissez un mot de passe robuste et distinct de
          l&apos;ancien.
        </p>
      </div>

      {mustChange && (
        <Alert>
          <AlertTitle>Action requise</AlertTitle>
          <AlertDescription>
            Votre mot de passe a été (ré)initialisé par un administrateur. Vous devez le changer
            avant de pouvoir accéder aux autres pages.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sécurité du compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PasswordField
            label="Mot de passe actuel *"
            value={form.currentPassword}
            show={show.current}
            onToggle={() => setShow({ ...show, current: !show.current })}
            onChange={(v) => {
              setForm({ ...form, currentPassword: v });
              clearErr('currentPassword');
            }}
            error={errors.currentPassword}
            autoComplete="current-password"
          />

          <div>
            <PasswordField
              label="Nouveau mot de passe *"
              value={form.newPassword}
              show={show.next}
              onToggle={() => setShow({ ...show, next: !show.next })}
              onChange={(v) => {
                setForm({ ...form, newPassword: v });
                clearErr('newPassword');
              }}
              error={errors.newPassword}
              autoComplete="new-password"
            />

            {form.newPassword.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 flex-1 rounded-full',
                        passwordStrength >= i
                          ? passwordStrength <= 2
                            ? 'bg-red-400'
                            : passwordStrength <= 4
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                          : 'bg-muted',
                      )}
                    />
                  ))}
                </div>
                <ul className="space-y-1 text-xs">
                  {rules.map((r) => {
                    const ok = r.test(form.newPassword);
                    return (
                      <li
                        key={r.label}
                        className={cn(
                          'flex items-center gap-1.5',
                          ok
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground',
                        )}
                      >
                        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {r.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <PasswordField
            label="Confirmer le nouveau mot de passe *"
            value={form.confirmPassword}
            show={show.confirm}
            onToggle={() => setShow({ ...show, confirm: !show.confirm })}
            onChange={(v) => {
              setForm({ ...form, confirmPassword: v });
              clearErr('confirmPassword');
            }}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Annuler
            </Button>
            <Button disabled={mutation.isPending} onClick={submit}>
              {mutation.isPending ? 'Enregistrement…' : 'Mettre à jour'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
