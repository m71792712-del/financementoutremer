import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { LoanWithPurpose } from '@/lib/data';
import { purposeLabel, type Locale, type TFunction } from '@/lib/i18n/shared';
import { formatDate, formatMoney } from '@/lib/utils';

export function RequestsTable({ loans, t, locale }: { loans: LoanWithPurpose[]; t: TFunction; locale: Locale }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="min-w-full divide-y divide-line bg-white">
        <caption className="sr-only">{t('req.title')}</caption>
        <thead className="bg-navy-50/50">
          <tr>
            <th className="th" scope="col">{t('req.date')}</th>
            <th className="th" scope="col">{t('req.amount')}</th>
            <th className="th" scope="col">{t('req.purpose')}</th>
            <th className="th" scope="col">{t('req.status')}</th>
            <th className="th" scope="col"><span className="sr-only">{t('req.actions')}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {loans.map((l) => (
            <tr key={l.id} className="transition hover:bg-lagoon-50/40">
              <td className="td whitespace-nowrap text-slate-500">{formatDate(l.created_at, locale)}</td>
              <td className="td whitespace-nowrap font-semibold tabular-nums text-navy-900">{formatMoney(Number(l.amount), l.currency, locale)}</td>
              <td className="td">{l.loan_purposes ? purposeLabel(l.loan_purposes, locale) : l.purpose_code}</td>
              <td className="td"><StatusBadge status={l.status} /></td>
              <td className="td text-right">
                <Link href={`/dashboard/requests/${l.id}`} className="inline-grid h-9 w-9 place-items-center rounded-full bg-navy-50 text-navy-700 transition hover:bg-navy-800 hover:text-white" aria-label={`${t('common.view')} — ${formatDate(l.created_at, locale)}`}>
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
