import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { AssociationsService } from '@/services/associations.service';
import { Badge, statusColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import {
  ACTIVITY_TYPE,
  AVAILABILITY_TYPE,
  MISSION_FREQUENCY,
  fmtEnum,
} from '@/lib/labels';

interface MissionDetail {
  id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  frequency: string | null;
  availabilityType: string | null;
  startDate: string | null;
  endDate: string | null;
  hasRegistration: boolean;
  volunteersNeeded: number | null;
  durationInt: number | null;
  createdAt: string;
  association: { id: number; name: string; status: string };
  address: { street: string; postalCode: string; city: string } | null;
  skills: Array<{ skill: { id: number; label: string } }>;
  causes: Array<{ cause: { id: number; label: string } }>;
  participants: Array<{
    missionId: number;
    userId: number;
    createdAt: string;
    user: { id: number; email: string; firstName: string; lastName: string };
  }>;
}

export function MissionDetailPage() {
  const { id } = useParams();
  const numId = id ? parseInt(id, 10) : 0;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<MissionDetail>({
    queryKey: ['mission', numId],
    queryFn: () => AssociationsService.getMission(numId),
    enabled: !!numId,
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState('');

  const deleteMission = useMutation({
    mutationFn: () => AssociationsService.deleteMission(numId, reason.trim() || undefined),
    onSuccess: () => {
      toast.success('Mission supprimée');
      qc.invalidateQueries({ queryKey: ['asso'] });
      qc.invalidateQueries({ queryKey: ['mission', numId] });
      if (data) navigate(`/associations/${data.association.id}`);
    },
    onError: () => toast.error('Échec de la suppression'),
  });

  if (isLoading) return <div className="text-slate-400">Chargement…</div>;
  if (!data) return <div className="text-slate-400">Introuvable.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={`/associations/${data.association.id}`}>
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{data.title}</h1>
        <Badge color={statusColor(data.status)}>{data.status}</Badge>
        <Badge>{fmtEnum(data.type, ACTIVITY_TYPE)}</Badge>
        <div className="ml-auto">
          {data.status !== 'DELETED' && (
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={14} className="mr-1" /> Supprimer la mission
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader><h2 className="font-semibold">Informations</h2></CardHeader>
          <CardBody className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <span className="text-slate-500">Association :</span>{' '}
              <Link to={`/associations/${data.association.id}`} className="text-brand-600 hover:underline">
                {data.association.name}
              </Link>
            </div>
            <div><span className="text-slate-500">Type :</span> {fmtEnum(data.type, ACTIVITY_TYPE)}</div>
            <div><span className="text-slate-500">Fréquence :</span> {fmtEnum(data.frequency, MISSION_FREQUENCY)}</div>
            <div><span className="text-slate-500">Modalité :</span> {fmtEnum(data.availabilityType, AVAILABILITY_TYPE)}</div>
            <div><span className="text-slate-500">Inscription :</span> {data.hasRegistration ? 'Requise' : 'Libre'}</div>
            <div><span className="text-slate-500">Date début :</span> {data.startDate ? formatDate(data.startDate) : '—'}</div>
            <div><span className="text-slate-500">Date fin :</span> {data.endDate ? formatDate(data.endDate) : '—'}</div>
            <div><span className="text-slate-500">Bénévoles recherchés :</span> {data.volunteersNeeded ?? '—'}</div>
            <div><span className="text-slate-500">Durée estimée :</span> {data.durationInt ? `${data.durationInt} min` : '—'}</div>
            <div><span className="text-slate-500">Créée le :</span> {formatDate(data.createdAt)}</div>
            <div className="col-span-2">
              <span className="text-slate-500">Adresse :</span>{' '}
              {data.address ? `${data.address.street}, ${data.address.postalCode} ${data.address.city}` : '—'}
            </div>
            {data.description && (
              <div className="col-span-2">
                <span className="text-slate-500">Description :</span>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{data.description}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><h2 className="font-semibold">Compétences ({data.skills.length})</h2></CardHeader>
            <CardBody className="flex flex-wrap gap-2">
              {data.skills.length === 0 && <p className="text-sm text-slate-400">Aucune</p>}
              {data.skills.map((s) => <Badge key={s.skill.id}>{s.skill.label}</Badge>)}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="font-semibold">Causes ({data.causes.length})</h2></CardHeader>
            <CardBody className="flex flex-wrap gap-2">
              {data.causes.length === 0 && <p className="text-sm text-slate-400">Aucune</p>}
              {data.causes.map((c) => <Badge key={c.cause.id}>{c.cause.label}</Badge>)}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold">Participants ({data.participants.length})</h2></CardHeader>
        <CardBody className="p-0">
          {data.participants.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Aucun participant inscrit.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Participant</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.participants.map((p) => (
                  <tr key={p.userId}>
                    <td className="px-4 py-2 font-medium">
                      <Link to={`/users/${p.user.id}`} className="text-brand-600 hover:underline">
                        {p.user.firstName} {p.user.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{p.user.email}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Dialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setReason(''); }}
        title="Supprimer la mission"
      >
        <div className="space-y-3">
          <p className="text-sm text-red-600">
            Les participants seront notifiés par email. Action réservée aux missions non conformes.
          </p>
          <Textarea
            placeholder="Motif (optionnel)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Annuler</Button>
            <Button variant="danger" disabled={deleteMission.isPending} onClick={() => deleteMission.mutate()}>
              Supprimer
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
