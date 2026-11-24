'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { STATUS_LABELS, type ActionState } from '@/lib/types';

export function SubmitButton({ children, className = 'btn btn-primary', pendingText = 'Patientez…' }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.ok}</p>;
  return null;
}

const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  pending: { pill: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  under_review: { pill: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  approved: { pill: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  rejected: { pill: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  merged: { pill: 'bg-violet-50 text-violet-800 ring-violet-200', dot: 'bg-violet-500' },
};
const EXTRA_LABELS: Record<string, string> = { merged: 'Fusionnée' };

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? EXTRA_LABELS[status] ?? status;
  const st = STATUS_STYLES[status] ?? { pill: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${st.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden />
      {label}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="rounded-3xl border border-dashed border-navy-200 bg-navy-50/40 px-6 py-12 text-center text-sm text-slate-500">{text}</p>;
}

export function Pagination({ page, total, pageSize, basePath, params }: { page: number; total: number; pageSize: number; basePath: string; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? <Link className="btn btn-outline btn-sm" href={href(page - 1)}>← Précédent</Link> : <span />}
      <span className="text-slate-600">Page {page} / {pages} · {total} résultat{total > 1 ? 's' : ''}</span>
      {page < pages ? <Link className="btn btn-outline btn-sm" href={href(page + 1)}>Suivant →</Link> : <span />}
    </nav>
  );
}
