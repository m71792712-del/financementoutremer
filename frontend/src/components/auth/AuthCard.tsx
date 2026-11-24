import Image from 'next/image';
import type { ReactNode } from 'react';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="card relative overflow-hidden p-7 sm:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-lagoon-100 blur-2xl" aria-hidden />
      <div className="relative">
        <span className="inline-flex rounded-full bg-white p-1 shadow-soft ring-1 ring-line">
          <Image src="/images/logo-icon.png" alt="" width={48} height={48} className="rounded-full" />
        </span>
        <h1 className="mt-5 text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
