'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilePlus2, FileText, LayoutDashboard, UserRound } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

const ITEMS = [
  { href: '/dashboard', key: 'shell.dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/requests', key: 'shell.requests', icon: FileText, exact: false },
  { href: '/apply', key: 'shell.apply', icon: FilePlus2, exact: false },
  { href: '/profile', key: 'shell.profile', icon: UserRound, exact: false },
];

export function SidebarNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <nav aria-label="Espace utilisateur" className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {ITEMS.map(({ href, key, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`group flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition ${active ? 'bg-white text-navy-900 shadow-lift' : 'text-navy-100 hover:bg-white/10 hover:text-white'}`}
          >
            <Icon className={`h-[18px] w-[18px] ${active ? 'text-lagoon-600' : 'text-navy-200 group-hover:text-lagoon-300'}`} aria-hidden /> {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
