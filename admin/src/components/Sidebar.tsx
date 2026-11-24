'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Building2, ClipboardList, LayoutDashboard, LogOut, ScrollText, Settings, ShieldCheck, Users } from 'lucide-react';
import { logoutAction } from '@/lib/actions';

const LINKS = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/requests', label: 'Demandes de financement', icon: ClipboardList },
  { href: '/banks', label: 'Banques', icon: Building2 },
  { href: '/users', label: 'Utilisateurs', icon: Users },
  { href: '/audit', label: 'Journal d’audit', icon: ScrollText },
  { href: '/settings', label: 'Réglages', icon: Settings },
];

export function Sidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <aside className="relative flex w-full shrink-0 flex-col overflow-hidden bg-gradient-to-b from-navy-900 to-navy-950 text-white md:sticky md:top-0 md:h-screen md:w-72">
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-lagoon-500/25 blur-3xl" aria-hidden />
      <div className="relative flex items-center gap-3 px-6 py-6">
        <span className="rounded-full bg-white/15 p-0.5 ring-1 ring-white/25"><Image src="/images/logo-icon.png" alt="" width={40} height={40} className="rounded-full" /></span>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold">Financement des projets en outre-mer</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-lagoon-300"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Administration</p>
        </div>
      </div>
      <nav aria-label="Navigation admin" className="relative flex gap-1.5 overflow-x-auto px-4 pb-3 md:flex-1 md:flex-col md:overflow-visible">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`group flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive(href) ? 'bg-white text-navy-900 shadow-lift' : 'text-navy-100 hover:bg-white/10 hover:text-white'}`}
          >
            <Icon className={`h-[18px] w-[18px] ${isActive(href) ? 'text-lagoon-600' : 'text-navy-200 group-hover:text-lagoon-300'}`} aria-hidden /> {label}
          </Link>
        ))}
      </nav>
      <div className="relative border-t border-white/10 px-6 py-5">
        <p className="mb-3 truncate text-xs text-navy-200">{adminName}</p>
        <form action={logoutAction}>
          <button type="submit" className="flex items-center gap-2 text-sm font-medium text-white/90 transition hover:text-white">
            <LogOut className="h-4 w-4" aria-hidden /> Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
