import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, Search, ShieldOff, UserCheck } from 'lucide-react';
import { AssociationsService } from '@/services/associations.service';
import { parseApiError, toastApiError, type FieldErrors } from '@/lib/errors';
import { FieldError } from '@/components/ui/field-error';
import { Badge, statusColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';

const TABS = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'VALIDATED', label: 'Validées' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'REJECTED', label: 'Refusées' },
  { key: 'SUSPENDED', label: 'Suspendues' },
];

interface AssoRow {
  id: number;
  name: string;
  status: string;
  siret?: string | null;
  rna?: string | null;
  createdAt: string;
  category?: { name: string } | null;
}

export function AssociationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [suspending, setSuspending] = useState<AssoRow | null>(null);
  const [reason, setReason] = useState('');
  const [suspendErrors, setSuspendErrors] = useState<FieldErrors>({});

  const { data, isLoading } = useQuery({
    queryKey: ['assos', tab, search],
    queryFn: () => AssociationsService.list({ status: tab === 'ALL' ? undefined : tab, search: search || undefined, limit: 100 }),
  });

  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => AssociationsService.suspend(id, reason),
    onSuccess: () => {
      toast.success('Association suspendue');
      setSuspending(null);
      setReason('');
      setSuspendErrors({});
      qc.invalidateQueries({ queryKey: ['assos'] });
    },
    onError: (err) => {
      const { fieldErrors, generalMessage } = parseApiError(err, 'Échec de la suspension');
      setSuspendErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) toast.error(generalMessage);
    },
  });

  const reactivate = useMutation({
    mutationFn: (id: number) => AssociationsService.reactivate(id),
    onSuccess: () => {
      toast.success('Association réactivée');
      qc.invalidateQueries({ queryKey: ['assos'] });
    },
    onError: (err) => toastApiError(err, 'Échec de la réactivation'),
  });

  const validate = useMutation({
    mutationFn: (id: number) => AssociationsService.validate(id),
    onSuccess: () => {
      toast.success('Association validée');
      qc.invalidateQueries({ queryKey: ['assos'] });
    },
    onError: (err) => toastApiError(err, 'Échec de la validation'),
  });

  const items = (data?.items ?? []) as AssoRow[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Associations</h1>
        <p className="text-sm text-slate-500">Liste, suivi et modération des associations</p>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {TABS.map((t) => (
              <Button
                key={t.key}
                variant={tab === t.key ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Recherche par nom, SIRET, RNA…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm text-slate-500">{data?.total ?? 0} résultat(s)</p>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 text-slate-400">Chargement…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Nom</th>
                  <th className="px-4 py-2">Catégorie</th>
                  <th className="px-4 py-2">SIRET / RNA</th>
                  <th className="px-4 py-2">Statut</th>
                  <th className="px-4 py-2">Créée le</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                    <td className="px-4 py-3 text-slate-600">{a.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{a.siret || a.rna || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor(a.status)}>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/associations/${a.id}`}>
                          <Button size="sm" variant="outline" title="Voir les détails (membres, missions)">
                            <Eye size={14} className="mr-1" /> Détail
                          </Button>
                        </Link>
                        {a.status === 'SUSPENDED' && (
                          <Button size="sm" variant="outline" onClick={() => reactivate.mutate(a.id)} title="Réactiver">
                            <UserCheck size={14} className="mr-1" /> Réactiver
                          </Button>
                        )}
                        {a.status === 'VALIDATED' && (
                          <Button size="sm" variant="danger" onClick={() => setSuspending(a)} title="Suspendre">
                            <ShieldOff size={14} className="mr-1" /> Suspendre
                          </Button>
                        )}
                        {a.status === 'REJECTED' && (
                          <Button size="sm" variant="outline" onClick={() => validate.mutate(a.id)} title="Re-valider">
                            <UserCheck size={14} className="mr-1" /> Re-valider
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Dialog
        open={!!suspending}
        onClose={() => { setSuspending(null); setReason(''); setSuspendErrors({}); }}
        title={`Suspendre ${suspending?.name}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            La suspension archive automatiquement les missions actives. Un email avec le motif sera envoyé au propriétaire de l'association.
          </p>
          <div>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (suspendErrors.reason) setSuspendErrors({ ...suspendErrors, reason: '' });
              }}
              placeholder="Motif de la suspension (10 caractères minimum) *"
              aria-invalid={!!suspendErrors.reason}
              className={suspendErrors.reason ? 'border-red-500 focus:ring-red-500' : ''}
            />
            <FieldError message={suspendErrors.reason} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSuspending(null)}>Annuler</Button>
            <Button
              variant="danger"
              disabled={!reason.trim() || suspend.isPending}
              onClick={() => suspending && suspend.mutate({ id: suspending.id, reason: reason.trim() })}
            >
              Suspendre
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
