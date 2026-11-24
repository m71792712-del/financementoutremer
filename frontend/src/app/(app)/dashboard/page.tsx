import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CircleCheck, CircleX, Clock, FileText, Plus } from 'lucide-react';
import { RequestsTable } from '@/components/loan/RequestsTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { getProfile, requireUser } from '@/lib/auth';
import { getLoanStats, getLoans } from '@/lib/data';
import { getT } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Tableau de bord' };

export default async function DashboardPage() {
  const { t, locale } = await getT();
  const user = await requireUser();
  const profile = await getProfile();
  const supabase = await createClient();
  const [stats, { loans }] = await Promise.all([getLoanStats(supabase, user.id), getLoans(supabase, user.id, 1, 5)]);

  const cards = [
    { icon: FileText, label: t('dash.stat.total'), value: stats.total, icon_tone: 'bg-navy-50 text-navy-700', bar: 'from-navy-600 to-ocean-500' },
    { icon: Clock, label: t('dash.stat.inprogress'), value: stats.inProgress, icon_tone: 'bg-amber-50 text-amber-600', bar: 'from-amber-400 to-amber-500' },
    { icon: CircleCheck, label: t('dash.stat.approved'), value: stats.approved, icon_tone: 'bg-emerald-50 text-emerald-600', bar: 'from-lagoon-400 to-lagoon-600' },
    { icon: CircleX, label: t('dash.stat.rejected'), value: stats.rejected, icon_tone: 'bg-red-50 text-red-500', bar: 'from-coral-400 to-coral-500' },
  ];
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : (user.email ?? '');

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
      <div className="min-w-0 animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">{t('dash.hello', { name })}</h1>
            <p className="mt-2 text-slate-500">{t('dash.overview')}</p>
          </div>
          <Link href="/apply" className="btn btn-green px-6 py-3"><Plus className="h-4 w-4" aria-hidden /> {t('shell.apply')}</Link>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map(({ icon: Icon, label, value, icon_tone, bar }) => (
            <li key={label} className="group relative overflow-hidden rounded-3xl border border-line bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bar}`} aria-hidden />
              <span className={`grid h-10 w-10 place-items-center rounded-2xl ${icon_tone}`}><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
              <p className="mt-4 font-display text-4xl font-semibold tabular-nums text-navy-900">{value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
            </li>
          ))}
        </ul>

        <section className="card mt-8 p-0 sm:p-0">
          <div className="flex items-center justify-between gap-3 px-6 pt-6 sm:px-7">
            <h2 className="text-2xl">{t('dash.latest')}</h2>
            {loans.length > 0 && <Link href="/dashboard/requests" className="text-sm font-semibold text-ocean-600 hover:underline">{t('dash.seeAll')} →</Link>}
          </div>
          <div className="p-4 sm:p-5">
            {loans.length === 0 ? (
              <EmptyState title={t('dash.empty.title')} text={t('dash.empty.text')}>
                <Link href="/apply" className="btn btn-green px-6">{t('shell.apply')}</Link>
              </EmptyState>
            ) : (
              <RequestsTable loans={loans} t={t} locale={locale} />
            )}
          </div>
        </section>
      </div>

      <aside className="relative hidden min-h-[420px] overflow-hidden rounded-[2rem] shadow-lift xl:block" aria-label={t('dash.panel')}>
        <Image src="/images/panel.webp" alt="" fill sizes="280px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-900/20 to-transparent" aria-hidden />
        <p className="absolute inset-x-5 bottom-6 font-display text-2xl font-semibold leading-snug text-white">{t('dash.panel')}</p>
      </aside>
    </div>
  );
}
