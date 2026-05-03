import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UsersService } from '@/services/users.service';
import { Badge, statusColor } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  associations: Array<{ role: string; association: { id: number; name: string; status: string } }>;
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

export function UserDetailPage() {
  const { id } = useParams();
  const numId = id ? parseInt(id, 10) : 0;
  const { data, isLoading } = useQuery<UserDetail>({
    queryKey: ['user-detail', numId],
    queryFn: () => UsersService.get(numId),
    enabled: !!numId,
  });

  if (isLoading) return <div className="text-slate-400">Chargement…</div>;
  if (!data) return <div className="text-slate-400">Introuvable.</div>;

  // Le modèle MissionParticipant ne stocke pas de statut côté participation :
  // on dérive l'état à partir du statut de la mission et de sa date de fin.
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
        <Link to="/users">
          <Button variant="ghost" size="sm">
            ← Retour
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {data.firstName} {data.lastName}
        </h1>
        <Badge color={statusColor(data.status)}>{data.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Identité</h2>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <div>
              <span className="text-slate-500">Email :</span> {data.email}
            </div>
            <div>
              <span className="text-slate-500">Email vérifié :</span>{' '}
              {data.emailVerifiedAt ? formatDate(data.emailVerifiedAt) : '—'}
            </div>
            <div>
              <span className="text-slate-500">Âge :</span> {data.age ?? '—'}
            </div>
            <div>
              <span className="text-slate-500">Inscrit le :</span> {formatDate(data.createdAt)}
            </div>
            <div>
              <span className="text-slate-500">Adresse :</span>{' '}
              {data.address
                ? `${data.address.street}, ${data.address.postalCode} ${data.address.city}`
                : '—'}
            </div>
            {data.biography && (
              <div>
                <span className="text-slate-500">Bio :</span> {data.biography}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Statistiques missions</h2>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Total participations</span>
              <b>{data.participations.length}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">À venir / en cours</span>
              <b className="text-amber-600">{upcoming}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Terminées</span>
              <b className="text-green-600">{completed}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Annulées / archivées</span>
              <b className="text-red-600">{cancelled}</b>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Disponibilité</h2>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            {data.availability ? (
              <>
                <div>
                  <span className="text-slate-500">Fréquence :</span>{' '}
                  {fmtList(data.availability.frequency, AVAILABILITY_FREQUENCY)}
                </div>
                <div>
                  <span className="text-slate-500">Créneaux :</span>{' '}
                  {fmtList(data.availability.timeSlot, AVAILABILITY_TIME)}
                </div>
                <div>
                  <span className="text-slate-500">Type :</span>{' '}
                  {fmtEnum(data.availability.type, AVAILABILITY_TYPE)}
                </div>
              </>
            ) : (
              <p className="text-slate-400">Non renseigné</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Compétences ({data.skills.length})</h2>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            {data.skills.length === 0 && <p className="text-sm text-slate-400">Aucune</p>}
            {data.skills.map((s) => (
              <Badge key={s.skill.id}>{s.skill.label}</Badge>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Causes ({data.causes.length})</h2>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            {data.causes.length === 0 && <p className="text-sm text-slate-400">Aucune</p>}
            {data.causes.map((c) => (
              <Badge key={c.cause.id}>{c.cause.label}</Badge>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Associations ({data.associations.length})</h2>
        </CardHeader>
        <CardBody>
          {data.associations.length === 0 && <p className="text-sm text-slate-400">Aucune</p>}
          {data.associations.map((a, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0 text-sm"
            >
              <Link to={`/associations/${a.association.id}`} className="text-brand-600 hover:underline">
                {a.association.name}
              </Link>
              <div className="flex gap-2">
                <Badge>{a.role}</Badge>
                <Badge color={statusColor(a.association.status)}>{a.association.status}</Badge>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Historique missions ({data.participations.length})</h2>
        </CardHeader>
        <CardBody className="p-0">
          {data.participations.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Aucune participation.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Mission</th>
                  <th className="px-4 py-2">Association</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Statut</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.participations.map((p) => (
                  <tr key={p.missionId}>
                    <td className="px-4 py-2 font-medium">
                      <Link to={`/missions/${p.mission.id}`} className="text-brand-600 hover:underline">
                        {p.mission.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link to={`/associations/${p.mission.association.id}`} className="text-brand-600 hover:underline">
                        {p.mission.association.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Badge>{fmtEnum(p.mission.type, ACTIVITY_TYPE)}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Badge color={statusColor(p.mission.status)}>{p.mission.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {p.mission.startDate ? formatDate(p.mission.startDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
