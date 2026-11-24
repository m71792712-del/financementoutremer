import Link from 'next/link';
import { Menu } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Logo } from './Logo';

export async function PublicNavbar() {
  const { t } = await getT();
  const user = await getUser();
  const link = 'rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-navy-50 hover:text-navy-800';
  const anchors = (
    <>
      <Link href="/" className={link}>{t('nav.home')}</Link>
      <a href="/#about" className={link}>{t('nav.about')}</a>
      <a href="/#benefits" className={link}>{t('nav.benefits')}</a>
      <a href="/#faq" className={link}>{t('nav.faq')}</a>
    </>
  );
  const actions = user ? (
    <Link href="/dashboard" className="btn btn-primary btn-sm">{t('nav.dashboard')}</Link>
  ) : (
    <>
      <Link href="/login" className="btn btn-outline btn-sm">{t('nav.login')}</Link>
      <Link href="/register" className="btn btn-green btn-sm">{t('nav.register')}</Link>
    </>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/80 backdrop-blur-xl">
      <nav aria-label="Principal" className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Logo />
        <div className="hidden items-center gap-1 lg:flex">{anchors}</div>
        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          {actions}
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center rounded-full border border-line bg-white p-2.5 shadow-sm" aria-label={t('nav.menu')}>
              <Menu className="h-5 w-5 text-navy-800" aria-hidden />
            </summary>
            <div className="absolute right-0 mt-3 flex w-64 flex-col gap-1 rounded-3xl border border-line bg-white p-3 shadow-lift">
              {anchors}
              <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">{actions}</div>
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}
