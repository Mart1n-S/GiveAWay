import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, Pencil, Plus, Search, ShieldOff, Trash2, UserCheck } from 'lucide-react';
import { UsersService } from '@/services/users.service';
import { Badge, statusColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/ui/field-error';
import { formatDate } from '@/lib/utils';
import { parseApiError, toastApiError, type FieldErrors } from '@/lib/errors';

const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s\-']+$/;

interface UserRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
}

interface UserListResp {
  items: UserRow[];
  total: number;
}

interface CreateForm {
  email: string;
  firstName: string;
  lastName: string;
  age: string;
  street: string;
  postalCode: string;
  city: string;
}

const emptyForm: CreateForm = {
  email: '',
  firstName: '',
  lastName: '',
  age: '',
  street: '',
  postalCode: '',
  city: '',
};

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [createErrors, setCreateErrors] = useState<FieldErrors>({});

  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', biography: '' });
  const [editErrors, setEditErrors] = useState<FieldErrors>({});

  // Charge la biographie courante quand on ouvre la modale d'édition (pas dans la liste)
  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    UsersService.get(editing.id)
      .then((u: { biography: string | null }) => {
        if (!cancelled) {
          setEditForm((prev) => ({ ...prev, biography: u.biography ?? '' }));
        }
      })
      .catch(() => {
        /* on garde la valeur par défaut (vide) en cas d'échec */
      });
    return () => {
      cancelled = true;
    };
  }, [editing]);

  const validateCreate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!form.email.trim()) errs.email = "L'email est obligatoire";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Format d'email invalide";
    if (form.firstName.trim().length < 2) errs.firstName = 'Le prénom est trop court (2 caractères minimum)';
    else if (!NAME_REGEX.test(form.firstName.trim())) errs.firstName = "Caractères invalides (lettres, espaces, tirets, apostrophes)";
    if (form.lastName.trim().length < 2) errs.lastName = 'Le nom est trop court (2 caractères minimum)';
    else if (!NAME_REGEX.test(form.lastName.trim())) errs.lastName = "Caractères invalides (lettres, espaces, tirets, apostrophes)";
    const ageNum = Number(form.age);
    if (!form.age) errs.age = "L'âge est obligatoire";
    else if (!Number.isInteger(ageNum)) errs.age = "L'âge doit être un nombre entier";
    else if (ageNum < 18) errs.age = "L'utilisateur doit avoir au moins 18 ans";
    else if (ageNum > 100) errs.age = "Veuillez entrer un âge valide";
    if (!form.street.trim()) errs['address.street'] = "L'adresse est obligatoire";
    if (!/^\d{5}$/.test(form.postalCode.trim())) errs['address.postalCode'] = 'Le code postal doit contenir 5 chiffres';
    if (!form.city.trim()) errs['address.city'] = 'La ville est obligatoire';
    return errs;
  };

  const validateEdit = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (editForm.firstName.trim().length < 2) errs.firstName = 'Le prénom est trop court (2 caractères minimum)';
    else if (!NAME_REGEX.test(editForm.firstName.trim())) errs.firstName = 'Caractères invalides';
    if (editForm.lastName.trim().length < 2) errs.lastName = 'Le nom est trop court (2 caractères minimum)';
    else if (!NAME_REGEX.test(editForm.lastName.trim())) errs.lastName = 'Caractères invalides';
    if (editForm.biography.length > 1000) errs.biography = 'La biographie est trop longue (1000 caractères max)';
    return errs;
  };

  const { data, isLoading } = useQuery<UserListResp>({
    queryKey: ['users', search, status],
    queryFn: () =>
      UsersService.list({ search: search || undefined, status: status || undefined, limit: 100 }),
  });

  const create = useMutation({
    mutationFn: () =>
      UsersService.create({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        age: Number(form.age),
        address: {
          street: form.street,
          postalCode: form.postalCode,
          city: form.city,
        },
      }),
    onSuccess: () => {
      setCreating(false);
      setForm(emptyForm);
      setCreateErrors({});
      toast.success('Utilisateur créé — un email avec un mot de passe temporaire lui a été envoyé');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      const { fieldErrors, generalMessage } = parseApiError(err, 'Échec de la création');
      setCreateErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) toast.error(generalMessage);
      else toast.error(generalMessage);
    },
  });

  const update = useMutation({
    mutationFn: () =>
      UsersService.update(editing!.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        biography: editForm.biography.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Utilisateur mis à jour');
      setEditing(null);
      setEditErrors({});
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      const { fieldErrors, generalMessage } = parseApiError(err, 'Échec de la mise à jour');
      setEditErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) toast.error(generalMessage);
      else toast.error(generalMessage);
    },
  });

  const setStatusMut = useMutation({
    mutationFn: ({ id, s }: { id: number; s: 'ACTIVE' | 'SUSPENDED' }) =>
      UsersService.setStatus(id, s),
    onSuccess: () => {
      toast.success('Statut mis à jour');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toastApiError(err, 'Échec de la mise à jour du statut'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => UsersService.remove(id),
    onSuccess: () => {
      toast.success('Compte anonymisé');
      setDeleting(null);
      setConfirmText('');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toastApiError(err, 'Échec de la suppression'),
  });

  const submitCreate = () => {
    const errs = validateCreate();
    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Veuillez corriger les champs en erreur');
      return;
    }
    create.mutate();
  };

  const submitUpdate = () => {
    const errs = validateEdit();
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Veuillez corriger les champs en erreur');
      return;
    }
    update.mutate();
  };

  const clearCreateErr = (k: string) => {
    if (createErrors[k]) {
      const next = { ...createErrors };
      delete next[k];
      setCreateErrors(next);
    }
  };
  const clearEditErr = (k: string) => {
    if (editErrors[k]) {
      const next = { ...editErrors };
      delete next[k];
      setEditErrors(next);
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
          <p className="text-sm text-slate-500">Gestion des comptes bénévoles</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} className="mr-1.5" /> Nouvel utilisateur
        </Button>
      </div>

      <Card>
        <CardBody>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative max-w-sm flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Recherche nom / email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tous statuts</option>
              <option value="PENDING">En attente</option>
              <option value="ACTIVE">Actif</option>
              <option value="SUSPENDED">Suspendu</option>
              <option value="DELETED">Supprimé</option>
            </select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm text-slate-500">{data?.total ?? 0} utilisateur(s)</p>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 text-slate-400">Chargement…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor(u.status)}>{u.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/users/${u.id}`}>
                          <Button size="sm" variant="outline" title="Voir le détail">
                            <Eye size={14} className="mr-1" /> Détail
                          </Button>
                        </Link>
                        {u.status !== 'DELETED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Modifier"
                            onClick={() => {
                              setEditing(u);
                              setEditForm({
                                firstName: u.firstName,
                                lastName: u.lastName,
                                biography: '',
                              });
                              setEditErrors({});
                            }}
                          >
                            <Pencil size={14} />
                          </Button>
                        )}
                        {u.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            title="Suspendre"
                            onClick={() => setStatusMut.mutate({ id: u.id, s: 'SUSPENDED' })}
                          >
                            <ShieldOff size={14} className="mr-1" /> Suspendre
                          </Button>
                        )}
                        {u.status === 'SUSPENDED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            title="Réactiver"
                            onClick={() => setStatusMut.mutate({ id: u.id, s: 'ACTIVE' })}
                          >
                            <UserCheck size={14} className="mr-1" /> Réactiver
                          </Button>
                        )}
                        {u.status !== 'DELETED' && (
                          <Button size="sm" variant="danger" title="Supprimer" onClick={() => setDeleting(u)}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Aucun utilisateur ne correspond à votre recherche.
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
        onClose={() => { setCreating(false); setCreateErrors({}); }}
        title="Créer un utilisateur"
        size="lg"
      >
        <p className="mb-4 text-sm text-slate-500">
          Un mot de passe temporaire sera généré automatiquement et envoyé par email à l'utilisateur.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input
              placeholder="Email *"
              type="email"
              value={form.email}
              aria-invalid={!!createErrors.email}
              className={createErrors.email ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); clearCreateErr('email'); }}
            />
            <FieldError message={createErrors.email} />
          </div>
          <div>
            <Input
              placeholder="Prénom *"
              value={form.firstName}
              aria-invalid={!!createErrors.firstName}
              className={createErrors.firstName ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, firstName: e.target.value }); clearCreateErr('firstName'); }}
            />
            <FieldError message={createErrors.firstName} />
          </div>
          <div>
            <Input
              placeholder="Nom *"
              value={form.lastName}
              aria-invalid={!!createErrors.lastName}
              className={createErrors.lastName ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, lastName: e.target.value }); clearCreateErr('lastName'); }}
            />
            <FieldError message={createErrors.lastName} />
          </div>
          <div>
            <Input
              placeholder="Âge *"
              type="number"
              min={18}
              max={100}
              value={form.age}
              aria-invalid={!!createErrors.age}
              className={createErrors.age ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, age: e.target.value }); clearCreateErr('age'); }}
            />
            <FieldError message={createErrors.age} />
          </div>
          <div />
          <div className="col-span-2">
            <Input
              placeholder="Adresse *"
              value={form.street}
              aria-invalid={!!createErrors['address.street']}
              className={createErrors['address.street'] ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, street: e.target.value }); clearCreateErr('address.street'); }}
            />
            <FieldError message={createErrors['address.street']} />
          </div>
          <div>
            <Input
              placeholder="Code postal *"
              value={form.postalCode}
              aria-invalid={!!createErrors['address.postalCode']}
              className={createErrors['address.postalCode'] ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, postalCode: e.target.value }); clearCreateErr('address.postalCode'); }}
            />
            <FieldError message={createErrors['address.postalCode']} />
          </div>
          <div>
            <Input
              placeholder="Ville *"
              value={form.city}
              aria-invalid={!!createErrors['address.city']}
              className={createErrors['address.city'] ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setForm({ ...form, city: e.target.value }); clearCreateErr('address.city'); }}
            />
            <FieldError message={createErrors['address.city']} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCreating(false)}>Annuler</Button>
          <Button disabled={create.isPending} onClick={submitCreate}>
            {create.isPending ? 'Création…' : 'Créer'}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={!!editing}
        onClose={() => { setEditing(null); setEditErrors({}); }}
        title={`Modifier ${editing?.email}`}
      >
        <p className="mb-3 text-xs text-slate-500">
          Pour modération de contenu : seuls le prénom, le nom et la biographie sont éditables.
          L'email et l'âge restent à la main de l'utilisateur.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Prénom *</label>
            <Input
              value={editForm.firstName}
              aria-invalid={!!editErrors.firstName}
              className={editErrors.firstName ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setEditForm({ ...editForm, firstName: e.target.value }); clearEditErr('firstName'); }}
            />
            <FieldError message={editErrors.firstName} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nom *</label>
            <Input
              value={editForm.lastName}
              aria-invalid={!!editErrors.lastName}
              className={editErrors.lastName ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setEditForm({ ...editForm, lastName: e.target.value }); clearEditErr('lastName'); }}
            />
            <FieldError message={editErrors.lastName} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Biographie <span className="text-slate-400">({editForm.biography.length}/1000)</span>
            </label>
            <Textarea
              placeholder="Biographie (laisser vide pour ne pas la modifier)"
              value={editForm.biography}
              aria-invalid={!!editErrors.biography}
              className={editErrors.biography ? 'border-red-500 focus:ring-red-500' : ''}
              onChange={(e) => { setEditForm({ ...editForm, biography: e.target.value }); clearEditErr('biography'); }}
            />
            <FieldError message={editErrors.biography} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
            <Button disabled={update.isPending} onClick={submitUpdate}>
              {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deleting}
        onClose={() => {
          setDeleting(null);
          setConfirmText('');
        }}
        title={`Supprimer ${deleting?.email}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-red-600">
            ⚠️ Suppression RGPD : email/nom/prénom/photo seront anonymisés. Cette action est irréversible.
          </p>
          <p className="text-sm text-slate-600">
            Tapez <code className="bg-slate-100 px-2 py-0.5 rounded">SUPPRIMER</code> pour confirmer :
          </p>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Annuler</Button>
            <Button
              variant="danger"
              disabled={confirmText !== 'SUPPRIMER' || remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              Anonymiser
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
