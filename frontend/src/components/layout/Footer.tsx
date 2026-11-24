import Link from 'next/link';
import { Accessibility, Flower, ShieldCheck, Zap, Compass } from 'lucide-react';
import { getT } from '@/lib/i18n';
import { Logo } from './Logo';

export async function Footer() {
  const { t } = await getT();
  const items = [
    { icon: Zap, label: t('footer.fast') },
    { icon: ShieldCheck, label: t('footer.secure') },
    { icon: Accessibility, label: t('footer.accessible') },
    { icon: Compass, label: t('footer.support') },
  ];
  return (
    <footer className="relative mt-32 bg-navy-950 text-slate-300">
      <svg className="absolute inset-x-0 -top-[39px] h-10 w-full text-navy-950" viewBox="0 0 1440 40" preserveAspectRatio="none" fill="currentColor" aria-hidden>
        <path d="M0 40V22c120 14 240 16 360 6s240-26 360-24 240 20 360 24 240-4 360-14v26z" />
      </svg>
      <div className="pointer-events-none absolute -top-10 left-1/2 h-64 w-[44rem] -translate-x-1/2 rounded-full bg-lagoon-500/20 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <Logo light size={48} />
          <p className="flex items-center gap-2 font-script text-2xl text-white">
            {t('brand.slogan')} <Flower className="h-6 w-6 text-coral-400" aria-hidden />
          </p>
        </div>
        <ul className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-lagoon-500/20 text-lagoon-300"><Icon className="h-4 w-4" aria-hidden /></span>
              {label}
            </li>
          ))}
        </ul>
        <div className="mt-9 space-y-2 border-t border-white/10 pt-6 text-xs leading-relaxed text-slate-400">
          <p>{t('footer.banksNote')}</p>
          <p>{t('footer.legal')}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
            <Link href="/legal" className="underline decoration-white/30 underline-offset-4 hover:text-white">{t('footer.legalLink')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
