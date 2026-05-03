import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AssociationsService } from '@/services/associations.service';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, statusColor } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { DOCUMENT_TYPE } from '@/lib/labels';

interface AssoRow {
  id: number;
  name: string;
  siret: string | null;
  rna: string | null;
  status: string;
  createdAt: string;
  requiresManualReview: boolean;
  address?: { city: string } | null;
  members?: Array<{ user: { email: string; firstName: string } }>;
}

export function AssociationsPendingPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<AssoRow | null>(null);
  const [actionType, setActionType] = useState<'reject' | 'request-docs' | null>(null);
  const [reason, setReason] = useState('');
  const [docTypes, setDocTypes] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['assos-pending'],
    queryFn: () => AssociationsService.pending(1, 50),
  });

  const validate = useMutation({
    mutationFn: (id: number) => AssociationsService.validate(id),
    onSuccess: () => {
      toast.success('Association validée');
      qc.invalidateQueries({ queryKey: ['assos-pending'] });
    },
    onError: () => toast.error('Échec de la validation'),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      AssociationsService.reject(id, reason),
    onSuccess: () => {
      toast.success('Association refusée');
      setActionType(null);
      setSelected(null);
      setReason('');
      qc.invalidateQueries({ queryKey: ['assos-pending'] });
    },
    onError: () => toast.error('Échec du refus'),
  });

  const requestDocs = useMutation({
    mutationFn: ({ id, types, message }: { id: number; types: string[]; message?: string }) =>
      AssociationsService.requestDocuments(id, types, message),
    onSuccess: () => {
      toast.success('Email de demande envoyé');
      setActionType(null);
      setSelected(null);
      setDocTypes([]);
      setReason('');
    },
    onError: () => toast.error("Échec de l'envoi"),
  });

  const items = (data?.items ?? []) as AssoRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Associations en attente</h1>

      <Card>
        <CardHeader className="py-4">
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} association(s) à examiner
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Chargement…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-muted-foreground">Aucune association en attente.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>SIRET / RNA</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Inscrite le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.siret || a.rna || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.address?.city || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.members?.[0]?.user.email || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(a.status)}>{a.status}</Badge>
                      {a.requiresManualReview && (
                        <Badge variant="warning" className="ml-2">
                          manuel
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => validate.mutate(a.id)}
                          disabled={validate.isPending}
                        >
                          Valider
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelected(a);
                            setActionType('request-docs');
                          }}
                        >
                          Justificatifs
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelected(a);
                            setActionType('reject');
                          }}
                        >
                          Refuser
                        </Button>
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
        open={actionType === 'reject' && !!selected}
        onClose={() => {
          setActionType(null);
          setSelected(null);
          setReason('');
        }}
        title={`Refuser ${selected?.name}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Précisez le motif du refus (envoyé par email à l&apos;association).
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif (10 caractères min)"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setActionType(null);
                setSelected(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 10 || reject.isPending}
              onClick={() => selected && reject.mutate({ id: selected.id, reason })}
            >
              Refuser
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={actionType === 'request-docs' && !!selected}
        onClose={() => {
          setActionType(null);
          setSelected(null);
          setDocTypes([]);
          setReason('');
        }}
        title={`Justificatifs - ${selected?.name}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Sélectionnez les pièces demandées :</p>
          <div className="space-y-2">
            {(['STATUTS', 'RNA_ATTESTATION', 'OFFICE_PROOF'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={docTypes.includes(t)}
                  onChange={(e) =>
                    setDocTypes((prev) =>
                      e.target.checked ? [...prev, t] : prev.filter((x) => x !== t),
                    )
                  }
                />
                {DOCUMENT_TYPE[t]}
              </label>
            ))}
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Message optionnel à l'association"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setActionType(null);
                setSelected(null);
              }}
            >
              Annuler
            </Button>
            <Button
              disabled={docTypes.length === 0 || requestDocs.isPending}
              onClick={() =>
                selected &&
                requestDocs.mutate({
                  id: selected.id,
                  types: docTypes,
                  message: reason || undefined,
                })
              }
            >
              Envoyer
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
