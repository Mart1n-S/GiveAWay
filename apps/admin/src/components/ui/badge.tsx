import { cn } from '@/lib/utils';

const colors: Record<string, string> = {
  default: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  brand: 'bg-brand-50 text-brand-600',
};

export function Badge({ children, color = 'default', className }: { children: React.ReactNode; color?: keyof typeof colors; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', colors[color], className)}>
      {children}
    </span>
  );
}

export function statusColor(status: string | undefined | null): keyof typeof colors {
  switch (status) {
    case 'VALIDATED':
    case 'ACTIVE':
      return 'green';
    case 'PENDING':
      return 'amber';
    case 'REJECTED':
    case 'SUSPENDED':
    case 'DELETED':
      return 'red';
    case 'SUPER_ADMIN':
      return 'brand';
    case 'ADMIN':
      return 'blue';
    default:
      return 'default';
  }
}
