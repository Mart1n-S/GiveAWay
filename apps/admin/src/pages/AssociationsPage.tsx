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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatDate } from '@/lib/utils';

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
    queryFn: () =>
      AssociationsService.list({
        status: tab === 'ALL' ? undefined : tab,
        search: search || undefined,
        limit: 100,
      }),
  });

  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      AssociationsService.suspend(id, reason),
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
        <h1 className="text-2xl font-bold tracking-tight">Associations</h1>
        <p className="text-sm text-muted-foreground">
          Liste, suivi et modération des associations
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Button
                key={t.key}
                variant={tab === t.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Recherche par nom, SIRET, RNA…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4">
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} résultat(s)</p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Chargement…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>SIRET / RNA</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.category?.name ?? '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.siret || a.rna || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(a.status)}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button asChild size="sm" variant="outline" title="Voir les détails">
                          <Link to={`/associations/${a.id}`}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> Détail
                          </Link>
                        </Button>
                        {a.status === 'SUSPENDED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reactivate.mutate(a.id)}
                            title="Réactiver"
                          >
                            <UserCheck className="mr-1 h-3.5 w-3.5" /> Réactiver
                          </Button>
                        )}
                        {a.status === 'VALIDATED' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setSuspending(a)}
                            title="Suspendre"
                          >
                            <ShieldOff className="mr-1 h-3.5 w-3.5" /> Suspendre
                          </Button>
                        )}
                        {a.status === 'REJECTED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => validate.mutate(a.id)}
                            title="Re-valider"
                          >
                            <UserCheck className="mr-1 h-3.5 w-3.5" /> Re-valider
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!suspending}
        onClose={() => {
          setSuspending(null);
          setReason('');
          setSuspendErrors({});
        }}
        title={`Suspendre ${suspending?.name}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            La suspension archive automatiquement les missions actives. Un email avec le motif
            sera envoyé au propriétaire de l&apos;association.
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
              className={cn(
                suspendErrors.reason && 'border-destructive focus-visible:ring-destructive',
              )}
            />
            <FieldError message={suspendErrors.reason} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSuspending(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || suspend.isPending}
              onClick={() =>
                suspending && suspend.mutate({ id: suspending.id, reason: reason.trim() })
              }
            >
              Suspendre
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
