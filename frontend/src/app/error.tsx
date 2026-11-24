'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error('[error-boundary]', error.message, error.digest);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <TriangleAlert className="mx-auto h-10 w-10 text-amber-600" aria-hidden />
      <h1 className="mt-4 text-3xl sm:text-4xl">{t('error.title')}</h1>
      <p className="mt-2 text-slate-600">{t('err.generic')}</p>
      {/* Détails techniques pour le diagnostic (le digest se retrouve dans les logs Vercel). */}
      <details className="mx-auto mt-5 max-w-md text-left text-xs text-slate-500">
        <summary className="cursor-pointer text-center">Détails techniques</summary>
        <p className="mt-2 break-words font-mono">{error.message}</p>
        {error.digest && <p className="mt-1 font-mono">digest : {error.digest}</p>}
      </details>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="btn btn-primary">{t('error.retry')}</button>
        <Link href="/" className="btn btn-outline">{t('error.home')}</Link>
      </div>
    </div>
  );
}
