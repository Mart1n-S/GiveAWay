import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminsService } from '@/services/admins.service';
import { Badge, statusColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FieldError } from '@/components/ui/field-error';
import { useAuthStore } from '@/stores/auth.store';
import { AdminRole } from '@repo/shared';
import { formatDate } from '@/lib/utils';
import { parseApiError, toastApiError, type FieldErrors } from '@/lib/errors';

interface AdminRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  lastLoginAt: string | null;
  createdAt: string;
}

const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s\-']+$/;

interface FormState {
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
}

const emptyForm: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  role: AdminRole.ADMIN,
};

export function AdminsPage() {
  const qc = useQueryClient();
  const current = useAuthStore((s) => s.admin);
  const isSuperAdmin = current?.role === AdminRole.SUPER_ADMIN;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [deleting, setDeleting] = useState<AdminRow | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});

  const { data, isLoading } = useQuery<AdminRow[]>({
    queryKey: ['admins'],
    queryFn: () => AdminsService.list(),
  });

  const validate = (state: FormState, requireAll: boolean): FieldErrors => {
    const errs: FieldErrors = {};
    if (requireAll || state.email) {
      if (!state.email.trim()) errs.email = "L'email est obligatoire";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) errs.email = "Format d'email invalide";
    }
    if (requireAll || state.firstName) {
      if (state.firstName.trim().length < 2) errs.firstName = 'Le prénom est trop court (2 caractères minimum)';
      else if (!NAME_REGEX.test(state.firstName.trim())) errs.firstName = 'Caractères invalides';
    }
    if (requireAll || state.lastName) {
      if (state.lastName.trim().length < 2) errs.lastName = 'Le nom est trop court (2 caractères minimum)';
      else if (!NAME_REGEX.test(state.lastName.trim())) errs.lastName = 'Caractères invalides';
    }
    return errs;
  };

  const clearErr = (k: string) => {
    if (formErrors[k]) {
      const next = { ...formErrors };
      delete next[k];
      setFormErrors(next);
    }
  };

  const create = useMutation({
    mutationFn: () => AdminsService.create(form),
    onSuccess: () => {
      toast.success('Admin créé — email envoyé');
      setCreating(false);
      setForm(emptyForm);
      setFormErrors({});
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (err) => {
      const { fieldErrors, generalMessage } = parseApiError(err, 'Échec de la création');
      setFormErrors(fieldErrors);
      toast.error(generalMessage);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<FormState> }) => AdminsService.update(id, dto),
    onSuccess: () => {
      toast.success('Admin modifié');
      setEditing(null);
      setFormErrors({});
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (err) => {
      const { fieldErrors, generalMessage } = parseApiError(err, 'Échec de la modification');
      setFormErrors(fieldErrors);
      toast.error(generalMessage);
    },
  });

  const reset = useMutation({
    mutationFn: (id: number) => AdminsService.resetPassword(id),
    onSuccess: () => toast.success('Email de réinitialisation envoyé'),
    onError: (err) => toastApiError(err, 'Échec de la réinitialisation'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => AdminsService.remove(id),
    onSuccess: () => {
      toast.success('Admin supprimé');
      setDeleting(null);
      setConfirmText('');
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (err) => toastApiError(err, 'Échec de la suppression'),
  });

  const submitCreate = () => {
    const errs = validate(form, true);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Veuillez corriger les champs en erreur');
      return;
    }
    create.mutate();
  };

  const submitUpdate = () => {
    if (!editing) return;
    const errs = validate(form, true);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Veuillez corriger les champs en erreur');
      return;
    }
    update.mutate({ id: editing.id, dto: form });
  };

  const items = data ?? [];
  const superAdminCount = items.filter((a) => a.role === AdminRole.SUPER_ADMIN).length;

  const isLastSuperAdmin = (a: AdminRow) =>
    a.role === AdminRole.SUPER_ADMIN && superAdminCount <= 1;
  const isSelf = (a: AdminRow) => current?.id === a.id;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comptes admin</h1>
          <p className="text-sm text-slate-500">
            {isSuperAdmin
              ? "Gestion des comptes d'administration de la plateforme"
              : "Liste des administrateurs (lecture seule — réservé aux SUPER_ADMIN pour les modifications)"}
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => { setForm(emptyForm); setFormErrors({}); setCreating(true); }}>
            <Plus size={16} className="mr-1.5" /> Nouvel admin
          </Button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Lock size={16} className="mt-0.5" />
          <div>
            <p className="font-medium">Lecture seule</p>
            <p className="text-amber-800">
              Vous pouvez consulter la liste des administrateurs pour la transparence de l'équipe, mais
              seuls les SUPER_ADMIN peuvent créer, modifier ou supprimer un compte admin.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <p className="text-sm text-slate-500">{items.length} admin(s)</p>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 text-slate-400">Chargement…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Dernier login</th>
                  <th className="px-4 py-3">Créé le</th>
                  {isSuperAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{a.email}</td>
                    <td className="px-4 py-3 text-slate-600">{a.firstName} {a.lastName}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(a.role)}>{a.role}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{a.lastLoginAt ? formatDate(a.lastLoginAt, true) : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(a.createdAt)}</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Modifier"
                            onClick={() => {
                              setEditing(a);
                              setForm({ email: a.email, firstName: a.firstName, lastName: a.lastName, role: a.role });
                              setFormErrors({});
                            }}
                          >
                            <Pencil size={14} className="mr-1" /> Modifier
                          </Button>
                          <Button size="sm" variant="ghost" title="Reset MDP" onClick={() => reset.mutate(a.id)}>
                            <KeyRound size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            title={
                              isSelf(a)
                                ? 'Vous ne pouvez pas vous supprimer'
                                : isLastSuperAdmin(a)
                                ? 'Dernier SUPER_ADMIN — protégé'
                                : 'Supprimer'
                            }
                            disabled={isSelf(a) || isLastSuperAdmin(a)}
                            onClick={() => setDeleting(a)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="p-6 text-center text-slate-400">
                      Aucun admin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Dialog
        open={creating}
        onClose={() => { setCreating(false); setFormErrors({}); }}
        title="Créer un admin"
      >
        <p className="mb-3 text-xs text-slate-500">
          Un mot de passe temporaire sera envoyé par email. L'admin devra le changer à sa première connexion.
        </p>
        <div className="space-y-3">
          <div>
            <Input
              placeholder="Email *"
              type="email"
              value={form.email}
              aria-invalid={!!formErrors.email}
              className={formErrors.email ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); clearErr('email'); }}
            />
            <FieldError message={formErrors.email} />
          </div>
          <div>
            <Input
              placeholder="Prénom *"
              value={form.firstName}
              aria-invalid={!!formErrors.firstName}
              className={formErrors.firstName ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, firstName: e.target.value }); clearErr('firstName'); }}
            />
            <FieldError message={formErrors.firstName} />
          </div>
          <div>
            <Input
              placeholder="Nom *"
              value={form.lastName}
              aria-invalid={!!formErrors.lastName}
              className={formErrors.lastName ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, lastName: e.target.value }); clearErr('lastName'); }}
            />
            <FieldError message={formErrors.lastName} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Rôle *</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
            >
              <option value={AdminRole.ADMIN}>ADMIN</option>
              <option value={AdminRole.SUPER_ADMIN}>SUPER_ADMIN</option>
            </select>
            <FieldError message={formErrors.role} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>Annuler</Button>
            <Button disabled={create.isPending} onClick={submitCreate}>
              {create.isPending ? 'Création…' : 'Créer'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!editing}
        onClose={() => { setEditing(null); setFormErrors({}); }}
        title={`Modifier ${editing?.email}`}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
            <Input
              type="email"
              value={form.email}
              aria-invalid={!!formErrors.email}
              className={formErrors.email ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); clearErr('email'); }}
            />
            <FieldError message={formErrors.email} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Prénom</label>
            <Input
              value={form.firstName}
              aria-invalid={!!formErrors.firstName}
              className={formErrors.firstName ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, firstName: e.target.value }); clearErr('firstName'); }}
            />
            <FieldError message={formErrors.firstName} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nom</label>
            <Input
              value={form.lastName}
              aria-invalid={!!formErrors.lastName}
              className={formErrors.lastName ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, lastName: e.target.value }); clearErr('lastName'); }}
            />
            <FieldError message={formErrors.lastName} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Rôle</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
              value={form.role}
              disabled={!!(editing && isSelf(editing) && editing.role === AdminRole.SUPER_ADMIN)}
              onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
            >
              <option value={AdminRole.ADMIN}>ADMIN</option>
              <option value={AdminRole.SUPER_ADMIN}>SUPER_ADMIN</option>
            </select>
            {editing && isSelf(editing) && editing.role === AdminRole.SUPER_ADMIN && (
              <p className="mt-1 text-xs text-slate-500">
                Vous ne pouvez pas rétrograder votre propre compte SUPER_ADMIN.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
            <Button disabled={update.isPending} onClick={submitUpdate}>
              {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deleting}
        onClose={() => { setDeleting(null); setConfirmText(''); }}
        title={`Supprimer ${deleting?.email}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-red-600">⚠️ Suppression définitive du compte admin.</p>
          <Input placeholder="Tapez SUPPRIMER" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Annuler</Button>
            <Button
              variant="danger"
              disabled={confirmText !== 'SUPPRIMER' || remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
