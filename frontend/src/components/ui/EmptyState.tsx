import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-navy-200 bg-navy-50/40 px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-ocean-600 shadow-soft ring-1 ring-line"><Inbox className="h-6 w-6" aria-hidden /></span>
      <h2 className="text-xl">{title}</h2>
      {text && <p className="max-w-md text-sm text-slate-500">{text}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}
