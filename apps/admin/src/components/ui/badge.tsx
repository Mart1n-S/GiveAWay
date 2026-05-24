import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
        warning:
          'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        info: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export type BadgeVariant = NonNullable<BadgeProps['variant']>;

/**
 * Renvoie la variante shadcn correspondant à un statut métier
 * (User/Association/Mission status, AdminRole...).
 */
export function statusColor(status: string | undefined | null): BadgeVariant {
  switch (status) {
    case 'VALIDATED':
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REJECTED':
    case 'SUSPENDED':
    case 'DELETED':
      return 'destructive';
    case 'SUPER_ADMIN':
      return 'default';
    case 'ADMIN':
      return 'info';
    default:
      return 'secondary';
  }
}

export { badgeVariants };
