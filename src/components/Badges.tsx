import type { WordStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, className }: { status: WordStatus; className?: string }) {
  const config = {
    dont_know: { label: "Don't know", cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
    learning: { label: 'Learning', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    know: { label: 'Know', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  }[status];
  return <span className={cn('chip', config.cls, className)}>{config.label}</span>;
}
