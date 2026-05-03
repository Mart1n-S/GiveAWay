import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, RotateCcw, Search } from 'lucide-react';
import { AdminLogAction } from '@repo/shared';
import { StatsService } from '@/services/stats.service';
import { AdminsService } from '@/services/admins.service';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

const ACTION_COLORS: Record<string, BadgeVariant> = {
  VALIDATE_ASSOCIATION: 'success',
  REACTIVATE_ASSOCIATION: 'success',
  REACTIVATE_USER: 'success',
  REJECT_ASSOCIATION: 'destructive',
  SUSPEND_ASSOCIATION: 'warning',
  SUSPEND_USER: 'warning',
  DELETE_USER: 'destructive',
  DELETE_ASSOCIATION: 'destructive',
  DELETE_ADMIN: 'destructive',
  CREATE_USER: 'info',
  CREATE_ASSOCIATION: 'info',
  CREATE_ADMIN: 'info',
  UPDATE_USER: 'secondary',
  UPDATE_ASSOCIATION: 'secondary',
  UPDATE_ADMIN: 'secondary',
  RESET_USER_PASSWORD: 'warning',
  RESET_ADMIN_PASSWORD: 'warning',
  REQUEST_DOCUMENTS: 'info',
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

const selectClass =
  'flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal d&apos;activité admin</h1>
          <p className="text-sm text-muted-foreground">
            Historique des actions effectuées par les administrateurs (table{' '}
            <code className="rounded bg-muted px-1 py-0.5">admin_logs</code>)
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={isLoading || total === 0}>
          <Download className="mr-1.5 h-4 w-4" /> Exporter CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Action</Label>
              <select
                className={selectClass}
                value={draft.action}
                onChange={(e) => setDraft({ ...draft, action: e.target.value })}
              >
                <option value="">Toutes</option>
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Type d&apos;entité</Label>
              <select
                className={selectClass}
                value={draft.entityType}
                onChange={(e) => setDraft({ ...draft, entityType: e.target.value })}
              >
                <option value="">Tous</option>
                {ENTITY_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Admin</Label>
              <select
                className={selectClass}
                value={draft.adminId}
                onChange={(e) => setDraft({ ...draft, adminId: e.target.value })}
              >
                <option value="">Tous</option>
                {(admins ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName} - {a.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>ID d&apos;entité</Label>
              <Input
                type="number"
                placeholder="ex: 42"
                value={draft.entityId}
                onChange={(e) => setDraft({ ...draft, entityId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Du</Label>
              <Input
                type="datetime-local"
                value={draft.from}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Au</Label>
              <Input
                type="datetime-local"
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Réinitialiser
            </Button>
            <Button onClick={apply}>
              <Search className="mr-1.5 h-3.5 w-3.5" /> Appliquer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
          <p className="text-sm text-muted-foreground">{total} entrée(s)</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
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
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Chargement…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(log.createdAt, true)}
                    </TableCell>
                    <TableCell>
                      {log.admin ? (
                        <div>
                          <div className="font-medium">
                            {log.admin.firstName} {log.admin.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.admin.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">#{log.adminId}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_COLORS[log.action] ?? 'secondary'}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.entityType}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.entityId}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.details ? (
                        <Button size="sm" variant="ghost" onClick={() => setDetail(log)}>
                          Voir
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-6 text-center text-muted-foreground">
                      Aucune entrée ne correspond à ces filtres.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Détails de l'action"
        size="lg"
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Action</div>
                <div className="font-medium">{detail.action}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Date</div>
                <div className="font-medium">{formatDate(detail.createdAt, true)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Entité</div>
                <div className="font-medium">
                  {detail.entityType} #{detail.entityId}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Admin</div>
                <div className="font-medium">
                  {detail.admin
                    ? `${detail.admin.firstName} ${detail.admin.lastName}`
                    : `#${detail.adminId}`}
                </div>
                {detail.admin?.email && (
                  <div className="text-xs text-muted-foreground">{detail.admin.email}</div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-xs text-muted-foreground">Payload</div>
              <div className="max-h-80 overflow-auto rounded-md bg-muted">
                <pre className="w-max min-w-full p-3 text-xs">
                  {JSON.stringify(detail.details, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
