'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { setLocale } from '@/lib/actions/locale';
import { useI18n } from '@/lib/i18n/provider';
import { LOCALES, LOCALE_LABELS } from '@/lib/i18n/shared';

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 shadow-sm transition hover:border-navy-200">
      <Globe className="h-3.5 w-3.5 text-lagoon-600" aria-hidden />
      <span className="sr-only">{t('lang.label')}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            await setLocale(next);
            router.refresh();
          });
        }}
        className="bg-transparent py-0.5 focus:outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
        ))}
      </select>
    </label>
  );
}
