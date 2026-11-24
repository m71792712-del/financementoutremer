import Image from 'next/image';
import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

export function Logo({ light = false, size = 40, href = '/' }: { light?: boolean; size?: number; href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3">
      <span className={`rounded-full p-0.5 transition group-hover:scale-105 ${light ? 'bg-white/15 ring-1 ring-white/25' : 'bg-white shadow-soft ring-1 ring-line'}`}>
        <Image src="/images/logo-icon.png" alt="" width={size} height={size} className="rounded-full" />
      </span>
      <span className={`max-w-[13.5rem] font-display text-[14px] font-semibold leading-[1.15] tracking-tight sm:text-[15px] ${light ? 'text-white' : 'text-navy-900'}`}>{APP_NAME}</span>
    </Link>
  );
}
