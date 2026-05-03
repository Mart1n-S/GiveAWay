import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { AssociationsService } from '@/services/associations.service';
import { Badge, statusColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-muted-foreground">{label} :</span> {value}
    </div>
  );
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

  if (isLoading) return <div className="text-muted-foreground">Chargement…</div>;
  if (!data) return <div className="text-muted-foreground">Introuvable.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/associations/${data.association.id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
        <Badge variant={statusColor(data.status)}>{data.status}</Badge>
        <Badge variant="secondary">{fmtEnum(data.type, ACTIVITY_TYPE)}</Badge>
        <div className="ml-auto">
          {data.status !== 'DELETED' && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer la mission
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <span className="text-muted-foreground">Association :</span>{' '}
              <Link
                to={`/associations/${data.association.id}`}
                className="text-primary hover:underline"
              >
                {data.association.name}
              </Link>
            </div>
            <Field label="Type" value={fmtEnum(data.type, ACTIVITY_TYPE)} />
            <Field label="Fréquence" value={fmtEnum(data.frequency, MISSION_FREQUENCY)} />
            <Field label="Modalité" value={fmtEnum(data.availabilityType, AVAILABILITY_TYPE)} />
            <Field label="Inscription" value={data.hasRegistration ? 'Requise' : 'Libre'} />
            <Field
              label="Date début"
              value={data.startDate ? formatDate(data.startDate) : '-'}
            />
            <Field
              label="Date fin"
              value={data.endDate ? formatDate(data.endDate) : '-'}
            />
            <Field label="Bénévoles recherchés" value={data.volunteersNeeded ?? '-'} />
            <Field
              label="Durée estimée"
              value={data.durationInt ? `${data.durationInt} min` : '-'}
            />
            <Field label="Créée le" value={formatDate(data.createdAt)} />
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
            {data.description && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Description :</span>
                <p className="mt-1 whitespace-pre-wrap">{data.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compétences ({data.skills.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {data.skills.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune</p>
              )}
              {data.skills.map((s) => (
                <Badge key={s.skill.id} variant="secondary">
                  {s.skill.label}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Causes ({data.causes.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {data.causes.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune</p>
              )}
              {data.causes.map((c) => (
                <Badge key={c.cause.id} variant="secondary">
                  {c.cause.label}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participants ({data.participants.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.participants.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun participant inscrit.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Inscrit le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.participants.map((p) => (
                  <TableRow key={p.userId}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/users/${p.user.id}`}
                        className="text-primary hover:underline"
                      >
                        {p.user.firstName} {p.user.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.user.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(p.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setReason('');
        }}
        title="Supprimer la mission"
      >
        <div className="space-y-3">
          <p className="text-sm font-medium text-destructive">
            Les participants seront notifiés par email. Action réservée aux missions non
            conformes.
          </p>
          <Textarea
            placeholder="Motif (optionnel)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMission.isPending}
              onClick={() => deleteMission.mutate()}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
