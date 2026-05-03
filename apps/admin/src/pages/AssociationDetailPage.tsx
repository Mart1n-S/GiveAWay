import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AssociationsService } from '@/services/associations.service';
import { Badge, statusColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
  members: Array<{ user: { id: number; email: string; firstName: string; lastName: string }; role: string }>;
  missions: Array<{ id: number; title: string; status: string; type: string; startDate: string | null }>;
  documents: Array<{ id: number; type: string; fileUrl: string; createdAt: string }>;
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
  const [missionToDelete, setMissionToDelete] = useState<{ id: number; title: string } | null>(null);
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
      // Le PDF/JPEG s'ouvre dans un onglet ; en cas de document servi en attachment,
      // le navigateur déclenchera le téléchargement.
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w && filename) {
        // Popup bloquée → fallback : déclenche un téléchargement
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      }
      // Libère l'URL après quelques secondes (le temps que l'onglet la consomme)
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toastApiError(err, "Impossible d'ouvrir le document");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'STATUTS' | 'RNA_ATTESTATION' | 'OFFICE_PROOF'>('STATUTS');
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

  if (isLoading) return <div className="text-slate-400">Chargement…</div>;
  if (!data) return <div className="text-slate-400">Introuvable.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/associations">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{data.name}</h1>
        <Badge color={statusColor(data.status)}>{data.status}</Badge>
        <div className="ml-auto flex gap-2">
          {data.status === 'PENDING' && (
            <Button size="sm" onClick={() => validate.mutate()} disabled={validate.isPending}>
              Valider
            </Button>
          )}
          {data.status === 'VALIDATED' && (
            <Button variant="danger" size="sm" onClick={() => setSuspendOpen(true)}>
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
              <Button variant="danger" size="sm" onClick={() => setPurgeOpen(true)}>
                Supprimer définitivement
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold">Carte d'identité</h2></CardHeader>
        <CardBody className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-slate-500">SIRET :</span> {data.siret || '—'}</div>
          <div><span className="text-slate-500">RNA :</span> {data.rna || '—'}</div>
          <div><span className="text-slate-500">Catégorie :</span> {data.category?.name || '—'}</div>
          <div><span className="text-slate-500">Statut juridique :</span> {data.legalStatus || '—'}</div>
          <div className="col-span-2"><span className="text-slate-500">Adresse :</span> {data.address ? `${data.address.street}, ${data.address.postalCode} ${data.address.city}` : '—'}</div>
          <div className="col-span-2"><span className="text-slate-500">Description :</span> {data.description || '—'}</div>
          <div><span className="text-slate-500">Inscrite le :</span> {formatDate(data.createdAt)}</div>
          {data.rejectionReason && (
            <div className="col-span-2 rounded bg-red-50 p-2 text-red-700">
              <b>Motif :</b> {data.rejectionReason}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">Membres ({data.members.length})</h2></CardHeader>
        <CardBody className="p-0">
          {data.members.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Aucun membre.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Membre</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Rôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.members.map((m, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium">
                      <Link to={`/users/${m.user.id}`} className="text-brand-600 hover:underline">
                        {m.user.firstName} {m.user.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{m.user.email}</td>
                    <td className="px-4 py-2"><Badge>{m.role}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">Missions ({data.missions.length})</h2></CardHeader>
        <CardBody className="p-0">
          {data.missions.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Aucune mission.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Titre</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Statut</th>
                  <th className="px-4 py-2">Date début</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.missions.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2 font-medium">{m.title}</td>
                    <td className="px-4 py-2"><Badge>{fmtEnum(m.type, ACTIVITY_TYPE)}</Badge></td>
                    <td className="px-4 py-2"><Badge color={statusColor(m.status)}>{m.status}</Badge></td>
                    <td className="px-4 py-2 text-slate-600">{m.startDate ? formatDate(m.startDate) : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/missions/${m.id}`}>
                          <Button size="sm" variant="outline">
                            Détail
                          </Button>
                        </Link>
                        {m.status !== 'DELETED' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setMissionToDelete({ id: m.id, title: m.title })}
                          >
                            Supprimer
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

      <Card>
        <CardHeader><h2 className="font-semibold">Documents ({data.documents.length})</h2></CardHeader>
        <CardBody className="space-y-4">
          {data.documents.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun document fourni.</p>
          ) : (
            data.documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0 text-sm">
                <div>
                  <span className="font-medium text-slate-900">{fmtEnum(d.type, DOCUMENT_TYPE)}</span>{' '}
                  <span className="text-slate-400">— {formatDate(d.createdAt)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openDocument(d.id)}>
                    Voir
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
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

          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Déposer un justificatif reçu par email</p>
            <p className="mb-3 text-xs text-slate-500">
              L'association envoie ses pièces à <code>contact.giiveaway@gmail.com</code>. Téléversez-les ici pour qu'elles soient
              archivées sur son profil.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
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
                className="text-sm"
              />
              <Button
                size="sm"
                disabled={!uploadFile || uploadDoc.isPending}
                onClick={() => uploadFile && uploadDoc.mutate({ type: uploadType, file: uploadFile })}
              >
                Déposer
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Dialog open={suspendOpen} onClose={() => setSuspendOpen(false)} title="Suspendre l'association">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            La suspension archive automatiquement les missions actives. Un email sera envoyé au propriétaire.
          </p>
          <Textarea
            placeholder="Motif de la suspension *"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSuspendOpen(false)}>Annuler</Button>
            <Button
              variant="danger"
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
        onClose={() => { setMissionToDelete(null); setMissionDeleteReason(''); }}
        title={`Supprimer la mission`}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Mission : <b>{missionToDelete?.title}</b>
          </p>
          <p className="text-sm text-red-600">
            Les participants seront notifiés par email. Action réservée aux missions non conformes.
          </p>
          <Textarea
            placeholder="Motif (optionnel)"
            value={missionDeleteReason}
            onChange={(e) => setMissionDeleteReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMissionToDelete(null)}>Annuler</Button>
            <Button
              variant="danger"
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
        onClose={() => { setPurgeOpen(false); setPurgeConfirm(''); }}
        title={`Supprimer définitivement ${data.name}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-red-600">
            ⚠️ Cette action est <b>irréversible</b>.
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
            <li>L'association, ses justificatifs, ses missions et ses membres sont supprimés.</li>
            <li>Le compte du propriétaire <b>reste actif en tant que bénévole</b> classique.</li>
            <li>Un email de notification lui sera envoyé.</li>
          </ul>
          <p className="text-sm text-slate-600">
            Tapez <code className="bg-slate-100 px-2 py-0.5 rounded">SUPPRIMER</code> pour confirmer :
          </p>
          <input
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={purgeConfirm}
            onChange={(e) => setPurgeConfirm(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setPurgeOpen(false); setPurgeConfirm(''); }}>
              Annuler
            </Button>
            <Button
              variant="danger"
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
