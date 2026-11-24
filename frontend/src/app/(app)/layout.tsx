import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { Logo } from '@/components/layout/Logo';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { logout } from '@/lib/actions/auth';
import { getProfile, requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { initials } from '@/lib/utils';

// Espace connecté : l'utilisateur est revérifié ici ET dans chaque page (le middleware n'est qu'une première barrière).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { t } = await getT();
  const user = await requireUser();
  const profile = await getProfile();
  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : (user.email ?? '');
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 p-4 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:p-6">
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-lagoon-500/25 blur-3xl" aria-hidden />
        <div className="relative mb-4 lg:mb-10"><Logo light size={44} href="/dashboard" /></div>
        <div className="relative"><SidebarNav /></div>
        <form action={logout} className="relative mt-3 lg:mt-auto lg:pt-6">
          <button type="submit" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-navy-100 transition hover:bg-white/10 hover:text-white">
            <LogOut className="h-[18px] w-[18px]" aria-hidden /> {t('shell.logout')}
          </button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-line/80 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-8">
          <p className="font-display text-lg font-semibold text-navy-900">{t('shell.title')}</p>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1 pl-1 pr-4 shadow-sm">
              <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-ocean-500 to-lagoon-500 text-xs font-bold text-white">
                {profile ? initials(profile.first_name, profile.last_name) : '?'}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-navy-900">{fullName}</p>
                <p className="text-[11px] text-slate-500">{t('shell.role')}</p>
              </div>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
