import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { AssociationsService } from '@/services/associations.service';
import { Badge, statusColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatDate } from '@/lib/utils';
import { ACTIVITY_TYPE, DOCUMENT_TYPE, fmtEnum } from '@/lib/labels';
import { toastApiError } from '@/lib/errors';

interface AssoDetail {
  id: number;
  name: string;
  status: string;
  description: string | null;
  siret: string | null;
  rna: string | null;
  legalStatus: string | null;
  rejectionReason: string | null;
  createdAt: string;
  category?: { name: string } | null;
  address?: { street: string; postalCode: string; city: string } | null;
  members: Array<{
    user: { id: number; email: string; firstName: string; lastName: string };
    role: string;
  }>;
  missions: Array<{
    id: number;
    title: string;
    status: string;
    type: string;
    startDate: string | null;
  }>;
  documents: Array<{ id: number; type: string; fileUrl: string; createdAt: string }>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-muted-foreground">{label} :</span> {value}
    </div>
  );
}

export function AssociationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numId = id ? parseInt(id, 10) : 0;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<AssoDetail>({
    queryKey: ['asso', numId],
    queryFn: () => AssociationsService.get(numId),
    enabled: !!numId,
  });

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [missionToDelete, setMissionToDelete] = useState<{ id: number; title: string } | null>(
    null,
  );
  const [missionDeleteReason, setMissionDeleteReason] = useState('');

  const suspend = useMutation({
    mutationFn: (reason: string) => AssociationsService.suspend(numId, reason),
    onSuccess: () => {
      toast.success('Association suspendue');
      setSuspendOpen(false);
      setSuspendReason('');
      qc.invalidateQueries({ queryKey: ['asso', numId] });
    },
    onError: () => toast.error('Échec de la suspension'),
  });

  const reactivate = useMutation({
    mutationFn: () => AssociationsService.reactivate(numId),
    onSuccess: () => {
      toast.success('Association réactivée');
      qc.invalidateQueries({ queryKey: ['asso', numId] });
    },
    onError: (err) => toastApiError(err, 'Échec de la réactivation'),
  });

  const validate = useMutation({
    mutationFn: () => AssociationsService.validate(numId),
    onSuccess: () => {
      toast.success('Association validée');
      qc.invalidateQueries({ queryKey: ['asso', numId] });
      qc.invalidateQueries({ queryKey: ['assos'] });
      qc.invalidateQueries({ queryKey: ['assos-pending'] });
    },
    onError: (err) => toastApiError(err, 'Échec de la validation'),
  });

  const purge = useMutation({
    mutationFn: () => AssociationsService.purge(numId),
    onSuccess: () => {
      toast.success('Association supprimée définitivement');
      qc.invalidateQueries({ queryKey: ['assos'] });
      navigate('/associations');
    },
    onError: (err) => toastApiError(err, 'Échec de la suppression'),
  });

  const openDocument = async (documentId: number) => {
    try {
      const { blob, filename } = await AssociationsService.downloadDocument(documentId);
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w && filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toastApiError(err, "Impossible d'ouvrir le document");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'STATUTS' | 'RNA_ATTESTATION' | 'OFFICE_PROOF'>(
    'STATUTS',
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const uploadDoc = useMutation({
    mutationFn: ({ type, file }: { type: string; file: File }) =>
      AssociationsService.uploadDocument(numId, type, file),
    onSuccess: () => {
      toast.success('Justificatif déposé');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['asso', numId] });
    },
    onError: (err) => toastApiError(err, 'Échec du dépôt'),
  });

  const deleteDoc = useMutation({
    mutationFn: (documentId: number) => AssociationsService.deleteDocumentById(documentId),
    onSuccess: () => {
      toast.success('Justificatif supprimé');
      qc.invalidateQueries({ queryKey: ['asso', numId] });
    },
    onError: (err) => toastApiError(err, 'Échec de la suppression'),
  });

  const deleteMission = useMutation({
    mutationFn: ({ missionId, reason }: { missionId: number; reason?: string }) =>
      AssociationsService.deleteMission(missionId, reason),
    onSuccess: () => {
      toast.success('Mission supprimée');
      setMissionToDelete(null);
      setMissionDeleteReason('');
      qc.invalidateQueries({ queryKey: ['asso', numId] });
    },
    onError: () => toast.error('Échec de la suppression'),
  });

  if (isLoading) return <div className="text-muted-foreground">Chargement…</div>;
  if (!data) return <div className="text-muted-foreground">Introuvable.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/associations">
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
        <Badge variant={statusColor(data.status)}>{data.status}</Badge>
        <div className="ml-auto flex gap-2">
          {data.status === 'PENDING' && (
            <Button size="sm" onClick={() => validate.mutate()} disabled={validate.isPending}>
              Valider
            </Button>
          )}
          {data.status === 'VALIDATED' && (
            <Button variant="destructive" size="sm" onClick={() => setSuspendOpen(true)}>
              Suspendre
            </Button>
          )}
          {data.status === 'SUSPENDED' && (
            <Button size="sm" onClick={() => reactivate.mutate()} disabled={reactivate.isPending}>
              Réactiver
            </Button>
          )}
          {data.status === 'REJECTED' && (
            <>
              <Button size="sm" onClick={() => validate.mutate()} disabled={validate.isPending}>
                Re-valider
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setPurgeOpen(true)}>
                Supprimer définitivement
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carte d&apos;identité</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Field label="SIRET" value={data.siret || '-'} />
          <Field label="RNA" value={data.rna || '-'} />
          <Field label="Catégorie" value={data.category?.name || '-'} />
          <Field label="Statut juridique" value={data.legalStatus || '-'} />
          <div className="col-span-2">
            <Field
              label="Adresse"
              value={
                data.address
                  ? `${data.address.street}, ${data.address.postalCode} ${data.address.city}`
                  : '-'
              }
            />
          </div>
          <div className="col-span-2">
            <Field label="Description" value={data.description || '-'} />
          </div>
          <Field label="Inscrite le" value={formatDate(data.createdAt)} />
          {data.rejectionReason && (
            <div className="col-span-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <b>Motif :</b> {data.rejectionReason}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membres ({data.members.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.members.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun membre.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.members.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/users/${m.user.id}`}
                        className="text-primary hover:underline"
                      >
                        {m.user.firstName} {m.user.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{m.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Missions ({data.missions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.missions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucune mission.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.missions.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{fmtEnum(m.type, ACTIVITY_TYPE)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(m.status)}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.startDate ? formatDate(m.startDate) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/missions/${m.id}`}>Détail</Link>
                        </Button>
                        {m.status !== 'DELETED' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              setMissionToDelete({ id: m.id, title: m.title })
                            }
                          >
                            Supprimer
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents ({data.documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document fourni.</p>
          ) : (
            data.documents.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between border-b py-2 text-sm last:border-0"
              >
                <div>
                  <span className="font-medium">{fmtEnum(d.type, DOCUMENT_TYPE)}</span>{' '}
                  <span className="text-muted-foreground">- {formatDate(d.createdAt)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openDocument(d.id)}>
                    Voir
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deleteDoc.isPending}
                    onClick={() => {
                      if (window.confirm('Supprimer ce justificatif ?')) {
                        deleteDoc.mutate(d.id);
                      }
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))
          )}

          <div className="rounded-md border border-dashed bg-muted/40 p-3">
            <p className="mb-2 text-sm font-medium">Déposer un justificatif reçu par email</p>
            <p className="mb-3 text-xs text-muted-foreground">
              L&apos;association envoie ses pièces à <code>contact.giiveaway@gmail.com</code>.
              Téléversez-les ici pour qu&apos;elles soient archivées sur son profil.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as typeof uploadType)}
              >
                <option value="STATUTS">{DOCUMENT_TYPE.STATUTS}</option>
                <option value="RNA_ATTESTATION">{DOCUMENT_TYPE.RNA_ATTESTATION}</option>
                <option value="OFFICE_PROOF">{DOCUMENT_TYPE.OFFICE_PROOF}</option>
              </select>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
              />
              <Button
                size="sm"
                disabled={!uploadFile || uploadDoc.isPending}
                onClick={() =>
                  uploadFile && uploadDoc.mutate({ type: uploadType, file: uploadFile })
                }
              >
                Déposer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title="Suspendre l'association"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            La suspension archive automatiquement les missions actives. Un email sera envoyé au
            propriétaire.
          </p>
          <Textarea
            placeholder="Motif de la suspension *"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSuspendOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={!suspendReason.trim() || suspend.isPending}
              onClick={() => suspend.mutate(suspendReason.trim())}
            >
              Suspendre
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!missionToDelete}
        onClose={() => {
          setMissionToDelete(null);
          setMissionDeleteReason('');
        }}
        title="Supprimer la mission"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Mission : <b className="text-foreground">{missionToDelete?.title}</b>
          </p>
          <p className="text-sm font-medium text-destructive">
            Les participants seront notifiés par email. Action réservée aux missions non
            conformes.
          </p>
          <Textarea
            placeholder="Motif (optionnel)"
            value={missionDeleteReason}
            onChange={(e) => setMissionDeleteReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMissionToDelete(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMission.isPending}
              onClick={() =>
                missionToDelete &&
                deleteMission.mutate({
                  missionId: missionToDelete.id,
                  reason: missionDeleteReason.trim() || undefined,
                })
              }
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={purgeOpen}
        onClose={() => {
          setPurgeOpen(false);
          setPurgeConfirm('');
        }}
        title={`Supprimer définitivement ${data.name}`}
      >
        <div className="space-y-3">
          <p className="text-sm font-medium text-destructive">
            ⚠️ Cette action est <b>irréversible</b>.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              L&apos;association, ses justificatifs, ses missions et ses membres sont supprimés.
            </li>
            <li>
              Le compte du propriétaire <b>reste actif en tant que bénévole</b> classique.
            </li>
            <li>Un email de notification lui sera envoyé.</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Tapez <code className="rounded bg-muted px-2 py-0.5 font-mono">SUPPRIMER</code> pour
            confirmer :
          </p>
          <Input value={purgeConfirm} onChange={(e) => setPurgeConfirm(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setPurgeOpen(false);
                setPurgeConfirm('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={purgeConfirm !== 'SUPPRIMER' || purge.isPending}
              onClick={() => purge.mutate()}
            >
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
