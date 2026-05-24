import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { UsersService } from '@/services/users.service';
import { Badge, statusColor } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AVAILABILITY_FREQUENCY,
  AVAILABILITY_TIME,
  AVAILABILITY_TYPE,
  ACTIVITY_TYPE,
  fmtEnum,
  fmtList,
} from '@/lib/labels';

interface UserDetail {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  age: number | null;
  biography: string | null;
  profilePicture: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
  address: { street: string; postalCode: string; city: string } | null;
  associations: Array<{
    role: string;
    association: { id: number; name: string; status: string };
  }>;
  skills: Array<{ skill: { id: number; label: string } }>;
  causes: Array<{ cause: { id: number; label: string } }>;
  availability: {
    frequency: string[];
    timeSlot: string[];
    type: string;
  } | null;
  participations: Array<{
    missionId: number;
    userId: number;
    createdAt: string;
    mission: {
      id: number;
      title: string;
      type: string;
      status: string;
      startDate: string | null;
      endDate: string | null;
      association: { id: number; name: string };
    };
  }>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label} :</span> {value}
    </div>
  );
}

export function UserDetailPage() {
  const { id } = useParams();
  const numId = id ? parseInt(id, 10) : 0;
  const { data, isLoading } = useQuery<UserDetail>({
    queryKey: ['user-detail', numId],
    queryFn: () => UsersService.get(numId),
    enabled: !!numId,
  });

  if (isLoading) return <div className="text-muted-foreground">Chargement…</div>;
  if (!data) return <div className="text-muted-foreground">Introuvable.</div>;

  const now = Date.now();
  const upcoming = data.participations.filter(
    (p) =>
      p.mission.status === 'ACTIVE' &&
      (!p.mission.endDate || new Date(p.mission.endDate).getTime() >= now),
  ).length;
  const completed = data.participations.filter(
    (p) =>
      p.mission.status === 'ACTIVE' &&
      p.mission.endDate &&
      new Date(p.mission.endDate).getTime() < now,
  ).length;
  const cancelled = data.participations.filter(
    (p) => p.mission.status === 'DELETED' || p.mission.status === 'ARCHIVED',
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/users">
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {data.firstName} {data.lastName}
        </h1>
        <Badge variant={statusColor(data.status)}>{data.status}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Field label="Email" value={data.email} />
            <Field
              label="Email vérifié"
              value={data.emailVerifiedAt ? formatDate(data.emailVerifiedAt) : '-'}
            />
            <Field label="Âge" value={data.age ?? '-'} />
            <Field label="Inscrit le" value={formatDate(data.createdAt)} />
            <Field
              label="Adresse"
              value={
                data.address
                  ? `${data.address.street}, ${data.address.postalCode} ${data.address.city}`
                  : '-'
              }
            />
            {data.biography && <Field label="Bio" value={data.biography} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistiques missions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total participations</span>
              <b>{data.participations.length}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">À venir / en cours</span>
              <b className="text-amber-600 dark:text-amber-400">{upcoming}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Terminées</span>
              <b className="text-emerald-600 dark:text-emerald-400">{completed}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annulées / archivées</span>
              <b className="text-red-600 dark:text-red-400">{cancelled}</b>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disponibilité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.availability ? (
              <>
                <Field
                  label="Fréquence"
                  value={fmtList(data.availability.frequency, AVAILABILITY_FREQUENCY)}
                />
                <Field
                  label="Créneaux"
                  value={fmtList(data.availability.timeSlot, AVAILABILITY_TIME)}
                />
                <Field
                  label="Type"
                  value={fmtEnum(data.availability.type, AVAILABILITY_TYPE)}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Non renseigné</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Associations ({data.associations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.associations.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune</p>
          )}
          {data.associations.map((a, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b py-2 text-sm last:border-0"
            >
              <Link
                to={`/associations/${a.association.id}`}
                className="font-medium text-primary hover:underline"
              >
                {a.association.name}
              </Link>
              <div className="flex gap-2">
                <Badge variant="secondary">{a.role}</Badge>
                <Badge variant={statusColor(a.association.status)}>{a.association.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historique missions ({data.participations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.participations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucune participation.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mission</TableHead>
                  <TableHead>Association</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.participations.map((p) => (
                  <TableRow key={p.missionId}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/missions/${p.mission.id}`}
                        className="text-primary hover:underline"
                      >
                        {p.mission.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/associations/${p.mission.association.id}`}
                        className="text-primary hover:underline"
                      >
                        {p.mission.association.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{fmtEnum(p.mission.type, ACTIVITY_TYPE)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(p.mission.status)}>{p.mission.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.mission.startDate ? formatDate(p.mission.startDate) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
