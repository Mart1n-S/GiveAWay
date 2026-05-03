import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatsService } from '@/services/stats.service';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const COLORS = ['#cc460f', '#fb923c', '#fcd34d', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

const RANGES = [
  { label: '7j', days: 7 },
  { label: '30j', days: 30 },
  { label: '90j', days: 90 },
  { label: '12 mois', days: 365 },
];

function isoRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}

interface DeltaProps {
  delta: number | null;
  pct: number | null;
}

function Delta({ delta, pct }: DeltaProps) {
  if (delta === null || delta === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const isUp = delta > 0;
  return (
    <span className={isUp ? 'text-xs text-green-600' : 'text-xs text-red-600'}>
      {isUp ? '▲' : '▼'} {pct !== null ? `${Math.abs(pct).toFixed(1)}%` : Math.abs(delta)}
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: number | string;
  delta?: number | null;
  pct?: number | null;
}

function KpiCard({ label, value, delta, pct }: KpiCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-3xl font-bold text-slate-900">{value}</div>
          {delta !== undefined && <Delta delta={delta ?? null} pct={pct ?? null} />}
        </div>
      </CardBody>
    </Card>
  );
}

export function DashboardPage() {
  const [range, setRange] = useState(30);
  const { from, to } = useMemo(() => isoRange(range), [range]);

  const overview = useQuery({
    queryKey: ['overview', from, to],
    queryFn: () => StatsService.overview(from, to),
  });

  const signups = useQuery({
    queryKey: ['ts-signups', from, to],
    queryFn: () => StatsService.timeseries({ metric: 'user_signups', granularity: 'day', from, to }),
  });

  const assoTypes = useQuery({
    queryKey: ['breakdown-asso-status'],
    queryFn: () => StatsService.breakdown({ dimension: 'association_status' }),
  });

  const topCauses = useQuery({
    queryKey: ['top-causes'],
    queryFn: () => StatsService.breakdown({ dimension: 'top_causes', limit: 10 }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              size="sm"
              variant={r.days === range ? 'primary' : 'outline'}
              onClick={() => setRange(r.days)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Utilisateurs actifs"
          value={overview.data?.activeUsers.value ?? '—'}
        />
        <KpiCard
          label="Inscriptions"
          value={overview.data?.newSignups.value ?? '—'}
          delta={overview.data?.newSignups.delta}
          pct={overview.data?.newSignups.deltaPct}
        />
        <KpiCard
          label="Assos validées"
          value={overview.data?.validatedAssociations.value ?? '—'}
        />
        <KpiCard
          label="Assos en attente"
          value={overview.data?.pendingAssociations.value ?? '—'}
        />
        <KpiCard
          label="Missions actives"
          value={overview.data?.activeMissions.value ?? '—'}
        />
        <KpiCard
          label="Participations"
          value={overview.data?.participations.value ?? '—'}
          delta={overview.data?.participations.delta}
          pct={overview.data?.participations.deltaPct}
        />
        <KpiCard
          label="Taux validation assos"
          value={`${(overview.data?.associationValidationRate.value ?? 0).toFixed(1)}%`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Inscriptions utilisateurs</h2>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={signups.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={(v) => new Date(v as string).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  fontSize={11}
                />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#cc460f" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Statut des associations</h2>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={(assoTypes.data ?? []) as Array<{ status: string; _count: { _all: number } }>}
                  dataKey="_count._all"
                  nameKey="status"
                  outerRadius={90}
                  label
                >
                  {(assoTypes.data ?? []).map((_: unknown, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900">Top causes choisies</h2>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              layout="vertical"
              data={(topCauses.data ?? []) as Array<{ label: string; count: number }>}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="label" width={140} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#fb923c" />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  );
}
