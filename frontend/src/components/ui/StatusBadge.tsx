'use client';

import { useI18n } from '@/lib/i18n/provider';

const STYLES: Record<string, { pill: string; dot: string }> = {
  pending: { pill: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  under_review: { pill: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  approved: { pill: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  rejected: { pill: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const s = STYLES[status] ?? { pill: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {t(`status.${status}`)}
    </span>
  );
}
