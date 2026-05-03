import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, RotateCcw, Search } from 'lucide-react';
import { AdminLogAction } from '@repo/shared';
import { StatsService } from '@/services/stats.service';
import { AdminsService } from '@/services/admins.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { toastApiError } from '@/lib/errors';

interface LogEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  details: unknown;
  adminId: number;
  createdAt: string;
  admin?: { email: string; firstName: string; lastName: string };
}

interface PageResult {
  items: LogEntry[];
  total: number;
  page: number;
  limit: number;
}

interface AdminRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

const ACTION_OPTIONS = Object.values(AdminLogAction);
const ENTITY_OPTIONS: Array<'USER' | 'ASSOCIATION' | 'MISSION' | 'ADMIN'> = [
  'USER',
  'ASSOCIATION',
  'MISSION',
  'ADMIN',
];

const ACTION_COLORS: Record<string, string> = {
  VALIDATE_ASSOCIATION: 'green',
  REACTIVATE_ASSOCIATION: 'green',
  REACTIVATE_USER: 'green',
  REJECT_ASSOCIATION: 'red',
  SUSPEND_ASSOCIATION: 'amber',
  SUSPEND_USER: 'amber',
  DELETE_USER: 'red',
  DELETE_ASSOCIATION: 'red',
  DELETE_ADMIN: 'red',
  CREATE_USER: 'blue',
  CREATE_ASSOCIATION: 'blue',
  CREATE_ADMIN: 'blue',
  UPDATE_USER: 'default',
  UPDATE_ASSOCIATION: 'default',
  UPDATE_ADMIN: 'default',
  RESET_USER_PASSWORD: 'amber',
  RESET_ADMIN_PASSWORD: 'amber',
  REQUEST_DOCUMENTS: 'blue',
};

interface FilterState {
  action: string;
  entityType: string;
  entityId: string;
  adminId: string;
  from: string;
  to: string;
}

const emptyFilters: FilterState = {
  action: '',
  entityType: '',
  entityId: '',
  adminId: '',
  from: '',
  to: '',
};

export function AdminLogsPage() {
  const [draft, setDraft] = useState<FilterState>(emptyFilters);
  const [applied, setApplied] = useState<FilterState>(emptyFilters);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<LogEntry | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, unknown> = { page, limit: 50 };
    if (applied.action) p.action = applied.action;
    if (applied.entityType) p.entityType = applied.entityType;
    if (applied.entityId) p.entityId = applied.entityId;
    if (applied.adminId) p.adminId = applied.adminId;
    if (applied.from) p.from = new Date(applied.from).toISOString();
    if (applied.to) p.to = new Date(applied.to).toISOString();
    return p;
  }, [applied, page]);

  const { data, isLoading } = useQuery<PageResult>({
    queryKey: ['admin-logs', queryParams],
    queryFn: () => StatsService.adminLogs(queryParams),
  });

  // Liste des admins pour le sélecteur. Si l'utilisateur n'a pas accès (cas
  // improbable car list est ouvert ADMIN+SUPER_ADMIN), on tombe en silence.
  const { data: admins } = useQuery<AdminRow[]>({
    queryKey: ['admins-for-logs'],
    queryFn: () => AdminsService.list(),
    staleTime: 60_000,
  });

  const apply = () => {
    setPage(1);
    setApplied(draft);
  };

  const reset = () => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  };

  const exportCsv = async () => {
    try {
      const blob = await StatsService.exportAdminLogs(queryParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastApiError(err, "Échec de l'export CSV");
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit ?? 50)));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journal d'activité admin</h1>
          <p className="text-sm text-slate-500">
            Historique des actions effectuées par les administrateurs (table <code>admin_logs</code>)
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={isLoading || total === 0}>
          <Download size={16} className="mr-1.5" /> Exporter CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900">Filtres</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Action</label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={draft.action}
                onChange={(e) => setDraft({ ...draft, action: e.target.value })}
              >
                <option value="">Toutes</option>
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Type d'entité</label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={draft.entityType}
                onChange={(e) => setDraft({ ...draft, entityType: e.target.value })}
              >
                <option value="">Tous</option>
                {ENTITY_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Admin</label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={draft.adminId}
                onChange={(e) => setDraft({ ...draft, adminId: e.target.value })}
              >
                <option value="">Tous</option>
                {(admins ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName} — {a.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">ID d'entité</label>
              <Input
                type="number"
                placeholder="ex: 42"
                value={draft.entityId}
                onChange={(e) => setDraft({ ...draft, entityId: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Du</label>
              <Input
                type="datetime-local"
                value={draft.from}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Au</label>
              <Input
                type="datetime-local"
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={reset}>
              <RotateCcw size={14} className="mr-1.5" /> Réinitialiser
            </Button>
            <Button onClick={apply}>
              <Search size={14} className="mr-1.5" /> Appliquer
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} entrée(s)</p>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 text-slate-400">Chargement…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entité</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(log.createdAt, true)}
                    </td>
                    <td className="px-4 py-3">
                      {log.admin ? (
                        <div>
                          <div className="font-medium text-slate-900">
                            {log.admin.firstName} {log.admin.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{log.admin.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">#{log.adminId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={ACTION_COLORS[log.action] ?? 'default'}>{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{log.entityType}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.entityId}</td>
                    <td className="px-4 py-3 text-right">
                      {log.details ? (
                        <Button size="sm" variant="ghost" onClick={() => setDetail(log)}>
                          Voir
                        </Button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Aucune entrée ne correspond à ces filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title="Détails de l'action" size="lg">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-500">Action</div>
                <div className="font-medium">{detail.action}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Date</div>
                <div className="font-medium">{formatDate(detail.createdAt, true)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Entité</div>
                <div className="font-medium">{detail.entityType} #{detail.entityId}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Admin</div>
                <div className="font-medium">
                  {detail.admin ? `${detail.admin.firstName} ${detail.admin.lastName}` : `#${detail.adminId}`}
                </div>
                {detail.admin?.email && (
                  <div className="text-xs text-slate-500">{detail.admin.email}</div>
                )}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">Payload</div>
              <pre className="max-h-80 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                {JSON.stringify(detail.details, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
