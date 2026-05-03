import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AssociationsService } from '@/services/associations.service';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, statusColor } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
    onError: () => toast.error("Échec de la validation"),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => AssociationsService.reject(id, reason),
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
      <h1 className="text-2xl font-bold text-slate-900">Associations en attente</h1>

      <Card>
        <CardHeader>
          <p className="text-sm text-slate-500">
            {data?.total ?? 0} association(s) à examiner
          </p>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 text-slate-400">Chargement…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-slate-400">Aucune association en attente.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Nom</th>
                  <th className="px-4 py-2">SIRET / RNA</th>
                  <th className="px-4 py-2">Ville</th>
                  <th className="px-4 py-2">Owner</th>
                  <th className="px-4 py-2">Inscrite le</th>
                  <th className="px-4 py-2">Statut</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                    <td className="px-4 py-3 text-slate-600">{a.siret || a.rna || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{a.address?.city || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{a.members?.[0]?.user.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor(a.status)}>{a.status}</Badge>
                      {a.requiresManualReview && <Badge color="amber" className="ml-2">manuel</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => validate.mutate(a.id)} disabled={validate.isPending}>
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
                          variant="danger"
                          onClick={() => {
                            setSelected(a);
                            setActionType('reject');
                          }}
                        >
                          Refuser
                        </Button>
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
        open={actionType === 'reject' && !!selected}
        onClose={() => {
          setActionType(null);
          setSelected(null);
          setReason('');
        }}
        title={`Refuser ${selected?.name}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Précisez le motif du refus (envoyé par email à l'association).</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (10 caractères min)" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setActionType(null); setSelected(null); }}>
              Annuler
            </Button>
            <Button
              variant="danger"
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
        title={`Justificatifs — ${selected?.name}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Sélectionnez les pièces demandées :</p>
          <div className="space-y-2">
            {(['STATUTS', 'RNA_ATTESTATION', 'OFFICE_PROOF'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={docTypes.includes(t)}
                  onChange={(e) =>
                    setDocTypes((prev) => (e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)))
                  }
                />
                {DOCUMENT_TYPE[t]}
              </label>
            ))}
          </div>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Message optionnel à l'association" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setActionType(null); setSelected(null); }}>
              Annuler
            </Button>
            <Button
              disabled={docTypes.length === 0 || requestDocs.isPending}
              onClick={() => selected && requestDocs.mutate({ id: selected.id, types: docTypes, message: reason || undefined })}
            >
              Envoyer
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
