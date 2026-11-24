import Image from 'next/image';
import type { ReactNode } from 'react';
import { Flower, ShieldCheck } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { getT } from '@/lib/i18n';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = await getT();
  return (
    <>
      <PublicNavbar />
      <main id="main" className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_minmax(0,34rem)] lg:py-12">
        <aside className="relative hidden min-h-[560px] overflow-hidden rounded-[2rem] shadow-lift lg:block" aria-hidden>
          <Image src="/images/panel.webp" alt="" fill sizes="(min-width:1024px) 45vw, 0px" quality={70} priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-900/25 to-transparent" />
          <div className="absolute inset-x-8 bottom-8 text-white">
            <Flower className="mb-3 h-7 w-7 text-coral-400" />
            <p className="font-script text-4xl leading-tight">{t('brand.slogan')}</p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-medium backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-lagoon-300" /> {t('footer.secure')}
            </p>
          </div>
        </aside>
        <div className="mx-auto w-full max-w-md self-center animate-fade-up lg:max-w-none">{children}</div>
      </main>
      <Footer />
    </>
  );
}
